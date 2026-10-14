import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compose, MAX_MESSAGE, GAME, feedbackEnabled, version } from '../src/feedback.js';

test('the shared feedback inbox, as Music Practice', () => {
  assert.equal(GAME, 'musicpractice');
  assert.equal(feedbackEnabled(), true);
});

test('the topic leads and the details follow what they wrote', () => {
  const m = compose({ topic: 'Problem', message: '  The tuner froze.  ', details: 'Running: website' });
  assert.equal(m, '[Problem] The tuner froze.\n\n— Details —\nRunning: website');
  assert.equal(compose({ topic: 'Idea', message: 'A tap tempo', details: '' }), '[Idea] A tap tempo');
});

test('a long message is shortened to fit the script\'s cap, keeping the details', () => {
  const m = compose({ topic: 'Other', message: 'x'.repeat(5000), details: 'd'.repeat(500) });
  assert.equal(m.length, MAX_MESSAGE);
  assert.ok(m.endsWith('d'.repeat(500)));
});

test('the website says so as its version', async () => {
  assert.equal(await version(), 'web');
});
