// Shared harness for the 3D edition's node tests: transpiles the simulation
// modules once into a temp directory and hands back what a test needs. Each
// test file imports this instead of carrying its own copy of the loader.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = new URL('../../src/game3d/', import.meta.url).pathname;
const standIns = new URL('../../../3d/standins/src/index.js', import.meta.url).pathname;
const threeModule = require.resolve('three').replace(/three\.cjs$/, 'three.module.js');
const threeDir = path.dirname(path.dirname(threeModule)); // .../three/build/three.module.js -> .../three
const gltfLoader = path.join(threeDir, 'examples/jsm/loaders/GLTFLoader.js');
const meshoptDecoder = path.join(threeDir, 'examples/jsm/libs/meshopt_decoder.module.js');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hopper-harness3d-'));
const names = ['world', 'controller', 'camera', 'combat3d', 'district', 'district2', 'district3', 'route', 'scenery', 'trailprops', 'boss3d', 'commanders', 'leviathan3d', 'regent3d', 'gait', 'models3d', 'shadows/index', 'shadows/ground', 'shadows/rooted', 'shadows/flyers'];
fs.mkdirSync(path.join(temp, 'shadows'));
for (const name of names) {
  const raw = fs
    .readFileSync(source + name + '.ts', 'utf8')
    .replace(/from '(\.\.?\/[\w-/]+)'/g, (m, rel) => {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), rel));
      return names.includes(target) ? `from '${rel}.mjs'` : m;
    })
    .replace("'../../../3d/standins/src/index.js'", `'${standIns}'`)
    .replace("'../../../3d/standins/src/palette.js'", `'${new URL('../../../3d/standins/src/palette.js', import.meta.url).pathname}'`)
    .replace("'../../../3d/standins/src/textures.js'", `'${new URL('../../../3d/standins/src/textures.js', import.meta.url).pathname}'`)
    .replace("'three/examples/jsm/loaders/GLTFLoader.js'", `'${gltfLoader}'`)
    .replace("'three/examples/jsm/libs/meshopt_decoder.module.js'", `'${meshoptDecoder}'`)
    .replace(/from 'three'/g, `from '${threeModule}'`)
    // Bare JSON imports (design/delivery manifests, baked collision) need an
    // import attribute under plain Node ESM; `require` reads JSON natively.
    .replace(/import (\w+) from '(\.\.\/[^']+\.json)';/g, (m, ident, rel) => {
      const dir = path.posix.dirname(name);
      const base = dir === '.' ? source : source + dir + '/';
      return `const ${ident} = require('${base}${rel}');`;
    });
  const compiled = ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, verbatimModuleSyntax: false } }).outputText;
  // The JSON-require rewrite above needs a `require` in scope in this ESM file.
  const withRequire = compiled.includes('require(') ? `import { createRequire as __cr } from 'node:module';\nconst require = __cr(import.meta.url);\n${compiled}` : compiled;
  fs.writeFileSync(path.join(temp, name + '.mjs'), withRequire);
}

export const { World } = await import(path.join(temp, 'world.mjs'));
export const { stepHopper, createHopperState, predictLanding, MOVE } = await import(path.join(temp, 'controller.mjs'));
export const { createCamera, updateCamera, CAMERA } = await import(path.join(temp, 'camera.mjs'));
export const { Combat, SPECS, shadowBody, shadowBounce } = await import(path.join(temp, 'combat3d.mjs'));
export const { NightRook } = await import(path.join(temp, 'boss3d.mjs'));
export const { SmelterLeviathan, LEVIATHAN } = await import(path.join(temp, 'leviathan3d.mjs'));
export const { EclipseRegent, REGENT } = await import(path.join(temp, 'regent3d.mjs'));
export const { makeCommander } = await import(path.join(temp, 'commanders.mjs'));
export const districtModule = await import(path.join(temp, 'district.mjs'));
export const { sunseedFields, MISSIONS } = districtModule;
export const { BEHAVIOURS } = await import(path.join(temp, 'shadows/index.mjs'));

export const dt = 1 / 120;
/** A neutral movement intent. */
export const blank = { dx: 0, dz: 0, jumpPressed: false, jumpHeld: false, divePressed: false, diveHeld: false, chargeHeld: false, guardHeld: false };
/** A neutral aim for Combat.update. */
export const noAim = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 1, firing: false, guarding: false, kickPressed: false };
/** Callbacks that record what a fight did. */
export function recorder() {
  const log = { hurts: [], effects: [], sounds: [], bounces: [] };
  return {
    log,
    cb: {
      hurt: (damage, kx, ky, kz, fromX, fromZ) => {
        log.hurts.push({ damage, kx, ky, kz, fromX, fromZ });
        return false;
      },
      effect: (name, x, y, z) => log.effects.push({ name, x, y, z }),
      sound: (name) => log.sounds.push(name),
      bounce: (s) => log.bounces.push(s.id),
    },
  };
}
export function checker(label) {
  let checks = 0;
  return {
    check(name, cond, detail) {
      checks++;
      assert.ok(cond, `${label} · ${name}: ${detail}`);
    },
    done(summary) {
      console.log(`${label}: ${checks} checks passed${summary ? ` (${summary})` : ''}`);
    },
  };
}
/** Hopper standing on the terrain of a world at x, z. */
export function standing(world, x, z, yaw = Math.PI) {
  const h = createHopperState(x, world.groundAt(x, z, 1e6).y, z, yaw);
  h.groundY = h.y;
  return h;
}
