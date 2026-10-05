import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribe, makeCall, practicePattern, PracticeSession, loopPosition, KITS, DOTS } from '../src/practice.js';

const play = (times, drums = 'LRLRLRLRLRLR') => times.map((t, i) => ({ drum: drums[i % drums.length], t }));

test('even strokes read as plain beats at the player’s tempo', () => {
  const r = transcribe(play([0, 0.5, 1, 1.5]));
  assert.equal(r.text, 'L R L R');
  assert.ok(Math.abs(r.u - 0.5) < 0.01);
  assert.equal(r.beats, 4);
});

test('quick strokes share a beat as pairs and triplets', () => {
  assert.equal(transcribe(play([0, 0.6, 1.2, 1.5], 'LRRR')).text, 'L R RR');
  assert.equal(transcribe(play([0, 0.6, 0.8, 1.0, 1.2], 'LRRRL')).text, 'L RRR L');
  // Too quick for plain beats (over 200 BPM): read as pairs.
  assert.equal(transcribe(play([0, 0.2, 0.4, 0.6], 'LRLR')).text, 'LR LR');
});

test('a held beat is a rest, and a little unevenness is forgiven', () => {
  assert.equal(transcribe(play([0, 0.5, 1.5, 2.0])).text, 'L R - L R');
  const r = transcribe(play([0, 0.52, 0.97, 1.27, 1.5, 2.03], 'LRRRLR'));
  assert.equal(r.text, 'L R RR L R');
});

test('every stroke keeps its drum and order', () => {
  const strokes = play([0, 0.4, 0.55, 0.8, 1.2, 1.33, 1.46, 1.6], 'LRRLRRRL');
  const r = transcribe(strokes);
  assert.equal(r.strokes.length, strokes.length);
  assert.deepEqual(r.strokes.map((s) => s.drum).join(''), 'LRRLRRRL');
  for (let i = 1; i < r.strokes.length; i++) assert.ok(r.strokes[i].pos > r.strokes[i - 1].pos);
});

test('free play: a full rhythm loops from the next beat, a new one quiets and replaces it', () => {
  const s = new PracticeSession({ mode: 'free', dots: 4 });
  let ev = [];
  for (const [i, t] of [0, 0.5, 1, 1.5].entries()) ev = s.stroke('LRLR'[i], t + 10);
  const loop = ev.find((e) => e.type === 'loop').loop;
  assert.equal(loop.text, 'L R L R');
  assert.ok(Math.abs(loop.start - 12) < 0.02, 'starts on the beat after the fourth');
  assert.ok(Math.abs(loop.period - 2) < 0.02);
  assert.equal(loopPosition(loop, 12.6).played, 2);
  // A new rhythm: phraseStart first (main.js quiets the loop); the old loop
  // stays until the new one is complete.
  assert.equal(s.stroke('R', 13)[0].type, 'phraseStart');
  s.stroke('R', 13.6);
  s.stroke('L', 14.2);
  assert.equal(s.loop.text, 'L R L R');
  ev = s.stroke('R', 14.5);
  assert.equal(ev.find((e) => e.type === 'loop').loop.text, 'R R LR');
});

test('free play: stopping part way lets the rhythm go; clear stops the loop', () => {
  const s = new PracticeSession({ mode: 'free', dots: 3 });
  s.stroke('L', 0);
  s.stroke('R', 0.5);
  assert.deepEqual(s.update(1.0), []);
  assert.equal(s.update(3).find((e) => e.type === 'abandon').type, 'abandon');
  assert.equal(s.phrase.length, 0);
  s.stroke('L', 4);
  s.stroke('R', 4.5);
  s.stroke('L', 5);
  assert.ok(s.loop);
  assert.equal(s.clear(6)[0].stopped, true);
  assert.equal(s.loop, null);
});

test('LB and RB: 2 to 12 strokes, and the rhythm being drummed starts over', () => {
  const s = new PracticeSession({ mode: 'free', dots: 2 });
  assert.deepEqual(s.setDots(1, 0), []);
  assert.equal(s.dots, DOTS.min);
  s.stroke('L', 1);
  assert.equal(s.setDots(5, 1.2)[0].dots, 5);
  assert.equal(s.phrase.length, 0);
  s.setDots(40, 2);
  assert.equal(s.dots, DOTS.max);
});

test('a partner’s call has the same number of strokes', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let n = DOTS.min; n <= DOTS.max; n++) {
    for (let k = 0; k < 20; k++) {
      const c = makeCall(n, rnd);
      assert.equal(c.strokes.length, n);
      // Deep strokes only open a beat.
      for (const beat of c.text.split(' ')) assert.ok(!beat.slice(1).includes('L'), c.text);
      assert.deepEqual(practicePattern(c.text).strokes, c.strokes);
    }
  }
});

test('call and answer: any answer of the right length, then the next call on the next beat', () => {
  const s = new PracticeSession({ mode: 'call', dots: 4 });
  const first = s.update(2).find((e) => e.type === 'call').call;
  assert.equal(first.strokes.length, 4);
  // Answer with something else entirely, after the call.
  const t0 = first.end + 1;
  let ev = [];
  for (const [i, dt] of [0, 0.6, 0.9, 1.2].entries()) ev = s.stroke('RRLR'[i], t0 + dt);
  const answered = ev.find((e) => e.type === 'answered').answer;
  assert.equal(answered.text, 'R RL R');
  const next = ev.find((e) => e.type === 'call').call;
  assert.ok(next.start > t0 + 1.2 && next.start < t0 + 1.9, 'the partner comes back on the next beat');
  assert.ok(Math.abs(next.u - 0.6) < 0.02, 'at the player’s tempo');
  // Answering during a call cuts it short.
  const cut = s.stroke('L', next.start + 0.1);
  assert.ok(cut.some((e) => e.type === 'cutCall'));
});

test('call and answer: an unanswered call is played again', () => {
  const s = new PracticeSession({ mode: 'call', dots: 3 });
  const c = s.update(2).find((e) => e.type === 'call').call;
  const again = s.update(c.end + 30).find((e) => e.type === 'call');
  assert.equal(again.again, true);
  assert.equal(again.call.text, c.text);
});

test('every kit has a low and a high voice', () => {
  assert.equal(new Set(KITS.map((k) => k.id)).size, KITS.length);
  for (const k of KITS) assert.ok(k.L && k.R && k.L !== k.R && k.name && k.vn);
});
