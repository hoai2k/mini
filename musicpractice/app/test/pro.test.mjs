import test from 'node:test';
import assert from 'node:assert/strict';
import { isPro, requirePro, trialOf } from '../src/pro.js';
import { isApp, platform } from '../src/native.js';

test('the website is all free: Pro is always on', () => {
  assert.equal(isApp(), false);
  assert.equal(platform(), 'web');
  assert.equal(isPro(), true);
  assert.equal(requirePro('drone'), true);
});

test('the free trial is read from the App Store intro price', () => {
  const product = { identifier: 'pro_yearly', introPrice: { price: 0, cycles: 1, periodUnit: 'WEEK', periodNumberOfUnits: 1 } };
  assert.equal(trialOf(product), '1 week');
  assert.equal(trialOf({ identifier: 'a', introPrice: { price: 0, cycles: 1, periodUnit: 'DAY', periodNumberOfUnits: 7 } }), '7 days');
});

test('the free trial is read from Google Play\'s free phase', () => {
  assert.equal(trialOf({ identifier: 'b', introPrice: null, defaultOption: { freePhase: { billingPeriod: { unit: 'DAY', value: 7 } } } }), '7 days');
});

test('a paid intro price or no offer is not a free trial', () => {
  assert.equal(trialOf({ identifier: 'c', introPrice: { price: 0.99, cycles: 1, periodUnit: 'MONTH', periodNumberOfUnits: 1 } }), '');
  assert.equal(trialOf({ identifier: 'd', introPrice: null, defaultOption: { freePhase: null } }), '');
  assert.equal(trialOf(null), '');
});
