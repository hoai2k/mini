// The boss of the water film: a predatory nematode, Prionchulus muscorum
// (Mononchida), a real hunter of tardigrades and rotifers in moss films
// (../../design/bosses.md). It guards the Sphagnum leaf on the way to the pool
// tip (the forward landmark).
//
// Body: a smooth, unsegmented, transparent worm drawn ~1.3 mm long and ~60 µm
// wide (adults reach ~2 mm: a labelled departure so the arena fits), its
// muscular pharynx a denser tube in the front third, a darker granular
// intestine behind, and the large dorsal tooth in the buccal cavity at the
// head. It glides with the undulating wave of a nematode, its body following
// its head (follow-the-leader on the leaf).
//
// Fight (shared/predation.js createFight, with more interest and two attacks):
//   dormant: lies in a loose curve at its post until a player comes near
//     after the calm opening;
//   whip: the tell is the front coiling into an S, head drawn back, the
//     tooth bared; then the head whips forward;
//   thrash: the tell is the whole body rippling fast; then the head sweeps
//     sideways across you.
//   Brace (B) facing it on the strike blocks; a stylet jab (X) at its head in
//   its recovery bites back; in thin film (< ~3.5 µm) it flounders (slower,
//   and it loses heart). Worn down, it slides away into a deep groove between
//   cells and is gone for the rest of the day.
import * as THREE from '../shared/vendor/three.module.min.js';
import { opticalMaterial, litMaterial } from './materials.js';
import { LAYER_SPECIMEN } from './world.js';
import { createFight } from '../shared/predation.js';

const K = 56;            // spine points
const LEN = 13;          // units (100 µm): 1.3 mm
const SEG = LEN / (K - 1);
const R = 0.3;           // body radius: 60 µm across
const M = 12;            // ring vertices
const POST = [9.2, -0.4];// on the Sphagnum leaf (u, v)
const WAKE = 6.5;        // a player this close to the post wakes it
const REACH = 1.35;      // head to the player's body at the end of a strike
const THIN = 0.16;       // film index below which it flounders

const radius = (s) => {  // s 0 (head) .. 1 (tail)
  const head = Math.sqrt(Math.min(1, s / 0.035));
  const tail = s > 0.8 ? Math.pow(Math.max(0, (1 - s) / 0.2), 0.8) : 1;
  return R * head * tail * (0.9 + 0.1 * Math.sin(Math.PI * s));
};

function tubeGeometry(n0, n1) {
  const g = new THREE.BufferGeometry();
  const rings = n1 - n0;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rings * M * 3), 3));
  const idx = [];
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = i * M + ((j + 1) % M), c = a + M, d = b + M;
    idx.push(a, b, c, b, d, c); // outward-facing (the optical path needs the right winding)
  }
  // close both ends with fans (a closed mesh, so the optical path is the chord)
  const cap = (ring, flip) => { for (let j = 1; j < M - 1; j++) flip ? idx.push(ring, ring + j, ring + j + 1) : idx.push(ring, ring + j + 1, ring + j); };
  cap(0, false); cap((rings - 1) * M, true);
  g.setIndex(idx);
  return g;
}

export class Nematode {
  constructor(scene, world) {
    this.world = world;
    this.L = world.leaves[3];
    const mk = (geo, opt, lit) => {
      const o = opticalMaterial(opt), l = litMaterial(lit);
      const m = new THREE.Mesh(geo, o);
      m.userData = { opt: o, lit: l };
      m.layers.set(LAYER_SPECIMEN);
      m.frustumCulled = false;
      return m;
    };
    this.group = new THREE.Group();
    scene.add(this.group);
    this.parts = [
      { mesh: mk(tubeGeometry(0, K), { dn: 0.018, absorb: [0.35, 0.42, 0.65] }, { color: 0xe6dcc0, opacity: 0.6 }), from: 0, to: K, k: 1 },
      { mesh: mk(tubeGeometry(1, 18), { dn: 0.03, absorb: [0.9, 1.05, 1.6] }, { color: 0xc8b48a }), from: 1, to: 18, k: 0.42 },
      { mesh: mk(tubeGeometry(19, K - 6), { dn: 0.025, absorb: [1.7, 1.7, 1.5] }, { color: 0x8a6a40 }), from: 19, to: K - 6, k: 0.5 },
    ];
    for (const p of this.parts) this.group.add(p.mesh);
    const tg = new THREE.ConeGeometry(0.06, 0.2, 10);
    tg.rotateZ(-Math.PI / 2);
    this.tooth = mk(tg, { dn: 0.14, absorb: [1.2, 1.5, 2.2] }, { color: 0x8a6a30 });
    this.group.add(this.tooth);
    for (const m of [...this.parts.map((q) => q.mesh), this.tooth]) { const u = m.userData.opt.uniforms; m.userData.dn0 = u.uDn.value; m.userData.abs0 = u.uAbs.value.clone(); }
    this.fight = createFight({ windup: 1.1, strike: 0.42, recoverT: 1.7, repelT: 1.3, retreatT: 9, facingRate: 0.012, blockHit: 0.15, biteHit: 0.17, regain: 0.02 });
    this.spine = Array.from({ length: K }, () => ({ u: 0, v: 0 }));
    this.on = true;
    this.reset();
  }

  /** A new day: back at its post, asleep. */
  reset() {
    const [u0, v0] = POST;
    this.spine.forEach((p, i) => {
      const s = i / (K - 1), a = s * 3.6;
      p.u = u0 - 2.4 * Math.sin(a) * 0.9; p.v = v0 + 2.6 * Math.cos(a) * 0.8 - s * 0.6;
    });
    this.relax();
    Object.assign(this, { state: 'dormant', t: 0, pattern: 1, fs: 'stalk', ft: 0, coil: 0, ripple: 0, bare: 0, whip: 0, sink: 0, fade: 1, target: null, swipe: 0, aim: [1, 0], hitT: 0 });
    this.fight.reset();
    this.group.visible = this.on;
    this.setFade(1);
  }

  get head() { return this.spine[0]; }
  /** Head (or another spine point) in world space. */
  pointWorld(i, out = new THREE.Vector3(), n = 0) {
    const p = this.spine[i];
    return this.L.toWorld(p.u, p.v, this.L.thick / 2 + R + 0.04 + n - this.sink, out);
  }
  /** The head's forward direction on the leaf (u, v). */
  dir() {
    const a = this.spine[0], b = this.spine[3];
    const du = a.u - b.u, dv = a.v - b.v, l = Math.hypot(du, dv) || 1;
    return [du / l, dv / l];
  }
  get awake() { return this.state === 'fight' || this.state === 'leaving'; }
  get attacking() { return this.state === 'fight' && (this.fs === 'windup' || this.fs === 'strike'); }
  get interest() { return this.fight.interest; }

  /** Keep each segment SEG behind the one before it (follow the leader). */
  relax() {
    for (let i = 1; i < K; i++) {
      const a = this.spine[i - 1], b = this.spine[i];
      const du = b.u - a.u, dv = b.v - a.v, l = Math.hypot(du, dv) || 1e-6;
      b.u = a.u + (du / l) * SEG; b.v = a.v + (dv / l) * SEG;
    }
  }

  /** Move the head by (du, dv), kept on the leaf. */
  moveHead(du, dv) {
    const h = this.head, L = this.L;
    let u = h.u + du, v = h.v + dv;
    u = THREE.MathUtils.clamp(u, 0.8, L.len - 0.9);
    const lim = Math.max(0, L.hwAt(u) - 0.35);
    v = THREE.MathUtils.clamp(v, -lim, lim);
    h.u = u; h.v = v;
    this.relax();
  }

  setFade(f) {
    this.fade = f;
    for (const m of [...this.parts.map((q) => q.mesh), this.tooth]) {
      const u = m.userData.opt.uniforms;
      if (m.userData.dn0 === undefined) continue;
      u.uDn.value = m.userData.dn0 * f;
      u.uAbs.value.copy(m.userData.abs0).multiplyScalar(f);
    }
  }

  /**
   * prey: [{ a, pos (Vector3 body centre), mouth (Vector3), forward (Vector3), active, blocking, jab }]
   * calm: still in the calm opening. Returns events [{ e, a }].
   */
  update(dt, prey, { calm = false } = {}) {
    const ev = [];
    this.t += dt;
    if (!this.on || this.state === 'gone') { this.group.visible = false; return ev; }
    this.group.visible = true;
    const head = this.pointWorld(0, _h);
    const L = this.L;
    const film = this.world.filmAt(L, this.head.u, this.head.v);
    const thin = film < THIN;
    this.thin = thin;
    // nearest player up and about
    let tgt = null, td = Infinity;
    for (const p of prey) { if (!p.active) continue; const d = p.pos.distanceTo(head); if (d < td) { td = d; tgt = p; } }
    this.target = tgt;
    let speed = 0, du = 0, dv = 0;
    const toward = (p) => { const loc = L.toLocal(p.pos, {}); const a = loc.u - this.head.u, b = loc.v - this.head.v, l = Math.hypot(a, b) || 1; return [a / l, b / l, l]; };

    if (this.state === 'dormant') {
      // asleep at its post: a slow, lazy ripple
      this.coil += (0 - this.coil) * dt; this.ripple = 0.25;
      const near = prey.some((p) => p.active && p.pos.distanceTo(L.toWorld(POST[0], POST[1], 0, _p)) < WAKE);
      if (!calm && near) { this.state = 'fight'; this.fight.reset(); ev.push({ e: 'wake', a: tgt }); }
    } else if (this.state === 'fight') {
      const inReach = !!tgt && td < REACH + 1.4;
      // facing its front (a sweeping head can pass right over you: judge by its neck)
      const facing = !!tgt && _f.subVectors(this.pointWorld(6, _p), tgt.pos).normalize().dot(tgt.forward) > 0.3;
      const f = this.fight.update(dt, { near: !!tgt && td < 9, inReach, facing, blocking: !!tgt && tgt.blocking });
      // floundering in thin film wears it down (the design's "lure it into thin film"; a game rule)
      if (thin && tgt && td < 9 && f.state === 'stalk') { this._drain = (this._drain || 0) + dt; if (this._drain > 3) { this._drain = 0; this.fight.bitten(); ev.push({ e: 'flounder', a: tgt }); } }
      if (f.state !== this.fs) {
        if (f.state === 'windup') { this.pattern = (this.pattern + 1) % 2; ev.push({ e: this.pattern ? 'windupThrash' : 'windupWhip', a: tgt }); if (tgt) { const [a, b] = toward(tgt); this.aim = [a, b]; } }
        if (f.state === 'strike') ev.push({ e: 'strike', a: tgt });
      }
      this.fs = f.state; this.ft = f.t;
      const slow = thin ? 0.35 : 1;
      if (f.state === 'stalk' && tgt) {
        const [a, b, l] = toward(tgt);
        if (l > REACH + 1.0) { speed = 1.15 * slow; du = a; dv = b; }
        else { speed = 0.15; du = a; dv = b; }
        this.coil += (0 - this.coil) * dt * 3; this.ripple = 1;
      } else if (f.state === 'windup') {
        // the tell: whip = the front coils into an S, head drawn back; thrash = the body ripples fast
        if (this.pattern === 0) { this.coil += (1 - this.coil) * dt * 5; } // (it never backs up head first: the body would fold)
        else { this.ripple = 3.2; this.coil += (0.35 - this.coil) * dt * 4; }
        this.bare = Math.min(1, this.bare + dt * 3);
      } else if (f.state === 'strike') {
        this.bare = 1;
        if (this.pattern === 0) { this.coil += (0 - this.coil) * dt * 14; speed = 6.5 * slow; du = this.aim[0]; dv = this.aim[1]; }
        else { this.swipe += dt / 0.42; const s = Math.sin(this.swipe * Math.PI * 2) * 1; speed = 5 * slow; du = this.aim[0] * 0.4 - this.aim[1] * s; dv = this.aim[1] * 0.4 + this.aim[0] * s; }
      } else if (f.state === 'recover' || f.state === 'repelled') {
        this.swipe = 0;
        this.coil += (0 - this.coil) * dt * 2; this.ripple = 0.6;
        this.bare = Math.max(0, this.bare - dt * 2);
        if (f.state === 'repelled' && tgt) { const [a, b] = toward(tgt); speed = 0.8; du = -b; dv = a; } // it veers off sideways
      }
      if (f.blocked) ev.push({ e: 'blocked', a: tgt });
      if (f.hit && tgt) ev.push({ e: 'hit', a: tgt });
      // the player's jab: at its head, any time but mid-strike
      for (const p of prey) {
        if (!p.jab || f.state === 'strike' || this.fight.state === 'retreat') continue;
        if (p.mouth.distanceTo(head) < 1.6 || p.pos.distanceTo(head) < 1.9) {
          const gone = this.fight.bitten();
          ev.push({ e: 'bitten', a: p });
          if (gone) break;
        }
      }
      if (f.retreated || this.fight.state === 'retreat') { this.state = 'leaving'; this.t = 0; ev.push({ e: 'retreat', a: tgt }); }
    } else if (this.state === 'leaving') {
      // slides off along the leaf and down into a deep groove between the cells
      this.coil *= Math.exp(-dt * 2); this.ripple = 1.4; this.bare = Math.max(0, this.bare - dt);
      speed = 1.4; du = 0.2; dv = this.head.v >= 0 ? 1 : -1;
      if (this.t > 2.2) { this.sink = Math.min(0.9, this.sink + dt * 0.35); this.setFade(Math.max(0, 1 - (this.t - 2.2) / 3)); }
      if (this.t > 5.4) { this.state = 'gone'; this.group.visible = false; ev.push({ e: 'gone' }); }
    }
    if (speed) { const l = Math.hypot(du, dv) || 1; this.moveHead((du / l) * speed * dt, (dv / l) * speed * dt); }
    this.pose(dt);
    return ev;
  }

  /** The capture: holding you at its head, then dragging you off. */
  captureStep(phase, k, dt) {
    this.state = 'fight'; this.fs = 'capture';
    this.bare = 1; this.ripple = phase === 'follow' || phase === 'fadeOut' ? 1.2 : 0.4; this.coil *= Math.exp(-dt * 3);
    if (phase === 'follow' || phase === 'fadeOut' || phase === 'fadeIn') {
      const [a, b] = this.dir();
      this.moveHead(a * 0.8 * dt, b * 0.8 * dt);
    }
    this.pose(dt);
  }

  /** Mesh the body: the spine with the undulating wave, the S-coil and the tooth. */
  pose(dt) {
    this.phase = (this.phase || 0) + dt * (2 + 3 * this.ripple);
    const L = this.L, N0 = L.N;
    const pts = [], fr = [];
    for (let i = 0; i < K; i++) {
      const s = i / (K - 1);
      const p = this.spine[Math.min(i, K - 1)];
      const q = this.spine[Math.min(K - 1, i + 1)], o = this.spine[Math.max(0, i - 1)];
      let tu = o.u - q.u, tv = o.v - q.v; const tl = Math.hypot(tu, tv) || 1; tu /= tl; tv /= tl;
      // lateral wave + the S-coil of the front (the tell)
      const wave = 0.16 * Math.min(1, this.ripple) * Math.sin(s * 9 - this.phase) * (0.4 + s);
      const sCoil = this.coil * 1.05 * Math.sin(Math.min(1, s / 0.4) * Math.PI * 2) * (s < 0.4 ? 1 : Math.max(0, 1 - (s - 0.4) * 5));
      const off = wave + sCoil;
      const P = L.toWorld(p.u - tv * off, p.v + tu * off, L.thick / 2 + R + 0.04 - this.sink, new THREE.Vector3());
      const T = L.dirWorld(tu, tv).normalize();
      pts.push(P); fr.push(T);
    }
    const side = new THREE.Vector3(), up = new THREE.Vector3();
    for (const part of this.parts) {
      const pos = part.mesh.geometry.attributes.position.array;
      let w = 0;
      for (let i = part.from; i < part.to; i++) {
        const s = i / (K - 1), r = radius(s) * part.k * (part.k < 1 ? (i === part.from || i === part.to - 1 ? 0.05 : 1) : 1);
        side.crossVectors(fr[i], N0).normalize(); up.copy(N0);
        for (let j = 0; j < M; j++) {
          const a = (j / M) * Math.PI * 2;
          const c = Math.cos(a) * r, sn = Math.sin(a) * r * 0.9;
          pos[w++] = pts[i].x + side.x * c + up.x * sn;
          pos[w++] = pts[i].y + side.y * c + up.y * sn;
          pos[w++] = pts[i].z + side.z * c + up.z * sn;
        }
      }
      part.mesh.geometry.attributes.position.needsUpdate = true;
      part.mesh.geometry.computeBoundingSphere();
    }
    // the tooth: in the buccal cavity, bared forward in the attack
    this.tooth.position.copy(pts[0]).addScaledVector(fr[0], -0.05 + 0.16 * this.bare);
    this.tooth.quaternion.setFromUnitVectors(_x.set(1, 0, 0), fr[0]);
    this.headW = pts[0]; this.headDir = fr[0];
    if (this.parts[0].mesh.material === this.parts[0].mesh.userData.lit) for (const p of this.parts) p.mesh.geometry.computeVertexNormals();
  }
}
const _h = new THREE.Vector3(), _p = new THREE.Vector3(), _f = new THREE.Vector3(), _x = new THREE.Vector3();
