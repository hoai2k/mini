import assert from 'node:assert/strict';
import { CombatWorld } from '../../src/game/combat.ts';
import { buildLevel } from '../../src/game/levels.ts';
const cb = { hurt() {}, effect() {}, sound() {}, bossDefeated() {} };
const player = (x = 200, y = 800) => ({
  x,
  y,
  vx: 0,
  vy: 0,
  facing: 1,
  gravitySign: 1,
  grounded: true,
});
for (let m = 0; m < 3; m++) {
  const level = buildLevel(m),
    w = new CombatWorld(level);
  for (const type of level.areas.flatMap((a) => a.enemyTypes)) {
    const e = w.enemies.find((e) => e.type === type),
      p = player(e.x + 240, e.homeY);
    const world = new CombatWorld({
      ...level,
      enemies: [level.enemies.find((e) => e.type === type)],
    });
    for (let n = 0; n < 600; n++)
      world.update(1 / 60, n / 60, p, level.platforms, cb);
    assert.ok(world.enemies[0].sequence > 0, `${type} attacks`);
    assert.ok(
      Number.isFinite(world.enemies[0].x) &&
        Number.isFinite(world.enemies[0].y),
      `${type} finite`,
    );
  }
  const p = player(level.boss.arena.x + 700, level.boss.arena.y);
  for (let n = 0; n < 1200; n++)
    w.update(1 / 60, n / 60, p, level.platforms, cb);
  assert.ok(w.boss.active && w.boss.sequence >= 3, `boss ${m} cycles`);
  w.boss.hp = 40;
  w.update(1 / 60, 20, p, level.platforms, cb);
  assert.equal(w.boss.phase, 2);
  w.boss.hp = 10;
  w.update(1 / 60, 21, p, level.platforms, cb);
  assert.equal(w.boss.phase, 3);
  let wins = 0;
  w.update(1 / 60, 22, p, level.platforms, {
    ...cb,
    bossDefeated() {
      wins++;
    },
  });
  w.boss.open = 2;
  w.hit(w.boss.x, w.boss.y - w.boss.h * 0.52, 50, 100, 'kick');
  w.hit(w.boss.x, w.boss.y - w.boss.h * 0.52, 50, 100, 'kick');
  assert.equal(wins, 1);
}
const base = buildLevel(0);
const custom = {
  ...base,
  enemies: [
    { id: 'left', type: 'shadeHound', x: 350, y: 800, area: 0 },
    { id: 'right', type: 'shadeHound', x: 650, y: 800, area: 0 },
  ],
};
let w = new CombatWorld(custom);
const h = w.hit(500, 760, 200, 3, 'launch', 1, 'launch-1');
assert.equal(h.kills, 1);
assert.equal(w.enemies[0].alive, false);
assert.equal(w.enemies[1].alive, true);
w = new CombatWorld({
  ...base,
  enemies: [{ id: 'stomp', type: 'shadeHound', x: 500, y: 800, area: 0 }],
});
w.enemies[0].asleep = false;
let p = player(500, 745);
p.vy = 400;
p.grounded = false;
assert.equal(w.tryStomp(p, 725, true, cb), true);
assert.ok(p.vy < 0 && !w.enemies[0].alive);
w = new CombatWorld({
  ...base,
  enemies: [{ id: 'armor', type: 'cragTortoise', x: 500, y: 800, area: 0 }],
});
w.enemies[0].asleep = false;
p = player(500, 720);
p.vy = 400;
assert.equal(w.tryStomp(p, 690, true, cb), false);
assert.equal(w.enemies[0].hp, 5);
w = new CombatWorld({
  ...base,
  enemies: [{ id: 'swing', type: 'cragTortoise', x: 500, y: 800, area: 0 }],
});
w.hit(500, 760, 150, 1, 'kick', 1, 'same-swing');
w.enemies[0].invulnerable = 0;
const repeat = w.hit(500, 760, 150, 1, 'kick', 1, 'same-swing');
assert.equal(repeat.hits, 0);
console.log(
  'PASS: all 18 enemies attack; all 3 bosses cycle and transition phases; single victory callback; rear-only launch; stomp before contact; armored stomp rejection; once-per-swing damage.',
);
w = new CombatWorld({ ...base, enemies: [] });
w.boss.alive = false;
p = { ...player(500, 800), h: 120, w: 110, gravitySign: -1 };
let invertedHits = 0;
const inverseCb = {
  ...cb,
  hurt() {
    invertedHits++;
  },
};
w.projectiles.push({
  id: 1,
  x: 500,
  y: 860,
  vx: 0,
  vy: 0,
  radius: 5,
  life: 1,
  delay: 0,
  gravity: 0,
  damage: 1,
  type: 'orb',
  color: '#fff',
  owner: 'test',
  active: true,
});
w.update(1 / 120, 0, p, [], inverseCb);
assert.equal(invertedHits, 1, 'inverted body below feet takes projectile');
w.projectiles.push({
  id: 2,
  x: 500,
  y: 740,
  vx: 0,
  vy: 0,
  radius: 5,
  life: 1,
  delay: 0,
  gravity: 0,
  damage: 1,
  type: 'orb',
  color: '#fff',
  owner: 'test',
  active: true,
});
w.update(1 / 120, 0.01, p, [], inverseCb);
assert.equal(
  invertedHits,
  1,
  'ghost body above inverted feet does not take projectile',
);
console.log(
  'PASS: inverted 120px player collider is below feet; former ghost hitbox is clear.',
);
// Ambush from behind: hidden and harmless until Hopper is past, then it emerges
// facing Hopper's back and moves straight into its telegraph.
w = new CombatWorld({
  ...base,
  enemies: [
    {
      id: 'lurker',
      type: 'shadeHound',
      x: 500,
      y: 800,
      area: 0,
      ambush: 'behind',
    },
  ],
});
let contact = 0;
const contactCb = {
  ...cb,
  hurt() {
    contact++;
  },
};
p = { ...player(520, 800), w: 110, h: 120 };
for (let n = 0; n < 30; n++) w.update(1 / 120, n / 120, p, [], contactCb);
assert.equal(contact, 0, 'a dormant ambusher cannot touch Hopper');
assert.equal(w.enemies[0].visible, false, 'dormant ambusher stays hidden');
assert.equal(w.hit(500, 760, 200, 5, 'kick').hits, 0, 'and cannot be hit');
p = { ...player(800, 800), w: 110, h: 120 };
w.update(1 / 120, 1, p, [], contactCb);
assert.equal(w.enemies[0].dormant, false, 'passing it wakes the ambusher');
assert.equal(w.enemies[0].visible, true);
assert.equal(w.enemies[0].state, 'telegraph');
assert.equal(w.enemies[0].facing, 1, 'it comes at Hopper from behind');
// Parry: a frontal blow the engine reports as parried leaves the attacker open.
w = new CombatWorld({
  ...base,
  enemies: [{ id: 'biter', type: 'shadeHound', x: 500, y: 800, area: 0 }],
});
w.enemies[0].asleep = false;
p = { ...player(560, 800), w: 110, h: 120, facing: -1 };
w.update(1 / 120, 0, p, [], { ...cb, hurt: () => true });
assert.equal(w.enemies[0].state, 'recover', 'parried enemy staggers');
assert.ok(w.enemies[0].open > 1, 'and stands open');
// Reflect: a parried shot becomes Hopper's, flies back at its shooter and lands as a kick.
w = new CombatWorld({
  ...base,
  enemies: [{ id: 'spitter', type: 'seedSpitter', x: 300, y: 800, area: 0 }],
});
w.enemies[0].asleep = false;
w.projectiles.push({
  id: 9,
  x: 600,
  y: 750,
  vx: 250,
  vy: 0,
  radius: 12,
  life: 3,
  delay: 0,
  gravity: 0,
  damage: 1,
  type: 'orb',
  color: '#fff',
  owner: 'spitter',
  active: true,
});
p = { ...player(700, 800), w: 110, h: 120, facing: -1 };
w.reflect(w.projectiles[0], p);
assert.equal(w.projectiles[0].owner, 'player');
assert.ok(w.projectiles[0].vx < 0, 'reflected shot heads back to the shooter');
const spitterHp = w.enemies[0].hp;
let reflectedHurt = 0;
for (let n = 0; n < 240 && w.projectiles.length; n++)
  w.update(1 / 120, n / 120, p, [], {
    ...cb,
    hurt() {
      reflectedHurt++;
    },
  });
assert.ok(w.enemies[0].hp < spitterHp, 'reflected shot damages its shooter');
assert.equal(reflectedHurt, 0, 'a reflected shot never hurts Hopper');
console.log(
  'PASS: rear ambush stays hidden and harmless until passed, parry staggers, reflected shots return to sender.',
);
// Under-ambush: a buried burrower shivers the ground as Hopper nears and
// surfaces beneath it; until then it is neither visible nor hittable.
w = new CombatWorld({
  ...base,
  enemies: [
    {
      id: 'buried',
      type: 'basaltBurrower',
      x: 500,
      y: 800,
      area: 0,
      ambush: 'under',
    },
  ],
});
let tells = 0;
const tellCb = {
  ...cb,
  effect(name) {
    if (name === 'tell') tells++;
  },
};
p = { ...player(900, 800), w: 110, h: 120 };
w.update(1 / 120, 0, p, [], tellCb);
assert.equal(w.enemies[0].visible, false, 'buried and quiet far away');
p = { ...player(560, 800), w: 110, h: 120 };
for (let n = 0; n < 30; n++) w.update(1 / 120, n / 120, p, [], tellCb);
assert.ok(tells > 0, 'the ground tells before it surfaces');
assert.equal(w.enemies[0].visible, false, 'still buried during the tell');
for (let n = 0; n < 40; n++) w.update(1 / 120, 1 + n / 120, p, [], tellCb);
assert.equal(w.enemies[0].dormant, false, 'then it surfaces');
assert.equal(w.enemies[0].visible, true);
// Mirror ambush: shadows Hopper along its shelf and drops when Hopper is beneath.
const perch = {
  id: 'perch',
  x: 300,
  y: 500,
  w: 900,
  h: 65,
  skin: 8,
  kind: 'oneWay',
  routeRole: 'high',
  area: 0,
};
w = new CombatWorld({
  ...base,
  enemies: [
    {
      id: 'shadow',
      type: 'mirrorStalker',
      x: 400,
      y: 500,
      area: 0,
      ambush: 'mirror',
    },
  ],
});
w.enemies[0].asleep = false;
p = { ...player(900, 800), w: 110, h: 120 };
for (let n = 0; n < 100; n++) w.update(1 / 120, n / 120, p, [perch], cb);
assert.ok(
  w.enemies[0].x > 700,
  'mirror stalker shadows Hopper along its shelf',
);
assert.equal(w.enemies[0].y, 500, 'and stays on its shelf while shadowing');
let dropped = false;
for (let n = 0; n < 240; n++) {
  w.update(1 / 120, 1 + n / 120, p, [perch], cb);
  if (w.enemies[0].state === 'attack' && w.enemies[0].y > 560) dropped = true;
}
assert.ok(dropped, 'it pounces down when Hopper is beneath');
// A reflected shot opens a signal cage; nothing else does.
let opened = [];
w = new CombatWorld({
  ...base,
  enemies: [{ id: 'warden', type: 'seedSpitter', x: 300, y: 800, area: 0 }],
  barriers: [{ id: 'cage', x: 200, y: 600, w: 240, h: 250 }],
});
w.enemies[0].asleep = false;
w.projectiles.push({
  id: 11,
  x: 700,
  y: 750,
  vx: 250,
  vy: 0,
  radius: 12,
  life: 3,
  delay: 0,
  gravity: 0,
  damage: 1,
  type: 'orb',
  color: '#fff',
  owner: 'warden',
  active: true,
});
p = { ...player(800, 800), w: 110, h: 120, facing: -1 };
const wardenHp = w.enemies[0].hp;
w.reflect(w.projectiles[0], p);
for (let n = 0; n < 240 && w.projectiles.length; n++)
  w.update(1 / 120, n / 120, p, [], {
    ...cb,
    breakBarrier(id) {
      opened.push(id);
    },
  });
assert.deepEqual(opened, ['cage'], 'the reflected shot breaks the cage');
assert.equal(
  w.enemies[0].hp,
  wardenHp,
  'and is spent on the bars, not the warden',
);
console.log(
  'PASS: under-ambush tells then surfaces, mirror stalker shadows and pounces, reflected shots open cages.',
);
// Agile techniques: an agile hound pounces (leaves the ground and lands back
// on its shelf); an agile shooter vaults over Hopper and fires from behind; an
// agile shooting flyer overflies to Hopper's far side. Non-agile spawns of the
// same species never leave the ground.
const flat = [
  {
    id: 'ground',
    x: 0,
    y: 800,
    w: 4000,
    h: 130,
    skin: 0,
    kind: 'solid',
    routeRole: 'main',
    area: 0,
  },
];
function run(spawn, px, frames = 600) {
  const world = new CombatWorld({ ...base, enemies: [spawn] });
  world.enemies[0].asleep = false;
  const who = {
    ...player(px, 800),
    w: 110,
    h: 120,
    facing: px < spawn.x ? 1 : -1,
  };
  let airborne = false,
    maxLift = 0,
    crossed = false,
    shotsFromBehind = 0;
  for (let n = 0; n < frames; n++) {
    world.update(1 / 120, n / 120, who, flat, cb);
    const e = world.enemies[0];
    if (e.airborne) airborne = true;
    maxLift = Math.max(maxLift, 800 - e.y);
    if ((e.x - px) * (spawn.x - px) < 0) crossed = true;
    for (const b of world.projectiles)
      if (b.owner === e.id && (b.x - px) * (spawn.x - px) < 0 && b.delay <= 0)
        shotsFromBehind++;
  }
  return { airborne, maxLift, crossed, shotsFromBehind, e: world.enemies[0] };
}
const pounce = run(
  { id: 'p', type: 'shadeHound', x: 700, y: 800, area: 0, agile: true },
  300,
);
assert.ok(pounce.airborne && pounce.maxLift > 80, 'agile hound pounces');
assert.equal(pounce.e.y, 800, 'and lands back on its shelf');
const plain = run(
  { id: 'q', type: 'shadeHound', x: 700, y: 800, area: 0 },
  300,
);
assert.ok(!plain.airborne, 'an ordinary hound never leaves the ground');
const vault = run(
  { id: 'v', type: 'seedSpitter', x: 650, y: 800, area: 0, agile: true },
  400,
  900,
);
assert.ok(vault.airborne && vault.crossed, 'agile shooter vaults over Hopper');
assert.ok(vault.shotsFromBehind > 0, 'and fires from behind after landing');
const still = run(
  { id: 's', type: 'seedSpitter', x: 650, y: 800, area: 0 },
  400,
  900,
);
assert.ok(!still.crossed, 'an ordinary shooter holds its ground');
const overfly = run(
  { id: 'o', type: 'chainManta', x: 700, y: 680, area: 0, agile: true },
  300,
  900,
);
assert.ok(
  overfly.crossed && overfly.shotsFromBehind > 0,
  'agile shooting flyer overflies and fires from behind',
);
// Waves: the second wave stays hidden until the first is down.
w = new CombatWorld({
  ...base,
  enemies: [
    {
      id: 'w0a',
      type: 'shadeHound',
      x: 500,
      y: 800,
      area: 0,
      wave: 0,
      group: 'g',
    },
    {
      id: 'w0b',
      type: 'shadeHound',
      x: 650,
      y: 800,
      area: 0,
      wave: 0,
      group: 'g',
    },
    {
      id: 'w1',
      type: 'shadeHound',
      x: 800,
      y: 800,
      area: 0,
      wave: 1,
      group: 'g',
    },
  ],
});
p = { ...player(300, 800), w: 110, h: 120 };
for (let n = 0; n < 60; n++) w.update(1 / 120, n / 120, p, flat, cb);
assert.equal(w.enemies[2].visible, false, 'wave 1 waits');
w.enemies[0].alive = false;
w.enemies[1].alive = false;
for (let n = 0; n < 10; n++) w.update(1 / 120, 1 + n / 120, p, flat, cb);
assert.equal(
  w.enemies[2].dormant,
  false,
  'wave 1 jumps in once wave 0 is down',
);
assert.ok(w.enemies[2].airborne, 'arriving by leap, not appearing in place');
console.log(
  'PASS: agile pounce, vault-and-shoot-from-behind, overfly; ordinary spawns stay simple; waves arrive as earlier waves fall.',
);
