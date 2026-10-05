import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBattle, issueOrder, stepArmy, stepEnemies, addFlourish, commandPower, blocker,
  guard, shieldsUp, aboutToAttack, GUARD, tempoFactor,
} from '../src/battle.js';
import { STAGES } from '../src/stages.js';
import { COMMANDS, TIER_POWER } from '../src/rhythm.js';

const stage = (id) => STAGES.find((s) => s.id === id);

/** One four-beat order at u seconds per beat, starting at the battle's clock. */
function order(state, command, power = 1, u = 0.6) {
  issueOrder(state, command, power, u);
  const t0 = state.time;
  const events = [];
  for (let k = 0; k < 4; k++) events.push(...stepArmy(state, t0 + k * u));
  return events;
}

test('stages only unlock known commands, have a goal and a tier cap', () => {
  const ids = new Set(COMMANDS.map((c) => c.id));
  for (const s of STAGES) {
    for (const c of s.unlocked) assert.ok(ids.has(c), `${s.id}: ${c}`);
    assert.ok(s.maxTier >= 1 && s.maxTier <= 3, s.id);
    assert.ok(createBattle(s).enemies.some((e) => e.goal), s.id);
    if (s.unlocked.includes('charge')) assert.ok(s.elephant, s.id);
  }
});

test('march advances but never through the nearest enemy', () => {
  const b = createBattle(stage('garden'));
  order(b, 'march', 0.5);
  assert.equal(b.army.x, 4);
  order(b, 'march');
  assert.equal(b.army.x, 9 - 1.5);
});

test('stronger tiers and the waking drum raise power', () => {
  assert.ok(commandPower(1, false, TIER_POWER[2]) > commandPower(1, false, TIER_POWER[1]));
  assert.ok(commandPower(1, false, TIER_POWER[1]) > commandPower(1, false, TIER_POWER[0]));
  assert.ok(commandPower(1, true) > commandPower(1, false));
  const weak = createBattle(stage('garden'));
  const strong = createBattle(stage('garden'));
  weak.army.x = strong.army.x = 7;
  weak.enemies[0].hp = strong.enemies[0].hp = 1000;
  order(weak, 'strike', commandPower(1, false, TIER_POWER[0]));
  order(strong, 'strike', commandPower(1, false, TIER_POWER[2]));
  assert.ok(strong.enemies[0].hp < weak.enemies[0].hp);
});

test('the Han wind up for a beat before their first blow, and show it', () => {
  const b = createBattle(stage('outpost'));
  b.army.x = 18; // the first crossbow (x 20) is in range
  const first = stepEnemies(b, 0.6);
  assert.ok(!first.some((e) => e.type === 'wound'), 'no blow on the beat they engage');
  assert.ok(aboutToAttack(b).length > 0, 'the warning shows');
  const second = stepEnemies(b, 1.2);
  assert.ok(second.some((e) => e.type === 'wound'));
});

/** Two outposts with the first crossbow winding up; the blow lands at t = 1.2. */
function windup() {
  const b = createBattle(stage('outpost'));
  b.army.x = 18;
  stepEnemies(b, 0.6);
  return b;
}
const lost = (b) => b.army.maxTroops - b.army.troops;

test('the guard is timed to the blow: perfect, good, or too early', () => {
  const open = windup();
  stepEnemies(open, 1.2);
  const perfect = windup();
  assert.ok(guard(perfect, 1.2 - 0.1));
  const pe = stepEnemies(perfect, 1.2);
  assert.equal(pe.find((e) => e.type === 'wound').block, 'perfect');
  const good = windup();
  guard(good, 1.2 - 0.4);
  stepEnemies(good, 1.2);
  const early = windup();
  guard(early, 1.2 - 0.7);
  stepEnemies(early, 1.2);
  assert.ok(lost(open) > 0);
  assert.ok(Math.abs(lost(perfect) - lost(open) * GUARD.best) < 1e-9);
  assert.ok(Math.abs(lost(good) - lost(open) * GUARD.good) < 1e-9);
  assert.equal(lost(early), lost(open), 'raised too early, the shields are down again');
});

test('the guard needs a moment to recover', () => {
  const b = createBattle(stage('outpost'));
  assert.ok(guard(b, 1));
  assert.ok(shieldsUp(b, 1.3));
  assert.ok(!guard(b, 1.3), 'still up / recovering');
  assert.ok(!shieldsUp(b, 1 + GUARD.window + 0.01));
  assert.ok(guard(b, 1 + GUARD.window + GUARD.recover));
});

test('the guard is separate from the drum: it does not touch the army’s order', () => {
  const b = createBattle(stage('outpost'));
  issueOrder(b, 'march', 1, 0.6);
  stepArmy(b, 0);
  const before = { ...b.order };
  assert.ok(guard(b, 0.1));
  assert.deepEqual(b.order, before);
  stepArmy(b, 0.6);
  assert.equal(b.order.beat, 2, 'the march carries on');
});

test('idling under fire loses the battle', () => {
  const b = createBattle(stage('outpost'));
  b.army.x = 22;
  for (let i = 1; i < 2000 && !b.outcome; i++) stepEnemies(b, i * 0.6);
  assert.equal(b.outcome, 'lost');
});

test('rally heals up to the maximum', () => {
  const b = createBattle(stage('luylau'));
  b.army.troops = 50;
  order(b, 'rally');
  assert.equal(b.army.troops, 60);
  b.army.troops = b.army.maxTroops - 1;
  order(b, 'rally');
  assert.equal(b.army.troops, b.army.maxTroops);
});

test('the elephant charge hits hard and needs the elephant', () => {
  const b = createBattle(stage('luylau'));
  assert.ok(order(b, 'charge').some((e) => e.type === 'trample'));
  assert.ok(!order(createBattle(stage('outpost')), 'charge').some((e) => e.type === 'trample'));
});

test('flourishes add power to the current order', () => {
  const plain = createBattle(stage('garden'));
  const fancy = createBattle(stage('garden'));
  plain.army.x = fancy.army.x = 7;
  plain.enemies[0].hp = fancy.enemies[0].hp = 1000;
  issueOrder(fancy, 'strike', 1, 0.6);
  addFlourish(fancy);
  addFlourish(fancy);
  for (let k = 0; k < 4; k++) stepArmy(fancy, k * 0.6);
  order(plain, 'strike');
  assert.ok(fancy.enemies[0].hp < plain.enemies[0].hp);
});

/**
 * A player at u seconds per beat: drums a phrase (4u) while the Han act on
 * their own drum, then the army answers for 4u, then the next phrase starts
 * at once. tier picks the rhythm tier, accuracy its evenness; guarding=true
 * raises the guard whenever a "!" shows (if recovered).
 */
function playChapter(s, { u = 0.6, tier = 1, accuracy = 1, guarding = null } = {}) {
  const b = createBattle(s);
  const han = 60 / s.bpm;
  let nextHan = 1;
  let t = 0;
  let combo = 0;
  let last = null;
  const advance = (until) => {
    while (nextHan * han <= until && !b.outcome) {
      const at = nextHan * han;
      // A guarding player raises the guard this long before the blow lands.
      if (guarding !== null && aboutToAttack(b).length) guard(b, at - guarding);
      stepEnemies(b, at);
      nextHan += 1;
    }
  };
  for (let cycle = 0; cycle < 200 && !b.outcome; cycle++) {
    const spirit = accuracy === 1 && combo >= 4;
    const front = blocker(b);
    const dist = front ? front.x - b.army.x : 99;
    const has = (c) => s.unlocked.includes(c);
    let cmd = dist <= 4.6 ? 'strike' : 'march';
    if (has('charge') && spirit && dist <= 5) cmd = 'charge';
    if (has('rally') && b.army.troops < b.army.maxTroops * 0.35 && last !== 'rally') cmd = 'rally';
    const useTier = Math.min(tier, s.maxTier);
    advance(t + 4 * u); // drumming the phrase
    t += 4 * u;
    issueOrder(b, cmd, commandPower(accuracy, spirit, TIER_POWER[useTier - 1]) * tempoFactor(u), u);
    for (let k = 0; k < 4 && !b.outcome; k++) {
      advance(t + k * u);
      stepArmy(b, t + k * u);
    }
    advance(t + 4 * u);
    t += 4 * u;
    combo = cmd === 'charge' ? 0 : combo + 1;
    last = cmd;
  }
  return b;
}

test('a steady drummer playing only tier I, guarding loosely, wins every chapter', () => {
  for (const s of STAGES) {
    const b = playChapter(s, { tier: 1, guarding: 0.4 });
    assert.equal(b.outcome, 'won', s.id);
    assert.ok(b.army.troops >= b.army.maxTroops * 0.2, `${s.id}: ${b.army.troops.toFixed(1)} left`);
  }
});

test('harder rhythms and sharper guarding make it easier', () => {
  for (const s of STAGES.slice(1)) {
    const plain = playChapter(s, { tier: 1, guarding: 0.4 });
    const fancy = playChapter(s, { tier: 3, guarding: 0.4 });
    const sharp = playChapter(s, { tier: 1, guarding: 0.1 });
    const none = playChapter(s, { tier: 1 });
    assert.ok(fancy.time < plain.time, `${s.id}: harder tiers win faster`);
    assert.ok(sharp.army.troops > plain.army.troops, `${s.id}: perfect blocks save more`);
    assert.ok(plain.army.troops > none.army.troops, `${s.id}: guarding helps`);
  }
});

test('slow or fast, sloppy drumming still clears the first two chapters', () => {
  for (const u of [0.4, 0.9]) {
    for (const s of STAGES.slice(0, 2)) assert.equal(playChapter(s, { u, accuracy: 0, guarding: 0.4 }).outcome, 'won', `${s.id} at ${u}`);
  }
});
