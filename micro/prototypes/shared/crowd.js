// A crowd you push and bite through: a few hundred small soft bodies (one
// InstancedMesh) that drift and jostle, part round a player who moves into
// them, and are cleared by a bite (eaten and shrinking away, or scattered).
//
// The owner: "crowds you can fight through by moving and attacking, so moving
// and attacking should clear your way without too much difficulty, and don't
// implement any time limits". So moving shoves members aside hard (they are
// pushed out of the player's body at once and the ones ahead part early), a
// bite clears a cone, and nothing in here ever times the player.
//
//   import { createCrowd } from '../shared/crowd.js';
//   const crowd = createCrowd({ scene, THREE, count: 450,
//     bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },   // or region: { x, z, r }
//     radius: 0.6, height: (x, z) => terrainHeight(x, z), color: '#9fb38a' });
//   ... each frame:
//   crowd.update(dt, players.map((p) => ({ position: p.mesh.position, radius: 1.2, slot: p.slot })));
//   ... on an attack:
//   const eaten = crowd.bite(p.mesh.position, facing /* {x, z} */, 3);
//
// 2D worlds (a microscope field in the x-y plane, camera looking down -z):
//   createCrowd({ ..., mode: '2d', bounds: { minX, maxX, minY, maxY } | region: { x, y, r }, z: 0 })
//   and positions / directions use { x, y }.
//
// API
//   createCrowd({ scene, THREE, count = 400, bounds | region, radius = 0.5,
//     height(x, z)?    3D: the surface under a member (members sit on it)
//     mesh?            an InstancedMesh (count >= count) in the world's own look,
//                      or geometry? / material? to build one; default a soft blob
//     color?           default material colour (with a little per-member variation)
//     mode = '3d'      '3d': x-z plane, y up; '2d': x-y plane, z towards the camera
//     z = 0            2D: the members' depth
//     speed            wander speed (default 0.8 x radius per second)
//     flow             { x, z } (or { x, y }) a steady current, units per second
//     playerRadius     default body radius of a player (3 x radius)
//     respawn = 6      seconds before an eaten member reappears, away from every
//                      player (Infinity: eaten for good); the crowd never refills
//                      round a player
//     sit = 0.8        3D: how far above the surface the centre sits (x radius)
//   }) -> crowd
//   crowd.update(dt, players, { flow? }) players: [{ position, radius?, velocity?, slot? }]
//   crowd.bite(pos, dir, reach = 4 x radius, { angle = 0.9 rad half-angle, eat = true })
//       -> how many members were eaten (eat: false scatters them instead).
//       Members in the cone are eaten (or flung away); those just round it scatter.
//   crowd.mesh       the InstancedMesh (add it to more scenes, hide it, ...)
//   crowd.members    { count, x, y | z (Float32Array), vx, vy | vz, life (0 gone .. 1 there),
//                      alive(i), position(i, out) }
//   crowd.alive      members present now
//   crowd.dispose()
//
// Cost: a counting-sort spatial hash rebuilt each step (cells of 2 radii),
// pairwise separation over 3x3 cells, players queried through the same hash,
// and the instance matrices written straight into the buffer: well under
// 1 ms for 600 members.

const TAU = Math.PI * 2;

export function createCrowd(opts = {}) {
  const { scene, THREE } = opts;
  const is2d = opts.mode === '2d';
  const N = Math.max(1, (opts.count ?? 400) | 0);
  const R = opts.radius ?? 0.5;
  const height = !is2d && typeof opts.height === 'function' ? opts.height : null;
  const zDepth = opts.z ?? 0;
  const sit = opts.sit ?? 0.8;
  const speed = opts.speed ?? 0.8 * R;
  const playerR = opts.playerRadius ?? 3 * R;
  const respawn = opts.respawn ?? 6;
  let flow = opts.flow || null;

  // The area: a box or a circle, in plane coordinates (u, v) = (x, z) or (x, y).
  const V = is2d ? 'y' : 'z';
  let box, circle = null;
  if (opts.region) {
    const r = opts.region;
    circle = { u: r.x, v: r[V] ?? 0, r: r.r };
    box = { u0: circle.u - circle.r, u1: circle.u + circle.r, v0: circle.v - circle.r, v1: circle.v + circle.r };
  } else {
    const b = opts.bounds || { minX: -20, maxX: 20, minZ: -20, maxZ: 20, minY: -20, maxY: 20 };
    const v0 = is2d ? b.minY : b.minZ, v1 = is2d ? b.maxY : b.maxZ;
    box = { u0: b.minX, u1: b.maxX, v0: v0 ?? -20, v1: v1 ?? 20 };
  }
  const inside = (u, v) => (circle ? (u - circle.u) ** 2 + (v - circle.v) ** 2 <= circle.r ** 2 : u >= box.u0 && u <= box.u1 && v >= box.v0 && v <= box.v1);

  // Members.
  const pu = new Float32Array(N), pv = new Float32Array(N);
  const vu = new Float32Array(N), vv = new Float32Array(N);
  const heading = new Float32Array(N), phase = new Float32Array(N), size = new Float32Array(N);
  const life = new Float32Array(N);   // 0 gone .. 1 there (scale)
  const state = new Uint8Array(N);    // 0 alive, 1 dying, 2 gone, 3 arriving
  const timer = new Float32Array(N);
  const py = new Float32Array(N);     // 3D: cached surface height
  const hu = new Float32Array(N), hv = new Float32Array(N); // where py was sampled
  let seed = (opts.seed ?? 1234567) >>> 0 || 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function randomPoint(out) {
    for (let k = 0; k < 30; k++) {
      const u = box.u0 + rnd() * (box.u1 - box.u0), v = box.v0 + rnd() * (box.v1 - box.v0);
      if (inside(u, v)) { out[0] = u; out[1] = v; return out; }
    }
    out[0] = circle ? circle.u : (box.u0 + box.u1) / 2; out[1] = circle ? circle.v : (box.v0 + box.v1) / 2;
    return out;
  }
  const pt = [0, 0];
  for (let i = 0; i < N; i++) {
    randomPoint(pt);
    pu[i] = pt[0]; pv[i] = pt[1];
    heading[i] = rnd() * TAU; phase[i] = rnd() * TAU; size[i] = 0.85 + rnd() * 0.3;
    life[i] = 1;
    hu[i] = 1e30;
  }

  // Spatial hash over the box: cells of at least 2 radii, at most ~16k cells.
  const area = (box.u1 - box.u0) * (box.v1 - box.v0);
  const cell = Math.max(2 * R, Math.sqrt(area / 16000));
  const gw = Math.max(1, Math.ceil((box.u1 - box.u0) / cell)), gh = Math.max(1, Math.ceil((box.v1 - box.v0) / cell));
  const cellCount = new Int32Array(gw * gh), cellStart = new Int32Array(gw * gh + 1), sorted = new Int32Array(N), cellOf = new Int32Array(N);
  const cx = (u) => Math.min(gw - 1, Math.max(0, ((u - box.u0) / cell) | 0));
  const cy = (v) => Math.min(gh - 1, Math.max(0, ((v - box.v0) / cell) | 0));
  function rebuild() {
    cellCount.fill(0);
    for (let i = 0; i < N; i++) {
      if (state[i] === 2) { cellOf[i] = -1; continue; }
      const c = cy(pv[i]) * gw + cx(pu[i]);
      cellOf[i] = c; cellCount[c]++;
    }
    let s = 0;
    for (let c = 0; c < cellCount.length; c++) { cellStart[c] = s; s += cellCount[c]; }
    cellStart[cellCount.length] = s;
    cellCount.fill(0);
    for (let i = 0; i < N; i++) { const c = cellOf[i]; if (c >= 0) sorted[cellStart[c] + cellCount[c]++] = i; }
  }
  /** Calls fn(i) for members in cells overlapping the square of half-size r round (u, v). */
  function query(u, v, r, fn) {
    const x0 = cx(u - r), x1 = cx(u + r), y0 = cy(v - r), y1 = cy(v + r);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = y * gw + x;
      for (let k = cellStart[c], e = cellStart[c] + cellCount[c]; k < e; k++) fn(sorted[k]);
    }
  }

  // Mesh.
  let ownGeo = null, ownMat = null, mesh = opts.mesh && opts.mesh.isInstancedMesh ? opts.mesh : null;
  if (!mesh) {
    ownGeo = opts.geometry || null;
    if (!ownGeo) {
      ownGeo = new THREE.IcosahedronGeometry(R, 2);
      ownGeo.scale(1, is2d ? 1 : 0.8, is2d ? 0.8 : 1);
    }
    ownMat = opts.material || new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0 });
    mesh = new THREE.InstancedMesh(ownGeo, ownMat, N);
    if (!opts.material) {
      const base = new THREE.Color(opts.color || '#a9bf8e'), c = new THREE.Color();
      for (let i = 0; i < N; i++) {
        c.copy(base).offsetHSL((rnd() - 0.5) * 0.04, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.12);
        mesh.setColorAt(i, c);
      }
    }
  }
  if (opts.geometry) ownGeo = null; // the world's: not ours to dispose
  if (opts.material) ownMat = null;
  mesh.count = N;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.name = mesh.name || 'crowd';
  // Bounds for per-view frustum culling: the whole area (members never leave it).
  {
    let yMin = 0, yMax = 0;
    if (height) {
      yMin = Infinity; yMax = -Infinity;
      for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) {
        const h = height(box.u0 + (box.u1 - box.u0) * a / 6, box.v0 + (box.v1 - box.v0) * b / 6);
        if (Number.isFinite(h)) { yMin = Math.min(yMin, h); yMax = Math.max(yMax, h); }
      }
      if (!Number.isFinite(yMin)) { yMin = 0; yMax = 0; }
    }
    const pad = 3 * R;
    const c = new THREE.Vector3((box.u0 + box.u1) / 2, is2d ? (box.v0 + box.v1) / 2 : (yMin + yMax) / 2, is2d ? zDepth : (box.v0 + box.v1) / 2);
    const half = Math.hypot((box.u1 - box.u0) / 2, (box.v1 - box.v0) / 2, (yMax - yMin) / 2 + 4 * (yMax - yMin + 1)) + pad;
    mesh.boundingSphere = new THREE.Sphere(c, half);
    if (mesh.computeBoundingSphere) mesh.computeBoundingSphere = () => {}; // keep ours
  }
  if (scene && !mesh.parent) scene.add(mesh);

  // ------------------------------------------------------------------ update
  const lastPlayer = new Map();
  let time = 0;
  const minGap = 2 * R * 0.92;

  function writeMatrices() {
    const a = mesh.instanceMatrix.array;
    for (let i = 0; i < N; i++) {
      const o = i * 16;
      const l = life[i];
      const sp = Math.hypot(vu[i], vv[i]);
      const wob = 0.06 * Math.sin(time * 3.1 + phase[i]);
      const st = Math.min(0.35, sp / (8 * R + 1e-6));        // stretch along the motion
      const s = size[i] * l;
      const sf = s * (1 + st + wob), ss = s * (1 - 0.5 * st - wob * 0.5), su = s * (1 - 0.3 * st + wob * 0.6);
      const h = heading[i], ch = Math.cos(h), sh = Math.sin(h);
      if (is2d) {
        a[o] = ch * sf; a[o + 1] = sh * sf; a[o + 2] = 0; a[o + 3] = 0;
        a[o + 4] = -sh * ss; a[o + 5] = ch * ss; a[o + 6] = 0; a[o + 7] = 0;
        a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = su; a[o + 11] = 0;
        a[o + 12] = pu[i]; a[o + 13] = pv[i]; a[o + 14] = zDepth; a[o + 15] = 1;
      } else {
        a[o] = ch * sf; a[o + 1] = 0; a[o + 2] = sh * sf; a[o + 3] = 0;
        a[o + 4] = 0; a[o + 5] = su; a[o + 6] = 0; a[o + 7] = 0;
        a[o + 8] = -sh * ss; a[o + 9] = 0; a[o + 10] = ch * ss; a[o + 11] = 0;
        a[o + 12] = pu[i]; a[o + 13] = py[i] + sit * R * su / Math.max(1e-6, size[i]); a[o + 14] = pv[i]; a[o + 15] = 1;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function surface(i) {
    if (!height) { py[i] = 0; return; }
    if (Math.abs(pu[i] - hu[i]) + Math.abs(pv[i] - hv[i]) < 0.25 * R) return;
    const h = height(pu[i], pv[i]);
    py[i] = Number.isFinite(h) ? h : py[i];
    hu[i] = pu[i]; hv[i] = pv[i];
  }

  function step(dt, players) {
    time += dt;
    const fu = flow ? flow.x || 0 : 0, fv = flow ? flow[V] || 0 : 0;
    const damp = 1 - Math.exp(-dt * 2.5);

    // Life cycle: dying -> gone -> arriving (away from every player) -> alive.
    for (let i = 0; i < N; i++) {
      const s = state[i];
      if (s === 1) { life[i] -= dt / 0.35; if (life[i] <= 0) { life[i] = 0; state[i] = 2; timer[i] = respawn; } }
      else if (s === 2) {
        if (!Number.isFinite(respawn)) continue;
        if ((timer[i] -= dt) > 0) continue;
        randomPoint(pt);
        let ok = true;
        for (const p of players) { const d = Math.hypot(pt[0] - p.position.x, pt[1] - p.position[V]); if (d < 10 * R + (p.radius ?? playerR) * 3) { ok = false; break; } }
        if (!ok) { timer[i] = 0.5; continue; }
        pu[i] = pt[0]; pv[i] = pt[1]; vu[i] = vv[i] = 0; hu[i] = 1e30; state[i] = 3; life[i] = 0;
      } else if (s === 3) { life[i] += dt / 1.2; if (life[i] >= 1) { life[i] = 1; state[i] = 0; } }
    }

    // Drift: a slow random walk of each member's heading, plus the current.
    for (let i = 0; i < N; i++) {
      if (state[i] === 2) continue;
      phase[i] += dt * (0.7 + 0.3 * size[i]);
      const turn = Math.sin(phase[i] * 0.83 + i) * 0.9 + (rnd() - 0.5) * 0.6;
      const want = Math.atan2(vv[i] - fv * 0.5, vu[i] - fu * 0.5);
      const wu = Math.cos(heading[i] + turn * dt), wv = Math.sin(heading[i] + turn * dt);
      vu[i] += (wu * speed + fu - vu[i]) * damp + (rnd() - 0.5) * speed * 0.6 * dt * 10;
      vv[i] += (wv * speed + fv - vv[i]) * damp + (rnd() - 0.5) * speed * 0.6 * dt * 10;
      if (Math.hypot(vu[i], vv[i]) > 0.3 * speed) {
        // Face the motion (smoothly), so stretched bodies point where they go.
        let d = want - heading[i]; d -= TAU * Math.round(d / TAU);
        heading[i] += d * Math.min(1, dt * 4);
      } else heading[i] += turn * dt * 0.3;
    }

    rebuild();

    // Separation: overlapping pairs push apart (half the overlap each, softly).
    const reach2 = minGap * minGap;
    for (let i = 0; i < N; i++) {
      if (state[i] === 2) continue;
      const ui = pu[i], vi = pv[i];
      query(ui, vi, minGap, (j) => {
        if (j <= i || state[j] === 2) return;
        const du = pu[j] - ui, dv = pv[j] - vi, d2 = du * du + dv * dv;
        if (d2 >= reach2 || d2 < 1e-12) return;
        const d = Math.sqrt(d2), push = (minGap - d) * 0.35 / d;
        pu[i] -= du * push; pv[i] -= dv * push; pu[j] += du * push; pv[j] += dv * push;
        const k = push * 2;
        vu[i] -= du * k; vv[i] -= dv * k; vu[j] += du * k; vv[j] += dv * k;
      });
    }

    // Players shove through: members inside a player's body are put outside it
    // at once; those just ahead part early, faster the faster the player goes.
    for (let pi = 0; pi < players.length; pi++) {
      const p = players[pi];
      const P = p.position;
      const id = p.slot ?? pi;
      let mu = 0, mv = 0;
      if (p.velocity) { mu = p.velocity.x || 0; mv = p.velocity[V] || 0; }
      else {
        const prev = lastPlayer.get(id);
        if (prev && dt > 0) { mu = (P.x - prev[0]) / dt; mv = (P[V] - prev[1]) / dt; }
        lastPlayer.set(id, [P.x, P[V]]);
      }
      const ps = Math.hypot(mu, mv);
      const pr = (p.radius ?? playerR) + R;
      const part = pr + 2.5 * R + Math.min(4 * R, ps * 0.25);
      query(P.x, P[V], part, (i) => {
        if (state[i] === 2) return;
        let du = pu[i] - P.x, dv = pv[i] - P[V];
        let d = Math.hypot(du, dv);
        if (d > part) return;
        if (d < 1e-5) { du = Math.cos(phase[i]); dv = Math.sin(phase[i]); d = 1; } else { du /= d; dv /= d; }
        if (d < pr) {
          pu[i] = P.x + du * pr; pv[i] = P[V] + dv * pr;
          const out = Math.max(2 * speed, ps * 1.1);
          const along = Math.max(0, mu * du + mv * dv);
          vu[i] = du * out + mu * 0.3; vv[i] = dv * out + mv * 0.3;
          if (along < 0) { vu[i] -= du * along; vv[i] -= dv * along; }
        } else {
          // Ahead of a moving player: step aside sideways, not just forwards.
          const ahead = ps > 1e-3 ? Math.max(0, (du * mu + dv * mv) / ps) : 0;
          const side = ps > 1e-3 ? Math.sign(du * -mv + dv * mu) || 1 : 0;
          const k = (1 - (d - pr) / (part - pr)) * dt * (6 * speed + 3 * ps);
          vu[i] += (du + ahead * side * (-mv / (ps || 1))) * k * 4;
          vv[i] += (dv + ahead * side * (mu / (ps || 1))) * k * 4;
        }
      });
    }

    // Integrate, keep inside the area, settle on the surface.
    const maxV = 30 * R;
    for (let i = 0; i < N; i++) {
      if (state[i] === 2) continue;
      const sp = Math.hypot(vu[i], vv[i]);
      if (sp > maxV) { vu[i] *= maxV / sp; vv[i] *= maxV / sp; }
      pu[i] += vu[i] * dt; pv[i] += vv[i] * dt;
      if (state[i] === 1) continue;
      if (circle) {
        const du = pu[i] - circle.u, dv = pv[i] - circle.v, d = Math.hypot(du, dv);
        if (d > circle.r) { const k = circle.r / d; pu[i] = circle.u + du * k; pv[i] = circle.v + dv * k; vu[i] -= du / d * speed; vv[i] -= dv / d * speed; }
      } else {
        if (pu[i] < box.u0) { pu[i] = box.u0; vu[i] = Math.abs(vu[i]) * 0.5; }
        else if (pu[i] > box.u1) { pu[i] = box.u1; vu[i] = -Math.abs(vu[i]) * 0.5; }
        if (pv[i] < box.v0) { pv[i] = box.v0; vv[i] = Math.abs(vv[i]) * 0.5; }
        else if (pv[i] > box.v1) { pv[i] = box.v1; vv[i] = -Math.abs(vv[i]) * 0.5; }
      }
      surface(i);
    }
  }

  // Bite: a cone in front of the player is cleared.
  const biteTargets = [];
  function bite(pos, dir, reach = 4 * R, { angle = 0.9, eat = true } = {}) {
    rebuild();
    const P0u = pos.x, P0v = pos[V];
    let du0 = dir ? dir.x || 0 : 0, dv0 = dir ? dir[V] || 0 : 0;
    const dl = Math.hypot(du0, dv0);
    if (dl > 1e-6) { du0 /= dl; dv0 /= dl; }
    const cosA = Math.cos(angle);
    const outer = reach * 1.5 + R;
    let n = 0;
    biteTargets.length = 0;
    query(P0u, P0v, outer, (i) => { if (state[i] === 0 || state[i] === 3) biteTargets.push(i); });
    for (const i of biteTargets) {
      let du = pu[i] - P0u, dv = pv[i] - P0v;
      const d = Math.hypot(du, dv);
      if (d > outer) continue;
      if (d > 1e-5) { du /= d; dv /= d; } else { du = du0; dv = dv0; }
      const facing = dl > 1e-6 ? du * du0 + dv * dv0 : 1;
      const inCone = d <= reach + R && (facing >= cosA || d < R * 1.5);
      if (inCone) {
        if (eat) {
          state[i] = 1; n++;
          // Drawn towards the mouth as it shrinks.
          vu[i] = -du * 4 * R; vv[i] = -dv * 4 * R;
        } else {
          const k = 14 * R * (1.2 - d / (reach + R));
          vu[i] = du * k + du0 * 4 * R; vv[i] = dv * k + dv0 * 4 * R; n++;
        }
      } else if (facing > cosA - 0.6 || d < reach) {
        // Round the cone: scatter.
        const k = 8 * R * (1.3 - d / outer);
        vu[i] += du * k; vv[i] += dv * k;
      }
    }
    return n;
  }

  const members = {
    count: N,
    x: pu, [V]: pv, vx: vu, [`v${V}`]: vv, life,
    alive: (i) => state[i] === 0 || state[i] === 3,
    position(i, out = {}) {
      out.x = pu[i];
      if (is2d) { out.y = pv[i]; out.z = zDepth; } else { out.y = py[i] + sit * R; out.z = pv[i]; }
      return out;
    },
  };

  for (let i = 0; i < N; i++) surface(i);
  writeMatrices();

  return {
    mesh,
    members,
    get alive() { let c = 0; for (let i = 0; i < N; i++) if (state[i] === 0 || state[i] === 3) c++; return c; },
    update(dt, players = [], o = {}) {
      if (o.flow !== undefined) flow = o.flow;
      dt = Math.max(0, Math.min(1 / 20, +dt || 0));
      if (dt > 0) {
        // Fast players or slow frames: substeps so nobody tunnels through.
        const n = dt > 1 / 40 ? 2 : 1;
        for (let k = 0; k < n; k++) step(dt / n, players);
      }
      writeMatrices();
    },
    bite,
    dispose() {
      if (mesh.parent) mesh.parent.remove(mesh);
      if (ownGeo) ownGeo.dispose();
      if (ownMat) ownMat.dispose();
      mesh.dispose?.();
    },
  };
}
