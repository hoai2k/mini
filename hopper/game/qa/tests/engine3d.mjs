// Node test for the 3D edition's simulation modules: world, controller,
// camera, combat3d and district. Transpiles the TS sources with typescript
// (scene.ts and engine3d.ts need a DOM for the renderer/canvas, so they are
// never transpiled or imported here) and drives fixed-step (120 Hz)
// scenarios against the Sunseed Fields district, the same way the other
// qa/tests files exercise the 2D engine.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const source = new URL('../../src/game3d/', import.meta.url).pathname;
const standIns = new URL('../../../3d/standins/src/index.js', import.meta.url).pathname;
// three ships an ESM build alongside the CJS one require.resolve('three')
// hands back (the package's "require" export condition); swap to it so the
// transpiled modules' `import ... from 'three'` resolves under node.
const threeModule = require.resolve('three').replace(/three\.cjs$/, 'three.module.js');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hopper-engine3d-'));
const names = ['world', 'controller', 'camera', 'combat3d', 'district'];
for (const name of names) {
  const raw = fs
    .readFileSync(source + name + '.ts', 'utf8')
    .replace(/from '\.\/([\w-]+)'/g, (m, n) => (names.includes(n) ? `from './${n}.mjs'` : m))
    .replace("'../../../3d/standins/src/index.js'", `'${standIns}'`)
    .replace(/from 'three'/g, `from '${threeModule}'`);
  fs.writeFileSync(
    path.join(temp, name + '.mjs'),
    ts.transpileModule(raw, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        verbatimModuleSyntax: false,
      },
    }).outputText,
  );
}

const { World } = await import(path.join(temp, 'world.mjs'));
const { stepHopper, createHopperState, predictLanding } = await import(path.join(temp, 'controller.mjs'));
const { createCamera, updateCamera } = await import(path.join(temp, 'camera.mjs'));
const { Combat } = await import(path.join(temp, 'combat3d.mjs'));
const { sunseedFields } = await import(path.join(temp, 'district.mjs'));

const dt = 1 / 120;
const blank = {
  dx: 0,
  dz: 0,
  jumpPressed: false,
  jumpHeld: false,
  divePressed: false,
  diveHeld: false,
  chargeHeld: false,
  guardHeld: false,
};
const district = sunseedFields();
const world = new World(district);

function startHopper(x, z, y) {
  const s = createHopperState(x, y ?? world.heightAt(x, z), z, Math.PI);
  s.groundY = s.y;
  return s;
}

let checks = 0;
function check(name, cond, detail) {
  checks++;
  assert.ok(cond, `${name}: ${detail}`);
}

// ---------------------------------------------------------------------
// 1. World
// ---------------------------------------------------------------------
{
  check('instances > 30', world.instances.length > 30, world.instances.length);
  check('colliders > 100', world.colliders.length > 100, world.colliders.length);
  check(
    'exactly one thermal volume',
    world.volumes.filter((v) => v.kind === 'thermal').length === 1,
    world.volumes.filter((v) => v.kind === 'thermal').length,
  );
  check('14 triggers', world.triggers.length === 14, world.triggers.length);
  check(
    'heightAt deterministic',
    world.heightAt(12.5, -640.25) === world.heightAt(12.5, -640.25),
    world.heightAt(12.5, -640.25),
  );
  const ground = world.groundAt(0, 40, 1e6);
  check(
    'groundAt(0,40) matches heightAt (nothing solid at the start)',
    Math.abs(ground.y - world.heightAt(0, 40)) < 1e-6,
    `${ground.y} vs ${world.heightAt(0, 40)}`,
  );
  check(
    'checkpoint totem at (0,20) has no collider',
    !world.colliders.some((c) => c.owner.startsWith('prop.checkpointTotem')),
    world.colliders.filter((c) => c.owner.startsWith('prop.checkpointTotem')).length,
  );
}

// ---------------------------------------------------------------------
// 2. Tap jump
// ---------------------------------------------------------------------
{
  const s = startHopper(0, 40);
  const startY = s.y;
  let apex = 0,
    minRel = 0,
    landAt = null;
  for (let i = 0; i < 400; i++) {
    const ev = stepHopper(s, world, { ...blank, jumpPressed: i === 0, jumpHeld: i === 0 }, dt);
    apex = Math.max(apex, s.y - startY);
    minRel = Math.min(minRel, s.y - startY);
    if (landAt === null && ev.some((e) => e.kind === 'land')) landAt = i / 120;
  }
  check('tap jump apex 19-24m', apex > 19 && apex < 24, apex);
  check('tap jump lands 1.6-2.4s', landAt !== null && landAt > 1.6 && landAt < 2.4, landAt);
  check('tap jump never dips below start by >0.5m', minRel > -0.5, minRel);
}

// ---------------------------------------------------------------------
// 3. Held jump
// ---------------------------------------------------------------------
{
  const s = startHopper(0, 40);
  const startY = s.y;
  let apex = 0,
    landAt = null;
  for (let i = 0; i < 800; i++) {
    const ev = stepHopper(s, world, { ...blank, jumpPressed: i === 0, jumpHeld: i < 60 }, dt);
    apex = Math.max(apex, s.y - startY);
    if (landAt === null && ev.some((e) => e.kind === 'land')) landAt = i / 120;
  }
  check('held jump apex 78-92m', apex > 78 && apex < 92, apex);
  check('held jump airtime 3.4-4.6s', landAt !== null && landAt > 3.4 && landAt < 4.6, landAt);
}

// ---------------------------------------------------------------------
// 4. Held then glide
// ---------------------------------------------------------------------
{
  const s = startHopper(0, 40);
  const startX = s.x,
    startZ = s.z;
  let glideStart = false,
    minVyWhileGliding = Infinity;
  for (let i = 0; i < 2400; i++) {
    const ev = stepHopper(s, world, { ...blank, jumpPressed: i === 0, jumpHeld: true, dz: -1 }, dt);
    if (ev.some((e) => e.kind === 'glideStart')) glideStart = true;
    if (s.gliding) minVyWhileGliding = Math.min(minVyWhileGliding, s.vy);
  }
  const dist = Math.hypot(s.x - startX, s.z - startZ);
  check('glideStart fires', glideStart, glideStart);
  check('glide covers >500m in 20s', dist > 500, dist);
  check('vy never below -7.5 while gliding', minVyWhileGliding >= -7.5, minVyWhileGliding);
}

// ---------------------------------------------------------------------
// 5. Crouch charge
// ---------------------------------------------------------------------
{
  const s = startHopper(0, 40);
  const startY = s.y;
  let apex = 0,
    chargedJump = null;
  for (let i = 0; i < 900; i++) {
    const ev = stepHopper(s, world, { ...blank, chargeHeld: i < 100 }, dt);
    for (const e of ev) if (e.kind === 'jump') chargedJump = e;
    apex = Math.max(apex, s.y - startY);
  }
  check('charged jump event fires', chargedJump !== null && chargedJump.charged === true, chargedJump);
  check('charge apex 125-150m', apex > 125 && apex < 150, apex);
}

// ---------------------------------------------------------------------
// 6. Spring pad
// ---------------------------------------------------------------------
// Landing exactly at the placement centre (80,-410) lands on one of the
// pad's own corner-rail colliders instead of the plate: the stand-in's
// "Plate" mesh (owner prop.springPad#N, spring:true) tops out at +2.0m
// above the pad's base, but four small rail-post meshes at +/-2.5m from
// centre top out at +2.2m -- taller than the plate -- and groundAt's
// default 2.5m foot radius is wide enough that a perfectly centred foot
// always resolves to a post, not the plate. See the report in this
// session's summary. A few metres off centre (still well inside the
// plate's own footprint) lands on the plate as intended, so that is what
// this test drops Hopper onto.
{
  const padX = 80,
    padZ = -410;
  const dropX = padX + 4,
    dropZ = padZ + 4;
  const padTop = world.groundAt(dropX, dropZ, 1e6);
  check('drop point resolves to the spring plate', padTop.collider?.spring === true, padTop);
  const s = createHopperState(dropX, padTop.y + 6, dropZ, Math.PI);
  s.groundY = s.y;
  s.grounded = false;
  let springAt = null,
    apexAbovePad = -Infinity;
  for (let i = 0; i < 400; i++) {
    const ev = stepHopper(s, world, blank, dt);
    if (springAt === null && ev.some((e) => e.kind === 'spring')) springAt = i / 120;
    if (springAt !== null) apexAbovePad = Math.max(apexAbovePad, s.y - padTop.y);
  }
  check('spring event within 1s', springAt !== null && springAt < 1, springAt);
  check('spring apex 150-185m above the pad', apexAbovePad > 150 && apexAbovePad < 185, apexAbovePad);
}

// ---------------------------------------------------------------------
// 7. Dive
// ---------------------------------------------------------------------
{
  const withDive = startHopper(0, 40);
  let diveEv = false,
    diveLandAt = null,
    diveStomp = null;
  for (let i = 0; i < 800; i++) {
    const ev = stepHopper(
      withDive,
      world,
      { ...blank, jumpPressed: i === 0, jumpHeld: i < 60, divePressed: i === 200 },
      dt,
    );
    for (const e of ev) {
      if (e.kind === 'dive') diveEv = true;
      if (e.kind === 'land' && diveLandAt === null) {
        diveLandAt = i / 120;
        diveStomp = e.stomp;
      }
    }
  }
  const noDive = startHopper(0, 40);
  let plainLandAt = null;
  for (let i = 0; i < 800; i++) {
    const ev = stepHopper(noDive, world, { ...blank, jumpPressed: i === 0, jumpHeld: i < 60 }, dt);
    for (const e of ev) if (e.kind === 'land' && plainLandAt === null) plainLandAt = i / 120;
  }
  check('dive event fires', diveEv, diveEv);
  check('dive lands as a stomp', diveStomp === true, diveStomp);
  check(
    'dive lands sooner than the same jump without a dive',
    diveLandAt !== null && plainLandAt !== null && diveLandAt < plainLandAt,
    `${diveLandAt} vs ${plainLandAt}`,
  );
}

// ---------------------------------------------------------------------
// 8. Wall kick
// ---------------------------------------------------------------------
{
  const s = startHopper(-20, -70);
  const events = [];
  for (let i = 0; i < 600; i++) {
    const jumpPressed = i === 5 || (i > 40 && i % 30 === 0);
    const ev = stepHopper(s, world, { ...blank, dx: -1, dz: -0.4, jumpPressed, jumpHeld: false }, dt);
    events.push(...ev);
  }
  const wallKicked = events.some((e) => e.kind === 'wallKick');
  check('at least one wallKick event', wallKicked, events.map((e) => e.kind));
  const normalLen = Math.hypot(s.wallNx, s.wallNz);
  check('wallNx/wallNz is a unit-ish normal', normalLen > 0.9 && normalLen < 1.1, normalLen);
}

// ---------------------------------------------------------------------
// 9. Falling is free (no damage path in the controller)
// ---------------------------------------------------------------------
{
  const s = startHopper(0, 40, world.heightAt(0, 40) + 300);
  s.grounded = false;
  check('HopperState has no hp field', !('hp' in s), Object.keys(s));
  let landAt = null;
  for (let i = 0; i < 2000; i++) {
    const ev = stepHopper(s, world, blank, dt);
    if (landAt === null && ev.some((e) => e.kind === 'land')) landAt = i / 120;
  }
  check('falling lands', landAt !== null, landAt);
  check('invuln unchanged by falling', s.invuln === 0, s.invuln);
  check('hitstun unchanged by falling', s.hitstun === 0, s.hitstun);
}

// ---------------------------------------------------------------------
// 10. Thermal
// ---------------------------------------------------------------------
{
  const s = startHopper(-100, -780);
  const startY = s.y;
  let apex = 0;
  for (let i = 0; i < 1800; i++) {
    stepHopper(s, world, { ...blank, jumpPressed: i === 0, jumpHeld: true }, dt);
    apex = Math.max(apex, s.y - startY);
  }
  check('thermal apex above 120m', apex > 120, apex);
}

// ---------------------------------------------------------------------
// 11. Way back up rule (irrigation cut spring pad)
// ---------------------------------------------------------------------
// Same corner-rail quirk as scenario 6: drop a few metres off the
// placement centre (20,-1010) so the fall actually resolves onto the
// spring plate.
{
  const cutX = 20,
    cutZ = -1010;
  const dropX = cutX + 4,
    dropZ = cutZ + 4;
  const padTop = world.groundAt(dropX, dropZ, 1e6);
  check('cut drop point resolves to the spring plate', padTop.collider?.spring === true, padTop);
  const s = createHopperState(dropX, padTop.y + 6, dropZ, Math.PI);
  s.groundY = s.y;
  s.grounded = false;
  let apexY = -Infinity;
  for (let i = 0; i < 400; i++) {
    stepHopper(s, world, blank, dt);
    apexY = Math.max(apexY, s.y);
  }
  // The ridge plateau in sunseedFields() sits at {x:-220,z:-880,r:220,y:60}.
  const threshold = 60 + world.heightAt(cutX, cutZ) + 40;
  check('cut spring clears the ridge plateau by >=40m', apexY > threshold, `${apexY} vs ${threshold}`);
}

// ---------------------------------------------------------------------
// 12. Camera
// ---------------------------------------------------------------------
{
  const settings = { sensitivity: 0.5, invertY: false, reducedMotion: false };
  const blankCam = {
    lookX: 0,
    lookY: 0,
    mouseLookX: 0,
    mouseLookY: 0,
    resetPressed: false,
    horizonHeld: false,
  };

  // Still: the eye settles within 25-60m of Hopper, above the terrain.
  {
    const h = startHopper(0, 40);
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    for (let i = 0; i < 240; i++) updateCamera(cam, h, world, blankCam, settings, dt);
    const eyeDist = Math.hypot(cam.eye[0] - h.x, cam.eye[1] - h.y, cam.eye[2] - h.z);
    check('camera settles 25-60m from Hopper', eyeDist > 25 && eyeDist < 60, eyeDist);
    check(
      'camera eye is above the terrain',
      cam.eye[1] > world.heightAt(cam.eye[0], cam.eye[2]),
      `${cam.eye[1]} vs ${world.heightAt(cam.eye[0], cam.eye[2])}`,
    );
  }

  // lookX orbits the camera.
  {
    const h = startHopper(0, 40);
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    const yaw0 = cam.yaw;
    for (let i = 0; i < 60; i++) updateCamera(cam, h, world, { ...blankCam, lookX: 1 }, settings, dt);
    check('lookX changes yaw by >0.5 rad', Math.abs(cam.yaw - yaw0) > 0.5, cam.yaw - yaw0);
  }

  // Horizon View aims at the landmark.
  {
    const h = startHopper(0, 40);
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    const landmark = [0, 200, -3200];
    for (let i = 0; i < 240; i++)
      updateCamera(cam, h, world, { ...blankCam, horizonHeld: true, landmark }, settings, dt);
    const targetYaw = Math.atan2(landmark[0] - h.x, landmark[2] - h.z);
    check('horizon mode engages', cam.mode === 'horizon', cam.mode);
    check(
      'horizon yaw converges toward the landmark within 0.3 rad',
      Math.abs(cam.yaw - targetYaw) < 0.3,
      Math.abs(cam.yaw - targetYaw),
    );
  }

  // Lock mode engages on a locked shadow.
  {
    const h = startHopper(0, 40);
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    const lock = [h.x + 50, h.y, h.z - 50];
    updateCamera(cam, h, world, { ...blankCam, lock }, settings, dt);
    check('lock mode engages', cam.mode === 'lock', cam.mode);
  }
}

// ---------------------------------------------------------------------
// 13. Combat
// ---------------------------------------------------------------------
function makeCallbacks() {
  const record = { hurt: 0, bounce: 0, effects: [] };
  return {
    record,
    hurt: () => {
      record.hurt++;
      return false;
    },
    effect: (name) => record.effects.push(name),
    sound: () => {},
    bounce: () => {
      record.bounce++;
    },
  };
}
function aimFrom(h, extra = {}) {
  return {
    x: h.x,
    y: h.y + 7,
    z: h.z,
    dx: Math.sin(h.yaw),
    dy: 0,
    dz: Math.cos(h.yaw),
    firing: false,
    guarding: false,
    kickPressed: false,
    ...extra,
  };
}

// 13a. Hound tell -> attack -> hurt -> recover.
{
  const h = startHopper(40, -218);
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const h1 = combat.shadows.find((s) => s.id === 'h1');
  const states = [];
  let hurtAt = null,
    recoverWithOpen = false;
  for (let i = 0; i < 720; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    if (states.at(-1) !== h1.state) states.push(h1.state);
    if (hurtAt === null && cb.record.hurt > 0) hurtAt = i / 120;
    if (h1.state === 'recover' && h1.open > 0) recoverWithOpen = true;
  }
  check('hound reaches tell', states.includes('tell'), states);
  check('hound reaches attack', states.includes('attack'), states);
  check('hurt is called at least once', hurtAt !== null, hurtAt);
  const attackIdx = states.indexOf('attack');
  check(
    'a recover state follows the attack',
    states.slice(attackIdx).includes('recover'),
    states.slice(attackIdx),
  );
  check('recover opens the core (open > 0)', recoverWithOpen, recoverWithOpen);
}

// 13b. Lasers: sustained fire kills the hound and eventually overheats.
{
  const h = startHopper(40, -218);
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const h1 = combat.shadows.find((s) => s.id === 'h1');
  for (let i = 0; i < Math.round(3 * 120); i++) combat.update(dt, h, cb, aimFrom(h, { firing: true }));
  check('laser fire drops hound hp to 0', h1.hp === 0, h1.hp);
  check('hound is dead', h1.alive === false, h1.alive);
  check('heat rises above 0', combat.heat > 0, combat.heat);
}
{
  const h = startHopper(40, -218);
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  for (let i = 0; i < Math.round(4.5 * 120); i++) combat.update(dt, h, cb, aimFrom(h, { firing: true }));
  check('sustained firing overheats', combat.overheated > 0, combat.overheated);
}

// 13c. Kick: one press, within a swing, kills a 4hp hound and dissolves it.
{
  const h = startHopper(40, -218);
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const h1 = combat.shadows.find((s) => s.id === 'h1');
  h1.x = h.x;
  h1.z = h.z - 6;
  h1.y = world.heightAt(h1.x, h1.z);
  const hpBefore = h1.hp;
  for (let i = 0; i < 60; i++) combat.update(dt, h, cb, aimFrom(h, { kickPressed: i === 0 }));
  check('kick damages the hound by 4', hpBefore - h1.hp === 4, `${hpBefore} -> ${h1.hp}`);
  check('kick kills a 4hp hound', h1.alive === false, h1.alive);
  check('dissolve effect fires', cb.record.effects.includes('dissolve'), cb.record.effects);
}

// 13d. Shockwave: kills a fresh (4hp) hound; launches one with more hp.
{
  const _h = startHopper(40, -218);
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const h1 = combat.shadows.find((s) => s.id === 'h1');
  combat.shockwave(h1.x, h1.y, h1.z, 12, cb);
  check('shockwave on a 4hp hound kills it (4 - 5 < 0)', h1.alive === false, h1.hp);
}
{
  const _h = startHopper(40, -218);
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const h1 = combat.shadows.find((s) => s.id === 'h1');
  h1.hp = 20;
  combat.shockwave(h1.x, h1.y, h1.z, 12, cb);
  check('shockwave launches a surviving hound', h1.alive === true && h1.state === 'launched', h1.state);
  check('launched hound gets positive vy', h1.vy > 0, h1.vy);
}

// 13e. Stomp bounce.
{
  const h = startHopper(40, -218);
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const h1 = combat.shadows.find((s) => s.id === 'h1');
  h1.x = h.x;
  h1.z = h.z;
  h1.y = world.heightAt(h1.x, h1.z);
  h.y = h1.y + h1.height + 0.5;
  h.vy = -20;
  h.grounded = false;
  const hpBefore = h1.hp;
  combat.update(dt, h, cb, aimFrom(h));
  check('bounce callback fires', cb.record.bounce === 1, cb.record.bounce);
  check('stomp bounce deals 5 damage', hpBefore - h1.hp === 5, `${hpBefore} -> ${h1.hp}`);
}

// 13f. Spitter: seeds appear when Hopper is in range.
{
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const s1 = combat.shadows.find((s) => s.id === 's1');
  const h = createHopperState(s1.x, s1.y, s1.z + 80, Math.PI);
  let seedSeen = false;
  for (let i = 0; i < 5 * 120 && !seedSeen; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    seedSeen = combat.projectiles.some((p) => p.kind === 'seed' && p.owner === 'shadow');
  }
  check('spitter fires seed projectiles owned by shadow', seedSeen, seedSeen);
}

// 13g. Waves: a later wave wakes once the earlier wave is down.
{
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const h5 = combat.shadows.find((s) => s.id === 'h5');
  check('wave-1 hound starts dormant', h5.dormant === true, h5.dormant);
  combat.damage(combat.shadows.find((s) => s.id === 'h3'), 99, cb);
  combat.damage(combat.shadows.find((s) => s.id === 'h4'), 99, cb);
  check('wave-1 hound wakes once its group is down', h5.dormant === false, h5.dormant);
}

// 13h. resetToCheckpoint restores shadows ahead of the checkpoint.
{
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const h1 = combat.shadows.find((s) => s.id === 'h1');
  combat.damage(h1, 99, cb);
  check('h1 is dead before reset', h1.alive === false, h1.alive);
  combat.resetToCheckpoint(0);
  const h1After = combat.shadows.find((s) => s.id === 'h1');
  check('resetToCheckpoint(0) restores h1 (ahead of the checkpoint)', h1After.alive === true, h1After.alive);
}

// 13i. Guard: draining and breaking the shield.
{
  const h = startHopper(40, -218);
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const shieldStart = combat.shield;
  for (let i = 0; i < 120; i++) combat.update(dt, h, cb, aimFrom(h, { guarding: true }));
  check('guarding is true while held', combat.guarding === true, combat.guarding);
  check('shield decreases while guarding', combat.shield < shieldStart, `${shieldStart} -> ${combat.shield}`);
  let brokeAt = null;
  for (let i = 120; i < 8 * 120; i++) {
    combat.update(dt, h, cb, aimFrom(h, { guarding: true }));
    if (brokeAt === null && combat.shieldBroken > 0) brokeAt = i / 120;
  }
  check('shield breaks at some point within 8s of holding', brokeAt !== null, brokeAt);
}

// ---------------------------------------------------------------------
// 14. predictLanding
// ---------------------------------------------------------------------
{
  const s = createHopperState(0, world.heightAt(0, 0) + 80, 0, Math.PI);
  s.grounded = false;
  s.vz = -30;
  const p = predictLanding(s, world);
  check('predictLanding time is 1.6-2.2s', p.t > 1.6 && p.t < 2.2, p.t);
  check(
    'predictLanding y is within 3m of the terrain at x,z',
    Math.abs(p.y - world.heightAt(p.x, p.z)) < 3,
    `${p.y} vs ${world.heightAt(p.x, p.z)}`,
  );
}

console.log(`engine3d: ${checks} checks passed across 14 scenarios (world, controller, camera, combat3d, district)`);
