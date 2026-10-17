// The tempo picker's tables: every named tempo has its usual one in its own
// list, and only choices from those lists are kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENRES, GENRE_IDS, mainTempo, cleanTempoDefaults } from '../src/tempos.js';
import { TEXT } from '../src/text-config.js';
import { BPM_MIN, BPM_MAX } from '../src/settings.js';

test('every named tempo has a name, its usual tempo in its list, and tempos the metronome can play', () => {
  for (const g of GENRE_IDS) {
    assert.ok(TEXT.metronome.tempos.genres[g], g);
    for (const t of GENRES[g]) {
      const name = g === 'classical' ? TEXT.metronome.markings[t.id] : TEXT.metronome.tempos.names[g][t.id];
      assert.ok(name, `${g}:${t.id}`);
      assert.ok(t.list.includes(t.main), `${g}:${t.id}`);
      for (const v of t.list) assert.ok(v >= BPM_MIN && v <= BPM_MAX, `${g}:${t.id} ${v}`);
    }
  }
});

test('a name plays its usual tempo until another is chosen from its list', () => {
  assert.equal(mainTempo('jazz', 'ballad'), 60);
  assert.equal(mainTempo('jazz', 'ballad', { 'jazz:ballad': 72 }), 72);
  assert.equal(mainTempo('jazz', 'ballad', { 'jazz:ballad': 73 }), 60); // not one of its tempos
  assert.deepEqual(cleanTempoDefaults({ 'jazz:ballad': 72, 'jazz:nope': 72, 'classical:largo': 300, x: 1 }), { 'jazz:ballad': 72 });
});
