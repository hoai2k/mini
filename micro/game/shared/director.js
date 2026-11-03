// The encounter director (design/encounter-pattern.md, "Placed as you go").
//
// A world's enemies and events (predators, the rain, the boss and the portal)
// are not laid out before play: the director places each one, in the world's
// order, in space nobody has seen yet, a short way ahead of the player who is
// furthest along. Whatever a player has seen stays as it was.
//
// The rules it keeps:
//   - Explored stays constant. A coarse grid (cells `cell` units wide over the
//     ground plane, or a 3D grid for the volumetric worlds) records what every
//     view has seen: each frame, the cells within `seenDist` of a view's focus
//     that lie inside its frustum, plus a small disc (`nearSeen`) round every
//     player. Nothing is ever placed into, moved within or removed from a seen
//     cell, and nothing is placed inside any view's frustum.
//   - Strict order, nothing skipped. Entry k+1 is placed only after entry k is
//     met. The last entry (the boss and the portal: `final: true`) comes only
//     after every earlier one.
//   - A calm break between encounters: after an entry is met, the next waits
//     for `calm.sec` seconds of the leader moving outside the met encounter
//     (or `calm.dist` units travelled). The first entry waits for `warmup`.
//   - Lingering still progresses. If the leader stays put, the next entry is
//     placed anyway once `calm.sec + linger` seconds have passed, near them
//     (`minNear`..`maxNear`, in unseen space round them, out of view).
//   - Placement: ahead in the leader's direction of travel (fanning out to the
//     sides), then all round them, then farther out, then the nearest unseen
//     spot anywhere. Every spot must be inside `bounds`, clear of every view,
//     on unseen cells over the entry's `visible` radius, clear of the other
//     placed entries, and pass the world's `canPlace` and the entry's `fits`.
//   - An entry placed but not yet seen by anyone may be moved (again only from
//     unseen to unseen, out of view) when the leader has gone another way.
//   - An entry someone has seen but nobody meets is never moved: it counts as
//     met ("passed") once every player is more than `passDist` from it for
//     `passSec`, or ("watched") once it has been in sight `watchSec` with a
//     player within `watchDist`, so a seen encounter can never stall the game.
//     (Not for the final entry: the portal waits where it is.)
//   - Multiplayer: progress through the order is shared; each player also
//     keeps how many entries they met themselves, and the leader is the one
//     furthest along that (ties: the world's `progress(p)`, else distance
//     travelled). Anyone can meet an entry wherever it is.
//   - The default path (opts.defaultPath; the owner, 2026-11-01: "a default
//     path to a portal, but just dynamically generate the other directions if
//     the player goes off in another direction"). On the first update (or the
//     first portals() call, given `from`) every entry but the virtual ones is
//     pre-placed along a bearing from the start, at the distances a rush
//     would meet them (each break at `rush` units/s plus the middle of its
//     ahead range, or `dists`), fanned within the cone so each has room, each
//     passing `fits`, canPlace and the unseen/out-of-view tests. So a portal
//     exists from the start. While the leader is on the path (still within
//     `startR` of the start, inside the cone round the bearing, close to the
//     current entry's instance, or heading for it) and not lingering, the
//     current entry is its pre-placed instance and nothing is generated. Off
//     the path, the current entry is placed as you go exactly as above, a
//     second ("dynamic") instance; whichever instance a player meets first
//     counts, and only the current entry's (strict order holds: meeting a
//     later entry's path instance early does nothing). Path instances are
//     never moved. An unseen one is kept until its entry is met by the other
//     instance, then dropped (the entry's `drop`): kept, so a player who comes
//     back to the path still finds it; dropped then, so a met encounter is
//     not left waiting twice. A seen one stays where it is for good. A seen
//     path instance counts as passed only once someone has been near it (not
//     merely glimpsed far down the path). So two portals can exist (the
//     path's and one placed as you go), both opening when every earlier entry
//     is met: portals() lists them for the arrow.
//     A world whose encounters are one object each sets `single` on the
//     entry: then there is never a second instance. Off the path the one
//     object leaves the path while nobody has seen it (moved, as placing as
//     you go always could); once seen it stays and the usual passed/watched
//     rules count it (the portal then waits where it is).
//   - Deterministic: candidate jitter comes from a seeded generator (`seed`),
//     never Math.random. Cheap per frame: marking walks only the cells near
//     each view's focus and skips cells already seen.
//
// API
//   const director = createDirector({
//     entries: [{
//       id,                          // 'stenus', 'portal', ...
//       place(x, z, b, info) -> handle,   // put it there; b = bearing from the leader to the spot
//                                    //   (atan2(dz, dx)); info = { y, leader, how, instance }
//                                    //   (instance: 'default' on the default path, else 'dynamic').
//                                    //   May be called again for the same entry to move it
//                                    //   unless `move` is given.
//       move?(handle, x, z, b, info) -> handle,
//       met(handle, players) -> bool,     // called with one player at a time ([p])
//       size,                        // clearance radius (other entries, canPlace)
//       visible?,                    // radius of what can be seen (default size): must be on unseen cells
//       parts?(x, z, b) -> [[x, z, r], ...],  // or the discs that can be seen, when they are not one disc
//                                    //   round the spot (a predator's start, its crowd beside it)
//       top?,                        // height of what can be seen (for the view test; default 0)
//       minAhead, maxAhead,          // distance from the leader when placed ahead of them
//       minNear?, maxNear?,          // ... when they linger (default minAhead, maxAhead)
//       calm?: { sec, dist },        // the break before this entry (default: opts.calm; entry 0: opts.warmup)
//       fits?(x, z, b) -> bool,      // the entry's own test (open water, room for its parts)
//       virtual?,                    // an event with no place (the rain): placed at the leader, no checks
//       final?,                      // the last (boss + portal): never "passed"
//       single?,                     // one object only (no second instance off the default path)
//       drop?(handle),               // take back an unseen instance no longer needed (default path)
//     }, ...],
//     bounds: { x0, x1, z0, z1, y0?, y1? },  // the area the grid covers
//     cell = 10, mode = '2d' | '3d', groundY = 0,
//     seenDist = 60, nearSeen = 6,
//     warmup = { sec: 4 }, calm = { sec: 4 }, linger = 8,
//     moveSpeed = 2,                // units/s: slower than this a player is idle
//     passDist (default per entry: size + 2 * seenDist), passSec = 1.5,
//     watchSec = 20, watchDist (default per entry: size + seenDist),
//     canPlace(x, z, r, { y, b, entry }) -> bool,
//     progress?(p) -> number,       // tie-break for the leader
//     seed = 1,
//     defaultPath?: {               // pre-place the whole order along a bearing (above)
//       from?: { x, y?, z },        //   the start (default: the first live player at the first update)
//       bearing?, elevation?,       //   atan2(dz, dx) (default: from the seed); 3D: up from level
//       rush?,                      //   units/s of a rush between them (default 5 x moveSpeed)
//       dists?: [d, ...],           //   or each entry's distance from the start (null: virtual)
//       cone = 0.45,                //   half-angle (rad) round the bearing that counts as on the path
//       startR?,                    //   still at the start within this (default 0.4 x the first distance, at most seenDist)
//     },
//   })
//   director.update(dt, players, views?) -> events
//     players: [{ id, x, z, y?, alive? }]
//     views:   [{ frustum, focus: { x, y, z } }]; frustum is a THREE.Frustum or six
//              [nx, ny, nz, d] planes (inside when n . p + d >= 0)
//     events:  [{ type: 'placed' | 'moved' | 'met', id, index, x, z, b, how, t }]
//              (with a default path: the pre-placed ones come as 'placed', how 'default',
//              instance 'default'; 'met' says which instance; an instance taken off the path
//              comes as 'placed' with from: 'default')
//   director.markViews(views)       mark what the views see (update does this when given views)
//   director.markSphere(x, y, z, r) mark a ball (2D: a disc) as seen
//   director.seenAt(x, z) (3D: seenAt(x, y, z))
//   director.visibleNow(x, y, z, r) inside any view given last
//   director.state()  -> { t, index, phase, current, leader, breakLeft, seenCells, entries: [...] }
//   director.leader   -> { id, moving, reached } (cheap; null with no live player)
//   director.placeNow()             end the current break now (the order still holds)
//   director.force(id, x, z, b)     tests only: mark every earlier entry met ('forced') and place this one there
//   director.reset(seed?)           a new game
//   director.log                    the events so far
//   director.entry(id)              the live record of one entry ({ state, handle, x, z, ..., def })
//   director.portals()              the final entry's instances: [{ instance: 'default' | 'dynamic',
//                                   x, y, z, open, seen, state, handle }]; open once every earlier
//                                   entry is met (for the portal arrow: shared/landmark.js)
//   director.path                   the default path once laid ({ x, y, z, a, el, ux, uy, uz, dists, startR }) or null
//
// How to adopt it in another world
//   1. Keep scenery and ambient life (and avoidable static hazards: plants,
//      traps you can walk round) pre-placed as before; give the director only
//      the enemies and events, in order, ending with the boss + portal entry.
//   2. Give each entry place/met (and fits for its own footing). place must work
//      from hidden: an enemy is parked invisible and inactive until placed.
//   3. Create the director with the world's bounds, a cell about a third of the
//      view's width, seenDist about two view widths, and the calm/warm-up times.
//   4. Each frame call director.update(dt, players, views), with one view per
//      split-screen view (split.withView(i, camera, ...) then a frustum from
//      camera.projectionMatrix x camera.matrixWorldInverse, focus = what it
//      frames). Test runs that step without rendering should still update the
//      camera and pass views, or seen space is only the nearSeen discs.
//   5. director.reset() on a new game; expose director.state() for tests.
//   Springtail (game/springtail/main.js, `director`) is the first user.
//
// How to wire a world for the default path and the portal arrow
//   (the owner, 2026-11-01: a "Portal arrow" setting, default off, pointing at
//   the nearest portal with its distance; and a default path to a portal).
//   Phage (game/phage/main.js) is the worked example.
//   1. Default path: pass `defaultPath: { from: START, bearing, rush }` (3D: also
//      `elevation`; `dists` when the field is too small for a rush's spacing)
//      to createDirector. Pick a bearing that is not straight into the start
//      view (the pre-placed things should be out of sight at first).
//   2. place() is now also called on the first update for every entry, with
//      info.instance === 'default', before any encounter is due: it must work
//      then (the world built, the start pose set). If the world holds only one
//      object per encounter (a host, a boss), set `single: true` on the entry;
//      otherwise make place() return a fresh handle per call and give `drop`.
//   3. The portal now exists from the start but must stay shut until every
//      earlier encounter is met: gate entering it (and its "Y Enter" prompt
//      and open glow) on `director.index >= <the final entry's index>`
//      (equivalently portals()[k].open). Anything that keyed "the portal is
//      placed" (a goal line, the edge glow) should key "open" instead.
//   4. The arrow: each frame after rendering, if portalArrowOn() (shared/landmark.js),
//      draw one forward mark per view to that view's nearest portal with
//      `marks.drawSplit(split, (players) => ..., { kind: 'forward', portal: true })`,
//      the function returning { position, label } for the view's players
//      (label: the distance in the world's unit, "214 mm", "2.4 µm"). Point
//      at sealed portals too: they are where the way on will open (a world
//      with fixed portals: the nearest one; with the director: portals()).
//      Off (the default) nothing is drawn. Add a line to the world's README.
//   5. Tests: the route test without defaultPath still holds; add one that
//      follows the bearing (meets the pre-placed order) and one that heads off.

const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function planesOf(f) {
  if (!f) return null;
  const list = f.planes || f;
  return list.map((p) => (Array.isArray(p) ? p : [p.normal.x, p.normal.y, p.normal.z, p.constant]));
}
const sphereIn = (P, x, y, z, r) => {
  for (const p of P) if (p[0] * x + p[1] * y + p[2] * z + p[3] < -r) return false;
  return true;
};

export function createDirector(o) {
  const entries = o.entries;
  const cell = o.cell ?? 10;
  const three = o.mode === '3d';
  const B = o.bounds;
  const groundY = o.groundY ?? 0;
  const y0 = three ? B.y0 : 0, y1 = three ? B.y1 : cell;
  const nx = Math.max(1, Math.ceil((B.x1 - B.x0) / cell)), nz = Math.max(1, Math.ceil((B.z1 - B.z0) / cell)), ny = three ? Math.max(1, Math.ceil((y1 - y0) / cell)) : 1;
  const seen = new Uint8Array(nx * ny * nz);
  const seenDist = o.seenDist ?? 60, nearSeen = o.nearSeen ?? 6;
  const warmup = o.warmup ?? { sec: 4 }, calm = o.calm ?? { sec: 4 }, linger = o.linger ?? 8;
  const moveSpeed = o.moveSpeed ?? 2, passSec = o.passSec ?? 1.5, watchSec = o.watchSec ?? 20;
  const cellR = cell * (three ? 0.87 : 0.71);

  let t, idx, seenCount, views, rand, breakT0, breakMoved, breakDist, forceBreak, nextTry, prev, defDone, defCheckT, pending;
  // the default path (opts.defaultPath): resolved on first use
  const DP = o.defaultPath ? { cone: 0.45, ...o.defaultPath } : null;
  let path = null;
  const pl = new Map();
  const st = entries.map(() => ({}));
  const log = [];
  function reset(seed = o.seed ?? 1) {
    t = 0; idx = 0; seenCount = 0; views = []; rand = rng(seed);
    breakT0 = 0; breakMoved = 0; breakDist = 0; forceBreak = false; nextTry = 0; prev = null;
    defDone = !DP; defCheckT = 0; pending = []; path = null;
    seen.fill(0); pl.clear(); log.length = 0;
    entries.forEach((e, i) => { st[i] = { id: e.id, state: 'waiting', handle: null, x: 0, y: 0, z: 0, b: 0, placedT: null, metT: null, how: null, moves: 0, seenT: null, farT: 0, checkT: 0, seenNow: false, def: null, via: null }; });
  }
  reset();

  // ---- the grid
  const ci = (x) => Math.floor((x - B.x0) / cell), ck = (z) => Math.floor((z - B.z0) / cell), cj = (y) => (three ? Math.floor((y - y0) / cell) : 0);
  const at = (i, j, k) => i + nx * (k + nz * j);
  const ok = (i, j, k) => i >= 0 && k >= 0 && j >= 0 && i < nx && k < nz && j < ny;
  const centre = (i, j, k) => [B.x0 + (i + 0.5) * cell, three ? y0 + (j + 0.5) * cell : groundY, B.z0 + (k + 0.5) * cell];
  function mark(i, j, k) { const n = at(i, j, k); if (!seen[n]) { seen[n] = 1; seenCount++; } }
  /** Visit the cells whose centres lie within r (+ a cell's reach) of a point (fn gets one reused centre array). */
  const cc = [0, 0, 0];
  function cellsNear(x, y, z, r, fn) {
    const R = r + cellR, R2 = R * R;
    const i0 = ci(x - R), i1 = ci(x + R), k0 = ck(z - R), k1 = ck(z + R);
    const j0 = three ? cj(y - R) : 0, j1 = three ? cj(y + R) : 0;
    for (let j = Math.max(0, j0); j <= Math.min(ny - 1, j1); j++) {
      const cyv = three ? y0 + (j + 0.5) * cell : groundY, dy2 = three ? (cyv - y) * (cyv - y) : 0;
      for (let k = Math.max(0, k0); k <= Math.min(nz - 1, k1); k++) {
        const czv = B.z0 + (k + 0.5) * cell, dz2 = (czv - z) * (czv - z);
        if (dy2 + dz2 > R2) continue;
        for (let i = Math.max(0, i0); i <= Math.min(nx - 1, i1); i++) {
          const cxv = B.x0 + (i + 0.5) * cell;
          if ((cxv - x) * (cxv - x) + dy2 + dz2 > R2) continue;
          cc[0] = cxv; cc[1] = cyv; cc[2] = czv;
          if (fn(i, j, k, cc) === false) return false;
        }
      }
    }
    return true;
  }
  function markSphere(x, y, z, r) { cellsNear(x, y ?? groundY, z, r, (i, j, k) => { mark(i, j, k); }); }
  function markViews(list) {
    views = (list || []).map((v) => ({ P: planesOf(v.frustum), f: v.focus }));
    for (const v of views) {
      if (!v.P || !v.f) continue;
      cellsNear(v.f.x, v.f.y ?? groundY, v.f.z, seenDist, (i, j, k, c) => {
        if (!seen[at(i, j, k)] && sphereIn(v.P, c[0], c[1], c[2], cellR)) mark(i, j, k);
      });
    }
  }
  function seenAt(x, a, b) {
    const [px, py, pz] = three ? [x, a, b] : [x, groundY, a];
    const i = ci(px), j = cj(py), k = ck(pz);
    return ok(i, j, k) ? !!seen[at(i, j, k)] : false;
  }
  const visibleNow = (x, y, z, r) => views.some((v) => v.P && sphereIn(v.P, x, y, z, r));
  const anySeen = (x, y, z, r) => !cellsNear(x, y, z, r, (i, j, k) => !seen[at(i, j, k)]);

  // ---- players
  function trackPlayers(dt, players) {
    for (const p of players) {
      let q = pl.get(p.id);
      if (!q) pl.set(p.id, (q = { id: p.id, x: p.x, y: p.y ?? groundY, z: p.z, vx: 0, vy: 0, vz: 0, hx: 0, hy: 0, hz: 0, heading: false, moving: false, odo: 0, reached: idx, alive: true, src: p }));
      const y = p.y ?? groundY;
      const dx = p.x - q.x, dy = three ? y - q.y : 0, dz = p.z - q.z;
      const step = Math.hypot(dx, dy, dz);
      // a respawn (a jump of more than a few units in one frame) is not travel
      const jumped = dt > 0 && step > Math.max(30 * cell, 400 * dt);
      if (dt > 0 && !jumped) {
        const k = 1 - Math.exp(-dt * 2);
        q.vx += (dx / dt - q.vx) * k; q.vy += (dy / dt - q.vy) * k; q.vz += (dz / dt - q.vz) * k;
        q.odo += step;
      }
      q.x = p.x; q.y = y; q.z = p.z; q.alive = p.alive !== false; q.src = p;
      const sp = Math.hypot(q.vx, q.vy, q.vz);
      q.moving = q.alive && sp > moveSpeed;
      if (q.moving) { q.hx = q.vx / sp; q.hy = q.vy / sp; q.hz = q.vz / sp; q.heading = true; }
      if (q.alive && nearSeen > 0) markSphere(q.x, q.y, q.z, nearSeen);
    }
    for (const id of [...pl.keys()]) if (!players.some((p) => p.id === id)) pl.delete(id);
  }
  const live = () => [...pl.values()].filter((q) => q.alive);
  function leader() {
    let L = null;
    for (const q of live()) {
      if (!L) { L = q; continue; }
      const a = o.progress ? o.progress(q.src) : q.odo, b = o.progress ? o.progress(L.src) : L.odo;
      if (q.reached > L.reached || (q.reached === L.reached && a > b)) L = q;
    }
    return L;
  }
  const dist = (q, s) => (three ? Math.hypot(q.x - s.x, q.y - s.y, q.z - s.z) : Math.hypot(q.x - s.x, q.z - s.z));

  // ---- placement
  const vis = (e) => e.visible ?? e.size;
  /** The discs (balls) of an entry placed at (x, y, z, b) that can be seen: [[x, y, z, r], ...]. */
  const partsOf = (e, x, y, z, b) => (e.parts ? e.parts(x, z, b, y).map(([px, pz, r, py]) => [px, py ?? y, pz, r]) : [[x, y, z, vis(e)]]);
  const partSeen = (P) => P.some(([px, py, pz, r]) => anySeen(px, py, pz, r));
  const partInView = (e, P) => { const top = e.top || 0; return P.some(([px, py, pz, r]) => visibleNow(px, three ? py : groundY + top / 2, pz, Math.max(r, top / 2))); };
  function valid(e, x, y, z, b) {
    if (x < B.x0 || x > B.x1 || z < B.z0 || z > B.z1 || (three && (y < y0 || y > y1))) return false;
    const P = partsOf(e, x, y, z, b);
    for (const q of live()) for (const [px, py, pz, r] of P) if ((three ? Math.hypot(q.x - px, q.y - py, q.z - pz) : Math.hypot(q.x - px, q.z - pz)) < r + nearSeen + 1) return false;
    for (let i = 0; i < entries.length; i++) {
      const s = st[i], D = s.def;
      if (entries[i].virtual) continue;
      if (s.state === 'placed' && entries[i] !== e && Math.hypot(s.x - x, s.z - z, three ? s.y - y : 0) < e.size + entries[i].size) return false;
      // (a default-path instance of an entry still to come; not the one a single entry is about to leave)
      if (D && D.state === 'placed' && i >= idx && !(entries[i] === e && e.single) && Math.hypot(D.x - x, D.z - z, three ? D.y - y : 0) < e.size + entries[i].size) return false;
    }
    if (partSeen(P) || partInView(e, P)) return false;
    if (e.fits && !e.fits(x, z, b, y)) return false;
    if (o.canPlace && !o.canPlace(x, z, e.size, { y, b, entry: e })) return false;
    return true;
  }
  function candidates(L, lo, hi, offs, base, nd) {
    const out = [];
    for (const off of offs) for (let n = 0; n < nd; n++) {
      const d = lo + ((hi - lo) * n) / Math.max(1, nd - 1);
      const a = base + off + (rand() - 0.5) * 0.18;
      out.push({ a, d, score: (d - lo) / Math.max(1, hi - lo) + Math.abs(off) / (Math.PI / 2) });
    }
    return out.sort((p, q) => p.score - q.score);
  }
  function findSpot(e, L) {
    if (e.virtual) return { x: L.x, y: L.y, z: L.z, b: L.heading ? Math.atan2(L.hz, L.hx) : 0, how: 'virtual' };
    const idle = !L.moving;
    const lo = idle ? e.minNear ?? e.minAhead : e.minAhead, hi = idle ? e.maxNear ?? e.maxAhead : e.maxAhead;
    const dir = L.heading ? Math.atan2(L.hz, L.hx) : 0;
    // 3D: around the leader's own climb or dive (heading straight up or down meets things too), then above and below it
    const el0 = three && L.heading ? Math.asin(Math.max(-1, Math.min(1, L.hy))) : 0;
    const elev = three ? [el0, el0 + 0.35, el0 - 0.35] : [0];
    if (three && Math.abs(el0) > 0.5) elev.push(0, -0.35 * Math.sign(el0)); // (and level, when climbing or diving steeply)
    const tryList = (list, how) => {
      for (const c of list) for (const el of elev) {
        const ce = Math.cos(el);
        const x = L.x + Math.cos(c.a) * c.d * ce, z = L.z + Math.sin(c.a) * c.d * ce, y = three ? L.y + Math.sin(el) * c.d : groundY;
        if (valid(e, x, y, z, c.a)) return { x, y, z, b: c.a, how };
      }
      return null;
    };
    const ahead = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4, 1.75, -1.75];
    const round = Array.from({ length: 16 }, (_, i) => (i ? (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (TAU / 16) : 0));
    let s = null;
    if (!idle) s = tryList(candidates(L, lo, hi, ahead, dir, 5), 'ahead');
    if (!s) s = tryList(candidates(L, lo, hi, round, dir, 5), idle ? 'near' : 'around');
    if (!s) s = tryList(candidates(L, hi, hi * 3, Array.from({ length: 24 }, (_, i) => (i * TAU) / 24), dir, 6), 'wider');
    if (!s) {
      // the nearest unseen spot anywhere (cell centres, nearest first)
      const list = [];
      for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
        if (seen[at(i, j, k)]) continue;
        const c = centre(i, j, k);
        const d = three ? Math.hypot(c[0] - L.x, c[1] - L.y, c[2] - L.z) : Math.hypot(c[0] - L.x, c[2] - L.z);
        if (d >= lo * 0.5) list.push([d, c]);
      }
      list.sort((p, q) => p[0] - q[0]);
      for (const [, c] of list) {
        const b = Math.atan2(c[2] - L.z, c[0] - L.x);
        if (valid(e, c[0], c[1], c[2], b)) { s = { x: c[0], y: c[1], z: c[2], b, how: 'anywhere' }; break; }
      }
    }
    return s;
  }
  function put(i, s, L, type, reuse = false) {
    const e = entries[i], S = st[i];
    const info = { y: s.y, leader: L ? L.id : null, how: s.how, instance: 'dynamic' };
    // (reuse: a single entry's default-path instance taken off the path and put here instead)
    S.handle = (type === 'moved' || reuse) && e.move ? e.move(S.handle, s.x, s.z, s.b, info) : e.place(s.x, s.z, s.b, info);
    Object.assign(S, { state: 'placed', x: s.x, y: s.y, z: s.z, b: s.b, how: s.how });
    if (type === 'placed') S.placedT = t; else S.moves++;
    return emit({ type, id: e.id, index: i, x: +s.x.toFixed(1), z: +s.z.toFixed(1), b: +s.b.toFixed(3), how: s.how, ...(reuse ? { from: 'default' } : {}) });
  }

  // ---- the default path (opts.defaultPath)
  /** Resolve the path (its origin: `from`, else the first live player) and pre-place every entry along it. */
  function ensureDefault(L) {
    if (defDone) return;
    const from = DP.from || (L ? { x: L.x, y: L.y, z: L.z } : null);
    if (!from) return;
    defDone = true;
    const a = DP.bearing ?? rand() * TAU, el = three ? DP.elevation ?? 0 : 0;
    path = { x: from.x, y: three ? from.y ?? groundY : groundY, z: from.z, a, el, ux: Math.cos(el) * Math.cos(a), uy: Math.sin(el), uz: Math.cos(el) * Math.sin(a), cos: Math.cos(DP.cone) };
    // the distances a rush meets them at: each break at `rush` units/s, then the middle of its ahead range
    const rush = DP.rush ?? moveSpeed * 5;
    let d = 0;
    const dists = entries.map((e, i) => {
      const cfg = e.calm ?? (i === 0 ? warmup : calm);
      d += rush * cfg.sec;
      if (e.virtual) return null;
      d += (e.minAhead + e.maxAhead) / 2;
      const v = DP.dists ? DP.dists[i] : d;
      if (DP.dists && v != null) d = v;
      return v;
    });
    path.dists = dists;
    path.startR = DP.startR ?? Math.min(seenDist, (dists.find((x) => x != null) ?? seenDist) * 0.4);
    const offs = [0];
    for (let k = 1; k * 0.12 <= DP.cone * 0.9; k++) offs.push(k * 0.12, -k * 0.12);
    const muls = [1, 1.08, 0.92, 1.16, 0.84, 1.25];
    entries.forEach((e, i) => {
      if (e.virtual || dists[i] == null) return;
      let s = null;
      for (const m of muls) { for (const da of offs) { for (const de of three ? offs.slice(0, 5) : [0]) {
        const dd = dists[i] * m, aa = a + da, ee = el + de, ce = Math.cos(ee);
        const x = path.x + Math.cos(aa) * ce * dd, z = path.z + Math.sin(aa) * ce * dd, y = three ? path.y + Math.sin(ee) * dd : groundY;
        if (valid(e, x, y, z, aa)) { s = { x, y, z, b: aa }; break; }
      } if (s) break; } if (s) break; }
      if (!s) return; // nowhere on the path suits it: this entry is placed as you go only
      const handle = e.place(s.x, s.z, s.b, { y: s.y, leader: null, how: 'default', instance: 'default' });
      st[i].def = { state: 'placed', handle, x: s.x, y: s.y, z: s.z, b: s.b, placedT: t, seenT: null, near: false, farT: 0 };
      const ev = { type: 'placed', id: e.id, index: i, x: +s.x.toFixed(1), z: +s.z.toFixed(1), b: +s.b.toFixed(3), how: 'default', instance: 'default', t: +t.toFixed(2) };
      log.push(ev); pending.push(ev);
    });
  }
  /** Is the leader on the default path to D: still at the start, inside the cone round the bearing, close to D, or heading for it? */
  function onPath(L, D, e) {
    const rx = L.x - path.x, ry = three ? L.y - path.y : 0, rz = L.z - path.z, rl = Math.hypot(rx, ry, rz);
    if (rl < path.startR || (rx * path.ux + ry * path.uy + rz * path.uz) / rl >= path.cos) return true;
    const dx = D.x - L.x, dy = three ? D.y - L.y : 0, dz = D.z - L.z, dl = Math.hypot(dx, dy, dz) || 1;
    if (dl < e.minAhead + vis(e)) return true;
    return L.moving && (dx * L.hx + dy * L.hy + dz * L.hz) / dl >= path.cos;
  }
  /** Seen-and-left-alone for a record R (an entry's dynamic instance or its default one): 'passed', 'watched' or null. */
  function leftAlone(e, R, dt, needNear) {
    const passDist = o.passDist ?? e.size + 2 * seenDist, watchDist = o.watchDist ?? e.size + seenDist;
    const all = live();
    if (needNear && !R.near) return null;
    if (all.every((q) => dist(q, R) > passDist)) R.farT += dt; else R.farT = 0;
    if (R.farT >= passSec) return 'passed';
    if (t - R.seenT >= watchSec && all.some((q) => dist(q, R) < watchDist)) return 'watched';
    return null;
  }
  /** Drop an unseen instance (the world's `drop`, when it has one). */
  function dropRec(e, R) {
    if (!R || R.state !== 'placed') return;
    if (R.seenT !== null) return; // seen: it stays where it is
    if (e.drop) e.drop(R.handle);
    R.state = 'dropped';
  }
  let events = [];
  function emit(ev) { ev.t = +t.toFixed(2); events.push(ev); log.push(ev); if (log.length > 400) log.shift(); return ev; }
  function setMet(i, how, who, via = 'dynamic') {
    const S = st[i], e = entries[i], D = S.def;
    const at = via === 'default' ? D : S;
    // the instance not met: dropped if nobody has seen it, else left where it is
    if (via === 'default') { if (S.state === 'placed') dropRec(e, S); }
    else if (D && D.state === 'placed' && !e.single) dropRec(e, D);
    if (via === 'default') D.state = 'met';
    S.state = 'met'; S.metT = t; S.how = how; S.via = via;
    for (const q of who) q.reached = Math.max(q.reached, i + 1);
    emit({ type: 'met', id: e.id, index: i, how, by: who.map((q) => q.id), ...(D ? { instance: via } : {}) });
    prev = { x: at.x, y: at.y, z: at.z, r: e.virtual ? 0 : e.size };
    idx = i + 1; breakT0 = t; breakMoved = 0; breakDist = 0; forceBreak = false;
  }

  function update(dt, players, viewList) {
    events = pending; pending = [];
    t += dt;
    if (viewList) markViews(viewList);
    trackPlayers(dt, players || []);
    if (!defDone) ensureDefault(leader());
    if (path && t >= defCheckT) {
      // the default-path instances: when first seen, and whether anyone has come near
      defCheckT = t + 0.25;
      for (let i = 0; i < entries.length; i++) {
        const D = st[i].def, e = entries[i];
        if (!D || D.state !== 'placed') continue;
        if (D.seenT === null) { const P = partsOf(e, D.x, D.y, D.z, D.b); if (partInView(e, P) || partSeen(P)) D.seenT = t; }
        if (!D.near && live().some((q) => dist(q, D) < (o.watchDist ?? e.size + seenDist))) D.near = true;
      }
    }
    if (idx >= entries.length) return events;
    const e = entries[idx], S = st[idx], L = leader();
    if (!L) return events;
    const D = S.def && S.def.state === 'placed' ? S.def : null;
    if (D) {
      const who = live().filter((q) => e.met(D.handle, [q.src]));
      if (who.length) { setMet(idx, 'met', who, 'default'); return events; }
    }
    if (S.state === 'waiting') {
      const outside = !prev || dist(L, prev) > prev.r;
      if (L.moving && outside) { breakMoved += dt; breakDist += Math.hypot(L.vx, L.vy, L.vz) * dt; }
      const cfg = e.calm ?? (idx === 0 ? warmup : calm);
      if (D) {
        // the default path: while the leader follows it (and is not lingering) this entry is the one on it
        const lingered = !L.moving && t - breakT0 >= cfg.sec + linger;
        const seenSingle = e.single && D.seenT !== null;
        if ((onPath(L, D, e) && !lingered) || seenSingle) {
          if (D.seenT !== null && !e.final) { const how = leftAlone(e, D, dt, !seenSingle); if (how) setMet(idx, how, how === 'watched' ? live().filter((q) => dist(q, D) < (o.watchDist ?? e.size + seenDist)) : [], 'default'); }
          return events;
        }
      }
      const done = forceBreak || breakMoved >= cfg.sec || (cfg.dist !== undefined && breakDist >= cfg.dist) || t - breakT0 >= cfg.sec + linger;
      if (done && t >= nextTry) {
        const s = findSpot(e, L);
        if (!s) nextTry = t + 0.25;
        else if (D && e.single) { S.handle = D.handle; D.state = 'dropped'; put(idx, s, L, 'placed', true); } // the one instance leaves the path (nobody has seen it)
        else put(idx, s, L, 'placed');
      }
      return events;
    }
    // placed: has anyone met it?
    const who = live().filter((q) => e.met(S.handle, [q.src]));
    if (who.length) { setMet(idx, 'met', who); return events; }
    if (e.virtual) return events;
    if (t >= S.checkT) {
      S.checkT = t + 0.25;
      const P = partsOf(e, S.x, S.y, S.z, S.b);
      S.seenNow = partInView(e, P);
      if (S.seenT === null && (S.seenNow || partSeen(P))) S.seenT = t;
    }
    if (S.seenT === null) {
      // never seen: it may still be moved to meet the leader where they are going
      const d = dist(L, S), toIt = Math.atan2(S.z - L.z, S.x - L.x);
      const away = d > e.minAhead && (d > (L.moving ? e.maxAhead : e.maxNear ?? e.maxAhead) * 1.6 || (L.moving && Math.abs(wrap(toIt - Math.atan2(L.hz, L.hx))) > 1.9) || (!L.moving && t - S.placedT > linger && d > (e.maxNear ?? e.maxAhead) * 1.2));
      if (away && t >= nextTry) {
        S.state = 'moving'; // keep itself out of its own clearance test
        const s = findSpot(e, L);
        S.state = 'placed';
        nextTry = t + 0.5;
        // only to somewhere that suits the leader better (nearer, or ahead where it was behind)
        const better = s && (dist(L, s) < d - cell || (L.moving && Math.abs(wrap(Math.atan2(s.z - L.z, s.x - L.x) - Math.atan2(L.hz, L.hx))) < 1.2 && Math.abs(wrap(toIt - Math.atan2(L.hz, L.hx))) > 1.9));
        if (better) put(idx, s, L, 'moved');
      }
      return events;
    }
    if (e.final) return events;
    // seen and left alone: it is never moved, so it counts as met once everyone has left it behind, or watched it a while
    const how = leftAlone(e, S, dt, false);
    if (how) setMet(idx, how, how === 'watched' ? live().filter((q) => dist(q, S) < (o.watchDist ?? e.size + seenDist)) : []);
    return events;
  }

  return {
    update, markViews, markSphere, seenAt, visibleNow, reset, log,
    get index() { return idx; },
    get done() { return idx >= entries.length; },
    /** The leader now: { id, moving, reached } or null. */
    get leader() { const L = leader(); return L ? { id: L.id, moving: L.moving, reached: L.reached } : null; },
    entry(id) { return st[entries.findIndex((e) => e.id === id)] || null; },
    state() {
      const L = leader();
      const e = entries[idx], cfg = e ? e.calm ?? (idx === 0 ? warmup : calm) : null;
      return {
        t: +t.toFixed(2), index: idx, current: e ? e.id : null,
        phase: !e ? 'done' : st[idx].state === 'waiting' ? (idx === 0 ? 'warmup' : 'break') : 'placed',
        breakLeft: e && st[idx].state === 'waiting' ? +Math.max(0, cfg.sec - breakMoved).toFixed(2) : 0,
        leader: L ? { id: L.id, moving: L.moving, reached: L.reached } : null,
        seenCells: seenCount, cells: seen.length,
        entries: st.map((s) => ({ id: s.id, state: s.state, x: +s.x.toFixed(1), z: +s.z.toFixed(1), b: +s.b.toFixed(3), placedT: s.placedT, metT: s.metT, how: s.how, moves: s.moves, seenT: s.seenT,
          ...(path ? { via: s.via, def: s.def && { state: s.def.state, x: +s.def.x.toFixed(1), y: +s.def.y.toFixed(1), z: +s.def.z.toFixed(1), seenT: s.def.seenT } } : {}) })),
        ...(path ? { path: { x: path.x, y: path.y, z: path.z, bearing: +path.a.toFixed(3), elevation: +path.el.toFixed(3), cone: DP.cone, startR: +path.startR.toFixed(1), dists: path.dists.map((d) => (d == null ? null : +d.toFixed(1))) } } : {}),
      };
    },
    /**
     * Every portal (the final entry's instances): the default-path one (from the start, with a
     * defaultPath) and the one placed as you go, if any: [{ instance, x, y, z, open, seen, state, handle }].
     * open: every earlier entry is met. Seen ones are never moved.
     */
    portals() {
      if (!defDone && DP && DP.from) ensureDefault(null);
      const fi = entries.findIndex((e) => e.final);
      if (fi < 0) return [];
      const S = st[fi], D = S.def, out = [], open = idx >= fi;
      if (D && (D.state === 'placed' || D.state === 'met')) out.push({ instance: 'default', x: D.x, y: D.y, z: D.z, open, seen: D.seenT !== null, state: D.state, handle: D.handle });
      if (S.state === 'placed' || (S.state === 'met' && S.via !== 'default')) out.push({ instance: 'dynamic', x: S.x, y: S.y, z: S.z, open, seen: S.seenT !== null, state: S.state, handle: S.handle });
      return out;
    },
    /** The default path once resolved: { x, y, z, a, el, ux, uy, uz, dists, startR } or null. */
    get path() { return path; },
    placeNow() { if (idx < entries.length && st[idx].state === 'waiting') { forceBreak = true; nextTry = 0; return true; } return false; },
    force(id, x, z, b = 0) {
      const i = entries.findIndex((e) => e.id === id);
      if (i < 0) return null;
      for (let k = idx; k < i; k++) if (st[k].state !== 'met') { st[k].state = 'met'; st[k].metT = t; st[k].how = 'forced'; }
      idx = i;
      const D = st[i].def;
      if (entries[i].single && D && D.state === 'placed') D.state = 'dropped'; // (its one object goes there)
      return put(i, { x, y: groundY, z, b, how: 'forced' }, null, 'placed');
    },
  };
}
