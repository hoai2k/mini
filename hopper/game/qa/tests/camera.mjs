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
e = make();
step(e, { blockHeld: true });
const shieldStart = e.shield,
  hpStart = e.hp;
e.hurt(2, 300, -200);
const afterHit = e.shield;
const hitHp = e.hp;
let breakAt = null;
for (let n = 0; n < 600; n++) {
  step(e, { blockHeld: true });
  if (n % 30 === 29) e.hurt(1, 300, -200);
  if (e.shieldBrokenT > 0) {
    breakAt = n / 120;
    break;
  }
}
const shieldWhenBroken = e.shield,
  blockingWhenBroken = e.player.blocking,
  hpAtBreak = e.hp;
e.player.invuln = 0;
e.hurt(1, 300, -200);
const afterBreakHp = e.hp;
for (let n = 0; n < 800; n++) step(e, { blockHeld: false });
report.shield = {
  shieldStart,
  afterHit,
  hpStart,
  hitHp,
  breakAt,
  shieldWhenBroken,
  blockingWhenBroken,
  hpAtBreak,
  afterBreakHp,
  recharged: e.shield,
};
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
  blockProtects: hitHp === hpStart,
  shieldBreaks: breakAt !== null && !blockingWhenBroken,
  brokenAllowsDamage: afterBreakHp < hpAtBreak,
  shieldRecharges: e.shield === 1,
  BMapsToBlock:
    report.controllerB.blockHeld && !report.controllerB.pausePressed,
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
