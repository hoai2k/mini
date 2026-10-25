import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { countSlots, COUNT_WORDS, WORD, COUNT_LEAD, wordGain } from '../src/count.js';
import { SPEAKERS, SOFT, SILENT, barPlan } from '../src/settings.js';

// Every word 0.3 s long (heard), "seven" 0.4: a word needs 0.195 s (0.26) before the next.
const lengths = Object.fromEntries(COUNT_WORDS.map((w) => [w, w === 'seven' ? 0.4 : 0.3]));
const said = (slots) => slots.map((k) => (k >= WORD ? COUNT_WORDS[k - WORD] : k)).join(' ');
const count = (s, bpm, l = lengths) => said(countSlots({ ...barPlan(s), subdivision: s.subdivision || 1, bpm }, l));
const bar = (meter, subdivision = 1) => ({ meter, accent: true, subdivision });

test('the voice counts the bar, with "and", "trip let" and "e and a" between the beats', () => {
  assert.equal(count(bar('4/4'), 80), 'one two three four');
  assert.equal(count(bar('3/4', 2), 80), 'one and two and three and');
  assert.equal(count(bar('2/4', 3), 80), 'one trip let two trip let');
  assert.equal(count(bar('2/4', 4), 60), 'one e and a two e and a');
  assert.equal(count(bar('6/8'), 120), 'one two three four five six');
  assert.equal(count(bar('12/8'), 60).split(' ').at(-1), 'twelve');
  assert.equal(count(bar('1'), 80), 'one'); // no bars: "one" on every beat
});

test('faster, it says less: the beats with clicks between, then "one" alone, then clicks', () => {
  // Eighths at 160: 0.1875 s between words, enough for 0.195? No: the beats are counted, clicks between.
  assert.equal(count(bar('4/4', 2), 160), 'one 3 two 3 three 3 four 3');
  assert.equal(count(bar('4/4', 2), 150), 'one and two and three and four and');
  // Quarters in 7/4: "seven" needs 0.26 s, so past 230 the beats go to "one" alone...
  assert.equal(count(bar('7/4'), 220).split(' ').at(-1), 'seven');
  assert.equal(count(bar('7/4'), 240), 'one 0 0 0 0 0 0');
  // ...and past what even "one" needs (0.195 s a beat: 307), clicks only.
  assert.equal(count(bar('4/4'), 320), '2 0 0 0');
  // A word missing (not loaded) is never said.
  assert.equal(count(bar('4/4'), 80, {}), '2 0 0 0');
});

test('soft and silent beats say nothing: a soft click, or nothing at all, and the word before has their time', () => {
  const s = { meter: '4/4', accent: true, beatLevels: { meter: '4/4', soft: [12], silent: [36] } };
  assert.equal(count(s, 100), `one ${SOFT} three ${SILENT}`);
  // "seven" at 260 has 0.46 s before the next word (the next bar's 1 is silent), where it would have only 0.23.
  const t = { meter: '7/4', accent: true, beatLevels: { meter: '7/4', soft: [], silent: [0] } };
  assert.equal(count(t, 260).split(' ')[6], 'seven');
});

test('the downbeat loudest, the beats a little under, the words between under those', () => {
  assert.ok(wordGain('one') > wordGain('seven') && wordGain('seven') > wordGain('and'));
  assert.equal(wordGain('trip'), wordGain('a'));
});

test('every voice has every word, as 16-bit mono WAV at 24 kHz, its vowel COUNT_LEAD in', () => {
  for (const voice of SPEAKERS) {
    for (const w of COUNT_WORDS) {
      const url = new URL(`../assets/audio/count/${voice}/${w}.wav`, import.meta.url);
      assert.ok(existsSync(url), `${voice}/${w}.wav`);
      const b = readFileSync(url);
      assert.equal(b.toString('ascii', 0, 4), 'RIFF');
      assert.equal(b.readUInt16LE(22), 1, 'mono');
      assert.equal(b.readUInt32LE(24), 24000, 'at 24 kHz');
      assert.equal(b.readUInt16LE(34), 16, '16-bit');
      const samples = new Int16Array(b.buffer.slice(b.byteOffset + 44, b.byteOffset + b.length));
      const at = Math.round(COUNT_LEAD * 24000);
      const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      const before = samples.slice(0, at - 480).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      const vowel = samples.slice(at, at + 2400).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      assert.ok(samples.length > at + 1200, `${voice}/${w}: more than its lead`);
      assert.ok(vowel > peak * 0.3, `${voice}/${w}: loud from its vowel on`);
      assert.ok(before < vowel, `${voice}/${w}: quieter before its vowel`);
    }
  }
});
