/** The painted texture pack (hopper/3d/textures) applied over the stand-ins.
 * Everything loads lazily and fails soft: if a painting is missing the
 * stand-in stays. Materials are swapped by the name the stand-in painted
 * itself with (kit.js records it), so delivered art needs no model changes.
 */
import {
  ClampToEdgeWrapping,
  Color,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NoColorSpace,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Texture,
  TextureLoader,
  DoubleSide,
  BufferAttribute,
  Vector3,
  type Wrapping,
} from 'three';
import { makeRampTexture } from '../../../3d/standins/src/textures.js';
import type { District } from './district';
import type { Route } from './route';

export const TEXTURE_BASE = './3d/textures/';

const loader = new TextureLoader();
const cache = new Map<string, Promise<Texture | null>>();

/** Load a painting once; resolves null when it is not there. */
export function painting(path: string, { srgb = true, repeat = 1, wrapS = RepeatWrapping as Wrapping, wrapT = RepeatWrapping as Wrapping, anisotropy = 8 }: { srgb?: boolean; repeat?: number; wrapS?: Wrapping; wrapT?: Wrapping; anisotropy?: number } = {}): Promise<Texture | null> {
  const key = `${path}|${srgb}|${repeat}|${wrapS}|${wrapT}`;
  if (!cache.has(key))
    cache.set(
      key,
      loader
        .loadAsync(TEXTURE_BASE + path)
        .then((t) => {
          t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
          t.wrapS = wrapS;
          t.wrapT = wrapT;
          t.repeat.set(repeat, repeat);
          t.anisotropy = anisotropy;
          t.minFilter = LinearMipmapLinearFilter;
          t.magFilter = LinearFilter;
          t.needsUpdate = true;
          return t;
        })
        .catch(() => null),
    );
  return cache.get(key)!;
}

/** Trim sheets are eight equal horizontal bands, top to bottom. */
const TRIM_BANDS: Record<string, string[]> = {
  fields: ['ivory', 'tile', 'timber', 'concrete', 'ivory', 'tile', 'timber', 'concrete'],
  city: ['ivory', 'glass', 'rail', 'billboard', 'ivory', 'glass', 'rail', 'billboard'],
  mountains: ['slate', 'timber', 'iron', 'slate', 'slate', 'timber', 'iron', 'slate'],
  foundry: ['iron', 'rust', 'brick', 'iron', 'iron', 'rust', 'brick', 'iron'],
  harbor: ['steel', 'container', 'crane', 'steel', 'steel', 'container', 'crane', 'steel'],
  launchworks: ['rust', 'rocket', 'brass', 'rust', 'rust', 'rocket', 'brass', 'rust'],
  red: ['coral', 'bone', 'coral', 'bone', 'coral', 'bone', 'coral', 'bone'],
  blue: ['reef', 'crystal', 'reef', 'crystal', 'reef', 'crystal', 'reef', 'crystal'],
  violet: ['obsidian', 'seam', 'ringstone', 'obsidian', 'obsidian', 'seam', 'ringstone', 'obsidian'],
};

/** Which trim band (or terrain painting) a stand-in material maps to, by the
 * colour and procedural texture it was painted with. Region kits only. */
function bandFor(region: string, meta: { color: string; texture: string | null }): { kind: 'trim'; band: string } | { kind: 'terrain'; file: string; repeat: number } | { kind: 'surface'; file: string; repeat: number } | null {
  const { color, texture } = meta;
  // Round-three surfaces: the slag barge's glowing deck, the drift's dust volumes.
  if (region === 'foundry' && color === '#ff7a22') return { kind: 'surface', file: 'slag.png', repeat: 2 };
  if (region === 'blue' && color === '#8fe8ff' && !texture) return { kind: 'surface', file: 'dust.png', repeat: 3 };
  if (region === 'fields') {
    if (texture === 'grass') return { kind: 'terrain', file: 'ground.png', repeat: 3 };
    if (texture === 'terrace') return { kind: 'terrain', file: 'path.png', repeat: 2 };
    if (texture === 'ivory' && color === '#b8b3a4') return { kind: 'trim', band: 'concrete' };
    if (texture === 'ivory') return { kind: 'trim', band: 'ivory' };
    if (color === '#a0402e' || color === '#7d3b32') return { kind: 'trim', band: 'tile' };
    if (color === '#8c6a3f') return { kind: 'trim', band: 'timber' };
    if (texture === 'rock') return { kind: 'terrain', file: 'cliff.png', repeat: 2 };
  }
  return null;
}

const ramp = makeRampTexture(3);
const swapped = new WeakMap<Object3D, boolean>();

/** Repaint a region kit's stand-ins with the delivered trim and terrain sets. */
export async function paintKit(root: Object3D, region: string): Promise<number> {
  const trim = await painting(`trim/${region}.png`, { wrapT: ClampToEdgeWrapping });
  const emissive = await painting(`trim/${region}-emissive.png`, { srgb: false, wrapT: ClampToEdgeWrapping });
  const bands = TRIM_BANDS[region] || [];
  let count = 0;
  const materials = new Map<string, MeshToonMaterial>();
  const jobs: Promise<void>[] = [];
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || mesh.userData.ink || swapped.get(mesh)) return;
    const meta = (mesh.material as MeshToonMaterial).userData?.standIn as { color: string; texture: string | null } | undefined;
    if (!meta) return;
    const target = bandFor(region, meta);
    if (!target) return;
    swapped.set(mesh, true);
    const key = target.kind === 'trim' ? `trim:${target.band}` : `${target.kind}:${target.file}`;
    let m = materials.get(key);
    if (!m) {
      m = new MeshToonMaterial({ color: new Color('#ffffff'), gradientMap: ramp });
      materials.set(key, m);
      if (target.kind === 'trim' && trim) {
        const i = bands.indexOf(target.band);
        if (i >= 0) {
          const t = trim.clone();
          t.wrapS = RepeatWrapping;
          t.wrapT = ClampToEdgeWrapping;
          // Band i from the top, with a small inset against filtering bleed.
          t.repeat.set(1, 1 / 8 - 0.006);
          t.offset.set(0, 1 - (i + 1) / 8 + 0.003);
          t.needsUpdate = true;
          m.map = t;
          if (emissive) {
            const e = emissive.clone();
            e.wrapS = RepeatWrapping;
            e.wrapT = ClampToEdgeWrapping;
            e.repeat.copy(t.repeat);
            e.offset.copy(t.offset);
            e.needsUpdate = true;
            m.emissiveMap = e;
            m.emissive = new Color('#ffd38c');
            m.emissiveIntensity = 0.8;
          }
        }
      } else if (target.kind === 'terrain' || target.kind === 'surface') {
        const mm = m;
        const source = mesh.material as MeshToonMaterial;
        if (target.kind === 'surface') {
          // Surfaces keep the stand-in's glow and translucency (slag glows, dust is a volume).
          mm.transparent = source.transparent;
          mm.opacity = source.opacity;
          mm.emissive = source.emissive?.clone() ?? new Color('#000000');
          mm.emissiveIntensity = source.emissiveIntensity * 0.5;
        }
        jobs.push(
          painting(`${target.kind}/${target.kind === 'terrain' ? `${region}/` : ''}${target.file}`, { repeat: target.repeat }).then((t) => {
            if (t) {
              mm.map = t;
              if (target.kind === 'surface' && mm.emissiveIntensity > 0) mm.emissiveMap = t;
              mm.needsUpdate = true;
            }
          }),
        );
      }
    }
    mesh.material = m;
    count++;
  });
  await Promise.all(jobs);
  return count;
}

/** The shadow hide over every shadow stand-in: charcoal skin with an emissive mask. */
export async function paintShadows(objects: Iterable<Object3D>): Promise<void> {
  const hide = await painting('creatures/shadow-hide.png', { repeat: 1 });
  const glow = await painting('creatures/shadow-hide-emissive.png', { srgb: false, repeat: 1 });
  if (!hide) return;
  const material = new MeshToonMaterial({ color: new Color('#ffffff'), map: hide, gradientMap: ramp, emissive: new Color('#8a4bd8'), emissiveMap: glow || undefined, emissiveIntensity: glow ? 0.9 : 0 });
  for (const root of objects)
    root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || mesh.userData.ink) return;
      const meta = (mesh.material as MeshToonMaterial).userData?.standIn as { texture: string | null } | undefined;
      if (meta?.texture === 'shadow') mesh.material = material;
    });
}

/** Painted sky on the stand-in dome (JPEG preview; the KTX2 needs a transcoder). */
export async function paintSky(dome: Mesh, region: string): Promise<boolean> {
  const t = await painting(`sky/${region}-preview.jpg`, { wrapS: RepeatWrapping, wrapT: ClampToEdgeWrapping });
  if (!t) return false;
  const m = dome.material as MeshBasicMaterial;
  m.map = t;
  m.needsUpdate = true;
  return true;
}

/** Two rings of painted horizon cards, leaving the landmark's sector open. */
export async function paintHorizon(region: string, landmarkAngle: number): Promise<Group | null> {
  const group = new Group();
  group.name = 'horizon.painted';
  const jobs: Promise<void>[] = [];
  for (let ring = 0; ring < 2; ring++)
    for (let n = 0; n < 8; n++) {
      const a = (n / 8) * Math.PI * 2;
      let d = a - landmarkAngle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < Math.PI / 8 + 0.01) continue;
      jobs.push(
        painting(`horizon/${region}-${ring}-${n}.png`, { wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping }).then((t) => {
          if (!t) return;
          const radius = ring ? 6750 : 5000;
          const card = new Mesh(new PlaneGeometry(radius * 0.84, radius * 0.21), new MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: DoubleSide, fog: false }));
          card.position.set(Math.cos(a) * radius, radius * 0.105 - 150, Math.sin(a) * radius);
          card.lookAt(0, card.position.y, 0);
          card.renderOrder = -10 + ring;
          group.add(card);
        }),
      );
    }
  await Promise.all(jobs);
  return group.children.length ? group : null;
}

/** Terrain: three painted tiles blended by a per-vertex splat (ground, cliff, path). */
/** Regions whose floor is a soft-landing surface (T-080): what the low ground is painted with. */
export const FLOOR_SURFACE: Record<string, string> = { harbor: 'sea', blue: 'dust', foundry: 'slag' };
/** Uniform shared by every terrain material: seconds, for the surface flow. */
export const terrainClock = { value: 0 };

export async function paintTerrain(terrain: Mesh, region: string, district: District, route?: Route): Promise<boolean> {
  const [ground, cliff, path] = await Promise.all(['ground', 'cliff', 'path'].map((f) => painting(`terrain/${region}/${f}.png`, { repeat: 1 })));
  if (!ground || !cliff || !path) return false;
  const surfaceName = FLOOR_SURFACE[region];
  const [surface, detail] = surfaceName ? await Promise.all([painting(`surface/${surfaceName}.png`, { repeat: 1 }), painting(`surface/${surfaceName}-detail.png`, { repeat: 1, srgb: false })]) : [null, null];
  // The floor: the district's low ground, where water, dust or slag returns Hopper to play.
  const floorY = -district.terrain.relief * 0.55;
  const geo = terrain.geometry;
  const pos = geo.attributes.position,
    nor = geo.attributes.normal;
  const splat = new Float32Array(pos.count * 3);
  // The worn path follows the route (the trail's own line); without one, the
  // chapter spine: chapter midpoints joined by segments.
  const spine = district.chapters.map((c) => [0, (c.z0 + c.z1) / 2] as [number, number]);
  spine.unshift([district.start.x, district.start.z]);
  spine.push([district.exit.x, district.exit.z]);
  const distToSpine = (x: number, z: number) => {
    if (route) return route.distance(x, z);
    let best = Infinity;
    for (let i = 0; i + 1 < spine.length; i++) {
      const [ax, az] = spine[i],
        [bx, bz] = spine[i + 1];
      const vx = bx - ax,
        vz = bz - az,
        l2 = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
      best = Math.min(best, Math.hypot(x - (ax + vx * t), z - (az + vz * t)));
    }
    return best;
  };
  for (let i = 0; i < pos.count; i++) {
    const slope = 1 - nor.getY(i);
    const cliffW = Math.min(1, Math.max(0, (slope - 0.08) * 6));
    const pathW = Math.max(0, 1 - distToSpine(pos.getX(i), pos.getZ(i)) / 30) * (1 - cliffW);
    const groundW = Math.max(0, 1 - cliffW - pathW);
    splat[i * 3] = groundW;
    splat[i * 3 + 1] = cliffW;
    splat[i * 3 + 2] = pathW;
  }
  geo.setAttribute('splat', new BufferAttribute(splat, 3));
  const material = new MeshToonMaterial({ color: new Color('#ffffff'), gradientMap: ramp });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.tGround = { value: ground };
    shader.uniforms.tCliff = { value: cliff };
    shader.uniforms.tPath = { value: path };
    shader.uniforms.tFloor = { value: surface };
    shader.uniforms.tFloorDetail = { value: detail };
    shader.uniforms.uFloor = { value: surface ? floorY : -1e9 };
    shader.uniforms.uClock = terrainClock;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 splat;\nvarying vec3 vSplat;\nvarying vec3 vWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSplat = splat;\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tGround;\nuniform sampler2D tCliff;\nuniform sampler2D tPath;\nuniform sampler2D tFloor;\nuniform sampler2D tFloorDetail;\nuniform float uFloor;\nuniform float uClock;\nvarying vec3 vSplat;\nvarying vec3 vWorld;')
      .replace(
        '#include <map_fragment>',
        `vec2 uvG = vWorld.xz / 34.0;\n` +
          `vec2 uvC = vec2(vWorld.x + vWorld.z, vWorld.y) / 26.0;\n` +
          `vec4 cG = texture2D(tGround, uvG);\n` +
          `vec4 cC = texture2D(tCliff, uvC);\n` +
          `vec4 cP = texture2D(tPath, uvG * 1.3);\n` +
          `vec3 w = vSplat / max(0.001, vSplat.x + vSplat.y + vSplat.z);\n` +
          `vec4 painted = cG * w.x + cC * w.y + cP * w.z;\n` +
          `float floorW = 1.0 - smoothstep(uFloor, uFloor + 8.0, vWorld.y);\n` +
          `if (floorW > 0.0) {\n` +
          `  vec2 uvF = vWorld.xz / 60.0 + vec2(uClock * 0.006, uClock * 0.004);\n` +
          `  float flow = texture2D(tFloorDetail, uvF * 2.0 + vec2(-uClock * 0.02, uClock * 0.011)).r;\n` +
          `  vec4 cF = texture2D(tFloor, uvF) * (0.82 + flow * 0.36);\n` +
          `  painted = mix(painted, cF, floorW);\n` +
          `}\n` +
          `diffuseColor *= painted;`,
      );
  };
  material.customProgramCacheKey = () => 'hopper-splat';
  material.userData.floor = surface ? { y: floorY, surface: surfaceName } : null;
  terrain.material = material;
  return true;
}

/** An animated sprite from one of the delivered 4×2 effect atlases. */
export interface AtlasSprite {
  sprite: Sprite;
  life: number;
  duration: number;
  loop: boolean;
  fps: number;
  frames: number;
}
const atlasMaterials = new Map<string, Promise<Texture | null>>();
export async function atlasSprite(name: string, size: number, { fps = 20, loop = false, additive = false } = {}): Promise<AtlasSprite | null> {
  if (!atlasMaterials.has(name)) atlasMaterials.set(name, painting(`effects/${name}.png`, { wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping }));
  const atlas = await atlasMaterials.get(name)!;
  if (!atlas) return null;
  const t = atlas.clone();
  t.repeat.set(1 / 4, 1 / 2);
  t.needsUpdate = true;
  const sprite = new Sprite(new SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: additive ? 2 : 1 }));
  sprite.scale.set(size, size, 1);
  return { sprite, life: 0, duration: 8 / fps, loop, fps, frames: 8 };
}
export function stepAtlas(a: AtlasSprite, dt: number): boolean {
  a.life += dt;
  let frame = Math.floor(a.life * a.fps);
  if (frame >= a.frames) {
    if (!a.loop) return false;
    frame %= a.frames;
  }
  const t = (a.sprite.material as SpriteMaterial).map!;
  t.offset.set((frame % 4) / 4, 1 - (Math.floor(frame / 4) + 1) / 2);
  return true;
}

/** One cell of a delivered sheet laid out on a cols × rows grid, as its own texture. */
export async function cell(path: string, cols: number, rows: number, col: number, row: number): Promise<Texture | null> {
  const sheet = await painting(path, { wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping });
  if (!sheet) return null;
  const t = sheet.clone();
  setCell(t, cols, rows, col, row);
  return t;
}
export function setCell(t: Texture, cols: number, rows: number, col: number, row: number) {
  t.repeat.set(1 / cols, 1 / rows);
  t.offset.set(col / cols, 1 - (row + 1) / rows);
  t.needsUpdate = true;
}
/** Hopper's effect sheet (round three, T-082): 4 × 4 cells of 512 px. */
export const HOPPER_SHEET = 'effects/hopper.png';
export const HOPPER_CELLS = { laser: [0, 0], muzzle: [1, 0], shield: [2, 0], trail: [3, 0] } as const;
/** Muzzle frame n (0..7) lives on rows two and three. */
export function muzzleCell(t: Texture, frame: number) {
  setCell(t, 4, 4, frame % 4, 1 + Math.floor(frame / 4));
}
/** A camera-facing sprite from a sheet cell. */
export async function cellSprite(path: string, cols: number, rows: number, col: number, row: number, size: number, { additive = false, depthTest = true } = {}): Promise<Sprite | null> {
  const t = await cell(path, cols, rows, col, row);
  if (!t) return null;
  const s = new Sprite(new SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest, blending: additive ? 2 : 1 }));
  s.scale.set(size, size, 1);
  return s;
}
/** A flat quad from a sheet cell, for things that lie along a direction (bolts, trails, decals). */
export async function cellPlane(path: string, cols: number, rows: number, col: number, row: number, w: number, h: number, { additive = false, color = '#ffffff' } = {}): Promise<Mesh | null> {
  const t = await cell(path, cols, rows, col, row);
  if (!t) return null;
  return new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ map: t, color: new Color(color), transparent: true, depthWrite: false, side: DoubleSide, blending: additive ? 2 : 1, fog: false }));
}
/** Prop decals (round three, T-086): lit and unlit totem lamp faces, spring chevrons, the cage crown. */
export const PROP_SHEET = 'ui/props.png';
export const PROP_CELLS = { lampLit: [0, 0], lampUnlit: [1, 0], chevrons: [0, 1], crown: [1, 1] } as const;

/** The landing guide variant for a region: the ivory one on dark floors (T-081). */
export function guideVariant(region: string, groundColor: string): string {
  const c = new Color(groundColor);
  const luminance = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return FLOOR_SURFACE[region] || luminance < 0.07 ? 'landing-guide-light.png' : 'landing-guide.png';
}

/** A flat painted decal (landing guide) on the ground. */
export async function decal(path: string, size: number, color = '#ffffff'): Promise<Mesh | null> {
  const t = await painting(`ui/${path}`, { wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping });
  if (!t) return null;
  const m = new Mesh(new PlaneGeometry(size, size), new MeshBasicMaterial({ map: t, color: new Color(color), transparent: true, depthWrite: false, side: DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
/** A screen-facing reticle sprite for the locked shadow. */
export async function reticle(locked: boolean, size: number): Promise<Sprite | null> {
  const t = await painting(`ui/${locked ? 'lock-on-locked' : 'lock-on'}.png`, { wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping });
  if (!t) return null;
  const s = new Sprite(new SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
  s.scale.set(size, size, 1);
  s.renderOrder = 50;
  return s;
}
export const up = new Vector3(0, 1, 0);
