// Othrys's fodder: the basilisk, and the rare Laistrygonian giant.
import { Rig, PX } from '../../character.js';
import { paintQuad } from '../../quad.js';
import { SerpentRig } from '../../serpent.js';
import { paintPerson } from '../../mortals.js';
import { skinMat, group } from '../../parts.js';
import { addFlames } from '../../flames.js';
import { kit, voxDensity, legScale, reshape, applyShape } from '../../voxkit.js';
import { markHeld, markHeadCore, keepAbove } from '../../rigContract.js';
import { dropAll, noShadow } from './parts.js';
import { finish } from './behaviour.js';

// ---- basilisk ----------------------------------------------------------------------
// The books' basilisk (The Son of Neptune, The Blood of Olympus): a little
// green snake about as long as a man's arm, with an expandable collar of
// white spikes, pale yellow eyes, fiery breath and a poisonous touch; the
// "little king", so a small white crown. Built on the Mist Serpent's spine
// (entities/serpent.js SerpentRig: it slithers, rears and strikes) at under
// half its size, about 1.5 blocks long (a man's arm, stretched a little so a
// trio reads at the game's distance), at the heroes' voxel size. What reads
// in a crowd: the white spiked collar (the rig's hood: it flares in the
// wind-up), the crown, glowing pale yellow eyes, an ember-hot mouth and a
// flickering tongue of flame. The fire puff itself is behave() below.
export function buildBasilisk() {
  const GRN = [0x3a9a3a, 0x2e8a32, 0x48aa42, 0x2a7a2e], DARK = 0x16401a, BELLY = 0xd8e0a0, BELLYD = 0xb8c480;
  const SPIKE = 0xeef0e6, SPIKED = 0xc0c4b8, TIP = 0xffffff, EYE = 0xfff09a, SLIT = 0x1a1406, EMBER = 0xff5a10, FIRE = 0xff8a1a, FIREH = 0xffd040, FANG = 0xf6f0e0;
  const mat = skinMat('basilisk', (S) => paintQuad(S, { base: GRN[0], dark: DARK, belly: BELLY, back: GRN[1], eye: EYE, eyeLow: FIREH, nose: DARK, teeth: FANG, speckles: 20 }), { emit: 1 });
  const rig = new SerpentRig({ material: mat, scale: 0.5 });
  const K = kit(rig, mat, { share: 'basilisk', seed: 151, rough: 0.5, emit: 0.95, ao: 0.2, density: voxDensity(rig) });
  const NN = rig.segs.indexOf(rig.neck) + 1, L = 3.6;
  // ---- the body: chunky green segments over a pale belly, a dark saddle on every other one
  rig.segs.forEach((g, j) => {
    const w = g.userData.w, h = w * 0.86, ov = Math.min(1.6, w * 0.3);
    g.userData.len = L;
    K.box(g, 0, 0.1, L / 2, w, h - 0.2, L + ov, K.tone(GRN, 0.08));
    K.box(g, 0, -h / 2 + 0.3, L / 2, w * 0.8, 0.6, L + ov, j % 2 ? BELLY : BELLYD);
    if (w > 2 && j % 2) K.box(g, 0, h / 2 - 0.05, L / 2, w * 0.6, 0.4, L * 0.6, DARK);
    if (j === rig.segs.length - 1) K.box(g, 0, -0.1, -0.9, w * 0.7, h * 0.7, 1.6, GRN[1]);
  });
  // ---- the collar: white spikes radiating round the neck on the two hood
  // groups (rig.hoods: animate() spreads them sideways as it rears to strike)
  const nw = rig.segs[1].userData.w / 2;
  rig.hoods.forEach((Hg, i) => {
    const z = i ? 2.4 : 1.2, len = i ? 4.2 : 3.4;
    for (const a of [-1.9, -1.35, -0.8, -0.27, 0.27, 0.8, 1.35, 1.9]) {
      const r = nw + len / 2 - 0.3, x = Math.sin(a) * r, y = Math.cos(a) * r * 0.9;
      K.box(Hg, x, y, z, 1.2, len, 1.2, i ? SPIKE : SPIKED, 0, 0, -a);
      K.box(Hg, Math.sin(a) * (nw + len), Math.cos(a) * (nw + len) * 0.9, z, 0.7, 0.9, 0.7, TIP, 0, 0, -a);
    }
  });
  // ---- the head: a broad blunt wedge (bigger than the body's taper would
  // give it, so its face reads), ember-hot inside the mouth
  const H = rig.head, J = rig.mouth;
  const hw = (z) => 8.4 - 0.5 * Math.max(0, z - 1), top = (z) => 3 - 0.16 * Math.max(0, z - 2);
  for (let z = -1.2; z < 8.6; z += 1.2) {
    const w = hw(z), t = top(z);
    K.box(H, 0, (t + 0.3) / 2, z, w, t - 0.3, 1.25, K.tone(GRN, 0.06));
    K.box(H, 0, 0.15, z, w - 1.2, 0.3, 1.25, z > 7.8 ? GRN[0] : EMBER);
    if (z > -0.6) {
      const jw = w - 0.6, jh = 1.6 - 0.06 * z;
      K.box(J, 0, -(jh + 0.3) / 2, z, jw, jh - 0.3, 1.25, K.tone(GRN, 0.06));
      K.box(J, 0, -jh + 0.1, z, jw * 0.7, 0.3, 1.25, BELLY);
      K.box(J, 0, -0.15, z, jw - 1.2, 0.3, 1.25, z > 7.8 ? GRN[0] : EMBER);
    }
  }
  // eyes: big glowing pale yellow, a dark slit
  for (const sx of [-1, 1]) {
    const z = 4.2, w = hw(z), y = top(z);
    K.box(H, sx * (w / 2 - 0.3), y + 0.1, z, 1.6, 0.6, 2.4, DARK);
    K.box(H, sx * (w / 2 + 0.1), y - 1, z, 0.5, 1.6, 2, EYE);
    K.box(H, sx * (w / 2 + 0.25), y - 1, z + 0.2, 0.3, 1.5, 0.45, SLIT);
  }
  // the little crown: three white spikes on the crown of the head, the middle tallest, tips aglow
  for (const [x, hgt] of [[-1.8, 2.2], [0, 3.2], [1.8, 2.2]]) {
    const y = top(1.6) + hgt / 2 - 0.2;
    K.box(H, x, y, 1.6, 1.1, hgt, 1.1, SPIKE, -0.35, 0, -x * 0.12);
    K.box(H, x * 1.1, y + hgt / 2 + 0.2, 1.4, 0.6, 0.8, 0.6, TIP, -0.35, 0, -x * 0.12);
  }
  K.box(H, 0, top(1.6) + 0.1, 1.6, 4.6, 0.6, 1.4, SPIKED);   // (the crown's band)
  // fangs (rig.fangs swing down as the jaw opens)
  for (const sx of [-1, 1]) K.box(rig.fangs, sx * 1.4, -0.8, 0, 0.6, 1.6, 0.6, FANG, 0.2);
  // the tongue: a flicker of flame, forked (the rig flicks it in and out)
  K.box(rig.tongue, 0, 0, 1.3, 0.9, 0.6, 2.8, FIRE);
  for (const sx of [-1, 1]) K.box(rig.tongue, sx * 0.45, 0.1, 3.1, 0.5, 0.5, 1.6, FIREH, 0, sx * 0.4, 0);
  K.done();
  // live flame (flames.js): flickers off the forked tip while the tongue is out, and embers at the lips as it rears
  addFlames(rig, { cap: 18, palette: 'fire', rise: 20, turb: 24, drag: 2.5 })
    .source(rig.tongue, { at: [0, 0.1, 3.6], r: 0.5, rate: 34, life: [0.15, 0.32], size: [0.5, 0.9], up: 4, spread: 2, when: () => (rig.tongue.scale.z > 0.6 ? 1 : 0) })
    .source(rig.mouth, { at: [0, 0, 6], r: 1.2, rate: 22, life: [0.2, 0.4], size: [0.5, 0.9], up: 5, spread: 2, when: (e) => (e?.state === 'windup' ? 1 : 0) });
  noShadow(rig, rig.tongue, rig.fangs, ...rig.hoods);
  rig.animate({ dt: 0, speed: 0, action: null });
  return finish(rig, 'basilisk');
}

// ---- Laistrygonian ----------------------------------------------------------------------------
// (vox-ow-fodder-3, middle right) A huge cannibal giant, over twice a hero's
// height: tan skin covered in grey-blue spiral tattoos, a wild black beard
// and hair, bracers and shin wraps of leather, a shaggy fur kilt under a
// belt with a big skull buckle and more skulls; in its raised hand a ball of
// dark bronze cracked with fire, flames streaming off it.
// Built at the heroes' voxel size (voxkit.js voxDensity): a hulking upper
// body sculpted from cells one hero pixel across (the head low between
// heavy shoulders, long arms with fists at the thigh, short thick legs), the
// tattoos inked into the cells; no stretched skin boxes.
export function buildLaistrygonian() {
  const skin = 0xc87840, skinD = 0x9a5a2c, tat = 0x46587a, hair = 0x1a1410, furC = [0x6a4428, 0x4a2e1a, 0x8a5a34, 0x3a2414], bone = 0xece0c8, lea = 0x5a3a20, leaD = 0x3a2414, fire = [0xff6a10, 0xffa020, 0xffe060], ballC = 0x4a2a14;
  const mat = skinMat('laistrygonian', (S) => paintPerson(S, { skin, hair, mouth: false, top: skin, sleeve: skin, hand: skin, pants: lea, shoes: false }), { emit: 1 });
  const rig = new Rig({ material: mat, scale: 2.35, legH: 10, bodyH: 13, bodyW: 11, bodyD: 6.4, armW: 4.4, headS: 8, jacket: false });
  for (const g of [rig.torso, rig.head, rig.armR, rig.armL, rig.legR, rig.legL]) dropAll(rig, g);
  rig.neck.position.y = 11.6 * PX;                        // the head sits low between the shoulders
  rig.handR.position.y = rig.handL.position.y = -12.4 * PX;
  rig.legR.position.x = -3 * PX; rig.legL.position.x = 3 * PX;
  // (head and leg proportions, proportions.js: a giant's head, reshaped to
  // 0.86 (his sheets draw the head 0.18-0.2 of his height, design/sizes.json
  // "headSheet"), on legs stretched from 10 to 12.2 pixels over the same
  // feet, the kilt with them)
  const L1 = 12.2, ANK = -8;
  reshape(rig, rig.head, 0.86);
  reshape(rig, rig.torso, [1.05, 1, 1.03]);
  reshape(rig, rig.hips, [1.05, L1 / 10, 1.03]);
  for (const g of [rig.legR, rig.legL]) reshape(rig, g, [1.03, legScale(10, L1, ANK), 1.03], [0, 0, 0], { ankle: ANK });
  for (const g of [rig.armR, rig.armL]) reshape(rig, g, [1.03, 1.1, 1.03]);
  rig.dims.legH = L1; rig.hips.position.y = L1 * PX;
  const K = kit(rig, mat, { share: 'laistrygonian', seed: 167, rough: 0.85, emit: 0.9, ao: 0.3, density: voxDensity(rig) * 0.92 });   // (cells a touch coarser than a hero's: an elite stays under 20k triangles)
  const T = rig.torso, Hd = rig.head, gold = 0xe8b440, SK = [skin, 0xbc6c36, 0xd4844a], HAIR = [hair, 0x2a2018, 0x141010];
  const sk = () => SK[Math.floor(K.r() * 3)];
  // skin inked with spiral tattoos: rings round a centre (cx, cy in the mass's -1..1)
  const inked = (cx, cy, r = 0.5, side = 0) => (x, y, z) => { if (side && x * side < 0.15) return sk(); const d = Math.hypot(x - cx, y - cy) / r; return d < 1 && Math.floor(d * 3.6) % 2 === 0 ? tat : sk(); };
  // ---- the bulk: a broad inked chest, a hard belly, traps round a short neck
  K.blob(T, [0, 8.6, 0.4], [7, 4.6, 3.6], 1, (x, y, z) => (z < 0.2 ? sk() : inked(x < 0 ? -0.5 : 0.5, 0.15, 0.4)(x, y, z)), { pw: 2.5, run: [1, 2] });
  K.blob(T, [0, 3.6, 0.6], [5.6, 3.6, 3.4], 1, (x, y, z) => (z > 0.6 && Math.abs(x) < 0.06 ? skinD : sk()), { pw: 2.4, run: [2, 4] });
  K.blob(T, [0, 11.6, -0.8], [5.6, 2.2, 3], 1, sk, { pw: 2.2, run: [2, 4] });
  // a fur mantle over the shoulders and down the back
  K.blob(T, [0, 11.4, -2.4], [6.6, 2.4, 2.2], 1, () => furC[Math.floor(K.r() * 4)], { run: [1, 2], keep: (x, y, z) => z < 0.3 });
  K.shag(T, [0, 11.8, -1.6], [12.6, 1.6, 4.6], { cols: furC, step: 1.6, len: [2.4, 4], w: 1.2, low: 1, top: true, sweep: 0.2, bristle: 0.3 });
  for (let x = -6; x <= 6.1; x += 0.8) { const L = 6 + K.r() * 6; K.box(T, x, 11.4 - L / 2, -4.2 - K.r() * 0.4, 0.9, L, 0.8, K.tone(furC, 0.1)); }
  // a bandolier across the chest with gold buckles
  for (let i = 0; i < 10; i++) { const t = i / 9; K.box(T, -5 + t * 10, 13 - t * 10.4, 3.4 + Math.sin(t * Math.PI) * 0.6, 1.3, 1.5, 0.6, i % 2 ? lea : leaD, 0, 0, 0.8); }
  for (const t of [0.25, 0.7]) { K.box(T, -5 + t * 10, 13 - t * 10.4, 4.1 + Math.sin(t * Math.PI) * 0.6, 1.4, 1.4, 0.4, gold); K.box(T, -5 + t * 10, 13 - t * 10.4, 4.3 + Math.sin(t * Math.PI) * 0.6, 0.6, 0.6, 0.3, 0x6a4a1a); }
  // the belt with a skull buckle, bones and little skulls
  K.box(T, 0, 0.8, 0.4, 11, 2, 7.6, lea); K.box(T, 0, 0.8, 0.4, 11.2, 0.4, 7.8, leaD); for (const x of [-3, 3]) K.box(T, x, 0.8, 4.25, 1, 1.4, 0.3, gold);
  K.box(T, 0, 0.6, 4.4, 3.2, 3.2, 1.6, bone); K.box(T, 0, -0.9, 4.5, 2.2, 1, 1.2, 0xd8ccb4); for (const sx of [-1, 1]) K.box(T, sx * 0.7, 1, 5.25, 0.9, 0.9, 0.2, 0x1a1410); K.box(T, 0, -0.1, 5.25, 0.4, 0.5, 0.2, 0x1a1410); for (const x of [-0.6, 0, 0.6]) K.box(T, x, -1.2, 5.15, 0.3, 0.5, 0.2, 0x1a1410);
  for (const [x, s2] of [[-4.4, 1.8], [4.2, 1.6]]) { K.box(T, x, 0, 4.2, s2, s2, 1.2, bone); for (const sx of [-1, 1]) K.box(T, x + sx * s2 * 0.22, s2 * 0.1, 4.85, s2 * 0.25, s2 * 0.25, 0.2, 0x1a1410); }
  for (const x of [-2.6, 2.4, -6]) { K.box(T, x, -1.6, 4.2, 0.6, 3, 0.6, bone); K.box(T, x, -3.2, 4.2, 1.2, 0.6, 0.7, bone); }
  // ---- a shaggy fur kilt to the knee
  for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2, L = 5.4 + K.r() * 2.2; K.flare(rig.hips, Math.sin(a) * 5.4, 1 - L / 2, Math.cos(a) * 3.8 + 0.3, 1.2, L, 0.9, K.tone(furC, 0.12), a, 0.15); }
  // ---- head: a heavy brow over dark eyes, a broad nose, a grin full of teeth
  // in a big black beard, wild black hair, a gold earring
  K.blob(Hd, [0, 4.2, 0.3], [3.6, 4.2, 3.6], 1, sk, { pw: 2.7, run: [2, 4] });
  const fz = 3.9;
  markHeadCore(rig, [0, 4.2, 0.3], [7.2, 8.4, 7.2]);   // (the skull and face: hair and beard aside)
  K.box(Hd, 0, 6, fz - 0.1, 6.4, 1.2, 1.2, hair, -0.15);
  for (const sx of [-1, 1]) { K.box(Hd, sx * 1.4, 5, fz - 0.05, 1.6, 1.1, 0.4, 0xf0e0c0); K.box(Hd, sx * 1.2, 5, fz + 0.1, 0.8, 0.9, 0.3, 0x1a0a00); }
  K.box(Hd, 0, 3.8, fz + 0.3, 1.6, 2, 1.1, SK[1]); K.box(Hd, 0, 3.1, fz + 0.6, 2.2, 0.7, 0.8, skinD);
  K.blob(Hd, [0, 6.4, -0.6], [4.3, 3.6, 4.3], 1, () => HAIR[Math.floor(K.r() * 3)], { run: [1, 2], keep: (x, y, z) => !(z > 0.25 && y < 0.55 && Math.abs(x) < 0.8) });
  K.clumps(Hd, [0, 7.2, -0.8], [8.4, 5.6, 8.4], { n: 12, size: [1, 1.8], cols: HAIR, faces: 'tklr', out: 0.1, on: [[0, 6.4, -0.6], [4.3, 3.6, 4.3]] });   // (seated on the hair: monsters.js clumps on)
  K.blob(Hd, [0, 1.2, 2.3], [3.9, 3.2, 2.2], 1, () => HAIR[Math.floor(K.r() * 3)], { run: [1, 2], keep: (x, y, z) => !(z > 0.3 && y > 0.1 && y < 0.75 && Math.abs(x) < 0.55) && !(y > 0.75 && Math.abs(x) < 0.7) });
  K.blob(Hd, [0, -1.6, 2.4], [2.6, 2.4, 1.6], 1, () => HAIR[Math.floor(K.r() * 3)], { run: [1, 2] });
  K.box(Hd, 0, 2.1, fz - 0.6, 3.4, 1.2, 1, 0x5a1a10); for (const x of [-1.2, -0.4, 0.4, 1.2]) K.box(Hd, x, 2.3, fz - 0.1, 0.6, 0.6, 0.3, 0xf8f0e0);
  K.box(Hd, -3.9, 3.6, 0.6, 0.4, 1.2, 1.2, gold);
  // ---- arms: huge inked shoulders, thick forearms in leather bracers with gold studs, big fists
  for (const [arm, sd] of [[rig.armR, -1], [rig.armL, 1]]) {
    K.blob(arm, [sd * 0.3, 0.2, 0], [3.8, 3.4, 3.6], 1, inked(sd * 0.4, 0, 0.6, sd), { pw: 2.3, run: [1, 2] });
    K.blob(arm, [0, -3.6, 0], [3, 3.4, 3], 1, inked(sd * 0.3, -0.2, 0.55, sd), { pw: 2.4, run: [1, 2] });
    K.blob(arm, [0, -8.2, 0.2], [3.2, 3.2, 3.2], 1, sk, { pw: 2.4, run: [2, 4] });
    K.vox(arm, 0, -9, 0.2, 6.8, 3.6, 6.8, [lea, 0x6a4628, leaD], { relief: 0.12 }); K.box(arm, 0, -7.1, 0.2, 7, 0.6, 7, leaD); K.box(arm, 0, -10.9, 0.2, 7, 0.6, 7, leaD);
    for (const [x, z] of [[0, 3.65], [sd * 3.45, 0.2], [-1.6, 3.65], [1.6, 3.65]]) K.box(arm, x, -9, z, 0.6, 0.6, 0.6, gold);
    K.blob(arm, [0, -13, 0.4], [3.1, 2.6, 3.1], 1, sk, { pw: 3, run: [2, 4] });
    for (let i = 0; i < 4; i++) K.box(arm, -1.8 + i * 1.2, -14, 3.1, 1.1, 1.3, 1, SK[i % 3]);
  }
  // ---- legs: thick thighs, shins in fur wraps, bare broad feet with toes
  for (const leg of [rig.legR, rig.legL]) {
    K.blob(leg, [0, -2.4, 0], [3.3, 3, 3.3], 1, sk, { pw: 2.4, run: [2, 4] });
    K.blob(leg, [0, -6.6, -0.1], [3.1, 2.6, 3.1], 1, () => (K.r() < 0.5 ? lea : furC[Math.floor(K.r() * 4)]), { pw: 2.5, run: [1, 2] });
    K.clumps(leg, [0, -4.6, 0], [5.8, 1.6, 5.8], { n: 4, size: [1, 1.6], cols: furC, faces: 'lrfk', out: 0.1 }); K.box(leg, 0, -8.3, 0, 6.2, 0.6, 6.2, leaD);
    K.blob(leg, [0, -9.2, 1], [2.9, 0.9, 3.6], 1, sk, { pw: 3, run: [2, 4] });
    for (const x of [-1.8, -0.6, 0.6, 1.8]) K.box(leg, x, -9.4, 4.5, 1.1, 1, 1, SK[1]);
  }
  // the flaming ball in the right hand
  const ball = markHeld(group(rig.handR, 0, -3.6, 0.6, 2.7));   // (turned so its flames stream up while the arm holds it high)
  K.blob(ball, [0, 0, 0], [3.4, 3.4, 3.4], 1, () => (K.r() < 0.16 ? fire[K.r() < 0.5 ? 0 : 1] : [ballC, 0x3a2010, 0x5a3418][Math.floor(K.r() * 3)]), { run: [1, 2] });
  // (a few low tongues of fire on it; the blaze streaming off it is live flame, flames.js)
  for (let i = 0; i < 6; i++) { const a = K.r() * Math.PI * 2, t = K.r() * 0.3, r = 2.6 * (1 - t * 0.6); K.box(ball, Math.cos(a) * r, 2.6 + t * 5, Math.sin(a) * r, 2 - t * 1.3, 2.4 - t * 1.3, 2 - t * 1.3, fire[Math.min(2, Math.floor(t * 3))]); }
  rig.extras.ball = ball;
  applyShape(rig);
  K.done();
  addFlames(rig, { cap: 40, palette: 'fire', rise: 24, turb: 28 }).source(ball, { at: [0, 1.6, 0], r: 2.4, rate: 50, life: [0.35, 0.7], size: [1.1, 2], up: 7, spread: 2.5 });
  noShadow(rig, Hd);
  rig.held = [-2.7, 0];
  finish(rig, 'laistrygonian');
  keepAbove(rig, rig.armR, { watch: [ball] });   // (the arm lifts the ball clear of the floor when a hit drops it)
  return rig;
}
