// Delay Ghost: a see-through, blue, glowing copy of me from a moment ago.

const DELAY = 1.2; // seconds

export default {
  id: 'delayghost',
  name: 'Delay Ghost',
  emoji: '👻',
  hint: 'Your ghost copies you a moment later',
  needs: { segmentation: true, history: 1.6 },

  start(s) {
    s.tint = document.createElement('canvas');
  },

  draw(ctx, f) {
    const s = f.state;
    const tint = s.tint || (s.tint = document.createElement('canvas'));
    const live = f.person();
    const p = f.past(DELAY);
    if (p && f.t > DELAY * 0.5) {
      const src = (live && p.person) || p.cam;
      if (tint.width !== src.width || tint.height !== src.height) {
        tint.width = src.width;
        tint.height = src.height;
      }
      const c = tint.getContext('2d');
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, tint.width, tint.height);
      c.drawImage(src, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(90,150,255,0.45)';
      c.fillRect(0, 0, tint.width, tint.height);
      c.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.globalAlpha = live ? 0.45 : 0.3;
      ctx.shadowColor = 'rgba(120,200,255,0.95)';
      ctx.shadowBlur = f.w * 0.04;
      ctx.drawImage(tint, 0, 0, f.w, f.h);
      ctx.restore();
    }
    if (live) ctx.drawImage(live, 0, 0, f.w, f.h);
  },
};
