// The player's cell at low Reynolds number. By default the stick steers it
// (a labelled game assist: a real bacterium cannot steer): while LS is held
// the body turns toward the stick at a finite rate and swims at a speed set by
// the stick. Let go and the cell is at the mercy of its world: it keeps
// running while rotational and translational Brownian motion, flow, grazers'
// currents and the magnetic torque push it about. B still tumbles into a new,
// random direction. The honest mode (no steering) is plain run and tumble.
import { oxygen, gauss, rng, tumbleAngle, WORLD } from './world.js';

// Two protagonists. Numbers and their sources are in README.md.
export const SPECIES = {
  mtb: {
    name: 'Magnetospirillum (magnetotactic)', short: 'magnetotactic spirillum',
    L: 3.0, r: 0.27, amp: 0.32, wl: 1.6, // a helical cell ~3 µm by 0.5 µm, about two turns
    v: 45, dash: 95, // µm/s; MS-1 and AMB-1 swim tens of µm/s
    Dr: 0.15, Dt: 0.25, // rotational (rad²/s) and translational (µm²/s) diffusion
    tumble: 0.3, // a stop and turn, s
    flLen: 3.2, flagella: 'bipolar', magnet: true, moment: 1e-15, // A·m², a chain of ~15 magnetosomes
    o2: [0.5, 5], // % air saturation, the microaerobic band it seeks
    view: 45, // default camera field height, µm
  },
  bdello: {
    name: 'Bdellovibrio bacteriovorus (predator)', short: 'Bdellovibrio',
    L: 1.1, r: 0.19, curve: 0.7,
    v: 80, dash: 160, // ~80 body lengths/s typical here, 160 µm/s reported peak [Unverified]
    Dr: 0.6, Dt: 0.6,
    tumble: 0.15, // reverse and flick
    flLen: 3.2, flagella: 'polar-sheathed', magnet: false,
    o2: [1.5, 100], // aerobic
    view: 90,
  },
};

const kT = 4.1e-21; // J at 24 °C

export function createSwimmer(world) {
  const r = rng(7);
  const s = {
    sp: SPECIES.mtb, species: 'mtb',
    x: 0, y: -20, a: -Math.PI / 2, sense: 1, // a: swimming direction; sense +1 = moment leads (north-seeking run)
    mode: 'run', tumbleT: 0, tumbleFrom: 0, tumbleTo: 0, flick: 0,
    speed: 0, vx: 0, vy: 0, bodyPhase: 0, flPhase: 0,
    alive: true, over: null, overT: 0,
    growth: 0, stress: 0, energy: 1, prey: 0, phages: [], attacker: null, attackT: 0,
    boring: null, boreT: 0, inside: null, insideT: 0, divideT: 0, won: false,
    engulfT: 0, captureT: 0, dashOn: false, signal: 0, memory: 0, util: 0, food: 0, o2: 0,
    caught: null, // { kind: 'grazer'|'amoeba'|'phage'|'bdello', who } while main.js plays the catch
  };
  const opts = { steer: true, bias: true, spontaneous: false, brownian: true, rotDiff: true, lowRe: true, beat: 1 };

  function reset(species = s.species) {
    s.species = species; s.sp = SPECIES[species];
    const mtb = species === 'mtb';
    Object.assign(s, {
      // The fixed microscope axes stay upright; begin below the host landmark.
      x: mtb ? -20 : 30, y: mtb ? -20 : 0, a: -Math.PI / 2 + (mtb ? 0 : 0.6), sense: 1, mode: 'run', tumbleT: 0, flick: 0,
      speed: 0, vx: 0, vy: 0, alive: true, over: null, overT: 0, growth: 0, stress: 0, energy: 1, prey: 0, phages: [],
      attacker: null, attackT: 0, boring: null, boreT: 0, inside: null, insideT: 0, divideT: 0, won: false, engulfT: 0, captureT: 0,
      caught: null, catchAnim: null, shedFlagellum: null, cause: null, warning: null,
    });
  }

  function end(reason, cause = null) { if (!s.alive) return; s.alive = false; s.over = reason; s.cause = cause; s.overT = 0; s.mode = 'over'; }
  /** Caught by a predator: control stops and main.js plays the catch (shared/predation.js). */
  function caught(kind, who) { if (!s.alive) return false; s.alive = false; s.caught = { kind, who }; s.over = null; s.overT = 0; s.mode = 'caught'; s.vx = s.vy = 0; return true; }

  /** A tumble: heading randomised (E. coli's 68° distribution), optionally biased toward the stick. */
  function tumble(bias) {
    if (!s.alive || s.mode === 'tumble' || s.boring || s.inside) return false;
    s.mode = 'tumble';
    s.tumbleT = s.sp.tumble;
    s.tumbleFrom = s.a;
    if (s.species === 'bdello') {
      // a polar-flagellated cell: reverse, then flick (Vibrio's pattern)
      let to = s.a + Math.PI + (r() < 0.5 ? -1 : 1) * (Math.PI / 2) * (0.6 + 0.6 * r());
      if (bias) to = pickBiased(bias, () => s.a + Math.PI + (r() < 0.5 ? -1 : 1) * (Math.PI / 2) * (0.6 + 0.6 * r()));
      s.tumbleTo = to;
      s.flick = 1;
    } else {
      s.tumbleTo = bias ? pickBiased(bias, () => s.a + tumbleAngle(r)) : s.a + tumbleAngle(r);
    }
    // shaking about sheds loosely (reversibly) bound phages, sometimes
    for (const p of s.phages) if (!p.irreversible && r() < 0.35) p.shed = true;
    return true;
  }
  // The assist: draw several candidate tumble angles from the real distribution, keep the one nearest the stick.
  function pickBiased(bias, draw) {
    const want = Math.atan2(bias.y, bias.x);
    let best = draw(), bd = 9;
    for (let i = 0; i < 7; i++) {
      const c = i ? draw() : best;
      const d = Math.abs(Math.atan2(Math.sin(c - want), Math.cos(c - want)));
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  /** Reverse the run: the other pole leads (magnetotactic: swim the other way along the field line). */
  function reverse() {
    if (!s.alive || s.boring || s.inside) return false;
    s.a += Math.PI;
    s.sense *= -1;
    return true;
  }

  function dash() {
    for (const p of s.phages) if (!p.irreversible && r() < 0.75) p.shed = true;
    if (s.attacker) { s.attacker.cooldown = 4; s.attacker.prey = null; s.attacker = null; s.attackT = 0; return 'shook'; }
    if (s.boring) { s.boring.attachedBy = null; s.boring = null; s.boreT = 0; return 'detached'; }
    return true;
  }

  // Steering (the assist): max body turn rate (rad/s) and the gain toward the stick.
  const STEER = { maxTurn: 5.5, gain: 7, rotNoise: 0.35, transNoise: 0.55, magnet: 0.6, cruise: 0.7 };

  function step(dt, t, inp, ev) {
    const sp = s.sp;
    // inp.steer: {x, y, m} in world axes (y up), m 0..1; absent or m 0 = released
    const st = inp.steer;
    const steering = !!(opts.steer && st && st.m > 0.15 && s.mode === 'run' && !s.boring && !s.inside && s.alive);
    s.steering = steering;
    s.flPhase += dt * 20 * opts.beat;
    if (!s.alive) { s.overT += dt; s.speed = 0; return; }
    const sq = Math.sqrt(dt);
    // the motor: always running except while tumbling (low Reynolds number: speed follows thrust at once)
    let thrust = 0;
    if (s.mode === 'tumble') {
      s.tumbleT -= dt;
      const k = 1 - Math.max(0, s.tumbleT) / sp.tumble;
      const e = k * k * (3 - 2 * k);
      s.a = s.tumbleFrom + (s.tumbleTo - s.tumbleFrom) * e;
      if (s.tumbleT <= 0) { s.mode = 'run'; s.flick = 0; }
    } else if (s.mode === 'run') {
      // steering: speed from the stick; released: keeps running at cruise speed (the honest mode: full speed)
      const k = steering ? 0.35 + 0.65 * Math.min(1, st.m) : opts.steer ? STEER.cruise : 1;
      thrust = inp.dashActive ? sp.dash : sp.v * k;
    }
    if (s.boring || s.inside) thrust = 0;
    // in the EPS of the biofilm everything is slower (a viscous, polymer-rich matrix)
    const inFilm = s.y < world.surfaceY(s.x) + 1;
    if (inFilm) thrust *= 0.45;
    s.bodyPhase += dt * (thrust / 1.6) * 6.28 * 0.5;

    // rotational Brownian motion: σ = √(2 D_r dt)
    // (reduced but still visible while steering, so the cell still jitters like a microbe)
    if (opts.rotDiff && s.mode === 'run') s.a += Math.sqrt(2 * sp.Dr) * sq * gauss(r) * (steering ? STEER.rotNoise : 1);
    // the stick: turn the body toward it at a fast but finite rate (it has a body; it is not a cursor)
    if (steering) {
      const want = Math.atan2(st.y, st.x);
      const d = Math.atan2(Math.sin(want - s.a), Math.cos(want - s.a));
      const w = Math.max(-STEER.maxTurn, Math.min(STEER.maxTurn, d * STEER.gain));
      s.a += w * dt;
    }
    // the magnetosome chain: torque m × B turns the cell's moment toward the field
    if (sp.magnet) {
      const B = world.field;
      const mAng = s.sense > 0 ? s.a : s.a + Math.PI;
      const bAng = Math.atan2(B.y, B.x);
      const ratio = (sp.moment * B.uT * 1e-6) / kT; // mB / kT
      const rate = ratio * sp.Dr; // 1/τ = mB / f_r = (mB/kT)·D_r
      const turn = -Math.sin(mAng - bAng) * rate * dt * (steering ? STEER.magnet : 1);
      s.a += turn;
      if (s.mode === 'tumble') { s.tumbleFrom += turn; s.tumbleTo += turn; }
      s.mB = ratio;
    }
    // spontaneous tumbles at the motor's own rate, suppressed while things get better
    if (opts.spontaneous && s.mode === 'run' && !s.boring && !s.inside) {
      const base = s.species === 'mtb' ? 0.35 : 1.0;
      const rate = base * Math.max(0.1, 1 - 2.5 * Math.max(0, s.signal)) * (1 + 2 * Math.max(0, -s.signal));
      if (r() < rate * dt) { if (s.species === 'mtb' && r() < 0.6) reverse(); else tumble(null); ev.spontaneous = true; }
    }
    const f = world.flowAt(s.x, s.y);
    const lag = opts.lowRe ? 1 : 1 - Math.exp(-dt / 1.0);
    const tvx = Math.cos(s.a) * thrust, tvy = Math.sin(s.a) * thrust;
    s.vx += (tvx - s.vx) * lag; s.vy += (tvy - s.vy) * lag;
    const br = opts.brownian ? Math.sqrt(2 * sp.Dt) * sq * (steering ? STEER.transNoise : 1) : 0;
    if (!s.inside && !s.boring) {
      s.x += (s.vx + f.x) * dt + br * gauss(r);
      s.y += (s.vy + f.y) * dt + br * gauss(r);
    } else if (s.boring) {
      const p = s.boring;
      s.x = p.x + Math.cos(s.boreA) * (p.r + sp.L * 0.4); s.y = p.y + Math.sin(s.boreA) * (p.r + sp.L * 0.4);
      s.a = s.boreA + Math.PI;
    } else { s.x = s.inside.x; s.y = s.inside.y; }
    s.speed = Math.hypot(s.vx, s.vy);
    s.flow = Math.hypot(f.x, f.y);
    // walls: the meniscus above; the sediment's grains
    if (s.y > WORLD.y1 - 2) s.y = WORLD.y1 - 2;
    const floor = world.surfaceY(s.x) - 20; // the biofilm packs into sediment below this
    if (s.y < floor) s.y = floor;
    if (s.x < WORLD.x0 + 2) s.x = WORLD.x0 + 2;
    if (s.x > WORLD.x1 - 2) s.x = WORLD.x1 - 2;
    if (world.pushOutOfGrains(s, sp.r + 0.1) && s.mode === 'run') ev.bump = true;

    // senses: oxygen and food, compared over time (the chemotaxis network's ~1–4 s memory)
    s.o2 = oxygen(s.y);
    s.food = world.food(s.x, s.y);
    const [lo, hi] = sp.o2;
    const o2score = s.o2 < lo ? -Math.log((lo + 0.05) / (s.o2 + 0.05)) : s.o2 > hi ? -Math.log((s.o2 + 0.05) / (hi + 0.05)) : 0;
    s.util = o2score + s.food * 2;
    s.memory += (s.util - s.memory) * (1 - Math.exp(-dt / 1.5));
    s.signal = Math.max(-1, Math.min(1, (s.util - s.memory) * 3));
    s.inBand = s.o2 >= lo && s.o2 <= hi;
  }

  return { state: s, opts, STEER, reset, tumble, reverse, dash, end, caught, step };
}
