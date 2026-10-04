// Synthesised sound: a bronze drum (deep "tùng" with inharmonic metal ring,
// dry rim "cắc"), a soft metronome, and short army calls. No audio files, so
// the prototype runs before any recordings exist.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.8;
    this.metronome = 0.5;
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
    this.tone('sawtooth', 160, t, 0.08, 0.18, 90);
  }
}
