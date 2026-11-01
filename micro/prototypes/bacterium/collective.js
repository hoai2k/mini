// The collective (the owner's "the bacteria swarm"): touch kin cells and they
// join you, and you become a collective. There is no leader: the whole group
// moves together under the player's input, as one flock with cohesion, and
// the player's own cell is one member of it, not a cell the others follow.
//
//   members  are your health: a predator that would take you takes a member
//            from the edge instead; members regrow by division in the band
//   quorum   how many cells are close together (within COLL.qR of the
//            middle), not the head count: a tight dozen beats a loose twenty.
//            It gates the abilities:
//              5  slime shield: phages stick in the slime, a Bdellovibrio's
//                 ram glances off it
//              8  raft: currents (Stentor's vortex, a grazer's draw) drag you
//                 at a third of their strength
//             12  quorum: a toxin burst charges while the collective holds
//                 still (released stick: it mills in place), and a food
//                 patch it sits on is taken over (rivals pushed off, members
//                 divide three times as fast)
//   together a player who touches another player's collective joins it: their
//            inputs blend into one (each cell steers half by its own stick,
//            half by the blend, so a player can still pull away). LEAVING is by
//            moving away: a player who branches off LEAVE_D from the other
//            players splits the collective, its members shared out evenly
//            between the players, each half taking the cells on its side.
//
// Real basis and departures (README "The collective"): quorum sensing is a
// density switch (C19, C28); swarms move as rafts (C29); multicellular
// magnetotactic prokaryotes swim as one (C20). That the player steers a group,
// and members dying in your place, are [Departure]s.
import { oxygen, gauss, WORLD } from './world.js';

export const COLL = {
  touch: 3.0,      // centre distance at which a kin cell (or a collective) is touched, µm
  sep: 2.2,        // members keep this far apart
  qR: 7,           // quorum radius round the middle, µm
  shield: 5, raft: 8, quorum: 12,
  leaveD: 20,      // branching off this far from the other players splits the collective
  max: 40,         // members per collective
  joinCool: 2.5,   // s after a split before those players can merge again
  free: 70,        // free kin cells in the world at the start
  burstR: 32, chargeT: 4,
};

let nextId = 1;

export function createCollectives(world, hooks = {}) {
  const r = world.r;
  const kin = [];          // every kin cell: free, a member, or dying
  const list = [];         // the collectives (one per player while alone)
  const byPlayer = new Map();
  const opts = { on: true };
  const W = WORLD;
  const half = () => world.halfX;

  function newKin(x, y) {
    return { x, y, a: r() * 6.283, vx: 0, vy: 0, L: 2.6 + r() * 0.6, r: 0.27, amp: 0.3, wl: 1.6, z: (r() - 0.5) * 0.5,
      flPhase: r() * 6, bodyPhase: r() * 6, coll: null, growth: r() * 0.5, dying: null, wob: r() * 6.283, still: 0 };
  }
  /** A free kin cell somewhere in the first half (plentiful early, so the collective forms while exploring). */
  function placeFree(k, early = true) {
    const S0 = world.start;
    const x1 = early ? half() - 10 : W.x1 - 60;
    for (let i = 0; i < 6; i++) {
      k.x = W.x0 + 25 + Math.pow(r(), early ? 1.25 : 1) * (x1 - W.x0 - 25);
      k.y = world.bandY(0.8 + r() * 3.5) + (r() - 0.5) * 6;
      if (Math.hypot(k.x - S0.x, k.y - S0.y) > 8 && !world.pushOutOfGrains({ x: k.x, y: k.y }, 0.5)) break;
    }
    k.coll = null; k.dying = null; k.growth = r() * 0.4; k.vx = k.vy = 0;
  }

  function reset(roster) {
    list.length = 0; byPlayer.clear(); kin.length = 0;
    for (let i = 0; i < COLL.free; i++) { const k = newKin(0, 0); placeFree(k, i < COLL.free - 8); kin.push(k); }
    // a handful start right beside you, so the first touch comes within seconds
    for (let i = 0; i < 4; i++) { const k = kin[i]; const a = 0.3 + i * 0.9; k.x = world.start.x + 9 + Math.cos(a) * (6 + i * 3); k.y = world.start.y + 4 + Math.sin(a) * 4; }
    for (const P of roster) ensure(P);
  }
  function make(players) { const C = { id: nextId++, players, members: [], cx: 0, cy: 0, vx: 0, vy: 0, speed: 0, q: 0, R: 2, charge: 0, takeT: 0, patch: null, blend: null, dash: false, mill: false, burst: null, level: 0 }; list.push(C); for (const P of players) byPlayer.set(P, C); return C; }
  function ensure(P) { if (!byPlayer.has(P)) make([P]); return byPlayer.get(P); }
  const of = (P) => byPlayer.get(P) || null;
  /** A player leaves the game or dies: their members stay with the others, or go free. */
  function drop(P) {
    const C = byPlayer.get(P);
    if (!C) return;
    byPlayer.delete(P);
    C.players = C.players.filter((Q) => Q !== P);
    if (!C.players.length) { for (const m of C.members) m.coll = null; C.members.length = 0; list.splice(list.indexOf(C), 1); }
  }
  function remove(P) { drop(P); }

  const liveCells = (C) => C.players.filter((P) => P.S.alive).map((P) => P.S);

  // --- before the swimmers step: blend the inputs of a shared collective; mill when released ---
  function pre(dt, t, roster, inputs) {
    if (!opts.on) return;
    for (const P of roster) ensure(P);
    for (const C of list) {
      const ps = C.players.filter((P) => P.S.alive && inputs[P.slot] && P.S.species === 'mtb');
      let bx = 0, by = 0, n = 0;
      for (const P of ps) { const s = inputs[P.slot].steer; if (s && s.m > 0.15) { bx += s.x * s.m; by += s.y * s.m; n++; } }
      C.blend = n ? { x: bx / ps.length, y: by / ps.length, m: Math.min(1, Math.hypot(bx, by) / ps.length) } : null;
      C.dash = ps.some((P) => P.dash.active);
      C.mill = !C.blend && C.members.length >= 2;
      for (const P of ps) {
        const inp = inputs[P.slot];
        if (C.dash) inp.dashActive = true;
        const own = inp.steer && inp.steer.m > 0.15 ? inp.steer : null;
        if (ps.length > 1 && C.blend) {
          const vx = (own ? 0.5 * own.x * own.m : 0) + (own ? 0.5 : 1) * C.blend.x, vy = (own ? 0.5 * own.y * own.m : 0) + (own ? 0.5 : 1) * C.blend.y;
          const m = Math.hypot(vx, vy);
          inp.steer = m > 1e-3 ? { x: vx / m, y: vy / m, m: Math.max(0.2, Math.min(1, m)) } : null;
        } else if (C.mill && !own) {
          // released in a collective: it mills in place (circling the middle), so it can hold still
          const S = P.S, dx = C.cx - S.x, dy = C.cy - S.y, d = Math.hypot(dx, dy) || 1;
          const inK = Math.max(-1, Math.min(1, (d - 3) / 3));
          const tx = -dy / d, ty = dx / d;
          const vx = tx + (dx / d) * inK, vy = ty + (dy / d) * inK, m = Math.hypot(vx, vy) || 1;
          inp.steer = { x: vx / m, y: vy / m, m: 0.25 };
          inp.milling = true;
        }
      }
    }
  }

  // --- after the swimmers and the world step ---
  function post(dt, t, roster, ctx = {}) {
    if (!opts.on) return;
    const sq = Math.sqrt(dt);
    // middles, sizes, quorum
    for (const C of list) {
      const cells = liveCells(C);
      let sx = 0, sy = 0, n = 0;
      for (const S of cells) { sx += S.x; sy += S.y; n++; }
      for (const m of C.members) { sx += m.x; sy += m.y; n++; }
      if (!n) continue;
      const cx = sx / n, cy = sy / n;
      const v = dt > 0 ? Math.hypot(cx - C.cx, cy - C.cy) / dt : 0;
      C.speed += (Math.min(200, v) - C.speed) * Math.min(1, dt * 3);
      C.cx = cx; C.cy = cy;
      C.R = 1.6 * Math.sqrt(n) + 1.5;
      let q = 0;
      const q2 = COLL.qR * COLL.qR;
      for (const S of cells) if ((S.x - cx) ** 2 + (S.y - cy) ** 2 < q2) q++;
      for (const m of C.members) if ((m.x - cx) ** 2 + (m.y - cy) ** 2 < q2) q++;
      C.q = C.members.length ? q : 0;
      C.level = C.q >= COLL.quorum ? 3 : C.q >= COLL.raft ? 2 : C.q >= COLL.shield ? 1 : 0;
      // the toxin charges only at quorum while the collective holds still; it holds while you move
      if (C.level >= 3 && C.speed < 9) C.charge = Math.min(1, C.charge + dt / COLL.chargeT);
      else if (C.level < 3) C.charge = Math.max(0, C.charge - dt / 20);
      if (C.burst) { C.burst.t += dt; if (C.burst.t > 1.2) C.burst = null; }
    }

    // player cells: cohesion (a gentle pull to the middle), so the player is a member, not a leader
    for (const C of list) {
      if (!C.members.length) continue;
      for (const S of liveCells(C)) {
        const dx = C.cx - S.x, dy = C.cy - S.y, d = Math.hypot(dx, dy);
        if (d > C.R) { const u = Math.min(12, (d - C.R) * 3); S.x += (dx / d) * u * dt; S.y += (dy / d) * u * dt; }
      }
    }

    // the members: one flock driven by the (blended) input, with cohesion, separation and alignment
    const sp = 45; // the spirillum's run speed, µm/s
    for (const C of list) {
      if (!C.members.length) continue;
      let dvx, dvy;
      const cells = liveCells(C);
      if (C.blend) { const k = (0.35 + 0.65 * C.blend.m) * (C.dash ? 95 / 45 : 1); const m = Math.hypot(C.blend.x, C.blend.y) || 1; dvx = (C.blend.x / m) * sp * k; dvy = (C.blend.y / m) * sp * k; }
      else if (!C.mill && cells.length) { dvx = 0; dvy = 0; for (const S of cells) { dvx += S.vx; dvy += S.vy; } dvx /= cells.length; dvy /= cells.length; }
      else { dvx = 0; dvy = 0; }
      const raft = C.level >= 2;
      const all = C.members;
      for (let i = 0; i < all.length; i++) {
        const m = all[i];
        let vx = dvx, vy = dvy;
        const dx = C.cx - m.x, dy = C.cy - m.y, d = Math.hypot(dx, dy) || 1;
        // cohesion: stronger beyond the collective's radius
        const coh = Math.min(sp * 1.1, 2.2 * Math.max(0, d - C.R * 0.6) + (d > C.R ? 6 : 0));
        vx += (dx / d) * coh; vy += (dy / d) * coh;
        if (C.mill) { vx += (-dy / d) * 10; vy += (dx / d) * 10; }
        // separation from the other members and from the players' cells
        for (let j = 0; j < all.length; j++) {
          if (j === i) continue;
          const o = all[j], ex = m.x - o.x, ey = m.y - o.y;
          if (Math.abs(ex) > COLL.sep || Math.abs(ey) > COLL.sep) continue;
          const e = Math.hypot(ex, ey) || 0.01;
          if (e < COLL.sep) { const p = (COLL.sep - e) / COLL.sep * 30; vx += (ex / e) * p; vy += (ey / e) * p; }
        }
        for (const S of cells) { const ex = m.x - S.x, ey = m.y - S.y, e = Math.hypot(ex, ey) || 0.01; if (e < COLL.sep + 0.6) { const p = (COLL.sep + 0.6 - e) / COLL.sep * 30; vx += (ex / e) * p; vy += (ey / e) * p; } }
        // currents: a raft is dragged at a third of their strength
        const f = world.flowAt(m.x, m.y);
        const fk = raft ? 0.35 : 1;
        vx += f.x * fk; vy += f.y * fk;
        m.vx = vx; m.vy = vy;
        m.x += vx * dt + 0.7 * sq * gauss(r);
        m.y += vy * dt + 0.7 * sq * gauss(r);
        const want = Math.atan2(vy, vx), sp2 = Math.hypot(vx, vy);
        // rafts line up (the swarming edge's aligned rafts); a loose cloud swirls
        const turn = (raft ? 7 : 4) * Math.min(1, sp2 / 15);
        m.a += Math.atan2(Math.sin(want - m.a), Math.cos(want - m.a)) * Math.min(1, dt * turn) + 0.3 * sq * gauss(r);
        m.flPhase += dt * 20; m.bodyPhase += dt * Math.min(60, sp2) / 1.6 * 3.14;
        clampCell(m);
      }
    }

    // free kin: slow wanderers that keep to the band, drawn toward a collective's signal
    for (const k of kin) {
      if (k.coll || k.dying) continue;
      k.wob += dt * (0.3 + 0.4 * gauss(r) * 0.3);
      let vx = Math.cos(k.a) * 9, vy = Math.sin(k.a) * 9;
      k.a += 0.9 * sq * gauss(r);
      const O = oxygen(k.y);
      if (O > 5) k.a += Math.sin(-Math.PI / 2 - k.a) * dt * 2; else if (O < 0.6) k.a += Math.sin(Math.PI / 2 - k.a) * dt * 2;
      // the quorum signal: a halo that grows with the collective; kin inside drift toward it
      for (const C of list) {
        if (!C.players.length) continue;
        const sig = 5 + C.R + 1.2 * C.members.length;
        const dx = C.cx - k.x, dy = C.cy - k.y;
        if (Math.abs(dx) > sig || Math.abs(dy) > sig) continue;
        const d = Math.hypot(dx, dy) || 1;
        if (d < sig) { vx += (dx / d) * 14; vy += (dy / d) * 14; k.a += Math.sin(Math.atan2(dy, dx) - k.a) * dt * 3; }
      }
      const f = world.flowAt(k.x, k.y);
      k.vx = vx + f.x; k.vy = vy + f.y;
      k.x += k.vx * dt + 0.7 * sq * gauss(r);
      k.y += k.vy * dt + 0.7 * sq * gauss(r);
      k.flPhase += dt * 20; k.bodyPhase += dt * 9;
      clampCell(k);
    }

    // recruiting: a free kin cell touched by any cell of a collective joins it
    const t2 = COLL.touch * COLL.touch;
    for (const k of kin) {
      if (k.coll || k.dying) continue;
      for (const C of list) {
        if (!C.players.some((P) => P.S.alive && P.S.species === 'mtb') || C.members.length >= COLL.max) continue;
        if (Math.abs(k.x - C.cx) > C.R + 4 + COLL.touch || Math.abs(k.y - C.cy) > C.R + 4 + COLL.touch) continue;
        let hit = false;
        for (const S of liveCells(C)) if ((S.x - k.x) ** 2 + (S.y - k.y) ** 2 < t2) { hit = true; break; }
        if (!hit) for (const m of C.members) if ((m.x - k.x) ** 2 + (m.y - k.y) ** 2 < t2) { hit = true; break; }
        if (hit) { k.coll = C; C.members.push(k); hooks.onRecruit?.(C, k); break; }
      }
    }

    mergeAndSplit(t, roster);
    losses(dt, t, ctx);
    divide(dt);
    takeover(dt);
    bdelloAttraction(dt);
    // the dying: shown for a moment (rounding, darkening), then back into the world as a free cell
    for (const k of kin) if (k.dying) { k.dying.t += dt; if (k.dying.t > 1.6) placeFree(k, true); }
  }

  function clampCell(c) {
    if (c.y > W.y1 - 2) c.y = W.y1 - 2;
    const floor = world.surfaceY(c.x) + 0.5;
    if (c.y < floor) c.y = floor;
    c.x = Math.max(W.x0 + 2, Math.min(W.x1 - 2, c.x));
    world.pushOutOfGrains(c, c.r + 0.1);
  }

  // --- players: join by touching, leave by branching off (an even split) ---
  function mergeAndSplit(t, roster) {
    // a player's cell touching another collective's cell: the two become one
    for (const P of roster) {
      const A = of(P);
      if (!A || !P.S.alive || P.S.species !== 'mtb' || (P.noJoinUntil || 0) > t) continue;
      for (const B of list) {
        if (B === A || !B.players.length) continue;
        if (B.players.some((Q) => (Q.noJoinUntil || 0) > t)) continue;
        if (Math.abs(P.S.x - B.cx) > B.R + 6 || Math.abs(P.S.y - B.cy) > B.R + 6) continue;
        let hit = false;
        for (const S of liveCells(B)) if ((S.x - P.S.x) ** 2 + (S.y - P.S.y) ** 2 < 2.6 * 2.6) { hit = true; break; }
        if (!hit) for (const m of B.members) if ((m.x - P.S.x) ** 2 + (m.y - P.S.y) ** 2 < 2.6 * 2.6) { hit = true; break; }
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
    // branching off: a player LEAVE_D from the other players' middle splits the collective evenly
    for (const C of [...list]) {
      const ps = C.players.filter((P) => P.S.alive);
      if (ps.length < 2) continue;
      for (const P of ps) {
        const others = ps.filter((Q) => Q !== P);
        const ox = others.reduce((a, Q) => a + Q.S.x, 0) / others.length, oy = others.reduce((a, Q) => a + Q.S.y, 0) / others.length;
        const d = Math.hypot(P.S.x - ox, P.S.y - oy);
        if (d < COLL.leaveD) continue;
        // an even share for each player: the members on the leaver's side go with them
        const share = Math.floor(C.members.length / C.players.length);
        const side = (m) => Math.hypot(m.x - P.S.x, m.y - P.S.y) - Math.hypot(m.x - ox, m.y - oy);
        const sorted = [...C.members].sort((a, b) => side(a) - side(b));
        const mine = sorted.slice(0, share);
        const N = make([P]);
        C.players = C.players.filter((Q) => Q !== P);
        C.members = sorted.slice(share);
        for (const m of mine) { m.coll = N; N.members.push(m); }
        N.cx = P.S.x; N.cy = P.S.y;
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
    m.coll = null; m.dying = { kind, t: 0 };
    hooks.onLost?.(C, m, kind);
  }
  function losses(dt, t, ctx) {
    const st = world.stentor;
    for (const C of list) {
      for (let i = C.members.length - 1; i >= 0; i--) {
        const m = C.members[i];
        if (world.grazerMouthAt && world.grazerMouthAt(m.x, m.y, 9)) { lose(m, 'grazer'); continue; }
        if (world.insideAmoeba(m.x, m.y, t) > 1.5) { m.engulf = (m.engulf || 0) + dt; if (m.engulf > 1.2) { lose(m, 'amoeba'); continue; } } else m.engulf = 0;
        if (st && st.awake && st.flowK > 0.3 && Math.hypot(m.x - st.mouth.x, m.y - st.mouth.y) < st.catchR) { lose(m, 'stentor'); continue; }
      }
    }
    // free kin can be eaten too (they come back elsewhere)
    for (const k of kin) if (!k.coll && !k.dying && world.grazerMouthAt && world.grazerMouthAt(k.x, k.y, 9)) { k.dying = { kind: 'grazer', t: 0 }; }
    void ctx;
  }

  /** A predator would catch player P: a member is taken in your place (the slime shield stops phages and rams outright). */
  function absorb(P, kind, from) {
    const C = of(P);
    if (!C || !opts.on) return false;
    if ((P.safeT || 0) > 0) return true;
    if ((kind === 'phage' || kind === 'bdello') && C.level >= 1) { P.safeT = 1.2; hooks.onShield?.(C, P, kind); return true; }
    if (!C.members.length) return false;
    // the member on the predator's side of the collective goes
    let best = C.members[0], bd = Infinity;
    const fx = from ? from.x : P.S.x, fy = from ? from.y : P.S.y;
    for (const m of C.members) { const d = (m.x - fx) ** 2 + (m.y - fy) ** 2; if (d < bd) { bd = d; best = m; } }
    lose(best, kind);
    P.safeT = 1.6;
    return true;
  }

  // --- division: members regrow in the band (three times as fast on a taken patch) ---
  function divide(dt) {
    for (const C of list) {
      if (!C.players.length) continue;
      const add = [];
      for (const m of C.members) {
        const O = oxygen(m.y);
        const band = O >= 0.5 && O <= 5;
        let rate = band ? 1 / 40 : 1 / 160;
        if (C.patch) rate *= 3;
        if (world.food(m.x, m.y) > 0.15) rate *= 1.6;
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
  /** The player's own division: the daughter joins the collective. */
  function adopt(P, x, y, a) {
    const C = of(P);
    if (!C || C.members.length >= COLL.max) return false;
    const d = newKin(x, y); d.a = a; d.coll = C; kin.push(d); C.members.push(d);
    return true;
  }

  // --- patch takeover: at quorum, sit on a food patch to take it ---
  function takeover(dt) {
    for (const C of list) {
      if (!C.players.length) continue;
      let here = null;
      for (const p of world.patches) if (Math.hypot(C.cx - p.x, C.cy - p.y) < p.r * 0.8 && p.amt > 0.1) { here = p; break; }
      if (C.patch && (C.patch.amt <= 0.06 || !world.patches.includes(C.patch) || Math.hypot(C.cx - C.patch.x, C.cy - C.patch.y) > C.patch.r * 1.6)) { C.patch.claim = null; C.patch = null; C.takeT = 0; }
      if (!C.patch) {
        if (here && C.level >= 3 && !here.claim) { C.takeT += dt; if (C.takeT > 1.5) { C.patch = here; here.claim = C; hooks.onTake?.(C, here); } }
        else C.takeT = Math.max(0, C.takeT - dt);
      }
      // rivals are pushed off a taken patch
      if (C.patch) {
        const p = C.patch;
        for (const c of world.cells) {
          if (c.kind === 'bdello' || c.bdelloplast || c.attachedBy) continue;
          const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
          if (d < p.r && d > 0.01) { c.x += (dx / d) * 16 * dt; c.y += (dy / d) * 16 * dt; }
        }
      }
    }
  }

  // --- Bdellovibrio are drawn to dense collectives (a dense prey colony suits it) ---
  function bdelloAttraction(dt) {
    if (!world.opts.hunters) return;
    for (const c of world.cells) {
      if (c.kind !== 'bdello' || c.prey || c.hidden > 0 || c.stalking || c.cooldown > 1) continue;
      let best = null, bd = 110;
      for (const C of list) { if (C.q < COLL.shield) continue; const d = Math.hypot(C.cx - c.x, C.cy - c.y); if (d < bd) { bd = d; best = C; } }
      if (!best) continue;
      const want = Math.atan2(best.cy - c.y, best.cx - c.x);
      c.a += Math.atan2(Math.sin(want - c.a), Math.cos(want - c.a)) * Math.min(1, dt * 1.6 * best.q / COLL.quorum);
      c.drawnTo = best;
      for (const m of best.members) {
        if (Math.abs(m.x - c.x) > 1.6 || Math.abs(m.y - c.y) > 1.6) continue;
        if (Math.hypot(m.x - c.x, m.y - c.y) < 1.3) { lose(m, 'bdello'); c.hidden = 5; c.cooldown = 9; m.dying.bdello = c; break; }
      }
    }
  }

  /** Fire the toxin burst (charged at quorum). Returns the burst, or null. */
  function burst(P) {
    const C = of(P);
    if (!C || C.charge < 1) return null;
    C.charge = 0;
    C.burst = { x: C.cx, y: C.cy, t: 0, R: COLL.burstR };
    hooks.onBurst?.(C, C.burst);
    return C.burst;
  }

  return {
    COLL, kin, list, opts, of, ensure, remove, reset, pre, post, absorb, burst, adopt,
    /** For tests and the HUD: each collective's players, members, quorum, level, charge. */
    report: () => list.map((C) => ({ id: C.id, players: C.players.map((P) => P.slot), members: C.members.length, q: C.q, level: C.level, charge: +C.charge.toFixed(2), x: +C.cx.toFixed(1), y: +C.cy.toFixed(1), speed: +C.speed.toFixed(1), patch: !!C.patch })),
  };
}

export const LEVEL_NAMES = ['', 'slime', 'raft', 'quorum'];
