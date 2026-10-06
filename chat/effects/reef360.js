// Reef 360: swim around a sunlit coral reef with fish and a turtle.
import { makeWorld, rng, wrap, vgrad } from './lib/world360.js';

function fish(c, x, y, s, col, dir) {
  c.save();
  c.translate(x, y);
  c.scale(dir * s, s);
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(0, 0, 30, 18, 0, 0, 7);
  c.moveTo(-24, 0);
  c.lineTo(-48, -16);
  c.lineTo(-48, 16);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.fillRect(6, -16, 6, 32);
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(16, -5, 5, 0, 7);
  c.fill();
  c.fillStyle = '#123';
  c.beginPath();
  c.arc(17, -5, 2.5, 0, 7);
  c.fill();
  c.restore();
}

function paint(c, w, h) {
  const r = rng(21);
  c.fillStyle = vgrad(c, 0, h, [[0, '#7df0ff'], [0.35, '#1fa8e0'], [0.7, '#0a5aa8'], [1, '#04264f']]);
  c.fillRect(0, 0, w, h);
  // Sun rays from the surface.
  wrap(c, w, (r) => {
    for (let i = 0; i < 12; i++) {
      const x = i * 190 + r() * 80, wd = 40 + r() * 60;
      const g = c.createLinearGradient(0, 0, 0, h * 0.8);
      g.addColorStop(0, 'rgba(255,255,220,0.38)');
      g.addColorStop(1, 'rgba(255,255,220,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + wd, 0);
      c.lineTo(x + wd - 220, h * 0.8);
      c.lineTo(x - 220, h * 0.8);
      c.fill();
    }
  });
  // Sandy floor with rolling dunes (integer sine so it wraps).
  c.fillStyle = vgrad(c, h * 0.66, h, [[0, '#e8cf94'], [1, '#a88650']]);
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) c.lineTo(x, h * 0.7 + Math.sin(x / w * Math.PI * 2 * 5) * 22 + Math.sin(x / w * Math.PI * 2 * 11) * 8);
  c.lineTo(w, h);
  c.fill();
  wrap(c, w, (r) => {
    // Distant rocks and arches in the blue.
    c.fillStyle = 'rgba(10,60,120,0.55)';
    for (let i = 0; i < 8; i++) {
      const x = i * 270 + r() * 60;
      c.beginPath();
      c.ellipse(x, h * 0.68, 90 + r() * 50, 90 + r() * 70, 0, Math.PI, 0);
      c.fill();
    }
    // Corals: branching, brain, fans and tubes.
    const cols = ['#ff5a8a', '#ff9a3c', '#c05aff', '#ffd23f', '#ff6a5a'];
    for (let i = 0; i < 26; i++) {
      const x = i * 80 + r() * 40, y = h * 0.74 + r() * h * 0.2, s = 0.7 + (y - h * 0.74) / h * 4, col = cols[i % 5], k = i % 4;
      c.fillStyle = col;
      c.strokeStyle = col;
      c.lineCap = 'round';
      if (k === 0) {
        c.lineWidth = 12 * s;
        for (let b = -2; b <= 2; b++) {
          c.beginPath();
          c.moveTo(x, y);
          c.quadraticCurveTo(x + b * 22 * s, y - 60 * s, x + b * 40 * s, y - 130 * s - Math.abs(b) * -10);
          c.stroke();
        }
      } else if (k === 1) {
        c.beginPath();
        c.ellipse(x, y, 60 * s, 46 * s, 0, Math.PI, 0);
        c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.18)';
        c.lineWidth = 3;
        for (let q = 0; q < 4; q++) {
          c.beginPath();
          c.arc(x - 24 * s + q * 16 * s, y - 14 * s, 14 * s, 0, 7);
          c.stroke();
        }
      } else if (k === 2) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - 70 * s, y - 130 * s);
        c.quadraticCurveTo(x, y - 160 * s, x + 70 * s, y - 130 * s);
        c.fill();
      } else {
        for (let t = 0; t < 4; t++) {
          c.fillRect(x + t * 16 * s, y - (60 + t * 20 % 50) * s, 12 * s, (60 + t * 20 % 50) * s);
          c.fillStyle = '#fff4';
          c.beginPath();
          c.ellipse(x + t * 16 * s + 6 * s, y - (60 + t * 20 % 50) * s, 6 * s, 3 * s, 0, 0, 7);
          c.fill();
          c.fillStyle = col;
        }
      }
    }
    // Seaweed.
    c.strokeStyle = '#2fc060';
    c.lineWidth = 8;
    for (let i = 0; i < 18; i++) {
      const x = r() * w, y = h * 0.8 + r() * h * 0.15;
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(x - 30, y - 60, x + 30, y - 120, x, y - 180 - r() * 60);
      c.stroke();
    }
    // Fish in schools.
    const fcols = ['#ffb32f', '#ff6a6a', '#4fd8ff', '#ffe14d', '#b46aff'];
    for (let g = 0; g < 7; g++) {
      const gx = g * 290 + 60, gy = h * 0.3 + r() * h * 0.25, dir = g % 2 ? 1 : -1;
      for (let k = 0; k < 6; k++) fish(c, gx + k * 36 * dir * -1, gy + Math.sin(k * 2) * 28, 0.8 + r() * 0.5, fcols[g % 5], dir);
    }
    // Sea turtle, centre of the world.
    const tx = 1100, ty = h * 0.42;
    c.fillStyle = '#7fd36a';
    for (const [fx, fy, a] of [[-70, -30, -0.8], [70, -30, 0.8], [-60, 40, -2.3], [60, 40, 2.3]]) {
      c.save();
      c.translate(tx + fx, ty + fy);
      c.rotate(a);
      c.beginPath();
      c.ellipse(0, -20, 18, 52, 0, 0, 7);
      c.fill();
      c.restore();
    }
    c.beginPath();
    c.ellipse(tx, ty - 80, 26, 30, 0, 0, 7);
    c.fill();
    c.fillStyle = '#123';
    c.beginPath();
    c.arc(tx - 9, ty - 86, 4, 0, 7);
    c.arc(tx + 9, ty - 86, 4, 0, 7);
    c.fill();
    const sg = c.createRadialGradient(tx - 20, ty - 20, 10, tx, ty, 90);
    sg.addColorStop(0, '#c9a35a');
    sg.addColorStop(1, '#7a5a26');
    c.fillStyle = sg;
    c.beginPath();
    c.ellipse(tx, ty, 62, 80, 0, 0, 7);
    c.fill();
    c.strokeStyle = '#5a3f18';
    c.lineWidth = 4;
    c.stroke();
    c.beginPath();
    for (let q = -1; q <= 1; q++) {
      c.moveTo(tx + q * 30 - 14, ty - 50);
      c.lineTo(tx + q * 30 + 14, ty - 50);
      c.moveTo(tx + q * 30 - 14, ty);
      c.lineTo(tx + q * 30 + 14, ty);
      c.moveTo(tx + q * 30 - 14, ty + 50);
      c.lineTo(tx + q * 30 + 14, ty + 50);
    }
    c.stroke();
    // Jellyfish and bubbles.
    for (const [jx, jy] of [[1700, h * 0.3], [450, h * 0.2], [1500, h * 0.55]]) {
      c.fillStyle = 'rgba(255,170,230,0.75)';
      c.beginPath();
      c.ellipse(jx, jy, 40, 34, 0, Math.PI, 0);
      c.fill();
      c.strokeStyle = 'rgba(255,170,230,0.7)';
      c.lineWidth = 4;
      for (let t = -2; t <= 2; t++) {
        c.beginPath();
        c.moveTo(jx + t * 14, jy);
        c.quadraticCurveTo(jx + t * 14 + 10, jy + 30, jx + t * 14, jy + 60);
        c.stroke();
      }
    }
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      c.beginPath();
      c.arc(r() * w, r() * h * 0.7, 3 + r() * 9, 0, 7);
      c.stroke();
    }
  });
}

export default makeWorld({
  id: 'reef360', name: 'Reef 360', emoji: '🐢', asset: 'world-reef',
  tint: [0.4, 0.9, 1.0], paint,
});
