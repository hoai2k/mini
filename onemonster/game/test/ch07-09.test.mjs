// Chapters 7, 8 and 9 have no button that always wins (design.md, "Chases"):
// a bot playing sensibly can win, and a one-trick bot (always sprinting,
// always lunging, always swinging the net, always vaulting) does clearly worse.
// Each bot plays the human snatcher against the chapter's own computer holder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, stubContext } from './harness.mjs';
import { aiSnatcher } from '../src/chase.js';
import ch07 from '../src/chapters/ch07.js';
import ch08 from '../src/chapters/ch08.js';
import ch09, { autopilot as autopilot09 } from '../src/chapters/ch09.js';

const DT = 1 / 30;
const len = Math.hypot;
const toward = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, d = len(dx, dy) || 1; return { x: dx / d, y: dy / d, d }; };

function play(create, bot, seed, skill) {
  const env = makeEnv({ seed, skill });
  const ch = create(env);
  const b = {};
  let t = 0;
  while (!ch.done && t < 100) { ch.update(DT, bot(ch, b, DT), null); t += DT; }
  return { won: ch.outcome === 'snatched', marks: ch.marks()[0], ch };
}

function score(create, bot, { n = 30, seed = 100, skill = 0.6 } = {}) {
  let won = 0, marks = 0;
  for (let i = 0; i < n; i++) {
    const r = play(create, bot, seed + i * 13, skill);
    if (r.won) won++;
    marks += r.marks;
  }
  return { rate: won / n, marks: marks / n };
}

// ---------- chapter 7: the Trollusk sneaks up, snatches, and gets away ----------

function mash(b, away) {
  const p = b.t - (b.last || -1) > 0.14;
  if (p) b.last = b.t;
  return { x: away, y: 0, actionPressed: p };
}

// Freezes when the Yalapappus looks round, runs and hides when spotted, then
// paces the getaway: sprints only to answer his roll, dodges his hops.
const sensible07 = (ch, b, dt) => {
  b.t = (b.t || 0) + dt;
  const c = ch.chase, y = c.s, h = c.h;
  if (c.tug) return mash(b, Math.sign(h.x - y.x) || 1);
  const dx = y.x - h.x, dy = y.y - h.y, d = len(dx, dy) || 1;
  if (ch.phase === 'sneak') {
    if (ch.look === 'warn' || ch.look === 'look') {
      b.seen = (b.seen || 0) + dt;
      if (b.seen > 0.25 || ch.look === 'look') return { x: 0, y: 0 };
    } else b.seen = 0;
    if (ch.look === 'alarm') return { x: -dx / d, y: -dy / d, sprint: d < 320 && h.st > 0.3, actionPressed: y.mode === 'lunge' && d < 260 && h.cool <= 0 };
    if (d < 120) return { x: 0, y: 0, actionPressed: true };
    return { x: dx / d, y: dy / d };
  }
  const ex = 4400 - h.x, ey = 930 - h.y, ed = len(ex, ey) || 1;
  const out = { x: ex / ed, y: ey / ed, sprint: (y.sprinting || d < 260) && h.st > 0.55 };
  b.r = ((b.r || 7) * 9301 + 49297) % 233280;
  if (y.mode === 'lunge' && d < 280 && h.cool <= 0 && b.r / 233280 < 0.55) { out.actionPressed = true; out.x = 0; out.y = -dy / d; }
  return out;
};
// Sprints everywhere: straight at him, and straight for the way out.
const sprinter07 = (ch, b, dt) => {
  b.t = (b.t || 0) + dt;
  const c = ch.chase, y = c.s, h = c.h;
  if (c.tug) return mash(b, Math.sign(h.x - y.x) || 1);
  const dx = y.x - h.x, dy = y.y - h.y, d = len(dx, dy) || 1;
  if (ch.phase === 'sneak') return { x: dx / d, y: dy / d, sprint: true, actionPressed: d < 120 };
  const ex = 4400 - h.x, ey = 930 - h.y, ed = len(ex, ey) || 1;
  return { x: ex / ed, y: ey / ed, sprint: true };
};

test('chapter 7: a sensible Trollusk gets away; one who always sprints is caught', () => {
  const good = score(ch07, sensible07, { skill: 0.65 });
  const spr = score(ch07, sprinter07, { skill: 0.65 });
  assert.ok(good.rate >= 0.7, `sensible wins ${good.rate}`);
  assert.ok(spr.rate <= good.rate - 0.4, `always-sprint wins ${spr.rate} vs ${good.rate}`);
  assert.ok(spr.marks < good.marks, `postmarks ${spr.marks} vs ${good.marks}`);
});

test('chapter 7: moving while he looks round gets you spotted', () => {
  // Pace about in the open, never freezing: he spots you on his first look.
  for (const seed of [3, 4, 5]) {
    const ch = ch07(makeEnv({ seed, skill: 0.6 }));
    let spotted = false;
    for (let t = 0; t < 12 && !spotted; t += DT) {
      ch.update(DT, { x: Math.sin(t * 2) > 0 ? 1 : -1, y: 0 }, null);
      if (ch.look === 'alarm') spotted = true;
    }
    assert.ok(spotted, `seed ${seed}`);
    // ...whereas standing still through a look is safe.
    const still = ch07(makeEnv({ seed, skill: 0.6 }));
    for (let t = 0; t < 12; t += DT) { still.update(DT, {}, null); assert.notEqual(still.look, 'alarm'); }
  }
});

test('chapter 7: versus, the holder looks round with Action', () => {
  const env = makeEnv({ seed: 5, versus: true });
  const ch = ch07(env);
  for (let t = 0; t < 1.5; t += DT) ch.update(DT, {}, {});
  assert.equal(ch.look, 'munch');
  ch.update(DT, {}, { actionPressed: true });
  assert.equal(ch.look, 'warn', 'a warning first, so it can be read');
  for (let t = 0; t < 1.2; t += DT) ch.update(DT, {}, {});
  assert.equal(ch.look, 'look');
});

// ---------- chapter 8: the Bombanat swoops, the Yalapappus stomps ----------

const mixed08 = (ch, b, dt) => {
  // A patient player: shadow the Trollusk at an easy pace, keep breath in hand,
  // and pounce only when he can't dodge (held by the Yalapappus, winded, or his
  // dodge spent); keep clear of the Yalapappus's paws otherwise.
  const c = ch.chase, h = c.h, s = c.s, y = ch.yal;
  if (c.tug) return aiSnatcher(c, b, 0.6, dt);
  const t = toward(s, h);
  const o = { x: t.x, y: t.y, sprint: false, actionPressed: false };
  const open = y.state === 'hold' || h.winded > 0 || h.cool > 0.4;
  if (open && s.cool <= 0 && s.winded <= 0 && t.d < s.lungeRange) { o.actionPressed = true; return o; }
  if (t.d < s.grabRange + s.radius) { o.actionPressed = true; return o; }
  if (t.d > 420 && s.st > 0.5) o.sprint = true;
  else if (t.d < 220 && !open) { o.x *= 0.15; o.y *= 0.15; }
  if (y.state === 'stomp' && y.swatCool <= 0 && len(s.x - y.x, s.y - y.y) < 260) { const a = toward(y, s); o.x = a.x; o.y = a.y * 0.3; }
  return o;
};
const lungeSpam08 = (ch, b, dt) => ({ ...aiSnatcher(ch.chase, b, 0.6, dt), actionPressed: ch.chase.s.cool <= 0 });
const sprintOnly08 = (ch, b, dt) => {
  const c = ch.chase;
  if (c.tug) return aiSnatcher(c, b, 0.6, dt);
  const t = toward(c.s, c.h);
  return { x: t.x, y: t.y, sprint: true, actionPressed: t.d < 110 };
};

test('chapter 8: choosing your moment beats diving all the time or chasing flat out', () => {
  const good = score(ch08, mixed08, { skill: 0.65, seed: 300, n: 90 });
  const lunge = score(ch08, lungeSpam08, { skill: 0.65, seed: 300, n: 90 });
  const spr = score(ch08, sprintOnly08, { skill: 0.65, seed: 300, n: 90 });
  assert.ok(good.rate >= 0.6 && good.rate < 1, `mixed play snatches ${good.rate}`);
  assert.ok(lunge.rate <= good.rate - 0.25, `dive-spam ${lunge.rate} vs ${good.rate}`);
  assert.ok(spr.rate <= good.rate - 0.08, `sprint-only ${spr.rate} vs ${good.rate}`);
});

test('chapter 8: the Yalapappus grabs a Trollusk who stands next to him, and swats a low Bombanat', () => {
  const env = makeEnv({ seed: 9, versus: true });
  const ch = ch08(env);
  const { h, s } = ch.chase;
  h.x = ch.yal.x + 60; h.y = ch.yal.y;
  ch.yal.cool = 0;
  ch.update(DT, {}, {});
  assert.equal(ch.yal.state, 'hold');
  assert.equal(h.mode, 'grabbed');
  // Let go, then a Bombanat diving right by him gets swatted.
  for (let t = 0; t < 2 && ch.yal.state === 'hold'; t += DT) ch.update(DT, {}, {});
  ch.yal.swatCool = 0; ch.yal.state = 'stomp';
  s.x = ch.yal.x + 120; s.y = ch.yal.y; s.mode = 'lunge'; s.modeT = 0; s.lx = 1; s.ly = 0;
  let swatted = false;
  for (let t = 0; t < 1 && !swatted; t += DT) { ch.update(DT, {}, {}); if (s.mode === 'stumble' && ch.yal.hit) swatted = true; }
  assert.ok(swatted, 'WHAP');
});

// ---------- chapter 9: net the Bombanat, then post the letter ----------

const carryTarget = (ch) => ch.letter || ch.mail;
// Mixed: the chapter's own autopilot (swings only when the Bombanat, or the
// ferns it hid in, stand in the net's drawn reach; vaults to close a long gap
// or clear a diving tripper; steps out of a dive's line otherwise).
const sensible09 = (ch, b, dt) => autopilot09(ch, dt);
// Swings the net all the time, walking straight at the target.
const netSpam09 = (ch, b) => {
  const c = ch.chase, g = c.s;
  b.f = !b.f;
  if (c.tug) return { x: -Math.sign(c.h.x - g.x), actionPressed: b.f };
  const tg = toward(g, ch.phase === 'net' ? (c.h.hidden ? c.lastSeen : c.h) : carryTarget(ch));
  return { x: tg.x, y: tg.y, actionPressed: b.f };
};
// Pole-vaults whenever it can.
const vaultSpam09 = (ch, b) => {
  const c = ch.chase, g = c.s;
  b.f = !b.f;
  if (c.tug) return { x: -Math.sign(c.h.x - g.x), actionPressed: b.f };
  const tg = toward(g, ch.phase === 'net' ? (c.h.hidden ? c.lastSeen : c.h) : carryTarget(ch));
  return { x: tg.x, y: tg.y, sprint: b.f, actionPressed: b.f && tg.d < 110 && (ch.phase === 'net' || !ch.letter) };
};

test('chapter 9: mixed play posts the letter; vaulting or swinging all the time does worse', () => {
  // (test/ch09.test.mjs goes into the chapter's rules; this keeps the three
  // chase chapters' balance check together.)
  const opts = { skill: 0.75, seed: 500, n: 30 };
  const good = score(ch09, sensible09, opts);
  const net = score(ch09, netSpam09, opts);
  const vault = score(ch09, vaultSpam09, opts);
  assert.ok(good.rate >= 0.8, `mixed posts ${good.rate}`);
  assert.ok(vault.rate <= good.rate - 0.15 && vault.marks < good.marks - 0.8, `vault-spam ${vault.rate} (${vault.marks} marks) vs ${good.rate} (${good.marks})`);
  assert.ok(net.rate <= good.rate || net.marks <= good.marks, `net-spam ${net.rate} (${net.marks} marks) vs ${good.rate} (${good.marks})`);
});

test('chapter 9: netting the Bombanat hands over the letter; a trip drops it', () => {
  const env = makeEnv({ seed: 21, versus: true });
  const ch = ch09(env);
  const { s, h } = ch.chase;
  // Net it: stand facing it with it in the net's reach, swing, and win the tug.
  h.x = s.x + 120; h.y = s.y; s.facing = 1;
  let f = 0;
  for (let t = 0; t < 8 && ch.phase === 'net'; t += DT) ch.update(DT, { actionPressed: f++ % 4 === 0 }, {});
  assert.equal(ch.phase, 'carry');
  assert.equal(ch.letter, null, 'he has the letter');
  // In versus the holder now runs the Trollusk: get close and dive (Action) to trip him.
  const tro = ch.others[0];
  for (let t = 0; t < 8 && !ch.letter; t += DT) {
    const d = toward(tro, s);
    ch.update(DT, {}, { x: d.x, y: d.y, sprint: true, actionPressed: d.d < 150 });
  }
  assert.ok(ch.letter, 'tripped: the letter is on the ground');
  assert.equal(s.mode, 'trip');
});

test('chapters 7-9 draw every phase without trouble', () => {
  const g = stubContext();
  for (const create of [ch07, ch08, ch09]) {
    const r = play(create, create === ch07 ? sensible07 : create === ch08 ? mixed08 : sensible09, 77, 0.6);
    for (let i = 0; i < 30; i++) { r.ch.update(DT, {}, null); r.ch.draw(g, i * DT); }
    assert.equal(typeof r.ch.hud(), 'string');
  }
});
