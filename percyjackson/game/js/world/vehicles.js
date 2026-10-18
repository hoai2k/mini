// Blocky vehicles for the opening: the yellow school bus, New York taxis and
// the old blue Camaro, as Three.js groups (they drive in the cutscenes and
// stand at the curb in the prologue). Each faces +x (its front at +x) and
// stands on y = 0; `wheels` turn as it drives (spin(group, metres)).
import * as THREE from 'three/webgpu';
import { LiveSign, letteringPainter } from './liveSign.js';
import { t as txt } from '../text_config.js';

const mats = new Map();
const M = (c, o = {}) => {
  const k = c + ':' + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardNodeMaterial({ color: c, roughness: o.r ?? 0.55, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 }));
  return mats.get(k);
};
function boxer(g) {
  return (w, h, d, x, y, z, mat, parent = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b;
  };
}
function wheelSet(g, box, pts, r = 0.45, w = 0.36) {
  const tyre = M(0x18181a, { r: 0.9 }), hub = M(0xc8ccd0, { m: 0.6, r: 0.3 });
  g.userData.wheels = [];
  for (const [x, z] of pts) {
    const wg = new THREE.Group(); wg.position.set(x, r, z); g.add(wg);
    box(r * 2, r * 2, w, 0, 0, 0, tyre, wg); box(r * 0.9, r * 0.9, w + 0.04, 0, 0, 0, hub, wg);
    g.userData.wheels.push(wg);
  }
  g.userData.wheelR = r;
}
export function spin(g, metres) { const r = g.userData.wheelR ?? 0.45; for (const w of g.userData.wheels ?? []) w.rotation.z -= metres / r; }

// The yellow school bus (9.6 long, 2.6 wide): a door on the right (+z) side near the front.
// Its lettering (the school's name down both sides, SCHOOL BUS front and back)
// is painted as live signs (world/liveSign.js): Greek letters that settle into
// English. userData.signs lists them; the caller adds them to game.signs and
// says when they are read (trigger 'manual': sign.read(); 'near': a hero comes
// within `near` metres of `pos`).
export function schoolBus({ sign = txt('signs.yancyAcademy'), trigger = 'manual', near = 14, pos = null } = {}) {
  const g = new THREE.Group(); const box = boxer(g);
  const Y = M(0xf2b414, { r: 0.45 }), K = M(0x1a1a1e, { r: 0.7 }), glass = M(0x2a3a4a, { r: 0.1, m: 0.3 }), chrome = M(0xd8dce0, { m: 0.8, r: 0.25 });
  const light = M(0xfff2c0, { e: 0xfff2c0, ei: 2.5 }), red = M(0xff3a2a, { e: 0xff2a1a, ei: 2 }), amber = M(0xffa020, { e: 0xffa020, ei: 1.5 });
  // body and the hood
  box(7.6, 2.5, 2.6, -0.8, 1.75, 0, Y);
  box(1.8, 1.4, 2.4, 3.9, 1.2, 0, Y);
  box(1.9, 0.12, 2.42, 3.85, 1.95, 0, K);           // the hood seam
  box(7.66, 0.16, 2.66, -0.8, 1.05, 0, K);           // black rub rails
  box(7.66, 0.12, 2.66, -0.8, 1.7, 0, K);
  box(7.4, 0.3, 2.5, -0.8, 3.05, 0, Y);              // roof, a little rounded
  box(7.0, 0.16, 2.3, -0.8, 3.26, 0, Y);
  // windows down both sides, the windscreen and the back window
  for (let i = 0; i < 6; i++) for (const z of [-1.31, 1.31]) box(0.92, 0.7, 0.04, -4.0 + i * 1.08, 2.35, z, glass);
  box(0.06, 0.9, 2.2, 2.9, 2.35, 0, glass);
  box(0.06, 0.8, 1.6, -4.62, 2.3, 0, glass);
  // the folding door (right side, by the driver)
  box(0.9, 1.9, 0.06, 2.3, 1.55, 1.31, glass); box(0.06, 1.9, 0.08, 2.3, 1.55, 1.33, K);
  // bumpers, grille, lights, stop sign arm, mirrors
  box(0.3, 0.4, 2.7, 4.85, 0.65, 0, K); box(0.3, 0.4, 2.7, -4.7, 0.65, 0, K);
  box(0.08, 0.7, 1.4, 4.82, 1.25, 0, chrome);
  for (const z of [-0.9, 0.9]) { box(0.1, 0.3, 0.4, 4.84, 1.35, z, light); box(0.1, 0.3, 0.3, -4.66, 1.4, z, red); box(0.18, 0.22, 0.3, 2.95, 3.0, z * 0.9, amber); box(0.18, 0.22, 0.3, -4.62, 3.0, z * 0.9, red); }
  box(0.5, 0.5, 0.06, 1.2, 1.9, -1.36, M(0xd8322a, { e: 0xa01a10, ei: 0.4 }));
  for (const z of [-1.5, 1.5]) { box(0.08, 0.6, 0.08, 3.6, 2.3, z, K); box(0.1, 0.4, 0.3, 3.6, 2.5, z * 1.05, chrome); }
  // the school's name on both sides, SCHOOL BUS over the windscreen and the back window
  const name = new LiveSign(sign, { w: 512, h: 48, paint: letteringPainter({ size: 36 }), trigger, near, pos, seed: 31 });
  const plate = new LiveSign(txt('signs.schoolBus'), { w: 256, h: 56, paint: letteringPainter({ size: 40 }), trigger, near, pos, seed: 57 });
  const lettering = (s, w, h, x, y, z, ry) => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardNodeMaterial({ map: s.texture, roughness: 0.6, transparent: true })); pl.position.set(x, y, z); pl.rotation.y = ry; g.add(pl); };
  for (const s of [-1, 1]) lettering(name, 4.6, 0.42, -1.2, 2.9, s * 1.32, s > 0 ? 0 : Math.PI);
  lettering(plate, 1.25, 0.27, 2.94, 3.02, 0, Math.PI / 2);
  lettering(plate, 1.25, 0.27, -4.69, 3.02, 0, -Math.PI / 2);
  g.userData.signs = [name, plate];
  wheelSet(g, box, [[3.3, 1.2], [3.3, -1.2], [-2.8, 1.2], [-2.8, -1.2]], 0.5, 0.4);
  g.userData.door = new THREE.Vector3(2.3, 0, 1.9);   // where to stand to get on (bus-local)
  g.userData.length = 9.8;
  return g;
}

// A New York taxi (4.4 long).
export function taxi({ color = 0xf4c21a, sign = true } = {}) {
  const g = new THREE.Group(); const box = boxer(g);
  const Y = M(color, { r: 0.35, m: 0.2 }), K = M(0x1a1a1e, { r: 0.7 }), glass = M(0x26323e, { r: 0.1, m: 0.3 });
  box(4.4, 0.8, 1.9, 0, 0.75, 0, Y);
  box(2.3, 0.7, 1.7, -0.3, 1.5, 0, Y);
  box(2.1, 0.55, 1.74, -0.3, 1.5, 0, glass);
  box(0.6, 0.06, 1.76, -0.3, 1.5, 0, K);   // the door pillar line
  box(4.46, 0.12, 1.94, 0, 0.62, 0, K);
  if (sign) box(0.7, 0.24, 0.3, -0.3, 1.97, 0, M(0xfff4c0, { e: 0xffe8a0, ei: 1.2 }));   // the roof sign
  for (const z of [-0.65, 0.65]) { box(0.06, 0.18, 0.36, 2.22, 0.85, z, M(0xfff2c0, { e: 0xfff2c0, ei: 2 })); box(0.06, 0.18, 0.3, -2.22, 0.85, z, M(0xff3a2a, { e: 0xff2a1a, ei: 1.5 })); }
  // checker band
  if (sign) for (let i = 0; i < 10; i++) for (const z of [-0.96, 0.96]) box(0.2, 0.12, 0.02, -1.0 + i * 0.22, 0.95 + (i % 2) * 0.12, z, K);
  wheelSet(g, box, [[1.4, 0.85], [1.4, -0.85], [-1.4, 0.85], [-1.4, -0.85]], 0.36, 0.3);
  return g;
}

// Gabe's old blue Camaro, the car of the storm drive.
export function camaro() { return taxi({ color: 0x2a4a9a, sign: false }); }

// A plain parked car in a colour.
export function car(color = 0x8a2a2a) { return taxi({ color, sign: false }); }

// A Greyhound coach (12 long, 2.6 wide): silver, the blue stripe, the dog
// running down both sides; its door on the right (+z) side at the front.
export function greyhound() {
  const g = new THREE.Group(); const box = boxer(g);
  const S = M(0xc8ccd2, { r: 0.35, m: 0.4 }), blue = M(0x2a5ab8, { r: 0.4 }), K = M(0x1a1a1e, { r: 0.7 }), glass = M(0x1e2a36, { r: 0.1, m: 0.3 });
  const light = M(0xfff2c0, { e: 0xfff2c0, ei: 2.5 }), red = M(0xff3a2a, { e: 0xff2a1a, ei: 2 });
  box(12, 2.9, 2.6, 0, 1.95, 0, S);
  box(12.04, 0.5, 2.64, 0, 1.25, 0, blue);
  box(11.4, 0.9, 2.66, -0.3, 2.55, 0, glass);
  box(0.1, 1.5, 2.4, 6.0, 2.3, 0, glass);
  box(11.8, 0.2, 2.5, 0, 3.45, 0, S);
  box(1.0, 2.2, 0.06, 5.0, 1.7, 1.33, glass);
  // the running dog, in blue on both sides
  for (const z of [-1.33, 1.33]) { box(1.6, 0.35, 0.04, -1.5, 1.85, z, blue); box(0.5, 0.3, 0.04, -0.55, 2.0, z, blue); box(0.25, 0.5, 0.04, -2.3, 1.55, z, blue); box(0.25, 0.5, 0.04, -0.8, 1.55, z, blue); }
  box(0.3, 0.45, 2.7, 6.1, 0.65, 0, K); box(0.3, 0.45, 2.7, -6.1, 0.65, 0, K);
  for (const z of [-0.95, 0.95]) { box(0.1, 0.3, 0.45, 6.06, 1.1, z, light); box(0.1, 0.4, 0.3, -6.06, 1.2, z, red); }
  wheelSet(g, box, [[4.3, 1.2], [4.3, -1.2], [-3.4, 1.2], [-3.4, -1.2], [-4.6, 1.2], [-4.6, -1.2]], 0.55, 0.4);
  g.userData.door = new THREE.Vector3(5.0, 0, 1.9);
  g.userData.length = 12.2;
  return g;
}

// An Amtrak train: a locomotive and two carriages (about 33 long), silver
// with red and blue bands, along local x (its front at +x).
export function train({ cars = 2 } = {}) {
  const g = new THREE.Group(); const box = boxer(g);
  const S = M(0xd0d4da, { r: 0.3, m: 0.55 }), red = M(0xc8282a, { r: 0.4 }), blue = M(0x1e3a8a, { r: 0.4 }), K = M(0x1a1a1e, { r: 0.7 }), glass = M(0x1e2a36, { r: 0.1, m: 0.3 });
  const light = M(0xfff2c0, { e: 0xfff2c0, ei: 3 });
  const wheels = [];
  // the locomotive (10 long), its nose sloping down at the front
  box(9, 3.2, 2.8, 0, 2.2, 0, S); box(1.6, 2.2, 2.7, 5.2, 1.7, 0, S); box(0.9, 1.1, 2.6, 5.4, 3.0, 0, glass);
  box(9.04, 0.3, 2.84, 0, 1.4, 0, red); box(9.04, 0.2, 2.84, 0, 1.1, 0, blue);
  box(0.1, 0.4, 0.5, 6.02, 1.3, 0, light);
  for (let i = 0; i < 4; i++) for (const z of [-1.41, 1.41]) box(0.9, 0.5, 0.04, -3.4 + i * 1.6, 2.8, z, glass);
  for (const x of [3.2, -3.2]) for (const z of [-1.1, 1.1]) wheels.push([x, z]);
  // the carriages
  for (let c = 0; c < cars; c++) {
    const cx = -11.5 - c * 11.5;
    box(11, 3.2, 2.8, cx, 2.2, 0, S); box(11.04, 0.3, 2.84, cx, 1.4, 0, red); box(11.04, 0.2, 2.84, cx, 1.1, 0, blue);
    for (let i = 0; i < 6; i++) for (const z of [-1.41, 1.41]) box(1.1, 0.7, 0.04, cx - 4.4 + i * 1.75, 2.6, z, glass);
    box(0.6, 2.6, 2.2, cx + 5.8, 2.0, 0, K);   // the gangway between cars
    for (const x of [cx + 3.8, cx - 3.8]) for (const z of [-1.1, 1.1]) wheels.push([x, z]);
  }
  wheelSet(g, box, wheels, 0.45, 0.3);
  g.userData.length = 10 + cars * 11.5;
  g.userData.door = new THREE.Vector3(-11.5, 0, 1.9);
  return g;
}

// The zoo truck: a big rig with a trailer of animals (16 long) — Ares's ride
// west, with a zebra, a lion and an antelope peering out of the slats.
export function zooTruck() {
  const g = new THREE.Group(); const box = boxer(g);
  const cab = M(0xd8322a, { r: 0.4, m: 0.2 }), W = M(0xeeeae0, { r: 0.6 }), K = M(0x1a1a1e, { r: 0.7 }), glass = M(0x1e2a36, { r: 0.1, m: 0.3 }), chrome = M(0xd8dce0, { m: 0.8, r: 0.25 });
  box(3.2, 2.6, 2.5, 6.2, 1.9, 0, cab); box(1.6, 1.3, 2.4, 8.4, 1.25, 0, cab); box(0.08, 1.0, 2.2, 7.82, 2.5, 0, glass);
  for (const z of [-1.0, 1.0]) box(0.2, 2.8, 0.2, 4.7, 2.5, z, chrome);   // the stacks
  box(11.6, 3.4, 2.6, -1.8, 2.4, 0, W);
  for (let i = 0; i < 10; i++) for (const z of [-1.31, 1.31]) box(0.5, 1.2, 0.04, -6.8 + i * 1.1, 2.8, z, K);   // the slats
  box(3.6, 0.3, 2.62, -1.8, 3.9, 0, M(0x2a8a3a));
  // the animals: a zebra's head, a lion's mane, an antelope's horns
  box(0.5, 0.5, 0.3, -5.0, 2.9, 1.2, M(0xf0f0f0)); box(0.5, 0.12, 0.32, -5.0, 3.0, 1.2, K);
  box(0.8, 0.8, 0.3, -1.6, 2.9, 1.2, M(0xc88a2a)); box(0.4, 0.4, 0.32, -1.6, 2.9, 1.22, M(0xe0b060));
  box(0.4, 0.4, 0.3, 1.8, 2.9, 1.2, M(0xb07a40)); for (const dx of [-0.12, 0.12]) box(0.06, 0.5, 0.06, 1.8 + dx, 3.35, 1.2, K);
  wheelSet(g, box, [[8.0, 1.15], [8.0, -1.15], [5.4, 1.15], [5.4, -1.15], [-5.5, 1.15], [-5.5, -1.15], [-6.7, 1.15], [-6.7, -1.15]], 0.55, 0.4);
  g.userData.length = 17;
  g.userData.door = new THREE.Vector3(-7.8, 0, 0);
  return g;
}
