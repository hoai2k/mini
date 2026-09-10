/** The route: a smooth spine through a district from its start, along its
 * checkpoint totems, to its exit. It is the one idea three things share:
 * the trail painted and dressed on the ground, the direction the follow
 * camera faces, and the way Hopper faces at a checkpoint. Pure math over
 * XZ, so it runs in the node tests.
 */
import type { District } from './district';

export interface RouteSample {
  x: number;
  z: number;
  /** Distance along the route from its start, in metres. */
  s: number;
  /** Yaw of the route's forward tangent here (+Z at 0, toward +X positive). */
  yaw: number;
}
export interface RouteHit {
  /** Distance along the route of the nearest point. */
  s: number;
  /** Distance from the route's centre line. */
  dist: number;
  /** Which side of the line: positive is to the route's right. */
  side: number;
  x: number;
  z: number;
}

const wrap = (d: number) => {
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** Centripetal-ish Catmull-Rom through the waypoints, then resampled by arc length. */
export class Route {
  readonly samples: RouteSample[] = [];
  readonly length: number;
  readonly waypoints: { x: number; z: number }[];
  constructor(waypoints: { x: number; z: number }[], spacing = 6) {
    // Drop consecutive duplicates; a route needs at least two distinct points.
    const pts = waypoints.filter((p, i) => i === 0 || Math.hypot(p.x - waypoints[i - 1].x, p.z - waypoints[i - 1].z) > 1);
    if (pts.length < 2) pts.push({ x: (pts[0]?.x ?? 0) + 0, z: (pts[0]?.z ?? 0) - 100 });
    this.waypoints = pts;
    const dense: { x: number; z: number }[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const p0 = pts[Math.max(0, i - 1)],
        p1 = pts[i],
        p2 = pts[i + 1],
        p3 = pts[Math.min(pts.length - 1, i + 2)];
      const seg = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      const n = Math.max(2, Math.ceil(seg / 3));
      for (let k = 0; k < n; k++) {
        const t = k / n,
          t2 = t * t,
          t3 = t2 * t;
        dense.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
        });
      }
    }
    dense.push(pts[pts.length - 1]);
    // Resample at a fixed spacing so s is uniform and tangents are stable.
    let acc = 0,
      next = 0;
    const out: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i + 1 < dense.length; i++) {
      const a = dense[i],
        b = dense[i + 1],
        len = Math.hypot(b.x - a.x, b.z - a.z);
      while (next <= acc + len) {
        const t = len > 0 ? (next - acc) / len : 0;
        out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, s: next });
        next += spacing;
      }
      acc += len;
    }
    out.push({ x: dense[dense.length - 1].x, z: dense[dense.length - 1].z, s: acc });
    this.length = acc;
    for (let i = 0; i < out.length; i++) {
      const a = out[Math.max(0, i - 2)],
        b = out[Math.min(out.length - 1, i + 2)];
      this.samples.push({ ...out[i], yaw: Math.atan2(b.x - a.x, b.z - a.z) });
    }
  }
  /** The sample nearest a distance along the route. */
  at(s: number): RouteSample {
    const n = this.samples.length;
    if (n < 2) return this.samples[0];
    const spacing = this.samples[1].s - this.samples[0].s || 1;
    const i = Math.max(0, Math.min(n - 1, Math.round(s / spacing)));
    return this.samples[i];
  }
  /** Position on the route at a distance along it, interpolated. */
  pointAt(s: number): { x: number; z: number; yaw: number } {
    const n = this.samples.length;
    const clamped = Math.max(0, Math.min(this.length, s));
    const spacing = n > 1 ? this.samples[1].s - this.samples[0].s || 1 : 1;
    const f = clamped / spacing,
      i = Math.min(n - 1, Math.floor(f)),
      j = Math.min(n - 1, i + 1),
      t = f - i;
    const a = this.samples[i],
      b = this.samples[j];
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, yaw: a.yaw + wrap(b.yaw - a.yaw) * t };
  }
  /** Forward yaw of the route a distance along it. */
  yawAt(s: number): number {
    return this.pointAt(s).yaw;
  }
  /** Nearest point of the route to a position, with its distance and side. */
  nearest(x: number, z: number, hint?: number): RouteHit {
    let best = 0,
      bestD = Infinity;
    const n = this.samples.length;
    // A hint narrows the search to the neighbourhood of a known s (a moving
    // body never jumps far along the route in one step); without one, scan all.
    let lo = 0,
      hi = n - 1;
    if (hint !== undefined && n > 1) {
      const spacing = this.samples[1].s - this.samples[0].s || 1;
      const c = Math.round(hint / spacing),
        w = Math.ceil(400 / spacing);
      lo = Math.max(0, c - w);
      hi = Math.min(n - 1, c + w);
    }
    for (let i = lo; i <= hi; i++) {
      const p = this.samples[i],
        d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    // Refine against the two segments around the best sample.
    let hit = { s: this.samples[best].s, x: this.samples[best].x, z: this.samples[best].z, d: bestD };
    for (const k of [-1, 0]) {
      const i = best + k;
      if (i < 0 || i + 1 >= n) continue;
      const a = this.samples[i],
        b = this.samples[i + 1];
      const vx = b.x - a.x,
        vz = b.z - a.z,
        l2 = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / l2));
      const px = a.x + vx * t,
        pz = a.z + vz * t,
        d = (px - x) * (px - x) + (pz - z) * (pz - z);
      if (d < hit.d) hit = { s: a.s + (b.s - a.s) * t, x: px, z: pz, d };
    }
    // A hint that leads nowhere near (a respawn, a teleport): scan everything.
    if (hint !== undefined && hit.d > 150 * 150 && hi - lo < n - 1) return this.nearest(x, z);
    const yaw = this.yawAt(hit.s);
    // Right of the line is +X when facing +Z: the sign of the cross product.
    const side = Math.sign((x - hit.x) * Math.cos(yaw) - (z - hit.z) * Math.sin(yaw));
    return { s: hit.s, dist: Math.sqrt(hit.d), side, x: hit.x, z: hit.z };
  }
  /** Distance from a point to the route's centre line. */
  distance(x: number, z: number): number {
    return this.nearest(x, z).dist;
  }
}

/** A district's route: its authored waypoints, or start → totems → exit. */
export function buildRoute(d: District): Route {
  if (d.route && d.route.length >= 2) return new Route(d.route);
  const totems = d.placements
    .filter((p) => p.id === 'prop.checkpointTotem')
    .map((p) => ({ x: p.x, z: p.z }))
    .sort((a, b) => Math.hypot(a.x - d.start.x, a.z - d.start.z) - Math.hypot(b.x - d.start.x, b.z - d.start.z));
  return new Route([{ x: d.start.x, z: d.start.z }, ...totems, { x: d.exit.x, z: d.exit.z }]);
}
