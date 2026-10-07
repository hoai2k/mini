// Drum Practice: free play with no right or wrong. Pure logic (times in
// seconds), so it runs under node --test; main.js wires it to the sound and
// the screen.
//
//  free  The player drums a rhythm `beats` beats long (2 to 12, set with LB
//        and RB; 4 by default, like a command). Each beat may hold one, two or
//        three strokes, or none. It is read at the player's own tempo
//        (transcribe), shown, and repeated by the drum crew until the player
//        drums a new one: the old loop quiets while the new rhythm is played
//        and the new one takes over when it is complete. A rhythm is complete
//        when its last beat ends, at the tempo its strokes have set.
//  call  A partner drummer plays a rhythm of the same number of beats; the
//        player answers with any rhythm of that length, and the partner comes
//        straight back on the next beat with a new call.

import { TEMPO } from './rhythm.js';

// The length of a rhythm, in beats (a beat holds one, two or three strokes, or none).
export const BEATS = { min: 2, max: 12 };

// The kits a practice drum can be swapped for: a low voice (L, Trắc's side)
// and a high one (R). Sample ids are in assets/audio.json; `synth` says how
// the stand-in sounds when a sample is missing (audio.js).
export const KITS = [
  { id: 'bronze', name: 'Bronze drum', vn: 'Trống đồng', L: 'drum-tung', R: 'drum-cac' },
  { id: 'temple', name: 'Barrel drum and mõ', vn: 'Trống chầu · mõ', L: 'drum-chau', R: 'drum-mo' },
  { id: 'rice', name: 'Rice drum', vn: 'Trống cơm', L: 'kit-com-low', R: 'kit-com-high' },
  { id: 'gongs', name: 'Gongs', vn: 'Cồng chiêng', L: 'kit-gong-low', R: 'kit-gong-high' },
  { id: 'bamboo', name: 'Bamboo', vn: 'Đàn t’rưng', L: 'kit-bamboo-low', R: 'kit-bamboo-high' },
  { id: 'lion', name: 'Lion-dance drum', vn: 'Trống lân · chũm chọe', L: 'kit-lan-drum', R: 'kit-lan-cymbal' },
];

// The secondary drum (Y): one voice at a time, struck alongside the bronze
// drum and part of the rhythm (drum 'S'); LB and RB choose it. face: the kit
// face drawn for it (Renderer.kitFace).
export const SECONDS = [
  { id: 'chau', name: 'Barrel drum', vn: 'Trống chầu', sample: 'drum-chau', face: 'temple' },
  { id: 'mo', name: 'Slit drum', vn: 'Mõ', sample: 'drum-mo', face: 'temple' },
  { id: 'com', name: 'Rice drum', vn: 'Trống cơm', sample: 'kit-com-low', face: 'rice' },
  { id: 'gong', name: 'Low gong', vn: 'Cồng', sample: 'kit-gong-low', face: 'gongs' },
  { id: 'chieng', name: 'High gong', vn: 'Chiêng', sample: 'kit-gong-high', face: 'gongs' },
  { id: 'bamboo', name: 'Bamboo', vn: 'Đàn t’rưng', sample: 'kit-bamboo-low', face: 'bamboo' },
  { id: 'lan', name: 'Lion-dance drum', vn: 'Trống lân', sample: 'kit-lan-drum', face: 'lion' },
  { id: 'choe', name: 'Cymbals', vn: 'Chũm chọe', sample: 'kit-lan-cymbal', face: 'lion' },
];

// Reading free strokes as a rhythm (transcribe). The strokes are laid on a
// grid of beats at a steady tempo, the first stroke on the first beat. Each
// beat is split into one, two or three slots, and slots may stay empty, so a
// rhythm can hold rests: a silent beat ("-"), or a silent slot inside a beat
// (".R", an off-beat stroke; "R.R"). Every choice has a small cost and the
// cheapest reading wins:
//  - timing: how far each stroke sits from its slot, in beats, squared;
//  - halves cost a little, thirds a lot: strokes are read as plain beats and
//    pairs unless only triplets fit them;
//  - a silent beat or slot costs a little, so a rhythm is not read as a
//    slower one full of rests;
//  - a deep stroke (L) off the start of its beat costs a little: deep strokes
//    open beats.
// Tempo: every tempo on a fine grid, then refined. A tempo already in the air
// (a loop playing, the partner's call) can be preferred (prior), or required
// to within a range (uMin, uMax): an answer is drummed at about its call's
// speed.
const COST = { half: 0.006, third: 0.04, emptySlot: 0.012, restBeat: 0.02, deepOff: 0.012, prior: 0.2 };
const U_MIN = TEMPO.min * 0.9;
const U_MAX = TEMPO.max * 1.05;

/** The best reading of the strokes at tempo u: each beat's division and slots, and the cost. */
function readAt(strokes, u, open) {
  const t0 = strokes[0].t;
  const beats = new Map(); // beat -> [{ x, i }]
  strokes.forEach((s, i) => {
    const x = (s.t - t0) / u;
    // A stroke a little early for a beat (up to a sixth) belongs to that beat.
    const b = Math.floor(x + 1 / 6);
    if (!beats.has(b)) beats.set(b, []);
    beats.get(b).push({ x: x - b, i });
  });
  const last = Math.max(...beats.keys());
  let cost = 0;
  const cells = new Map(); // beat -> { d, slots: [k per stroke], idx: [stroke index] }
  for (const [b, list] of beats) {
    const lastBeat = b === last;
    let best = null;
    for (const d of [1, 2, 3]) {
      if (list.length > d) continue;
      const slots = list.map((q) => Math.min(d - 1, Math.max(0, Math.round(q.x * d))));
      if (new Set(slots).size !== slots.length) continue;
      let c = d === 2 ? COST.half : d === 3 ? COST.third : 0;
      list.forEach((q, n) => {
        const e = q.x - slots[n] / d;
        c += e * e;
        if (slots[n] > 0 && strokes[q.i].drum === 'L') c += COST.deepOff;
      });
      // Empty slots: none charged after the last stroke of a rhythm still being drummed.
      const top = open && lastBeat ? Math.max(...slots) + 1 : d;
      c += (top - list.length) * COST.emptySlot;
      if (!best || c < best.c) best = { c, d, slots, idx: list.map((q) => q.i) };
    }
    if (!best) return null;
    cost += best.c;
    cells.set(b, best);
  }
  cost += (last + 1 - beats.size) * COST.restBeat;
  return { cost, cells, last };
}

/**
 * Read free strokes ([{ drum, t }], in order) as a rhythm at a steady tempo
 * (see above). Options: open (still being drummed), prior (a tempo to prefer),
 * uMin and uMax (the tempos allowed). Returns { u, beats, strokes: [{ drum,
 * pos, div }], text, cost }, pos in beats from the first stroke; text is
 * "L RR .R -": beats apart, "." a silent slot, "-" a silent beat.
 */
export function transcribe(strokes, { open = false, prior = null, uMin = U_MIN, uMax = U_MAX } = {}) {
  const n = strokes.length;
  if (!n) return null;
  if (n === 1) return finish(strokes, { cells: new Map([[0, { d: 1, slots: [0], idx: [0] }]]), last: 0 }, 0.6, 0);
  const score = (u) => {
    const r = readAt(strokes, u, open);
    if (!r) return null;
    r.cost += prior ? COST.prior * Math.log2(u / prior) ** 2 : 0;
    r.u = u;
    return r;
  };
  let best = null;
  const lo = Math.max(U_MIN, uMin);
  const hi = Math.min(U_MAX, uMax);
  for (let u = lo; u <= hi; u *= 1.015) {
    const r = score(u);
    if (r && (!best || r.cost < best.cost)) best = r;
  }
  if (!best) return null;
  // Refine the tempo around the best.
  for (let u = best.u * 0.985; u <= best.u * 1.015; u *= 1.002) {
    const r = u >= lo && u <= hi ? score(u) : null;
    if (r && r.cost < best.cost) best = r;
  }
  return finish(strokes, best, best.u, best.cost);
}

function finish(strokes, reading, u, cost) {
  const out = [];
  const text = [];
  for (let b = 0; b <= reading.last; b++) {
    const cell = reading.cells.get(b);
    if (!cell) {
      text.push('-');
      continue;
    }
    const slots = Array(cell.d).fill('.');
    cell.idx.forEach((i, n) => {
      slots[cell.slots[n]] = strokes[i].drum;
      out.push({ drum: strokes[i].drum, pos: b + cell.slots[n] / cell.d, div: cell.d });
    });
    text.push(slots.join(''));
  }
  return { u, beats: reading.last + 1, strokes: out, text: text.join(' '), cost };
}

/** Pattern text to strokes: "-" a silent beat, "." a silent slot inside a beat. */
export function practicePattern(text) {
  const strokes = [];
  text.split(' ').forEach((beat, b) => {
    if (beat === '-') return;
    [...beat].forEach((drum, i) => {
      if (drum !== '.') strokes.push({ drum, pos: b + i / beat.length, div: beat.length });
    });
  });
  return { text, strokes, beats: text.split(' ').length };
}

/**
 * A partner's call of n strokes: beats of one, two or three, never two deep
 * strokes inside one beat. rnd() returns 0..1.
 */
export function makeCall(beats, rnd = Math.random) {
  // The partner's call is the one rhythm expected, so it may open with a pair or a triplet.
  const out = [];
  for (let b = 0; b < beats; b++) {
    const r = rnd();
    const size = r < 0.55 ? 1 : r < 0.85 ? 2 : 3;
    let s = '';
    for (let m = 0; m < size; m++) {
      // Deep strokes open beats; the quick ones are on the rim.
      const deep = m === 0 && (b === 0 ? rnd() < 0.7 : rnd() < 0.45);
      s += deep ? 'L' : 'R';
    }
    out.push(s);
  }
  return practicePattern(out.join(' '));
}

/**
 * The practice session. Feed it strokes and the clock; it returns events for
 * main.js to sound and show:
 *  phraseStart  the player began a rhythm (quiet the loop / cut the call)
 *  loop         { loop }: a new rhythm to repeat from loop.start, every loop.period
 *  abandon      the player stopped part way; the old loop comes back up
 *  call         { call }: the partner plays call.strokes (absolute times)
 *  answered     { answer }: the player's answer, transcribed
 *  beats        the number of beats changed
 */
export class PracticeSession {
  constructor({ mode = 'free', beats = 4, rnd = Math.random } = {}) {
    this.mode = mode;
    this.beats = clampBeats(beats);
    this.rnd = rnd;
    this.phrase = []; // the player's strokes so far: { drum, t }
    this.loop = null; // free: { strokes, text, beats, u, start, period }
    this.lastU = null; // free: the tempo of the last loop, after A cleared it
    this.call = null; // call: { strokes: [{ drum, pos, t }], text, beats, u, start, end }
    this.answer = null; // call: the last answer, transcribed
    this.u = 0.6; // the partner's tempo: follows the player's
    this.nextCallAt = mode === 'call' ? 2 : Infinity;
    this.waitUntil = Infinity; // call: when an unanswered call is played again
    this.loops = 0; // rhythms completed (free) or answers given (call)
  }

  /** The rhythm drummed so far, read (for the dots), or null. */
  get partial() {
    return this.phrase.length ? transcribe(this.phrase, { open: true, ...this.readOptions() }) : null;
  }

  /** The tempo already in the air: the loop's, or the partner's. */
  get prior() {
    if (this.mode === 'free') return this.loop ? this.loop.u : this.lastU;
    return this.call ? this.call.u : null;
  }

  /**
   * When the rhythm being drummed is complete: just before the beat after its
   * last, at the tempo its strokes have set (a closing pair or triplet still
   * fits in). Unknown until two strokes have set a tempo.
   */
  phraseEnd() {
    if (this.phrase.length < 2) return Infinity;
    const r = transcribe(this.phrase, { open: true, ...this.readOptions() });
    if (!r) return Infinity;
    return this.phrase[0].t + (this.beats - 0.12) * r.u;
  }

  stroke(drum, t) {
    // Free drumming: once a rhythm loops it stays until A clears it, and
    // strokes over it are the player drumming along, not a new rhythm.
    if (this.mode === 'free' && this.loop) return [{ type: 'playAlong', drum, t }];
    const events = [];
    // A stroke past the end of the rhythm completes it. In call mode it starts
    // the next; in free drumming the rhythm now loops and it plays along.
    if (this.phrase.length && t >= this.phraseEnd()) events.push(...this.complete(t));
    if (this.mode === 'free' && this.loop) return [...events, { type: 'playAlong', drum, t }];
    if (!this.phrase.length) {
      events.push({ type: 'phraseStart', t });
      // Answering during the call cuts it short.
      if (this.mode === 'call' && this.call && t < this.call.end) {
        events.push({ type: 'cutCall', t });
        this.call.end = t;
      }
      this.nextCallAt = Infinity;
      this.waitUntil = Infinity;
    }
    // A lone stroke long before this one was a stray: start the rhythm here.
    if (this.phrase.length === 1 && t - this.phrase[0].t > 1.6) this.phrase = [];
    this.phrase.push({ drum, t });
    return events;
  }

  /** How to read the player's strokes: the tempo in the air is preferred. */
  readOptions() {
    return { prior: this.prior };
  }

  /**
   * Lock the rhythm in: read what was drummed and fit it to the beats set.
   * A stroke or two before the rhythm (a stray hit, then the rhythm proper)
   * may be left out if the rest reads much better without them; strokes past
   * the last beat are left out (they start the next rhythm); beats left
   * silent at the end are rests. Too little to be a rhythm (fewer than half
   * the beats struck: a few extra hits after the last one, in enthusiasm) is
   * no rhythm: null.
   */
  lockIn() {
    const opts = this.readOptions();
    let best = null;
    for (let k = 0; k <= 2 && this.phrase.length - k >= 2; k++) {
      const r = transcribe(this.phrase.slice(k), opts);
      if (!r) continue;
      const score = r.cost + 0.2 * k + 0.08 * Math.max(0, r.beats - this.beats);
      if (!best || score < best.score) best = { r, k, score };
    }
    if (!best) return null;
    const { r, k } = best;
    const strokes = r.strokes.filter((s) => s.pos < this.beats);
    const filled = new Set(strokes.map((s) => Math.floor(s.pos))).size;
    if (filled < Math.max(2, Math.ceil(this.beats / 2))) return null;
    const beatsText = r.text.split(' ').slice(0, this.beats);
    while (beatsText.length < this.beats) beatsText.push('-'); // the beats left silent
    return { strokes, text: beatsText.join(' '), beats: this.beats, u: r.u, first: this.phrase[k].t };
  }

  /** The rhythm is complete: lock it in, then loop it or answer with it. */
  complete(t) {
    const rhythm = this.lockIn();
    this.phrase = [];
    if (!rhythm) return [{ type: 'abandon', t }];
    const r = rhythm;
    const first = rhythm.first;
    this.loops += 1;
    // The beat after the rhythm: where the loop or the partner comes in.
    let start = first + this.beats * r.u;
    while (start < t + 0.03) start += this.beats * r.u;
    if (this.mode === 'free') {
      this.loop = { ...rhythm, start, period: this.beats * r.u };
      return [{ type: 'loop', loop: this.loop }];
    }
    this.answer = { ...rhythm, at: t };
    this.u = Math.min(0.85, Math.max(0.42, r.u));
    return [{ type: 'answered', answer: this.answer }, ...this.startCall(start)];
  }

  /** Begin a new call at time start (call mode). */
  startCall(start, again = false) {
    const p = again && this.call ? practicePattern(this.call.text) : makeCall(this.beats, this.rnd);
    const u = this.u;
    const strokes = p.strokes.map((s) => ({ ...s, t: start + s.pos * u }));
    this.call = { strokes, text: p.text, beats: p.beats, u, start, end: start + p.beats * u };
    this.nextCallAt = Infinity;
    this.waitUntil = this.call.end + Math.max(5, 8 * u);
    return [{ type: 'call', call: this.call, again }];
  }

  update(t) {
    const events = [];
    if (this.phrase.length >= 2 && t >= this.phraseEnd()) {
      events.push(...this.complete(t));
    } else if (this.phrase.length === 1 && t - this.phrase[0].t > 2.5) {
      // One stroke and nothing more: no tempo, no rhythm. Let it go.
      this.phrase = [];
      events.push({ type: 'abandon', t });
      if (this.mode === 'call') this.nextCallAt = t + 0.6;
    }
    if (this.mode === 'call' && !this.phrase.length) {
      if (t >= this.nextCallAt) events.push(...this.startCall(t + 0.1));
      else if (t >= this.waitUntil) events.push(...this.startCall(t + 0.1, true));
    }
    return events;
  }

  /** LB and RB: fewer or more beats. The rhythm being drummed starts over. */
  setBeats(n, t) {
    const b = clampBeats(n);
    if (b === this.beats) return [];
    this.beats = b;
    this.phrase = [];
    const events = [{ type: 'beats', beats: b }];
    if (this.mode === 'call') {
      // The partner starts again with the new length.
      if (this.call && this.call.end > t) this.call.end = t;
      events.push({ type: 'cutCall', t });
      this.nextCallAt = t + 0.7;
      this.waitUntil = Infinity;
    }
    return events;
  }

  /**
   * A: clear the dots, and in free play stop the loop (the only way to: until
   * then strokes play along with it). Its tempo is kept to read the next
   * rhythm by.
   */
  clear(t) {
    this.phrase = [];
    const had = !!this.loop;
    if (this.mode === 'free') {
      if (this.loop) this.lastU = this.loop.u;
      this.loop = null;
    }
    return [{ type: 'clear', t, stopped: had }];
  }
}

function clampBeats(n) {
  return Math.max(BEATS.min, Math.min(BEATS.max, Math.round(n)));
}

/** Where a loop is at time t: its round and the strokes heard so far in that round. */
export function loopPosition(loop, t) {
  if (!loop || t < loop.start) return null;
  const local = t - loop.start;
  const round = Math.floor(local / loop.period);
  const pos = (local - round * loop.period) / loop.u;
  const played = loop.strokes.filter((s) => s.pos <= pos + 1e-6).length;
  return { round, pos, played };
}

/**
 * The partner's answer to the player's call: the same number of beats, riffing
 * on it. The first beat stays; one or two later beats change how they are
 * divided (a stroke becomes a pair, a pair a triplet or a stroke, a triplet a
 * pair), and deep strokes stay at the start of a beat.
 */
export function riffOn(text, rnd = Math.random) {
  const beats = text.split(' ');
  const idx = beats.map((_, i) => i).filter((i) => i > 0);
  const changes = Math.min(idx.length, 1 + (rnd() < 0.5 ? 1 : 0));
  for (let c = 0; c < changes; c++) {
    const i = idx.splice(Math.floor(rnd() * idx.length), 1)[0];
    const b = beats[i];
    const head = b === '-' ? (rnd() < 0.5 ? 'L' : 'R') : b[0];
    const n = b === '-' ? 1 : b.length;
    const to = n === 1 ? 2 : n === 3 ? 2 : rnd() < 0.5 ? 3 : 1;
    beats[i] = head + 'R'.repeat(to - 1);
  }
  return practicePattern(beats.join(' '));
}

/**
 * Call and answer, both ways. The partner calls and the player answers; the
 * exchange is then played back (the call, then the answer). If the answer came
 * in on time (on the beat after the call) everything keeps the same beat and
 * it is the player's turn to lead: the player drums a call, the partner
 * answers with a riff on it, and the player may lead again at once. If the
 * answer came late, or the player waits instead of leading, the partner takes
 * the initiative with a new call. Events, besides PracticeSession's:
 *  answered   { answer, inTime }
 *  replay     { replay: { start, u, end, parts: [{ who, strokes: [{ drum, pos, t }] }] } }
 *  yourTurn   { at }: the player may lead
 *  led        { lead }: the player's call, read
 *  riff       { riff }: the partner's answer to it (strokes with times)
 *  takeover   the partner takes the initiative (a call follows)
 */
export class CallSession extends PracticeSession {
  constructor(opts = {}) {
    super({ ...opts, mode: 'call' });
    this.phase = 'wait'; // 'call' | 'answer' | 'replay' | 'lead' | 'riff' | 'wait'
    this.replay = null;
    this.lead = null; // the player's last call, read
    this.riff = null; // the partner's answer to it
    this.leadUntil = Infinity; // past this with no stroke, the partner takes over
    this.inTime = false;
  }

  /** The tempo in the air: the riff's while the player leads, else the call's. */
  get prior() {
    const p = this.phase === 'lead' || this.phase === 'riff' ? this.riff : this.call;
    return p ? p.u : null;
  }

  /** The partner's row: the call being made, or the riff answering the player. */
  get partner() {
    return this.phase === 'lead' || this.phase === 'riff' ? this.riff : this.call;
  }

  /** The window around the beat after a rhythm in which a reply is on time. */
  onTime(first, end, u) {
    return Math.abs(first - end) <= 0.45 * u;
  }

  startCall(start, again = false) {
    const ev = super.startCall(start, again);
    this.phase = 'call';
    this.leadUntil = Infinity;
    return ev;
  }

  stroke(drum, t) {
    const events = [];
    if (this.phase === 'replay') {
      // Leading may start right as the playback ends; strokes before that only sound.
      if (!(this.inTime && t >= this.replay.end - 0.45 * this.replay.u)) return events;
      this.phase = 'lead';
    }
    if (this.phase === 'riff' && t < this.riff.end - 0.45 * this.riff.u) {
      // Leading again over the partner's riff: it falls silent.
      events.push({ type: 'cutCall', t });
      this.riff.end = t;
      this.phase = 'lead';
    }
    if (this.phase === 'riff') this.phase = 'lead';
    if (this.phase === 'call' && t < this.call.end - 0.45 * this.call.u) {
      events.push({ type: 'cutCall', t });
      this.call.end = t;
    }
    if (this.phase === 'call' || this.phase === 'wait') this.phase = 'answer';
    if (this.phrase.length && t >= this.phraseEnd()) events.push(...this.complete(t));
    if (!this.phrase.length) {
      events.push({ type: 'phraseStart', t });
      this.nextCallAt = Infinity;
      this.waitUntil = Infinity;
      this.leadUntil = Infinity;
    }
    // A lone stroke long before this one was a stray: start the rhythm here.
    if (this.phrase.length === 1 && t - this.phrase[0].t > 1.6) this.phrase = [];
    this.phrase.push({ drum, t });
    return events;
  }

  /** An answer is drummed at about its call's speed: read it within 35% of it. */
  readOptions() {
    if (this.phase === 'answer' && this.call) return { prior: this.call.u, uMin: this.call.u / 1.35, uMax: this.call.u * 1.35 };
    return { prior: this.prior };
  }

  complete(t) {
    const rhythm = this.lockIn();
    this.phrase = [];
    if (!rhythm) {
      if (this.phase === 'answer' && this.call) this.waitUntil = t + 0.6 + 4 * this.call.u;
      return [{ type: 'abandon', t }];
    }
    const r = rhythm;
    const strokes = rhythm.strokes;
    const first = rhythm.first;
    this.loops += 1;
    const next = first + this.beats * r.u; // the beat after it
    if (this.phase === 'lead') {
      // The player led: the partner riffs on it from the next beat, at the player's tempo.
      this.lead = rhythm;
      this.u = Math.min(0.85, Math.max(0.42, r.u));
      const p = riffOn(rhythm.text, this.rnd);
      const start = Math.max(next, t + 0.03);
      this.riff = { strokes: p.strokes.map((s) => ({ ...s, t: start + s.pos * r.u })), text: p.text, beats: p.beats, u: r.u, start, end: start + p.beats * r.u };
      this.phase = 'riff';
      // Wait a moment after the riff for the player to lead again, then take over.
      this.leadUntil = this.riff.end + 2 * r.u;
      return [{ type: 'led', lead: rhythm }, { type: 'riff', riff: this.riff }];
    }
    // The player answered the partner's call.
    const call = this.call;
    this.inTime = this.onTime(first, call.end, call.u);
    this.answer = { ...rhythm, at: t };
    const u = call.u;
    const start = this.inTime ? Math.max(next, t + 0.03) : t + 0.6;
    const at = (s, base) => ({ drum: s.drum, pos: s.pos, t: base + s.pos * u });
    this.replay = {
      start,
      u,
      end: start + 2 * this.beats * u,
      parts: [
        { who: 'partner', strokes: call.strokes.map((s) => at(s, start)) },
        { who: 'you', strokes: strokes.map((s) => at(s, start + this.beats * u)) },
      ],
    };
    this.phase = 'replay';
    if (!this.inTime) this.u = Math.min(0.85, Math.max(0.42, r.u));
    return [{ type: 'answered', answer: this.answer, inTime: this.inTime }, { type: 'replay', replay: this.replay }];
  }

  update(t) {
    const events = [];
    if (this.phrase.length >= 2 && t >= this.phraseEnd()) events.push(...this.complete(t));
    else if (this.phrase.length === 1 && t - this.phrase[0].t > 2.5) {
      this.phrase = [];
      events.push({ type: 'abandon', t });
      if (this.phase === 'answer' && this.call) this.waitUntil = t + 0.6;
    }
    if (this.phrase.length) return events;
    if (this.phase === 'wait' && t >= this.nextCallAt) events.push(...this.startCall(t + 0.1));
    if (this.phase === 'call' && t >= this.call.end) {
      this.phase = 'answer';
      this.waitUntil = this.call.end + Math.max(5, 8 * this.call.u);
    }
    if (this.phase === 'answer' && t >= this.waitUntil) events.push(...this.startCall(t + 0.1, true));
    if (this.phase === 'replay' && t >= this.replay.end) {
      if (this.inTime) {
        // On the beat: the player's turn to lead, and a few beats to begin.
        this.phase = 'lead';
        this.leadUntil = this.replay.end + Math.max(3, 4 * this.replay.u);
        events.push({ type: 'yourTurn', at: this.replay.end });
      } else {
        events.push({ type: 'takeover', t }, ...this.startCall(this.replay.end + this.u));
      }
    }
    if (this.phase === 'riff' && t >= this.riff.end) this.phase = 'lead';
    if (this.phase === 'lead' && t >= this.leadUntil) {
      // The player waited: the partner takes the initiative, on the beat.
      const u = this.riff ? this.riff.u : this.u;
      events.push({ type: 'takeover', t }, ...this.startCall(t + 0.05 + u * 0.5));
    }
    return events;
  }

  setBeats(n, t) {
    const events = super.setBeats(n, t);
    if (events.length) {
      this.phase = 'wait';
      this.replay = null;
      this.riff = null;
      this.leadUntil = Infinity;
    }
    return events;
  }

  clear(t) {
    this.phrase = [];
    return [{ type: 'clear', t, stopped: false }];
  }
}
