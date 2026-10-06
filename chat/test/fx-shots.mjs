// Screenshots face effects with Chromium's fake camera and a synthetic face.
//   node chat/test/fx-shots.mjs                 every effect, a few expressions
//   node chat/test/fx-shots.mjs puppy dragon    just these
// Pictures land in local/chat-shots/. Fails if an effect doesn't load or
// throws while drawing.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const { EFFECT_IDS } = await import('../effects/index.js');
const named = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ids = named.length ? named : EFFECT_IDS;
const ALL = { neutral: '', smile: '&smile=1', open: '&mouthOpen=1', pucker: '&pucker=1&held=1', brows: '&browUp=1', frown: '&frown=1', tilt: '&roll=0.35&smile=0.6', move: '&move=1', look: '&yaw=1.2&pitch=0.25', blink: '&blinkL=1&blinkR=1' };
// --only=neutral,move picks which expressions to shoot.
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',');
const EXPRESSIONS = Object.fromEntries(Object.entries(ALL).filter(([k]) => (only ? only.includes(k) : !['move', 'look', 'blink'].includes(k))));

const server = await serve(chatDir);
const browser = await launch();
let failed = 0;
for (const id of ids) {
  for (const [label, query] of Object.entries(EXPRESSIONS)) {
    const page = await browser.newPage({ viewport: { width: 700, height: 560 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/mediapipe|vision_wasm|face tracking|GPU|Failed to load resource|TensorFlow Lite/i.test(m.text())) errors.push(m.text()); });
    await page.goto(`${server.url}/test/fx.html?fx=${id}${query}`);
    await page.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
    const loaded = await page.evaluate(() => window.loadedEffects);
    if (!loaded.includes(id)) errors.push(`effect ${id} did not load`);
    await page.waitForTimeout(label === 'pucker' ? 2500 : 1200);
    await page.locator('canvas').first().screenshot({ path: `${outDir}${id}-${label}.png` });
    if (errors.length) {
      failed++;
      console.log(`FAIL ${id} ${label}: ${errors.join(' | ')}`);
    }
    await page.close();
  }
  console.log(`shot ${id}`);
}
await browser.close();
server.close();
if (failed) {
  console.log(`${failed} failures`);
  process.exit(1);
}
console.log(`ok: ${ids.length} effects in ${outDir}`);
