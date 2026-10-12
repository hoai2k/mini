import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/radiobird.js';
import entry from '../src/more/radiobird.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A listener at the dial: goes to the pencil mark if the station asked for
// is marked (and it remembers), otherwise sweeps through the static; when a
// station's picture comes in it lets go of the stick, and if it is the one
// asked for, presses to play it once the needle has settled. `skill` slows
// the sweep and the reactions, makes it overshoot, sometimes press on the
// wrong station, and forget the marks.
function tuner(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let dir = 1;
  let asked = -1;
  let remember = true;
  let wait = 0; // reaction time before pressing
  let coast = 0; // overshoot: keeps sweeping a moment after a station comes in
  let pressed = false;
  return (game) => {
    if (game.asked !== asked) {
      asked = game.asked;
      remember = rnd() < 0.3 + 0.7 * skill;
      wait = 0;
    }
    if (pressed) {
      pressed = false;
      return {};
    }
    if (game.locked) return {};
    const tuned = game.tuned();
    if (coast > 0) {
      coast -= 1 / 60;
      return { x: dir * (0.55 + 0.45 * skill) };
    }
    if (tuned >= 0 && game.near(tuned) > 0.6) {
      if (tuned === game.want || rnd() < (1 - skill) * 0.01) {
        if (wait <= 0) wait = 0.15 + (1 - skill) * 0.6 * rnd();
        wait -= 1 / 60;
        if (wait <= 0) {
          pressed = true;
          return { action: true };
        }
        return {};
      }
    }
    const memo = game.marks[game.want];
    if (remember && memo !== undefined && Math.abs(memo - game.n) > 0.01) {
      const d = memo - game.n;
      dir = Math.sign(d);
      return { x: Math.sign(d) * Math.min(1, Math.sqrt(Math.abs(d) * 8)) };
    }
    if (game.n >= 0.995) dir = -1;
    if (game.n <= 0.005) dir = 1;
    // a beginner's hand sometimes runs on past a station
    if (tuned < 0 && game.near(game.nearest()) > 0.5 && rnd() < (1 - skill) * 0.05) coast = 0.3;
    return { x: dir * (0.55 + 0.45 * skill) };
  };
}

const sweepWith = (speed, press) => {
  let dir = 1;
  let n = 0;
  return (game) => {
    if (game.n >= 0.99) dir = -1;
    if (game.n <= 0.01) dir = 1;
    return { x: dir * speed, action: press && n++ % 2 === 0 };
  };
};

// Stops at every station it meets and presses, wanted or not.
const presser = () => {
  let dir = 1;
  let t = 0;
  return (game) => {
    if (game.locked) return {};
    if (game.n >= 0.99) dir = -1;
    if (game.n <= 0.01) dir = 1;
    if (game.tuned() >= 0 && game.near(game.tuned()) > 0.6) return { action: t++ % 2 === 0 };
    return { x: dir };
  };
};

test('radiobird: a beginner reaches the score, a good tuner well beyond; sweeping, mashing and idling do not', () => {
  const seeds = [1, 2, 3, 4, 5, 6];
  const beginner = seeds.map((seed) => run(create, { seed, bot: tuner(0.3, seed) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: tuner(1, seed) }).game.score);
  const sweep = [1, 2, 3].map((seed) => run(create, { seed, bot: sweepWith(1, false) }).game.score);
  const sweepMash = [1, 2, 3].map((seed) => run(create, { seed, bot: sweepWith(1, true) }).game.score);
  const creepMash = [1, 2, 3].map((seed) => run(create, { seed, bot: sweepWith(0.4, true) }).game.score);
  const press = [1, 2, 3].map((seed) => run(create, { seed, bot: presser() }).game.score);
  const idle = [1, 2, 3].map((seed) => run(create, { seed }).game.score);
  let rr = 5;
  const rnd = () => ((rr = (rr * 16807) % 2147483647) / 2147483647);
  const mash = [1, 2, 3].map((seed) => run(create, { seed, bot: () => ({ x: rnd() * 2 - 1, action: rnd() < 0.5, spin: rnd() - 0.5 }) }).game.score);
  console.log('radiobird beginner', beginner, 'good', good, 'sweep', sweep, 'sweep+mash', sweepMash, 'creep+mash', creepMash, 'press at every station', press, 'mash', mash, 'idle', idle, 'pass', pass);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(avg(good) > avg(beginner) * 1.3, `good ${good}`);
  for (const [name, xs] of Object.entries({ sweep, sweepMash, creepMash, mash, idle })) assert.ok(Math.max(...xs) < pass, `${name} ${xs}`);
  assert.ok(avg(press) < avg(good), `press ${press}`);
});

test('radiobird: stations start wide and nearly still, and end narrow and wandering', () => {
  const part = () => ({ width: [], move: [], finds: [] });
  const early = part();
  const late = part();
  for (const seed of [1, 2, 3]) {
    const bot = tuner(1, seed);
    let prev = null;
    let asked = 0;
    run(create, {
      seed,
      bot: (game, t) => {
        const p = game.elapsed / 50;
        const q = p < 1 / 3 ? early : p > 2 / 3 ? late : null;
        const f = game.stations.map((_, i) => game.freq(i));
        if (q) {
          q.width.push(game.width());
          // how far a station strays from its place on the dial
          game.stations.forEach((st, i) => q.move.push(Math.abs(f[i] - st.base)));
          if (game.asked !== asked && prev !== null) q.finds.push(prev);
        }
        asked = game.asked;
        prev = game.findT;
        return bot(game, t);
      },
    });
  }
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  assert.ok(mean(late.width) < mean(early.width) * 0.65, `station width early ${mean(early.width).toFixed(3)}, late ${mean(late.width).toFixed(3)}`);
  assert.ok(mean(late.move) > mean(early.move) * 2.5, `stations stray early ${mean(early.move).toFixed(4)}, late ${mean(late.move).toFixed(4)}`);
  assert.ok(mean(late.finds) > mean(early.finds), `a good tuner takes longer late: early ${mean(early.finds).toFixed(2)} s, late ${mean(late.finds).toFixed(2)} s`);
});

test('radiobird: pressing on the asked-for station plays its song; a quick find scores more', () => {
  const game = create(env(1));
  const want = game.want;
  game.n = game.freq(want);
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.ok(game.locked);
  for (let i = 0; i < 60 * 2.2; i++) game.update(1 / 60, blank());
  assert.ok(game.score >= 19, `quick find ${game.score}`);
  assert.notEqual(game.want, want, 'they ask for another');
  assert.ok(game.marks[want] !== undefined, 'the station is pencilled on the dial');
  const slow = create(env(1));
  for (let i = 0; i < 60 * 8; i++) slow.update(1 / 60, blank());
  slow.n = slow.freq(slow.want);
  slow.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 60 * 2.2; i++) slow.update(1 / 60, blank());
  assert.ok(slow.score >= 10 && slow.score < game.score, `slow find ${slow.score}`);
});

test('radiobird: just tuning in plays nothing; a wrong station grumbles; turning away loses the song', () => {
  const game = create(env(2));
  for (let i = 0; i < 60 * 4; i++) {
    game.n = game.freq(game.want);
    game.update(1 / 60, blank());
  }
  assert.equal(game.score, 0, 'no press, no song');
  const wrong = (game.want + 1) % 6;
  game.n = game.freq(wrong);
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.ok(!game.locked && game.grumble > 0);
  const g2 = create(env(2));
  g2.n = g2.freq(g2.want);
  g2.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 60; i++) g2.update(1 / 60, blank({ x: 1 }));
  assert.ok(!g2.locked && g2.score === 0, 'lost it');
});

test('radiobird: left alone near a station, the needle settles on it', () => {
  const game = create(env(1));
  const f = game.freq(0);
  game.n = f + 0.02;
  for (let i = 0; i < 60; i++) game.update(1 / 60, blank());
  assert.ok(Math.abs(game.n - game.freq(0)) < 0.006, `${game.n} vs ${game.freq(0)}`);
});

test('radiobird: with a pointer, letting go of the needle on the station plays it', () => {
  const game = create(env(3));
  const x = 590 + game.freq(game.want) * 880;
  const ptr = (down, extra = {}) => blank({ kind: 'pointer', action: down, pointer: { active: true, x, y: 200, down, pressed: false, released: !down }, ...extra });
  for (let i = 0; i < 40; i++) game.update(1 / 60, ptr(true));
  game.update(1 / 60, ptr(false, { actionReleased: true }));
  for (let i = 0; i < 20; i++) game.update(1 / 60, ptr(false));
  assert.ok(game.locked || game.score > 0);
});
