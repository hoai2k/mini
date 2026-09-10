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
//   (e) the boss centre sits over terrain,
//   (f) the exit is within 60 m of the last totem,
//   (g) every stronghold has a structure placement within 120 m whose
//       stand-in measures at least 30 m tall (fields) or 80 m (city,
//       mountains) -- the "castle" seen from the previous interlude -- and a
//       host of at least 6 shadows with group === id, all within r of the
//       centre (the boss arena gets the structure check only),
//   (h) consecutive strongholds along the spine (plus the boss arena) leave
//       at least 300 m of spine between their discs, and that gap holds at
//       least two placements with x < -40 and two with x > 40 (scenery on
//       both sides) and no host shadows -- the interlude,
//   (i) shadows outside every stronghold host stay in patrol pairs: no two
//       of them within 100 m unless they share a group,
//   (j) every host shadow that is not rooted has a perch: a structure top
//       within 110 m of its spawn standing at least 10 m above the terrain
//       (World.perchNear), so the host waits in plain view on the
//       stronghold's structures; and at least 70% of a stronghold's
//       climbers find one at least 20 m up.
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
const names = ['world', 'controller', 'district', 'route', 'scenery'];
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
const { measure } = await import(standIns);
// Kinds that keep their spawn instead of climbing to a perch (see combat3d SPECS).
const ROOTED = new Set(['seedSpitter', 'spireLeech']);
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
  const checked = { placements: 0, totemPairs: 0, signals: 0, shadows: 0, strongholds: 0, gaps: 0, patrols: 0, leaps: 0 };

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

  // (e) boss centre over terrain.
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

  // (g) strongholds: a tall structure within 120 m and a host within r.
  const strongholds = district.strongholds || [];
  const hostGroups = new Set([...strongholds.map((st) => st.id), 'boss']);
  const MIN_HEIGHT = { fields: 30, city: 80, mountains: 80 }[district.region] ?? 80;
  const structures = world.instances.filter((inst) => inst.standIn.startsWith('structure.'));
  const heightOf = (inst) => measure(inst.object).size.y;
  const tallestNear = (x, z) => {
    let best = null;
    for (const inst of structures) {
      if (dist2(inst.object.position.x, inst.object.position.z, x, z) > 120) continue;
      const h = heightOf(inst);
      if (!best || h > best.h) best = { id: inst.standIn, h };
    }
    return best;
  };
  const arenas = strongholds.map((st) => ({ ...st, host: true }));
  if (district.boss) arenas.push({ id: 'boss', name: 'boss arena', x: district.boss.x, z: district.boss.z, r: district.boss.r, host: false });
  for (const st of arenas) {
    checked.strongholds++;
    const tall = tallestNear(st.x, st.z);
    if (!tall || tall.h < MIN_HEIGHT) {
      problems.push(`(g) stronghold ${st.id}: tallest structure within 120m is ${tall ? `${tall.id} at ${tall.h.toFixed(1)}m` : 'none'} (< ${MIN_HEIGHT}m)`);
    }
    if (!st.host) continue;
    const host = district.shadows.filter((sh) => sh.group === st.id);
    if (host.length < 6) problems.push(`(g) stronghold ${st.id}: host of ${host.length} shadows (< 6)`);
    for (const sh of host) {
      const d = dist2(sh.x, sh.z, st.x, st.z);
      if (d > st.r) problems.push(`(g) stronghold ${st.id}: host shadow ${sh.id} is ${d.toFixed(1)}m from the centre (> r ${st.r})`);
    }
  }

  // (h) interludes between consecutive strongholds (and the boss arena).
  const alongSpine = [...arenas].sort((a, b) => b.z - a.z);
  for (let i = 1; i < alongSpine.length; i++) {
    checked.gaps++;
    const a = alongSpine[i - 1],
      b = alongSpine[i];
    const gapStart = a.z - a.r,
      gapEnd = b.z + b.r;
    const gap = gapStart - gapEnd;
    if (gap < 300) {
      problems.push(`(h) ${a.id} -> ${b.id}: only ${gap.toFixed(0)}m of spine between their discs (< 300m)`);
      continue;
    }
    const inGap = (z) => z < gapStart && z > gapEnd;
    const left = district.placements.filter((p) => inGap(p.z) && p.x < -40).length;
    const right = district.placements.filter((p) => inGap(p.z) && p.x > 40).length;
    if (left < 2 || right < 2) problems.push(`(h) ${a.id} -> ${b.id}: interlude has ${left} placements at x < -40 and ${right} at x > 40 (need 2 each)`);
    for (const sh of district.shadows) {
      if (hostGroups.has(sh.group) && inGap(sh.z)) problems.push(`(h) ${a.id} -> ${b.id}: host shadow ${sh.id} (${sh.group}) stands in the interlude`);
    }
  }

  // (i) patrols: non-host shadows within 100 m of each other share a group.
  const patrols = district.shadows.filter((sh) => !hostGroups.has(sh.group));
  for (let i = 0; i < patrols.length; i++) {
    checked.patrols++;
    for (let j = i + 1; j < patrols.length; j++) {
      const a = patrols[i],
        b = patrols[j];
      const d = dist2(a.x, a.z, b.x, b.z);
      if (d <= 100 && (!a.group || a.group !== b.group)) problems.push(`(i) patrol shadows ${a.id} and ${b.id} are ${d.toFixed(1)}m apart with different groups`);
    }
  }

  // (j) host perches: a structure top near every climber's spawn, and most
  // of each stronghold's climbers well up.
  for (const st of district.strongholds || []) {
    const climbers = district.shadows.filter((sh) => sh.group === st.id && !ROOTED.has(sh.kind));
    let high = 0;
    for (const sh of climbers) {
      checked.leaps++;
      const y = (sh.mode || 'r') === 'a' ? sh.y || 0 : world.heightAt(sh.x, sh.z) + (sh.y || 0);
      const top = world.perchNear(sh.x, sh.z, sh.y !== undefined ? y : undefined);
      if (!top) problems.push(`(j) host shadow ${sh.id} (${st.id}) at (${sh.x},${sh.z}) has no structure top within 110 m to perch on`);
      else if (top.y - world.heightAt(top.x, top.z) >= 20) high++;
    }
    if (climbers.length && high < Math.ceil(climbers.length * 0.7)) problems.push(`(j) stronghold ${st.id}: only ${high}/${climbers.length} of its climbers perch at least 20 m up (need 70%)`);
  }

  const status = problems.length === 0 ? 'PASS' : 'FAIL';
  console.log(
    `${status} ${district.name}: ${checked.placements} placements, ${totems.length} totems, ${checked.signals} signals/cages, ${checked.shadows} shadows, ${checked.strongholds} strongholds${district.boss ? ' (incl. boss)' : ''}, ${checked.gaps} interludes, ${checked.patrols} patrol shadows, ${checked.leaps} perched hosts`,
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
