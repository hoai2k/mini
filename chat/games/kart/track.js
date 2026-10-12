// Kart Dash: the track. Pure geometry, no DOM, so the unit tests can load it.
//
// The world is a flat square WORLD metres across, x to the east and z to the
// south (the way a canvas draws it). The track is a closed centripetal
// Catmull-Rom spline through POINTS, sampled every STEP metres; the road is
// HALF metres either side of it. Progress along the track is `s` (metres from
// the start line, 0..length) and the side offset is `d` (metres, positive to
// the driver's right).

// POINTS are laid out on a 420 m square and scaled down to WORLD.
const SCALE = 0.58;
export const WORLD = 420 * SCALE;
export const HALF = 9;          // road half-width (kerbs are the outer 1.2 m)
export const LAPS = 3;
const STEP = 1;

// Control points, driving order. The start line is at the first point, on the
// long bottom straight heading east.
export const POINTS = [
  [120, 360], [210, 362], [290, 356],          // start straight
  [345, 335], [370, 290], [358, 240],          // sweeping right-hander north
  [318, 214], [272, 222], [238, 246],          // back west...
  [200, 250], [176, 222], [186, 182],          // S-bend
  [226, 160], [282, 150], [338, 132],          // fast run east
  [372, 98], [362, 58], [318, 44],             // top-right hairpin
  [250, 50], [190, 64], [140, 56],             // top straight west
  [92, 46], [56, 72], [54, 118],               // top-left corner
  [80, 158], [112, 196], [104, 240],           // chicane south
  [66, 270], [52, 312], [72, 350],             // bottom-left bend back onto the straight
];

function catmull(p0, p1, p2, p3, t) {
  // Centripetal parameterisation avoids loops and cusps on uneven spacing.
  const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5) || 1e-4;
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const lerp = (a, b, ta, tb) => [
    ((tb - u) / (tb - ta)) * a[0] + ((u - ta) / (tb - ta)) * b[0],
    ((tb - u) / (tb - ta)) * a[1] + ((u - ta) / (tb - ta)) * b[1],
  ];
  const a1 = lerp(p0, p1, t0, t1), a2 = lerp(p1, p2, t1, t2), a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2), b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

// Builds the sampled track: { xs, zs, tx, tz, curv, n, length, half }.
// tx/tz is the unit tangent (driving direction); curv the signed curvature
// (1/m, positive turning right).
export function buildTrack(points = POINTS.map(([x, z]) => [x * SCALE, z * SCALE]), half = HALF) {
  // Dense polyline first, then resample at even spacing.
  const dense = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    for (let k = 0; k < 40; k++) dense.push(catmull(p0, p1, p2, p3, k / 40));
  }
  dense.push(dense[0]);
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = cum[cum.length - 1];
  const count = Math.round(total / STEP);
  const step = total / count;
  const xs = new Float32Array(count), zs = new Float32Array(count);
  let j = 0;
  for (let i = 0; i < count; i++) {
    const s = i * step;
    while (cum[j + 1] < s) j++;
    const f = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
    xs[i] = dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f;
    zs[i] = dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f;
  }
  const tx = new Float32Array(count), tz = new Float32Array(count), curv = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = (i - 1 + count) % count, b = (i + 1) % count;
    const dx = xs[b] - xs[a], dz = zs[b] - zs[a], l = Math.hypot(dx, dz) || 1;
    tx[i] = dx / l;
    tz[i] = dz / l;
  }
  for (let i = 0; i < count; i++) {
    // Heading change over ±4 samples, smoothed.
    const a = (i - 4 + count) % count, b = (i + 4) % count;
    const ha = Math.atan2(tz[a], tx[a]), hb = Math.atan2(tz[b], tx[b]);
    curv[i] = wrapAngle(hb - ha) / (8 * step);
  }
  return { xs, zs, tx, tz, curv, n: count, step, length: total, half };
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// The nearest centreline sample to (x, z). With `hint` (the previous index)
// only a window around it is searched, so a kart can't jump to a nearby
// stretch of track; a far-off result falls back to a full search.
export function nearest(track, x, z, hint = -1) {
  const { xs, zs, n } = track;
  let best = -1, bd = Infinity;
  const scan = (from, to) => {
    for (let k = from; k <= to; k++) {
      const i = ((k % n) + n) % n;
      const dx = xs[i] - x, dz = zs[i] - z, d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; best = i; }
    }
  };
  if (hint >= 0) {
    scan(hint - 40, hint + 40);
    if (bd > 45 * 45) { bd = Infinity; scan(0, n - 1); }
  } else {
    scan(0, n - 1);
  }
  return best;
}

// Where (x, z) is relative to the track: { i, s, d } with d positive to the
// right of the driving direction.
export function locate(track, x, z, hint = -1) {
  const i = nearest(track, x, z, hint);
  const dx = x - track.xs[i], dz = z - track.zs[i];
  const along = dx * track.tx[i] + dz * track.tz[i];
  // Right of the tangent (tx, tz) is (-tz, tx) with z pointing south.
  const d = dx * -track.tz[i] + dz * track.tx[i];
  let s = i * track.step + along;
  if (s < 0) s += track.length;
  if (s >= track.length) s -= track.length;
  return { i, s, d };
}

// World position at progress s and side offset d.
export function pointAt(track, s, d = 0) {
  const L = track.length;
  s = ((s % L) + L) % L;
  const f = s / track.step;
  const i = Math.floor(f) % track.n, j = (i + 1) % track.n, u = f - Math.floor(f);
  const x = track.xs[i] + (track.xs[j] - track.xs[i]) * u;
  const z = track.zs[i] + (track.zs[j] - track.zs[i]) * u;
  const tx = track.tx[i] + (track.tx[j] - track.tx[i]) * u;
  const tz = track.tz[i] + (track.tz[j] - track.tz[i]) * u;
  const l = Math.hypot(tx, tz) || 1;
  return { x: x - (tz / l) * d, z: z + (tx / l) * d, h: Math.atan2(tz, tx), i };
}

// Total distance driven along the track, carried across the start line:
// adds the change in s (wrapped to the short way round) to `total`.
export function advance(total, prevS, s, length) {
  let ds = s - prevS;
  if (ds > length / 2) ds -= length;
  if (ds < -length / 2) ds += length;
  // A kart can't cover more than ~3 m in one step; bigger jumps are glitches
  // (a teleport or a cut across the grass to another stretch) and don't count.
  if (Math.abs(ds) > 40) ds = 0;
  return total + ds;
}

// Lap (1-based) for a total distance; laps done; finished?
export function lapOf(total, length, laps = LAPS) {
  const done = Math.max(0, Math.floor(total / length));
  return { lap: Math.min(laps, done + 1), done, finished: done >= laps };
}

// Starting grid: two by two behind the line, `slot` 0 at the front left.
export function gridSpot(track, slot) {
  const row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1;
  const s = -8 - row * 7 - (slot % 2) * 3;
  return { ...pointAt(track, s, side * 3.5), s };
}

// Seeded random numbers (mulberry32), so every player builds the same scenery.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Distance from (x, z) to the centreline (full search; for scenery placement).
export function distToCentre(track, x, z) {
  const i = nearest(track, x, z);
  return Math.hypot(x - track.xs[i], z - track.zs[i]);
}

// Item boxes: rows of four across the road. Boost pads: chevrons on the road.
export function itemBoxes(track) {
  const out = [];
  for (const f of [0.2, 0.47, 0.74]) {
    for (const d of [-5.4, -1.8, 1.8, 5.4]) {
      const p = pointAt(track, track.length * f, d);
      out.push({ x: p.x, z: p.z });
    }
  }
  return out;
}

export function boostPads(track) {
  return [
    { s: track.length * 0.115, d: -3, len: 7, w: 4 },
    { s: track.length * 0.6, d: 3, len: 7, w: 4 },
  ];
}

// Trees on the grass and tyre stacks on the outside of the tighter bends.
export function scenery(track, seed = 7) {
  const r = rng(seed);
  const trees = [], tyres = [];
  // Tyres: every 6 m round bends, on the outside.
  for (let i = 0; i < track.n; i += Math.round(6 / track.step)) {
    const c = track.curv[i];
    if (Math.abs(c) < 1 / 55) continue;
    const side = c > 0 ? -1 : 1; // turning right: the outside is the left
    const p = pointAt(track, i * track.step, side * (track.half + 3.2));
    if (distToCentre(track, p.x, p.z) < track.half + 2.5) continue;
    tyres.push({ x: p.x, z: p.z });
  }
  // Trees: rejection-sampled, clear of the road and of each other.
  let tries = 0;
  while (trees.length < 120 && tries++ < 6000) {
    const x = 4 + r() * (WORLD - 8), z = 4 + r() * (WORLD - 8);
    if (distToCentre(track, x, z) < track.half + 7) continue;
    if (trees.some(t => (t.x - x) ** 2 + (t.z - z) ** 2 < 64)) continue;
    trees.push({ x, z, k: 0.8 + r() * 0.5 });
  }
  return { trees, tyres };
}

// A grid of obstacles (trees and tyre stacks) for quick collision lookups.
export function obstacleGrid(list, cell = 16) {
  const map = new Map();
  for (const o of list) {
    const key = Math.floor(o.x / cell) + ',' + Math.floor(o.z / cell);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(o);
  }
  return {
    near(x, z) {
      const cx = Math.floor(x / cell), cz = Math.floor(z / cell), out = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const l = map.get(cx + a + ',' + (cz + b));
        if (l) out.push(...l);
      }
      return out;
    },
  };
}
