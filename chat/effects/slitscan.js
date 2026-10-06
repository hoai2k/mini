// Wobble Time: each band of the picture comes from a slightly different
// moment, so movement ripples like jelly.

const BANDS = 24;
const MAX_DELAY = 0.8; // seconds

export default {
  id: 'slitscan',
  name: 'Wobble Time',
  emoji: '〰️',
  hint: 'Wave your head around',
  needs: { history: 1.0 },

  draw(ctx, f) {
    const live = f.camera();
    const bh = f.h / BANDS;
    for (let i = 0; i < BANDS; i++) {
      const y = i * bh;
      const delay = (0.5 + 0.5 * Math.sin(i * 0.45 + f.t * 1.6)) * MAX_DELAY;
      const p = f.past(delay);
      const src = p ? p.cam : live;
      const sy = (y / f.h) * src.height;
      const sh = (bh / f.h) * src.height;
      // Overlap bands by a pixel so no seams show.
      ctx.drawImage(src, 0, sy, src.width, sh + 0.5, 0, y, f.w, bh + 1);
    }
  },
};
