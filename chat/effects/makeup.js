// Glam: lipstick, rosy blush, winged eyeliner and sparkling cheekbones drawn
// on the face landmarks, with a soft skin-smoothing glow. Smile and the
// sparkles twinkle.

import { templatePoint } from '../js/face.js';

// MediaPipe face-mesh landmark groups.
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
// Upper lid from the outer corner to the inner corner, for each eye.
const LID_A = [33, 246, 161, 160, 159, 158, 157, 173, 133];
const LID_B = [263, 466, 388, 387, 386, 385, 384, 398, 362];
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

const MAX_SPARKS = 36;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// The preview face has no real mesh, so check that the landmarks sit where a
// face's lips and eye corners should; otherwise fall back to template shapes.
function meshOk(face) {
  const p = face.pts;
  if (!p || p.length < 478) return false;
  const near = (i, tx, ty) => {
    const q = templatePoint(face, tx, ty);
    return Math.hypot(p[i].x - q.x, p[i].y - q.y) < face.scale * 0.5;
  };
  const lipsOk = near(0, 512, 722) && near(17, 512, 790);
  const eyes = (near(33, 692, 520) && near(263, 332, 520)) || (near(33, 332, 520) && near(263, 692, 520));
  return lipsOk && eyes;
}

const ellipsePoints = (cx, cy, rx, ry, n = 20) =>
  Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry]);

// Everything the effect needs, from the mesh or from template stand-ins.
function landmarks(face) {
  const T = (x, y) => templatePoint(face, x, y);
  if (meshOk(face)) {
    const g = ids => ids.map(i => face.pts[i]);
    return {
      outer: g(LIPS_OUTER), inner: g(LIPS_INNER), lidA: g(LID_A), lidB: g(LID_B),
      cheekL: face.pts[205], cheekR: face.pts[425], boneL: face.pts[117], boneR: face.pts[346],
      oval: g(OVAL),
    };
  }
  const open = face.mouthOpen, smile = face.smile, pucker = face.pucker;
  const my = 740 + open * 30;
  const rx = 90 * (1 - pucker * 0.65) + smile * 25;
  const ry = 12 + open * 60 + pucker * 18;
  const lid = (ex, dir) => Array.from({ length: 9 }, (_, i) => {
    const u = i / 8; // outer corner to inner corner
    const x = ex + dir * (60 - u * 120);
    return T(x, 520 - 30 * Math.sin(u * Math.PI) + 2);
  });
  return {
    outer: ellipsePoints(512, my, rx + 6, ry + 8).map(([x, y]) => T(x, y)),
    inner: open > 0.1 ? ellipsePoints(512, my, rx - 10, ry - 12).map(([x, y]) => T(x, y)) : null,
    lidA: lid(632, 1), lidB: lid(392, -1),
    cheekL: T(340, 650), cheekR: T(684, 650), boneL: T(330, 590), boneR: T(694, 590),
    oval: ellipsePoints(512, 570, 235, 320, 36).map(([x, y]) => T(x, y)),
  };
}

function path(ctx, pts) {
  pts.forEach((p, i) => {
    const x = p.x ?? p[0], y = p.y ?? p[1];
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
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

// Eyeliner along the upper lid with a flick past the outer corner.
function liner(ctx, face, lid) {
  const outer = lid[0], inner = lid[lid.length - 1];
  const dx = outer.x - inner.x, dy = outer.y - inner.y;
  const d = Math.hypot(dx, dy) || 1;
  const up = { x: Math.sin(face.roll), y: -Math.cos(face.roll) };
  const tip = {
    x: outer.x + (dx / d) * face.scale * 0.2 + up.x * face.scale * 0.13,
    y: outer.y + (dy / d) * face.scale * 0.2 + up.y * face.scale * 0.13,
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a1024';
  // The wing: a thin triangle from the lid to the tip.
  ctx.beginPath();
  path(ctx, lid.slice(0, 5));
  ctx.lineTo(tip.x, tip.y);
  ctx.lineTo(outer.x - up.x * face.scale * 0.018, outer.y - up.y * face.scale * 0.018);
  ctx.closePath();
  ctx.fillStyle = '#1a1024';
  ctx.fill();
  ctx.lineWidth = face.scale * 0.035;
  ctx.beginPath();
  path(ctx, lid);
  ctx.stroke();
}

export default {
  id: 'makeup',
  name: 'Glam',
  emoji: '💄',
  hint: 'Glam mode',
  needs: { face: true },

  start(s) {
    s.sparks = [];
    s.acc = 0;
    s.happy = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.sparks ??= [];
    s.acc ??= 0;
    if (!face) return;
    const L = landmarks(face);
    const sc = face.scale;
    s.happy = (s.happy ?? 0) + (clamp((face.smile - 0.2) * 2.5, 0, 1) - (s.happy ?? 0)) * (1 - Math.exp(-f.dt * 6));

    // Skin smoothing: a lightly blurred copy of the camera inside the face
    // oval, plus a warm glow. (Browsers without ctx.filter just get the glow.)
    ctx.save();
    ctx.beginPath();
    path(ctx, L.oval);
    ctx.closePath();
    ctx.clip();
    const cam = 'filter' in ctx ? f.camera?.() : null;
    if (cam) {
      const b = face.box;
      ctx.filter = `blur(${Math.max(2, sc * 0.045).toFixed(1)}px)`;
      ctx.globalAlpha = 0.45;
      ctx.drawImage(cam, b.x - 8, b.y - 8, b.w + 16, b.h + 16, b.x - 8, b.y - 8, b.w + 16, b.h + 16);
      ctx.filter = 'none';
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createRadialGradient(face.center.x, face.center.y, 0, face.center.x, face.center.y, sc * 1.8);
    g.addColorStop(0, 'rgba(255,225,205,0.7)');
    g.addColorStop(1, 'rgba(255,225,205,0)');
    ctx.fillStyle = g;
    ctx.fillRect(face.center.x - sc * 2, face.center.y - sc * 2, sc * 4, sc * 4);
    ctx.restore();

    // Blush.
    ctx.save();
    for (const c of [L.cheekL, L.cheekR]) {
      const bg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, sc * 0.6);
      bg.addColorStop(0, 'rgba(255,92,130,0.5)');
      bg.addColorStop(0.6, 'rgba(255,120,150,0.22)');
      bg.addColorStop(1, 'rgba(255,120,150,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(c.x - sc, c.y - sc, sc * 2, sc * 2);
    }
    ctx.restore();

    // Lipstick: multiplied colour, then a soft sheen, with the mouth opening cut out.
    ctx.save();
    ctx.beginPath();
    path(ctx, L.outer);
    ctx.closePath();
    if (L.inner) {
      path(ctx, L.inner);
      ctx.closePath();
    }
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#e0245e';
    ctx.fill('evenodd');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(255,60,110,0.8)';
    ctx.fill('evenodd');
    ctx.restore();
    // Gloss highlight on the lower lip.
    ctx.save();
    const ml = L.outer.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
    ml.x /= L.outer.length;
    ml.y /= L.outer.length;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    ctx.translate(ml.x - sc * 0.08, ml.y + sc * (0.1 + face.mouthOpen * 0.2));
    ctx.rotate(face.roll);
    ctx.beginPath();
    ctx.ellipse(0, 0, sc * 0.1, sc * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    liner(ctx, face, L.lidA);
    liner(ctx, face, L.lidB);

    // Glitter on the cheekbones: a steady sparkle plus twinkles when you smile.
    ctx.save();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = sc * 0.1;
    ctx.fillStyle = '#fffbe8';
    for (const [i, c] of [L.boneL, L.boneR].entries()) {
      const k = 0.6 + 0.4 * Math.sin(f.t * 3 + i * 2);
      star(ctx, c.x, c.y, sc * (0.06 + 0.07 * k));
      star(ctx, c.x + (i ? 1 : -1) * sc * 0.12, c.y + sc * 0.12, sc * 0.03 * (1 + k));
    }
    s.acc += f.dt * s.happy * 12;
    while (s.acc >= 1) {
      s.acc -= 1;
      if (s.sparks.length >= MAX_SPARKS) break;
      const c = Math.random() < 0.5 ? L.boneL : L.boneR;
      s.sparks.push({
        x: c.x + (Math.random() - 0.5) * sc * 0.7,
        y: c.y + (Math.random() - 0.3) * sc * 0.6,
        r: sc * (0.04 + Math.random() * 0.07), life: 0, max: 0.5 + Math.random() * 0.6,
      });
    }
    for (let i = s.sparks.length - 1; i >= 0; i--) {
      const p = s.sparks[i];
      p.life += f.dt;
      if (p.life >= p.max) {
        s.sparks.splice(i, 1);
        continue;
      }
      star(ctx, p.x, p.y, p.r * (0.2 + Math.sin((p.life / p.max) * Math.PI)));
    }
    ctx.restore();
  },
};
