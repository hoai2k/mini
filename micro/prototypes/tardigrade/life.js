// The animal's health (its reserves), feeding, and the tun.
//
// The encounter pattern (../../design/encounter-pattern.md): no hidden
// clocks. There is no drying day, no water meter and no hunger: the film
// stays as it is (the dry patches on the dry ring are places you can see), the
// reserves are your health (bites and stabs take them, food gives them back)
// and nothing drains them while you stay in a safe spot.
//
// Holding Y draws the animal into a tun: the trunk contracts lengthways and
// the legs are pulled in (Halberg et al. 2013 showed this is an active,
// muscle-driven shape change); a predator struggles to get a tun into its
// mouth. Press Y again and it rehydrates and walks on (it always wakes).
import * as THREE from '../shared/vendor/three.module.min.js';
import { t as tt } from '../shared/text.js';

const TUN_FORM = 2.2, REVIVE_TIME = 2.4;

/**
 * Where food can be eaten, in the animal's own frame (x forward, the body
 * runs from the tail at x ≈ -1.6 to the mouth ring at x ≈ 1.84): anywhere
 * under the front quarter of the body (the head and the first leg pair,
 * x ≥ 0.98, within 0.6 of the midline), or just ahead of the mouth (within
 * 0.42 of it). The owner (2026-11-02): eat what is under the mouth, not only
 * what is straight ahead.
 */
export const REACH = { front: 0.98, tip: 1.84, halfW: 0.6, mouth: [1.8, 0], ahead: 0.42 };

const _gut = new THREE.Vector3();
const _fp = new THREE.Vector3();

export class Life {
  /**
   * opts.clock (default true): this animal's Life owns the shared world state
   * (the rain test). In local multiplayer only player 1's does.
   */
  constructor(world, walker, creature, events, opts = {}) {
    Object.assign(this, { world, walker, creature, events });
    this.ownsClock = opts.clock !== false;
    this.day0 = opts.day || null;
    this.opts = {};
    this.energy = 1;
    this.newDay(true);
    this.gutColour = new THREE.Vector3(0.62, 0.6, 0.5);
    /** The player's variety: a filter on the gut colour (what this animal tends to eat); (1, 1, 1) for player 1. */
    this.gutTint = new THREE.Vector3(1, 1, 1);
  }

  /** A restart: back at the start, full health, the food back in place (the shell's or the RS test). */
  newDay(first = false) {
    if (!this.ownsClock) { this.respawn(1); return; }
    this.rainT = 0;
    this.energy = 1;
    this.state = 'active';
    this.tun = 0; this.tunHold = 0;
    this.feeding = null;
    this.target = null;
    this.creature.pose.tun = 0;
    if (!first) { this.world.reseed(); const s = this.events.startSpot?.(); if (s) this.walker.spawn(...s); this.events.newDay?.(); }
  }

  /** Back again after being caught: health restored, the world left as it is. */
  respawn(energy = 1) {
    Object.assign(this, { energy: Math.max(this.energy || 0, energy), state: 'active', tun: 0, tunHold: 0, feeding: null, rainT: 0 });
    this.creature.pose.tun = 0;
  }

  /** Test (RB): a shower floods the film for a moment; it settles back as it was. */
  rain() {
    this.rainT = 2.2;
    this.events.toast(tt('tardigrade.toasts.rain'));
  }

  filmHere() {
    const w = this.walker;
    return this.world.filmAt(w.leaf, w.u, w.v);
  }

  /**
   * How far food item `item` is from the mouth (in body units, along the
   * leaf) if it lies in reach (REACH, grown by `margin`), else Infinity.
   */
  reach(item, margin = 0) {
    const w = this.walker;
    if (item.leaf !== w.leaf || item.side !== w.side) return Infinity;
    const L = item.leaf;
    const p = L.toWorld(item.u, item.v, item.side * (L.thick / 2 + 0.06), _fp).applyMatrix4(w.inv);
    if (Math.abs(p.y + 0.6) > 0.5 + margin) return Infinity; // on the face under the feet
    const [mx, mz] = REACH.mouth, d = Math.hypot(p.x - mx, p.z - mz);
    const under = p.x >= REACH.front - margin && p.x <= REACH.tip + margin && Math.abs(p.z) <= REACH.halfW + margin;
    return under || d <= REACH.ahead + margin ? d : Infinity;
  }

  /** The food item X would eat now (nearest the mouth), or null. */
  foodInReach() {
    let best = null, bd = Infinity;
    for (const item of this.world.food) {
      const d = this.reach(item);
      if (d < bd) { bd = d; best = item; }
    }
    return best;
  }

  /** input: { yDown, yPressed, bitePressed (X), aPressed, moving(0..1) } */
  update(dt, input) {
    const ev = this.events;
    const P = this.creature.pose;
    if (this.ownsClock) {
      // the rain test floods the film; it eases back to how it was
      if (this.rainT > 0) { this.rainT -= dt; this.world.setDry(THREE.MathUtils.lerp(this.world.dry, -0.35, 1 - Math.exp(-dt * 2.5))); }
      else if (this.world.dry !== this.world.dry0) {
        const d = THREE.MathUtils.lerp(this.world.dry, this.world.dry0, 1 - Math.exp(-dt * 0.5));
        this.world.setDry(Math.abs(d - this.world.dry0) < 1e-3 ? this.world.dry0 : d);
      }
    }
    switch (this.state) {
      case 'active': {
        this.updateFeeding(dt, input);
        // what X would eat now (main.js highlights it and readies the mouth)
        this.target = !this.feeding && !this.walker.slipping && this.tun < 0.02 ? this.foodInReach() : null;
        // Tun: hold Y
        const forming = input.yDown && !this.feeding;
        this.tun = THREE.MathUtils.clamp(this.tun + (forming ? dt / TUN_FORM : -dt / 1.2), 0, 1);
        if (this.tun >= 1) { this.state = 'tun'; this.tunT = 0; ev.toast(tt('tardigrade.toasts.tunFormed')); ev.rumble(220, 0.3, 0.5); }
        break;
      }
      case 'tun': {
        this.tunT += dt;
        if (input.yPressed && this.tunT > 0.6) { this.state = 'revive'; this.reviveT = 0; }
        break;
      }
      case 'revive': {
        this.reviveT += dt;
        const k = Math.min(1, this.reviveT / REVIVE_TIME);
        this.tun = 1 - k * k;
        if (k >= 1) { this.state = 'active'; this.tun = 0; ev.toast(tt('tardigrade.toasts.rehydrated')); ev.rumble(160, 0.2, 0.2); }
        break;
      }
      case 'dead':
        if (input.aPressed) { if (this.events.restart) this.events.restart(this); else this.newDay(); }
        break;
    }
    if (this.state !== 'active') this.target = null;
    P.tun = this.tun;
    // Gut colour follows what was eaten (darker when full of food).
    const g = _gut.copy(this.gutColour).multiply(this.gutTint).clampScalar(0.02, 1);
    const absGut = new THREE.Vector3(-Math.log(g.x), -Math.log(g.y), -Math.log(g.z)).multiplyScalar(0.5 + 1.5 * this.energy).addScalar(0.1);
    this.creature.setGut(absGut);
  }

  /** Milnesium got it: the run ends (A starts a new day). */
  eaten() {
    if (this.state !== 'active') return;
    this.state = 'dead'; this.feeding = null; this.tun = 0;
    this.events.toast(tt('tardigrade.toasts.eatenNewDay'), 6000);
  }

  // Feeding no longer holds the animal still (the owner, 2026-11-02: 'allow him
  // to continue moving while he eats'); walking off the food ends the meal early.
  get frozen() { return this.state !== 'active' || this.tun > 0.02; }

  updateFeeding(dt, input) {
    const P = this.creature.pose;
    const w = this.walker;
    if (this.feeding) {
      const f = this.feeding;
      f.t += dt;
      P.stylet = 0.5 + 0.5 * Math.sin(f.t * 9);
      P.pump = Math.max(0, Math.sin(f.t * 14));
      // events.swallowed (main.js): the food is drawn in through the buccal tube and
      // stays visible inside, fading into the gut; without it, it just shrinks.
      if (f.item && !this.events.swallowed) f.item.mesh.scale.setScalar(Math.max(0.05, 1 - f.t / f.dur));
      if (input.bitePressed && f.t > 0.2) { this.events.spat?.(f); this.feeding = null; return; }
      // Walked off before the food is in the mouth (an item still being drawn
      // in, the first 45%; a leaf cell still streaming, the first 60%): the meal
      // breaks off. An item goes back where it was (main.js animateEating); a
      // leaf cell gives the share already sucked out. Once it's in, walk on.
      if (f.t / f.dur < (f.item ? 0.45 : 0.6)) {
        let gone;
        // an item: out of reach (with some slack) of the front of the body
        if (f.item) gone = this.reach(f.item, 0.3) === Infinity;
        else {
          gone = f.leaf !== w.leaf;
          if (!gone) {
            const ml = w.leaf.toLocal(this.creature.anchorWorld('buccal tube + stylets'), {});
            gone = Math.hypot(f.cell[0] - ml.u, f.cell[1] - ml.v) > 0.7;
          }
        }
        if (gone) {
          if (!f.item) {
            const part = f.t / f.dur;
            this.energy = Math.min(1, this.energy + f.value * part);
            if (part > 0.15) this.events.toast(tt('tardigrade.toasts.fedLittle', { name: f.name, pct: Math.round(f.value * part * 100) }));
          }
          this.feeding = null;
          return;
        }
      }
      if (f.t >= f.dur) {
        this.energy = Math.min(1, this.energy + f.value);
        if (this.events.swallowed) this.events.swallowed(f); // tints the gut as it fades
        else this.gutColour.lerp(new THREE.Vector3(...f.gut), 0.45);
        if (f.item) {
          if (!this.events.swallowed) this.world.foodGroup.remove(f.item.mesh);
          this.world.food.splice(this.world.food.indexOf(f.item), 1);
        } else {
          f.leaf.eat(...f.cell);
        }
        this.events.toast(tt('tardigrade.toasts.fed', { name: f.name, pct: Math.round(f.value * 100) }));
        this.feeding = null;
      }
      return;
    }
    P.stylet = Math.max(0, P.stylet - dt * 2);
    P.pump = Math.max(0, P.pump - dt * 3);
    if (!input.bitePressed || w.slipping) return;
    const mouth = this.creature.anchorWorld('buccal tube + stylets');
    // food anywhere under the front quarter of the body or just ahead of the mouth
    const best = this.foodInReach();
    if (best) {
      this.target = null;
      this.feeding = { item: best, t: 0, dur: best.time, value: best.value, gut: best.gut, name: best.aType };
      this.events.toast(tt('tardigrade.toasts.styletsInto', { name: best.aType }));
      return;
    }
    // Otherwise pierce the leaf cell under the mouth (grazers suck moss cells).
    const loc = w.leaf.toLocal(mouth, {});
    const L = w.leaf;
    const why = L.whyNotEat(loc.u, loc.v);
    if (why) { this.events.toast(why); return; }
    const cell = [loc.u, loc.v];
    this.feeding = { leaf: L, cell, t: 0, dur: 3.2, value: 0.07, gut: [0.45, 0.62, 0.25], name: tt('tardigrade.food.aLeafCell') };
    this.events.toast(tt('tardigrade.toasts.piercing'));
  }
}
