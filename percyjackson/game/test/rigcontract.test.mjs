// The rig contract (js/entities/rigContract.js) and the voxel kit
// (js/entities/voxkit.js). Both build on Three.js, which Node can't load, so
// these read the sources: the contract documents every tag the game and the
// checks rely on, re-exports the helpers that set them, and the workbench
// exposes window.__validateAll for perf/check.cjs (which runs validateRig over
// every model in the browser).
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const contract = read('js/entities/rigContract.js');
const header = contract.slice(0, contract.indexOf('\nimport '));

test('the rig contract documents every tag', () => {
  const TAGS = ['markTip', 'markHeld', 'markHeadwear', 'markHeadCore', 'userData.noMerge', 'userData.baseMat', 'userData.shell', 'userData.flames', 'userData.noLint', 'userData.parts',
    'rig.extras', 'trunk', 'headCore', 'rig.tick', 'rig.onTick', 'keepAbove', 'groundLying', 'rig.batchKey', 'rig.championLook', 'rig.levelAim', 'rig.hoverMin', 'rig.float', 'rig.skirt',
    'parts.hat', 'handR', 'handL', 'rig.isQuad', 'rig.headMesh', 'rig.meshes', 'rig.shape'];
  for (const t of TAGS) assert.ok(header.includes(t), `rigContract.js's header documents ${t}`);
  // each documented reader exists
  for (const f of ['gfx/crowd.js', 'entities/charmat.js', 'entities/character.js', 'entities/parts.js', 'entities/proportions.js']) assert.ok(read('js/' + f).length > 0, f);
});

test('the rig contract re-exports the tag helpers and has validateRig', () => {
  assert.match(contract, /export \{ markTip, markHeld, groundLying, markHeadCore, markHeadwear, keepAbove \}/);
  assert.match(contract, /export function validateRig\(rig, kind/);
  for (const k of ['RIG_KINDS', 'KIND_OF_GROUP', 'WEAPON_KEYS', 'HEADWEAR_KEYS', 'ANIMATED_KEYS']) assert.match(contract, new RegExp(`export const ${k} =`));
  // the workbench runs it over every model, for perf/check.cjs's rig check
  const wb = read('workbench/workbench.js');
  assert.match(wb, /window\.__validateAll = async/);
  assert.match(wb, /import\('\.\.\/js\/entities\/rigContract\.js'\)/);
});

test('one voxel kit: every model module draws through voxkit.js', () => {
  const kit = read('js/entities/voxkit.js');
  for (const name of ['class VoxKit', 'const kit =', 'function sculpt(', 'function sculptMats(', 'function sculptGeometry(', 'const BUILD =', 'function withBuild(', 'const voxDensity =', 'function paintShade(']) assert.ok(kit.includes(name), `voxkit.js has ${name}`);
  for (const m of ['blob(p, c, r, cell, col, o)', 'carve(p, cut)']) assert.ok(kit.includes(m), `VoxKit.${m}`);
  // the model modules: the index modules, champions, the serpent and every builder under entities/models
  const builders = (function walk(d) { return readdirSync(new URL('../' + d, import.meta.url), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.js') ? [`${d}/${e.name}`.slice('js/entities/'.length)] : [])); })('js/entities/models');
  assert.ok(builders.length >= 20, `${builders.length} builder modules`);
  for (const f of ['monsters.js', 'fodder.js', 'bossmodels.js', 'champions.js', 'serpent.js', ...builders]) {
    const src = read('js/entities/' + f);
    if (/\b(kit|sculpt)\(/.test(src)) assert.match(src, /from '(\.\/|\.\.\/)+voxkit\.js'/, `${f} takes the kit from voxkit.js`);
    // no second kit: the old free functions and kit internals are gone
    assert.doesNotMatch(src, /^(export )?(class VoxKit|function (kitOf|blob|carve|flushBlobs|cells|kitGeometry|kitMats|voxMesh)\b)/m, `${f} defines no kit of its own`);
    assert.doesNotMatch(src, /(?<![.\w])(blob|carve)\(\w+, /, `${f} calls K.blob / K.carve`);
  }
  // density lives with the kit; parts.js only passes it on
  assert.match(read('js/entities/parts.js'), /export \{ HERO_SCALE, BUILD, withBuild, densityFor, rigDensity, HERO_CUBE, voxDensity \} from '\.\/voxkit\.js'/);
});
