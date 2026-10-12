// Checks for a hero's combat resources (js/resources.js): the Ambrosia flask
// on its refilling cooldown, the quiver for the ranged attack (refill, size,
// bundles), and the damage monsters deal by tier.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLASK, flaskCooldown, flaskHeal, canDrink, drink, tickFlask, flaskFill, QUIVER, quiverMax, newQuiver, resizeQuiver, shoot, tickQuiver, addBundle, wantsBundle, bundlesFrom, BUNDLE_DROP, ammoInfo, HIT_SCALE, monsterDamage } from '../js/resources.js';
import { gearStats, rollItem, ENCHANTS } from '../js/loot.js';
import { readFileSync } from 'node:fs';

// monsters.js builds models with Three.js: read just its stat table
const src = readFileSync(new URL('../js/entities/monsters.js', import.meta.url), 'utf8');
const MONSTERS = new Function('return ' + src.slice(src.indexOf('export const MONSTERS = {') + 'export const MONSTERS = '.length, src.indexOf('\n};', src.indexOf('export const MONSTERS = {')) + 2))();

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const run = (f, secs, step = 0.1, fn = tickFlask) => { for (let t = 0; t < secs - 1e-9; t += step) fn(f, step); return f; };

test('the flask: one drink heals a big share, then refills over the cooldown', () => {
  const f = { left: 0, max: 0 };
  assert.ok(canDrink(f, 50, 120));
  assert.equal(canDrink(f, 120, 120), false, 'not at full health');
  const heal = drink(f, 120, {});
  close(heal, 120 * FLASK.heal);
  assert.ok(FLASK.heal >= 0.6 && FLASK.heal <= 0.7);
  assert.equal(f.left, FLASK.cooldown); assert.equal(flaskFill(f), 0);
  assert.equal(canDrink(f, 10, 120), false, 'empty until it refills');
  run(f, FLASK.cooldown / 2);
  close(flaskFill(f), 0.5, 1e-6);
  run(f, FLASK.cooldown / 2 + 0.05);
  assert.ok(canDrink(f, 10, 120)); assert.equal(flaskFill(f), 1);
});

test('the flask: cooldown gear shortens the refill, never below the floor', () => {
  assert.equal(flaskCooldown({}), FLASK.cooldown);
  close(flaskCooldown({ cdr: 0.2 }), FLASK.cooldown * 0.9);             // general cooldowns count half
  close(flaskCooldown({ flaskCdr: 0.24 }), FLASK.cooldown * 0.76);       // Hebe's Cup II
  assert.equal(flaskCooldown({ cdr: 5, flaskCdr: 5 }), FLASK.floor);
  close(flaskHeal(100, { healBonus: 0.2 }), 100 * (FLASK.heal + 0.2));  // Apollo's Blessing II
  assert.equal(flaskHeal(100, { healBonus: 3 }), 100, 'never more than full');
  // gear stats feed it
  const fleece = rollItem(20, { id: 'fleece_cloak' });
  const s = gearStats([null, fleece, null, null]).s;
  assert.ok(s.flaskCdr >= 0.15 && flaskCooldown(s) < FLASK.cooldown);
  const parka = rollItem(20, { id: 'hunter_parka' });
  assert.equal(quiverMax(gearStats([null, parka]).s), QUIVER.max + 10);
  assert.ok(ENCHANTS.nectar && ENCHANTS.quiver, 'Hebe’s Cup and Artemis’s Quiver exist');
});

test('the quiver: full to start, a shot spends one, empty refuses', () => {
  const q = newQuiver({});
  assert.equal(q.ammo, QUIVER.max); assert.equal(q.max, QUIVER.max);
  assert.ok(shoot(q)); assert.equal(q.ammo, QUIVER.max - 1);
  q.ammo = 0;
  assert.equal(shoot(q), false); assert.equal(q.ammo, 0);
});

test('the quiver refills one shot every few seconds, only after a pause in shooting', () => {
  const q = newQuiver({}); q.ammo = 0; q.idle = 0;
  run(q, QUIVER.delay - 0.1, 0.05, tickQuiver);
  assert.equal(q.ammo, 0, 'nothing during the delay');
  run(q, 0.1 + QUIVER.every + 0.01, 0.05, tickQuiver);
  assert.equal(q.ammo, 1);
  run(q, QUIVER.every * 4, 0.05, tickQuiver);
  assert.equal(q.ammo, 5);
  // shooting again resets the pause
  shoot(q); assert.equal(q.ammo, 4);
  run(q, QUIVER.delay * 0.9, 0.05, tickQuiver); assert.equal(q.ammo, 4);
  // never past the top
  run(q, 999, 0.25, tickQuiver); assert.equal(q.ammo, q.max);
  assert.ok(QUIVER.max >= 15 && QUIVER.max <= 30 && QUIVER.every >= 1.5 && QUIVER.every <= 2);
});

test('the quiver: gear changes its size, keeping what fits', () => {
  const q = newQuiver({ quiver: 10 }); assert.equal(q.max, QUIVER.max + 10); assert.equal(q.ammo, q.max);
  resizeQuiver(q, {}); assert.equal(q.max, QUIVER.max); assert.equal(q.ammo, QUIVER.max);
  q.ammo = 3; resizeQuiver(q, { quiver: 5 }); assert.equal(q.ammo, 3); assert.equal(q.max, QUIVER.max + 5);
});

test('bundles top the quiver up, and only fly to a hero who needs them', () => {
  const q = newQuiver({});
  assert.equal(wantsBundle(q), false, 'a full quiver ignores bundles');
  q.ammo = 2; assert.ok(wantsBundle(q));
  assert.equal(addBundle(q), QUIVER.bundle); assert.equal(q.ammo, 2 + QUIVER.bundle);
  q.ammo = q.max - 3; assert.equal(addBundle(q), 3, 'never past the top'); assert.equal(q.ammo, q.max);
  assert.ok(QUIVER.bundle >= 8 && QUIVER.bundle <= 10);
});

test('bundle drops: sometimes from monsters and crates, often from chests, always from a boss', () => {
  assert.equal(bundlesFrom('minor', () => 0.99), 0);
  assert.equal(bundlesFrom('minor', () => 0.01), 1);
  assert.equal(bundlesFrom('boss', () => 0.99), 2);
  assert.equal(bundlesFrom('rareChest', () => 0.99), 1);
  assert.equal(bundlesFrom('nothing', () => 0), 0);
  // rates: elite > minor, chest > crate, a boss always
  assert.ok(BUNDLE_DROP.elite > BUNDLE_DROP.minor && BUNDLE_DROP.chest > BUNDLE_DROP.crate && BUNDLE_DROP.boss >= 1);
  // over many monsters, a minor drop comes about as often as its rate says
  let n = 0, x = 12345; const rng = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 5000; i++) n += bundlesFrom('minor', rng);
  close(n / 5000, BUNDLE_DROP.minor, 0.02);
});

test('every hero has a themed quiver and an out-of-ammo hint', () => {
  for (const h of ['percy', 'annabeth', 'grover', 'tyson', 'clarisse']) { const a = ammoInfo(h); assert.ok(a.icon && /comes? back over time/.test(a.out), h); }
  assert.match(ammoInfo('someone').out, /^Out of arrows/);
});

test('monster hits at Mortal with starting gear land in the target bands', () => {
  // starting gear: about 120 health and 10% damage reduction
  const hp = 120, keep = 0.9;
  const pct = (kind, elite = false) => 100 * monsterDamage(MONSTERS[kind].dmg, MONSTERS[kind].tier, 1) * (elite ? 1.3 : 1) * keep / hp;
  for (const k of ['pup', 'serpent', 'spider', 'harpy', 'stymphalian', 'ghost']) { const p = pct(k); assert.ok(p >= 6 && p <= 13, `${k}: ${p.toFixed(1)}%`); }
  for (const k of ['fury', 'dracaena', 'hellhound', 'scorpion', 'gorgon_statue']) { const p = pct(k); assert.ok(p >= 12 && p <= 24, `${k}: ${p.toFixed(1)}%`); }
  const rat = pct('rat'); assert.ok(rat >= 5 && rat <= 8, `rat: ${rat.toFixed(1)}%`);
  // difficulty adds its step on top
  close(monsterDamage(10, 'minor', 3, 0.25), 10 * HIT_SCALE.minor * 1.5);
});
