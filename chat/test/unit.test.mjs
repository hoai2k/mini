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
  assert.equal(GAME_IDS.length, 21);
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
