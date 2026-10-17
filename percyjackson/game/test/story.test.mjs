// The story as it is told: the bus lettering in the bus cutscene stays all
// Greek until the last shot of the bus, every subtitle has time to be read,
// and the narration of the opening never says the same thing twice.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GREEK, greekPlan, greekAt, settledBy, toGreek, LATINISH, LOOK } from '../js/ui/greekTiming.js';
import { CHAPTERS } from '../js/story/chapters.js';
import { t } from '../js/text_config.js';
import { shotDuration } from '../js/story/subtitles.js';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(GAME, 'js', p), 'utf8');
const CS = read('story/cutscenes.js');

// the shots of each cutscene, parsed from the source: { cut, dur, lines: [{ at, text }], body }
function shots() {
  const out = [];
  const ids = [...CS.matchAll(/\n  (\w+): \{\n    id: '(\w+)'/g)].map((m) => ({ id: m[2], at: m.index }));
  const consts = Object.fromEntries([...CS.matchAll(/export const (\w+) = ([\d.]+)(?:, (\w+) = (\w+) - ([\d.]+) - ([\d.]+))?;/g)].flatMap((m) => [[m[1], +m[2]]]));
  const re = /\n        \{ dur: ([\w.]+)/g;
  const starts = [...CS.matchAll(re)];
  starts.forEach((m, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : CS.indexOf('return {', m.index);
    const body = CS.slice(m.index, end);
    const cut = [...ids].reverse().find((c) => c.at < m.index)?.id;
    const dur = Number.isFinite(+m[1]) ? +m[1] : consts[m[1]];
    const lines = [...body.matchAll(/\{ at: ([\d.]+), text: t\('([\w.]+)'\) \}/g)].map((l) => ({ at: +l[1], text: t(l[2]) }));   // (the subtitles are text-config keys)
    out.push({ cut, dur, lines, body });
  });
  return out;
}

test('the bus in the bus cutscene: all Greek letters until its last shot, then English with time to read it', () => {
  const S = shots().filter((s) => s.cut === 'bus');
  assert.ok(S.length >= 4);
  const busShots = S.filter((s) => /drive\(/.test(s.body));
  const last = busShots[busShots.length - 1];
  // readBus is called once, in the last shot of the bus, from BUS_READ on
  const calls = [...CS.matchAll(/readBus\(\)/g)].length;
  assert.equal(calls, 1, 'called once');
  for (const s of busShots.slice(0, -1)) assert.doesNotMatch(s.body, /readBus\(\)/, 'no English before the last bus shot');
  assert.match(last.body, /if \(t >= BUS_READ\) readBus\(\)/);
  const BUS_LAST = +CS.match(/export const BUS_LAST = ([\d.]+)/)[1];
  const BUS_READ = BUS_LAST - 2 - 1.1;
  assert.equal(last.dur, BUS_LAST);
  const english = BUS_LAST - (BUS_READ + settledBy(GREEK.sign));
  assert.ok(english >= 1.8 && english <= 2.5, `English for about two seconds before the cut (${english.toFixed(2)} s)`);
  assert.match(CS, /s\.reset\(\); game\.signs\?\.add\(s\)/, 'the cutscene bus starts all Greek');
  assert.match(read('world/vehicles.js'), /trigger = 'manual'/, 'nothing but the script settles it');
});

test('Greek letters are Greek all the way through: no stand-in looks like a Latin letter', () => {
  const latin = /[A-Za-z]/;
  for (const [ch, g] of Object.entries(LOOK)) { assert.ok(!LATINISH.includes(g), `${ch} -> ${g}`); assert.doesNotMatch(g, latin); }
  for (const text of ['YANCY ACADEMY', 'SCHOOL BUS', 'The Pre-Algebra Teacher', 'AMERICAN MUSEUM OF NATURAL HISTORY']) {
    for (const seed of [1, 7, 31, 57]) {
      const plan = greekPlan(text, GREEK.sign, seed);
      const g = plan.map((L) => (L.at < 0 ? L.ch : L.greek)).join('');
      for (const c of g) assert.ok(!latin.test(c) && !LATINISH.includes(c), `${text} (${seed}): ${g}`);
      assert.ok(![...toGreek(text, seed)].some((c) => latin.test(c) || LATINISH.includes(c)), toGreek(text, seed));
    }
    // while a title holds, every letter is Greek (and scrambles too)
    const t = GREEK.title;
    for (const at of [0, t.hold / 2, t.hold - 0.31]) for (const c of greekAt(text, at, t)) assert.ok(!latin.test(c) && !LATINISH.includes(c), `${text} at ${at}: ${greekAt(text, at, t)}`);
  }
});

test('every cutscene subtitle stays up long enough to read', () => {
  for (const s of shots()) for (const [i, L] of s.lines.entries()) {
    const fadeOut = /fadeOut/.test(s.body);
    const until = s.lines[i + 1]?.at ?? shotDuration({ dur: s.dur, lines: s.lines, fadeOut }) - (fadeOut ? 0.4 : 0);   // (the player holds a shot until its last subtitle is read: story/subtitles.js)
    const need = Math.max(2, L.text.length * 0.055);
    assert.ok(until - L.at >= need, `${s.cut}: “${L.text.slice(0, 40)}…” has ${(until - L.at).toFixed(1)} s, needs ${need.toFixed(1)} s`);
  }
});

// the opening's narration in the order it is told
function openingNarration() {
  const S = shots();
  const cut = (id) => S.filter((s) => s.cut === id).flatMap((s) => s.lines.map((l) => l.text));
  const ch = (id) => CHAPTERS.find((c) => c.id === id);
  return [
    ...cut('bus'), ...ch('lt1').intro, ch('lt1').outro,
    ...cut('summer'), ...ch('lt2').intro.slice(1), ch('lt2').outro,
    ...cut('wake'),
  ];
}
const words = (t) => t.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'you', 'your', 'in', 'on', 'at', 'is', 'it', 'he', 'she', 'his', 'her', 'with', 'as', 'for', 'into', 'up', 'out']);
const shingles = (t, n = 3) => { const w = words(t).filter((x) => !STOP.has(x)); const s = new Set(); for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(' ')); return s; };

test('the opening never tells the same thing twice', () => {
  const all = openingNarration();
  const stare = all.filter((t) => /Dodds/.test(t) && /star|watch|look|glanc/i.test(t));
  assert.equal(stare.length, 1, `Mrs. Dodds’s stare is told once: ${stare.join(' | ')}`);
  // no three meaningful words in a row repeated within the next few lines
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < Math.min(all.length, i + 4); j++) {
    const a = shingles(all[i]), b = shingles(all[j]);
    const same = [...a].filter((x) => b.has(x));
    assert.equal(same.length, 0, `“${all[i]}” / “${all[j]}”: ${same.join(', ')}`);
  }
});

test('a chapter’s outro does not repeat what its boss-down message said', () => {
  for (const ch of CHAPTERS) {
    if (!ch.bossDown?.text || !ch.outro) continue;
    const a = shingles(ch.bossDown.text, 2), b = shingles(ch.outro, 2);
    assert.deepEqual([...a].filter((x) => b.has(x)), [], ch.id);
  }
});

test('the cutscenes tell the opening; the story cards after them carry only what is new', () => {
  const S = shots();
  const cut = (id) => S.filter((s) => s.cut === id).flatMap((s) => s.lines.map((l) => l.text)).join(' ');
  const ch = (id) => CHAPTERS.find((c) => c.id === id);
  // the bus cutscene: Mrs. Dodds's stare and her word in the galleries; chapter 1's card leaves her to it
  assert.match(cut('bus'), /a word\. Alone/);
  for (const l of ch('lt1').intro) assert.doesNotMatch(l, /Dodds|galler|Mist/, l);
  // the summer cutscene ends with the crash; chapter 2's cards in the opening (all but the first) start after it
  assert.match(cut('summer'), /ditch/);
  for (const l of ch('lt2').intro.slice(1)) assert.doesNotMatch(l, /Montauk|Grover|ditch|lightning/i, l);
  // played again from camp (no cutscene), chapter 2's first card still tells the way there
  assert.match(ch('lt2').intro[0], /Montauk/);
  assert.match(ch('lt2').intro[0], /ditch/);
});

test('an outro leaves the prophecy line it fulfils to the prophecy scroll', () => {
  const lines = t('books.book1.prophecy');
  for (const c of CHAPTERS) {
    if (c.prophecyLine == null) continue;
    const same = [...shingles(lines[c.prophecyLine], 2)].filter((x) => shingles(c.outro, 2).has(x));
    assert.deepEqual(same, [], `${c.id}: ${c.outro}`);
  }
});
