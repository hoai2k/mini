import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const temp = fs.mkdtempSync('/tmp/hopper-audit-');
const src = new URL('../../src/game/', import.meta.url).pathname;
for (const name of ['engine', 'levels', 'combat', 'hopper-animation']) {
  let raw = fs.readFileSync(src + name + '.ts', 'utf8');
  raw = raw.replace(
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
globalThis.window = {};
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
const { Engine } = await import(temp + '/engine.mjs');
const { buildLevel } = await import(temp + '/levels.mjs');
const { CombatWorld } = await import(temp + '/combat.mjs');
const input = {
  moveX: 1,
  moveY: 0,
  jumpHeld: true,
  jumpPressed: false,
  kickPressed: false,
  shootHeld: false,
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
const engine = new Engine({}, { effect() {} }, () => {});
const failures = [],
  counts = [];
function prepare(level, a, b, startTime = 0) {
  const local = {
    ...level,
    platforms: level.platforms.filter(
      (p) => p.x + p.w > a.x - 200 && p.x < b.x + b.w + 200,
    ),
    enemies: [],
    hazards: [],
    collectibles: [],
    checkpoints: [{ x: a.x + 170, y: a.y, area: a.area }],
    chapters: level.chapters,
  };
  engine.level = local;
  engine.combat = new CombatWorld(local);
  engine.combat.boss.alive = false;
  engine.platforms = local.platforms;
  engine.checkpointIndex = 0;
  engine.checkpoint = { x: a.x + 170, y: a.y, area: a.area };
  engine.areaIndex = a.area;
  engine.time = startTime;
  engine.hold = 0;
  engine.previousHold = false;
  engine.jumpBuffer = 0;
  engine.coyote = 0.11;
  engine.stood = '';
  engine.hp = 7;
  engine.respawnT = 0;
  engine.victoryT = 0;
  engine.deathY = 100000;
  engine.particles = [];
  engine.explosions = [];
  engine.lasers = [];
  engine.crumble = new Map();
  Object.assign(engine.player, {
    x: a.x + a.w - 100,
    y: a.y,
    vx: 650,
    vy: 0,
    grounded: true,
    gravitySign: 1,
    kickT: 0,
    launchT: 0,
    landT: 0,
    invuln: 100,
  });
}
function attempt(level, a, b, hold, mode, vx, startTime = 0) {
  prepare(level, a, b, startTime);
  // A swinging shelf carries its takeoff point; start from where it is now.
  if (a.moving)
    engine.player.x +=
      Math.sin((startTime * a.moving.speed) / a.moving.range + a.moving.phase) *
      a.moving.range;
  engine.player.vx = vx;
  for (let n = 0; n < 650; n++) {
    const f = {
      ...input,
      jumpPressed: n === 0,
      jumpHeld: n / 120 < hold,
      moveX:
        mode === 'aim'
          ? Math.max(
              -1,
              Math.min(1, ((b.x + b.w * 0.5 - engine.player.x) * 3) / 650),
            )
          : 1,
    };
    engine.step(1 / 120, f);
    const p = engine.player;
    if (p.grounded && n > 10 && engine.stood === b.id)
      return { n, hold, mode, vx };
    if (p.y > Math.max(a.y, b.y) + 1100 || p.x > b.x + b.w + 250) return false;
  }
  return false;
}
for (let m = 0; m < 3; m++) {
  const l = buildLevel(m),
    main = l.platforms.filter(
      (p) => p.routeRole === 'main' || p.id.endsWith('arena-floor'),
    );
  let passed = 0;
  for (let i = 0; i < main.length - 1; i++) {
    let ok = false;
    if (main[i + 1].via === 'inversion') {
      // Leap up into the gate from the shelf's end, ride the ceiling across,
      // and drop out of the far side onto the next landing.
      const a = main[i],
        b = main[i + 1];
      prepare(l, a, b);
      Object.assign(engine.player, { x: a.x + a.w - 120, vx: 0 });
      let onCeiling = false;
      for (let n = 0; n < 1500; n++) {
        const p = engine.player;
        engine.step(1 / 120, {
          ...input,
          jumpPressed: n === 0,
          jumpHeld: n < 60,
          moveX: n < 8 ? 0 : 1,
        });
        if (p.gravitySign === -1 && p.grounded) onCeiling = true;
        if (
          onCeiling &&
          p.gravitySign === 1 &&
          p.grounded &&
          engine.stood === b.id
        ) {
          ok = true;
          break;
        }
        if (p.y > Math.max(a.y, b.y) + 1100) break;
      }
      if (!ok)
        failures.push({
          mission: m,
          from: a.id,
          to: b.id,
          kind: 'inverted crossing',
        });
      else passed++;
      continue;
    }
    const moving = !!(main[i].moving || main[i + 1].moving);
    const period = moving
      ? (2 * Math.PI * (main[i].moving || main[i + 1].moving).range) /
        (main[i].moving || main[i + 1].moving).speed
      : 0;
    const starts = moving ? [0, 0.25, 0.5, 0.75].map((f) => f * period) : [0];
    ok = starts.every((startTime) => {
      for (const mode of ['forward', 'aim'])
        for (const hold of [0.13, 0.27, 0.5, 1.8])
          for (const vx of [650, 0])
            if (attempt(l, main[i], main[i + 1], hold, mode, vx, startTime))
              return true;
      return false;
    });
    if (ok) passed++;
    else
      failures.push({
        mission: m,
        from: main[i].id,
        to: main[i + 1].id,
        gap: main[i + 1].x - main[i].x - main[i].w,
        rise: main[i].y - main[i + 1].y,
      });
  }
  counts.push({ mission: m, passed, total: main.length - 1 });
}
const l = buildLevel(2),
  main = l.platforms.filter((p) => p.routeRole === 'main'),
  gate = l.gravityGates[0],
  entry = l.platforms.find(
    (p) => p.id === gate.id.replace('-inversion', '-gallery-entry'),
  ),
  base = l.platforms.find((p) => p.id === gate.id.replace('-inversion', ''));
prepare(l, entry, base);
engine.player.x = entry.x + entry.w / 2;
engine.player.vx = 0;
let inverted = false,
  ceiling = false;
for (let n = 0; n < 600; n++) {
  engine.step(1 / 120, {
    ...input,
    moveX: 0,
    jumpPressed: n === 0,
    jumpHeld: true,
  });
  inverted ||= engine.player.gravitySign === -1;
  if (engine.player.gravitySign === -1 && engine.player.grounded) {
    ceiling = true;
    break;
  }
}
let exited = false,
  recovered = false;
for (let n = 0; n < 900; n++) {
  engine.step(1 / 120, {
    ...input,
    moveX: engine.player.x < gate.x + gate.w + 90 ? 1 : 0,
    jumpHeld: false,
  });
  exited ||= engine.player.gravitySign === 1;
  // Restored gravity must put Hopper back on the route: the safe floor, or the
  // next landing when momentum (and the ledge catch) carries it across the gap.
  if (
    exited &&
    engine.player.grounded &&
    (Math.abs(engine.player.y - base.y) < 1 ||
      main.some((q) => q.id === engine.stood))
  ) {
    recovered = true;
    break;
  }
}
const result = {
  counts,
  failures,
  gravityGallery: {
    inverted,
    ceiling,
    exited,
    recovered,
    final: { x: engine.player.x, y: engine.player.y },
  },
};
fs.writeFileSync(
  new URL('../engine/results.json', import.meta.url),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
const laserTests = [];
for (const type of [
  'shadeHound',
  'seedSpitter',
  'windowRay',
  'spireLeech',
  'cragTortoise',
  'riftCondor',
  'furnaceHound',
  'slagCaster',
  'chainManta',
  'ballastCrab',
  'coilWraith',
  'turbineWasp',
  'basaltBurrower',
  'thornChoir',
  'veilMedusa',
  'phaseSkate',
  'mirrorStalker',
  'gravityCantor',
]) {
  const flying = [
    'windowRay',
    'riftCondor',
    'chainManta',
    'coilWraith',
    'turbineWasp',
    'veilMedusa',
    'phaseSkate',
    'gravityCantor',
  ].includes(type);
  const testLevel = {
    ...buildLevel(0),
    enemies: [
      { id: 'laser-' + type, type, x: 550, y: flying ? 700 : 800, area: 0 },
    ],
  };
  const floor = testLevel.platforms[0];
  prepare(testLevel, floor, floor);
  engine.combat = new CombatWorld(testLevel);
  engine.combat.boss.alive = false;
  engine.combat.enemies[0].asleep = false;
  Object.assign(engine.player, {
    x: 200,
    y: 800,
    facing: 1,
    vx: 0,
    vy: 0,
    grounded: true,
    kickT: 0,
    landT: 0,
    launchT: 0,
  });
  const hp = engine.combat.enemies[0].hp;
  engine.shoot();
  laserTests.push({
    type,
    damage: hp - engine.combat.enemies[0].hp,
    beam: engine.lasers.at(-1),
  });
}
const bossLaserTests = [];
for (let m = 0; m < 3; m++) {
  const l = buildLevel(m),
    floor = l.platforms.find((p) => p.id.endsWith('arena-floor'));
  prepare(l, floor, floor);
  engine.combat = new CombatWorld(l);
  engine.combat.enemies = [];
  const b = engine.combat.boss;
  b.active = true;
  Object.assign(engine.player, {
    x: b.x - 400,
    y: b.y - b.h * 0.52 + 100.8,
    gravitySign: 1,
    grounded: true,
    facing: 1,
    kickT: 0,
    landT: 0,
    launchT: 0,
  });
  engine.shoot();
  const closed = 70 - b.hp;
  b.invulnerable = 0;
  b.open = 2;
  const hp = b.hp;
  engine.shoot();
  bossLaserTests.push({
    type: b.type,
    closedDamage: closed,
    openDamage: hp - b.hp,
  });
}
const laserSummary = {
  allSpeciesHit: laserTests.every((t) => t.damage > 0),
  species: laserTests.map(({ type, damage }) => ({ type, damage })),
  bossLaserTests,
};
fs.writeFileSync(
  new URL('../engine/laser-results.json', import.meta.url),
  JSON.stringify(laserSummary, null, 2),
);
console.log(JSON.stringify(laserSummary, null, 2));

if (failures.length || !ceiling || !recovered || !laserSummary.allSpeciesHit)
  process.exitCode = 1;
