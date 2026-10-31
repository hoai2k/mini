// The water springtail Podura aquatica (Collembola: Poduridae), built from
// anatomy with signed-distance parts (shared/sdf.js) and rigged by part.
// Units: mm. Rest pose: facing +x, standing on the film at y = 0, ~1.5 mm long.
//
// Parts (bone ids): 0 head (eye patches, mouth cone), 1-2 antennae (4
// segments, shorter than the head is long), 3 pronotum (Th1, visible in
// Poduromorpha), 4-5 meso- and metathorax, 6-11 abdominal segments I-VI,
// 12 collophore (ventral tube on Abd I), 13-18 legs proximal (coxa to femur),
// 19-24 legs distal (tibiotarsus and claw), 25 furcula (manubrium, paired
// dentes and mucrones, on Abd IV; a separate mesh so it can swing clear).
// The retinaculum (the catch that holds the furcula) is a small knob on Abd III.
import * as THREE from '../shared/vendor/three.module.min.js';
import { buildSdfMesh, sd } from '../shared/sdf.js';
import { litMaterial } from '../shared/techniques/springtail-macro.js';

export const BONES = 26;
const LEG_X = [0.37, 0.25, 0.11];
const KNEE_DX = [0.07, 0.0, -0.06];
const FOOT_DX = [0.12, 0.0, -0.11];
export const LEG_BASE = (k, s) => new THREE.Vector3(LEG_X[k], 0.11, s * 0.1);
export const LEG_KNEE = (k, s) => new THREE.Vector3(LEG_X[k] + KNEE_DX[k], 0.12, s * 0.25);
export const LEG_FOOT = (k, s) => new THREE.Vector3(LEG_X[k] + FOOT_DX[k], 0.0, s * 0.31);
export const FURCULA_PIVOT = new THREE.Vector3(-0.5, 0.05, 0);
export const COLLOPHORE_TIP = new THREE.Vector3(-0.02, 0.0, 0);
const FRONT_PIVOT = new THREE.Vector3(0.2, 0.25, 0);
const REAR_PIVOT = new THREE.Vector3(-0.25, 0.25, 0);
const HEAD_PIVOT = new THREE.Vector3(0.42, 0.24, 0);
const ANT_BASE = (s) => new THREE.Vector3(0.69, 0.3, s * 0.075);

function bodyParts() {
  const P = [];
  const seg = (id, x, y, rx, ry, rz, blend = 0.05) => P.push({ id, sdf: sd.ellipsoid([x, y, 0], [rx, ry, rz]), blend });
  // thorax and abdomen: a stout cylinder of rings with furrows between
  seg(4, 0.29, 0.245, 0.1, 0.185, 0.205, 0);
  seg(3, 0.4, 0.235, 0.055, 0.14, 0.155);
  seg(5, 0.135, 0.25, 0.1, 0.2, 0.22);
  seg(6, -0.02, 0.252, 0.1, 0.205, 0.226);
  seg(7, -0.17, 0.252, 0.1, 0.21, 0.232);
  seg(8, -0.32, 0.247, 0.104, 0.206, 0.226);
  seg(9, -0.475, 0.237, 0.112, 0.198, 0.214);
  seg(10, -0.63, 0.222, 0.092, 0.168, 0.18);
  seg(11, -0.745, 0.21, 0.07, 0.118, 0.128, 0.04);
  // head: rounded, hypognathous, with a ventral mouth cone
  P.push({ id: 0, sdf: sd.ellipsoid([0.565, 0.24, 0], [0.165, 0.158, 0.17]), blend: 0.045 });
  P.push({ id: 0, sdf: sd.ellipsoid([0.62, 0.12, 0], [0.075, 0.06, 0.08]), blend: 0.04 });
  // eye patches (8 ocelli each side on a dark field), slightly raised
  P.push({ id: 0, sdf: sd.mirrorZ(sd.ellipsoid([0.61, 0.29, 0.13], [0.05, 0.04, 0.035])), blend: 0.02 });
  // antennae: 4 short segments, reddish at the tip
  for (const s of [-1, 1]) {
    const id = s < 0 ? 1 : 2;
    const a = ANT_BASE(s);
    const b = new THREE.Vector3(0.79, 0.33, s * 0.13), c = new THREE.Vector3(0.88, 0.335, s * 0.17), d = new THREE.Vector3(0.93, 0.325, s * 0.185);
    P.push({ id, sdf: sd.roundCone(a.toArray(), b.toArray(), 0.04, 0.034), blend: 0.025 });
    P.push({ id, sdf: sd.roundCone(b.toArray(), c.toArray(), 0.033, 0.029), blend: 0.012 });
    P.push({ id, sdf: sd.roundCone(c.toArray(), d.toArray(), 0.029, 0.024), blend: 0.01 });
  }
  // collophore: the ventral tube, bilobed at the tip, touching the film
  P.push({ id: 12, sdf: sd.roundCone([-0.02, 0.08, 0], [-0.02, 0.022, 0], 0.05, 0.045), blend: 0.03 });
  P.push({ id: 12, sdf: sd.mirrorZ(sd.sphere([-0.02, 0.02, 0.025], 0.03)), blend: 0.02 });
  // retinaculum on Abd III
  P.push({ id: 8, sdf: sd.ellipsoid([-0.31, 0.055, 0], [0.03, 0.025, 0.035]), blend: 0.02 });
  // legs: short, stout (thickened ~1.4x to survive the mesh), claws down
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
    const si = s < 0 ? 0 : 1;
    const base = LEG_BASE(k, s), knee = LEG_KNEE(k, s), foot = LEG_FOOT(k, s);
    P.push({ id: 13 + 2 * k + si, sdf: sd.roundCone(base.toArray(), knee.toArray(), 0.05, 0.04), blend: 0.03 });
    const mid = knee.clone().lerp(foot, 0.55).add(new THREE.Vector3(0, 0.015, 0));
    P.push({ id: 19 + 2 * k + si, sdf: sd.roundCone(knee.toArray(), mid.toArray(), 0.038, 0.032), blend: 0.015 });
    P.push({ id: 19 + 2 * k + si, sdf: sd.roundCone(mid.toArray(), foot.clone().add(new THREE.Vector3(0, 0.022, 0)).toArray(), 0.031, 0.022), blend: 0.012 });
  }
  return P;
}

function furculaParts() {
  // Folded forward under the abdomen: the manubrium from Abd IV, then the
  // paired dentes reaching to the ventral tube, ending in broad mucrones
  // (lamellate in Podura, a paddle for pushing on water).
  const P = [];
  P.push({ id: 25, sdf: sd.roundCone([-0.5, 0.05, 0], [-0.4, 0.04, 0], 0.05, 0.045), blend: 0 });
  P.push({ id: 25, sdf: sd.mirrorZ(sd.roundCone([-0.41, 0.04, 0.025], [0.02, 0.032, 0.04], 0.03, 0.022)), blend: 0.02 });
  P.push({ id: 25, sdf: sd.mirrorZ(sd.ellipsoid([0.055, 0.03, 0.042], [0.05, 0.012, 0.03])), blend: 0.015 });
  return P;
}

const SURFACE = /* glsl */ `
void surface(inout Surf s) {
  int pid = int(vPart + 0.5);
  vec3 lp = vLocal;
  float dorsal = smoothstep(0.09, 0.25, lp.y);
  vec3 slate = vec3(0.03, 0.037, 0.06);
  vec3 venter = vec3(0.06, 0.028, 0.022);
  vec3 col = mix(venter, slate, dorsal);
  bool limb = (pid >= 12 && pid <= 25);
  if (limb) col = vec3(0.05, 0.022, 0.018);
  if (pid >= 19 && pid <= 24) col = mix(col, vec3(0.16, 0.05, 0.032), smoothstep(0.09, 0.0, lp.y));
  if (pid == 25) col = vec3(0.09, 0.04, 0.03);
  if (pid == 1 || pid == 2) col = mix(slate * 1.3, vec3(0.17, 0.05, 0.035), smoothstep(0.8, 0.9, lp.x));
  // granular, velvety cuticle (Podura has no scales: fine secondary granules)
  float g1 = mNoise(lp.xy * 170.0 + lp.z * 37.0), g2 = mNoise(lp.zy * 170.0 + lp.x * 41.0 + 5.0);
  vec3 bump = vec3(g1 - 0.5, 0.0, g2 - 0.5) * 0.5;
  // transverse wrinkles on each tergite
  if (!limb && pid != 1 && pid != 2) bump.y += sin(lp.x * 210.0 + g1 * 2.0) * 0.12 * dorsal;
  s.N = normalize(s.N + bump);
  s.rough = 0.62; s.f0 = 0.03;
  s.sheen = limb ? 0.25 : 0.6; s.sheenCol = vec3(0.2, 0.24, 0.36);
  // frosty specks: granule tips catch the light
  float speck = smoothstep(0.82, 0.92, mNoise(lp.xz * 260.0 + lp.y * 90.0));
  col += vec3(0.07, 0.08, 0.11) * speck * dorsal;
  // dark furrows between segments: where two parts meet
  if (pid <= 11 && pid != 1 && pid != 2) {
    float f = smoothstep(0.5, 0.78, vPartW);
    s.ao = mix(0.35, 1.0, f);
    col *= mix(0.6, 1.0, f);
    s.sheen *= mix(0.2, 1.0, f);
  }
  // eye patches: near-black and glossy
  if (pid == 0) {
    vec3 q = (lp - vec3(0.61, 0.29, sign(lp.z) * 0.13)) / vec3(0.055, 0.045, 0.04);
    float e = dot(q, q);
    if (e < 1.0) { col = vec3(0.004, 0.004, 0.006); s.rough = 0.18; s.f0 = 0.05; s.sheen = 0.1; }
  }
  s.albedo = col;
}`;

export function createSpringtail() {
  const group = new THREE.Group();
  const mat = litMaterial({ surface: SURFACE, skin: BONES });
  // the field's own casterShadow would shadow the animal by itself; skip casters on it
  const body = new THREE.Mesh(buildSdfMesh(bodyParts(), { min: [-0.86, -0.06, -0.42], max: [0.98, 0.5, 0.42], cell: 0.0125 }), mat);
  const furc = new THREE.Mesh(buildSdfMesh(furculaParts(), { min: [-0.58, -0.03, -0.12], max: [0.14, 0.12, 0.12], cell: 0.0105 }), mat);
  body.frustumCulled = furc.frustumCulled = false;
  group.add(body, furc);
  const bones = mat.uniforms.uBones.value;

  const tmp = new THREE.Matrix4(), tmp2 = new THREE.Matrix4();
  const about = (out, pivot, axis, ang) => {
    out.makeTranslation(pivot.x, pivot.y, pivot.z);
    tmp.makeRotationAxis(axis, ang);
    out.multiply(tmp);
    tmp.makeTranslation(-pivot.x, -pivot.y, -pivot.z);
    return out.multiply(tmp);
  };
  const Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
  const front = new THREE.Matrix4(), rear = new THREE.Matrix4(), head = new THREE.Matrix4(), mid = new THREE.Matrix4();

  const pose = {
    walk: 0,      // gait phase (cycles)
    stride: 0,    // 0..1 amount of leg swing
    bend: 0,      // + = U-pose (head and tail up), - = curl ventrally
    furcula: 0,   // 0 folded, 1 fully out (pointing back and down)
    hunker: 0,    // 0..1 pressed flat
    nod: 0,       // head down while grazing
    tuck: 0,      // legs pulled in (airborne)
    flail: 0,     // legs waving (on its back, or stuck)
    t: 0,
  };
  const feet = Array.from({ length: 6 }, () => new THREE.Vector3());

  function update() {
    const p = pose;
    mid.makeTranslation(0, -0.045 * p.hunker, 0);
    about(front, FRONT_PIVOT, Z, p.bend * 0.45 - p.hunker * 0.05).premultiply(mid);
    about(rear, REAR_PIVOT, Z, -p.bend * 0.55 - p.hunker * 0.04).premultiply(mid);
    about(head, HEAD_PIVOT, Z, -p.nod * 0.35 + Math.sin(p.t * 1.3) * 0.02).premultiply(front);
    bones[0].copy(head);
    for (const s of [-1, 1]) {
      const id = s < 0 ? 1 : 2;
      // flail (stuck, on its back, caught): the antennae lash about too
      const wave = Math.sin(p.t * 2.1 + s) * 0.12 + Math.sin(p.t * 5.3 + s * 2) * 0.05 * (1 - p.hunker) + p.flail * Math.sin(p.t * 17 + s * 2) * 0.45;
      about(bones[id], ANT_BASE(s), Y, s * wave - p.tuck * s * 0.3);
      tmp2.copy(bones[id]);
      about(bones[id], ANT_BASE(s), Z, Math.sin(p.t * 1.7 + s * 3) * 0.1 - p.nod * 0.2 + p.tuck * 0.25 + p.flail * Math.sin(p.t * 13 + s) * 0.35).multiply(tmp2).premultiply(head);
    }
    bones[3].copy(front); bones[4].copy(front);
    bones[5].copy(mid); bones[6].copy(mid); bones[7].copy(mid);
    for (const i of [8, 9, 10, 11]) bones[i].copy(rear);
    bones[12].copy(mid);
    // furcula: swings about its base, down and back (about 160 degrees)
    about(bones[25], FURCULA_PIVOT, Z, -p.furcula * 2.8).premultiply(rear);
    // legs: tripod gait (L1 R2 L3 | R1 L2 R3), each a rigid two-part leg
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
      const si = s < 0 ? 0 : 1;
      const grp = (k + si) % 2;
      const ph = (p.walk + grp * 0.5) % 1;
      const swing = ph < 0.5;
      const u = swing ? ph * 2 : (ph - 0.5) * 2;
      const ang = (swing ? -1 + 2 * u : 1 - 2 * u) * 0.32 * p.stride;
      const lift = (swing ? Math.sin(u * Math.PI) * 0.35 * p.stride : 0) + p.tuck * 0.7 + p.flail * Math.sin(p.t * 14 + k * 2 + si * 3) * 0.5 - p.hunker * 0.25;
      const base = LEG_BASE(k, s);
      const parent = k < 2 ? front : mid;
      about(tmp2, base, Y, s * ang + p.tuck * s * (k - 1) * 0.3);
      const m = bones[13 + 2 * k + si];
      about(m, base, X, -s * lift).premultiply(tmp2).premultiply(parent);
      const knee = LEG_KNEE(k, s);
      about(bones[19 + 2 * k + si], knee, X, -s * (p.tuck * 0.6 - p.hunker * 0.15)).premultiply(m);
      feet[2 * k + si].copy(LEG_FOOT(k, s)).applyMatrix4(bones[19 + 2 * k + si]);
    }
  }
  update();

  const api = {
    group, pose, material: mat, body, furc,
    update,
    /** World positions of the six claws (after group.updateMatrixWorld). */
    feet() { return feet.map((f) => f.clone().applyMatrix4(group.matrixWorld)); },
    collophore() { return COLLOPHORE_TIP.clone().applyMatrix4(bones[12]).applyMatrix4(group.matrixWorld); },
    furculaTip() { return new THREE.Vector3(0.08, 0.03, 0).applyMatrix4(bones[25]).applyMatrix4(group.matrixWorld); },
  };
  return api;
}
