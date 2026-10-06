// Fancy: a grand handlebar mustache and a gold monocle. Raise your eyebrows
// (or press Space) and the monocle pops off, falls out of the picture, and a
// new one fades in a couple of seconds later.

import { withTemplate, TEMPLATE } from '../js/face.js';

const GRAVITY = 14;   // eye-distances per second squared
const RETURN = 2;     // seconds until a new monocle fades in
const RING = { x: 632, y: 520 };

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

// Stamps tapering circles along a curly centre line to make the mustache.
function drawMustache(c) {
  const segs = [
    [[512, 686], [470, 668], [400, 690], [350, 716]],
    [[350, 716], [312, 734], [282, 690], [304, 650]],
    [[304, 650], [320, 624], [352, 634], [346, 656]],
  ];
  const line = [];
  segs.forEach((sg, k) => {
    for (let i = 0; i < 24; i++) line.push({ ...bez(...sg, i / 24), k: (k + i / 24) / 3 });
  });
  const radius = k => 34 * (1 - k) ** 0.8 + 6;
  const stamp = (mx, grow, fill) => {
    c.fillStyle = fill;
    for (const p of line) {
      c.beginPath();
      c.arc(mx ? 1024 - p.x : p.x, p.y, radius(p.k) + grow, 0, Math.PI * 2);
      c.fill();
    }
  };
  stamp(false, 8, '#3a200c');
  stamp(true, 8, '#3a200c');
  const g = c.createLinearGradient(0, 640, 0, 740);
  g.addColorStop(0, '#8a5a30');
  g.addColorStop(1, '#4f2c12');
  stamp(false, 0, g);
  stamp(true, 0, g);
  // Glossy streaks along the top of each half.
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,225,180,0.55)';
  c.lineWidth = 9;
  for (const mx of [false, true]) {
    c.beginPath();
    for (let i = 0; i < 24; i++) {
      const p = line[i];
      const x = mx ? 1024 - p.x : p.x;
      if (i) c.lineTo(x, p.y - radius(p.k) * 0.45);
      else c.moveTo(x, p.y - radius(p.k) * 0.45);
    }
    c.stroke();
  }
}

// Gold monocle on the image-right eye with a chain down to (700, 900).
function drawMonocle(c) {
  c.lineCap = 'round';
  // Chain as little links.
  const a = [640, 600], b = [590, 780], d = [700, 900];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26, u = 1 - t;
    const x = u * u * a[0] + 2 * u * t * b[0] + t * t * d[0];
    const y = u * u * a[1] + 2 * u * t * b[1] + t * t * d[1];
    c.beginPath();
    c.ellipse(x, y, 10, 6, Math.atan2(2 * u * (b[1] - a[1]) + 2 * t * (d[1] - b[1]), 2 * u * (b[0] - a[0]) + 2 * t * (d[0] - b[0])), 0, Math.PI * 2);
    c.lineWidth = 5;
    c.strokeStyle = '#a8650a';
    c.stroke();
    c.fillStyle = i % 2 ? '#ffd24a' : '#f0a81c';
    c.fill();
  }
  // Glass.
  c.beginPath();
  c.arc(RING.x, RING.y, 74, 0, Math.PI * 2);
  c.fillStyle = 'rgba(190,235,255,0.22)';
  c.fill();
  // Ring.
  const g = c.createLinearGradient(RING.x - 80, RING.y - 80, RING.x + 80, RING.y + 80);
  g.addColorStop(0, '#fff09a');
  g.addColorStop(0.5, '#ffc928');
  g.addColorStop(1, '#c97a0c');
  c.beginPath();
  c.arc(RING.x, RING.y, 80, 0, Math.PI * 2);
  c.lineWidth = 20;
  c.strokeStyle = '#a8650a';
  c.stroke();
  c.lineWidth = 12;
  c.strokeStyle = g;
  c.stroke();
  // Glass glint.
  c.beginPath();
  c.arc(RING.x, RING.y, 52, Math.PI * 1.1, Math.PI * 1.45);
  c.lineWidth = 10;
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.stroke();
  c.beginPath();
  c.arc(RING.x + 24, RING.y + 30, 6, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.fill();
}

export default {
  id: 'fancy',
  name: 'Fancy',
  emoji: '🧐',
  hint: 'Raise your eyebrows to drop your monocle',
  needs: { face: true },

  start(s) {
    s.mode = 'on';        // on | fall | wait | fade
    s.fall = null;
    s.alpha = 1;
    s.since = 0;
    s.mustache = bake(drawMustache);
    s.monocle = bake(drawMonocle);
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.mustache ??= bake(drawMustache);
    s.monocle ??= bake(drawMonocle);
    s.mode ??= 'on';
    s.alpha ??= 1;
    const mon = f.img('monocle') ?? s.monocle;

    if (face) {
      withTemplate(ctx, face, c => c.drawImage(f.img('mustache') ?? s.mustache, 0, 0, 1024, 1024));
    }

    if (s.mode === 'on' && face && (face.browUp > 0.5 || f.input.pressed)) {
      // Pop: the monocle keeps its current place, size and tilt and falls from there.
      const p = {
        x: face.eyeMid.x + (RING.x - 512) * face.scale / 240 * Math.cos(face.roll),
        y: face.eyeMid.y + (RING.x - 512) * face.scale / 240 * Math.sin(face.roll),
      };
      s.fall = {
        x: p.x, y: p.y, scale: face.scale, roll: face.roll,
        vx: face.scale * (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.8),
        vy: -face.scale * 3.2,
        spin: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4),
      };
      s.mode = 'fall';
      s.since = 0;
      f.sfx('bounce');
    }

    if (s.mode === 'on' && face) {
      withTemplate(ctx, face, c => c.drawImage(mon, 0, 0, 1024, 1024));
    } else if (s.mode === 'fall' || s.mode === 'wait') {
      s.since += f.dt;
      const m = s.fall;
      if (m && s.mode === 'fall') {
        m.vy += face ? face.scale * GRAVITY * f.dt : m.scale * GRAVITY * f.dt;
        m.x += m.vx * f.dt;
        m.y += m.vy * f.dt;
        m.roll += m.spin * f.dt;
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.roll);
        const k = m.scale / TEMPLATE.eyeDist;
        ctx.scale(k, k);
        ctx.translate(-RING.x, -RING.y);
        ctx.drawImage(mon, 0, 0, 1024, 1024);
        ctx.restore();
        if (m.y - m.scale * 4 > f.h) s.mode = 'wait';
      }
      if (s.since > RETURN && s.mode === 'wait' && face) {
        s.mode = 'fade';
        s.alpha = 0;
      }
    }
    if (s.mode === 'fade' && face) {
      s.alpha = Math.min(1, s.alpha + f.dt / 0.4);
      ctx.save();
      ctx.globalAlpha = s.alpha;
      withTemplate(ctx, face, c => c.drawImage(mon, 0, 0, 1024, 1024));
      ctx.restore();
      if (s.alpha >= 1) s.mode = 'on';
    }
  },
};
