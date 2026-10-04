// Headless checks for Act I's rules. Run: node widowsbay/qa/board.test.mjs
import assert from 'node:assert/strict';
import { createBoard, step, TUNING, ROWS, effectiveRow } from '../src/board.js';

const idle = {};
const run = (b, sec, input = idle, dt = 1 / 60) => { for (let t = 0; t < sec; t += dt) step(b, dt, input); return b; };
const drain = (b) => { const e = b.events.slice(); b.events.length = 0; return e; };
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };

test('determinism: same seed, same voyage', () => {
  const a = run(createBoard(7), 30), b = run(createBoard(7), 30);
  assert.equal(a.progress, b.progress);
  assert.deepEqual(a.hazards.map((h) => [h.type, h.row, Math.round(h.x)]), b.hazards.map((h) => [h.type, h.row, Math.round(h.x)]));
});

test('row changes are edges, clamped, and tweened', () => {
  const b = createBoard(1);
  step(b, 1 / 60, { rowUp: true }); assert.equal(b.ship.row, 0);
  run(b, 0.5);
  step(b, 1 / 60, { rowUp: true }); assert.equal(b.ship.row, 0, 'cannot go behind the back row');
  step(b, 1 / 60, { rowDown: true }); assert.equal(b.ship.row, 1);
  step(b, 1 / 60, { rowDown: true }); assert.equal(b.ship.row, 1, 'no second change mid-tween');
  assert.equal(effectiveRow(b.ship), 0, 'still counts as the old row early in the tween');
});

test('leap clears a risen rock; standing still does not', () => {
  const place = (leap) => {
    const b = createBoard(3);
    b.spawnIn = 1e9; b.wind.next = 1e9;
    b.hazards.push({ type: 'rock', row: 1, x: b.ship.x + 120, t: 0, state: 'up' });
    let hit = false;
    for (let t = 0; t < 1.6; t += 1 / 60) {
      const near = b.hazards[0] && b.hazards[0].x - b.ship.x < 90;
      step(b, 1 / 60, { leap: leap && near && b.ship.leapT <= 0 });
      if (drain(b).some((e) => e.type === 'hit')) hit = true;
    }
    return hit;
  };
  assert.equal(place(false), true);
  assert.equal(place(true), false);
});

test('lightning ignores leaping but changing row dodges it', () => {
  const strike = (dodge) => {
    const b = createBoard(4);
    b.spawnIn = 1e9; b.wind.next = 1e9;
    b.hazards.push({ type: 'bolt', row: 1, x: b.ship.x, t: 0, state: 'warn' });
    step(b, 1 / 60, dodge ? { rowDown: true } : { leap: true });
    run(b, TUNING.bolt.warn + 0.3);
    return b.ship.hull;
  };
  assert.equal(strike(false), TUNING.hull - 1);
  assert.equal(strike(true), TUNING.hull);
});

test('invulnerability after a hit, wreck at zero hull', () => {
  const b = createBoard(5);
  b.spawnIn = 1e9; b.wind.next = 1e9;
  for (let k = 0; k < 3; k++) {
    b.hazards.push({ type: 'rock', row: 1, x: b.ship.x, t: 0, state: 'up' });
    step(b, 1 / 60, idle);
    run(b, TUNING.invuln + 0.1);
    b.hazards.length = 0;
  }
  assert.equal(b.ship.hull, 0);
  assert.equal(b.phase, 'wrecked');
});

test('wind warns before it turns, and a headwind slows the voyage', () => {
  const b = createBoard(6);
  b.spawnIn = 1e9;
  run(b, TUNING.wind.first - TUNING.wind.warn + 0.05);
  assert.ok(drain(b).some((e) => e.type === 'windWarn'));
  run(b, TUNING.wind.warn);
  assert.equal(b.wind.dir, -1);
  const p0 = b.progress; run(b, 2); const head = b.progress - p0;
  b.wind.dir = 1; const p1 = b.progress; run(b, 2); const tail = b.progress - p1;
  assert.ok(tail > head * 1.4, `tail ${tail} vs head ${head}`);
});

test('three keepsakes float by once each; all three light the lamp', () => {
  const b = createBoard(8);
  b.spawnIn = 1e9; b.wind.next = 1e9;
  const seen = [];
  let guard = 0;
  while (b.phase !== 'done' && guard++ < 60 * 200) {
    // steer onto any keepsake's row
    const k = b.pickups.find((p) => p.type === 'keepsake');
    const input = {};
    if (k && b.ship.rowT >= 1) { if (k.row < b.ship.row) input.rowUp = true; if (k.row > b.ship.row) input.rowDown = true; }
    step(b, 1 / 60, input);
    for (const e of drain(b)) if (e.type === 'keepsake') seen.push(e.kind);
  }
  assert.deepEqual(seen, ['tea', 'pearl', 'rose']);
  assert.equal(b.outcome, 'lamp');
  assert.ok(b.progress === 1);
});

test('an idle voyage is survivable in rough length and never walls off all rows', () => {
  for (const seed of [11, 12, 13, 14, 15]) {
    const b = createBoard(seed);
    b.ship.hull = 1e9; // observe spawns without wrecking
    let worst = 0, t = 0;
    while (b.phase === 'sail' && t < 400) {
      step(b, 1 / 60, idle); t += 1 / 60; drain(b);
      for (const r of b.hazards) {
        if (r.type !== 'rock') continue;
        const rows = new Set(b.hazards.filter((h) => h.type === 'rock' && Math.abs(h.x - r.x) < 60).map((h) => h.row));
        worst = Math.max(worst, rows.size);
      }
    }
    assert.ok(worst < 3, `seed ${seed} walled off all rows`);
    assert.ok(t > 75 && t < 140, `voyage took ${t.toFixed(1)}s`);
    assert.ok(ROWS.length === 3);
  }
});

console.log(`\n${n} checks passed`);
