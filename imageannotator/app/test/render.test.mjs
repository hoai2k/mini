import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outlineOf, contrastOf } from '../src/render.js';

test('text outline: automatic contrast, transparent, or a chosen color', () => {
  assert.equal(outlineOf({ color: '#ffcc00' }), '#111111');
  assert.equal(outlineOf({ color: '#0a84ff', outline: 'auto' }), '#ffffff');
  assert.equal(outlineOf({ color: '#0a84ff', outline: 'none' }), null);
  assert.equal(outlineOf({ color: '#0a84ff', outline: '#ff9500' }), '#ff9500');
  assert.equal(contrastOf('#ffffff'), '#111111');
});
