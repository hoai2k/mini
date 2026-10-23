// The woods' fodder: the myrmex and the myrmex spitter, and the Calydonian
// boarlet.
import { QuadRig } from '../../quad.js';
import { skinMat } from '../../parts.js';
import { kit, voxDensity } from '../../voxkit.js';
import { dropAll, noShadow, flatQuad, mix } from './parts.js';
import { finish } from './behaviour.js';

// ---- myrmex and myrmex spitter -----------------------------------------------------
// (vox-ow-fodder-fix, top two rows) A giant ant (six legs, though the
// sheet's front views show about eight): a big round head with an orange
// band round the face and glowing orange eyes, big curved bronze mandibles,
// elbowed antennae banded and tipped in orange, a small thorax, a narrow
// waist and a huge round abdomen banded black and orange-bronze; six legs,
// dark with orange bands at every joint. The spitter's abdomen is a huge
// glowing green sac striped in dark and pale green, its eyes burn green and
// green drips from its jaws; it sprays an arc of acid that splashes.
export function buildMyrmex(spitter = false) {
  const kind = spitter ? 'myrmex_spitter' : 'myrmex';
  const blk = 0x1e1614, blkL = 0x3a2a24, blkD = 0x120e0c, org = 0xe08a1a, orgD = 0xa85a12, orgL = 0xffb040, eye = spitter ? 0x8aff3a : 0xff8a10, eyeL = spitter ? 0xe0ffb0 : 0xffe0a0;
  const ACID = 0x5aff2a, ACIDD = 0x1e7a1a, ACIDM = 0x34b82a, ACIDL = 0xc8ff70;
  const DARK = [blk, blkL, blkD, 0x2a1e1c, 0x261a22], ORG = [org, orgD, 0xc87818], SAC = [ACID, ACIDM, 0x48e030, ACIDL];
  const mat = skinMat('myrmex', flatQuad(blk, 0x0e0a08, 0x2a2018, 0xff8a10), { rough: 0.3, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 1.14, bodyL: 4.6, bodyW: 4, bodyH: 3.6, legH: 6.6, legW: 1.7, headS: 7, legs: 6, splay: 1.15, footL: 7.4, kneeOut: 0.3, legY: 0.4, snout: false, neckUp: 1, headZ: 1.8, gait: 1.8, ears: false });
  const K = kit(rig, mat, { share: kind, seed: spitter ? 107 : 103, rough: 0.3, metal: 0.15, emit: 0.9, ao: 0.4 });
  const T = rig.torso, Hd = rig.head, M = rig.mouth, { hs, legW } = rig.dims;
  dropAll(rig, T); dropAll(rig, Hd);
  // the thorax: a rounded hump, orange collar and a ring at the middle
  K.blob(T, [0, 0.6, 0.8], [2.7, 2.7, 3.6], 0.9, (x, y, z) => (z > 0.62 || Math.abs(z + 0.1) < 0.14 ? mix(K, ORG, 0.1) : mix(K, DARK)), { run: [1, 3] });
  // the waist: two little knots, orange-ringed
  K.blob(T, [0, 0.8, -3.3], [1.3, 1.3, 1.1], 0.8, () => mix(K, DARK), { run: [1, 2] });
  K.box(T, 0, 1, -4.4, 2, 2, 0.6, org);
  // the abdomen: a huge round ball, banded across (the spitter's a glowing acid sac)
  const S = spitter ? 1.15 : 1, ac = [0, 2.4 * S, -4.6 - 6.8 * S];
  K.blob(T, ac, [5.9 * S, 5.5 * S, 7 * S], 0.95, (x, y, z) => {
    const band = Math.abs(z - 0.45) < 0.12 || Math.abs(z + 0.05) < 0.12 || Math.abs(z + 0.56) < 0.1;
    if (spitter) return band ? mix(K, [ACIDD, 0x16601a], 0.1) : y > 0.55 && K.r() < 0.4 ? ACIDL : mix(K, SAC, 0.08);
    return band ? mix(K, ORG, 0.12) : y > 0.5 && K.r() < 0.35 ? mix(K, [blkL, 0x4a3a30], 0.1) : mix(K, DARK);
  }, { rx: -0.32, run: [1, 3] });
  if (spitter) for (const [x, z] of [[-2.4, -1], [2.2, 0.6], [0, -2.4]]) K.box(T, ac[0] + x * S, ac[1] - 4.6 * S, ac[2] + z * S, 0.7, 1.4, 0.7, ACID);   // drips under the sac
  // head: big and round, an orange ring round the face, big glowing eyes
  const hz = hs * 0.35, fz = hz + 3.3;
  K.blob(Hd, [0, 0.2, hz], [4, 3.6, 3.5], 0.8, (x, y, z) => (y > 0.55 ? mix(K, [blkL, blk], 0.1) : mix(K, DARK)), { run: [1, 2] });
  // the orange ring round the face: a stepped frame proud of the front
  for (const [x, y, w, h] of [[0, 2.9, 4.4, 0.9], [0, -2.1, 3.2, 0.9], [-3, 0.4, 0.9, 3.6], [3, 0.4, 0.9, 3.6], [-2.4, 2.3, 1.2, 1], [2.4, 2.3, 1.2, 1], [-2.2, -1.5, 1.2, 1], [2.2, -1.5, 1.2, 1]]) K.box(Hd, x, y, fz - 0.5 - Math.abs(x) * 0.25, w, h, 1, mix(K, ORG, 0.1));
  K.box(Hd, 0, 0.3, fz - 0.2, 0.8, 2.4, 0.6, blkL);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * 1.55, 0.7, fz - 0.3, 2.2, 1.8, 0.8, 0x2a1408); K.box(Hd, sx * 1.55, 0.7, fz, 1.8, 1.4, 0.6, eye); K.box(Hd, sx * 1.35, 0.95, fz + 0.25, 0.7, 0.6, 0.3, eyeL);
  }
  // elbowed antennae: a dark stalk up and out, an orange elbow, a banded whip forward, an orange club
  for (const sx of [-1, 1]) {
    const bx = sx * 1.3, by = 3.2, bz = fz - 1.4;
    K.box(Hd, bx, by, bz, 1.4, 1, 1.4, org);
    K.box(Hd, bx + sx * 0.7, by + 2.4, bz - 0.4, 0.8, 4.4, 0.8, blkL, -0.15, 0, sx * -0.3);
    K.box(Hd, bx + sx * 1.4, by + 4.6, bz - 0.7, 1.2, 1.2, 1.2, org);
    for (let i = 0; i < 4; i++) K.box(Hd, bx + sx * (1.7 + i * 0.35), by + 5 + i * 0.25, bz + 0.5 + i * 1.5, 0.75, 0.75, 1.5, i % 2 ? orgD : blk, -0.18, sx * 0.22, 0);
    K.box(Hd, bx + sx * 3.2, by + 6.1, bz + 6.8, 1.1, 1.1, 1.6, orgL, -0.18, sx * 0.22, 0);
  }
  // mandibles: big curved orange pincers, stepped, with dark tips and cream teeth inside
  for (const sx of [-1, 1]) {
    // a hook: out and forward from the jaw, then curling in to a dark point
    const seg = [[2, 0.4, 0.6, 1.6, 1.5, 1.8, -0.3], [2.7, 0.2, 2, 1.3, 1.3, 1.9, -0.15], [2.9, 0, 3.6, 1.2, 1.2, 1.8, 0.2], [2.5, -0.1, 5, 1.1, 1.1, 1.6, 0.65], [1.6, -0.2, 5.9, 1, 1, 1.4, 1.1], [0.8, -0.2, 6.2, 0.8, 0.9, 1, 1.4]];
    seg.forEach(([x, y, z, w, h, d, a], i) => K.box(M, sx * x, y, z, w, h, d, i === 5 ? 0x3a1a08 : i === 4 ? orgL : i % 2 ? orgD : org, 0, sx * a, 0));
    for (const [x, z] of [[2.2, 2.4], [2.3, 3.8], [1.9, 5]]) K.box(M, sx * x, -0.1, z, 0.6, 0.7, 0.5, 0xfff0d0);
    if (spitter) { K.box(M, sx * 1.4, -1.2, 3, 0.5, 1.8, 0.5, ACID); K.box(M, sx * 1.4, -2.4, 3, 0.7, 0.7, 0.7, ACIDL); }
  }
  if (spitter) K.box(M, 0, -0.6, 2.4, 1.4, 0.6, 1.4, ACID);
  // six legs fanned fore and aft, thick and dark, orange bands at every joint
  for (const leg of rig.legs) {
    const u = leg.userData; leg.rotation.y = -u.side * (0.7 - u.row * 0.7);
    const k = u.knee; dropAll(rig, leg); dropAll(rig, k);
    K.box(leg, 0, -0.2, 0, legW + 0.8, 1.4, legW + 0.8, org);
    K.box(leg, 0, -2, 0, legW + 0.3, 2.6, legW + 0.3, blkL); K.box(leg, 0, -3.5, 0, legW + 0.5, 0.6, legW + 0.5, orgD); K.box(leg, 0, -4.9, 0, legW + 0.1, 2.4, legW + 0.1, blk);
    K.boxZ(k, 0, 0, 0, 2.3, 2.3, 2.3, org); K.boxZ(k, 0, 0.3, 0, 1.6, 1.6, 2.5, orgL);
    K.boxZ(k, 0, -2.2, 0, legW, 2.8, legW, blk); K.boxZ(k, 0, -3.7, 0, legW + 0.4, 0.7, legW + 0.4, org);
    K.boxZ(k, 0, -5, 0, legW * 0.85, 2.2, legW * 0.85, blkL); K.boxZ(k, 0, -6.2, 0, legW + 0.2, 0.6, legW + 0.2, orgD);
    K.boxZ(k, 0, -6.75, 0, legW * 0.7, 0.9, legW * 0.7, blkD); K.boxZ(k, 0, -7.2, 0, legW * 0.36, 0.5, legW * 0.36, blkD);   // (a pointed tip: a wide end's corner dipped through the floor as the leaning shin swung)
  }
  K.done();
  noShadow(rig, Hd, M, ...rig.legs);
  return finish(rig, kind);
}

// ---- Calydonian boarlet ---------------------------------------------------------
// (vox-ow-fodder-2, bottom left) A big shaggy brown boar, a hero's height at
// the shoulder hump: a heavy forequarter in clumps of rust-brown fur, a
// bristling mane of cream-tipped spines over the shoulders and back (its
// silhouette), great curved cream tusks, glowing orange eyes, a pink-brown
// snout, dark hooves banded in brass; it lowers its head and charges.
export function buildBoarlet() {
  const fur = 0x6a3a1e, furD = 0x3a2010, furL = 0x8a5a30, bone = 0xf0e0b8, boneD = 0xd0b88a, spineB = 0x7a4a26, snout = 0x9a5a4a, eye = 0xffa020, hoof = 0x2a1a10, band = 0xc89a5a;
  const FUR = [fur, furD, furL, 0x5a3018, 0x7a4424], DARK = [furD, 0x2a180c, 0x4a2a16];
  const mat = skinMat('boarlet', flatQuad(fur, furD, 0x4a2a16, eye), { rough: 0.9, emit: 1 });
  const rig = new QuadRig({ material: mat, scale: 2.35, bodyL: 12, bodyW: 8, bodyH: 7, legH: 5.6, legW: 2.6, headS: 7, snout: false, neckUp: -0.4, headZ: 0.6, gait: 1.4, ears: false, tail: 2, tailLen: 3, tailW: 0.8 });
  const K = kit(rig, mat, { share: 'boarlet', seed: 139, rough: 0.9, emit: 0.9, ao: 0.4, density: voxDensity(rig) / 1.25 });   // (a horde lead: cells 1.25 hero pixels across)
  const T = rig.torso, Hd = rig.head, M = rig.mouth, hs = 7;
  const pick = (A) => A[Math.floor(K.r() * A.length)];   // (flat tones, so runs of cells merge)
  dropAll(rig, T); dropAll(rig, Hd);
  // body: a hunched forequarter sloping to the haunches, in clumps of shaggy fur
  K.blob(T, [0, 1.2, 2.4], [4.6, 5, 4.4], 1, () => pick(FUR), { run: [1, 3] });
  K.blob(T, [0, 0, -2.8], [4, 3.8, 4.4], 1, () => pick(FUR), { run: [1, 3] });
  K.shag(T, [0, 0.8, 0.4], [8.4, 7, 11], { cols: FUR, step: 1.7, len: [1.6, 2.8], w: 1.1, low: 0.62, top: false, sweep: 0.3 });
  K.clumps(T, [0, -3.6, 0], [7, 1, 9], { n: 6, size: [1.2, 2], cols: DARK, faces: 'b', out: -0.2 });
  // the mane of spines: tall over the shoulders, falling away along the back, dark at the root and cream at the tip
  const SPB = [spineB, furD, 0x8a4a22, 0x5a3018];
  for (let i = 0; i < 70; i++) {
    const f = i / 70, z = 5.6 - f * 11, sx = i % 2 ? 1 : -1, wide = 0.3 + K.r() * (i % 3 ? 2.6 : 4), h = Math.max(2, 6.4 - f * 4.4 + K.r() * 1.6) * (wide > 2.6 ? 0.7 : 1), x = sx * wide, yb = (z > 0 ? 5.6 : 4.4 + z * 0.12) - (wide > 2.6 ? 1.2 : 0), tz = sx * (0.2 + wide * 0.1);
    K.box(T, x, yb + h * 0.25, z, 0.95, h * 0.55, 0.95, mix(K, SPB, 0.1), -0.5, 0, tz);
    if (K.r() < 0.7) K.box(T, x + sx * Math.sin(tz * sx) * h * 0.45, yb + h * 0.66, z - h * 0.26, 0.65, h * 0.4, 0.65, i % 4 ? bone : boneD, -0.5, 0, tz);
  }
  K.clumps(T, [0, 1, 0.4], [9, 6, 11], { n: 12, size: [1, 1.8], cols: FUR, faces: 'lrk', out: 0.2, stretch: [0.7, 0.7, 1.8] });
  // head: a big shaggy wedge, dark ears, glowing eyes under heavy brows, a pig's snout, great curling tusks
  const hz = hs * 0.35, fz = hz + hs / 2;
  K.blob(Hd, [0, 0.4, hz], [3.9, 3.8, 3.7], 0.9, (x, y) => pick(y > 0.3 ? FUR : [fur, furL, 0x7a4a2a]), { run: [1, 2] });
  K.box(Hd, 0, -0.9, fz + 1.4, hs - 1.6, hs - 2.6, 3, fur); K.box(Hd, 0, 0.4, fz + 1, hs - 2.6, 1.6, 2.6, furL);
  K.box(Hd, 0, -1.2, fz + 3, 4.2, 3.4, 0.8, snout); K.box(Hd, 0, -1.2, fz + 3.3, 3.4, 2.6, 0.3, 0xb87060); for (const sx of [-1, 1]) K.box(Hd, sx * 0.85, -1.2, fz + 3.5, 0.9, 1.2, 0.2, 0x2a1410);
  for (const sx of [-1, 1]) {
    K.box(Hd, sx * (hs / 2 - 0.7), 1.5, fz + 0.15, 1.6, 1.1, 0.3, eye); K.box(Hd, sx * (hs / 2 - 0.9), 1.6, fz + 0.3, 0.6, 0.5, 0.2, 0xffe0a0); K.box(Hd, sx * (hs / 2 - 0.6), 2.4, fz + 0.2, 2.2, 0.8, 0.8, furD, 0, 0, sx * -0.2);
    K.box(Hd, sx * (hs / 2 - 0.2), hs / 2 + 1.6, hz - 0.8, 2, 3.2, 1.2, furD, -0.3, 0, sx * 0.45); K.box(Hd, sx * (hs / 2 + 0.3), hs / 2 + 3, hz - 1.2, 1.2, 1.6, 0.9, 0x2a180c, -0.3, 0, sx * 0.45);
    // the tusks, from the jaw: out, then curling up and back
    for (const [x, y, z, w, h, d, col, rz] of [[2.4, 0.6, 2.8, 1.3, 1.3, 2.4, boneD, 0], [3.2, 1.2, 4.2, 1.2, 1.6, 1.2, bone, 0.4], [3.8, 2.6, 4.4, 1.1, 1.8, 1.1, bone, 0.15], [3.9, 4, 4, 0.9, 1.4, 0.9, 0xfff8e0, -0.2], [3.7, 4.9, 3.6, 0.6, 0.9, 0.6, 0xfffcf0, -0.4]]) K.box(M, sx * x, y, z, w, h, d, col, 0, 0, sx * rz);
  }
  K.box(M, 0, -0.4, 1.8, hs - 2.4, 1, 2.8, snout); K.box(M, 0, 0.3, 2.6, hs - 3, 0.5, 1.4, 0x8a1a1a); K.box(M, 0, -1, 1.6, hs - 2, 0.8, 2.4, furD);
  // legs: shaggy thighs, dark shins, banded split hooves
  for (const leg of rig.legs) {
    dropAll(rig, leg);
    K.box(leg, 0, -1.4, 0, 3.2, 3.4, 3.2, furD); K.clumps(leg, [0, -1, 0], [3.2, 2.6, 3.2], { n: 3, size: [1, 1.6], cols: FUR, faces: 'lrfk', out: -0.2 });
    K.box(leg, 0, -3.8, 0.1, 2.6, 1.6, 2.6, DARK[1]); K.box(leg, 0, -4.4, 0.1, 2.8, 0.7, 3, band); K.box(leg, 0, -5.1, 0.2, 2.8, 1, 3, hoof); K.box(leg, 0, -5.1, 1.75, 0.4, 1, 0.3, 0x0a0604);
  }
  for (const s of rig.tail) dropAll(rig, s);
  K.box(rig.tailTip, 0, 0, -1, 0.7, 0.7, 2.4, furD); K.box(rig.tailTip, 0, -0.4, -2.4, 1.2, 1.6, 1, furL);
  K.done();
  noShadow(rig, M, rig.tailTip, ...rig.legs);
  return finish(rig, 'boarlet');
}
