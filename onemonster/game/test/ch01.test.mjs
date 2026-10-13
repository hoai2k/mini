// Chapter 1 balance: a careful player who creeps from cover to cover and hides
// when an eye warns snatches with time to spare (the autopilot, and a slower
// child who reacts late and never sprints); a player who sprints straight at
// the mailbox through the open is spotted most of the time; the lookouts can
// never watch all the time; the ring drawn is the ring that sees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, idle, masher } from './harness.mjs';
import create, { COVER, MAILBOX, LOOKOUTS, HOWTO, inZone, zoneEllipse, atMailbox, autopilot } from '../src/chapters/ch01.js';

const DT = 1 / 30;
const inp = (x, y, o = {}) => ({ x, y, action: false, actionPressed: false, actionReleased: false, sprint: false, ...o });

// A child: the autopilot's choices, but each seen a third of a second late, and no sprinting.
function child(ch) {
  const queue = [];
  return () => {
    const want = autopilot(ch);
    queue.push({ ...want, sprint: false });
    return queue.length > 10 ? queue.shift() : inp(0, 0);
  };
}

function sprinter(ch) {
  return () => {
    const { tr } = ch;
    const dx = MAILBOX.grabX - 20 - tr.x, dy = MAILBOX.grabY + 10 - tr.y, d = Math.hypot(dx, dy) || 1;
    return atMailbox(tr.x, tr.y) ? inp(0, 0, { action: true, actionPressed: true }) : inp(dx / d, dy / d, { sprint: true });
  };
}

function run(ch, bot, holderBot = null) {
  let t = 0, spotted = 0, wasScuttle = false;
  while (!ch.done && t < 200) {
    ch.update(DT, bot(), holderBot ? holderBot() : null);
    const sc = ch.tr.mode === 'scuttle';
    if (sc && !wasScuttle) spotted++;
    wasScuttle = sc;
    t += DT;
  }
  return { outcome: ch.outcome, spare: ch.time / ch.total, spotted, marks: ch.marks() };
}

test('chapter 1: the autopilot snatches with time to spare at every skill', () => {
  const N = 30;
  for (const skill of [0.35, 0.55, 0.8]) {
    let wins = 0, spare = 0, three = 0;
    for (let seed = 1; seed <= N; seed++) {
      const ch = create(makeEnv({ seed, skill }));
      const r = run(ch, () => autopilot(ch));
      if (r.outcome === 'snatched') { wins++; spare += r.spare; if (r.marks[0] === 3) three++; }
    }
    console.log(`  autopilot, skill ${skill}: snatched ${wins}/${N}, mean spare ${(spare / Math.max(1, wins)).toFixed(2)}, three postmarks ${three}`);
    assert.ok(wins >= N * 0.9, `the autopilot wins (${wins}/${N})`);
    assert.ok(spare / wins > 0.4, 'with time to spare');
  }
});

test('chapter 1: a slow child who hides when the eye warns still wins most of the time', () => {
  const N = 30;
  for (const skill of [0.35, 0.55, 0.8]) {
    let wins = 0, spare = 0, spots = 0, one = 0;
    for (let seed = 1; seed <= N; seed++) {
      const ch = create(makeEnv({ seed, skill }));
      const r = run(ch, child(ch));
      if (r.outcome === 'snatched') { wins++; spare += r.spare; if (r.marks[0] >= 1) one++; }
      spots += r.spotted;
    }
    console.log(`  child, skill ${skill}: snatched ${wins}/${N}, mean spare ${(spare / Math.max(1, wins)).toFixed(2)}, spotted ${spots} times`);
    assert.ok(wins >= N * 0.8, `a child wins most of the time (${wins}/${N})`);
    assert.ok(spare / wins > 0.15, 'with time to spare');
  }
});

test('chapter 1: sprinting straight through the open gets spotted most of the time', () => {
  const N = 40;
  for (const skill of [0.35, 0.55, 0.8]) {
    let spottedRuns = 0, clean = 0;
    for (let seed = 1; seed <= N; seed++) {
      const ch = create(makeEnv({ seed, skill }));
      const r = run(ch, sprinter(ch));
      if (r.spotted > 0) spottedRuns++;
      if (r.outcome === 'snatched' && r.spotted === 0) clean++;
    }
    console.log(`  sprinter, skill ${skill}: spotted in ${spottedRuns}/${N} runs, clean dash ${clean}/${N}`);
    assert.ok(spottedRuns >= N * 0.65, `spotted most of the time (${spottedRuns}/${N})`);
  }
});

test('chapter 1: versus, the autopilot beats a mashing holder, who still earns a postmark for holding out', () => {
  const N = 20;
  let wins = 0, held = 0;
  for (let seed = 1; seed <= N; seed++) {
    const env = makeEnv({ seed, versus: true });
    const ch = create(env);
    const m = masher(env.rng);
    let i = 0;
    const r = run(ch, () => autopilot(ch), () => { i++; const h = m(); return { ...h, x: i % 25 === 0 ? 1 : 0, actionPressed: i % 9 === 0 }; });
    if (r.outcome === 'snatched') wins++;
    if (r.marks[1] >= 1) held++;
  }
  console.log(`  versus: snatched ${wins}/${N}, holder got a postmark in ${held}`);
  assert.ok(wins >= N * 0.8);
  assert.ok(held >= N * 0.5);
});

test('chapter 1: versus lookouts cannot watch all the time', () => {
  const ch = create(makeEnv({ versus: true }));
  // The holder mashes Action on whichever lookout is selected, cycling.
  let watched = 0, steps = 0, i = 0;
  while (!ch.done && steps < 40 * 30) {
    i++;
    const inH = { x: i % 20 === 0 ? 1 : 0, y: 0, action: true, actionPressed: i % 3 === 0, actionReleased: false, sprint: false };
    ch.update(DT, idle, inH);
    if (ch.look[1].state === 'look') watched++;
    steps++;
  }
  const frac = watched / steps;
  console.log(`  Sally Ann's stretch watched ${(frac * 100).toFixed(0)}% of the time at most`);
  assert.ok(frac < 0.45, 'rest after each look');
});

test('chapter 1: the ring drawn is the ring that sees', () => {
  for (const L of LOOKOUTS) {
    const e = zoneEllipse(L);
    assert.ok(inZone(L, e.cx, e.cy), 'centre is inside');
    const x = e.cx + e.rx * 0.8, y = e.cy - e.ry * 0.7;
    assert.ok(x > L.zone[0] && x < L.zone[1]);
    assert.ok(!inZone(L, x, y), `${L.id}: outside the drawn ring is unseen`);
  }
  // Every cover and the mailbox lie in some lookout's ring, and the rings overlap: no blind path.
  for (const k of [...COVER, { x: MAILBOX.grabX, y: MAILBOX.grabY }]) assert.ok(LOOKOUTS.some((L) => inZone(L, k.x, k.y)), `watched at ${k.x}`);
  // In play: frozen just outside the ring while it looks, he is never judged.
  for (let seed = 1; seed <= 20; seed++) {
    const ch = create(makeEnv({ seed, skill: 0.8 }));
    const L = ch.look[2], e = zoneEllipse(L);
    ch.tr.cover = null;
    ch.tr.x = e.cx - e.rx * 0.85; ch.tr.y = 805;
    assert.ok(!inZone(L, ch.tr.x, ch.tr.y) && !inZone(ch.look[1], ch.tr.x, ch.tr.y));
    ch.update(DT, idle, null);
    L.state = 'ready'; ch.press(2);
    for (let i = 0; i < 90; i++) ch.update(DT, idle, null);
    assert.equal(ch.tr.mode, 'free', 'not snagged from outside the ring');
  }
});

test('chapter 1: ducking in cover is safe, moving in the open while looked at is not', () => {
  const ch = create(makeEnv({ seed: 5, skill: 0.5 }));
  // In the neighbour's ring, standing in the first bush and ducking.
  const L = ch.look[0];
  L.state = 'look'; L.lookFor = L.t = 1.5; L.grace = 0; L.judged = false;
  for (let i = 0; i < 30; i++) ch.update(DT, inp(0, 0, { action: true }), null);
  assert.equal(ch.tr.mode, 'free', 'ducked in a bush, unseen');
  assert.ok(ch.tr.ducking);
  // Out in the open, creeping, while she looks: spotted and sent back.
  const ch2 = create(makeEnv({ seed: 6, skill: 0.5 }));
  ch2.tr.x = 320; ch2.tr.y = 900; ch2.tr.cover = null;
  ch2.update(DT, inp(1, 0), null);
  const L2 = ch2.look[0];
  L2.state = 'look'; L2.lookFor = L2.t = 1.5; L2.grace = 0; L2.judged = false;
  ch2.update(DT, inp(1, 0), null);
  assert.equal(ch2.tr.mode, 'scuttle', 'creeping in plain view is spotted');
  assert.equal(ch2.spots, 1);
  for (let i = 0; i < 60; i++) ch2.update(DT, idle, null);
  assert.equal(ch2.tr.mode, 'free');
  assert.equal(ch2.tr.cover, COVER[0], 'and he scuttles back to the last cover');
});

test('chapter 1: the mailman arrives as the clock runs out, and the grab needs the mailbox', () => {
  const ch = create(makeEnv({ seed: 2 }));
  ch.update(DT, inp(0, 0, { actionPressed: true, action: true }), null);
  assert.ok(!ch.done, 'pressing Action far from the mailbox does nothing');
  const x0 = ch.mailX;
  for (let i = 0; i < 30 * 44; i++) ch.update(DT, idle, null);
  assert.ok(ch.mailX > x0 + 1200, 'the mailman has crossed the lane');
  for (let i = 0; i < 60; i++) ch.update(DT, idle, null);
  assert.ok(ch.done && ch.outcome === 'kept');
  assert.deepEqual(ch.marks(), [0, 3]);
});

test('chapter 1: the how-to page has three captioned steps', () => {
  assert.equal(HOWTO.length, 3);
  for (const st of HOWTO) {
    assert.ok(st.text.length > 10 && st.items.length >= 3);
    for (const it of st.items) if (it.creature) assert.equal(it.creature, 'trollusk');
  }
});
