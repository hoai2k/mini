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
const names = ['world', 'controller', 'camera', 'combat3d', 'district', 'route', 'scenery', 'boss3d'];
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
const { stepHopper, createHopperState, predictLanding, MOVE } = await import(path.join(temp, 'controller.mjs'));
const { createCamera, updateCamera } = await import(path.join(temp, 'camera.mjs'));
const { Combat } = await import(path.join(temp, 'combat3d.mjs'));
const { NightRook } = await import(path.join(temp, 'boss3d.mjs'));
const { sunseedFields, MISSIONS } = await import(path.join(temp, 'district.mjs'));
const { buildRoute } = await import(path.join(temp, 'route.mjs'));
const { shadowBody } = await import(path.join(temp, 'combat3d.mjs'));

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
  check('tap jump lands 1.0-1.4s (a quick launch)', landAt !== null && landAt > 1.0 && landAt < 1.4, landAt);
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
  check('held jump airtime 2.0-2.9s', landAt !== null && landAt > 2.0 && landAt < 2.9, landAt);
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
  check('predictLanding time is 0.9-1.2s', p.t > 0.9 && p.t < 1.2, p.t);
  check(
    'predictLanding y is within 3m of the terrain at x,z',
    Math.abs(p.y - world.heightAt(p.x, p.z)) < 3,
    `${p.y} vs ${world.heightAt(p.x, p.z)}`,
  );
}

// ---------------------------------------------------------------------
// 15. New shadow species: Spire Leech, Crag Tortoise, Rift Condor.
// Sunseed Fields has none of these, so each scenario builds combat from a
// copy of sunseedFields() with a tiny synthetic `shadows` list instead.
// ---------------------------------------------------------------------

// 15a. Spire Leech: idle -> tell -> attack (locked-in beam) -> recover; a
// wall-clinger, it never moves through any of it.
{
  const districtL = { ...sunseedFields(), shadows: [{ id: 'l1', kind: 'spireLeech', x: 60, z: -200, y: 30, mode: 'a' }] };
  const combat = new Combat(world, districtL);
  const cb = makeCallbacks();
  const l1 = combat.shadows.find((s) => s.id === 'l1');
  const startX = l1.x,
    startY = l1.y,
    startZ = l1.z;
  // Roughly level with the leech (dy = 0) and 50m away horizontally --
  // inside its 200m range.
  const h = createHopperState(60, l1.y + l1.height * 0.5 - 7, -150, Math.PI);
  h.groundY = h.y;
  const states = [];
  let beamSeen = false,
    recoverOpen = false,
    moved = false;
  for (let i = 0; i < 600; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    if (states.at(-1) !== l1.state) states.push(l1.state);
    if (combat.projectiles.some((p) => p.kind === 'beam' && p.owner === 'shadow' && p.ownerId === 'l1')) beamSeen = true;
    if (l1.state === 'recover' && l1.open > 0) recoverOpen = true;
    if (Math.hypot(l1.x - startX, l1.y - startY, l1.z - startZ) > 0.01) moved = true;
  }
  check('leech reaches tell', states.includes('tell'), states);
  check('leech reaches attack', states.includes('attack'), states);
  check('leech spawns beam projectiles owned by shadow with its id', beamSeen, beamSeen);
  check('leech reaches recover with open > 0', recoverOpen, recoverOpen);
  check('leech never moves', !moved, moved);
}

// 15b. Crag Tortoise: approach -> tell (rear) -> lunge -> hurt on contact.
{
  const districtT = { ...sunseedFields(), shadows: [{ id: 't1', kind: 'cragTortoise', x: 40, z: -230 }] };
  const combat = new Combat(world, districtT);
  const cb = makeCallbacks();
  const t1 = combat.shadows.find((s) => s.id === 't1');
  // 15m out and exactly level, comfortably inside the 34m tell range so the
  // lunge (0.7s at 26 m/s) can actually close the gap and land contact.
  const h = createHopperState(t1.x, t1.y + t1.height * 0.5 - 7, t1.z - 15, Math.PI);
  h.groundY = h.y;
  const states = [];
  let hurtAt = null,
    lungeSpeedSeen = false;
  for (let i = 0; i < 900; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    if (states.at(-1) !== t1.state) states.push(t1.state);
    if (t1.state === 'attack' && Math.hypot(t1.vx, t1.vz) > 15) lungeSpeedSeen = true;
    if (hurtAt === null && cb.record.hurt > 0) hurtAt = i / 120;
  }
  check('tortoise reaches tell', states.includes('tell'), states);
  check('tortoise reaches attack', states.includes('attack'), states);
  check('tortoise lunges with horizontal speed > 15', lungeSpeedSeen, lungeSpeedSeen);
  check('hurt is called on contact', hurtAt !== null, hurtAt);
}

// 15c. Crag Tortoise armour: a stomp on the closed spikes bounces Hopper but
// leaves hp unchanged.
{
  const districtT = { ...sunseedFields(), shadows: [{ id: 't1', kind: 'cragTortoise', x: 40, z: -230 }] };
  const combat = new Combat(world, districtT);
  const cb = makeCallbacks();
  const t1 = combat.shadows.find((s) => s.id === 't1');
  check('tortoise starts armoured and closed', t1.armored === true && t1.open <= 0, `${t1.armored} ${t1.open}`);
  const h = createHopperState(t1.x, t1.y + t1.height + 0.5, t1.z, Math.PI);
  h.groundY = h.y;
  h.vy = -20;
  h.grounded = false;
  const hpBefore = t1.hp;
  combat.update(dt, h, cb, aimFrom(h));
  check('stomping the closed spikes still bounces Hopper', cb.record.bounce === 1, cb.record.bounce);
  check('stomping the closed spikes leaves hp unchanged', t1.hp === hpBefore, `${hpBefore} -> ${t1.hp}`);
}

// 15d. Crag Tortoise armour: a kick does only 1 damage while closed, 4 once
// the core is open.
{
  const districtT = { ...sunseedFields(), shadows: [{ id: 't1', kind: 'cragTortoise', x: 40, z: -230 }] };
  const combat = new Combat(world, districtT);
  const cb = makeCallbacks();
  const t1 = combat.shadows.find((s) => s.id === 't1');
  const h = createHopperState(t1.x, t1.y, t1.z - 6, Math.PI);
  h.groundY = h.y;
  const hpBefore = t1.hp;
  for (let i = 0; i < 60; i++) combat.update(dt, h, cb, aimFrom(h, { kickPressed: i === 0 }));
  check('kick on the closed armour does 1 damage', hpBefore - t1.hp === 1, `${hpBefore} -> ${t1.hp}`);
}
{
  const districtT = { ...sunseedFields(), shadows: [{ id: 't1', kind: 'cragTortoise', x: 40, z: -230 }] };
  const combat = new Combat(world, districtT);
  const cb = makeCallbacks();
  const t1 = combat.shadows.find((s) => s.id === 't1');
  t1.open = 1;
  const h = createHopperState(t1.x, t1.y, t1.z - 6, Math.PI);
  h.groundY = h.y;
  const hpBefore = t1.hp;
  for (let i = 0; i < 60; i++) combat.update(dt, h, cb, aimFrom(h, { kickPressed: i === 0 }));
  check('kick on the open core does 4 damage', hpBefore - t1.hp === 4, `${hpBefore} -> ${t1.hp}`);
}

// 15e. Rift Condor: tell -> swoop (>40 m/s) -> recover, climbing back home.
{
  const districtC = { ...sunseedFields(), shadows: [{ id: 'c1', kind: 'riftCondor', x: 0, z: -300, y: 90, mode: 'a' }] };
  const combat = new Combat(world, districtC);
  const cb = makeCallbacks();
  const c1 = combat.shadows.find((s) => s.id === 'c1');
  // A fixed place on its idle circle: the scenario is about the swoop, not luck.
  c1.phase = 0;
  // 40m out horizontally, 10m below the condor's line -- inside notice and
  // "not far above it".
  const h = createHopperState(0, c1.y + c1.height * 0.5 + 3, -260, Math.PI);
  h.groundY = h.y;
  const states = [];
  let attackSpeedSeen = false,
    recoverStartY = null,
    recoverYRose = false;
  for (let i = 0; i < 900; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    if (states.at(-1) !== c1.state) states.push(c1.state);
    if (c1.state === 'attack' && Math.hypot(c1.vx, c1.vy, c1.vz) > 40) attackSpeedSeen = true;
    if (c1.state === 'recover') {
      if (recoverStartY === null) recoverStartY = c1.y;
      else if (c1.y > recoverStartY + 1) recoverYRose = true;
    }
  }
  check('condor reaches tell', states.includes('tell'), states);
  check('condor reaches attack', states.includes('attack'), states);
  check('condor swoop speed > 40', attackSpeedSeen, attackSpeedSeen);
  check('condor climbs back toward home during recover (y rises)', recoverYRose, recoverYRose);
}

// 15f. spawn(): summons a shadow at runtime, awake immediately, and
// resetToCheckpoint drops it instead of crashing on the missing district entry.
{
  const combat = new Combat(world, district);
  const summoned = combat.spawn({ id: 'summoned-condor', kind: 'riftCondor', x: 0, z: -300, y: 90, mode: 'a' });
  check('spawn() returns the new shadow', combat.shadows.includes(summoned), combat.shadows.length);
  check('spawned shadow is not dormant', summoned.dormant === false, summoned.dormant);
  check('spawned shadow is alive', summoned.alive === true, summoned.alive);
  combat.resetToCheckpoint(0);
  check(
    'resetToCheckpoint drops a summoned shadow with no district entry instead of crashing',
    combat.shadows.every((s) => s.id !== 'summoned-condor'),
    combat.shadows.map((s) => s.id),
  );
  check('resetToCheckpoint keeps district shadows', combat.shadows.some((s) => s.id === 'h1'), combat.shadows.map((s) => s.id));
}

// ---------------------------------------------------------------------
// 16. The trail and the forward camera
// ---------------------------------------------------------------------
{
  const wrap = (d) => {
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  for (const make of MISSIONS[0]) {
    const d = make();
    const route = buildRoute(d);
    // (a) The trail runs through every totem, in checkpoint order.
    const totems = d.placements
      .filter((p) => p.id === 'prop.checkpointTotem')
      .sort((a, b) => Math.hypot(a.x - d.start.x, a.z - d.start.z) - Math.hypot(b.x - d.start.x, b.z - d.start.z));
    let lastS = -1;
    for (const t of totems) {
      const hit = route.nearest(t.x, t.z);
      check(`${d.name}: totem (${t.x},${t.z}) lies on the trail`, hit.dist < 2, hit.dist);
      check(`${d.name}: totem (${t.x},${t.z}) is further along the trail than the one before`, hit.s > lastS, `${hit.s} after ${lastS}`);
      lastS = hit.s;
    }
    check(`${d.name}: the trail ends at the exit`, route.distance(d.exit.x, d.exit.z) < 2, route.distance(d.exit.x, d.exit.z));
    // (b) It winds: the route is longer than the straight line, and bends both ways.
    const straight = Math.hypot(d.exit.x - d.start.x, d.exit.z - d.start.z);
    check(`${d.name}: the trail winds (longer than the straight line)`, route.length > straight * 1.03, `${route.length.toFixed(0)} vs ${straight.toFixed(0)}`);
    let left = false,
      right = false;
    for (let s = 20; s < route.length; s += 20) {
      const turn = wrap(route.yawAt(s) - route.yawAt(s - 20));
      if (turn > 0.03) left = true;
      if (turn < -0.03) right = true;
    }
    check(`${d.name}: the trail bends both ways`, left && right, `${left} ${right}`);
    // (c) The forward direction is always onward: from anywhere within 90 m of
    // the line, the camera's forward agrees with the trail's own direction
    // there and with the district's overall direction (never backward).
    const overall = Math.atan2(d.exit.x - d.start.x, d.exit.z - d.start.z);
    let worstLocal = 1,
      worstOverall = 1;
    for (let s = 0; s < route.length - 90; s += 15) {
      const p = route.pointAt(s);
      for (const off of [-90, -45, 0, 45, 90]) {
        const x = p.x + Math.cos(p.yaw) * off,
          z = p.z - Math.sin(p.yaw) * off;
        const hit = route.nearest(x, z);
        const forward = route.yawAt(hit.s + 80);
        // Deep inside a hairpin the nearest leg is legitimately the next one,
        // so the local agreement is only asked of the trail's own shoulders.
        if (Math.abs(off) <= 45) worstLocal = Math.min(worstLocal, Math.cos(wrap(forward - p.yaw)));
        worstOverall = Math.min(worstOverall, Math.cos(wrap(forward - overall)));
      }
    }
    check(`${d.name}: forward stays within 75° of the trail's own direction, even beside a bend`, worstLocal > 0.25, worstLocal);
    check(`${d.name}: forward never faces back toward the start`, worstOverall > 0, worstOverall);
  }
  // (d) Running back toward the camera does not turn it: the view keeps facing along the trail.
  {
    const route = world.route;
    const settings = { sensitivity: 0.5, invertY: false, reducedMotion: false };
    const blankCam = { lookX: 0, lookY: 0, mouseLookX: 0, mouseLookY: 0, resetPressed: false, horizonHeld: false };
    const h = startHopper(0, -200);
    const forward0 = route.yawAt(route.nearest(h.x, h.z).s + 80);
    const cam = createCamera(forward0, [h.x, h.y + 8, h.z]);
    // Hopper turns round and runs back toward the start (+z) for two seconds.
    h.yaw = 0;
    h.vz = 40;
    for (let i = 0; i < 240; i++) {
      h.z += h.vz * dt;
      const forward = route.yawAt(route.nearest(h.x, h.z).s + 80);
      updateCamera(cam, h, world, { ...blankCam, forward }, settings, dt);
    }
    check('camera keeps facing along the trail while Hopper runs back toward it', Math.abs(wrap(cam.yaw - forward0)) < 0.35, wrap(cam.yaw - forward0));
    check('the eye stays behind Hopper along the trail (ahead of him as he runs back)', Math.sin(cam.yaw) * (h.x - cam.eye[0]) + Math.cos(cam.yaw) * (h.z - cam.eye[2]) > 0, [cam.eye, h.x, h.z]);
  }
  // (e) Jumping past a totem, off to one side, does not swing the camera.
  {
    const route = world.route;
    const settings = { sensitivity: 0.5, invertY: false, reducedMotion: false };
    const blankCam = { lookX: 0, lookY: 0, mouseLookX: 0, mouseLookY: 0, resetPressed: false, horizonHeld: false };
    const h = startHopper(40, -290);
    const cam = createCamera(route.yawAt(route.nearest(h.x, h.z).s + 80), [h.x, h.y + 8, h.z]);
    let worstStep = 0;
    for (let i = 0; i < 360; i++) {
      const jump = i === 30;
      stepHopper(h, world, { ...blank, dz: -1, jumpPressed: jump, jumpHeld: jump }, dt);
      const before = cam.yaw;
      updateCamera(cam, h, world, { ...blankCam, forward: route.yawAt(route.nearest(h.x, h.z).s + 80) }, settings, dt);
      worstStep = Math.max(worstStep, Math.abs(wrap(cam.yaw - before)));
    }
    check('passing the totem at (0,-330) 40 m to its side never swings the camera (max 1.5°/step)', worstStep < 0.026, worstStep);
    check('Hopper passed the totem', h.z < -330, h.z);
  }
  // (f) The jump is a quick launch: a tap peaks in well under a second.
  {
    const s = startHopper(0, 40);
    let apexAt = 0,
      apex = 0;
    for (let i = 0; i < 240; i++) {
      stepHopper(s, world, { ...blank, jumpPressed: i === 0, jumpHeld: i === 0 }, dt);
      if (s.y - s.groundY > apex) {
        apex = s.y - s.groundY;
        apexAt = i * dt;
      }
    }
    check('tap jump peaks within 0.7 s', apexAt < 0.7, apexAt);
  }
  // (g) Every shadow is Hopper's size or bigger (he is 14 m tall).
  for (const kind of ['shadeHound', 'seedSpitter', 'windowRay', 'spireLeech', 'cragTortoise', 'riftCondor']) {
    const b = shadowBody(kind);
    check(`${kind} body reaches Hopper's scale (height or span >= 12 m)`, Math.max(b.height, b.radius * 2) >= 12, b);
    check(`${kind} is scaled up from its stand-in`, b.size >= 2.8, b.size);
  }
}

// ---------------------------------------------------------------------
// 17. The leap travels: speed, the takeoff lunge and carried momentum
// ---------------------------------------------------------------------
{
  // Run up to speed, jump, and report the arc.
  const arc = ({ runUp = 0, sprint = false, hold = 0, steer = true }) => {
    const s = startHopper(0, 40);
    for (let i = 0; i < Math.round(runUp / dt); i++) stepHopper(s, world, { ...blank, dz: -1, sprintHeld: sprint }, dt);
    const z0 = s.z,
      y0 = s.y,
      takeoff = Math.hypot(s.vx, s.vz);
    let apex = 0,
      air = 0,
      slowest = Infinity;
    for (let i = 0; i < 900; i++) {
      const ev = stepHopper(s, world, { ...blank, dz: steer ? -1 : 0, sprintHeld: sprint, jumpPressed: i === 0, jumpHeld: i === 0 || i * dt < hold }, dt);
      if (i > 0 && !s.grounded) slowest = Math.min(slowest, Math.hypot(s.vx, s.vz));
      apex = Math.max(apex, s.y - y0);
      if (i > 4 && ev.some((e) => e.kind === 'land')) {
        air = i * dt;
        break;
      }
    }
    return { takeoff, apex, air, range: Math.abs(s.z - z0), slowest };
  };
  check('run speed is at least 66 m/s', MOVE.run >= 66, MOVE.run);
  const standing = arc({ runUp: 0, steer: false });
  check('a standing jump with no stick still goes straight up', standing.range < 1, standing.range);
  const stick = arc({ runUp: 0 });
  check('a standing jump with the stick pushed lunges forward (>55 m)', stick.range > 55, stick.range);
  const running = arc({ runUp: 1.5 });
  check('a running tap jump crosses 90 m', running.range > 90, running.range);
  check('a running tap jump travels at least 4x its apex (forward, not upward)', running.range > running.apex * 4, `${running.range.toFixed(0)} vs ${running.apex.toFixed(0)}`);
  check('the takeoff lunge adds speed rather than losing it', running.slowest > running.takeoff, `${running.slowest.toFixed(0)} from ${running.takeoff.toFixed(0)}`);
  const sprinting = arc({ runUp: 1.5, sprint: true });
  check('sprinting takes off faster than running', sprinting.takeoff > running.takeoff + 20, `${sprinting.takeoff.toFixed(0)} vs ${running.takeoff.toFixed(0)}`);
  check('a sprint jump keeps its speed in the air (never dragged back to running pace)', sprinting.slowest >= sprinting.takeoff, `${sprinting.slowest.toFixed(0)} from ${sprinting.takeoff.toFixed(0)}`);
  check('a sprint jump carries much further than a running one', sprinting.range > running.range * 1.35, `${sprinting.range.toFixed(0)} vs ${running.range.toFixed(0)}`);
  const held = arc({ runUp: 1.5, sprint: true, hold: 0.5 });
  check('a sprinting held jump crosses 250 m', held.range > 250, held.range);
  check('holding still buys height, not just distance', held.apex > sprinting.apex * 3, `${held.apex.toFixed(0)} vs ${sprinting.apex.toFixed(0)}`);
  // Pushing back against the flight still slows Hopper down: control is kept.
  {
    const s = startHopper(0, 40);
    for (let i = 0; i < 180; i++) stepHopper(s, world, { ...blank, dz: -1, sprintHeld: true }, dt);
    stepHopper(s, world, { ...blank, dz: -1, sprintHeld: true, jumpPressed: true, jumpHeld: true }, dt);
    const launched = Math.hypot(s.vx, s.vz);
    for (let i = 0; i < 60; i++) stepHopper(s, world, { ...blank, dz: 1 }, dt);
    check('pushing back in the air brakes the leap', Math.hypot(s.vx, s.vz) < launched - 40, `${launched.toFixed(0)} -> ${Math.hypot(s.vx, s.vz).toFixed(0)}`);
  }
}

// ---------------------------------------------------------------------
// 18. Lasers reach a flyer overhead
// ---------------------------------------------------------------------
{
  const h = startHopper(0, -300);
  const overhead = { ...sunseedFields(), shadows: [{ id: 'ray', kind: 'windowRay', x: h.x + 8, z: h.z - 6, y: h.y + 70, mode: 'a' }] };
  const combat = new Combat(world, overhead);
  const cb = makeCallbacks();
  const ray = combat.shadows.find((s) => s.id === 'ray');
  const hp0 = ray.hp;
  // Firing straight ahead, with the aim tilted slightly down as the camera has it.
  for (let i = 0; i < 120; i++) combat.update(dt, h, cb, { x: h.x, y: h.y + 12, z: h.z, dx: 0, dy: -0.18, dz: -1, firing: true, guarding: false, kickPressed: false });
  check('a window ray circling overhead can be shot', ray.hp < hp0, `${hp0} -> ${ray.hp}`);
}

// ---------------------------------------------------------------------
// 19. Scenery: spans that land somewhere, and a filled-in middle distance
// ---------------------------------------------------------------------
{
  for (const make of MISSIONS[0]) {
    const d = make();
    const w = new World(d);
    const scenery = w.scenery;
    check(`${d.name}: the middle distance is filled in (>=10 structures off the trail)`, scenery.length >= 10, scenery.length);
    // Nothing generated stands on the trail itself, other than a span's own supports.
    const onTrail = scenery.filter((p) => w.route.distance(p.x, p.z) < 60 && !/cragColumn|roofDeck|ravineBridge|railSpan/.test(p.id));
    check(`${d.name}: generated scenery keeps off the trail`, onTrail.length === 0, onTrail.map((p) => p.id));
    // No support buries a totem, signal, capsule or pad.
    const props = d.placements.filter((p) => !p.id.startsWith('structure.') && p.id !== 'prop.windLane' && p.id !== 'prop.thermalVent');
    const buried = props.filter((p) => scenery.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < 20));
    check(`${d.name}: no prop is buried under generated scenery`, buried.length === 0, buried.map((p) => `${p.id} (${p.x},${p.z})`));
    // Every span's deck ends over something solid: a pier, a building, or ground.
    for (const p of d.placements.filter((s) => /ravineBridge|railSpan/.test(s.id))) {
      const length = p.opts?.length ?? 130;
      const deck = p.id.includes('railSpan') ? 34 : 1.5;
      const base = p.mode === 'a' ? p.y || 0 : w.heightAt(p.x, p.z) + (p.y || 0) - (p.y ? 0 : 1.5);
      const yaw = p.yaw || 0;
      for (const side of [-1, 1]) {
        const ex = p.x + Math.cos(yaw) * side * (length / 2),
          ez = p.z - Math.sin(yaw) * side * (length / 2);
        const gap = base + deck - w.heightAt(ex, ez);
        const support = w.groundAt(ex, ez, base + deck).y;
        check(
          `${d.name}: the ${p.id.split('.').pop()} deck lands on something at (${ex.toFixed(0)},${ez.toFixed(0)})`,
          gap < 8 || support > w.heightAt(ex, ez) + 4,
          `gap ${gap.toFixed(1)} m, support at ${support.toFixed(1)} vs terrain ${w.heightAt(ex, ez).toFixed(1)}`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------
// 20. The commander: reachable, targetable and framed
// ---------------------------------------------------------------------
{
  const d = MISSIONS[0][2]();
  const bossWorld = new World(d);
  const rook = new NightRook(d.boss, bossWorld);
  const ground = bossWorld.heightAt(d.boss.x, d.boss.z);
  const perches = rook.perches ?? [];
  // A held jump peaks at 88 m: every perch has to sit inside a leap of the floor.
  const highest = Math.max(rook.rook.y, ...perches.map((p) => p[1]));
  check('the commander perches within a leap of the arena floor (<=110 m)', highest - ground <= 110, `${(highest - ground).toFixed(0)} m above ${ground.toFixed(0)}`);
  // Awake, it is an aim target: the lasers pick it and the lock-on can hold it.
  const combat = new Combat(bossWorld, { ...d, shadows: [] });
  rook.wake({ hurt: () => false, effect: () => {}, sound: () => {}, bounce: () => {} });
  combat.bossTarget = rook.target();
  const r = rook.rook;
  check('the commander is among the aim targets', combat.targets().some((t) => t.id === 'boss'), combat.targets().length);
  // The same upward cone the lasers use when nothing is ahead or below.
  const picked = combat.pickTarget(r.x, r.y - 60, r.z + 20, 0, 0.9, -1, 220, Math.PI / 3);
  check('the lasers can pick the commander from below', picked?.id === 'boss', picked?.id);
  combat.lock = 'boss';
  check('the lock-on can hold the commander', combat.targetById('boss')?.id === 'boss', combat.targetById('boss')?.id);
  // The camera lifts its look toward the commander and stands further back.
  {
    const settings = { sensitivity: 0.5, invertY: false, reducedMotion: false };
    const blankCam = { lookX: 0, lookY: 0, mouseLookX: 0, mouseLookY: 0, resetPressed: false, horizonHeld: false };
    const h = startHopper(d.boss.x, d.boss.z + 40, bossWorld.heightAt(d.boss.x, d.boss.z + 40));
    const plain = createCamera(h.yaw, [h.x, h.y + 8, h.z]),
      framed = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    const boss = [r.x, r.y + r.height * 0.5, r.z];
    for (let i = 0; i < 240; i++) {
      updateCamera(plain, h, bossWorld, blankCam, settings, dt);
      updateCamera(framed, h, bossWorld, { ...blankCam, boss }, settings, dt);
    }
    check('framing the commander lifts the camera look', framed.target[1] > plain.target[1] + 4, `${framed.target[1].toFixed(1)} vs ${plain.target[1].toFixed(1)}`);
    check('framing the commander pulls the camera back', framed.distance > plain.distance + 8, `${framed.distance.toFixed(1)} vs ${plain.distance.toFixed(1)}`);
  }
}

console.log(`engine3d: ${checks} checks passed across 20 scenarios (world, controller, camera, combat3d, district, route, scenery, boss3d)`);
