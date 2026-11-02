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
import { t as say } from '../shared/text.js';

// Speed. The stick is analogue: a slight push walks at WALK_MIN, full tilt at
// WALK_MAX, with a quadratic curve between (fine control near the slow end);
// the scramble (A) is DASH_SPEED. Before 2026-11 the walk limit was 225 µm/s
// but the gait could not keep up: a leg that fell behind held the trunk back
// to 15% of the limit at any deflection, so the walk really ran at ~7-34 µm/s
// and the scramble at ~100-150. The slow end and full tilt are those speeds.
export const WALK_MIN = 0.3;      // units/s = 30 µm/s, a slight push
export const WALK_MAX = 1.5;      // 150 µm/s at full tilt (~0.43 body lengths/s; Nirody: 79-263 µm/s)
export const DASH_SPEED = 2.8;    // the scramble: 280 µm/s, past the fastest measured walking (a stretch)
export const MAX_SPEED = WALK_MAX;
/** The walk speed for a stick deflection 0..1 (after the pad's dead zone). */
export function walkSpeed(m, min = WALK_MIN, max = WALK_MAX) { return m > 0 ? min + (max - min) * Math.min(1, m) * Math.min(1, m) : 0; }
const SWING_FRAC = 0.34;           // of each cycle in swing at a walk; up to 0.45 at a scramble
// Grip hysteresis: start slipping below SLIP_AT of the load, catch again at CATCH_AT.
const SLIP_AT = 0.85, CATCH_AT = 0.75;
// Display smoothing: three first-order lags in series, so the trunk's velocity
// and acceleration stay continuous even when the target jumps (a transfer, the
// leaf margin, a catch).
const SMOOTH_TAU = 0.065;
const FOOT_UP = 0.07;              // claw base above the leaf surface
// Leg reach, as a multiple of each leg's rest length (hip to claw base), measured
// on the body as drawn (the displayed trunk, with its sway). Lobopods telescope
// a little, never more: a planted foot is placed and kept within R_PLANT; past
// R_STEP it must step whatever the wave says; past R_CAP it lets go (or, in
// the air, reaches no further). Nothing is drawn longer than R_CAP.
export const R_PLANT = 1.08, R_STEP = 1.11, R_CAP = 1.14;
// Stance travel (body units) that fits the narrowest leg range at R_PLANT
// (pairs II and III: 0.58) with a margin for turning and the foothold snap.
const T_MAX = 0.5;
const HANDOFF_STAGGER = 0.06;      // s between feet letting go of the old face after a transfer
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

// Per leg: rest length (hip to claw base, body units) and the centre of its
// stance range: under the hip for pairs I-III, behind it for the terminal
// pair IV, which points backwards (the range at R_PLANT runs from the hip to
// about the rest claw).
export const LEG_L0 = LEGS.map((L) => L.ground.distanceTo(L.hip));
const CENTRE = LEGS.map((L) => new THREE.Vector3(L.pair === 3 ? -1.43 : L.hip.x, L.ground.y, L.ground.z));
// Where a foot with nothing in reach is held: drawn up and in under the body.
const TUCK = LEGS.map((L) => new THREE.Vector3(CENTRE[L.index].x + (L.pair === 3 ? 0.25 : 0.04), L.ground.y + 0.2, L.ground.z * 0.88));
const BACK_TO_FRONT = [6, 7, 4, 5, 2, 3, 0, 1];

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _f = new THREE.Vector3(), _h = new THREE.Vector3(), _w = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _loc = {};
const clamp = THREE.MathUtils.clamp;

export class Walker {
  /**
   * opts: { scale (body size relative to the player's 350 µm animal), maxSpeed,
   * minSpeed, curve (false: speed is maxSpeed × mag, linear, for the AI), smooth }
   * The predator (Milnesium) is a second walker at scale ~1.5.
   */
  constructor(world, creature, events, opts = {}) {
    this.world = world;
    this.creature = creature;
    this.events = events; // { catch(q), slip(), fall(text), transfer(text) }
    this.opts = { footholds: true, gravity: true, smooth: true, ...opts };
    this.s = opts.scale || 1;
    this.maxSpeed = opts.maxSpeed || WALK_MAX;
    this.minSpeed = opts.minSpeed ?? WALK_MIN;
    this.curve = opts.curve !== false;
    this.midPos = new THREE.Vector3(); this.midPos2 = new THREE.Vector3();
    this.midQuat = new THREE.Quaternion(); this.midQuat2 = new THREE.Quaternion();
    this.dispPos = new THREE.Vector3();
    this.dispQuat = new THREE.Quaternion();
    this.matrix = new THREE.Matrix4();
    this.inv = new THREE.Matrix4();
    this.clock = 0;
    this.stats = { letGo: 0, capped: 0, steps: 0 }; // for scripted checks
    // state: 'stance' (claws hooked or resting on a cell), 'swing' (stepping to
    // a hold), 'reach' (let go, nothing in reach: held tucked, looking for a
    // hold), 'drag' (scraped along while slipping). leaf/side: the face it holds.
    this.feet = LEGS.map(() => ({ world: new THREE.Vector3(), n: new THREE.Vector3(0, 1, 0), state: 'stance', grip: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), toGrip: 0, t: 0, dur: 0.3, cycle: -1, leaf: null, side: 1, retry: 0 }));
    this.spawn(world.leaves[0], 1, 6.5, 0.6, 1, 0);
  }

  spawn(leaf, side, u, v, hu, hv) {
    Object.assign(this, { leaf, side, u, v, hu, hv, cameFrom: null, speed: 0, phase: 0, slipping: false, slipT: 0, deficitT: 0, slipVel: [0, 0], pushT: 0, grace: 1, tau: SMOOTH_TAU, blend: null, atEdge: false, wrapCandidate: null, handoffT: 0, hold: 1 });
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

  surfacePoint(u, v, out) { return this.leaf.toWorld(u, v, this.side * (this.leaf.thick / 2 + FOOT_UP), out); }

  /** Leg i's hip on the body as drawn (body units, with the trunk's sway and surge). */
  hipBody(i, out) { const h = LEGS[i].hip; return this.creature.bodyDeform(h.x, h.y, h.z, out); }

  /**
   * How far leg i is stretched to a foot at world point p: hip-to-foot over its
   * rest length, on the displayed body. `ahead`: the body will have moved that
   * far forward (world units) by then.
   */
  ratio(i, p, ahead = 0) {
    _f.copy(p).applyMatrix4(this.inv);
    _f.x -= ahead / this.s;
    return _f.distanceTo(this.hipBody(i, _h)) / LEG_L0[i];
  }

  /** Pull a foot in towards its hip until the leg is no longer than R_CAP. */
  capFoot(i, p) {
    _f.copy(p).applyMatrix4(this.inv);
    this.hipBody(i, _h);
    const d = _f.distanceTo(_h), lim = R_CAP * LEG_L0[i];
    if (d <= lim) return false;
    _f.sub(_h).multiplyScalar(lim / d).add(_h);
    p.copy(_f).applyMatrix4(this.matrix);
    return true;
  }

  /** Leg i's stance centre on the displayed body, as (u, v) on the current face. */
  neutralUV(i) { return this.leaf.toLocal(_c.copy(CENTRE[i]).applyMatrix4(this.matrix), _loc); }

  /**
   * Choose a hold for leg i on the face the body is on: its stance centre,
   * `lead` ahead along the heading, kept on the leaf, snapped to a cell wall if
   * one is in reach. ok: the leg reaches it (with the body `ahead` further on).
   */
  chooseHold(i, lead = 0, ahead = 0) {
    const L = this.leaf;
    const n = this.neutralUV(i);
    let u = n.u + this.hu * lead, v = n.v + this.hv * lead;
    // Stay on the leaf: a foot over the edge comes in to the margin.
    u = clamp(u, 0.1, L.len - 0.1);
    const lim = Math.max(0, L.hwAt(u) - 0.08);
    v = clamp(v, -lim, lim);
    if (!this.opts.footholds) {
      const pos = this.surfacePoint(u, v, new THREE.Vector3());
      return { pos, grip: 0.8, ok: this.ratio(i, pos, ahead) <= R_STEP };
    }
    // A wall within the stance range is best; the cell under the stance point
    // (a poor hold) next; a wall the leg only just reaches last.
    const hold = this.world.foothold(L, u, v, 0.16 * this.s, this.hu, this.hv);
    let wall = null;
    if (hold) {
      wall = this.surfacePoint(hold.u, hold.v, new THREE.Vector3());
      const r = this.ratio(i, wall, ahead);
      if (r <= R_PLANT) return { pos: wall, grip: hold.quality, ok: true };
      if (r > R_STEP) wall = null;
    }
    const pos = this.surfacePoint(u, v, new THREE.Vector3());
    const r = this.ratio(i, pos, ahead);
    if (r <= R_PLANT || !wall) return { pos, grip: 0.15, ok: r <= R_STEP };
    return { pos: wall, grip: hold.quality, ok: true };
  }

  /** Where leg i is held when it has nothing in reach: tucked, paddling a little. */
  tuckPoint(i, out) {
    const w = this.clock * 7 + i * 1.7;
    return out.set(0.05 * Math.sin(w), 0.03 * Math.cos(w), 0).add(TUCK[i]).applyMatrix4(this.matrix);
  }

  setFace(f) { f.leaf = this.leaf; f.side = this.side; f.n.copy(this.leaf.N).multiplyScalar(this.side); }

  /** Plant every foot where it stands (a spawn, a catch): those out of reach are held tucked. */
  plantAll() {
    LEGS.forEach((_, i) => {
      const h = this.chooseHold(i, 0);
      const f = this.feet[i];
      this.setFace(f);
      if (h.ok) { f.world.copy(h.pos); f.grip = h.grip; f.state = 'stance'; } else { this.letGo(f); this.tuckPoint(i, f.world); }
    });
  }

  /** The foot lets go: nothing to hold in reach (it is drawn in to its tuck). */
  letGo(f) { f.state = 'reach'; f.grip = 0; f.retry = 0; this.stats.letGo++; }

  /** Start a swing of foot f to hold h. */
  swing(f, h, dur) {
    f.from.copy(f.world); f.to.copy(h.pos); f.toGrip = h.grip;
    f.t = 0; f.dur = dur; f.state = 'swing'; f.grip = 0; this.stats.steps++;
    this.setFace(f);
  }

  /**
   * @param dt seconds
   * @param input { dir: Vector3 world (desired), mag 0..1, brace, frozen, film, energy, tun, dash }
   */
  update(dt, input) {
    const L = this.leaf, S = this.s;
    this.grace = Math.max(0, this.grace - dt);
    this.handoffT = Math.max(0, this.handoffT - dt);
    this.clock += dt;
    const ev = this.events;
    // ---- footing: a planted foot trailing near the end of its reach holds the
    // trunk back (it should have stepped); with few feet down it cannot push.
    let rmax = 0, planted = 0;
    this.feet.forEach((f, i) => {
      if (f.state !== 'stance') return;
      planted++;
      if (f.leaf !== L || f.side !== this.side) return;
      const r = this.ratio(i, f.world), rNext = this.ratio(i, f.world, 0.02 * this.speed);
      if (rNext > r) rmax = Math.max(rmax, rNext);
    });
    this.hold = clamp((R_CAP - rmax) / (R_CAP - R_STEP), 0.35, 1) * clamp(planted / 4, 0.3, 1);
    // ---- steering, in leaf coordinates
    let du = input.dir.dot(L.U), dv = input.dir.dot(L.V);
    const dl = Math.hypot(du, dv);
    const mag = input.frozen || this.slipping ? 0 : input.mag * (dl > 0.05 ? 1 : 0);
    let turn = 0;
    if (mag > 0) {
      du /= dl; dv /= dl;
      const cross = this.hu * dv - this.hv * du, dot = this.hu * du + this.hv * dv;
      const diff = Math.atan2(cross, dot);
      const maxTurn = (input.brace ? 0.6 : input.dash ? 1.6 : 1.1) * Math.max(0.5, this.hold) * dt;
      turn = clamp(diff, -maxTurn, maxTurn);
      const c = Math.cos(turn), s = Math.sin(turn);
      [this.hu, this.hv] = [this.hu * c - this.hv * s, this.hu * s + this.hv * c];
      this.align = Math.max(0, Math.cos(diff - turn));
    } else this.align = 0;

    // Speed: the analogue walk (walkSpeed), or A's scramble.
    const base = input.dash ? Math.max(DASH_SPEED * S, this.maxSpeed) * Math.min(1, mag)
      : this.curve ? walkSpeed(mag, this.minSpeed, this.maxSpeed) : this.maxSpeed * mag;
    const target = base * this.align * input.film * (input.brace ? 0.45 : 1) * (0.6 + 0.4 * input.energy) * this.hold;
    const acc = (target > this.speed ? (input.dash ? 14 : 3) : 4) * S;
    this.speed += clamp(target - this.speed, -acc * dt, acc * dt);
    if (this.speed < 0.002) this.speed = 0;
    // Pulsed propulsion: the trunk surges as each wave of legs pushes.
    const surge = 1 + 0.3 * Math.cos(this.phase * Math.PI * 4); // mean 1: the speed is the speed over the ground
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
    // A leaf rising across the way is a wall: the head presses against it
    // (and, held there, climbs it) instead of walking through it.
    const wall = this.candidate && this.candidate.wall && this.candidate.dist < 0.3 && mag > 0 && !this.slipping;
    if (wall) { this.atEdge = true; this.speed *= 0.5; }
    else if (L.inside(nu, nv, 0.55)) { this.u = nu; this.v = nv; }
    else if (this.slipping) { this.fall(); return; }
    else if (mag > 0) { this.atEdge = true; this.speed *= 0.5; }

    const moving = this.speed > 0.03 || Math.abs(turn) > 0.002;
    // Cadence: strides lengthen with speed only as far as the legs reach (the
    // stance travel fits every leg's range); beyond that the legs step faster,
    // and at a scramble a larger share of each cycle is in swing.
    const sp = this.speed / S;
    const SF = SWING_FRAC + 0.11 * clamp((sp - WALK_MAX) / (DASH_SPEED - WALK_MAX), 0, 1);
    const stride = Math.min(T_MAX / (1 - SF), 0.45 + 0.22 * sp) * S;
    const travel = stride * (1 - SF);
    this.stride = stride;
    this.phase += (this.speed / stride) * dt + (Math.abs(turn) * 0.9 * S / stride);
    this.targetFrame();

    // ---- legs
    const swinging = () => this.feet.reduce((n, f) => n + (f.state === 'swing' ? 1 : 0), 0);
    const early = (j) => j >= 0 && j < 8 && this.feet[j].state === 'swing' && this.feet[j].t < 0.6;
    const isSwing = (j) => this.feet[j].state === 'swing';
    const dur0 = clamp((SF * stride) / Math.max(this.speed, 0.2 * S), input.dash ? 0.06 : 0.08, 0.35) * (input.brace ? 1.35 : 1);
    const limit = input.brace ? 2 : sp > WALK_MAX ? 4 : 3;
    let settleDone = false;
    // Largest error first so settling steps go to the worst leg; after a
    // transfer, the feet still on the old face let go back to front.
    const order = this.handoffPending() ? BACK_TO_FRONT : [...this.feet.keys()].sort((a, b) => this.errOf(b) - this.errOf(a));
    for (const i of order) {
      const f = this.feet[i];
      if (f.state === 'swing') continue;
      if (this.slipping) {
        // Dragged: claws scrape over the walls under the body.
        const h = this.chooseHold(i, 0);
        if (h.ok) { f.world.copy(h.pos); f.state = 'drag'; this.setFace(f); } else if (f.state !== 'reach') this.letGo(f);
        f.grip = 0;
        continue;
      }
      if (f.state === 'reach') {
        // Let go with nothing in reach: look again every few frames for a hold.
        if ((f.retry -= dt) > 0 || input.tun) continue;
        f.retry = 0.05;
        const h = this.chooseHold(i, moving ? travel * 0.5 : 0, this.speed * 0.15);
        if (h.ok && !isSwing(i ^ 1)) this.swing(f, h, 0.15);
        continue;
      }
      if (f.state === 'drag') { f.state = 'stance'; f.grip = 0.15; }
      // Judged where the body will be drawn this frame (it moves after the legs).
      const r = this.ratio(i, f.world, this.speed * dt * 2 + 0.01 * S);
      const ph = this.phase + OFF[i];
      const cyc = Math.floor(ph), loc = ph - cyc;
      const onOld = f.leaf !== this.leaf || f.side !== this.side;
      const want = moving && loc < SF && f.cycle !== cyc;
      const need = r > R_STEP;
      const handoff = onOld && this.handoffT <= 0;
      const settle = !moving && !settleDone && this.errOf(i) > 0.09 * S && swinging() === 0;
      if (!(want || need || handoff || settle)) continue;
      const ok = !early(i - 2) && !early(i + 2) && !isSwing(i ^ 1) && swinging() < limit && !input.tun;
      if (!ok && !need) continue;
      // Lift, to a hold ahead: it lands half a stance forward of its centre
      // and the body moves on while it swings.
      const dur = settle && !moving ? 0.25 : dur0;
      const ahead = moving ? this.speed * dur : 0;
      const h = this.chooseHold(i, moving ? travel * 0.5 + ahead : 0, ahead);
      if (handoff) this.handoffT = HANDOFF_STAGGER;
      if (!h.ok) {
        // Nothing in reach on the face under the body yet: keep the hold it
        // has while the leg reaches it, let go once it cannot.
        if (need || (onOld && r > R_PLANT)) this.letGo(f);
        continue;
      }
      this.swing(f, h, dur);
      f.cycle = cyc;
      if (settle) settleDone = true;
    }
    this.feet.forEach((f, i) => {
      if (f.state !== 'swing') return;
      f.t += dt / f.dur;
      // A swing aims where the leg will reach when it lands. If the body has
      // not gone where it was expected (it slowed, turned, a transfer), the
      // foot picks a new hold on the way rather than landing stretched.
      const left = Math.max(0, 1 - f.t) * f.dur;
      if (f.t > 0 && this.ratio(i, f.to, this.speed * left) > R_STEP && f.leaf === this.leaf && f.side === this.side) {
        const h = this.chooseHold(i, moving ? travel * 0.5 + this.speed * left : 0, this.speed * left);
        if (h.ok) { f.to.copy(h.pos); f.toGrip = h.grip; }
      }
      const tt = clamp(f.t, 0, 1);
      const e = THREE.MathUtils.smootherstep(tt, 0, 1);
      f.world.lerpVectors(f.from, f.to, e).addScaledVector(f.n, 0.13 * S * Math.sin(Math.PI * tt));
      if (f.t >= 1) {
        f.world.copy(f.to);
        if (this.ratio(i, f.to) > R_STEP) { this.letGo(f); return; } // nothing to land on in reach
        f.state = 'stance'; f.grip = f.toGrip;
        if (f.grip > 0.5) ev.catch(f.grip);
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
        const G2 = holds.reduce((s, h) => s + (h.ok ? h.grip : 0), 0);
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
    // The steady lag of the three filters (3 tau at a constant speed) is fed
    // forward, so the body drawn is where the feet are placed for.
    if (this.opts.smooth) {
      const k = 1 - Math.exp(-dt / this.tau);
      const [bp, bq] = this.blendTarget(dt);
      const lead = _c.copy(this.forward).multiplyScalar(this.speed * 3 * this.tau).add(bp);
      this.midPos.lerp(lead, k); this.midPos2.lerp(this.midPos, k); this.dispPos.lerp(this.midPos2, k);
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
    this.trunkPose(dt);
    this.enforceReach(dt);
    this.writePose(input);
  }

  /** Feet still holding the face the body left (after a transfer, the margin, a fall). */
  handoffPending() { return this.feet.some((f) => f.state === 'stance' && (f.leaf !== this.leaf || f.side !== this.side)); }

  /**
   * On the body as drawn this frame: no leg longer than R_CAP. A planted foot
   * past it lets go; a foot in the air reaches no further than it; a foot with
   * nothing in reach is drawn in to its tuck.
   */
  enforceReach(dt) {
    const k = 1 - Math.exp(-dt / 0.07);
    this.feet.forEach((f, i) => {
      if (f.state === 'reach') f.world.lerp(this.tuckPoint(i, _w), k);
      else if ((f.state === 'stance' || f.state === 'drag') && this.ratio(i, f.world) > R_CAP) this.letGo(f);
      if (this.capFoot(i, f.world) && f.state !== 'reach') this.stats.capped++;
    });
  }

  /** The pose before a change of face, for blendTarget. */
  snapshot() { return { pos: this.tPos.clone().addScaledVector(this.forward, this.speed * 3 * this.tau), quat: this.tQuat.clone() }; }

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

  /** How far foot i is from its stance centre on the displayed body (world units). */
  errOf(i) {
    return this.feet[i].world.distanceTo(_b.copy(CENTRE[i]).applyMatrix4(this.matrix));
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
    // Hysteresis: the leaf just left is not reached for again (the head is
    // often still under its tip after a hand-over, and a nudge against the new
    // leaf's narrow base used to carry the animal straight back, and forth)
    // unless the stick turns back the way the animal came.
    const back = this.cameFrom;
    const dl = input.dir ? input.dir.length() : 0;
    const turnedBack = !!back && dl > 1e-6 && input.dir.dot(back.dir) / dl < -0.3;
    for (const M of this.world.leaves) {
      if (M === L) continue;
      if (back && M === back.leaf && !turnedBack) continue;
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
      if (!best || dist < best.dist) best = { M, loc, dist, bridged: !direct, wall };
    }
    this.candidate = best;
    const wrapOk = !best && this.atEdge && this.u > 1.0;
    // (at a run the body bumps the edge every other frame: a missed frame
    // lets the push decay rather than start again)
    if (best || wrapOk) this.pushT += dt; else this.pushT = Math.max(0, this.pushT - 2 * dt);
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
    this.cameFrom = { leaf: this.leaf, dir: fwd.clone() };
    Object.assign(this, { leaf: M, side, u, v, hu, hv, grace: 1.4, speed: 0 });
    this.targetFrame();
    this.startBlend(snap, 0.7);
    this.handoffT = 0;
    this.events.transfer(say(`tardigrade.toasts.${bridged ? 'bridge' : 'clawsOver'}${side < 0 ? 'Underside' : ''}`, { leaf: M.name }));
  }

  wrapMargin() {
    const L = this.leaf;
    const snap = this.snapshot();
    this.side = -this.side;
    if (this.u > L.len - 1.2) this.hu = -this.hu; else this.hv = -this.hv;
    const lim = Math.max(0, L.hwAt(this.u) - 0.7);
    this.v = THREE.MathUtils.clamp(this.v, -lim, lim);
    Object.assign(this, { grace: 1.4, speed: 0, cameFrom: null });
    this.targetFrame();
    this.startBlend(snap, 0.8);
    this.handoffT = 0;
    this.events.transfer(say(this.side > 0 ? 'tardigrade.toasts.marginUpper' : 'tardigrade.toasts.marginLower'));
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
      // Nothing straight below: the cushion is dense, so land on the nearest
      // leaf. Hanging under a leaf, that is the same leaf's upper face (it
      // scrambles back over the margin): dropping onto the leaf it came from
      // instead carried a walker back a leaf every time, and on round again.
      const under = this.side * this.leaf.N.y < 0;
      for (const M of this.world.leaves) {
        if (M === this.leaf && !under) continue;
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
      Object.assign(this, { leaf: M, side, u: best.loc.u, v: best.loc.v, hu: hu / hl, hv: hv / hl, grace: 1.5, speed: 0, cameFrom: null });
      this.targetFrame();
      this.startBlend(snap, 0.45);
      // Falling, the legs let go and paddle; they catch as the body lands.
      this.feet.forEach((f) => this.letGo(f));
      this.events.fall(say('tardigrade.toasts.fell', { um: Math.round(best.t * 100), leaf: M.name }));
    } else {
      this.spawn(this.world.leaves[0], 1, 6.5, 0.6, 1, 0);
      this.events.fall(say('tardigrade.toasts.fellOut'));
    }
  }

  /** The trunk's sway, bob and surge for this frame (the hips move with them). */
  trunkPose(dt) {
    const P = this.creature.pose;
    const sp = clamp(this.speed / (WALK_MAX * this.s), 0, 1.4);
    P.phase = this.phase;
    P.sway = 0.04 * Math.min(1, sp) + (this.slipping ? 0.03 : 0);
    P.bob = 0.018 * Math.sin(this.phase * Math.PI * 4) * sp;
    P.surge = 0.03 * Math.cos(this.phase * Math.PI * 4) * sp;
    P.breath += dt * 1.3;
  }

  /** Feed the creature rig: feet and normals in body space, claws. */
  writePose() {
    const P = this.creature.pose;
    _q.copy(this.dispQuat).invert();
    this.feet.forEach((f, i) => {
      P.feet[i].copy(f.world).applyMatrix4(this.inv);
      P.footN[i].copy(f.n).applyQuaternion(_q);
      P.clawOpen[i] = f.state === 'swing' ? Math.sin(Math.PI * clamp(f.t, 0, 1)) : f.state === 'reach' ? 0.7 : f.state === 'drag' ? 0.6 : (f.grip > 0.5 ? 0 : 0.25);
    });
  }
}
