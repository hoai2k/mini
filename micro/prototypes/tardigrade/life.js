// The Drying: a compressed day in the moss, the animal's water and food, and
// the tun.
//
// Clock: one real second is COMPRESSION seconds of the day (240× by default:
// a 24 h day in 6 minutes). Dryness rises through the day (fastest around
// 13:00), dew at night pulls it back a little, rain resets it. Film at a spot
// = that spot's capacity - dryness.
//
// The animal loses water on dry leaf (desiccation meter) and recovers it in
// the film. Holding Y draws it into a tun: the trunk contracts lengthways and
// the legs are pulled in (Halberg et al. 2013 showed this is an active,
// muscle-driven shape change). A finished tun on a dry leaf skips ahead to
// the next rain; then it rehydrates, which takes time, and it might not wake.
import * as THREE from '../shared/vendor/three.module.min.js';
import { sphagCell } from './patterns.js';

export const COMPRESSIONS = { '240× (a day in 6 min)': 240, '60× (a day in 24 min)': 60, '1440× (a day in 1 min)': 1440, 'Paused (no drying)': 0 };

const TUN_FORM = 4.0, TUN_FORM_HASTY = 1.6, SKIP_TIME = 6.5, REVIVE_TIME = 7.0;

export class Life {
  constructor(world, walker, creature, events) {
    Object.assign(this, { world, walker, creature, events });
    this.compression = 240;
    this.opts = { desiccation: true, risk: true };
    this.newDay(true);
    this.gutColour = new THREE.Vector3(0.62, 0.6, 0.5);
  }

  newDay(first = false) {
    this.hour = 5; this.day = first ? 1 : this.day + 1;
    this.world.setDry(-0.1);
    this.rainT = 0;
    this.desic = 0;
    this.energy = first ? 0.7 : Math.max(this.energy, 0.5);
    this.state = 'active';
    this.tun = 0; this.hasty = false; this.tunHold = 0;
    this.feeding = null;
    this.creature.pose.tun = 0;
    if (!first) { this.world.reseed(); this.walker.spawn(this.world.leaves[0], 1, 6.5, 0.6, 1, 0); }
  }

  rain() {
    this.rainT = 2.2;
    this.events.toast('Rain: the film floods back over the leaves');
  }

  filmHere() {
    const w = this.walker;
    return this.world.filmAt(w.leaf, w.u, w.v);
  }

  get clock() {
    const h = Math.floor(this.hour % 24), m = Math.floor((this.hour % 1) * 60);
    return `day ${this.day + Math.floor(this.hour / 24)}  ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  advanceDry(hours) {
    let D = this.world.dry;
    const steps = Math.max(1, Math.ceil(hours / 0.25));
    const dh = hours / steps;
    for (let i = 0; i < steps; i++) {
      const h = this.hour % 24;
      const rate = h >= 6 && h <= 20 ? 0.085 + 0.13 * Math.sin((Math.PI * (h - 6)) / 14) : -0.035;
      D = THREE.MathUtils.clamp(D + rate * dh, -0.35, 1.9);
      this.hour += dh;
    }
    this.world.setDry(D);
  }

  /** Revival chance: lower after a hasty (forced) tun, on low reserves, after long drought. */
  reviveChance(days = 1) {
    if (!this.opts.risk) return 1;
    return THREE.MathUtils.clamp(0.97 - (this.hasty ? 0.3 : 0) - 0.7 * Math.max(0, 0.45 - this.energy) - 0.06 * (days - 1), 0.05, 0.99);
  }

  /** input: { yDown, bPressed, aPressed, moving(0..1) } */
  update(dt, input) {
    const ev = this.events;
    const P = this.creature.pose;
    if (this.rainT > 0) {
      this.rainT -= dt;
      this.world.setDry(THREE.MathUtils.lerp(this.world.dry, -0.35, 1 - Math.exp(-dt * 2.5)));
    }
    switch (this.state) {
      case 'active': {
        this.advanceDry((dt * this.compression) / 3600);
        const h = this.filmHere();
        if (this.opts.desiccation) {
          if (h < 0.03) this.desic += dt / 22;
          else this.desic -= (dt / 30) * Math.min(1, h / 0.2);
        } else this.desic = 0;
        this.desic = THREE.MathUtils.clamp(this.desic, 0, 1);
        this.energy = Math.max(0, this.energy - dt * (0.0018 + 0.005 * input.moving));
        this.updateFeeding(dt, input);
        // Tun: hold Y, or forced when fully desiccated.
        if (this.desic >= 1 && !this.hasty) { this.hasty = true; ev.toast('Drying out: forced into a hasty tun'); }
        const forming = (input.yDown && !this.feeding) || this.hasty;
        this.tun = THREE.MathUtils.clamp(this.tun + (forming ? dt / (this.hasty ? TUN_FORM_HASTY : TUN_FORM) : -dt / 1.5), 0, 1);
        if (this.tun >= 1) { this.state = 'tun'; this.tunT = 0; ev.toast(this.hasty ? 'Tun (hasty): legs in, water going' : 'Tun formed: legs in, body contracted'); ev.rumble(220, 0.3, 0.5); }
        break;
      }
      case 'tun': {
        this.tunT += dt;
        this.advanceDry((dt * this.compression) / 3600);
        const dry = this.filmHere() < 0.05;
        if (dry && this.tunT > 1.2) {
          this.state = 'skip'; this.skipT = 0; this.skipDays = 1 + Math.floor(Math.random() * 3);
          this.skipFrom = this.hour; this.chance = this.reviveChance(this.skipDays);
          this.skipTo = (Math.floor(this.hour / 24) + this.skipDays) * 24 + 14 + Math.random() * 6;
          this.rained = false;
        } else if (!dry && input.yPressed && this.tunT > 0.6) {
          this.state = 'revive'; this.reviveT = 0; this.chance = this.opts.risk ? 0.995 : 1;
        }
        break;
      }
      case 'skip': {
        this.skipT += dt;
        const k = Math.min(1, this.skipT / SKIP_TIME);
        this.hour = THREE.MathUtils.lerp(this.skipFrom, this.skipTo, k * k * (3 - 2 * k));
        if (!this.rained) this.world.setDry(THREE.MathUtils.lerp(this.world.dry, 1.9, 1 - Math.exp(-dt * 2)));
        if (k > 0.85 && !this.rained) {
          this.rained = true;
          this.world.reseed();
          this.rain();
          ev.toast(`${this.skipDays} day${this.skipDays > 1 ? 's' : ''} later: rain. The patch has changed.`);
        }
        if (k >= 1) { this.state = 'revive'; this.reviveT = 0; }
        break;
      }
      case 'revive': {
        this.reviveT += dt;
        this.desic = Math.max(0, this.desic - dt / REVIVE_TIME);
        const k = Math.min(1, this.reviveT / REVIVE_TIME);
        this.tun = 1 - k * k;
        if (k >= 1) {
          if (Math.random() < this.chance) {
            this.state = 'active'; this.hasty = false; this.tun = 0; this.desic = 0;
            ev.toast('Rehydrated: walking again'); ev.rumble(160, 0.2, 0.2);
          } else {
            this.state = 'dead'; this.tun = 0.95;
            ev.toast('This tun did not wake (A: start a new day)', 6000);
          }
        }
        break;
      }
      case 'dead':
        if (input.aPressed) this.newDay();
        break;
    }
    P.tun = this.tun;
    // Gut colour follows what was eaten and fades as reserves are used.
    const g = this.gutColour;
    const absGut = new THREE.Vector3(-Math.log(g.x), -Math.log(g.y), -Math.log(g.z)).multiplyScalar(0.5 + 1.5 * this.energy).addScalar(0.1);
    this.creature.setGut(absGut);
  }

  get frozen() { return this.state !== 'active' || this.tun > 0.02 || !!this.feeding; }

  updateFeeding(dt, input) {
    const P = this.creature.pose;
    const w = this.walker;
    if (this.feeding) {
      const f = this.feeding;
      f.t += dt;
      P.stylet = 0.5 + 0.5 * Math.sin(f.t * 9);
      P.pump = Math.max(0, Math.sin(f.t * 14));
      if (f.item) f.item.mesh.scale.setScalar(Math.max(0.05, 1 - f.t / f.dur));
      if (input.bPressed && f.t > 0.2) { this.feeding = null; return; }
      if (f.t >= f.dur) {
        this.energy = Math.min(1, this.energy + f.value);
        this.gutColour.lerp(new THREE.Vector3(...f.gut), 0.45);
        if (f.item) {
          this.world.foodGroup.remove(f.item.mesh);
          this.world.food.splice(this.world.food.indexOf(f.item), 1);
        } else {
          f.leaf.eaten[f.cell] = 255; f.leaf.eatenTex.needsUpdate = true;
        }
        this.events.toast(`Fed on ${f.name} (+${Math.round(f.value * 100)}% reserves)`);
        this.feeding = null;
      }
      return;
    }
    P.stylet = Math.max(0, P.stylet - dt * 2);
    P.pump = Math.max(0, P.pump - dt * 3);
    if (!input.bPressed || w.slipping) return;
    const mouth = this.creature.anchorWorld('buccal tube + stylets');
    let best = null, bd = 0.45;
    const ml = w.leaf.toLocal(mouth, {});
    for (const item of this.world.food) {
      const d = Math.hypot(item.u - ml.u, item.v - ml.v); // along the leaf: the mouth is above it
      if (d < bd && item.leaf === w.leaf && item.side === w.side) { bd = d; best = item; }
    }
    if (best) {
      this.feeding = { item: best, t: 0, dur: best.time, value: best.value, gut: best.gut, name: `a ${best.type}` };
      this.events.toast(`Stylets into a ${best.type}…`);
      return;
    }
    // Otherwise pierce the leaf cell under the mouth (grazers suck moss cells).
    const loc = w.leaf.toLocal(mouth, {});
    const L = w.leaf;
    if (!L.inside(loc.u, loc.v)) { this.events.toast('Nothing to bite here'); return; }
    if (L.kind === 'sphagnum') {
      // Only the narrow green chlorophyllose cells are alive.
      if (sphagCell(loc.u, loc.v).dist > 0.03) { this.events.toast('A hyaline cell: dead, empty, only water'); return; }
    } else if (Math.abs(loc.v) < 0.22) { this.events.toast('The costa: thick-walled, nothing to suck'); return; }
    const cell = L.cellIndex(loc.u, loc.v);
    if (cell < 0 || L.eaten[cell]) { this.events.toast('This cell is already empty'); return; }
    this.feeding = { leaf: L, cell, t: 0, dur: 3.2, value: 0.07, gut: [0.45, 0.62, 0.25], name: 'a leaf cell' };
    this.events.toast('Piercing a leaf cell with the stylets…');
  }
}
