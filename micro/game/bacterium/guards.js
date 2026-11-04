// The gates on the way (world.js ROUTE, BEATS), fought by your swarm. Each is placed once by the
// encounter director (main.js, shared/director.js): on the route from the first frame, or in water
// nobody has seen, a little ahead of whoever leads (placeGate); until then it is parked far off.
//
// The owner (3 Nov 2026): "putting in specific enemies that block your way and that you can battle
// with in that they each [eat] some of your group and you can drill into them. And also, allow the
// group to keep growing and growing, and each additional bacterium is like an extra HP for fighting
// sake". So every gate is a tug-of-war you can read:
//
//   members are HP   the swarm is your health: an enemy eats members, never you while you have them
//   it eats          each enemy has a rhythm: a TELL you can see (the peritrich's cilia race and its
//                    current swells; the amoeba's edge bulges; Stentor's membranelles speed up and its
//                    vortex brightens; a Bdellovibrio trembles on a member's pole), then a BITE that
//                    takes members (sucked into the funnel, engulfed, swept into the oral pouch, bored
//                    into), a few at a time, at a rate you can count
//   you drill        steer the swarm into it: every member that touches its surface latches on and
//                    bores in (a contact-killing drill: it turns in place, nose in, a bright pore at its
//                    tip), wearing its health down, drill by drill; more members drill faster (and a
//                    bigger swarm's quorum makes each drill a little stronger: FIGHT.quorum)
//   X                a burst: every drilling member bores harder at once (FIGHT.volley each)
//   Y                the toxin (army 12): a big hit, FIGHT.burst of its health
//   its health       the brass gauge at the top and a bar over the enemy (main.js); the enemy itself
//                    shows it too (the bell shrinks and darkens, Stentor pales)
//   the amoeba       has no health (the owner, 2026-11-04: "infinite HP ... but be able to be routed"):
//                    your attacks irritate it (IRR), its cytoplasm blanching round the drills and its
//                    body recoiling, until it is routed and flows off the way; your drills bore tunnels
//                    into it (TUN), even right through a thin pseudopod, but a tunnel with your cells in
//                    it pinches shut (PINCH): pull out when its mouth narrows
//   beaten           it dies, flees or is routed, and the way is open: the peritrich coils and its
//                    bell dissolves, the pack is killed off, the amoeba flows away off the way, Stentor
//                    contracts and stays shut. It stays beaten. No timers anywhere.
//   letting go       steer away and the drilling members let go once the swarm has left them behind
//
// The numbers (GATES: health, regrowth, the bite's rhythm and size) are set so a swarm of about the
// gate's `need` (world.js ENCOUNTERS) wins in a fair fight, losing about half, and one three times
// that wins in a few seconds (flock.test.mjs measures both).
//
// Real basis: Gram-negative bacteria kill neighbours by contact with type VI secretion, which Vibrio
// cholerae also turns on amoebae (Pukatzki et al. 2006); quorum-regulated toxins such as violacein
// kill protist grazers (atlas C28). [Departure]: a magnetotactic spirillum doing any of this, cells
// "drilling" into a protist, the rhythm of the bites, and the numbers (game values).

export const FIGHT = {
  drill: 1.0,     // health one drilling member bores away per second
  quorum: 0.15,   // × (1 + quorum · log2(army / 12)): a bigger swarm's quorum makes every drill a little stronger
  volley: 0.35,   // X: every drilling member's extra burst
  burst: 0.12,    // Y's toxin: this share of the enemy's full health (at least burstMin)
  burstMin: 12,
  poison: 0.3,    // a member an enemy eats poisons it a little (violacein-like)
  latch: 1.2,     // a member this close outside an enemy's surface latches on and drills (µm)
  leash: 24,      // a drilling member lets go once its flock's middle is this far beyond its comfortable radius (steered on without it)
  bdelloHp: 10, bdelloRegen: 1.5, bdelloK: 2, // (a Bdellovibrio is tiny: each drill into it counts double)
};
/**
 * Each gate's health, regrowth (per s), its bite's rhythm (every `every` s, after a tell of `tell` s), its
 * capture zone (`reach` µm: ZONES) and how many members can drill at once. No fixed bite size (the owner:
 * "Bacteria enemies should pick off members depending on the attack and your position ... If you drive your
 * whole crew into someone's mouth you all get eaten but if you pull back some should be safe"): every member
 * in the zone when the bite lands is taken, each with a chance that grows with how deep in it is.
 */
export const GATES = {
  grazer1: { max: 80, regen: 3, every: 4.8, tell: 1.8, reach: 28, cap: 90 },
  bdello: { max: 16 * FIGHT.bdelloHp, regen: 0, cap: 8 }, // (per Bdellovibrio: each lunges at the nearest member in reach, latches on and bores in: collective.js bdelloPack)
  amoeba: { max: Infinity, regen: 0, every: 5.0, tell: 2.0, reach: 8, cap: 300 }, // (no health: it is routed, IRR)
  stentor: { max: 2000, regen: 3, reach: 14, cap: 520 }, // (its rhythm is the pull: main.js runBoss, its tell 2 s)
};
/** After a bite that took someone it swallows: SWALLOW.t s with no regrowth and drills biting SWALLOW.k times as hard (the moment to go back in). */
export const SWALLOW = { t: 1.6, k: 1.5 };
/** The amoeba's pseudopods (aimWrap): round the cells within WRAP.near µm of its edge, a loop WRAP.Rmin..Rmax µm across, engulfing at most WRAP.max at once (the nearest its middle). */
export const WRAP = { near: 14, Rmin: 9, Rmax: 30, fast: 1.25, dent: 10, max: 30 };
/** Stentor's suction (suck): a member at depth k in its cone is taken at SUCK.rate·k² a second, at most SUCK.max a second in all. Its knockback per share of its health drilled away: KNOCK. */
export const SUCK = { rate: 1.6, max: 4, grace: 0.8 };
export const KNOCK = { drill: 6, volley: 0.004 };
/**
 * The amoeba cannot be killed (the owner, 2026-11-04: "the amoeba should essentially have infinite HP (because
 * it's huge, right?), but be able to be routed by attacks"): what your attacks build up is its irritation, 0..1,
 * a leaky sum: drilling, X and the toxin add pain / IRR.k, and it ebbs by irritation / IRR.tau a second (three
 * times as fast once nobody has touched it for IRR.calm s), so only
 * an attack kept up hard enough ever gets it to 1, when it is routed: it flows off the way (world.js). The drills
 * at one spot share it: a tunnel's n drillers hurt it n^IRR.share times one drill's rate (more spots, more pain),
 * and more the deeper the tunnel (× 1 + depth / IRR.deep). However hard it is attacked, its irritation rises at
 * most IRR.rate a second (it is huge: routing it takes a while, so a swarm burrowed in meets its traps); only
 * the toxin (Y, IRR.toxin at once) is not held to that.
 */
export const IRR = { k: 200, tau: 60, calm: 2, deep: 60, share: 0.6, rate: 0.17, toxin: 0.2 };
/**
 * Its tunnels (the owner: "you should be able to eventually drill a hole straight through its pseudopod or
 * body if you try hard enough"): the members drilling at one spot bore a tunnel, a capsule TUN.w0..wMax µm
 * wide (half-width, wider with more drillers) that deepens at TUN.rate × the drill rate × (members at its
 * end)^0.6 µm a second (slower the deeper: ÷ 1 + depth / soft), and, left alone TUN.hold s, closes at
 * TUN.close µm a second as the cytoplasm flows back. One that reaches the far side is a passage through.
 */
export const TUN = { join: 7, max: 8, w0: 2.2, wk: 0.3, wMax: 6, rate: 0.35, soft: 120, close: 1.2, hold: 1.5, volley: 0.25 };
/**
 * "it can surround you and trap you easier when you're burrowing": a tunnel with your cells in it (past its
 * mouth) for PINCH.wait s starts to pinch shut: its mouth narrows over PINCH.tell s (the tell: the ring, the
 * warning "pull out of the tunnel!"), then closes on whatever is still inside (each taken with PINCH.chance
 * deep in it, less near its mouth; at most PINCH.max, the deepest)
 * and half the tunnel fills in. Then it rests PINCH.cool s. Its pseudopod loop also closes faster round
 * cells in a tunnel or a dent (WRAP.fast).
 */
export const PINCH = { wait: 1.5, tell: 1.6, chance: 0.95, max: 30, cool: 5, minLen: 10, keep: 0.5 };

export function createGuards(world, coll, stentor, hooks = {}) {
  const [g1] = world.grazers;
  const pack = world.cells.filter((c) => c.kind === 'bdello' && c.home);
  const G = (o) => ({ hp: o.max, irr: 0, beaten: false, contact: 0, drills: 0, engaged: false, atk: { st: 'idle', t: 0, next: 1.2 }, bites: 0, eaten: 0, ...o });
  const list = [
    G({ id: 'grazer1', name: 'Peritrich', kind: 'grazer', g: g1, ...GATES.grazer1, zone: 60 }),
    G({ id: 'bdello', name: 'Bdellovibrio pack', kind: 'bdello', ...GATES.bdello, max: pack.length * FIGHT.bdelloHp, zone: 60 }),
    G({ id: 'amoeba', name: 'Amoeba', kind: 'amoeba', A: world.amoeba, ...GATES.amoeba, zone: 75 }),
    G({ id: 'stentor', name: 'Stentor', kind: 'stentor', B: stentor, ...GATES.stentor, zone: stentor.wakeR }),
  ];
  const byId = Object.fromEntries(list.map((q) => [q.id, q]));
  for (const c of pack) c.hp = FIGHT.bdelloHp;

  for (const q of list) { q.bearing = 0; q.placed = false; }
  /**
   * Put gate q at (x, y), met coming along bearing b (main.js: the director calls this only in water
   * nobody has seen, out of every view). Called again it moves the gate (still unseen); `shift`
   * moves it by (dx, dy) as it is (a lingering player's gate coming over to them: behaviour).
   */
  function placeGate(q, x, y, b) {
    q.bearing = b; q.placed = true;
    if (q.kind === 'grazer') world.placeGrazer(q.g, x, y, b);
    else if (q.kind === 'amoeba') world.placeAmoeba(x, y, b);
    else if (q.kind === 'bdello') {
      pack.forEach((c, i) => {
        c.home.x = x; c.home.y = y; c.parked = false;
        if (!c.dead && !c.latch) { const a = (i / pack.length) * 6.283; c.x = x + Math.cos(a) * 14 + (Math.random() - 0.5) * 8; c.y = y + Math.sin(a) * 14 + (Math.random() - 0.5) * 8; c.hidden = 0; c.prey = null; c.stalking = null; }
      });
    }
  }
  function shift(q, dx, dy) {
    if (q.kind === 'grazer') { const g = q.g; g.x += dx; g.base += dy; g.anchor.x += dx; g.anchor.y += dy; g.pose = world.grazerPose(g); }
    else if (q.kind === 'amoeba') { const A = q.A; A.x += dx; A.y += dy; A.home.x += dx; A.home.y += dy; }
    else if (q.kind === 'bdello') for (const c of pack) { c.home.x += dx; c.home.y += dy; }
  }
  /** Park gate q far off, unplaced (a new game). */
  function park(q) {
    q.placed = false;
    const P = world.PARK;
    if (q.kind === 'grazer') world.parkGrazer(q.g);
    else if (q.kind === 'amoeba') world.placeAmoeba(P.x, P.y, 0);
    else if (q.kind === 'bdello') for (const c of pack) { c.home.x = P.x; c.home.y = P.y; c.x = P.x; c.y = P.y; c.parked = true; c.latch = null; c.prey = null; c.stalking = null; }
  }
  /** Where an enemy is (its gauge and its zone are centred here). */
  function centre(q, out) {
    if (q.kind === 'grazer') { const P = q.g.pose; out.x = P.ox - P.up.x * q.g.R * 0.95; out.y = P.oy - P.up.y * q.g.R * 0.95; }
    else if (q.kind === 'bdello') { out.x = pack[0].home.x; out.y = pack[0].home.y; }
    else if (q.kind === 'amoeba') { out.x = q.A.x; out.y = q.A.y; }
    else { out.x = q.B.mouth.x; out.y = q.B.mouth.y; }
    return out;
  }
  const at = { x: 0, y: 0 };
  const isLive = (q) => (q.kind === 'stentor' ? q.B.placed && q.B.awake : q.placed) && !q.beaten;

  // ---- the enemy's surface: how far outside it a point is (negative inside), and the way out (its normal) ----
  const SURF = { d: 0, nx: 0, ny: 0, ref: null }, BODY = { d: 0, u: 0, nx: 0, ny: 0, v: 0 }, LOC = { x: 0, y: 0 }, NRM = { x: 0, y: 0 }, WP = { x: 0, y: 0 };
  /** Surface of gate q at (x, y): SURF.d (µm outside; negative inside), SURF.nx/ny (outward), SURF.ref (a Bdellovibrio). Null when nowhere near. */
  function surface(q, x, y, t) {
    if (q.kind === 'grazer') {
      const P = q.g.pose, R = q.g.R * (0.82 + 0.18 * q.g.ext) * shrink(q);
      const bx = P.ox - P.up.x * R * 0.95, by = P.oy - P.up.y * R * 0.95;
      const dx = x - bx, dy = y - by, d = Math.hypot(dx, dy) || 1;
      let best = d - R, nx = dx / d, ny = dy / d;
      // or its stalk down to the clay grain (a thin capsule)
      const sx = q.g.x, sy = q.g.base, ex = P.top.x - sx, ey = P.top.y - sy, L2 = ex * ex + ey * ey || 1;
      const u = Math.max(0, Math.min(1, ((x - sx) * ex + (y - sy) * ey) / L2));
      const qx = x - sx - ex * u, qy = y - sy - ey * u, qd = Math.hypot(qx, qy) || 1;
      if (qd - 1.2 < best) { best = qd - 1.2; nx = qx / qd; ny = qy / qd; }
      if (best > 25) return null;
      SURF.d = best; SURF.nx = nx; SURF.ny = ny; SURF.ref = null;
      return SURF;
    }
    if (q.kind === 'amoeba') {
      const depth = world.insideAmoeba(x, y, t);
      if (depth < -25) return null;
      // (its outward normal: the way its depth falls, its arms and tunnels included)
      const A = q.A, L = world.amoebaLocal(x, y, LOC), N = world.amoebaNormal(L.x, L.y, t, NRM), c = Math.cos(A.ang), s = Math.sin(A.ang);
      SURF.d = -depth; SURF.nx = c * N.x - s * N.y; SURF.ny = s * N.x + c * N.y; SURF.ref = null;
      return SURF;
    }
    if (q.kind === 'stentor') {
      // its oral disc's rim, or its body (from the holdfast to the disc): whichever is nearer
      const B = q.B;
      if (Math.abs(x - B.mouth.x) > B.L + B.discR + 40 || Math.abs(y - B.mouth.y) > B.L + B.discR + 40) return null;
      const D = B.disc(x, y), dx = x - B.mouth.x, dy = y - B.mouth.y, d = Math.hypot(dx, dy) || 1, Bo = B.body(x, y, BODY);
      if (Bo.d < D.out) { SURF.d = Bo.d; SURF.nx = Bo.nx; SURF.ny = Bo.ny; } else { SURF.d = D.out; SURF.nx = dx / d; SURF.ny = dy / d; }
      SURF.ref = null;
      return SURF.d > 25 ? null : SURF;
    }
    // the pack: the nearest live Bdellovibrio
    let best = null, bd = 25;
    for (const c of pack) {
      if (c.dead || c.parked) continue; // (hidden in a bdelloplast it is a sitting target)
      const dx = x - c.x, dy = y - c.y;
      if (Math.abs(dx) > bd || Math.abs(dy) > bd) continue;
      const d = Math.hypot(dx, dy) - 0.6;
      if (d < bd) { bd = d; best = c; SURF.nx = dx / (d + 0.6 || 1); SURF.ny = dy / (d + 0.6 || 1); }
    }
    if (!best) return null;
    SURF.d = bd; SURF.ref = best;
    return SURF;
  }
  /** How hard each member drills in a swarm of `army` (a bigger swarm's quorum: FIGHT.quorum). */
  function drillRate(army) { return FIGHT.drill * (1 + FIGHT.quorum * Math.log2(Math.max(1, army / 12))); }
  /** Its body shrinks a little as its health falls (the damage state): 1 at full health, 0.8 near none. */
  function shrink(q) { return 0.8 + 0.2 * Math.max(0, q.hp / q.max); }
  /** Is a cell at (x, y) touching this enemy (close enough to drill)? */
  function touching(q, x, y, t) { const s = surface(q, x, y, t); return !!s && s.d < FIGHT.latch; }

  /** Each cell (members and the players' live cells) of the flocks near this enemy. */
  function eachFlock(q, fn) {
    centre(q, at);
    for (const C of coll.list) {
      if (!C.players.length) continue;
      const reach = q.zone + C.extent + 30;
      if (Math.abs(C.cx - at.x) > reach || Math.abs(C.cy - at.y) > reach) continue;
      fn(C);
    }
  }
  /** Is any player's flock (or lone cell) inside this enemy's zone? */
  function engagedBy(q, roster) {
    centre(q, at);
    for (const P of roster) {
      if (!P.S.alive) continue;
      const f = coll.focus(P) || P.S;
      if (Math.hypot(f.x - at.x, f.y - at.y) < q.zone) return true;
    }
    for (const C of coll.list) if (C.players.length) for (const m of C.members) if (m.drill && m.drill.q === q) return true;
    return false;
  }

  function beat(q) {
    if (q.beaten) return;
    q.beaten = true; if (q.kind !== 'amoeba') q.hp = 0; q.contact = 0; q.drills = 0; q.atk.st = 'idle';
    if (q.kind === 'grazer') { q.g.beaten = true; q.g.feeding = false; q.g.battle = false; q.g.pull = 1; }
    if (q.kind === 'amoeba') {
      // routed, never killed: it flows away along its own line, away from the swarm that drove it off (world.js)
      const A = q.A, F = coll.list.find((C) => C.players.length), c0 = drillCentre(q) || (F && { x: F.cx, y: F.cy });
      A.beaten = true; A.routed = true; A.surge = 0; A.wrap = null; A.routeV = 0;
      if (c0) A.routeSide = (c0.x - A.x) * Math.cos(A.ang) + (c0.y - A.y) * Math.sin(A.ang) > 0 ? -1 : 1;
      for (const T of A.tunnels) T.pinch = null;
    }
    if (q.kind === 'stentor') q.B.beaten = true;
    if (q.kind === 'bdello') for (const c of pack) if (!c.dead) killBdello(c, q);
    releaseAll(q);
    hooks.onBeaten?.(q);
  }
  function hurt(q, amount, capped = true) {
    if (q.beaten || amount <= 0) return;
    q.hitT = 0.25;
    if (q.kind === 'amoeba') {
      // (X and the poison share its IRR.rate cap with the drills; the toxin does not)
      q.irrBudget = q.irrBudget ?? IRR.rate * 0.5;
      const a = capped ? Math.min(amount, Math.max(0, q.irrBudget) * IRR.k) : amount;
      if (capped) q.irrBudget -= a / IRR.k;
      irritate(q, a); q.A.flinch = Math.min(1, q.A.flinch + amount / 15); return;
    }
    q.hp -= amount;
    if (q.hp <= 0) beat(q);
  }
  /** The amoeba's irritation rises by pain / IRR.k (routed at 1: beat). */
  function irritate(q, pain) {
    const was = q.irr;
    q.irr = Math.min(1, q.irr + pain / IRR.k);
    if (was < 0.5 && q.irr >= 0.5) hooks.onFlinch?.(q);
    if (q.irr >= 1) beat(q);
  }
  function killBdello(c, q) {
    if (c.latch) { c.latch.m.latched = null; c.latch = null; } // the member it clung to is saved
    c.dead = 0.001; c.hidden = 0; c.stalking = null; c.windup = 0; c.prey = null; c.drillLatch = false;
    for (const C of coll.list) for (const m of C.members) if (m.drill && m.drill.ref === c) m.drill = null;
    hooks.onKill?.(q, c);
  }
  function releaseAll(q) { for (const C of coll.list) for (const m of C.members) if (m.drill && m.drill.q === q) m.drill = null; }

  // ---- drilling: members that touch latch on and bore in ----
  /** The drilling members of flock C on gate q: held at their place on its surface, turning nose-in; new ones latch on. */
  function drill(q, C, dt, t) {
    let n = 0;
    centre(q, at);
    const cx = at.x, cy = at.y;
    // the swarm's middle gone on without them, or steered away (pulling back out of its reach): the drills let go
    const leash = C.R0 * 1.2 + FIGHT.leash;
    // (away: the stick points out from its surface where the swarm is: its outward normal there)
    const s0 = q.kind === 'bdello' ? null : surface(q, C.cx, C.cy, t);
    let ox = s0 ? s0.nx : C.cx - cx, oy = s0 ? s0.ny : C.cy - cy;
    if (s0 && q.kind === 'amoeba') {
      // (its body's normal there, as it was before any tunnel: inside a tunnel "out" is still back out of it)
      const A = q.A, L = world.amoebaLocal(C.cx, C.cy, LOC), N = world.amoebaNormal(L.x, L.y, t, NRM, false), c = Math.cos(A.ang), s = Math.sin(A.ang);
      ox = c * N.x - s * N.y; oy = s * N.x + c * N.y;
    }
    const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
    const away = C.intent.m > 0.5 && (C.intent.x * ox + C.intent.y * oy) / (Math.hypot(C.intent.x, C.intent.y) || 1) > 0.5;
    for (const m of C.members) {
      if (m.dying || m.latched) { if (m.drill) m.drill = null; continue; }
      // pulling back: the members in its reach dart out at once (collective.js m.flee)
      if (away && zone(q, m.x, m.y, t) > 0) m.flee = 0.5;
      const D = m.drill;
      if (D && D.q === q) {
        // let go: steered away and left behind, drawn off by a stranger, or its Bdellovibrio gone
        if (away || m.drift || Math.hypot(m.x - C.cx, m.y - C.cy) > leash || (D.ref && (D.ref.dead || D.ref.parked))) {
          // (one at the end of a tunnel reverses, its nose now pointing back out along the tunnel: a spirillum swims either way)
          if (D.tun && away) { const A = q.A, ta = D.tun.a + A.ang; m.a = Math.atan2(-Math.sin(ta), -Math.cos(ta)); m.flee = Math.max(m.flee || 0, 0.8); }
          m.drill = null; continue;
        }
        // held on the surface where it latched (for the pack: on its Bdellovibrio), nose in, turning hard
        const bx = D.ref ? D.ref.x : cx, by = D.ref ? D.ref.y : cy;
        if (q.kind === 'amoeba') {
          // (on its surface as it flows, or at the end of its tunnel as that deepens: kept just outside it, in its frame)
          if (D.tun && D.tun.through) { m.drill = null; continue; } // (bored right through: on through the passage)
          if (D.tun) {
            // in a tunnel: at its end (on its rounded end, as far across as it latched), boring on as it deepens;
            // the rest queued up behind, a row every 1.3 µm, pushing (D.rank: tunnels())
            const T = D.tun, ux = Math.cos(T.a), uy = Math.sin(T.a), per = Math.max(1, Math.floor((2 * T.w) / 0.9)), row = Math.floor((D.rank || 0) / per);
            const v = row ? ((((D.rank || 0) % per) + 0.5) / per - 0.5) * 2 * T.w * 0.8 : Math.max(-T.w * 0.85, Math.min(T.w * 0.85, D.v));
            const u = Math.max(0.3 - row * 0.2, T.len + (row ? 0 : Math.sqrt(Math.max(0, T.w * T.w - v * v))) - 0.35 - row * 1.3);
            D.lx = T.x + ux * u - uy * v; D.ly = T.y + uy * u + ux * v;
          } else {
            LOC.x = D.lx; LOC.y = D.ly;
            if (world.amoebaSnap(LOC, t, 0.35)) { D.lx = LOC.x; D.ly = LOC.y; }
          }
          world.amoebaWorld(D.lx, D.ly, WP); m.x = WP.x; m.y = WP.y;
          const N = world.amoebaNormal(D.lx, D.ly, t, NRM), A = q.A;
          D.a = Math.atan2(-(Math.sin(A.ang) * N.x + Math.cos(A.ang) * N.y), -(Math.cos(A.ang) * N.x - Math.sin(A.ang) * N.y));
        } else if (q.kind === 'stentor') {
          // (on its body or disc as it turns, stretches and recoils: in its own frame from the holdfast)
          const B = q.B, c = Math.cos(B.ang), s = Math.sin(B.ang), u = D.fu * B.len;
          m.x = B.foot.x + c * u - s * D.lv; m.y = B.foot.y + s * u + c * D.lv;
          D.a = Math.atan2(-(m.y - (B.foot.y + s * u)), -(m.x - (B.foot.x + c * u))) || D.a;
        } else { m.x = bx + D.ox; m.y = by + D.oy; }
        m.a += Math.atan2(Math.sin(D.a - m.a), Math.cos(D.a - m.a)) * Math.min(1, dt * 10);
        m.bodyPhase += dt * 22; m.flPhase += dt * 44; m.vx = m.vy = 0; m.sp = 0;
        if (D.burst > 0) D.burst -= dt;
        n++;
        continue;
      }
      if (D || m.drift || away || n >= q.cap) continue;
      if (Math.abs(m.x - cx) > q.zone + 40 || Math.abs(m.y - cy) > q.zone + 40) continue;
      const s = surface(q, m.x, m.y, t);
      if (!s || s.d > (s.ref ? FIGHT.latch * 1.8 : FIGHT.latch)) continue; // (a Bdellovibrio is grabbed from a little further: it darts)
      if (s.ref && (s.ref.drillN || 0) >= GATES.bdello.cap) continue;
      // latch: just outside the surface, nose in
      const out = Math.max(0.3, Math.min(0.8, s.d));
      const px = m.x - s.nx * (s.d - out), py = m.y - s.ny * (s.d - out);
      const nd = { q, ref: s.ref, ox: px - (s.ref ? s.ref.x : cx), oy: py - (s.ref ? s.ref.y : cy), a: Math.atan2(-s.ny, -s.nx), t: 0 };
      if (q.kind === 'amoeba') latchTunnel(q, nd, px, py, t);
      if (q.kind === 'stentor') { const B = q.B, c = Math.cos(B.ang), sn = Math.sin(B.ang), dx = px - B.foot.x, dy = py - B.foot.y; nd.fu = (dx * c + dy * sn) / B.len; nd.lv = -dx * sn + dy * c; }
      m.drill = nd; m.x = px; m.y = py;
      n++;
    }
    return n;
  }

  // ---- the capture zones: the chance a member at (x, y) is taken when the bite lands (0 outside) ----
  /**
   * peritrich  the feeding vortex in front of its mouth: a cone ±70° round the funnel's axis, `reach` µm
   *            deep, near-certain at the mouth and fading out to its edge (the bell's back is safe)
   * amoeba     the bulging lobe's reach: everything its edge closes over, from inside it out to `reach`
   *            µm in front, more the nearer the edge
   * Stentor    the funnel's suction: inside its oral disc's rim all of it, and out to `reach` µm past
   *            the rim less the further out
   */
  function zone(q, x, y, t) {
    if (q.kind === 'grazer') {
      const P = q.g.pose, M = P.mouth, dx = x - M.x, dy = y - M.y, d = Math.hypot(dx, dy);
      if (d > q.reach) return 0;
      if (d < 4) return 0.95;
      const cos = (dx * P.up.x + dy * P.up.y) / d, cone = Math.max(0, Math.min(1, (cos - 0.34) / 0.3));
      return cone * Math.min(0.95, 0.2 + 1.1 * (1 - d / q.reach));
    }
    if (q.kind === 'amoeba') {
      // only inside the loop its pseudopods are closing (none: nothing is in danger)
      // (or inside a tunnel that is pinching shut)
      const W = q.A.wrap;
      if (W && !W.done && Math.hypot(x - W.x, y - W.y) < W.R) return 0.95;
      return pinchingAt(q, x, y) ? PINCH.chance : 0;
    }
    if (q.kind === 'stentor') return q.B.cone(x, y); // (its feeding cone: stentor.js cone)
    return 0;
  }
  /** Where its bite's victims are drawn to (a mouth, or into the amoeba). */
  const mouthOf = (q) => (q.kind === 'grazer' ? q.g.pose.mouth : q.kind === 'stentor' ? q.B.mouth : { x: q.A.x + Math.sin(q.A.ang) * 8, y: q.A.y - Math.cos(q.A.ang) * 8 });

  // ---- the bite: a tell, then members taken ----
  /** The bite lands: every member of the flocks near q in its zone is taken with its chance there (zone). */
  function take(q, t) {
    const to = mouthOf(q), kind = q.kind === 'grazer' ? 'grazer' : q.kind, hit = [];
    eachFlock(q, (C) => { for (const m of C.members) { if (m.dying) continue; const p = zone(q, m.x, m.y, t); if (p > 0 && world.r() < p) hit.push(m); } });
    // (the amoeba's loop closes round at most WRAP.max: those nearest its middle; the rest slip out as it closes)
    const W = q.kind === 'amoeba' && q.A.wrap;
    if (W && hit.length > WRAP.max) { hit.sort((a, b) => Math.hypot(a.x - W.x, a.y - W.y) - Math.hypot(b.x - W.x, b.y - W.y)); hit.length = WRAP.max; }
    for (const m of hit) { m.drill = null; coll.lose(m, kind, to); }
    q.eaten += hit.length;
    if (hit.length) q.swallowT = SWALLOW.t;
    return hit.length;
  }
  function attack(q, dt, t, active) {
    const A = q.atk;
    if (!active) { A.st = 'idle'; A.t = 0; A.next = Math.max(A.next, 1.2); return; }
    // (round cells in a tunnel or a dent its loop closes faster: WRAP.fast)
    A.t += dt * (A.st === 'tell' && q.A && q.A.wrap && q.A.wrap.fast ? WRAP.fast : 1);
    if (A.st === 'idle') {
      if (A.t >= A.next) {
        // the amoeba aims its pseudopods round the cells at its front; none there, it waits
        if (q.kind === 'amoeba' && !aimWrap(q, t)) { A.t = A.next - 0.5; return; }
        A.st = 'tell'; A.t = 0; q.atk0 = t; hooks.onTell?.(q);
      }
      return;
    }
    if (A.st === 'tell') {
      if (q.kind === 'amoeba' && q.A.wrap) q.A.wrap.p = Math.min(1, A.t / q.tell);
      warnZone(q, t);
      if (A.t >= q.tell) { A.st = 'bite'; A.t = 0; q.bites++; bite(q, t); if (q.A && q.A.wrap) q.A.wrap.done = true; }
      return;
    }
    if (A.st === 'bite') { if (A.t >= 0.6) { A.st = 'idle'; A.t = 0; A.next = q.every - q.tell - 0.6; if (q.A) q.A.wrap = null; } }
  }
  /**
   * The amoeba's attack (the owner, 2026-11-04: "The amoeba should have to surround us with a pseudopod to eat
   * us"): it picks the cells crowding its front and sends two pseudopods out from its edge either side of them,
   * flowing out and curving round over its tell (WRAP), to close the loop at the bite: only the cells inside
   * the loop then are engulfed; pull out of the loop first and you are safe. Returns false with nobody near.
   */
  function aimWrap(q, t) {
    const near = [];
    eachFlock(q, (C) => { for (const m of C.members) { if (m.dying) continue; const d = world.insideAmoeba(m.x, m.y, t); if (d > -WRAP.near) near.push(m); } });
    if (!near.length) { q.A.wrap = null; return false; }
    let x = 0, y = 0;
    for (const m of near) { x += m.x; y += m.y; }
    x /= near.length; y /= near.length;
    let s2 = 0;
    for (const m of near) s2 += (m.x - x) ** 2 + (m.y - y) ** 2;
    const R = Math.max(WRAP.Rmin, Math.min(WRAP.Rmax, Math.sqrt(s2 / near.length) * 1.3 + 4));
    const sf = surface(q, x, y, t), nx = sf ? sf.nx : -Math.sin(q.A.ang), ny = sf ? sf.ny : Math.cos(q.A.ang);
    // (the loop's middle at the crowd, a touch out from the edge, so it takes in the cells pressed to it)
    // (cells burrowed in, deeper than WRAP.dent µm under its surface as it was: a tunnel or a dent: easier to trap)
    const fast = near.some((m) => world.insideAmoeba(m.x, m.y, t, false) > WRAP.dent);
    q.A.wrap = { x: x + nx * R * 0.1, y: y + ny * R * 0.1, R, nx, ny, p: 0, t0: t, done: false, fast };
    return true;
  }
  /** While it winds up: every member in its zone is warned (collective.js lose records whether a loss was). */
  function warnZone(q, t) {
    const kind = q.kind === 'grazer' ? 'grazer' : q.kind;
    eachFlock(q, (C) => { for (const m of C.members) if (!m.dying && zone(q, m.x, m.y, t) > 0 && !(m.warned && m.warned.kind === kind && m.warned.t >= q.atk0)) m.warned = { kind, t }; });
  }
  function bite(q, t) {
    // the peritrich's surge sucks in its vortex; the amoeba's lobe closes over its reach
    const n = take(q, t); // (taken first: an optional hook call would skip its arguments)
    hooks.onBite?.(q, n);
  }
  /**
   * Stentor's suction, every step (no bite: it never stops): each member in its cone is taken with a chance
   * per second of SUCK.rate × (its depth in the cone)², a few at a time (at most SUCK.max a second), so a
   * swarm that stays in front of it is sucked in little by little. Returns how many were taken.
   */
  function suck(q, dt) {
    const B = q.B, hit = [];
    q.suckBudget = Math.min(SUCK.max, (q.suckBudget || 0) + SUCK.max * dt);
    eachFlock(q, (C) => {
      for (const m of C.members) {
        if (m.dying) continue;
        const k = B.cone(m.x, m.y);
        // in its cone: warned first (the cone shows, the warning line says so); taken only after SUCK.grace s in it
        if (k <= 0) { if (m.warned && m.warned.kind === 'stentor') m.warned = null; continue; }
        if (!m.warned || m.warned.kind !== 'stentor') { m.warned = { kind: 'stentor', t: world.time || 0 }; continue; }
        if ((world.time || 0) - m.warned.t < SUCK.grace) continue;
        if (world.r() < SUCK.rate * k * k * dt) hit.push(m);
      }
    });
    let n = 0;
    for (const m of hit) { if (q.suckBudget < 1) break; q.suckBudget--; m.drill = null; coll.lose(m, 'stentor', B.mouth); n++; }
    q.eaten += n;
    if (n) hooks.onBite?.(q, n);
    return n;
  }

  // ---- the amoeba's tunnels (TUN, PINCH) ----
  /** How far along tunnel T a point (lx, ly) of the amoeba's frame is, when it is inside the tunnel past its mouth (else -1). */
  function inTunnel(T, lx, ly, past = 2.5, slack = 1.2) {
    const ux = Math.cos(T.a), uy = Math.sin(T.a), px = lx - T.x, py = ly - T.y, u = px * ux + py * uy;
    if (u < past || u > T.len + T.w) return -1;
    const s = Math.min(T.len, u);
    return Math.hypot(px - ux * s, py - uy * s) < T.w + slack ? u : -1;
  }
  /** Is (x, y) inside a tunnel that is pinching shut? */
  function pinchingAt(q, x, y) {
    const A = q.A;
    if (!A.tunnels.length) return false;
    world.amoebaLocal(x, y, LOC);
    for (const T of A.tunnels) if (T.pinch && inTunnel(T, LOC.x, LOC.y) >= 0) return true;
    return false;
  }
  /** A member latching on at (px, py): into the tunnel at that spot (one within TUN.join µm of its mouth, or a new one). */
  function latchTunnel(q, nd, px, py, t) {
    const A = q.A, L = world.amoebaLocal(px, py, LOC);
    let best = null, bd = TUN.join;
    for (const T of A.tunnels) {
      if (T.through) continue;
      const d = Math.hypot(L.x - T.x, L.y - T.y);
      if (d < bd + T.w) { bd = d - T.w; best = T; }
    }
    if (!best && A.tunnels.length < TUN.max) {
      // a new one: its mouth here, going straight in (against the surface's normal)
      const N = world.amoebaNormal(L.x, L.y, t, NRM);
      best = { x: L.x, y: L.y, a: Math.atan2(-N.y, -N.x), len: 0.3, w: TUN.w0, idle: 0, occ: 0, pinch: null, cool: 0, through: false, tip: 0, n: 0, t0: t };
      A.tunnels.push(best);
    }
    let lx = L.x, ly = L.y;
    if (best) {
      // (in at its mouth: within its width of its axis, so it slides down to the end as the tunnel deepens)
      const ux = Math.cos(best.a), uy = Math.sin(best.a), px2 = lx - best.x, py2 = ly - best.y, u = Math.max(0, px2 * ux + py2 * uy), v = -px2 * uy + py2 * ux;
      const vv = Math.max(-best.w * 0.6, Math.min(best.w * 0.6, v));
      lx = best.x + ux * u - uy * vv; ly = best.y + uy * u + ux * vv; nd.v = vv;
    }
    nd.lx = lx; nd.ly = ly; nd.tun = best;
  }
  /** X on the amoeba: every tunnel being drilled deepens with a jolt. */
  function boreBurst(q, C) {
    for (const T of q.A.tunnels) { let k = 0; for (const m of C.members) if (m.drill && m.drill.tun === T) k++; if (k && !T.through) T.len += TUN.volley * Math.sqrt(k); }
  }
  /**
   * Every step: each tunnel deepens with the members drilling at its end, widens with more of them, and
   * closes when left alone; one that reaches the far side is a passage through; one with your cells inside
   * long enough pinches shut (PINCH: a tell, then whoever is still inside is engulfed).
   */
  function tunnels(q, dt, t, dps) {
    const A = q.A, list2 = A.tunnels;
    if (!list2.length) return;
    for (const T of list2) { T.n = 0; T.tip = 0; T.occ = 0; }
    // the drillers of each tunnel, and those at its end
    for (const C of coll.list) for (const m of C.members) {
      const D = m.drill;
      if (!D || D.q !== q || !D.tun) continue;
      // (every one of them bores: those behind push the ones at its end; D.rank: its place in the queue)
      const T = D.tun; D.rank = T.n++; T.tip++;
    }
    // the cells inside each (past its mouth), drilling or not
    eachFlock(q, (C) => {
      for (const m of C.members) {
        if (m.dying) continue;
        world.amoebaLocal(m.x, m.y, LOC);
        for (const T of list2) if (T.len > 2.5 && inTunnel(T, LOC.x, LOC.y) >= 0) { T.occ++; break; }
      }
    });
    for (let i = list2.length - 1; i >= 0; i--) {
      const T = list2[i];
      T.cool = Math.max(0, T.cool - dt); T.shut = Math.max(0, (T.shut || 0) - dt);
      if (T.tip && !T.through && !T.pinch) {
        T.idle = 0;
        T.len += (TUN.rate * dps * Math.pow(T.tip, 0.6) / (1 + T.len / TUN.soft)) * dt;
      } else if (T.n) T.idle = 0;
      else T.idle += dt;
      // (wider with more drillers; narrowing slowly again once they are gone)
      const wT = T.n ? Math.min(TUN.wMax, TUN.w0 + TUN.wk * Math.sqrt(T.n)) : TUN.w0 * 0.8;
      T.w += (wT - T.w) * Math.min(1, dt * (T.n ? 0.8 : 0.2));
      // through: its end is out past the far side of the body (a passage: its drillers swim on, it stays open a while)
      if (!T.through && T.len > 3) {
        const ex = T.x + Math.cos(T.a) * T.len, ey = T.y + Math.sin(T.a) * T.len;
        if (world.amoebaAt(ex, ey, t, false) < -0.5) { T.through = true; T.idle = 0; hooks.onThrough?.(q, T); }
      }
      // the pinch: its mouth narrows over its tell, then closes on whoever is still inside
      if (T.pinch) {
        T.pinch.t += dt;
        warnTunnel(q, T, t);
        if (T.pinch.t >= T.pinch.tell) { pinchShut(q, T, t); }
      } else if (T.occ && !T.through && T.len >= PINCH.minLen && T.cool <= 0) {
        T.occT = (T.occT || 0) + dt;
        if (T.occT >= PINCH.wait) { T.pinch = { t: 0, tell: PINCH.tell, t0: t }; T.occT = 0; warnTunnel(q, T, t); hooks.onTell?.(q, 'tunnel'); }
      } else T.occT = 0;
      // left alone it closes: the cytoplasm flows back in (a passage through stays open longer)
      if (T.idle > TUN.hold * (T.through ? 3 : 1)) T.len -= TUN.close * dt;
      if (T.len <= 0) {
        list2.splice(i, 1);
        for (const C of coll.list) for (const m of C.members) if (m.drill && m.drill.tun === T) m.drill.tun = null;
      }
    }
  }
  /** Every member inside a pinching tunnel is warned (the tell), once per pinch. */
  function warnTunnel(q, T, t) {
    eachFlock(q, (C) => {
      for (const m of C.members) {
        if (m.dying || (m.warned && m.warned.kind === 'amoeba' && m.warned.t >= T.pinch.t0)) continue;
        world.amoebaLocal(m.x, m.y, LOC);
        if (inTunnel(T, LOC.x, LOC.y) >= 0) m.warned = { kind: 'amoeba', t: world.time ?? t };
      }
    });
  }
  /** The pinch closes: whoever is still inside the tunnel is engulfed where it is (a food vacuole), and half the tunnel fills in. */
  function pinchShut(q, T, t) {
    const hit = [], ux = Math.cos(T.a), uy = Math.sin(T.a);
    eachFlock(q, (C) => {
      for (const m of C.members) {
        if (m.dying) continue;
        world.amoebaLocal(m.x, m.y, LOC);
        // (the deeper in, the surer: near its mouth a cell is squeezed out as often as not)
        // (only those it warned, at least half its tell ago: one that swam in at the last moment is squeezed out)
        const u = inTunnel(T, LOC.x, LOC.y);
        if (u < 0 || !m.warned || m.warned.kind !== 'amoeba' || (world.time ?? t) - m.warned.t < PINCH.tell * 0.5) continue;
        if (world.r() < PINCH.chance * Math.min(1, 0.3 + u / 12)) hit.push(m);
      }
    });
    // (a tunnel holds only so many: the PINCH.max deepest are engulfed, the rest squeezed back out)
    if (hit.length > PINCH.max) { const ua = (m) => { world.amoebaLocal(m.x, m.y, LOC); return inTunnel(T, LOC.x, LOC.y); }; hit.sort((a, b) => ua(b) - ua(a)); hit.length = PINCH.max; }
    for (const m of hit) {
      world.amoebaLocal(m.x, m.y, LOC);
      const to = world.amoebaWorld(LOC.x + ux * 4, LOC.y + uy * 4, { x: 0, y: 0 });
      m.drill = null; coll.lose(m, 'amoeba', to);
    }
    q.eaten += hit.length; q.bites++;
    if (hit.length) q.swallowT = SWALLOW.t;
    T.len *= PINCH.keep; T.pinch = null; T.cool = PINCH.cool; T.shut = 0.6;
    for (const C of coll.list) for (const m of C.members) if (m.drill && m.drill.tun === T) m.drill = null;
    hooks.onBite?.(q, hit.length, 'tunnel');
  }

  function update(dt, t, roster) {
    // drills that no longer hold: the enemy beaten, gone or asleep, or the swarm gone on without them
    for (const C of coll.list) {
      const leash = C.R0 * 1.2 + FIGHT.leash;
      for (const m of C.members) {
        const D = m.drill;
        if (D && (D.q.beaten || !isLive(D.q) || Math.hypot(m.x - C.cx, m.y - C.cy) > leash)) m.drill = null;
      }
    }
    for (const c of pack) c.drillN = 0;
    for (const C of coll.list) for (const m of C.members) if (m.drill && m.drill.ref) m.drill.ref.drillN = (m.drill.ref.drillN || 0) + 1;
    for (const q of list) {
      q.hitT = Math.max(0, (q.hitT || 0) - dt);
      if (q.kind === 'stentor' ? !q.B.placed : !q.placed) { q.engaged = false; continue; } // nothing until the director places it
      q.engaged = !q.beaten && engagedBy(q, roster);
      if (q.beaten) continue;
      const live = isLive(q);
      // the flocks fighting it: their members latch on and drill
      let drills = 0, lone = 0, army = 0;
      if (live) eachFlock(q, (C) => {
        drills += drill(q, C, dt, t); army = Math.max(army, C.army);
        for (const P of C.players) if (P.S.alive && touching(q, P.S.x, P.S.y, t)) lone++;
      });
      q.drills = drills; q.contact = drills + lone;
      const dps = drillRate(army);
      if (q.kind === 'bdello') {
        // each Bdellovibrio has its own health: the members drilling into it wear it down (held still while they do)
        let hp = 0;
        for (const c of pack) {
          if (c.dead) continue;
          const k = c.drillN || 0;
          c.drillLatch = k > 0 && !c.latch;
          c.hp = Math.min(FIGHT.bdelloHp, c.hp + (k ? 0 : FIGHT.bdelloRegen) * dt - k * dps * FIGHT.bdelloK * dt);
          c.hit = k;
          if (c.hp <= 0) killBdello(c, q); else hp += c.hp;
        }
        q.hp = hp;
        if (pack.every((c) => c.dead)) beat(q);
        continue;
      }
      // the bite's rhythm runs while a swarm is at it (Stentor's is its pull: main.js)
      if (q.kind !== 'stentor') attack(q, dt, t, live && q.engaged && coll.list.some((C) => C.members.length && C.players.length));
      if (q.kind === 'grazer') driveGrazer(q, dt);
      if (q.kind === 'stentor' && live) suck(q, dt);
      // swallowing (just after a bite took someone): it cannot grow back, and the drills bite harder
      q.swallowT = Math.max(0, (q.swallowT || 0) - dt);
      const sw = q.swallowT > 0;
      if (q.kind === 'amoeba') {
        const A = q.A;
        A.surge += (0 - A.surge) * Math.min(1, dt * 4);
        if (live) tunnels(q, dt, t, dps);
        // its irritation: the drills' pain (more at the end of a deep tunnel), ebbing all the time (IRR)
        // (left alone over IRR.calm s, it calms three times as fast)
        q.idleT = q.contact ? 0 : (q.idleT || 0) + dt;
        q.irr = Math.max(0, q.irr - (q.irr / (q.idleT > IRR.calm ? IRR.tau / 3 : IRR.tau)) * dt);
        // (the drills at one spot share it: each tunnel hurts as its drillers^IRR.share, more the deeper it goes)
        let pain = 0, loose = 0;
        if (q.contact) {
          for (const T of A.tunnels) if (T.n) pain += Math.pow(T.n, IRR.share) * (1 + T.len / IRR.deep);
          for (const C of coll.list) for (const m of C.members) if (m.drill && m.drill.q === q && !m.drill.tun) loose++;
          pain += Math.pow(loose, IRR.share) + (q.contact - q.drills);
        }
        pain *= dps * (sw ? SWALLOW.k : 1) * dt;
        // (however hard it is drilled, it gets no more irritated than IRR.rate a second: it is huge, it takes a while)
        q.irrBudget = Math.min(IRR.rate * 0.5, (q.irrBudget ?? IRR.rate * 0.5) + IRR.rate * dt);
        pain = Math.min(pain, q.irrBudget * IRR.k);
        if (pain > 0) { q.irrBudget -= pain / IRR.k; irritate(q, pain); }
        // it shows it: its body recoils from the drills, and flinches at a burst (draw.js blanches round the drills)
        A.flinch = Math.max(0, A.flinch - dt * 1.5);
        A.recoil += (10 * q.irr + 5 * A.flinch - A.recoil) * Math.min(1, dt * 3);
        continue;
      }
      const dmg = q.contact * dps * (sw ? SWALLOW.k : 1) * dt;
      q.hp = Math.min(q.max, q.hp + (sw ? 0 : q.regen) * dt - dmg);
      // Stentor flinches from the drills: knocked away from where they are (stentor.js knock)
      if (q.kind === 'stentor' && dmg > 0) { const c0 = drillCentre(q); if (c0) q.B.knock(c0.x, c0.y, (dmg / q.max) * KNOCK.drill); }
      if (q.hp <= 0) beat(q);
    }
    // the damage state the enemy shows (draw.js): its health share, and a flash while it is hit
    for (const q of list) {
      const o = q.kind === 'grazer' ? q.g : q.kind === 'amoeba' ? q.A : q.kind === 'stentor' ? q.B : null;
      if (!o) continue;
      o.hpK = q.kind === 'amoeba' ? 1 : Math.max(0, q.hp / q.max); o.irrK = q.irr; o.hit = q.hitT > 0 || (q.drills > 0 && (t * 7) % 1 < 0.25);
      // its capture zone shows while it winds up (draw.js): 0..1 through the tell, 1 in the bite
      o.tellK = q.beaten || !q.engaged ? 0 : q.kind === 'stentor' ? (q.B.awake ? 0.45 * q.B.flowK : 0) : q.atk.st === 'tell' ? q.atk.t / q.tell : q.atk.st === 'bite' ? 1 : 0;
      o.zoneR = q.reach; o.swallow = q.swallowT > 0;
    }
  }
  /** Where the members drilling into q are, on average (or null). */
  function drillCentre(q) {
    let x = 0, y = 0, n = 0;
    for (const C of coll.list) for (const m of C.members) if (m.drill && m.drill.q === q) { x += m.x; y += m.y; n++; }
    return n ? { x: x / n, y: y / n, n } : null;
  }
  /** The peritrich fighting a swarm: its cilia race and its current swells in the tell, then surges (the bite); its funnel tips toward the drills. */
  function driveGrazer(q, dt) {
    const g = q.g, A = q.atk;
    g.battle = q.engaged && coll.list.some((C) => C.members.length && C.players.length);
    if (!g.battle) return;
    g.contract = 0; g.ext = Math.min(1, g.ext + dt);
    const want = A.st === 'tell' ? 1 + 1.6 * (A.t / q.tell) : A.st === 'bite' ? 3.4 : 1;
    g.pull = (g.pull || 1) + (want - (g.pull || 1)) * Math.min(1, dt * (A.st === 'bite' ? 14 : 5));
    g.fightState = A.st === 'tell' ? 'windup' : A.st === 'bite' ? 'strike' : 'stalk';
  }

  /** A member eaten by an enemy poisons it: violacein-like toxins (atlas C28). More toxic the bigger the army. */
  function poison(kind, m, C) {
    const q = kind === 'grazer' ? byId.grazer1 : kind === 'amoeba' ? byId.amoeba : kind === 'stentor' ? byId.stentor : null;
    if (q) hurt(q, FIGHT.poison); void C;
  }

  /** X: a burst from every drilling member (and the lone cells touching an enemy). */
  function volley(C, t) {
    let hits = 0;
    for (const q of list) {
      if (q.beaten || !isLive(q)) continue;
      let k = 0;
      for (const m of C.members) if (m.drill && m.drill.q === q) { k++; m.drill.burst = 0.3; if (m.drill.ref) { m.drill.ref.hp -= FIGHT.volley * 2; if (m.drill.ref.hp <= 0 && !m.drill.ref.dead) killBdello(m.drill.ref, q); } }
      for (const P of C.players) if (P.S.alive && touching(q, P.S.x, P.S.y, t)) k++;
      if (!k) continue;
      if (q.kind === 'bdello') { q.hp = pack.reduce((a, c) => a + (c.dead ? 0 : Math.max(0, c.hp)), 0); if (pack.every((c) => c.dead)) beat(q); }
      // (the amoeba: the burst shares out like its drills, IRR.share)
      else { hurt(q, q.kind === 'amoeba' ? 2 * FIGHT.volley * Math.pow(k, IRR.share) : k * FIGHT.volley); if (q.kind === 'amoeba') boreBurst(q, C); if (q.kind === 'stentor') { const c0 = drillCentre(q); if (c0) q.B.knock(c0.x, c0.y, k * KNOCK.volley); } }
      hits += k;
    }
    return hits;
  }

  /** Y's toxin burst: a big hit on every enemy it reaches (main.js toxinBurst does the rest). */
  function burstHit(b) {
    const hit = [];
    for (const q of list) {
      if (q.beaten || !(q.kind === 'stentor' ? q.B.placed : q.placed)) continue;
      if (q.kind === 'bdello') {
        for (const c of pack) if (!c.dead && Math.hypot(c.x - b.x, c.y - b.y) < b.R) { killBdello(c, q); hit.push(q.name); }
        if (pack.every((c) => c.dead)) beat(q);
        continue;
      }
      centre(q, at);
      const size = q.kind === 'grazer' ? q.g.R : q.kind === 'amoeba' ? 30 : q.B.discR;
      if (Math.hypot(at.x - b.x, at.y - b.y) < b.R + size) { hurt(q, q.kind === 'amoeba' ? IRR.toxin * IRR.k : Math.max(FIGHT.burstMin, q.max * FIGHT.burst), false); hit.push(q.name); }
    }
    return hit;
  }

  /** The enemy to show a gauge for: the nearest engaged one to (x, y). */
  function nearest(x, y) {
    let best = null, bd = Infinity;
    for (const q of list) {
      if (!q.engaged) continue;
      centre(q, at);
      const d = Math.hypot(at.x - x, at.y - y);
      if (d < bd) { bd = d; best = q; }
    }
    return best;
  }

  function reset() {
    for (const q of list) { q.hp = q.max; q.beaten = false; q.contact = 0; q.drills = 0; q.engaged = false; q.atk = { st: 'idle', t: 0, next: 1.5 }; q.bites = 0; q.eaten = 0; q.swallowT = 0; }
    for (const g of world.grazers) { g.beaten = false; g.contract = 0; g.ext = 1; g.fade = 0; g.battle = false; g.pull = 1; }
    const A = world.amoeba; A.beaten = false; A.routed = false; A.x = A.home.x; A.y = A.home.y; A.surge = 0; A.fade = 0; A.irr = 0; A.recoil = 0; A.flinch = 0; A.tunnels.length = 0; A.wrap = null;
    for (const q of list) { q.irr = 0; q.irrBudget = undefined; }
    stentor.beaten = false;
    for (const c of pack) { c.dead = 0; c.hp = FIGHT.bdelloHp; c.hidden = 0; c.latch = null; c.drillLatch = false; c.x = c.home.x + (Math.random() - 0.5) * 30; c.y = c.home.y + (Math.random() - 0.5) * 30; }
    for (const C of coll.list) for (const m of C.members) m.drill = null;
  }

  return { list, byId, FIGHT, GATES, SWALLOW, WRAP, IRR, TUN, PINCH, drillRate, inTunnel, zone, suck, drillCentre,
    /** Tests: the bite lands now (its zone takes what is in it). Returns how many were taken. */
    biteNow: (q) => { q.bites++; return take(q, world.time || 0); }, placeGate, shift, park, update, volley, burstHit, nearest, reset, hurt, poison, centre: (q) => centre(q, { x: 0, y: 0 }), touching, surface,
    report: () => list.map((q) => ({ id: q.id, hp: +q.hp.toFixed(1), irr: +q.irr.toFixed(2), max: q.max, beaten: q.beaten, engaged: q.engaged, contact: q.contact, drills: q.drills, attack: q.atk.st, bites: q.bites, eaten: q.eaten })) };
}
