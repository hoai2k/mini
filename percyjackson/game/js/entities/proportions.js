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

export function reshape(rig, g, f, o = [0, 0, 0]) {
  const F = typeof f === 'number' ? [f, f, f] : f;
  (rig.shape ??= new Map()).set(g, { f: F, o });
  rig.shapeDone ??= new WeakSet();
  return g;
}
export const shapeOf = (rig, g) => rig?.shape?.get(g) ?? null;
// a point (skin pixels in the group's frame) through a shape, and back
export const shapeX = (S, v, a) => S.o[a] + (v - S.o[a]) * S.f[a];
export const unshapeX = (S, v, a) => S.o[a] + (v - S.o[a]) / S.f[a];
// Move what hangs on each reshaped group (child groups, and meshes built
// before the reshape such as skin boxes) to its reshaped place. Meshes the
// kits draw after it are already in place (rig.shapeDone). Safe to call again
// after more parts are hung on (a champion's trimmings).
export function applyShape(rig) {
  if (!rig.shape) return rig;
  for (const [g, S] of rig.shape) for (const c of g.children) {
    if (rig.shapeDone.has(c)) continue;
    rig.shapeDone.add(c);
    const p = c.position;
    p.set(shapeX(S, p.x / PX, 0) * PX, shapeX(S, p.y / PX, 1) * PX, shapeX(S, p.z / PX, 2) * PX);
    if (c.isMesh) c.scale.set(c.scale.x * S.f[0], c.scale.y * S.f[1], c.scale.z * S.f[2]);
  }
  return rig;
}
// The head's core, the skull and face: c, s in head pixels as the builder
// draws them (before any reshape of the head). perf/bodysize.cjs measures
// its height along the head's own axis.
export function markHeadCore(rig, c, s) {
  const S = shapeOf(rig, rig.head);
  rig.extras.headCore = S ? { c: [0, 1, 2].map((a) => shapeX(S, c[a], a)), s: s.map((v, a) => v * S.f[a]) } : { c: [...c], s: [...s] };
  return rig.extras.headCore;
}
