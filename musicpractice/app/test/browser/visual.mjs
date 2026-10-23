// Pictures of every screen and sheet (the still ones) in every theme and
// mode, to show that a change to the styles changes nothing it shouldn't: a
// refactor of styles.css should leave every picture the same.
//
//   node test/browser/visual.mjs --save <dir>       before the change
//   node test/browser/visual.mjs --compare <dir>    after: what differs
//
// Animation and transitions are switched off, the caret hidden and fixed
// backgrounds made to scroll, so the same page draws the same picture. Pictures that differ are saved beside
// the originals (<name>.after.png) to look at.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { start, THEMES, checks } from './lib.mjs';
import { VIEWS } from './readability.mjs';

// The running views draw a clock and moving parts: not still.
const STILL = VIEWS.filter(([name]) => !/playing|running/.test(name));
const NOISE = 4; // pixels
// (Backgrounds fixed to the window shift by a pixel between pictures of an element: here they scroll with the page.)
const FREEZE = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; background-attachment: scroll !important; }';

/** Everything the page is waiting for: its fonts and its pictures. */
const settled = (p) => p.evaluate(async () => {
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => null))); // every face declared, not only those asked for yet
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))));
  // Screens that size themselves to what they hold (the metronome's picture) measure again, now everything is in.
  dispatchEvent(new Event('resize'));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
});
/**
 * A picture of `locator` once it holds still: shots a moment apart until two
 * agree. Canvases (the waveform, takes) and the record button, which answer
 * the microphone, are masked.
 */
async function stillShot(p, locator) {
  const mask = [p.locator('canvas'), p.locator('#rec-toggle')];
  let last = await locator.screenshot({ mask });
  for (let k = 0; k < 6; k++) {
    await p.waitForTimeout(250);
    const next = await locator.screenshot({ mask });
    if (next.equals(last)) return next;
    last = next;
  }
  return last;
}

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const save = arg('--save');
const compare = arg('--compare');
const only = arg('--themes')?.split(',');
if (!save && !compare) { console.log('node test/browser/visual.mjs --save <dir> | --compare <dir>'); process.exit(2); }
const dir = save || compare;
mkdirSync(dir, { recursive: true });

const env = await start();
const c = checks('visual');
const one = async (theme, mode) => {
  const p = await env.page({ theme, mode, height: 1400 });
  for (const [name, at, open, id] of STILL) {
    const file = join(dir, `${theme}-${mode}-${name.replace(/\s+/g, '-')}.png`);
    try {
      await p.goto(env.base + at);
      await p.reload();
      await p.addStyleTag({ content: FREEZE });
      await settled(p);
      await p.waitForTimeout(300);
      if (open) await open(p, env.base);
      await settled(p);
      const shot = await stillShot(p, p.locator(`#${id}`));
      if (save) { writeFileSync(file, shot); continue; }
      if (!existsSync(file)) { c.ok(false, `${theme} ${mode}, ${name}: no saved picture`); continue; }
      const before = readFileSync(file);
      if (before.equals(shot)) { c.ok(true); continue; }
      // Not the same bytes: count the pixels that differ (in the page, on a canvas).
      const n = await p.evaluate(async ([a, b]) => {
        const load = (b64) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${b64}`; });
        const [x, y] = await Promise.all([load(a), load(b)]);
        if (x.width !== y.width || x.height !== y.height) return -1;
        const px = (img) => { const cv = new OffscreenCanvas(img.width, img.height); const g = cv.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
        const da = px(x), db = px(y);
        let d = 0;
        for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 6) d++;
        return d;
      }, [before.toString('base64'), shot.toString('base64')]);
      // A few stray pixels are the browser's antialiasing; a real change is more (a one-pixel border is a whole line).
      const same = n >= 0 && n <= NOISE;
      if (!same) writeFileSync(file.replace(/\.png$/, '.after.png'), shot);
      c.ok(same, `${theme} ${mode}, ${name}: ${n < 0 ? 'a different size' : `${n} pixels differ`}`);
    } catch (e) {
      c.ok(false, `${theme} ${mode}, ${name}: ${e.message.split('\n')[0]}`);
    }
  }
  await p.close();
};
const jobs = (only || THEMES).flatMap((t) => ['light', 'dark'].map((m) => () => one(t, m)));
await Promise.all(Array.from({ length: 4 }, async () => { while (jobs.length) await jobs.shift()(); }));
await env.stop();
if (save) console.log(`saved ${STILL.length} pictures a theme and mode to ${dir}`);
else process.exitCode = (await c.done()) ? 1 : 0;
