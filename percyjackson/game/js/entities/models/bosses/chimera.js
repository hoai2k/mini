// The Chimera (after vox-bosses-1): a body about 7 m long, 3.2x Percy,
// sculpted at that size on a fine grid rather than scaled up. A big cat's body: a deep
// chest, heavy shoulder blades and haunches, a tucked waist, long legs set
// wide in a planted stance on big clawed paws. Two heads of equal standing
// side by side on twin necks from the shoulders (not the goat's behind the
// lion's, as the sheet half draws it): the lion's, in a fiery
// mane with amber eyes and a fanged, roaring maw, on its right; the goat's,
// with great ridged horns, a beard and yellow eyes, on its left. Both
// breathe fire (rig.mouthWorld(out, i): 0 the lion, 1 the goat). The heads
// are small against the body, as on the sheet:
// the lion's face about 0.4 of the shoulder height, the legs under the
// belly about the same. Its tail is a diamondback rattlesnake rising over
// the back, its head looking forward.
import * as THREE from 'three/webgpu';
import { PX } from '../../character.js';
import { QuadRig, paintQuad } from '../../quad.js';
import { animateExtras } from '../animate.js';
import { skinMat, group, fur } from '../../parts.js';
import { sculpt, along, hideSkin, hash3 } from '../../voxkit.js';
import { VD } from './parts.js';

export function buildChimera() {
  const m = skinMat('boss_chimera', (S) => paintQuad(S, { base: 0xc8a878, dark: 0x8a7a66, belly: 0xd8c098, back: 0xb8986a, eye: 0xffc81a, eyeLow: 0xff7a1a, nose: 0x3a2214, teeth: 0xfff4e0, speckles: 40,
    custom: (s) => { s.box(0, 0, 8, 8, 8, 0xd89a40, 0.12); s.rect(9, 10, 2, 2, 0xffd84a, 0); s.rect(13, 10, 2, 2, 0xffd84a, 0); s.px(10, 11, 0x1a0a00); s.px(13, 11, 0x1a0a00); s.rect(9, 9, 6, 1, 0x8a5a20, 0); s.box(32, 0, 4, 4, 4, 0xe8b868, 0.1); s.rect(36, 4, 4, 1, 0x3a2214, 0); s.box(48, 0, 4, 2, 4, 0xa8282a, 0.1);
      s.box(40, 32, 2, 2, 6, 0x5a4a2a, 0.1); for (let y = 32; y < 40; y += 2) s.rect(40, y, 16, 1, 0xe0c060, 0); for (let x = 41; x < 56; x += 3) s.rect(x, 33, 1, 6, 0x2a2010, 0);
      fur(s, 0, 16, 40, 20, 60, 0x9a8466, 0xe0c8a0); for (const x of [0, 20]) s.rect(x, 28, 6, 8, 0x8a8478, 0.15); s.rect(12, 16, 8, 6, 0x8a8478, 0.15); } }), { emit: 2.6 });
  const rig = new QuadRig({ material: m, scale: 4, bodyL: 34, bodyW: 13, bodyH: 16, legH: 16, legW: 5.5, legY: 6, legSpread: 1.2, stance: 0.1, legsOnTorso: true, headS: 10, ears: false, tail: 9, tailLen: 30, tailW: 4.2, tailCurl: 0.4, gait: 0.6, neckUp: 0, jawOpen: 0.08 });
  const { legH, legW } = rig.dims, st = rig.spec.stance, both = (f) => [-1, 1].flatMap(f);
  hideSkin(rig.torso, rig.head, rig.mouth, ...rig.legs, ...rig.tail);
  rig.vd = VD.chimera; rig.merge = true; rig.hg = 3;
  // the coat (sampled off the sheet by pixel): a warm tawny lion
  // over the forequarters, a darker, browner goat over the rear, on dark
  // grey-brown goat legs; each mass shaded dark underneath to light on top,
  // so the muscles read against each other, over a cream belly
  const TAN = [0x5a2a0c, 0x7a3c12, 0x9a5418, 0xb86a24, 0xd08236, 0xe0984a, 0xeeb262];
  const PALE = [0x34221a, 0x463022, 0x5a3e2c, 0x6c4c36, 0x7e5a42, 0x8e664c, 0x9c7256];   // (the goat's rear)
  const GLEG = [0x261c1a, 0x342624, 0x44332f, 0x54403a, 0x644d45, 0x745a50, 0x82665a];   // (the goat's legs)
  const maneC = [0x401905, 0x692c09, 0x833a0d, 0xbb5411, 0xde6f17, 0xf58e28];
  const greyF = [0x221816, 0x30221f, 0x3e2e2c, 0x4e3b3b, 0x5c4848, 0x6c5654, 0x7e6462];   // (the goat's charcoal-brown)
  const BELLY = [0xe8c48a, 0xf0d098, 0xf6dcaa];
  const HOOF = [0x150e0d, 0x261a1a, 0x3c2d2e];
  const tone = (P, cy, ry, base) => (x, y, z, n) => P[Math.max(0, Math.min(P.length - 1, Math.round(base + (y - cy) / ry * 2 + (n - 0.5) * 1.8)))];
  // the torso: a mass's palette by where it is (tawny in front, pale behind,
  // blended through the ribs), the belly cream under the line y < -5.4
  const coat = (cy, ry, base = 3) => { const a = tone(TAN, cy, ry, base), b = tone(PALE, cy, ry, base); return (x, y, z, n, h) => (y < -5.4 + (n - 0.5) * 1.6 && Math.abs(x) < 4.6 ? BELLY[Math.floor(h * 3)] : z < -3 + (n - 0.5) * 14 ? b(x, y, z, n) : a(x, y, z, n)); };
  const E = (cx, cy, cz, rx, ry, rz, base, o = {}) => ({ e: [cx, cy, cz, rx, ry, rz], col: coat(cy, ry, base), ...o });
  sculpt(rig, rig.torso, [
    E(0, 5.4, 9.5, 4.6, 2.8, 6.5, 3.6),                                       // the withers
    ...both((s) => [E(s * 5.2, 2.6, 11.5, 3.4, 6.2, 5.2, 3.4)]),               // shoulder blades
    ...both((s) => [E(s * 5.7, -3.4, 13.2, 3.1, 5, 4, 2.8)]),                  // the upper arms, over the elbows
    ...both((s) => [E(s * 3, -4.2, 15.6, 3.2, 4.6, 3, 2.8)]),                  // pectorals
    E(0, -0.6, 11, 6.4, 8, 6.6, 3),                                            // the deep chest
    E(0, 1.2, 1.5, 6.2, 6.6, 9, 3),                                            // the ribs
    E(0, 1.8, -6.5, 5, 5.8, 6, 3.2),                                           // the waist, tucked up
    ...both((s) => [E(s * 4.3, 1.8, -12.5, 4, 6.6, 6, 3.4)]),                  // haunches
    E(0, 3.4, -14.5, 5.4, 4.8, 4.6, 3.2),                                      // the rump
  ], { v: 1, seed: 31, bump: 0.12, fuzz: 0.1 });
  // long legs: the front ones a column of upper arm and forearm with the
  // elbow behind, the hind ones a big thigh, the gaskin back to a high hock
  // and a long cannon forward to the foot; the lion's big paws in front,
  // four toes and cream claws, the goat's dark cloven hooves behind
  const claw = 0xf2e6cc, clawD = 0xc8b48a;
  for (const leg of rig.legs) {
    const front = leg.userData.row === 0, s = leg.userData.side, P = front ? TAN : GLEG;
    sculpt(rig, leg, front ? [
      { cap: [0, 1, 0.6, 0, -6.4, -1.2, 3.6, 3], col: tone(P, -2.5, 4.5, 3) },               // upper arm
      { e: [0, -6.6, -2.1, 2.2, 2.4, 1.9], col: tone(P, -6.6, 2.4, 2.4) },                    // the elbow
      { e: [0, -9, 0.5, 2.7, 3.6, 2.6], col: tone(P, -9, 3.6, 2.8) },                         // forearm muscle
      { cap: [0, -6.4, -0.6, 0, -15.6, 0.6, 2.6, 2.1], col: tone(P, -11, 4.5, 2.4) },          // forearm
    ] : [
      { e: [0, -1.4, 0.6, 3.7, 6, 4.8], col: tone(PALE, -1.4, 6, 3.2) },                       // thigh (the rump's coat)
      { cap: [0, -5.6, 0.6, 0, -10.6, -3.2, 2.9, 2.1], col: tone(P, -8, 3, 2.6) },              // gaskin
      { e: [0, -10.9, -3.4, 1.7, 1.7, 1.6], col: tone(P, -10.9, 1.7, 2.2) },                   // the hock
      { cap: [0, -10.8, -3.2, 0, -15.8, -0.4, 1.9, 1.8], col: tone(P, -13, 3, 2.2) },          // the cannon
    ], { v: 1, seed: 33 + leg.userData.row, bump: 0.1, fuzz: 0.08 });
    // the paw, level though the leg leans out (stance)
    const paw = group(leg, 0, -legH - legW * 0.2, front ? 0.6 : -0.2, 0, 0, -st * s);
    const toes = [-1.65, -0.55, 0.55, 1.65];
    if (!front) {   // the goat's foot: a shaggy fetlock over two dark hoof halves, the cleft between, dewclaws behind
      sculpt(rig, paw, [
        { e: [0, 2.2, 0.8, 3, 1.9, 3.2], col: tone(P, 2.2, 1.9, 2.6), fuzz: 0.2 },
        ...[-1, 1].map((sx) => ({ e: [sx * 1.35, 0.95, 2.6, 1.1, 0.95, 2.4], col: (x, y, z, nn, h) => (y > 1.5 ? HOOF[2] : HOOF[Math.floor(h * 2)]), bump: 0.03, fuzz: 0.03 })),
      ], { v: 0.75, seed: 37 }, [-1, 1].map((sx) => ({ p: [sx * 1.3, 1.5, -1.9], s: [0.8, 0.8, 0.7], c: HOOF[1], r: [-0.4, 0, 0] })));
      continue;
    }
    sculpt(rig, paw, [
      { e: [0, 1.9, 1.2, 3.3, 1.9, 3.6], col: tone(P, 1.9, 1.9, 2.8) },
      ...toes.map((dx) => ({ e: [dx * 1.35, 1.05, 4.2 - Math.abs(dx) * 0.45, 0.9, 1.05, 1.3], col: tone(P, 1.05, 1.05, 3.4), bump: 0.04, fuzz: 0.04 })),
    ], { v: 0.75, seed: 37 }, toes.flatMap((dx) => {
      const z = 5.3 - Math.abs(dx) * 0.45, x = dx * 1.35;
      return [{ p: [x, 0.8, z], s: [0.55, 1, 1.3], c: claw, r: [0.5, 0, 0] }, { p: [x, 0.35, z + 0.75], s: [0.45, 0.7, 0.8], c: clawD, r: [1.1, 0, 0] }];
    }));
  }
  // twin necks from the shoulders, splayed a little apart: the lion's on its
  // right (rig.neck and rig.head, which the QuadRig poses), the goat's on
  // its left (it follows the lion's head in rig.tick below)
  const NX = 6, NY = 4, NZ = 12, NYAW = 0.14;
  rig.neck.position.set(-NX * PX, NY * PX, NZ * PX); rig.neck.rotation.y = -NYAW;
  rig.head.position.set(0, 4.4 * PX, 1 * PX);
  const goatNeck = group(rig.torso, NX, NY, NZ, 0, NYAW, 0), goatHead = group(goatNeck, 0, 3.8, 1);
  sculpt(rig, rig.neck, [
    { cap: [0, -4.4, -4, 0, 2.6, 1, 4.3, 3.8], col: maneC, fuzz: 0.16, bump: 0.12 },
    { e: [0.6, -6.4, 2.6, 4.4, 5, 3.4], col: maneC, fuzz: 0.3, bump: 0.2 },                     // the mane down the chest
  ], { v: 1, seed: 35 });
  sculpt(rig, goatNeck, [
    { cap: [0, -4.4, -4, 0, 2.6, 1, 3.8, 3.3], col: greyF, fuzz: 0.16, bump: 0.12 },
    { e: [-0.4, -5.6, 2.2, 3.8, 4.4, 3], col: greyF, fuzz: 0.3, bump: 0.2 },                     // shag over the shoulder
  ], { v: 1, seed: 36 });
  rig.vd = VD.chimeraHead;
  // the lion's head (designed at head size 8, k scales it): amber eyes under
  // a heavy brow, a pale muzzle, a roaring mouth with fire in it, the mane
  const k = 1.3, S = (a) => a.map((q) => q * k);
  rig.mouth.position.set(0, -4.4 * PX, 7.8 * PX);
  sculpt(rig, rig.head, [
    { b: S([-2.8, 1, 5.6, -1.1, 1.9, 6.8]), col: 0xff9a10, m: 'e', bump: 0, fuzz: 0 }, { b: S([1.1, 1, 5.6, 2.8, 1.9, 6.8]), col: 0xff9a10, m: 'e', bump: 0, fuzz: 0 },
    { b: S([-2.2, 1.2, 6.7, -1.7, 1.8, 6.9]), col: 0x1a0a00, bump: 0, fuzz: 0 }, { b: S([1.7, 1.2, 6.7, 2.2, 1.8, 6.9]), col: 0x1a0a00, bump: 0, fuzz: 0 },
    { e: S([-2, 2.6, 5.4, 1.9, 0.8, 1.4]), col: 0x7a4012 }, { e: S([2, 2.6, 5.4, 1.9, 0.8, 1.4]), col: 0x7a4012 },
    { b: S([-1.2, 0.2, 9.4, 1.2, 1.4, 10.4]), col: 0x3a1a10, bump: 0, fuzz: 0 },
    { b: S([-1.8, -2.4, 6.2, 1.8, -1.6, 9.8]), col: 0xa01820, bump: 0, fuzz: 0 },
    { e: S([0, -0.4, 8, 2.6, 1.9, 2.6]), col: (x, y) => (y < -1 * k ? 0xf8cc78 : [0xe88932, 0xf6a444][Math.floor(hash3(Math.floor(x * 2), Math.floor(y * 2), 1, 1) * 2)]), bump: 0.05, fuzz: 0.05 },
    ...[-1, 1].map((sx) => ({ e: S([sx * 3.4, 4.6, 1.8, 1.1, 1.1, 0.7]), col: 0x8a5220 })),          // round ears in the mane
    { e: S([0, 1, 2.6, 4.2, 4, 4]), col: tone(TAN, 1 * k, 4 * k, 4) },
    { e: S([0, 0.4, 0.6, 5.8, 6.5, 4.2]), col: (x, y, z, n) => ((z > 3.4 * k && Math.abs(x) < 4.2 * k && y > -3.4 * k) || y < -6.1 * k ? null : maneC[Math.min(5, Math.floor(n * 6))]), fuzz: 0.32, bump: 0.22 },
    { e: S([0, 0, -1.8, 5, 5.6, 3]), col: maneC, fuzz: 0.32, bump: 0.22 },
  ], { v: 0.8, seed: 36 }, [
    ...[[1.4, 9.2, 1.9], [1.6, 7.4, 1.2]].flatMap(([x, z, l]) => [-1, 1].map((sx) => ({ p: [sx * x * k, (-2.2 - l / 2) * k, z * k], s: [0.7 * k, l * k, 0.7 * k], c: 0xfff4e0 }))),
    { p: [0, -1.6 * k, 7.6 * k], s: [2.2 * k, 0.8 * k, 3 * k], c: 0xffc040, m: 'e' },
  ]);
  const jaw = group(rig.mouth, 0, 0, 0, 0.5);
  sculpt(rig, jaw, [
    { b: S([-1.3, -0.5, -0.4, 1.3, 0.2, 3.8]), col: 0xc8303a, bump: 0, fuzz: 0 },
    { e: S([0, -1, 1.8, 2, 1.1, 2.8]), col: (x, y) => (y > -0.4 * k ? 0x8a1420 : 0xe8c090), bump: 0.04, fuzz: 0.04 },
    { e: S([0, -1.8, 0.6, 2.6, 1.5, 2.4]), col: maneC, fuzz: 0.45 },
  ], { v: 0.8, seed: 37 }, [[1.3, 3.6, 1.6], [1.5, 2.2, 1.1]].flatMap(([x, z, l]) => [-1, 1].map((sx) => ({ p: [sx * x * k, l / 2 * k, z * k], s: [0.7 * k, l * k, 0.7 * k], c: 0xfff4e0 }))));
  // the goat's head, as big as the lion's: a long face and a dark muzzle,
  // yellow eyes with a bar of a pupil, ears out sideways, a white beard,
  // a shaggy ruff and great ridged horns sweeping back and curling round
  const kg = 1.45, SG = (a) => a.map((q) => q * kg);
  const goatMouth = group(goatHead, 0, -2.6 * kg, 6.6 * kg);
  const hornG = (s) => along((t) => { const a = t * Math.PI * 1.3; return SG([s * (1.8 + 2.6 * t), 3.4 + 3.4 * Math.sin(a), 0.4 - 3.8 * (1 - Math.cos(a))]); }, 24, 1.5 * kg, 0.45 * kg, (t) => (Math.floor(t * 23) % 2 ? 0x302327 : 0x42353a));
  sculpt(rig, goatHead, [
    ...[-1, 1].flatMap((sx) => [
      { b: SG([sx * 2.5, 1.2, 3.8, sx * 3.3, 2.2, 5.2]), col: 0xffd020, m: 'e', bump: 0, fuzz: 0 },   // the eyes, out at the sides
      { b: SG([sx * 3.25, 1.55, 4, sx * 3.4, 1.85, 5]), col: 0x140c06, bump: 0, fuzz: 0 },             // the bar pupils
      { e: SG([sx * 2.4, 2.6, 4.2, 1.5, 0.6, 1.4]), col: greyF[1] },                                   // the brow
    ]),
    ...hornG(-1), ...hornG(1),
    { e: SG([0, -0.8, 9.2, 1.6, 1.3, 1]), col: [0x2a2224, 0x3a3034] },                                   // the nose
    { cap: SG([0, 0.8, 3.2, 0, -0.6, 8.8, 2.5, 1.7]), col: tone(greyF, -0.6 * kg, 2.6 * kg, 3.4), bump: 0.06, fuzz: 0.06 },   // the long face
    ...[-1, 1].map((sx) => ({ e: SG([sx * 4.2, 1.6, 1.4, 2.2, 0.7, 1.1]), col: greyF[2] })),                // ears out sideways
    { e: SG([0, 1.4, 1.6, 3.2, 3.4, 3.6]), col: tone(greyF, 1.4 * kg, 3.4 * kg, 3.6) },                       // the skull
    { cap: SG([0, -2.6, 6.2, 0, -7.2, 4.8, 1.4, 0.5]), col: [0xc8c0b4, 0xb4aca0, 0xd8d0c4], fuzz: 0.3 },    // the beard
    { e: SG([0, -1.2, -0.6, 4.2, 4.6, 3.4]), col: greyF, fuzz: 0.32, bump: 0.22 },                          // the ruff
  ], { v: 0.8, seed: 38, bump: 0.1, fuzz: 0.1 }, [
    { p: [0, -0.6 * kg, 6.4 * kg], s: [1.6 * kg, 0.6 * kg, 2.4 * kg], c: 0xffc040, m: 'e' },                    // fire in the mouth
  ]);
  const goatJaw = group(goatMouth, 0, 0, 0, 0.35);
  sculpt(rig, goatJaw, [
    { b: SG([-0.9, -0.3, -0.2, 0.9, 0.2, 2.6]), col: 0xa01820, bump: 0, fuzz: 0 },
    { cap: SG([0, -0.8, -0.4, 0, -0.9, 2.8, 1.3, 1]), col: (x, y) => (y > -0.5 * kg ? 0x7a1220 : greyF[3]), bump: 0.04, fuzz: 0.04 },
  ], { v: 0.8, seed: 39 }, [-1, 1].map((sx) => ({ p: [sx * 0.8 * kg, 0.4 * kg, 2.2 * kg], s: [0.6 * kg, 0.8 * kg, 0.6 * kg], c: 0xf4ecd4 })));
  rig.vd = VD.chimeraTail;   // (the serpent, thin, on a coarser grid)
  rig.extras.goat = goatHead;
  // where the fire comes from: just inside each open mouth
  const fireAt = [group(rig.head, 0, -2.6 * k, 9 * k), group(goatHead, 0, -1.4 * kg, 8 * kg)];
  rig.mouthWorld = (out = new THREE.Vector3(), i = 0) => fireAt[i & 1].getWorldPosition(out);
  // the tail: a diamondback rattlesnake, dark brown with gold diamonds
  // edged in black down its back over a pale belly, rising over the back
  const n = rig.tail.length, seg = rig.spec.tailLen / n, tw = rig.spec.tailW;
  const DB = { base: [0x2a1c1a, 0x3c2826], dia: [0xdfa35b, 0xc88a48, 0xeab470], edge: 0x170e0d, belly: [0xcab08a, 0xb89c78] };   // (the sheet's dark and gold bands)
  const diamond = (r, z0) => (x, y, z, nn, h) => {
    if (y < -r * 0.45) return DB.belly[Math.floor(h * 2)];
    const u = (((z0 - z) / 3.4) % 1 + 1) % 1 - 0.5, v = Math.atan2(x, y) / 1.5, d = Math.abs(u) * 1.7 + Math.abs(v);
    return d < 0.4 ? DB.dia[Math.floor(h * 3)] : d < 0.56 ? DB.edge : DB.base[Math.floor(h * 2)];
  };
  const tr = (i) => tw * 0.62 * (1 - i * 0.06);
  rig.tail.forEach((g, i) => sculpt(rig, g, [{ cap: [0, 0, 0.5, 0, 0, -seg - 0.5, tr(i), tr(i + 1)], col: diamond(tr(i), i * seg), bump: 0.03, fuzz: 0.03 }], { v: 0.9, seed: 120 + i }));
  // the rattlesnake's head on the tip, reared forward over the back: a broad
  // flat wedge, burning yellow eyes, two fangs and a forked red tongue
  const r = tr(n), sn = group(rig.tailTip, 0, 0, -seg, 1.05);
  sculpt(rig, sn, [
    { cap: [0, 0, 0.5, 0, 0.2, -2.6, r, r * 1.1], col: diamond(r, n * seg) },
    { e: [0, 0.4, -4.6, r * 1.6, r * 0.8, 3], col: (x, y, z, nn, h) => (y < -0.1 ? DB.belly[Math.floor(h * 2)] : Math.abs(x) < 0.7 && z < -3 ? DB.dia[0] : DB.base[Math.floor(h * 2)]) },
  ], { v: 0.6, seed: 129 }, [
    ...[-1, 1].flatMap((sx) => [
      { p: [sx * r * 1.05, 1, -5.4], s: [0.7, 0.7, 0.9], c: 0xffc020, m: 'e' },
      { p: [sx * r * 1.15, 1, -5.4], s: [0.2, 0.6, 0.25], c: 0x140808 },
      { p: [sx * 0.9, -0.9, -6.6], s: [0.3, 1.2, 0.3], c: 0xf4ecd4 },
      { p: [sx * 0.16, -0.2, -8.6], s: [0.14, 0.12, 0.9], c: 0xd8203a, r: [0, sx * 0.35, 0] },
    ]),
    { p: [0, -0.2, -7.9], s: [0.2, 0.15, 1.2], c: 0xd8203a },
    { p: [0, 1.4, -4.6], s: [r * 2.2, 0.3, 2], c: DB.edge },
  ]);
  rig.extras.snake = sn;
  // the goat's head follows the lion's (the QuadRig poses rig.head and its
  // jaw), with a little sway of its own
  const ph = Math.random() * 10;
  rig.tick = (dt, e) => {
    animateExtras(rig, dt, e);
    const t = rig.t + ph;
    goatHead.rotation.x = rig.head.rotation.x + Math.sin(t * 1.1) * 0.04;
    goatHead.rotation.y = rig.head.rotation.y * 0.8 + Math.sin(t * 0.8 + 1) * 0.08;
    goatMouth.rotation.x = rig.mouth.rotation.x;
  };
  return rig;
}
