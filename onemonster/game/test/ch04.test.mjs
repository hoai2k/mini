// Chapter 4 (the Ice-Ferg strikes the Peg): the charge rewards planning.
// A bot that gets ahead of the Peg, huffs while it coasts in and charges at
// where the boat will be usually strikes it; a bot that charges blindly in
// random directions usually does not. The AI captain gets the boat home when
// left alone, and a captain in versus can steer and steam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubContext, makeEnv, idle } from './harness.mjs';
import create, { chargeReach, TUNE } from '../src/chapters/ch04.js';

const g = stubContext();
const DT = 1 / 30;

function run(ch, botS, botH = () => null, draw = false) {
  let t = 0;
  while (!ch.done && t < 120) {
    ch.update(DT, botS(ch, t), botH(ch, t));
    if (draw && Math.round(t / DT) % 10 === 0) ch.draw(g, t);
    t += DT;
  }
  return ch;
}

const inp = (x, y, action, prev) => ({ x, y, sprint: false, action, actionPressed: action && !prev, actionReleased: !action && prev });

// Plans ahead: gets in front of the boat, huffs on the way in, leads the aim.
function smartBot() {
  let held = false;
  return (ch) => {
    const { ferg, peg } = ch;
    const dx = peg.x - ferg.x, dy = peg.y - ferg.y, d = Math.hypot(dx, dy);
    const ahead = { x: peg.x + Math.cos(peg.hd) * 180, y: peg.y + Math.sin(peg.hd) * 180 };
    let mx = ahead.x - ferg.x, my = ahead.y - ferg.y;
    let action = false;
    if (ferg.mode === 'drift' || ferg.mode === 'huff') {
      if (d < 560) action = true; // huff while closing in
      if (ferg.mode === 'huff') {
        const sp = TUNE.ferg.chargeMin + TUNE.ferg.chargeAdd * ferg.fury;
        const lead = d / sp;
        mx = peg.x + peg.vx * lead - ferg.x;
        my = peg.y + peg.vy * lead - ferg.y;
        const reach = chargeReach(ferg.fury);
        if ((ferg.fury >= 0.6 && d < reach * 0.7) || (ferg.fury >= 1 && d < reach * 0.85)) action = false;
      }
    }
    const m = Math.hypot(mx, my) || 1;
    const out = inp(mx / m, my / m, action, held);
    held = action;
    return out;
  };
}

// Mashes: random direction, short huffs, lets go whenever.
function spamBot(rng) {
  let held = false, x = 0, y = 0, hold = 0, huff = 0;
  return () => {
    hold -= DT;
    if (hold <= 0) {
      hold = 0.6 + rng() * 1.2;
      const a = rng() * Math.PI * 2;
      x = Math.cos(a); y = Math.sin(a);
    }
    huff -= DT;
    if (huff <= -0.3) huff = 0.25 + rng() * 0.8;
    const action = huff > 0;
    const out = inp(x, y, action, held);
    held = action;
    return out;
  };
}

function rate(makeBot, n = 40, opts = {}) {
  let wins = 0, bonus = 0;
  for (let seed = 1; seed <= n; seed++) {
    const env = makeEnv({ seed, ...opts });
    const ch = run(create(env), makeBot(env));
    if (ch.outcome === 'snatched') wins++;
    if (ch.bonus) bonus++;
  }
  return { wins: wins / n, bonus: bonus / n };
}

test('chapter 4: planning ahead and charging at the right moment usually strikes the Peg', () => {
  const r = rate(() => smartBot());
  console.log('smart bot strike rate', r);
  assert.ok(r.wins >= 0.7, `smart bot won ${r.wins}`);
});

test('chapter 4: charging blindly usually fails', () => {
  const r = rate((env) => spamBot(env.rng));
  console.log('spam bot strike rate', r);
  assert.ok(r.wins <= 0.35, `spam bot won ${r.wins}`);
});

test('chapter 4: a skilled captain dodges more than a clumsy one', () => {
  const lo = rate(() => smartBot(), 30, { skill: 0 });
  const hi = rate(() => smartBot(), 30, { skill: 1 });
  console.log('smart bot vs skill 0 / 1', lo.wins, hi.wins);
  assert.ok(lo.wins >= hi.wins);
});

test('chapter 4: left alone, the Peg reaches the harbour before the clock runs out', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const ch = create(makeEnv({ seed }));
    let t = 0;
    while (!ch.done) { ch.update(DT, idle, null); t += DT; }
    assert.equal(ch.outcome, 'kept');
    assert.ok(ch.time > 0, `seed ${seed} arrived with ${ch.time.toFixed(1)} s left`);
    assert.deepEqual(ch.marks(), [0, 3]);
  }
});

test('chapter 4: in versus the captain steers, and steam shoves the boat', () => {
  const ch = create(makeEnv({ versus: true }));
  const x0 = ch.peg.x;
  for (let i = 0; i < 60; i++) ch.update(DT, idle, inp(1, 0, false, false));
  assert.ok(ch.peg.x > x0 + 20, 'turned right and moved');
  const cd = ch.peg.steamCd;
  ch.update(DT, idle, inp(1, 0, true, false));
  assert.ok(ch.peg.steamCd > cd && ch.peg.nvx > 100, 'steam burst');
  ch.update(DT, idle, inp(1, 0, false, true));
  const nvx = ch.peg.nvx;
  ch.update(DT, idle, inp(1, 0, true, false));
  assert.ok(ch.peg.nvx <= nvx, 'steam must build up again');
});

test('chapter 4: a straight-line captain in versus is not unbeatable, nor a sure thing', () => {
  // The captain heads straight for the harbour, steaming away from charges.
  const captain = () => {
    let held = false;
    return (ch) => {
      const { peg, ferg, HARBOUR } = ch;
      let x = HARBOUR.x - peg.x, y = HARBOUR.y - peg.y;
      let action = false;
      if (ferg.mode === 'charge') {
        const s = Math.sign(ferg.cdx * (peg.y - ferg.y) - ferg.cdy * (peg.x - ferg.x)) || 1;
        x = -ferg.cdy * s; y = ferg.cdx * s; action = true;
      }
      const m = Math.hypot(x, y) || 1;
      const o = inp(x / m, y / m, action, held);
      held = action;
      return o;
    };
  };
  let wins = 0;
  const n = 30;
  for (let seed = 1; seed <= n; seed++) {
    const env = makeEnv({ seed, versus: true });
    const ch = run(create(env), smartBot(), captain());
    if (ch.outcome === 'snatched') wins++;
  }
  console.log('smart bot vs straight captain', wins / n);
  assert.ok(wins / n > 0.2 && wins / n < 0.95, `rate ${wins / n}`);
});

test('chapter 4: bumping rowing boats costs sea lions, and losing them all dazes it', () => {
  const ch = create(makeEnv());
  const b = ch.rowboats[0];
  b.wait = 0; b.alpha = 1;
  let lost = 0;
  for (let i = 0; i < 3; i++) {
    b.bump = 0;
    ch.ferg.x = b.x; ch.ferg.y = b.y; ch.ferg.mode = 'drift';
    ch.update(DT, idle, null);
    lost++;
  }
  assert.equal(ch.ferg.lions, 0);
  assert.equal(ch.ferg.mode, 'dazed');
  run(ch, () => idle);
  assert.ok(ch.done);
});
