// The springtail's portal (the way on), drawn in the world: a floating raft
// of Sphagnum (PORTAL in world.js; mossTop honours it, so you land and walk on
// it) crowned with big red and green capitula, and on the tallest one a speck
// that moves: the Limnozetes mite of the next stage (design §0.6). A golden
// sparkle hangs over it (shared/portal.js), dim while the wolf spider guards
// it and bright once it is lured off. Built at the origin and moved where the
// portal is placed (`place`). Also the players' colour rings, a faint loop on
// the film under each springtail when more than one plays. Units: mm.
import * as THREE from '../shared/vendor/three.module.min.js';
import { litMaterial } from '../shared/techniques/springtail-macro.js';
import { createPortalGlow, createGlint } from '../shared/portal.js';
import { capitulumGeometry, PORTAL, raftTop } from './world.js';

export function createLandmarkProps(world, { pixelHeight } = {}) {
  const group = new THREE.Group();
  const raft = new THREE.Group();
  raft.visible = false;
  group.add(raft);
  let seed = 977;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const L = PORTAL;
  // the raft: a low floating mat of moss, wet and dark at the waterline
  {
    const dome = new THREE.SphereGeometry(1, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const dp = dome.attributes.position;
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i) * (L.r + 0.4), z = dp.getZ(i) * (L.r + 0.4), d = Math.hypot(x, z);
      dp.setXYZ(i, x, d > L.r ? -0.3 : raftTop(d) - 0.6, z);
    }
    dome.computeVertexNormals();
    raft.add(new THREE.Mesh(dome, world.domeMat));
  }
  // capitula packed over the raft: larger than the rim's, lit red and green
  const geo = capitulumGeometry(rnd, { spreading: 20, bud: 14, sides: 5 });
  const heads = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const u = Math.sqrt((i + 0.5) / n) * (L.r - 1.4), a = i * 2.39996;
    heads.push({ x: Math.cos(a) * u, z: Math.sin(a) * u, s: 1.2 + rnd() * 0.3 });
  }
  // the tallest head, a little off centre: the mite's
  heads.unshift({ x: L.r * 0.25, z: 0.8, s: 1.7 });
  const palette = [[0.24, 0.035, 0.03], [0.11, 0.19, 0.025], [0.2, 0.05, 0.03], [0.16, 0.17, 0.03]];
  const im = new THREE.InstancedMesh(geo, world.mossMat, heads.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  heads.forEach((h, i) => {
    h.y = raftTop(Math.hypot(h.x, h.z)) - 1.15 * h.s;
    q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.2, rnd() * 6.28, (rnd() - 0.5) * 0.2));
    m4.compose(new THREE.Vector3(h.x, h.y, h.z), q, new THREE.Vector3(h.s, h.s, h.s));
    im.setMatrixAt(i, m4);
    im.setColorAt(i, col.setRGB(...palette[i === 0 ? 0 : i % palette.length]));
  });
  im.computeBoundingSphere();
  raft.add(im);
  const top = heads[0];
  const topY = top.y + top.s * 1.42;
  // the sparkle: the way on looks like somewhere to go
  // (a tall soft beacon, 60 mm, with motes rising up it: seen whenever the
  // camera looks out over the film; the screen light, createPortalLight in
  // main.js, carries it when the narrow macro view has it out of frame)
  const glow = createPortalGlow({ THREE, size: L.r + 3, height: 9, intensity: 1.6, beam: 60, beamWidth: 3.2, count: 110, pixelHeight });
  raft.add(glow.group);

  // the speck: a Limnozetes mite, ~0.35 mm, glossy red-brown, eight legs
  const mite = new THREE.Group();
  const shell = litMaterial({ surface: `s.albedo = vec3(0.09, 0.035, 0.015); s.rough = 0.22; s.f0 = 0.05; s.sheen = 0.2; s.sheenCol = vec3(0.5, 0.3, 0.2);` });
  const legMat = litMaterial({ surface: `s.albedo = vec3(0.16, 0.08, 0.04); s.rough = 0.5;` });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), shell);
  body.scale.set(0.18, 0.11, 0.13);
  body.position.y = 0.1;
  mite.add(body);
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.012, 0.016, 1, 4).translate(0, 0.5, 0);
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(0.1 - k * 0.065, 0.1, s * 0.09);
    leg.userData = { k, s };
    leg.scale.set(1, 0.2, 1);
    mite.add(leg);
    legs.push(leg);
  }
  raft.add(mite);
  const speck = new THREE.Vector3(top.x, topY, top.z);
  // a golden glint on the speck: the creature the portal leads to (and the
  // point the camera pushes into when you go through)
  const glint = createGlint({ THREE, size: 1.8, intensity: 1.3, pixelHeight });
  raft.add(glint.points);

  // player rings: a faint loop of light on the film, one per player
  const rings = [];
  const ringGeo = new THREE.RingGeometry(0.95, 1.12, 48).rotateX(-Math.PI / 2);
  function ring(color) {
    const c = new THREE.Color(color);
    const mat = litMaterial({ surface: `s.albedo = vec3(0.0); s.rough = 1.0; s.emit = vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)}) * 0.55;`, shadow: false });
    mat.transparent = false;
    const m = new THREE.Mesh(ringGeo, mat);
    m.visible = false;
    m.renderOrder = 2;
    group.add(m);
    rings.push(m);
    return m;
  }

  const position = new THREE.Vector3(0, topY, 0);
  const _fw = new THREE.Vector3();
  return {
    group, raft, glow, glint, position, speck, ring, rings,
    /**
     * The mite speck for a continuous transition (embed.js "Continuous
     * transitions"): its centre in world space, its heading (atan2(z, x) of
     * its local +x) and its length (mm).
     */
    mite() {
      mite.updateMatrixWorld(true);
      const c = body.getWorldPosition(new THREE.Vector3());
      _fw.set(1, 0, 0).transformDirection(mite.matrixWorld);
      return { c, heading: Math.atan2(_fw.z, _fw.x), len: 0.36 };
    },
    /** Show the raft at the portal (world.js PORTAL), turned so the mite's head faces the start. */
    place() {
      raft.visible = L.placed;
      raft.position.set(L.x, 0, L.z);
      raft.rotation.y = -L.a;
      raft.updateMatrixWorld(true);
      position.set(L.x, topY, L.z);
    },
    /** Walk the speck about on its capitulum; the sparkle twinkles (open: brighter). */
    update(t, dt = 0, camera = null, open = false, burstT = undefined) {
      if (!raft.visible) return;
      glow.setOpen(open);
      glow.update(dt, t, camera, burstT);
      const a = t * 0.45 + Math.sin(t * 0.31) * 1.3;
      const r = 0.55 + 0.25 * Math.sin(t * 0.23);
      speck.set(top.x + Math.cos(a) * r, topY + 0.05 * Math.sin(t * 1.7), top.z + Math.sin(a) * r);
      mite.position.copy(speck);
      glint.setPosition(speck.x, speck.y + 0.12, speck.z);
      glint.update(t);
      mite.rotation.y = -a - Math.PI / 2;
      for (const leg of legs) {
        const { k, s } = leg.userData;
        const ph = t * 9 + k * 1.6 + (s > 0 ? Math.PI : 0);
        leg.rotation.set(s * (1.9 + 0.15 * Math.sin(ph)), 0, (k - 1.5) * 0.45 + 0.25 * Math.cos(ph));
      }
    },
  };
}
