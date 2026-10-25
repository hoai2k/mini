// The metronome: Web Audio clicks scheduled a little ahead of time, so the
// beat stays steady even when the page is busy. A worker drives the
// scheduler, because timers on the page slow down in background tabs.

import { barPlan, trainerNext, SOFT, SILENT } from './settings.js';
import { output } from './output.js';
import { COUNT_WORDS, WORD, COUNT_LEAD, COUNT_CHOKE, COUNT_CLICK, countSlots, countUrl, wordGain } from './count.js';

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

/** How long a sound's clicks are recorded for (seconds; then trimmed to the last audible sample): the ringing ones longer. */
export const CLICK_SEC = { cowbell: 0.3, mechanical: 0.5 };
export const clickSec = (sound) => CLICK_SEC[sound] ?? 0.1;

/** A recorded click cut off after its last audible sample (so the apps' mixers don't play silence as a click). */
export function trimClick(d, floor = 1e-4) {
  let end = d.length;
  while (end > 1 && Math.abs(d[end - 1]) < floor) end--;
  return end < d.length ? d.slice(0, end + 1) : d;
}

/** The strength of a subdivision click (between the beats), after weak (0), mid (1) and strong (2). */
export const SUB = 3;
/** Clicks per beat: quarter notes, eighths, triplets, sixteenths. */
export const SUBDIVISIONS = [1, 2, 3, 4];

const SUB_LEVEL = 0.2; // the clicks between the beats: well under the clipper's knee, so clearly quieter
/** A soft beat (volume per beat): the weak click, this much as loud (the apps' mixers use the same). */
export const SOFT_GAIN = 0.35;
/** The polyrhythm's click: the mid click, this much faster (so higher and shorter) and this loud (the apps' mixers use the same). */
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

/** Each voice's counting words, decoded once a page (an AudioBuffer plays in any context): voice -> Promise<{ buffers, lengths }>. */
const counts = {};
const countsReady = {}; // voice -> { buffers, lengths }, once decoded
function loadCount(voice, ctx) {
  counts[voice] ??= Promise.all(COUNT_WORDS.map(async (w) => {
    const res = await fetch(countUrl(voice, w));
    return [w, await ctx.decodeAudioData(await res.arrayBuffer())];
  })).then((list) => (countsReady[voice] = {
    buffers: Object.fromEntries(list),
    lengths: Object.fromEntries(list.map(([w, b]) => [w, b.duration - COUNT_LEAD])),
  }));
  counts[voice].catch(() => { delete counts[voice]; }); // a failed fetch is tried again next time
  return counts[voice];
}

export class Metronome {
  /**
   * @param {BaseAudioContext} ctx
   * @param {{ render?: boolean }} [opts] `render`: this one only records clicks
   *   (prepare(), the apps' renderClicks): straight out, not through the
   *   shared limiter. The limiter is for what is heard, and it is still on
   *   the way out when the recording plays; recorded through it, from the
   *   very start of a context (its lookahead and attack), a click came out
   *   13 to 15 dB quieter (the beep 5) and 10 ms late.
   */
  constructor(ctx, { render = false } = {}) {
    this.ctx = ctx;
    // Clicks are driven into a soft clipper (tanh), so the whole click sits
    // near full scale rather than only its first instant: about 8 dB louder
    // at the same peak. The volume comes after it, so turning down keeps the
    // tone. The apps' clicks are rendered through this same chain.
    this.out = ctx.createGain();
    // The shared limiter: with the drone, the chimes and the voice, nothing clips.
    this.out.connect(render ? ctx.destination : output(ctx));
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
    this.countVoice = 'lily'; // who counts, for the Voice sound (count.js)
    this.words = {}; // voice -> { buffers: { word: AudioBuffer }, lengths: { word: seconds heard } }, once loaded
    this.lastWord = null; // the word last scheduled { src, gain, level, end }, which the next cuts off
    this.live = new Set(); // sources scheduled and not yet ended, stopped by stop()
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
    this.poly = 0; // the polyrhythm: clicks across each bar, or 0
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
    this.plan = plan;
    this.sound = s.sound;
    if (s.countVoice) this.countVoice = s.countVoice;
    if (this.sound === 'voice') this.loadWords(this.countVoice);
    this.recount(); // custom strong beats (or the Voice sound's words): the click for every position, or null
    this.prepare(this.clickSound());
    this.out.gain.setTargetAtTime(s.volume, this.ctx.currentTime, 0.02);
    if (this.beat >= this.strengths.length) this.beat %= this.strengths.length;
  }

  get period() {
    return 60 / this.bpm;
  }

  /** The clicks this sound plays: its own, or for the Voice sound the ones it plays where it says nothing. */
  clickSound() {
    return this.sound === 'voice' ? COUNT_CLICK : this.sound;
  }

  /** The click (or word) for every position in the bar: the plan's, or for the Voice sound what is said at this tempo. */
  recount() {
    const words = this.sound === 'voice' && this.words[this.countVoice];
    this.slots = words ? countSlots({ ...this.plan, subdivision: this.subdivision, bpm: this.bpm }, words.lengths) : this.plan?.slots ?? null;
  }

  /** Fetch and decode `voice`'s counting words (once a page: every metronome shares them); until they are in, the Voice sound plays its clicks. */
  loadWords(voice) {
    this.words[voice] ??= countsReady[voice]; // decoded already: at once, from the first beat
    if (this.words[voice]) return Promise.resolve();
    if (typeof OfflineAudioContext === 'undefined' || this.ctx instanceof OfflineAudioContext) return Promise.resolve();
    return loadCount(voice, this.ctx).then((words) => {
      this.words[voice] = words;
      if (this.sound === 'voice' && this.countVoice === voice) this.recount();
    }).catch(() => {});
  }

  /** Say `word` so its vowel falls at `t`, cutting off the word before it. */
  say(t, word) {
    const buf = this.words[this.countVoice]?.buffers[word];
    if (!buf) return;
    const c = this.ctx;
    const at = t - COUNT_LEAD;
    const start = Math.max(c.currentTime, at);
    const prev = this.lastWord;
    if (prev && prev.end > start) {
      prev.gain.gain.setValueAtTime(prev.level, start);
      prev.gain.gain.linearRampToValueAtTime(0, start + COUNT_CHOKE);
      try { prev.src.stop(start + COUNT_CHOKE); } catch { /* already stopped */ }
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    const level = wordGain(word);
    gain.gain.value = level;
    src.connect(gain).connect(this.out); // past the clipper: a voice, levelled already
    src.start(start, start - at);
    this.track(src);
    this.lastWord = { src, gain, level, end: at + buf.duration };
  }

  /** Keep `src` until it ends, so stop() can silence it. */
  track(src) {
    this.live.add(src);
    src.onended = () => this.live.delete(src);
  }

  /** Silent bars, the tempo trainer and the polyrhythm for this run ({ gap, trainer, poly }, each null or 0 if off). */
  setExercise({ gap = null, trainer = null, poly = 0 } = {}) {
    this.gap = gap;
    this.trainer = trainer;
    this.poly = poly || 0;
  }

  /** The polyrhythm's clicks due before `until`. */
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
    this.next = this.ctx.currentTime + 0.08 + (this.sound === 'voice' ? COUNT_LEAD : 0); // a word starts its lead early
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
    // The Voice sound schedules further ahead (its words start early): those too.
    for (const src of this.live) { try { src.stop(now + 0.005); } catch { /* not started */ } }
    this.live.clear();
    this.lastWord = null;
  }

  tick() {
    if (!this.running) return;
    const until = this.ctx.currentTime + LOOKAHEAD + (this.sound === 'voice' ? COUNT_LEAD : 0);
    // If the page stalled for long, skip ahead rather than firing a burst.
    if (this.next < this.ctx.currentTime - 0.05) {
      const missed = Math.ceil((this.ctx.currentTime - this.next) / this.period);
      this.next += missed * this.period;
      this.beat = (this.beat + missed) % this.strengths.length;
      this.count += missed;
      this.polyIdx = Infinity; // the polyrhythm picks up at the next bar
    }
    while (this.next < until) {
      // The trainer moves the tempo at the start of every `every` bars.
      const t = this.trainer;
      if (t && this.count > 0 && this.count % (this.strengths.length * t.every) === 0) {
        const bpm = trainerNext(this.bpm, t);
        if (bpm !== this.bpm) { this.bpm = bpm; this.recount(); this.onTempo?.(bpm); }
      }
      this.polyClicks(this.next);
      const strength = this.strengths[this.beat] ?? 0;
      const muted = this.muted(this.count);
      // The polyrhythm divides the bar from its first beat.
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
      const off = new OfflineAudioContext(1, Math.ceil(clickSec(sound) * rate), rate);
      const m = new Metronome(off, { render: true });
      m.sound = sound;
      m.out.gain.value = 1;
      m.synth(0, strength);
      return off.startRendering();
    })).then((bufs) => { this.rendered[sound] = bufs; }).catch(() => {}).finally(() => { delete this.rendering[sound]; });
  }

  /** One click. strength: 2 downbeat, 1 secondary accent, 0 other beats, 3 (SUB) between the beats, SOFT a soft beat, SILENT none. */
  voice(t, strength) {
    if (strength === SILENT) return;
    if (strength >= WORD) { this.say(t, COUNT_WORDS[strength - WORD]); return; }
    const soft = strength === SOFT;
    const poly = strength === POLY;
    const kind = soft ? 0 : poly ? 1 : strength;
    const buf = this.rendered[this.clickSound()]?.[kind];
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
    this.track(s);
  }

  /** Build one click live (rendered once by prepare(); also until that is ready). */
  synth(t, strength) {
    const c = this.ctx;
    const g = c.createGain();
    g.connect(this.drive);
    // Ordinary beats a little under the downbeat, not far under it.
    const level = [0.7, 0.85, 1, SUB_LEVEL][strength];
    const sound = this.clickSound();
    if (sound === 'beep') {
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
    if (sound === 'click') {
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
    if (sound === 'mechanical') {
      // A wind-up metronome: a dry escapement tick (a narrow knock and a short
      // tone), and on the downbeat its little bell, ringing on past the tick.
      this.knock(t, [2800, 3000, 3200, 2600][strength], 4, 0.014, level * 5, g);
      this.tone(t, 'sine', [1500, 1600, 1700, 1400][strength], 0.022, level * 0.5, g);
      if (strength === 2) {
        // The bell rings: past the clipper, so its tail fades as a bell's does.
        const bell = c.createGain();
        bell.gain.value = 0.24;
        bell.connect(this.out);
        // Struck just after the tick, as the hammer follows the escapement (and so the two don't peak together).
        this.tone(t + 0.008, 'sine', 2093, 0.45, 1, bell); // C7
        this.tone(t + 0.008, 'sine', 2093 * 2.76, 0.18, 0.35, bell); // a bell's bright upper partial
      }
      return;
    }
    if (sound === 'claves') {
      // Two hardwood sticks: a bright, near-pure ring around 2.5 kHz, gone in a blink, with a crack on top.
      const f = [2450, 2600, 2800, 2350][strength];
      this.tone(t, 'sine', f, 0.06, level * 0.55, g);
      this.tone(t, 'sine', f * 2.2, 0.02, level * 0.12, g);
      this.knock(t, 4500, 1.5, 0.004, level * 1.2, g);
      return;
    }
    if (sound === 'stick') {
      // A side stick (rim click): the stick across the rim, a woody knock with the drum's short body under it.
      this.knock(t, [1700, 1850, 2100, 1600][strength], 1.4, 0.035, level * 3.2, g);
      this.tone(t, 'triangle', [380, 420, 470, 360][strength], 0.03, level * 0.6, g, 0.8);
      this.tone(t, 'sine', [1050, 1150, 1300, 1000][strength], 0.018, level * 0.25, g);
      return;
    }
    if (sound === 'cowbell') {
      // The drum machine's cowbell: two square waves a little under a fifth
      // apart, through a band-pass, a sharp strike and a short ring; past the
      // clipper, so the ring fades rather than holding.
      const k = [1, 1.04, 1.08, 1][strength];
      const bell = c.createGain();
      bell.gain.value = [0.62, 0.66, 0.7, 0.38][strength];
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400 * k;
      bp.Q.value = 1;
      const env = c.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.001);
      env.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      for (const f of [587, 845]) {
        const o = c.createOscillator();
        o.type = 'square';
        o.frequency.value = f * k;
        o.connect(bp);
        o.start(t);
        o.stop(t + 0.26);
      }
      bp.connect(env).connect(bell).connect(this.out);
      return;
    }
    if (sound === 'hihat') {
      // A closed hi-hat: bright noise, the downbeat a touch longer and fuller.
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 10000;
      bp.Q.value = 0.7;
      const dur = [0.045, 0.055, 0.075, 0.035][strength];
      const env = c.createGain();
      env.gain.setValueAtTime(level * 4, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(hp).connect(bp).connect(env).connect(g);
      s.start(t);
      s.stop(t + dur + 0.01);
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

  /** A burst of band-passed noise (`freq`, `q`), at `gain`, dying away over `dur`. */
  knock(t, freq, q, dur, gain, dest) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t);
    s.stop(t + dur + 0.01);
  }

  /** A tone (`type` at `freq`, its pitch falling to `drop` of it), struck at `gain` and dying away over `dur`. */
  tone(t, type, freq, dur, gain, dest, drop = 1) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (drop !== 1) o.frequency.exponentialRampToValueAtTime(freq * drop, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.01);
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
