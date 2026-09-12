// The preload contract: every asset a district paints must be on the list the
// loading screen waits for, every path must exist, and idle prefetching must
// retarget when the player looks at another episode.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = new URL('../../src/', import.meta.url).pathname;
const standIns = new URL('../../../3d/standins/src/index.js', import.meta.url).pathname;
const palette = new URL('../../../3d/standins/src/palette.js', import.meta.url).pathname;
const threeModule = require.resolve('three').replace(/three\.cjs$/, 'three.module.js');
const textureRoot = new URL('../../../3d/textures/', import.meta.url).pathname;

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hopper-preload-'));
const names = ['district', 'route', 'scenery', 'world', 'textures3d', 'preload', 'models3d', 'trail', 'combat3d', 'controller', 'camera', 'boss3d'];
for (const name of names) {
  const raw = fs
    .readFileSync(source + 'game3d/' + name + '.ts', 'utf8')
    .replace(/from '\.\/([\w-]+)'/g, (m, n) => (names.includes(n) ? `from './${n}.mjs'` : m))
    .replace("'../../../3d/standins/src/index.js'", `'${standIns}'`)
    .replace("'../../../3d/standins/src/palette.js'", `'${palette}'`)
    .replace("'../../../3d/standins/src/textures.js'", `'${new URL('../../../3d/standins/src/textures.js', import.meta.url).pathname}'`)
    .replace(/from 'three'/g, `from '${threeModule}'`);
  fs.writeFileSync(path.join(temp, name + '.mjs'), ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, verbatimModuleSyntax: false } }).outputText);
}

const { MISSIONS } = await import(path.join(temp, 'district.mjs'));
const { districtJobs, jobsFor, missionJobs, preloadDistrict, Prefetcher } = await import(path.join(temp, 'preload.mjs'));
const { FLOOR_SURFACE, horizonCards, OPTS } = await import(path.join(temp, 'textures3d.mjs'));

let checks = 0;
const check = (ok, what) => {
  assert.ok(ok, what);
  checks++;
};

// 1. Every job names a file that is actually in the texture pack.
for (let mission = 0; mission < MISSIONS.length; mission++)
  for (let index = 0; index < MISSIONS[mission].length; index++) {
    const district = MISSIONS[mission][index]();
    const jobs = jobsFor(mission, index);
    for (const job of jobs)
      check(fs.existsSync(path.join(textureRoot, job.path)), `${district.name}: ${job.path} exists`);

    // 2. Each family a district paints is covered.
    const paths = jobs.map((j) => j.path);
    const region = district.region;
    check(paths.includes(`sky/${region}-preview.jpg`), `${district.name}: sky queued`);
    check(paths.includes(`trim/${region}.png`), `${district.name}: trim queued`);
    check(paths.includes(`trim/${region}-emissive.png`), `${district.name}: trim emissive queued`);
    for (const f of ['ground', 'cliff', 'path'])
      check(paths.includes(`terrain/${region}/${f}.png`), `${district.name}: terrain ${f} queued`);
    check(
      !paths.some((p) => p.startsWith('ui/landing-guide')),
      `${district.name}: the retired landing guide is not fetched`,
    );
    const surface = FLOOR_SURFACE[region];
    check(
      !!surface === paths.some((p) => p.startsWith('surface/')),
      `${district.name}: floor surface queued only where the region has one`,
    );
    // 3. Horizon cards match the set the build draws, landmark gap included.
    const angle = Math.atan2(district.landmark.z, district.landmark.x);
    const cards = horizonCards(region, angle);
    const queued = paths.filter((p) => p.startsWith('horizon/'));
    check(queued.length === cards.length, `${district.name}: ${cards.length} horizon cards queued (${queued.length})`);
    for (const { ring, n } of cards)
      check(queued.includes(`horizon/${region}-${ring}-${n}.png`), `${district.name}: horizon ${ring}-${n} queued`);
    // 4. Shared sheets ride along with every district.
    for (const shared of ['effects/hopper.png', 'ui/props.png', 'effects/laser-impact.png', 'creatures/shadow-hide.png'])
      check(paths.includes(shared), `${district.name}: shared ${shared} queued`);
    // 5. Options come from the shared table, so a warmed entry is the one the
    //    build asks for rather than a second copy under a different key.
    const families = new Set(Object.values(OPTS));
    for (const job of jobs) check(families.has(job.opts), `${district.name}: ${job.path} uses a shared option set`);
  }

// 6. No duplicates: the progress bar would stall on a double-counted file.
for (let mission = 0; mission < MISSIONS.length; mission++) {
  const jobs = missionJobs(mission);
  const keys = jobs.map((j) => `${j.path}|${JSON.stringify(j.opts)}`);
  check(new Set(keys).size === keys.length, `episode ${mission + 1}: no duplicate jobs`);
  const districts = MISSIONS[mission].length;
  check(jobs.length > districts * 10, `episode ${mission + 1}: every district contributes (${jobs.length} jobs)`);
}

// 7. missionJobs starts at the district the player would enter.
const fromSecond = missionJobs(0, 1).map((j) => j.path);
const second = districtJobs(MISSIONS[0][1]()).map((j) => j.path);
const first = districtJobs(MISSIONS[0][0]()).map((j) => j.path);
const firstOfSecond = fromSecond.findIndex((p) => second.includes(p) && !first.includes(p));
const firstOfFirst = fromSecond.findIndex((p) => first.includes(p) && !second.includes(p));
check(firstOfSecond < firstOfFirst, 'a mid-episode resume warms its own district first');

// 8. Progress runs 0..1 and every job settles, even though no texture decodes
//    in Node: a missing or undecodable painting must not hang the loading screen.
const seen = [];
await preloadDistrict(0, 0, (f) => seen.push(f));
check(seen[0] === 0, 'progress starts at 0');
check(seen[seen.length - 1] === 1, 'progress ends at 1');
check(
  seen.every((v, i) => i === 0 || v >= seen[i - 1]),
  'progress never goes backwards',
);

// 9. The prefetcher retargets and stops.
const p = new Prefetcher();
p.retarget(0);
check(!p.idle, 'prefetching starts on retarget');
p.retarget(2);
p.stop();
check(p.idle, 'stop ends prefetching');
p.retarget(1);
check(p.idle, 'a stopped prefetcher stays stopped');

fs.rmSync(temp, { recursive: true, force: true });
console.log(`preload: ${checks} checks passed (asset coverage for ${MISSIONS.flat().length} districts, shared option sets, progress, prefetch retargeting)`);
