// The sticker celebration after a bird's score is first reached, drawn on
// the stage in the book's ink and watercolour: the bird's portrait as a
// die-cut sticker pops in, the field guide's sticker book opens under it with
// the stickers already earned, and the new one flies to its place and sticks.
// Timing and layout are in reward.js; main.js runs it and handles the input.

import { drawBird, paper, label, poly, ink, blob, PAL, INK } from './draw.js';
import { STEPS, FLY_TIME, bookLayout, gatherLayout, spreadOf, spreadCount, ease, pop } from './reward.js';
import { pagePoint, drawOrder, clampCam, bookToStage } from './stickerbook.js';

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

// The open book: its cloth cover, the leaves' edges, the two pages (with
// a picture on them, if any) and the fold between them.
function drawFrame(g, pages, spine, wide, { lw, lh, px, bg = null, bgFull = false }) {
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
  if (bg) (bgFull ? drawSpreadPicture : drawBackdrop)(g, pages, sides, wide, bg);
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
}

// One open spread of the book. c: { birds, earned (Set of indices stuck
// in), index (the new sticker's bird, drawn by its flight, or -1) };
// o.pos: where the player has put stickers; o.skip: the id of one being
// carried; o.bg: a picture behind the stickers, o.bgFull when it is one
// painted for the book's spread (its halves on the two pages) rather than a
// game's scene pasted in.
export function drawBook(g, L, wide, c, { stuckNew, lw, lh, px, t, pos = {}, skip = null, bg = null, bgFull = false }) {
  const { pages, slots, spine } = L;
  drawFrame(g, pages, spine, wide, { lw, lh, px, bg, bgFull });

  // headings, and the pages' numbers at their foot (with more than one
  // spread, which pages of the guide these are)
  const n = c.birds.length;
  const stuck = c.earned.size + (stuckNew ? 1 : 0);
  const hs = Math.min(pages[0].w, pages[0].h) * 0.068;
  const head = (p, text, k) => {
    if (bg) {
      // over a picture, on a strip of paper
      g.font = `700 ${hs}px Fraunces, Georgia, serif`;
      const w = g.measureText(text).width + hs * 1.2;
      roundRect(g, p.x + p.w / 2 - w / 2, p.y + p.h * 0.065 - hs * 0.75, w, hs * 1.5, hs * 0.3);
      g.fillStyle = 'rgba(248,241,224,0.92)';
      g.fill();
    }
    label(g, text, p.x + p.w / 2, p.y + p.h * 0.065, { size: hs, color: k ? '#7a6656' : INK, weight: k ? 500 : 700 });
  };
  head(pages[0], 'My Field Guide', 0);
  head(pages[1], `${stuck} of ${n} spotted`, 1);
  if (spreadCount(n) > 1) {
    const onPage = (k) => slots.filter((sl) => sl.page === k);
    pages.forEach((p, k) => {
      const own = onPage(k);
      if (!own.length) return;
      const text = `— ${own[0].i + 1} to ${own.at(-1).i + 1} —`;
      label(g, text, p.x + p.w / 2, p.y + p.h - Math.min(p.w, p.h) * 0.035, { size: hs * 0.48, color: 'rgba(59,43,32,0.45)', weight: 500 });
    });
  }
  // a hand-ruled line under each heading
  pages.forEach((p, k) => {
    poly(g, [[p.x + p.w * 0.3, p.y + p.h * 0.105], [p.x + p.w * 0.7, p.y + p.h * 0.108]], 40 + k, 1.2, false);
    g.globalAlpha = 0.4;
    ink(g, 1.4);
    g.globalAlpha = 1;
  });

  // the empty places: a pencilled outline and the page number of each bird
  // not yet stuck in
  for (const sl of slots) {
    const i = sl.i;
    const b = c.birds[i];
    const isNew = i === c.index;
    if (c.earned.has(i) || (isNew && stuckNew)) continue;
    const box = sl.s * 0.86;
    g.save();
    g.setLineDash([7, 6]);
    roundRect(g, sl.x - box / 2, sl.y - box / 2, box, box, box * 0.14);
    if (bg) {
      g.fillStyle = 'rgba(251,246,232,0.55)';
      g.fill();
    }
    g.lineWidth = 2;
    g.strokeStyle = isNew ? 'rgba(192,64,122,0.6)' : bg ? 'rgba(59,43,32,0.45)' : 'rgba(59,43,32,0.28)';
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
    label(g, String(i + 1), sl.x, sl.y, { size: box * 0.32, color: isNew ? 'rgba(192,64,122,0.7)' : bg ? 'rgba(59,43,32,0.5)' : 'rgba(59,43,32,0.3)', weight: 500 });
  }
  // the stickers, in their own places or wherever the player put them, the
  // pile from the bottom up (the new one is drawn by its flight, and one
  // being carried by the hand)
  const ids = slots.filter((sl) => c.earned.has(sl.i) && sl.i !== c.index && c.birds[sl.i].id !== skip).map((sl) => c.birds[sl.i].id);
  for (const id of drawOrder(ids, pos)) {
    const i = c.birds.findIndex((b) => b.id === id);
    const at = stickerSpot(L, i, pos[id]);
    drawPlaced(g, c.birds[i], i, at, { px, bg });
  }
}

// Where bird i's sticker sits on this spread: { x, y, s }, the centre of
// its place and the place's size; `p` is where the player put it, if moved.
export function stickerSpot(L, i, p) {
  const sl = L.slots.find((s) => s.i === i);
  if (!sl) return null;
  if (!p) return { x: sl.x, y: sl.y, s: sl.s };
  const at = pagePoint(L.pages, p);
  return { x: at.x, y: at.y, s: sl.s };
}

// A sticker stuck in at a spot, with its name under it.
export function drawPlaced(g, b, i, at, { px = 1, lift = 0.12, scale = 1, bg = null, alpha = 1 } = {}) {
  g.save();
  g.globalAlpha *= alpha;
  drawSticker(g, b.id, at.x, at.y - at.s * 0.06, at.s * 0.78 * scale, { rot: tilt(i), lift, px });
  const ly = at.y + at.s * 0.43 * scale;
  const size = Math.max(11, at.s * 0.1);
  if (bg) {
    // on a picture, the name on a little paper label
    g.font = `500 ${size}px Fraunces, Georgia, serif`;
    const w = Math.min(at.s * 1.08, g.measureText(shortName(b.name)).width) + size;
    roundRect(g, at.x - w / 2, ly - size * 0.75, w, size * 1.5, size * 0.4);
    g.fillStyle = 'rgba(251,246,232,0.85)';
    g.fill();
  }
  fitLabel(g, shortName(b.name), at.x, ly, at.s * 1.08, { size, color: '#5a4636', weight: 500 });
  g.restore();
}

// A picture painted for the book (2:1, a fold down the middle): its left
// half fills the first page (left, or top on an upright screen), its right
// half the second, to the edges, with the gutter's shade over the fold.
function drawSpreadPicture(g, pages, sides, wide, img) {
  const hw = img.width / 2;
  pages.forEach((p, n) => {
    const k = Math.max(p.w / hw, p.h / img.height);
    const sw = p.w / k;
    const sh = p.h / k;
    // each half anchored at the fold side when wide, centred when stacked
    const sx = n * hw + (wide ? (n === 0 ? hw - sw : 0) : (hw - sw) / 2);
    g.save();
    pagePath(g, p, sides[n]);
    g.clip();
    g.drawImage(img, sx, (img.height - sh) / 2, sw, sh, p.x, p.y, p.w, p.h);
    gutterShade(g, p, sides[n], wide);
    g.restore();
    pagePath(g, p, sides[n]);
    ink(g, 2.2);
  });
}

function gutterShade(g, p, side, wide) {
  const span = (wide ? p.w : p.h) * 0.16;
  const gx0 = side === 'r' ? p.x + p.w : p.x;
  const gy0 = side === 'b' ? p.y + p.h : p.y;
  const grd = wide
    ? g.createLinearGradient(gx0, 0, gx0 + (side === 'r' ? -span : span), 0)
    : g.createLinearGradient(0, gy0, 0, gy0 + (side === 'b' ? -span : span));
  grd.addColorStop(0, 'rgba(90,60,40,0.28)');
  grd.addColorStop(1, 'rgba(90,60,40,0)');
  g.fillStyle = grd;
  g.fillRect(p.x, p.y, p.w, p.h);
}

// The picture behind the stickers: one of the minigames' scenes, pasted in
// across the spread under the headings, its edges fading into the paper.
function drawBackdrop(g, pages, sides, wide, img) {
  const head = Math.min(pages[0].w, pages[0].h) * 0.14;
  const box = wide
    ? { x: pages[0].x, y: pages[0].y + head, w: pages[1].x + pages[1].w - pages[0].x, h: pages[0].h - head * 1.15 }
    : { x: pages[0].x, y: pages[0].y + head, w: pages[0].w, h: pages[1].y + pages[1].h - pages[0].y - head * 1.15 };
  const m = Math.min(box.w, box.h) * 0.04;
  const r = { x: box.x + m, y: box.y, w: box.w - m * 2, h: box.h - m * 0.5 };
  // cover the box, centred
  const k = Math.max(r.w / img.width, r.h / img.height);
  const sw = r.w / k;
  const sh = r.h / k;
  pages.forEach((p, n) => {
    g.save();
    pagePath(g, p, sides[n]);
    g.clip();
    g.globalAlpha = 0.92;
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, r.x, r.y, r.w, r.h);
    g.globalAlpha = 1;
    // the edges fade into the paper
    const f = Math.min(r.w, r.h) * 0.09;
    const fade = (x0, y0, x1, y1, x, y, w, h) => {
      const grd = g.createLinearGradient(x0, y0, x1, y1);
      grd.addColorStop(0, 'rgba(244,236,216,1)');
      grd.addColorStop(1, 'rgba(244,236,216,0)');
      g.fillStyle = grd;
      g.fillRect(x, y, w, h);
    };
    fade(r.x, 0, r.x + f, 0, r.x - 1, r.y - 1, f + 1, r.h + 2);
    fade(r.x + r.w, 0, r.x + r.w - f, 0, r.x + r.w - f, r.y - 1, f + 1, r.h + 2);
    fade(0, r.y, 0, r.y + f, r.x - 1, r.y - 1, r.w + 2, f + 1);
    fade(0, r.y + r.h, 0, r.y + r.h - f, r.x - 1, r.y + r.h - f, r.w + 2, f + 1);
    // and the gutter's shade lies over it
    gutterShade(g, p, sides[n], wide);
    g.restore();
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

// Where things go on a wide (1600 x 900) or an upright (900 x 1600) stage;
// the book open at the spread of bird i.
// With `gather`, the book is open at all the birds together (one spread,
// no sticker sheet); `size` is a sticker's size in the book either way.
export function celebrationLayout(n, wide, i = 0, gather = false) {
  const sp = spreadOf(i, n);
  const rect = wide ? { x: 150, y: 285, w: 1300, h: 565 } : { x: 80, y: 520, w: 740, h: 1010 };
  const spread = bookLayout(n, rect, wide, sp);
  // upright, the gathering's two pages would be small one above the other:
  // the view is zoomed onto the new bird's page instead, across the width
  const book = gather ? gatherLayout(n, wide ? rect : { x: 30, y: 470, w: 840, h: 1000 }, wide, { sheet: false }) : spread;
  const size = spread.slots[0]?.s || 100;
  return wide
    ? { pop: [800, 410, 430], hover: [800, 150, 220], head: 82, name: 690, sub: 748, book, size, lift: 520 }
    : { pop: [450, 700, 520], hover: [450, 300, 290], head: 210, name: 1040, sub: 1104, book, size, lift: 900 };
}

// The whole scene at time t. c: { index, birds, earned (Set of indices
// already stuck), next (the page that opens, or null), pos (where the player
// has put stickers in the sticker book), bg (its picture, { img, full }, or
// null) };
// o: { lw, lh, px, reduce, wide }.
export function drawCelebration(g, c, t, o) {
  const { lw, lh, px, reduce, wide } = o;
  const b = c.birds[c.index];
  const G = c.gather || null;
  const L = celebrationLayout(c.birds.length, wide, c.index, !!G);
  // its own place, or where the player put it before (?debug replays); on
  // the gathering, its own spot in the painting
  const region = G && G.atlas.regions.find((r) => r.id === b.id);
  let cam = null;
  if (G && !wide) {
    const { box, win, pages } = L.book;
    const z = win.w / pages[0].w;
    const pg = pages[region?.page || 0];
    cam = clampCam(box, { z, x: box.x + box.w / 2, y: pg.y + pg.h / 2 }, win);
  }
  const rr = region && camRect(L.book, cam, regionRect(L.book, region));
  const slot = rr ? { x: rr.cx, y: rr.cy + (regionSize(rr) / 0.78) * 0.06, s: regionSize(rr) / 0.78 } : stickerSpot(L.book, c.index, c.pos?.[b.id]);
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
    if (G) {
      const earned = new Set(c.earned);
      earned.add(c.index);
      const gpos = { ...G.gpos };
      delete gpos[b.id];
      drawGatherBook(g, L.book, wide, {
        birds: c.birds,
        earned,
        img: G.img,
        atlas: G.atlas,
        grey: (id) => (id === b.id ? (t < land ? 1 : snapGrey(dissolveK(t - land, reduce), reduce)) : G.snapped.has(id) && earned.has(c.birds.findIndex((x) => x.id === id)) ? 0 : 1),
        glow: t >= at.fly - 0.3 && t < land ? b.id : null,
        gpos,
        size: L.size,
        skip: b.id,
        cam,
      }, { lw, lh, px, t });
    } else drawBook(g, L.book, wide, c, { stuckNew: t >= land, lw, lh, px, t, pos: c.pos || {}, bg: c.bg?.img || null, bgFull: !!c.bg?.full });
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
  if (t >= land && G) {
    // on the gathering: it melts into its spot and the bird there takes its colour
    const k = t - land;
    drawSnap(g, b, c.index, { x: slot.x, y: slotY, size: slotSize }, { x: slot.x, y: slotY, size: slotSize }, dissolveK(k, reduce), { reduce, px, t });
    if (!reduce) glints(g, rr.cx, rr.cy, slotSize * 0.7, t, clamp01(1 - (k - 0.6) / 0.6), 7);
    const a = clamp01((k - 0.3) / 0.4);
    if (a > 0) {
      g.save();
      g.globalAlpha = a;
      const size = Math.max(16, L.size * 0.13);
      const ly = Math.min(rr.y + rr.h + size * 0.9, L.book.win.y + L.book.win.h - size);
      g.font = `600 ${size}px Fraunces, Georgia, serif`;
      const w = g.measureText(shortName(b.name)).width + size * 1.2;
      const win = L.book.win;
      const lx = Math.max(win.x + w / 2 + 8, Math.min(win.x + win.w - w / 2 - 8, slot.x));
      roundRect(g, lx - w / 2, ly - size * 0.8, w, size * 1.6, size * 0.45);
      g.fillStyle = 'rgba(251,246,232,0.94)';
      g.fill();
      ink(g, 1.4);
      label(g, shortName(b.name), lx, ly, { size, color: '#5a4636', weight: 600 });
      g.restore();
    }
    nextLine(g, c, t, lw, wide);
  } else if (t >= land) {
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
    nextLine(g, c, t, lw, wide);
  }
}

// After the sticker is stuck: what it opened.
function nextLine(g, c, t, lw, wide) {
  if (t < at.stuck - 0.05) return;
  const a = clamp01((t - at.stuck + 0.05) / 0.4);
  g.save();
  g.globalAlpha = a;
  const line = c.next ? `A new page is open: ${c.next.name}!` : `Every one of the ${c.birds.length} rare birds, spotted!`;
  const y0 = wide ? 170 : 330;
  fitLabel(g, line, lw / 2 + 3, y0 + 3, lw - 60, { size: wide ? 46 : 44, weight: 700, color: PAL.strawberry });
  fitLabel(g, line, lw / 2, y0, lw - 60, { size: wide ? 46 : 44, weight: 700 });
  g.restore();
}

// How far a sticker landed on the gathering is through its snap (only the
// melting part: the flight brought it there).
const dissolveK = (k, reduce) => (reduce ? clamp01(k / 0.4) : SNAP_MOVE + (1 - SNAP_MOVE) * clamp01(k / 0.7));

// ---------- the sticker book, opened from the guide ----------

// The book alone on the stage, open at `spread`, as large as it goes with
// room for the words and buttons above and below it; with `gather`, open at
// all the birds together, with the sticker sheet beside it.
export function stickerBookLayout(n, wide, spread = 0, gather = false) {
  if (gather) return gatherLayout(n, wide ? { x: 24, y: 140, w: 1552, h: 660 } : { x: 16, y: 240, w: 868, h: 1290 }, wide);
  return wide ? bookLayout(n, { x: 120, y: 150, w: 1360, h: 640 }, true, spread) : bookLayout(n, { x: 60, y: 250, w: 780, h: 1150 }, false, spread);
}
// A sticker's own size in the book (its place on a spread).
export const stickerSize = (n, wide) => stickerBookLayout(n, wide, 0).slots[0].s;

// The sticker book screen. sb: { birds, earned (Set), book ({ pos, bg,
// spread }), held (null or { id, x, y, s }: a sticker being carried, its
// centre in stage units and, on the gathering, its size), hand (null or
// { x, y }: the controller's or keyboard's hand), bg (the picture behind the
// stickers, { img, full }, or null), gather (on the gathering: drawGatherBook's
// c, plus L, its layout, and snaps, the stickers snapping in: [{ b, i, from,
// to, k }]) }; o: { lw, lh, px, wide, t, reduce }.
export function drawStickerBook(g, sb, o) {
  const { lw, lh, px, wide, t, reduce } = o;
  paper(g, lw, lh);
  let size;
  if (sb.gather) {
    drawGatherBook(g, sb.gather.L, wide, sb.gather, { lw, lh, px, t });
    for (const a of sb.gather.snaps) drawSnap(g, a.b, a.i, a.from, a.to, a.k, { reduce, px, t });
    size = sb.held?.s;
  } else {
    const L = stickerBookLayout(sb.birds.length, wide, sb.book.spread);
    drawBook(g, L, wide, { birds: sb.birds, earned: sb.earned, index: -1 }, { stuckNew: false, lw, lh, px, t, pos: sb.book.pos, skip: sb.held?.id, bg: sb.bg?.img || null, bgFull: !!sb.bg?.full });
    if (sb.held) size = L.slots.find((s) => s.i === sb.birds.findIndex((b) => b.id === sb.held.id)).s;
  }
  if (sb.held) {
    const i = sb.birds.findIndex((b) => b.id === sb.held.id);
    const bob = reduce ? 0 : Math.sin(t * 3) * 3;
    drawPlaced(g, sb.birds[i], i, { x: sb.held.x, y: sb.held.y + bob, s: size }, { px, lift: 1, scale: 1.15, bg: sb.bg?.img || sb.gather });
  }
  if (sb.hand) drawHand(g, sb.hand.x, sb.hand.y, !!sb.held, wide ? 1 : 1.25);
}

// The hand the stick moves: a pointing finger in ink, a pink ring where it
// points (closed round a sticker while carrying one).
function drawHand(g, x, y, holding, k) {
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.beginPath();
  g.arc(0, 0, holding ? 10 : 16, 0, Math.PI * 2);
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(192,64,122,0.85)';
  g.stroke();
  // the hand, below and to the right of the point
  g.translate(6, 8);
  g.rotate(-0.45);
  g.beginPath();
  g.moveTo(-6, 0);
  g.lineTo(-6, 34);
  g.quadraticCurveTo(-8, 52, 6, 60);
  g.lineTo(28, 60);
  g.quadraticCurveTo(38, 50, 36, 30);
  g.lineTo(36, 20);
  g.quadraticCurveTo(30, 14, 24, 20);
  g.quadraticCurveTo(18, 12, 12, 18);
  g.quadraticCurveTo(8, 12, 6, 18);
  g.lineTo(6, 0);
  g.quadraticCurveTo(0, -8, -6, 0);
  g.closePath();
  g.fillStyle = '#fffbf1';
  g.fill();
  ink(g, 2.4);
  g.restore();
}

// ---------- all the birds together ----------

// The gathering painting's spots: each bird's region of the painting
// (painting shares, from the atlas) on this layout's pages, in stage units.
export function regionRect(L, r) {
  const p = L.pages[r.page];
  return { x: p.x + (r.x * 2 - r.page) * p.w, y: p.y + r.y * p.h, w: r.w * 2 * p.w, h: r.h * p.h, cx: p.x + (r.cx * 2 - r.page) * p.w, cy: p.y + r.cy * p.h };
}
// A rectangle of the book ({ x, y, w, h, cx, cy }) as seen through a camera
// (unchanged without one).
export function camRect(L, cam, r) {
  if (!cam) return r;
  const a = bookToStage(L.win, cam, { x: r.x, y: r.y });
  const c = bookToStage(L.win, cam, { x: r.cx, y: r.cy });
  return { x: a.x, y: a.y, w: r.w * cam.z, h: r.h * cam.z, cx: c.x, cy: c.y };
}
// The size a sticker is drawn at to fill a region (drawSticker's `size`).
export const regionSize = (rr) => Math.min(rr.h, rr.w / 1.12) * 1.05;

// A greyed spot: the painting inside the bird's region washed out toward
// the paper, as if only pencilled in (its dark lines kept faint, its colour
// gone), fading softly into the painting round a rounded square fitted to
// the region (a superellipse, so the box's corners are covered without
// greying much round its sides). Built once per bird from the painting.
const OVAL = 1.3; // the patch's size, against the region's box
const SHAPE = 0.6; // the shape's half size, against the box (it fades out from 0.8 to 1.08 of it)
const patches = new Map();
function greyPatch(img, r) {
  const key = r.id;
  if (patches.has(key) && patches.get(key).img === img) return patches.get(key);
  const W = img.width;
  const H = img.height;
  const pw = r.w * W * OVAL;
  const ph = r.h * H * OVAL;
  const sx = Math.max(0, Math.floor(r.cx * W - pw / 2));
  const sy = Math.max(0, Math.floor(r.cy * H - ph / 2));
  const sw = Math.min(W - sx, Math.ceil(pw));
  const sh = Math.min(H - sy, Math.ceil(ph));
  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const data = x.getImageData(0, 0, sw, sh);
  const d = data.data;
  const ocx = r.cx * W - sx;
  const ocy = r.cy * H - sy;
  for (let j = 0; j < sh; j++) {
    for (let i = 0; i < sw; i++) {
      const o = (j * sw + i) * 4;
      const lum = (0.3 * d[o] + 0.59 * d[o + 1] + 0.11 * d[o + 2]) / 255;
      // the paper, darkened where the painting is dark: its ink lines show
      const k = 0.5 + 0.5 * Math.pow(lum, 0.75);
      d[o] = 247 * k;
      d[o + 1] = 240 * k;
      d[o + 2] = 224 * k;
      const ex = Math.abs(i - ocx) / (r.w * W * SHAPE);
      const ey = Math.abs(j - ocy) / (r.h * H * SHAPE);
      const e = Math.sqrt(Math.sqrt(ex ** 4 + ey ** 4));
      const a = e <= 0.8 ? 1 : e >= 1.08 ? 0 : 1 - smooth((e - 0.8) / 0.28);
      d[o + 3] = 255 * a;
    }
  }
  x.putImageData(data, 0, 0);
  const patch = { img, canvas: c, x: sx / W, y: sy / H, w: sw / W, h: sh / H };
  patches.set(key, patch);
  return patch;
}
const smooth = (x) => x * x * (3 - 2 * x);

// The open book at the gathering. c: { birds, earned (Set of indices),
// img (the painting), atlas (regionsFromAtlas), grey (id → 0..1, how
// greyed its spot is), glow (the id of the sticker carried: its spot
// glows), gpos (stickers left loose on the page), cells (the stickers
// waiting on the sheet, from sheetCells), shake ({ id, dx }), size (a sticker's
// size), cam ({ z, x, y }, or null) }; o: { lw, lh, px, t }.
export function drawGatherBook(g, L, wide, c, { lw, lh, px, t }) {
  const { pages, spine, box, win } = L;
  const cam = c.cam || { z: 1, x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const toStage = (p) => ({ x: win.x + win.w / 2 + (p.x - cam.x) * cam.z, y: win.y + win.h / 2 + (p.y - cam.y) * cam.z });
  if (L.zones.length) drawSheet(g, L, c);
  // the pages, seen through their window (all of them, unless zoomed in)
  const zoomed = cam.z > 1.001;
  g.save();
  if (zoomed) {
    g.beginPath();
    roundRect(g, win.x, win.y, win.w, win.h, 10);
    g.clip();
  }
  g.save();
  g.translate(win.x + win.w / 2, win.y + win.h / 2);
  g.scale(cam.z, cam.z);
  g.translate(-cam.x, -cam.y);
  drawFrame(g, pages, spine, wide, { lw, lh, px: px * cam.z, bg: c.img, bgFull: true });
  // the greyed spots, then their outlines and numbers on top
  const sides = wide ? ['r', 'l'] : ['b', 't'];
  for (const r of c.atlas.regions) {
    const k = c.grey(r.id);
    if (k <= 0.001) continue;
    const pt = greyPatch(c.img, r);
    const rr = regionRect(L, { ...r, x: pt.x, y: pt.y, w: pt.w, h: pt.h });
    g.save();
    pagePath(g, pages[r.page], sides[r.page]);
    g.clip();
    g.globalAlpha = k;
    g.drawImage(pt.canvas, rr.x, rr.y, rr.w, rr.h);
    g.restore();
  }
  for (const r of c.atlas.regions) {
    const k = c.grey(r.id);
    const glow = c.glow === r.id;
    if (k <= 0.02 && !glow) continue;
    const i = c.birds.findIndex((b) => b.id === r.id);
    const rr = regionRect(L, r);
    const earned = c.earned.has(i);
    const rx = rr.w * SHAPE * 0.92;
    const ry = rr.h * SHAPE * 0.92;
    g.save();
    if (glow) {
      // the carried sticker's own spot: a soft wash of its colour, breathing
      g.globalAlpha = 0.28 + 0.12 * Math.sin(t * 5);
      g.fillStyle = c.birds[i].color;
      roundRect(g, rr.cx - rx, rr.cy - ry, rx * 2, ry * 2, Math.min(rx, ry) * 0.6);
      g.fill();
      g.globalAlpha = 1;
    }
    g.globalAlpha = Math.max(k, glow ? 1 : 0);
    g.setLineDash([9 / cam.z + 3, 7 / cam.z + 3]);
    g.lineDashOffset = glow ? -t * 30 : 0;
    roundRect(g, rr.cx - rx, rr.cy - ry, rx * 2, ry * 2, Math.min(rx, ry) * 0.6);
    g.lineWidth = glow ? 3 : 1.6;
    g.strokeStyle = glow ? 'rgba(192,64,122,0.85)' : earned ? 'rgba(122,74,96,0.55)' : 'rgba(59,43,32,0.3)';
    g.stroke();
    g.setLineDash([]);
    // its number on a little paper tag at the foot of the oval: faint until
    // its sticker is earned, then inked in the book's pink, waiting
    const ts = Math.max(13, Math.min(rr.w, rr.h) * 0.15);
    const tx = rr.cx;
    const ty = Math.min(rr.cy + ry, pages[r.page].y + pages[r.page].h - ts);
    g.beginPath();
    g.arc(tx, ty, ts * 0.78, 0, Math.PI * 2);
    g.fillStyle = earned ? 'rgba(255,251,241,0.95)' : 'rgba(250,244,228,0.7)';
    g.fill();
    g.lineWidth = earned ? 1.8 : 1.2;
    g.strokeStyle = earned ? 'rgba(192,64,122,0.75)' : 'rgba(59,43,32,0.3)';
    g.stroke();
    label(g, String(i + 1), tx, ty + ts * 0.04, { size: ts, weight: earned ? 700 : 500, color: earned ? 'rgba(160,48,100,0.95)' : 'rgba(59,43,32,0.45)' });
    g.restore();
  }
  g.restore();
  if (zoomed) {
    // the window's edge, a thin ink line
    roundRect(g, win.x, win.y, win.w, win.h, 10);
    g.globalAlpha = 0.6;
    ink(g, 2);
    g.globalAlpha = 1;
  }
  // the loose stickers, at their full size whatever the zoom
  const ids = Object.keys(c.gpos).filter((id) => id !== c.skip && c.earned.has(c.birds.findIndex((b) => b.id === id)));
  for (const id of drawOrder(ids, c.gpos)) {
    const i = c.birds.findIndex((b) => b.id === id);
    const at = toStage(pagePoint(pages, c.gpos[id]));
    const dx = c.shake?.id === id ? c.shake.dx : 0;
    drawPlaced(g, c.birds[i], i, { x: at.x + dx, y: at.y, s: c.size }, { px, bg: true });
  }
  g.restore();
}

// The sticker sheet beside (or under) the book: a backing paper in each of
// its zones, with the stickers waiting there (c.cells: not yet snapped into
// the picture or left on the page), or a faint note when none are.
function drawSheet(g, L, c) {
  const cells = (c.cells || []).filter((sl) => c.birds[sl.i]?.id !== c.skip);
  L.zones.forEach((z, k) => {
    const own = cells.filter((sl) => sl.zone === k);
    const m = Math.min(z.w, z.h) * 0.04;
    g.save();
    g.shadowColor = 'rgba(59,43,32,0.16)';
    g.shadowBlur = 8;
    g.shadowOffsetY = 3;
    roundRect(g, z.x + m, z.y + m, z.w - m * 2, z.h - m * 2, 14);
    g.fillStyle = 'rgba(251,246,232,0.9)';
    g.fill();
    g.restore();
    g.save();
    g.setLineDash([6, 5]);
    roundRect(g, z.x + m * 2, z.y + m * 2, z.w - m * 4, z.h - m * 4, 10);
    g.lineWidth = 1.2;
    g.strokeStyle = 'rgba(59,43,32,0.22)';
    g.stroke();
    g.restore();
    roundRect(g, z.x + m, z.y + m, z.w - m * 2, z.h - m * 2, 14);
    g.globalAlpha = 0.45;
    ink(g, 1.4);
    g.globalAlpha = 1;
    if (!own.length && k === 0) {
      const text = cells.length || c.waitingNote === false ? '' : 'Stickers wait here';
      if (text) {
        if (L.zones.length === 2) {
          g.save();
          g.translate(z.x + z.w / 2, z.y + z.h / 2);
          g.rotate(-Math.PI / 2);
          label(g, text, 0, 0, { size: Math.min(26, z.w * 0.2), weight: 500, color: 'rgba(59,43,32,0.4)' });
          g.restore();
        } else label(g, text, z.x + z.w / 2, z.y + z.h / 2, { size: Math.min(30, z.h * 0.2), weight: 500, color: 'rgba(59,43,32,0.4)' });
      }
    }
  });
  for (const sl of cells) drawSticker(g, c.birds[sl.i].id, sl.x, sl.y, sl.s * 0.84, { rot: tilt(sl.i) * 0.7, lift: 0.1 });
}

// A sticker snapping into its spot, k from 0 to 1: it shrinks and moves to
// the spot (the first SNAP_MOVE of the time), then melts into the painting
// with a bloom of its colour, while the spot's grey lifts (snapGrey).
// from / to: { x, y, size } in stage units.
export const SNAP_TIME = 0.85;
const SNAP_MOVE = 0.4;
export const snapGrey = (k, reduce = false) => (reduce ? 1 - clamp01(k) : 1 - ease(clamp01((k - SNAP_MOVE) / (1 - SNAP_MOVE))));
export function drawSnap(g, b, i, from, to, k, { reduce = false, px = 1, t = 0 } = {}) {
  if (k >= 1) return;
  if (reduce) {
    // with less motion: no flight, the sticker simply fades into its spot
    drawSticker(g, b.id, to.x, to.y, to.size, { rot: tilt(i), lift: 0, alpha: 1 - clamp01(k), px });
    return;
  }
  const m = ease(clamp01(k / SNAP_MOVE));
  const d = clamp01((k - SNAP_MOVE) / (1 - SNAP_MOVE));
  const x = lerp(from.x, to.x, m);
  const y = lerp(from.y, to.y, m) - Math.sin(Math.PI * m) * 30;
  const size = lerp(from.size, to.size, m);
  if (d > 0) {
    // a bloom of its colour soaking out into the paper
    g.save();
    g.globalAlpha = (1 - d) * 0.45;
    g.fillStyle = b.color;
    blob(g, to.x, to.y, to.size * (0.45 + 0.4 * d), to.size * (0.4 + 0.36 * d), i, 0.12, 16);
    g.fill();
    g.restore();
  }
  const sq = d > 0 ? Math.exp(-d * 6) * Math.sin(d * 18) * 0.08 : 0;
  drawSticker(g, b.id, x, y, size, { rot: lerp(tilt(i), 0, m), sx: 1 + sq, sy: 1 - sq, lift: lerp(0.9, 0, m), alpha: 1 - ease(d), shine: d > 0 ? d * 1.2 : -1, px });
  if (d > 0) glints(g, to.x, to.y, to.size * 0.6, t, 1 - d, i);
}
