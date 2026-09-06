import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url),
  ts = require('typescript');
const temp = fs.mkdtempSync('/tmp/hopper-camera-');
const source = new URL('../../src/game/', import.meta.url).pathname;
for (const name of [
  'engine',
  'levels',
  'combat',
  'hopper-animation',
  'input',
]) {
  const raw = fs
    .readFileSync(source + name + '.ts', 'utf8')
    .replace(
      /from '\.\/(levels|combat|hopper-animation|renderer)'/g,
      "from './$1.mjs'",
    );
  fs.writeFileSync(
    temp + '/' + name + '.mjs',
    ts.transpileModule(raw, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    }).outputText,
  );
}
fs.writeFileSync(
  temp + '/renderer.mjs',
  'export class Renderer {constructor(){this.viewport={width:1600,height:900}}draw(){}dispose(){}}',
);
globalThis.window = { addEventListener() {}, removeEventListener() {} };
globalThis.location = { hostname: 'audit' };
globalThis.localStorage = {
  getItem: () => null,
  setItem() {},
  removeItem() {},
};
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.HTMLElement = class {};
const { Engine } = await import(temp + '/engine.mjs'),
  { buildLevel } = await import(temp + '/levels.mjs'),
  { CombatWorld } = await import(temp + '/combat.mjs'),
  { InputManager } = await import(temp + '/input.mjs'),
  { getHopperPose } = await import(temp + '/hopper-animation.mjs');
const blank = {
  moveX: 0,
  moveY: 0,
  jumpHeld: false,
  jumpPressed: false,
  kickPressed: false,
  shootHeld: false,
  blockHeld: false,
  lookX: 0,
  lookY: 0,
  pausePressed: false,
  instructionsPressed: false,
  confirmPressed: false,
  backPressed: false,
  anyPressed: false,
  menuX: 0,
  menuY: 0,
  connected: false,
  active: 'keyboard',
  disconnected: false,
};
function make(gravity = 1) {
  const e = new Engine({}, { effect() {} }, () => {});
  const l = buildLevel(0);
  l.areas[0].gravity = gravity;
  l.platforms = [
    {
      id: 'flat',
      x: 0,
      y: 800,
      w: 25000,
      h: 200,
      skin: 0,
      kind: 'solid',
      routeRole: 'main',
      area: 0,
    },
  ];
  l.enemies = [];
  l.hazards = [];
  l.collectibles = [];
  l.gravityGates = [];
  l.checkpoints = [{ x: 5000, y: 800, area: 0 }];
  e.level = l;
  e.combat = new CombatWorld(l);
  e.combat.boss.alive = false;
  e.platforms = l.platforms;
  e.checkpoint = { x: 5000, y: 800, area: 0 };
  e.resetPlayer();
  e.player.invuln = 0;
  e.camera.x = 5330;
  e.camera.y = 530;
  e.groundAnchorY = 800;
  e.paused = false;
  return e;
}
function step(e, f = {}) {
  e.step(1 / 120, { ...blank, ...f });
}
const report = {};
for (const [name, g, hold] of [
  ['tap', 1, 0.09],
  ['fullNormal', 1, 2],
  ['fullBlue', 0.55, 3],
]) {
  const e = make(g);
  let minY = Infinity,
    maxY = -Infinity,
    minHead = Infinity,
    minArtTop = Infinity,
    maxRise = 0,
    landed = false;
  for (let n = 0; n < 800; n++) {
    step(e, { jumpPressed: n === 0, jumpHeld: n / 120 < hold });
    minY = Math.min(minY, e.camera.y);
    maxY = Math.max(maxY, e.camera.y);
    const screenTop = e.camera.y - e.renderer.viewport.height / 2;
    minHead = Math.min(minHead, e.player.y - 180 - screenTop);
    minArtTop = Math.min(minArtTop, e.player.y - 220.3125 - screenTop);
    maxRise = Math.max(maxRise, 800 - e.player.y);
    if (n > 10 && e.player.grounded) {
      landed = true;
      break;
    }
  }
  report[name] = {
    cameraYSpan: maxY - minY,
    minLogicalHeadMargin: minHead,
    minFullAtlasMargin: minArtTop,
    maxRise,
    landed,
  };
}
let e = make();
const leads = [];
let directionFlips = 0,
  last = e.leadDirection;
for (let n = 0; n < 720; n++) {
  step(e, { moveX: Math.floor(n / 12) % 2 ? -1 : 1 });
  leads.push(e.cameraLead);
  if (e.leadDirection !== last) directionFlips++;
  last = e.leadDirection;
}
report.fastGroundReversals = {
  cameraLeadMin: Math.min(...leads),
  cameraLeadMax: Math.max(...leads),
  leadDirectionFlips: directionFlips,
};
e = make();
let earliestFlip = null;
for (let n = 0; n < 200; n++) {
  step(e, { moveX: -1 });
  if (e.leadDirection === -1 && earliestFlip === null) earliestFlip = n / 120;
}
report.sustainedReversal = {
  earliestFlipSeconds: earliestFlip,
  finalLead: e.cameraLead,
};
e = make();
e.player.vx = 650;
step(e, { moveX: 1, jumpPressed: true, jumpHeld: true });
let changedInAir = false,
  landed = false,
  brakeVelocity = 0;
for (let n = 0; n < 500; n++) {
  const beforeGround = e.player.grounded;
  step(e, { moveX: -1, jumpHeld: true });
  if (!e.player.grounded && e.player.facing !== 1) changedInAir = true;
  if (n === 45) brakeVelocity = e.player.vx;
  if (!beforeGround && e.player.grounded) {
    landed = true;
    break;
  }
}
const facingOnLanding = e.player.facing;
step(e, { moveX: -1 });
report.airBrake = {
  changedInAir,
  brakeVelocity,
  landed,
  facingOnLanding,
  facingNextGroundTick: e.player.facing,
};
// Parry: a spin kick meets a frontal blow with no damage and a flash; the same
// blow from behind, or outside the kick window, lands and knocks Hopper back.
e = make();
const hpStart = e.hp;
step(e, { kickPressed: true });
const parried = e.hurt(2, -300, -200);
const hitHp = e.hp,
  parryFlash = e.player.parryT;
e = make();
const rearParried = e.hurt(2, 300, -200);
const rearHp = e.hp;
e = make();
step(e, { kickPressed: true });
const hazardParried = e.hurt(1, -300, -200, false);
const hazardHp = e.hp;
e = make();
for (let n = 0; n < 60; n++) step(e);
const lateParried = e.hurt(2, -300, -200);
report.parry = {
  hpStart,
  parried,
  hitHp,
  parryFlash,
  rearParried,
  rearHp,
  hazardParried,
  hazardHp,
  lateParried,
};
// Knockback: after a hit, steering is ignored for the stun window and Hopper
// travels backward a real distance before regaining control.
e = make();
const xBefore = e.player.x;
e.hurt(1, -360, -240);
const stunStart = e.player.hitstun;
let xAtStunEnd = null;
for (let n = 0; n < 120; n++) {
  step(e, { moveX: 1 });
  if (xAtStunEnd === null && e.player.hitstun <= 0) xAtStunEnd = e.player.x;
}
report.knockback = {
  stunStart,
  travel: xBefore - xAtStunEnd,
  recoveredForward: e.player.x > xAtStunEnd,
};
// Ledge catch: falling just short of a shelf while pressing toward it hauls
// Hopper onto the lip; falling away from it, or too far below, does not.
function ledge(dx, drop, moveX = 1, kind = 'solid') {
  const eng = make();
  eng.level.platforms = [
    {
      id: 'ledge',
      x: 6000,
      y: 800,
      w: 900,
      h: 200,
      skin: 0,
      kind,
      routeRole: kind === 'solid' ? 'main' : 'optional',
      area: 0,
    },
  ];
  eng.platforms = eng.level.platforms;
  eng.deathY = 5000;
  Object.assign(eng.player, {
    x: 6000 - dx,
    y: 800 + drop,
    vx: 0,
    vy: 400,
    grounded: false,
  });
  step(eng, { moveX });
  return { grounded: eng.player.grounded, stood: eng.stood, x: eng.player.x };
}
report.ledgeCatch = {
  reach: ledge(80, 40),
  edge: ledge(60, 5),
  tooFar: ledge(140, 40),
  tooLow: ledge(80, 140),
  pullingAway: ledge(80, 40, -1),
  thinShelfAtLip: ledge(80, 6, 1, 'oneWay'),
  thinShelfBelowLip: ledge(80, 40, 1, 'oneWay'),
};
// Shield: held B absorbs from every direction at an energy cost, breaks when
// drained, and recharges once released. It sits beside the parry, not instead.
e = make();
step(e, { blockHeld: true });
const shieldStart = e.shield,
  shieldHpStart = e.hp;
e.hurt(2, 300, -200);
const afterHit = e.shield,
  shieldHitHp = e.hp;
let breakAt = null;
for (let n = 0; n < 600; n++) {
  step(e, { blockHeld: true });
  if (n % 30 === 29) e.hurt(1, 300, -200);
  if (e.shieldBrokenT > 0) {
    breakAt = n / 120;
    break;
  }
}
const blockingWhenBroken = e.player.blocking,
  hpAtBreak = e.hp;
e.player.invuln = 0;
e.hurt(1, 300, -200);
const afterBreakHp = e.hp;
for (let n = 0; n < 800; n++) step(e, { blockHeld: false });
report.shield = {
  shieldStart,
  afterHit,
  shieldHpStart,
  shieldHitHp,
  breakAt,
  blockingWhenBroken,
  hpAtBreak,
  afterBreakHp,
  recharged: e.shield,
};
// Wall kick: a jump pressed just after meeting a solid face pushes off it.
function wall(pressAfterFrames) {
  const eng = make();
  eng.level.platforms = [
    {
      id: 'floor',
      x: 0,
      y: 800,
      w: 6000,
      h: 200,
      skin: 0,
      kind: 'solid',
      routeRole: 'main',
      area: 0,
    },
    {
      id: 'tower',
      x: 6000,
      y: 200,
      w: 900,
      h: 800,
      skin: 0,
      kind: 'solid',
      routeRole: 'main',
      area: 0,
    },
  ];
  eng.platforms = eng.level.platforms;
  eng.deathY = 5000;
  Object.assign(eng.player, {
    x: 5800,
    y: 800,
    vx: 650,
    vy: 0,
    grounded: true,
    facing: 1,
  });
  step(eng, { moveX: 1, jumpPressed: true, jumpHeld: true });
  let touched = null;
  for (let n = 0; n < 240; n++) {
    step(eng, { moveX: 1, jumpHeld: n < 30 });
    if (touched === null && eng.player.wallT > 0) touched = n;
    if (touched !== null && pressAfterFrames === 0) {
      step(eng, { moveX: 1, jumpPressed: true, jumpHeld: true });
      return {
        touched,
        vy: eng.player.vy,
        vx: eng.player.vx,
        facing: eng.player.facing,
        kicking: eng.player.wallKickT > 0,
      };
    }
    if (touched !== null && n === touched + pressAfterFrames) {
      // Leaving the face for longer than the grace window loses the kick.
      for (let k = 0; k < pressAfterFrames; k++) step(eng, { moveX: -1 });
      step(eng, { moveX: 1, jumpPressed: true, jumpHeld: true });
      return {
        touched,
        vy: eng.player.vy,
        vx: eng.player.vx,
        facing: eng.player.facing,
        kicking: eng.player.wallKickT > 0,
      };
    }
  }
  return { touched, vy: 0, vx: 0, facing: 1, kicking: false };
}
report.wallKick = { prompt: wall(0), late: wall(24) };
// Right-stick look: the rendered camera drifts toward the stick and widens,
// then damps back to the tracking camera once the stick is released.
e = make();
const looks = [];
for (let n = 0; n < 120; n++) {
  step(e, { lookX: 1, lookY: -1 });
  if (n === 119) looks.push({ ...e.look });
}
for (let n = 0; n < 240; n++) {
  step(e);
  if (n === 239) looks.push({ ...e.look });
}
report.look = { held: looks[0], released: looks[1] };
// Spring pad: standing on one launches past a full jump; a counter belt drags
// Hopper backward while standing; a wind lane leans on an airborne jump.
function terrain(extra, hazards = []) {
  const eng = make();
  eng.level.platforms = [
    {
      id: 'floor',
      x: 0,
      y: 800,
      w: 25000,
      h: 200,
      skin: 0,
      kind: 'solid',
      routeRole: 'main',
      area: 0,
    },
    ...extra,
  ];
  eng.level.hazards = hazards;
  eng.platforms = eng.level.platforms;
  eng.deathY = 5000;
  return eng;
}
e = terrain([
  {
    id: 'pad',
    x: 5100,
    y: 800,
    w: 160,
    h: 40,
    skin: 0,
    kind: 'spring',
    routeRole: 'optional',
    area: 0,
  },
]);
Object.assign(e.player, { x: 5000, y: 800, vx: 0 });
let springApex = 0,
  launched = false;
for (let n = 0; n < 240; n++) {
  step(e, { moveX: n < 40 ? 1 : 0 });
  if (!e.player.grounded) launched = true;
  springApex = Math.max(springApex, 800 - e.player.y);
}
report.spring = { launched, apex: springApex };
e = terrain([
  {
    id: 'belt',
    x: 5000,
    y: 800,
    w: 2000,
    h: 130,
    skin: 0,
    kind: 'conveyor',
    drift: -70,
    routeRole: 'main',
    area: 0,
  },
]);
Object.assign(e.player, { x: 6000, y: 800, vx: 0 });
step(e);
const beltStart = e.player.x;
for (let n = 0; n < 120; n++) step(e);
report.belt = { drift: e.player.x - beltStart };
e = terrain(
  [],
  [
    {
      id: 'gust',
      type: 'wind',
      x: 4000,
      y: 0,
      w: 3000,
      h: 800,
      push: { x: -150, y: 400 },
    },
  ],
);
Object.assign(e.player, { x: 5000, y: 800, vx: 650 });
step(e, { moveX: 1, jumpPressed: true, jumpHeld: true });
let windApex = 0;
for (let n = 0; n < 200 && !e.player.grounded; n++) {
  step(e, { moveX: 1, jumpHeld: n < 40 });
  windApex = Math.max(windApex, 800 - e.player.y);
}
const windLanding = e.player.x;
e = terrain([]);
Object.assign(e.player, { x: 5000, y: 800, vx: 650 });
step(e, { moveX: 1, jumpPressed: true, jumpHeld: true });
let calmApex = 0;
for (let n = 0; n < 200 && !e.player.grounded; n++) {
  step(e, { moveX: 1, jumpHeld: n < 40 });
  calmApex = Math.max(calmApex, 800 - e.player.y);
}
report.wind = { windApex, calmApex, windLanding, calmLanding: e.player.x };
// Boss lockdown: entering the arena seals both walls over ~0.6 s and they
// become solid; the boss's death lifts them again.
e = new Engine({}, { effect() {} }, () => {});
{
  const l = buildLevel(0);
  e.level = l;
  e.combat = new CombatWorld(l);
  e.platforms = l.platforms.filter((p) => !p.lock);
  e.checkpoint = { x: l.boss.arena.x + 160, y: l.boss.arena.y, area: 2 };
  e.resetPlayer();
  e.player.invuln = 100;
  e.paused = false;
  e.player.x = l.boss.arena.x + 200;
  const lockBefore = e.lockT;
  for (let n = 0; n < 120; n++) step(e);
  const sealed = e.lockT,
    wallsSolid = e.platforms.filter((p) => p.lock).length;
  // Walking back into the left wall is stopped by it.
  e.player.x = l.boss.arena.x + 140;
  for (let n = 0; n < 90; n++) step(e, { moveX: -1 });
  const heldIn = e.player.x >= l.boss.arena.x - 1;
  e.combat.boss.hp = 0;
  e.combat.boss.alive = false;
  for (let n = 0; n < 150; n++) step(e);
  report.lockdown = {
    lockBefore,
    sealed,
    wallsSolid,
    heldIn,
    released: e.lockT,
    wallsAfter: e.platforms.filter((p) => p.lock).length,
    arenaShelves: l.platforms.filter(
      (p) => p.routeRole === 'arena' && !p.lock && p.id !== 'm0-arena-floor',
    ).length,
  };
}
const pad = {
  index: 0,
  connected: true,
  axes: [0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
};
Object.defineProperty(globalThis, 'navigator', {
  value: { getGamepads: () => [pad] },
  configurable: true,
});
const inputs = new InputManager();
inputs.update(1 / 60);
pad.buttons[1] = { pressed: true, value: 1 };
const bFrame = inputs.update(1 / 60);
report.controllerB = {
  blockHeld: bFrame.blockHeld,
  backPressed: bFrame.backPressed,
  pausePressed: bFrame.pausePressed,
};
inputs.dispose();
report.landingPose = {
  far: getHopperPose(
    {
      facing: 1,
      vx: 0,
      vy: 300,
      grounded: false,
      gravitySign: 1,
      landingDistance: 120,
    },
    1,
  ).name,
  near: getHopperPose(
    {
      facing: 1,
      vx: 0,
      vy: 300,
      grounded: false,
      gravitySign: 1,
      landingDistance: 60,
    },
    1,
  ).name,
};
const checks = {
  flatTapStable: report.tap.cameraYSpan === 0,
  flatFullJumpStable: report.fullNormal.cameraYSpan === 0,
  blueHeadVisible: report.fullBlue.minFullAtlasMargin > 0,
  noRapidLeadFlip: directionFlips === 0,
  airFacingStable: !report.airBrake.changedInAir,
  facingTurnsAfterLanding: report.airBrake.facingNextGroundTick === -1,
  parryStopsFrontalBlow:
    parried === true && hitHp === hpStart && parryFlash > 0,
  rearBlowLands: rearParried === false && rearHp < hpStart,
  hazardsCannotBeParried: hazardParried === false && hazardHp < hpStart,
  parryWindowCloses: lateParried === false,
  knockbackCarries:
    stunStart > 0 &&
    report.knockback.travel > 60 &&
    report.knockback.recoveredForward,
  ledgeCatchOnReach:
    report.ledgeCatch.reach.grounded &&
    report.ledgeCatch.reach.stood === 'ledge',
  ledgeCatchAtEdge: report.ledgeCatch.edge.grounded,
  ledgeCatchLimits:
    !report.ledgeCatch.tooFar.grounded &&
    !report.ledgeCatch.tooLow.grounded &&
    !report.ledgeCatch.pullingAway.grounded,
  thinShelfOnlyAtLip:
    report.ledgeCatch.thinShelfAtLip.grounded &&
    !report.ledgeCatch.thinShelfBelowLip.grounded,
  blockProtects: shieldHitHp === shieldHpStart && afterHit < shieldStart,
  shieldBreaks: breakAt !== null && !blockingWhenBroken,
  brokenAllowsDamage: afterBreakHp < hpAtBreak,
  shieldRecharges: e.shield === 1,
  BHoldsShield:
    report.controllerB.blockHeld &&
    report.controllerB.backPressed &&
    !report.controllerB.pausePressed,
  wallKickPromptLaunches:
    report.wallKick.prompt.kicking &&
    report.wallKick.prompt.vy < -800 &&
    report.wallKick.prompt.vx < -400 &&
    report.wallKick.prompt.facing === -1,
  wallKickWindowCloses: !report.wallKick.late.kicking,
  lookPushesAndWidens:
    report.look.held.x > 400 &&
    report.look.held.y < -250 &&
    report.look.held.zoom > 0.15,
  springLaunches: report.spring.launched && report.spring.apex > 500,
  counterBeltDrags: report.belt.drift < -50,
  windLeansOnJump:
    report.wind.windApex < report.wind.calmApex - 30 &&
    report.wind.windLanding < report.wind.calmLanding - 40,
  lockdownSeals:
    report.lockdown.lockBefore === 0 &&
    report.lockdown.sealed === 1 &&
    report.lockdown.wallsSolid === 2 &&
    report.lockdown.heldIn,
  lockdownReleases:
    report.lockdown.released === 0 && report.lockdown.wallsAfter === 0,
  arenaHasShelves: report.lockdown.arenaShelves >= 8,
  lookDampsBack:
    Math.abs(report.look.released.x) < 5 &&
    Math.abs(report.look.released.y) < 5 &&
    report.look.released.zoom < 0.01,
};
report.checks = checks;
report.failures = Object.entries(checks)
  .filter(([, v]) => !v)
  .map(([k]) => k);
fs.writeFileSync(
  new URL('../camera/targeted-results.json', import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

assert.equal(report.failures.length, 0, report.failures.join(', '));
