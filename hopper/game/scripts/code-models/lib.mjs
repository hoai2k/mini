/** Shared helpers for the code-built model builders. */
import * as THREE from 'three';

/** Triangles in a three geometry. */
export function trianglesOf(geometry) {
  return Math.floor((geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3);
}

/** Size of a hierarchy in metres, ignoring ink hulls and hidden nodes. */
export function worldBounds(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.ink || !o.visible) return;
    o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  const s = new THREE.Vector3();
  box.getSize(s);
  return s.toArray();
}

/** Drop the inverted-hull ink meshes a stand-in carries. */
export function stripInk(root) {
  const ink = [];
  root.traverse((o) => {
    if (o.userData.ink) ink.push(o);
  });
  for (const o of ink) o.parent?.remove(o);
  return root;
}

/** A mesh with a paint description the exporter turns into a material.
 * paint: { kind: 'trim', band, repeat } | { kind: 'terrain', file, repeat } | { color, emissive?, emissiveIntensity?, opacity? }
 * Extra options: detail (dropped from LOD1), name, position, rotation, scale. */
export function piece(parent, geometry, paint, { name = 'Piece', position = [0, 0, 0], rotation = [0, 0, 0], scale = null, detail = false } = {}) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: paint.color || '#ffffff' }));
  mesh.name = name;
  mesh.userData.paint = { ...paint, name: paint.name || (paint.kind === 'trim' ? `trim.${paint.band}` : paint.kind === 'terrain' ? `terrain.${paint.file.replace('.png', '')}` : paint.color) };
  mesh.userData.detail = detail;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  if (scale) mesh.scale.set(...(Array.isArray(scale) ? scale : [scale, scale, scale]));
  parent.add(mesh);
  return mesh;
}

/** Root group for a code-built model, carrying the same metadata a stand-in does. */
export function model(id, size, region, extra = {}) {
  const g = new THREE.Group();
  g.name = id;
  g.userData.standIn = { id, kind: 'structure', region, size, ...extra };
  g.userData.landings = [];
  return g;
}

/** Register a flat landing on a model, as the stand-ins do. */
export function landing(g, y, halfX, halfZ, x = 0, z = 0, label = 'roof') {
  g.userData.landings.push({ y, halfX, halfZ, x, z, label });
  socket(g, `Landing.${g.userData.landings.length - 1}`, [x, y, z]);
}
export function socket(parent, name, position = [0, 0, 0]) {
  const node = new THREE.Object3D();
  node.name = name;
  node.userData.socket = true;
  node.position.set(...position);
  parent.add(node);
  return node;
}

/** Deterministic noise for scattering detail. */
export function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Displace a geometry's vertices along their normals by a hash of position: rock and bark. */
export function roughen(geometry, amount, seed = 1, scale = 0.35) {
  geometry.computeVertexNormals();
  const p = geometry.attributes.position,
    n = geometry.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const h = Math.sin(x * scale * 1.3 + seed) * Math.cos(y * scale * 0.9 - seed) + Math.sin(z * scale * 1.7 + y * scale * 0.4);
    const d = h * 0.5 * amount;
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Flat-shaded copy (each face its own vertices) so blocks read as cut stone. */
export function faceted(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  return g;
}

/** A closed lathe profile around Y: points as [radius, y]. */
export function lathe(points, segments = 10) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

/** A coarser copy of a parametric three geometry (fewer segments), for LOD1
 * builds of stand-in geometry that has no hand-authored distant version. */
export function decimate(geometry) {
  const p = geometry.parameters;
  const t = geometry.type;
  const seg = (n, min) => Math.max(min, Math.round(n * 0.5));
  switch (t) {
    case 'CylinderGeometry':
      return new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, seg(p.radialSegments, 4), 1, p.openEnded, p.thetaStart, p.thetaLength);
    case 'ConeGeometry':
      return new THREE.ConeGeometry(p.radius, p.height, seg(p.radialSegments, 4), 1, p.openEnded, p.thetaStart, p.thetaLength);
    case 'SphereGeometry':
      return new THREE.SphereGeometry(p.radius, seg(p.widthSegments, 5), seg(p.heightSegments, 3), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    case 'TorusGeometry':
      return new THREE.TorusGeometry(p.radius, p.tube, seg(p.radialSegments, 3), seg(p.tubularSegments, 8), p.arc);
    case 'CapsuleGeometry':
      return new THREE.CapsuleGeometry(p.radius, p.length ?? p.height, Math.max(1, Math.round((p.capSegments ?? 4) / 2)), seg(p.radialSegments ?? 8, 4));
    case 'IcosahedronGeometry':
      return new THREE.IcosahedronGeometry(p.radius, Math.max(0, (p.detail ?? 0) - 1));
    case 'DodecahedronGeometry':
      return new THREE.DodecahedronGeometry(p.radius, Math.max(0, (p.detail ?? 0) - 1));
    case 'LatheGeometry':
      return new THREE.LatheGeometry(p.points, seg(p.segments, 4), p.phiStart, p.phiLength);
    case 'BoxGeometry':
      return new THREE.BoxGeometry(p.width, p.height, p.depth, 1, 1, 1);
    case 'PlaneGeometry':
      return new THREE.PlaneGeometry(p.width, p.height, 1, 1);
    default:
      return geometry;
  }
}

/** LOD1 of a stand-in: parametric pieces coarsened, and the small pieces
 * (under a fraction of the largest piece's volume) dropped. */
export function coarsen(root, fraction = 0.06) {
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.ink) meshes.push(o);
  });
  const volumes = meshes.map((m) => {
    m.geometry.computeBoundingBox();
    const s = new THREE.Vector3();
    m.geometry.boundingBox.getSize(s).multiply(m.getWorldScale(new THREE.Vector3()));
    return Math.max(1e-6, s.x) * Math.max(1e-6, s.y) * Math.max(1e-6, s.z);
  });
  const largest = Math.max(...volumes);
  const before = meshes.reduce((n, m) => n + trianglesOf(m.geometry), 0);
  meshes.forEach((m, i) => {
    if (volumes[i] < largest * fraction && meshes.length > 1) m.userData.detail = true;
    else {
      // Stand-ins never bake transforms into their geometry, so a rebuilt
      // parametric geometry drops straight into the mesh.
      const g = decimate(m.geometry);
      if (g !== m.geometry) m.geometry = g;
    }
  });
  // Boxes cannot be coarsened: as a last resort drop the smallest pieces until
  // the distant version is lighter than the full one.
  const remaining = () => meshes.filter((m) => !m.userData.detail);
  while (remaining().length > 1 && remaining().reduce((n, m) => n + trianglesOf(m.geometry), 0) >= before) {
    const smallest = remaining().sort((a, b) => volumes[meshes.indexOf(a)] - volumes[meshes.indexOf(b)])[0];
    smallest.userData.detail = true;
  }
  return root;
}
