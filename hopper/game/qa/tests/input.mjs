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
