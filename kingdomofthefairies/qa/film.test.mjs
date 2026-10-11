// Headless checks for the film edition (the default; design/film-adaptation.md).
// The original acts' own suites run with KOTF_EDITION=widowsbay; this file
// checks what the film edition changes or adds.
// Run: node kingdomofthefairies/qa/film.test.mjs
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { ACTS } from '../src/acts/index.js';
import { FILM, LEGACY, FILM_CAST } from '../src/theme.js';
import prologue, { GIFTS } from '../src/acts/prologue.js';
import act2 from '../src/acts/act2.js';
import { actTower, actBurning, SWIM, TOWER_HOLDS, TOWER_TOP, FILM_T, BARREL } from '../src/acts/act5film.js';
import { pickHold } from '../src/acts/act5.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };
const DT = 1 / 60, BEAT = 60 / 76.5;
const run = (act, st, sec, input = () => ({}), until = () => false) => {
  for (let t = 0; t < sec && st.status === 'play' && !until(st); t += DT) {
    const beat = (st.clock ?? st.t ?? 0) / BEAT;
    act.step(st, DT, { beat: beat + DT / BEAT, ...input(st) });
    st.events.length = 0;
  }
};
// Presses A just on each beat (when the beat's fraction is near 0).
const onBeat = (st) => { const b = ((st.clock ?? st.t ?? 0) + DT) / BEAT; return { a: (b % 1) < 0.04 }; };

test('the film edition is the default, with a prologue and six acts', () => {
  assert.equal(FILM, true); assert.equal(LEGACY, false);
  assert.deepEqual(ACTS.map((a) => a.kicker), ['Prologue', 'Act I', 'Act II', 'Act III', 'Act IV', 'Act V', 'Act VI']);
  assert.deepEqual(ACTS.map((a) => a.title), ['The Betrothal', 'The Royal Crossing', 'The Water Fairy', "Neptune's Court", "The Whale's Passage", 'The Enchanted Tower', 'The Burning Tower']);
  for (const a of ACTS) { assert.ok(a.scenes?.length, a.title); assert.equal(typeof a.create, 'function'); }
  assert.equal(FILM_CAST['sailor-stand'], 'prince-stand');
  assert.equal(FILM_CAST['guitar-sinking'], 'sword-sinking');
});

test('every scene of every film act creates and steps without throwing', () => {
  for (const a of ACTS) a.scenes.forEach((_, k) => {
    const st = a.create({ seed: 5, carry: { tea: 3, guitar: true, pearl: true, stone: true, sleepers: 4 }, from: { scene: k } });
    run(a, st, 4);
    assert.ok(['play', 'won'].includes(st.status), `${a.title} scene ${k}: ${st.status}`);
    a.hud(st); a.draw && a.announce?.({ type: 'hit', lanterns: 2 });
  });
});

test('prologue: the intro plays through on its own, gifts and sword included', () => {
  const st = prologue.create({});
  const seen = [];
  run(prologue, st, 60, () => ({}), (s) => { seen.push(s.phase); return false; });
  assert.equal(st.status, 'won');
  assert.equal(st.gifts, GIFTS.length);
  assert.ok(st.armed, 'the sword was raised');
  assert.ok(prologue.intro, 'flows straight into Act I');
  assert.deepEqual(st.result.keepsakes, {});
});

test('prologue: A skips each tableau, so pressing it reaches the game at once', () => {
  const st = prologue.create({});
  let presses = 0;
  run(prologue, st, 10, (s) => { const a = Math.floor(s.t * 5) !== Math.floor((s.t - DT) * 5); if (a) presses++; return { a }; });
  assert.equal(st.status, 'won');
  assert.ok(presses <= 6, `${presses} presses`);
  assert.ok(st.t < 2, `reached the game in ${st.t.toFixed(2)} s`);
});

test('Act I: the film tempest lights its own lanterns (no rhythm input)', () => {
  const st = ACTS[1].create({ seed: 2, from: { scene: 4 } });
  assert.equal(st.phase, 'party');
  let clock = 0;
  run(ACTS[1], st, 5, () => ({ beat: (clock += DT) / BEAT }), (s) => s.phase !== 'party');
  assert.equal(st.party.lit, 4);
});

test('Act II: the Water Fairy blesses him with no refusal, and the blessing is no keepsake', () => {
  const st = act2.create({ seed: 3, carry: {}, from: { scene: 4 } });
  run(act2, st, 3, () => ({ b: true }));  // refusing does nothing
  run(act2, st, 6);
  assert.notEqual(st.choice, 'refuse');
  assert.equal(st.choice, 'take', 'accepted after a moment');
  assert.ok(act2.cast['witch-stand'] === 'water-fairy-stand');
});

test('Act V: the swim is won by diving under her swoops, then the tower wall begins', () => {
  const st = actTower.create({ seed: 9, carry: {}, from: { scene: 2 } });
  assert.equal(st.phase, 'swim');
  run(actTower, st, 60, (s) => {
    if (s.phase !== 'swim') return {};
    const sw = s.sw, near = sw.swoop && Math.abs(sw.swoop.x - sw.x) < 140 && sw.swoop.lead - sw.swoop.t < 0.5;
    return { moveX: 1, a: !!near && sw.dive <= 0 };
  }, (s) => s.phase === 'tower');
  assert.equal(st.phase, 'tower', `phase ${st.phase}, x ${st.sw?.x}`);
  assert.equal(st.lanterns, 3, 'no swoop landed');
  assert.ok(st.sw.aurora != null && st.sw.swoops >= 2, `Aurora drove her off after ${st.sw.swoops} swoops`);
});

test('Act V: a swimmer who never dives is caught', () => {
  const st = actTower.create({ seed: 9, carry: {}, from: { scene: 2 } });
  run(actTower, st, 30, () => ({ moveX: 0.6 }));
  assert.ok(st.lanterns < 3);
});

test('Act V: the tower wall has a route from its foot to the window', () => {
  const st = actTower.create({ seed: 1, carry: {}, from: { scene: 3 } });
  const seen = new Set([st.cl.at]), q = [st.cl.at];
  const dirs = [{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0.6, y: 0.8 }, { x: -0.6, y: 0.8 }];
  while (q.length) {
    const i = q.shift();
    st.cl.at = i;
    for (const d of dirs) for (const leap of [false, true]) {
      const j = pickHold(st, i, d, leap);
      if (j >= 0 && !seen.has(j)) { seen.add(j); q.push(j); }
    }
  }
  const top = TOWER_HOLDS.findIndex((h) => h.kind === 'top');
  assert.ok(seen.has(top), 'the window is reachable');
  assert.ok(TOWER_TOP > 1000);
});

test('Act V: reaching the window plays the window shot and wins', () => {
  const st = actTower.create({ seed: 1, carry: {}, from: { scene: 4 } });
  const top = st.holds.findIndex((h) => h.kind === 'top');
  st.cl.at = top - 1; st.cl.from = top - 1;
  run(actTower, st, 2, () => ({ up: true }));
  assert.ok(['window', 'iris'].includes(st.phase) || st.status === 'won', st.phase);
  run(actTower, st, FILM_T.window + FILM_T.iris + 1);
  assert.equal(st.status, 'won');
});

test('Act VI: out on the cliff, the barrel on the beat, the wedding and the apotheosis', () => {
  const st = actBurning.create({ seed: 4, carry: { sleepers: 5 }, from: { scene: 2 } });
  assert.equal(st.phase, 'quay');
  run(actBurning, st, 20, () => ({ moveX: 1 }));
  assert.equal(st.phase, 'barrel', st.phase);
  assert.equal(st.checkpoint.scene, 3, 'renumbered to the film scene');
  run(actBurning, st, 20, onBeat);
  assert.ok(['wedding', 'apotheosis', 'iris'].includes(st.phase) || st.status === 'won', st.phase);
  assert.equal(st.barrel.pushes, BARREL.pushes);
  run(actBurning, st, FILM_T.wedding + FILM_T.apotheosis + FILM_T.iris + 2);
  assert.equal(st.status, 'won');
  assert.equal(st.result.ending, 'wedding');
});

test('Act VI: a checkpoint in the tower resumes in the tower', () => {
  const st = actBurning.create({ seed: 4, carry: {}, from: { scene: 1 } });
  assert.equal(st.phase, 'house'); assert.ok(st.p.carry, 'carrying her');
});

const manifest = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url)));
const files = Object.values(manifest.slots).filter((s) => s.edition === 'film' && (s.interim || s.status === 'delivered')).map((s) => s.interim || s.file);
for (const f of files) await access(new URL('../assets/' + f, import.meta.url));
test('every interim cut-out and tableau the manifest names exists', () => { assert.ok(files.length >= 60, String(files.length)); });

console.log(`\n${n} tests passed`);
