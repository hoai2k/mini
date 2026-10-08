// Loading and drawing the art: sprites from the manifest built by
// tools/build_sprites.py (src/sprites.js), the creatures from their key poses
// with procedural life on top, and ink stand-ins for anything missing.

import { SPRITES } from './sprites.js';
import { MONSTERS } from './monsters.js';

const cache = new Map(); // src -> HTMLImageElement (loaded) | Promise

function loadImage(src) {
  if (cache.has(src)) return cache.get(src);
  const p = new Promise((res) => {
    const img = new Image();
    img.onload = () => { cache.set(src, img); res(img); };
    img.onerror = () => { cache.set(src, null); res(null); };
    img.src = src;
  });
  cache.set(src, p);
  return p;
}
const ready = (src) => { const v = cache.get(src); return v && !(v instanceof Promise) ? v : null; };

// Load a set of sheets / images, by key: 'trollusk.poses', 'props.grumley', 'ui/logo', 'scenes/grumley'.
export function preload(keys) {
  const srcs = [];
  for (const k of keys) {
    const sh = SPRITES.sheets[k];
    if (sh) srcs.push(...sh.items.map((i) => i.src));
    const im = SPRITES.images[k];
    if (im) srcs.push(im.src);
  }
  return Promise.all(srcs.map(loadImage));
}

export function image(key) {
  const im = SPRITES.images[key];
  return im ? ready(im.src) : null;
}
export function imageSrc(key) { return SPRITES.images[key]?.src || null; }

// One sprite from a sheet: { img, w, h } or null while loading / missing.
export function sprite(sheet, n) {
  const it = SPRITES.sheets[sheet]?.items[n - 1];
  if (!it) return null;
  const img = ready(it.src);
  return img ? { img, w: it.w, h: it.h } : null;
}

// Draw a sprite with its anchor (ax, ay: 0..1 of its size) at x, y, scaled to
// `height` logical px (or by `scale`), flipped when flip is true.
export function drawSprite(g, sp, x, y, { height, scale, ax = 0.5, ay = 1, flip = false, rot = 0, sx = 1, sy = 1, alpha = 1 } = {}) {
  if (!sp) return false;
  const k = scale ?? (height ? height / sp.h : 1);
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  g.scale((flip ? -1 : 1) * k * sx, k * sy);
  if (alpha !== 1) g.globalAlpha *= alpha;
  g.drawImage(sp.img, -sp.w * ax, -sp.h * ay, sp.w, sp.h);
  g.restore();
  return true;
}

// ---------- creatures ----------

const ANCHOR = { bombanat: 0.55, typhoonigator: 0.5 }; // flyers hang from their middle

export function makeCreature(id, x = 0, y = 0) {
  const M = MONSTERS[id];
  return {
    id, M, x, y, z: 0, facing: 1, anim: Object.keys(M.anims)[0], animT: 0, dist: 0,
    sq: 0, sqv: 0, lean: 0, leanTarget: 0, alpha: 1, flash: 0, sizeK: 1, rot: 0,
  };
}

// Squash (>0) or stretch (<0) kick: a spring brings it back.
export function kick(c, amount) { c.sqv += amount * 14; }

export function setAnim(c, name) {
  if (c.anim !== name) { c.anim = name; c.animT = 0; }
}

// Advance a creature's animation. vx: its speed across (px/s), for stride and lean.
export function animate(c, dt, vx = 0, vy = 0) {
  c.animT += dt;
  c.dist += Math.hypot(vx, vy) * dt;
  // Squash spring.
  c.sqv += (-c.sq * 180 - c.sqv * 14) * dt;
  c.sq += c.sqv * dt;
  c.leanTarget = Math.max(-0.18, Math.min(0.18, vx / 3000));
  c.lean += (c.leanTarget - c.lean) * (1 - Math.exp(-8 * dt));
  if (Math.abs(vx) > 20) c.facing = Math.sign(vx);
  c.flash = Math.max(0, c.flash - dt * 3);
}

function poseFrame(c) {
  const A = c.M.anims[c.anim] || Object.values(c.M.anims)[0];
  let i = 0;
  if (A.stride) i = Math.floor(c.dist / A.stride) % A.frames.length;
  else if (A.fps) i = Math.floor(c.animT * A.fps) % A.frames.length;
  return { A, pose: A.frames[i] };
}

function poseSprite(c, pose) {
  if (c.M.poses[pose]) return sprite(`${c.id}.poses`, c.M.poses[pose]);
  const ex = c.M.extras?.[pose];
  return ex ? sprite(ex[0], ex[1]) : null;
}

// An extra piece (not from the pose sheet) has its own height on screen.
function extraScale(c, pose, sp) {
  const ex = c.M.extras?.[pose];
  return ex && sp ? (ex[2] / sp.h) * c.sizeK : null;
}

// Scale that makes this creature's idle pose stand c.M.height tall (times sizeK).
function baseScale(c) {
  const first = Object.values(c.M.poses)[0];
  const it = SPRITES.sheets[`${c.id}.poses`]?.items[first - 1];
  return it ? (c.M.height / it.h) * c.sizeK : c.sizeK;
}

// Draw at (c.x, c.y - c.z): feet (or middle, for flyers) at that point.
export function drawCreature(g, c, t = 0, { reduceMotion = false, shadow = true } = {}) {
  const { A, pose } = poseFrame(c);
  const sp = poseSprite(c, pose);
  const k = extraScale(c, pose, sp) ?? baseScale(c);
  const ay = A.spin && c.M.extras?.[pose] ? 0.5 : ANCHOR[c.id] ?? 1;
  let x = c.x, y = c.y - c.z;
  const bob = A.bob && !reduceMotion ? Math.sin(t * 3.1 + c.x * 0.01) * A.bob : 0;
  const hop = A.hop && !reduceMotion ? -Math.abs(Math.sin(c.animT * 7)) * A.hop : 0;
  const shake = A.shake && !reduceMotion ? (Math.random() - 0.5) * A.shake * 2 : 0;
  const sq = reduceMotion ? c.sq * 0.4 : c.sq;
  const rot = c.lean + c.rot + (A.spin ? c.animT * 9 : 0);
  if (shadow && c.z >= 0) {
    g.save();
    g.globalAlpha = 0.18 * c.alpha * Math.max(0.3, 1 - c.z / 500);
    g.fillStyle = '#2b1d14';
    g.beginPath();
    g.ellipse(c.x, c.y, c.M.height * 0.32 * c.sizeK, c.M.height * 0.06 * c.sizeK, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  if (sp) {
    drawSprite(g, sp, x + shake, y + hop, { scale: k, ay, flip: c.facing < 0, rot, sx: 1 + sq * 0.5, sy: (1 - sq) * (1 + bob), alpha: c.alpha });
    if (c.flash > 0) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = c.flash * 0.35;
      drawSprite(g, sp, x + shake, y + hop, { scale: k, ay, flip: c.facing < 0, rot, sx: 1 + sq * 0.5, sy: (1 - sq) * (1 + bob) });
      g.restore();
    }
  } else {
    standIn(g, c, x + shake, y + hop, k, ay);
  }
}

// Height on screen of the current pose (for hit boxes and labels).
export function creatureSize(c) {
  const { pose } = poseFrame(c);
  const sp = poseSprite(c, pose);
  const k = baseScale(c);
  return sp ? { w: sp.w * k, h: sp.h * k } : { w: c.M.height * 0.8, h: c.M.height };
}

const STAND_IN = { trollusk: '#6b4a32', bombanat: '#9a7fa6', grumley: '#c4913a', iceferg: '#dfe2f0', typhoonigator: '#a69aa8', yalapappus: '#d0b24a', grithix: '#d59bb4' };

function standIn(g, c, x, y, k, ay) {
  const h = c.M.height * c.sizeK;
  g.save();
  g.translate(x, y + (ay < 1 ? h * (1 - ay) : 0));
  g.scale(c.facing < 0 ? -1 : 1, 1);
  g.globalAlpha *= c.alpha;
  g.fillStyle = STAND_IN[c.id] || '#999';
  g.strokeStyle = '#2b1d14';
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(0, -h * 0.45, h * 0.32, h * 0.45, 0, 0, Math.PI * 2);
  g.fill(); g.stroke();
  g.fillStyle = '#f0a0a0';
  g.beginPath(); g.ellipse(h * 0.28, -h * 0.62, h * 0.12, h * 0.08, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(h * 0.12, -h * 0.72, h * 0.05, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}

// ---------- props and scenes ----------

export function prop(sheet, n) { return sprite(`props.${sheet}`, n); }
export function cast(n) { return sprite('cast', n); }

// Draw a scene image to cover the logical frame.
export function drawScene(g, key, W, H, { dim = 0 } = {}) {
  const img = image(key);
  if (img) g.drawImage(img, 0, 0, W, H);
  else {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#d9c8dc'); gr.addColorStop(0.6, '#e8dcc4'); gr.addColorStop(1, '#a8a070');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  if (dim) { g.fillStyle = `rgba(40,25,30,${dim})`; g.fillRect(0, 0, W, H); }
}
