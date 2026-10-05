// Headless checks for Act V — Widow's Bay. Run: node widowsbay/qa/act5.test.mjs
import assert from 'node:assert/strict';
import act, { BEAT_S, CLIFF, HOUSE, QUAY, T, pickHold, climberPos, holdY, endingFor } from '../src/acts/act5.js';

const DT = 1 / 60;
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };

// A tiny harness: the beat runs from the clock, as the shell's audio would.
function sim(carry = {}, seed = 7) {
  const st = act.create({ seed, carry });
  const events = [];
  const h = {
    st, events, time: 0,
    step(input = {}) {
      h.time += DT;
      act.step(st, DT, { moveX: 0, moveY: 0, ...input, beat: h.time / BEAT_S });
      events.push(...st.events); st.events.length = 0;
    },
    run(sec, inputFn = () => ({})) { for (let t = 0; t < sec && st.status === 'play'; t += DT) h.step(inputFn(st)); },
    until(pred, sec, inputFn = () => ({})) { for (let t = 0; t < sec && st.status === 'play'; t += DT) { if (pred(st)) return true; h.step(inputFn(st)); } return pred(st); },
    count: (type) => events.filter((e) => e.type === type).length,
  };
  return h;
}

// ---------------------------------------------------------------- bots
const DIRV = { up: { x: 0, y: 1 }, down: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const TRIES = [...Object.entries(DIRV).flatMap(([d, v]) => [[d, v, false], [d, v, true]])];

// Shortest route of moves from the current hold to the clifftop, avoiding
// loose holds. Each move is [dir, leap, target].
function route(st) {
  const from = st.cl.at, prev = new Map([[from, null]]), q = [from];
  while (q.length) {
    const i = q.shift();
    if (st.holds[i].kind === 'top') {
      const out = []; let k = i;
      while (prev.get(k)) { out.unshift(prev.get(k).slice(1)); k = prev.get(k)[0]; }
      return out;
    }
    for (const [d, v, leap] of TRIES) {
      // The boot's lift changes reach: plan as if planted, and wait for it.
      const j = pickHold({ ...st, beat: 0.99 }, i, v, leap);
      if (j < 0 || prev.has(j) || st.holds[j].kind === 'crumble') continue;
      prev.set(j, [i, d, leap, j]); q.push(j);
    }
  }
  return null;
}

// Climb the route; side-step when dust gathers over the next hold or us.
function cliffBot(st) {
  const cl = st.cl;
  if (cl.moveT < cl.moveDur) return {};
  const pos = climberPos(st);
  const threats = st.rocks.filter((r) => r.y == null ? r.wait < r.warn : r.y > pos.y);
  const danger = (x) => threats.some((r) => Math.abs(r.x - x) < 56);
  const here = st.holds[cl.at];
  const r = route(st);
  if (!r || !r.length) return {};
  const [dir, leap, target] = r[0];
  const sheltered = here.kind === 'gap';
  if (!danger(st.holds[target].x) && pickHold(st, cl.at, DIRV[dir], leap) === target) return leap ? { a: true, moveY: dir === 'up' ? -1 : 0, moveX: dir === 'left' ? -1 : dir === 'right' ? 1 : 0, ...(dir === 'down' ? { moveY: 1 } : {}) } : { [dir]: true };
  if (danger(pos.x) && !sheltered) {
    for (const d of ['left', 'right', 'up', 'down']) {
      const j = pickHold(st, cl.at, DIRV[d], false);
      if (j >= 0 && st.holds[j].kind !== 'crumble' && !danger(st.holds[j].x)) return { [d]: true };
    }
  }
  return {}; // wait it out (or wait for the boot to lift)
}

// The house: a list of waypoints, walked with dodging.
function houseBot(st, plan) {
  const p = st.p;
  const threat = st.haz.find((h) => !h.landed && h.wait < h.warn + 0.05 && (st.phase === 'quay' || h.f === p.f));
  const goal = plan(st);
  if (!goal) return {};
  if (p.conn) return goal.conn || {};
  if (threat && p.f >= 0) {
    const hw = threat.kind === 'beam' ? 72 : 44;
    const nextX = p.x + Math.sign(goal.x - p.x) * 40;
    if (Math.abs(threat.x - p.x) < hw + 24) {
      // get clear the shorter way, unless a wall is in the way
      const lo = st.phase === 'quay' ? 0 : HOUSE.wallL + 10, hi = st.phase === 'quay' ? 1280 : HOUSE.wallR - 10;
      const right = threat.x + hw + 26, left = threat.x - hw - 26;
      const goRight = right <= hi && (right - p.x < p.x - left || left < lo);
      return { moveX: goRight ? 1 : -1 };
    }
    if (Math.abs(threat.x - nextX) < hw + 24) return {};                                 // stop short
  }
  const dx = goal.x - p.x;
  const input = Math.abs(dx) > 4 ? { moveX: Math.sign(dx) } : {};
  if (goal.jumpAt != null && p.f >= 0 && Math.abs(p.x - goal.jumpAt) < 8) input.a = true;
  if (Math.abs(dx) <= 6 && goal.then) Object.assign(input, goal.then);
  return input;
}

// Waypoints up through the house and back down with her.
function housePlan(useShortcut) {
  return (st) => {
    const p = st.p;
    if (st.phase === 'quay') return { x: QUAY.x1 + 10 };
    if (p.carry) {
      if (p.conn) return { conn: p.conn.c.id === 'ladderDown' ? { moveY: 1 } : { moveX: 1 } };
      if (p.f === 2) return { x: 720, then: { moveY: 1 } };
      if (p.f === 1) return { x: 806 };
      return { x: HOUSE.door };
    }
    if (p.conn) return { conn: { moveY: -1 } };
    if (p.f < 0) return { x: p.vx > 0 ? 900 : 380 };
    if (p.f === 0) return { x: 560, then: { moveY: -1 } };
    if (p.f === 1) {
      if (useShortcut) {
        if (st.shutter === 'shut') return { x: HOUSE.shutterX + 20, then: { a: true } };
        return { x: 872, then: { moveY: -1 } };
      }
      return { x: 450, jumpAt: 668, then: { moveY: -1 } };
    }
    return { x: HOUSE.beloved, jumpAt: p.x < 640 ? 588 : null };
  };
}

function playThrough(carry, { seed = 7, shortcut = false } = {}) {
  const h = sim(carry, seed);
  h.until((s) => s.phase !== 'cliff', 120, cliffBot);
  const cliffT = h.time;
  h.until((s) => s.phase === 'house', 10);
  const plan = housePlan(shortcut);
  h.until((s) => s.phase !== 'house', 120, (s) => houseBot(s, plan));
  const houseT = h.time;
  h.until((s) => s.phase !== 'quay', 40, (s) => houseBot(s, plan));
  h.run(60);
  return { h, cliffT, houseT };
}

// ---------------------------------------------------------------- tests
test('module shape follows the contract', () => {
  for (const k of ['id', 'kicker', 'title', 'sub', 'action', 'create', 'step', 'hud', 'draw']) assert.ok(act[k] != null, k);
  assert.equal(act.id, 5);
  const st = act.create({ seed: 1, carry: {} });
  assert.equal(st.status, 'play'); assert.equal(st.statusT, 0); assert.deepEqual(st.events, []);
  const hud = act.hud(st);
  assert.equal(hud.lanterns, 3); assert.equal(hud.maxLanterns, 3);
});

test('endings are chosen from carry, in order', () => {
  assert.equal(endingFor({ rose: true, pearl: true }), 'witch');
  assert.equal(endingFor({ rose: true }), 'witch');
  assert.equal(endingFor({ pearl: true, stone: true }), 'lamp');
  assert.equal(endingFor({ stone: true }), 'dark');
  assert.equal(endingFor({}), 'dark');
});

test('the clifftop is only reachable from the giant\'s boot', () => {
  const st = act.create({ seed: 1 });
  const ledge = st.holds.findIndex((h) => h.x === 330 && h.y === 1830);
  const boot = st.holds.findIndex((h) => h.kind === 'boot');
  for (const [, v, leap] of TRIES) {
    const j = pickHold(st, ledge, v, leap);
    assert.ok(j < 0 || st.holds[j].kind !== 'top', 'no leap over the lip');
  }
  st.beat = 0.5; // the boot is raised mid-beat
  assert.ok(holdY(st.holds[boot], st.beat) > st.holds[boot].y + 90);
  assert.equal(st.holds[pickHold(st, boot, DIRV.right, false)].kind, "top", "a raised boot reaches the grass");
  st.beat = 1.5; // planted: too far to climb, a leap still makes it
  assert.notEqual(st.holds[pickHold(st, boot, DIRV.right, false)]?.kind, "top");
  assert.equal(st.holds[pickHold(st, boot, DIRV.right, true)].kind, "top");
});

test('the boot carries a climber standing on it', () => {
  const h = sim();
  const boot = h.st.holds.findIndex((x) => x.kind === 'boot');
  h.st.cl.at = boot; h.st.nextRock = 1e9;
  const ys = [];
  for (let i = 0; i < 120; i++) { h.step(); ys.push(climberPos(h.st).y); }
  assert.ok(Math.max(...ys) - Math.min(...ys) > 90, 'rises and falls with the beat');
  assert.ok(h.count('giantStep') >= 2, 'a giant footstep on the beat');
});

test('a loose hold gives way and costs a lantern; the gap shelters', () => {
  const h = sim();
  h.st.nextRock = 1e9;
  const loose = h.st.holds.findIndex((x) => x.kind === 'crumble');
  h.st.cl.at = loose;
  h.st.cl.crumbleT = CLIFF.crumbleT;
  h.run(1.5);
  assert.equal(h.st.holds[loose].gone, true);
  assert.equal(h.st.lanterns, 2);
  assert.equal(h.count('holdCrumble'), 1);
  assert.ok(h.st.holds[h.st.cl.at].y < h.st.holds[loose].y, 'fell to a hold below');

  const g = sim();
  const gap = g.st.holds.findIndex((x) => x.kind === 'gap');
  g.st.cl.at = gap; g.st.nextRock = 1e9;
  g.st.camY = 700;
  g.st.rocks.push({ x: g.st.holds[gap].x, wait: 0.01, warn: 1, y: null, vy: 0, spin: 0, warned: true, done: false });
  g.run(2);
  assert.equal(g.st.lanterns, 3, 'sheltered in the gap');
  assert.equal(g.count('stoneGlance'), 1);
});

test('falling stones hit a climber who stays put, telegraphed first', () => {
  const h = sim();
  h.run(4.5);
  assert.ok(h.count('stoneWarn') >= 1);
  const warnAt = h.events.findIndex((e) => e.type === 'stoneWarn'), fallAt = h.events.findIndex((e) => e.type === 'stoneFall');
  assert.ok(warnAt >= 0 && fallAt > warnAt, 'dust before the drop');
  h.run(1.5);
  assert.equal(h.st.lanterns, 2, 'one hit');
});

test('the tea-leaf omen shows a beat earlier', () => {
  const a = sim({ tea: 3 }), b = sim({ tea: 2 });
  a.until((s) => s.rocks.length > 0, 10); b.until((s) => s.rocks.length > 0, 10);
  assert.equal(a.st.rocks[0].omen, true); assert.equal(b.st.rocks[0].omen, false);
  assert.ok(Math.abs(a.st.rocks[0].wait - (CLIFF.stoneWarn + BEAT_S)) < 0.05);
  assert.ok(Math.abs(b.st.rocks[0].wait - CLIFF.stoneWarn) < 0.05);
  // the warning (dust) itself still comes at the same moment before the drop
  assert.equal(a.st.rocks[0].warn, b.st.rocks[0].warn);
});

test('standing still on the cliff is lost after a defeat beat', () => {
  const h = sim();
  h.until((s) => s.status !== 'play', 60);
  assert.equal(h.st.status, 'lost');
  assert.equal(h.count('hit'), 3);
  assert.match(h.st.lostTitle, /Cliff/);
  const lastHit = h.events.filter((e) => e.type === 'hit').at(-1);
  assert.equal(lastHit.lanterns, 0);
});

test('grace: one hit per 1.6 s', () => {
  const h = sim();
  h.st.nextRock = 1e9;
  const pos = climberPos(h.st);
  for (let i = 0; i < 2; i++) h.st.rocks.push({ x: pos.x, wait: 0.05 + i * 0.3, warn: 1, y: null, vy: 0, spin: 0, warned: true, done: false });
  h.run(2);
  assert.equal(h.st.lanterns, 2);
});

test('the house can be lost too', () => {
  const h = sim();
  h.st.phase = 'house'; h.st.phaseT = 0; h.st.camY = CLIFF.top; h.st.open = 1; h.st.fire = 1;
  h.until((s) => s.status !== 'play', 60);
  assert.equal(h.st.status, 'lost');
  assert.match(h.st.lostTitle, /Fire/);
  assert.ok(h.count('beamWarn') + h.count('stoneWarn') >= 3);
});

function intoHouse(carry) {
  const h = sim(carry);
  h.st.phase = 'house'; h.st.phaseT = 0; h.st.camY = CLIFF.top; h.st.open = 1; h.st.fire = 1;
  h.st.nextHaz = 1e9;
  return h;
}

test('the stone breaks the shutter: a shortcut, only with the stone', () => {
  for (const stone of [true, false]) {
    const h = intoHouse({ stone });
    const plan = housePlan(true);
    h.until((s) => s.p.f === 1 && !s.p.conn, 20, (s) => houseBot(s, plan));
    h.until((s) => s.p.x >= HOUSE.shutterX + 18, 10, (s) => houseBot(s, plan));
    h.run(0.1, () => ({ a: true }));
    h.run(0.6);
    if (stone) {
      assert.equal(h.st.shutter, 'broken'); assert.equal(h.st.shortcut, true);
      assert.equal(h.count('shutterSmash'), 1);
      assert.equal(h.st.conns.find((c) => c.id === 'ivy').on, true);
      const ok = h.until((s) => s.p.carry, 15, (s) => houseBot(s, plan));
      assert.ok(ok, 'climbs the ivy straight to her');
      assert.equal(h.count('leap'), 0, 'the shortcut skips the leaps and the ladder');
      assert.equal(act.hud(h.st).keepsakes.find((k) => k.id === 'stone').have, false, 'the stone is spent');
    } else {
      assert.equal(h.st.shutter, 'shut');
      assert.equal(h.count('shutterLocked'), 1);
      assert.equal(h.count('leap'), 0, 'A at the shutter does not leap');
      assert.equal(h.st.conns.find((c) => c.id === 'ivy').on, false);
      h.run(1, () => ({ moveY: -1 }));
      assert.equal(h.st.p.f, 1, 'no way up at the shutter without the stone');
    }
  }
});

test('carrying her: no leap, slower, and the way down differs', () => {
  const h = intoHouse({});
  const plan = housePlan(false);
  assert.ok(h.until((s) => s.p.carry, 40, (s) => houseBot(s, plan)), 'reaches her');
  assert.equal(h.count('liftHer'), 1);
  assert.equal(h.st.conns.find((c) => c.id === 'stairs').on, false);
  assert.equal(h.st.conns.find((c) => c.id === 'ladderUp').on, false);
  assert.equal(h.st.conns.find((c) => c.id === 'ladderDown').on, true);
  assert.equal(h.st.conns.find((c) => c.id === 'slope').on, true);
  h.run(T.lift + 0.1);
  const leaps = h.count('leap');
  h.run(0.3, () => ({ a: true }));
  assert.equal(h.count('leap'), leaps, 'no leap while carrying');
  assert.equal(h.st.p.f, 2);
  const x0 = h.st.p.x; h.run(0.5, () => ({ moveX: -1 }));
  assert.ok(Math.abs((x0 - h.st.p.x) / 0.5 - HOUSE.carryWalk) < 8, 'carry walk speed');
  assert.ok(h.until((s) => s.phase === 'quay', 60, (s) => houseBot(s, plan)), 'carries her out of the door');
  const crossed = h.until((s) => s.phase === "ending", 30, (s) => houseBot(s, plan));
  if (!crossed) console.log(h.events.filter((e) => e.type === "hit" || e.type === "liftHer" || e.type === "houseFall").map((e) => e.type + ":" + (e.cause || "")).join(" "));
  assert.ok(crossed, `crosses the quay: ${h.st.phase} ${h.st.status} x=${h.st.p.x} f=${h.st.p.f}`);
});

test('falling through a broken floor costs a lantern', () => {
  const h = intoHouse({});
  h.st.p.f = 1; h.st.p.y = HOUSE.floors[1]; h.st.p.x = 670;
  h.run(0.6, () => ({ moveX: -1 }));
  assert.equal(h.st.p.f, 0);
  assert.equal(h.st.lanterns, 2);
  assert.equal(h.count('thud'), 1);
});

for (const [name, carry, ending] of [
  ['lamp', { tea: 3, guitar: true, pearl: true, stone: true, sleepers: 6 }, 'lamp'],
  ['witch', { tea: 3, guitar: true, rose: true, pearl: true, stone: true, sleepers: 12 }, 'witch'],
  ['dark', {}, 'dark'],
]) {
  test(`full play-through by scripted input ends in the ${name} ending`, () => {
    const { h, cliffT, houseT } = playThrough(carry, { shortcut: !!carry.stone });
    assert.equal(h.st.status, 'won', `status ${h.st.status} in phase ${h.st.phase} after ${h.time.toFixed(1)} s`);
    assert.equal(h.st.result.ending, ending);
    assert.deepEqual(h.st.result.keepsakes, {});
    assert.ok(h.st.result.score > 0);
    assert.equal(typeof h.st.result.pearls, 'number');
    assert.equal(h.count('ending'), 1);
    assert.equal(h.count('pageantJoin'), Math.min(12, carry.sleepers || 0));
    assert.equal(h.st.joined, Math.min(12, carry.sleepers || 0));
    assert.equal(h.count('pageantApplause'), 1);
    console.log(`     cliff ${cliffT.toFixed(1)} s, house ${(houseT - cliffT).toFixed(1)} s, total ${h.time.toFixed(1)} s, lanterns ${h.st.lanterns}, score ${h.st.result.score}`);
    assert.ok(h.time > 70 && h.time < 200);
  });
}

test('the bot climbs the cliff on several seeds', () => {
  let wins = 0;
  for (const seed of [1, 2, 3, 4, 5, 11, 23, 42]) {
    const h = sim({}, seed);
    h.until((s) => s.phase !== 'cliff', 120, cliffBot);
    if (h.st.phase === 'storm') wins++;
  }
  assert.ok(wins >= 6, `${wins}/8 climbs`);
});

test('ending cues fire for each ending', () => {
  for (const [carry, cue] of [[{ rose: true }, 'moonboatRise'], [{ pearl: true }, 'lampLit'], [{}, 'stonePlop']]) {
    const h = sim(carry);
    h.st.phase = 'ending'; h.st.phaseT = 0;
    h.run(T.ending + 0.2);
    assert.equal(h.count(cue), 1, cue);
    assert.equal(h.st.phase, 'pageant');
  }
});

test('the pageant counts the sleepers, capped at twelve, then irises to won', () => {
  for (const [sleepers, want] of [[0, 0], [1, 1], [6, 6], [20, 12]]) {
    const h = sim({ sleepers });
    h.st.phase = 'pageant'; h.st.phaseT = 0;
    h.run(T.pageant + T.iris + 0.5);
    assert.equal(h.count('pageantJoin'), want);
    assert.equal(h.st.status, 'won');
    assert.equal(act.hud(h.st), null);
  }
});

// A recording stand-in for the renderer's kit: every call on the context and
// the kit is logged, so two draws of the same state can be compared.
function mockKit(images = {}) {
  const log = [];
  const grad = { addColorStop: () => {} };
  const c = new Proxy({}, {
    get(_, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      return (...args) => log.push([k, ...args.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v))]);
    },
    set(_, k, v) { log.push(['=' + String(k), typeof v === 'number' ? Math.round(v * 100) / 100 : v]); return true; },
  });
  const rec = (name, ret) => (...args) => { log.push([name, ...args.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v))]); return ret; };
  const kit = {
    c, P: { mode: 'tint' }, PAL: {}, t: 0, log,
    col: (h) => h, img: (id) => images[id],
    asset: (id, ...a) => { rec('asset', !!images[id])(id, ...a); return !!images[id]; },
    assetCrop: (id, ...a) => { rec('crop', !!images[id])(id, ...a); return !!images[id]; },
  };
  for (const k of ['wire', 'circle', 'star', 'cloud', 'moon', 'sky', 'waves', 'lighthouse', 'band', 'keepsake', 'moonboat', 'wash', 'iris']) kit[k] = rec(k);
  for (const k of ['burst', 'text', 'flash', 'shake']) kit[k] = () => {};
  return kit;
}

function drawTwice(st, t, images) {
  const a = mockKit(images), b = mockKit(images);
  a.t = b.t = t;
  act.draw(a, st, t); act.drawOver(a, st, t);
  act.draw(b, st, t); act.drawOver(b, st, t);
  const i = a.log.findIndex((x, j) => JSON.stringify(x) !== JSON.stringify(b.log[j]));
  assert.ok(i < 0 && a.log.length === b.log.length, `draw differs between passes in ${st.phase} at ${i}: ${JSON.stringify(a.log[i])} vs ${JSON.stringify(b.log[i])} after ${JSON.stringify(a.log[i - 1])}`);
  assert.ok(a.log.length > 20, `draws something in ${st.phase}`);
  return a.log;
}

test('drawing: every phase draws, identically in both passes, with and without art', () => {
  const trio = { 'band-trio': { width: 900, height: 900 } };
  for (const images of [{}, trio]) {
    for (const carry of [{ pearl: true, guitar: true, sleepers: 6, tea: 3, stone: true }, { rose: true, sleepers: 12 }, {}]) {
      const h = sim(carry, 3);
      const seen = new Set();
      const plan = housePlan(!!carry.stone);
      let frame = 0;
      const look = (s) => { if (++frame % 20 === 0) { drawTwice(s, h.time, images); seen.add(s.phase); for (const e of s.events) act.onEvent(mockKit(images), e, s); } };
      h.until((s) => s.phase !== 'cliff', 120, (s) => { look(s); return cliffBot(s); });
      h.until((s) => s.phase !== 'storm', 10, (s) => { look(s); return {}; });
      h.until((s) => s.phase !== 'house', 120, (s) => { look(s); return houseBot(s, plan); });
      h.until((s) => s.phase !== 'quay', 40, (s) => { look(s); return houseBot(s, plan); });
      h.until((s) => s.status !== 'play', 60, (s) => { look(s); return {}; });
      drawTwice(h.st, h.time, images);
      for (const ph of ['cliff', 'storm', 'house', 'quay', 'ending', 'pageant', 'iris']) assert.ok(seen.has(ph), `drew ${ph}`);
    }
  }
  // the defeat beat draws too
  const d = sim();
  d.until((s) => s.defeatT != null, 60);
  d.run(0.5);
  drawTwice(d.st, d.time, {});
});

test('events get onEvent and announce without throwing', () => {
  const h = sim({ tea: 3, stone: true, pearl: true, sleepers: 3 });
  const types = new Set();
  const plan = housePlan(true);
  h.until((s) => s.status !== 'play', 200, (s) => (s.phase === 'cliff' ? cliffBot(s) : houseBot(s, plan)));
  for (const e of h.events) { types.add(e.type); act.onEvent(mockKit(), e, h.st); act.announce(e); }
  for (const t of ['rockScrape', 'leap', 'stoneWarn', 'stoneFall', 'clifftop', 'strike', 'fireRoar', 'houseOpen', 'fireCrackle', 'stoneThrow', 'shutterSmash', 'liftHer', 'floorBreak', 'carryStep', 'houseFall', 'ending', 'lampLit', 'pageant', 'pageantJoin', 'pageantApplause']) assert.ok(types.has(t), t);
  console.log('     events:', [...types].sort().join(' '));
});

console.log(`\n${n} tests passed`);
