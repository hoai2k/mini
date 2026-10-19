// Proportions for the big upright models (the owner's rule, design/sizes.json
// "head"): as a creature grows, the Minecraft-style big head gives way to a
// more realistic one. A builder re-proportions its model by reshaping rig
// parts before it sculpts them:
//   reshape(rig, group, [fx, fy, fz])   every voxel-kit box, blob, clump, shag
//                                       and cell drawn into that group lands
//                                       scaled about the group's origin
// The kits (monsters.js VoxKit, fodder.js blob, bossmodels.js vox) read
// rig.shape at draw time and re-voxelise at the model's own cell size, so a
// smaller head is a new sculpt of the same hero-sized cells, its features
// re-drawn smaller, never a scaled-down copy of the old blocks. Clumps, shag
// tufts and cells keep their size; only the layout moves. applyShape(rig)
// then moves the child groups hung on a reshaped part (the neck on the
// torso, the arms, a hand, a shoulder skull) to match. markHeadCore(rig, c, s)
// names the skull and face (centre and size in head pixels, as drawn before
// the reshape) so perf/bodysize.cjs measures the head without its mane,
// beard, veil, hood or horns.
import { PX } from './character.js';

// opts.ankle (a leg, skin pixels): what lies below it (the foot) keeps its
// height and only moves down with the shin, so a longer leg is a longer
// thigh and shin over the same foot. legScale() works out fy for a leg of
// old length L0 to become L1 over a foot below the ankle.
export function reshape(rig, g, f, o = [0, 0, 0], { ankle = null } = {}) {
  const F = typeof f === 'number' ? [f, f, f] : f;
  (rig.shape ??= new Map()).set(g, { f: F, o, ankle });
  rig.shapeDone ??= new WeakSet();
  return g;
}
export const shapeOf = (rig, g) => rig?.shape?.get(g) ?? null;
// a point (skin pixels in the group's frame) through a shape, and back
export const shapeX = (S, v, a) => (a === 1 && S.ankle != null && v < S.ankle ? S.o[1] + (S.ankle - S.o[1]) * S.f[1] + (v - S.ankle) : S.o[a] + (v - S.o[a]) * S.f[a]);
export const unshapeX = (S, v, a) => {
  if (a === 1 && S.ankle != null) { const A = S.o[1] + (S.ankle - S.o[1]) * S.f[1]; if (v < A) return S.ankle + (v - A); }
  return S.o[a] + (v - S.o[a]) / S.f[a];
};
// the size factor along axis a for a part centred at v (as drawn)
export const shapeK = (S, v, a) => (a === 1 && S.ankle != null && v < S.ankle ? 1 : S.f[a]);
export const legScale = (L0, L1, ankle) => (L1 - L0 - ankle) / -ankle;   // (ankle < 0: the sole at -L0 lands at -L1)
// Move what hangs on each reshaped group (child groups, and meshes built
// before the reshape such as skin boxes) to its reshaped place. Meshes the
// kits draw after it are already in place (rig.shapeDone). Safe to call again
// after more parts are hung on (a champion's trimmings).
export function applyShape(rig) {
  if (!rig.shape) return rig;
  for (const [g, S] of rig.shape) for (const c of g.children) {
    if (rig.shapeDone.has(c)) continue;
    rig.shapeDone.add(c);
    const p = c.position, ky = shapeK(S, p.y / PX, 1);
    p.set(shapeX(S, p.x / PX, 0) * PX, shapeX(S, p.y / PX, 1) * PX, shapeX(S, p.z / PX, 2) * PX);
    if (c.isMesh) c.scale.set(c.scale.x * S.f[0], c.scale.y * ky, c.scale.z * S.f[2]);
  }
  return rig;
}
// The head's core, the skull and face: c, s in head pixels as the builder
// draws them (before any reshape of the head). perf/bodysize.cjs measures
// its height along the head's own axis.
export function markHeadCore(rig, c, s) {
  const S = shapeOf(rig, rig.head);
  rig.extras.headCore = S ? { c: [0, 1, 2].map((a) => shapeX(S, c[a], a)), s: s.map((v, a) => v * shapeK(S, c[a], a)) } : { c: [...c], s: [...s] };
  return rig.extras.headCore;
}
