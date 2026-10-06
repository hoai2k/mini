// Devil: little red horns and a hellish red glow at the edges of the picture.
// Smile wickedly and flickering flames rise around your head.

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

// Two curved glossy horns rising from the top of the head.
function drawHorns(c) {
  c.lineJoin = 'round';
  for (const mirror of [false, true]) {
    c.save();
    if (mirror) {
      c.translate(1024, 0);
      c.scale(-1, 1);
    }
    // Orange glow behind the horn.
    const glow = c.createRadialGradient(390, 200, 10, 390, 200, 150);
    glow.addColorStop(0, 'rgba(255,150,40,0.55)');
    glow.addColorStop(1, 'rgba(255,150,40,0)');
    c.fillStyle = glow;
    c.fillRect(220, 40, 340, 340);
    c.beginPath();
    c.moveTo(344, 290);
    c.bezierCurveTo(330, 230, 340, 170, 390, 112);
    c.bezierCurveTo(404, 96, 432, 80, 452, 66);
    c.bezierCurveTo(440, 120, 436, 160, 446, 212);
    c.bezierCurveTo(452, 244, 450, 270, 452, 298);
    c.closePath();
    const g = c.createLinearGradient(340, 80, 460, 300);
    g.addColorStop(0, '#ff6a4a');
    g.addColorStop(0.5, '#e11d2e');
    g.addColorStop(1, '#a30f24');
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 15;
    c.strokeStyle = '#6e0a1c';
    c.stroke();
    // Ridges and shine.
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(110,10,28,0.55)';
    c.lineWidth = 8;
    for (const y of [190, 235, 270]) {
      c.beginPath();
      c.moveTo(348, y);
      c.quadraticCurveTo(396, y - 18, 448, y - 2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(366, 250);
    c.quadraticCurveTo(360, 190, 398, 138);
    c.lineWidth = 10;
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.stroke();
    c.restore();
  }
}

const MAX_FLAMES = 70;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function flame(c, x, y, r, life) {
  // A teardrop that flickers sideways as it rises.
  const sway = Math.sin(life * 14 + x) * r * 0.25;
  c.beginPath();
  c.moveTo(x + sway, y - r * 2.4);
  c.bezierCurveTo(x + r * 0.3 + sway, y - r * 1.2, x + r * 1.2, y - r * 0.9, x + r * 0.9, y + r * 0.4);
  c.bezierCurveTo(x + r * 0.6, y + r * 1.1, x - r * 0.6, y + r * 1.1, x - r * 0.9, y + r * 0.4);
  c.bezierCurveTo(x - r * 1.2, y - r * 0.5, x - r * 0.5, y - r * 0.8, x - r * 0.35 - sway, y - r * 1.5);
  c.bezierCurveTo(x - r * 0.1, y - r * 1.2, x - r * 0.1, y - r * 1.6, x + sway, y - r * 2.4);
  c.closePath();
  const g = c.createLinearGradient(x, y - r * 2.4, x, y + r);
  g.addColorStop(0, 'rgba(255,240,140,0.95)');
  g.addColorStop(0.45, 'rgba(255,150,30,0.9)');
  g.addColorStop(1, 'rgba(230,40,20,0.75)');
  c.fillStyle = g;
  c.fill();
}

export default {
  id: 'devil',
  name: 'Devil',
  emoji: '😈',
  hint: 'Smile wickedly',
  needs: { face: true },

  start(s) {
    s.horns = bake(drawHorns);
    s.flames = [];
    s.acc = 0;
    s.fire = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.horns ??= bake(drawHorns);
    s.flames ??= [];
    s.acc ??= 0;
    s.fire ??= 0;

    // Red tint glow at the edges that breathes a little.
    const pulse = 0.5 + 0.5 * Math.sin(f.t * 2.4);
    const cx = face ? face.center.x : f.w / 2, cy = face ? face.center.y : f.h / 2;
    const rad = Math.hypot(f.w, f.h) * 0.62;
    const g = ctx.createRadialGradient(cx, cy, rad * 0.35, cx, cy, rad);
    g.addColorStop(0, 'rgba(255,40,10,0)');
    g.addColorStop(1, `rgba(220,20,10,${(0.5 + 0.12 * pulse).toFixed(3)})`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, f.w, f.h);
    ctx.restore();
    if (!face) return;

    // Flames grow with the smile.
    const smiling = clamp((face.smile - 0.25) * 2.5, 0, 1) || (f.input.held ? 1 : 0);
    s.fire += (smiling - s.fire) * (1 - Math.exp(-f.dt * 6));
    s.acc += f.dt * s.fire * 46;
    while (s.acc >= 1) {
      s.acc -= 1;
      if (s.flames.length >= MAX_FLAMES) break;
      // Around the head: sides and the top.
      const a = Math.PI * (1.05 + Math.random() * 0.9);
      s.flames.push({
        x: face.center.x + Math.cos(a) * face.scale * (1.15 + Math.random() * 0.35),
        y: face.center.y + Math.sin(a) * face.scale * (1.3 + Math.random() * 0.2) + face.scale * 0.35,
        vy: face.scale * (0.9 + Math.random() * 0.9),
        r: face.scale * (0.1 + Math.random() * 0.1),
        life: 0,
        max: 0.8 + Math.random() * 0.6,
      });
    }
    ctx.save();
        for (let i = s.flames.length - 1; i >= 0; i--) {
      const p = s.flames[i];
      p.life += f.dt;
      if (p.life >= p.max) {
        s.flames.splice(i, 1);
        continue;
      }
      p.y -= p.vy * f.dt;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, (1 - k) * 1.6) * 0.95;
      flame(ctx, p.x, p.y, p.r * (1 - k * 0.6), p.life);
    }
    ctx.restore();

    withTemplate(ctx, face, c => c.drawImage(f.img('devil') ?? s.horns, 0, 0, 1024, 1024));
  },
};
