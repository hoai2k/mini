// The open world's fodder kinds and their stat blocks: plain data, no
// Three.js, so the node tests read it directly. The models are
// entities/fodder.js; data/monsters.js takes these into MONSTERS.
import { t as txt } from '../text_config.js';

// The new kinds (world/roamZones.js counts the small ones as fodder).
export const FODDER_IDS = ['karpos', 'karpos_slinger', 'colchis_calf', 'myrmex', 'myrmex_spitter', 'boarlet', 'crab', 'king_crab', 'basilisk', 'earthborn', 'daedalus_drone', 'laistrygonian', 'shade', 'keres'];

// Stat blocks (as monsters.js MONSTERS). The swarm kinds sit with the other
// minors (rat 14 HP, spider 20, pup 32); the larger chargers are minor
// bruisers; the king crab, the Earthborn and the Laistrygonian are elites.
export const FODDER_MONSTERS = {
  // fields
  karpos: { name: txt('monsters.karpos.name'), tier: 'minor', role: 'rusher', hp: 14, speed: 5.4, dmg: 4, radius: 0.48, height: 1.9, ai: 'melee', range: 1.2, windup: 0.35, cd: 1.1, xp: 2, coins: [0, 2], model: 'karpos', pitch: 1.6, voice: 'rustle', knockResist: 0 },
  karpos_slinger: { name: txt('monsters.karpos_slinger.name'), tier: 'minor', role: 'ranged', hp: 12, speed: 4.2, dmg: 5, radius: 0.48, height: 1.9, ai: 'ranged', range: 11, keep: 7, windup: 0.8, cd: 3.2, xp: 2, coins: [0, 2], model: 'karpos_slinger', pitch: 1.4, voice: 'rustle', projectile: 'feather', knockResist: 0 },
  colchis_calf: { name: txt('monsters.colchis_calf.name'), tier: 'minor', role: 'bruiser', hp: 55, speed: 4.4, dmg: 10, radius: 0.85, height: 1.5, ai: 'melee', range: 3.2, windup: 0.75, cd: 2.2, xp: 5, coins: [2, 4], model: 'colchis_calf', pitch: 0.8, voice: 'snort', armor: 0.15, knockResist: 0.5, slashColor: 0xff7a1a },
  // woods
  myrmex: { name: txt('monsters.myrmex.name'), tier: 'minor', role: 'rusher', hp: 22, speed: 4.8, dmg: 6, radius: 0.55, height: 0.9, ai: 'melee', range: 1.4, windup: 0.4, cd: 1.2, xp: 2, coins: [0, 2], model: 'myrmex', pitch: 1.3, voice: 'chitter', knockResist: 0.1 },
  myrmex_spitter: { name: txt('monsters.myrmex_spitter.name'), tier: 'minor', role: 'lobber', hp: 18, speed: 4, dmg: 6, radius: 0.6, height: 1, ai: 'ranged', range: 9, keep: 6, windup: 0.9, cd: 3.6, xp: 3, coins: [1, 2], model: 'myrmex_spitter', pitch: 1.1, voice: 'chitter', projectile: 'acid', lob: true, knockResist: 0.1 },
  boarlet: { name: txt('monsters.boarlet.name'), tier: 'minor', role: 'bruiser', hp: 50, speed: 5, dmg: 9, radius: 0.85, height: 1.9, ai: 'melee', range: 3.4, windup: 0.65, cd: 2, xp: 5, coins: [2, 4], model: 'boarlet', pitch: 0.9, voice: 'snort', knockResist: 0.5, slashColor: 0xf0e0c0 },
  // shore
  crab: { name: txt('monsters.crab.name'), tier: 'minor', role: 'fodder', hp: 28, speed: 4, dmg: 6, radius: 0.7, height: 0.9, ai: 'melee', range: 1.6, windup: 0.45, cd: 1.3, xp: 3, coins: [1, 3], model: 'crab', pitch: 1, voice: 'clack', armor: 0.1, knockResist: 0.3 },
  king_crab: { name: txt('monsters.king_crab.name'), tier: 'elite', role: 'tank', hp: 160, speed: 2.2, dmg: 16, radius: 1.8, height: 3.6, ai: 'tank', range: 2.4, windup: 0.9, cd: 2.4, xp: 10, coins: [4, 8], model: 'king_crab', pitch: 0.6, voice: 'clack', armor: 0.3, knockResist: 0.8, superArmor: true, slamR: 2.4 },
  // canyon
  basilisk: { name: txt('monsters.basilisk.name'), tier: 'minor', role: 'rusher', hp: 14, speed: 6, dmg: 5, radius: 0.35, height: 0.6, ai: 'melee', range: 1.6, windup: 0.5, cd: 1.6, xp: 2, coins: [0, 2], model: 'basilisk', pitch: 1.9, voice: 'hiss', knockResist: 0, poison: { dps: 2, dur: 3 }, slashColor: 0xff7a1a,
    // (the books' arm-long snake: it rears and puffs a short burst of fire at the spot just ahead, its touch poisons; no projectile)
    moves: [{ kind: 'sting', trigger: 1.9, at: 1.1, radius: 0.8, windup: 0.5, recover: 0.5, dmg: 1 }] },
  earthborn: { name: txt('monsters.earthborn.name'), tier: 'elite', role: 'lobber', hp: 170, speed: 2.4, dmg: 14, radius: 1, height: 3, ai: 'ranged', range: 13, keep: 8, windup: 1.1, cd: 4.9, xp: 12, coins: [5, 9], model: 'earthborn', pitch: 0.55, voice: 'grind', projectile: 'acid', lob: true, armor: 0.15, knockResist: 0.75, superArmor: true,
    // up close: a barrage of all six fists, one after another down the body (every second blow lands: about one lob's damage in all)
    pummel: { trigger: 3.4, range: 3, windup: 0.6, recover: 0.6, hits: 6, gap: 0.2, every: 2, dmg: 0.36 } },
  // labyrinth
  daedalus_drone: { name: txt('monsters.daedalus_drone.name'), tier: 'minor', role: 'ranged', hp: 18, speed: 4.6, dmg: 6, radius: 0.5, height: 1.8, ai: 'ranged', range: 11, keep: 7, windup: 0.8, cd: 3.2, xp: 3, coins: [1, 3], model: 'daedalus_drone', pitch: 1.6, voice: 'whir', projectile: 'bullet', knockResist: 0.1 },
  // othrys
  laistrygonian: { name: txt('monsters.laistrygonian.name'), tier: 'elite', role: 'lobber', hp: 220, speed: 2.4, dmg: 18, radius: 1.1, height: 4.4, ai: 'ranged', range: 14, keep: 9, windup: 1.2, cd: 5, xp: 16, coins: [7, 12], model: 'laistrygonian', pitch: 0.45, voice: 'roar', projectile: 'fire', lob: true, armor: 0.1, knockResist: 0.85, superArmor: true },
  // asphodel
  // (round 10: the shade and the keres stand as grown people, about 1.25x Percy (rig ×1.29 and ×1.26): radius 0.4-0.45 → 0.48-0.52,
  // height 1.8 → 2.3 and the reach of their longer arms 1.5 → 1.8; windups, cooldowns and damage unchanged)
  shade: { name: txt('monsters.shade.name'), tier: 'minor', role: 'fodder', hp: 16, speed: 2.4, dmg: 5, radius: 0.48, height: 2.3, ai: 'melee', range: 1.8, windup: 0.6, cd: 1.6, xp: 2, coins: [0, 2], model: 'shade', pitch: 0.9, voice: 'wail', knockResist: 0 },
  keres: { name: txt('monsters.keres.name'), tier: 'minor', role: 'rusher', hp: 16, speed: 6.6, dmg: 6, radius: 0.52, height: 2.3, ai: 'melee', range: 1.8, windup: 0.35, cd: 1.2, xp: 2, coins: [0, 2], model: 'keres', pitch: 1.2, voice: 'shriek', knockResist: 0, slashColor: 0xff2a2a },
};
