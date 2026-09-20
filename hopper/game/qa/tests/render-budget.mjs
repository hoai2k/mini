/** The 2D picture is fill-rate bound: a frame costs what the canvas has pixels,
 * near enough, and a 2x ratio on a big screen asks for four times the paint of
 * a 1x one. The renderer keeps a pixel budget and sizes its backing store to
 * it, spending it down when frames run slow. This checks the arithmetic of that
 * - that the store never exceeds the budget, that slow frames shrink it, that a
 * fast run buys it back, and that a small screen is never upscaled. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url),
  ts = require('typescript');
const temp = fs.mkdtempSync('/tmp/hopper-budget-');
const source = new URL('../../src/game/', import.meta.url).pathname;
for (const name of ['levels', 'hopper-animation', 'renderer']) {
  const raw = fs
    .readFileSync(source + name + '.ts', 'utf8')
    .replace(/from '\.\/(levels|hopper-animation)'/g, "from './$1.mjs'");
  fs.writeFileSync(
    temp + '/' + name + '.mjs',
    ts.transpileModule(raw, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    }).outputText,
  );
}
const { Renderer } = await import(temp + '/renderer.mjs');

/** Enough of a canvas for the renderer to size, and nothing more. */
function stub(cssWidth, cssHeight, dpr) {
  globalThis.window = { devicePixelRatio: dpr };
  const canvas = {
    width: 0,
    height: 0,
    getBoundingClientRect: () => ({ width: cssWidth, height: cssHeight }),
    getContext: () => ({}),
  };
  return { canvas, r: new Renderer(canvas, {}) };
}
/** Frames arriving every `gap` ms, long enough for the budget to settle. */
function run(r, gap, frames) {
  let now = 1000;
  for (let n = 0; n < frames; n++) {
    now += gap;
    r.pace(now);
    r.resize();
  }
}

// A 1080p screen at 2x asks for 8.3 million pixels. Even before any frame has
// been timed the renderer refuses to paint that many.
{
  const { canvas, r } = stub(1920, 1080, 2);
  r.resize();
  const pixels = canvas.width * canvas.height;
  assert.ok(
    pixels <= 3.2e6,
    `first frame should be inside the budget, got ${pixels}`,
  );
  assert.ok(pixels > 2.5e6, `first frame should not be timid, got ${pixels}`);
}

// Frames taking 40ms are a machine that cannot keep up: the store shrinks, but
// not below three fifths of the screen's own grid.
{
  const { canvas, r } = stub(1920, 1080, 2);
  r.resize();
  const before = canvas.width * canvas.height;
  run(r, 40, 400);
  const after = canvas.width * canvas.height;
  assert.ok(after < before * 0.8, `slow frames should shrink ${before}->${after}`);
  assert.ok(
    canvas.width >= Math.round(1920 * 0.6),
    `never below three fifths of the screen, got ${canvas.width}`,
  );
  // And a long fast run afterwards buys the resolution back.
  run(r, 10, 600);
  assert.ok(
    canvas.width * canvas.height >= before,
    `fast frames should restore ${canvas.width * canvas.height} vs ${before}`,
  );
}

// A small screen is inside the budget at full ratio, so nothing is given up.
{
  const { canvas, r } = stub(1280, 720, 1);
  run(r, 10, 200);
  assert.equal(canvas.width, 1280);
  assert.equal(canvas.height, 720);
}

// A pause - a tab in the background, a menu - is not evidence of a slow
// machine, so it must not spend the budget down.
{
  const { canvas, r } = stub(1920, 1080, 2);
  r.resize();
  const before = canvas.width * canvas.height;
  run(r, 10, 200);
  let now = 1e6;
  for (let n = 0; n < 40; n++) {
    now += 4000;
    r.pace(now);
    r.resize();
  }
  assert.equal(canvas.width * canvas.height, before);
}

fs.rmSync(temp, { recursive: true, force: true });
console.log('render-budget: ok');
