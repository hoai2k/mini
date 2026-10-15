// The party (js/partyRules.js): the story's heroes and no companions in the
// opening, a party of three from camp on; the hero select's choices; and AI
// companions that follow and only join fights a person started.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORY_HEROES, storyHeroes, companionsWanted, storyAssign, selectOptions, companionShouldEngage, wakesMonsters } from '../js/partyRules.js';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(GAME, 'js', p), 'utf8');
const IDS = ['percy', 'annabeth', 'grover', 'tyson', 'clarisse'];

// ---------------------------------------------------------------- who plays
test('the opening follows the story: Percy, then Grover, Annabeth, Clarisse', () => {
  assert.deepEqual(STORY_HEROES, ['percy', 'grover', 'annabeth', 'clarisse']);
  assert.deepEqual(storyHeroes(1), ['percy']);
  assert.deepEqual(storyHeroes(2), ['percy', 'grover']);
  assert.deepEqual(storyHeroes(3), ['percy', 'grover', 'annabeth']);
  assert.deepEqual(storyHeroes(4), ['percy', 'grover', 'annabeth', 'clarisse']);
  assert.deepEqual(storyHeroes(0), ['percy'], 'never nobody');
  for (const h of STORY_HEROES) assert.ok(IDS.includes(h), `${h} is playable`);
});
test('no AI companions in the opening; from camp on the AI fills the party to three', () => {
  for (let n = 1; n <= 4; n++) assert.equal(companionsWanted(n, { opening: true }), 0, `${n} in the opening`);
  assert.equal(companionsWanted(1), 2);
  assert.equal(companionsWanted(2), 1);
  assert.equal(companionsWanted(3), 0);
  assert.equal(companionsWanted(4), 0);
  // only unlocked heroes come along: with two unlocked, one companion at most
  assert.equal(companionsWanted(1, { available: 2 }), 1);
  assert.equal(companionsWanted(1, { available: 1 }), 0);
  assert.equal(companionsWanted(1, { available: 5 }), 2);
});
test('in the opening each person plays their story hero; joining and leaving add or remove the matching one', () => {
  assert.deepEqual(storyAssign(['annabeth']), ['percy'], 'a new game starts Percy alone');
  assert.deepEqual(storyAssign(['percy', 'tyson']), ['percy', 'grover'], 'player 2 is Grover');
  assert.deepEqual(storyAssign(['percy', 'grover', 'percy']), ['percy', 'grover', 'annabeth'], 'player 3 is Annabeth, never a hero twice');
  assert.deepEqual(storyAssign(['percy', 'grover', 'annabeth', 'percy']), ['percy', 'grover', 'annabeth', 'clarisse']);
  // Grover's player leaves: Annabeth's player becomes Grover (two people: Percy and Grover)
  assert.deepEqual(storyAssign(['percy', 'annabeth']), ['percy', 'grover']);
  // Percy's player leaves: the one left is Percy
  assert.deepEqual(storyAssign(['grover']), ['percy']);
  // nobody changes who already plays a story hero
  assert.deepEqual(storyAssign(['percy', 'grover', 'annabeth']), ['percy', 'grover', 'annabeth']);
});
test('the hero select offers only the story hero in the opening, the unlocked heroes after it', () => {
  for (let i = 0; i < 4; i++) assert.deepEqual(selectOptions(i, { opening: true, ids: IDS }), [STORY_HEROES[i]]);
  const unlocked = (id) => ['percy', 'annabeth', 'grover'].includes(id);
  assert.deepEqual(selectOptions(0, { opening: false, ids: IDS, unlocked }), ['percy', 'annabeth', 'grover']);
  assert.deepEqual(selectOptions(2, { opening: false, ids: IDS }), IDS);
  const sel = read('ui/partySelect.js');
  assert.match(sel, /selectOptions\(i, \{ opening, ids, unlocked \}\)/);
  assert.match(sel, /const compRows = \(\) => \(opening \? 0 :/, 'no companions to pick in the opening');
  assert.match(sel, /opening \? null : h\('div', \{ class: 'chips'/, 'no hero chips in the opening');
});
test('the session, Continue, joining and the online room run the rules', () => {
  const main = read('main.js'), party = read('party.js'), online = read('net/online.js'), sel = read('ui/partySelect.js');
  assert.match(main, /forceOpening = !this\.opening\.done && !this\.online\?\.isGuest && \(opening \|\| start === 'auto'\)/, 'a new game starts the opening with the story party');
  assert.match(main, /this\.addPlayer\(id, this\.partyMgr\.joinHero\(\)\)/, 'a controller joining mid-opening plays the next story hero');
  assert.match(sel, /resume\.kind === 'opening' \|\| !!resume\.def\?\.opening/, 'Continue into the opening is Percy alone');
  assert.match(party, /companionsWanted\(humans\.length, \{ available:/);
  assert.match(party, /arriving && added\.length/, 'arriving in camp summons the companions');
  assert.match(party, /op !== this\.wasOpening/, 'the party is refilled when the opening starts or ends');
  assert.match(online, /companionsWanted\(humans, \{ opening, available/);
  assert.match(online, /if \(opening\) this\.storyHeroes\(\)/, 'online, the host hands out the story heroes');
});

// ---------------------------------------------------------------- companions pick no fights
const human = { isPlayer: true, ai: false }, bot = { isPlayer: true, ai: true };
const idle = (o = {}) => ({ dead: false, aggro: false, target: null, loiter: { kind: 'pack', alertT: null, joinT: null, pack: { alarmed: false } }, ...o });
test('companions leave a group milling about, a scout at its post and a sleeping statue alone', () => {
  assert.equal(companionShouldEngage(idle()), false);
  assert.equal(companionShouldEngage(idle({ loiter: { kind: 'pack', alertT: null, joinT: null, scout: true, pack: { alarmed: false } } })), false, 'a scout');
  assert.equal(companionShouldEngage({ dead: false, aggro: false, def: { ai: 'statue' } }), false, 'a statue not yet awake');
  assert.equal(companionShouldEngage({ dead: false, aggro: false }), false, 'a monster that has not noticed anyone');
  assert.equal(companionShouldEngage(idle({ loiter: { kind: 'rat', alertT: 0.3, dashing: false } })), false, 'a rat merely eyeing someone');
  assert.equal(companionShouldEngage(idle({ hitBy: new Map([[bot, 1]]) })), false, 'only hit by the AI: not a fight a person picked');
});
test('companions join a fight once a person starts it, and once it is on they fight normally', () => {
  assert.equal(companionShouldEngage(idle({ hitBy: new Map([[human, 3]]) })), true, 'a person hit it');
  assert.equal(companionShouldEngage(idle({ lastAttacker: human })), true, 'online: a guest hit it');
  assert.equal(companionShouldEngage(idle({ aggro: true })), true, 'it is fighting');
  assert.equal(companionShouldEngage(idle({ target: bot })), true, 'it is after a hero (a companion too)');
  assert.equal(companionShouldEngage(idle({ loiter: { kind: 'pack', alertT: null, joinT: 1.2, pack: { alarmed: false } } })), true, 'the alarm reached it');
  assert.equal(companionShouldEngage(idle({ loiter: { kind: 'pack', alertT: null, joinT: null, pack: { alarmed: true } } })), true, 'its group is awake');
  assert.equal(companionShouldEngage(idle({ loiter: { kind: 'pack', alertT: 0.2, joinT: null, pack: { alarmed: false } } })), true, 'rearing up at a person it saw');
  assert.equal(companionShouldEngage({ isBoss: true }), true, 'a boss in its arena');
});
test('never the dead, the disguised, the untargetable, the dummy or a mortal', () => {
  for (const o of [{ dead: true }, { disguised: true }, { untargetable: true }, { isDummy: true }, { def: { mortal: true } }]) assert.equal(companionShouldEngage(idle({ aggro: true, ...o })), false, JSON.stringify(o));
  assert.equal(companionShouldEngage(null), false);
});
test('AI companions wake nothing by being seen: only a person does', () => {
  assert.equal(wakesMonsters(human), true);
  assert.equal(wakesMonsters(bot), false);
  assert.equal(wakesMonsters(null), false);
  const enemy = read('entities/enemy.js'), party = read('party.js');
  assert.match(enemy, /if \(!this\.aggro && t\.isPlayer && !wakesMonsters\(t\)\) continue;/, 'a monster not yet fighting notices only people');
  assert.match(enemy, /if \(!seen \|\| sd > Math\.max\(L\.notice, PACK\.hear\)\) return null;/, 'a group notices only people');
  assert.match(enemy, /\(!p\.isPlayer \|\| wakesMonsters\(p\)\) && p\.pos\.distanceTo\(this\.pos\) < \(this\.def\.wake/, 'a statue wakes only for people');
  assert.match(party, /if \(!companionShouldEngage\(e\)\) continue;/, 'companions only go for monsters in the battle');
  assert.match(party, /if \(lead && p\.pos\.distanceTo\(lead\.pos\) > 26\) this\.regroup\(lead\)/, 'the regroup teleport stays');
  assert.match(party, /if \(downed\) move = this\.steer\(downed\.pos, 0\.8\)/, 'reviving a downed ally stays first');
});
