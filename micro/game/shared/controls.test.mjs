import test from 'node:test';
import assert from 'node:assert/strict';

// The embed module is inactive for this standalone controls test.
globalThis.location = { search: '', origin: 'http://localhost' };
globalThis.window = {};
window.parent = window;
const { createControls } = await import('./controls.js');
const { BTN } = await import('./pad.js');

function fixture() {
  const held = new Map(), edges = new Set();
  const pad = {
    value: (b) => held.get(b) || 0,
    down: (b) => (held.get(b) || 0) > 0.5,
    pressed: (b) => edges.has(b),
    released: () => false,
    lt: () => held.get(BTN.LT) || 0,
    rt: () => held.get(BTN.RT) || 0,
  };
  return { held, edges, ctl: createControls(pad) };
}

test('LB zooms in, RB zooms out; opposing shoulders cancel', () => {
  const { held, edges, ctl } = fixture();
  held.set(BTN.LB, 1); edges.add(BTN.LB);
  assert.equal(ctl.zoomRate(), -1, 'negative rate narrows the field');
  assert.equal(ctl.shoulderZoomStep(), 1, 'positive step increases magnification');
  edges.clear();
  assert.equal(ctl.shoulderZoomStep(), 0, 'holding does not repeat objective steps');
  assert.equal(ctl.zoomRate(), -1, 'continuous worlds keep zooming while held');
  held.clear(); held.set(BTN.RB, 1); edges.add(BTN.RB);
  assert.equal(ctl.zoomRate(), 1);
  assert.equal(ctl.shoulderZoomStep(), -1);
  held.set(BTN.LB, 1); edges.add(BTN.LB);
  assert.equal(ctl.zoomRate(), 0);
  assert.equal(ctl.shoulderZoomStep(), 0);
});

test('triggers retain analog and press-edge actions without affecting shoulder zoom', () => {
  const { held, edges, ctl } = fixture();
  held.set(BTN.LT, 0.7); edges.add(BTN.LT);
  assert.equal(ctl.analog(), -0.7);
  assert.equal(ctl.leftTrigger.pressed(), true);
  assert.equal(ctl.rightTrigger.pressed(), false);
  assert.equal(ctl.zoomRate(), 0);
  assert.equal(ctl.shoulderZoomStep(), 0);
  held.clear(); edges.clear(); held.set(BTN.RT, 1); edges.add(BTN.RT);
  assert.equal(ctl.analog(), 1);
  assert.equal(ctl.rightTrigger.pressed(), true);
});

test('legacy amoeba shoulder axis and D-pad objective bindings remain independent', () => {
  const { held, edges, ctl } = fixture();
  held.set(BTN.LB, 1); edges.add(BTN.LB);
  assert.equal(ctl.secondary(), -1);
  assert.equal(ctl.lb.down(), true);
  assert.equal(ctl.zoomStep(), 0);
  edges.clear(); edges.add(BTN.UP);
  assert.equal(ctl.zoomStep(), 1);
  assert.equal(ctl.shoulderZoomStep(), 0);
});
