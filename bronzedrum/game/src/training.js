// Training (Drum Practice): every rhythm the chapters ask the player to drum,
// numbered and sorted into levels of difficulty, to practise one at a time and
// to tune which chapters use which rhythms. Pure, so it runs under node --test.
//
// The catalogue is the rhythms as designed (Medium, four beats): the battle
// commands' tiers up to each chapter's highest, the answering chapters' calls
// and the casting rhythm. A rhythm used in several places is one entry, listed
// with every use. Entries are numbered in the order the game first asks for
// them, chapter by chapter, so a number names the same rhythm whatever the
// Difficulty and Number of beats settings (which reshape the rhythms in play).

import { STAGES } from './stages.js';
import { COMMANDS, designedTiers } from './rhythm.js';

export const LEVELS = [
  { name: 'Steady', about: 'one stroke on every beat' },
  { name: 'Pairs', about: 'one beat split in two' },
  { name: 'Pair runs', about: 'two pairs or more, or opening on a pair' },
  { name: 'Triplets', about: 'one beat split in three' },
  { name: 'Triplet runs', about: 'triplets with pairs, two triplets, or opening on one' },
];

/**
 * Levels set by hand, rhythm number -> level (1 to 5), over the one worked out
 * from the rhythm's shape (levelOf). Tuning notes go here.
 */
export const LEVEL_OVERRIDES = {};

/** The tempo a rhythm is played at in Training when no call gives one (beats per minute). */
export const TRAINING_BPM = 84;

/** The level a rhythm's shape puts it at, 1 to 5 (see LEVELS). */
export function levelOf(text) {
  const beats = text.split(' ');
  const pairs = beats.filter((b) => b.length === 2).length;
  const triplets = beats.filter((b) => b.length === 3).length;
  const opens = beats[0].length;
  if (triplets >= 2 || (triplets && (pairs || opens === 3))) return 5;
  if (triplets) return 4;
  if (pairs >= 2 || opens === 2) return 3;
  if (pairs) return 2;
  return 1;
}

const ROMAN = ['', 'I', 'II', 'III'];

/**
 * Every rhythm in the game: [{ n, text, level, bpm, uses: [{ ch, what }] }],
 * numbered from 1 in the order the chapters first use them.
 */
export function catalogue() {
  const out = [];
  const byText = new Map();
  const add = (text, use, bpm) => {
    let e = byText.get(text);
    if (!e) {
      e = { n: out.length + 1, text, uses: [], bpm: null };
      byText.set(text, e);
      out.push(e);
    }
    e.uses.push(use);
    if (!e.bpm && bpm) e.bpm = bpm;
  };
  STAGES.forEach((st, i) => {
    const ch = i + 1;
    if ((st.mode || 'battle') === 'battle') {
      for (const id of st.unlocked || []) {
        const c = COMMANDS.find((k) => k.id === id);
        designedTiers(id)
          .slice(0, st.maxTier || 3)
          .forEach((text, k) => add(text, { ch, what: `${c.gloss} ${ROMAN[k + 1]}` }));
      }
    }
    for (const call of st.calls || []) add(call.text, { ch, what: call.label ? `${call.label}’s call` : 'Call' }, call.bpm);
    if (st.rhythm) add(st.rhythm, { ch, what: 'Casting' }, st.bpm);
  });
  for (const e of out) {
    e.level = LEVEL_OVERRIDES[e.n] || levelOf(e.text);
    e.bpm = e.bpm || TRAINING_BPM;
  }
  return out;
}

/** The rhythms of one level (1 to 5), in number order. */
export function levelRhythms(level, all = catalogue()) {
  return all.filter((e) => e.level === level);
}

/**
 * Where a rhythm is used, for its row: each use with its chapters, e.g.
 * "March II · ch 1, 5, 6, 8 — Call · ch 2".
 */
export function usesText(e) {
  const by = new Map();
  for (const u of e.uses) {
    const chs = by.get(u.what) || [];
    if (!chs.includes(u.ch)) chs.push(u.ch);
    by.set(u.what, chs);
  }
  return [...by].map(([what, chs]) => `${what} · ch ${chs.join(', ')}`).join(' — ');
}

/** The earliest chapter that asks for a rhythm. */
export function firstChapter(e) {
  return Math.min(...e.uses.map((u) => u.ch));
}
