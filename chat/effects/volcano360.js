// Volcano 360: an erupting volcano, lava rivers and a red sky.
import { makeWorld, wrap, vgrad } from './lib/world360.js';

function volcano(c, x, base, wd, hgt, erupt) {
  const crater = wd * 0.12;
  c.fillStyle = '#2a1618';
  c.beginPath();
  c.moveTo(x - wd, base);
  c.lineTo(x - crater, base - hgt);
  c.lineTo(x + crater, base - hgt);
  c.lineTo(x + wd, base);
  c.fill();
  c.fillStyle = '#44201c';
  c.beginPath();
  c.moveTo(x, base - hgt);
  c.lineTo(x + crater, base - hgt);
  c.lineTo(x + wd, base);
  c.lineTo(x + wd * 0.3, base);
  c.fill();
  // Lava streams down the slopes.
  c.strokeStyle = '#ff8a1a';
  c.lineWidth = wd * 0.03;
  c.lineCap = 'round';
  for (const k of [-0.7, -0.2, 0.3, 0.8]) {
    c.beginPath();
    c.moveTo(x + k * crater, base - hgt + 6);
    c.bezierCurveTo(x + k * wd * 0.4, base - hgt * 0.7, x + k * wd * 0.3 + wd * 0.1, base - hgt * 0.4, x + k * wd * 0.8, base);
    c.stroke();
  }
  c.fillStyle = '#ffd23f';
  c.beginPath();
  c.ellipse(x, base - hgt, crater, crater * 0.35, 0, 0, 7);
  c.fill();
  if (!erupt) return;
  const g = c.createRadialGradient(x, base - hgt, 10, x, base - hgt, wd * 1.5);
  g.addColorStop(0, 'rgba(255,200,60,0.8)');
  g.addColorStop(1, 'rgba(255,80,20,0)');
  c.fillStyle = g;
  c.fillRect(x - wd * 1.5, base - hgt - wd * 1.5, wd * 3, wd * 3);
  // Fountain of lava bombs.
  c.strokeStyle = '#ffb02a';
  c.lineWidth = 5;
  for (let i = -4; i <= 4; i++) {
    c.beginPath();
    c.moveTo(x, base - hgt);
    c.quadraticCurveTo(x + i * 40, base - hgt - 330, x + i * 85, base - hgt - 60 + Math.abs(i) * 10);
    c.stroke();
    c.fillStyle = '#ff5a1a';
    c.beginPath();
    c.arc(x + i * 85, base - hgt - 60 + Math.abs(i) * 10, 10, 0, 7);
    c.fill();
  }
}

function paint(c, w, h) {
  const hz = h / 2;
  c.fillStyle = vgrad(c, 0, hz + 40, [[0, '#2a0a12'], [0.45, '#8a1a1a'], [0.85, '#ff5a1a'], [1, '#ffb02a']]);
  c.fillRect(0, 0, w, hz + 40);
  wrap(c, w, (r) => {
    // Ash clouds, dark and underlit.
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = 40 + r() * (hz - 160), s = 50 + r() * 60;
      c.fillStyle = 'rgba(30,12,16,0.8)';
      c.beginPath();
      for (let k = 0; k < 5; k++) c.arc(x + k * s * 0.7, y - Math.sin(k * 0.8) * s * 0.4, s * (0.6 + 0.3 * Math.sin(k * 1.3 + 1)), 0, 7);
      c.fill();
      c.fillStyle = 'rgba(255,90,30,0.25)';
      c.fillRect(x - 10, y + s * 0.4, s * 3, 6);
    }
    // Far ridges, a small volcano and the big erupting one.
    for (let i = 0; i < 9; i++) {
      c.fillStyle = '#3a1418';
      c.beginPath();
      c.moveTo(i * 240, hz + 50);
      c.lineTo(i * 240 + 120, hz - 70 - (i * 47 % 80));
      c.lineTo(i * 240 + 240, hz + 50);
      c.fill();
    }
    volcano(c, 450, hz + 80, 200, 190, false);
    volcano(c, 1400, hz + 100, 380, 340, true);
    volcano(c, 1850, hz + 80, 160, 150, true);
    // Embers floating everywhere.
    for (let i = 0; i < 160; i++) {
      c.fillStyle = `rgba(255,${120 + Math.floor(r() * 100)},30,${0.5 + r() * 0.5})`;
      c.beginPath();
      c.arc(r() * w, r() * h * 0.9, 1.5 + r() * 3, 0, 7);
      c.fill();
    }
  }, 5);
  // Dark cracked ground.
  c.fillStyle = vgrad(c, hz + 40, h, [[0, '#2a1416'], [1, '#120808']]);
  c.fillRect(0, hz + 40, w, h);
  // Glowing lava rivers wind around the whole circle (integer sines wrap).
  for (let k = 0; k < 3; k++) {
    const ry = (x) => hz + 190 + k * 110 + Math.sin(x / w * Math.PI * 2 * (3 + k) + k) * 26;
    for (const [lw, col] of [[34, '#ff4a10'], [20, '#ff9a1a'], [8, '#ffe070']]) {
      c.strokeStyle = col;
      c.lineWidth = lw * (1 + k * 0.25);
      c.lineJoin = 'round';
      c.beginPath();
      for (let x = 0; x <= w; x += 8) c.lineTo(x, ry(x));
      c.stroke();
    }
  }
  wrap(c, w, (r) => {
    // Dark rocks and glowing cracks.
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = hz + 130 + r() * (hz - 140), s = 14 + r() * 40;
      c.fillStyle = '#1a0c0e';
      c.beginPath();
      c.moveTo(x - s, y);
      c.lineTo(x - s * 0.4, y - s * 0.9);
      c.lineTo(x + s * 0.5, y - s * 0.8);
      c.lineTo(x + s, y);
      c.fill();
      c.strokeStyle = 'rgba(255,120,20,0.8)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x - s * 0.3, y - s * 0.7);
      c.lineTo(x, y - s * 0.3);
      c.lineTo(x + s * 0.2, y);
      c.stroke();
    }
    // Scorched dead trees.
    c.strokeStyle = '#120808';
    c.lineWidth = 9;
    c.lineCap = 'round';
    for (const x of [100, 760, 1100, 1650]) {
      const y = hz + 170;
      c.beginPath();
      c.moveTo(x, y + 60);
      c.lineTo(x, y - 90);
      c.moveTo(x, y - 20);
      c.lineTo(x - 40, y - 80);
      c.moveTo(x, y - 50);
      c.lineTo(x + 36, y - 100);
      c.stroke();
    }
  }, 9);
}

export default makeWorld({
  id: 'volcano360', name: 'Volcano 360', emoji: '🌋', asset: 'world-volcano',
  tint: [1.0, 0.45, 0.2], paint,
});
