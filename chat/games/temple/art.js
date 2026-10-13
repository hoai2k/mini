// Temple Dash: drawn stand-ins for the temple-* artwork (each used until the
// image is delivered), plus the jungle floor and trees, and shirt tinting.

import { mulberry32 } from './path.js';

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
const TAU = Math.PI * 2;

export function parseColor(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim());
  if (!m) return [255, 95, 162];
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
const rgb = (a, k = 1) => `rgb(${a.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;

// --- the runner ------------------------------------------------------------
// Six 256 x 512 frames side by side: four running, a jump and a slide, seen
// from behind. The feet stand on FEET (fraction of the frame's height); the
// frame is RUNNER_H metres tall. HEADS gives each frame's head centre and
// radius as fractions of the frame's width / height / width.
export const FRAME_W = 256, FRAME_H = 512;
export const RUNNER_H = 2.0;
export const FEET = 0.975;
const phases = [0, 1, 2, 3].map(i => (i / 4) * TAU);
const bobOf = p => -Math.abs(Math.cos(p)) * 9;
export const HEADS = [
  ...phases.map(p => [0.5, (96 + bobOf(p)) / FRAME_H, 0.17]),
  [0.5, 80 / FRAME_H, 0.17],
  [0.5, 292 / FRAME_H, 0.17],
];
// The same for the delivered sheet (assets/games/temple-runner.png), measured
// from its frames: a bigger round head, a little right of centre while
// running, and the boots ending higher in the frame.
export const ART_FEET = 474 / FRAME_H;
export const ART_HEADS = [
  [145 / FRAME_W, 128 / FRAME_H, 0.245],
  [141 / FRAME_W, 128 / FRAME_H, 0.245],
  [136 / FRAME_W, 128 / FRAME_H, 0.245],
  [133 / FRAME_W, 128 / FRAME_H, 0.245],
  [131 / FRAME_W, 85 / FRAME_H, 0.245],
  [93 / FRAME_W, 230 / FRAME_H, 0.245],
];

const SKIN = '#e9b98a', SKIN_D = '#c98f62', SHIRT = '#f6f6f6', SHIRT_D = '#cfcfcf', SHORTS = '#c9a26a', SHORTS_D = '#9c7a48';
const BOOT = '#6b4426', BOOT_D = '#3f2716', PACK = '#8a5a32', PACK_D = '#5e3b1f';

function limb(g, pts, w, col, edge) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = edge;
  g.lineWidth = w + 6;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  g.stroke();
  g.strokeStyle = col;
  g.lineWidth = w;
  g.stroke();
}
function boot(g, x, y, lift) {
  // A raised foot shows its sole, a planted one the heel of the boot.
  g.fillStyle = BOOT_D;
  g.beginPath();
  g.ellipse(x, y, 20, 12 + lift * 8, 0, 0, TAU);
  g.fill();
  g.fillStyle = lift > 0.3 ? '#2a1a0e' : BOOT;
  g.beginPath();
  g.ellipse(x, y - 2, 16, 9 + lift * 7, 0, 0, TAU);
  g.fill();
  if (lift > 0.3) {
    g.strokeStyle = '#4d3523';
    g.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x - 10, y - 2 + i * 5); g.lineTo(x + 10, y - 2 + i * 5); g.stroke(); }
  }
}
function torso(g, x, y, w1, w2, h) {
  g.fillStyle = SHIRT;
  g.strokeStyle = '#8d8d8d';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - w1 / 2, y + 10);
  g.quadraticCurveTo(x - w1 / 2, y, x - w1 / 2 + 14, y - 4);
  g.lineTo(x + w1 / 2 - 14, y - 4);
  g.quadraticCurveTo(x + w1 / 2, y, x + w1 / 2, y + 10);
  g.lineTo(x + w2 / 2, y + h);
  g.lineTo(x - w2 / 2, y + h);
  g.closePath();
  g.fill();
  g.stroke();
  // Folds and a shaded side, in greys so a tint keeps the shading.
  g.fillStyle = SHIRT_D;
  g.beginPath();
  g.moveTo(x + w1 / 2 - 4, y + 12);
  g.lineTo(x + w2 / 2 - 2, y + h - 2);
  g.lineTo(x + w2 / 2 - 18, y + h - 2);
  g.lineTo(x + w1 / 2 - 20, y + 16);
  g.closePath();
  g.fill();
  g.strokeStyle = '#dcdcdc';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x - 20, y + h - 30); g.quadraticCurveTo(x - 6, y + h - 40, x + 4, y + h - 22);
  g.stroke();
}
function backpack(g, x, y) {
  g.strokeStyle = PACK_D;
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(x - 22, y - 26); g.lineTo(x - 24, y + 4);
  g.moveTo(x + 22, y - 26); g.lineTo(x + 24, y + 4);
  g.stroke();
  g.fillStyle = PACK;
  g.strokeStyle = PACK_D;
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(x - 30, y, 60, 66, 14);
  g.fill();
  g.stroke();
  g.fillStyle = '#a06c3e';
  g.beginPath();
  g.roundRect(x - 26, y + 2, 52, 22, 10);
  g.fill();
  g.fillStyle = '#e0b04a';
  g.fillRect(x - 4, y + 20, 8, 8);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath();
  g.roundRect(x - 22, y + 38, 44, 20, 6);
  g.fill();
}
function head(g, x, y, r) {
  g.fillStyle = SKIN_D;
  g.beginPath(); g.ellipse(x - r, y + 4, 9, 13, 0, 0, TAU); g.ellipse(x + r, y + 4, 9, 13, 0, 0, TAU); g.fill();
  g.fillStyle = SKIN;
  g.strokeStyle = '#a8724a';
  g.lineWidth = 4;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
}
function shorts(g, x, y, w) {
  g.fillStyle = SHORTS;
  g.strokeStyle = SHORTS_D;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.lineTo(x + w / 2, y);
  g.lineTo(x + w / 2 + 6, y + 52);
  g.lineTo(x + 6, y + 56);
  g.lineTo(x, y + 30);
  g.lineTo(x - 6, y + 56);
  g.lineTo(x - w / 2 - 6, y + 52);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#6b5030';
  g.fillRect(x - w / 2, y, w, 9);
}

function runFrame(g, p) {
  const ox = 128, by = bobOf(p);
  // Shadow.
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(ox, 500, 54, 10, 0, 0, TAU); g.fill();
  const hipY = 330 + by;
  // Legs: the lifted one folds up behind, sole showing.
  for (const side of [-1, 1]) {
    const lift = Math.max(0, Math.sin(p + (side < 0 ? 0 : Math.PI)));
    const hx = ox + side * 20;
    const knee = [hx + side * 3, 405 + by - lift * 14];
    const foot = [hx + side * 1, 490 - lift * 78];
    limb(g, [[hx, hipY], knee, foot], 28, SKIN, SKIN_D);
    boot(g, foot[0], foot[1], lift);
  }
  shorts(g, ox, 282 + by, 96);
  // Arms: swinging opposite to the legs.
  for (const side of [-1, 1]) {
    const w = Math.sin(p + (side < 0 ? Math.PI : 0));
    const sx = ox + side * 50, sy = 166 + by;
    const elbow = [sx + side * 16, 222 + by - w * 12];
    const hand = [sx + side * (8 + Math.max(0, -w) * 12), 268 + by - w * 62];
    limb(g, [elbow, hand], 18, SKIN, SKIN_D);
    g.fillStyle = SKIN; g.beginPath(); g.arc(hand[0], hand[1], 12, 0, TAU); g.fill();
    limb(g, [[sx, sy], elbow], 24, SHIRT, '#8d8d8d');
  }
  torso(g, ox, 150 + by, 112, 96, 138);
  backpack(g, ox, 172 + by);
  g.fillStyle = SKIN_D;
  g.fillRect(ox - 12, 124 + by, 24, 24);
  head(g, ox, 96 + by, 43);
}
function jumpFrame(g) {
  const ox = 128;
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.beginPath(); g.ellipse(ox, 500, 38, 7, 0, 0, TAU); g.fill();
  for (const side of [-1, 1]) {
    const hx = ox + side * 22;
    const knee = [hx + side * 26, 360];
    const foot = [hx + side * 14, 420];
    limb(g, [[hx, 312], knee, foot], 28, SKIN, SKIN_D);
    boot(g, foot[0], foot[1], 1);
  }
  shorts(g, ox, 266, 96);
  for (const side of [-1, 1]) {
    const sx = ox + side * 50, sy = 150;
    const elbow = [sx + side * 34, 124];
    const hand = [sx + side * 52, 78];
    limb(g, [elbow, hand], 18, SKIN, SKIN_D);
    g.fillStyle = SKIN; g.beginPath(); g.arc(hand[0], hand[1], 12, 0, TAU); g.fill();
    limb(g, [[sx, sy], elbow], 24, SHIRT, '#8d8d8d');
  }
  torso(g, ox, 134, 112, 96, 138);
  backpack(g, ox, 156);
  g.fillStyle = SKIN_D;
  g.fillRect(ox - 12, 108, 24, 24);
  head(g, ox, 80, 43);
}
function slideFrame(g) {
  const ox = 128;
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath(); g.ellipse(ox, 498, 76, 12, 0, 0, TAU); g.fill();
  // Dust kicked up.
  g.fillStyle = 'rgba(222,196,150,0.55)';
  for (const [x, y, r] of [[40, 478, 22], [212, 476, 24], [70, 492, 16], [190, 492, 18]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  // Legs out in front (away from us): soles at the bottom.
  shorts(g, ox, 420, 104);
  boot(g, ox - 30, 482, 1);
  boot(g, ox + 30, 486, 1);
  for (const side of [-1, 1]) {
    const sx = ox + side * 52, sy = 352;
    const elbow = [sx + side * 30, 412];
    const hand = [sx + side * 46, 470];
    limb(g, [elbow, hand], 18, SKIN, SKIN_D);
    g.fillStyle = SKIN; g.beginPath(); g.arc(hand[0], hand[1], 12, 0, TAU); g.fill();
    limb(g, [[sx, sy], elbow], 24, SHIRT, '#8d8d8d');
  }
  torso(g, ox, 340, 116, 106, 90);
  backpack(g, ox, 354);
  g.fillStyle = SKIN_D;
  g.fillRect(ox - 12, 318, 24, 24);
  head(g, ox, 292, 43);
}

export function drawRunnerSheet() {
  const c = canvas(FRAME_W * 6, FRAME_H);
  const g = c.getContext('2d');
  phases.forEach((p, i) => {
    g.save();
    g.translate(i * FRAME_W, 0);
    runFrame(g, p);
    g.restore();
  });
  g.save(); g.translate(4 * FRAME_W, 0); jumpFrame(g); g.restore();
  g.save(); g.translate(5 * FRAME_W, 0); slideFrame(g); g.restore();
  return c;
}

// Tints the white shirt (bright, unsaturated pixels) to `color`, keeping its
// shading; everything else stays as drawn.
export function tintShirt(src, color) {
  const c = canvas(src.width, src.height);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0);
  const [cr, cg, cb] = parseColor(color);
  let img;
  try { img = g.getImageData(0, 0, c.width, c.height); } catch { return c; }
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    const lum = (r + gg + b) / 765;
    const sat = mx ? (mx - mn) / mx : 0;
    const white = Math.max(0, Math.min(1, (lum - 0.62) / 0.16)) * Math.max(0, Math.min(1, 1 - (sat - 0.06) / 0.08));
    if (white <= 0) continue;
    const k = Math.min(1.15, lum * 1.12);
    d[i] = r + (cr * k - r) * white;
    d[i + 1] = gg + (cg * k - gg) * white;
    d[i + 2] = b + (cb * k - b) * white;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// --- textures ----------------------------------------------------------------
// The walkway from above: 512 x 1024, tiling top to bottom, three lanes of
// flagstones between trim stones at the edges.
export function drawPathTile() {
  const W = 512, H = 1024;
  const c = canvas(W, H);
  const g = c.getContext('2d');
  const r = mulberry32(11);
  g.fillStyle = '#5f5446';
  g.fillRect(0, 0, W, H);
  const edge = Math.round(W * 0.056), lanes = [[edge, 180], [180, 332], [332, W - edge]];
  const stone = (x, y, w, h, base) => {
    const k = 0.9 + r() * 0.2;
    g.fillStyle = rgb(base, k);
    g.beginPath();
    g.roundRect(x + 3, y + 3, w - 6, h - 6, 8);
    g.fill();
    // Bevel: light top-left, dark bottom-right.
    g.fillStyle = 'rgba(255,248,225,0.22)';
    g.fillRect(x + 6, y + 5, w - 14, 5);
    g.fillRect(x + 5, y + 6, 5, h - 14);
    g.fillStyle = 'rgba(40,30,20,0.25)';
    g.fillRect(x + 8, y + h - 10, w - 14, 5);
    g.fillRect(x + w - 10, y + 8, 5, h - 14);
    // Speckles and cracks.
    for (let i = 0; i < 26; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,240,0.10)' : 'rgba(30,25,15,0.12)';
      g.beginPath(); g.arc(x + 10 + r() * (w - 20), y + 10 + r() * (h - 20), 1 + r() * 3, 0, TAU); g.fill();
    }
    if (r() < 0.35) {
      g.strokeStyle = 'rgba(40,30,20,0.4)';
      g.lineWidth = 2;
      g.beginPath();
      let px = x + 10 + r() * (w - 20), py = y + 8;
      g.moveTo(px, py);
      for (let i = 0; i < 4; i++) { px += (r() - 0.5) * 30; py += h / 5; g.lineTo(px, py); }
      g.stroke();
    }
    if (r() < 0.12) {
      // A carved sun glyph.
      g.strokeStyle = 'rgba(70,55,35,0.45)';
      g.lineWidth = 3;
      const cx = x + w / 2, cy = y + h / 2, rr = Math.min(w, h) * 0.18;
      g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.stroke();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr * 1.3); g.lineTo(cx + Math.cos(a) * rr * 1.7, cy + Math.sin(a) * rr * 1.7); g.stroke(); }
    }
  };
  const sand = [196, 178, 146];
  lanes.forEach(([x0, x1]) => {
    // Row heights scaled to add up to exactly the tile, so it tiles top to bottom.
    const hs = [];
    let sum = 0;
    while (sum < H - 60) { const h = 120 + Math.floor(r() * 90); hs.push(h); sum += h; }
    let y = 0;
    for (const h0 of hs) {
      const h = (h0 * H) / sum;
      if (r() < 0.4) {
        const m = x0 + (x1 - x0) * (0.4 + r() * 0.2);
        stone(x0, y, m - x0, h, sand);
        stone(m, y, x1 - m, h, sand);
      } else stone(x0, y, x1 - x0, h, sand);
      y += h;
    }
  });
  // Edge trim stones.
  for (const x0 of [0, W - edge]) {
    for (let y = 0; y < H; y += 64) {
      g.fillStyle = rgb([150, 134, 108], 0.9 + r() * 0.15);
      g.fillRect(x0 + 2, y + 2, edge - 4, 60);
    }
  }
  // Moss in the cracks.
  for (let i = 0; i < 260; i++) {
    const lx = [edge, 180, 332, W - edge][Math.floor(r() * 4)] + (r() - 0.5) * 10;
    const y = r() * H;
    g.fillStyle = r() < 0.5 ? 'rgba(92,140,58,0.75)' : 'rgba(64,112,44,0.7)';
    g.beginPath(); g.ellipse(lx, y, 3 + r() * 6, 5 + r() * 12, 0, 0, TAU); g.fill();
  }
  // Lane grooves.
  g.fillStyle = 'rgba(40,32,22,0.5)';
  for (const x of [180, 332]) g.fillRect(x - 2, 0, 4, H);
  return c;
}

// Carved temple stone: 512 x 512, tiling both ways.
export function drawWallTile() {
  const S = 512;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  const r = mulberry32(23);
  g.fillStyle = '#4a4436';
  g.fillRect(0, 0, S, S);
  const rows = [0, 96, 160, 288, 352, 448, 512];
  for (let j = 0; j < rows.length - 1; j++) {
    const y = rows[j], h = rows[j + 1] - y;
    const carved = h === 64;
    let x = -((j * 97) % 128);
    while (x < S) {
      const w = carved ? 128 : 120 + Math.floor(r() * 90);
      const draw = ox => {
        const base = [146 + r() * 20, 132 + r() * 16, 104 + r() * 12];
        g.fillStyle = rgb(base);
        g.fillRect(x + ox + 3, y + 3, w - 6, h - 6);
        g.fillStyle = 'rgba(255,240,210,0.18)';
        g.fillRect(x + ox + 3, y + 3, w - 6, 5);
        g.fillStyle = 'rgba(30,22,12,0.3)';
        g.fillRect(x + ox + 3, y + h - 8, w - 6, 5);
        if (carved) {
          // A glyph band: spirals and steps.
          g.strokeStyle = 'rgba(60,46,28,0.55)';
          g.lineWidth = 4;
          const cx = x + ox + w / 2, cy = y + h / 2;
          g.beginPath();
          for (let a = 0; a < 10; a += 0.3) g.lineTo(cx + Math.cos(a) * a * 2.2, cy + Math.sin(a) * a * 2.2);
          g.stroke();
          g.strokeRect(x + ox + 12, y + 12, w - 24, h - 24);
        }
      };
      draw(0);
      if (x + w > S) draw(-S);
      if (x < 0) draw(S);
      x += w;
    }
  }
  // Moss and vines.
  for (let i = 0; i < 70; i++) {
    const x = r() * S, y = r() * S;
    g.fillStyle = `rgba(${70 + r() * 30},${120 + r() * 40},${46 + r() * 20},0.7)`;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.beginPath(); g.ellipse(x + ox, y + oy, 6 + r() * 14, 4 + r() * 8, r() * 3, 0, TAU); g.fill(); }
  }
  g.strokeStyle = '#3f7a32';
  g.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    const x0 = r() * S;
    for (const ox of [-S, 0, S]) {
      g.beginPath();
      g.moveTo(x0 + ox, 0);
      for (let y = 0; y <= S; y += 16) g.lineTo(x0 + ox + Math.sin(y / 40 + i) * 10, y);
      g.stroke();
    }
  }
  return c;
}

// The horizon: 2048 x 512, tiling left to right. A golden sunset over misty
// jungle with distant stepped pyramids; dark treetops along the bottom.
export function drawSky() {
  const W = 2048, H = 512;
  const c = canvas(W, H);
  const g = c.getContext('2d');
  const r = mulberry32(5);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#3a2c74');
  grad.addColorStop(0.32, '#a24f8f');
  grad.addColorStop(0.58, '#ff9a5a');
  grad.addColorStop(0.78, '#ffd28a');
  grad.addColorStop(1, '#f6e2a8');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const wrap = fn => { for (const ox of [-W, 0, W]) fn(ox); };
  // The sun and its glow.
  wrap(ox => {
    const sx = 640 + ox, sy = 330;
    const gl = g.createRadialGradient(sx, sy, 10, sx, sy, 300);
    gl.addColorStop(0, 'rgba(255,250,210,0.95)');
    gl.addColorStop(0.25, 'rgba(255,220,140,0.55)');
    gl.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = gl;
    g.fillRect(sx - 300, sy - 300, 600, 600);
    g.fillStyle = '#fff6d0';
    g.beginPath(); g.arc(sx, sy, 46, 0, TAU); g.fill();
  });
  // Wispy clouds.
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y = 70 + r() * 190, w = 120 + r() * 220;
    wrap(ox => {
      g.fillStyle = `rgba(255,${190 + r() * 40},${170 + r() * 40},0.35)`;
      g.beginPath(); g.ellipse(x + ox, y, w, 10 + r() * 10, 0, 0, TAU); g.fill();
    });
  }
  // Far mountains.
  const ridge = (base, amp, k1, k2, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, base - amp * (0.6 * Math.sin((x / W) * TAU * k1 + 1) + 0.4 * Math.sin((x / W) * TAU * k2 + 2.3)));
    g.lineTo(W, H);
    g.closePath();
    g.fill();
  };
  ridge(372, 40, 3, 7, 'rgba(150,96,150,0.75)');
  // Stepped pyramids.
  for (const [x, w, h] of [[300, 150, 120], [1150, 210, 160], [1700, 120, 90]]) {
    wrap(ox => {
      const steps = 6;
      g.fillStyle = 'rgba(110,70,110,0.9)';
      for (let i = 0; i < steps; i++) {
        const ww = w * (1 - i / steps), yy = 410 - (h * (i + 1)) / steps;
        g.fillRect(x + ox - ww / 2, yy, ww, h / steps + 1);
      }
      g.fillRect(x + ox - w * 0.08, 410 - h - 18, w * 0.16, 20);
      g.fillStyle = 'rgba(255,200,140,0.25)';
      for (let i = 0; i < steps; i++) {
        const ww = w * (1 - i / steps), yy = 410 - (h * (i + 1)) / steps;
        g.fillRect(x + ox - ww / 2, yy, ww * 0.18, h / steps + 1);
      }
    });
  }
  ridge(420, 22, 5, 11, 'rgba(118,120,120,0.8)');
  // Waterfalls down the nearer ridge.
  for (const x of [880, 1480]) {
    wrap(ox => {
      const wg = g.createLinearGradient(0, 380, 0, 460);
      wg.addColorStop(0, 'rgba(240,250,255,0.9)');
      wg.addColorStop(1, 'rgba(240,250,255,0)');
      g.fillStyle = wg;
      g.fillRect(x + ox, 380, 14, 80);
    });
  }
  // Mist.
  const mist = g.createLinearGradient(0, 380, 0, 470);
  mist.addColorStop(0, 'rgba(255,226,170,0)');
  mist.addColorStop(1, 'rgba(250,228,180,0.75)');
  g.fillStyle = mist;
  g.fillRect(0, 380, W, 90);
  // Treetops.
  const tops = Array.from({ length: 120 }, () => [r() * W, 470 + r() * 30, 18 + r() * 26]);
  for (const [col, dy, k] of [['#2f5d36', 6, 1], ['#3f7a40', 0, 0.85], ['#5c9a4c', -6, 0.5]]) {
    g.fillStyle = col;
    for (const [x, y, rr] of tops) wrap(ox => { g.beginPath(); g.arc(x + ox, y + dy, rr * k, 0, TAU); g.fill(); });
  }
  g.fillStyle = '#2f5d36';
  g.fillRect(0, 496, W, 16);
  return c;
}

// The jungle canopy far below, from above: 512 x 512, tiling.
export function drawJungleTile() {
  const S = 512;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  const r = mulberry32(31);
  g.fillStyle = '#244a2c';
  g.fillRect(0, 0, S, S);
  const blobs = Array.from({ length: 70 }, () => [r() * S, r() * S, 20 + r() * 42, r()]);
  const layers = [['#1d3d24', 4, 1.05], ['#2f6438', 0, 1], ['#3f7d42', -4, 0.75], ['#5c9a4e', -8, 0.42]];
  for (const [col, dy, k] of layers) {
    for (const [x, y, rr, t] of blobs) {
      g.fillStyle = t < 0.15 && col === '#3f7d42' ? '#7a8f3a' : col;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.beginPath(); g.arc(x + ox - dy * 0.5, y + oy + dy, rr * k, 0, TAU); g.fill(); }
    }
  }
  // A few flowering trees.
  for (let i = 0; i < 8; i++) {
    const x = r() * S, y = r() * S;
    g.fillStyle = r() < 0.5 ? 'rgba(255,140,160,0.8)' : 'rgba(255,210,90,0.8)';
    for (let j = 0; j < 7; j++) { g.beginPath(); g.arc(x + (r() - 0.5) * 30, y + (r() - 0.5) * 30, 4 + r() * 4, 0, TAU); g.fill(); }
  }
  return c;
}

// Tall jungle trees rising from the canopy: three 256 x 512 cells.
export function drawTrees() {
  const c = canvas(768, 512);
  const g = c.getContext('2d');
  const r = mulberry32(41);
  for (let i = 0; i < 3; i++) {
    g.save();
    g.translate(i * 256, 0);
    // Trunk.
    g.fillStyle = ['#6b4a32', '#7a5a3a', '#5e4430'][i];
    g.beginPath();
    g.moveTo(112, 512); g.lineTo(122, 150); g.lineTo(134, 150); g.lineTo(146, 512);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    g.lineWidth = 3;
    for (let y = 200; y < 512; y += 40) { g.beginPath(); g.moveTo(118, y); g.lineTo(140, y + 10); g.stroke(); }
    // Vines down the trunk.
    g.strokeStyle = '#3e7a34';
    g.lineWidth = 4;
    g.beginPath();
    for (let y = 150; y < 512; y += 10) g.lineTo(128 + Math.sin(y / 30) * 12, y);
    g.stroke();
    if (i === 1) {
      // Palm fronds.
      for (let k = 0; k < 9; k++) {
        const a = Math.PI + (k / 8) * Math.PI;
        g.strokeStyle = k % 2 ? '#3f8a3e' : '#2f6d34';
        g.lineWidth = 16;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(128, 150);
        g.quadraticCurveTo(128 + Math.cos(a) * 70, 150 + Math.sin(a) * 90 - 20, 128 + Math.cos(a) * 118, 150 + Math.sin(a) * 50 + 60);
        g.stroke();
      }
    } else {
      // Broad canopy.
      const blobs = Array.from({ length: 12 }, () => [128 + (r() - 0.5) * 170, 120 + (r() - 0.5) * 120, 36 + r() * 30]);
      for (const [col, dy, k] of [['#1f4a28', 6, 1.05], ['#2f6d38', 0, 1], ['#4a8f44', -8, 0.7], ['#78b558', -14, 0.35]]) {
        g.fillStyle = col;
        for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y + dy, rr * k, 0, TAU); g.fill(); }
      }
    }
    g.restore();
  }
  return c;
}

// --- obstacles and pickups -----------------------------------------------------
// A root arching across the path: 512 x 256, the root in the lower part.
export function drawRoot() {
  const c = canvas(512, 256);
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const path = () => {
    g.beginPath();
    g.moveTo(6, 250);
    g.bezierCurveTo(40, 150, 120, 168, 180, 176);
    g.bezierCurveTo(250, 186, 290, 150, 350, 170);
    g.bezierCurveTo(420, 192, 470, 160, 506, 250);
  };
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.lineWidth = 64;
  g.save(); g.translate(0, 8); path(); g.stroke(); g.restore();
  g.strokeStyle = '#4a2e18';
  g.lineWidth = 60;
  path(); g.stroke();
  g.strokeStyle = '#7a4f2c';
  g.lineWidth = 48;
  path(); g.stroke();
  g.strokeStyle = '#9c6a3c';
  g.lineWidth = 16;
  g.save(); g.translate(0, -12); path(); g.stroke(); g.restore();
  // Bark lines and knots.
  g.strokeStyle = 'rgba(50,28,12,0.6)';
  g.lineWidth = 3;
  for (let x = 40; x < 480; x += 26) { g.beginPath(); g.moveTo(x, 182 + Math.sin(x) * 8); g.lineTo(x + 14, 196 + Math.sin(x) * 8); g.stroke(); }
  for (const [x, y] of [[150, 170], [330, 168]]) {
    g.fillStyle = '#5a361b';
    g.beginPath(); g.ellipse(x, y, 12, 8, 0.3, 0, TAU); g.fill();
  }
  // Side roots into the stones, moss and leaves.
  g.strokeStyle = '#6a4224';
  g.lineWidth = 14;
  for (const [x0, x1] of [[60, 30], [240, 220], [420, 470]]) { g.beginPath(); g.moveTo(x0, 200); g.quadraticCurveTo((x0 + x1) / 2, 240, x1, 254); g.stroke(); }
  g.fillStyle = '#5f9a3c';
  for (const [x, y] of [[90, 160], [210, 168], [300, 150], [400, 172], [460, 196]]) {
    g.beginPath(); g.ellipse(x, y, 16, 7, -0.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(x + 12, y - 4, 12, 6, 0.6, 0, TAU); g.fill();
  }
  return c;
}

// A low beam across the whole walkway, the slide-under obstacle: 1024 x 512,
// drawn 2:1 over the walkway's full width. The beam runs from 20% to 62% down,
// so its underside is about 1.25 m up: a standing runner hits it, a sliding
// one passes under; below it only two stubby blocks at the outer edges.
export function drawBeam() {
  const c = canvas(1024, 512);
  const g = c.getContext('2d');
  const r = mulberry32(23);
  const top = 102, bottom = 318;
  const block = (x, y, w, h, base) => {
    g.fillStyle = rgb(base, 0.9 + r() * 0.16);
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,236,200,0.22)';
    g.fillRect(x, y, w, 7);
    g.fillStyle = 'rgba(30,20,10,0.38)';
    g.fillRect(x, y + h - 9, w, 9);
    g.strokeStyle = 'rgba(40,30,18,0.65)';
    g.lineWidth = 4;
    g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  };
  // The supports: short and only at the very edges.
  for (const x of [0, 948]) for (let y = bottom; y < 512; y += 64) block(x, y, 76, 64, [132, 120, 96]);
  // The beam: big carved blocks with a dark underside so its edge reads.
  for (let x = 0; x < 1024; x += 128) block(x, top, 128, bottom - top, [158, 142, 110]);
  g.fillStyle = 'rgba(25,16,8,0.55)';
  g.fillRect(0, bottom - 18, 1024, 18);
  g.strokeStyle = 'rgba(60,44,26,0.6)';
  g.lineWidth = 6;
  for (let x = 64; x < 1024; x += 128) {
    g.beginPath(); g.arc(x, 210, 38, 0, TAU); g.stroke();
    g.beginPath(); g.arc(x - 13, 200, 7, 0, TAU); g.arc(x + 13, 200, 7, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(x - 18, 228); g.lineTo(x + 18, 228); g.stroke();
  }
  // Moss along the top, a few short vines under it (well clear of the gap).
  g.fillStyle = '#5f9a3c';
  for (let x = 8; x < 1024; x += 24) { g.beginPath(); g.ellipse(x, top + 2 + r() * 10, 16, 8, 0, 0, TAU); g.fill(); }
  for (let i = 0; i < 12; i++) {
    const x = 90 + r() * 844, len = 18 + r() * 26;
    g.strokeStyle = '#3d7c34';
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(x, bottom - 4); g.lineTo(x + (r() - 0.5) * 8, bottom + len); g.stroke();
  }
  return c;
}

// A fire vent across one lane: 256 x 256. phase 0..2 varies the flames.
export function drawFire(phase = 0) {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  const r = mulberry32(51 + phase * 7);
  // Flames.
  const flame = (x, h, w, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x - w, 206);
    g.quadraticCurveTo(x - w * 1.1, 206 - h * 0.55, x + (r() - 0.5) * w * 0.6, 206 - h);
    g.quadraticCurveTo(x + w * 1.1, 206 - h * 0.55, x + w, 206);
    g.closePath();
    g.fill();
  };
  for (const [col, k, wk] of [['rgba(255,80,20,0.85)', 1, 1], ['#ff9a1f', 0.78, 0.75], ['#ffd84a', 0.52, 0.5], ['#fff6c0', 0.28, 0.3]]) {
    for (const x of [64, 128, 192]) flame(x + (r() - 0.5) * 10, (150 + r() * 40) * k, 34 * wk, col);
  }
  // The vent.
  g.fillStyle = '#5a4a3a';
  g.beginPath(); g.roundRect(8, 200, 240, 52, 10); g.fill();
  g.fillStyle = '#7a6650';
  g.beginPath(); g.roundRect(14, 204, 228, 18, 8); g.fill();
  g.fillStyle = '#2a1e14';
  for (const x of [64, 128, 192]) { g.beginPath(); g.ellipse(x, 214, 24, 6, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,170,60,0.6)';
  for (const x of [64, 128, 192]) { g.beginPath(); g.ellipse(x, 213, 18, 4, 0, 0, TAU); g.fill(); }
  return c;
}

export function drawCoin() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#a8740e';
  g.beginPath(); g.arc(64, 66, 58, 0, TAU); g.fill();
  const grad = g.createRadialGradient(48, 44, 6, 64, 64, 58);
  grad.addColorStop(0, '#fff3a6');
  grad.addColorStop(0.5, '#ffd23a');
  grad.addColorStop(1, '#e09a12');
  g.fillStyle = grad;
  g.beginPath(); g.arc(64, 62, 56, 0, TAU); g.fill();
  g.strokeStyle = '#c4820c';
  g.lineWidth = 5;
  g.beginPath(); g.arc(64, 62, 42, 0, TAU); g.stroke();
  // A carved sun.
  g.fillStyle = '#d8900e';
  g.beginPath(); g.arc(64, 62, 14, 0, TAU); g.fill();
  g.strokeStyle = '#d8900e';
  g.lineWidth = 5;
  g.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.beginPath(); g.moveTo(64 + Math.cos(a) * 20, 62 + Math.sin(a) * 20); g.lineTo(64 + Math.cos(a) * 30, 62 + Math.sin(a) * 30); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(42, 36, 14, 7, -0.7, 0, TAU); g.fill();
  return c;
}

// Three monkeys running at the camera: 1024 x 512.
export function drawMonkeys() {
  const c = canvas(1024, 512);
  const g = c.getContext('2d');
  const monkey = (x, y, s, lean) => {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.rotate(lean);
    const fur = '#7a4a26', furD = '#4f2d14', face = '#e3b88a';
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(0, 230, 120, 22, 0, 0, TAU); g.fill();
    // Tail curling up behind.
    g.strokeStyle = furD;
    g.lineWidth = 16;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(40, 120); g.bezierCurveTo(150, 80, 150, -60, 90, -70); g.stroke();
    // Legs.
    g.strokeStyle = fur;
    g.lineWidth = 34;
    g.beginPath(); g.moveTo(-36, 120); g.lineTo(-60, 210); g.moveTo(36, 120); g.lineTo(52, 200); g.stroke();
    g.fillStyle = face;
    g.beginPath(); g.ellipse(-62, 220, 26, 14, 0, 0, TAU); g.ellipse(54, 210, 26, 14, 0, 0, TAU); g.fill();
    // Body.
    g.fillStyle = fur;
    g.beginPath(); g.ellipse(0, 80, 78, 90, 0, 0, TAU); g.fill();
    g.fillStyle = '#c99a6a';
    g.beginPath(); g.ellipse(0, 96, 46, 58, 0, 0, TAU); g.fill();
    // Arms reaching out.
    g.strokeStyle = fur;
    g.lineWidth = 28;
    g.beginPath(); g.moveTo(-60, 40); g.quadraticCurveTo(-130, 30, -150, -30); g.moveTo(60, 40); g.quadraticCurveTo(130, 50, 160, 0); g.stroke();
    g.fillStyle = face;
    g.beginPath(); g.arc(-152, -38, 20, 0, TAU); g.arc(162, -6, 20, 0, TAU); g.fill();
    // Head.
    g.fillStyle = fur;
    g.beginPath(); g.arc(-74, -66, 30, 0, TAU); g.arc(74, -66, 30, 0, TAU); g.fill();
    g.fillStyle = face;
    g.beginPath(); g.arc(-74, -66, 17, 0, TAU); g.arc(74, -66, 17, 0, TAU); g.fill();
    g.fillStyle = fur;
    g.beginPath(); g.arc(0, -70, 72, 0, TAU); g.fill();
    g.fillStyle = face;
    g.beginPath(); g.ellipse(-24, -78, 30, 32, 0, 0, TAU); g.ellipse(24, -78, 30, 32, 0, 0, TAU); g.ellipse(0, -36, 46, 34, 0, 0, TAU); g.fill();
    // Glowing eyes, angry brows.
    for (const sx of [-1, 1]) {
      const gl = g.createRadialGradient(sx * 24, -80, 2, sx * 24, -80, 26);
      gl.addColorStop(0, 'rgba(255,255,160,1)');
      gl.addColorStop(0.4, 'rgba(255,220,40,0.9)');
      gl.addColorStop(1, 'rgba(255,160,0,0)');
      g.fillStyle = gl;
      g.beginPath(); g.arc(sx * 24, -80, 26, 0, TAU); g.fill();
      g.fillStyle = '#2a1608';
      g.beginPath(); g.arc(sx * 24, -78, 5, 0, TAU); g.fill();
      g.strokeStyle = furD;
      g.lineWidth = 9;
      g.beginPath(); g.moveTo(sx * 46, -112); g.lineTo(sx * 8, -100); g.stroke();
    }
    // Grinning mouth with teeth.
    g.fillStyle = '#4a1a10';
    g.beginPath(); g.ellipse(0, -30, 28, 15, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#fff';
    g.fillRect(-18, -30, 36, 6);
    g.fillStyle = furD;
    g.beginPath(); g.arc(-7, -50, 4, 0, TAU); g.arc(7, -50, 4, 0, TAU); g.fill();
    g.restore();
  };
  monkey(200, 250, 0.95, -0.1);
  monkey(824, 250, 0.95, 0.1);
  monkey(512, 236, 1.08, 0);
  return c;
}
