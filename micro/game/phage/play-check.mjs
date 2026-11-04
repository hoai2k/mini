// Play checks for the phage world (headless Chromium, software WebGL; a few minutes):
//
//   node micro/game/phage/play-check.mjs            # all
//   node micro/game/phage/play-check.mjs controls   # or: encounter, grab, verbs
//
// controls: LS up moves forward along the view, LS down back, LS sideways along the view's right, RB up and
// LB down the screen, A dashes forward; every LS and LB/RB direction alone must not turn the view (the old spin); RS in every
// direction with LS held; after release everything settles (no runaway spin); the phage's angular
// speed stays under its cap. Then the view is turned fully round both axes (16 steps each) and the
// fraction of the frame the scene covers (debug.coverage) must stay above a floor everywhere and never
// fall below half the median (no empty side).
// encounter: nothing happens while you hang about at the start; the default path is laid from the first
// frame (the way on sealed); the director places the first decoy ahead of a player drifting off the path, out of view (route.test.mjs runs the whole order headless); the guard
// on the (forced) portal turns you back; driven off, X there only holds on and says to press Y, and Y lets you in; a UV shaft damages at
// once and a second one destroys.
// grab: X takes debris from a sloppy aim and lets it go to drift off; RT (X key) zooms in and LT (Z key)
// out, analogue and clamped, and RT no longer grabs (debris in reach stays free); near a cell, a grab takes one of its proteins and a current passes you by, while unanchored it
// carries you off (only after a visible warning); a gold receptor on Host B still latches and injects.
// verbs (the owner, 4 Nov 2026): X with nothing in reach plays the grab motion (the fibres open, then close
// inward) and pushes nothing; the bare membrane cannot be grabbed (with the proteins hidden from the assist,
// X beside a cell takes nothing), and with them a protein; holding one fixes you to that spot of its cell
// (LS held, the cell moved and turned: no sliding); Y off a cell launches you away from it; debris is
// grabbed, carried, and kicked flying, knocking another piece on; the cruise is 1.5-2x the old 36 units/s
// and the dash about 3x the cruise, with a quick stop; RS right turns the view right, RS up looks up, and
// Invert camera Y flips only the pitch.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..'); // micro/ (text_config.js is at its top)
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
  await page.goto(base + 'game/phage/?q=' + q + '&pr=1', { waitUntil: 'load' }); // (pr=1: the full bath, as on a GPU)
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
// 0. the mapping, in the view's own frame: LS up (W) forward into the view, down back, sideways right; RB (F) up, LB (Q) down; A (Space) a dash forward
{
  const ax = await D('axes');
  const pos = () => ev(() => window.__micro.P.pos.toArray());
  const along = (a, b, v) => a.reduce((s, x, i) => s + (b[i] - x) * v[i], 0);
  // (in simulated time: the full bath on software WebGL draws a frame or two a second)
  const simT = () => ev(() => window.__micro.t);
  const holdSim = async (keys, sec) => { for (const k of keys) await page.keyboard.down(k); const t0 = await simT(); while ((await simT()) - t0 < sec) await page.waitForTimeout(100); for (const k of keys) await page.keyboard.up(k); };
  const go = async (keys, axis) => { await holdSim([], 0.6); const a = await pos(); await holdSim(keys, 0.9); const b = await pos(); return { on: along(a, b, ax[axis]), off: ['fwd', 'right', 'up'].filter((k) => k !== axis).map((k) => Math.abs(along(a, b, ax[k]))) }; };
  for (const [keys, axis, sign, name] of [[['KeyW'], 'fwd', 1, 'LS up: forward'], [['KeyS'], 'fwd', -1, 'LS down: back'], [['KeyD'], 'right', 1, 'LS right'], [['KeyF'], 'up', 1, 'RB: up'], [['KeyQ'], 'up', -1, 'LB: down'], [['Space'], 'fwd', 1, 'A: dash forward']]) {
    const r = await go(keys, axis);
    if (!(r.on * sign > 5) || Math.max(...r.off) > Math.abs(r.on) * 0.35) fails.push(`${name}: moved ${r.on.toFixed(1)} along ${axis}, ${r.off.map((x) => x.toFixed(1))} off it`);
  }
}
// 1. every LS direction (and diagonals), LB/RB, alone: the VIEW must not turn at all (the old spin)
for (const keys of [['KeyD'], ['KeyA'], ['KeyW'], ['KeyS'], ['KeyW', 'KeyD'], ['KeyS', 'KeyA'], ['KeyF'], ['KeyQ'], ['KeyD', 'KeyF']]) {
  await page.keyboard.down(keys[0]); for (const k of keys.slice(1)) await page.keyboard.down(k);
  let worst = 0;
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(250); const s = await sample(); worst = Math.max(worst, s.view); }
  for (const k of keys) await page.keyboard.up(k);
  // only the gentle levelling roll may move it (it is at most 0.9 rad/s and the view starts level)
  if (worst > 0.05) fails.push(`LS ${keys.join('+')}: the view turned on its own at ${worst} rad/s`);
}
// 2. the camera: RS every direction, and full turns round both axes, with LS held at the same time
for (const keys of [['ArrowRight'], ['ArrowLeft'], ['ArrowUp'], ['ArrowDown'], ['ArrowRight', 'ArrowUp', 'KeyD'], ['ArrowLeft', 'ArrowDown', 'KeyW', 'KeyF']]) {
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
console.log(JSON.stringify({ q, median, maxView, maxPhage, lastView, lastPhage, minCov, cov: cov.map((c) => c.c), errors: errors.slice(0, 3) }));


  console.log(fails.length || errors.length ? 'FAIL controls\n' + fails.concat(errors.slice(0, 3)).join('\n') : 'ok   controls');
  failed += fails.length || errors.length ? 1 : 0;
  await close();
}
if (which === 'all' || which === 'encounter') {
  const { base, page, errors, close } = await open(480, 270);
  await page.goto(base + 'game/phage/?q=low', { waitUntil: 'load' });
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
// 1a. the default path (world.js DEFAULT_PATH): the three are laid out across the view (+x) on the first
// frame, the way on among them, sealed until both decoys are met
log.path = await ev(() => { const m = window.__micro; return { placed: m.debug.encounterLog().filter((x) => x.how === 'default').map((x) => `${x.id} ${x.t}`), portals: m.debug.portals(), sealed: m.debug.portalSealed() }; });
if (log.path.placed.length !== 3 || log.path.portals.length !== 1 || log.path.portals[0].instance !== 'default' || !log.path.sealed) fails.push('no default path from the start: ' + JSON.stringify(log.path));
// 1b. off the path the director places the first decoy ahead of a phage drifting out (across the view the
// other way, -x), out of view, on water nobody has seen (taking it off the path: nobody had seen it)
log.before = (await D('encounters')).entries[0].state;
if (log.before !== 'waiting') fails.push('a decoy placed off the path before the warm-up');
await page.keyboard.down('KeyA');
const t1 = await ev(() => window.__micro.t);
let st = null;
while ((await ev(() => window.__micro.t)) - t1 < 25) { st = await D('encounters'); if (st.entries[0].state !== 'waiting') break; await wait(150); }
log.placed = await ev(() => { const m = window.__micro, e = m.debug.encounterLog().find((x) => x.type === 'placed' && x.id === 'B' && x.how !== 'default'); const h = m.world.hosts.find((q) => q.id === 'B'); return e && { ...e, host: h.pos.toArray().map((v) => +v.toFixed(0)), hidden: h.hidden, inViewNow: m.debug.director.visibleNow(h.pos.x, h.pos.y, h.pos.z, 1), player: m.P.pos.toArray().map((v) => +v.toFixed(0)) }; });
await page.keyboard.up('KeyA');
if (!log.placed) fails.push('no decoy placed ahead of a phage drifting off the path');
else {
  if (log.placed.host[0] > log.placed.player[0] - 100) fails.push(`decoy not ahead (-x) of the player: ${JSON.stringify(log.placed)}`);
  if (log.placed.inViewNow) fails.push('decoy placed in view');
  if (log.placed.from !== 'default') fails.push('the decoy was not taken off the path');
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
  // (the way on is entered on purpose: X on it only says so; Y in its area shows the prompt and enters)
  await D('grab'); await waitSim(0.3);
  log.grabOnly = await ev(() => window.__micro.P.mode);
  log.prompt = await ev(() => window.__micro.debug.nearPortal);
  await D('enter'); await waitSim(1);
  log.after = await ev(() => window.__micro.P.mode);
  if (!log.open || !['grab', 'commit', 'inside', 'walk'].includes(log.after)) fails.push(`open portal did not let the player in with Y (open ${log.open}, mode ${log.after})`);
  if (log.grabOnly !== 'drift') fails.push(`X on the open portal entered by itself (mode ${log.grabOnly}): it must wait for Y`);
  if (!log.prompt) fails.push('no "Y Enter" prompt in the open portal\'s area');
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
if (which === 'all' || which === 'grab') {
  const { base, page, errors, close } = await open(480, 270);
  await page.goto(base + 'game/phage/?q=low', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const D = (f, ...a) => page.evaluate(([f, a]) => window.__micro.debug[f](...a), [f, a]);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { window.__micro.debug.maxDt = 1 / 30; });
  const waitSim = async (sec) => { const t0 = await ev(() => window.__micro.t); while ((await ev(() => window.__micro.t)) - t0 < sec) await page.waitForTimeout(100); };
  const pos = () => ev(() => window.__micro.P.pos.toArray());
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const fails = [], log = {};
  const tap = async (k) => { await page.keyboard.down(k); await waitSim(0.1); await page.keyboard.up(k); };
  await waitSim(1);
  // 1. X: a molecule from a sloppy aim (beside and a little behind the baseplate, ~25 units off) is taken
  let p = await pos();
  await D('placeMol', 0, p[0] + 20, p[1] + 14, p[2] + 5);
  await tap('KeyE'); await waitSim(0.6);
  log.molHold = await D('hold');
  log.molAtHand = dist((await D('mols'))[0].pos, await pos());
  if (log.molHold?.kind !== 'debris' || log.molAtHand > 16) fails.push('X did not take debris from a sloppy aim: ' + JSON.stringify(log));
  // and X again lets it go: it drifts gently off
  await tap('KeyE'); await waitSim(0.1);
  const m0 = (await D('mols'))[0]; await waitSim(1.5); const m1 = (await D('mols'))[0];
  log.released = await D('hold'); log.molDrift = +dist(m0.pos, m1.pos).toFixed(1);
  if (log.released || !(log.molDrift > 4 && log.molDrift < 60)) fails.push(`X again did not let the molecule drift off (hold ${JSON.stringify(log.released)}, drifted ${log.molDrift})`);
  // 2. the triggers zoom (RT in, LT out: eased, continuous, clamped to the range), and RT grabs nothing
  const Z = await ev(() => window.__micro.debug.ZOOM);
  const z = async () => (await D('zooms'))[0];
  log.zoom0 = (await z()).zoom;
  p = await pos(); await D('placeMol', 1, p[0] - 15, p[1] - 10, p[2]);
  await page.keyboard.down('KeyX'); await waitSim(0.5);
  log.rtHold = (await D('hold'))?.kind ?? null;
  log.zoomRtHalf = (await z()).zoom;
  await waitSim(2.5); await page.keyboard.up('KeyX'); await waitSim(0.6);
  log.zoomIn = (await z()).zoom;
  await page.keyboard.down('KeyZ'); await waitSim(0.5); log.zoomLtHalf = (await z()).zoom;
  await waitSim(3); await page.keyboard.up('KeyZ'); await waitSim(0.6);
  log.zoomOut = (await z()).zoom;
  if (log.rtHold) fails.push(`RT still grabs (${log.rtHold})`);
  if (!(log.zoomRtHalf < log.zoom0 && log.zoomRtHalf > Z.min)) fails.push(`RT did not zoom in smoothly (${log.zoom0} -> ${log.zoomRtHalf})`);
  if (Math.abs(log.zoomIn - Z.min) > 0.5) fails.push(`RT held did not reach the closest zoom ${Z.min} (${log.zoomIn})`);
  if (!(log.zoomLtHalf > log.zoomIn && log.zoomLtHalf < Z.max)) fails.push(`LT did not zoom out smoothly (${log.zoomIn} -> ${log.zoomLtHalf})`);
  if (Math.abs(log.zoomOut - Z.max) > 0.5) fails.push(`LT held did not reach the widest zoom ${Z.max} (${log.zoomOut})`);
  await D('zoom', 1);
  // 3. near a cell, a grab takes one of its proteins, and a current passes you by
  const near = await ev(() => { const m = window.__micro, h = m.world.bystanders[0]; const n = h.pos.clone().set(0, 1, 0.3).normalize(); return m.world.projectToHost(h, h.pos.clone().addScaledVector(n, 200).add(h.pos.clone().set(40, 0, 0)), 26).toArray(); });
  await D('teleport', ...near); await D('orient', 0.3, 0.2, 1.4); await waitSim(0.2);
  log.cell = await D('grabNow', 'x'); await waitSim(1);
  const h0 = await pos(); await D('current', [1, 0, 0]); await waitSim(9);
  log.heldMoved = +dist(await pos(), h0).toFixed(1); log.stillHold = (await D('hold'))?.kind;
  if (log.cell?.kind !== 'protein' || log.heldMoved > 8 || log.stillHold !== 'protein') fails.push(`holding a cell, a current moved you (${JSON.stringify(log.cell)}, moved ${log.heldMoved}, ${log.stillHold})`);
  // 4. unanchored, a current carries you off, but only after its warning
  await D('release'); await D('teleport', near[0], near[1] + 120, near[2] + 60); await waitSim(0.5);
  const f0 = await pos(); await D('current', [1, 0, 0]);
  const t0 = await ev(() => window.__micro.t); let first = null;
  while ((await ev(() => window.__micro.t)) - t0 < 10) { await waitSim(0.1); const kv = await ev(() => window.__micro.P.kv.length()); if (first == null && kv > 2) first = (await ev(() => window.__micro.t)) - t0; }
  log.freeMoved = +dist(await pos(), f0).toFixed(1); log.warning = first && +first.toFixed(2);
  if (!(log.freeMoved > 150)) fails.push(`a current did not carry an unanchored phage off (${log.freeMoved})`);
  if (!(log.warning > 2.5)) fails.push(`a current hit with too little warning (${log.warning} s)`);
  // 5. the right receptor still injects: a gold receptor on Host B (on the default path), grabbed with X
  await D('release');
  log.inject = await ev(() => { const m = window.__micro, h = m.world.hosts.find((x) => x.id === 'B'); const q = m.world.proteins.find((x) => x.host === h && x.compatible); const n = m.world.dirToWorld(h, q.normal, h.pos.clone()); const at = m.world.toWorld(h, q.local, h.pos.clone()).addScaledVector(n, 12); return { at: at.toArray(), n: n.toArray() }; });
  await D('teleport', ...log.inject.at);
  await ev((nm) => { const P = window.__micro.P; const v = P.pos.clone().set(nm[0], nm[1], nm[2]); P.q.setFromUnitVectors(v.clone().set(0, 1, 0), v); P.angVel.set(0, 0, 0); }, log.inject.n);
  await D('grabNow', 'x'); await waitSim(1.2);
  log.injectMode = await ev(() => window.__micro.P.mode);
  if (!['grab', 'commit', 'inside'].includes(log.injectMode)) fails.push(`a gold receptor on Host B did not latch (mode ${log.injectMode})`);
  delete log.inject;
  console.log(JSON.stringify(log));
  console.log(fails.length || errors.length ? 'FAIL grab\n' + fails.concat(errors.slice(0, 3)).join('\n') : 'ok   grab');
  failed += fails.length || errors.length ? 1 : 0;
  await close();
}
if (which === 'all' || which === 'verbs') {
  const { base, page, errors, close } = await open(480, 270);
  await page.goto(base + 'game/phage/?q=low', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const D = (f, ...a) => page.evaluate(([f, a]) => window.__micro.debug[f](...a), [f, a]);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { window.__micro.debug.maxDt = 1 / 30; window.__micro.features.set('currents', false); });
  const simT = () => ev(() => window.__micro.t);
  const waitSim = async (sec) => { const t0 = await simT(); while ((await simT()) - t0 < sec) await page.waitForTimeout(60); };
  const pos = () => ev(() => window.__micro.P.pos.toArray());
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const fails = [], log = {};
  const tap = async (k) => { await page.keyboard.down(k); await waitSim(0.08); await page.keyboard.up(k); };
  // send every piece of debris far off (it comes back 140+ units away: out of reach)
  const clearDebris = async () => { const p = await pos(); const n = (await D('mols')).length; for (let i = 0; i < n; i++) await D('placeMol', i, p[0] + 2000 + i * 20, p[1], p[2]); await waitSim(0.1); };
  // face the baseplate along n (the head away from it)
  const face = (n) => ev((nm) => { const P = window.__micro.P; const v = P.pos.clone().set(nm[0], nm[1], nm[2]).normalize(); P.q.setFromUnitVectors(v.clone().set(0, 1, 0), v.negate()); P.angVel.set(0, 0, 0); }, n);
  // a spot beside cell `id` facing protein `k` (or the one facing the camera) from `off` units out
  const toProtein = async (id, off, k = null) => { const q = await D('protein', id, k); await D('teleport', ...q.at.map((x, i) => x + q.n[i] * off)); await face(q.n.map((x) => -x)); return q; };
  await waitSim(1);
  // 1. the grab motion: X in empty water (the start's calm water) opens the fibres, closes them inward, moves nothing
  await clearDebris();
  await waitSim(1);
  const rest = Math.min(...(await D('motion')).tips);
  const g0 = await pos();
  await tap('KeyE');
  log.emptyHold = await D('hold');
  const tips = []; let push = 0;
  for (let i = 0; i < 8; i++) { const mo = await D('motion'); tips.push({ t: mo.motion?.t ?? null, r: Math.max(...mo.tips) }); push = Math.max(push, (await D('speed')).v); await waitSim(0.06); }
  await waitSim(0.5);
  const g1 = await pos();
  // (the calm water's slow drift still moves an idle phage a little: the push would show as speed of its own)
  log.emptyMoved = +dist(g0, g1).toFixed(2); log.emptySpeed = +push.toFixed(2);
  log.grabTips = tips.map((x) => `${x.t}:${x.r}`).join(' ');
  log.restTip = rest;
  const during = tips.filter((x) => x.t != null);
  const closed = during.filter((x) => x.t >= 0.3).map((x) => x.r);
  if (log.emptyHold) fails.push('X in empty water grabbed something: ' + JSON.stringify(log.emptyHold));
  if (!during.length) fails.push('X in empty water played no grab motion');
  else if (!(closed.length && Math.min(...closed) < rest * 0.6)) fails.push(`the grab motion did not close the fibres inward (rest ${rest}, ${log.grabTips})`);
  if (log.emptyMoved > 8 || log.emptySpeed > 1) fails.push(`X in empty water pushed the phage (moved ${log.emptyMoved}, speed ${log.emptySpeed})`);
  // 2. the flat membrane cannot be grabbed: proteins hidden from the assist, X right beside a cell takes nothing
  const q0 = await toProtein('S0', 4);
  const wall = await ev((id) => { const m = window.__micro, h = m.world.bystanders.find((x) => x.id === id); return m.world.sdHost(h, m.P.pos); }, 'S0');
  await ev(() => { window.__micro.debug.noProteins = true; }); await clearDebris();
  log.membrane = await D('grabNow'); await waitSim(0.6);
  log.membraneAfter = await D('hold');
  await ev(() => { window.__micro.debug.noProteins = false; });
  log.wallD = +wall.toFixed(1);
  if (log.membrane || log.membraneAfter) fails.push(`the bare membrane was grabbed (${JSON.stringify(log.membraneAfter)}, ${log.wallD} from it)`);
  // 3. a protein grab fixes you to that spot: the cell moved and turned under you, LS held: no sliding
  await waitSim(0.7);
  await toProtein('B', 16);
  log.protein = await D('grabNow');
  await waitSim(0.5);
  const l0 = await D('localTo', 'B');
  await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD');
  await ev(() => { const h = window.__micro.world.hosts.find((x) => x.id === 'B'); h.pos.x += 25; h.pos.z -= 10; h.ang += 0.3; });
  await waitSim(1.2);
  await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD');
  const l1 = await D('localTo', 'B');
  log.slide = +dist(l0, l1).toFixed(2); log.proteinHold = await D('hold');
  if (log.protein?.kind !== 'protein' || log.proteinHold?.kind !== 'protein') fails.push(`no protein grabbed beside Host B (${JSON.stringify(log.protein)})`);
  if (!(log.slide < 0.5)) fails.push(`holding a protein, the phage slid ${log.slide} units over the cell`);
  // 4. Y on the cell: launched off it, head first, away from the surface
  const hb = (await D('hold'));
  const qn = await ev(() => { const m = window.__micro, g = m.P.hold; return m.world.dirToWorld(g.host, g.q.normal).toArray(); });
  const k0 = await pos();
  await tap('KeyR');
  await waitSim(0.7);
  const k1 = await pos();
  log.kickCell = (await D('rings')).filter((e) => e.kind === 'kick').pop();
  log.kickAway = +dot(sub(k1, k0), qn).toFixed(1); log.kickHold = await D('hold');
  if (!hb || log.kickCell?.what !== 'cell' || log.kickHold) fails.push(`Y on a cell did not kick off (${JSON.stringify(log.kickCell)}, still ${JSON.stringify(log.kickHold)})`);
  if (!(log.kickAway > 50)) fails.push(`Y on a cell did not launch you away from it (${log.kickAway} units along its normal in 0.7 s)`);
  // 5. debris: grabbed, carried, kicked flying, and it knocks another piece on
  await D('teleport', ...(await pos()).map((x, i) => x + [0, 260, 120][i]));
  await waitSim(0.3); await clearDebris();
  await face([0, -1, 0]); await waitSim(0.2);
  let p = await pos();
  await D('placeMol', 0, p[0], p[1] - 16, p[2]);
  await tap('KeyE'); await waitSim(0.4);
  log.debrisHold = await D('hold');
  p = await pos();
  const fwd = await ev(() => { const P = window.__micro.P; return P.pos.clone().set(0, -1, 0).applyQuaternion(P.q).toArray(); });
  const dpos = (await D('mols'))[0].pos;
  await D('placeMol', 1, p[0] + fwd[0] * 50, p[1] + fwd[1] * 50, p[2] + fwd[2] * 50);
  await tap('KeyR'); await waitSim(0.8);
  const ms = await D('mols');
  log.kickDebris = (await D('rings')).filter((e) => e.kind === 'kick').pop();
  log.debrisFlew = +dot(sub(ms[0].pos, dpos), fwd).toFixed(1); log.knocked = +dist(ms[1].pos, [p[0] + fwd[0] * 50, p[1] + fwd[1] * 50, p[2] + fwd[2] * 50]).toFixed(1);
  log.afterKickHold = await D('hold');
  if (log.debrisHold?.kind !== 'debris') fails.push(`debris in reach was not grabbed (${JSON.stringify(log.debrisHold)})`);
  if (log.kickDebris?.what !== 'debris' || log.afterKickHold || !(log.debrisFlew > 35)) fails.push(`Y did not kick the debris away (${JSON.stringify(log.kickDebris)}, flew ${log.debrisFlew})`);
  if (!(log.knocked > 5)) fails.push(`the kicked debris did not knock the piece in its path (moved ${log.knocked})`);
  // 6. speed: the cruise 1.5-2x the old 36, the dash about 3x the cruise, a crisp stop after it
  await D('teleport', ...(await pos()).map((x, i) => x + [0, -200, 0][i])); await clearDebris(); await waitSim(0.5);
  const top = async (sec) => { let v = 0; const t0 = await simT(); while ((await simT()) - t0 < sec) { v = Math.max(v, (await D('speed')).v); await page.waitForTimeout(40); } return v; };
  await page.keyboard.down('KeyW'); await waitSim(0.5); log.cruise = +(await top(0.6)).toFixed(1); await page.keyboard.up('KeyW');
  await waitSim(1.2);
  await page.keyboard.down('Space'); log.dash = +(await top(0.35)).toFixed(1); await page.keyboard.up('Space');
  log.fovKick = (await D('speed')).fov;
  await waitSim(1.1); log.afterDash = (await D('speed')).v;
  if (!(log.cruise >= 36 * 1.5 && log.cruise <= 36 * 2.05)) fails.push(`cruise ${log.cruise} units/s, not 1.5-2x the old 36`);
  if (!(log.dash >= log.cruise * 2.6 && log.dash <= log.cruise * 3.6)) fails.push(`dash ${log.dash} vs cruise ${log.cruise}: not about 3x`);
  if (!(log.afterDash < 8)) fails.push(`no crisp stop after the dash (${log.afterDash} units/s 1.1 s later)`);
  // 7. the camera: RS right turns the view right, RS up looks up; Invert camera Y flips only the pitch
  await ev(() => window.__micro.features.set('level', false));
  const turn = async (key) => { const a = await D('axes'); await page.keyboard.down(key); await waitSim(0.4); await page.keyboard.up(key); await waitSim(0.1); const b = await D('axes'); return { right: +dot(b.fwd, a.right).toFixed(2), up: +dot(b.fwd, a.up).toFixed(2) }; };
  log.rsRight = await turn('ArrowRight'); log.rsLeft = await turn('ArrowLeft'); log.rsUp = await turn('ArrowUp');
  await ev(() => window.__micro.features.set('invertY', true));
  log.rsUpInv = await turn('ArrowUp'); log.rsRightInv = await turn('ArrowRight');
  await ev(() => window.__micro.features.set('invertY', false));
  if (!(log.rsRight.right > 0.2) || !(log.rsLeft.right < -0.2)) fails.push(`RS right/left did not turn the view right/left (${JSON.stringify([log.rsRight, log.rsLeft])})`);
  if (!(log.rsUp.up > 0.2)) fails.push(`RS up did not look up (${JSON.stringify(log.rsUp)})`);
  if (!(log.rsUpInv.up < -0.2) || !(log.rsRightInv.right > 0.2)) fails.push(`Invert camera Y did not flip only the pitch (${JSON.stringify([log.rsUpInv, log.rsRightInv])})`);
  console.log(JSON.stringify(log));
  console.log(fails.length || errors.length ? 'FAIL verbs\n' + fails.concat(errors.slice(0, 3)).join('\n') : 'ok   verbs');
  failed += fails.length || errors.length ? 1 : 0;
  await close();
}
process.exit(failed ? 1 : 0);
