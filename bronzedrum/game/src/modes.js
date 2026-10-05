// Chapter modes besides battle. Pure logic (times in seconds), so it runs
// under node --test; main.js wires it to the reader, the sound and the screen.
//
//  echo     A caller drums a rhythm and the player answers it. Each answer
//           must be even; if matchTempo is set it must also be near the
//           caller's speed. Used by The Oath, The Villages Answer, The
//           Coronation and The Drums Are Melted.
//  casting  The player repeats one rhythm at the furnace's pace (a guide
//           rhythm plays it): each phrase within `tolerance` of that pace pours
//           bronze, and a phrase that rushes or drags cracks the mould and
//           starts that drum again. Casting the Drums.
//  battle   (battle.js) — with `survive`, hold out while waves arrive.

import { parsePattern } from './rhythm.js';

/** A pattern object the reader understands, from "L RR L R" text. */
export function callPattern(text, command = 'call') {
  const strokes = parsePattern(text);
  return { command, tier: 1, text, strokes, drums: strokes.map((s) => s.drum).join('') };
}

export class EchoSession {
  /**
   * calls: [{ text, bpm, label? }]. matchTempo: answers must be within
   * `tolerance` of the call's beat length. The next call comes a beat and a
   * half (of the call just answered) plus `pause` seconds after the answer:
   * long enough to see the answer land, short enough to keep the exchange
   * going.
   */
  constructor({ calls, matchTempo = false, tolerance = 0.3, pause = 0.4 }) {
    this.calls = calls;
    this.matchTempo = matchTempo;
    this.tolerance = tolerance;
    this.pause = pause;
    this.index = 0;
    this.phase = 'waiting'; // 'calling' | 'answer' | 'waiting' | 'done'
    this.nextCallAt = 0;
    this.call = null; // { text, u, start, end, pattern, strokes: [{ drum, t }] }
    this.answered = []; // { accuracy, u }
    this.misses = 0;
  }

  get done() {
    return this.phase === 'done';
  }

  /** The rhythm the player must answer now, for the reader. */
  get pattern() {
    return this.call ? this.call.pattern : null;
  }

  /** Advance the clock: start calls, open the answer, repeat an unanswered call. */
  update(t) {
    const events = [];
    if (this.phase === 'waiting' && t >= this.nextCallAt && this.index < this.calls.length) {
      const c = this.calls[this.index];
      const u = 60 / c.bpm;
      const pattern = callPattern(c.text);
      const strokes = pattern.strokes.map((s) => ({ drum: s.drum, t: t + s.pos * u }));
      this.call = { ...c, u, start: t, end: t + 4 * u, pattern, strokes };
      this.phase = 'calling';
      events.push({ type: 'call', call: this.call, index: this.index });
    }
    if (this.phase === 'calling' && t >= this.call.end) {
      this.phase = 'answer';
      this.answerBy = t + Math.max(6, 10 * this.call.u);
      events.push({ type: 'yourTurn', call: this.call });
    }
    if (this.phase === 'answer' && t > this.answerBy) {
      // No answer: the caller plays it again.
      this.phase = 'waiting';
      this.nextCallAt = t + 0.3;
      events.push({ type: 'repeat', call: this.call });
    }
    return events;
  }

  /**
   * The reader accepted the player's rhythm (it can only be this call's
   * pattern). The player may answer as soon as they know the rhythm, during
   * the call as well as after it; an early answer cuts the call short
   * (`early` on the event).
   */
  answer(ev, t) {
    if (this.phase !== 'answer' && this.phase !== 'calling') return [];
    const early = this.phase === 'calling';
    const ratio = ev.u / this.call.u;
    if (this.matchTempo && Math.abs(Math.log(ratio)) > Math.log(1 + this.tolerance)) {
      this.misses += 1;
      return [{ type: 'offTempo', faster: ratio < 1, call: this.call }];
    }
    this.answered.push({ accuracy: ev.accuracy, u: ev.u });
    this.index += 1;
    const events = [{ type: 'answered', index: this.index - 1, accuracy: ev.accuracy, call: this.call, early }];
    if (this.index >= this.calls.length) {
      this.phase = 'done';
      events.push({ type: 'complete', evenness: this.evenness() });
    } else {
      this.phase = 'waiting';
      this.nextCallAt = t + 1.5 * this.call.u + this.pause;
    }
    return events;
  }

  /** Average evenness of the answers, 0..1. */
  evenness() {
    if (!this.answered.length) return 0;
    return this.answered.reduce((s, a) => s + a.accuracy, 0) / this.answered.length;
  }
}

export class CastingSession {
  /**
   * drums: how many to cast; pours: steady phrases per drum; tolerance:
   * tempo drift allowed; u: the pace to hold (seconds per beat). Without u,
   * the first phrase sets the pace and a crack resets it.
   */
  constructor({ drums = 3, pours = 3, tolerance = 0.12, u = null } = {}) {
    this.drums = drums;
    this.pours = pours;
    this.tolerance = tolerance;
    this.fixed = u !== null;
    this.cast = 0; // finished drums
    this.level = 0; // pours into the current mould
    this.u = u; // the pace to hold
    this.cracks = 0;
  }

  get done() {
    return this.cast >= this.drums;
  }

  /** A phrase was accepted at beat length u with this accuracy. */
  pour(ev) {
    if (this.done) return [];
    if (this.u === null) this.u = ev.u;
    const drift = Math.abs(Math.log(ev.u / this.u));
    if (drift > Math.log(1 + this.tolerance)) {
      this.cracks += 1;
      const lost = this.level;
      const faster = ev.u < this.u;
      this.level = 0;
      if (!this.fixed) this.u = ev.u; // the new tempo is the one to hold from here
      return [{ type: 'crack', drum: this.cast, lost, faster }];
    }
    this.level += 1;
    const events = [{ type: 'pour', drum: this.cast, level: this.level, of: this.pours }];
    if (this.level >= this.pours) {
      this.cast += 1;
      this.level = 0;
      events.push({ type: 'cast', drum: this.cast - 1 });
      if (this.done) events.push({ type: 'complete', cracks: this.cracks });
    }
    return events;
  }
}

/** Waves for a hold-the-line chapter: those due by time t that have not come yet. */
export function dueWaves(waves, t, spawned) {
  const out = [];
  waves.forEach((w, i) => {
    if (!spawned.has(i) && t >= w.at) {
      spawned.add(i);
      out.push(w);
    }
  });
  return out;
}
