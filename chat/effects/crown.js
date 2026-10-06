// Royalty: a jewelled gold crown sits on your head with sparkles twinkling
// around it.

import { withTemplate } from '../js/face.js';

function bake(draw, w = 512, h = 512, sw = 1024, sh = 1024) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.scale(w / sw, h / sh);
  draw(c);
  return cv;
}

function gem(c, x, y, r, col, dark) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.3, col);
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = dark;
  c.stroke();
}

// Gold crown: base band bottom at y = 235, points rising to about y = 20.
function drawCrown(c) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(318, 236);
  c.lineTo(318, 96);
  c.lineTo(414, 156);
  c.lineTo(512, 50);
  c.lineTo(610, 156);
  c.lineTo(706, 96);
  c.lineTo(706, 236);
  c.closePath();
  const g = c.createLinearGradient(0, 40, 0, 240);
  g.addColorStop(0, '#fff09a');
  g.addColorStop(0.5, '#ffc928');
  g.addColorStop(1, '#e8960c');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 16;
  c.strokeStyle = '#a8650a';
  c.stroke();
  // Band.
  c.beginPath();
  c.roundRect(308, 176, 408, 64, 22);
  const bg = c.createLinearGradient(0, 176, 0, 240);
  bg.addColorStop(0, '#ffe066');
  bg.addColorStop(1, '#e8960c');
  c.fillStyle = bg;
  c.fill();
  c.lineWidth = 14;
  c.stroke();
  // Pearls on the points.
  for (const [x, y] of [[318, 90], [512, 40], [706, 90]]) gem(c, x, y, 24, '#fff6f0', '#c9a98c');
  for (const [x, y] of [[414, 150], [610, 150]]) gem(c, x, y, 17, '#fff6f0', '#c9a98c');
  // Gems on the band.
  gem(c, 512, 208, 26, '#ff5a6e', '#a8102c');
  gem(c, 420, 208, 19, '#4fb4ff', '#1450a8');
  gem(c, 604, 208, 19, '#4fb4ff', '#1450a8');
  gem(c, 350, 208, 14, '#5be88a', '#12843c');
  gem(c, 674, 208, 14, '#5be88a', '#12843c');
  // Shine.
  c.beginPath();
  c.moveTo(345, 190);
  c.lineTo(345, 130);
  c.lineWidth = 9;
  c.strokeStyle = 'rgba(255,255,255,0.65)';
  c.stroke();
}

function star(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.closePath();
  c.fill();
}

// Sparkle spots in template coordinates, each with its own twinkle phase.
const SPARKLES = [
  [280, 90, 0], [740, 60, 1.7], [512, -20, 3.1], [210, 200, 4.4], [820, 190, 2.4],
  [400, 20, 5.3], [640, 10, 0.9], [330, 250, 3.8],
];

export default {
  id: 'crown',
  name: 'Royalty',
  emoji: '👑',
  hint: 'Your Majesty',
  needs: { face: true },

  start(s) {
    s.art = bake(drawCrown);
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    if (!face) return;
    s.art ??= bake(drawCrown);
    withTemplate(ctx, face, c => {
      c.drawImage(f.img('crown') ?? s.art, 0, 0, 1024, 1024);
      c.save();
      c.shadowColor = '#fff6a8';
      c.shadowBlur = 18;
      for (const [x, y, ph] of SPARKLES) {
        const k = Math.max(0, Math.sin(f.t * 3.2 + ph));
        if (k < 0.02) continue;
        c.fillStyle = '#fffbe0';
        star(c, x, y, 16 + 34 * k);
      }
      c.restore();
    });
  },
};
