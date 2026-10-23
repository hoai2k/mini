// The dead and the stone: the skeleton soldier, the spartoi, the living
// gorgon statue and the ghost.
import { Rig, PX, HOLD_PITCH } from '../character.js';
import { paintPerson } from '../mortals.js';
import { HS, skinMat, group, sway } from '../parts.js';
import { kit, dropMeshes, voxDensity, legScale, reshape, applyShape } from '../voxkit.js';
import { markTip, markHeld, markHeadCore, markHeadwear } from '../rigContract.js';

// Skeleton warrior (vox-enemies, bottom left): a grinning skull under an
// olive combat helmet with ear pads and goggles, a camo plate carrier with
// pouches, camo shorts, bare bone arms and shins with knobby joints, tan
// combat boots and a rifle held across the body.
// Options for a champion (entities/champions.js): id (its own skin), pal
// { bone, boneD, olive, oliveD, khaki, camo, boot }, helmet: false (bare
// skull), gear: false (no rifle; the champion arms it).
const skullFace = (boneD) => (s, ey) => {
  s.rect(9, ey - 1, 2, 2, 0x0a0806, 0); s.rect(13, ey - 1, 2, 2, 0x0a0806, 0); s.dot(9.5, ey - 0.5, 0x2a1a10); s.dot(13.5, ey - 0.5, 0x2a1a10);
  s.dot(11.5, ey + 1, 0x1a1410, 1, 2); s.dot(12, ey + 1, 0x1a1410, 1, 2);
  s.rect(9, ey + 3, 6, 1, 0xf0e8d0, 0); for (let x = 9; x < 15; x += 1) s.dot(x + 0.5, ey + 3, 0x4a4030, 1, 2);
  s.rect(10, ey + 4, 4, 1, boneD, 0); s.dot(8.5, ey + 1.5, boneD, 1, 3); s.dot(15, ey + 1.5, boneD, 1, 3);
};
export function buildSkeleton({ id = 'skeleton', pal = {}, helmet = true, gear = true } = {}) {
  const bone = pal.bone ?? 0xe0d6bc, boneD = pal.boneD ?? 0xb0a688, olive = pal.olive ?? 0x4a5a2a, oliveD = pal.oliveD ?? 0x2e3a1a, khaki = pal.khaki ?? 0x8a7a50;
  const CAMO = pal.camo ?? [olive, oliveD, 0x6a6a3a, 0x3a3020];
  const mat = skinMat(id, (S) => {
    paintPerson(S, { skin: bone, eye: 0x0a0806, eyeWhite: 0x0a0806, brow: boneD, mouth: false, top: olive, sleeve: olive, shortSleeve: true, hand: bone, pants: olive, shoes: khaki,
      face: skullFace(boneD),
      body: (s) => {
        for (const [x0, y0, w, h] of [[16, 16, 24, 16], [40, 16, 16, 9], [32, 48, 16, 9], [0, 16, 16, 9], [16, 48, 16, 9]]) for (let i = 0; i < w * h / 4; i++) s.rect(x0 + s.r() * w, y0 + s.r() * h, 1.5, 1, CAMO[Math.floor(s.r() * 4)], 0);
        for (const [u, v] of [[0, 16], [16, 48], [40, 16], [32, 48]]) { s.rect(u, v + 9, 16, 7, bone, 0.05); for (let i = 0; i < 8; i++) s.dot(u + s.r() * 16, v + 9 + s.r() * 7, boneD); }
      } });
    S.shadeLimbs(); S.saturate(1.15);
  }, { emit: 0.8, res: 2 });
  // (a grown soldier made a monster: a grown man's size, not a giant's, about
  // 1.25x Percy's body without the helmet and about 1.3x with it
  // (design/sizes.json "adult"). The rig is drawn at 1.39 and every mass is
  // sculpted in cells of a hero's voxel size (voxDensity), so the body is
  // voxelised at its size rather than its cells scaled. A grown man's
  // proportions (proportions.js reshape): the skull
  // 0.92 of a hero's skin cube, legs stretched from 12 to 19 pixels over the same
  // boots, a longer trunk, slimmer limbs, arms reaching to mid-thigh, a neck of
  // bare vertebrae; the torso is bones under the plate carrier: a ribcage
  // showing at the sides, the lumbar spine and the pelvis between the vest
  // and the shorts)
  const rig = new Rig({ material: mat, scale: 1.39, armW: 3 });
  const HF = 0.92, L1 = 19, ANK = -8.2;
  reshape(rig, rig.head, HF);
  reshape(rig, rig.torso, [0.98, 1.1, 0.95]);
  reshape(rig, rig.hips, [0.98, 1, 0.95]);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [0.85, legScale(12, L1, ANK), 0.85], [0, 0, 0], { ankle: ANK });
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [0.85, 1.4, 0.85]);
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  rig.neck.position.y = 13.1 * PX;   // (the head on a short neck of bare vertebrae)
  const D = voxDensity(rig), K = kit(rig, mat, { seed: 37, rough: 0.8, density: D });
  const hk = HS, T = rig.torso, H = rig.hips;
  const BONES = [bone, bone, boneD, 0xd0c6aa], OL = [olive, olive, oliveD, ...CAMO];
  dropMeshes(rig, T);
  // arms: camo short sleeves, then bare bones: the humerus, a knobby elbow,
  // the two forearm bones, a wrist, the bones of the hand and four fingers
  for (const arm of [rig.armR, rig.armL]) {
    const sx = arm === rig.armR ? -1 : 1;
    dropMeshes(rig, arm);
    K.vox(arm, 0, -0.4, 0, 3.6, 4.6, 4, OL, { j: 0.16 });
    K.box(arm, 0, -2.5, 0, 3.8, 0.7, 4.2, oliveD);                                   // the hem
    K.box(arm, 0, -4.6, 0, 1.4, 3.8, 1.4, bone); K.box(arm, 0, -3.1, 0, 1.8, 0.8, 1.8, boneD);
    K.box(arm, 0, -6.5, -0.1, 2.1, 1.4, 2.1, boneD); K.box(arm, 0, -6.6, -0.9, 1.2, 1.2, 0.8, bone);   // the elbow and its point
    K.box(arm, -0.45, -8.4, 0.1, 0.75, 3, 0.75, bone); K.box(arm, 0.45, -8.4, -0.1, 0.7, 3, 0.7, BONES[3]);
    K.box(arm, 0, -9.9, 0, 1.9, 0.8, 1.9, boneD);                                    // the wrist
    K.box(arm, 0, -10.8, 0.1, 1.9, 1.2, 1.4, bone);
    for (const [dz, L] of [[-0.6, 1.4], [-0.05, 1.6], [0.5, 1.5]]) { K.box(arm, -sx * 0.1, -12, dz, 0.45, L, 0.45, bone); K.box(arm, -sx * 0.1, -12.9, dz + 0.15, 0.4, 0.7, 0.4, boneD); }
    K.box(arm, sx * 0.85, -11.2, 0.6, 0.45, 1.3, 0.45, bone, 0, 0, sx * 0.4);       // the thumb
  }
  // legs: camo shorts with cargo pockets to above the knee, the femur, a
  // kneecap, shin bones and low combat boots
  for (const leg of [rig.legR, rig.legL]) {
    const sx = leg === rig.legR ? -1 : 1;
    dropMeshes(rig, leg);
    K.vox(leg, 0, -1.6, 0, 4.4, 3.8, 4.4, OL, { j: 0.16 });
    K.box(leg, 0, -3.6, 0, 4.6, 0.6, 4.6, oliveD);
    K.box(leg, sx * 2.35, -2, 0.2, 0.7, 2.2, 2.4, oliveD); K.box(leg, sx * 2.5, -1.1, 0.2, 0.4, 0.5, 2.4, olive);   // the cargo pocket
    K.box(leg, 0, -4.4, -0.1, 1.5, 1.6, 1.5, bone);                                   // the femur below the hem
    K.box(leg, 0, -5.3, 0.3, 2.2, 1.1, 2.2, boneD); K.box(leg, 0, -5.3, 1.35, 1.3, 1.2, 0.5, bone);   // the knee and kneecap
    K.box(leg, -0.4, -6.4, 0.2, 1.1, 1.4, 1.1, bone); K.box(leg, 0.55, -6.4, -0.1, 0.7, 1.4, 0.7, BONES[3]);
    const B = pal.boot ?? { upper: 0xa08a5a, sole: 0x3a3026, lace: 0x5a4a30 };
    K.box(leg, 0, -11.55, 0.5, 5, 0.9, 5.8, B.sole);
    K.vox(leg, 0, -9.6, 0.4, 4.7, 3.2, 5.2, [B.upper, B.upper, 0x8a7448], { j: 0.08 });
    K.box(leg, 0, -7.6, 0, 4.6, 1.2, 4.6, B.upper); K.box(leg, 0, -7.05, 0, 4.7, 0.4, 4.7, 0x7a6a44);
    for (let i = 0; i < 3; i++) K.box(leg, 0, -7.6 - i * 0.95, 2.45 + (i > 1 ? 0.25 : 0), 2.2, 0.35, 0.3, B.lace);
  }
  // helmet: olive dome with a rim, ear pads, a goggles band and a strap
  // (headwear: its own kit, so perf/bodysize.cjs can leave it out)
  const Hd = rig.head;
  const KH = kit(rig, mat, { seed: 38, rough: 0.8, density: D });
  if (helmet) {
    KH.vox(Hd, 0, 8.6 * hk, 0, 9.6 * hk, 3, 9.6 * hk, OL, { j: 0.16, faces: 'tlrfk' }); KH.vox(Hd, 0, 10.2 * hk, -0.2, 8 * hk, 1.4, 8 * hk, OL, { j: 0.16, faces: 'tlrfk' });
    KH.box(Hd, 0, 7.1 * hk, 0.3, 10.6 * hk, 1, 10.8 * hk, oliveD);
    for (const sx of [-1, 1]) { KH.box(Hd, sx * 5 * hk, 4.6 * hk, 0, 1.6, 4, 3.6, oliveD); KH.box(Hd, sx * 5.4 * hk, 4.6 * hk, 0, 0.6, 2.8, 2.6, 0x1e2414); }
    KH.box(Hd, 0, 8.4 * hk, 5 * hk, 7 * hk, 1.6, 1, 0x1e1a14); for (const sx of [-1, 1]) { KH.box(Hd, sx * 1.8 * hk, 8.4 * hk, 5.2 * hk + 0.5, 2.6, 1.8, 1.2, 0x5a6a5a); KH.box(Hd, sx * 1.8 * hk, 8.4 * hk, 5.2 * hk + 1.1, 1.6, 1, 0.2, 0x9ab0a0); }
    KH.box(Hd, 0, 0.3 * hk, 2.6, 8.4 * hk, 0.5, 0.5, oliveD);
  }
  // a lower jaw hinged under the painted skull, the teeth along it
  K.box(Hd, 0, -0.3, 1.6, 5.6, 0.9, 5.2, bone); for (let x = -2; x <= 2.01; x += 1) K.box(Hd, x, 0.25, 4.2, 0.6, 0.5, 0.3, 0xf0e8d0);
  // the neck: vertebrae from the trunk to the skull
  for (const [y, w] of [[12.25, 1.9], [12.85, 1.6]]) K.box(T, 0, y, -0.4, w, 0.5, w, y > 12.5 ? bone : boneD);
  // the trunk: the ribcage under a plate carrier, its lowest ribs showing at
  // the sides, then the lumbar spine and the pelvis down to the belt
  K.box(T, 0, 8.4, -0.3, 7.6, 6.8, 3.8, 0x2a2416);                                    // (dark inside)
  K.vox(T, 0, 8.1, 0, 8.8, 7.2, 5.4, OL, { j: 0.16, faces: 'fklrt' });              // the plate carrier
  K.box(T, 0, 4.4, 0, 8.6, 0.5, 5.2, oliveD);
  for (const x of [-2.8, 0, 2.8]) { K.vox(T, x, 5.6, 3.05, 2.4, 2.6, 1.2, [olive, oliveD], { faces: 'ftlr' }); K.box(T, x, 6.9, 3.2, 2.5, 0.6, 1.3, oliveD); K.box(T, x, 6.5, 3.7, 0.6, 0.6, 0.2, 0x1e1a14); }
  for (const sx of [-1, 1]) { K.box(T, sx * 2.8, 11.9, 0, 1.8, 0.8, 5.6, oliveD); K.box(T, sx * 2.8, 10.5, 2.75, 1.6, 2.2, 0.3, olive); }
  K.box(T, -1.6, 9.6, 2.85, 2, 1.2, 0.3, 0x3a3020);                                  // a name tape
  for (const [y, w] of [[3.9, 7.6], [3.2, 6.8]]) for (const sx of [-1, 1]) K.box(T, sx * (w / 2 - 0.9), y, 0.6, 1.8, 0.5, 3.6, bone, 0, 0, sx * 0.25);   // the floating ribs
  for (let i = 0; i < 4; i++) { const y = 4.1 - i * 0.75; K.box(T, 0, y, -0.9, 1.5, 0.55, 1.4, i % 2 ? boneD : bone); K.box(T, 0, y, -1.75, 0.5, 0.45, 0.6, boneD); }   // the lumbar spine
  for (const sx of [-1, 1]) { K.box(T, sx * 2, 1.6, -0.3, 3, 1.6, 3, bone, 0, 0, sx * 0.3); K.box(T, sx * 2.6, 1.2, 1.3, 1, 1, 1, boneD); }   // the pelvis, its hip bones
  K.box(T, 0, 0.9, -1, 2.2, 1.6, 1.6, boneD);                                         // the sacrum
  K.box(H, 0, 0.3, 0, 8.6, 1.2, 4.6, 0x3a3020); K.box(H, 0, 0.3, 2.35, 1.4, 1, 0.3, 0x8a8a7a);   // the belt and its buckle
  for (const sx of [-1, 1]) K.box(H, sx * 3.4, 0.2, 2.2, 1.6, 1.4, 0.9, oliveD);
  if (gear) {
    // the rifle, levelled forward from the hip (built along +z: see the hand-axis
    // convention in character.js; level, not tipped up by HOLD_PITCH, so the
    // aim below holds it level at the target)
    const gun = group(rig.handR, 0, -1, 2, 0, 0, 0);
    const metal = 0x2a2a2c, wood = 0x5a3e24;
    K.box(gun, 0, 0, 2, 1.6, 2.2, 13, metal); K.box(gun, 0, -2.6, 1.6, 1.2, 4, 1.6, metal); K.box(gun, 0, -2.4, 4.8, 1.3, 3.6, 1.4, 0x3a3a3c);
    K.box(gun, 0, -0.6, -6.6, 1.6, 2.6, 4.4, wood); K.box(gun, 0, 0.3, 9, 1.8, 1.8, 3.4, wood);
    K.box(gun, 0, 0.4, 12.5, 0.8, 0.8, 5, metal); K.box(gun, 0, 1.6, 2, 1, 0.8, 3, 0x1a1a1c);
    rig.extras.gun = gun;
    rig.extras.muzzle = group(gun, 0, 0.4, 15); markTip(gun, 0, 0.4, 15, 'rifle');
  }
  // a shooter: the wind-up of a shot shoulders the weapon and holds it level
  // at the target, the shot kicks it (character.js aimPose); the Pale King
  // (champions.js) aims his sword the same way
  rig.levelAim = true;
  applyShape(rig);
  K.done(); markHeadwear(rig, () => KH.done());
  return rig;
}

// Spartoi (design/concept/vox-spartoi.png): the sown men, skeletons grown
// from dragon's teeth. Old ivory bones with dark sockets inside a bronze
// Corinthian helmet with cheek guards and a tall teal horsehair crest; a
// rust-orange scarf, a tattered desert-tan tunic hanging in rags with teal
// strips and a ragged cloak down the back, crossed leather belts, stepped
// bronze shoulder plates, leather-and-bronze bracers, bronze greaves over
// heavy brown boots; a curved bronze kopis in the right hand and a big round
// bronze hoplite shield with a black dragon on the left arm.
export function buildSpartoi() {
  const bone = 0xe6dcc0, boneD = 0xb8ac8c, tan = 0xc8a46a, tanD = 0x9a7a48, tanL = 0xe2c48e, teal = 0x2a8080, tealD = 0x1a5a5e;
  const rust = 0xe06a28, rustD = 0xb04a1c, brz = 0xc08a2c, brzD = 0x80541a, brzL = 0xe8b448, lea = 0x5e3a20, leaD = 0x3a2414;
  const CREST = [0x1a6a72, 0x125660, 0x2a8a8a, 0x0e4450], RAG = [tan, tanD, tanL, tan, teal, tealD], CAPE = [rust, rustD, tan, tanL, rust, teal];
  const mat = skinMat('spartoi', (S) => {
    paintPerson(S, { skin: bone, eye: 0x0a0806, eyeWhite: 0x0a0806, brow: boneD, mouth: false, top: tan, sleeve: bone, shortSleeve: true, hand: bone, pants: tanD, shoes: lea,
      face: skullFace(boneD),
      body: (s) => { for (const [x0, y0, w, h] of [[16, 16, 24, 16], [16, 32, 24, 16]]) for (let i = 0; i < w * h / 5; i++) s.rect(x0 + s.r() * w, y0 + s.r() * h, 1, 1.5, RAG[Math.floor(s.r() * RAG.length)], 0); } });
    S.shadeLimbs(); S.saturate(1.15);
  }, { emit: 0.8, res: 2 });
  // (the sown men were grown soldiers, so they stand as the skeleton warrior
  // does: a grown man's size, not a giant's, about 1.25x Percy's body without
  // the helmet and its crest, and the crest low enough that the whole stands
  // under 1.4x (design/sizes.json "adult"): rig scale 1.38, a grown man's
  // proportions by proportions.js reshape (the skull 0.92 of a hero's, legs
  // 12 → 19 pixels over the same boots, a longer trunk, slimmer limbs, arms to
  // mid-thigh, bare neck vertebrae), its rags, plates and crest drawn in cells
  // of a hero's voxel size (voxDensity): more cells, not bigger ones)
  const rig = new Rig({ material: mat, scale: 1.38, armW: 3 });
  const L1 = 19, ANK = -9;
  reshape(rig, rig.head, 0.92);
  reshape(rig, rig.torso, [0.98, 1.1, 0.95]);
  reshape(rig, rig.hips, [0.98, 1.1, 0.95]);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [0.85, legScale(12, L1, ANK), 0.85], [0, 0, 0], { ankle: ANK });
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [0.85, 1.4, 0.85]);
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  rig.neck.position.y = 13.1 * PX;
  const D = voxDensity(rig), K = kit(rig, mat, { seed: 83, rough: 0.7, metal: 0.05, density: D });
  const T = rig.torso, Hd = rig.head;
  // arms: stepped bronze shoulder plates, bare bones, a knobby elbow, a
  // leather bracer with bronze bands, bony hands
  for (const arm of [rig.armR, rig.armL]) {
    dropMeshes(rig, arm);
    K.box(arm, 0, 0.9, 0, 4.6, 2, 5, brz); K.box(arm, 0, -0.6, 0, 4.9, 1.3, 5.2, brzD); K.box(arm, 0, -1.7, 0, 4.4, 1.1, 4.6, brz);
    K.box(arm, 0, 1.9, 0, 3.6, 0.5, 4.2, brzL);
    K.box(arm, 0, -4.2, 0, 1.5, 4, 1.5, bone); K.box(arm, 0, -6.4, 0, 2.2, 1.6, 2.2, boneD);
    K.box(arm, 0, -8.6, 0, 2.7, 3.2, 2.7, lea); for (const y of [-7.3, -9.9]) K.box(arm, 0, y, 0, 2.9, 0.6, 2.9, brzL);
    K.box(arm, 0, -10.6, 0, 2.2, 1.6, 2.2, bone); for (const dz of [-0.7, 0, 0.7]) K.box(arm, 0, -11.8, dz, 0.5, 1.2, 0.5, boneD);
  }
  // legs: bone thighs under the rags, knee knobs, bronze greaves, big boots
  for (const leg of [rig.legR, rig.legL]) {
    dropMeshes(rig, leg);
    K.box(leg, 0, -2, 0, 3.4, 3.6, 3.4, tanD);
    K.box(leg, -0.4, -4.8, 0, 1.3, 3.4, 1.3, bone); K.box(leg, 0.5, -4.8, 0, 0.9, 3.4, 0.9, boneD);
    K.box(leg, 0, -6.6, 0.3, 2.4, 1.6, 2.4, boneD);
    K.box(leg, 0, -8.4, 0.3, 3.4, 2.8, 3.2, brz); K.box(leg, 0, -8.4, 1.95, 1.2, 2.6, 0.3, brzL); K.box(leg, 0, -7, 0.3, 3.6, 0.6, 3.4, brzD);
    K.box(leg, 0, -10.6, 0.5, 4.4, 2.4, 5, lea); K.box(leg, 0, -9.5, 0.3, 4.6, 0.8, 4.4, leaD);
    K.box(leg, 0, -11.7, 0.8, 4.8, 0.7, 6, leaD); K.box(leg, 0, -10.8, 3, 3.6, 1.6, 0.6, lea);
  }
  // the tunic: rags over the ribs, hanging in a ragged skirt; crossed belts
  K.vox(T, 0, 6.6, 0, 8.4, 8.4, 4.6, [tan, tan, tanD, tanL], { j: 0.12 });
  K.clumps(T, [0, 6.6, 0], [8.4, 8.4, 4.6], { n: 22, size: [1, 1.7], cols: RAG, faces: 'fklr', out: -0.3 });
  for (const [y, w] of [[12.3, 1.8], [12.85, 1.5]]) K.box(T, 0, y, -0.4, w, 0.55, w, y > 12.5 ? bone : boneD);   // the neck's vertebrae
  for (const y of [8.4, 6.8]) for (const sx of [-1, 1]) K.box(T, sx * 2.4, y, 2.45, 2.6, 0.7, 0.4, bone);    // ribs showing through the rags
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, x = Math.sin(a) * 4.4, z = Math.cos(a) * 2.6, L = 4 + K.r() * 4.5;
    K.flare(rig.hips, x, -L / 2 + 0.8, z, 1.9, L, 0.6, RAG[i % RAG.length], a, 0.1);
  }
  K.box(T, 0, 1.5, 0, 9, 1.6, 5, lea); K.box(T, 0, 1.5, 2.6, 2, 1.6, 0.4, brzL); K.box(T, 0, 1.5, 2.8, 0.8, 0.6, 0.2, leaD);
  K.box(T, 0, 6.5, 2.55, 1.2, 12, 0.5, lea, 0, 0, 0.62); K.box(T, 0, 6.5, -2.55, 1.2, 12, 0.5, lea, 0, 0, -0.62);
  K.box(T, -1.2, 7.8, 2.85, 1, 1, 0.3, brzL);
  // the scarf: wound round the neck and draped over the chest and shoulders
  K.vox(T, 0, 11.9, 0, 9.2, 1.8, 5.6, [rust, rust, rustD], { j: 0.1 });
  for (const [y, w] of [[10.6, 8.4], [9.4, 6.6], [8.2, 4.8], [7.1, 3]]) K.box(T, 0.4, y, 2.75, w, 1.3, 0.7, y > 9 ? rust : rustD);
  K.clumps(T, [0, 11.6, 0], [9.2, 1.6, 5.6], { n: 14, size: [0.9, 1.4], cols: [rust, rustD, 0xf08a40], faces: 'tlrfk' });
  for (let i = 0; i < 3; i++) K.box(T, -4.4 + i * 0.4, 9.4 - i * 1.4, 2.2 - i * 0.3, 1.2, 2.6, 1, i % 2 ? rustD : rust, 0, 0, 0.2);
  // a ragged cloak down the back, rust and tan with a teal strip
  for (let x = -4.2; x <= 4.3; x += 1.2) { const L = 9 + K.r() * 7; K.box(T, x, 12 - L / 2, -2.75 - K.r() * 0.3, 1.3, L, 0.6, K.tone(CAPE, 0.1)); }
  // helmet: a bronze Corinthian helmet with a brow band, cheek guards and a
  // nose guard round a T-shaped opening, and a tall horsehair crest
  const hk = HS, H8 = 8 * hk;
  const KH = kit(rig, mat, { seed: 84, rough: 0.7, metal: 0.05, density: D });   // (the helmet and crest: headwear)
  KH.box(Hd, 0, H8 + 1.1, -0.2, H8 - 2.4, 1, H8 - 2.4, brzL);
  KH.vox(Hd, 0, H8 + 0.3, -0.2, H8 - 0.4, 1, H8 - 0.4, [brz, brz, 0xb07a24, brzL], { j: 0.1, faces: 'tlrfk' });
  KH.box(Hd, 0, H8 - 1, 0, H8 + 1, 1.8, H8 + 1, brzD);
  KH.box(Hd, 0, H8 - 1.2, H8 / 2 + 0.5, H8 + 0.6, 1.6, 0.5, brzL);
  KH.vox(Hd, 0, H8 / 2 - 0.6, -H8 / 2 - 0.35, H8 + 0.4, H8 - 0.2, 0.7, [brz, brz, 0xb07a24], { j: 0.1, faces: 'k' });
  KH.box(Hd, 0, -0.2, -H8 / 2 - 0.6, H8 - 1, 1, 0.8, brzD, -0.3);
  for (const sx of [-1, 1]) {
    KH.vox(Hd, sx * (H8 / 2 + 0.3), H8 / 2 - 0.6, 0, 0.7, H8 - 0.2, H8 + 0.4, [brz, brz, 0xb07a24], { j: 0.1, faces: sx > 0 ? 'r' : 'l' });
    KH.box(Hd, sx * (H8 / 2 + 0.2), H8 - 0.2, -H8 / 2 + 0.2, 0.7, 1.6, 1.6, brzD);
    KH.box(Hd, sx * 3.75, 1.5, H8 / 2 + 0.45, 1.8, 3.6, 0.9, brz); KH.box(Hd, sx * 3.9, 0.1, H8 / 2 + 0.6, 1.6, 0.6, 0.6, brzL);
    KH.box(Hd, sx * (H8 / 2 + 1.15), 1.4, 2.2, 0.3, 2.4, 3, brzD);
  }
  KH.box(Hd, 0, 5.4, H8 / 2 + 0.55, 1.1, 2.6, 0.8, brz);
  KH.box(Hd, 0, H8 + 1.8, -0.2, 1.6, 1, H8 + 0.6, brzD);
  for (let z = -5.6; z <= 4.8; z += 1.05) {
    const t = (z + 5.6) / 10.4, h = 2.2 + Math.sin(t * Math.PI) * 1.5 + (KH.r() - 0.5) * 0.6;   // (a low crest, so helmet and crest top him at under 1.4x Percy)
    KH.box(Hd, 0, H8 + 2.2 + h / 2, z, 2 + KH.r() * 0.4, h, 1.2, KH.tone(CREST, 0.1), -0.25 + t * 0.2);
  }
  for (let i = 0; i < 5; i++) KH.box(Hd, (KH.r() - 0.5) * 0.8, H8 + 1 - i * 1.6, -H8 / 2 - 1.3 - i * 0.2, 1.8, 2, 1.2, KH.tone(CREST, 0.1), 0.2);
  // the curved bronze sword, widening toward the tip. It is held turned over
  // about its own length (rz = PI), so the curve sweeps back like a scimitar's
  // rather than hooking forward
  const blade = group(rig.handR, 0, -1, 1, HOLD_PITCH - Math.PI / 2, 0, Math.PI);   // (built along +z: see the hand-axis convention in character.js)
  K.box(blade, 0, 0, -0.4, 1.2, 1.2, 3, leaD); K.box(blade, 0, 0, -1.9, 1.5, 1.5, 0.8, brzL); K.box(blade, 0, 0, 1.4, 1, 2.6, 0.7, brzL);
  for (let i = 0; i < 6; i++) {
    const z = 2.6 + i * 1.5, y = -0.1 * i * i + 0.2 * i, h = 1.5 + i * 0.22;
    K.box(blade, 0, y, z, 0.5, h, 1.6, i % 2 ? brz : 0xd09838, 0.08 * i - 0.1);
    K.box(blade, 0, y - h / 2 + 0.2, z, 0.55, 0.4, 1.6, brzL, 0.08 * i - 0.1);
  }
  K.box(blade, 0, -1.6, 11.5, 0.5, 1.6, 1.4, 0xd09838, 0.7); K.box(blade, 0, -2.4, 12.1, 0.45, 1, 0.8, brzL, 0.9);
  markTip(blade, 0, -2.4, 12.6, 'kopis'); rig.extras.blade = blade;
  // the shield: a big round bronze aspis with a raised rim, a mottled
  // bronze and teal face and a black dragon on it
  const sh = group(rig.armL, -0.4, -5.4, 2.8, 0, -0.3, 0), R = 6.6;
  for (let y = -R + 0.5; y < R; y += 1) {
    const hw = Math.sqrt(R * R - y * y);
    K.box(sh, 0, y, 0, hw * 2, 1.05, 1, brzD);
    if (hw > 1.4) K.box(sh, 0, y, 0.45, hw * 2 - 1.8, 1.05, 0.5, K.tone([brz, 0xb07a24, 0xc89434], 0.08));
  }
  for (let y = 1.5; y < R - 0.5; y += 1) { const hw = Math.sqrt(R * R - y * y); K.box(sh, 0, y, 0.55, 0.9, 1.02, 0.5, brzL); for (const sx of [-1, 1]) K.box(sh, sx * (hw - 0.45), y, 0.55, 0.9, 1.02, 0.5, brzL); }
  for (let i = 0; i < 9; i++) { const a = K.r() * Math.PI * 2, r = 1.5 + K.r() * 3.2; K.box(sh, Math.cos(a) * r, Math.sin(a) * r, 0.72, 1 + K.r(), 1 + K.r(), 0.2, K.r() < 0.5 ? teal : tealD); }
  const ink = 0x16100c;
  for (const [x, y, w, h, rz] of [[1.7, -2.1, 1.9, 4.2, 0.5], [0.4, 0.6, 3.2, 1.9, 0.2], [-2, 0.95, 2.2, 1.1, 0.1], [-1.7, -0.45, 2.5, 0.7, -0.35], [-3.1, 0.4, 0.5, 0.9, 0],
    [1.3, 2, 0.7, 2.2, -0.7], [2.2, 1.4, 0.7, 2, -1], [2.9, -0.5, 0.6, 1.6, -1.2], [3.1, -2.2, 0.6, 1.4, -1.3], [2.4, -4.2, 2.2, 1, 0.4]]) K.box(sh, x, y, 0.85, w, h, 0.25, ink, 0, 0, rz);
  K.box(sh, -0.2, 1.1, 0.98, 0.6, 0.5, 0.15, 0xf0b040);
  rig.extras.shield = sh;
  applyShape(rig);
  K.done(); markHeadwear(rig, () => KH.done());
  return rig;
}

// Living statue: a hoplite Medusa turned to stone and woken again: crested
// Corinthian helmet, cuirass, a pleated kilt, greaves, a round shield with a
// gorgon face, a raised spear arm, chips, cracks and moss, on a broken plinth.
export function buildStatue() {
  const ST = [0xa8a49a, 0x9a968c, 0xb8b4aa, 0x8a867c], dark = 0x5a5650, moss = [0x5a7a3a, 0x4a6a2e, 0x6a8a44];
  const mat = skinMat('gorgon_statue', (S) => {
    paintPerson(S, { skin: ST[0], hair: ST[3], fringe: 2, hairSide: 3, eye: 0x6a665e, eyeWhite: 0xb8b4aa, frown: true, lipstick: 0x7a766e, top: ST[1], sleeve: ST[0], hand: ST[0], pants: ST[3], shoes: 0x7a766e, collar: ST[2], shortSleeve: true });
    for (let i = 0; i < 40; i++) { let x = S.r() * 64, y = S.r() * 64; for (let k = 0; k < 5; k++) { S.dot(x, y, 0x4a4640); x += S.r() < 0.5 ? 0.5 : 0; y += 0.5; } }
    for (let i = 0; i < 70; i++) S.dot(S.r() * 64, S.r() * 64, moss[i % 3], 2, 1);
    S.shadeLimbs(undefined, 1.1, 0.8);
  }, { emit: 0, rough: 0.95, fill: 0.08, res: 2 });
  // (a statue of a grown hoplite: a grown man's size, not a giant's, about
  // 1.25x Percy's body without the helmet and crest, under 1.4x with them
  // (design/sizes.json "adult"): rig scale 1.37, a grown man's proportions by
  // proportions.js reshape (the head 0.92 of a hero's, legs 12 → 19 pixels
  // over the same plinth, a longer trunk, slimmer limbs, longer arms), the
  // stone of the cuirass, helmet and shield in cells of a hero's voxel size)
  const rig = new Rig({ material: mat, scale: 1.37 });
  const L1 = 19, ANK = -10.7;
  reshape(rig, rig.head, 0.92);
  reshape(rig, rig.torso, [0.98, 1.1, 0.95]);
  reshape(rig, rig.hips, [0.98, 1.1, 0.95]);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [0.88, legScale(12, L1, ANK), 0.88], [0, 0, 0], { ankle: ANK });
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [0.88, 1.35, 0.88]);
  markHeadCore(rig, [0, 4 * HS, 0], [8 * HS, 8 * HS, 8 * HS]);   // (the skin cube, measured along the head's own axis: the statue's head is turned)
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  const D = voxDensity(rig), K = kit(rig, mat, { seed: 59, rough: 0.95, fill: 0.05, density: D });
  const hk = HS, Hd = rig.head;
  // Corinthian helmet with cheek guards and a tall crest
  const KH = kit(rig, mat, { seed: 60, rough: 0.95, fill: 0.05, density: D });   // (the helmet and crest: headwear)
  KH.vox(Hd, 0, 6.6 * hk, -0.2, 9.4 * hk, 3.6 * hk, 9.4 * hk, ST, { j: 0.08, relief: 0.06, faces: 'tlrfk' });
  for (const sx of [-1, 1]) KH.box(Hd, sx * 3.4 * hk, 3.4 * hk, 4.4 * hk, 2 * hk, 4 * hk, 1, ST[1]);
  KH.box(Hd, 0, 4.8 * hk, 4.5 * hk, 1.2, 2.6 * hk, 1, ST[2]);
  for (let z = -5; z <= 4; z += 1.1) KH.box(Hd, 0, 9.4 * hk + 1.6 - Math.abs(z + 0.5) * 0.25, z * hk, 1.6, 3.4, 1.3, KH.tone(ST, 0.06));
  KH.clumps(Hd, [0, 9.4 * hk + 2, -0.5 * hk], [1.6, 2, 9 * hk], { n: 6, size: [0.8, 1.2], cols: moss, faces: 'tlr' });
  // cuirass with sculpted chest, a pleated stone kilt and greaves
  const T = rig.torso;
  K.vox(T, 0, 7.5, 0, 9, 9, 5, ST, { j: 0.08, relief: 0.06 }); K.box(T, -1.6, 9.2, 2.6, 3, 2.4, 0.5, ST[2]); K.box(T, 1.6, 9.2, 2.6, 3, 2.4, 0.5, ST[2]);
  for (const y of [5, 3.6]) K.box(T, 0, y, 2.6, 5, 0.8, 0.5, ST[3]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, L = 4; K.flare(rig.hips, Math.sin(a) * 4.4, -L / 2 + 0.8, Math.cos(a) * 2.6, 1.9, L, 0.7, ST[i % 2 ? 1 : 3], a, 0.12); }
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 0, -8.2, 0.3, 4.6, 5, 4.6, ST[2]); K.box(leg, 0, -6, 0.3, 4.7, 0.6, 4.7, ST[3]); }
  for (const arm of [rig.armR, rig.armL]) K.box(arm, 0, 1, 0, 4.8, 3, 4.8, ST[1]);
  // chips and moss over everything, and cracks that glow faintly green (Medusa's curse)
  K.clumps(T, [0, 6, 0], [9, 12, 5], { n: 26, size: [0.8, 1.3], cols: [...moss, dark], faces: 'tfklr', out: -0.3 });
  // round shield with a gorgon face, held up on the left arm
  const sh = markHeld(group(rig.handL, 1, -4, 2));
  K.vox(sh, 0, 0, 0, 10, 10, 1.2, ST, { j: 0.08, faces: 'fk' }); K.box(sh, 0, 0, 0.3, 11, 7, 1, ST[1]); K.box(sh, 0, 0, 0.3, 7, 11, 1, ST[1]);
  K.box(sh, 0, 0, 0.8, 4, 4.4, 0.6, ST[2]);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.box(sh, Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0.9, 1, 1, 0.5, ST[3]); }
  for (const sx of [-1, 1]) K.box(sh, sx * 0.9, 0.6, 1.15, 0.6, 0.6, 0.3, dark);
  K.box(sh, 3.5, -3.5, 0.7, 2.4, 2.4, 0.4, moss[0]);
  // a stone spear in the raised right hand, snapped short
  const sp = group(rig.handR, 0, -1, 0, HOLD_PITCH);
  K.box(sp, 0, 4, 0, 1.2, 18, 1.2, ST[3]); K.box(sp, 0, 14, 0, 2.2, 4, 0.8, ST[2]); K.box(sp, 0, -6, 0, 1.2, 2, 1.2, ST[1]);
  markTip(sp, 0, 16, 0, 'stone spear');
  // a cracked plinth stuck to its feet
  for (const leg of [rig.legR, rig.legL]) { K.box(leg, 0, -11.4, 0.5, 5.4, 2, 6.4, ST[3]); K.box(leg, 0.8, -12, 1.8, 3, 1, 3, 0x7a766e); K.clumps(leg, [0, -11.4, 0.5], [5.4, 2, 6.4], { n: 6, size: [0.6, 1], cols: moss, faces: 'tf', out: -0.3 }); }
  applyShape(rig);
  K.done(); markHeadwear(rig, () => KH.done());
  rig.statuePose = (r) => { r.armR.rotation.set(-2.3, 0, 0.3); r.handR.rotation.x = 1.5; r.armL.rotation.set(-1.3, 0.5, -0.2); r.head.rotation.set(0.25, 0.5, 0); r.torso.rotation.set(0.12, -0.3, 0); r.legR.rotation.x = 0.3; r.legL.rotation.x = -0.25; };
  rig.statuePose(rig);
  return rig;
}

// Restless spirit: a drowned-pale ghost with long drifting hair, hollow
// glowing eyes and a gaping mouth, in a tattered shroud that thins into wisps
// instead of legs, broken shackles still on its wrists.
export function buildGhost() {
  const mat = skinMat('ghost', (S) => {
    paintPerson(S, { skin: 0xa8e0ec, hair: 0x7ab0c4, fringe: 2, hairSide: 4, hairBack: 7, eye: 0x0a1a2a, eyeWhite: 0x0a1a2a, brow: 0x5a8898, mouth: false, top: 0x8ac0d4, sleeve: 0x8ac0d4, hand: 0xc0eef8, skirt: 0x7ab0c4, skirtLen: 12, pants: 0x7ab0c4,
      face: (s, ey) => { s.rect(9, ey - 1, 2, 2, 0x0a1a2a, 0); s.rect(13, ey - 1, 2, 2, 0x0a1a2a, 0); s.dot(9.5, ey - 0.5, 0xffffff); s.dot(13.5, ey - 0.5, 0xffffff); s.rect(11, ey + 2, 2, 2.5, 0x0a1a2a, 0); s.dot(9, ey + 1, 0x6a98a8, 2, 1); s.dot(13, ey + 1, 0x6a98a8, 2, 1); },
      body: (s) => { for (let i = 0; i < 50; i++) s.dot(16 + s.r() * 24, 20 + s.r() * 12, s.r() < 0.5 ? 0x6aa0b4 : 0xb0e0ec, 1, 2); } });
    S.saturate(1.1);
  }, { emit: 3, fill: 0.7, dissolve: 0.3, res: 2, scale: 1.74 });
  // (a spirit keeps the size it had alive, and the dead were grown people, so
  // the ghost stands as an adult, about 1.25x Percy's body: rig scale 1.74,
  // with a grown-up's smaller head (reshape) on the same shoulders, its skin
  // painted finer (skinMat scale) and its shroud, hair and wisps sculpted in
  // cells of a hero's voxel size (voxDensity), not its cells scaled up)
  const rig = new Rig({ material: mat, scale: 1.74, armW: 3 });
  reshape(rig, rig.head, 0.9);
  for (const leg of [rig.legR, rig.legL]) dropMeshes(rig, leg);
  const K = kit(rig, mat, { seed: 67, fill: 0.6, emit: 0.9, density: voxDensity(rig) });
  const SH = [0x8ac0d4, 0x6aa0b4, 0xa8d8e8, 0x5a90a8], hk = HS;
  // a ragged hood of shroud over lank hair
  const Hd = rig.head, H8 = 8 * hk;
  K.box(Hd, 0, H8 + 0.5, -0.6, H8 + 1, 1, H8, SH[0]);
  for (const sx of [-1, 1]) K.box(Hd, sx * (H8 / 2 + 0.5), H8 / 2, -0.6, 1, H8 + 1, H8, SH[1]);
  K.box(Hd, 0, H8 / 2, -H8 / 2 - 0.9, H8 + 2, H8 + 1, 1, SH[0]);
  K.clumps(Hd, [0, H8 / 2 + 0.3, -0.6], [H8 + 1.6, H8 + 1, H8 + 0.6], { n: 46, size: [1, 1.8], cols: SH, faces: 'tlrk', out: -0.15 });
  for (let x = -H8 / 2; x <= H8 / 2; x += 1.3) K.box(Hd, x, H8 + 0.1 - (Math.abs(x) > H8 / 3 ? 0.8 : 0), H8 / 2 + 0.4, 1.4, 1.4 + K.r(), 1, K.tone(SH, 0.1));
  for (let i = 0; i < 9; i++) { const L = 2 + K.r() * 4, x = -H8 / 2 - 0.8 + i * (H8 + 1.6) / 8; K.box(Hd, x, -L / 2 - 0.2, -H8 / 2 - 1.1, 1.3, L, 1.2, K.tone(SH, 0.12)); }
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const L = 2 + K.r() * 3; K.box(Hd, sx * (H8 / 2 + 0.7), -L / 2 - 0.2, -3.5 + i * 2, 1.2, L, 1.3, K.tone(SH, 0.12)); }
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) K.box(Hd, sx * (H8 / 2 - 0.6 - i * 0.9), H8 / 2 - 1 - i * 0.4, H8 / 2 + 0.3, 0.9, H8 * 0.7 - i, 0.6, 0x6a98ac);
  // hollow eyes glow
  for (const sx of [-1, 1]) K.box(Hd, sx * 2 * hk, 4.4 * hk, 4 * hk + 0.15, 1.4, 1.2, 0.3, 0xd0ffff);
  // shroud: a ragged cowl on the shoulders and torn sleeves
  K.clumps(rig.torso, [0, 11, 0], [9, 2, 5], { n: 22, size: [1, 1.8], cols: SH, faces: 'tlrfk' });
  for (const arm of [rig.armR, rig.armL]) {
    for (let i = 0; i < 6; i++) { const L = 2 + K.r() * 3.5, a = i / 6 * Math.PI * 2; K.box(arm, Math.sin(a) * 2, -6 - L / 2, Math.cos(a) * 2, 1.2, L, 1.2, K.tone(SH, 0.1)); }
    K.box(arm, 0, -8.4, 0, 3.8, 1.4, 4.8, 0x3a4a54); K.box(arm, 0, -9.6, 2.2, 0.8, 1.6, 0.8, 0x2a3a44); K.box(arm, 0, -10.8, 2.4, 0.8, 1, 0.8, 0x3a4a54);
  }
  // trailing wisps instead of legs: five swaying tails of shroud that thin out
  for (let i = 0; i < 5; i++) {
    const g = group(rig.hips, -3.2 + i * 1.6, 0.5, (i % 2) * -1);
    for (let k = 0; k < 5; k++) { const w = 2.6 - k * 0.4, y = -1.5 - k * 2.2 - (i % 2); K.box(g, (K.r() - 0.5) * 0.6, y, 0, w, 2.4, w, K.tone(SH, 0.12)); }
    K.box(g, 0, -12.5 - (i % 2), 0, 0.8, 1.2, 0.8, 0xb0f0ff);
    sway(rig, g, 'x', 0.35, 3, i);
  }
  applyShape(rig);   // (the skin box head to its reshaped size)
  K.done();
  rig.float = 1.3; rig.hunch = 0.2;
  return rig;
}
