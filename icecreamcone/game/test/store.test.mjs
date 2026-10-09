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
