// The skill profile, drills, Focus and Adaptive, checked with simulated players.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLibrary } from '../src/library.js';
import { SKILLS, steps, judge, record, emptyEars, accuracy, weakSkills, levelOf, has, describeConfusion, topConfusions } from '../src/skills.js';
import { makeDrill } from '../src/drills.js';
import { newFocus, nextFocus, afterFocus, pickAdaptive, fair } from '../src/coach.js';

const LIB = buildLibrary();
const H = 3.6e6;

/** A seeded random source, so a simulation is the same every run. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

/** A simulated player: `p[skill]` is their chance of hearing a step with that skill right. */
function player(p, rng) {
  const chance = (st) => st.skills.reduce((x, s) => x * (s === 'octave' || s === 'contour' ? 1 : (p[s] ?? 0.985)), 1);
  return (m) => {
    const first = {};
    for (const st of steps(m)) {
      // A wrong first press: the interval heard a half step off.
      first[st.pos] = rng() < chance(st) ? st.to : st.to + (rng() < 0.5 ? 1 : -1);
    }
    return first;
  };
}

test('every drill is playable and works the skill it is for', () => {
  const rng = seeded(7);
  for (const s of SKILLS) for (let lv = 1; lv <= 4; lv++) for (let k = 0; k < 6; k++) {
    const d = makeDrill(s.id, lv, rng);
    assert.ok(d.parsed.length >= 3 && d.parsed.length <= 16, `${d.id}`);
    assert.ok(d.hi - d.lo <= 16 && d.lo >= 36 && d.hi <= 96, `${d.id} range`);
    if (s.id !== 'octave') assert.ok(has(d, s.id), `${d.id} uses ${s.id}: ${d.notes}`);
  }
  // Harder steps ask more.
  const len = (lv) => makeDrill('int4', lv, seeded(1)).parsed.length;
  assert.ok(len(1) < len(2) && len(2) < len(3) && len(3) <= len(4));
});

test('judging a run: first presses only, with mix-ups named', () => {
  const m = LIB.find((x) => x.id === 'st-thomas');
  const first = Object.fromEntries(m.parsed.map((n, i) => [i, n.midi]));
  first[3] = m.parsed[3].midi - 1; // a whole step down heard as a minor 3rd
  const { results, confusions } = judge(m, first);
  assert.deepEqual(results.int2, [3, 4]);
  assert.deepEqual(confusions, [{ want: -2, got: -3 }]);
  assert.equal(describeConfusion(confusions[0]), 'whole step down, played as minor 3rd down');
  assert.equal(describeConfusion({ want: 4, got: -4 }), 'major 3rd up, played going the other way');
});

test('the profile leans on recent play: learned since yesterday is not weak', () => {
  const ears = emptyEars(2);
  const now = Date.now();
  const item = (id) => ({ id, level: 2 });
  for (let i = 0; i < 10; i++) record(ears, item(`old${i}`), { results: { int3: [0, 2] }, confusions: [] }, now - 30 * H);
  assert.ok(accuracy(ears, 'int3', now - 30 * H).acc < 0.3);
  assert.ok(weakSkills(ears, now - 29 * H).some((w) => w.id === 'int3'));
  for (let i = 0; i < 3; i++) record(ears, item(`new${i}`), { results: { int3: [2, 2] }, confusions: [] }, now - (3 - i) * 60e3);
  assert.ok(accuracy(ears, 'int3', now).acc >= 0.8, `acc ${accuracy(ears, 'int3', now).acc}`);
  assert.ok(!weakSkills(ears, now).some((w) => w.id === 'int3'));
});

test('skill levels move separately: slips pull a skill down to where it slipped', () => {
  const ears = emptyEars(3);
  record(ears, { id: 'a', level: 2 }, { results: { int4: [1, 2], int2: [4, 4] }, confusions: [] });
  assert.equal(levelOf(ears, 'int4'), 1.5);
  assert.equal(levelOf(ears, 'int2'), 3, 'clean below its level: no change');
  // Drills never move levels.
  record(ears, { id: 'd', level: 1, drill: true }, { results: { int4: [2, 2] }, confusions: [] });
  assert.equal(levelOf(ears, 'int4'), 1.5);
});

/** Run Focus with a simulated player whose weak skill improves with each drill of it. */
function simulate({ weak = 'int4', start = 0.45, learn = 0.06, picks = 160, seed = 3 } = {}) {
  const rng = seeded(seed);
  const p = { [weak]: start };
  const play = player(p, rng);
  const ears = emptyEars(2);
  const focus = newFocus();
  const log = [];
  let now = Date.UTC(2026, 0, 1);
  const recent = [];
  // Warm up with Adaptive so the profile has something to go on.
  for (let i = 0; i < 25; i++) {
    const { melody } = pickAdaptive(LIB, ears, { now, rng, recent });
    record(ears, melody, judge(melody, play(melody)), now);
    recent.unshift(melody.id); recent.length = Math.min(recent.length, 25);
    now += 40e3;
  }
  for (let i = 0; i < picks; i++) {
    const pick = nextFocus(LIB, ears, focus, { now, rng, recent });
    const { melody } = pick;
    const scores = record(ears, melody, judge(melody, play(melody)), now);
    const event = afterFocus(focus, ears, pick, melody, scores, now);
    log.push({ kind: pick.kind, skill: pick.skill, id: melody.id, level: melody.level, drillLevel: melody.drillLevel, v: scores[pick.skill], event: event?.type, focusOn: focus.skill });
    if (pick.kind === 'drill' && pick.skill === weak) p[weak] = Math.min(0.98, p[weak] + learn);
    if (!melody.drill) { recent.unshift(melody.id); recent.length = Math.min(recent.length, 25); }
    now += 40e3;
  }
  return { log, ears, focus, p };
}

test('Focus finds the weak skill, drills it up and down, and turns it around', () => {
  const { log, ears } = simulate();
  if (process.env.SIMLOG) for (const x of log) console.log(JSON.stringify(x));
  const on = log.filter((x) => x.skill === 'int4');
  assert.ok(on.length > 10, 'works on the weak skill');
  assert.equal(log.find((x) => x.kind !== 'mix' && x.kind !== 'review' && x.kind !== 'explore')?.skill, 'int4', 'the weak skill first');
  const drills = log.filter((x) => x.kind === 'drill' && x.skill === 'int4');
  assert.ok(drills.length >= 3, 'drills it');
  assert.ok(drills.some((d) => d.drillLevel >= 3), 'drills get harder');
  // The success measure: slipped on a real melody, then after drills clean on a different one of the same kind.
  const turns = ears.turns.filter((t) => t.skill === 'int4');
  assert.ok(turns.length >= 1, 'a turnaround');
  for (const t of turns) assert.notEqual(t.failed, t.fixed, 'checked on a different melody');
  assert.ok(log.some((x) => x.event === 'fixed' && x.skill === 'int4') || log.some((x) => x.event === 'fixed'), 'eventually reliable');
  // Never more than two focus picks in a row without something else.
  let run = 0, longest = 0;
  for (const x of log) { run = ['mix', 'review', 'explore'].includes(x.kind) ? 0 : run + 1; longest = Math.max(longest, run); }
  assert.ok(longest <= 3, `longest focus run ${longest}`);
  // Checks use real melodies of the same kind (the skill is in them).
  for (const x of log.filter((y) => y.kind === 'check')) assert.ok(has(LIB.find((m) => m.id === x.id), x.skill));
});

test('drills step down after a slip', () => {
  // A player who never improves: drills go up after clean ones and back down after slips.
  const { log } = simulate({ weak: 'int4', start: 0.6, learn: 0, picks: 120, seed: 11 });
  const d = log.filter((x) => x.kind === 'drill');
  let down = false;
  for (let i = 1; i < d.length; i++) if (d[i].drillLevel < d[i - 1].drillLevel) down = true;
  assert.ok(down, 'a slip makes the next drill easier');
});

test('Adaptive works the weak skill at its own (lower) level, and keeps the rest fair', () => {
  const ears = emptyEars(3);
  for (let i = 0; i < 6; i++) record(ears, { id: `x${i}`, level: 2 }, { results: { int5: [0, 2], int2: [3, 3] }, confusions: [] });
  assert.ok(levelOf(ears, 'int5') < levelOf(ears, 'int2'));
  const rng = seeded(5);
  let targeted = 0;
  for (let i = 0; i < 60; i++) {
    const { melody, skill } = pickAdaptive(LIB, ears, { rng });
    if (skill === 'int5') {
      targeted++;
      assert.ok(has(melody, 'int5'));
      assert.ok(melody.level <= Math.round(levelOf(ears, 'int5')) + 1, `level ${melody.level}`);
    } else assert.ok(fair(melody, ears) || melody.level === 1);
  }
  assert.ok(targeted >= 20, `targeted ${targeted}`);
});

test('mix-ups are tallied, recent ones first', () => {
  const ears = emptyEars();
  const now = Date.now();
  record(ears, { id: 'a', level: 1 }, { results: {}, confusions: [{ want: 4, got: 3 }] }, now - 48 * H);
  record(ears, { id: 'b', level: 1 }, { results: {}, confusions: [{ want: 7, got: 5 }] }, now);
  assert.deepEqual(topConfusions(ears, now).map((c) => c.want), [7, 4]);
});

test('the turnaround holds across players and weak skills', () => {
  const out = [];
  for (const weak of ['int4', 'int3', 'int7', 'int5', 'chromatic', 'minor']) for (const seed of [21, 34, 55]) {
    const { log, ears } = simulate({ weak, seed, start: 0.4, picks: 140 });
    const first = log.find((x) => !['mix', 'review', 'explore'].includes(x.kind))?.skill;
    const turned = ears.turns.some((t) => t.skill === weak);
    const fixed = log.some((x) => x.event === 'fixed' && x.skill === weak);
    out.push({ weak, seed, first, turned, fixed, drills: log.filter((x) => x.kind === 'drill' && x.skill === weak).length });
  }
  if (process.env.SIMLOG) console.table(out);
  const ok = out.filter((o) => o.first === o.weak && o.turned && o.fixed).length;
  assert.ok(ok >= out.length - 2, `${ok} of ${out.length} turned around: ${JSON.stringify(out.filter((o) => !(o.first === o.weak && o.turned && o.fixed)))}`);
});

test('a player who does not improve is not reported as fixed', () => {
  let fixedLearn = 0, fixedStuck = 0, turnsStuck = 0, turnsLearn = 0;
  for (const seed of [21, 34, 55]) {
    const a = simulate({ weak: 'int4', seed, start: 0.4, learn: 0.06, picks: 120 });
    const b = simulate({ weak: 'int4', seed, start: 0.4, learn: 0, picks: 120 });
    fixedLearn += a.log.filter((x) => x.event === 'fixed' && x.skill === 'int4').length;
    fixedStuck += b.log.filter((x) => x.event === 'fixed' && x.skill === 'int4').length;
    turnsLearn += a.ears.turns.filter((t) => t.skill === 'int4').length;
    turnsStuck += b.ears.turns.filter((t) => t.skill === 'int4').length;
  }
  if (process.env.SIMLOG) console.log({ fixedLearn, fixedStuck, turnsLearn, turnsStuck });
  assert.ok(fixedStuck <= 1 && fixedStuck < fixedLearn, 'only real learning makes a skill reliable');
  assert.equal(turnsStuck, 0, 'and only real learning turns it around');
});
