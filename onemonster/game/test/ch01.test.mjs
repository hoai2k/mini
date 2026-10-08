// Chapter 1 balance: a patient player who creeps from cover to cover while the
// lookouts rest can snatch with time to spare; a player who sprints straight
// at the mailbox through the open is spotted most of the time; the lookouts
// can never watch all the time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, idle } from './harness.mjs';
import create, { COVER, MAILBOX } from '../src/chapters/ch01.js';

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
