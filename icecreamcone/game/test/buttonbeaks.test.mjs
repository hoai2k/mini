import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../src/games/buttonbeaks.js';
import entry from '../src/more/buttonbeaks.js';
import { run, env, blank } from './harness.mjs';

const pass = entry.pass;

// A tailor: takes the coat furthest along the line that still has an open
// hole it can reach, fetches that button and tosses it up under the coat.
// `skill` 0..1 sets its speed, how long it looks, and how often it picks up
// a look-alike by mistake (below 0, slower and sloppier still).
function tailor(skill = 1, seed = 1) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  let plan = null; // { coat, hole, bowl }
  let thinkUntil = 0;
  let pressed = false;
  const speed = 0.45 + 0.55 * skill;
  return (game, t) => {
    if (pressed) {
      pressed = false;
      return {};
    }
    if (game.daze > 0 || t < thinkUntil) return {};
    const reachable = (coat) => coat.x - 60 > 140 + (Math.abs(coat.x - game.x) + 600) * 0.12;
    if (game.holding === null) {
      if (!plan || plan.hole.sewn || !game.coats.includes(plan.coat) || !reachable(plan.coat)) {
        const coats = game.coats.filter((c) => c.x < 1500 && reachable(c) && c.holes.some((h) => !h.sewn)).sort((a, b) => a.x - b.x);
        const coat = coats[0];
        if (!coat) return { x: (800 - game.x) / 300 };
        const hole = coat.holes.find((h) => !h.sewn);
        let bowl = hole.kind;
        if (rnd() > 0.88 + 0.12 * skill) bowl = (bowl + 4) % game.bowls === bowl ? (bowl + 1) % game.bowls : (bowl + 4) % game.bowls;
        if (bowl >= game.bowls) bowl = hole.kind;
        plan = { coat, hole, bowl };
        thinkUntil = t + (1 - skill) * 0.9 + 0.25;
        return {};
      }
      const d = game.bowlX(plan.bowl) - game.x;
      if (Math.abs(d) < 30) {
        pressed = true;
        return { action: true };
      }
      return { x: Math.max(-1, Math.min(1, d / 50)) * speed };
    }
    // holding: find a coat that wants this button
    const coats = game.coats.filter((c) => c.x > 160 && c.x < 1520 && c.holes.some((h) => !h.sewn && h.kind === game.holding)).sort((a, b) => a.x - b.x);
    const coat = coats[0];
    if (!coat) {
      // nobody wants it: toss it away where no coat is overhead
      plan = null;
      if (!game.coatAbove()) {
        pressed = true;
        return { action: true };
      }
      return { x: 1 };
    }
    const d = coat.x - 40 - game.x;
    if (Math.abs(d) < 40) {
      pressed = true;
      plan = null;
      return { action: true };
    }
    return { x: Math.max(-1, Math.min(1, d / 50)) * speed };
  };
}

// Walking up and down pressing all the time.
const masher = () => {
  let d = 1;
  return (game, t) => {
    if (game.x > 1300) d = -1;
    if (game.x < 300) d = 1;
    return { x: d * 0.7, action: Math.floor(t * 4) % 2 === 0 };
  };
};

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const BOTS = {
  idle: () => () => ({}),
  mash: () => masher(),
  clumsy: (seed) => tailor(-0.15, seed), // slower to walk and to look, picks look-alikes more
  medium: (seed) => tailor(0.3, seed), // the old beginner
  good: (seed) => tailor(1, seed),
};
const TABLE = {};
for (const level of ['easier', 'normal', 'harder']) {
  TABLE[level] = {};
  for (const [name, bot] of Object.entries(BOTS)) TABLE[level][name] = SEEDS.map((seed) => run(create, { seed, bot: bot(seed), difficulty: level }).game.score);
}
const passRate = (a) => a.filter((s) => s >= pass).length / a.length;
console.log(`buttonbeaks pass ${pass}`);
for (const [level, row] of Object.entries(TABLE)) console.log(level, Object.entries(row).map(([n, a]) => `${n} ${Math.round(mean(a))} [${Math.min(...a)}-${Math.max(...a)}] ${Math.round(passRate(a) * 100)}%`).join(' · '));

test('buttonbeaks: at Normal a medium tailor passes, a good one more; mashing and idling do not', () => {
  const t = TABLE.normal;
  assert.ok(passRate(t.medium) >= 0.75, `medium ${t.medium}`);
  assert.ok(mean(t.good) > mean(t.medium) * 1.15, `good ${t.good}`);
  assert.ok(passRate(t.clumsy) < 0.5, `clumsy ${t.clumsy}`);
  for (const n of ['idle', 'mash']) assert.ok(Math.max(...t[n]) < pass, `${n} ${t[n]}`);
});

test('buttonbeaks: Easier lets a clumsy tailor pass; mashing and idling still do not', () => {
  const t = TABLE.easier;
  assert.ok(passRate(t.clumsy) >= 0.75, `clumsy ${t.clumsy}`);
  assert.ok(passRate(t.clumsy) > passRate(TABLE.normal.clumsy), `clumsy at Normal ${TABLE.normal.clumsy}`);
  for (const n of ['idle', 'mash']) assert.ok(Math.max(...t[n]) < pass, `${n} ${t[n]}`);
});

test('buttonbeaks: Harder ends hard: the good tailor scores clearly more than the medium one', () => {
  const t = TABLE.harder;
  assert.ok(mean(t.good) > mean(t.medium) * 1.5, `good ${mean(t.good)} vs medium ${mean(t.medium)}`);
  assert.ok(mean(t.clumsy) < mean(TABLE.normal.clumsy), `clumsy ${mean(t.clumsy)} vs Normal ${mean(TABLE.normal.clumsy)}`);
});

// The round starts gentle and ends harder, read from the coats the line
// actually brings: early coats have fewer holes, come slower and use fewer
// kinds of button than late ones. Third by third from its own knobs, the
// first third stays gentle.
test('buttonbeaks: the line starts gentle and ends harder', () => {
  const game = create(env(3));
  const seen = new Set(game.coats);
  const early = [];
  const late = [];
  const knobs = () => ({ speed: game.lineSpeed(), gap: game.coatGap(), holes: game.holesMean() });
  const looks = [knobs()];
  const bowls0 = game.bowls;
  for (let i = 0; i < 45 * 60 && !game.done; i++) {
    game.update(1 / 60, blank());
    if (i === 15 * 60 || i === 30 * 60 || i === 45 * 60 - 1) looks.push(knobs());
    for (const c of game.coats) {
      if (seen.has(c)) continue;
      seen.add(c);
      (game.elapsed < 15 ? early : game.elapsed > 30 ? late : []).push(c);
    }
  }
  const holes = (a) => a.reduce((s, c) => s + c.holes.length, 0) / a.length;
  const kinds = (a) => Math.max(...a.flatMap((c) => c.holes.map((h) => h.kind))) + 1;
  console.log('buttonbeaks ramp', { early: [early.length, holes(early), kinds(early)], late: [late.length, holes(late), kinds(late)], looks, bowls: [bowls0, game.bowls] });
  assert.ok(holes(early) < 1.3 && holes(late) >= 1.5, 'one hole a coat at first, two or three by the end');
  assert.ok(kinds(early) <= 4 && kinds(late) > 4, 'look-alike buttons only later');
  assert.ok(looks[3].speed > looks[0].speed * 1.6, 'the line speeds up');
  assert.ok(late.length > early.length, 'coats come thicker');
  for (let i = 1; i < looks.length; i++) {
    const [x, y] = [looks[i - 1], looks[i]];
    assert.ok(x.speed < y.speed && x.gap > y.gap && x.holes < y.holes, `third ${i} is harder than the one before`);
  }
  assert.ok(looks[1].speed - looks[0].speed < (looks[3].speed - looks[0].speed) / 3, 'the first third stays on the gentle side');
  // Easier never brings the look-alikes; Harder has them from the start.
  assert.equal(create(env(1, { difficulty: 'harder' })).bowls, 6);
  const easy = create(env(1, { difficulty: 'easier' }));
  for (let i = 0; i < 45 * 60 && !easy.done; i++) easy.update(1 / 60, blank());
  assert.equal(easy.bowls, 4);
});

test('buttonbeaks: the matching button sews into its hole', () => {
  const game = create(env(1));
  const coat = game.coats[0];
  const hole = coat.holes[0];
  game.x = game.bowlX(hole.kind);
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.holding, hole.kind);
  game.x = coat.x;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  assert.equal(game.holding, null);
  for (let i = 0; i < 30; i++) game.update(1 / 60, blank());
  assert.ok(hole.sewn);
  assert.equal(game.score, 1);
});

test('buttonbeaks: a button that matches nothing bounces off and dazes them', () => {
  const game = create(env(1));
  const coat = game.coats[0];
  const kind = [0, 1, 2, 3].find((k) => !coat.holes.some((h) => h.kind === k));
  game.x = game.bowlX(kind);
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  game.x = coat.x;
  game.update(1 / 60, blank({ action: true, actionPressed: true }));
  for (let i = 0; i < 20; i++) game.update(1 / 60, blank());
  assert.equal(game.score, 0);
  assert.equal(game.wrong, 1);
  assert.ok(game.daze > 0);
  assert.ok(coat.holes.every((h) => !h.sewn));
});

test('buttonbeaks: more bowls, and coats with more holes, later on', () => {
  const game = create(env(2));
  assert.equal(game.bowls, 4);
  for (let i = 0; i < 60 * 40; i++) game.update(1 / 60, blank());
  assert.equal(game.bowls, 6);
  // three holes on a coat by the end at Harder
  const hard = create(env(2, { difficulty: 'harder' }));
  let most = 0;
  for (let i = 0; i < 60 * 45 && !hard.done; i++) {
    hard.update(1 / 60, blank());
    for (const c of hard.coats) most = Math.max(most, c.holes.length);
  }
  assert.equal(most, 3);
});

// The pair are one size whatever they do: standing (their portrait), holding
// a button up, tossing it, striding, pecking, dazed and cheering, measured
// against how big each picture is painted (design/source/pose-scales.json).
test('buttonbeaks: every painted pose shows the pair the same size', async () => {
  const { withArt, shownSizes, sizeCheck } = await import('./sprite-rig.mjs');
  await import('../src/subjects.js');
  const undo = withArt();
  try {
    const game = create(env(1));
    const at = (o) => (gm) => Object.assign(gm, { tossT: 0, pickT: 0, daze: 0, cheerT: 0, holding: null, moving: false }, o);
    const sizes = shownSizes(game, 'buttonbeaks', {
      standing: at({}),
      holding: at({ holding: 0 }),
      tossing: at({ tossT: 0.2 }),
      striding: at({ moving: true }),
      pecking: at({ pickT: 0.2 }),
      dazed: at({ daze: 0.5 }),
      cheering: at({ cheerT: 0.4 }),
    }, ['subject.buttonbeaks', 'sprites.buttonbeaksToss', 'sprites.buttonbeaksPoses']);
    const { fails, table } = sizeCheck(sizes, 'standing');
    console.log('buttonbeaks pose sizes', table);
    assert.equal(Object.keys(table).length, 7, 'each pose drew one picture');
    assert.deepEqual(fails, []);
  } finally {
    undo();
  }
});
