// Profiles: the version 1 single save moves into the main profile without
// losing anything, merging follows the rules in js/profiles.js (union of
// chapters and unlocks, the higher level, union of the inventory by uid,
// nothing counted twice), export codes round-trip, writes are debounced and
// merge with a newer stored revision instead of overwriting it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Profiles, mergeProfiles, encodeProfile, decodeProfile, INDEX_KEY, PROFILE_KEY } from '../js/profiles.js';
import { Save, freshData, LEGACY_KEY } from '../js/save.js';
import { rollItem, spentPoints, enchCost } from '../js/loot.js';

class Mem {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); this.writes = 0; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.writes++; this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
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
  s.hero('percy').skills = { tidal: 2 }; s.hero('percy').skillPoints -= 2; s.hero('percy').gear[0] = sword.uid;
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
  assert.deepEqual(d.heroes.percy.skills, { tidal: 2 });
  assert.equal(d.heroes.percy.skillPoints, legacy.heroes.percy.skillPoints);
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
    d.inventory.push(rollItem(18)); s.hero('percy').skills = { a: 1 }; s.hero('percy').skillPoints -= 1; d.updated = 100; d.rev = 4;
  });
  const onB = played(base, (s, d) => {
    s.addXp(200); d.coins = 80; d.completed = { lt1: 2 }; d.unlockedHeroes = ['clarisse']; d.prophecy = { book1: [1] };
    d.inventory.push(rollItem(19)); s.hero('percy').skills = { b: 2 }; s.hero('percy').skillPoints -= 2; d.updated = 200; d.rev = 2;
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
  assert.deepEqual(m.heroes.percy.skills, { a: 1, b: 2 });
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
