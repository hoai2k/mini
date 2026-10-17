// Hero registry: display info and ability kits. Heroes marked `soon` are
// listed (locked) but not yet playable.
import { Kit } from './kit.js';
import { TREES } from './skillRules.js';

export const HEROES = {
  percy: { name: 'Percy', full: 'Percy Jackson', title: 'Son of Poseidon', parent: 'Poseidon', desc: 'Riptide and the sea: water jets, Wave Surge, a healing tide, and Riptide thrown and recalled.', power: 'Hurricane', color: '#2fb6c8', unlock: 'start' },
  annabeth: { name: 'Annabeth', full: 'Annabeth Chase', title: 'Daughter of Athena', parent: 'Athena', desc: 'A quick bronze dagger, the invisibility cap, traps and battle plans that mark a weak point for the team.', power: "Wisdom's Gambit", color: '#c9963a', unlock: 'start' },
  grover: { name: 'Grover', full: 'Grover Underwood', title: 'Satyr Protector', parent: 'Pan (satyr)', desc: 'Reed-pipe songs that tangle, heal and calm; winged sneakers that fly over danger.', power: 'Panic', color: '#5fae4a', unlock: 'start' },
  tyson: { name: 'Tyson', full: 'Tyson', title: 'Cyclops, Son of Poseidon', parent: 'Poseidon', desc: 'Huge fists, thrown boulders, a watch that becomes a shield, and fire that cannot hurt him.', power: 'Big Brother', color: '#8a5a3a', unlock: 'book2' },
  clarisse: { name: 'Clarisse', full: 'Clarisse La Rue', title: 'Daughter of Ares', parent: 'Ares', desc: 'An electric spear, charges, war cries and a boar shield.', power: "Ares's Fury", color: '#d0402a', unlock: 'ch3' },
  thalia: { name: 'Thalia', full: 'Thalia Grace', title: 'Daughter of Zeus', parent: 'Zeus', desc: 'Spear and the terrifying Aegis; lightning that chains between foes.', power: 'Storm of Zeus', color: '#4a8aff', unlock: 'book3', soon: true },
  nico: { name: 'Nico', full: 'Nico di Angelo', title: 'Son of Hades', parent: 'Hades', desc: 'Stygian iron, shadow travel and an army of the dead.', power: 'King of the Dead', color: '#6a4a8a', unlock: 'book3', soon: true },
};
// Playable now, in select order.
export const HERO_IDS = Object.keys(HEROES).filter((id) => !HEROES[id].soon);

const KITS = {};
// Each hero's skill-tree nodes (the trees and their rules: skillRules.js).
export const SKILL_TREES = Object.fromEntries(Object.entries(TREES).map(([id, t]) => [id, t.nodes]));
export function registerKit(id, cls) { KITS[id] = cls; }
export function createKit(player) {
  const K = KITS[player.hero] || Kit;
  return new K(player);
}
