// Syntax-check every module and confirm the manifest matches the game's
// asset hooks. Run with `npm run check` (no dependencies needed).
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
for (const f of readdirSync(join(root, 'src'))) {
  try {
    execFileSync(process.execPath, ['--check', join(root, 'src', f)], { stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.error(`syntax error in src/${f}\n${e.stderr}`);
  }
}
const manifest = JSON.parse(readFileSync(join(root, 'assets', 'manifest.json'), 'utf8'));
const source = readdirSync(join(root, 'src')).map((f) => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
for (const a of manifest.assets.filter((x) => x.status === 'stand-in' || x.status === 'delivered')) {
  // Ids are used literally or as `prefix-${...}` templates (sky-*, card-*).
  const prefix = a.id.split('-')[0];
  if (!source.includes(`'${a.id}'`) && !source.includes(`\`${prefix}-\${`)) {
    failed++;
    console.error(`manifest id ${a.id} is not used by the game`);
  }
}
console.log(failed ? `${failed} problem(s)` : 'check ok');
process.exit(failed ? 1 : 0);
