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
//   waylaid  the stranger strain (other magnetotactic cells) loiters at the flock's
//            edge and its decoy pulse draws members off; X calls them back (WAYLAY).
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
import { gauss, zGap } from './world.js';

export const COLL = {
  touch: 3.0,      // centre distance at which two flocks touch, µm
  shield: 5, raft: 8, toxin: 12, // army sizes (members + players' cells)
  leaveD: 20,      // branching off this far from the other players splits the flock
  max: 1000,       // members per flock (the owner: "hundreds or a thousand bacteria in your group")
  joinCool: 2.5,   // s after a split before those players can merge again
  free: 760,       // free kin cells in the world at the start
  meadow: 40,      // of them in the meadow round the start, then the colonies' (world.js COLONIES); the rest ambient along the route, kept near the players (main.js keepAmbient)
  burstR: 32, chargeT: 6,
  beaconGap: 0.3,  // s between two beacons
  beaconPad: 7,    // a beacon reaches this far beyond the flock's edge, µm
  beaconMin: 9,    // a lone cell's beacon reaches this far (three body lengths)
  beaconMax: 160,  // and never further than this from where it goes out
  beaconQ: 0.85,   // the group's radius for the beacon: this share of its cells lie within it (stragglers left out)
  beaconFront: 0.75, // moving, the beacon goes out from the front of the main body: this share of the cells are behind it
  latch: 1.0,      // s a pack Bdellovibrio clings to a member before it bores in
  eatReach: 1.7,   // a prey rod this close to a member's middle (beyond its half length) is lysed
  grow: 1 / 300,   // a member's own slow growth toward dividing, per s (×2 in a food patch; three prey rods make a division)
  sleep: 520,      // free kin this far (each axis) from every player rest where they are (perf)
};
/** How much closer a big flock packs (1 up to COLL.denseFrom cells, then less, to 0.6 at 1000): its spacing and comfortable radius scale by it. */
export const densityK = (n) => 1 - 0.4 * Math.max(0, Math.min(1, Math.log10(Math.max(1, n) / 100)));
/** The stagger before the n-th answer to one beacon (s): one by one at first, then a quick ripple, never more than 1.8 s. */
export const answerDelay = (n) => Math.min(1.8, n < 8 ? 0.09 * n : 0.72 + 0.012 * (n - 8));

/** The flock's rules (collective.js post); README "The army" lists them. */
/** How a member is seen to be eaten (eatenState): s pulled in or closed round, then s digesting (a dark vacuole fading). */
export const EATEN = {
  grazer: { pull: 1.0, digest: 3.5 },
  stentor: { pull: 1.2, digest: 3.5 },
  amoeba: { pull: 0.7, digest: 4.8 },
  bdello: { pull: 0.5, digest: 2.6 },
};

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

/**
 * Waylaying (the owner, 2026-11-03: "interactions with some other bacteria able to cause certain
 * members of your group able to be picked off by kind of waylaying them, so you'd have to call them
 * back ... If you go around spamming X then you won't have this problem"). The stranger strain (the
 * other magnetotactic cells in the water, world.js 'mtb') comes over to a flock and loiters at its
 * edge, sending its own decoy pulse (an amber ring) every WAYLAY.pulse s; each pulse draws the nearest
 * member in reach off the formation toward it. A drifting member is tinted amber and trails a thin
 * link back to the flock that fades as it goes; after WAYLAY.lostT s (or WAYLAY.lostD µm from the
 * middle, after WAYLAY.lostMin s) it is picked off: it swims away with the stranger and is gone.
 * Your beacon (X) reaching a drifting member calls it back at once, and reaching the stranger drives
 * it off (its followers come back too), so a player who keeps pulsing X never loses one. Real basis:
 * autoinducer crosstalk between strains (one strain's signal read by another's receptor) and
 * chemotaxis toward a neighbour's attractant. [Departure]: a strain luring cells on purpose, and the
 * numbers (game values).
 */
export const WAYLAY = {
  min: 4,        // flocks with fewer members are left alone
  notice: 40,    // a stranger this far beyond a flock's edge comes over, µm
  edge: 4,       // it loiters this far beyond the flock's edge
  come: 34,      // its speed coming over, µm/s
  lureV: 28,     // and its top speed while loitering (a flock running at 45 µm/s leaves it behind)
  creep: 3,      // µm/s it edges away while loitering (drawing its followers off), up to creepMax
  creepMax: 14,
  pulse: 2.4,    // s between its decoy pulses (each draws off one member)
  reach: 10,     // a pulse draws off the nearest member within this far of the stranger, µm
  each: 2,       // members one stranger draws off at once
  max: 3,        // drifting members per flock at once
  stay: 12,      // s a stranger loiters before it swims on
  cool: 25,      // s before a stranger (driven off or gone) waylays again
  pull: 3,       // s for a drifting member to give up the flock's way entirely
  lostT: 7,      // s of drifting before it is picked off
  lostD: 45,     // or this far from the flock's middle, once it has drifted lostMin s
  lostMin: 3,
  immune: 4,     // s after a recall before it can be drawn off again
  recallMax: 60, // a beacon stretches this far (from its origin) to reach a drifting member
  safeR: 80,     // no waylaying within this far of the start (the meadow stays safe for ever)
  gone: 2.4,     // s a picked-off member is seen swimming off with the stranger before it is gone
};

let nextId = 1;
const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createCollectives(world, hooks = {}) {
  const r = world.r;
  const kin = [];          // every kin cell: free, a member, or dying
  const list = [];         // the flocks (one per player while alone)
  const byPlayer = new Map();
  const opts = { on: true, waylay: true };

  /** A kin cell with its own way of following the flock (FLOCK; README "The army"). */
  function newKin(x, y) {
    const k = { x, y, a: r() * TAU, vx: 0, vy: 0, sp: 0, ix: 0, iy: 0, r: 0.27, z: (r() - 0.5) * 0.5,
      flPhase: r() * 6, bodyPhase: r() * 6, coll: null, growth: r() * 0.3, dying: null, answer: null, wa: r() * TAU, hx: x, hy: y, label: 0 };
    k.L = 2.5 + r() * 0.8; k.amp = 0.26 + r() * 0.1; k.wl = 1.45 + r() * 0.3; // slight size and shape variety
    k.vmax = 0.82 + r() * 0.36;   // its own top speed (× FLOCK.v)
    k.turn = 4 + r() * 4;         // its own turn rate, rad/s
    k.lag = 0.05 + r() * 0.3;     // its own reaction lag, s
    k.acc = 0.12 + r() * 0.2;     // how fast its motors speed up or slow down, s
    k.wander = 0.6 + r() * 0.9;   // how much it wanders, ×5 µm/s
    k.align = 0.2 + r() * 0.4;    // how strongly it matches its neighbours
    return k;
  }
  /** Put free kin cell k at (x, y) (its home: it wanders round it), free and well. */
  function putFree(k, x, y) {
    k.x = k.hx = x; k.y = k.hy = y; k.parked = false;
    k.coll = null; k.dying = null; k.answer = null; k.drift = null; k.immune = 0; k.growth = r() * 0.3; k.vx = k.vy = 0; k.sp = 0; k.label = 0;
  }
  /** Put free kin cell k in the meadow round the start. */
  function placeFree(k) {
    const Z = world.zones[0];
    for (let i = 0; i < 6; i++) {
      const q = world.ringPoint(Z.r0 + r() * (Z.r1 - Z.r0), r() * 6.283);
      putFree(k, q.x, q.y);
      if (!world.pushOutOfGrains({ x: k.x, y: k.y }, 0.5)) break;
    }
    k.zone = 0;
  }
  /** Take kin cell k off the field until it is wanted (main.js keepAmbient brings it in where nobody has looked). */
  function park(k) { putFree(k, world.PARK.x, world.PARK.y); k.parked = true; k.zone = 1; }

  const lossLog = [];
  function reset(roster) {
    list.length = 0; byPlayer.clear(); kin.length = 0; lossLog.length = 0;
    for (const c of world.cells) { c.waylay = null; c.wlCool = 0; } // no stranger is waylaying anyone
    const cols = world.colonies || [];
    let n = 0;
    for (let i = 0; i < COLL.free; i++) {
      const k = newKin(0, 0);
      // COLL.meadow in the meadow, then each colony's (zone 0: they stay where they live); the rest
      // ambient: along the route, away from the start, kept near the players (main.js keepAmbient
      // moves the ones nobody has seen)
      if (i < COLL.meadow) placeFree(k);
      else {
        let C = null, acc = COLL.meadow;
        for (const c of cols) { if (i < acc + c.kin) { C = c; break; } acc += c.kin; }
        if (C) {
          for (let j = 0; j < 6; j++) { const a = r() * TAU, d = 15 + Math.sqrt(r()) * (C.r - 12); putFree(k, C.x + Math.cos(a) * d, C.y + Math.sin(a) * d); if (!world.pushOutOfGrains({ x: k.x, y: k.y }, 0.5)) break; }
          k.zone = 0; k.colony = C.id;
        } else {
          let q = world.routeSpot ? world.routeSpot() : world.anywhere();
          for (let j = 0; j < 8 && world.distFromStart(q.x, q.y) < 150; j++) q = world.routeSpot ? world.routeSpot() : world.anywhere();
          putFree(k, q.x, q.y); k.zone = 1;
        }
      }
      k.inKin = true; kin.push(k); n++;
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
      for (const m of C.members) { unDrift(m); m.coll = null; m.drill = null; m.hx = m.x; m.hy = m.y; m.sp = 0; }
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
  const NMAX = COLL.max + 16;
  const pushX = new Float32Array(NMAX), pushY = new Float32Array(NMAX), alX = new Float32Array(NMAX), alY = new Float32Array(NMAX), alN = new Float32Array(NMAX);
  const pxs = new Float32Array(NMAX), pys = new Float32Array(NMAX); // (each member's position before its move: the soft limits)
  /**
   * The neighbour grid (perf, the owner: "hundreds or a thousand bacteria"): each flock's cells in a
   * grid of FLOCK.alignR cells, so separation and alignment look only at the 3×3 cells round each
   * one (about n × 9 × a few pairs, not n²). Rebuilt every step; kept on the flock (C.grid) for eat().
   */
  function buildGrid(C, list, N) {
    const cs = FLOCK.alignR;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < N; i++) { const o = list[i]; if (o.x < x0) x0 = o.x; if (o.x > x1) x1 = o.x; if (o.y < y0) y0 = o.y; if (o.y > y1) y1 = o.y; }
    // (a member far off, drifting after a stranger, would make the grid huge: clamp it into the edge cells)
    const nx = Math.max(1, Math.min(160, Math.ceil((x1 - x0) / cs) + 1)), ny = Math.max(1, Math.min(160, Math.ceil((y1 - y0) / cs) + 1));
    let G = C.grid;
    if (!G || G.head.length < nx * ny || G.next.length < N) G = C.grid = { head: new Int32Array(Math.max(nx * ny, 256) * 2), next: new Int32Array(NMAX), cellOf: new Int32Array(NMAX), nx: 0, ny: 0, x0: 0, y0: 0, cs, nodes: [] };
    G.nx = nx; G.ny = ny; G.x0 = x0; G.y0 = y0; G.n = N;
    G.head.fill(-1, 0, nx * ny);
    G.nodes.length = 0;
    for (let i = 0; i < N; i++) {
      const o = list[i];
      const gi = Math.min(nx - 1, Math.floor((o.x - x0) / cs)), gj = Math.min(ny - 1, Math.floor((o.y - y0) / cs)), c = gi + nx * gj;
      G.cellOf[i] = c; G.next[i] = G.head[c]; G.head[c] = i; G.nodes.push(o);
    }
    return G;
  }
  /** Visit every grid neighbour j of (x, y) within reach (the 3×3 cells round it). */
  function eachNear(G, x, y, fn) {
    const gi = Math.floor((x - G.x0) / G.cs), gj = Math.floor((y - G.y0) / G.cs);
    for (let j = Math.max(0, gj - 1); j <= Math.min(G.ny - 1, gj + 1); j++) for (let i = Math.max(0, gi - 1); i <= Math.min(G.nx - 1, gi + 1); i++) {
      for (let n = G.head[i + G.nx * j]; n >= 0; n = G.next[n]) fn(G.nodes[n], n);
    }
  }

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
      for (const m of C.members) if (!m.drift) { sx += m.x; sy += m.y; n++; } // (drifting members are off the formation)
      if (!n) continue;
      const cx = sx / n, cy = sy / n;
      const v = dt > 0 && C.speed >= 0 ? Math.hypot(cx - C.cx, cy - C.cy) / dt : 0;
      C.speed += (Math.min(200, v) - C.speed) * Math.min(1, dt * 3);
      // the flock's velocity (smoothed): the beacon goes out from its front and travels with it
      if (dt > 0 && C.speed > 0) {
        const k = Math.min(1, dt * 4);
        C.vx += (Math.max(-200, Math.min(200, (cx - C.cx) / dt)) - C.vx) * k;
        C.vy += (Math.max(-200, Math.min(200, (cy - C.cy) / dt)) - C.vy) * k;
      }
      C.cx = cx; C.cy = cy;
      let e2 = 0, s2 = 0;
      for (const S of cells) { const q = (S.x - cx) ** 2 + (S.y - cy) ** 2; e2 = Math.max(e2, q); s2 += q; }
      for (const m of C.members) if (!m.drift) { const q = (m.x - cx) ** 2 + (m.y - cy) ** 2; e2 = Math.max(e2, q); s2 += q; }
      C.extent += (Math.sqrt(e2) - C.extent) * Math.min(1, dt * 6);
      // (its spread: the root-mean-square distance from the middle, which a straggler or two hardly moves: the camera's fit)
      C.spread = (C.spread || 0) + (Math.sqrt(s2 / n) - (C.spread || 0)) * Math.min(1, dt * 3);
      // denser when large (the owner, 2026-11-04: "when it starts to get really large start to get denser"): above
      // COLL.denseFrom cells the spacing shrinks and cohesion grows with the count (C.dense: 1, to 0.6 at 1000)
      C.dense = densityK(n);
      C.R0 = 1.05 * Math.sqrt(n) * C.dense + 1.2; // the comfortable radius: cells ~2.3 µm apart (closer when dense)
      // the camera follows the flock's middle, smoothed (alone: your cell)
      if (!C.members.length && cells.length === 1) { C.fx = cells[0].x; C.fy = cells[0].y; }
      else if (!(C.fx === C.fx)) { C.fx = cx; C.fy = cy; }
      else { C.fx += (cx - C.fx) * sm; C.fy += (cy - C.fy) * sm; }
      C.army = C.members.length + cells.length;
      // the flock's mean height (2.5D: the beacon spreads in a slab round it)
      let hs = 0, hn = 0;
      for (const S of cells) { hs += S.hz || 0; hn++; }
      for (const m of C.members) if (m.hz !== undefined) { hs += m.hz; hn++; }
      C.hz = hn ? hs / hn : 2;
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
    waylay(dt, t);

    mergeAndSplit(t, roster);
    losses(dt, t, ctx);
    divide(dt);
    bdelloPack(dt);
    // the dying: shown for a moment (rounding, darkening), then parked: main.js keepAmbient brings it
    // back as a free cell near whoever needs kin, in water nobody has seen (the army can be topped up)
    for (const k of kin) if (k.dying) {
      k.dying.t += dt;
      if (k.dying.kind === 'waylaid') { followOff(k, dt); if (k.dying.t > WAYLAY.gone) park(k); }
      else if (!stepEaten(k, dt)) park(k); // taken by an enemy: eaten, seen (eatenState)
    }
  }
  /** Free kin (not parked, not joining): the ones keepAmbient counts and may move. */
  const isFree = (k) => !k.coll && !k.dying && !k.answer && !k.parked;

  /** One flock step: every member by its own rules (FLOCK and its personality). */
  function stepFlock(C, dt, sq) {
    const all = C.members, cells = liveCells(C);
    nodes.length = 0;
    for (const m of all) nodes.push(m);
    for (const S of cells) nodes.push(S);
    const N = nodes.length, M = all.length;
    // pairs: separation (a physical push, shared) and alignment (neighbours' velocities), over the grid
    for (let i = 0; i < N; i++) { pushX[i] = 0; pushY[i] = 0; alX[i] = 0; alY[i] = 0; alN[i] = 0; }
    const sR = FLOCK.sepR * (C.dense || 1), aR = FLOCK.alignR, aR2 = aR * aR;
    const G = buildGrid(C, nodes, N), head = G.head, next = G.next, gnx = G.nx, gny = G.ny;
    for (let i = 0; i < N; i++) {
      const a = nodes[i], c = G.cellOf[i], gi = c % gnx, gj = (c - gi) / gnx;
      for (let jj = Math.max(0, gj - 1); jj <= Math.min(gny - 1, gj + 1); jj++) for (let ii = Math.max(0, gi - 1); ii <= Math.min(gnx - 1, gi + 1); ii++) {
        for (let j = head[ii + gnx * jj]; j >= 0; j = next[j]) {
          if (j <= i) continue;
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
    }
    // the leading edge along the intent: those behind it react later (a wave front to back)
    const ux = C.ux, uy = C.uy, cx = C.cx, cy = C.cy;
    let sMax = -Infinity;
    for (let i = 0; i < N; i++) sMax = Math.max(sMax, (nodes[i].x - cx) * ux + (nodes[i].y - cy) * uy);
    const iX = C.intent.x, iY = C.intent.y, idle = 1 - C.intent.m;
    const dashK = C.dash ? FLOCK.dash : 1;
    const t = world.time || 0;
    // LOD (perf): members out of every view follow the intent and the flock's middle (no alignment,
    // no wander, no Brownian jitter, their height every few steps); those in view get everything
    const inView = world.watch && world.watch.inView;
    const frame = (C.frame = (C.frame || 0) + 1);
    const insideAmoeba = world.amoeba && !world.amoeba.parked && !world.amoeba.beaten;
    let farN = 0;
    for (let i = 0; i < M; i++) {
      const m = nodes[i];
      if (m.drill) { m.sp = 0; continue; } // drilling into an enemy (guards.js holds it there)
      const far = inView ? !inView(m.x, m.y, 4) : false;
      m.far = far; if (far) farN++;
      // the intent as this member has perceived it so far: its own lag plus the wave from the front
      const behind = sMax - ((m.x - cx) * ux + (m.y - cy) * uy);
      // (pulling back out of an enemy's reach: the members in it react at once, guards.js m.flee)
      if (m.flee > 0) m.flee -= dt;
      const tau = m.flee > 0 ? 0.04 : m.lag + FLOCK.wave * behind;
      const k = 1 - Math.exp(-dt / tau);
      m.ix += (iX - m.ix) * k; m.iy += (iY - m.iy) * k;
      const vm = FLOCK.v * m.vmax;
      let Dx = m.ix * vm * dashK, Dy = m.iy * vm * dashK;
      // cohesion: stronger beyond the comfortable radius; with the stick released a gentle pull to settle
      const dx = cx - m.x, dy = cy - m.y, d = Math.hypot(dx, dy) || 1;
      const coh = (Math.min(35, FLOCK.coh * Math.max(0, d - C.R0)) + FLOCK.cohIdle * Math.max(0, d - C.R0 * 0.5) * idle) / (C.dense || 1);
      Dx += (dx / d) * coh; Dy += (dy / d) * coh;
      // separation as steering (the push itself is applied below)
      Dx += pushX[i] * 2 * FLOCK.sepK; Dy += pushY[i] * 2 * FLOCK.sepK;
      if (!far) {
        // alignment: match the neighbours' velocity a little (each to its own degree)
        if (alN[i] > 0) { Dx += (alX[i] / alN[i] - m.vx) * m.align; Dy += (alY[i] / alN[i] - m.vy) * m.align; }
        // wander: its own slow meander
        m.wa += 1.4 * sq * gauss(r);
        const wk = 5 * m.wander * (0.1 + 0.9 * C.intent.m);
        Dx += Math.cos(m.wa) * wk; Dy += Math.sin(m.wa) * wk;
      }
      // waylaid: drawn off toward the stranger, more the longer it drifts (WAYLAY)
      if (m.drift) {
        const s = m.drift.c, w = Math.min(1, 0.35 + m.drift.t / WAYLAY.pull);
        const gx = s.x - m.x, gy = s.y - m.y, gd = Math.hypot(gx, gy) || 1, gv = Math.min(vm * 0.7, 3 * Math.max(0, gd - 1.8));
        Dx = Dx * (1 - w) + (gx / gd) * gv * w + pushX[i] * FLOCK.sepK * w;
        Dy = Dy * (1 - w) + (gy / gd) * gv * w + pushY[i] * FLOCK.sepK * w;
      }
      const dm = Math.hypot(Dx, Dy);
      // it swims along its body: turn toward the wish at its own rate, slower while facing away
      // (a stopped cell needs a little more to start again, so a resting flock rests)
      // (a laggard well behind may swim a little over its own top speed to catch up, so a slow cell is not left behind for good)
      const catchUp = m.flee > 0 ? 1.7 : 1.15 + Math.min(0.85, Math.max(0, d - C.R0 * 1.2) / 25);
      if (d > C.R0 * 3 + 40) { m.hw = Math.min(m.hw ?? 3, 3); if (m.hz !== undefined) m.hz = Math.max(m.hz, 6.5); } // (a straggler far behind swims up over the clay to catch up)
      let target = dm < (m.sp < 2 ? FLOCK.stop * 1.6 : FLOCK.stop) ? 0 : Math.min(dm, vm * dashK * catchUp);
      if (dm > 0.5) {
        const diff = wrap(Math.atan2(Dy, Dx) - m.a);
        const w = Math.max(-m.turn * (m.flee > 0 ? 2 : 1), Math.min(m.turn * (m.flee > 0 ? 2 : 1), diff * FLOCK.turnGain));
        m.a += w * dt;
        target *= 0.3 + 0.7 * Math.max(0, Math.cos(diff));
      }
      if (!far) m.a += 0.22 * sq * gauss(r); // rotational Brownian motion (reduced, as for your steered cell)
      target *= world.filmK ? world.filmK(m.x, m.y) : 1; // the biofilm's EPS (thicker the deeper)
      if (insideAmoeba && world.insideAmoeba(m.x, m.y, t) > 0) target *= 0.35; // being engulfed
      m.sp += (target - m.sp) * (1 - Math.exp(-dt / m.acc));
      m.vx = Math.cos(m.a) * m.sp; m.vy = Math.sin(m.a) * m.sp;
      // currents: a raft is dragged less (dragK)
      let fx = 0, fy = 0;
      if (!world.flowNear || world.flowNear(m.x, m.y)) { const f = world.flowAt(m.x, m.y, flow); fx = f.x * C.drag; fy = f.y * C.drag; }
      pxs[i] = m.x; pys[i] = m.y;
      if (far) { m.x += (m.vx + fx) * dt + pushX[i]; m.y += (m.vy + fy) * dt + pushY[i]; }
      else { m.x += (m.vx + fx) * dt + pushX[i] + 0.5 * sq * gauss(r); m.y += (m.vy + fy) * dt + pushY[i] + 0.5 * sq * gauss(r); }
      // the body and flagella turn with its speed: still when it stops
      m.bodyPhase += dt * (m.sp / 1.6) * Math.PI;
      m.flPhase += dt * 20 * Math.min(2.2, m.sp / FLOCK.v);
      if (!far || (frame + i) % 4 === 0) world.stepHeight(m, far ? dt * 4 : dt, far ? sq * 2 : sq, m.r); // 2.5D: its own height, up and over grains (world.js LAYER)
      softLimits(m, pxs[i], pys[i]);
    }
    C.far = farN;
    // your own cell is pushed by the members as they are by it
    for (let i = M; i < N; i++) { const S = nodes[i], px = S.x, py = S.y; S.x += pushX[i]; S.y += pushY[i]; if (world.soften) world.soften(S, px, py); }
  }

  // free kin: slow wanderers that keep near where they live (they never join by themselves); far from
  // every player they rest where they are (perf: COLL.sleep)
  function stepFree(dt, sq) {
    const ps = world.watch ? world.watch.players : null, S = COLL.sleep;
    for (const k of kin) {
      if (k.coll || k.dying || k.parked) continue;
      if (k.answer) k.answer.t += dt;
      if (ps && !k.answer) { let awake = false; for (const p of ps) if (Math.abs(p.x - k.x) < S && Math.abs(p.y - k.y) < S) { awake = true; break; } if (!awake) continue; }
      k.a += 0.9 * sq * gauss(r);
      const dx = k.hx - k.x, dy = k.hy - k.y;
      if (dx * dx + dy * dy > 10 * 10) k.a += wrap(Math.atan2(dy, dx) - k.a) * Math.min(1, dt * 2);
      k.sp = 5;
      let fx = 0, fy = 0;
      if (!world.flowNear || world.flowNear(k.x, k.y)) { const f = world.flowAt(k.x, k.y, flow); fx = f.x; fy = f.y; }
      k.vx = Math.cos(k.a) * k.sp; k.vy = Math.sin(k.a) * k.sp;
      const px = k.x, py = k.y;
      k.x += (k.vx + fx) * dt + 0.6 * sq * gauss(r);
      k.y += (k.vy + fy) * dt + 0.6 * sq * gauss(r);
      k.bodyPhase += dt * (k.sp / 1.6) * Math.PI; k.flPhase += dt * 20 * (k.sp / FLOCK.v);
      world.stepHeight(k, dt, sq, k.r);
      // free kin keep to the open water: the biofilm's surface turns them back
      if (k.y < world.surfaceY(k.x) + 0.5) k.y = world.surfaceY(k.x) + 0.5;
      softLimits(k, px, py);
    }
  }

  /**
   * The soft limits (no invisible walls): surface tension at the drop's edge and the biofilm's EPS
   * slow a cell to a stop (world.soften), and clay grains push it round them (or it rides over).
   */
  function softLimits(c, px, py) {
    if (world.soften) world.soften(c, px, py);
    world.pushOutOfGrains(c, c.r + 0.1);
  }

  /** Where a beacon of flock C goes out from, and how far it reaches (see beacon). */
  function beaconOrigin(C) {
    const cells = [...liveCells(C), ...C.members.filter((m) => !m.drift)];
    const n = cells.length;
    const ds = cells.map((c) => Math.hypot(c.x - C.cx, c.y - C.cy)).sort((a, b) => a - b);
    const ext = n > 1 ? ds[Math.min(n - 1, Math.floor(COLL.beaconQ * n))] : 0;
    const R = Math.min(COLL.beaconMax, Math.max(COLL.beaconMin, ext + COLL.beaconPad));
    let x = C.cx, y = C.cy;
    const um = Math.hypot(C.vx, C.vy);
    if (um >= 3 && n > 1) {
      const ux = C.vx / um, uy = C.vy / um;
      const along = cells.map((c) => (c.x - C.cx) * ux + (c.y - C.cy) * uy).sort((a, b) => a - b);
      const f = along[Math.min(n - 1, Math.floor(COLL.beaconFront * n))];
      x = C.cx + ux * f; y = C.cy + uy * f;
    }
    return { R, x, y, ext };
  }

  // --- the beacon (X): a pulse from the flock's front (the owner: from the middle it was always
  // behind by the time the ring spread); it rides along with the flock while it spreads. Kin it
  // passes answer, one by one, and join ---
  function beacon(P, t) {
    const C = of(P);
    if (!C || !opts.on || !P.S.alive || P.S.species !== 'mtb' || t - C.lastBeacon < COLL.beaconGap) return null;
    C.lastBeacon = t;
    // (the owner, 2026-11-04: "the front of the mass of your group, not the very front, so that it doesn't count
    // a couple stragglers or scouting out front ... it should grow to a larger beacon as you get more creatures so
    // that it will tend to extend the same distance past the edge of the group"): its reach is the group's own
    // radius (COLL.beaconQ of its cells are within it: stragglers do not count) plus COLL.beaconPad; moving, it
    // goes out from the front of the main body (COLL.beaconFront of the cells are behind that point along the
    // motion), on the line through the middle; still, from the middle
    const { R, x, y } = beaconOrigin(C);
    // it stretches to reach the flock's drifting (waylaid) members and the strangers luring them, up to WAYLAY.recallMax
    // (each is answered when the front passes where it was as the pulse went out, so none can outrun it)
    let R2 = R;
    const reach = [];
    const bh = C.hz ?? 2;
    for (const m of C.members) if (m.drift) { const d = Math.hypot(m.x - x, m.y - y, zGap(m.hz, bh)); if (d < WAYLAY.recallMax) { reach.push({ o: m, d }); R2 = Math.max(R2, d + 3); } }
    for (const c of world.cells) if (c.waylay && c.waylay.C === C) { const d = Math.hypot(c.x - x, c.y - y, zGap(c.hz, bh)); if (d < WAYLAY.recallMax) { reach.push({ o: c, d }); R2 = Math.max(R2, d + 3); } }
    const b = { x, y, hz: bh, t: 0, R: R2, dur: 0.25 + R2 / 45, n: 0, C, slot: P.slot ?? 0, reach };
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
        b.x += C.vx * dt; b.y += C.vy * dt; // rides with the flock
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
        if (dx > front || dx < -front || dy > front || dy < -front) continue;
        const dz = zGap(k.hz, b.hz); // 2.5D: a kin cell far above or below the pulse's slab is not reached
        if (dx * dx + dy * dy + dz * dz > front * front) continue;
        if (b.C.members.length + b.C.answered >= COLL.max) continue;
        k.answer = { C: b.C, t: -(0.08 + answerDelay(b.n) + r() * 0.08), joined: false, slot: b.slot };
        b.n++; b.C.answered++;
        break;
      }
    }
    // a drifting member the pulse reaches comes back at once; a stranger it reaches is driven off
    for (const b of recruit) {
      const front = b.R * Math.min(1, b.t / b.dur) ** 0.7, f2 = front * front;
      for (const m of b.C.members) if (m.drift && (m.x - b.x) ** 2 + (m.y - b.y) ** 2 + zGap(m.hz, b.hz) ** 2 <= f2) recall(m, b);
      for (const q of b.reach) if (q.d <= front) {
        const o = q.o;
        if (o.drift && o.coll === b.C) recall(o, b);
        else if (o.waylay && o.waylay.C === b.C) { for (const m of b.C.members) if (m.drift && m.drift.c === o) recall(m, b); release(o, true); }
      }
      for (const c of world.cells) if (c.waylay && c.waylay.C === b.C && (c.x - b.x) ** 2 + (c.y - b.y) ** 2 + zGap(c.hz, b.hz) ** 2 <= f2) { for (const m of b.C.members) if (m.drift && m.drift.c === c) recall(m, b); release(c, true); }
    }
    // answering: the kin cell's own small pulse, and it joins
    for (const k of kin) {
      const A = k.answer;
      if (!A) continue;
      if (A.t >= 0 && !A.joined) {
        A.joined = true; A.C.answered = Math.max(0, A.C.answered - 1);
        if (!k.dying && !k.coll && list.includes(A.C) && A.C.players.length && A.C.members.length < COLL.max) {
          k.coll = A.C; A.C.members.push(k);
          k.label = A.slot; // its answer turns it: it takes the label of the player whose beacon it answered (draw.js LABELS)
          k.ix = A.C.intent.x * 0.3; k.iy = A.C.intent.y * 0.3;
          hooks.onRecruit?.(A.C, k);
        }
      }
      if (k.coll) A.t += dt; // a member's answer pulse plays out
      if (A.t > 0.7) k.answer = null;
    }
  }

  // --- waylaying (WAYLAY): the stranger strain draws members off; the beacon calls them back ---
  /** Stop drifting without a recall (lost to something else, or set free). */
  function unDrift(m) { const s = m.drift && m.drift.c; if (s && s.waylay) s.waylay.n = Math.max(0, s.waylay.n - 1); m.drift = null; }
  const strangerOk = (c) => c.kind === 'mtb' && !c.parked && !c.ghost && !c.lysed && !c.dead && !c.bdelloplast && !c.attachedBy;
  /** A drifting member answers the beacon: back into the flock at once (its own small answer pulse). */
  function recall(m, b) {
    const s = m.drift && m.drift.c;
    if (s && s.waylay) s.waylay.n = Math.max(0, s.waylay.n - 1);
    m.drift = null; m.immune = WAYLAY.immune;
    m.answer = { C: m.coll, t: 0, joined: true, slot: m.label };
    m.ix = m.coll.intent.x; m.iy = m.coll.intent.y;
    hooks.onRecall?.(m.coll, m, b);
  }
  /** The stranger swims on (driven off by a beacon, done loitering, or away with its catch). */
  function release(c, driven = false) {
    const W = c.waylay;
    if (!W) return;
    c.waylay = null; c.wlCool = WAYLAY.cool;
    const C = W.C;
    c.a = Math.atan2(c.y - C.cy, c.x - C.cx); c.run = 2 + r(); c.tumble = 0;
    if (driven) hooks.onDriven?.(C, c);
  }
  /** A member picked off: it leaves the flock and swims away with the stranger. */
  function pickOff(m) {
    const C = m.coll, s = m.drift.c;
    const i = C.members.indexOf(m); if (i >= 0) C.members.splice(i, 1);
    lossLog.push({ kind: 'waylaid', t: +(world.time || 0).toFixed(2), warned: +m.drift.t.toFixed(2), x: m.x, y: m.y }); // (its tell: the amber drift, its whole length)
    m.coll = null; m.answer = null; m.drift = null; m.dying = { kind: 'waylaid', t: 0, c: s, x: m.x, y: m.y };
    if (s.waylay) { s.waylay.n = Math.max(0, s.waylay.n - 1); s.waylay.took = (s.waylay.took || 0) + 1; }
    hooks.onWaylaid?.(C, m, s);
  }
  /** A picked-off member following the stranger away (it is parked after WAYLAY.gone s). */
  function followOff(k, dt) {
    const s = k.dying.c;
    const dx = s.x - k.x, dy = s.y - k.y, d = Math.hypot(dx, dy) || 1, v = Math.min(55, 6 * Math.max(0, d - 1.6));
    k.a += wrap(Math.atan2(dy, dx) - k.a) * Math.min(1, dt * 6);
    k.sp = v; k.vx = Math.cos(k.a) * v; k.vy = Math.sin(k.a) * v;
    k.x += k.vx * dt; k.y += k.vy * dt;
    if (s.hz !== undefined) k.hz = (k.hz ?? s.hz) + (s.hz - (k.hz ?? s.hz)) * Math.min(1, dt * 3);
    k.bodyPhase += dt * (v / 1.6) * Math.PI; k.flPhase += dt * 20 * Math.min(2.2, v / FLOCK.v);
  }
  function waylay(dt, t) {
    const on = opts.waylay && world.opts.npcRun !== false;
    for (const c of world.cells) {
      if (c.kind !== 'mtb') continue;
      if (c.wlCool > 0) c.wlCool -= dt;
      const W = c.waylay;
      if (!W) {
        if (!on || c.wlCool > 0 || !strangerOk(c)) continue;
        for (const C of list) {
          if (!C.players.length || C.members.length < WAYLAY.min || world.distFromStart(C.cx, C.cy) < WAYLAY.safeR) continue;
          const reach = C.extent + WAYLAY.notice;
          if (Math.abs(c.x - C.cx) > reach || Math.abs(c.y - C.cy) > reach || Math.hypot(c.x - C.cx, c.y - C.cy) > reach) continue;
          c.waylay = { C, state: 'come', t: 0, lureT: 0, pulseT: 0.9, ping: -1, n: 0, took: 0 };
          hooks.onStranger?.(C, c);
          break;
        }
        continue;
      }
      const C = W.C;
      W.t += dt;
      // the flock is gone or too small, the stranger is hurt or taken, or it has loitered long enough: it swims on
      if (!on || !strangerOk(c) || !list.includes(C) || !C.players.length || C.members.length < 2 || W.t > WAYLAY.stay || W.took >= 1) { release(c); continue; }
      // where it heads: just beyond the flock's edge on its own side, edging further off while it lures
      const ox = c.x - C.cx, oy = c.y - C.cy, od = Math.hypot(ox, oy) || 1;
      if (W.state === 'lure') W.lureT += dt;
      W.ext = W.ext === undefined ? C.extent : W.ext + (C.extent - W.ext) * Math.min(1, dt * 0.8); // (eased: a member coming back must not throw it outward)
      const want = W.ext + WAYLAY.edge + Math.min(WAYLAY.creepMax, WAYLAY.creep * W.lureT);
      const tx = C.cx + (ox / od) * want, ty = C.cy + (oy / od) * want;
      const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
      const vmax = W.state === 'come' ? WAYLAY.come : WAYLAY.lureV;
      const v = Math.min(vmax, d * 3);
      if (d > 0.05) { c.x += (dx / d) * v * dt; c.y += (dy / d) * v * dt; }
      // it faces the way it swims; loitering, it turns side-on to the flock
      const face = v > 4 ? Math.atan2(dy, dx) : Math.atan2(oy, ox) + Math.PI / 2;
      c.a += wrap(face - c.a) * Math.min(1, dt * 4);
      c.vx = d > 0.05 ? (dx / d) * v : 0; c.vy = d > 0.05 ? (dy / d) * v : 0;
      world.stepHeight(c, dt, Math.sqrt(dt), c.r);
      if (W.state === 'come' && od < W.ext + WAYLAY.edge + 3) W.state = 'lure';
      if (W.state !== 'lure') continue;
      // its decoy pulse: each draws off the nearest member in reach (never your own cell)
      W.pulseT -= dt;
      if (W.ping >= 0) W.ping += dt;
      if (W.pulseT > 0) continue;
      W.pulseT = WAYLAY.pulse; W.ping = 0;
      if (W.n >= WAYLAY.each) continue;
      let drifting = 0;
      for (const m of C.members) if (m.drift) drifting++;
      if (drifting >= WAYLAY.max) continue;
      let best = null, bd = WAYLAY.reach * WAYLAY.reach;
      for (const m of C.members) {
        if (m.drift || m.latched || (m.immune || 0) > 0) continue;
        const e2 = (m.x - c.x) ** 2 + (m.y - c.y) ** 2 + zGap(m.hz, c.hz) ** 2;
        if (e2 < bd) { bd = e2; best = m; }
      }
      if (!best) continue;
      best.drift = { c, t: 0 }; W.n++;
      hooks.onWaylay?.(C, best, c);
    }
    // the drifting members: picked off if left too long or too far
    for (const C of list) {
      for (let i = C.members.length - 1; i >= 0; i--) {
        const m = C.members[i];
        if (m.immune > 0) m.immune -= dt;
        if (!m.drift) continue;
        m.drift.t += dt;
        const far = Math.hypot(m.x - C.cx, m.y - C.cy);
        if (m.drift.t > WAYLAY.lostT || (m.drift.t > WAYLAY.lostMin && far > WAYLAY.lostD)) pickOff(m);
      }
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
    // (the flock's neighbour grid, fresh: prey rods look only at the members in the cells round them)
    const G = buildGrid(C, nodes, nodes.length);
    const ext = C.extent + 5, got = [];
    for (const c of world.cells) {
      if (c.kind !== 'rod' || c.ghost || c.lysed || c.bdelloplast || c.attachedBy || c.parked) continue;
      if (Math.abs(c.x - C.cx) > ext || Math.abs(c.y - C.cy) > ext) continue;
      const reach = c.L * 0.5 + COLL.eatReach;
      let best = null, bd = reach * reach;
      eachNear(G, c.x, c.y, (m) => { const d2 = (m.x - c.x) ** 2 + (m.y - c.y) ** 2 + zGap(m.hz, c.hz) ** 2; if (d2 < bd) { bd = d2; best = m; } });
      if (!best) continue;
      c.lysed = 0.001;
      best.growth = Math.min(1.2, (best.growth || 0) + 0.34); // three rods make a division
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
  function lose(m, kind, to = null) {
    const C = m.coll;
    unDrift(m);
    if (C) { const i = C.members.indexOf(m); if (i >= 0) C.members.splice(i, 1); }
    // (the loss log: what took it, and whether it was warned first: its attack's tell, guards.js warnZone etc.)
    const now = world.time || 0, w = m.warned && m.warned.kind === kind ? now - m.warned.t : null;
    lossLog.push({ kind, t: +now.toFixed(2), warned: w === null ? null : +w.toFixed(2), x: m.x, y: m.y });
    if (lossLog.length > 2000) lossLog.shift();
    m.coll = null; m.answer = null; m.drill = null; m.latched = null; m.warned = null;
    m.dying = eatenState(m, kind, to);
    hooks.onLost?.(C, m, kind);
  }
  /**
   * Being eaten, seen (the owner: "the animation has to look like the bacteria was eaten. If they just
   * disappear it won't be clear or fun"). A taken member leaves the flock and plays its end (EATEN gives
   * the times; collective post moves it, draw.js draws it):
   *   peritrich, Stentor  pulled along the flow into the mouth, spiralling in faster and faster and
   *                       wriggling, shrinking into the gullet; then a dark food vacuole in the body
   *                       that fades as it is digested
   *   amoeba              the lobe closes round it: drawn a little way in, wriggling; then a dark speck
   *                       in a vacuole drifting deeper into the cytoplasm, fading
   *   Bdellovibrio        it bores in: the member stops and rounds up into a bdelloplast (a swollen,
   *                       still sphere with the predator inside), then fades
   */
  function eatenState(m, kind, to) {
    const d = { kind, t: 0, x0: m.x, y0: m.y, a0: m.a, to: to ? { x: to.x, y: to.y } : null, spin: r() < 0.5 ? -1 : 1, wr: r() * 6.28 };
    const E = EATEN[kind];
    if (!E) return d;
    d.pull = E.pull; d.end = E.pull + E.digest;
    if (kind === 'grazer') {
      // the nearest feeding bell: its mouth, and a place inside the bell for the food vacuole
      let g = null, bd = Infinity;
      for (const q of world.grazers) { if (q.parked) continue; const dd = Math.hypot(q.pose.mouth.x - m.x, q.pose.mouth.y - m.y); if (dd < bd) { bd = dd; g = q; } }
      if (g) {
        const P = g.pose; d.to = d.to || { x: P.mouth.x, y: P.mouth.y };
        const bx = P.ox - P.up.x * g.R * 0.95, by = P.oy - P.up.y * g.R * 0.95, a = r() * 6.28, rr = Math.sqrt(r()) * g.R * 0.55;
        d.body = { x: bx + Math.cos(a) * rr, y: by + Math.sin(a) * rr };
      }
    } else if (kind === 'stentor' && world.stentor) {
      // (into its mouth as it moves, then a vacuole in its body, carried with it: in its frame from the holdfast)
      const B = world.stentor; d.st = B; d.to = { x: B.mouth.x, y: B.mouth.y };
      d.fu = 0.55 + r() * 0.3; d.lv = (r() - 0.5) * B.discR * 0.35 * d.fu;
      d.body = { x: B.mouth.x, y: B.mouth.y };
    } else if (kind === 'amoeba' && world.amoeba) {
      // in the amoeba's own frame, so the vacuole moves with it: from where it was taken, to a few µm in
      const A = world.amoeba, c = Math.cos(A.ang), sn = Math.sin(A.ang), dx = m.x - A.x, dy = m.y - A.y;
      d.lx = dx * c + dy * sn; d.ly0 = -dx * sn + dy * c; d.ly1 = Math.min(d.ly0, 0) - 5 - r() * 10;
    }
    return d;
  }
  /** Move a member being eaten along its end (EATEN; eatenState). Returns false once it is over (it is parked). */
  function stepEaten(k, dt) {
    const d = k.dying, t = d.t;
    if (!d.end) { const to = d.to; if (to) { const e = Math.min(1, t / 0.7), q = e * e * (3 - 2 * e); k.x = d.x0 + (to.x - d.x0) * q; k.y = d.y0 + (to.y - d.y0) * q; k.a += dt * 9; } return t < 1.6; }
    const wriggle = t < d.pull ? Math.sin(t * 38 + d.wr) * 0.5 * (1 - t / d.pull) : 0;
    if (d.st) {
      // Stentor moves: its mouth and the vacuole's place in its body follow it
      const B = d.st, c = Math.cos(B.ang), sn = Math.sin(B.ang), u = d.fu * B.len;
      d.to.x = B.mouth.x; d.to.y = B.mouth.y;
      d.body.x = B.foot.x + c * u - sn * d.lv; d.body.y = B.foot.y + sn * u + c * d.lv;
    }
    if (d.kind === 'grazer' || d.kind === 'stentor') {
      if (t < d.pull && d.to) {
        // along the flow into the mouth: round it (a spiral) and in, faster and faster
        const e = Math.pow(t / d.pull, 1.8), rx = d.x0 - d.to.x, ry = d.y0 - d.to.y, ang = d.spin * 2.4 * e, c = Math.cos(ang), sn = Math.sin(ang), k1 = 1 - e;
        k.x = d.to.x + (rx * c - ry * sn) * k1; k.y = d.to.y + (rx * sn + ry * c) * k1;
        k.a = Math.atan2(d.to.y - k.y, d.to.x - k.x) + wriggle;
      } else if (d.body) {
        // into the gullet and on to its food vacuole in the body
        const e = Math.min(1, (t - d.pull) / 0.6), q = e * e * (3 - 2 * e), from = d.to || { x: d.x0, y: d.y0 };
        k.x = from.x + (d.body.x - from.x) * q; k.y = from.y + (d.body.y - from.y) * q;
        k.a += dt * 0.6;
      }
    } else if (d.kind === 'amoeba' && world.amoeba) {
      const A = world.amoeba, c = Math.cos(A.ang), sn = Math.sin(A.ang);
      const e = Math.min(1, t / d.pull), q = e * e * (3 - 2 * e);
      // closed in, then drifting slowly deeper as it is digested
      const ly = d.ly0 + (d.ly1 - d.ly0) * q - Math.max(0, t - d.pull) * 0.9, lx = d.lx + Math.sin(t * 0.7 + d.wr) * 0.6 * Math.min(1, t);
      k.x = A.x + c * lx - sn * ly; k.y = A.y + sn * lx + c * ly;
      k.a += wriggle * 0.4 + dt * 0.3;
    } else if (d.kind === 'bdello') {
      // it holds still as it rounds up (a few wriggles first)
      k.a = d.a0 + wriggle;
    }
    return t < d.end;
  }
  const OUT_L = { x: 0, y: 0 }, OUT_N = { x: 0, y: 0 };
  function losses(dt, t) {
    const st = world.stentor;
    for (const C of list) {
      for (let i = C.members.length - 1; i >= 0; i--) {
        const m = C.members[i];
        // (nothing kills passively, the owner, 2026-11-04: a member that swims into the peritrich's funnel or into the
        // amoeba is pushed back out; only an attack it was warned of takes it: guards.js)
        if (world.grazerMouthAt && world.grazerMouthAt(m.x, m.y, 9)) { const g = world.grazers[0], M = g.pose.mouth; m.x = M.x + g.pose.up.x * 3.2; m.y = M.y + g.pose.up.y * 3.2; }
        const dIn = world.insideAmoeba(m.x, m.y, t);
        if (dIn > 0 && !m.drill) {
          // (out the nearest way: along its surface's normal there, its arms and tunnels included)
          const A = world.amoeba, L = world.amoebaLocal(m.x, m.y, OUT_L), N = world.amoebaNormal(L.x, L.y, t, OUT_N), c = Math.cos(A.ang), s = Math.sin(A.ang), k = Math.min(dIn + 0.3, 40 * dt);
          m.x += (c * N.x - s * N.y) * k; m.y += (s * N.x + c * N.y) * k;
        }
        // (Stentor's cone takes members a little at a time: guards.js suck)
      }
    }
    // stray free kin drawn into Stentor's mouth are swallowed (seen: eatenState)
    if (st && st.placed && !st.beaten && st.awake) for (const k of kin) if (!k.coll && !k.dying && !k.parked && Math.abs(k.x - st.mouth.x) < 5 && Math.abs(k.y - st.mouth.y) < 5) { if (k.answer && !k.answer.joined) k.answer.C.answered = Math.max(0, k.answer.C.answered - 1); k.answer = null; k.dying = eatenState(k, 'stentor', st.mouth); }
    // free kin can be eaten too (they come back elsewhere)
    for (const k of kin) if (!k.coll && !k.dying && world.grazerMouthAt && world.grazerMouthAt(k.x, k.y, 9)) { if (k.answer && !k.answer.joined) k.answer.C.answered = Math.max(0, k.answer.C.answered - 1); k.dying = { kind: 'grazer', t: 0 }; k.answer = null; }
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
    const fh = from && from.hz !== undefined ? from.hz : P.S.hz;
    for (const m of C.members) { const d = (m.x - fx) ** 2 + (m.y - fy) ** 2 + zGap(m.hz, fh) ** 2; if (d < bd) { bd = d; best = m; } }
    best.warned = { kind, t: (world.time || 0) - 1 }; // (its tell was its wind-up at your own cell: main.js runFights)
    lose(best, kind);
    P.safeT = 1.6;
    return true;
  }

  // --- division: members regrow slowly, and fast on prey (eat()) ---
  function divide(dt) {
    for (const C of list) {
      if (!C.players.length) continue;
      const add = [];
      const fed = C.members.length < 200; // (perf: a big flock reads the food patches for one member in four)
      for (let i = 0; i < C.members.length; i++) {
        const m = C.members[i];
        let rate = COLL.grow;
        if ((fed || (i & 3) === (C.frame & 3)) && world.food(m.x, m.y) > 0.15) m.fedT = 1.2;
        if (m.fedT > 0) { m.fedT -= dt; rate *= 2; }
        m.growth += rate * dt;
        if (m.growth >= 1) {
          m.growth = 0;
          if (C.members.length + add.length >= COLL.max) continue;
          const d = reuse(m.x - Math.cos(m.a) * 1.6, m.y - Math.sin(m.a) * 1.6);
          d.a = m.a + Math.PI; d.coll = C; d.label = m.label; d.hz = m.hz; d.hw = m.hw; // a daughter carries its mother's label (and height)
          add.push(d);
        }
      }
      for (const d of add) { if (!d.inKin) { d.inKin = true; kin.push(d); } C.members.push(d); hooks.onDivide?.(C, d); }
    }
  }
  /** A new cell at (x, y): a parked kin cell taken back (one lost earlier), else a new one. */
  function reuse(x, y) {
    for (let i = reuseAt; i < kin.length; i++) { const k = kin[i]; if (k.parked && !k.coll && !k.dying && !k.answer) { reuseAt = i + 1; putFree(k, x, y); k.inKin = true; k.zone = 1; k.colony = null; return k; } }
    reuseAt = 0;
    return newKin(x, y);
  }
  let reuseAt = 0;
  /** The player's own division: the daughter joins the flock. */
  function adopt(P, x, y, a) {
    const C = of(P);
    if (!C || C.members.length >= COLL.max) return false;
    const d = reuse(x, y); d.a = a; d.coll = C; d.label = P.slot ?? 0; if (!d.inKin) { d.inKin = true; kin.push(d); } C.members.push(d);
    return true;
  }

  // --- the Bdellovibrio pack (a gate): they go for the nearest member of a flock near their gate, latch
  // on to its pole for COLL.latch s (trembling: the members round it can kill it then; guards.js), and
  // if it lives it bores in: the member is lost and the predator hides in the bdelloplast for a while ---
  function bdelloPack(dt) {
    if (!world.opts.hunters) return;
    for (const c of world.cells) {
      if (c.kind !== 'bdello' || !c.home || c.dead || c.parked) continue;
      const L = c.latch;
      if (L) {
        // latched: glued to the member's pole, trembling
        const m = L.m;
        if (!m.coll || m.dying) { c.latch = null; m.latched = null; c.cooldown = 1; continue; }
        L.t += dt;
        const pa = m.a;
        c.x = m.x + Math.cos(pa) * m.L * 0.55; c.y = m.y + Math.sin(pa) * m.L * 0.55;
        c.a = pa + Math.PI + Math.sin(L.t * 46) * 0.12; c.windup = Math.min(1, L.t / COLL.latch);
        if (L.t >= COLL.latch) { m.latched = null; lose(m, 'bdello'); m.dying.bdello = c; c.latch = null; c.windup = 0; c.hidden = 1.5; c.cooldown = 3; }
        continue;
      }
      if (c.prey || c.hidden > 0 || c.stalking || c.cooldown > 1 || c.drillLatch) continue;
      let best = null, bd = 40;
      for (const C of list) {
        if (!C.members.length || !C.players.length) continue;
        if (Math.hypot(C.cx - c.home.x, C.cy - c.home.y) > c.home.r + 22) continue;
        for (const m of C.members) { const d = Math.abs(m.x - c.x) + Math.abs(m.y - c.y); if (d < bd && !m.latched) { bd = d; best = m; } }
      }
      if (!best) continue;
      const want = Math.atan2(best.y - c.y, best.x - c.x);
      c.a += wrap(want - c.a) * Math.min(1, dt * 5);
      c.tumble = 0; c.run = Math.max(c.run || 0, 0.3);
      if (Math.hypot(best.x - c.x, best.y - c.y) < 1.4) {
        const C = best.coll;
        // the slime shield: half the rams glance off
        if (C.level >= 1 && r() < 0.3) { c.cooldown = 1.6; c.a += Math.PI; hooks.onShield?.(C, null, 'bdello'); continue; }
        c.latch = { m: best, t: 0 }; best.latched = c; best.warned = { kind: 'bdello', t: world.time || 0 }; // (its tell: it clings, trembling, for COLL.latch s)
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
    COLL, FLOCK, WAYLAY, EATEN, kin, beaconOrigin, lossLog, list, opts, of, dragK, ensure, putFree, park, isFree, remove, reset, pre, post, absorb, burst, adopt, beacon, eat, focus, lose,
    /** For tests and the HUD: each flock's players, members, size, level, charge and middle. */
    report: () => list.map((C) => ({ id: C.id, players: C.players.map((P) => P.slot), members: C.members.length, labels: C.members.map((m) => m.label), army: C.army, level: C.level, charge: +C.charge.toFixed(2), x: +C.cx.toFixed(1), y: +C.cy.toFixed(1), fx: +(C.fx || 0).toFixed(1), fy: +(C.fy || 0).toFixed(1), speed: +C.speed.toFixed(1), extent: +C.extent.toFixed(1), beacons: C.beacons.length, drifting: C.members.filter((m) => m.drift).length })),
    /** For tests and the HUD: the strangers waylaying a flock, and its drifting members. */
    waylays: () => ({ strangers: world.cells.filter((c) => c.waylay).map((c) => ({ x: +c.x.toFixed(1), y: +c.y.toFixed(1), state: c.waylay.state, t: +c.waylay.t.toFixed(2), n: c.waylay.n, flock: c.waylay.C.id })), drifting: list.flatMap((C) => C.members.filter((m) => m.drift).map((m) => ({ flock: C.id, t: +m.drift.t.toFixed(2), d: +Math.hypot(m.x - C.cx, m.y - C.cy).toFixed(1) }))), gone: kin.filter((k) => k.dying && k.dying.kind === 'waylaid').length }),
  };
}

export const LEVEL_NAMES = ['', 'slime', 'raft', 'toxin'];
