import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.min.js';
import { createPortalGlow } from './portal.js';

test('portal particle motion is independent of openness, camera and resolution', () => {
  let pixels = 720;
  const glow = createPortalGlow({ THREE, column: {}, pixelHeight: () => pixels });
  const points = glow.group.children.find((c) => c.isPoints);
  const u = points.material.uniforms;
  const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 1000);
  glow.update(1 / 60, 120, camera);
  const seeds = points.geometry.attributes.seed.array.slice();
  glow.setOpen(true);
  pixels = 1440;
  camera.position.set(0, 30, 100);
  camera.fov = 15;
  glow.update(1, 120, camera);
  assert.equal(u.uTime.value, 120, 'changing the view does not advance the particle clock');
  assert.equal(u.uViewH.value, 1440, 'resolution only changes the projected point size');
  assert.deepEqual(points.geometry.attributes.seed.array, seeds);
  // The fragment shader may brighten an open portal; its vertex shader must
  // not change particle phase, velocity or path when that state changes.
  assert.doesNotMatch(points.material.vertexShader, /\buOpen\b/);
  assert.equal(glow.column.mesh.material.uniforms.uTime.value, 120);
  glow.dispose();
});

test('repeated updates for the same presentation time do not accelerate sparkles', () => {
  const glow = createPortalGlow({ THREE, column: {} });
  const u = glow.group.children.find((c) => c.isPoints).material.uniforms;
  for (let i = 0; i < 8; i++) glow.update(1 / 60, 10, null);
  assert.equal(u.uTime.value, 10);
  glow.update(1 / 60, 11, null);
  assert.equal(u.uTime.value, 11);
  assert.equal(glow.column.mesh.material.uniforms.uTime.value, 11);
  glow.dispose();
});
