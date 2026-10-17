// Profiles: the version 1 single save moves into the main profile without
// losing anything, merging follows the rules in js/profiles.js (union of
// chapters and unlocks, the higher level, union of the inventory by uid,
// nothing counted twice), export codes round-trip, writes are debounced and
// merge with a newer stored revision instead of overwriting it.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Profiles, mergeProfiles, encodeProfile, decodeProfile, INDEX_KEY, PROFILE_KEY } from '../js/profiles.js';
import { Save, freshData, LEGACY_KEY } from '../js/save.js';
import { rollItem, spentPoints, enchCost } from '../js/loot.js';
import { Slots, slotPrefix, SLOTS_KEY, RESUME_KEY } from '../js/slots.js';

class Mem {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); this.writes = 0; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.writes++; this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  key(i) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}

// A version 1 save as the old save.js wrote it, with some play in it.
function legacySave() {
  const s = new Save(freshData('x', 'legacyaaaa'));
  const d = s.data;
  delete d.id; delete d.name; delete d.rev; delete d.updated; delete d.unlockedHeroes; delete d.prophecy; delete d.minigames;
  d.version = 1; d.coins = 321; d.unlocked = {};
  s.addXp(1000);                                   // a few levels
  const sword = rollItem(20, { id: 'bronze_axe' });
  const row = sword.ench.find((e) => !e.fixed && e.options.length);
  if (row) { row.pick = row.options[0]; row.level = 1; d.enchantPoints -= enchCost(row.pick, 1); }
  d.inventory.push(sword, rollItem(15));
  // (version 1 hero data: the first skill tree's ids, no tree version, no loadout)
  const ph = s.hero('percy'); delete ph.tree; delete ph.equip; ph.skills = { surge: 2 }; ph.skillPoints -= 2; ph.gear[0] = sword.uid;
  s.hero('annabeth');
  d.completed = { lt1: 2, lt2: 1 };
  d.unlockedHeroes = ['tyson'];
  d.prophecy = { book1: [0, 2] };
  d.stats = { kills: 140, missions: 3, deaths: 2, domains: 5 };
  d.minigames = { archery: 37 };
  d.seenGearHint = true; d.lastHero = 'annabeth';
  return d;
}

test('the version 1 save migrates into the main profile with nothing lost', () => {
  const legacy = legacySave();
  const store = new Mem({ [LEGACY_KEY]: JSON.stringify(legacy) });
  const P = new Profiles(store);
  const d = P.main.data;
  assert.equal(d.version, 2);
  assert.match(d.id, /^[a-z0-9]{10}$/);
  for (const k of ['coins', 'level', 'xp', 'enchantPoints', 'lastHero', 'seenGearHint']) assert.deepEqual(d[k], legacy[k], k);
  assert.deepEqual(d.completed, legacy.completed);
  assert.deepEqual(d.unlockedHeroes, ['tyson']);
  assert.deepEqual(d.prophecy, { book1: [0, 2] });
  assert.deepEqual(d.stats, legacy.stats);
  assert.equal(d.minigames.archery, 37);
  // every old item is there (the main profile's own starter items join them)
  for (const it of legacy.inventory) assert.ok(d.inventory.some((x) => x.uid === it.uid && x.id === it.id && x.power === it.power), it.id);
  // the skill tree is migrated: Wave Surge's upgrade moved to its new id, points kept, today's abilities equipped
  assert.deepEqual(d.heroes.percy.skills, { surge_up: 2 });
  assert.equal(d.heroes.percy.skillPoints, legacy.heroes.percy.skillPoints);
  assert.deepEqual(d.heroes.percy.equip, ['surge', 'tide', 'throw']);
  assert.equal(d.heroes.percy.gear[0], legacy.heroes.percy.gear[0]);
  assert.equal(d.heroes.annabeth.skillPoints, legacy.heroes.annabeth.skillPoints);
  // written, indexed, and the old save is left as it was
  const ix = JSON.parse(store.getItem(INDEX_KEY));
  assert.equal(ix.main, d.id); assert.ok(ix.migratedV1);
  assert.ok(store.getItem(PROFILE_KEY(d.id)));
  assert.deepEqual(JSON.parse(store.getItem(LEGACY_KEY)), legacy);
  // loading again reads the profile and doesn't migrate twice
  const again = new Profiles(store).main.data;
  assert.equal(again.id, d.id);
  assert.equal(again.inventory.length, d.inventory.length);
  assert.equal(again.coins, 321);
});

test('a fresh device gets a main profile called Player 1', () => {
  const P = new Profiles(new Mem());
  assert.equal(P.main.name, 'Player 1');
  assert.equal(P.main.data.inventory.length, 3);
  assert.equal(P.slotDefault(1).name, 'Player 2');
  assert.equal(P.slotDefault(1).id, P.slotDefault(1).id, 'the same profile each time');
  assert.equal(P.list().length, 2);
});

function played(base, f) { const d = JSON.parse(JSON.stringify(base)); const s = new Save(d); f(s, d); return d; }

test('merging: union of chapters and unlocks, the higher level, union of items, nothing twice', () => {
  const base = freshData('Ana', 'anaanaana1'); base.updated = 1;
  const shared = rollItem(20); base.inventory.push(shared);
  const onA = played(base, (s, d) => {
    s.addXp(500); d.coins = 50; d.completed = { lt1: 1, lt2: 3 }; d.unlockedHeroes = ['tyson']; d.prophecy = { book1: [0] };
    d.inventory.push(rollItem(18)); s.hero('percy').skills = { riptide: 1 }; s.hero('percy').skillPoints -= 1; d.updated = 100; d.rev = 4;
  });
  const onB = played(base, (s, d) => {
    s.addXp(200); d.coins = 80; d.completed = { lt1: 2 }; d.unlockedHeroes = ['clarisse']; d.prophecy = { book1: [1] };
    d.inventory.push(rollItem(19)); s.hero('percy').skills = { jet: 2 }; s.hero('percy').skillPoints -= 2; d.updated = 200; d.rev = 2;
  });
  const m = mergeProfiles(onA, onB);
  assert.equal(m.id, 'anaanaana1');
  assert.equal(m.level, Math.max(onA.level, onB.level));
  assert.equal(m.xp, onA.level >= onB.level ? onA.xp : onB.xp);
  assert.equal(m.coins, 80, 'drachmas: the higher, never the sum');
  assert.deepEqual(m.completed, { lt1: 2, lt2: 3 });
  assert.deepEqual(m.unlockedHeroes.sort(), ['clarisse', 'tyson']);
  assert.deepEqual(m.prophecy.book1, [0, 1]);
  const uids = m.inventory.map((it) => it.uid);
  assert.equal(new Set(uids).size, uids.length, 'no item twice');
  assert.equal(m.inventory.length, base.inventory.length + 2);
  assert.ok(uids.includes(shared.uid));
  assert.deepEqual(m.heroes.percy.skills, { riptide: 1, jet: 2 });   // (real tree ids: merged ranks now follow the tree's rules)
  assert.equal(m.heroes.percy.skillPoints, m.level - 3, 'skill points: level minus ranks spent');
  assert.equal(m.enchantPoints, m.level - m.inventory.reduce((s, it) => s + spentPoints(it), 0));
  assert.equal(m.rev, 5);
  assert.equal(m.name, 'Ana');
  // merging is idempotent: the same progress again adds nothing
  const twice = mergeProfiles(m, onB);
  for (const k of ['level', 'xp', 'coins', 'enchantPoints']) assert.equal(twice[k], m[k], k);
  assert.deepEqual(twice.completed, m.completed);
  assert.equal(twice.inventory.length, m.inventory.length);
  assert.deepEqual(twice.heroes, m.heroes);
  const self = mergeProfiles(onA, onA);
  assert.equal(self.inventory.length, onA.inventory.length);
  assert.equal(self.coins, onA.coins);
});

test('merging keeps the more invested copy of an item, and both of two items that share a uid', () => {
  const a = freshData('A', 'aaaaaaaaaa'), b = freshData('A', 'aaaaaaaaaa');
  const it = rollItem(20, { id: 'bronze_axe' });
  const plain = JSON.parse(JSON.stringify(it)), tempered = JSON.parse(JSON.stringify(it)); tempered.power += 3;
  a.inventory = [plain]; b.inventory = [tempered];
  let m = mergeProfiles(a, b);
  assert.equal(m.inventory.length, 1); assert.equal(m.inventory[0].power, it.power + 3);
  const other = rollItem(10, { id: 'camp_shirt' }); other.uid = it.uid;
  b.inventory = [other];
  m = mergeProfiles(a, b);
  assert.equal(m.inventory.length, 2);
  assert.equal(new Set(m.inventory.map((x) => x.uid)).size, 2);
});

test('export codes round-trip, and importing the same profile merges it', () => {
  const store = new Mem();
  const P = new Profiles(store);
  const main = P.main;
  main.addXp(300); main.data.completed = { lt1: 1 }; main.write(); P.flush();
  const code = P.exportCode(main.id);
  assert.match(code, /^HBQ2\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeProfile(code).completed, { lt1: 1 });
  assert.equal(decodeProfile('nonsense'), null);
  // the same person on another device, further along in another chapter
  const other = JSON.parse(JSON.stringify(main.data));
  other.completed = { lt2: 2 }; other.coins = 999; other.updated = Date.now() + 5;
  const r = P.importCode(encodeProfile(other));
  assert.ok(r.merged);
  assert.equal(r.save, main);
  assert.deepEqual(main.data.completed, { lt1: 1, lt2: 2 });
  assert.equal(main.data.coins, 999);
  // a different person's code adds a profile
  const friend = freshData('Bo', 'bobobobobo');
  const r2 = P.importCode(encodeProfile(friend));
  assert.ok(!r2.merged); assert.equal(P.list().length, 2);
});

test('writes are debounced, and a newer stored revision is merged, not overwritten', async () => {
  const store = new Mem();
  const P = new Profiles(store);
  const s = P.main;
  const before = store.writes;
  for (let i = 0; i < 20; i++) { s.data.coins++; s.write(); }
  assert.equal(store.writes, before, 'nothing written yet');
  await new Promise((r) => setTimeout(r, 500));
  assert.ok(store.writes - before <= 3, `one debounced write (${store.writes - before} setItem calls)`);
  assert.equal(JSON.parse(store.getItem(PROFILE_KEY(s.id))).coins, 20);
  // another tab writes a newer revision with a chapter this tab doesn't know
  const theirs = JSON.parse(store.getItem(PROFILE_KEY(s.id)));
  theirs.rev += 3; theirs.completed = { lt3: 1 }; theirs.updated = Date.now() + 1;
  store.setItem(PROFILE_KEY(s.id), JSON.stringify(theirs));
  s.data.completed.lt1 = 2; s.write(); P.flush();
  const now = JSON.parse(store.getItem(PROFILE_KEY(s.id)));
  assert.deepEqual(now.completed, { lt1: 2, lt3: 1 });
  assert.ok(now.rev > theirs.rev);
  assert.ok(store.getItem(PROFILE_KEY(s.id) + '.bak'), 'the previous copy is kept');
});

// ---------------------------------------------------------------- save slots
const open = (store, slots) => new Profiles(store, { prefix: slotPrefix(slots.active), slot: slots.active });

test('the existing save becomes Save 1, the active slot, without losing anything', () => {
  const legacy = legacySave();
  const store = new Mem({ [LEGACY_KEY]: JSON.stringify(legacy) });
  const slots = new Slots(store);
  assert.deepEqual(slots.list().map((x) => [x.id, x.name, x.active]), [['s1', 'Save 1', true]]);
  assert.equal(slotPrefix('s1'), '', 'slot 1 keeps the keys the game always used');
  const d = open(store, slots).main.data;
  assert.equal(d.coins, 321); assert.deepEqual(d.completed, legacy.completed);
  for (const it of legacy.inventory) assert.ok(d.inventory.some((x) => x.uid === it.uid));
  // a second load sees the same slot
  assert.deepEqual(new Slots(store).list().map((x) => x.id), ['s1']);
});

test('a new game makes a new slot and never overwrites the old one', () => {
  const store = new Mem();
  const slots = new Slots(store);
  const P1 = open(store, slots);
  P1.main.addXp(500); P1.main.data.completed = { lt1: 2 }; P1.main.data.coins = 77; P1.main.write(); P1.flush();
  store.setItem(slotPrefix('s1') + RESUME_KEY, JSON.stringify({ v: 1, def: { seed: 3 } }));
  const before = new Map(store.m);
  const id = slots.create({ people: P1.list().map((p) => ({ id: p.id, name: p.name })) });
  assert.equal(id, 's2'); assert.equal(slots.active, 's2');
  // nothing of Save 1 changed
  for (const [k, v] of before) if (k !== SLOTS_KEY) assert.equal(store.getItem(k), v, k);
  const P2 = open(store, slots);
  assert.equal(P2.main.id, P1.main.id, 'the same player (identity) in the new game');
  assert.equal(P2.main.name, P1.main.name);
  assert.equal(P2.main.data.level, 1); assert.equal(P2.main.data.coins, 0); assert.deepEqual(P2.main.data.completed, {});
  assert.equal(store.getItem(slotPrefix('s2') + RESUME_KEY), null, 'nothing to continue in a new game');
  // playing the new game leaves Save 1 alone
  P2.main.data.coins = 5; P2.main.write(); P2.flush();
  slots.setActive('s1');
  const back = open(store, slots).main.data;
  assert.equal(back.coins, 77); assert.deepEqual(back.completed, { lt1: 2 });
  // the old save isn't migrated into the new one
  const legacyStore = new Mem({ [LEGACY_KEY]: JSON.stringify(legacySave()) });
  const s2 = new Slots(legacyStore); open(legacyStore, s2); s2.create({});
  assert.equal(open(legacyStore, s2).main.data.coins, 0);
});

test('switching, renaming and deleting slots', () => {
  const store = new Mem();
  const slots = new Slots(store, () => 1000);
  open(store, slots);
  const a = slots.create({ name: 'Second try' }), b = slots.create({});
  assert.deepEqual(slots.list().map((x) => x.name), ['Save 1', 'Second try', 'Save 2']);
  assert.equal(slots.active, b);
  assert.ok(slots.setActive('s1')); assert.equal(new Slots(store).active, 's1', 'remembered');
  assert.ok(!slots.setActive('s99'));
  slots.rename(a, 'Mist run'); assert.equal(slots.meta(a).name, 'Mist run');
  slots.touch(a, { playTime: 90, chapters: 2, heroes: ['percy', 'grover'] });
  assert.equal(slots.meta(a).playTime, 90); assert.deepEqual(slots.meta(a).heroes, ['percy', 'grover']);
  // deleting removes only that slot's keys
  const P = open(store, (slots.setActive(a), slots)); P.main.write(); P.flush();
  const s1keys = [...store.m.keys()].filter((k) => k.startsWith('hbq-profile') || k === 'hbq-profiles-v2');
  assert.ok(slots.remove(a));
  assert.ok(![...store.m.keys()].some((k) => k.startsWith(slotPrefix(a))));
  for (const k of s1keys) assert.ok(store.getItem(k) !== null, k);
  assert.equal(slots.active, 's1', 'the active slot moves to one that exists');
  assert.ok(slots.remove(b));
  assert.ok(!slots.remove('s1'), 'the last slot stays');
});
