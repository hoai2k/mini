// The slide around the amoeba: Spirogyra filaments and pennate diatoms lying
// on the glass, detritus flakes, and an out-of-focus layer above (filaments
// and flakes floating higher in the drop). Also the procedural stand-ins for
// the requested images (MP-A01 wet mount, MP-A02 cytoplasm granules).
import { TAU, rng } from './util.js';

export function buildWorld(seed = 7) {
  const r = rng(seed);
  const obstacles = [];
  // Spirogyra: ~40 µm wide filaments, cells about 2–3 widths long.
  const spiro = (x, y, ang, L, D, layer) => obstacles.push({
    type: 'spiro', x, y, ang, L, W: D, layer, seed: r(), cell: r.range(2.0, 3.0) * D, pitch: r.range(34, 46), strands: r() < 0.4 ? 2 : 3,
  });
  spiro(260, 420, -0.38, 1900, 42, 'focus');
  spiro(-900, -260, 1.25, 1700, 38, 'focus');
  spiro(700, -760, 0.25, 1500, 44, 'focus');
  // Pennate diatoms (Navicula / Pinnularia type), some seen in girdle view.
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = r.range(330, 1300);
    const L = r.range(55, 125);
    obstacles.push({ type: 'diatom', x: Math.cos(a) * d, y: Math.sin(a) * d, ang: r() * TAU, L, W: L * r.range(0.16, 0.24), layer: 'focus', seed: r(), girdle: r() < 0.25 ? 1 : 0, glide: r.range(-2, 2) });
  }
  // Detritus flakes on the slide.
  for (let i = 0; i < 16; i++) {
    const a = r() * TAU, d = r.range(300, 1500);
    const s = r.range(18, 80);
    obstacles.push({ type: 'flake', x: Math.cos(a) * d, y: Math.sin(a) * d, ang: r() * TAU, L: s, W: s * r.range(0.6, 1), layer: 'focus', seed: r() });
  }
  // Floating above the focal plane: blurred.
  spiro(-300, 160, 0.62, 2600, 46, 'above');
  spiro(500, -300, 2.1, 2400, 40, 'above');
  for (let i = 0; i < 8; i++) {
    const a = r() * TAU, d = r.range(200, 1600);
    const s = r.range(30, 120);
    obstacles.push({ type: 'flake', x: Math.cos(a) * d, y: Math.sin(a) * d, ang: r() * TAU, L: s, W: s * r.range(0.5, 1), layer: 'above', seed: r() });
  }
  // Trap hyphae of a zoopagalean fungus (Stylopage / Zoopage type), which
  // catch amoebae on adhesive knobs: the hazard (see README).
  const trap = (x, y, ang, L) => obstacles.push({ type: 'trap', x, y, ang, L, W: 6, layer: 'focus', seed: r(), trap: true });
  trap(-470, -170, 0.95, 640);
  trap(430, 300, -0.35, 560);
  trap(-150, 560, 0.15, 520);
  for (const o of obstacles) o.collide = colliders(o);
  return { obstacles, rand: r };
}

function colliders(o) {
  if (o.layer !== 'focus' || o.type === 'trap') return { capsules: [], circles: [] };
  const c = Math.cos(o.ang), s = Math.sin(o.ang);
  if (o.type === 'spiro' || o.type === 'diatom') {
    const h = o.L / 2 - o.W / 2;
    return { capsules: [{ ax: o.x - c * h, ay: o.y - s * h, bx: o.x + c * h, by: o.y + s * h, r: o.W / 2 * (o.type === 'diatom' ? 0.9 : 1) }], circles: [] };
  }
  // A flake: a circle of most of its size (the ragged rim is passable).
  return { capsules: [], circles: [{ x: o.x, y: o.y, r: Math.min(o.L, o.W) * 0.36 }] };
}

/** Collect the collision shapes (refreshing gliding diatoms). */
export function worldColliders(world, dt) {
  const capsules = [], circles = [];
  for (const o of world.obstacles) {
    if (o.type === 'diatom' && o.layer === 'focus' && o.glide) {
      // Raphid diatoms glide back and forth along their long axis.
      o.t = (o.t || 0) + dt;
      if (Math.sin(o.t * 0.05 + o.seed * 10) > 0.995) o.glide = -o.glide;
      o.x += Math.cos(o.ang) * o.glide * dt;
      o.y += Math.sin(o.ang) * o.glide * dt;
      o.collide = colliders(o);
    }
    capsules.push(...o.collide.capsules);
    circles.push(...o.collide.circles);
  }
  return { capsules, circles };
}

/** The trap hyphae as capsules {ax, ay, bx, by, r} (they glue, they do not block). */
/** The sticky part of each trap hypha: only what has grown, and only while its knobs are active. */
export function trapCapsules(world) {
  return world.obstacles.filter((o) => o.type === 'trap' && !o.haustorium && !o.hidden && (o.grow ?? 1) > 0.02 && (o.active ?? 1) > 0.5).map((o) => {
    const c = Math.cos(o.ang), s = Math.sin(o.ang), h = o.L / 2, g = o.grow ?? 1;
    const ax = o.x - c * h, ay = o.y - s * h;
    return { ax, ay, bx: ax + c * o.L * g, by: ay + s * o.L * g, r: o.W / 2 + 7, o };
  });
}

/** Add a residue flake (egested food vacuole) to the slide. */
export function addResidue(world, x, y, size, seed) {
  const o = { type: 'flake', x, y, ang: seed * TAU, L: size, W: size * 0.8, layer: 'focus', seed, residue: true };
  o.collide = { capsules: [], circles: [] };
  world.obstacles.push(o);
  return o;
}

// --- procedural stand-ins -------------------------------------------------

function wrapDraw(ctx, size, x, y, rad, fn) {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
    const X = x + dx, Y = y + dy;
    if (X + rad < 0 || Y + rad < 0 || X - rad > size || Y - rad > size) continue;
    fn(X, Y);
  }
}

function layer(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

/** Draw a layer onto ctx through one blur (tiled 3×3 so the blur wraps). */
function blurInto(ctx, src, size, px) {
  ctx.save();
  ctx.filter = `blur(${px}px)`;
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) ctx.drawImage(src, dx, dy);
  ctx.restore();
}

/** MP-A01 stand-in: a pale warm-grey brightfield field, tileable, with faint mottling and specks. */
export function wetMountCanvas(size = 1024, seed = 3) {
  const r = rng(seed);
  const [cv, ctx] = layer(size);
  ctx.fillStyle = 'rgb(196,188,171)';
  ctx.fillRect(0, 0, size, size);
  // Uneven illumination and medium: very soft blobs.
  const [l1, c1] = layer(size);
  for (let i = 0; i < 40; i++) {
    const x = r() * size, y = r() * size, rad = r.range(60, 200);
    c1.fillStyle = r() < 0.5 ? 'rgba(210,203,186,0.35)' : 'rgba(180,172,154,0.3)';
    wrapDraw(c1, size, x, y, rad, (X, Y) => { c1.beginPath(); c1.arc(X, Y, rad, 0, TAU); c1.fill(); });
  }
  blurInto(ctx, l1, size, 40);
  // Faint out-of-focus specks.
  const [l3, c3] = layer(size);
  for (let i = 0; i < 60; i++) {
    const x = r() * size, y = r() * size, rad = r.range(4, 14);
    c3.fillStyle = `rgba(150,135,105,${r.range(0.08, 0.2)})`;
    wrapDraw(c3, size, x, y, rad, (X, Y) => { c3.beginPath(); c3.arc(X, Y, rad, 0, TAU); c3.fill(); });
  }
  blurInto(ctx, l3, size, 6);
  // Bacteria and tiny particles (barely resolved at this magnification).
  const [l2, c2] = layer(size);
  for (let i = 0; i < 900; i++) {
    const x = r() * size, y = r() * size, rad = r.range(0.6, 1.8);
    const dark = r() < 0.7;
    c2.fillStyle = dark ? `rgba(120,110,92,${r.range(0.15, 0.4)})` : 'rgba(235,230,215,0.35)';
    const ex = rad * r.range(1, 2.2), an = r() * TAU;
    wrapDraw(c2, size, x, y, 4, (X, Y) => { c2.beginPath(); c2.ellipse(X, Y, ex, rad, an, 0, TAU); c2.fill(); });
  }
  blurInto(ctx, l2, size, 1.2);
  return cv;
}

/** MP-A02 stand-in: tileable granular endoplasm texture (≈ 80 µm across). */
export function cytoplasmCanvas(size = 512, seed = 5) {
  const r = rng(seed);
  const [cv, ctx] = layer(size);
  ctx.fillStyle = 'rgb(214,208,190)';
  ctx.fillRect(0, 0, size, size);
  const px = size / 80; // pixels per µm
  const [l, c] = layer(size);
  for (let i = 0; i < 1700; i++) {
    const x = r() * size, y = r() * size, rad = r.range(0.4, 1.3) * px;
    c.fillStyle = r() < 0.75 ? `rgba(90,88,62,${r.range(0.25, 0.6)})` : `rgba(245,242,230,${r.range(0.3, 0.6)})`;
    wrapDraw(c, size, x, y, rad + 2, (X, Y) => { c.beginPath(); c.arc(X, Y, rad, 0, TAU); c.fill(); });
  }
  blurInto(ctx, l, size, 1);
  return cv;
}

/** Mean colour of an image or canvas (for converting a photo to optical density). */
export function meanColor(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 16, 16);
  const d = ctx.getImageData(0, 0, 16, 16).data;
  let R = 0, Gc = 0, B = 0;
  for (let i = 0; i < d.length; i += 4) { R += d[i]; Gc += d[i + 1]; B += d[i + 2]; }
  const n = d.length / 4;
  return [R / n / 255, Gc / n / 255, B / n / 255];
}
