// Fireworks: the room goes dark, you stay bright, and rockets burst behind you.

const MAX = 300;      // spark pool
const ROCKETS = 8;
const HUES = [0, 20, 45, 120, 170, 200, 280, 320];

function emit(s, x, y, vx, vy, life, hue, size, grav) {
  const p = s.pool[s.next];
  s.next = (s.next + 1) % MAX;
  p.on = true;
  p.x = x; p.y = y; p.px = x; p.py = y;
  p.vx = vx; p.vy = vy;
  p.life = life; p.max = life;
  p.hue = hue; p.size = size; p.grav = grav;
}

function burst(s, f, x, y, big) {
  const k = f.h / 480;
  const n = big ? 120 : 64;
  const hue = HUES[Math.floor(Math.random() * HUES.length)];
  const hue2 = (hue + 40 + Math.random() * 60) % 360;
  const speed = (big ? 290 : 200) * k;
  for (let i = 0; i < n; i++) {
    // Random point on a sphere, seen from the front: fills the disc like a 3D ball.
    const z = Math.random() * 2 - 1;
    const th = Math.random() * 6.283;
    const rr = Math.sqrt(1 - z * z);
    const v = speed * (0.92 + Math.random() * 0.16);
    emit(s, x, y, Math.cos(th) * rr * v, Math.sin(th) * rr * v, 1.5 + Math.random() * 0.8, i % 3 === 0 ? hue2 : hue, (big ? 4.5 : 3.4) * k, 120 * k);
  }
  // White flash core.
  for (let i = 0; i < 6; i++) emit(s, x, y, (Math.random() - 0.5) * 60 * k, (Math.random() - 0.5) * 60 * k, 0.3, 50, 5 * k, 0);
  s.flash = Math.max(s.flash, big ? 0.35 : 0.18);
  s.flashX = x; s.flashY = y;
  if (s.sound <= 0) { f.sfx('bang'); s.sound = 0.5; }
}

function launch(s, f, x, y0, ty, big) {
  const r = s.rockets.find(q => !q.on);
  if (!r) return;
  r.on = true; r.x = x; r.y = y0; r.ty = ty; r.big = big;
  r.vy = -(Math.max(160, (y0 - ty) * 1.6));
  r.vx = (Math.random() - 0.5) * 20;
}

export default {
  id: 'fireworks',
  name: 'Fireworks',
  emoji: '🎆',
  hint: 'Open your mouth to launch one',
  needs: { face: true, segmentation: true },

  start(s) {
    s.pool = Array.from({ length: MAX }, () => ({ on: false }));
    s.rockets = Array.from({ length: ROCKETS }, () => ({ on: false }));
    s.next = 0;
    s.acc = 1.2;
    s.sound = 0;
    s.flash = 0;
    s.flashX = 0;
    s.flashY = 0;
    s.wasOpen = false;
    s.wasHeld = false;
    s.cool = 0;
    s.stars = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random() * 0.7, ph: Math.random() * 6.28 }));
  },

  draw(ctx, f) {
    const s = f.state;
    if (!s.pool) this.start(s);
    const dt = Math.min(f.dt || 0.016, 0.05);
    const k = f.h / 480;
    const face = f.face;
    s.sound -= dt;
    s.cool -= dt;
    s.flash = Math.max(0, s.flash - dt * 1.2);

    // Regular launches from the bottom.
    s.acc -= dt;
    if (s.acc <= 0) {
      s.acc = 0.9 + Math.random() * 1.1;
      launch(s, f, f.w * (0.1 + Math.random() * 0.8), f.h + 10, f.h * (0.12 + Math.random() * 0.35), false);
    }
    // Big one above the head on an open mouth (or a held press).
    const open = !!face && face.mouthOpen > 0.5;
    const held = !!f.input?.held;
    if (((open && !s.wasOpen) || (held && !s.wasHeld)) && s.cool <= 0) {
      s.cool = 0.8;
      const x = face ? face.forehead.x : f.w / 2;
      const y0 = face ? face.forehead.y : f.h * 0.5;
      const ty = Math.max(110 * k, (face ? face.forehead.y - face.scale * 2.4 : f.h * 0.2));
      launch(s, f, x, y0, ty, true);
    }
    s.wasOpen = open;
    s.wasHeld = held;

    for (const r of s.rockets) {
      if (!r.on) continue;
      r.y += r.vy * dt;
      r.x += r.vx * dt;
      r.vy += 60 * k * dt; // decelerates as it climbs
      emit(s, r.x, r.y, (Math.random() - 0.5) * 30, 40 * k + Math.random() * 40, 0.4, 40, 2 * k, 0);
      if (r.y <= r.ty || r.vy > -20) { r.on = false; burst(s, f, r.x, r.y, r.big); }
    }

    // Night: dark overlay, fireworks, then the person back on top.
    const person = f.person();
    ctx.save();
    ctx.fillStyle = person ? 'rgba(4,6,28,0.82)' : 'rgba(4,6,28,0.55)';
    ctx.fillRect(0, 0, f.w, f.h);
    ctx.fillStyle = '#fff';
    for (const st of s.stars) {
      ctx.globalAlpha = 0.25 + 0.35 * Math.max(0, Math.sin(f.t * 2 + st.ph));
      ctx.fillRect(st.x * f.w, st.y * f.h, 2 * k, 2 * k);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    if (s.flash > 0.01) {
      const g = ctx.createRadialGradient(s.flashX, s.flashY, 0, s.flashX, s.flashY, f.h * 0.7);
      g.addColorStop(0, `rgba(255,240,220,${s.flash})`);
      g.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, f.w, f.h);
    }
    for (const r of s.rockets) {
      if (!r.on) continue;
      ctx.fillStyle = '#fff4c8';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 3 * k, 0, 6.283);
      ctx.fill();
    }
    ctx.lineCap = 'round';
    for (const p of s.pool) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.px = p.x; p.py = p.y;
      p.vy += p.grav * dt;
      const drag = Math.exp(-1.8 * dt);
      p.vx *= drag; p.vy *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = Math.min(1, p.life / p.max * 1.6);
      ctx.strokeStyle = `hsla(${p.hue},100%,${52 + 18 * a}%,${a})`;
      ctx.lineWidth = p.size * (0.5 + a * 0.6);
      ctx.beginPath();
      ctx.moveTo(p.px - p.vx * dt * 1.5, p.py - p.vy * dt * 1.5);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
    if (person) ctx.drawImage(person, 0, 0, f.w, f.h);
  },
};
