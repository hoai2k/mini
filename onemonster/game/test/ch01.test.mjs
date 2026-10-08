// Chapter 1 balance: a patient player who creeps from cover to cover while the
// lookouts rest can snatch with time to spare; a player who sprints straight
// at the mailbox through the open is spotted most of the time; the lookouts
// can never watch all the time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, idle } from './harness.mjs';
import create, { COVER, MAILBOX, inZone } from '../src/chapters/ch01.js';

const DT = 1 / 30;
const inp = (x, y, o = {}) => ({ x, y, action: false, actionPressed: false, actionReleased: false, sprint: false, ...o });

// Watches the eye warnings and the rest clocks, as a careful child would.
function patientBot(ch) {
  return () => {
    const { tr, look } = ch;
    const atBox = Math.hypot(tr.x - MAILBOX.grabX, (tr.y - MAILBOX.grabY) * 0.6) < MAILBOX.grabR - 10;
    if (atBox) return inp(0, 0, { actionPressed: true, action: true });
    // Next stop: the first cover ahead, else the mailbox.
    const next = COVER.find((k) => k.x > tr.x + 40) || { x: MAILBOX.grabX - 30, y: MAILBOX.grabY + 10 };
    const covers = (L) => L.zone[1] >= Math.min(tr.x, next.x) && L.zone[0] <= Math.max(tr.x, next.x);
    const threat = look.some((L) => covers(L) && (L.state === 'warn' || L.state === 'look'));
    const soon = look.some((L) => covers(L) && L.state === 'ready');
    if (tr.cover) {
      if (threat || soon) return inp(0, 0, { action: true }); // duck and wait
    } else if (threat) {
      // Caught out by a warning: make for the nearest cover if it is close, else freeze.
      const near = [...COVER].sort((a, b) => Math.abs(a.x - tr.x) - Math.abs(b.x - tr.x))[0];
      const warnLeft = Math.min(...look.filter((L) => covers(L) && L.state === 'warn').map((L) => L.t));
      if (Number.isFinite(warnLeft) && Math.abs(near.x - tr.x) - near.rx * 0.8 < warnLeft * 160) {
        const dx = near.x - tr.x, dy = near.y - tr.y, d = Math.hypot(dx, dy) || 1;
        return inp(dx / d, dy / d);
      }
      return idle;
    }
    const dx = next.x - tr.x, dy = next.y - tr.y, d = Math.hypot(dx, dy) || 1;
    return inp(dx / d, dy / d);
  };
}

function sprinter(ch) {
  return () => {
    const { tr } = ch;
    const dx = MAILBOX.grabX - 20 - tr.x, dy = MAILBOX.grabY + 10 - tr.y, d = Math.hypot(dx, dy) || 1;
    const atBox = Math.hypot(tr.x - MAILBOX.grabX, (tr.y - MAILBOX.grabY) * 0.6) < MAILBOX.grabR - 10;
    return atBox ? inp(0, 0, { action: true, actionPressed: true }) : inp(dx / d, dy / d, { sprint: true });
  };
}

function run(ch, bot) {
  let t = 0, spotted = 0, wasScuttle = false, firstSpot = null;
  while (!ch.done && t < 200) {
    ch.update(DT, bot(), null);
    const sc = ch.tr.mode === 'scuttle';
    if (sc && !wasScuttle) { spotted++; if (firstSpot === null) firstSpot = t; }
    wasScuttle = sc;
    t += DT;
  }
  return { outcome: ch.outcome, spare: ch.time / ch.total, spotted, firstSpot, marks: ch.marks() };
}

test('chapter 1: a patient creeper snatches with time to spare', () => {
  const N = 30;
  for (const skill of [0.35, 0.55, 0.8]) {
    let wins = 0, spare = 0, spots = 0, two = 0;
    for (let seed = 1; seed <= N; seed++) {
      const ch = create(makeEnv({ seed, skill }));
      const r = run(ch, patientBot(ch));
      if (r.outcome === 'snatched') { wins++; spare += r.spare; if (r.marks[0] >= 2) two++; }
      spots += r.spotted;
    }
    console.log(`  patient, skill ${skill}: snatched ${wins}/${N}, mean spare ${(spare / Math.max(1, wins)).toFixed(2)}, 2+ postmarks ${two}, spotted ${spots} times`);
    assert.ok(wins >= N * 0.8, `patient player wins most (${wins}/${N})`);
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

test('chapter 1: the ring drawn is the ring that sees', async () => {
  const { LOOKOUTS, inZone, zoneEllipse } = await import('../src/chapters/ch01.js');
  for (const L of LOOKOUTS) {
    const e = zoneEllipse(L);
    assert.ok(inZone(L, e.cx, e.cy), 'centre is inside');
    // Just above the ring, near the end of its stretch (inside the old x-only test): not seen.
    const x = e.cx + e.rx * 0.8, y = e.cy - e.ry * 0.7;
    assert.ok(x > L.zone[0] && x < L.zone[1]);
    assert.ok(!inZone(L, x, y), `${L.id}: outside the drawn ring is unseen`);
  }
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

test('chapter 1: the dash gets him out of a warned ring, but not out of a look', () => {
  const ch = create(makeEnv({ seed: 3, skill: 0.5 }));
  // Out in the open between bushes, in the neighbour's ring.
  ch.tr.x = 620; ch.tr.y = 900;
  for (let i = 0; i < 3; i++) ch.update(DT, idle, null);
  const x0 = ch.tr.x;
  ch.update(DT, inp(1, 0, { action: true, actionPressed: true }), null);
  for (let i = 0; i < 10; i++) ch.update(DT, inp(1, 0, { action: true }), null);
  const moved = ch.tr.x - x0;
  assert.ok(moved > 180, `a dash covers ground fast (${moved.toFixed(0)} px in a third of a second)`);
  // On cooldown: a second press does nothing.
  const x1 = ch.tr.x;
  ch.update(DT, inp(-1, 0, { actionPressed: true, action: true }), null);
  ch.update(DT, idle, null);
  assert.ok(Math.abs(ch.tr.x - x1) < 40, 'the dash needs to recharge');
  assert.ok(ch.alert > 0.05, 'and it is loud');
  // Dashing while a lookout is looking at him: heard.
  const ch2 = create(makeEnv({ seed: 4, skill: 0.5 }));
  ch2.tr.x = 350; ch2.tr.y = 900; ch2.tr.cover = null;
  ch2.update(DT, idle, null);
  const L = ch2.look[0];
  L.state = 'look'; L.lookFor = L.t = 1.5; L.grace = 0; L.survived = true; L.judged = true;
  ch2.update(DT, inp(1, 0, { actionPressed: true, action: true }), null);
  ch2.update(DT, inp(1, 0, { action: true }), null);
  assert.equal(ch2.tr.mode, 'scuttle', 'a dash in plain view is heard');
});

// Dash toward the mailbox whenever it is ready, versus creep and dash only out of a warned ring.
function dasher(ch, smart) {
  let prev = false;
  return () => {
    const { tr, look } = ch;
    const atBox = Math.hypot(tr.x - MAILBOX.grabX, (tr.y - MAILBOX.grabY) * 0.6) < MAILBOX.grabR - 10;
    if (atBox) return inp(0, 0, { action: true, actionPressed: true });
    const dx = MAILBOX.grabX - 20 - tr.x, dy = MAILBOX.grabY + 10 - tr.y, d = Math.hypot(dx, dy) || 1;
    if (!smart) { prev = !prev; return inp(dx / d, dy / d, { action: prev, actionPressed: prev && tr.dashCd <= 0 }); }
    if (look.some((L) => L.state === 'look' && inZone(L, tr.x, tr.y))) return tr.cover ? inp(0, 0, { action: true }) : idle;
    if (look.some((L) => L.state === 'warn' && inZone(L, tr.x, tr.y))) {
      if (tr.cover) return inp(0, 0, { action: true });
      return tr.dashCd <= 0 ? inp(1, 0, { action: true, actionPressed: true }) : idle;
    }
    return inp(dx / d, dy / d);
  };
}

test('chapter 1: dashing out of warned rings beats spamming the dash', () => {
  const N = 30;
  for (const skill of [0.35, 0.8]) {
    const score = (smart) => {
      let mk = 0, spots = 0;
      for (let seed = 1; seed <= N; seed++) {
        const ch = create(makeEnv({ seed, skill }));
        run(ch, dasher(ch, smart));
        mk += ch.marks()[0]; spots += ch.spots;
      }
      return { mk: mk / N, spots: spots / N };
    };
    const spam = score(false), smart = score(true);
    console.log(`  skill ${skill}: dash spam ${spam.mk.toFixed(2)} postmarks (${spam.spots.toFixed(1)} spots), careful dashes ${smart.mk.toFixed(2)} (${smart.spots.toFixed(1)} spots)`);
    assert.ok(spam.mk <= 2.05, 'spamming the dash never earns the unseen postmark');
    assert.ok(smart.mk > spam.mk + 0.4, 'timing the dash pays');
  }
});
