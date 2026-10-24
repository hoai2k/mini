// Render the home-screen icons (app/icons/icon-180, -192, -512.png) from the
// delivered icon art (app/icons/icon-1024.png), and the browser-tab icons
// (app/icons/favicon-32.png and favicon.ico, holding 16, 32 and 48 px) from the
// delivered favicon art (app/icons/favicon-256.png). Until either arrives it is
// made from the SVG stand-in (app/icon.svg). Uses Playwright's Chromium:
//   NODE_PATH=/opt/node-tools/node_modules node meditation/design/source/make_icons.mjs
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright'); // NODE_PATH finds it
const app = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app');
const svg = `data:image/svg+xml;base64,${readFileSync(join(app, 'icon.svg')).toString('base64')}`;
const art = (file) => (existsSync(join(app, 'icons', file)) ? `data:image/png;base64,${readFileSync(join(app, 'icons', file)).toString('base64')}` : svg);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage();
async function render(src, size, background) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:${background}"><img src="${src}" style="display:block;width:${size}px;height:${size}px"></body>`);
  await page.waitForFunction(() => document.images[0].complete);
  return page.screenshot({ type: 'png', omitBackground: background === 'transparent' });
}

// Full bleed: the platform rounds the corners itself.
for (const size of [180, 192, 512]) {
  writeFileSync(join(app, 'icons', `icon-${size}.png`), await render(art('icon-1024.png'), size, '#141826'));
  console.log(`wrote app/icons/icon-${size}.png`);
}

const fav = art('favicon-256.png');
const favBg = fav === svg ? '#141826' : 'transparent';
const pngs = [];
for (const size of [16, 32, 48]) pngs.push([size, await render(fav, size, favBg)]);
writeFileSync(join(app, 'icons', 'favicon-32.png'), pngs[1][1]);
console.log('wrote app/icons/favicon-32.png');

// An .ico holding PNG images: a 6-byte header, a 16-byte entry per image, then the images.
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach(([size, png], i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(size, at);
  header.writeUInt8(size, at + 1);
  header.writeUInt16LE(1, at + 4); // colour planes
  header.writeUInt16LE(32, at + 6); // bits per pixel
  header.writeUInt32LE(png.length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += png.length;
});
writeFileSync(join(app, 'icons', 'favicon.ico'), Buffer.concat([header, ...pngs.map(([, png]) => png)]));
console.log('wrote app/icons/favicon.ico');
await browser.close();
