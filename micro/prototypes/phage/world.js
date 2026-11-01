// The water of the phage world, drawn in realistic false light by default (or as a Goodsell-style
// molecular illustration). Units: 1 = 10 nm. There is no floor and no wall; y points to the sunlit
// surface. The encounters are placed as you go (micro/design/encounter-pattern.md "Placed as you go";
// shared/director.js; main.js `director`), in water nobody has seen, a little ahead of whoever leads:
//
//  - Three host rods: Host B (a matching CRISPR spacer, a clay platelet beside it) and the wrong host
//    (a Gram-positive) are decoys, met one after the other; Host A (the receptor-rich host with the best
//    odds) is the way on, placed last with the amoeba beside it on guard. Until placed each is hidden
//    and parked far off. Each carries a bead forest of LPS, porins and membrane proteins (phage-beads.js).
//  - Scenery, there from the start, everywhere (the start's calm water and the flagellum excepted): humic
//    flocs that snag extended fibres, and UV sunfleck shafts (soft violet light: touch one and you are
//    damaged at once). Both are avoidable, so they can be anywhere.
//  - The bath of molecules (phage-beads.js), wrapped round each view, far cells all round.
import * as THREE from '../shared/vendor/three.module.min.js';
import { toonMaterial, inked, inkedInstanced, blobGeometry, goodsellShared, furShells } from '../shared/techniques/phage-goodsell.js';
import { createBath, createSprites, beadMesh, beadMaterial, beadTemplate, setSolids, setPhages, PALETTE } from '../shared/techniques/phage-beads.js';

export const START = new THREE.Vector3(0, 0, 0);
/** No walls or floor: beyond FIELD_R from the start a soft current carries you back (main.js). */
export const FIELD_R = 1080;
/** The old box, kept for callers that want one (the field's bounding box). */
export const BOUNDS = { x0: -FIELD_R, x1: FIELD_R, y0: -FIELD_R, y1: FIELD_R, z0: -FIELD_R, z1: FIELD_R };
/** Where hosts wait before the director places them: far off, hidden. */
export const PARKED = [0, -9000, 0];
/** The calm water round the start (no scenery hazard in it) and the backdoor flagellum's water. */
export const CALM_R = 200;
export const BACKDOOR = new THREE.Vector3(-150, 70, -60); // beside the start, in the calm warm-up water (not a challenge)
/** Evenly spread directions on a sphere (a Fibonacci lattice), rotated by `twist` so sets do not line up. */
export function shellDirs(n, twist = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), th = i * 2.399963 + twist;
    out.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return out;
}
/**
 * n points spread through the field's volume (radius r0..r1 round the start, uniform in volume, from a
 * Fibonacci lattice and a low-discrepancy radius: the same every visit), each passing ok(p, i).
 */
function scatter(n, r0, r1, twist, ok) {
  const out = [], dirs = shellDirs(n * 3, twist);
  for (let i = 0; i < dirs.length && out.length < n; i++) {
    const u = (i * 0.7548776662 + 0.31) % 1, r = Math.cbrt(r0 ** 3 + u * (r1 ** 3 - r0 ** 3));
    const p = dirs[(i * 7) % dirs.length].clone().multiplyScalar(r);
    if (ok(p, out.length)) out.push(p);
  }
  return out;
}
const flagD = (p) => { const d = p.clone().sub(BACKDOOR); return Math.hypot(d.y + d.x * 0.34, d.z); }; // from the flagellum's line (its helix along x, turned -0.35 about z)
/** The humic flocs: scenery all through the water, away from the start (x, y, z, radius). */
export const FLOCS = scatter(36, CALM_R + 40, 1020, 0.7, (p) => flagD(p) > 60).map((p, i) => [...p.toArray(), 22 + ((i * 13) % 9)]);
/** The UV sunfleck shafts: vertical columns of light all through the water (a, b: their ends; radius). */
export const UV_SHAFTS = scatter(26, CALM_R + 160, 1000, 2.1, (p, i) => flagD(p) > 120 && Math.hypot(p.x, p.z) > CALM_R + 50)
  .map((c, i) => ({ c, a: c.clone().add(new THREE.Vector3(0, -150, 0)), b: c.clone().add(new THREE.Vector3(0, 150, 0)), r: 30 + ((i * 7) % 10) }));
const _u = new THREE.Vector3();
/** How deep p is in a UV shaft: 0 outside, 1 inside (a soft edge), and which shaft. */
export function uvAt(p) {
  let best = 0, which = null;
  for (const s of UV_SHAFTS) {
    const y = Math.max(s.a.y, Math.min(s.b.y, p.y));
    const d = Math.hypot(p.x - s.c.x, y - p.y, p.z - s.c.z) - s.r;
    const k = 1 - Math.max(0, Math.min(1, (d + 4) / 8));
    if (k > best) { best = k; which = s; }
  }
  return { k: best, shaft: which };
}
/** Distance from p to the nearest UV shaft's light (its axis segment, minus its radius). */
export function uvClear(p) {
  let best = 1e9;
  for (const s of UV_SHAFTS) { const y = Math.max(s.a.y, Math.min(s.b.y, p.y)); best = Math.min(best, Math.hypot(p.x - s.c.x, y - p.y, p.z - s.c.z) - s.r); }
  return best;
}
/** Distance from p to the nearest humic floc's edge. */
export const flocClear = (p) => FLOCS.reduce((m, f) => Math.min(m, Math.hypot(p.x - f[0], p.y - f[1], p.z - f[2]) - f[3]), 1e9);
/** How far out p is from the start, in units of 10 nm. */
export const progressAt = (p) => _u.subVectors(p, START).length();
export const routeProgress = progressAt;

// ---- the director (shared/director.js): its settings and the encounters in order ----
// main.js adds place and met; route.test.mjs runs them without a browser. The depth haze closes in
// completely ~400 units past what the view frames (phage-goodsell.js), so a view counts as seeing its
// frustum out to 450 units past its focus; a phage drifts at ~30 units/s.
//   size     clearance; parts: what can be seen of it once placed (unseen water, out of every view)
//   min/maxAhead  how far ahead of the leader it goes; min/maxNear when they linger
// `side(dir)`: the host's long axis lies across `dir` (the way it is met); Host B's clay platelet and the
// amoeba sit to one side, along the xy-plane normal of dir (as placeHost and placePortal put them).
export const HOST_GEO = { A: { half: 78, r: 38 }, B: { half: 58, r: 36 }, W: { half: 46, r: 30 } };
export function sideOf(dir, out = new THREE.Vector3()) { out.set(-dir.y, dir.x, 0); if (out.lengthSq() < 1e-4) out.set(1, 0, 0); return out.normalize(); }
export const AMOEBA_R = 372;
/** Where the amoeba's centre goes for Host A at `pos`, met along `dir` (world.placePortal). */
export function amoebaAt(pos, dir, out = new THREE.Vector3()) { return out.copy(pos).addScaledVector(sideOf(dir, _u), -(AMOEBA_R + HOST_GEO.A.half + 60)).addScaledVector(dir, 60); }
/** Where Host B's clay platelet goes for Host B at `pos`, met along `dir` (world.placeHost). */
export function clayAt(pos, dir, out = new THREE.Vector3()) { return out.copy(pos).addScaledVector(sideOf(dir, _u), HOST_GEO.B.half + 70); }
export const DIRECTOR = {
  mode: '3d', cell: 45, seenDist: 380, nearSeen: 60, seed: 29,
  bounds: { x0: -FIELD_R, x1: FIELD_R, y0: -FIELD_R, y1: FIELD_R, z0: -FIELD_R, z1: FIELD_R },
  // ~6 s of drifting to warm up; a calm break of ~5 s of drifting clear of each decoy
  warmup: { sec: 6 }, calm: { sec: 5 }, linger: 6, moveSpeed: 6,
  // seen but not gone to: met once everyone is ~700 units off, or after 10 s in sight nearby
  passDist: 700, watchSec: 10, watchDist: 400,
};
/**
 * The encounters in order, for a leader whose position and heading `lead` ({ x, y, z, hx, hy, hz,
 * moving }) the caller keeps up to date: each is laid out from the way it is met (from the leader to the
 * spot), and while the leader is moving it goes within ~40° of their heading (in a 3D view, a spot off
 * to the side stays off the screen however far they go: the director then puts it farther ahead, past
 * what the view can make out).
 */
export function encounterSpecs(lead) {
  const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _a = new THREE.Vector3();
  const dirTo = (x, y, z) => { _d.set(x - lead.x, y - lead.y, z - lead.z); if (_d.lengthSq() < 1e-6) _d.set(1, 0, 0); return _d.normalize(); };
  const inField = (x, y, z, m = 0) => Math.hypot(x, y, z) < FIELD_R - m && ahead(x, y, z);
  const ahead = (x, y, z) => { if (!lead.moving || Math.hypot(lead.x, lead.y, lead.z) > FIELD_R - 450) return true; // (near the field's edge: wherever there is room)
    const dx = x - lead.x, dy = y - lead.y, dz = z - lead.z, l = Math.hypot(dx, dy, dz) || 1; return (dx * lead.hx + dy * lead.hy + dz * lead.hz) / l > 0.76; };
  // (the director's parts: [[x, z, r, y], ...])
  return [
    { id: 'B', size: 120, minAhead: 230, maxAhead: 700, minNear: 230, maxNear: 400,
      parts: (x, z, b, y) => { const c = clayAt(_p.set(x, y, z), dirTo(x, y, z), _a); return [[x, z, 105, y], [c.x, c.z, 52, c.y]]; },
      fits: (x, z, b, y) => inField(x, y, z, 120) },
    { id: 'W', size: 100, visible: 85, minAhead: 220, maxAhead: 680, minNear: 210, maxNear: 380, fits: (x, z, b, y) => inField(x, y, z, 100) },
    // the boss and the way on: Host A (its gold receptor, the glow's beacon) and the amoeba beside it
    { id: 'portal', size: 220, minAhead: 300, maxAhead: 800, minNear: 260, maxNear: 460, final: true,
      parts: (x, z, b, y) => { const c = amoebaAt(_p.set(x, y, z), dirTo(x, y, z), _a); return [[x, z, 150, y], [c.x, c.z, AMOEBA_R + 20, c.y]]; },
      fits: (x, z, b, y) => inField(x, y, z, 140) },
  ];
}
/** Encounters keep clear of the scenery hazards (a host is never placed in a UV shaft or a floc), the start's calm water and the flagellum. */
export function canPlace(x, z, r, { y }) {
  const p = _u.set(x, y, z);
  const h = Math.min(r, 140);
  return uvClear(p) > h + 30 && flocClear(p) > h + 20 && bystanderClear(p) > h + 10 && p.distanceTo(BACKDOOR) > 200 + h;
}
const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

// Homes: every host waits hidden and parked (PARKED) until the director places it (main.js): Host B and the
// wrong host as the decoys, Host A with the portal.
const HOSTS = [
  { id: 'A', name: 'Host A', home: [0, -9000, 0], angle: 0.1, half: 78, r: 38, patches: [[-48, -0.25], [8, 0.35], [52, -0.1], [-48, Math.PI - 0.25]],
    receptors: 'OmpC + LPS', defence: 'Restriction enzyme; CRISPR with no matching spacer', odds: 0.6, crispr: false, color: '#eef3c4', lps: '#86c06a', hidden: true },
  { id: 'B', name: 'Host B', home: PARKED, angle: -0.45, half: 58, r: 36, patches: [[-20, 0.2], [30, -0.3]],
    receptors: 'OmpC + LPS', defence: 'Restriction enzyme; CRISPR carrying a matching spacer', odds: 0.15, crispr: true, color: '#f1efc0', lps: '#9cc36a', hidden: true },
  { id: 'W', name: 'Wrong host', home: PARKED, angle: 0.85, half: 46, r: 30, patches: [],
    receptors: 'none (a Gram-positive: thick wall, no outer membrane, no OmpC)', defence: '—', odds: 0, crispr: false, wrong: true, color: '#ead9b8', lps: '#c9ad78', hidden: true },
];

const _bv = new THREE.Vector3(), _bw = new THREE.Vector3(), _by = new THREE.Vector3(0, 1, 0), _bz = new THREE.Vector3(0, 0, 1);
/**
 * Scenery: big bacteria of other kinds (not hosts: no receptor for this phage) hanging all through the
 * water, some huge, as things to move round and toward (the owner's look target). Solid: the bath
 * clears round them and a phage is pushed off them. Placed once, the same every visit, clear of the start.
 */
// (the look target, 2 Nov 2026: big cells always in sight, one or two near wherever you are: about 36 of
// them through the field, ~500 units apart, so a view that sees ~450 units into the haze holds a few)
const BY_TINTS = [['#082438', '#1a5e6c'], ['#08223e', '#1f527c'], ['#0a2a38', '#236266'], ['#0b2240', '#255282']];
export const BYSTANDERS = (() => {
  const out = [], dirs = shellDirs(160, 2.0);
  const capD = (p, b) => { // distance from p to bystander b's capsule
    _bv.set(p.x - b.home[0], p.y - b.home[1], p.z - b.home[2]).applyAxisAngle(_bz, -b.angle);
    return Math.hypot(_bv.x - Math.max(-b.half, Math.min(b.half, _bv.x)), _bv.y, _bv.z) - b.r;
  };
  // two composed for the opening view (it looks down -z from the start): a huge one at the lower right, a
  // smaller one farther off at the upper left; the rest evenly through the field's volume
  const fixed = [[120, -60, -180, 0.3, 150, 60], [-300, 140, -380, 2.4, 110, 44]];
  for (let i = 0; i < dirs.length + fixed.length && out.length < 36; i++) {
    const u = (i * 0.618034 + 0.2) % 1, R = Math.cbrt(300 ** 3 + u * (1030 ** 3 - 300 ** 3));
    const fx = fixed[i];
    const p = fx ? new THREE.Vector3(fx[0], fx[1], fx[2]) : dirs[(i * 53) % dirs.length].clone().multiplyScalar(R);
    const k = out.length, big = k % 3 === 0;
    const b = { id: `S${k}`, name: 'a bacterium of another kind', bystander: true, home: p.toArray(), angle: fx ? fx[3] : (i * 1.7) % 3.1,
      half: fx ? fx[4] : big ? 130 + (k % 4) * 22 : 60 + (k % 5) * 16, r: fx ? fx[5] : big ? 60 + (k % 3) * 9 : 34 + (k % 4) * 6, patches: [], color: '#e8eedc', lps: '#86b0a0', tint: BY_TINTS[k % BY_TINTS.length] };
    if (capD(START, b) < 110 || capD(BACKDOOR, b) < 110) continue;
    if (out.some((o) => p.distanceTo(_bw.set(...o.home)) < o.half + o.r + b.half + b.r + 30)) continue;
    out.push(b);
  }
  return out;
})();
/** Distance from p to the nearest bystander's surface (capsule, its long axis turned `angle` about z, then tilt about y). */
export function bystanderClear(p) {
  let best = 1e9;
  for (const b of BYSTANDERS) {
    _bv.set(p.x - b.home[0], p.y - b.home[1], p.z - b.home[2]).applyAxisAngle(_by, -(b.tilt || 0)).applyAxisAngle(_bz, -b.angle);
    best = Math.min(best, Math.hypot(_bv.x - Math.max(-b.half, Math.min(b.half, _bv.x)), _bv.y, _bv.z) - b.r);
  }
  return best;
}


function proceduralEnvelope() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2dc'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 3 + Math.random() * 3;
    g.fillStyle = `hsl(${55 + Math.random() * 40},${40 + Math.random() * 20}%,${74 + Math.random() * 12}%)`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const FAR_NOISE = /* glsl */`
float fh3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float fn3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fh3(i), fh3(i + vec3(1,0,0)), f.x), mix(fh3(i + vec3(0,1,0)), fh3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(fh3(i + vec3(0,0,1)), fh3(i + vec3(1,0,1)), f.x), mix(fh3(i + vec3(0,1,1)), fh3(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
/** Merge indexed geometries (position, normal, uv) into one. */
function mergeIndexed(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3); uv.set(g.attributes.uv.array, ov * 2);
    for (let i = 0; i < g.index.count; i++) idx[oi + i] = g.index.getX(i) + ov;
    ov += g.attributes.position.count; oi += g.index.count; g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  return m;
}
/**
 * A mesh that never moves in its cell's frame gets a bounding sphere once (padded for the lumps, the fur and the
 * ink hull's push-out) and is culled with the cell when wholly off screen, in every split view.
 */
function cullWith(o, pad) {
  for (const m of o.ink ? [o, o.ink] : [o]) {
    if (!m.geometry) continue;
    if (!m.isInstancedMesh && !m.geometry.isInstancedBufferGeometry && m.geometry.boundingSphere == null) m.geometry.computeBoundingSphere();
    if (m.geometry.isInstancedBufferGeometry && !m.isInstancedMesh && !m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    if (m.isInstancedMesh) { m.computeBoundingSphere(); m.boundingSphere.radius += pad; }
    else if (m.geometry.boundingSphere && !m.userData.padded) { m.geometry.boundingSphere = m.geometry.boundingSphere.clone(); m.geometry.boundingSphere.radius += pad; m.userData.padded = true; }
    m.frustumCulled = true;
  }
}

export function createWorld(scene) {
  const envTex = proceduralEnvelope();
  const world = { hosts: [], proteins: [], molecules: [], t: 0, opts: { hostBrownian: true, crowd: true } };

  // --- hosts ---
  // The grab targets, as bead clusters: matching receptors have three gold lobes with dark sockets on a
  // beaded stalk; non-matching proteins two violet lobes (shape tells them apart in greyscale too).
  const proteinBeads = (lobes, c, c2) => {
    const out = [], col = (h) => new THREE.Color(h);
    // (after MP-V04: a pale beige beaded stalk under the coloured lobes)
    for (const [y, r] of [[1.0, 1.15], [2.9, 1.0], [4.7, 0.95]]) out.push({ p: [0, y, 0], r, c: col('#b2a58a'), g: col('#c8b89a') });
    for (let k = 0; k < lobes; k++) {
      const a = (k * Math.PI * 2) / lobes, x = Math.cos(a) * 2.3, z = Math.sin(a) * 2.3;
      for (let j = 0; j < 7; j++) {
        const u = Math.sin(j * 2.4 + k) * 1.3, v = Math.cos(j * 1.7 + k) * 1.3, w = Math.sin(j * 3.1) * 1.1;
        out.push({ p: [x + u, 7 + w, z + v], r: 1.25 - (j % 3) * 0.15, c: col(c).offsetHSL(0, 0, (j % 3) * 0.04), g: col(c2) });
      }
      out.push({ p: [x * 1.05, 9.1, z * 1.05], r: 0.8, c: col('#3a3048'), g: col('#4b4055') });
    }
    return out;
  };
  const goodProtein = proteinBeads(3, '#f2b03c', '#ffd264'), badProtein = proteinBeads(2, '#9a6ccc', '#aa84cc');
  // The surface proteins of the look target: lumpy blue or violet "flowers" (four lobes of beads) on a thin
  // pale stalk, standing out of the fur. Decoration (the grab targets are below).
  const flower = (seed, c, c2) => {
    const out = [], col = (h) => new THREE.Color(h), rnd = ((x) => () => { x = (x * 16807) % 2147483647; return x / 2147483647; })(seed * 7919 + 13);
    for (let k = 0; k < 13; k++) out.push({ p: [Math.sin(k * 0.4 + seed) * 0.2, 0.3 + k * 0.48, 0], r: 0.4, c: col('#7e9cb8'), g: col('#c8b89a') });
    const lobes = 3 + (seed % 2);
    for (let k = 0; k < lobes; k++) {
      const a = (k * Math.PI * 2) / lobes + seed, x = Math.cos(a) * 1.9, z = Math.sin(a) * 1.9;
      for (let j = 0; j < 9; j++) {
        const u = (rnd() - 0.5) * 2.2, v = (rnd() - 0.5) * 2.2, w = (rnd() - 0.5) * 1.8;
        out.push({ p: [x + u * 0.6, 7.2 + w * 0.6, z + v * 0.6], r: 0.95 + rnd() * 0.35, c: col(c).offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.1), g: col(c2) });
      }
    }
    for (let j = 0; j < 5; j++) out.push({ p: [(rnd() - 0.5) * 1.2, 8.6 + rnd() * 0.8, (rnd() - 0.5) * 1.2], r: 0.9, c: col(c).offsetHSL(0, 0, 0.06), g: col(c2) });
    return out;
  };
  const FLOWERS = [flower(1, '#5c80d0', '#9a6ccc'), flower(2, '#7a78d4', '#aa84cc'), flower(3, '#6aa0d8', '#8a9ee8')];
  const forestMat = beadMaterial({ sat: 0.95 });
  const flowerMat = beadMaterial({ sat: 0.8 }); // (soft, a little desaturated: the target's surface proteins)
  const piliMat = toonMaterial({ color: '#8fb8bc', mottle: 0.1, fl: { color: '#2e5a6a', color2: '#4e7c8a', keep: 0, trans: 0.9, spec: 0.6, scale: 0.05 } });
  const receptorMat = beadMaterial({ glow: 0.1, glowColor: '#ffb43a' }); // the gold receptors glow a very little: the thing to find
  world.bystanders = [];
  const flOnly = [], gsOnly = []; // what only false light draws (the fur), what only the other looks draw (the bead forest)
  for (const def of [...HOSTS, ...BYSTANDERS]) {
    const g = new THREE.Group();
    const by = !!def.bystander;
    // false light (the look target): a smooth, wet, lumpy membrane, deep teal-blue with pale crests, under a fine
    // pale fur (phage-goodsell.js membraneLight, furShells); the Gram-positive decoy duller and greener
    const tint = def.tint || ['#082438', '#1a5e6c'];
    const mat = toonMaterial({ color: def.color, wobble: 1.0, wobbleFreq: 0.045, map: envTex, mapRepeat: [6, 3], mottle: 0.2,
      lumps: { amp: def.wrong ? 1.4 : Math.max(3.0, def.r * 0.1), freq: (0.07 * 38) / def.r },
      fl: def.wrong ? { color: '#244a40', color2: '#5e7444', keep: 0, trans: 0.6, bump: 1.4, spec: 0.55 }
        : { color: tint[0], color2: tint[1], keep: 0, trans: 0.9, bump: 1.1, spec: 1.0 } });
    const geo = new THREE.CapsuleGeometry(def.r, def.half * 2, 14, 56, Math.max(8, Math.round(def.half / 4)));
    geo.rotateZ(Math.PI / 2);
    const body = inked(geo, mat, { width: 1.3 });
    g.add(body);
    const fur = furShells(geo, mat, def.wrong ? { layers: 6, len: 2.2, density: 0.9, cover: 0.5, color: '#4e6a48', tip: '#a8b88a' }
      : { layers: 9, len: 4.4 * Math.sqrt(def.r / 38), density: 1.1 });
    g.add(fur); flOnly.push(fur);
    const host = { ...def, home0: def.home.slice(), group: g, body, mat, fur, pos: new THREE.Vector3(...def.home), vel: new THREE.Vector3(), ang: def.angle, angVel: 0, patchList: [], rings: [] };
    const pt = (u, phi, out) => out.set(u, Math.cos(phi) * def.r, Math.sin(phi) * def.r);
    const surf = (u, phi, out, n) => {
      // a point on the capsule (cylinder part or caps) and its normal, host-local
      if (Math.abs(u) <= def.half) { n.set(0, Math.cos(phi), Math.sin(phi)); return pt(u, phi, out); }
      const s = Math.sign(u), over = Math.min(def.r, Math.abs(u) - def.half), a = Math.asin(over / def.r);
      n.set(s * Math.sin(a), Math.cos(a) * Math.cos(phi), Math.cos(a) * Math.sin(phi));
      return out.set(s * def.half, 0, 0).addScaledVector(n, def.r);
    };
    const n = new THREE.Vector3();
    // The Goodsell looks' surface forest (phage-beads.js impostors, static in the host's frame): a dense lawn
    // of LPS chains all round the cell, membrane proteins and porins scattered through it. The Gram-positive
    // decoy has no outer membrane: a duller, sparser fuzz of wall polymers instead. (False light draws the
    // fur instead: at true scale the bead lawn read as a speckled mosaic.) Scenery cells have none.
    const area = 2 * Math.PI * def.r * 2 * def.half + 4 * Math.PI * def.r * def.r;
    const forest = (template, count, scale, tint, upright = true) => {
      const m = beadMesh(template, count, { material: forestMat });
      for (let i = 0; i < count; i++) {
        const u = rand(-def.half - def.r * 0.95, def.half + def.r * 0.95), phi = rand(-Math.PI, Math.PI);
        surf(u, phi, _p, n);
        _q.setFromUnitVectors(UP, n).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * 6));
        if (!upright) _q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, rand(-0.5, 0.5)));
        m.set(i, _p.addScaledVector(n, -0.6), _q, rand(...scale), tint ? _c.copy(tint).offsetHSL(rand(-0.03, 0.03), 0, rand(-0.06, 0.06)) : null);
      }
      m.commit(); m.fitBounds(); g.add(m.mesh); gsOnly.push(m.mesh);
      return m;
    };
    if (!by) {
      const lc = def.wrong ? new THREE.Color('#7f9a4a') : new THREE.Color('#9cb6d6'); // (MP-R22: the Gram-positive's duller olive fuzz; the others a pale blue fur)
      const nL = Math.round(area / (def.wrong ? 34 : 15));
      forest(beadTemplate('lps', 1), Math.ceil(nL / 2), def.wrong ? [0.6, 0.8] : [0.55, 0.8], lc);
      forest(beadTemplate('lps', 2), Math.floor(nL / 2), def.wrong ? [0.6, 0.8] : [0.55, 0.8], lc);
    }
    // the protein flowers standing out of the fur on their stalks (sparse: a few dozen to a side), and a few
    // pili or flagella curving off into the water (one merged tube geometry)
    if (!def.wrong) {
      const nf = Math.round(area / (by ? 1500 : 1200));
      for (let v = 0; v < FLOWERS.length; v++) {
        const cnt = Math.round(nf / FLOWERS.length);
        const fm = beadMesh(FLOWERS[v], cnt, { material: flowerMat });
        for (let i = 0; i < cnt; i++) {
          surf(rand(-def.half - def.r * 0.8, def.half + def.r * 0.8), rand(-Math.PI, Math.PI), _p, n);
          _q.setFromUnitVectors(UP, n).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * 6)).multiply(new THREE.Quaternion().setFromAxisAngle(Z, rand(-0.25, 0.25)));
          fm.set(i, _p.addScaledVector(n, 0.5), _q, rand(1.15, 1.75) * Math.sqrt(def.r / 40), null);
        }
        fm.commit(); fm.fitBounds(); g.add(fm.mesh);
      }
    }
    const tubes = [];
    for (let i = 0; i < (by ? 4 : 3); i++) {
      surf(rand(-def.half, def.half), rand(-Math.PI, Math.PI), _p, n);
      const pts = [_p.clone()], dir = n.clone(), side = new THREE.Vector3().crossVectors(n, Z).normalize();
      let q = _p.clone();
      for (let k = 1; k < 8; k++) { dir.addScaledVector(side, Math.sin(k * 0.9 + i) * 0.35).normalize(); q = q.clone().addScaledVector(dir, (by ? 26 : 18) + k * 2); pts.push(q); }
      tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, by ? 0.7 : 0.55, 6));
    }
    g.add(inked(mergeIndexed(tubes), piliMat, { width: 0.5 }));
    if (!def.wrong && !by) {
      forest(beadTemplate('mprot', 3, null, 1.6), Math.round(area / 170), [1.2, 1.9], null, false);
      forest(beadTemplate('porin', 4, null, 1.5), Math.round(area / 160), [1.0, 1.4], null);
      forest(beadTemplate('globule', 5, PALETTE.teal, 1.8), Math.round(area / 300), [1.3, 2.0], null, false);
      forest(beadTemplate('globule', 8, PALETTE.blue, 1.8), Math.round(area / 380), [1.5, 2.3], null, false);
    } else if (def.wrong) forest(beadTemplate('globule', 6, PALETTE.olive), Math.round(area / 300), [0.9, 1.3], null, false);
    for (const o of g.children) cullWith(o, 8);
    if (by) {
      g.position.copy(host.pos); g.rotation.z = host.ang; g.rotation.y = def.tilt || 0;
      scene.add(g); world.bystanders.push(host);
      continue;
    }
    // OmpC receptor patches
    if (def.patches.length) {
      const per = 22;
      const omp = beadMesh(beadTemplate('porin', 7), def.patches.length * per, { material: flowerMat });
      let k = 0;
      for (const [u0, phi0] of def.patches) {
        surf(u0, phi0, _p, n);
        host.patchList.push({ local: _p.clone(), normal: n.clone(), radius: 11 });
        for (let i = 0; i < per; i++) {
          const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 9;
          surf(u0 + Math.cos(a) * rr, phi0 + (Math.sin(a) * rr) / def.r, _p, n);
          _q.setFromUnitVectors(UP, n);
          omp.set(k++, _p, _q, rand(1.0, 1.3), _c.set(i % 3 ? '#a8b8e8' : '#c0cce8'));
        }
        // data overlay ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(12, 0.55, 6, 32), new THREE.MeshBasicMaterial({ color: '#ffe14a', depthTest: false, transparent: true, opacity: 0.9 }));
        surf(u0, phi0, ring.position, n);
        ring.position.addScaledVector(n, 3);
        ring.quaternion.setFromUnitVectors(Z, n);
        ring.renderOrder = 10; ring.visible = false;
        g.add(ring); host.rings.push(ring);
      }
      omp.commit(); omp.fitBounds(); g.add(omp.mesh);
    }
    // Prominent binding targets remain visible without the observer overlay.
    // Matching trimers have three gold lobes; non-matching proteins have two violet lobes.
    const sites = [
      ...def.patches.map(([u, phi]) => ({ u, phi, compatible: true })),
      ...[[-def.half * 0.8, 2.25], [0, Math.PI], [def.half * 0.65, 2.8], [0, -0.35]]
        .map(([u, phi]) => ({ u, phi, compatible: false })),
    ];
    // One instanced mesh per kind and host (two draws, not a dozen meshes per protein).
    for (const compatible of [true, false]) {
      const list = sites.filter((x) => x.compatible === compatible);
      const mesh = beadMesh(compatible ? goodProtein : badProtein, list.length, { material: compatible ? receptorMat : forestMat });
      list.forEach((site, k) => {
        surf(site.u, site.phi, _p, n);
        const protein = { id: `${def.id}-${world.proteins.filter((q) => q.host === host).length}`, host, compatible,
          surface: _p.clone(), normal: n.clone(), local: _p.clone().addScaledVector(n, 7) };
        mesh.set(k, _p, _q.setFromUnitVectors(UP, n), 1);
        world.proteins.push(protein);
      });
      mesh.commit(); mesh.fitBounds(); g.add(mesh.mesh);
    }
    // The host's instanced meshes (LPS forest, OmpC patches, grab proteins) never move in the host's
    // frame, so each gets a bounding sphere once (padded for the ink hull's push-out) and is culled
    // with the host when it is wholly off screen, in every split view, as the capsule body already is.
    for (const o of g.children) cullWith(o, 8);
    g.position.copy(host.pos); g.rotation.z = host.ang;
    g.visible = !def.hidden;
    scene.add(g);
    world.hosts.push(host);
  }

  /** Host-local position of a world point. */
  world.toLocal = (h, p, out = new THREE.Vector3()) => {
    out.subVectors(p, h.pos);
    const c = Math.cos(-h.ang), s = Math.sin(-h.ang);
    return out.set(out.x * c - out.y * s, out.x * s + out.y * c, out.z);
  };
  world.toWorld = (h, l, out = new THREE.Vector3()) => {
    const c = Math.cos(h.ang), s = Math.sin(h.ang);
    return out.set(l.x * c - l.y * s + h.pos.x, l.x * s + l.y * c + h.pos.y, l.z + h.pos.z);
  };
  world.dirToWorld = (h, l, out = new THREE.Vector3()) => {
    const c = Math.cos(h.ang), s = Math.sin(h.ang);
    return out.set(l.x * c - l.y * s, l.x * s + l.y * c, l.z);
  };
  /** Signed distance to a host's envelope surface, with the outward normal (world). */
  world.sdHost = (h, p, nOut) => {
    const l = world.toLocal(h, p, _v);
    const cx = Math.max(-h.half, Math.min(h.half, l.x));
    const d = _p.set(l.x - cx, l.y, l.z);
    const len = d.length() || 1e-6;
    if (nOut) world.dirToWorld(h, d.multiplyScalar(1 / len), nOut);
    return len - h.r;
  };
  /** The nearest host and its distance. */
  world.nearestHost = (p) => {
    let best = null, bd = 1e9;
    for (const h of world.hosts) { if (h.burst || h.hidden) continue; const d = world.sdHost(h, p); if (d < bd) { bd = d; best = h; } }
    return { host: best, d: bd };
  };
  /** The receptor patch under a world point on host h, or null. */
  world.patchAt = (h, p) => {
    const l = world.toLocal(h, p, new THREE.Vector3());
    for (const pt of h.patchList) if (l.distanceTo(pt.local) < pt.radius + 9) return pt;
    return null;
  };
  /** Project a world point onto host h's surface (with a lift along the normal). */
  world.projectToHost = (h, p, lift = 0, out = new THREE.Vector3(), nOut = new THREE.Vector3()) => {
    world.sdHost(h, p, nOut);
    const d = world.sdHost(h, p);
    return out.copy(p).addScaledVector(nOut, -d + lift);
  };

  // --- clay / peat platelet ---
  const clay = { group: new THREE.Group(), pos: new THREE.Vector3(...PARKED).add(new THREE.Vector3(0, 110, 0)), half: new THREE.Vector3(40, 5.5, 26), ang: 0.14 };
  const clayCols = ['#a98b6a', '#8f7556', '#b89b78'];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.BoxGeometry(80 - i * 9, 3.4, 52 - i * 6, 8, 1, 6);
    const b = inked(g, toonMaterial({ color: clayCols[i], wobble: 0.7, wobbleFreq: 0.08, mottle: 0.35, fl: { color: '#3c4440', color2: '#6a6050', keep: 0, trans: 0.3, bump: 1.2, spec: 0.3, scale: 0.08 } }), { width: 1.1 });
    b.position.set(i * 3 - 3, (i - 1) * 3.6, i * 2);
    b.rotation.y = (i - 1) * 0.05;
    clay.group.add(b);
  }
  // humic strands draped on it
  const strandMat = toonMaterial({ color: '#c9a46a', mottle: 0.25, fl: { color: '#8a7a50', color2: '#c8b070', keep: 0.2, trans: 0.6 } });
  for (let i = 0; i < 4; i++) {
    const pts = []; let x = rand(-45, -10), y = rand(-2, 8), z = rand(-20, 20);
    for (let k = 0; k < 8; k++) { pts.push(new THREE.Vector3(x, y, z)); x += rand(8, 14); y += rand(-4, 4); z += rand(-5, 5); }
    clay.group.add(inked(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 1.3, 6), strandMat, { width: 0.9 }));
  }
  clay.group.position.copy(clay.pos); clay.group.rotation.z = clay.ang;
  scene.add(clay.group);
  world.clay = clay;
  world.sdClay = (p) => {
    const l = _v.subVectors(p, clay.pos);
    const c = Math.cos(-clay.ang), s = Math.sin(-clay.ang);
    const x = l.x * c - l.y * s, y = l.x * s + l.y * c;
    const qx = Math.abs(x) - clay.half.x, qy = Math.abs(y) - clay.half.y, qz = Math.abs(l.z) - clay.half.z;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.hypot(ox, oy, oz) + Math.min(Math.max(qx, qy, qz), 0);
  };

  // --- the amoeba's edge ---
  // (hidden, far away, until the portal is placed: then it waits beside Host A, on guard)
  const amoeba = { center: new THREE.Vector3(0, 9000, 0), r: 372, reach: 0, tip: new THREE.Vector3(), base: new THREE.Vector3(), cup: 0, target: null };
  const AMOEBA_FL = { color: '#5b6fb0', color2: '#9ab0d8', keep: 0.15, trans: 1, bump: 0.7, spec: 0.7, scale: 0.02 };
  const amoebaMat = toonMaterial({ color: '#d7c3dc', wobble: 22, wobbleFreq: 0.008, mottle: 0.25, fl: AMOEBA_FL });
  const amBody = inked(new THREE.SphereGeometry(amoeba.r, 72, 48), amoebaMat, { width: 1.4, wobble: 22, wobbleFreq: 0.008, color: '#4a3550' });
  const amGroup = new THREE.Group();
  amGroup.position.copy(amoeba.center);
  amGroup.add(amBody);
  amGroup.visible = false;
  scene.add(amGroup);
  // granules in its ectoplasm, seen through the edge
  const granGeo = blobGeometry([{ p: [0, 0, 0], r: 3, c: '#ffffff' }, { p: [2.4, 1, 0], r: 2.2, c: '#ffffff' }], 1);
  const gran = inkedInstanced(granGeo, toonMaterial({ color: '#b48fc0', fl: { color: '#8a7ad0', color2: '#c0b0f0', keep: 0.3, trans: 0.6 } }), 70, { width: 0.8 });
  for (let i = 0; i < 70; i++) {
    _p.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(amoeba.r - rand(14, 40));
    _m.compose(_p, _q.random(), _s.setScalar(rand(0.7, 1.6)));
    gran.setMatrixAt(i, _m);
    gran.setColorAt(i, _c.set(['#b48fc0', '#9fb2d8', '#d6a2b6'][i % 3]));
  }
  amGroup.add(gran);
  const podMat = toonMaterial({ color: '#d9c4de', wobble: 2.5, wobbleFreq: 0.06, mottle: 0.25, fl: { ...AMOEBA_FL, scale: 0.08 } });
  const pod = inked(new THREE.CapsuleGeometry(1, 1, 8, 20), podMat, { width: 1.2, color: '#4a3550' });
  pod.visible = false;
  scene.add(pod);
  const lipGeo = new THREE.CapsuleGeometry(4.5, 16, 6, 12);
  const lips = [0, 1].map(() => { const l = inked(lipGeo, podMat, { width: 1.2, color: '#4a3550' }); l.visible = false; scene.add(l); return l; });
  const vacuole = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), toonMaterial({ color: '#efe2f2', opacity: 0.45, fl: { color: '#9ab8e0', keep: 0, trans: 1 } }));
  vacuole.visible = false;
  scene.add(vacuole);
  amoeba.mesh = amBody; amoeba.group = amGroup; amoeba.pod = pod; amoeba.lips = lips; amoeba.vacuole = vacuole;
  /** See into the amoeba (while it digests you): 1 opaque .. lower = translucent. */
  amoeba.see = (a) => {
    const tr = a < 0.99;
    for (const m of [amoebaMat, amBody.ink.material]) { m.uniforms.uOpacity.value = a; m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = m.transparent !== m.userData.tr; m.userData.tr = tr; }
    amBody.renderOrder = tr ? 2 : 0;
  };
  /** Attack posture: 0 calm .. 1 rearing to strike (the lobe darkens toward a flushed rose). */
  amoeba.posture = (k) => {
    podMat.uniforms.uDark.value = k * 0.7;
    podMat.uniforms.uEmissive.value = k * 0.25;
    amoeba.swell = k;
  };
  podMat.uniforms.uDarkColor.value.set('#b0335a');
  world.amoeba = amoeba;
  world.sdAmoeba = (p) => p.distanceTo(amoeba.center) - amoeba.r;
  /** Pseudopod shape: from base toward tip; open 0..1 opens the cup lips. */
  world.drawPod = (reach, base, tip, open, show = true) => {
    pod.visible = lips[0].visible = lips[1].visible = show && reach > 1;
    if (!pod.visible) return;
    const dir = _v.subVectors(tip, base); const len = dir.length(); dir.normalize();
    const r = (11 - Math.min(4, len * 0.01)) * (1 + 0.4 * (amoeba.swell || 0));
    pod.position.lerpVectors(base, tip, 0.5);
    pod.quaternion.setFromUnitVectors(UP, dir);
    // CapsuleGeometry(1, 1) is 3 long: stretched, the caps become soft ellipsoids, like a limb of cytoplasm
    pod.scale.set(r, Math.max(0.2, len / 3), r);
    const side = _p.crossVectors(dir, Z).normalize();
    lips.forEach((l, i) => {
      const s = i ? 1 : -1;
      const a = (0.25 + 0.9 * open) * s;
      l.position.copy(tip).addScaledVector(side, s * (6 + 4 * open)).addScaledVector(dir, 4 + 3 * Math.max(0, open - 1));
      l.scale.setScalar(1 + 0.35 * Math.max(0, open - 1));
      l.quaternion.setFromUnitVectors(UP, dir.clone().applyAxisAngle(Z, a));
    });
  };

  // --- the backdoor: a flagellum of the Level 5 bacterium sweeping through open water above the hosts ---
  // (20 nm wide; a rotating helix reads as a wave travelling along it)
  const flag = new THREE.Group();
  const fpts = [];
  for (let i = 0; i <= 160; i++) { const x = -260 + i * 3.4; const a = i * 0.21; fpts.push(new THREE.Vector3(x, Math.cos(a) * 9, Math.sin(a) * 9)); }
  const flagMat = toonMaterial({ color: '#9fd0c8', mottle: 0.15, fl: { color: '#4f9fb0', color2: '#a0e0e0', keep: 0.2, trans: 0.8, spec: 0.6 } });
  flag.add(inked(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fpts), 320, 1.3, 6), flagMat, { width: 0.8 }));
  const spin = new THREE.Group(); spin.add(flag);
  spin.position.copy(BACKDOOR); spin.rotation.z = -0.35;
  scene.add(spin);
  world.backdoor = { pos: BACKDOOR, radius: 55, group: spin, flag };

  // --- the bath of molecules (phage-beads.js): thousands of bead-cluster impostors that never touch
  // the CPU. Each bath wraps round a centre in its own box, so the water is full in every direction
  // the camera can turn, and round every split view (world.viewBath sets the centre per view). The
  // near bath is dense and detailed; the mid bath fills out to the haze with fewer, larger molecules.
  // (the owner's look target, 2 Nov 2026: big cells to move round and toward, not a uniform sea of
  // particles: the crowd thinned to about a quarter, varied in size, most of it in loose clumps)
  // (false light, `fl`: the share of each species it draws. The look target's water is mostly clear: a few
  // soft blue, violet and gold molecules and fine motes; no green dimers, no yellow chains, no humic tangles)
  const NEAR = [
    { kind: 'small', n: 260, s: [0.8, 1.4], variants: 3, fl: 0.3 },
    { kind: 'globule', n: 90, s: [0.9, 2.0], pal: PALETTE.violet, fl: 0.2 },
    { kind: 'globule', n: 70, s: [0.7, 1.6], pal: PALETTE.teal, seed: 3, fl: 0.15 },
    { kind: 'dimer', n: 45, s: [0.8, 1.5], fl: 0 },
    { kind: 'chain', n: 50, s: [0.9, 1.4], fl: 0 },
    { kind: 'globule', n: 40, s: [0.8, 1.8], pal: PALETTE.periwinkle, seed: 5, fl: 0.3 },
    { kind: 'humic', n: 24, s: [0.9, 1.6], fl: 0 },
    { kind: 'complex', n: 14, s: [1.0, 1.8], fl: 0.15 },
    { kind: 'globule', n: 14, s: [0.9, 1.5], pal: PALETTE.gold, seed: 11, fl: 1, gs: 0 },
  ];
  const MID = [
    { kind: 'globule', n: 170, s: [2.0, 3.6], pal: PALETTE.violet, seed: 7, fl: 0.12 },
    { kind: 'globule', n: 130, s: [1.8, 3.2], pal: PALETTE.teal, seed: 9, fl: 0.1 },
    { kind: 'dimer', n: 80, s: [2.0, 3.2], seed: 4, fl: 0 },
    { kind: 'small', n: 160, s: [2.2, 3.0], seed: 6, fl: 0.12 },
    { kind: 'humic', n: 40, s: [2.0, 3.0], seed: 8, fl: 0 },
    { kind: 'complex', n: 24, s: [1.8, 3.0], seed: 2, fl: 0.25 },
  ];
  const nearBath = createBath(NEAR, { half: 115, jitter: 0.9, spin: 0.4, keepR: 26, seed: 1, detail: 2, clump: 0.65, clumps: 9, flSat: 0.5 });
  const midBath = createBath(MID, { half: 330, jitter: 1.4, spin: 0.25, keepR: 70, inner: 105, seed: 2, sat: 0.85, clump: 0.7, clumps: 14, flSat: 0.45 });
  const baths = [nearBath, midBath];
  for (const b of baths) scene.add(b.group);
  world.baths = baths;
  /** Before drawing a view: wrap the baths round that view's centre (and the camera, for the lens clearing). */
  world.viewBath = (center) => { for (const b of baths) b.setCenter(center); if (sprites) sprites.setCenter(center); moteMat.uniforms.uCenter.value.copy(center); farMat.uniforms.uCenter.value.copy(center); };
  // MP-V07 (delivered): the far layer of molecule sprites beyond the baths, in false light
  let sprites = null;
  world.setSprites = (tex) => { if (sprites) return; sprites = createSprites(tex, { n: 1400, fl: 0.18 }); scene.add(sprites.mesh); sprites.setLevel(world.level ?? 2); sprites.setStyle(world.fl ?? true); };
  /** The phages' wake spheres: [{ p, r }]. */
  world.setWake = (list) => { for (const b of baths) setPhages(b.material, list); };
  world.setCrowdLevel = (level) => { world.level = level; for (const b of baths) b.setLevel(level); if (sprites) sprites.setLevel(level); };
  world.bathBeads = () => baths.reduce((a, b) => a + (b.group.visible ? b.beads : 0), 0);

  // --- humic flocs (after MP-R21): a shell of loose sticky tangles round the start, turning slowly (one
  // instanced draw); extended fibres snag in them ---
  const flocMat = beadMaterial({ sat: 0.9 });
  const flocMesh = beadMesh(beadTemplate('floc', 11), FLOCS.length, { material: flocMat, dynamic: true });
  scene.add(flocMesh.mesh);
  world.flocs = FLOCS.map(([x, y, z, r]) => {
    const home = new THREE.Vector3(x, y, z);
    return { home, pos: home.clone(), r, q: new THREE.Quaternion().random(), spin: new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.06) };
  });
  world.sdFloc = (p) => { let best = 1e9, which = null; for (const f of world.flocs) { const d = p.distanceTo(f.pos) - f.r; if (d < best) { best = d; which = f; } } return { d: best, floc: which }; };

  // --- UV sunfleck shafts: where sunlight gets through gaps in the floating peat mat, a column of UV-B
  // reaches down into the humic water [S104]. Drawn as soft volumetric light (god rays), not a solid:
  // each column is a gaussian of glowing haze round its axis, integrated along the view ray in the
  // fragment shader (one back face per pixel, additive), brighter toward the sunlit top, fading out
  // above and below, with slow streaks round the axis and motes sinking through it, softened with
  // distance like the haze. Violet, so the danger reads from afar and you can keep out of it ---
  const shaftMat = new THREE.ShaderMaterial({
    uniforms: { uTime: goodsellShared.uTime, uOn: { value: 1 }, uFogNear: goodsellShared.uFogNear, uFogFar: goodsellShared.uFogFar },
    vertexShader: `varying vec3 vW; varying vec3 vC; varying vec2 vRH;
      void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
        vC = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vRH = vec2(length((instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz), length((instanceMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform float uOn; uniform float uFogNear; uniform float uFogFar;
      varying vec3 vW; varying vec3 vC; varying vec2 vRH;
      void main(){
        vec3 ro = cameraPosition, rd = normalize(vW - cameraPosition);
        // the view ray's closest approach to the column's vertical axis (in the horizontal plane)
        vec2 o = ro.xz - vC.xz, d = rd.xz;
        float k2 = max(dot(d, d), 1e-3);
        float s0 = max(0.0, -dot(o, d) / k2);
        vec2 q = o + d * s0;
        float sig = vRH.x * 0.446, r2 = dot(q, q) / (sig * sig);
        // a gaussian column integrated along the ray (sig sqrt(pi) / |d|), normalised: ~0.9 seen side-on
        float dens = exp(-r2) * 0.886 / sqrt(k2);
        dens = min(dens, 2.2);
        float y = ro.y + rd.y * s0 - vC.y, h = y / vRH.y;
        float ends = smoothstep(1.0, 0.45, abs(h)) * mix(0.6, 1.25, clamp(h * 0.5 + 0.5, 0.0, 1.0));
        float ang = atan(q.y, q.x);
        float rays = 0.72 + 0.28 * sin(ang * 7.0 + uTime * 0.35 + vC.x * 0.05) * sin(ang * 3.0 - uTime * 0.21 + vC.z * 0.03);
        float motes = smoothstep(0.965, 1.0, sin(y * 0.23 + uTime * 1.4 + ang * 5.0) * sin(y * 0.071 - ang * 11.0 + vC.z));
        float far = 1.0 - 0.5 * smoothstep(uFogNear, uFogFar * 2.0, distance(ro, vC));
        vec3 c = mix(vec3(0.42, 0.28, 0.95), vec3(0.74, 0.64, 1.0), exp(-r2 * 3.0)); // (violet, kept below the bloom's white)
        float a = dens * ends * (rays + 0.8 * motes * exp(-r2 * 0.6)) * far * uOn;
        gl_FragColor = vec4(c * a * 0.95, 0.0); }`,
    // light adds its colour and leaves the target's alpha alone, so the backdrop behind it still shows (the
    // post pass composites by alpha: with plain additive blending the columns blanked it, dark pillars)
    transparent: true, depthWrite: false, side: THREE.BackSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const shaftGeo = new THREE.CylinderGeometry(1, 1, 2, 28, 1, false);
  const shafts = new THREE.InstancedMesh(shaftGeo, shaftMat, UV_SHAFTS.length);
  // the mesh reaches 1.9 radii out and 1.25 half-lengths up and down: the light fades to nothing inside it
  UV_SHAFTS.forEach((sh, i) => { _m.compose(sh.c, _q.identity(), _s.set(sh.r * 1.9, ((sh.b.y - sh.a.y) / 2) * 1.25, sh.r * 1.9)); shafts.setMatrixAt(i, _m); });
  shafts.frustumCulled = false; shafts.renderOrder = 4;
  scene.add(shafts);
  world.shafts = shafts;

  // --- false light only: big far cells in the haze all round (one instanced draw) and fine motes (one draw) ---
  // (the look target's far field: a few big soft rods hanging in the haze, desaturated, never a crowd.) The far
  // cells wrap round each view's centre on the GPU, as the baths do, in a box of ±FAR_HALF, never nearer than
  // FAR_INNER (they dissolve into the haze before that), so whichever way you look a few hang out there; the
  // depth of field softens them. Scenery for the eye only: the solid cells to go to are the bystanders.
  const FAR = 44, FAR_HALF = 950, FAR_INNER = 420;
  const farBase = new THREE.CapsuleGeometry(36, 120, 8, 24, 4); farBase.rotateZ(Math.PI / 2);
  const farGeo = new THREE.InstancedBufferGeometry();
  for (const k of ['position', 'normal']) farGeo.setAttribute(k, farBase.attributes[k]);
  farGeo.setIndex(farBase.index);
  const fp = new Float32Array(FAR * 4), fq = new Float32Array(FAR * 4);
  {
    let sd = 977; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < FAR; i++) {
      fp.set([(r() * 2 - 1) * FAR_HALF, (r() * 2 - 1) * FAR_HALF, (r() * 2 - 1) * FAR_HALF, 0.9 + r() * 0.9], i * 4);
      _q.setFromEuler(new THREE.Euler(r() * 6.3, r() * 6.3, r() * 6.3));
      fq.set([_q.x, _q.y, _q.z, _q.w], i * 4);
    }
  }
  farGeo.setAttribute('iPos', new THREE.InstancedBufferAttribute(fp, 4));
  farGeo.setAttribute('iQuat', new THREE.InstancedBufferAttribute(fq, 4));
  farGeo.instanceCount = FAR;
  const farMat = new THREE.ShaderMaterial({
    uniforms: { ...goodsellShared, uCenter: { value: new THREE.Vector3() }, uHalf: { value: FAR_HALF }, uInner: { value: FAR_INNER } },
    vertexShader: `attribute vec4 iPos; attribute vec4 iQuat; uniform vec3 uCenter; uniform float uHalf; uniform float uInner;
      varying vec3 vN; varying vec3 vView; varying float vDepth; varying vec3 vObj; varying float vFade;
      vec3 qrot(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
      void main(){
        vec3 d = mod(iPos.xyz - uCenter + uHalf, 2.0 * uHalf) - uHalf;
        float edge = max(abs(d.x), max(abs(d.y), abs(d.z)));
        vFade = smoothstep(uHalf, uHalf * 0.82, edge) * smoothstep(uInner * 0.75, uInner, length(d));
        vObj = position;
        vec3 p = qrot(iQuat, position * iPos.w) + uCenter + d;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vN = normalize(mat3(viewMatrix) * qrot(iQuat, normal)); vView = -mv.xyz; vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
        if (vFade < 0.01) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: `${FAR_NOISE}
      uniform vec3 uHaze; uniform float uStyle;
      varying vec3 vN; varying vec3 vView; varying float vDepth; varying vec3 vObj; varying float vFade;
      void main(){
        vec3 n = normalize(vN), v = normalize(vView);
        float ndv = clamp(dot(n, v), 0.0, 1.0), fres = pow(1.0 - ndv, 2.0);
        vec3 L = normalize(vec3(-0.45, 0.75, 0.5));
        float wrapD = clamp((dot(n, L) + 0.5) / 1.5, 0.0, 1.0);
        float m = fn3(vObj * 0.06), g = fn3(vObj * 0.35 + 5.0);
        vec3 alb = mix(vec3(0.07, 0.24, 0.30), vec3(0.10, 0.22, 0.38), m) * (0.8 + 0.35 * g);
        vec3 col = alb * (0.5 + 0.75 * wrapD) + vec3(0.30, 0.52, 0.58) * fres * 0.55;   // a soft body, a pale fuzzy rim
        float far = smoothstep(300.0, 1300.0, vDepth);
        col = mix(col, uHaze, 0.55 + 0.33 * far);
        gl_FragColor = vec4(col * vFade, vFade);
      }`,
    transparent: true,
  });
  const far = new THREE.Mesh(farGeo, farMat);
  far.frustumCulled = false;
  far.renderOrder = -2;
  scene.add(far);
  const MOTES = 420, moteBox = new THREE.Vector3(240, 180, 110);
  const mp = new Float32Array(MOTES * 3), ms = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) { mp[i * 3] = rand(-1, 1) * moteBox.x; mp[i * 3 + 1] = rand(-1, 1) * moteBox.y; mp[i * 3 + 2] = rand(-1, 1) * moteBox.z; ms[i] = rand(0.4, 1); }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  moteGeo.setAttribute('size', new THREE.BufferAttribute(ms, 1));
  const moteMat = new THREE.ShaderMaterial({
    uniforms: { uCenter: { value: new THREE.Vector3() }, uBox: { value: moteBox }, uTime: { value: 0 }, uPx: { value: 1 } },
    vertexShader: `uniform vec3 uCenter; uniform vec3 uBox; uniform float uTime; uniform float uPx; attribute float size; varying float vA;
      void main(){
        vec3 p = position + vec3(sin(uTime * 0.3 + position.y) * 3.0, uTime * 1.5 * size, cos(uTime * 0.27 + position.x) * 2.0);
        p = mod(p - uCenter + uBox, 2.0 * uBox) - uBox + uCenter; // a box of motes wrapped round the view
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(size * uPx * 140.0 / -mv.z, 1.0, 6.0);
        vA = size * smoothstep(900.0, 60.0, -mv.z);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vec3(0.75, 0.92, 1.0) * a * vA * 0.55, a * vA * 0.3); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);
  world.far = far; world.motes = motes;
  /** Switch the world's false-light extras on or off (with the look). */
  world.setStyle = (falseLight) => {
    far.visible = motes.visible = falseLight;
    for (const o of flOnly) o.visible = falseLight;
    for (const o of gsOnly) o.visible = !falseLight;
    for (const b of baths) b.setStyle(falseLight);
    if (sprites) sprites.setStyle(falseLight);
    world.fl = falseLight;
  };
  /** Where each challenge sits along the route (0 start .. 1 Host A), for the placement log. */
  /** The rings (radius from the start) and where each thing is now, for tests and tuning. */
  world.placements = () => {
    const row = (name, p, r = 0) => ({ name, d: +p.distanceTo(START).toFixed(0), t: +progressAt(p).toFixed(2), r });
    return [
      row('start', START), row('backdoor flagellum (not a challenge)', BACKDOOR),
      { name: 'calm water round the start (no scenery hazard)', d: CALM_R },
      { name: `humic flocs (${FLOCS.length}, scenery: everywhere else)`, d: Math.round(Math.min(...world.flocs.map((f) => f.home.length()))) },
      { name: `UV sunfleck shafts (${UV_SHAFTS.length}, scenery: everywhere else)`, d: Math.round(Math.min(...UV_SHAFTS.map((u) => u.c.length()))) },
      { name: 'decoy hosts, then the portal (Host A + the amoeba on guard): placed as you go (main.js director)' },
      ...world.hosts.filter((h) => !h.hidden).map((h) => row(h.name, h.pos)),
      ...(clay.group.visible ? [row('clay platelet (beside Host B)', clay.pos)] : []),
      ...(amGroup.visible ? [row('amoeba (on guard)', amoeba.center)] : []),
    ];
  };
  /**
   * Put host h at `p` (shown), met coming along `dir` (a unit vector: from whoever it was placed for to
   * p), its long axis across the way it is met; Host B's clay platelet beside it (clayAt).
   */
  world.placeHost = (h, p, dir) => {
    h.home = [p.x, p.y, p.z]; h.pos.copy(p); h.vel.set(0, 0, 0);
    h.angle = h.ang = Math.atan2(dir.y, dir.x) + Math.PI / 2; h.angVel = 0; // (its local +y, where most receptors are, faces back the way it is met)
    h.hidden = false; h.group.visible = true;
    h.group.position.copy(h.pos); h.group.rotation.z = h.ang; h.group.updateMatrixWorld(true);
    if (h.id === 'B') { clayAt(p, dir, clay.pos); clay.group.position.copy(clay.pos); clay.group.visible = true; }
  };
  /** Park host h far off, hidden (a new game: not placed yet). */
  world.parkHost = (h) => {
    h.home = PARKED.slice(); h.pos.set(...PARKED); h.vel.set(0, 0, 0); h.hidden = true; h.group.visible = false; h.group.position.copy(h.pos);
    if (h.id === 'B') { clay.pos.set(...PARKED).add(_v.set(0, 110, 0)); clay.group.position.copy(clay.pos); clay.group.visible = false; }
  };
  /** Move a placed host (and Host B's clay) by d: a lingering player's decoy swimming over to them (behaviour). */
  world.shiftHost = (h, d) => {
    h.home[0] += d.x; h.home[1] += d.y; h.home[2] += d.z; h.pos.add(d);
    if (h.id === 'B') { clay.pos.add(d); clay.group.position.copy(clay.pos); }
  };
  /**
   * The way on: Host A at `pos`, met coming along `dir`, shown, with the amoeba beside it on guard
   * (amoebaAt). Returns the portal: the gold receptor on Host A that faces back along dir most.
   */
  world.placePortal = (pos, dir) => {
    const h = world.hosts.find((x) => x.id === 'A');
    world.placeHost(h, pos, dir);
    let best = null, bd = -2;
    for (const q of world.proteins) {
      if (q.host !== h || !q.compatible) continue;
      const n = world.dirToWorld(h, q.normal, new THREE.Vector3());
      if (-n.dot(dir) > bd) { bd = -n.dot(dir); best = q; }
    }
    // the amoeba: to one side of Host A, a little farther on, its lobe reaching round to the receptor
    amoebaAt(h.pos, dir, amoeba.center);
    amGroup.position.copy(amoeba.center); amGroup.visible = true;
    amoeba.reach = 0;
    world.portal = { host: h, protein: best, dir: dir.clone() };
    return world.portal;
  };
  world.portal = null;
  world.gusts = []; // { p, dir, t }

  /** Push the crowd (a gust or a passing phage). */
  world.gust = (p, dir) => world.gusts.push({ p: p.clone(), dir: dir.clone(), t: 0.6 });

  world.flowAt = (p, t, out = new THREE.Vector3()) => out.set(5 * Math.sin(p.y * 0.011 + t * 0.09), 3 * Math.sin(p.x * 0.013 - t * 0.07), 0);

  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  /** Per frame: hosts drift, flocs turn, the baths learn where the solids, gusts and the clock are. */
  world.update = (dt, t, center) => {
    world.t = t;
    for (const m of [amoebaMat, amBody.ink.material, podMat]) m.uniforms.uTime.value = t;
    world.backdoor.flag.rotation.x = -t * 2.2; // the motor turns the helix
    moteMat.uniforms.uCenter.value.copy(center); moteMat.uniforms.uTime.value = t;
    moteMat.uniforms.uPx.value = Math.min(2, innerHeight / 720);
    // hosts: slow Brownian drift around home, gentle rocking
    for (const h of world.hosts) {
      if (h.hidden) continue;
      if (world.opts.hostBrownian && !h.locked) {
        const k = 0.15;
        h.vel.x += (-h.vel.x * 0.8 + (h.home[0] - h.pos.x) * k) * dt + gauss() * Math.sqrt(dt) * 1.6;
        h.vel.y += (-h.vel.y * 0.8 + (h.home[1] - h.pos.y) * k) * dt + gauss() * Math.sqrt(dt) * 1.6;
        h.pos.x += h.vel.x * dt; h.pos.y += h.vel.y * dt;
        h.angVel += (-h.angVel * 0.8 + (h.angle - h.ang) * 0.2) * dt + gauss() * Math.sqrt(dt) * 0.012;
        h.ang += h.angVel * dt;
      }
      h.group.position.copy(h.pos); h.group.rotation.z = h.ang;
      h.mat.uniforms.uTime.value = t;
    }
    // flocs: a slow turn and a drift round home
    world.flocs.forEach((f, i) => {
      f.q.multiply(_q.setFromEuler(new THREE.Euler(f.spin.x * dt, f.spin.y * dt, f.spin.z * dt)));
      f.pos.set(f.home.x + Math.sin(t * 0.11 + f.r) * 10, f.home.y + Math.cos(t * 0.09 + f.r) * 8, f.home.z + Math.sin(t * 0.07 + i) * 6);
      flocMesh.set(i, f.pos, f.q, f.r / 11);
    });
    flocMesh.commit();
    // the gusts (A): one at a time shoves the bath
    for (const g of world.gusts) g.t -= dt;
    world.gusts = world.gusts.filter((g) => g.t > 0);
    const g = world.gusts[world.gusts.length - 1];
    // solids the baths keep out of: the hosts (capsules), the amoeba (a sphere), the clay, the flocs
    const solids = [];
    for (const h of world.hosts) {
      if (h.burst || !h.group.visible) continue;
      world.toWorld(h, _a.set(-h.half, 0, 0)); world.toWorld(h, _b.set(h.half, 0, 0));
      solids.push({ a: _a.clone(), b: _b.clone(), r: h.r + 2 });
    }
    if (amGroup.visible && amoeba.mesh.visible) solids.push({ a: amoeba.center, b: amoeba.center, r: amoeba.r + 4 });
    if (clay.group.visible) solids.push({ a: clay.pos, b: clay.pos, r: 30 });
    // the nearest bystanders (the bath keeps a few solids: the ones round the view)
    for (const h of world.bystanders) { h.mat.uniforms.uTime.value = t; h.near = h.pos.distanceTo(center); }
    for (const h of world.bystanders.filter((x) => x.near < 700).sort((a, b) => a.near - b.near).slice(0, 10 - solids.length)) {
      h.group.updateMatrixWorld(); solids.push({ a: _a.set(-h.half, 0, 0).applyMatrix4(h.group.matrixWorld).clone(), b: _b.set(h.half, 0, 0).applyMatrix4(h.group.matrixWorld).clone(), r: h.r + 2 });
    }
    if (sprites) sprites.mesh.visible = world.opts.crowd;
    for (const b of baths) {
      setSolids(b.material, solids);
      b.group.visible = world.opts.crowd;
      const u = b.material.uniforms;
      if (g) { const k = g.t / 0.6; u.uGust.value.set(g.p.x, g.p.y, g.p.z, 26 * Math.sin(k * Math.PI)); u.uGustDir.value.copy(g.dir); } else u.uGust.value.w = 0;
    }
  };

  world.reset = () => {
    for (const h of world.hosts) {
      h.angle = h.ang = HOSTS.find((d) => d.id === h.id).angle;
      h.angVel = 0; h.burst = false; h.locked = false; h.group.scale.setScalar(1); h.group.rotation.z = h.ang;
      world.parkHost(h);
    }
    amoeba.center.set(0, 9000, 0); amGroup.position.copy(amoeba.center); amGroup.visible = false;
    world.portal = null;
    amoeba.reach = 0; amoeba.cup = 0; amoeba.see(1); amoeba.posture(0);
    world.drawPod(0, amoeba.base, amoeba.tip, 0, false);
    vacuole.visible = false;
  };
  return world;
}
