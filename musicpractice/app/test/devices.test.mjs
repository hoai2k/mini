import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBluetooth, isBuiltIn, preferredMic } from '../src/devices.js';

const mic = (deviceId, label) => ({ deviceId, label, kind: 'audioinput' });

test('tells Bluetooth devices from built-in ones by name', () => {
  for (const l of ['AirPods Pro', 'JBL Flip 5 (Bluetooth)', 'Galaxy Buds2', 'Bose QC45 Hands-Free', 'BT Headset']) assert.ok(isBluetooth(l), l);
  for (const l of ['iPhone Microphone', 'MacBook Pro Microphone (Built-in)', 'Internal Microphone', 'Microphone Array (Realtek)']) {
    assert.ok(!isBluetooth(l), l);
    assert.ok(isBuiltIn(l), l);
  }
});

test('prefers the built-in mic when a Bluetooth mic is present', () => {
  const inputs = [mic('default', 'Default - AirPods'), mic('a', 'AirPods'), mic('b', 'iPhone Microphone')];
  assert.equal(preferredMic(inputs), 'b');
  assert.equal(preferredMic([mic('b', 'iPhone Microphone')]), null); // no Bluetooth: system default
  assert.equal(preferredMic([mic('a', 'AirPods')]), null); // only Bluetooth: nothing better
});

test('an explicit choice wins while the device is there', () => {
  const inputs = [mic('a', 'AirPods'), mic('b', 'iPhone Microphone')];
  assert.equal(preferredMic(inputs, 'a'), 'a');
  assert.equal(preferredMic(inputs, 'gone'), null);
});
