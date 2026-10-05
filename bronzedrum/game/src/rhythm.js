// Drum reading: turns timed strokes on the two drums into commands.
//
// Trưng Trắc plays the deep centre of the drum ("tùng", L); Trưng Nhị plays
// the rim ("cắc", R). A command is a four-beat pattern. There is no fixed
// metronome: the player sets the tempo, and what is judged is how *even* the
// strokes are — every gap has to match the pattern's rhythm at the player's
// own speed. A beat can hold one stroke, a pair (two strokes) or a triplet
// (three); each command has three tiers, and the more intricate tiers are
// stronger.
//
// When a command is accepted the army answers for four beats at the player's
// tempo (the action cycle). Strokes during the answer do not start a phrase;
// rim strokes placed between the answer's beats are Nhị's flourishes. When the
// answer ends the drum is ready again, and starting the next phrase within two
// beats keeps the chain; four in a row wakes the drum.
//
// Everything here is pure (times in seconds), so it runs under node --test.

export const TUNG = 'L';
export const CAC = 'R';

/** Evenness windows, as |log2(actual gap / expected gap)|. */
export const WINDOWS = {
  perfect: 0.2, // about ±15%
  good: 0.45, // about ±37%
};
/** Seconds per beat the player may drum at: about 200 down to 45 BPM. */
export const TEMPO = { min: 0.3, max: 1.33 };
export const SPIRIT_COMBO = 4;
export const MAX_FLOURISHES = 4;
// Each tier is 1.4× the one below, and precision (see PRECISION) spans just
// under that ratio: the sloppiest playing of a tier still edges out a perfect
// playing of the tier below, and everything between is down to evenness.
export const TIER_POWER = [1, 1.4, 1.96];
export const PRECISION = { min: 0.72, max: 1 };
const EARLY_GRACE = 0.25; // beats before "ready" that already start a phrase
const CHAIN_WINDOW = 2; // beats after "ready" to keep the chain

// Beats are separated by spaces; strokes in one beat share it evenly. The deep
// centre stroke (L) needs room to ring, so two of them are always at least a
// beat apart: quick pairs and triplets are played on the rim (R), at most
// opening with a single deep stroke. The first stroke says what kind of order
// it is: movement starts on the deep centre (L), attacks on the rim (R).
// Every rhythm opens with a single stroke on its first beat: the first two
// beats set the tempo, and only then can a pair or a triplet be told apart
// from plain beats. Pairs and triplets come after the first beat.
// There are two families: march and strike. With the war elephant (chapter
// 3), a strike played while the drum is awake becomes the elephant charge.
export const COMMANDS = [
  { id: 'march', name: 'Tiến', gloss: 'March', kind: 'move', tiers: ['L L L R', 'L L LR R', 'L RRR L R'] },
  { id: 'strike', name: 'Đánh', gloss: 'Strike', kind: 'attack', tiers: ['R R L R', 'R RR L R', 'R RRR L R'] },
];

/** Expand "L LL R ..." into strokes with positions in beats. */
export function parsePattern(text) {
  const strokes = [];
  text.split(' ').forEach((beat, b) => {
    [...beat].forEach((drum, i) => strokes.push({ drum, pos: b + i / beat.length }));
  });
  return strokes;
}

/** Every playable pattern: one per command and tier. */
export function allPatterns(unlocked = COMMANDS.map((c) => c.id), maxTier = 3) {
  const out = [];
  for (const c of COMMANDS) {
    if (!unlocked.includes(c.id)) continue;
    c.tiers.slice(0, maxTier).forEach((text, i) => {
      const strokes = parsePattern(text);
      out.push({ command: c.id, tier: i + 1, text, strokes, drums: strokes.map((s) => s.drum).join('') });
    });
  }
  return out;
}

export function commandById(id) {
  return COMMANDS.find((c) => c.id === id);
}

/** Error of one gap: |log2(actual / expected)|. */
function gapError(actual, expected) {
  return Math.abs(Math.log2(Math.max(1e-6, actual) / expected));
}

/** How much a pair's or triplet's own spacing counts towards precision. */
const SUB_WEIGHT = 0.3;

/**
 * How well the strokes so far fit the start of a pattern, at whatever tempo
 * they imply. Returns null when they cannot be this pattern.
 *
 * What must be even is the beat: the first stroke of each beat (its onset).
 * The tempo comes from the onsets, and every gap between onsets is judged
 * against it. The quick strokes of a pair or triplet only have to fall inside
 * their own beat, in order: people play them as a flurry and land the next
 * beat on time, so their spacing nudges precision but never breaks a phrase.
 */
export function fit(pattern, strokes, windows = WINDOWS) {
  const k = strokes.length;
  if (k > pattern.strokes.length) return null;
  for (let i = 0; i < k; i++) if (strokes[i].drum !== pattern.strokes[i].drum) return null;
  const p = pattern.strokes;
  const onsets = [];
  for (let i = 0; i < k; i++) if (Number.isInteger(p[i].pos)) onsets.push(i);
  const first = onsets[0];
  const last = onsets[onsets.length - 1];
  let u = null;
  if (onsets.length >= 2) {
    u = (strokes[last].t - strokes[first].t) / (p[last].pos - p[first].pos);
    if (u < TEMPO.min * 0.85 || u > TEMPO.max * 1.15) return null;
  }
  let maxErr = 0;
  let sum = 0;
  let n = 0;
  for (let j = 1; j < onsets.length; j++) {
    const a = onsets[j - 1];
    const b = onsets[j];
    const e = gapError(strokes[b].t - strokes[a].t, u * (p[b].pos - p[a].pos));
    maxErr = Math.max(maxErr, e);
    sum += e;
    n += 1;
  }
  if (maxErr > windows.good) return null;
  // The quick strokes inside a beat.
  for (let i = 0; i < k; i++) {
    if (Number.isInteger(p[i].pos)) continue;
    const beat = Math.floor(p[i].pos);
    const on = onsets.find((o) => p[o].pos === beat);
    const next = onsets.find((o) => p[o].pos === beat + 1);
    const since = strokes[i].t - strokes[on].t;
    let span;
    if (next !== undefined) span = strokes[next].t - strokes[on].t;
    else if (u !== null) span = u;
    else {
      // No tempo yet (still inside the first beat): just keep it plausible.
      if (since > TEMPO.max * 1.15) return null;
      continue;
    }
    const f = since / span;
    // Before the next beat has come, a stroke this late is that beat, not a quick one.
    if (f <= 0 || f > (next !== undefined ? 1 : 0.85)) return null;
    sum += Math.min(windows.good, SUB_WEIGHT * gapError(f, p[i].pos - beat));
    n += 1;
  }
  return { u, maxErr, meanErr: n ? sum / n : 0, complete: k === p.length };
}

/** Accuracy from 1 (every gap even) down to 0 (every gap at the edge of the window). */
export function accuracyOf(meanErr, windows = WINDOWS) {
  if (meanErr <= windows.perfect) return 1;
  return Math.max(0, 1 - (meanErr - windows.perfect) / (windows.good - windows.perfect));
}

/** The power multiplier precision gives: ×0.72 at the edge, ×1 when even. */
export function precisionFactor(accuracy) {
  return PRECISION.min + (PRECISION.max - PRECISION.min) * accuracy;
}

export class DrumReader {
  constructor({ unlocked = COMMANDS.map((c) => c.id), maxTier = 3, windows = WINDOWS } = {}) {
    this.windows = windows;
    this.patterns = allPatterns(unlocked, maxTier);
    this.phrase = []; // { drum, t }
    this.pending = null; // a complete match waiting to see whether a longer pattern follows
    this.action = null; // { command, tier, pattern, u, start, ready }
    this.shown = null; // the accepted pattern, kept on screen until ready
    this.combo = 0;
    this.chainUntil = null; // the next phrase must start before this to chain
    this.chainArmed = false;
    this.flourishes = 0;
  }

  get spirit() {
    return this.combo >= SPIRIT_COMBO;
  }

  /** The drum is busy with the army's answer at time t. */
  busy(t) {
    return !!this.action && t < this.action.ready - EARLY_GRACE * this.action.u;
  }

  /** Candidate patterns that the current phrase still fits. */
  candidates() {
    const out = [];
    for (const p of this.patterns) {
      const f = fit(p, this.phrase, this.windows);
      if (f) out.push({ pattern: p, ...f });
    }
    return out;
  }

  /** Latest time the next stroke may come for any open candidate. */
  deadline(cands = this.candidates()) {
    let latest = -Infinity;
    for (const c of cands) {
      if (c.complete) continue;
      // Measured from the latest beat onset, not from a quick stroke inside
      // a beat: a triplet played as a flurry leaves time to land the next beat.
      const p = c.pattern.strokes;
      const k = this.phrase.length;
      let on = k - 1;
      while (on > 0 && !Number.isInteger(p[on].pos)) on -= 1;
      const u = c.u ?? TEMPO.max;
      latest = Math.max(latest, this.phrase[on].t + u * (p[k].pos - p[on].pos) * 2 ** this.windows.good);
    }
    return latest;
  }

  hit(drum, t) {
    const events = [];
    if (this.busy(t)) {
      // Nhị's flourish: a rim stroke between two of the answer's beats.
      const a = this.action;
      const phase = (((t - a.start) / a.u) % 1 + 1) % 1;
      if (drum === CAC && t >= a.start - 0.25 * a.u && Math.abs(phase - 0.5) <= 0.22 && this.flourishes < MAX_FLOURISHES) {
        this.flourishes += 1;
        events.push({ type: 'flourish', count: this.flourishes, t });
      } else {
        events.push({ type: 'early', drum, t });
      }
      return events;
    }

    if (!this.phrase.length) {
      // A new phrase. Starting soon after "ready" keeps the chain.
      this.chainArmed = this.chainUntil !== null && t <= this.chainUntil;
      this.shown = null;
      events.push({ type: 'phraseStart', t, chained: this.chainArmed });
    }
    this.phrase.push({ drum, t });
    events.push({ type: 'stroke', drum, t, index: this.phrase.length - 1 });

    let cands = this.candidates();
    if (!cands.length) {
      // This stroke does not continue the phrase; maybe it starts a new one.
      const dropped = this.phrase.length - 1;
      this.phrase = [{ drum, t }];
      this.pending = null;
      cands = this.candidates();
      if (dropped > 0) events.push({ type: 'reset', strokes: dropped, reason: 'uneven' });
      if (!cands.length) {
        this.phrase = [];
        events.push({ type: 'reset', strokes: 1, reason: 'no-pattern' });
        return events;
      }
    }
    const complete = cands.filter((c) => c.complete).sort((a, b) => a.meanErr - b.meanErr);
    const open = cands.filter((c) => !c.complete);
    if (complete.length && !open.length) events.push(...this.accept(complete[0], t));
    else this.pending = complete[0] || null;
    return events;
  }

  /** Advance the clock: accept a pending match, fade an abandoned phrase, end answers. */
  update(t) {
    const events = [];
    if (this.phrase.length && t > this.deadline()) {
      if (this.pending) events.push(...this.accept(this.pending, t));
      else {
        events.push({ type: 'reset', strokes: this.phrase.length, reason: 'timeout' });
        this.phrase = [];
      }
    }
    if (this.action && t >= this.action.ready) {
      events.push({ type: 'ready', t: this.action.ready, command: this.action.command });
      this.chainUntil = this.action.ready + CHAIN_WINDOW * this.action.u;
      this.shown = null;
      this.action = null;
    }
    if (this.combo > 0 && !this.action && !this.phrase.length && this.chainUntil !== null && t > this.chainUntil) {
      events.push({ type: 'comboLost', combo: this.combo });
      this.combo = 0;
      this.chainUntil = null;
    }
    return events;
  }

  accept(c, now) {
    const p = c.pattern;
    const t0 = this.phrase[0].t;
    const u = c.u;
    const accuracy = accuracyOf(c.meanErr, this.windows);
    this.combo = this.chainArmed ? this.combo + 1 : 1;
    this.chainUntil = null;
    // The answer starts on the beat after the pattern's fourth.
    const start = Math.max(t0 + 4 * u, now + 0.05);
    this.action = { command: p.command, tier: p.tier, pattern: p, u, start, ready: start + 4 * u };
    this.shown = { pattern: p, strokes: this.phrase.slice(), accuracy };
    this.phrase = [];
    this.pending = null;
    this.flourishes = 0;
    return [
      {
        type: 'command',
        command: p.command,
        tier: p.tier,
        pattern: p,
        u,
        accuracy,
        even: c.maxErr <= this.windows.perfect,
        start,
        ready: start + 4 * u,
        combo: this.combo,
        spirit: this.spirit,
      },
    ];
  }

  /** Drop the phrase being played (the player's reset button). */
  reset() {
    if (!this.phrase.length) return [];
    const strokes = this.phrase.length;
    this.phrase = [];
    this.pending = null;
    return [{ type: 'reset', strokes, reason: 'manual' }];
  }

  /** Strokes so far placed on the most likely pattern (for the HUD). */
  progress() {
    if (!this.phrase.length) return null;
    const cands = this.candidates().sort((a, b) => a.meanErr - b.meanErr || a.pattern.strokes.length - b.pattern.strokes.length);
    return cands[0] || null;
  }
}
