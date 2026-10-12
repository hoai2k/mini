// Kart Dash: drawn stand-ins for the artwork (used until each kart-* image is
// delivered), the track map the ground is read from, and tinting.

import { pointAt, WORLD, rng } from './track.js';

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

// '#rrggbb' -> [r, g, b] 0..255; anything else -> pink.
export function parseColor(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim());
  if (!m) return [255, 95, 162];
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
const rgb = (a, k = 1) => `rgb(${a.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
const shade = (c, k) => rgb(parseColor(c), k);

// Multiplies a colour into an image's white parts, keeping its alpha.
export function tint(src, color) {
  const c = canvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(src, 0, 0);
  return c;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// --- karts -------------------------------------------------------------------
// A kart sprite is 256 x 256: the ground under it at y = KART_GROUND, the
// driver's head centred at KART_HEAD (x, y) with radius KART_HEAD.r. The kart
// is about KART_SPAN metres across the whole sprite width.
export const KART_SPAN = 2.5;
export const KART_GROUND = 0.92;
export const KART_HEAD = { back: [0.5, 0.36], left: [0.46, 0.36], right: [0.54, 0.36], r: 0.135 };

// turn: -1 left, 0 straight on, 1 right.
export function drawKart(color, turn = 0) {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  const base = parseColor(color);
  const dark = rgb(base, 0.62), light = rgb(base.map(v => v + (255 - v) * 0.45));
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // Shadow.
  g.fillStyle = 'rgba(0,0,0,0.32)';
  g.beginPath();
  g.ellipse(128, 236, 116, 15, 0, 0, Math.PI * 2);
  g.fill();
  const sk = turn * 14; // how far the front of the kart swings sideways
  // Front wheels peeking out on the far side.
  const tyre = (x, y, w, h) => {
    g.fillStyle = '#1b1b22';
    roundRect(g, x, y, w, h, 10);
    g.fill();
    g.strokeStyle = '#3c3c48';
    g.lineWidth = 3;
    for (let k = y + 10; k < y + h - 6; k += 11) {
      g.beginPath();
      g.moveTo(x + 5, k);
      g.lineTo(x + w - 5, k);
      g.stroke();
    }
  };
  tyre(40 + sk * 1.8, 132, 34, 46);
  tyre(182 + sk * 1.8, 132, 34, 46);
  // Body: a low wedge, wider at the back.
  const grad = g.createLinearGradient(0, 120, 0, 220);
  grad.addColorStop(0, light);
  grad.addColorStop(0.55, rgb(base));
  grad.addColorStop(1, dark);
  g.fillStyle = grad;
  g.strokeStyle = rgb(base, 0.42);
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(44, 212);
  g.lineTo(212, 212);
  g.quadraticCurveTo(222, 170, 196 + sk, 140);
  g.lineTo(60 + sk, 140);
  g.quadraticCurveTo(34, 170, 44, 212);
  g.closePath();
  g.fill();
  g.stroke();
  // Nose cone ahead, visible over the body when turning.
  g.fillStyle = rgb(base, 0.85);
  g.beginPath();
  g.ellipse(128 + sk * 2.4, 138, 46, 14, 0, Math.PI, 0);
  g.fill();
  // Seat back.
  g.fillStyle = '#2a2433';
  roundRect(g, 92 + sk * 0.5, 120, 72, 46, 16);
  g.fill();
  // Stripe.
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.moveTo(112, 212);
  g.lineTo(144, 212);
  g.lineTo(138 + sk * 0.6, 166);
  g.lineTo(118 + sk * 0.6, 166);
  g.closePath();
  g.fill();
  // Rear tyres.
  tyre(10, 170, 50, 66);
  tyre(196, 170, 50, 66);
  // Bumper and exhausts.
  g.fillStyle = '#3a3f4b';
  roundRect(g, 58, 200, 140, 18, 8);
  g.fill();
  for (const x of [92, 164]) {
    g.fillStyle = '#9aa3b2';
    g.beginPath();
    g.arc(x, 206, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#23262e';
    g.beginPath();
    g.arc(x, 206, 6.5, 0, Math.PI * 2);
    g.fill();
  }
  // Spoiler.
  g.fillStyle = '#2f2f3a';
  g.fillRect(70 + sk * 0.3, 142, 10, 22);
  g.fillRect(176 + sk * 0.3, 142, 10, 22);
  g.fillStyle = light;
  g.strokeStyle = rgb(base, 0.42);
  g.lineWidth = 5;
  roundRect(g, 28 + sk * 0.4, 128, 200, 20, 9);
  g.fill();
  g.stroke();
  // Shine.
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(42 + sk * 0.4, 134);
  g.lineTo(110 + sk * 0.4, 134);
  g.stroke();
  return c;
}

// --- items and scenery -------------------------------------------------------
export function drawItemBox() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 128, 128);
  ['#ff5f6d', '#ffc94d', '#6ee77a', '#4dc3ff', '#b77dff'].forEach((col, i) => grad.addColorStop(i / 4, col));
  g.fillStyle = 'rgba(255,255,255,0.32)';
  roundRect(g, 10, 10, 108, 108, 20);
  g.fill();
  g.strokeStyle = grad;
  g.lineWidth = 9;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.ellipse(42, 34, 22, 9, -0.5, 0, Math.PI * 2);
  g.fill();
  g.font = '900 74px ui-rounded, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 7;
  g.strokeStyle = 'rgba(70,40,120,0.55)';
  g.strokeText('?', 64, 68);
  g.fillStyle = '#fff';
  g.fillText('?', 64, 68);
  return c;
}

export function drawBoost() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.translate(64, 64);
  g.rotate(-0.7);
  // Flame.
  const fl = g.createLinearGradient(0, 20, 0, 62);
  fl.addColorStop(0, '#fff3a0');
  fl.addColorStop(0.5, '#ffa31a');
  fl.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = fl;
  g.beginPath();
  g.moveTo(-14, 22);
  g.quadraticCurveTo(0, 74, 14, 22);
  g.fill();
  // Fins.
  g.fillStyle = '#ffd43b';
  g.strokeStyle = '#8a4b00';
  g.lineWidth = 4;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * 14, 0);
    g.lineTo(s * 30, 28);
    g.lineTo(s * 12, 22);
    g.closePath();
    g.fill();
    g.stroke();
  }
  // Body.
  g.fillStyle = '#ff4757';
  g.strokeStyle = '#8f1020';
  g.beginPath();
  g.moveTo(0, -52);
  g.quadraticCurveTo(22, -26, 16, 24);
  g.lineTo(-16, 24);
  g.quadraticCurveTo(-22, -26, 0, -52);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(0, -10, 8, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#4dc3ff';
  g.beginPath();
  g.arc(0, -10, 5, 0, Math.PI * 2);
  g.fill();
  return c;
}

export function drawBanana() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(64, 112, 46, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.lineJoin = 'round';
  g.strokeStyle = '#8a6400';
  g.lineWidth = 5;
  const flap = (a, len) => {
    g.save();
    g.translate(64, 96);
    g.rotate(a);
    g.fillStyle = '#ffd93b';
    g.beginPath();
    g.moveTo(-10, 0);
    g.quadraticCurveTo(-16, -len * 0.6, -2, -len);
    g.quadraticCurveTo(14, -len * 0.55, 10, 0);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#fff6c0';
    g.beginPath();
    g.ellipse(0, -len * 0.45, 3.5, len * 0.28, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  flap(-1.1, 48);
  flap(1.1, 48);
  flap(-0.15, 64);
  g.fillStyle = '#6b4a1a';
  g.beginPath();
  g.arc(64, 98, 8, 0, Math.PI * 2);
  g.fill();
  return c;
}

export function drawBomb() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  // Feet.
  g.fillStyle = '#ffb703';
  g.strokeStyle = '#6b3d00';
  g.lineWidth = 4;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(64 + s * 22, 112, 16, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  const body = g.createRadialGradient(48, 50, 6, 64, 70, 46);
  body.addColorStop(0, '#6c7086');
  body.addColorStop(0.5, '#2a2c38');
  body.addColorStop(1, '#0d0d14');
  g.fillStyle = body;
  g.beginPath();
  g.arc(64, 70, 42, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#7d8295';
  roundRect(g, 54, 20, 20, 14, 4);
  g.fill();
  // Fuse and spark.
  g.strokeStyle = '#c8a46e';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(64, 22);
  g.quadraticCurveTo(70, 6, 86, 10);
  g.stroke();
  g.fillStyle = '#fff3a0';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, r = i % 2 ? 6 : 14;
    g.lineTo(88 + Math.cos(a) * r, 9 + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath();
  g.ellipse(46, 52, 10, 6, -0.6, 0, Math.PI * 2);
  g.fill();
  return c;
}

export function drawStar() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  const star = r => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.48 : r;
      g.lineTo(64 + Math.cos(a) * rr, 66 + Math.sin(a) * rr);
    }
    g.closePath();
  };
  const grad = g.createLinearGradient(0, 0, 128, 128);
  ['#ff5f6d', '#ffc94d', '#6ee77a', '#4dc3ff', '#b77dff'].forEach((col, i) => grad.addColorStop(i / 4, col));
  star(60);
  g.fillStyle = grad;
  g.fill();
  star(46);
  const inner = g.createRadialGradient(56, 54, 4, 64, 66, 46);
  inner.addColorStop(0, '#fffbe0');
  inner.addColorStop(1, '#ffd43b');
  g.fillStyle = inner;
  g.fill();
  g.strokeStyle = '#c47c00';
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = '#fff';
  for (const [x, y, r] of [[100, 22, 5], [24, 30, 4], [104, 100, 4]]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

export function drawTyres() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath();
  g.ellipse(64, 118, 56, 9, 0, 0, Math.PI * 2);
  g.fill();
  for (let k = 0; k < 3; k++) {
    const y = 96 - k * 30;
    g.fillStyle = '#17171d';
    roundRect(g, 12, y - 14, 104, 36, 16);
    g.fill();
    g.fillStyle = k % 2 ? '#fff' : '#e8413a';
    roundRect(g, 18, y - 4, 92, 12, 6);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(22, y - 9);
    g.lineTo(106, y - 9);
    g.stroke();
  }
  return c;
}

export function drawTree(variant = 0) {
  const c = canvas(128, 192);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath();
  g.ellipse(64, 182, 40, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#8b5a2b';
  g.strokeStyle = '#4e2f12';
  g.lineWidth = 4;
  roundRect(g, 54, 112, 20, 72, 6);
  g.fill();
  g.stroke();
  const greens = [['#2f9e44', '#51cf66', '#8ce99a'], ['#2b8a3e', '#40c057', '#94d82d'], ['#1c7c54', '#38b26d', '#7be0a6']][variant % 3];
  const blobs = [[64, 92, 50], [36, 104, 30], [92, 104, 30], [64, 56, 40]];
  g.fillStyle = greens[0];
  for (const [x, y, r] of blobs) {
    g.beginPath();
    g.arc(x, y + 4, r, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = greens[1];
  for (const [x, y, r] of blobs) {
    g.beginPath();
    g.arc(x - 3, y - 2, r * 0.86, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = greens[2];
  g.beginPath();
  g.ellipse(48, 46, 14, 9, -0.6, 0, Math.PI * 2);
  g.fill();
  return c;
}

// The six flying kart parts in a 3 x 2 sheet of 128-pixel cells: wheel, bolt,
// bent body panel (white, tinted per kart), spoiler (white), spring, exhaust.
export function drawParts() {
  const c = canvas(384, 256);
  const g = c.getContext('2d');
  const cell = (i, fn) => {
    g.save();
    g.translate((i % 3) * 128 + 64, Math.floor(i / 3) * 128 + 64);
    fn();
    g.restore();
  };
  cell(0, () => {
    g.fillStyle = '#17171d';
    g.beginPath();
    g.arc(0, 0, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#b8c0cc';
    g.beginPath();
    g.arc(0, 0, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#6c7380';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(Math.cos(a) * 12, Math.sin(a) * 12, 4, 0, Math.PI * 2);
      g.fill();
    }
  });
  cell(1, () => {
    g.fillStyle = '#c7ced8';
    g.strokeStyle = '#5c6470';
    g.lineWidth = 4;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.lineTo(Math.cos(a) * 24, Math.sin(a) * 24 - 16);
    }
    g.closePath();
    g.fill();
    g.stroke();
    g.fillRect(-9, -2, 18, 50);
    g.strokeRect(-9, -2, 18, 50);
  });
  cell(2, () => {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#8a8f99';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(-50, -30);
    g.lineTo(20, -40);
    g.lineTo(50, -6);
    g.lineTo(30, 38);
    g.lineTo(-40, 30);
    g.lineTo(-24, 0);
    g.closePath();
    g.fill();
    g.stroke();
  });
  cell(3, () => {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#8a8f99';
    g.lineWidth = 5;
    roundRect(g, -54, -26, 108, 22, 8);
    g.fill();
    g.stroke();
    g.fillStyle = '#3a3f4b';
    g.fillRect(-30, -4, 10, 34);
    g.fillRect(20, -4, 10, 34);
  });
  cell(4, () => {
    g.strokeStyle = '#d0d6df';
    g.lineWidth = 7;
    g.beginPath();
    for (let k = 0; k <= 8; k++) g.lineTo(k % 2 ? 22 : -22, -44 + k * 11);
    g.stroke();
  });
  cell(5, () => {
    g.fillStyle = '#a3abb8';
    g.strokeStyle = '#4e5561';
    g.lineWidth = 4;
    roundRect(g, -46, -12, 92, 24, 10);
    g.fill();
    g.stroke();
    g.fillStyle = '#23262e';
    g.beginPath();
    g.ellipse(46, 0, 8, 12, 0, 0, Math.PI * 2);
    g.fill();
  });
  return c;
}

// --- ground and sky ----------------------------------------------------------
// Tiling grass and asphalt detail, 256 px, for when the art isn't here yet.
export function drawGrassTile() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#5cbf45';
  g.fillRect(0, 0, 256, 256);
  const r = rng(11);
  const wrap = (fn) => { for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) fn(ox, oy); };
  for (let i = 0; i < 900; i++) {
    const x = r() * 256, y = r() * 256, l = 3 + r() * 6, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
    g.strokeStyle = r() < 0.5 ? 'rgba(40,120,30,0.55)' : 'rgba(150,230,110,0.5)';
    g.lineWidth = 1.6;
    wrap((ox, oy) => {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
      g.stroke();
    });
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * 256, y = r() * 256;
    g.fillStyle = ['#fff', '#ffe066', '#ffa8d0'][i % 3];
    wrap((ox, oy) => {
      g.beginPath();
      g.arc(x + ox, y + oy, 2.2, 0, Math.PI * 2);
      g.fill();
    });
  }
  return c;
}

export function drawRoadTile() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#7f8492';
  g.fillRect(0, 0, 256, 256);
  const r = rng(5);
  // Soft blotches, then fine speckles.
  for (let i = 0; i < 40; i++) {
    const x = r() * 256, y = r() * 256, rad = 10 + r() * 26;
    g.fillStyle = r() < 0.5 ? 'rgba(60,62,75,0.06)' : 'rgba(190,195,210,0.06)';
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      g.beginPath();
      g.arc(x + ox, y + oy, rad, 0, Math.PI * 2);
      g.fill();
    }
  }
  for (let i = 0; i < 1800; i++) {
    const v = r();
    g.fillStyle = v < 0.5 ? `rgba(50,52,64,${0.1 + r() * 0.16})` : `rgba(210,214,224,${0.1 + r() * 0.16})`;
    const s = 1 + r() * 1.2;
    g.fillRect(r() * 256, r() * 256, s, s);
  }
  return c;
}

// Sky, distant mountains and hills: 2048 x 512, tiling sideways.
export function drawSky() {
  const W = 2048, H = 512;
  const c = canvas(W, H);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#3d8bff');
  grad.addColorStop(0.55, '#7cc4ff');
  grad.addColorStop(0.9, '#cdeeff');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const r = rng(3);
  const wrapX = fn => { for (const ox of [-W, 0, W]) fn(ox); };
  // Clouds.
  for (let i = 0; i < 16; i++) {
    const x = r() * W, y = 60 + r() * 220, s = 0.6 + r() * 0.9;
    const puffs = Array.from({ length: 6 }, () => [(r() - 0.5) * 140 * s, (r() - 0.5) * 26 * s, (24 + r() * 28) * s]);
    wrapX(ox => {
      g.fillStyle = 'rgba(170,200,235,0.9)';
      for (const [dx, dy, rr] of puffs) { g.beginPath(); g.arc(x + ox + dx, y + dy + 8 * s, rr, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff';
      for (const [dx, dy, rr] of puffs) { g.beginPath(); g.arc(x + ox + dx, y + dy, rr, 0, Math.PI * 2); g.fill(); }
    });
  }
  // Mountains.
  const peaks = Array.from({ length: 9 }, (_, i) => [i * (W / 9) + r() * 120, 300 + r() * 90, 160 + r() * 140]);
  wrapX(ox => {
    for (const [x, y, wd] of peaks) {
      g.fillStyle = '#8a7fd6';
      g.beginPath();
      g.moveTo(x + ox - wd, H - 40);
      g.lineTo(x + ox, y);
      g.lineTo(x + ox + wd, H - 40);
      g.closePath();
      g.fill();
      g.fillStyle = '#6f63c4';
      g.beginPath();
      g.moveTo(x + ox, y);
      g.lineTo(x + ox + wd, H - 40);
      g.lineTo(x + ox + wd * 0.2, H - 40);
      g.closePath();
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(x + ox, y);
      g.lineTo(x + ox - wd * 0.22, y + 46);
      g.lineTo(x + ox - wd * 0.06, y + 36);
      g.lineTo(x + ox + 6, y + 50);
      g.lineTo(x + ox + wd * 0.22, y + 46);
      g.closePath();
      g.fill();
    }
  });
  // Rolling hills (periodic so they tile).
  const hill = (base, amp, k1, k2, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const y = base - amp * (0.6 * Math.sin((x / W) * Math.PI * 2 * k1 + 1) + 0.4 * Math.sin((x / W) * Math.PI * 2 * k2 + 2));
      g.lineTo(x, y);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();
  };
  hill(470, 26, 5, 11, '#5fb35a');
  hill(492, 14, 7, 17, '#4fa84a');
  // Little trees on the near hills.
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = 478 + r() * 20;
    wrapX(ox => {
      g.fillStyle = '#2f8a3a';
      g.beginPath();
      g.arc(x + ox, y, 5 + r() * 3, 0, Math.PI * 2);
      g.fill();
    });
  }
  g.fillStyle = '#4fa84a';
  g.fillRect(0, H - 8, W, 8);
  return c;
}

// The whole track seen from above, `size` pixels square, in the base colours
// of the grass and road (the shader multiplies the detail textures in).
export function drawMap(track, scen, pads, size, grassBase, roadBase) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  const k = size / WORLD;
  g.scale(k, k);
  g.fillStyle = rgb(grassBase);
  g.fillRect(0, 0, WORLD, WORLD);
  // Mown stripes.
  g.fillStyle = rgb(grassBase, 1.07);
  for (let x = -WORLD; x < WORLD * 2; x += 16) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 8, 0);
    g.lineTo(x + 8 + WORLD * 0.4, WORLD);
    g.lineTo(x + WORLD * 0.4, WORLD);
    g.closePath();
    g.fill();
  }
  const path = () => {
    g.beginPath();
    for (let i = 0; i < track.n; i++) g.lineTo(track.xs[i], track.zs[i]);
    g.closePath();
  };
  g.lineJoin = 'round';
  g.lineCap = 'butt';
  // Sand traps behind the tyre stacks.
  g.fillStyle = '#e9c98a';
  for (const t of scen.tyres) {
    g.beginPath();
    g.arc(t.x, t.z, 4.2, 0, Math.PI * 2);
    g.fill();
  }
  // Darker verge, kerbs (red and white blocks), white edge line, asphalt.
  path();
  g.strokeStyle = rgb(grassBase, 0.86);
  g.lineWidth = track.half * 2 + 3;
  g.stroke();
  g.strokeStyle = '#e8413a';
  g.lineWidth = track.half * 2;
  g.stroke();
  g.setLineDash([2.5, 2.5]);
  g.strokeStyle = '#f4f4f4';
  g.stroke();
  g.setLineDash([]);
  g.strokeStyle = '#f4f4f4';
  g.lineWidth = track.half * 2 - 2.2;
  g.stroke();
  g.strokeStyle = rgb(roadBase);
  g.lineWidth = track.half * 2 - 3;
  g.stroke();
  // A faint darker racing line down the middle.
  g.strokeStyle = rgb(roadBase, 0.93);
  g.lineWidth = 5;
  g.stroke();
  // Start line: a chequered band across the road, and grid boxes behind it.
  const across = (s, d0, d1, w, fill) => {
    const a = pointAt(track, s, d0), b = pointAt(track, s, d1);
    g.save();
    g.translate(a.x, a.z);
    g.rotate(a.h);
    g.fillStyle = fill;
    g.fillRect(-w / 2, 0, w, Math.hypot(b.x - a.x, b.z - a.z));
    g.restore();
  };
  {
    const sq = 1.2;
    for (let row = 0; row < 2; row++) {
      for (let d = -track.half + 1.1, j = 0; d < track.half - 1.1; d += sq, j++) {
        const p = pointAt(track, (row - 0.5) * sq, d + sq / 2);
        g.save();
        g.translate(p.x, p.z);
        g.rotate(p.h);
        g.fillStyle = (row + j) % 2 ? '#111' : '#fff';
        g.fillRect(-sq / 2, -sq / 2, sq + 0.05, sq + 0.05);
        g.restore();
      }
    }
    for (let slot = 0; slot < 4; slot++) {
      const row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1;
      const s = -8 - row * 7 - (slot % 2) * 3 + 1.8;
      across(s, side * 3.5 - 1.6, side * 3.5 + 1.6, 0.35, '#fff');
    }
  }
  // Boost pads: orange plates with yellow chevrons.
  for (const p of pads) {
    for (let k2 = 0; k2 < p.len; k2 += 0.5) across(p.s + k2, p.d - p.w / 2, p.d + p.w / 2, 0.55, '#ff8c1a');
    for (let k2 = 0.8; k2 < p.len - 0.5; k2 += 2) {
      const tip = pointAt(track, p.s + k2 + 1.2, p.d), l = pointAt(track, p.s + k2, p.d - p.w / 2 + 0.4), r2 = pointAt(track, p.s + k2, p.d + p.w / 2 - 0.4);
      g.strokeStyle = '#ffe066';
      g.lineWidth = 0.55;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(l.x, l.z);
      g.lineTo(tip.x, tip.z);
      g.lineTo(r2.x, r2.z);
      g.stroke();
    }
  }
  // Soft shadows under trees and tyres.
  g.fillStyle = 'rgba(20,60,20,0.35)';
  for (const t of scen.trees) {
    g.beginPath();
    g.ellipse(t.x + 0.8, t.z + 0.6, 2.6 * t.k, 2.0 * t.k, 0, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// The little map in the corner: the road as a fat line.
export function drawMinimap(track, size) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  const k = size / WORLD;
  g.scale(k, k);
  g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i < track.n; i++) g.lineTo(track.xs[i], track.zs[i]);
  g.closePath();
  g.strokeStyle = 'rgba(20,10,40,0.55)';
  g.lineWidth = track.half * 2 + 8;
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.lineWidth = track.half * 1.3;
  g.stroke();
  const a = pointAt(track, 0, -track.half), b = pointAt(track, 0, track.half);
  g.strokeStyle = '#ff5fa2';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(a.x, a.z);
  g.lineTo(b.x, b.z);
  g.stroke();
  return c;
}
