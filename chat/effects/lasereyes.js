// Laser Eyes: glowing red pupils; raise your eyebrows to fire two beams.

const SPARKS = 90;

// Distance along a ray from (x, y) with unit direction (dx, dy) to the frame edge.
function toEdge(x, y, dx, dy, w, h) {
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (w + 20 - x) / dx);
  if (dx < 0) t = Math.min(t, (-20 - x) / dx);
  if (dy > 0) t = Math.min(t, (h + 20 - y) / dy);
  if (dy < 0) t = Math.min(t, (-20 - y) / dy);
  return Math.max(0, t);
}

function glowDot(c, x, y, r, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(0.25, `rgba(255,70,50,${a})`);
  g.addColorStop(1, 'rgba(255,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

// One tapered beam layer from (0,0) along +x, length len, widths w0 -> w1.
function beamLayer(c, len, w0, w1, style) {
  c.fillStyle = style;
  c.beginPath();
  c.moveTo(0, -w0 / 2);
  c.lineTo(len, -w1 / 2);
  c.lineTo(len, w1 / 2);
  c.lineTo(0, w0 / 2);
  c.closePath();
  c.fill();
}

export default {
  id: 'lasereyes',
  name: 'Laser Eyes',
  emoji: '🔴',
  hint: 'Raise your eyebrows to fire',
  needs: { face: true },

  start(s) {
    s.power = 0;
    s.zap = 0;
    s.sparks = Array.from({ length: SPARKS }, () => ({ on: false }));
    s.sn = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    if (!s.sparks) this.start(s);
    const dt = Math.min(f.dt || 0.016, 0.05);
    const face = f.face;
    if (!face) { s.power = 0; return; }
    const k = f.h / 480;
    const firing = face.browUp > 0.45 || !!f.input?.held;
    s.power += ((firing ? 1 : 0) - s.power) * Math.min(1, dt * (firing ? 18 : 10));
    s.zap -= dt;
    if (firing && s.zap <= 0) { s.zap = 0.6; f.sfx('zap'); }

    const r = face.scale;
    const eyes = [face.eyeL, face.eyeR];
    // Unit vector along the eye line, and the one pointing "down" for the face.
    const ex = Math.cos(face.roll), ey = Math.sin(face.roll);
    const flick = 0.85 + 0.15 * Math.sin(f.t * 70) + 0.08 * Math.sin(f.t * 33);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Glowing pupils, always on.
    for (const e of eyes) {
      glowDot(ctx, e.x, e.y, r * (0.3 + 0.12 * s.power), 0.6 + 0.3 * s.power * flick);
    }

    if (s.power > 0.03) {
      for (let i = 0; i < 2; i++) {
        const e = eyes[i];
        const sign = i === 0 ? -1 : 1; // left eye shoots left, right eye shoots right
        // Away from the face centre, slightly downward.
        let dx = ex * sign + -ey * 0.2;
        let dy = ey * sign + ex * 0.2;
        const n = Math.hypot(dx, dy);
        dx /= n; dy /= n;
        const len = toEdge(e.x, e.y, dx, dy, f.w, f.h);
        const w = r * 0.17 * s.power * flick;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(Math.atan2(dy, dx));
        const a = Math.min(1, s.power);
        beamLayer(ctx, len, w * 2.6, w * 5.5, `rgba(255,0,30,${0.22 * a})`);
        beamLayer(ctx, len, w * 1.7, w * 3.6, `rgba(255,40,40,${0.40 * a})`);
        beamLayer(ctx, len, w * 1.0, w * 2.0, `rgba(255,120,90,${0.65 * a})`);
        beamLayer(ctx, len, w * 0.45, w * 0.8, `rgba(255,235,225,${0.9 * a})`);
        ctx.restore();
        glowDot(ctx, e.x, e.y, r * 0.3 * s.power, 0.8 * flick);

        // Sparks fly off where the beam leaves the frame.
        const hx = e.x + dx * len, hy = e.y + dy * len;
        const hxc = Math.max(0, Math.min(f.w, hx)), hyc = Math.max(0, Math.min(f.h, hy));
        glowDot(ctx, hxc, hyc, r * 0.55 * s.power * flick, 0.8);
        for (let j = 0; j < 2; j++) {
          const p = s.sparks[s.sn];
          s.sn = (s.sn + 1) % SPARKS;
          const ang = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 2.4;
          const v = (120 + Math.random() * 280) * k;
          p.on = true;
          p.x = hxc; p.y = hyc;
          p.vx = Math.cos(ang) * v;
          p.vy = Math.sin(ang) * v;
          p.life = 0.25 + Math.random() * 0.3;
          p.max = p.life;
        }
      }
    }

    for (const p of s.sparks) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy += 300 * k * dt;
      const px = p.x, py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = p.life / p.max;
      ctx.strokeStyle = `rgba(255,${Math.round(120 + 120 * a)},${Math.round(80 * a)},${a})`;
      ctx.lineWidth = 3 * k;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
  },
};
