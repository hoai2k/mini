// The drop's swimming and fights, without a browser: auto-weave over and
// under obstacles, depth keeping you out of a hunter's reach, each hunter's
// right answer, and fighting back (jabs that land or visibly miss, blocks,
// a few blows driving a hunter off).
//   node --test micro/game/paramecium/play.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwimState, stepSwim, dash, ZMIN, ZMAX, VMAX } from './swim.js';
import { createDidinium, stepDidinium, blockDidinium, createDileptus, stepDileptus, burstDileptus, createGiant, stepGiant, burstGiant, GIANT, createTrap, stepTrap, burstTrap, TRAP, trapDoor, jabFoe, hitFoe, FIGHT, DIDINIUM } from './foes.js';
import { createWorld } from './world.js';
import { DEPTH, ZTOL, ZOOM, FIELD } from './route.js';

const DT = 1 / 60;
const player = (x, y, a, z = 0) => ({ slot: 0, S: createSwimState(x, y, a, z), live: true });
const right = { mx: 1, my: 0, m: 1, depth: 0 };

test('auto-weave: swimming straight at a filament winds over or under it with no depth input', () => {
  for (const [fz, z0, side] of [[0, 10, 1], [0, -10, -1], [60, 0, -1], [-60, 0, 1]]) {
    const fil = { kind: 'seg', x0: 200, y0: -800, z0: fz, x1: 200, y1: 800, z1: fz, r: 18, weave: true };
    const S = createSwimState(0, 0, 0, z0);
    let minX = Infinity, t = 0;
    for (; t < 2 && S.x < 420; t += DT) stepSwim(S, right, { obstacles: [fil] }, DT);
    void minX;
    assert.ok(S.x > 400, `crossed the filament at depth ${fz} starting at ${z0} (x ${S.x.toFixed(0)} after ${t.toFixed(2)} s)`);
    assert.ok(t < 1.0, `barely slowed (${t.toFixed(2)} s for 420 µm at ${VMAX} µm/s)`);
    // it went to the side its depth was already on
    const passedAt = S.z;
    assert.ok(Math.sign(passedAt - fz) === side || Math.abs(passedAt - fz) > 30, `wound ${side > 0 ? 'over' : 'under'} (z ${passedAt.toFixed(0)})`);
  }
});

test('auto-weave: a clump of detritus is passed over or under; a wall filling the depth is glanced off', () => {
  const clump = { kind: 'disc', x: 200, y: 0, z: -40, r: 40, h: 24, weave: true };
  const S = createSwimState(0, 0, 0, -30);
  for (let t = 0; t < 1.5 && S.x < 320; t += DT) stepSwim(S, right, { obstacles: [clump] }, DT);
  assert.ok(S.x > 300, `over or under the clump (x ${S.x.toFixed(0)}, z ${S.z.toFixed(0)})`);
  const wall = { kind: 'disc', x: 200, y: 30, z: 0, r: 120, h: 200, weave: false };
  const W = createSwimState(0, 0, 0, 0);
  let maxX = 0;
  for (let t = 0; t < 1.5; t += DT) { stepSwim(W, right, { obstacles: [wall] }, DT); maxX = Math.max(maxX, W.x); }
  assert.ok(Math.hypot(W.x - 200, W.y - 30) > 120 + 20, 'never inside the wall');
  assert.ok(Math.abs(W.y) > 40 || W.x > 300, `glanced along it (x ${W.x.toFixed(0)}, y ${W.y.toFixed(0)})`);
});

test('depth: RS moves the cell between the coverslip and the slide, and no further', () => {
  const S = createSwimState(0, 0, 0, 0);
  for (let t = 0; t < 2; t += DT) stepSwim(S, { depth: 1 }, { obstacles: [] }, DT);
  assert.equal(S.z, ZMAX);
  for (let t = 0; t < 2; t += DT) stepSwim(S, { depth: -1 }, { obstacles: [] }, DT);
  assert.equal(S.z, ZMIN);
});

test('quick: full speed within a fifth of a second, a dash more than doubles it, release stops', () => {
  const S = createSwimState(0, 0, 0, 0);
  for (let t = 0; t < 0.2; t += DT) stepSwim(S, right, { obstacles: [] }, DT);
  assert.ok(S.v > VMAX * 0.85, `v ${S.v.toFixed(0)}`);
  dash(S, 0);
  for (let t = 0; t < 0.15; t += DT) stepSwim(S, right, { obstacles: [] }, DT);
  assert.ok(S.v > VMAX * 2, `dash ${S.v.toFixed(0)}`);
  for (let t = 0; t < 0.6; t += DT) stepSwim(S, { m: 0 }, { obstacles: [] }, DT);
  assert.ok(S.v < 30, `stopped (${S.v.toFixed(0)})`);
});

/** A Didinium hunting P: run until it lunges once; did it catch P? */
function didiniumLunge(P, { changeDepthTo = null } = {}) {
  const D = createDidinium(0);
  Object.assign(D, { home: { x: -250, y: 0 }, x: -250, y: 0, z: P.S.z, a: 0, placed: true, mode: 'idle', grace: 0 });
  const ev = [];
  for (let t = 0; t < 4; t += DT) {
    ev.push(...stepDidinium(D, [P], DT));
    if (D.mode === 'crouch' && changeDepthTo !== null) stepSwim(P.S, { depth: Math.sign(changeDepthTo - P.S.z) }, { obstacles: [] }, DT);
    if (ev.some((e) => e.type === 'kill' || e.type === 'miss')) break;
  }
  return ev;
}
test('Didinium: a lunge at your depth catches you; out of its depth it misses', () => {
  assert.ok(didiniumLunge(player(0, 0, 0, 0)).some((e) => e.type === 'kill'), 'same depth: caught');
  // the depth it crouched at is kept through the lunge: change depth as it crouches and it passes over you
  const P = player(0, 0, 0, 40);
  const ev = didiniumLunge(P, { changeDepthTo: -130 });
  assert.ok(!ev.some((e) => e.type === 'kill'), `changed depth while it crouched: missed (z ${P.S.z.toFixed(0)})`);
  assert.ok(ev.some((e) => e.type === 'miss'));
});
test('Didinium follows you in depth when it is not crouching (the planes are connected)', () => {
  const P = player(0, 0, 0, 120);
  const D = createDidinium(0);
  Object.assign(D, { home: { x: -600, y: 0 }, x: -600, y: 0, z: -100, a: 0, placed: true, mode: 'idle', grace: 0 });
  for (let t = 0; t < 0.8; t += DT) stepDidinium(D, [P], DT);
  assert.ok(D.z > 30, `it rose after you while closing in (z ${D.z.toFixed(0)} from -100)`);
});

test('Dileptus: its slash kills at your depth; a burst in the wind-up drives it off (twice: it gives up)', () => {
  const run = (burst) => {
    const P = player(0, 0, Math.PI, 0);
    const D = createDileptus();
    Object.assign(D, { home: { x: 350, y: 0 }, x: 350, y: 0, z: 0, a: Math.PI, placed: true, mode: 'idle', grace: 0 });
    const ev = [];
    let res = null;
    for (let t = 0; t < 5; t += DT) {
      ev.push(...stepDileptus(D, [P], DT));
      if (burst && D.mode === 'windup' && D.t > 0.4) { res = burstDileptus(D, P); break; }
      if (ev.some((e) => e.type === 'kill')) break;
    }
    return { ev, res, D };
  };
  assert.ok(run(false).ev.some((e) => e.type === 'kill'), 'no defence: slashed');
  const r = run(true);
  assert.equal(r.res, 'driven');
  assert.equal(r.D.mode, 'stunned');
  assert.ok(r.D.interest < 1 && r.D.hitT === 0, 'the block wore it down and it flinched');
  r.D.mode = 'windup';
  assert.equal(burstDileptus(r.D, { S: createSwimState(0, 0, Math.PI, 0) }), 'beaten');
  assert.equal(r.D.mode, 'flee');
});

/** A hunter placed facing P, d µm ahead of P's front, at depth z. */
function foeAhead(make, d, z = 0) {
  const F = make();
  Object.assign(F, { home: { x: d, y: 0 }, x: d, y: 0, z, a: Math.PI, placed: true, mode: F.kind === 'dileptus' ? 'stalk' : 'chase', grace: 0 });
  return F;
}
test('the drop is one continuous depth, four body lengths deep; meeting needs nearby depth', () => {
  assert.equal(DEPTH.max - DEPTH.min, 480);
  assert.ok(ZTOL >= 30 && ZTOL <= 50, 'about a body thickness');
  // a jab lands at any depth, as long as the hunter is near it
  for (const z of [-180, -60, 0, 75, 190]) {
    const P = player(0, 0, 0, z), F = foeAhead(() => createDidinium(0), 110, z + 20);
    assert.ok(jabFoe(F, P).hit, `lands at z ${z}`);
  }
});
test('X: a jab lands in front, misses out of reach or out of depth (and says which)', () => {
  const P = player(0, 0, 0, 0);
  assert.equal(jabFoe(foeAhead(() => createDidinium(0), 120), P).why, 'hit');
  assert.equal(jabFoe(foeAhead(() => createDidinium(0), 330), P).why, 'reach', 'too far ahead');
  assert.equal(jabFoe(foeAhead(() => createDidinium(0), 120, 150), P).why, 'depth', 'above you');
  assert.equal(jabFoe(foeAhead(() => createDidinium(0), 120, -150), P).why, 'depth', 'below you');
  const behind = foeAhead(() => createDidinium(0), -160);
  assert.equal(jabFoe(behind, P).why, 'reach', 'behind you');
  // the Dileptus: its body (behind the neck) and its trunk both count
  assert.ok(jabFoe(foeAhead(createDileptus, 150), P).hit, 'the Dileptus at its stalking distance');
});
test('a few good jabs drive a hunter off; each flinches it', () => {
  for (const make of [() => createDidinium(0), createDileptus]) {
    const P = player(0, 0, 0, 0), F = foeAhead(make, 120);
    const results = [];
    for (let k = 0; k < 5 && F.mode !== 'flee'; k++) {
      F.x = 120; F.y = 0; F.a = Math.PI; if (F.mode !== 'flee') F.mode = F.kind === 'dileptus' ? 'windup' : 'crouch';
      const j = jabFoe(F, P);
      assert.ok(j.hit);
      const x0 = F.x;
      results.push(hitFoe(F, P, j));
      assert.equal(F.hitT, 0, 'it flinches');
      assert.ok(F.kx > 0, 'knocked back, away from you');
      if (F.mode !== 'flee') { if (F.kind === 'didinium') stepDidinium(F, [P], 0.1); else stepDileptus(F, [P], 0.1); assert.ok(F.x > x0, 'moved back'); }
    }
    assert.deepEqual(results, ['hit', 'hit', 'fled'], `${F.kind}: three jabs (${results})`);
    assert.equal(F.mode, 'flee');
    // it swims off, away from you
    const d0 = Math.hypot(F.x, F.y);
    for (let t = 0; t < 2; t += DT) F.kind === 'didinium' ? stepDidinium(F, [P], DT) : stepDileptus(F, [P], DT);
    assert.ok(Math.hypot(F.x, F.y) > d0 + 200, 'gone off');
  }
});
test('Didinium: B in its crouch or its lunge blocks it (no kill, it staggers, its interest falls)', () => {
  for (const at of ['crouch', 'lunge']) {
    const P = player(0, 0, 0, 0);
    const D = createDidinium(0);
    Object.assign(D, { home: { x: -250, y: 0 }, x: -250, y: 0, z: 0, a: 0, placed: true, mode: 'idle', grace: 0 });
    const ev = [];
    let r = null;
    for (let t = 0; t < 4; t += DT) {
      ev.push(...stepDidinium(D, [P], DT));
      if (D.mode === at && !r && (at === 'crouch' ? D.t > DIDINIUM.crouch * 0.5 : true)) r = blockDidinium(D, P);
      if (r) break;
    }
    assert.equal(r, 'blocked', `blocked in the ${at}`);
    assert.equal(D.mode, 'stagger');
    assert.ok(Math.abs(D.interest - (1 - FIGHT.block)) < 1e-9);
    for (let t = 0; t < 0.5; t += DT) ev.push(...stepDidinium(D, [P], DT));
    assert.ok(!ev.some((e) => e.type === 'kill'), 'not caught');
  }
  // its crouch is a tell long enough to answer
  assert.ok(DIDINIUM.crouch >= 0.6);
});
test('the giant amoeba: jabs at its reaching pseudopod wear it down until it draws back (and leaves you be)', () => {
  const G = createGiant();
  Object.assign(G, { home: { x: 0, y: 0 }, x: 0, y: 0, placed: true, mode: 'roam', grace: 0 });
  const P = player(GIANT.R + 150, 0, Math.PI, 40);
  for (let t = 0; t < 2; t += DT) stepGiant(G, [P], DT);
  let n = 0, r;
  do { r = jabFoe(G, P); assert.ok(r.hit, `the jab reaches its edge (gap ${r.d?.toFixed(0)}, dz ${r.dz?.toFixed(0)})`); n++; } while (hitFoe(G, P, r) !== 'fled' && n < 8);
  assert.equal(n, 4, 'four jabs');
  assert.equal(G.mode, 'retreat');
  const low = player(G.x + 60, G.y, 0, -150), ev = [];
  for (let t = 0; t < 1; t += DT) ev.push(...stepGiant(G, [low], DT));
  assert.ok(!ev.some((e) => e.type === 'engulf'), 'retreating, it engulfs nobody');
});
test('the zoom (recalibrated 2026-11-03): play starts at the old widest (3x), out to ~1.6-2x that, in to the old closest or a little closer', () => {
  assert.equal(FIELD, 560);
  assert.equal(ZOOM.start, 3, 'starts at the old widest (1.68 mm)');
  assert.ok(ZOOM.min <= 1 && ZOOM.min >= 0.8, `the closest at or a little inside the old closest (${ZOOM.min})`);
  assert.ok(ZOOM.max / 3 >= 1.6 && ZOOM.max / 3 <= 2, `the widest 1.6-2x the old widest (${ZOOM.max})`);
  assert.ok(ZOOM.min < ZOOM.start && ZOOM.start < ZOOM.max, 'room to zoom both ways from the start');
});

test('the giant amoeba engulfs what it covers low in the drop; above it you are out of reach; a burst frees you', () => {
  const G = createGiant();
  Object.assign(G, { home: { x: 0, y: 0 }, x: 0, y: 0, placed: true, mode: 'roam', grace: 0 });
  const low = player(100, 0, 0, -100), high = player(-100, 0, 0, ZMAX);
  const ev = [];
  for (let t = 0; t < 0.5; t += DT) ev.push(...stepGiant(G, [low, high], DT));
  assert.ok(ev.some((e) => e.type === 'engulf' && e.P === low), 'low: engulfed');
  assert.ok(!ev.some((e) => e.P === high), 'high, over it: untouched');
  assert.equal(burstGiant(G, low), 'freed');
  assert.ok(Math.hypot(low.S.x, low.S.y) > GIANT.R, 'burst out past its edge');
  // held without a burst: digested
  const P = player(50, 0, 0, -100), ev2 = [];
  for (let t = 0; t < GIANT.close + 0.5; t += DT) { ev2.push(...stepGiant(G, [P], DT)); if (ev2.some((e) => e.type === 'kill')) break; }
  assert.ok(ev2.some((e) => e.type === 'kill'), 'no burst: engulfed for good');
});

test('the bladderwort trap: pulses pull, B bursts out, wasted pulses spend it', () => {
  const T = createTrap();
  Object.assign(T, { x: 0, y: 0, a: 0, placed: true, state: 'dormant' });
  const door = trapDoor(T);
  const P = player(door.x + 260, door.y, 0, TRAP.z);
  let pulled = false;
  for (let t = 0; t < 60 && T.state !== 'spent'; t += DT) {
    const { pushes } = stepTrap(T, [P], DT);
    if (pushes.get(P)) { pulled = true; if (T.state === 'pulse' && T.t < 0.05) burstTrap(T, P); }
    P.S.x = door.x + 260; P.S.y = door.y; // it holds its ground (bursting out each time)
  }
  assert.ok(pulled, 'the pulse pulls');
  assert.equal(T.state, 'spent', `spent after wasted pulses and bursts (${JSON.stringify(T.log.map((e) => e.type))})`);
  // a player right at the door in a pulse is sucked in
  const T2 = createTrap(); Object.assign(T2, { x: 0, y: 0, a: 0, placed: true, state: 'tell', t: TRAP.tell });
  const d2 = trapDoor(T2), Q = player(d2.x + 40, d2.y, 0, TRAP.z);
  let killed = false;
  for (let t = 0; t < 0.5; t += DT) if (stepTrap(T2, [Q], DT).ev.some((e) => e.type === 'kill')) killed = true;
  assert.ok(killed, 'at the door in a pulse: sucked in');
});

test('the scenery: obstacles near any point, repeated in every direction, the start clear', () => {
  const W = createWorld(11);
  const at0 = W.near(0, 0, 60);
  assert.equal(at0.filter((o) => o.kind === 'disc').length, 0, 'no clump on the start');
  let n = 0;
  for (let k = 0; k < 40; k++) n += W.near(k * 977, k * 613, 400).length;
  assert.ok(n > 40, `obstacles out in the drop (${n})`);
  assert.ok(W.near(0, 0, 400).length === W.near(2400 * 3, -2400 * 5, 400).length, 'the tile repeats');
});
