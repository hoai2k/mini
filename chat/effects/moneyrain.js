// Make It Rain: banknotes flutter down; open your mouth for a big burst and a "$" sparkle.

const MAX = 120;
const NW = 256, NH = 128;

// Green banknote stand-in with a smiley oval.
function bakeNote() {
  const cv = document.createElement('canvas');
  cv.width = NW;
  cv.height = NH;
  const c = cv.getContext('2d');
  c.lineJoin = 'round';
  c.beginPath();
  c.roundRect(6, 6, NW - 12, NH - 12, 14);
  const g = c.createLinearGradient(0, 0, 0, NH);
  g.addColorStop(0, '#9be58a');
  g.addColorStop(1, '#4fb25a');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 7;
  c.strokeStyle = '#2b7a3c';
  c.stroke();
  c.beginPath();
  c.roundRect(18, 18, NW - 36, NH - 36, 8);
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(30,110,50,0.55)';
  c.stroke();
  // Corner discs with $.
  c.fillStyle = '#2b7a3c';
  c.font = 'bold 22px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const [x, y] of [[40, 38], [NW - 40, NH - 38]]) {
    c.beginPath();
    c.arc(x, y, 15, 0, Math.PI * 2);
    c.fillStyle = '#d9ffc9';
    c.fill();
    c.stroke();
    c.fillStyle = '#2b7a3c';
    c.fillText('$', x, y + 1);
  }
  // Smiley oval.
  c.beginPath();
  c.ellipse(NW / 2, NH / 2, 42, 34, 0, 0, Math.PI * 2);
  const og = c.createRadialGradient(NW / 2 - 12, NH / 2 - 12, 4, NW / 2, NH / 2, 42);
  og.addColorStop(0, '#fff6b0');
  og.addColorStop(1, '#ffd23f');
  c.fillStyle = og;
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = '#b58a12';
  c.stroke();
  c.fillStyle = '#5a3d00';
  c.beginPath();
  c.ellipse(NW / 2 - 14, NH / 2 - 8, 4.5, 6, 0, 0, Math.PI * 2);
  c.ellipse(NW / 2 + 14, NH / 2 - 8, 4.5, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.strokeStyle = '#5a3d00';
  c.beginPath();
  c.arc(NW / 2, NH / 2 + 2, 16, 0.3, Math.PI - 0.3);
  c.stroke();
  // Shine.
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.beginPath();
  c.ellipse(70, 26, 40, 6, -0.1, 0, Math.PI * 2);
  c.fill();
  return cv;
}

function emit(s, f, x, y, burst) {
  const p = s.pool[s.next];
  s.next = (s.next + 1) % MAX;
  const k = f.h / 480;
  p.on = true;
  p.x = x;
  p.y = y;
  if (burst) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const v = (150 + Math.random() * 330) * k;
    p.vx = Math.cos(a) * v;
    p.vy = Math.sin(a) * v;
  } else {
    p.vx = (Math.random() - 0.5) * 20 * k;
    p.vy = (30 + Math.random() * 40) * k;
  }
  p.size = (60 + Math.random() * 50) * k;
  p.rot = (Math.random() - 0.5) * 1.2;
  p.ph = Math.random() * 6.28;
  p.rock = 0.4 + Math.random() * 0.5;
  p.spin = 0.8 + Math.random() * 1.6;
  p.turn = Math.random() * 6.28;
  p.tint = 0.8 + Math.random() * 0.2;
}

export default {
  id: 'moneyrain',
  name: 'Make It Rain',
  emoji: '💸',
  hint: 'Open your mouth to make it rain',
  needs: { face: true },

  start(s) {
    s.note = bakeNote();
    s.pool = Array.from({ length: MAX }, () => ({ on: false }));
    s.next = 0;
    s.acc = 0;
    s.wasOpen = false;
    s.wasHeld = false;
    s.cool = 0;
    s.signs = [];
  },

  draw(ctx, f) {
    const s = f.state;
    if (!s.pool) this.start(s);
    const dt = Math.min(f.dt || 0.016, 0.05);
    const k = f.h / 480;
    const face = f.face;
    s.cool -= dt;

    const open = !!face && face.mouthOpen > 0.55;
    const held = !!f.input?.held;
    if (((open && !s.wasOpen) || (held && !s.wasHeld)) && s.cool <= 0) {
      s.cool = 0.6;
      const m = face ? face.mouth : { x: f.w / 2, y: f.h * 0.6 };
      for (let i = 0; i < 45; i++) emit(s, f, m.x, m.y, true);
      s.signs.push({ x: m.x, y: m.y, t: 0 });
      if (s.signs.length > 4) s.signs.shift();
      f.sfx('pop');
    }
    s.wasOpen = open;
    s.wasHeld = held;

    s.acc += dt * 9;
    while (s.acc >= 1) { s.acc -= 1; emit(s, f, Math.random() * f.w, -40 * k, false); }

    const note = f.img('money') || s.note;
    ctx.save();
    for (const p of s.pool) {
      if (!p.on) continue;
      p.vy += 260 * k * dt;
      p.vx *= Math.exp(-1.5 * dt);
      const cap = 95 * k; // notes flutter, they don't plummet
      if (p.vy > cap) p.vy = cap + (p.vy - cap) * Math.exp(-5 * dt);
      p.ph += dt * p.spin * 2.2;
      p.turn += dt * p.spin * 2;
      p.x += (p.vx + Math.sin(p.ph) * 55 * k) * dt;
      p.y += p.vy * dt;
      if (p.y > f.h + p.size || p.x < -p.size || p.x > f.w + p.size) { p.on = false; continue; }
      const sy = Math.cos(p.turn);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(p.ph) * p.rock + p.rot);
      ctx.scale(1, 0.15 + Math.abs(sy) * 0.85);
      ctx.globalAlpha = 1;
      ctx.drawImage(note, -p.size / 2, -p.size / 4, p.size, p.size / 2);
      if (sy < 0) {
        ctx.fillStyle = 'rgba(0,50,10,0.22)';
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }

    // "$" sparkles rising from the mouth.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = s.signs.length - 1; i >= 0; i--) {
      const q = s.signs[i];
      q.t += dt;
      if (q.t > 1.1) { s.signs.splice(i, 1); continue; }
      const a = 1 - q.t / 1.1;
      const sz = (50 + 50 * Math.min(1, q.t * 4)) * k;
      ctx.globalAlpha = a;
      ctx.font = `900 ${sz}px sans-serif`;
      ctx.shadowColor = '#fff59a';
      ctx.shadowBlur = 24 * k;
      ctx.lineWidth = 7 * k;
      ctx.strokeStyle = '#1f7a35';
      ctx.fillStyle = '#ffe14d';
      const y = q.y - 60 * k - q.t * 90 * k;
      ctx.strokeText('$', q.x, y);
      ctx.fillText('$', q.x, y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      for (let j = 0; j < 4; j++) {
        const ang = j * 1.57 + q.t * 4;
        const rr = sz * 0.75;
        ctx.fillRect(q.x + Math.cos(ang) * rr - 3 * k, y + Math.sin(ang) * rr - 3 * k, 6 * k, 6 * k);
      }
    }
    ctx.restore();
  },
};
