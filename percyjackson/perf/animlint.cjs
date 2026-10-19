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
// repository on PERF_PORT (default 8765) if nothing is there yet.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { findChrome } = require('./lib.cjs');

const PORT = +(process.env.PERF_PORT || 8765);
const ROOT = path.resolve(__dirname, '../..');
const GAME = `http://127.0.0.1:${PORT}/percyjackson/game/`;

function page() {
  const wb = fs.readFileSync(path.join(ROOT, 'percyjackson/game/workbench/models.html'), 'utf8');
  const map = wb.match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
  return `<!doctype html><html><head><meta charset="utf-8">${map}</head><body><script type="module">
import { buildHeroModel, buildNpc, buildDummy, HERO_LOOKS } from '../js/entities/models.js';
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
window.list = (only) => { const out = []; for (const [group, [ids]] of Object.entries(SETS)) for (const id of ids) if (!only || only.includes(id)) out.push([group, id]); return out; };
window.lint = (group, id, heroStyles) => {
  const t0 = performance.now();
  const r = lintModel({ group, id, build: () => SETS[group][1](id) }, { heroStyles });
  return { group, id, ms: Math.round(performance.now() - t0), poses: r.poses.length, failing: r.failing, problems: r.problems.map((p) => ({ ...p, text: describe(p) })) };
};
window.ready = true;
</script></body></html>`;
}

async function serve() {
  const up = async () => { try { return (await fetch(GAME)).ok; } catch { return false; } };
  if (await up()) return;
  spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', detached: true }).unref();
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250));
}

(async () => {
  const args = process.argv.slice(2), flags = new Set(args.filter((a) => a.startsWith('--')));
  const only = args.find((a) => !a.startsWith('--'))?.split(',') ?? null;
  await serve();
  const browser = await chromium.launch({ executablePath: findChrome(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await browser.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e.message).slice(0, 300)));
  const url = GAME + 'workbench/__animlint.html';
  await pg.route(url, (r) => r.fulfill({ contentType: 'text/html', body: page() }));
  await pg.goto(url);
  await pg.waitForFunction(() => window.ready || false, null, { timeout: 180000 }).catch(() => {});
  if (errors.length) { console.log(errors.join('\n')); await browser.close(); process.exit(1); }
  const list = await pg.evaluate((o) => window.list(o), only);
  const rows = [];
  for (const [group, id] of list) rows.push(await pg.evaluate(([g, i, h]) => window.lint(g, i, h), [group, id, flags.has('--hero-styles')]));
  await browser.close();
  let fails = 0, models = 0;
  console.log(['set'.padEnd(10), 'model'.padEnd(22), 'pose'.padEnd(26), 'check'.padEnd(9), 'frame'.padStart(5), '   s', ' detail'].join(' '));
  for (const r of rows) {
    if (r.failing) { fails += r.failing; models++; }
    if (!r.problems.length) { if (flags.has('--all')) console.log([r.group.padEnd(10), r.id.padEnd(22), `(${r.poses} poses)`.padEnd(26), 'ok'].join(' ')); continue; }
    for (const p of r.problems) console.log([r.group.padEnd(10), r.id.padEnd(22), String(p.label).slice(0, 26).padEnd(26), (p.info ? 'info' : p.check).padEnd(9), String(p.frame).padStart(5), p.time.toFixed(2).padStart(5), ' ' + p.text].join(' '));
  }
  console.log(`\n${rows.length} models checked, ${models} with problems, ${fails} problems (frames at 30 per second from the start of the pose, after 0.6 s at rest).`);
  process.exit(fails ? 1 : 0);
})();
