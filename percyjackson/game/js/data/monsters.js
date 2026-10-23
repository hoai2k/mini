// The bestiary's stat blocks: plain data, no Three.js, so the node tests
// read it directly. The models are entities/monsters.js (buildMonsterModel
// draws the kind named by each block's model).
import { t as txt } from '../text_config.js';
import { FODDER_MONSTERS } from './fodder.js';

// ---- stat blocks -------------------------------------------------------------
// ai: melee | ranged | tank | teleport | summon | blob | statue
// role (what it does in a fight; world/encounters.js mixes groups by it):
//   rusher (fast melee) | fodder (steady melee) | ranged | caster (homing) |
//   lobber (arcing shots) | exploder | tank | bruiser | trickster | summoner | ambusher
// tier: minor | elite | champion | boss
// aura: 'smoke' | 'fire' | 'greekfire' | 'spark' | 'wisp' | null  (ambient particles)
// projectile (ranged): 'feather' | 'fire' | 'acid' | 'bullet' | 'wisp'
// shots: projectiles a shot (a fan of feathers, a burst of bullets), fired only
//   from monster level MULTI_SHOT_LEVEL on and never in an early chapter
//   (entities/rangedRules.js shotCount); below that, one. Ranged wind-ups and
//   cooldowns are long: one shot every ~4-5 s (rangedRules.js)
// poison: { dps, dur }  a hit leaves the hero poisoned (green numbers)
// regrow: true   falls to bones and gets back up unless hit again while down
// wake: metres   'statue' monsters stand frozen until a hero comes this close
export const MONSTERS = {
  // (the owner's ruling, 2026-10: a pup is larger than a person, Mrs O'Leary's kind of "puppy": a body
  // 2.7 tall and 2.8 long, so a wider radius, a longer bite to reach past its own muzzle and a little
  // more weight against knock-back and a deeper bark; hp, speed, damage and timing unchanged)
  pup: { name: txt('monsters.pup.name'), tier: 'minor', role: 'rusher', hp: 32, speed: 5, dmg: 7, radius: 0.8, height: 2.7, ai: 'melee', range: 2, windup: 0.4, cd: 1.1, xp: 3, coins: [1, 3], model: 'pup', pitch: 1.2, voice: 'bark', knockResist: 0.2 },
  rat: { name: txt('monsters.rat.name'), tier: 'minor', role: 'rusher', hp: 14, speed: 6.4, dmg: 5, radius: 0.42, height: 0.85, ai: 'melee', range: 1.1, windup: 0.3, cd: 1.1, xp: 2, coins: [0, 2], model: 'rat', pitch: 2.4, voice: 'squeak', knockResist: 0, idle: 'loiter', notice: 4.5, drop: 3.4 },   // idle 'loiter': hangs around trash until a hero is close (entities/ratRules.js)
  serpent: { name: txt('monsters.serpent.name'), tier: 'minor', role: 'fodder', hp: 40, speed: 4.4, dmg: 8, radius: 0.55, height: 1.3, ai: 'melee', range: 1.9, windup: 0.5, cd: 1.3, xp: 4, coins: [1, 3], model: 'serpent', pitch: 0.9, voice: 'hiss', knockResist: 0.2, poison: { dps: 2, dur: 3 } },
  // a real mortal in the Mist (entities/mistPeople.js): always looks like a person, never fights, can't be hurt
  mortal: { name: txt('monsters.mortal.name'), tier: 'minor', role: 'none', hp: 100, speed: 1.4, dmg: 0, radius: 0.45, height: 2.7,   // (an adult: round 9 ADULT_SCALE 1.24 → 1.4, height 1.9 → 2.2; round 10 the hatted adult's 1.72 (mortals.js ADULT_SCALE_HAT), height 2.2 → 2.7, radius 0.4 → 0.45)
  ai: 'none', range: 0, windup: 1, cd: 1, xp: 0, coins: [0, 0], model: 'pup', mortal: true },
  spider: { name: txt('monsters.spider.name'), tier: 'minor', role: 'rusher', hp: 20, speed: 5.8, dmg: 5, radius: 0.38, height: 0.8, ai: 'melee', range: 1.3, windup: 0.35, cd: 1, xp: 2, coins: [0, 2], model: 'spider', pitch: 2.2, voice: 'click', aura: 'spark' },
  harpy: { name: txt('monsters.harpy.name'), tier: 'minor', role: 'ranged', hp: 40, speed: 3.8, dmg: 9, radius: 0.5, height: 2.5, ai: 'ranged', range: 10, keep: 6.5, windup: 0.85, cd: 3.4, xp: 5, coins: [2, 4], model: 'harpy', pitch: 1.3, projectile: 'feather', shots: 3, voice: 'screech' },
  stymphalian: { name: txt('monsters.stymphalian.name'), tier: 'minor', role: 'ranged', hp: 34, speed: 4.4, dmg: 8, radius: 0.6, height: 2.0, ai: 'ranged', range: 11, keep: 7, windup: 0.8, cd: 3.4, xp: 4, coins: [1, 4], model: 'stymphalian', pitch: 1.7, projectile: 'feather', shots: 3, voice: 'screech' },
  automaton: { name: txt('monsters.automaton.name'), tier: 'minor', role: 'exploder', hp: 30, speed: 3.9, dmg: 16, radius: 0.55, height: 1.1, ai: 'blob', range: 1.8, windup: 0.9, cd: 0, xp: 4, coins: [1, 4], model: 'automaton', pitch: 1.8, aura: 'greekfire', blast: 0x6aff3a },
  // (round 10: the dead are grown people, about 1.25x Percy: the ghost's rig 1.2 → 1.74, so radius 0.45 → 0.55 and height 2 → 2.8)
  ghost: { name: txt('monsters.ghost.name'), tier: 'minor', role: 'caster', hp: 38, speed: 3.2, dmg: 8, radius: 0.55, height: 2.8, ai: 'ranged', range: 10, keep: 6.5, windup: 0.9, cd: 3.6, xp: 4, coins: [1, 3], model: 'ghost', pitch: 0.9, projectile: 'wisp', voice: 'moan', aura: 'wisp', knockResist: 0.2 },
  fury: { name: txt('monsters.fury.name'), tier: 'elite', role: 'trickster', hp: 95, speed: 3.8, dmg: 13, radius: 0.9, height: 3.9, ai: 'teleport', range: 2.8, windup: 0.45, cd: 1.6, xp: 10, coins: [4, 7], model: 'fury', pitch: 1.1, puff: 0x3a2a24, slashColor: 0xff8a2a, voice: 'screech' },
  dracaena: { name: txt('monsters.dracaena.name'), tier: 'elite', role: 'tank', hp: 190, speed: 2.4, dmg: 18, radius: 1.1, height: 3.8, ai: 'tank', range: 3, slamR: 2.9, windup: 0.85, cd: 2.2, xp: 12, coins: [5, 9], model: 'dracaena', armor: 0.25, shield: true, knockResist: 0.75, pitch: 0.8, voice: 'hiss' },
  hellhound: { name: txt('monsters.hellhound.name'), tier: 'elite', role: 'bruiser', hp: 220, speed: 3.6, dmg: 20, radius: 1.6, height: 5, ai: 'melee', range: 3.7, windup: 0.7, cd: 1.8, xp: 14, coins: [6, 10], model: 'hellhound', knockResist: 0.7, superArmor: true, pitch: 0.5, aura: 'smoke', voice: 'bark' },
  empousa: { name: txt('monsters.empousa.name'), tier: 'elite', role: 'summoner', hp: 160, speed: 2.6, dmg: 10, radius: 0.5, height: 2.5, ai: 'summon', range: 9, keep: 8, windup: 1.0, cd: 5, xp: 16, coins: [8, 14], model: 'empousa', knockResist: 0.4, pitch: 1.2, summons: 'pup', aura: 'fire', projectile: 'fire', voice: 'screech' },
  scorpion: { name: txt('monsters.scorpion.name'), tier: 'elite', role: 'bruiser', hp: 140, speed: 3.4, dmg: 12, radius: 1.3, height: 2.4, ai: 'melee', range: 3.6, windup: 0.55, cd: 1.5, xp: 10, coins: [4, 8], model: 'scorpion', armor: 0.2, knockResist: 0.5, pitch: 1.4, voice: 'click', poison: { dps: 4, dur: 4 }, slashColor: 0x9aff3a,
    // alternates a one-two pinch of the claws with a slower, harder sting over its back (only the sting poisons; enemy.js startAttack)
    // (round 9: the scorpion grew 2.24×, rig scale 1.25 → 2.8, so its body radius 0.8 → 1.3, height 1.3 → 2.4 (the sting raised) and the
    // reach that comes from its size with it: range 2.2 → 3.6, pinch trigger 1.9 → 3.4 and reach 2 → 3.2 (its claws stand further out
    // in front of a longer body), the sting's spot 1.5 → 2.8 ahead and 0.9 → 1.4 wide; windups, cooldowns and damage unchanged)
    moves: [{ kind: 'pinch', trigger: 3.4, range: 3.2, windup: 0.5, recover: 0.55, dmg: 0.6, twin: 0.18 }, { kind: 'sting', trigger: 4, at: 2.8, radius: 1.4, windup: 0.85, recover: 0.65, dmg: 1.4 }] },
  // (round 9: the skeleton, the spartoi and the living statue grew to about 1.4x Percy, so radius 0.45-0.5 → 0.65-0.7 and height 2-2.1 → 3.2-3.4:
  // under a dungeon door's 4 blocks and its corridor's 5; the melee reach of their longer arms 1.8 → 2.1 and 2.2 → 2.5.
  // Round 10: a grown man's size, about 1.25x (rig scale 1.56 → 1.37-1.39, ×0.88-0.89), so radius 0.65-0.7 → 0.58-0.62, height
  // 3.2-3.4 → 2.85-3.0 and that reach 2.1 → 1.9 and 2.5 → 2.25; windups, cooldowns, damage and shots unchanged)
  skeleton: { name: txt('monsters.skeleton.name'), tier: 'elite', role: 'ranged', hp: 110, speed: 3, dmg: 15, radius: 0.58, height: 2.85, ai: 'ranged', range: 12, keep: 7, windup: 0.8, cd: 3, xp: 9, coins: [3, 7], model: 'skeleton', pitch: 1.1, projectile: 'bullet', shots: 2, voice: 'rattle', regrow: true },
  // a spartoi: the steady melee fodder of the sown skeleton army (beach, underworld, desert)
  spartoi: { name: txt('monsters.spartoi.name'), tier: 'minor', role: 'fodder', hp: 52, speed: 3.3, dmg: 9, radius: 0.58, height: 3.0, ai: 'melee', range: 1.9, windup: 0.5, cd: 1.4, xp: 4, coins: [1, 3], model: 'spartoi', pitch: 1.2, voice: 'rattle', knockResist: 0.2 },
  // a telekhine: lobs Greek fire in an arc (a marked spot that burns a moment): keep moving
  telekhine: { name: txt('monsters.telekhine.name'), tier: 'minor', role: 'lobber', hp: 38, speed: 3, dmg: 11, radius: 0.9, height: 2.3, ai: 'ranged', range: 12, keep: 8, windup: 1, cd: 4.4, xp: 5, coins: [1, 4], model: 'telekhine', pitch: 0.9, projectile: 'fire', lob: true, voice: 'bark', aura: 'greekfire' },
  gorgon_statue: { name: txt('monsters.gorgon_statue.name'), tier: 'elite', role: 'ambusher', hp: 150, speed: 2.6, dmg: 16, radius: 0.62, height: 2.9, ai: 'statue', range: 2.25, windup: 0.7, cd: 1.6, xp: 9, coins: [3, 6], model: 'gorgon_statue', armor: 0.35, knockResist: 0.6, pitch: 0.7, voice: 'grind', wake: 5 },
  cyclops: { name: txt('monsters.cyclops.name'), tier: 'champion', role: 'bruiser', hp: 620, speed: 2.3, dmg: 28, radius: 1.2, height: 4.2, ai: 'tank', range: 3.2, windup: 1.0, cd: 2.4, xp: 40, coins: [15, 25], model: 'cyclops', knockResist: 0.9, superArmor: true, pitch: 0.45, voice: 'roar', slamR: 3.6 },
};
// Old Cursed Dungeons kinds still requested by shared code (wave spawner,
// level tables) map onto the Greek bestiary.
export const LEGACY_KINDS = { swarmer: 'pup', imp: 'pup', spitter: 'harpy', blob: 'automaton', tank: 'dracaena', teleporter: 'fury', summoner: 'empousa' };
// the open world's swarm fodder (entities/fodder.js)
Object.assign(MONSTERS, FODDER_MONSTERS);
for (const [old, now] of Object.entries(LEGACY_KINDS)) Object.defineProperty(MONSTERS, old, { value: MONSTERS[now], enumerable: false });
export const MONSTER_IDS = Object.keys(MONSTERS);
export const CURSES = MONSTERS;
export const resolveKind = (kind) => (MONSTERS[kind] ? (LEGACY_KINDS[kind] ?? kind) : 'pup');
