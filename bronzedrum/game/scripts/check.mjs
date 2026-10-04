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
for (const a of manifest.assets.filter((x) => x.runtime !== false && (x.status === 'stand-in' || x.status === 'delivered'))) {
  // Ids are used literally or as `prefix-${...}` templates (sky-*, card-*).
  const prefix = a.id.split('-')[0];
  if (!source.includes(`'${a.id}'`) && !source.includes(`\`${prefix}-\${`)) {
    failed++;
    console.error(`manifest id ${a.id} is not used by the game`);
  }
}
// Every sound the audio manifest lists must exist, and every sample the code
// plays by name must be one build_audio.py defines (generated or not).
import { existsSync } from 'node:fs';
const audio = JSON.parse(readFileSync(join(root, 'assets', 'audio.json'), 'utf8'));
for (const [id, e] of Object.entries(audio.sfx)) {
  for (const f of e.files) {
    if (!existsSync(join(root, 'assets', f))) {
      failed++;
      console.error(`audio.json: ${id} lists missing ${f}`);
    }
  }
}
const defined = readFileSync(join(root, '..', 'design', 'source', 'build_audio.py'), 'utf8');
for (const m of source.matchAll(/(?:play|has|startAmbience)\('([a-z-]+)'/g)) {
  if (!defined.includes(`"${m[1]}"`)) {
    failed++;
    console.error(`code plays '${m[1]}', which build_audio.py does not define`);
  }
}
for (const m of readFileSync(join(root, 'src', 'stages.js'), 'utf8').matchAll(/ambience: '([a-z-]+)'/g)) {
  if (!defined.includes(`"${m[1]}"`)) {
    failed++;
    console.error(`stage ambience '${m[1]}' is not defined in build_audio.py`);
  }
}
console.log(failed ? `${failed} problem(s)` : 'check ok');
process.exit(failed ? 1 : 0);
