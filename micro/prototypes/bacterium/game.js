// The level's rules: oxygen, feeding, grazers, the amoeba, phages,
// Bdellovibrio, and the two goals (grow and divide in the right oxygen band;
// or, as Bdellovibrio, take three prey).
import { segDist, gauss } from './world.js';

export const GOAL_PREY = 3;

export function createGame(world, swimmer) {
  const s = swimmer.state;
  const r = world.r;
  const opts = { oxygen: true, timeScale: 1 };

  function update(dt, t, inp, ev) {
    const sp = s.sp;
    if (!s.alive) return;
    const mtb = s.species === 'mtb';

    // --- oxygen ---
    if (opts.oxygen) {
      if (mtb) {
        // microaerophile: too much O2 damages it (and stops magnetite forming); too little starves it
        if (s.o2 > 8) s.stress += ((s.o2 - 8) / 60) * dt; else s.stress = Math.max(0, s.stress - 0.05 * dt);
        if (s.o2 < 0.3) s.energy -= 0.02 * dt; else s.energy = Math.min(1, s.energy + 0.01 * dt);
        if (s.stress >= 1) swimmer.end('Oxidative damage: too much oxygen for a microaerophile. Reverse along the field (LB/RB) to swim back down.');
      } else {
        s.energy -= (s.o2 < sp.o2[0] ? 0.03 : 0.008) * dt;
      }
      if (s.energy <= 0) swimmer.end(mtb ? 'Starved: no oxygen or other electron acceptor down here.' : 'Starved: no prey, and too little oxygen to keep going.');
    }

    // --- feeding (magnetotactic): X switches on uptake ---
    if (mtb) {
      const bandK = s.inBand ? 1 : s.o2 < sp.o2[0] ? 0.15 : 0.3;
      const want = (inp.attack ? 0.32 : 0.07) * dt;
      const got = world.eat(s.x, s.y, want * Math.min(1, s.food * 1.5));
      s.growth = Math.min(1, s.growth + got * bandK * 0.85);
      s.feeding = inp.attack && s.food > 0.05;
      if (s.growth >= 1 && !s.divideT) { s.divideT = 0.001; ev.divide = true; }
      if (s.divideT) {
        s.divideT += dt;
        if (s.divideT > 2.2) {
          // the daughter that is not you joins the swimmers
          const c = world.cells.find((c) => c.kind === 'mtb' && Math.hypot(c.x - s.x, c.y - s.y) > 60) || world.cells.find((c) => c.kind === 'mtb');
          if (c) { c.x = s.x - Math.cos(s.a) * sp.L * 0.6; c.y = s.y - Math.sin(s.a) * sp.L * 0.6; c.a = s.a + Math.PI; c.sense = -s.sense; }
          s.divideT = 0; s.growth = 0; s.divisions = (s.divisions || 0) + 1; ev.divided = true;
        }
      }
    }

    // --- Bdellovibrio: attach, bore, live in the bdelloplast ---
    if (!mtb) {
      if (inp.attackPressed && !s.boring && !s.inside) {
        const p = nearestPrey(s.x, s.y, sp.L * 0.5 + 0.5);
        if (p && p.prey && p.gramNeg) { s.boring = p; p.attachedBy = s; s.boreT = 0; s.boreA = Math.atan2(s.y - p.y, s.x - p.x); ev.attach = true; }
        else if (p && !p.gramNeg) ev.gramPos = true;
        else ev.miss = true;
      }
      if (s.boring) {
        s.boreT += dt;
        if (s.boreT > 2.5) {
          const p = s.boring;
          p.bdelloplast = 0.01; p.attachedBy = null; p.stopped = 1;
          s.inside = p; s.boring = null; s.insideT = 0; ev.entered = true;
          s.shedFlagellum = { x: s.x, y: s.y, a: s.a + Math.PI, t: 0 };
        }
      }
      if (s.inside) {
        s.insideT += dt;
        if (s.insideT > 4) {
          s.prey++; s.energy = 1;
          const p = s.inside;
          s.inside = null;
          if (s.prey >= GOAL_PREY) {
            // the last bdelloplast lyses and releases the progeny
            p.ghost = true;
            for (let i = 0; i < 5; i++) world.cells.push({ kind: 'bdello', x: p.x + gauss(r) * 0.6, y: p.y + gauss(r) * 0.6, a: r() * 6.28, z: 0, L: 1.0, r: 0.19, v: 75, motile: true, gramNeg: true, curve: 0.7, hunter: true, cooldown: 6, run: 0.3, tumble: 0, flPhase: r() * 6, bdelloplast: 0, ghost: false });
            s.won = true; ev.won = true;
            swimmer.end('won');
          } else { p.ghost = true; ev.emerged = true; s.a = r() * 6.28; }
        }
      }
    }

    // --- grazers: the feeding current carries you into the oral funnel ---
    if (world.opts.grazers && !s.inside) {
      let inMouth = false;
      for (const g of world.grazers) {
        if (g.contract > 0) continue;
        const P = g.pose;
        const d = Math.hypot(s.x - P.mouth.x, s.y - P.mouth.y);
        if (d < 3.2) inMouth = true;
        // touching the bell makes it contract (mechanosensitive), sometimes
        const c = { x: P.ox - P.up.x * g.R * 0.95, y: P.oy - P.up.y * g.R * 0.95 };
        if (Math.hypot(s.x - c.x, s.y - c.y) < g.R * 0.98 && d > 6 && r() < dt * 0.6) { g.contract = 3; g.ext = 0; ev.contracted = true; }
      }
      if (inMouth) { s.captureT += dt; if (s.captureT < dt * 1.5) ev.captured = true; } else s.captureT = Math.max(0, s.captureT - dt * 2);
      if (s.captureT > 0.9) swimmer.end('Eaten by a peritrich: swept into the oral funnel and packed into a food vacuole.');
    }

    // --- the amoeba's edge: stay inside it and you are engulfed ---
    const inside = world.insideAmoeba(s.x, s.y, t);
    if (inside > 1) { s.engulfT += dt; if (s.engulfT < dt * 1.5) ev.engulfing = true; } else s.engulfT = Math.max(0, s.engulfT - dt);
    if (s.engulfT > 1.4) swimmer.end('Engulfed by the amoeba: closed into a phagosome.');

    // --- phages: stick on contact, reversibly at first ---
    if (world.opts.phages && !s.inside) {
      const ca = Math.cos(s.a), sa = Math.sin(s.a);
      for (const p of world.phages) {
        if (p.stuck) continue;
        if (Math.abs(p.x - s.x) > 3 || Math.abs(p.y - s.y) > 3) continue;
        const [d, u] = segDist(p.x, p.y, s.x, s.y, s.a, sp.L);
        if (d < sp.r + 0.12) {
          const side = (p.x - s.x) * -sa + (p.y - s.y) * ca > 0 ? 1 : -1;
          const ph = { p, u, side, t: 0, irreversible: false, shed: false };
          p.stuck = ph;
          s.phages.push(ph);
          ev.phage = true;
        }
      }
      for (let i = s.phages.length - 1; i >= 0; i--) {
        const ph = s.phages[i];
        ph.t += dt;
        if (ph.shed) {
          ph.p.stuck = null;
          ph.p.x = s.x + ph.side * -Math.sin(s.a) * (sp.r + 1.2) + gauss(r);
          ph.p.y = s.y + ph.side * Math.cos(s.a) * (sp.r + 1.2) + gauss(r);
          s.phages.splice(i, 1); ev.shed = (ev.shed || 0) + 1; continue;
        }
        if (!ph.irreversible && ph.t > 3) { ph.irreversible = true; ev.irreversible = true; }
        if (ph.irreversible && ph.t > 5) { swimmer.end('A phage injected its DNA: the lytic cycle has begun. This cell will burst into new phages.'); break; }
        // ride along on the cell
        ph.p.x = s.x + Math.cos(s.a) * ph.u + ph.side * -Math.sin(s.a) * (sp.r + 0.05);
        ph.p.y = s.y + Math.sin(s.a) * ph.u + ph.side * Math.cos(s.a) * (sp.r + 0.05);
      }
    }

    // --- Bdellovibrio hunting the magnetotactic player ---
    if (mtb && world.opts.hunters && !s.attacker) {
      for (const c of world.cells) {
        if (c.kind !== 'bdello' || c.prey || c.hidden > 0 || c.cooldown > 0) continue;
        if (Math.abs(c.x - s.x) > 3 || Math.abs(c.y - s.y) > 3) continue;
        const [d] = segDist(c.x, c.y, s.x, s.y, s.a, sp.L);
        if (d < sp.r + 0.35) { s.attacker = c; c.prey = { x: s.x, y: s.y, a: s.a, L: sp.L, isPlayer: true }; c.attachT = 0; s.attackT = 0; ev.attacked = true; break; }
      }
    }
    if (s.attacker) {
      const c = s.attacker;
      s.attackT += dt;
      c.prey.x = s.x; c.prey.y = s.y; c.prey.a = s.a;
      c.attachT = 0; // the player's struggle is handled here, not in the NPC's own clock
      c.x = s.x + Math.cos(s.a) * sp.L * 0.35; c.y = s.y + Math.sin(s.a) * sp.L * 0.35;
      if (s.attackT > 2.2) swimmer.end('Bdellovibrio bored in: you are now a bdelloplast, a round shell it will eat from inside.');
    }
  }

  function nearestPrey(x, y, reach) {
    let best = null, bd = reach;
    const scan = (list) => {
      for (const c of list) {
        if (c.ghost || c.bdelloplast || c.kind === 'bdello' || !(c.L >= 0)) continue;
        if (Math.abs(c.x - x) > 4 || Math.abs(c.y - y) > 4) continue;
        const [d] = c.kind === 'chain' ? [Math.hypot(c.x - x, c.y - y) - c.r * c.n * 0.5] : segDist(x, y, c.x, c.y, c.a, c.L || 0);
        const e = d - c.r;
        if (e < bd) { bd = e; best = c; }
      }
    };
    scan(world.cells); scan(world.film);
    return best;
  }

  return { opts, update, nearestPrey };
}
