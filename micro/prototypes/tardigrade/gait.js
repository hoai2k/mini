// Walking by claw holds.
//
// The animal stands on one face (side) of one leaf. Each foot is either in
// stance (claws hooked on a cell wall, or just resting on a cell when no wall
// was in reach) or in swing. A gait clock advances with distance travelled;
// each leg's phase offset gives the pattern measured by Nirody et al. (2021)
// for Hypsibius exemplaris: a wave running from back to front along each side
// (IV, III, II, I), the two sides half a cycle apart, about a third of the
// cycle in swing, so the gait is tetrapod-like at walking speeds. A leg lifts
// only when its neighbours are down; a leg stretched past its reach must
// step, and a body that has outrun its feet is held back, so the trunk is
// pulled along by its claws instead of gliding.
//
// Grip: the planted feet's hold qualities are summed and compared with what
// the slope needs. Too little for too long and the animal slips; braced (A)
// it lifts one leg at a time and needs less. Off the edge of a leaf it can
// reach across to a neighbouring leaf where they touch (or where the film
// bridges a slightly wider gap), or walk round the leaf margin onto the
// underside.
import * as THREE from '../shared/vendor/three.module.min.js';
import { LEGS, BODY_HEIGHT } from './creature.js';

export const MAX_SPEED = 2.25;    // units/s = 225 µm/s ≈ 0.65 body lengths/s (Nirody: 79-263 µm/s)
export const DASH_SPEED = 4.0;    // the scramble: ~400 µm/s, well past the fastest measured walking (a stretch)
const STRIDE_REF = 1.5;            // strides lengthen above this pace (the old walking speed)
const STRIDE = 0.55;               // 55 µm per cycle
const SWING_FRAC = 0.34;
// Grip hysteresis: start slipping below SLIP_AT of the load, catch again at CATCH_AT.
const SLIP_AT = 0.85, CATCH_AT = 0.75;
// Display smoothing: three first-order lags in series, so the trunk's velocity
// and acceleration stay continuous even when the target jumps (a transfer, the
// leaf margin, a catch).
const SMOOTH_TAU = 0.065;
const MAX_REACH = 0.4;
const FOOT_UP = 0.07;              // claw base above the leaf surface
// Leg phase offsets. 'wave': back-to-front along each side, sides in
// antiphase (Nirody et al. 2021). The others are for comparison.
export const GAITS = {
  'Back-to-front wave (measured)': (L) => ((3 - L.pair) * 0.25 + (L.side > 0 ? 0 : 0.5)) % 1,
  'Front-to-back wave': (L) => (L.pair * 0.25 + (L.side > 0 ? 0 : 0.5)) % 1,
  'Pairs in step (gallop-like)': (L) => (L.pair * 0.25) % 1,
};
const OFF = [];
export function setGait(name) { setGaitWith(GAITS[name]); }
/** Any offset function of a leg ({ pair 0 = front .. 3, side ±1 }), e.g. a borrowed gait. */
export function setGaitWith(fn) { for (const L of LEGS) OFF[L.index] = ((fn(L) % 1) + 1) % 1; }
setGait('Back-to-front wave (measured)');

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
const UPW = new THREE.Vector3(0, 1, 0);

export class Walker {
  /**
   * opts: { scale (body size relative to the player's 350 µm animal), maxSpeed, smooth }
   * The predator (Milnesium) is a second walker at scale ~1.5.
   */
  constructor(world, creature, events, opts = {}) {
    this.world = world;
    this.creature = creature;
    this.events = events; // { catch(q), slip(), fall(text), transfer(text) }
    this.opts = { footholds: true, gravity: true, smooth: true, ...opts };
    this.s = opts.scale || 1;
    this.maxSpeed = opts.maxSpeed || MAX_SPEED;
    this.midPos = new THREE.Vector3(); this.midPos2 = new THREE.Vector3();
    this.midQuat = new THREE.Quaternion(); this.midQuat2 = new THREE.Quaternion();
    this.dispPos = new THREE.Vector3();
    this.dispQuat = new THREE.Quaternion();
    this.matrix = new THREE.Matrix4();
    this.inv = new THREE.Matrix4();
    this.feet = LEGS.map(() => ({ world: new THREE.Vector3(), n: new THREE.Vector3(0, 1, 0), state: 'stance', grip: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), toGrip: 0, t: 0, dur: 0.3, cycle: -1 }));
    this.spawn(world.leaves[0], 1, 6.5, 0.6, 1, 0);
  }

  spawn(leaf, side, u, v, hu, hv) {
    Object.assign(this, { leaf, side, u, v, hu, hv, speed: 0, phase: 0, slipping: false, slipT: 0, deficitT: 0, slipVel: [0, 0], pushT: 0, grace: 1, tau: SMOOTH_TAU, blend: null, atEdge: false, wrapCandidate: null });
    this.targetFrame();
    this.dispPos.copy(this.tPos);
    this.dispQuat.copy(this.tQuat);
    this.midPos.copy(this.tPos); this.midPos2.copy(this.tPos);
    this.midQuat.copy(this.tQuat); this.midQuat2.copy(this.tQuat);
    this.composeDisplay();
    this.plantAll();
  }

  /** Body pose on the leaf (target, before smoothing). */
  targetFrame() {
    const L = this.leaf;
    this.tPos = L.toWorld(this.u, this.v, this.side * (L.thick / 2 + BODY_HEIGHT * this.s), this.tPos || new THREE.Vector3());
    const f = L.dirWorld(this.hu, this.hv, _a).normalize();
    const up = _b.copy(L.N).multiplyScalar(this.side);
    const z = new THREE.Vector3().crossVectors(f, up);
    _m.makeBasis(f, up, z);
    this.tQuat = (this.tQuat || new THREE.Quaternion()).setFromRotationMatrix(_m);
    this.tMat = (this.tMat || new THREE.Matrix4()).compose(this.tPos, this.tQuat, _a.set(this.s, this.s, this.s));
  }

  composeDisplay() {
    this.matrix.compose(this.dispPos, this.dispQuat, _a.set(this.s, this.s, this.s));
    this.inv.copy(this.matrix).invert();
  }

  get up() { return this.leaf.N.clone().multiplyScalar(this.side); }
  get forward() { return this.leaf.dirWorld(this.hu, this.hv).normalize(); }

  /** Where leg i would stand now: its rest ground point under the target frame, on the leaf. */
  neutral(i, out) {
    const L = this.leaf;
    out.copy(LEGS[i].ground).applyMatrix4(this.tMat);
    const loc = L.toLocal(out, {});
    return { u: loc.u, v: loc.v };
  }

  surfacePoint(u, v, out) { return this.leaf.toWorld(u, v, this.side * (this.leaf.thick / 2 + FOOT_UP), out); }

  /** Choose the hold for leg i, led by the body's velocity. */
  chooseHold(i, lead) {
    const n = this.neutral(i, _a);
    const u = n.u + this.hu * lead, v = n.v + this.hv * lead;
    const L = this.leaf;
    if (!this.opts.footholds) return { pos: this.surfacePoint(u, v, new THREE.Vector3()), grip: L.inside(u, v) ? 0.8 : 0 };
    const hold = this.world.foothold(L, u, v, 0.2, this.hu, this.hv);
    if (hold) return { pos: this.surfacePoint(hold.u, hold.v, new THREE.Vector3()), grip: hold.quality };
    // No wall in reach: the foot rests on a cell (poor hold), or dangles off the edge.
    return { pos: this.surfacePoint(u, v, new THREE.Vector3()), grip: L.inside(u, v) ? 0.15 : 0 };
  }

  plantAll() {
    LEGS.forEach((_, i) => {
      const h = this.chooseHold(i, 0);
      const f = this.feet[i];
      f.world.copy(h.pos); f.grip = h.grip; f.state = 'stance';
      f.n.copy(this.leaf.N).multiplyScalar(this.side);
    });
  }

  /**
   * @param dt seconds
   * @param input { dir: Vector3 world (desired), mag 0..1, brace, frozen, film, energy }
   */
  update(dt, input) {
    const L = this.leaf;
    this.grace = Math.max(0, this.grace - dt);
    const ev = this.events;
    // ---- speed: heavy, held back by stretched legs
    let maxErr = 0;
    const tmp = new THREE.Vector3();
    this.feet.forEach((f, i) => {
      if (f.state !== 'stance') return;
      this.neutral(i, tmp);
      maxErr = Math.max(maxErr, f.world.distanceTo(tmp.copy(LEGS[i].ground).applyMatrix4(this.tMat)));
    });
    const S = this.s, REACH = MAX_REACH * S;
    const stretch = THREE.MathUtils.clamp((REACH * 1.3 - maxErr) / (REACH * 0.4), input.dash ? 0.5 : 0.15, 1);
    // ---- steering, in leaf coordinates
    let du = input.dir.dot(L.U), dv = input.dir.dot(L.V);
    const dl = Math.hypot(du, dv);
    const mag = input.frozen || this.slipping ? 0 : input.mag * (dl > 0.05 ? 1 : 0);
    let turn = 0;
    if (mag > 0) {
      du /= dl; dv /= dl;
      const cross = this.hu * dv - this.hv * du, dot = this.hu * du + this.hv * dv;
      const diff = Math.atan2(cross, dot);
      const maxTurn = (input.brace ? 0.6 : input.dash ? 1.6 : 1.1) * stretch * dt;
      turn = THREE.MathUtils.clamp(diff, -maxTurn, maxTurn);
      const c = Math.cos(turn), s = Math.sin(turn);
      [this.hu, this.hv] = [this.hu * c - this.hv * s, this.hu * s + this.hv * c];
      this.align = Math.max(0, Math.cos(diff - turn));
    } else this.align = 0;

    // A (dash): the scramble, a faster wave gait in the stick direction.
    const top = input.dash ? Math.max(DASH_SPEED * S, this.maxSpeed) : this.maxSpeed;
    const target = top * mag * this.align * input.film * (input.brace ? 0.45 : 1) * (0.6 + 0.4 * input.energy) * stretch;
    const acc = (target > this.speed ? (input.dash ? 9 : 1.35) : 2.6) * S;
    this.speed += THREE.MathUtils.clamp(target - this.speed, -acc * dt, acc * dt);
    if (this.speed < 0.002) this.speed = 0;
    // Pulsed propulsion: the trunk surges as each wave of legs pushes.
    const surge = 0.75 + 0.25 * Math.cos(this.phase * Math.PI * 4);
    let mu = this.hu * this.speed * surge * dt, mv = this.hv * this.speed * surge * dt;

    // ---- slipping: slide downhill until the claws catch again
    const load = this.loads();
    if (this.slipping) {
      this.slipT += dt;
      this.slipVel[0] += load.downU * load.pull * 2.2 * dt;
      this.slipVel[1] += load.downV * load.pull * 2.2 * dt;
      mu = this.slipVel[0] * dt; mv = this.slipVel[1] * dt;
    }

    this.atEdge = false;
    const nu = this.u + mu, nv = this.v + mv;
    if (L.inside(nu, nv, 0.55)) { this.u = nu; this.v = nv; }
    else if (this.slipping) { this.fall(); return; }
    else if (mag > 0) { this.atEdge = true; this.speed *= 0.5; }

    const moving = this.speed > 0.03 || Math.abs(turn) > 0.002;
    // Strides lengthen a little at a scramble, so the cadence stays possible.
    const stride = STRIDE * S * (1 + 0.35 * THREE.MathUtils.clamp(this.speed / S - STRIDE_REF, 0, 2.5));
    this.stride = stride;
    this.phase += (this.speed / stride) * dt + (Math.abs(turn) * 0.9 * S / stride);
    this.targetFrame();

    // ---- legs
    const swinging = () => this.feet.filter((f) => f.state === 'swing').length;
    const isSwing = (i) => i >= 0 && i < 8 && this.feet[i].state === 'swing';
    const lead = Math.min(0.25 * S, this.speed * 0.22);
    let settleDone = false;
    // Largest error first so settling steps go to the worst leg.
    const order = [...this.feet.keys()].sort((a, b) => this.errOf(b) - this.errOf(a));
    for (const i of order) {
      const f = this.feet[i];
      if (f.state === 'swing') continue;
      if (this.slipping) {
        // Dragged: claws scrape over the walls.
        this.neutral(i, tmp);
        f.world.copy(tmp.copy(LEGS[i].ground).applyMatrix4(this.tMat));
        f.grip = 0; f.state = 'drag';
        continue;
      }
      const err = this.errOf(i);
      const ph = this.phase + OFF[i];
      const cyc = Math.floor(ph), loc = ph - cyc;
      const want = moving && loc < SWING_FRAC && f.cycle !== cyc;
      const need = err > REACH;
      const settle = !moving && !settleDone && err > 0.09 * S && swinging() === 0;
      if (!(want || need || settle || f.state === 'drag')) continue;
      const leg = LEGS[i];
      const ipsi = [i - 2, i + 2].filter((j) => j >= 0 && j < 8);
      const contra = i ^ 1;
      const limit = input.brace ? 2 : 3;
      const ok = !ipsi.some(isSwing) && !isSwing(contra) && swinging() < limit && !input.tun;
      if (!ok && f.state !== 'drag') continue;
      // Lift.
      const h = this.chooseHold(i, lead);
      f.from.copy(f.state === 'drag' ? h.pos : f.world);
      f.to.copy(h.pos); f.toGrip = h.grip;
      f.t = 0;
      f.dur = THREE.MathUtils.clamp((SWING_FRAC * stride) / Math.max(this.speed, 0.25 * S), input.dash ? 0.09 : 0.1, 0.55) * (input.brace ? 1.35 : 1);
      f.state = 'swing'; f.cycle = cyc; f.grip = 0;
      f.n.copy(this.leaf.N).multiplyScalar(this.side);
      if (settle) settleDone = true;
      void leg;
    }
    for (const f of this.feet) {
      if (f.state !== 'swing') continue;
      f.t += dt / f.dur;
      const tt = THREE.MathUtils.clamp(f.t, 0, 1);
      const e = THREE.MathUtils.smootherstep(tt, 0, 1);
      f.world.lerpVectors(f.from, f.to, e).addScaledVector(f.n, 0.13 * S * Math.sin(Math.PI * tt));
      if (f.t >= 1) {
        f.state = 'stance'; f.world.copy(f.to); f.grip = f.toGrip;
        if (f.grip > 0.5) ev.catch(f.grip);
      }
    }

    // ---- a lobopod stretches, but not forever: past its reach the claws
    // scrape off and the foot is dragged after the body.
    this.feet.forEach((f, i) => {
      if (f.state !== 'stance') return;
      const hip = _a.copy(LEGS[i].hip).applyMatrix4(this.tMat);
      const rest = LEGS[i].ground.distanceTo(LEGS[i].hip) * S;
      const d = _b.subVectors(f.world, hip);
      const lim = rest * 1.5;
      if (d.length() > lim) {
        f.world.copy(hip).addScaledVector(d.normalize(), lim);
        const loc = this.leaf.toLocal(f.world, {});
        this.surfacePoint(loc.u, loc.v, f.world);
        f.grip = Math.min(f.grip, 0.15);
      }
    });

    // ---- grip versus load
    const G = this.feet.reduce((s, f) => s + (f.state === 'stance' ? f.grip : 0), 0);
    this.gripSum = G;
    this.required = load.required - (input.brace ? 1.6 : 0);
    if (!this.slipping && this.grace <= 0 && !input.tun) {
      // Hysteresis: a brief dip below the load is ridden out; only a clear,
      // sustained deficit starts a slide (the old rule flickered on steep faces).
      if (G < this.required * SLIP_AT) this.deficitT += dt;
      else if (G >= this.required) this.deficitT = Math.max(0, this.deficitT - 2 * dt);
      if (this.deficitT > 0.6) {
        this.slipping = true; this.slipT = 0; this.slipVel = [0, 0]; this.deficitT = 0;
        ev.slip();
      }
    } else if (this.slipping) {
      const canCatch = (input.brace && this.slipT > 0.3) || this.slipT > 0.7;
      if (load.hang > 0.5 && !input.brace && this.slipT > 0.5) { this.fall(); return; }
      if (canCatch) {
        // Claws scrabble for walls as they slide: catch when enough of them hook.
        const holds = LEGS.map((_, i) => this.chooseHold(i, 0));
        const G2 = holds.reduce((s, h) => s + h.grip, 0);
        const need = input.brace ? this.required : this.required * CATCH_AT;
        if (G2 >= need) {
          this.plantAll();
          this.slipping = false; this.grace = 1.0; this.deficitT = 0; ev.catch(1, true);
        }
      }
    }

    // ---- reaching across to another leaf, or round the margin
    this.considerTransfer(dt, mag, input);

    // ---- smoothing of the displayed trunk (the body lags its feet a little).
    // Three lags in series: a step in the target (a transfer, the margin, a
    // catch) becomes an S-curve with no velocity jump, and per-frame wobble in
    // the target is filtered three times. A change of face (transfer, margin,
    // fall) does not jump the target: the old pose is blended out over a
    // smootherstep (blendTarget), so the filter only ever sees a smooth path.
    if (this.opts.smooth) {
      const k = 1 - Math.exp(-dt / this.tau);
      const [bp, bq] = this.blendTarget(dt);
      this.midPos.lerp(bp, k); this.midPos2.lerp(this.midPos, k); this.dispPos.lerp(this.midPos2, k);
      this.midQuat.slerp(bq, k); this.midQuat2.slerp(this.midQuat, k); this.dispQuat.slerp(this.midQuat2, k);
    } else {
      const k = 1 - Math.exp(-dt / (this.blend ? 0.4 : 0.12)); // the old single lag
      if (this.blend && (this.blend.t += dt) > this.blend.T) this.blend = null;
      this.dispPos.lerp(this.tPos, k);
      this.dispQuat.slerp(this.tQuat, k);
      this.midPos.copy(this.dispPos); this.midPos2.copy(this.dispPos);
      this.midQuat.copy(this.dispQuat); this.midQuat2.copy(this.dispQuat);
    }
    this.composeDisplay();
    this.writePose(dt, input);
  }

  /** The pose before a change of face, for blendTarget. */
  snapshot() { return { pos: this.tPos.clone(), quat: this.tQuat.clone() }; }

  /** Start blending from a snapshot to the new target over T seconds. */
  startBlend(snap, T) {
    this.blend = { off: snap.pos.sub(this.tPos), quat: snap.quat, t: 0, T };
  }

  blendTarget(dt) {
    const b = this.blend;
    if (!b) return [this.tPos, this.tQuat];
    b.t += dt;
    const w = 1 - THREE.MathUtils.smootherstep(b.t / b.T, 0, 1);
    if (w <= 0) { this.blend = null; return [this.tPos, this.tQuat]; }
    this._bp = (this._bp || new THREE.Vector3()).copy(this.tPos).addScaledVector(b.off, w);
    this._bq = (this._bq || new THREE.Quaternion()).copy(this.tQuat).slerp(b.quat, w);
    return [this._bp, this._bq];
  }

  errOf(i) {
    const f = this.feet[i];
    return f.world.distanceTo(_b.copy(LEGS[i].ground).applyMatrix4(this.tMat));
  }

  /** How hard gravity pulls the animal off this face. (Exaggerated: see README.) */
  loads() {
    const up = this.leaf.N.y * this.side;
    const hang = Math.max(0, -up);
    const along = Math.sqrt(Math.max(0, 1 - up * up));
    const g = new THREE.Vector3(0, -1, 0);
    let downU = g.dot(this.leaf.U), downV = g.dot(this.leaf.V);
    const l = Math.hypot(downU, downV) || 1;
    downU /= l; downV /= l;
    if (!this.opts.gravity) return { hang: 0, along: 0, downU, downV, pull: 0, required: 1.0 };
    return { hang, along, downU, downV, pull: along + hang * 0.6, required: 1.6 + 2.6 * along * (1 - hang) + 4.2 * hang };
  }

  considerTransfer(dt, mag, input) {
    this.candidate = null;
    if (this.slipping || input.frozen || mag < 0.3) { this.pushT = 0; return; }
    const L = this.leaf;
    const head = new THREE.Vector3(2.0, -BODY_HEIGHT, 0).applyMatrix4(this.tMat);
    this.headPos = head;
    const fwd = this.forward;
    let best = null;
    for (const M of this.world.leaves) {
      if (M === L) continue;
      const loc = M.toLocal(head, {});
      if (!M.inside(loc.u, loc.v, 0.35)) continue;
      const dist = Math.abs(loc.n) - M.thick / 2;
      const filmHere = this.world.filmAt(L, this.u, this.v), filmThere = this.world.filmAt(M, loc.u, loc.v);
      const direct = dist < 0.55;
      const bridged = dist < 1.2 && filmHere > 0.12 && filmThere > 0.12;
      if (!direct && !bridged) continue;
      const angle = Math.acos(Math.min(1, Math.abs(M.N.dot(L.N))));
      const p = M.toWorld(loc.u, loc.v, 0);
      const ahead = p.sub(this.tPos).dot(fwd) > 0;
      const wall = direct && angle > 0.45 && ahead;
      if (!(this.atEdge || wall)) continue;
      if (!best || dist < best.dist) best = { M, loc, dist, bridged: !direct };
    }
    this.candidate = best;
    const wrapOk = !best && this.atEdge && this.u > 1.0;
    if (best || wrapOk) this.pushT += dt; else this.pushT = 0;
    if (this.pushT < 0.6) return;
    this.pushT = 0;
    if (best) this.transferTo(best, head);
    else this.wrapMargin();
  }

  transferTo({ M, loc, bridged }, head) {
    const oldUp = this.up, fwd = this.forward;
    const side = Math.sign(M.toLocal(this.tPos, {}).n) || 1;
    const proj = (v) => v.clone().addScaledVector(M.N, -v.dot(M.N));
    const nf = proj(fwd).add(proj(oldUp).multiplyScalar(0.8));
    if (nf.lengthSq() < 1e-4) nf.copy(M.U);
    nf.normalize();
    let hu = nf.dot(M.U), hv = nf.dot(M.V);
    const hl = Math.hypot(hu, hv); hu /= hl; hv /= hl;
    let u = loc.u - hu * 1.2, v = loc.v - hv * 1.2;
    u = THREE.MathUtils.clamp(u, 0.7, M.len - 0.7);
    const lim = Math.max(0, M.hwAt(u) - 0.65);
    v = THREE.MathUtils.clamp(v, -lim, lim);
    const snap = this.snapshot();
    Object.assign(this, { leaf: M, side, u, v, hu, hv, grace: 1.4, speed: 0 });
    this.targetFrame();
    this.startBlend(snap, 0.7);
    this.restep(0.07);
    this.events.transfer(`${bridged ? 'Across the water bridge to ' : 'Claws over onto '}${M.name}${side < 0 ? ' (underside)' : ''}`);
  }

  /**
   * After the body moves onto another face, every foot steps over to a hold
   * there, one after another (stagger seconds apart, back to front), instead
   * of being left stretched across the gap with no grip.
   */
  restep(stagger) {
    const order = [6, 7, 4, 5, 2, 3, 0, 1];
    order.forEach((i, k) => {
      const f = this.feet[i];
      const h = this.chooseHold(i, 0);
      f.from.copy(f.world); f.to.copy(h.pos); f.toGrip = h.grip;
      f.t = -k * stagger; f.dur = 0.3; f.state = 'swing'; f.grip = 0;
      f.n.copy(this.leaf.N).multiplyScalar(this.side);
    });
  }

  wrapMargin() {
    const L = this.leaf;
    const snap = this.snapshot();
    this.side = -this.side;
    if (this.u > L.len - 1.2) this.hu = -this.hu; else this.hv = -this.hv;
    const lim = Math.max(0, L.hwAt(this.u) - 0.7);
    this.v = THREE.MathUtils.clamp(this.v, -lim, lim);
    Object.assign(this, { grace: 1.4, speed: 0 });
    this.targetFrame();
    this.startBlend(snap, 0.8);
    this.restep(0.06);
    this.events.transfer(`Round the leaf margin onto the ${this.side > 0 ? 'upper' : 'lower'} face`);
  }

  fall() {
    const p = this.tPos.clone(), dir = new THREE.Vector3(0, -1, 0);
    let best = null;
    for (const M of this.world.leaves) {
      const den = dir.dot(M.N);
      if (Math.abs(den) < 1e-3) continue;
      const t = M.base.clone().sub(p).dot(M.N) / den;
      if (t < 0.2) continue;
      const hit = p.clone().addScaledVector(dir, t);
      const loc = M.toLocal(hit, {});
      if (!M.inside(loc.u, loc.v, 0.7)) continue;
      // Sliding off a steep leaf: never 'fall' back onto the same leaf a few
      // body lengths lower (the old loop of slip, fall, slip on leaf C).
      if (M === this.leaf && t < 3) continue;
      if (!best || t < best.t) best = { M, loc, t };
    }
    if (!best) {
      // Nothing straight below: the cushion is dense, so land on the nearest leaf.
      for (const M of this.world.leaves) {
        if (M === this.leaf) continue;
        const loc = M.toLocal(p, {});
        const u = THREE.MathUtils.clamp(loc.u, 1, M.len - 1);
        const lim = Math.max(0, M.hwAt(u) - 0.8);
        const v = THREE.MathUtils.clamp(loc.v, -lim, lim);
        const t = M.toWorld(u, v, 0).distanceTo(p);
        if (t < 6 && (!best || t < best.t)) best = { M, loc: { u, v }, t };
      }
    }
    this.slipping = false;
    const fwd = this.forward;
    if (best) {
      const M = best.M;
      const side = M.N.y > 0 ? 1 : -1;
      let hu = fwd.dot(M.U), hv = fwd.dot(M.V);
      const hl = Math.hypot(hu, hv) || 1;
      const snap = this.snapshot();
      Object.assign(this, { leaf: M, side, u: best.loc.u, v: best.loc.v, hu: hu / hl, hv: hv / hl, grace: 1.5, speed: 0 });
      this.targetFrame();
      this.startBlend(snap, 0.45);
      this.plantAll();
      this.events.fall(`Lost grip and fell ${Math.round(best.t * 100)} µm onto ${M.name}`);
    } else {
      this.spawn(this.world.leaves[0], 1, 6.5, 0.6, 1, 0);
      this.events.fall('Fell out of the moss cushion: back to leaf A');
    }
  }

  /** Feed the creature rig: feet and normals in body space, sway, claws. */
  writePose(dt, input) {
    const P = this.creature.pose;
    const sp = THREE.MathUtils.clamp(this.speed / (MAX_SPEED * this.s), 0, 1.4);
    P.phase = this.phase;
    P.sway = 0.04 * Math.min(1, sp) + (this.slipping ? 0.03 : 0);
    P.bob = 0.018 * Math.sin(this.phase * Math.PI * 4) * sp;
    P.surge = 0.03 * Math.cos(this.phase * Math.PI * 4) * sp;
    P.breath += dt * 1.3;
    _q.copy(this.dispQuat).invert();
    this.feet.forEach((f, i) => {
      P.feet[i].copy(f.world).applyMatrix4(this.inv);
      P.footN[i].copy(f.n).applyQuaternion(_q);
      P.clawOpen[i] = f.state === 'swing' ? Math.sin(Math.PI * THREE.MathUtils.clamp(f.t, 0, 1)) : f.state === 'drag' ? 0.6 : (f.grip > 0.5 ? 0 : 0.25);
    });
  }
}
