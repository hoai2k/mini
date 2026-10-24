// The chime engine: plays a sound from sounds.js at an exact AudioContext time,
// so chimes land on time even while the page's timers are throttled (a phone
// with its screen dimmed, a background tab).
import { soundById } from './sounds.js';

export class Chimes {
  constructor() {
    this.ctx = null;
    this.buffers = new Map(); // sound id -> AudioBuffer of its recording, or null when it failed
    this.voices = new Set(); // { at, nodes: [...], gain }
    this.volume = 0.8;
  }

  /** Create or wake the audio context. Call from a tap or key press. */
  async unlock() {
    if (!this.ctx) {
      // On iPhone, ask for the "playback" session so the ring/silent switch doesn't mute the chimes.
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* older Safari */ }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.build(new Ctx({ latencyHint: 'playback' }));
    }
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** Set up the output chain on a context (an OfflineAudioContext in tests). */
  build(ctx) {
    this.ctx = ctx;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 3;
    // A little room around the chime: a generated decaying-noise impulse.
    this.dry = this.ctx.createGain();
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.22;
    const verb = this.ctx.createConvolver();
    verb.buffer = this.impulse(2.8);
    this.dry.connect(this.master);
    this.wet.connect(verb).connect(this.master);
    this.master.connect(comp).connect(this.ctx.destination);
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  setVolume(percent) {
    this.volume = Math.pow(percent / 100, 1.6); // closer to how loudness is heard
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  impulse(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return buf;
  }

  /** Fetch and decode the recordings of the given sounds, if they have one. */
  async preload(ids) {
    await Promise.all([...new Set(ids)].map(async (id) => {
      const s = soundById(id);
      if (!s.file || this.buffers.has(id)) return;
      this.buffers.set(id, null);
      try {
        const res = await fetch(s.file);
        if (!res.ok) throw new Error(res.status);
        this.buffers.set(id, await this.ctx.decodeAudioData(await res.arrayBuffer()));
      } catch { /* the synthesis recipe plays instead */ }
    }));
  }

  /** Ring sound `id` at context time `when` (default now), at `velocity` 0..1. */
  strike(id, when = this.now, velocity = 1) {
    const s = soundById(id);
    const t = Math.max(when, this.now + 0.01);
    const voice = { at: t, end: t + s.length, nodes: [] };
    const out = this.ctx.createGain();
    out.gain.value = velocity * (s.level || 1);
    out.connect(this.dry);
    out.connect(this.wet);
    voice.gain = out;
    const buffer = this.buffers.get(id);
    if (buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(out);
      src.start(t);
      voice.nodes.push(src);
      voice.end = t + buffer.duration;
    } else if (s.gust) {
      // Koshi: a run of rods, loosely clustered, never the same rod twice in a row.
      let last = -1;
      for (let i = 0; i < s.gust.notes; i++) {
        let n;
        do { n = Math.floor(Math.random() * s.scale.length); } while (n === last);
        last = n;
        const dt = s.gust.spread * Math.pow(i / s.gust.notes, 1.25) + Math.random() * 0.12;
        this.mode(voice, out, s, s.scale[n], t + dt, 0.45 + Math.random() * 0.55);
      }
    } else {
      this.mode(voice, out, s, s.f0, t, 1);
    }
    // Fade the last of the ring-out rather than cut it.
    out.gain.setValueAtTime(velocity * (s.level || 1), Math.max(t, voice.end - 2.5));
    out.gain.linearRampToValueAtTime(0, voice.end);
    this.voices.add(voice);
    setTimeout(() => this.voices.delete(voice), (voice.end - this.now + 1) * 1000);
    return voice;
  }

  // One struck body: its partials plus a short filtered-noise contact sound.
  mode(voice, out, s, f0, t, vel) {
    const ctx = this.ctx;
    const norm = 0.42 / s.partials.reduce((sum, p) => sum + p[1], 0);
    for (const [ratio, amp, tau, beat] of s.partials) {
      const f = f0 * ratio;
      if (f > ctx.sampleRate / 2.2) continue;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * norm * vel, t + s.attack);
      g.gain.setTargetAtTime(0, t + s.attack, tau); // e-folding time = tau
      g.connect(out);
      // The two halves of a split mode are unequal, so the beat swells rather than vanishes.
      for (const [df, w] of [[-beat / 2, 0.62], [beat / 2, 0.38]]) {
        const o = ctx.createOscillator();
        o.frequency.value = f + df;
        const half = ctx.createGain();
        half.gain.value = w * 2;
        o.connect(half).connect(g);
        o.start(t);
        o.stop(t + s.length + 0.1);
        voice.nodes.push(o);
      }
    }
    const n = s.noise;
    const len = Math.ceil(ctx.sampleRate * n.decay * 6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * n.decay));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = n.freq;
    bp.Q.value = n.q;
    const ng = ctx.createGain();
    ng.gain.value = n.level * vel;
    src.connect(bp).connect(ng).connect(out);
    src.start(t);
    voice.nodes.push(src);
  }

  /** Cancel chimes that haven't started yet; ones already ringing ring out. */
  cancelPending() {
    for (const v of this.voices) {
      if (v.at > this.now + 0.005) {
        for (const n of v.nodes) { try { n.stop(); } catch { /* never started */ } }
        v.gain.disconnect();
        this.voices.delete(v);
      }
    }
  }

  /** Fade everything out (Stop). */
  silence(fade = 1.2) {
    if (!this.ctx) return;
    for (const v of this.voices) {
      v.gain.gain.cancelScheduledValues(this.now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, this.now);
      v.gain.gain.setTargetAtTime(0, this.now, fade / 4);
    }
    this.cancelPending();
  }
}
