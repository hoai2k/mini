import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, issueOrder, stepBeat, addFlourish, commandPower, blocker } from '../src/battle.js';
import { STAGES } from '../src/stages.js';
import { COMMANDS } from '../src/rhythm.js';

const stage = (id) => STAGES.find((s) => s.id === id);

function measure(state, command, power = 1) {
  issueOrder(state, command, power);
  const events = [];
  for (let i = 0; i < 4; i++) events.push(...stepBeat(state));
  return events;
}

test('stages only unlock known commands and have a goal', () => {
  const ids = new Set(COMMANDS.map((c) => c.id));
  for (const s of STAGES) {
    for (const c of s.unlocked) assert.ok(ids.has(c), `${s.id}: ${c}`);
    const b = createBattle(s);
    assert.ok(b.enemies.some((e) => e.goal), s.id);
    if (s.unlocked.includes('charge')) assert.ok(s.elephant, s.id);
  }
});

test('march advances but never through the nearest enemy', () => {
  const b = createBattle(stage('garden'));
  measure(b, 'march', 0.5);
  assert.equal(b.army.x, 4);
  measure(b, 'march');
  assert.equal(b.army.x, 9 - 1.5);
  measure(b, 'march');
  assert.equal(b.army.x, 9 - 1.5);
});

test('the garden can be cleared with march and strike', () => {
  const b = createBattle(stage('garden'));
  for (let i = 0; i < 40 && !b.outcome; i++) {
    const front = blocker(b);
    measure(b, front && front.x - b.army.x <= 3 ? 'strike' : 'march');
  }
  assert.equal(b.outcome, 'won');
});

test('shields cut the damage the army takes', () => {
  const open = createBattle(stage('outpost'));
  const guarded = createBattle(stage('outpost'));
  open.army.x = guarded.army.x = 22;
  measure(open, 'march', 0);
  measure(guarded, 'shield');
  const lostOpen = open.army.maxTroops - open.army.troops;
  const lostGuarded = guarded.army.maxTroops - guarded.army.troops;
  assert.ok(lostOpen > 0);
  assert.ok(lostGuarded < lostOpen * 0.5);
});

test('idling under fire loses the battle', () => {
  const b = createBattle(stage('outpost'));
  b.army.x = 22;
  for (let i = 0; i < 400 && !b.outcome; i++) stepBeat(b);
  assert.equal(b.outcome, 'lost');
});

test('rally heals up to the maximum', () => {
  const b = createBattle(stage('luylau'));
  b.army.troops = 50;
  measure(b, 'rally');
  assert.equal(b.army.troops, 60);
  b.army.troops = b.army.maxTroops - 1;
  measure(b, 'rally');
  assert.equal(b.army.troops, b.army.maxTroops);
});

test('the elephant charge hits hard and needs the elephant', () => {
  const b = createBattle(stage('luylau'));
  const events = measure(b, 'charge');
  assert.ok(events.some((e) => e.type === 'trample'));
  const noElephant = createBattle(stage('outpost'));
  assert.ok(!measure(noElephant, 'charge').some((e) => e.type === 'trample'));
});

test('flourishes and spirit raise power', () => {
  assert.ok(commandPower(1, true) > commandPower(1, false));
  assert.ok(commandPower(1, false) > commandPower(0.6, false));
  const plain = createBattle(stage('garden'));
  const fancy = createBattle(stage('garden'));
  plain.army.x = fancy.army.x = 7;
  plain.enemies[0].hp = fancy.enemies[0].hp = 1000;
  issueOrder(fancy, 'strike', 1);
  addFlourish(fancy);
  addFlourish(fancy);
  for (let i = 0; i < 4; i++) stepBeat(fancy);
  measure(plain, 'strike');
  assert.ok(fancy.enemies[0].hp < plain.enemies[0].hp);
});

// A steady drummer: one command per eight beats, chaining, using each tool
// when it is called for. Every chapter must be winnable by this player.
function playChapter(s, accuracy) {
  const b = createBattle(s);
  let combo = 0;
  let last = null;
  for (let cycle = 0; cycle < 80 && !b.outcome; cycle++) {
    const spirit = accuracy === 1 && combo >= 4;
    const front = blocker(b);
    const dist = front ? front.x - b.army.x : 99;
    const has = (c) => s.unlocked.includes(c);
    const ranged = b.enemies.some((e) => e.alive && (e.type === 'crossbow' || e.type === 'fort') && e.x - b.army.x <= 14);
    let cmd = dist <= 4.6 ? 'strike' : 'march';
    if (has('shield') && ranged && last !== 'shield' && b.beat > b.shieldUntil) cmd = 'shield';
    if (has('charge') && spirit && dist <= 5) cmd = 'charge';
    if (has('rally') && b.army.troops < b.army.maxTroops * 0.35 && last !== 'rally') cmd = 'rally';
    for (let i = 0; i < 4 && !b.outcome; i++) stepBeat(b);
    issueOrder(b, cmd, commandPower(accuracy, spirit));
    for (let i = 0; i < 4 && !b.outcome; i++) stepBeat(b);
    combo = cmd === 'charge' ? 0 : combo + 1; // the charge spends the waking drum
    last = cmd;
  }
  return b;
}

test('a steady, accurate drummer wins every chapter with troops to spare', () => {
  for (const s of STAGES) {
    const b = playChapter(s, 1);
    assert.equal(b.outcome, 'won', s.id);
    assert.ok(b.army.troops >= b.army.maxTroops * 0.25, `${s.id}: ${b.army.troops}`);
  }
});

test('sloppy drumming still clears the first two chapters', () => {
  for (const s of STAGES.slice(0, 2)) assert.equal(playChapter(s, 0.6).outcome, 'won', s.id);
});
