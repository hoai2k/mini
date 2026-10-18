// Blocky Minecraft-style characters: a 64x64 procedurally painted skin,
// a jointed rig, procedural animation (idle breathing, run, combo attacks,
// dodge roll, casting, hit reactions, death) and spring physics for capes
// and hair strands.
import * as THREE from 'three/webgpu';
import { uniform, texture, uv, vec3, vec4, float, mix, positionLocal, hash, floor, step, screenCoordinate, interleavedGradientNoise, sin } from 'three/tsl';
import { damp, clamp, lerp, easeOutCubic, easeInCubic, easeOutBack, mulberry32 } from '../util.js';
import { U } from '../gfx/materials.js';

export const PX = 0.058;          // world units per skin pixel
// Every character (heroes, people, monsters, bosses) is drawn at this share of
// its model's own scale. At 1 a hero's head was 2.26 m up (hair to 3 m) in a
// world of 1 m blocks with a 1.8 m collision body, so heroes filled doorways
// and the boards felt cramped; at 0.8 the head sits at the top of the body
// that collides (1.8 m), and everyone keeps their size relative to the
// heroes. Hitboxes, reach and ranges are unchanged.
export const CHAR_SCALE = 0.8;
const SKIN = 64;
const LIMB_STRIPS = [[16, 16, 8, 12, 4], [16, 32, 8, 12, 4], [40, 16, 4, 12, 4], [40, 32, 4, 12, 4], [32, 48, 4, 12, 4], [48, 48, 4, 12, 4], [0, 16, 4, 12, 4], [16, 48, 4, 12, 4]];

// ---------------------------------------------------------------- skin painter
// Coordinates are always in the 64 × 64 Minecraft skin layout. res > 1 paints
// a finer texture (res = 2: 128 × 128): px and rect cover the same area, rect
// noise varies per fine texel, and dot / dots paint single fine texels at
// fractional coordinates (steps of 1 / res) for detail finer than a skin pixel.
export class Skin {
  constructor(seed = 1, res = 1) {
    this.res = res;
    this.canvas = document.createElement('canvas');
    this.canvas.width = SKIN * res; this.canvas.height = SKIN * res;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: res > 1 });
    this.ctx.scale(res, res);
    this.r = mulberry32(seed);
  }
  fill(c) { this.ctx.fillStyle = typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c; }
  px(x, y, c) { this.fill(c); this.ctx.fillRect(x, y, 1, 1); }
  // one fine texel (or an n × m block of them) at a fractional position
  dot(x, y, c, n = 1, m = n) { this.fill(c); this.ctx.fillRect(x, y, n / this.res, m / this.res); }
  rect(x, y, w, h, c, noise = 0.08) {
    const k = this.res, base = new THREE.Color(c), col = new THREE.Color();
    for (let j = 0; j < h * k; j++) for (let i = 0; i < w * k; i++) {
      const f = 1 + (this.r() - 0.5) * noise;
      col.setRGB(clamp(base.r * f, 0, 1), clamp(base.g * f, 0, 1), clamp(base.b * f, 0, 1));
      this.fill('#' + col.getHexString()); this.ctx.fillRect(x + i / k, y + j / k, 1 / k, 1 / k);
    }
  }
  // Light from above: the side faces of the given boxes ([u, v, w, h, d]),
  // a little brighter at the top and darker at the bottom. Default: torso,
  // arms and legs and their overlays.
  shadeLimbs(strips = LIMB_STRIPS, top = 1.08, bottom = 0.88) {
    const k = this.res, W = SKIN * k, img = this.ctx.getImageData(0, 0, W, W), D = img.data;
    for (const [u, v, w, h, d] of strips) for (let y = 0; y < h * k; y++) {
      const f = top + (bottom - top) * (y / (h * k - 1));
      for (let x = u * k; x < (u + 2 * (w + d)) * k; x++) { const i = ((v * k + d * k + y) * W + x) * 4; for (let c = 0; c < 3; c++) D[i + c] = Math.min(255, D[i + c] * f); }
    }
    this.ctx.putImageData(img, 0, 0);
  }
  // Push colours away from grey (the tone mapping washes them out).
  saturate(amount = 1.2) {
    const W = SKIN * this.res, img = this.ctx.getImageData(0, 0, W, W), D = img.data;
    for (let i = 0; i < D.length; i += 4) { const l = (D[i] + D[i + 1] + D[i + 2]) / 3; for (let c = 0; c < 3; c++) D[i + c] = Math.max(0, Math.min(255, l + (D[i + c] - l) * amount)); }
    this.ctx.putImageData(img, 0, 0);
  }
  // Paint all six faces of a box laid out MC-style at (u,v) with size w,h,d.
  box(u, v, w, h, d, c, noise) {
    this.rect(u + d, v, w, d, c, noise); this.rect(u + d + w, v, w, d, c, noise);
    this.rect(u, v + d, d, h, c, noise); this.rect(u + d, v + d, w, h, c, noise);
    this.rect(u + d + w, v + d, d, h, c, noise); this.rect(u + d + w + d, v + d, w, h, c, noise);
  }
  // Face regions helpers: front face origin for a box at (u,v,w,h,d)
  front(u, v, d) { return [u + d, v + d]; }
  back(u, v, w, d) { return [u + d + w + d, v + d]; }
  texture() {
    const t = new THREE.CanvasTexture(this.canvas);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false;
    return t;
  }
}

// Box geometry with MC-style UV unwrap. Pivot offset lets limbs hang from a joint.
export function skinBox(w, h, d, u, v, { inflate = 0, pivot = [0, 0, 0] } = {}) {
  const g = new THREE.BoxGeometry((w + inflate) * PX, (h + inflate) * PX, (d + inflate) * PX);
  const uvA = g.attributes.uv;
  const S = SKIN;
  // faces in BoxGeometry order: +x, -x, +y, -y, +z, -z (4 verts each)
  // +z is the character's front.
  const rects = [
    [u + d + w, v + d, d, h],      // +x : character's left side
    [u, v + d, d, h],              // -x : right side
    [u + d, v, w, d],              // +y : top
    [u + d + w, v, w, d],          // -y : bottom
    [u + d, v + d, w, h],          // +z : front
    [u + d + w + d, v + d, w, h],  // -z : back
  ];
  for (let f = 0; f < 6; f++) {
    const [x, y, rw, rh] = rects[f];
    const u0 = x / S, u1 = (x + rw) / S, v0 = 1 - (y + rh) / S, v1 = 1 - y / S;
    // BoxGeometry vertex order per face: (0,1) (1,1) (0,0) (1,0)
    const quad = [[u0, v1], [u1, v1], [u0, v0], [u1, v0]];
    if (f === 3) { quad[0] = [u0, v0]; quad[1] = [u1, v0]; quad[2] = [u0, v1]; quad[3] = [u1, v1]; }
    for (let k = 0; k < 4; k++) uvA.setXY(f * 4 + k, quad[k][0], quad[k][1]);
  }
  g.translate(pivot[0] * PX, pivot[1] * PX, pivot[2] * PX);
  return g;
}

export const FLASH_MATERIAL = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
FLASH_MATERIAL.colorNode = vec3(2.2, 2.2, 2.2);

// Character material with hit-flash, emissive tint, elite glow and dissolve.
export function makeCharMaterial(map, opts = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ map, roughness: opts.roughness ?? 0.8, metalness: 0 });
  const flash = uniform(0), glow = uniform(new THREE.Color(0, 0, 0)), dissolve = uniform(0), emitMask = uniform(opts.emitStrength ?? 0);
  const tex = texture(map, uv());
  // bright pixels (eyes, markings) glow a little when emitStrength > 0
  const bright = step(0.92, tex.r.max(tex.g).max(tex.b));
  const fill = uniform(opts.fill ?? 0.06);
  m.emissiveNode = mix(tex.rgb.mul(bright).mul(emitMask).add(glow).add(tex.rgb.mul(fill)), vec3(1, 1, 1).mul(2.2), flash);
  const n = interleavedGradientNoise(screenCoordinate.xy);
  m.maskNode = n.greaterThan(dissolve);
  m.userData = { flash, glow, dissolve, emitMask };
  return m;
}

// ---------------------------------------------------------------- holding things
// Hand-local axes. rig.handR and rig.handL sit at the fist, the bottom of the
// arm, and are not mirrored (the same axes in both hands). With the arm
// hanging (idle): +y runs up the forearm toward the shoulder, -y down to the
// ground, +z forward (the way the character faces), +x to the character's
// left. Raising the arm forward (arm rotation.x = -PI/2) turns hand +z up and
// hand -y forward. A positive rotation.x on a prop tips its +y toward +z
// (forward); a negative one tips it back over the shoulder, which is how
// weapons ended up held backwards (Ares, Luke, the cyclops, the spartoi).
// Convention: build a weapon along its own +y, grip at the origin, and hang
// it on the hand with rotation.x = HOLD_PITCH, so at rest it points forward,
// a little above level (a weapon built along +z, like the heroes' kits, needs
// no turn). In attacks the wrist (hand rotation.x, see attackPose) cocks it so
// it points forward at the strike of every style. markTip() names the tip so
// percyjackson/perf/weapons.cjs can check every armed model.
export const HOLD_PITCH = Math.PI / 2 - 0.3;
// Mark a weapon's tip (skin pixels, in the weapon's own space); label names it in the check.
export function markTip(weapon, x, y, z, label = 'weapon') {
  const o = new THREE.Object3D(); o.name = 'weaponTip'; o.userData.weaponTip = true; o.userData.label = label;
  o.position.set(x * PX, y * PX, z * PX); weapon.add(o); return o;
}
// Mark something held that has no point to aim (a shield, pom-poms, panpipes,
// a sling, a whip that trails), so the weapon check leaves it be.
export function markHeld(g) { g.userData.heldProp = true; return g; }

const _v1 = new THREE.Vector3(), _box = new THREE.Box3(), _m = new THREE.Matrix4(), _inv = new THREE.Matrix4();

// ---------------------------------------------------------------- rig
// The rest pose (radians): arms out to the sides and a touch forward, legs apart.
const IDLE = { armZ: 0.22, armX: -0.06, legZ: 0.1 };

// A spec describes the body. Defaults give a MCD-proportioned humanoid.
export class Rig {
  constructor(spec) {
    this.spec = spec;
    this.root = new THREE.Group();
    this.material = spec.material;
    const M = this.material;
    const s = (spec.scale ?? 1) * CHAR_SCALE;
    this.root.scale.setScalar(s); this.baseScale = s;   // (code that resizes the rig for a moment goes back to baseScale)
    this.meshes = [];
    const mesh = (g, mat = M) => { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; m.userData.baseMat = mat; this.meshes.push(m); return m; };
    this.mesh = mesh;
    const legH = spec.legH ?? 12, bodyH = spec.bodyH ?? 12, bodyW = spec.bodyW ?? 8, bodyD = spec.bodyD ?? 4, armW = spec.armW ?? 4, headS = spec.headS ?? 8;
    this.dims = { legH, bodyH, bodyW, bodyD, armW, headS };
    // hips
    this.hips = new THREE.Group(); this.hips.position.y = legH * PX; this.root.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);
    this.torso.add(mesh(skinBox(bodyW, bodyH, bodyD, 16, 16, { pivot: [0, bodyH / 2, 0] })));
    if (spec.jacket !== false) this.torso.add(mesh(skinBox(bodyW, bodyH, bodyD, 16, 32, { inflate: 0.5, pivot: [0, bodyH / 2, 0] })));
    // head
    this.neck = new THREE.Group(); this.neck.position.y = bodyH * PX; this.torso.add(this.neck);
    this.head = new THREE.Group(); this.neck.add(this.head);
    const hs = headS / 8;
    const headMesh = mesh(skinBox(8, 8, 8, 0, 0, { pivot: [0, 4, 0] })); headMesh.scale.setScalar(hs * 1.12); this.head.add(headMesh);
    const hat = mesh(skinBox(8, 8, 8, 32, 0, { inflate: 1, pivot: [0, 4, 0] })); hat.scale.setScalar(hs * 1.12); this.head.add(hat);
    this.headMesh = headMesh;
    // arms
    const armY = (bodyH - 2) * PX, armX = (bodyW / 2 + armW / 2) * PX;
    this.armR = new THREE.Group(); this.armR.position.set(-armX, armY, 0); this.torso.add(this.armR);
    this.armL = new THREE.Group(); this.armL.position.set(armX, armY, 0); this.torso.add(this.armL);
    this.armR.add(mesh(skinBox(armW, 12, 4, 40, 16, { pivot: [0, -4, 0] })));
    this.armR.add(mesh(skinBox(armW, 12, 4, 40, 32, { inflate: 0.5, pivot: [0, -4, 0] })));
    this.armL.add(mesh(skinBox(armW, 12, 4, 32, 48, { pivot: [0, -4, 0] })));
    this.armL.add(mesh(skinBox(armW, 12, 4, 48, 48, { inflate: 0.5, pivot: [0, -4, 0] })));
    this.handR = new THREE.Group(); this.handR.position.y = -10 * PX; this.armR.add(this.handR);
    this.handL = new THREE.Group(); this.handL.position.y = -10 * PX; this.armL.add(this.handL);
    // legs
    this.legR = new THREE.Group(); this.legR.position.set(-2 * PX, 0, 0); this.hips.add(this.legR);
    this.legL = new THREE.Group(); this.legL.position.set(2 * PX, 0, 0); this.hips.add(this.legL);
    this.legR.add(mesh(skinBox(4, legH, 4, 0, 16, { pivot: [0, -legH / 2, 0] })));
    this.legL.add(mesh(skinBox(4, legH, 4, 16, 48, { pivot: [0, -legH / 2, 0] })));
    // hair strands (spring physics)
    this.strands = [];
    for (const h of spec.hair || []) {
      const piv = new THREE.Group(); piv.position.set(h.x * PX * hs * 1.12, h.y * PX * hs * 1.12, h.z * PX * hs * 1.12);
      const hm = new THREE.Mesh(new THREE.BoxGeometry(h.w * PX, h.h * PX, h.d * PX).translate(0, h.h * PX / 2 * (h.hang ? -1 : 1), 0), h.material || spec.hairMaterial);
      hm.castShadow = true; hm.rotation.set(h.rx || 0, h.ry || 0, h.rz || 0); hm.userData.baseMat = hm.material; this.meshes.push(hm);
      piv.add(hm); this.head.add(piv);
      this.strands.push({ g: piv, ax: 0, az: 0, vx: 0, vz: 0, stiff: h.stiff ?? 60, base: [0, 0] });
    }
    // cape: chain of segments
    this.cape = [];
    if (spec.cape) {
      const cm = spec.cape.material;
      let parent = new THREE.Group(); parent.position.set(0, (bodyH - 0.5) * PX, -(bodyD / 2 + 0.6) * PX); this.torso.add(parent);
      const segs = spec.cape.segments ?? 4, segH = (spec.cape.length ?? 20) / segs;
      for (let i = 0; i < segs; i++) {
        const seg = new THREE.Group(); if (i > 0) seg.position.y = -segH * PX;
        const w = (spec.cape.width ?? bodyW + 2) * (1 + i * 0.06);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, segH * PX, 0.6 * PX).translate(0, -segH * PX / 2, 0), cm);
        m.castShadow = true; m.userData.baseMat = cm; this.meshes.push(m); seg.add(m); parent.add(seg);
        this.cape.push({ g: seg, a: 0.1, v: 0 });
        parent = seg;
      }
    }
    // start in the idle stance, so a model that is never animated stands like one that is
    this.armR.rotation.set(IDLE.armX, 0, -IDLE.armZ); this.armL.rotation.set(IDLE.armX, 0, IDLE.armZ);
    this.legR.rotation.z = -IDLE.legZ; this.legL.rotation.z = IDLE.legZ;
    // extras (weapons/props)
    this.extras = {};
    // animation state
    this.pose = {};
    this.t = Math.random() * 10;
    this.lastPos = new THREE.Vector3();
    this.lastVel = new THREE.Vector3();
  }

  // params: { speed (0..1), vel(Vector3), dt, action: {type, t(0..1), step, dir}, facing, ground }
  animate(p) {
    const dt = p.dt; this.t += dt;
    const t = this.t;
    const run = clamp(p.speed ?? 0, 0, 1);
    const cyc = t * (7 + run * 5);
    const sw = Math.sin(cyc) * run;
    // base targets
    const T = {
      hipsY: this.dims.legH * PX + Math.abs(Math.cos(cyc)) * 0.06 * run + Math.sin(t * 2.2) * 0.01 * (1 - run),
      torsoX: 0.08 * run, torsoY: 0, torsoZ: 0,
      headX: -0.05 * run + Math.sin(t * 2.2) * 0.02, headY: 0,
      // idle stance: arms held a little out from the body and feet apart,
      // as on the hero sheets; running brings them back in
      armRX: -sw * 1.0 + IDLE.armX * (1 - run), armRZ: -IDLE.armZ * (1 - run) - 0.04 * run - Math.sin(t * 2.2) * 0.02 * (1 - run), armRY: 0,
      armLX: sw * 1.0 + IDLE.armX * (1 - run), armLZ: IDLE.armZ * (1 - run) + 0.04 * run + Math.sin(t * 2.2) * 0.02 * (1 - run), armLY: 0,
      handRX: 0, handLX: 0,   // the wrists: attacks cock a held weapon forward (see HOLD_PITCH)
      legRX: sw * 1.0, legLX: -sw * 1.0, legRZ: -IDLE.legZ * (1 - run), legLZ: IDLE.legZ * (1 - run),
      rootX: 0, rootZ: 0, lift: 0,
    };
    // breathing
    const breath = 1 + Math.sin(t * 2.2) * 0.012 * (1 - run);
    this.torso.scale.set(breath, 1 + (breath - 1) * 0.5, breath);
    const a = p.action;
    let snap = 18;
    if (p.air && !a) { T.armRX = -0.6; T.armLX = -0.4; T.armRZ = 0.55; T.armLZ = -0.55; T.legRX = -0.7; T.legLX = 0.35; T.torsoX = 0.1; }
    if (a) {
      const k = a.t;
      switch (a.type) {
        case 'attack': this.attackPose(T, a, k); snap = 40; break;
        case 'dodge': {
          // forward roll: whole body tucks and rotates about X
          const rk = easeOutCubic(clamp(k, 0, 1));
          T.rootX = rk * Math.PI * 2; T.lift = Math.sin(k * Math.PI) * 0.08;   // (the roll turns about the tucked body's centre: see rollAbout)
          T.legRX = -1.4; T.legLX = -1.2; T.armRX = -1.8; T.armLX = -1.8; T.headX = 0.4; T.torsoX = 0.6;
          snap = 50; break;
        }
        case 'cast': {
          // one or both hands forward, fingers "sign"
          const both = a.both;
          const e = k < 0.25 ? easeOutCubic(k / 0.25) : 1;
          T.armRX = lerp(T.armRX, -1.55, e); T.armRY = lerp(0, -0.2, e); T.armRZ = 0;
          if (both) { T.armLX = lerp(T.armLX, -1.55, e); T.armLY = 0.2; T.armLZ = 0; }
          T.torsoY = lerp(0, 0.35, e) * (both ? 0 : 1);
          T.headX = 0.05; snap = 30; break;
        }
        case 'raise': { // overhead / domain hand sign
          T.armRX = -2.6; T.armLX = -0.9; T.armLY = 0.6; T.armRZ = 0.3; T.headX = -0.25; T.torsoX = -0.12; snap = 20; break;
        }
        case 'sign': { // hands together in front of chest (domain expansion)
          T.armRX = -1.25; T.armRY = 0.6; T.armRZ = 0.2; T.armLX = -1.25; T.armLY = -0.6; T.armLZ = -0.2; T.headX = 0.1; T.torsoX = 0.02; snap = 16; break;
        }
        case 'hit': {
          const e = Math.sin(clamp(k, 0, 1) * Math.PI);
          T.torsoX = -0.45 * e; T.headX = -0.4 * e; T.armRX = -0.6 * e; T.armLX = -0.6 * e; T.armRZ = 0.5 * e; T.armLZ = -0.5 * e; snap = 30; break;
        }
        case 'death': {
          const e = easeInCubic(clamp(k * 1.4, 0, 1));
          T.rootX = -Math.PI / 2 * e; T.lift = 0.1 * Math.sin(e * Math.PI); T.armRZ = 0.8 * e; T.armLZ = -0.8 * e; T.headX = -0.3 * e; snap = 25; break;
        }
        case 'stagger': { T.torsoX = 0.4; T.headX = 0.5; T.armRX = 0.2; T.armLX = 0.2; T.armRZ = 0.4; T.armLZ = -0.4; break; }
        case 'down': { T.rootX = -Math.PI / 2; T.lift = 0.05; T.armRZ = 0.8; T.armLZ = -0.8; snap = 12; break; }
      }
    }
    const L = (obj, key, target, ax) => { obj.rotation[ax] = damp(obj.rotation[ax], target, snap, dt); };
    this.hips.position.y = damp(this.hips.position.y, T.hipsY + T.lift, snap, dt);
    L(this.torso, 'torsoX', T.torsoX, 'x'); L(this.torso, 'torsoY', T.torsoY, 'y'); L(this.torso, 'torsoZ', T.torsoZ, 'z');
    L(this.head, 'headX', T.headX, 'x'); L(this.head, 'headY', T.headY, 'y');
    L(this.armR, 'armRX', T.armRX, 'x'); L(this.armR, 'armRY', T.armRY, 'y'); L(this.armR, 'armRZ', T.armRZ, 'z');
    L(this.armL, 'armLX', T.armLX, 'x'); L(this.armL, 'armLY', T.armLY, 'y'); L(this.armL, 'armLZ', T.armLZ, 'z');
    L(this.handR, 'handRX', T.handRX, 'x'); L(this.handL, 'handLX', T.handLX, 'x');
    L(this.legR, 'legRX', T.legRX, 'x'); L(this.legL, 'legLX', T.legLX, 'x');
    L(this.legR, 'legRZ', T.legRZ, 'z'); L(this.legL, 'legLZ', T.legLZ, 'z');
    // body roll (dodge): turns about the tucked body's centre of mass; the
    // death fall rotates the hips around their pivot
    if (a && (a.type === 'dodge')) this.rollAbout(T.rootX, T.lift);
    else { this.hips.rotation.x = damp(this.hips.rotation.x % (Math.PI * 2), T.rootX, snap, dt); this.hips.position.z = damp(this.hips.position.z, 0, snap, dt); }
    this.physics(p);
  }
  // The roll turned the whole body about the hip joint, so the tucked body's
  // centre (about 0.6 m up and 0.6 m forward of the hips) swung round a circle
  // 1.7 m across, through the floor and back. Here the centre of mass, worked
  // out from the posed pieces each frame (it shifts as the limbs tuck), stays
  // where it was with the hips upright: on the line of travel, at one height.
  rollAbout(theta, lift = 0) {
    const c = this.massCentre(), cs = Math.cos(theta), sn = Math.sin(theta);
    this.hips.rotation.x = theta;
    this.hips.position.y = this.dims.legH * PX + lift - (c.y * cs - c.z * sn) + c.y;
    this.hips.position.z = c.z - (c.y * sn + c.z * cs);
  }
  // Centre of mass of the body in hips space (pieces weighted by their box volume).
  massCentre() {
    const c = this._com ?? (this._com = new THREE.Vector3()), v = _v1, b = _box;
    const rot = this.hips.rotation.x, pz = this.hips.position.z;
    this.hips.rotation.x = 0; this.hips.position.z = 0;
    this.hips.updateMatrixWorld(true);
    _inv.copy(this.hips.matrixWorld).invert();
    let m = 0; c.set(0, 0, 0);
    this.hips.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      b.copy(o.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(_inv, o.matrixWorld));
      b.getSize(v); const w = Math.max(1e-6, v.x * v.y * v.z);
      c.addScaledVector(b.getCenter(v), w); m += w;
    });
    this.hips.rotation.x = rot; this.hips.position.z = pz;
    return m ? c.divideScalar(m) : c.set(0, 0, 0);
  }
  attackPose(T, a, k) {
    // wind-up (0..w), strike (w..s), recover (s..1)
    const w = a.windup ?? 0.25, s = a.strike ?? 0.5;
    const phase = k < w ? 0 : k < s ? 1 : 2;
    const e = phase === 0 ? easeOutCubic(k / w) : phase === 1 ? easeOutBack((k - w) / (s - w)) : 1 - easeInCubic((k - s) / (1 - s)) * 0.7;
    const style = a.style || ['swingR', 'swingL', 'slam'][a.step % 3];
    const m = Math.min(1, e);
    T.legRX = 0.35; T.legLX = -0.35;
    // (handRX / handLX: the wrist. A weapon held by the convention above points
    // forward at rest; with the arm raised it would point up or back over the
    // shoulder, so each style cocks the wrist to keep the blade forward at the
    // strike, and the swings sweep it across the front.)
    switch (style) {
      case 'swingR': // right hand horizontal swing / hook: from the left shoulder across the front, ending on the target
        if (phase === 0) { T.armRX = -1.3 * e; T.armRY = 0.9 * e; T.armRZ = 0.8 * e; T.torsoY = 0.6 * e; T.handRX = 0.9 * e; }
        else { T.armRX = -1.5; T.armRY = lerp(0.9, -0.2, m); T.armRZ = lerp(0.8, -0.1, m); T.torsoY = lerp(0.6, -0.35, m); T.handRX = lerp(0.9, 1.5, m); }
        T.armLX = -0.4; break;
      case 'swingL':
        if (phase === 0) { T.armLX = -1.3 * e; T.armLY = -0.9 * e; T.armLZ = -0.8 * e; T.torsoY = -0.6 * e; T.handLX = 0.9 * e; }
        else { T.armLX = -1.5; T.armLY = lerp(-0.9, 0.2, m); T.armLZ = lerp(-0.8, 0.1, m); T.torsoY = lerp(-0.6, 0.35, m); T.handLX = lerp(0.9, 1.5, m); }
        T.armRX = -0.4; break;
      case 'punch': // straight jab (a thrust) with right
        if (phase === 0) { T.armRX = -1.0 * e; T.armRZ = 0.3; T.torsoY = 0.5 * e; T.handRX = 0.8 * e; }
        else { T.armRX = -1.57; T.armRZ = 0; T.torsoY = lerp(0.5, -0.4, m); T.torsoX = 0.2; T.handRX = lerp(0.8, 1.4, m); }
        T.armLX = -1.1; T.armLY = -0.4; break;
      case 'slam': // overhead two-handed slam: raised up behind the head, brought down in front
        if (phase === 0) { T.armRX = -2.9 * e; T.armLX = -2.9 * e; T.torsoX = -0.25 * e; T.headX = -0.2 * e; T.handRX = T.handLX = 1.2 * e; }
        else { T.armRX = lerp(-2.9, -0.9, m); T.armLX = lerp(-2.9, -0.9, m); T.torsoX = lerp(-0.25, 0.45, m); T.headX = 0.2; T.handRX = T.handLX = lerp(1.2, 1.0, m); }
        T.lift = phase === 0 ? 0.12 * e : 0; break;
      case 'uppercut': // low behind, rising up in front
        if (phase === 0) { T.armRX = 0.4 * e; T.torsoX = 0.3 * e; T.lift = -0.08 * e; }
        else { T.armRX = lerp(0.4, -2.4, m); T.torsoX = lerp(0.3, -0.3, m); T.lift = 0.15 * e; T.handRX = 2.0 * m; }
        break;
      case 'spin':
        T.torsoY = (phase === 0 ? 0.4 * e : lerp(0.4, -Math.PI * 1.8, m)); T.armRX = -1.5; T.armLX = -1.5; T.armRZ = 1.2; T.armLZ = -1.2; T.handRX = T.handLX = 1.4; break;
      case 'throw':
        if (phase === 0) { T.armRX = -2.6 * e; T.armRZ = 0.2; T.torsoY = 0.4 * e; }
        else { T.armRX = lerp(-2.6, -1.2, m); T.torsoY = lerp(0.4, -0.3, m); }
        T.handRX = 1.0; T.armLX = -0.8; break;
    }
  }
  physics(p) {
    const dt = Math.min(p.dt, 1 / 30);
    const v = p.vel || this.lastVel;
    // local velocity (in character space) to swing capes/hair backwards
    const yaw = this.root.rotation.y;
    const fwd = v.x * Math.sin(yaw) + v.z * Math.cos(yaw);
    const side = v.x * Math.cos(yaw) - v.z * Math.sin(yaw);
    const acc = (fwd - (this._lastFwd ?? 0)) / Math.max(dt, 1e-3); this._lastFwd = fwd;
    const wind = Math.sin(this.t * 1.7) * 0.05 + Math.sin(this.t * 4.3) * 0.03;
    let parentAngle = 0;
    for (let i = 0; i < this.cape.length; i++) {
      const c = this.cape[i];
      const target = clamp(0.08 + Math.max(0, fwd) * 0.09 * (1 + i * 0.25) + wind * (i + 1) - Math.min(0, fwd) * 0.02, -0.2, 1.2) - parentAngle * 0.15;
      const a = (target - c.a) * 90 - c.v * 11 - acc * 0.004 * (i + 1);
      c.v += a * dt; c.a += c.v * dt;
      c.a = clamp(c.a, -0.6, 1.5);
      c.g.rotation.x = c.a - (i ? this.cape[i - 1].a * 0.6 : 0);
      c.g.rotation.z = clamp(-side * 0.03, -0.3, 0.3);
      parentAngle = c.a;
    }
    for (const s of this.strands) {
      const tx = clamp(fwd * 0.05, -0.2, 0.5) + wind, tz = clamp(-side * 0.04, -0.4, 0.4);
      s.vx += ((tx - s.ax) * s.stiff - s.vx * 8 - acc * 0.003) * dt; s.ax += s.vx * dt;
      s.vz += ((tz - s.az) * s.stiff - s.vz * 8) * dt; s.az += s.vz * dt;
      s.g.rotation.x = s.ax; s.g.rotation.z = s.az;
    }
  }
  setFlash(v) { this.material.userData.flash.value = v; }
  // Swap every part to a shared material (hit flash / elite glow) without
  // creating per-instance materials, so spawning never recompiles shaders.
  swap(mat) { if (this._swapped === mat) return; this._swapped = mat; for (const m of this.meshes) m.material = mat || m.userData.baseMat; }
  setGlow(color) { this.material.userData.glow.value.set(color); }
  setDissolve(v) { this.material.userData.dissolve.value = v; }
}
