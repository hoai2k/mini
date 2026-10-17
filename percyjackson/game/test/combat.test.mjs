// Battle feel (js/combatRules.js): knock-back reads as Minecraft Dungeons
// does (a block or two for a cut, three to five for a finisher, little for
// the heavy monsters), the heroes' shots reach well across the screen, and
// the 3D aim pitches a shot up or down to a monster on a ledge, follows the
// ground with nothing to aim at, and flies level over a pit.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KNOCK, RANGED, AIM, lifeOf, knockKeep, knockSpeed, knockDistance, staggerScale, walkKeep,
  pitchTo, dirOf, bodyCentre, lineTarget, rayToUpright, cursorTarget, groundPitch, lobVy,
} from '../js/combatRules.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const foe = (x, y, z, o = {}) => ({ pos: { x, y, z }, radius: 0.45, height: 2, ...o });

test('a quick cut shoves a light monster a block or two, a finisher three to five', () => {
  // the combo tables (heroes/*.js) use knock 2-5 for cuts and 9-15 for finishers
  for (const k of [3.5, 4, 5]) { const d = knockDistance(k); assert.ok(d >= 1.5 && d <= 3, `knock ${k}: ${d.toFixed(2)} m`); }
  for (const k of [9, 10, 15]) { const d = knockDistance(k); assert.ok(d >= 3 && d <= 6, `knock ${k}: ${d.toFixed(2)} m`); }
  // softened past KNOCK.soft: a finisher shoves harder, but not three times as far
  assert.ok(knockDistance(10) > knockDistance(5) && knockDistance(10) < knockDistance(5) * 2);
  assert.ok(near(knockSpeed(KNOCK.soft), KNOCK.soft * KNOCK.scale));
});

test('heavy monsters resist knock-back sensibly', () => {
  // hellhound 0.7, cyclops 0.9: a finisher still budges them, a cut barely
  assert.ok(knockDistance(10, 0.9) < 2 && knockDistance(10, 0.9) > 0.5);
  assert.ok(knockDistance(3.5, 0.7) < 1);
  assert.ok(knockDistance(10, 0.7) < knockDistance(10, 0.2));
  // a shield's block takes all of its resistance
  assert.equal(knockKeep(1, true), 0);
  assert.ok(knockKeep(0.75, false) > 0);
  // bosses only budge
  assert.ok(KNOCK.boss > 0 && KNOCK.boss < 0.3);
});

test('light monsters flinch from every cut; a hard shove stops their walking', () => {
  // a melee cut staggers for 0.25 s and a stagger needs more than 0.15 to land
  assert.ok(0.25 * staggerScale(0.2) > 0.15, 'serpents and skeletons flinch');
  assert.ok(0.25 * staggerScale(0.7) <= 0.15, 'a hellhound shrugs off a quick cut');
  assert.equal(walkKeep(KNOCK.override), 0);
  assert.equal(walkKeep(0), 1);
});

test('shots reach well across the screen, and arrows only nudge', () => {
  for (const id of ['bolt', 'jet', 'knife', 'note']) {
    const r = RANGED[id];
    assert.ok(r.range >= 20, `${id} reaches ${r.range} m`);
    assert.ok(near(lifeOf(r) * r.speed, r.range));
    const d = knockDistance(r.knock);
    assert.ok(d > 0.5 && d < 2, `${id} shoves ${d.toFixed(2)} m`);
  }
  assert.ok(RANGED.boulder.reach >= 15);
  assert.ok(AIM.assist >= RANGED.knife.range, 'the pad assist looks as far as a knife flies');
});

test('a shot pitches up to a monster on a ledge and down to one below, within limits', () => {
  const from = { x: 0, y: 1.1, z: 0 };
  const up = pitchTo(from, bodyCentre(foe(0, 3, 10)));
  assert.ok(up > 0.15 && up < AIM.maxPitch, `up ${up}`);
  const down = pitchTo({ x: 0, y: 4.1, z: 0 }, bodyCentre(foe(0, 0, 8)));
  assert.ok(down < -0.2, `down ${down}`);
  assert.equal(pitchTo(from, { x: 0, y: 40, z: 2 }), AIM.maxPitch, 'clamped');
  assert.equal(pitchTo(from, { x: 0.1, y: 5, z: 0 }), 0, 'straight overhead: level');
  // flat ground, same height: level
  assert.equal(pitchTo(from, { x: 3, y: 1.1, z: 4 }), 0);
  const d = dirOf(Math.PI / 2, 0.3);
  assert.ok(near(Math.hypot(d.x, d.y, d.z), 1) && near(d.z, 0) && d.x > 0 && d.y > 0);
});

test('the monster on the aim line sets the pitch; one off to the side does not', () => {
  const from = { x: 0, y: 1.1, z: 0 }, dir = { x: 0, y: 0, z: 1 };
  const a = foe(0.6, 3, 10), b = foe(4, 0, 6), c = foe(0, 0, 30), behind = foe(0, 0, -5);
  assert.equal(lineTarget(from, dir, [a, b, c, behind]), a);
  assert.equal(lineTarget(from, dir, [b, behind]), null);
  assert.equal(lineTarget(from, dir, [c]), null, 'out of range');
  assert.equal(lineTarget(from, dir, [foe(0, 0, 9, { dead: true })]), null);
  assert.equal(lineTarget(from, dir, [foe(0, 0, 9, { disguised: true })]), null, 'not someone in the Mist');
  assert.equal(lineTarget(from, dir, [foe(0, 30, 9)]), null, 'not a floor far above');
});

test('the cursor ray picks the monster it passes through', () => {
  // a camera up and back, looking down at a monster standing on a ledge
  const o = { x: 0, y: 20, z: -16 }, target = { x: 0, y: 4, z: 6 };
  const len = Math.hypot(target.x - o.x, target.y - o.y, target.z - o.z);
  const d = { x: (target.x - o.x) / len, y: (target.y - o.y) / len, z: (target.z - o.z) / len };
  const e = foe(0, 3, 6);
  assert.ok(rayToUpright(o, d, e.pos, e.height).dist < 0.01);
  assert.equal(cursorTarget(o, d, [foe(5, 0, 6), e], { x: 0, y: 0, z: 0 }), e);
  assert.equal(cursorTarget(o, d, [foe(3, 3, 6)], { x: 0, y: 0, z: 0 }), null);
});

test('with nothing to aim at, a shot follows the ground and flies level over a pit', () => {
  assert.ok(groundPitch(5, 6) > 0.2, 'up a stair');
  assert.ok(groundPitch(5, 4) < -0.2, 'down a step');
  assert.equal(groundPitch(5, 5), 0);
  assert.equal(groundPitch(5, null), 0);
  assert.equal(groundPitch(5, -Infinity), 0);
  assert.equal(groundPitch(5, 5 - AIM.groundDrop - 1), 0, 'a pit');
  assert.ok(groundPitch(0, 50) <= AIM.maxPitch);
});

test('a lob lands at the height it was aimed at', () => {
  const { flight, gravity } = RANGED.boulder;
  for (const dy of [-3, 0, 4]) {
    const vy = lobVy(dy, flight, gravity);
    assert.ok(near(vy * flight - 0.5 * gravity * flight * flight, dy));
  }
});
