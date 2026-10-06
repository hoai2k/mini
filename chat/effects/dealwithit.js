// Deal With It: smile (or hold Space) and black pixel sunglasses drop from
// above onto your eyes, then "DEAL WITH IT" pops up under your chin. Stop
// smiling for a second and the shades lift away.

import { withTemplate } from '../js/face.js';

const DROP = 0.7;   // seconds to land
const LIFT = 0.5;   // seconds to lift away
const HOLD = 1;     // seconds without a smile before they lift
const PX = 20;      // pixel size in template units

// Pixel glasses: lens columns 2..11 and 14..23, arms at the ends. '#' black,
// 'w' white glint, ' ' empty.
const GLASSES = [
  '##########################',
  '  ##########  ##########  ',
  '  #ww#######  #ww#######  ',
  '  #w########  #w########  ',
  '   ########    ########   ',
  '    ######      ######    ',
];

function bake(draw, w, h, sw, sh) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.scale(w / sw, h / sh);
  draw(c);
  return cv;
}

function drawGlasses(c) {
  const x0 = 252, y0 = 470;
  GLASSES.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === ' ') continue;
      c.fillStyle = row[i] === 'w' ? '#ffffff' : '#0b0b10';
      c.fillRect(x0 + i * PX, y0 + j * PX, PX, PX);
    }
  });
  // A faint lighter row inside each lens, like cheap pixel shading.
  c.fillStyle = '#2a2a38';
  for (const x of [x0 + 5 * PX, x0 + 17 * PX]) c.fillRect(x, y0 + 4 * PX, 4 * PX, PX);
}

// "DEAL WITH IT" rendered small and scaled up with hard pixels.
function makeText() {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 24;
  const c = cv.getContext('2d');
  c.font = 'bold 16px "Courier New", monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#000';
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) c.fillText('DEAL WITH IT', 64 + dx, 12 + dy);
  }
  c.fillStyle = '#fff';
  c.fillText('DEAL WITH IT', 64, 12);
  return cv;
}

const bounce = p => {
  // Ease-out bounce: lands at 0.55 then rebounds twice.
  if (p < 0.55) return (p / 0.55) ** 2;
  if (p < 0.8) { const q = (p - 0.55) / 0.25; return 1 - 0.14 * Math.sin(q * Math.PI); }
  const q = (p - 0.8) / 0.2;
  return 1 - 0.05 * Math.sin(q * Math.PI);
};

export default {
  id: 'dealwithit',
  name: 'Deal With It',
  emoji: '😎',
  hint: 'Smile to put the shades on',
  needs: { face: true },

  start(s) {
    s.p = 0;        // 0 = lifted away, 1 = on the face
    s.down = false; // heading down (true) or lifting (false)
    s.idle = 0;     // seconds since the last smile
    s.land = 0;     // seconds since landing
    s.art = bake(drawGlasses, 512, 512, 1024, 1024);
    s.text = makeText();
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.art ??= bake(drawGlasses, 512, 512, 1024, 1024);
    s.text ??= makeText();
    s.p ??= 0;
    s.idle ??= 0;
    s.land ??= 0;
    if (!face) {
      s.p = 0;
      s.down = false;
      s.land = 0;
      return;
    }

    const smiling = face.smile > 0.45 || f.input.held;
    if (smiling) {
      s.idle = 0;
      if (s.p < 1) s.down = true;
    } else {
      s.idle += f.dt;
      if (s.idle > HOLD) s.down = false;
    }
    if (s.down) s.p = Math.min(1, s.p + f.dt / DROP);
    else s.p = Math.max(0, s.p - f.dt / LIFT);
    s.land = s.down && s.p >= 1 ? s.land + f.dt : 0;
    if (s.p <= 0) return;

    // Template units that put the glasses just above the top of the frame.
    const tpx = face.scale / 240;
    const above = face.eyeMid.y / tpx + 160;
    const e = s.down ? bounce(s.p) : s.p * s.p;
    const dy = -above * (1 - e);

    withTemplate(ctx, face, c => {
      c.save();
      c.translate(0, dy);
      c.drawImage(f.img('sunglasses') ?? s.art, 0, 0, 1024, 1024);
      c.restore();

      if (s.land > 0) {
        // The caption pops in with a little overshoot once the shades land.
        const k = Math.min(1, s.land / 0.2);
        const sc = 1 + 0.25 * Math.sin(k * Math.PI) * (1 - k * 0.3);
        c.save();
        c.translate(512, 980);
        c.scale(sc * k, sc * k);
        c.imageSmoothingEnabled = false;
        const w = 128 * 4.4, h = 24 * 4.4;
        c.drawImage(s.text, -w / 2, -h / 2, w, h);
        c.restore();
      }
    });
  },
};
