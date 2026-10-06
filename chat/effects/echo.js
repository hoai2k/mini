// Time Trails: rainbow-tinted echoes of me from the last second trail behind.

const ECHOES = 6;
const FIRST = 0.15, LAST = 0.9; // seconds ago

export default {
  id: 'echo',
  name: 'Time Trails',
  emoji: '🌈',
  hint: 'Move around to leave a rainbow trail',
  needs: { segmentation: true, history: 1.2 },

  start(s) {
    s.tint = document.createElement('canvas');
  },

  draw(ctx, f) {
    const s = f.state;
    const tint = s.tint || (s.tint = document.createElement('canvas'));
    const live = f.person();
    // Oldest echo first so the newest sits closest to me.
    for (let i = ECHOES - 1; i >= 0; i--) {
      const ago = FIRST + (LAST - FIRST) * (i / (ECHOES - 1));
      const p = f.past(ago);
      if (!p) continue;
      const src = (live && p.person) || p.cam;
      if (tint.width !== src.width || tint.height !== src.height) {
        tint.width = src.width;
        tint.height = src.height;
      }
      const c = tint.getContext('2d');
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, tint.width, tint.height);
      c.drawImage(src, 0, 0);
      // Colour the cut-out (or the whole picture) with this echo's hue.
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = `hsla(${(i / ECHOES) * 300 + f.t * 20},100%,60%,0.7)`;
      c.fillRect(0, 0, tint.width, tint.height);
      c.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (live ? 0.75 : 0.3) * (1 - (i / ECHOES) * 0.7);
      ctx.drawImage(tint, 0, 0, f.w, f.h);
    }
    ctx.globalAlpha = 1;
    // Live me on top (without a mask the echoes just glow over the picture).
    if (live) ctx.drawImage(live, 0, 0, f.w, f.h);
  },
};
