// Confetti: smile or open wide for a burst from your mouth; a light trickle falls otherwise.

const MAX = 300;
const COLORS = ['#ff4f7b', '#ffb627', '#3ddc84', '#35b6ff', '#a65bff', '#ff8a3d', '#ffe14d', '#ff6fd8'];

function emit(s, f, x, y, burst) {
  const p = s.pool[s.next];
  s.next = (s.next + 1) % MAX; // overwrite the oldest when full
  const k = f.h / 480;
  p.on = true;
  p.x = x;
  p.y = y;
  if (burst) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const v = (160 + Math.random() * 420) * k;
    p.vx = Math.cos(a) * v;
    p.vy = Math.sin(a) * v;
  } else {
    p.vx = (Math.random() - 0.5) * 30 * k;
    p.vy = (20 + Math.random() * 50) * k;
  }
  p.rot = Math.random() * 6.28;
  p.vr = (Math.random() - 0.5) * 9;
  p.flip = Math.random() * 6.28;
  p.vf = 4 + Math.random() * 9;
  p.col = COLORS[Math.floor(Math.random() * COLORS.length)];
  p.ribbon = Math.random() < 0.3;
  p.w = (p.ribbon ? 4 + Math.random() * 3 : 7 + Math.random() * 7) * k;
  p.h = (p.ribbon ? 22 + Math.random() * 16 : 10 + Math.random() * 8) * k;
  p.age = 0;
  p.ph = Math.random() * 6.28;
}

export default {
  id: 'confetti',
  name: 'Confetti',
  emoji: '🎉',
  hint: 'Smile to celebrate',
  needs: { face: true },

  start(s) {
    s.pool = Array.from({ length: MAX }, () => ({ on: false }));
    s.next = 0;
    s.acc = 0;
    s.wasSmile = false;
    s.wasOpen = false;
    s.wasHeld = false;
    s.cool = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    if (!s.pool) this.start(s);
    const dt = Math.min(f.dt || 0.016, 0.05);
    const k = f.h / 480;
    const face = f.face;
    s.cool -= dt;

    // Bursts on the rising edge of a smile, a wide open mouth, or a held press.
    const smile = !!face && face.smile > 0.5;
    const open = !!face && face.mouthOpen > 0.6;
    const held = !!f.input?.held;
    const trigger = (smile && !s.wasSmile) || (open && !s.wasOpen) || (held && !s.wasHeld);
    s.wasSmile = smile;
    s.wasOpen = open;
    s.wasHeld = held;
    if (trigger && s.cool <= 0) {
      s.cool = 0.4;
      const m = face ? face.mouth : { x: f.w / 2, y: f.h * 0.6 };
      for (let i = 0; i < 90; i++) emit(s, f, m.x, m.y, true);
      f.sfx('pop');
    }

    // Light trickle from the top.
    s.acc += dt * 14;
    while (s.acc >= 1) { s.acc -= 1; emit(s, f, Math.random() * f.w, -10 * k, false); }

    ctx.save();
    for (const p of s.pool) {
      if (!p.on) continue;
      p.age += dt;
      p.vy += 380 * k * dt;
      const drag = Math.exp(-1.6 * dt);
      p.vx *= drag;
      if (p.vy > 90 * k) p.vy = 90 * k + (p.vy - 90 * k) * Math.exp(-4 * dt); // flutter terminal speed
      p.ph += dt * 3;
      p.x += (p.vx + Math.sin(p.ph) * 22 * k) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.vf * dt;
      if (p.y > f.h + 30 || p.x < -40 || p.x > f.w + 40) { p.on = false; continue; }
      const sy = Math.cos(p.flip); // 3D-looking flip
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, sy);
      // Darker face on the back side of the flip.
      ctx.fillStyle = p.col;
      if (p.ribbon) {
        ctx.beginPath();
        ctx.moveTo(-p.w / 2, -p.h / 2);
        ctx.quadraticCurveTo(p.w * 2, -p.h / 4, -p.w / 2, 0);
        ctx.quadraticCurveTo(-p.w * 2, p.h / 4, p.w / 2, p.h / 2);
        ctx.lineTo(p.w, p.h / 2);
        ctx.quadraticCurveTo(-p.w, p.h / 4, p.w, 0);
        ctx.quadraticCurveTo(p.w, -p.h / 4, p.w / 2, -p.h / 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      if (sy < 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else if (Math.abs(sy) > 0.8) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w * 0.4, p.h);
      }
      ctx.restore();
    }
    ctx.restore();
  },
};
