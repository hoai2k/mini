// The structure of the I Ching: trigrams, the King Wen table, and casting
// with three coins.

/** The eight trigrams. Lines run bottom to top; 1 is yang (solid). */
export const TRIGRAMS = {
  qian: { key: 'qian', zh: '乾', pinyin: 'Qián', name: 'Heaven', quality: 'creative, strong', family: 'father', direction: 'northwest', symbol: '☰', lines: [1, 1, 1], element: 'metal' },
  dui:  { key: 'dui',  zh: '兌', pinyin: 'Duì',  name: 'Lake',    quality: 'joyous, open',     family: 'youngest daughter', direction: 'west',      symbol: '☱', lines: [1, 1, 0], element: 'metal' },
  li:   { key: 'li',   zh: '離', pinyin: 'Lí',   name: 'Fire',    quality: 'clinging, clear',   family: 'middle daughter',   direction: 'south',     symbol: '☲', lines: [1, 0, 1], element: 'fire' },
  zhen: { key: 'zhen', zh: '震', pinyin: 'Zhèn', name: 'Thunder', quality: 'arousing, moving',  family: 'eldest son',        direction: 'east',      symbol: '☳', lines: [1, 0, 0], element: 'wood' },
  xun:  { key: 'xun',  zh: '巽', pinyin: 'Xùn',  name: 'Wind',    quality: 'gentle, penetrating', family: 'eldest daughter', direction: 'southeast', symbol: '☴', lines: [0, 1, 1], element: 'wood' },
  kan:  { key: 'kan',  zh: '坎', pinyin: 'Kǎn',  name: 'Water',   quality: 'abysmal, flowing',  family: 'middle son',        direction: 'north',     symbol: '☵', lines: [0, 1, 0], element: 'water' },
  gen:  { key: 'gen',  zh: '艮', pinyin: 'Gèn',  name: 'Mountain', quality: 'still, steadfast', family: 'youngest son',      direction: 'northeast', symbol: '☶', lines: [0, 0, 1], element: 'earth' },
  kun:  { key: 'kun',  zh: '坤', pinyin: 'Kūn',  name: 'Earth',   quality: 'receptive, yielding', family: 'mother',          direction: 'southwest', symbol: '☷', lines: [0, 0, 0], element: 'earth' },
};

const ORDER = ['qian', 'zhen', 'kan', 'gen', 'kun', 'xun', 'li', 'dui'];

// KING_WEN[lower][upper] in the ORDER above.
const KING_WEN = [
  [1, 34, 5, 26, 11, 9, 14, 43],
  [25, 51, 3, 27, 24, 42, 21, 17],
  [6, 40, 29, 4, 7, 59, 64, 47],
  [33, 62, 39, 52, 15, 53, 56, 31],
  [12, 16, 8, 23, 2, 20, 35, 45],
  [44, 32, 48, 18, 46, 57, 50, 28],
  [13, 55, 63, 22, 36, 37, 30, 49],
  [10, 54, 60, 41, 19, 61, 38, 58],
];

export function trigramOf(lines3) {
  const key = ORDER.find((k) => TRIGRAMS[k].lines.every((v, i) => v === lines3[i]));
  return TRIGRAMS[key];
}

/** King Wen number of six lines (bottom first, 1 = yang). */
export function hexagramNumber(lines6) {
  const lower = ORDER.indexOf(trigramOf(lines6.slice(0, 3)).key);
  const upper = ORDER.indexOf(trigramOf(lines6.slice(3, 6)).key);
  return KING_WEN[lower][upper];
}

/** Six lines (bottom first) of a King Wen number. */
export function linesOf(number) {
  for (let lo = 0; lo < 8; lo++) {
    for (let up = 0; up < 8; up++) {
      if (KING_WEN[lo][up] === number) return [...TRIGRAMS[ORDER[lo]].lines, ...TRIGRAMS[ORDER[up]].lines];
    }
  }
  throw new RangeError(`no hexagram ${number}`);
}

export function trigramsOf(number) {
  const l = linesOf(number);
  return { lower: trigramOf(l.slice(0, 3)), upper: trigramOf(l.slice(3)) };
}

/** The Unicode hexagram symbol (䷀ is 1). */
export function symbolOf(number) {
  return String.fromCodePoint(0x4dc0 + number - 1);
}

/**
 * Three-coin cast of one line: heads count 3, tails 2.
 * 6 old yin (changing), 7 young yang, 8 young yin, 9 old yang (changing).
 */
export function tossLine(rng) {
  const coins = [rng() < 0.5 ? 3 : 2, rng() < 0.5 ? 3 : 2, rng() < 0.5 ? 3 : 2];
  return { coins, value: coins[0] + coins[1] + coins[2] };
}

/** Cast six lines, bottom first. */
export function cast(rng) {
  const throws = [];
  for (let i = 0; i < 6; i++) throws.push(tossLine(rng));
  const values = throws.map((t) => t.value);
  const primary = values.map((v) => (v === 7 || v === 9 ? 1 : 0));
  const changed = values.map((v) => (v === 6 ? 1 : v === 9 ? 0 : v === 7 ? 1 : 0));
  const changing = values.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0);
  return {
    throws,
    values,
    primary: hexagramNumber(primary),
    relating: changing.length ? hexagramNumber(changed) : null,
    changing,
  };
}

/** The nuclear (hidden) hexagram: lines 2-4 below, 3-5 above. */
export function nuclearOf(number) {
  const l = linesOf(number);
  return hexagramNumber([l[1], l[2], l[3], l[2], l[3], l[4]]);
}

/**
 * Which texts to read first, after Zhu Xi's rules for changing lines.
 * Returns { lines: indices to stress (bottom = 0), from: which hexagram those
 * lines belong to ('primary' or 'relating'), useRelating: bool, note }.
 */
export function focusOf(changing) {
  const c = [...changing].sort((a, b) => a - b);
  switch (c.length) {
    case 0: return { lines: [], from: 'primary', useRelating: false, note: 'No lines are changing: the situation is settled. Read the Judgment as the whole answer.' };
    case 1: return { lines: c, from: 'primary', useRelating: false, note: 'One line is changing: it carries the answer.' };
    case 2: return { lines: [c[1], c[0]], from: 'primary', useRelating: false, note: 'Two lines are changing: the upper one leads, the lower one supports.' };
    case 3: return { lines: c, from: 'primary', useRelating: true, note: 'Three lines are changing: weigh the Judgment of this hexagram against the one it becomes.' };
    case 4:
    case 5: return { lines: [0, 1, 2, 3, 4, 5].filter((i) => !c.includes(i)), from: 'relating', useRelating: true, note: 'Most lines are changing: the matter is turning into the hexagram it becomes. Its steady lines speak loudest.' };
    default: return { lines: [], from: 'relating', useRelating: true, note: 'Every line is changing: the whole situation is turning over. Read the hexagram it becomes.' };
  }
}
