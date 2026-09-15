// Lasers against shells in the 2D engine: a closed shell turns the beam aside
// and it dies out along its line; a mirror shell sends it back whole, near
// enough to Hopper's own line to hit him now and then.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const temp = fs.mkdtempSync('/tmp/hopper-laser-');
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

let checks = 0;
const failures = [];
const check = (cond, msg) => {
  checks++;
  if (!cond) failures.push(msg);
};
const input = {
  moveX: 0,
  moveY: 0,
  jumpHeld: false,
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
const dt = 1 / 120;

/** A flat shelf with one shadow standing `gap` ahead of Hopper, who faces it. */
function stage(type, gap, extra = {}) {
  const level = buildLevel(0);
  const floor = {
    id: 'floor',
    x: 0,
    y: 800,
    w: 4000,
    h: 130,
    skin: 0,
    kind: 'solid',
    routeRole: 'main',
    area: 0,
  };
  const engine = new Engine({}, { effect() {} }, () => {});
  engine.level = {
    ...level,
    platforms: [floor],
    undercroft: [],
    enemies: [{ id: 'shell', type, x: 1000 + gap, y: 800, area: 0, ...extra }],
    hazards: [],
    collectibles: [],
    checkpoints: [{ x: 1000, y: 800, area: 0 }],
    gravityGates: [],
    barriers: [],
  };
  engine.combat = new CombatWorld(engine.level);
  engine.combat.boss.alive = false;
  engine.platforms = engine.level.platforms;
  engine.checkpointIndex = 0;
  engine.checkpoint = { x: 1000, y: 800, area: 0 };
  engine.areaIndex = 0;
  engine.hp = 7;
  engine.respawnT = 0;
  engine.victoryT = 0;
  engine.particles = [];
  engine.explosions = [];
  engine.lasers = [];
  engine.crumble = new Map();
  Object.assign(engine.player, {
    x: 1000,
    y: 800,
    vx: 0,
    vy: 0,
    grounded: true,
    gravitySign: 1,
    facing: 1,
    kickT: 0,
    launchT: 0,
    landT: 0,
    invuln: 0,
    hitstun: 0,
  });
  return engine;
}
/** Fire for `seconds`, keeping the shadow from attacking so only the beam can hurt. */
function fire(engine, seconds) {
  const e = engine.combat.enemies[0];
  let beams = 0,
    fizzles = 0,
    mirrors = 0;
  for (let n = 0; n < seconds * 120; n++) {
    e.cooldown = 99;
    e.state = 'idle';
    engine.step(dt, { ...input, shootHeld: true });
    for (const b of engine.lasers) {
      if (b.life < b.maxLife) continue; // only fresh this step
      // Hopper's own beam starts at his eye; a turned beam starts at the shell.
      if (b.x > 1150) {
        if (b.fizzle) fizzles++;
        else mirrors++;
      } else beams++;
    }
  }
  return { beams, fizzles, mirrors };
}

// A crag tortoise: the beam bounces off at a steep angle and fizzles.
{
  const engine = stage('cragTortoise', 320);
  const r = fire(engine, 0.5);
  const e = engine.combat.enemies[0];
  check(r.beams > 0, 'Hopper fires at the tortoise');
  check(
    r.fizzles > 0 && r.mirrors === 0,
    `the closed shell turns the beam aside and it fizzles (${r.fizzles} fizzles, ${r.mirrors} mirrors)`,
  );
  check(e.hp === e.maxHp, 'nothing lands on the closed shell');
  check(engine.hp === 7, 'and nothing comes back at Hopper');
  const turned = engine.lasers.find((b) => b.fizzle);
  check(
    !!turned &&
      turned.y2 < turned.y &&
      Math.hypot(turned.x2 - turned.x, turned.y2 - turned.y) < 330,
    'the turned beam heads up and away, short',
  );
  // A kick opens the shell, and the lasers land.
  e.x = 1000 - 80;
  e.homeX = e.x;
  engine.step(dt, { ...input, kickPressed: true });
  for (let n = 0; n < 12; n++) engine.step(dt, input);
  check(e.open > 0, 'a kick opens the shell');
  e.x = 1320;
  e.homeX = e.x;
  e.invulnerable = 0;
  const hpBefore = e.hp;
  const again = fire(engine, 0.3);
  check(
    again.fizzles === 0 && e.hp < hpBefore,
    `open, the shell takes the lasers (${e.hp} of ${hpBefore})`,
  );
}
// A ballast crab mirrors the beam, and standing close to it costs Hopper.
{
  const engine = stage('ballastCrab', 200);
  const r = fire(engine, 1.2);
  check(
    r.mirrors > 0 && r.fizzles === 0,
    `a mirror shell sends the beam back whole (${r.mirrors} mirrors)`,
  );
  check(
    engine.hp < 7,
    `and close in, it comes back at Hopper (hp ${engine.hp})`,
  );
  const back = engine.lasers.find((b) => !b.fizzle && b.x > 1150);
  const dx = back.x2 - back.x,
    dy = back.y2 - back.y;
  check(
    !!back && dx < 0 && Math.abs(Math.atan2(dy, -dx)) > 0.15,
    "the returned beam is off Hopper's line, not straight back",
  );
  // Further away, the returned beam mostly passes by.
  const far = stage('ballastCrab', 700);
  fire(far, 1.2);
  check(
    far.hp === 7,
    `from further away the returned beam misses (hp ${far.hp})`,
  );
}
// Every shadow in the first episode can be stomped; only hardened spawns of
// the third refuse it while closed, and there are few of them.
{
  const first = buildLevel(0),
    third = buildLevel(2);
  check(
    first.enemies.every((e) => !e.hardened),
    'no hardened shadows in the first episode',
  );
  check(
    buildLevel(1).enemies.every((e) => !e.hardened),
    'nor the second',
  );
  const hard = third.enemies.filter((e) => e.hardened).length;
  check(
    hard > 0 && hard <= 15,
    `a few hardened shadows in the third (${hard} of ${third.enemies.length})`,
  );
}
// A leaps chapter (nothing to fight) has fewer, taller shelves than a
// fighting chapter, so it is well shorter and its jumps rise more.
{
  const l = buildLevel(0);
  const main = l.platforms.filter(
    (p) => p.routeRole === 'main' && /-p\d$/.test(p.id),
  );
  const shelves = (chapter) => main.filter((p) => p.id.startsWith(chapter));
  const span = (chapter) => {
    const s = shelves(chapter);
    return s[s.length - 1].x + s[s.length - 1].w - s[0].x;
  };
  const leaps = shelves('m0-a0-c0-'),
    mixed = shelves('m0-a0-c4-');
  check(
    leaps.length < mixed.length,
    `a leaps chapter has fewer shelves (${leaps.length} vs ${mixed.length})`,
  );
  check(
    span('m0-a0-c0-') < span('m0-a0-c4-') * 0.8,
    `and spans well under a mixed one (${span('m0-a0-c0-')} vs ${span('m0-a0-c4-')})`,
  );
  check(
    leaps.every((p) => !l.enemies.some((e) => e.id.startsWith(p.id + '-'))),
    'and nothing to fight on it',
  );
  const total = buildLevel(0).width + buildLevel(1).width + buildLevel(2).width;
  check(
    total < 290000,
    `the three boards together are shorter than they were (${total} of the old ~350k)`,
  );
}

if (failures.length) {
  console.error('laser2d FAILED:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(
  `laser2d: ${checks} checks passed (shells turn lasers aside, mirrors send them back, hardened spawns are rare)`,
);
