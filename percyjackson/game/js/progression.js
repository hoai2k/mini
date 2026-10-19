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
//                  2% per point of power (powerMult), so a weapon from level-12
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
export const SOURCE_BONUS = { monster: 0, chest: 0, rare: 0.3, epic: 1, boss: 0.7, champion: 0.8, quest: 0.3, shop: -0.3, starter: -1 };
// The power of a new item: area level + source + player level, with a
// little spread (±0.4 of a level).
export function itemPowerFor(area = 1, playerLevel = 1, source = 'chest', rng = Math.random) {
  const gl = gearLevel(area, playerLevel) + (SOURCE_BONUS[source] ?? 0) + (rng() - 0.5) * 0.8;
  return Math.max(1, Math.round(powerAt(Math.max(1, gl))));
}
// How much stronger an item of this power is (×): 2% a point.
export const powerMult = (power = 10) => Math.max(0.5, 1 + (power - POWER_BASE) * 0.02);
// The cap on tempering at the forge: a little above what you'd find now.
export const temperCap = (playerLevel = 1) => Math.round(powerAt(expectedArea(playerLevel) + 1));

// Rarity odds by gear level: rare and legendary items turn up more often in
// harder places. { unique, rare } chances; the rest are common.
export function rarityOdds(gl = 1) {
  return { unique: Math.min(0.2, 0.03 + 0.012 * gl), rare: Math.min(0.5, 0.2 + 0.025 * gl) };
}
// The chance an item is blessed (a god's gift).
export const blessedChance = (gl = 1) => Math.min(0.06, 0.012 + 0.003 * gl);
