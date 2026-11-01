// The collective: your army of kin, moving as a flock. The owner (1 Nov 2026):
// "the group that you form should be like a flock with each bacterium just
// following the flock, but in its own way, instead of like a clone ... when
// you press forward the flock moves forward ... the first ones might start
// moving first and the others following bit by bit, catching up, etc, slowing
// down, passing a bit further and then turning around if you change
// directions". And: "X button send out a little beacon from the center of the
// group and then if there are any bacteria touching the group then those
// indicate a little beacon back as they join. This would be instead of having
// them join automatically."
//
//   steering  you steer the flock, not one cell: LS sets the flock's heading and
//             speed (the intent). Your own cell is one member: it reacts at
//             once, the others each by their own rules (below), and the camera
//             follows the flock's smoothed middle.
//   members   each has its own top speed, turn rate, reaction lag, speed ramp,
//             wander, size and helix; it steers by boids rules: follow the
//             intent it has perceived so far (its lag, plus a wave from the
//             flock's leading edge to the back), cohesion to the middle,
//             separation, alignment with neighbours, a little wander. It swims
//             along its body axis, so it must turn round to change direction
//             (slowing as it turns), and its flagella and body spin with its
//             speed. With the stick released the intent decays: the leaders
//             stop first, the laggards overshoot, turn back and settle.
//   beacon    X sends an autoinducer pulse from the flock's middle out to its
//             reach (its edge + COLL.beaconPad); free kin the pulse passes
//             answer with their own small pulse, one after another, and join.
//             Kin never join by themselves.
//   eating    X also lyses prey rods in reach of any member (eat()): each one
//             feeds the member that took it, so the army grows by division.
//   size      members are your health: a predator that would take you takes a
//             member instead. The army's size gates three abilities:
//               5  slime shield: phages stick in the slime; a Bdellovibrio's
//                  ram glances off half the time
//               8  raft: currents (grazers, Stentor's vortex) drag the flock
//                  less, and less the bigger it is (dragK: a third at 12)
//              12  toxin: a burst charges (COLL.chargeT); Y fires it
//   together a player who touches another player's flock joins it: their sticks
//            blend into one intent (each player's own cell steers half by its
//            own stick, so a player can still pull away). LEAVING is by moving
//            away: past COLL.leaveD from the other players the flock splits
//            evenly, each half taking the cells on its side.
//
// Real basis and departures (README "The army"): quorum sensing is a density
// switch read from diffusing autoinducers (C19, C28); swarming cells move in
// rafts (C29); multicellular magnetotactic prokaryotes swim as one (C20);
// contact killing with type VI secretion. [Departure]: a player steering a
// group, the visible beacon (autoinducers are invisible small molecules),
// kin answering one by one, members dying in your place, and a magnetotactic
// spirillum lysing prey (myxobacteria hunt in packs; Magnetospirillum does not).
import { gauss, WORLD } from './world.js';

export const COLL = {
  touch: 3.0,      // centre distance at which two flocks touch, µm
  shield: 5, raft: 8, toxin: 12, // army sizes (members + players' cells)
  leaveD: 20,      // branching off this far from the other players splits the flock
  max: 48,         // members per flock
  joinCool: 2.5,   // s after a split before those players can merge again
  free: 80,        // free kin cells in the world at the start
  burstR: 32, chargeT: 6,
  beaconGap: 0.3,  // s between two beacons
  beaconPad: 7,    // a beacon reaches this far beyond the flock's edge, µm
  beaconMin: 9,    // a lone cell's beacon reaches this far (three body lengths)
  beaconMax: 44,   // and never further than this from the middle
  eatReach: 1.7,   // a prey rod this close to a member's middle (beyond its half length) is lysed
};

/** The flock's rules (collective.js post); README "The army" lists them. */
export const FLOCK = {
  v: 45,            // the spirillum's run speed, µm/s (each member ×0.82–1.18)
  dash: 95 / 45,    // the sprint (A)
  wave: 0.04,       // s of extra reaction delay per µm behind the flock's leading edge
  coh: 2.6,         // cohesion gain beyond the comfortable radius, 1/s
  cohIdle: 0.45,    // with the stick released, a gentle pull to the middle so the flock settles
  sepR: 2.3,        // members keep this far apart (centres), µm
  sepK: 10,         // separation as steering, µm/s per µm of overlap
  alignR: 6,        // neighbours within this distance align
  stop: 4,          // below this desired speed the motors stop, µm/s
  turnGain: 6,      // how hard a member turns toward its wish (its own turn rate caps it)
};

let nextId = 1;
const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createCollectives(world, hooks = {}) {
  const r = world.r;
  const kin = [];          // every kin cell: free, a member, or dying
  const list = [];         // the flocks (one per player while alone)
  const byPlayer = new Map();
  const opts = { on: true };
  const W = WORLD;

  /** A kin cell with its own way of following the flock (FLOCK; README "The army"). */
  function newKin(x, y) {
    const k = { x, y, a: r() * TAU, vx: 0, vy: 0, sp: 0, ix: 0, iy: 0, r: 0.27, z: (r() - 0.5) * 0.5,
      flPhase: r() * 6, bodyPhase: r() * 6, coll: null, growth: r() * 0.3, dying: null, answer: null, wa: r() * TAU, hx: x, hy: y };
    k.L = 2.5 + r() * 0.8; k.amp = 0.26 + r() * 0.1; k.wl = 1.45 + r() * 0.3; // slight size and shape variety
    k.vmax = 0.82 + r() * 0.36;   // its own top speed (× FLOCK.v)
    k.turn = 4 + r() * 4;         // its own turn rate, rad/s
    k.lag = 0.05 + r() * 0.3;     // its own reaction lag, s
    k.acc = 0.12 + r() * 0.2;     // how fast its motors speed up or slow down, s
    k.wander = 0.6 + r() * 0.9;   // how much it wanders, ×5 µm/s
    k.align = 0.2 + r() * 0.4;    // how strongly it matches its neighbours
    return k;
  }
  /** The places free kin live: the meadow by the start, and each calm break between the gates. */
  const zones = () => [{ x0: world.route.meadow.x0, x1: world.route.meadow.x1 }, ...world.route.breaks.map((x) => ({ x0: x - 16, x1: x + 16 }))];
  function placeFree(k, zone) {
    const S0 = world.start;
    for (let i = 0; i < 6; i++) {
      k.x = zone.x0 + r() * (zone.x1 - zone.x0);
      k.y = world.wayY(k.x) + (r() - 0.5) * 34;
      if (Math.hypot(k.x - S0.x, k.y - S0.y) > 8 && !world.pushOutOfGrains({ x: k.x, y: k.y }, 0.5)) break;
    }
    k.hx = k.x; k.hy = k.y;
    k.coll = null; k.dying = null; k.answer = null; k.growth = r() * 0.3; k.vx = k.vy = 0; k.sp = 0;
  }

  function reset(roster) {
    list.length = 0; byPlayer.clear(); kin.length = 0;
    const Z = zones();
    for (let i = 0; i < COLL.free; i++) {
      const k = newKin(0, 0);
      // most in the meadow, six in each break (to top the army up between the gates)
      placeFree(k, i < COLL.free - 6 * (Z.length - 1) ? Z[0] : Z[1 + (i % (Z.length - 1))]);
      kin.push(k);
    }
    // a handful start right beside you, so the first beacon has someone to answer
    for (let i = 0; i < 4; i++) { const k = kin[i]; const a = 0.3 + i * 0.9; k.x = k.hx = world.start.x + 7 + Math.cos(a) * (3 + i * 2); k.y = k.hy = world.start.y + 3 + Math.sin(a) * 3; }
    for (const P of roster) ensure(P);
  }
  function make(players) {
    const C = { id: nextId++, players, members: [], cx: 0, cy: 0, fx: NaN, fy: NaN, vx: 0, vy: 0, speed: 0, extent: 0, R0: 1.5,
      intent: { x: 0, y: 0, m: 0 }, ux: 1, uy: 0, dash: false, army: 0, level: 0, drag: 1, charge: 0, burst: null, beacons: [], lastBeacon: -9, answered: 0 };
    list.push(C);
    for (const P of players) byPlayer.set(P, C);
    return C;
  }
  function ensure(P) { if (!byPlayer.has(P)) make([P]); return byPlayer.get(P); }
  const of = (P) => byPlayer.get(P) || null;
  /** A player leaves the game or is caught: their members stay with the others, or go free where they are. */
  function drop(P) {
    const C = byPlayer.get(P);
    if (!C) return;
    byPlayer.delete(P);
    C.players = C.players.filter((Q) => Q !== P);
    if (!C.players.length) {
      for (const m of C.members) { m.coll = null; m.hx = m.x; m.hy = m.y; m.sp = 0; }
      C.members.length = 0;
      list.splice(list.indexOf(C), 1);
    }
  }
  function remove(P) { drop(P); }

  const liveCells = (C) => C.players.filter((P) => P.S.alive).map((P) => P.S);
  const recruit = [];               // post(): the flocks that can recruit this step
  const flow = { x: 0, y: 0 };      // the current at a cell (world.flowAt writes it)
  // scratch for the flock step (members + players' cells of one flock)
  const nodes = [];
  const pushX = new Float32Array(128), pushY = new Float32Array(128), alX = new Float32Array(128), alY = new Float32Array(128), alN = new Float32Array(128);

  // --- before the swimmers step: the flock's intent from the sticks; each player's cell steered as a member ---
  function pre(dt, t, roster, inputs) {
    if (!opts.on) return;
    for (const P of roster) ensure(P);
    for (const C of list) {
      const ps = C.players.filter((P) => P.S.alive && inputs[P.slot] && P.S.species === 'mtb');
      let bx = 0, by = 0;
      for (const P of ps) { const s = inputs[P.slot].steer; if (s && s.m > 0.05) { const n = Math.hypot(s.x, s.y) || 1, k = Math.min(1, s.m) / n; bx += s.x * k; by += s.y * k; } }
      if (ps.length) { bx /= ps.length; by /= ps.length; }
      const bm = Math.hypot(bx, by);
      if (bm > 0.05) { C.ux = bx / bm; C.uy = by / bm; }
      C.intent.x = bx; C.intent.y = by; C.intent.m = Math.min(1, bm);
      C.dash = ps.some((P) => P.dash.active);
      if (!C.members.length && ps.length < 2) continue; // alone: the stick steers your cell directly
      const v = FLOCK.v;
      for (const P of ps) {
        const inp = inputs[P.slot], S = P.S;
        if (C.dash) inp.dashActive = true;
        // your own cell: the intent at once (in a shared flock, half your own stick, half the blend)
        const own = inp.steer && inp.steer.m > 0.05 ? inp.steer : null;
        let ix = bx, iy = by;
        if (ps.length > 1) { const k = own ? (0.5 * Math.min(1, own.m)) / (Math.hypot(own.x, own.y) || 1) : 0; ix = 0.5 * bx + (own ? own.x * k : 0); iy = 0.5 * by + (own ? own.y * k : 0); }
        let Dx = ix * v, Dy = iy * v;
        // cohesion (weaker while a player pulls away from a shared flock) and separation from the members
        const w = ps.length > 1 && own ? 0.25 : 1;
        const dx = C.cx - S.x, dy = C.cy - S.y, d = Math.hypot(dx, dy) || 1;
        const coh = w * (Math.min(35, FLOCK.coh * Math.max(0, d - C.R0)) + FLOCK.cohIdle * d * (1 - C.intent.m));
        Dx += (dx / d) * coh; Dy += (dy / d) * coh;
        for (const m of C.members) {
          const ex = S.x - m.x, ey = S.y - m.y;
          if (ex > FLOCK.sepR || ex < -FLOCK.sepR || ey > FLOCK.sepR || ey < -FLOCK.sepR) continue;
          const e = Math.hypot(ex, ey) || 0.01;
          if (e < FLOCK.sepR) { const p = (FLOCK.sepR - e) * FLOCK.sepK; Dx += (ex / e) * p; Dy += (ey / e) * p; }
        }
        const dm = Math.hypot(Dx, Dy);
        inp.steer = dm < FLOCK.stop ? null : { x: Dx / dm, y: Dy / dm, m: dm / v };
      }
    }
  }

  // --- after the swimmers and the world step ---
  function post(dt, t, roster, ctx = {}) {
    if (!opts.on) return;
    const sq = Math.sqrt(dt);
    const sm = 1 - Math.exp(-dt * 4);
    // middles, reach, size and level
    for (const C of list) {
      const cells = liveCells(C);
      let sx = 0, sy = 0, n = 0;
      for (const S of cells) { sx += S.x; sy += S.y; n++; }
      for (const m of C.members) { sx += m.x; sy += m.y; n++; }
      if (!n) continue;
      const cx = sx / n, cy = sy / n;
      const v = dt > 0 && C.speed >= 0 ? Math.hypot(cx - C.cx, cy - C.cy) / dt : 0;
      C.speed += (Math.min(200, v) - C.speed) * Math.min(1, dt * 3);
      C.cx = cx; C.cy = cy;
      let e2 = 0;
      for (const S of cells) e2 = Math.max(e2, (S.x - cx) ** 2 + (S.y - cy) ** 2);
      for (const m of C.members) e2 = Math.max(e2, (m.x - cx) ** 2 + (m.y - cy) ** 2);
      C.extent += (Math.sqrt(e2) - C.extent) * Math.min(1, dt * 6);
      C.R0 = 1.05 * Math.sqrt(n) + 1.2; // the comfortable radius: cells ~2.3 µm apart
      // the camera follows the flock's middle, smoothed (alone: your cell)
      if (!C.members.length && cells.length === 1) { C.fx = cells[0].x; C.fy = cells[0].y; }
      else if (!(C.fx === C.fx)) { C.fx = cx; C.fy = cy; }
      else { C.fx += (cx - C.fx) * sm; C.fy += (cy - C.fy) * sm; }
      C.army = C.members.length + cells.length;
      C.level = C.army >= COLL.toxin ? 3 : C.army >= COLL.raft ? 2 : C.army >= COLL.shield ? 1 : 0;
      C.drag = dragK(C);
      // the toxin charges at army size 12 and holds; it fades if the army falls below
      if (C.level >= 3) C.charge = Math.min(1, C.charge + dt / COLL.chargeT);
      else C.charge = Math.max(0, C.charge - dt / 20);
      if (C.burst) { C.burst.t += dt; if (C.burst.t > 1.2) C.burst = null; }
    }

    for (const C of list) if (C.members.length) stepFlock(C, dt, sq);
    stepFree(dt, sq);
    beacons(dt, t);

    mergeAndSplit(t, roster);
    losses(dt, t, ctx);
    divide(dt);
    bdelloPack(dt);
    // the dying: shown for a moment (rounding, darkening), then back into the world as a free cell
    // (in the meadow or the calm break nearest behind the players, so the army can be topped up)
    let far = world.start.x;
    for (const P of roster) if (P.S.alive) far = Math.max(far, P.S.x);
    for (const k of kin) if (k.dying) { k.dying.t += dt; if (k.dying.t > 1.6) placeFree(k, zoneBehind(far)); }
  }
  function zoneBehind(x) {
    const Z = zones();
    let best = Z[0];
    for (const z of Z) if (z.x1 < x - 10 && z.x0 > best.x0) best = z;
    return best;
  }

  /** One flock step: every member by its own rules (FLOCK and its personality). */
  function stepFlock(C, dt, sq) {
    const all = C.members, cells = liveCells(C);
    nodes.length = 0;
    for (const m of all) nodes.push(m);
    for (const S of cells) nodes.push(S);
    const N = nodes.length, M = all.length;
    // pairs: separation (a physical push, shared) and alignment (neighbours' velocities)
    for (let i = 0; i < N; i++) { pushX[i] = 0; pushY[i] = 0; alX[i] = 0; alY[i] = 0; alN[i] = 0; }
    const sR = FLOCK.sepR, aR = FLOCK.alignR, aR2 = aR * aR;
    for (let i = 0; i < N; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < N; j++) {
        const b = nodes[j], ex = a.x - b.x, ey = a.y - b.y;
        if (ex > aR || ex < -aR || ey > aR || ey < -aR) continue;
        const e2 = ex * ex + ey * ey;
        if (e2 > aR2) continue;
        alX[i] += b.vx; alY[i] += b.vy; alN[i]++;
        alX[j] += a.vx; alY[j] += a.vy; alN[j]++;
        if (e2 < sR * sR) {
          const e = Math.sqrt(e2) || 0.01, p = (sR - e) * 0.5;
          pushX[i] += (ex / e) * p; pushY[i] += (ey / e) * p;
          pushX[j] -= (ex / e) * p; pushY[j] -= (ey / e) * p;
        }
      }
    }
    // the leading edge along the intent: those behind it react later (a wave front to back)
    const ux = C.ux, uy = C.uy, cx = C.cx, cy = C.cy;
    let sMax = -Infinity;
    for (let i = 0; i < N; i++) sMax = Math.max(sMax, (nodes[i].x - cx) * ux + (nodes[i].y - cy) * uy);
    const iX = C.intent.x, iY = C.intent.y, idle = 1 - C.intent.m;
    const dashK = C.dash ? FLOCK.dash : 1;
    const t = world.time || 0;
    for (let i = 0; i < M; i++) {
      const m = nodes[i];
      // the intent as this member has perceived it so far: its own lag plus the wave from the front
      const behind = sMax - ((m.x - cx) * ux + (m.y - cy) * uy);
      const tau = m.lag + FLOCK.wave * behind;
      const k = 1 - Math.exp(-dt / tau);
      m.ix += (iX - m.ix) * k; m.iy += (iY - m.iy) * k;
      const vm = FLOCK.v * m.vmax;
      let Dx = m.ix * vm * dashK, Dy = m.iy * vm * dashK;
      // cohesion: stronger beyond the comfortable radius; with the stick released a gentle pull to settle
      const dx = cx - m.x, dy = cy - m.y, d = Math.hypot(dx, dy) || 1;
      const coh = Math.min(35, FLOCK.coh * Math.max(0, d - C.R0)) + FLOCK.cohIdle * Math.max(0, d - C.R0 * 0.5) * idle;
      Dx += (dx / d) * coh; Dy += (dy / d) * coh;
      // separation as steering (the push itself is applied below)
      Dx += pushX[i] * 2 * FLOCK.sepK; Dy += pushY[i] * 2 * FLOCK.sepK;
      // alignment: match the neighbours' velocity a little (each to its own degree)
      if (alN[i] > 0) { Dx += (alX[i] / alN[i] - m.vx) * m.align; Dy += (alY[i] / alN[i] - m.vy) * m.align; }
      // wander: its own slow meander
      m.wa += 1.4 * sq * gauss(r);
      const wk = 5 * m.wander * (0.1 + 0.9 * C.intent.m);
      Dx += Math.cos(m.wa) * wk; Dy += Math.sin(m.wa) * wk;
      const dm = Math.hypot(Dx, Dy);
      // it swims along its body: turn toward the wish at its own rate, slower while facing away
      // (a stopped cell needs a little more to start again, so a resting flock rests)
      let target = dm < (m.sp < 2 ? FLOCK.stop * 1.6 : FLOCK.stop) ? 0 : Math.min(dm, vm * dashK * 1.15);
      if (dm > 0.5) {
        const diff = wrap(Math.atan2(Dy, Dx) - m.a);
        const w = Math.max(-m.turn, Math.min(m.turn, diff * FLOCK.turnGain));
        m.a += w * dt;
        target *= 0.3 + 0.7 * Math.max(0, Math.cos(diff));
      }
      m.a += 0.22 * sq * gauss(r); // rotational Brownian motion (reduced, as for your steered cell)
      if (m.y < world.surfaceY(m.x) + 1) target *= 0.45;   // the biofilm's EPS
      if (world.insideAmoeba(m.x, m.y, t) > 0) target *= 0.35; // being engulfed
      m.sp += (target - m.sp) * (1 - Math.exp(-dt / m.acc));
      m.vx = Math.cos(m.a) * m.sp; m.vy = Math.sin(m.a) * m.sp;
      // currents: a raft is dragged less (dragK)
      const f = world.flowAt(m.x, m.y, flow);
      const fk = C.drag;
      m.x += (m.vx + f.x * fk) * dt + pushX[i] + 0.5 * sq * gauss(r);
      m.y += (m.vy + f.y * fk) * dt + pushY[i] + 0.5 * sq * gauss(r);
      // the body and flagella turn with its speed: still when it stops
      m.bodyPhase += dt * (m.sp / 1.6) * Math.PI;
      m.flPhase += dt * 20 * Math.min(2.2, m.sp / FLOCK.v);
      clampCell(m);
    }
    // your own cell is pushed by the members as they are by it
    for (let i = M; i < N; i++) { nodes[i].x += pushX[i]; nodes[i].y += pushY[i]; }
  }

  // free kin: slow wanderers that keep near where they live (they never join by themselves)
  function stepFree(dt, sq) {
    for (const k of kin) {
      if (k.coll || k.dying) continue;
      if (k.answer) k.answer.t += dt;
      k.a += 0.9 * sq * gauss(r);
      const dx = k.hx - k.x, dy = k.hy - k.y;
      if (dx * dx + dy * dy > 10 * 10) k.a += wrap(Math.atan2(dy, dx) - k.a) * Math.min(1, dt * 2);
      k.sp = 5;
      const f = world.flowAt(k.x, k.y, flow);
      k.vx = Math.cos(k.a) * k.sp; k.vy = Math.sin(k.a) * k.sp;
      k.x += (k.vx + f.x) * dt + 0.6 * sq * gauss(r);
      k.y += (k.vy + f.y) * dt + 0.6 * sq * gauss(r);
      k.bodyPhase += dt * (k.sp / 1.6) * Math.PI; k.flPhase += dt * 20 * (k.sp / FLOCK.v);
      clampCell(k);
    }
  }

  function clampCell(c) {
    if (c.y > W.y1 - 2) c.y = W.y1 - 2;
    // free kin keep to the water; members follow you into the biofilm, as far as your cell can go
    const floor = world.surfaceY(c.x) + (c.coll ? -20 : 0.5);
    if (c.y < floor) c.y = floor;
    c.x = Math.max(W.x0 + 2, Math.min(W.x1 - 2, c.x));
    world.pushOutOfGrains(c, c.r + 0.1);
  }

  // --- the beacon (X): a pulse from the flock's middle; kin it passes answer, one by one, and join ---
  function beacon(P, t) {
    const C = of(P);
    if (!C || !opts.on || !P.S.alive || P.S.species !== 'mtb' || t - C.lastBeacon < COLL.beaconGap) return null;
    C.lastBeacon = t;
    const R = Math.min(COLL.beaconMax, Math.max(COLL.beaconMin, C.extent + COLL.beaconPad));
    const b = { x: C.cx, y: C.cy, t: 0, R, dur: 0.25 + R / 45, n: 0, C };
    C.beacons.push(b);
    hooks.onBeacon?.(C, b, P);
    return b;
  }
  function beacons(dt, t) {
    recruit.length = 0;
    for (const C of list) {
      for (let i = C.beacons.length - 1; i >= 0; i--) {
        const b = C.beacons[i];
        b.t += dt;
        if (b.t > b.dur + 0.5) { C.beacons.splice(i, 1); continue; }
        if (b.t <= b.dur + dt && C.players.length) recruit.push(b);
      }
    }
    // the pulse front passes free kin: each answers after a short stagger (so you see every answer)
    if (recruit.length) for (const k of kin) {
      if (k.coll || k.dying || k.answer) continue;
      for (const b of recruit) {
        const front = b.R * Math.min(1, b.t / b.dur) ** 0.7;
        const dx = k.x - b.x, dy = k.y - b.y;
        if (dx > front || dx < -front || dy > front || dy < -front || dx * dx + dy * dy > front * front) continue;
        if (b.C.members.length + b.C.answered >= COLL.max) continue;
        k.answer = { C: b.C, t: -(0.08 + 0.09 * b.n + r() * 0.08), joined: false };
        b.n++; b.C.answered++;
        break;
      }
    }
    // answering: the kin cell's own small pulse, and it joins
    for (const k of kin) {
      const A = k.answer;
      if (!A) continue;
      if (A.t >= 0 && !A.joined) {
        A.joined = true; A.C.answered = Math.max(0, A.C.answered - 1);
        if (!k.dying && !k.coll && list.includes(A.C) && A.C.players.length && A.C.members.length < COLL.max) {
          k.coll = A.C; A.C.members.push(k);
          k.ix = A.C.intent.x * 0.3; k.iy = A.C.intent.y * 0.3;
          hooks.onRecruit?.(A.C, k);
        }
      }
      if (k.coll) A.t += dt; // a member's answer pulse plays out
      if (A.t > 0.7) k.answer = null;
    }
  }

  // --- X also eats: prey rods in reach of any member (or your cell) are lysed; each feeds the cell that took it ---
  function eat(P) {
    const C = of(P);
    if (!C || !opts.on || !P.S.alive) return [];
    const cells = liveCells(C);
    nodes.length = 0;
    for (const m of C.members) nodes.push(m);
    for (const S of cells) nodes.push(S);
    const ext = C.extent + 5, got = [];
    for (const c of world.cells) {
      if (c.kind !== 'rod' || c.ghost || c.lysed || c.bdelloplast || c.attachedBy) continue;
      if (Math.abs(c.x - C.cx) > ext || Math.abs(c.y - C.cy) > ext) continue;
      const reach = c.L * 0.5 + COLL.eatReach;
      let best = null, bd = reach * reach;
      for (const m of nodes) { const d2 = (m.x - c.x) ** 2 + (m.y - c.y) ** 2; if (d2 < bd) { bd = d2; best = m; } }
      if (!best) continue;
      c.lysed = 0.001;
      best.growth = Math.min(1.2, (best.growth || 0) + 0.45);
      got.push(c);
    }
    return got;
  }

  // --- players: join by touching, leave by branching off (an even split) ---
  function mergeAndSplit(t, roster) {
    for (const P of roster) {
      const A = of(P);
      if (!A || !P.S.alive || P.S.species !== 'mtb' || (P.noJoinUntil || 0) > t) continue;
      for (const B of list) {
        if (B === A || !B.players.length) continue;
        if (B.players.some((Q) => (Q.noJoinUntil || 0) > t)) continue;
        if (Math.abs(P.S.x - B.cx) > B.extent + 6 || Math.abs(P.S.y - B.cy) > B.extent + 6) continue;
        let hit = false;
        const t2 = COLL.touch * COLL.touch;
        for (const S of liveCells(B)) if ((S.x - P.S.x) ** 2 + (S.y - P.S.y) ** 2 < t2) { hit = true; break; }
        if (!hit) for (const m of B.members) if ((m.x - P.S.x) ** 2 + (m.y - P.S.y) ** 2 < t2) { hit = true; break; }
        if (!hit) continue;
        // merge A into B
        for (const Q of A.players) { byPlayer.set(Q, B); B.players.push(Q); }
        for (const m of A.members) { m.coll = B; B.members.push(m); }
        B.charge = Math.max(B.charge, A.charge);
        list.splice(list.indexOf(A), 1);
        hooks.onMerge?.(B, P);
        break;
      }
    }
    // branching off: a player COLL.leaveD from the other players' middle splits the flock evenly
    for (const C of [...list]) {
      const ps = C.players.filter((P) => P.S.alive);
      if (ps.length < 2) continue;
      for (const P of ps) {
        const others = ps.filter((Q) => Q !== P);
        const ox = others.reduce((a, Q) => a + Q.S.x, 0) / others.length, oy = others.reduce((a, Q) => a + Q.S.y, 0) / others.length;
        if (Math.hypot(P.S.x - ox, P.S.y - oy) < COLL.leaveD) continue;
        const share = Math.floor(C.members.length / C.players.length);
        const side = (m) => Math.hypot(m.x - P.S.x, m.y - P.S.y) - Math.hypot(m.x - ox, m.y - oy);
        const sorted = [...C.members].sort((a, b) => side(a) - side(b));
        const mine = sorted.slice(0, share);
        const N = make([P]);
        C.players = C.players.filter((Q) => Q !== P);
        C.members = sorted.slice(share);
        for (const m of mine) { m.coll = N; N.members.push(m); }
        N.cx = N.fx = P.S.x; N.cy = N.fy = P.S.y;
        for (const Q of [P, ...C.players]) Q.noJoinUntil = t + COLL.joinCool;
        hooks.onSplit?.(C, N, P, mine.length);
        break;
      }
    }
  }

  // --- members lost to predators (members are your health) ---
  function lose(m, kind) {
    const C = m.coll;
    if (C) { const i = C.members.indexOf(m); if (i >= 0) C.members.splice(i, 1); }
    m.coll = null; m.answer = null; m.dying = { kind, t: 0 };
    hooks.onLost?.(C, m, kind);
  }
  function losses(dt, t) {
    const st = world.stentor;
    for (const C of list) {
      for (let i = C.members.length - 1; i >= 0; i--) {
        const m = C.members[i];
        if (world.grazerMouthAt && world.grazerMouthAt(m.x, m.y, 9)) { lose(m, 'grazer'); continue; }
        if (world.insideAmoeba(m.x, m.y, t) > 1.5) { m.engulf = (m.engulf || 0) + dt; if (m.engulf > 1.2) { lose(m, 'amoeba'); continue; } } else m.engulf = 0;
        if (st && st.awake && !st.beaten && st.flowK > 0.3 && Math.hypot(m.x - st.mouth.x, m.y - st.mouth.y) < st.catchR) { lose(m, 'stentor'); continue; }
      }
    }
    // free kin can be eaten too (they come back elsewhere)
    for (const k of kin) if (!k.coll && !k.dying && world.grazerMouthAt && world.grazerMouthAt(k.x, k.y, 9)) { k.dying = { kind: 'grazer', t: 0 }; k.answer = null; }
  }

  /** A predator would catch player P: a member is taken in your place (the slime stops phages, and half the rams). */
  function absorb(P, kind, from) {
    const C = of(P);
    if (!C || !opts.on) return false;
    if ((P.safeT || 0) > 0) return true;
    if (C.level >= 1 && (kind === 'phage' || (kind === 'bdello' && r() < 0.5))) { P.safeT = 1.2; hooks.onShield?.(C, P, kind); return true; }
    if (!C.members.length) return false;
    let best = C.members[0], bd = Infinity;
    const fx = from ? from.x : P.S.x, fy = from ? from.y : P.S.y;
    for (const m of C.members) { const d = (m.x - fx) ** 2 + (m.y - fy) ** 2; if (d < bd) { bd = d; best = m; } }
    lose(best, kind);
    P.safeT = 1.6;
    return true;
  }

  // --- division: members regrow slowly, and fast on prey (eat()) ---
  function divide(dt) {
    for (const C of list) {
      if (!C.players.length) continue;
      const add = [];
      for (const m of C.members) {
        let rate = 1 / 150;
        if (world.food(m.x, m.y) > 0.15) rate *= 2;
        m.growth += rate * dt;
        if (m.growth >= 1) {
          m.growth = 0;
          if (C.members.length + add.length >= COLL.max) continue;
          const d = newKin(m.x - Math.cos(m.a) * 1.6, m.y - Math.sin(m.a) * 1.6);
          d.a = m.a + Math.PI; d.coll = C;
          add.push(d);
        }
      }
      for (const d of add) { kin.push(d); C.members.push(d); hooks.onDivide?.(C, d); }
    }
  }
  /** The player's own division: the daughter joins the flock. */
  function adopt(P, x, y, a) {
    const C = of(P);
    if (!C || C.members.length >= COLL.max) return false;
    const d = newKin(x, y); d.a = a; d.coll = C; kin.push(d); C.members.push(d);
    return true;
  }

  // --- the Bdellovibrio pack (a gate): they go for the nearest member of a flock near their gate ---
  function bdelloPack(dt) {
    if (!world.opts.hunters) return;
    for (const c of world.cells) {
      if (c.kind !== 'bdello' || !c.home || c.dead || c.prey || c.hidden > 0 || c.stalking || c.cooldown > 1) continue;
      let best = null, bd = 40;
      for (const C of list) {
        if (!C.members.length || !C.players.length) continue;
        if (Math.hypot(C.cx - c.home.x, C.cy - c.home.y) > c.home.r + 45) continue;
        for (const m of C.members) { const d = Math.abs(m.x - c.x) + Math.abs(m.y - c.y); if (d < bd) { bd = d; best = m; } }
      }
      if (!best) continue;
      const want = Math.atan2(best.y - c.y, best.x - c.x);
      c.a += wrap(want - c.a) * Math.min(1, dt * 5);
      c.tumble = 0; c.run = Math.max(c.run || 0, 0.3);
      if (Math.hypot(best.x - c.x, best.y - c.y) < 1.3) {
        const C = best.coll;
        if (C.level >= 1 && r() < 0.5) { c.cooldown = 1.6; c.a += Math.PI; hooks.onShield?.(C, null, 'bdello'); continue; }
        lose(best, 'bdello'); best.dying.bdello = c; c.hidden = 3; c.cooldown = 5;
      }
    }
  }

  /** Fire the toxin burst (charged at army size 12). Returns the burst, or null. */
  function burst(P) {
    const C = of(P);
    if (!C || C.charge < 1) return null;
    C.charge = 0;
    C.burst = { x: C.cx, y: C.cy, t: 0, R: COLL.burstR };
    hooks.onBurst?.(C, C.burst);
    return C.burst;
  }
  /** How hard currents drag a flock: fully below raft size, then less the bigger it is (0.43 at 8, 0.33 at 12, 0.13 at 40). */
  function dragK(C) { return C.level >= 2 ? 1 / (1 + C.army / 6) : 1; }
  /** Where a player's flock is (smoothed), for the camera and the split screen; alone, the cell itself. */
  function focus(P) {
    const C = of(P);
    if (!opts.on || !C || !C.members.length || !(C.fx === C.fx)) return null;
    return { x: C.fx, y: C.fy };
  }

  return {
    COLL, FLOCK, kin, list, opts, of, dragK, ensure, remove, reset, pre, post, absorb, burst, adopt, beacon, eat, focus, lose,
    /** For tests and the HUD: each flock's players, members, size, level, charge and middle. */
    report: () => list.map((C) => ({ id: C.id, players: C.players.map((P) => P.slot), members: C.members.length, army: C.army, level: C.level, charge: +C.charge.toFixed(2), x: +C.cx.toFixed(1), y: +C.cy.toFixed(1), fx: +(C.fx || 0).toFixed(1), fy: +(C.fy || 0).toFixed(1), speed: +C.speed.toFixed(1), extent: +C.extent.toFixed(1), beacons: C.beacons.length })),
  };
}

export const LEVEL_NAMES = ['', 'slime', 'raft', 'toxin'];
