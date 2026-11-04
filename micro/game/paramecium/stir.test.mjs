// Stirring the drop and the gradient toward the portal, without a browser:
// the jab's push wave shoves a diatom (it slides and spins, by its mass), a
// strong wave cracks an empty frustule and tumbles a live one; a clump
// crumbles once struck hard enough for its size (one with a Vorticella
// colony only wobbles); a filament bends and springs back; a Vorticella
// snaps shut and recoils, and one struck open knocks loose food; the body
// shoves what it swims through; the gradient rises toward the portal and
// the richer scenery shows only there.
//   node --test micro/game/paramecium/stir.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, richAt, RICH, TILE } from './world.js';
import { makeWave, stepWaves, stepStir, bodyShove, shove, waveFront, WAVE } from './stir.js';
import { createSwimState, stepSwim } from './swim.js';

const DT = 1 / 60;
/** A swimmer 60 µm short of (x, y), at depth z, facing it (the wave starts at its oral end, 60 µm ahead). */
const facing = (x, y, z, back = 110) => { const S = createSwimState(x - back, y, 0, z); return S; };
/** Run waves until they are done, stepping the stir too; returns every event. */
function run(W, waves, sec = 1.2) {
  const ev = [];
  for (let t = 0; t < sec; t += DT) { ev.push(...stepWaves(W, waves, DT, t)); stepStir(W, DT); }
  return ev;
}
/** A world with one diatom (the first, live) put at (0, 0) facing across the wave, nothing else in reach. */
function worldWith(kind, pick = (list) => list[0]) {
  const W = createWorld(11);
  const it = pick(W[kind]);
  // keep only this item in its list (the rest of the scenery out of the way)
  for (const k of ['diatoms', 'clumps', 'flocs', 'vorticella', 'filaments']) W[k].splice(0, W[k].length, ...(W[k] === W[kind] ? [it] : []));
  it.box = [-3000, -3000, 3000, 3000]; // (moved by the tests: met anywhere near the start)
  return { W, it };
}

test('a jab\'s wave runs out ahead and shoves a diatom aside: it slides away and spins, a heavier one less', () => {
  const moved = [];
  for (const L of [60, 110]) {
    const { W, it } = worldWith('diatoms', (l) => l.find((d) => !d.rect && !d.empty));
    Object.assign(it, { x: 0, y: 0, z: 0, a: Math.PI / 2 + 0.3, L, W: L * 0.22, glide: 0, m: (L * L * 0.22) / 1100 });
    const S = facing(it.x + 40, it.y + 20, 0); // a little off its middle: it turns as well as slides
    const ev = run(W, [makeWave(S)]);
    const s = W.dynOf(it, 0, 0);
    assert.ok(ev.some((e) => e.type === 'push' && e.kind === 'diatom'), 'the wave reached it');
    assert.ok(s && s.x > 4, `pushed away from the cell (dx ${s && s.x.toFixed(1)} µm)`);
    assert.ok(Math.abs(s.a) > 0.01, `and turned (${s.a.toFixed(3)} rad)`);
    assert.ok(!s.cracked, 'a plain jab cracks nothing');
    moved.push(Math.hypot(s.x, s.y));
  }
  assert.ok(moved[0] > moved[1] * 1.5, `the light one went further (${moved.map((m) => m.toFixed(0)).join(' vs ')} µm)`);
});

test('a strong wave (X in a dash) cracks an empty frustule (food spills), and only tumbles a live one', () => {
  for (const empty of [true, false]) {
    const { W, it } = worldWith('diatoms', (l) => l.find((d) => !d.rect && d.empty === empty));
    Object.assign(it, { x: 0, y: 0, z: 0, glide: 0 });
    const ev = run(W, [makeWave(facing(0, 0, 0), { strong: true })]);
    const s = W.dynOf(it, 0, 0);
    if (empty) {
      assert.ok(ev.some((e) => e.type === 'crack'), 'cracked');
      assert.ok(s.cracked, 'stays cracked');
      assert.equal(W.near(0, 0, 200).filter((o) => o.what === 'diatom').length, 0, 'its halves are no obstacle');
    } else {
      assert.ok(ev.some((e) => e.type === 'tumble') && !s.cracked, 'tumbled, whole');
      assert.equal(W.near(s.x, s.y, 200).filter((o) => o.what === 'diatom').length, 1, 'still an obstacle');
    }
  }
  // a plain jab never cracks one
  const { W, it } = worldWith('diatoms', (l) => l.find((d) => !d.rect && d.empty));
  Object.assign(it, { x: 0, y: 0, z: 0 });
  assert.ok(!run(W, [makeWave(facing(0, 0, 0))]).some((e) => e.type === 'crack'));
});

test('detritus clumps crumble once struck hard enough for their size; one carrying a Vorticella colony only wobbles', () => {
  const small = worldWith('clumps', (l) => l.find((c) => !c.colony && c.r < 34));
  Object.assign(small.it, { x: 0, y: 0, z: 0 });
  assert.ok(run(small.W, [makeWave(facing(-small.it.r * 0.8, 0, 0, 80))]).some((e) => e.type === 'crumble'), 'a small clump crumbles at one jab');
  assert.ok(small.W.clumpPose(small.it, 0, 0).cr > 0, 'crumbled (its particles drifting)');
  assert.equal(small.W.near(0, 0, 100).filter((o) => o.what === 'detritus').length, 0, 'no longer an obstacle');
  const big = worldWith('clumps', (l) => l.find((c) => !c.colony && c.r > 55));
  Object.assign(big.it, { x: 0, y: 0, z: 0 });
  assert.ok(!run(big.W, [makeWave(facing(-big.it.r * 0.8, 0, 0, 80))]).some((e) => e.type === 'crumble'), 'a big one holds at one jab');
  assert.ok(run(big.W, [makeWave(facing(-big.it.r * 0.8, 0, 0, 80), { strong: true })]).some((e) => e.type === 'crumble'), 'and crumbles at a strong one');
  const col = worldWith('clumps', (l) => l.find((c) => c.colony));
  Object.assign(col.it, { x: 0, y: 0, z: 0 });
  for (let k = 0; k < 3; k++) assert.ok(!run(col.W, [makeWave(facing(-col.it.r * 0.8, 0, 0, 80), { strong: true })]).some((e) => e.type === 'crumble'), 'the colony holds it');
  const s = col.W.dynOf(col.it, 0, 0);
  assert.ok(s && s.cr < 0, 'it wobbled (a state) but never crumbled');
});

test('Spirogyra, anchored, bends where the wave strikes and springs back', () => {
  const { W, it } = worldWith('filaments');
  Object.assign(it, { x0: 0, y0: -600, x1: 0, y1: 600, L: 1200, cx: 0, cy: 0, ang: Math.PI / 2, z0: 0, z1: 0 });
  const S = facing(0, 0, 0);
  const waves = [makeWave(S)];
  let peak = 0;
  for (let t = 0; t < 0.6; t += DT) { stepWaves(W, waves, DT, t); stepStir(W, DT); const s = W.dynOf(it, 0, 0); if (s) peak = Math.max(peak, Math.abs(W.bendAt(s, 600))); }
  assert.ok(peak > 4, `bent (${peak.toFixed(1)} µm at the point struck)`);
  for (let t = 0; t < 3; t += DT) stepStir(W, DT);
  assert.ok(Math.abs(W.bendAt(W.dynOf(it, 0, 0), 600)) < 0.5, 'sprung back');
  assert.ok(Math.abs(W.bendAt(W.dynOf(it, 0, 0), 0)) < 0.5, '(its ends never moved)');
});

test('a Vorticella snaps its stalk shut when the wave reaches it, the bell recoils, and one struck open knocks loose food', () => {
  const { W, it } = worldWith('vorticella');
  Object.assign(it, { ax: 0, ay: 0, az: 0, bz: 0, a: 0, stalk: 120 });
  const open = W.vortPose(it, 0, 0, 0);
  assert.equal(open.c, 0, 'open to start with');
  const S = createSwimState(open.x1 + 160, 0, Math.PI, 0); // facing the bell from beyond it
  const ev = run(W, [makeWave(S)], 0.5);
  const st = W.stalkState.get(it);
  assert.ok(st.c > 0.9, 'snapped shut');
  assert.ok(W.vortPose(it, 0, 0, 0.5).L < open.L * 0.6, 'its stalk coiled up');
  assert.ok(st.wob > 0, 'the bell recoils');
  assert.ok(ev.some((e) => e.type === 'spit'), 'struck open: a clump of food knocked loose');
  // knocked again while shut: nothing more
  assert.ok(!run(W, [makeWave(S)], 0.5).some((e) => e.type === 'spit' || e.type === 'snap'));
});

test('the body shoves what it swims into: a diatom slides off, a stalk snaps', () => {
  const { W, it } = worldWith('diatoms', (l) => l.find((d) => !d.rect && !d.empty));
  Object.assign(it, { x: 200, y: 8, z: 0, a: Math.PI / 2, glide: 0 });
  const S = createSwimState(0, 0, 0, 0);
  for (let t = 0; t < 0.8; t += DT) { stepSwim(S, { mx: 1, my: 0, m: 1 }, { obstacles: W.near(S.x, S.y, 170, t) }, DT); bodyShove(W, S, DT, t); stepStir(W, DT); }
  const s = W.dynOf(it, 0, 0);
  assert.ok(s && Math.hypot(s.x, s.y) > 3, `shoved by the body (${s && Math.hypot(s.x, s.y).toFixed(1)} µm)`);
});

test('shoves die away at once (no coasting at this size)', () => {
  const { W, it } = worldWith('diatoms', (l) => l.find((d) => !d.rect));
  shove(W, { kind: 'diatom', it, ox: 0, oy: 0 }, 300, 0, it.x, it.y, 1);
  for (let t = 0; t < 2; t += DT) stepStir(W, DT);
  const s = W.dynOf(it, 0, 0);
  assert.ok(Math.abs(s.vx) < 1 && s.x > 20 && s.x < 200, `stopped after a short slide (${s.x.toFixed(0)} µm)`);
  assert.equal(W.active.size, 0, 'nothing left moving');
});

test('the wave: runs out to its reach in its time, and a strong one further', () => {
  const w = makeWave(createSwimState(0, 0, 0, 0));
  w.t = WAVE.dur; assert.equal(Math.round(waveFront(w)), WAVE.reach);
  const s = makeWave(createSwimState(0, 0, 0, 0), { strong: true });
  s.t = WAVE.dur; assert.ok(waveFront(s) > waveFront(w));
});

test('the gradient rises toward the portal (from its distance, whichever way it lies), and the richer scenery shows only near it', () => {
  assert.equal(richAt(RICH.far + 1000), 0);
  assert.equal(richAt(RICH.near), 1);
  let prev = -1;
  for (let d = RICH.far; d >= RICH.near; d -= 2000) { const g = richAt(d); assert.ok(g >= prev, 'rises steadily as you near it'); prev = g; }
  assert.ok(richAt(25630) < 0.12, `subtle at the start of the default path (${richAt(25630).toFixed(2)})`);
  assert.ok(richAt(13000) > 0.4 && richAt(13000) < 0.7, `about half way there (${richAt(13000).toFixed(2)})`);
  const count = (W, x, y) => { let n = 0; W.eachIn(W.clumps, x - 1200, y - 1200, x + 1200, y + 1200, (c, ox, oy) => { if (W.vis(c, ox, oy) > 0.5) n++; }); W.eachIn(W.vorticella, x - 1200, y - 1200, x + 1200, y + 1200, (v, ox, oy) => { if (W.vis(v, ox, oy) > 0.5) n++; }); return n; };
  for (const [px, py] of [[0, 25630], [-18123, 18123], [23660, -9840]]) { // (25.6 mm off, as the default path lays it, in three directions)
    const W = createWorld(11);
    // near the portal (1.5 mm short of it, on the way from the start), off to the side (as far again, square to the way)
    const L = Math.hypot(px, py), ux = px / L, uy = py / L;
    const nearAt = [px - ux * 1500, py - uy * 1500], sideAt = [-uy * L, ux * L];
    const bare = [count(W, 0, 0), count(W, ...nearAt), count(W, ...sideAt)];
    W.setRichRef(px, py);
    const atStart = count(W, 0, 0), nearIt = count(W, ...nearAt), side = count(W, ...sideAt);
    assert.ok(atStart <= bare[0] + 6, `the start barely changes (${bare[0]} -> ${atStart})`);
    assert.ok(nearIt > bare[1] * 1.4, `fuller near the portal (${bare[1]} -> ${nearIt})`);
    assert.equal(side, bare[2], `open water off to the side (${side})`);
    assert.ok(W.rich(px, py) === 1 && W.leafK(px, py) === 1 && W.leafK(0, 0) === 0, 'leaf litter only near it');
  }
});
