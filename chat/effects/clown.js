// Clown: a big rainbow afro and a red nose. Open your mouth (or press Space)
// and the nose squashes, springs back and honks.

import { withTemplate } from '../js/face.js';

const HONK_GAP = 0.6; // seconds between honks
const NOSE = { x: 512, y: 640, r: 52 };

function bake(draw, w = 512, h = 512, sw = 1024, sh = 1024) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.scale(w / sw, h / sh);
  draw(c);
  return cv;
}

const RAINBOW = [
  ['#ff6b7a', '#d42a4a'], ['#ffb04a', '#d9741a'], ['#ffe55a', '#d4a512'],
  ['#6fe48a', '#22a050'], ['#5ec0ff', '#1f7ad0'], ['#b684ff', '#7a3fc4'],
];

function curl(c, x, y, r, i) {
  const [light, dark] = RAINBOW[i % RAINBOW.length];
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 9;
  c.strokeStyle = 'rgba(60,20,60,0.55)';
  c.stroke();
  // A swirl so each bobble reads as a curl.
  c.beginPath();
  c.arc(x, y, r * 0.5, Math.PI * 0.2, Math.PI * 1.5);
  c.lineWidth = 6;
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.stroke();
}

function drawWig(c) {
  // Outer ring of curls over the top and down the sides, leaving the face open.
  const n = 17;
  const a0 = Math.PI - 0.5, a1 = Math.PI * 2 + 0.5;
  // Drawn from the ends towards the top so the side curls tuck under.
  const order = [...Array(n).keys()].sort((p, q) => Math.abs(q - (n - 1) / 2) - Math.abs(p - (n - 1) / 2));
  for (const i of order) {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    const end = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
    curl(c, 512 + Math.cos(a) * 285, 410 + Math.sin(a) * 290, 92 - end * 14, i);
  }
  // Inner row for the hairline fringe.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + 0.45 + ((Math.PI - 0.9) * i) / 6;
    curl(c, 512 + Math.cos(a) * 205, 330 + Math.sin(a) * 100, 72, i + 3);
  }
}

// Nose drawn around its own centre so it can be squashed.
function drawNose(c) {
  const g = c.createRadialGradient(-16, -18, 4, 0, 0, NOSE.r);
  g.addColorStop(0, '#ff8a8a');
  g.addColorStop(0.45, '#ff2a3a');
  g.addColorStop(1, '#b8081c');
  c.beginPath();
  c.arc(0, 0, NOSE.r, 0, Math.PI * 2);
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = '#7a0618';
  c.stroke();
  c.beginPath();
  c.ellipse(-17, -20, 15, 9, -0.6, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.fill();
}

function makeNose() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 160;
  const c = cv.getContext('2d');
  c.translate(80, 80);
  drawNose(c);
  return cv;
}

export default {
  id: 'clown',
  name: 'Clown',
  emoji: '🤡',
  hint: 'Open your mouth to honk',
  needs: { face: true },

  start(s) {
    s.wig = bake(drawWig);
    s.nose = makeNose();
    s.sq = 0;
    s.sqv = 0;
    s.honkAt = -10;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.wig ??= bake(drawWig);
    s.sq ??= 0;
    s.sqv ??= 0;
    s.honkAt ??= -10;
    s.nose ??= makeNose();
    if (!face) return;

    if ((face.mouthOpen > 0.4 || f.input.pressed) && f.t - s.honkAt > HONK_GAP) {
      s.honkAt = f.t;
      s.sq = 1;
      s.sqv = 0;
      f.sfx('honk');
    }
    // Damped spring pulls the squash back to zero with a little overshoot.
    const dt = Math.min(f.dt, 0.033);
    s.sqv += (-260 * s.sq - 16 * s.sqv) * dt;
    s.sq += s.sqv * dt;

    const wx = 1 + s.sq * 0.4, wy = 1 - s.sq * 0.45;
    withTemplate(ctx, face, c => {
      const art = f.img('clown');
      if (art) {
        c.drawImage(art, 0, 0, 1024, 1024);
        if (Math.abs(s.sq) > 0.02) {
          // Delivered art is one picture: redraw the nose area squashed on top.
          c.save();
          c.beginPath();
          c.arc(NOSE.x, NOSE.y, NOSE.r * 1.5, 0, Math.PI * 2);
          c.clip();
          c.translate(NOSE.x, NOSE.y);
          c.scale(wx, wy);
          c.translate(-NOSE.x, -NOSE.y);
          c.drawImage(art, 0, 0, 1024, 1024);
          c.restore();
        }
      } else {
        c.drawImage(s.wig, 0, 0, 1024, 1024);
        c.save();
        c.translate(NOSE.x, NOSE.y + NOSE.r * (1 - wy) * 0.5);
        c.scale(wx, wy);
        c.drawImage(s.nose, -80, -80, 160, 160);
        c.restore();
      }
    });
  },
};
