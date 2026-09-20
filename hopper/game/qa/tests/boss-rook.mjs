// The Night Rook, the first board's commander. See src/game/combat.ts.
//
// The fight is built around turning its own shots back into it: its wings come
// up on a cycle and a beam that meets the lit ribcage comes straight back,
// while a reflected shot hurts it far more than anything Hopper throws. It also
// works the width of its arena rather than hanging over the middle.
import assert from 'node:assert/strict';
import { CombatWorld, chestOf } from '../../src/game/combat.ts';
import { buildLevel } from '../../src/game/levels.ts';
// renderer.ts imports its siblings without a file extension, which Node's own
// resolver will not take, so it is transpiled into place the way the camera
// test transpiles the engine.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const ts = createRequire(import.meta.url)('typescript'),
  temp = fs.mkdtempSync('/tmp/hopper-rook-'),
  src = new URL('../../src/game/', import.meta.url).pathname;
fs.writeFileSync(
  temp + '/renderer.mjs',
  ts.transpileModule(
    fs
      .readFileSync(src + 'renderer.ts', 'utf8')
      .replace(/from '\.\/(levels|hopper-animation)'/g, `from '${src}$1.ts'`),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    },
  ).outputText,
);
const { Renderer } = await import(temp + '/renderer.mjs');

const cb = { hurt: () => false, effect() {}, sound() {}, bossDefeated() {} };
const level = buildLevel(0);
assert.equal(level.boss.type, 'nightRook');

/** A world with its boss woken, and Hopper standing in the arena. */
function arena(playerAt = 700) {
  const w = new CombatWorld(level),
    p = {
      x: level.boss.arena.x + playerAt,
      y: level.boss.arena.y,
      vx: 0,
      vy: 0,
      facing: 1,
      gravitySign: 1,
      grounded: true,
    };
  w.update(1 / 60, 0, p, level.platforms, cb);
  assert.ok(w.boss.active, 'the boss wakes when Hopper enters the arena');
  return { w, p };
}
// The chest is where the painted ribcage is, far above the middle of the
// compact combat box a beam used to be pointed at.
{
  const { w } = arena(),
    b = w.boss,
    chest = chestOf(b);
  const above = b.y - chest.y;
  assert.ok(
    above > b.h * 0.9 && above < b.h * 1.1,
    `chest sits about a box-height up, got ${above} of ${b.h}`,
  );
  assert.ok(
    above > b.h * 0.52 + 100,
    'the chest is well clear of the old aim point',
  );
}

// The guard comes up and goes down again, repeatedly, over a fight's length.
{
  const { w, p } = arena();
  const seen = new Set();
  let flips = 0,
    was = w.boss.mirror > 0;
  for (let n = 0; n < 60 * 30; n++) {
    w.update(1 / 60, n / 60, p, level.platforms, cb);
    seen.add(w.boss.mirror > 0);
    if (w.boss.mirror > 0 !== was) {
      flips++;
      was = w.boss.mirror > 0;
    }
  }
  assert.ok(
    seen.has(true) && seen.has(false),
    'the guard both rises and falls',
  );
  assert.ok(flips >= 8, `the guard cycles often, got ${flips} flips in 30s`);
}

// While the guard is up a beam is turned back off the chest and nothing lands;
// while it is down the beam lands as before.
{
  const { w } = arena();
  const b = w.boss;
  b.mirror = 1;
  b.invulnerable = 0;
  const before = b.hp,
    chest = chestOf(b);
  const guarded = w.hit(chest.x, chest.y, 26, 1, 'laser', 1);
  assert.equal(b.hp, before, 'a guarded beam does no damage');
  assert.ok(guarded.guarded && guarded.mirror, 'and it comes back whole');
  assert.ok(
    Math.abs(guarded.at.y - chest.y) < 1,
    'turned at the chest, not the shins',
  );
  b.mirror = 0;
  b.invulnerable = 0;
  w.hit(chest.x, chest.y, 26, 1, 'laser', 1);
  assert.ok(b.hp < before, 'with the guard down the beam lands');
}

// A beam aimed at the chest still reaches it: the hurt region covers the
// painted body, not just the box.
{
  const { w } = arena();
  const b = w.boss;
  b.mirror = 0;
  b.invulnerable = 0;
  const before = b.hp;
  w.hit(chestOf(b).x, chestOf(b).y, 26, 1, 'laser', 1);
  assert.ok(before - b.hp > 0, 'a shot at the chest lands');
  b.invulnerable = 0;
  const mid = b.hp;
  w.hit(b.x, b.y - b.h * 0.52, 26, 1, 'laser', 1);
  assert.ok(mid - b.hp > 0, 'and so does one at the middle of the box');
}

// A shot turned back into it hurts several times more than a beam or a kick.
{
  const { w } = arena();
  const b = w.boss;
  const of = (kind, damage) => {
    b.hp = b.maxHp;
    b.open = 0;
    b.mirror = 0;
    b.invulnerable = 0;
    w.hit(b.x, b.y - b.h * 0.52, 26, damage, kind, 1);
    return b.maxHp - b.hp;
  };
  const reflected = of('reflect', 2),
    beam = of('laser', 1),
    kick = of('kick', 3);
  assert.ok(
    reflected > beam * 3 && reflected > kick,
    `reflecting should be the best answer: reflect ${reflected}, laser ${beam}, kick ${kick}`,
  );
}

// The heavy shots are thrown at Hopper rather than rolled along the floor.
{
  const { w, p } = arena(900);
  // Hopper up on a ledge: a shot that only travels sideways can never reach.
  p.y = level.boss.arena.y - 400;
  const waves = [];
  for (let n = 0; n < 60 * 40; n++) {
    w.update(1 / 60, n / 60, p, level.platforms, cb);
    for (const s of w.projectiles)
      if (s.type === 'wave' && !waves.some((o) => o.id === s.id))
        waves.push({ id: s.id, vx: s.vx, vy: s.vy, x: s.x, y: s.y });
  }
  assert.ok(
    waves.length >= 2,
    `the heavy shots are fired, got ${waves.length}`,
  );
  for (const s of waves)
    assert.ok(
      s.vy * (p.y - s.y) > 0,
      `a heavy shot travels towards Hopper, got vy ${s.vy}`,
    );
}

// It works the width of the arena: it crosses from one side to the other
// repeatedly, and passes through the middle rather than loitering there. The
// middle fifth of the arena is a quarter of the width it can actually reach,
// so anything near that share is a boss that is always on its way somewhere.
{
  const { w, p } = arena();
  const a = level.boss.arena;
  let middle = 0,
    dwell = 0,
    longest = 0,
    crossings = 0,
    at = null,
    left = false,
    right = false;
  for (let n = 0; n < 60 * 60; n++) {
    w.update(1 / 60, n / 60, p, level.platforms, cb);
    const t = (w.boss.x - a.x) / a.w;
    if (t < 0.3) left = true;
    if (t > 0.7) right = true;
    if (t > 0.4 && t < 0.6) {
      middle++;
      dwell += 1 / 60;
      longest = Math.max(longest, dwell);
    } else dwell = 0;
    const end = t < 0.3 ? 'L' : t > 0.7 ? 'R' : null;
    if (end && end !== at) {
      if (at) crossings++;
      at = end;
    }
  }
  assert.ok(left && right, 'it reaches both ends of its arena');
  assert.ok(crossings >= 8, `it crosses often, got ${crossings} in a minute`);
  assert.ok(
    middle / 3600 < 0.36,
    `it does not loiter in the middle, ${(middle / 36).toFixed(0)}% of the fight there`,
  );
  assert.ok(
    longest < 2.2,
    `and never for long at a stretch, longest ${longest.toFixed(2)}s`,
  );
}

// The guard is drawn: the lit ribcage and its shell sit at the chest, in cold
// light rather than the red rim every other shadow wears.
{
  const strokes = [],
    arcs = [];
  const ctx = new Proxy(
    { canvas: null },
    {
      get(target, key) {
        if (key === 'createRadialGradient' || key === 'createLinearGradient')
          return () => ({ addColorStop() {} });
        if (key === 'stroke') return () => strokes.push(target.strokeStyle);
        if (key === 'ellipse' || key === 'arc')
          return (x, y) => arcs.push({ x, y });
        if (key in target) return target[key];
        return () => {};
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    },
  );
  const canvas = {
    width: 1600,
    height: 900,
    getBoundingClientRect: () => ({ width: 1600, height: 900 }),
    getContext: () => ctx,
  };
  globalThis.window = { devicePixelRatio: 1 };
  const art = { complete: true, naturalWidth: 526, naturalHeight: 840 };
  const r = new Renderer(canvas, { nightRook: art });
  const { w } = arena(),
    b = w.boss;
  b.mirror = 1;
  b.bob = 0;
  r.creature(b, 0.25, true, false);
  assert.ok(
    strokes.includes('#bff6ff'),
    `the guard draws its shell, strokes: ${strokes.join(', ')}`,
  );
  const chest = chestOf(b),
    painted = 400;
  assert.ok(
    arcs.some((a) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - chest.y) < 12),
    'and draws it at the chest',
  );
  assert.ok(
    Math.abs(b.y - painted * 0.62 - chest.y) < 12,
    'the drawn ribcage and the aim point are the same place',
  );
  strokes.length = 0;
  b.mirror = 0;
  r.creature(b, 0.25, true, false);
  assert.ok(!strokes.includes('#bff6ff'), 'and nothing of it with the guard down');
}

fs.rmSync(temp, { recursive: true, force: true });
console.log('boss-rook: all checks passed');
