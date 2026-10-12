// Unit tests that need no browser: face geometry, Hoops physics, and the
// shared-room layer (net.js) running on the in-memory relay.
//   node --test chat/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syntheticFace, templatePoint, TEMPLATE } from '../js/face.js';
import { _physics as hoops } from '../games/hoops.js';
import { createFakeRooms } from './fake-rooms.js';
import { createNet } from '../js/net.js';
import { mapCover } from '../js/flyer.js';
import { EFFECT_IDS } from '../effects/index.js';
import { GAME_IDS } from '../games/index.js';
import { readdirSync } from 'node:fs';
import * as kartTrack from '../games/kart/track.js';
import * as kartSim from '../games/kart/sim.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('template points land on the synthetic face', () => {
  const f = syntheticFace(640, 480, { roll: 0.3 });
  for (const key of ['eyeL', 'eyeR']) {
    const tp = templatePoint(f, TEMPLATE[key].x, TEMPLATE[key].y);
    close(tp.x, f[key].x, 1e-3);
    close(tp.y, f[key].y, 1e-3);
  }
  close(f.roll, 0.3, 1e-9);
  const m = templatePoint(f, TEMPLATE.mouth.x, TEMPLATE.mouth.y);
  assert.ok(Math.hypot(m.x - f.mouth.x, m.y - f.mouth.y) < 2);
});

test('expressions come through from blendshapes', () => {
  const f = syntheticFace(640, 480, { smile: 0.8, pucker: 0.7, blinkL: 1 });
  close(f.smile, 0.8);
  close(f.pucker, 0.7);
  assert.ok(f.wink > 0.5);
});

test('Hoops is 2D and read faithfully: speed sets height, direction sets aim', () => {
  const run = (up, targetX, from = hoops.REST, hoop = hoops.SPOTS[0]) => {
    const b = hoops.newBall(from, hoops.throwVelocity(from, up, targetX, hoop), hoop);
    let crossX = null, maxZ = 0;
    while (!b.done) {
      const z0 = b.z;
      hoops.stepBall(b);
      maxZ = Math.max(maxZ, b.z);
      if (crossX === null && z0 < hoop.z && b.z >= hoop.z) crossX = b.x;
    }
    return { scored: b.scored, crossX, maxZ };
  };
  for (const hoop of hoops.SPOTS) {
    // Nothing goes past the hoop: every throw stops at the backboard's plane.
    for (const up of [0.9, 1.5, 2.4, 4, 8]) assert.ok(run(up, hoop.x, hoops.REST, hoop).maxZ < hoop.z + 0.38, `past the hoop at ${up}`);
    // The middle speed scores; well short and well long don't.
    assert.equal(run(hoops.U0, hoop.x, hoops.REST, hoop).scored, true);
    assert.equal(run(hoops.U0 * 0.55, hoop.x, hoops.REST, hoop).scored, false);
    assert.equal(run(hoops.U0 * 2.2, hoop.x, hoops.REST, hoop).scored, false);
  }
  // The scoring speeds sit around U0 in one window: wide enough to feel,
  // narrow enough to need judging.
  const hoop = hoops.SPOTS[0];
  // (Bank shots off the board can also go in at higher speeds; this is the
  // unbroken window of clean shots around U0.)
  let lo = hoops.U0, hi = hoops.U0;
  while (run(lo - 0.02, hoop.x).scored) lo -= 0.02;
  while (run(hi + 0.02, hoop.x).scored) hi += 0.02;
  assert.ok(lo > hoops.U0 * 0.7 && lo < hoops.U0 * 0.9, `slowest ${lo}`);
  assert.ok(hi > hoops.U0 * 1.1 && hi < hoops.U0 * 1.4, `fastest ${hi}`);
  // Speeds near U0 change the height little; far ones a lot.
  const vy = u => hoops.throwVelocity(hoops.REST, u, 0, hoop)[1];
  assert.ok(vy(hoops.U0 * 1.1) - vy(hoops.U0) < vy(hoops.U0 * 2) - vy(hoops.U0 * 1.9));
  // Aimed off to the side: arrives where aimed, and misses.
  const off = run(hoops.U0, hoop.x + 0.45);
  assert.equal(off.scored, false);
  assert.ok(Math.abs(off.crossX - (hoop.x + 0.45)) < 0.02, `arrives at ${off.crossX}`);
});

test('Hoops physics is deterministic, so ghosts replay exactly', () => {
  const from = { x: 0.2, y: 2.1, z: 0 }, hoop = hoops.SPOTS[2];
  const v = hoops.throwVelocity(from, 2.6, 0.1, hoop);
  const a = hoops.newBall(from, v, hoop), b = hoops.newBall(from, v, hoop);
  while (!a.done) hoops.stepBall(a);
  while (!b.done) hoops.stepBall(b);
  assert.deepEqual(a, b);
});

test('cover mapping centres a cropped video', () => {
  const rect = { left: 0, top: 0, width: 400, height: 400 };
  const p = mapCover(rect, 640, 480, 0.5, 0.5);
  close(p.x, 200);
  close(p.y, 200);
  const q = mapCover(rect, 640, 480, 0, 0);
  assert.ok(q.x < 0 && q.y === 0);
});

test('contain mapping letterboxes a landscape video in an upright tile', () => {
  const rect = { left: 0, top: 0, width: 390, height: 844 };
  const c = mapCover(rect, 640, 480, 0, 0, 'contain');
  close(c.x, 0);
  close(c.y, (844 - 390 * 0.75) / 2);
  const d = mapCover(rect, 640, 480, 1, 1, 'contain');
  close(d.x, 390);
  close(d.y, (844 + 390 * 0.75) / 2);
});

test('a moved picture moves the mapping with it', () => {
  const rect = { left: 0, top: 0, width: 390, height: 844 };
  // Letterboxed and slid to the top: the picture's top edge is the screen's.
  close(mapCover(rect, 640, 480, 0.5, 0, 'contain', { x: 0.5, y: 0 }).y, 0);
  // Filled and dragged to show the picture's left edge.
  const k = 844 / 480;
  close(mapCover(rect, 640, 480, 0, 0.5, 'cover', { x: 0, y: 0.5 }).x, 0);
  close(mapCover(rect, 640, 480, 1, 0.5, 'cover', { x: 1, y: 0.5 }).x, 390);
  close(mapCover(rect, 640, 480, 0.5, 0.5, 'cover').x, 195);
  assert.ok(640 * k > 390);
});

test('every listed effect and game has a file', () => {
  const fx = readdirSync(new URL('../effects/', import.meta.url));
  const games = readdirSync(new URL('../games/', import.meta.url));
  for (const id of EFFECT_IDS) assert.ok(fx.includes(`${id}.js`), `effects/${id}.js`);
  for (const id of GAME_IDS) assert.ok(games.includes(`${id}.js`), `games/${id}.js`);
  assert.equal(EFFECT_IDS.length, 75);
  assert.equal(new Set(EFFECT_IDS).size, 75);
  assert.equal(GAME_IDS.length, 25);
});

const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 3000) {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error('timed out');
    await wait(20);
  }
}

test('everyone lands in the same room, and it survives the host leaving', async () => {
  const rooms = createFakeRooms({ latency: 5 });
  const mk = name => createNet({ game: 'chat', room: 'everyone', me: { id: name, name }, rooms });
  const a = mk('a'), b = mk('b');
  await until(() => a.peers.has('b') && b.peers.has('a'));

  const got = [];
  b.onTopic('hi', (d, from) => got.push([d, from]));
  a.send('hi', { n: 1 });
  a.sendTo('nobody', 'hi', { n: 2 });
  await until(() => got.length === 1);
  assert.deepEqual(got[0], [{ n: 1 }, 'a']);

  // A third person joins; then whoever hosts leaves. The other two reconnect
  // into a fresh room and still see each other.
  const c = mk('c');
  await until(() => c.peers.size === 2 && a.peers.size === 2);
  a.leave();
  await until(() => b.peers.size === 1 && c.peers.size === 1 && b.peers.has('c'), 8000);
  assert.equal(b.status, 'connected');
  b.leave();
  c.leave();
});

test('each theme has its own shade of every colour name', async () => {
  const { PALETTES, COLOR_NAMES, themedColor, colorName } = await import('../js/palette.js');
  for (const [t, p] of Object.entries(PALETTES)) {
    assert.equal(p.length, COLOR_NAMES.length, t);
    assert.equal(new Set(p).size, p.length, `${t} shades are distinct`);
  }
  assert.equal(colorName('#4DABF7'), 'blue');
  assert.equal(themedColor('#4dabf7', 'art'), PALETTES.art[5]);
  assert.equal(themedColor('#123456', 'art'), '#123456');
});

test('Go Fish deals thirteen creatures, four of each, and books sets of four', async () => {
  const { newDeck, takeBooks, dealSize } = await import('../games/gofish.js');
  const deck = newDeck();
  assert.equal(deck.length, 52);
  for (let r = 0; r < 13; r++) assert.equal(deck.filter(c => c === r).length, 4);
  assert.equal(dealSize(2), 7);
  assert.equal(dealSize(3), 7);
  assert.equal(dealSize(4), 5);
  const t = takeBooks([3, 1, 3, 3, 5, 3, 1]);
  assert.deepEqual(t.books, [3]);
  assert.deepEqual(t.hand, [1, 5, 1]);
  assert.deepEqual(takeBooks([2, 2, 2]).books, []);
});

test('Hoops: the ball is in front of the rim going up and behind it coming down', () => {
  const { throwVelocity, newBall, stepBall, behindRim, SPOTS, REST, U0 } = hoops;
  const hoop = SPOTS[0];
  let fallingAtHoop = 0;
  for (const k of [0.9, 1, 1.1, 1.25]) {
    const b = newBall(REST, throwVelocity(REST, U0 * k, hoop.x, hoop), hoop);
    for (let i = 0; i < 2000 && !b.done; i++) {
      stepBall(b);
      if (b.vy > 0) assert.equal(behindRim(b, hoop), false, `rising ball in front (k ${k})`);
      // Coming down through rim height near the hoop: behind the front rim.
      if (b.vy < 0 && Math.abs(b.y - hoop.y) < 0.3 && b.z > hoop.z - 0.4) {
        assert.equal(behindRim(b, hoop), true, `falling ball at the rim is behind (k ${k})`);
        fallingAtHoop++;
      }
      if (b.vy < 0 && b.y < hoop.y - 1) break;
    }
  }
  assert.ok(fallingAtHoop > 10, 'shots came down past the rim');
  // A ball that bounced well back towards the player stays in front.
  assert.equal(behindRim({ vy: -2, z: hoop.z - 1.2 }, hoop), false);
});

test('Mob Whack: the same seed gives the same fair spawns', async () => {
  const { _logic: W } = await import('../games/whack.js');
  const a = W.makeSchedule(12345), b = W.makeSchedule(12345), c = W.makeSchedule(999);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  for (const seed of [1, 7, 12345, 4294967295, 2024, 31337, 555, 8080]) {
    const ev = W.makeSchedule(seed);
    const kinds = k => ev.filter(e => e.kind === k).length;
    assert.ok(ev.length > 50, `seed ${seed}: plenty of mobs (${ev.length})`);
    assert.ok(kinds('zombie') > kinds('creeper') && kinds('creeper') >= 3 && kinds('villager') >= 3, `seed ${seed}: mix`);
    assert.ok(kinds('enderman') >= 1 && kinds('enderman') <= 2, `seed ${seed}: an enderman or two`);
    const byHole = Array.from({ length: 9 }, () => []);
    let prev = -1;
    for (const e of ev) {
      assert.ok(e.stops[0].t >= prev, 'in order');
      prev = e.stops[0].t;
      if (e.kind === 'enderman') {
        assert.ok(e.stops.length >= 3, 'an enderman hops at least twice');
        for (let j = 1; j < e.stops.length; j++) assert.notEqual(e.stops[j].hole, e.stops[j - 1].hole, 'hops to another hole');
      } else assert.equal(e.stops.length, 1);
      for (const s of e.stops) {
        assert.ok(Number.isInteger(s.hole) && s.hole >= 0 && s.hole < 9);
        assert.ok(s.t >= 0 && s.t + s.dur <= W.DURATION, 'ends in time');
        byHole[s.hole].push([s.t, s.t + s.dur + W.RISE]);
      }
    }
    for (const list of byHole) {
      list.sort((x, y) => x[0] - y[0]);
      for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1], `seed ${seed}: a hole holds one mob at a time`);
    }
    // It gets faster: more spawns in the last 20 s than the first 20 s.
    const early = ev.filter(e => e.stops[0].t < 20000).length, late = ev.filter(e => e.stops[0].t >= 40000).length;
    assert.ok(late > early, `seed ${seed}: ramps up (${early} then ${late})`);
  }
});

test('Mob Whack: points, combos, layout and untrusted state', async () => {
  const { _logic: W } = await import('../games/whack.js');
  assert.equal(W.comboMult(1), 1);
  assert.equal(W.comboMult(4), 2);
  assert.equal(W.comboMult(40), 4);
  assert.equal(W.pointsFor('zombie', 1), 10);
  assert.equal(W.pointsFor('zombie', 8), 30);
  assert.ok(W.pointsFor('creeper', 1) > W.pointsFor('zombie', 1));
  assert.ok(W.pointsFor('creeper', 1, true) > W.pointsFor('creeper', 1));
  assert.equal(W.pointsFor('enderman', 1), 50);
  assert.ok(W.pointsFor('villager', 9) < 0);
  // The holes and risen mobs stay on screen below the scores, portrait or wide.
  for (const [w, h, top] of [[390, 640, 80], [460, 440, 60], [1900, 440, 60], [1024, 768, 60], [320, 480, 70]]) {
    const { k, ox, oy } = W.fieldLayout(w, h, top);
    const x0 = ox + W.REGION.x0 * k, x1 = ox + W.REGION.x1 * k, y0 = oy + W.REGION.y0 * k, y1 = oy + W.REGION.y1 * k;
    assert.ok(x0 >= -1 && x1 <= w + 1 && y1 <= h + 1 && y0 >= top - 40, `${w}x${h}: region on screen`);
  }
  // Wide enough: the field covers the whole canvas.
  const c = W.fieldLayout(1024, 768, 60);
  assert.ok(c.ox <= 0 && c.oy <= 0 && c.ox + W.IMG_W * c.k >= 1024 && c.oy + W.IMG_H * c.k >= 768);
  assert.ok(W.validShared({ round: 1, seed: 5, startAt: Date.now() }));
  for (const bad of [null, 5, {}, { round: 0, seed: 1, startAt: Date.now() }, { round: 1, seed: -1, startAt: Date.now() }, { round: 1, seed: 1, startAt: 'x' }, { round: 1, seed: 1.5, startAt: Date.now() }]) {
    assert.equal(W.validShared(bad), false);
  }
  // The shared tally is cleaned up on arrival: bad players and outcomes dropped, numbers clamped.
  const now = Date.now();
  const S = W.readShared({
    round: 3, seed: 9, startAt: now,
    pl: [['a', 'Ana', '#ff0000', 120, 2, 3, 9, 4], ['b', '<b>Bo</b>', 'red; x', 1e9, 99, -1, 'x', 2], ['a', 'dup'], [5, 'num'], 'junk'],
    o: [[1, 0, 500, 0, 10], [2, 5, 500, 0, 10], [3, -1, 900, 0, -10], ['x'], [4, 1, 1e9, 0, 10]],
  });
  assert.deepEqual(S.pl.map(p => p.id), ['a', 'b']);
  assert.deepEqual(S.pl[0], { id: 'a', name: 'Ana', color: '#ff0000', score: 120, hearts: 2, combo: 3, hits: 9, best: 4 });
  assert.deepEqual(S.pl[1], { id: 'b', name: '<b>Bo</b>', color: '#ffffff', score: 0, hearts: 0, combo: 0, hits: 0, best: 2 });
  assert.deepEqual(S.o, [{ id: 1, seat: 0, t: 500, stop: 0, pts: 10 }, { id: 3, seat: -1, t: 900, stop: 0, pts: -10 }]);
  assert.deepEqual(W.readShared(W.packShared(S)), S, 'packs and reads back the same');
  assert.deepEqual(W.readShared({ round: 1, seed: 1, startAt: now }).pl, [], 'an old shared state without a tally');
  assert.equal(W.readShared({ round: 0, seed: 1, startAt: now }), null);
});

test('Mob Whack shared field: claims, the referee and the tally', async () => {
  const { _logic: W } = await import('../games/whack.js');
  const sched = W.makeSchedule(4242);
  const z = sched.find(e => e.kind === 'zombie' && e.stops[0].t > 3000);
  const cr = sched.find(e => e.kind === 'creeper');
  const en = sched.find(e => e.kind === 'enderman');
  const zs = z.stops[0], mid = zs.t + Math.round(zs.dur / 2);

  // Messages are checked strictly.
  assert.deepEqual(W.readClaim({ r: 2, id: z.id, h: zs.hole, t: mid + 0.4 }), { r: 2, id: z.id, h: zs.hole, t: mid });
  for (const bad of [null, 'w', { r: 0, id: 1, h: 0, t: 5 }, { r: 1, id: 1, h: 9, t: 5 }, { r: 1, id: 1, h: -1, t: 5 }, { r: 1, id: 1.5, h: 0, t: 5 },
    { r: 1, id: -2, h: 0, t: 5 }, { r: 1, id: 1, h: 0, t: NaN }, { r: 1, id: 1, h: 0, t: 1e9 }, { r: 1, id: 1, h: '3', t: 5 }]) {
    assert.equal(W.readClaim(bad), null, JSON.stringify(bad));
  }

  // The owner judges a claim against the schedule and its own clock.
  const c = { r: 1, id: z.id, h: zs.hole, t: mid };
  assert.deepEqual(W.judgeClaim(sched, c, mid + 80), { ok: true, j: 0, late: false });
  assert.equal(W.judgeClaim(sched, { ...c, h: (zs.hole + 1) % 9 }, mid + 80).ok, false, 'wrong hole');
  assert.equal(W.judgeClaim(sched, { ...c, t: zs.t + zs.dur + 50 }, zs.t + zs.dur + 100).ok, false, 'after it sank');
  assert.equal(W.judgeClaim(sched, { ...c, t: zs.t + 5 }, zs.t + 100).ok, false, 'before it rose');
  assert.equal(W.judgeClaim(sched, { ...c, id: 99999 }, mid).ok, false, 'no such mob');
  assert.equal(W.judgeClaim(sched, c, mid - W.SKEW - 10).ok, false, 'from the future');
  assert.equal(W.judgeClaim(sched, c, mid + W.STALE + 10).ok, false, 'too old');
  assert.deepEqual(W.judgeClaim(sched, { r: 1, id: -1, h: 4, t: mid }, mid), { ok: true, miss: true });
  const cs = cr.stops[0];
  assert.equal(W.judgeClaim(sched, { r: 1, id: cr.id, h: cs.hole, t: cs.t + cs.dur - 20 }, cs.t + cs.dur).late, true, 'a flashing creeper');
  const e0 = en.stops[0], eL = en.stops[en.stops.length - 1];
  assert.deepEqual(W.judgeClaim(sched, { r: 1, id: en.id, h: e0.hole, t: e0.t + 100 }, e0.t + 100), { ok: false, why: 'hopping' });
  assert.equal(W.judgeClaim(sched, { r: 1, id: en.id, h: eL.hole, t: eL.t + 100 }, eL.t + 100).ok, true, 'caught where it settles');

  // Rival claims: the earliest wins, a claim can't count from much before it
  // arrived, ties go to the lower seat, and order of arrival doesn't matter.
  assert.equal(W.claimTime(1000, 1100), 1000);
  assert.equal(W.claimTime(200, 1100), 1100 - W.LAG, 'a claim pretending to be early');
  const a = { seat: 0, eff: 1000 }, b = { seat: 1, eff: 990 }, tie = { seat: 2, eff: 990 };
  assert.equal(W.pickClaim([a, b]), b);
  assert.equal(W.pickClaim([b, a]), b);
  assert.equal(W.pickClaim([tie, b]), b);
  assert.equal(W.pickClaim([b, tie]), b);
  assert.equal(W.pickClaim([]), null);

  // The tally: the whacker scores, a villager costs only its whacker, a
  // creeper explosion costs everyone still in a heart and 10 points.
  let ana = W.newPlayer({ id: 'a', name: 'Ana', color: '#ff0000' }), bo = W.newPlayer({ id: 'b', name: 'Bo', color: 'nope' });
  assert.equal(bo.color, '#ffffff');
  for (let i = 0; i < 4; i++) ({ p: ana } = W.scoreHit(ana, 'zombie'));
  assert.deepEqual([ana.score, ana.combo, ana.hits, ana.best], [10 + 10 + 10 + 20, 4, 4, 4]);
  let r = W.scoreHit(ana, 'villager');
  assert.equal(r.pts, -20);
  assert.deepEqual([r.p.score, r.p.combo], [30, 0]);
  assert.deepEqual([W.scoreHit(bo, 'villager').p.score], [0], 'never below zero');
  r = W.scoreHit(bo, 'creeper', true);
  assert.equal(r.pts, 30);
  bo = r.p;
  [ana, bo] = [ana, bo].map(W.scoreBoom);
  assert.deepEqual([ana.hearts, ana.score, ana.combo, bo.hearts, bo.score], [2, 40, 0, 2, 20]);
  [ana, bo] = [ana, bo].map(W.scoreBoom).map(W.scoreBoom);
  assert.deepEqual([ana.hearts, bo.hearts], [0, 0]);
  assert.deepEqual(W.scoreBoom(ana), ana, 'out players lose nothing more');
  assert.equal(W.scoreMiss({ ...bo, combo: 5 }).combo, 0);
  assert.equal(W.scoreEscape({ ...W.newPlayer({ id: 'c' }), combo: 3 }).combo, 0);
  assert.equal(W.mobEnd(z), zs.t + zs.dur);
  assert.equal(W.stopUpAt(en, eL.hole, eL.t + 50), en.stops.length - 1);
  assert.equal(W.stopUpAt(z, zs.hole, zs.t + zs.dur + 1), -1);
});

test('Baseball: pitches reach their target, and contact decides the hit', async () => {
  const { makePitch, pitchPos, contact, launchVelocity, outcome, fenceDist, TIMING, FOUL } = (await import('../games/baseball.js'))._physics;
  // Every pitch crosses the plate at its target, at its time.
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 30; i++) {
    const p = makePitch(rand);
    const b = pitchPos(p, p.T);
    close(b.x, p.tx, 1e-9);
    close(b.y, p.ty, 1e-9);
    close(b.z, 0, 1e-9);
    assert.ok(['fast', 'change', 'curve'].includes(p.type) && p.T > 0.5 && p.T < 1.1);
    assert.ok(pitchPos(p, p.T + 0.1).z < 0, 'it carries on past the plate');
  }
  // The wall: 377 ft to centre, 322 ft down the lines.
  close(fenceDist(0), 115);
  close(fenceDist(FOUL), 98);

  const from = { x: 0, y: 0.8, z: 0 };
  const hit = (dt, dx, dy) => {
    const c = contact(dt, dx, dy);
    return c && { c, ...outcome(from, launchVelocity(c)) };
  };
  // Right on the ball, right on time: a home run to centre.
  const best = hit(0, 0, 0);
  assert.equal(best.c.q, 1);
  assert.equal(best.kind, 'hr');
  assert.ok(best.dist > fenceDist(0) && best.dist < 150, `carries ${best.dist}`);
  // Outside the timing window or out of reach: a miss.
  assert.equal(contact(TIMING + 0.01, 0, 0), null);
  assert.equal(contact(-TIMING - 0.01, 0, 0), null);
  assert.equal(contact(0, 0, 0.35), null);
  assert.equal(contact(NaN, 0, 0), null);
  // Early pulls it to left field, late pushes it to right; very late is foul.
  assert.ok(hit(-0.05, 0, 0).c.spray < -10);
  assert.ok(hit(0.05, 0, 0).c.spray > 10);
  assert.equal(hit(0.12, 0, 0).kind, 'foul');
  assert.equal(hit(-0.12, 0, 0).kind, 'foul');
  // On top of the ball: a grounder; well under it: a pop-up.
  assert.equal(hit(0, 0, 0.27).kind, 'grounder');
  assert.equal(hit(0, 0, -0.29).kind, 'pop');
  // A slightly early swing still goes out, down the left field side.
  assert.equal(hit(-0.04, 0, 0).kind, 'hr');
});

// --- Kart Dash ---------------------------------------------------------------
const kartWorld = (() => {
  const track = kartTrack.buildTrack();
  const scen = kartTrack.scenery(track);
  const obstacles = kartTrack.obstacleGrid([...scen.trees.map(t => ({ ...t, r: t.k })), ...scen.tyres.map(t => ({ ...t, r: 1.25 }))]);
  return { track, scen, obstacles, pads: kartTrack.boostPads(track) };
})();

test('Kart Dash track: a closed loop inside the world, located both ways', () => {
  const { track, scen } = kartWorld;
  assert.ok(track.length > 700 && track.length < 1100, `length ${track.length}`);
  for (let i = 0; i < track.n; i++) {
    assert.ok(track.xs[i] > track.half && track.xs[i] < kartTrack.WORLD - track.half);
    assert.ok(track.zs[i] > track.half && track.zs[i] < kartTrack.WORLD - track.half);
  }
  // Closed: the last sample is a step from the first.
  const gap = Math.hypot(track.xs[0] - track.xs[track.n - 1], track.zs[0] - track.zs[track.n - 1]);
  assert.ok(gap < track.step * 1.5, `gap ${gap}`);
  // pointAt and locate agree, on the road and beside it.
  for (const s of [0, 123.4, track.length * 0.5, track.length - 2]) {
    for (const d of [-6, 0, 4]) {
      const p = kartTrack.pointAt(track, s, d);
      const l = kartTrack.locate(track, p.x, p.z);
      const ds = Math.abs(((l.s - s + track.length * 1.5) % track.length) - track.length / 2);
      assert.ok(ds < 0.6, `s ${s} -> ${l.s}`);
      close(l.d, d, 0.35);
    }
  }
  // Scenery stays off the road, and every grid spot is on it.
  for (const t of scen.trees) assert.ok(kartTrack.distToCentre(track, t.x, t.z) > track.half + 6);
  for (let slot = 0; slot < 4; slot++) {
    const g = kartTrack.gridSpot(track, slot);
    assert.ok(g.s < 0 && Math.abs(kartTrack.locate(track, g.x, g.z).d) < track.half - 1);
  }
  assert.equal(kartTrack.itemBoxes(track).length, 12);
});

test('Kart Dash laps: progress carries over the line, backwards and jumps do not count', () => {
  const L = 900;
  let total = -10, s = L - 10;
  for (let k = 0; k < 3 * L / 3 + 20; k++) {
    const next = (s + 3) % L;
    total = kartTrack.advance(total, s, next, L);
    s = next;
  }
  close(total, -10 + (3 * L / 3 + 20) * 3, 1e-6);
  assert.deepEqual(kartTrack.lapOf(-5, L), { lap: 1, done: 0, finished: false });
  assert.deepEqual(kartTrack.lapOf(L + 1, L), { lap: 2, done: 1, finished: false });
  assert.deepEqual(kartTrack.lapOf(3 * L + 1, L), { lap: 3, done: 3, finished: true });
  // Reversing over the line takes the lap back off.
  assert.equal(kartTrack.advance(L + 2, 2, L - 3, L), L - 3);
  // A jump to another stretch of track is ignored.
  assert.equal(kartTrack.advance(100, 100, 400, L), 100);
});

test('Kart Dash karts: accelerate, slow on grass, steer, drift into a boost, spin out', () => {
  const { track, obstacles, pads } = kartWorld;
  const env = { track, obstacles, pads, raceTime: 0 };
  const k = kartSim.newKart(kartTrack.gridSpot(track, 0));
  for (let i = 0; i < 240; i++) kartSim.stepKart(k, { steer: 0 }, 1 / 60, env);
  assert.ok(k.v > 20 && k.v <= kartSim.VMAX + 1e-6, `speed ${k.v}`);
  // Off the road it slows to grass speed.
  const g = kartSim.newKart({ ...kartTrack.pointAt(track, 20, track.half + 5), s: 20 });
  g.v = kartSim.VMAX;
  for (let i = 0; i < 120; i++) kartSim.stepKart(g, { steer: 0 }, 1 / 60, env);
  assert.ok(g.offroad && g.v < kartSim.OFFROAD + 2, `grass speed ${g.v}`);
  // Steering turns the kart: right is clockwise (heading increases).
  const r = kartSim.newKart({ ...kartTrack.pointAt(track, 40), s: 40 });
  r.v = 20;
  const h0 = r.h;
  for (let i = 0; i < 20; i++) kartSim.stepKart(r, { steer: 1 }, 1 / 60, env);
  assert.ok(kartTrack.wrapAngle(r.h - h0) > 0.3);
  // A long drift ends in a boost.
  const d = kartSim.newKart({ ...kartTrack.pointAt(track, 40), s: 40 });
  d.v = 22;
  let ev = [];
  for (let i = 0; i < 80; i++) kartSim.stepKart(d, { steer: 1, drift: true }, 1 / 60, env);
  assert.equal(d.drift, 1);
  ev = kartSim.stepKart(d, { steer: 0, drift: false }, 1 / 60, env);
  assert.ok(ev.includes('mini') || ev.includes('super'));
  assert.ok(d.boost > 0);
  // Spinning: no steering, speed bleeds away.
  const sp = kartSim.newKart({ ...kartTrack.pointAt(track, 40), s: 40 });
  sp.v = 25;
  sp.spin = kartSim.SPIN_TIME;
  const hs = sp.h;
  for (let i = 0; i < 30; i++) kartSim.stepKart(sp, { steer: 1 }, 1 / 60, env);
  assert.ok(sp.v < 12 && Math.abs(kartTrack.wrapAngle(sp.h - hs)) < 1e-9);
});

test('Kart Dash autopilot drives three laps and the laps count', () => {
  const { track, obstacles, pads } = kartWorld;
  const k = kartSim.newKart(kartTrack.gridSpot(track, 1));
  const brain = { lane: 1, phase: 0.5, skill: 0.6, stuck: 0 };
  let t = 0, laps = 0, off = 0;
  while (!k.finished && t < 200) {
    kartSim.watchStuck(brain, k, 1 / 60);
    const ev = kartSim.stepKart(k, kartSim.autopilot(k, track, brain, t), 1 / 60, { track, obstacles, pads, raceTime: t });
    if (ev.includes('lap') || ev.includes('finish')) laps++;
    if (k.offroad) off++;
    t += 1 / 60;
  }
  assert.equal(laps, 3);
  assert.equal(k.lapTimes.length, 3);
  assert.ok(k.finished > 60 && k.finished < 120, `finished in ${k.finished}`);
  assert.ok(off / 60 < 3, `${(off / 60).toFixed(1)} s off the road`);
});

test('Kart Dash items: leaders get peels and bombs, the back gets boosts and stars', () => {
  const tally = rank => {
    const n = { boost: 0, banana: 0, bomb: 0, star: 0 };
    for (let i = 0; i < 1000; i++) n[kartSim.rollItem(rank, 4, (i + 0.5) / 1000)]++;
    return n;
  };
  const first = tally(0), last = tally(3);
  for (const n of [first, last]) assert.equal(n.boost + n.banana + n.bomb + n.star, 1000);
  assert.ok(first.banana > last.banana && first.star < last.star && first.boost < last.boost);
  assert.ok(first.star < 50 && last.star > 150);
  for (const r of [0, 0.3, 0.999]) assert.ok(kartSim.ITEMS.includes(kartSim.rollItem(1, 4, r)));
  // A bomb flies ahead, bounces, stops and goes off at its fuse, the same everywhere.
  const b = { x: 50, z: 60, h: 0, v: 40 };
  const p1 = kartSim.bombAt(b, 0.5), p2 = kartSim.bombAt(b, 1.4), p3 = kartSim.bombAt(b, kartSim.BOMB_FUSE);
  assert.ok(p1.x > 50 && p2.x > p1.x && Math.abs(p1.z - 60) < 1e-9);
  close(p3.x, kartSim.bombAt(b, 1.3).x, 1e-9);
  assert.equal(p3.done, true);
  assert.equal(p2.done, false);
  assert.deepEqual(kartSim.bombAt(b, 0.9), kartSim.bombAt(b, 0.9));
  // Standings: finishers by time, then distance.
  const order = kartSim.standings([{ id: 'a', total: 500, finished: 0 }, { id: 'b', total: 2700, finished: 80 }, { id: 'c', total: 900, finished: 0 }, { id: 'd', total: 2700, finished: 75 }]);
  assert.deepEqual(order.map(k => k.id), ['d', 'b', 'c', 'a']);
});

test('Kart Dash late joiners: a safe spot behind the last kart, ranked by progress', () => {
  const { track, obstacles } = kartWorld;
  const L = track.length;
  const at = (s, d = 0, extra = {}) => ({ ...kartTrack.pointAt(track, s, d), total: s, finished: 0, ...extra });
  const onRoad = p => {
    const l = kartTrack.locate(track, p.x, p.z);
    return Math.abs(l.d) < track.half - 2 && !obstacles.near(p.x, p.z).some(o => Math.hypot(o.x - p.x, o.z - p.z) < (o.r ?? 1.3) + kartSim.KART_R);
  };
  const clearOf = (p, list, r) => list.every(k => Math.hypot(k.x - p.x, k.z - p.z) >= r);
  // A spread field: the spot is on the centre line about 12 m behind the rearmost kart.
  const field = [at(400, 2), at(310, -3), at(250, 3.5), at(520)];
  const a = kartTrack.lateSpot(track, field);
  assert.ok(a.s < 250 - 10 && a.s > 250 - 20 && a.d === 0, `spot ${a.s.toFixed(1)} m, side ${a.d}`);
  assert.ok(onRoad(a) && clearOf(a, field, 4.5));
  close(a.h, kartTrack.pointAt(track, a.s).h, 1e-9);
  // The spot is taken (a kart sitting there): it moves to one side or further back, still clear and on the road.
  const blocked = [...field, at(238, 0), at(238, -3.5), at(238, 3.5)];
  const b = kartTrack.lateSpot(track, blocked);
  assert.ok(b.s < 250 && onRoad(b) && clearOf(b, blocked, 4.5), `spot ${b.s.toFixed(1)} m, side ${b.d}`);
  // Banana peels count as taken too.
  const peels = [kartTrack.pointAt(track, 238, 0)];
  const c = kartTrack.lateSpot(track, field, peels);
  assert.ok(clearOf(c, peels, 3.5) && onRoad(c));
  // Finished karts don't set the back of the field (but are still kept clear of).
  const d = kartTrack.lateSpot(track, [at(3 * L + 5, 0, { finished: 70 }), at(600)]);
  assert.ok(d.s < 600 && d.s > 570);
  // Just after the start, behind the grid: a negative total, still lap 1 and on the road.
  const grid = [0, 1, 2, 3].map(i => ({ ...kartTrack.gridSpot(track, i), total: kartTrack.gridSpot(track, i).s, finished: 0 }));
  const e = kartTrack.lateSpot(track, grid);
  assert.ok(e.s < Math.min(...grid.map(g => g.total)) && onRoad(e) && clearOf(e, grid, 4.5));
  assert.equal(kartTrack.lapOf(e.s, L).lap, 1);
  // The rearmost kart on lap 2: the joiner starts on lap 1, physically just behind it, so a lap down.
  const f = kartTrack.lateSpot(track, [at(L + 40), at(L + 300)]);
  assert.ok(f.s >= 0 && f.s < L && kartTrack.lapOf(f.s, L).lap === 1);
  const fp = kartTrack.pointAt(track, L + 40);
  const dist = Math.hypot(f.x - fp.x, f.z - fp.z);
  assert.ok(dist > 8 && dist < 20, `${dist.toFixed(1)} m behind`);
  // A kart there starts last and is timed from its own start.
  const late = kartSim.newKart({ ...kartTrack.pointAt(track, a.s, a.d), s: a.s }, { partial: true });
  assert.equal(late.total, a.s);
  assert.equal(kartSim.standings([...field.map((k, i) => ({ id: 'k' + i, ...k })), { id: 'late', ...late }]).at(-1).id, 'late');

  // Standings with a late joiner: by progress while racing, by when they actually crossed once finished.
  const order = kartSim.standings([
    { id: 'early', total: 3 * L, finished: 90, start: 0 },    // crossed at 90 s
    { id: 'late', total: 3 * L, finished: 70, start: 30 },    // started 30 s in, crossed at 100 s
    { id: 'bot', total: 2.5 * L, finished: 0, start: 0 },
    { id: 'late2', total: 2.6 * L, finished: 0, start: 12 },  // further round than the bot
  ]);
  assert.deepEqual(order.map(k => k.id), ['early', 'late', 'late2', 'bot']);
  // A late start's first lap is only part of a lap: it isn't a best lap.
  assert.equal(kartSim.bestLap({ lapTimes: [12, 40, 38], partial: true }), 38);
  assert.equal(kartSim.bestLap({ lapTimes: [12, 40, 38] }), 12);
  assert.equal(kartSim.bestLap({ lapTimes: [9], partial: true }), 0);

  // Joining stays open until someone finishes or the race is nearly over.
  assert.equal(kartSim.lateJoinOpen({ raceTime: 5, leadTotal: 100, length: L }), true);
  assert.equal(kartSim.lateJoinOpen({ raceTime: -1, leadTotal: 0, length: L }), false);
  assert.equal(kartSim.lateJoinOpen({ raceTime: 80, firstFinish: 78, leadTotal: 3 * L, length: L }), false);
  assert.equal(kartSim.lateJoinOpen({ raceTime: 60, leadTotal: 3 * L - 100, length: L }), false); // ~4 s from the line
  assert.equal(kartSim.lateJoinOpen({ raceTime: 60, leadTotal: 3 * L - 500, length: L }), true);
  assert.equal(kartSim.lateJoinOpen({ raceTime: kartSim.LATE.maxTime - 10, leadTotal: 100, length: L }), false);
});

test('Kart Dash holds two items: a box fills the next slot, using takes the first', () => {
  const { track } = kartWorld;
  const k = kartSim.newKart(kartTrack.gridSpot(track, 0));
  assert.deepEqual(k.items, []);
  assert.equal(kartSim.itemReady(k), false);
  assert.equal(kartSim.takeItem(k), null);
  // The first box: rolling, not usable until it stops.
  assert.equal(kartSim.addItem(k, 'banana'), true);
  assert.ok(k.roll > 0);
  assert.equal(kartSim.itemReady(k), false);
  assert.equal(kartSim.takeItem(k), null);
  k.roll = 0;
  // The second box fills slot two; the first can be used while it rolls.
  assert.equal(kartSim.addItem(k, 'bomb'), true);
  assert.deepEqual(k.items, ['banana', 'bomb']);
  assert.equal(kartSim.itemReady(k), true);
  // A third box gives nothing; unknown items are refused.
  assert.equal(kartSim.addItem(k, 'star'), false);
  assert.equal(kartSim.addItem({ items: [] }, 'shell'), false);
  assert.equal(k.items.length, kartSim.ITEM_SLOTS);
  // Using takes the first and the second moves up (still rolling, so it waits).
  assert.equal(kartSim.takeItem(k), 'banana');
  assert.deepEqual(k.items, ['bomb']);
  assert.equal(kartSim.takeItem(k), null);
  k.roll = 0;
  assert.equal(kartSim.takeItem(k), 'bomb');
  assert.deepEqual(k.items, []);
  // A slot freed by using fills again.
  assert.equal(kartSim.addItem(k, 'star', 0), true);
  assert.equal(kartSim.takeItem(k), 'star');
});

test('Kart Dash touch steering: drag from the touch-down point, anchor follows, drag down brakes', () => {
  const W = 400, H = 720;                       // a phone-sized seat
  const r = kartSim.touchLock(W, H), b = kartSim.touchBrake(W, H);
  close(r, 56, 1e-9);                           // 14% of the shorter side
  close(b, 72, 1e-9);                           // 10% of the height
  assert.equal(kartSim.touchLock(2000, 1200), kartSim.TOUCH.lockMax);
  assert.equal(kartSim.touchLock(200, 300), kartSim.TOUCH.lockMin);
  const d0 = { x0: 200, y0: 500, brake: false };
  const at = (dx, dy = 0, d = d0) => kartSim.dragSteer(d, d.x0 + dx, d.y0 + dy, W, H);
  // The dead zone, then a gentle curve: half the lock is less than half the steer, full lock is 1.
  assert.equal(at(2).steer, 0);
  assert.equal(at(-2).steer, 0);
  const half = at(r / 2).steer;
  assert.ok(half > 0.2 && half < 0.5, `half drag steers ${half}`);
  close(at(-r / 2).steer, -half, 1e-12);
  close(at(r).steer, 1, 1e-12);
  close(at(-r).steer, -1, 1e-12);
  // Monotonic.
  let last = -Infinity;
  for (let dx = -r * 1.5; dx <= r * 1.5; dx += 2) { const s = at(dx).steer; assert.ok(s >= last - 1e-12); last = s; }
  // It steers from where the finger went down, not the screen centre.
  assert.equal(kartSim.dragSteer({ x0: 20, y0: 500, brake: false }, 20, 500, W, H).steer, 0);
  assert.ok(kartSim.dragSteer({ x0: 20, y0: 500, brake: false }, 60, 500, W, H).steer > 0.5);
  // Past full lock the anchor follows, so coming back turns the other way at once.
  const far = at(r + 40);
  assert.equal(far.steer, 1);
  close(far.x0, d0.x0 + 40, 1e-9);
  const back = kartSim.dragSteer(far, d0.x0 + 40, 500, W, H);
  assert.equal(back.steer, 0);
  assert.ok(kartSim.dragSteer(far, d0.x0, 500, W, H).steer < -0.5);
  // Dragging well down brakes; a little down does not; sliding back up past half releases.
  assert.equal(at(0, b * 0.8).brake, false);
  const br = at(10, b + 4);
  assert.equal(br.brake, true);
  assert.ok(br.steer > 0, 'it still steers while braking');
  assert.equal(kartSim.dragSteer(br, 210, d0.y0 + b * 0.7, W, H).brake, true);
  assert.equal(kartSim.dragSteer(br, 210, d0.y0 + b * 0.3, W, H).brake, false);
  // The anchor follows the finger up, so dragging down from higher up brakes too.
  const up = at(0, -100);
  assert.equal(up.y0, d0.y0 - 100);
  assert.equal(kartSim.dragSteer(up, 200, d0.y0 - 100 + b + 2, W, H).brake, true);
});

test('Kart Dash network karts are packed small and checked on arrival', () => {
  const { track } = kartWorld;
  const k = kartSim.newKart(kartTrack.gridSpot(track, 0));
  k.spin = 0.5;
  k.star = 2;
  k.drift = 1;
  k.charge = 1.2;
  const a = kartSim.packKart(k);
  assert.equal(a.length, 7);
  const u = kartSim.unpackKart(a);
  close(u.x, k.x, 0.01);
  assert.equal(u.fl, 1 | 4 | 8 | 16 | 32);
  assert.equal(kartSim.unpackKart(null), null);
  assert.equal(kartSim.unpackKart([1, 2, 3]), null);
  assert.equal(kartSim.unpackKart([1, 2, 3, 4, 5, 6, 'x']), null);
  assert.equal(kartSim.unpackKart([1e6, 2, 3, 4, 5, 6, 0]), null);
  assert.equal(kartSim.unpackKart([10, 20, 0, 999, 0, 0, 0]).v, 60);
});

test('Copy Cat: puffed cheeks against the resting face, and one eye shut', async () => {
  const { _logic: C } = await import('../games/copycat.js');
  // A face whose lower cheeks are `w` wide, with eye corners 100 apart.
  const face = (w, extra = {}) => {
    const pts = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
    pts[33] = { x: -50, y: 0 }; pts[263] = { x: 50, y: 0 };
    pts[132] = { x: -w / 2, y: 60 }; pts[361] = { x: w / 2, y: 60 };
    pts[58] = { x: -w / 2 * 0.9, y: 90 }; pts[288] = { x: w / 2 * 0.9, y: 90 };
    return { pts, mouthOpen: 0, smile: 0, cheekPuff: 0, blinkL: 0, blinkR: 0, ...extra };
  };
  const puff = C.EXPRS.find(e => e.text.startsWith('Puff'));
  C.puff.base = 0;
  for (let i = 0; i < 60; i++) C.trackPuff(face(140));
  assert.ok(puff.get() < 0.1, 'resting face is not a puff');
  for (let i = 0; i < 10; i++) C.trackPuff(face(147));   // 5% wider, a third of a second
  assert.ok(puff.get() > puff.thr, `puffed cheeks count (${puff.get().toFixed(2)})`);
  C.trackPuff(face(147, { mouthOpen: 0.6 }));
  assert.ok(puff.get() < puff.thr, 'an open mouth is not a puff');
  C.trackPuff(face(140, { cheekPuff: 0.3 }));
  assert.ok(puff.get() > puff.thr, 'the tracker\'s own cheekPuff still counts');
  const eye = C.EXPRS.find(e => e.text.startsWith('Close one eye'));
  assert.ok(eye.get(face(140, { blinkL: 0.9, blinkR: 0.1 })) > eye.thr);
  assert.ok(eye.get(face(140, { blinkL: 0.9, blinkR: 0.85 })) < eye.thr, 'both eyes shut is not one eye');
  assert.ok(eye.get(face(140, { blinkL: 0.45, blinkR: 0.15 })) > eye.thr, 'a half-hearted wink with the other eye squinting still counts');
  assert.ok(eye.get(face(140, { blinkL: 0.15, blinkR: 0.08 })) < eye.thr, 'resting eyes are not a wink');
  // By the eyelids: one gap a third of the other's, with blink scores that missed it.
  const lids = (l, r) => {
    const f = face(140);
    const eye = ([top, bottom, a, b], cx, gap) => {
      f.pts[a] = { x: cx - 15, y: 0 }; f.pts[b] = { x: cx + 15, y: 0 };
      f.pts[top] = { x: cx, y: -gap / 2 }; f.pts[bottom] = { x: cx, y: gap / 2 };
    };
    eye(C.LIDS.l, -35, l); eye(C.LIDS.r, 35, r);
    return f;
  };
  assert.ok(eye.get(lids(3, 9)) > eye.thr, 'one eyelid gap well under the other counts');
  assert.ok(eye.get(lids(8, 9)) < eye.thr, 'two open eyes are not a wink');
  assert.ok(eye.get(lids(1, 1.2)) < eye.thr, 'two shut eyes are not a wink');
  assert.ok(!C.EXPRS.some(e => /both eyes|Wink/.test(e.text)));
});

test('Block Drop: shapes, SRS rotation and wall kicks', async () => {
  const B = (await import('../games/blocks.js'))._logic;
  // Every piece has four cells in every rotation.
  for (let t = 0; t < 7; t++) for (let r = 0; r < 4; r++) assert.equal(B.cellsOf(t, r).length, 4);
  const key = cells => cells.map(c => c.join(',')).sort().join(' ');
  // T: spawn points up; clockwise it points right.
  assert.equal(key(B.cellsOf(2, 0)), key([[1, 0], [0, 1], [1, 1], [2, 1]]));
  assert.equal(key(B.cellsOf(2, 1)), key([[1, 0], [1, 1], [2, 1], [1, 2]]));
  // I lies in row 1 of its box, then stands in column 2 (SRS).
  assert.equal(key(B.cellsOf(0, 1)), key([[2, 0], [2, 1], [2, 2], [2, 3]]));
  assert.equal(key(B.cellsOf(0, 2)), key([[0, 2], [1, 2], [2, 2], [3, 2]]));
  // O never changes.
  assert.equal(key(B.cellsOf(1, 3)), key(B.cellsOf(1, 0)));
  // Kick tables are the SRS ones (y up): spot-check a few entries.
  assert.deepEqual(B.kicksFor(2, 0, 1), [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]);
  assert.deepEqual(B.kicksFor(0, 0, 1), [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]]);
  assert.deepEqual(B.kicksFor(0, 3, 0), [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]);
  // In open space a turn needs no kick.
  const s = B.newWell(1);
  s.cur = { t: 2, r: 0, x: 3, y: 10 };
  assert.deepEqual(B.rotate(s, 1), [0, 0]);
  assert.equal(s.cur.r, 1);
  assert.deepEqual(B.rotate(s, -1), [0, 0]);
  assert.equal(s.cur.r, 0);
  // Against the left wall: a standing I in column 0 turning flat kicks right.
  s.board = B.emptyBoard();
  s.cur = { t: 0, r: 3, x: -1, y: 10 };
  assert.ok(B.fits(s.board, 0, 3, -1, 10));
  assert.deepEqual(B.rotate(s, 1), [1, 0]);    // 3 -> 0: (0,0) fails, (+1,0) fits
  assert.equal(s.cur.r, 0);
  assert.ok(B.cellsOf(0, 0).every(([cx]) => s.cur.x + cx >= 0));
  // A T against the right wall pointing left kicks off the wall to turn.
  s.cur = { t: 2, r: 3, x: 8, y: 10 };
  assert.ok(B.fits(s.board, 2, 3, 8, 10));
  assert.deepEqual(B.rotate(s, -1), [-1, 0]);  // 3 -> 2
  // On cluttered boards a turn always takes the first kick in the table that fits.
  const rnd = B.mulberry32(5);
  let kicked = 0;
  for (let i = 0; i < 3000; i++) {
    const w = B.newWell(1);
    w.board = B.emptyBoard().map((row, y) => row.map(() => (y > 6 && rnd() < 0.35 ? 8 : 0)));
    const t = Math.floor(rnd() * 7), r = Math.floor(rnd() * 4), x = Math.floor(rnd() * 10) - 2, y = Math.floor(rnd() * 18) + 2;
    if (!B.fits(w.board, t, r, x, y)) continue;
    const dir = rnd() < 0.5 ? 1 : -1, to = (r + (dir > 0 ? 1 : 3)) % 4;
    w.cur = { t, r, x, y };
    const want = t === 1 ? null : B.kicksFor(t, r, to).find(([kx, ky]) => B.fits(w.board, t, to, x + kx, y - ky)) || null;
    const got = B.rotate(w, dir);
    assert.deepEqual(got, want);
    if (got) { assert.deepEqual([w.cur.r, w.cur.x, w.cur.y], [to, x + got[0], y - got[1]]); if (got[0] || got[1]) kicked++; }
    else assert.deepEqual([w.cur.r, w.cur.x, w.cur.y], [r, x, y]);
  }
  assert.ok(kicked > 50, `kicks were exercised (${kicked})`);
  // Can't turn at all when boxed in.
  const box = B.newWell(1);
  box.board = B.emptyBoard().map(row => row.map(() => 8));
  for (const [cx, cy] of B.cellsOf(4, 0)) box.board[10 + cy][3 + cx] = 0;
  box.cur = { t: 4, r: 0, x: 3, y: 10 };
  assert.equal(B.rotate(box, 1), null);
  assert.equal(box.cur.r, 0);
});

test('Block Drop: line clears, scoring, levels, lock delay and hold', async () => {
  const B = (await import('../games/blocks.js'))._logic;
  const { TOTAL, COLS } = B;
  const s = B.newWell(7);
  // Two rows full but for the two cells an O fills.
  for (const y of [TOTAL - 1, TOTAL - 2]) s.board[y] = [8, 8, 8, 8, 0, 0, 8, 8, 8, 8];
  s.board[TOTAL - 3] = [8, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  s.cur = { t: 1, r: 0, x: 3, y: 1 };   // O cells in columns 4-5
  const dist = B.hardDrop(s);
  assert.equal(dist, TOTAL - 3);
  const clear = s.events.find(e => e.type === 'clear');
  assert.ok(clear, 'a clear');
  assert.equal(clear.lines, 2);
  assert.equal(clear.pts, 300);
  assert.equal(clear.attack, 1);
  assert.equal(s.score, 300 + 2 * dist);
  assert.ok(s.clear, 'the rows flash first');
  assert.equal(s.cur, null);
  B.tick(s, B.CLEAR_T + 0.01);
  assert.equal(s.clear, null);
  assert.ok(s.cur, 'the next piece comes after the flash');
  assert.deepEqual(s.board[TOTAL - 1], [8, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'the rows above fall into place');
  assert.equal(s.board[TOTAL - 2].some(v => v), false);
  // fullRows / removeRows.
  const b = B.emptyBoard();
  b[TOTAL - 1] = new Array(COLS).fill(3);
  b[TOTAL - 3] = new Array(COLS).fill(4);
  b[TOTAL - 2][0] = 5;
  assert.deepEqual(B.fullRows(b), [TOTAL - 3, TOTAL - 1]);
  const after = B.removeRows(b, [TOTAL - 3, TOTAL - 1]);
  assert.equal(after.length, TOTAL);
  assert.equal(after[TOTAL - 1][0], 5);
  // Points: 100/300/500/800 x level, a back-to-back 4-row clear x1.5, combos add 50 x combo x level.
  assert.deepEqual([1, 2, 3, 4].map(n => B.pointsFor(n, 1, 0, false)), [100, 300, 500, 800]);
  assert.equal(B.pointsFor(4, 2, 0, true), 2400);
  assert.equal(B.pointsFor(1, 3, 2, false), 300 + 300);
  // A chain of clears builds the combo.
  const ch = B.newWell(2);
  for (let k = 0; k < 3; k++) {
    ch.board = B.emptyBoard();
    ch.board[TOTAL - 1] = [8, 8, 8, 8, 0, 0, 8, 8, 8, 8];
    ch.board[TOTAL - 2] = [8, 8, 8, 8, 0, 0, 8, 8, 8, 8];
    ch.cur = { t: 1, r: 0, x: 3, y: 1 };
    B.hardDrop(ch);
    B.tick(ch, 1);
  }
  const combos = ch.events.filter(e => e.type === 'clear').map(e => [e.combo, e.attack]);
  assert.deepEqual(combos, [[0, 1], [1, 2], [2, 2]]);
  // Levels go up every ten lines, and the pieces fall faster.
  assert.ok(B.gravity(1) === 1 && B.gravity(2) < 1 && B.gravity(10) < 0.2);
  const lv = B.newWell(3);
  lv.lines = 9;
  lv.board[TOTAL - 1] = [8, 8, 8, 8, 0, 0, 8, 8, 8, 8];
  lv.cur = { t: 1, r: 0, x: 3, y: 1 };
  B.hardDrop(lv);
  assert.equal(lv.level, 2);
  assert.ok(lv.events.some(e => e.type === 'clear' && e.level === 2));
  // Lock delay: a piece on the floor locks after LOCK_DELAY; a move renews it.
  const ld = B.newWell(5);
  ld.cur = { t: 2, r: 0, x: 3, y: TOTAL - 2 };
  B.tick(ld, B.LOCK_DELAY * 0.8);
  assert.ok(ld.cur && ld.placed === 0, 'still sliding');
  assert.ok(B.move(ld, 1));
  B.tick(ld, B.LOCK_DELAY * 0.8);
  assert.equal(ld.placed, 0, 'the move renewed the lock delay');
  B.tick(ld, B.LOCK_DELAY * 0.3);
  assert.equal(ld.placed, 1, 'then it locks');
  // Soft drop falls fast and scores a point a row.
  const sd = B.newWell(5);
  const y0 = sd.cur.y;
  B.tick(sd, 0.2, true);
  assert.ok(sd.cur.y - y0 >= 3 && sd.score === sd.cur.y - y0);
  // Hold swaps once per piece.
  const hs = B.newWell(9);
  const first = hs.cur.t, second = B.nextPieces(hs, 1)[0];
  assert.ok(B.hold(hs));
  assert.equal(hs.hold, first);
  assert.equal(hs.cur.t, second);
  assert.equal(B.hold(hs), false, 'only once until the piece locks');
  B.hardDrop(hs);
  B.tick(hs, 1);
  assert.ok(B.hold(hs));
  assert.equal(hs.cur.t, first, 'the held piece comes back');
});

test('Block Drop: the 7-bag is the same for the same seed', async () => {
  const B = (await import('../games/blocks.js'))._logic;
  const a = B.makeBag(123456), b = B.makeBag(123456), c = B.makeBag(654321);
  const seq = bag => Array.from({ length: 70 }, (_, i) => bag.at(i));
  assert.deepEqual(seq(a), seq(b));
  assert.notDeepEqual(seq(a), seq(c));
  // Each run of seven holds every piece once.
  const s = seq(a);
  for (let i = 0; i < 70; i += 7) assert.deepEqual(s.slice(i, i + 7).sort(), [0, 1, 2, 3, 4, 5, 6]);
  // Wells from the same seed deal the same pieces, holding or not.
  const w1 = B.newWell(99), w2 = B.newWell(99);
  B.hold(w2);
  for (let i = 0; i < 12; i++) { B.hardDrop(w1); B.tick(w1, 1); B.hardDrop(w2); B.tick(w2, 1); }
  const n = Math.min(w1.dealt.length, w2.dealt.length);
  assert.ok(n >= 10);
  assert.deepEqual(w1.dealt.slice(0, n), w2.dealt.slice(0, n));
});

test('Block Drop: garbage maths, targets and topping out', async () => {
  const B = (await import('../games/blocks.js'))._logic;
  const { TOTAL, GARBAGE } = B;
  assert.deepEqual([1, 2, 3, 4].map(n => B.attackFor(n, 0)), [0, 1, 2, 4]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 9, 20].map(B.comboBonus), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(B.attackFor(2, 3), 1 + 2);
  assert.equal(B.attackFor(0, 5), 0);
  // Targets: the only other player; with more, whoever leads; never anyone out.
  assert.equal(B.pickTarget('a', [{ id: 'a', sc: 9 }, { id: 'b', sc: 0 }]), 'b');
  assert.equal(B.pickTarget('a', [{ id: 'b', sc: 10 }, { id: 'c', sc: 50 }, { id: 'd', sc: 50 }]), 'c');
  assert.equal(B.pickTarget('a', [{ id: 'b', sc: 10 }, { id: 'c', sc: 50, ko: true }]), 'b');
  assert.equal(B.pickTarget('a', [{ id: 'c', ko: true }]), null);
  // Garbage waits, then rises with one gap when a piece locks without a clear.
  const s = B.newWell(4);
  assert.equal(B.receive(s, 3, 6), 3);
  assert.equal(B.pending(s), 3);
  assert.equal(B.receive(s, 13, 1), 0, 'too many at once');
  assert.equal(B.receive(s, 2, 10), 0, 'gap outside the well');
  B.hardDrop(s);
  assert.equal(B.pending(s), 0);
  const rows = s.board.filter(r => r.includes(GARBAGE));
  assert.equal(rows.length, 3);
  for (const r of rows) { assert.equal(r[6], 0); assert.equal(r.filter(v => v === GARBAGE).length, 9); }
  assert.ok(s.events.some(e => e.type === 'garbage' && e.n === 3));
  // A clear cancels waiting garbage before sending any.
  const c = B.newWell(4);
  B.receive(c, 2, 0);
  for (const y of [TOTAL - 1, TOTAL - 2, TOTAL - 3, TOTAL - 4]) c.board[y] = [8, 8, 8, 8, 8, 8, 8, 8, 8, 0];
  c.cur = { t: 0, r: 1, x: 7, y: 2 };   // a standing I in column 9
  B.hardDrop(c);
  const e = c.events.find(x => x.type === 'clear');
  assert.equal(e.lines, 4);
  assert.equal(e.cancelled, 2);
  assert.equal(e.attack, 2, '4 rows send 4, less the 2 cancelled');
  assert.equal(B.pending(c), 0);
  // At most MAX_PENDING rows can wait.
  const m = B.newWell(4);
  for (let i = 0; i < 5; i++) B.receive(m, 6, 0);
  assert.equal(B.pending(m), B.MAX_PENDING);
  // Garbage pushing blocks out of the top tops you out.
  const top = B.emptyBoard();
  top[0][0] = 3;
  assert.equal(B.addGarbage(top, 2, 5).top, true);
  assert.equal(B.addGarbage(B.emptyBoard(), 2, 5).top, false);
  // A piece that can't appear tops you out.
  const o = B.newWell(4);
  o.board = B.emptyBoard().map((row, y) => row.map((_, x) => (x === (y % 2 ? 0 : 9) ? 0 : 8)));
  o.cur = null;
  B.spawn(o, null);
  assert.equal(o.over, true);
  assert.ok(o.events.some(x => x.type === 'over'));
  // Rate limit: at most ATTACK_RATE rows in ATTACK_WINDOW.
  const log = [];
  let sent = 0;
  for (let i = 0; i < 10; i++) if (B.rateOk(log, 4, 1000 + i * 10)) sent += 4;
  assert.ok(sent <= B.ATTACK_RATE && sent > 0);
  assert.ok(B.rateOk(log, 4, 1100 + B.ATTACK_WINDOW + 200), 'and again once the window has passed');
});

test('Block Drop: packing and checking network state', async () => {
  const B = (await import('../games/blocks.js'))._logic;
  const { TOTAL, ROWS, COLS } = B;
  const s = B.newWell(11);
  assert.equal(B.packBoard(s.board), '');
  s.board[TOTAL - 1] = [1, 2, 3, 4, 5, 6, 7, 8, 0, 1];
  s.board[TOTAL - 3][4] = 3;
  const packed = B.packBoard(s.board);
  assert.equal(packed.length, 30);
  const rows = B.unpackBoard(packed);
  assert.equal(rows.length, ROWS);
  assert.deepEqual(rows[ROWS - 1], s.board[TOTAL - 1]);
  assert.deepEqual(rows[ROWS - 3], s.board[TOTAL - 3]);
  for (const bad of [null, 5, '12', '9'.repeat(10), 'a'.repeat(10), '0'.repeat(COLS * ROWS + 10)]) assert.equal(B.unpackBoard(bad), null, String(bad));
  // A player's state.
  const ok = B.readPlayer({ r: 3, b: packed, p: [2, 1, 4, 5], sc: 1200, ln: 7, lv: 1, ko: 0, g: 2, hd: 4 });
  assert.equal(ok.r, 3);
  assert.deepEqual(ok.p, { t: 2, r: 1, x: 4, y: 5 });
  assert.equal(ok.hd, 4);
  assert.equal(ok.ko, false);
  assert.equal(B.readPlayer({ r: 0, b: '' }), null);
  assert.equal(B.readPlayer({ r: 1, b: 'xx' }), null);
  assert.equal(B.readPlayer(null), null);
  const odd = B.readPlayer({ r: 1, b: '', p: [9, 0, 0, 0], sc: -5, ln: 'a', lv: 1e9, g: 999, hd: 7, ko: 'yes' });
  assert.equal(odd.p, null);
  assert.equal(odd.sc, 0);
  assert.equal(odd.ln, 0);
  assert.equal(odd.lv, 999);
  assert.equal(odd.g, B.MAX_PENDING);
  assert.equal(odd.hd, -1);
  assert.equal(odd.ko, false);
  // The owner's round.
  const sh = B.readShared({ v: 1, r: 2, seed: 77, at: 1000, ph: 'play', pl: ['a', 'b', 'a', 5], win: '', wn: '', next: 0 });
  assert.deepEqual(sh.pl, ['a', 'b']);
  assert.equal(B.readShared({ v: 1, r: 2, seed: -1, at: 1, ph: 'play' }), null);
  assert.equal(B.readShared({ v: 1, r: 2, seed: 1, at: 1, ph: 'later' }), null);
  assert.equal(B.readShared({ v: 2, r: 2, seed: 1, at: 1, ph: 'play' }), null);
  assert.equal(B.readShared({ v: 1, r: 1, seed: 1, at: 1, ph: 'done', wn: 'x'.repeat(80) }).wn.length, 24);
  // Garbage messages.
  assert.deepEqual(B.readAttack({ r: 1, to: 'b', n: 4, h: 3 }), { r: 1, to: 'b', n: 4, h: 3 });
  for (const bad of [{ r: 1, to: 'b', n: 0, h: 3 }, { r: 1, to: 'b', n: 13, h: 3 }, { r: 1, to: 'b', n: 2, h: 10 }, { r: 1, to: '', n: 2, h: 1 }, { r: 1.5, to: 'b', n: 2, h: 1 }, null])
    assert.equal(B.readAttack(bad), null, JSON.stringify(bad));
});

test('Block Drop: the bot finds a sensible place, and layouts fit', async () => {
  const B = (await import('../games/blocks.js'))._logic;
  const { TOTAL } = B;
  const s = B.newWell(1);
  // A well with a slot only a standing I fills, clearing four rows.
  for (const y of [TOTAL - 1, TOTAL - 2, TOTAL - 3, TOTAL - 4]) s.board[y] = [8, 8, 8, 8, 8, 8, 8, 8, 8, 0];
  s.cur = { t: 0, r: 0, x: 3, y: 1 };
  const best = B.placements(s)[0];
  const cols = B.cellsOf(0, best.r).map(([cx]) => best.x + cx);
  assert.ok(cols.every(x => x === 9), `the I goes in the slot (${JSON.stringify(best)})`);
  // Layouts fit the well and its side columns on a phone, upright and sideways.
  for (const [w, h, n] of [[390, 690, 0], [390, 690, 1], [390, 690, 2], [390, 690, 5], [844, 390, 3], [1000, 700, 1]]) {
    const L = B.computeLayout(w, h, { top: 0, bottom: 0 }, n);
    const inside = r => r.x >= 0 && r.y >= 0 && r.x + r.w <= w + 1 && r.y + (r.h ?? 0) <= h + 1;
    for (const r of [L.hold, L.next, L.stats, { x: L.wx, y: L.wy, w: L.wellW, h: L.wellH }, L.head]) assert.ok(inside(r), `layout ${w}x${h} n=${n}: ${JSON.stringify(r)}`);
    assert.ok(L.cell >= 16, `cells big enough (${L.cell}) at ${w}x${h} n=${n}`);
    assert.equal(L.slots.length, n);
    for (const sl of L.slots) assert.ok(sl.x >= 0 && sl.x + sl.w <= w + 1 && sl.y + sl.h <= h + 1, `slot inside ${w}x${h} n=${n}`);
  }
});
