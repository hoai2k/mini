// Space 360: open space with Earth, a smiling Moon, a ringed planet and nebulas all around.
import { makeWorld, rng, wrap } from './lib/world360.js';

function ball(c, x, y, r, stops, outline) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  c.beginPath();
  c.arc(x, y, r, 0, 7);
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = outline;
  c.stroke();
}

function paint(c, w, h) {
  const r = rng(5);
  c.fillStyle = '#080320';
  c.fillRect(0, 0, w, h);
  // A faint galactic band across the middle.
  const band = c.createLinearGradient(0, h * 0.25, 0, h * 0.75);
  band.addColorStop(0, 'rgba(90,60,200,0)');
  band.addColorStop(0.5, 'rgba(110,70,230,0.28)');
  band.addColorStop(1, 'rgba(90,60,200,0)');
  c.fillStyle = band;
  c.fillRect(0, 0, w, h);
  // Nebulas.
  const neb = [['255,80,190', 0.22], ['70,140,255', 0.2], ['120,255,200', 0.14], ['255,160,60', 0.16]];
  wrap(c, w, (r) => {
    for (let i = 0; i < 16; i++) {
      const [col, a] = neb[i % 4];
      const x = r() * w, y = h * (0.2 + r() * 0.6), rad = 150 + r() * 220;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${col},${a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
  // Stars.
  const cols = ['#ffffff', '#ffe9a8', '#bfe3ff', '#ffc4ef'];
  wrap(c, w, (r) => {
    const rr = rng(9);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = cols[Math.floor(rr() * 4)];
      const x = rr() * w, y = rr() * h, big = rr() < 0.05, s = big ? 2 + rr() * 2 : 0.6 + rr() * 1.5;
      c.globalAlpha = 0.4 + rr() * 0.6;
      c.beginPath();
      c.arc(x, y, s, 0, 7);
      c.fill();
      if (big) {
        c.fillRect(x - s * 3, y - 0.7, s * 6, 1.4);
        c.fillRect(x - 0.7, y - s * 3, 1.4, s * 6);
      }
    }
    c.globalAlpha = 1;
  });
  wrap(c, w, (r) => {
    // Earth with continents and clouds.
    const ex = 300, ey = h / 2 - 20, er = 210;
    const halo = c.createRadialGradient(ex, ey, er, ex, ey, er * 1.3);
    halo.addColorStop(0, 'rgba(110,180,255,0.5)');
    halo.addColorStop(1, 'rgba(110,180,255,0)');
    c.fillStyle = halo;
    c.fillRect(ex - er * 1.4, ey - er * 1.4, er * 2.8, er * 2.8);
    ball(c, ex, ey, er, ['#8fd4ff', '#2f86e8', '#123f9a'], '#0b2a6e');
    c.save();
    c.beginPath();
    c.arc(ex, ey, er - 3, 0, 7);
    c.clip();
    c.fillStyle = '#4cc05a';
    for (const [dx, dy, a, b] of [[-70, -50, 70, 45], [50, 20, 60, 80], [-40, 90, 40, 30], [90, -90, 35, 25]]) {
      c.beginPath();
      c.ellipse(ex + dx, ey + dy, a, b, 0.5, 0, 7);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [dx, dy] of [[-100, 0], [20, -110], [80, 70], [-30, 130]]) {
      c.beginPath();
      c.ellipse(ex + dx, ey + dy, 60, 14, -0.3, 0, 7);
      c.fill();
    }
    c.restore();
    // Smiling Moon.
    const mx = 760, my = h / 2 - 150, mr = 90;
    ball(c, mx, my, mr, ['#fffbe0', '#f1d98a', '#cdb060'], '#a88c3a');
    c.fillStyle = '#e0c06a';
    for (const [dx, dy, rad] of [[-45, 25, 16], [42, -38, 12], [48, 34, 9]]) {
      c.beginPath();
      c.arc(mx + dx, my + dy, rad, 0, 7);
      c.fill();
    }
    c.fillStyle = '#5a4415';
    c.beginPath();
    c.arc(mx - 26, my - 10, 7, 0, 7);
    c.arc(mx + 20, my - 10, 7, 0, 7);
    c.fill();
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.strokeStyle = '#5a4415';
    c.beginPath();
    c.arc(mx - 3, my + 8, 28, 0.25, Math.PI - 0.25);
    c.stroke();
    // Ringed planet.
    const px = 1230, py = h / 2 + 30, pr = 130;
    c.save();
    c.translate(px, py);
    c.rotate(-0.3);
    const ring = (front) => {
      c.save();
      c.beginPath();
      if (front) c.rect(-500, 0, 1000, 500); else c.rect(-500, -500, 1000, 500);
      c.clip();
      c.beginPath();
      c.ellipse(0, 0, pr * 1.9, pr * 0.5, 0, 0, 7);
      c.lineWidth = 30;
      c.strokeStyle = '#ffd36e';
      c.stroke();
      c.lineWidth = 10;
      c.strokeStyle = '#ff9a5c';
      c.stroke();
      c.restore();
    };
    ring(false);
    ball(c, 0, 0, pr, ['#ffc2e6', '#ff6fba', '#a82f86'], '#7a1f60');
    ring(true);
    c.restore();
    // Little planets: green, blue.
    ball(c, 1650, h / 2 - 190, 55, ['#d9ffb0', '#66d158', '#2a8a3a'], '#1b6a28');
    ball(c, 1800, h / 2 + 110, 38, ['#c0f0ff', '#46b8ee', '#1a6aa8'], '#124c7c');
    ball(c, 1010, h / 2 + 200, 28, ['#ffd0a0', '#ff8a4c', '#b04a1c'], '#7a2e0c');
    // Comet with a tail.
    const cx = 1480, cy = h / 2 + 230;
    const tail = c.createLinearGradient(cx, cy, cx + 360, cy - 120);
    tail.addColorStop(0, 'rgba(180,230,255,0.9)');
    tail.addColorStop(1, 'rgba(180,230,255,0)');
    c.fillStyle = tail;
    c.beginPath();
    c.moveTo(cx, cy - 14);
    c.lineTo(cx + 360, cy - 120);
    c.lineTo(cx, cy + 14);
    c.fill();
    ball(c, cx, cy, 16, ['#ffffff', '#cfeeff', '#8fc8ee'], '#6aa8d0');
    // Space station ring, upper right.
    c.save();
    c.translate(1000, h / 2 - 280);
    c.rotate(0.2);
    c.lineWidth = 14;
    c.strokeStyle = '#c9d2e8';
    c.beginPath();
    c.ellipse(0, 0, 70, 24, 0, 0, 7);
    c.stroke();
    c.fillStyle = '#8fa0c8';
    c.fillRect(-10, -50, 20, 100);
    c.fillStyle = '#4fb0ff';
    c.fillRect(-90, -8, 36, 16);
    c.fillRect(54, -8, 36, 16);
    c.restore();
    // Asteroids.
    const ra = rng(3);
    for (let i = 0; i < 26; i++) {
      const x = 1400 + ra() * 600, y = h / 2 - 330 + ra() * 120, s = 6 + ra() * 18;
      c.fillStyle = ra() < 0.5 ? '#a09088' : '#7d6e68';
      c.beginPath();
      c.ellipse(x, y, s, s * 0.7, ra() * 3, 0, 7);
      c.fill();
    }
  });
}

export default makeWorld({
  id: 'space360', name: 'Space 360', emoji: '🛰️', asset: 'world-space',
  tint: [0.5, 0.65, 1.0], paint,
});
