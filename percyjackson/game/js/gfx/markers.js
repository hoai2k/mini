// Attack telegraphs: red ground markers (circles, rectangles, cones) that
// fill up during an enemy's wind-up so every big attack is readable.
import * as THREE from 'three/webgpu';
import { uniform, uv, vec3, vec4, float, smoothstep, length, abs, max, atan, sin, step } from 'three/tsl';
import { U } from './materials.js';

// A marker is taken from the free ones (never one still showing: puddles
// keep theirs for seconds, and a busy fight used to steal markers still in
// use); the pool grows if every one is out. `gen` counts reuses, so a late
// cancel from an attack that already ended leaves the marker's next user alone.
export class Markers {
  constructor(scene, n = 32) {
    this.scene = scene; this.items = [];
    for (let i = 0; i < n; i++) this.items.push(this.make());
    this.i = 0;
  }
  make() {
    const scene = this.scene;
    const prog = uniform(0), col = uniform(new THREE.Color(1, 0.1, 0.1)), shape = uniform(0), arc = uniform(1), alpha = uniform(1);
    // (forceSinglePass: a see-through two-sided material is otherwise drawn
    // twice, back faces then front; added light with no depth writes sums the
    // same in one pass, and renderer.compileAsync compiles only the one-pass
    // program, so the two-pass ones compiled mid-fight. The same for every
    // additive two-sided effect: rings, slashes, orbs, shafts, auras.)
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, fog: false, blending: THREE.AdditiveBlending });
    const p = uv().sub(0.5).mul(2);
    // circle / cone
    const r = length(p);
    const ang = abs(atan(p.x, p.y)).div(Math.PI);
    const inCone = step(ang, arc);
    const circEdge = smoothstep(0.9, 0.97, r).mul(smoothstep(1.0, 0.97, r));
    const circFill = step(r, prog).mul(step(r, 1)).mul(0.45);
    const circBase = step(r, 1).mul(0.12);
    // rectangle (length along +y of uv)
    const ax = abs(p.x), ay = p.y.mul(0.5).add(0.5);
    const rectEdge = max(smoothstep(0.9, 0.97, ax), smoothstep(0.03, 0.0, ay).add(smoothstep(0.97, 1.0, ay))).mul(step(ax, 1));
    const rectFill = step(ay, prog).mul(0.45).mul(step(ax, 1));
    const isRect = step(0.5, shape);
    const pulse = sin(U.time.mul(18)).mul(0.15).add(0.85);
    const a = isRect.mul(rectEdge.add(rectFill).add(0.1)).add(float(1).sub(isRect).mul(circEdge.add(circFill).add(circBase)).mul(inCone)).mul(alpha).mul(pulse);
    m.colorNode = vec4(vec3(col).mul(a).mul(2.2), 1);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
    mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 14; mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, prog, col, shape, arc, alpha, active: false, t: 0, dur: 1, gen: 0 };
  }
  // circle: radius; rect: width, length, facing; cone: radius + arc (0..1 of half-turn)
  spawn({ pos, dur = 1, radius = 2, shape = 'circle', width = 2, length = 6, facing = 0, arc = 1, color = 0xff2020, follow = null }) {
    const n = this.items.length;
    let it = null;
    for (let k = 0; k < n && !it; k++) { const c = this.items[(this.i + k) % n]; if (!c.active) { it = c; this.i = (this.i + k + 1) % n; } }
    if (!it) { it = this.make(); this.items.push(it); }
    it.active = true; it.t = 0; it.dur = dur; it.follow = follow; it.keep = false; it.gen++;
    // a cone on a monster turns with it through the wind-up (the blow lands where it faces)
    it.turn = shape === 'cone' && follow && typeof follow.facing === 'number';
    it.col.value.set(color); it.arc.value = shape === 'cone' ? arc : 1; it.shape.value = shape === 'rect' ? 1 : 0; it.alpha.value = 1;
    const m = it.mesh; m.visible = true;
    m.position.set(pos.x, pos.y + 0.05, pos.z);
    m.rotation.set(-Math.PI / 2, 0, facing + Math.PI);
    if (shape === 'rect') { m.scale.set(width / 2, length / 2, 1); m.position.x += Math.sin(facing) * length / 2; m.position.z += Math.cos(facing) * length / 2; }
    else m.scale.set(radius, radius, 1);
    it.offset = m.position.clone().sub(pos);
    return it;
  }
  // gen: the marker's gen when it was spawned (skips a marker that has since been reused)
  cancel(it, gen) { if (it && (gen == null || it.gen === gen)) { it.active = false; it.mesh.visible = false; } }
  update(dt) {
    for (const it of this.items) {
      if (!it.active) continue;
      it.t += dt; const k = Math.min(1, it.t / it.dur);
      it.prog.value = k;
      if (it.follow) { it.mesh.position.copy(it.follow.pos).add(it.offset); it.mesh.position.y = it.follow.pos.y + 0.05; }
      if (it.turn) it.mesh.rotation.z = it.follow.facing + Math.PI;
      if (it.t > it.dur + 0.12) { it.active = false; it.mesh.visible = false; }
    }
  }
}
