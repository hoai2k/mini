// Checks for the quality tier Auto picks per GPU (js/gfx/gpuTier.js), with
// the strings real browsers report.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyGPU, vendorOf } from '../js/gfx/gpuTier.js';

const ANGLE = (s) => `ANGLE (${s} Direct3D11 vs_5_0 ps_5_0, D3D11)`;

test('a Windows laptop whose WebGPU runs on the Intel chip is judged by that chip, not the NVIDIA card WebGL names', () => {
  const r = classifyGPU({ webgpu: true, vendor: 'intel', arch: 'gen-12lp', gpuDesc: '', renderer: ANGLE('NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU (0x00002560)') });
  assert.equal(r.judgedBy, 'webgpu-adapter');
  assert.equal(r.discrete, false);
  assert.equal(r.tier, 'medium');
});

test('Auto never picks Ultra: a desktop NVIDIA or AMD card gets High', () => {
  for (const [vendor, arch, gl] of [['nvidia', 'ampere', 'NVIDIA, NVIDIA GeForce RTX 3080'], ['nvidia', 'lovelace', 'NVIDIA, NVIDIA GeForce RTX 4090'], ['amd', 'rdna-3', 'AMD, AMD Radeon RX 7900 XTX']]) {
    const r = classifyGPU({ webgpu: true, vendor, arch, renderer: ANGLE(gl) });
    assert.equal(r.tier, 'high', `${gl}`); assert.equal(r.discrete, true);
  }
  assert.equal(classifyGPU({ webgpu: false, renderer: ANGLE('NVIDIA, NVIDIA GeForce GTX 1060') }).tier, 'high');
});

test('integrated chips get Medium, on WebGPU or WebGL', () => {
  assert.equal(classifyGPU({ webgpu: true, vendor: 'intel', arch: 'gen-12lp', renderer: ANGLE('Intel, Intel(R) Iris(R) Xe Graphics') }).tier, 'medium');
  assert.equal(classifyGPU({ webgpu: false, renderer: ANGLE('Intel, Intel(R) UHD Graphics 620') }).tier, 'medium');
  assert.equal(classifyGPU({ webgpu: true, vendor: 'amd', arch: 'rdna-3', renderer: ANGLE('AMD, AMD Radeon(TM) Graphics') }).tier, 'medium');
});

test('a Mac keeps the WebGL detail: an M1 on WebGPU is High, an M3 Max is High and discrete-class', () => {
  const m1 = classifyGPU({ webgpu: true, vendor: 'apple', arch: 'metal-3', renderer: 'Apple M1' });
  assert.equal(m1.judgedBy, 'both'); assert.equal(m1.tier, 'high');
  assert.equal(classifyGPU({ webgpu: false, vendor: '', renderer: 'Apple M1' }).tier, 'medium');
  const max = classifyGPU({ webgpu: true, vendor: 'apple', arch: 'metal-3', renderer: 'Apple M3 Max' });
  assert.equal(max.discrete, true); assert.equal(max.tier, 'high');
});

test('software rendering, phones and two-core machines get Low', () => {
  assert.equal(classifyGPU({ webgpu: false, renderer: ANGLE('Google, Vulkan 1.3.0 (SwiftShader Device (Subzero))') }).tier, 'low');
  assert.equal(classifyGPU({ webgpu: true, vendor: 'qualcomm', arch: 'adreno-7xx', renderer: 'Adreno (TM) 740', mobile: true }).tier, 'low');
  assert.equal(classifyGPU({ webgpu: true, vendor: 'nvidia', arch: 'ampere', renderer: ANGLE('NVIDIA, NVIDIA GeForce RTX 3080') }, { cores: 2 }).tier, 'low');
});

test('vendor names are read from both kinds of string', () => {
  assert.equal(vendorOf(ANGLE('NVIDIA, NVIDIA GeForce RTX 3060')), 'nvidia');
  assert.equal(vendorOf('intel gen-12lp'), 'intel');
  assert.equal(vendorOf('AMD Radeon RX 6800'), 'amd');
  assert.equal(vendorOf('Apple M2'), 'apple');
});
