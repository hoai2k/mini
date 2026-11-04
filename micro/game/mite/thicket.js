// The crowd set piece (micro/design/combat-ideas.md, "pushing and biting
// through a crowd"): hyphal thickets full of springtails, laid out as two
// rings of clusters round the start (layout.js CLUSTERS: the encounter
// pattern's static obstacles, close enough that every way out meets one).
//
// - Each thicket's threads run between fungal conidiophores at a mite's body
//   height (buildCluster). Bodies push them aside, but
//   every thread across you drags (drag()). A bite (X) grazes the threads in
//   front away for good (real oribatid feeding: they graze hyphae); they
//   regrow slowly once nobody is near.
// - The springtails are a crowd (shared/crowd.js): soft bodies that drift and
//   jostle and part round a mite that walks into them; a bite shoves the ones
//   in front aside (a box mite does not eat springtails: it scatters them).
//   Members never attack. Closed up (Y), the crowd flows round the capsule.
// - The owner: moving and attacking clear the way without much difficulty,
//   and nothing here is timed. The drag never stops you (at worst half
//   speed), the scramble (B) halves it, and two or three bites open a lane.
// - The gamasid eats springtails when it comes upon a thicket (it is busy:
//   S38 in the atlas): now and then one in front of its chelicerae.
// Only the clusters near someone are simulated (their threads, their crowd).
import * as THREE from '../shared/vendor/three.module.min.js';
import { createCrowd } from '../shared/crowd.js';
import { createFoliage } from '../shared/techniques/mite-foliage.js';
import { gMaterial, CLS } from '../shared/techniques/mite-sem.js';
import { floorH, mergeGeos } from './world.js';
import { rng } from './textures.js';
import { standSpringtail } from './stand.js';

/**
 * A small soil springtail (Isotomidae-like, ~190 µm long, a juvenile size),
 * body along +x, head at +x, its centre ~56 µm above the ground (the crowd
 * sits members at 0.8 radius): a segmented, slightly arched body, a head with
 * two four-segment antennae, three pairs of short legs, the furcula folded
 * under the abdomen. Low-poly: one ~440-triangle mesh drawn for every member.
 */
export function springtailGeometry() {
  const parts = [];
  // body: one elongated ellipsoid, ringed by segment furrows (3 thoracic + 6 abdominal)
  const body = new THREE.SphereGeometry(1, 18, 9);
  {
    const p = body.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ring = 1 - 0.1 * Math.abs(Math.sin((x + 1) * Math.PI * 4.5)); // furrows
      const arch = 6 * (1 - x * x); // a slight hump
      p.setXYZ(i, x * 82 - 12, y * 30 * ring + arch * (y > -0.3 ? 1 : 0.4), z * 32 * ring);
    }
    body.computeVertexNormals();
  }
  parts.push(body);
  // head, tipped down a little
  const head = new THREE.SphereGeometry(1, 12, 7);
  head.scale(30, 25, 27); head.rotateZ(-0.35); head.translate(78, 2, 0);
  parts.push(head);
  // eye patches
  for (const s of [-1, 1]) { const e = new THREE.SphereGeometry(1, 6, 4); e.scale(8, 6, 5); e.translate(88, 14, s * 20); parts.push(e); }
  const rod = (a, b, r0, r1 = r0 * 0.7, sides = 5) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const g = new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), sides, 1);
    g.translate(0, A.distanceTo(B) / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
    g.translate(A.x, A.y, A.z);
    parts.push(g);
  };
  // antennae: forward and up, four segments
  for (const s of [-1, 1]) {
    let a = [96, 14, s * 10];
    for (const [dx, dy, dz, r] of [[22, 14, 10, 8], [24, 8, 10, 7], [24, 2, 8, 6], [22, -4, 6, 5]]) {
      const b = [a[0] + dx, a[1] + dy, a[2] + s * dz];
      rod(a, b, r);
      a = b;
    }
  }
  // three pairs of short legs, splayed to the ground (~-56 below the centre)
  for (const [x, k] of [[48, 0], [24, 1], [0, 2]]) for (const s of [-1, 1]) {
    const hip = [x, -14, s * 22], knee = [x + 6 - 8 * k, -30, s * 46], foot = [x + 10 - 14 * k, -54, s * 52];
    rod(hip, knee, 9, 8); rod(knee, foot, 8, 4);
  }
  // the furcula (springing organ), folded forward under the abdomen
  for (const s of [-1, 1]) rod([-70, -22, s * 7], [-20, -32, s * 9], 7, 4.5);
  // the ventral tube (collophore)
  const vt = new THREE.CylinderGeometry(6, 8, 14, 6, 1); vt.translate(14, -32, 0); parts.push(vt);
  for (const g of parts) if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const ng = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of ng) g.computeVertexNormals();
  return mergeGeos(ng);
}

/**
 * One thicket: a fungal colony in the litter. Conidiophores (upright
 * spore-bearing stalks, 120-270 µm, a spore head on top, food) stand through
 * it and threads run between them at a mite's body height. Bodies push the
 * threads aside (they drag: drag() slows a mite by the threads across it); a
 * bite grazes a thread away, and it regrows after a while once nobody is near.
 * Its own springtails (a small crowd) drift and jostle in it.
 */
function buildCluster(c, k, { mats, crowdGeo, crowdMat, scene, perCluster }) {
  const group = new THREE.Group();
  const TR = rng(4242 + k * 97);
  const thread = (pts, r, segs) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segs, r, 4, false);
  const posts = [];
  for (let i = 0; i < c.posts; i++) {
    const a = TR() * Math.PI * 2, d = Math.sqrt(TR()) * c.r;
    const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
    const p = new THREE.Vector3(x, floorH(x, z), z);
    p.h = 120 + TR() * 150;
    posts.push(p);
  }
  const pGeos = [], sGeos = [], headGeos = [], food = [], strands = [];
  for (const p of posts) {
    const top = p.clone(); top.y += p.h;
    const mid = p.clone().lerp(top, 0.5); mid.x += (TR() - 0.5) * 30; mid.z += (TR() - 0.5) * 30;
    pGeos.push(thread([p, mid, top], 3.2, 6));
    const head = new THREE.IcosahedronGeometry(14 + TR() * 8, 1); head.translate(top.x, top.y + 8, top.z);
    headGeos.push(head);
    food.push({ kind: 'head', p: top.clone().add(new THREE.Vector3(0, 8, 0)), geo: head, left: 1, t: 0, i: headGeos.length - 1, start: 0, count: 0, mesh: null, rest: null });
  }
  // threads: between pairs of nearby stalks, at 35-95% of their height, sagging
  const pairs = [];
  for (let i = 0; i < posts.length; i++) {
    const near = posts.map((q, j) => [j, q.distanceTo(posts[i])]).filter(([j, d]) => j !== i && d > 140 && d < 560).sort((a, b) => a[1] - b[1]).slice(0, 3);
    for (const [j] of near) if (i < j || !near.some(([q]) => q === j)) pairs.push([i, j]);
  }
  const seen = new Set();
  for (const [i, j] of pairs) {
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const A = posts[i], Bp = posts[j];
    const a = A.clone(); a.y += A.h * (0.35 + TR() * 0.6);
    const b = Bp.clone(); b.y += Bp.h * (0.35 + TR() * 0.6);
    const span = a.distanceTo(b);
    const pts = [];
    for (let q = 0; q <= 10; q++) {
      const t = q / 10;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(Math.PI * t) * span * (0.12 + TR() * 0.1);
      p.x += Math.sin(t * 7 + i) * 6; p.z += Math.cos(t * 5 + j) * 6;
      p.y = Math.max(p.y, floorH(p.x, p.z) + 30);
      pts.push(p);
    }
    sGeos.push(thread(pts, 1.8 + TR() * 0.8, 14));
    strands.push({ pts, a: pts[0].clone(), b: pts[10].clone(), samples: pts.slice(1, 10), geoIndex: sGeos.length - 1, cut: 0, t: 0, rod: null, geo: null, start: 0, count: 0, rest: null, mid: null, half: 0 });
  }
  const sMesh = new THREE.Mesh(mergeGeos(sGeos), mats.hypha);
  const postsMesh = new THREE.Mesh(mergeGeos(pGeos), mats.hypha);
  const headsMesh = new THREE.Mesh(mergeGeos(headGeos), mats.spore);
  group.add(sMesh, postsMesh, headsMesh);
  // each spore head: its own vertex range, so a grazed one can shrink away
  let o = 0;
  for (const f of food) { f.start = o; f.count = headGeos[f.i].attributes.position.count; o += f.count; f.mesh = headsMesh; f.rest = headsMesh.geometry.attributes.position.array.slice(f.start * 3, (f.start + f.count) * 3); }
  const foliage = createFoliage({ near: 650 });
  o = 0;
  for (const st of strands) {
    st.geo = sMesh.geometry; st.start = o; st.count = sGeos[st.geoIndex].attributes.position.count; o += st.count;
    st.rest = st.geo.attributes.position.array.slice(st.start * 3, (st.start + st.count) * 3);
    st.rod = foliage.add({ geo: st.geo, start: st.start, count: st.count, base: st.a, tip: st.b, samples: st.samples, kind: 'string', stiff: 0.5 });
    st.mid = st.a.clone().lerp(st.b, 0.5);
    st.half = st.a.distanceTo(st.b) / 2;
  }
  scene.add(group);
  const mesh = new THREE.InstancedMesh(crowdGeo, crowdMat, perCluster);
  mesh.name = 'springtails';
  const crowd = createCrowd({ scene, THREE, count: perCluster, region: { x: c.x, z: c.z, r: c.r }, radius: 70, height: floorH,
    mesh, mode: '3d', playerRadius: 190, respawn: 9, dieTime: 0.9, speed: 50, seed: 2718 + k * 31 });
  return { ...c, k, group, strands, food, foliage, crowd, mesh, headsMesh, predT: 3 + (k % 3) };
}

/**
 * The thickets: clusters [{ x, z, r, posts }] (layout.js CLUSTERS), each
 * built once where it stands. The API speaks for whichever cluster is near.
 */
export function createThickets({ scene, tex, clusters, perCluster = 30, ground = floorH }) {
  const mats = { hypha: gMaterial({ cls: CLS.HYPHA, thin: 1 }), spore: gMaterial({ cls: CLS.SPORE, thin: 0 }) };
  const crowdGeo = springtailGeometry();
  const crowdMat = gMaterial({ cls: CLS.NPC, tex: tex.cuticle, map: 'tri', scale: 70, bump: 1.2 });
  const list = clusters.map((c, k) => buildCluster(c, k, { mats, crowdGeo, crowdMat, scene, perCluster }));
  // The crowd (shared/crowd.js) sits each member level at its centre's floor
  // height: on a slope the downhill feet went into the moss (up to 19 µm), and
  // over a grain or a flake the whole body did. Each member written is stood
  // again on its feet (stand.js), keeping the crowd's heading, stretch and wobble.
  const _st = { y: 0, q: new THREE.Quaternion(), pen: 0, n: new THREE.Vector3() };
  const _mm = new THREE.Matrix4(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();
  // An eaten member's replacement does not grow out of nothing where it
  // arrives (the crowd scales it up from 0 over 1.2 s): it climbs out of the
  // moss at full size, in a puff of crumbs (events), the way springtails come
  // up out of soil pores (the owner, 2026-11-04: no "disappear suddenly" type
  // of effect). One eaten by the predator shrinks away between its chelicerae
  // (dieTime 0.9 s, with its bite).
  const RISE = 150; // µm under the floor where it starts
  const events = [];
  function standCrowd(cl) {
    const a = cl.mesh.instanceMatrix.array, M = cl.crowd.members, N = M.count;
    const prev = cl.prevLife || (cl.prevLife = Float32Array.from(M.life));
    for (let i = 0; i < N; i++) {
      const o = i * 16;
      let sf = Math.hypot(a[o], a[o + 2]);
      const life = M.life[i], arriving = M.alive(i) && life < 1;
      if (arriving && prev[i] === 0 && life > 0) events.push({ type: 'rise', x: a[o + 12], y: ground(a[o + 12], a[o + 14]), z: a[o + 14] });
      prev[i] = life;
      if (sf < 1e-4 && !arriving) continue; // gone (eaten, not yet back)
      const yaw = -Math.atan2(a[o + 2], a[o]);
      let su = a[o + 5], ss = Math.hypot(a[o + 8], a[o + 10]), sink = 0;
      if (arriving) { const k = 1 / Math.max(life, 0.02); sf *= k; su *= k; ss *= k; sink = RISE * (1 - life) * (1 - life); }
      if (!(sf > 1e-4)) continue;
      const x = a[o + 12], z = a[o + 14];
      standSpringtail(ground, x, z, yaw, sf, su, ss, 0, 0, _st);
      _mm.compose(_mp.set(x, _st.y - sink, z), _st.q, _ms.set(sf, su, ss)).toArray(a, o);
    }
    cl.mesh.instanceMatrix.needsUpdate = true;
  }
  for (const cl of list) standCrowd(cl);
  const food = list.flatMap((c) => c.food);
  const _o = new THREE.Vector3(), _p = new THREE.Vector3();
  /** Distance (µm) from p to a thread as it is bent now. */
  function strandDist(cl, st, p) {
    let best = Infinity;
    const su = st.rod.su;
    for (let i = 0; i < st.samples.length; i++) {
      cl.foliage.offsetAt(st.rod, su[i], _o);
      _p.copy(st.samples[i]).add(_o);
      const d = _p.distanceTo(p);
      if (d < best) best = d;
    }
    return best;
  }
  const nearC = (cl, p, m = 0) => { const dx = p.x - cl.x, dz = p.z - cl.z, R = cl.r + m; return dx * dx + dz * dz < R * R; };
  /** The cluster nearest p (by its edge), within margin m, or null. */
  function at(p, m = 0) {
    let best = null, bd = Infinity;
    for (const cl of list) {
      const d = Math.hypot(p.x - cl.x, p.z - cl.z) - cl.r;
      if (d < m && d < bd) { bd = d; best = cl; }
    }
    return best;
  }
  /** Graze a thread away (it is gone until it regrows). */
  function cut(cl, st) {
    if (st.cut) return;
    st.cut = 1; st.t = 40;
    const i = cl.foliage.rods.indexOf(st.rod);
    if (i >= 0) cl.foliage.rods.splice(i, 1);
    const P = st.geo.attributes.position;
    for (let k = 0; k < st.count; k++) P.setXYZ(st.start + k, st.a.x, st.a.y, st.a.z);
    P.needsUpdate = true;
  }
  /** Regrow grazed threads after a while, once no body is within 600 µm. */
  function regrow(cl, dt, bodies) {
    for (const st of cl.strands) {
      if (!st.cut || (st.t -= dt) > 0) continue;
      if (bodies.some((b) => Math.hypot(b.x - st.mid.x, b.z - st.mid.z) < 600)) { st.t = 2; continue; }
      st.cut = 0;
      st.rod.d.set(0, 0, 0); st.rod.vel.set(0, 0, 0);
      cl.foliage.rods.push(st.rod);
      st.geo.attributes.position.array.set(st.rest, st.start * 3);
      st.geo.attributes.position.needsUpdate = true;
    }
  }
  const log = { cleared: 0, shoved: 0, eatenByPredator: 0 };
  const api = {
    /** Crumbs since last asked: [{ type: 'rise' (one climbs out of the moss) | 'eaten' (the predator's bite), x, y, z }]. */
    takeEvents() { const out = events.slice(); events.length = 0; return out; },
    clusters: list, food, log,
    /** The first cluster's crowd (tests). */
    get crowd() { return list[0].crowd; },
    /** Is p in a thicket (plus a margin)? Returns that cluster (or null). */
    inside: (p, m = 0) => at(p, m),
    /** A grazed spore head shrinks (s 1 whole .. 0 gone) toward its centre. */
    shrinkHead(f, s) {
      const P = f.mesh.geometry.attributes.position;
      for (let k = 0; k < f.count; k++) {
        const r = 3 * k;
        P.setXYZ(f.start + k, f.p.x + (f.rest[r] - f.p.x) * s, f.p.y + (f.rest[r + 1] - f.p.y) * s, f.p.z + (f.rest[r + 2] - f.p.z) * s);
      }
      P.needsUpdate = true;
    },
    /** The threads of the clusters near any body move (bodies as for createFoliage, in world space). */
    updateFoliage(dt, bodies) {
      for (const cl of list) {
        let near = false;
        for (const b of bodies) if (nearC(cl, b.center, 1400)) { near = true; break; }
        if (near || cl.awake) { cl.foliage.update(dt, bodies); cl.awake = near || cl.foliage.stats.moving > 0; }
      }
    },
    /**
     * Each frame. bodies: [{ position (world), radius, slot }] for the players'
     * mites and the predator (all of them shove springtails aside); pred: the
     * predator (createMite) and whether it is free to feed (not hunting you).
     */
    update(dt, bodies, { pred = null, predFree = false, predBody = null } = {}) {
      for (const cl of list) {
        let near = false;
        for (const b of bodies) if (b !== predBody && nearC(cl, b.position, 2800)) { near = true; break; }
        if (!near) continue; // no player near: this crowd waits
        cl.crowd.update(dt, bodies);
        standCrowd(cl);
        // the gamasid feeds on springtails in front of its chelicerae every few seconds
        if (pred && predFree && nearC(cl, pred.center, 100) && (cl.predT -= dt) <= 0) {
          cl.predT = 3 + Math.random() * 3;
          const m = pred.mouth(_p);
          const f = _o.set(1, 0, 0).applyQuaternion(pred.quat).setY(0).normalize();
          const n = cl.crowd.bite(m, { x: f.x, z: f.z }, 150, { angle: 0.7, eat: true });
          if (n) { pred.bite(); log.eatenByPredator += n; events.push({ type: 'eaten', x: m.x, y: m.y, z: m.z }); }
        }
        regrow(cl, dt, bodies.map((b) => b.position));
      }
    },
    /**
     * How much the thicket slows a mite at `center` (1 free .. 0.5): the
     * threads across its body and the springtails pressing on it. `threads`
     * and `press` are returned too, for the HUD and the checks.
     */
    drag(center, out = { k: 1, threads: 0, press: 0 }) {
      out.k = 1; out.threads = 0; out.press = 0;
      const cl = at(center, 300);
      if (!cl) return out;
      for (const st of cl.strands) {
        if (st.cut || st.mid.distanceTo(center) > st.half + 200) continue;
        if (strandDist(cl, st, center) < 120) out.threads++;
      }
      const M = cl.crowd.members;
      for (let i = 0; i < M.count; i++) {
        if (!M.alive(i)) continue;
        const dx = M.x[i] - center.x, dz = M.z[i] - center.z;
        if (dx * dx + dz * dz < 330 * 330) out.press++; // in contact (the crowd keeps them ~260 out)
      }
      out.k = Math.max(0.5, 1 / (1 + 0.09 * out.threads + 0.03 * out.press));
      return out;
    },
    /** Something to clear in front of the mouth (threads or springtails)? */
    canClear(mouth) {
      const cl = at(mouth, 250);
      if (!cl) return false;
      for (const st of cl.strands) if (!st.cut && st.mid.distanceTo(mouth) < st.half + 220 && strandDist(cl, st, mouth) < 190) return true;
      const M = cl.crowd.members;
      for (let i = 0; i < M.count; i++) if (M.alive(i) && Math.hypot(M.x[i] - mouth.x, M.z[i] - mouth.z) < 200) return true;
      return false;
    },
    /** A bite at the mouth, facing fwd {x, z}: grazes away the threads in reach, shoves the springtails in front aside. */
    bite(mouth, fwd) {
      let threads = 0, shoved = 0;
      const cl = at(mouth, 300);
      if (cl) {
        const hits = [];
        for (const st of cl.strands) {
          if (st.cut || st.mid.distanceTo(mouth) > st.half + 240) continue;
          const d = strandDist(cl, st, mouth);
          if (d < 200) hits.push([d, st]);
        }
        hits.sort((a, b) => a[0] - b[0]);
        for (const [, st] of hits.slice(0, 3)) { cut(cl, st); threads++; }
        shoved = cl.crowd.bite(mouth, fwd, 230, { angle: 1.0, eat: false });
      }
      log.cleared += threads; log.shoved += shoved;
      return { threads, shoved };
    },
    /** Threads still standing (all clusters). */
    get standing() { let n = 0; for (const cl of list) for (const st of cl.strands) if (!st.cut) n++; return n; },
  };
  return api;
}
