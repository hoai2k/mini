// Small geometry helpers: closed tubes along curves (with the axis point of
// every vertex as `aRef`), segment distances, a seeded random source.
import * as THREE from '../shared/vendor/three.module.min.js';

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** A closed tube (capped) of radius r along a curve; aRef = the curve point. */
export function closedTube(curve, segs, r, radial = 16) {
  const fr = curve.computeFrenetFrames(segs, false);
  const pos = [], ref = [], nrm = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const p = curve.getPointAt(i / segs), N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      nrm.push(n.x, n.y, n.z);
      ref.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = a + radial, d = b + radial;
    idx.push(a, b, c, b, d, c);
  }
  // caps
  for (const [i, sgn] of [[0, -1], [segs, 1]]) {
    const p = curve.getPointAt(i / segs), t = fr.tangents[i];
    const ci = pos.length / 3;
    pos.push(p.x, p.y, p.z); nrm.push(t.x * sgn, t.y * sgn, t.z * sgn); ref.push(p.x, p.y, p.z);
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial);
      if (sgn < 0) idx.push(ci, b, a); else idx.push(ci, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aRef', new THREE.Float32BufferAttribute(ref, 3));
  g.setIndex(idx);
  return { geo: g, frames: fr };
}

/** Add aRef = projection onto the local x axis (for elongated bodies). */
export function axisRef(geo, clampX = Infinity) {
  const p = geo.attributes.position;
  const ref = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) ref[i * 3] = Math.max(-clampX, Math.min(clampX, p.getX(i)));
  geo.setAttribute('aRef', new THREE.BufferAttribute(ref, 3));
  return geo;
}
/** aRef along the local y axis. */
export function yAxisRef(geo, lo = -Infinity, hi = Infinity) {
  const p = geo.attributes.position;
  const ref = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) ref[i * 3 + 1] = Math.max(lo, Math.min(hi, p.getY(i)));
  geo.setAttribute('aRef', new THREE.BufferAttribute(ref, 3));
  return geo;
}

const _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _r = new THREE.Vector3();
/**
 * Closest points between segments p1–q1 and p2–q2. Writes them to c1, c2 and
 * returns the distance.
 */
export function segSeg(p1, q1, p2, q2, c1, c2) {
  _d1.subVectors(q1, p1); _d2.subVectors(q2, p2); _r.subVectors(p1, p2);
  const a = _d1.dot(_d1), e = _d2.dot(_d2), f = _d2.dot(_r);
  let s, t;
  if (a <= 1e-9 && e <= 1e-9) { s = t = 0; }
  else if (a <= 1e-9) { s = 0; t = Math.min(1, Math.max(0, f / e)); }
  else {
    const c = _d1.dot(_r);
    if (e <= 1e-9) { t = 0; s = Math.min(1, Math.max(0, -c / a)); }
    else {
      const b = _d1.dot(_d2), den = a * e - b * b;
      s = den !== 0 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); }
      else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
    }
  }
  c1.copy(p1).addScaledVector(_d1, s);
  c2.copy(p2).addScaledVector(_d2, t);
  return c1.distanceTo(c2);
}

/** Closest point on segment a–b to p, written to out. */
export function closestOnSeg(p, a, b, out) {
  _d1.subVectors(b, a);
  const t = Math.min(1, Math.max(0, _r.subVectors(p, a).dot(_d1) / Math.max(_d1.lengthSq(), 1e-9)));
  return out.copy(a).addScaledVector(_d1, t);
}

/** Smooth value noise in 3D, for displacing flakes. */
export function noise3(x, y, z) {
  const h = (i, j, k) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(ix, iy, iz), h(ix + 1, iy, iz), u), l(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), u), v),
    l(l(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), u), l(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), u), v), w);
}
