// Clones: every second or so a frozen copy of me is left standing where I was.

const EVERY = 1.2;  // seconds between snapshots
const KEEP = 4;

export default {
  id: 'clones',
  name: 'Clones',
  emoji: '👯',
  hint: 'Strike a pose — your clones stay behind',
  needs: { segmentation: true },

  start(s) {
    s.copies = []; // oldest first
    s.timer = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    s.copies ||= [];
    s.timer = (s.timer || 0) + f.dt;
    const live = f.person();
    if (s.timer >= EVERY || f.input.pressed) {
      s.timer = 0;
      const src = live || f.camera();
      // Reuse the oldest canvas once there are enough copies.
      const cv = s.copies.length >= KEEP ? s.copies.shift() : document.createElement('canvas');
      if (cv.width !== f.w || cv.height !== f.h) {
        cv.width = f.w;
        cv.height = f.h;
      }
      const c = cv.getContext('2d');
      c.clearRect(0, 0, f.w, f.h);
      c.drawImage(src, 0, 0, f.w, f.h);
      s.copies.push(cv);
      f.sfx('click');
    }
    const n = s.copies.length;
    for (let i = 0; i < n; i++) {
      // Oldest is faintest.
      ctx.globalAlpha = (live ? 0.3 : 0.15) + (live ? 0.45 : 0.15) * ((i + 1) / n);
      ctx.drawImage(s.copies[i], 0, 0, f.w, f.h);
    }
    ctx.globalAlpha = 1;
    if (live) ctx.drawImage(live, 0, 0, f.w, f.h);
    // Small countdown before the next snapshot.
    const left = EVERY - s.timer;
    const label = left > 0.8 ? '3…' : left > 0.4 ? '2…' : '1…';
    ctx.save();
    ctx.font = `bold ${Math.round(f.h * 0.06)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(60,20,90,0.6)';
    ctx.fillStyle = '#fff';
    const x = f.w / 2, y = f.h * 0.08;
    ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
    ctx.restore();
  },
};
