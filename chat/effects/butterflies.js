// Butterflies: six butterflies flutter around your head, sometimes landing on
// your hair for a moment. Open your mouth and they scatter.

import { templatePoint } from '../js/face.js';

function bake(draw, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'));
  return cv;
}

// Butterfly seen from above, wings spread, in a 256 x 256 canvas.
function drawButterfly(c) {
  c.translate(128, 128);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    // Upper wing.
    c.beginPath();
    c.moveTo(6, -6);
    c.bezierCurveTo(30, -70, 80, -118, 116, -92);
    c.bezierCurveTo(138, -60, 120, -14, 94, 8);
    c.bezierCurveTo(60, 16, 28, 8, 6, -6);
    c.closePath();
    const ug = c.createLinearGradient(10, -100, 110, 10);
    ug.addColorStop(0, '#6fd0ff');
    ug.addColorStop(1, '#3b6df0');
    c.fillStyle = ug;
    c.fill();
    c.lineWidth = 8;
    c.strokeStyle = '#27409e';
    c.stroke();
    c.beginPath();
    c.arc(88, -52, 17, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
    c.beginPath();
    c.arc(88, -52, 8, 0, Math.PI * 2);
    c.fillStyle = '#ff5fa8';
    c.fill();
    // Lower wing.
    c.beginPath();
    c.moveTo(8, 6);
    c.bezierCurveTo(50, 10, 92, 22, 88, 62);
    c.bezierCurveTo(78, 108, 30, 110, 12, 62);
    c.bezierCurveTo(8, 40, 8, 24, 8, 6);
    c.closePath();
    const lg = c.createLinearGradient(10, 10, 80, 110);
    lg.addColorStop(0, '#ff9ccc');
    lg.addColorStop(1, '#ee4a9a');
    c.fillStyle = lg;
    c.fill();
    c.lineWidth = 8;
    c.strokeStyle = '#a02470';
    c.stroke();
    c.beginPath();
    c.ellipse(52, 62, 12, 16, 0.3, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fill();
    c.beginPath();
    c.ellipse(40, -50, 10, 22, 0.7, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fill();
    c.restore();
  }
  // Body and antennae.
  c.beginPath();
  c.ellipse(0, 4, 9, 54, 0, 0, Math.PI * 2);
  c.fillStyle = '#3a2455';
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = '#1c1030';
  c.stroke();
  c.lineWidth = 4;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 3, -46);
    c.quadraticCurveTo(s * 18, -84, s * 34, -92);
    c.stroke();
    c.beginPath();
    c.arc(s * 34, -92, 5, 0, Math.PI * 2);
    c.fillStyle = '#1c1030';
    c.fill();
  }
}

// Places to land on the head and hair, in face-template coordinates.
const PERCHES = [[430, 250], [600, 240], [512, 214], [350, 320], [680, 322], [300, 400], [730, 410], [470, 236]];
const N = 6;

function makeFly(i) {
  return {
    x: 0, y: 0, vx: 0, vy: 0, ang: 0,
    ph: Math.random() * 6.28,          // path phase
    sp: 0.6 + Math.random() * 0.5,     // path speed
    rx: 1.4 + Math.random() * 0.9,     // path radii in eye distances
    ry: 1.5 + Math.random() * 0.9,
    flap: Math.random() * 6.28,
    size: 0.55 + Math.random() * 0.25,
    mode: 'orbit',
    timer: 2 + Math.random() * 4 + i,
    perch: i % PERCHES.length,
    land: 0,
    placed: false,
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default {
  id: 'butterflies',
  name: 'Butterflies',
  emoji: '🦋',
  hint: 'Open your mouth to scatter them',
  needs: { face: true },

  start(s) {
    s.art = bake(drawButterfly, 256, 256);
    s.flies = Array.from({ length: N }, (_, i) => makeFly(i));
    s.scatter = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.art ??= bake(drawButterfly, 256, 256);
    s.flies ??= Array.from({ length: N }, (_, i) => makeFly(i));
    s.scatter ??= 0;
    if (!face) return;
    const dt = Math.min(f.dt, 0.05);
    const loud = face.mouthOpen > 0.35 || f.input.held;
    if (loud) s.scatter = 1.6;
    else s.scatter = Math.max(0, s.scatter - dt);
    const scattering = s.scatter > 0;
    const art = f.img('butterfly') ?? s.art;
    const cx = face.center.x, cy = face.center.y - face.scale * 0.15;

    s.flies.forEach((b, i) => {
      b.ph += dt * b.sp;
      b.flap += dt * (b.mode === 'perch' ? 5 : 22);
      // Where it wants to be: on its loop around the head, or a perch.
      const loopX = cx + Math.sin(b.ph * 1.0 + i) * face.scale * b.rx + Math.cos(b.ph * 0.37) * face.scale * 0.2;
      const loopY = cy + Math.sin(b.ph * 1.7 + i * 2) * face.scale * b.ry * 0.7 - face.scale * 0.25;
      let tx = loopX, ty = loopY, k = 3;
      if (scattering) {
        // Fly away from the face and off the picture.
        const dx = b.x - cx, dy = b.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        tx = b.x + (dx / d) * face.scale * 4 + Math.sin(i) * face.scale;
        ty = b.y + (dy / d) * face.scale * 4 - face.scale * 1.5;
        k = 1.4;
        b.mode = 'orbit';
        b.timer = 2.5 + Math.random() * 3;
        b.land = 0;
      } else {
        b.timer -= dt;
        if (b.mode === 'orbit' && b.timer <= 0) {
          b.mode = 'perch';
          b.timer = 1.8 + Math.random() * 2;
          b.perch = (b.perch + 1 + ((Math.random() * 3) | 0)) % PERCHES.length;
        } else if (b.mode === 'perch' && b.timer <= 0) {
          b.mode = 'orbit';
          b.timer = 3 + Math.random() * 4;
        }
        if (b.mode === 'perch') {
          const [px, py] = PERCHES[b.perch];
          const p = templatePoint(face, px, py);
          // Only settle once close; until then fly towards the spot.
          tx = p.x;
          ty = p.y;
          k = 4;
        }
      }
      if (!b.placed) {
        b.x = clamp(loopX, 0, f.w);
        b.y = loopY;
        b.placed = true;
      }
      const nx = b.x + (tx - b.x) * (1 - Math.exp(-dt * k));
      const ny = b.y + (ty - b.y) * (1 - Math.exp(-dt * k));
      const vx = (nx - b.x) / Math.max(dt, 0.001), vy = (ny - b.y) / Math.max(dt, 0.001);
      b.x = nx;
      b.y = ny;
      const settled = b.mode === 'perch' && Math.hypot(tx - b.x, ty - b.y) < face.scale * 0.15;
      b.land += ((settled ? 1 : 0) - b.land) * (1 - Math.exp(-dt * 8));
      // Face where it is flying; settle to the head's tilt when landed.
      const speed = Math.hypot(vx, vy);
      const heading = speed > face.scale * 0.3 ? Math.atan2(vy, vx) + Math.PI / 2 : b.ang;
      const want = b.land > 0.5 ? face.roll : heading;
      let d = want - b.ang;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      b.ang += d * (1 - Math.exp(-dt * 8));
      // Drop butterflies that wandered far offscreen back onto their loop.
      if (b.x < -face.scale * 4 || b.x > f.w + face.scale * 4 || b.y < -face.scale * 4 || b.y > f.h + face.scale * 4) {
        b.placed = false;
      }

      const sz = face.scale * b.size;
      // Wings flap by squashing the width.
      const wing = 0.3 + 0.7 * Math.abs(Math.cos(b.flap));
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang + Math.sin(b.flap * 0.5) * 0.08);
      ctx.scale(wing, 1);
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 6;
      ctx.drawImage(art, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    });
  },
};
