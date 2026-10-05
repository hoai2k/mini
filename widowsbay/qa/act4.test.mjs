// Headless checks for Act IV, The Whale's Road. Run: node widowsbay/qa/act4.test.mjs
import assert from 'node:assert/strict';
import act, {
  BEAT_S, WATER, HOOKS, LEDGES, FLOATERS, breath, waterY, tilt, hookTip, platformOf, extent, shoreTimes, OUTRO,
} from '../src/acts/act4.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };
const DT = 1 / 60;

// Drive the act with a clock that also supplies the beat.
function runner(carry = {}, beat0 = 0) {
  const st = act.create({ seed: 1, carry });
  const r = { st, t: 0, beat0, events: [] };
  r.step = (input = {}) => {
    r.t += DT;
    act.step(st, DT, { moveX: 0, beat: beat0 + r.t / BEAT_S, ...input });
    r.events.push(...st.events); st.events.length = 0;
  };
  return r;
}

// ---------------------------------------------------------------- a scripted climber
const HEAD = ['bank', 'F1', 'F2', 'F3', 'F4', 'L1', 'L2'];
const MID = ['L2c', 'F5', 'F6', 'F7', 'F8', 'L3', 'L4', 'F9', 'F10', 'F11', 'L5', 'L5b', 'F12', 'F13', 'F14', 'L6', 'T1', 'T2', 'T3', 'T4', 'T5'];
const MAIN = [...HEAD, ...MID, 'lip'];
const DETOUR = [...HEAD, 'L2b', 'LP', 'L2', ...MID, 'TSa', 'TS', 'TSa', 'T5', 'lip'];

// Is a hook within `r` of (x, y) at any time in the next `secs` (or along a path)?
function hookNear(beat, path, secs, r) {
  for (let i = 0; i <= 12; i++) {
    const f = i / 12, b = beat + (f * secs) / BEAT_S;
    const [x, y] = path(f);
    for (const h of HOOKS) { const p = hookTip(h, b); if (Math.hypot(p.x - x, p.y - y) < r) return true; }
  }
  return false;
}

// Would a leap from (x, y) toward tx, landing at ty, pass clear of every hook?
function jumpClear(st, x, y, tx, ty, delay = 0) {
  let vy = -820, px = x, py = y;
  for (let t = delay; t < delay + 1.4; t += 0.04) {
    px += clamp(tx - px, -280 * 0.04, 280 * 0.04); vy += 2000 * 0.04; py += vy * 0.04;
    const b = st.beat + t / BEAT_S;
    for (const h of HOOKS) {
      const p = hookTip(h, b);
      if (Math.abs(p.x - px) < 16 + 18 + 10 && p.y > py - 102 - 18 - 8 && p.y < py + 18 + 8) return false;
    }
    if (vy > 0 && py >= ty) return true;
  }
  return true;
}

function climber(route) {
  let i = 0, hold = 0;
  return (st) => {
    const s = st.s;
    if (st.phase !== 'climb') return {};
    if (s.on) {
      const at = route.indexOf(s.on, Math.max(0, i - 1));
      if (at >= 0 && at <= i + 1) i = at;
      else if (route.lastIndexOf(s.on) >= 0) i = route.lastIndexOf(s.on, i + 1) >= 0 ? route.lastIndexOf(s.on, i + 1) : route.indexOf(s.on);
    }
    if (i >= route.length - 1) { if (s.on === 'lip') return { moveX: 1 }; return {}; }
    const tgt = platformOf(st, route[i + 1]), te = extent(tgt), tc = (te.x0 + te.x1) / 2;
    if (!s.on) {
      // In the air: steer for the target's middle.
      const dx = tc - s.x;
      return { moveX: Math.abs(dx) < 10 ? 0 : Math.sign(dx), aHeld: s.vy < 0 && hold-- > 0 };
    }
    const cur = platformOf(st, s.on), ce = extent(cur);
    const dir = tc > (ce.x0 + ce.x1) / 2 ? 1 : -1;
    const edge = dir > 0 ? ce.x1 : ce.x0;
    // A lower platform right underneath: just walk off our edge.
    const gap = dir > 0 ? te.x0 - ce.x1 : ce.x0 - te.x1;
    const below = te.y > ce.y + 60 && gap < 80 && (dir > 0 ? te.x1 > ce.x1 : te.x0 < ce.x0);
    const rise = s.y - te.y;
    const goal = edge - dir * (below ? -30 : 10);
    const ready = rise < 132 && jumpClear(st, goal, s.y, tc, te.y, Math.abs(goal - s.x) / 280);
    if (!ready && !below) {
      // Wait near the edge, unless a hook is coming for that spot.
      const spots = [edge - dir * 26, (ce.x0 + ce.x1) / 2, edge - dir * (ce.x1 - ce.x0 - 26)];
      const spot = spots.find((x) => !hookNear(st.beat, () => [x, s.y - 55], 1.5, 60)) ?? spots[1];
      const dx = spot - s.x;
      return { moveX: Math.abs(dx) < 6 ? 0 : clamp(dx / 30, -1, 1) };
    }
    const dx = goal - s.x;
    if (!below && dir * dx < 14) { hold = 30; return { moveX: dir, a: true, aHeld: true }; }
    return { moveX: dir };
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function play(route, carry = {}, beat0 = 0, limit = 300) {
  const r = runner(carry, beat0), bot = climber(route);
  let seen = 0;
  while (r.st.status === 'play' && r.t < limit) {
    r.step(bot(r.st));
    if (process.env.DEBUG) for (; seen < r.events.length; seen++) {
      const e = r.events[seen];
      if (['hit', 'respawn', 'barrelKnock', 'pianoPlink', 'boneTap'].includes(e.type)) console.log(`   ${r.t.toFixed(2)} b${(r.st.beat % 16).toFixed(1)} ${e.type} ${e.why || ''} on=${r.st.s.on} x=${Math.round(r.st.s.x)} y=${Math.round(r.st.s.y)} L=${r.st.lanterns}`);
    }
  }
  return r;
}

// ---------------------------------------------------------------- tests
test('the breath follows the beat: four bars, up then down', () => {
  assert.equal(waterY(0), WATER.mean);
  assert.ok(waterY(2) < WATER.mean && waterY(2) > WATER.high, 'rising in the inhale');
  assert.equal(waterY(5), WATER.high);
  assert.equal(waterY(11), WATER.low);
  assert.ok(waterY(14) > WATER.mean, 'returning from low tide during the count-in');
  assert.equal(waterY(16 + 5), waterY(5), 'repeats every 16 beats');
  assert.equal(waterY(-11), waterY(5), 'works for any song position');
  assert.equal(breath(12.5).phase, 'cue');
});

test('the inhale is telegraphed: four cue beats, then the breath', () => {
  const r = runner({}, 10.5);
  while (r.t < 7 * BEAT_S) r.step();
  const types = r.events.map((e) => e.type).filter((x) => ['breathCue', 'whaleInhale', 'lowTide'].includes(x));
  assert.deepEqual(types, ['breathCue', 'breathCue', 'breathCue', 'breathCue', 'whaleInhale']);
  assert.deepEqual(r.events.filter((e) => e.type === 'breathCue').map((e) => e.n), [1, 2, 3, 4]);
  // Shifting the beat shifts the water.
  const a = act.create({ carry: {} }), b = act.create({ carry: {} });
  act.step(a, DT, { beat: 2 }); act.step(b, DT, { beat: 10 });
  assert.ok(a.water < b.water - 200);
});

test('the tilt slides the loose wreckage downhill, within its slot', () => {
  // tilt > 0 near beat 2 (right side down), < 0 near beat 6.
  assert.ok(tilt(2) > 0.04 && tilt(6) < -0.04);
  const st = act.create({ carry: {} });
  for (let i = 0; i < 120; i++) act.step(st, DT, { beat: 2 });
  for (const f of st.floaters) assert.ok(f.x > f.home + 10, `${f.id} slid right`);
  for (let i = 0; i < 240; i++) act.step(st, DT, { beat: 6 });
  for (const f of st.floaters) { assert.ok(f.x < f.home - 10, `${f.id} slid left`); assert.ok(f.x >= f.home - f.range); }
});

test('wreckage slots never overlap their neighbours', () => {
  const fs = FLOATERS;
  for (let i = 0; i + 1 < fs.length; i++) {
    const a = fs[i], b = fs[i + 1];
    if (b.home - a.home > 500) continue;
    assert.ok(a.home + a.range + a.w / 2 <= b.home - b.range - b.w / 2 + 6, `${a.id}/${b.id}`);
  }
});

test('the tilt tips a sailor standing still off a barrel', () => {
  const st = act.create({ carry: {} });
  act.step(st, DT, { beat: 1 });
  const f1 = platformOf(st, 'F1');
  Object.assign(st.s, { x: f1.x, y: f1.top, on: 'F1', vx: 0, vy: 0 });
  let fell = false;
  for (let i = 0; i < 300 && !fell; i++) { act.step(st, DT, { beat: 1 + i * DT / BEAT_S }); if (!st.s.on || st.s.on !== 'F1') fell = true; }
  assert.ok(fell);
});

test('the first ledge needs the high tide', () => {
  const st = act.create({ carry: {} });
  act.step(st, DT, { beat: 0 });
  const piano = platformOf(st, 'F4'), l1 = LEDGES.find((l) => l.id === 'L1');
  assert.ok(piano.top - l1.y > 170, 'out of a leap\'s reach at mean water');
  act.step(st, DT, { beat: 5 });
  assert.ok(platformOf(st, 'F4').top - l1.y < 130, 'within reach at high water');
});

test('falling into the deep costs a lantern and respawns on the last safe platform', () => {
  const r = runner({}, 0);
  for (let i = 0; i < 60; i++) r.step();
  Object.assign(r.st.s, { x: 1500, y: 300, on: null, vy: 0 }); r.st.s.safe = 'bank';
  for (let i = 0; i < 90 && !r.events.some((e) => e.type === 'respawn'); i++) r.step();
  assert.equal(r.st.lanterns, 2);
  assert.equal(r.st.s.on, 'bank');
  assert.ok(r.events.some((e) => e.type === 'splash'));
});

test('the bare floor at low tide stings', () => {
  const r = runner({}, 10.2); // low tide
  r.step();
  Object.assign(r.st.s, { x: 1600, y: 560, on: null, vy: 0 });
  for (let i = 0; i < 30; i++) r.step();
  assert.ok(r.events.some((e) => e.type === 'acidSting'));
  assert.equal(r.st.lanterns, 2);
});

test('a hook costs a lantern, then 1.6 s of grace', () => {
  const r = runner({}, 0);
  r.step();
  const tip = hookTip(HOOKS[0], r.st.beat + DT / BEAT_S);
  Object.assign(r.st.s, { x: tip.x, y: tip.y + 40, on: null, vy: 0 });
  r.step();
  assert.equal(r.st.lanterns, 2);
  assert.ok(r.events.some((e) => e.type === 'hookSnag'));
  assert.ok(r.st.grace > 1.5);
});

test('can be lost: walking into the stomach, again and again', () => {
  const r = runner({}, 0);
  while (r.st.status === 'play' && r.t < 60) r.step({ moveX: 1 });
  assert.equal(r.st.status, 'lost');
  assert.equal(r.st.lanterns, 0);
  assert.ok(r.st.lostTitle);
});

test('can be won by a scripted climb, without the stone', () => {
  for (const beat0 of [0, 5, 11]) {
    const r = play(MAIN, { sleepers: 6, tea: 3 }, beat0);
    assert.equal(r.st.status, 'won', `won from beat ${beat0} (phase ${r.st.phase}, x ${Math.round(r.st.s.x)}, lanterns ${r.st.lanterns})`);
    assert.equal(r.st.result.keepsakes.stone, false, 'the stone is optional');
    assert.ok(r.st.result.pearls >= 10, `pearls ${r.st.result.pearls}`);
    assert.ok(r.st.result.score > 0);
    const climbT = r.t - (OUTRO.throat + shoreTimes(6).end + OUTRO.iris);
    console.log(`   climb from beat ${beat0}: ${climbT.toFixed(1)} s, lanterns ${r.st.lanterns}, pearls ${r.st.pearls}`);
    assert.ok(climbT > 45 && climbT < 150, `climb time ${climbT}`);
  }
});

test('the stone detour grants the stone', () => {
  const r = play(DETOUR, { sleepers: 2 }, 3);
  assert.equal(r.st.status, 'won', `phase ${r.st.phase}, x ${Math.round(r.st.s.x)}`);
  assert.deepEqual(r.st.result.keepsakes, { stone: true });
  assert.ok(r.events.some((e) => e.type === 'stoneFound'));
});

test('the hand-off: revellers crawl out (capped), the tail slips away, then the iris', () => {
  for (const sleepers of [0, 3, 12]) {
    const r = runner({ sleepers }, 0);
    r.st.phase = 'throat'; r.st.phaseT = 0;
    while (r.st.status === 'play' && r.t < 40) r.step();
    assert.equal(r.st.status, 'won');
    const outs = r.events.filter((e) => e.type === 'revellerOut').length;
    assert.equal(outs, Math.min(sleepers, 8));
    for (const ty of ['daylight', 'beachSurf', 'crawlOut', 'whaleSlide', 'tailSplash']) assert.ok(r.events.some((e) => e.type === ty), ty);
    assert.equal(act.hud(r.st), null);
  }
});

test('determinism: the same inputs give the same climb', () => {
  const a = play(MAIN, {}, 2, 40), b = play(MAIN, {}, 2, 40);
  assert.equal(a.st.s.x, b.st.s.x); assert.equal(a.st.pearls, b.st.pearls);
});

test('hud and announce', () => {
  const st = act.create({ carry: {} });
  const h = act.hud(st);
  assert.equal(h.maxLanterns, 3); assert.equal(h.lanterns, 3);
  assert.deepEqual(h.keepsakes, [{ id: 'stone', have: false }]);
  assert.match(act.announce({ type: 'hit', lanterns: 1 }), /1 lantern left/);
});

console.log(`${n} tests passed`);
