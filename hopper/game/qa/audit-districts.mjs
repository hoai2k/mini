// Node audit for the 3D edition's mission-one districts. Transpiles
// district.ts, world.ts and controller.ts (same approach as
// qa/tests/engine3d.mjs) and, for each district in MISSIONS[0], builds the
// World and checks:
//   (a) every placement's ground height is finite, and no structure's base
//       (mode 'r' only) sits more than 3 m below or above the terrain,
//   (b) consecutive checkpoint totems (sorted by distance from start) are
//       reachable: horizontal distance under 400 m, and the later totem's
//       ground height is no more than 60 m above the earlier one, unless a
//       springPad or thermalVent placement lies within 120 m of the earlier
//       totem,
//   (c) every signal (prop.signalBeacon) and cage (district.cages) sits
//       within 250 m of some checkpoint totem,
//   (d) every shadow spawn with mode 'r' has ground under it, and every
//       flyer (mode 'a') is above the terrain,
//   (e) every gate and the boss centre sit over terrain,
//   (f) the exit is within 60 m of the last totem.
// Prints one PASS/FAIL line per district with counts, and exits 1 on any
// failure. Also run `node qa/tests/engine3d.mjs` separately to confirm
// Sunseed Fields (and the shared simulation modules) still pass.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const source = new URL('../src/game3d/', import.meta.url).pathname;
const standIns = new URL('../../3d/standins/src/index.js', import.meta.url).pathname;
// three ships an ESM build alongside the CJS one require.resolve('three')
// hands back (the package's "require" export condition); swap to it so the
// transpiled modules' `import ... from 'three'` resolves under node.
const threeModule = require.resolve('three').replace(/three\.cjs$/, 'three.module.js');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hopper-audit-districts-'));
const names = ['world', 'controller', 'district'];
for (const name of names) {
  const raw = fs
    .readFileSync(source + name + '.ts', 'utf8')
    .replace(/from '\.\/([\w-]+)'/g, (m, n) => (names.includes(n) ? `from './${n}.mjs'` : m))
    .replace("'../../../3d/standins/src/index.js'", `'${standIns}'`)
    .replace(/from 'three'/g, `from '${threeModule}'`);
  fs.writeFileSync(
    path.join(temp, name + '.mjs'),
    ts.transpileModule(raw, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        verbatimModuleSyntax: false,
      },
    }).outputText,
  );
}

const { World } = await import(path.join(temp, 'world.mjs'));
const { MISSIONS } = await import(path.join(temp, 'district.mjs'));

const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/** Ground height under a placement the same way World.baseY computes it,
 * without needing a live Instance (so it also covers cages, which are not
 * placed as World instances). */
function groundHeight(world, x, z, y, mode, isStructure) {
  if (mode === 'a') return y || 0;
  const h = world.heightAt(x, z);
  return h + (y || 0) - (isStructure && !y ? 1.5 : 0);
}

let anyFail = false;
const districts = MISSIONS[0];

for (const make of districts) {
  const district = make();
  const world = new World(district);
  const problems = [];
  const checked = { placements: 0, totemPairs: 0, signals: 0, shadows: 0, gates: 0 };

  // (a) placement ground heights.
  for (const p of district.placements) {
    checked.placements++;
    const isStructure = p.id.startsWith('structure.');
    const mode = p.mode || 'r';
    const h = world.heightAt(p.x, p.z);
    if (!Number.isFinite(h)) {
      problems.push(`(a) ${p.id} at (${p.x},${p.z}): terrain height is not finite`);
      continue;
    }
    if (mode === 'r' && isStructure) {
      const base = groundHeight(world, p.x, p.z, p.y, mode, true);
      const diff = base - h;
      if (diff < -3 || diff > 3) {
        problems.push(`(a) ${p.id} at (${p.x},${p.z}): base ${base.toFixed(2)} vs terrain ${h.toFixed(2)} (diff ${diff.toFixed(2)})`);
      }
    }
  }

  // (b) checkpoint totem chain.
  const totems = district.placements
    .filter((p) => p.id === 'prop.checkpointTotem')
    .map((p) => ({ x: p.x, z: p.z, y: groundHeight(world, p.x, p.z, p.y, p.mode || 'r', false) }))
    .sort((a, b) => dist2(district.start.x, district.start.z, a.x, a.z) - dist2(district.start.x, district.start.z, b.x, b.z));
  const lifts = district.placements.filter((p) => p.id === 'prop.springPad' || p.id === 'prop.thermalVent');
  for (let i = 1; i < totems.length; i++) {
    checked.totemPairs++;
    const prev = totems[i - 1],
      cur = totems[i];
    const horiz = dist2(prev.x, prev.z, cur.x, cur.z);
    if (horiz > 400) problems.push(`(b) totem ${i - 1}->${i}: horizontal distance ${horiz.toFixed(1)}m > 400m`);
    const rise = cur.y - prev.y;
    if (rise > 60) {
      const helped = lifts.some((l) => dist2(l.x, l.z, prev.x, prev.z) <= 120);
      if (!helped) problems.push(`(b) totem ${i - 1}->${i}: rises ${rise.toFixed(1)}m with no spring/thermal within 120m of the earlier totem`);
    }
  }

  // (c) signals and cages near a totem.
  const signals = district.placements.filter((p) => p.id === 'prop.signalBeacon');
  for (const s of signals) {
    checked.signals++;
    const near = totems.some((t) => dist2(t.x, t.z, s.x, s.z) <= 250);
    if (!near) problems.push(`(c) signal at (${s.x},${s.z}): no totem within 250m`);
  }
  for (const c of district.cages || []) {
    checked.signals++;
    const near = totems.some((t) => dist2(t.x, t.z, c.x, c.z) <= 250);
    if (!near) problems.push(`(c) cage ${c.id} at (${c.x},${c.z}): no totem within 250m`);
  }

  // (d) shadow ground/flyer heights.
  const FLYERS = new Set(['windowRay', 'spireLeech', 'riftCondor']);
  for (const s of district.shadows) {
    checked.shadows++;
    const mode = s.mode || 'r';
    const h = world.heightAt(s.x, s.z);
    if (!Number.isFinite(h)) {
      problems.push(`(d) shadow ${s.id}: terrain height is not finite`);
      continue;
    }
    if (mode === 'r') {
      // Ground shadows: 'ground under it' means the terrain function
      // resolves (already checked above) and the offset isn't burying the
      // shadow below it. Ground shadows often perch on a structure's
      // landing well above raw terrain (a terrace tier, a shelf), so no
      // upper bound is enforced here -- that is covered by (a) for the
      // structure itself.
      if ((s.y || 0) < -3) problems.push(`(d) shadow ${s.id} (mode r) at y=${s.y} is buried below terrain ${h.toFixed(2)}`);
    } else if (FLYERS.has(s.kind)) {
      const y = s.y || 0;
      if (y <= h) problems.push(`(d) flyer ${s.id} (mode a) at y=${y} is not above terrain ${h.toFixed(2)}`);
    }
  }

  // (e) gates and boss centre over terrain.
  for (const g of district.gates || []) {
    checked.gates++;
    const h = world.heightAt(g.x, g.z);
    if (!Number.isFinite(h)) problems.push(`(e) gate ${g.id}: terrain height is not finite`);
  }
  if (district.boss) {
    const h = world.heightAt(district.boss.x, district.boss.z);
    if (!Number.isFinite(h)) problems.push(`(e) boss ${district.boss.kind}: terrain height is not finite`);
  }

  // (f) exit near the last totem.
  const last = totems[totems.length - 1];
  if (last) {
    const d = dist2(last.x, last.z, district.exit.x, district.exit.z);
    if (d > 60) problems.push(`(f) exit at (${district.exit.x},${district.exit.z}) is ${d.toFixed(1)}m from the last totem (>60m)`);
  } else {
    problems.push('(f) no checkpoint totems found');
  }

  const status = problems.length === 0 ? 'PASS' : 'FAIL';
  console.log(
    `${status} ${district.name}: ${checked.placements} placements, ${totems.length} totems, ${checked.signals} signals/cages, ${checked.shadows} shadows, ${checked.gates} gates${district.boss ? ' + boss' : ''}`,
  );
  for (const p of problems) console.log(`  - ${p}`);
  if (problems.length) anyFail = true;
}

if (anyFail) {
  console.log('audit-districts: FAILED');
  process.exit(1);
} else {
  console.log('audit-districts: all districts passed');
}
