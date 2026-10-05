// Sound. Effects are samples generated with ElevenLabs and listed in
// assets/audio.json (built by design/source/build_audio.py); until a sample has
// loaded, or if it is missing, a synthesised stand-in plays instead: a bronze
// drum (deep "tùng" with an inharmonic metal ring, dry rim "cắc") and short
// army calls.

// Seconds a looping track crossfades into its next round.
const MUSIC_XFADE = 3;

/**
 * Move a gain to `to` over `dur` seconds along an equal-power curve, taking
 * over from whatever fade it is in the middle of.
 */
function glide(ctx, param, to, dur) {
  const t = ctx.currentTime;
  const from = param.value;
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
  else {
    param.cancelScheduledValues(t);
    param.setValueAtTime(from, t);
  }
  try {
    param.setValueCurveAtTime(fadeCurve(from, to), t + 0.005, Math.max(0.02, dur));
  } catch {
    param.cancelScheduledValues(t);
    param.setValueAtTime(from, t);
    param.linearRampToValueAtTime(to, t + dur);
  }
}

/** An equal-power fade from a to b (sine/cosine), so a crossfade never dips. */
function fadeCurve(a, b, n = 64) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * (Math.PI / 2);
    c[i] = a > b ? b + (a - b) * Math.cos(x) : a + (b - a) * Math.sin(x);
  }
  return c;
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.8;
    this.ambienceLevel = 0.6;
    this.samples = new Map(); // id -> { buffers, gain, loop }
    this.ambience = null;
    this.musicLevel = 0.6;
    this.musicFiles = new Map(); // id -> { file, loop } for tracks that exist
    this.music = null; // { id, el, gain } now playing
    this.base = 'assets/';
  }

  /** Fetch and decode every sample in the audio manifest. */
  async loadSamples(base = 'assets/') {
    if (!this.ctx || this.loading) return this.loading;
    this.loading = (async () => {
      let manifest;
      try {
        manifest = await (await fetch(`${base}audio.json`)).json();
      } catch {
        return;
      }
      for (const [id, m] of Object.entries(manifest.music || {})) this.musicFiles.set(id, m);
      const entries = Object.entries(manifest.sfx || {});
      await Promise.all(
        entries.map(async ([id, e]) => {
          const buffers = [];
          for (const f of e.files) {
            try {
              const data = await (await fetch(`${base}${f}`)).arrayBuffer();
              buffers.push(await this.ctx.decodeAudioData(data));
            } catch {
              /* a missing or broken file falls back to the stand-in */
            }
          }
          if (buffers.length) this.samples.set(id, { buffers, gain: e.gain ?? 1, loop: !!e.loop });
        }),
      );
    })();
    return this.loading;
  }

  has(id) {
    return this.samples.has(id);
  }

  /** Play a sample (a random variant) at audio time t. Returns false if it is not loaded. */
  play(id, t = this.now, gain = 1, dest = this.master, rate = 1) {
    const s = this.samples.get(id);
    if (!this.ctx || !s) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = s.buffers[Math.floor(Math.random() * s.buffers.length)];
    src.loop = s.loop;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = s.gain * gain;
    src.connect(g).connect(dest);
    src.start(Math.max(t, this.ctx.currentTime));
    return src;
  }

  /** Start a looping ambience bed, replacing any other. */
  startAmbience(id) {
    this.stopAmbience();
    if (!this.ctx || !this.samples.has(id)) return;
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.ambienceLevel), this.ctx.currentTime + 1.5);
    bus.connect(this.master);
    const src = this.play(id, this.now, 1, bus);
    this.ambience = { src, bus };
  }

  stopAmbience() {
    this.stopBreeze();
    if (!this.ambience) return;
    const { src, bus } = this.ambience;
    const t = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    src.stop(t + 0.7);
    this.ambience = null;
  }

  // ------------------------------------------------------------- music
  // Tracks are long, so they stream through <audio> elements into a music bus
  // instead of being decoded up front. A track with no file yet is silent.

  setMusic(v) {
    this.musicLevel = v;
    if (!this.music) return;
    // Only the voice that is not fading out follows the slider.
    const cur = this.music.current;
    if (cur && !cur.out && !cur.el.paused) glide(this.ctx, cur.gain.gain, v * this.music.level, 0.15);
  }

  /**
   * Crossfade to a track. id may be a list: the first track whose file exists
   * plays (a chapter's own bed, else the shared one). level scales it.
   *
   * A looping track with loop points (from build_audio.py) never just
   * restarts: just before loopEnd a second voice starts at loopStart and the
   * two crossfade over MUSIC_XFADE seconds, so the track's own fade-out, its
   * fade-in and the gap browsers leave when an MP3 loops are never heard.
   */
  playMusic(id, { level = 1, fade = 1.2 } = {}) {
    if (!this.ctx) return;
    if (Array.isArray(id)) id = id.find((x) => this.musicFiles.has(x)) || id[0];
    if (this.music && this.music.id === id) return;
    this.stopMusic(fade);
    const m = this.musicFiles.get(id);
    if (!m) return;
    const music = { id, m, level, voices: new Set(), current: null, next: null };
    this.music = music;
    music.current = this.voice(music, 0, fade);
    music.timer = setInterval(() => this.loopTick(music), 100);
  }

  /** One playing copy of a track, from `from` seconds, fading in over `fade`. */
  voice(music, from, fade, start = true) {
    const el = new Audio(`${this.base}${music.m.file}${from ? `#t=${from}` : ''}`);
    el.preload = 'auto';
    // Without loop points, fall back to the element's own loop.
    el.loop = !!music.m.loop && !music.m.loopEnd;
    el.crossOrigin = 'anonymous';
    const src = this.ctx.createMediaElementSource(el);
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    src.connect(gain).connect(this.master);
    const v = { el, gain, from, out: false, endAt: Infinity };
    music.voices.add(v);
    if (start) this.startVoice(music, v, fade);
    return v;
  }

  startVoice(music, v, fade) {
    v.gain.gain.value = 0;
    glide(this.ctx, v.gain.gain, this.musicLevel * music.level, fade);
    if (v.from && Math.abs(v.el.currentTime - v.from) > 0.25) {
      try {
        v.el.currentTime = v.from;
      } catch {
        /* the #t= fragment already placed it */
      }
    }
    v.el.play().catch(() => {});
  }

  fadeOutVoice(music, v, fade) {
    v.out = true;
    glide(this.ctx, v.gain.gain, 0, fade);
    v.endAt = this.ctx.currentTime + fade + 0.05;
  }

  /** Hand a looping track over to its next voice, and retire faded voices. */
  loopTick(music) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const m = music.m;
    const cur = music.current;
    if (m.loop && m.loopEnd && cur && !cur.out && this.music === music) {
      const left = m.loopEnd - cur.el.currentTime;
      // Get the next copy loading a few seconds ahead, so it starts on time.
      if (!music.next && left < MUSIC_XFADE + 6) music.next = this.voice(music, m.loopStart || 0, MUSIC_XFADE, false);
      if (left <= MUSIC_XFADE && music.next) {
        this.fadeOutVoice(music, cur, MUSIC_XFADE);
        this.startVoice(music, music.next, MUSIC_XFADE);
        music.current = music.next;
        music.next = null;
      }
    }
    for (const v of music.voices) {
      if (this.ctx.currentTime >= v.endAt) {
        v.el.pause();
        v.el.removeAttribute('src');
        music.voices.delete(v);
      }
    }
    if (this.music !== music && !music.voices.size) clearInterval(music.timer);
  }

  stopMusic(fade = 0.8) {
    if (!this.music || !this.ctx) return;
    const music = this.music;
    for (const v of music.voices) {
      if (v === music.next) {
        music.voices.delete(v);
        continue;
      }
      if (!v.out) this.fadeOutVoice(music, v, fade);
    }
    music.next = null;
    this.music = null;
  }

  /** A one-off over whatever is playing (the drum-wake swell). */
  musicOverlay(id, level = 0.9) {
    const m = this.musicFiles.get(id);
    if (!this.ctx || !m) return;
    const el = new Audio(`${this.base}${m.file}`);
    const src = this.ctx.createMediaElementSource(el);
    const gain = this.ctx.createGain();
    gain.gain.value = this.musicLevel * level;
    src.connect(gain).connect(this.master);
    el.play().catch(() => {});
  }

  /** Pause and resume with the game (the audio clock suspends; elements do not). */
  pauseMusic(paused) {
    this.musicPaused = paused;
    if (!this.music) return;
    for (const v of this.music.voices) {
      if (v === this.music.next) continue;
      if (paused) v.el.pause();
      else v.el.play().catch(() => {});
    }
    // The volume may have changed in Settings while paused.
    const cur = this.music.current;
    if (!paused && cur && !cur.out) glide(this.ctx, cur.gain.gain, this.musicLevel * this.music.level, 0.3);
  }

  /**
   * The Oath's breeze: a looping wind that fades in while A or Y is held and
   * out when released (level 0..1). Started on first use, kept running quietly.
   */
  setBreeze(level) {
    if (!this.ctx || !this.samples.has('breeze')) return;
    if (!this.breeze) {
      if (level <= 0) return;
      const bus = this.ctx.createGain();
      bus.gain.value = 0;
      bus.connect(this.master);
      const src = this.play('breeze', this.now, 1, bus);
      this.breeze = { bus, src, level: 0 };
    }
    if (Math.abs(level - this.breeze.level) < 0.01) return;
    this.breeze.level = level;
    glide(this.ctx, this.breeze.bus.gain, level * this.ambienceLevel, level > 0 ? 0.35 : 0.8);
  }

  stopBreeze() {
    if (!this.breeze) return;
    const { bus, src } = this.breeze;
    glide(this.ctx, bus.gain, 0, 0.4);
    setTimeout(() => {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      bus.disconnect();
    }, 600);
    this.breeze = null;
  }

  setAmbience(v) {
    this.ambienceLevel = v;
    if (this.ambience) this.ambience.bus.gain.setTargetAtTime(Math.max(0.0001, v), this.ctx.currentTime, 0.1);
  }

  start() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      // A limiter at the end of the mix: a drum stroke landing on the army's
      // echoes, the music and the ambience peaked over full scale and
      // clipped, which on the bronze drum sounds like a harsh metallic crack.
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -8;
      this.limiter.knee.value = 4;
      this.limiter.ratio.value = 16;
      this.limiter.attack.value = 0.002;
      this.limiter.release.value = 0.12;
      // The pause fade: the last gain before the speakers.
      this.out = this.ctx.createGain();
      // Silent while the tab or window is in the background (setFocused).
      this.focusGain = this.ctx.createGain();
      this.focusGain.gain.value = this.focused === false ? 0 : 1;
      this.master.connect(this.limiter).connect(this.out).connect(this.focusGain).connect(this.ctx.destination);
      this.noise = this.makeNoise();
      this.setVolume(this.volume);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** Mute everything while the game's tab or window is not focused. */
  setFocused(focused) {
    this.focused = focused;
    if (!this.focusGain) return;
    const t = this.ctx.currentTime;
    const g = this.focusGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(focused ? 1 : 0, t + (focused ? 0.3 : 0.08));
    // Streamed music plays through <audio> elements: hold them too.
    if (this.music) {
      for (const v of this.music.voices) {
        if (v === this.music.next) continue;
        if (!focused) v.el.pause();
        else if (!this.musicPaused) v.el.play().catch(() => {});
      }
    }
  }

  /** Pause: fade out over a few milliseconds, then stop the audio clock. */
  async suspend() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + 0.06);
    this.suspending = new Promise((r) => setTimeout(r, 80)).then(() => this.ctx.suspend());
    await this.suspending;
  }

  /** Resume: restart the clock and fade back in, so nothing starts on a hard edge. */
  async resume() {
    if (!this.ctx) return;
    if (this.suspending) await this.suspending;
    await this.ctx.resume();
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(0, t);
    this.out.gain.linearRampToValueAtTime(1, t + 0.25);
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  /** Output latency in seconds: the delay between scheduling and hearing. */
  get latency() {
    if (!this.ctx) return 0;
    return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  makeNoise() {
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  env(gain, t, peak, decay) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  }

  tone(type, freq, t, peak, decay, endFreq) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + decay * 0.6);
    this.env(g, t, peak, decay);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  noiseBurst(t, peak, decay, filterType, freq, q = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t, peak, decay);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 0.5);
    s.stop(t + decay + 0.05);
  }

  /** Trắc's deep centre stroke. */
  tung(t = this.now, strong = false) {
    if (!this.ctx) return;
    if (this.play('drum-tung', t, strong ? 1.15 : 1)) return;
    const k = strong ? 1.25 : 1;
    this.tone('sine', 110, t, 0.9 * k, 0.55, 52);
    // Bronze: a few inharmonic partials that ring after the thump.
    for (const [f, a, d] of [[187, 0.12, 1.1], [301, 0.08, 0.9], [457, 0.05, 0.7], [733, 0.03, 0.5]]) {
      this.tone('sine', f, t, a * k, d);
    }
    this.noiseBurst(t, 0.25, 0.08, 'lowpass', 900);
  }

  /** Nhị's rim stroke. */
  cac(t = this.now, soft = false) {
    if (!this.ctx) return;
    if (this.play('drum-cac', t, soft ? 0.7 : 1)) return;
    const k = soft ? 0.55 : 1;
    this.noiseBurst(t, 0.5 * k, 0.05, 'bandpass', 3200, 4);
    this.tone('triangle', 1870, t, 0.18 * k, 0.07);
    this.tone('sine', 1243, t, 0.1 * k, 0.25);
  }

  /**
   * The army's drums echoing a stroke: the same bronze drum, a little lower
   * and softer, so the player can tell their own strokes from the answer.
   * Returns the source so a cancelled answer can be silenced.
   */
  echo(drum, t, level, rate = 0.9) {
    if (!this.ctx || level <= 0) return null;
    const id = drum === 'L' ? 'drum-tung' : 'drum-cac';
    const src = this.play(id, t, level, this.master, rate);
    if (src) return src;
    // Stand-in: a short low tone.
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.value = drum === 'L' ? 95 : 1500;
    this.env(g, t, 0.5 * level, drum === 'L' ? 0.3 : 0.06);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.4);
    return o;
  }

  /** The army answers: a short rising vocal shout. */
  call(t, pitch = 1) {
    if (!this.ctx) return;
    if (this.has('call')) return void this.play('call', t);
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220 * pitch, t);
    o.frequency.linearRampToValueAtTime(300 * pitch, t + 0.12);
    f.type = 'bandpass';
    f.frequency.value = 800;
    f.Q.value = 3;
    this.env(g, t, 0.12, 0.22);
    o.connect(f).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.3);
  }

  clash(t = this.now) {
    if (!this.ctx) return;
    this.noiseBurst(t, 0.3, 0.15, 'highpass', 2500);
    this.tone('square', 640, t, 0.04, 0.1);
  }

  thud(t = this.now) {
    if (!this.ctx) return;
    this.tone('sine', 70, t, 0.6, 0.35, 35);
    this.noiseBurst(t, 0.3, 0.3, 'lowpass', 400);
  }

  miss(t = this.now) {
    if (!this.ctx) return;
    if (this.play('stumble', t)) return;
    this.tone('sawtooth', 160, t, 0.08, 0.18, 90);
  }
}
