/** Small construction kit shared by every stand-in.
 * Everything is built from three.js primitives with cel materials and an
 * inverted-hull ink outline, so a stand-in reads in the same 1970s cel style
 * as the painted 2D art while it waits for the real model.
 */
import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  BackSide,
  Color,
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
  torus: (r, tube, seg = 10, tub = 24) => new TorusGeometry(r, tube, seg, tub),
};

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
