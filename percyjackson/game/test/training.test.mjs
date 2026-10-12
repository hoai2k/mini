// The prologue as a training board (rats that loiter, the dash director,
// the hints), Greek letters on titles and signs (never on narration), the
// pictures preloaded behind the loading screen, and the people in the Mist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAT, notices, givesUp, nextIdle, pickDasher, beatAt } from '../js/entities/ratRules.js';
import { GREEK, greekAt, greekPlan, letterAt, settledBy, showFor, FLUX, toGreek } from '../js/ui/greekTiming.js';
import { SCOLD, scoldLine, mayScold, SCOLD_EVERY, mistForm, MIST_FORMS } from '../js/entities/mistPeople.js';
import { prologueHint, HINTS } from '../js/story/prologueHints.js';
import { ALL_ART, CUTSCENE_ART, CHAPTER_ART, LOGO, TITLE_BG } from '../js/ui/art.js';
import { CHAPTERS } from '../js/story/chapters.js';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(GAME, 'js', p), 'utf8');

// ---------------------------------------------------------------- rats
test('an idle rat notices a hero only up close, with a clear view, and not while calming down', () => {
  assert.equal(notices({ dist: 3 }), true);
  assert.equal(notices({ dist: RAT.notice + 0.5 }), false, 'too far: keeps eating');
  assert.equal(notices({ dist: 3, los: false }), false, 'behind a wall');
  assert.equal(notices({ dist: 3, calm: 1 }), false, 'just gave up a chase');
  assert.ok(RAT.notice >= 4 && RAT.notice <= 5, 'about 4–5 m');
  // a perched rat sees further and rears up for longer: time to shoot it
  assert.equal(notices({ dist: 10, notice: RAT.perchNotice }), true);
  assert.ok(RAT.perchAlert > RAT.alert + 0.5);
});
test('a chasing rat gives up far from home unless the hero is right there', () => {
  assert.equal(givesUp({ homeDist: RAT.leash + 2, targetDist: 10 }), true);
  assert.equal(givesUp({ homeDist: RAT.leash + 2, targetDist: 2 }), false, 'still biting');
  assert.equal(givesUp({ homeDist: 4, targetDist: 20 }), false, 'near home');
});
test('loitering is sniffing, eating and short wanders', () => {
  const acts = new Set();
  for (let i = 0; i < 100; i++) { const n = nextIdle(i / 100); acts.add(n.act); assert.ok(n.dur > 0.8 && n.dur < 7, `${n.act} for ${n.dur}`); }
  assert.deepEqual([...acts].sort(), ['eat', 'sniff', 'wander']);
});
test('the dash director sends one rat a fair way off, never into a swarm', () => {
  const r = (dist, o = {}) => ({ dist, los: true, aggro: false, perch: false, alerting: false, ...o });
  assert.equal(pickDasher([r(3), r(11), r(30)]), 1, 'the one at a fair distance');
  assert.equal(pickDasher([r(3), r(30)]), -1, 'nobody in range');
  assert.equal(pickDasher([r(11, { los: false })]), -1, 'must be seen coming');
  assert.equal(pickDasher([r(11, { perch: true })]), -1, 'perched rats wait to be shot');
  const busy = Array.from({ length: RAT.maxAggro }, () => r(5, { aggro: true }));
  assert.equal(pickDasher([...busy, r(11)]), -1, 'enough rats on the heroes already');
});
test('the walk to the bus is in three beats, and long', () => {
  const beats = [{ id: 'walk', x0: 150, z0: 40, x1: 192, z1: 90 }, { id: 'melee', x0: 84, z0: 40, x1: 150, z1: 90 }, { id: 'ranged', x0: 0, z0: 0, x1: 84, z1: 104 }];
  assert.equal(beatAt(beats, 175, 60), 'walk'); assert.equal(beatAt(beats, 120, 60), 'melee'); assert.equal(beatAt(beats, 36, 30), 'ranged');
  const m = read('world/manhattan.js');
  assert.match(m, /export const CITY = \{ SX: 192,/, 'twice as long a street');
  const spawn = m.match(/const spawn = V\(([\d.]+), FY, SWN\.z0 \+ ([\d.]+)\)/);
  assert.ok(spawn && +spawn[1] - 37 + 40 >= 170, 'spawn far from the bus (about 180 m of walking, was about 90)');
  for (const k of ['trench', 'nests', 'beats', 'movers']) assert.match(m, new RegExp(`\\b${k}\\b`), k);
  assert.match(read('entities/monsters.js'), /rat: \{[^}]*idle: 'loiter'/, 'only the rat loiters');
  assert.match(read('story/openingFlow.js'), /feet: false/, 'no footprints in the prologue');
  assert.match(read('party.js'), /training && e\.loiter && !e\.aggro/, 'companions leave idle rats to the player');
});
test('every hint names the controls of the device being played', () => {
  for (const id of HINTS) for (const dev of ['kbm', 'pad0', 'touch']) assert.ok(prologueHint(id, dev).length > 8, `${id} ${dev}`);
  assert.match(prologueHint('move', 'kbm'), /WASD/); assert.match(prologueHint('move', 'pad1'), /left stick/);
  assert.match(prologueHint('melee', 'kbm'), /left click/); assert.match(prologueHint('melee', 'pad0'), /\bX\b/);
  assert.match(prologueHint('ranged', 'kbm'), /right click/); assert.match(prologueHint('ranged', 'pad0'), /\bRT\b/);
  assert.match(prologueHint('dodge', 'kbm'), /Shift/); assert.match(prologueHint('dodge', 'pad0'), /\bLB\b/);
  assert.match(prologueHint('ranged', 'kbm'), /before they reach you/);
});

// ---------------------------------------------------------------- Greek letters
test('a title holds in Greek, then settles into English with time to read it', () => {
  const t = GREEK.title;
  assert.ok(t.hold >= 1.5 && t.hold <= 2.2, 'Greek for a good while');
  assert.ok(t.read >= 2, 'English for at least two seconds');
  assert.ok(settledBy(t) <= t.hold + t.settle && showFor(t) >= t.hold + t.settle + 2);
  const text = 'The Pre-Algebra Teacher';
  const before = greekAt(text, t.hold - FLUX - 0.01, t);
  assert.equal([...before].filter((c, i) => /[A-Za-z]/.test(c) && c === [...text][i]).length, 0, 'still all Greek before the hold ends');
  assert.equal(greekAt(text, settledBy(t) + 0.01, t), text, 'all English once settled');
  // letters settle left to right
  const plan = greekPlan(text, t).filter((L) => L.at >= 0);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i].at >= plan[i - 1].at - t.settle * 0.2);
  assert.ok(letterAt(0, 10, t) >= t.hold);
  assert.notEqual(toGreek('YANCY ACADEMY', 3), 'YANCY ACADEMY');
});
test('narration is plain English; titles, names and signs use the Greek letters', () => {
  assert.doesNotMatch(read('story/cutscene.js'), /demigodText/, 'cutscene subtitles');
  assert.doesNotMatch(read('ui/storyCards.js'), /demigodText\(lineEl/, 'story-card lines');
  assert.match(read('ui/storyCards.js'), /demigodText\(titleEl, title, \{ timing: GREEK\.title \}\)/, 'story-card title');
  assert.match(read('ui/hud.js'), /timing: GREEK\.boss/, 'boss name');
  assert.match(read('main.js'), /chapter\.title : `[^`]*`, 'title'\)/, 'chapter title toast');
  assert.match(read('world/vehicles.js'), /new LiveSign\(sign,/, 'the bus lettering');
  assert.match(read('story/cutscenes.js'), /readBus\(\)/, 'the bus lettering settles before the cut');
  assert.match(read('world/camp.js'), /greek: true/, 'the Road West signs');
});

// ---------------------------------------------------------------- pictures
test('every picture the screens show is preloaded behind the loading screen, and exists', () => {
  for (const src of ALL_ART) assert.ok(existsSync(join(GAME, src)), src);
  for (const ch of CHAPTERS) if (ch.card) assert.ok(CHAPTER_ART.includes(ch.card), ch.id);
  for (const m of read('story/cutscenes.js').matchAll(/src: '(assets\/cards\/[^']+)'/g)) assert.ok(CUTSCENE_ART.includes(m[1]), m[1]);
  assert.ok(ALL_ART[0] === LOGO && ALL_ART[1] === TITLE_BG, 'the title’s own pictures first');
  assert.doesNotMatch(read('ui/title.js'), /onerror|img\.onload/, 'no logo that draws a stand-in first');
  assert.doesNotMatch(read('ui/chapterMap.js'), /art-fallback/, 'no parchment stand-in card');
  assert.doesNotMatch(read('ui/hud.js'), /info\.name\[0\]/, 'no letter stand-in portraits');
});

// ---------------------------------------------------------------- people in the Mist
test('people in the Mist tell you off (not too often), in their own words', () => {
  for (const id of ['teacher', 'student', 'tourist', 'guard', 'old_lady', 'bellhop', 'farmer', 'salesman']) {
    assert.ok(SCOLD[id]?.length >= 3, id);
    assert.ok(SCOLD[id].includes(scoldLine(id, 0.5)));
    assert.notEqual(scoldLine(id, 0, SCOLD[id][0]), SCOLD[id][0], 'never the same line twice in a row');
  }
  assert.equal(mayScold(null, 0), true); assert.equal(mayScold(10, 10 + SCOLD_EVERY - 0.1), false); assert.equal(mayScold(10, 10 + SCOLD_EVERY), true);
});
test('under True Sight the disguised are creatures nothing like people', () => {
  const m = read('entities/monsters.js');
  const humanlike = ['dracaena', 'empousa', 'fury', 'skeleton', 'cyclops'];
  for (const ch of CHAPTERS) {
    if (!ch.disguise?.length) continue;
    assert.ok(ch.mistForms?.length, `${ch.id} names what its disguised monsters are`);
    for (const k of ch.mistForms) { assert.match(m, new RegExp(`\\n  ${k}: \\{ name:`), `${k} is a monster`); assert.ok(!humanlike.includes(k), `${ch.id}: ${k} is not human-like`); }
  }
  assert.deepEqual(CHAPTERS.find((c) => c.id === 'lt1').mistForms, ['serpent', 'spider', 'ghost']);
  for (let i = 0; i < 10; i++) assert.ok(MIST_FORMS.includes(mistForm(null, i / 10)));
  assert.match(m, /\n  serpent: \{ name: 'Mist Serpent'/); assert.match(m, /\n  serpent: \(\) => \{/);
  assert.match(m, /\n  mortal: \{[^}]*mortal: true/, 'real mortals');
  assert.match(read('entities/enemy.js'), /if \(!this\.disguised \|\| this\.dead \|\| this\.def\.mortal\) return false;/, 'a real mortal never turns into a monster');
  assert.match(read('resume.js'), /rk: /, 'killed monsters stay gone after Continue');
});
