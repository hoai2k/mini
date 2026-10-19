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

test('no email sends a reserved non-address the shared script accepts', async () => {
  const { sendFeedback, NO_EMAIL } = await import('../src/feedback.js');
  // The shared script's own check (hoai2k.github.io tools/feedback/Code.gs).
  assert.match(NO_EMAIL, /^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  assert.ok(NO_EMAIL.endsWith('.invalid'));
  const sent = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (_url, init) => { sent.push(JSON.parse(init.body)); return { json: async () => ({ ok: true }) }; };
  try {
    assert.equal(await sendFeedback({ email: '  ', topic: 'Idea', message: 'Hi', details: '', elapsed: 5000, hp: '' }), true);
    assert.equal(await sendFeedback({ email: ' a@b.co ', topic: 'Idea', message: 'Hi', details: '', elapsed: 5000, hp: '' }), true);
  } finally { globalThis.fetch = real; }
  assert.equal(sent[0].email, NO_EMAIL);
  assert.equal(sent[1].email, 'a@b.co');
});
