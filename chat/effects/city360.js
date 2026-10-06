// City 360: a neon night skyline with lit windows and glowing signs.
import { makeWorld, wrap, vgrad } from './lib/world360.js';

function skyline(c, r, w, base, minH, maxH, col, lit, step) {
  for (let x = -20; x < w + 20; x += step) {
    const bw = step * (0.8 + r() * 0.6), bh = minH + r() * (maxH - minH);
    c.fillStyle = col;
    c.fillRect(x, base - bh, bw, bh);
    if (r() < 0.3) c.fillRect(x + bw * 0.45, base - bh - 40, 6, 40);
    if (!lit) continue;
    for (let wy = base - bh + 14; wy < base - 10; wy += 20) {
      for (let wx = x + 8; wx < x + bw - 12; wx += 16) {
        if (r() < 0.45) {
          c.fillStyle = ['#ffe9a0', '#ffd070', '#9ce8ff', '#ffb0e0'][Math.floor(r() * 4)];
          c.fillRect(wx, wy, 8, 11);
        }
      }
    }
  }
}

function sign(c, x, y, text, col) {
  c.font = 'bold 54px sans-serif';
  c.textAlign = 'center';
  const wd = c.measureText(text).width + 36;
  c.fillStyle = '#10081e';
  c.fillRect(x - wd / 2, y - 48, wd, 72);
  c.shadowColor = col;
  c.shadowBlur = 28;
  c.strokeStyle = col;
  c.lineWidth = 5;
  c.strokeRect(x - wd / 2, y - 48, wd, 72);
  c.fillStyle = col;
  c.fillText(text, x, y + 8);
  c.shadowBlur = 0;
}

function paint(c, w, h) {
  const hz = h / 2;
  c.fillStyle = vgrad(c, 0, hz + 60, [[0, '#0a0630'], [0.6, '#3a1470'], [1, '#d6469a']]);
  c.fillRect(0, 0, w, hz + 60);
  wrap(c, w, (r) => {
    for (let i = 0; i < 80; i++) {
      c.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`;
      c.fillRect(r() * w, r() * hz * 0.6, 2, 2);
    }
    c.fillStyle = '#ffe9c0';
    c.beginPath();
    c.arc(1500, hz - 260, 46, 0, 7);
    c.fill();
    skyline(c, r, w, hz + 80, 120, 330, '#2a1654', false, 60);
    skyline(c, r, w, hz + 110, 160, 440, '#170c34', true, 90);
  }, 2);
  // Street.
  c.fillStyle = vgrad(c, hz + 110, h, [[0, '#1a1030'], [1, '#0a0618']]);
  c.fillRect(0, hz + 110, w, h);
  wrap(c, w, (r) => {
    // Wet road reflections of the neon.
    for (let i = 0; i < 40; i++) {
      const x = r() * w;
      const g = c.createLinearGradient(0, hz + 120, 0, h);
      const col = ['255,60,170', '60,220,255', '255,220,80'][i % 3];
      g.addColorStop(0, `rgba(${col},0.35)`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.fillRect(x, hz + 120, 10 + r() * 20, h - hz - 120);
    }
    // Lane markings.
    c.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = 0; x < w; x += 160) c.fillRect(x, h * 0.85, 80, 10);
    // Big neon signs and towers around the full circle.
    const signs = [[200, 'RAMEN', '#ff3fa0'], [640, 'ARCADE', '#35e0ff'], [1050, 'HOTEL', '#ffe14d'], [1450, 'PIZZA', '#8aff6a'], [1800, 'DISCO', '#b46aff']];
    for (const [x, t, col] of signs) {
      c.fillStyle = '#0c0620';
      c.fillRect(x - 130, hz - 200, 260, 330);
      c.fillStyle = '#222';
      c.fillRect(x - 6, hz + 20, 12, 120);
      sign(c, x, hz - 120 + (x % 3) * 12, t, col);
      c.fillStyle = col;
      c.globalAlpha = 0.7;
      c.fillRect(x - 100, hz - 40, 200, 6);
      c.fillRect(x - 100, hz - 10, 140, 6);
      c.globalAlpha = 1;
    }
    // Street lamps with glow.
    for (let x = 420; x < w; x += 410) {
      c.fillStyle = '#2a2040';
      c.fillRect(x - 5, hz + 40, 10, 330);
      const g = c.createRadialGradient(x, hz + 40, 5, x, hz + 40, 110);
      g.addColorStop(0, 'rgba(255,240,170,1)');
      g.addColorStop(1, 'rgba(255,240,170,0)');
      c.fillStyle = g;
      c.fillRect(x - 110, hz - 70, 220, 220);
    }
    // A hot-air balloon and a small plane in the sky.
    c.fillStyle = '#ff6a5a';
    c.beginPath();
    c.arc(950, 150, 60, 0, 7);
    c.fill();
    c.fillStyle = '#ffd23f';
    c.beginPath();
    c.ellipse(950, 150, 20, 60, 0, 0, 7);
    c.fill();
    c.fillStyle = '#6b4220';
    c.fillRect(936, 225, 28, 20);
  }, 8);
}

export default makeWorld({
  id: 'city360', name: 'City 360', emoji: '🌃', asset: 'world-city',
  tint: [1.0, 0.4, 0.8], paint,
});
