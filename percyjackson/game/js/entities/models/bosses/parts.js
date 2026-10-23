// What the boss builders share: the people's painted faces, hair and bulk,
// and each boss's sculpt grid density (VD).
import * as THREE from 'three/webgpu';
import { PX } from '../../character.js';
import { paintPerson } from '../../mortals.js';
import { heroHair, cellMesh } from '../../herovox.js';
import { HS, skinMat, bruteLimbs } from '../../parts.js';
import { sculptMats } from '../../voxkit.js';

// ---------------------------------------------------------------- people
export const shadeOf = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
// Fine features at half-pixel resolution on a res-2 skin (face front x 8..16,
// y 8..16): lidded eyes with irises and catch-lights, shaped brows, a nose
// shadow and a mouth. o: { skin, eye, brow, mouth: 'grin'|'smirk'|'frown'|'set', scowl, scar, stubble }
function fineFace(S, o) {
  const D = (x, y, c, n = 1, m = n) => S.dot(x, y, c, n, m), d = 0.5, ey = 12, skin = o.skin;
  S.rect(8, ey - 2, 8, 6, skin, 0.04);
  D(8, 8, shadeOf(skin, 0.92), 1, 16); D(15.5, 8, shadeOf(skin, 0.92), 1, 16); D(8, 15.5, shadeOf(skin, 0.86), 16, 1);
  if (o.stubble) for (let i = 0; i < 40; i++) D(8.5 + Math.floor(S.r() * 14) / 2, 14 + Math.floor(S.r() * 4) / 2, o.stubble);
  for (const [x0, sg] of [[9, 1], [13, -1]]) {
    const wx = sg > 0 ? x0 : x0 + 1, ix = sg > 0 ? x0 + 1 : x0;
    D(x0 - (sg > 0 ? d : 0), ey, 0x16100c, 5, 1);
    D(wx, ey + d, 0xfaf6f0, 2, 3); D(ix, ey + d, o.eye, 2, 3); D(ix + (sg > 0 ? d : 0), ey + 1, 0x0c0a10, 1, 2); D(ix + (sg > 0 ? 0 : d), ey + d, 0xffffff, 1, 1);
    D(x0, ey + 2, shadeOf(skin, 0.86), 4, 1);
  }
  const by = ey - 1.5, b = o.brow;
  if (o.scowl) { D(8.5, by - d, b, 3, 1); D(9.5, by, b, 3, 2); D(13, by, b, 3, 2); D(14, by - d, b, 3, 1); D(10.5, by + d, b, 2, 1); D(13, by + d, b, 2, 1); }
  else { D(8.5, by, b, 5, 2); D(13, by, b, 5, 2); }
  D(11.5, ey + 2.5, shadeOf(skin, 0.78), 2, 1); D(11, ey + 2, shadeOf(skin, 0.88), 1, 1);
  const my = ey + 3.5, dark = 0x3a1210, teeth = 0xfaf4ea;
  if (o.mouth === 'grin') { D(9.5, my - 1, dark, 10, 3); D(10, my - 1, teeth, 8, 1); D(10.5, my, 0x8a2a22, 6, 1); D(9, my - 1.5, dark, 1, 1); D(14.5, my - 1.5, dark, 1, 1); }
  else if (o.mouth === 'smirk') { D(10.5, my, dark, 5, 1); D(13, my - d, dark, 1, 1); D(13.5, my - 1, dark, 1, 1); D(11, my + d, shadeOf(skin, 0.8), 3, 1); }
  else if (o.mouth === 'frown') { D(10.5, my, dark, 6, 1); D(10, my + d, dark, 1, 1); D(13.5, my + d, dark, 1, 1); }
  else { D(10.5, my, shadeOf(skin, 0.6), 6, 1); }
  // the scar (Luke's): down the right cheek (the face's left, x 8..12) from just under the eye socket
  // to the jaw, as in the books, never across the eye (it starts below the shadow under it, ey + 2)
  if (o.scar) {
    for (const [x, y] of [[10.5, ey + 2.5], [10, ey + 3], [9.5, ey + 3.5], [9, ey + 3.5]]) D(x, y, o.scar, 1, 1);
  }
}
// A res-2 humanoid skin: paintPerson's layout, fine features, then o.detail, shading and colour.
export const humanSkin = (id, o, opts = {}) => skinMat(id, (S) => { paintPerson(S, o); fineFace(S, o); o.detail?.(S, (x, y, c, n = 1, m = n) => S.dot(x, y, c, n, m)); S.shadeLimbs(); S.saturate(o.sat ?? 1.2); }, { res: 2, emit: 0, fill: 0.1, ...opts });
// Grid-voxel hair (and beard) from the hero hair styles on a Rig head.
export function hairMesh(rig, vox) {
  const hs = (rig.dims.headS / 8) * HS;
  // (the hair cells are as fine as the sculpt: rig.vd)
  const { cells: C, solid: inHead, res } = heroHair({ ...vox, res: rig.vd ?? 1 });
  const mat = sculptMats()[0], mesh = cellMesh(C, PX * hs / res, mat, inHead);
  mesh.userData.baseMat = mat; rig.meshes.push(mesh); rig.head.add(mesh);
  rig.extras.hair = mesh;
  return mesh;
}
// Bulk up a standard-layout Rig without breaking its skin: scale the torso
// boxes (w across, d deep) and move the shoulders out to match.
export function bulk(rig, { w = 1, d = 1, h = 1, armThick = 1, armLen = 1, legThick = 1, legX = 2 }) {
  for (const c of rig.torso.children) if (c.isMesh) c.scale.set(w, h, d);
  bruteLimbs(rig, { armLen, armThick, legThick, legX });
  const { bodyW, bodyH, armW } = rig.dims;
  for (const [a, s] of [[rig.armR, -1], [rig.armL, 1]]) a.position.set(s * (bodyW * w / 2 + armW * armThick / 2) * PX, (bodyH * h - 2) * PX, 0);
  rig.neck.position.y = bodyH * h * PX;
}
// herovox outfit boxes ({ at, size, col }) as kit boxes, shifted by dy
export const kitBoxes = (list, dy = 0) => list.map((b) => ({ p: [b.at[0], b.at[1] + dy, b.at[2]], s: b.size, c: b.col }));

// ---------------------------------------------------------------- sculpt density
// Sculpt grid density per boss (rig.vd, voxkit.js sculpt): a hero's cube is about
// 1.32 / (rig scale) of a boss's skin pixels, so the full hero density would
// be vd = 1.32 / (scale * v). Each is set as close to that as its triangle
// budget (about 40k for a boss) allows.
// (cerberus: a coarser body and finer heads, its cells greedy-meshed, rig.merge)
// (chimera: a budget of about 70k for cells near a hero's, 0.10 m on the body
// and 0.085 m on the heads, its jitter in blocks of 3 cells, rig.hg)
export const VD = { minotaur: 1.5, chimera: 1.85, chimeraHead: 1.75, chimeraTail: 1.3, cerberus: 1.25, cerberusHead: 1.15, procrustes: 1.5, ares: 1.5 };
