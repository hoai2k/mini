// Rainbow Mouth: open wide (or hold Space) and a wavy six-colour rainbow pours
// from your mouth to the bottom of the picture, with twinkling sparkles.

const COLORS = ['#ff3b4e', '#ff9a2e', '#ffe14a', '#4fd86a', '#3fa7ff', '#9b5cff'];
const MAX_SPARKLES = 40;
const RAMP = 0.25; // seconds to grow in or out
const SEGMENTS = 28;

const ease = u => u * u * (3 - 2 * u);

function star(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
  ctx.fill();
}

// Centre line and half width of the ribbon at fraction u of its length.
function spine(a, u, t) {
  const y = a.y + u * a.len;
  const wave = Math.sin(u * 5.5 - t * 6) * a.scale * 0.18 * Math.min(1, u * 3);
  const lean = -Math.tan(Math.max(-0.7, Math.min(0.7, a.roll))) * (y - a.y);
  return { x: a.x + wave + lean, y, hw: a.scale * 0.45 * (1 + u * 1.1) };
}

export default {
  id: 'rainbow',
  name: 'Rainbow Mouth',
  emoji: '🌈',
  hint: 'Open your mouth for rainbows',
  needs: { face: true },

  start(s) {
    s.amt = 0;
    s.spark = [];
    s.acc = 0;
    s.anchor = null;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.spark ??= [];
    s.amt ??= 0;
    s.acc ??= 0;
    const on = face && (face.mouthOpen > 0.3 || f.input.held);
    s.amt = Math.max(0, Math.min(1, s.amt + (on ? f.dt : -f.dt) / RAMP));
    if (face) s.anchor = { x: face.mouth.x, y: face.mouth.y, scale: face.scale, roll: face.roll };

    const a = s.anchor && s.amt > 0.01 ? { ...s.anchor, len: 0 } : null;
    if (a) {
      const e = ease(s.amt);
      a.len = Math.max(0, f.h - a.y + a.scale * 0.3) * e;
      const pts = [];
      for (let i = 0; i <= SEGMENTS; i++) pts.push(spine(a, i / SEGMENTS, f.t));

      ctx.save();
      ctx.globalAlpha = Math.min(1, e * 1.5);
      ctx.lineJoin = 'round';
      // Soft dark outline round the whole ribbon.
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x - p.hw, p.y) : ctx.moveTo(p.x - p.hw, p.y)));
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x + pts[i].hw, pts[i].y);
      ctx.closePath();
      ctx.lineWidth = a.scale * 0.09;
      ctx.strokeStyle = 'rgba(70,30,100,0.55)';
      ctx.stroke();
      // Six colour bands.
      COLORS.forEach((col, j) => {
        const l0 = -1 + (2 * j) / 6;
        const l1 = -1 + (2 * (j + 1)) / 6;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x + p.hw * l0, p.y) : ctx.moveTo(p.x + p.hw * l0, p.y)));
        for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x + pts[i].hw * l1, pts[i].y);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = col;
        ctx.stroke();
      });
      // Glossy sheen down the left side.
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x - p.hw * 0.8, p.y) : ctx.moveTo(p.x - p.hw * 0.8, p.y)));
      ctx.lineWidth = a.scale * 0.07;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();
      ctx.restore();

      // Sparkles twinkle in and out along the ribbon.
      if (on) s.acc += f.dt * 22;
      while (s.acc >= 1) {
        s.acc -= 1;
        if (s.spark.length >= MAX_SPARKLES) break;
        const u = Math.random();
        const p = spine(a, u, f.t);
        const lat = (Math.random() * 2 - 1) * 1.5;
        s.spark.push({
          x: p.x + p.hw * lat,
          y: p.y + (Math.random() - 0.5) * a.scale * 0.3,
          r: a.scale * (0.1 + Math.random() * 0.14),
          age: 0,
          life: 0.5 + Math.random() * 0.5,
        });
      }
    }

    s.spark = s.spark.filter(p => {
      p.age += f.dt;
      if (p.age >= p.life) return false;
      const k = Math.sin((p.age / p.life) * Math.PI);
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = p.r;
      ctx.fillStyle = '#fff';
      star(ctx, p.x, p.y, p.r * k);
      ctx.restore();
      return true;
    });
  },
};
