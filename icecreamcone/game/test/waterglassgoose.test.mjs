import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/waterglassgoose.js';
import entry from '../src/more/waterglassgoose.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A listener: remembers the tune, but each note it plays back may slip to a
// wrong glass, more often the longer the tune (`slip` per note of length).
// It takes `react` seconds before each tap and steps with the stick.
function listener({ slip = 0, react = 0.3, seed = 1 } = {}) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let want = null;
  let ready = 0;
  let pos = -1;
  let round = -1;
  return (game, t) => {
    if (game.phase !== 'play') return {};
    if (game.pos !== pos || game.round !== round) {
      pos = game.pos;
      round = game.round;
      want = game.tune[pos];
      if (rnd() < slip * game.tune.length) want = (want + 1 + Math.floor(rnd() * (game.glasses.length - 1))) % game.glasses.length;
      ready = t + react;
    }
    if (game.sel !== want) {
      const flip = Math.floor(t * 60) % 2 === 0;
      return { x: flip ? Math.sign(want - game.sel) : 0 };
    }
    return { action: t >= ready && Math.floor(t * 60) % 2 === 0 };
  };
}

// Taps any glass, as fast as it can, moving about.
const masher = (game, t) => ({ x: Math.sin(t * 3), action: Math.floor(t * 60) % 6 < 3 });

test('waterglassgoose: a beginner opens the next page, a good ear more; idling and mashing do not', () => {
  const seeds = [1, 2, 3, 4, 5, 6];
  const beginner = seeds.map((seed) => run(create, { seed, bot: listener({ slip: 0.035, react: 0.6, seed }) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: listener({ slip: 0.008, react: 0.4, seed }) }).game.score);
  const perfect = run(create, { seed: 1, bot: listener() }).game;
  const mash = [1, 2, 3].map((seed) => run(create, { seed, bot: masher }).game.score);
  const idle = run(create, { seed: 1 }).game;
  console.log('waterglassgoose beginner', beginner, 'good', good, 'perfect', perfect.score, 'mash', mash, 'idle', idle.score, 'pass', pass);
  assert.equal(idle.score, 0);
  assert.ok(idle.done);
  assert.equal(perfect.tunes, 8);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((x, y) => x + y) / a.length;
  assert.ok(avg(good) > avg(beginner) + 5, `good ${good}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
});

// The concert starts gentle and ends harder: read each tune as it is played,
// the first three are short, on few glasses and slow; the last are long and quick.
test('waterglassgoose: the tunes start gentle and end harder', () => {
  const tunes = [];
  run(create, {
    seed: 4,
    bot: (() => {
      const b = listener();
      return (game, t) => {
        if (game.phase === 'play' && tunes.length === game.round) tunes.push({ len: game.tune.length, glasses: game.glasses.length, gap: game.noteGap() });
        return b(game, t);
      };
    })(),
  });
  console.log('waterglassgoose ramp', tunes);
  assert.equal(tunes.length, 8);
  const first = tunes.slice(0, 3);
  const last = tunes.slice(-2);
  assert.ok(Math.max(...first.map((x) => x.len)) < Math.min(...last.map((x) => x.len)) / 2, 'early tunes are much shorter');
  assert.ok(Math.max(...first.map((x) => x.glasses)) < Math.min(...last.map((x) => x.glasses)), 'early tunes use fewer glasses');
  assert.ok(Math.min(...first.map((x) => x.gap)) > Math.max(...last.map((x) => x.gap)) * 1.5, 'early tunes are played slower');
  for (let i = 1; i < tunes.length; i++) assert.ok(tunes[i].len >= tunes[i - 1].len && tunes[i].gap <= tunes[i - 1].gap, 'never easier than the tune before');
});

// Plays until it is the player's turn.
function toPlay(game) {
  for (let i = 0; i < 60 * 20 && game.phase !== 'play'; i++) game.update(1 / 60, blank());
}
const tapAt = (game, i) => {
  game.sel = i;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  game.update(1 / 60, blank());
};

test('waterglassgoose: the right glasses in order score a point each and a bonus for the tune', () => {
  const game = create(env(2));
  toPlay(game);
  const tune = [...game.tune];
  for (const k of tune) tapAt(game, k);
  // each note after the first follows straight on: one extra each
  assert.equal(game.score, tune.length + (tune.length - 1) + 3);
  assert.equal(game.quick, tune.length - 1);
  assert.equal(game.tunes, 1);
  assert.equal(game.phase, 'good');
});

test('waterglassgoose: a wrong glass cracks it and ends the tune; three cracks end the concert', () => {
  const game = create(env(3));
  for (let c = 1; c <= 3; c++) {
    toPlay(game);
    tapAt(game, (game.tune[0] + 1) % game.glasses.length);
    assert.equal(game.cracks, c);
    assert.equal(game.phase, 'oops');
  }
  for (let i = 0; i < 60 * 4; i++) game.update(1 / 60, blank());
  assert.ok(game.done);
  assert.equal(game.score, 0);
});

test('waterglassgoose: a right note after a pause scores no quick bonus', () => {
  const game = create(env(7));
  toPlay(game);
  tapAt(game, game.tune[0]);
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  tapAt(game, game.tune[1]);
  assert.equal(game.quick, 0);
  assert.ok(game.score >= 2);
});

test('waterglassgoose: waiting too long counts as a crack', () => {
  const game = create(env(4));
  toPlay(game);
  for (let i = 0; i < 60 * 5.2; i++) game.update(1 / 60, blank());
  assert.equal(game.cracks, 1);
});

test('waterglassgoose: the pointer picks the glass under it, and the stick steps one at a time', () => {
  const game = create(env(5));
  toPlay(game);
  const x = game.glassX(2);
  game.update(1 / 60, blank({ pointer: { active: true, x, y: 500, down: false, pressed: false } }));
  assert.equal(game.sel, 2);
  game.update(1 / 60, blank({ x: -1 }));
  assert.equal(game.sel, 1);
  game.update(1 / 60, blank({ x: -1 }));
  assert.equal(game.sel, 1); // held: waits before repeating
});

// The Goose is one size whatever it does: standing (its portrait), tapping,
// honking, walking and recoiling, measured against how big each picture is
// painted (design/source/pose-scales.json).
test('waterglassgoose: every painted pose shows the Goose the same size', async () => {
  const { withArt, shownSizes, sizeCheck } = await import('./sprite-rig.mjs');
  await import('../src/subjects.js');
  const undo = withArt();
  try {
    const game = create(env(1));
    const at = (o) => (gm) => {
      Object.assign(gm, { tap: 0, phase: 'play', pt: 2, gx: gm.glassX(gm.sel) + 170 }, o);
    };
    const sizes = shownSizes(game, 'waterglassgoose', {
      standing: at({}),
      tapping: at({ tap: 1 }),
      honking: at({ phase: 'good' }),
      walking: at({ gx: game.glassX(game.sel) + 400 }),
      recoiling: at({ phase: 'oops', pt: 0.2 }),
    }, ['subject.waterglassgoose', 'sprites.gooseTap', 'sprites.gooseMoves']);
    const { fails, table } = sizeCheck(sizes, 'standing');
    console.log('waterglassgoose pose sizes', table);
    assert.equal(Object.keys(table).length, 5, 'each pose drew one picture');
    assert.deepEqual(fails, []);
  } finally {
    undo();
  }
});
