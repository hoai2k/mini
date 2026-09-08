/** Stand-in landscape: a painted heightfield, a ring of distant mountains and
 * a sky dome. The heightfield exposes heightAt(x, z) so gameplay code can
 * stand on it, and the same function drives the vertex colours, so what the
 * player sees and what they land on cannot disagree.
 */
import {
  BackSide,
  BufferAttribute,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  SphereGeometry,
  FogExp2,
} from 'three';
import { fbm, makeRampTexture, makeSkyTexture, cel } from './textures.js';
import { GEOMETRY as G, part, standIn, toon } from './kit.js';

/** Height function shared by the mesh and the collision query. */
export function makeHeightField({ size = 2400, seed = 7, relief = 60, plateaus = [], valley = null } = {}) {
  return function heightAt(x, z) {
    const u = x / size + 0.5,
      v = z / size + 0.5;
    let h = (fbm(u * 6, v * 6, 6, seed, 5) - 0.45) * relief * 2;
    // Broad ridges give the horizon shape; fine noise gives the brush texture.
    h += (fbm(u * 2, v * 2, 2, seed + 31, 2) - 0.5) * relief * 1.5;
    for (const p of plateaus) {
      const d = Math.hypot(x - p.x, z - p.z),
        t = 1 - Math.min(1, Math.max(0, (d - p.r) / (p.r * 0.5 + 1)));
      h = h + (p.y - h) * t * t;
    }
    if (valley) {
      const d = Math.abs(valley.axis === 'x' ? z - valley.at : x - valley.at),
        t = 1 - Math.min(1, d / valley.width);
      h -= t * t * valley.depth;
    }
    return h;
  };
}

/** Terrain mesh coloured by height and slope in a few flat gouache tones. */
export function makeTerrain(region, { size = 2400, segments = 96, seed = 7, relief = 60, plateaus = [], valley = null } = {}) {
  const heightAt = makeHeightField({ size, seed, relief, plateaus, valley });
  const geo = new PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position,
    colors = new Float32Array(pos.count * 3);
  // Vertex colours are linear in three.js; Color converts the sRGB hex for us.
  const ground = new Color(region.ground).toArray(),
    accent = new Color(region.accent).toArray(),
    haze = new Color(region.haze).toArray();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      y = heightAt(x, z);
    pos.setY(i, y);
    const slope = Math.abs(heightAt(x + 4, z) - y) + Math.abs(heightAt(x, z + 4) - y);
    const t = cel(Math.min(1, Math.max(0, (y + relief) / (relief * 3))), 4);
    const rock = Math.min(1, slope / 6);
    for (let k = 0; k < 3; k++) {
      const flat = ground[k] * (0.9 + t * 0.5) + accent[k] * t * 0.15;
      colors[i * 3 + k] = Math.min(1, flat * (1 - rock * 0.6) + haze[k] * 0.35 * rock);
    }
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new Mesh(geo, new MeshToonMaterial({ vertexColors: true, gradientMap: makeRampTexture(3) }));
  mesh.name = 'terrain.heightfield';
  mesh.receiveShadow = true;
  mesh.userData.standIn = { id: 'terrain.heightfield', kind: 'terrain', size: [size, relief * 3, size], region: region.id };
  mesh.userData.heightAt = heightAt;
  return mesh;
}

/** Distant mountain ring: flat silhouettes in the haze colour, never reachable. */
export function makeHorizon(region, { radius = 5000, peaks = 18, seed = 3, height = 900, gap = null } = {}) {
  const g = standIn('terrain.horizon', { kind: 'terrain', region: region.id, size: [radius * 2, height, radius * 2] });
  const near = new Color(region.haze).lerp(new Color(region.ground), 0.35),
    far = new Color(region.haze).lerp(new Color(region.sky), 0.45);
  for (let ring = 0; ring < 2; ring++) {
    const r = radius * (1 + ring * 0.35),
      colour = ring ? far : near;
    for (let i = 0; i < peaks; i++) {
      const a = (i / peaks) * Math.PI * 2 + ring * 0.17;
      if (gap && Math.abs(((a - gap.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < gap.width) continue;
      const h = height * (0.5 + fbm(i * 0.37, ring, 8, seed, 2)) * (ring ? 1.3 : 1);
      const w = r * 0.32 * (0.6 + fbm(i * 0.11, ring + 5, 8, seed, 2));
      part(g, G.cone(w, h, 4), new MeshBasicMaterial({ color: colour, fog: true }), { name: `Peak${ring}_${i}`, position: [Math.cos(a) * r, h * 0.5 - 80, Math.sin(a) * r], rotation: [0, a, 0], outline: false, castShadow: false });
    }
  }
  return g;
}

/** Sky dome with the painted gradient and sun, drawn from the inside. */
export function makeSkyDome(region, { radius = 9000 } = {}) {
  const mesh = new Mesh(new SphereGeometry(radius, 32, 16), new MeshBasicMaterial({ map: makeSkyTexture(region), side: BackSide, fog: false, depthWrite: false }));
  mesh.name = 'terrain.sky';
  mesh.userData.standIn = { id: 'terrain.sky', kind: 'terrain', region: region.id, size: [radius * 2, radius * 2, radius * 2] };
  return mesh;
}

/** The far landmark for a region: a big simple silhouette on the horizon that
 * the player is walking toward. It is a shape, not a level piece. */
export function makeLandmark(region, { distance = 3200 } = {}) {
  const g = standIn('terrain.landmark', { kind: 'terrain', region: region.id, landmark: region.landmark, size: [400, 600, 400] });
  const m = toon(new Color(region.haze).lerp(new Color(region.ground), 0.5).getStyle());
  switch (region.landmark) {
    case 'crownlineSkyline':
      for (let i = 0; i < 9; i++) part(g, G.box(50 + (i % 3) * 20, 200 + fbm(i, 0, 9, 4, 2) * 400, 50), m, { name: `Tower${i}`, position: [(i - 4) * 90, 100 + fbm(i, 0, 9, 4, 2) * 200, 0], outline: false });
      break;
    case 'thunderheadSummit':
      part(g, G.cone(500, 900, 5), m, { name: 'Summit', position: [0, 350, 0], outline: false });
      part(g, G.cylinder(6, 8, 260, 6), m, { name: 'Mast', position: [0, 900, 0], outline: false });
      break;
    case 'transmitterMast':
      part(g, G.cylinder(10, 16, 400, 6), m, { name: 'Mast', position: [0, 200, 0], outline: false });
      part(g, G.sphere(16, 10), toon('#fff1c2', { emissive: '#ffd27a', emissiveIntensity: 1 }), { name: 'Beacon', position: [0, 410, 0], outline: false });
      break;
    case 'craneForest':
      for (let i = 0; i < 7; i++) part(g, G.box(14, 300 + (i % 2) * 80, 14), m, { name: `Crane${i}`, position: [(i - 3) * 110, 150, (i % 2) * 120], outline: false });
      break;
    case 'launchSpine':
      part(g, G.cylinder(40, 60, 700, 8), m, { name: 'Spine', position: [0, 350, 0], outline: false });
      part(g, G.torus(150, 14, 8, 24), m, { name: 'Ring', position: [0, 650, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
      break;
    case 'starGate':
      part(g, G.torus(220, 24, 8, 32), m, { name: 'Gate', position: [0, 420, 0], outline: false });
      part(g, G.cylinder(200, 200, 4, 32), toon('#fff3d2', { emissive: '#ffd38c', emissiveIntensity: 1 }), { name: 'Portal', position: [0, 420, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
      break;
    case 'blackSun':
      part(g, G.cylinder(180, 180, 4, 40), toon('#0a0508'), { name: 'BlackSun', position: [0, 900, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
      part(g, G.torus(190, 8, 8, 48), toon('#ff8a6a', { emissive: '#ff5a3a', emissiveIntensity: 1 }), { name: 'Corona', position: [0, 900, 0], outline: false });
      break;
    case 'driftMoon':
      part(g, G.sphere(420, 20), toon('#5e7fb0'), { name: 'Moon', position: [0, 900, 0], outline: false });
      break;
    case 'eclipseCathedral':
      part(g, G.box(360, 300, 120), m, { name: 'Nave', position: [0, 150, 0], outline: false });
      for (let i = 0; i < 2; i++) part(g, G.cone(30, 200, 5), m, { name: `Spire${i}`, position: [(i ? 1 : -1) * 150, 400, 0], outline: false });
      part(g, G.torus(90, 5, 6, 40), toon('#e5b8ff', { emissive: '#a56cff', emissiveIntensity: 1 }), { name: 'Corona', position: [0, 420, -20], outline: false });
      break;
  }
  g.position.set(0, 0, -distance);
  return g;
}

/** Region fog that matches the painted haze band. */
export function makeFog(region, density = 0.00022) {
  return new FogExp2(new Color(region.haze).lerp(new Color(region.sky), 0.5), density);
}
