// Snowfall: big soft flakes drift down and settle on your head and shoulders.

const MAX = 260;        // flake pool size
const SMALL_W = 64, SMALL_H = 48; // low-res person mask used to find the top edge
const MAX_STUCK = 110;

function softFlake() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(240,248,255,0.95)');
  g.addColorStop(1, 'rgba(210,230,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(32, 32, 30, 0, Math.PI * 2);
  c.fill();
  return cv;
}

// Six-armed crystal with little side branches.
function crystalFlake() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 96;
  const c = cv.getContext('2d');
  c.translate(48, 48);
  c.lineCap = 'round';
  const arms = (width, col) => {
    c.lineWidth = width;
    c.strokeStyle = col;
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate(i * Math.PI / 3);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -40);
      for (const [y, l] of [[-16, 11], [-28, 8]]) {
        c.moveTo(0, y);
        c.lineTo(-l, y - l);
        c.moveTo(0, y);
        c.lineTo(l, y - l);
      }
      c.stroke();
      c.restore();
    }
  };
  c.shadowColor = '#9cc8ff';
  c.shadowBlur = 8;
  arms(9, '#a9cdf5');
  c.shadowBlur = 0;
  arms(5, '#ffffff');
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(0, 0, 6, 0, Math.PI * 2);
  c.fill();
  return cv;
}

function spawn(s, f, anywhere) {
  const p = s.flakes.find(q => !q.on);
  if (!p) return;
  const r = Math.random();
  p.on = true;
  p.stuck = false;
  p.crystal = r < 0.14;
  p.size = (p.crystal ? 20 + Math.random() * 16 : 8 + Math.random() * 22) * (f.h / 480);
  p.x = Math.random() * f.w;
  p.y = anywhere ? Math.random() * f.h : -p.size;
  p.vy = (28 + Math.random() * 40) * (0.5 + p.size / (24 * (f.h / 480))) * (f.h / 480);
  p.ph = Math.random() * 6.28;
  p.sway = 14 + Math.random() * 26;
  p.rot = Math.random() * 6.28;
  p.vr = (Math.random() - 0.5) * 1.2;
  p.life = 0;
  p.alpha = 0.6 + Math.random() * 0.4;
}

export default {
  id: 'snow',
  name: 'Snowfall',
  emoji: '❄️',
  hint: 'Let it snow',
  needs: { face: true, segmentation: true },

  start(s) {
    s.soft = softFlake();
    s.crystal = crystalFlake();
    s.flakes = Array.from({ length: MAX }, () => ({ on: false }));
    s.top = new Int16Array(SMALL_W).fill(-1);
    s.mask = document.createElement('canvas');
    s.mask.width = SMALL_W;
    s.mask.height = SMALL_H;
    s.mctx = s.mask.getContext('2d', { willReadFrequently: true });
    s.n = 0;
    s.acc = 0;
    s.primed = false;
  },

  draw(ctx, f) {
    const s = f.state;
    if (!s.flakes) this.start(s);
    const dt = Math.min(f.dt || 0.016, 0.05);
    const k = f.h / 480;

    if (!s.primed) {
      s.primed = true;
      for (let i = 0; i < 70; i++) spawn(s, f, true);
    }

    // Find the top edge of the person per column, every few frames.
    if ((s.n++ % 3) === 0) {
      const p = f.person();
      if (p) {
        s.mctx.clearRect(0, 0, SMALL_W, SMALL_H);
        s.mctx.drawImage(p, 0, 0, SMALL_W, SMALL_H);
        const d = s.mctx.getImageData(0, 0, SMALL_W, SMALL_H).data;
        for (let x = 0; x < SMALL_W; x++) {
          let top = -1;
          for (let y = 0; y < SMALL_H - 1; y++) {
            if (d[(y * SMALL_W + x) * 4 + 3] > 110 && d[((y + 1) * SMALL_W + x) * 4 + 3] > 110) { top = y; break; }
          }
          s.top[x] = top;
        }
      } else {
        s.top.fill(-1);
      }
    }

    // Keep a steady fall of new flakes.
    s.acc += dt * 26;
    while (s.acc >= 1) { s.acc -= 1; spawn(s, f, false); }

    let stuckCount = 0;
    for (const p of s.flakes) if (p.on && p.stuck) stuckCount++;

    for (const p of s.flakes) {
      if (!p.on) continue;
      const col = Math.max(0, Math.min(SMALL_W - 1, Math.floor(p.x / f.w * SMALL_W)));
      const row = s.top[col];
      const topY = row >= 0 ? row / SMALL_H * f.h : -1;
      if (p.stuck) {
        if (topY < 0) { p.stuck = false; stuckCount--; continue; } // person left: fall again
        p.y += (topY - p.off - p.y) * Math.min(1, dt * 12);
        p.life -= dt;
        p.alpha = Math.min(p.alpha, Math.max(0, p.life / 1.5));
        p.size *= 1 - dt * 0.05; // slow melt
        if (p.life <= 0) { p.on = false; stuckCount--; }
        continue;
      }
      p.ph += dt * 1.6;
      p.x += Math.sin(p.ph) * p.sway * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (topY >= 0 && p.y + p.size * 0.15 >= topY && p.y < topY + 30 * k) {
        if (stuckCount < MAX_STUCK) {
          p.stuck = true;
          stuckCount++;
          p.off = p.size * (0.1 + Math.random() * 0.35);
          p.life = 4 + Math.random() * 5;
        } else {
          p.on = false;
        }
      } else if (p.y - p.size > f.h || p.x < -40 || p.x > f.w + 40) {
        p.on = false;
      }
    }

    // Cool tint.
    ctx.save();
    ctx.fillStyle = 'rgba(110,160,255,0.10)';
    ctx.fillRect(0, 0, f.w, f.h);
    for (const p of s.flakes) {
      if (!p.on) continue;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const img = p.crystal ? s.crystal : s.soft;
      ctx.drawImage(img, -p.size, -p.size, p.size * 2, p.size * 2);
      ctx.restore();
    }
    ctx.restore();
  },
};
