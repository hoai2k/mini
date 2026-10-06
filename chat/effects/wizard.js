// Wizard: a tall starry hat and magic sparkles orbiting your head. Raise your
// eyebrows (or press Space) to cast a spell: a burst of stars and a little
// lightning shoots from between your eyes.

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

function star5(c, x, y, r, rot = 0) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

// A tall, slightly bent hat: brim at y = 260, tip near the top edge.
function drawHat(c) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // Cone.
  c.beginPath();
  c.moveTo(300, 262);
  c.bezierCurveTo(330, 200, 410, 150, 440, 100);
  c.bezierCurveTo(470, 50, 540, 20, 640, 14);
  c.bezierCurveTo(690, 10, 730, 30, 742, 60);
  c.bezierCurveTo(700, 56, 650, 80, 624, 130);
  c.bezierCurveTo(600, 180, 700, 220, 724, 262);
  c.closePath();
  const g = c.createLinearGradient(300, 20, 740, 260);
  g.addColorStop(0, '#5a58e0');
  g.addColorStop(0.55, '#34308f');
  g.addColorStop(1, '#1d1a5a');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 16;
  c.strokeStyle = '#100e3a';
  c.stroke();
  // Brim.
  c.beginPath();
  c.ellipse(512, 262, 300, 52, 0, 0, Math.PI * 2);
  const bg = c.createLinearGradient(0, 210, 0, 314);
  bg.addColorStop(0, '#4a46c8');
  bg.addColorStop(1, '#24206c');
  c.fillStyle = bg;
  c.fill();
  c.lineWidth = 16;
  c.stroke();
  // Gold band at the base of the cone.
  c.beginPath();
  c.moveTo(322, 238);
  c.quadraticCurveTo(512, 292, 710, 238);
  c.lineWidth = 22;
  c.strokeStyle = '#8a5a0a';
  c.stroke();
  c.lineWidth = 12;
  c.strokeStyle = '#ffc928';
  c.stroke();
  // Stars and a moon.
  c.fillStyle = '#ffe36a';
  c.strokeStyle = '#c98f10';
  c.lineWidth = 5;
  for (const [x, y, r, rot] of [[430, 190, 24, 0.2], [560, 160, 18, 0.5], [640, 70, 20, 0], [520, 90, 14, 0.3], [660, 210, 16, 0.4], [380, 230, 12, 0.1], [500, 230, 11, 0]]) {
    star5(c, x, y, r, rot);
    c.fill();
    c.stroke();
  }
  c.beginPath();
  c.arc(590, 120, 24, 0.5, Math.PI * 2 - 0.5);
  c.arc(602, 120, 17, Math.PI * 2 - 0.5, 0.5, true);
  c.closePath();
  c.fill();
  c.stroke();
  // Shine on the cone.
  c.beginPath();
  c.moveTo(370, 210);
  c.quadraticCurveTo(420, 140, 470, 90);
  c.lineWidth = 11;
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.stroke();
}

const MAX_BURST = 90;
const ORBITS = 9;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function glowStar(ctx, x, y, r, rot, color) {
  ctx.fillStyle = color;
  star5(ctx, x, y, r, rot);
  ctx.fill();
}

export default {
  id: 'wizard',
  name: 'Wizard',
  emoji: '🧙',
  hint: 'Raise your eyebrows to cast a spell',
  needs: { face: true },

  start(s) {
    s.hat = bake(drawHat);
    s.burst = [];
    s.bolt = null;
    s.cool = 0;
    s.armed = true;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.hat ??= bake(drawHat);
    s.burst ??= [];
    s.cool = Math.max(0, (s.cool ?? 0) - f.dt);
    const casting = (face && face.browUp > 0.5) || f.input.pressed;
    // One spell per raise of the eyebrows.
    if (casting && s.armed !== false && s.cool <= 0) {
      s.armed = false;
      s.cool = 0.7;
      s.cast = true;
    }
    if (!casting) s.armed = true;
    if (!face) return;

    if (s.cast) {
      s.cast = false;
      f.sfx('zap');
      const o = face.eyeMid;
      for (let i = 0; i < 28 && s.burst.length < MAX_BURST; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
        const sp = face.scale * (1.5 + Math.random() * 3);
        s.burst.push({
          x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: face.scale * (0.07 + Math.random() * 0.1), life: 0, max: 0.6 + Math.random() * 0.6,
          rot: Math.random() * 6.28, hue: ['#fff6a8', '#ffd84a', '#c9a8ff', '#ffffff'][(Math.random() * 4) | 0],
        });
      }
      // A jagged lightning bolt up and out of the eyes.
      const pts = [];
      let x = o.x, y = o.y;
      const dir = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      for (let i = 0; i < 9; i++) {
        pts.push([x, y]);
        const a = dir + (Math.random() - 0.5) * 1.1;
        x += Math.cos(a) * face.scale * 0.36;
        y += Math.sin(a) * face.scale * 0.36;
      }
      s.bolt = { pts, life: 0 };
    }

    withTemplate(ctx, face, c => c.drawImage(f.img('wizard-hat') ?? s.hat, 0, 0, 1024, 1024));

    ctx.save();
    // Sparkles orbiting the head on a tilted ring, front and back.
    const cx = face.center.x, cy = face.center.y - face.scale * 0.15;
    ctx.shadowColor = 'rgba(120,70,255,0.9)';
    ctx.shadowBlur = face.scale * 0.15;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, face.scale * 0.025);
    for (let i = 0; i < ORBITS; i++) {
      const a = f.t * 1.4 + (i / ORBITS) * Math.PI * 2;
      const x = cx + Math.cos(a) * face.scale * 1.6;
      const y = cy + Math.sin(a) * face.scale * 0.45 + Math.sin(a * 2 + i) * face.scale * 0.35 - face.scale * 0.5;
      const tw = 0.6 + 0.4 * Math.sin(f.t * 6 + i * 2);
      ctx.fillStyle = i % 2 ? '#ffe36a' : '#e2d0ff';
      ctx.strokeStyle = i % 2 ? '#c98f10' : '#7a52d8';
      star5(ctx, x, y, face.scale * (0.1 + 0.06 * tw), a * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // The spell.
    if (s.bolt) {
      s.bolt.life += f.dt;
      const k = 1 - s.bolt.life / 0.5;
      if (k <= 0) s.bolt = null;
      else {
        ctx.globalAlpha = clamp(k * 2, 0, 1);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        s.bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.strokeStyle = 'rgba(150,120,255,0.8)';
        ctx.lineWidth = face.scale * 0.16;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = face.scale * 0.05;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    for (let i = s.burst.length - 1; i >= 0; i--) {
      const p = s.burst[i];
      p.life += f.dt;
      if (p.life >= p.max) {
        s.burst.splice(i, 1);
        continue;
      }
      p.x += p.vx * f.dt;
      p.y += p.vy * f.dt;
      p.vx *= Math.exp(-f.dt * 1.5);
      p.vy = p.vy * Math.exp(-f.dt * 1.5) + face.scale * 1.5 * f.dt;
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = clamp(k * 1.6, 0, 1);
      glowStar(ctx, p.x, p.y, p.r * (0.4 + k), p.rot + p.life * 4, p.hue);
    }
    ctx.restore();
  },
};
