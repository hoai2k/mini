// Prey: small flagellates and ciliates swimming at low Reynolds number (no
// coasting: they move only while they beat), on wobbling, helical paths seen
// from above. Ciliates and Chilomonas show the avoidance reaction on contact
// (back up, pivot, swim off, after Ogura & Takahashi 1976, S08). A Paramecium
// grabbed in a food cup fires a local burst of trichocysts that shoves it
// clear (Knoll et al. 1991, S09).
import { TAU, clamp, wrapAngle } from './util.js';
import { lowRe } from '../shared/techniques/paramecium-squirmer.js';

// Borrowed from the paramecium prototype (Features panel, default off):
// lowRe makes speed follow the beat with its 35 ms lag and stops the
// trichocyst recoil within milliseconds instead of gliding for ~0.2 s.
export const PREY_OPTS = { lowRe: false };

// Lengths and widths in µm. Speeds are game speeds: swimmers are shown at
// about one tenth of their real speed (a labelled departure).
export const SPECIES = {
  chilomonas: { name: 'Chilomonas', latin: 'Chilomonas paramecium', kind: 0, L: 30, W: 13, speed: 16, real: '≈ 30 µm, ~150 µm/s', reacts: 0.6, sense: 4, digest: 26, wob: 0.35, wobF: 2.6 },
  chlamydomonas: { name: 'Chlamydomonas', latin: 'Chlamydomonas sp.', kind: 1, L: 14, W: 11, speed: 11, real: '≈ 12 µm, ~100 µm/s', reacts: 0.3, sense: 3, digest: 30, wob: 0.25, wobF: 2.0 },
  tetrahymena: { name: 'Tetrahymena', latin: 'Tetrahymena pyriformis', kind: 2, L: 50, W: 28, speed: 34, real: '≈ 50 µm, ~400 µm/s', reacts: 1, sense: 8, digest: 40, wob: 0.22, wobF: 1.4, ciliate: true },
  colpidium: { name: 'Colpidium', latin: 'Colpidium colpoda', kind: 3, L: 62, W: 32, speed: 28, real: '≈ 60 µm, ~300 µm/s', reacts: 1, sense: 8, digest: 44, wob: 0.2, wobF: 1.2, ciliate: true },
  paramecium: { name: 'Paramecium', latin: 'Paramecium caudatum', kind: 4, L: 220, W: 56, speed: 70, real: '≈ 220 µm, ~1 mm/s', reacts: 1, sense: 10, digest: 95, wob: 0.12, wobF: 0.8, ciliate: true, trich: 3 },
  // The forward landmark (main.js): green with its Chlorella symbionts; not prey here.
  bursaria: { name: 'Paramecium bursaria', latin: 'Paramecium bursaria', kind: 5, L: 130, W: 62, speed: 45, real: '≈ 120 µm, green with Chlorella', reacts: 0, sense: 10, digest: 95, wob: 0.14, wobF: 0.8, ciliate: true, trich: 0 },
};

let NEXT = 1;

export class Prey {
  constructor(sp, x, y, th, rand) {
    this.id = NEXT++;
    this.sp = sp; this.rand = rand;
    this.x = x; this.y = y; this.th = th;
    this.wobPhase = rand() * TAU;
    this.curv = rand.range(-0.3, 0.3);
    this.state = 'swim'; this.stateT = 0;
    this.pivot = 0;
    this.speedK = 1;
    this.browse = 0; // pauses while grazing bacteria
    this.captured = null; // the food vacuole holding it
    this.alive = true; this.dead = 0; // seconds since it stopped moving
    this.vx = 0; this.vy = 0; // trichocyst impulse, decays
    this.charges = sp.trich || 0;
    this.cool = 0;
    this.dischT = 99; this.dischAng = 0;
    this.touch = 0;
    this.layer = 'focus';
    this.heading = th; // drawn heading, with the wobble
    this.sc = 1; // drawn scale (digestion)
    this.digest = 0;
    this.circles = [];
    this.time = rand() * 100;
    this.mesh = null;
  }

  get r() { return this.sp.W / 2; }

  /** Collision circles along the body axis. */
  updateCircles() {
    const { L, W } = this.sp;
    const k = Math.max(1, Math.ceil(L / W));
    const half = Math.max(0, L / 2 - W / 2);
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    this.circles.length = k;
    for (let i = 0; i < k; i++) {
      const t = k === 1 ? 0 : -half + (2 * half * i) / (k - 1);
      const r = (W / 2) * (1 - 0.25 * Math.abs(t) / (L / 2 + 1e-3));
      this.circles[i] = { x: this.x + c * t, y: this.y + s * t, r };
    }
  }

  avoid(strength = 1) {
    if (this.state !== 'swim' || this.sp.reacts * strength < this.rand() * 0.9) return;
    this.state = 'reverse';
    this.stateT = this.rand.range(0.35, 0.8) * (this.sp.ciliate ? 1 : 0.6);
    this.browse = 0;
  }

  /** Fire a local trichocyst burst away from (fromX, fromY). Returns true if it fired. */
  discharge(fromX, fromY) {
    if (this.charges <= 0 || this.cool > 0) return false;
    this.charges--;
    this.cool = 3.5;
    const ex = this.x - fromX, ey = this.y - fromY;
    const m = Math.hypot(ex, ey) || 1;
    this.vx = (ex / m) * 190; this.vy = (ey / m) * 190;
    this.dischT = 0;
    this.dischAng = Math.atan2(-ey, -ex) - this.heading; // towards the attacker, in body coordinates
    this.state = 'swim'; this.speedK = 1.6;
    return true;
  }

  update(dt) {
    this.time += dt;
    this.dischT += dt;
    this.cool = Math.max(0, this.cool - dt);
    const sp = this.sp, r = this.rand;
    if (this.captured) {
      const v = this.captured;
      if (this.alive) {
        this.dead += dt;
        if (this.dead > (sp.kind === 4 ? 9 : 5)) this.alive = false;
      }
      const wig = this.alive ? 0.25 * (1 - this.dead / 10) : 0;
      this.x = v.x; this.y = v.y;
      this.th = v.ang + Math.sin(this.time * 3) * wig;
      this.heading = this.th;
      this.digest = v.digest;
      this.sc = 1 - 0.5 * v.digest;
      return;
    }
    let speed = sp.speed * this.speedK;
    this.speedK += (1 - this.speedK) * Math.min(1, dt * 0.8);
    if (this.state === 'swim') {
      this.curv += (r() - 0.5) * dt * 1.2;
      this.curv = clamp(this.curv, -0.5, 0.5);
      this.th += this.curv * dt;
      this.browse -= dt;
      if (this.browse < -r.range(6, 14)) this.browse = r.range(2, 5);
      if (this.browse > 0) speed *= 0.18;
    } else if (this.state === 'reverse') {
      speed = -sp.speed * 0.7;
      this.stateT -= dt;
      if (this.stateT <= 0) {
        this.state = 'pivot';
        this.stateT = r.range(0.4, 0.8);
        this.pivot = r.sign() * r.range(1.2, 2.8) / this.stateT;
      }
    } else if (this.state === 'pivot') {
      speed = sp.speed * 0.12;
      this.th += this.pivot * dt;
      this.stateT -= dt;
      if (this.stateT <= 0) { this.state = 'swim'; this.speedK = 1.35; }
    }
    this.wobPhase += sp.wobF * TAU * dt * (0.5 + 0.5 * Math.min(1, Math.abs(speed) / (sp.speed || 1)));
    // Rotation about the long axis on a helical path shows as a side-to-side wobble.
    this.heading = this.th + sp.wob * Math.sin(this.wobPhase);
    this.v = PREY_OPTS.lowRe ? lowRe(this.v ?? speed, speed, dt) : speed;
    speed = this.v;
    this.x += Math.cos(this.heading) * speed * dt + this.vx * dt;
    this.y += Math.sin(this.heading) * speed * dt + this.vy * dt;
    const decay = PREY_OPTS.lowRe ? Math.exp(-dt / 0.035) : Math.exp(-dt * 5);
    this.vx *= decay; this.vy *= decay;
    this.th = wrapAngle(this.th);
  }
}

export function makePrey(key, x, y, th, rand) {
  return new Prey(SPECIES[key], x, y, th, rand);
}
