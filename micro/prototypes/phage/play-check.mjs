// Play checks for the phage world (headless Chromium, software WebGL; a few minutes):
//
//   node micro/prototypes/phage/play-check.mjs            # all
//   node micro/prototypes/phage/play-check.mjs controls   # or: encounter
//
// controls: every LS and trigger direction alone must not turn the view (the old spin); RS in every
// direction with LS held; after release everything settles (no runaway spin); the phage's angular
// speed stays under its cap. Then the view is turned fully round both axes (16 steps each) and the
// fraction of the frame the scene covers (debug.coverage) must stay above a floor everywhere and never
// fall below half the median (no empty side).
// encounter: nothing happens while you hang about at the start; the director places the first decoy
// ahead of a player drifting out, out of view (route.test.mjs runs the whole order headless); the guard
// on the (forced) portal turns you back; driven off, the receptor lets you in; a UV shaft damages at
// once and a second one destroys.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const which = process.argv[2] || 'all';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
async function open(width, height) {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(root, p);
    try { if (!file.startsWith(root) || !(await stat(file)).isFile()) throw 0; res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return { base, page, errors, close: async () => { await browser.close(); server.close(); } };
}

let failed = 0;
if (which === 'all' || which === 'controls') {
  const { base, page, errors, close } = await open(480, 270);
  const q = 'high';
  await page.goto(base + 'phage/?q=' + q + '&pr=1', { waitUntil: 'load' }); // (pr=1: the full bath, as on a GPU)
// Drives every input direction and the camera orbit, then checks nothing keeps turning on its own,
// and that the view is never mostly empty after orbiting fully round both axes.
await page.waitForTimeout(3000);
const ev = (js) => page.evaluate(js);
const D = (f, ...a) => page.evaluate(([f, a]) => window.__micro.debug[f](...a), [f, a]);
// a fixed clock, so slow software frames still advance the simulation evenly
await ev(() => { window.__micro.debug.maxDt = 1 / 30; });
const fails = [];
const hold = async (keys, ms) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); };
let maxView = 0, maxPhage = 0;
const sample = async () => { const s = await D('spin'); maxView = Math.max(maxView, s.view); maxPhage = Math.max(maxPhage, ...s.phages); return s; };
// 1. every LS direction (and diagonals), the triggers, alone: the VIEW must not turn at all (the old spin)
for (const keys of [['KeyD'], ['KeyA'], ['KeyW'], ['KeyS'], ['KeyW', 'KeyD'], ['KeyS', 'KeyA'], ['KeyX'], ['KeyZ'], ['KeyD', 'KeyX']]) {
  await page.keyboard.down(keys[0]); for (const k of keys.slice(1)) await page.keyboard.down(k);
  let worst = 0;
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(250); const s = await sample(); worst = Math.max(worst, s.view); }
  for (const k of keys) await page.keyboard.up(k);
  // only the gentle levelling roll may move it (it is at most 0.9 rad/s and the view starts level)
  if (worst > 0.05) fails.push(`LS ${keys.join('+')}: the view turned on its own at ${worst} rad/s`);
}
// 2. the camera: RS every direction, and full turns round both axes, with LS held at the same time
for (const keys of [['ArrowRight'], ['ArrowLeft'], ['ArrowUp'], ['ArrowDown'], ['ArrowRight', 'ArrowUp', 'KeyD'], ['ArrowLeft', 'ArrowDown', 'KeyW', 'KeyX']]) {
  await page.keyboard.down(keys[0]); for (const k of keys.slice(1)) await page.keyboard.down(k);
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(250); await sample(); }
  for (const k of keys) await page.keyboard.up(k);
}
// 3. released: everything settles (no runaway)
await page.waitForTimeout(500);
const settle = [];
for (let i = 0; i < 8; i++) { await page.waitForTimeout(250); settle.push(await D('spin')); }
const lastView = Math.max(...settle.slice(-3).map((s) => s.view));
const lastPhage = Math.max(...settle.slice(-3).flatMap((s) => s.phages));
if (lastView > 0.95) fails.push(`view still turning after release: ${lastView}`);
if (lastPhage > 2) fails.push(`phage still spinning after release: ${lastPhage}`);
if (maxPhage > 3.01) fails.push(`phage angular speed exceeded its cap: ${maxPhage}`);
// RS turn rate is steady (1.6 rad/s yaw at full stick): bounded
if (maxView > 2.5) fails.push(`view turned faster than any stick allows: ${maxView}`);
// 4. coverage after orbiting fully round both axes (16 headings each), with the levelling off
await ev(() => { window.__micro.features.set('level', false); window.__micro.debug.pause = true; });
const cov = [];
for (const axis of ['yaw', 'pitch']) for (let k = 0; k < 16; k++) {
  const a = (k / 16) * Math.PI * 2;
  await D('cam', axis === 'yaw' ? a : 0, axis === 'pitch' ? a : 0, 180);
  await page.waitForTimeout(400);
  cov.push({ axis, a: +a.toFixed(2), c: +(await D('coverage')).toFixed(3) });
}
const minCov = Math.min(...cov.map((c) => c.c));
const sorted = cov.map((c) => c.c).sort((a, b) => a - b), median = sorted[sorted.length >> 1];
// never a mostly empty direction: at least an eighth of the frame covered by molecules or cells in every
// direction (the owner's look target, 2 Nov 2026, thinned the bath to open water between clumps: it was a
// fifth), and no direction less than half as full as the median one (the old slab fell to ~0 past its edge)
if (minCov < 0.12 || minCov < median * 0.5) fails.push(`a view was mostly empty: coverage ${minCov} vs median ${median}`);
console.log(JSON.stringify({ q, median, maxView, maxPhage, lastView, lastPhage, minCov, cov: cov.map((c) => c.c), kicks: (await D('kicks')).length, errors: errors.slice(0, 3) }));


  console.log(fails.length || errors.length ? 'FAIL controls\n' + fails.concat(errors.slice(0, 3)).join('\n') : 'ok   controls');
  failed += fails.length || errors.length ? 1 : 0;
  await close();
}
if (which === 'all' || which === 'encounter') {
  const { base, page, errors, close } = await open(480, 270);
  await page.goto(base + 'phage/?q=low', { waitUntil: 'load' });
// The encounter pattern in the phage world: rings, decoys meeting you, the portal at your bearing,
// the guard turning you back, driven off, the open receptor; UV shafts damage at once; no clocks.
await page.waitForTimeout(3000);
const D = (f, ...a) => page.evaluate(([f, a]) => window.__micro.debug[f](...a), [f, a]);
const ev = (fn, arg) => page.evaluate(fn, arg);
await ev(() => { window.__micro.debug.maxDt = 1 / 30; });
const fails = [], log = {};
const wait = (ms) => page.waitForTimeout(ms);
// wait in simulated seconds (software WebGL runs the clock far slower than real time)
const waitSim = async (sec) => { const t0 = await ev(() => window.__micro.t); while ((await ev(() => window.__micro.t)) - t0 < sec) await wait(150); };
// 0. hang about at the start for a while: nothing happens to you (no clocks)
await waitSim(8);
log.calm = await ev(() => ({ t: window.__micro.t, mode: window.__micro.P.mode, damaged: window.__micro.P.damaged, captured: window.__micro.capture.active }));
if (log.calm.mode !== 'drift' || log.calm.damaged || log.calm.captured) fails.push('something happened at the start: ' + JSON.stringify(log.calm));
// 1. the director (shared/director.js) places the first decoy ahead of a phage drifting out (across the
// view, +x), out of view, on water nobody has seen; nothing before the warm-up
log.before = (await D('encounters')).entries[0].state;
if (log.before !== 'waiting' && log.calm.t < 6) fails.push('a decoy placed before the warm-up');
await page.keyboard.down('KeyD');
const t1 = await ev(() => window.__micro.t);
let st = null;
while ((await ev(() => window.__micro.t)) - t1 < 25) { st = await D('encounters'); if (st.entries[0].state !== 'waiting') break; await wait(150); }
log.placed = await ev(() => { const m = window.__micro, e = m.debug.encounterLog().find((x) => x.type === 'placed' && x.id === 'B'); const h = m.world.hosts.find((q) => q.id === 'B'); return e && { ...e, host: h.pos.toArray().map((v) => +v.toFixed(0)), hidden: h.hidden, inViewNow: m.debug.director.visibleNow(h.pos.x, h.pos.y, h.pos.z, 1), player: m.P.pos.toArray().map((v) => +v.toFixed(0)) }; });
await page.keyboard.up('KeyD');
if (!log.placed) fails.push('no decoy placed ahead of a drifting phage');
else {
  if (log.placed.host[0] < log.placed.player[0] + 100) fails.push(`decoy not ahead (+x) of the player: ${JSON.stringify(log.placed)}`);
  if (log.placed.inViewNow) fails.push('decoy placed in view');
}
// 2. the way on (forced, for the guard checks below): Host A ahead of the player, the amoeba on guard
log.portal = await D('placePortal', [1, 0.2, -0.3], 320);
if (!log.portal) fails.push('no portal placed');
// 3. at the receptor while guarded: turned back
if (log.portal) {
  const { at, normal } = log.portal;
  const goNear = async () => {
    await D('teleport', at[0] + normal[0] * 18, at[1] + normal[1] * 18, at[2] + normal[2] * 18);
    await ev((nm) => { const P = window.__micro.P; const v = P.pos.clone().set(nm[0], nm[1], nm[2]); P.q.setFromUnitVectors(v.clone().set(0, 1, 0), v); P.angVel.set(0, 0, 0); }, normal);
  };
  await goNear();
  log.guarded = (await D('portal')).guarded;
  await D('grab'); await waitSim(0.3);
  log.turned = (await D('rings')).some((e) => e.kind === 'turnedBack');
  if (!log.guarded || !log.turned) fails.push(`guarded portal did not turn the player back (guarded ${log.guarded}, turned ${log.turned})`);
  // 4. drive the guard off: the receptor opens; grabbing it starts the injection
  await D('driveOff'); await waitSim(2);
  await goNear();
  log.open = !(await D('portal')).guarded;
  await D('grab'); await waitSim(1);
  log.after = await ev(() => window.__micro.P.mode);
  if (!log.open || !['grab', 'commit', 'inside', 'walk'].includes(log.after)) fails.push(`open portal did not let the player in (open ${log.open}, mode ${log.after})`);
}
// 5. a UV shaft damages at once (no drain), a second one destroys
await D('reset'); await waitSim(0.5);
const shafts = await D('shafts');
const s0 = shafts[0];
await D('teleport', s0[0], s0[1] - 10, s0[2]); await waitSim(0.3);
log.uv1 = await ev(() => window.__micro.P.damaged);
await waitSim(3);
await D('teleport', s0[0], s0[1] - 10, s0[2]); await waitSim(0.4);
log.uv2 = await ev(() => window.__micro.capture.active || window.__micro.P.mode === 'dead');
if (!log.uv1) fails.push('touching a UV shaft did not damage');
if (!log.uv2) fails.push('a second shaft while damaged did not destroy');
log.rings = (await D('rings')).map((e) => e.kind + (e.id || e.ring || ''));
log.placements = await D('placements');
console.log(JSON.stringify(log));
console.log(errors.length ? 'ERRORS ' + errors.slice(0, 3).join(' | ') : '');


  console.log(fails.length || errors.length ? 'FAIL encounter\n' + fails.concat(errors.slice(0, 3)).join('\n') : 'ok   encounter');
  failed += fails.length || errors.length ? 1 : 0;
  await close();
}
process.exit(failed ? 1 : 0);
