// Baked-collision self-consistency: every delivered structure's collision.json
// boxes (hopper/3d/models/collision.json, see its README) must actually reach
// the World's own colliders/grid the way world.ts's bakedCollidersOf placed
// them -- a box's own top, sampled through World.groundAt at that world-space
// point, should read back as itself (within the 0.25 m grid the baker rounds
// to). This is a self-consistency check on the transform/registration, not a
// re-measure of the delivered GLB's real geometry: that comparison is what
// hopper/3d/models/source/collision-audit.mjs does (headless Chromium against
// the real mesh) -- run `node source/collision-audit.mjs` from
// hopper/3d/models after a new delivery or a bake-collision.mjs change, and
// `node source/bake-collision.mjs` to refresh collision.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { World, MISSIONS, checker } from './harness3d.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const collision = JSON.parse(fs.readFileSync(path.join(HERE, '../../../3d/models/collision.json'), 'utf8'));
const design = JSON.parse(fs.readFileSync(path.join(HERE, '../../../3d/design/standin-manifest.json'), 'utf8'));
const delivery = JSON.parse(fs.readFileSync(path.join(HERE, '../../../3d/models/manifest.json'), 'utf8'));
const deliveredByRequest = new Map(delivery.models.filter((m) => m.status === 'delivered').map((m) => [m.request, m]));
const structures = design.requests
  .filter((r) => r.kind === 'model' && r.status === 'delivered' && r.standIn?.startsWith('structure.') && deliveredByRequest.has(r.request))
  .map((r) => ({ standIn: r.standIn, ...deliveredByRequest.get(r.request) }))
  // dustCurrent and gravitySeam are deliberately excluded from collision
  // entirely in world.ts's place() -- a visible-but-not-solid volume marker,
  // not a fall-through case -- so they have no colliders to check here.
  .filter((m) => collision[m.file]?.length && m.standIn !== 'structure.blue.dustCurrent' && m.standIn !== 'structure.violet.gravitySeam');

const c = checker('delivered-collision');
const districts = MISSIONS.flat().map((factory) => factory());
const worlds = districts.map((d) => new World(d));

let checked = 0,
  boxesChecked = 0;
for (const m of structures) {
  // The first district (in mission order) whose placements use this
  // stand-in, and the first such placement in it -- same representative
  // choice collision-audit.mjs makes.
  let found = null;
  for (let i = 0; i < districts.length && !found; i++) {
    const p = districts[i].placements.find((pl) => pl.id === m.standIn);
    if (p) found = { world: worlds[i], name: districts[i].name, p };
  }
  if (!found) continue; // audited separately; nothing placed to check here
  const { world, name, p } = found;
  const instance = world.instances.find((inst) => inst.placement === p);
  if (!instance) continue;
  const boxes = world.colliders.filter((col) => col.instance === instance && col.baked);
  c.check(`${m.request} (${m.standIn}) has baked colliders on its placement in ${name}`, boxes.length > 0, boxes.length);
  checked++;
  // A sample of boxes (every one for a small model, a spread otherwise) --
  // enough to catch a systematic transform error without every district
  // sweep turning into thousands of redundant point queries.
  const sample = boxes.length <= 40 ? boxes : boxes.filter((_, i) => i % Math.ceil(boxes.length / 40) === 0);
  for (const box of sample) {
    if (box.wall) continue; // a ring-scan shell's own "top" is not a designed landing point
    const cos = Math.cos(box.yaw),
      sin = Math.sin(box.yaw),
      wx = box.cx + box.ox * cos - box.oz * sin,
      wz = box.cz + box.ox * sin + box.oz * cos;
    // Reachable through the spatial grid at its own world-space point --
    // the actual thing a groundAt/near query depends on -- rather than
    // asking whether it is the single tallest thing there (a nested tier,
    // or a wholly different nearby structure, can legitimately overlap the
    // same XZ point at a different height; that is not what this checks).
    c.check(
      `${m.request} baked box at (${wx.toFixed(0)},${wz.toFixed(0)}) top ${box.y1.toFixed(2)} is reachable through the spatial grid`,
      world.near(wx, wz, 3).includes(box),
      box,
    );
    boxesChecked++;
  }
}
c.check('every delivered structure with a placement was checked', checked === structures.filter((m) => districts.some((d) => d.placements.some((p) => p.id === m.standIn))).length, checked);
c.done(`${checked} delivered structures, ${boxesChecked} baked boxes sampled`);
