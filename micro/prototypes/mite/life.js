// Life and weather in the moss, everywhere (the owner, 2026-11-02: "I walked
// for a while seeing nothing ... there should be more frequent encounters,
// and I never really felt like I was getting closer to the portal").
//
// - createAmbient: little groups of soil springtails grazing on the moss
//   floor, on a jittered lattice that covers the whole square (about one group
//   every 2.2 mm), so no stretch of moss is empty. Each group is a pure
//   function of its site and the clock (stateless), so the moss you have seen
//   is the moss you come back to; they shy away from a mite that comes close
//   and now and then hop on the spot (the furcula), upright. A bite (X) is
//   the one thing kept: a nipped one lies dazed, its group leaps away, and a
//   dazed one bitten again is eaten (main.js biteNow).
// - createBeads: water beads on the moss floor that grow commoner and larger
//   as the game goes on (by encounter progress) and thickest round the wet
//   leaf axil (the portal), the way the springtail's pondweed thickens toward
//   its portal: the moss is wetter the nearer the water. Each lattice site is
//   decided once, the first time anyone comes within GEN_R (past the edge of
//   any view), and then kept, so seen moss never changes.
// - createDrops: a drop of water falling into the moss (rain drips through a
//   moss cushion), or a shower of three: armed where the director put it, it
//   falls when someone comes near, splashes (a mite in reach is knocked shut
//   and rolled: main.js), sits as a bead and soaks away.
// Departures: springtails flee and leap on a game rule; a box mite biting and
// eating one is a game rule (box mites graze fungi and do not hunt); SEM shows water only
// in an environmental (wet) instrument; a falling drop at this scale is a
// game hazard, slowed.
import * as THREE from '../shared/vendor/three.module.min.js';
import { gMaterial, CLS } from '../shared/techniques/mite-sem.js';
import { springtailGeometry } from './thicket.js';
import { floorH } from './world.js';
import { clearOfThickets, insideEdge, DRIP } from './layout.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** A hash of a lattice site (and a salt) to 0..1. */
export function hash2(i, j, s = 0) {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

/**
 * Springtail groups everywhere. blocked(x, z): no group there (the portal's
 * arena, say). update(t, bodies [{x, z}], foci [{x, z}]) poses the groups
 * within DRAW of any focus; sitesNear(x, z, r) lists the groups (for checks).
 */
export function createAmbient({ scene, tex, blocked = () => false, max = 150 }) {
  const CELL = 1800, DRAW = 4200, START = 900;
  // SHY: how close a body comes before they edge away (µm, centre to centre;
  // was 520, which kept them out of reach of a bite); STUN: how long a nipped
  // one lies dazed; BACK: how long an eaten one is missing before another
  // wanders into its place; SCATTER: how far the rest of a nipped group leap.
  const SHY = 360, STUN = 2.4, BACK = 40, SCATTER = 520, LEAP = 0.45;
  const mat = gMaterial({ cls: CLS.NPC, tex: tex.cuticle, map: 'tri', scale: 70, bump: 1.2 });
  const mesh = new THREE.InstancedMesh(springtailGeometry(), mat, max);
  mesh.name = 'ambient springtails';
  mesh.count = 0;
  mesh.frustumCulled = false;
  scene.add(mesh);
  /** The group at lattice site (i, j), or null: { x, z, n, k }. */
  function site(i, j) {
    if (hash2(i, j, 1) > 0.7) return null;
    const x = (i + 0.2 + 0.6 * hash2(i, j, 2)) * CELL, z = (j + 0.2 + 0.6 * hash2(i, j, 3)) * CELL;
    if (Math.hypot(x, z) < START || !clearOfThickets(x, z, 350, 250) || !insideEdge(x, z, 400) || blocked(x, z)) return null;
    return { x, z, n: 3 + Math.floor(hash2(i, j, 4) * 4), k: i * 7919 + j * 104729 };
  }
  function sitesNear(x, z, r) {
    const out = [];
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++)
      for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
        const s = site(i, j);
        if (s && Math.hypot(s.x - x, s.z - z) < r) out.push(s);
      }
    return out;
  }
  const seenK = new Set();
  // The groups are a pure function of their site and the clock; what a bite
  // does to them is kept here: bugs (`${site}:${member}` -> { stun: until,
  // x, z (where it lies), eaten: until, held: { p, s } while being eaten }),
  // and scatters (site -> { t0, x, z }: the group leapt away from there).
  const bugs = new Map(), scatters = new Map();
  /** The springtails drawn last update: [{ key, x, y, z, stunned }] (for bites and checks). */
  const live = [];
  let n = 0, now = 0;
  const _n = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _qy = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _ax = new THREE.Vector3();
  /** Face yaw (world, about up), pitched nose-up by `pitch`, standing square to the moss under (x, z). */
  function orient(x, z, yaw, pitch) {
    const e = 12, dx = floorH(x + e, z) - floorH(x - e, z), dz = floorH(x, z + e) - floorH(x, z - e);
    _n.set(-dx / (2 * e), 1, -dz / (2 * e)).normalize();
    _q.setFromUnitVectors(_up, _n);
    _q.multiply(_qy.setFromAxisAngle(_ax.set(0, 1, 0), yaw));
    if (pitch) _q.multiply(_qp.setFromAxisAngle(_ax.set(0, 0, 1), pitch));
    return _q;
  }
  function member(s, m, t, bodies) {
    const key = `${s.k}:${m}`, B = bugs.get(key);
    if (B && B.eaten > t) return;
    const h = (q) => hash2(s.k, m, q);
    const sc = 0.85 + h(13) * 0.35;
    if (B && B.held) {
      // in the jaws: carried at the mouth, shrinking as it is eaten
      _p.copy(B.held.p);
      _s.setScalar(sc * Math.max(0.02, B.held.s));
      mesh.setMatrixAt(n++, _m.compose(_p, orient(_p.x, _p.z, B.yaw || 0, 0.3), _s));
      live.push({ key, x: _p.x, y: _p.y, z: _p.z, stunned: true });
      return;
    }
    if (B && B.stun > t) {
      // nipped: a jolt, then it lies dazed where it was, crouched, legs twitching
      const since = STUN - (B.stun - t), jolt = since < 0.25 ? Math.sin((since / 0.25) * Math.PI) : 0;
      const tw = 0.18 * Math.sin(t * 31 + m) * Math.max(0.2, 1 - since / STUN);
      _p.set(B.x, floorH(B.x, B.z) + 2 + 45 * jolt, B.z);
      _s.set(sc * 1.05, sc * 0.8, sc * 1.05);
      mesh.setMatrixAt(n++, _m.compose(_p, orient(B.x, B.z, (B.yaw || 0) + tw, -0.1 + 0.25 * jolt), _s));
      live.push({ key, x: _p.x, y: _p.y, z: _p.z, stunned: true });
      return;
    }
    const a0 = h(5) * Math.PI * 2, r0 = 60 + h(6) * 230;
    const w1 = 0.25 + h(7) * 0.35, w2 = 0.2 + h(8) * 0.3, f1 = h(9) * 6.28, f2 = h(10) * 6.28;
    let x = s.x + Math.cos(a0) * r0 + Math.sin(t * w1 + f1) * 110, z = s.z + Math.sin(a0) * r0 + Math.cos(t * w2 + f2) * 110;
    let vx = Math.cos(t * w1 + f1) * w1, vz = -Math.sin(t * w2 + f2) * w2;
    let hop = 0, pitch = 0;
    // scattered by a bite in the group: each leaps away from it (the furcula),
    // and they drift back to graze over the next ten seconds
    const S = scatters.get(s.k);
    if (S) {
      const ds = t - S.t0;
      if (ds > 14) scatters.delete(s.k);
      else {
        let ux = x - S.x, uz = z - S.z;
        const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
        const go = SCATTER * (0.8 + 0.4 * h(15)) * sstep(0, LEAP, ds) * (1 - sstep(4, 12, ds));
        x += ux * go; z += uz * go;
        if (ds < LEAP) { const u = ds / LEAP; hop = Math.sin(Math.PI * u) * 1.1; pitch = 0.55 * Math.cos(Math.PI * u); vx = ux; vz = uz; }
      }
    }
    // shy: pushed away from any body that comes within SHY
    for (const b of bodies) {
      const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz);
      if (d < SHY && d > 1) { const k = (SHY - d) * 1.1; x += (dx / d) * k; z += (dz / d) * k; vx = dx / d; vz = dz / d; }
    }
    // now and then a hop on the spot (the furcula, flicked lightly): a low arc,
    // nose up on the way up and down on the way down, landing on its feet.
    // (Real springtail leaps often tumble end over end; the old one here rolled
    // through 250° and back, which read as bugs flipping upside down.)
    if (!hop) {
      const per = 9 + h(11) * 9, ph = (t + h(12) * per) % per;
      if (ph < LEAP) { const u = ph / LEAP; hop = Math.sin(Math.PI * u) * 0.7; pitch = 0.45 * Math.cos(Math.PI * u); }
    }
    _p.set(x, floorH(x, z) + 4 + hop * 150, z);
    _s.setScalar(sc);
    mesh.setMatrixAt(n++, _m.compose(_p, orient(x, z, -Math.atan2(vz, vx), pitch), _s));
    live.push({ key, x, y: _p.y, z, stunned: false });
  }
  const find = (key) => live.find((b) => b.key === key);
  return {
    mesh, site, sitesNear, CELL, live, bugs, scatters, SHY, STUN,
    /** Groups first drawn so far (each lattice site, once). */
    get seen() { return seenK.size; },
    /** The springtail nearest (x, y, z) within r (as drawn last update), or null: { key, x, y, z, stunned, d }. */
    nearest(x, y, z, r, accept = () => true) {
      let best = null, bd = r;
      for (const b of live) {
        const d = Math.hypot(b.x - x, (b.y - y) * 0.5, b.z - z);
        if (d < bd && accept(b)) { bd = d; best = b; }
      }
      return best ? { ...best, d: bd } : null;
    },
    /**
     * A bite lands on springtail `key` from (fx, fz): a dazed one is caught
     * ('caught': the caller eats it, hold/eaten), a lively one is stunned where
     * it stands and the rest of its group leap away ('stunned').
     */
    nip(key, fx, fz) {
      const b = find(key);
      if (!b) return null;
      const B = bugs.get(key);
      if (B && B.stun > now) { B.stun = now + 9; return 'caught'; }
      bugs.set(key, { stun: now + STUN, x: b.x, z: b.z, yaw: -Math.atan2(b.z - fz, b.x - fx) + Math.PI, eaten: 0 });
      scatters.set(+key.split(':')[0], { t0: now, x: fx, z: fz });
      return 'stunned';
    },
    /** While eaten: drawn at p (world), at scale s (1 whole .. 0 gone). */
    hold(key, p, s) { const B = bugs.get(key); if (B) B.held = { p: p.clone(), s }; },
    /** Eating cut short: it drops, dazed a moment longer. */
    drop(key) { const B = bugs.get(key); if (B && B.held) { B.x = B.held.p.x; B.z = B.held.p.z; B.held = null; B.stun = now + 1; } },
    /** Eaten: gone until another wanders in (BACK s). */
    eaten(key) { const B = bugs.get(key); if (B) { B.held = null; B.stun = 0; B.eaten = now + BACK; } },
    update(t, bodies, foci) {
      n = 0; now = t; live.length = 0;
      const done = new Set();
      for (const f of foci) for (const s of sitesNear(f.x, f.z, DRAW)) {
        if (done.has(s.k)) continue;
        done.add(s.k); seenK.add(s.k);
        for (let m = 0; m < s.n && n < max; m++) member(s, m, t, bodies);
      }
      for (const [k, B] of bugs) if (B.stun < t && B.eaten < t && !B.held) bugs.delete(k);
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    },
    reset() { bugs.clear(); scatters.clear(); },
    setVisible(v) { mesh.visible = v; },
  };
}

/**
 * Water beads on the moss floor. wetness(x, z) -> extra wetness there now
 * (main.js: encounter progress, and the portal's nearness); a site is decided
 * once, the first time it comes within GEN_R of a focus, and kept.
 */
export function createBeads({ scene, wetness, max = 900 }) {
  const CELL = 1100, GEN_R = 5200, DRAW = 4600;
  const mat = gMaterial({ cls: CLS.GRAIN, thin: 0 });
  const geo = new THREE.IcosahedronGeometry(1, 2);
  geo.translate(0, 0.35, 0); // sunk: a bead resting on the moss, not a ball
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.name = 'water beads';
  mesh.count = 0; mesh.frustumCulled = false;
  scene.add(mesh);
  const sites = new Map();
  function decide(i, j) {
    const cx = (i + 0.5) * CELL, cz = (j + 0.5) * CELL;
    const w = wetness(cx, cz); // 0 dry .. ~1.5 by the water
    const n = Math.floor(clamp(0.25 + 3.2 * w, 0, 7) * hash2(i, j, 21) + 0.35 + (w > 0.6 ? 1 : 0));
    const out = new Float32Array(n * 4);
    for (let q = 0; q < n; q++) {
      const x = (i + hash2(i, j, 30 + q)) * CELL, z = (j + hash2(i, j, 50 + q)) * CELL;
      const r = (14 + 46 * hash2(i, j, 70 + q) * (0.4 + 0.6 * clamp(w, 0, 1))) ;
      out.set([x, floorH(x, z), z, r], q * 4);
    }
    return { beads: clearOfThickets(cx, cz, 0, 0) && insideEdge(cx, cz, CELL) ? out : new Float32Array(0), w };
  }
  let n = 0;
  return {
    mesh, sites,
    /** Wetness of the sites decided so far within r of (x, z): the mean (for checks). */
    wetAround(x, z, r) { let s = 0, c = 0; for (const [k, v] of sites) { const [i, j] = k.split(',').map(Number); if (Math.hypot((i + 0.5) * CELL - x, (j + 0.5) * CELL - z) < r) { s += v.w; c++; } } return c ? s / c : 0; },
    update(foci) {
      for (const f of foci) {
        const r = Math.ceil(GEN_R / CELL);
        const fi = Math.floor(f.x / CELL), fj = Math.floor(f.z / CELL);
        for (let i = fi - r; i <= fi + r; i++) for (let j = fj - r; j <= fj + r; j++) {
          const key = `${i},${j}`;
          if (!sites.has(key) && Math.hypot((i + 0.5) * CELL - f.x, (j + 0.5) * CELL - f.z) < GEN_R) sites.set(key, decide(i, j));
        }
      }
      n = 0;
      const done = new Set();
      for (const f of foci) {
        const r = Math.ceil(DRAW / CELL), fi = Math.floor(f.x / CELL), fj = Math.floor(f.z / CELL);
        for (let i = fi - r; i <= fi + r && n < max; i++) for (let j = fj - r; j <= fj + r && n < max; j++) {
          const key = `${i},${j}`;
          if (done.has(key)) continue;
          done.add(key);
          const S = sites.get(key);
          if (!S) continue;
          const b = S.beads;
          for (let q = 0; q < b.length && n < max; q += 4) {
            _p.set(b[q], b[q + 1], b[q + 2]); _q.identity(); _s.set(b[q + 3], b[q + 3] * 0.8, b[q + 3]);
            mesh.setMatrixAt(n++, _m.compose(_p, _q, _s));
          }
        }
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    },
    reset() { sites.clear(); },
    setVisible(v) { mesh.visible = v; },
  };
}

/**
 * Falling drops: a pool of n (one, or DRIP.shower). arm(spots [{ x, z, delay }]) sets
 * them over the moss (hidden), update(dt, players [{x, z}]) starts them falling
 * once anyone is within DRIP.trigger of the first, and returns events
 * [{ type: 'fall' | 'splash', x, z }]. state: idle | armed | falling | done.
 */
export function createDrops({ scene, n = DRIP.shower }) {
  const mat = gMaterial({ cls: CLS.GRAIN, thin: 0 });
  const geo = new THREE.IcosahedronGeometry(DRIP.r, 3);
  const drops = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(geo, mat); m.visible = false; m.name = 'drop'; scene.add(m);
    return { m, x: 0, z: 0, y: 0, vy: 0, delay: 0, state: 'idle', t: 0, fy: 0 };
  });
  const api = {
    drops, state: 'idle', spot: null,
    arm(spots) {
      api.state = 'armed'; api.spot = spots[0];
      drops.forEach((d, i) => {
        const s = spots[i];
        if (!s) { d.state = 'idle'; d.m.visible = false; return; }
        d.x = s.x; d.z = s.z; d.delay = s.delay || 0; d.fy = floorH(s.x, s.z); d.y = d.fy + DRIP.height; d.vy = 0; d.state = 'armed'; d.m.visible = false; d.t = 0;
      });
    },
    reset() { api.state = 'idle'; api.spot = null; for (const d of drops) { d.state = 'idle'; d.m.visible = false; } },
    update(dt, players) {
      const ev = [];
      const p = api.state === 'armed' && players.find((q) => Math.hypot(q.x - api.spot.x, q.z - api.spot.z) < DRIP.trigger);
      if (p) {
        // nothing shows until it falls, so it falls where it is a hazard you can see: just ahead of
        // whoever came near (the rest of a shower keep their places round the first)
        const hl = Math.hypot(p.hx || 0, p.hz || 0) || 1, ax = p.x + ((p.hx || 0) / hl) * DRIP.ahead, az = p.z + ((p.hz || 0) / hl) * DRIP.ahead;
        const ox = ax - api.spot.x, oz = az - api.spot.z;
        for (const d of drops) if (d.state === 'armed') { d.x += ox; d.z += oz; d.fy = floorH(d.x, d.z); d.y = d.fy + DRIP.height; }
        api.spot = { x: ax, z: az };
        api.state = 'falling'; ev.push({ type: 'fall', x: ax, z: az });
      }
      if (api.state !== 'falling') return ev;
      let live = 0;
      for (const d of drops) {
        if (d.state === 'armed') { if ((d.delay -= dt) <= 0) { d.state = 'falling'; d.m.visible = true; } else { live++; continue; } }
        if (d.state === 'falling') {
          live++;
          d.vy -= 5200 * dt; d.y += d.vy * dt;
          const st = clamp(-d.vy / 4000, 0, 0.35);
          if (d.y - DRIP.r <= d.fy) { d.state = 'bead'; d.t = 0; d.y = d.fy; ev.push({ type: 'splash', x: d.x, z: d.z }); }
          d.m.position.set(d.x, d.y, d.z); d.m.scale.set(1 - st * 0.3, 1 + st, 1 - st * 0.3);
        } else if (d.state === 'bead') {
          live++;
          d.t += dt;
          // a flattened dome that wobbles, then soaks away into the moss over ~4 s
          const k = 1 - sstep(1.2, 4.5, d.t), wob = 0.12 * Math.exp(-d.t * 3) * Math.sin(d.t * 30);
          d.m.position.set(d.x, d.fy - DRIP.r * 0.45, d.z);
          d.m.scale.set((1.5 + wob) * (0.4 + 0.6 * k), (0.75 - wob) * k + 0.01, (1.5 + wob) * (0.4 + 0.6 * k));
          if (d.t > 4.5) { d.state = 'done'; d.m.visible = false; }
        }
      }
      if (!live) api.state = 'done';
      return ev;
    },
  };
  return api;
}
