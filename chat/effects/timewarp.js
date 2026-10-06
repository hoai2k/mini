// Time Warp: a glowing line sweeps from top to bottom and freezes everything it has passed, so
// anything that moves as the line goes by gets stretched.

const SWEEP = 8; // seconds for the line to cross the picture
const HOLD = 3;  // seconds to show the finished picture

export default {
  id: 'timewarp',
  name: 'Time Warp',
  emoji: '⏬',
  hint: 'Hold still as the line passes — then move!',
  needs: {},

  start(s) {
    s.frozen = document.createElement('canvas');
    s.time = 0;
    s.pos = 0; // pixels already frozen
    s.fresh = true;
  },

  draw(ctx, f) {
    const s = f.state;
    const frozen = s.frozen || (s.frozen = document.createElement('canvas'));
    const vertical = false;
    const len = vertical ? f.w : f.h;
    if (frozen.width !== f.w || frozen.height !== f.h) {
      frozen.width = f.w;
      frozen.height = f.h;
      s.fresh = true;
    }
    if (f.input.pressed || s.fresh || s.time >= SWEEP + HOLD) {
      s.time = 0;
      s.pos = 0;
      s.fresh = false;
    }
    s.time += f.dt;
    const pos = Math.min(len, (s.time / SWEEP) * len);
    const cam = f.camera();
    const fc = frozen.getContext('2d');
    // Copy the strip the line just passed into the frozen picture.
    if (pos > s.pos) {
      const a = Math.floor(s.pos), b = Math.ceil(pos);
      if (vertical) fc.drawImage(cam, a, 0, b - a, f.h, a, 0, b - a, f.h);
      else fc.drawImage(cam, 0, a, f.w, b - a, 0, a, f.w, b - a);
      s.pos = pos;
    }
    // Live picture is already underneath; lay the frozen part over it.
    ctx.save();
    ctx.beginPath();
    if (vertical) ctx.rect(0, 0, pos, f.h); else ctx.rect(0, 0, f.w, pos);
    ctx.clip();
    ctx.drawImage(frozen, 0, 0);
    ctx.restore();
    if (pos < len) {
      // The glowing scan line.
      ctx.save();
      ctx.shadowColor = '#3ff';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#bff';
      if (vertical) ctx.fillRect(pos - 2, 0, 4, f.h); else ctx.fillRect(0, pos - 2, f.w, 4);
      ctx.restore();
    }
  },
};
