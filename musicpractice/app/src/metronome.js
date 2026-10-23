// The metronome: Web Audio clicks scheduled a little ahead of time, so the
// beat stays steady even when the page is busy. A worker drives the
// scheduler, because timers on the page slow down in background tabs.

import { barPlan, trainerNext, SOFT, SILENT } from './settings.js';
import { output } from './output.js';

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
/** A soft beat (volume per beat): the weak click, this much as loud (the apps' mixers use the same). */
export const SOFT_GAIN = 0.35;
/** The second rhythm's click: the mid click, this much faster (so higher and shorter) and this loud (the apps' mixers use the same). */
export const POLY = 6;
export const POLY_RATE = 1.5;
export const POLY_GAIN = 0.8;
// Into the clipper: how hard the clicks are pushed. 6 makes the click's body
// about 2.5 dB louder than the 2.4 it was at the same peak (more is hardly
// louder, only harsher), so full volume is louder than it was, and
// METRONOME_DEFAULT (0.75) is the old full volume's loudness.
const DRIVE = 6;
export const METRONOME_DEFAULT = 0.75;
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
    this.out.connect(output(ctx)); // the shared limiter: with the drone, the chimes and the voice, nothing clips
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
    this.recent = []; // beats scheduled, newest last: { time, beat, count, strength, muted }
    this.gap = null; // silent bars: { play, silent } bars, or null
    this.trainer = null; // the tempo trainer: { step, every, to }, or null
    this.poly = 0; // the second rhythm: clicks across each bar, or 0
    this.polyAt = 0; // its bar: when it starts, how long it is, the next click, and whether it is silent
    this.polyLen = 0;
    this.polyIdx = Infinity;
    this.polyMuted = false;
    this.onTempo = null; // (bpm) when the trainer moves the tempo
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

  /** Silent bars, the tempo trainer and the second rhythm for this run ({ gap, trainer, poly }, each null or 0 if off). */
  setExercise({ gap = null, trainer = null, poly = 0 } = {}) {
    this.gap = gap;
    this.trainer = trainer;
    this.poly = poly || 0;
  }

  /** The second rhythm's clicks due before `until`. */
  polyClicks(until) {
    const n = this.poly;
    while (n && this.polyIdx < n) {
      const t = this.polyAt + (this.polyIdx * this.polyLen) / n;
      if (t >= until) break;
      if (!this.polyMuted) this.voice(t, POLY);
      this.polyIdx++;
    }
  }

  /** Is beat `count` in one of the silent bars? */
  muted(count) {
    const g = this.gap;
    return !!g && Math.floor(count / this.strengths.length) % (g.play + g.silent) >= g.play;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.beat = 0;
    this.count = 0;
    this.recent = [];
    this.next = this.ctx.currentTime + 0.08;
    this.polyIdx = Infinity;
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
      this.polyIdx = Infinity; // the second rhythm picks up at the next bar
    }
    while (this.next < until) {
      // The trainer moves the tempo at the start of every `every` bars.
      const t = this.trainer;
      if (t && this.count > 0 && this.count % (this.strengths.length * t.every) === 0) {
        const bpm = trainerNext(this.bpm, t);
        if (bpm !== this.bpm) { this.bpm = bpm; this.onTempo?.(bpm); }
      }
      this.polyClicks(this.next);
      const strength = this.strengths[this.beat] ?? 0;
      const muted = this.muted(this.count);
      // The second rhythm divides the bar from its first beat.
      if (this.beat === 0) {
        this.polyAt = this.next;
        this.polyLen = this.strengths.length * this.period;
        this.polyIdx = 0;
        this.polyMuted = muted;
      }
      if (!muted) {
        this.voice(this.next, this.slots ? this.slots[this.beat * this.subdivision] ?? strength : strength);
        // Subdivisions: the quieter clicks between the beats (not beats themselves:
        // the pendulum, lamp and dots keep to the beat).
        for (let k = 1; k < this.subdivision; k++) {
          const kind = this.slots ? this.slots[this.beat * this.subdivision + k] ?? SUB : SUB;
          this.voice(this.next + (k * this.period) / this.subdivision, kind);
        }
      }
      this.recent.push({ time: this.next, beat: this.beat, count: this.count, strength, muted });
      if (this.recent.length > 16) this.recent.shift();
      this.next += this.period;
      this.beat = (this.beat + 1) % this.strengths.length;
      this.count++;
    }
    this.polyClicks(until);
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

  /** One click. strength: 2 downbeat, 1 secondary accent, 0 other beats, 3 (SUB) between the beats, SOFT a soft beat, SILENT none. */
  voice(t, strength) {
    if (strength === SILENT) return;
    const soft = strength === SOFT;
    const poly = strength === POLY;
    const kind = soft ? 0 : poly ? 1 : strength;
    const buf = this.rendered[this.sound]?.[kind];
    if (!buf) { this.synth(t, kind); return; }
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    if (poly) s.playbackRate.value = POLY_RATE;
    if (soft || poly) {
      const g = this.ctx.createGain();
      g.gain.value = soft ? SOFT_GAIN : POLY_GAIN;
      s.connect(g).connect(this.out);
    } else s.connect(this.out); // already through the clipper
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
/**
 * Where the pendulum's weight sits for a tempo, as on a real metronome: high
 * on the rod is slow, low is fast. 0 is the top of its travel (the range's
 * slowest), 1 the bottom (its fastest); tempos past either end stay there
 * (they can still be typed). The range is the chosen genre's, from its
 * slowest named tempo to its fastest (genreRange in tempos.js), so the rod
 * spans the tempos that genre plays; WEIGHT_BPM is the default. Not even: a
 * log scale, squeezed further at the fast end, so the everyday tempos get
 * most of the rod.
 */
/**
 * Tap tempo: the beats per minute of taps (times in ms, oldest first), from
 * the last few (TAP_KEEP) so a steady hand settles quickly and a slip fades;
 * a pause longer than TAP_RESET starts again. null until there are two taps.
 */
export const TAP_KEEP = 6;
export const TAP_RESET = 2000;
export function tapTempo(times) {
  let i = times.length - 1;
  while (i > 0 && times[i] - times[i - 1] <= TAP_RESET) i--;
  const run = times.slice(Math.max(i, times.length - TAP_KEEP));
  if (run.length < 2) return null;
  return Math.round((60000 * (run.length - 1)) / (run[run.length - 1] - run[0]));
}

export const WEIGHT_BPM = [40, 300];
const WEIGHT_CURVE = 0.8;
export function weightAt(bpm, [lo, hi] = WEIGHT_BPM) {
  const u = (Math.log(Math.min(hi, Math.max(lo, bpm))) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return u ** WEIGHT_CURVE;
}
/** The tempo for a place on the rod (0 top to 1 bottom): weightAt's inverse. */
export function bpmAtWeight(t, [lo, hi] = WEIGHT_BPM) {
  const u = Math.min(1, Math.max(0, t)) ** (1 / WEIGHT_CURVE);
  return Math.exp(Math.log(lo) + u * (Math.log(hi) - Math.log(lo)));
}

export function pendulumAngle(beat, now, period, amplitude = 28) {
  if (!beat) return 0;
  const side = beat.count % 2 === 0 ? 1 : -1;
  const since = Math.min(1, Math.max(0, (now - beat.time) / period));
  return amplitude * side * Math.cos(Math.PI * since);
}
