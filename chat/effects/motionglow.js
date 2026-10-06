// Motion Glow: the room goes dark and anything that moves leaves glowing
// neon behind it.

const GW = 80, GH = 60;
const FADE = 0.6;   // seconds for the glow to die away
const LAG = 0.1;    // compare with the picture from this long ago

function small() {
  const cv = document.createElement('canvas');
  cv.width = GW;
  cv.height = GH;
  return cv;
}

export default {
  id: 'motionglow',
  name: 'Motion Glow',
  emoji: '✨',
  hint: 'Wave your hands to paint with light',
  needs: { history: 0.3 },

  start(s) {
    s.now = small();
    s.old = small();
    s.paint = small();
    s.glow = small();
    s.img = null;
  },

  draw(ctx, f) {
    const s = f.state;
    s.now ||= small();
    s.old ||= small();
    s.paint ||= small();
    s.glow ||= small();
    const nc = s.now.getContext('2d', { willReadFrequently: true });
    const oc = s.old.getContext('2d', { willReadFrequently: true });
    const gc = s.glow.getContext('2d');
    const pc = s.paint.getContext('2d');

    // Fade the old glow.
    gc.globalCompositeOperation = 'destination-out';
    gc.fillStyle = `rgba(0,0,0,${Math.min(1, f.dt / FADE)})`;
    gc.fillRect(0, 0, GW, GH);
    gc.globalCompositeOperation = 'source-over';

    const p = f.past(LAG);
    if (p) {
      nc.drawImage(f.camera(), 0, 0, GW, GH);
      oc.drawImage(p.cam, 0, 0, GW, GH);
      const a = nc.getImageData(0, 0, GW, GH).data;
      const b = oc.getImageData(0, 0, GW, GH).data;
      s.img ||= pc.createImageData(GW, GH);
      const o = s.img.data;
      for (let y = 0; y < GH; y++) {
        for (let x = 0; x < GW; x++) {
          const i = (y * GW + x) * 4;
          const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
          const v = Math.min(1, Math.max(0, (d - 60) / 160));
          // Cyan on one side, magenta on the other, shifting over time.
          const m = 0.5 + 0.5 * Math.sin(x * 0.12 + y * 0.05 + f.t * 2);
          o[i] = 255 * m;
          o[i + 1] = 255 * (1 - m) * 0.9 + 60;
          o[i + 2] = 255;
          o[i + 3] = 255 * v * 0.3;
        }
      }
      pc.putImageData(s.img, 0, 0);
      gc.globalCompositeOperation = 'lighter';
      gc.drawImage(s.paint, 0, 0);
      gc.globalCompositeOperation = 'source-over';
    }

    // Darken the picture, then add the glow in two passes (soft and crisp).
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, f.w, f.h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.filter = `blur(${Math.round(f.w * 0.018)}px)`;
    ctx.drawImage(s.glow, 0, 0, f.w, f.h);
    ctx.filter = `blur(${Math.round(f.w * 0.005)}px)`;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(s.glow, 0, 0, f.w, f.h);
    ctx.restore();
  },
};
