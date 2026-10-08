// Chapter 6 (KER-PLOP): a Yalapappus who follows the bottle's shadow and dodges
// the junk usually catches it; one who stays rolled into a ball never does; the
// versus holder can't keep the bottle in for ever.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create from '../src/chapters/ch06.js';

const g = stubContext();
const DT = 1 / 30;
const GY = 960;

// Follows the bottle's shadow; otherwise keeps out from under falling junk and
// waits near the cloud. Munches when it can.
function follower(ch) {
  let n = 0;
  return () => {
    n++;
    const y = ch.yal;
    const s = { ...idle };
    if (y.mode === 'munch') { s.action = n % 2 === 0; s.actionPressed = s.action; return s; }
    const falling = ch.items.filter((i) => i.state === 'fall' && !i.hit);
    const bottle = falling.find((i) => i.kind === 'bottle');
    let tx;
    if (bottle) tx = ch.landX(bottle);
    else {
      tx = ch.cloud.x + (ch.cloud.x > 960 ? -320 : 320);
      for (const it of falling) {
        if (it.kind === 'scrap') continue;
        const lx = ch.landX(it);
        if (Math.abs(lx - y.x) < 190 && it.y > 380) tx = y.x + (y.x < lx ? -300 : 300);
      }
    }
    const dx = tx - y.x;
    s.x = Math.abs(dx) < 20 ? 0 : Math.max(-1, Math.min(1, dx / 80));
    // Hop the rocks in the way.
    for (const rx of [640, 1310]) if (Math.abs(rx - y.x) < 120 && Math.sign(rx - y.x) === Math.sign(s.x) && y.z === 0 && n % 3 === 0) s.actionPressed = true;
    return s;
  };
}

// Rolls about in a ball the whole time.
function roller(ch) {
  let dir = 1;
  return () => {
    const y = ch.yal;
    if (y.x > 1650) dir = -1;
    if (y.x < 270) dir = 1;
    return { ...idle, x: dir, sprint: true };
  };
}

function run(env, bot) {
  const ch = create(env);
  const p = bot(ch);
  let t = 0;
  while (!ch.done && t < 120) { ch.update(DT, p(), null); if (Math.round(t / DT) % 7 === 0) ch.draw(g, t); t += DT; }
  return ch;
}

test('chapter 6: following the bottle\'s shadow usually catches it', () => {
  let caught = 0;
  const N = 12;
  for (let seed = 1; seed <= N; seed++) {
    const ch = run(makeEnv({ seed, skill: 0.6 }), follower);
    if (ch.outcome === 'snatched') {
      caught++;
      assert.ok(ch.marks()[0] >= 1);
    }
  }
  assert.ok(caught >= N * 0.75, `caught ${caught}/${N}`);
});

test('chapter 6: staying rolled into a ball never catches it', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const ch = run(makeEnv({ seed, skill: 0.5 }), roller);
    assert.equal(ch.outcome, 'kept', `seed ${seed}`);
    assert.equal(ch.marks()[0], 0);
  }
});

test('chapter 6: standing still gets bonked, and is no way to catch it', () => {
  let kept = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const ch = run(makeEnv({ seed, skill: 0.7 }), () => () => idle);
    if (ch.outcome === 'kept') kept++;
  }
  assert.ok(kept >= 5, `kept ${kept}/6`);
});

test('chapter 6 versus: the holder must let the bottle go by 8 s left', () => {
  const ch = create(makeEnv({ versus: true, seed: 3 }));
  assert.ok(ch.queue.includes('bottle'));
  let dropped = null;
  let t = 0;
  // The holder never presses Action (the cloud still burps out junk).
  while (!ch.done && t < 120) {
    ch.update(DT, idle, idle);
    if (dropped === null && ch.items.some((i) => i.kind === 'bottle')) dropped = ch.time;
    t += DT;
  }
  assert.ok(dropped !== null, 'the bottle fell');
  assert.ok(dropped <= 8.1 && dropped > 6, `forced out at ${dropped}`);
});

test('chapter 6 versus: Action drops the front of the queue', () => {
  const ch = create(makeEnv({ versus: true, seed: 2 }));
  const first = ch.queue[0];
  ch.update(DT, idle, { ...idle, action: true, actionPressed: true });
  assert.equal(ch.items.length, 1);
  assert.equal(ch.items[0].kind, first);
  assert.ok(ch.items[0].y < GY);
});
