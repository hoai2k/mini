// A hero's combat resources, in the Minecraft Dungeons mould: one Ambrosia
// flask on a refilling cooldown (instead of a handful of charges), and a
// quiver for the basic ranged attack that refills on its own a moment after
// you stop shooting, topped up by ammo bundles that monsters, crates and
// chests drop. Also the damage monsters deal to heroes, per tier.
// Pure functions and data (no Three.js), so the checks in test/ can run them.

// ---------------------------------------------------------------- Ambrosia
// heal: share of max health restored over `dur` seconds · cooldown: seconds
// to refill after a drink (shortened by Hebe's Cup and, at half strength, by
// general cooldown reduction) · floor: the shortest it can get.
export const FLASK = { heal: 0.65, dur: 1.2, cooldown: 22, floor: 9 };

// Seconds the flask takes to refill for these stats.
export function flaskCooldown(stats = {}) {
  const general = Math.min(0.6, stats.cdr ?? 0) * 0.5;
  const own = Math.min(0.6, stats.flaskCdr ?? 0);
  return Math.max(FLASK.floor, FLASK.cooldown * (1 - general) * (1 - own));
}
// Health one drink restores (Apollo's Blessing adds 10% of max per level).
export function flaskHeal(maxHp, stats = {}) {
  return maxHp * Math.min(1, FLASK.heal + (stats.healBonus ?? 0));
}
// Can the hero drink now? (a full-health hero doesn't waste it)
export function canDrink(f, hp, maxHp) { return f.left <= 0 && hp < maxHp; }
// Drink: the flask empties and starts refilling. Returns the health to restore.
export function drink(f, maxHp, stats = {}) {
  f.max = flaskCooldown(stats); f.left = f.max;
  return flaskHeal(maxHp, stats);
}
export function tickFlask(f, dt) { f.left = Math.max(0, f.left - dt); return f; }
// 0 = empty, 1 = ready (for the HUD's radial fill)
export const flaskFill = (f) => (f.max > 0 ? 1 - Math.min(1, f.left / f.max) : 1);

// ---------------------------------------------------------------- quiver
// max: shots in a full quiver · delay: seconds after the last shot before it
// starts refilling · every: seconds per shot regained · bundle: shots in a
// bundle pickup.
export const QUIVER = { max: 20, delay: 1, every: 1.75, bundle: 8 };

export const quiverMax = (stats = {}) => Math.max(1, Math.round(QUIVER.max + (stats.quiver ?? 0)));
export function newQuiver(stats = {}) { const max = quiverMax(stats); return { ammo: max, max, idle: 99, regen: 0 }; }
// Gear changed: the new size, keeping the shots you have (never more than fit).
export function resizeQuiver(q, stats = {}) { q.max = quiverMax(stats); q.ammo = Math.min(q.ammo, q.max); return q; }
// Spend a shot; false (and nothing spent) when the quiver is empty.
export function shoot(q) {
  if (q.ammo <= 0) return false;
  q.ammo--; q.idle = 0; q.regen = 0;
  return true;
}
// Refill one shot every `every` seconds once `delay` has passed since the last shot.
export function tickQuiver(q, dt) {
  q.idle += dt;
  if (q.ammo >= q.max) { q.regen = 0; return q; }
  if (q.idle < QUIVER.delay) return q;
  q.regen += dt;
  while (q.regen >= QUIVER.every && q.ammo < q.max) { q.regen -= QUIVER.every; q.ammo++; }
  if (q.ammo >= q.max) q.regen = 0;
  return q;
}
// Pick up a bundle: returns the shots actually added.
export function addBundle(q, n = QUIVER.bundle) { const before = q.ammo; q.ammo = Math.min(q.max, q.ammo + n); return q.ammo - before; }
// A bundle only flies to a hero whose quiver isn't full.
export const wantsBundle = (q) => !!q && q.ammo < q.max;

// How often a bundle drops: a defeated monster by tier, a broken crate or
// barrel, an opened chest (by rarity). A boss always drops two.
export const BUNDLE_DROP = { minor: 0.07, elite: 0.25, champion: 0.5, crate: 0.15, chest: 0.6, rareChest: 1, boss: 2 };
// Number of bundles from a source ('minor'… or 'crate', 'chest', 'rareChest', 'boss').
export function bundlesFrom(source, rng = Math.random) {
  const c = BUNDLE_DROP[source] ?? 0;
  return Math.floor(c) + (rng() < c - Math.floor(c) ? 1 : 0);
}

// What each hero's quiver holds (the HUD icon and the out-of-ammo hint).
export const AMMO = {
  percy: { icon: '💧', name: 'water', out: 'Out of water — it comes back over time' },
  annabeth: { icon: '🔪', name: 'knives', out: 'Out of knives — they come back over time' },
  grover: { icon: '🎵', name: 'notes', out: 'Out of breath for the pipes — it comes back over time' },
  tyson: { icon: '🪨', name: 'boulders', out: 'Out of boulders — they come back over time' },
  clarisse: { icon: '⚡', name: 'sparks', out: 'Out of sparks — they come back over time' },
};
export const ammoInfo = (hero) => AMMO[hero] ?? { icon: '➶', name: 'arrows', out: 'Out of arrows — they come back over time' };

// ---------------------------------------------------------------- monster hits
// Multiplier on every monster's listed damage against heroes, by tier, so a
// hit is felt the way it is in Minecraft Dungeons. At Mortal with starting
// gear (about 120 health, 10% armour) a minor monster's hit takes about a
// tenth of a hero's health, an elite's about a fifth, and a boss's big
// telegraphed blow about a third. Demigod and up add the difficulty step.
export const HIT_SCALE = { minor: 1.7, elite: 1.45, champion: 1.2, boss: 1.5 };
export function monsterDamage(base, tier, level = 1, step = 0.25) {
  return base * (HIT_SCALE[tier] ?? 1) * (1 + (level - 1) * step);
}
