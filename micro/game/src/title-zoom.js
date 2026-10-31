// Shared geometry for an exactly repeating nested zoom. Coordinates are CSS pixels.
export const TITLE_ZOOM = { scale: 5, seconds: 10, core: 0.78, focusY: 0.46 };

export function titleZoomLayout(time, count, width, height) {
  if (!count || width <= 0 || height <= 0) return { layers: [], duration: 0 };
  const duration = count * TITLE_ZOOM.seconds;
  const progress = (((time % duration) + duration) % duration) / TITLE_ZOOM.seconds;
  const step = Math.floor(progress), phase = progress - step;
  const x = width / 2, y = height * TITLE_ZOOM.focusY;
  const extent = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  // The incoming layer is opaque over every corner before its parent is dropped.
  const baseRadius = extent * 1.02 / TITLE_ZOOM.core;
  const layers = [];
  for (let depth = 0; depth < 16; depth++) {
    const radius = baseRadius * TITLE_ZOOM.scale ** (phase - depth);
    if (radius < 0.5) break;
    layers.push({ index: (step + depth) % count, x, y, radius });
  }
  return { layers, duration, step, phase, baseRadius, extent };
}
