// The heroes' skill trees and their rules: what each node costs, what it
// needs, which powers a hero knows, which three are equipped, refunds and the
// migration of older saves. The kits (percy.js …) read the ranks and the
// equipped powers; the skill screen (ui/skills.js) spends the points.
//
// Each hero has three branches. A node is one of:
//   power    a new active ability for the 1 · 2 · 3 slots. Rank 1 learns it
//            (POWER_COST points); further ranks improve it (1 point each).
//   upgrade  ranks that improve one of the hero's powers (or the ranged
//            move or the godly power).
//   passive  ranks that improve the hero all the time.
// The three abilities a hero had before the trees (the starters) are known
// from the start and equipped by default; every hero knows six powers once
// the tree is grown, for three slots.
// Rules: a rank costs 1 point (learning a power costs 2); a node may need
// another node first (`req`); a tier-2 node needs GATES[1] points spent in
// its branch's tier-1 nodes, a tier-3 node GATES[2] in its tier-1 and tier-2
// nodes, and each tier opens at a hero level (TIER_LEVEL). One point a
// level, every hero alike; a tree costs 33-36 points, so it fills at about
// level 33, when the last region (the Fields of Asphodel, monster levels
// 9-12) is done (progression.js paces the levels).
// Every branch ends in a tier-3 node: a capstone passive (`stat`: what each
// rank adds to the hero's stats, applied by heroes/kit.js) or the godly
// power's upgrade. Damage passives multiply (meleeMult ×, techMult ×), so
// they stay worth having at any gear power.
//
// Pure module (no DOM, no Three.js), so the node tests can load it.
import { t, tn } from '../text_config.js';

export const TREE_VERSION = 2;           // hero data with an older (or no) `tree` is migrated
export const POWER_COST = 2;             // learning a new power
export const GATES = [0, 2, 5];          // points in the branch's lower tiers, per tier
export const TIER_LEVEL = [1, 3, 12];    // the hero level each tier opens at (tier 3: the capstones and the godly power's upgrade)
export const SLOTS = ['t1', 't2', 't3'];

// Node makers: U(pgrade), S (passive), P(ower). `at(r)` says what rank r gives.
const U = (id, name, branch, tier, max, desc, at, o = {}) => ({ id, name, branch, tier, max, kind: 'upgrade', desc, at, ...o });
const S = (id, name, branch, tier, max, desc, at, o = {}) => ({ id, name, branch, tier, max, kind: 'passive', desc, at, ...o });
const P = (id, name, icon, branch, tier, max, desc, at, o = {}) => ({ id, name, icon, branch, tier, max, kind: 'power', desc, at, ...o });
const pct = (n) => `+${Math.round(n)}%`;
// A capstone: a tier-3 passive of two ranks that needs the branch's tier-2
// power; `stat(s, r)` adds rank r's bonuses to the hero's stats.
const C = (hero, id, branch, req, stat, at) => S(id, t(`skills.${hero}.${id}.name`), branch, 3, 2, t(`skills.${hero}.${id}.desc`), at, { req, stat });
const mul = (s, k, v) => { s[k] = (s[k] ?? 1) * (1 + v); };

// Every hero's starters, in slot order, and its tree. Upgrade nodes name the
// power they improve in `power` (ranged / domain for the fixed moves).
export const TREES = {
  percy: {
    starters: [
      { id: 'surge', name: t('skills.percy.surge.name'), icon: '🌊', desc: t('skills.percy.surge.desc') },
      { id: 'tide', name: t('skills.percy.tide.name'), icon: '💦', desc: t('skills.percy.tide.desc') },
      { id: 'throw', name: t('skills.percy.throw.name'), icon: '🗡️', desc: t('skills.percy.throw.desc') },
    ],
    branches: [
      { id: 'blade', name: t('skills.percy.branch.blade.name'), desc: t('skills.percy.branch.blade.desc') },
      { id: 'tides', name: t('skills.percy.branch.tides.name'), desc: t('skills.percy.branch.tides.desc') },
      { id: 'sea', name: t('skills.percy.branch.sea.name'), desc: t('skills.percy.branch.sea.desc') },
    ],
    nodes: [
      S('riptide', t('skills.percy.riptide.name'), 'blade', 1, 3, t('skills.percy.riptide.desc'), (r) => t('skills.percy.riptide.at', { pct: pct(8 * r) })),
      U('throw_up', t('skills.percy.throw_up.name'), 'blade', 1, 3, t('skills.percy.throw_up.desc'), (r) => t('skills.percy.throw_up.at', { metres: 10 + 1.5 * r, damage: 22 + 8 * r }), { power: 'throw', old: 'throw' }),
      P('disarm', t('skills.percy.disarm.name'), '⚔️', 'blade', 2, 3, t('skills.percy.disarm.desc'), (r) => t('skills.percy.disarm.at', { damage: 30 + 12 * (r - 1), seconds: (2 + 0.5 * (r - 1)).toFixed(1) })),
      U('jet', t('skills.percy.jet.name'), 'tides', 1, 3, t('skills.percy.jet.desc'), (r) => t('skills.percy.jet.at', { damage: 10 + 3 * r }), { power: 'ranged' }),
      U('jet_charges', t('skills.percy.jet_charges.name'), 'tides', 1, 1, t('skills.percy.jet_charges.desc'), () => t('skills.percy.jet_charges.at'), { power: 'ranged', req: 'jet' }),
      U('surge_up', t('skills.percy.surge_up.name'), 'tides', 1, 3, t('skills.percy.surge_up.desc'), (r) => t('skills.percy.surge_up.at', { metres: (7 + 1.2 * r).toFixed(1), damage: 24 + 8 * r }), { power: 'surge', old: 'surge' }),
      P('geyser', t('skills.percy.geyser.name'), '⛲', 'tides', 2, 3, t('skills.percy.geyser.desc'), (r) => t('skills.percy.geyser.at', { damage: 28 + 10 * (r - 1), metres: (2.6 + 0.4 * (r - 1)).toFixed(1) })),
      S('sea', t('skills.percy.sea.name'), 'sea', 1, 2, t('skills.percy.sea.desc'), (r) => t('skills.percy.sea.at', { n: 2 + 1.5 * r, pct: pct(25 + 10 * r) })),
      U('tide_up', t('skills.percy.tide_up.name'), 'sea', 1, 2, t('skills.percy.tide_up.desc'), (r) => t('skills.percy.tide_up.at', { metres: (3.6 + 0.6 * r).toFixed(1), seconds: 6 + 1.5 * r }), { power: 'tide', old: 'tide' }),
      P('bubble', t('skills.percy.bubble.name'), '🫧', 'sea', 2, 3, t('skills.percy.bubble.desc'), (r) => t('skills.percy.bubble.at', { seconds: 4 + (r - 1), metres: 5 + (r - 1) })),
      U('hurricane', t('skills.percy.hurricane.name'), 'sea', 3, 2, t('skills.percy.hurricane.desc'), (r) => t('skills.percy.hurricane.at', { seconds: 6 + 2 * r }), { power: 'domain' }),
      C('percy', 'sword_master', 'blade', 'disarm', (s, r) => { s.crit += 0.05 * r; s.critDmg += 0.25 * r; }, (r) => t('skills.percy.sword_master.at', { crit: 5 * r, dmg: 25 * r })),
      C('percy', 'tide_lord', 'tides', 'geyser', (s, r) => { mul(s, 'techMult', 0.1 * r); s.cdr = Math.min(0.6, s.cdr + 0.05 * r); }, (r) => t('skills.percy.tide_lord.at', { pct: 10 * r, cd: 5 * r })),
    ],
  },
  annabeth: {
    starters: [
      { id: 'cap', name: t('skills.annabeth.cap.name'), icon: '🧢', desc: t('skills.annabeth.cap.desc') },
      { id: 'plan', name: t('skills.annabeth.plan.name'), icon: '🦉', desc: t('skills.annabeth.plan.desc') },
      { id: 'trap', name: t('skills.annabeth.trap.name'), icon: '⚙️', desc: t('skills.annabeth.trap.desc') },
    ],
    branches: [
      { id: 'stealth', name: t('skills.annabeth.branch.stealth.name'), desc: t('skills.annabeth.branch.stealth.desc') },
      { id: 'strategy', name: t('skills.annabeth.branch.strategy.name'), desc: t('skills.annabeth.branch.strategy.desc') },
      { id: 'workshop', name: t('skills.annabeth.branch.workshop.name'), desc: t('skills.annabeth.branch.workshop.desc') },
    ],
    nodes: [
      S('blade', t('skills.annabeth.blade.name'), 'stealth', 1, 3, t('skills.annabeth.blade.desc'), (r) => t('skills.annabeth.blade.at', { pct: pct(8 * r) })),
      S('backstab', t('skills.annabeth.backstab.name'), 'stealth', 1, 2, t('skills.annabeth.backstab.desc'), (r) => t('skills.annabeth.backstab.at', { pct: pct(25 * r) })),
      U('cap_up', t('skills.annabeth.cap_up.name'), 'stealth', 1, 2, t('skills.annabeth.cap_up.desc'), (r) => t('skills.annabeth.cap_up.at', { seconds: 5 + 1.5 * r }), { power: 'cap', old: 'cap' }),
      P('flank', t('skills.annabeth.flank.name'), '🌀', 'stealth', 2, 3, t('skills.annabeth.flank.desc'), (r) => t('skills.annabeth.flank.at', { damage: 24 + 10 * (r - 1) })),
      S('owl', t('skills.annabeth.owl.name'), 'strategy', 1, 3, t('skills.annabeth.owl.desc'), (r) => t('skills.annabeth.owl.at', { pct: pct(4 * r) })),
      U('plan_up', t('skills.annabeth.plan_up.name'), 'strategy', 1, 2, t('skills.annabeth.plan_up.desc'), (r) => t('skills.annabeth.plan_up.at', { seconds: 8 + 2 * r, percent: 50 + 10 * r }), { power: 'plan', old: 'plan' }),
      P('orders', t('skills.annabeth.orders.name'), '📜', 'strategy', 2, 3, t('skills.annabeth.orders.desc'), (r) => t('skills.annabeth.orders.at', { seconds: 6 + (r - 1), power: 10 + 5 * (r - 1) })),
      U('gambit', t('skills.annabeth.gambit.name'), 'strategy', 3, 2, t('skills.annabeth.gambit.desc'), (r) => t('skills.annabeth.gambit.at', { seconds: 6 + 1.5 * r }), { power: 'domain' }),
      U('knives', t('skills.annabeth.knives.name'), 'workshop', 1, 1, t('skills.annabeth.knives.desc'), () => t('skills.annabeth.knives.at'), { power: 'ranged' }),
      U('trap_up', t('skills.annabeth.trap_up.name'), 'workshop', 1, 2, t('skills.annabeth.trap_up.desc'), (r) => t('skills.annabeth.trap_up.at', { seconds: (2.8 + 0.8 * r).toFixed(1), damage: 18 + 8 * r }), { power: 'trap', old: 'trap' }),
      P('automaton', t('skills.annabeth.automaton.name'), '🤖', 'workshop', 2, 3, t('skills.annabeth.automaton.desc'), (r) => t('skills.annabeth.automaton.at', { seconds: 8 + 2 * (r - 1), damage: 9 + 3 * (r - 1) })),
      C('annabeth', 'shadow_strike', 'stealth', 'flank', (s, r) => { s.crit += 0.05 * r; s.critDmg += 0.25 * r; }, (r) => t('skills.annabeth.shadow_strike.at', { crit: 5 * r, dmg: 25 * r })),
      C('annabeth', 'master_builder', 'workshop', 'automaton', (s, r) => { mul(s, 'techMult', 0.1 * r); s.cdr = Math.min(0.6, s.cdr + 0.05 * r); }, (r) => t('skills.annabeth.master_builder.at', { pct: 10 * r, cd: 5 * r })),
    ],
  },
  grover: {
    starters: [
      { id: 'vines', name: t('skills.grover.vines.name'), icon: '🌿', desc: t('skills.grover.vines.desc') },
      { id: 'calm', name: t('skills.grover.calm.name'), icon: '🎶', desc: t('skills.grover.calm.desc') },
      { id: 'maia', name: t('skills.grover.maia.name'), icon: '🪽', desc: t('skills.grover.maia.desc') },
    ],
    branches: [
      { id: 'wild', name: t('skills.grover.branch.wild.name'), desc: t('skills.grover.branch.wild.desc') },
      { id: 'pipes', name: t('skills.grover.branch.pipes.name'), desc: t('skills.grover.branch.pipes.desc') },
      { id: 'satyr', name: t('skills.grover.branch.satyr.name'), desc: t('skills.grover.branch.satyr.desc') },
    ],
    nodes: [
      U('vines_up', t('skills.grover.vines_up.name'), 'wild', 1, 3, t('skills.grover.vines_up.desc'), (r) => t('skills.grover.vines_up.at', { metres: (3.2 + 0.5 * r).toFixed(1), seconds: (2.6 + 0.6 * r).toFixed(1) }), { power: 'vines', old: 'vines' }),
      P('briar', t('skills.grover.briar.name'), '🌵', 'wild', 2, 3, t('skills.grover.briar.desc'), (r) => t('skills.grover.briar.at', { damage: 22 + 9 * (r - 1), metres: 4.5 + 0.5 * (r - 1) })),
      U('pipes', t('skills.grover.pipes.name'), 'pipes', 1, 3, t('skills.grover.pipes.desc'), (r) => t('skills.grover.pipes.at', { damage: 9 + 3 * r }), { power: 'ranged' }),
      U('song', t('skills.grover.song.name'), 'pipes', 1, 3, t('skills.grover.song.desc'), (r) => t('skills.grover.song.at', { percent: 3 + r }), { power: 'calm' }),
      U('empathy', t('skills.grover.empathy.name'), 'pipes', 1, 1, t('skills.grover.empathy.desc'), () => t('skills.grover.empathy.at'), { power: 'calm', req: 'song' }),
      P('lullaby', t('skills.grover.lullaby.name'), '💤', 'pipes', 2, 3, t('skills.grover.lullaby.desc'), (r) => t('skills.grover.lullaby.at', { seconds: (2.5 + 0.5 * (r - 1)).toFixed(1), metres: 6 + (r - 1) })),
      U('panic', t('skills.grover.panic.name'), 'pipes', 3, 2, t('skills.grover.panic.desc'), (r) => t('skills.grover.panic.at', { seconds: 5 + r }), { power: 'domain' }),
      S('hooves', t('skills.grover.hooves.name'), 'satyr', 1, 3, t('skills.grover.hooves.desc'), (r) => t('skills.grover.hooves.at', { pct: pct(8 * r) })),
      U('maia_up', t('skills.grover.maia_up.name'), 'satyr', 1, 2, t('skills.grover.maia_up.desc'), (r) => t('skills.grover.maia_up.at', { metres: 9 + 2 * r, damage: 14 + 8 * r }), { power: 'maia', old: 'maia' }),
      P('snack', t('skills.grover.snack.name'), '🥫', 'satyr', 2, 3, t('skills.grover.snack.desc'), (r) => t('skills.grover.snack.at', { percent: 25 + 8 * (r - 1), power: 15 + 5 * (r - 1) })),
      C('grover', 'wild_heart', 'wild', 'briar', (s, r) => { mul(s, 'techMult', 0.1 * r); s.regen += 1.5 * r; }, (r) => t('skills.grover.wild_heart.at', { pct: 10 * r, n: 1.5 * r })),
      C('grover', 'satyr_stamina', 'satyr', 'snack', (s, r) => { s.speed += 0.06 * r; s.maxHpPct = (s.maxHpPct ?? 0) + 0.1 * r; }, (r) => t('skills.grover.satyr_stamina.at', { speed: 6 * r, health: 10 * r })),
    ],
  },
  tyson: {
    starters: [
      { id: 'pound', name: t('skills.tyson.pound.name'), icon: '👊', desc: t('skills.tyson.pound.desc') },
      { id: 'shield', name: t('skills.tyson.shield.name'), icon: '🛡️', desc: t('skills.tyson.shield.desc') },
      { id: 'forge', name: t('skills.tyson.forge.name'), icon: '🔥', desc: t('skills.tyson.forge.desc') },
    ],
    branches: [
      { id: 'fists', name: t('skills.tyson.branch.fists.name'), desc: t('skills.tyson.branch.fists.desc') },
      { id: 'hide', name: t('skills.tyson.branch.hide.name'), desc: t('skills.tyson.branch.hide.desc') },
      { id: 'forge', name: t('skills.tyson.branch.forge.name'), desc: t('skills.tyson.branch.forge.desc') },
    ],
    nodes: [
      S('fists', t('skills.tyson.fists.name'), 'fists', 1, 3, t('skills.tyson.fists.desc'), (r) => t('skills.tyson.fists.at', { pct: pct(8 * r) })),
      S('mighty', t('skills.tyson.mighty.name'), 'fists', 1, 3, t('skills.tyson.mighty.desc'), (r) => t('skills.tyson.mighty.at', { ms: Math.round((0.14 + 0.035 * r) * 1000) })),
      S('mighty_ce', t('skills.tyson.mighty_ce.name'), 'fists', 1, 2, t('skills.tyson.mighty_ce.desc'), (r) => t('skills.tyson.mighty_ce.at', { power: 4 * r }), { req: 'mighty' }),
      U('pound_up', t('skills.tyson.pound_up.name'), 'fists', 1, 2, t('skills.tyson.pound_up.desc'), (r) => t('skills.tyson.pound_up.at', { metres: (4 + 0.8 * r).toFixed(1), damage: 30 + 12 * r }), { power: 'pound', old: 'pound' }),
      P('clap', t('skills.tyson.clap.name'), '👏', 'fists', 2, 3, t('skills.tyson.clap.desc'), (r) => t('skills.tyson.clap.at', { damage: 26 + 10 * (r - 1), seconds: (1.2 + 0.3 * (r - 1)).toFixed(1) })),
      S('vitality', t('skills.tyson.vitality.name'), 'hide', 1, 3, t('skills.tyson.vitality.desc'), (r) => t('skills.tyson.vitality.at', { health: 12 * r })),
      U('shield_up', t('skills.tyson.shield_up.name'), 'hide', 1, 2, t('skills.tyson.shield_up.desc'), (r) => t('skills.tyson.shield_up.at', { seconds: 3 + r }), { power: 'shield', old: 'shield' }),
      P('ironskin', t('skills.tyson.ironskin.name'), '🗿', 'hide', 2, 3, t('skills.tyson.ironskin.desc'), (r) => t('skills.tyson.ironskin.at', { seconds: 5 + (r - 1), power: 3 + (r - 1) })),
      U('brother', t('skills.tyson.brother.name'), 'hide', 3, 1, t('skills.tyson.brother.desc'), () => t('skills.tyson.brother.at'), { power: 'domain' }),
      U('boulder', t('skills.tyson.boulder.name'), 'forge', 1, 2, t('skills.tyson.boulder.desc'), (r) => t('skills.tyson.boulder.at', { damage: 24 + 8 * r, metres: (2.2 + 0.8 * r).toFixed(1) }), { power: 'ranged' }),
      U('forge_up', t('skills.tyson.forge_up.name'), 'forge', 1, 2, t('skills.tyson.forge_up.desc'), (r) => t('skills.tyson.forge_up.at', { seconds: 8 + 2 * r }), { power: 'forge' }),
      P('rainbow', t('skills.tyson.rainbow.name'), '🐴', 'forge', 2, 3, t('skills.tyson.rainbow.desc'), (r) => t('skills.tyson.rainbow.at', { damage: 30 + 12 * (r - 1), metres: 12 + 2 * (r - 1) })),
      C('tyson', 'cyclops_might', 'fists', 'clap', (s, r) => { mul(s, 'meleeMult', 0.08 * r); s.knock *= 1 + 0.15 * r; }, (r) => t('skills.tyson.cyclops_might.at', { pct: 8 * r, knock: 15 * r })),
      C('tyson', 'forge_born', 'forge', 'rainbow', (s, r) => { mul(s, 'techMult', 0.1 * r); s.ceGain += 0.1 * r; }, (r) => t('skills.tyson.forge_born.at', { pct: 10 * r, ce: 10 * r })),
    ],
  },
  clarisse: {
    starters: [
      { id: 'charge', name: t('skills.clarisse.charge.name'), icon: '🐗', desc: t('skills.clarisse.charge.desc') },
      { id: 'cry', name: t('skills.clarisse.cry.name'), icon: '📣', desc: t('skills.clarisse.cry.desc') },
      { id: 'bash', name: t('skills.clarisse.bash.name'), icon: '🛡️', desc: t('skills.clarisse.bash.desc') },
    ],
    branches: [
      { id: 'spear', name: t('skills.clarisse.branch.spear.name'), desc: t('skills.clarisse.branch.spear.desc') },
      { id: 'ares', name: t('skills.clarisse.branch.ares.name'), desc: t('skills.clarisse.branch.ares.desc') },
      { id: 'cabin', name: t('skills.clarisse.branch.cabin.name'), desc: t('skills.clarisse.branch.cabin.desc') },
    ],
    nodes: [
      S('spear', t('skills.clarisse.spear.name'), 'spear', 1, 3, t('skills.clarisse.spear.desc'), (r) => t('skills.clarisse.spear.at', { pct: pct(8 * r) })),
      U('volt', t('skills.clarisse.volt.name'), 'spear', 1, 3, t('skills.clarisse.volt.desc'), (r) => t('skills.clarisse.volt.at', { metres: (6.5 + 1.2 * r).toFixed(1), seconds: (0.7 + 0.25 * r).toFixed(2) }), { power: 'ranged' }),
      P('chain', t('skills.clarisse.chain.name'), '🌩️', 'spear', 2, 3, t('skills.clarisse.chain.desc'), (r) => t('skills.clarisse.chain.at', { damage: 22 + 6 * (r - 1), n: 4 + (r - 1) })),
      U('cry_up', t('skills.clarisse.cry_up.name'), 'ares', 1, 2, t('skills.clarisse.cry_up.desc'), (r) => t('skills.clarisse.cry_up.at', { seconds: 8 + 2 * r, n: 6 * r }), { power: 'cry', old: 'cry' }),
      U('charge_up', t('skills.clarisse.charge_up.name'), 'ares', 1, 2, t('skills.clarisse.charge_up.desc'), (r) => t('skills.clarisse.charge_up.at', { damage: 22 + 10 * r }), { power: 'charge', old: 'charge' }),
      P('frenzy', t('skills.clarisse.frenzy.name'), '😤', 'ares', 2, 3, t('skills.clarisse.frenzy.desc'), (r) => t('skills.clarisse.frenzy.at', { seconds: 6 + (r - 1), n: 2 + (r - 1) })),
      U('fury', t('skills.clarisse.fury.name'), 'ares', 3, 2, t('skills.clarisse.fury.desc'), (r) => t('skills.clarisse.fury.at', { seconds: 8 + 1.5 * r, n: 10 + 4 * r }), { power: 'domain' }),
      S('tough', t('skills.clarisse.tough.name'), 'cabin', 1, 3, t('skills.clarisse.tough.desc'), (r) => t('skills.clarisse.tough.at', { health: 8 * r, percent: 3 * r })),
      U('bash_up', t('skills.clarisse.bash_up.name'), 'cabin', 1, 2, t('skills.clarisse.bash_up.desc'), (r) => t('skills.clarisse.bash_up.at', { seconds: (1.4 + 0.4 * r).toFixed(1) }), { power: 'bash', old: 'bash' }),
      P('hold', t('skills.clarisse.hold.name'), '🔱', 'cabin', 2, 3, t('skills.clarisse.hold.desc'), (r) => t('skills.clarisse.hold.at', { seconds: 4 + (r - 1), damage: 8 + 3 * (r - 1) })),
      C('clarisse', 'spear_of_ares', 'spear', 'chain', (s, r) => { s.attackSpeed *= 1 + 0.06 * r; s.crit += 0.04 * r; }, (r) => t('skills.clarisse.spear_of_ares.at', { speed: 6 * r, crit: 4 * r })),
      C('clarisse', 'cabin_pride', 'cabin', 'hold', (s, r) => { s.maxHpPct = (s.maxHpPct ?? 0) + 0.1 * r; s.armor = Math.min(0.7, s.armor + 0.04 * r); }, (r) => t('skills.clarisse.cabin_pride.at', { health: 10 * r, pct: 4 * r })),
    ],
  },
};

// Old save ids that became a different node (the starter powers took the
// plain ids, their upgrades moved to `<id>_up`).
for (const t of Object.values(TREES)) for (const n of t.nodes) { n.cost = n.kind === 'power' ? [POWER_COST, 1, 1, 1].slice(0, n.max) : Array(n.max).fill(1); if (n.icon == null) n.icon = ''; }
const RENAMES = {};
for (const [hero, t] of Object.entries(TREES)) { RENAMES[hero] = {}; for (const n of t.nodes) if (n.old) RENAMES[hero][n.old] = n.id; }

// ---------------------------------------------------------------- lookups
export const treeOf = (hero) => TREES[hero] ?? { starters: [], branches: [], nodes: [] };
export const nodeOf = (hero, id) => treeOf(hero).nodes.find((n) => n.id === id) ?? null;
export const rankOf = (skills, id) => Math.max(0, Math.floor(Number(skills?.[id]) || 0));
// Points one more rank of a node costs (Infinity when it's full).
export const nextCost = (node, r) => (r < node.max ? node.cost[r] : Infinity);
export const nodeSpent = (node, r) => node.cost.slice(0, Math.min(r, node.max)).reduce((s, c) => s + c, 0);
// Points a hero has spent: every rank of every known node.
export function spentPoints(hero, skills) { let s = 0; for (const n of treeOf(hero).nodes) s += nodeSpent(n, rankOf(skills, n.id)); return s; }
// Points spent in one branch on nodes of lower tiers than `tier`.
export function branchPoints(hero, skills, branch, below = 99) { let s = 0; for (const n of treeOf(hero).nodes) if (n.branch === branch && n.tier < below) s += nodeSpent(n, rankOf(skills, n.id)); return s; }
export const treeCost = (hero) => treeOf(hero).nodes.reduce((s, n) => s + nodeSpent(n, n.max), 0);
// Points earned: one a level, from level 1.
export const pointsFor = (level) => Math.max(1, Math.floor(Number(level) || 1));
export const pointsLeft = (hero, h, level) => Math.max(0, pointsFor(level) - spentPoints(hero, h?.skills));

// Every power a hero knows (starters, and the power nodes learned), in tree order.
export function knownPowers(hero, skills) {
  const t = treeOf(hero);
  return [...t.starters.map((s) => s.id), ...t.nodes.filter((n) => n.kind === 'power' && rankOf(skills, n.id) > 0).map((n) => n.id)];
}
export function powerInfo(hero, id) {
  const t = treeOf(hero), s = t.starters.find((x) => x.id === id);
  if (s) return { ...s, starter: true };
  const n = t.nodes.find((x) => x.id === id && x.kind === 'power');
  return n ? { id, name: n.name, icon: n.icon, desc: n.desc, starter: false } : null;
}
export const defaultLoadout = (hero) => treeOf(hero).starters.map((s) => s.id);

// The three equipped powers, cleaned up: known, no repeats, every slot
// filled (the starters fill a gap, in their own order).
export function validLoadout(hero, skills, equip) {
  const known = knownPowers(hero, skills), out = [];
  for (let i = 0; i < SLOTS.length; i++) { const id = Array.isArray(equip) ? equip[i] : null; out.push(known.includes(id) && !out.includes(id) ? id : null); }
  for (let i = 0; i < out.length; i++) if (!out[i]) out[i] = [...defaultLoadout(hero), ...known].find((id) => known.includes(id) && !out.includes(id)) ?? null;
  return out;
}

// The stat bonuses of a hero's capstones (and any node with `stat`), on top
// of the gear's (heroes/kit.js calls this as a kit is made).
export function applyNodeStats(hero, skills, stats) {
  for (const n of treeOf(hero).nodes) { const r = rankOf(skills, n.id); if (r > 0 && n.stat) n.stat(stats, Math.min(r, n.max)); }
  return stats;
}

// ---------------------------------------------------------------- rules
// Can the hero buy the next rank of a node? { ok, why, cost }.
export function canRank(hero, h, level, id) {
  const n = nodeOf(hero, id); if (!n) return { ok: false, why: t('skills.reasons.unknown'), cost: Infinity };
  const skills = h?.skills ?? {}, r = rankOf(skills, id), cost = nextCost(n, r);
  if (r >= n.max) return { ok: false, why: t('skills.reasons.fullyTrained'), cost };
  if (n.req && rankOf(skills, n.req) <= 0) return { ok: false, why: t('skills.reasons.needsSkill', { name: nodeOf(hero, n.req)?.name ?? n.req }), cost };
  const lv = TIER_LEVEL[n.tier - 1] ?? 1;
  if ((Number(level) || 1) < lv) return { ok: false, why: t('skills.reasons.needsLevel', { level: lv }), cost, gated: true, level: lv };
  const gate = GATES[n.tier - 1] ?? 0, have = branchPoints(hero, skills, n.branch, n.tier);
  if (have < gate) { const b = treeOf(hero).branches.find((x) => x.id === n.branch); return { ok: false, why: t('skills.reasons.needsBranchPoints', { gate, branch: b?.name ?? n.branch, have }), cost, gated: true }; }
  if (pointsLeft(hero, h, level) < cost) return { ok: false, why: tn('skills.reasons.needsPoints', cost), cost, poor: true };
  return { ok: true, why: '', cost };
}
// Buy the next rank (mutates h); false if it can't be bought. A power
// learned isn't equipped by itself: the player chooses its slot.
export function rankUp(hero, h, level, id) {
  if (!canRank(hero, h, level, id).ok) return false;
  h.skills = h.skills ?? {}; h.skills[id] = rankOf(h.skills, id) + 1;
  h.skillPoints = pointsLeft(hero, h, level);
  return true;
}
// Put a known power in a slot (0-2). If it's already in another slot the two swap.
export function equip(hero, h, slot, id) {
  if (slot < 0 || slot >= SLOTS.length || !knownPowers(hero, h.skills).includes(id)) return false;
  const eq = validLoadout(hero, h.skills, h.equip), was = eq.indexOf(id);
  if (was === slot) return true;
  if (was >= 0) eq[was] = eq[slot];
  eq[slot] = id;
  h.equip = eq;
  return true;
}
// Refund every point; the starters go back in their slots where a learned power was.
export function respec(hero, h, level) {
  h.skills = {};
  h.equip = validLoadout(hero, h.skills, h.equip);
  h.skillPoints = pointsFor(level);
  return h;
}

// Keep only what the rules allow, cheapest foundations first: ranks capped,
// requirements and tier gates met, and no more points than the level gives.
// Unknown ids are dropped (their points come back).
export function sanitizeSkills(hero, skills, level) {
  const t = treeOf(hero), out = {}, budget = pointsFor(level);
  let spent = 0;
  for (const n of [...t.nodes].sort((a, b) => a.tier - b.tier)) {
    let r = Math.min(n.max, rankOf(skills, n.id));
    if (!r) continue;
    if (n.req && !(out[n.req] > 0)) continue;
    if (branchPoints(hero, out, n.branch, n.tier) < (GATES[n.tier - 1] ?? 0)) continue;
    if ((Number(level) || 1) < (TIER_LEVEL[n.tier - 1] ?? 1)) continue;
    while (r > 0 && spent + nodeSpent(n, r) > budget) r--;
    if (!r) continue;
    out[n.id] = r; spent += nodeSpent(n, r);
  }
  return out;
}

// Bring one hero's saved data up to this tree (mutates and returns h). Old
// saves (no `tree`) kept ranks under the ids of the version-1 tree: those
// stay where the node kept its id and move where it was renamed; nothing
// else changes, so a hero keeps what it had bought and today's three
// abilities stay equipped.
export function migrateHero(hero, h, level) {
  if (!treeOf(hero).nodes.length) { h.skills = h.skills && typeof h.skills === 'object' ? h.skills : {}; h.skillPoints = pointsFor(level); return h; }
  let skills = h.skills && typeof h.skills === 'object' ? h.skills : {};
  if (h.tree !== TREE_VERSION) {
    const ren = RENAMES[hero] ?? {}, moved = {};
    for (const [k, v] of Object.entries(skills)) { const id = ren[k] ?? k; moved[id] = Math.max(moved[id] ?? 0, rankOf(skills, k)); }
    skills = moved;
    h.tree = TREE_VERSION;
  }
  h.skills = sanitizeSkills(hero, skills, level);
  h.equip = validLoadout(hero, h.skills, h.equip);
  h.skillPoints = pointsLeft(hero, h, level);
  return h;
}

// Two copies of one hero's progress (profiles.js merging): the ranks of
// both where together they still fit the level and the rules, otherwise the
// newer copy's; the newer copy's loadout.
export function mergeHero(hero, older, newer, level) {
  const union = {};
  for (const src of [older?.skills, newer?.skills]) if (src) for (const k of Object.keys(src)) union[k] = Math.max(union[k] ?? 0, rankOf(src, k));
  const a = migrateHero(hero, { skills: union, tree: TREE_VERSION }, 1e9).skills;   // the rules, without the level
  const fits = spentPoints(hero, a) <= pointsFor(level);
  const pick = fits ? a : (newer?.skills ?? older?.skills ?? {});
  const h = { skills: pick, tree: TREE_VERSION, equip: newer?.equip ?? older?.equip };
  return migrateHero(hero, h, level);
}
