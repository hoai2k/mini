import test from 'node:test';
import assert from 'node:assert/strict';
import { DrumReader, COMMANDS, SPIRIT_COMBO, WINDOWS, TEMPO, TIER_POWER, parsePattern, allPatterns, fit, accuracyOf, precisionFactor } from '../src/rhythm.js';

/** Play a pattern's strokes from t0 at u seconds per beat; jitter(i) nudges stroke i. */
function play(reader, text, t0, u, jitter = () => 0) {
  const events = [];
  parsePattern(text).forEach((s, i) => events.push(...reader.hit(s.drum, t0 + s.pos * u + jitter(i))));
  return events;
}
const command = (events) => events.find((e) => e.type === 'command');
const tier = (id, n) => COMMANDS.find((c) => c.id === id).tiers[n - 1];

test('patterns parse into beats, pairs and triplets', () => {
  assert.deepEqual(parsePattern('L LL R').map((s) => s.pos), [0, 1, 1.5, 2]);
  const trip = parsePattern('LLL R').map((s) => s.pos);
  assert.ok(Math.abs(trip[1] - 1 / 3) < 1e-9 && Math.abs(trip[2] - 2 / 3) < 1e-9);
});

test('the pattern set is well formed: four beats, unique, tiers grow', () => {
  const all = allPatterns();
  assert.equal(new Set(all.map((p) => p.text)).size, all.length);
  for (const c of COMMANDS) {
    assert.equal(c.tiers.length, 3, c.id);
    c.tiers.forEach((t) => assert.equal(t.split(' ').length, 4, `${c.id}: ${t}`));
    assert.ok(parsePattern(c.tiers[1]).length > parsePattern(c.tiers[0]).length, c.id);
    assert.ok(c.tiers[2].split(' ').some((b) => b.length === 3), `${c.id} tier III has a triplet`);
  }
  // No pattern is another's opening at the same rhythm, or it could never be played.
  for (const a of all) {
    for (const b of all) {
      if (a === b || b.strokes.length <= a.strokes.length) continue;
      const prefix = b.strokes.slice(0, a.strokes.length);
      const sameDrums = prefix.every((s, i) => s.drum === a.strokes[i].drum);
      const scale = prefix[prefix.length - 1].pos / a.strokes[a.strokes.length - 1].pos;
      const sameRhythm = prefix.every((s, i) => Math.abs(s.pos - a.strokes[i].pos * scale) < 1e-9);
      assert.ok(!(sameDrums && sameRhythm && Math.abs(scale - 1) > 1e-9), `${a.text} hides inside ${b.text}`);
    }
  }
});

for (const u of [0.32, 0.6, 1.2]) {
  test(`an even phrase is accepted at ${Math.round(60 / u)} BPM`, () => {
    const r = new DrumReader();
    const cmd = command(play(r, tier('march', 1), 1, u));
    assert.equal(cmd.command, 'march');
    assert.equal(cmd.tier, 1);
    assert.ok(Math.abs(cmd.u - u) < 1e-9);
    assert.equal(cmd.accuracy, 1);
    assert.ok(cmd.even);
    assert.ok(Math.abs(cmd.start - (1 + 4 * u)) < 1e-9, 'the answer starts on the fifth beat');
  });
}

test('evenness, not a grid: small wobbles pass, big ones break the phrase', () => {
  const r = new DrumReader();
  const wobble = [0, 0.06, -0.05, 0.04];
  const cmd = command(play(r, tier('strike', 1), 0, 0.6, (i) => wobble[i]));
  assert.equal(cmd.command, 'strike');
  assert.ok(cmd.accuracy > 0 && cmd.accuracy <= 1);
  const r2 = new DrumReader();
  const events = play(r2, tier('strike', 1), 0, 0.6, (i) => (i === 2 ? 0.3 : 0));
  assert.ok(!command(events));
  assert.ok(events.some((e) => e.type === 'reset' && e.reason === 'uneven'));
});

test('pairs and triplets are recognised and are stronger tiers', () => {
  for (const [id, n] of [['march', 2], ['strike', 3], ['rally', 2], ['rally', 3], ['charge', 3]]) {
    const r = new DrumReader();
    const cmd = command(play(r, tier(id, n), 0, 0.7));
    assert.ok(cmd, `${id} ${n}`);
    assert.equal(cmd.command, id);
    assert.equal(cmd.tier, n);
  }
});

test('a pair played as two full beats is not the pair pattern', () => {
  const r = new DrumReader();
  // "L L LL R" with the pair stretched to a full beat: L L L L R evenly.
  const events = ['L', 'L', 'L', 'L', 'R'].flatMap((d, i) => r.hit(d, i * 0.6));
  assert.ok(!events.some((e) => e.type === 'command' && e.tier === 2));
});

test('maxTier hides the harder tiers', () => {
  const r = new DrumReader({ maxTier: 1 });
  assert.ok(!command(play(r, tier('march', 2), 0, 0.6)));
});

test('a phrase fades when it can no longer be finished', () => {
  // March only: with every command, three even strokes could also be the
  // opening of the charge's pair pattern at half the speed.
  const r = new DrumReader({ unlocked: ['march'], maxTier: 1 });
  r.hit('L', 0);
  r.hit('L', 0.6);
  r.hit('L', 1.2);
  assert.equal(r.update(1.8).length, 0, 'still in time for the fourth stroke');
  const late = r.update(1.2 + 0.6 * 2 ** WINDOWS.good + 0.01);
  assert.ok(late.some((e) => e.type === 'reset' && e.reason === 'timeout'));
  assert.equal(r.phrase.length, 0);
});

test('a single stroke waits as long as the slowest tempo allows', () => {
  const r = new DrumReader();
  r.hit('L', 0);
  assert.equal(r.update(TEMPO.max).length, 0);
  assert.ok(r.update(TEMPO.max * 2 ** WINDOWS.good + 0.01).some((e) => e.type === 'reset'));
});

test('a complete match waits briefly when a longer pattern could still follow', () => {
  // A custom set where "L L L R" is the opening of "L L L RR" at the same rhythm.
  const r = new DrumReader();
  r.patterns = [
    { command: 'march', tier: 1, text: 'L L L R', strokes: parsePattern('L L L R') },
    { command: 'strike', tier: 2, text: 'L L L RR', strokes: parsePattern('L L L RR') },
  ];
  const events = play(r, 'L L L R', 0, 0.6);
  assert.ok(!command(events), 'not yet: the pair may follow');
  const later = r.update(1.8 + 0.3 * 2 ** WINDOWS.good + 0.01);
  assert.equal(command(later).command, 'march');
  const r2 = new DrumReader();
  r2.patterns = r.patterns;
  assert.equal(command(play(r2, 'L L L RR', 0, 0.6)).command, 'strike');
});

test('during the answer strokes are ignored, except Nhị’s flourishes between beats', () => {
  const r = new DrumReader();
  const cmd = command(play(r, tier('march', 1), 0, 0.5));
  assert.ok(r.busy(cmd.start + 0.1));
  const f = r.hit('R', cmd.start + 0.5 * 0.5);
  assert.equal(f[0].type, 'flourish');
  const e = r.hit('L', cmd.start + 1 * 0.5);
  assert.equal(e[0].type, 'early');
  assert.equal(r.phrase.length, 0);
  assert.ok(r.shown, 'the accepted pattern stays shown during the answer');
  const ready = r.update(cmd.ready);
  assert.ok(ready.some((x) => x.type === 'ready'));
  assert.equal(r.shown, null, 'and clears when the drum is ready');
});

test('starting within two beats of ready chains; four chained wakes the drum', () => {
  const r = new DrumReader();
  let t = 0;
  let cmd;
  for (let i = 0; i < SPIRIT_COMBO; i++) {
    cmd = command(play(r, tier('march', 1), t, 0.5));
    r.update(cmd.ready);
    t = cmd.ready + 0.4;
  }
  assert.equal(cmd.combo, SPIRIT_COMBO);
  assert.ok(cmd.spirit);
});

test('waiting too long after ready drops the chain', () => {
  const r = new DrumReader();
  const cmd = command(play(r, tier('march', 1), 0, 0.5));
  r.update(cmd.ready);
  assert.equal(r.combo, 1);
  const lost = r.update(cmd.ready + 2 * 0.5 + 0.01);
  assert.ok(lost.some((e) => e.type === 'comboLost'));
  const next = command(play(r, tier('march', 1), cmd.ready + 3, 0.5));
  assert.equal(next.combo, 1);
});

test('a stroke that fits no opening is dropped without starting a phrase', () => {
  const r = new DrumReader({ unlocked: ['march'] });
  const ev = r.hit('R', 0);
  assert.ok(ev.some((e) => e.type === 'reset' && e.reason === 'no-pattern'));
  assert.equal(r.phrase.length, 0);
});

test('fit rejects tempos outside the playable range', () => {
  const p = allPatterns(['march'], 1)[0];
  assert.equal(fit(p, [{ drum: 'L', t: 0 }, { drum: 'L', t: 3 }]), null);
  assert.ok(fit(p, [{ drum: 'L', t: 0 }, { drum: 'L', t: 0.6 }]));
  assert.equal(accuracyOf(0), 1);
  assert.equal(accuracyOf(WINDOWS.good), 0);
});

test('a sloppy higher tier still beats a perfect lower tier; evenness covers the gap', () => {
  for (let i = 1; i < TIER_POWER.length; i++) {
    const sloppyHigher = precisionFactor(0) * TIER_POWER[i];
    const perfectLower = precisionFactor(1) * TIER_POWER[i - 1];
    assert.ok(sloppyHigher > perfectLower, `tier ${i + 1} sloppy ${sloppyHigher} vs tier ${i} perfect ${perfectLower}`);
    assert.ok(sloppyHigher - perfectLower < 0.05 * perfectLower, 'and only just: precision spans nearly the whole gap');
  }
  assert.equal(precisionFactor(1), 1);
  assert.ok(precisionFactor(0.5) > precisionFactor(0) && precisionFactor(0.5) < 1);
});

test('the reset button drops the phrase being played, and only that', () => {
  const r = new DrumReader();
  r.hit('L', 0);
  r.hit('L', 0.6);
  const ev = r.reset();
  assert.equal(ev[0].reason, 'manual');
  assert.equal(r.phrase.length, 0);
  assert.deepEqual(r.reset(), [], 'nothing to reset');
  const cmd = command(play(r, tier('march', 1), 2, 0.6));
  assert.equal(cmd.command, 'march', 'a fresh phrase plays normally after a reset');
});
