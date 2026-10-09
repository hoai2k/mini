import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/garbagecanary.js';
import entry from '../src/more/garbagecanary.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;
const RUB = ['paper', 'peel', 'tin', 'core', 'fishbone', 'boot'];

// A bin-minder: picks the soonest rubbish it can still get to (at its own
// pace), walks into that thing's lane, lifts the lid `lead` seconds before it
// arrives, and keeps the lid shut while something that isn't rubbish is about
// to reach it in its lane. It reacts `delay` seconds late, pushes the stick
// `speed` of the way, and misjudges timing by up to `wobble` seconds.
function minder({ speed = 1, lead = 0.45, delay = 0, wobble = 0, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const q = [];
  const n = Math.round(delay * 60);
  const err = new Map();
  return (game) => {
    const coming = game.coming().filter((it) => it.x > game.bx - 40);
    const e = (it) => {
      if (!err.has(it)) err.set(it, (rnd() - 0.5) * 2 * wobble);
      return game.eta(it) + err.get(it);
    };
    const tgt = coming.filter((it) => it.rub && e(it) > Math.abs(it.lane - game.by) / (300 * speed) + delay).sort((a, b) => e(a) - e(b))[0];
    let y = 0;
    let action = false;
    if (tgt) {
      y = Math.max(-1, Math.min(1, (tgt.lane - game.by) / 25)) * speed;
      action = Math.abs(tgt.lane - game.by) < 30 && e(tgt) < lead;
    }
    const bad = coming.find((it) => !it.rub && game.inLane(it) && e(it) < 0.45 && e(it) > -0.1);
    if (bad && (!tgt || e(bad) < e(tgt) + 0.1)) action = false;
    if (game.held || game.can === 'pull') action = true;
    q.push({ y, action });
    return q.length > n ? q.shift() : {};
  };
}
// Wandering about blindly, holding the lid open, or flapping it.
const holdWander = () => (g, t) => ({ x: Math.sin(t * 0.7), y: Math.sin(t * 1.3), action: true });
const flapWander = (hz = 2) => (g, t) => ({ x: Math.sin(t * 0.7), y: Math.sin(t * 1.3), action: Math.floor(t * hz * 2) % 2 === 0 });

test('garbagecanary: a clumsy beginner opens the next page on most rounds, a beginner on all, a sharp minder scores more; wandering with the lid up or flapping it, and idling, score at most about half the mark', () => {
  const seeds8 = [1, 2, 3, 4, 5, 6, 7, 8];
  const seeds16 = Array.from({ length: 16 }, (_, i) => i + 1);
  const clumsy = seeds8.map((seed) => run(create, { seed, bot: minder({ speed: 0.6, lead: 0.9, delay: 0.3, wobble: 0.2, seed }) }).game.score);
  const beginner = seeds8.map((seed) => run(create, { seed, bot: minder({ speed: 0.8, lead: 0.9, delay: 0.2, wobble: 0.15, seed }) }).game.score);
  const good = seeds8.map((seed) => run(create, { seed, bot: minder({ speed: 1, lead: 0.6, delay: 0.05, wobble: 0.03, seed }) }).game.score);
  const hold = seeds16.map((seed) => run(create, { seed, bot: holdWander() }).game.score);
  const flap = seeds16.map((seed) => run(create, { seed, bot: flapWander(2) }).game.score);
  const flapSlow = seeds16.map((seed) => run(create, { seed, bot: flapWander(0.75) }).game.score);
  const open = seeds16.map((seed) => run(create, { seed, bot: () => ({ action: true }) }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('garbagecanary clumsy', clumsy, 'beginner', beginner, 'good', good, 'hold+wander', hold, 'flap+wander', flap, 'slow flap', flapSlow, 'open', open, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(clumsy.filter((s) => s >= pass).length >= 6, `clumsy beginner ${clumsy}`);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(avg(good) > avg(beginner) * 1.3, `good ${good}`);
  const half = pass / 2 + 0.5;
  assert.ok(Math.max(...hold) <= half, `holding the lid open while wandering: ${hold}`);
  assert.ok(Math.max(...flap) <= half, `flapping the lid while wandering: ${flap}`);
  assert.ok(Math.max(...open) <= half, `standing with the lid open: ${open}`);
  assert.ok(Math.max(...flapSlow) < pass, `slowly flapping the lid while wandering: ${flapSlow}`);
});

// A game with nothing blowing in, and one thing put `dx` in front of the bin
// in its lane.
function setup(kind, dx = 300, seed = 1) {
  const game = create(env(seed));
  game.spawnT = 999;
  const it = put(game, kind, dx);
  return { game, it };
}
function put(game, kind, dx, extra = {}) {
  const it = { kind, rub: RUB.includes(kind), lane: game.by, x: game.bx + dx, y: game.by, vx: -320, vy: 0, t: 0, phase: 0, amp: 40, hop: 260, gust: null, gusted: false, state: 'come', rot: 0, spin: 0, life: 0, ...extra };
  game.items.push(it);
  return it;
}
const step = (game, n, over = {}) => {
  for (let i = 0; i < n; i++) game.update(1 / 60, blank(over));
};

test('garbagecanary: with the lid up, the canary rises, reaches, grips and pulls rubbish in', () => {
  const { game, it } = setup('tin', 420);
  const seen = new Set();
  for (let i = 0; i < 120 && game.binned === 0; i++) {
    game.update(1 / 60, blank({ action: true }));
    seen.add(game.can);
  }
  assert.equal(game.binned, 1);
  assert.equal(game.score, 1);
  for (const s of ['rise', 'up', 'reach', 'pull']) assert.ok(seen.has(s), `went through ${s}: ${[...seen]}`);
  assert.ok(it.dead);
  step(game, 30, { action: true });
  assert.equal(game.can, 'up', 'pops back up, ready');
});

test('garbagecanary: shutting the lid while the canary pulls something in slams it home', () => {
  const { game } = setup('paper', 400);
  for (let i = 0; i < 120 && !game.held; i++) game.update(1 / 60, blank({ action: true }));
  assert.ok(game.held, 'gripped');
  step(game, 20);
  assert.equal(game.binned, 1);
  assert.ok(game.slams >= 1);
  assert.equal(game.held, null);
  step(game, 30);
  assert.equal(game.can, 'in', 'head back under the lid');
});

test('garbagecanary: shutting the lid while the canary reaches pushes it and its catch in', () => {
  const { game, it } = setup('boot', 400);
  step(game, 20, { action: true }); // lid up, canary up
  // caught mid-reach: its head at the boot, not yet gripping
  const [mx, my] = game.mouth();
  const ks = game.ks();
  it.x = mx + 120 * ks;
  it.y = my - 60 * ks;
  it.vx = 0;
  game.can = 'reach';
  game.aim = it;
  game.head = [110 * ks, -60 * ks];
  game.update(1 / 60, blank({ action: false }));
  step(game, 12);
  assert.equal(game.binned, 1);
  assert.ok(game.slams >= 1, 'pushed in by the lid');
});

test('garbagecanary: snapping the lid down on something at the mouth catches it', () => {
  const { game, it } = setup('peel', 400);
  game.jam = 0;
  // the lid up just as it reaches the mouth, then straight down
  step(game, 1, { action: true });
  game.can = 'in'; // the canary not yet out: the lid itself does it
  game.open = 1;
  it.x = game.mouth()[0] + 40;
  it.lane = game.by;
  step(game, 12);
  assert.equal(game.binned, 1);
});

test('garbagecanary: lifting the lid knocks back something just above it', () => {
  const { game, it } = setup('paper', 0);
  step(game, 1);
  const [mx, my] = game.mouth();
  it.state = 'come';
  it.vx = 0;
  it.x = mx;
  it.y = my - 120 * game.ks(); // just above the shut lid
  game.update(1 / 60, blank({ action: true }));
  assert.equal(it.state, 'knocked');
  assert.ok(it.vy < 0, 'flung up');
  step(game, 60, { action: true });
  assert.equal(game.binned, 0);
});

test('garbagecanary: catching something that is not rubbish costs one and jams the lid', () => {
  const { game } = setup('hat', 380);
  game.score = 5;
  let stuck = false;
  for (let i = 0; i < 120; i++) {
    game.update(1 / 60, blank({ action: true }));
    if (game.swallowed && game.jam > 0.2) stuck = stuck || game.open < 0.5;
  }
  assert.equal(game.swallowed, 1);
  assert.equal(game.score, 4);
  assert.ok(stuck, 'the lid sticks while the canary splutters');
});

test('garbagecanary: with the lid shut, a thing in the lane bumps over it; one in another lane goes by', () => {
  const { game, it } = setup('hat', 300);
  const other = put(game, 'tin', 300, { lane: game.by + 120 });
  step(game, 90);
  assert.equal(game.letPast, 1);
  assert.notEqual(other.state, 'over');
  assert.equal(game.score, 0);
  assert.equal(it.state === 'over' || it.dead, true);
});

test('garbagecanary: the bin walks left, right and across the street, within the scene', () => {
  const game = create(env(1));
  const { bx, by } = game;
  step(game, 30, { x: 1 });
  assert.ok(game.bx > bx);
  step(game, 30, { y: 1 });
  assert.ok(game.by > by);
  step(game, 300, { x: -1, y: -1 });
  assert.ok(game.bx >= 200 && game.by >= 612);
  const s = game.scale();
  step(game, 300, { y: 1 });
  assert.ok(game.scale() > s, 'nearer is bigger');
});

test('garbagecanary: with a pointer, pressing on the bin lifts the lid; pressing elsewhere walks it there', () => {
  const game = create(env(1));
  const ptr = (x, y, down, pressed) => blank({ kind: 'pointer', action: down, actionPressed: pressed, pointer: { active: true, x, y, down, pressed } });
  game.update(1 / 60, ptr(game.bx + 600, game.by + 80, true, true));
  for (let i = 0; i < 20; i++) game.update(1 / 60, ptr(game.bx + 600, game.by + 80, true, false));
  assert.equal(game.open, 0, 'walking, lid shut');
  game.update(1 / 60, ptr(1000, 800, false, false));
  const x = game.bx;
  game.update(1 / 60, ptr(x, game.by - 150, true, true));
  for (let i = 0; i < 10; i++) game.update(1 / 60, ptr(x, game.by - 150, true, false));
  assert.ok(game.open > 0.5, 'pressing on the bin lifts the lid');
});

test('garbagecanary: five in a row earns a bonus', () => {
  const game = create(env(1));
  game.spawnT = 999;
  for (let n = 0; n < 5; n++) put(game, 'paper', 300 + n * 260);
  // lift the lid as each one comes (left up too long, the canary gets bored)
  for (let i = 0; i < 600; i++) {
    const near = game.coming().some((it) => it.x - game.bx < 330 && it.x - game.bx > -60);
    game.update(1 / 60, blank({ action: near || !!game.held }));
  }
  assert.equal(game.binned, 5);
  assert.equal(game.score, 6);
});

test('garbagecanary: cats and sparrows turn towards an open bin', () => {
  const { game, it } = setup('sparrow', 500);
  it.lane = game.by + 100;
  const d0 = Math.abs(it.lane - game.by);
  step(game, 30, { action: true });
  assert.ok(Math.abs(it.lane - game.by) < d0);
});

test('garbagecanary: a lid left gaping bores the canary back in, and then the wind whisks rubbish out', () => {
  const { game } = setup('tin', 2000);
  game.score = 5;
  step(game, 60 * 1.0, { action: true });
  assert.notEqual(game.can, 'in', 'out while the lid is fresh');
  step(game, 60 * 1.0, { action: true });
  assert.equal(game.can, 'in', 'bored, back inside');
  step(game, 60 * 1.5, { action: true });
  assert.ok(game.score < 5, `whisked: ${game.score}`);
  assert.ok(game.whisked >= 1);
});

test('garbagecanary: every painted piece is drawn at one scale (rim, lid and eye within 4% across all frames and poses)', async () => {
  const { readFileSync } = await import('node:fs');
  const { REG } = await import('../src/games/garbagecanary.js');
  const M = JSON.parse(readFileSync(new URL('../../design/source/sprite-measures.json', import.meta.url))).garbagecanary;
  const near = (a, b, what) => assert.ok(Math.abs(a / b - 1) <= 0.04, `${what}: ${a.toFixed(1)} against ${b.toFixed(1)}`);
  // the bin's rim, walking, against the standing bin
  M.rim.walk.forEach((r, i) => near(r.width * REG.walk[i].s, M.rim.sheet.width, `walk frame ${i} rim`));
  // each lid's length, against the shut lid with the head
  const len = (l) => Math.hypot(l.back[0] - l.front[0], l.back[1] - l.front[1]);
  near(len(M.lid.only) * REG.lidOnly.s, len(M.lid.sheet), 'lid alone');
  M.lid.call.forEach((l, i) => near(len(l) * REG.call[i].s, len(M.lid.sheet), `calling lid ${i}`));
  // the canary's eye in every pose, against the head under the shut lid
  M.eye.neck.forEach((d, i) => near(d * REG.neck[i].s, M.eye.sheet, `neck pose ${i} eye`));
});
