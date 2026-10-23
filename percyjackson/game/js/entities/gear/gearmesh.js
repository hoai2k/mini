// Gear blocks: the boxes a weapon or an armour piece is built from, drawn as
// ONE vertex-coloured mesh per bone with ONE material per hero.
//
// A box is { at: [x, y, z], size: [w, h, d], c: colour, f: finish, r?: [rx, ry, rz] }
// in skin pixels of the frame it hangs in (character.js PX world units each;
// head gear in head pixels, drawn through the head's scale). The finish says
// how the block takes the light, per vertex (attribute gm: roughness,
// metalness, glow), so cloth, leather, bronze, gold and a glowing edge on one
// bone are still one draw:
//   cloth, leather, fur, wood, bone   matte
//   metal (bronze, iron, silver), gold   shiny
//   gem   glossy, a little glow;   glow   lit from within (fire, lightning, Stygian purple)
// The material shares the hero skin's flash, glow and dissolve uniforms
// (character.js makeCharMaterial), so a hit flash, the Helm of Darkness's
// fade and an elite glow cover the gear as they cover the hero.
import * as THREE from 'three/webgpu';
import { attribute, vertexColor, vec3, mix, screenCoordinate, interleavedGradientNoise } from 'three/tsl';
import { PX } from '../character.js';

// [roughness, metalness, glow]
export const FINISH = {
  cloth: [0.92, 0, 0], leather: [0.68, 0, 0], fur: [1, 0, 0], wood: [0.8, 0, 0], bone: [0.55, 0, 0.02],
  metal: [0.34, 0.78, 0.04], gold: [0.28, 0.9, 0.08], silver: [0.24, 0.85, 0.06], iron: [0.42, 0.7, 0],
  gem: [0.18, 0.2, 0.5], glow: [0.6, 0, 1.6], ember: [0.7, 0, 0.9],
  outfit: [0.8, 0, 0],   // (the heroes' own shoes, cuffs and beads: herovox.js, as their material drew them)
};

// one material per hero skin material (its uniforms), one shader for all
const mats = new WeakMap();
let loose = null;
export function gearMaterial(skin = null) {
  const u = skin?.userData;
  if (!u?.flash) return loose ??= make(null);
  let m = mats.get(skin); if (!m) mats.set(skin, m = make(u));
  return m;
}
function make(u) {
  const m = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
  const gm = attribute('gm', 'vec3'), vc = vertexColor();
  m.roughnessNode = gm.x; m.metalnessNode = gm.y;
  const glow = vc.mul(gm.z);
  m.emissiveNode = u ? mix(glow.add(u.glow), vec3(2.2, 2.2, 2.2), u.flash) : glow;
  if (u) m.maskNode = interleavedGradientNoise(screenCoordinate.xy).greaterThan(u.dissolve);
  m.name = 'gear';
  return m;
}

// a face: normal, its four corners (unit cube -1..1), light
const FACES = [
  [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], 0.9],
  [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], 0.9],
  [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], 1.1],
  [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], 0.62],
  [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], 1],
  [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], 0.84],
];
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Color();
// The geometry of a list of boxes (unit: world units per box unit).
export function gearGeometry(list, unit = PX) {
  const n = list.length * 36, P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), G = new Float32Array(n * 3);
  let j = 0;
  for (const b of list) {
    const [x, y, z] = b.at, [w, h, d] = b.size, F = FINISH[b.f] ?? FINISH.cloth, lit = F[2] >= 0.5;
    _c.set(b.c);
    const rot = b.r && (b.r[0] || b.r[1] || b.r[2]);
    if (rot) _q.setFromEuler(_e.set(b.r[0], b.r[1], b.r[2]));
    for (const [nn, vs, sh] of FACES) {
      _n.set(...nn); if (rot) _n.applyQuaternion(_q);
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const v = vs[k];
        _v.set(v[0] * w / 2, v[1] * h / 2, v[2] * d / 2); if (rot) _v.applyQuaternion(_q);
        P[j * 3] = (x + _v.x) * unit; P[j * 3 + 1] = (y + _v.y) * unit; P[j * 3 + 2] = (z + _v.z) * unit;
        N[j * 3] = _n.x; N[j * 3 + 1] = _n.y; N[j * 3 + 2] = _n.z;
        // tops a little lighter, undersides darker, a soft gradient down the sides (herovox.js boxes); lit blocks stay flat
        const g = lit ? 1 : sh * (nn[1] === 0 ? 0.94 + (v[1] + 1) * 0.05 : 1);
        C[j * 3] = _c.r * g; C[j * 3 + 1] = _c.g * g; C[j * 3 + 2] = _c.b * g;
        G[j * 3] = F[0]; G[j * 3 + 1] = F[1]; G[j * 3 + 2] = F[2];
        j++;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setAttribute('gm', new THREE.BufferAttribute(G, 3));
  g.computeBoundingSphere();
  return g;
}
// One mesh of boxes; userData.gearBoxes keeps the list (perf/gear.cjs reads it).
export function gearMesh(list, material, unit = PX) {
  const m = new THREE.Mesh(gearGeometry(list, unit), material);
  m.castShadow = true; m.receiveShadow = true;
  m.userData.baseMat = material; m.userData.gearBoxes = list; m.userData.gearUnit = unit;
  return m;
}
// box shorthand
export const box = (x, y, z, w, h, d, c, f = 'cloth', r = null) => (r ? { at: [x, y, z], size: [w, h, d], c, f, r } : { at: [x, y, z], size: [w, h, d], c, f });
// a colour scaled (darker < 1 < lighter)
export const shade = (c, k) => { _c.set(c).multiplyScalar(k); return _c.getHex(); };
// a colour mixed toward another
export const blend = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
