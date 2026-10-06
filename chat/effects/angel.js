// Angel: a glowing halo that bobs above your head, small feathery wings at
// your shoulders and a soft white glow. Smile and sparkles twinkle around you.

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

// Halo ring centred at (512, 140), about 360 wide, seen slightly from the front.
function drawHalo(c) {
  const glow = c.createRadialGradient(512, 140, 40, 512, 140, 260);
  glow.addColorStop(0, 'rgba(255,240,150,0.55)');
  glow.addColorStop(1, 'rgba(255,240,150,0)');
  c.fillStyle = glow;
  c.fillRect(200, -120, 624, 520);
  c.beginPath();
  c.ellipse(512, 140, 180, 52, 0, 0, Math.PI * 2);
  const g = c.createLinearGradient(0, 90, 0, 190);
  g.addColorStop(0, '#fff7b0');
  g.addColorStop(0.5, '#ffd83a');
  g.addColorStop(1, '#f0a410');
  c.lineWidth = 34;
  c.strokeStyle = '#b87008';
  c.stroke();
  c.lineWidth = 22;
  c.strokeStyle = g;
  c.stroke();
  c.beginPath();
  c.ellipse(512, 140, 180, 52, 0, Math.PI * 1.1, Math.PI * 1.55);
  c.lineWidth = 8;
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.stroke();
}

// One wing in a local frame: root at (0, 0), spreading toward -x and up.
function wing(c, flap) {
  c.lineJoin = 'round';
  const rows = [
    { n: 6, len: 330, wid: 52, a0: -2.95, a1: -1.85, shade: 0 },
    { n: 6, len: 250, wid: 50, a0: -2.85, a1: -1.8, shade: 1 },
    { n: 5, len: 170, wid: 46, a0: -2.7, a1: -1.75, shade: 2 },
  ];
  for (const row of rows) {
    for (let i = 0; i < row.n; i++) {
      const u = i / (row.n - 1);
      const a = row.a0 + (row.a1 - row.a0) * u + flap * (0.4 + u * 0.6);
      c.save();
      c.rotate(a);
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(row.len * 0.3, -row.wid, row.len * 0.8, -row.wid * 0.7, row.len, 0);
      c.bezierCurveTo(row.len * 0.8, row.wid * 0.7, row.len * 0.3, row.wid, 0, 0);
      c.fillStyle = ['#ffffff', '#f4f8ff', '#e8f0ff'][row.shade];
      c.fill();
      c.lineWidth = 7;
      c.strokeStyle = '#b4cdee';
      c.stroke();
      c.restore();
    }
  }
}

function sparkle(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.closePath();
  c.fill();
}

const MAX_SPARKS = 40;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default {
  id: 'angel',
  name: 'Angel',
  emoji: '😇',
  hint: 'Smile for a sparkle',
  needs: { face: true },

  start(s) {
    s.halo = bake(drawHalo);
    s.sparks = [];
    s.acc = 0;
    s.happy = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.halo ??= bake(drawHalo);
    s.sparks ??= [];
    s.acc ??= 0;
    s.happy ??= 0;
    if (!face) return;
    s.happy += (clamp((face.smile - 0.2) * 2.5, 0, 1) - s.happy) * (1 - Math.exp(-f.dt * 6));

    // Soft white glow over the face.
    const r = face.scale * 2.4;
    const g = ctx.createRadialGradient(face.center.x, face.center.y, r * 0.15, face.center.x, face.center.y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = g;
    ctx.fillRect(face.center.x - r, face.center.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = g;
    ctx.fillRect(face.center.x - r, face.center.y - r, r * 2, r * 2);
    ctx.restore();

    withTemplate(ctx, face, c => {
      // Wings at the shoulders: they can't go behind you, so they flare out
      // beside the neck and flap a little (more when you smile).
      const flap = Math.sin(f.t * 2.6) * (0.05 + s.happy * 0.07);
      for (const side of [-1, 1]) {
        c.save();
        c.translate(512 + side * 330, 1010);
        c.scale(-side, 1);
        c.rotate(0.1);
        c.globalAlpha = 0.96;
        wing(c, flap);
        c.restore();
      }
      // The halo bobs gently.
      c.save();
      c.translate(0, Math.sin(f.t * 2.1) * 12);
      c.rotate(Math.sin(f.t * 1.3) * 0.03);
      c.drawImage(f.img('halo') ?? s.halo, 0, 0, 1024, 1024);
      c.restore();
    });

    // Sparkles twinkle around the head when you smile.
    s.acc += f.dt * s.happy * 14;
    while (s.acc >= 1) {
      s.acc -= 1;
      if (s.sparks.length >= MAX_SPARKS) break;
      const a = Math.random() * Math.PI * 2;
      const d = face.scale * (0.9 + Math.random() * 0.9);
      s.sparks.push({
        x: face.center.x + Math.cos(a) * d * 0.95,
        y: face.center.y + Math.sin(a) * d * 1.1 - face.scale * 0.2,
        r: face.scale * (0.08 + Math.random() * 0.12),
        life: 0,
        max: 0.7 + Math.random() * 0.7,
      });
    }
    ctx.save();
    ctx.shadowColor = '#fff6b0';
    ctx.shadowBlur = 12;
    for (let i = s.sparks.length - 1; i >= 0; i--) {
      const p = s.sparks[i];
      p.life += f.dt;
      if (p.life >= p.max) {
        s.sparks.splice(i, 1);
        continue;
      }
      const k = Math.sin((p.life / p.max) * Math.PI);
      ctx.fillStyle = i % 2 ? '#fffbe0' : '#ffffff';
      sparkle(ctx, p.x, p.y - p.life * face.scale * 0.15, p.r * (0.3 + k));
    }
    ctx.restore();
  },
};
