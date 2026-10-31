// The water around one host cell, as a Goodsell-style molecular illustration.
// Units: 1 = 10 nm. x right, y up toward the sunlit surface film, z toward the
// camera (the play space is a thick slab, ~0.8 µm deep).
//
//  - Host rods (two with receptor patches, one wrong host with none), slowly
//    drifting by Brownian motion. Each carries a forest of LPS on its outer
//    membrane and, on the right hosts, patches of OmpC trimers (the receptor).
//  - A clay/peat platelet near the top: grabs extended fibres, shields from UV.
//  - The edge of an amoeba at the left, which can reach out a pseudopod.
//  - A crowd of jostling molecules and colloids that wraps around the camera.
//  - UV from the surface: uvAt(y).
import * as THREE from '../shared/vendor/three.module.min.js';
import { toonMaterial, inked, inkedInstanced, blobGeometry } from '../shared/techniques/phage-goodsell.js';

export const BOUNDS = { x0: -275, x1: 470, y0: -245, y1: 255, z0: -34, z1: 34 };
export const UV = { y0: 105, y1: 245 };
/** UV-B dose rate 0..1 at height y (humic water absorbs it within a short depth). */
export const uvAt = (y) => { const s = Math.max(0, Math.min(1, (y - UV.y0) / (UV.y1 - UV.y0))); return s * s * (3 - 2 * s); };

const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

const HOSTS = [
  { id: 'A', name: 'Host A', home: [-30, -150, 0], angle: 0.1, half: 78, r: 38, patches: [[-48, -0.25], [8, 0.35], [52, -0.1]],
    receptors: 'OmpC + LPS', defence: 'Restriction enzyme; CRISPR with no matching spacer', odds: 0.6, crispr: false, color: '#c9dc8a', lps: '#86c06a' },
  { id: 'B', name: 'Host B', home: [300, -130, -4], angle: -0.45, half: 58, r: 36, patches: [[-20, 0.2], [30, -0.3]],
    receptors: 'OmpC + LPS', defence: 'Restriction enzyme; CRISPR carrying a matching spacer', odds: 0.15, crispr: true, color: '#d6d58a', lps: '#9cc36a' },
  { id: 'W', name: 'Wrong host', home: [150, 10, 0], angle: 0.85, half: 46, r: 30, patches: [],
    receptors: 'none (a Gram-positive: thick wall, no outer membrane, no OmpC)', defence: '—', odds: 0, crispr: false, wrong: true, color: '#c8b98f', lps: '#b6a36a' },
];

function proceduralEnvelope() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e9edc6'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 3 + Math.random() * 3;
    g.fillStyle = `hsl(${70 + Math.random() * 30},${45 + Math.random() * 20}%,${62 + Math.random() * 14}%)`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(scene) {
  const envTex = proceduralEnvelope();
  const world = { hosts: [], molecules: [], t: 0, opts: { hostBrownian: true, crowd: true } };

  // --- hosts ---
  const lpsGeo = blobGeometry([{ p: [0, 0.6, 0], r: 0.7, c: '#ffffff' }, { p: [0, 1.7, 0], r: 0.65, c: '#ffffff' }, { p: [0.2, 2.8, 0], r: 0.6, c: '#ffffff' }, { p: [0, 3.8, 0.2], r: 0.7, c: '#e8f0c0' }], 0);
  const ompGeo = blobGeometry([{ p: [0.9, 1, 0], r: 1.1, c: '#ffffff' }, { p: [-0.45, 1, 0.8], r: 1.1, c: '#ffffff' }, { p: [-0.45, 1, -0.8], r: 1.1, c: '#ffffff' }, { p: [0, 2.2, 0], r: 0.7, c: '#ffe0b0' }], 1);
  for (const def of HOSTS) {
    const g = new THREE.Group();
    const mat = toonMaterial({ color: def.color, wobble: 1.2, wobbleFreq: 0.05, map: envTex, mapRepeat: [6, 3], mottle: 0.2 });
    const geo = new THREE.CapsuleGeometry(def.r, def.half * 2, 10, 32);
    geo.rotateZ(Math.PI / 2);
    const body = inked(geo, mat, { width: 1.3 });
    g.add(body);
    // LPS forest
    const nL = Math.round(def.half * def.r * 0.16);
    const lps = inkedInstanced(lpsGeo, toonMaterial({ color: '#ffffff', mottle: 0.1 }), nL, { width: 0.5 });
    const lc = new THREE.Color(def.lps);
    const host = { ...def, group: g, body, mat, pos: new THREE.Vector3(...def.home), vel: new THREE.Vector3(), ang: def.angle, angVel: 0, patchList: [], rings: [] };
    const pt = (u, phi, out) => out.set(u, Math.cos(phi) * def.r, Math.sin(phi) * def.r);
    const surf = (u, phi, out, n) => {
      // a point on the capsule (cylinder part or caps) and its normal, host-local
      if (Math.abs(u) <= def.half) { n.set(0, Math.cos(phi), Math.sin(phi)); return pt(u, phi, out); }
      const s = Math.sign(u), over = Math.min(def.r, Math.abs(u) - def.half), a = Math.asin(over / def.r);
      n.set(s * Math.sin(a), Math.cos(a) * Math.cos(phi), Math.cos(a) * Math.sin(phi));
      return out.set(s * def.half, 0, 0).addScaledVector(n, def.r);
    };
    const n = new THREE.Vector3();
    for (let i = 0; i < nL; i++) {
      const u = rand(-def.half - def.r * 0.9, def.half + def.r * 0.9), phi = rand(-Math.PI * 0.75, Math.PI * 0.75);
      surf(u, phi, _p, n);
      _q.setFromUnitVectors(UP, n).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * 6));
      _m.compose(_p, _q, _s.setScalar(def.wrong ? rand(0.9, 1.4) : rand(0.8, 1.2)));
      lps.setMatrixAt(i, _m);
      lps.setColorAt(i, _c.copy(lc).offsetHSL(rand(-0.04, 0.04), 0, rand(-0.08, 0.08)));
    }
    g.add(lps);
    // OmpC receptor patches
    if (def.patches.length) {
      const per = 16;
      const omp = inkedInstanced(ompGeo, toonMaterial({ color: '#ffffff' }), def.patches.length * per, { width: 0.6 });
      let k = 0;
      for (const [u0, phi0] of def.patches) {
        surf(u0, phi0, _p, n);
        host.patchList.push({ local: _p.clone(), normal: n.clone(), radius: 11 });
        for (let i = 0; i < per; i++) {
          const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 9;
          surf(u0 + Math.cos(a) * rr, phi0 + (Math.sin(a) * rr) / def.r, _p, n);
          _q.setFromUnitVectors(UP, n);
          _m.compose(_p, _q, _s.setScalar(rand(0.85, 1.15)));
          omp.setMatrixAt(k, _m);
          omp.setColorAt(k++, _c.set(i % 3 ? '#f08a4b' : '#e8574a'));
        }
        // data overlay ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(12, 0.55, 6, 32), new THREE.MeshBasicMaterial({ color: '#ffe14a', depthTest: false, transparent: true, opacity: 0.9 }));
        surf(u0, phi0, ring.position, n);
        ring.position.addScaledVector(n, 3);
        ring.quaternion.setFromUnitVectors(Z, n);
        ring.renderOrder = 10; ring.visible = false;
        g.add(ring); host.rings.push(ring);
      }
      g.add(omp);
    }
    g.position.copy(host.pos); g.rotation.z = host.ang;
    scene.add(g);
    world.hosts.push(host);
  }

  /** Host-local position of a world point. */
  world.toLocal = (h, p, out = new THREE.Vector3()) => {
    out.subVectors(p, h.pos);
    const c = Math.cos(-h.ang), s = Math.sin(-h.ang);
    return out.set(out.x * c - out.y * s, out.x * s + out.y * c, out.z);
  };
  world.toWorld = (h, l, out = new THREE.Vector3()) => {
    const c = Math.cos(h.ang), s = Math.sin(h.ang);
    return out.set(l.x * c - l.y * s + h.pos.x, l.x * s + l.y * c + h.pos.y, l.z + h.pos.z);
  };
  world.dirToWorld = (h, l, out = new THREE.Vector3()) => {
    const c = Math.cos(h.ang), s = Math.sin(h.ang);
    return out.set(l.x * c - l.y * s, l.x * s + l.y * c, l.z);
  };
  /** Signed distance to a host's envelope surface, with the outward normal (world). */
  world.sdHost = (h, p, nOut) => {
    const l = world.toLocal(h, p, _v);
    const cx = Math.max(-h.half, Math.min(h.half, l.x));
    const d = _p.set(l.x - cx, l.y, l.z);
    const len = d.length() || 1e-6;
    if (nOut) world.dirToWorld(h, d.multiplyScalar(1 / len), nOut);
    return len - h.r;
  };
  /** The nearest host and its distance. */
  world.nearestHost = (p) => {
    let best = null, bd = 1e9;
    for (const h of world.hosts) { if (h.burst) continue; const d = world.sdHost(h, p); if (d < bd) { bd = d; best = h; } }
    return { host: best, d: bd };
  };
  /** The receptor patch under a world point on host h, or null. */
  world.patchAt = (h, p) => {
    const l = world.toLocal(h, p, new THREE.Vector3());
    for (const pt of h.patchList) if (l.distanceTo(pt.local) < pt.radius + 5) return pt;
    return null;
  };
  /** Project a world point onto host h's surface (with a lift along the normal). */
  world.projectToHost = (h, p, lift = 0, out = new THREE.Vector3(), nOut = new THREE.Vector3()) => {
    world.sdHost(h, p, nOut);
    const d = world.sdHost(h, p);
    return out.copy(p).addScaledVector(nOut, -d + lift);
  };

  // --- clay / peat platelet ---
  const clay = { group: new THREE.Group(), pos: new THREE.Vector3(250, 172, -6), half: new THREE.Vector3(40, 5.5, 26), ang: 0.14 };
  const clayCols = ['#a98b6a', '#8f7556', '#b89b78'];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.BoxGeometry(80 - i * 9, 3.4, 52 - i * 6, 8, 1, 6);
    const b = inked(g, toonMaterial({ color: clayCols[i], wobble: 0.7, wobbleFreq: 0.08, mottle: 0.35 }), { width: 1.1 });
    b.position.set(i * 3 - 3, (i - 1) * 3.6, i * 2);
    b.rotation.y = (i - 1) * 0.05;
    clay.group.add(b);
  }
  // humic strands draped on it
  const strandMat = toonMaterial({ color: '#c9a46a', mottle: 0.25 });
  for (let i = 0; i < 4; i++) {
    const pts = []; let x = rand(-45, -10), y = rand(-2, 8), z = rand(-20, 20);
    for (let k = 0; k < 8; k++) { pts.push(new THREE.Vector3(x, y, z)); x += rand(8, 14); y += rand(-4, 4); z += rand(-5, 5); }
    clay.group.add(inked(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 1.3, 6), strandMat, { width: 0.9 }));
  }
  clay.group.position.copy(clay.pos); clay.group.rotation.z = clay.ang;
  scene.add(clay.group);
  world.clay = clay;
  world.sdClay = (p) => {
    const l = _v.subVectors(p, clay.pos);
    const c = Math.cos(-clay.ang), s = Math.sin(-clay.ang);
    const x = l.x * c - l.y * s, y = l.x * s + l.y * c;
    const qx = Math.abs(x) - clay.half.x, qy = Math.abs(y) - clay.half.y, qz = Math.abs(l.z) - clay.half.z;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.hypot(ox, oy, oz) + Math.min(Math.max(qx, qy, qz), 0);
  };

  // --- the amoeba's edge ---
  const amoeba = { center: new THREE.Vector3(-650, 0, -40), r: 372, reach: 0, tip: new THREE.Vector3(), base: new THREE.Vector3(), cup: 0, target: null };
  const amoebaMat = toonMaterial({ color: '#d7c3dc', wobble: 22, wobbleFreq: 0.008, mottle: 0.25 });
  const amBody = inked(new THREE.SphereGeometry(amoeba.r, 72, 48), amoebaMat, { width: 1.4, wobble: 22, wobbleFreq: 0.008, color: '#4a3550' });
  amBody.position.copy(amoeba.center);
  scene.add(amBody);
  // granules in its ectoplasm, seen through the edge
  const granGeo = blobGeometry([{ p: [0, 0, 0], r: 3, c: '#ffffff' }, { p: [2.4, 1, 0], r: 2.2, c: '#ffffff' }], 1);
  const gran = inkedInstanced(granGeo, toonMaterial({ color: '#b48fc0' }), 70, { width: 0.8 });
  for (let i = 0; i < 70; i++) {
    _p.set(-1, rand(-0.6, 0.6), rand(-0.3, 0.5)).normalize().multiplyScalar(amoeba.r - rand(14, 40)).add(amoeba.center);
    _p.x = Math.max(_p.x, -330);
    _m.compose(_p, _q.random(), _s.setScalar(rand(0.7, 1.6)));
    gran.setMatrixAt(i, _m);
    gran.setColorAt(i, _c.set(['#b48fc0', '#9fb2d8', '#d6a2b6'][i % 3]));
  }
  scene.add(gran);
  const podMat = toonMaterial({ color: '#d9c4de', wobble: 2.5, wobbleFreq: 0.06, mottle: 0.25 });
  const pod = inked(new THREE.CapsuleGeometry(1, 1, 8, 20), podMat, { width: 1.2, color: '#4a3550' });
  pod.visible = false;
  scene.add(pod);
  const lipGeo = new THREE.CapsuleGeometry(4.5, 16, 6, 12);
  const lips = [0, 1].map(() => { const l = inked(lipGeo, podMat, { width: 1.2, color: '#4a3550' }); l.visible = false; scene.add(l); return l; });
  const vacuole = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), toonMaterial({ color: '#efe2f2', opacity: 0.45 }));
  vacuole.visible = false;
  scene.add(vacuole);
  amoeba.mesh = amBody; amoeba.pod = pod; amoeba.lips = lips; amoeba.vacuole = vacuole;
  world.amoeba = amoeba;
  world.sdAmoeba = (p) => p.distanceTo(amoeba.center) - amoeba.r;
  /** Pseudopod shape: from base toward tip; open 0..1 opens the cup lips. */
  world.drawPod = (reach, base, tip, open, show = true) => {
    pod.visible = lips[0].visible = lips[1].visible = show && reach > 1;
    if (!pod.visible) return;
    const dir = _v.subVectors(tip, base); const len = dir.length(); dir.normalize();
    const r = 11 - Math.min(4, len * 0.01);
    pod.position.lerpVectors(base, tip, 0.5);
    pod.quaternion.setFromUnitVectors(UP, dir);
    // CapsuleGeometry(1, 1) is 3 long: stretched, the caps become soft ellipsoids, like a limb of cytoplasm
    pod.scale.set(r, Math.max(0.2, len / 3), r);
    const side = _p.crossVectors(dir, Z).normalize();
    lips.forEach((l, i) => {
      const s = i ? 1 : -1;
      const a = (0.25 + 0.9 * open) * s;
      l.position.copy(tip).addScaledVector(side, s * (6 + 4 * open)).addScaledVector(dir, 4);
      l.quaternion.setFromUnitVectors(UP, dir.clone().applyAxisAngle(Z, a));
    });
  };

  // --- the crowd of molecules ---
  const TYPES = [
    { n: 110, s: [1.6, 2.8], sig: 6, geo: blobGeometry([{ p: [0, 0, 0], r: 1, c: '#b58a52' }, { p: [1, 0.4, 0.2], r: 0.8, c: '#c49a5c' }, { p: [-0.7, 0.8, 0], r: 0.7, c: '#a97f4a' }, { p: [0.2, -0.8, 0.5], r: 0.6, c: '#c8a066' }, { p: [-0.9, -0.4, -0.4], r: 0.6, c: '#b88d55' }], 1) },
    { n: 80, s: [1.2, 2.0], sig: 8, geo: blobGeometry([{ p: [0, 0, 0], r: 0.9, c: '#ec8fae' }, { p: [0.9, 0.3, 0], r: 0.75, c: '#f1a0bd' }, { p: [-0.5, 0.8, 0.3], r: 0.7, c: '#e07a9c' }, { p: [0.1, -0.7, -0.4], r: 0.7, c: '#f3b0c6' }], 1) },
    { n: 100, s: [0.9, 1.4], sig: 11, geo: blobGeometry([{ p: [-1, 0, 0], r: 0.55, c: '#8fcf6c' }, { p: [0, 0.3, 0], r: 0.55, c: '#a6dc7a' }, { p: [1, 0, 0.2], r: 0.55, c: '#8fcf6c' }], 0) },
    { n: 190, s: [0.5, 0.8], sig: 16, geo: blobGeometry([{ p: [0, 0, 0], r: 0.8, c: '#e2483d' }, { p: [0.75, 0.5, 0], r: 0.45, c: '#ffffff' }, { p: [-0.75, 0.5, 0], r: 0.45, c: '#ffffff' }], 0) },
    { n: 36, s: [2.6, 3.6], sig: 4, geo: blobGeometry([{ p: [0, 0, 0], r: 1, c: '#6d8fd6' }, { p: [1.3, 0.2, 0], r: 0.9, c: '#7d9de0' }, { p: [-1.2, 0.3, 0.3], r: 0.9, c: '#5f80c8' }, { p: [0.2, 1.2, 0], r: 0.8, c: '#8aa8e6' }, { p: [0.1, -1.1, 0.3], r: 0.85, c: '#6d8fd6' }, { p: [0.3, 0.1, 1.1], r: 0.8, c: '#5d7ec6' }, { p: [-0.3, 0.2, -1.1], r: 0.8, c: '#7d9de0' }], 1) },
    { n: 40, s: [1.4, 2.0], sig: 5, geo: blobGeometry(Array.from({ length: 7 }, (_, i) => ({ p: [i * 0.9 - 2.7, Math.sin(i * 1.3) * 0.5, Math.cos(i) * 0.3], r: 0.5, c: i % 2 ? '#d8d36a' : '#c2cc5e' })), 1) },
  ];
  const HALF = new THREE.Vector3(175, 120, 0);
  const Z0 = -80, Z1 = 38;
  for (const T of TYPES) {
    const mesh = inkedInstanced(T.geo, toonMaterial({ vertexColors: true, mottle: 0.12 }), T.n, { width: 0.6 });
    scene.add(mesh);
    T.mesh = mesh;
    T.items = Array.from({ length: T.n }, () => ({
      p: new THREE.Vector3(rand(-HALF.x, HALF.x), rand(-HALF.y, HALF.y), rand(Z0, Z1)),
      v: new THREE.Vector3(), q: new THREE.Quaternion().random(), w: new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.6),
      s: rand(...T.s),
    }));
  }
  world.types = TYPES;
  world.gusts = []; // { p, dir, t }

  /** Push the crowd (a gust or a passing phage). */
  world.gust = (p, dir) => world.gusts.push({ p: p.clone(), dir: dir.clone(), t: 0.6 });

  world.flowAt = (p, t, out = new THREE.Vector3()) => out.set(5 * Math.sin(p.y * 0.011 + t * 0.09), 3 * Math.sin(p.x * 0.013 - t * 0.07), 0);

  world.update = (dt, t, center, phage) => {
    world.t = t;
    for (const m of [amoebaMat, amBody.ink.material, podMat]) m.uniforms.uTime.value = t;
    // hosts: slow Brownian drift around home, gentle rocking
    for (const h of world.hosts) {
      if (world.opts.hostBrownian && !h.locked) {
        const k = 0.15;
        h.vel.x += (-h.vel.x * 0.8 + (h.home[0] - h.pos.x) * k) * dt + gauss() * Math.sqrt(dt) * 1.6;
        h.vel.y += (-h.vel.y * 0.8 + (h.home[1] - h.pos.y) * k) * dt + gauss() * Math.sqrt(dt) * 1.6;
        h.pos.x += h.vel.x * dt; h.pos.y += h.vel.y * dt;
        h.angVel += (-h.angVel * 0.8 + (h.angle - h.ang) * 0.2) * dt + gauss() * Math.sqrt(dt) * 0.012;
        h.ang += h.angVel * dt;
      }
      h.group.position.copy(h.pos); h.group.rotation.z = h.ang;
      h.mat.uniforms.uTime.value = t;
    }
    // the crowd: Ornstein-Uhlenbeck jostling, the ambient flow, gusts and the phage's wake, wrapped round the camera
    for (const g of world.gusts) g.t -= dt;
    world.gusts = world.gusts.filter((g) => g.t > 0);
    const flow = new THREE.Vector3();
    for (const T of TYPES) {
      const mesh = T.mesh;
      mesh.visible = world.opts.crowd;
      if (!world.opts.crowd) continue;
      const decay = Math.exp(-dt * 2.2);
      for (let i = 0; i < T.items.length; i++) {
        const it = T.items[i];
        it.v.multiplyScalar(decay);
        it.v.x += gauss() * T.sig * Math.sqrt(dt) * 1.4; it.v.y += gauss() * T.sig * Math.sqrt(dt) * 1.4; it.v.z += gauss() * T.sig * Math.sqrt(dt) * 0.8;
        world.flowAt(it.p, t, flow);
        for (const g of world.gusts) {
          const d = it.p.distanceTo(g.p);
          if (d < 70) it.v.addScaledVector(g.dir, (1 - d / 70) * 90 * dt * (g.t / 0.6));
        }
        if (phage) {
          _v.subVectors(it.p, phage);
          const d = _v.length();
          if (d < 14) it.v.addScaledVector(_v, ((14 - d) / Math.max(d, 1)) * 12 * dt);
        }
        it.p.addScaledVector(it.v, dt).addScaledVector(flow, dt);
        // keep them out of solid things
        for (const h of world.hosts) {
          if (h.burst) continue;
          const sd = world.sdHost(h, it.p, _v);
          if (sd < 5) it.p.addScaledVector(_v, 5 - sd);
        }
        const sa = world.sdAmoeba(it.p);
        if (sa < 0) it.p.addScaledVector(_v.subVectors(it.p, amoeba.center).normalize(), -sa);
        // wrap around the camera
        const dx = it.p.x - center.x, dy = it.p.y - center.y;
        if (dx > HALF.x) it.p.x -= 2 * HALF.x; else if (dx < -HALF.x) it.p.x += 2 * HALF.x;
        if (dy > HALF.y) it.p.y -= 2 * HALF.y; else if (dy < -HALF.y) it.p.y += 2 * HALF.y;
        if (it.p.z > Z1) it.p.z = Z0 + 2; else if (it.p.z < Z0) it.p.z = Z1 - 2;
        _q.setFromAxisAngle(_s.copy(it.w).normalize(), it.w.length() * dt);
        it.q.multiply(_q);
        _m.compose(it.p, it.q, _s.setScalar(it.s));
        mesh.setMatrixAt(i, _m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  };

  world.reset = () => {
    for (const h of world.hosts) {
      h.pos.set(...h.home); h.ang = h.angle; h.vel.set(0, 0, 0); h.angVel = 0; h.burst = false; h.locked = false;
      h.group.visible = true; h.group.scale.setScalar(1);
    }
    amoeba.reach = 0; amoeba.cup = 0;
    world.drawPod(0, amoeba.base, amoeba.tip, 0, false);
    vacuole.visible = false;
  };
  return world;
}
