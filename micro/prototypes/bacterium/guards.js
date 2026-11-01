// The gates on the rings round the start (world.js ROUTE), fought by your army.
// One instance of each serves its ring: main.js moves it (setGate), unseen,
// to the bearing of whoever is approaching, while it is not engaged.
// The owner (1 Nov 2026): "let's have the challenge be just to gather an army
// and fight your way to your destination". Each gate is an enemy that a lone
// cell cannot beat and a big enough flock can push through:
//
//   grazer1  a peritrich (Vorticella-like) whose feeding current sweeps cells
//            into its funnel                                    (army ~6+)
//   bdello   a pack of four Bdellovibrio: each latches on to a member and bores
//            in unless the cells round it kill it first         (army ~8+)
//   phage    a cloud of phages from a lysed host: an unshielded member that
//            touches one is infected and lost; at army 5 the slime shield
//            catches them and the flock sweeps the cloud away   (army 5+)
//   amoeba   the edge of a giant amoeba across the way: cells inside it are
//            engulfed; push on its edge to drive it back        (army ~10+)
//   grazer2  a second, stronger peritrich                       (army ~10+)
//   stentor  the boss: Stentor's vortex sweeps in anything near the host; its
//            membranelle rim is where the army fights it        (army ~14+)
//
// Fighting is by contact: each member (and your own cell) touching an enemy
// wears it down by FIGHT.dps, while it recovers by its own regen, so a small
// flock never gets anywhere and a big one wins quickly, losing members on the
// way. A member an enemy eats poisons it (FIGHT.poison, more in a bigger
// army). X adds a volley (FIGHT.volley per member in contact), Y's toxin burst
// a big hit. Beaten, an enemy stays beaten: the grazer coils on its stalk, the
// amoeba withdraws, the pack dies, the cloud is swept up, Stentor contracts
// and stays shut. No timers anywhere (the owner's standing rule).
//
// Real basis: Gram-negative bacteria kill neighbours by contact with type VI
// secretion, which Vibrio cholerae also turns on amoebae (Pukatzki et al.
// 2006); quorum-regulated toxins such as violacein kill protist grazers
// (atlas C28); biofilm matrix traps phages before they reach the cells
// (Vidakovic et al. 2018). [Departure]: a magnetotactic spirillum doing any
// of this, Bdellovibrio dying of it, and the numbers (game values).

export const FIGHT = { dps: 1.2, volley: 0.3, burst: 15, poison: 1.5, bdelloHp: 3, bdelloRegen: 1.4, sweep: 1.5 };

export function createGuards(world, coll, stentor, hooks = {}) {
  const [g1, g2] = world.grazers;
  const pack = world.cells.filter((c) => c.kind === 'bdello' && c.home);
  const cloud = world.cloud;
  const cloudN0 = world.phages.filter((p) => p.cloud === cloud).length;
  const G = (o) => ({ hp: o.max, beaten: false, contact: 0, engaged: false, ...o });
  const list = [
    G({ id: 'grazer1', name: 'Peritrich', kind: 'grazer', g: g1, max: 40, regen: 4, zone: 55 }),
    G({ id: 'bdello', name: 'Bdellovibrio pack', kind: 'bdello', max: pack.length * FIGHT.bdelloHp, regen: 0, zone: 55 }),
    G({ id: 'phage', name: 'Phage cloud', kind: 'phage', max: cloudN0, regen: 0, zone: cloud.r + 32 }),
    G({ id: 'amoeba', name: 'Amoeba', kind: 'amoeba', A: world.amoeba, max: 75, regen: 5, zone: 70 }),
    G({ id: 'grazer2', name: 'Peritrich', kind: 'grazer', g: g2, max: 50, regen: 5, zone: 55 }),
    G({ id: 'stentor', name: 'Stentor', kind: 'stentor', B: stentor, max: 170, regen: 3, zone: stentor.wakeR }),
  ];
  const byId = Object.fromEntries(list.map((q) => [q.id, q]));
  for (const c of pack) c.hp = FIGHT.bdelloHp;

  for (const q of list) { const R = world.route.gates.find((g) => g.id === q.id); q.ring = R ? R.ring : world.route.portal; q.bearing = 0; }
  /** Move gate q round its ring to bearing a (main.js calls this only where nobody can see). */
  function setGate(q, a) {
    q.bearing = a;
    const p = world.ringPoint(q.ring, a);
    if (q.kind === 'grazer') world.placeGrazer(q.g, a);
    else if (q.kind === 'amoeba') world.placeAmoeba(a);
    else if (q.kind === 'bdello') {
      for (const c of pack) {
        c.home.x = p.x; c.home.y = p.y;
        if (!c.dead && !c.latch) { c.x = p.x + (Math.random() - 0.5) * 30; c.y = p.y + (Math.random() - 0.5) * 30; c.hidden = 0; c.prey = null; c.stalking = null; }
      }
    } else if (q.kind === 'phage') {
      const dx = p.x - cloud.x, dy = p.y - cloud.y;
      for (const ph of world.phages) if (ph.cloud === cloud) { ph.x += dx; ph.y += dy; }
      cloud.x = p.x; cloud.y = p.y;
    }
  }
  /** Where an enemy is (its gauge and its zone are centred here). */
  function centre(q, out) {
    if (q.kind === 'grazer') { const P = q.g.pose; out.x = P.ox - P.up.x * q.g.R * 0.95; out.y = P.oy - P.up.y * q.g.R * 0.95; }
    else if (q.kind === 'bdello') { out.x = pack[0].home.x; out.y = pack[0].home.y; }
    else if (q.kind === 'phage') { out.x = cloud.x; out.y = cloud.y; }
    else if (q.kind === 'amoeba') { out.x = q.A.x; out.y = q.A.y; }
    else { out.x = q.B.mouth.x; out.y = q.B.mouth.y; }
    return out;
  }
  const at = { x: 0, y: 0 };
  /** Is a cell at (x, y) touching this enemy (close enough to fight it)? */
  function touching(q, x, y, t) {
    if (q.kind === 'grazer') {
      // its bell (the mouth is the dangerous side) or its stalk down to the biofilm (the safe side)
      const P = q.g.pose, R = q.g.R;
      const bx = P.ox - P.up.x * R * 0.95, by = P.oy - P.up.y * R * 0.95;
      if ((x - bx) ** 2 + (y - by) ** 2 < (R * 1.2) ** 2) return true;
      const sx = q.g.x, sy = q.g.base, ex = P.top.x - sx, ey = P.top.y - sy, L2 = ex * ex + ey * ey || 1;
      const u = Math.max(0, Math.min(1, ((x - sx) * ex + (y - sy) * ey) / L2));
      return (x - sx - ex * u) ** 2 + (y - sy - ey * u) ** 2 < 9;
    }
    if (q.kind === 'amoeba') return world.insideAmoeba(x, y, t) > -2.5;
    if (q.kind === 'stentor') {
      // at its rim, among the membranelles (they reach ~15 µm out): inside the rim you are swept in
      const B = q.B;
      if (!B.awake || Math.abs(x - B.mouth.x) > B.discR + 30 || Math.abs(y - B.mouth.y) > B.discR + 30) return false;
      const D = B.disc(x, y);
      return D.rho > 0.9 && D.out < 20;
    }
    return false;
  }
  /** Each cell (members and the players' live cells) of the flocks near this enemy. */
  function eachCell(q, fn) {
    centre(q, at);
    for (const C of coll.list) {
      if (!C.players.length) continue;
      const reach = q.zone + C.extent + 4;
      if (Math.abs(C.cx - at.x) > reach || Math.abs(C.cy - at.y) > reach) continue;
      for (const m of C.members) fn(m, C);
      for (const P of C.players) if (P.S.alive) fn(P.S, C);
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
    return false;
  }

  function beat(q) {
    if (q.beaten) return;
    q.beaten = true; q.hp = 0; q.contact = 0;
    if (q.kind === 'grazer') { q.g.beaten = true; q.g.feeding = false; }
    if (q.kind === 'amoeba') q.A.beaten = true;
    if (q.kind === 'stentor') q.B.beaten = true;
    if (q.kind === 'phage') for (const p of world.phages) if (p.cloud === cloud) p.cloud = null;
    hooks.onBeaten?.(q);
  }
  function hurt(q, amount) {
    if (q.beaten || amount <= 0) return;
    q.hp -= amount;
    if (q.hp <= 0) beat(q);
  }
  function killBdello(c, q) {
    if (c.latch) { c.latch.m.latched = null; c.latch = null; } // the member it clung to is saved
    c.dead = 0.001; c.hidden = 0; c.stalking = null; c.windup = 0; c.prey = null;
    hooks.onKill?.(q, c);
  }

  function update(dt, t, roster) {
    for (const q of list) {
      if (q.kind === 'stentor' && !q.B.placed) { q.engaged = false; continue; } // no boss until the portal is found
      q.engaged = !q.beaten && engagedBy(q, roster);
      if (q.beaten) continue;
      if (q.kind === 'bdello') {
        // each Bdellovibrio has its own health; members within 2.4 µm of one wear it down
        let hp = 0, n = 0;
        for (const c of pack) {
          if (c.dead) continue;
          let k = 0;
          if (!(c.hidden > 0)) eachCell(q, (m) => { if ((m.x - c.x) ** 2 + (m.y - c.y) ** 2 < 3.2 * 3.2) k++; });
          c.hp = Math.min(FIGHT.bdelloHp, c.hp + FIGHT.bdelloRegen * dt - k * FIGHT.dps * dt);
          c.hit = k;
          n += k;
          if (c.hp <= 0) killBdello(c, q); else hp += c.hp;
        }
        q.contact = n; q.hp = hp;
        if (pack.every((c) => c.dead)) beat(q);
        continue;
      }
      if (q.kind === 'phage') { phageCloud(q); continue; }
      let n = 0;
      eachCell(q, (m) => { if (touching(q, m.x, m.y, t)) n++; });
      q.contact = n;
      q.hp = Math.min(q.max, q.hp + (n ? q.regen : q.regen * 2) * dt - n * FIGHT.dps * dt);
      if (q.hp <= 0) beat(q);
    }
  }

  /** The phage cloud: unshielded members that touch a phage are infected; the slime (army 5) sweeps them up. */
  function phageCloud(q) {
    const P = world.phages;
    let left = 0;
    centre(q, at);
    const near = coll.list.filter((C) => C.players.length && C.members.length && Math.abs(C.cx - at.x) < q.zone + C.extent && Math.abs(C.cy - at.y) < q.zone + C.extent);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (p.cloud !== cloud) continue;
      let gone = false;
      for (const C of near) {
        for (const m of C.members) {
          // the slime (army 5) reaches further than a bare wall
          const reach = C.level >= 1 ? FIGHT.sweep : 0.9;
          if (Math.abs(m.x - p.x) > reach || Math.abs(m.y - p.y) > reach) continue;
          if ((m.x - p.x) ** 2 + (m.y - p.y) ** 2 > reach * reach) continue;
          if (C.level >= 1) { hooks.onSwept?.(C, p); } // caught in the slime and carried off
          else { coll.lose(m, 'phage'); hooks.onInfected?.(C, m); }
          gone = true; break;
        }
        if (gone) break;
      }
      if (gone) { P.splice(i, 1); continue; }
      left++;
    }
    q.hp = left; q.contact = near.length;
    // swept through: once under half of it is left, the rest drifts apart
    if (left < q.max * 0.45) beat(q);
  }

  /**
   * A member eaten by an enemy poisons it: violacein-like toxins kill the protists that graze on such
   * bacteria (atlas C28). More toxic the bigger the army (quorum-regulated): FIGHT.poison + 1 per level.
   */
  function poison(kind, m, C) {
    let q = null;
    if (kind === 'grazer') { let bd = Infinity; for (const g of world.grazers) { const d = Math.hypot(g.pose.mouth.x - m.x, g.pose.mouth.y - m.y); if (d < bd) { bd = d; q = g === g1 ? byId.grazer1 : byId.grazer2; } } }
    else if (kind === 'amoeba') q = byId.amoeba;
    else if (kind === 'stentor') q = byId.stentor;
    if (q) hurt(q, FIGHT.poison + C.level);
  }

  /** X: a volley from every member in contact with an enemy. */
  function volley(C, t) {
    let hits = 0;
    for (const q of list) {
      if (q.beaten || q.kind === 'phage') continue;
      centre(q, at);
      const reach = q.zone + C.extent + 4;
      if (Math.abs(C.cx - at.x) > reach || Math.abs(C.cy - at.y) > reach) continue;
      const cells = [...C.members, ...C.players.filter((P) => P.S.alive).map((P) => P.S)];
      if (q.kind === 'bdello') {
        for (const c of pack) {
          if (c.dead || c.hidden > 0) continue;
          let k = 0;
          for (const m of cells) if ((m.x - c.x) ** 2 + (m.y - c.y) ** 2 < 3.2 * 3.2) k++;
          if (!k) continue;
          c.hp -= k * FIGHT.volley * 2; hits += k;
          if (c.hp <= 0) killBdello(c, q);
        }
        q.hp = pack.reduce((a, c) => a + (c.dead ? 0 : Math.max(0, c.hp)), 0);
        if (pack.every((c) => c.dead)) beat(q);
        continue;
      }
      let k = 0;
      for (const m of cells) if (touching(q, m.x, m.y, t)) k++;
      if (k) { hurt(q, k * FIGHT.volley); hits += k; }
    }
    return hits;
  }

  /** Y's toxin burst: a big hit on every enemy it reaches (main.js toxinBurst does the rest). */
  function burstHit(b) {
    const hit = [];
    for (const q of list) {
      if (q.beaten) continue;
      if (q.kind === 'bdello') {
        for (const c of pack) if (!c.dead && Math.hypot(c.x - b.x, c.y - b.y) < b.R) { killBdello(c, q); hit.push(q.name); }
        if (pack.every((c) => c.dead)) beat(q);
        continue;
      }
      if (q.kind === 'phage') continue; // main.js scatters the phages in reach
      centre(q, at);
      const size = q.kind === 'grazer' ? q.g.R : q.kind === 'amoeba' ? 20 : q.B.catchR;
      if (Math.hypot(at.x - b.x, at.y - b.y) < b.R + size) { hurt(q, FIGHT.burst); hit.push(q.name); }
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
    for (const q of list) { q.hp = q.max; q.beaten = false; q.contact = 0; q.engaged = false; }
    for (const g of world.grazers) { g.beaten = false; g.contract = 0; g.ext = 1; }
    const A = world.amoeba; A.beaten = false; A.x = A.home.x; A.y = A.home.y;
    stentor.beaten = false;
    for (const c of pack) { c.dead = 0; c.hp = FIGHT.bdelloHp; c.hidden = 0; c.x = c.home.x + (Math.random() - 0.5) * 30; c.y = c.home.y + (Math.random() - 0.5) * 30; }
    // a fresh cloud
    const P = world.phages;
    for (let i = P.length - 1; i >= 0; i--) if (P[i].cloud) P.splice(i, 1);
    for (let i = 0; i < cloudN0; i++) { const p = world.newPhage(cloud.x + (Math.random() - 0.5) * cloud.r * 1.4, cloud.y + (Math.random() - 0.5) * cloud.r * 1.6); p.z = (Math.random() - 0.5) * 0.6; p.cloud = cloud; P.push(p); }
  }

  return { list, byId, FIGHT, setGate, update, volley, burstHit, nearest, reset, hurt, poison, centre: (q) => centre(q, { x: 0, y: 0 }), touching,
    report: () => list.map((q) => ({ id: q.id, hp: +q.hp.toFixed(1), max: q.max, beaten: q.beaten, engaged: q.engaged, contact: q.contact })) };
}
