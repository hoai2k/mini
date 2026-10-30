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
import { shotDuration, readTime, CHARS_PER_SECOND, MIN_READ } from '../js/story/subtitles.js';
import { finishShot, PressGate, NEXT_COOL } from '../js/story/shotSkip.js';

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

test('a subtitle is read at a medium speed', () => {
  assert.ok(CHARS_PER_SECOND >= 15 && CHARS_PER_SECOND <= 20, `${CHARS_PER_SECOND} characters a second`);
  assert.ok(MIN_READ >= 1.2 && MIN_READ <= 2);
  assert.equal(readTime('Go.'), MIN_READ, 'a short line still gets its moment');
  const long = 'one two three four five six seven eight nine ten eleven twelve';
  assert.ok(Math.abs(readTime(long) - long.length / CHARS_PER_SECOND) < 1e-9);
});

test('every cutscene subtitle stays up long enough to read', () => {
  for (const s of shots()) for (const [i, L] of s.lines.entries()) {
    const fadeOut = /fadeOut/.test(s.body);
    const until = s.lines[i + 1]?.at ?? shotDuration({ dur: s.dur, lines: s.lines, fadeOut }) - (fadeOut ? 0.4 : 0);   // (the player holds a shot until its last subtitle is read: story/subtitles.js)
    const need = Math.max(MIN_READ, L.text.trim().length / CHARS_PER_SECOND);   // (a medium reader: about 18 characters a second; B pauses for a slower one)
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

// A shot like the summer cutscene's drive: a car eased along a road by dt, a figure walking to a door.
function driveSet() {
  const w = { car: 0, v: 0, walker: 0, ks: [], entered: [] };
  const shots = [
    { dur: 5.8, act: (k, dt) => { w.ks.push(k); const want = Math.min(11, (80 - w.car) * 1.2); w.v += (want - w.v) * Math.min(1, dt * 1.6); w.car += w.v * dt; } },
    { dur: 4, enter: () => w.entered.push({ car: w.car, walker: w.walker }), act: (k, dt) => { w.car += 2 * dt; } },
  ];
  const tick = (t, dt) => { w.walker = Math.min(5.6, w.walker + 3.6 * dt); };   // (the set's update: figures walk on their own clock)
  return { w, shots, tick };
}
// the cutscene's frame loop for one shot: real frames of dt, until the shot ends (or `until`)
function play(shot, clock, tick, until = shot.dur, dt = 1 / 60) {
  while (clock.shotT < until - 1e-9) { const d = Math.min(dt, until - clock.shotT); clock.t += d; clock.shotT += d; shot.act?.(Math.min(1, clock.shotT / shot.dur), d, clock.shotT); tick(clock.t, d); }
}

test('pressing A skips a shot: it is run to its end, and the next shot starts from there', () => {
  // played through
  const A = driveSet(), ca = { t: 0, shotT: 0 };
  play(A.shots[0], ca, A.tick);
  // skipped 1.3 s in (after a few frames of 1/60 s)
  const B = driveSet(), cb = { t: 0, shotT: 0 };
  play(B.shots[0], cb, B.tick, 1.3);
  finishShot(B.shots[0], cb, B.tick);
  assert.equal(cb.shotT, B.shots[0].dur, 'the clock reached the shot’s end');
  assert.ok(Math.abs(cb.t - ca.t) < 1e-9, 'the cutscene clock too');
  assert.equal(B.w.ks.at(-1), 1, 'its act was run to k = 1');
  assert.ok(Math.abs(B.w.car - A.w.car) < 0.05, `the car where it would have been (${B.w.car.toFixed(2)} / ${A.w.car.toFixed(2)} m)`);
  assert.equal(B.w.walker, A.w.walker, 'the set’s figures walked as far');
  // the next shot starts from that state
  B.shots[1].enter(); A.shots[1].enter();
  assert.ok(Math.abs(B.w.entered[0].car - A.w.entered[0].car) < 0.05);
  // a shot skipped at its very start, or one already over, is still left at its end
  const C = driveSet(), cc = { t: 0, shotT: 0 };
  finishShot(C.shots[0], cc, C.tick);
  assert.ok(Math.abs(C.w.car - A.w.car) < 0.05);
  assert.equal(finishShot(C.shots[0], cc, C.tick), 0, 'nothing more to run');
});

test('one press of A skips one shot', () => {
  const g = new PressGate(0.35);
  assert.equal(g.take(1 / 60, true), false, 'a press still down from the menu that opened the cutscene: not a skip');
  for (let i = 0; i < 30; i++) g.take(1 / 60, false);
  assert.equal(g.take(1 / 60, true), true, 'a press: one skip');
  let skips = 0;
  for (let i = 0; i < 6; i++) skips += g.take(1 / 60, i % 2 === 0) ? 1 : 0;   // (a bouncing button, a double click)
  assert.equal(skips, 0, `nothing more within ${NEXT_COOL} s`);
  for (let i = 0; i < 30; i++) g.take(1 / 60, false);
  assert.equal(g.take(1 / 60, true), true, 'the next press: the next shot');
});

test('the cutscene skips a shot with A, ends on the last, and keeps holding to skip it all', () => {
  const C = read('story/cutscene.js'), O = read('net/online.js');
  assert.match(C, /skipShot\(\) \{[\s\S]*?shots\.length - 1[\s\S]*?finish/, 'A on the last shot ends the cutscene');
  assert.match(C, /finishShot\(s, this,/, 'a skipped shot is run to its end');
  assert.match(C, /this\.hold >= HOLD/, 'holding still skips the whole cutscene');
  assert.match(C, /cutscenes\.next\.\$\{dev\}/, 'the hint for A');
  for (const k of ['pad', 'touch', 'kbm']) { assert.ok(t(`cutscenes.next.${k}`)); assert.equal(typeof t(`cutscenes.skip.${k}`), 'string'); }
  assert.match(CS, /if \(ctx\?\.ff\) return;/, 'no lightning flashes for a skipped shot');
  // hold B to pause (Backspace, a long press): B is the pad's button 1 (padmap.js BTN.B), A button 0;
  // Esc is the pause menu over the cutscene (main.js), and the cutscene waits under a menu
  assert.match(C, /PAUSE_KEYS = \['Backspace'\]/);
  assert.match(C, /if \(g\.ui\?\.active\) \{[^}]*return; \}/, 'a menu over it: the cutscene waits');
  assert.match(C, /const paused = [^;]*this\.pad\(1\)/);
  assert.match(C, /if \(paused\) \{[^}]*return; \}/, 'paused: the shot stands still');
  assert.match(C, /holding = [^;]*this\.pad\(0\)/, 'holding A skips it all; B no longer does');
  for (const k of ['pad', 'touch', 'kbm']) assert.ok(t(`cutscenes.pause.${k}`));
  assert.ok(t('cutscenes.skip.button') && t('cutscenes.paused'));
  // online: the host's shot goes with its scene, guests behind it catch up
  assert.match(O, /mode: 'cut', id: [^}]*shot:/);
  assert.match(O, /cs\.syncShot\(/);
});
