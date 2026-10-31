// The springtail's forward landmark, drawn in the world: a tongue of Sphagnum
// where the bank reaches into the pool (LANDMARK in world.js), crowned with
// big red and green capitula, and on the tallest one a speck that moves: the
// Limnozetes mite of the next stage (design §0.6). Also the players' colour
// rings, a faint loop on the film under each springtail when more than one
// plays. Units: mm.
import * as THREE from '../shared/vendor/three.module.min.js';
import { litMaterial } from '../shared/techniques/springtail-macro.js';
import { capitulumGeometry, mossTop, LANDMARK } from './world.js';

export function createLandmarkProps(world) {
  const group = new THREE.Group();
  let seed = 977;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const L = LANDMARK;
  // capitula packed over the tongue: larger than the rim's, lit red and green
  const geo = capitulumGeometry(rnd, { spreading: 20, bud: 14, sides: 5 });
  const heads = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const u = Math.sqrt((i + 0.5) / n) * (L.r - 1.2), a = i * 2.39996;
    heads.push({ x: L.x + Math.cos(a) * u, z: L.z + Math.sin(a) * u, s: 1.25 + rnd() * 0.35 });
  }
  // the tallest head, at the tongue's tip toward the open water: the mite's
  heads.unshift({ x: L.x - L.r * 0.45, z: L.z + 1.2, s: 1.85 });
  const palette = [[0.24, 0.035, 0.03], [0.11, 0.19, 0.025], [0.2, 0.05, 0.03], [0.16, 0.17, 0.03]];
  const im = new THREE.InstancedMesh(geo, world.mossMat, heads.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  heads.forEach((h, i) => {
    h.y = mossTop(h.x, h.z) - 1.15 * h.s;
    q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.2, rnd() * 6.28, (rnd() - 0.5) * 0.2));
    m4.compose(new THREE.Vector3(h.x, h.y, h.z), q, new THREE.Vector3(h.s, h.s, h.s));
    im.setMatrixAt(i, m4);
    im.setColorAt(i, col.setRGB(...palette[i === 0 ? 0 : i % palette.length]));
  });
  im.frustumCulled = false;
  group.add(im);
  const top = heads[0];
  const topY = top.y + top.s * 1.42;

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
  group.add(mite);
  const speck = new THREE.Vector3(top.x, topY, top.z);

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

  return {
    group, position: new THREE.Vector3(L.x, topY, L.z), speck, ring, rings,
    /** Walk the speck about on its capitulum. */
    update(t) {
      const a = t * 0.45 + Math.sin(t * 0.31) * 1.3;
      const r = 0.55 + 0.25 * Math.sin(t * 0.23);
      speck.set(top.x + Math.cos(a) * r, topY + 0.05 * Math.sin(t * 1.7), top.z + Math.sin(a) * r);
      mite.position.copy(speck);
      mite.rotation.y = -a - Math.PI / 2;
      for (const leg of legs) {
        const { k, s } = leg.userData;
        const ph = t * 9 + k * 1.6 + (s > 0 ? Math.PI : 0);
        leg.rotation.set(s * (1.9 + 0.15 * Math.sin(ph)), 0, (k - 1.5) * 0.45 + 0.25 * Math.cos(ph));
      }
    },
  };
}
