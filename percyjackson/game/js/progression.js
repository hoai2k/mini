// Level progression and gear power: one place for the numbers that pace the
// whole game, so XP, monster levels and loot stay in step.
//
//   Player level   XP from kills, chapters, bosses, shrines and side quests.
//                  The curve (xpFor) is tuned so that playing through the
//                  content in order keeps a hero about 2.6 levels per monster
//                  level: about level 6 leaving camp's fields, 15 on the Road
//                  West's middle, 30 in the Fields of Asphodel, which is about
//                  when the skill tree (about 35 points) fills.
//   Monster level  1-12 in the open world and on the Road West (owLayout.js,
//                  rtLayout.js); a chapter's monsters take the level of the
//                  place it starts (CHAPTER_LEVEL), plus one per difficulty
//                  step above Mortal.
//   Gear level     the monster level an item is made for: the area's level,
//                  nudged up to one level toward the player's own level
//                  (gearLevel), plus a little for better sources (a champion's
//                  epic chest, a boss). Item power is 10 at gear level 1 and
//                  13 more per level (powerAt), and an item's strength grows
//                  2.1% per point of power (powerMult), so a weapon from level-12
//                  monsters hits about four times as hard as the training
//                  sword, as those monsters have about five times the health.
//
// Pure module (no DOM, no Three.js), so the node tests can load it.

// ---------------------------------------------------------------- XP
// XP to go from `level` to the next: a quick first few levels (250, 470,
// 740…), then about 180 more a level, levelling off past 40 (the later
// regions pay much more for every kill and quest). Rounded to tens.
export function xpFor(level) {
  const x = Math.min(45, Math.max(0, Math.floor(level) - 1));
  const core = 560 + 180 * x - 2 * x * x;
  return Math.round((core * Math.min(1, 0.45 + 0.18 * x)) / 10) * 10;
}
// Total XP to reach a level from level 1.
export function xpToReach(level) { let s = 0; for (let l = 1; l < level; l++) s += xpFor(l); return s; }

// A monster's level multiplies its XP as it multiplies its health
// (entities/enemy.js: +35% a level), so a fight is worth about the same per
// second at every level. Elites (affixes) are worth double, champions four
// times (on top of their elite).
export const KILL_XP_STEP = 0.35;
export function killXp(base = 3, level = 1, { elite = false, champion = false } = {}) {
  return Math.round(base * (1 + KILL_XP_STEP * Math.max(0, level - 1)) * (elite ? 2 : 1) * (champion ? 4 : 1));
}
// Finishing a chapter, beating a boss, winning a shrine trial (by the monster level).
export const chapterXp = (level = 1, difficulty = 1) => Math.round((90 + 45 * (level - 1)) * (1 + 0.25 * (difficulty - 1)));
export const bossXp = (level = 1) => Math.round(150 + 60 * (level - 1));
export const shrineXp = (level = 1) => Math.round(60 + 45 * (level - 1));

// The monster level a hero of this player level is ready for (what the
// curve aims at; gearLevel and the shop use it).
export const LEVEL_PER_AREA = 2.6;
export function expectedArea(playerLevel = 1) { return Math.max(1, 1 + (Math.max(1, playerLevel) - 1) / LEVEL_PER_AREA); }

// ---------------------------------------------------------------- chapters
// The monster level of each chapter at Mortal: the level of the place it
// starts (camp and its fields for the first three, then the Road West's stops).
export const CHAPTER_LEVEL = { lt1: 1, lt2: 1, lt3: 2, lt4: 3, lt5: 4, lt6: 5, lt7: 6, lt8: 7, lt9: 9, lt10: 10, lt11: 11, lt12: 12 };
// The level of a chapter's monsters (and boss): its place, plus one for each
// difficulty step above Mortal. A mission without a chapter (the training
// waves, a custom run) keeps the old rule: its difficulty.
export function missionLevel(chapterId, difficulty = 1) {
  const base = CHAPTER_LEVEL[chapterId];
  return base ? base + Math.max(0, difficulty - 1) : Math.max(1, difficulty);
}

// ---------------------------------------------------------------- gear
// The monster level an item is made for: the area's level, pulled up to one
// level toward a player who is ahead of it (or half a level down for one
// behind), so drops follow both where you are and how far you've come.
export function gearLevel(area = 1, playerLevel = 1) {
  const pull = expectedArea(playerLevel) - area;
  return Math.max(1, area + Math.max(-0.5, Math.min(1, pull * 0.35)));
}
// Item power for a gear level, and the extra a source adds (in gear levels).
export const POWER_BASE = 10;
export const POWER_STEP = 13;
export const powerAt = (gl = 1) => POWER_BASE + POWER_STEP * (Math.max(1, gl) - 1);
export const levelOfPower = (power = 10) => 1 + (power - POWER_BASE) / POWER_STEP;
export const SOURCE_BONUS = { monster: 0, chest: 0, rare: 0.3, elite: 0.4, epic: 1, boss: 0.7, champion: 0.8, quest: 0.3, shop: -0.3, starter: -1 };
// The power of a new item: area level + source + player level, with a
// little spread (±0.4 of a level).
export function itemPowerFor(area = 1, playerLevel = 1, source = 'chest', rng = Math.random) {
  const gl = gearLevel(area, playerLevel) + (SOURCE_BONUS[source] ?? 0) + (rng() - 0.5) * 0.8;
  return Math.max(1, Math.round(powerAt(Math.max(1, gl))));
}
// How much stronger an item of this power is (×): 2.1% a point. (It was 2%;
// the loot rework shrank rarity's hidden strength from ×1.12 / 1.25 to
// ×1.02-1.08, and design/loot-design.md §4.1 names 2.1% as the make-up:
// the time-to-kill sweep in its phase-2 notes.)
export const POWER_PCT = 0.021;
export const powerMult = (power = 10) => Math.max(0.5, 1 + (power - POWER_BASE) * POWER_PCT);
// The cap on tempering at the forge: a little above what you'd find now.
export const temperCap = (playerLevel = 1) => Math.round(powerAt(expectedArea(playerLevel) + 1));

// ---------------------------------------------------------------- rarity (design/loot-design.md §4.2)
// Four tiers: common, rare, heroic (a roll on a Common or Rare base, as
// Minecraft Dungeons II's Special) and unique (Legendary). Each source has its
// own weights (MCD2's, as fan sites read them from the game data); the weights
// are multiplied by the player-level factors (MCD2's ramp, with a 0.15 floor
// for Heroic and Legendary from level 2) and Heroic and Legendary by the
// difficulty factor. The Shop never sells Legendaries.
export const RARITY_TIERS = ['common', 'rare', 'heroic', 'unique'];
const W = (common, rare, heroic, unique) => ({ common, rare, heroic, unique });
export const RARITY_WEIGHTS = {
  monster: W(50, 25, 20, 5),     // minor and elite-tier kinds
  chest: W(25, 25, 20, 5),       // a common chest
  rare: W(0, 50, 40, 10),        // a rare chest
  elite: W(0, 50, 40, 10),       // an affixed elite
  champion: W(0, 50, 40, 10),    // a champion-tier kind, an open-world champion
  boss: W(0, 30, 20, 10),
  epic: W(0, 30, 20, 10),        // an epic chest (a champion's, a trial's)
  quest: W(30, 60, 40, 5),       // a side quest, the chapter reward
  shop: W(40, 40, 20, 0),
};
const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const RARITY_FLOOR = 0.15;
export function levelFactors(L = 1) {
  L = Math.max(1, L);
  return {
    common: 1 - 0.5 * clamp01((L - 1) / 5),
    rare: L <= 5 ? 0.6 + 0.4 * (L - 1) / 4 : 1 - 0.5 * clamp01((L - 5) / 10),
    heroic: L < 2 ? 0 : Math.max(RARITY_FLOOR, clamp01((L - 1) / 10)),
    unique: L < 2 ? 0 : Math.max(RARITY_FLOOR, clamp01((L - 1) / 12)),
  };
}
// Mortal ×1, then +25% a difficulty step (Heroic and Legendary only).
export const difficultyFactor = (d = 1) => 1 + 0.25 * (Math.max(1, d) - 1);
// The odds of each tier for a source, a player level and a difficulty:
// { common, rare, heroic, unique }, summing to 1.
export function rarityWeights(source = 'monster', playerLevel = 1, difficulty = 1) {
  const w = RARITY_WEIGHTS[source] ?? RARITY_WEIGHTS.monster, f = levelFactors(playerLevel), d = difficultyFactor(difficulty);
  const raw = { common: w.common * f.common, rare: w.rare * f.rare, heroic: w.heroic * f.heroic * d, unique: w.unique * f.unique * d };
  let sum = raw.common + raw.rare + raw.heroic + raw.unique;
  if (sum <= 0) { raw.rare = 1; sum = 1; }   // (never empty: a source with no Commons at level 1 gives Rares)
  for (const k in raw) raw[k] /= sum;
  return raw;
}
// Roll a tier from rarityWeights.
export function rollTier(source = 'monster', playerLevel = 1, difficulty = 1, rng = Math.random) {
  const o = rarityWeights(source, playerLevel, difficulty), x = rng();
  let acc = 0;
  for (const k of RARITY_TIERS) { acc += o[k]; if (x < acc) return k; }
  return o.unique > 0 ? 'unique' : o.heroic > 0 ? 'heroic' : 'rare';
}
// The player level the curve expects at a gear level (for callers that only
// know an item's power).
export const levelForGear = (gl = 1) => Math.max(1, Math.round(1 + (Math.max(1, gl) - 1) * LEVEL_PER_AREA));
// Old callers: the odds for a gear level (a common chest, a player on the curve).
export function rarityOdds(gl = 1) { return rarityWeights('chest', levelForGear(gl), 1); }
// The chance an item is blessed (a god's gift; Rare and better only).
export const blessedChance = (gl = 1) => Math.min(0.06, 0.012 + 0.003 * gl);

// ---------------------------------------------------------------- the Fates' Thread (pity)
// Each profile counts the item drops since its last Legendary
// (save.data.sinceLegendary). At PITY_AT, the next drop from one of these
// sources is Legendary; any Legendary resets the count (loot.js applyPity).
export const PITY_AT = 40;
export const PITY_SOURCES = ['rare', 'elite', 'champion', 'boss', 'epic'];

// ---------------------------------------------------------------- drops (§4.3)
// Item chance per human player near the kill, by what kind of monster fell.
export const DROP_CHANCE = { minor: 0.02, fodder: 0.004, elite: 0.08, affixed: 0.25, champion: 0.6, owChampion: 1 };
export const DROP_RANGE = 40;           // metres: players further from the kill get nothing
export const OW_CHAMPION_SECOND = 0.5;  // an open-world champion: 1 + 50% a second
// Items in a chest, a boss's loot and the chapter reward.
export const CHEST_ITEMS = { common: [1, 0], rare: [1, 0.5], epic: [2, 0], boss: [2, 0] };   // [guaranteed, chance of one more]
export const BOSS_ITEMS = { guaranteed: 1, extra: 3, chance: 0.5 };   // 1 + 3 × 50%
export const SIGNATURE_REPEAT = 0.5;    // later wins: a Legendary from the boss is its signature this often
export const SIGNATURE_BLESSED_AT = 3;  // the first win's signature is Blessed from this difficulty
// Drachmas. `chance` that a source pays at all, then base + `extra` tries at
// 50% (MCD2's "10 + up to 10 at 50%"), × the level factor (coinLevel).
export const COIN_DROPS = {
  minor: { chance: 0.4, base: 1, extra: 1 },     // avg 0.6
  fodder: { chance: 0.15, base: 1, extra: 0 },
  chest: { chance: 1, base: 10, extra: 5 },      // avg 12.5
  rare: { chance: 1, base: 18, extra: 8 },       // avg 22
  epic: { chance: 1, base: 35, extra: 10 },      // avg 40
  boss: { chance: 1, base: 50, extra: 10 },      // avg 55
  pot: { chance: 0.3, base: 1, extra: 4 },       // pots, urns, crates, barrels: avg 3 when they pay
};
export const AFFIXED_COINS = 2;          // an affixed elite pays double
export const CHAPTER_COINS = 20;         // the chapter reward: 20 × the chapter's monster level
export const COIN_STACK = 5;             // a payout of 5 or more drops as stacks worth 5
export const coinLevel = (level = 1) => 1 + 0.15 * Math.max(0, level - 1);
export function rollCoins(kind, level = 1, rng = Math.random) {
  const c = COIN_DROPS[kind]; if (!c || rng() >= c.chance) return 0;
  let n = c.base; for (let i = 0; i < c.extra; i++) if (rng() < 0.5) n++;
  return Math.round(n * coinLevel(level));
}
export const avgCoins = (kind, level = 1) => { const c = COIN_DROPS[kind]; return c ? c.chance * (c.base + c.extra / 2) * coinLevel(level) : 0; };
// Split a payout into stacks of COIN_STACK and single drachmas: [stacks, singles].
export const coinStacks = (n) => (n >= COIN_STACK ? [Math.floor(n / COIN_STACK), n % COIN_STACK] : [0, n]);

// ---------------------------------------------------------------- the forge (§4.6)
// Rarity raises what the forge charges (MCD2's Blacksmith ×1.1 / 1.2 / 1.3).
export const RARITY_COST = { common: 1, rare: 1.1, heroic: 1.2, unique: 1.3 };
export const rarityCost = (tier = 'common') => RARITY_COST[tier] ?? 1;
// What "Reforge to level" raises an item to: what drops now for this player.
export const reforgePower = (playerLevel = 1) => Math.round(powerAt(gearLevel(expectedArea(playerLevel), playerLevel)));
// An equipped item more than a gear level below that is outdated (the amber dot).
export const OUTDATED_BY = POWER_STEP;
