// Achievements: the list and the rules (pure, so the node tests can drive
// it). achievements.js feeds it what happens in the game; the names and
// descriptions are in text_config.js (achievements.list.<id>); the badges are
// the two sheets of design/image-requests.md round 8, in this order (ui/icons.js
// BADGE_SHEETS), with the emoji standing in until they arrive.
//
// An achievement is either counted ({ stat, goal }: unlocked when the
// profile's count of `stat` reaches `goal`) or granted when the game says so
// (grant()). A profile keeps { got: { id: ms since 1970 }, n: { stat: count },
// sets: { name: [values] } } in data.achievements (save.js).

export const ACHIEVEMENTS = [
  // ---- sheet 1: the story and the bosses
  { id: 'field_trip', icon: '🚌' },                 // finish chapter 1
  { id: 'pop_quiz', icon: '📝' },                   // beat Mrs. Dodds without being paralyzed
  { id: 'bull_horns', icon: '🐂' },                 // the Minotaur stuck in a wall 3 times in one fight
  { id: 'claimed', icon: '🔱' },                    // finish chapter 3
  { id: 'dont_look', icon: '🕶️' },                  // beat Medusa with no one turned to stone
  { id: 'perfect_fit', icon: '🛏️' },                // tip Procrustes onto his own bed
  { id: 'good_boy', icon: '🎾' },                   // hit Cerberus 10 times while he's sleepy, in one fight
  { id: 'checked_out', icon: '🪷' },                // leave the Lotus Casino with over half the days left
  { id: 'mind_doors', icon: '🚡' },                 // finish chapter 6 (the Arch)
  { id: 'not_so_kindly', icon: '🔥' },              // beat the Furies
  { id: 'surfs_up', icon: '🌊' },                   // beat Ares with a hero standing in the sea
  { id: 'not_the_thief', icon: '⚡' },              // finish Book 1
  { id: 'olympian', icon: '🏛️' },                   // finish a chapter on Olympian
  { id: 'achilles', icon: '🛡️' },                   // beat a boss with no player's hero hit
  { id: 'quest_three', icon: '🤝' },                // finish a chapter with three heroes played by people
  { id: 'whole_gang', icon: '📿', set: 'gang', goal: 5 },   // finish a chapter as each of the five heroes
  // ---- sheet 2: heroics and habits
  { id: 'reflexes', icon: '⏱️', stat: 'battleSense', goal: 10 },
  { id: 'gravity', icon: '💥' },                    // 3 monsters with one jump slam
  { id: 'mist_opportunity', icon: '👁️', stat: 'reveals', goal: 25 },
  { id: 'resting_eyes', icon: '😴', stat: 'revived', goal: 10 },
  { id: 'mind_gap', icon: '🕳️', stat: 'fell', goal: 10 },
  { id: 'cookies', icon: '🍪', stat: 'ambrosia', goal: 25 },
  { id: 'identity_crisis', icon: '🎭', stat: 'switched', goal: 50 },
  { id: 'divine', icon: '☁️', stat: 'powers', goal: 10 },
  { id: 'hunter', icon: '🏹', stat: 'kills', goal: 1000 },
  { id: 'hoarder', icon: '💰' },                    // 1,000 drachmas at once
  { id: 'one_of_a_kind', icon: '🎁' },              // find a Unique item
  { id: 'dressed', icon: '🥋' },                    // weapon, armour and a magic item, all Heroic or better
  { id: 'changed_mind', icon: '📜', stat: 'respecs', goal: 3 },
  { id: 'apollo', icon: '🎯', stat: 'bullseyes', goal: 10 },
  { id: 'hot_hot_hot', icon: '🌋' },                // reach the top of the lava climbing wall
  { id: 'iris', icon: '🌈' },                       // play online (host or join a room)
];
export const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
// the stats the counted ones read
export const ACH_STATS = [...new Set(ACHIEVEMENTS.filter((a) => a.stat).map((a) => a.stat))];

export function freshAch() { return { got: {}, n: {}, sets: {} }; }
// Clean a stored record (old saves have none; imports may be odd).
export function normalizeAch(a) {
  const out = freshAch();
  if (!a || typeof a !== 'object') return out;
  if (a.got && typeof a.got === 'object') for (const [k, v] of Object.entries(a.got)) if (ACH[k] && Number.isFinite(v)) out.got[k] = v;
  if (a.n && typeof a.n === 'object') for (const [k, v] of Object.entries(a.n)) if (Number.isFinite(v) && v > 0) out.n[k] = Math.floor(v);
  if (a.sets && typeof a.sets === 'object') for (const [k, v] of Object.entries(a.sets)) if (Array.isArray(v)) out.sets[k] = [...new Set(v.filter((x) => typeof x === 'string'))];
  return out;
}
// Two profiles' records together: every unlock (the earlier time), the higher counts, the union of sets.
export function mergeAch(x, y) {
  const a = normalizeAch(x), b = normalizeAch(y), out = freshAch();
  for (const src of [a.got, b.got]) for (const [k, v] of Object.entries(src)) out.got[k] = Math.min(out.got[k] ?? Infinity, v);
  for (const src of [a.n, b.n]) for (const [k, v] of Object.entries(src)) out.n[k] = Math.max(out.n[k] ?? 0, v);
  for (const src of [a.sets, b.sets]) for (const [k, v] of Object.entries(src)) out.sets[k] = [...new Set([...(out.sets[k] ?? []), ...v])];
  return out;
}

// Unlock one. -> true if it is new.
export function grant(rec, id, now = Date.now()) {
  if (!ACH[id] || rec.got[id] != null) return false;
  rec.got[id] = now; return true;
}
// Count `stat` up by `by`. -> the ids it unlocks.
export function bump(rec, stat, by = 1, now = Date.now()) {
  rec.n[stat] = (rec.n[stat] ?? 0) + by;
  return ACHIEVEMENTS.filter((a) => a.stat === stat && rec.n[stat] >= a.goal && grant(rec, a.id, now)).map((a) => a.id);
}
// Add `value` to the set `name`. -> the ids it unlocks.
export function addTo(rec, name, value, now = Date.now()) {
  const s = (rec.sets[name] ??= []);
  if (!s.includes(value)) s.push(value);
  return ACHIEVEMENTS.filter((a) => a.set === name && s.length >= a.goal && grant(rec, a.id, now)).map((a) => a.id);
}
// How far along a counted one is: { n, goal } (or null for the others).
export function progress(rec, id) {
  const a = ACH[id];
  if (a?.stat) return { n: Math.min(a.goal, rec.n[a.stat] ?? 0), goal: a.goal };
  if (a?.set) return { n: Math.min(a.goal, rec.sets[a.set]?.length ?? 0), goal: a.goal };
  return null;
}

// What a finished chapter earns. info: { chapter (id), difficulty,
// humans (heroes played by people this run), heroesPlayed (hero ids people
// played in it), noParalysis (chapter 1: no one held by the shriek),
// daysLeftShare (chapter 8: share of the Lotus budget left) }.
export function onChapterDone(rec, info, now = Date.now()) {
  const out = [];
  const g = (id) => { if (grant(rec, id, now)) out.push(id); };
  const ch = info.chapter;
  if (ch === 'lt1') { g('field_trip'); if (info.noParalysis) g('pop_quiz'); }
  if (ch === 'lt3') g('claimed');
  if (ch === 'lt6') g('mind_doors');
  if (ch === 'lt8' && info.daysLeftShare > 0.5) g('checked_out');
  if (ch === 'lt12') g('not_the_thief');
  if ((info.difficulty ?? 1) >= 4) g('olympian');
  if ((info.humans ?? 1) >= 3) g('quest_three');
  for (const h of info.heroesPlayed ?? []) out.push(...addTo(rec, 'gang', h, now));
  return out;
}
// What a fallen boss earns. f: the fight's tally { boss (id), stuck,
// sleepyHits, stoned, tipped, inSea, heroesHit }.
export function onBossDown(rec, f, now = Date.now()) {
  const out = [];
  const g = (id) => { if (grant(rec, id, now)) out.push(id); };
  if (f.boss === 'minotaur' && (f.stuck ?? 0) >= 3) g('bull_horns');
  if (f.boss === 'medusa' && !f.stoned) g('dont_look');
  if (f.boss === 'procrustes' && f.tipped) g('perfect_fit');
  if (f.boss === 'cerberus' && (f.sleepyHits ?? 0) >= 10) g('good_boy');
  if (f.boss === 'furies') g('not_so_kindly');
  if (f.boss === 'ares' && f.inSea) g('surfs_up');
  if (!f.heroesHit) g('achilles');
  return out;
}
const RANK = { common: 0, rare: 1, heroic: 2, unique: 3, legendary: 3 };
// What a profile's belongings earn (checked now and then). inv: items
// ({ uid, rarity, kind }); equipped: per hero, gear uids [weapon, armour, magic 1, magic 2].
export function onBelongings(rec, { coins = 0, inv = [], equipped = [] } = {}, now = Date.now()) {
  const out = [];
  const g = (id) => { if (grant(rec, id, now)) out.push(id); };
  if (coins >= 1000) g('hoarder');
  if (inv.some((it) => it.rarity === 'unique' || it.rarity === 'legendary')) g('one_of_a_kind');
  const byUid = new Map(inv.map((it) => [it.uid, it]));
  const good = (u) => (RANK[byUid.get(u)?.rarity] ?? 0) >= 2;
  if (equipped.some((gear) => gear && good(gear[0]) && good(gear[1]) && (good(gear[2]) || good(gear[3])))) g('dressed');
  return out;
}
