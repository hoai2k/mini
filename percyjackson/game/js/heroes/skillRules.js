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
// nodes. One point a level, every hero alike, so a level-14 hero has 14
// points for a tree of about 30.
//
// Pure module (no DOM, no Three.js), so the node tests can load it.

export const TREE_VERSION = 2;           // hero data with an older (or no) `tree` is migrated
export const POWER_COST = 2;             // learning a new power
export const GATES = [0, 2, 5];          // points in the branch's lower tiers, per tier
export const SLOTS = ['t1', 't2', 't3'];

// Node makers: U(pgrade), S (passive), P(ower). `at(r)` says what rank r gives.
const U = (id, name, branch, tier, max, desc, at, o = {}) => ({ id, name, branch, tier, max, kind: 'upgrade', desc, at, ...o });
const S = (id, name, branch, tier, max, desc, at, o = {}) => ({ id, name, branch, tier, max, kind: 'passive', desc, at, ...o });
const P = (id, name, icon, branch, tier, max, desc, at, o = {}) => ({ id, name, icon, branch, tier, max, kind: 'power', desc, at, ...o });
const pct = (n) => `+${Math.round(n)}%`;

// Every hero's starters, in slot order, and its tree. Upgrade nodes name the
// power they improve in `power` (ranged / domain for the fixed moves).
export const TREES = {
  percy: {
    starters: [
      { id: 'surge', name: 'Wave Surge', icon: '🌊', desc: 'A cone of seawater that knocks monsters flat.' },
      { id: 'tide', name: 'Healing Tide', icon: '💦', desc: 'A pool of seawater that heals heroes in it and slows monsters.' },
      { id: 'throw', name: 'Riptide Throw', icon: '🗡️', desc: 'Riptide spins out in a line and comes back to his hand.' },
    ],
    branches: [
      { id: 'blade', name: 'Riptide', desc: 'Swordsmanship, as Luke taught it' },
      { id: 'tides', name: 'Tides', desc: 'Water as a weapon' },
      { id: 'sea', name: 'Son of the Sea', desc: 'The sea heals and shields' },
    ],
    nodes: [
      S('riptide', 'Celestial Bronze', 'blade', 1, 3, 'Melee damage.', (r) => `${pct(8 * r)} melee damage`),
      U('throw_up', 'Returning Blade', 'blade', 1, 3, 'Riptide Throw flies further and hits harder.', (r) => `${10 + 1.5 * r} m, ${22 + 8 * r} damage`, { power: 'throw', old: 'throw' }),
      P('disarm', 'Disarming Strike', '⚔️', 'blade', 2, 3, 'A lunging thrust. The monster it hits is stunned; a boss is left open (marked) instead.', (r) => `${30 + 12 * (r - 1)} damage, ${(2 + 0.5 * (r - 1)).toFixed(1)} s stun`),
      U('jet', 'Pressure Jet', 'tides', 1, 3, 'Water Jet hits harder.', (r) => `${10 + 3 * r} damage a jet`, { power: 'ranged' }),
      U('jet_charges', 'Fire Hose', 'tides', 1, 1, 'Water Jet holds two charges.', () => '2 charges', { power: 'ranged', req: 'jet' }),
      U('surge_up', 'Tidal Force', 'tides', 1, 3, 'Wave Surge reaches further and hits harder.', (r) => `${(7 + 1.2 * r).toFixed(1)} m, ${24 + 8 * r} damage`, { power: 'surge', old: 'surge' }),
      P('geyser', 'Geyser', '⛲', 'tides', 2, 3, 'Water bursts out of the ground where you aim and throws monsters into the air.', (r) => `${28 + 10 * (r - 1)} damage, ${(2.6 + 0.4 * (r - 1)).toFixed(1)} m across`),
      S('sea', 'Son of the Sea', 'sea', 1, 2, 'In water Percy heals faster and hits harder.', (r) => `heals ${2 + 1.5 * r}/s in water, ${pct(25 + 10 * r)} damage in water`),
      U('tide_up', 'Deep Tide', 'sea', 1, 2, 'Healing Tide is wider, lasts longer and heals more.', (r) => `${(3.6 + 0.6 * r).toFixed(1)} m, ${6 + 1.5 * r} s`, { power: 'tide', old: 'tide' }),
      P('bubble', 'Air Bubble', '🫧', 'sea', 2, 3, 'A bubble of sea air round Percy and the heroes near him: half damage from every hit.', (r) => `${4 + (r - 1)} s, heroes within ${5 + (r - 1)} m`),
      U('hurricane', 'Eye of the Storm', 'sea', 3, 2, 'Hurricane lasts longer.', (r) => `${6 + 2 * r} s`, { power: 'domain' }),
    ],
  },
  annabeth: {
    starters: [
      { id: 'cap', name: 'Yankees Cap', icon: '🧢', desc: 'Invisible for a few seconds; the first hit out of hiding is critical.' },
      { id: 'plan', name: 'Battle Plan', icon: '🦉', desc: "Marks a monster's weak point: it takes +50% damage from the team." },
      { id: 'trap', name: 'Daedalus Trap', icon: '⚙️', desc: 'A bronze snare that roots the monsters that step on it.' },
    ],
    branches: [
      { id: 'stealth', name: 'Stealth', desc: 'The cap and the dagger' },
      { id: 'strategy', name: 'Strategy', desc: 'Plans that win battles' },
      { id: 'workshop', name: 'Workshop', desc: "Daedalus's inventions" },
    ],
    nodes: [
      S('blade', 'Bronze Edge', 'stealth', 1, 3, 'Melee damage.', (r) => `${pct(8 * r)} melee damage`),
      S('backstab', 'Weak Spot', 'stealth', 1, 2, 'Hits from behind deal more.', (r) => `${pct(25 * r)} damage from behind`),
      U('cap_up', 'Yankees Cap', 'stealth', 1, 2, 'Invisibility lasts longer.', (r) => `${5 + 1.5 * r} s invisible`, { power: 'cap', old: 'cap' }),
      P('flank', 'Flank', '🌀', 'stealth', 2, 3, 'She darts round behind the monster you aim at and strikes: the hit is critical.', (r) => `${24 + 10 * (r - 1)} damage, x2 critical`),
      S('owl', 'Grey Eyes', 'strategy', 1, 3, 'Critical chance.', (r) => `${pct(4 * r)} critical chance`),
      U('plan_up', 'Strategist', 'strategy', 1, 2, 'Battle Plan lasts longer and the mark bites harder.', (r) => `${8 + 2 * r} s, mark +${50 + 10 * r}%`, { power: 'plan', old: 'plan' }),
      P('orders', 'Battle Orders', '📜', 'strategy', 2, 3, 'Every hero near her runs faster and gains Power.', (r) => `+30% speed for ${6 + (r - 1)} s, +${10 + 5 * (r - 1)} Power`),
      U('gambit', 'Wisdom', 'strategy', 3, 2, "Wisdom's Gambit lasts longer.", (r) => `${6 + 1.5 * r} s`, { power: 'domain' }),
      U('knives', 'Twin Knives', 'workshop', 1, 1, 'Thrown Knife throws two blades.', () => '2 knives', { power: 'ranged' }),
      U('trap_up', 'Daedalus Workshop', 'workshop', 1, 2, 'Traps root longer and hit harder.', (r) => `${(2.8 + 0.8 * r).toFixed(1)} s root, ${18 + 8 * r} damage`, { power: 'trap', old: 'trap' }),
      P('automaton', 'Bronze Automaton', '🤖', 'workshop', 2, 3, 'A little bronze sentry that throws knives at the monsters near it.', (r) => `${8 + 2 * (r - 1)} s, ${9 + 3 * (r - 1)} damage a knife`),
    ],
  },
  grover: {
    starters: [
      { id: 'vines', name: 'Tangle Vines', icon: '🌿', desc: 'Blocky vines burst from the ground and root monsters.' },
      { id: 'calm', name: 'Calming Song', icon: '🎶', desc: 'Heals every hero near him over a few seconds and slows monsters.' },
      { id: 'maia', name: 'Maia!', icon: '🪽', desc: 'Winged sneakers carry him over gaps and monsters.' },
    ],
    branches: [
      { id: 'wild', name: 'Wild', desc: 'The forest fights for him' },
      { id: 'pipes', name: 'Reed Pipes', desc: 'Songs of Pan' },
      { id: 'satyr', name: 'Satyr', desc: 'Hooves, sneakers and snacks' },
    ],
    nodes: [
      U('vines_up', 'Wild Growth', 'wild', 1, 3, 'Tangle Vines cover more ground and hold longer.', (r) => `${(3.2 + 0.5 * r).toFixed(1)} m, ${(2.6 + 0.6 * r).toFixed(1)} s`, { power: 'vines', old: 'vines' }),
      P('briar', 'Briar Burst', '🌵', 'wild', 2, 3, 'Thorns burst up all round Grover, hurting, slowing and pushing back the monsters close by.', (r) => `${22 + 9 * (r - 1)} damage, ${4.5 + 0.5 * (r - 1)} m`),
      U('pipes', 'Reed Pipes', 'pipes', 1, 3, 'Pipe Song bolts hit harder.', (r) => `${9 + 3 * r} damage a bolt`, { power: 'ranged' }),
      U('song', 'Calming Song', 'pipes', 1, 3, 'Calming Song heals more.', (r) => `${3 + r}% health every half second`, { power: 'calm' }),
      U('empathy', 'Empathy Link', 'pipes', 1, 1, 'Calming Song also restores Power to the team.', () => '+2 Power every half second', { power: 'calm', req: 'song' }),
      P('lullaby', 'Lullaby', '💤', 'pipes', 2, 3, 'A sleepy tune: monsters near him nod off (bosses only slow down).', (r) => `${(2.5 + 0.5 * (r - 1)).toFixed(1)} s asleep, ${6 + (r - 1)} m`),
      U('panic', 'Voice of Pan', 'pipes', 3, 2, 'Panic lasts longer.', (r) => `${5 + r} s`, { power: 'domain' }),
      S('hooves', 'Hoof Kick', 'satyr', 1, 3, 'Melee damage.', (r) => `${pct(8 * r)} melee damage`),
      U('maia_up', 'Maia!', 'satyr', 1, 2, 'Flies further and lands with a stomp that hits harder.', (r) => `${9 + 2 * r} m, ${14 + 8 * r} damage stomp`, { power: 'maia', old: 'maia' }),
      P('snack', 'Tin-Can Snack', '🥫', 'satyr', 2, 3, 'Grover munches a tin can: health and Power back.', (r) => `${25 + 8 * (r - 1)}% health, +${15 + 5 * (r - 1)} Power`),
    ],
  },
  tyson: {
    starters: [
      { id: 'pound', name: 'Ground Pound', icon: '👊', desc: 'Leaps and slams the ground, launching everything near.' },
      { id: 'shield', name: 'Watch Shield', icon: '🛡️', desc: 'A bronze shield that blocks every hit from the front and bats arrows back.' },
      { id: 'forge', name: 'Forge Fire', icon: '🔥', desc: "Immune to fire; the team's melee hits deal +30% for a while." },
    ],
    branches: [
      { id: 'fists', name: 'Fists', desc: 'Huge and heavy' },
      { id: 'hide', name: 'Cyclops Hide', desc: 'Nothing gets past him' },
      { id: 'forge', name: 'Forge and Sea', desc: 'Fire, bronze and a hippocampus friend' },
    ],
    nodes: [
      S('fists', 'Heavy Hands', 'fists', 1, 3, 'Melee damage.', (r) => `${pct(8 * r)} melee damage`),
      S('mighty', 'Mighty Blow', 'fists', 1, 3, 'A wider timing window for Mighty Blows.', (r) => `${Math.round((0.14 + 0.035 * r) * 1000)} ms window`),
      S('mighty_ce', "Smith's Rhythm", 'fists', 1, 2, 'Mighty Blows restore Power.', (r) => `+${4 * r} Power a Mighty Blow`, { req: 'mighty' }),
      U('pound_up', 'Earthshaker', 'fists', 1, 2, 'Ground Pound covers more ground and hits harder.', (r) => `${(4 + 0.8 * r).toFixed(1)} m, ${30 + 12 * r} damage`, { power: 'pound', old: 'pound' }),
      P('clap', 'Thunder Clap', '👏', 'fists', 2, 3, 'He claps his hands: a shock wave in front of him that stuns.', (r) => `${26 + 10 * (r - 1)} damage, ${(1.2 + 0.3 * (r - 1)).toFixed(1)} s stun`),
      S('vitality', 'Cyclops Hide', 'hide', 1, 3, 'Max health.', (r) => `+${15 * r} max health`),
      U('shield_up', 'Hephaestus Steel', 'hide', 1, 2, 'Watch Shield lasts longer.', (r) => `${3 + r} s`, { power: 'shield', old: 'shield' }),
      P('ironskin', 'Iron Skin', '🗿', 'hide', 2, 3, 'Half damage and no knock-back for a while; every hit he takes gives Power.', (r) => `${5 + (r - 1)} s, +${3 + (r - 1)} Power a hit`),
      U('brother', 'Big Brother', 'hide', 3, 1, 'Big Brother lasts longer.', () => '10 s', { power: 'domain' }),
      U('boulder', 'Bigger Boulders', 'forge', 1, 2, 'Boulders are bigger and burst wider on landing.', (r) => `${24 + 8 * r} damage, ${(2.2 + 0.8 * r).toFixed(1)} m burst`, { power: 'ranged' }),
      U('forge_up', 'Hot Forge', 'forge', 1, 2, 'Forge Fire burns longer.', (r) => `${8 + 2 * r} s`, { power: 'forge' }),
      P('rainbow', 'Call Rainbow', '🐴', 'forge', 2, 3, 'Rainbow the hippocampus surges through in a line of seawater, trampling monsters.', (r) => `${30 + 12 * (r - 1)} damage, ${12 + 2 * (r - 1)} m`),
    ],
  },
  clarisse: {
    starters: [
      { id: 'charge', name: 'Charge', icon: '🐗', desc: 'A shield-first dash that carries monsters along and slams them down.' },
      { id: 'cry', name: 'War Cry', icon: '📣', desc: 'The whole team deals +25% damage for a while.' },
      { id: 'bash', name: 'Shield Bash', icon: '🛡️', desc: 'A cone of shield bash that stuns.' },
    ],
    branches: [
      { id: 'spear', name: 'Spear', desc: 'Lightning down the spear' },
      { id: 'ares', name: 'Ares', desc: 'War, and loving it' },
      { id: 'cabin', name: 'Cabin Five', desc: 'Tough as the Ares cabin' },
    ],
    nodes: [
      S('spear', 'Maimer', 'spear', 1, 3, 'Melee damage.', (r) => `${pct(8 * r)} melee damage`),
      U('volt', 'Live Current', 'spear', 1, 3, 'Spear Lightning reaches further and stuns longer.', (r) => `${(6.5 + 1.2 * r).toFixed(1)} m, ${(0.7 + 0.25 * r).toFixed(2)} s stun`, { power: 'ranged' }),
      P('chain', 'Chain Lightning', '🌩️', 'spear', 2, 3, 'A bolt from the spear that leaps from monster to monster.', (r) => `${22 + 6 * (r - 1)} damage, ${4 + (r - 1)} monsters`),
      U('cry_up', 'Battle Cry', 'ares', 1, 2, 'War Cry lasts longer and heals the team a little.', (r) => `${8 + 2 * r} s, heals ${6 * r}`, { power: 'cry', old: 'cry' }),
      U('charge_up', 'Battering Ram', 'ares', 1, 2, 'Charge goes further and slams harder.', (r) => `${22 + 10 * r} damage slam`, { power: 'charge', old: 'charge' }),
      P('frenzy', 'Battle Frenzy', '😤', 'ares', 2, 3, 'Her melee hits deal more and heal her for a while.', (r) => `${6 + (r - 1)} s, +30% melee, ${2 + (r - 1)} health a hit`),
      U('fury', 'Blood of Ares', 'ares', 3, 2, "Ares's Fury lasts longer and burns hotter.", (r) => `${8 + 1.5 * r} s, ${10 + 4 * r} burn a second`, { power: 'domain' }),
      S('tough', 'Cabin Five', 'cabin', 1, 3, 'Max health and armour.', (r) => `+${10 * r} max health, +${3 * r}% armour`),
      U('bash_up', 'Boar Shield', 'cabin', 1, 2, 'Shield Bash is wider and stuns longer.', (r) => `${(1.4 + 0.4 * r).toFixed(1)} s stun`, { power: 'bash', old: 'bash' }),
      P('hold', 'Hold the Line', '🔱', 'cabin', 2, 3, 'She plants her spear: half damage, and lightning crackles into the monsters round her.', (r) => `${4 + (r - 1)} s, ${8 + 3 * (r - 1)} damage a zap`),
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

// ---------------------------------------------------------------- rules
// Can the hero buy the next rank of a node? { ok, why, cost }.
export function canRank(hero, h, level, id) {
  const n = nodeOf(hero, id); if (!n) return { ok: false, why: 'Unknown skill', cost: Infinity };
  const skills = h?.skills ?? {}, r = rankOf(skills, id), cost = nextCost(n, r);
  if (r >= n.max) return { ok: false, why: 'Fully trained', cost };
  if (n.req && rankOf(skills, n.req) <= 0) return { ok: false, why: `Needs ${nodeOf(hero, n.req)?.name ?? n.req}`, cost };
  const gate = GATES[n.tier - 1] ?? 0, have = branchPoints(hero, skills, n.branch, n.tier);
  if (have < gate) { const b = treeOf(hero).branches.find((x) => x.id === n.branch); return { ok: false, why: `Needs ${gate} points in ${b?.name ?? n.branch} (${have} so far)`, cost, gated: true }; }
  if (pointsLeft(hero, h, level) < cost) return { ok: false, why: `Needs ${cost} point${cost === 1 ? '' : 's'}`, cost, poor: true };
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
