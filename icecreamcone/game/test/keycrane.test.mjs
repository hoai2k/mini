import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/keycrane.js';
import entry from '../src/more/keycrane.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// An operator, played like the keyboard: full left or right, let go in time
// to stop over the ring (tapping to fix a near miss), wait until the swing
// has settled to `settle` of the ring's catch width, drop, and carry the
// prize to the chute, easing off whenever it swings past `care`. `speed` is
// how far it pushes the stick.
function operator({ speed = 1, settle = 0.5, care = 0.45, pick = 'near' } = {}) {
  let pressed = false;
  let target = null;
  return (game) => {
    if (pressed) {
      pressed = false;
      return {};
    }
    if (game.state !== 'top') return {};
    if (game.carry) {
      target = null;
      const [fx] = game.foot();
      if (Math.abs(game.th) > care) return {};
      return { x: fx > 190 ? -speed : 0 };
    }
    if (!target || !game.prizes.includes(target) || target.falling) {
      const cands = game.prizes.filter((p) => !p.falling);
      if (!cands.length) return {};
      cands.sort((a, b) => (pick === 'gold' ? (b.golden - a.golden) * 1000 : 0) + Math.abs(a.x - game.x) - Math.abs(b.x - game.x));
      target = cands[0];
    }
    const [rx] = game.ring(target);
    const [fx] = game.foot();
    const d = rx - game.x;
    const stop = Math.abs(game.v) / 6;
    if (Math.abs(d) > stop + 5) return { x: Math.sign(d) * (Math.abs(d) < 50 ? 0.25 : speed) };
    if (Math.abs(game.v) > 30) return {};
    // the claws drift out further as the string lengthens: wait until still enough
    const swing = Math.abs(fx - rx) + Math.abs(game.om) * 400;
    if (swing < game.tolerance(target) * settle) {
      pressed = true;
      return { action: true };
    }
    return {};
  };
}

// Drops wherever it happens to be, as fast as it can, wandering about.
const masher = () => (game, t) => ({ x: Math.sin(t * 1.3) * 0.8, action: Math.floor(t * 8) % 2 === 0 });

test('keycrane: a beginner opens the next page, a good operator more; mashing and idling do not', () => {
  const beginner = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: operator({ speed: 0.6, settle: 0.4, care: 0.25 }) }).game.score);
  const good = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: operator({ speed: 1, settle: 1.8, care: 0.3, pick: 'gold' }) }).game.score);
  const mash = [1, 2, 3, 4].map((seed) => run(create, { seed, bot: masher() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('keycrane beginner', beginner, 'good', good, 'mash', mash, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(avg(good) > avg(beginner), `good ${good}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
});

test('keycrane: dropping straight onto a ring hooks the prize; the chute scores it', () => {
  const game = create(env(1));
  const p = game.prizes[0];
  game.x = p.x;
  game.th = 0;
  game.om = 0;
  game.update(1 / 60, blank({ actionPressed: true, action: true }));
  for (let i = 0; i < 120 && !game.carry; i++) game.update(1 / 60, blank());
  assert.equal(game.carry, p, 'hooked');
  for (let i = 0; i < 120 && game.state !== 'top'; i++) game.update(1 / 60, blank());
  // carry it over the chute, gently
  for (let i = 0; i < 600 && game.score === 0; i++) {
    const [fx] = game.foot();
    game.update(1 / 60, blank({ x: Math.abs(game.th) > 0.4 ? 0 : Math.max(-0.6, Math.min(0.6, (185 - fx) / 150)) }));
  }
  assert.ok(game.score >= 1, `score ${game.score}`);
});

test('keycrane: a swinging Crane misses the ring', () => {
  const game = create(env(1));
  const p = game.prizes[0];
  game.x = p.x;
  game.th = 0.5; // swinging hard
  game.update(1 / 60, blank({ actionPressed: true, action: true }));
  for (let i = 0; i < 120 && game.state !== 'up'; i++) game.update(1 / 60, blank());
  assert.equal(game.carry, null);
  assert.ok(game.misses >= 1);
});

test('keycrane: swinging too hard while carrying makes the prize slip', () => {
  const game = create(env(1));
  const p = game.prizes[0];
  game.prizes = game.prizes.filter((q) => q !== p);
  game.carry = p;
  game.state = 'top';
  game.L = 230;
  game.x = 900;
  // yank the trolley one way and the other, in time with the swing
  for (let i = 0; i < 300 && game.carry; i++) game.update(1 / 60, blank({ x: game.om > 0 ? -1 : 1 }));
  assert.equal(game.carry, null);
  assert.equal(game.slips, 1);
});

test('keycrane: rings get smaller as time goes on', () => {
  const game = create(env(3));
  const early = Math.max(...game.prizes.map((p) => p.ringR));
  game.elapsed = 40;
  // force a respawn
  game.respawn.push(0);
  game.prizes.length = 3;
  game.update(1 / 60, blank());
  const late = game.prizes[game.prizes.length - 1];
  assert.ok(late.ringR < early, `${late.ringR} < ${early}`);
});
