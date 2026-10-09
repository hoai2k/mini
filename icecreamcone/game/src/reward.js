// What happens after a round, and the timing and layout of the sticker
// celebration. Pure: no DOM, no canvas, so the tests can run it (the drawing
// is in celebrate.js, the flow in main.js).
//
// The first time a bird's score is reached the round ends in a celebration
// (the bird's sticker, the sticker book, the next page opening in the guide);
// every other round shows its result card briefly and goes back to the guide.
// With ?debug every round that reaches the score celebrates.

// 'celebrate' or 'brief'.
export function roundOutcome({ wasPassed, isPassed, reached, debug = false }) {
  if (debug) return reached ? 'celebrate' : 'brief';
  return !wasPassed && isPassed ? 'celebrate' : 'brief';
}

// The page that opens after bird i is passed, or -1 after the last bird.
export const nextPage = (i, n) => (i + 1 < n ? i + 1 : -1);

// The card chosen in the guide afterwards: the newly opened page after a
// celebration (the bird itself after the last one), else the bird just played.
export function selectAfter(i, n, outcome) {
  return outcome === 'celebrate' && i + 1 < n ? i + 1 : i;
}

// The celebration's steps, in seconds. Any press jumps to the next step;
// B or a long press skips to the end. After 'done' the guide shows the next
// card unlocking (UNLOCK).
export const STEPS = [
  { name: 'sticker', at: 0 }, // the sticker pops in, with the bird's name
  { name: 'book', at: 1.6 }, // the sticker book opens under it
  { name: 'fly', at: 2.6 }, // the sticker flies to its place and sticks
  { name: 'stuck', at: 3.5 }, // there it stays, among the others
  { name: 'done', at: 4.5 },
];
export const FLY_TIME = 0.9; // the flight, from 'fly' to landing
export const END = STEPS.at(-1).at;
export const HOLD_TO_SKIP = 0.6; // seconds a press is held to skip it all

// The guide's new card: still locked for a moment, then it flips open (the
// bird shows from halfway), then it shines; then it is chosen.
export const UNLOCK = { wait: 0.4, flip: 0.8, shine: 0.6 };
export const UNLOCK_TIME = UNLOCK.wait + UNLOCK.flip + UNLOCK.shine;
export const RESULT_TIME = 3; // how long the result card stays after other rounds
export const RESULT_GUARD = 0.5; // presses this soon after the card are ignored

export function stepAt(t) {
  let i = 0;
  while (i + 1 < STEPS.length && t >= STEPS[i + 1].at) i++;
  return STEPS[i].name;
}

// Where a press during the celebration jumps to: the start of the next step.
export function skipFrom(t) {
  for (const s of STEPS) if (s.at > t + 1e-6) return s.at;
  return END;
}

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export { ease };

// An overshooting pop, 0 → 1 over x in [0, 1], with a bounce past 1.
export function pop(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c = 1.9;
  const y = x - 1;
  return 1 + (c + 1) * y * y * y + c * y * y;
}

// The book: two facing pages inside `rect` ({ x, y, w, h }), side by side on
// a wide screen or one above the other on an upright one, and a slot for each
// of `n` stickers, in order, the first half on the first page. Each slot is
// { x, y, s, page } (its centre and size).
export function bookLayout(n, rect, wide = true) {
  const gap = wide ? rect.w * 0.035 : rect.h * 0.035; // the spine
  const pages = wide
    ? [
        { x: rect.x, y: rect.y, w: (rect.w - gap) / 2, h: rect.h },
        { x: rect.x + (rect.w + gap) / 2, y: rect.y, w: (rect.w - gap) / 2, h: rect.h },
      ]
    : [
        { x: rect.x, y: rect.y, w: rect.w, h: (rect.h - gap) / 2 },
        { x: rect.x, y: rect.y + (rect.h + gap) / 2, w: rect.w, h: (rect.h - gap) / 2 },
      ];
  const first = Math.ceil(n / 2);
  const slots = [];
  pages.forEach((p, k) => {
    const count = k === 0 ? first : n - first;
    if (!count) return;
    // inside the page's margins, under its heading
    const m = Math.min(p.w, p.h) * 0.07;
    const head = p.h * 0.12;
    const ix = p.x + m;
    const iy = p.y + head;
    const iw = p.w - m * 2;
    const ih = p.h - head - m * 0.7;
    let best = null;
    for (let cols = 1; cols <= count; cols++) {
      const rows = Math.ceil(count / cols);
      const s = Math.min(iw / cols, ih / rows);
      if (!best || s > best.s + 0.5) best = { cols, rows, s };
    }
    const { cols, rows, s } = best;
    for (let j = 0; j < count; j++) {
      const r = Math.floor(j / cols);
      const inRow = r === rows - 1 ? count - r * cols : cols;
      const c = j - r * cols;
      slots.push({
        x: ix + iw / 2 + (c - (inRow - 1) / 2) * s,
        y: iy + ih / 2 + (r - (rows - 1) / 2) * s,
        s: s * 0.9,
        page: k,
      });
    }
  });
  return { pages, slots, spine: wide ? { x: rect.x + rect.w / 2, y: rect.y, w: gap, h: rect.h } : { x: rect.x, y: rect.y + rect.h / 2, w: rect.w, h: gap } };
}
