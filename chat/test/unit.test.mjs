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

test('every listed effect and game has a file', () => {
  const fx = readdirSync(new URL('../effects/', import.meta.url));
  const games = readdirSync(new URL('../games/', import.meta.url));
  for (const id of EFFECT_IDS) assert.ok(fx.includes(`${id}.js`), `effects/${id}.js`);
  for (const id of GAME_IDS) assert.ok(games.includes(`${id}.js`), `games/${id}.js`);
  assert.equal(EFFECT_IDS.length, 75);
  assert.equal(new Set(EFFECT_IDS).size, 75);
  assert.equal(GAME_IDS.length, 22);
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
