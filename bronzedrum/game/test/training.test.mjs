import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogue, levelOf, levelRhythms, usesText, firstChapter, LEVELS } from '../src/training.js';
import { STAGES } from '../src/stages.js';
import { setDifficulty, setBeatCount, designedTiers } from '../src/rhythm.js';

test('levels: plain beats, a pair, pair runs, a triplet, triplet runs', () => {
  assert.equal(levelOf('L R L R'), 1);
  assert.equal(levelOf('L RR L R'), 2);
  assert.equal(levelOf('L RR L RR'), 3);
  assert.equal(levelOf('RR L R L'), 3, 'opening on a pair');
  assert.equal(levelOf('L RRR L R'), 4);
  assert.equal(levelOf('RRR L RR L'), 5);
  assert.equal(levelOf('L RRR L RRR'), 5);
  assert.equal(levelOf('RRR L R L'), 5, 'opening on a triplet');
});

test('the catalogue holds every rhythm the chapters ask for, once, numbered in order of first use', () => {
  const all = catalogue();
  assert.deepEqual(all.map((e) => e.n), all.map((_, i) => i + 1));
  assert.equal(new Set(all.map((e) => e.text)).size, all.length, 'no rhythm twice');
  const texts = new Set(all.map((e) => e.text));
  STAGES.forEach((st) => {
    for (const c of st.calls || []) assert.ok(texts.has(c.text), c.text);
    if (st.rhythm) assert.ok(texts.has(st.rhythm));
    if ((st.mode || 'battle') === 'battle') {
      for (const id of st.unlocked) for (const t of designedTiers(id).slice(0, st.maxTier)) assert.ok(texts.has(t), t);
    }
  });
  // First uses come in chapter order.
  const firsts = all.map(firstChapter);
  assert.deepEqual(firsts, [...firsts].sort((a, b) => a - b));
  assert.equal(all[0].text, 'L L L R');
  assert.equal(all[0].uses[0].what, 'March I');
  assert.ok(all.every((e) => e.level >= 1 && e.level <= LEVELS.length && e.bpm > 0));
  // Every level has something to practise.
  for (let l = 1; l <= LEVELS.length; l++) assert.ok(levelRhythms(l, all).length > 0, `level ${l}`);
});

test('numbers do not move with the Difficulty and Number of beats settings', () => {
  const base = catalogue().map((e) => `${e.n} ${e.text}`);
  setDifficulty('hard');
  setBeatCount(6);
  assert.deepEqual(catalogue().map((e) => `${e.n} ${e.text}`), base);
  setDifficulty('medium');
  setBeatCount(4);
});

test('a rhythm used in several places lists each use with its chapters', () => {
  const e = catalogue().find((x) => x.text === 'L RRR L R');
  assert.equal(usesText(e), 'Call · ch 2 — March III · ch 5, 6, 8');
});
