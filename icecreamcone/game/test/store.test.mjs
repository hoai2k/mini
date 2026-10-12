// Saving: normally to localStorage; in ?debug, progress and the sticker book
// only for the tab's session, leaving the saved game as it was.
import test from 'node:test';
import assert from 'node:assert/strict';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    m,
  };
}
globalThis.localStorage = fakeStorage();
globalThis.sessionStorage = fakeStorage();
const store = await import(`../src/store.js?${Date.now()}`);

test('progress and stickers save to localStorage normally', () => {
  const p = store.loadProgress();
  store.recordScore(p, 'coot', 20);
  store.saveStickers({ spread: 1 });
  assert.equal(store.loadProgress().coot.best, 20);
  assert.deepEqual(store.loadStickers(), { spread: 1 });
  assert.ok(localStorage.m.has('icecreamcone.progress.v1'));
});

test('in debug, changes and resets stay in the session and the saved game is untouched', () => {
  const saved = new Map(localStorage.m);
  store.keepForSessionOnly();
  const p = store.loadProgress();
  assert.equal(p.coot.best, 20, 'starts from the saved game');
  store.recordScore(p, 'cupadee', 700);
  store.saveStickers({ spread: 0, moved: true });
  assert.equal(store.loadProgress().cupadee.best, 700);
  assert.deepEqual(store.loadStickers(), { spread: 0, moved: true });
  store.resetProgress();
  store.resetStickers();
  assert.deepEqual(store.loadProgress(), {});
  assert.equal(store.loadStickers(), null);
  assert.deepEqual(localStorage.m, saved, 'nothing saved changed');
  store.saveSettings({ volume: 10 });
  assert.equal(store.loadSettings().volume, 10, 'settings are still saved');
});

test('settings are volume, vibration and unlock all; the rest is fixed', () => {
  localStorage.setItem('icecreamcone.settings.v1', JSON.stringify({ volume: 40, music: 0, sfx: 0, readAloud: true, unlockAll: true }));
  const s = store.loadSettings();
  assert.equal(s.volume, 40);
  assert.equal(s.unlockAll, true);
  assert.equal(s.music, 50, 'music keeps its fixed balance');
  assert.equal(s.sfx, 80);
  assert.equal(s.readAloud, undefined);
});

test('forgotten scores are kept aside and restored as the best of then and now', () => {
  // (this module is in session mode from the debug test above; the logic is the same)
  let p = store.loadProgress();
  store.recordScore(p, 'coot', 30);
  store.recordScore(p, 'crow', 5);
  store.saveStickers({ spread: 1, placed: true });
  store.resetProgress();
  store.resetStickers();
  p = store.loadProgress();
  assert.deepEqual(p, {});
  assert.equal(store.canRestore(p), true);
  store.recordScore(p, 'crow', 9);
  const merged = store.restoreProgress(p);
  assert.equal(merged.coot.best, 30, 'the old best comes back');
  assert.equal(merged.crow.best, 9, 'a better new score stays');
  assert.deepEqual(store.loadStickers(), { spread: 1, placed: true }, 'the emptied sticker book comes back');
  assert.equal(store.canRestore(merged), false, 'nothing left to restore');
  assert.deepEqual(store.mergeProgress({ a: { best: 2, plays: 5 } }, { a: { best: 7, plays: 1 }, b: { best: 1, plays: 1 } }),
    { a: { best: 7, plays: 5 }, b: { best: 1, plays: 1 } });
});

test('a pass is kept: a raised pass mark never closes a page again', async () => {
  const { BIRDS } = await import('../src/birds.js');
  const ids = BIRDS.map((b) => b.id);
  const at = (id) => ids.indexOf(id);
  // An old save: the Niffy's best is one short of its (raised) mark, but the
  // Broomwhisk after it and the row below were played.
  const niffy = BIRDS[at('niffy')];
  const p = {
    [ids[0]]: { best: 999, plays: 2 },
    niffy: { best: niffy.pass - 1, plays: 3 },
    broomwhisk: { best: 1, plays: 1 },
    [ids[at('broomwhisk') + 3]]: { best: 1, plays: 1 },
  };
  assert.equal(store.keepOldPasses(p, BIRDS), true);
  assert.equal(p.niffy.passed, true, 'the Niffy is still passed: a later page was played');
  assert.equal(p[ids[0]].passed, true);
  assert.equal(p[ids[at('broomwhisk') + 3]].passed, undefined, 'the last one played is only passed on its score');
  assert.equal(store.keepOldPasses(p, BIRDS), false, 'only once');
  // From now on a pass is recorded as it happens and outlives a raised mark.
  const q = {};
  store.recordScore(q, 'crow', 50, true);
  store.recordScore(q, 'crow', 0, false);
  assert.equal(q.crow.passed, true);
  assert.equal(store.mergeProgress({ a: { best: 1, plays: 1, passed: true } }, { a: { best: 5, plays: 1 } }).a.passed, true);
});

test('photographs persist normally and debug keeps them separate', async () => {
  const fresh = await import('../src/store.js?photos');
  const photo = { key: 'pin', pinned: true, src: 'data:image/webp;base64,aGVsbG8=' };
  fresh.savePhotos([photo]);
  assert.deepEqual(fresh.loadPhotos(), [photo]);
  fresh.keepForSessionOnly();
  fresh.savePhotos([]);
  assert.deepEqual(fresh.loadPhotos(), []);
  assert.deepEqual(JSON.parse(localStorage.getItem('icecreamcone.photos.v1')), [photo]);
});

test('difficulty: a setting, Normal unless saved as one of the three', async () => {
  const fresh = await import('../src/store.js?difficulty');
  localStorage.setItem('icecreamcone.settings.v1', JSON.stringify({ volume: 40 }));
  assert.equal(fresh.loadSettings().difficulty, 'normal', 'an old save is Normal');
  fresh.saveSettings({ ...fresh.loadSettings(), difficulty: 'harder' });
  assert.equal(fresh.loadSettings().difficulty, 'harder');
  assert.equal(JSON.parse(localStorage.getItem('icecreamcone.settings.v1')).difficulty, 'harder', 'saved with the others');
  localStorage.setItem('icecreamcone.settings.v1', JSON.stringify({ difficulty: 'nightmare' }));
  assert.equal(fresh.loadSettings().difficulty, 'normal', 'an unknown level is Normal');
  fresh.keepForSessionOnly();
  fresh.saveSettings({ ...fresh.loadSettings(), difficulty: 'easier' });
  assert.equal(JSON.parse(localStorage.getItem('icecreamcone.settings.v1')).difficulty, 'easier', 'in ?debug it is still saved, like every setting');
});

test('difficulty: bests are kept per level; a pass at any level counts; old bests are Normal bests', async () => {
  const s = await import('../src/store.js?levels');
  // An old save: one best, no levels. It reads as the Normal best.
  const p = { coot: { best: 9, plays: 4, passed: true } };
  assert.equal(s.bestAt(p.coot, 'normal'), 9);
  assert.equal(s.bestAt(p.coot, 'harder'), 0);
  assert.equal(s.bestAt(p.coot), 9, 'Normal by default');
  // Each level keeps its own best.
  assert.equal(s.recordScore(p, 'coot', 5, false, 'easier'), true, 'a first Easier score is an Easier best');
  assert.equal(s.recordScore(p, 'coot', 7, false, 'normal'), false, 'not a Normal best');
  assert.equal(s.recordScore(p, 'coot', 12, false, 'harder'), true);
  assert.deepEqual(p.coot, { best: 9, plays: 7, passed: true, by: { easier: 5, harder: 12 } });
  assert.equal(s.recordScore(p, 'coot', 3, false, 'bogus'), false, 'an unknown level is Normal');
  // A pass at Easier opens the next page for good.
  const q = {};
  s.recordScore(q, 'crow', 50, true, 'easier');
  assert.equal(q.crow.passed, true);
  assert.equal(q.crow.best, 0, 'no Normal best yet');
  assert.equal(s.bestAt(q.crow, 'easier'), 50);
  // Merging takes the higher best at every level.
  const m = s.mergeProgress(
    { coot: { best: 9, plays: 3, by: { easier: 5 } } },
    { coot: { best: 4, plays: 6, passed: true, by: { easier: 8, harder: 2 } } },
  );
  assert.deepEqual(m, { coot: { best: 9, plays: 6, passed: true, by: { easier: 8, harder: 2 } } });
});

test('difficulty: forgetting and restoring keeps every level; restore is offered for a better Harder best alone', async () => {
  const s = await import('../src/store.js?restore-levels');
  let p = s.loadProgress();
  for (const id of Object.keys(p)) delete p[id];
  s.recordScore(p, 'plume', 4, false, 'normal');
  s.recordScore(p, 'plume', 20, true, 'harder');
  s.resetProgress();
  p = s.loadProgress();
  assert.deepEqual(p, {});
  s.recordScore(p, 'plume', 6, false, 'normal');
  assert.equal(s.canRestore(p), true, 'the Harder 20 is worth restoring');
  const back = s.restoreProgress(p);
  assert.equal(back.plume.best, 6);
  assert.equal(s.bestAt(back.plume, 'harder'), 20);
  assert.equal(back.plume.passed, true);
  assert.equal(s.canRestore(back), false);
  // keepOldPasses still reads the Normal best of an old save.
  const { BIRDS } = await import('../src/birds.js');
  const old = { [BIRDS[0].id]: { best: BIRDS[0].pass, plays: 1 } };
  assert.equal(s.keepOldPasses(old, BIRDS), true);
  assert.equal(old[BIRDS[0].id].passed, true);
});
