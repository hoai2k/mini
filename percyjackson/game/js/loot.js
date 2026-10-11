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

export const RARITY = {
  common: { label: 'Common', color: '#d8cfbd', rows: 1, mult: 1 },
  rare: { label: 'Rare', color: '#4ad0ff', rows: 2, mult: 1.12 },
  unique: { label: 'Legendary', color: '#ff9a2a', rows: 3, mult: 1.25 },
};
export const BLESSED = { label: 'Blessed', color: '#ffd84a', powerBonus: 2 };
export const KIND_LABEL = { weapon: 'Weapon', armor: 'Armour', artifact: 'Magic item' };

// Enchantments. `stat` folds into the hero's stats, `proc` turns on an effect
// in combat. Costs per level: 1/2/3, powerful ones 2/3/4.
export const ENCHANTS = {
  // weapons
  sharpness: { name: 'Celestial Edge', desc: (l) => `+${l * 10}% melee damage`, for: ['weapon'], stat: (s, l) => { s.meleeMult += 0.1 * l; } },
  swirling: { name: 'Whirlwind', desc: (l) => `Every third hit spins, striking all around for ${40 + l * 20}%`, for: ['weapon'], proc: 'swirl' },
  committed: { name: 'Relentless', desc: (l) => `Up to +${l * 15}% damage to wounded monsters`, for: ['weapon'], stat: (s, l) => { s.committed += 0.15 * l; } },
  rampaging: { name: 'War Frenzy', desc: (l) => `Defeating a monster gives +${l * 10}% attack speed for 5 s`, for: ['weapon'], proc: 'rampage' },
  leeching: { name: 'Nectar Thirst', desc: (l) => `Heal ${l * 2}% of your health when you defeat a monster`, for: ['weapon'], proc: 'leech' },
  exploding: { name: 'Greek Fire', desc: (l) => `Monsters you defeat explode for ${l * 20}% of their health`, for: ['weapon'], proc: 'explode', powerful: true },
  freezing: { name: 'Boreas’s Chill', desc: (l) => `Hits slow monsters for ${(1 + l * 0.4).toFixed(1)} s`, for: ['weapon'], proc: 'freeze' },
  critical: { name: 'Athena’s Eye', desc: (l) => `+${l * 5}% critical chance`, for: ['weapon', 'artifact'], stat: (s, l) => { s.crit += 0.05 * l; } },
  thundering: { name: 'Zeus’s Spark', desc: (l) => `${l * 8}% chance on hit to call down lightning`, for: ['weapon'], proc: 'thunder', powerful: true },
  echo: { name: 'Echo', desc: (l) => `${l * 10}% chance to strike twice`, for: ['weapon'], proc: 'echo' },
  bane: { name: 'Monster Bane', desc: (l) => `+${l * 20}% damage to elites, champions and bosses`, for: ['weapon'], stat: (s, l) => { s.bane += 0.2 * l; } },
  // armour
  health: { name: 'Ambrosia-Fed', desc: (l) => `+${l * 15} health`, for: ['armor'], stat: (s, l) => { s.maxHp += 15 * l; } },
  protection: { name: 'Aegis Ward', desc: (l) => `+${l * 6}% damage reduction`, for: ['armor'], stat: (s, l) => { s.armor += 0.06 * l; } },
  swiftness: { name: 'Hermes’s Speed', desc: (l) => `+${l * 6}% move speed`, for: ['armor'], stat: (s, l) => { s.speed += 0.06 * l; } },
  cooldown: { name: 'Focus', desc: (l) => `-${l * 8}% ability cooldowns`, for: ['armor', 'artifact'], stat: (s, l) => { s.cdr += 0.08 * l; } },
  surge: { name: 'Godly Blood', desc: (l) => `+${l * 15}% Power gain`, for: ['armor', 'artifact'], stat: (s, l) => { s.ceGain += 0.15 * l; } },
  potency: { name: 'Divine Might', desc: (l) => `+${l * 10}% ability damage`, for: ['armor', 'artifact'], stat: (s, l) => { s.techMult += 0.1 * l; } },
  vitality: { name: 'Apollo’s Blessing', desc: (l) => `Ambrosia heals ${l * 10}% more`, for: ['armor'], stat: (s, l) => { s.healBonus += 0.1 * l; } },
  thorns: { name: 'Demeter’s Briars', desc: (l) => `Monsters that hit you take ${l * 25}% of the damage back`, for: ['armor'], stat: (s, l) => { s.thorns += 0.25 * l; } },
  embers: { name: 'Hephaestus’s Embers', desc: (l) => `Burn monsters right next to you for ${l * 6} damage a second`, for: ['armor'], proc: 'embers', powerful: true },
  evasion: { name: 'Nimble as a Satyr', desc: (l) => `${l * 4}% chance to dodge a hit`, for: ['armor'], stat: (s, l) => { s.evade += 0.04 * l; } },
  lucky: { name: 'Tyche’s Luck', desc: (l) => `+${l * 25}% drachmas found`, for: ['armor', 'artifact'], stat: (s, l) => { s.luck += 0.25 * l; } },
};
export const enchCost = (id, toLevel) => toLevel + (ENCHANTS[id]?.powerful ? 1 : 0);

// Base items. `hero` marks a favourite: a hero gets +10% power from it.
export const ITEMS = [
  // ---------------------------------------------------------------- weapons
  // dmg: damage multiplier · speed: attack speed · reach · arc: swing width ·
  // knock: knock-back · twin: every hit strikes twice · pierce: ignores shields
  { id: 'training_sword', kind: 'weapon', name: 'Camp Training Sword', icon: '🗡️', rarity: 'common', desc: 'A bronze practice sword from the camp armoury. Reliable.', dmg: 1.0, speed: 1.0 },
  { id: 'bronze_dagger', kind: 'weapon', name: 'Bronze Dagger', icon: '🔪', rarity: 'common', desc: 'Quick and light. Up close is where a dagger shines.', dmg: 0.9, speed: 1.25, reach: 0.9, hero: 'annabeth' },
  { id: 'camp_spear', kind: 'weapon', name: 'Camp Spear', icon: '🔱', rarity: 'common', desc: 'Long reach, steady thrusts.', dmg: 1.05, speed: 0.95, reach: 1.25, arc: 0.7, hero: 'clarisse' },
  { id: 'club', kind: 'weapon', name: 'Cyclops Club', icon: '🪵', rarity: 'common', desc: 'A table leg from the Big House. Heavy, slow, and sends monsters flying.', dmg: 1.3, speed: 0.8, knock: 1.6, hero: 'tyson' },
  { id: 'bronze_axe', kind: 'weapon', name: 'Bronze Hand Axe', icon: '🪓', rarity: 'common', desc: 'Wide, chopping swings that catch several monsters at once.', dmg: 1.1, speed: 0.9, arc: 1.35 },
  { id: 'shepherd_crook', kind: 'weapon', name: 'Shepherd’s Crook', icon: '🦯', rarity: 'common', desc: 'Satyrs swear by it. Long reach and a gentle hook.', dmg: 0.95, speed: 1.1, reach: 1.2, hero: 'grover' },
  { id: 'xiphos', kind: 'weapon', name: 'Celestial Bronze Xiphos', icon: '⚔️', rarity: 'rare', desc: 'A leaf-bladed Greek sword. Monsters fear its glow.', dmg: 1.2, speed: 1.05, hero: 'percy' },
  { id: 'hammer', kind: 'weapon', name: 'Forge Hammer', icon: '🔨', rarity: 'rare', desc: 'Made in the Hephaestus cabin. Every third blow shakes the ground.', dmg: 1.35, speed: 0.85, knock: 1.4, hero: 'tyson', fixed: ['swirling'] },
  { id: 'reed_staff', kind: 'weapon', name: 'Reed Staff of Pan', icon: '🎋', rarity: 'rare', desc: 'A satyr’s staff, humming with wild music.', dmg: 1.1, speed: 1.15, reach: 1.2, hero: 'grover', fixed: ['freezing'] },
  { id: 'lamer', kind: 'weapon', name: 'Electric Spear', icon: '⚡', rarity: 'rare', desc: 'A spear that crackles with stolen lightning.', dmg: 1.2, speed: 1.0, reach: 1.3, arc: 0.7, hero: 'clarisse', fixed: ['thundering'] },
  { id: 'labrys', kind: 'weapon', name: 'Labrys of Knossos', icon: '🪓', rarity: 'rare', desc: 'The double axe of the labyrinth’s kings. Huge sweeping arcs.', dmg: 1.3, speed: 0.85, arc: 1.6, knock: 1.2 },
  { id: 'kopis', kind: 'weapon', name: 'Spartan Kopis', icon: '🗡️', rarity: 'rare', desc: 'A forward-curved blade that bites hardest into the wounded.', dmg: 1.15, speed: 1.1, fixed: ['committed'] },
  { id: 'dory', kind: 'weapon', name: 'Hoplite Dory', icon: '🔱', rarity: 'rare', desc: 'The great spear of the phalanx. Reach that keeps monsters at bay.', dmg: 1.2, speed: 0.95, reach: 1.45, arc: 0.6 },
  { id: 'backbiter', kind: 'weapon', name: 'Backbiter', icon: '🗡️', rarity: 'unique', desc: 'Half celestial bronze, half tempered steel: it cuts mortals and monsters alike, and ignores shields.', dmg: 1.4, speed: 1.05, reach: 1.1, pierce: true, fixed: ['committed'] },
  { id: 'stygian_blade', kind: 'weapon', name: 'Stygian Iron Blade', icon: '🖤', rarity: 'unique', desc: 'Forged in the Styx. It drinks the essence of what it strikes.', dmg: 1.35, speed: 1.0, fixed: ['leeching'] },
  { id: 'twin_daggers', kind: 'weapon', name: 'Twin Huntress Knives', icon: '🌙', rarity: 'unique', desc: 'Silver knives of the Hunters of Artemis. Every hit strikes twice.', dmg: 1.1, speed: 1.25, twin: true, hero: 'annabeth', fixed: ['critical'] },
  { id: 'imperial_gladius', kind: 'weapon', name: 'Imperial Gold Gladius', icon: '🏛️', rarity: 'unique', desc: 'A Roman blade of Imperial gold. Sturdy, sharp and fast.', dmg: 1.45, speed: 1.1, fixed: ['sharpness'] },
  { id: 'harpe', kind: 'weapon', name: 'Harpe of Perseus', icon: '🌙', rarity: 'unique', desc: 'The sickle-sword that took Medusa’s head. Deadly to the mightiest monsters.', dmg: 1.35, speed: 1.05, reach: 1.1, fixed: ['bane'] },
  { id: 'heracles_club', kind: 'weapon', name: 'Club of Heracles', icon: '🏏', rarity: 'unique', desc: 'Olive wood studded with bronze. Every swing is a thunderclap.', dmg: 1.6, speed: 0.75, arc: 1.3, knock: 2.2, hero: 'tyson', fixed: ['thundering'] },
  { id: 'pelian_spear', kind: 'weapon', name: 'Pelian Spear of Achilles', icon: '🔱', rarity: 'unique', desc: 'Only Achilles could wield it. Its strikes find every gap in armour.', dmg: 1.4, speed: 1.0, reach: 1.45, arc: 0.7, pierce: true, hero: 'clarisse', fixed: ['critical'] },
  { id: 'ares_sword', kind: 'weapon', name: 'Burning Sword of Ares', icon: '🔥', rarity: 'unique', desc: 'The war god’s own blade. Monsters it fells burst into flame.', dmg: 1.5, speed: 0.95, arc: 1.2, fixed: ['exploding'] },
  { id: 'trident_blade', kind: 'weapon', name: 'Tide-Forged Sword', icon: '🌊', rarity: 'unique', desc: 'Cooled in the sea by Poseidon’s Cyclopes. It hits like a wave.', dmg: 1.45, speed: 1.05, knock: 1.5, hero: 'percy', fixed: ['swirling'] },
  // ---------------------------------------------------------------- armour
  // hp · armor (damage reduction) · speed · cdr (cooldowns) · ce (Power gain) ·
  // meleeMult · techMult · regen (health per second) · evade (chance to dodge a hit)
  { id: 'camp_shirt', kind: 'armor', name: 'Camp Half-Blood T-shirt', icon: '👕', rarity: 'common', desc: 'Orange, with a pegasus. Surprisingly tough.', hp: 20, armor: 0.06 },
  { id: 'bronze_breastplate', kind: 'armor', name: 'Bronze Breastplate', icon: '🛡️', rarity: 'common', desc: 'Standard camp battle armour. Heavy.', hp: 30, armor: 0.12, speed: -0.05 },
  { id: 'hermes_uniform', kind: 'armor', name: 'Hermes Express Uniform', icon: '📦', rarity: 'common', desc: 'Built for fast deliveries.', hp: 10, speed: 0.1, hero: 'grover' },
  { id: 'linothorax', kind: 'armor', name: 'Linothorax', icon: '🥋', rarity: 'common', desc: 'Layered linen armour: light and quick to move in.', hp: 15, armor: 0.06, cdr: 0.06 },
  { id: 'biker_jacket', kind: 'armor', name: 'Biker Jacket of Ares', icon: '🧥', rarity: 'rare', desc: 'Smells of smoke and war. Fighting makes you stronger.', hp: 25, meleeMult: 0.12, hero: 'clarisse' },
  { id: 'hunter_parka', kind: 'armor', name: 'Hunter’s Silver Parka', icon: '🧥', rarity: 'rare', desc: 'Silver, light and warm. Abilities come back faster.', hp: 20, cdr: 0.1, evade: 0.05, hero: 'annabeth' },
  { id: 'sea_armor', kind: 'armor', name: 'Sea-Green Mail', icon: '🌊', rarity: 'rare', desc: 'Scales from Poseidon’s armoury. Power flows like the tide.', hp: 25, ce: 0.25, hero: 'percy' },
  { id: 'hoplite_panoply', kind: 'armor', name: 'Hoplite Panoply', icon: '🛡️', rarity: 'rare', desc: 'Full bronze armour of a Greek soldier: helm, cuirass and greaves.', hp: 45, armor: 0.16, speed: -0.06, hero: 'tyson' },
  { id: 'spartan_cloak', kind: 'armor', name: 'Spartan Crimson Cloak', icon: '🧣', rarity: 'rare', desc: 'Come back with your shield, or on it.', hp: 25, armor: 0.06, meleeMult: 0.1 },
  { id: 'satyr_vest', kind: 'armor', name: 'Satyr’s Woven Vest', icon: '🌿', rarity: 'rare', desc: 'Wild-grown and alive. It mends you slowly.', hp: 20, regen: 1, hero: 'grover' },
  { id: 'nemean_pelt', kind: 'armor', name: 'Nemean Lion Pelt', icon: '🦁', rarity: 'unique', desc: 'The golden pelt no blade can pierce.', hp: 45, armor: 0.18, fixed: ['protection'] },
  { id: 'fleece_cloak', kind: 'armor', name: 'Golden Fleece Mantle', icon: '🐏', rarity: 'unique', desc: 'Healing magic woven into gold.', hp: 35, regen: 1.5, fixed: ['vitality'] },
  { id: 'forge_apron', kind: 'armor', name: 'Fireproof Forge Apron', icon: '🔥', rarity: 'unique', desc: 'Hephaestus’s own. Nothing near you stays cool for long.', hp: 40, armor: 0.08, hero: 'tyson', fixed: ['embers'] },
  { id: 'amazon_armor', kind: 'armor', name: 'Armour of the Amazons', icon: '🏹', rarity: 'unique', desc: 'Queen Hylla’s fighters move like the wind and strike true.', hp: 30, speed: 0.08, evade: 0.08, fixed: ['evasion'] },
  { id: 'achilles_armor', kind: 'armor', name: 'Armour of Achilles', icon: '⚜️', rarity: 'unique', desc: 'Forged by Hephaestus for the greatest hero of Troy. Nearly invulnerable.', hp: 55, armor: 0.22, fixed: ['health'] },
  { id: 'hermes_cap', kind: 'armor', name: 'Winged Travelling Cloak', icon: '🪽', rarity: 'unique', desc: 'Hermes’s own travelling gear. Light as a breeze.', hp: 25, speed: 0.14, cdr: 0.08, evade: 0.06, hero: 'grover', fixed: ['swiftness'] },
  // ---------------------------------------------------------------- magic items
  // cd: cooldown in seconds · act: what it does (see artifacts.js)
  { id: 'master_bolt', kind: 'artifact', name: 'Spark of the Master Bolt', icon: '🌩️', rarity: 'unique', desc: 'A javelin of lightning that pierces every monster in a line.', cd: 9, act: 'spear' },
  { id: 'hephaestus_net', kind: 'artifact', name: 'Hephaestus’s Golden Net', icon: '🕸️', rarity: 'rare', desc: 'Throw the net and drag every monster it catches to you.', cd: 8, act: 'chain' },
  { id: 'medusa_head', kind: 'artifact', name: 'Medusa’s Head (in a bag)', icon: '🐍', rarity: 'unique', desc: 'Lift the bag and every nearby monster turns to stone for 4 seconds. Don’t look.', cd: 20, act: 'prison' },
  { id: 'nemesis_coin', kind: 'artifact', name: 'Nemesis’s Fortune Coin', icon: '🪙', rarity: 'rare', desc: 'Balance: damages every monster you hit in the last 5 seconds.', cd: 10, act: 'doll' },
  { id: 'aegis', kind: 'artifact', name: 'Aegis Charm', icon: '🛡️', rarity: 'common', desc: 'A shimmer of Zeus’s shield: halves damage taken for 5 seconds.', cd: 16, act: 'barrier' },
  { id: 'pegasus_whistle', kind: 'artifact', name: 'Pegasus Whistle', icon: '🐴', rarity: 'rare', desc: 'Calls a pegasus who dives at monsters for 12 seconds.', cd: 22, act: 'pegasus' },
  { id: 'nectar_flask', kind: 'artifact', name: 'Nectar Flask', icon: '🍯', rarity: 'common', desc: 'Heals you and nearby friends over 4 seconds.', cd: 18, act: 'charm' },
  { id: 'bag_of_winds', kind: 'artifact', name: 'Bag of Winds', icon: '🌬️', rarity: 'rare', desc: 'A gift of Aeolus: a gale that hurls monsters away.', cd: 12, act: 'winds' },
  { id: 'helm_of_darkness', kind: 'artifact', name: 'Shadow of the Helm', icon: '⛑️', rarity: 'unique', desc: 'For 5 seconds the whole team turns invisible to monsters.', cd: 26, act: 'helm' },
  { id: 'winged_shoes', kind: 'artifact', name: 'Winged Sneakers', icon: '👟', rarity: 'common', desc: 'Maia! Run much faster for 6 seconds.', cd: 14, act: 'shoes' },
  { id: 'greek_fire', kind: 'artifact', name: 'Jar of Greek Fire', icon: '🏺', rarity: 'rare', desc: 'A thrown jar: green fire that burns where it lands.', cd: 11, act: 'fire' },
  { id: 'zeus_thunder', kind: 'artifact', name: 'Thunder of Zeus', icon: '⚡', rarity: 'rare', desc: 'Lightning strikes the five nearest monsters.', cd: 14, act: 'lightning' },
  { id: 'orpheus_lyre', kind: 'artifact', name: 'Lyre of Orpheus', icon: '🎵', rarity: 'unique', desc: 'A song so sad that every monster nearby falls asleep. Hitting them wakes them.', cd: 22, act: 'lyre' },
  { id: 'apple_of_discord', kind: 'artifact', name: 'Golden Apple of Discord', icon: '🍎', rarity: 'unique', desc: '“To the fairest.” Monsters near it turn on each other for 6 seconds.', cd: 24, act: 'discord' },
  { id: 'athena_owl', kind: 'artifact', name: 'Athena’s Owl', icon: '🦉', rarity: 'rare', desc: 'The owl marks every monster in sight: your team does +50% damage to them for 8 seconds.', cd: 18, act: 'owl' },
  { id: 'ariadne_thread', kind: 'artifact', name: 'Ariadne’s Thread', icon: '🧶', rarity: 'common', desc: 'A golden thread shows the way to what you seek, and quickens your step.', cd: 15, act: 'thread' },
  { id: 'caduceus', kind: 'artifact', name: 'Caduceus of Hermes', icon: '🐍', rarity: 'rare', desc: 'George and Martha, the staff’s two snakes, slither out to bite monsters for 12 seconds.', cd: 22, act: 'snakes' },
  { id: 'boar_tusk', kind: 'artifact', name: 'Erymanthian Boar Tusk', icon: '🐗', rarity: 'common', desc: 'Charge forward like the great boar, trampling everything in your path.', cd: 9, act: 'boar' },
  { id: 'trident_charm', kind: 'artifact', name: 'Trident of the Sea', icon: '🔱', rarity: 'rare', desc: 'Strike the ground: geysers of seawater burst up all around you.', cd: 13, act: 'geyser' },
  { id: 'sun_chariot', kind: 'artifact', name: 'Ray of the Sun Chariot', icon: '☀️', rarity: 'rare', desc: 'Apollo’s sunlight burns a line of monsters.', cd: 12, act: 'sunbeam' },
  { id: 'kronos_hourglass', kind: 'artifact', name: 'Hourglass of Kronos', icon: '⏳', rarity: 'unique', desc: 'The Titan of time’s sand: monsters slow to a crawl for 4 seconds.', cd: 30, act: 'hourglass' },
  { id: 'cornucopia', kind: 'artifact', name: 'Cornucopia', icon: '🌽', rarity: 'rare', desc: 'The horn of plenty spills healing fruit and drachmas.', cd: 30, act: 'cornucopia' },
  { id: 'stymphalian_feathers', kind: 'artifact', name: 'Stymphalian Feathers', icon: '🪶', rarity: 'common', desc: 'A fan of bronze feathers, thrown like knives.', cd: 7, act: 'feathers' },
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
  const s = { damage: 1, armor: 0, speed: 1, cdr: 0, ceGain: 1, crit: 0.08, lifesteal: 0, meleeMult: 1, committed: 0, techMult: 1, healBonus: 0, attackSpeed: 1, reach: 1, arc: 1, knock: 1, maxHp: 100, bane: 0, thorns: 0, luck: 0, regen: 0, evade: 0 };
  const procs = {}; let weapon = null; const artifacts = []; let twin = false, pierce = false;
  for (const it of gear) {
    if (!it) continue;
    const b = itemInfo(it); if (!b) continue;
    const pm = powerMult(it, hero) * itemRarity(it).mult;
    if (b.kind === 'weapon') { weapon = it; s.meleeMult *= (b.dmg ?? 1) * pm; s.attackSpeed *= b.speed ?? 1; s.reach *= b.reach ?? 1; s.arc *= b.arc ?? 1; s.knock *= b.knock ?? 1; twin = !!b.twin; pierce = !!b.pierce; }
    if (b.kind === 'armor') { s.maxHp += (b.hp ?? 0) * pm; s.armor += (b.armor ?? 0) + 0.04 * pm; s.cdr += b.cdr ?? 0; s.ceGain += b.ce ?? 0; s.speed += b.speed ?? 0; s.meleeMult += b.meleeMult ?? 0; s.techMult += b.techMult ?? 0; s.regen += b.regen ?? 0; s.evade += b.evade ?? 0; }
    if (b.kind === 'artifact') { artifacts.push({ it, base: b, cdLeft: 0, cd: b.cd }); s.techMult += 0.04 * pm; }
    for (const e of activeEnchants(it)) {
      const E = ENCHANTS[e.id]; if (!E) continue;
      E.stat?.(s, e.level);
      if (E.proc) procs[E.proc] = Math.max(procs[E.proc] ?? 0, e.level);
    }
  }
  s.armor = Math.min(0.7, s.armor); s.cdr = Math.min(0.6, s.cdr); s.evade = Math.min(0.3, s.evade);
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
