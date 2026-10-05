import test from 'node:test';
import assert from 'node:assert/strict';
import { EchoSession, CastingSession, callPattern, dueWaves } from '../src/modes.js';
import { DrumReader } from '../src/rhythm.js';
import { STAGES } from '../src/stages.js';

/** Answer the current call through a real reader at u seconds per beat, from t0. */
function answer(session, reader, t0, u) {
  reader.patterns = [session.pattern];
  let cmd = null;
  for (const s of session.pattern.strokes) {
    for (const ev of reader.hit(s.drum, t0 + s.pos * u)) if (ev.type === 'command') cmd = ev;
  }
  return cmd ? session.answer(cmd, t0 + 4 * u) : [];
}

test('echo: the caller calls, then it is the player’s turn', () => {
  const s = new EchoSession({ calls: [{ text: 'L R L R', bpm: 60 }] });
  const ev = s.update(0);
  assert.equal(ev[0].type, 'call');
  assert.equal(ev[0].call.strokes.length, 4);
  assert.equal(s.update(4)[0].type, 'yourTurn');
});

test('echo: the player may answer during the call, which ends it early', () => {
  const s = new EchoSession({ calls: [{ text: 'L R L R', bpm: 60 }, { text: 'L R R L', bpm: 60 }] });
  s.update(0);
  assert.equal(s.phase, 'calling');
  const ev = s.answer({ accuracy: 1, u: 1 }, 2.5);
  assert.equal(ev[0].type, 'answered');
  assert.ok(ev[0].early, 'marked early so the caller can fall silent');
  assert.equal(s.phase, 'waiting');
  // The call's end does not reopen the answer.
  assert.deepEqual(s.update(4).map((e) => e.type), []);
});

test('echo: answering every call completes the chapter, with its evenness', () => {
  const s = new EchoSession({ calls: [{ text: 'L R L R', bpm: 60 }, { text: 'L RR L R', bpm: 60 }], pause: 0.5 });
  const r = new DrumReader({ unlocked: [] });
  s.update(0);
  s.update(4);
  const a = answer(s, r, 5, 0.7);
  assert.equal(a[0].type, 'answered');
  r.update(20);
  let t = 20;
  s.update(t);
  t += 4;
  s.update(t);
  const b = answer(s, r, t + 0.5, 0.6);
  assert.ok(b.some((e) => e.type === 'complete'));
  assert.ok(s.done);
  assert.equal(s.evenness(), 1);
});

test('echo: with matchTempo, an answer far from the caller’s speed does not count', () => {
  const s = new EchoSession({ calls: [{ text: 'L R L R', bpm: 60 }], matchTempo: true, tolerance: 0.3 });
  const r = new DrumReader({ unlocked: [] });
  s.update(0);
  s.update(4);
  const fast = answer(s, r, 5, 0.5);
  assert.equal(fast[0].type, 'offTempo');
  assert.ok(fast[0].faster);
  r.action = null;
  const close = answer(s, r, 10, 0.9);
  assert.equal(close[0].type, 'answered');
});

test('echo: an unanswered call is played again', () => {
  const s = new EchoSession({ calls: [{ text: 'L R L R', bpm: 60 }] });
  s.update(0);
  s.update(4);
  const ev = s.update(4 + 11);
  assert.equal(ev[0].type, 'repeat');
  assert.equal(s.update(15.5)[0].type, 'call');
});

test('casting: steady phrases pour, a drifting phrase cracks the mould', () => {
  const c = new CastingSession({ drums: 2, pours: 2, tolerance: 0.12 });
  assert.equal(c.pour({ u: 0.6 })[0].type, 'pour');
  const cast = c.pour({ u: 0.63 });
  assert.ok(cast.some((e) => e.type === 'cast'));
  assert.equal(c.cast, 1);
  c.pour({ u: 0.6 });
  const crack = c.pour({ u: 0.45 });
  assert.equal(crack[0].type, 'crack');
  assert.ok(crack[0].faster);
  assert.equal(c.level, 0);
  c.pour({ u: 0.46 });
  const done = c.pour({ u: 0.47 });
  assert.ok(done.some((e) => e.type === 'complete'));
  assert.ok(c.done);
});

test('waves arrive once each, when due', () => {
  const spawned = new Set();
  const waves = [{ at: 5 }, { at: 10 }];
  assert.equal(dueWaves(waves, 4, spawned).length, 0);
  assert.equal(dueWaves(waves, 6, spawned).length, 1);
  assert.equal(dueWaves(waves, 6, spawned).length, 0);
  assert.equal(dueWaves(waves, 20, spawned).length, 1);
});

test('every call and casting rhythm keeps deep strokes a beat apart and parses', () => {
  for (const s of STAGES) {
    const texts = [...(s.calls || []).map((c) => c.text), ...(s.rhythm ? [s.rhythm] : [])];
    for (const text of texts) {
      const p = callPattern(text);
      assert.equal(text.split(' ').length, 4, `${s.id}: ${text}`);
      const deep = p.strokes.filter((x) => x.drum === 'L').map((x) => x.pos);
      for (let i = 1; i < deep.length; i++) assert.ok(deep[i] - deep[i - 1] >= 1 - 1e-9, `${s.id}: ${text}`);
    }
  }
});

test('the chapters are in story order with a mode each', () => {
  assert.deepEqual(STAGES.map((s) => s.id), ['garden', 'oath', 'casting', 'villages', 'outpost', 'luylau', 'coronation', 'mavien', 'elegy']);
  for (const s of STAGES) {
    const mode = s.mode || 'battle';
    assert.ok(['battle', 'echo', 'casting'].includes(mode), s.id);
    if (mode === 'echo') assert.ok(s.calls.length >= 4 && s.caller, s.id);
    if (mode === 'casting') assert.ok(s.rhythm && s.drums && s.pours, s.id);
    if (mode === 'battle') assert.ok(s.unlocked && s.unlocked.length, s.id);
  }
});

test('the next call follows an answer promptly (at most half the old wait)', () => {
  // The Oath's tempo. The old wait ran to the end of the army's four-beat
  // answer plus 1.2 s: about 5u + 1.2 after the last stroke.
  const s = new EchoSession({ calls: [{ text: 'L R L R', bpm: 56 }, { text: 'L R R L', bpm: 56 }] });
  s.update(0);
  const u = s.call.u;
  s.update(s.call.end);
  const last = s.answerBy - 3; // the answer's last stroke
  s.answer({ accuracy: 1, u, ready: last + 5 * u }, last);
  const old = 5 * u + 1.2;
  assert.ok(s.nextCallAt - last <= old / 2, `${(s.nextCallAt - last).toFixed(2)} s, was ${old.toFixed(2)} s`);
  assert.ok(s.nextCallAt - last >= 1, 'still time to see the answer land');
  const ev = s.update(s.nextCallAt);
  assert.equal(ev[0].type, 'call');
});
