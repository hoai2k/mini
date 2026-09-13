/** Small construction kit shared by every stand-in.
 * Everything is built from three.js primitives with cel materials and an
 * inverted-hull ink outline, so a stand-in reads in the same 1970s cel style
 * as the painted 2D art while it waits for the real model.
 */
import {
  BoxGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  Object3D,
  Shape,
  SphereGeometry,
  TorusGeometry,
  BackSide,
  Color,
  Vector2,
  Vector3,
  Box3,
} from 'three';
import { makeRampTexture, makeTexture } from './textures.js';

let ramp = null;
const materials = new Map();
const outlineMaterial = new MeshBasicMaterial({ color: 0x14100f, side: BackSide });

/** Cel material for a flat colour or a named procedural texture. */
export function toon(color, { emissive = null, texture = null, repeat = 1, emissiveIntensity = 0.9 } = {}) {
  const key = `${color}|${emissive}|${texture}|${repeat}|${emissiveIntensity}`;
  if (materials.has(key)) return materials.get(key);
  if (!ramp) ramp = makeRampTexture(3);
  const m = new MeshToonMaterial({ color: new Color(color), gradientMap: ramp });
  if (emissive) {
    m.emissive = new Color(emissive);
    m.emissiveIntensity = emissiveIntensity;
  }
  if (texture) m.map = makeTexture(texture, { base: color, repeat });
  m.userData.standIn = { color, texture, emissive };
  materials.set(key, m);
  return m;
}

export const GEOMETRY = {
  box: (w, h, d) => new BoxGeometry(w, h, d),
  sphere: (r, seg = 12) => new SphereGeometry(r, seg, Math.max(6, seg >> 1)),
  cylinder: (rt, rb, h, seg = 10) => new CylinderGeometry(rt, rb, h, seg),
  cone: (r, h, seg = 8) => new ConeGeometry(r, h, seg),
  capsule: (r, len, seg = 6) => new CapsuleGeometry(r, len, seg, 10),
  torus: (r, tube, seg = 10, tub = 24, arc = Math.PI * 2) => new TorusGeometry(r, tube, seg, tub, arc),
  /** A surface of revolution from an [r, y] profile, bottom to top. */
  lathe: (profile, seg = 16) => new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), seg),
  /** A flat plate cut to a 2D outline (in the geometry's XY plane) and
   * extruded `thick` across Z, centred: fins, feathers, claws, plates. */
  fin: (points, thick = 0.2) => {
    // Wind the outline counter-clockwise so the plate's faces point outward.
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i],
        [x1, y1] = points[(i + 1) % points.length];
      area += x0 * y1 - x1 * y0;
    }
    if (area < 0) points = [...points].reverse();
    const shape = new Shape();
    points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    const geo = new ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
    geo.translate(0, 0, -thick / 2);
    return geo;
  },
};

/** A tapered outline for feathers, petals and leaves: `len` along +X,
 * `w` wide, the widest point at `peak` (0..1) along it. */
export function leafOutline(len, w, peak = 0.45, tip = 0) {
  return [[0, -w * 0.25], [len * peak, -w * 0.5], [len, -tip], [len, tip], [len * peak, w * 0.5], [0, w * 0.25]];
}

/** A curved claw or horn outline: an arc `len` long bending by `bend`
 * radians, `w` wide at the root and pointed at the tip. */
export function clawOutline(len, w, bend = 0.9, steps = 6) {
  const outer = [],
    inner = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      a = bend * t;
    const x = Math.sin(a) * (len / bend),
      y = (1 - Math.cos(a)) * (len / bend);
    // Offset either side of the arc along its normal (-sin a, cos a).
    const hw = (w * (1 - t)) / 2;
    outer.push([x - Math.sin(a) * hw, y + Math.cos(a) * hw]);
    inner.push([x + Math.sin(a) * hw, y - Math.cos(a) * hw]);
  }
  return [...outer, ...inner.reverse()];
}

const up = new Vector3(0, 1, 0);
/** A tapered strand along a curve through `points`: a tail, a tendril, a
 * coil, a neck. Built from cylinders so the radius can run from `r0` at
 * the start to `r1` at the end. Returns the segment meshes in order. */
export function strand(parent, points, r0, r1, material, { name = 'Strand', steps = 12, sides = 7, outline = true } = {}) {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'catmullrom', 0.5);
  const samples = curve.getPoints(steps);
  const out = [];
  for (let i = 0; i < steps; i++) {
    const a = samples[i],
      b = samples[i + 1],
      dir = b.clone().sub(a),
      len = dir.length();
    if (len < 1e-4) continue;
    const ra = r0 + (r1 - r0) * (i / steps),
      rb = r0 + (r1 - r0) * ((i + 1) / steps);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const m = part(parent, new CylinderGeometry(rb, ra, len * 1.08, sides), material, { name: `${name}${i}`, position: [mid.x, mid.y, mid.z], outline });
    m.quaternion.setFromUnitVectors(up, dir.normalize());
    out.push(m);
  }
  return out;
}

/** Add a named part to a parent. Rotation in radians, position in metres. */
export function part(parent, geometry, material, { name, position = [0, 0, 0], rotation = [0, 0, 0], scale = null, outline = true, castShadow = true } = {}) {
  const mesh = new Mesh(geometry, material);
  if (name) mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  if (scale) mesh.scale.set(...(Array.isArray(scale) ? scale : [scale, scale, scale]));
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  if (outline) {
    const ink = new Mesh(geometry, outlineMaterial);
    ink.name = 'ink';
    ink.scale.setScalar(1.035);
    ink.userData.ink = true;
    mesh.add(ink);
  }
  parent.add(mesh);
  return mesh;
}

/** An empty, named attachment point (a socket) — the same idea the GLBs use. */
export function socket(parent, name, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const node = new Object3D();
  node.name = name;
  node.userData.socket = true;
  node.position.set(...position);
  node.rotation.set(...rotation);
  parent.add(node);
  return node;
}

/** A named group with stand-in metadata attached. */
export function standIn(id, meta = {}) {
  const g = new Group();
  g.name = id;
  g.userData.standIn = { id, ...meta };
  return g;
}

/** Symmetric limb pair helper: builder(side) is called with +1 and -1. */
export function mirrored(builder) {
  builder(1);
  builder(-1);
}

/** World-space bounding size of any object (ink hulls excluded). */
export function measure(object) {
  object.updateWorldMatrix(true, true);
  const box = new Box3();
  object.traverse((o) => {
    if (o.isMesh && !o.userData.ink) box.expandByObject(o, true);
  });
  const size = new Vector3();
  box.getSize(size);
  return { box, size };
}

/** Names of every socket in a stand-in. */
export function socketNames(object) {
  const names = [];
  object.traverse((o) => {
    if (o.userData.socket) names.push(o.name);
  });
  return names;
}
