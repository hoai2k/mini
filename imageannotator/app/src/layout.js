// Title placement (pure). Each titled item gets a box near the point it
// belongs to. Titles the user has dragged keep their offset from that point
// (so they follow the item when it moves); the rest are placed one by one at
// the candidate spot that overlaps other titles, the marks and the picture's
// edges least.

import { anchorOf, arrowTail, bounds, nearestOnItem } from './geometry.js';

const DIRS = 16;

// Whether an item shows its text: the Add text switch is on (items saved
// before the switch existed count as on) and there is something to show.
export function hasText(item) {
  return (item.textOn ?? true) && !!(item.title && item.title.trim());
}

export function labelGap(item, u) {
  return (item.fontSize || 40) * u * 0.35 + (item.width || 0) * u;
}

// The spot at distance t along direction d where box (w×h) centred there
// clears `clear`.
function placeAlong(anchor, d, w, h, clears) {
  let t = 0;
  const step = Math.max(2, Math.min(w, h) * 0.15);
  for (let i = 0; i < 400; i++) {
    const r = { x: anchor.x + d.x * t - w / 2, y: anchor.y + d.y * t - h / 2, w, h };
    if (clears(r)) return r;
    t += step;
  }
  return { x: anchor.x - w / 2, y: anchor.y - h / 2, w, h };
}

function rectPointDist(r, p) {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

function overlap(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function outside(r, W, H) {
  return r.w * r.h - overlap(r, { x: 0, y: 0, w: W, h: H });
}

// Length of segment a–b inside rectangle r (Liang–Barsky clipping).
function clippedLength(a, b, r) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const edges = [[-dx, a.x - r.x], [dx, r.x + r.w - a.x], [-dy, a.y - r.y], [dy, r.y + r.h - a.y]];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return 0;
    } else {
      const t = q / p;
      if (p < 0) { if (t > t1) return 0; if (t > t0) t0 = t; }
      else { if (t < t0) return 0; if (t < t1) t1 = t; }
    }
  }
  return (t1 - t0) * Math.hypot(dx, dy);
}

// How much of a mark a box covers, roughly in square pixels.
function markOverlap(r, item, u) {
  const w = Math.max(2, (item.width || 0) * u);
  const pad = { x: r.x - w, y: r.y - w, w: r.w + 2 * w, h: r.h + 2 * w };
  if (item.type === 'arrow') {
    return clippedLength(arrowTail(item), item, pad) * w * 3;
  }
  if (item.type === 'circle') {
    // Only the ring counts: a title inside a big circle is fine.
    if (!overlap(pad, bounds(item, u))) return 0;
    const near = rectPointDist(pad, item);
    const far = Math.max(...[[pad.x, pad.y], [pad.x + pad.w, pad.y], [pad.x, pad.y + pad.h], [pad.x + pad.w, pad.y + pad.h]]
      .map(([x, y]) => Math.hypot(x - item.x, y - item.y)));
    return near <= item.r && far >= item.r ? Math.min(r.w, r.h) * w * 6 : 0;
  }
  let len = 0;
  const pts = item.points;
  for (let i = 1; i < pts.length; i++) {
    len += clippedLength({ x: item.x + pts[i - 1][0], y: item.y + pts[i - 1][1] }, { x: item.x + pts[i][0], y: item.y + pts[i][1] }, pad);
  }
  return len * w * 3;
}

function candidates(item, u, w, h) {
  const gap = labelGap(item, u);
  const anchor = anchorOf(item, u);
  let base;
  let clears;
  if (item.type === 'arrow') {
    const tail = arrowTail(item);
    base = item.angle + Math.PI; // straight on past the tail
    clears = (r) => rectPointDist(r, tail) >= gap;
  } else if (item.type === 'circle') {
    base = -Math.PI / 4; // upper right
    clears = (r) => rectPointDist(r, item) >= item.r + gap;
  } else {
    const b = bounds(item, u);
    base = -Math.PI / 4;
    const grown = { x: b.x - gap, y: b.y - gap, w: b.w + 2 * gap, h: b.h + 2 * gap };
    clears = (r) => !overlap(r, grown);
  }
  const out = [];
  for (let i = 0; i < DIRS; i++) {
    // base, then alternately either side of it, further each time
    const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
    const a = base + (k * 2 * Math.PI) / DIRS;
    const d = { x: Math.cos(a), y: Math.sin(a) };
    const near = placeAlong(anchor, d, w, h, clears);
    // Further out along the same line, for when the near spots are taken.
    for (let ring = 0; ring < 4; ring++) {
      const t = ring * (h * 1.3 + gap);
      out.push({ rect: { ...near, x: near.x + d.x * t, y: near.y + d.y * t }, rank: Math.abs(k) + ring * 4 });
    }
  }
  return out;
}

// items: all annotations (in drawing order). measure(item) → { w, h }, the
// title box in image pixels. Returns Map id → { x, y, w, h, target }, where
// target is the point a leader line runs to when the box sits away from its
// item (null when it is close enough not to need one).
export function layoutLabels(items, u, W, H, measure) {
  const out = new Map();
  const titled = items.filter(hasText);
  const placed = [];
  const finish = (item, rect) => {
    const c = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    const end = nearestOnItem(item, c, u);
    const far = rectPointDist(rect, end) > labelGap(item, u) * 2.2;
    out.set(item.id, { ...rect, target: far ? end : null });
    placed.push(rect);
  };
  for (const item of titled) {
    if (!item.label) continue;
    const { w, h } = measure(item);
    const a = anchorOf(item, u);
    finish(item, { x: a.x + item.label.dx - w / 2, y: a.y + item.label.dy - h / 2, w, h });
  }
  for (const item of titled) {
    if (item.label) continue;
    const { w, h } = measure(item);
    let best = null;
    let bestScore = Infinity;
    for (const c of candidates(item, u, w, h)) {
      const r = c.rect;
      let score = c.rank * w * h * 0.03;
      const m = labelGap(item, u) * 0.5;
      const roomy = { x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m };
      for (const p of placed) score += overlap(roomy, p) * 40;
      score += outside(r, W, H) * 40;
      for (const other of items) score += markOverlap(r, other, u) * (other === item ? 1.5 : 1);
      if (score < bestScore) {
        bestScore = score;
        best = r;
      }
    }
    finish(item, best);
  }
  return out;
}

// The offset (from the item's anchor) that puts a dragged title's centre at c.
export function labelOffset(item, c, u) {
  const a = anchorOf(item, u);
  return { dx: c.x - a.x, dy: c.y - a.y };
}

export function rectsOverlap(a, b) {
  return overlap(a, b) > 0;
}
