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
const threeDir = path.dirname(path.dirname(threeModule)); // .../three/build/three.module.js -> .../three
const gltfLoader = path.join(threeDir, 'examples/jsm/loaders/GLTFLoader.js');
const meshoptDecoder = path.join(threeDir, 'examples/jsm/libs/meshopt_decoder.module.js');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hopper-engine3d-'));
const names = ['world', 'controller', 'jumptuning', 'combattuning', 'camera', 'combat3d', 'district', 'district2', 'district3', 'route', 'scenery', 'trailprops', 'boss3d', 'commanders', 'leviathan3d', 'regent3d', 'gait', 'models3d', 'shadows/index', 'shadows/ground', 'shadows/rooted', 'shadows/flyers'];
fs.mkdirSync(path.join(temp, 'shadows'), { recursive: true });
for (const name of names) {
  const raw = fs
    .readFileSync(source + name + '.ts', 'utf8')
    .replace(/from '(\.\.?\/[\w-/]+)'/g, (m, rel) => { const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), rel)); return names.includes(target) || target === 'scene' ? `from '${rel}.mjs'` : m; })
    .replace("'../../../3d/standins/src/index.js'", `'${standIns}'`)
    .replace("'../../../3d/standins/src/palette.js'", `'${new URL('../../../3d/standins/src/palette.js', import.meta.url).pathname}'`)
    .replace("'../../../3d/standins/src/textures.js'", `'${new URL('../../../3d/standins/src/textures.js', import.meta.url).pathname}'`)
    .replace("'three/examples/jsm/loaders/GLTFLoader.js'", `'${gltfLoader}'`)
    .replace("'three/examples/jsm/libs/meshopt_decoder.module.js'", `'${meshoptDecoder}'`)
    .replace(/from 'three'/g, `from '${threeModule}'`)
    // Bare JSON imports (design/delivery manifests, baked collision) need an
    // import attribute under plain Node ESM; `require` reads JSON natively.
    .replace(/import (\w+) from '(\.\.\/[^']+\.json)';/g, (m, ident, rel) => {
      const dir = path.posix.dirname(name);
      const base = dir === '.' ? source : source + dir + '/';
      return `const ${ident} = require('${base}${rel}');`;
    });
  const compiled = ts.transpileModule(raw, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      verbatimModuleSyntax: false,
    },
  }).outputText;
  const withRequire = compiled.includes('require(') ? `import { createRequire as __cr } from 'node:module';\nconst require = __cr(import.meta.url);\n${compiled}` : compiled;
  fs.writeFileSync(path.join(temp, name + '.mjs'), withRequire);
}

const { World } = await import(path.join(temp, 'world.mjs'));
const { stepHopper, createHopperState, predictLanding, MOVE } = await import(path.join(temp, 'controller.mjs'));
const { JUMP } = await import(path.join(temp, 'jumptuning.mjs'));
const { KICK } = await import(path.join(temp, 'combattuning.mjs'));
const { createCamera, updateCamera } = await import(path.join(temp, 'camera.mjs'));
const { Combat } = await import(path.join(temp, 'combat3d.mjs'));
const { NightRook } = await import(path.join(temp, 'boss3d.mjs'));
const { sunseedFields, MISSIONS } = await import(path.join(temp, 'district.mjs'));
const { buildRoute } = await import(path.join(temp, 'route.mjs'));
const { shadowBody } = await import(path.join(temp, 'combat3d.mjs'));
const { Gait, LEGS, solveTwoBone, airFoot } = await import(path.join(temp, 'gait.mjs'));

const dt = 1 / 120;
const blank = {
  dx: 0,
  dz: 0,
  jumpPressed: false,
  jumpHeld: false,
  divePressed: false,
  diveHeld: false,
  chargeHeld: false,
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
  check('16 triggers (7 totems, 6 signals, 3 capsules)', world.triggers.length === 16, world.triggers.length);
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
// 2. The jump on A: it fires at once, and holding A goes higher
// ---------------------------------------------------------------------
{
  // Jump with A held for `holdS` seconds and report the arc.
  const jump = (holdS) => {
    const s = startHopper(0, 40);
    const startY = s.y;
    let apex = 0,
      minRel = 0,
      landAt = null,
      liftAt = null;
    for (let i = 0; i < 600; i++) {
      const ev = stepHopper(s, world, { ...blank, jumpPressed: i === 0, jumpHeld: i * dt < holdS }, dt);
      if (liftAt === null && ev.some((e) => e.kind === 'jump')) liftAt = i / 120;
      apex = Math.max(apex, s.y - startY);
      minRel = Math.min(minRel, s.y - startY);
      if (liftAt !== null && landAt === null && i / 120 > liftAt + 0.1 && ev.some((e) => e.kind === 'land')) landAt = i / 120;
    }
    return { apex, minRel, landAt, liftAt, charged: false };
  };
  const tap = jump(0);
  check('A jumps at once, with no wind-up pause (<0.05s)', tap.liftAt !== null && tap.liftAt < 0.05, tap.liftAt);
  check('a tap of A reaches jumpApexMin', Math.abs(tap.apex - JUMP.jumpApexMin) < 4, `${tap.apex.toFixed(0)} vs ${JUMP.jumpApexMin}`);
  check('a tap never dips below the start by >0.5m', tap.minRel > -0.5, tap.minRel);
  const full = jump(5);
  check('A held the whole way up reaches jumpApexMax', Math.abs(full.apex - JUMP.jumpApexMax) < 5, `${full.apex.toFixed(0)} vs ${JUMP.jumpApexMax}`);
  check('holding A goes markedly higher than tapping it', full.apex > tap.apex * 2.5, `${full.apex.toFixed(0)} vs ${tap.apex.toFixed(0)}`);
  // ...and everything between is a matter of how long it is held.
  const mid = jump(0.22);
  check('a half hold lands between the two', mid.apex > tap.apex + 3 && mid.apex < full.apex - 3, `${mid.apex.toFixed(0)} between ${tap.apex.toFixed(0)} and ${full.apex.toFixed(0)}`);
  check('the jump is not the charged one', tap.charged === false, tap.charged);
  // A press and its release inside one step is still a jump.
  {
    const q = startHopper(0, 40);
    const ev = stepHopper(q, world, { ...blank, jumpPressed: true, jumpHeld: false }, dt);
    check('a press and release in one step still jumps', ev.some((e) => e.kind === 'jump'), ev);
  }
  // A alone never winds anything: no crouch, no charge, no pause.
  {
    const q = startHopper(0, 40);
    for (let i = 0; i < 240; i++) stepHopper(q, world, { ...blank, jumpPressed: i === 0, jumpHeld: true }, dt);
    check('A never winds a spring', q.charge === 0 && q.springHold === 0, `${q.charge}, ${q.springHold}`);
  }
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
    // Tap to jump, then take A up again in the air to beat the wings.
    const ev = stepHopper(s, world, { ...blank, jumpPressed: i === 0, jumpHeld: i === 0 || (i > 3 && i < 420) }, dt);
    apex = Math.max(apex, s.y - startY);
    if (hoverStart === null && ev.some((e) => e.kind === 'hoverStart')) hoverStart = i / 120;
    if (hoverEnd === null && ev.some((e) => e.kind === 'hoverEnd')) hoverEnd = i / 120;
    if (s.hovering) heldAt.push(s.y - startY);
    if (landAt === null && ev.some((e) => e.kind === 'land')) landAt = i / 120;
  }
  check('taking A up again in the air is a hover, not a boost (the apex stays a tap of A)', apex > JUMP.jumpApexMin - 4 && apex < JUMP.jumpApexMin + 6, `${apex.toFixed(0)} vs ${JUMP.jumpApexMin}`);
  check('hover starts near the apex (0.1-1.0s)', hoverStart !== null && hoverStart > 0.1 && hoverStart < 1.0, hoverStart);
  check('hover lasts about the fuel (1.5-2.1s)', hoverStart !== null && hoverEnd !== null && hoverEnd - hoverStart > 1.5 && hoverEnd - hoverStart < 2.1, hoverEnd - hoverStart);
  const held = heldAt.slice(Math.floor(heldAt.length * 0.4));
  check('altitude held while hovering (drift < 3m)', held.length > 10 && Math.max(...held) - Math.min(...held) < 3, held.length ? Math.max(...held) - Math.min(...held) : null);
  check('hovering lands later than a tap (>2.2s)', landAt !== null && landAt > 2.2, landAt);
  check('winding the spring in the air is impossible: LB up there never charges', s.charge === 0, s.charge);
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
    // Wind with the stick neutral so the spring goes up rather than out --
    // the aim is read at the moment it is let go, so the stick stays neutral
    // through the release -- then take A up again in the air and steer
    // forward: hover, then glide.
    const ev = stepHopper(s, world, { ...blank, jumpPressed: i === 0, jumpHeld: i < 144 || i > 147, dz: i > 150 ? -1 : 0 }, dt);
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
  for (let i = 0; i < 120; i++) stepHopper(s, world, { ...blank, dz: -1, faceYaw: forward }, dt);
  const vFwd = Math.hypot(s.vx, s.vz);
  for (let i = 0; i < 120; i++) stepHopper(s, world, { ...blank, dz: 1, faceYaw: forward }, dt);
  const vBack = Math.hypot(s.vx, s.vz);
  const yawAfterBack = s.yaw;
  for (let i = 0; i < 120; i++) stepHopper(s, world, { ...blank, dx: 1, faceYaw: forward }, dt);
  const vSide = Math.hypot(s.vx, s.vz);
  check('forward run reaches full speed', vFwd > MOVE.run - 2, vFwd);
  check('backpedal is slower (45-65% of run)', vBack > vFwd * 0.45 && vBack < vFwd * 0.65, vBack / vFwd);
  check('strafe is a little slower', vSide > vFwd * 0.75 && vSide < vFwd * 0.95, vSide / vFwd);
  check('facing holds forward while backpedalling', Math.abs(yawAfterBack - forward) < 0.05, yawAfterBack - forward);
  check('facing holds forward while strafing', Math.abs(s.yaw - forward) < 0.05, s.yaw - forward);
}

// ---------------------------------------------------------------------
// 5. The wind-up: LB held roots Hopper, the stick aims it, 1.5 s is full
// ---------------------------------------------------------------------
{
  // Held at a run: nothing is given up inside the tap window, and only past
  // it does he stop dead and stay put while the spring winds.
  const s = startHopper(0, 40);
  for (let i = 0; i < 180; i++) stepHopper(s, world, { ...blank, dz: -1 }, dt);
  const running = Math.hypot(s.vx, s.vz);
  check('running speed is real before the wind-up', running > 60, running);
  const inside = Math.round((MOVE.tapWindow * 0.8) / dt);
  for (let i = 0; i < inside; i++) stepHopper(s, world, { ...blank, dz: -1, superPressed: i === 0, superHeld: true }, dt);
  check('inside the tap window he keeps running', Math.hypot(s.vx, s.vz) > running * 0.9, Math.hypot(s.vx, s.vz));
  check('and does not crouch or wind', s.move !== 'crouch' && s.charge === 0, `${s.move}, ${s.charge}`);
  const zHeld = s.z;
  for (let i = 0; i < 120; i++) stepHopper(s, world, { ...blank, dz: -1, superHeld: true }, dt);
  check('past it he stops where he stands (<8m of drift)', Math.abs(s.z - zHeld) < 8, s.z - zHeld);
  check('and he crouches into it', s.move === 'crouch', s.move);
  check('the wind builds toward full charge', s.charge > 0.7 && s.charge < 0.85, s.charge);
  check('the crouch carries the aim it will leave at', s.chargeAim > MOVE.aimForward - 0.01 && s.chargeAim < MOVE.aimNeutral, s.chargeAim);

  // A release inside the tap window is the quick hop, taken at full stride.
  {
    const q = startHopper(0, 40);
    for (let i = 0; i < 180; i++) stepHopper(q, world, { ...blank, dz: -1 }, dt);
    const before = Math.hypot(q.vx, q.vz);
    let launched = null;
    for (let i = 0; i < 120 && launched === null; i++) {
      const ev = stepHopper(q, world, { ...blank, dz: -1, superPressed: i === 0, superHeld: i * dt < MOVE.tapWindow * 0.5 }, dt);
      if (ev.some((e) => e.kind === 'jump')) launched = Math.hypot(q.vx, q.vz);
    }
    check('a hop taken inside the window never breaks stride', launched !== null && launched >= before - 0.5, `${launched?.toFixed(0)} from ${before.toFixed(0)}`);
  }

  // Hold A for `holdS` seconds with the stick at `stick` (+1 forward, 0
  // neutral, -1 back), let go, and report the arc. The aim is read at the
  // moment it is let go, so the stick is held all the way through release.
  const spring = (holdS, stick = 0) => {
    const q = startHopper(0, 40);
    // The camera's forward is the aim's reference, as it is in play: inside
    // the tap window he is still running, so without one a pulled-back stick
    // would simply turn him around.
    const face = q.yaw;
    const startY = q.y,
      startZ = q.z;
    let apex = 0,
      jump = null,
      aim = 0,
      air = 0,
      launch = 0;
    for (let i = 0; i < 2400; i++) {
      const ev = stepHopper(
        q,
        world,
        {
          ...blank,
          dz: -stick,
          faceYaw: face,
          superPressed: i === 0,
          superHeld: i * dt < holdS,
        },
        dt,
      );
      for (const e of ev)
        if (e.kind === 'jump') {
          jump = e;
          aim = (q.chargeAim * 180) / Math.PI;
          // Forward is -Z here, so this is the launch's own forward speed.
          launch = -q.vz;
        }
      if (jump) {
        air += dt;
        apex = Math.max(apex, q.y - startY);
        if (air > 0.15 && ev.some((e) => e.kind === 'land')) break;
      }
    }
    return { apex, jump, aim, air, launch, range: Math.abs(q.z - startZ) };
  };
  const up = spring(1.5, -1);
  check(
    'a full wind fires a charged jump',
    up.jump !== null && up.jump.charged === true,
    up.jump,
  );
  check(
    'pulled fully back it leaves straight up (90 deg)',
    Math.abs(up.aim - 90) < 0.5,
    up.aim,
  );
  check(
    'and that is the highest jump there is',
    Math.abs(up.apex - JUMP.chargeApexMax) < 6,
    `${up.apex.toFixed(0)} vs ${JUMP.chargeApexMax}`,
  );
  check(
    'holding past 1.5s adds nothing',
    Math.abs(spring(2.5, -1).apex - up.apex) < 1,
    spring(2.5, -1).apex - up.apex,
  );
  check(
    'half a wind is well short of a full one',
    spring(0.75, -1).apex < up.apex * 0.7,
    `${spring(0.75, -1).apex.toFixed(0)} vs ${up.apex.toFixed(0)}`,
  );

  // The stick's own throw picks the angle, and never throws him backwards.
  const mid = spring(1.5, 0),
    lunge = spring(1.5, 1),
    half = spring(1.5, 0.5);
  check('neutral leaves at 45 deg', Math.abs(mid.aim - 45) < 0.5, mid.aim);
  check(
    'fully forward leaves flat, as a lunge',
    Math.abs(lunge.aim - (MOVE.aimForward * 180) / Math.PI) < 0.5,
    lunge.aim,
  );
  check(
    'a half push aims halfway between',
    half.aim > lunge.aim + 5 && half.aim < mid.aim - 5,
    `${half.aim.toFixed(0)} between ${lunge.aim.toFixed(0)} and ${mid.aim.toFixed(0)}`,
  );
  check(
    'the flatter the aim the lower the arc',
    lunge.apex < half.apex && half.apex < mid.apex && mid.apex < up.apex,
    [lunge.apex, half.apex, mid.apex, up.apex]
      .map((n) => n.toFixed(0))
      .join(' < '),
  );
  check(
    'the lunge is a low, fast dart, not a jump',
    lunge.apex < 25 && lunge.range > 200,
    `${lunge.apex.toFixed(0)}m apex over ${lunge.range.toFixed(0)}m`,
  );
  // Pulling back stands the launch up; it never throws him backwards. (He
  // can still steer back in the air afterwards -- that is the air control.)
  check(
    'pulled back he never launches backwards',
    up.launch >= -0.01 &&
      spring(1.5, -0.5).launch > 0 &&
      spring(1.5, -0.25).launch > 0,
    `${up.launch.toFixed(1)} / ${spring(1.5, -0.5).launch.toFixed(1)}`,
  );
  check(
    'straight up leaves with no ground speed at all',
    Math.abs(up.launch) < 0.01,
    up.launch,
  );

  // The spring's numbers live in jumptuning.ts and nowhere else, so the feel
  // can be changed in one file. If a literal ever creeps back into MOVE this
  // stops naming the tuning file as the source of truth.
  const tuned = Object.keys(JUMP);
  check(
    'the jump tuning file carries the spring, the aim, the arc and the run',
    [
      'chargeTime',
      'chargeApexMin',
      'chargeApexMax',
      'aimForward',
      'aimForwardTap',
      'aimNeutral',
      'aimBack',
      'lungeBoost',
      'crouchSink',
      'crouchAim',
      'gravity',
      'fallGravity',
      'run',
      'sprint',
    ].every((k) => tuned.includes(k)),
    tuned.join(' '),
  );
  check(
    'and the controller takes every one of them from it',
    tuned.every((k) => MOVE[k] === JUMP[k]),
    tuned.filter((k) => MOVE[k] !== JUMP[k]).join(' '),
  );
  check(
    'the wind-up the sim used is the one the file names',
    Math.abs(MOVE.chargeTime - JUMP.chargeTime) < 1e-9,
    MOVE.chargeTime,
  );
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
      // Wind for half a second, spring, then dive out of the arc.
      { ...blank, jumpPressed: i === 0, jumpHeld: i < 60, divePressed: i === 105 },
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
    for (const e of ev) if (e.kind === 'land' && plainLandAt === null && i > 62) plainLandAt = i / 120;
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
  // Close to the silo: the mightier jump would clear it from farther out.
  const s = startHopper(-36, -76);
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
  const face = s.yaw;
  let apex = 0;
  // Past the tap window the wind runs for 1.05s, so a little over 0.7 of it.
  const letGo = Math.round((MOVE.tapWindow + 1.05) / dt);
  for (let i = 0; i < 1800; i++) {
    // Wind LB with the stick pulled back so the spring goes straight up the
    // column, then hold A to ride it on beating wings.
    stepHopper(s, world, { ...blank, faceYaw: face, superPressed: i === 0, superHeld: i < letGo, jumpHeld: i > letGo + 3, dz: i <= letGo ? 1 : 0 }, dt);
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
    check('camera settles 25-66m from Hopper', eyeDist > 25 && eyeDist < 66, eyeDist);
    check(
      'camera eye is above the terrain',
      cam.eye[1] > world.heightAt(cam.eye[0], cam.eye[2]),
      `${cam.eye[1]} vs ${world.heightAt(cam.eye[0], cam.eye[2])}`,
    );
  }

  // A run with hops and landings: the camera takes a smooth path. Its eye
  // never jolts (no frame-to-frame change of velocity beyond a small bound)
  // and a landing does not drop the picture: the eye's height changes in
  // a frame by less than a metre.
  {
    // Along the trail rather than straight across country: the trail is the
    // lane kept clear of the solid props that flank it, and running into a
    // tree stops him dead, which is a collision the camera is right to
    // follow and not the smoothness this scenario is about.
    const path = world.route;
    const start = path.pointAt(60);
    const h = startHopper(start.x, start.z);
    h.yaw = path.yawAt(60);
    const along = () => {
      const ahead = path.yawAt(path.nearest(h.x, h.z).s + 40);
      return { dx: Math.sin(ahead), dz: Math.cos(ahead) };
    };
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    for (let i = 0; i < 120; i++) updateCamera(cam, h, world, blankCam, settings, dt);
    let prevEye = [...cam.eye],
      prevPos = [h.x, h.z],
      settle = 0,
      prevV = null,
      worstJolt = 0,
      worstAt = '',
      worstRise = 0,
      landings = 0,
      wasAir = false;
    for (let i = 0; i < 120 * 16; i++) {
      const jumpPressed = i % 180 === 30;
      const ev = stepHopper(h, world, { ...blank, ...along(), jumpPressed, jumpHeld: jumpPressed }, dt);
      if (ev.some((e) => e.kind === 'land')) landings++;
      // A step where Hopper himself is moved further than his own speed
      // explains is a collision resolve shoving him out of something (the
      // baked terrace collision on this stretch wedges him whether he
      // springs or just runs). The camera following that is not the
      // smoothness this scenario is about, so it stands down for a moment.
      const shoved = Math.hypot(h.x - prevPos[0], h.z - prevPos[1]) > Math.hypot(h.vx, h.vz) * dt + 1;
      prevPos = [h.x, h.z];
      settle = shoved ? 24 : Math.max(0, settle - 1);
      wasAir = h.height > 0.5;
      updateCamera(cam, h, world, blankCam, settings, dt);
      const v = [(cam.eye[0] - prevEye[0]) / dt, (cam.eye[1] - prevEye[1]) / dt, (cam.eye[2] - prevEye[2]) / dt];
      if (prevV) {
        const jolt = Math.hypot(v[0] - prevV[0], v[1] - prevV[1], v[2] - prevV[2]);
        if (jolt > worstJolt && settle <= 0) {
          worstJolt = jolt;
          worstAt = `t ${(i / 120).toFixed(2)} height ${h.height.toFixed(1)} at ${h.x.toFixed(0)},${h.z.toFixed(0)} clip ${cam.clip.toFixed(2)} dv ${(v[0] - prevV[0]).toFixed(1)},${(v[1] - prevV[1]).toFixed(1)},${(v[2] - prevV[2]).toFixed(1)}`;
        }
      }
      if (settle <= 0) worstRise = Math.max(worstRise, Math.abs(cam.eye[1] - prevEye[1]));
      prevV = v;
      prevEye = [...cam.eye];
    }
    check('the run had hops that landed', landings >= 5, landings);
    check('the camera eye never jolts on a run with landings (velocity change per frame < 6 m/s)', worstJolt < 6, `${worstJolt} ${worstAt}`);
    check('the camera eye height never steps more than 0.6 m in a frame', worstRise < 0.6, worstRise);
    void wasAir;
  }

  // lookX orbits the camera.
  {
    const h = startHopper(0, 40);
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    const yaw0 = cam.yaw;
    for (let i = 0; i < 60; i++) updateCamera(cam, h, world, { ...blankCam, lookX: 1 }, settings, dt);
    check('lookX changes yaw by >0.5 rad', Math.abs(cam.yaw - yaw0) > 0.5, cam.yaw - yaw0);
  }

  // Forward is the default, not a demand. A turned view stays put when the
  // stick is released, begins to drift back only after a couple of seconds
  // without a touch, never turns faster than a slow pan, and ends up
  // forward; a stick click brings it round quickly but still as a turn.
  {
    const h = startHopper(0, 40);
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    const forward = cam.forward;
    for (let i = 0; i < 90; i++) updateCamera(cam, h, world, { ...blankCam, lookX: 1, forward }, settings, dt);
    const held = cam.turn;
    check('the view can be turned well past 45° (>1.2 rad)', Math.abs(held) > 1.2 && Math.abs(held) <= Math.PI * 0.8 + 1e-9, held);
    let worstStep = 0,
      prevYaw = cam.yaw;
    const yawAt = [];
    for (let i = 0; i < 120 * 14; i++) {
      updateCamera(cam, h, world, { ...blankCam, forward }, settings, dt);
      worstStep = Math.max(worstStep, Math.abs(cam.yaw - prevYaw) / dt);
      prevYaw = cam.yaw;
      yawAt.push(cam.turn);
    }
    check('a released turn holds for the first 1.8 s (moves < 0.5°)', Math.abs(yawAt[120 * 1.8 - 1] - held) < 0.009, yawAt[120 * 1.8 - 1] - held);
    check('the drift back has begun by 4 s', Math.abs(yawAt[120 * 4 - 1]) < Math.abs(held) - 0.05, yawAt[120 * 4 - 1]);
    check('the drift never turns faster than 0.5 rad/s', worstStep < 0.5, worstStep);
    check('the view is forward again within 14 s', Math.abs(cam.turn) < 0.04, cam.turn);
    // The stick click.
    for (let i = 0; i < 90; i++) updateCamera(cam, h, world, { ...blankCam, lookX: -1, forward }, settings, dt);
    const before = cam.turn;
    let clickStep = 0;
    prevYaw = cam.yaw;
    for (let i = 0; i < 120; i++) {
      updateCamera(cam, h, world, { ...blankCam, resetPressed: i === 0, forward }, settings, dt);
      clickStep = Math.max(clickStep, Math.abs(cam.yaw - prevYaw) / dt);
      prevYaw = cam.yaw;
    }
    check('a stick click recentres within a second', Math.abs(before) > 1 && Math.abs(cam.turn) < 0.03, `${before} -> ${cam.turn}`);
    check('the recentre is a pan, not a cut (< 12 rad/s)', clickStep < 12 && clickStep > 1, clickStep);
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

  // Aiming (LT) is a camera mode of distance and zoom only: it comes in over
  // the shoulder and narrows the field, it holds where the player is looking
  // rather than drifting home, the trail bending underneath does not drag it,
  // and it never turns the view by a degree, going in or coming out.
  {
    const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const h = startHopper(0, 40);
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    const forward = cam.forward;
    for (let i = 0; i < 240; i++) updateCamera(cam, h, world, { ...blankCam, forward }, settings, dt);
    const yaw0 = cam.yaw,
      dist0 = cam.distance,
      fov0 = cam.fov;
    let worstStep = 0,
      prevYaw = cam.yaw;
    for (let i = 0; i < 240; i++) {
      updateCamera(cam, h, world, { ...blankCam, forward, aimHeld: true }, settings, dt);
      worstStep = Math.max(worstStep, Math.abs(wrapA(cam.yaw - prevYaw)) / dt);
      prevYaw = cam.yaw;
    }
    check('aiming brings the camera in', cam.distance < dist0 - 5 && cam.distance > 30, cam.distance);
    check('aiming zooms in', cam.fov < fov0 - 15, cam.fov);
    check('aiming levels the picture off', cam.viewPitch < 0.2 && cam.viewPitch > 0, cam.viewPitch);
    check('aiming does not turn the view', Math.abs(wrapA(cam.yaw - yaw0)) < 0.01 && worstStep < 0.05, `${wrapA(cam.yaw - yaw0)} ${worstStep}`);
    // Turned off the trail and held there: aiming does not wind it back.
    for (let i = 0; i < 60; i++) updateCamera(cam, h, world, { ...blankCam, forward, aimHeld: true, lookX: 1 }, settings, dt);
    const turned = cam.turn;
    for (let i = 0; i < 120 * 8; i++) updateCamera(cam, h, world, { ...blankCam, forward, aimHeld: true }, settings, dt);
    check('the aim stays where it is put, it does not drift home', Math.abs(cam.turn - turned) < 0.01, `${turned} -> ${cam.turn}`);
    // The trail bending under Hopper does not drag the shot off either.
    const yawHeld = cam.yaw;
    for (let i = 0; i < 120 * 3; i++) updateCamera(cam, h, world, { ...blankCam, forward: forward + 0.9, aimHeld: true }, settings, dt);
    check('a bend in the trail does not drag the aim', Math.abs(wrapA(cam.yaw - yawHeld)) < 0.02, wrapA(cam.yaw - yawHeld));
    check('and the trail direction went on turning underneath', Math.abs(wrapA(cam.forward - forward)) > 0.5, wrapA(cam.forward - forward));
    // Released: the shot goes back out, and the drift takes it home.
    const yawOut = cam.yaw;
    let outStep = 0;
    prevYaw = cam.yaw;
    for (let i = 0; i < 120; i++) {
      updateCamera(cam, h, world, { ...blankCam, forward: forward + 0.9 }, settings, dt);
      outStep = Math.max(outStep, Math.abs(wrapA(cam.yaw - prevYaw)) / dt);
      prevYaw = cam.yaw;
    }
    check('releasing the aim goes back out without turning the view', cam.distance > dist0 - 6 && cam.fov > fov0 - 3 && Math.abs(wrapA(cam.yaw - yawOut)) < 0.05, `${cam.distance.toFixed(1)} ${cam.fov.toFixed(1)} ${wrapA(cam.yaw - yawOut).toFixed(2)}`);
    check('and it comes out as a turn, never a cut', outStep < 1.2, outStep);
    // Only then does the view make its own slow way back to the trail.
    for (let i = 0; i < 120 * 16; i++) updateCamera(cam, h, world, { ...blankCam, forward: forward + 0.9 }, settings, dt);
    check('the drift home waits for the trigger, then takes the view back to the trail', Math.abs(cam.turn) < 0.05, cam.turn);
  }

  // Leaving Horizon View does not snap the picture: the yaw it was left at
  // becomes a manual turn from forward, and the recentre pans it home.
  {
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const h = startHopper(0, 40);
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    const forward = cam.forward;
    const landmark = [h.x + 900, 200, h.z - 900];
    for (let i = 0; i < 240; i++) updateCamera(cam, h, world, { ...blankCam, horizonHeld: true, landmark, forward }, settings, dt);
    const turned = cam.yaw;
    let worstStep = 0,
      prevYaw = cam.yaw;
    for (let i = 0; i < 240; i++) {
      updateCamera(cam, h, world, { ...blankCam, forward }, settings, dt);
      worstStep = Math.max(worstStep, Math.abs(wrap(cam.yaw - prevYaw)) / dt);
      prevYaw = cam.yaw;
    }
    check('releasing Horizon View carries the yaw over, it does not cut', Math.abs(wrap(turned - cam.yaw)) > 0.3 && worstStep < 12, `${worstStep.toFixed(2)} rad/s`);
    check('and the view is back on the trail within 2 s', Math.abs(wrap(cam.yaw - forward)) < 0.05, wrap(cam.yaw - forward));
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

// ---------------------------------------------------------------------
// 13i. The kick is the whole defence: it turns a shot from any side.
// ---------------------------------------------------------------------
{
  const h = startHopper(40, -218);
  const combat = new Combat(world, district);
  const cb = makeCallbacks();
  const shot = (dx, dz) => ({
    id: 9000 + combat.projectiles.length,
    kind: 'orb',
    owner: 'shadow',
    ownerId: 'nobody',
    x: h.x + dx * 12,
    y: h.y + 6,
    z: h.z + dz * 12,
    vx: -dx * 90,
    vy: 0,
    vz: -dz * 90,
    gravity: 0,
    radius: 2,
    damage: 2,
    life: 3,
  });
  // No kick out: the shot lands.
  combat.projectiles.push(shot(0, 1));
  let hurt = 0;
  for (let i = 0; i < 30; i++) combat.update(dt, h, { ...cb, hurt: () => (hurt++, false) }, aimFrom(h));
  check('with no kick out a shot gets through', hurt > 0, hurt);
  // Kicking: a shot from behind is turned back at its shooter, as one from
  // the front is. There is no side the sweep does not cover.
  for (const [dx, dz, side] of [[0, 1, 'ahead'], [0, -1, 'behind'], [1, 0, 'beside']]) {
    const c2 = new Combat(world, district);
    let hit = 0;
    c2.update(dt, h, cb, aimFrom(h, { kickPressed: true }));
    c2.projectiles.push(shot(dx, dz));
    const p = c2.projectiles[c2.projectiles.length - 1];
    for (let i = 0; i < 20; i++) c2.update(dt, h, { ...cb, hurt: () => (hit++, false) }, aimFrom(h));
    check(`a shot from ${side} is parried, not taken`, hit === 0 && p.owner === 'hopper', `${side}: hurt ${hit}, owner ${p.owner}`);
    check(`and the parried shot from ${side} flies back`, p.vx * dx + p.vz * dz > 0, `${p.vx.toFixed(0)},${p.vz.toFixed(0)}`);
  }
  // The parry window is wider than the damage window, so turning to meet
  // something is enough.
  check('the parry outlasts the sweep that damages', KICK.parryFrom < KICK.hitFrom, `${KICK.parryFrom} vs ${KICK.hitFrom}`);
  // The sweep reaches further than Hopper's own body by the tuned reach.
  {
    const c3 = new Combat(world, district);
    const far = c3.shadows.find((s) => s.alive);
    if (far) {
      far.x = h.x + KICK.reach + MOVE.radius + far.radius - 1;
      far.z = h.z;
      far.y = h.y;
      const hp = far.hp;
      c3.update(dt, h, cb, aimFrom(h, { kickPressed: true }));
      for (let i = 0; i < 30; i++) c3.update(dt, h, cb, aimFrom(h));
      check('the sweep reaches the full tuned distance', far.hp < hp, `${hp} -> ${far.hp} at ${(far.x - h.x).toFixed(0)}m`);
    }
  }
  // Nothing of the old held guard is left on the combat world.
  check('there is no guard left to hold', !('guarding' in combat) && !('shield' in combat), Object.keys(combat).filter((k) => k === 'guarding' || k === 'shield').join(' '));
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
    // The trail itself bends through here (an S between totems), so the view may pan with it a little; it must not turn to follow Hopper.
    check('camera keeps facing along the trail while Hopper runs back toward it', Math.abs(wrap(cam.yaw - forward0)) < 0.55, wrap(cam.yaw - forward0));
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
    check('tap jump peaks within 1.0 s', apexAt < 1.0, apexAt);
  }
  // (g) Every shadow is Hopper's size or bigger (he is 14 m tall).
  for (const kind of ['shadeHound', 'seedSpitter', 'windowRay', 'spireLeech', 'cragTortoise', 'riftCondor']) {
    const b = shadowBody(kind);
    check(`${kind} body reaches Hopper's scale (height or span >= 12 m)`, Math.max(b.height, b.radius * 2) >= 12, b);
    check(`${kind} is scaled up from its stand-in`, b.size >= 2.8, b.size);
  }
}

// ---------------------------------------------------------------------
// 17. The spring on LB travels: the stick aims it, the wind powers it
// ---------------------------------------------------------------------
{
  // Run up to speed, hold A for `hold` seconds with the stick at `stick`
  // (+1 forward, 0 neutral, -1 back), spring, and report the arc. `hold` 0
  // is a tap: pressed and released inside one step.
  const arc = ({ runUp = 0, sprint = false, hold = 0, stick = 1 }) => {
    const s = startHopper(0, 40);
    const face = s.yaw;
    for (let i = 0; i < Math.round(runUp / dt); i++)
      stepHopper(s, world, { ...blank, dz: -1, sprintHeld: sprint }, dt);
    const z0 = s.z,
      y0 = s.y,
      running = Math.hypot(s.vx, s.vz);
    let apex = 0,
      air = 0,
      launched = false,
      slowest = Infinity,
      takeoff = 0,
      aim = 0;
    for (let i = 0; i < 2400; i++) {
      const ev = stepHopper(
        s,
        world,
        {
          ...blank,
          dz: -stick,
          faceYaw: face,
          sprintHeld: sprint,
          superPressed: i === 0,
          superHeld: i * dt < hold,
        },
        dt,
      );
      if (!launched && ev.some((e) => e.kind === 'jump')) {
        launched = true;
        takeoff = Math.hypot(s.vx, s.vz);
        aim = (s.chargeAim * 180) / Math.PI;
      }
      if (launched) {
        air += dt;
        apex = Math.max(apex, s.y - y0);
        if (air > 0.05) slowest = Math.min(slowest, Math.hypot(s.vx, s.vz));
        if (air > 0.12 && ev.some((e) => e.kind === 'land')) break;
      }
    }
    // Ground covered per second over the whole manoeuvre, wind-up included.
    return {
      running,
      takeoff,
      apex,
      air,
      aim,
      range: Math.abs(s.z - z0),
      slowest,
      pace: Math.abs(s.z - z0) / (hold + air),
    };
  };
  check('run speed is at least 66 m/s', MOVE.run >= 66, MOVE.run);
  const tap = arc({ runUp: 1.5 });
  check(
    'a tap forward at a run keeps the pace it interrupted',
    tap.pace >= MOVE.run,
    `${tap.pace.toFixed(0)} vs ${MOVE.run}`,
  );
  check(
    'a tap is a low, quick arc (apex under 12m, under 0.8s)',
    tap.apex < 12 && tap.air < 0.8,
    `${tap.apex.toFixed(0)}m, ${tap.air.toFixed(2)}s`,
  );
  check(
    'a tap cannot reach the flattest aim',
    tap.aim > (MOVE.aimForward * 180) / Math.PI + 5,
    tap.aim,
  );
  const half = arc({ runUp: 1.5, hold: 0.75 });
  const full = arc({ runUp: 1.5, hold: 1.5 });
  check(
    'more wind, more ground',
    full.range > half.range && half.range > tap.range,
    `${tap.range.toFixed(0)} / ${half.range.toFixed(0)} / ${full.range.toFixed(0)}`,
  );
  check(
    'more wind, flatter aim',
    full.aim < half.aim && half.aim < tap.aim,
    `${tap.aim.toFixed(0)} / ${half.aim.toFixed(0)} / ${full.aim.toFixed(0)}`,
  );
  check(
    'a wound spring forward beats running outright',
    half.pace > MOVE.run * 1.5 && full.pace > MOVE.run * 1.5,
    `${half.pace.toFixed(0)} / ${full.pace.toFixed(0)} vs ${MOVE.run}`,
  );
  check(
    'a full wind forward is a lunge, not a jump: fast and flat',
    full.takeoff > MOVE.run * 4 && full.apex < 30,
    `${full.takeoff.toFixed(0)} m/s over ${full.apex.toFixed(0)}m`,
  );
  check(
    'a spring keeps its speed in the air, never dragged back',
    full.slowest >= full.takeoff - 1,
    `${full.slowest.toFixed(0)} from ${full.takeoff.toFixed(0)}`,
  );
  const mid = arc({ runUp: 1.5, hold: 1.5, stick: 0 });
  check(
    'neutral trades the lunge for height and covers most ground of all',
    mid.apex > full.apex * 4 && mid.pace > full.pace,
    `apex ${mid.apex.toFixed(0)} vs ${full.apex.toFixed(0)}, pace ${mid.pace.toFixed(0)} vs ${full.pace.toFixed(0)}`,
  );
  check(
    'and neutral at a full wind doubles the run',
    mid.pace > MOVE.run * 1.9 && mid.pace < MOVE.run * 2.3,
    `${mid.pace.toFixed(0)} vs ${MOVE.run}`,
  );
  const up = arc({ runUp: 1.5, hold: 1.5, stick: -1 });
  check(
    'pulled back is the highest jump and goes nowhere',
    Math.abs(up.apex - JUMP.chargeApexMax) < 6 && up.takeoff < 0.1,
    `${up.apex.toFixed(0)}m at ${up.takeoff.toFixed(1)} m/s`,
  );
  // A wind-up stops Hopper, so the sprint is spent by the time a wound
  // spring leaves; a tap has not stopped him, and keeps every bit of it.
  const sprintTap = arc({ runUp: 1.5, sprint: true });
  check(
    'a tap at a sprint keeps the sprint',
    sprintTap.takeoff > tap.takeoff + 10 && sprintTap.range > tap.range * 1.1,
    `${sprintTap.range.toFixed(0)} at ${sprintTap.takeoff.toFixed(0)} vs ${tap.range.toFixed(0)} at ${tap.takeoff.toFixed(0)}`,
  );
  check(
    'a spring never leaves slower than the run it interrupted',
    tap.takeoff >= tap.running - 0.5,
    `${tap.takeoff.toFixed(0)} from ${tap.running.toFixed(0)}`,
  );
  // Pushing back against the flight still slows Hopper down: control is kept.
  {
    const s = startHopper(0, 40);
    for (let i = 0; i < 180; i++)
      stepHopper(s, world, { ...blank, dz: -1, sprintHeld: true }, dt);
    for (let i = 0; i < 120; i++)
      stepHopper(
        s,
        world,
        {
          ...blank,
          dz: -1,
          sprintHeld: true,
          superPressed: i === 0,
          superHeld: true,
        },
        dt,
      );
    stepHopper(
      s,
      world,
      { ...blank, dz: -1, sprintHeld: true, superHeld: false },
      dt,
    );
    const launched = Math.hypot(s.vx, s.vz);
    for (let i = 0; i < 60; i++) stepHopper(s, world, { ...blank, dz: 1 }, dt);
    check(
      'pushing back in the air brakes the spring',
      Math.hypot(s.vx, s.vz) < launched - 40,
      `${launched.toFixed(0)} -> ${Math.hypot(s.vx, s.vz).toFixed(0)}`,
    );
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
        // A generated abutment that got a delivered (fixed-shape) model can
        // run taller than the parametric height scenery.ts asked for, and
        // its footprint no longer matches the parametric w/d the abutment
        // was sized to either -- it still holds the deck up, so look a good
        // margin above the naive "exactly at deck height" ceiling, and a
        // wider radius, rather than only right at the deck's own edge.
        const support = w.groundAt(ex, ez, base + deck + 60, 20).y;
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

// ---------------------------------------------------------------------
// 21. Stronghold hosts: perched in plain view, staring, released in delay
// order, leaping or launching off their perches. Each scenario builds combat
// from a copy of sunseedFields() with a synthetic `shadows` and `strongholds`
// list placed on one of the district's own structures.
// ---------------------------------------------------------------------
const fortAt = (() => {
  // A structure with a top the perch finder accepts, so the host has
  // something tall to wait on.
  for (const p of sunseedFields().placements) {
    if (!p.id.startsWith('structure.')) continue;
    const top = world.perchNear(p.x, p.z);
    if (top && top.y - world.heightAt(top.x, top.z) >= 10) return { x: p.x, z: p.z, top };
  }
  return null;
})();
check('sunseed has a structure top to perch a host on', !!fortAt, fortAt);
const fort = { id: 'fort', name: 'Fort', x: fortAt.x, z: fortAt.z, r: 80 };
const farHopper = () => {
  const h = createHopperState(1000, world.heightAt(1000, 1000), 1000, Math.PI);
  h.groundY = h.y;
  return h;
};

// 21a. A held host starts held+dormant, crouched on a structure top, in
// plain view and targetable; resetToCheckpoint's internal wake() does not
// release it.
{
  const districtA = { ...sunseedFields(), strongholds: [fort], shadows: [{ id: 'g1', kind: 'shadeHound', x: fort.x, z: fort.z, group: 'fort' }] };
  const combat = new Combat(world, districtA);
  const g1 = combat.shadows.find((s) => s.id === 'g1');
  check('held host starts held', g1.held === true, g1.held);
  check('held host starts dormant', g1.dormant === true, g1.dormant);
  check('held host is perched and waiting', g1.perched === true && g1.state === 'wait', `${g1.perched} ${g1.state}`);
  const rise = g1.y - world.heightAt(g1.x, g1.z);
  check('held host waits on a structure top at least 10 m up', rise >= 10, rise);
  check('held host stands on that top', Math.abs(world.groundAt(g1.x, g1.z, g1.y + 0.5).y - g1.y) < 0.05, world.groundAt(g1.x, g1.z, g1.y + 0.5).y - g1.y);
  check('aliveShadows() includes the perched host (it can be shot off its perch)', combat.aliveShadows().includes(g1), combat.aliveShadows().map((s) => s.id));
  combat.resetToCheckpoint(0);
  const g1After = combat.shadows.find((s) => s.id === 'g1');
  check('resetToCheckpoint (wake()) does not release a held host', g1After.held === true && g1After.dormant === true && g1After.perched, `${g1After.held} ${g1After.dormant}`);
}

// 21b. activateGroup returns the held count and releases wave-0 members in
// delay order (an explicit delay:0 and an explicit delay:1.5).
{
  const districtB = {
    ...sunseedFields(),
    strongholds: [fort],
    shadows: [
      { id: 'd0', kind: 'shadeHound', x: fort.x, z: fort.z, group: 'fort', delay: 0 },
      { id: 'd1', kind: 'shadeHound', x: fort.x + 20, z: fort.z, group: 'fort', delay: 1.5 },
    ],
  };
  const combat = new Combat(world, districtB);
  const d0 = combat.shadows.find((s) => s.id === 'd0');
  const d1 = combat.shadows.find((s) => s.id === 'd1');
  const released = combat.activateGroup('fort');
  check('activateGroup returns the held count', released === 2, released);
  const h = farHopper();
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

// 21c. Staring: a perched host turns to face Hopper from 700 m and its
// stare brightens with the last 500 m; beyond that it looks at nothing.
{
  const districtC = { ...sunseedFields(), strongholds: [fort], shadows: [{ id: 'st1', kind: 'shadeHound', x: fort.x, z: fort.z, group: 'fort' }] };
  const combat = new Combat(world, districtC);
  const st1 = combat.shadows.find((s) => s.id === 'st1');
  const cb = makeCallbacks();
  const at = (dx, dz) => {
    const h = createHopperState(st1.x + dx, world.heightAt(st1.x + dx, st1.z + dz), st1.z + dz, Math.PI);
    h.groundY = h.y;
    return h;
  };
  const far = at(0, 900);
  for (let i = 0; i < 12; i++) combat.update(dt, far, cb, aimFrom(far));
  check('a perched host 900 m off has no stare', st1.stare === 0, st1.stare);
  const near = at(200, 200);
  for (let i = 0; i < 12; i++) combat.update(dt, near, cb, aimFrom(near));
  check('a perched host 280 m off stares (0 < stare < 1)', st1.stare > 0.3 && st1.stare < 0.6, st1.stare);
  const want = Math.atan2(200, 200);
  check('a perched host faces Hopper', Math.abs(Math.atan2(Math.sin(st1.yaw - want), Math.cos(st1.yaw - want))) < 0.01, `${st1.yaw} vs ${want}`);
  check('staring is harmless and keeps the host dormant', st1.dormant && cb.record.hurt === 0, `${st1.dormant} ${cb.record.hurt}`);
}

// 21d. A ground host, released: waits crouched on its perch while Hopper is
// far, pounces once Hopper is close, and a pounce contact calls hurt.
{
  const districtD = { ...sunseedFields(), strongholds: [fort], shadows: [{ id: 'lp1', kind: 'shadeHound', x: fort.x, z: fort.z, group: 'fort', entry: 'perch' }] };
  const combat = new Combat(world, districtD);
  const lp1 = combat.shadows.find((s) => s.id === 'lp1');
  combat.activateGroup('fort');
  const cb = makeCallbacks();
  const hFar = farHopper();
  for (let i = 0; i < 60; i++) combat.update(dt, hFar, cb, aimFrom(hFar));
  check('released ground host stays waiting on its perch while Hopper is far', lp1.state === 'wait' && !lp1.dormant, `${lp1.state} ${lp1.dormant}`);
  check('waiting host is harmless', cb.record.hurt === 0, cb.record.hurt);
  const hNear = createHopperState(lp1.x, lp1.y, lp1.z - 5, Math.PI);
  hNear.groundY = hNear.y;
  let pounced = false;
  for (let i = 0; i < 360 && cb.record.hurt === 0; i++) {
    combat.update(dt, hNear, cb, aimFrom(hNear));
    if (lp1.state === 'pounce') pounced = true;
  }
  check('ground host pounces once Hopper is close', pounced, pounced);
  check('a pounce contact calls hurt', cb.record.hurt > 0, cb.record.hurt);
}

// 21d2. Left alone, a released ground host pounces anyway within 4.5 s and
// comes down off its perch to the ground.
{
  const districtD2 = { ...sunseedFields(), strongholds: [fort], shadows: [{ id: 'lp2', kind: 'shadeHound', x: fort.x, z: fort.z, group: 'fort' }] };
  const combat = new Combat(world, districtD2);
  const lp2 = combat.shadows.find((s) => s.id === 'lp2');
  const perchY = lp2.y;
  combat.activateGroup('fort');
  const cb = makeCallbacks();
  const h = createHopperState(fort.x + 150, world.heightAt(fort.x + 150, fort.z), fort.z, Math.PI);
  h.groundY = h.y;
  let pouncedAt = null;
  for (let i = 0; i < 120 * 9; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    if (pouncedAt === null && lp2.state === 'pounce') pouncedAt = i / 120;
  }
  check('a released ground host pounces on its own within 4.5 s', pouncedAt !== null && pouncedAt < 4.5, pouncedAt);
  check('after the pounce the host is down off its perch, near the ground and in its ordinary states', lp2.y - world.heightAt(lp2.x, lp2.z) < 15 && lp2.y < perchY - 5 && lp2.state !== 'pounce' && lp2.state !== 'wait', `${lp2.state} y ${lp2.y.toFixed(1)} perch ${perchY.toFixed(1)} terrain ${world.heightAt(lp2.x, lp2.z).toFixed(1)}`);
}

// 21e. A flyer host perches on the top too, and on release launches for
// its station in the air, arriving within a few seconds.
{
  // Spawn near fortAt's own top rather than offset (30, 30, 60) from it: a
  // delivered structure's real (baked) footprint is not guaranteed to still
  // reach that far from its own accepted perch point the way the old
  // parametric stand-in boxes did, and perchNear (which combat3d.ts calls
  // for every held, non-rooted host) only searches near where it is asked.
  const districtE = { ...sunseedFields(), strongholds: [fort], shadows: [{ id: 'fl1', kind: 'windowRay', x: fortAt.x, z: fortAt.z, y: fortAt.top.y + 20, mode: 'a', group: 'fort' }] };
  const combat = new Combat(world, districtE);
  const fl1 = combat.shadows.find((s) => s.id === 'fl1');
  check('flyer host waits perched on a structure top', fl1.perched && Math.abs(world.groundAt(fl1.x, fl1.z, fl1.y + 0.5).y - fl1.y) < 0.05, `${fl1.perched} ${fl1.y}`);
  combat.activateGroup('fort');
  const cb = makeCallbacks();
  const h = farHopper();
  combat.update(dt, h, cb, aimFrom(h));
  check('flyer host launches (arrive state, arrive < 1)', fl1.state === 'arrive' && fl1.arrive < 1, `${fl1.state} ${fl1.arrive}`);
  let arrivedAt = null,
    arrivedOff = null;
  for (let i = 0; i < 120 * 6; i++) {
    combat.update(dt, h, cb, aimFrom(h));
    if (arrivedAt === null && fl1.arrive >= 1) {
      arrivedAt = i / 120;
      arrivedOff = Math.hypot(fl1.x - fl1.homeX, fl1.y - fl1.homeY, fl1.z - fl1.homeZ);
    }
  }
  check('flyer host reaches its station within 5 s', arrivedAt !== null && arrivedAt < 5, arrivedAt);
  check('flyer host arrives at its station and is awake from there', arrivedOff !== null && arrivedOff < 1 && fl1.state !== 'arrive' && !fl1.dormant, `${arrivedOff} ${fl1.state}`);
}

// 21e2. Hitting a perched host before its stronghold wakes releases it at
// once; a rooted host waits at its own spawn and simply wakes.
{
  const districtE2 = {
    ...sunseedFields(),
    strongholds: [fort],
    shadows: [
      { id: 'hit1', kind: 'shadeHound', x: fort.x, z: fort.z, group: 'fort' },
      { id: 'sp1', kind: 'seedSpitter', x: fort.x + 40, z: fort.z, group: 'fort' },
    ],
  };
  const combat = new Combat(world, districtE2);
  const hit1 = combat.shadows.find((s) => s.id === 'hit1');
  const sp1 = combat.shadows.find((s) => s.id === 'sp1');
  check('a rooted host is perched where it was placed', sp1.perched && sp1.x === fort.x + 40 && sp1.z === fort.z && sp1.state === 'idle', `${sp1.perched} ${sp1.x} ${sp1.state}`);
  const cb = makeCallbacks();
  combat.damage(hit1, 1, cb);
  check('a hit releases a perched host at once', !hit1.dormant && !hit1.held && !hit1.perched && hit1.state === 'wait', `${hit1.dormant} ${hit1.held} ${hit1.state}`);
  check('the rest of the host stays perched', sp1.dormant && sp1.held, `${sp1.dormant} ${sp1.held}`);
  combat.activateGroup('fort');
  const h = farHopper();
  for (let i = 0; i < 120; i++) combat.update(dt, h, cb, aimFrom(h));
  check('a rooted host wakes in place', !sp1.dormant && sp1.state === 'idle' && sp1.x === fort.x + 40, `${sp1.dormant} ${sp1.state}`);
}

// 21f. 'ambush': perched and visible, stays dormant while Hopper is in
// front of it, releases once Hopper's z is 20m past it (forward is -z).
{
  const districtF = { ...sunseedFields(), strongholds: [fort], shadows: [{ id: 'am1', kind: 'shadeHound', x: fort.x, z: fort.z, group: 'fort', entry: 'ambush' }] };
  const combat = new Combat(world, districtF);
  const am1 = combat.shadows.find((s) => s.id === 'am1');
  check('ambush shadow waits perched in view', am1.perched && am1.state === 'wait', `${am1.perched} ${am1.state}`);
  const released = combat.activateGroup('fort');
  check('ambush shadow is released from held by activateGroup', released === 1 && am1.held === false, `${released} ${am1.held}`);
  check('ambush shadow stays dormant immediately after activation', am1.dormant === true, am1.dormant);
  const cb = makeCallbacks();
  const hInFront = createHopperState(am1.homeX, world.heightAt(am1.homeX, am1.homeZ + 50), am1.homeZ + 50, Math.PI);
  hInFront.groundY = hInFront.y;
  for (let i = 0; i < 120; i++) combat.update(dt, hInFront, cb, aimFrom(hInFront));
  check('ambush shadow stays dormant while Hopper is in front of it', am1.dormant === true, am1.dormant);
  const hPast = createHopperState(am1.homeX, world.heightAt(am1.homeX, am1.homeZ - 20), am1.homeZ - 20, Math.PI);
  hPast.groundY = hPast.y;
  for (let i = 0; i < 30 && am1.dormant; i++) combat.update(dt, hPast, cb, aimFrom(hPast));
  check('ambush shadow releases once Hopper is 20m past it', am1.dormant === false, am1.dormant);
}

// 21g. activateGroup on a group that names no stronghold returns 0 and
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

// ---------------------------------------------------------------------
// 22. The three gaits, the feet that carry them, and the climb
// ---------------------------------------------------------------------
{
  const bodyOf = (h, over = {}) => ({
    x: h.x, y: h.y, z: h.z, yaw: h.yaw, vx: h.vx, vy: h.vy, vz: h.vz,
    grounded: h.grounded, climbing: !!h.climbing, climbNx: h.climbNx || 0, climbNz: h.climbNz || 0,
    airTime: h.airTime || 0, height: h.height || 0, diving: !!h.diving, gliding: !!h.gliding, hovering: !!h.hovering,
    ...over,
  });
  // (a) Two-bone IK: it reaches what it can reach, stops short of what it
  // cannot, and puts the knee on the side the pole asks for.
  {
    const hip = [0, 20, 0];
    const knee = solveTwoBone(hip, [0, 8, 6], 8, 8, [0, 1, 0]);
    const d1 = Math.hypot(knee[0] - hip[0], knee[1] - hip[1], knee[2] - hip[2]);
    const d2 = Math.hypot(knee[0] - 0, knee[1] - 8, knee[2] - 6);
    check('the leg keeps its bone lengths', Math.abs(d1 - 8) < 0.01 && Math.abs(d2 - 8) < 0.01, `${d1} ${d2}`);
    check('the knee goes to the pole side', knee[1] > (20 + 8) / 2 - 4.01, knee[1]);
    const far = solveTwoBone(hip, [0, -40, 0], 8, 8, [0, 0, 1]);
    const reach = Math.hypot(far[0] - hip[0], far[1] - hip[1], far[2] - hip[2]);
    check('an unreachable target straightens the leg instead of tearing it', Math.abs(reach - 8) < 0.01, reach);
  }
  // (b) Which gait runs. Flat and fast is a gallop, slow is the walk, a wall
  // is the climb, and the gallop has a moment with nothing on the ground.
  {
    const h = startHopper(0, 40);
    const g = new Gait();
    h.vz = -66;
    let suspended = 0,
      frames = 0,
      minPlanted = 6;
    for (let i = 0; i < 240; i++) {
      h.z -= 66 * dt;
      h.y = world.heightAt(h.x, h.z);
      const pose = g.update(bodyOf(h), world, dt);
      if (i > 60) {
        frames++;
        const on = pose.planted.filter(Boolean).length;
        minPlanted = Math.min(minPlanted, on);
        if (on === 0) suspended++;
      }
    }
    check('running flat out gallops', g.blend.gallop > 0.85, JSON.stringify(g.blend));
    check('the gallop has a moment of suspension in every stride', suspended > frames * 0.05, `${suspended}/${frames}`);
    check('and it is a moment, not the whole stride', suspended < frames * 0.5, `${suspended}/${frames}`);
  }
  {
    const h = startHopper(0, 40);
    const g = new Gait();
    let minPlanted = 6;
    for (let i = 0; i < 240; i++) {
      h.z -= 12 * dt;
      h.y = world.heightAt(h.x, h.z);
      const pose = g.update(bodyOf(h, { vz: -12 }), world, dt);
      if (i > 60) minPlanted = Math.min(minPlanted, pose.planted.filter(Boolean).length);
    }
    check('walking pace walks', g.blend.walk > 0.85 && g.blend.gallop < 0.15, JSON.stringify(g.blend));
    check('the walk always keeps a tripod on the ground', minPlanted >= 3, minPlanted);
  }
  // (b2) The walk carries the body level: an insect's legs do the work, and a
  // body that bobbed and rolled with the stride read as a waddle. The gallop
  // still bounds, which is what tells the two apart from outside.
  {
    const flat = { heightAt: () => 0, groundAt: () => ({ y: 0 }) };
    const sway = (speed) => {
      const g = new Gait();
      const h = startHopper(0, 40);
      h.y = 0;
      let lo = Infinity, hi = -Infinity, roll = 0;
      for (let i = 0; i < 300; i++) {
        h.z -= speed * dt;
        const pose = g.update(bodyOf(h, { y: 0, vz: -speed }), flat, dt);
        if (i > 120) {
          lo = Math.min(lo, pose.lift);
          hi = Math.max(hi, pose.lift);
          roll = Math.max(roll, Math.abs(pose.roll));
        }
      }
      return { swing: hi - lo, roll, blend: g.blend };
    };
    const walking = sway(12),
      galloping = sway(66);
    check('the walk holds the body level', walking.swing < 0.02, `${walking.swing.toFixed(4)} m over a stride`);
    check('and does not roll it side to side', walking.roll < 0.002, walking.roll.toFixed(4));
    check('while the gallop still bounds', galloping.swing > 1, `${galloping.swing.toFixed(2)} m`);
  }
  // (c) Feet are put on the world and stay there: no sliding under him, and
  // every planted foot is on the surface it landed on, whatever that is.
  {
    const h = startHopper(0, 40);
    const g = new Gait();
    let worstSlide = 0,
      worstOff = 0;
    let prev = null;
    for (let i = 0; i < 600; i++) {
      h.z -= 52 * dt;
      h.y = world.heightAt(h.x, h.z);
      const pose = g.update(bodyOf(h, { vz: -52 }), world, dt);
      if (prev)
        for (let l = 0; l < LEGS.length; l++) {
          if (pose.planted[l] && prev.planted[l]) {
            const moved = Math.hypot(pose.feet[l][0] - prev.feet[l][0], pose.feet[l][2] - prev.feet[l][2]);
            if (moved < 6) worstSlide = Math.max(worstSlide, moved);
          }
          // Asked of the foot's own level: whatever it is standing on, a
          // step or the field, it is standing on it and not above it.
          if (pose.planted[l]) worstOff = Math.max(worstOff, Math.abs(pose.feet[l][1] - world.groundAt(pose.feet[l][0], pose.feet[l][2], pose.feet[l][1] + 0.5, 0.6).y));
        }
      prev = { planted: [...pose.planted], feet: pose.feet.map((f) => [...f]) };
    }
    check('a planted foot does not slide under him', worstSlide < 0.02, worstSlide);
    // The walk crosses a delivered structure (Sunseed Fields' terraceStep at
    // (0,-200)); its baked collision is voxel boxes rounded to a 0.25 m grid,
    // so two adjacent tops can differ by up to ~0.5 m at the seam between
    // them -- a hair more slack than the smooth stand-in boxes needed.
    check('and every planted foot is on the surface below it', worstOff < 0.55, worstOff);
  }
  // (d) The body reads its angle off the ground: uphill lifts his nose.
  {
    // The steepest stretch of the ridge that leads up to the plateau.
    let at = -700,
      steepest = 0;
    for (let z = -520; z > -900; z -= 4) {
      const rise = world.heightAt(-220, z - 9) - world.heightAt(-220, z + 9);
      if (rise > steepest) {
        steepest = rise;
        at = z;
      }
    }
    check('the ridge has a real slope on it', steepest > 4, `${steepest.toFixed(1)} m over 18 at z ${at}`);
    const up = startHopper(-220, at + 30);
    const g = new Gait();
    let pose = null;
    for (let i = 0; i < 120; i++) {
      up.z -= 30 * dt;
      up.y = world.heightAt(up.x, up.z);
      pose = g.update(bodyOf(up, { vz: -30 }), world, dt);
    }
    check('and the body takes the angle of it, nose up the hill', pose.slope > 0.1 && pose.pitch < -0.05, `pitch ${pose.pitch.toFixed(3)} slope ${pose.slope.toFixed(3)}`);
  }
  // (e) In the air the hind legs stay where the push left them: back and down.
  {
    const h = startHopper(0, 40);
    const rear = LEGS.find((l) => l.rear);
    const front = LEGS.find((l) => !l.rear);
    const flying = bodyOf(h, { grounded: false, airTime: 0.4, height: 40, vy: 20 });
    const rp = airFoot(rear, flying),
      fp = airFoot(front, flying);
    check('the hind legs trail back behind him', rp[2] < rear.home[2] - 10, rp[2]);
    check('and below him, not tucked up', rp[1] < rear.home[1] - 5, rp[1]);
    check('the front legs tuck up under the chin', fp[1] > front.home[1] + 2, fp[1]);
    const landing = airFoot(rear, bodyOf(h, { grounded: false, airTime: 1.4, height: 8, vy: -60 }));
    check('coming down they reach for the ground again', landing[1] > rp[1] + 1 && landing[2] > rp[2] + 4, JSON.stringify(landing));
  }
  // (f) A wall: he takes hold of it, climbs it, and the gait is the climb.
  {
    // A tall face with open ground at the foot of it: the wall he will climb.
    let box = null,
      stand = null;
    for (const c of world.colliders) {
      // 2.5 m matches perchNear's own floor for "a reasonably-sized top" --
      // a delivered model's baked wall is voxelised at a coarser cell than
      // its footprint (a thin shell reads as clutter, not a wall), so it is
      // chunky rather than the wide flat face a stand-in's own box gave.
      if (c.spring || c.instance?.moving || c.hx < 2.5 || c.hz < 2.5) continue;
      const cos = Math.cos(c.yaw),
        sin = Math.sin(c.yaw);
      // The face he walks up to has to be wide enough to hold him: the ones
      // reached across Z are `hx` wide, the ones across X are `hz`.
      for (const [ox, oz, face] of [
        [0, c.hz + 9, c.hx],
        [0, -c.hz - 9, c.hx],
        [c.hx + 9, 0, c.hz],
        [-c.hx - 9, 0, c.hz],
      ]) {
        if (face < MOVE.climbWide) continue;
        const x = c.cx + ox * cos - oz * sin,
          z = c.cz + ox * sin + oz * cos;
        const g0 = world.groundAt(x, z, c.y1, 2.5);
        // The face has to run from the ground he is standing on up past his
        // head; a piece of a silo hanging in the air is not a wall.
        if (g0.collider || c.y1 < g0.y + 22 || c.y0 > g0.y + 2) continue;
        box = c;
        stand = [x, z, g0.y];
        break;
      }
      if (box) break;
    }
    check('there is a tall face with ground at the foot of it', !!box, box ? `${box.cx.toFixed(0)},${box.cz.toFixed(0)} top ${box.y1.toFixed(0)}` : 'none');
    const toWall = Math.hypot(box.cx - stand[0], box.cz - stand[1]);
    const into = { ...blank, dx: (box.cx - stand[0]) / toWall, dz: (box.cz - stand[1]) / toWall };
    // Running at it on his feet is not a climb any more: a wall met at a run
    // stops him, so a climb never takes him out of a stride he wanted.
    {
      const r = startHopper(stand[0], stand[1], stand[2]);
      r.yaw = Math.atan2(into.dx, into.dz);
      let took = false;
      for (let i = 0; i < 240 && !took; i++) {
        const ev = stepHopper(r, world, into, dt);
        took = ev.some((e) => e.kind === 'climbStart') || r.climbing;
      }
      check('running into a wall does not take hold of it', !took, `${r.move} at ${r.y.toFixed(1)}`);
    }
    // Jumping into it does: off the ground, stick into the face.
    const h = startHopper(stand[0], stand[1], stand[2]);
    h.yaw = Math.atan2(into.dx, into.dz);
    let started = false;
    for (let i = 0; i < 240 && !started; i++) {
      const ev = stepHopper(h, world, { ...into, jumpPressed: i === 0, jumpHeld: i * dt < MOVE.tapWindow * 0.5 }, dt);
      started = ev.some((e) => e.kind === 'climbStart') || h.climbing;
    }
    check('jumping into a wall takes hold of it', h.climbing, `${h.x.toFixed(1)},${h.y.toFixed(1)},${h.z.toFixed(1)} move ${h.move}`);
    const y0 = h.y;
    const g = new Gait();
    let onWall = 0,
      wallFrames = 0,
      climbBlend = 0;
    // Half a second of climbing: up the face, short of the lip he would mantle.
    for (let i = 0; i < 60; i++) {
      stepHopper(h, world, into, dt);
      if (!h.climbing) break;
      const pose = g.update(bodyOf(h), world, dt);
      climbBlend = Math.max(climbBlend, pose.blend.climb);
      wallFrames++;
      // Every foot sits against the face, not out in the air behind him.
      const off = pose.feet.map((f) => (f[0] - h.x) * h.climbNx + (f[2] - h.z) * h.climbNz);
      if (off.every((d) => d > -3 && d < 14)) onWall++;
    }
    check('climbing carries him up the face', h.y > y0 + 8, `${y0.toFixed(1)} -> ${h.y.toFixed(1)}`);
    check('the climb gait runs while he is on it', climbBlend > 0.9, climbBlend);
    check('and his feet stay on the face', onWall === wallFrames, `${onWall}/${wallFrames}`);
    // A press of A kicks him off it.
    const climbed = h.y;
    stepHopper(h, world, { ...into, jumpPressed: true, jumpHeld: true }, dt);
    check('A kicks off the wall', !h.climbing && h.vy > 20, `${h.climbing} vy ${h.vy.toFixed(1)}`);
    void climbed;
  }
  // (g) The camera watching a climb: it stands off the wall and never cranes
  // up after him, however far up he goes.
  {
    const h = startHopper(0, 40);
    const cam = createCamera(h.yaw, [h.x, h.y + 8, h.z]);
    const settings = { sensitivity: 0.5, invertY: false, reducedMotion: false };
    const blankCam = { lookX: 0, lookY: 0, mouseLookX: 0, mouseLookY: 0, resetPressed: false, horizonHeld: false };
    const forward = cam.forward;
    const climb = [0, 1];
    let worstPitch = -9;
    for (let i = 0; i < 480; i++) {
      h.y += 27 * dt;
      updateCamera(cam, h, world, { ...blankCam, forward, climb }, settings, dt);
      if (i > 120) worstPitch = Math.max(worstPitch, cam.pitch);
    }
    const want = Math.atan2(-climb[0], -climb[1]);
    check('the view swings round to stand off the wall', Math.abs(Math.atan2(Math.sin(cam.yaw - want), Math.cos(cam.yaw - want))) < 0.1, cam.yaw - want);
    check('and holds its pitch down: no craning up the face', worstPitch <= 0.35 && cam.pitch >= 0.07, `${cam.pitch} worst ${worstPitch}`);
    check('the eye stays above his back', cam.eye[1] > cam.target[1], `${cam.eye[1]} vs ${cam.target[1]}`);
  }
}

console.log(`engine3d: ${checks} checks passed across 22 scenarios (world, controller, camera, gait, combat3d, district, route, scenery, boss3d)`);
