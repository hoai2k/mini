// Cerberus (buildCerberus at the end): his sculpted body, the wolf heads,
// the spiked collars and the serpent tail.
import * as THREE from 'three/webgpu';
import { QuadRig, paintQuad } from '../../quad.js';
import { skinMat, group, fur } from '../../parts.js';
import { sculpt, along, hideSkin, noise } from '../../voxkit.js';
import { VD } from './parts.js';

// ---------------------------------------------------------------- parts
// A shaggy wolf-dog head sculpted on a QuadRig-style head group and its jaw
// (mouth) group: heavy brow, burning eyes, a long muzzle, fangs top and
// bottom, a red mouth that shows when the jaw drops, tall pointed ears.
// Designed at head size 8; k scales it. o: { fur: [..], eye, inner, drool, lava }
function wolfHead(rig, head, mouth, hs, o) {
  const k = hs / 8, S = (a) => a.map((q) => q * k);
  const fur = o.fur, lava = o.lava;
  const furCol = (x, y, z, n, h) => (lava && Math.abs(noise(x * 0.3 / k, y * 0.25 / k, z * 0.3 / k, 77) - 0.5) < 0.028 ? [h < 0.5 ? 0xff2a00 : 0xff5a08, 'e'] : fur[Math.min(fur.length - 1, Math.floor(n * fur.length))]);
  const tooth = 0xf4ecd4;
  sculpt(rig, head, [
    { b: S([-2.9, 0.7, 5.6, -1.1, 1.6, 7]), col: o.eye, m: 'e', bump: 0, fuzz: 0 }, { b: S([1.1, 0.7, 5.6, 2.9, 1.6, 7]), col: o.eye, m: 'e', bump: 0, fuzz: 0 },
    { e: S([-2.7, 5.2, 1.9, 0.9, 1.8, 0.5]), col: o.inner, bump: 0, fuzz: 0 }, { e: S([2.7, 5.2, 1.9, 0.9, 1.8, 0.5]), col: o.inner, bump: 0, fuzz: 0 },
    ...along((t) => [-2.6 - t * 0.8, 3.6 + t * 4.8, 1.2 - t * 0.8].map((q) => q * k), 6, 1.7 * k, 0.45 * k, fur[0]),
    ...along((t) => [2.6 + t * 0.8, 3.6 + t * 4.8, 1.2 - t * 0.8].map((q) => q * k), 6, 1.7 * k, 0.45 * k, fur[0]),
    { e: S([-2.1, 2.5, 5.4, 2, 0.9, 1.5]), col: fur[0], bump: 0.05 }, { e: S([2.1, 2.5, 5.4, 2, 0.9, 1.5]), col: fur[0], bump: 0.05 },
    { b: S([-1.1, -0.2, 10.6, 1.1, 1.3, 11.8]), col: 0x060506, bump: 0, fuzz: 0 },
    { b: S([-1.6, -2.6, 6.2, 1.6, -1.7, 10.6]), col: 0x9a1424, bump: 0, fuzz: 0 },
    { e: S([0, -0.5, 8.3, 2.2, 1.9, 3.6]), col: (x, y, z, n, h) => (y > 0.8 * k ? fur[2 + Math.floor(h * 2)] : furCol(x, y, z, n, h)), bump: 0.06, fuzz: 0.06 },
    { e: S([-3.3, -0.8, 2, 2.5, 3.1, 3.1]), col: furCol, fuzz: 0.4 }, { e: S([3.3, -0.8, 2, 2.5, 3.1, 3.1]), col: furCol, fuzz: 0.4 },
    { e: S([0, 0.9, 2.4, 4, 3.8, 4]), col: furCol },
    { e: S([0, 0.2, -1.2, 5.4, 5.2, 3.2]), col: furCol, fuzz: 0.5, bump: 0.25 },
  ], { v: 0.8 * k, seed: o.seed ?? 5, bump: 0.12, fuzz: 0.12 }, [
    ...[[1.3, 9.8, 1.9], [1.5, 7.9, 1.4], [1.6, 6.6, 1]].flatMap(([x, z, l]) => [-1, 1].map((sx) => ({ p: [sx * x * k, (-2.5 - l / 2) * k, z * k], s: [0.75 * k, l * k, 0.75 * k], c: tooth }))),
    { p: [0, -2.8 * k, 10.4 * k], s: [1.8 * k, 0.6 * k, 0.5 * k], c: tooth },
  ]);
  const jaw = group(mouth, 0, 0, 0, o.gape ?? 0.42);
  sculpt(rig, jaw, [
    { b: S([-1.2, -0.6, -0.6, 1.2, 0.2, 3.8]), col: 0xc8304a, bump: 0, fuzz: 0 },
    { e: S([0, -1, 1.8, 1.9, 1.1, 3]), col: (x, y, z, n) => (y > -0.5 * k ? 0x8a1222 : fur[Math.floor(n * 2)]), bump: 0.04, fuzz: 0.04 },
    { e: S([0, -2, 0.4, 2.6, 1.6, 2.6]), col: fur, fuzz: 0.45 },
  ], { v: 0.8 * k, seed: (o.seed ?? 5) + 1 }, [
    ...[[1.3, 3.8, 1.6], [1.5, 2.1, 1.2]].flatMap(([x, z, l]) => [-1, 1].map((sx) => ({ p: [sx * x * k, l / 2 * k, z * k], s: [0.75 * k, l * k, 0.75 * k], c: tooth }))),
    ...(o.drool ? [[1.1, 3.2, 2.6], [-1.2, 1.6, 1.8], [0.4, 4.2, 1.4]].map(([x, z, l]) => ({ p: [x * k, (-1.6 - l / 2) * k, z * k], s: [0.4 * k, l * k, 0.4 * k], c: 0xdce8f0, m: 'f' })) : []),
  ]);
}
// A gold collar of slabs and cream spikes round an axis pointing along +z, as boxes.
// (spike: the spikes' size; Cerberus at his pass-4 size wears them smaller)
function collarBoxes(r, n, { x = 0, y = 0, z = 0, rx = 0, w = 2.2, spike = 1 } = {}) {
  const B = [], M = new THREE.Matrix4().makeRotationX(rx).setPosition(x, y, z), V = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, seg = 2 * Math.PI * r / n + 0.5;
    V.set(Math.sin(a) * r, Math.cos(a) * r, 0).applyMatrix4(M);
    B.push({ p: [V.x, V.y, V.z], s: [seg, 1.2 * spike, w], c: i % 2 ? 0xd8a032 : 0xc48a26, m: 'm', r: [rx, 0, -a] });
    V.set(Math.sin(a) * (r + 1.3 * spike), Math.cos(a) * (r + 1.3 * spike), 0).applyMatrix4(M);
    B.push({ p: [V.x, V.y, V.z], s: [spike, 2 * spike, spike], c: 0xf0e2b8, m: 'm', r: [rx, 0, -a] });
  }
  return B;
}
// A serpent for a QuadRig's tail (Cerberus): each tail segment sculpted as
// a scaled snake's body, dark green scales in a lattice over a pale belly,
// tapering to a snake's head on the tip with burning eyes, two fangs and a
// forked tongue. The QuadRig curls the chain up over the back (tailCurl),
// so the head rides high and looks forward.
function serpentTail(rig) {
  const segs = rig.tail; if (!segs.length) return;
  const n = segs.length, seg = (rig.spec.tailLen ?? 6) / n, tw = rig.spec.tailW ?? 2;
  const SC = [0x1e3a22, 0x284a2a, 0x335a30], BELLY = [0x9aa070, 0x8a9060];
  const scale = (r) => (x, y, z, nn, h) => {
    if (y < -r * 0.45) return BELLY[Math.floor(h * 2)];                           // belly plates
    const u = Math.floor(z * 1.6), w = Math.floor((Math.atan2(y, x) + Math.PI) * 2.2);
    return (u + w) % 2 ? SC[Math.floor(h * 3)] : 0x14261a;                        // a lattice of scales
  };
  segs.forEach((g, i) => {
    hideSkin(g);
    const r = tw * 0.62 * (1 - i * 0.07);
    sculpt(rig, g, [{ cap: [0, 0, 0.4, 0, 0, -seg - 0.4, r, r * 0.93], col: scale(r), bump: 0.04, fuzz: 0.04 }], { v: 0.9, seed: 120 + i });
  });
  // the snake's neck rears up and over from the tip, so its head looks
  // forward over Cerberus's back, the way a cobra rears
  const r = tw * 0.62 * (1 - (n - 1) * 0.07), nk = group(rig.tailTip, 0, 0, -seg, 1.1);
  sculpt(rig, nk, [{ cap: [0, 0, 0.4, 0, 0, -3.2, r * 0.95, r * 0.9], col: scale(r), bump: 0.04, fuzz: 0.04 }], { v: 0.9, seed: 129 });
  const hd = group(nk, 0, 0, -3.2, 1.1);
  sculpt(rig, hd, [
    { e: [0, 0.2, -1.6, r * 1.25, r * 0.85, 2.4], col: scale(r * 1.1), bump: 0.04, fuzz: 0.04 },
    { e: [0, -0.5, -2.2, r * 1.05, r * 0.45, 2.1], col: BELLY, bump: 0.02, fuzz: 0.02 },
  ], { v: 0.6, seed: 131 }, [
    ...[-1, 1].flatMap((sx) => [
      { p: [sx * r * 0.85, 0.7, -2.1], s: [0.5, 0.55, 0.8], c: 0xffc020, m: 'e' },   // burning eyes
      { p: [sx * r * 0.92, 0.7, -2.2], s: [0.2, 0.5, 0.25], c: 0x140808 },
      { p: [sx * r * 0.45, -0.9, -3.4], s: [0.22, 0.9, 0.22], c: 0xf4ecd4 },         // fangs
      { p: [sx * 0.14, -0.35, -4.6 - 0.35], s: [0.12, 0.1, 0.7], c: 0xd8203a, r: [0, sx * 0.35, 0] },   // the forked tongue
    ]),
    { p: [0, -0.35, -4.2], s: [0.16, 0.12, 0.9], c: 0xd8203a },
    { p: [0, 1, -3.2], s: [r * 1.6, 0.25, 1.4], c: 0x14261a },                         // a dark brow ridge
  ]);
  rig.extras.serpent = hd;
}
// Cerberus's body (after vox-bosses-1: a giant's body that dominates its
// three heads), sculpted muscle by muscle on
// a QuadRig of body 19 x 12 x 22: a deep, broad chest with two pectorals
// over the front legs, heavy shoulder blades and triceps, a shaggy ridge of
// hackles over the withers, a barrel of ribs, a waist tucked up, round
// haunches and a rump; thick legs, the front ones straight and columnar, the
// hind ones bent at the stifle and hock, on great splayed paws with long
// cream claws. Each mass is shaded from dark underneath to lighter on top,
// so the muscles read against each other. o: { fur: [5 tones dark to light], seed }
function cerberusBody(rig, o) {
  const { legH, legW } = rig.dims, F = o.fur, seed = o.seed ?? 9;
  // a mass shaded by height within it, with noise: muscle against muscle;
  // thin seams of magma wander through it (o.magma), a glowing orange-yellow
  // core in a deep red rim, both on the glow material
  const magma = (x, y, z) => { if (!o.magma) return null; const d = Math.abs(noise(x * 0.2, y * 0.17, z * 0.2, 78) - 0.5); return d < 0.012 ? [0xffa020, 'e'] : d < 0.02 ? [0x6a1006, 'e'] : null; };
  const mass = (cy, ry, base = 2) => (x, y, z, n) => magma(x, y, z) ?? F[Math.max(0, Math.min(F.length - 1, Math.round(base + 1 + (y - cy) / ry * 1.7 + (n - 0.5) * 1.6)))];
  const E = (cx, cy, cz, rx, ry, rz, extra = {}) => ({ e: [cx, cy, cz, rx, ry, rz], col: mass(cy, ry, extra.base), ...extra });
  hideSkin(rig.torso);
  const both = (f) => [-1, 1].flatMap(f);
  sculpt(rig, rig.torso, [
    // (the sheet's massive hump over the shoulders, the back
    // sloping from it down to a lower rump, the belly tucked well up)
    E(0, 8.6, 4.5, 3.2, 1.7, 5, { base: 1.4, fuzz: 0.6, bump: 0.35 }),                   // hackles on the hump
    E(0, 6.6, 5, 5.8, 3.2, 6.2, { base: 2.2, fuzz: 0.4 }),                               // the hump over the withers
    ...both((s) => [E(s * 6.2, 4, 6.5, 4.3, 5.8, 5.2, { base: 2.4 })]),                   // shoulder blades
    ...both((s) => [E(s * 7.2, -2.4, 7.4, 3.4, 4.6, 4.2, { base: 2 })]),                  // triceps
    ...both((s) => [E(s * 3.4, -2.6, 10, 3.6, 5, 3.4, { base: 2.2 })]),                   // pectorals
    E(0, 0, 6.5, 8.2, 7.4, 6.5, { base: 2, fuzz: 0.3 }),                                 // the deep chest
    E(0, 1.4, -1.5, 7.4, 6, 6, { base: 2, fuzz: 0.25 }),                                 // the barrel of ribs
    E(0, 2.4, -6, 5.8, 4.2, 4, { base: 1.8 }),                                           // the waist, tucked up
    ...both((s) => [E(s * 5.2, 0.8, -8.2, 4.4, 5, 4.8, { base: 2.3 })]),                  // haunches
    E(0, 1.4, -9.6, 6, 4.2, 3.4, { base: 2.2 }),                                         // the rump, lower
    E(0, -4.6, 6, 6, 3, 6, { base: 0.6, fuzz: 0.5 }),                                    // shag under the chest
  ], { v: 1, seed, bump: 0.14, fuzz: 0.14 });
  const claw = 0xe8dcc0;
  for (const leg of rig.legs) {
    hideSkin(leg);
    const front = leg.userData.row === 0, s = leg.userData.side;
    sculpt(rig, leg, front ? [
      { cap: [0, 2.4, 0.4, 0, -4.4, -0.6, 3.3, 2.7], col: mass(-1, 4.5, 2), fuzz: 0.25 },   // upper arm
      { cap: [0, -4.2, -0.5, 0, -8.6, 0.3, 2.5, 2.1], col: mass(-6.5, 3, 1.6), fuzz: 0.2 },   // forearm
      { e: [0, -6, -2.1, 1.6, 2.6, 1], col: F, fuzz: 0.6, bump: 0.3 },                         // feathering at the back
    ] : [
      { e: [0, -0.4, 0.6, 2.9, 4.6, 3.8], col: mass(-0.4, 4.6, 2.2), fuzz: 0.25 },            // thigh
      { cap: [0, -3.6, -0.4, 0, -6.4, -2.4, 2.4, 1.8], col: mass(-5, 2.5, 1.7), fuzz: 0.2 },  // gaskin
      { cap: [0, -6.4, -2.4, 0, -9, -0.6, 1.8, 1.7], col: mass(-7.7, 2, 1.4), fuzz: 0.15 },   // hock and cannon
    ], { v: 1.05, seed: seed + 3 + leg.userData.row });
    // the paw, level though the leg leans out (QuadRig stance)
    const paw = group(leg, 0, -legH - legW * 0.2, 0, 0, 0, -(rig.spec.stance ?? 0) * s);
    sculpt(rig, paw, [
      { e: [0, 1.4, front ? 1 : 0.7, 3.3, 1.6, 3.3], col: mass(1.4, 1.6, 2.2), bump: 0.1, fuzz: 0.1 },
      ...[-1.6, -0.55, 0.55, 1.6].map((dx) => ({ e: [dx * 1.3, 0.95, (front ? 3.7 : 3.4) - Math.abs(dx) * 0.35, 0.85, 1, 1.2], col: mass(0.95, 1, 2.6), bump: 0.05, fuzz: 0.05 })),
    ], { v: 0.7, seed: seed + 7 }, [-1.6, -0.55, 0.55, 1.6].map((dx) => ({ p: [dx * 1.3, 0.55, (front ? 5.2 : 4.9) - Math.abs(dx) * 0.35], s: [0.5, 1, 1.9], c: claw, r: [0.55, 0, 0] })));
  }
}

// Cerberus: three huge black heads with burning eyes, red mouths, drool and
// gold spiked collars on one enormous body, and a serpent for a tail.
// After vox-bosses-1 the body is far bigger than its heads, broad and deep,
// crouched on thick legs planted wide; after the book ("twice the size of a
// woolly mammoth") he towers over every hellhound, the alpha and Shadowfang
// too: about 7.75 blocks tall at rest (3.5 Percys, 1.2 Shadowfangs), 8.6 wide
// and 13 long, tail included. bosses.js and bosses-book1.js size his stats
// and attacks to match.
export function buildCerberus() {
  const m = skinMat('boss_cerberus', (S) => paintQuad(S, { base: 0x1e1c26, dark: 0x0e0d14, belly: 0x2a2834, back: 0x16141c, eye: 0xff4a0a, eyeLow: 0xffa02a, nose: 0x050505, speckles: 50, brow: 0x0a0a10, teeth: 0xfff4e0,
    custom: (s) => { fur(s, 0, 16, 40, 20, 90, 0x0a0a10, 0x3a3848); fur(s, 0, 0, 32, 16, 30, 0x0a0a10, 0x3a3848); s.box(48, 0, 4, 2, 4, 0xa82030, 0.1); s.rect(52, 4, 4, 1, 0xf4f0e0, 0); s.rect(36, 6, 4, 2, 0xc8283a, 0.1); s.box(52, 16, 2, 3, 1, 0x8a2a3a, 0.1); } }), { emit: 3 });
  const rig = new QuadRig({ material: m, scale: 6.1, bodyL: 22, bodyW: 19, bodyH: 12, legH: 9, legW: 5.6, legY: 1, legSpread: 1.6, stance: 0.2, legsOnTorso: true, headS: 6, ears: true, tail: 6, tailLen: 22, tailW: 2.6, tailCurl: 0.3, gait: 0.6, neckUp: 0, headZ: 2.2 });   // (the heads carried low and forward, under the hump)
  const { W, H, L } = rig.dims;
  rig.vd = VD.cerberus; rig.merge = true;
  const furs = [0x0c0b12, 0x15131d, 0x1e1b28, 0x2a2636, 0x3a3448];
  cerberusBody(rig, { fur: [0x08070c, ...furs, 0x4c4660], seed: 51, magma: true });   // (two more tones, so the muscles read)
  const heads = [];
  for (const side of [-1, 0, 1]) {
    let neck, head, mouth;
    const hs = side ? 5.6 : 6;   // (heads in a giant dog's proportion, the body dominating)
    if (side === 0) { neck = rig.neck; head = rig.head; mouth = rig.mouth; hideSkin(head, mouth); }
    else {
      neck = group(rig.torso, side * W * 0.36, H * 0.3 - 0.8, L / 2 + 0.4, 0, side * 0.5, side * -0.15);
      head = group(neck); mouth = group(head, 0, -hs * 0.42, hs * 0.75);
    }
    rig.vd = VD.cerberusHead;   // (the heads, where the eye goes, at a finer grid than the body)
    wolfHead(rig, head, mouth, hs, { fur: furs, eye: 0xe84a08, inner: 0xa0182a, drool: true, seed: 60 + side * 3 });
    rig.vd = VD.cerberus;
    // a thick shaggy neck rising out of the chest, and a gold spiked collar
    const nr = side ? 3.3 : 3.6;
    sculpt(rig, neck, [{ cap: [0, -4.4, -5, 0, -0.4, 0.6, nr * 1.2, nr], col: furs, fuzz: 0.4, bump: 0.2 }], { v: 1, seed: 70 + side }, collarBoxes(nr + 0.7, 14, { y: -1.4, z: -0.6, rx: -0.6, w: 1.4, spike: 0.6 }));
    heads.push({ neck, head, mouth, side, act: 0 });
  }
  rig.extras.heads = heads;
  serpentTail(rig);
  return rig;
}
