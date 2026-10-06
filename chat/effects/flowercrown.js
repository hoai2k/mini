// Flower Crown: a ring of peonies, daisies and roses across your head, a soft
// warm glow on the face and petals drifting down.

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

function leaf(c, x, y, len, ang) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(len * 0.3, -len * 0.32, len * 0.8, -len * 0.26, len, 0);
  c.bezierCurveTo(len * 0.8, len * 0.26, len * 0.3, len * 0.32, 0, 0);
  const g = c.createLinearGradient(0, -len * 0.3, 0, len * 0.3);
  g.addColorStop(0, '#6fdc6a');
  g.addColorStop(1, '#2f9a4a');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 7;
  c.strokeStyle = '#1f6e36';
  c.stroke();
  c.beginPath();
  c.moveTo(len * 0.08, 0);
  c.lineTo(len * 0.85, 0);
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.stroke();
  c.restore();
}

function petals(c, n, r, pr, rot, fill, line, stretch = 1.5) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    c.save();
    c.rotate(a);
    c.beginPath();
    c.ellipse(r, 0, pr * stretch, pr, 0, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = line;
    c.stroke();
    c.restore();
  }
}

function peony(c, x, y, r) {
  c.save();
  c.translate(x, y);
  const k = r / 60;
  c.scale(k, k);
  petals(c, 9, 38, 26, 0.2, '#ff9cc4', '#d6568f', 1.1);
  petals(c, 7, 24, 22, 0.7, '#ff7eb2', '#d6568f', 1.1);
  petals(c, 5, 11, 15, 1.3, '#ff5f9e', '#c43e7a', 1.1);
  c.beginPath();
  c.arc(-12, -18, 8, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.fill();
  c.restore();
}

function daisy(c, x, y, r) {
  c.save();
  c.translate(x, y);
  const k = r / 60;
  c.scale(k, k);
  petals(c, 12, 38, 12, 0, '#fff', '#b7c4d6', 2.2);
  const g = c.createRadialGradient(-6, -6, 2, 0, 0, 22);
  g.addColorStop(0, '#fff3a0');
  g.addColorStop(1, '#ffb81c');
  c.beginPath();
  c.arc(0, 0, 20, 0, Math.PI * 2);
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = '#c9810a';
  c.stroke();
  c.restore();
}

function rose(c, x, y, r) {
  c.save();
  c.translate(x, y);
  const k = r / 60;
  c.scale(k, k);
  const g = c.createRadialGradient(-10, -12, 4, 0, 0, 50);
  g.addColorStop(0, '#fff29a');
  g.addColorStop(1, '#f5b81c');
  c.beginPath();
  c.arc(0, 0, 48, 0, Math.PI * 2);
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 7;
  c.strokeStyle = '#c4850c';
  c.stroke();
  // Spiral of petals.
  c.beginPath();
  for (let a = 0; a < Math.PI * 5; a += 0.2) {
    const rr = 4 + a * 2.6;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (a === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.lineWidth = 6;
  c.lineCap = 'round';
  c.strokeStyle = '#d99a14';
  c.stroke();
  c.beginPath();
  c.ellipse(-18, -22, 8, 14, 0.6, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.fill();
  c.restore();
}

// Flowers along an arc from (300, 330) over (512, 215) to (724, 330).
function drawCrown(c) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const at = u => ({ x: 290 + 444 * u, y: 340 - 128 * Math.sin(Math.PI * u) });
  // Vine band.
  c.beginPath();
  for (let i = 0; i <= 24; i++) {
    const p = at(i / 24);
    if (i === 0) c.moveTo(p.x, p.y + 10);
    else c.lineTo(p.x, p.y + 10);
  }
  c.lineWidth = 22;
  c.strokeStyle = '#2f8a46';
  c.stroke();
  for (let i = 0; i < 15; i++) {
    const u = (i + 0.5) / 15;
    const p = at(u);
    const side = i % 2 ? 1 : -1;
    leaf(c, p.x, p.y + 6, 78, -Math.PI / 2 + side * (0.9 + 0.2 * Math.sin(i)) + (u - 0.5) * 1.2);
  }
  const flowers = [
    [0.04, daisy, 44], [0.15, rose, 46], [0.27, peony, 66], [0.38, daisy, 50],
    [0.5, peony, 78], [0.62, rose, 50], [0.73, daisy, 52], [0.85, peony, 64], [0.96, rose, 44],
  ];
  for (const [u, fn, r] of flowers) {
    const p = at(u);
    fn(c, p.x, p.y - 4, r);
  }
}

function drawPetal(c, size) {
  c.beginPath();
  c.moveTo(0, -size);
  c.bezierCurveTo(size * 0.9, -size * 0.5, size * 0.7, size * 0.7, 0, size);
  c.bezierCurveTo(-size * 0.7, size * 0.7, -size * 0.9, -size * 0.5, 0, -size);
  c.fill();
}

const MAX_PETALS = 28;

export default {
  id: 'flowercrown',
  name: 'Flower Crown',
  emoji: '🌸',
  hint: 'Pretty in petals',
  needs: { face: true },

  start(s) {
    s.art = bake(drawCrown);
    s.petals = [];
    s.acc = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.art ??= bake(drawCrown);
    s.petals ??= [];
    s.acc ??= 0;
    if (!face) return;

    // Soft warm glow on the face: a gentle brightening.
    const r = face.scale * 2;
    const g = ctx.createRadialGradient(face.center.x, face.center.y, r * 0.1, face.center.x, face.center.y, r);
    g.addColorStop(0, 'rgba(255,214,190,0.55)');
    g.addColorStop(1, 'rgba(255,214,190,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = g;
    ctx.fillRect(face.center.x - r, face.center.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.14 + 0.03 * Math.sin(f.t * 1.6);
    ctx.fillStyle = g;
    ctx.fillRect(face.center.x - r, face.center.y - r, r * 2, r * 2);
    ctx.restore();

    withTemplate(ctx, face, c => c.drawImage(f.img('flower-crown') ?? s.art, 0, 0, 1024, 1024));

    // Petals leave the crown and drift down slowly.
    s.acc += f.dt * 5;
    while (s.acc >= 1) {
      s.acc -= 1;
      if (s.petals.length >= MAX_PETALS) break;
      const u = Math.random();
      s.petals.push({
        x: face.eyeMid.x + (u - 0.5) * face.scale * 2.4,
        y: face.eyeMid.y - face.scale * (1.1 + Math.random() * 0.3),
        vy: 0.5 + Math.random() * 0.5,
        ph: Math.random() * 6.28,
        sp: 1 + Math.random() * 1.5,
        rot: Math.random() * 6.28,
        spin: (Math.random() - 0.5) * 3,
        sz: 0.07 + Math.random() * 0.05,
        col: ['#ffa8cc', '#ffd3e4', '#fff', '#ff86b6'][(Math.random() * 4) | 0],
        life: 0,
      });
    }
    ctx.save();
    for (let i = s.petals.length - 1; i >= 0; i--) {
      const p = s.petals[i];
      p.life += f.dt;
      p.y += p.vy * face.scale * f.dt;
      p.rot += p.spin * f.dt;
      const x = p.x + Math.sin(p.life * p.sp + p.ph) * face.scale * 0.35;
      if (p.y > f.h + 20 || p.life > 9) {
        s.petals.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.min(1, p.life * 2) * Math.min(1, (9 - p.life) / 1.5);
      ctx.fillStyle = p.col;
      ctx.save();
      ctx.translate(x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.life * p.sp * 1.3 + p.ph)));
      drawPetal(ctx, face.scale * p.sz);
      ctx.restore();
    }
    ctx.restore();
  },
};
