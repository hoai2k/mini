// Turns a chapter into the mission definition the level generator and the
// chapter runtime (mission.js) take. A chapter whose biome or boss hasn't
// been built yet still plays: it falls back to a biome and boss that exist,
// with a warning in the console.
import { BIOMES } from '../world/biomes.js';
import { BIOME_ROOMS } from '../world/rooms.js';
import { ENEMY_TABLES } from '../world/levelgen.js';
import { BOSS_DEFS } from '../entities/bosses.js';

export const OBJECTIVE_TYPES = ['exorcise', 'rescue', 'seal', 'flag', 'escape', 'boss'];

// Nearest built biome for each planned one.
const BIOME_FALLBACK = {
  camp_woods: 'storm_hill', highway: 'storm_hill', statue_garden: 'museum', arch: 'museum', waterland: 'storm_hill',
  casino: 'museum', desert: 'storm_hill', underworld: 'museum', beach: 'storm_hill', olympus: 'museum',
};
// Nearest built boss for each planned one.
const BOSS_FALLBACK = {
  hellhound_alpha: 'minotaur', furies: 'alecto', medusa: 'alecto', spiders: 'chimera', procrustes: 'minotaur',
  cerberus: 'chimera', ares: 'minotaur', luke: 'alecto', pit_scorpion: 'chimera', hellhound: 'minotaur',
};

export const biomeBuilt = (id) => !!(BIOMES[id] && BIOME_ROOMS[id] && ENEMY_TABLES[id]);
export function resolveBiome(id) {
  if (biomeBuilt(id)) return id;
  const alt = [BIOME_FALLBACK[id], 'museum', 'storm_hill'].find((b) => b && biomeBuilt(b));
  console.warn(`biome ${id} isn't built yet: using ${alt}`);
  return alt;
}
export function resolveBoss(id) {
  if (!id || BOSS_DEFS[id]) return id ?? null;
  const alt = [BOSS_FALLBACK[id], 'minotaur'].find((b) => b && BOSS_DEFS[b]);
  console.warn(`boss ${id} isn't built yet: using ${alt}`);
  return alt;
}

export function chapterMissionDef(ch, difficulty = 1, seed = (Math.random() * 1e9) | 0) {
  return {
    biome: resolveBiome(ch.biome),
    objective: OBJECTIVE_TYPES.includes(ch.objective) ? ch.objective : 'exorcise',
    boss: resolveBoss(ch.boss),
    difficulty, seed, chapter: ch.id, mist: ch.mist, disguise: ch.disguise, mistForms: ch.mistForms, objText: ch.objText,
  };
}
