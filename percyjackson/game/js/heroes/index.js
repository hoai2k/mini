// Hero registry: display info and ability kits. Heroes marked `soon` are
// listed (locked) but not yet playable.
import { Kit } from './kit.js';
import { t } from '../text_config.js';
import { TREES } from './skillRules.js';

export const HEROES = {
  percy: { name: t('heroes.percy.name'), full: t('heroes.percy.full'), title: t('heroes.percy.title'), parent: t('heroes.percy.parent'), desc: t('heroes.percy.desc'), power: t('heroes.percy.power'), color: '#2fb6c8', unlock: 'start' },
  annabeth: { name: t('heroes.annabeth.name'), full: t('heroes.annabeth.full'), title: t('heroes.annabeth.title'), parent: t('heroes.annabeth.parent'), desc: t('heroes.annabeth.desc'), power: t('heroes.annabeth.power'), color: '#c9963a', unlock: 'start' },
  grover: { name: t('heroes.grover.name'), full: t('heroes.grover.full'), title: t('heroes.grover.title'), parent: t('heroes.grover.parent'), desc: t('heroes.grover.desc'), power: t('heroes.grover.power'), color: '#5fae4a', unlock: 'start' },
  tyson: { name: t('heroes.tyson.name'), full: t('heroes.tyson.full'), title: t('heroes.tyson.title'), parent: t('heroes.tyson.parent'), desc: t('heroes.tyson.desc'), power: t('heroes.tyson.power'), color: '#8a5a3a', unlock: 'book2' },
  clarisse: { name: t('heroes.clarisse.name'), full: t('heroes.clarisse.full'), title: t('heroes.clarisse.title'), parent: t('heroes.clarisse.parent'), desc: t('heroes.clarisse.desc'), power: t('heroes.clarisse.power'), color: '#d0402a', unlock: 'ch3' },
  thalia: { name: t('heroes.thalia.name'), full: t('heroes.thalia.full'), title: t('heroes.thalia.title'), parent: t('heroes.thalia.parent'), desc: t('heroes.thalia.desc'), power: t('heroes.thalia.power'), color: '#4a8aff', unlock: 'book3', soon: true },
  nico: { name: t('heroes.nico.name'), full: t('heroes.nico.full'), title: t('heroes.nico.title'), parent: t('heroes.nico.parent'), desc: t('heroes.nico.desc'), power: t('heroes.nico.power'), color: '#6a4a8a', unlock: 'book3', soon: true },
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
