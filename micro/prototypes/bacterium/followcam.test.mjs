// The bacterium's follow camera (followcam.js), headless: the dead zone, the eased catch-up, the
// look-ahead along the motion and the RS look.   node micro/prototypes/bacterium/followcam.test.mjs
import assert from 'node:assert/strict';
import { createFollow, stepFollow, FOLLOW } from './followcam.js';

const H = 45, dt = 1 / 60;
const run = (F, n, fn) => { for (let i = 0; i < n; i++) { const o = fn(i); stepFollow(F, dt, o.x, o.y, o.vx || 0, o.vy || 0, o.look || null, H); } };

// the dead zone: moving within it, the camera does not move
{
  const F = createFollow(0, 0);
  run(F, 120, () => ({ x: 0.12 * H, y: -0.05 * H }));
  assert.ok(Math.hypot(F.x, F.y) < 1e-9, `inside the dead zone the camera stays (${F.x}, ${F.y})`);
}
// past it: an eased catch-up, never locked, no overshoot; it stops with the target at the zone's edge
{
  const F = createFollow(0, 0), xs = [];
  run(F, 240, (i) => { xs.push(F.bx); return { x: 0.6 * H, y: 0 }; });
  const r = FOLLOW.dead * H;
  assert.ok(xs[6] > 0 && xs[6] < 0.25 * (0.6 * H - r), `it starts easing, not jumping (${xs[6].toFixed(2)} µm after 0.1 s)`);
  assert.ok(xs.every((x, i) => i === 0 || x >= xs[i - 1] - 1e-9) && Math.max(...xs) <= 0.6 * H - r + 1e-6, 'it never overshoots');
  assert.ok(Math.abs(F.bx - (0.6 * H - r)) < 0.05, `it settles with the target at the dead zone's edge (${F.bx.toFixed(2)} of ${(0.6 * H - r).toFixed(2)})`);
}
// the look-ahead: a steady run puts the camera ahead of the target; a reversal swings it through smoothly
{
  const F = createFollow(0, 0);
  let x = 0;
  run(F, 300, () => { x += 45 * dt; return { x, y: 0, vx: 45, vy: 0 }; });
  assert.ok(Math.abs(F.ax - FOLLOW.ahead * H) < 0.3, `full speed: a look-ahead of ${F.ax.toFixed(1)} µm (${(FOLLOW.ahead * H).toFixed(1)} wanted)`);
  assert.ok(F.x > x, `the camera leads the flock (${(F.x - x).toFixed(1)} µm ahead)`);
  let maxJump = 0, prev = F.ax;
  run(F, 180, () => { x -= 45 * dt; maxJump = Math.max(maxJump, Math.abs(F.ax - prev)); prev = F.ax; return { x, y: 0, vx: -45, vy: 0 }; });
  assert.ok(maxJump < 0.4, `reversing, the look-ahead swings through without whipping (at most ${maxJump.toFixed(2)} µm a frame)`);
  assert.ok(F.ax < -0.8 * FOLLOW.ahead * H, 'after the reversal it looks the other way');
}
// RS: held, a look offset in its direction, scaled by how far it is pushed; released, it eases back
{
  const F = createFollow(0, 0);
  run(F, 90, () => ({ x: 0, y: 0, look: { x: 0, y: 1 } }));
  assert.ok(Math.abs(F.ly - FOLLOW.look * H) < 0.2 && Math.abs(F.y - FOLLOW.look * H) < 0.2, `full RS up looks ${F.ly.toFixed(1)} µm up`);
  run(F, 90, () => ({ x: 0, y: 0, look: { x: 0.5, y: 0 } }));
  assert.ok(Math.abs(F.lx - 0.5 * FOLLOW.look * H) < 0.2 && Math.abs(F.ly) < 0.2, `half RS right looks ${F.lx.toFixed(1)} µm right`);
  run(F, 90, () => ({ x: 0, y: 0 }));
  assert.ok(Math.hypot(F.lx, F.ly) < 0.05, 'released, it eases back');
}
console.log('bacterium follow camera: all checks pass');
