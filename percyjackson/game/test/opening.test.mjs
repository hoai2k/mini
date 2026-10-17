// The opening of a new game (story/opening.js) and where roaming monsters
// may appear (world/roamZones.js).
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPENING_STEPS, STEP_INFO, openingStep, openingDone, nextStep, stepAfterChapter, advanceOpening } from '../js/story/opening.js';
import { CAMP_CORE, CAMP_ROAM, ROAM_RULES, inAny, inRect, roamAreaAt, spawnAllowed, packFor, pickKind } from '../js/world/roamZones.js';
import { freshData, normalizeData } from '../js/save.js';

const JS = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'js');
const read = (p) => readFileSync(join(JS, p), 'utf8');

test('a new save starts the opening with the prologue', () => {
  const d = freshData('Percy');
  assert.equal(openingStep(d), 'prologue');
  assert.equal(openingDone(d), false);
});

test('the opening runs in story order and ends in camp', () => {
  assert.deepEqual(OPENING_STEPS, ['prologue', 'cut-bus', 'lt1', 'cut-summer', 'lt2', 'cut-wake', 'done']);
  const seen = [];
  let s = 'prologue';
  while (s !== 'done') { seen.push(s); s = nextStep(s); }
  assert.deepEqual(seen, OPENING_STEPS.slice(0, -1));
  assert.equal(stepAfterChapter('lt1'), 'cut-summer');
  assert.equal(stepAfterChapter('lt2'), 'cut-wake');
  assert.equal(stepAfterChapter('lt3'), null);
  for (const st of OPENING_STEPS) assert.ok(STEP_INFO[st], `${st} has its info`);
});

test('steps only move forward', () => {
  const d = freshData('Percy');
  assert.equal(advanceOpening(d, 'cut-bus'), true);
  assert.equal(openingStep(d), 'cut-bus');
  assert.equal(advanceOpening(d, 'prologue'), false, 'never back');
  assert.equal(openingStep(d), 'cut-bus');
  advanceOpening(d, 'lt1');
  d.completed.lt1 = 1;   // finishing chapter 1 moves it on even before the step is written
  assert.equal(openingStep(d), 'cut-summer');
  advanceOpening(d, 'done');
  assert.equal(openingDone(d), true);
});

test('saves from before the opening: finished chapters 1 and 2 start in camp', () => {
  const old = normalizeData({ name: 'Old', completed: { lt1: 1, lt2: 2, lt3: 1 } });
  assert.equal(old.opening, undefined);
  assert.equal(openingStep(old), 'done');
  const half = normalizeData({ name: 'Half', completed: { lt1: 1 } });
  assert.equal(openingStep(half), 'cut-summer', 'carries on after the museum');
  const none = normalizeData({ name: 'New', completed: {} });
  assert.equal(openingStep(none), 'prologue');
  // a save that finished chapter 2 mid-opening still sees waking at the Big House
  const mid = normalizeData({ name: 'Mid', opening: 'lt2', completed: { lt1: 1, lt2: 1 } });
  assert.equal(openingStep(mid), 'cut-wake');
  // skipping the opening (Settings) is kept
  const skipped = normalizeData({ name: 'Skip', opening: 'done', completed: {} });
  assert.equal(openingStep(skipped), 'done');
  // a step that isn't one is ignored
  assert.equal(openingStep(normalizeData({ opening: 'bogus', completed: {} })), 'prologue');
});

test('the opening step survives a profile round trip (normalizeData keeps it)', () => {
  const d = freshData('P'); advanceOpening(d, 'lt1');
  const back = normalizeData(JSON.parse(JSON.stringify(d)));
  assert.equal(openingStep(back), 'lt1');
});

test('the resume point knows the opening, and Continue runs it', () => {
  const r = read('resume.js');
  assert.match(r, /kind: 'opening'/);
  assert.match(r, /r\.kind === 'opening'/);
  assert.match(r, /g\.opening\.run\(r\.step/);
  assert.match(read('ui/partySelect.js'), /start: online \? 'hub' : 'auto'/, 'the hero select starts the opening on a save that has not finished it');
});

test('online: the prologue and cutscenes are scenes the host shares', () => {
  const o = read('net/online.js');
  assert.match(o, /mode: 'prologue'/);
  assert.match(o, /mode: 'cut', id:/);
  assert.match(o, /sc\.mode === 'prologue'/);
  assert.match(o, /sc\.mode === 'cut'/);
  assert.match(o, /d\.k === 'bus'/);
  assert.match(o, /d\.k === 'skip'/);
});

test('roaming monsters never spawn in the camp core', () => {
  const hero = [[60, 100]];   // by the cabins
  for (let x = 0; x < 116; x += 2) for (let z = 0; z < 184; z += 2) {
    if (inAny(CAMP_CORE, x, z)) {
      assert.equal(roamAreaAt(x, z), null, `${x},${z} is core`);
      assert.equal(spawnAllowed(x, z, [[x + 20, z]]), false, `no spawn at ${x},${z} (core)`);
    }
  }
  // the cabins, the Big House porch, the forge and the campfire are core
  for (const [x, z] of [[54, 93], [40, 110], [70, 120], [51, 88], [76, 79], [87, 102], [78, 159]]) assert.ok(inAny(CAMP_CORE, x, z), `${x},${z} is in the core`);
  void hero;
});

test('roaming spawns are out in the woods or on the road, at a distance', () => {
  // the east woods and the Road West are roam areas
  assert.ok(roamAreaAt(100, 120), 'east woods');
  assert.ok(roamAreaAt(60, 50), 'the farm road');
  assert.ok(roamAreaAt(100, 30), 'the highway');
  // never right on top of a hero, never too far either
  assert.equal(spawnAllowed(100, 120, [[100, 125]]), false, 'too close');
  assert.equal(spawnAllowed(100, 120, [[100, 120 + ROAM_RULES.minDist + 2]]), true, 'a fair distance');
  assert.equal(spawnAllowed(100, 120, [[100, 120 + ROAM_RULES.maxDist + 5]]), false, 'too far: nobody would meet it');
  // the protected areas never overlap a roam area
  for (const a of CAMP_ROAM) for (let x = a.area.x0; x <= a.area.x1; x++) for (let z = a.area.z0; z <= a.area.z1; z++) if (inAny(CAMP_CORE, x, z)) assert.equal(roamAreaAt(x, z), null);
});

test('roaming packs are small and follow the save lightly', () => {
  for (let i = 0; i < 50; i++) {
    const r = i / 50;
    for (const kind of ['pup', 'spider', 'stymphalian', 'scorpion', 'rat']) {
      const p = packFor(0, kind, r);
      assert.ok(p.count >= 1 && p.count <= 4, `${kind} pack ${p.count}`);
      assert.equal(p.level, 1);
      if (kind === 'scorpion') assert.equal(p.count, 1);
    }
  }
  assert.equal(packFor(12, 'pup', 0.5).level, 4);
  assert.equal(pickKind([['a', 1], ['b', 0]], 0.99), 'a');
  for (const a of CAMP_ROAM) for (const [k] of a.kinds) assert.match(read('entities/monsters.js'), new RegExp(`\\n  ${k}: \\{ name:`), `${k} is a monster`);
  assert.ok(inRect(CAMP_ROAM[0].area, CAMP_ROAM[0].area.x0, CAMP_ROAM[0].area.z0));
});

test('rats exist: the prologue monster', () => {
  const m = read('entities/monsters.js');
  assert.match(m, /\n  rat: \{ name: txt\('monsters\.rat\.name'\), tier: 'minor'/);
  assert.match(m, /\n  rat: \(\) => \{/);
});

test('the cutscenes the opening plays exist', () => {
  const c = read('story/cutscenes.js');
  for (const st of OPENING_STEPS) { const id = STEP_INFO[st].cutscene; if (id) assert.match(c, new RegExp(`\\n  ${id}: \\{\\n    id: '${id}'`), `cutscene ${id}`); }
});
