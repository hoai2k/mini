// Objective props that aren't the plain cage or cursed altar: a captive
// turned to stone (rescue, Aunty Em's), Hephaestus's bronze traps and the
// rifts to Tartarus (seal, Waterland and the Underworld).
import * as THREE from 'three/webgpu';
import { buildHeroModel } from '../entities/models.js';
import { mat, box } from './common.js';

const STONE = mat(0x9a968c, { r: 0.95 });

// A satyr statue on a plinth: Grover's model in stone, frozen mid-scream.
export function makeStatue() {
  const grp = new THREE.Group();
  box(grp, 1.5, 0.5, 1.5, 0, 0.25, 0, mat(0x6e6a62, { r: 0.9 }));
  const rig = buildHeroModel('grover');
  rig.root.position.y = 0.5; rig.root.scale.setScalar(0.95); grp.add(rig.root);
  rig.armR.rotation.x = -2.2; rig.armL.rotation.x = -1.2; rig.armL.rotation.z = 0.5;
  const saved = [];
  rig.root.traverse((o) => { if (o.isMesh) { saved.push([o, o.material]); o.material = STONE; } });
  grp.userData.unstone = () => { for (const [o, m] of saved) o.material = m; rig.armR.rotation.x = -2.8; rig.armL.rotation.x = -2.8; rig.armL.rotation.z = 0; };
  return { grp, rig };
}

// Hephaestus's trap: a bronze clamp of gears and jaws, a red eye glowing.
export function makeTrap() {
  const grp = new THREE.Group();
  const bronze = mat(0xb8862a, { r: 0.35, m: 0.85 }), dark = mat(0x4a3a22, { r: 0.5, m: 0.6 });
  box(grp, 1.8, 0.3, 1.8, 0, 0.15, 0, dark);
  const jawL = new THREE.Group(), jawR = new THREE.Group();
  jawL.position.set(-0.8, 0.3, 0); jawR.position.set(0.8, 0.3, 0);
  for (const [j, s] of [[jawL, 1], [jawR, -1]]) {
    box(j, 0.14, 1.4, 1.6, 0, 0.7, 0, bronze);
    for (let k = -2; k <= 2; k++) box(j, 0.3, 0.18, 0.12, s * 0.15, 1.35, k * 0.32, bronze);
    j.rotation.z = s * 0.7; grp.add(j);
  }
  const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 10), bronze); gear.position.set(0, 0.5, -0.95); gear.rotation.x = Math.PI / 2; grp.add(gear);
  const eye = box(grp, 0.3, 0.3, 0.3, 0, 0.55, 0, mat(0xff2a2a, { e: 3 }));
  grp.userData = { jawL, jawR, gear, eye, spin: gear };
  grp.userData.close = (t) => { jawL.rotation.z = 0.7 * (1 - t); jawR.rotation.z = -0.7 * (1 - t); };
  return grp;
}

// A rift: a jagged tear standing in the air over a dark pool, spitting sparks.
export function makeRift() {
  const grp = new THREE.Group();
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.3, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: 0x0a0410 }));
  pool.position.y = 0.04; grp.add(pool);
  const glow = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0x9a4aff).multiplyScalar(2.2), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  const core = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0x3affb0).multiplyScalar(2), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  const tear = new THREE.Group(); tear.position.y = 1.5; grp.add(tear);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.35 + (i % 3) * 0.12, 0.6), i % 2 ? core : glow);
    s.position.set(Math.sin(i * 2.1) * 0.18, (i - 2.5) * 0.42, 0); s.rotation.z = Math.sin(i * 1.7) * 0.6; tear.add(s);
  }
  grp.userData = { spin: tear, tear };
  grp.userData.close = (t) => { tear.scale.set(Math.max(0.02, 1 - t), Math.max(0.02, 1 - t * 0.6), 1); };
  return grp;
}

// A lotus flower on a short stem, glowing a little.
export function makeLotus() {
  const grp = new THREE.Group();
  box(grp, 0.08, 0.6, 0.08, 0, 0.3, 0, mat(0x3a8a3a));
  const petal = mat(0xffb8e8, { e: 0.8 }), heart = mat(0xffe86a, { e: 1.5 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const p = box(grp, 0.22, 0.08, 0.36, Math.cos(a) * 0.2, 0.68, Math.sin(a) * 0.2, petal); p.rotation.y = -a; p.rotation.x = 0.5; }
  box(grp, 0.16, 0.16, 0.16, 0, 0.72, 0, heart);
  return grp;
}
