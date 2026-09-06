import assert from 'node:assert/strict';
globalThis.HTMLElement = class HTMLElement extends EventTarget {
  tagName = 'CANVAS';
  isContentEditable = false;
};
globalThis.window = new EventTarget();
let pads = [];
Object.defineProperty(globalThis, 'navigator', {
  value: { getGamepads: () => pads },
  configurable: true,
});
const { InputManager } = await import('../../src/game/input.ts');
const input = new InputManager();
const key = (type, code, repeat = false) => {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    code: { value: code },
    repeat: { value: repeat },
  });
  window.dispatchEvent(event);
};
const pad = {
  index: 0,
  connected: true,
  id: 'Xbox standard',
  mapping: 'standard',
  axes: [0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
};
const button = (index, pressed, value = Number(pressed)) => {
  pad.buttons[index] = { pressed, value };
};
assert.equal(input.update(1 / 60).connected, false);
key('keydown', 'Space');
let frame = input.update(1 / 60);
assert(frame.jumpPressed && frame.jumpHeld && frame.anyPressed);
assert(!input.update(1 / 60).jumpPressed, 'keyboard edges fire once');
input.resetEdges();
frame = input.update(1 / 60);
assert(!frame.jumpHeld && !frame.jumpPressed, 'held start cannot jump');
key('keyup', 'Space');
key('keydown', 'Space');
assert(input.update(1 / 60).jumpPressed);
key('keyup', 'Space');
pads = [pad];
button(0, true);
frame = input.update(1 / 60);
assert(
  frame.connected &&
    frame.anyPressed &&
    frame.confirmPressed &&
    frame.jumpPressed,
);
input.resetEdges();
frame = input.update(1 / 60);
assert(!frame.jumpHeld && !frame.anyPressed);
button(0, false);
input.update(1 / 60);
button(0, true);
assert(input.update(1 / 60).jumpPressed);
button(0, false);
button(7, false, 0.2);
frame = input.update(1 / 60);
assert(frame.shootHeld, 'analog RT uses soft threshold');
button(1, true);
frame = input.update(0.016);
assert(
  frame.blockHeld && frame.backPressed,
  'B holds shield and retains menu back edge',
);
frame = input.update(0.016);
assert(
  frame.blockHeld && !frame.backPressed,
  'shield remains held while menu back does not repeat',
);
input.resetEdges();
frame = input.update(0.016);
assert(
  !frame.blockHeld && !frame.backPressed,
  'screen transition quarantines held B',
);
button(1, false);
frame = input.update(0.016);
assert(!frame.blockHeld);
button(1, true);
assert(
  input.update(0.016).blockHeld,
  'fresh B works after releasing quarantine',
);
button(1, false);
assert(!input.update(0.016).blockHeld);
key('keydown', 'KeyL');
assert(input.update(0.016).blockHeld, 'L is keyboard shield');
input.resetEdges();
assert(!input.update(0.016).blockHeld);
key('keyup', 'KeyL');
key('keydown', 'KeyL');
assert(input.update(0.016).blockHeld);
key('keyup', 'KeyL');
assert(!input.update(0.016).blockHeld);
pad.axes = [0, 0, 0.1, -0.1];
frame = input.update(0.016);
assert.equal(frame.lookX, 0, 'right stick deadzone');
assert.equal(frame.lookY, 0);
pad.axes = [0, 0, 1, -0.59];
frame = input.update(0.016);
assert.equal(frame.lookX, 1, 'right stick look ahead');
assert.equal(
  frame.lookY,
  -0.5,
  'right stick look up is scaled past the deadzone',
);
assert.equal(frame.moveX, 0, 'right stick never moves Hopper');
pad.axes = [0, 0];
button(7, false, 0);
pad.axes = [0.17, 0];
assert.equal(input.update(1 / 60).moveX, 0);
pad.axes = [1, 0];
frame = input.update(1 / 60);
assert.equal(frame.moveX, 1);
assert.equal(frame.menuX, 1);
assert.equal(input.update(0.1).menuX, 0);
assert.equal(input.update(0.1).menuX, 0);
assert.equal(input.update(0.1).menuX, 0);
assert.equal(input.update(0.07).menuX, 1);
pad.axes = [0, 0];
button(2, true);
assert(input.update(0.016).kickPressed);
assert(!input.update(0.016).kickPressed);
button(2, false);
button(9, true);
assert(input.update(0.016).pausePressed);
button(9, false);
button(8, true);
assert(input.update(0.016).instructionsPressed);
button(8, false);
pads = [];
frame = input.update(0.016);
assert(frame.disconnected && !frame.connected);
assert(!input.update(0.016).disconnected, 'disconnect transition only once');
pads = [pad];
assert(input.update(0.016).connected);
key('keydown', 'KeyD');
assert.equal(input.update(0.016).moveX, 1);
window.dispatchEvent(new Event('blur'));
assert.equal(input.update(0.016).moveX, 0);
input.dispose();
key('keydown', 'Space');
assert(!input.update(0.016).jumpPressed, 'dispose removes event handlers');
const tapping = new InputManager();
key('keydown', 'KeyK');
key('keyup', 'KeyK');
assert(
  tapping.update(0.016).shootHeld,
  'quick shoot tap survives between animation frames',
);
assert(!tapping.update(0.016).shootHeld);
tapping.dispose();
console.log(
  'PASS: keyboard and Xbox edges, reset quarantine, RT analog threshold, .18 deadzone, menu repeat, disconnect/reconnect, blur, dispose.',
);

// Multiple controllers share one player without stealing held actions.
const makePad = (index) => ({
  index,
  connected: true,
  id: `Standard controller ${index}`,
  mapping: 'standard',
  axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
});
const first = makePad(0),
  second = makePad(2),
  third = makePad(3);
const press = (controller, index, down = true, value = Number(down)) => {
  controller.buttons[index] = { pressed: down, value };
};
const neutral = () => {
  for (const controller of [first, second, third]) {
    controller.axes = [0, 0, 0, 0];
    controller.buttons.forEach((_, i) => press(controller, i, false));
  }
};
pads = [first, null, second, third];
const shared = new InputManager();
const poll = () => shared.update(1 / 60);
poll();
first.axes = [1, 0, 0, 0];
press(first, 7, false, 0.2);
press(second, 0);
press(third, 2);
frame = poll();
assert.equal(
  frame.moveX,
  1,
  'movement survives another controller pressing a button',
);
assert(
  frame.shootHeld && frame.jumpHeld && frame.jumpPressed && frame.kickPressed,
  'three controllers contribute movement, trigger, jump and kick simultaneously',
);
frame = poll();
assert(
  frame.shootHeld && frame.jumpHeld && !frame.jumpPressed && !frame.kickPressed,
  'held actions persist and each edge fires once',
);
press(first, 0);
assert(
  poll().jumpPressed,
  'another controller can press A while A is already held',
);
press(second, 0, false);
assert(poll().jumpHeld, 'releasing one controller does not release another');
for (const controller of [first, second, third]) {
  for (const [buttonIndex, field] of [
    [0, 'jumpPressed'],
    [0, 'confirmPressed'],
    [1, 'backPressed'],
    [1, 'blockHeld'],
    [2, 'kickPressed'],
    [7, 'shootHeld'],
    [8, 'instructionsPressed'],
    [9, 'pausePressed'],
  ]) {
    neutral();
    poll();
    press(controller, buttonIndex);
    frame = poll();
    assert(
      frame[field] && frame.anyPressed,
      `${field} works from slot ${controller.index}`,
    );
  }
}
const axes = (f) => [f.moveX, f.moveY, f.lookX, f.lookY];
neutral();
poll();
first.axes = [1, -1, 1, -1];
second.axes = [1, -1, 1, -1];
third.axes = [-1, 1, -1, 1];
assert.deepEqual(axes(poll()), [1, -1, 1, -1], 'axes sum before clamping');
pads = [third, second, null, first];
assert.deepEqual(
  axes(poll()),
  [1, -1, 1, -1],
  'pad enumeration order does not change input',
);
third.axes = [0, 0, 0, 0];
assert.deepEqual(
  axes(poll()),
  [1, -1, 1, -1],
  'multiple sticks cannot exceed normal speed',
);
second.axes = [-1, 1, -1, 1];
assert.deepEqual(
  axes(poll()),
  [0, 0, 0, 0],
  'equal opposite directions cancel',
);
neutral();
poll();
first.axes = [0.17, -0.17, 0.17, -0.17];
second.axes = [0.17, -0.17, 0.17, -0.17];
assert.deepEqual(
  axes(poll()),
  [0, 0, 0, 0],
  'per-controller deadzones prevent accumulated drift',
);
neutral();
poll();
press(second, 15);
press(third, 12);
frame = poll();
assert.equal(frame.moveX, 1);
assert.equal(frame.moveY, -1);
assert.equal(frame.menuX, 1);
assert.equal(frame.menuY, -1);
assert.equal(
  poll().menuX,
  0,
  'shared D-pad menu edges do not repeat immediately',
);
neutral();
poll();
second.axes = [0, 0, -1, 1];
key('keydown', 'KeyD');
frame = poll();
assert.equal(frame.moveX, 1, 'keyboard remains available');
assert.equal(
  frame.lookX,
  -1,
  'right-stick-only activity works on another controller',
);
assert.equal(frame.active, 'gamepad', 'right-stick-only input updates prompts');
key('keyup', 'KeyD');
neutral();
poll();
press(first, 0);
press(second, 7);
press(third, 1);
shared.resetEdges();
frame = poll();
assert(
  !frame.jumpHeld &&
    !frame.jumpPressed &&
    !frame.shootHeld &&
    !frame.blockHeld &&
    !frame.anyPressed,
  'screen changes quarantine held buttons on all controllers',
);
press(first, 0, false);
poll();
press(first, 0);
frame = poll();
assert(
  frame.jumpPressed && !frame.shootHeld && !frame.blockHeld,
  'quarantine releases separately per controller',
);
neutral();
poll();
press(second, 0);
press(third, 7);
window.dispatchEvent(new Event('blur'));
frame = poll();
assert(
  !frame.jumpHeld && !frame.shootHeld,
  'blur quarantines every controller',
);
neutral();
poll();
first.axes = [1, 0, 0, 0];
press(second, 0);
poll();
second.connected = false;
frame = poll();
assert(
  frame.connected &&
    !frame.disconnected &&
    !frame.jumpHeld &&
    frame.moveX === 1,
  'one disconnect clears its input without interrupting the remaining controllers',
);
second.connected = true;
assert(poll().jumpPressed, 'reconnected slot has fresh button history');
pads = [null, third];
frame = poll();
assert(
  frame.connected &&
    !frame.disconnected &&
    frame.moveX === 0 &&
    !frame.jumpHeld,
  'removed slots do not leave stuck actions',
);
pads = [];
assert(
  poll().disconnected,
  'only the final controller disconnect signals disconnection',
);
assert(!poll().disconnected, 'disconnect is reported once');
shared.dispose();
console.log(
  'PASS: shared controller actions, independent edges, summed axes, sparse slots, quarantine, disconnect/reconnect.',
);
