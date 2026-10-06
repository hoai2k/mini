// Dragon: horns on your head. Open your mouth (or hold Space) and you breathe
// a stream of fire that cools from yellow to red to grey smoke.

import { withTemplate } from '../js/face.js';

const MAX_PARTICLES = 250;
const SFX_GAP = 0.45; // seconds between fire sounds

function bake(draw, w = 512, h = 512, sw = 1024, sh = 1024) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.scale(w / sw, h / sh);
  draw(c);
  return cv;
}

const bez = (a, b, c, d, t) => {
  const u = 1 - t;
  return {
    x: u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    y: u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  };
};

// Two ivory-and-orange horns sweeping up and outwards from the top of the head.
function drawHorns(c) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // Outer edge and inner edge, both running from the base to the tip.
  const outer = [[366, 262], [316, 180], [300, 112], [226, 38]];
  const inner = [[476, 262], [476, 190], [392, 106], [226, 38]];
  for (const mirror of [false, true]) {
    c.save();
    if (mirror) {
      c.translate(1024, 0);
      c.scale(-1, 1);
    }
    c.beginPath();
    c.moveTo(...outer[0]);
    c.bezierCurveTo(...outer[1], ...outer[2], ...outer[3]);
    c.bezierCurveTo(...inner[2], ...inner[1], ...inner[0]);
    c.closePath();
    const g = c.createLinearGradient(430, 262, 250, 40);
    g.addColorStop(0, '#ff8a1f');
    g.addColorStop(0.45, '#ffc062');
    g.addColorStop(1, '#fff4d6');
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 16;
    c.strokeStyle = '#a8480e';
    c.stroke();
    // Scaly ridges across the horn.
    c.lineWidth = 8;
    c.strokeStyle = 'rgba(168,72,14,0.75)';
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      const p = bez(...outer, t);
      const q = bez(inner[0], inner[1], inner[2], inner[3], t);
      c.beginPath();
      c.moveTo(p.x + (q.x - p.x) * 0.1, p.y + (q.y - p.y) * 0.1);
      c.lineTo(p.x + (q.x - p.x) * 0.9, p.y + (q.y - p.y) * 0.9);
      c.stroke();
    }
    // Glossy streak.
    c.beginPath();
    const a = bez(...outer, 0.15);
    const b = bez(...outer, 0.7);
    c.moveTo(a.x + 12, a.y);
    c.quadraticCurveTo(a.x + 6, (a.y + b.y) / 2, b.x + 12, b.y + 10);
    c.lineWidth = 9;
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.stroke();
    c.restore();
  }
}

// Flame colour by age: yellow, orange, red, then grey smoke.
const STOPS = [
  [0, 255, 236, 130],
  [0.3, 255, 150, 40],
  [0.6, 225, 50, 25],
  [0.8, 110, 100, 100],
  [1, 70, 70, 74],
];
function colour(u) {
  for (let i = 1; i < STOPS.length; i++) {
    if (u <= STOPS[i][0]) {
      const a = STOPS[i - 1], b = STOPS[i];
      const k = (u - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
    }
  }
  return STOPS[STOPS.length - 1].slice(1);
}

function puff(ctx, p, u, alpha) {
  const [r, g, b] = colour(u);
  const rad = p.size0 + (p.size1 - p.size0) * u;
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
  grad.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},${alpha})`);
  grad.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fill();
}

export default {
  id: 'dragon',
  name: 'Dragon',
  emoji: '🐉',
  hint: 'Open wide to breathe fire',
  needs: { face: true },

  start(s) {
    s.parts = [];
    s.acc = 0;
    s.sfxAt = -10;
    s.horns = bake(drawHorns);
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.horns ??= bake(drawHorns);
    s.parts ??= [];
    s.acc ??= 0;
    s.sfxAt ??= -10;

    if (face) {
      withTemplate(ctx, face, c => c.drawImage(f.img('dragon-horns') ?? s.horns, 0, 0, 1024, 1024));

      if (face.mouthOpen > 0.3 || f.input.held) {
        const open = f.input.held ? 1 : Math.min(1, face.mouthOpen * 1.3);
        s.acc += f.dt * (90 + 130 * open);
        // The jet points down the face, so it follows the head tilt.
        const dir = Math.PI / 2 + face.roll;
        while (s.acc >= 1) {
          s.acc -= 1;
          if (s.parts.length >= MAX_PARTICLES) break;
          const a = dir + (Math.random() - 0.5) * 1.0;
          const sp = face.scale * (2.2 + Math.random() * 2.4) * (0.7 + open * 0.5);
          s.parts.push({
            x: face.mouth.x + (Math.random() - 0.5) * face.scale * 0.2,
            y: face.mouth.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            age: 0,
            life: 0.55 + Math.random() * 0.5,
            size0: face.scale * 0.1,
            size1: face.scale * (0.4 + Math.random() * 0.25),
          });
        }
        if (f.t - s.sfxAt > SFX_GAP) {
          s.sfxAt = f.t;
          f.sfx('fire');
        }
      }
    }

    // Flames burn with a body of solid colour plus additive light on top, then
    // turn into ordinary grey smoke.
    const flames = [];
    const smoke = [];
    s.parts = s.parts.filter(p => {
      p.age += f.dt;
      if (p.age >= p.life) return false;
      const u = p.age / p.life;
      const drag = Math.exp(-f.dt * 1.8);
      p.vx *= drag;
      p.vy = p.vy * drag - f.dt * 60;
      p.x += p.vx * f.dt;
      p.y += p.vy * f.dt;
      (u < 0.7 ? flames : smoke).push([p, u]);
      return true;
    });
    for (const [p, u] of flames) puff(ctx, p, u, 0.5 * Math.min(1, (1 - u) * 1.8));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [p, u] of flames) puff(ctx, p, u, 0.2 * Math.min(1, (1 - u) * 1.8));
    ctx.restore();
    for (const [p, u] of smoke) puff(ctx, p, u, 0.4 * (1 - u) / 0.3);
  },
};
