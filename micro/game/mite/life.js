// Life and weather in the moss, everywhere (the owner, 2026-11-02: "I walked
// for a while seeing nothing ... there should be more frequent encounters,
// and I never really felt like I was getting closer to the portal").
//
// - createAmbient: little groups of soil springtails grazing on the moss
//   floor, on a jittered lattice that covers the whole square (about one group
//   every 2.2 mm), so no stretch of moss is empty. Each group is a pure
//   function of its site and the clock (stateless), so the moss you have seen
//   is the moss you come back to; they shy away from a mite that comes close
//   and now and then hop on the spot (the furcula), upright. A grab (X) is
//   the one thing kept: the grabbed one is eaten in the jaws while its group
//   leaps away (main.js biteNow), and what pushed or shied each one is an
//   offset that fades (see createAmbient: nothing pops in or out of view).
// - createBeads: water beads on the moss floor that grow commoner and larger
//   as the game goes on (by encounter progress) and thickest round the wet
//   leaf axil (the portal), the way the springtail's pondweed thickens toward
//   its portal: the moss is wetter the nearer the water. Each lattice site is
//   decided once, the first time anyone comes within GEN_R (past the edge of
//   any view), and then kept, so seen moss never changes.
// - createDrops: a drop of water falling into the moss (rain drips through a
//   moss cushion), or a shower of three: armed where the director put it, it
//   falls when someone comes near, each drop at a random spot in the moss
//   round them but never on them (the owner, 2026-11-02: "definitely don't aim
//   them at the player"), a ring on the moss under it as it falls; it splashes,
//   sits as a bead and soaks away. A mite inside a bead is slowed and
//   struggles, climbing out (main.js stepLife): no daze, no harm.
// Departures: springtails flee and leap on a game rule; a box mite biting and
// eating one is a game rule (box mites graze fungi and do not hunt); SEM shows water only
// in an environmental (wet) instrument; a falling drop at this scale is
// slowed, and a mite in a bead pushes out of it in a moment (a real one would
// be held by the water's surface tension).
import * as THREE from '../shared/vendor/three.module.min.js';
import { gMaterial, CLS } from '../shared/techniques/mite-sem.js';
import { springtailGeometry } from './thicket.js';
import { floorH } from './world.js';
import { clearOfThickets, insideEdge, DRIP } from './layout.js';
import { standSpringtail } from './stand.js';

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
 * arena, say). update(t, bodies [{x, z}], foci [{x, z, r?}], inSight?) poses
 * the groups within r (default DRAW) of any focus; sitesNear(x, z, r) lists
 * the groups (for checks). ground(x, z): the height they stand on (stand.js
 * createGround: the floor with its grains and litter; the bare floor by
 * default); keepOut(x, z, out): moves a point out of what they walk round
 * (stand.js createKeepOut: the big grains and the moss stems), or null.
 *
 * Nothing pops in or out of view (the owner, 2026-11-04: "the other insects
 * sometimes seem to disappear ... no 'disappear suddenly' type of effect"):
 * - a group comes and goes only out of every view (inSight(x, z, r), main.js:
 *   the views' frustums); one that must go while seen (its site blocked, the
 *   instance cap) dives into the moss, each springtail sinking into a crevice
 *   in a puff of crumbs (springtails do hide in soil pores and litter), and
 *   one that must come while seen climbs out the same way (`events`: where the
 *   crumbs go, for main.js);
 * - each springtail keeps an offset of its own from its grazing path: what
 *   shied it away, what pushed it (pushBy: shared/push.js through main.js),
 *   and whatever would otherwise have made it jump (a dazed one getting up,
 *   one dropped from the jaws). The offset fades over RETURN s, so it walks
 *   back to graze; no drawn springtail moves faster than MAXV µm/s except in
 *   a leap (the scatter is under it anyway);
 * - an eaten one goes through the meal in the jaws (main.js), and the one that
 *   later wanders into its place climbs out of the moss.
 */
export function createAmbient({ scene, tex, blocked = () => false, max = 400, ground = floorH, keepOut = null }) {
  const CELL = 1800, DRAW = 4200, START = 900;
  // SHY: how close a body comes before they edge away (µm, centre to centre;
  // was 520, which kept them out of reach of a bite); FLEE: how fast they
  // edge away (µm/s, at contact); STUN: how long a nipped one lies dazed;
  // BACK: how long an eaten one is missing before another wanders into its
  // place; SCATTER: how far the rest of a grabbed one's group leap; RETURN:
  // the time an offset takes to fade to a third (s); MAXV: the fastest a drawn
  // springtail moves (µm/s); DIVE: a dive into the moss or a climb out (s);
  // DEPTH: how far under the floor it goes (µm).
  const SHY = 360, FLEE = 1500, STUN = 2.4, BACK = 40, SCATTER = 520, LEAP = 0.45, RETURN = 1.6, MAXV = 2400, DIVE = 0.55, DEPTH = 150;
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
  // x, z (where it lies), eaten: until, held: { p, s } while being eaten,
  // emerge: when it climbs out }), and scatters (site -> { t0, x, z }: the
  // group leapt away from there).
  const bugs = new Map(), scatters = new Map();
  // each springtail's own offset from its grazing path: key -> { ox, oz, t }
  const offs = new Map();
  // the groups drawn: site k -> { s, since, dive: t0 (diving into the moss) | null, rise: t0 (climbing out) | null }
  const shown = new Map();
  // groups that dove out of sight: kept away until no view can see their spot
  const dived = new Map();
  /** The springtails drawn last update: [{ key, x, y, z, yaw, sc, stunned, held }] (for bites, pushes and checks). */
  const live = [];
  /** Where crumbs go this update: [{ type: 'dive' | 'rise', x, y, z }] (main.js puffs them). */
  const events = [];
  let n = 0, now = 0, dtNow = 0;
  const _n = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _qy = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _ax = new THREE.Vector3();
  // Each one stands on its six feet (stand.js standSpringtail): square to the
  // ground under them, at its legs' height, lifted clear wherever the belly,
  // the head or a foot would dip (the old pose set the centre 4 µm above the
  // floor at one point, and the body hangs ~57 µm below its centre: they all
  // stood sunk to the back in the moss). A pose is kept per member and reused
  // while it has moved less than a few µm (a dazed one, a still one, a slow
  // grazer between steps), carried with the ground under its centre.
  const poses = new Map();
  const _st = { y: 0, q: new THREE.Quaternion(), pen: 0, n: new THREE.Vector3() };
  /** Stand member `key` at (x, z) facing yaw, scaled (sc, sc * sy, sc), pitched nose-up, lifted (a hop): sets _p and _q. */
  function stand(key, x, z, yaw, sc, sy, pitch, lift) {
    let P = poses.get(key);
    // (moved a step of a few µm, turned a hair: the same pose, carried with the ground under its centre)
    // (not where the ground steps: by a grain or a flake's edge it is posed again)
    if (P && Math.abs(P.x - x) + Math.abs(P.z - z) < 4 && Math.abs(P.yaw - yaw) < 0.02 && P.sc === sc && P.sy === sy && P.pitch === pitch) {
      const dg = ground(x, z) - P.g;
      if (dg > -1.5 && dg < 1.5) { _q.copy(P.q); _p.set(x, P.y + dg + lift, z); stats.reused++; P.used = now; P.lx = x; P.lz = z; return; }
    }
    standSpringtail(ground, x, z, yaw, sc, sc * sy, sc, pitch, 0, _st);
    if (!P) poses.set(key, (P = { q: new THREE.Quaternion() }));
    P.x = x; P.z = z; P.yaw = yaw; P.sc = sc; P.sy = sy; P.pitch = pitch; P.y = _st.y; P.g = ground(x, z); P.q.copy(_st.q); P.used = now; P.lx = x; P.lz = z;
    stats.posed++; if (_st.pen > stats.lifted) stats.lifted = _st.pen;
    _q.copy(_st.q); _p.set(x, _st.y + lift, z);
  }
  const stats = { posed: 0, reused: 0, lifted: 0, jumpsCaught: 0, maxStep: 0, dives: 0, rises: 0, capped: 0 };
  const _ko = { x: 0, z: 0 };
  /** In the jaws: square to the ground under it, nose up `pitch`, rolled `roll` (the struggle), turned `twist`. */
  const _qa = new THREE.Quaternion(), _ax2 = new THREE.Vector3();
  function heldQ(x, z, yaw, pitch, roll, twist) {
    standSpringtail(ground, x, z, yaw + twist, 1, 1, 1, pitch, 0, _st);
    _q.copy(_st.q);
    if (roll) _q.multiply(_qa.setFromAxisAngle(_ax2.set(1, 0, 0), roll));
    return _q;
  }
  /** Its offset now (faded since it was last set): { ox, oz, t }. */
  function offOf(key) {
    let O = offs.get(key);
    if (!O) { O = { ox: 0, oz: 0, t: now }; offs.set(key, O); return O; }
    if (O.t !== now) { const k = Math.exp(-(now - O.t) / RETURN); O.ox *= k; O.oz *= k; O.t = now; }
    return O;
  }
  /** How far into the moss (0 up .. 1 under) and whether it just started: a group diving or climbing out, or one member climbing out. */
  function sunk(S, B, t) {
    let d = 0;
    if (S && S.dive !== null) d = Math.max(d, sstep(0, 1, (t - S.dive) / DIVE));
    if (S && S.rise !== null) d = Math.max(d, 1 - sstep(0, 1, (t - S.rise) / DIVE));
    if (B && B.emerge !== undefined) d = Math.max(d, 1 - sstep(0, 1, (t - B.emerge) / DIVE));
    return d;
  }
  function member(s, m, t, bodies, S) {
    const key = `${s.k}:${m}`, B = bugs.get(key);
    if (B && B.eaten > t) return;
    const h = (q) => hash2(s.k, m, q);
    const sc = 0.85 + h(13) * 0.35;
    if (B && B.held) {
      // in the jaws: carried at the mouth, shrinking as it is eaten
      const H = B.held;
      _p.copy(H.p);
      _s.setScalar(sc * Math.max(0.02, H.s));
      mesh.setMatrixAt(n++, _m.compose(_p, heldQ(_p.x, _p.z, B.yaw || 0, 0.3 + (H.pitch || 0), H.roll || 0, H.twist || 0), _s));
      live.push({ key, x: _p.x, y: _p.y, z: _p.z, yaw: B.yaw || 0, sc, stunned: true, held: true });
      const P = poses.get(key); if (P) { P.used = now; P.lx = _p.x; P.lz = _p.z; }
      return;
    }
    if (B && B.stun > t) {
      // dazed (dropped from the jaws): a jolt, then it lies where it was, crouched, legs twitching
      const since = STUN - (B.stun - t), jolt = since < 0.25 ? Math.sin((since / 0.25) * Math.PI) : 0;
      const tw = 0.18 * Math.sin(t * 31 + m) * Math.max(0.2, 1 - since / STUN);
      // (crouched: legs bent to 0.8 of their height; the jolt and the twitch move it, the ground holds it up)
      stand(key, B.x, B.z, (B.yaw || 0) + tw, sc * 1.05, 0.8 / 1.05, -0.1 + 0.25 * jolt, 45 * jolt);
      _s.set(sc * 1.05, sc * 0.8, sc * 1.05);
      mesh.setMatrixAt(n++, _m.compose(_p, _q, _s));
      live.push({ key, x: _p.x, y: _p.y, z: _p.z, yaw: B.yaw || 0, sc, stunned: true, held: false });
      return;
    }
    const a0 = h(5) * Math.PI * 2, r0 = 60 + h(6) * 230;
    const w1 = 0.25 + h(7) * 0.35, w2 = 0.2 + h(8) * 0.3, f1 = h(9) * 6.28, f2 = h(10) * 6.28;
    let x = s.x + Math.cos(a0) * r0 + Math.sin(t * w1 + f1) * 110, z = s.z + Math.sin(a0) * r0 + Math.cos(t * w2 + f2) * 110;
    let vx = Math.cos(t * w1 + f1) * w1, vz = -Math.sin(t * w2 + f2) * w2;
    let hop = 0, pitch = 0;
    // scattered by a grab in the group: each leaps away from it (the furcula),
    // and they drift back to graze over the next ten seconds
    const Sc = scatters.get(s.k);
    if (Sc) {
      const ds = t - Sc.t0;
      if (ds > 14) scatters.delete(s.k);
      else {
        let ux = x - Sc.x, uz = z - Sc.z;
        const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
        const go = SCATTER * (0.8 + 0.4 * h(15)) * sstep(0, LEAP, ds) * (1 - sstep(4, 12, ds));
        x += ux * go; z += uz * go;
        // (nose up rising, down falling, level again as it lands: it lands on its feet, not its nose)
        if (ds < LEAP) { const u = ds / LEAP; hop = Math.sin(Math.PI * u) * 1.1; pitch = 0.55 * Math.sin(2 * Math.PI * u); vx = ux; vz = uz; }
      }
    }
    // its own offset: shied, pushed, or caught from jumping (faded since: it walks back to graze)
    const O = offOf(key);
    // shy: it edges away from any body that comes within SHY (a speed, not a jump: the offset grows)
    for (const b of bodies) {
      const dx = x + O.ox - b.x, dz = z + O.oz - b.z, d = Math.hypot(dx, dz);
      if (d < SHY && d > 1) { const k = FLEE * (1 - d / SHY) * Math.min(dtNow, 0.1); O.ox += (dx / d) * k; O.oz += (dz / d) * k; vx = dx / d; vz = dz / d; }
    }
    x += O.ox; z += O.oz;
    // now and then a hop on the spot (the furcula, flicked lightly): a low arc,
    // nose up on the way up and down on the way down, landing on its feet.
    // (Real springtail leaps often tumble end over end; the old one here rolled
    // through 250° and back, which read as bugs flipping upside down.)
    if (!hop) {
      const per = 9 + h(11) * 9, ph = (t + h(12) * per) % per;
      if (ph < LEAP) { const u = ph / LEAP; hop = Math.sin(Math.PI * u) * 0.7; pitch = 0.45 * Math.sin(2 * Math.PI * u); }
    }
    // the big grains and the moss stems are walked round, not through
    if (keepOut) { keepOut(x, z, _ko); if (_ko.x !== x || _ko.z !== z) { O.ox += _ko.x - x; O.oz += _ko.z - z; x = _ko.x; z = _ko.z; } }
    // never a jump: drawn a moment ago, it moves at most MAXV µm/s from there (what is left over joins its offset)
    const P = poses.get(key);
    if (P && now - P.used < 0.25 && P.lx !== undefined) {
      const dx = x - P.lx, dz = z - P.lz, d = Math.hypot(dx, dz), lim = MAXV * Math.max(now - P.used, 1 / 120) + 2;
      if (d > lim) { const k = lim / d, nx = P.lx + dx * k, nz = P.lz + dz * k; O.ox += nx - x; O.oz += nz - z; x = nx; z = nz; stats.jumpsCaught++; }
      stats.maxStep = Math.max(stats.maxStep, Math.min(d, lim) / Math.max(now - P.used, 1 / 120));
    }
    // diving into the moss or climbing out: lower, nose down going in
    const dive = sunk(S, B, t);
    // on its feet on the ground under it (a hop lifts it from there, and lands it there)
    stand(key, x, z, -Math.atan2(vz, vx), sc, 1, pitch - 0.5 * dive, hop * 150 - DEPTH * dive);
    _s.setScalar(sc);
    mesh.setMatrixAt(n++, _m.compose(_p, _q, _s));
    live.push({ key, x, y: _p.y, z, yaw: -Math.atan2(vz, vx), sc, stunned: false, held: false, dive });
  }
  const find = (key) => live.find((b) => b.key === key);
  const scatterFrom = (key, fx, fz) => scatters.set(+key.split(':')[0], { t0: now, x: fx, z: fz });
  const crumbs = (type, s) => { for (let m = 0; m < s.n; m++) { const P = poses.get(`${s.k}:${m}`); const x = P ? P.lx : s.x, z = P ? P.lz : s.z; events.push({ type, x, y: ground(x, z), z }); } };
  return {
    mesh, site, sitesNear, CELL, DRAW, live, bugs, scatters, offs, shown, SHY, STUN, MAXV, DIVE, stats, events,
    /** Groups first drawn so far (each lattice site, once). */
    get seen() { return seenK.size; },
    /** The springtail nearest (x, y, z) within r (as drawn last update), or null: { key, x, y, z, stunned, d }. */
    nearest(x, y, z, r, accept = () => true) {
      let best = null, bd = r;
      for (const b of live) {
        if (b.held || (b.dive || 0) > 0.3) continue;
        const d = Math.hypot(b.x - x, (b.y - y) * 0.5, b.z - z);
        if (d < bd && accept(b)) { bd = d; best = b; }
      }
      return best ? { ...best, d: bd } : null;
    },
    /**
     * X on a springtail (the owner, 2026-11-04: "a single press of X grab the creature and start eating
     * it"): it is seized from (fx, fz) where it stands (the caller holds it to the mouth: hold, then
     * eaten, or drop if it wriggles free) and the rest of its group leap away. False if it is gone.
     */
    grab(key, fx, fz) {
      const b = find(key);
      if (!b || b.held) return false;
      bugs.set(key, { stun: now + 1e9, x: b.x, z: b.z, yaw: -Math.atan2(b.z - fz, b.x - fx) + Math.PI, eaten: 0, grabbed: true });
      scatterFrom(key, fx, fz);
      return true;
    },
    /**
     * The old two-bite rule's first bite, kept for the checks: a lively one is stunned where it stands and
     * the rest of its group leap away ('stunned'); a dazed one is caught ('caught').
     */
    nip(key, fx, fz) {
      const b = find(key);
      if (!b) return null;
      const B = bugs.get(key);
      if (B && B.stun > now) { B.stun = now + 9; return 'caught'; }
      bugs.set(key, { stun: now + STUN, x: b.x, z: b.z, yaw: -Math.atan2(b.z - fz, b.x - fx) + Math.PI, eaten: 0 });
      scatterFrom(key, fx, fz);
      return 'stunned';
    },
    /**
     * While eaten: drawn at p (world), at scale s (1 whole .. 0 gone); pose:
     * { pitch (more nose up), roll, twist } while held up and struggling.
     */
    hold(key, p, s, pose = null) { const B = bugs.get(key); if (B) B.held = { p: p.clone(), s, pitch: pose ? pose.pitch : 0, roll: pose ? pose.roll : 0, twist: pose ? pose.twist : 0 }; },
    /** Eating cut short: it drops where it was held, dazed a moment, then walks back to its group (never a jump). */
    drop(key) { const B = bugs.get(key); if (B && B.held) { B.x = B.held.p.x; B.z = B.held.p.z; B.held = null; B.stun = now + 1; B.grabbed = false; } },
    /** Eaten: gone until another climbs out of the moss in its place (BACK s). */
    eaten(key) { const B = bugs.get(key); if (B) { B.held = null; B.stun = 0; B.eaten = now + BACK; offs.delete(key); } },
    /** Pushed (shared/push.js, main.js) by (dx, dz) µm: its offset (or, dazed, where it lies) moves. */
    pushBy(key, dx, dz) {
      const B = bugs.get(key);
      if (B && B.held) return;
      if (B && B.stun > now) { B.x += dx; B.z += dz; return; }
      const O = offOf(key); O.ox += dx; O.oz += dz;
      const P = poses.get(key); if (P && P.lx !== undefined) { P.lx += dx; P.lz += dz; }
    },
    /**
     * Each frame: t the clock; bodies [{ x, z }] it shies from; foci [{ x, z, r? }] round which the groups
     * are drawn (r µm, DRAW by default: the players, and each view's target with its reach); inSight(x, z,
     * r): can a view see that disc (main.js; none: nothing is in sight).
     */
    update(t, bodies, foci, inSight = null) {
      dtNow = Math.max(0, Math.min(0.1, t - now));
      n = 0; now = t; live.length = 0; events.length = 0;
      const seen = (x, z) => (inSight ? inSight(x, z, 700) : false);
      // the groups wanted: within reach of a focus (a shown one kept a little farther: no flicker at the edge)
      const want = new Map();
      for (const f of foci) {
        const R = f.r || DRAW;
        for (const s of sitesNear(f.x, f.z, R + 700)) {
          const d = Math.hypot(s.x - f.x, s.z - f.z);
          if (d > R && !shown.has(s.k)) continue;
          const w = want.get(s.k);
          if (!w || d - R < w.d) want.set(s.k, { s: shown.has(s.k) ? shown.get(s.k).s : s, d: d - R });
        }
      }
      // (a shown group whose site is now blocked, the portal's arena placed on it, is still wanted until it can dive)
      for (const [k, S] of shown) if (!want.has(k) && Math.min(...foci.map((f) => Math.hypot(S.s.x - f.x, S.s.z - f.z) - (f.r || DRAW))) < 700 && !site(Math.floor(S.s.x / CELL), Math.floor(S.s.z / CELL))) want.set(k, { s: S.s, d: 0, blocked: true });
      // the instance cap: the groups already shown first, then the nearest
      const order = [...want.values()].sort((p, q) => (shown.has(q.s.k) - shown.has(p.s.k)) || p.d - q.d);
      let budget = max;
      const keep = new Set();
      for (const w of order) { if (budget - w.s.n < 0) { stats.capped++; continue; } budget -= w.s.n; keep.add(w.s.k); }
      // leaving: out of sight, simply dropped; in sight, they dive into the moss first
      for (const [k, S] of shown) {
        const blockedNow = want.get(k)?.blocked;
        if (keep.has(k) && !blockedNow) { if (S.dive !== null && !seen(S.s.x, S.s.z)) S.dive = null; continue; }
        if (!seen(S.s.x, S.s.z) && S.dive === null) { shown.delete(k); continue; }
        if (S.dive === null) { S.dive = t; S.rise = null; stats.dives++; crumbs('dive', S.s); }
        else if (t - S.dive > DIVE) { shown.delete(k); dived.set(k, S.s); }
      }
      // coming: out of sight, simply there; in sight, they climb out of the moss (never one that just dove, while seen)
      for (const k of keep) {
        if (shown.has(k)) continue;
        const s = want.get(k).s;
        if (dived.has(k)) { if (seen(s.x, s.z)) continue; dived.delete(k); }
        const S = { s, since: t, dive: null, rise: null };
        if (seen(s.x, s.z)) { S.rise = t; stats.rises++; }
        shown.set(k, S);
        if (S.rise !== null) crumbs('rise', s);
      }
      for (const [k, s] of dived) if (!seen(s.x, s.z)) dived.delete(k);
      // an eaten one's time is up: another wanders into its place, climbing out of the moss (crumbs where it comes up)
      for (const [k, B] of bugs) {
        if (B.held || !(B.eaten > 0) || B.eaten >= t || B.emerge !== undefined) continue;
        B.eaten = 0; B.emerge = t; offs.delete(k);
        const P = poses.get(k), x = P ? P.lx : B.x, z = P ? P.lz : B.z;
        if (x !== undefined) events.push({ type: 'rise', x, y: ground(x, z), z });
      }
      for (const [k, S] of shown) {
        if (S.rise !== null && t - S.rise > DIVE) S.rise = null;
        seenK.add(k);
        for (let m = 0; m < S.s.n && n < max; m++) member(S.s, m, t, bodies, S);
      }
      for (const [k, B] of bugs) {
        if (B.held || B.stun >= t) continue;
        if (B.eaten > t) continue;
        if (B.emerge !== undefined && t - B.emerge < DIVE) continue;
        bugs.delete(k);
      }
      // poses of members not drawn for a while are dropped (and their offsets, faded anyway)
      if (poses.size > max * 2) for (const [k, P] of poses) if (P.used < t - 2) { poses.delete(k); offs.delete(k); }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    },
    /** Testing: group `k` (a site's key) dives into the moss now, as one that must go while seen does. */
    forceDive(k) { const S = shown.get(k); if (!S || S.dive !== null) return false; S.dive = now; S.rise = null; stats.dives++; crumbs('dive', S.s); dived.set(k, S.s); return true; },
    reset() { bugs.clear(); scatters.clear(); offs.clear(); shown.clear(); dived.clear(); },
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
 * Where a drop may land: a random spot round player p, at least DRIP.clear from
 * every player, now and `lead` s on at their velocity (so never on one, nor in
 * the way of one walking on), at most DRIP.scatter from p (in sight), clear of
 * the thickets and inside the edge; null after a few tries. rand: 0..1.
 */
export function scatterSpot(p, players, rand = Math.random, taken = [], lead = 0) {
  // where each player will be when it lands, if they keep going (vx, vz µm/s): clear of that too
  const ahead = players.map((q) => ({ x: q.x + (q.vx || 0) * lead, z: q.z + (q.vz || 0) * lead }));
  for (let t = 0; t < 24; t++) {
    const a = rand() * Math.PI * 2, d = DRIP.clear + rand() * (DRIP.scatter - DRIP.clear);
    const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    if (players.some((q) => Math.hypot(q.x - x, q.z - z) < DRIP.clear)) continue;
    if (ahead.some((q) => Math.hypot(q.x - x, q.z - z) < DRIP.clear)) continue;
    if (taken.some((q) => Math.hypot(q.x - x, q.z - z) < DRIP.r * 3)) continue;
    if (!clearOfThickets(x, z, DRIP.r, 0) || !insideEdge(x, z, 600)) continue;
    return { x, z };
  }
  return null;
}

/**
 * Falling drops: a pool of n (one, or DRIP.shower). arm(spots [{ x, z, delay }]) sets
 * them over the moss (hidden), update(dt, players [{ x, z, vx?, vz? }]) starts them falling
 * once anyone is within DRIP.trigger of the first, each at its own scatterSpot
 * round whoever came near (never aimed at a player), and returns events
 * [{ type: 'fall' | 'splash', x, z }]. Before each drop falls, and as it falls, a
 * ring on the moss marks where it will land (DRIP.warn s). fallAt(spots) drops
 * them at exactly those spots (testing). wetAt(x, z, r): how deep a body of
 * radius r at (x, z) is in a bead now (0..1). state: idle | armed | falling | done.
 */
export function createDrops({ scene, n = DRIP.shower, rand = Math.random }) {
  const mat = gMaterial({ cls: CLS.GRAIN, thin: 0 });
  const ringMat = gMaterial({ cls: CLS.GRAIN, thin: 1 });
  const geo = new THREE.IcosahedronGeometry(DRIP.r, 3);
  const ringGeo = new THREE.TorusGeometry(DRIP.r * 1.4, 9, 6, 48).rotateX(Math.PI / 2);
  const drops = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(geo, mat); m.visible = false; m.name = 'drop'; scene.add(m);
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.visible = false; ring.name = 'drop mark'; scene.add(ring);
    return { m, ring, x: 0, z: 0, y: 0, vy: 0, delay: 0, state: 'idle', t: 0, fy: 0, k: 0 };
  });
  const hide = (d) => { d.m.visible = false; d.ring.visible = false; };
  const start = (spots) => {
    drops.forEach((d, i) => {
      const s = spots[i];
      if (!s || d.state !== 'armed') { if (d.state === 'armed') { d.state = 'idle'; hide(d); } return; }
      d.x = s.x; d.z = s.z; d.fy = floorH(d.x, d.z); d.y = d.fy + DRIP.height;
      d.delay += DRIP.warn; d.ring.visible = true; d.ring.position.set(d.x, d.fy + 12, d.z);
    });
    api.state = 'falling';
  };
  const api = {
    drops, state: 'idle', spot: null, at: null,
    arm(spots) {
      api.state = 'armed'; api.spot = spots[0]; api.at = null;
      drops.forEach((d, i) => {
        const s = spots[i];
        if (!s) { d.state = 'idle'; hide(d); return; }
        d.x = s.x; d.z = s.z; d.delay = s.delay || 0; d.fy = floorH(s.x, s.z); d.y = d.fy + DRIP.height; d.vy = 0; d.state = 'armed'; hide(d); d.t = 0; d.k = 0;
      });
    },
    reset() { api.state = 'idle'; api.spot = null; api.at = null; for (const d of drops) { d.state = 'idle'; hide(d); } },
    /** Testing: drop the pool at exactly these spots [{ x, z, delay }] now (after the warning). */
    fallAt(spots) { api.arm(spots); api.spot = null; api.at = { x: spots[0].x, z: spots[0].z }; start(spots); return api.at; },
    wetAt(x, z, r = 0) {
      let w = 0;
      for (const d of drops) if (d.state === 'bead') {
        const br = DRIP.r * 1.5 * (0.4 + 0.6 * d.k), dd = Math.hypot(d.x - x, d.z - z);
        if (d.k > 0.05 && dd < br + r * 0.5) w = Math.max(w, d.k * clamp(1 - dd / (br + r * 0.5), 0.3, 1));
      }
      return w;
    },
    update(dt, players) {
      const ev = [];
      const p = api.state === 'armed' && api.spot && players.find((q) => Math.hypot(q.x - api.spot.x, q.z - api.spot.z) < DRIP.trigger);
      if (p) {
        // each drop lands somewhere in the moss round whoever came near, never on anyone (spots that fit
        // nowhere stay dry); the first one's spot is where the fall is said to be
        const spots = [];
        const fall = Math.sqrt((2 * DRIP.height) / 5200);
        for (let i = 0; i < drops.length; i++) { const s = scatterSpot(p, players, rand, spots, DRIP.warn + fall + (drops[i].delay || 0)); if (s) spots.push(s); }
        if (spots.length) {
          start(drops.map((d, i) => spots[i] || null));
          api.at = { x: spots[0].x, z: spots[0].z };
          ev.push({ type: 'fall', x: api.at.x, z: api.at.z });
        } else { api.state = 'done'; for (const d of drops) { d.state = 'idle'; hide(d); } }
      }
      if (api.state !== 'falling') return ev;
      let live = 0;
      for (const d of drops) {
        if (d.state === 'armed') {
          live++;
          // the mark on the moss: a ring that tightens as the moment nears
          const w = clamp(d.delay / DRIP.warn, 0, 1);
          d.ring.scale.setScalar(0.7 + 0.6 * w);
          if ((d.delay -= dt) <= 0) { d.state = 'falling'; d.m.visible = true; }
          else continue;
        }
        if (d.state === 'falling') {
          live++;
          d.vy -= 5200 * dt; d.y += d.vy * dt;
          const st = clamp(-d.vy / 4000, 0, 0.35);
          d.ring.scale.setScalar(0.55 + 0.15 * clamp((d.y - d.fy) / DRIP.height, 0, 1));
          if (d.y - DRIP.r <= d.fy) { d.state = 'bead'; d.t = 0; d.k = 1; d.y = d.fy; d.ring.visible = false; ev.push({ type: 'splash', x: d.x, z: d.z }); }
          d.m.position.set(d.x, d.y, d.z); d.m.scale.set(1 - st * 0.3, 1 + st, 1 - st * 0.3);
        } else if (d.state === 'bead') {
          live++;
          d.t += dt;
          // a flattened dome that wobbles, then soaks away into the moss over ~4 s
          const k = 1 - sstep(1.2, 4.5, d.t), wob = 0.12 * Math.exp(-d.t * 3) * Math.sin(d.t * 30);
          d.k = k;
          d.m.position.set(d.x, d.fy - DRIP.r * 0.45, d.z);
          d.m.scale.set((1.5 + wob) * (0.4 + 0.6 * k), (0.75 - wob) * k + 0.01, (1.5 + wob) * (0.4 + 0.6 * k));
          if (d.t > 4.5) { d.state = 'done'; d.k = 0; hide(d); }
        }
      }
      if (!live) api.state = 'done';
      return ev;
    },
  };
  return api;
}
