// The collision under a delivered structure has to match the surface it
// draws: floor you can see is floor you can stand on.
//
// The measurement itself needs the GLB raycast in a browser, so it lives in
// `hopper/3d/models/source/surface-audit.mjs` and writes
// `models/surface-audit.json`. This holds that report to a contract, so a
// re-bake that starts losing surfaces again fails the build rather than
// waiting to be walked into.
//
// Re-run the audit after any re-bake:
//   cd hopper/3d/models && node source/surface-audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checker } from './harness3d.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODELS = path.resolve(HERE, '../../../3d/models');
const c = checker('surface-audit');

const reportPath = path.join(MODELS, 'surface-audit.json');
c.check('the surface audit has been run', fs.existsSync(reportPath), reportPath);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const delivered = JSON.parse(fs.readFileSync(path.join(MODELS, 'manifest.json'), 'utf8')).models.filter((m) => m.category === 'structure' && m.status === 'delivered');
c.check('every delivered structure is in it', report.models.length === delivered.length, `${report.models.length} of ${delivered.length}`);
c.check('and it measured a real number of columns', report.columns > 10000, report.columns);

// The headline: across every structure, what fraction of the drawn surface
// has no collision within the tolerance. It was 69% on the worst four models
// before thin plates were given a body in the bake; it is now 1.4%.
c.check('drawn surface is collidable overall (<= 3% falls through)', report.frac <= 0.03, `${(100 * report.frac).toFixed(1)}%`);

// No single structure may be badly hollow. What is left is genuinely open
// volume -- a chimney's flue, an exhaust shaft, the gap behind a facade --
// rather than a deck or a roof that went missing.
const worst = report.models[0];
c.check('and no one structure is mostly hollow (<= 20%)', worst.frac <= 0.2, `${worst.request} ${worst.name} at ${(100 * worst.frac).toFixed(1)}%`);
const bad = report.models.filter((m) => m.frac > 0.1);
c.check('at most a couple sit over 10%', bad.length <= 3, bad.map((m) => `${m.request} ${(100 * m.frac).toFixed(0)}%`).join(', ') || 'none');

// Every structure has to carry collision at all: a model that bakes to
// nothing would pass a fraction test by having no drawn columns either.
for (const m of report.models)
  if (m.columns > 20) c.check(`${m.request} carries baked boxes`, m.boxes >= 5, `${m.name}: ${m.boxes}`);

c.done();
