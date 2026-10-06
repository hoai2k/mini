// Snow 360: alpine peaks at alpenglow, pine trees and a cosy cabin.
import { makeWorld, wrap, vgrad } from './lib/world360.js';

function peak(c, x, base, wd, hgt, body, shade) {
  c.fillStyle = body;
  c.beginPath();
  c.moveTo(x - wd, base);
  c.lineTo(x - wd * 0.3, base - hgt * 0.7);
  c.lineTo(x, base - hgt);
  c.lineTo(x + wd * 0.35, base - hgt * 0.65);
  c.lineTo(x + wd, base);
  c.fill();
  c.fillStyle = shade;
  c.beginPath();
  c.moveTo(x, base - hgt);
  c.lineTo(x + wd * 0.35, base - hgt * 0.65);
  c.lineTo(x + wd, base);
  c.lineTo(x + wd * 0.1, base);
  c.fill();
  // Snow cap.
  c.fillStyle = '#fff';
  c.beginPath();
  c.moveTo(x, base - hgt);
  c.lineTo(x - wd * 0.3, base - hgt * 0.7);
  c.lineTo(x - wd * 0.12, base - hgt * 0.74);
  c.lineTo(x, base - hgt * 0.62);
  c.lineTo(x + wd * 0.15, base - hgt * 0.72);
  c.lineTo(x + wd * 0.35, base - hgt * 0.65);
  c.fill();
}

function pine(c, x, base, hgt) {
  c.fillStyle = '#4a3020';
  c.fillRect(x - hgt * 0.03, base - hgt * 0.15, hgt * 0.06, hgt * 0.15);
  for (let i = 0; i < 4; i++) {
    const y = base - hgt * (0.1 + i * 0.22), wd = hgt * (0.3 - i * 0.05);
    c.fillStyle = '#1e6a4a';
    c.beginPath();
    c.moveTo(x - wd, y);
    c.lineTo(x, y - hgt * 0.32);
    c.lineTo(x + wd, y);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(x - wd * 0.7, y - hgt * 0.1);
    c.lineTo(x, y - hgt * 0.32);
    c.lineTo(x + wd * 0.7, y - hgt * 0.1);
    c.quadraticCurveTo(x, y - hgt * 0.02, x - wd * 0.7, y - hgt * 0.1);
    c.fill();
  }
}

function paint(c, w, h) {
  const hz = h / 2;
  c.fillStyle = vgrad(c, 0, hz, [[0, '#2a2a78'], [0.5, '#9a5aa8'], [0.8, '#ff9a8a'], [1, '#ffd4a0']]);
  c.fillRect(0, 0, w, hz);
  wrap(c, w, (r) => {
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`;
      c.fillRect(r() * w, r() * hz * 0.5, 2, 2);
    }
    // Far, middle and near ranges, with alpenglow on the far ones.
    for (let i = 0; i < 8; i++) peak(c, i * 280 + 60, hz + 20, 230, 200 + (i * 53 % 120), '#c88ab8', '#9a5a98');
    for (let i = 0; i < 6; i++) peak(c, i * 380 + 120, hz + 60, 300, 330 + (i * 71 % 110), '#8a7ac0', '#5a4a98');
    for (let i = 0; i < 4; i++) peak(c, i * 570 + 300, hz + 90, 380, 300 + (i * 97 % 120), '#5a6ab0', '#3a4488');
  }, 3);
  // Snowfield.
  c.fillStyle = vgrad(c, hz + 90, h, [[0, '#f6e4f0'], [0.3, '#e8f0ff'], [1, '#c8d8f4']]);
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) c.lineTo(x, hz + 90 + Math.sin(x / w * Math.PI * 2 * 6) * 16 + Math.sin(x / w * Math.PI * 2 * 13) * 6);
  c.lineTo(w, h);
  c.fill();
  wrap(c, w, (r) => {
    // Pines of all sizes.
    for (let i = 0; i < 26; i++) pine(c, r() * w, hz + 130 + r() * 300, 150 + r() * 200);
    // Cabin with smoke.
    const x = 1000, y = hz + 250;
    c.fillStyle = '#a0522d';
    c.fillRect(x - 100, y - 100, 200, 100);
    c.strokeStyle = '#6b3418';
    c.lineWidth = 3;
    for (let k = 1; k < 5; k++) {
      c.beginPath();
      c.moveTo(x - 100, y - k * 20);
      c.lineTo(x + 100, y - k * 20);
      c.stroke();
    }
    c.fillStyle = '#d83a3a';
    c.beginPath();
    c.moveTo(x - 125, y - 95);
    c.lineTo(x, y - 190);
    c.lineTo(x + 125, y - 95);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(x - 125, y - 95);
    c.lineTo(x, y - 190);
    c.lineTo(x + 125, y - 95);
    c.lineTo(x + 100, y - 100);
    c.lineTo(x, y - 170);
    c.lineTo(x - 100, y - 100);
    c.fill();
    c.fillStyle = '#6b4220';
    c.fillRect(x + 40, y - 190, 26, 50);
    const wg = c.createRadialGradient(x - 45, y - 55, 3, x - 45, y - 55, 80);
    wg.addColorStop(0, 'rgba(255,220,120,0.9)');
    wg.addColorStop(1, 'rgba(255,220,120,0)');
    c.fillStyle = wg;
    c.fillRect(x - 130, y - 130, 170, 150);
    c.fillStyle = '#ffd36e';
    c.fillRect(x - 70, y - 80, 50, 50);
    c.fillStyle = '#6b3418';
    c.fillRect(x - 48, y - 80, 4, 50);
    c.fillRect(x - 70, y - 57, 50, 4);
    c.fillStyle = '#4a2a10';
    c.fillRect(x + 20, y - 70, 40, 70);
    c.fillStyle = 'rgba(255,255,255,0.7)';
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.arc(x + 53 + k * 12, y - 220 - k * 36, 14 + k * 5, 0, 7);
      c.fill();
    }
    // Snowman.
    const sx = 1650, sy = hz + 330;
    c.fillStyle = '#fff';
    c.strokeStyle = '#a8b8d8';
    c.lineWidth = 3;
    for (const [dy, rad] of [[0, 55], [-75, 40], [-130, 28]]) {
      c.beginPath();
      c.arc(sx, sy + dy, rad, 0, 7);
      c.fill();
      c.stroke();
    }
    c.fillStyle = '#ff8a2a';
    c.beginPath();
    c.moveTo(sx, sy - 130);
    c.lineTo(sx + 32, sy - 124);
    c.lineTo(sx, sy - 118);
    c.fill();
    c.fillStyle = '#222';
    c.fillRect(sx - 22, sy - 175, 44, 22);
    c.fillRect(sx - 30, sy - 156, 60, 6);
    c.beginPath();
    c.arc(sx - 9, sy - 138, 3, 0, 7);
    c.arc(sx + 9, sy - 138, 3, 0, 7);
    c.fill();
    // Falling snow all around.
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 260; i++) {
      c.beginPath();
      c.arc(r() * w, r() * h, 1.5 + r() * 3.5, 0, 7);
      c.fill();
    }
  }, 6);
}

export default makeWorld({
  id: 'snow360', name: 'Snow 360', emoji: '🏔️', asset: 'world-snow',
  tint: [1.0, 0.7, 0.8], paint,
});
