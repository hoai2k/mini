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
