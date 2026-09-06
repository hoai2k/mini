export type SoundEffect =
  | 'jump'
  | 'kick'
  | 'laser'
  | 'hit'
  | 'stomp'
  | 'explode'
  | 'pickup'
  | 'checkpoint'
  | 'boss'
  | 'ui'
  | 'hurt'
  | 'shield';
export type MusicScene = 'menu' | 'gameplay';

/** Music uses the supplied recording; Web Audio supplies short, rate-limited arcade effects. */
export class GameAudio {
  private theme: HTMLAudioElement;
  private level: HTMLAudioElement;
  private scene: MusicScene = 'menu';
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noise: AudioBuffer | null = null;
  private master = 0.8;
  private music = 0.55;
  private sfx = 0.65;
  private muted = false;
  private unlocked = false;
  private wantsMusic = false;
  private disposed = false;
  private lastEffect = new Map<SoundEffect, number>();
  private voices = 0;

  constructor(themeUrl: string, levelUrl?: string) {
    this.theme = new Audio(themeUrl);
    this.level = levelUrl ? new Audio(levelUrl) : this.theme;
    for (const track of this.tracks()) {
      track.loop = true;
      track.preload = 'metadata';
    }
    this.applyVolumes();
  }

  private tracks(): HTMLAudioElement[] {
    return this.level === this.theme ? [this.theme] : [this.theme, this.level];
  }

  private selectedTrack(): HTMLAudioElement {
    return this.scene === 'gameplay' ? this.level : this.theme;
  }

  /** Stop the outgoing track before starting another; never reset either position. */
  private playSelected(): Promise<void> {
    const selected = this.selectedTrack();
    for (const track of this.tracks()) {
      if (track !== selected && !track.paused) track.pause();
    }
    if (!this.unlocked || !this.wantsMusic || this.disposed || !selected.paused)
      return Promise.resolve();
    try {
      return selected
        .play()
        .then(() => {
          // A pending browser play request may settle after a later scene switch.
          if (
            this.disposed ||
            !this.wantsMusic ||
            this.selectedTrack() !== selected
          ) {
            if (!selected.paused) selected.pause();
          }
        })
        .catch(() => {});
    } catch {
      return Promise.resolve();
    }
  }

  /** Title/pause/settings/instructions use menu; active play uses gameplay. */
  setScene(scene: MusicScene): void {
    if (this.disposed) return;
    this.scene = scene;
    this.wantsMusic = true;
    void this.playSelected();
  }

  /** Invoke directly within pointerdown/keydown. It is safe to call for each gesture. */
  async unlock(): Promise<void> {
    if (this.disposed) return;
    try {
      if (!this.context) {
        const Context =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (Context) {
          this.context = new Context();
          this.output = this.context.createGain();
          this.compressor = this.context.createDynamicsCompressor();
          this.compressor.threshold.value = -15;
          this.compressor.knee.value = 18;
          this.compressor.ratio.value = 4;
          this.compressor.attack.value = 0.003;
          this.compressor.release.value = 0.18;
          this.output.connect(this.compressor);
          this.compressor.connect(this.context.destination);
          this.noise = this.context.createBuffer(
            1,
            this.context.sampleRate,
            this.context.sampleRate,
          );
          const data = this.noise.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          this.applyVolumes();
        }
      }
      // Initiate both promises while still inside the browser's gesture callback.
      const resume = this.context?.resume().catch(() => {});
      this.unlocked = true;
      const music = this.playSelected();
      await Promise.all([resume, music]);
    } catch {
      /* Browsers may restrict audio; the next user gesture retries. */
    }
  }

  playTheme(): void {
    this.setScene('menu');
  }
  playLevel(): void {
    this.setScene('gameplay');
  }
  pauseTheme(): void {
    this.wantsMusic = false;
    for (const track of this.tracks()) if (!track.paused) track.pause();
  }
  /** Resume the currently selected scene after application suspension. */
  resumeTheme(): void {
    if (this.disposed) return;
    this.wantsMusic = true;
    void this.playSelected();
  }
  setVolumes(master: number, music: number, sfx: number): void {
    const clamp = (value: number) =>
      Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
    this.master = clamp(master);
    this.music = clamp(music);
    this.sfx = clamp(sfx);
    this.applyVolumes();
  }
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolumes();
  }
  private applyVolumes(): void {
    for (const track of this.tracks())
      track.volume = this.muted ? 0 : this.master * this.music;
    if (this.output && this.context)
      this.output.gain.setTargetAtTime(
        this.muted ? 0 : this.master * this.sfx,
        this.context.currentTime,
        0.025,
      );
  }

  private tone(
    startHz: number,
    endHz: number,
    length: number,
    gain: number,
    type: OscillatorType = 'sine',
    delay = 0,
  ): void {
    if (!this.context || !this.output || this.voices > 24) return;
    const ctx = this.context,
      time = ctx.currentTime + delay;
    const osc = ctx.createOscillator(),
      envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startHz, time);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, endHz),
      time + length,
    );
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(gain, time + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + length);
    osc.connect(envelope);
    envelope.connect(this.output);
    this.voices++;
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
      this.voices--;
    };
    osc.start(time);
    osc.stop(time + length + 0.015);
  }
  private burst(
    length: number,
    gain: number,
    frequency: number,
    delay = 0,
  ): void {
    if (!this.context || !this.output || !this.noise || this.voices > 24)
      return;
    const ctx = this.context,
      time = ctx.currentTime + delay;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      envelope = ctx.createGain();
    source.buffer = this.noise;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency, time);
    filter.frequency.exponentialRampToValueAtTime(90, time + length);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(gain, time + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.output);
    this.voices++;
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
      this.voices--;
    };
    source.start(time, Math.random() * 0.2);
    source.stop(time + length + 0.015);
  }

  effect(name: SoundEffect): void {
    if (
      !this.unlocked ||
      this.muted ||
      this.disposed ||
      !this.context ||
      this.context.state !== 'running'
    )
      return;
    const now = this.context.currentTime;
    const cooldown =
      name === 'laser'
        ? 0.095
        : name === 'hit'
          ? 0.055
          : name === 'ui'
            ? 0.06
            : name === 'shield'
              ? 0.18
              : 0.09;
    if (now - (this.lastEffect.get(name) ?? -100) < cooldown) return;
    this.lastEffect.set(name, now);
    switch (name) {
      case 'jump':
        this.tone(95, 490, 0.24, 0.17, 'triangle');
        this.burst(0.15, 0.12, 1600);
        break;
      case 'kick':
        this.burst(0.23, 0.25, 3800);
        this.tone(185, 45, 0.2, 0.2, 'triangle');
        break;
      case 'laser':
        this.tone(1650, 270, 0.12, 0.1, 'sawtooth');
        this.tone(880, 240, 0.1, 0.09);
        break;
      case 'hit':
        this.burst(0.15, 0.23, 3100);
        this.tone(115, 40, 0.13, 0.14, 'triangle');
        break;
      case 'stomp':
        this.burst(0.36, 0.35, 2400);
        this.tone(105, 28, 0.32, 0.36);
        break;
      case 'explode':
        this.burst(0.68, 0.42, 4400);
        this.tone(80, 24, 0.6, 0.32);
        this.burst(0.32, 0.17, 1200, 0.13);
        break;
      case 'pickup':
        this.tone(660, 660, 0.13, 0.15);
        this.tone(990, 990, 0.16, 0.15, 'sine', 0.075);
        break;
      case 'checkpoint':
        [440, 554, 660, 880].forEach((hz, i) =>
          this.tone(hz, hz, 0.23, 0.12, 'triangle', i * 0.09),
        );
        break;
      case 'boss':
        this.tone(110, 55, 0.7, 0.24, 'sawtooth');
        this.tone(113, 57, 0.7, 0.16, 'triangle');
        this.burst(0.65, 0.23, 1600);
        break;
      case 'ui':
        this.tone(600, 800, 0.06, 0.1, 'sine');
        break;
      case 'hurt':
        this.tone(270, 68, 0.27, 0.17, 'square');
        this.burst(0.2, 0.2, 1300);
        break;
      case 'shield':
        this.tone(145, 220, 0.26, 0.1, 'triangle');
        this.tone(435, 660, 0.19, 0.055, 'sine', 0.025);
        break;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.wantsMusic = false;
    for (const track of this.tracks()) {
      if (!track.paused) track.pause();
      track.removeAttribute('src');
      track.load();
    }
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.output = null;
    this.noise = null;
  }
}
