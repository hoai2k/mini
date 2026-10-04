// Drum reading: turns timed hits on the two drums into commands.
//
// Trưng Trắc plays the deep centre of the drum ("tùng", L); Trưng Nhị plays
// the rim ("cắc", R). A command is four hits on four consecutive beats. The
// army answers during the next four beats (the response measure); in that
// measure Trắc rests and Nhị may add rim flourishes on the off-beats. Any other
// hit during the response breaks the rhythm. Chaining a new command on the
// first beat after a response keeps the combo; four in a row wakes the drum.
//
// Everything here is pure: times are seconds on the song clock, so the module
// runs unchanged under node --test.

export const TUNG = 'L';
export const CAC = 'R';

export const WINDOWS = { perfect: 0.07, good: 0.14 };
export const SPIRIT_COMBO = 4;
export const MAX_FLOURISHES = 4;

export const COMMANDS = [
  { id: 'march', name: 'Tiến', gloss: 'March', pattern: 'LLLR' },
  { id: 'strike', name: 'Đánh', gloss: 'Strike', pattern: 'RRLR' },
  { id: 'shield', name: 'Thủ', gloss: 'Shields', pattern: 'RLRL' },
  { id: 'rally', name: 'Hô', gloss: 'Rally', pattern: 'RLLL' },
  { id: 'charge', name: 'Voi', gloss: 'Elephant charge', pattern: 'LLRR' },
];

export function commandById(id) {
  return COMMANDS.find((c) => c.id === id);
}

/** Snap a time to the nearest beat and grade the error. */
export function judge(time, beatDur, windows = WINDOWS) {
  const beat = Math.round(time / beatDur);
  const error = time - beat * beatDur;
  const abs = Math.abs(error);
  const grade = abs <= windows.perfect ? 'perfect' : abs <= windows.good ? 'good' : 'miss';
  return { beat, error, grade };
}

/** Snap to the nearest half beat; `offbeat` is true on the "and" counts. */
export function judgeHalf(time, beatDur, windows = WINDOWS) {
  const half = Math.round(time / (beatDur / 2));
  const error = time - half * (beatDur / 2);
  return { half, offbeat: half % 2 !== 0, error, ok: Math.abs(error) <= windows.good };
}

export class DrumReader {
  constructor({ beatDur, unlocked = COMMANDS.map((c) => c.id), windows = WINDOWS }) {
    this.beatDur = beatDur;
    this.windows = windows;
    this.unlocked = new Set(unlocked);
    this.phrase = [];
    this.combo = 0;
    this.response = null; // { startBeat, endBeat } — endBeat exclusive
    this.lastResponseEnd = null;
    this.flourishes = 0;
  }

  get spirit() {
    return this.combo >= SPIRIT_COMBO;
  }

  /** True while `time` falls inside the army's response measure. */
  inResponse(time) {
    if (!this.response) return false;
    const g = this.windows.good;
    return time >= this.response.startBeat * this.beatDur - g && time < this.response.endBeat * this.beatDur - g;
  }

  /** Register a hit; returns the events it caused. */
  hit(drum, time) {
    const events = [];
    if (this.inResponse(time)) {
      const h = judgeHalf(time, this.beatDur, this.windows);
      if (drum === CAC && h.offbeat && h.ok && this.flourishes < MAX_FLOURISHES) {
        this.flourishes += 1;
        events.push({ type: 'flourish', count: this.flourishes, time });
      } else {
        events.push({ type: 'stumble', drum, time });
        this.loseCombo(events);
      }
      return events;
    }

    const j = judge(time, this.beatDur, this.windows);
    events.push({ type: 'hit', drum, time, ...j });
    if (j.grade === 'miss') {
      this.phrase = [];
      this.loseCombo(events);
      return events;
    }

    const last = this.phrase[this.phrase.length - 1];
    if (last && j.beat === last.beat + 1) this.phrase.push({ drum, ...j });
    else this.phrase = [{ drum, ...j }];

    if (this.phrase.length >= 4) {
      const four = this.phrase.slice(-4);
      const pattern = four.map((h) => h.drum).join('');
      const command = COMMANDS.find((c) => c.pattern === pattern && this.unlocked.has(c.id));
      if (command) {
        const startBeat = four[0].beat;
        const accuracy = four.reduce((sum, h) => sum + (h.grade === 'perfect' ? 1 : 0.6), 0) / 4;
        const chained = this.lastResponseEnd !== null && startBeat === this.lastResponseEnd;
        this.combo = chained ? this.combo + 1 : 1;
        this.response = { startBeat: j.beat + 1, endBeat: j.beat + 5 };
        this.lastResponseEnd = this.response.endBeat;
        this.flourishes = 0;
        this.phrase = [];
        events.push({
          type: 'command',
          command: command.id,
          startBeat,
          responseStart: this.response.startBeat,
          accuracy,
          combo: this.combo,
          spirit: this.spirit,
        });
      } else {
        this.phrase = this.phrase.slice(-3);
      }
    }
    return events;
  }

  /** Advance the clock: ends responses and drops a combo that was not chained. */
  update(time) {
    const events = [];
    if (this.response && time >= this.response.endBeat * this.beatDur - this.windows.good) {
      events.push({ type: 'responseEnd', endBeat: this.response.endBeat, flourishes: this.flourishes });
      this.response = null;
    }
    if (this.combo > 0 && !this.response && this.lastResponseEnd !== null) {
      const deadline = this.lastResponseEnd * this.beatDur + this.windows.good;
      const startedChain = this.phrase.length > 0 && this.phrase[0].beat === this.lastResponseEnd;
      if (time > deadline && !startedChain) this.loseCombo(events);
    }
    return events;
  }

  loseCombo(events) {
    if (this.combo > 0) events.push({ type: 'comboLost', combo: this.combo });
    this.combo = 0;
  }
}
