// Beach 360: look around a sunny tropical beach.
import { makeWorld, rng, wrap, vgrad } from './lib/world360.js';

function palm(c, x, base, hgt, lean) {
  c.lineCap = 'round';
  const tx = x + lean, ty = base - hgt;
  c.strokeStyle = '#8a5a2b';
  c.lineWidth = hgt * 0.07;
  c.beginPath();
  c.moveTo(x, base);
  c.quadraticCurveTo(x + lean * 0.1, base - hgt * 0.6, tx, ty);
  c.stroke();
  c.strokeStyle = '#6b4220';
  c.lineWidth = 3;
  for (let i = 1; i < 8; i++) {
    c.beginPath();
    const y = base - hgt * i / 8;
    c.moveTo(x - hgt * 0.035, y);
    c.lineTo(x + hgt * 0.035, y);
    c.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.52;
    const len = hgt * 0.55;
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.7 + len * 0.35;
    c.fillStyle = i % 2 ? '#2fa83f' : '#3fc44f';
    c.beginPath();
    c.moveTo(tx, ty);
    c.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.9 - 20, ex, ey);
    c.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 + 10, tx, ty);
    c.fill();
  }
  c.fillStyle = '#5b3a1c';
  for (const d of [-8, 6]) {
    c.beginPath();
    c.arc(tx + d, ty + 12, 9, 0, 7);
    c.fill();
  }
}

function paint(c, w, h) {
  const r = rng(11);
  const hz = h / 2;
  c.fillStyle = vgrad(c, 0, hz, [[0, '#2a8cf0'], [0.7, '#7cc8ff'], [1, '#d6f3ff']]);
  c.fillRect(0, 0, w, hz);
  // Sun with glow.
  const sg = c.createRadialGradient(1450, hz - 190, 10, 1450, hz - 190, 260);
  sg.addColorStop(0, 'rgba(255,250,200,1)');
  sg.addColorStop(0.2, 'rgba(255,240,150,0.7)');
  sg.addColorStop(1, 'rgba(255,240,150,0)');
  c.fillStyle = sg;
  c.fillRect(1100, 0, 700, hz + 100);
  c.fillStyle = '#fff6b0';
  c.beginPath();
  c.arc(1450, hz - 190, 48, 0, 7);
  c.fill();
  // Fluffy clouds.
  wrap(c, w, (r) => {
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = 60 + r() * (hz - 200), s = 40 + r() * 50;
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.beginPath();
      for (let k = 0; k < 5; k++) c.arc(x + k * s * 0.7, y - Math.sin(k * 0.8) * s * 0.4, s * (0.6 + 0.3 * Math.sin(k * 1.3 + 1)), 0, 7);
      c.fill();
    }
  });
  // Sea: turquoise gradient with glints.
  c.fillStyle = vgrad(c, hz, hz + 160, [[0, '#0e8fc8'], [0.5, '#1fc7d4'], [1, '#7be8d8']]);
  c.fillRect(0, hz, w, 160);
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 2;
  wrap(c, w, (r) => {
    for (let i = 0; i < 120; i++) {
      const x = r() * w, y = hz + 8 + r() * 140, l = 10 + (y - hz) * 0.3;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + l, y);
      c.stroke();
    }
    // Island and sailboat on the horizon.
    c.fillStyle = '#2e8a5a';
    c.beginPath();
    c.ellipse(300, hz, 150, 36, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(900, hz + 40);
    c.lineTo(900, hz - 30);
    c.lineTo(940, hz + 36);
    c.fill();
    c.fillStyle = '#ff5a5a';
    c.fillRect(884, hz + 40, 70, 10);
    c.fillStyle = '#ffd36e';
    c.beginPath();
    c.moveTo(896, hz + 36);
    c.lineTo(896, hz - 14);
    c.lineTo(868, hz + 36);
    c.fill();
  });
  // Surf foam.
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.fillRect(0, hz + 150, w, 6);
  // Sand.
  c.fillStyle = vgrad(c, hz + 156, h, [[0, '#fbe8b0'], [0.5, '#f1cf86'], [1, '#d9aa5c']]);
  c.fillRect(0, hz + 156, w, h);
  wrap(c, w, (r) => {
    for (let i = 0; i < 500; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(160,110,40,0.2)';
      c.fillRect(r() * w, hz + 170 + r() * (hz - 170), 3, 2);
    }
    // Palm trees all around, in varied sizes.
    for (const [x, b, hg, ln] of [[120, 650, 360, 70], [520, 690, 300, -60], [1000, 640, 400, 90], [1700, 680, 330, -80], [1950, 720, 280, 50]]) palm(c, x, b, hg, ln);
    // Striped umbrella with towel.
    const ux = 760, uy = 760;
    c.fillStyle = '#6b4220';
    c.fillRect(ux - 4, uy - 150, 8, 170);
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? '#fff' : '#ff4f6d';
      c.beginPath();
      c.moveTo(ux, uy - 190);
      c.arc(ux, uy - 150, 130, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6);
      c.fill();
    }
    c.fillStyle = '#35b6ff';
    c.fillRect(ux + 40, uy + 30, 190, 70);
    c.fillStyle = '#fff';
    c.fillRect(ux + 40, uy + 55, 190, 12);
    // Sandcastle.
    const sx = 1320, sy = 800;
    c.fillStyle = '#e8c070';
    c.fillRect(sx, sy - 80, 150, 80);
    for (let i = 0; i < 4; i++) c.fillRect(sx + i * 42, sy - 100, 24, 24);
    c.fillRect(sx + 50, sy - 150, 50, 70);
    c.fillStyle = '#ff5a5a';
    c.beginPath();
    c.moveTo(sx + 45, sy - 150);
    c.lineTo(sx + 75, sy - 195);
    c.lineTo(sx + 105, sy - 150);
    c.fill();
    c.fillStyle = '#b8883c';
    c.fillRect(sx + 63, sy - 40, 24, 40);
    // Beach ball and starfish.
    c.beginPath();
    c.arc(1600, 830, 38, 0, 7);
    c.fillStyle = '#fff';
    c.fill();
    for (let i = 0; i < 6; i++) {
      c.fillStyle = ['#ff4f6d', '#ffd23f', '#35b6ff'][i % 3];
      c.beginPath();
      c.moveTo(1600, 830);
      c.arc(1600, 830, 38, i * 1.047, (i + 0.5) * 1.047);
      c.fill();
    }
    c.fillStyle = '#ff8a3d';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? 12 : 30;
      c.lineTo(450 + Math.cos(a) * rr, 880 + Math.sin(a) * rr);
    }
    c.fill();
    // Gulls.
    c.strokeStyle = '#fff';
    c.lineWidth = 4;
    c.lineCap = 'round';
    for (const [gx, gy] of [[600, 250], [650, 290], [1100, 200], [1800, 260], [1850, 230], [300, 300]]) {
      c.beginPath();
      c.moveTo(gx - 24, gy + 6);
      c.quadraticCurveTo(gx - 10, gy - 14, gx, gy);
      c.quadraticCurveTo(gx + 10, gy - 14, gx + 24, gy + 6);
      c.stroke();
    }
  });
}

export default makeWorld({
  id: 'beach360', name: 'Beach 360', emoji: '🏝️', asset: 'world-beach',
  hint: 'Tilt your phone or turn your head to look around',
  tint: [1.0, 0.85, 0.55], paint,
});
