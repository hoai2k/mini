// Collision and proximity against a level's boxes: oriented boxes in a uniform
// grid. Distance queries drive both crashes and scoring; ray casts drive the
// gap and tunnel bonuses, the camera and the glider's shadow.

const CELL = 24;
const OFF = 1 << 10;
const key = (ix, iy, iz) => ((ix + OFF) * 2048 + (iy + OFF)) * 2048 + (iz + OFF);

export class World {
  constructor(boxes) {
    const n = boxes.length;
    this.count = n;
    this.c = new Float64Array(n * 3);
    this.h = new Float64Array(n * 3);
    this.m = new Float64Array(n * 9);
    this.grid = new Map();
    this.stamp = new Uint32Array(n);
    this.tick = 0;
    this.found = [];
    for (let i = 0; i < n; i++) {
      const b = boxes[i];
      this.c.set(b.c, i * 3);
      this.h.set(b.h, i * 3);
      this.m.set(b.m, i * 9);
      // World-space bounding box from |M| * h.
      const M = b.m, h = b.h;
      const ex = Math.abs(M[0]) * h[0] + Math.abs(M[3]) * h[1] + Math.abs(M[6]) * h[2];
      const ey = Math.abs(M[1]) * h[0] + Math.abs(M[4]) * h[1] + Math.abs(M[7]) * h[2];
      const ez = Math.abs(M[2]) * h[0] + Math.abs(M[5]) * h[1] + Math.abs(M[8]) * h[2];
      const [cx, cy, cz] = b.c;
      for (let ix = Math.floor((cx - ex) / CELL); ix <= Math.floor((cx + ex) / CELL); ix++)
        for (let iy = Math.floor((cy - ey) / CELL); iy <= Math.floor((cy + ey) / CELL); iy++)
          for (let iz = Math.floor((cz - ez) / CELL); iz <= Math.floor((cz + ez) / CELL); iz++) {
            const k = key(ix, iy, iz);
            let list = this.grid.get(k);
            if (!list) this.grid.set(k, (list = []));
            list.push(i);
          }
    }
  }

  // Box indices whose cells overlap the axis-aligned region. Reuses one array.
  query(x0, y0, z0, x1, y1, z1) {
    const out = this.found;
    out.length = 0;
    if (++this.tick === 0xffffffff) {
      this.stamp.fill(0);
      this.tick = 1;
    }
    const t = this.tick;
    for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++)
      for (let iy = Math.floor(y0 / CELL); iy <= Math.floor(y1 / CELL); iy++)
        for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) {
          const list = this.grid.get(key(ix, iy, iz));
          if (!list) continue;
          for (let j = 0; j < list.length; j++) {
            const i = list[j];
            if (this.stamp[i] !== t) {
              this.stamp[i] = t;
              out.push(i);
            }
          }
        }
    return out;
  }

  // Signed distance from a point to box i (negative inside), and the closest
  // surface point written to `out` when given.
  boxDistance(i, px, py, pz, out) {
    const c = this.c, h = this.h, m = this.m;
    const dx = px - c[i * 3], dy = py - c[i * 3 + 1], dz = pz - c[i * 3 + 2];
    const o = i * 9;
    const lx = dx * m[o] + dy * m[o + 1] + dz * m[o + 2];
    const ly = dx * m[o + 3] + dy * m[o + 4] + dz * m[o + 5];
    const lz = dx * m[o + 6] + dy * m[o + 7] + dz * m[o + 8];
    const hx = h[i * 3], hy = h[i * 3 + 1], hz = h[i * 3 + 2];
    const qx = Math.max(-hx, Math.min(hx, lx));
    const qy = Math.max(-hy, Math.min(hy, ly));
    const qz = Math.max(-hz, Math.min(hz, lz));
    let d;
    let sx = qx, sy = qy, sz = qz;
    if (qx === lx && qy === ly && qz === lz) {
      // Inside: distance to the nearest face, as a negative number.
      const fx = hx - Math.abs(lx), fy = hy - Math.abs(ly), fz = hz - Math.abs(lz);
      d = -Math.min(fx, fy, fz);
      if (fx <= fy && fx <= fz) sx = Math.sign(lx || 1) * hx;
      else if (fy <= fz) sy = Math.sign(ly || 1) * hy;
      else sz = Math.sign(lz || 1) * hz;
    } else {
      d = Math.hypot(lx - qx, ly - qy, lz - qz);
    }
    if (out) {
      out[0] = c[i * 3] + sx * m[o] + sy * m[o + 3] + sz * m[o + 6];
      out[1] = c[i * 3 + 1] + sx * m[o + 1] + sy * m[o + 4] + sz * m[o + 7];
      out[2] = c[i * 3 + 2] + sx * m[o + 2] + sy * m[o + 5] + sz * m[o + 8];
    }
    return d;
  }

  // Distance to the nearest surface within maxR (Infinity if none), with the
  // closest point in `out` [x, y, z] and the box index in out[3].
  nearest(px, py, pz, maxR, out) {
    const list = this.query(px - maxR, py - maxR, pz - maxR, px + maxR, py + maxR, pz + maxR);
    let best = Infinity;
    const tmp = [0, 0, 0];
    for (let j = 0; j < list.length; j++) {
      const i = list[j];
      const d = this.boxDistance(i, px, py, pz, tmp);
      if (d < best) {
        best = d;
        if (out) {
          out[0] = tmp[0];
          out[1] = tmp[1];
          out[2] = tmp[2];
          out[3] = i;
        }
      }
    }
    return best;
  }

  // Distance along a ray to the first box, up to maxDist (Infinity if none).
  // dir must be unit length. The hit box index is left in this.lastHit.
  raycast(ox, oy, oz, dx, dy, dz, maxDist) {
    const ex = ox + dx * maxDist, ey = oy + dy * maxDist, ez = oz + dz * maxDist;
    const list = this.query(Math.min(ox, ex), Math.min(oy, ey), Math.min(oz, ez), Math.max(ox, ex), Math.max(oy, ey), Math.max(oz, ez));
    let best = Infinity;
    this.lastHit = -1;
    const c = this.c, h = this.h, m = this.m;
    for (let j = 0; j < list.length; j++) {
      const i = list[j];
      const o = i * 9;
      const rx = ox - c[i * 3], ry = oy - c[i * 3 + 1], rz = oz - c[i * 3 + 2];
      let tmin = 0, tmax = maxDist;
      let miss = false;
      for (let a = 0; a < 3 && !miss; a++) {
        const ax = m[o + a * 3], ay = m[o + a * 3 + 1], az = m[o + a * 3 + 2];
        const lo = rx * ax + ry * ay + rz * az;
        const ld = dx * ax + dy * ay + dz * az;
        const half = h[i * 3 + a];
        if (Math.abs(ld) < 1e-9) {
          if (lo < -half || lo > half) miss = true;
        } else {
          let t1 = (-half - lo) / ld, t2 = (half - lo) / ld;
          if (t1 > t2) [t1, t2] = [t2, t1];
          if (t1 > tmin) tmin = t1;
          if (t2 < tmax) tmax = t2;
          if (tmin > tmax) miss = true;
        }
      }
      if (!miss && tmin < best) {
        best = tmin;
        this.lastHit = i;
      }
    }
    return best;
  }
}
