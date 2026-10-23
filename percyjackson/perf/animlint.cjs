// Animation lint: every model in every pose it plays in game (the hero poses
// for heroes and people; for monsters, champions and bosses also each of
// their own in-game attacks, run through the real Enemy and Boss code on a
// flat floor with a dummy to hit) sampled at 30 frames a second, flagging a
// body sunk through the floor, a part far from its rest place or a NaN
// transform, and a weapon pointing backward at the strike. The checks live in
// game/workbench/animlint.js (the model workbench shows the same results);
// this script runs them in headless Chromium and prints a table.
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/animlint.cjs [ids] [--hero-styles] [--all]
// ids: a comma list of model ids to check (default: all). --hero-styles also
// plays the hero poses a monster never uses (listed as info, never failing).
// --all prints the passing models too. Exits 1 if any check fails. Serves the
// repository on PERF_PORT (default 8765) if nothing is there yet. As a module
// (check.cjs): run({ browser, base, page?, only?, heroStyles?, all? })
// resolves to { ok, lines, summary, rows }.
const { openModulePage, loadModule, watchErrors, reseed, cli } = require('./lib.cjs');

// The in-page module (served beside the workbench as workbench/__animlint.js).
function moduleSource() {
  return `import { buildHeroModel, buildNpc, buildDummy, HERO_LOOKS } from '../js/entities/models.js';
import { buildMonsterModel, MONSTERS, MONSTER_IDS } from '../js/entities/monsters.js';
import { buildMortal, MORTAL_IDS } from '../js/entities/mortals.js';
import { BOSS_DEFS, BOSS_IDS } from '../js/entities/bosses.js';
import { buildPerson, PEOPLE_IDS } from '../js/entities/people.js';
import { CHAMPION_SHOWCASE, buildShowcase } from '../js/entities/champions.js';
import { lintModel, describe } from './animlint.js';
const SETS = {
  heroes: [Object.keys(HERO_LOOKS), (id) => buildHeroModel(id)],
  npcs: [['chiron', 'mr_d', 'dummy'], (id) => (id === 'dummy' ? buildDummy() : buildNpc(id))],
  monsters: [MONSTER_IDS, (id) => buildMonsterModel(MONSTERS[id].model)],
  bosses: [BOSS_IDS, (id) => BOSS_DEFS[id].build()],
  champions: [CHAMPION_SHOWCASE, (id) => buildShowcase(id)],
  mortals: [MORTAL_IDS, (id) => buildMortal(id)],
  people: [PEOPLE_IDS, (id) => buildPerson(id)],
};
export const list = (only) => { const out = []; for (const [group, [ids]] of Object.entries(SETS)) for (const id of ids) if (!only || only.includes(id)) out.push([group, id]); return out; };
export const lint = (group, id, heroStyles) => {
  globalThis.__perfReseed?.();   // (PERF_SEED: lib.cjs reseed)
  const t0 = performance.now();
  const r = lintModel({ group, id, build: () => SETS[group][1](id) }, { heroStyles });
  return { group, id, ms: Math.round(performance.now() - t0), poses: r.poses.length, failing: r.failing, problems: r.problems.map((p) => ({ ...p, text: describe(p) })) };
};
`;
}


function report(rows, all) {
  const lines = [];
  let fails = 0, models = 0;
  lines.push(['set'.padEnd(10), 'model'.padEnd(22), 'pose'.padEnd(26), 'check'.padEnd(9), 'frame'.padStart(5), '   s', ' detail'].join(' '));
  for (const r of rows) {
    if (r.failing) { fails += r.failing; models++; }
    if (!r.problems.length) { if (all) lines.push([r.group.padEnd(10), r.id.padEnd(22), `(${r.poses} poses)`.padEnd(26), 'ok'].join(' ')); continue; }
    for (const p of r.problems) lines.push([r.group.padEnd(10), r.id.padEnd(22), String(p.label).slice(0, 26).padEnd(26), (p.info ? 'info' : p.check).padEnd(9), String(p.frame).padStart(5), p.time.toFixed(2).padStart(5), ' ' + p.text].join(' '));
  }
  lines.push(`\n${rows.length} models checked, ${models} with problems, ${fails} problems (frames at 30 per second from the start of the pose, after 0.6 s at rest).`);
  const poses = rows.reduce((a, r) => a + r.poses, 0);
  return { ok: !fails, lines, rows, summary: { models: rows.length, poses, withProblems: models, problems: fails }, text: `${rows.length} models, ${poses} poses, ${fails} problems` };
}

async function run({ browser, base, page = null, only = null, heroStyles = false, all = false }) {
  const own = page ? null : await openModulePage(browser, base);
  page = page ?? own.page;
  const w = watchErrors(page, (e) => String(e.message).slice(0, 300));
  const errs = () => (own ? own.errors : w.errors);
  try {
    const err = await loadModule(page, base, 'animlint', moduleSource());
    if (err && !errs().length) errs().push(err);
    if (errs().length) return { ok: false, lines: [errs().join('\n')], rows: [], summary: { pageErrors: errs().length }, text: `page errors: ${errs()[0]}` };
    await reseed(page);
    const rows = await page.evaluate(([o, h]) => import('./__animlint.js').then((m) => m.list(o).map(([g, i]) => m.lint(g, i, h))), [only, heroStyles]);
    return report(rows, all);
  } finally { w.stop(); if (own) await own.page.close(); }
}

module.exports = { run, moduleSource, report };
if (require.main === module) {
  const args = process.argv.slice(2), flags = new Set(args.filter((a) => a.startsWith('--')));
  cli(run, { only: args.find((a) => !a.startsWith('--'))?.split(',') ?? null, heroStyles: flags.has('--hero-styles'), all: flags.has('--all') });
}
