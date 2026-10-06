// Forest 360: a dusk forest with giant glowing mushrooms and fireflies.
import { makeWorld, wrap, vgrad } from './lib/world360.js';

function pine(c, x, base, hgt, col) {
  c.fillStyle = col;
  c.fillRect(x - hgt * 0.03, base - hgt * 0.2, hgt * 0.06, hgt * 0.2);
  for (let i = 0; i < 4; i++) {
    const y = base - hgt * (0.15 + i * 0.22), wd = hgt * (0.3 - i * 0.05);
    c.beginPath();
    c.moveTo(x - wd, y);
    c.lineTo(x, y - hgt * 0.3);
    c.lineTo(x + wd, y);
    c.fill();
  }
}

function mushroom(c, x, base, s, cap, glow) {
  const g = c.createRadialGradient(x, base - s * 1.1, 10, x, base - s * 1.1, s * 1.8);
  g.addColorStop(0, glow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(x - s * 2, base - s * 3, s * 4, s * 3.2);
  c.fillStyle = '#f3e8d0';
  c.beginPath();
  c.moveTo(x - s * 0.22, base);
  c.quadraticCurveTo(x - s * 0.12, base - s * 0.6, x - s * 0.2, base - s * 1.05);
  c.lineTo(x + s * 0.2, base - s * 1.05);
  c.quadraticCurveTo(x + s * 0.12, base - s * 0.6, x + s * 0.22, base);
  c.fill();
  c.fillStyle = cap;
  c.beginPath();
  c.ellipse(x, base - s * 1.05, s * 0.9, s * 0.7, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [dx, dy, q] of [[-0.45, -0.35, 0.12], [0.1, -0.55, 0.15], [0.5, -0.3, 0.1], [-0.1, -0.2, 0.08]]) {
    c.beginPath();
    c.arc(x + dx * s, base - s * 1.05 + dy * s, q * s, 0, 7);
    c.fill();
  }
}

function paint(c, w, h) {
  const hz = h / 2;
  c.fillStyle = vgrad(c, 0, hz + 40, [[0, '#1c1050'], [0.5, '#6a2f8a'], [0.85, '#ff8a6a'], [1, '#ffc27a']]);
  c.fillRect(0, 0, w, hz + 40);
  wrap(c, w, (r) => {
    for (let i = 0; i < 90; i++) {
      c.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`;
      c.fillRect(r() * w, r() * hz * 0.7, 2, 2);
    }
    // Big pale moon.
    c.fillStyle = '#fff4d0';
    c.beginPath();
    c.arc(500, hz - 220, 52, 0, 7);
    c.fill();
    // Misty far hills and pine ranks, back to front.
    c.fillStyle = '#4a2a70';
    for (let i = 0; i < 24; i++) pine(c, i * 90 + r() * 40, hz + 30, 190 + r() * 80, '#4a2a70');
    c.fillStyle = '#2e1a52';
    for (let i = 0; i < 20; i++) pine(c, i * 108 + r() * 50, hz + 60, 260 + r() * 100, '#2e1a52');
  });
  // Forest floor.
  c.fillStyle = vgrad(c, hz + 10, h, [[0, '#1d3a3a'], [0.4, '#16302e'], [1, '#0a1a1c']]);
  c.fillRect(0, hz + 10, w, h);
  wrap(c, w, (r) => {
    // Near trees: big trunks with leafy glow-tipped canopy.
    for (const x of [140, 560, 980, 1330, 1760]) {
      c.fillStyle = '#1b1030';
      c.beginPath();
      c.moveTo(x - 50, h * 0.78);
      c.quadraticCurveTo(x - 24, hz, x - 28, 0);
      c.lineTo(x + 28, 0);
      c.quadraticCurveTo(x + 24, hz, x + 50, h * 0.78);
      c.fill();
      c.strokeStyle = 'rgba(160,120,255,0.35)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x - 28, 0);
      c.quadraticCurveTo(x - 24, hz, x - 50, h * 0.78);
      c.stroke();
    }
    // Giant glowing mushrooms in many colours.
    const cols = [['#ff4fa0', 'rgba(255,80,170,0.5)'], ['#35d8ff', 'rgba(60,220,255,0.5)'], ['#9a5aff', 'rgba(160,100,255,0.5)'], ['#6aff8a', 'rgba(100,255,140,0.45)'], ['#ffb23f', 'rgba(255,190,70,0.5)']];
    for (let i = 0; i < 11; i++) {
      const [cap, glow] = cols[i % 5];
      mushroom(c, 80 + i * 190 + r() * 50, hz + 150 + r() * 260, 90 + r() * 120, cap, glow);
    }
    // Ferns and grass tufts.
    c.strokeStyle = '#2f8a5a';
    c.lineWidth = 4;
    c.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = hz + 100 + r() * (hz - 120);
      for (let k = -2; k <= 2; k++) {
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + k * 8, y - 20, x + k * 18, y - 36 + Math.abs(k) * 6);
        c.stroke();
      }
    }
    // Fireflies glowing everywhere.
    for (let i = 0; i < 140; i++) {
      const x = r() * w, y = hz - 260 + r() * (h * 0.55), s = 4 + r() * 7;
      const g = c.createRadialGradient(x, y, 0, x, y, s * 3);
      g.addColorStop(0, 'rgba(255,250,150,1)');
      g.addColorStop(0.3, 'rgba(255,240,100,0.5)');
      g.addColorStop(1, 'rgba(255,240,100,0)');
      c.fillStyle = g;
      c.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
    }
  }, 4);
}

export default makeWorld({
  id: 'forest360', name: 'Forest 360', emoji: '🍄', asset: 'world-forest',
  tint: [0.7, 0.5, 1.0], paint,
});
