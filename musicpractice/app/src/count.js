// The metronome's Voice sound: a voice counting the bar ("one and two and",
// "one trip let two trip let", "one e and a"), in the Practice Routine's voices
// (settings.js SPEAKERS). The words are recordings, one file a word
// (assets/audio/count/<voice>/<word>.wav, made by design/source/count_voice.py),
// each padded so its vowel, where a count is heard to fall, is COUNT_LEAD
// seconds in: everything the Voice sound plays starts that much early.
//
// A word takes time to say, so the faster the tempo the less is said
// (countSlots): every word while each has room, then the beats alone with
// clicks between them, then "one" alone with clicks for the other beats, then
// clicks only. A word is cut off by the next word (never by a click), with a
// short fade, so a word needs only COUNT_NEED of its length before the next.

import { SOFT, SILENT } from './settings.js';

const SUB = 3; // the click between the beats (metronome.js SUB, which imports this)

/** Every word, in the order the apps' mixers number them (from WORD). */
export const COUNT_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'and', 'e', 'a', 'trip', 'let'];
/** The first word's click kind, after the clicks' (weak, mid, strong, between, soft, silent, polyrhythm). */
export const WORD = 7;
/** Seconds from the start of a word's file to its vowel. */
export const COUNT_LEAD = 0.12;
/** How much of a word (after its lead) must be heard before the next word cuts it off. */
export const COUNT_NEED = 0.65;
/** A word cut off by the next fades out over this long (the apps' mixers too). */
export const COUNT_CHOKE = 0.012;
/** The clicks the Voice sound plays where it says nothing (on soft beats, between counted beats, when too fast). */
export const COUNT_CLICK = 'click';
/** The words said between the beats, by clicks per beat: eighths, triplets, sixteenths. */
export const SUB_WORDS = { 2: ['and'], 3: ['trip', 'let'], 4: ['e', 'and', 'a'] };

/** How loud each word plays: the downbeat's "one" fullest, the other beats a little under, the words between them under those. */
export function wordGain(word) {
  if (word === 'one') return 1;
  return COUNT_WORDS.indexOf(word) < 12 ? 0.8 : 0.55;
}

export const countUrl = (voice, word) => new URL(`../assets/audio/count/${voice}/${word}.wav`, import.meta.url).href;

/**
 * The click kind for every position in the bar (beats × subdivision), words
 * from WORD on: what the Voice sound says or plays at each.
 * @param {{ strengths: number[], slots?: number[] | null, subdivision?: number, bpm: number }} plan the bar (barPlan) and tempo
 * @param {Record<string, number>} lengths each word's heard length in seconds (after its lead); a missing word is never said
 */
export function countSlots({ strengths, slots, subdivision = 1, bpm }, lengths) {
  const sub = subdivision;
  const n = strengths.length * sub;
  const step = 60 / bpm / sub; // seconds per position
  const base = Array.from({ length: n }, (_, k) => slots?.[k] ?? (k % sub === 0 ? strengths[k / sub] ?? 0 : SUB));
  // The word each position would say, or null (a silent or soft beat says nothing).
  const said = base.map((b, k) => {
    if (b === SILENT || b === SOFT) return null;
    const j = k % sub;
    return j === 0 ? COUNT_WORDS[Math.floor(k / sub) % 12] : SUB_WORDS[sub]?.[j - 1] ?? null;
  });
  // Is every word at the positions `keep` allows said in time, before the next word?
  const plan = (keep) => {
    const words = said.map((w, k) => (w && keep(k, w) ? w : null));
    const at = words.map((w, k) => (w ? k : -1)).filter((k) => k >= 0);
    if (!at.length) return null;
    for (let i = 0; i < at.length; i++) {
      const k = at[i];
      const gap = ((at[(i + 1) % at.length] - k + n) % n || n) * step;
      // Where clicks stand between counted beats, a word is still heard over them; but it ends before the next beat.
      const room = Math.min(gap, keep === all ? gap : 60 / bpm);
      const len = lengths[words[k]];
      if (!(len > 0) || len * COUNT_NEED > room) return null;
    }
    return words;
  };
  const all = () => true;
  const words = plan(all) || plan((k) => k % sub === 0) || plan((k) => k === 0);
  return base.map((b, k) => (words?.[k] ? WORD + COUNT_WORDS.indexOf(words[k]) : b));
}
