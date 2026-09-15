/** Stand-in checks: every manifest entry that points at a stand-in builds,
 * sizes are sane for gameplay, rig sockets exist, textures are deterministic
 * and the Hopper proxy matches the delivered GLB's socket and clip names.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  listStandIns,
  createStandIn,
  hasStandIn,
  measure,
  socketNames,
  paintTexture,
  paintSky,
  makeSkyTexture,
  TEXTURE_NAMES,
  REGIONS,
  ENEMIES,
  BOSSES,
  HOPPER_SOCKETS,
  RIDER_SOCKETS,
  HOPPER_CLIPS,
  makeHeightField,
  makeTerrain,
  regionById,
} from '../src/index.js';

const here = new URL('.', import.meta.url).pathname;
const manifest = JSON.parse(fs.readFileSync(here + '../../design/standin-manifest.json', 'utf8'));
const models = JSON.parse(fs.readFileSync(here + '../../../models/manifest.json', 'utf8'));
let checks = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  checks++;
};

// 1. Every stand-in in the registry builds, measures and animates.
const mismatches = [];
for (const id of listStandIns()) {
  const o = createStandIn(id);
  const { size } = measure(o);
  ok(size.x > 0 && size.y > 0 && size.z > 0, `${id} has volume`);
  ok(o.userData.standIn?.id === id, `${id} carries its own id`);
  o.userData.animate?.(0.7);
  o.userData.animate?.(2.1);
  const declared = o.userData.standIn.size;
  if (declared && !id.startsWith('terrain.') && id !== 'prop.lockdownDome') {
    // Declared sizes are the model-request budgets; the stand-in must be in the same ballpark.
    const ratio = Math.max(size.x / declared[0], size.y / declared[1], size.z / declared[2]);
    if (!(ratio > 0.3 && ratio < 1.6)) mismatches.push(`${id} measured ${size.toArray().map((v) => v.toFixed(1))} vs declared ${declared}`);
  }
}

ok(mismatches.length === 0, `declared sizes match the stand-ins:\n${mismatches.join('\n')}`);

// 2. Enemies and bosses expose the rig nodes gameplay needs.
for (const id of Object.keys(ENEMIES)) {
  const o = createStandIn(`enemy.${id}`);
  const names = socketNames(o);
  ok(o.getObjectByName('Core'), `enemy.${id} has a Core socket`);
  ok(names.includes('Hitbox.Body'), `enemy.${id} has a body hitbox`);
  ok(['quadruped', 'quadruped-digitigrade', 'quadruped-shell', 'rooted', 'flyer', 'flyer-rigid', 'spline-chain', 'biped-heavy', 'crab', 'soft-tendril', 'rigid-rotating'].includes(o.userData.standIn.rig), `enemy.${id} names a rig type`);
  const { size } = measure(o);
  ok(size.length() > 3 && size.length() < 30, `enemy.${id} is enemy-sized (${size.length().toFixed(1)} m)`);
}
for (const id of Object.keys(BOSSES)) {
  const o = createStandIn(`boss.${id}`);
  ok(o.getObjectByName('Core'), `boss.${id} has a Core socket`);
  const { size } = measure(o);
  ok(size.length() > 40, `boss.${id} is boss-sized (${size.length().toFixed(1)} m)`);
}
ok(createStandIn('boss.smelterLeviathan').userData.standIn.segments === 16, 'leviathan declares its chain length');

// 3. Structures publish landings the route tools can use.
for (const id of listStandIns().filter((s) => s.startsWith('structure.'))) {
  const o = createStandIn(id);
  const landings = o.userData.landings || [];
  for (const l of landings) {
    ok(Number.isFinite(l.y) && l.halfX > 0 && l.halfZ > 0, `${id} landing ${l.label} is well formed`);
    ok(o.getObjectByName(`Landing.${landings.indexOf(l)}`), `${id} landing ${l.label} has a socket`);
  }
  const noLanding = ['structure.fields.windbreak', 'structure.fields.seedPod', 'structure.mountains.windsock', 'structure.blue.dustCurrent', 'structure.violet.gravitySeam'];
  if (!noLanding.includes(id)) ok(landings.length > 0, `${id} has at least one landing`);
  ok(REGIONS.some((r) => r.id === o.userData.standIn.region), `${id} belongs to a region`);
}

// 4. Hopper proxy mirrors the delivered GLB.
const hopper = createStandIn('hopper.proxy');
const names = new Set(socketNames(hopper));
for (const s of models.sockets.hopper) ok(names.has(s), `proxy has GLB socket ${s}`);
for (const s of models.sockets.rider) ok(names.has(s), `proxy has GLB rider socket ${s}`);
ok(Object.keys(HOPPER_SOCKETS).length === models.sockets.hopper.length, 'socket table covers every GLB socket');
ok(Object.keys(RIDER_SOCKETS).length === models.sockets.rider.length, 'rider socket table covers every GLB socket');
assert.deepEqual(HOPPER_CLIPS, models.clips['hopper-rider'].map((c) => c.name), 'clip list matches the combined GLB');
const hopperSize = measure(hopper).size;
ok(hopperSize.y > 18 && hopperSize.y < 26 && hopperSize.z > 26 && hopperSize.z < 32, `proxy is Hopper-sized: ${hopperSize.toArray().map((v) => v.toFixed(1))}`);
const seat = hopper.getObjectByName('Hopper.Seat');
ok(seat && seat.getObjectByName('RiderRig'), 'rider is parented under Hopper.Seat, as in the combined GLB');
ok(hopper.getObjectByName('Hopper.Camera').position.y > 13.5, 'camera socket sits on the head');

// 5. Textures are deterministic, opaque and in range.
for (const name of TEXTURE_NAMES) {
  const a = paintTexture(name, { size: 32, seed: 3 }),
    b = paintTexture(name, { size: 32, seed: 3 }),
    c = paintTexture(name, { size: 32, seed: 4 });
  ok(a.data.length === 32 * 32 * 4, `${name} buffer size`);
  assert.deepEqual(a.data, b.data, `${name} is deterministic per seed`);
  ok(!a.data.every((v, i) => v === c.data[i]), `${name} varies with seed`);
  let alphaOk = true,
    distinct = new Set();
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] !== 255) alphaOk = false;
    distinct.add((a.data[i] << 16) | (a.data[i + 1] << 8) | a.data[i + 2]);
  }
  ok(alphaOk, `${name} is opaque`);
  ok(distinct.size >= 3, `${name} has at least three cel tones (${distinct.size})`);
}
for (const region of REGIONS) {
  const sky = paintSky(64, 32, region);
  const top = sky.data.slice(0, 4),
    bottom = sky.data.slice(sky.data.length - 4);
  ok(top.join() !== bottom.join(), `${region.id} sky differs zenith to nadir`);
  // The dome samples v = 1 at its zenith, and a DataTexture puts its last row
  // there, so the texture must carry the sky rows bottom-up.
  const tex = makeSkyTexture(region, { width: 64, height: 32 });
  const last = tex.image.data.slice(tex.image.data.length - 4, tex.image.data.length - 1);
  ok(last.join() === top.slice(0, 3).join(), `${region.id} sky texture keeps the zenith at v = 1`);
}

// 6. Terrain: the height function and the mesh agree; landmarks exist per region.
const heightAt = makeHeightField({ size: 1000, seed: 5, relief: 40, plateaus: [{ x: 0, z: 0, r: 80, y: 12 }] });
ok(Math.abs(heightAt(0, 0) - 12) < 1e-6, 'plateau centre sits at its authored height');
ok(heightAt(400, -300) === heightAt(400, -300), 'height query is stable');
// The ground the game stands on is the ground it draws: a height field asked
// for the mesh's segment count reads the triangles the mesh builds, not the
// smooth field they sample. They agree at every vertex, and in between the
// field follows the same two triangles per cell PlaneGeometry makes.
{
  const opts = { size: 480, segments: 16, seed: 5, relief: 40, plateaus: [{ x: 0, z: 0, r: 60, y: 30 }] };
  const smooth = makeHeightField({ ...opts, segments: 0 });
  const drawn = makeHeightField(opts);
  const cell = opts.size / opts.segments;
  let atVertices = 0,
    between = 0;
  for (let i = 1; i < opts.segments; i++)
    for (let j = 1; j < opts.segments; j++) {
      const x = i * cell - opts.size / 2,
        z = j * cell - opts.size / 2;
      atVertices = Math.max(atVertices, Math.abs(drawn(x, z) - smooth(x, z)));
      between = Math.max(between, Math.abs(drawn(x + cell * 0.5, z + cell * 0.37) - smooth(x + cell * 0.5, z + cell * 0.37)));
    }
  ok(atVertices < 1e-4, `the drawn surface meets the smooth one at every vertex (${atVertices})`);
  ok(between > 0.01, `and differs between them, which is the point (${between.toFixed(2)} m)`);
  const mesh = makeTerrain(regionById('fields'), opts);
  const pos = mesh.geometry.attributes.position;
  let worst = 0;
  for (let i = 0; i < pos.count; i++) worst = Math.max(worst, Math.abs(pos.getY(i) - mesh.userData.heightAt(pos.getX(i), pos.getZ(i))));
  ok(worst < 1e-4, `every terrain vertex matches the height the mesh hands on (${worst})`);
}
const terrain = makeTerrain(regionById('mountains'), { size: 400, segments: 8, seed: 5, relief: 40 });
const pos = terrain.geometry.attributes.position;
let mismatch = 0;
for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - terrain.userData.heightAt(pos.getX(i), pos.getZ(i))) > 1e-3) mismatch++;
ok(mismatch === 0, 'every terrain vertex matches heightAt');
for (const region of REGIONS) {
  const lm = createStandIn('terrain.landmark', { region: region.id });
  ok(lm.children.length > 0, `${region.id} has a horizon landmark (${region.landmark})`);
  ok(lm.position.z < -1000, `${region.id} landmark sits far away`);
}

// 7. The manifest and the registry agree.
let standInCount = 0;
for (const entry of manifest.requests) {
  ok(/^(M|T)-\d{3}$/.test(entry.request), `${entry.request} id format`);
  ok(entry.status, `${entry.request} has a status`);
  if (entry.standIn) {
    standInCount++;
    ok(hasStandIn(entry.standIn) || TEXTURE_NAMES.includes(entry.standIn.replace(/^texture\./, '')), `${entry.request} → ${entry.standIn} exists`);
  }
}
const ids = manifest.requests.map((r) => r.request);
ok(new Set(ids).size === ids.length, 'request ids are unique');
ok(standInCount > 60, `most requests have stand-ins (${standInCount})`);
const unmapped = listStandIns().filter((id) => !manifest.requests.some((r) => r.standIn === id));
ok(unmapped.length === 0, `every registered stand-in is claimed by a request: ${unmapped.join(', ')}`);

console.log(`stand-ins: ${checks} checks passed across ${listStandIns().length} stand-ins, ${TEXTURE_NAMES.length} textures, ${manifest.requests.length} requests`);
