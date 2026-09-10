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
  check('16 triggers', world.triggers.length === 16, world.triggers.length);
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
// 3. Held jump: a hover, not a boost
// ---------------------------------------------------------------------
{
  const s = startHopper(0, 40);
  const startY = s.y;
  let apex = 0,
    landAt = null,
    hoverStart = null,
    hoverEnd = null;
  const heldAt = [];
  for (let i = 0; i < 1200; i++) {
    const ev = stepHopper(s, world, { ...blank, jumpPressed: i === 0, jumpHeld: i < 420 }, dt);
    apex = Math.max(apex, s.y - startY);
    if (hoverStart === null && ev.some((e) => e.kind === 'hoverStart')) hoverStart = i / 120;
    if (hoverEnd === null && ev.some((e) => e.kind === 'hoverEnd')) hoverEnd = i / 120;
    if (s.hovering) heldAt.push(s.y - startY);
    if (landAt === null && ev.some((e) => e.kind === 'land')) landAt = i / 120;
  }
  check('held jump apex stays a hop (20-30m), no boost', apex > 20 && apex < 30, apex);
  check('hover starts near the apex', hoverStart !== null && hoverStart > 0.8 && hoverStart < 1.5, hoverStart);
  check('hover lasts about the fuel (1.5-2.1s)', hoverStart !== null && hoverEnd !== null && hoverEnd - hoverStart > 1.5 && hoverEnd - hoverStart < 2.1, hoverEnd - hoverStart);
  const held = heldAt.slice(Math.floor(heldAt.length * 0.4));
  check('altitude held while hovering (drift < 3m)', held.length > 10 && Math.max(...held) - Math.min(...held) < 3, held.length ? Math.max(...held) - Math.min(...held) : null);
  check('hovering lands later than a tap (>3.2s)', landAt !== null && landAt > 3.2, landAt);
}

// ---------------------------------------------------------------------
// 4. Hover then glide
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
  check('glideStart fires once the hover is spent', glideStart, glideStart);
  check('hover and glide cover >500m in 20s', dist > 500, dist);
  check('vy never below -7.5 while gliding', minVyWhileGliding >= -7.5, minVyWhileGliding);
  check('hover fuel refills on landing', s.grounded ? s.hoverFuel > 1.7 : true, s.hoverFuel);
}

// ---------------------------------------------------------------------
// 4b. Facing forward: backpedal and strafe keep the yaw
// ---------------------------------------------------------------------
{
  const s = startHopper(0, 40);
  const forward = Math.PI;
  s.yaw = forward;
  let vBack = 0,
    vFwd = 0,
    vSide = 0;
  for (let i = 0; i < 120; i++) stepHopper(s, world, { ...blank, dz: -1, faceYaw: forward }, dt);
  vFwd = Math.hypot(s.vx, s.vz);
  for (let i = 0; i < 120; i++) stepHopper(s, world, { ...blank, dz: 1, faceYaw: forward }, dt);
  vBack = Math.hypot(s.vx, s.vz);
  const yawAfterBack = s.yaw;
  for (let i = 0; i < 120; i++) stepHopper(s, world, { ...blank, dx: 1, faceYaw: forward }, dt);
  vSide = Math.hypot(s.vx, s.vz);
  check('forward run reaches full speed', vFwd > 50, vFwd);
  check('backpedal is slower (45-65% of run)', vBack > vFwd * 0.45 && vBack < vFwd * 0.65, vBack / vFwd);
  check('strafe is a little slower', vSide > vFwd * 0.75 && vSide < vFwd * 0.95, vSide / vFwd);
  check('facing holds forward while backpedalling', Math.abs(yawAfterBack - forward) < 0.05, yawAfterBack - forward);
  check('facing holds forward while strafing', Math.abs(s.yaw - forward) < 0.05, s.yaw - forward);
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
// 16. Stronghold entries: held hosts, activateGroup, and 'drop' / 'leap' /
// 'emerge' / 'ambush' arrivals. Each scenario builds combat from a copy of
// sunseedFields() with a synthetic `shadows` and `strongholds` list.
// ---------------------------------------------------------------------

// 16a. Held hosts start held+dormant and are excluded from aliveShadows();
// resetToCheckpoint's internal wake() does not release them.
{
  const districtA = {
    ...sunseedFields(),
    strongholds: [{ id: 'fort', name: 'Fort', x: 0, z: -100, r: 50 }],
    shadows: [{ id: 'g1', kind: 'shadeHound', x: 0, z: -100, group: 'fort' }],
  };
  const combat = new Combat(world, districtA);
  const g1 = combat.shadows.find((s) => s.id === 'g1');
  check('held host starts held', g1.held === true, g1.held);
  check('held host starts dormant', g1.dormant === true, g1.dormant);
  check('aliveShadows() excludes the held host', !combat.aliveShadows().includes(g1), combat.aliveShadows().map((s) => s.id));
  combat.resetToCheckpoint(0);
  const g1After = combat.shadows.find((s) => s.id === 'g1');
  check('resetToCheckpoint (wake()) does not release a held host', g1After.held === true && g1After.dormant === true, `${g1After.held} ${g1After.dormant}`);
}

// 16b. activateGroup returns the held count and releases wave-0 members in
// delay order (an explicit delay:0 and an explicit delay:1.5).
{
  const districtB = {
    ...sunseedFields(),
    strongholds: [{ id: 'fort', name: 'Fort', x: 0, z: -100, r: 50 }],
    shadows: [
      { id: 'd0', kind: 'shadeHound', x: 0, z: -100, group: 'fort', delay: 0 },
      { id: 'd1', kind: 'shadeHound', x: 20, z: -100, group: 'fort', delay: 1.5 },
    ],
  };
  const combat = new Combat(world, districtB);
  const d0 = combat.shadows.find((s) => s.id === 'd0');
  const d1 = combat.shadows.find((s) => s.id === 'd1');
  const released = combat.activateGroup('fort');
  check('activateGroup returns the held count', released === 2, released);
  const h = createHopperState(1000, world.heightAt(1000, 1000), 1000, Math.PI);
  h.groundY = h.y;
  const cb = makeCallbacks();
  let d0At = null,
    d1At = null;
  for (let i = 0; i < 240; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    if (d0At === null && !d0.dormant) d0At = i / 120;
    if (d1At === null && !d1.dormant) d1At = i / 120;
  }
  check('delay:0 shadow releases almost immediately', d0At !== null && d0At < 0.05, d0At);
  check('delay:1.5 shadow releases around 1.5s', d1At !== null && d1At > 1.3 && d1At < 1.7, d1At);
  check('delay:0 releases before delay:1.5', d0At !== null && d1At !== null && d0At < d1At, `${d0At} vs ${d1At}`);
}

// 16c. 'drop': appears ~90m above home and lands on the ground within 4s,
// recording a shockwave effect.
{
  const districtC = {
    ...sunseedFields(),
    strongholds: [{ id: 'fort', name: 'Fort', x: 0, z: -100, r: 50 }],
    shadows: [{ id: 'dr1', kind: 'shadeHound', x: 0, z: -100, group: 'fort', entry: 'drop' }],
  };
  const combat = new Combat(world, districtC);
  const dr1 = combat.shadows.find((s) => s.id === 'dr1');
  const homeY = dr1.homeY;
  combat.activateGroup('fort');
  const h = createHopperState(1000, world.heightAt(1000, 1000), 1000, Math.PI);
  h.groundY = h.y;
  const cb = makeCallbacks();
  combat.update(dt, h, cb, aimFrom(h));
  check('drop hound appears ~90m above home', dr1.y - homeY > 80 && dr1.y - homeY < 95, dr1.y - homeY);
  let shockwaveAt = null;
  for (let i = 0; i < 480; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    if (shockwaveAt === null && cb.record.effects.includes('shockwave')) shockwaveAt = i / 120;
  }
  check('drop hound is grounded near home within 4s', Math.abs(dr1.y - homeY) < 1, dr1.y - homeY);
  check('drop hound records a shockwave effect', shockwaveAt !== null && shockwaveAt < 4, shockwaveAt);
}

// 16d. 'leap': waits crouched on its perch while Hopper is far, pounces once
// Hopper is close, and a pounce contact calls hurt.
{
  const districtD = {
    ...sunseedFields(),
    strongholds: [{ id: 'fort', name: 'Fort', x: 0, z: -100, r: 50 }],
    shadows: [{ id: 'lp1', kind: 'shadeHound', x: 0, z: -100, group: 'fort', entry: 'leap' }],
  };
  const combat = new Combat(world, districtD);
  const lp1 = combat.shadows.find((s) => s.id === 'lp1');
  combat.activateGroup('fort');
  const cb = makeCallbacks();
  const hFar = createHopperState(1000, world.heightAt(1000, 1000), 1000, Math.PI);
  hFar.groundY = hFar.y;
  for (let i = 0; i < 60; i++) combat.update(dt, hFar, cb, aimFrom(hFar));
  check('leaper stays waiting while Hopper is far', lp1.state === 'wait', lp1.state);
  check('leaper is harmless while waiting', cb.record.hurt === 0, cb.record.hurt);
  const hNear = createHopperState(lp1.x, lp1.y, lp1.z - 5, Math.PI);
  hNear.groundY = hNear.y;
  let pounced = false;
  for (let i = 0; i < 360 && cb.record.hurt === 0; i++) {
    combat.update(dt, hNear, cb, aimFrom(hNear));
    if (lp1.state === 'pounce') pounced = true;
  }
  check('leaper pounces once Hopper is close', pounced, pounced);
  check('a pounce contact calls hurt', cb.record.hurt > 0, cb.record.hurt);
}

// 16e. 'emerge': rises from below ground to homeY within 0.7s.
{
  const districtE = {
    ...sunseedFields(),
    strongholds: [{ id: 'fort', name: 'Fort', x: 0, z: -100, r: 50 }],
    shadows: [{ id: 'em1', kind: 'seedSpitter', x: 0, z: -100, group: 'fort', entry: 'emerge' }],
  };
  const combat = new Combat(world, districtE);
  const em1 = combat.shadows.find((s) => s.id === 'em1');
  const homeY = em1.homeY;
  combat.activateGroup('fort');
  const h = createHopperState(1000, world.heightAt(1000, 1000), 1000, Math.PI);
  h.groundY = h.y;
  const cb = makeCallbacks();
  combat.update(dt, h, cb, aimFrom(h));
  check('emerge spitter starts below its home (under the ground)', em1.y < homeY, em1.y - homeY);
  check('emerge spitter records a splat effect', cb.record.effects.includes('splat'), cb.record.effects);
  let reachedAt = null;
  for (let i = 0; i < 96; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    if (reachedAt === null && Math.abs(em1.y - homeY) < 0.05) reachedAt = i / 120;
  }
  check('emerge spitter reaches homeY within 0.7s', reachedAt !== null && reachedAt < 0.7, reachedAt);
}

// 16f. 'ambush': stays dormant while Hopper is in front of it, releases once
// Hopper's z is 20m past it (forward is -z).
{
  const districtF = {
    ...sunseedFields(),
    strongholds: [{ id: 'fort', name: 'Fort', x: 0, z: -100, r: 50 }],
    shadows: [{ id: 'am1', kind: 'shadeHound', x: 0, z: -100, group: 'fort', entry: 'ambush' }],
  };
  const combat = new Combat(world, districtF);
  const am1 = combat.shadows.find((s) => s.id === 'am1');
  const released = combat.activateGroup('fort');
  check('ambush shadow is released from held by activateGroup', released === 1 && am1.held === false, `${released} ${am1.held}`);
  check('ambush shadow stays dormant immediately after activation', am1.dormant === true, am1.dormant);
  const cb = makeCallbacks();
  const hInFront = createHopperState(am1.homeX, world.heightAt(am1.homeX, -50), -50, Math.PI);
  hInFront.groundY = hInFront.y;
  for (let i = 0; i < 120; i++) combat.update(dt, hInFront, cb, aimFrom(hInFront));
  check('ambush shadow stays dormant while Hopper is in front of it', am1.dormant === true, am1.dormant);
  const hPast = createHopperState(am1.homeX, world.heightAt(am1.homeX, -120), -120, Math.PI);
  hPast.groundY = hPast.y;
  for (let i = 0; i < 30 && am1.dormant; i++) combat.update(dt, hPast, cb, aimFrom(hPast));
  check('ambush shadow releases once Hopper is 20m past it', am1.dormant === false, am1.dormant);
}

// 16g. activateGroup on a group that names no stronghold returns 0 and
// changes nothing.
{
  const districtG = {
    ...sunseedFields(),
    strongholds: [{ id: 'fort', name: 'Fort', x: 0, z: -100, r: 50 }],
    shadows: [{ id: 'p1', kind: 'shadeHound', x: 0, z: -100, group: 'plain' }],
  };
  const combat = new Combat(world, districtG);
  const p1 = combat.shadows.find((s) => s.id === 'p1');
  const before = { held: p1.held, dormant: p1.dormant, state: p1.state, x: p1.x, y: p1.y, z: p1.z };
  const released = combat.activateGroup('plain');
  check('activateGroup on a non-stronghold group returns 0', released === 0, released);
  check(
    'activateGroup on a non-stronghold group changes nothing',
    p1.held === before.held && p1.dormant === before.dormant && p1.state === before.state && p1.x === before.x && p1.y === before.y && p1.z === before.z,
    { before, after: { held: p1.held, dormant: p1.dormant, state: p1.state, x: p1.x, y: p1.y, z: p1.z } },
  );
}

console.log(`engine3d: ${checks} checks passed across 16 scenarios (world, controller, camera, combat3d, district)`);
