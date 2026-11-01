// The slide around the amoeba: Spirogyra filaments and pennate diatoms lying
// on the glass, detritus flakes, and an out-of-focus layer above (filaments
// and flakes floating higher in the drop). Also the procedural stand-ins for
// the requested images (MP-A01 wet mount, MP-A02 cytoplasm granules).
import { TAU, rng } from './util.js';

// The slide as rings round the start (the owner, 2026-11-01;
// ../../design/encounter-pattern.md): the same encounters whichever way you
// crawl. Distances are µm from the start (the cell's centre at the origin):
//   0-520      the warm-up: calm glass, a few easy prey round you (food at a
//              safe spot, for as long as you like)
//   650        a ring of easy-prey patches (slow flagellates that do not flee)
//   1150       a ring of ciliate patches (they flee: surge to catch them; a
//              Paramecium caudatum in every other patch)
//   1675       a ring of fungal-trap clusters (two hyphae each, staggered)
//   2560/2800  the giant amoeba Chaos on guard before the portal (the way on:
//              a green Paramecium bursaria in a golden glow), placed in the
//              direction of whoever first gets RINGS.place out (main.js)
// with calm glass between each ring. The slide's objects (filaments, diatoms,
// flakes) run on to RINGS.field in every direction.
export const RINGS = { warm: 520, easy: 650, ciliates: 1150, traps: 1675, chaos: 2560, portal: 2800, place: 1000, field: 4300 };
export const PORTAL_R = RINGS.portal;
export const distFromStart = (x, y) => Math.hypot(x, y);
export const bearingFromStart = (x, y) => Math.atan2(y, x);
export const ringPoint = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];
/** How far out a point is, as a fraction of the way to the portal ring (0 at the start, 1 on it). */
export const progressOf = (x, y) => Math.hypot(x, y) / PORTAL_R;
// The patches of prey: each prey keeps to its patch (main.js tethers it there)
// and an eaten one comes back to it, swimming in from out of view.
export const EASY = ['chilomonas', 'chilomonas', 'chlamydomonas'];
export const CILIATES = ['tetrahymena', 'colpidium'];
export const PATCH = { easy: { n: 8, r: 120 }, ciliates: { n: 10, r: 150 } };
export const PATCHES = [
  { ring: 'start', x: 0, y: 0, r: 430, kinds: ['chilomonas', 'chlamydomonas', 'chilomonas', 'chlamydomonas'] },
  ...Array.from({ length: PATCH.easy.n }, (_, i) => {
    const [x, y] = ringPoint(RINGS.easy, ((i + 0.5) / PATCH.easy.n) * TAU);
    return { ring: 'easy', x, y, r: PATCH.easy.r, kinds: EASY };
  }),
  ...Array.from({ length: PATCH.ciliates.n }, (_, i) => {
    const [x, y] = ringPoint(RINGS.ciliates, (i / PATCH.ciliates.n) * TAU);
    return { ring: 'ciliates', x, y, r: PATCH.ciliates.r, kinds: i % 2 ? CILIATES : [...CILIATES, 'paramecium'] };
  }),
];
// The fungal traps: TRAP_CLUSTERS clusters of two hyphae round RINGS.traps, the
// inner one leaning one way and the outer one the other, so a way out on any
// bearing passes close to one; between clusters a cell can squeeze through.
export const TRAP_CLUSTERS = 12;
export const TRAP_HYPHAE = [
  { dr: -85, dt: -120, rel: 0.45, L: 420 },
  { dr: 90, dt: 150, rel: -0.5, L: 400 },
];
export function trapLayout() {
  const out = [];
  for (let k = 0; k < TRAP_CLUSTERS; k++) {
    const a = ((k + 0.25) / TRAP_CLUSTERS) * TAU + 0.03 * Math.sin(k * 2.7);
    const ca = Math.cos(a), sa = Math.sin(a);
    for (const h of TRAP_HYPHAE) {
      const r = RINGS.traps + h.dr;
      out.push({ cluster: k, x: ca * r - sa * h.dt, y: sa * r + ca * h.dt, ang: a + Math.PI / 2 + h.rel, L: h.L });
    }
  }
  return out;
}
// The backdoor: a Sphagnum leaf tip dipping into the pool, ~2.3 mm to the left
// of the start, its blade running on out of the pool (beyond the trap ring).
export const BACK_TIP = { x: -2300, y: -260 };
export const LEAF = { L: 2600, W: 560, ang: 0.22 };
/** Distance from (x, y) to the leaf's midline (tip to base). */
export function leafDist(x, y) {
  const c = Math.cos(LEAF.ang), s = Math.sin(LEAF.ang);
  const t = Math.max(0, Math.min(LEAF.L, -((x - BACK_TIP.x) * c + (y - BACK_TIP.y) * s)));
  return Math.hypot(x - BACK_TIP.x + c * t, y - BACK_TIP.y + s * t);
}
/** Room for Chaos and the portal at bearing a (clear of the leaf by a cell's width). */
export const portalRoom = (a) => {
  const [px, py] = ringPoint(RINGS.portal, a), [cx, cy] = ringPoint(RINGS.chaos, a);
  return leafDist(px, py) > LEAF.W / 2 + 450 && leafDist(cx, cy) > LEAF.W / 2 + 700;
};

export function buildWorld(seed = 7) {
  const r = rng(seed);
  const obstacles = [];
  const traps = trapLayout();
  const segOf = (o) => ({ x: o.x, y: o.y, ang: o.ang, L: o.L });
  // Kept clear of the slide's larger objects: the start, the leaf, the trap
  // hyphae (room to pass them), and the band where Chaos and the portal go.
  const clear = (x, y, rad, big) => {
    const d = Math.hypot(x, y);
    if (d < (big ? 560 : RINGS.warm) + rad) return false; // the warm-up: clear glass
    if (leafDist(x, y) < LEAF.W / 2 + 80 + rad) return false;
    if (traps.some((t) => segDist(x, y, segOf(t)) < 150 + rad)) return false;
    if (big && d > RINGS.chaos - 600 - rad && d < RINGS.portal + 400 + rad) return false;
    return obstacles.every((o) => o.layer !== 'focus' || (o.type === 'spiro' ? segDist(x, y, o) - o.W / 2 : Math.hypot(o.x - x, o.y - y) - Math.max(o.L, o.W) / 2) > rad + 25);
  };
  const disc = (count, r0, r1, make, big = false) => {
    for (let i = 0, tries = 0; i < count && tries < count * 40; tries++) {
      const a = r() * TAU, d = Math.sqrt(r.range((r0 * r0) / (r1 * r1), 1)) * r1;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const o = make(x, y, a, d);
      if (!clear(x, y, big ? 40 : Math.max(o.L, o.W) / 2, big)) continue;
      obstacles.push(o); i++;
    }
  };
  // Spirogyra: ~40 µm wide filaments, cells about 2–3 widths long, lying
  // roughly radially in focus (a corridor, never a wall across the way out).
  const spiro = (x, y, ang, L, D, layer) => ({
    type: 'spiro', x, y, ang, L, W: D, layer, seed: r(), cell: r.range(2.0, 3.0) * D, pitch: r.range(34, 46), strands: r() < 0.4 ? 2 : 3,
  });
  for (let i = 0, tries = 0; i < 9 && tries < 400; tries++) {
    const a = r() * TAU, inner = i < 5;
    const L = inner ? r.range(600, 800) : r.range(1100, 1700), d = inner ? r.range(860, 960) : r.range(RINGS.portal + 700, RINGS.field);
    const ang = a + r.range(-0.25, 0.25);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    // its whole length must be clear
    const c = Math.cos(ang), s = Math.sin(ang);
    let ok = true;
    for (let t = -L / 2; t <= L / 2 && ok; t += 60) ok = clear(x + c * t, y + s * t, 30, true) && PATCHES.every((p) => Math.hypot(x + c * t - p.x, y + s * t - p.y) > p.r + 60 || p.ring === 'start');
    if (!ok) continue;
    obstacles.push(spiro(x, y, ang, L, r.range(38, 44), 'focus')); i++;
  }
  // Pennate diatoms (Navicula / Pinnularia type), some seen in girdle view.
  const diatom = (x, y) => { const L = r.range(55, 125); return { type: 'diatom', x, y, ang: r() * TAU, L, W: L * r.range(0.16, 0.24), layer: 'focus', seed: r(), girdle: r() < 0.25 ? 1 : 0, glide: r.range(-2, 2) }; };
  disc(50, 300, RINGS.field, diatom);
  // Detritus flakes on the slide.
  disc(105, 300, RINGS.field, (x, y) => { const sz = r.range(18, 80); return { type: 'flake', x, y, ang: r() * TAU, L: sz, W: sz * r.range(0.6, 1), layer: 'focus', seed: r() }; });
  // Floating above the focal plane: blurred.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + r.range(-0.3, 0.3), d = i === 0 ? 150 : r.range(600, RINGS.field - 800);
    obstacles.push(spiro(Math.cos(a) * d, Math.sin(a) * d, r() * Math.PI, r.range(2000, 2800), r.range(40, 46), 'above'));
  }
  for (let i = 0; i < 48; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * RINGS.field;
    const s = r.range(30, 120);
    obstacles.push({ type: 'flake', x: Math.cos(a) * d, y: Math.sin(a) * d, ang: r() * TAU, L: s, W: s * r.range(0.5, 1), layer: 'above', seed: r() });
  }
  // Trap hyphae of a zoopagalean fungus (Stylopage / Zoopage type), which
  // catch amoebae on adhesive knobs: the hazard (see README), in clusters round
  // RINGS.traps.
  for (const t of traps) obstacles.push({ type: 'trap', x: t.x, y: t.y, ang: t.ang, L: t.L, W: 6, layer: 'focus', seed: r(), trap: true, cluster: t.cluster });
  // The backdoor: the Sphagnum leaf tip (its colliders: capsules down its axis, as wide as the blade).
  const leaf = (() => {
    const { L, W, ang } = LEAF;
    const cx = BACK_TIP.x - Math.cos(ang) * L / 2, cy = BACK_TIP.y - Math.sin(ang) * L / 2;
    const o = { type: 'leaf', x: cx, y: cy, ang, L, W, layer: 'focus', seed: 0.37 };
    const hw = (d) => (W / 2) * Math.pow(Math.min(1, d / L), 0.55);
    const ds = [30, 120, 300, 600, 1000, 1600, 2500];
    const at = (d) => [BACK_TIP.x - Math.cos(ang) * d, BACK_TIP.y - Math.sin(ang) * d];
    const capsules = [];
    for (let k = 0; k < ds.length - 1; k++) {
      const [ax, ay] = at(ds[k]), [bx, by] = at(ds[k + 1]);
      capsules.push({ ax, ay, bx, by, r: Math.max(8, hw((ds[k] + ds[k + 1]) / 2) * 0.92) });
    }
    o.collide = { capsules, circles: [] };
    return o;
  })();
  for (const o of obstacles) o.collide = colliders(o);
  obstacles.push(leaf);
  return { obstacles, rand: r, leaf };
}

function segDist(x, y, o) {
  const c = Math.cos(o.ang), s = Math.sin(o.ang), h = o.L / 2;
  const t = Math.max(-h, Math.min(h, (x - o.x) * c + (y - o.y) * s));
  return Math.hypot(x - o.x - c * t, y - o.y - s * t);
}
export { segDist };

function colliders(o) {
  if (o.layer !== 'focus' || o.type === 'trap') return { capsules: [], circles: [] };
  const c = Math.cos(o.ang), s = Math.sin(o.ang);
  if (o.type === 'spiro' || o.type === 'diatom') {
    const h = o.L / 2 - o.W / 2;
    return { capsules: [{ ax: o.x - c * h, ay: o.y - s * h, bx: o.x + c * h, by: o.y + s * h, r: o.W / 2 * (o.type === 'diatom' ? 0.9 : 1) }], circles: [] };
  }
  // A flake: a circle of most of its size (the ragged rim is passable); a
  // small one (under ~40 µm) the membrane flows over rather than snagging on.
  if (Math.min(o.L, o.W) < 40) return { capsules: [], circles: [] };
  return { capsules: [], circles: [{ x: o.x, y: o.y, r: Math.min(o.L, o.W) * 0.36 }] };
}

/**
 * Collect the collision shapes (refreshing gliding diatoms). The lists are kept
 * between calls (rebuilt only when the slide gains an object with colliders);
 * a gliding diatom's capsule is moved in place.
 */
export function worldColliders(world, dt) {
  const K = world.colCache;
  if (!K || K.n !== world.obstacles.length) {
    const capsules = [], circles = [], gliders = [];
    for (const o of world.obstacles) {
      capsules.push(...o.collide.capsules);
      circles.push(...o.collide.circles);
      if (o.type === 'diatom' && o.layer === 'focus' && o.glide) gliders.push(o);
    }
    world.colCache = { n: world.obstacles.length, capsules, circles, gliders, col: { capsules, circles } };
  }
  const C = world.colCache;
  if (dt) {
    for (const o of C.gliders) {
      // Raphid diatoms glide back and forth along their long axis.
      o.t = (o.t || 0) + dt;
      if (Math.sin(o.t * 0.05 + o.seed * 10) > 0.995) o.glide = -o.glide;
      const c = Math.cos(o.ang), s = Math.sin(o.ang), mx = c * o.glide * dt, my = s * o.glide * dt;
      o.x += mx; o.y += my;
      const k = o.collide.capsules[0];
      k.ax += mx; k.ay += my; k.bx += mx; k.by += my;
    }
  }
  return C.col;
}

/** The colliders within `pad` µm of (x, y) (or of a box), into `out` (lists reused). */
export function nearColliders(col, x0, y0, x1, y1, pad, out) {
  out.capsules.length = 0; out.circles.length = 0;
  const lx = x0 - pad, ly = y0 - pad, hx = x1 + pad, hy = y1 + pad;
  for (const k of col.capsules) {
    if (Math.max(k.ax, k.bx) + k.r < lx || Math.min(k.ax, k.bx) - k.r > hx || Math.max(k.ay, k.by) + k.r < ly || Math.min(k.ay, k.by) - k.r > hy) continue;
    out.capsules.push(k);
  }
  for (const c of col.circles) {
    if (c.x + c.r < lx || c.x - c.r > hx || c.y + c.r < ly || c.y - c.r > hy) continue;
    out.circles.push(c);
  }
  return out;
}

/** The trap hyphae as capsules {ax, ay, bx, by, r} (they glue, they do not block). */
/** The sticky part of each trap hypha: only what has grown, and only while its knobs are active. */
export function trapCapsules(world) {
  // sticky only once it has snapped shut on a membrane (o.grip, main.js), or while active when there is no fight
  return world.obstacles.filter((o) => o.type === 'trap' && !o.haustorium && !o.hidden && (o.grow ?? 1) > 0.02 && (o.grip !== undefined ? o.grip > 0 : (o.active ?? 1) > 0.5)).map((o) => {
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
