// Headless checks for Act III, the Sea King's Court.
// Run: node widowsbay/qa/act3.test.mjs
import assert from 'node:assert/strict';
import act, { TUNE, PEDESTAL, SENTRIES, OUTRO, CAM_MAX, litAt, effRow } from '../src/acts/act3.js';

const BEAT = 60 / 76.5, DT = 1 / 30;
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };
const make = (carry = {}, seed = 7) => act.create({ seed, carry });
const tick = (st, inp = {}) => act.step(st, DT, { beat: (st.t + DT) / BEAT, ...inp });
const run = (st, sec, f = () => ({})) => { const all = []; for (let t = 0; t < sec && st.status === 'play'; t += DT) { tick(st, f(st)); all.push(...st.events); st.events.length = 0; } return all; };
const types = (ev) => ev.map((e) => e.type);
// Park the gaze, whale and fish out of the way for isolated checks.
const calm = (st) => { st.gaze.phase = 'rest'; st.gaze.dur = 1e9; st.gaze.aim = TUNE.restAim; st.whale.next = 1e9; st.fish.next = 1e9; };

// ---------------------------------------------------------------- planner
// A lookahead bot: every 0.2 s it tries each action for 0.4 s followed by
// each follow-up for 1.2 s on a cloned state, and picks the safest one that
// gets closest to the pedestal. It uses only the act's public inputs.
const ACTIONS = [{ moveX: 1 }, { moveX: -1 }, {}, { aHeld: true }, { up: true }, { down: true }];
const FOLLOW = [{ moveX: 1 }, { moveX: -1 }, {}, { aHeld: true }];
// Head for the pedestal when the whale is coming or masking; otherwise wait
// a little way off, out of the light that rests on the pearl.
const whaleSoon = (st) => (st.whale.t < 0 ? st.whale.next < 2.2 : st.whale.t < TUNE.whaleMask[1] - 0.6);
const goal = (st) => {
  if (st.phase !== 'play' && st.phase !== 'caught') return 1e6;
  const tx = whaleSoon(st) ? PEDESTAL.x : PEDESTAL.x - 330;
  const d = Math.abs(st.p.x - tx);
  return -d - (d < 400 ? effRow(st.p) * 150 : 0) - (st.p.rowT < 1 ? 40 : 0);
};
function sim(st, plan) {
  const s = structuredClone(st); s.events = [];
  let lost = 0, v = 0;
  const go = (inp, sec) => {
    for (let t = 0; t < sec && s.status === 'play'; t += DT) {
      const atP = effRow(s.p) === 0 && Math.abs(s.p.x - PEDESTAL.x) < PEDESTAL.reach;
      const once = t === 0 ? inp : { ...inp, up: false, down: false };
      const before = s.lanterns;
      act.step(s, DT, { beat: (s.t + DT) / BEAT, ...once, a: atP });
      lost += before - s.lanterns;
    }
  };
  for (const [inp, sec] of plan) { go(inp, sec); v += goal(s); }
  return -lost * 5000 + v / plan.length + (s.status === 'lost' ? -1e7 : 0);
}
// Each action for 0.4 s, then two follow-ups (0.6 s and 1.2 s).
function plan(st) {
  let best = null, bestV = -Infinity;
  for (const a of ACTIONS) {
    if ((a.up && st.p.row === 0) || (a.down && st.p.row === 2)) continue;
    let v = -Infinity;
    for (const f of [...FOLLOW, { up: true }, { down: true }]) for (const g of FOLLOW) v = Math.max(v, sim(st, [[a, 0.4], [f, 0.6], [g, 1.2]]));
    if (v > bestV + 1e-6) { bestV = v; best = a; }
  }
  return best;
}
function playBot(st, maxSec = 240) {
  let cur = {}, next = 0, held = 0, wasMasked = false, dashed = false;
  const log = { freezes: 0, maskedMoves: 0 };
  for (let t = 0; t < maxSec && st.status === 'play'; t += DT) {
    if (t >= next) { cur = plan(st) || {}; next = t + 0.2; held = 0; }
    const atP = effRow(st.p) === 0 && Math.abs(st.p.x - PEDESTAL.x) < PEDESTAL.reach;
    const inp = { ...cur, a: atP };
    if (held > 0) { inp.up = false; inp.down = false; }
    held++;
    if (st.masked && inp.moveX) log.maskedMoves++;
    tick(st, inp); st.events.length = 0;
  }
  return { ...log, time: st.t };
}

// ---------------------------------------------------------------- tests
test('create: the contract fields', () => {
  const st = make();
  assert.equal(st.status, 'play'); assert.equal(st.statusT, 0);
  assert.deepEqual(st.events, []); assert.equal(st.result, null);
  const h = act.hud(st);
  assert.equal(h.lanterns, 3); assert.equal(h.maxLanterns, 3); assert.ok(h.keepsakes.some((k) => k.id === 'pearl' && !k.have));
});

test('determinism: same seed and input, same court', () => {
  const a = make({}, 11), b = make({}, 11);
  run(a, 30, () => ({ moveX: 0.5 })); run(b, 30, () => ({ moveX: 0.5 }));
  assert.deepEqual(a.courtiers.map((c) => c.x), b.courtiers.map((c) => c.x));
  assert.equal(a.gaze.aim, b.gaze.aim); assert.equal(a.whale.next, b.whale.next);
});

test('courtiers step on the beat, and only on the beat', () => {
  const st = make(); calm(st);
  run(st, 0.2);
  const start = st.courtiers.map((c) => c.x1);
  // Go to the middle of a beat: the targets must not change until the next whole beat.
  let stepsAt = [];
  for (let i = 0; i < 300; i++) {
    const before = st.courtiers.map((c) => c.x1).join();
    const ev = run(st, DT);
    if (st.courtiers.map((c) => c.x1).join() !== before) stepsAt.push(st.beat);
    if (types(ev).includes('courtierStep')) assert.ok(st.beat % 1 < DT / BEAT + 1e-9, 'footstep lands on the beat');
  }
  assert.ok(stepsAt.length >= 8);
  for (const b of stepsAt) assert.ok(b % 1 < DT / BEAT + 1e-9, `step at beat phase ${b % 1}`);
  assert.notDeepEqual(st.courtiers.map((c) => c.x1), start);
  // slides finish early in the beat: by mid-beat a courtier stands on its target
  while ((st.beat % 1) < 0.55) run(st, DT);
  for (const c of st.courtiers) assert.ok(Math.abs(c.x - c.x1) < 1e-6);
});

test('sentries snap open on the beat; an open jaw costs a lantern', () => {
  const st = make(); calm(st);
  st.courtiers = st.courtiers.filter((c) => c.kind !== 'guard');
  let openPh = [];
  for (let i = 0; i < 200; i++) { run(st, DT); if (st.sentries[0].open) openPh.push(st.beat % 1); }
  assert.ok(openPh.length > 0);
  for (const p of openPh) assert.ok(p < TUNE.snapOpen + 1e-9);
  // stand on a sentry on the front groove through a beat
  st.p.row = st.p.from = 2; st.p.x = SENTRIES[0];
  const ev = run(st, BEAT * 1.1);
  assert.ok(types(ev).includes('sentryBite')); assert.equal(st.lanterns, 2);
});

test('the rose keeps the sentries asleep', () => {
  const st = make({ rose: true }); calm(st);
  st.courtiers = st.courtiers.filter((c) => c.kind !== 'guard');
  st.p.row = st.p.from = 2; st.p.x = SENTRIES[1];
  const ev = run(st, BEAT * 6);
  assert.ok(!st.sentries.some((s) => s.open));
  assert.ok(!types(ev).includes('sentryBite')); assert.ok(!types(ev).includes('sentrySnap'));
  assert.equal(st.lanterns, 3);
});

test('the beam spots you unless frozen with an attendant; grace protects', () => {
  // in the beam, standing: spotted
  let st = make(); calm(st);
  st.courtiers = [];
  st.p.row = st.p.from = 0; st.p.x = PEDESTAL.x - 20;
  let ev = run(st, 0.1);
  assert.ok(types(ev).includes('spotted')); assert.equal(st.lanterns, 2);
  assert.ok(types(ev).includes('hauledBack'));
  run(st, 0.8); assert.ok(st.p.x < PEDESTAL.x - 250, 'hauled back toward the entrance');
  st.p.x = PEDESTAL.x - 20;
  ev = run(st, 0.5);
  assert.equal(st.lanterns, 2, 'grace after a hit');
  ev = run(st, 0.5);
  assert.equal(st.lanterns, 1, 'grace runs out');
  // frozen alone in the beam: still spotted
  st = make(); calm(st); st.courtiers = [];
  st.p.row = st.p.from = 0; st.p.x = PEDESTAL.x - 20;
  run(st, 0.1, () => ({ aHeld: true }));
  assert.equal(st.lanterns, 2);
  // frozen beside an attendant in the beam: hidden
  st = make(); calm(st);
  st.courtiers = [{ kind: 'pink', row: 0, x: PEDESTAL.x - 20, x0: PEDESTAL.x - 20, x1: PEDESTAL.x - 20, a: 0, b: 2000, step: 0, pat: 'R', dir: 1 }];
  st.p.row = st.p.from = 0; st.p.x = PEDESTAL.x - 20;
  ev = run(st, 2, () => ({ aHeld: true }));
  assert.equal(st.lanterns, 3); assert.ok(st.p.hidden);
  // a guard is no cover
  st = make(); calm(st);
  const gx = PEDESTAL.x;
  st.courtiers = [{ kind: 'guard', row: 1, x: gx, x0: gx, x1: gx, a: 0, b: 9000, step: 0, pat: 'R', dir: 1 }];
  st.p.row = st.p.from = 1; st.p.x = gx - 38; // overlapping for cover, clear of a bump
  assert.ok(litAt(TUNE.restAim, 1, st.p.x));
  ev = run(st, 0.1, () => ({ aHeld: true }));
  assert.ok(!types(ev).includes('guardBump')); assert.ok(types(ev).includes('spotted'));
  assert.equal(st.lanterns, 2);
});

test('the beam telegraphs: a warn phase precedes every sweep', () => {
  const st = make();
  let last = st.gaze.phase, seq = [];
  run(st, 60, (s) => { if (s.gaze.phase !== last) { seq.push(s.gaze.phase); last = s.gaze.phase; } s.lanterns = 3; return { aHeld: true }; });
  for (let i = 0; i < seq.length; i++) if (seq[i] === 'sweep') assert.equal(seq[i - 1], 'warn');
  assert.ok(seq.filter((p) => p === 'sweep').length >= 4);
});

test('the whale passes every 20-25 s and blinds the gaze for about 3 s', () => {
  const st = make(); st.p.x = 200; st.p.row = st.p.from = 0;
  const starts = []; let maskRun = 0, maskRuns = [];
  for (let t = 0; t < 120; t += DT) {
    tick(st, { aHeld: true });
    if (st.events.some((e) => e.type === 'whalePass')) starts.push(st.t);
    if (st.maskedBy === 'whale') maskRun += DT; else if (maskRun) { maskRuns.push(maskRun); maskRun = 0; }
    st.events.length = 0;
    st.lanterns = 3; // immortal for this check
  }
  assert.ok(starts.length >= 4, `${starts.length} passes`);
  for (let i = 1; i < starts.length; i++) { const d = starts[i] - starts[i - 1]; assert.ok(d >= 19.9 && d <= 25.2, `gap ${d}`); }
  for (const m of maskRuns) assert.ok(m > 2.7 && m < 3.4, `mask ${m}`);
  // standing in the rest beam during a pass is safe
  const s2 = make(); s2.p.row = s2.p.from = 0; s2.p.x = PEDESTAL.x - 20; s2.courtiers = [];
  s2.whale.next = 0.01; s2.gaze.dur = 1e9;
  run(s2, 1.2); // let the whale arrive (first 0.9 s is the entrance)
  const before = s2.lanterns; s2.p.grace = 0;
  const ev = run(s2, 2.5);
  assert.equal(s2.lanterns, before); assert.ok(!types(ev).includes('spotted'));
});

test('guards bump; changing groove is tweened', () => {
  const st = make(); calm(st);
  st.courtiers = [{ kind: 'guard', row: 1, x: 610, x0: 610, x1: 610, a: 0, b: 2000, step: 0, pat: 'R', dir: 1 }];
  st.p.row = st.p.from = 2; st.p.x = 610; // between two sentries
  tick(st, { up: true });
  assert.equal(st.p.row, 1); assert.equal(effRow(st.p), 2, 'still on the old groove early in the tween');
  tick(st, { up: true }); assert.equal(st.p.row, 1, 'no second change mid-tween');
  const ev = run(st, 0.5);
  assert.ok(types(ev).includes('guardBump')); assert.equal(st.lanterns, 2);
});

test('pearls along the grooves score', () => {
  const st = make(); calm(st); st.courtiers = [];
  st.p.row = st.p.from = 2; st.p.x = 300; st.carry.rose = true;
  run(st, 7, () => ({ moveX: 1 }));
  assert.ok(st.pearls >= 2); assert.equal(st.score, st.pearls * 10);
});

test('the pearl: only in the whale\'s shadow; taking it grants the keepsake', () => {
  let st = make(); calm(st); st.courtiers = [];
  st.gaze.aim = 200; st.p.row = st.p.from = 0; st.p.x = PEDESTAL.x; st.p.grace = 99;
  tick(st, { a: true });
  assert.equal(st.phase, 'play', 'not without the whale');
  st.cam = CAM_MAX; st.fish.t = 2.17; tick(st, { a: true }); // the fish over the lantern is not enough
  assert.equal(st.maskedBy, 'fish'); assert.equal(st.phase, 'play');
  st = make(); calm(st); st.courtiers = [];
  st.whale.t = 2; st.p.row = st.p.from = 1; st.p.x = PEDESTAL.x;
  tick(st, { a: true });
  assert.equal(st.phase, 'play', 'not from the wrong groove');
  st.p.row = st.p.from = 0;
  tick(st, { a: true });
  assert.equal(st.phase, 'take'); assert.ok(st.events.some((e) => e.type === 'pearlTaken'));
  assert.equal(act.hud(st).keepsakes.find((k) => k.id === 'pearl').have, true);
  const ev = run(st, 10);
  assert.ok(types(ev).includes('whaleTurn')); assert.ok(types(ev).includes('swallow'));
  assert.equal(st.status, 'won');
  assert.deepEqual(st.result.keepsakes, { pearl: true });
  assert.equal(typeof st.result.score, 'number'); assert.equal(typeof st.result.pearls, 'number');
  const outro = 2 * DT + OUTRO.take + OUTRO.turn + OUTRO.lunge + OUTRO.iris;
  assert.ok(Math.abs(st.t - outro) < 0.2, `${st.t} vs ${outro}`);
});

test('losable: three hits, a caught beat, then lost', () => {
  const st = make();
  const ev = run(st, 120, () => ({ moveX: 1 })); // walk straight down the front groove
  assert.ok(types(ev).filter((t) => t === 'hit').length === 3);
  assert.ok(types(ev).includes('caught'));
  assert.equal(st.status, 'lost'); assert.ok(st.lostTitle && st.lostSub);
  assert.equal(st.result, null);
});

test('tea omens appear a beat before the beam reaches you', () => {
  const st = make({ tea: 3 }); st.courtiers = []; st.whale.next = 1e9; st.fish.next = 1e9;
  st.p.row = st.p.from = 1; st.p.x = 640;
  let omenBefore = false, sawHit = false;
  for (let t = 0; t < 30 && !sawHit; t += DT) {
    tick(st, {});
    if (st.omens.some((o) => o.kind === 'gaze')) omenBefore = true;
    if (st.events.some((e) => e.type === 'spotted')) sawHit = true;
    st.events.length = 0;
  }
  assert.ok(sawHit && omenBefore);
  const none = make({ tea: 2 }); run(none, 20); assert.equal(none.omens.length, 0);
});

const results = [];
for (const [seed, carry] of [[7919, { tea: 3 }], [15838, {}], [23757, { rose: true }], [63352, { tea: 3 }], [71271, { rose: true, tea: 3 }]]) {
  test(`winnable by the planner with freezes and a whale pass (seed ${seed}, ${carry.rose ? 'rose' : 'no rose'})`, () => {
    const st = make(carry, seed);
    playBot(st);
    results.push({ seed, rose: !!carry.rose, time: st.t.toFixed(1), lanterns: st.lanterns, freezes: st.stats.freezes, unseen: st.stats.hiddenPasses, whales: st.whale.passes, pearls: st.pearls, score: st.result?.score });
    assert.equal(st.status, 'won', `status ${st.status} at ${st.t.toFixed(1)} s, x ${st.p.x.toFixed(0)} row ${st.p.row}`);
    assert.deepEqual(st.result.keepsakes, { pearl: true });
    assert.ok(st.stats.freezes > 0, 'used freezes');
    assert.ok(st.stats.maskedTime > 0 && st.whale.passes >= 1, 'used a whale pass');
  });
}
console.table(results);
console.log(`${n} passed`);
