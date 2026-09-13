// The counter and its page, checked without a browser or a network.
//
// This corner has an unusual failure mode: it can be broken and look fine. A
// counter that never fires and a site nobody visits produce the same empty
// dashboard, and a page that quietly lost its counter tag looks exactly like
// one nobody has found. So the assertions here are about the wiring being
// present and the two states being distinguishable — off says off, on points
// at the right endpoint — rather than about numbers, which only the live site
// has.
//
//   node sites/stats/smoke.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GOATCOUNTER_SITE,
  isValidSite,
  countEndpoint,
  dashboardUrl,
  SITES,
  GAMES,
} from './config.js';

const STATS = dirname(fileURLToPath(import.meta.url));
const SITES_DIR = join(STATS, '..');
const REPO = join(SITES_DIR, '..');
const TAG = '../stats/counter.js';

let failed = 0;
function ok(pass, label, detail = '') {
  if (!pass) failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${detail ? `   ${detail}` : ''}`);
}

// Every page of every site must carry the counter. A page added later without
// the tag is invisible in the dashboard and looks identical to one nobody
// visits, which is the whole failure this file exists to catch.
for (const site of SITES) {
  const dir = join(SITES_DIR, site.dir);
  if (!existsSync(join(dir, 'index.html'))) {
    ok(false, `${site.dir}: listed in SITES and present on disk`);
    continue;
  }
  const pages = readdirSync(dir).filter((f) => f.endsWith('.html'));
  ok(pages.length > 0, `${site.dir}: has at least one page`);
  for (const page of pages.sort()) {
    ok(readFileSync(join(dir, page), 'utf8').includes(TAG),
      `${site.dir}/${page}: loads the counter`);
  }
}

// Any site directory not in SITES would be counted but never listed on the
// stats page, so its visits would land in the overview with no tab to find
// them under.
const onDisk = readdirSync(SITES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !['images', 'music', 'stats'].includes(e.name))
  .filter((e) => existsSync(join(SITES_DIR, e.name, 'index.html')))
  .map((e) => e.name);
const listed = new Set(SITES.map((s) => s.dir));
for (const dir of onDisk) {
  ok(listed.has(dir), `${dir}: listed in SITES`);
}

// A game is a built app, so its entry page reaches the counter through an
// inline dynamic import the bundler does not follow. Two things can rot here:
// the import can go missing, and someone can "fix" it into a module src that
// Vite then bundles — which fails the build, or worse, succeeds and bakes in a
// second copy of the GoatCounter code.
for (const game of GAMES) {
  const entry = join(REPO, game.entry);
  ok(existsSync(entry), `${game.entry}: exists`);
  if (!existsSync(entry)) continue;
  const html = readFileSync(entry, 'utf8');
  // Allows the /* @vite-ignore */ comment between the paren and the string.
  ok(/import\([^)]*['"]\.\.\/sites\/stats\/counter\.js['"]/.test(html),
    `${game.entry}: imports the shared counter at run time`);
  ok(!/<script[^>]+src=[^>]*stats\/counter\.js/.test(html),
    `${game.entry}: does not use a module src the bundler would follow`);
  ok(/@vite-ignore/.test(html),
    `${game.entry}: keeps @vite-ignore, without which the bundler inlines the counter`);
  ok(!html.includes('GOATCOUNTER_SITE'),
    `${game.entry}: does not carry its own copy of the code`);
}

// The back office must not count itself, or it inflates the number it reports.
const statsHtml = readFileSync(join(STATS, 'index.html'), 'utf8');
ok(!statsHtml.includes(TAG), 'the stats page does not count itself');
ok(/name="robots" content="noindex"/.test(statsHtml), 'the stats page is noindex');

// Off must be recognisable as off, in words, on the page.
ok(GOATCOUNTER_SITE === '' || isValidSite(GOATCOUNTER_SITE),
  'GOATCOUNTER_SITE is empty or a valid code', `got "${GOATCOUNTER_SITE}"`);
if (!GOATCOUNTER_SITE) {
  ok(countEndpoint() === null, 'unconfigured: no count endpoint');
  ok(dashboardUrl() === null, 'unconfigured: no dashboard url');
  ok(/Not switched on yet/.test(statsHtml), 'unconfigured: the page says it is off');
  ok(/goatcounter\.com\/signup/.test(statsHtml), 'unconfigured: the page gives the steps');
} else {
  // Configured. The endpoint is what every counted page will actually send to,
  // so a typo here is a day of visits landing in someone else's dashboard or
  // nowhere at all.
  ok(countEndpoint() === `https://${GOATCOUNTER_SITE}.goatcounter.com/count`,
    `configured: counts to ${GOATCOUNTER_SITE}.goatcounter.com`);
  ok(dashboardUrl() === `https://${GOATCOUNTER_SITE}.goatcounter.com`,
    `configured: dashboard is ${GOATCOUNTER_SITE}.goatcounter.com`);
  // The off-state copy has to stay in the page even while it is on: it is what
  // the page falls back to if the code is ever cleared.
  ok(/Not switched on yet/.test(statsHtml), 'the off-state text is still there for when it is cleared');
}

// A configured code must reach the right endpoint, and a pasted URL must be
// refused rather than concatenated into something that 404s once per visit.
ok(countEndpoint('hoai-sites') === 'https://hoai-sites.goatcounter.com/count',
  'a code builds the count endpoint');
ok(dashboardUrl('hoai-sites') === 'https://hoai-sites.goatcounter.com',
  'a code builds the dashboard url');
const noisy = console.error;
console.error = () => {};
ok(countEndpoint('https://hoai-sites.goatcounter.com') === null,
  'a pasted URL is refused, not concatenated');
ok(countEndpoint('Hoai Sites') === null, 'a malformed code is refused');
console.error = noisy;

console.log(failed ? `\n${failed} failed` : '\nall good');
process.exit(failed ? 1 : 0);
