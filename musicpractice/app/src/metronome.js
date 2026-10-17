// The metronome: Web Audio clicks scheduled a little ahead of time, so the
// beat stays steady even when the page is busy. A worker drives the
// scheduler, because timers on the page slow down in background tabs.

import { barPlan } from './settings.js';

const LOOKAHEAD = 0.12; // seconds of clicks scheduled in advance
const TICK_MS = 25;

function makeTimer(fn) {
  try {
    const src = `let id=null;onmessage=e=>{clearInterval(id);id=null;if(e.data>0)id=setInterval(()=>postMessage(0),e.data)}`;
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = fn;
    return { start: () => w.postMessage(TICK_MS), stop: () => w.postMessage(0) };
  } catch {
    let id = null;
    return { start: () => { clearInterval(id); id = setInterval(fn, TICK_MS); }, stop: () => { clearInterval(id); id = null; } };
  }
}

/** The strength of a subdivision click (between the beats), after weak (0), mid (1) and strong (2). */
export const SUB = 3;
/** Clicks per beat: quarter notes, eighths, triplets, sixteenths. */
export const SUBDIVISIONS = [1, 2, 3, 4];

const SUB_LEVEL = 0.2; // the clicks between the beats: well under the clipper's knee, so clearly quieter
const DRIVE = 2.4; // into the clipper: how hard the clicks are pushed
const KNEE = 1.6; // the tanh curve's steepness

/** tanh, scaled so full drive reaches 0.9: loud, with room for the oversampling's overshoot. */
function softClip(n = 2048) {
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = (0.9 * Math.tanh(KNEE * x)) / Math.tanh(KNEE);
  }
  return curve;
}

export class Metronome {
  /** @param {AudioContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
    // Clicks are driven into a soft clipper (tanh), so the whole click sits
    // near full scale rather than only its first instant: about 8 dB louder
    // at the same peak. The volume comes after it, so turning down keeps the
    // tone. The apps' clicks are rendered through this same chain.
    this.out = ctx.createGain();
    this.out.connect(ctx.destination);
    this.drive = ctx.createGain();
    this.drive.gain.value = DRIVE;
    const shaper = ctx.createWaveShaper();
    shaper.curve = softClip();
    shaper.oversample = 'none'; // oversampling's filters ring past full scale on the noise; a click this short doesn't need it
    this.drive.connect(shaper).connect(this.out);
    this.running = false;
    this.bpm = 120;
    this.strengths = [2, 0, 0, 0];
    this.sound = 'wood';
    this.timer = makeTimer(() => this.tick());
    // Each sound's four clicks, rendered once (below) and played back as they
    // are, so every beat is the very same click. Built live, the woodblock's
    // tone and knock fell into a slightly different phase on every beat
    // (their start times land between samples), and through the clipper that
    // changed its attack from beat to beat.
    this.rendered = {}; // sound -> [weak, mid, strong, between] AudioBuffers
    this.rendering = {};
    this.recent = []; // beats scheduled, newest last: { time, beat, count, strength }
    // Short noise for the woodblock knock and the click.
    const n = Math.round(ctx.sampleRate * 0.05);
    this.noise = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }

  /** @param {{ bpm: number, meter: string, accent: boolean, sound: string, volume: number, subdivision?: number }} s */
  configure(s) {
    this.bpm = s.bpm;
    this.subdivision = s.subdivision || 1;
    const plan = barPlan(s);
    this.strengths = plan.strengths;
    this.slots = plan.slots; // custom strong beats: the click for every position, or null
    this.sound = s.sound;
    this.prepare(s.sound);
    this.out.gain.setTargetAtTime(s.volume, this.ctx.currentTime, 0.02);
    if (this.beat >= this.strengths.length) this.beat %= this.strengths.length;
  }

  get period() {
    return 60 / this.bpm;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.beat = 0;
    this.count = 0;
    this.recent = [];
    this.next = this.ctx.currentTime + 0.08;
    this.startedAt = this.next;
    this.tick();
    this.timer.start();
  }

  stop() {
    this.running = false;
    this.timer.stop();
    // Silence anything already scheduled.
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    const v = this.out.gain.value;
    this.out.gain.setValueAtTime(0, now + 0.005);
    this.out.gain.setValueAtTime(v, now + 0.15);
    for (const b of this.recent) if (b.time > now) b.time = Infinity;
  }

  tick() {
    if (!this.running) return;
    const until = this.ctx.currentTime + LOOKAHEAD;
    // If the page stalled for long, skip ahead rather than firing a burst.
    if (this.next < this.ctx.currentTime - 0.05) {
      const missed = Math.ceil((this.ctx.currentTime - this.next) / this.period);
      this.next += missed * this.period;
      this.beat = (this.beat + missed) % this.strengths.length;
      this.count += missed;
    }
    while (this.next < until) {
      const strength = this.strengths[this.beat] ?? 0;
      this.voice(this.next, strength);
      // Subdivisions: the quieter clicks between the beats (not beats themselves:
      // the pendulum, lamp and dots keep to the beat).
      for (let k = 1; k < this.subdivision; k++) {
        const kind = this.slots ? this.slots[this.beat * this.subdivision + k] ?? SUB : SUB;
        this.voice(this.next + (k * this.period) / this.subdivision, kind);
      }
      this.recent.push({ time: this.next, beat: this.beat, count: this.count, strength });
      if (this.recent.length > 16) this.recent.shift();
      this.next += this.period;
      this.beat = (this.beat + 1) % this.strengths.length;
      this.count++;
    }
  }

  /** The beat being heard at context time `t`, or null before the first. */
  beatAt(t) {
    for (let i = this.recent.length - 1; i >= 0; i--) {
      if (this.recent[i].time <= t) return this.recent[i];
    }
    return null;
  }

  /** Render `sound`'s clicks once, through this same chain (an offline copy of it). */
  prepare(sound) {
    if (this.rendered[sound] || this.rendering[sound] || typeof OfflineAudioContext === 'undefined' || this.ctx instanceof OfflineAudioContext) return;
    const rate = this.ctx.sampleRate;
    this.rendering[sound] = Promise.all([0, 1, 2, SUB].map((strength) => {
      const off = new OfflineAudioContext(1, Math.ceil(0.1 * rate), rate);
      const m = new Metronome(off);
      m.sound = sound;
      m.out.gain.value = 1;
      m.synth(0, strength);
      return off.startRendering();
    })).then((bufs) => { this.rendered[sound] = bufs; }).catch(() => {}).finally(() => { delete this.rendering[sound]; });
  }

  /** One click. strength: 2 downbeat, 1 secondary accent, 0 other beats, 3 (SUB) between the beats. */
  voice(t, strength) {
    const buf = this.rendered[this.sound]?.[strength];
    if (!buf) { this.synth(t, strength); return; }
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.connect(this.out); // already through the clipper
    // On a whole sample: played from between two, a click is interpolated,
    // which dulls its brightest part by a different amount each beat.
    const rate = this.ctx.sampleRate;
    s.start(Math.max(this.ctx.currentTime, Math.round(t * rate) / rate));
  }

  /** Build one click live (rendered once by prepare(); also until that is ready). */
  synth(t, strength) {
    const c = this.ctx;
    const g = c.createGain();
    g.connect(this.drive);
    // Ordinary beats a little under the downbeat, not far under it.
    const level = [0.7, 0.85, 1, SUB_LEVEL][strength];
    if (this.sound === 'beep') {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = [880, 1100, 1320, 880][strength];
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level * 0.3, t + 0.003);
      g.gain.setValueAtTime(level * 0.3, t + 0.045);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.09);
      return;
    }
    if (this.sound === 'click') {
      const s = c.createBufferSource();
      s.buffer = this.noise;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = [3200, 4200, 5200, 3200][strength];
      f.Q.value = 1.2;
      g.gain.setValueAtTime(level * 3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      s.connect(f).connect(g);
      s.start(t);
      s.stop(t + 0.05);
      return;
    }
    // Woodblock: a hollow tone that drops slightly in pitch, with a knock on top.
    const base = [1000, 1250, 1600, 1000][strength];
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * 0.86, t + 0.04);
    const og = c.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(level, t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + 0.08);
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = base * 2.5;
    f.Q.value = 3;
    const ng = c.createGain();
    ng.gain.setValueAtTime(level * 0.9, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    s.connect(f).connect(ng).connect(g);
    s.start(t);
    s.stop(t + 0.02);
  }
}

/**
 * Pendulum angle in degrees at context time `now`: it reaches one end of
 * its swing on each beat and the other end on the next, moving as a real
 * pendulum does (simple harmonic motion): easing to a stop at each end, where
 * the beat falls, and fastest through the middle.
 */
export function pendulumAngle(beat, now, period, amplitude = 28) {
  if (!beat) return 0;
  const side = beat.count % 2 === 0 ? 1 : -1;
  const since = Math.min(1, Math.max(0, (now - beat.time) / period));
  return amplitude * side * Math.cos(Math.PI * since);
}
