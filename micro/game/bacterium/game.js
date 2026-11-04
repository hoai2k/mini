// The level's rules: feeding and dividing, grazers, the amoeba, phages,
// Bdellovibrio, and the Bdellovibrio protagonist's goal (take three prey).
// (No oxygen meter any more: the owner's call. The challenge is to gather an
// army and fight your way to the host; see collective.js and guards.js.)
import { segDist, gauss } from './world.js';

export const GOAL_PREY = 3;

export function createGame(world, swimmer) {
  const s = swimmer.state;
  const r = world.r;
  // absorb(kind, who) -> true when the collective takes the hit (a member in your place: main.js);
  // shielded: the collective's slime is up (phages and Bdellovibrio rams don't take hold);
  // adopt(x, y, a) -> true when your daughter cell joins your collective
  const opts = { timeScale: 1, absorb: null, shielded: false, adopt: null };

  function update(dt, t, inp, ev) {
    const sp = s.sp;
    if (!s.alive) return;
    const mtb = s.species === 'mtb';

    // --- feeding (magnetotactic): X switches on uptake ---
    if (mtb) {
      const want = (inp.attack ? 0.32 : 0.07) * dt;
      const got = world.eat(s.x, s.y, want * Math.min(1, s.food * 1.5));
      s.growth = Math.min(1, s.growth + got * 0.6);
      s.feeding = inp.attack && s.food > 0.05;
      if (s.growth >= 1 && !s.divideT) { s.divideT = 0.001; ev.divide = true; }
      if (s.divideT) {
        s.divideT += dt;
        if (s.divideT > 2.2) {
          // the daughter that is not you joins the swimmers
          const dx = s.x - Math.cos(s.a) * sp.L * 0.6, dy = s.y - Math.sin(s.a) * sp.L * 0.6;
          const adopted = opts.adopt && opts.adopt(dx, dy, s.a + Math.PI);
          const c = adopted ? null : world.cells.find((c) => c.kind === 'mtb' && Math.hypot(c.x - s.x, c.y - s.y) > 60) || world.cells.find((c) => c.kind === 'mtb');
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
        if (s.inside.bdelloplast < 1 && world.film.includes(s.inside)) s.inside.bdelloplast = Math.min(1, s.inside.bdelloplast + dt / 1.5);
        if (s.insideT > 4) {
          s.prey++;
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
      let inMouth = null;
      for (const g of world.grazers) {
        if (g.contract > 0 || g.feeding === false || g.parked) continue; // a resting grazer's current is off
        const P = g.pose;
        const d = Math.hypot(s.x - P.mouth.x, s.y - P.mouth.y);
        if (d < 3.2) inMouth = g;
        // touching the bell makes it contract (mechanosensitive), sometimes
        const c = { x: P.ox - P.up.x * g.R * 0.95, y: P.oy - P.up.y * g.R * 0.95 };
        if (!g.battle && Math.hypot(s.x - c.x, s.y - c.y) < g.R * 0.98 && d > 6 && r() < dt * 0.6) { g.contract = 3; g.ext = 0; ev.contracted = true; } // (not while it fights your swarm)
      }
      if (inMouth) { s.captureT += dt; if (s.captureT < dt * 1.5) ev.captured = true; } else s.captureT = Math.max(0, s.captureT - dt * 2);
      if (inMouth && s.captureT > (inMouth.fight ? 2.2 : 0.9)) { catchBy('grazer', inMouth, ev); return; }
    }

    // --- the amoeba's edge: stay inside it and you are engulfed ---
    const inside = world.insideAmoeba(s.x, s.y, t);
    if (inside > 1) { s.engulfT += dt; if (s.engulfT < dt * 1.5) ev.engulfing = true; } else s.engulfT = Math.max(0, s.engulfT - dt);
    if (s.engulfT > 1.4) { catchBy('amoeba', world.amoeba, ev); return; }

    // --- phages: stick on contact, reversibly at first ---
    if (world.opts.phages && !s.inside) {
      const ca = Math.cos(s.a), sa = Math.sin(s.a);
      // phages adsorb only while the phage pressure is on (main.js: a lysis cloud drifts by, then thins)
      if (world.hunt.phage && !opts.shielded) for (const p of world.phages) {
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
        if (ph.irreversible && ph.t > 5) { catchBy('phage', ph, ev); return; }
        // ride along on the cell
        ph.p.x = s.x + Math.cos(s.a) * ph.u + ph.side * -Math.sin(s.a) * (sp.r + 0.05);
        ph.p.y = s.y + Math.sin(s.a) * ph.u + ph.side * Math.cos(s.a) * (sp.r + 0.05);
      }
    }

    // --- Bdellovibrio hunting the magnetotactic player ---
    if (mtb && world.opts.hunters && world.hunt.bdello && !s.attacker && !opts.shielded) {
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
      if (s.attackT > 2.2) catchBy('bdello', c, ev);
    }
  }

  /** A predator has you: stop control and let main.js play the catch. */
  function catchBy(kind, who, ev) {
    // the collective takes it: a member is lost in your place (or the slime stops it)
    if (s.alive && opts.absorb && opts.absorb(kind, who)) { release(kind, who); ev.absorbed = { kind, who }; return; }
    if (swimmer.caught(kind, who)) ev.caught = { kind, who };
  }
  /** Let go of whatever had you after the collective took the hit. */
  function release(kind, who) {
    if (kind === 'grazer' || kind === 'stentor') s.captureT = 0;
    if (kind === 'amoeba') s.engulfT = 0;
    if (kind === 'phage' && who) {
      const i = s.phages.indexOf(who);
      if (i >= 0) s.phages.splice(i, 1);
      if (who.p) { who.p.stuck = null; who.p.homing = false; who.p.x += (r() - 0.5) * 6; who.p.y += 3; }
    }
    if (kind === 'bdello' && who) {
      if (s.attacker === who) { s.attacker = null; s.attackT = 0; }
      who.prey = null; who.cooldown = 6; who.attachT = 0;
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
    scan(world.cells);
    if (world.eachFilm) { const near = []; world.eachFilm(x - 5, y - 5, x + 5, y + 5, (c) => near.push(c)); scan(near); } else scan(world.film);
    return best;
  }

  return { opts, update, nearestPrey, catchBy };
}
