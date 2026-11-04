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
//                    shows it too (the bell shrinks and darkens, the amoeba's edge thins, Stentor pales)
//   beaten           it dies, dissolves or flees, and the way is open: the peritrich coils and its
//                    bell dissolves, the pack is killed off, the amoeba withdraws into the sediment and
//                    fades, Stentor contracts and stays shut. It stays beaten. No timers anywhere.
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
  poison: 1.0,    // a member an enemy eats poisons it (+1 per army level)
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
  amoeba: { max: 1500, regen: 4, every: 5.0, tell: 2.0, reach: 8, cap: 300 },
  stentor: { max: 3000, regen: 3, reach: 14, cap: 520 }, // (its rhythm is the pull: main.js runBoss, its tell 2 s)
};
/** After a bite that took someone it swallows: SWALLOW.t s with no regrowth and drills biting SWALLOW.k times as hard (the moment to go back in). */
export const SWALLOW = { t: 1.6, k: 1.5 };

export function createGuards(world, coll, stentor, hooks = {}) {
  const [g1] = world.grazers;
  const pack = world.cells.filter((c) => c.kind === 'bdello' && c.home);
  const G = (o) => ({ hp: o.max, beaten: false, contact: 0, drills: 0, engaged: false, atk: { st: 'idle', t: 0, next: 2.5 }, bites: 0, eaten: 0, ...o });
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
  const SURF = { d: 0, nx: 0, ny: 0, ref: null };
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
      const A = q.A, c = Math.cos(A.ang), s = Math.sin(A.ang);
      const dx = x - A.x, dy = y - A.y, lx = dx * c + dy * s;
      if (Math.abs(lx) > A.width * 0.45) return null;
      const depth = world.insideAmoeba(x, y, t);
      if (depth === -1 && (-dx * s + dy * c) < -A.depth) return null;
      SURF.d = -depth; SURF.nx = -s; SURF.ny = c; SURF.ref = null; // (its normal faces whoever comes)
      if (SURF.d > 25) return null;
      return SURF;
    }
    if (q.kind === 'stentor') {
      const B = q.B;
      if (Math.abs(x - B.mouth.x) > B.discR + 40 || Math.abs(y - B.mouth.y) > B.discR + 40) return null;
      const D = B.disc(x, y), dx = x - B.mouth.x, dy = y - B.mouth.y, d = Math.hypot(dx, dy) || 1;
      SURF.d = D.out; SURF.nx = dx / d; SURF.ny = dy / d; SURF.ref = null;
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
    q.beaten = true; q.hp = 0; q.contact = 0; q.drills = 0; q.atk.st = 'idle';
    if (q.kind === 'grazer') { q.g.beaten = true; q.g.feeding = false; q.g.battle = false; q.g.pull = 1; }
    if (q.kind === 'amoeba') { q.A.beaten = true; q.A.surge = 0; }
    if (q.kind === 'stentor') q.B.beaten = true;
    if (q.kind === 'bdello') for (const c of pack) if (!c.dead) killBdello(c, q);
    releaseAll(q);
    hooks.onBeaten?.(q);
  }
  function hurt(q, amount) {
    if (q.beaten || amount <= 0) return;
    q.hp -= amount;
    q.hitT = 0.25;
    if (q.hp <= 0) beat(q);
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
    const toE = Math.hypot(cx - C.cx, cy - C.cy) || 1;
    const away = C.intent.m > 0.5 && (C.intent.x * (cx - C.cx) + C.intent.y * (cy - C.cy)) / toE < -0.5;
    for (const m of C.members) {
      if (m.dying || m.latched) { if (m.drill) m.drill = null; continue; }
      // pulling back: the members in its reach dart out at once (collective.js m.flee)
      if (away && zone(q, m.x, m.y, t) > 0) m.flee = 0.5;
      const D = m.drill;
      if (D && D.q === q) {
        // let go: steered away and left behind, drawn off by a stranger, or its Bdellovibrio gone
        if (away || m.drift || Math.hypot(m.x - C.cx, m.y - C.cy) > leash || (D.ref && (D.ref.dead || D.ref.parked))) { m.drill = null; continue; }
        // held on the surface where it latched (for the pack: on its Bdellovibrio), nose in, turning hard
        const bx = D.ref ? D.ref.x : cx, by = D.ref ? D.ref.y : cy;
        if (q.kind === 'amoeba') {
          // (on the edge as it moves: projected back onto it, just outside)
          const A = q.A, c = Math.cos(A.ang), s = Math.sin(A.ang);
          const lx = D.lx, depth = world.insideAmoeba(A.x + c * lx - s * D.ly, A.y + s * lx + c * D.ly, t);
          if (depth !== -1) D.ly += depth + 0.35;
          m.x = A.x + c * lx - s * D.ly; m.y = A.y + s * lx + c * D.ly;
        } else { m.x = bx + D.ox; m.y = by + D.oy; }
        m.a += Math.atan2(Math.sin(D.a - m.a), Math.cos(D.a - m.a)) * Math.min(1, dt * 10);
        m.bodyPhase += dt * 22; m.flPhase += dt * 44; m.vx = m.vy = 0; m.sp = 0;
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
      if (q.kind === 'amoeba') { const A = q.A, c = Math.cos(A.ang), sn = Math.sin(A.ang), dx = px - A.x, dy = py - A.y; nd.lx = dx * c + dy * sn; nd.ly = -dx * sn + dy * c; }
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
      const A = q.A, c = Math.cos(A.ang), sn = Math.sin(A.ang), dx = x - A.x, dy = y - A.y;
      if (Math.abs(dx * c + dy * sn) > A.width * 0.45) return 0;
      const ly = -dx * sn + dy * c;
      if (ly < -A.depth) return 0;
      const depth = world.insideAmoeba(x, y, t); // (inside positive; its surge is already in it)
      return depth >= 0 ? 0.95 : Math.max(0, 0.95 * (1 + depth / q.reach));
    }
    if (q.kind === 'stentor') {
      const B = q.B;
      if (Math.abs(x - B.mouth.x) > B.discR + q.reach + 5 || Math.abs(y - B.mouth.y) > B.discR + q.reach + 5) return 0;
      const D = B.disc(x, y);
      return D.rho < 1 ? 0.95 : Math.max(0, 0.85 * (1 - D.out / q.reach));
    }
    return 0;
  }
  /** Where its bite's victims are drawn to (a mouth, or into the amoeba). */
  const mouthOf = (q) => (q.kind === 'grazer' ? q.g.pose.mouth : q.kind === 'stentor' ? q.B.mouth : { x: q.A.x + Math.sin(q.A.ang) * 8, y: q.A.y - Math.cos(q.A.ang) * 8 });

  // ---- the bite: a tell, then members taken ----
  /** The bite lands: every member of the flocks near q in its zone is taken with its chance there (zone). */
  function take(q, t) {
    const to = mouthOf(q), kind = q.kind === 'grazer' ? 'grazer' : q.kind, hit = [];
    eachFlock(q, (C) => { for (const m of C.members) { if (m.dying) continue; const p = zone(q, m.x, m.y, t); if (p > 0 && world.r() < p) hit.push(m); } });
    for (const m of hit) { m.drill = null; coll.lose(m, kind, to); }
    q.eaten += hit.length;
    if (hit.length) q.swallowT = SWALLOW.t;
    return hit.length;
  }
  function attack(q, dt, t, active) {
    const A = q.atk;
    if (!active) { A.st = 'idle'; A.t = 0; A.next = Math.max(A.next, 2.5); return; }
    A.t += dt;
    if (A.st === 'idle') { if (A.t >= A.next) { A.st = 'tell'; A.t = 0; hooks.onTell?.(q); } return; }
    if (A.st === 'tell') { if (A.t >= q.tell) { A.st = 'bite'; A.t = 0; q.bites++; bite(q, t); } return; }
    if (A.st === 'bite') { if (A.t >= 0.6) { A.st = 'idle'; A.t = 0; A.next = q.every - q.tell - 0.6; } }
  }
  function bite(q, t) {
    // the peritrich's surge sucks in its vortex; the amoeba's lobe closes over its reach
    const n = take(q, t); // (taken first: an optional hook call would skip its arguments)
    hooks.onBite?.(q, n);
  }
  /** Stentor's pull (main.js runBoss calls this when a pull starts): its suction cone sweeps in what is in it. */
  function stentorPull(t = world.time || 0) {
    const q = byId.stentor;
    if (!isLive(q)) return 0;
    q.bites++;
    const n = take(q, t);
    hooks.onBite?.(q, n);
    return n;
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
      if (q.kind === 'amoeba') { const A = q.A, want = q.atk.st === 'tell' ? 0.45 * (q.atk.t / q.tell) : q.atk.st === 'bite' ? 1 : 0; A.surge += (want - A.surge) * Math.min(1, dt * (q.atk.st === 'bite' ? 12 : 4)); }
      // swallowing (just after a bite took someone): it cannot grow back, and the drills bite harder
      q.swallowT = Math.max(0, (q.swallowT || 0) - dt);
      const sw = q.swallowT > 0;
      q.hp = Math.min(q.max, q.hp + (sw ? 0 : q.regen) * dt - q.contact * dps * (sw ? SWALLOW.k : 1) * dt);
      if (q.hp <= 0) beat(q);
    }
    // the damage state the enemy shows (draw.js): its health share, and a flash while it is hit
    for (const q of list) {
      const o = q.kind === 'grazer' ? q.g : q.kind === 'amoeba' ? q.A : q.kind === 'stentor' ? q.B : null;
      if (!o) continue;
      o.hpK = Math.max(0, q.hp / q.max); o.hit = q.hitT > 0 || (q.drills > 0 && (t * 7) % 1 < 0.25);
      // its capture zone shows while it winds up (draw.js): 0..1 through the tell, 1 in the bite
      o.tellK = q.beaten || !q.engaged ? 0 : q.kind === 'stentor' ? (q.B.fight && q.B.fight.state === 'windup' ? q.B.fightT || 0 : q.B.fight && q.B.fight.state === 'strike' ? 1 : 0) : q.atk.st === 'tell' ? q.atk.t / q.tell : q.atk.st === 'bite' ? 1 : 0;
      o.zoneR = q.reach; o.swallow = q.swallowT > 0;
    }
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
    if (q) hurt(q, FIGHT.poison + C.level);
  }

  /** X: a burst from every drilling member (and the lone cells touching an enemy). */
  function volley(C, t) {
    let hits = 0;
    for (const q of list) {
      if (q.beaten || !isLive(q)) continue;
      let k = 0;
      for (const m of C.members) if (m.drill && m.drill.q === q) { k++; if (m.drill.ref) { m.drill.ref.hp -= FIGHT.volley * 2; if (m.drill.ref.hp <= 0 && !m.drill.ref.dead) killBdello(m.drill.ref, q); } }
      for (const P of C.players) if (P.S.alive && touching(q, P.S.x, P.S.y, t)) k++;
      if (!k) continue;
      if (q.kind === 'bdello') { q.hp = pack.reduce((a, c) => a + (c.dead ? 0 : Math.max(0, c.hp)), 0); if (pack.every((c) => c.dead)) beat(q); }
      else hurt(q, k * FIGHT.volley);
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
      const size = q.kind === 'grazer' ? q.g.R : q.kind === 'amoeba' ? 30 : q.B.catchR;
      if (Math.hypot(at.x - b.x, at.y - b.y) < b.R + size) { hurt(q, Math.max(FIGHT.burstMin, q.max * FIGHT.burst)); hit.push(q.name); }
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
    const A = world.amoeba; A.beaten = false; A.x = A.home.x; A.y = A.home.y; A.surge = 0; A.fade = 0;
    stentor.beaten = false;
    for (const c of pack) { c.dead = 0; c.hp = FIGHT.bdelloHp; c.hidden = 0; c.latch = null; c.drillLatch = false; c.x = c.home.x + (Math.random() - 0.5) * 30; c.y = c.home.y + (Math.random() - 0.5) * 30; }
    for (const C of coll.list) for (const m of C.members) m.drill = null;
  }

  return { list, byId, FIGHT, GATES, SWALLOW, drillRate, zone, placeGate, shift, park, update, volley, burstHit, nearest, reset, hurt, poison, stentorPull, centre: (q) => centre(q, { x: 0, y: 0 }), touching, surface,
    report: () => list.map((q) => ({ id: q.id, hp: +q.hp.toFixed(1), max: q.max, beaten: q.beaten, engaged: q.engaged, contact: q.contact, drills: q.drills, attack: q.atk.st, bites: q.bites, eaten: q.eaten })) };
}
