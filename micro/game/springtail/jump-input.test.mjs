import test from 'node:test';
import assert from 'node:assert/strict';
import { updateJumpInput, takeQueuedJump, RECOCK_TIME } from './jump-input.js';
import { digestion, reform, SUNDEW_PHASES, CATCH_PHASES, REFORM } from './sundew-digestion.js';
import { createCapture } from '../shared/predation.js';
const player = () => ({ mode: 'film', cock: 1, hunker: 0, charging: false, charge: 0, queuedJump: null });
const input = (p, down, dt = 1 / 60, aim = { x: 1, z: 0 }) => updateJumpInput(p, { dashDown: down, defend: false }, dt, aim);

test('a quick ground tap launches once after a very short recharge', () => {
  const p = player(); p.cock = 0;
  input(p, true); input(p, false); assert.equal(takeQueuedJump(p), null);
  input(p, false, RECOCK_TIME); assert.ok(takeQueuedJump(p).power > 0.12);
  assert.equal(takeQueuedJump(p), null);
});
test('a second tap early in flight survives the arc and fires on landing', () => {
  const p = player(); input(p, true); input(p, false); assert.ok(takeQueuedJump(p));
  p.mode = 'air'; p.cock = 0; input(p, true); input(p, false);
  for (let i = 0; i < 55; i++) input(p, false);
  assert.equal(takeQueuedJump(p), null, 'no mid-air double jump');
  p.mode = 'film'; input(p, false); assert.ok(takeQueuedJump(p), 'no extra landing cooldown');
  input(p, false); assert.equal(takeQueuedJump(p), null, 'one buffered hop only');
});
test('holding in flight prepares a full jump and preserves release aim', () => {
  const p = player(); p.mode = 'air'; p.cock = 0;
  for (let i = 0; i < 45; i++) input(p, true);
  input(p, false, 1 / 60, { x: 0, z: -1 }); p.mode = 'moss'; input(p, false);
  const jump = takeQueuedJump(p); assert.equal(jump.power, 1); assert.equal(jump.x, 0); assert.equal(jump.z, -1);
});
test('traps and captures clear pending jumps without affecting another player', () => {
  const a = player(), b = player();
  for (const p of [a, b]) { input(p, true); input(p, false); }
  a.mode = 'stuck'; input(a, false); assert.equal(a.queuedJump, null); assert.ok(takeQueuedJump(b));
  a.mode = 'film'; input(a, true); a.mode = 'caught'; input(a, false);
  assert.equal(a.charging, false); assert.equal(a.queuedJump, null);
});
test('whitening and dissolution flow smoothly into a short beat on the closed leaf', () => {
  let previous = { white: 0, dissolve: 0 };
  for (let i = 0; i <= 100; i++) {
    const next = digestion('eat', i / 100);
    assert.ok(next.white >= previous.white && next.dissolve >= previous.dissolve);
    assert.ok(next.white - previous.white < 0.04 && next.dissolve - previous.dissolve < 0.04);
    previous = next;
  }
  assert.deepEqual(previous, { white: 1, dissolve: 1 });
  assert.deepEqual(digestion('follow', 0), previous); assert.deepEqual(digestion('fadeOut', 0), previous);
  assert.deepEqual(digestion('fadeIn', 0), { white: 0, dissolve: 0 });
  assert.equal(SUNDEW_PHASES.find(([p]) => p === 'follow')[1], 0.3);
});

test('re-forming: the body fills in smoothly, then colours, ending whole', () => {
  let previous = reform(0);
  assert.deepEqual(previous, { dissolve: 1, white: 1 });
  for (let i = 1; i <= 100; i++) {
    const next = reform(i / 100);
    assert.ok(next.dissolve <= previous.dissolve && next.white <= previous.white);
    assert.ok(previous.dissolve - next.dissolve < 0.05 && previous.white - next.white < 0.05);
    previous = next;
  }
  assert.deepEqual(previous, { dissolve: 0, white: 0 });
  // from the last mote to control: the beat, the glide, the hand-over and the re-forming, about 2 s
  const after = ['follow', 'fadeOut', 'fadeIn'].reduce((t, k) => t + SUNDEW_PHASES.find(([p]) => p === k)[1], 0) + REFORM;
  assert.ok(after > 1.5 && after <= 2.1, `${after} s`);
});

test('sundew pause timings do not change subsequent predator captures', () => {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ style: {} }), body: { appendChild() {} } };
  try {
    let respawns = 0;
    const capture = createCapture({ onRespawn: () => respawns++ });
    const reachFollow = () => {
      for (let i = 0; i < 300 && capture.phase !== 'follow'; i++) capture.update(1 / 60);
      assert.equal(capture.phase, 'follow');
    };
    capture.start({ phases: SUNDEW_PHASES }); reachFollow();
    for (let i = 0; i < 12; i++) capture.update(1 / 60);
    assert.equal(capture.phase, 'follow');
    // a pad mashing A never cuts it short (nothing in a catch is skippable)
    const mash = { pressed: () => true, value: () => 1 };
    let n = 0;
    for (; n < 150 && capture.active; n++) capture.update(1 / 60, mash);
    assert.equal(capture.active, false); assert.equal(respawns, 1);
    assert.ok(n >= 44, `the sundew's glide ended after only ${n} frames`);
    capture.start({ by: 'Stenus', phases: CATCH_PHASES }); reachFollow();
    for (let i = 0; i < 60; i++) capture.update(1 / 60, mash);
    assert.equal(capture.phase, 'follow', 'ordinary predators retain their longer follow phase');
  } finally { globalThis.document = originalDocument; }
});
