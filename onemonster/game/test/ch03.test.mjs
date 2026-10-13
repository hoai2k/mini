// Chapter 3 has no button that always wins (design.md, chapter 3): a patient
// Grumley who keeps still and lunges when the Bombanat with the letter dips
// usually snatches it; one who lunges all the time usually does not; and the
// Bombanat cannot stay up high for ever.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, idle, stubContext } from './harness.mjs';
import create, { TUNE, HOWTO, autopilot } from '../src/chapters/ch03.js';

const DT = 1 / 30;

function play(bot, seed, opts = {}) {
  const env = makeEnv({ seed, skill: opts.skill ?? 0.5, versus: !!opts.holder });
  const ch = create(env);
  const brain = {};
  let t = 0;
  while (!ch.done && t < 120) {
    ch.update(DT, bot(ch, brain, DT), opts.holder ? opts.holder(ch, brain, DT) : null);
    t += DT;
  }
  return ch;
}

function rate(bot, n = 40, opts) {
  let k = 0;
  for (let i = 0; i < n; i++) if (play(bot, 300 + i * 11, opts).outcome === 'snatched') k++;
  return k / n;
}

// Keeps still; when the letter Bombanat comes low nearby, creeps under it
// (slowly, so the wake is small) and lunges when it is in the claw's reach.
const patient = (ch) => {
  const { G, L } = ch;
  if (G.mode !== 'lurk') return idle;
  const dx = L.x - G.x;
  const alt = L.lane - 30 - L.y;
  if (ch.inReach(L) && G.charge > 1.5) return { ...idle, actionPressed: true };
  if (alt < 300 && Math.abs(dx) < 520 && Math.abs(dx) > 25) return { ...idle, x: Math.sign(dx) * 0.55 };
  return idle;
};

// Chases the letter Bombanat flat out and lunges whenever it can.
const spammer = (ch) => {
  const { G, L } = ch;
  const dx = L.x - G.x;
  return { ...idle, x: Math.abs(dx) > 20 ? Math.sign(dx) : 0, sprint: true, actionPressed: G.mode === 'lurk' };
};

test('a patient, lurking Grumley usually snatches the Bombanat', () => {
  const r = rate(patient);
  assert.ok(r >= 0.6, `patient snatch rate ${r}`);
});

test('the autopilot snatches with time to spare on most seeds', () => {
  let won = 0, spare = 0, three = 0;
  const n = 20;
  for (let i = 0; i < n; i++) {
    const ch = play(autopilot, 100 + i * 7);
    if (ch.outcome !== 'snatched') continue;
    won++;
    if (ch.time > 10) spare++;
    if (ch.marks()[0] === 3) three++;
  }
  assert.ok(won / n >= 0.7, `autopilot snatch rate ${won / n}`);
  assert.ok(spare / n >= 0.6, `with time to spare on ${spare}/${n}`);
  assert.ok(three >= 1, 'three postmarks are possible');
});

test('a lunge-spamming Grumley usually fails', () => {
  const r = rate(spammer);
  assert.ok(r <= 0.35, `spammer snatch rate ${r}`);
  assert.ok(r < rate(patient), 'patience beats spamming');
});

test('the Bombanat cannot stay high for ever: flapping tires it', () => {
  // A holder who flaps all the time to stay at the top.
  const flapper = (ch) => ({ ...idle, actionPressed: true });
  const env = makeEnv({ versus: true });
  const ch = create(env);
  let lowest = 0, winded = false;
  for (let t = 0; t < 30 && !ch.done; t += DT) {
    ch.update(DT, idle, flapper(ch));
    if (ch.L.winded > 0) winded = true;
    lowest = Math.max(lowest, ch.L.y);
  }
  assert.ok(winded, 'the flapper runs out of breath');
  assert.ok(lowest > ch.L.lane - 30 - 200, `and comes down low (lowest y ${lowest.toFixed(0)})`);
});

test('quick lunges are short, patient ones reach high', () => {
  const ch = create(makeEnv());
  for (let t = 0; t < TUNE.chargeTime + 0.5; t += DT) ch.update(DT, idle, null);
  const high = ch.reachNow();
  ch.update(DT, { ...idle, actionPressed: true }, null);
  for (let t = 0; t < 3 && ch.G.mode !== 'lurk'; t += DT) ch.update(DT, idle, null);
  assert.ok(ch.reachNow() < high * 0.6, `reach ${ch.reachNow().toFixed(0)} after a lunge vs ${high.toFixed(0)}`);
});

test('the reach column is the claw\'s hit box: a Bombanat inside it is grabbed, one above it is missed', () => {
  // A versus holder that hovers: parked where we put it, no input.
  const park = (y) => {
    const ch = create(makeEnv({ versus: true }));
    for (let t = 0; t < TUNE.chargeTime + 0.5; t += DT) ch.update(DT, idle, idle);
    ch.L.x = ch.G.x; ch.L.y = y; ch.L.vx = 0; ch.L.vy = 0;
    ch.update(DT, { ...idle, actionPressed: true }, idle);
    for (let t = 0; t < 1.5 && !ch.done && ch.G.mode === 'lunge'; t += DT) { ch.L.x = ch.G.x; ch.L.y = y; ch.update(DT, idle, idle); }
    return ch;
  };
  const inside = park(880 - TUNE.reachMax + 20);
  assert.equal(inside.outcome, 'snatched', 'inside the column: grabbed');
  const above = park(880 - TUNE.reachMax - 80);
  assert.notEqual(above.outcome, 'snatched', 'above the column: missed');
  assert.ok(above.L.warnT > 0, 'and warned off');
});

test('every frame draws and the how-to page has three composed steps', () => {
  const g = stubContext();
  const ch = create(makeEnv({ versus: true }));
  for (let t = 0; t < 6; t += DT) { ch.update(DT, autopilot(ch), idle); ch.draw(g, t); }
  assert.equal(HOWTO.length, 3);
  for (const st of HOWTO) {
    assert.ok(st.text.length < 80 && st.items.length >= 3);
    for (const it of st.items) if (it.draw) it.draw(g, 1);
  }
});
