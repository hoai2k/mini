// Checks for the Xbox controller layout (js/padmap.js), after Minecraft
// Dungeons II's defaults, driven with a fake gamepad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { padFrame, keyFrame, BTN, CHORD, PAD_LABEL, KEY_LABEL } from '../js/padmap.js';

// a fake pad: the named buttons down, sticks as given
function pad(down = [], { ls = [0, 0], rs = [0, 0] } = {}) {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 }));
  return { buttons, axes: [ls[0], ls[1], rs[0], rs[1]] };
}
const on = (h) => Object.keys(h).filter((k) => h[k]).sort();

test('each button does what Minecraft Dungeons II puts there', () => {
  const one = (b) => on(padFrame(pad([b]), {}, 0).held);
  assert.deepEqual(one(BTN.A), ['jump']);
  assert.deepEqual(one(BTN.X), ['attack']);
  assert.deepEqual(one(BTN.RB), ['t3']);
  assert.deepEqual(one(BTN.LB), ['dodge']);
  assert.deepEqual(one(BTN.LT), ['heal']);
  assert.deepEqual(one(BTN.RT), ['ranged']);
  assert.deepEqual(one(BTN.RS), ['sight']);
  assert.deepEqual(one(BTN.LS), ['trail']);
  assert.deepEqual(one(BTN.UP), ['inv']);
  assert.deepEqual(one(BTN.DOWN), ['swap']);
  assert.deepEqual(one(BTN.LEFT), ['art1']);
  assert.deepEqual(one(BTN.RIGHT), ['art2']);
  assert.deepEqual(one(BTN.VIEW), ['map']);
  assert.deepEqual(one(BTN.MENU), ['pause']);
});

test('A interacts instead of jumping while a prompt is up for that controller', () => {
  assert.deepEqual(on(padFrame(pad([BTN.A]), {}, 0, { interact: true }).held), ['interact']);
  assert.deepEqual(on(padFrame(pad([BTN.X]), {}, 0, { interact: true }).held), ['attack'], 'X still swings');
});

test('Y and B: alone after a short wait they are abilities 1 and 2; together the godly power', () => {
  let st = {};
  assert.deepEqual(on(padFrame(pad([BTN.Y]), st, 0).held), [], 'waits for a possible chord');
  assert.deepEqual(on(padFrame(pad([BTN.Y]), st, CHORD + 0.01).held), ['t1']);
  padFrame(pad([]), st, 1);
  st = {};
  padFrame(pad([BTN.B]), st, 0);
  assert.deepEqual(on(padFrame(pad([BTN.B]), st, CHORD + 0.01).held), ['t2']);
  st = {};
  padFrame(pad([BTN.Y]), st, 0);
  assert.deepEqual(on(padFrame(pad([BTN.Y, BTN.B]), st, 0.05).held), ['domain']);
  // still the godly power while held, never an ability on release of one
  assert.deepEqual(on(padFrame(pad([BTN.B]), st, 0.3).held), ['domain']);
});

test('a right stick flick rolls that way once, and re-arms back at the centre', () => {
  const st = {};
  let f = padFrame(pad([], { rs: [0.9, 0] }), st, 0);
  assert.ok(f.held.dodge); assert.ok(Math.abs(f.dodgeDir.x - 1) < 1e-9 && Math.abs(f.dodgeDir.y) < 1e-9);
  f = padFrame(pad([], { rs: [0.95, 0] }), st, 0.1);
  assert.ok(!f.held.dodge && !f.dodgeDir, 'holding the stick out is one roll');
  f = padFrame(pad([], { rs: [0.5, 0] }), st, 0.2);
  assert.ok(!f.held.dodge, 'not re-armed half way');
  padFrame(pad([], { rs: [0.1, 0] }), st, 0.3);
  f = padFrame(pad([], { rs: [0, -0.9] }), st, 0.4);   // stick pushed up (axes are y-down)
  assert.ok(f.held.dodge); assert.ok(f.dodgeDir.y > 0.99, 'screen up');
  assert.equal(f.aimStick, null, 'the right stick does not aim in dodge mode');
  // a small push is never a roll
  const st2 = {}; assert.ok(!padFrame(pad([], { rs: [0.6, 0] }), st2, 0).held.dodge);
});

test('Settings → right stick: aim brings back stick aiming, with no flick dodge', () => {
  const f = padFrame(pad([], { rs: [0.9, 0] }), {}, 0, { stick: 'aim' });
  assert.ok(!f.held.dodge && !f.dodgeDir); assert.ok(f.aimStick && f.aimStick.x > 0.8);
});

test('the left stick moves (with a dead zone)', () => {
  assert.deepEqual(padFrame(pad([], { ls: [0.1, 0.1] }), {}, 0).move, { x: 0, y: 0 });
  const m = padFrame(pad([], { ls: [0, -1] }), {}, 0).move; assert.ok(m.y > 0.99);
});

test('every action the game reads from a controller has a glyph, and the texts name the new buttons', () => {
  for (const a of ['attack', 'jump', 'ranged', 'dodge', 't1', 't2', 't3', 'domain', 'heal', 'sight', 'inv', 'swap', 'art1', 'art2', 'map', 'pause', 'trail']) assert.ok(PAD_LABEL[a], a);
  const read = (f) => readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
  assert.match(read('ui/instructions.js'), /\['Abilities 1 · 2 · 3', 'Y · B · RB'/);
  assert.match(read('ui/instructions.js'), /\['Ambrosia \(heal\)', 'LT'/);
  assert.doesNotMatch(read('main.js'), /: 'X';/, 'pad prompts say A');
  assert.doesNotMatch(read('story/chapters.js') + read('mission.js') + read('objectives/escape.js'), /\(LT \/ V\)|Hold LT/);
});

// ---------------------------------------------------------------- keyboard and mouse
const kf = (keys = [], mouse = [], st = {}, now = 0, o = {}) => keyFrame(new Set(keys), new Set(mouse), st, now, o);

test('keyboard and mouse follow Minecraft Dungeons II (WASD still moves)', () => {
  const one = (k) => on(kf([k]).held);
  assert.deepEqual(one('Space'), ['jump']);
  assert.deepEqual(one('KeyQ'), ['slam']);
  assert.deepEqual(one('KeyR'), ['dodge']);
  assert.deepEqual(one('Digit3'), ['t3']);
  assert.deepEqual(one('Digit4'), ['domain']);
  assert.deepEqual(one('KeyE'), ['heal']);
  assert.deepEqual(one('KeyI'), ['inv']); assert.deepEqual(one('Tab'), ['inv']);
  assert.deepEqual(one('KeyM'), ['map']); assert.deepEqual(one('KeyJ'), ['quest']);
  assert.deepEqual(one('KeyF'), ['swap']); assert.deepEqual(one('KeyV'), ['sight']);
  assert.deepEqual(one('KeyZ'), ['art1']); assert.deepEqual(one('KeyX'), ['art2']);
  assert.deepEqual(one('ShiftLeft'), ['root']);
  assert.deepEqual(one('Escape'), ['pause']);
  // the old bindings are gone: nothing double-fires
  for (const k of ['KeyT', 'KeyC', 'KeyS', 'KeyW']) assert.deepEqual(one(k), [], k);
  assert.deepEqual(on(kf([], [0]).held), ['attack']);
  assert.deepEqual(on(kf([], [2]).held), ['ranged']);
  assert.deepEqual(on(kf([], [1]).held), ['trail']);
  assert.deepEqual(on(kf([], [3]).held), ['dodge']); assert.equal(kf([], [3]).dodgeToAim, true, 'Mouse 4 rolls toward the cursor');
  assert.deepEqual(on(kf([], [4]).held), ['dodge']); assert.equal(kf([], [4]).dodgeToAim, false, 'Mouse 5 rolls forward');
  assert.equal(kf(['KeyR']).dodgeToAim, true);
  const m = kf(['KeyW', 'KeyD']).move; assert.ok(Math.abs(Math.hypot(m.x, m.y) - 1) < 1e-9 && m.x > 0 && m.y > 0);
});

test('left click interacts instead of attacking while a prompt is up', () => {
  assert.deepEqual(on(kf([], [0], {}, 0, { interact: true }).held), ['interact']);
});

test('1 and 2 wait a moment for each other: together they are the godly power', () => {
  let st = {};
  assert.deepEqual(on(kf(['Digit1'], [], st, 0).held), []);
  assert.deepEqual(on(kf(['Digit1'], [], st, CHORD + 0.01).held), ['t1']);
  st = {}; kf(['Digit2'], [], st, 0);
  assert.deepEqual(on(kf(['Digit2'], [], st, CHORD + 0.01).held), ['t2']);
  st = {}; kf(['Digit1'], [], st, 0);
  assert.deepEqual(on(kf(['Digit1', 'Digit2'], [], st, 0.05).held), ['domain']);
});

test('the HUD has a key for every slot', () => {
  for (const a of ['ranged', 't1', 't2', 't3', 'heal', 'domain', 'art1', 'art2']) assert.ok(KEY_LABEL[a], a);
  assert.equal(KEY_LABEL.heal, 'E'); assert.equal(KEY_LABEL.art1, 'Z'); assert.equal(KEY_LABEL.swap, 'F');
});
