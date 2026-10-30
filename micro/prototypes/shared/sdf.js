// Organic bodies from signed distance fields: a creature is a list of parts
// (ellipsoids, tapered tubes...), smoothly unioned, meshed once at load with
// surface nets. Each vertex records the part it belongs to (and the next
// nearest, with a weight) so the caller can rig the mesh: rotate each part
// about its pivot on the CPU, in a vertex shader, or bind it to a skeleton.
//
// The approach comes from the Wobblers animal pipeline in the swingers repo:
// build from body parts that make sense for the animal, never trace a picture;
// thin parts (legs, claws, setae) need to be thicker than drawn to survive the
// grid; check the result with turnaround renders against the reference.
//
//   const geo = buildSdfMesh([
//     { id: 0, sdf: sd.ellipsoid([0, 0, 0], [1, 0.6, 0.5]) },
//     { id: 1, sdf: sd.roundCone([0.8, 0, 0], [1.4, -0.3, 0], 0.18, 0.08), blend: 0.12 },
//   ], { min: [-1.2, -1, -1], max: [1.6, 1, 1], cell: 0.03 });
//
// geometry attributes: position, normal, part (id of the nearest part),
// part2 (second nearest), partW (weight of `part`, 0.5..1).
import * as THREE from './vendor/three.module.min.js';

const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Polynomial smooth minimum (Inigo Quilez); k is the blend radius. */
export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
}

/** Smooth subtraction: carve b out of a. */
export function ssub(a, b, k) {
  if (k <= 0) return Math.max(a, -b);
  const h = clamp(0.5 - (0.5 * (a + b)) / k, 0, 1);
  return a + (-b - a) * h + k * h * (1 - h);
}

/** Distance functions. Each returns (x, y, z) => signed distance. */
export const sd = {
  sphere([cx, cy, cz], r) {
    return (x, y, z) => len3(x - cx, y - cy, z - cz) - r;
  },
  /** Ellipsoid with radii [rx, ry, rz] (bound-corrected approximation). */
  ellipsoid([cx, cy, cz], [rx, ry, rz]) {
    return (x, y, z) => {
      const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
      const k0 = len3(px, py, pz);
      const k1 = len3(px / rx, py / ry, pz / rz);
      return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
    };
  },
  /** Capsule from a to b with radius r. */
  capsule(a, b, r) {
    return sd.roundCone(a, b, r, r);
  },
  /** Tapered tube from a (radius ra) to b (radius rb), rounded ends. */
  roundCone([ax, ay, az], [bx, by, bz], ra, rb) {
    const bax = bx - ax, bay = by - ay, baz = bz - az;
    const l2 = bax * bax + bay * bay + baz * baz;
    const rr = ra - rb;
    const a2 = l2 - rr * rr;
    const il2 = 1 / l2;
    return (x, y, z) => {
      const pax = x - ax, pay = y - ay, paz = z - az;
      const yy = pax * bax + pay * bay + paz * baz;
      const zz = yy - l2;
      const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
      const x2 = qx * qx + qy * qy + qz * qz;
      const y2 = yy * yy * l2;
      const z2 = zz * zz * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
    };
  },
  /** Rounded box centred at c with half-size h and corner radius r. */
  roundBox([cx, cy, cz], [hx, hy, hz], r) {
    return (x, y, z) => {
      const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
      return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
    };
  },
  /** Torus in the plane perpendicular to the y axis. */
  torus([cx, cy, cz], R, r) {
    return (x, y, z) => {
      const q = Math.hypot(x - cx, z - cz) - R;
      return Math.hypot(q, y - cy) - r;
    };
  },
  /** Mirror any part across the x = 0 plane (left/right symmetry): z -> |z|. */
  mirrorZ(f) {
    return (x, y, z) => f(x, y, Math.abs(z));
  },
};

/**
 * Evaluate the combined field. Parts are applied in order: each one blends
 * into what came before with its own `blend` radius (0 = hard union);
 * `op: 'sub'` carves it out instead.
 */
export function combine(parts) {
  return (x, y, z) => {
    let d = Infinity;
    for (const p of parts) {
      const v = p.sdf(x, y, z);
      if (p.op === 'sub') d = ssub(d, v, p.blend || 0);
      else d = d === Infinity ? v : smin(d, v, p.blend || 0);
    }
    return d;
  };
}

/**
 * Mesh the parts with surface nets.
 * @param {Array<{id:number, sdf:Function, blend?:number, op?:'sub'}>} parts
 * @param {{min:number[], max:number[], cell:number, skinWidth?:number}} opts
 *   skinWidth: distance over which a vertex blends between its two nearest
 *   parts (defaults to 2 cells).
 * @returns {THREE.BufferGeometry}
 */
export function buildSdfMesh(parts, { min, max, cell, skinWidth }) {
  const f = combine(parts);
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1;
  const ny = Math.ceil((max[1] - min[1]) / cell) + 1;
  const nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const field = new Float32Array(nx * ny * nz);
  const at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    field[at(i, j, k)] = f(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);
  }

  // One vertex per cell that straddles the surface: the mean of its edge crossings.
  const cellIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cAt = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      v[c] = field[at(i + corner[c][0], j + corner[c][1], k + corner[c][2])];
      if (v[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corner[a][0] + (corner[b][0] - corner[a][0]) * t;
      sy += corner[a][1] + (corner[b][1] - corner[a][1]) * t;
      sz += corner[a][2] + (corner[b][2] - corner[a][2]) * t;
      n++;
    }
    cellIndex[cAt(i, j, k)] = pos.length / 3;
    pos.push(min[0] + (i + sx / n) * cell, min[1] + (j + sy / n) * cell, min[2] + (k + sz / n) * cell);
  }

  // Normals from the field gradient.
  const count = pos.length / 3;
  const nrm = new Float32Array(count * 3);
  const e = cell * 0.5;
  for (let p = 0; p < count; p++) {
    const x = pos[3 * p], y = pos[3 * p + 1], z = pos[3 * p + 2];
    let gx = f(x + e, y, z) - f(x - e, y, z);
    let gy = f(x, y + e, z) - f(x, y - e, z);
    let gz = f(x, y, z + e) - f(x, y, z - e);
    const l = len3(gx, gy, gz) || 1;
    nrm[3 * p] = gx / l; nrm[3 * p + 1] = gy / l; nrm[3 * p + 2] = gz / l;
  }

  // A quad for every grid edge the surface crosses, joining the four cells around it.
  const idx = [];
  const quad = (a, b, c, d) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    // Wind so the face normal agrees with the field gradient.
    const ax = pos[3 * a], ay = pos[3 * a + 1], az = pos[3 * a + 2];
    const ux = pos[3 * b] - ax, uy = pos[3 * b + 1] - ay, uz = pos[3 * b + 2] - az;
    const wx = pos[3 * c] - ax, wy = pos[3 * c + 1] - ay, wz = pos[3 * c + 2] - az;
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    const gx = nrm[3 * a] + nrm[3 * c], gy = nrm[3 * a + 1] + nrm[3 * c + 1], gz = nrm[3 * a + 2] + nrm[3 * c + 2];
    if (fx * gx + fy * gy + fz * gz >= 0) idx.push(a, b, c, a, c, d);
    else idx.push(a, c, b, a, d, c);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const s = field[at(i, j, k)] < 0;
    if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && s !== (field[at(i + 1, j, k)] < 0)) {
      quad(cellIndex[cAt(i, j - 1, k - 1)], cellIndex[cAt(i, j, k - 1)], cellIndex[cAt(i, j, k)], cellIndex[cAt(i, j - 1, k)]);
    }
    if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && s !== (field[at(i, j + 1, k)] < 0)) {
      quad(cellIndex[cAt(i - 1, j, k - 1)], cellIndex[cAt(i, j, k - 1)], cellIndex[cAt(i, j, k)], cellIndex[cAt(i - 1, j, k)]);
    }
    if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && s !== (field[at(i, j, k + 1)] < 0)) {
      quad(cellIndex[cAt(i - 1, j - 1, k)], cellIndex[cAt(i, j - 1, k)], cellIndex[cAt(i, j, k)], cellIndex[cAt(i - 1, j, k)]);
    }
  }

  // Rig data: nearest and second-nearest part, with a soft weight between them.
  const sw = skinWidth ?? cell * 2;
  const part = new Float32Array(count), part2 = new Float32Array(count), partW = new Float32Array(count);
  const solid = parts.filter((p) => p.op !== 'sub');
  for (let p = 0; p < count; p++) {
    const x = pos[3 * p], y = pos[3 * p + 1], z = pos[3 * p + 2];
    let d1 = Infinity, d2 = Infinity, i1 = 0, i2 = 0;
    for (const q of solid) {
      const d = q.sdf(x, y, z);
      if (d < d1) { if (q.id !== i1) { d2 = d1; i2 = i1; } d1 = d; i1 = q.id; }
      else if (d < d2 && q.id !== i1) { d2 = d; i2 = q.id; }
    }
    part[p] = i1;
    part2[p] = d2 === Infinity ? i1 : i2;
    partW[p] = d2 === Infinity ? 1 : clamp(0.5 + (d2 - d1) / (2 * sw), 0.5, 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('part', new THREE.BufferAttribute(part, 1));
  geo.setAttribute('part2', new THREE.BufferAttribute(part2, 1));
  geo.setAttribute('partW', new THREE.BufferAttribute(partW, 1));
  geo.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}
