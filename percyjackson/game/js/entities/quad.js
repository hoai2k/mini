// QuadRig: a blocky four- (or six-, or eight-) legged body with the same
// contract the enemy and boss code uses from Rig: root, meshes, mesh(),
// extras, hips, torso, neck, head, handR/handL (the jaw), legs, spec,
// animate({ dt, speed, vel, action }), swap(), setFlash(), setGlow(),
// setDissolve(). Used for hellhounds, pups, bronze spiders, the Greek-fire
// automaton and the Chimera (and later Cerberus).
//
// Skin layout (64x64, MC-style boxes painted by paintQuad below):
//   head   8x8x8  at (0,0)     face = front (8..15, 8..15)
//   snout  4x4x4  at (32,0)    jaw 4x2x4 at (48,0)
//   body   8x8x12 at (0,16)    leg 3x8x3 at (40,16)   ear 2x3x1 at (52,16)
//   tail   2x2x6  at (40,32)   extra 8x6x8 at (0,40)  extra2 6x6x6 at (32,44)
import * as THREE from 'three/webgpu';
import { skinBox, PX, CHAR_SCALE, extremePoints as extremePts } from './character.js';
import { damp, clamp, easeOutCubic, easeInCubic } from '../util.js';

export const QUV = {
  head: [8, 8, 8, 0, 0], snout: [4, 4, 4, 32, 0], jaw: [4, 2, 4, 48, 0],
  body: [8, 8, 12, 0, 16], leg: [3, 8, 3, 40, 16], ear: [2, 3, 1, 52, 16],
  tail: [2, 2, 6, 40, 32], extra: [8, 6, 8, 0, 40], extra2: [6, 6, 6, 32, 44],
};

// A box of size (w,h,d) in skin pixels, UV-mapped to one of the QUV regions.
export function quadPart(region, w, h, d, pivot = [0, 0, 0]) {
  const [uw, uh, ud, u, v] = QUV[region];
  const g = skinBox(uw, uh, ud, u, v);
  g.scale(w / uw, h / uh, d / ud);
  g.translate(pivot[0] * PX, pivot[1] * PX, pivot[2] * PX);
  return g;
}

// Paint a quadruped skin. o: { base, dark, belly, eye, nose, teeth, eyes:[[x,y]..], stripes, plates, glow }
export function paintQuad(S, o) {
  const base = o.base, dark = o.dark ?? base, belly = o.belly ?? dark;
  const n = o.noise ?? 0.18;
  for (const k of Object.keys(QUV)) { const [w, h, d, u, v] = QUV[k]; S.box(u, v, w, h, d, k === 'jaw' || k === 'ear' ? dark : base, n); }
  // belly (bottom of body) and darker back stripe
  S.rect(20, 16, 8, 12, belly, n);
  S.rect(12, 16, 8, 12, o.back ?? base, n);
  if (o.stripes) for (let z = 0; z < 12; z += 3) S.rect(12, 16 + z, 8, 1, o.stripes, 0.1);
  if (o.plates) for (let z = 0; z < 12; z += 4) { S.rect(12, 16 + z, 8, 1, o.plates, 0.05); S.rect(0, 28 + 0, 12, 1, o.plates, 0.05); }
  // speckles
  for (let i = 0; i < (o.speckles ?? 40); i++) S.px(Math.floor(S.r() * 40), 16 + Math.floor(S.r() * 20), dark);
  // leg feet
  S.rect(40, 25, 12, 2, o.feet ?? dark, 0.05);
  // face: eyes on the head front
  const eye = o.eye ?? 0xff2a1a;
  for (const [x, y] of o.eyes ?? [[9, 10], [13, 10]]) { S.px(x, y, eye); S.px(x + 1, y, eye); S.px(x, y + 1, o.eyeLow ?? eye); S.px(x + 1, y + 1, 0xffffff); }
  if (o.brow) { S.rect(8, 9, 8, 1, o.brow, 0.05); }
  // snout front: nose and teeth
  S.rect(36, 4, 4, 2, o.nose ?? 0x0a0a0a, 0.05);
  if (o.teeth !== false) { S.px(36, 7, o.teeth ?? 0xf4f0e0); S.px(39, 7, o.teeth ?? 0xf4f0e0); S.px(52, 4, o.teeth ?? 0xf4f0e0); S.px(55, 4, o.teeth ?? 0xf4f0e0); }
  if (o.extra) S.box(0, 40, 8, 6, 8, o.extra, n);
  if (o.extra2) S.box(32, 44, 6, 6, 6, o.extra2, n);
  o.custom?.(S);
}

const tmpV = new THREE.Vector3(), _qm = new THREE.Matrix4(), _qm2 = new THREE.Matrix4();
// the lowest y of the points under matrix M
function lowest(P, M) { const e = M.elements; let y = Infinity; for (let i = 0; i < P.length; i += 3) { const v = e[1] * P[i] + e[5] * P[i + 1] + e[9] * P[i + 2] + e[13]; if (v < y) y = v; } return y; }

export class QuadRig {
  // spec: { material, scale, bodyL, bodyW, bodyH, legH, legW, headS, legs(4|6|8), splay, footL (a lower leg below a knee), kneeOut (how far the lower leg leans out, rad), legY (leg root height from the body's underside), legSpread (extra sideways offset of the leg roots), tail(segments), tailLen, tailW, tailCurl, ears, snout, snoutS, neckUp, headZ, gait, jawOpen }
  constructor(spec) {
    this.spec = spec; this.isQuad = true;
    this.material = spec.material;
    const M = this.material;
    this.root = new THREE.Group();
    this.baseScale = (spec.scale ?? 1) * CHAR_SCALE; this.root.scale.setScalar(this.baseScale);   // (CHAR_SCALE: character.js)
    this.meshes = [];
    const mesh = (g, mat = M) => { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; m.userData.baseMat = mat; this.meshes.push(m); return m; };
    this.mesh = mesh;
    const L = spec.bodyL ?? 12, W = spec.bodyW ?? 7, H = spec.bodyH ?? 6, legH = spec.legH ?? 7, legW = spec.legW ?? 3, hs = spec.headS ?? 7;
    const nLegs = spec.legs ?? 4, splay = spec.splay ?? 0;
    const footL = spec.footL ?? 0;
    const kneeOut = spec.kneeOut ?? -0.12;
    const standH = legH * Math.cos(splay) + footL * Math.cos(kneeOut) + H / 2 - (spec.legY ?? 0);
    this.dims = { L, W, H, legH, legW, hs, standH, legH0: standH };
    // body
    this.hips = new THREE.Group(); this.hips.position.y = standH * PX; this.root.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);
    this.body = mesh(quadPart('body', W, H, L)); this.torso.add(this.body);
    // head on a neck at the front top of the body
    this.neck = new THREE.Group(); this.neck.position.set(0, (H * 0.3 + (spec.neckUp ?? 1.5)) * PX, (L / 2 + (spec.headZ ?? 0)) * PX); this.torso.add(this.neck);
    this.head = new THREE.Group(); this.neck.add(this.head);
    this.headMesh = mesh(quadPart('head', hs, hs, hs, [0, 0, hs * 0.35])); this.head.add(this.headMesh);
    if (spec.snout !== false) {
      const sn = spec.snoutS ?? hs * 0.5;
      const snout = mesh(quadPart('snout', sn, sn * 0.75, sn, [0, -hs * 0.18, hs * 0.85 + sn * 0.5])); this.head.add(snout);
      // jaw hinged under the snout: handR/handL point to it so "hand" props
      // (whips, fire) and the bite pose land on the mouth.
      this.mouth = new THREE.Group(); this.mouth.position.set(0, -hs * 0.42 * PX, hs * 0.75 * PX); this.head.add(this.mouth);
      const jaw = mesh(quadPart('jaw', sn * 0.9, sn * 0.35, sn, [0, -sn * 0.17, sn * 0.5])); this.mouth.add(jaw);
    } else {
      this.mouth = new THREE.Group(); this.mouth.position.set(0, -hs * 0.3 * PX, hs * 0.85 * PX); this.head.add(this.mouth);
    }
    this.handR = this.handL = this.mouth;
    this.mouth.rotation.x = spec.jawOpen ?? 0;   // a resting snarl (spec.jawOpen, rad)
    if (spec.ears) for (const sx of [-1, 1]) { const e = mesh(quadPart('ear', 2, 3, 1, [0, 1.5, 0])); e.position.set(sx * hs * 0.32 * PX, hs * 0.5 * PX, hs * 0.2 * PX); e.rotation.z = -sx * 0.25; this.head.add(e); }
    // legs: pairs down the body, hanging from the underside
    this.legs = [];
    const pairs = nLegs / 2;
    for (let i = 0; i < nLegs; i++) {
      const side = i % 2 === 0 ? -1 : 1, row = Math.floor(i / 2);
      const z = pairs === 1 ? 0 : (L / 2 - legW / 2 - 0.5) - row * (L - legW - 1) / (pairs - 1);
      const g = new THREE.Group();
      g.position.set(side * (W / 2 - legW / 2 + (splay ? 0.8 : 0) + (spec.legSpread ?? 0)) * PX, (-H / 2 + legW * 0.2 + (spec.legY ?? 0)) * PX, z * PX);
      const lm = mesh(quadPart('leg', legW, legH, legW, [0, -legH / 2, 0])); g.add(lm);
      g.userData = { side, row, phase: ((row % 2) ^ (side > 0 ? 1 : 0)) * Math.PI, splay: side * splay };
      g.rotation.z = side * splay;   // splayed legs reach outward
      // a knee: the lower leg turns back down so the foot meets the ground
      if (footL) {
        const knee = new THREE.Group(); knee.position.y = -legH * PX; knee.rotation.z = -side * (splay - kneeOut); g.add(knee);
        knee.add(mesh(quadPart('leg', legW * 0.8, footL, legW * 0.8, [0, -footL / 2, 0])));
        g.userData.knee = knee;
      }
      this.hips.add(g); this.legs.push(g);
    }
    // aliases so humanoid-minded code never trips
    this.legR = this.legs[0]; this.legL = this.legs[1]; this.armR = this.legs[2] ?? this.legs[0]; this.armL = this.legs[3] ?? this.legs[1];
    // tail: a short chain of segments from the back of the body
    this.tail = [];
    if (spec.tail) {
      let parent = new THREE.Group(); parent.position.set(0, H * 0.3 * PX, -L / 2 * PX); this.torso.add(parent);
      const segs = spec.tail, seg = (spec.tailLen ?? 6) / segs, tw = spec.tailW ?? 2;
      for (let i = 0; i < segs; i++) {
        const g = new THREE.Group(); if (i) g.position.z = -seg * PX;
        g.add(mesh(quadPart('tail', tw * (1 - i * 0.12), tw * (1 - i * 0.12), seg, [0, 0, -seg / 2])));
        parent.add(g); this.tail.push(g); parent = g;
      }
      this.tailTip = parent;
    }
    this.extras = {};
    this.strands = []; this.cape = [];
    this.t = Math.random() * 10;
    this.lastVel = new THREE.Vector3();
  }
  // Same params as Rig.animate.
  animate(p) {
    const dt = p.dt; this.t += dt;
    const t = this.t, run = clamp(p.speed ?? 0, 0, 1), D = this.dims;
    const cyc = t * (8 + run * 7) * (this.spec.gait ?? 1);
    const T = {
      hipsY: D.standH * PX + Math.abs(Math.cos(cyc)) * 0.05 * run + Math.sin(t * 2.4) * 0.008, lift: 0,
      torsoX: 0, torsoY: 0, torsoZ: Math.sin(cyc) * 0.03 * run,
      headX: Math.sin(t * 1.7) * 0.05 + Math.sin(cyc * 2) * 0.05 * run, headY: Math.sin(t * 0.7) * 0.15 * (1 - run),
      jaw: (this.spec.jawOpen ?? 0) + 0.05 + Math.max(0, Math.sin(t * 3)) * 0.08 * (1 - run) + run * 0.15,
      legAmp: 0.75 * run, legBias: 0, front: 0, rootZ: 0,
      tailY: Math.sin(t * 3.2) * 0.35, tailX: -0.25 + run * 0.15,
    };
    const a = p.action;
    let snap = 16;
    if (a) {
      const k = clamp(a.t ?? 0, 0, 1);
      switch (a.type) {
        case 'attack': {
          const w = a.windup ?? 0.25, s = a.strike ?? 0.5;
          const ph = k < w ? 0 : k < s ? 1 : 2;
          const e = ph === 0 ? easeOutCubic(k / w) : ph === 1 ? 1 : 1 - easeInCubic((k - s) / (1 - s)) * 0.7;
          const style = a.style ?? 'bite';
          if (style === 'slam') { // rear up, then crash down with the front paws
            if (ph === 0) { T.torsoX = -0.55 * e; T.lift = 0.15 * e; T.front = -1.2 * e; T.headX = -0.3 * e; }
            else { T.torsoX = 0.15; T.front = 0.3; T.headX = 0.25; T.jaw = 0.6; }
          } else if (style === 'spin') { // tail whip
            T.torsoY = ph === 0 ? 0.5 * e : -1.2 * e; T.tailY = ph === 0 ? -0.6 : 1.4; T.tailX = 0.1;
          } else { // bite / lunge: crouch back, then snap forward with the jaw open
            if (ph === 0) { T.torsoX = -0.2 * e; T.headX = -0.35 * e; T.jaw = 0.5 * e; T.legBias = -0.3 * e; }   // (no drop of the hips: the legs are rigid, so a crouch pushed the feet through the floor)
            else { T.torsoX = 0.18; T.headX = 0.35; T.jaw = ph === 1 ? 0.05 : 0.4; T.legBias = 0.35; T.front = -0.5; }
          }
          snap = 34; break;
        }
        case 'sniff': T.headX = 0.32 + Math.sin(t * 15) * 0.06; T.headY = Math.sin(t * 1.3) * 0.35; T.torsoX = 0.08; T.jaw = 0.04; snap = 12; break;   // nose down, twitching
        case 'eat': T.headX = 0.55; T.torsoX = 0.14; T.front = 0.15; T.jaw = 0.08 + Math.max(0, Math.sin(t * 16)) * 0.28; snap = 14; break;   // gnawing at something on the ground
        case 'cast': T.headX = 0.15; T.jaw = 0.85; T.torsoX = 0.08; T.legBias = 0.2; snap = 24; break;
        case 'raise': case 'sign': T.headX = -0.75; T.jaw = 0.6; T.torsoX = -0.18; T.front = -0.2; snap = 14; break;
        case 'hit': { const e = Math.sin(k * Math.PI); T.torsoX = -0.25 * e; T.headX = -0.45 * e; T.jaw = 0.4 * e; T.torsoZ = 0.15 * e; snap = 30; break; }
        case 'stagger': T.headX = 0.45; T.torsoZ = 0.12; T.jaw = 0.3; T.legBias = 0.2; break;
        case 'dodge': T.lift = Math.sin(k * Math.PI) * 0.3; T.front = -0.6; snap = 40; break;
        case 'death': { const e = easeInCubic(clamp(k * 1.4, 0, 1)); T.rootZ = Math.PI / 2 * e; T.legAmp = 0; T.front = 0.5 * e; T.jaw = 0.6 * e; snap = 25; break; }
        case 'down': T.rootZ = Math.PI / 2; T.legAmp = 0; snap = 12; break;
      }
    }
    // breathing
    const b = 1 + Math.sin(t * 2.4) * 0.015 * (1 - run);
    this.torso.scale.set(b, b, 1);
    const R = (o, ax, v) => { o.rotation[ax] = damp(o.rotation[ax], v, snap, dt); };
    this.hips.position.y = damp(this.hips.position.y, T.hipsY + T.lift, snap, dt);
    R(this.torso, 'x', T.torsoX); R(this.torso, 'y', T.torsoY); R(this.torso, 'z', T.torsoZ);
    R(this.head, 'x', T.headX); R(this.head, 'y', T.headY);
    R(this.mouth, 'x', T.jaw);
    for (const g of this.legs) {
      const u = g.userData, front = u.row === 0;
      let x = Math.sin(cyc + u.phase) * T.legAmp + T.legBias * (front ? -1 : 1) * 0.5 + (front ? T.front : 0);
      if (this.spec.splay) {
        // a splayed leg (spiders, ants, crabs) sweeps fore and aft about the
        // upright, as a spider's does: swung about the body's x axis, a foot
        // fanned out fore or aft (rotation.y) dipped up to 0.4 m into the floor
        u.fanY ??= g.rotation.y;
        R(g, 'y', u.fanY + u.side * x * 0.6);
        // and lifts as it swings forward
        R(g, 'z', u.splay + u.side * Math.max(0, Math.cos(cyc + u.phase)) * 0.35 * run);
      } else R(g, 'x', x);
    }
    for (let i = 0; i < this.tail.length; i++) { const g = this.tail[i]; R(g, 'y', T.tailY * (0.5 + i * 0.3) + Math.sin(t * 4 + i) * 0.05); R(g, 'x', i === 0 ? T.tailX - T.torsoX : -0.15 + (this.spec.tailCurl ?? 0)); }   // (the tail keeps its angle to the ground as the body pitches: a rear-up no longer drove it into the floor)
    this.hips.rotation.z = damp(this.hips.rotation.z, T.rootZ, snap, dt);
    if (!T.rootZ && Math.abs(this.hips.rotation.z) < 0.02) this.floorGuard();
  }
  // After the pose, nothing sinks through the floor (the soles, y = 0 in the
  // rig's own space): the hips rise by the deepest dip of any foot (a big
  // paw or a claw reaching fore of its leg dips as the leg swings, the way a
  // boot's toe does on a humanoid: Rig.footLift), then the head pitches up
  // just enough to keep its jaw and fangs out of the ground in a bite, hit or
  // stagger, and each tail segment from the root lifts as far as it must
  // (a tail laid along the ground while the body rears back). Each part is
  // stood in for by its extreme points (character.js extremePoints), found
  // once, in its own space; a frame costs a few hundred multiplies.
  floorGuard() {
    const F = this._floor ??= this.floorParts();
    const hy = this.hips.position.y;
    let low = Infinity;
    for (const l of F.legs) { l.g.updateMatrix(); low = Math.min(low, lowest(l.pts, l.g.matrix)); }
    if (F.body) { this.torso.updateMatrix(); low = Math.min(low, lowest(F.body, this.torso.matrix)); }   // (the body's rear end as it rears back in a hit)
    if (hy + low < 0) this.hips.position.y = -low;
    const y0 = this.hips.position.y;
    // head (and jaw)
    if (F.head || F.mouth) {
      const headLow = () => {
        this.torso.updateMatrix(); this.neck.updateMatrix(); this.head.updateMatrix(); this.mouth.updateMatrix();
        _qm.multiplyMatrices(this.torso.matrix, this.neck.matrix).multiply(this.head.matrix);
        let y = F.head ? lowest(F.head, _qm) : Infinity;
        if (F.mouth && this.mouth !== this.head) y = Math.min(y, lowest(F.mouth, _qm2.multiplyMatrices(_qm, this.mouth.matrix)));
        return y;
      };
      for (let i = 0; i < 24 && y0 + headLow() < 0; i++) this.head.rotation.x -= 0.05;
    }
    // tail, segment by segment
    if (F.tail.length) {
      this.torso.updateMatrix(); const base = this.tail[0].parent; base.updateMatrix();
      _qm.multiplyMatrices(this.torso.matrix, base.matrix);
      for (let i = 0; i < F.tail.length; i++) {
        const g = this.tail[i];
        for (let k = 0; k < 16; k++) { g.updateMatrix(); _qm2.multiplyMatrices(_qm, g.matrix); if (!F.tail[i] || y0 + lowest(F.tail[i], _qm2) >= 0) break; g.rotation.x += 0.06; }
        _qm.copy(_qm2);
      }
    }
  }
  floorParts() {
    const skip = new Set([...this.legs, ...this.tail, this.mouth]);
    return {
      legs: this.legs.filter((g) => g.visible).map((g) => ({ g, pts: extremePts(g, null) })).filter((l) => l.pts),
      body: extremePts(this.torso, new Set([...skip, this.neck, this.tail[0]?.parent])),
      head: extremePts(this.head, skip), mouth: this.mouth !== this.head ? extremePts(this.mouth, skip) : null,
      tail: this.tail.map((g) => extremePts(g, skip)),
    };
  }
  setFlash(v) { this.material.userData.flash.value = v; }
  swap(mat) { if (this._swapped === mat) return; this._swapped = mat; for (const m of this.meshes) m.material = mat || m.userData.baseMat; }
  setGlow(color) { this.material.userData.glow.value.set(color); }
  setDissolve(v) { this.material.userData.dissolve.value = v; }
  // world position of the mouth (for breath / bite effects)
  mouthWorld(out = tmpV) { return this.mouth.getWorldPosition(out); }
}
