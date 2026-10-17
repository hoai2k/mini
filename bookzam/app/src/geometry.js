// Image geometry: fitting photos to a size, and the ring Find Book draws.

/** The size to draw a w x h photo at, at most `max` on its long edge. */
export function fitSize(w, h, max) {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/** The ellipse that circles a box (fractions), padded, in pixels of a w x h image. */
export function ringFor(box, w, h, pad = 0.18) {
  const bw = (box.x1 - box.x0) * w, bh = (box.y1 - box.y0) * h;
  // An ellipse through a rectangle's corners has radii of the half-sides times √2.
  const rx = (bw / 2) * Math.SQRT2 * (1 + pad) + 6;
  const ry = (bh / 2) * Math.SQRT2 * (1 + pad) + 6;
  return { cx: ((box.x0 + box.x1) / 2) * w, cy: ((box.y0 + box.y1) / 2) * h, rx, ry };
}
