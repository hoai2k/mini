import test from 'node:test';
import assert from 'node:assert/strict';
import { DrumReader, judge, judgeHalf, COMMANDS, SPIRIT_COMBO } from '../src/rhythm.js';

const B = 0.6; // beat length in seconds

function play(reader, pattern, startBeat, offset = 0) {
  const events = [];
  [...pattern].forEach((drum, i) => events.push(...reader.hit(drum, (startBeat + i) * B + offset)));
  return events;
}

test('judge snaps to the nearest beat and grades the error', () => {
  assert.equal(judge(3 * B + 0.03, B).grade, 'perfect');
  assert.equal(judge(3 * B - 0.1, B).grade, 'good');
  assert.equal(judge(3 * B + 0.2, B).grade, 'miss');
  assert.equal(judge(3 * B + 0.2, B).beat, 3);
  assert.ok(judgeHalf(2.5 * B, B).offbeat);
  assert.ok(!judgeHalf(2 * B, B).offbeat);
});

test('every command pattern is four hits and unique', () => {
  const patterns = COMMANDS.map((c) => c.pattern);
  assert.equal(new Set(patterns).size, patterns.length);
  for (const p of patterns) assert.match(p, /^[LR]{4}$/);
});

test('four hits on consecutive beats issue a command', () => {
  const r = new DrumReader({ beatDur: B });
  const events = play(r, 'LLLR', 2);
  const cmd = events.find((e) => e.type === 'command');
  assert.equal(cmd.command, 'march');
  assert.equal(cmd.startBeat, 2);
  assert.equal(cmd.responseStart, 6);
  assert.equal(cmd.accuracy, 1);
  assert.equal(cmd.combo, 1);
});

test('good hits lower accuracy', () => {
  const r = new DrumReader({ beatDur: B });
  const cmd = play(r, 'RRLR', 0, 0.1).find((e) => e.type === 'command');
  assert.equal(cmd.command, 'strike');
  assert.ok(Math.abs(cmd.accuracy - 0.6) < 1e-9);
});

test('locked commands are not recognised', () => {
  const r = new DrumReader({ beatDur: B, unlocked: ['march'] });
  assert.ok(!play(r, 'RRLR', 0).some((e) => e.type === 'command'));
});

test('a wrong first hit is forgiven by the sliding window', () => {
  const r = new DrumReader({ beatDur: B });
  const cmd = play(r, 'RLLLR', 0).find((e) => e.type === 'command');
  // RLLL is rally; with every command unlocked it fires first.
  assert.equal(cmd.command, 'rally');
  const r2 = new DrumReader({ beatDur: B, unlocked: ['march'] });
  const cmd2 = play(r2, 'RLLLR', 0).find((e) => e.type === 'command');
  assert.equal(cmd2.command, 'march');
  assert.equal(cmd2.startBeat, 1);
});

test('a gap restarts the phrase', () => {
  const r = new DrumReader({ beatDur: B });
  r.hit('L', 0);
  r.hit('L', B);
  const events = [...r.hit('L', 3 * B), ...r.hit('R', 4 * B)];
  assert.ok(!events.some((e) => e.type === 'command'));
});

test('a miss clears the phrase', () => {
  const r = new DrumReader({ beatDur: B });
  r.hit('L', 0);
  r.hit('L', B);
  const miss = r.hit('L', 2 * B + 0.25);
  assert.equal(miss[0].grade, 'miss');
  assert.equal(r.phrase.length, 0);
});

test('chaining on the first beat after the response builds the combo and wakes the drum', () => {
  const r = new DrumReader({ beatDur: B });
  let beat = 0;
  let last;
  for (let i = 0; i < SPIRIT_COMBO; i++) {
    last = play(r, 'LLLR', beat).find((e) => e.type === 'command');
    r.update((beat + 8) * B - 0.2);
    beat += 8;
  }
  assert.equal(last.combo, SPIRIT_COMBO);
  assert.ok(last.spirit);
});

test('waiting past the chain beat drops the combo', () => {
  const r = new DrumReader({ beatDur: B });
  play(r, 'LLLR', 0);
  assert.equal(r.combo, 1);
  const events = r.update(8 * B + 0.2);
  assert.ok(events.some((e) => e.type === 'comboLost'));
  assert.equal(r.combo, 0);
});

test('Nhị flourishes on off-beats during the response; other hits stumble', () => {
  const r = new DrumReader({ beatDur: B });
  play(r, 'LLLR', 0);
  const f = r.hit('R', 4.5 * B);
  assert.equal(f[0].type, 'flourish');
  const s = r.hit('L', 5 * B);
  assert.equal(s[0].type, 'stumble');
  assert.ok(s.some((e) => e.type === 'comboLost'));
});

test('an early first hit of the next command is not taken as a stumble', () => {
  const r = new DrumReader({ beatDur: B });
  play(r, 'LLLR', 0);
  const events = r.hit('L', 8 * B - 0.1);
  assert.equal(events[0].type, 'hit');
  assert.equal(events[0].beat, 8);
});
