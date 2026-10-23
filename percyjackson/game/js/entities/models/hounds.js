// Hellhounds and hellhound pups: the lava-cracked skin, the specs
// (HELLHOUND, PUP) and the builders (hound, bigHound, bigPup).
import { QuadRig, paintQuad } from '../quad.js';
import { skinMat, group, lavaCracks, fur } from '../parts.js';
import { kit, dropMeshes, BUILD } from '../voxkit.js';

// ---- skins --------------------------------------------------------------------
// soot-black dog with lava cracks; the glowing jaw shows when it snarls
// (The coat's darks: the source sheet's coat is near-black, RGB 8-47, and the
// open world's distance fog, the dielectric sheen of a near-black albedo and
// its flat hemisphere fill would lift it to a grey. So the coat palette is
// HOUND_DIM of its base tones, in the same hues and the same spread of tones
// so the clumps read, and the coat is matt (roughness 1) with a metalness that
// swaps some of the diffuse fill for a dark reflection of the albedo. The
// magma, eyes and teeth keep their full colour.)
const HOUND_DIM = 0.75, HOUND_ROUGH = 1, HOUND_METAL = 0.2;
const houndSurface = (mat) => { mat.roughness = HOUND_ROUGH; mat.metalness = HOUND_METAL; return mat; };
const dim = (c, k = HOUND_DIM) => { const r = Math.round(((c >> 16) & 255) * k), g = Math.round(((c >> 8) & 255) * k), b = Math.round((c & 255) * k); return (r << 16) | (g << 8) | b; };
const lavaDog = (o) => (S) => paintQuad(S, { base: dim(o.base ?? 0x221d20), dark: 0x0e0c0e, belly: dim(0x2c2428), back: dim(0x161214), eye: 0xff2a0a, eyeLow: 0xffa040, nose: 0x050505, speckles: 40, brow: 0x0a0808, teeth: 0xfff0d0,
  custom: (s) => {
    fur(s, 0, 16, 40, 20, 60, 0x0a0808, dim(0x3a3034));
    lavaCracks(s, 0, 16, 40, 20, o.cracks ?? 8, [0xd83a0a, 0xff6a1a]); lavaCracks(s, 40, 16, 12, 11, Math.round((o.cracks ?? 8) / 6), [0xd83a0a, 0xff6a1a]);
    s.box(48, 0, 4, 2, 4, 0x3a0c08, 0.2); s.rect(52, 4, 4, 1, 0xff6a1a, 0); s.rect(36, 7, 4, 1, 0xff6a1a, 0);
    s.box(52, 16, 2, 3, 1, 0x0e0c0e, 0.1); s.rect(53, 18, 1, 2, 0x3a0c0a, 0.1);
  } });

// ---- model builders ----------------------------------------------------------
// The full hellhound (bigHound below): built at rig scale 1.18, the heroes'
// own voxel size (Percy's root scale is 0.944 = 1.18 x CHAR_SCALE), its dims
// in skin pixels (Percy stands about 40 of them tall).
// A powerful crouching dog, not a lean column (vox-enemies): the trunk is
// wider than the head and longer, with a deep chest; short, thick legs
// planted wide, leaning a little outward at rest (stance); the leg roots sit
// deep in the body (legY) and hang from the torso (legsOnTorso), so a hind
// leg never parts from the haunch however the body pitches in a walk, a run
// or a bite.
export const HELLHOUND = { big: true, scale: 1.18, bodyL: 60, bodyW: 34, bodyH: 36, legH: 39, legW: 10, legY: 10, legSpread: 2.5, stance: 0.12, legsOnTorso: true, headS: 19, snoutS: 14, ears: true, tail: 6, tailLen: 36, tailW: 4.8, tailCurl: 0.8, gait: 0.5, neckUp: 13, headZ: -3, jawOpen: 0.42 };
// The hellhound pup (bigPup below): a puppy the way Mrs O'Leary is one, so it
// stands taller than a person, though well under a grown hellhound. Built at the heroes' voxel
// size like the hellhound, with a puppy's proportions: a round barrel of a
// body, short thick legs on oversized paws, a big head with a short muzzle,
// ears that fold over at the tips and a stubby tail held high.
export const PUP = { big: true, pup: true, scale: 1.18, bodyL: 26, bodyW: 20, bodyH: 16, legH: 19, legW: 8, legY: 4, legSpread: 1.5, stance: 0.08, legsOnTorso: true, headS: 17, snoutS: 8, ears: true, tail: 3, tailLen: 14, tailW: 5, tailCurl: 0.75, gait: 0.75, neckUp: 5, headZ: 0, jawOpen: 0.3 };
// Hellhounds (vox-enemies, left): soot-black shaggy fur in chunky clumps,
// a hump of hackles over heavy shoulders, glowing lava cracks, a furnace in
// the open jaws with long fangs, burning eyes under a heavy brow, big paws
// with gold claws, a gold spiked collar and a smouldering tail tip.
const FUR = [0x2a2226, 0x352b30, 0x43363c, 0x1e181b, 0x50404a].map((c) => dim(c));
const LAVA = [0xff7000, 0xffa800];
export function hound(id, spec, opts = {}) {
  if (spec.big) return spec.pup ? bigPup(id, spec, opts) : bigHound(id, spec, opts);
  const { fur: nFur = 80, cracks = 8, collar = true, pup = false } = opts;
  const mat = skinMat(id, (S) => { lavaDog({ cracks, base: 0x2e2529 })(S); S.saturate(1.3); }, { emit: 0.5 });
  const rig = new QuadRig({ material: mat, ...spec });
  const K = kit(rig, mat, { seed: pup ? 5 : 9, emit: 0.55 });
  const { L, W, H, legH, legW, hs } = rig.dims;
  const T = rig.torso;
  // coat: clumps all over, a shoulder hump and a ruff round the neck
  const st = pup ? 1.4 : 1.6;
  K.shag(T, [0, 0, -0.5], [W, H, L - 1], { cols: FUR, step: st, len: pup ? [1.4, 2.4] : [1.8, 3.2], low: 0.75, ember: pup ? 0.2 : 0.25, embers: LAVA });
  // a hump of longer hackles over the shoulders and a ruff round the neck
  K.shag(T, [0, H / 2 + 0.8, L * 0.2], [W * 0.85, 1.6, L * 0.45], { cols: FUR, step: st, len: pup ? [1.8, 3] : [2.4, 4], low: 1, bristle: 0.7 });
  K.shag(T, [0, H * 0.05, L / 2 - 1.2], [W + 1.4, H + 1.2, 2.4], { cols: FUR, step: st, len: [2.2, 3.6], low: 1, w: 1.3, top: false });
  K.clumps(T, [0, -H * 0.15, L / 2 + 0.2], [W + 0.6, H * 0.7, 1], { n: Math.round(nFur * 0.12), size: [1.2, 2], cols: FUR, faces: 'f' });
  K.cracks(T, [0, -H * 0.15, 0], [W + 0.2, H * 0.6, L - 1], { n: cracks, cols: LAVA, faces: 'lr', len: [4, 9], cell: 0.6 });
  // hackles: a crest of angled spikes down the spine, ember-tipped
  const nh = pup ? 4 : 6;
  for (let i = 0; i < nh; i++) {
    const z = L / 2 - 2 - i * (L - 3) / nh, h = (pup ? 2 : 3.2) * (1 - i * 0.1);
    K.box(T, 0, H / 2 + 1 + h / 2, z, 1.4, h, 1.6, FUR[i % 3], -0.5);
    if (i % 2 === 0) K.box(T, 0, H / 2 + 1.2 + h, z - h * 0.5, 0.8, 0.8, 0.8, LAVA[1], -0.5);
    for (const sx of [-1, 1]) K.box(T, sx * 1.4, H / 2 + 0.6 + h * 0.3, z + 0.4, 1, h * 0.7, 1.2, FUR[(i + 1) % 4], -0.6, 0, sx * 0.35);
  }
  // head: heavy brow, burning eyes, cheek tufts, fangs and a glowing maw
  const Hd = rig.head, hz = hs * 0.35, front = hz + hs / 2;
  const sn = spec.snoutS ?? hs * 0.5, sy = -hs * 0.18, sz = hs * 0.85 + sn * 0.5;
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * hs * 0.24, hs * 0.2, front + 0.4, hs * 0.42, 1.1, 1, 0x0a0708, 0, 0, sx * 0.3);
    K.box(Hd, sx * hs * 0.24, hs * 0.04, front + 0.05, 1.5, 0.9, 0.3, 0xff3000);
    K.box(Hd, sx * hs * 0.2, hs * 0.04, front + 0.12, 0.6, 0.6, 0.3, 0xffb000);
  }
  K.clumps(Hd, [0, 0, hz - 0.5], [hs, hs, hs - 1], { n: pup ? 18 : 30, size: [1, 1.8], cols: FUR, faces: 'lrtk' });
  K.clumps(Hd, [0, -hs * 0.2, hz + 0.5], [hs + 1.5, hs * 0.5, 2], { n: pup ? 8 : 14, size: [1.2, 2], cols: FUR, faces: 'lrb' });
  K.box(Hd, 0, sy + sn * 0.375 + 0.2, sz + sn / 2 - 0.6, sn * 0.6, 0.6, 1.3, 0x050404);       // nose
  K.box(Hd, 0, sy + sn * 0.375 + 0.3, sz - 0.8, sn * 0.5, 0.6, sn * 0.9, FUR[0]);            // muzzle bridge
  for (const sx of [-1, 1]) K.box(Hd, sx * (sn / 2 + 0.2), sy - sn * 0.1, sz - 0.4, 0.4, 0.5, sn * 0.8, LAVA[0]);   // the furnace glows through the lips
  const pal = sy - sn * 0.375;
  K.box(Hd, 0, pal - 0.1, sz, sn * 0.8, 0.3, sn * 0.9, 0xff5000);                            // the furnace inside
  const fang = 0xe6dcc0;
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * (sn / 2 - 0.45), pal - 0.9, sz + sn / 2 - 0.5, 0.7, pup ? 1.4 : 2, 0.7, fang);
    for (let i = 1; i < 3; i++) K.box(Hd, sx * (sn / 2 - 0.4), pal - 0.4, sz + sn / 2 - 0.5 - i * 1.1, 0.5, 0.9, 0.5, fang);
  }
  const M = rig.mouth;
  K.box(M, 0, -sn * 0.17 + sn * 0.175 + 0.12, sn * 0.5, sn * 0.75, 0.3, sn * 0.85, 0xff6a00);
  for (const sx of [-1, 1]) { K.box(M, sx * (sn * 0.45 - 0.45), sn * 0.1 + 0.7, sn - 0.5, 0.6, pup ? 1.2 : 1.6, 0.6, fang); K.box(M, sx * (sn * 0.45 - 0.4), sn * 0.1 + 0.4, sn - 1.6, 0.5, 0.8, 0.5, fang); }
  K.clumps(M, [0, -sn * 0.17, sn * 0.45], [sn * 0.9, sn * 0.35, sn * 0.8], { n: pup ? 4 : 8, size: [0.9, 1.5], cols: FUR, faces: 'blr' });
  // legs: shaggy tops, cracked shins, big paws with gold claws
  for (const leg of rig.legs) {
    K.shag(leg, [0, -legH * 0.15, 0], [legW, legH * 0.5, legW], { cols: FUR, step: 1.4, len: [1.4, 2.4], low: 0.9, top: false, sweep: 0.2 });
    K.cracks(leg, [0, -legH * 0.55, 0], [legW + 0.2, legH * 0.7, legW + 0.2], { n: pup ? 2 : 3, cols: LAVA, faces: 'lrf', len: [2, 4] });
    K.box(leg, 0, -legH + 0.9, 0.2, legW + 0.4, 1.8, legW + 0.4, FUR[1]);
    for (const dx of [-1, 0, 1]) K.box(leg, dx * (legW + 0.4) * 0.34, -legH + 0.6, legW / 2 + 0.6, (legW + 0.4) * 0.3, 1.2, 1.4, FUR[0]);
    for (const dx of [-1, 0, 1]) K.box(leg, dx * (legW + 0.4) * 0.34, -legH + 0.4, legW / 2 + 1.2, 0.55, 0.8, pup ? 0.8 : 1.1, 0xe0a428);
  }
  // tail: shaggy, with a smouldering tip
  for (const [i, seg] of rig.tail.entries()) K.clumps(seg, [0, 0, -(spec.tailLen / spec.tail) / 2], [spec.tailW, spec.tailW, spec.tailLen / spec.tail], { n: pup ? 5 : 8, size: [0.9, 1.6 - i * 0.1], cols: FUR, faces: 'tlrb' });
  const tip = rig.tailTip, tl = spec.tailLen / spec.tail;
  K.box(tip, 0, 0, -tl - 0.6, 1.6, 1.6, 1.6, LAVA[0]); K.box(tip, 0, 0.6, -tl - 1.4, 1, 1.2, 1, LAVA[1]); K.box(tip, 0.4, 1.4, -tl - 1.2, 0.6, 1, 0.6, 0xffc040);
  // gold spiked collar round the neck
  if (collar) {
    const r = hs * 0.72, n = 14, g = group(rig.neck, 0, -1.2, 0.6, -0.3);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, x = Math.sin(a) * r, y = Math.cos(a) * r;
      K.box(g, x, y, 0, 2 * Math.PI * r / n + 0.5, 1.4, 1.8, i % 2 ? 0xd09418 : 0xf0b428, 0, 0, -a);
      if (y < r * 0.6) K.box(g, Math.sin(a) * (r + 1.2), Math.cos(a) * (r + 1.2), 0, 0.9, 2, 0.9, 0xf8d870, 0, 0, -a);
    }
  }
  K.done();
  return rig;
}
// The full-size hellhound (vox-enemies, middle row: "as big as a truck",
// well over twice Percy's height). Not the pup scaled up: built at
// the heroes' voxel size (rig scale 1.18, so one block is one hero skin pixel)
// from many small blocks, so its size buys detail. A powerful crouching dog
// with a deep, broad chest and heavy shoulders, ribs showing down the flank, a
// hackled mane of black fur breaking into smoke along the spine, a big head
// with a massive furnace jaw and long fangs, molten eyes under a scowling
// brow, ember cracks all over, thick clawed paws with glowing amber claws,
// a smouldering tail. (No smoke puffs at the jaws: they read as a nose
// sticking out and wiggling; the smoke aura, enemy.js, carries the smoke.)
// spec: HELLHOUND (big: true); opts as hound(). rig.dims match the QuadRig,
// so the champions' add-ons (Shadowfang's collar, scars, eyes) still land.
const DEEP = [0x1a1518, 0x231d21, 0x2c252a].map((c) => dim(c)), SMOKE = [0x3a3438, 0x4e474c, 0x645c62];
// (the cracks are glowing magma, a bright orange-yellow core in a deep
// red rim, both emissive (VoxKit cracks rim), drawn a little proud of the fur)
const MAGMA = [0xff9a10, 0xffc030], MAGMA_RIM = 0xff2200;
function bigHound(id, spec, { fur: nFur = 170, cracks = 14, collar = true, alpha = false } = {}) {
  const mat = skinMat(id, (S) => { lavaDog({ cracks, base: 0x2e2529 })(S); S.saturate(1.3); }, { emit: 0.5 });
  houndSurface(mat);
  const rig = new QuadRig({ material: mat, ...spec });
  const K = kit(rig, mat, { seed: 9 + (id.length % 7), emit: 1.2, rough: HOUND_ROUGH, metal: HOUND_METAL });
  const RK = kit(rig, mat, { seed: 77, emit: 0.4, fill: 0 });   // (the magma's deep red rims: a low emit keeps them red under the tone mapping)
  const { legH, legW, hs } = rig.dims, T = rig.torso, Hd = rig.head, M = rig.mouth, N = rig.neck, ly = legH / 34;
  for (const g of [T, Hd, M, ...rig.legs, ...rig.tail]) dropMeshes(rig, g);
  // the coat's budget: a hound built bigger (a champion or the alpha, parts.js
  // BUILD.k) has its tufts and clumps made finer by the kit, which alone
  // would cost k squared in blocks; here the count grows with k only, so an
  // elite stays near 19k triangles and a champion under 25k
  const D = BUILD.k, fe = nFur / 170 * 0.6 / D, ss = 1.3 * Math.sqrt(D), fang = 0xe6dcc0, claw = 0xe0a428;
  // a limb segment from a to b ([y, z] in the part's frame), tilted about x
  // coat a limb segment with short blocky fur, so no face is left flat
  const FURL = [...FUR, dim(0x5a4a54)];
  const seg = (p, a, b, w, d, col, coat = 1) => {
    const y = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, l = Math.hypot(a[0] - b[0], a[1] - b[1]) + w * 0.3, rx = Math.atan2(a[1] - b[1], a[0] - b[0]);
    K.box(p, 0, y, z, w, l, d, col, rx);
    const n = Math.round(l * (w + d) * 0.13 * coat * D), c = Math.cos(rx), sn = Math.sin(rx);
    for (let i = 0; i < n; i++) {
      const f = K.r(), u = (K.r() - 0.5) * l, sz = (1 + K.r() * 1.1) / Math.sqrt(D);
      let x = (K.r() - 0.5) * w, zz = (K.r() - 0.5) * d;
      if (f < 0.35) x = Math.sign(x || 1) * (w / 2 + 0.15); else if (f < 0.65) zz = Math.sign(zz || 1) * (d / 2 + 0.15); else if (f < 0.85) x = -w / 2 - 0.15; else x = w / 2 + 0.15;
      K.box(p, x, y + u * c - zz * sn, z + u * sn + zz * c, sz, sz * 1.4, sz, K.tone(FUR, 0.16), rx);
    }
  };
  // ---- trunk (body 34 x 36 x 60): a deep, broad chest over the front
  // legs, ribs down the flank, a waist only a little tucked and heavy
  // haunches round the hind legs' roots
  // (wider than the head, long and deep in the chest, as vox-enemies draws
  // it; the haunch reaches well below the hind legs' roots,
  // QuadRig legY, so the thigh always enters the body)
  K.box(T, 0, 1, 14, 34, 34, 30, DEEP[1]);           // chest and shoulders
  K.box(T, 0, -14.5, 22, 25, 9, 12, DEEP[0]);        // the brisket
  K.box(T, 0, 3, -6, 31, 29, 14, DEEP[1]);           // ribcage
  K.box(T, 0, 5, -14, 27, 25, 6, DEEP[2]);           // waist
  K.box(T, 0, 3, -23, 31, 30, 14, DEEP[1]);          // haunches
  rig.extras.trunk = { chest: [-17, -16, -1, 17, 18, 29], haunch: [-15.5, -12, -30, 15.5, 18, -16] };   // (skin px, torso space: perf/houndlegs.cjs checks the legs stay rooted in them)
  for (const sx of [-1, 1]) {
    K.clumps(T, [sx * 17.2, 7, 15], [2, 18, 16], { n: Math.round(26 * fe), size: [2, 3.2], cols: FURL, faces: sx < 0 ? 'l' : 'r', out: 0.3, stretch: [1, 1.2, 1] });   // shoulder blade
    K.clumps(T, [sx * 17.2, -7, 21], [2.4, 14, 11], { n: Math.round(18 * fe), size: [2, 3.2], cols: FURL, faces: sx < 0 ? 'l' : 'r', out: 0.3 });              // upper-arm muscle
    for (let i = 0; i < 5; i++) {                     // ribs, with embers glowing between them
      K.box(T, sx * 15.9, 3 - i * 0.3, 0 - i * 2.3, 1, 18 - i * 1.6, 1.4, FUR[4]);
      if (i % 2 === 0) K.box(T, sx * 15.65, 1.6 - i * 0.2, -1.1 - i * 2.3, 0.4, 8 - i, 0.6, LAVA[i % 4 ? 1 : 0]);
    }
    K.clumps(T, [sx * 15.6, 2, -23], [1.6, 20, 12], { n: Math.round(22 * fe), size: [1.8, 3], cols: FURL, faces: sx < 0 ? 'l' : 'r', out: 0.3 });     // haunch muscle
  }
  K.shag(T, [0, 1, 14], [34, 34, 30], { cols: FUR, step: 2.9 * ss, len: [2.4, 4.2], w: 1.3, low: 0.8, ember: 0.08, embers: LAVA, top: false });
  K.shag(T, [0, 3, -6], [31, 29, 14], { cols: FUR, step: 2.5 * ss, len: [1.4, 2.4], low: 0.3, top: false, sweep: 0.5 });
  K.clumps(T, [0, 3, -6], [31, 29, 14], { n: Math.round(20 * fe), size: [1, 1.8], cols: FURL, faces: 'lrb', out: 0.2 });
  K.shag(T, [0, 3, -23], [31, 30, 14], { cols: FUR, step: 2.5 * ss, len: [1.8, 3], low: 0.75, sweep: 0.4, bristle: 0.9 });
  K.clumps(T, [0, -2, 29], [30, 28, 1], { n: Math.round(46 * fe), size: [1.8, 3], cols: FUR, faces: 'f', stretch: [1, 1.5, 1] });   // chest ruff
  for (let z = 2; z < 28; z += 3.4) for (let x = -14; x <= 14; x += 5.6) {                                 // fringe hanging under the chest
    const l = 2.5 + K.r() * 3.5, y0 = z > 15.5 && Math.abs(x) < 12.5 ? -19 : -16; K.box(T, x + (K.r() - 0.5), y0 - l / 2 + 1.2, z, 2.2, l, 2.2, K.tone(FUR), 0.3);
  }
  // lava veins drawn over the fur (the source sheet's cracks read from afar)
  K.cracks(T, [0, -1, 14], [38, 33, 34], { n: Math.round(cracks * 2), cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lrf', len: [7, 14], cell: 1 });
  K.cracks(T, [0, 3, -6], [35, 24, 14], { n: Math.round(cracks * 0.8), cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lr', len: [5, 9], cell: 0.9 });
  K.cracks(T, [0, 3, -23], [35.5, 26, 17.5], { n: Math.round(cracks * 1.1), cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lrk', len: [5, 10], cell: 0.9 });
  for (let z = 4; z < 27; z += 3) K.box(T, (K.r() - 0.5) * 8, z > 15.5 ? -19.2 : -16.2, z, 4 + K.r() * 7, 0.4, 0.8, LAVA[K.r() < 0.3 ? 1 : 0]);   // the furnace glows under the chest
  // ---- the mane: hackles down the spine, tallest over the shoulders, breaking into smoke
  const topAt = (z) => (z > -1 ? 18 : 17.5);
  for (let z = 29; z > -28; z -= 2.2) {
    const k = Math.max(0.35, 1 - Math.abs(z - 14) / 36), top = topAt(z);
    for (const sx of [-1, 0, 1]) {
      const h = (sx ? 5 : 8.5) * k + K.r() * 2.5, x = sx * 2.4 + (K.r() - 0.5) * 0.8, lean = -0.6 - K.r() * 0.2;
      K.box(T, x, top + h / 2 - 0.8, z, 1.7, h, 1.9, K.tone([DEEP[0], DEEP[1], FUR[3]]), lean, 0, sx * 0.45);
      const tx = x + sx * h * 0.4, ty = top + h * 0.95, tz = z - h * 0.55;
      if (K.r() < 0.45) K.box(T, tx, ty, tz, 1.3, 1.3, 1.3, K.tone(SMOKE));
      else if (K.r() < 0.25) K.box(T, tx, ty - 0.4, tz, 0.8, 0.9, 0.8, LAVA[K.r() < 0.4 ? 1 : 0]);
    }
    if (K.r() < 0.4) { const s = 1.2 + K.r() * 1.4; K.box(T, (K.r() - 0.5) * 4, top + 9 * k + 2 + K.r() * 5, z - 3, s, s, s, K.tone(SMOKE)); }   // smoke rising off it
  }
  // the alpha (the boss, bossmodels.js): a burning ridge of horn spikes down
  // its back, each split by a seam of fire and tipped with flame
  if (alpha) for (let i = 0; i < 9; i++) {
    const z = 26 - i * 5.8, h = (9 - Math.abs(i - 2) * 0.9) * (1 - i * 0.04), top = topAt(z) + 1;
    K.box(T, 0, top + h / 2, z, 2.6, h, 3, DEEP[0], -0.55);
    K.box(T, 0, top + h / 2 + 0.4, z + 0.2, 2.7, h * 0.7, 0.5, LAVA[0], -0.55);
    K.box(T, 0, top + h * 0.98, z - h * 0.52, 1.4, 1.8, 1.4, LAVA[1], -0.55);
    K.box(T, 0, top + h * 1.12, z - h * 0.66, 0.8, 1.2, 0.8, 0xffd040, -0.55);
  }
  // ---- neck: thick and short, rising from the chest, with a shaggy ruff;
  // the head is carried high over the chest, as the sheet draws it
  K.box(N, 0, -7, -4, 18, 22, 16, DEEP[1], 0.2);
  K.clumps(N, [0, -7, -4], [17, 22, 16], { n: Math.round(70 * fe), size: [1.8, 3.4], cols: FUR, faces: 'lrtb', stretch: [1, 1.4, 1.2] });
  if (collar) {
    // (a heavy ring standing proud of the neck's ruff, so the gold
    // spikes read all round as on the sheet)
    const r = 11.4, n = 20, g = group(N, 0, -5.5, 1.5, -0.6);   // (tipped forward, so its lower arc lies on the chest in front of the neck)
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, x = Math.sin(a) * r, y = Math.cos(a) * r;
      K.box(g, x, y, 0, 2 * Math.PI * r / n + 0.5, 3, 4, i % 2 ? 0xd09418 : 0xf0b428, 0, 0, -a);
      if (y < r * 0.8) { K.box(g, Math.sin(a) * (r + 2.2), Math.cos(a) * (r + 2.2), 0, 1.8, 3, 1.8, 0xf8d870, 0, 0, -a); K.box(g, Math.sin(a) * (r + 4), Math.cos(a) * (r + 4), 0, 1, 1.4, 1, 0xfff0b0, 0, 0, -a); }
    }
  }
  // ---- head (headS 19: a large creature has no Minecraft head; the body
  // dominates, the head on a thick neck):
  // a heavy skull, a scowling brow over molten eyes, jaw muscles,
  // a long muzzle and a furnace mouth full of fangs (QuadRig head frame: the
  // skull centred on z = hs * 0.35, the face at z = hs * 0.85)
  // drawn at headS 20 and scaled up to the spec's head; only the structure
  // grows, the fur and teeth detail stays at the body's voxel size
  const k = hs / 20, fz = 17, sc = (v) => v.map((q) => q * k);
  const HB = (p, x, y, z, w, h, d, col, rx = 0, ry = 0, rz = 0) => K.box(p, x * k, y * k, z * k, w * k, h * k, d * k, col, rx, ry, rz);
  HB(Hd, 0, 1, 7.5, 19, 16, 19, DEEP[1]);
  HB(Hd, 0, 8.6, 6, 15, 2.4, 15, DEEP[0]);
  for (const sx of [-1, 1]) {
    HB(Hd, sx * 9.6, -3, 9, 2.6, 10, 11, DEEP[1]);                                 // jaw muscles, shaggy
    K.clumps(Hd, sc([sx * 9.6, -3, 9]), sc([2.6, 10, 11]), { n: Math.round(22 * fe), size: [1.2, 2.2], cols: FURL, faces: sx < 0 ? 'lt' : 'rt', out: 0.25 });
    for (let j = 0; j < 4; j++) HB(Hd, sx * (1.4 + j * 2), 6.6 + j * 0.6, fz + 1.1 - j * 0.2, 2.3, 2.2, 2.8, K.tone([0x0e0b0d, 0x161215]));   // the scowling brow
    HB(Hd, sx * 5, 4.2, fz + 0.3, 6.4, 4, 0.6, 0x050304);                          // eye socket
    HB(Hd, sx * 5, 4.3, fz + 0.6, 5.2, 2.8, 0.4, 0xff3000);                        // molten eye
    HB(Hd, sx * 4.4, 4.5, fz + 0.85, 2.4, 1.4, 0.3, 0xffd040);
    HB(Hd, sx * 7, 2.2, fz + 0.6, 0.9, 2.4, 0.4, 0xff6a00);                        // a drip of fire
    // ears laid back, ember-lined
    HB(Hd, sx * 6.6, 11, 1.5, 5, 6, 2.6, DEEP[0], -0.4, 0, -sx * 0.22);
    HB(Hd, sx * 7.3, 14.6, 0.2, 3.2, 4, 2.2, DEEP[0], -0.4, 0, -sx * 0.22);
    HB(Hd, sx * 7.7, 17.2, -0.8, 1.4, 2.4, 1.6, DEEP[1], -0.4, 0, -sx * 0.22);
    HB(Hd, sx * 6.7, 11.6, 2.9, 2.2, 5, 0.4, 0xd83a0a, -0.4, 0, -sx * 0.22);
  }
  K.shag(Hd, sc([0, 1, 7.5]), sc([19, 16, 19]), { cols: FUR, step: 1.8 * ss, len: [1.6, 2.8], low: 0.55, bristle: 0.9, sweep: 0.5 });
  K.clumps(Hd, sc([0, 1, 7.5]), sc([19, 16, 19]), { n: Math.round(40 * fe), size: [1, 1.8], cols: FURL, faces: 'lr', out: 0.2 });
  K.clumps(Hd, sc([0, -2.3, 23.5]), sc([11.4, 9, 13]), { n: Math.round(44 * fe), size: [0.8, 1.5], cols: [DEEP[0], DEEP[2], FUR[0], FUR[1]], faces: 'lrt', out: 0.2, keep: (x, y) => y / k > -5.2 });
  K.clumps(Hd, sc([0, 1, 7.5]), sc([19, 16, 19]), { n: Math.round(36 * fe), size: [1, 1.8], cols: FURL, faces: 'f', out: 0.2, keep: (x, y) => y / k > 8 || (y / k > -1.5 && Math.abs(Math.abs(x / k) - 5) > 3.6) });
  K.clumps(Hd, sc([0, -4, 5]), sc([21, 9, 11]), { n: Math.round(34 * fe), size: [1.6, 2.8], cols: FUR, faces: 'lrbk', stretch: [1, 1.3, 1.2] });   // cheek ruff
  K.cracks(Hd, sc([0, 0, 7.5]), sc([22.5, 13, 19]), { n: Math.max(4, Math.round(cracks / 2.5)), cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lr', len: [4, 8], cell: 0.9 });
  K.cracks(N, [0, -4, -3.5], [21.5, 16, 15], { n: Math.max(3, Math.round(cracks / 3)), cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lr', len: [4, 8], cell: 0.9 });
  // the muzzle
  HB(Hd, 0, -2.3, 23.5, 11.4, 9, 13, DEEP[1]);
  HB(Hd, 0, 2.4, 21, 8, 1.6, 7, DEEP[2], 0.12);
  for (let i = 0; i < 4; i++) HB(Hd, 0, 2.8 - i * 0.2, 18 + i * 1.8, 8.6, 0.6, 0.8, 0x0a0708);       // snarl wrinkles
  HB(Hd, 0, 0.6, 29.6, 6.4, 3.8, 1.2, 0x050404);                                                    // nose, flush with the muzzle's tip
  HB(Hd, 0, 1.8, 30.05, 4, 1, 0.3, 0x2a2428);
  // the mouth: a dark mouth, pink gums only
  // along the top and bottom jaws, and the teeth standing out of them
  const GUM = 0xb8344a, MAW = 0x1a0909;
  for (const sx of [-1, 1]) {
    HB(Hd, sx * 5.8, -6.1, 23.5, 0.5, 1, 12, LAVA[0]);                                               // the furnace glows through the lips
    HB(Hd, sx * 4.4, -9.8, 28, 2, 7, 2, fang, 0.12);                                                 // upper canines
    for (let i = 0; i < 4; i++) HB(Hd, sx * 5, -7.9, 25.6 - i * 2.1, 1, 2.5 - i * 0.25, 1, fang);
  }
  for (let x = -2.4; x <= 2.41; x += 1.2) HB(Hd, x, -7.7, 29.4, 0.9, 2.2, 0.9, fang);
  HB(Hd, 0, -6.9, 23, 9, 0.5, 12, MAW);                                                              // the roof of the mouth, dark
  for (const sx of [-1, 1]) {
    HB(Hd, sx * 4.9, -8.6, 21, 0.4, 3, 10, MAW);                                                     // the cheeks inside
    HB(Hd, sx * 4.9, -7.15, 24, 1.9, 0.6, 11.6, GUM);                                                // the upper gums, along each side
  }
  HB(Hd, 0, -7.15, 29.3, 8.6, 0.6, 1.4, GUM);                                                       // and behind the front teeth
  // the jaw (QuadRig's mouth hinge): massive, its own row of fangs over pink gums, a dark tongue
  HB(M, 0, -2.4, 7.5, 10.4, 4.6, 15, DEEP[1]);
  HB(M, 0, -5.2, 10, 8.4, 2, 8, DEEP[0]);
  HB(M, 0, 0.2, 7.5, 7.6, 0.5, 12.5, MAW);
  HB(M, 0, 0.5, 6, 4.2, 0.6, 8, 0x5a1620);                                                           // the tongue
  HB(M, 0, 0.45, 14.2, 8.2, 0.6, 1.4, GUM);
  for (const sx of [-1, 1]) {
    HB(M, sx * 3.9, 2.9, 13.6, 1.8, 5.4, 1.8, fang, -0.1);
    for (let i = 0; i < 4; i++) HB(M, sx * 4.2, 1.1, 11.4 - i * 2, 1, 2.1, 1, fang);
    HB(M, sx * 4.3, 0.45, 8, 1.9, 0.6, 12.6, GUM);
    HB(M, sx * 5.3, -0.3, 7.5, 0.4, 0.8, 13, LAVA[0]);
    HB(M, sx * 4.9, 1.6, 7, 0.4, 2.6, 9, MAW);
  }
  K.clumps(M, sc([0, -3, 7]), sc([10, 5, 15]), { n: Math.round(14 * fe), size: [1.3, 2.2], cols: FUR, faces: 'blr' });
  // ---- legs: thick and powerful, heavy at the shoulder and thigh, their
  // roots buried in the body (QuadRig legY: the top 10 of each is inside
  // it); the hind legs bend back at the hock; big paws spread on four toes
  // with amber claws, set flat on the ground though the leg leans out (stance)
  for (const leg of rig.legs) {
    const front = leg.userData.row === 0, b = -legH - legW * 0.2;
    const Y = ([y, z]) => [y < 0 ? y * ly : y, z];   // (drawn 34 long, stretched to legH below the joint)
    if (front) {
      seg(leg, [7, 0], Y([-12, 0.5]), 11, 12, DEEP[1], 1.2);
      seg(leg, Y([-11, 0.5]), Y([-24, -0.5]), 8.6, 9.2, DEEP[1]);
      seg(leg, Y([-24, -0.5]), Y([-31, 0.8]), 7.2, 7.8, DEEP[0], 0.7);
      for (let y = -12; y > -26; y -= 2.2) K.box(leg, (K.r() - 0.5) * 3, y * ly, -5, 2, 3.4, 1.6, K.tone(FURL), 0.35);   // feathering down the back
    } else {
      seg(leg, [8, -1], Y([-12, 1]), 12, 14, DEEP[1], 1.1);   // (the thigh reaches up into the haunch: it never leaves the body)
      seg(leg, Y([-11, 1]), Y([-19, 4]), 9, 10, DEEP[1]);
      seg(leg, Y([-19, 4]), Y([-28, -3]), 7.2, 7.8, DEEP[0], 0.7);
      seg(leg, Y([-28, -3]), Y([-33, -0.5]), 6.6, 7.2, DEEP[1], 0.6);
      K.box(leg, 0, -28 * ly, -5.6, 3.6, 3.6, 2.8, FUR[2]);
    }
    K.cracks(leg, [0, -17 * ly, 0], [12.5, 22 * ly, 12.5], { n: 6, cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lrf', len: [4, 9], cell: 0.9 });
    const paw = group(leg, 0, b, 0, 0, 0, -(rig.spec.stance ?? 0) * leg.userData.side);   // (level, though the leg leans out)
    K.box(paw, 0, 2.2, 1.6, 10.6, 4.4, 11.4, DEEP[1]);
    K.box(paw, 0, 5, 0.6, 7.6, 2.4, 8, DEEP[0]);
    for (const dx of [-3.9, -1.3, 1.3, 3.9]) {
      K.box(paw, dx, 1.9, 7.6, 2.4, 3.8, 3.8, K.tone([FUR[0], DEEP[1]]));
      K.box(paw, dx, 1.3, 10, 1.5, 2.4, 3.2, claw, 0.45);
      K.box(paw, dx, 0.5, 11.4, 0.9, 1.2, 1.4, 0xffb000);
    }
    K.box(paw, 0, 1.5, -4.6, 3, 2.8, 2.4, DEEP[1]);   // the heel pad
  }
  // ---- tail: a shaggy rope with a smouldering, smoking tip
  const tl = spec.tailLen / spec.tail;
  for (const [i, sg] of rig.tail.entries()) {
    const w = spec.tailW * (1 - i * 0.12);
    K.box(sg, 0, 0, -tl / 2, w, w, tl + 0.6, DEEP[1]);
    K.clumps(sg, [0, 0, -tl / 2], [w, w, tl], { n: Math.round(12 * fe), size: [1.4, 2.4 - i * 0.15], cols: FUR, faces: 'tlrb', stretch: [1, 1, 1.4] });
  }
  const tip = rig.tailTip;
  K.box(tip, 0, 0, -tl - 1.2, 3, 3, 3, LAVA[0]); K.box(tip, 0, 1.6, -tl - 2.6, 2, 2.6, 2, LAVA[1]); K.box(tip, 0.6, 3.4, -tl - 2.2, 1.2, 2, 1.2, 0xffd040);
  K.box(tip, 0, 6, -tl - 3, 2.2, 2.2, 2.2, SMOKE[0]); K.box(tip, 0.6, 8.6, -tl - 3.6, 1.6, 1.6, 1.6, SMOKE[1]); K.box(tip, -0.3, 10.6, -tl - 4, 1.1, 1.1, 1.1, SMOKE[2]);
  K.done(); RK.done();
  return rig;
}
// The hellhound pup (vox-enemies, top left; spec PUP): a young hellhound a
// head taller than Percy, Mrs O'Leary's size of "puppy", friendly-menacing.
// Built like bigHound at the heroes' voxel size, so its size buys detail:
// a thick fluffy coat of soot-black clumps over a round barrel of a body,
// a soft ridge of hackles with ember tips, glowing magma cracks in red rims;
// a big round head with full cheeks, a short muzzle, big molten eyes under a
// soft scowl, half-folded ears lined with embers, small fangs over pink gums
// in a dark mouth; short thick legs on oversized paws with four toes, amber
// claws and embers glowing between the toes; a stubby curled tail with a
// smouldering tip. rig.extras.trunk names the chest and haunch blocks the
// legs are rooted in (perf/houndlegs.cjs).
function bigPup(id, spec, { cracks = 10 } = {}) {
  const mat = skinMat(id, (S) => { lavaDog({ cracks, base: 0x2e2529 })(S); S.saturate(1.3); }, { emit: 0.5 });
  houndSurface(mat);
  const rig = new QuadRig({ material: mat, ...spec });
  const K = kit(rig, mat, { seed: 5, emit: 1.2, rough: HOUND_ROUGH, metal: HOUND_METAL });
  const RK = kit(rig, mat, { seed: 55, emit: 0.4, fill: 0 });   // (the magma's deep red rims, as bigHound)
  const { legH, legW, hs } = rig.dims, T = rig.torso, Hd = rig.head, M = rig.mouth, N = rig.neck;
  for (const g of [T, Hd, M, ...rig.legs, ...rig.tail]) dropMeshes(rig, g);
  // (a champion is built finer, voxkit.js BUILD.k: the clump counts grow with k only)
  const D = BUILD.k, fe = 0.55 / D, ss = 1.35 * Math.sqrt(D), FURL = [...FUR, dim(0x5a4a54)], fang = 0xe6dcc0, claw = 0xe0a428;
  const GUM = 0xb8344a, MAW = 0x1a0909, side = (sx) => (sx < 0 ? 'l' : 'r');
  // a limb segment from a to b ([y, z] in the part's frame), coated in short blocky fur
  const seg = (p, a, b, w, d, col, coat = 1) => {
    const y = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, l = Math.hypot(a[0] - b[0], a[1] - b[1]) + w * 0.3, rx = Math.atan2(a[1] - b[1], a[0] - b[0]);
    K.box(p, 0, y, z, w, l, d, col, rx);
    const n = Math.round(l * (w + d) * 0.12 * coat * D), c = Math.cos(rx), sn = Math.sin(rx);
    for (let i = 0; i < n; i++) {
      const f = K.r(), u = (K.r() - 0.5) * l, sz = (1.2 + K.r() * 1.2) / Math.sqrt(D);
      let x = (K.r() - 0.5) * w, zz = (K.r() - 0.5) * d;
      if (f < 0.35) x = Math.sign(x || 1) * (w / 2 + 0.15); else if (f < 0.65) zz = Math.sign(zz || 1) * (d / 2 + 0.15); else if (f < 0.85) x = -w / 2 - 0.15; else x = w / 2 + 0.15;
      K.box(p, x, y + u * c - zz * sn, z + u * sn + zz * c, sz, sz * 1.4, sz, K.tone(FUR, 0.16), rx);
    }
  };
  // ---- trunk (20 x 16 x 26): a round puppy barrel, a deep fluffy chest,
  // a soft belly and plump haunches round the hind legs' roots
  K.box(T, 0, 0.5, 6, 20, 16, 14, DEEP[1]);          // chest and shoulders
  K.box(T, 0, -7.5, 8.5, 13, 4, 8, DEEP[0]);         // the brisket
  K.box(T, 0, 1, -3.5, 18, 13.5, 7, DEEP[1]);        // belly
  K.box(T, 0, 0.5, -8.5, 19, 15, 9, DEEP[1]);        // haunches
  rig.extras.trunk = { chest: [-10, -7.5, -1, 10, 8.5, 13], haunch: [-9.5, -7, -13, 9.5, 8, -4] };   // (skin px, torso space: perf/houndlegs.cjs)
  for (const sx of [-1, 1]) {
    K.clumps(T, [sx * 10.2, 1.5, 7], [1.6, 11, 10], { n: Math.round(20 * fe), size: [2, 3.2], cols: FURL, faces: side(sx), out: 0.3, stretch: [1, 1.2, 1] });   // shoulder
    K.clumps(T, [sx * 9.7, 1, -8.5], [1.6, 11, 7.5], { n: Math.round(18 * fe), size: [2, 3.2], cols: FURL, faces: side(sx), out: 0.3 });                   // haunch
  }
  // the coat: thick tufts hanging down the sides, fluff along the back
  K.shag(T, [0, 0.5, 6], [20, 16, 14], { cols: FUR, step: 2.4 * ss, len: [2.2, 3.6], w: 1.4, low: 0.62, ember: 0.08, embers: LAVA, top: false });
  K.shag(T, [0, 1, -3.5], [18, 13.5, 7], { cols: FUR, step: 2.2 * ss, len: [2, 3.2], w: 1.3, low: 0.55, top: false, sweep: 0.5 });
  K.shag(T, [0, 0.5, -8.5], [19, 15, 9], { cols: FUR, step: 2.4 * ss, len: [2.2, 3.4], w: 1.4, low: 0.62, top: false, sweep: 0.4 });
  K.shag(T, [0, 0.5, 0], [18, 16, 24], { cols: FUR, step: 2.6 * ss, len: [2, 3.4], w: 1.3, sides: false, bristle: 0.6 });
  K.clumps(T, [0, -1, 13.1], [18, 14, 1], { n: Math.round(40 * fe), size: [2, 3.2], cols: FURL, faces: 'f', stretch: [1, 1.4, 1] });   // the fluffy bib
  K.clumps(T, [0, 0.5, -13.1], [17, 13, 1], { n: Math.round(20 * fe), size: [1.8, 3], cols: FUR, faces: 'k' });                       // the rump
  for (let z = -10; z < 13; z += 3.6) for (let x = -6.5; x <= 6.5; x += 4.4) {                                                       // fringe under the belly
    const l = 1.6 + K.r() * 1.8, y0 = z > 4.5 && Math.abs(x) < 6.5 ? -9.5 : -7.5; K.box(T, x + (K.r() - 0.5), y0 - l / 2 + 1, z, 2.4, l, 2.4, K.tone(FUR), 0.3);
  }
  // a soft ridge of hackles down the spine, tallest over the shoulders, ember-tipped
  for (let z = 12; z > -13; z -= 2.6) {
    const k = Math.max(0.4, 1 - Math.abs(z - 5) / 22), h = 3.2 * k + K.r() * 1.5;
    K.box(T, (K.r() - 0.5) * 1.2, 8.5 + h / 2 - 0.6, z, 2.2, h, 2.4, K.tone([DEEP[0], DEEP[1], FUR[3]]), -0.6);
    for (const sx of [-1, 1]) if (K.r() < 0.5) K.box(T, sx * 2.2, 8.3 + h * 0.3, z + 0.4, 1.6, h * 0.65, 2, K.tone(FUR), -0.6, 0, sx * 0.4);
    if (K.r() < 0.4) K.box(T, 0, 8.5 + h - 0.3, z - h * 0.55, 1, 1, 1, LAVA[K.r() < 0.4 ? 1 : 0]);
  }
  // lava veins drawn over the fur (outside the tufts, so they read from afar)
  K.cracks(T, [0, -0.5, 6], [23, 12, 13], { n: Math.round(cracks * 1.2), cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lr', len: [4, 8], cell: 0.9 });
  K.cracks(T, [0, 0, -8.5], [22.4, 11, 8], { n: Math.round(cracks * 0.8), cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lr', len: [4, 7], cell: 0.9 });
  K.cracks(T, [0, -2, 6], [16, 10, 18.4], { n: 3, cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'f', len: [3, 5], cell: 0.9 });
  for (let z = 5; z < 13; z += 2.6) K.box(T, (K.r() - 0.5) * 6, -9.6, z, 3 + K.r() * 4, 0.4, 0.8, LAVA[K.r() < 0.3 ? 1 : 0]);   // the furnace glows under the chest
  // ---- neck: short and thick under a fluffy ruff
  K.box(N, 0, -4.5, -2.5, 13, 13, 10, DEEP[1], 0.2);
  K.clumps(N, [0, -4.5, -2.5], [13, 13, 10], { n: Math.round(46 * fe), size: [2, 3.4], cols: FUR, faces: 'lrtb', stretch: [1, 1.3, 1.2] });
  K.cracks(N, [0, -4.5, -2.5], [16, 9, 8], { n: 3, cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lr', len: [3, 6], cell: 0.9 });
  // ---- head (QuadRig head frame: the skull round z = 7, the face at z = 16),
  // drawn at headS 20 and scaled to the spec's head (as bigHound): big and
  // round for a puppy, a domed brow, fluffy cheeks, a short muzzle
  const k = hs / 20, fz = 16, sc = (v) => v.map((q) => q * k);
  const HB = (p, x, y, z, w, h, d, col, rx = 0, ry = 0, rz = 0) => K.box(p, x * k, y * k, z * k, w * k, h * k, d * k, col, rx, ry, rz);
  HB(Hd, 0, 1.5, 7, 20, 17, 18, DEEP[1]);                                         // skull
  HB(Hd, 0, 10.6, 6.5, 16, 2.4, 15, DEEP[1]);                                     // the dome
  HB(Hd, 0, -4, 8, 21, 7, 13, DEEP[1]);                                           // cheeks
  for (const sx of [-1, 1]) {
    HB(Hd, sx * 4.8, 3.8, fz + 0.3, 6.4, 5.2, 0.6, 0x050304);                    // eye socket
    HB(Hd, sx * 4.8, 3.8, fz + 0.6, 5, 4, 0.4, 0xff3000);                        // big molten eye
    HB(Hd, sx * 4.1, 4.5, fz + 0.85, 2.2, 2, 0.3, 0xffd040);                     // its bright core
    HB(Hd, sx * 6, 2.5, fz + 0.85, 1.2, 1, 0.3, 0xff8a20);
    for (let j = 0; j < 3; j++) HB(Hd, sx * (2.2 + j * 2.5), 7.2 + j * 0.5, fz + 0.7 - j * 0.3, 2.7, 1.8, 2.2, K.tone([0x0e0b0d, 0x161215]));   // a soft scowl
    // ears: big puppy ears, standing at the root and folding forward at the tip, ember-lined
    HB(Hd, sx * 6.4, 12.4, 3, 5.6, 4.8, 2.4, DEEP[0], 0, 0, -sx * 0.22);
    HB(Hd, sx * 6.9, 12.6, 4.3, 3.4, 3.4, 0.4, 0xd83a0a, 0, 0, -sx * 0.22);
    HB(Hd, sx * 7.2, 15, 4.4, 4.8, 2, 3.6, DEEP[0], 0.9, 0, -sx * 0.22);
    HB(Hd, sx * 7.4, 14.4, 6.3, 4, 1.4, 1.6, DEEP[1], 1.3, 0, -sx * 0.22);
    K.clumps(Hd, sc([sx * 6.4, 12.2, 1.6]), sc([5.6, 4.6, 0.4]), { n: Math.round(8 * fe), size: [1, 1.6], cols: FUR, faces: 'k' });
  }
  K.shag(Hd, sc([0, 1.5, 7]), sc([20, 17, 18]), { cols: FUR, step: 2.1 * ss, len: [1.6, 2.6], low: 0.5, bristle: 0.85, sweep: 0.5 });
  K.clumps(Hd, sc([0, -4, 7.5]), sc([21, 7, 12]), { n: Math.round(40 * fe), size: [1.8, 3], cols: FURL, faces: 'lrb', out: 0.25, stretch: [1, 1.2, 1] });   // cheek fluff
  K.clumps(Hd, sc([0, 1.5, 7]), sc([20, 17, 18]), { n: Math.round(30 * fe), size: [1, 1.8], cols: FURL, faces: 'f', out: 0.2, keep: (x, y) => y / k > 8.4 || (y / k > -1 && Math.abs(Math.abs(x / k) - 4.8) > 3.6) });
  K.cracks(Hd, sc([0, 3, 4]), sc([22.5, 8, 10]), { n: 4, cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lr', len: [2, 4], cell: 0.9 });
  // the muzzle, short, with the nose flush with its tip
  HB(Hd, 0, -2.5, 20, 11, 8, 8, DEEP[1]);
  HB(Hd, 0, 1.9, 19.2, 7, 1.4, 6, DEEP[2], 0.12);
  for (let i = 0; i < 3; i++) HB(Hd, 0, 2.2 - i * 0.2, 17.2 + i * 1.6, 7.6, 0.5, 0.7, 0x0a0708);   // snarl wrinkles
  K.clumps(Hd, sc([0, -2.5, 20]), sc([11, 8, 8]), { n: Math.round(18 * fe), size: [0.8, 1.4], cols: [DEEP[0], DEEP[2], FUR[0], FUR[1]], faces: 'lrt', out: 0.2, keep: (x, y) => y / k > -5 });
  HB(Hd, 0, 0, 23.6, 6, 3.6, 1.2, 0x050404);                                     // nose
  HB(Hd, 0, 1.1, 24.25, 3.6, 0.9, 0.3, 0x2a2428);
  // the mouth: dark inside, pink gums only along the jaws, small fangs out of them
  for (const sx of [-1, 1]) {
    HB(Hd, sx * 5.6, -5.6, 20, 0.5, 0.9, 7, LAVA[0]);                            // the furnace glows through the lips
    HB(Hd, sx * 3.9, -8.4, 22.4, 1.6, 3, 1.6, fang, 0.12);                       // upper canines
    for (let i = 0; i < 3; i++) HB(Hd, sx * 4.6, -7.7, 20.8 - i * 1.8, 0.9, 1.7 - i * 0.2, 0.9, fang);
    HB(Hd, sx * 4.9, -8.2, 19.5, 0.4, 2.6, 6, MAW);                              // the cheeks inside
    HB(Hd, sx * 4.6, -6.85, 20, 1.6, 0.6, 7.4, GUM);                             // the upper gums
  }
  for (let x = -1.8; x <= 1.81; x += 1.2) HB(Hd, x, -7.5, 23.3, 0.8, 1.4, 0.8, fang);
  HB(Hd, 0, -6.6, 20, 9, 0.4, 7, MAW);                                           // the roof of the mouth
  HB(Hd, 0, -6.85, 23.2, 7.6, 0.6, 1.2, GUM);
  // the jaw (QuadRig's mouth hinge, 15 px forward of the skull's centre at headS 20)
  HB(M, 0, -2.2, 4.8, 10, 4.2, 9.6, DEEP[1]);
  HB(M, 0, -4.6, 5.5, 8, 1.6, 6, DEEP[0]);
  HB(M, 0, 0.05, 4.8, 7.4, 0.4, 8.4, MAW);
  HB(M, 0, 0.35, 3.8, 4, 0.5, 5.6, 0x5a1620);                                    // the tongue
  HB(M, 0, 0.3, 9.2, 7.6, 0.6, 1.2, GUM);
  for (const sx of [-1, 1]) {
    HB(M, sx * 3.6, 1.8, 8.8, 1.4, 3, 1.4, fang, -0.1);
    for (let i = 0; i < 3; i++) HB(M, sx * 4, 0.9, 7 - i * 1.8, 0.9, 1.5, 0.9, fang);
    HB(M, sx * 3.9, 0.3, 4.8, 1.6, 0.6, 8.4, GUM);
    HB(M, sx * 5.1, -0.4, 4.8, 0.4, 0.7, 9, LAVA[0]);
    HB(M, sx * 4.7, 1.1, 4.5, 0.4, 1.8, 6, MAW);
  }
  K.clumps(M, sc([0, -2.6, 4.8]), sc([10, 4.4, 9.6]), { n: Math.round(12 * fe), size: [1.3, 2.2], cols: FUR, faces: 'blr' });
  // ---- legs: sturdy and fluffy, their roots buried in the body (QuadRig
  // legY), on big puppy paws planted flat though the leg leans out
  const ly = legH / 19;   // (drawn 19 long, stretched to legH below the joint)
  const Y = ([y, z]) => [y < 0 ? y * ly : y, z];
  for (const leg of rig.legs) {
    const front = leg.userData.row === 0, b = -legH - legW * 0.2;
    if (front) {
      seg(leg, [4, 0], Y([-9, 0.6]), 9, 9.4, DEEP[1], 1.3);
      seg(leg, Y([-8.5, 0.6]), Y([-18.4, 0]), 7.8, 8.2, DEEP[0], 0.8);
      for (let y = -3; y > -14; y -= 2.4) K.box(leg, (K.r() - 0.5) * 3, y * ly, -4.5, 2.2, 3.2, 1.8, K.tone(FURL), 0.35);   // feathering down the back
    } else {
      seg(leg, [5, -1], Y([-8, 1.6]), 10, 10.6, DEEP[1], 1.3);   // the plump thigh, up into the haunch
      seg(leg, Y([-7.5, 1.6]), Y([-13, -1.4]), 8.2, 8.6, DEEP[1]);
      seg(leg, Y([-13, -1.4]), Y([-18.4, 0]), 7.6, 8, DEEP[0], 0.7);
    }
    K.cracks(leg, [0, -10.5 * ly, 0], [10, 11 * ly, 10], { n: 3, cols: MAGMA, rim: MAGMA_RIM, rimKit: RK, faces: 'lrf', len: [3, 6], cell: 0.9 });
    const paw = group(leg, 0, b, 0, 0, 0, -(rig.spec.stance ?? 0) * leg.userData.side);
    K.box(paw, 0, 2.3, 1.6, 11, 4.6, 12, DEEP[1]);
    K.box(paw, 0, 5.2, 0.4, 8.4, 2.2, 8.4, DEEP[0]);
    for (const dx of [-4.1, -1.37, 1.37, 4.1]) {
      K.box(paw, dx, 2, 8, 2.6, 4, 4, K.tone([FUR[0], DEEP[1]]));                  // toes
      K.box(paw, dx, 1.4, 10.2, 1.6, 2.4, 2.6, claw, 0.45);
      K.box(paw, dx, 0.6, 11.4, 0.9, 1.2, 1.2, 0xffb000);
    }
    for (const dx of [-2.74, 0, 2.74]) K.box(paw, dx, 2.1, 8.6, 0.3, 2.8, 2.6, LAVA[0]);   // embers glowing between the toes
    K.box(paw, 0, 1.6, -4.2, 3.4, 3, 2.4, DEEP[1]);                                // the heel pad
    K.clumps(paw, [0, 4.2, 1.6], [11, 1, 12], { n: Math.round(10 * fe), size: [1.4, 2.2], cols: FUR, faces: 'lrk' });
  }
  // ---- tail: stubby and fluffy, curled up, with a smouldering tip
  const tl = spec.tailLen / spec.tail;
  for (const [i, sg] of rig.tail.entries()) {
    const w = spec.tailW * (1 - i * 0.1);
    K.box(sg, 0, 0, -tl / 2, w, w, tl + 0.6, DEEP[1]);
    K.clumps(sg, [0, 0, -tl / 2], [w, w, tl], { n: Math.round(16 * fe), size: [1.6, 2.6], cols: FUR, faces: 'tlrb', stretch: [1, 1, 1.3] });
  }
  const tip = rig.tailTip;
  K.box(tip, 0, 0, -tl - 1, 3, 3, 2.4, LAVA[0]); K.box(tip, 0, 1.4, -tl - 2, 2, 2.2, 1.8, LAVA[1]); K.box(tip, 0.4, 3, -tl - 1.8, 1.1, 1.6, 1.1, 0xffd040);
  K.box(tip, 0, 5, -tl - 2.4, 1.8, 1.8, 1.8, SMOKE[0]); K.box(tip, 0.5, 7, -tl - 2.8, 1.2, 1.2, 1.2, SMOKE[1]);
  K.done(); RK.done();
  return rig;
}
