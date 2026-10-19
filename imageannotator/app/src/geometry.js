// Annotation geometry (pure). Every annotation lives in image pixels; sizes the
// user sets (line width, title size) are in "units" of a thousandth of the
// image's longer side, so a setting looks the same on a small screenshot and
// on a 48-megapixel photo.

export const TYPES = ['arrow', 'circle', 'draw'];

export function unitOf(w, h) {
  return Math.max(w, h) / 1000;
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// An arrow is its tip (x, y: the point it shows), the direction it points in
// (angle, radians, tail → tip) and its length. Moving drags the tip; rotating
// swings the tail round the tip, so it keeps pointing at the same spot.
export function arrowTail(a) {
  return { x: a.x - Math.cos(a.angle) * a.length, y: a.y - Math.sin(a.angle) * a.length };
}

// The head, in image pixels, for a stroke width w (pixels).
export function arrowHead(a, w) {
  const len = Math.min(a.length * 0.6, w * 3 + a.length * 0.12 + 6);
  const half = len * 0.55;
  const ux = Math.cos(a.angle);
  const uy = Math.sin(a.angle);
  const bx = a.x - ux * len;
  const by = a.y - uy * len;
  return {
    tip: { x: a.x, y: a.y },
    left: { x: bx - uy * half, y: by + ux * half },
    right: { x: bx + uy * half, y: by - ux * half },
    base: { x: bx, y: by },
  };
}

// Where a new arrow's tail goes: toward the middle of the picture, so the
// arrow stays on the image, or from the lower left when the tap is central.
export function defaultArrowAngle(p, w, h, length) {
  const cx = w / 2 - p.x;
  const cy = h / 2 - p.y;
  if (Math.hypot(cx, cy) < length * 0.5) return -Math.PI / 4;
  return Math.atan2(-cy, -cx);
}

export function defaultArrowLength(w, h) {
  return Math.round(Math.min(w, h) * 0.2);
}

export function defaultCircleRadius(w, h) {
  return Math.round(Math.min(w, h) * 0.08);
}

export function bounds(item, u = 1) {
  const pad = ((item.width || 0) * u) / 2;
  if (item.type === 'arrow') {
    const t = arrowTail(item);
    return grow({ x: Math.min(t.x, item.x), y: Math.min(t.y, item.y), w: Math.abs(t.x - item.x), h: Math.abs(t.y - item.y) }, pad);
  }
  if (item.type === 'circle') {
    return grow({ x: item.x - item.r, y: item.y - item.r, w: item.r * 2, h: item.r * 2 }, pad);
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of item.points) {
    x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
  }
  if (!item.points.length) x0 = y0 = x1 = y1 = 0;
  return grow({ x: item.x + x0, y: item.y + y0, w: x1 - x0, h: y1 - y0 }, pad);
}

function grow(r, d) {
  return { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d };
}

// The point a title belongs to: an arrow's tail, a circle's centre, the
// middle of a drawing.
export function anchorOf(item, u = 1) {
  if (item.type === 'arrow') return arrowTail(item);
  if (item.type === 'circle') return { x: item.x, y: item.y };
  const b = bounds(item, u);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

// The nearest point of the item's outline to p (where a title's leader line
// ends).
export function nearestOnItem(item, p, u = 1) {
  if (item.type === 'arrow') return arrowTail(item);
  if (item.type === 'circle') {
    const d = dist(p, item) || 1;
    return { x: item.x + ((p.x - item.x) / d) * item.r, y: item.y + ((p.y - item.y) / d) * item.r };
  }
  const b = bounds(item, u);
  return { x: Math.max(b.x, Math.min(b.x + b.w, p.x)), y: Math.max(b.y, Math.min(b.y + b.h, p.y)) };
}

export function distToStroke(item, p) {
  const pts = item.points;
  if (!pts.length) return Infinity;
  if (pts.length === 1) return Math.hypot(p.x - item.x - pts[0][0], p.y - item.y - pts[0][1]);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = { x: item.x + pts[i - 1][0], y: item.y + pts[i - 1][1] };
    const b = { x: item.x + pts[i][0], y: item.y + pts[i][1] };
    best = Math.min(best, distToSegment(p, a, b));
  }
  return best;
}

// What a press at p (image pixels) grabs on an item, or null. tol is the
// grab distance in image pixels. A selected item can also be grabbed by its
// handles: the ring an arrow's tail swings round ('rotate') or a circle's
// edge ('resize'), and anywhere inside it ('move').
export function hitItem(item, p, tol, u, selected) {
  const half = ((item.width || 0) * u) / 2;
  if (item.type === 'arrow') {
    const ring = Math.abs(dist(p, item) - item.length);
    if (selected && ring <= tol) return 'rotate';
    const tail = arrowTail(item);
    if (dist(p, tail) <= tol + half) return selected ? 'rotate' : 'move';
    if (dist(p, item) <= tol + half * 3) return 'move';
    if (distToSegment(p, tail, item) <= tol + half) return 'move';
    return null;
  }
  if (item.type === 'circle') {
    const d = dist(p, item);
    if (Math.abs(d - item.r) <= tol + half) return selected ? 'resize' : 'move';
    if (selected && d < item.r) return 'move';
    return null;
  }
  if (distToStroke(item, p) <= tol + half) return 'move';
  if (selected) {
    const b = bounds(item, u);
    if (p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol) return 'move';
  }
  return null;
}

// Turn a freehand path (absolute points) into an item-relative one, dropping
// points closer together than minGap so long strokes stay small.
export function simplifyPath(points, minGap) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minGap) out.push([p[0], p[1]]);
  }
  const end = points[points.length - 1];
  const last = out[out.length - 1];
  if (end && last && (end[0] !== last[0] || end[1] !== last[1])) out.push([end[0], end[1]]);
  return out;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}
