// Cells meeting cells, and the giant amoeba Chaos (contact.js, chaos.js), in
// node with no browser: membranes never overlap, the stronger push wins
// ground, touching Chaos never eats you, and only a closed ring plus its X
// does; pushing out through the gap gets you away.
//
//   node --test micro/prototypes/amoeba/contact.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Body } from '../shared/techniques/amoeba-softbody.js';
import { rng } from './util.js';
import { resolvePair, overlap, shiftBody, thickness, pushAt, encircle, reaches } from './contact.js';
import { Chaos, RING } from './chaos.js';

const DT = 1 / 60, W = { capsules: [], circles: [] };
const crawl = (dx, dy) => ({ pods: [{ m: 1, dx, dy }, { m: 0, dx: 1, dy: 0 }], push: 0, spread: 0, body: { m: 1, dx, dy } });
/** Settle a touching pair as main.js resolveCells does; returns whether they touched. */
function settle(A, B) {
  let hit = false;
  for (let round = 0; round < 2; round++) {
    for (let it = 0; it < 4; it++) {
      const r = resolvePair(A, B);
      if (!r) break;
      hit = true;
      shiftBody(A, r.shiftA.x, r.shiftA.y); shiftBody(B, r.shiftB.x, r.shiftB.y);
    }
    A.untangle(); B.untangle(); A.centroid(); B.centroid();
  }
  return hit;
}

/** Two cells crawling into each other for `sec` s: A's push multiplier kA, B's kB. */
function shove(kA, kB, sec = 10) {
  const A = new Body(rng(1), -175, 0), B = new Body(rng(2), 175, 0);
  A.opts.idlePods = B.opts.idlePods = false;
  A.pushK = kA; B.pushK = kB;
  let deepest = 0;
  for (let s = 0; s < sec / DT; s++) {
    A.step(DT, crawl(1, 0), W); B.step(DT, crawl(-1, 0), W);
    settle(A, B);
    deepest = Math.max(deepest, overlap(A, B).depth);
  }
  return { A, B, deepest };
}

test('two cells pushing never overlap (under 2 µm left after each step)', () => {
  for (const [a, b] of [[1, 1], [2.5, 1], [1, 2.5]]) {
    const r = shove(a, b);
    assert.ok(r.deepest < 2, `${a} vs ${b}: deepest ${r.deepest.toFixed(2)} µm`);
  }
});

test('the stronger push wins ground', () => {
  const surge = shove(2.5, 1, 8);
  assert.ok(surge.A.cx > -120, `a surging cell drives on (${surge.A.cx.toFixed(0)} µm from -175)`);
  const weak = shove(1, 2.5, 8);
  assert.ok(weak.B.cx < 120, `and is driven back by one (${weak.B.cx.toFixed(0)} µm from 175)`);
});

test('a thick pseudopod pushes harder than a thin one; a body harder than either', () => {
  const b = new Body(rng(4), 0, 0);
  b.Gp.fill(1);
  // the disc's thickness is capped (a body); squeeze a copy into a thin finger for a thin arm
  const body = thickness(b, 0);
  const thin = new Body(rng(5), 0, 0);
  for (let i = 0; i < thin.x.length; i++) thin.y[i] *= 0.15;
  thin.Gp.fill(1);
  const finger = thickness(thin, 40); // through the narrow middle
  assert.ok(body > 150 && finger < 70, `thickness: body ${body.toFixed(0)}, finger ${finger.toFixed(0)}`);
  assert.ok(pushAt(b, 0) > 2.5 * pushAt(thin, 40), 'the body outpushes the finger');
});

test('encircle measures how far one ring surrounds another', () => {
  const P = new Body(rng(6), 0, 0);
  const Q = new Body(rng(7), 0, 0);
  // Q: a horseshoe round P (radius 172), its inner edge at 230 µm, open 90° at +x
  const n = Q.x.length, h = n / 2;
  for (let i = 0; i < n; i++) {
    const k = i < h ? i / (h - 1) : 1 - (i - h) / (h - 1), r = i < h ? 230 : 300;
    const a = Math.PI / 4 + k * Math.PI * 1.5;
    Q.x[i] = r * Math.cos(a); Q.y[i] = r * Math.sin(a);
  }
  const r = encircle(P, Q, 90);
  assert.ok(r.cover > 0.7 && r.cover < 0.8, `cover ${r.cover}`);
  assert.ok(Math.abs(r.gap - Math.PI / 2) < 0.3, `gap ${(r.gap * 57.3).toFixed(0)}°`);
  assert.ok(Math.cos(r.gapA) > 0.9, `the gap faces +x (${(r.gapA * 57.3).toFixed(0)}°)`);
});

/** Chaos at the origin and a player cell beside it; `steer(t, chaos, player)` returns the player's input. */
function bout(sec, steer = () => ({ pods: [], push: 0, spread: 0 })) {
  const view = { addCell: () => ({}), setLook() {} };
  const ch = new Chaos(rng(41), view, 0, 0);
  const pl = new Body(rng(3), 520, 0);
  const ev = [];
  let deepest = 0, touchT = 0;
  for (let s = 0; s < sec / DT; s++) {
    const t = s * DT;
    pl.opts.idlePods = !(touchT > 0); // contact inhibition (main.js touchT)
    pl.step(DT, steer(t, ch, pl), W);
    for (const e of ch.update(DT, DT, [{ cell: 1, body: pl, x: pl.cx, y: pl.cy, req: pl.req, active: true }], W, { granules: false })) ev.push({ t, e: e.e });
    touchT = settle(pl, ch.body) || ch.closing ? 0.6 : Math.max(0, touchT - DT);
    deepest = Math.max(deepest, overlap(pl, ch.body).depth);
    if (ev.some((e) => e.e === 'engulf')) break;
  }
  return { ch, pl, ev, deepest };
}

test('Chaos only engulfs after ringing you all round and closing the ring (its X)', () => {
  const r = bout(40);
  const names = r.ev.map((e) => e.e);
  assert.ok(names.includes('wake'), names.join(' '));
  const shut = r.ev.find((e) => e.e === 'closing'), eat = r.ev.find((e) => e.e === 'engulf');
  assert.ok(shut && eat, `a still cell is ringed and engulfed: ${names.join(' ')}`);
  assert.ok(eat.t - shut.t >= RING.closeT - 0.05, `the X takes its time (${(eat.t - shut.t).toFixed(2)} s)`);
  assert.ok(r.deepest < 3, `never overlapping (${r.deepest.toFixed(2)} µm)`);
});

test('touching Chaos does not eat you, and pushing out through the gap gets you away', () => {
  // out through the gap as soon as the ring starts to form, surging
  const r = bout(40, (t, ch, pl) => {
    if (ch.ring && ch.ring.cover > 0.3) {
      const a = ch.ring.gapA, dx = Math.cos(a), dy = Math.sin(a);
      pl.opts.boost = 2.5; pl.pushK = 2.5;
      return { pods: [{ m: 1, dx, dy }, { m: 0, dx: 1, dy: 0 }], push: 1, spread: 0, body: { m: 1, dx, dy } };
    }
    pl.opts.boost = 1; pl.pushK = 1;
    return { pods: [], push: 0, spread: 0 };
  });
  const names = r.ev.map((e) => e.e);
  assert.ok(names.includes('wake') && names.includes('strike'), names.join(' '));
  assert.ok(!names.includes('engulf') && !names.includes('closing'), `escaped: ${names.join(' ')}`);
});

/**
 * A pseudopod pushed straight into Chaos (calm, so it only resists) for `sec` s.
 * kind: 'thick' (a spread, broad pseudopod, the body following, surging every
 * 3.3 s as the surge recharges), 'thin' (a plain pseudopod alone, no surge).
 * ease: let go after this many s. The portal is a point under Chaos, 260 µm in
 * from its edge. Returns the deepest channel, whether the cell reached the
 * portal, how far in it is at the end, and the deepest overlap. Depth: Chaos.intrusion.
 */
function tunnel(kind, sec = 16, ease = Infinity) {
  const view = { addCell: () => ({}), setLook() {} };
  const ch = new Chaos(rng(41), view, 0, 0);
  const pl = new Body(rng(3), 500, 0);
  pl.opts.idlePods = false;
  const portal = { x: 60, y: 0 };
  let deepest = 0, channel = 0, reachedAt = null, now = 0;
  for (let s = 0; s < sec / DT; s++) {
    const t = s * DT, on = t < ease, thick = kind === 'thick';
    const sk = thick && on && t % 3.3 < 0.9 ? 1 + 1.5 * Math.sin((Math.PI * (t % 3.3)) / 0.9) ** 0.6 : 1;
    pl.opts.boost = sk; pl.pushK = sk;
    const pod = on ? { m: 1, dx: -1, dy: 0, push: thick ? 1 : 0, spread: thick ? 1 : 0 } : { m: 0, dx: -1, dy: 0 };
    pl.step(DT, { pods: [pod, { m: 0, dx: 1, dy: 0 }], push: 0, spread: 0, body: thick && on ? { m: 0.6, dx: -1, dy: 0 } : null }, W);
    ch.update(DT, DT, [{ cell: 1, body: pl, x: pl.cx, y: pl.cy, req: pl.req, active: true }], W, { calm: true, granules: false });
    settle(pl, ch.body);
    deepest = Math.max(deepest, overlap(pl, ch.body).depth);
    now = ch.intrusion(pl);
    channel = Math.max(channel, now);
    if (reachedAt == null && reaches(pl, portal.x, portal.y, 120)) reachedAt = t;
  }
  return { channel, reachedAt, now, under: ch.body.grid.sample(portal.x, portal.y), deepest };
}

test('a thick pseudopod, surging, forces a channel into Chaos; a thin one stalls', () => {
  const thick = tunnel('thick'), thin = tunnel('thin');
  assert.ok(thick.channel > 100, `thick: a channel ${thick.channel.toFixed(0)} µm deep`);
  assert.ok(thin.channel < 75, `thin: stalls at ${thin.channel.toFixed(0)} µm`);
  assert.ok(thick.channel > 2 * thin.channel, 'the thick one gets more than twice as deep');
  assert.ok(thick.deepest < 3 && thin.deepest < 3, `no overlap: the channel is Chaos's membrane dented in (${thick.deepest.toFixed(2)} µm)`);
});

test('ease off and Chaos squeezes the channel shut, shoving the pseudopod out', () => {
  const r = tunnel('thick', 16, 8);
  assert.ok(r.channel > 100 && r.now < r.channel / 3, `${r.channel.toFixed(0)} µm in at most, ${r.now.toFixed(0)} µm 8 s after letting go`);
});

test('a pseudopod tip reaching the portal through Chaos counts as being at it', () => {
  const thick = tunnel('thick', 12), thin = tunnel('thin', 12);
  assert.ok(thick.reachedAt != null && thick.under > 0, `thick: at the portal after ${thick.reachedAt?.toFixed(1)} s, with Chaos still over it (${thick.under.toFixed(0)} µm in)`);
  assert.equal(thin.reachedAt, null, 'thin: never gets there');
});
