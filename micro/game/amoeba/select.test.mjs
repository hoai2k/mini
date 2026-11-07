// The amoeba's default control scheme (select.js) in node, with a soft body:
// sticks keep their pseudopods through neutral; RT chooses them with glows
// that ease and settle, snap to existing bases, never share one, and commit
// on release (growing a new pseudopod at a bare base); LB thickens the
// steered pseudopod, or spreads the whole cell when none is steered.
//
//   node --test micro/game/amoeba/select.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Body } from '../shared/techniques/amoeba-softbody.js';
import { rng } from './util.js';
import { selectRoles, selectInput, podExists, podList, easeGlow, aimGlow, angDiff, basePoint, GLOW, DEG } from './select.js';

const DT = 1 / 60, W = { capsules: [], circles: [] };
const stick = (deg, m = 1) => (deg == null ? { m: 0, dx: 1, dy: 0 } : { m, dx: Math.cos(deg * DEG), dy: Math.sin(deg * DEG) });
/** Raw input as main.js rawInput gives it: rt = movement (physical LT), lt = choosing (physical RT). */
const raw = ({ ls = null, rs = null, choose = 0, move = 0, lb = 0, rb = 0 } = {}) => ({ ls: stick(ls), rs: stick(rs), lt: choose, rt: move, lb, rb });
function rig(seed = 3) {
  const b = new Body(rng(seed), 0, 0);
  b.opts.idlePods = false;
  return { b, R: selectRoles(), events: [] };
}
function run(g, sec, input) {
  let out;
  for (let i = 0; i < sec / DT; i++) {
    out = selectInput(g.b, g.R, typeof input === 'function' ? input(i * DT) : input, { dt: DT, sound: (e) => g.events.push(e) });
    g.b.step(DT, out, W);
  }
  return out;
}
const tipAngle = (b, k) => Math.atan2(b.y[b.pods[k].tip] - b.cy, b.x[b.pods[k].tip] - b.cx) / DEG;

test('choosing ends when RT falls below its pressed threshold, without latching', () => {
  const g = rig();
  run(g, DT, raw({ choose: 1 }));
  assert.equal(g.R.mode, 'choose');
  run(g, DT, raw({ choose: 0.4 }));
  assert.equal(g.R.mode, 'pod');
  assert.equal(g.R.choose, false);
  assert.equal(g.R.glow.sel, null);
  run(g, 0.2, raw({ choose: 0.49, rb: 1 }));
  assert.equal(g.R.mode, 'pod', 'a partially released trigger cannot re-enter choosing');
  run(g, DT, raw({ choose: 0.51 }));
  assert.equal(g.R.mode, 'choose');
  run(g, DT, raw());
  assert.equal(g.R.mode, 'pod');
});

test('RB and the surge boost increase movement, and combine', () => {
  function distance(push, boost) {
    const g = rig(7);
    g.b.opts.boost = boost;
    const x = g.b.cx;
    run(g, 1.2, raw({ move: 1, ls: 0, rs: 0, rb: push }));
    assert.equal(g.R.mode, 'move');
    return g.b.cx - x;
  }
  const normal = distance(0, 1), rb = distance(1, 1);
  const surge = distance(0, 2.5), both = distance(1, 2.5);
  assert.ok(normal > 0);
  assert.ok(rb > normal * 1.2, 'RB makes the cell travel further');
  assert.ok(surge > normal * 1.5, 'surge boosts the body, not just its pseudopods');
  assert.ok(both > surge * 1.2, 'RB also strengthens surging movement');
});

test('sticks keep their pseudopods through neutral', () => {
  const g = rig();
  run(g, 1.2, raw({ rs: 0, ls: 180 }));
  const r = g.R.sel, l = g.R.adj;
  assert.ok(r != null && l != null && r !== l, 'each stick took one');
  run(g, 0.8, raw()); // both at neutral: they rest
  assert.equal(g.R.sel, r); assert.equal(g.R.adj, l);
  // pushed again a different way: the same pseudopods are steered, none picked anew
  run(g, 0.6, raw({ rs: 90, ls: 200 }));
  assert.equal(g.R.sel, r, 'R kept'); assert.equal(g.R.adj, l, 'L kept');
  // movement mode keeps them too
  run(g, 0.5, raw({ rs: 0, ls: 0, move: 1 }));
  assert.equal(g.R.sel, r); assert.equal(g.R.adj, l);
});

test('a busy pseudopod is not editable until its stick is back at neutral', () => {
  const g = rig();
  run(g, 1.2, raw({ rs: 0 }));
  // RT goes down with RS still pushed: busy, and pushing it does not move the glow
  run(g, 0.5, raw({ rs: 90, choose: 1 }));
  const gl = g.R.glow.sel;
  assert.equal(g.R.mode, 'choose');
  assert.ok(gl.busy && !gl.moved, 'busy while the stick has not rested');
  assert.ok(Math.abs(angDiff(gl.a, tipAngle(g.b, g.R.sel) * DEG)) < 0.3, 'its glow stays on its pseudopod');
  run(g, 0.1, raw({ choose: 1 })); // neutral
  assert.ok(!gl.busy, 'editable once at neutral');
  run(g, 0.8, raw({ rs: 120, choose: 1 }));
  assert.ok(gl.moved && Math.abs(angDiff(gl.a, 120 * DEG)) < 0.05, `then it follows the stick (${(gl.a / DEG).toFixed(0)}°)`);
  assert.ok(g.events.includes('enter'));
});

test('the glow eases from where it was and settles exactly on the target', () => {
  const gl = { a: 0, v: 0, target: 100 * DEG };
  const path = [];
  for (let i = 0; i < 60; i++) { easeGlow(gl, DT); path.push(gl.a); }
  assert.ok(path[0] < 6 * DEG && path[1] - path[0] > path[0], 'it starts gently and speeds up');
  assert.ok(path.every((a, i) => i === 0 || a >= path[i - 1] - 1e-9), 'no overshoot back and forth (critically damped)');
  assert.ok(path.every((a) => a <= 100 * DEG + 1e-9), 'never past the target');
  assert.equal(gl.a, 100 * DEG, 'settled exactly within 1 s');
  // the short way round across ±180°
  const g2 = { a: 170 * DEG, v: 0, target: -170 * DEG };
  for (let i = 0; i < 60; i++) easeGlow(g2, DT);
  assert.ok(Math.abs(angDiff(g2.a, -170 * DEG)) < 1e-9);
});

test('the glow snaps to an existing base within ~20°, with hysteresis', () => {
  const g = rig();
  run(g, 1.2, raw({ rs: 0, ls: 90 })); // pseudopods at ~0° (R) and ~90° (L)
  run(g, 0.7, raw({ rs: 180 })); // R moved off to the far side
  const k90 = g.R.adj, a90 = tipAngle(g.b, k90);
  const R2 = selectRoles(); R2.sel = g.R.sel; // a fresh chooser whose L has no pseudopod: L's glow may take the 90° one
  R2.glow = { sel: { a: 0, v: 0, target: 0, snapK: null }, adj: { a: 200 * DEG, v: 0, target: 200 * DEG, snapK: null } };
  const gl = R2.glow.adj;
  aimGlow(g.b, R2, 'adj', gl, (a90 + 15) * DEG);
  assert.equal(gl.snapK, k90, 'within 20°: snapped to its base');
  assert.ok(Math.abs(angDiff(gl.target, a90 * DEG)) < 1e-6);
  aimGlow(g.b, R2, 'adj', gl, (a90 + 25) * DEG);
  assert.equal(gl.snapK, k90, 'still held at 25° (hysteresis)');
  aimGlow(g.b, R2, 'adj', gl, (a90 + 35) * DEG);
  assert.equal(gl.snapK, null, 'let go past ~28°');
  assert.ok(Math.abs(angDiff(gl.target, (a90 + 35) * DEG)) < 1e-6, 'and follows the stick');
});

test('L and R never share a base', () => {
  const g = rig();
  run(g, 1.2, raw({ rs: 0, ls: 180 }));
  run(g, 0.1, raw({ choose: 1 }));
  run(g, 1, raw({ rs: 180, ls: 180, choose: 1 })); // both sticks at the same place
  const a = g.R.glow.sel.target, b = g.R.glow.adj.target;
  assert.ok(Math.abs(angDiff(a, b)) >= GLOW.sep - 1e-6, `held apart (${(Math.abs(angDiff(a, b)) / DEG).toFixed(0)}°)`);
  run(g, 0.2, raw({})); // commit
  assert.notEqual(g.R.sel, g.R.adj);
});

test('letting RT go commits: an existing pseudopod taken, or a new one grown at a bare base', () => {
  const g = rig();
  run(g, 1.2, raw({ rs: 0, ls: 90 }));
  const R0 = g.R.sel, L0 = g.R.adj;
  // R: to the bare membrane at 220°; L: left at neutral (keeps its pseudopod)
  run(g, 0.1, raw({ choose: 1 }));
  run(g, 0.9, raw({ rs: 220, choose: 1 }));
  run(g, 0.05, raw({})); // RT up
  assert.ok(g.events.includes('commit'));
  assert.equal(g.R.adj, L0, 'L untouched');
  assert.notEqual(g.R.sel, R0, 'R moved to a new pseudopod');
  run(g, 1, raw({})); // it grows out on its own
  const k = g.R.sel;
  assert.ok(podExists(g.b, k), 'the new one stands out');
  assert.ok(Math.abs(angDiff(tipAngle(g.b, k) * DEG, 220 * DEG)) < 25 * DEG, `grown at its glow's base (${tipAngle(g.b, k).toFixed(0)}°)`);
  // and choosing L onto R's old pseudopod at ~0° takes that one
  const old = podList(g.b).find((c) => c.k === R0);
  if (old) {
    run(g, 0.1, raw({ choose: 1 }));
    run(g, 0.9, raw({ ls: old.a / DEG + 8, choose: 1 }));
    run(g, 0.05, raw({}));
    assert.equal(g.R.adj, R0, 'L took the existing pseudopod at its glow');
  }
});

test('LB thickens the steered pseudopod; with none steered it spreads the whole cell', () => {
  const thin = rig(), thick = rig();
  run(thin, 1.5, raw({ rs: 0 }));
  run(thick, 1.5, raw({ rs: 0, lb: 1 }));
  const width = (b, k) => {
    // the pseudopod's width 40 µm in from its tip
    const p = b.pods[k], tx = b.x[p.tip], ty = b.y[p.tip], ux = (tx - b.cx), uy = (ty - b.cy), ul = Math.hypot(ux, uy);
    const qx = tx - (ux / ul) * 40, qy = ty - (uy / ul) * 40, nx = -uy / ul, ny = ux / ul;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < b.x.length; i++) { const along = (b.x[i] - qx) * (ux / ul) + (b.y[i] - qy) * (uy / ul); if (Math.abs(along) > 6) continue; const across = (b.x[i] - qx) * nx + (b.y[i] - qy) * ny; lo = Math.min(lo, across); hi = Math.max(hi, across); }
    return hi - lo;
  };
  const wThin = width(thin.b, thin.R.sel), wThick = width(thick.b, thick.R.sel);
  assert.ok(wThick > 1.3 * wThin, `broader with LB (${wThick.toFixed(0)} vs ${wThin.toFixed(0)} µm)`);
  assert.ok(thick.b.spread < 0.05, 'the steered one thickens, the cell does not spread');
  const g = rig();
  const out = run(g, 1.5, raw({ lb: 1 }));
  assert.equal(out.spread, 1); assert.equal(out.round, 1);
  assert.ok(g.b.spread > 0.5, `nothing steered: the whole cell spreads (${g.b.spread.toFixed(2)})`);
});

test('basePoint sits on the body where a pseudopod meets it', () => {
  const g = rig();
  run(g, 1.5, raw({ rs: 0 }));
  const a = tipAngle(g.b, g.R.sel) * DEG, p = basePoint(g.b, a);
  const r = Math.hypot(p.x - g.b.cx, p.y - g.b.cy);
  assert.ok(r <= g.b.req * 0.95 + 1e-6 && r > g.b.req * 0.6, `at ${r.toFixed(0)} µm (req ${g.b.req.toFixed(0)})`);
});

test('moving (LT) into a pseudopod its stick is not reaching with: it thickens into a stump and is absorbed; a reached one keeps its length', () => {
  const reach = (b, k) => b.podReach(b.pods[k]);
  // a pseudopod out to the right, then LT with LS crawling right while RS (its stick) rests
  const g = rig();
  run(g, 3, raw({ rs: 0 }));
  const k = g.R.sel, r0 = reach(g.b, k);
  assert.ok(r0 > 50, `out ${r0.toFixed(0)} µm`);
  run(g, 2, (t) => { const out = raw({ ls: 0, move: 1 }); return out; });
  const r1 = reach(g.b, k);
  assert.ok(r1 < r0 * 0.6, `shorter as the body rolls in (${r0.toFixed(0)} → ${r1.toFixed(0)} µm)`);
  assert.ok(g.b.pods[k].spr > 0.5, 'broadened into a stump');
  run(g, 4, raw({ ls: 0, move: 1 }));
  assert.ok(!podExists(g.b, k) || reach(g.b, k) < 30, `merged into the body (${reach(g.b, k).toFixed(0)} µm left)`);
  // the same, but RS pushed along the travel: it keeps reaching and the cell follows
  const h = rig();
  run(h, 3, raw({ rs: 0 }));
  const j = h.R.sel, q0 = reach(h.b, j), x0 = h.b.cx;
  run(h, 3, raw({ ls: 0, rs: 10, move: 1 }));
  assert.ok(reach(h.b, j) > q0 * 0.8, `it keeps its reach (${q0.toFixed(0)} → ${reach(h.b, j).toFixed(0)} µm)`);
  assert.ok(h.b.cx - x0 > 40, `and the cell travels behind it (${(h.b.cx - x0).toFixed(0)} µm)`);
  // one to the side is left alone
  const s = rig();
  run(s, 3, raw({ rs: 90 }));
  const m = s.R.sel, side0 = reach(s.b, m);
  run(s, 1, raw({ ls: 0, move: 1 }));
  assert.ok(reach(s.b, m) > side0 * 0.6, 'a pseudopod to the side is not turned into a stump');
});
