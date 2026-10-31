// Inside the host, after injection: the phage DNA threads in through the tail
// tube and must get the whole genome in while the host's restriction enzyme
// and CRISPR complex patrol the host's own DNA. LS steers the DNA's leading
// end; the strand behind it follows like a rope in a crowded room.
// Units here: 1 = 1 nm (ten times closer than outside).
import * as THREE from '../shared/vendor/three.module.min.js';
import { toonMaterial, inked, inkedInstanced, blobGeometry, goodsellShared } from '../shared/techniques/phage-goodsell.js';

const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _c = new THREE.Color();
const _sc = new THREE.Vector3();

export const GENOME_NODES = 150; // the strand drawn at 1 node per 3.4 nm turn; the progress bar stands for all 169 kbp
const SEG = 3.4;
const PORE = new THREE.Vector3(0, 52, 0);
const AREA = { x0: -160, x1: 160, y0: -120, y1: 46 };

function proceduralSection() {
  // MP-V03 stand-in: a cross-section of a Gram-negative envelope, drawn Goodsell-style
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
  const g = c.getContext('2d');
  const band = (y0, y1, col) => { g.fillStyle = col; g.fillRect(0, y0, 1024, y1 - y0); };
  band(0, 128, '#f1d9c8');
  band(0, 26, '#cfe6b8');
  for (let x = 0; x < 1024; x += 7) { g.fillStyle = `hsl(${95 + Math.random() * 25},45%,${48 + Math.random() * 12}%)`; g.fillRect(x + Math.random() * 3, 2 + Math.random() * 6, 4, 22); }
  const bilayer = (y) => {
    band(y, y + 26, '#ece6cc');
    for (let x = 0; x < 1024; x += 9) {
      g.fillStyle = '#c9cc6a'; g.beginPath(); g.arc(x + 4, y + 3, 4, 0, 7); g.fill(); g.beginPath(); g.arc(x + 4, y + 23, 4, 0, 7); g.fill();
      g.strokeStyle = '#a9a48a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 3, y + 6); g.lineTo(x + 3, y + 20); g.moveTo(x + 6, y + 6); g.lineTo(x + 6, y + 20); g.stroke();
    }
    for (let x = 30; x < 1024; x += 90 + Math.random() * 80) { g.fillStyle = ['#f0a24a', '#e8737a', '#f2c14e'][Math.floor(Math.random() * 3)]; g.beginPath(); g.roundRect(x, y - 3, 22, 32, 8); g.fill(); g.strokeStyle = '#5a3a2a'; g.lineWidth = 2; g.stroke(); }
  };
  bilayer(26);
  band(52, 76, '#e9cfe0');
  g.strokeStyle = '#d9a3c4'; g.lineWidth = 2;
  for (let x = 0; x < 1024; x += 12) { g.beginPath(); g.moveTo(x, 58 + Math.sin(x * 0.1) * 3); g.lineTo(x + 12, 64 + Math.cos(x * 0.1) * 3); g.stroke(); }
  bilayer(78);
  band(104, 128, '#e7a77d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function createInside() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 5, 2000);
  const S = { nodes: [], prev: [], tipVel: new THREE.Vector3(), feed: 0, progress: 0, host: null, surge: 0, done: false, cutAt: -1, frag: [], t: 0 };

  // the envelope section along the top
  const secMat = toonMaterial({ color: '#ffffff', map: proceduralSection(), mapRepeat: [1, 1], mottle: 0.12 });
  const section = new THREE.Mesh(new THREE.PlaneGeometry(420, 52), secMat);
  section.position.set(0, 52 + 26, -8);
  scene.add(section);
  // the tail tube through the envelope, the baseplate above it
  const tube = inked(new THREE.CylinderGeometry(4.5, 4.5, 70, 14), toonMaterial({ color: '#a7e0d6' }), { width: 0.7 });
  tube.position.set(0, 52 + 30, 0);
  scene.add(tube);
  const plate = inked(new THREE.CylinderGeometry(26, 30, 10, 6), toonMaterial({ color: '#e98a3c' }), { width: 0.8 });
  plate.position.set(0, 52 + 62, 0);
  scene.add(plate);

  // host DNA: double helices wandering through the nucleoid
  const hostDna = [];
  const hostMat = toonMaterial({ color: '#6c5ab8', mottle: 0.1 });
  for (let k = 0; k < 4; k++) {
    const pts = [];
    let x = -260, y = -30 - k * 22 + rand(-8, 8), z = -14 - k * 4;
    for (let i = 0; i < 14; i++) { pts.push(new THREE.Vector3(x, y, z)); x += 40; y += rand(-20, 20); y = Math.max(-115, Math.min(10, y)); z = -14 - k * 4 + rand(-5, 5); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const strands = [0, 1].map((sIdx) => {
      const N = 900, sp = [];
      const frames = curve.computeFrenetFrames(N, false);
      for (let i = 0; i <= N; i++) {
        const u = i / N, c = curve.getPointAt(u), a = u * curve.getLength() / 3.4 * Math.PI * 2 + sIdx * Math.PI * 0.8;
        sp.push(c.clone().addScaledVector(frames.normals[i], Math.cos(a) * 1.1).addScaledVector(frames.binormals[i], Math.sin(a) * 1.1));
      }
      const m = inked(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), N, 0.55, 5, false), hostMat, { width: 0.6 });
      scene.add(m);
      return m;
    });
    hostDna.push({ curve, strands });
  }

  // the crowded cytoplasm
  const types = [
    { n: 22, s: [8, 11], geo: blobGeometry([{ p: [0, 0, 0], r: 1.2, c: '#f08a5a' }, { p: [1.1, 0.5, 0.3], r: 1, c: '#f39a66' }, { p: [-0.9, 0.7, 0], r: 1, c: '#ea7d52' }, { p: [0.3, -1.0, 0.5], r: 0.9, c: '#f5a774' }, { p: [-0.6, -0.6, -0.8], r: 0.9, c: '#ee8c5c' }, { p: [0.6, 0.2, -1.0], r: 0.9, c: '#f08a5a' }, { p: [-1.2, -0.3, 0.6], r: 0.8, c: '#f6b07a' }], 1) },
    { n: 90, s: [3, 5], geo: blobGeometry([{ p: [0, 0, 0], r: 1, c: '#f2c14e' }, { p: [1, 0.3, 0], r: 0.8, c: '#f5cf6a' }, { p: [-0.6, 0.8, 0.3], r: 0.75, c: '#e8b23e' }], 1) },
    { n: 90, s: [3, 5], geo: blobGeometry([{ p: [0, 0, 0], r: 1, c: '#e48ab8' }, { p: [0.9, -0.4, 0.2], r: 0.8, c: '#ec9cc4' }, { p: [-0.5, 0.8, -0.3], r: 0.8, c: '#d878aa' }], 1) },
    { n: 70, s: [2, 3], geo: blobGeometry([{ p: [-1, 0, 0], r: 0.6, c: '#c26fc8' }, { p: [0, 0.6, 0], r: 0.6, c: '#d186d6' }, { p: [1, 0, 0], r: 0.6, c: '#b862be' }, { p: [0, -0.7, 0.2], r: 0.5, c: '#d89ade' }], 1) },
    { n: 60, s: [4, 6], geo: blobGeometry([{ p: [0, 0, 0], r: 1, c: '#8fb6e0' }, { p: [1.2, 0, 0], r: 0.9, c: '#9fc4ea' }, { p: [-1.2, 0.2, 0], r: 0.9, c: '#7ea6d4' }, { p: [0, 1.1, 0], r: 0.8, c: '#8fb6e0' }], 1) },
  ];
  for (const T of types) {
    T.mesh = inkedInstanced(T.geo, toonMaterial({ vertexColors: true }), T.n, { width: 0.6 });
    scene.add(T.mesh);
    T.items = Array.from({ length: T.n }, () => ({ p: new THREE.Vector3(rand(AREA.x0 - 60, AREA.x1 + 60), rand(AREA.y0 - 20, AREA.y1), T.s[0] > 6 ? rand(-75, -24) : rand(-60, 4)), v: new THREE.Vector3(), q: new THREE.Quaternion().random(), s: rand(...T.s) }));
  }

  // the phage DNA: a double helix of beads along a rope of nodes
  const MAXB = (GENOME_NODES + 40) * 6;
  const dnaBeads = inkedInstanced(new THREE.IcosahedronGeometry(1, 1), toonMaterial({ color: '#ffffff' }), MAXB, { width: 0.6 });
  scene.add(dnaBeads);
  const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 12), toonMaterial({ color: '#ffd85a', opacity: 0.55 }));
  scene.add(tipGlow);

  // enzymes
  function clampEnzyme(color, accent, size) {
    const g = new THREE.Group();
    const jawGeo = blobGeometry([{ p: [0, 0, 0], r: 1.4, c: color }, { p: [1.6, 0.6, 0], r: 1.2, c: color }, { p: [2.8, 0.2, 0.4], r: 1.0, c: accent }, { p: [0.8, 1.6, -0.3], r: 1.1, c: color }, { p: [0.4, -1.1, 0.6], r: 1.0, c: color }], 1);
    const jaws = [0, 1].map((i) => {
      const pivot = new THREE.Group();
      const j = inked(jawGeo, toonMaterial({ vertexColors: true }), { width: 0.8 });
      j.position.set(-0.6, 1.4, 0);
      if (i) { pivot.scale.y = -1; }
      pivot.add(j); g.add(pivot);
      return pivot;
    });
    g.scale.setScalar(size);
    return { g, jaws };
  }
  function cascade() {
    const g = new THREE.Group();
    const body = inked(blobGeometry(Array.from({ length: 9 }, (_, i) => ({ p: [i * 1.25 - 5, Math.sin(i * 0.8) * 0.9, Math.cos(i * 1.1) * 0.5], r: 1.5 + (i % 3) * 0.25, c: i % 2 ? '#6d8fd6' : '#5c7ec8' })), 1), toonMaterial({ vertexColors: true }), { width: 0.8 });
    g.add(body);
    const rna = inked(blobGeometry(Array.from({ length: 12 }, (_, i) => ({ p: [i * 0.95 - 5.2, 1.6 + Math.sin(i * 0.9) * 0.3, 1.2], r: 0.45, c: '#e8485a' })), 0), toonMaterial({ vertexColors: true }), { width: 0.6 });
    g.add(rna);
    const jaws = [new THREE.Group(), new THREE.Group()];
    g.scale.setScalar(2.6);
    return { g, jaws, body };
  }
  const enzymes = [];
  function addEnzyme(kind, opts) {
    const e = kind === 're' ? clampEnzyme('#5fb88a', '#8fdcae', 3.2) : cascade();
    scene.add(e.g);
    const strand = hostDna[enzymes.length % hostDna.length];
    const en = { kind, ...e, pos: new THREE.Vector3(), vel: new THREE.Vector3(), s: Math.random(), dir: Math.random() < 0.5 ? -1 : 1, strand, hunt: 0, cool: 0, ...opts };
    en.pos.copy(strand.curve.getPointAt(en.s));
    enzymes.push(en);
    return en;
  }
  const radar = new THREE.Group(); scene.add(radar);

  const api = {
    scene, camera, S, enzymes,
    /** Begin the phase for a host ({ crispr: bool }). */
    start(host) {
      S.host = host; S.done = false; S.progress = 0; S.feed = 0; S.cutAt = -1; S.frag = []; S.surge = 0; S.t = 0;
      S.nodes = [PORE.clone(), PORE.clone().add(new THREE.Vector3(0, -SEG, 0)), PORE.clone().add(new THREE.Vector3(0.5, -2 * SEG, 0))];
      S.prev = S.nodes.map((n) => n.clone());
      S.tipVel.set(0, -10, 0);
      for (const e of enzymes) scene.remove(e.g);
      enzymes.length = 0;
      addEnzyme('re', { detect: 90, speed: 22, label: 'Restriction enzyme', start: 0.35 });
      addEnzyme('cas', { detect: host.crispr ? 170 : 45, speed: host.crispr ? 27 : 13, label: host.crispr ? 'CRISPR complex (matching spacer)' : 'CRISPR complex (no matching spacer)' });
      if (host.crispr) addEnzyme('cas', { detect: 150, speed: 24, label: 'CRISPR complex (matching spacer)' });
      // a calm start: they begin far from the pore and only sense you after a few seconds
      enzymes.forEach((e, i) => { e.s = [0.12, 0.85, 0.7][i]; e.pos.copy(e.strand.curve.getPointAt(e.s)); e.cool = 4 + i * 1.5; });
      for (const h of hostDna) for (const s of h.strands) s.visible = true;
      camera.position.set(0, 10, 190);
    },
    tip() { return S.nodes[S.nodes.length - 1]; },
    /**
     * Advance. input: { steer:{x,y,m}|null, surge:boolean, look:{yaw,pitch} }.
     * Returns events: { cut: enzyme|null, won: bool, surged: bool }.
     */
    update(dt, t, input, frozen = false) {
      S.t += dt;
      goodsellShared.uTime.value = t;
      const ev = { cut: null, won: false, surged: false };
      const n = S.nodes, pv = S.prev;
      const tip = n[n.length - 1];
      if (!frozen && !S.done) {
        // steer the leading end: organic, with wobble, through the crowd
        if (input.surge && S.surge <= -1.2) { S.surge = 0.55; ev.surged = true; }
        S.surge -= dt;
        const boost = S.surge > 0 ? 2.4 : 1;
        if (input.steer) { S.tipVel.x += input.steer.x * 150 * dt * boost; S.tipVel.y += input.steer.y * 150 * dt * boost; }
        S.tipVel.x += gauss() * Math.sqrt(dt) * 30; S.tipVel.y += gauss() * Math.sqrt(dt) * 30;
        S.tipVel.multiplyScalar(Math.exp(-dt * 3.2));
        const vmax = 42 * boost; if (S.tipVel.length() > vmax) S.tipVel.setLength(vmax);
        // feeding: the motor pushes the genome in; it piles up if the end is not led away
        const slack = (n.length * SEG) / Math.max(10, tip.distanceTo(PORE));
        const rate = (slack > 3.2 ? 2.2 : 6.5) * (S.surge > 0 ? 1.6 : 1);
        S.feed += rate * dt;
        while (S.feed >= 1 && n.length < GENOME_NODES) {
          S.feed -= 1;
          const nn = PORE.clone().add(new THREE.Vector3(rand(-0.4, 0.4), -1, 0));
          n.splice(1, 0, nn); pv.splice(1, 0, nn.clone());
        }
        S.progress = n.length / GENOME_NODES;
        if (n.length >= GENOME_NODES) { S.done = true; ev.won = true; }
      }
      // rope dynamics
      const damp = Math.exp(-dt * 5);
      for (let i = 1; i < n.length; i++) {
        _v.subVectors(n[i], pv[i]).multiplyScalar(damp);
        pv[i].copy(n[i]);
        n[i].add(_v);
        n[i].x += Math.sin(t * 1.7 + i * 0.37) * 0.04; n[i].y += Math.cos(t * 1.3 + i * 0.29) * 0.04;
        n[i].z += (-n[i].z) * 0.02;
      }
      if (S.cutAt < 0) tip.addScaledVector(S.tipVel, dt);
      tip.x = Math.max(AREA.x0, Math.min(AREA.x1, tip.x)); tip.y = Math.max(AREA.y0, Math.min(AREA.y1, tip.y));
      n[0].copy(PORE);
      for (let it = 0; it < 6; it++) {
        for (let i = 0; i < n.length - 1; i++) {
          if (i + 1 === S.cutAt) continue;
          const a = n[i], b = n[i + 1];
          _v.subVectors(b, a);
          const len = _v.length() || 1e-6, diff = (len - SEG) / len;
          const wa = i === 0 ? 0 : 0.5, wb = (i === 0 ? 1 : (i + 1 === n.length - 1 && S.cutAt < 0 ? 0.25 : 0.5));
          a.addScaledVector(_v, diff * wa); b.addScaledVector(_v, -diff * wb);
        }
        for (let i = 1; i < n.length; i++) if (n[i].y > PORE.y) n[i].y = PORE.y;
      }
      // enzymes: slide along the host DNA, then home on the leading end when they sense it
      for (const e of enzymes) {
        const dTip = e.pos.distanceTo(tip);
        e.cool -= dt;
        if (!frozen && e.cool <= 0 && dTip < e.detect && !S.done) e.hunt = Math.min(7, e.hunt + dt); else e.hunt = Math.max(0, e.hunt - dt * 0.5);
        if (e.hunt >= 6.9) { e.cool = 4; e.hunt = 0; }
        if (e.hunt > 0 && !frozen && !S.done) {
          _v.subVectors(tip, e.pos).normalize();
          e.vel.lerp(_v.multiplyScalar(e.speed), 1 - Math.exp(-dt * 2.2));
          e.vel.x += gauss() * 6 * Math.sqrt(dt); e.vel.y += gauss() * 6 * Math.sqrt(dt);
          e.pos.addScaledVector(e.vel, dt);
          e.pos.z += (0 - e.pos.z) * dt;
        } else if (!frozen) {
          e.s += e.dir * dt * 0.012;
          if (e.s > 0.98 || e.s < 0.02) e.dir *= -1;
          _p.copy(e.strand.curve.getPointAt(Math.max(0, Math.min(1, e.s))));
          e.pos.lerp(_p, 1 - Math.exp(-dt * 0.8));
        }
        e.g.position.copy(e.pos);
        e.g.rotation.z = Math.sin(t * 0.7 + e.s * 10) * 0.4 + (e.hunt > 0 ? Math.atan2(tip.y - e.pos.y, tip.x - e.pos.x) : 0);
        const open = e.closing != null ? 1 - e.closing : 0.55 + Math.sin(t * 3 + e.s * 9) * 0.15;
        if (e.kind === 're') { e.jaws[0].rotation.z = open * 0.5; e.jaws[1].rotation.z = -open * 0.5; }
        if (!frozen && !S.done && S.cutAt < 0 && dTip < (e.kind === 're' ? 9 : 12)) ev.cut = e;
      }
      // the crowd jostles; the rope shoves it aside
      for (const T of types) {
        for (let i = 0; i < T.items.length; i++) {
          const it = T.items[i];
          it.v.multiplyScalar(Math.exp(-dt * 2)); it.v.x += gauss() * 9 * Math.sqrt(dt); it.v.y += gauss() * 9 * Math.sqrt(dt); it.v.z += gauss() * 4 * Math.sqrt(dt);
          for (let k = n.length - 1; k >= 0; k -= 3) {
            _v.subVectors(it.p, n[k]); const d = _v.length(), r = it.s + 3;
            if (d < r) it.p.addScaledVector(_v, (r - d) / Math.max(d, 0.5) * 0.5);
          }
          it.p.addScaledVector(it.v, dt);
          if (it.p.y > 46) it.p.y = 46;
          if (it.p.y < -170) it.p.y += 210; if (it.p.x < -260) it.p.x += 520; if (it.p.x > 260) it.p.x -= 520;
          it.p.z = it.s > 6 ? Math.max(-80, Math.min(-22, it.p.z)) : Math.max(-70, Math.min(4, it.p.z));
          _m.compose(it.p, it.q, _s.setScalar(it.s));
          T.mesh.setMatrixAt(i, _m);
        }
        T.mesh.instanceMatrix.needsUpdate = true;
      }
      api.draw(t);
      return ev;
    },
    draw(t) {
      const n = S.nodes;
      let k = 0;
      const cA = new THREE.Color('#b04ad0'), cB = new THREE.Color('#d474e8'), cTip = new THREE.Color('#ffd85a');
      for (let i = 0; i < n.length - 1 && k < MAXB - 6; i++) {
        const a = n[i], b = n[i + 1];
        _v.subVectors(b, a); const len = _v.length() || 1; _v.multiplyScalar(1 / len);
        _w.set(-_v.y, _v.x, 0).normalize();
        const fade = S.frag.includes(i) ? 0 : 1;
        for (let j = 0; j < 3; j++) {
          const u = j / 3, ang = (i * 3 + j) * (Math.PI * 2 / 3) + t * 0.3;
          _p.lerpVectors(a, b, u);
          for (let sIdx = 0; sIdx < 2; sIdx++) {
            const ph = ang + sIdx * Math.PI * 0.8;
            const off = _s.copy(_w).multiplyScalar(Math.cos(ph) * 1.1); off.z += Math.sin(ph) * 1.1;
            const near = n.length - 1 - i < 3;
            const ff = S.cutAt > 0 && i >= S.cutAt ? (S.fragFade ?? 1) : 1;
            _m.compose(off.add(_p), _q.identity(), _sc.setScalar((near ? 0.95 : 0.8) * fade * ff));
            dnaBeads.setMatrixAt(k, _m);
            dnaBeads.setColorAt(k, near ? cTip : (sIdx ? cB : cA));
            k++;
          }
        }
      }
      dnaBeads.setCount(k);
      dnaBeads.instanceMatrix.needsUpdate = true;
      if (dnaBeads.instanceColor) dnaBeads.instanceColor.needsUpdate = true;
      tipGlow.position.copy(n[n.length - 1]);
      tipGlow.visible = S.cutAt < 0;
      tipGlow.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
    },
    /** Camera: follow the leading end, with RS orbit and a zoom distance. */
    frame(dt, look, dist) {
      const tip = S.nodes[S.nodes.length - 1] || PORE;
      const target = _p.copy(tip).lerp(PORE, 0.25);
      const yaw = look.yaw * 0.5, pitch = look.pitch * 0.4;
      _v.set(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch) + 0.05, Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(target);
      camera.position.lerp(_v, 1 - Math.exp(-dt * 3));
      camera.lookAt(target);
    },
    /** The cut sequence: phase 'strike' | 'hold' | 'eat', t 0..1. */
    cutAnim(enzyme, phase, t) {
      const n = S.nodes, tip = n[n.length - 1];
      if (phase === 'strike') {
        enzyme.pos.lerp(tip, 0.15); enzyme.g.position.copy(enzyme.pos);
        enzyme.closing = Math.min(1, t * 1.6);
        if (enzyme.kind === 're') { enzyme.jaws[0].rotation.z = (1 - enzyme.closing) * 0.6; enzyme.jaws[1].rotation.z = -(1 - enzyme.closing) * 0.6; }
      } else if (phase === 'hold') {
        if (S.cutAt < 0) S.cutAt = Math.max(2, n.length - 7);
        // the cut piece drifts free; the end recoils
        for (let i = S.cutAt; i < n.length; i++) { n[i].y -= 8 * 0.016; n[i].x += (i - S.cutAt) * 0.04; }
        n[S.cutAt - 1].y += 0.1;
      } else if (phase === 'eat') {
        S.fragFade = Math.max(0, 1 - t);
      }
    },
    reset() { S.cutAt = -1; S.fragFade = 1; S.frag = []; for (const e of enzymes) e.closing = null; },
    /** Data overlay rings: each enzyme's sensing range. */
    setRadar(on) {
      radar.clear();
      radar.visible = on;
      if (!on) return;
      for (const e of enzymes) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(e.detect - 0.8, e.detect, 64), new THREE.MeshBasicMaterial({ color: e.kind === 're' ? '#7cf0b0' : '#ff7a8a', transparent: true, opacity: 0.6, depthTest: false }));
        ring.userData.e = e; ring.renderOrder = 10;
        radar.add(ring);
      }
    },
    updateRadar() { for (const r of radar.children) r.position.copy(r.userData.e.pos); },
    hideHostDna(f) { for (const h of hostDna) for (const s of h.strands) s.visible = f < 0.5; },
  };
  return api;
}
