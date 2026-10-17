// Gear in the Minecraft Dungeons mould, from Percy Jackson's world.
//
// Every item is a weapon, an armour or a magic item (two magic-item slots,
// used with D-pad ← / → or R / T). An item has a rarity, a power level that
// grows with the difficulty and your level, and rows of enchantments: each
// row offers two or three choices, you invest enchantment points in ONE of
// them (I, II, III), and salvaging the item refunds every point. Powerful
// enchantments cost more. A blessed item (a gift from a god) carries one
// extra enchantment already at III and a little more power.
//
// Loot is per player: a chest or a boss drops a separate item for each human
// hero, shown as a beam in that player's colour, and only that player can
// pick it up. Online, each browser rolls and keeps its own loot.
import { mulberry32 } from './util.js';
import { t } from './text_config.js';

export const RARITY = {
  common: { label: t('rarity.common'), color: '#d8cfbd', rows: 1, mult: 1 },
  rare: { label: t('rarity.rare'), color: '#4ad0ff', rows: 2, mult: 1.12 },
  unique: { label: t('rarity.unique'), color: '#ff9a2a', rows: 3, mult: 1.25 },
};
export const BLESSED = { label: t('rarity.blessed'), color: '#ffd84a', powerBonus: 2 };
export const KIND_LABEL = { weapon: t('loot.kind.weapon'), armor: t('loot.kind.armor'), artifact: t('loot.kind.artifact') };

// Enchantments. `stat` folds into the hero's stats, `proc` turns on an effect
// in combat. Costs per level: 1/2/3, powerful ones 2/3/4.
export const ENCHANTS = {
  // weapons
  sharpness: { name: t('enchantments.sharpness.name'), desc: (l) => t('enchantments.sharpness.desc', { n: l * 10 }), for: ['weapon'], stat: (s, l) => { s.meleeMult += 0.1 * l; } },
  swirling: { name: t('enchantments.swirling.name'), desc: (l) => t('enchantments.swirling.desc', { n: 40 + l * 20 }), for: ['weapon'], proc: 'swirl' },
  committed: { name: t('enchantments.committed.name'), desc: (l) => t('enchantments.committed.desc', { n: l * 15 }), for: ['weapon'], stat: (s, l) => { s.committed += 0.15 * l; } },
  rampaging: { name: t('enchantments.rampaging.name'), desc: (l) => t('enchantments.rampaging.desc', { n: l * 10 }), for: ['weapon'], proc: 'rampage' },
  leeching: { name: t('enchantments.leeching.name'), desc: (l) => t('enchantments.leeching.desc', { n: l * 2 }), for: ['weapon'], proc: 'leech' },
  exploding: { name: t('enchantments.exploding.name'), desc: (l) => t('enchantments.exploding.desc', { n: l * 20 }), for: ['weapon'], proc: 'explode', powerful: true },
  freezing: { name: t('enchantments.freezing.name'), desc: (l) => t('enchantments.freezing.desc', { n: (1 + l * 0.4).toFixed(1) }), for: ['weapon'], proc: 'freeze' },
  critical: { name: t('enchantments.critical.name'), desc: (l) => t('enchantments.critical.desc', { n: l * 5 }), for: ['weapon', 'artifact'], stat: (s, l) => { s.crit += 0.05 * l; } },
  thundering: { name: t('enchantments.thundering.name'), desc: (l) => t('enchantments.thundering.desc', { n: l * 8 }), for: ['weapon'], proc: 'thunder', powerful: true },
  echo: { name: t('enchantments.echo.name'), desc: (l) => t('enchantments.echo.desc', { n: l * 10 }), for: ['weapon'], proc: 'echo' },
  bane: { name: t('enchantments.bane.name'), desc: (l) => t('enchantments.bane.desc', { n: l * 20 }), for: ['weapon'], stat: (s, l) => { s.bane += 0.2 * l; } },
  // armour
  health: { name: t('enchantments.health.name'), desc: (l) => t('enchantments.health.desc', { n: l * 15 }), for: ['armor'], stat: (s, l) => { s.maxHp += 15 * l; } },
  protection: { name: t('enchantments.protection.name'), desc: (l) => t('enchantments.protection.desc', { n: l * 6 }), for: ['armor'], stat: (s, l) => { s.armor += 0.06 * l; } },
  swiftness: { name: t('enchantments.swiftness.name'), desc: (l) => t('enchantments.swiftness.desc', { n: l * 6 }), for: ['armor'], stat: (s, l) => { s.speed += 0.06 * l; } },
  cooldown: { name: t('enchantments.cooldown.name'), desc: (l) => t('enchantments.cooldown.desc', { n: l * 8, n2: l * 4 }), for: ['armor', 'artifact'], stat: (s, l) => { s.cdr += 0.08 * l; } },
  surge: { name: t('enchantments.surge.name'), desc: (l) => t('enchantments.surge.desc', { n: l * 15 }), for: ['armor', 'artifact'], stat: (s, l) => { s.ceGain += 0.15 * l; } },
  potency: { name: t('enchantments.potency.name'), desc: (l) => t('enchantments.potency.desc', { n: l * 10 }), for: ['armor', 'artifact'], stat: (s, l) => { s.techMult += 0.1 * l; } },
  vitality: { name: t('enchantments.vitality.name'), desc: (l) => t('enchantments.vitality.desc', { n: l * 10 }), for: ['armor'], stat: (s, l) => { s.healBonus += 0.1 * l; } },
  nectar: { name: t('enchantments.nectar.name'), desc: (l) => t('enchantments.nectar.desc', { n: l * 12 }), for: ['armor', 'artifact'], stat: (s, l) => { s.flaskCdr += 0.12 * l; } },
  quiver: { name: t('enchantments.quiver.name'), desc: (l) => t('enchantments.quiver.desc', { n: l * 5 }), for: ['armor'], stat: (s, l) => { s.quiver += 5 * l; } },
  thorns: { name: t('enchantments.thorns.name'), desc: (l) => t('enchantments.thorns.desc', { n: l * 25 }), for: ['armor'], stat: (s, l) => { s.thorns += 0.25 * l; } },
  embers: { name: t('enchantments.embers.name'), desc: (l) => t('enchantments.embers.desc', { n: l * 6 }), for: ['armor'], proc: 'embers', powerful: true },
  evasion: { name: t('enchantments.evasion.name'), desc: (l) => t('enchantments.evasion.desc', { n: l * 4 }), for: ['armor'], stat: (s, l) => { s.evade += 0.04 * l; } },
  lucky: { name: t('enchantments.lucky.name'), desc: (l) => t('enchantments.lucky.desc', { n: l * 25 }), for: ['armor', 'artifact'], stat: (s, l) => { s.luck += 0.25 * l; } },
};
export const enchCost = (id, toLevel) => toLevel + (ENCHANTS[id]?.powerful ? 1 : 0);

// Base items. `hero` marks a favourite: a hero gets +10% power from it.
export const ITEMS = [
  // ---------------------------------------------------------------- weapons
  // dmg: damage multiplier · speed: attack speed · reach · arc: swing width ·
  // knock: knock-back · twin: every hit strikes twice · pierce: ignores shields
  { id: 'training_sword', kind: 'weapon', name: t('items.training_sword.name'), icon: '🗡️', rarity: 'common', desc: t('items.training_sword.desc'), dmg: 1.0, speed: 1.0 },
  { id: 'bronze_dagger', kind: 'weapon', name: t('items.bronze_dagger.name'), icon: '🔪', rarity: 'common', desc: t('items.bronze_dagger.desc'), dmg: 0.9, speed: 1.25, reach: 0.9, hero: 'annabeth' },
  { id: 'camp_spear', kind: 'weapon', name: t('items.camp_spear.name'), icon: '🔱', rarity: 'common', desc: t('items.camp_spear.desc'), dmg: 1.05, speed: 0.95, reach: 1.25, arc: 0.7, hero: 'clarisse' },
  { id: 'club', kind: 'weapon', name: t('items.club.name'), icon: '🪵', rarity: 'common', desc: t('items.club.desc'), dmg: 1.3, speed: 0.8, knock: 1.6, hero: 'tyson' },
  { id: 'bronze_axe', kind: 'weapon', name: t('items.bronze_axe.name'), icon: '🪓', rarity: 'common', desc: t('items.bronze_axe.desc'), dmg: 1.1, speed: 0.9, arc: 1.35 },
  { id: 'shepherd_crook', kind: 'weapon', name: t('items.shepherd_crook.name'), icon: '🦯', rarity: 'common', desc: t('items.shepherd_crook.desc'), dmg: 0.95, speed: 1.1, reach: 1.2, hero: 'grover' },
  { id: 'xiphos', kind: 'weapon', name: t('items.xiphos.name'), icon: '⚔️', rarity: 'rare', desc: t('items.xiphos.desc'), dmg: 1.2, speed: 1.05, hero: 'percy' },
  { id: 'hammer', kind: 'weapon', name: t('items.hammer.name'), icon: '🔨', rarity: 'rare', desc: t('items.hammer.desc'), dmg: 1.35, speed: 0.85, knock: 1.4, hero: 'tyson', fixed: ['swirling'] },
  { id: 'reed_staff', kind: 'weapon', name: t('items.reed_staff.name'), icon: '🎋', rarity: 'rare', desc: t('items.reed_staff.desc'), dmg: 1.1, speed: 1.15, reach: 1.2, hero: 'grover', fixed: ['freezing'] },
  { id: 'lamer', kind: 'weapon', name: t('items.lamer.name'), icon: '⚡', rarity: 'rare', desc: t('items.lamer.desc'), dmg: 1.2, speed: 1.0, reach: 1.3, arc: 0.7, hero: 'clarisse', fixed: ['thundering'] },
  { id: 'labrys', kind: 'weapon', name: t('items.labrys.name'), icon: '🪓', rarity: 'rare', desc: t('items.labrys.desc'), dmg: 1.3, speed: 0.85, arc: 1.6, knock: 1.2 },
  { id: 'kopis', kind: 'weapon', name: t('items.kopis.name'), icon: '🗡️', rarity: 'rare', desc: t('items.kopis.desc'), dmg: 1.15, speed: 1.1, fixed: ['committed'] },
  { id: 'dory', kind: 'weapon', name: t('items.dory.name'), icon: '🔱', rarity: 'rare', desc: t('items.dory.desc'), dmg: 1.2, speed: 0.95, reach: 1.45, arc: 0.6 },
  { id: 'backbiter', kind: 'weapon', name: t('items.backbiter.name'), icon: '🗡️', rarity: 'unique', desc: t('items.backbiter.desc'), dmg: 1.4, speed: 1.05, reach: 1.1, pierce: true, fixed: ['committed'] },
  { id: 'stygian_blade', kind: 'weapon', name: t('items.stygian_blade.name'), icon: '🖤', rarity: 'unique', desc: t('items.stygian_blade.desc'), dmg: 1.35, speed: 1.0, fixed: ['leeching'] },
  { id: 'twin_daggers', kind: 'weapon', name: t('items.twin_daggers.name'), icon: '🌙', rarity: 'unique', desc: t('items.twin_daggers.desc'), dmg: 1.1, speed: 1.25, twin: true, hero: 'annabeth', fixed: ['critical'] },
  { id: 'imperial_gladius', kind: 'weapon', name: t('items.imperial_gladius.name'), icon: '🏛️', rarity: 'unique', desc: t('items.imperial_gladius.desc'), dmg: 1.45, speed: 1.1, fixed: ['sharpness'] },
  { id: 'harpe', kind: 'weapon', name: t('items.harpe.name'), icon: '🌙', rarity: 'unique', desc: t('items.harpe.desc'), dmg: 1.35, speed: 1.05, reach: 1.1, fixed: ['bane'] },
  { id: 'heracles_club', kind: 'weapon', name: t('items.heracles_club.name'), icon: '🏏', rarity: 'unique', desc: t('items.heracles_club.desc'), dmg: 1.6, speed: 0.75, arc: 1.3, knock: 2.2, hero: 'tyson', fixed: ['thundering'] },
  { id: 'pelian_spear', kind: 'weapon', name: t('items.pelian_spear.name'), icon: '🔱', rarity: 'unique', desc: t('items.pelian_spear.desc'), dmg: 1.4, speed: 1.0, reach: 1.45, arc: 0.7, pierce: true, hero: 'clarisse', fixed: ['critical'] },
  { id: 'ares_sword', kind: 'weapon', name: t('items.ares_sword.name'), icon: '🔥', rarity: 'unique', desc: t('items.ares_sword.desc'), dmg: 1.5, speed: 0.95, arc: 1.2, fixed: ['exploding'] },
  { id: 'trident_blade', kind: 'weapon', name: t('items.trident_blade.name'), icon: '🌊', rarity: 'unique', desc: t('items.trident_blade.desc'), dmg: 1.45, speed: 1.05, knock: 1.5, hero: 'percy', fixed: ['swirling'] },
  // ---------------------------------------------------------------- armour
  // hp · armor (damage reduction) · speed · cdr (cooldowns) · ce (Power gain) ·
  // meleeMult · techMult · regen (health per second) · evade (chance to dodge a hit) ·
  // quiver (extra shots for the ranged attack) · flaskCdr (Ambrosia refills faster)
  { id: 'camp_shirt', kind: 'armor', name: t('items.camp_shirt.name'), icon: '👕', rarity: 'common', desc: t('items.camp_shirt.desc'), hp: 20, armor: 0.06 },
  { id: 'bronze_breastplate', kind: 'armor', name: t('items.bronze_breastplate.name'), icon: '🛡️', rarity: 'common', desc: t('items.bronze_breastplate.desc'), hp: 30, armor: 0.12, speed: -0.05 },
  { id: 'hermes_uniform', kind: 'armor', name: t('items.hermes_uniform.name'), icon: '📦', rarity: 'common', desc: t('items.hermes_uniform.desc'), hp: 10, speed: 0.1, hero: 'grover' },
  { id: 'linothorax', kind: 'armor', name: t('items.linothorax.name'), icon: '🥋', rarity: 'common', desc: t('items.linothorax.desc'), hp: 15, armor: 0.06, cdr: 0.06 },
  { id: 'biker_jacket', kind: 'armor', name: t('items.biker_jacket.name'), icon: '🧥', rarity: 'rare', desc: t('items.biker_jacket.desc'), hp: 25, meleeMult: 0.12, hero: 'clarisse' },
  { id: 'hunter_parka', kind: 'armor', name: t('items.hunter_parka.name'), icon: '🧥', rarity: 'rare', desc: t('items.hunter_parka.desc'), hp: 20, cdr: 0.1, evade: 0.05, quiver: 10, hero: 'annabeth' },
  { id: 'sea_armor', kind: 'armor', name: t('items.sea_armor.name'), icon: '🌊', rarity: 'rare', desc: t('items.sea_armor.desc'), hp: 25, ce: 0.25, hero: 'percy' },
  { id: 'hoplite_panoply', kind: 'armor', name: t('items.hoplite_panoply.name'), icon: '🛡️', rarity: 'rare', desc: t('items.hoplite_panoply.desc'), hp: 45, armor: 0.16, speed: -0.06, hero: 'tyson' },
  { id: 'spartan_cloak', kind: 'armor', name: t('items.spartan_cloak.name'), icon: '🧣', rarity: 'rare', desc: t('items.spartan_cloak.desc'), hp: 25, armor: 0.06, meleeMult: 0.1 },
  { id: 'satyr_vest', kind: 'armor', name: t('items.satyr_vest.name'), icon: '🌿', rarity: 'rare', desc: t('items.satyr_vest.desc'), hp: 20, regen: 1, hero: 'grover' },
  { id: 'nemean_pelt', kind: 'armor', name: t('items.nemean_pelt.name'), icon: '🦁', rarity: 'unique', desc: t('items.nemean_pelt.desc'), hp: 45, armor: 0.18, fixed: ['protection'] },
  { id: 'fleece_cloak', kind: 'armor', name: t('items.fleece_cloak.name'), icon: '🐏', rarity: 'unique', desc: t('items.fleece_cloak.desc'), hp: 35, regen: 1.5, flaskCdr: 0.15, fixed: ['vitality'] },
  { id: 'forge_apron', kind: 'armor', name: t('items.forge_apron.name'), icon: '🔥', rarity: 'unique', desc: t('items.forge_apron.desc'), hp: 40, armor: 0.08, hero: 'tyson', fixed: ['embers'] },
  { id: 'amazon_armor', kind: 'armor', name: t('items.amazon_armor.name'), icon: '🏹', rarity: 'unique', desc: t('items.amazon_armor.desc'), hp: 30, speed: 0.08, evade: 0.08, fixed: ['evasion'] },
  { id: 'achilles_armor', kind: 'armor', name: t('items.achilles_armor.name'), icon: '⚜️', rarity: 'unique', desc: t('items.achilles_armor.desc'), hp: 55, armor: 0.22, fixed: ['health'] },
  { id: 'hermes_cap', kind: 'armor', name: t('items.hermes_cap.name'), icon: '🪽', rarity: 'unique', desc: t('items.hermes_cap.desc'), hp: 25, speed: 0.14, cdr: 0.08, evade: 0.06, hero: 'grover', fixed: ['swiftness'] },
  // ---------------------------------------------------------------- magic items
  // cd: cooldown in seconds · act: what it does (see artifacts.js)
  { id: 'master_bolt', kind: 'artifact', name: t('items.master_bolt.name'), icon: '🌩️', rarity: 'unique', desc: t('items.master_bolt.desc'), cd: 9, act: 'spear' },
  { id: 'hephaestus_net', kind: 'artifact', name: t('items.hephaestus_net.name'), icon: '🕸️', rarity: 'rare', desc: t('items.hephaestus_net.desc'), cd: 8, act: 'chain' },
  { id: 'medusa_head', kind: 'artifact', name: t('items.medusa_head.name'), icon: '🐍', rarity: 'unique', desc: t('items.medusa_head.desc'), cd: 20, act: 'prison' },
  { id: 'nemesis_coin', kind: 'artifact', name: t('items.nemesis_coin.name'), icon: '🪙', rarity: 'rare', desc: t('items.nemesis_coin.desc'), cd: 10, act: 'doll' },
  { id: 'aegis', kind: 'artifact', name: t('items.aegis.name'), icon: '🛡️', rarity: 'common', desc: t('items.aegis.desc'), cd: 16, act: 'barrier' },
  { id: 'pegasus_whistle', kind: 'artifact', name: t('items.pegasus_whistle.name'), icon: '🐴', rarity: 'rare', desc: t('items.pegasus_whistle.desc'), cd: 22, act: 'pegasus' },
  { id: 'nectar_flask', kind: 'artifact', name: t('items.nectar_flask.name'), icon: '🍯', rarity: 'common', desc: t('items.nectar_flask.desc'), cd: 18, act: 'charm' },
  { id: 'bag_of_winds', kind: 'artifact', name: t('items.bag_of_winds.name'), icon: '🌬️', rarity: 'rare', desc: t('items.bag_of_winds.desc'), cd: 12, act: 'winds' },
  { id: 'helm_of_darkness', kind: 'artifact', name: t('items.helm_of_darkness.name'), icon: '⛑️', rarity: 'unique', desc: t('items.helm_of_darkness.desc'), cd: 26, act: 'helm' },
  { id: 'winged_shoes', kind: 'artifact', name: t('items.winged_shoes.name'), icon: '👟', rarity: 'common', desc: t('items.winged_shoes.desc'), cd: 14, act: 'shoes' },
  { id: 'greek_fire', kind: 'artifact', name: t('items.greek_fire.name'), icon: '🏺', rarity: 'rare', desc: t('items.greek_fire.desc'), cd: 11, act: 'fire' },
  { id: 'zeus_thunder', kind: 'artifact', name: t('items.zeus_thunder.name'), icon: '⚡', rarity: 'rare', desc: t('items.zeus_thunder.desc'), cd: 14, act: 'lightning' },
  { id: 'orpheus_lyre', kind: 'artifact', name: t('items.orpheus_lyre.name'), icon: '🎵', rarity: 'unique', desc: t('items.orpheus_lyre.desc'), cd: 22, act: 'lyre' },
  { id: 'apple_of_discord', kind: 'artifact', name: t('items.apple_of_discord.name'), icon: '🍎', rarity: 'unique', desc: t('items.apple_of_discord.desc'), cd: 24, act: 'discord' },
  { id: 'athena_owl', kind: 'artifact', name: t('items.athena_owl.name'), icon: '🦉', rarity: 'rare', desc: t('items.athena_owl.desc'), cd: 18, act: 'owl' },
  { id: 'ariadne_thread', kind: 'artifact', name: t('items.ariadne_thread.name'), icon: '🧶', rarity: 'common', desc: t('items.ariadne_thread.desc'), cd: 15, act: 'thread' },
  { id: 'caduceus', kind: 'artifact', name: t('items.caduceus.name'), icon: '🐍', rarity: 'rare', desc: t('items.caduceus.desc'), cd: 22, act: 'snakes' },
  { id: 'boar_tusk', kind: 'artifact', name: t('items.boar_tusk.name'), icon: '🐗', rarity: 'common', desc: t('items.boar_tusk.desc'), cd: 9, act: 'boar' },
  { id: 'trident_charm', kind: 'artifact', name: t('items.trident_charm.name'), icon: '🔱', rarity: 'rare', desc: t('items.trident_charm.desc'), cd: 13, act: 'geyser' },
  { id: 'sun_chariot', kind: 'artifact', name: t('items.sun_chariot.name'), icon: '☀️', rarity: 'rare', desc: t('items.sun_chariot.desc'), cd: 12, act: 'sunbeam' },
  { id: 'kronos_hourglass', kind: 'artifact', name: t('items.kronos_hourglass.name'), icon: '⏳', rarity: 'unique', desc: t('items.kronos_hourglass.desc'), cd: 30, act: 'hourglass' },
  { id: 'cornucopia', kind: 'artifact', name: t('items.cornucopia.name'), icon: '🌽', rarity: 'rare', desc: t('items.cornucopia.desc'), cd: 30, act: 'cornucopia' },
  { id: 'stymphalian_feathers', kind: 'artifact', name: t('items.stymphalian_feathers.name'), icon: '🪶', rarity: 'common', desc: t('items.stymphalian_feathers.desc'), cd: 7, act: 'feathers' },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Item power for a chapter: grows with the difficulty and the profile level.
export function powerFor(difficulty = 1, level = 1, rng = Math.random) {
  return Math.max(1, Math.round(6 + difficulty * 6 + level * 0.8 + rng() * 4 - 2));
}

let uid = Date.now() % 100000;
const options = (kind, exclude) => Object.keys(ENCHANTS).filter((k) => ENCHANTS[k].for.includes(kind) && !exclude.includes(k));

// Roll a concrete item. `power` is the item power (see powerFor); older
// callers pass a small difficulty number, which is converted.
export function rollItem(power = 1, { rarity = null, kind = null, rng = Math.random, id = null, blessed = null, hero = null } = {}) {
  if (power < 6) power = powerFor(power, 1, rng);
  let pool = ITEMS.filter((i) => (!kind || i.kind === kind) && (!id || i.id === id));
  if (!rarity && !id) { const x = rng(); const p = power / 10; rarity = x < 0.04 + p * 0.015 ? 'unique' : x < 0.22 + p * 0.04 ? 'rare' : 'common'; }
  if (rarity) { const r2 = pool.filter((i) => i.rarity === rarity); if (r2.length) pool = r2; }
  // a hero's favourites turn up a little more often for them
  if (hero && rng() < 0.35) { const fav = pool.filter((i) => i.hero === hero); if (fav.length) pool = fav; }
  const base = pool[Math.floor(rng() * pool.length)];
  const R = RARITY[base.rarity];
  const fixed = base.fixed ?? [];
  const used = [...fixed];
  const ench = [];
  for (const f of fixed) ench.push({ options: [f], pick: f, level: 1, fixed: true });
  const rows = Math.max(R.rows, fixed.length);
  while (ench.length < rows) {
    const opts = options(base.kind, used);
    if (!opts.length) break;
    const n = base.rarity === 'common' ? 2 : 3;
    const row = [];
    while (row.length < n && opts.length) { const k = opts.splice(Math.floor(rng() * opts.length), 1)[0]; row.push(k); used.push(k); }
    ench.push({ options: row, pick: null, level: 0 });
  }
  const isBlessed = blessed ?? (rng() < 0.02 + power * 0.002);
  const it = { uid: 'i' + (uid++) + Math.floor(rng() * 1000), id: base.id, power: Math.max(1, Math.round(power + (rng() * 4 - 2))), ench, isNew: true };
  if (isBlessed) {
    const opts = options(base.kind, used);
    if (opts.length) { const k = opts[Math.floor(rng() * opts.length)]; it.blessed = { id: k, level: 3 }; it.power += BLESSED.powerBonus; }
  }
  return normalizeItem(it);
}

// Items saved before enchantment rows had choices: { id, level } → a row.
export function normalizeItem(it) {
  if (!it || !Array.isArray(it.ench)) return it;
  it.ench = it.ench.map((e) => (e.options ? e : { options: [e.id], pick: e.level > 0 ? e.id : null, level: e.level ?? 0, fixed: false }));
  if (!ITEM_BY_ID[it.id]) it.id = ITEMS.find((b) => b.kind === (it.kind ?? 'weapon'))?.id ?? 'training_sword';
  return it;
}
export function itemInfo(it) { return ITEM_BY_ID[it.id] ?? ITEMS[0]; }
export function itemRarity(it) { return it.blessed ? BLESSED : RARITY[itemInfo(it).rarity]; }
export function powerMult(it, hero = null) { const b = itemInfo(it); return (1 + (it.power - 10) * 0.02) * (hero && b.hero === hero ? 1.1 : 1); }
export function spentPoints(it) { return it.ench.reduce((a, e) => a + (e.fixed || !e.pick ? 0 : Array.from({ length: e.level }, (_, i) => enchCost(e.pick, i + 1)).reduce((x, y) => x + y, 0)), 0); }
export function salvageValue(it) { const b = itemInfo(it); return Math.round((b.rarity === 'unique' ? 60 : b.rarity === 'rare' ? 25 : 8) * (it.blessed ? 1.5 : 1) * (1 + (it.power - 10) * 0.03)); }
export function itemPrice(it) { return Math.round(salvageValue(it) * 3.2 + 10); }
// The forge: temper (+1 power) and re-roll an un-invested row's choices.
export function temperCost(it) { return Math.round(10 + it.power * 2.2); }
export function rerollCost(it) { return Math.round(15 + it.power * 1.5); }
export function rerollRow(it, row, rng = Math.random) {
  const e = it.ench[row]; if (!e || e.fixed || e.pick) return false;
  const b = itemInfo(it);
  const used = it.ench.flatMap((x, i) => (i === row ? [] : x.options)).concat(it.blessed ? [it.blessed.id] : []);
  const opts = options(b.kind, used);
  const out = [];
  while (out.length < e.options.length && opts.length) out.push(opts.splice(Math.floor(rng() * opts.length), 1)[0]);
  e.options = out; return true;
}
// The active enchantments of an item: [{ id, level }].
export function activeEnchants(it) {
  const out = it.ench.filter((e) => e.pick && e.level > 0).map((e) => ({ id: e.pick, level: e.level }));
  if (it.blessed) out.push({ ...it.blessed });
  return out;
}

// A hero's stats with this gear (also used to compare items in the inventory).
export function gearStats(gear, hero = null) {
  const s = { damage: 1, armor: 0, speed: 1, cdr: 0, ceGain: 1, crit: 0.08, lifesteal: 0, meleeMult: 1, committed: 0, techMult: 1, healBonus: 0, attackSpeed: 1, reach: 1, arc: 1, knock: 1, maxHp: 100, bane: 0, thorns: 0, luck: 0, regen: 0, evade: 0, quiver: 0, flaskCdr: 0 };
  const procs = {}; let weapon = null; const artifacts = []; let twin = false, pierce = false;
  for (const it of gear) {
    if (!it) continue;
    const b = itemInfo(it); if (!b) continue;
    const pm = powerMult(it, hero) * itemRarity(it).mult;
    if (b.kind === 'weapon') { weapon = it; s.meleeMult *= (b.dmg ?? 1) * pm; s.attackSpeed *= b.speed ?? 1; s.reach *= b.reach ?? 1; s.arc *= b.arc ?? 1; s.knock *= b.knock ?? 1; twin = !!b.twin; pierce = !!b.pierce; }
    if (b.kind === 'armor') { s.maxHp += (b.hp ?? 0) * pm; s.armor += (b.armor ?? 0) + 0.04 * pm; s.cdr += b.cdr ?? 0; s.ceGain += b.ce ?? 0; s.speed += b.speed ?? 0; s.meleeMult += b.meleeMult ?? 0; s.techMult += b.techMult ?? 0; s.regen += b.regen ?? 0; s.evade += b.evade ?? 0; s.quiver += b.quiver ?? 0; s.flaskCdr += b.flaskCdr ?? 0; }
    if (b.kind === 'artifact') { artifacts.push({ it, base: b, cdLeft: 0, cd: b.cd }); s.techMult += 0.04 * pm; }
    for (const e of activeEnchants(it)) {
      const E = ENCHANTS[e.id]; if (!E) continue;
      E.stat?.(s, e.level);
      if (E.proc) procs[E.proc] = Math.max(procs[E.proc] ?? 0, e.level);
    }
  }
  s.armor = Math.min(0.7, s.armor); s.cdr = Math.min(0.6, s.cdr); s.evade = Math.min(0.3, s.evade); s.flaskCdr = Math.min(0.6, s.flaskCdr);
  return { s, procs, weapon, artifacts, twin, pierce };
}

// Fold equipped gear into a player's stats.
export function applyGear(player, gear) {
  const { s, procs, weapon, artifacts, twin, pierce } = gearStats(gear, player.hero);
  Object.assign(player.stats, s);
  player.procs = procs; player.weapon = weapon; player.artifacts = artifacts;
  player.weaponTwin = twin; player.weaponPierce = pierce;
  const frac = player.hp / player.maxHp;
  player.maxHp = s.maxHp; player.hp = Math.min(player.maxHp, Math.max(1, frac * player.maxHp));
}

// Chest / boss loot: how many items and of what rarity, for ONE player.
export function rollChest(difficulty, kind = 'common', { rng = Math.random, level = 1, hero = null } = {}) {
  const power = powerFor(difficulty, level, rng);
  const out = [];
  const n = kind === 'boss' ? 2 : kind === 'rare' ? 1 + (rng() < 0.5 ? 1 : 0) : 1;
  for (let i = 0; i < n; i++) out.push(rollItem(power, { rng, hero, rarity: kind === 'boss' && i === 0 ? (rng() < 0.45 ? 'unique' : 'rare') : kind === 'rare' && i === 0 ? 'rare' : null, blessed: kind === 'boss' && difficulty >= 3 && rng() < 0.25 ? true : null }));
  return out;
}
export { mulberry32 };
