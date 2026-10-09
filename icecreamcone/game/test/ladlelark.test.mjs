import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/ladlelark.js';
import bird from '../src/more/ladlelark.js';
import { run, env, blank } from './harness.mjs';

const pass = bird.pass;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// What a dip at (u, v), `ahead` seconds from now, would bring up: how many
// wanted bits, and how many unwanted (the boot counts as many).
function scoopAt(game, u, v, ahead, margin) {
  const need = { ...game.needs() };
  let got = 0;
  let bad = 0;
  for (const b of game.bits) {
    const [bu, bv] = game.where(b, ahead);
    if (Math.hypot(bu - u, bv - v) < game.ring + margin) {
      if (b.kind === 'boot') bad += 9;
      else if (!need[b.kind]) bad++;
      else {
        need[b.kind]--;
        got++;
      }
    }
  }
  return { got, bad };
}
const clean = (game, u, v, ahead, margin) => {
  const s = scoopAt(game, u, v, ahead, margin);
  return s.bad ? 0 : s.got;
};

// A cook: picks a wanted bit with nothing unwanted near it, follows it round
// the pot, and dips just ahead of it. `skill` slows the hand, forgets to lead,
// checks less carefully and sometimes dips in a hurry.
function cook(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let pressed = false;
  let target = null;
  let rest = 0;
  let last = 0;
  return (game, t) => {
    if (pressed) {
      pressed = false;
      rest = t + (skill >= 1 ? 0 : 0.6); // a beginner looks to see what came up
      return {};
    }
    if (game.dipT > 0 || t < rest) return {};
    const need = game.needs();
    const ahead = skill >= 1 ? game.scoopIn : 0;
    const margin = skill >= 1 ? 0.01 : 0;
    // where to dip: on a wanted bit, or (a good cook) between two of them
    const spots = [];
    const want = game.bits.filter((b) => need[b.kind]);
    for (const b of want) spots.push({ b, p: game.where(b, ahead) });
    if (skill >= 1) {
      for (let i = 0; i < want.length; i++) {
        for (let j = i + 1; j < want.length; j++) {
          const p = game.where(want[i], ahead);
          const q = game.where(want[j], ahead);
          if (Math.hypot(p[0] - q[0], p[1] - q[1]) < game.ring * 1.6) spots.push({ b: want[i], p: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], pair: want[j] });
        }
      }
    }
    for (const s of spots) {
      s.d = Math.hypot(s.p[0] - game.u, s.p[1] - game.v);
      s.n = clean(game, s.p[0], s.p[1], ahead, margin);
      s.value = s.n ? s.n - s.d * (skill >= 1 ? 1.2 : 0.5) : -10 - s.d;
    }
    spots.sort((a, b) => b.value - a.value);
    let o = spots[0];
    // stick to the spot already chosen unless it is spoilt or another is much better
    const keep = target && spots.find((s) => s.b === target.b && s.pair === target.pair);
    if (keep && (skill < 1 || (keep.n > 0 && keep.value > o.value - 0.6))) o = keep;
    if (o) {
      target = { b: o.b, pair: o.pair };
      o.ok = o.n > 0;
    }
    if (!o) return {};
    const du = o.p[0] - game.u;
    const dv = o.p[1] - game.v;
    const close = Math.hypot(du, dv) < (skill >= 1 ? 0.05 : 0.09);
    // a good cook that has waited long for a clean dip takes the one unwanted bit it's allowed
    const fed = skill >= 1 && t - last > 3 && !game.cust.extras;
    // (a good cook checks the ring where it actually is)
    const here = scoopAt(game, game.u, game.v, ahead, 0.005);
    const ok = skill >= 1 ? here.got > 0 && (here.bad === 0 || (fed && here.bad === 1)) : o.ok;
    if (close && (ok || rnd() < (skill >= 1 ? 0 : 0.03))) {
      pressed = true;
      last = t;
      target = null;
      return { action: true };
    }
    const sp = 0.45 + 0.55 * skill;
    // a good cook moves with the swirl as well as towards the bit
    const p0 = game.where(o.b, ahead);
    const q = game.where(o.b, ahead + 0.05);
    const fu = skill >= 1 ? ((q[0] - p0[0]) / 0.05) * (400 / 640) : 0;
    const fv = skill >= 1 ? ((q[1] - p0[1]) / 0.05) * (150 / 640) : 0;
    return { x: clamp(fu + du * 12, -1, 1) * sp, y: clamp(fv + dv * 5, -1, 1) * sp };
  };
}

// Mashing: dip as fast as possible, from the middle or wandering about.
const masher = (seed, still) => {
  let r = seed * 31;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let d = [0, 0];
  return (game, t) => {
    if (rnd() < 0.03) d = [rnd() * 2 - 1, rnd() * 2 - 1];
    return { x: still ? 0 : d[0], y: still ? 0 : d[1], action: Math.floor(t * 6) % 2 === 0 };
  };
};

// Dips at the nearest wanted bit without looking at what's round it.
const grabber = () => {
  let pressed = false;
  return (game) => {
    if (pressed || game.dipT > 0) {
      pressed = false;
      return {};
    }
    const need = game.needs();
    const b = game.bits.filter((b) => need[b.kind]).map((b) => game.where(b)).sort((a, c) => Math.hypot(a[0] - game.u, a[1] - game.v) - Math.hypot(c[0] - game.u, c[1] - game.v))[0];
    if (!b) return {};
    const du = b[0] - game.u;
    const dv = b[1] - game.v;
    if (Math.hypot(du, dv) < 0.1) {
      pressed = true;
      return { action: true };
    }
    return { x: clamp(du * 10, -1, 1), y: clamp(dv * 4, -1, 1) };
  };
};

test('ladlelark: a beginner opens the next page, a good cook more; idle and mashing do not', () => {
  const seeds = [1, 2, 3, 4, 5, 6];
  const beginner = seeds.map((seed) => run(create, { seed, bot: cook(0.4, seed) }).game.score);
  const good = seeds.map((seed) => run(create, { seed, bot: cook(1, seed) }).game.score);
  const mash = seeds.map((seed) => run(create, { seed, bot: masher(seed, false) }).game.score);
  const still = seeds.map((seed) => run(create, { seed, bot: masher(seed, true) }).game.score);
  const grab = seeds.map((seed) => run(create, { seed, bot: grabber() }).game.score);
  const idle = run(create, { seed: 1 }).game.score;
  console.log('ladlelark beginner', `${beginner}`, 'good', `${good}`, 'grab', `${grab}`, 'mash', `${mash}`, 'still', `${still}`, 'idle', idle, 'pass', pass);
  assert.equal(idle, 0);
  assert.ok(Math.min(...beginner) >= pass, `beginner ${beginner}`);
  assert.ok(mean(good) > mean(beginner) + 3, `good ${good}`);
  assert.ok(mean(grab) < mean(good), `grabbing ${grab}`);
  assert.ok(Math.max(...mash) < pass, `mashing must not open the next page: ${mash}`);
  assert.ok(Math.max(...still) < pass, `dipping on the spot must not open the next page: ${still}`);
});

// A pot holding just these bits (at angle a, radius r), the swirl stopped.
function pot(order, bits) {
  const game = create(env(1));
  game.update(1 / 60, blank());
  game.cust.order = order;
  game.cust.got = {};
  game.bits = bits.map(([kind, a, r]) => ({ kind, a, r, w: 0, ph: 0, drift: 0, born: 1 }));
  game.refill = [];
  return game;
}
function dipAt(game, u, v) {
  game.u = u;
  game.v = v;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 40; i++) {
    game.u = u;
    game.v = v;
    game.update(1 / 60, blank());
  }
}

test('ladlelark: a dip takes what is in the ring; just what was asked scores three, four when quick', () => {
  const game = pot({ carrot: 2 }, [['carrot', 0, 0.5], ['carrot', 0.1, 0.5], ['pea', Math.PI, 0.5]]);
  game.cust.t = game.cust.patience * 0.5;
  dipAt(game, 0.5, 0.03);
  assert.equal(game.score, 3);
  assert.equal(game.served, 1);
  assert.equal(game.bits.length, 1, 'the pea stays in the pot');
  const quick = pot({ pea: 1 }, [['pea', 0, 0.5]]);
  dipAt(quick, 0.5, 0);
  assert.equal(quick.score, 4);
});

test('ladlelark: one unwanted bit is forgiven (one point); a second is "Yuck!"', () => {
  const one = pot({ carrot: 1 }, [['carrot', 0, 0.5], ['pea', 0.08, 0.5]]);
  dipAt(one, 0.5, 0.02);
  assert.equal(one.score, 1);
  const two = pot({ carrot: 1 }, [['pea', 0, 0.5], ['pea', 0.08, 0.5], ['carrot', Math.PI, 0.5]]);
  two.score = 5;
  dipAt(two, 0.5, 0.02);
  assert.equal(two.yucks, 1);
  assert.equal(two.score, 4, 'a "Yuck!" costs one');
});

test('ladlelark: the old boot is always "Yuck!"', () => {
  const game = pot({ carrot: 2 }, [['carrot', 0, 0.5], ['boot', 0.05, 0.5]]);
  dipAt(game, 0.5, 0.02);
  assert.equal(game.yucks, 1);
  assert.equal(game.score, 0);
});

test('ladlelark: an empty dip does nothing, and a creature kept waiting leaves', () => {
  const game = pot({ pea: 1 }, [['pea', Math.PI, 0.5]]);
  dipAt(game, 0.5, 0);
  assert.equal(game.cust.bowl.length, 0);
  game.cust.patience = game.cust.t + 0.1;
  for (let i = 0; i < 20; i++) game.update(1 / 60, blank());
  assert.equal(game.walked, 1);
});
