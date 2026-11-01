// The pond water's texture: what makes the drop feel full wherever you are.
//
// The first prototype's drop was 3 mm across, so its 70 flakes, 2200 specks
// and eight Vorticella were dense everywhere you looked. The route (landmarks.js)
// needs a 10 mm drop, and the same scenery spread over eleven times the area
// left most of the water empty. This module brings the density back without
// paying for eleven times the scenery: a tile of suspended flocs (loose
// aggregates of detritus and bacteria), fine specks, small settled flakes and
// a carpet of sediment on the slide, repeated across the drop by each view's
// vertex shader round the point that view is looking at. Everything here is
// smaller than the obstacles the cell collides with (flakes under 30 µm were
// never solid), so it is texture to swim through, not something to bump.
//
//   const amb = createAmbient(group, { tile: 1500, depth: DEPTH });
//   amb.update(t);   // the slow drift of the water
import * as THREE from '../shared/vendor/three.module.min.js';
import { volumeMaterial, pointsMaterial } from './optics.js';
import { rng, noise3 } from './geom.js';

const WRAP_DECL = /* glsl */ `
uniform vec2 uWrapC;
uniform float uTile;
uniform vec2 uShift;
vec2 wrapXZ(vec2 p) { p += uShift; return uWrapC + mod(p - uWrapC + 0.5 * uTile, uTile) - 0.5 * uTile; }
`;

function wrapUniforms(tile, shift) {
  return { uWrapC: { value: new THREE.Vector2() }, uTile: { value: tile }, uShift: shift };
}

/** Points (pointsMaterial, not cyclosis) repeated round the view. */
function wrappedPoints(absorb, tile, shift) {
  const m = pointsMaterial({ absorb });
  Object.assign(m.uniforms, wrapUniforms(tile, shift));
  m.vertexShader = m.vertexShader
    .replace('uniform vec3 uLoop;', `uniform vec3 uLoop;\nuniform float uTime;\n${WRAP_DECL}`)
    .replace('c = iPos.xyz;', 'c = iPos.xyz; c.xz = wrapXZ(c.xz); c.y += 2.5 * sin(uTime * 0.35 + iP.w * 40.0);');
  return m;
}

/** Instanced closed bodies (volumeMaterial, centred) repeated round the view. */
function wrappedVolume(opts, tile, shift) {
  const m = volumeMaterial({ ...opts, centred: true });
  Object.assign(m.uniforms, wrapUniforms(tile, shift));
  const before = m.vertexShader;
  m.vertexShader = m.vertexShader
    .replace('varying float vDepth;', `${WRAP_DECL}\nvarying float vDepth;`)
    .replace('lp = instanceMatrix * lp; lr = instanceMatrix * lr; n = mat3(instanceMatrix) * n;',
      'lp = instanceMatrix * lp; lr = instanceMatrix * lr; n = mat3(instanceMatrix) * n;\n        vec2 wd = wrapXZ(lr.xz) - lr.xz; lp.xz += wd; lr.xz += wd;');
  if (m.vertexShader === before) throw new Error('ambient: volumeMaterial shader changed');
  return m;
}

function quads(iPos, iP) {
  const quad = new THREE.PlaneGeometry(2, 2);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.attributes.position = quad.attributes.position;
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 4));
  g.setAttribute('iP', new THREE.InstancedBufferAttribute(iP, 4));
  g.instanceCount = iPos.length / 4;
  return g;
}

function smallFlake(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.6 + 0.8 * noise3(x * 2 + seed, y * 2, z * 2 + seed * 0.7);
    p.setXYZ(i, x * k, y * k * 0.35, z * k * 0.85);
  }
  g.computeVertexNormals();
  return g;
}

export function createAmbient(parent, { tile = 1500, depth = 650 } = {}) {
  const rand = rng(4321);
  const group = new THREE.Group();
  group.name = 'ambient';
  parent.add(group);
  const shift = { value: new THREE.Vector2() };
  const mats = [];
  const add = (mesh) => { mesh.frustumCulled = false; group.add(mesh); mats.push(mesh.material); return mesh; };
  const half = tile / 2;

  // Suspended flocs: loose clusters of granules (detritus, bacteria in slime),
  // 15–60 µm across, at every depth. In darkfield they are the glittering
  // clumps of the delivered card art; in brightfield soft brown smudges.
  {
    const N = 300, PER = 11;
    const iPos = new Float32Array(N * PER * 4), iP = new Float32Array(N * PER * 4);
    let k = 0;
    for (let f = 0; f < N; f++) {
      const cx = (rand() - 0.5) * tile, cz = (rand() - 0.5) * tile, cy = 15 + rand() * (depth - 30);
      const R = 6 + rand() ** 2 * 26;
      for (let j = 0; j < PER; j++) {
        const a = rand() * 6.283, e = rand() * 2 - 1, r = R * Math.cbrt(rand());
        iPos.set([cx + Math.cos(a) * Math.sqrt(1 - e * e) * r, cy + e * r * 0.7, cz + Math.sin(a) * Math.sqrt(1 - e * e) * r, 0], k * 4);
        iP.set([0.9 + rand() ** 2 * 3.2, 0.05, 1.6 + rand() * 2.4, rand()], k * 4);
        k++;
      }
    }
    add(new THREE.Mesh(quads(iPos, iP), wrappedPoints([0.02, 0.028, 0.045], tile, shift)));
  }
  // Fine specks drifting everywhere (dead bacteria, clay, mucus).
  {
    const N = 2600;
    const iPos = new Float32Array(N * 4), iP = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      iPos.set([(rand() - 0.5) * tile, 4 + rand() * (depth - 8), (rand() - 0.5) * tile, 0], i * 4);
      iP.set([0.5 + rand() ** 3 * 1.6, 0.06, 2.2 + rand() * 3, rand()], i * 4);
    }
    add(new THREE.Mesh(quads(iPos, iP), wrappedPoints([0.012, 0.016, 0.028], tile, shift)));
  }
  // Sediment carpet on the slide (fixed: no drift).
  const still = { value: new THREE.Vector2() };
  {
    const N = 2400;
    const iPos = new Float32Array(N * 4), iP = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      // clumped: most grains gather in drifts, as sediment does
      const c = rand() < 0.65;
      const bx = c ? Math.round((rand() - 0.5) * 8) * tile / 8 : 0, bz = c ? Math.round((rand() - 0.5) * 8) * tile / 8 : 0;
      const x = c ? bx + (rand() - 0.5) * 120 : (rand() - 0.5) * tile, z = c ? bz + (rand() - 0.5) * 120 : (rand() - 0.5) * tile;
      iPos.set([Math.max(-half, Math.min(half, x)), 1.5 + rand() * 4, Math.max(-half, Math.min(half, z)), 0], i * 4);
      iP.set([1 + rand() ** 3 * 5.5, 0.05, 2.6 + 4 * rand(), rand()], i * 4);
    }
    add(new THREE.Mesh(quads(iPos, iP), wrappedPoints([0.012, 0.019, 0.034], tile, still)));
  }
  // Small flakes (8–28 µm, under the 30 µm that ever blocks the cell): most
  // settled on the slide, some suspended.
  {
    const geos = [0, 1, 2].map((i) => smallFlake(i * 5.1 + 2));
    const lists = geos.map(() => []);
    for (let i = 0; i < 150; i++) {
      const size = 8 + rand() ** 1.5 * 20;
      const floor = rand() < 0.6;
      const y = floor ? size * 0.12 + 2 : 25 + rand() * (depth - 50);
      lists[i % 3].push(new THREE.Matrix4().compose(new THREE.Vector3((rand() - 0.5) * tile, y, (rand() - 0.5) * tile),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(floor ? (rand() - 0.5) * 0.3 : rand() * 3, rand() * 6.3, floor ? (rand() - 0.5) * 0.3 : rand() * 3)),
        new THREE.Vector3(size, size, size)));
    }
    const mat = wrappedVolume({ dn: 0.024, scatter: 1.2, absorb: [0.0055, 0.008, 0.014], pattern: 3 }, tile, still);
    geos.forEach((g, k) => {
      const im = new THREE.InstancedMesh(g, mat, lists[k].length);
      lists[k].forEach((m, i) => im.setMatrixAt(i, m));
      add(im);
    });
  }

  // Each view repeats the tile round the point it looks at.
  const fwd = new THREE.Vector3();
  const centreFor = (camera, out) => {
    if (camera.isOrthographicCamera) return out.set(camera.position.x, camera.position.z);
    camera.getWorldDirection(fwd);
    return out.set(camera.position.x + fwd.x * 350, camera.position.z + fwd.z * 350);
  };
  for (const m of group.children) {
    m.onBeforeRender = (r, s, camera) => { centreFor(camera, m.material.uniforms.uWrapC.value); };
  }
  let last = 0;
  return {
    group,
    /** The suspended matter drifts with the ambient flow (world.flowAt's mean, ≈18 and 5 µm/s). */
    update(t) {
      const dt = Math.min(0.1, Math.max(0, t - last)); last = t;
      shift.value.x = (shift.value.x + 18 * dt) % tile;
      shift.value.y = (shift.value.y + 5 * dt) % tile;
    },
  };
}
