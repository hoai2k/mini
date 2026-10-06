import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribe, makeCall, practicePattern, PracticeSession, CallSession, riffOn, loopPosition, KITS, BEATS } from '../src/practice.js';

const play = (times, drums = 'LRLRLRLRLRLR') => times.map((t, i) => ({ drum: drums[i % drums.length], t }));

test('even strokes read as plain beats at the player’s tempo', () => {
  const r = transcribe(play([0, 0.5, 1, 1.5]));
  assert.equal(r.text, 'L R L R');
  assert.ok(Math.abs(r.u - 0.5) < 0.01);
  assert.equal(r.beats, 4);
});

test('with a loop playing, a rhythm opening with a pair or a triplet reads at the loop’s tempo', () => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let exact = 0;
  for (let k = 0; k < 120; k++) {
    const beats = 2 + Math.floor(rnd() * 7);
    const c = makeCall(beats, rnd);
    const u = [0.45, 0.6, 0.8][k % 3];
    const s = new PracticeSession({ mode: 'free', beats });
    s.loop = { u, strokes: [], beats, start: 0, period: beats * u };
    // Each stroke off by up to 3% of a beat.
    const ev = drum(s, c.strokes.map((x) => [x.drum, 10 + x.pos * u + (rnd() - 0.5) * 0.06 * u]), 3);
    const loops = ev.filter((e) => e.type === 'loop');
    if (loops.length === 1 && loops[0].loop.text === c.text) exact += 1;
  }
  assert.equal(exact, 120);
});

test('quick strokes share a beat as pairs; triplets only where nothing else fits', () => {
  assert.equal(transcribe(play([0, 0.6, 1.2, 1.5], 'LRRR')).text, 'L R RR');
  // Too quick for plain beats (over 200 BPM): read as pairs.
  assert.equal(transcribe(play([0, 0.2, 0.4, 0.6], 'LRLR')).text, 'LR LR');
  // An even stream reads as pairs, not triplets…
  assert.equal(transcribe(play([0, 0.25, 0.5, 0.75, 1.0, 1.25], 'LRRLRR')).text, 'LR RL RR');
  // …but three strokes in a beat the quarters have already set are a triplet.
  assert.equal(transcribe(play([0, 0.6, 1.2, 1.8, 2.0, 2.2, 2.4], 'LRLRRRL')).text, 'L R L RRR L');
});

test('rests: a silent beat, and a silent slot inside a beat; a little unevenness is forgiven', () => {
  assert.equal(transcribe(play([0, 0.5, 1.5, 2.0])).text, 'L R - L R');
  // An off-beat stroke: a rest, then an eighth.
  assert.equal(transcribe(play([0, 0.5, 1.25, 1.5], 'LRRL')).text, 'L R .R L');
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

/** Drum strokes into a session at their times, running its clock in between and for `tail` seconds after. */
function drum(s, strokes, tail = 0) {
  const ev = [];
  let clock = strokes.length ? strokes[0][1] : 0;
  for (const [d, t] of strokes) {
    for (; clock < t; clock += 0.01) ev.push(...s.update(clock));
    ev.push(...s.stroke(d, t));
  }
  const end = clock + tail;
  for (; clock < end; clock += 0.01) ev.push(...s.update(clock));
  return ev;
}

test('free play: a rhythm of four beats loops from the beat after it, triplets included', () => {
  const s = new PracticeSession({ mode: 'free', beats: 4 });
  let ev = drum(s, [['L', 10], ['R', 10.5], ['L', 11], ['R', 11.5]], 0.5);
  const loop = ev.find((e) => e.type === 'loop').loop;
  assert.equal(loop.text, 'L R L R');
  assert.ok(Math.abs(loop.start - 12) < 0.02, 'starts on the beat after the fourth');
  assert.ok(Math.abs(loop.period - 2) < 0.02);
  assert.equal(loopPosition(loop, 12.6).played, 2);
  // Plain beats, then a triplet in the last beat.
  s.clear(19);
  ev = drum(s, [['L', 20], ['R', 20.6], ['L', 21.2], ['R', 21.8], ['R', 22.0], ['R', 22.2]], 1);
  assert.equal(ev.find((e) => e.type === 'loop').loop.text, 'L R L RRR');
});

test('free play: a closing pair is waited for; a new rhythm quiets the loop and replaces it', () => {
  const s = new PracticeSession({ mode: 'free', beats: 4 });
  // The last beat is a pair: the second stroke comes half a beat after the fourth beat.
  let ev = drum(s, [['L', 0], ['R', 0.5], ['L', 1], ['R', 1.5], ['R', 1.75]], 0.6);
  assert.equal(ev.find((e) => e.type === 'loop').loop.text, 'L R L RR');
  ev = drum(s, [['R', 5], ['R', 5.6]]);
  assert.equal(ev[0].type, 'phraseStart');
  assert.equal(s.loop.text, 'L R L RR', 'the old loop plays on until the new one is complete');
  ev = drum(s, [['L', 6.2], ['R', 6.8]], 0.6);
  assert.equal(ev.find((e) => e.type === 'loop').loop.text, 'R R L R');
});

test('free play: beats left silent at the end are rests; a lone stroke is let go; clear stops the loop', () => {
  const s = new PracticeSession({ mode: 'free', beats: 4 });
  const ev = drum(s, [['L', 0], ['R', 0.5]], 2);
  assert.equal(ev.find((e) => e.type === 'loop').loop.text, 'L R - -');
  const lone = drum(s, [['L', 10]], 3);
  assert.ok(lone.some((e) => e.type === 'abandon'));
  assert.equal(s.clear(20)[0].stopped, true);
  assert.equal(s.loop, null);
});

test('LB and RB: 2 to 12 beats, and the rhythm being drummed starts over', () => {
  const s = new PracticeSession({ mode: 'free', beats: 2 });
  assert.deepEqual(s.setBeats(1, 0), []);
  assert.equal(s.beats, BEATS.min);
  s.stroke('L', 1);
  assert.equal(s.setBeats(5, 1.2)[0].beats, 5);
  assert.equal(s.phrase.length, 0);
  s.setBeats(40, 2);
  assert.equal(s.beats, BEATS.max);
});

test('a partner’s call has the same number of beats, each of one to three strokes', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let n = BEATS.min; n <= BEATS.max; n++) {
    for (let k = 0; k < 20; k++) {
      const c = makeCall(n, rnd);
      const beats = c.text.split(' ');
      assert.equal(beats.length, n);
      for (const beat of beats) {
        assert.ok(beat.length >= 1 && beat.length <= 3, c.text);
        assert.ok(!beat.slice(1).includes('L'), c.text); // deep strokes only open a beat
      }
      assert.deepEqual(practicePattern(c.text).strokes, c.strokes);
    }
  }
});

test('call and answer: any answer of the right length, then the next call on the next beat', () => {
  const s = new PracticeSession({ mode: 'call', beats: 4 });
  const first = s.update(2).find((e) => e.type === 'call').call;
  assert.equal(first.beats, 4);
  // Answer with something else entirely, after the call, at 0.6 s a beat.
  const t0 = first.end + 1;
  const ev = drum(s, [['R', t0], ['R', t0 + 0.6], ['L', t0 + 0.9], ['R', t0 + 1.2], ['L', t0 + 1.8]], 0.6);
  const answered = ev.find((e) => e.type === 'answered').answer;
  assert.equal(answered.text, 'R RL R L');
  const next = ev.find((e) => e.type === 'call').call;
  assert.ok(Math.abs(next.start - (t0 + 2.4)) < 0.05, 'the partner comes back on the beat after the fourth');
  assert.ok(Math.abs(next.u - 0.6) < 0.02, 'at the player’s tempo');
  // Answering during a call cuts it short.
  const cut = s.stroke('L', next.start + 0.1);
  assert.ok(cut.some((e) => e.type === 'cutCall'));
});

test('call and answer: an unanswered call is played again', () => {
  const s = new PracticeSession({ mode: 'call', beats: 3 });
  const c = s.update(2).find((e) => e.type === 'call').call;
  const again = s.update(c.end + 30).find((e) => e.type === 'call');
  assert.equal(again.again, true);
  assert.equal(again.call.text, c.text);
});

test('every kit has a low and a high voice', () => {
  assert.equal(new Set(KITS.map((k) => k.id)).size, KITS.length);
  for (const k of KITS) assert.ok(k.L && k.R && k.L !== k.R && k.name && k.vn);
});

/** Drum a rhythm text at tempo u from t0 (each beat's strokes share it). */
const rhythmAt = (text, t0, u) => practicePattern(text).strokes.map((x) => [x.drum, t0 + x.pos * u]);

test('a riff keeps the length and the first beat, changes something, and keeps deep strokes at the start of beats', () => {
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const text of ['L R L R', 'L RR L RRR', 'R - R L', 'L L LR R RR L']) {
    for (let k = 0; k < 10; k++) {
      const r = riffOn(text, rnd);
      const a = text.split(' ');
      const b = r.text.split(' ');
      assert.equal(b.length, a.length);
      assert.equal(b[0], a[0]);
      assert.notEqual(r.text, text);
      for (const beat of b) assert.ok(!beat.slice(1).includes('L'), r.text);
    }
  }
});

test('call and answer: answered in time, the exchange plays back on the beat and it is your turn; you lead and the partner riffs', () => {
  const s = new CallSession({ beats: 4 });
  const call = s.update(2).find((e) => e.type === 'call').call;
  const u = call.u;
  // Answer right on the beat after the call, at its tempo.
  let ev = drum(s, rhythmAt('L RR L R', call.end, u), 0);
  ev.push(...drum(s, [], 0));
  let clock = call.end + 4 * u;
  const run = (until) => {
    const out = [];
    for (; clock < until; clock += 0.01) out.push(...s.update(clock));
    return out;
  };
  ev.push(...run(call.end + 4 * u + 0.2));
  const answered = ev.find((e) => e.type === 'answered');
  assert.ok(answered && answered.inTime, 'on time');
  const replay = ev.find((e) => e.type === 'replay').replay;
  assert.ok(Math.abs(replay.start - (call.end + 4 * u)) < 0.05, 'the playback follows on the next beat');
  assert.equal(replay.parts[0].strokes.length, call.strokes.length);
  assert.equal(replay.parts[1].strokes.length, 5);
  ev = run(replay.end + 0.05);
  assert.ok(ev.some((e) => e.type === 'yourTurn'));
  assert.equal(s.phase, 'lead');
  // Lead a call on the beat; the partner riffs on it from the next beat.
  ev = drum(s, rhythmAt('L R L RR', replay.end, u), 0);
  clock = replay.end + 4 * u;
  ev.push(...run(replay.end + 4 * u + 0.05));
  const riff = ev.find((e) => e.type === 'riff').riff;
  assert.equal(ev.find((e) => e.type === 'led').lead.text, 'L R L RR');
  assert.equal(riff.beats, 4);
  assert.notEqual(riff.text, 'L R L RR');
  assert.ok(Math.abs(riff.start - (replay.end + 4 * u)) < 0.05);
  // Wait instead of leading again: the partner takes over with a new call.
  ev = run(riff.end + 3 * u);
  assert.ok(ev.some((e) => e.type === 'takeover'));
  assert.ok(ev.some((e) => e.type === 'call'));
  assert.equal(s.phase, 'call');
});

test('call and answer: answered late, the exchange plays back and the partner calls again', () => {
  const s = new CallSession({ beats: 3 });
  const call = s.update(2).find((e) => e.type === 'call').call;
  const ev = drum(s, rhythmAt('R R L', call.end + 1.5, 0.6), 0);
  let clock = call.end + 1.5 + 3 * 0.6;
  for (const end = clock + 8; clock < end; clock += 0.01) ev.push(...s.update(clock));
  assert.equal(ev.find((e) => e.type === 'answered').inTime, false);
  assert.ok(ev.some((e) => e.type === 'replay'));
  assert.ok(!ev.some((e) => e.type === 'yourTurn'));
  assert.ok(ev.some((e) => e.type === 'takeover'));
  assert.equal(ev.filter((e) => e.type === 'call').length, 1);
});

test('a few extra hits after a rhythm, in enthusiasm, do not replace the loop', () => {
  const s = new PracticeSession({ mode: 'free', beats: 4 });
  drum(s, rhythmAt('L R L R', 0, 0.5), 0.5);
  const loop = s.loop;
  assert.equal(loop.text, 'L R L R');
  // Two more hits just after the rhythm, then nothing.
  const ev = drum(s, [['R', 2.05], ['L', 2.3]], 3);
  assert.ok(ev.some((e) => e.type === 'abandon'));
  assert.ok(!ev.some((e) => e.type === 'loop'));
  assert.equal(s.loop, loop, 'the loop plays on');
});

test('a stray hit well before the rhythm is left out', () => {
  const s = new PracticeSession({ mode: 'free', beats: 4 });
  const ev = drum(s, [['R', 0], ...rhythmAt('L R L RR', 2.5, 0.5)], 0.8);
  assert.equal(ev.find((e) => e.type === 'loop').loop.text, 'L R L RR');
});

test('an answer is read at about its call’s speed', () => {
  const s = new CallSession({ beats: 4 });
  const call = s.update(2).find((e) => e.type === 'call').call;
  // Even strokes a beat apart at the call's tempo: plain beats, not eighths of a slower beat.
  const ev = drum(s, rhythmAt('L R L R', call.end, call.u), 1);
  const a = ev.find((e) => e.type === 'answered').answer;
  assert.equal(a.text, 'L R L R');
  assert.ok(Math.abs(a.u - call.u) / call.u < 0.05);
});
