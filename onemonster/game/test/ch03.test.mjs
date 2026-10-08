// Chapter 3 has no button that always wins (design.md, chapter 3): a patient
// Grumley who keeps still and lunges when the Bombanat with the letter dips
// usually snatches it; one who lunges all the time usually does not; and the
// Bombanat cannot stay up high for ever.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, idle } from './harness.mjs';
import create, { TUNE } from '../src/chapters/ch03.js';

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
  const reachTop = G.y - ch.reachNow();
  if (Math.abs(dx) < 60 && L.y >= reachTop + 40 && G.charge > 1.5) return { ...idle, actionPressed: true };
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
