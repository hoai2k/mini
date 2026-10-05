// Drum Practice: free play with no right or wrong. Pure logic (times in
// seconds), so it runs under node --test; main.js wires it to the sound and
// the screen.
//
//  free  The player drums a rhythm of `dots` strokes (2 to 12, set with LB
//        and RB). It is read as beats of one, two or three strokes at the
//        player's own tempo (transcribe), shown, and repeated by the drum
//        crew until the player drums a new one: the old loop quiets while the
//        new rhythm is played and the new one takes over when it is complete.
//  call  A partner drummer plays a rhythm with the same number of strokes;
//        the player answers with anything of that length, and the partner
//        comes straight back on the next beat with a new call.

import { TEMPO } from './rhythm.js';

export const DOTS = { min: 2, max: 12 };

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

// Transcription costs, in squared log2 units of timing error: a little extra
// for every pair, triplet and rest, so plain beats win a tie.
const COST = { pair: 0.02, triplet: 0.045, rest: 0.08, sub: 0.3 };
const U_MIN = TEMPO.min * 0.9;
const U_MAX = TEMPO.max * 1.05;

/**
 * Read free strokes ([{ drum, t }], in order) as a rhythm: beats of one, two
 * or three strokes, at most one silent beat between two beats, at a steady
 * tempo. Returns { u, beats, strokes: [{ drum, pos }], text, cost }, with
 * pos in beats from the first stroke; text is "L RR L" with "-" for a rest.
 */
export function transcribe(strokes) {
  const n = strokes.length;
  if (!n) return null;
  if (n === 1) return finish(strokes, [{ start: 0, size: 1, gap: 0 }], 0.6, 0);
  let best = null;
  // Try every tempo on a fine grid; for each, the best grouping by dynamic
  // programming. Then refine the tempo for that grouping.
  for (let u = U_MIN; u <= U_MAX; u *= 1.02) {
    const groups = group(strokes, u);
    if (!groups) continue;
    const fit = refine(strokes, groups.groups);
    if (!best || fit.cost < best.cost) best = { ...fit, groups: groups.groups };
  }
  if (!best) return null;
  return finish(strokes, best.groups, best.u, best.cost);
}

/** Best grouping at tempo u: dp over strokes; each group has a size and a gap (1 or 2 beats) before it. */
function group(strokes, u) {
  const n = strokes.length;
  // dp[i]: the best cost with strokes 0..i-1 grouped; back[i]: the last of those groups.
  const dp = new Array(n + 1).fill(Infinity);
  const back = new Array(n + 1).fill(null);
  dp[0] = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i] === Infinity) continue;
    for (const size of [1, 2, 3]) {
      const j = i + size;
      if (j > n) break;
      const gaps = i === 0 ? [0] : [1, 2];
      for (const gap of gaps) {
        let c = dp[i] + (size === 2 ? COST.pair : size === 3 ? COST.triplet : 0) + (gap === 2 ? COST.rest : 0);
        if (i > 0) {
          // The onset gap from the previous group's onset.
          const e = Math.log2(Math.max(1e-6, strokes[i].t - strokes[back[i].start].t) / (gap * u));
          c += e * e;
        }
        // The quick strokes inside this group, against an even split of the beat.
        let ok = true;
        for (let m = 1; m < size; m++) {
          const since = strokes[i + m].t - strokes[i].t;
          if (since <= 0 || since > 0.95 * u) {
            ok = false;
            break;
          }
          const e = Math.log2(since / ((m / size) * u));
          c += COST.sub * e * e;
        }
        if (!ok) continue;
        if (c < dp[j]) {
          dp[j] = c;
          back[j] = { start: i, size, gap };
        }
      }
    }
  }
  if (dp[n] === Infinity) return null;
  const groups = [];
  for (let j = n; j > 0; j = back[j].start) groups.unshift({ start: back[j].start, size: back[j].size, gap: back[j].gap });
  return { groups, cost: dp[n] };
}

/** The tempo that best fits a grouping (geometric mean of onset gaps per beat), and its cost. */
function refine(strokes, groups) {
  let sum = 0;
  let count = 0;
  for (let k = 1; k < groups.length; k++) {
    const beats = groups[k].gap;
    sum += Math.log2((strokes[groups[k].start].t - strokes[groups[k - 1].start].t) / beats);
    count += 1;
  }
  let u;
  if (count) u = 2 ** (sum / count);
  else {
    // One beat only: its own strokes give the tempo.
    const g = groups[0];
    u = g.size > 1 ? ((strokes[g.start + g.size - 1].t - strokes[g.start].t) * g.size) / (g.size - 1) : 0.6;
  }
  u = Math.min(TEMPO.max, Math.max(TEMPO.min, u));
  let cost = 0;
  groups.forEach((g, k) => {
    cost += g.size === 2 ? COST.pair : g.size === 3 ? COST.triplet : 0;
    if (g.gap === 2) cost += COST.rest;
    if (k > 0) {
      const e = Math.log2((strokes[g.start].t - strokes[groups[k - 1].start].t) / (g.gap * u));
      cost += e * e;
    }
    for (let m = 1; m < g.size; m++) {
      const e = Math.log2(Math.max(1e-6, strokes[g.start + m].t - strokes[g.start].t) / ((m / g.size) * u));
      cost += COST.sub * e * e;
    }
  });
  return { u, cost };
}

function finish(strokes, groups, u, cost) {
  const out = [];
  const text = [];
  let beat = 0;
  groups.forEach((g, k) => {
    if (k > 0) beat += g.gap;
    if (g.gap === 2) text.push('-');
    const drums = [];
    for (let m = 0; m < g.size; m++) {
      out.push({ drum: strokes[g.start + m].drum, pos: beat + m / g.size });
      drums.push(strokes[g.start + m].drum);
    }
    text.push(drums.join(''));
  });
  return { u, beats: beat + 1, strokes: out, text: text.join(' '), cost };
}

/** Pattern text to strokes, with "-" for a silent beat. */
export function practicePattern(text) {
  const strokes = [];
  text.split(' ').forEach((beat, b) => {
    if (beat === '-') return;
    [...beat].forEach((drum, i) => strokes.push({ drum, pos: b + i / beat.length }));
  });
  return { text, strokes, beats: text.split(' ').length };
}

/**
 * A partner's call of n strokes: beats of one, two or three, never two deep
 * strokes inside one beat. rnd() returns 0..1.
 */
export function makeCall(n, rnd = Math.random) {
  // The partner's call is the one rhythm expected, so it may open with a pair or a triplet.
  const sizes = [];
  let left = n;
  while (left > 0) {
    const r = rnd();
    let size = r < 0.55 ? 1 : r < 0.85 ? 2 : 3;
    size = Math.min(size, left);
    sizes.push(size);
    left -= size;
  }
  const beats = sizes.map((size, b) => {
    let s = '';
    for (let m = 0; m < size; m++) {
      // Deep strokes open beats; the quick ones are on the rim.
      const deep = m === 0 && (b === 0 ? rnd() < 0.7 : rnd() < 0.45);
      s += deep ? 'L' : 'R';
    }
    return s;
  });
  return practicePattern(beats.join(' '));
}

/**
 * The practice session. Feed it strokes and the clock; it returns events for
 * main.js to sound and show:
 *  phraseStart  the player began a rhythm (quiet the loop / cut the call)
 *  loop         { loop }: a new rhythm to repeat from loop.start, every loop.period
 *  abandon      the player stopped part way; the old loop comes back up
 *  call         { call }: the partner plays call.strokes (absolute times)
 *  answered     { answer }: the player's answer, transcribed
 *  dots         the number of strokes changed
 */
export class PracticeSession {
  constructor({ mode = 'free', dots = 4, rnd = Math.random } = {}) {
    this.mode = mode;
    this.dots = clampDots(dots);
    this.rnd = rnd;
    this.phrase = []; // the player's strokes so far: { drum, t }
    this.loop = null; // free: { strokes, text, beats, u, start, period }
    this.call = null; // call: { strokes: [{ drum, pos, t }], text, beats, u, start, end }
    this.answer = null; // call: the last answer, transcribed
    this.u = 0.6; // the partner's tempo: follows the player's
    this.nextCallAt = mode === 'call' ? 2 : Infinity;
    this.waitUntil = Infinity; // call: when an unanswered call is played again
    this.loops = 0; // rhythms completed (free) or answers given (call)
  }

  /** The rhythm entered so far, transcribed (for the dots), or null. */
  get partial() {
    return this.phrase.length ? transcribe(this.phrase) : null;
  }

  stroke(drum, t) {
    const events = [];
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
    this.phrase.push({ drum, t });
    if (this.phrase.length < this.dots) return events;
    const r = transcribe(this.phrase);
    const first = this.phrase[0].t;
    this.phrase = [];
    this.loops += 1;
    // The next beat after the rhythm: where the loop or the partner comes in.
    let start = first + r.beats * r.u;
    while (start < t + 0.04) start += r.u;
    if (this.mode === 'free') {
      this.loop = { strokes: r.strokes, text: r.text, beats: r.beats, u: r.u, start, period: r.beats * r.u };
      events.push({ type: 'loop', loop: this.loop });
    } else {
      this.answer = { ...r, at: t };
      this.u = Math.min(0.85, Math.max(0.42, r.u));
      events.push({ type: 'answered', answer: this.answer });
      events.push(...this.startCall(start));
    }
    return events;
  }

  /** Begin a new call at time start (call mode). */
  startCall(start, again = false) {
    const p = again && this.call ? practicePattern(this.call.text) : makeCall(this.dots, this.rnd);
    const u = this.u;
    const strokes = p.strokes.map((s) => ({ ...s, t: start + s.pos * u }));
    const lastT = strokes[strokes.length - 1].t;
    this.call = { strokes, text: p.text, beats: p.beats, u, start, end: lastT + u * 0.5 };
    this.nextCallAt = Infinity;
    this.waitUntil = this.call.end + Math.max(5, 8 * u);
    return [{ type: 'call', call: this.call, again }];
  }

  update(t) {
    const events = [];
    if (this.phrase.length) {
      // Stopped part way: let it go after a pause longer than any beat so far.
      const last = this.phrase[this.phrase.length - 1].t;
      let gap = 0.5;
      for (let i = 1; i < this.phrase.length; i++) gap = Math.max(gap, this.phrase[i].t - this.phrase[i - 1].t);
      if (t - last > Math.min(3, Math.max(1.4, 2.4 * gap))) {
        this.phrase = [];
        events.push({ type: 'abandon', t });
        if (this.mode === 'call') this.nextCallAt = t + 0.6;
      }
    }
    if (this.mode === 'call' && !this.phrase.length) {
      if (t >= this.nextCallAt) events.push(...this.startCall(t + 0.1));
      else if (t >= this.waitUntil) events.push(...this.startCall(t + 0.1, true));
    }
    return events;
  }

  /** LB and RB: fewer or more strokes. The rhythm being entered starts over. */
  setDots(n, t) {
    const d = clampDots(n);
    if (d === this.dots) return [];
    this.dots = d;
    this.phrase = [];
    const events = [{ type: 'dots', dots: d }];
    if (this.mode === 'call') {
      // The partner starts again with the new length.
      if (this.call && this.call.end > t) this.call.end = t;
      events.push({ type: 'cutCall', t });
      this.nextCallAt = t + 0.7;
      this.waitUntil = Infinity;
    }
    return events;
  }

  /** A: clear the dots, and in free play stop the loop. */
  clear(t) {
    this.phrase = [];
    const had = !!this.loop;
    if (this.mode === 'free') this.loop = null;
    return [{ type: 'clear', t, stopped: had }];
  }
}

function clampDots(n) {
  return Math.max(DOTS.min, Math.min(DOTS.max, Math.round(n)));
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
