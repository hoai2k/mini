// The Mist Serpent (monsters.js MODELS.serpent): what a "person" in the
// museum may really be (entities/mistPeople.js). A long emerald snake with no
// legs: the body lies on the floor in S-curves and rears up at the front like
// a cobra, a hood flaring behind a wedge-shaped head with slit amber eyes,
// two long fangs and a flickering forked tongue.
//
// SerpentRig keeps the contract the enemy code uses from QuadRig (root,
// meshes, hips, torso, neck, head, mouth, handR/handL = the jaw, legs, spec,
// dims, extras, animate(), swap(), setFlash(), setGlow(), setDissolve()), but
// the body is a spine solved every frame instead of a chain of joints:
//   - the ground body: segments laid tail to head along a travelling wave of
//     heading angles (a slither that runs faster and wider with speed), each
//     resting its belly on the floor;
//   - the neck: a cubic curve from where the body leaves the ground up to the
//     back of the head, cut into equal lengths; the pose (idle, coiled back
//     in the wind-up, darting forward in the strike, recoiling when hit,
//     slumped in death) moves the head and the curve follows;
//   - the head: placed at the neck's end and pitched by the pose; the jaw
//     drops and the hood flares with it.
// Every segment is its own group under the torso, its voxel mesh built along
// +z (its length) with +y its back, and turned each frame from +z onto the
// spine's direction there. Sizes are in skin pixels at the heroes' voxel
// size (rig scale 1.18, kit density voxDensity: one cell is a hero cube).
import * as THREE from 'three/webgpu';
import { PX, CHAR_SCALE, extremePoints } from './character.js';
import { damp, clamp, easeOutCubic, easeInCubic } from '../util.js';
import { skinMat, voxDensity } from './parts.js';
import { paintQuad } from './quad.js';

const NN = 7, NG = 15, SEG = 3.2;   // neck segments, ground segments, ground segment length (px)
// colours
const GREEN = [0x2f7a34, 0x276a2c, 0x3a8a3c, 0x225e28], DARK = 0x102a14, DARK2 = 0x183a1c, CREAM = 0xe8d48a, CREAMD = 0xc8b064;
const GOLD = 0xd8a830, GOLDL = 0xf0c850, EYE = 0xffc818, EYEL = 0xffe870, SLIT = 0x0a0a06, FANG = 0xf6f0e0, GUM = 0xb83848, TONGUE = 0xd01c3c;

// girth of segment j counted from the head (neck 0..NN-1, then the ground body)
function girth(j) {
  if (j < NN) return 4.3 + j * 0.16;
  const k = (j - NN) / NG;
  return 5.4 * (1 - Math.pow(k, 1.5) * 0.82);
}

// neck poses: head base (y, z) above/ahead of where the body leaves the ground,
// the neck's direction into the head (y, z), head pitch (+ nose down), jaw, hood flare
const P_IDLE = { hy: 19, hz: 6, dy: 0.75, dz: 0.66, pitch: 0.12, jaw: 0.06, hood: 0.7, hx: 0, roll: 0 };
const P_COCK = { hy: 22.5, hz: 0.5, dy: 1, dz: -0.15, pitch: -0.25, jaw: 0.75, hood: 1.15, hx: 0, roll: 0 };
const P_STRIKE = { hy: 8.5, hz: 22, dy: -0.12, dz: 1, pitch: 0.22, jaw: 1.05, hood: 0.9, hx: 0, roll: 0 };
const P_HIT = { hy: 18, hz: -2.5, dy: 0.9, dz: -0.45, pitch: -0.55, jaw: 0.45, hood: 0.5, hx: 0, roll: 0.15 };
const P_STAG = { hy: 12, hz: 7, dy: 0.2, dz: 1, pitch: 0.55, jaw: 0.3, hood: 0.5, hx: 1.5, roll: 0.2 };
const P_LOW = { hy: 5.5, hz: 14, dy: -0.1, dz: 1, pitch: 0.35, jaw: 0.1, hood: 0.4, hx: 0, roll: 0 };
const P_DEAD = { hy: 3.2, hz: 11, dy: -0.05, dz: 1, pitch: 0.05, jaw: 0.8, hood: 0.3, hx: 4, roll: 1.25 };
const KEYS = Object.keys(P_IDLE);
const blendInto = (out, A, B, k) => { for (const key of KEYS) out[key] = A[key] + (B[key] - A[key]) * k; return out; };

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
function lowest(P, M) { if (!P) return Infinity; const e = M.elements; let y = Infinity; for (let i = 0; i < P.length; i += 3) { const v = e[1] * P[i] + e[5] * P[i + 1] + e[9] * P[i + 2] + e[13]; if (v < y) y = v; } return y; }

export class SerpentRig {
  constructor({ material, scale = 1.18 }) {
    this.spec = { scale, material }; this.isQuad = true; this.isSerpent = true;
    this.material = material;
    this.root = new THREE.Group();
    this.baseScale = scale * CHAR_SCALE; this.root.scale.setScalar(this.baseScale);
    this.meshes = [];
    this.hips = new THREE.Group(); this.root.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);
    // segments, head to tail: [0, NN) the neck, then the ground body
    this.segs = [];
    for (let j = 0; j < NN + NG; j++) { const g = new THREE.Group(); g.userData.w = girth(j); this.torso.add(g); this.segs.push(g); }
    this.neck = this.segs[NN - 1];
    this.head = new THREE.Group(); this.torso.add(this.head);
    this.mouth = new THREE.Group(); this.mouth.position.set(0, -0.9 * PX, 0.9 * PX); this.head.add(this.mouth);
    this.tongue = new THREE.Group(); this.tongue.position.set(0, -0.15 * PX, 5.6 * PX); this.mouth.add(this.tongue);
    this.hood = new THREE.Group(); this.segs[1].add(this.hood);
    this.handR = this.handL = this.mouth;
    // (no limbs: empty stand-ins so humanoid-minded code finds something)
    const none = new THREE.Group(); none.visible = false; this.torso.add(none);
    this.legs = []; this.tail = []; this.legR = this.legL = this.armR = this.armL = none;
    this.dims = { hs: 5.6, H: 4.6, L: NG * SEG, W: 5.4, legH: 0, standH: 0, legH0: 0 };
    this.extras = {}; this.strands = []; this.cape = [];
    this.t = Math.random() * 10; this.wave = Math.random() * 6;
    this.pose = { ...P_IDLE }; this._tgt = { ...P_IDLE }; this._tmp = { ...P_IDLE };
    this.swing = 0.25;   // the ground wave's amplitude (damped toward the gait's)
    this.flick = 0;
    // scratch for the spine
    this._pts = Array.from({ length: NN + NG + 1 }, () => new THREE.Vector3());
    this._curve = Array.from({ length: 25 }, () => new THREE.Vector3());
    this._len = new Float32Array(25);
  }

  // Same params as Rig.animate.
  animate(p) {
    const dt = p.dt || 0; this.t += dt;
    const t = this.t, run = clamp(p.speed ?? 0, 0, 1), a = p.action;
    let T = this._tgt, snap = 10;
    // the idle weave: the head sways and bobs, the neck breathes
    Object.assign(T, P_IDLE);
    T.hx = Math.sin(t * 1.3) * 1.6; T.hy += Math.sin(t * 2.1) * 0.6 - run * 4; T.hz += run * 3; T.pitch += Math.sin(t * 1.7) * 0.06 + run * 0.15;
    let dead = false, wave = 1.2 + run * 9, amp = 0.28 + run * 0.5;
    if (a) {
      const k = clamp(a.t ?? 0, 0, 1);
      switch (a.type) {
        case 'attack': {
          // coil back and up with the hood spread and the jaw open, dart
          // forward low with the fangs bared, then draw back to the weave
          const w = a.windup ?? 0.3, s = a.strike ?? 0.5;
          if (k < w) { blendInto(T, P_IDLE, P_COCK, easeOutCubic(clamp(k / (w * 0.9), 0, 1))); T.hx = Math.sin(t * 9) * 0.5; snap = 26; }
          else if (k < s) { Object.assign(T, P_STRIKE); snap = 48; }
          else { blendInto(T, P_STRIKE, P_IDLE, easeInCubic((k - s) / (1 - s)) * 0.8 + (k - s) / (1 - s) * 0.2); snap = 20; }
          wave = 0.6; amp = 0.3;
          break;
        }
        case 'hit': { const e = Math.sin(k * Math.PI); blendInto(T, P_IDLE, P_HIT, e); snap = 30; break; }
        case 'stagger': Object.assign(T, P_STAG); T.hx += Math.sin(t * 5) * 0.8; snap = 12; break;
        case 'sniff': case 'eat': Object.assign(T, P_LOW); T.hx = Math.sin(t * 1.4) * 2; snap = 8; break;
        case 'raise': case 'sign': case 'cast': Object.assign(T, P_COCK); T.jaw = 0.5; T.hx = Math.sin(t * 6) * 0.4; snap = 14; break;
        case 'dodge': Object.assign(T, P_LOW); snap = 30; break;
        case 'death': case 'down': { const e = a.type === 'down' ? 1 : easeInCubic(clamp(k * 1.5, 0, 1)); blendInto(T, P_HIT, P_DEAD, e); dead = true; wave = 0; amp = 0.55 * e + 0.3; snap = 16; break; }
      }
    }
    const P = this.pose;
    for (const key of KEYS) P[key] = damp(P[key], T[key], snap, dt);
    this.swing = damp(this.swing, amp, 4, dt);
    if (!dead) this.wave += dt * wave;
    // the tongue flicks in bursts (tucked in while the jaw is wide)
    this.flick = (Math.sin(t * 2.3) > 0.2 && P.jaw < 0.5) ? Math.max(0, Math.sin(t * 26)) : 0;
    this.tongue.scale.set(1, 1, 0.15 + this.flick * 0.85); this.tongue.visible = this.flick > 0.05;
    this.tongue.rotation.x = Math.sin(t * 31) * 0.12;
    this.solve(P, dead);
    // nothing below the floor: the head and its open jaw lift the whole neck if they dip
    const low = this.headLow();
    if (low < 0.3 * PX) { const d = (0.3 * PX - low) / PX; P.hy += d; this.solve(P, dead); }
  }

  // Lay the spine for pose P and place every segment, the hood and the head.
  solve(P, dead) {
    const pts = this._pts, D = this.segs;
    // the ground body, from the rear-up point back to the tail tip
    const by = girth(NN) / 2, B = pts[NN].set(0, by, 0);
    let x = 0, z = 0;
    for (let i = 1; i <= NG; i++) {
      const s = i / NG, A = this.swing * (0.35 + 0.9 * Math.sin(Math.min(1, s * 1.3) * Math.PI * 0.5));
      const psi = (dead ? 0.5 : 0) * s + A * Math.sin(this.wave - i * 0.62);
      x -= SEG * Math.sin(psi); z -= SEG * Math.cos(psi);
      pts[NN + i].set(x, girth(NN + i - 1) / 2, z);
    }
    // the neck: a cubic from B (leaving the ground forward) to the back of the head
    const H = _a.set(P.hx, P.hy, P.hz), dn = _b.set(P.hx * 0.08, P.dy, P.dz).normalize();
    const P1 = _c.set(0, by + 3.2, 4.2), P2 = _d.copy(H).addScaledVector(dn, -8);
    const C = this._curve, L = this._len;
    for (let i = 0; i < C.length; i++) {
      const u = i / (C.length - 1), v = 1 - u;
      C[i].set(0, 0, 0).addScaledVector(B, v * v * v).addScaledVector(P1, 3 * v * v * u).addScaledVector(P2, 3 * v * u * u).addScaledVector(H, u * u * u);
      L[i] = i ? L[i - 1] + C[i].distanceTo(C[i - 1]) : 0;
    }
    // NN + 1 points at equal arc lengths, from the head (0) down to B (NN)
    for (let j = 0; j <= NN; j++) {
      const want = L[L.length - 1] * (1 - j / NN);
      let i = 1; while (i < L.length - 1 && L[i] < want) i++;
      const f = (want - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      pts[j].lerpVectors(C[i - 1], C[i], clamp(f, 0, 1));
      pts[j].y = Math.max(pts[j].y, girth(Math.min(NN + NG - 1, j)) / 2);
    }
    // segment j runs from pts[j + 1] (tail side) to pts[j] (head side)
    for (let j = 0; j < D.length; j++) {
      const g = D[j], from = pts[j + 1], to = pts[j];
      _a.subVectors(to, from); const len = _a.length();
      g.position.set(from.x * PX, from.y * PX, from.z * PX);
      g.quaternion.setFromUnitVectors(_z, _a.multiplyScalar(1 / Math.max(1e-6, len)));
      g.scale.set(1, 1, len / (g.userData.len ?? SEG));
    }
    // the hood flares on the upper neck
    this.hood.scale.set(P.hood, 1, 1);
    // the head at the neck's end, along the neck's last direction, pitched by the pose
    const h = this.head, top = pts[0];
    h.position.set(top.x * PX, top.y * PX, top.z * PX);
    _a.subVectors(pts[0], pts[1]).normalize();
    const yaw = Math.atan2(_a.x, _a.z), pitch = -Math.asin(clamp(_a.y, -1, 1));
    // (the head levels out from the neck: half the neck's pitch, plus the pose's own)
    h.rotation.set(pitch * 0.25 + P.pitch, yaw * 0.6, P.roll, 'YXZ');
    this.mouth.rotation.x = P.jaw;
  }

  // the lowest point of the head and jaw, in the torso's space
  headLow() {
    const F = this._hp ??= { head: extremePoints(this.head, new Set([this.mouth])), mouth: extremePoints(this.mouth, new Set([this.tongue])) };
    this.head.updateMatrix(); this.mouth.updateMatrix();
    return Math.min(lowest(F.head, this.head.matrix), lowest(F.mouth, _m.multiplyMatrices(this.head.matrix, this.mouth.matrix)));
  }

  setFlash(v) { this.material.userData.flash.value = v; }
  swap(mat) { if (this._swapped === mat) return; this._swapped = mat; for (const m of this.meshes) m.material = mat || m.userData.baseMat; }
  setGlow(color) { this.material.userData.glow.value.set(color); }
  setDissolve(v) { this.material.userData.dissolve.value = v; }
  mouthWorld(out = new THREE.Vector3()) { return this.mouth.getWorldPosition(out); }
}

// Build the serpent with the voxel kit (monsters.js kit, passed in: this file
// is imported by monsters.js).
export function buildSerpent({ kit }) {
  const mat = skinMat('serpent', (S) => paintQuad(S, { base: GREEN[0], dark: DARK, belly: CREAM, back: GREEN[1], stripes: GOLD, eye: EYE, eyeLow: 0xff8a10, nose: DARK, teeth: FANG, speckles: 30 }), { emit: 0.9 });
  const rig = new SerpentRig({ material: mat, scale: 1.18 });
  const K = kit(rig, mat, { seed: 61, rough: 0.45, emit: 0.9, ao: 0.25, density: voxDensity(rig) });
  // ---- body segments: scaled back and sides over a cream belly of
  // transverse plates; dark diamonds down the spine edged in gold, a gold
  // band every third segment
  rig.segs.forEach((g, j) => {
    const w = g.userData.w, h = w * 0.86, l = j < NN ? 3.6 : SEG, ov = Math.min(1.4, w * 0.3);
    g.userData.len = l;
    const zc = l / 2;
    K.vox(g, 0, 0.1, zc, w, h - 0.2, l + ov, GREEN, { faces: 'tlr', relief: 0.25, out: 0.25, j: 0.1 });
    K.box(g, 0, -h / 2 + 0.25, zc, w * 0.82, 0.5, l + ov, CREAM);
    for (let z = 0.4; z < l + ov / 2; z += 1.1) K.box(g, 0, -h / 2 + 0.05, z - ov / 4, w * 0.84, 0.18, 0.22, CREAMD);
    if (w > 1.6) {
      // the diamond on the back: a dark lozenge, wider in the middle
      const dz = j % 2 ? 0.6 : 0;
      K.box(g, 0, h / 2 - 0.05, zc + dz - 0.4, w * 0.62, 0.3, l * 0.55, DARK);
      K.box(g, 0, h / 2 + 0.02, zc + dz - 0.4, w * 0.32, 0.3, l * 0.8, DARK2);
      for (const sx of [-1, 1]) K.box(g, sx * w * 0.33, h / 2 - 0.1, zc + dz - 0.4, 0.4, 0.3, l * 0.35, GOLD);
      // flecks of gold low on the flanks
      for (const sx of [-1, 1]) if (K.r() < 0.7) K.box(g, sx * (w / 2 + 0.05), -h * 0.12, zc + (K.r() - 0.5) * l * 0.6, 0.25, 0.6, 0.7, GOLDL);
    }
    if (j >= NN && (j - NN) % 3 === 1 && w > 2) K.box(g, 0, 0.1, zc, w + 0.3, h - 0.1, 0.7, GOLD);
    // the tail tip: a last fine point
    if (j === rig.segs.length - 1) { K.box(g, 0, -0.1, -0.9, w * 0.7, h * 0.7, 1.4, GREEN[1]); K.box(g, 0, -0.15, -1.9, w * 0.4, h * 0.4, 1, DARK2); }
  });
  // ---- the hood: two flaps along the upper neck, cream plates in front (the
  // belly side, toward the hero), a gold spectacle mark on the back
  const Hd = rig.hood, hw = girth(1);
  for (const sx of [-1, 1]) {
    for (const [z, wx, len] of [[0.5, 2.2, 2.4], [2.4, 3.2, 2.6], [4.4, 3, 2.4], [6, 1.8, 1.6]]) {
      K.box(Hd, sx * (hw / 2 + wx / 2 - 0.4), 0, z, wx, 0.9, len, GREEN[z > 3 ? 2 : 0]);
      K.box(Hd, sx * (hw / 2 + wx / 2 - 0.5), -0.5, z, wx * 0.85, 0.2, len * 0.9, CREAM);
    }
    K.box(Hd, sx * (hw / 2 + 1.3), 0.5, 3.4, 1.8, 0.2, 2.2, GOLD); K.box(Hd, sx * (hw / 2 + 1.3), 0.6, 3.4, 0.8, 0.2, 1, DARK);
    K.box(Hd, sx * (hw / 2 + 2.6), 0.48, 3.4, 0.4, 0.2, 4.8, DARK);   // (the dark rim)
  }
  K.box(Hd, 0, 0.55, 1.2, hw * 0.5, 0.2, 1.2, GOLD);
  // ---- the head: a flat wedge, broad at the jaw hinge, tapering to the snout
  const H = rig.head;
  K.vox(H, 0, 0.35, 1.6, 5.6, 2.8, 4.4, GREEN, { faces: 'tlrk', relief: 0.2, out: 0.2 });
  K.box(H, 0, 0.25, 4.8, 4.6, 2.3, 2.4, GREEN[0]);
  K.box(H, 0, 0.1, 6.7, 3.5, 1.9, 1.8, GREEN[2]);
  K.box(H, 0, -0.05, 7.9, 2.4, 1.4, 0.9, GREEN[1]);
  // big head plates on top, darker toward the back
  for (const [x, z, w, d, c] of [[0, 0.4, 2.6, 2, DARK2], [-1.5, 2.6, 1.6, 1.8, GREEN[3]], [1.5, 2.6, 1.6, 1.8, GREEN[3]], [0, 4.6, 2.4, 1.6, GREEN[1]], [0, 6.4, 1.8, 1.4, GREEN[3]]]) K.box(H, x, 1.85, z, w, 0.25, d, c);
  K.box(H, 0, 1.95, 0.4, 0.6, 0.2, 3, GOLD);   // (a gold stripe down the crown)
  // jowls at the hinge
  for (const sx of [-1, 1]) K.box(H, sx * 2.9, -0.5, 1.4, 1, 2, 2.8, GREEN[1]);
  // brow ridges over slit eyes (amber, glowing, a black vertical slit)
  for (const sx of [-1, 1]) {
    K.box(H, sx * 1.95, 1.75, 4.2, 1.5, 0.7, 2.2, DARK2, 0, 0, sx * -0.25);
    K.box(H, sx * 2.32, 0.95, 4.3, 0.3, 1.2, 1.6, EYE);
    K.box(H, sx * 2.4, 1.25, 4.1, 0.25, 0.4, 0.6, EYEL);
    K.box(H, sx * 2.48, 0.95, 4.35, 0.2, 1.1, 0.3, SLIT);
    K.box(H, sx * 1.1, 0.35, 8.36, 0.4, 0.4, 0.2, SLIT);   // nostrils
    // the lip line, cream scales along the upper jaw
    K.box(H, sx * 1.95, -0.75, 4.8, 0.4, 0.4, 5.2, CREAM, 0, sx * -0.12, 0);
  }
  // inside of the mouth and the two long fangs
  K.box(H, 0, -0.95, 4.6, 4, 0.3, 6.2, GUM);
  for (const sx of [-1, 1]) { K.box(H, sx * 1.15, -1.75, 6.9, 0.45, 1.5, 0.45, FANG, 0.25); K.box(H, sx * 1.15, -2.45, 7.05, 0.3, 0.5, 0.3, 0xffffff, 0.25); }
  for (const sx of [-1, 1]) for (const z of [3.2, 4.4, 5.6]) K.box(H, sx * 1.6, -1.2, z, 0.25, 0.4, 0.25, FANG);
  // ---- the lower jaw (rig.mouth, hinged at the back of the head)
  const M = rig.mouth;
  K.box(M, 0, -0.45, 2.6, 4.6, 0.9, 5.4, GREEN[1]);
  K.box(M, 0, -0.45, 5.9, 2.8, 0.8, 1.8, GREEN[1]);
  K.box(M, 0, -0.95, 3.6, 3.6, 0.2, 6.4, CREAM);
  K.box(M, 0, 0.02, 3.4, 3.4, 0.2, 5.4, GUM);
  for (const sx of [-1, 1]) for (const z of [2.4, 3.6, 4.8, 6]) K.box(M, sx * (z > 5 ? 1.1 : 1.6), 0.25, z, 0.25, 0.4, 0.25, FANG);
  // ---- the forked tongue
  const Tg = rig.tongue;
  K.box(Tg, 0, 0, 1.2, 0.4, 0.22, 2.6, TONGUE);
  for (const sx of [-1, 1]) K.box(Tg, sx * 0.35, 0, 2.95, 0.26, 0.2, 1.2, TONGUE, 0, sx * 0.4, 0);
  K.done();
  // (the fine parts cast no shadow)
  for (const g of [rig.tongue, rig.hood]) for (const m of g.children) if (m.isMesh) m.castShadow = false;
  // the rest pose, so a model that is never animated lies like one that is
  rig.animate({ dt: 0, speed: 0, action: null });
  return rig;
}
