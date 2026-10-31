import test from 'node:test';
import assert from 'node:assert/strict';
import { swimIntent, swimLookPitch, followYaw, wrapAngle } from './swim-control.js';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test('LS supplies analog propulsion and camera-relative turns without a trigger', () => {
  near(swimIntent({ x: 0, y: 0 }, 0).thrust, 0);
  near(swimIntent({ x: 0, y: -0.5 }, 0).thrust, 0.5);
  near(swimIntent({ x: 0, y: -1 }, 0.8).yaw, 0.8);
  near(swimIntent({ x: 1, y: 0 }, 0).yaw, -Math.PI / 2);
  near(swimIntent({ x: -1, y: 0 }, 0).yaw, Math.PI / 2);
  near(Math.abs(swimIntent({ x: 0, y: 1 }, 0).yaw), Math.PI);
  near(swimIntent({ x: 1, y: -1 }, 0).thrust, 1);
});
test('RS pitch aims forward swimming while a sideways swim remains horizontal', () => {
  near(swimLookPitch(-0.25), 0);
  assert.ok(swimLookPitch(0.4) > 0);
  assert.ok(swimLookPitch(-0.9) < 0);
  near(swimIntent({ x: 0, y: -1 }, 1, 0.6).pitch, 0.6);
  near(swimIntent({ x: 1, y: 0 }, 1, 0.6).pitch, 0);
});
test('manual camera hold wins, then heading follow uses the shortest turn', () => {
  near(followYaw(1, -1, 1, 0.45), 1);
  const start = Math.PI - 0.1, heading = -Math.PI + 0.1;
  assert.ok(followYaw(start, heading, 0.1) > start);
  near(wrapAngle(followYaw(start, heading, 20) - heading), 0);
  near(followYaw(0.7, 0.7, 10), 0.7);
});
