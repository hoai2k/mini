// Candy 360: lollipop trees, gumdrop hills and a chocolate river.
import { makeWorld, wrap, vgrad } from './lib/world360.js';

const PAL = ['#ff5a9a', '#ffd23f', '#4fd8ff', '#9a6aff', '#6aff9a', '#ff8a3d'];

function lolly(c, x, base, s, col) {
  c.fillStyle = '#fff';
  c.fillRect(x - s * 0.04, base - s * 1.4, s * 0.08, s * 1.4);
  c.strokeStyle = '#d9d0e0';
  c.lineWidth = 2;
  c.strokeRect(x - s * 0.04, base - s * 1.4, s * 0.08, s * 1.4);
  const cy = base - s * 1.5;
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, cy, s * 0.5, 0, 7);
  c.fill();
  c.strokeStyle = '#fff';
  c.lineWidth = s * 0.09;
  c.beginPath();
  for (let a = 0; a < 14; a += 0.15) {
    const rr = a / 14 * s * 0.42;
    c.lineTo(x + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(x, cy, s * 0.5, 0, 7);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.beginPath();
  c.ellipse(x - s * 0.2, cy - s * 0.25, s * 0.1, s * 0.05, -0.7, 0, 7);
  c.fill();
}

function cane(c, x, base, s) {
  c.lineCap = 'round';
  c.lineWidth = s * 0.14;
  c.strokeStyle = '#fff';
  c.beginPath();
  c.moveTo(x, base);
  c.lineTo(x, base - s);
  c.arc(x + s * 0.25, base - s, s * 0.25, Math.PI, 0);
  c.stroke();
  c.strokeStyle = '#ff3a5a';
  c.setLineDash([s * 0.1, s * 0.12]);
  c.stroke();
  c.setLineDash([]);
}

function paint(c, w, h) {
  const hz = h / 2;
  c.fillStyle = vgrad(c, 0, hz, [[0, '#8ad8ff'], [0.6, '#ffc8f0'], [1, '#fff0d8']]);
  c.fillRect(0, 0, w, hz);
  wrap(c, w, (r) => {
    // Cotton-candy clouds.
    for (let i = 0; i < 12; i++) {
      const x = r() * w, y = 60 + r() * (hz - 220), s = 40 + r() * 40;
      c.fillStyle = i % 2 ? 'rgba(255,170,220,0.92)' : 'rgba(170,230,255,0.92)';
      c.beginPath();
      for (let k = 0; k < 5; k++) c.arc(x + k * s * 0.7, y - Math.sin(k * 0.8) * s * 0.4, s * (0.6 + 0.3 * Math.sin(k * 1.3 + 1)), 0, 7);
      c.fill();
    }
    // Gumdrop hills with sugar speckles.
    for (let i = 0; i < 12; i++) {
      const x = i * 180 + r() * 60, rad = 110 + r() * 120;
      c.fillStyle = PAL[i % 6];
      c.beginPath();
      c.ellipse(x, hz + 60, rad, rad * 0.8, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)';
      for (let k = 0; k < 20; k++) c.fillRect(x + (r() - 0.5) * rad * 1.6, hz + 60 - r() * rad * 0.7, 3, 3);
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.beginPath();
      c.ellipse(x - rad * 0.4, hz + 60 - rad * 0.45, rad * 0.14, rad * 0.07, -0.7, 0, 7);
      c.fill();
    }
  }, 7);
  // Pink frosting ground.
  c.fillStyle = vgrad(c, hz + 60, h, [[0, '#ffc0e4'], [1, '#ff8ac4']]);
  c.fillRect(0, hz + 60, w, h);
  // Chocolate river: a wavy band around the whole circle (integer sines wrap).
  const ry = (x) => hz + 150 + Math.sin(x / w * Math.PI * 2 * 3) * 30;
  const band = (dy, col) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, ry(0) + dy);
    for (let x = 0; x <= w; x += 8) c.lineTo(x, ry(x) + dy);
    for (let x = w; x >= 0; x -= 8) c.lineTo(x, ry(x) + dy + 90);
    c.fill();
  };
  band(-8, '#7a4a30');
  band(0, '#4a2a18');
  c.strokeStyle = 'rgba(255,220,180,0.4)';
  c.lineWidth = 3;
  c.beginPath();
  for (let x = 0; x <= w; x += 8) c.lineTo(x, ry(x) + 30 + Math.sin(x * 0.05) * 5);
  c.stroke();
  wrap(c, w, (r) => {
    // Lollipop trees, near and far, candy canes, cupcakes and sprinkles.
    for (let i = 0; i < 16; i++) lolly(c, i * 130 + r() * 60, hz + 120 + r() * 80, 90 + r() * 80, PAL[i % 6]);
    for (let i = 0; i < 5; i++) cane(c, 150 + i * 400, hz + 140, 130);
    for (let i = 0; i < 4; i++) {
      const x = 300 + i * 500, y = h - 70 - (i % 2) * 40;
      c.fillStyle = '#ffe0a0';
      c.beginPath();
      c.moveTo(x - 50, y - 50);
      c.lineTo(x + 50, y - 50);
      c.lineTo(x + 36, y + 10);
      c.lineTo(x - 36, y + 10);
      c.fill();
      c.fillStyle = PAL[i];
      c.beginPath();
      c.arc(x, y - 66, 52, Math.PI, 0);
      c.arc(x, y - 90, 30, Math.PI, 0);
      c.fill();
      c.fillStyle = '#ff2a4a';
      c.beginPath();
      c.arc(x, y - 124, 12, 0, 7);
      c.fill();
    }
    for (let i = 0; i < 180; i++) {
      c.save();
      c.translate(r() * w, hz + 70 + r() * (hz - 70));
      c.rotate(r() * 3);
      c.fillStyle = PAL[Math.floor(r() * 6)];
      c.fillRect(-7, -2, 14, 4);
      c.restore();
    }
  }, 12);
}

export default makeWorld({
  id: 'candy360', name: 'Candy 360', emoji: '🍭', asset: 'world-candy',
  tint: [1.0, 0.6, 0.85], paint,
});
