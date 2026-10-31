// Milnesium: the predatory tardigrade that hunts the player through the film.
//
// Milnesium (Apochela) is larger than the grazing eutardigrades (adults
// ~0.5-0.7 mm here drawn 1.5x the player's 350 µm animal), has a short, very
// wide buccal tube and no placoids in its pharynx, and eats rotifers,
// nematodes and other tardigrades. It is a second Walker with its own
// Creature, so it climbs the same cell walls with the same gait.
//
// Behaviour (game rules, labelled in the README):
// - It starts far off, on the tip of the steep leaf C, and for the first CALM
//   seconds it only browses there, so the player can explore first.
// - After that its hunger comes and goes (shared/predation.js createHunger):
//   hungry for ~30-45 s (it is slow to close in), then resting (45-75 s after a bite or a meal, 15-30 s
//   after a jab, losing you or giving up on a tun). Only a hungry one hunts.
// - Hungry, it hunts: it heads for the player slowly (an approach you can see
//   coming, a defocused shape at first) and, within SENSE (touch and chemical
//   cues in the film), stalks at full speed.
// - Its bigger body needs a thicker film: below FILM_NEED it can barely move,
//   so a thin film is a refuge (the player can still move in it).
// - The fight (shared/predation.js createFight): within reach it does not just
//   bite. It winds up first, a clear attack posture (it rears its front, the
//   mouth ring opens wide and the stylets protrude, a pause), then lunges. The
//   player facing it and bracing (B) blocks the lunge (it staggers back); a
//   stylet jab (X) into its head bites back. Facing it, blocks and jabs wear
//   its interest down; at none left it turns and crawls off (retreat), then
//   rests. Calm (wandering, not hungry) it creeps slowly, mouth closed.
// - Mouth to body: an unblocked lunge is a bite that drains reserves, after which it lets go and
//   backs off, sated for a while, before it hunts again. A bite that empties
//   the reserves is the catch: it grips, and swallows you whole (main.js plays
//   it through captureStep). The player can
//   scramble (A) away, jab back with the stylets (X) to make it recoil (it
//   then keeps its distance too), or tun (Y): it cannot get a tun into its
//   mouth quickly and gives up after a few tries.
import * as THREE from '../shared/vendor/three.module.min.js';
import { Creature } from './creature.js';
import { Walker } from './gait.js';
import { createHunger, createFight } from '../shared/predation.js';

export const SCALE = 1.5;
const SENSE = 6.5;        // units (100 µm): stalks at full speed within 650 µm
const LOSE = 11;          // drops back to a slow approach beyond this
const CALM = 40;          // s of browsing at the start before it hunts
const APPROACH = 0.42;    // speed fraction while closing in from afar (slower than the player's walk)
const SATED = 9;          // s it keeps off after a bite
const SHY = 7;            // s it keeps off after a jab
const FILM_NEED = 0.16;   // film index its body needs (the player's is 0.03)
const REACH = 0.85 * SCALE; // mouth to the player's body centre, units
const BITE_EVERY = 1.3;   // s between bites while in contact

function milnesiumLook(c) {
  // Wide buccal tube: spread the tube mesh around its axis; no placoids.
  for (const rec of c.internals) {
    const n = rec.mesh.name;
    if (n === 'buccal tube' || n === 'mouth ring') {
      const r = rec.rest;
      for (let i = 0; i < r.length; i += 3) { r[i + 1] = -0.07 + (r[i + 1] + 0.07) * 2.6; r[i + 2] *= 2.6; }
    }
    if (n === 'placoids') rec.mesh.visible = false;
    if (n === 'stylets') { const r = rec.rest; for (let i = 0; i < r.length; i += 3) r[i + 2] *= 1.6; }
  }
  // Darker, browner gut (it eats animals) and a faintly yellower cuticle.
  c.setGut(new THREE.Vector3(0.9, 1.25, 1.9));
  const u = c.body.userData.opt.uniforms;
  if (u && u.uAbs) u.uAbs.value.multiplyScalar(1.4);
}

export class Predator {
  constructor(scene, world, events) {
    this.world = world;
    this.events = events; // { toast, rumble }
    this.creature = new Creature(scene);
    milnesiumLook(this.creature);
    this.walker = new Walker(world, this.creature, { catch() {}, slip() {}, fall() {}, transfer() {} }, { scale: SCALE, maxSpeed: 2.7, gravity: false });
    this.on = true;
    // pace.mode: 'Comes and goes' | 'Always' | 'Never'; pace.grace: the calm opening (s)
    this.pace = { mode: 'Comes and goes', grace: CALM };
    // its slow approach needs a longer hungry spell than the shared default
    this.hunger = createHunger({ grace: CALM, hungry: [30, 45] });
    this.fight = createFight({ windup: 0.9, strike: 0.32, recoverT: 1.0, repelT: 1.2, retreatT: 7 });
    this.reset();
  }

  reset() {
    // Far off: near the tip of the steep leaf C, ~1.4 mm from the player's start.
    const C = this.world.leaves[2];
    this.walker.spawn(C, 1, 10.5, 0.3, 1, 0);
    Object.assign(this, { state: 'wander', t: 0, cool: 0, recoil: 0, tries: 0, bored: 0, wanderAng: 0, contact: 0, sated: false, after: 0, firstHunt: true, stuck: 0, lastD: Infinity, lunge: 0, rear: 0, fstate: 'stalk', ft: 0, retreatT: 0 });
    this.hunger.reset(this.pace.grace);
    this.fight.reset();
    this.creature.pose.gape = 0;
    this.creature.pose.stylet = 0; this.creature.pose.pump = 0;
  }

  /** Hungry now (honours the Features pacing switch). */
  get hungry() {
    const h = this.hunger, m = this.pace.mode;
    return m === 'Never' ? false : m === 'Always' ? h.state !== 'grace' : h.hungry;
  }

  /**
   * The catch, driven by main.js (shared/predation.js phases): it lunges, mouth
   * tube and stylets first (strike), grips with the stylets out (hold), then
   * the pharynx pumps while the prey is drawn in (eat), and it settles (eaten).
   */
  captureStep(phase, u, dt) {
    this.state = 'capture'; this.t += dt;
    const P = this.creature.pose;
    if (phase === 'strike') { this.lunge = Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5) * 0.35; P.stylet = 1; P.pump = 0.3; }
    else if (phase === 'hold') { this.lunge = 0.35 * (1 - u * 0.6); P.stylet = 1; P.pump = 0.4 + 0.4 * Math.sin(this.t * 9); }
    else if (phase === 'eat') { this.lunge = 0.14 * (1 - u); P.stylet = 0.6; P.pump = 0.6 + 0.4 * Math.sin(this.t * 14); }
    else { this.lunge *= Math.exp(-dt * 3); P.stylet = Math.max(0, P.stylet - dt); P.pump = 0.3 + 0.3 * Math.sin(this.t * 4); }
    P.gape = phase === 'strike' || phase === 'hold' ? 1 : Math.max(0, P.gape - dt * 1.5);
    this.rear *= Math.exp(-dt * 4);
    const w = this.walker;
    // follow (and the fade): sated, it crawls slowly on with you inside it
    const walk = phase === 'follow' || phase === 'fadeOut' || phase === 'fadeIn';
    w.update(dt, { dir: walk ? _d.copy(w.forward) : _d.set(0, 0, 0), mag: walk ? 0.35 : 0, brace: !walk, frozen: false, film: 1, energy: 1, tun: false, dash: false });
    this.creature.group.matrix.copy(w.matrix).multiply(_L.makeTranslation(this.lunge, 0, 0));
    this.creature.group.matrixWorldNeedsUpdate = true;
    this.creature.group.updateMatrixWorld(true);
    this.creature.deformAll();
  }

  /** Visibly attacking: the wind-up posture or the lunge. */
  get attacking() { return this.state === 'stalk' && (this.fstate === 'windup' || this.fstate === 'strike'); }

  setVisible(v) { this.creature.group.visible = v; }

  filmFactor() {
    const w = this.walker;
    const film = this.world.filmAt(w.leaf, w.u, w.v);
    if (film < FILM_NEED) return 0.08 + 0.4 * Math.max(0, film / FILM_NEED); // too thin for its body
    return Math.min(1, 0.55 + 0.45 * (film - FILM_NEED) / 0.25) * (film > 1.1 ? 0.75 : 1);
  }

  /** Mouth in world space. */
  mouth(out = new THREE.Vector3()) { return this.creature.anchorWorld('buccal tube + stylets', out); }

  /**
   * prey: { walker, life, mouth (Vector3, the player's mouth) }
   * Returns events: 'hunt', 'stalk', 'bite', 'tunBite', 'givesUp', 'recoil', 'lost'.
   */
  update(dt, prey, jab) {
    const ev = [];
    const w = this.walker;
    if (!this.on) return ev;
    this.t += dt;
    this.hunger.update(dt);
    const hungry = this.hungry;
    this.creature.pose.pump = Math.max(0, this.creature.pose.pump - dt);
    this.cool = Math.max(0, this.cool - dt);
    const me = w.dispPos, them = prey.walker.dispPos;
    const d = me.distanceTo(them);
    const mouth = this.mouth(_m);
    const mouthD = mouth.distanceTo(them);
    const tun = prey.life.tun > 0.6;

    // The player's stylet jab: works if any part of Milnesium (its axis from
    // mouth to tail) is at the player's mouth.
    const tail = _t.copy(me).addScaledVector(w.forward, -1.7 * SCALE);
    const ax = _a.subVectors(mouth, tail), t = Math.max(0, Math.min(1, _b.subVectors(prey.mouth, tail).dot(ax) / ax.lengthSq()));
    const jabD = _b.copy(tail).addScaledVector(ax, t).distanceTo(prey.mouth);
    this.jabD = jabD;
    this.jabbable = jabD < 1.25 * SCALE || this.contact > 0 || mouthD < REACH * 2.2;
    if (jab && this.jabbable && this.state !== 'recoil' && this.state !== 'retreat') {
      // bitten back: it staggers; enough and it loses interest and crawls off
      const gone = this.fight.bitten();
      ev.push('recoil');
      if (gone) { this.state = 'retreat'; this.retreatT = 7; ev.push('retreat'); }
      else { this.state = 'recoil'; this.recoil = 1.1; this.cool = 1.2; this.after = 0; this.lunge = -0.25; }
    }

    let dir = _d.set(0, 0, 0), mag = 0;
    switch (this.state) {
      case 'wander': { // browsing, or keeping off after a bite or a jab
        this.wanderAng += (Math.sin(this.t * 0.4) + Math.sin(this.t * 1.13)) * 0.6 * dt;
        dir.copy(w.leaf.dirWorld(Math.cos(this.wanderAng), Math.sin(this.wanderAng)));
        if (!w.leaf.inside(w.u + Math.cos(this.wanderAng), w.v + Math.sin(this.wanderAng), 0.8)) this.wanderAng += 2 * dt * 3;
        // Keeping off: drift away from the player rather than about.
        if (!this.firstHunt && d < SENSE) dir.lerp(_e.subVectors(me, them).normalize(), 0.6).normalize();
        mag = this.firstHunt ? 0.3 : 0.45;
        this.bored = Math.max(0, this.bored - dt);
        if (hungry && this.bored <= 0 && prey.life.state === 'active') {
          this.state = 'approach'; this.stuck = 0; this.lastD = d;
          if (this.firstHunt) ev.push('hunt');
          this.firstHunt = false;
        }
        break;
      }
      case 'approach': { // closing in from afar, slowly
        dir.subVectors(them, me).normalize();
        mag = APPROACH;
        // Stuck at a leaf edge with no way across: try along the leaf for a while.
        if (d > this.lastD - 0.02 * dt) this.stuck += dt; else this.stuck = Math.max(0, this.stuck - dt);
        this.lastD = d;
        if (this.stuck > 4) dir.copy(w.leaf.U).multiplyScalar(Math.sign(Math.sin(this.t * 0.2)) || 1);
        if (this.stuck > 9) this.stuck = 0;
        if (prey.life.state !== 'active') { this.state = 'wander'; this.bored = 6; }
        else if (!hungry) { this.state = 'wander'; ev.push('sated'); }
        else if (d < SENSE) { this.state = 'stalk'; if (this.fight.interest <= 0.05) this.fight.reset(); ev.push('stalk'); }
        break;
      }
      case 'stalk': {
        dir.subVectors(them, me).normalize();
        mag = 1;
        if (prey.life.state !== 'active') { this.state = 'wander'; this.bored = 6; ev.push('lost'); break; }
        // once stalking within reach of your scent it sees the hunt through
        if (d > LOSE) { this.state = 'approach'; ev.push('lost'); break; }
        // it stops a little short and winds up: the lunge closes the gap
        const inReach = mouthD < REACH * 2.1 || d < 1.4 * SCALE;
        const f = this.fight.update(dt, { near: d < SENSE, inReach, facing: !!prey.facing, blocking: !!prey.blocking });
        if (f.state !== this.fstate) { if (f.state === 'windup') ev.push('windup'); if (f.state === 'strike') ev.push('strike'); }
        this.fstate = f.state; this.ft = f.t;
        if (f.state === 'windup') mag = 0.04;          // it stops, turns to you and rears
        else if (f.state === 'strike') mag = 0.25;
        else if (f.state === 'recover') mag = 0.1;
        else if (f.state === 'repelled') { dir.subVectors(me, them).normalize(); mag = 0.7; }
        else if (inReach) mag = 0.15;
        this.contact = inReach ? this.contact + dt : 0;
        if (f.blocked) ev.push('blocked');
        if (f.retreated) { this.state = 'retreat'; this.retreatT = 7; ev.push('retreat'); break; }
        if (f.hit) {
          if (tun) {
            this.tries++;
            ev.push('tunBite');
            if (this.tries >= 3) { this.state = 'wander'; this.bored = 18; this.tries = 0; this.wanderAng += Math.PI; if (this.hunger.hungry) this.hunger.missed(); ev.push('givesUp'); }
          } else {
            ev.push('bite');
            // Lets go and backs off, sated for a while (main.js turns a
            // bite that empties your reserves into the full catch).
            this.state = 'recoil'; this.recoil = 2.2; this.after = SATED; this.sated = true; this.contact = 0;
            this.hunger.fed();
          }
        }
        break;
      }
      case 'retreat': { // lost interest: turns and crawls off, then rests
        this.retreatT -= dt;
        dir.subVectors(me, them).normalize();
        mag = 0.8;
        if (this.retreatT <= 0) { this.state = 'wander'; this.bored = 20; this.fight.reset(); this.hunger.missed(); this.after = 0; }
        break;
      }
      case 'recoil': {
        this.recoil -= dt;
        dir.subVectors(me, them).normalize();
        mag = this.sated ? 0.6 : 1;
        if (this.recoil <= 0) {
          // bitten or blocked but still interested: back into the fight; sated or shy: keep off a while
          if (!this.sated && this.after === 0 && hungry && this.fight.interest > 0 && prey.life.state === 'active') { this.state = 'stalk'; this.fight.update(0, {}); }
          else { this.state = 'wander'; this.bored = this.after || SHY; }
          this.after = 0; this.sated = false;
        }
        break;
      }
    }
    const film = this.filmFactor();
    w.update(dt, { dir, mag, brace: false, frozen: false, film, energy: 1, tun: false, dash: this.state === 'recoil' && this.recoil > 1.8 && !this.sated });
    // Posture: calm, attacking and beaten are plainly different.
    const P = this.creature.pose, fs = this.state === 'stalk' ? this.fstate : this.state, k = this.ft;
    let rear = 0, lunge = 0, gape = 0, stylet = 0;
    if (fs === 'windup') { const e = Math.min(1, k * 1.6); rear = 0.42 * e; lunge = -0.22 * e; gape = e; stylet = e; }
    else if (fs === 'strike') { const e = Math.sin(Math.min(1, k) * Math.PI); rear = 0.42 * (1 - k) - 0.12 * e; lunge = -0.22 + 0.85 * Math.min(1, k * 1.8); gape = 1; stylet = 1; if (k > 0.55) lunge = 0.63 - 0.4 * (k - 0.55) / 0.45; }
    else if (fs === 'recover') { rear = 0; lunge = 0.25 * (1 - k); gape = 0.6 * (1 - k); stylet = 0.6 * (1 - k); }
    else if (fs === 'repelled' || this.state === 'recoil') { rear = -0.12; lunge = -0.25 + 0.05 * Math.sin(this.t * 30); gape = 0.2; }
    else if (this.state === 'retreat') { rear = -0.05; }
    else if (this.state === 'stalk' && mouthD < REACH * 2) { stylet = 0.4 + 0.3 * Math.sin(this.t * 7); gape = 0.25; }
    const s = 1 - Math.exp(-dt * 14);
    this.rear += (rear - this.rear) * s;
    this.lunge += (lunge - this.lunge) * s;
    P.gape += (gape - P.gape) * s;
    P.stylet += (stylet - P.stylet) * s;
    this.creature.group.matrix.copy(w.matrix).multiply(_L.makeTranslation(this.lunge, 0.12 * Math.max(0, this.rear), 0)).multiply(_Rz.makeRotationZ(this.rear));
    this.creature.group.matrixWorldNeedsUpdate = true;
    this.creature.deformAll();
    this.thinFilm = film < 0.5;
    this.dist = d;
    return ev;
  }
}
const _L = new THREE.Matrix4(), _Rz = new THREE.Matrix4();
const _e = new THREE.Vector3(), _m = new THREE.Vector3(), _d = new THREE.Vector3(), _t = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
