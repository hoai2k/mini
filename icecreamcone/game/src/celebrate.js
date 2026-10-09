// The sticker celebration after a bird's score is first reached, drawn on
// the stage in the book's ink and watercolour: the bird's portrait as a
// die-cut sticker pops in, the field guide's sticker book opens under it with
// the stickers already earned, and the new one flies to its place and sticks.
// Timing and layout are in reward.js; main.js runs it and handles the input.

import { drawBird, paper, label, poly, ink, blob, PAL, INK } from './draw.js';
import { STEPS, FLY_TIME, bookLayout, ease, pop } from './reward.js';

const at = Object.fromEntries(STEPS.map((s) => [s.name, s.at]));
const LAND = at.fly + FLY_TIME;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, k) => a + (b - a) * k;
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- stickers ----------

const BORDER = 15; // the white margin round the bird, in sticker pixels
const POSE = { growth: 0.2, light: 'green', fill: 0.6 }; // as on the guide's cards
const stickers = new Map();

// The bird's portrait as a die-cut sticker: the bird on a cream margin that
// follows its outline, cut with a thin ink edge. Built once per bird.
export function sticker(id) {
  if (stickers.has(id)) return stickers.get(id);
  const N = 760;
  const bird = document.createElement('canvas');
  bird.width = bird.height = N;
  const b = bird.getContext('2d', { willReadFrequently: true });
  drawBird(b, id, { x: N / 2 + 20, y: N * 0.84, size: 420, t: 0, pose: POSE });
  // the painted part
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  const d = b.getImageData(0, 0, N, N).data;
  for (let y = 0; y < N; y += 2) {
    for (let x = 0; x < N; x += 2) {
      if (d[(y * N + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) [x0, y0, x1, y1] = [0, 0, N - 1, N - 1];
  const pad = BORDER + 8;
  const w = x1 - x0 + 1 + pad * 2;
  const h = y1 - y0 + 1 + pad * 2;
  const ox = pad - x0;
  const oy = pad - y0;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tg = tmp.getContext('2d');
  // The bird's shape grown by r, in one colour.
  const grown = (r, color) => {
    tg.globalCompositeOperation = 'source-over';
    tg.clearRect(0, 0, w, h);
    for (const rr of [r, r * 0.6]) {
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        tg.drawImage(bird, ox + Math.cos(a) * rr, oy + Math.sin(a) * rr);
      }
    }
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = color;
    tg.fillRect(0, 0, w, h);
    g.drawImage(tmp, 0, 0);
  };
  grown(BORDER + 2.5, 'rgba(59,43,32,0.7)'); // the cut edge
  grown(BORDER, '#fffbf1'); // the margin
  // a faint grain on the margin, like the paper of the book
  g.save();
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(150,120,90,${0.04 + hash(i) * 0.05})`;
    g.fillRect(hash(i * 3.1) * w, hash(i * 7.7) * h, 2, 2);
  }
  g.restore();
  g.drawImage(bird, ox, oy);
  const s = { canvas: c, w, h };
  stickers.set(id, s);
  return s;
}

let scratch = null;

// Draws a sticker centred on (x, y), fitted into a box `size` high (and a
// little wider). opts: rot, sx/sy (squash), lift (how far it floats above the
// page: its shadow), shine (0..1, a light sweeping across it), alpha, px
// (device pixels per unit, for the shadow).
export function drawSticker(g, id, x, y, size, { rot = 0, sx = 1, sy = 1, lift = 0.3, shine = -1, alpha = 1, px = 1 } = {}) {
  const st = sticker(id);
  const k = Math.min(size / st.h, (size * 1.12) / st.w);
  let img = st.canvas;
  if (shine >= 0 && shine <= 1) {
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width < st.w || scratch.height < st.h) {
      scratch.width = Math.max(scratch.width, st.w);
      scratch.height = Math.max(scratch.height, st.h);
    }
    const s = scratch.getContext('2d');
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, scratch.width, scratch.height);
    s.drawImage(st.canvas, 0, 0);
    // the light, on the sticker only
    s.globalCompositeOperation = 'source-atop';
    const cx = lerp(-st.w * 0.4, st.w * 1.4, shine);
    const grd = s.createLinearGradient(cx - st.w * 0.22, 0, cx + st.w * 0.22, st.h * 0.35);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, 'rgba(255,253,240,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    s.fillStyle = grd;
    s.fillRect(0, 0, st.w, st.h);
    s.globalCompositeOperation = 'source-over';
    img = scratch;
  }
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.scale(k * sx, k * sy);
  g.globalAlpha *= alpha;
  if (lift > 0) {
    g.shadowColor = `rgba(59,43,32,${0.18 + 0.2 * Math.min(1, lift)})`;
    g.shadowBlur = (4 + 26 * lift) * px;
    g.shadowOffsetX = 3 * lift * px;
    g.shadowOffsetY = (3 + 22 * lift) * px;
  }
  g.drawImage(img, 0, 0, st.w, st.h, -st.w / 2, -st.h / 2, st.w, st.h);
  g.restore();
}

// ---------- the book ----------

// A page's outline, its edges along the spine straight and the other two
// dipping a little towards the spine, as an open book's pages do.
function pagePath(g, p, side) {
  const along = side === 'r' || side === 'l' ? p.h : p.w;
  const pt = (u, v) => {
    if (side === 'r') return [p.x + u * p.w, p.y + v * p.h];
    if (side === 'l') return [p.x + (1 - u) * p.w, p.y + v * p.h];
    if (side === 'b') return [p.x + v * p.w, p.y + u * p.h];
    return [p.x + v * p.w, p.y + (1 - u) * p.h];
  };
  const dip = (u) => (along * 0.022 * u * u) / along;
  const pts = [];
  for (let i = 0; i <= 12; i++) pts.push(pt(i / 12, dip(i / 12)));
  for (let i = 12; i >= 0; i--) pts.push(pt(i / 12, 1 - dip(i / 12) * 0.5));
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
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

const COVER = '#8f6f9a'; // a mauve cloth binding
const tilt = (i) => ((hash(i * 5.3) - 0.5) * 0.16);

function drawBook(g, L, wide, c, { stuckNew, lw, lh, px, t }) {
  const { pages, slots, spine } = L;
  const sides = wide ? ['r', 'l'] : ['b', 't'];
  const box = {
    x: Math.min(pages[0].x, pages[1].x),
    y: Math.min(pages[0].y, pages[1].y),
    w: wide ? pages[1].x + pages[1].w - pages[0].x : pages[0].w,
    h: wide ? pages[0].h : pages[1].y + pages[1].h - pages[0].y,
  };
  const pad = Math.min(box.w, box.h) * 0.035;
  // the cover, under everything, with a soft shadow on the table
  g.save();
  g.shadowColor = 'rgba(59,43,32,0.3)';
  g.shadowBlur = 24 * px;
  g.shadowOffsetY = 10 * px;
  roundRect(g, box.x - pad, box.y - pad * 0.8, box.w + pad * 2, box.h + pad * 1.9, pad * 0.7);
  g.fillStyle = COVER;
  g.fill();
  g.restore();
  roundRect(g, box.x - pad, box.y - pad * 0.8, box.w + pad * 2, box.h + pad * 1.9, pad * 0.7);
  g.save();
  g.clip();
  // the cloth's weave, in faint strokes
  g.globalAlpha = 0.12;
  g.strokeStyle = '#2a1f2e';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = box.x - pad; x < box.x + box.w + pad; x += 7) {
    g.moveTo(x, box.y - pad);
    g.lineTo(x + 3, box.y + box.h + pad * 1.2);
  }
  g.stroke();
  g.restore();
  roundRect(g, box.x - pad, box.y - pad * 0.8, box.w + pad * 2, box.h + pad * 1.9, pad * 0.7);
  ink(g, 3);
  // the pages: a few leaves' edges under each, then the page itself
  pages.forEach((p, k) => {
    const side = sides[k];
    const out = side === 'r' ? [-1, 1] : side === 'l' ? [1, 1] : side === 'b' ? [0, -1] : [0, 1];
    for (let e = 3; e >= 1; e--) {
      const q = { x: p.x + out[0] * e * 3.2, y: p.y + Math.abs(out[1]) * e * 3.4 * (wide ? 1 : out[1]), w: p.w, h: p.h };
      pagePath(g, q, side);
      g.fillStyle = e % 2 ? '#efe4c9' : '#f6eedb';
      g.fill();
      g.globalAlpha = 0.55;
      ink(g, 1.2);
      g.globalAlpha = 1;
    }
    pagePath(g, p, side);
    g.save();
    g.clip();
    paper(g, lw, lh);
    // the gutter's shade, darkest at the spine
    const gx0 = side === 'r' ? p.x + p.w : side === 'l' ? p.x : p.x;
    const gy0 = side === 'b' ? p.y + p.h : side === 't' ? p.y : p.y;
    const span = (wide ? p.w : p.h) * 0.16;
    const grd = wide
      ? g.createLinearGradient(gx0, 0, gx0 + (side === 'r' ? -span : span), 0)
      : g.createLinearGradient(0, gy0, 0, gy0 + (side === 'b' ? -span : span));
    grd.addColorStop(0, 'rgba(90,60,40,0.28)');
    grd.addColorStop(1, 'rgba(90,60,40,0)');
    g.fillStyle = grd;
    g.fillRect(p.x, p.y, p.w, p.h);
    g.restore();
    pagePath(g, p, side);
    ink(g, 2.2);
  });
  // the spine's fold
  g.beginPath();
  if (wide) {
    g.moveTo(spine.x, spine.y + 10);
    g.lineTo(spine.x, spine.y + spine.h - 4);
  } else {
    g.moveTo(spine.x + 10, spine.y);
    g.lineTo(spine.x + spine.w - 4, spine.y);
  }
  ink(g, 2.6);

  // headings
  const n = slots.length;
  const stuck = c.earned.size + (stuckNew ? 1 : 0);
  const hs = Math.min(pages[0].w, pages[0].h) * 0.068;
  const head = (p, text, k) => label(g, text, p.x + p.w / 2, p.y + p.h * 0.065, { size: hs, color: k ? '#7a6656' : INK, weight: k ? 500 : 700 });
  head(pages[0], 'My Field Guide', 0);
  head(pages[1], `${stuck} of ${n} spotted`, 1);
  // a hand-ruled line under each heading
  pages.forEach((p, k) => {
    poly(g, [[p.x + p.w * 0.3, p.y + p.h * 0.105], [p.x + p.w * 0.7, p.y + p.h * 0.108]], 40 + k, 1.2, false);
    g.globalAlpha = 0.4;
    ink(g, 1.4);
    g.globalAlpha = 1;
  });

  // the slots
  slots.forEach((sl, i) => {
    const b = c.birds[i];
    const has = c.earned.has(i);
    const isNew = i === c.index;
    const box = sl.s * 0.86;
    if (!has && !(isNew && stuckNew)) {
      // an empty place: a pencilled outline and its page number
      g.save();
      g.setLineDash([7, 6]);
      roundRect(g, sl.x - box / 2, sl.y - box / 2, box, box, box * 0.14);
      g.lineWidth = 2;
      g.strokeStyle = isNew ? 'rgba(192,64,122,0.6)' : 'rgba(59,43,32,0.28)';
      g.stroke();
      g.restore();
      if (isNew) {
        // the waiting place glows softly in the bird's colour
        g.save();
        g.globalAlpha = 0.18 + 0.08 * Math.sin(t * 5);
        roundRect(g, sl.x - box / 2, sl.y - box / 2, box, box, box * 0.14);
        g.fillStyle = b.color;
        g.fill();
        g.restore();
      }
      label(g, String(i + 1), sl.x, sl.y, { size: box * 0.32, color: isNew ? 'rgba(192,64,122,0.7)' : 'rgba(59,43,32,0.3)', weight: 500 });
      return;
    }
    if (isNew) return; // drawn by the flight, on top of everything
    drawSticker(g, b.id, sl.x, sl.y - sl.s * 0.06, sl.s * 0.78, { rot: tilt(i), lift: 0.12, px });
    fitLabel(g, shortName(b.name), sl.x, sl.y + sl.s * 0.43, sl.s * 1.08, { size: Math.max(11, sl.s * 0.1), color: '#5a4636', weight: 500 });
  });
}

const shortName = (name) => name.replace(/^The /, '');

// A label shrunk to fit `maxW` across.
function fitLabel(g, text, x, y, maxW, opts) {
  let size = opts.size;
  g.font = `${opts.weight || 600} ${size}px Fraunces, Georgia, serif`;
  const w = g.measureText(text).width;
  if (w > maxW) size = Math.max(10, Math.floor((size * maxW) / w));
  label(g, text, x, y, { ...opts, size });
}

// ---------- the scene ----------

// Little watercolour dabs drifting down while the sticker shows.
function confetti(g, t, lw, lh, alpha) {
  if (alpha <= 0) return;
  const cols = [PAL.strawberry, PAL.lemon, PAL.mint, PAL.sky, PAL.orange, PAL.mauve];
  g.save();
  for (let i = 0; i < 34; i++) {
    const sp = 60 + hash(i * 2.3) * 70;
    const x = hash(i) * lw + Math.sin(t * 1.3 + i) * 18;
    const y = ((hash(i * 1.7) * (lh + 120) + t * sp) % (lh + 120)) - 60;
    const r = 7 + hash(i * 3.3) * 9;
    g.globalAlpha = alpha * 0.85;
    g.save();
    g.translate(x, y);
    g.rotate(t * (hash(i * 9.1) - 0.5) * 3 + i);
    if (i % 3 === 0) {
      // a little star
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const rr = k % 2 ? r * 0.42 : r * 1.15;
        k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0);
      }
      g.closePath();
    } else blob(g, 0, 0, r, r * 0.75, i, 0.12, 10);
    g.fillStyle = cols[i % cols.length];
    g.fill();
    g.globalAlpha = alpha * 0.6;
    ink(g, 1.4);
    g.restore();
  }
  g.restore();
}

// Soft watercolour rays and a wash behind the sticker.
function glory(g, x, y, r, color, t, alpha) {
  if (alpha <= 0) return;
  g.save();
  g.translate(x, y);
  g.globalAlpha = alpha * 0.32;
  g.fillStyle = color;
  blob(g, 0, 0, r * 0.95, r * 0.82, 3, 0.05, 20);
  g.fill();
  g.rotate(t * 0.12);
  g.globalAlpha = alpha * 0.1;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a - 0.07) * r * 0.5, Math.sin(a - 0.07) * r * 0.5);
    g.lineTo(Math.cos(a - 0.11) * r * 2.4, Math.sin(a - 0.11) * r * 2.4);
    g.lineTo(Math.cos(a + 0.11) * r * 2.4, Math.sin(a + 0.11) * r * 2.4);
    g.lineTo(Math.cos(a + 0.07) * r * 0.5, Math.sin(a + 0.07) * r * 0.5);
    g.closePath();
    g.fill();
  }
  g.restore();
}

// Sparkles: little four-pointed ink stars that twinkle.
function glints(g, x, y, r, t, alpha, seed = 0) {
  if (alpha <= 0) return;
  g.save();
  for (let i = 0; i < 7; i++) {
    const a = hash(i + seed) * Math.PI * 2;
    const d = r * (0.75 + hash(i * 3 + seed) * 0.5);
    const tw = Math.max(0, Math.sin(t * 4 + i * 1.9));
    if (tw < 0.05) continue;
    const s = (10 + hash(i * 5 + seed) * 12) * tw;
    const cx = x + Math.cos(a) * d;
    const cy = y + Math.sin(a) * d;
    g.globalAlpha = Math.min(1, alpha) * tw;
    g.beginPath();
    g.moveTo(cx, cy - s);
    g.quadraticCurveTo(cx, cy, cx + s, cy);
    g.quadraticCurveTo(cx, cy, cx, cy + s);
    g.quadraticCurveTo(cx, cy, cx - s, cy);
    g.quadraticCurveTo(cx, cy, cx, cy - s);
    g.fillStyle = '#fff6c8';
    g.fill();
    ink(g, 1.5, '#b08a30');
  }
  g.restore();
}

// The puff where the sticker lands: watercolour dabs and a few ink strokes.
function puff(g, x, y, s, color, k) {
  if (k <= 0 || k >= 1) return;
  g.save();
  const e = ease(k);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const d = s * (0.5 + 0.42 * e);
    g.globalAlpha = (1 - k) * 0.55;
    g.fillStyle = i % 2 ? color : '#fffbf1';
    blob(g, x + Math.cos(a) * d, y + Math.sin(a) * d, s * 0.1 * (1 - k * 0.5), s * 0.08, i, 0.15, 10);
    g.fill();
    g.globalAlpha = (1 - k) * 0.45;
    ink(g, 1.2);
  }
  g.globalAlpha = (1 - k) * 0.8;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - 0.5;
    const r0 = s * (0.62 + 0.3 * e);
    g.beginPath();
    g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    g.lineTo(x + Math.cos(a) * (r0 + s * 0.16), y + Math.sin(a) * (r0 + s * 0.16));
    ink(g, 2.4);
  }
  g.restore();
}

// Where things go on a wide (1600 x 900) or an upright (900 x 1600) stage.
export function celebrationLayout(n, wide) {
  return wide
    ? { pop: [800, 410, 430], hover: [800, 160, 230], head: 82, name: 690, sub: 748, book: bookLayout(n, { x: 210, y: 300, w: 1180, h: 515 }, true), lift: 520 }
    : { pop: [450, 700, 520], hover: [450, 300, 290], head: 210, name: 1040, sub: 1104, book: bookLayout(n, { x: 80, y: 520, w: 740, h: 1010 }, false), lift: 900 };
}

// The whole scene at time t. c: { index, birds, earned (Set of indices
// already stuck), next (the page that opens, or null) }; o: { lw, lh, px,
// reduce, wide }.
export function drawCelebration(g, c, t, o) {
  const { lw, lh, px, reduce, wide } = o;
  const b = c.birds[c.index];
  const L = celebrationLayout(c.birds.length, wide);
  const slot = L.book.slots[c.index];
  paper(g, lw, lh);

  // 1. the sticker alone, with rays and confetti
  const popK = reduce ? clamp01(t / 0.35) : pop(clamp01(t / 0.7));
  const bookIn = clamp01((t - at.book) / 0.6);
  const toHover = reduce ? (t >= at.book ? 1 : 0) : ease(clamp01((t - at.book) / 0.6));
  const sceneA = 1 - (reduce ? bookIn : ease(bookIn));
  glory(g, L.pop[0], L.pop[1], L.pop[2] * 0.62, b.color, reduce ? 0 : t, Math.min(1, t / 0.4) * sceneA);
  if (!reduce) confetti(g, t, lw, lh, Math.min(1, t / 0.3) * sceneA);
  if (sceneA > 0) {
    g.save();
    g.globalAlpha = sceneA * clamp01(t / 0.3);
    const hs = wide ? 78 : 96;
    label(g, 'Spotted!', L.pop[0] + 4, L.head + 4, { size: hs, weight: 800, color: PAL.strawberry });
    label(g, 'Spotted!', L.pop[0], L.head, { size: hs, weight: 800 });
    g.globalAlpha = sceneA * clamp01((t - 0.35) / 0.4);
    const ns = wide ? 54 : 62;
    fitLabel(g, b.name, L.pop[0], L.name, lw - 60, { size: ns, weight: 700 });
    label(g, 'A new sticker for your field guide', L.pop[0], L.sub, { size: wide ? 28 : 34, color: '#7a6656', weight: 500 });
    g.restore();
  }

  // (with less motion the sticker fades from above the book into its place)
  const land = reduce ? at.fly : LAND;

  // 2. the book, rising into place under the sticker
  if (t >= at.book) {
    g.save();
    g.globalAlpha = reduce ? bookIn : Math.min(1, bookIn * 1.6);
    if (!reduce) g.translate(0, (1 - ease(bookIn)) * L.lift * 0.35);
    drawBook(g, L.book, wide, c, { stuckNew: t >= land, lw, lh, px, t });
    g.restore();
  }

  // 3. the sticker: popping, hovering, flying, stuck
  const [px0, py0, s0] = L.pop;
  const [hx, hy, hs] = L.hover;
  const flyK = clamp01((t - at.fly) / FLY_TIME);
  const slotSize = slot.s * 0.78;
  const slotY = slot.y - slot.s * 0.06;
  if (t < at.fly || (reduce && t < at.fly + 0.4)) {
    let x = lerp(px0, hx, toHover);
    let y = lerp(py0, hy, toHover);
    let size = lerp(s0, hs, toHover);
    let alpha = 1;
    if (reduce && t >= at.fly) alpha = 1 - clamp01((t - at.fly) / 0.4);
    const wob = reduce ? 0 : Math.sin(t * 2.2) * 0.03 * (1 - toHover * 0.5);
    const bob = reduce ? 0 : Math.sin(t * 1.8) * 6;
    // the pop: from nothing, a little past full size, and back
    const k = popK;
    drawSticker(g, b.id, x, y + bob, size * Math.max(0.01, k), { rot: wob - (1 - Math.min(1, k)) * 0.5, lift: 0.85, shine: reduce ? -1 : ((t - 0.5) % 2.4) / 1.2, alpha, px });
    if (!reduce) glints(g, x, y, size * 0.62, t, sceneA * clamp01((t - 0.3) / 0.3) + (toHover > 0 && t < at.fly ? 0.6 * toHover : 0), 1);
  } else if (!reduce && t < LAND) {
    // the flight: an arc down to its place, shrinking, turning, tipping
    const e = ease(flyK);
    const x = lerp(hx, slot.x, e);
    const yLine = lerp(hy, slotY, e);
    const y = yLine - Math.sin(Math.PI * flyK) * (wide ? 120 : 160);
    const size = lerp(hs, slotSize, e);
    const turn = Math.sin(Math.PI * flyK) * 0.5;
    drawSticker(g, b.id, x, y, size, { rot: lerp(0, tilt(c.index), e) - turn * 0.6, sx: 1 - 0.35 * Math.sin(Math.PI * flyK), lift: 0.85 + 0.4 * Math.sin(Math.PI * flyK) - 0.6 * e, px });
  }
  if (t >= land) {
    // stuck: a slap (a squash that settles), a puff, then still
    const k = t - land;
    const sq = reduce ? 0 : Math.exp(-k * 9) * Math.cos(k * 32) * 0.16;
    const alpha = reduce ? clamp01(k / 0.4) : 1;
    drawSticker(g, b.id, slot.x, slotY, slotSize, { rot: tilt(c.index), sx: 1 + sq, sy: 1 - sq, lift: 0.12 + Math.max(0, 0.4 - k) * 0.6, shine: reduce ? -1 : (k - 0.25) / 0.7, alpha, px });
    g.save();
    g.globalAlpha = alpha;
    fitLabel(g, shortName(b.name), slot.x, slot.y + slot.s * 0.43, slot.s * 1.08, { size: Math.max(11, slot.s * 0.1), color: '#5a4636', weight: 500 });
    g.restore();
    if (!reduce) {
      puff(g, slot.x, slotY, slot.s, b.color, k / 0.6);
      glints(g, slot.x, slotY, slot.s * 0.55, t, clamp01(1 - (k - 0.4) / 0.6), 7);
    }
    // what it opened
    if (t >= at.stuck - 0.05) {
      const a = clamp01((t - at.stuck + 0.05) / 0.4);
      g.save();
      g.globalAlpha = a;
      const line = c.next ? `A new page is open: ${c.next.name}!` : `Every one of the ${c.birds.length} rare birds, spotted!`;
      const y0 = wide ? 170 : 330;
      fitLabel(g, line, lw / 2 + 3, y0 + 3, lw - 60, { size: wide ? 46 : 44, weight: 700, color: PAL.strawberry });
      fitLabel(g, line, lw / 2, y0, lw - 60, { size: wide ? 46 : 44, weight: 700 });
      g.restore();
    }
  }
}
