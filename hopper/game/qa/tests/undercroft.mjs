// The dark below the 2D routes: a missed jump lands on the floor under the
// route instead of ending the run, the floor slides Hopper back to a launch
// pad, and the pad's jump puts him just above the shelf over it.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const temp = fs.mkdtempSync('/tmp/hopper-undercroft-');
const src = new URL('../../src/game/', import.meta.url).pathname;
for (const name of ['engine', 'levels', 'combat', 'hopper-animation']) {
  let raw = fs.readFileSync(src + name + '.ts', 'utf8');
  raw = raw.replace(/from '\.\/(levels|combat|hopper-animation|renderer)'/g, "from './$1.mjs'");
  fs.writeFileSync(temp + '/' + name + '.mjs', ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText);
}
fs.writeFileSync(temp + '/renderer.mjs', 'export class Renderer {constructor(){this.viewport={width:1600,height:900}}draw(){}dispose(){}}');
globalThis.window = {};
globalThis.location = { hostname: 'audit' };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
const { Engine, PHYSICS } = await import(temp + '/engine.mjs');
const { buildLevel, floorAt, UNDERCROFT } = await import(temp + '/levels.mjs');
const { CombatWorld } = await import(temp + '/combat.mjs');

let checks = 0;
const failures = [];
const check = (cond, msg) => {
  checks++;
  if (!cond) failures.push(msg);
};
const input = { moveX: 0, moveY: 0, jumpHeld: false, jumpPressed: false, kickPressed: false, shootHeld: false, pausePressed: false, instructionsPressed: false, confirmPressed: false, backPressed: false, anyPressed: false, menuX: 0, menuY: 0, connected: false, active: 'keyboard', disconnected: false };

// ---- The level data: a floor under every area, pads under route shelves.
for (let m = 0; m < 3; m++) {
  const l = buildLevel(m);
  const mains = l.platforms.filter((p) => p.routeRole === 'main');
  const floors = l.platforms.filter((p) => p.routeRole === 'floor' && p.kind !== 'launch');
  const pads = l.platforms.filter((p) => p.kind === 'launch');
  check(l.undercroft.length === 3, `mission ${m}: an undercroft per area (${l.undercroft.length})`);
  check(floors.length > 100 && pads.length > 50, `mission ${m}: floors ${floors.length}, pads ${pads.length}`);
  let below = true,
    growing = true;
  for (const u of l.undercroft) {
    const inArea = mains.filter((p) => p.x >= u.xStart && p.x < u.xEnd);
    for (const p of inArea) if (floorAt(l, p.x + p.w / 2) - p.y < UNDERCROFT.drop - 1) below = false;
    // The gap opens along the area: the floor ends further under the route than it began.
    const first = inArea[0],
      last = inArea[inArea.length - 1];
    if (floorAt(l, last.x) - last.y <= floorAt(l, first.x) - first.y) growing = false;
  }
  check(below, `mission ${m}: the floor is at least ${UNDERCROFT.drop} under every route shelf`);
  check(growing, `mission ${m}: the floor drifts further from the route along each area`);
  check(pads.every((p) => p.launchTo !== undefined && p.launchTo < p.y), `mission ${m}: every pad launches upward`);
  check(pads.every((p) => mains.some((q) => q.y === p.launchTo && p.x + p.w / 2 >= q.x && p.x + p.w / 2 <= q.x + q.w)), `mission ${m}: every pad stands under the shelf it launches to`);
  const gaps = pads.slice(1).map((p, i) => p.x - pads[i].x).filter((g) => g > 0 && g < 4000);
  check(gaps.every((g) => g >= 300 && g <= UNDERCROFT.spacing * 2), `mission ${m}: pads are evenly spaced (${Math.min(...gaps)}..${Math.max(...gaps)})`);
}

// ---- Play it: walk off a route shelf into a gap, land in the dark, slide to a pad, launch back up.
const level = buildLevel(0);
const mains = level.platforms.filter((p) => p.routeRole === 'main');
let a = null,
  b = null;
// A gap whose middle has nothing under it but the dark: no recovery step, low road or pad.
let dropX = 0;
for (let i = 0; i < mains.length - 1; i++) {
  const gap = mains[i + 1].x - (mains[i].x + mains[i].w);
  if (gap <= 260 || mains[i].x < 2000) continue;
  const mid = mains[i].x + mains[i].w + gap / 2;
  const caught = level.platforms.some((p) => p.routeRole !== 'floor' && p.x < mid + 70 && p.x + p.w > mid - 70 && p.y > mains[i].y - 400);
  if (!caught) {
    a = mains[i];
    b = mains[i + 1];
    dropX = mid;
    break;
  }
}
check(a && b, 'a route gap to fall into');
const engine = new Engine({}, { effect() {} }, () => {});
engine.level = { ...level, enemies: [], hazards: [], collectibles: [], checkpoints: [{ x: a.x + 100, y: a.y, area: 0 }] };
engine.combat = new CombatWorld(engine.level);
engine.combat.boss.alive = false;
engine.platforms = engine.level.platforms;
engine.checkpointIndex = 0;
engine.checkpoint = { x: a.x + 100, y: a.y, area: 0 };
engine.areaIndex = 0;
engine.hp = 7;
engine.respawnT = 0;
engine.victoryT = 0;
engine.particles = [];
engine.explosions = [];
engine.lasers = [];
engine.crumble = new Map();
Object.assign(engine.player, { x: dropX, y: a.y + 60, vx: 0, vy: 0, grounded: false, gravitySign: 1, kickT: 0, launchT: 0, landT: 0, invuln: 100 });
const dt = 1 / 120;
const run = (seconds, f = input, until = () => false) => {
  for (let n = 0; n < seconds * 120; n++) {
    engine.step(dt, f);
    if (until()) return true;
  }
  return false;
};
// Dropped into the gap: nothing to do but fall.
const landed = run(6, input, () => engine.player.grounded && String(engine.stood).startsWith('floor-'));
check(landed, `he lands on the dark floor (stood ${engine.stood}, y ${engine.player.y.toFixed(0)}, floor ${floorAt(level, engine.player.x)?.toFixed(0)})`);
check(engine.hp === 7 && engine.respawnT === 0, 'the fall is not a death');
const landingX = engine.player.x;
// He slides backward, whatever the stick says, and cannot jump off the floor.
run(0.6, { ...input, moveX: 1, jumpPressed: true, jumpHeld: true });
check(engine.player.x < landingX - 60 && engine.player.grounded, `the floor carries him back (${(engine.player.x - landingX).toFixed(0)}), no jump off it`);
const onPad = run(12, input, () => engine.player.grounded && String(engine.stood).startsWith('launch-') && Math.abs(engine.player.vx) < 1);
check(onPad, `he arrives on a launch pad (stood ${engine.stood})`);
const pad = level.platforms.find((p) => p.id === engine.stood);
run(0.5, { ...input, moveX: 1 });
check(pad && Math.abs(engine.player.vx) < 5 && engine.player.x >= pad.x && engine.player.x <= pad.x + pad.w, 'the pad holds him still against the stick');
// The pad's jump: straight up, past the shelf over it, landing on it.
const target = level.platforms.find((p) => p.routeRole === 'main' && p.y === pad.launchTo && pad.x + pad.w / 2 >= p.x && pad.x + pad.w / 2 <= p.x + p.w);
check(!!target, 'the pad has a shelf over it');
const x0 = engine.player.x;
engine.step(dt, { ...input, jumpPressed: true, jumpHeld: true });
check(engine.player.vy < -1600, `the launch is far past a jump (${engine.player.vy.toFixed(0)})`);
let apex = Infinity;
const back = target && run(8, { ...input, moveX: 0, jumpHeld: false }, () => {
  apex = Math.min(apex, engine.player.y);
  return engine.player.grounded && engine.stood === target.id;
});
check(back, `he lands on the shelf over the pad (stood ${engine.stood}, apex ${apex.toFixed(0)} vs shelf ${target?.y})`);
check(target && apex < target.y - 60 && apex > target.y - PHYSICS.launchClear - 120, `the launch tops out just above the shelf (${target ? (target.y - apex).toFixed(0) : '?'} above)`);
check(Math.abs(engine.player.x - x0) < 40, `the launch is straight up (drift ${(engine.player.x - x0).toFixed(0)})`);
check(engine.launchLock === false, 'steering is his again once he is up');

if (failures.length) {
  console.error(`undercroft: ${failures.length} of ${checks} checks failed\n - ` + failures.join('\n - '));
  process.exit(1);
}
console.log(`undercroft: ${checks} checks passed (the dark below the 2D routes: floors, pads, the slide back and the launch up)`);
