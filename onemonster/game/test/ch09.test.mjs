// Chapter 9 (FLIP-FLOP): the net's reach is what it catches, the Bombanat in
// the ferns can be netted ferns and all, a trip is telegraphed by a crouch and
// only the dive trips, the versus hand-over is announced, and the autopilot
// posts the letter with time to spare while one-trick play does worse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, stubContext } from './harness.mjs';
import { aiHolder } from '../src/chase.js';
import ch09, { autopilot, HOWTO } from '../src/chapters/ch09.js';

const DT = 1 / 30;
const len = Math.hypot;
const toward = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, d = len(dx, dy) || 1; return { x: dx / d, y: dy / d, d }; };

function play(bot, seed, skill, { versus = false, holder = null } = {}) {
  const env = makeEnv({ seed, skill, versus });
  const ch = ch09(env);
  const b = {};
  let t = 0;
  while (!ch.done && t < 100) { ch.update(DT, bot(ch, b, DT), holder ? holder(ch, b, DT) : null); t += DT; }
  return { won: ch.outcome === 'snatched', marks: ch.marks()[0], left: ch.time, ch };
}

function score(bot, { n = 24, seed = 500, skill = 0.6 } = {}) {
  let won = 0, marks = 0, left = 0;
  for (let i = 0; i < n; i++) {
    const r = play(bot, seed + i * 13, skill);
    if (r.won) { won++; left += r.left; }
    marks += r.marks;
  }
  return { rate: won / n, marks: marks / n, left: won ? left / won : 0 };
}

const auto = (ch, b, dt) => autopilot(ch, dt);
const carryTarget = (ch) => ch.letter || ch.mail;
// Swings the net all the time, walking straight at the target.
const netSpam = (ch, b) => {
  const c = ch.chase, g = c.s;
  b.f = !b.f;
  if (c.tug) return { x: -Math.sign(c.h.x - g.x), actionPressed: b.f };
  const tg = toward(g, ch.phase === 'net' ? (c.h.hidden ? c.lastSeen : c.h) : carryTarget(ch));
  return { x: tg.x, y: tg.y, actionPressed: b.f };
};
// Pole-vaults whenever it can.
const vaultSpam = (ch, b) => {
  const c = ch.chase, g = c.s;
  b.f = !b.f;
  if (c.tug) return { x: -Math.sign(c.h.x - g.x), actionPressed: b.f };
  const tg = toward(g, ch.phase === 'net' ? (c.h.hidden ? c.lastSeen : c.h) : carryTarget(ch));
  return { x: tg.x, y: tg.y, sprint: b.f, actionPressed: b.f && tg.d < 110 && (ch.phase === 'net' || !ch.letter) };
};

test('chapter 9: the autopilot posts the letter with time to spare; spamming the net or the vault does worse', () => {
  for (const skill of [0.55, 0.75]) {
    const good = score(auto, { skill });
    assert.ok(good.rate >= 0.85, `skill ${skill}: autopilot posts ${good.rate}`);
    assert.ok(good.left > 25, `skill ${skill}: time left ${good.left}`);
    assert.ok(good.marks >= 2.5, `skill ${skill}: postmarks ${good.marks}`);
  }
  const good = score(auto, { skill: 0.6 });
  const net = score(netSpam, { skill: 0.6 });
  const vault = score(vaultSpam, { skill: 0.6 });
  assert.ok(net.left < good.left - 4, `net-spam is slower: ${net.left} s left vs ${good.left}`);
  assert.ok(vault.rate <= good.rate - 0.4, `vault-spam posts ${vault.rate} vs ${good.rate}`);
});

test('chapter 9: the net catches what stands in its drawn reach, and nothing outside it', () => {
  const env = makeEnv({ seed: 3, versus: true });
  const ch = ch09(env);
  const { s, h } = ch.chase;
  const r = ch.reach();
  assert.ok(r.x > s.x && r.rx > 0, 'the reach lies in front of him');
  // Just inside the far edge: netted.
  h.x = r.x + r.rx - 20; h.y = r.y;
  assert.ok(ch.inReach(h));
  ch.update(DT, { actionPressed: true }, {});
  assert.equal(s.mode, 'windup', 'the wind-up first');
  for (let t = 0; t < 0.6 && !ch.chase.tug; t += DT) ch.update(DT, {}, {});
  assert.ok(ch.chase.tug, 'in the net: the tug begins');
  // Just outside: the net slams the ground and he must recover.
  const env2 = makeEnv({ seed: 3, versus: true });
  const ch2 = ch09(env2);
  const r2 = ch2.reach();
  ch2.chase.h.x = r2.x + r2.rx + 40; ch2.chase.h.y = r2.y;
  assert.ok(!ch2.inReach(ch2.chase.h));
  ch2.update(DT, { actionPressed: true }, {});
  for (let t = 0; t < 0.6; t += DT) ch2.update(DT, {}, {});
  assert.ok(!ch2.chase.tug);
  assert.equal(ch2.chase.s.mode, 'slam');
  assert.ok(!ch2.canSwing(), 'no swing while he picks the net up');
});

test('chapter 9: a Bombanat hiding in the ferns is netted, ferns and all', () => {
  const env = makeEnv({ seed: 8, skill: 0.6 });
  const ch = ch09(env);
  const { s, h } = ch.chase;
  const fern = ch.chase.cover[0];
  s.x = fern.x - 300; s.y = fern.y; s.facing = 1;
  h.x = fern.x; h.y = fern.y;
  // Let it settle: still, in cover, it is hidden.
  for (let t = 0; t < 1; t += DT) { h.x = fern.x; h.y = fern.y; h.vx = h.vy = 0; ch.update(DT, {}, null); if (h.hidden) break; }
  assert.ok(h.hidden, 'hidden in the ferns');
  assert.ok(ch.inReach(h), 'the ferns are in the net\'s reach');
  ch.update(DT, { actionPressed: true }, null);
  for (let t = 0; t < 0.6 && !ch.chase.tug; t += DT) ch.update(DT, {}, null);
  assert.ok(ch.chase.tug, 'caught in the ferns');
  assert.ok(!h.hidden);
});

// Net it (stand next to it, swing, win the tug) to get to the carry phase.
function netIt(ch, inH = {}) {
  const { s, h } = ch.chase;
  h.x = s.x + 120; h.y = s.y; s.facing = 1;
  let f = 0;
  for (let t = 0; t < 10 && ch.phase === 'net'; t += DT) ch.update(DT, { actionPressed: f++ % 4 === 0 }, inH);
  assert.equal(ch.phase, 'carry');
}

test('chapter 9: a trip is telegraphed by a crouch, and only the dive trips him; a bump does not', () => {
  const env = makeEnv({ seed: 21, versus: true });
  const ch = ch09(env);
  netIt(ch);
  const { s } = ch.chase;
  const tro = ch.others[0];
  // Run into him without diving: no trip.
  tro.cool = 0;
  for (let t = 0; t < 2; t += DT) {
    tro.x = s.x + 30; tro.y = s.y;
    ch.update(DT, {}, { x: -1, y: 0 });
    assert.notEqual(s.mode, 'trip', 'a bump is not a trip');
  }
  // Dive: the crouch comes first, long enough to read, then the slide, then the trip.
  tro.x = s.x + 200; tro.y = s.y; tro.cool = 0;
  ch.update(DT, {}, { actionPressed: true });
  assert.equal(tro.mode, 'peek', 'the telegraph');
  let peekT = 0;
  while (tro.mode === 'peek' && peekT < 2) { ch.update(DT, {}, {}); peekT += DT; }
  assert.ok(peekT >= 0.4, `the crouch lasts ${peekT} s`);
  assert.equal(tro.mode, 'slide');
  for (let t = 0; t < 1 && s.mode !== 'trip'; t += DT) ch.update(DT, {}, {});
  assert.equal(s.mode, 'trip');
  assert.ok(ch.letter, 'the letter is on the ground');
});

test('chapter 9: versus, the hand-over to the Trollusk is announced on screen', () => {
  const env = makeEnv({ seed: 5, versus: true });
  const ch = ch09(env);
  assert.equal(ch.banner, null);
  netIt(ch);
  assert.ok(ch.banner && /Trollusk/.test(ch.banner.text), 'a banner names the new role');
  // The human now steers the Trollusk.
  const tro = ch.others[0];
  const x0 = tro.x;
  for (let t = 0; t < 1; t += DT) ch.update(DT, {}, { x: 1, y: 0 });
  assert.ok(tro.x > x0 + 50, 'the Trollusk moves with the holder\'s stick');
});

test('chapter 9: the computer Trollusk crouches before it dives, so a child can see it coming', () => {
  // Over a few seeds against a Grithix who just walks for the mailbox, every
  // trip was preceded by a crouch of the one who tripped him.
  let trips = 0;
  for (const seed of [31, 32, 33, 34, 35, 36]) {
    const env = makeEnv({ seed, skill: 0.7 });
    const ch = ch09(env);
    netIt(ch, null);
    const { s } = ch.chase;
    const seen = new Map();
    for (let t = 0; t < 30 && !ch.done; t += DT) {
      for (const o of ch.others) if (o.mode === 'peek') seen.set(o, t);
      const tg = toward(s, ch.letter || ch.mail);
      const was = s.mode;
      ch.update(DT, { x: tg.x, y: tg.y, actionPressed: !ch.letter && tg.d < 120 }, null);
      if (s.mode === 'trip' && was !== 'trip') {
        trips++;
        const by = ch.others.find((o) => o.mode === 'sprawl');
        assert.ok(by && seen.has(by) && t - seen.get(by) < 1.5, `seed ${seed}: the trip followed a crouch`);
      }
    }
  }
  assert.ok(trips >= 1, `some trips happened (${trips})`);
});

test('chapter 9: netting the Trollusk or the Yalapappus jars them for a while and counts toward the bonus', () => {
  const env = makeEnv({ seed: 4, versus: true });
  const ch = ch09(env);
  const { s } = ch.chase;
  const r = ch.reach();
  const yal = ch.others[1];
  yal.x = r.x; yal.y = r.y; yal.vx = yal.vy = 0;
  yal.goal = { x: r.x, y: r.y }; yal.until = 99; yal.T = 0; // stays put
  yal.sawWindup = true; // and doesn't hop aside this time
  ch.update(DT, { actionPressed: true }, {});
  for (let t = 0; t < 0.6 && yal.mode !== 'jar'; t += DT) ch.update(DT, {}, {});
  assert.equal(yal.mode, 'jar');
  assert.equal(ch.bonus, 1);
  assert.equal(s.mode, 'move', 'a swing that lands needs no recovery');
});

test('chapter 9: the how-to page has three steps composed from the art, and the chapter draws every phase', () => {
  assert.equal(HOWTO.length, 3);
  for (const st of HOWTO) { assert.ok(st.text.length > 10 && st.items.length >= 3 && st.scene); }
  const g = stubContext();
  for (const versus of [false, true]) {
    const r = play(auto, 77, 0.6, { versus, holder: versus ? (ch, b, dt) => (ch.phase === 'net' ? aiHolder(ch.chase, b, 0.6, dt) : { x: -1, actionPressed: true }) : null });
    for (let i = 0; i < 30; i++) { r.ch.update(DT, {}, versus ? {} : null); r.ch.draw(g, i * DT); }
    assert.equal(typeof r.ch.hud(), 'string');
  }
});
