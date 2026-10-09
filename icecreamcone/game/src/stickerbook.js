// The sticker book's state, and the pure rules it keeps: where a sticker
// may go, which pictures can be put behind the stickers, and what is saved.
// No DOM, no canvas, so the tests can run it (the drawing is in
// celebrate.js, the screen and its input in main.js, the saving in store.js).
//
// A sticker the player has moved is kept as { page, u, v, z }: which page of
// its spread (0 or 1), where its centre is as a share of that page's width
// and height (so it stays put on the page whether the book lies open side by
// side on a wide screen or one page above the other on an upright one), and
// z, its place in the pile (higher is on top). A sticker never moved sits
// in its own place, the slot the celebration sticks it in.

export const PLAIN = 'plain';

// The empty book.
export const emptyBook = () => ({ pos: {}, bg: PLAIN, spread: 0 });

// What was saved, checked: anything malformed is dropped, so a bad save
// never breaks the book. `ids` are the guide's birds; `spreads` how many
// spreads the book has.
export function normalizeBook(raw, ids, spreads = 1) {
  const book = emptyBook();
  if (!raw || typeof raw !== 'object') return book;
  const known = new Set(ids);
  const num = (x) => typeof x === 'number' && Number.isFinite(x);
  if (raw.pos && typeof raw.pos === 'object') {
    for (const [id, p] of Object.entries(raw.pos)) {
      if (!known.has(id) || !p || (p.page !== 0 && p.page !== 1) || !num(p.u) || !num(p.v)) continue;
      book.pos[id] = { page: p.page, u: clamp01(p.u), v: clamp01(p.v), z: num(p.z) ? p.z : 0 };
    }
  }
  if (typeof raw.bg === 'string' && (raw.bg === PLAIN || known.has(raw.bg))) book.bg = raw.bg;
  if (Number.isInteger(raw.spread) && raw.spread >= 0 && raw.spread < spreads) book.spread = raw.spread;
  return book;
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// The pictures that can go behind the stickers: the plain page, then the
// scene of each bird passed, in the guide's order.
export function backgrounds(ids, isPassed) {
  return [PLAIN, ...ids.filter((id, i) => isPassed(i))];
}

// The next (d = 1) or previous (d = -1) picture, round and round. One no
// longer in the list (its bird forgotten) counts as the plain page.
export function cycle(list, current, d) {
  const i = Math.max(0, list.indexOf(current));
  return list[(i + d + list.length * 4) % list.length];
}

// The picture to show: the chosen one while it is still unlocked.
export const shownBackground = (list, bg) => (list.includes(bg) ? bg : PLAIN);

// Where a sticker of size `s` (in stage units) dropped at (x, y) goes on a
// spread's `pages` ([{ x, y, w, h }, ...]): onto the page it is over (or the
// nearer one), its centre kept far enough inside that it stays on the page.
export function placeOnSpread(pages, x, y, s) {
  let best = 0;
  let bestD = Infinity;
  pages.forEach((p, k) => {
    const dx = Math.max(p.x - x, 0, x - (p.x + p.w));
    const dy = Math.max(p.y - y, 0, y - (p.y + p.h));
    const d = Math.hypot(dx, dy);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  });
  const p = pages[best];
  const mu = Math.min(0.5, (s * 0.4) / p.w);
  const mv = Math.min(0.5, (s * 0.4) / p.h);
  return {
    page: best,
    u: Math.max(mu, Math.min(1 - mu, (x - p.x) / p.w)),
    v: Math.max(mv, Math.min(1 - mv, (y - p.y) / p.h)),
  };
}

// A saved place back in stage units on this layout's pages.
export function pagePoint(pages, pos) {
  const p = pages[pos.page] || pages[0];
  return { x: p.x + pos.u * p.w, y: p.y + pos.v * p.h };
}

// Moves sticker `id` to `place`, on top of the pile.
export function moveSticker(book, id, place) {
  const top = Math.max(0, ...Object.values(book.pos).map((p) => p.z));
  book.pos[id] = { page: place.page, u: place.u, v: place.v, z: top + 1 };
  return book;
}

// The order to draw a spread's stickers in: those in their own places first,
// then the moved ones from the bottom of the pile to the top.
export function drawOrder(ids, pos) {
  return [...ids].sort((a, b) => (pos[a]?.z ?? -1) - (pos[b]?.z ?? -1));
}
