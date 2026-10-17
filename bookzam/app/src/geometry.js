// Image geometry for Find Book: sizing photos for the model and mapping a box
// found in a close-up crop back onto the whole photo.

export const MAX_EDGE = 1568;

/** The size to send a w x h photo at, at most MAX_EDGE on its long edge. */
export function fitSize(w, h, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/**
 * The close-up to look at again after a first find: the box widened by its own
 * size on every side, at least `minFrac` of the photo each way, kept inside it.
 * All in fractions of the photo.
 */
export function cropAround(box, minFrac = 0.3) {
  const grow = (lo, hi) => {
    const size = hi - lo;
    let want = Math.max(size * 3, minFrac);
    want = Math.min(1, want);
    let a = (lo + hi) / 2 - want / 2;
    a = Math.min(Math.max(0, a), 1 - want);
    return [a, a + want];
  };
  const [x0, x1] = grow(box.x0, box.x1);
  const [y0, y1] = grow(box.y0, box.y1);
  return { x0, y0, x1, y1 };
}

/** A box given as fractions of `crop` turned into fractions of the whole photo. */
export function fromCrop(inner, crop) {
  const w = crop.x1 - crop.x0, h = crop.y1 - crop.y0;
  return {
    x0: crop.x0 + inner.x0 * w,
    y0: crop.y0 + inner.y0 * h,
    x1: crop.x0 + inner.x1 * w,
    y1: crop.y0 + inner.y1 * h,
  };
}

export function overlap(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (w <= 0 || h <= 0) return 0;
  const area = (r) => (r.x1 - r.x0) * (r.y1 - r.y0);
  return (w * h) / Math.min(area(a), area(b));
}

/** The ellipse that circles a box (fractions), padded, in pixels of a w x h image. */
export function ringFor(box, w, h, pad = 0.18) {
  const bw = (box.x1 - box.x0) * w, bh = (box.y1 - box.y0) * h;
  // An ellipse through a rectangle's corners has radii of the half-sides times √2.
  const rx = (bw / 2) * Math.SQRT2 * (1 + pad) + 6;
  const ry = (bh / 2) * Math.SQRT2 * (1 + pad) + 6;
  return { cx: ((box.x0 + box.x1) / 2) * w, cy: ((box.y0 + box.y1) / 2) * h, rx, ry };
}
