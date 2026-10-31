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
// - Then it hunts: it heads for the player slowly (an approach you can see
//   coming, a defocused shape at first) and, within SENSE (touch and chemical
//   cues in the film), stalks at full speed.
// - Its bigger body needs a thicker film: below FILM_NEED it can barely move,
//   so a thin film is a refuge (the player can still move in it).
// - Mouth to body: a bite that drains reserves, after which it lets go and
//   backs off, sated for a while, before it hunts again. The player can
//   scramble (A) away, jab back with the stylets (X) to make it recoil (it
//   then keeps its distance too), or tun (Y): it cannot get a tun into its
//   mouth quickly and gives up after a few tries.
import * as THREE from '../shared/vendor/three.module.min.js';
import { Creature } from './creature.js';
import { Walker } from './gait.js';

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
    this.reset();
  }

  reset() {
    // Far off: near the tip of the steep leaf C, ~1.4 mm from the player's start.
    const C = this.world.leaves[2];
    this.walker.spawn(C, 1, 10.5, 0.3, 1, 0);
    Object.assign(this, { state: 'wander', t: 0, cool: 0, recoil: 0, tries: 0, bored: CALM, wanderAng: 0, contact: 0, sated: false, after: 0, firstHunt: true, stuck: 0, lastD: Infinity });
  }

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
    if (jab && (jabD < 1.1 * SCALE || this.contact > 0) && this.state !== 'recoil') {
      this.state = 'recoil'; this.recoil = 2.4; this.cool = 2.5; this.after = SHY;
      ev.push('recoil');
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
        if (this.bored <= 0 && prey.life.state === 'active') {
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
        else if (d < SENSE) { this.state = 'stalk'; ev.push('stalk'); }
        break;
      }
      case 'stalk': {
        dir.subVectors(them, me).normalize();
        mag = 1;
        if (prey.life.state !== 'active') { this.state = 'wander'; this.bored = 6; ev.push('lost'); }
        else if (d > LOSE) { this.state = 'approach'; ev.push('lost'); }
        if (mouthD < REACH) {
          this.contact += dt;
          mag = 0.15;
          if (this.cool <= 0) {
            this.cool = BITE_EVERY;
            if (tun) {
              this.tries++;
              ev.push('tunBite');
              if (this.tries >= 3) { this.state = 'wander'; this.bored = 18; this.tries = 0; this.wanderAng += Math.PI; ev.push('givesUp'); }
            } else {
              ev.push('bite');
              // Lets go and backs off, sated for a while.
              this.state = 'recoil'; this.recoil = 2.2; this.after = SATED; this.sated = true; this.contact = 0;
            }
          }
        } else this.contact = 0;
        break;
      }
      case 'recoil': {
        this.recoil -= dt;
        dir.subVectors(me, them).normalize();
        mag = this.sated ? 0.6 : 1;
        if (this.recoil <= 0) { this.state = 'wander'; this.bored = this.after || SHY; this.after = 0; this.sated = false; }
        break;
      }
    }
    const film = this.filmFactor();
    w.update(dt, { dir, mag, brace: false, frozen: false, film, energy: 1, tun: false, dash: this.state === 'recoil' && this.recoil > 1.8 && !this.sated });
    this.creature.group.matrix.copy(w.matrix);
    this.creature.group.matrixWorldNeedsUpdate = true;
    this.creature.pose.stylet = this.state === 'stalk' && mouthD < REACH * 1.4 ? 0.5 + 0.5 * Math.sin(this.t * 7) : Math.max(0, this.creature.pose.stylet - dt * 2);
    this.creature.deformAll();
    this.thinFilm = film < 0.5;
    this.dist = d;
    return ev;
  }
}
const _e = new THREE.Vector3(), _m = new THREE.Vector3(), _d = new THREE.Vector3(), _t = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
