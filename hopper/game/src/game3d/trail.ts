/** The trail: the route made visible. A painted ribbon laid over the ground
 * along the district's route, climbing whatever the route climbs; stones
 * along both edges; lit waymarkers every so often; and, standing back from
 * the edges, the tall things (trees, pylons, spires) that make Hopper's own
 * size and the distance ahead read. Picture only: nothing here is solid.
 */
import { BackSide, BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshToonMaterial, Quaternion, SphereGeometry, Vector3, type BufferGeometry as Geometry } from 'three';
import { makeRampTexture } from '../../../3d/standins/src/textures.js';
import { SURFACE } from '../../../3d/standins/src/palette.js';
import type { World } from './world';
import { painting } from './textures3d';

/** Half the ribbon's width in metres: wide enough for a 14 m grasshopper. */
export const TRAIL_HALF_WIDTH = 11;

const ramp = makeRampTexture(3);
const ink = new MeshBasicMaterial({ color: 0x14100f, side: BackSide });
const toon = (color: string, emissive?: string) => {
  const m = new MeshToonMaterial({ color: new Color(color), gradientMap: ramp });
  if (emissive) {
    m.emissive = new Color(emissive);
    m.emissiveIntensity = 0.9;
  }
  return m;
};

/** A deterministic 0..1 sequence, so a district always dresses the same way. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Part {
  geometry: Geometry;
  material: MeshToonMaterial;
  /** Local transform inside the prop: position, y-rotation, scale. */
  at: [number, number, number];
  scale: [number, number, number];
}
/** A prop template: parts in a 1 m frame, scaled per instance. */
type Template = Part[];

/** The tall side props of each region, authored at unit height 1. */
function templates(region: string): { big: Template[]; small: Template[] } {
  const p = (geometry: Geometry, material: MeshToonMaterial, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]): Part => ({ geometry, material, at, scale });
  const trunk = toon(SURFACE.wood),
    crown = toon(SURFACE.grassDeep),
    crownLight = toon(SURFACE.grass),
    rock = toon(SURFACE.slate),
    rockDark = toon(SURFACE.basalt),
    ivory = toon(SURFACE.ivory),
    ivoryShade = toon(SURFACE.ivoryShade),
    iron = toon(SURFACE.iron),
    hay = toon('#c9a45a');
  // Trees: a trunk and two stacked crowns, ~1 tall.
  const tree: Template = [p(new CylinderGeometry(0.03, 0.045, 0.4, 7), trunk, [0, 0.2, 0]), p(new ConeGeometry(0.2, 0.5, 8), crown, [0, 0.55, 0]), p(new ConeGeometry(0.14, 0.4, 8), crownLight, [0, 0.8, 0])];
  const pine: Template = [p(new CylinderGeometry(0.025, 0.04, 0.35, 7), trunk, [0, 0.175, 0]), p(new ConeGeometry(0.22, 0.42, 8), crown, [0, 0.45, 0]), p(new ConeGeometry(0.16, 0.36, 8), crown, [0, 0.7, 0]), p(new ConeGeometry(0.1, 0.3, 8), crownLight, [0, 0.9, 0])];
  const haystack: Template = [p(new SphereGeometry(0.5, 10, 7), hay, [0, 0.45, 0], [1, 0.95, 1]), p(new CylinderGeometry(0.42, 0.5, 0.3, 10), hay, [0, 0.15, 0])];
  const fencePost: Template = [p(new BoxGeometry(0.12, 1, 0.12), trunk, [0, 0.5, 0]), p(new BoxGeometry(0.08, 0.1, 3), trunk, [0, 0.72, 0])];
  // City: pylons with a lit band, lamp posts, and low kiosks with a parapet.
  const pylon: Template = [p(new BoxGeometry(0.12, 1, 0.12), ivory, [0, 0.5, 0]), p(new BoxGeometry(0.16, 0.06, 0.16), toon('#ffd27a', '#ffd27a'), [0, 0.86, 0]), p(new BoxGeometry(0.2, 0.05, 0.2), ivoryShade, [0, 0.025, 0])];
  const lamp: Template = [p(new CylinderGeometry(0.03, 0.05, 1, 7), iron, [0, 0.5, 0]), p(new SphereGeometry(0.11, 10, 7), toon('#fff3d2', '#ffd27a'), [0, 1.02, 0])];
  const kiosk: Template = [p(new BoxGeometry(1, 0.6, 1), ivory, [0, 0.3, 0]), p(new BoxGeometry(1.06, 0.08, 1.06), ivoryShade, [0, 0.62, 0]), p(new BoxGeometry(0.6, 0.3, 0.05), toon(SURFACE.tealGlass), [0, 0.3, 0.51])];
  // Mountains: rock spires, boulders and cairns.
  const spire: Template = [p(new ConeGeometry(0.22, 1, 7), rock, [0, 0.5, 0]), p(new ConeGeometry(0.12, 0.45, 6), rockDark, [0.12, 0.3, 0.08])];
  const boulder: Template = [p(new SphereGeometry(0.5, 7, 5), rock, [0, 0.35, 0], [1, 0.7, 0.9]), p(new SphereGeometry(0.3, 6, 4), rockDark, [0.35, 0.2, 0.2], [1, 0.6, 1])];
  const cairn: Template = [p(new SphereGeometry(0.5, 7, 5), rock, [0, 0.3, 0], [1, 0.5, 1]), p(new SphereGeometry(0.36, 7, 5), rockDark, [0, 0.65, 0], [1, 0.5, 1]), p(new SphereGeometry(0.22, 6, 4), rock, [0, 0.9, 0], [1, 0.6, 1])];
  switch (region) {
    case 'city':
      return { big: [pylon, pylon, lamp], small: [kiosk, lamp] };
    case 'mountains':
      return { big: [spire, spire, pine], small: [boulder, cairn] };
    default:
      return { big: [tree, tree, pine], small: [haystack, fencePost] };
  }
}

/** The ink hull that every stand-in part carries, for one-off meshes. */
function outlineOf(mesh: Mesh): Mesh {
  const shell = new Mesh(mesh.geometry, ink);
  shell.position.copy(mesh.position);
  shell.rotation.copy(mesh.rotation);
  shell.scale.copy(mesh.scale).multiplyScalar(1.035);
  return shell;
}

/** Every instance of a template, drawn as one InstancedMesh per part. */
class Batch {
  private matrices: Matrix4[][] = [];
  constructor(readonly template: Template) {
    for (let i = 0; i < template.length; i++) this.matrices.push([]);
  }
  add(x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number) {
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    const root = new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
    this.template.forEach((part, i) => {
      const local = new Matrix4().compose(new Vector3(...part.at), new Quaternion(), new Vector3(...part.scale));
      this.matrices[i].push(root.clone().multiply(local));
    });
  }
  build(into: Group) {
    this.template.forEach((part, i) => {
      const list = this.matrices[i];
      if (!list.length) return;
      const mesh = new InstancedMesh(part.geometry, part.material, list.length);
      const shell = new InstancedMesh(part.geometry, ink, list.length);
      const grown = new Matrix4();
      list.forEach((m, k) => {
        mesh.setMatrixAt(k, m);
        // The ink outline: the same instance, a touch larger, back faces only.
        grown.copy(m).scale(new Vector3(1.035, 1.035, 1.035));
        shell.setMatrixAt(k, grown);
      });
      mesh.instanceMatrix.needsUpdate = true;
      shell.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      shell.frustumCulled = false;
      into.add(mesh, shell);
    });
  }
}

/** Build the trail's picture for a district. */
export function buildTrail(world: World): Group {
  const group = new Group();
  group.name = 'trail';
  const route = world.route,
    d = world.district,
    region = world.region;
  const random = rng(d.terrain.seed * 7919 + 13);
  // Surface height under the trail: terrain, or a low structure top the
  // route climbs (a terrace tier, a shelf) but never a deck 30 m overhead.
  const surface = (x: number, z: number) => {
    const t = world.heightAt(x, z);
    return world.groundAt(x, z, t + 30).y;
  };
  const right = (yaw: number): [number, number] => [Math.cos(yaw), -Math.sin(yaw)];

  // --- The ribbon -------------------------------------------------------
  const n = route.samples.length;
  const pos = new Float32Array(n * 2 * 3),
    uv = new Float32Array(n * 2 * 2),
    col = new Float32Array(n * 2 * 3);
  const base = new Color(region.ground).lerp(new Color(region.haze), 0.55);
  for (let i = 0; i < n; i++) {
    const s = route.samples[i],
      [rx, rz] = right(s.yaw);
    for (const side of [-1, 1]) {
      const k = i * 2 + (side < 0 ? 0 : 1);
      const x = s.x + rx * side * TRAIL_HALF_WIDTH,
        z = s.z + rz * side * TRAIL_HALF_WIDTH;
      pos[k * 3] = x;
      pos[k * 3 + 1] = surface(x, z) + 0.45;
      pos[k * 3 + 2] = z;
      uv[k * 2] = side < 0 ? 0 : 1;
      uv[k * 2 + 1] = s.s / 40;
      col[k * 3] = base.r;
      col[k * 3 + 1] = base.g;
      col[k * 3 + 2] = base.b;
    }
  }
  const index: number[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const a = i * 2,
      b = a + 1,
      c = a + 2,
      e = a + 3;
    index.push(a, c, b, b, c, e);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('uv', new BufferAttribute(uv, 2));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const ribbonMaterial = new MeshToonMaterial({ color: new Color('#ffffff'), vertexColors: true, gradientMap: ramp, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const ribbon = new Mesh(geo, ribbonMaterial);
  ribbon.name = 'TrailRibbon';
  ribbon.receiveShadow = true;
  group.add(ribbon);
  // The painted path plate, when the region has one; the flat tone until then.
  void painting(`terrain/${region.id}/path.png`, { repeat: 1 }).then((tex) => {
    if (!tex) return;
    ribbonMaterial.map = tex;
    ribbonMaterial.vertexColors = false;
    ribbonMaterial.needsUpdate = true;
  });

  // --- Keep-out: structures, gates, the arena --------------------------
  const keepOut: { x: number; z: number; r: number }[] = [];
  for (const p of d.placements) keepOut.push({ x: p.x, z: p.z, r: p.id.startsWith('structure.') ? 75 : 26 });
  for (const g of d.gates || []) keepOut.push({ x: g.x, z: g.z, r: g.r + 10 });
  if (d.boss) keepOut.push({ x: d.boss.x, z: d.boss.z, r: d.boss.r + 20 });
  for (const c of d.cages || []) keepOut.push({ x: c.x, z: c.z, r: 30 });
  const clear = (x: number, z: number, margin = 0) => keepOut.every((k) => Math.hypot(k.x - x, k.z - z) > k.r + margin);
  const slopeAt = (x: number, z: number) => Math.abs(world.heightAt(x + 4, z) - world.heightAt(x - 4, z)) + Math.abs(world.heightAt(x, z + 4) - world.heightAt(x, z - 4));

  // --- Edge stones and waymarkers ---------------------------------------
  const stone = new Batch([{ geometry: new SphereGeometry(0.5, 6, 4), material: toon(region.id === 'city' ? SURFACE.ivoryShade : SURFACE.slate), at: [0, 0.3, 0], scale: [1, 0.7, 0.85] }]);
  const marker = new Batch([
    { geometry: new CylinderGeometry(0.35, 0.5, 1, 7), material: toon(region.id === 'mountains' ? SURFACE.slate : region.id === 'city' ? SURFACE.iron : SURFACE.wood), at: [0, 0.5, 0], scale: [1, 1, 1] },
    { geometry: new SphereGeometry(0.42, 10, 7), material: toon(region.accent, region.accent), at: [0, 1.15, 0], scale: [1, 1, 1] },
    { geometry: new BoxGeometry(0.9, 0.35, 0.06), material: toon('#c8352b'), at: [0.55, 0.8, 0], scale: [1, 1, 1] },
  ]);
  for (let s = 8, i = 0; s < route.length - 8; s += 9, i++) {
    const p = route.pointAt(s),
      [rx, rz] = right(p.yaw);
    const side = i % 2 ? 1 : -1;
    const off = TRAIL_HALF_WIDTH + 1.5 + random() * 2.5;
    const x = p.x + rx * side * off,
      z = p.z + rz * side * off;
    if (!clear(x, z)) continue;
    const size = 1.2 + random() * 1.8;
    stone.add(x, surface(x, z) - 0.2, z, random() * Math.PI * 2, size, size * (0.8 + random() * 0.5), size);
  }
  for (let s = 40, i = 0; s < route.length - 30; s += 55, i++) {
    const p = route.pointAt(s),
      [rx, rz] = right(p.yaw);
    const side = i % 2 ? 1 : -1;
    const off = TRAIL_HALF_WIDTH + 6;
    const x = p.x + rx * side * off,
      z = p.z + rz * side * off;
    if (!clear(x, z)) continue;
    // A 7 m post: the lamp on it sits at Hopper's eye height.
    marker.add(x, surface(x, z), z, p.yaw + (side < 0 ? Math.PI : 0), 7, 7, 7);
  }

  // --- The tall things beside the trail --------------------------------
  const kinds = templates(region.id);
  const bigBatches = kinds.big.map((t) => new Batch(t)),
    smallBatches = kinds.small.map((t) => new Batch(t));
  const bigHeight = region.id === 'city' ? [52, 80] : region.id === 'mountains' ? [38, 78] : [26, 46];
  for (let s = 20, i = 0; s < route.length - 20; s += 24, i++) {
    const p = route.pointAt(s),
      [rx, rz] = right(p.yaw);
    for (const side of [-1, 1]) {
      // Every stretch gets something on one side or both; the far ones stand
      // back to 95 m so the trail reads as a road through a wide country.
      if (random() < 0.3) continue;
      const big = random() < 0.55;
      const off = big ? 34 + random() * 60 : 22 + random() * 24;
      const x = p.x + rx * side * off,
        z = p.z + rz * side * off;
      if (!clear(x, z, big ? 12 : 0) || slopeAt(x, z) > (big ? 5 : 8)) continue;
      // Never on the trail itself where it doubles back: keep off the line.
      if (route.distance(x, z) < TRAIL_HALF_WIDTH + (big ? 14 : 6)) continue;
      const y = surface(x, z) - 0.3,
        yaw = random() * Math.PI * 2;
      if (big) {
        const h = bigHeight[0] + random() * (bigHeight[1] - bigHeight[0]);
        const w = h * (0.7 + random() * 0.5);
        bigBatches[Math.floor(random() * bigBatches.length)].add(x, y, z, yaw, w, h, w);
      } else {
        const h = 6 + random() * 9;
        const w = region.id === 'city' ? h * 1.6 : region.id === 'fields' ? h * (0.9 + random() * 0.3) : h * (1.1 + random() * 0.6);
        smallBatches[Math.floor(random() * smallBatches.length)].add(x, y, z, region.id === 'fields' && random() < 0.5 ? p.yaw : yaw, w, h, w);
      }
    }
  }
  // --- The threshold: the way on, marked where the district ends. Two pylons
  // and a lintel across the trail with a warm curtain between them, so leaving
  // is something Hopper jumps through rather than a line he trips over.
  {
    const exit = d.exit;
    const hit = route.nearest(exit.x, exit.z);
    const yaw = route.yawAt(hit.s);
    const ground = surface(exit.x, exit.z);
    const halfW = 24,
      height = 46;
    const post = toon(region.id === 'city' ? SURFACE.ivory : region.id === 'mountains' ? SURFACE.slate : SURFACE.wood);
    const trim = toon(region.accent, region.accent);
    const gate = new Group();
    gate.position.set(exit.x, ground, exit.z);
    gate.rotation.y = yaw;
    for (const side of [-1, 1]) {
      const leg = new Mesh(new CylinderGeometry(2.4, 4.2, height, 8), post);
      leg.position.set(side * halfW, height / 2, 0);
      gate.add(leg, outlineOf(leg));
      const lamp = new Mesh(new SphereGeometry(2.6, 12, 8), trim);
      lamp.position.set(side * halfW, height + 2, 0);
      gate.add(lamp);
    }
    const lintel = new Mesh(new BoxGeometry(halfW * 2 + 8, 3.4, 3.4), post);
    lintel.position.set(0, height, 0);
    gate.add(lintel, outlineOf(lintel));
    // The sign over the road: the way on, in the region's own colour.
    const sign = new Mesh(new BoxGeometry(halfW * 1.3, 7, 0.8), trim);
    sign.position.set(0, height - 6, 0);
    gate.add(sign);
    const curtain = new Mesh(new BoxGeometry(halfW * 2, height - 4, 0.4), new MeshBasicMaterial({ color: region.accent, transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false }));
    curtain.position.set(0, (height - 4) / 2, 0);
    gate.add(curtain);
    // The way on is lit from the ground up.
    const glow = new Mesh(new BoxGeometry(halfW * 2, 1.2, TRAIL_HALF_WIDTH * 2), new MeshBasicMaterial({ color: region.accent, transparent: true, opacity: 0.5, depthWrite: false }));
    glow.position.set(0, 0.7, 0);
    gate.add(glow);
    group.add(gate);
  }

  // --- The middle distance: clumps of the same things, 120-430 m out, taller,
  // so the country carries on past the props at the trail's shoulder instead
  // of ending in bare ground.
  for (let s = 30, i = 0; s < route.length; s += 34, i++) {
    const p = route.pointAt(s + random() * 30);
    for (const side of [-1, 1]) {
      if (random() < 0.2) continue;
      const off = (120 + random() * 310) * side;
      const cx = p.x + Math.cos(p.yaw) * off,
        cz = p.z - Math.sin(p.yaw) * off;
      if (!clear(cx, cz, 20)) continue;
      // A clump, not a lone thing: two to five of a kind around the point.
      const batch = bigBatches[Math.floor(random() * bigBatches.length)];
      const count = 2 + Math.floor(random() * 4);
      for (let k = 0; k < count; k++) {
        const a = random() * Math.PI * 2,
          rad = random() * 60;
        const x = cx + Math.cos(a) * rad,
          z = cz + Math.sin(a) * rad;
        if (!clear(x, z, 8) || slopeAt(x, z) > 9) continue;
        const h = bigHeight[0] * (0.9 + random() * 0.8) + random() * (bigHeight[1] - bigHeight[0]);
        const w = h * (0.6 + random() * 0.5);
        batch.add(x, surface(x, z) - 0.4, z, random() * Math.PI * 2, w, h, w);
      }
    }
  }
  for (const b of [stone, marker, ...bigBatches, ...smallBatches]) b.build(group);
  return group;
}
