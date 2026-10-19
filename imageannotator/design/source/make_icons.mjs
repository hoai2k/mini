// Render the home-screen icons (app/icons/icon-180, -192, -512.png) from the
// delivered icon art (app/icons/icon-1024.png) or, until it arrives, from the
// SVG stand-in (app/icon.svg). Uses Playwright's Chromium:
//   NODE_PATH=/opt/node-tools/node_modules node imageannotator/design/source/make_icons.mjs
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright'); // NODE_PATH finds it
const app = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app');
const master = join(app, 'icons', 'icon-1024.png');
const src = existsSync(master)
  ? `data:image/png;base64,${readFileSync(master).toString('base64')}`
  : `data:image/svg+xml;base64,${readFileSync(join(app, 'icon.svg')).toString('base64')}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage();
for (const size of [180, 192, 512]) {
  // Full bleed: the platform rounds the corners itself.
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:#1c1d22"><img src="${src}" style="display:block;width:${size}px;height:${size}px;${existsSync(master) ? '' : ''}"></body>`);
  await page.waitForFunction(() => document.images[0].complete);
  writeFileSync(join(app, 'icons', `icon-${size}.png`), await page.screenshot({ type: 'png' }));
  console.log(`wrote app/icons/icon-${size}.png`);
}
await browser.close();
