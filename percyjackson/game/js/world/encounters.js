// Encounter planning: the Minecraft Dungeons battle cadence. Pure rules (no
// Three.js), so the node tests can check them; world/levelgen.js runs them on
// a generated level and mission.js / entities/enemy.js play them out.
//
//   roles    every room on the way to the boss gets a part to play:
//              pack      an open room with one big group of monsters milling
//                        about, and a scout or two posted toward the door you
//                        come in by
//              arena     a battleground the size of two rooms (two or three
//                        groups, more scouts): the big open-field fight
//              strays    a few loose monsters (quiet traversal)
//              breather  the room before the boss: a couple of strays at most
//            side rooms are guard rooms (one smaller group over the chest) or,
//            now and then, a trap; the secret room has a few strays.
//   packs    6-14 minor monsters and 1-2 elites (by difficulty and party
//            size, and growing along the chapter), clustered in the open,
//            away from the doors. Scouts stand about halfway between the
//            group and the door you come in by.
//   traps    0-2 a chapter, in small side rooms: the doors slam shut, waves
//            come in from marked points, and the room opens when they are
//            beaten. The only small-room wave fights left.
//
// Grids: { W, D, H: Int16Array(W * D) standing height or NONE, ok: Uint8Array
// (1 where a monster may stand: not liquid, not on a canopy), wet: Uint8Array
// (1 in water: a hero climbs a two-block bank out of it), entry: [x, z],
// doors: [[x, z], ...] } in room-local cells.

export const NONE = -999;

export const ENC = {
  size: { combat: [20, 22], side: [16, 19], trap: [14, 16], secret: [14, 16] },
  doorClear: 5,          // no pack member this close (blocks) to a door
  scoutDoor: 6,          // scouts stand at least this far from the door you come in by
  traps: { max: 2 },
  party: (humans) => 1 + 0.15 * (Math.max(1, Math.min(4, humans)) - 1),   // group size with 1-4 human players
  partyMax: 1.45,
};

// Which part each room plays. main: the combat rooms on the main path in
// order (start and boss excluded); arenaAt: index into main of the room that
// grew into a two-cell battleground (or -1); sides: side rooms ({ secret });
// returns { main: [role], sides: [role] }.
export function planRoles(nMain, sides, diff, r, { arenaAt = -1 } = {}) {
  const main = [];
  for (let i = 0; i < nMain; i++) {
    if (i === nMain - 1 && nMain > 1) main.push('breather');
    else if (i === arenaAt) main.push('arena');
    else if (i === 0) main.push('pack');
    else main.push(main[i - 1] === 'pack' || main[i - 1] === 'arena' ? (nMain > 4 ? 'strays' : 'pack') : 'pack');
  }
  // traps: 0-2 a chapter, only in (non-secret) side rooms
  const cand = sides.map((s, i) => (s.secret ? -1 : i)).filter((i) => i >= 0);
  const roll = r();
  let nTraps = roll < 0.12 ? 0 : roll < 0.8 || diff < 2 ? 1 : 2;
  nTraps = Math.min(nTraps, ENC.traps.max, cand.length);
  const trapSet = new Set();
  while (trapSet.size < nTraps) trapSet.add(cand[Math.floor(r() * cand.length)]);
  const sideRoles = sides.map((s, i) => (s.secret ? 'secret' : trapSet.has(i) ? 'trap' : 'guard'));
  return { main, sides: sideRoles };
}

// How many monsters a room holds. t: 0 at the first room, 1 at the last
// (the chapter ramps up). area: reachable floor cells.
// Returns { packs: [{ minors, elites }], scouts, strays, waves: [n...] }.
export function budget(role, { diff = 1, t = 0.5, area = 400 } = {}, r = Math.random) {
  const d = Math.max(1, diff);
  const ramp = 0.85 + 0.3 * t;
  const packSize = (mul = 1) => Math.max(6, Math.min(14, Math.round((5.5 + 1.5 * d) * ramp * mul + (r() - 0.5))));
  const elites = (minors) => (d >= 3 && minors >= 9 ? 2 : 1);
  const pack = (mul) => { const minors = packSize(mul); return { minors, elites: elites(minors) }; };
  switch (role) {
    case 'pack': {
      const n = area > 650 ? 2 : 1;
      return { packs: Array.from({ length: n }, () => pack(n > 1 ? 0.8 : 1)), scouts: d >= 3 ? 2 : 1, strays: 0, waves: [] };
    }
    case 'arena': {
      const n = d >= 3 || area > 1000 ? 3 : 2;
      return { packs: Array.from({ length: n }, () => pack(n > 2 ? 0.85 : 1)), scouts: d >= 3 ? 3 : 2, strays: 0, waves: [] };
    }
    case 'guard': return { packs: [{ minors: Math.max(5, Math.round(packSize(0.75) - 1)), elites: 1 }], scouts: 1, strays: 0, waves: [] };
    case 'strays': return { packs: [], scouts: 0, strays: 3 + Math.floor(r() * 2) + (d >= 3 ? 1 : 0), waves: [] };
    case 'breather': return { packs: [], scouts: 0, strays: d >= 3 ? 2 : r() < 0.6 ? 1 : 2, waves: [] };
    case 'secret': return { packs: [], scouts: 0, strays: 2 + Math.floor(r() * 2), waves: [] };
    case 'trap': {
      const n = d >= 3 ? 3 : 2, size = 4 + Math.min(4, d);
      return { packs: [], scouts: 0, strays: 0, waves: Array.from({ length: n }, (_, i) => size + i) };
    }
    default: return { packs: [], scouts: 0, strays: 0, waves: [] };
  }
}

// The monsters themselves. table: [[kind, weight]]; info(kind) -> { tier,
// speed, ai }. Each member: { kind, elite (affix or null), role: 'pack' |
// 'scout' | 'stray', humans: players needed for it to come (1-4) }.
const AFFIXES = ['swift', 'armored', 'vampiric', 'explosive', 'shadow'];
export function roster(plan, table, info, diff, r) {
  const minorT = table.filter(([k]) => info(k)?.tier === 'minor');
  const eliteT = table.filter(([k]) => { const t = info(k)?.tier; return t === 'elite' || t === 'champion'; });
  const ranged = (k) => info(k)?.ai === 'ranged' || info(k)?.ai === 'summon';
  const big = (k) => info(k)?.tier === 'elite' || info(k)?.tier === 'champion';
  const pick = (T) => { const tw = T.reduce((a, b) => a + b[1], 0); let x = r() * tw; for (const [k, w] of T) { x -= w; if (x <= 0) return k; } return T[0][0]; };
  const minors = minorT.length ? minorT : table;
  const fast = minors.filter(([k]) => (info(k)?.speed ?? 0) >= 4.5 && info(k)?.ai === 'melee');
  const affix = () => AFFIXES[Math.floor(r() * AFFIXES.length)];
  // how many humans it takes for the i-th of n (counted for one human) to come
  const needs = (n) => { const out = []; for (let h = 1; h <= 4; h++) { const k = Math.round(n * ENC.party(h)); while (out.length < k) out.push(h); } return out; };
  const packs = plan.packs.map((p) => {
    const core = pick(minors);
    const members = [];
    needs(p.minors).forEach((h) => members.push({ kind: r() < 0.55 ? core : pick(minors), elite: r() < 0.03 * diff ? affix() : null, role: 'pack', humans: h }));
    for (let i = 0; i < p.elites; i++) members.push(eliteT.length ? { kind: pick(eliteT), elite: diff >= 4 && r() < 0.3 ? affix() : null, role: 'pack', humans: i === 0 ? 1 : 2 } : { kind: core, elite: affix(), role: 'pack', humans: 1 });
    return { members };
  });
  const scouts = [];
  for (let i = 0; i < plan.scouts; i++) scouts.push({ kind: fast.length ? pick(fast) : pick(minors), elite: null, role: 'scout', humans: 1 });
  const strays = [];
  for (let i = 0; i < plan.strays; i++) strays.push({ kind: pick(minors), elite: null, role: 'stray', humans: 1 });
  const waves = plan.waves.map((n, wi) => Array.from({ length: n }, (_, i) => ({ kind: i === 0 && wi === plan.waves.length - 1 && eliteT.length ? pick(eliteT) : pick(minors), elite: r() < 0.06 + 0.03 * diff ? affix() : null })));
  for (const m of [...packs.flatMap((p) => p.members), ...scouts, ...strays]) { m.ranged = ranged(m.kind); m.big = big(m.kind) || !!m.elite; }
  return { packs, scouts, strays, waves };
}

// ---------------------------------------------------------------- the floor
// Breadth-first walking distance from the entry over standable cells (a step
// of at most one block up or down between neighbours). Int32 (-1 unreached).
export function walkDist(grid) {
  const { W, D, H, wet } = grid;
  const dist = new Int32Array(W * D).fill(-1);
  let s = -1, bd = 1e9;
  const [ex, ez] = grid.entry;
  for (let i = 0; i < W * D; i++) if (H[i] !== NONE) { const d = Math.abs(i % W - ex) + Math.abs(((i / W) | 0) - ez); if (d < bd) { bd = d; s = i; } }
  if (s < 0) return dist;
  const q = new Int32Array(W * D); let qh = 0, qt = 0;
  q[qt++] = s; dist[s] = 0;
  while (qh < qt) {
    const i = q[qh++], x = i % W, z = (i / W) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
      const j = nz * W + nx; if (dist[j] >= 0 || H[j] === NONE) continue;
      // a step of one block; out of water a hero climbs a two-block bank (entities/player.js)
      const dy = H[j] - H[i]; if (Math.abs(dy) > 1 && !(Math.abs(dy) === 2 && ((dy > 0 && wet?.[i]) || (dy < 0 && wet?.[j])))) continue;
      dist[j] = dist[i] + 1; q[qt++] = j;
    }
  }
  return dist;
}
// Clearance: how many cells to the nearest cell that isn't reachable floor (or the room's edge).
export function clearance(grid, dist) {
  const { W, D } = grid;
  const c = new Int32Array(W * D);
  for (let i = 0; i < W * D; i++) {
    const x = i % W, z = (i / W) | 0;
    c[i] = dist[i] < 0 ? 0 : x === 0 || z === 0 || x === W - 1 || z === D - 1 ? 1 : 1e6;
  }
  // two passes of a chessboard distance transform
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const i = z * W + x; let v = c[i];
    if (x > 0) v = Math.min(v, c[i - 1] + 1);
    if (z > 0) { v = Math.min(v, c[i - W] + 1); if (x > 0) v = Math.min(v, c[i - W - 1] + 1); if (x < W - 1) v = Math.min(v, c[i - W + 1] + 1); }
    c[i] = v;
  }
  for (let z = D - 1; z >= 0; z--) for (let x = W - 1; x >= 0; x--) {
    const i = z * W + x; let v = c[i];
    if (x < W - 1) v = Math.min(v, c[i + 1] + 1);
    if (z < D - 1) { v = Math.min(v, c[i + W] + 1); if (x < W - 1) v = Math.min(v, c[i + W + 1] + 1); if (x > 0) v = Math.min(v, c[i + W - 1] + 1); }
    c[i] = v;
  }
  return c;
}

// Where everyone stands. plan: roster(); returns { packs: [{ at: [x, z],
// members: [{ ...member, at: [x, z, h] }] }], loose: [members with at],
// points: [[x, z, h]] (trap spawn points) } in room-local cells (x + 0.5 is
// the middle of a cell). Never on a door, never off the reachable floor.
export function place(grid, plan, r) {
  const { W, D, H } = grid;
  const ok = grid.ok ?? new Uint8Array(W * D).fill(1);
  const dist = walkDist(grid), clr = clearance(grid, dist);
  let maxD = 0; for (const v of dist) maxD = Math.max(maxD, v);
  const doors = grid.doors ?? [grid.entry];
  const nearDoor = (x, z, R) => doors.some(([dx, dz]) => Math.hypot(x - dx, z - dz) < R);
  const usable = (i, R = ENC.doorClear) => dist[i] >= 0 && ok[i] && !nearDoor(i % W, (i / W) | 0, R);
  const taken = [];
  const free = (x, z, gap) => taken.every(([tx, tz]) => Math.hypot(tx - x, tz - z) >= gap);
  const at = (i) => [i % W, (i / W) | 0, H[i]];
  // ---- pack centers: open floor in the far part of the room, spread apart
  const centers = [];
  for (let want = 0; want < plan.packs.length; want++) {
    let best = null;
    for (const [minClr, far] of [[3, 0.55], [2, 0.45], [2, 0.3], [1, 0.2], [0, 0]]) {
      const cand = [];
      for (let i = 0; i < W * D; i++) if (usable(i, ENC.doorClear + 1) && clr[i] >= minClr && dist[i] >= maxD * far) cand.push(i);
      if (!cand.length) continue;
      if (!centers.length) {
        // the first group: somewhere in the far part, not always the farthest corner
        best = cand[Math.floor(r() * cand.length)];
      } else {
        // the next: as far from the others as the floor allows (one of the best few)
        const score = (i) => Math.min(...centers.map((c) => Math.hypot(c[0] - i % W, c[1] - ((i / W) | 0))));
        cand.sort((a, b) => score(b) - score(a));
        best = cand[Math.floor(r() * Math.min(5, cand.length))];
      }
      break;
    }
    if (best == null) break;
    centers.push(at(best));
  }
  const packs = [];
  plan.packs.forEach((p, pi) => {
    const c = centers[pi] ?? centers[0];
    if (!c) return;
    const n = p.members.length;
    let R = 1.3 + 0.5 * Math.sqrt(n);
    const placed = [];
    // elites in the middle of the group, then the rest round them
    const order = p.members.slice().sort((a, b) => (b.big ? 1 : 0) - (a.big ? 1 : 0));
    for (const m of order) {
      let spot = null;
      for (let tries = 0; tries < 80 && !spot; tries++) {
        if (tries > 30) R += 0.12;
        const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R * (placed.length === 0 ? 0.3 : 1);
        const x = Math.round(c[0] + Math.cos(a) * rr), z = Math.round(c[1] + Math.sin(a) * rr);
        if (x < 0 || z < 0 || x >= W || z >= D) continue;
        const i = z * W + x;
        if (!usable(i) || clr[i] < 1 || Math.abs(H[i] - c[2]) > 2 || !free(x, z, 1.1)) continue;
        spot = [x, z, H[i]];
      }
      if (!spot) continue;
      taken.push(spot); placed.push({ ...m, at: spot });
    }
    // ranged monsters take the spots at the back (farthest from the way in)
    const spots = placed.map((m) => m.at).sort((a, b) => dist[b[1] * W + b[0]] - dist[a[1] * W + a[0]]);
    const ranged = placed.filter((m) => m.ranged), rest = placed.filter((m) => !m.ranged);
    [...ranged, ...rest].forEach((m, k) => { m.at = spots[k]; });
    packs.push({ at: c, members: placed });
  });
  // ---- scouts: about halfway back along the walk from a group to the door you come in by
  const loose = [];
  const back = (from, frac) => {
    // walk down the distance field from `from` until frac of its distance is left
    let i = from[1] * W + from[0];
    const goal = Math.max(ENC.scoutDoor, Math.round(dist[i] * frac));
    for (let guard = 0; guard < W * D && dist[i] > goal; guard++) {
      const x = i % W, z = (i / W) | 0; let next = -1;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => r() - 0.5);
      for (const [dx, dz] of dirs) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue; const j = nz * W + nx; if (dist[j] >= 0 && dist[j] < dist[i] && Math.abs(H[j] - H[i]) <= 1) { next = j; break; } }
      if (next < 0) break;
      i = next;
    }
    return i;
  };
  plan.scouts.forEach((m, si) => {
    const c = packs.length ? packs[si % packs.length].at : null;
    let spot = null;
    if (c) {
      const i0 = back(c, 0.4 + r() * 0.2);
      for (let tries = 0; tries < 40 && !spot; tries++) {
        const x = (i0 % W) + Math.round((r() - 0.5) * 4), z = ((i0 / W) | 0) + Math.round((r() - 0.5) * 4);
        if (x < 0 || z < 0 || x >= W || z >= D) continue;
        const i = z * W + x;
        if (!usable(i, ENC.scoutDoor) || clr[i] < 1 || !free(x, z, 2)) continue;
        spot = [x, z, H[i]];
      }
    }
    if (!spot) spot = randomSpot(3);
    if (spot) { taken.push(spot); loose.push({ ...m, at: spot }); }
  });
  // ---- strays: loose, in ones and twos, away from the door
  function randomSpot(gap) {
    for (let tries = 0; tries < 200; tries++) {
      const i = Math.floor(r() * W * D);
      if (!usable(i, ENC.scoutDoor) || clr[i] < 1 || dist[i] < Math.min(8, maxD * 0.3)) continue;
      const [x, z] = [i % W, (i / W) | 0];
      if (!free(x, z, gap)) continue;
      return [x, z, H[i]];
    }
    return null;
  }
  let pair = null;
  for (const m of plan.strays) {
    let spot = null;
    if (pair && r() < 0.5) {
      for (let tries = 0; tries < 20 && !spot; tries++) {
        const x = pair[0] + Math.round((r() - 0.5) * 4), z = pair[1] + Math.round((r() - 0.5) * 4);
        if (x < 0 || z < 0 || x >= W || z >= D) continue;
        const i = z * W + x; if (usable(i, ENC.scoutDoor) && clr[i] >= 1 && free(x, z, 1.2)) spot = [x, z, H[i]];
      }
      pair = null;
    }
    if (!spot) { spot = randomSpot(4); pair = spot; }
    if (spot) { taken.push(spot); loose.push({ ...m, at: spot }); }
  }
  // ---- trap spawn points: round the edge of the floor, away from the doors, spread out
  const points = [];
  if (plan.waves.length) {
    const cand = [];
    for (let i = 0; i < W * D; i++) if (usable(i, 4) && clr[i] >= 1 && clr[i] <= 3) cand.push(i);
    if (!cand.length) for (let i = 0; i < W * D; i++) if (usable(i, 3)) cand.push(i);
    const want = Math.min(6, Math.max(4, Math.round(cand.length / 30)));
    while (points.length < want && cand.length) {
      let bi = 0;
      if (points.length) { let bs = -1; for (let k = 0; k < cand.length; k++) { const i = cand[k]; const s = Math.min(...points.map(([x, z]) => Math.hypot(x - i % W, z - ((i / W) | 0)))) + r() * 0.5; if (s > bs) { bs = s; bi = k; } } }
      else bi = Math.floor(r() * cand.length);
      const i = cand.splice(bi, 1)[0];
      points.push(at(i));
    }
  }
  return { packs, loose, points, maxDist: maxD };
}

// Kill objective: what a chapter asks for never exceeds what a level holds for
// one player (monsters counted at one human; disguised ones included).
export function killNeed(total, diff, chapter) {
  const want = chapter ? 10 + 6 * Math.max(1, diff) : Math.max(12, Math.round(total * 0.75));
  return Math.max(1, Math.min(want, Math.floor(total * 0.85)));
}
