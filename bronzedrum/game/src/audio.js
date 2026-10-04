// Sound. Effects are samples generated with ElevenLabs and listed in
// assets/audio.json (built by design/source/build_audio.py); until a sample has
// loaded, or if it is missing, a synthesised stand-in plays instead: a bronze
// drum (deep "tùng" with an inharmonic metal ring, dry rim "cắc"), a soft
// metronome and short army calls.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.8;
    this.metronome = 0.5;
    this.ambienceLevel = 0.6;
    this.samples = new Map(); // id -> { buffers, gain, loop }
    this.ambience = null;
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
  play(id, t = this.now, gain = 1, dest = this.master) {
    const s = this.samples.get(id);
    if (!this.ctx || !s) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = s.buffers[Math.floor(Math.random() * s.buffers.length)];
    src.loop = s.loop;
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
    if (!this.ambience) return;
    const { src, bus } = this.ambience;
    const t = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    src.stop(t + 0.7);
    this.ambience = null;
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
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise();
      this.setVolume(this.volume);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
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

  tick(t, accent) {
    if (!this.ctx || this.metronome <= 0) return;
    this.tone('sine', accent ? 1320 : 990, t, 0.12 * this.metronome, 0.04);
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
