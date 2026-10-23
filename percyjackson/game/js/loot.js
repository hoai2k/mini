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
//
// Rarity is a tier rolled for each drop (design/loot-design.md §4): Common,
// Rare, Heroic (a Common or Rare base raised a tier, as Minecraft Dungeons
// II's Special) and Legendary (`unique`, a Legendary base). The tier decides
// the enchantment rows and the boons (small rolled stats); a little hidden
// strength (`mult`) is all that is left of the old rarity multiplier.
import { mulberry32 } from './util.js';
import { itemPowerFor, powerMult as strength, levelOfPower, rollTier, levelForGear, blessedChance, POWER_STEP, PITY_AT, PITY_SOURCES, rarityCost, reforgePower, OUTDATED_BY,
  BOSS_ITEMS, CHEST_ITEMS, SIGNATURE_REPEAT, SIGNATURE_BLESSED_AT, CHAPTER_COINS, RARITY_TIERS } from './progression.js';
import { t } from './text_config.js';

// rows: enchantment rows · choices: options per row · boons: rolled boons ·
// mult: hidden strength (was 1 / 1.12 / 1.25; §4.1)
export const RARITY = {
  common: { id: 'common', label: t('rarity.common'), color: '#d8cfbd', rows: 1, choices: 2, boons: 0, mult: 1 },
  rare: { id: 'rare', label: t('rarity.rare'), color: '#3fe0b0', rows: 2, choices: 3, boons: 1, mult: 1.02 },
  heroic: { id: 'heroic', label: t('rarity.heroic'), color: '#b884ff', rows: 2, choices: 3, boons: 2, mult: 1.05 },
  unique: { id: 'unique', label: t('rarity.unique'), color: '#ff9a2a', rows: 3, choices: 3, boons: 1, mult: 1.08 },
};
export const BLESSED = { label: t('rarity.blessed'), color: '#ffd84a', powerBonus: 2 };
export const KIND_LABEL = { weapon: t('loot.kind.weapon'), armor: t('loot.kind.armor'), artifact: t('loot.kind.artifact') };

// Enchantments. `stat` folds into the hero's stats (s, level, pm: the
// item's strength), `proc` turns on an effect in combat (combat.js,
// entities/player.js, main.js onEnemyKilled). Costs per level: 1/2/3,
// powerful ones 2/3/4. `icon` shows next to the name; every enchantment has
// a plain-words line (enchantments.<id>.plain) and a detail with numbers.
// Damage bonuses multiply (meleePct / techPct), so they stay worth having
// on a level-12 sword as on the training sword.
export const ENCHANTS = {
  // weapons
  sharpness: { icon: '🗡️', name: t('enchantments.sharpness.name'), desc: (l) => t('enchantments.sharpness.desc', { n: l * 10 }), for: ['weapon'], stat: (s, l) => { s.meleePct += 0.1 * l; } },
  swirling: { icon: '🌀', name: t('enchantments.swirling.name'), desc: (l) => t('enchantments.swirling.desc', { n: 40 + l * 20 }), for: ['weapon'], proc: 'swirl' },
  committed: { icon: '🎯', name: t('enchantments.committed.name'), desc: (l) => t('enchantments.committed.desc', { n: l * 15 }), for: ['weapon'], stat: (s, l) => { s.committed += 0.15 * l; } },
  rampaging: { icon: '😤', name: t('enchantments.rampaging.name'), desc: (l) => t('enchantments.rampaging.desc', { n: l * 10 }), for: ['weapon'], proc: 'rampage' },
  leeching: { icon: '🍯', name: t('enchantments.leeching.name'), desc: (l) => t('enchantments.leeching.desc', { n: l * 2 }), for: ['weapon'], proc: 'leech' },
  lifesteal: { icon: '❤️', name: t('enchantments.lifesteal.name'), desc: (l) => t('enchantments.lifesteal.desc', { n: PROC.lifesteal(l) * 100 }), for: ['weapon'], stat: (s, l) => { s.lifesteal += PROC.lifesteal(l); } },
  fire_aspect: { icon: '🔥', name: t('enchantments.fire_aspect.name'), desc: (l) => t('enchantments.fire_aspect.desc', { n: Math.round(PROC.burn(l) * 100), s: PROC.burnFor }), for: ['weapon'], proc: 'burn' },
  exploding: { icon: '💥', name: t('enchantments.exploding.name'), desc: (l) => t('enchantments.exploding.desc', { n: l * 20 }), for: ['weapon'], proc: 'explode', powerful: true },
  freezing: { icon: '❄️', name: t('enchantments.freezing.name'), desc: (l) => t('enchantments.freezing.desc', { n: (1 + l * 0.4).toFixed(1), c: Math.round(PROC.freeze(l) * 100) }), for: ['weapon'], proc: 'freeze' },
  chain_lightning: { icon: '⛓️', name: t('enchantments.chain_lightning.name'), desc: (l) => t('enchantments.chain_lightning.desc', { c: Math.round(PROC.chain(l) * 100), n: PROC.chainTargets(l), d: Math.round(PROC.chainDmg * 100) }), for: ['weapon'], proc: 'chain', powerful: true },
  shockwave: { icon: '💨', name: t('enchantments.shockwave.name'), desc: (l) => t('enchantments.shockwave.desc', { c: Math.round(PROC.shock(l) * 100) }), for: ['weapon'], proc: 'shock' },
  critical: { icon: '👁️', name: t('enchantments.critical.name'), desc: (l) => t('enchantments.critical.desc', { n: l * 5 }), for: ['weapon', 'artifact'], stat: (s, l) => { s.crit += 0.05 * l; } },
  thundering: { icon: '⚡', name: t('enchantments.thundering.name'), desc: (l) => t('enchantments.thundering.desc', { n: l * 8 }), for: ['weapon'], proc: 'thunder', powerful: true },
  echo: { icon: '🔁', name: t('enchantments.echo.name'), desc: (l) => t('enchantments.echo.desc', { n: l * 10 }), for: ['weapon'], proc: 'echo' },
  bane: { icon: '👑', name: t('enchantments.bane.name'), desc: (l) => t('enchantments.bane.desc', { n: l * 20 }), for: ['weapon'], stat: (s, l) => { s.bane += 0.2 * l; } },
  // armour
  health: { icon: '💗', name: t('enchantments.health.name'), desc: (l) => t('enchantments.health.desc', { n: l * 15 }), for: ['armor'], stat: (s, l, pm = 1) => { s.maxHp += 15 * l * pm; } },
  protection: { icon: '🛡️', name: t('enchantments.protection.name'), desc: (l) => t('enchantments.protection.desc', { n: l * 6 }), for: ['armor'], stat: (s, l) => { s.armor += 0.06 * l; } },
  swiftness: { icon: '👟', name: t('enchantments.swiftness.name'), desc: (l) => t('enchantments.swiftness.desc', { n: l * 6 }), for: ['armor'], stat: (s, l) => { s.speed += 0.06 * l; } },
  speed_synergy: { icon: '🪽', name: t('enchantments.speed_synergy.name'), desc: (l) => t('enchantments.speed_synergy.desc', { n: PROC.hasteFor(l) }), for: ['armor'], proc: 'haste' },
  cooldown: { icon: '⏱️', name: t('enchantments.cooldown.name'), desc: (l) => t('enchantments.cooldown.desc', { n: l * 8, n2: l * 4 }), for: ['armor', 'artifact'], stat: (s, l) => { s.cdr += 0.08 * l; } },
  surge: { icon: '🌟', name: t('enchantments.surge.name'), desc: (l) => t('enchantments.surge.desc', { n: l * 15 }), for: ['armor', 'artifact'], stat: (s, l) => { s.ceGain += 0.15 * l; } },
  potency: { icon: '✨', name: t('enchantments.potency.name'), desc: (l) => t('enchantments.potency.desc', { n: l * 10 }), for: ['armor', 'artifact'], stat: (s, l) => { s.techPct += 0.1 * l; } },
  vitality: { icon: '☀️', name: t('enchantments.vitality.name'), desc: (l) => t('enchantments.vitality.desc', { n: l * 10 }), for: ['armor'], stat: (s, l) => { s.healBonus += 0.1 * l; } },
  potion_barrier: { icon: '🫧', name: t('enchantments.potion_barrier.name'), desc: (l) => t('enchantments.potion_barrier.desc', { n: PROC.barrierFor(l) }), for: ['armor'], proc: 'barrier' },
  nectar: { icon: '🍷', name: t('enchantments.nectar.name'), desc: (l) => t('enchantments.nectar.desc', { n: l * 12 }), for: ['armor', 'artifact'], stat: (s, l) => { s.flaskCdr += 0.12 * l; } },
  quiver: { icon: '🏹', name: t('enchantments.quiver.name'), desc: (l) => t('enchantments.quiver.desc', { n: l * 5 }), for: ['armor'], stat: (s, l) => { s.quiver += 5 * l; } },
  thorns: { icon: '🌵', name: t('enchantments.thorns.name'), desc: (l) => t('enchantments.thorns.desc', { n: l * 25 }), for: ['armor'], stat: (s, l) => { s.thorns += 0.25 * l; } },
  embers: { icon: '🔥', name: t('enchantments.embers.name'), desc: (l) => t('enchantments.embers.desc', { n: l * 6 }), for: ['armor'], proc: 'embers', powerful: true },
  evasion: { icon: '💨', name: t('enchantments.evasion.name'), desc: (l) => t('enchantments.evasion.desc', { n: l * 4 }), for: ['armor'], stat: (s, l) => { s.evade += 0.04 * l; } },
  lucky: { icon: '🍀', name: t('enchantments.lucky.name'), desc: (l) => t('enchantments.lucky.desc', { n: l * 25 }), for: ['armor', 'artifact'], stat: (s, l) => { s.luck += 0.25 * l; } },
  // loot (§4.3: MCD2's Looter and Raider)
  hermes_haul: { icon: '🎒', name: t('enchantments.hermes_haul.name'), desc: (l) => t('enchantments.hermes_haul.desc', { n: Math.round(PROC.haul(l) * 100) }), for: ['armor', 'artifact'], stat: (s, l) => { s.lootChance += PROC.haul(l); } },
  tyche_favour: { icon: '🎲', name: t('enchantments.tyche_favour.name'), desc: (l) => t('enchantments.tyche_favour.desc', { n: Math.round(PROC.raider(l) * 100) }), for: ['armor', 'artifact'], stat: (s, l) => { s.raider += PROC.raider(l); }, powerful: true },
  // the Chimera's fang
  venom: { icon: '🐍', name: t('enchantments.venom.name'), desc: (l) => t('enchantments.venom.desc', { n: Math.round(PROC.venom(l) * 100), s: PROC.venomFor, p: Math.round(PROC.venomSlow * 100) }), for: ['weapon'], proc: 'venom' },
};
// The numbers behind the effects (combat.js and player.js use these, so the
// text and the game always agree). l: the enchantment's level, 1-3.
export const PROC = {
  lifesteal: (l) => [0, 0.03, 0.05, 0.07][l] ?? 0.07,   // share of melee damage dealt that heals you
  burn: (l) => 0.1 + 0.08 * l,                          // a hit's burn per second, as a share of the hit
  burnFor: 3,                                           // seconds a monster burns
  freeze: (l) => 0.05 * l,                              // chance a hit freezes a monster solid
  freezeFor: 1.2,                                       // seconds frozen solid
  chain: (l) => [0, 0.15, 0.22, 0.3][l] ?? 0.3,         // chance a hit sends lightning leaping
  chainTargets: (l) => l + 1,                           // monsters it leaps to
  chainDmg: 0.4, chainRange: 6,                          // share of the hit, metres between leaps
  shock: (l) => [0, 0.12, 0.18, 0.24][l] ?? 0.24,       // chance a hit bursts out, shoving monsters back
  shockDmg: 0.3, shockRadius: 3.2, shockKnock: 7,
  hasteFor: (l) => 2 + l,                                // seconds of +30% speed after a magic item
  barrierFor: (l) => 1 + l,                              // seconds of half damage after Ambrosia
  venom: (l) => 0.04 + 0.04 * l,                         // a hit's poison per second, as a share of the hit (8 / 12 / 16%)
  venomFor: 4, venomSlow: 0.2,                           // seconds poisoned, and the slow while it lasts
  haul: (l) => [0, 0.01, 0.02, 0.04][l] ?? 0.04,         // Hermes's Haul: added chance a monster drops an item
  raider: (l) => [0, 0.04, 0.07, 0.1][l] ?? 0.1,         // Tyche's Favour: chance a drop rolls a tier higher
};

// Boons (§4.1): small rolled stats, one line each on the item, never the same
// twice on one item. Each rolls uniformly in [min, max]; `int` ones are whole
// numbers. apply(s, v, pm): pm is the item's strength.
export const BOONS = {
  keen: { for: ['weapon'], min: 0.04, max: 0.08, apply: (s, v) => { s.meleePct += v; } },
  swift: { for: ['weapon'], min: 0.04, max: 0.08, apply: (s, v) => { s.attackSpeed *= 1 + v; } },
  giant: { for: ['weapon'], min: 0.06, max: 0.12, apply: (s, v) => { s.bane += v; } },
  vicious: { for: ['weapon'], min: 0.02, max: 0.04, apply: (s, v) => { s.crit += v; } },
  reach: { for: ['weapon'], min: 0.04, max: 0.08, apply: (s, v) => { s.reach *= 1 + v; } },
  sturdy: { for: ['armor'], min: 8, max: 15, int: true, apply: (s, v, pm = 1) => { s.maxHp += v * pm; } },
  guarded: { for: ['armor'], min: 0.02, max: 0.04, apply: (s, v) => { s.armor += v; } },
  fleet: { for: ['armor'], min: 0.03, max: 0.06, apply: (s, v) => { s.speed += v; } },
  focused: { for: ['armor', 'artifact'], min: 0.03, max: 0.06, apply: (s, v) => { s.cdr += v; } },
  hale: { for: ['armor'], min: 0.05, max: 0.1, apply: (s, v) => { s.healBonus += v; } },
  deep: { for: ['armor'], min: 1, max: 3, int: true, apply: (s, v) => { s.quiver += v; } },
  potent: { for: ['artifact'], min: 0.05, max: 0.1, apply: (s, v) => { s.techPct += v; } },
  surging: { for: ['artifact', 'armor'], min: 0.05, max: 0.1, apply: (s, v) => { s.ceGain += v; } },
  lasting: { for: ['artifact'], min: 0.1, max: 0.2, apply: () => {} },   // (this magic item's effect lasts longer: artifacts.js)
  fortunate: { for: ['weapon', 'armor', 'artifact'], min: 0.05, max: 0.1, apply: (s, v) => { s.luck += v; } },
};
// The words for a boon: "+6% melee damage".
export const boonText = (b) => { const B = BOONS[b.id]; return B ? t(`boons.${b.id}.desc`, { n: B.int ? b.v : Math.round(b.v * 100) }) : ''; };
export const boonName = (b) => t(`boons.${b.id}.name`);
export function rollBoons(kind, n, rng = Math.random) {
  const opts = Object.keys(BOONS).filter((k) => BOONS[k].for.includes(kind)), out = [];
  while (out.length < n && opts.length) {
    const id = opts.splice(Math.floor(rng() * opts.length), 1)[0], B = BOONS[id];
    const raw = B.min + rng() * (B.max - B.min);
    out.push({ id, v: B.int ? Math.round(raw) : Math.round(raw * 100) / 100 });
  }
  return out;
}
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
  { id: 'backbiter', kind: 'weapon', name: t('items.backbiter.name'), icon: '🗡️', rarity: 'unique', desc: t('items.backbiter.desc'), dmg: 1.4, speed: 1.05, reach: 1.1, pierce: true, fixed: ['committed'], sig: 'luke' },
  { id: 'stygian_blade', kind: 'weapon', name: t('items.stygian_blade.name'), icon: '🖤', rarity: 'unique', desc: t('items.stygian_blade.desc'), dmg: 1.35, speed: 1.0, fixed: ['leeching'] },
  { id: 'twin_daggers', kind: 'weapon', name: t('items.twin_daggers.name'), icon: '🌙', rarity: 'unique', desc: t('items.twin_daggers.desc'), dmg: 1.1, speed: 1.25, twin: true, hero: 'annabeth', fixed: ['critical'] },
  { id: 'imperial_gladius', kind: 'weapon', name: t('items.imperial_gladius.name'), icon: '🏛️', rarity: 'unique', desc: t('items.imperial_gladius.desc'), dmg: 1.45, speed: 1.1, fixed: ['sharpness'] },
  { id: 'harpe', kind: 'weapon', name: t('items.harpe.name'), icon: '🌙', rarity: 'unique', desc: t('items.harpe.desc'), dmg: 1.35, speed: 1.05, reach: 1.1, fixed: ['bane'] },
  { id: 'heracles_club', kind: 'weapon', name: t('items.heracles_club.name'), icon: '🏏', rarity: 'unique', desc: t('items.heracles_club.desc'), dmg: 1.6, speed: 0.75, arc: 1.3, knock: 2.2, hero: 'tyson', fixed: ['thundering'] },
  { id: 'pelian_spear', kind: 'weapon', name: t('items.pelian_spear.name'), icon: '🔱', rarity: 'unique', desc: t('items.pelian_spear.desc'), dmg: 1.4, speed: 1.0, reach: 1.45, arc: 0.7, pierce: true, hero: 'clarisse', fixed: ['critical'] },
  { id: 'ares_sword', kind: 'weapon', name: t('items.ares_sword.name'), icon: '🔥', rarity: 'unique', desc: t('items.ares_sword.desc'), dmg: 1.5, speed: 0.95, arc: 1.2, fixed: ['exploding'], sig: 'ares' },
  { id: 'fang_dagger', kind: 'weapon', name: t('items.fang_dagger.name'), icon: '🦷', rarity: 'rare', desc: t('items.fang_dagger.desc'), dmg: 1.1, speed: 1.2, reach: 0.95, hero: 'annabeth', fixed: ['lifesteal'] },
  { id: 'ram_mace', kind: 'weapon', name: t('items.ram_mace.name'), icon: '🐏', rarity: 'rare', desc: t('items.ram_mace.desc'), dmg: 1.3, speed: 0.85, knock: 1.5, hero: 'tyson', fixed: ['shockwave'] },
  { id: 'forge_sword', kind: 'weapon', name: t('items.forge_sword.name'), icon: '🔥', rarity: 'rare', desc: t('items.forge_sword.desc'), dmg: 1.2, speed: 1.0, fixed: ['fire_aspect'] },
  { id: 'boreas_axe', kind: 'weapon', name: t('items.boreas_axe.name'), icon: '🧊', rarity: 'unique', desc: t('items.boreas_axe.desc'), dmg: 1.45, speed: 0.9, arc: 1.4, fixed: ['freezing'] },
  { id: 'storm_spear', kind: 'weapon', name: t('items.storm_spear.name'), icon: '🌩️', rarity: 'unique', desc: t('items.storm_spear.desc'), dmg: 1.4, speed: 1.0, reach: 1.4, arc: 0.7, hero: 'clarisse', fixed: ['chain_lightning'] },
  { id: 'trident_blade', kind: 'weapon', name: t('items.trident_blade.name'), icon: '🌊', rarity: 'unique', desc: t('items.trident_blade.desc'), dmg: 1.45, speed: 1.05, knock: 1.5, hero: 'percy', fixed: ['swirling'] },
  // (loot rework: the chapter bosses' signatures, design/loot-design.md §4.4-4.5; `sig`: the boss)
  { id: 'hunter_knives', kind: 'weapon', name: t('items.hunter_knives.name'), icon: '🌘', rarity: 'rare', desc: t('items.hunter_knives.desc'), dmg: 1.0, speed: 1.3, reach: 0.9, twin: true, hero: 'annabeth' },
  { id: 'fury_lash', kind: 'weapon', name: t('items.fury_lash.name'), icon: '➰', rarity: 'unique', desc: t('items.fury_lash.desc'), dmg: 1.3, speed: 1.1, reach: 1.55, arc: 0.8, fixed: ['fire_aspect'], sig: 'alecto' },
  { id: 'minotaur_horn', kind: 'weapon', name: t('items.minotaur_horn.name'), icon: '🐂', rarity: 'unique', desc: t('items.minotaur_horn.desc'), dmg: 1.45, speed: 1.0, knock: 1.7, hero: 'percy', fixed: ['rampaging'], sig: 'minotaur' },
  { id: 'chimera_fang', kind: 'weapon', name: t('items.chimera_fang.name'), icon: '🦁', rarity: 'unique', desc: t('items.chimera_fang.desc'), dmg: 1.4, speed: 1.0, reach: 1.4, arc: 0.7, hero: 'clarisse', fixed: ['venom'], sig: 'chimera' },
  { id: 'procrustes_axe', kind: 'weapon', name: t('items.procrustes_axe.name'), icon: '🪓', rarity: 'unique', desc: t('items.procrustes_axe.desc'), dmg: 1.55, speed: 0.85, arc: 1.5, hero: 'tyson', fixed: ['committed'], sig: 'procrustes' },
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
  { id: 'hebe_robe', kind: 'armor', name: t('items.hebe_robe.name'), icon: '👘', rarity: 'rare', desc: t('items.hebe_robe.desc'), hp: 25, armor: 0.05, flaskCdr: 0.1, fixed: ['potion_barrier'] },
  { id: 'wind_cloak', kind: 'armor', name: t('items.wind_cloak.name'), icon: '🌬️', rarity: 'rare', desc: t('items.wind_cloak.desc'), hp: 20, speed: 0.08, cdr: 0.06, hero: 'percy', fixed: ['speed_synergy'] },
  { id: 'hermes_cap', kind: 'armor', name: t('items.hermes_cap.name'), icon: '🪽', rarity: 'unique', desc: t('items.hermes_cap.desc'), hp: 25, speed: 0.14, cdr: 0.08, evade: 0.06, hero: 'grover', fixed: ['swiftness'] },
  { id: 'counsellor_vest', kind: 'armor', name: t('items.counsellor_vest.name'), icon: '🦺', rarity: 'common', desc: t('items.counsellor_vest.desc'), hp: 18, armor: 0.05, cdr: 0.04 },
  { id: 'lotus_robe', kind: 'armor', name: t('items.lotus_robe.name'), icon: '🪷', rarity: 'rare', desc: t('items.lotus_robe.desc'), hp: 20, regen: 1.2, flaskCdr: 0.08 },
  { id: 'mist_cloak', kind: 'armor', name: t('items.mist_cloak.name'), icon: '🌫️', rarity: 'rare', desc: t('items.mist_cloak.desc'), hp: 20, evade: 0.07, speed: 0.04, hero: 'grover' },
  { id: 'fury_wings', kind: 'armor', name: t('items.fury_wings.name'), icon: '🦇', rarity: 'unique', desc: t('items.fury_wings.desc'), hp: 30, speed: 0.1, evade: 0.06, fixed: ['speed_synergy'], sig: 'furies' },
  { id: 'hellhound_hide', kind: 'armor', name: t('items.hellhound_hide.name'), icon: '🐺', rarity: 'unique', desc: t('items.hellhound_hide.desc'), hp: 40, armor: 0.12, speed: 0.06, fixed: ['thorns'], sig: 'hellhound_alpha' },
  { id: 'drakon_scale', kind: 'armor', name: t('items.drakon_scale.name'), icon: '🐉', rarity: 'unique', desc: t('items.drakon_scale.desc'), hp: 50, armor: 0.2, speed: -0.04, hero: 'tyson', fixed: ['protection'], sig: 'drakon' },
  // ---------------------------------------------------------------- magic items
  // cd: cooldown in seconds · act: what it does (see artifacts.js) ·
  // charges: uses before it must recharge (one comes back every cooldown)
  { id: 'master_bolt', kind: 'artifact', name: t('items.master_bolt.name'), icon: '🌩️', rarity: 'unique', desc: t('items.master_bolt.desc'), cd: 9, act: 'spear', charges: 2 },
  { id: 'hephaestus_net', kind: 'artifact', name: t('items.hephaestus_net.name'), icon: '🕸️', rarity: 'rare', desc: t('items.hephaestus_net.desc'), cd: 8, act: 'chain' },
  { id: 'medusa_head', kind: 'artifact', name: t('items.medusa_head.name'), icon: '🐍', rarity: 'unique', desc: t('items.medusa_head.desc'), cd: 20, act: 'prison', sig: 'medusa' },
  { id: 'nemesis_coin', kind: 'artifact', name: t('items.nemesis_coin.name'), icon: '🪙', rarity: 'rare', desc: t('items.nemesis_coin.desc'), cd: 10, act: 'doll' },
  { id: 'aegis', kind: 'artifact', name: t('items.aegis.name'), icon: '🛡️', rarity: 'common', desc: t('items.aegis.desc'), cd: 16, act: 'barrier' },
  { id: 'pegasus_whistle', kind: 'artifact', name: t('items.pegasus_whistle.name'), icon: '🐴', rarity: 'rare', desc: t('items.pegasus_whistle.desc'), cd: 22, act: 'pegasus' },
  { id: 'nectar_flask', kind: 'artifact', name: t('items.nectar_flask.name'), icon: '🍯', rarity: 'common', desc: t('items.nectar_flask.desc'), cd: 18, act: 'charm' },
  { id: 'bag_of_winds', kind: 'artifact', name: t('items.bag_of_winds.name'), icon: '🌬️', rarity: 'rare', desc: t('items.bag_of_winds.desc'), cd: 12, act: 'winds' },
  { id: 'helm_of_darkness', kind: 'artifact', name: t('items.helm_of_darkness.name'), icon: '⛑️', rarity: 'unique', desc: t('items.helm_of_darkness.desc'), cd: 26, act: 'helm' },
  { id: 'winged_shoes', kind: 'artifact', name: t('items.winged_shoes.name'), icon: '👟', rarity: 'common', desc: t('items.winged_shoes.desc'), cd: 14, act: 'shoes', charges: 2 },
  { id: 'greek_fire', kind: 'artifact', name: t('items.greek_fire.name'), icon: '🏺', rarity: 'rare', desc: t('items.greek_fire.desc'), cd: 11, act: 'fire', charges: 2 },
  { id: 'zeus_thunder', kind: 'artifact', name: t('items.zeus_thunder.name'), icon: '⚡', rarity: 'rare', desc: t('items.zeus_thunder.desc'), cd: 14, act: 'lightning' },
  { id: 'orpheus_lyre', kind: 'artifact', name: t('items.orpheus_lyre.name'), icon: '🎵', rarity: 'unique', desc: t('items.orpheus_lyre.desc'), cd: 22, act: 'lyre' },
  { id: 'apple_of_discord', kind: 'artifact', name: t('items.apple_of_discord.name'), icon: '🍎', rarity: 'unique', desc: t('items.apple_of_discord.desc'), cd: 24, act: 'discord' },
  { id: 'athena_owl', kind: 'artifact', name: t('items.athena_owl.name'), icon: '🦉', rarity: 'rare', desc: t('items.athena_owl.desc'), cd: 18, act: 'owl' },
  { id: 'ariadne_thread', kind: 'artifact', name: t('items.ariadne_thread.name'), icon: '🧶', rarity: 'common', desc: t('items.ariadne_thread.desc'), cd: 15, act: 'thread' },
  { id: 'caduceus', kind: 'artifact', name: t('items.caduceus.name'), icon: '🐍', rarity: 'rare', desc: t('items.caduceus.desc'), cd: 22, act: 'snakes' },
  { id: 'boar_tusk', kind: 'artifact', name: t('items.boar_tusk.name'), icon: '🐗', rarity: 'common', desc: t('items.boar_tusk.desc'), cd: 9, act: 'boar', charges: 2 },
  { id: 'trident_charm', kind: 'artifact', name: t('items.trident_charm.name'), icon: '🔱', rarity: 'rare', desc: t('items.trident_charm.desc'), cd: 13, act: 'geyser' },
  { id: 'sun_chariot', kind: 'artifact', name: t('items.sun_chariot.name'), icon: '☀️', rarity: 'rare', desc: t('items.sun_chariot.desc'), cd: 12, act: 'sunbeam' },
  { id: 'kronos_hourglass', kind: 'artifact', name: t('items.kronos_hourglass.name'), icon: '⏳', rarity: 'unique', desc: t('items.kronos_hourglass.desc'), cd: 30, act: 'hourglass' },
  { id: 'cornucopia', kind: 'artifact', name: t('items.cornucopia.name'), icon: '🌽', rarity: 'rare', desc: t('items.cornucopia.desc'), cd: 30, act: 'cornucopia' },
  { id: 'stymphalian_feathers', kind: 'artifact', name: t('items.stymphalian_feathers.name'), icon: '🪶', rarity: 'common', desc: t('items.stymphalian_feathers.desc'), cd: 7, act: 'feathers', charges: 3 },
  { id: 'ares_shield', kind: 'artifact', name: t('items.ares_shield.name'), icon: '🛡️', rarity: 'unique', desc: t('items.ares_shield.desc'), cd: 16, act: 'bulwark', sig: 'spiders' },
  { id: 'lotus_card', kind: 'artifact', name: t('items.lotus_card.name'), icon: '🃏', rarity: 'unique', desc: t('items.lotus_card.desc'), cd: 24, act: 'lotus', sig: 'lt8' },
  { id: 'cerberus_ball', kind: 'artifact', name: t('items.cerberus_ball.name'), icon: '🔴', rarity: 'unique', desc: t('items.cerberus_ball.desc'), cd: 22, act: 'fetch', sig: 'cerberus' },
  { id: 'dionysus_vine', kind: 'artifact', name: t('items.dionysus_vine.name'), icon: '🍇', rarity: 'rare', desc: t('items.dionysus_vine.desc'), cd: 14, act: 'vines' },
  { id: 'hermes_vitamins', kind: 'artifact', name: t('items.hermes_vitamins.name'), icon: '💊', rarity: 'rare', desc: t('items.hermes_vitamins.desc'), cd: 15, act: 'vitamins', charges: 2 },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Each chapter boss's signature Legendary (§4.4), by the boss id of the
// chapter (story/chapters.js `boss`; lt8, the casino escape, has none: its
// chapter reward is the signature). drakon: the drakon-type champions.
export const BOSS_SIGNATURE = Object.fromEntries(ITEMS.filter((i) => i.sig).map((i) => [i.sig, i.id]));
export const signatureKey = (chapterId, bossId) => (bossId && BOSS_SIGNATURE[bossId] ? bossId : BOSS_SIGNATURE[chapterId] ? chapterId : null);

// Loot pools by place (§4.5, MCD2's area pools): an item carrying one of a
// place's tags gets ×TAG_WEIGHT in that place's drops. Nothing is locked away.
export const TAG_WEIGHT = 3;
export const ITEM_TAGS = {
  training_sword: ['mortal'], bronze_dagger: ['hunt'], camp_spear: ['war'], club: ['wild'], bronze_axe: ['forge'], shepherd_crook: ['wild'],
  xiphos: ['sea', 'war'], hammer: ['forge'], reed_staff: ['wild'], lamer: ['storm', 'war'], labrys: ['war'], kopis: ['war'], dory: ['war'],
  backbiter: ['war', 'underworld'], stygian_blade: ['underworld'], twin_daggers: ['hunt'], imperial_gladius: ['war'], harpe: ['storm'], heracles_club: ['wild'],
  pelian_spear: ['war'], ares_sword: ['war', 'fire'], fang_dagger: ['underworld'], ram_mace: ['wild'], forge_sword: ['forge', 'fire'], boreas_axe: ['storm'],
  storm_spear: ['storm'], trident_blade: ['sea'], hunter_knives: ['hunt'], fury_lash: ['fire', 'underworld'], minotaur_horn: ['wild', 'storm'],
  chimera_fang: ['fire', 'wild'], procrustes_axe: ['mortal', 'forge'],
  camp_shirt: ['mortal'], bronze_breastplate: ['forge'], hermes_uniform: ['mortal'], linothorax: ['war'], biker_jacket: ['war', 'mortal'], hunter_parka: ['hunt'],
  sea_armor: ['sea'], hoplite_panoply: ['war'], spartan_cloak: ['war'], satyr_vest: ['wild'], nemean_pelt: ['wild', 'hunt'], fleece_cloak: ['sea', 'wild'],
  forge_apron: ['forge', 'fire'], amazon_armor: ['hunt', 'war'], achilles_armor: ['war', 'underworld'], hebe_robe: ['storm'], wind_cloak: ['storm', 'sea'],
  hermes_cap: ['mortal', 'storm'], counsellor_vest: ['mortal'], lotus_robe: ['lotus'], mist_cloak: ['mortal', 'wild'], fury_wings: ['underworld'],
  hellhound_hide: ['underworld', 'hunt'], drakon_scale: ['fire', 'war'],
  master_bolt: ['storm'], hephaestus_net: ['forge'], medusa_head: ['mortal', 'wild'], nemesis_coin: ['war'], aegis: ['storm', 'war'], pegasus_whistle: ['storm', 'wild'],
  nectar_flask: ['mortal'], bag_of_winds: ['storm', 'sea'], helm_of_darkness: ['underworld'], winged_shoes: ['mortal', 'storm'], greek_fire: ['fire', 'forge'],
  zeus_thunder: ['storm'], orpheus_lyre: ['underworld'], apple_of_discord: ['war'], athena_owl: ['war', 'hunt'], ariadne_thread: ['forge'], caduceus: ['mortal'],
  boar_tusk: ['wild', 'hunt'], trident_charm: ['sea'], sun_chariot: ['fire', 'storm'], kronos_hourglass: ['underworld'], cornucopia: ['wild'], stymphalian_feathers: ['wild', 'hunt'],
  ares_shield: ['war', 'forge', 'sea'], lotus_card: ['lotus', 'mortal'], cerberus_ball: ['underworld'], dionysus_vine: ['wild', 'lotus'], hermes_vitamins: ['mortal'],
};
for (const i of ITEMS) i.tags = ITEM_TAGS[i.id] ?? [];
// The tags of a place: a chapter's biome, an open-world region or a Road West stop.
export const PLACE_TAGS = {
  // chapters (world/biomes.js)
  manhattan: ['mortal'], museum: ['mortal', 'war'], storm_hill: ['storm', 'wild'], camp_woods: ['wild', 'hunt'], highway: ['mortal', 'underworld'],
  statue_garden: ['wild', 'mortal'], arch: ['fire', 'mortal'], waterland: ['sea', 'forge'], casino: ['lotus', 'mortal'], desert: ['fire', 'war'],
  underworld: ['underworld'], beach: ['sea', 'war'], olympus: ['storm', 'war'],
  // the open world (world/regions/) and the Road West (world/road/)
  camp: ['mortal', 'hunt'], fields: ['wild', 'hunt'], woods: ['wild', 'hunt'], shore: ['sea', 'storm'], canyon: ['fire', 'war'], labyrinth: ['forge', 'underworld'],
  othrys: ['war', 'storm'], asphodel: ['underworld'],
  rt_turnpike: ['mortal', 'underworld'], rt_auntyem: ['wild', 'mortal'], rt_stlouis: ['fire', 'mortal'], rt_denver: ['sea', 'forge'], rt_vegas: ['lotus', 'mortal'],
  rt_desert: ['fire', 'war'], rt_la: ['underworld', 'mortal'], rt_santamonica: ['sea', 'war'],
};
export const placeTags = (place) => (Array.isArray(place) ? place : PLACE_TAGS[place] ?? PLACE_TAGS[String(place ?? '').replace(/^ow_/, '')] ?? []);

// Item power for a place: its monster level (1-12, a chapter's level, a
// chest's spot), the player's level and the source (progression.js). Older
// callers passed a difficulty 1-4: at the low levels that is the same thing.
export function powerFor(area = 1, level = 1, rng = Math.random, source = 'chest') {
  return itemPowerFor(area, level, source, rng);
}

let uid = Date.now() % 100000;
const options = (kind, exclude) => Object.keys(ENCHANTS).filter((k) => ENCHANTS[k].for.includes(kind) && !exclude.includes(k));
const TIER_UP = { common: 'rare', rare: 'heroic', heroic: 'unique', unique: 'unique' };
export const isTier = (x) => RARITY_TIERS.includes(x);
// The tier a base can carry: a Legendary base is always Legendary, and a
// Common or Rare base can't be Legendary (it is raised to Heroic at most).
export function fitTier(base, tier) {
  if (!base) return 'common';
  if (base.rarity === 'unique') return 'unique';
  if (!isTier(tier)) return base.rarity;
  if (tier === 'unique') return 'heroic';
  if (base.rarity === 'rare' && tier === 'common') return 'rare';
  return tier;
}

// ---------------------------------------------------------------- the Fates' Thread
// Count an item drop for the pity rule (§4.2): `d` is a profile's data. At
// PITY_AT drops without a Legendary, a drop from a pity source is made
// Legendary. Any Legendary resets the count. Returns the tier to use.
export function applyPity(d, tier, source = 'chest', force = true) {
  if (!d) return tier;
  const n = Number.isFinite(d.sinceLegendary) ? d.sinceLegendary : 0;
  if (force && tier !== 'unique' && n >= PITY_AT && PITY_SOURCES.includes(source)) tier = 'unique';
  d.sinceLegendary = tier === 'unique' ? 0 : n + 1;
  return tier;
}
// Roll a drop's tier: the source's table at this player level and difficulty,
// Tyche's Favour (raider: a chance of one tier higher), then the pity rule.
export function rollTierFor(source = 'chest', { level = 1, difficulty = 1, rng = Math.random, raider = 0, pity = null } = {}) {
  let tier = rollTier(source, level, difficulty, rng);
  if (raider > 0 && rng() < raider && !(source === 'shop' && tier === 'heroic')) tier = TIER_UP[tier];
  return applyPity(pity, tier, source);
}

// Roll a concrete item. `power` is the item power (see powerFor); older
// callers pass a small difficulty number, which is converted.
//   source      the drop table (progression.js RARITY_WEIGHTS): monster, chest,
//               rare, elite, champion, boss, epic, quest, shop
//   level       the player's level (the rarity ramp); by default the level the
//               curve expects for this power
//   difficulty  1-4 (Heroic and Legendary +25% a step)
//   rarity/tier a tier to make (else rolled); id: a base item to make
//   place       a place id or a list of tags (PLACE_TAGS): items tagged for it ×3
//   pity        a profile's data: the drop counts for the Fates' Thread
//   raider      Tyche's Favour: chance of one tier higher
export function rollItem(power = 1, { rarity = null, tier = null, kind = null, rng = Math.random, id = null, blessed = null, hero = null, source = 'chest', level = null, difficulty = 1, place = null, pity = null, raider = 0 } = {}) {
  if (power < 6) power = powerFor(power, 1, rng);
  const gl = levelOfPower(power), L = level ?? levelForGear(gl);
  let want = tier ?? rarity;
  if (!isTier(want)) want = null;
  let base = id ? ITEM_BY_ID[id] : null;
  if (id && !base) base = ITEMS[0];
  if (!base) {
    if (!want) want = rollTierFor(source, { level: L, difficulty, rng, raider, pity });
    else applyPity(pity, want, source, false);
    const of = (r) => ITEMS.filter((i) => i.rarity === r && (!kind || i.kind === kind));
    let pool = want === 'common' ? of('common') : want === 'rare' ? (rng() < 0.7 ? of('rare') : of('common')) : want === 'heroic' ? [...of('common'), ...of('rare')] : of('unique');
    if (!pool.length) pool = ITEMS.filter((i) => !kind || i.kind === kind);
    // a hero's favourites turn up a little more often for them
    if (hero && rng() < 0.35) { const fav = pool.filter((i) => i.hero === hero); if (fav.length) pool = fav; }
    // the place's own items: ×3 weight
    const tags = placeTags(place);
    const wt = (i) => (tags.length && i.tags.some((g) => tags.includes(g)) ? TAG_WEIGHT : 1);
    let x = rng() * pool.reduce((a, i) => a + wt(i), 0);
    base = pool[pool.length - 1];
    for (const i of pool) { x -= wt(i); if (x < 0) { base = i; break; } }
  } else if (pity) applyPity(pity, fitTier(base, want), source, false);
  const tr = fitTier(base, want ?? base.rarity), R = RARITY[tr];
  const fixed = base.fixed ?? [];
  const used = [...fixed];
  const ench = [];
  for (const f of fixed) ench.push({ options: [f], pick: f, level: 1, fixed: true });
  const rows = Math.max(R.rows, fixed.length);
  while (ench.length < rows) {
    const opts = options(base.kind, used);
    if (!opts.length) break;
    const row = [];
    while (row.length < R.choices && opts.length) { const k = opts.splice(Math.floor(rng() * opts.length), 1)[0]; row.push(k); used.push(k); }
    ench.push({ options: row, pick: null, level: 0 });
  }
  const isBlessed = blessed ?? (tr !== 'common' && rng() < blessedChance(gl));
  const it = { uid: 'i' + (uid++) + Math.floor(rng() * 1000), id: base.id, tier: tr, power: Math.max(1, Math.round(power + (rng() * 4 - 2))), ench, boons: rollBoons(base.kind, R.boons, rng), isNew: true };
  if (isBlessed) {
    const opts = options(base.kind, used);
    if (opts.length) { const k = opts[Math.floor(rng() * opts.length)]; it.blessed = { id: k, level: 3 }; it.power += BLESSED.powerBonus; }
  }
  return normalizeItem(it);
}

// Items saved before enchantment rows had choices: { id, level } → a row;
// choices and blessings that no longer exist are dropped (the point spent
// on a dropped pick comes back with salvage, as it is no longer counted).
// Items saved before the loot rework get their base's tier and no boons.
export function normalizeItem(it) {
  if (!it || !Array.isArray(it.ench)) return it;
  it.ench = it.ench.map((e) => (e.options ? e : { options: [e.id], pick: e.level > 0 ? e.id : null, level: e.level ?? 0, fixed: false }));
  if (!ITEM_BY_ID[it.id]) it.id = ITEMS.find((b) => b.kind === (it.kind ?? 'weapon'))?.id ?? 'training_sword';
  for (const e of it.ench) {
    e.options = e.options.filter((o) => ENCHANTS[o]);
    if (e.pick && !ENCHANTS[e.pick]) { e.pick = null; e.level = 0; }
    e.level = Math.max(0, Math.min(3, Math.floor(Number(e.level) || 0)));
  }
  it.ench = it.ench.filter((e) => e.options.length);
  if (it.blessed && !ENCHANTS[it.blessed.id]) delete it.blessed;
  if (!Number.isFinite(it.power)) it.power = 10;
  const b = ITEM_BY_ID[it.id];
  it.tier = fitTier(b, isTier(it.tier) ? it.tier : b.rarity);
  const seen = new Set();
  it.boons = (Array.isArray(it.boons) ? it.boons : []).filter((x) => x && BOONS[x.id] && BOONS[x.id].for.includes(b.kind) && Number.isFinite(x.v) && !seen.has(x.id) && seen.add(x.id));
  return it;
}
export function itemInfo(it) { return ITEM_BY_ID[it.id] ?? ITEMS[0]; }
// The tier an item was rolled at (old items: their base's rarity).
export function itemTier(it) { const b = itemInfo(it); return fitTier(b, isTier(it?.tier) ? it.tier : b.rarity); }
export function itemRarity(it) { return it.blessed ? BLESSED : RARITY[itemTier(it)]; }
// The tier's own look (a Blessed item keeps its tier's beam, card and sound).
export const tierInfo = (it) => RARITY[itemTier(it)];
// How much stronger an item is than a power-10 one, with the favourite bonus.
export function powerMult(it, hero = null) { const b = itemInfo(it); return strength(it.power) * (hero && b.hero === hero ? 1.1 : 1); }
// An item's whole strength: power, favourite and tier (what gearStats uses).
// (A blessed item counts by its own tier: BLESSED has no multiplier of its
// own, and used to make a blessed weapon's damage NaN.)
export function itemStrength(it, hero = null) { return powerMult(it, hero) * (RARITY[itemTier(it)]?.mult ?? 1); }
export function spentPoints(it) { return it.ench.reduce((a, e) => a + (e.fixed || !e.pick ? 0 : Array.from({ length: e.level }, (_, i) => enchCost(e.pick, i + 1)).reduce((x, y) => x + y, 0)), 0); }
// Salvage (§4.6): Common 8, Rare 18, Heroic 30, Legendary 45, ×1.5 Blessed, × power.
export const SALVAGE = { common: 8, rare: 18, heroic: 30, unique: 45 };
export function salvageValue(it) { return Math.round(SALVAGE[itemTier(it)] * (it.blessed ? 1.5 : 1) * Math.max(0.6, 1 + (it.power - 10) * 0.012)); }
export function itemPrice(it) { return Math.round(salvageValue(it) * 3.2 + 10); }
// The forge: temper (a quarter of a gear level of power), reforge to level
// (straight up to what drops now) and re-roll an un-invested row's choices.
// Each costs more for rarer items (rarityCost: ×1 / 1.1 / 1.2 / 1.3).
export const TEMPER_STEP = Math.max(1, Math.round(POWER_STEP / 4));
export function temperCost(it) { return Math.round((10 + it.power * 0.9) * rarityCost(itemTier(it))); }
export function rerollCost(it) { return Math.round((15 + it.power * 0.6) * rarityCost(itemTier(it))); }
export function reforgeTarget(it, playerLevel = 1) { return reforgePower(playerLevel) + (it.blessed ? BLESSED.powerBonus : 0); }
export function reforgeCost(it, playerLevel = 1) { const dp = reforgeTarget(it, playerLevel) - it.power; return dp > 0 ? Math.round((10 + 0.9 * dp) * rarityCost(itemTier(it))) : 0; }
export function canReforge(it, playerLevel = 1) { return reforgeTarget(it, playerLevel) > it.power; }
export function reforge(it, playerLevel = 1) { if (!canReforge(it, playerLevel)) return false; it.power = reforgeTarget(it, playerLevel); return true; }
// Outdated (the amber dot): more than a gear level below what drops now.
export function isOutdated(it, playerLevel = 1) { return !!it && reforgeTarget(it, playerLevel) - it.power > OUTDATED_BY; }
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
  const out = it.ench.filter((e) => e.pick && e.level > 0 && ENCHANTS[e.pick]).map((e) => ({ id: e.pick, level: e.level }));
  if (it.blessed && ENCHANTS[it.blessed.id]) out.push({ ...it.blessed });
  return out;
}

// A hero's stats with this gear (also used to compare items in the inventory).
//   meleeMult  the weapon's damage × its strength × (1 + melee bonuses)
//   techMult   abilities, shots and magic items: the gear's average strength
//              × (1 + ability bonuses), so powers keep pace with the weapon
//   maxHp      100, growing a quarter as fast as the armour's strength, plus
//              the armour's health × its strength
//   heroPower  the average power of what is equipped (shown in the inventory)
export function gearStats(gear, hero = null) {
  const s = { damage: 1, armor: 0, speed: 1, cdr: 0, ceGain: 1, crit: 0.08, critDmg: 0, lifesteal: 0, meleeMult: 1, meleePct: 0, committed: 0, techMult: 1, techPct: 0, healBonus: 0, attackSpeed: 1, reach: 1, arc: 1, knock: 1, maxHp: 100, bane: 0, thorns: 0, luck: 0, regen: 0, evade: 0, quiver: 0, flaskCdr: 0, heroPower: 0, maxHpPct: 0, gearScale: 1, lootChance: 0, raider: 0 };
  const procs = {}; let weapon = null; const artifacts = []; let twin = false, pierce = false;
  let weaponMult = 1, armourPm = 1, sum = 0, sumPm = 0, n = 0;
  for (const it of gear) {
    if (!it) continue;
    const b = itemInfo(it); if (!b) continue;
    const pm = itemStrength(it, hero);
    sum += it.power; sumPm += pm; n++;
    if (b.kind === 'weapon') { weapon = it; weaponMult = (b.dmg ?? 1) * pm; s.attackSpeed *= b.speed ?? 1; s.reach *= b.reach ?? 1; s.arc *= b.arc ?? 1; s.knock *= b.knock ?? 1; twin = !!b.twin; pierce = !!b.pierce; }
    if (b.kind === 'armor') { armourPm = pm; s.maxHp += (b.hp ?? 0) * pm; s.armor += (b.armor ?? 0) + 0.04 + 0.02 * Math.max(0, Math.min(3, pm - 1)); s.cdr += b.cdr ?? 0; s.ceGain += b.ce ?? 0; s.speed += b.speed ?? 0; s.meleePct += b.meleeMult ?? 0; s.techPct += b.techMult ?? 0; s.regen += (b.regen ?? 0) * Math.max(1, pm); s.evade += b.evade ?? 0; s.quiver += b.quiver ?? 0; s.flaskCdr += b.flaskCdr ?? 0; }
    if (b.kind === 'artifact') { artifacts.push({ it, base: b, cdLeft: 0, cd: b.cd, charges: b.charges ?? 1, maxCharges: b.charges ?? 1, gate: 0, lasting: 1 + (it.boons?.find((x) => x.id === 'lasting')?.v ?? 0) }); s.techPct += 0.04; }
    for (const x of it.boons ?? []) BOONS[x.id]?.apply(s, x.v, pm);
    for (const e of activeEnchants(it)) {
      const E = ENCHANTS[e.id]; if (!E) continue;
      E.stat?.(s, e.level, pm);
      if (E.proc) procs[E.proc] = Math.max(procs[E.proc] ?? 0, e.level);
    }
  }
  s.maxHp += 100 * 0.25 * Math.max(0, armourPm - 1);
  s.meleeMult = weaponMult * (1 + s.meleePct);
  s.gearScale = Math.max(1, n ? sumPm / n : 1);
  s.techMult = s.gearScale * (1 + s.techPct);
  s.heroPower = n ? Math.round(sum / n) : 0;
  s.lootChance = Math.min(0.12, s.lootChance); s.raider = Math.min(0.2, s.raider);
  s.armor = Math.min(0.7, s.armor); s.cdr = Math.min(0.6, s.cdr); s.evade = Math.min(0.3, s.evade); s.flaskCdr = Math.min(0.6, s.flaskCdr); s.lifesteal = Math.min(0.15, s.lifesteal);
  return { s, procs, weapon, artifacts, twin, pierce };
}

// Fold equipped gear into a player's stats. Magic items keep their cooldown
// and charges across a gear change (it used to hand out a fresh one).
export function applyGear(player, gear) {
  const { s, procs, weapon, artifacts, twin, pierce } = gearStats(gear, player.hero);
  for (const a of artifacts) {
    const old = player.artifacts?.find((o) => o.it?.uid === a.it.uid);
    if (old) { a.cdLeft = old.cdLeft ?? 0; a.charges = Math.min(a.maxCharges, old.charges ?? a.maxCharges); }
  }
  Object.assign(player.stats, s);
  player.procs = procs; player.weapon = weapon; player.artifacts = artifacts;
  player.weaponTwin = twin; player.weaponPierce = pierce;
  const frac = player.hp / player.maxHp;
  player.maxHp = s.maxHp; player.hp = Math.min(player.maxHp, Math.max(1, frac * player.maxHp));
}

// Chest loot (§4.3): how many items and of what rarity, for ONE player.
// `area` is the monster level of the place (a chapter's level, the chest's
// spot); kind 'common' | 'rare' | 'epic' (a champion's or a trial's epic
// chest; 'boss' is the old name for it). o: rollItem's options (level,
// difficulty, hero, place, pity, raider, rng).
const CHEST_SOURCE = { common: 'chest', rare: 'rare', epic: 'epic', boss: 'epic' };
export function rollChest(area, kind = 'common', o = {}) {
  const rng = o.rng ?? Math.random, level = o.level ?? 1, source = CHEST_SOURCE[kind] ?? 'chest';
  const [n0, more] = CHEST_ITEMS[kind] ?? CHEST_ITEMS.common;
  const n = n0 + (more && rng() < more ? 1 : 0), out = [];
  for (let i = 0; i < n; i++) out.push(rollItem(powerFor(area, level, rng, source), { ...o, rng, level, source }));
  return legendaryLast(out);
}
// Legendaries land last (the stagger of §5.1), the signature last of all.
export function legendaryLast(items) {
  const rank = (it) => (it.signature ? 3 : itemTier(it) === 'unique' ? 2 : 0);
  return items.map((it, i) => [it, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]);
}
// Has this profile still to earn a boss's signature at this difficulty? (a
// first win, or a first win on a higher difficulty: save.data.signatures)
export const signatureDue = (d, key, difficulty = 1) => !!key && (d?.signatures?.[key] ?? 0) < difficulty;
export function recordSignature(d, key, difficulty = 1) { if (!d || !key) return; d.signatures ??= {}; d.signatures[key] = Math.max(d.signatures[key] ?? 0, difficulty); }
// A signature item at a power (Blessed from SIGNATURE_BLESSED_AT).
function signatureItem(key, power, difficulty, o) {
  const id = BOSS_SIGNATURE[key]; if (!id) return null;
  const it = rollItem(power, { ...o, id, blessed: difficulty >= SIGNATURE_BLESSED_AT ? true : false, pity: null });
  applyPity(o.pity, 'unique', 'boss', false);
  it.signature = key;
  return it;
}
// A boss's loot for ONE player (§4.3-4.4): 1 guaranteed + 3 at 50% on the boss
// table; a Legendary from it is the boss's signature half the time; and on
// the first win at this difficulty (first: true) the signature itself, on
// top, at boss power. Returns { items (Legendaries last), signature }.
export function rollBossLoot(key, area, o = {}) {
  const rng = o.rng ?? Math.random, level = o.level ?? 1, difficulty = o.difficulty ?? 1;
  const sigId = BOSS_SIGNATURE[key];
  let n = BOSS_ITEMS.guaranteed; for (let i = 0; i < BOSS_ITEMS.extra; i++) if (rng() < BOSS_ITEMS.chance) n++;
  const items = [];
  for (let i = 0; i < n; i++) {
    const pw = powerFor(area, level, rng, 'boss');
    const tier = rollTierFor('boss', { level, difficulty, rng, raider: o.raider ?? 0, pity: o.pity });
    if (tier === 'unique' && sigId && rng() < SIGNATURE_REPEAT) items.push(rollItem(pw, { ...o, rng, level, id: sigId, pity: null }));
    else items.push(rollItem(pw, { ...o, rng, level, source: 'boss', tier, pity: null }));
  }
  const signature = o.first && sigId ? signatureItem(key, powerFor(area, level, rng, 'boss'), difficulty, { ...o, rng, level }) : null;
  if (signature) items.push(signature);
  return { items: legendaryLast(items), signature };
}
// The chapter reward (§4.3, MCD2's quest reward): one item on the quest
// table and 20 drachmas a monster level; a chapter without a boss (lt8)
// gives its signature on the first clear at this difficulty.
export function rollChapterReward(chapterId, area, o = {}) {
  const rng = o.rng ?? Math.random, level = o.level ?? 1, difficulty = o.difficulty ?? 1;
  const items = [rollItem(powerFor(area, level, rng, 'quest'), { ...o, rng, level, source: 'quest' })];
  const signature = o.first && BOSS_SIGNATURE[chapterId] ? signatureItem(chapterId, powerFor(area, level, rng, 'quest'), difficulty, { ...o, rng, level }) : null;
  if (signature) items.push(signature);
  return { items: legendaryLast(items), signature, coins: CHAPTER_COINS * Math.max(1, Math.round(area)) };
}

// ---------------------------------------------------------------- the stash
// Sort for the inventory: new finds first (the newest on top), then the
// strongest (power, then rarity), then the most recently found.
const RANK = { common: 0, rare: 1, heroic: 2, unique: 3 };
export function sortItems(items) {
  const at = new Map(items.map((it, i) => [it, i]));
  const got = (it) => it.got ?? at.get(it) ?? 0;
  return [...items].sort((a, b) => (!!b.isNew - !!a.isNew) || (a.isNew && b.isNew ? got(b) - got(a) : 0) ||
    (b.power - a.power) || ((RANK[itemTier(b)] + (b.blessed ? 0.5 : 0)) - (RANK[itemTier(a)] + (a.blessed ? 0.5 : 0))) || (got(b) - got(a)));
}
// The slot an item would go in (0 weapon, 1 armour, 2-3 magic items: the
// empty one, else the first).
export function slotFor(it, gear) {
  const k = itemInfo(it).kind;
  if (k === 'weapon') return 0;
  if (k === 'armor') return 1;
  return gear[2] && !gear[3] ? 3 : 2;
}
// One number for how strong a set of gear makes a hero (for the arrows on
// the tiles): damage, ability strength, health and damage reduction.
export function gearScore(s) {
  return s.meleeMult * s.attackSpeed + 0.6 * s.techMult + s.maxHp / 100 + 2 * s.armor + s.crit + 0.5 * s.cdr;
}
// Is this item stronger than what it would replace? (the green arrow on a tile)
export function isUpgrade(it, gear, hero = null) {
  if (gear.includes(it)) return false;
  const i = slotFor(it, gear);
  if (!gear[i]) return true;
  const alt = [...gear]; alt[i] = it;
  return gearScore(gearStats(alt, hero).s) > gearScore(gearStats(gear, hero).s) + 1e-6;
}
export { mulberry32 };
