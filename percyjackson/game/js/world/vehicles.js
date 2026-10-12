// Blocky vehicles for the opening: the yellow school bus, New York taxis and
// the old blue Camaro, as Three.js groups (they drive in the cutscenes and
// stand at the curb in the prologue). Each faces +x (its front at +x) and
// stands on y = 0; `wheels` turn as it drives (spin(group, metres)).
import * as THREE from 'three/webgpu';

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
export function schoolBus({ sign = 'YANCY ACADEMY' } = {}) {
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
  // the school's name on both sides
  const tex = nameTexture(sign);
  for (const s of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.42), new THREE.MeshStandardNodeMaterial({ map: tex, roughness: 0.6, transparent: true }));
    pl.position.set(-1.2, 2.9, s * 1.32); pl.rotation.y = s > 0 ? 0 : Math.PI; g.add(pl);
  }
  wheelSet(g, box, [[3.3, 1.2], [3.3, -1.2], [-2.8, 1.2], [-2.8, -1.2]], 0.5, 0.4);
  g.userData.door = new THREE.Vector3(2.3, 0, 1.9);   // where to stand to get on (bus-local)
  g.userData.length = 9.8;
  return g;
}
function nameTexture(text) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 48;
  const c = cv.getContext('2d'); c.clearRect(0, 0, 512, 48);
  c.fillStyle = '#1a1a1e'; c.font = 'bold 36px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, 256, 26);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
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
