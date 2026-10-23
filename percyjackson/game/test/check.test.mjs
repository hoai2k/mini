// Static checks for Half-Blood Quests (run in CI: `node --test test/*.test.mjs`
// in percyjackson/game). The game runs in the browser on Three.js from a CDN,
// so these don't execute it; they check what can break silently:
//   - every module parses,
//   - every relative import points at a file that exists and exports the
//     names imported from it,
//   - the chapter, hero, monster and boss ids agree across the data files.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MONSTER_IDS } from '../js/data/monsters.js';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(GAME, 'js');
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) files.push(p); } })(JS);
const src = Object.fromEntries(files.map((f) => [f, readFileSync(f, 'utf8')]));

test('every module parses', () => {
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${relative(GAME, f)}:\n${r.stderr}`);
  }
});

function exportsOf(code) {
  const names = new Set();
  for (const m of code.matchAll(/export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of code.matchAll(/export\s*\{([^}]*)\}/g)) for (const part of m[1].split(',')) { const n = part.trim().split(/\s+as\s+/).pop(); if (n) names.add(n); }
  return names;
}

test('relative imports resolve and their names are exported', () => {
  for (const f of files) {
    for (const m of src[f].matchAll(/import\s+([^'"]*?)\s*from\s*['"](\.[^'"]+)['"]/g)) {
      const target = resolve(dirname(f), m[2]);
      assert.ok(existsSync(target), `${relative(GAME, f)} imports missing ${m[2]}`);
      const spec = m[1];
      const named = spec.match(/\{([^}]*)\}/);
      if (!named) continue;
      const have = exportsOf(readFileSync(target, 'utf8'));
      for (const part of named[1].split(',')) {
        const n = part.trim().split(/\s+as\s+/)[0];
        if (n) assert.ok(have.has(n), `${relative(GAME, f)} imports { ${n} } from ${m[2]}, which doesn't export it`);
      }
    }
    for (const m of src[f].matchAll(/import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g)) assert.ok(existsSync(resolve(dirname(f), m[1])), `${relative(GAME, f)} dynamically imports missing ${m[1]}`);
    for (const m of src[f].matchAll(/^import\s+['"](\.[^'"]+)['"]/gm)) assert.ok(existsSync(resolve(dirname(f), m[1])), `${relative(GAME, f)} imports missing ${m[1]}`);
  }
});

const read = (p) => readFileSync(join(JS, p), 'utf8');
const ids = (code, re) => new Set([...code.matchAll(re)].map((m) => m[1]));

test('chapters refer to biomes, bosses and disguises that exist', () => {
  const chapters = read('story/chapters.js');
  const biomes = read('world/biomes.js');
  const bosses = read('entities/bosses.js');
  const mortalsFile = ['entities/mortals.js'].find((p) => existsSync(join(JS, p)));
  const ready = [...chapters.matchAll(/\{\s*id: '(\w+)'[^]*?ready: true/g)].map((m) => m[0]);
  assert.ok(ready.length >= 2, 'at least the first two chapters are playable');
  for (const block of ready) {
    const biome = block.match(/biome: '(\w+)'/)[1];
    assert.match(biomes, new RegExp(`\\b${biome}: \\{`), `biome ${biome} is defined`);
    const boss = block.match(/boss: '(\w+)'/)?.[1];
    if (boss) assert.match(bosses, new RegExp(`\\b${boss}: \\{`), `boss ${boss} is defined`);
    const disguises = block.match(/disguise: \[([^\]]*)\]/)?.[1].match(/'(\w+)'/g)?.map((s) => s.slice(1, -1)) ?? [];
    if (disguises.length && mortalsFile) for (const d of disguises) assert.match(read(mortalsFile), new RegExp(`\\b${d}\\b`), `mortal disguise ${d} exists`);
  }
});

test('every playable hero has a kit and a look', () => {
  const index = read('heroes/index.js');
  const heroes = [...index.matchAll(/^\s{2}(\w+): \{ name:[^\n]*$/gm)].filter((m) => !/soon: true/.test(m[0])).map((m) => m[1]);
  assert.ok(heroes.length >= 5, 'five playable heroes');
  const kits = new Set();
  for (const f of files.filter((f) => f.includes(`${'/heroes/'}`))) for (const m of src[f].matchAll(/registerKit\('(\w+)'/g)) kits.add(m[1]);
  const looks = read('entities/models.js');
  for (const h of heroes) {
    assert.ok(kits.has(h), `${h} registers a kit`);
    assert.match(looks, new RegExp(`\\b${h}: \\{`), `${h} has a look in models.js`);
  }
});

test('enemy tables only use defined monsters', () => {
  const tables = read('world/levelgen.js').match(/export const ENEMY_TABLES = \{([^]*?)\n\};/)?.[1] ?? '';
  for (const kind of ids(tables, /\['(\w+)',/g)) assert.ok(MONSTER_IDS.includes(kind), `monster ${kind} is defined in data/monsters.js`);
});
