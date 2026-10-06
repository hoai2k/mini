// Waterworks: two fountains of tears arc out of the corners of your eyes and
// splash at the bottom. Frown or open your mouth and they really gush.

const MAX = 340;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default {
  id: 'crying',
  name: 'Waterworks',
  emoji: '😭',
  hint: 'Frown to really cry',
  needs: { face: true },

  start(s) {
    s.ps = Array.from({ length: MAX }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, r: 0, kind: 0 }));
    s.acc = 0;
    s.gush = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.ps ??= Array.from({ length: MAX }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, r: 0, kind: 0 }));
    s.acc ??= 0;
    s.gush ??= 0;
    const dt = Math.min(f.dt, 0.05);
    if (face) {
      const want = clamp(Math.max(face.frown * 1.4, face.mouthOpen * 1.2), 0, 1) || (f.input.held ? 1 : 0);
      s.gush += (want - s.gush) * (1 - Math.exp(-dt * 5));
    }
    const sc = face ? face.scale : 100;
    const floor = face ? Math.min(f.h - 2, face.chin.y + sc * 2.4) : f.h - 2;
    const G = sc * 11;

    if (face) {
      // Spawn from the outer corner of each eye, shooting out and up.
      s.acc += dt * (36 + s.gush * 90);
      const ca = Math.cos(face.roll), sa = Math.sin(face.roll);
      while (s.acc >= 1) {
        s.acc -= 1;
        for (const side of [-1, 1]) {
          const p = s.ps.find(q => !q.on);
          if (!p) break;
          const eye = side < 0 ? face.eyeL : face.eyeR;
          const out = sc * 0.3, down = sc * 0.06;
          const speed = sc * (1.4 + Math.random() * 1.2 + s.gush * 1.6);
          const ang = (Math.random() - 0.5) * 0.5 + 0.55 - s.gush * 0.12; // up from sideways
          const lx = Math.cos(ang) * speed * side, ly = -Math.sin(ang) * speed;
          p.on = true;
          p.x = eye.x + (ca * out * side - sa * down);
          p.y = eye.y + (sa * out * side + ca * down);
          p.vx = lx * ca - ly * sa;
          p.vy = lx * sa + ly * ca;
          p.life = 0;
          p.r = sc * (0.03 + Math.random() * 0.03);
          p.kind = 0;
        }
      }
      // Watery shine on the lower lids and wet streaks down the cheeks.
      ctx.save();
      for (const side of [-1, 1]) {
        const eye = side < 0 ? face.eyeL : face.eyeR;
        const g = ctx.createLinearGradient(0, eye.y, 0, eye.y + sc * 1.1);
        g.addColorStop(0, 'rgba(190,230,255,0.55)');
        g.addColorStop(1, 'rgba(190,230,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(eye.x + side * sc * 0.12, eye.y + sc * 0.45, sc * 0.09, sc * 0.55, side * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(210,240,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y + sc * 0.17, sc * 0.26, sc * 0.05, face.roll, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Move and draw the tears: blue-white streaks following their motion.
    ctx.save();
    ctx.lineCap = 'round';
    for (const p of s.ps) {
      if (!p.on) continue;
      p.life += dt;
      const ox = p.x, oy = p.y;
      p.vy += G * dt * (p.kind ? 0.7 : 1);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 0 && p.y >= floor) {
        // Splash: a few small droplets bounce up and sideways.
        p.on = false;
        for (let i = 0; i < 2; i++) {
          const q = s.ps.find(z => !z.on);
          if (!q) break;
          q.on = true;
          q.x = p.x;
          q.y = floor;
          q.vx = (Math.random() - 0.5) * sc * 2.2;
          q.vy = -sc * (0.8 + Math.random() * 1.2);
          q.life = 0;
          q.r = p.r * 0.6;
          q.kind = 1;
        }
        continue;
      }
      if (p.kind === 1 && (p.y >= floor || p.life > 0.45)) {
        p.on = false;
        continue;
      }
      if (p.x < -50 || p.x > f.w + 50) {
        p.on = false;
        continue;
      }
      const a = p.kind ? clamp(1 - p.life / 0.45, 0, 1) : 1;
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = '#7cc4ff';
      ctx.lineWidth = p.r * 2;
      ctx.beginPath();
      ctx.moveTo(ox - p.vx * dt * 1.2, oy - p.vy * dt * 1.2);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.strokeStyle = '#eaf7ff';
      ctx.lineWidth = p.r * 1.0;
      ctx.stroke();
    }
    ctx.restore();

    // A puddle of splash where the tears land.
    if (face) {
      const g = ctx.createRadialGradient(face.center.x, floor, 0, face.center.x, floor, sc * 1.8);
      g.addColorStop(0, 'rgba(180,225,255,0.35)');
      g.addColorStop(1, 'rgba(180,225,255,0)');
      ctx.save();
      ctx.translate(0, floor);
      ctx.scale(1, 0.18);
      ctx.translate(0, -floor);
      ctx.fillStyle = g;
      ctx.fillRect(face.center.x - sc * 2, floor - sc * 2, sc * 4, sc * 4);
      ctx.restore();
    }
  },
};
