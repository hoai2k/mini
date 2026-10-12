import test from 'node:test';
import assert from 'node:assert/strict';
import create, { POSE_BEAK } from '../src/games/plugsocketswift.js';
import bird from '../src/more/plugsocketswift.js';
import { run, env, blank } from './harness.mjs';

const pass = bird.pass;
const at = (game, w) => Math.hypot(w.x - game.x, w.y - game.y);

// An electrician: keeps to the lamps the fuse can carry, unplugs sleepers
// to make room, serves the window closest to giving up, and flips the fuse
// back when it blows. `skill` slows its flight, lets a fourth lamp in, and
// sometimes picks a window at random.
function electrician(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let target = null;
  let pressed = false;
  let think = 0;
  const valid = (game, tg) => (tg === 'fuse' ? game.blown : tg && (tg.state === 'ask' || tg.state === 'sleep'));
  return (game, t) => {
    if (pressed) {
      pressed = false;
      return {};
    }
    const limit = skill >= 1 ? 3 : 4;
    if (game.blown) target = 'fuse';
    else if (!valid(game, target) || (t > think && skill >= 1)) {
      think = t + (skill >= 1 ? 0 : 0.5);
      const load = game.load();
      const sleepers = game.sleepers().sort((a, b) => at(game, a) - at(game, b));
      const asking = game.asking().sort((a, b) => a.patience - a.t - (b.patience - b.t));
      if (load >= limit && sleepers.length) target = sleepers[0];
      else if (asking.length && load < limit) target = rnd() < skill ? asking[0] : asking[Math.floor(rnd() * asking.length)];
      else target = sleepers[0] || null;
    }
    if (!target) return {};
    const w = target === 'fuse' ? game.fuse : target;
    const dx = w.x - game.x;
    const dy = w.y - game.y;
    const sp = 0.5 + 0.5 * skill;
    const near = Math.hypot(dx, dy) < 35;
    if (near && (target !== 'fuse' || game.blownT > 0.7)) {
      pressed = true;
      target = null;
      return { action: true };
    }
    return { x: Math.max(-1, Math.min(1, dx / 60)) * sp, y: Math.max(-1, Math.min(1, dy / 60)) * sp };
  };
}

// Plugs in every window that asks and never unplugs anything.
function greedy() {
  let pressed = false;
  return (game) => {
    if (pressed) {
      pressed = false;
      return {};
    }
    const tg = game.blown ? game.fuse : game.asking()[0];
    if (!tg) return {};
    const dx = tg.x - game.x;
    const dy = tg.y - game.y;
    if (Math.hypot(dx, dy) < 35 && (!game.blown || game.blownT > 0.7)) {
      pressed = true;
      return { action: true };
    }
    return { x: Math.max(-1, Math.min(1, dx / 60)), y: Math.max(-1, Math.min(1, dy / 60)) };
  };
}

// Flies about at random, mashing the button.
const masher = (seed) => {
  let r = seed * 31;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let d = [0, 0];
  return (game, t) => {
    if (rnd() < 0.03) d = [rnd() * 2 - 1, rnd() * 2 - 1];
    return { x: d[0], y: d[1], action: Math.floor(t * 8) % 2 === 0 };
  };
};

test('plugsocketswift: a beginner opens the next page, a good electrician more; idle, greedy and mashing do not', () => {
  const seeds = [1, 2, 3, 4, 5];
  const beginner = seeds.map((seed) => run(create, { seed, bot: electrician(0.4, seed) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: electrician(1, seed) }).game.score);
  const greed = seeds.map((seed) => run(create, { seed, bot: greedy() }).game.score);
  const mash = seeds.map((seed) => run(create, { seed, bot: masher(seed) }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('plugsocketswift beginner', beginner, 'good', good, 'greedy', greed, 'mash', mash, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(Math.min(...good) > Math.max(...beginner) - 2, `good ${good}`);
  assert.ok(Math.max(...greed) < pass, `greedy must not open the next page: ${greed}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
});

// Puts the Swift on a room and presses the action once.
test('plugsocketswift: dusk starts with few, patient requests and short books; night brings many, impatient ones with long books', () => {
  const part = () => ({ asks: 0, patience: [], read: [] });
  const early = part();
  const late = part();
  for (const seed of [1, 2, 3, 4, 5]) {
    const was = new Map();
    const bot = electrician(1, seed);
    run(create, {
      seed,
      bot: (game, t) => {
        const p = game.elapsed / 45;
        const q = p < 1 / 3 ? early : p > 2 / 3 ? late : null;
        for (const r of game.rooms) {
          if (q && r.state === 'ask' && was.get(r) !== 'ask') {
            q.asks++;
            q.patience.push(r.patience);
            q.read.push(r.readT);
          }
          was.set(r, r.state);
        }
        return bot(game, t);
      },
    });
  }
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  assert.ok(late.asks > early.asks * 1.5, `requests early ${early.asks}, late ${late.asks}`);
  assert.ok(mean(late.patience) < mean(early.patience) * 0.7, `patience early ${mean(early.patience).toFixed(1)}, late ${mean(late.patience).toFixed(1)}`);
  assert.ok(mean(late.read) > mean(early.read) + 2, `books early ${mean(early.read).toFixed(1)}, late ${mean(late.read).toFixed(1)}`);
});

function pressAt(game, tg) {
  const w = tg === 'fuse' ? game.fuse : tg;
  game.x = w.x;
  game.y = w.y;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  game.x = w.x;
  game.y = w.y;
  game.update(1 / 60, blank({ actionReleased: true }));
}

test('plugsocketswift: a lamp plugged in at an asking window scores when its reader falls asleep, and unplugs', () => {
  const game = create(env(1));
  const r = game.rooms[5];
  r.state = 'ask';
  r.t = 0;
  r.patience = 99;
  r.readT = 1;
  pressAt(game, r);
  assert.equal(r.state, 'lit');
  for (let i = 0; i < 70; i++) {
    game.x = r.x;
    game.y = r.y;
    game.update(1 / 60, blank());
  }
  assert.equal(r.state, 'sleep');
  assert.equal(game.score, 1);
  assert.equal(game.load(), 1);
  pressAt(game, r);
  assert.equal(r.state, 'dark');
  assert.equal(game.load(), 0);
});

test('plugsocketswift: too many lamps blow the fuse; nothing plugs in until it is flipped back', () => {
  const game = create(env(1));
  game.spawnT = 99;
  for (const r of game.rooms.slice(0, 5)) {
    r.state = 'sleep';
    r.t = 0;
  }
  for (let i = 0; i < 60 * 5 && !game.blown; i++) game.update(1 / 60, blank());
  assert.ok(game.blown, 'fuse blew');
  assert.equal(game.fuses, 1);
  assert.equal(game.load(), 0);
  const r = game.rooms[8];
  r.state = 'ask';
  r.t = 0;
  r.patience = 99;
  pressAt(game, r);
  assert.equal(r.state, 'ask', 'no power while blown');
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  pressAt(game, 'fuse');
  assert.equal(game.blown, false);
  pressAt(game, r);
  assert.equal(r.state, 'lit');
});

test('plugsocketswift: three lamps are safe', () => {
  const game = create(env(1));
  game.spawnT = 99;
  for (const r of game.rooms.slice(0, 3)) {
    r.state = 'sleep';
    r.t = 0;
  }
  for (let i = 0; i < 60 * 20; i++) game.update(1 / 60, blank());
  assert.equal(game.blown, false);
  assert.equal(game.heat, 0);
});

test('plugsocketswift: a window left asking gives up', () => {
  const game = create(env(1));
  game.spawnT = 99;
  const r = game.rooms[0];
  r.state = 'ask';
  r.t = 0;
  r.patience = 1;
  for (let i = 0; i < 70; i++) game.update(1 / 60, blank());
  assert.equal(r.state, 'dark');
  assert.equal(game.gaveUp, 1);
});

// ---------- the beak ----------

// Puts the tip of the Swift's drawn beak on a point (facing -1 left, 1
// right) and presses the action once, with the stick or with the pointer
// held on the Swift.
function beakAt(game, px, py, face = -1) {
  const [bx, by] = POSE_BEAK[game.pose()];
  game.face = face;
  game.x = px - (face > 0 ? -bx : bx);
  game.y = py - by;
  const b = game.beak();
  assert.ok(Math.abs(b.x - px) < 1e-6 && Math.abs(b.y - py) < 1e-6, 'beak placed');
}
function peck(game, px, py, face = -1, pointer = false) {
  beakAt(game, px, py, face);
  const p = pointer ? { pointer: { active: true, x: game.x, y: game.y, down: true, pressed: true, released: false } } : {};
  game.update(1 / 60, blank({ action: true, actionPressed: true, ...p }));
  game.update(1 / 60, blank({ actionReleased: true, ...p }));
}
const asking = (r) => Object.assign(r, { state: 'ask', t: 0, patience: 99, readT: 99 });

test('plugsocketswift: the beak tip offsets are the pose sheet as measured, mirrored when facing right', () => {
  // flying, plugging in, singed: beak tip from the socket, at the drawn scale
  const want = [[-75.1, -59.6], [-87.1, 43.4], [-80.4, -45.6]];
  POSE_BEAK.forEach(([x, y], i) => {
    assert.ok(Math.abs(x - want[i][0]) < 0.1 && Math.abs(y - want[i][1]) < 0.1, `pose ${i}: ${x}, ${y}`);
  });
  const game = create(env(1));
  game.x = 800;
  game.y = 500;
  game.face = 1;
  assert.ok(Math.abs(game.beak().x - (800 + 75.146)) < 0.01);
  game.face = -1;
  assert.ok(Math.abs(game.beak().x - (800 - 75.146)) < 0.01);
});

test('plugsocketswift: the beak on a request bubble plugs the lamp in; just outside it does not', () => {
  for (const pointer of [false, true]) {
    const game = create(env(1));
    game.spawnT = 99;
    const r = asking(game.rooms[2]); // top row, (890, 320); its bubble at (890, 220)
    // the bubble's upper right edge, with the body clear of this window
    peck(game, r.x + 35, r.y - 100 - 30, -1, pointer);
    assert.notEqual(game.targetAt(game.x, game.y), r, 'the socket is not at this window');
    assert.equal(r.state, 'lit', `beak on the bubble (pointer ${pointer})`);

    const game2 = create(env(1));
    game2.spawnT = 99;
    const r2 = asking(game2.rooms[2]);
    peck(game2, r2.x + 43, r2.y - 100 - 43, -1, pointer); // 61 from its centre
    assert.equal(r2.state, 'ask', `beak just off the bubble (pointer ${pointer})`);
  }
});

test('plugsocketswift: the beak on a window pane unplugs a sleeper; just outside it does not', () => {
  const game = create(env(1));
  game.spawnT = 99;
  const r = game.rooms[0]; // (530, 320)
  r.state = 'sleep';
  peck(game, r.x - 85, r.y, 1); // the pane's left edge, flying in from the left
  assert.equal(game.targetAt(game.x, game.y), null, 'the socket touches nothing');
  assert.equal(r.state, 'dark');

  const game2 = create(env(1));
  game2.spawnT = 99;
  const r2 = game2.rooms[0];
  r2.state = 'sleep';
  peck(game2, r2.x - 100, r2.y, 1);
  assert.equal(r2.state, 'sleep');
});

test('plugsocketswift: the beak on the fuse switch flips it back; just beside the box it does not', () => {
  for (const pointer of [false, true]) {
    const game = create(env(1));
    game.spawnT = 99;
    game.blown = true;
    game.blownT = 1;
    // the blown switch's handle as painted: (250, 375) in its cell, so
    // (255 + 52 * 0.475, 600 + 91 + 119 * 0.475) on screen
    peck(game, 280, 747, -1, pointer);
    assert.equal(game.targetAt(game.x, game.y), null, 'the socket is below the box');
    assert.equal(game.blown, false, `beak on the switch (pointer ${pointer})`);

    const game2 = create(env(1));
    game2.spawnT = 99;
    game2.blown = true;
    game2.blownT = 1;
    peck(game2, game2.fuse.x + 125, game2.fuse.y, -1, pointer);
    assert.equal(game2.blown, true, `beak beside the box (pointer ${pointer})`);
  }
  // the top of the box, the FUSE card, counts too
  const game3 = create(env(1));
  game3.blown = true;
  game3.blownT = 1;
  peck(game3, 255, 450, 1);
  assert.equal(game3.blown, false);
});

test('plugsocketswift: a tap on a far request bubble sends the Swift there to plug it in', () => {
  const game = create(env(1));
  game.spawnT = 99;
  const r = asking(game.rooms[11]); // (1070, 674), bubble at (1070, 574)
  game.x = 600;
  game.y = 300;
  const p = { active: true, x: r.x, y: r.y - 100, down: true, pressed: true, released: false };
  game.update(1 / 60, blank({ action: true, actionPressed: true, pointer: p }));
  assert.equal(game.pending, r);
  for (let i = 0; i < 120 && r.state === 'ask'; i++) game.update(1 / 60, blank({ pointer: { ...p, pressed: false } }));
  assert.equal(r.state, 'lit');
});
