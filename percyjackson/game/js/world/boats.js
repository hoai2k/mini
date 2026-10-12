// Boats you can stand on. A boat is a small mesh floating on the water and a
// platform in world.platforms: physics.js lands heroes (and monsters) on its
// deck, and the boat bobs on the water, dipping with a springy wobble when
// someone steps in and sitting lower while they stand there.
import * as THREE from 'three/webgpu';

const mat = (color, o = {}) => new THREE.MeshStandardNodeMaterial({ color, roughness: o.r ?? 0.75, metalness: 0 });

// A canoe along local x, deck at about y 0.3 (matches the deco canoe).
function canoe(color, paddle) {
  const g = new THREE.Group();
  const hull = mat(color), dark = mat(0x2a221a), wood = mat(0x8a5a32);
  const box = (w, h, d, x, y, z, m, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = true; b.receiveShadow = true; g.add(b); };
  box(2.6, 0.32, 0.7, 0, 0.16, 0, hull); box(0.5, 0.32, 0.46, 1.5, 0.2, 0, hull); box(0.5, 0.32, 0.46, -1.5, 0.2, 0, hull);
  box(0.3, 0.3, 0.24, 1.85, 0.26, 0, hull); box(0.3, 0.3, 0.24, -1.85, 0.26, 0, hull);
  box(2.4, 0.08, 0.5, 0, 0.3, 0, dark); box(0.12, 0.06, 0.66, 0.6, 0.34, 0, wood); box(0.12, 0.06, 0.66, -0.6, 0.34, 0, wood);
  if (paddle) box(1.6, 0.05, 0.12, 0.2, 0.4, 0.3, wood, 0.3);
  return g;
}

export class Boats {
  constructor(game) { this.game = game; this.list = []; this.t = 0; }
  // spec: { kind: 'canoe', x, y, z, rot, color, paddle }
  add(spec) {
    const g = this.game, w = g.world;
    const grp = canoe(spec.color ?? 0xb8452a, spec.paddle);
    grp.position.set(spec.x, spec.y, spec.z); grp.rotation.y = spec.rot ?? 0;
    g.scene.add(grp); g.hubProps?.push(grp);
    const b = {
      grp, x: spec.x, z: spec.z, rot: spec.rot ?? 0, base: spec.y, deck: 0.34,
      hx: 1.55, hz: 0.42,                 // the deck you can stand on (half length, half width)
      off: 0, vel: 0, load: 0, phase: Math.random() * 6, top: spec.y + 0.34,
    };
    (w.platforms ??= []).push(b);
    this.list.push(b);
    return b;
  }
  update(dt) {
    this.t += dt;
    for (const b of this.list) {
      // sit a little lower with people aboard; a spring makes the dip wobble
      const target = -0.11 * Math.min(2, b.load);
      b.vel += ((target - b.off) * 38 - b.vel * 5) * dt;
      b.off += b.vel * dt;
      const bob = Math.sin(this.t * 1.3 + b.phase) * 0.035;
      b.grp.position.y = b.base + b.off + bob;
      b.grp.rotation.x = Math.sin(this.t * 0.9 + b.phase) * 0.025 + b.vel * 0.04;
      b.grp.rotation.z = Math.sin(this.t * 0.7 + b.phase * 2) * 0.02;
      b.top = b.base + b.deck + b.off + bob;
      b.load = 0;   // physics counts who is aboard again this frame
    }
    return this.list.length > 0 && this.list[0].grp.parent != null;
  }
}

export { platformAt } from '../physics.js';
