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

// Transcription costs, in squared log2 units of timing error: a little extra
// for every pair, triplet and rest, so plain beats win a tie.
// A deep stroke (L) inside a pair or triplet costs extra too: deep strokes
// open beats, so an even stream L R R L R R reads as triplets, not pairs.
const COST = { pair: 0.02, triplet: 0.045, rest: 0.15, sub: 0.3, deepInside: 0.06, prior: 0.2 };
const U_MIN = TEMPO.min * 0.9;
const U_MAX = TEMPO.max * 1.05;

/**
 * Read free strokes ([{ drum, t }], in order) as a rhythm: beats of one, two
 * or three strokes, at most one silent beat between two beats, at a steady
 * tempo. Returns { u, beats, strokes: [{ drum, pos }], text, cost }, with
 * pos in beats from the first stroke; text is "L RR L" with "-" for a rest.
 */
export function transcribe(strokes, { open = false, prior = null } = {}) {
  const n = strokes.length;
  if (!n) return null;
  if (n === 1) return finish(strokes, [{ start: 0, size: 1, gap: 0, div: 1 }], 0.6, 0);
  let best = null;
  // Try every tempo on a fine grid; for each, the best grouping by dynamic
  // programming. Then refine the tempo for that grouping. With `open` (a
  // rhythm still being drummed) the last group may be the start of a bigger
  // one: two strokes so far of a triplet are judged as a triplet's.
  for (let u = U_MIN; u <= U_MAX; u *= 1.02) {
    const groups = group(strokes, u, open);
    if (!groups) continue;
    const fit = refine(strokes, groups.groups);
    // A tempo already playing (the loop, the partner) is the likelier one:
    // L R at a slow tempo and L R R at twice the speed are otherwise the same.
    if (prior) fit.cost += COST.prior * Math.log2(fit.u / prior) ** 2;
    if (!best || fit.cost < best.cost) best = { ...fit, groups: groups.groups };
  }
  if (!best) return null;
  return finish(strokes, best.groups, best.u, best.cost);
}

/** Best grouping at tempo u: dp over strokes; each group has a size and a gap (1 or 2 beats) before it. */
function group(strokes, u, open = false) {
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
      // How the beat is divided: as many slots as strokes, or, for an open
      // last group, more slots still to be filled.
      const divs = open && j === n ? [1, 2, 3].filter((d) => d >= size) : [size];
      for (const gap of gaps) for (const div of divs) {
        let c = dp[i] + (div === 2 ? COST.pair : div === 3 ? COST.triplet : 0) + (gap === 2 ? COST.rest : 0);
        for (let m = 1; m < size; m++) if (strokes[i + m].drum === 'L') c += COST.deepInside;
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
          const e = Math.log2(since / ((m / div) * u));
          c += COST.sub * e * e;
        }
        if (!ok) continue;
        if (c < dp[j]) {
          dp[j] = c;
          back[j] = { start: i, size, gap, div };
        }
      }
    }
  }
  if (dp[n] === Infinity) return null;
  const groups = [];
  for (let j = n; j > 0; j = back[j].start) groups.unshift({ start: back[j].start, size: back[j].size, gap: back[j].gap, div: back[j].div });
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
    u = g.size > 1 ? ((strokes[g.start + g.size - 1].t - strokes[g.start].t) * g.div) / (g.size - 1) : 0.6;
  }
  u = Math.min(TEMPO.max, Math.max(TEMPO.min, u));
  let cost = 0;
  groups.forEach((g, k) => {
    cost += g.div === 2 ? COST.pair : g.div === 3 ? COST.triplet : 0;
    for (let m = 1; m < g.size; m++) if (strokes[g.start + m].drum === 'L') cost += COST.deepInside;
    if (g.gap === 2) cost += COST.rest;
    if (k > 0) {
      const e = Math.log2((strokes[g.start].t - strokes[groups[k - 1].start].t) / (g.gap * u));
      cost += e * e;
    }
    for (let m = 1; m < g.size; m++) {
      const e = Math.log2(Math.max(1e-6, strokes[g.start + m].t - strokes[g.start].t) / ((m / g.div) * u));
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
    const div = g.div || g.size;
    for (let m = 0; m < g.size; m++) {
      out.push({ drum: strokes[g.start + m].drum, pos: beat + m / div, div });
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
    this.call = null; // call: { strokes: [{ drum, pos, t }], text, beats, u, start, end }
    this.answer = null; // call: the last answer, transcribed
    this.u = 0.6; // the partner's tempo: follows the player's
    this.nextCallAt = mode === 'call' ? 2 : Infinity;
    this.waitUntil = Infinity; // call: when an unanswered call is played again
    this.loops = 0; // rhythms completed (free) or answers given (call)
  }

  /** The rhythm drummed so far, read (for the dots), or null. */
  get partial() {
    return this.phrase.length ? transcribe(this.phrase, { open: true, prior: this.prior }) : null;
  }

  /** The tempo already in the air: the loop's, or the partner's. */
  get prior() {
    if (this.mode === 'free') return this.loop ? this.loop.u : null;
    return this.call ? this.call.u : null;
  }

  /**
   * When the rhythm being drummed is complete: just before the beat after its
   * last, at the tempo its strokes have set (a closing pair or triplet still
   * fits in). Unknown until two strokes have set a tempo.
   */
  phraseEnd() {
    if (this.phrase.length < 2) return Infinity;
    const r = transcribe(this.phrase, { open: true, prior: this.prior });
    if (!r) return Infinity;
    return this.phrase[0].t + (this.beats - 0.12) * r.u;
  }

  stroke(drum, t) {
    const events = [];
    // A stroke past the end of the rhythm completes it and starts the next.
    if (this.phrase.length && t >= this.phraseEnd()) events.push(...this.complete(t));
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
    return events;
  }

  /** The rhythm is complete: read it, hold it to its beats, loop it or answer with it. */
  complete(t) {
    const r = transcribe(this.phrase, { prior: this.prior });
    const first = this.phrase[0].t;
    this.phrase = [];
    if (!r) return [{ type: 'abandon', t }];
    const strokes = r.strokes.filter((s) => s.pos < this.beats);
    const beatsText = r.text.split(' ').slice(0, this.beats);
    while (beatsText.length < this.beats) beatsText.push('-'); // the beats left silent
    const rhythm = { strokes, text: beatsText.join(' '), beats: this.beats, u: r.u };
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

  /** A: clear the dots, and in free play stop the loop. */
  clear(t) {
    this.phrase = [];
    const had = !!this.loop;
    if (this.mode === 'free') this.loop = null;
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
    this.phrase.push({ drum, t });
    return events;
  }

  complete(t) {
    const r = transcribe(this.phrase, { prior: this.prior });
    const first = this.phrase[0].t;
    this.phrase = [];
    if (!r) return [{ type: 'abandon', t }];
    const strokes = r.strokes.filter((s) => s.pos < this.beats);
    const beatsText = r.text.split(' ').slice(0, this.beats);
    while (beatsText.length < this.beats) beatsText.push('-');
    const rhythm = { strokes, text: beatsText.join(' '), beats: this.beats, u: r.u, first };
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
