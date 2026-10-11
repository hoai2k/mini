// Headless checks for the film edition (?widowsbay=off; design/film-adaptation.md).
// The original acts' own suites run with KOTF_EDITION=widowsbay; this file
// checks what the film edition changes or adds.
// Run: KOTF_EDITION=film node kingdomofthefairies/qa/film.test.mjs
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { ACTS } from '../src/acts/index.js';
import { TEMPEST } from '../src/acts/act1.js';
import { FILM, LEGACY, FILM_CAST } from '../src/theme.js';
import prologue, { GIFTS, FAIRIES, AZURINE_X, RAMPART, ARMS } from '../src/acts/prologue.js';
import act2, { FAIRY_AT } from '../src/acts/act2.js';
import act3, { PASSAGE, guardOpen } from '../src/acts/act3.js';
import { actTower, actBurning, SWIM, TOWER_HOLDS, TOWER_TOP, FILM_T, BARREL, DIVE, APOTH } from '../src/acts/act5film.js';
import { pickHold } from '../src/acts/act5.js';
import act4 from '../src/acts/act4.js';
import { createCavern, stepCavern, surfaces, EXIT_X } from '../src/acts/act4cavern.js';

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

test('prologue: gifts, her hand, the chase along the rampart and the arming', () => {
  const st = prologue.create({});
  let clock = 0, last = false;
  const press = (want) => { const a = want && !last; last = want; return a; };   // a fresh press each time
  run(prologue, st, 120, (s) => {
    const p = s.p, beat = (clock += DT) / BEAT;
    if (s.phase === 'court') {
      const f = FAIRIES.find((q) => !s.gifts.includes(q.gift));
      const to = f ? f.x : AZURINE_X - 60;
      return { moveX: Math.abs(to - p.x) > 20 ? Math.sign(to - p.x) : 0, a: press(!!s.near), beat };
    }
    if (s.phase === 'rampart') {
      const fire = s.fires.find((f) => f.x > p.x && f.x - p.x < 70 && (f.lit || f.y > RAMPART.y - 120));
      return { moveX: 1, a: press(!!fire && p.on), aHeld: true, beat };
    }
    if (s.phase === 'armoury') {
      const a = ARMS.find((q) => !s.arms.includes(q.id));
      return { moveX: a && Math.abs(a.x - p.x) > 20 ? Math.sign(a.x - p.x) : 0, a: press(!!s.near), beat };
    }
    if (s.phase === 'knighted') return { moveX: 1, beat };
    return { beat };
  });
  assert.equal(st.status, 'won', st.phase);
  assert.deepEqual([...st.gifts].sort(), [...GIFTS].sort());
  assert.ok(st.betrothed);
  assert.equal(st.arms.length, 3);
  assert.ok(prologue.intro, 'flows straight into Act I');
});

test('prologue: fire on the rampart only knocks him back, and B skips each scene', () => {
  const st = prologue.create({ from: { scene: 1 } });
  assert.equal(st.phase, 'rampart');
  st.fires.push({ x: st.p.x + 5, y: RAMPART.y, lit: true, burn: 0 });
  prologue.step(st, DT, { moveX: 1, beat: 0 });
  assert.equal(st.knocks, 1);
  assert.equal(st.status, 'play');
  const s2 = prologue.create({});
  let presses = 0;
  run(prologue, s2, 10, (s) => { const b = Math.floor(s.t * 3) !== Math.floor((s.t - DT) * 3); if (b) presses++; return { b }; });
  assert.equal(s2.status, 'won');
  assert.ok(presses <= 6, `${presses} presses`);
});

test('Act I: in the tempest he walks the deck and lights each lantern (nothing on the beat)', () => {
  const st = ACTS[1].create({ seed: 2, from: { scene: 4 } });
  assert.equal(st.phase, 'party');
  let clock = 0, last = false;
  run(ACTS[1], st, 30, (s) => {
    const i = s.party.on.findIndex((o) => !o), x = TEMPEST.lanternX[Math.max(0, i)];
    const want = s.tp.near >= 0, a = want && !last; last = want;
    return { moveX: Math.abs(x - s.tp.x) > 10 ? Math.sign(x - s.tp.x) : 0, a, beat: (clock += DT) / BEAT };
  }, (s) => s.phase !== 'party');
  assert.equal(st.party.lit, 4);
  assert.equal(st.phase, 'turn');
  const s2 = ACTS[1].create({ seed: 2, from: { scene: 4 } });
  run(ACTS[1], s2, 4, () => ({ a: true }));
  assert.ok(s2.party.lit <= 1, 'A away from the lanterns lights nothing');
});

test('Act II: he swims to the Water Fairy for her blessing (no button, no refusal)', () => {
  const st = act2.create({ seed: 3, carry: {}, from: { scene: 4 } });
  run(act2, st, 4, () => ({ a: true, b: true }));   // pressing does nothing
  assert.equal(st.choice, null);
  run(act2, st, 12, (s) => ({ moveX: Math.sign(FAIRY_AT.x - s.sailor.x), moveY: s.sailor.y < FAIRY_AT.y + 40 ? 1 : 0 }), (s) => s.choice != null);
  assert.equal(st.choice, 'take');
  assert.ok(act2.cast['witch-stand'] === 'water-fairy-stand');
});

test('Act III: he walks through the lobster palace, past the claws, the sea flora and the grotto into the court', () => {
  const st = act3.create({ seed: 1, carry: {} });
  assert.ok(st.tf, 'the passage opens the act');
  let clock = 0;
  run(act3, st, 40, (s) => {
    if (!s.tf) return {};
    const f = s.tf, g = f.set === 0 && PASSAGE.guards.find((q) => q.x > f.x && q.x - f.x < 130);
    const wait = g && !guardOpen(g, f.t + 0.35);
    return { moveX: wait ? 0 : 1, beat: (clock += DT) / BEAT };
  }, (s) => !s.tf);
  assert.equal(st.tf, null);
  assert.equal(st.pearls, 3);
  const s2 = act3.create({ seed: 1, carry: {}, from: { scene: 1 } });
  assert.ok(!s2.tf, 'not on a resume');
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

test('Act VI: out on the cliff, push the barrel over, walk the wedding street and into the light', () => {
  const st = actBurning.create({ seed: 4, carry: { sleepers: 5 }, from: { scene: 2 } });
  assert.equal(st.phase, 'quay');
  run(actBurning, st, 20, () => ({ moveX: 1 }), (s) => s.phase !== 'quay');
  assert.equal(st.phase, 'barrel', st.phase);
  assert.equal(st.checkpoint.scene, 3, 'renumbered to the film scene');
  // a careful pusher: walks into it, steps back while it shakes
  run(actBurning, st, 40, (s) => ({ moveX: s.barrel?.state === 'still' ? 1 : -1 }), (s) => s.phase !== 'barrel');
  assert.equal(st.phase, 'wedding', st.phase);
  assert.equal(st.checkpoint.scene, 4);
  run(actBurning, st, 20, () => ({ moveX: 1 }), (s) => s.phase !== 'wedding');
  assert.equal(st.phase, 'apotheosis');
  run(actBurning, st, 20, (s) => ({ moveX: s.w.x < APOTH.mark + 35 ? 1 : 0 }));
  assert.equal(st.status, 'won', st.phase);
  assert.equal(st.result.ending, 'wedding');
});

test('Act VI: the barrel lurching back knocks a prince who leans on it; nothing on the beat', () => {
  const st = actBurning.create({ seed: 4, carry: {}, from: { scene: 3 } });
  run(actBurning, st, 6, () => ({ moveX: 1, a: true }), (s) => s.barrel.knocks > 0);
  assert.ok(st.barrel.knocks >= 1, 'knocked down');
  assert.equal(st.phase, 'barrel');
  const s2 = actBurning.create({ seed: 4, carry: {}, from: { scene: 3 } });
  run(actBurning, s2, 3, () => ({ a: true }));
  assert.ok(s2.barrel.x <= BARREL.at, 'A alone does not push it');
});

test('Act V: from the clifftop he walks to the edge and dives into the sea gap', () => {
  const st = actTower.create({ seed: 1, carry: {}, from: { scene: 0 } });
  st.phase = 'dive'; st.phaseT = 0;
  run(actTower, st, 12, (s) => ({ moveX: 1, a: s.w && s.w.x > DIVE.edge - 60 }), (s) => s.phase === 'swim');
  assert.equal(st.phase, 'swim');
});

test('Act VI: a checkpoint in the tower resumes in the tower', () => {
  const st = actBurning.create({ seed: 4, carry: {}, from: { scene: 1 } });
  assert.equal(st.phase, 'house'); assert.ok(st.p.carry, 'carrying her');
});

// From each surface, the take-off point of a full-speed leap that lands on
// the next surface ahead (through the real movement code), or null.
function takeoffs() {
  const S = surfaces().filter((p) => p.id !== 'L7').sort((a, b) => a.x0 - b.x0), out = {};
  for (const p of S) {
    if (p.x1 >= EXIT_X) break;
    out[p.id] = null;
    for (let x = p.x0 + 20; x <= p.x1 && !out[p.id]; x += 4) {
      const cv = createCavern({ x }); cv.drops = []; Object.assign(cv.s, { y: p.y, on: p.id, vx: 280 });
      let land = null;
      for (let t = 0, first = true; t < 2 && !land; t += DT, first = false) {
        stepCavern(cv, DT, { moveX: 1, a: first, aHeld: true }, { hit: () => { land = 'pool'; }, pearl: () => {}, events: [], graceLeft: () => 1 });
        if (!land && cv.s.on && cv.s.on !== p.id) land = cv.s.on;
      }
      const q = S.find((r) => r.id === land);
      if (q && q.x0 > p.x0) out[p.id] = x;
    }
  }
  return out;
}

test('Act IV cavern: every surface has a leap to the next one ahead', () => {
  for (const [id, x] of Object.entries(takeoffs())) assert.ok(x != null, `no way on from ${id}`);
});

test('Act IV cavern: a prince who keeps moving reaches the night sea untouched by stalactites', () => {
  const T = takeoffs(), st = act4.create({ carry: {}, from: { scene: 5 } });
  assert.equal(st.phase, 'cavern');
  let clock = 0, lost = [];
  run(act4, st, 60, (s) => {
    const c = s.cv?.s;
    if (s.lanterns + lost.length < 3) lost.push(`${c.x.toFixed(0)},${c.y.toFixed(0)}`);
    return { moveX: 1, aHeld: true, a: !!(c?.on && T[c.on] != null && c.x >= T[c.on]), beat: (clock += DT) / BEAT };
  }, (s) => s.phase !== 'cavern');
  assert.equal(st.lanterns, 3, `touched at ${lost} (take-offs ${JSON.stringify(T)})`);
  assert.ok(['iris'].includes(st.phase) || st.status === 'won', `${st.phase} at x ${st.cv.s.x.toFixed(0)} on ${st.cv.s.on} t ${st.t.toFixed(1)}`);
});

test('Act IV cavern: a pool costs a lantern and puts him back on firm rock', () => {
  const st = act4.create({ carry: {}, from: { scene: 5 } });
  Object.assign(st.cv.s, { x: 600, y: 700, on: null, vy: 300 });
  st.grace = 0;
  act4.step(st, DT, { beat: 0 });
  assert.equal(st.lanterns, 2);
  assert.ok(st.cv.s.y <= 600 && st.cv.s.x < 560, `respawned at ${st.cv.s.x}`);
});

test('Act IV (film): the beach leads on into the cavern', () => {
  const st = act4.create({ carry: {}, from: { scene: 4 } });
  st.phase = 'shore'; st.phaseT = 99;
  act4.step(st, DT, { beat: 0 });
  assert.equal(st.phase, 'cavern');
  assert.equal(act4.scenes.length, 7);
});

const manifest = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url)));
const files = Object.values(manifest.slots).filter((s) => s.edition === 'film' && (s.interim || s.status === 'delivered')).map((s) => s.interim || s.file);
for (const f of files) await access(new URL('../assets/' + f, import.meta.url));
test('every interim cut-out and tableau the manifest names exists', () => { assert.ok(files.length >= 60, String(files.length)); });

console.log(`\n${n} tests passed`);
