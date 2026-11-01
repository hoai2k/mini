// Frame-budget measurement for one Micro Zoom world in headless Chromium.
//
//   node measure.mjs <world> [players=1] [seconds=8] [--native] [--size=1280x720] [--url=extra query]
//
// <world> is a folder under micro/prototypes (springtail, ..., zoom, split-demo)
// or "game" for the shell. Writes out/<world>-<players>p.json (summary, a
// median frame's passes, per-pass SwiftShader ms, CPU profile by file and by
// function) and out/<world>-programs.json (every linked shader, for reading).
// --native keeps the real (SwiftShader) GPU name, so worlds take their
// software-GL fallbacks; the default spoofs an Iris Xe so they run their GPU path.
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const args = process.argv.slice(2);
const flag = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}`)); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const pos = args.filter((a) => !a.startsWith('--'));
const world = pos[0] || 'amoeba';
const players = Number(pos[1] || 1);
const seconds = Number(pos[2] || 8);
const native = !!flag('native', false);
const [VW, VH] = String(flag('size', '1280x720')).split('x').map(Number);
const extra = flag('url', '');
const warm = Number(flag('warm', 8));
const tag = flag('tag', '');
const outDir = process.env.PERF_OUT || join(here, 'out');
await (await import('node:fs/promises')).mkdir(outDir, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.ktx2': 'image/ktx2' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(root, p);
  try {
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
await ctx.addInitScript((c) => { window.__perfCfg = c; }, { spoof: !native, pads: players > 1 ? players : 0, passTiming: false, finish: true });
await ctx.addInitScript({ path: join(here, 'inject.js') });
const page = await ctx.newPage();
const block = flag('block', '');
if (block) await page.route((u) => u.href.includes(block), (r) => r.abort());
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)));

const url = world === 'game' ? `${base}game/${extra ? '?' + extra : ''}` : `${base}prototypes/${world}/?f=-dynres,-adaptive${extra ? '&' + extra : ''}`;
await page.goto(url, { waitUntil: 'load' });
const sleep = (ms) => page.waitForTimeout(ms);
await sleep(warm * 1000);

const views = () => page.evaluate(() => { const m = window.__micro; try { const s = m && (m.split || null); const L = s ? s.layout : m && m.layout; return L ? { views: L.views.length, regions: L.regions.length } : null; } catch { return null; } });
let spreadInfo = null;
if (players > 1) {
  // Join: each controller presses A (pad 0 becomes player 1's).
  for (let i = 0; i < players; i++) {
    await page.evaluate((i) => window.__press(i, 0, true), i); await sleep(400);
    await page.evaluate((i) => window.__press(i, 0, false), i); await sleep(500);
  }
  await sleep(1500);
  // Spread: per-world hooks where they exist, sticks otherwise.
  spreadInfo = await page.evaluate(async ({ world, n }) => {
    const m = window.__micro || {};
    const out = { keys: Object.keys(m).slice(0, 80) };
    try {
      const R = { springtail: 9, mite: 700, amoeba: 1600, paramecium: 900, bacterium: 60, phage: 600 }[world];
      for (let s = 1; s < n; s++) {
        const a = (s / n) * Math.PI * 2;
        if (world === 'amoeba' && m.place) m.place(s, m.body.cx + Math.cos(a) * R, m.body.cy + Math.sin(a) * R);
        else if ((world === 'springtail' || world === 'mite') && m.teleport) {
          const r0 = m.recs ? m.recs()[0] : null;
          const c = world === 'mite' ? (r0 && r0.mite && r0.mite.center) : (r0 && (r0.pl || r0.player || r0));
          const x0 = c && c.x != null ? c.x : 0, z0 = c && c.z != null ? c.z : 0;
          m.teleport(s, x0 + Math.cos(a) * R, z0 + Math.sin(a) * R);
        } else if (world === 'tardigrade' && m.place) { m.place(s, s % ((m.world && m.world.leaves && m.world.leaves.length) || 1), 0.2 + 0.2 * s, 0.5); }
        else if (world === 'paramecium' && m.teleport) { m.teleport(Math.cos(a) * R, Math.sin(a) * R, 0, 0, 0, s); }
        else if (world === 'bacterium' && m.debug && m.debug.teleport) { m.debug.teleport(Math.cos(a) * R, Math.sin(a) * R, 0, s); }
      }
      out.ok = true;
    } catch (e) { out.err = String(e); }
    return out;
  }, { world, n: players });
  for (let i = 0; i < players; i++) { const a = (i / players) * Math.PI * 2 + 0.3; await page.evaluate(([i, x, y]) => window.__stick(i, x, y), [i, Math.cos(a), Math.sin(a)]); }
  // Wait for the split (up to 25 s).
  for (let k = 0; k < 25; k++) { const v = await views(); spreadInfo.views = v; if (v && v.views >= Math.min(players, 3)) break; await sleep(1000); }
}

const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
await page.evaluate(() => window.__perf.reset());
await cdp.send('Profiler.start');
const t0 = Date.now();
await sleep(seconds * 1000);
const { profile } = await cdp.send('Profiler.stop');
const wall = (Date.now() - t0) / 1000;
const frames = await page.evaluate(() => window.__perf.frames.map((f) => ({ ...f })));
const vAfter = await views();

// One frame with per-pass SwiftShader timing.
await page.evaluate(() => { window.__perf.cfg.passTiming = true; window.__perf.reset(); });
// three timed frames (or 40 s at most)
for (let k = 0; k < 40; k++) { await sleep(1000); if (await page.evaluate(() => window.__perf.frames.length >= 4)) break; }
const timedAll = await page.evaluate(() => { window.__perf.cfg.passTiming = false; return window.__perf.frames.slice(1, 4).map((f) => ({ ...f })); });
// average the per-pass ms over the timed frames (pass lists normally match)
const timed = timedAll.length ? [timedAll[timedAll.length - 1]] : [];
if (timed.length) for (const [i, p] of timed[0].passes.entries()) { const xs = timedAll.map((f) => f.passes[i] && f.passes[i].fb === p.fb && f.passes[i].w === p.w ? f.passes[i].ms || 0 : null).filter((x) => x != null); p.ms = xs.reduce((a, b) => a + b, 0) / xs.length; }
const programs = await page.evaluate(() => window.__perf.programList());
// Scene census: the heaviest meshes by triangles x instances (worlds that expose a scene).
const census = await page.evaluate(() => {
  const m = window.__micro || {};
  const scenes = [m.scene, m.view && m.view.focusScene, m.inside && m.inside.scene, m.world && m.world.scene].filter((x) => x && x.traverse);
  const rows = [];
  for (const sc of scenes) sc.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    const g = o.geometry; if (!g) return;
    const n = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0);
    const tri = o.isMesh ? n / 3 : n;
    const inst = o.isInstancedMesh ? o.count : 1;
    rows.push({ name: o.name || (o.parent && o.parent.name) || o.type, mat: o.material && (o.material.name || o.material.type), tri: Math.round(tri), inst, total: Math.round(tri * inst), visible: o.visible, culled: o.frustumCulled });
  });
  rows.sort((a, b) => b.total - a.total);
  return { meshes: rows.length, totalTris: rows.reduce((s, r) => s + (r.visible ? r.total : 0), 0), top: rows.slice(0, 15) };
}).catch((e) => ({ err: String(e) }));
const texMem = await page.evaluate(() => window.__perf.texMem());
const hud = await page.evaluate(() => { const e = document.querySelector('.stats, #stats, .hud-stats, [data-stats]'); return e ? e.textContent.slice(0, 600) : ''; });
try { await page.screenshot({ ...{ path: join(outDir, `${world}-${players}p${tag}.png`) }, timeout: 90000 }); } catch (e) { errors.push('screenshot timeout'); }

// ---- summarise
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const F = frames.filter((f) => f.draws > 0 || f.c2d > 0);
let alloc = 0; for (const f of F) alloc += Math.max(0, f.heap1 - f.heap0);
const median = F.length ? F.slice().sort((a, b) => a.draws - b.draws)[Math.floor(F.length / 2)] : null;
const sig = (f) => f ? f.passes.map((p) => `${p.fb} ${p.w}x${p.h} d${p.draws}${p.quads ? ` q${p.quads}` : ''} p[${p.progs.join(',')}]${p.ms != null ? ` ${p.ms.toFixed(1)}ms` : ''}`) : [];

// CPU profile: self time by script file and by function.
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const selfUs = new Map();
const dts = profile.timeDeltas;
for (let i = 0; i < profile.samples.length; i++) selfUs.set(profile.samples[i], (selfUs.get(profile.samples[i]) || 0) + (dts[i] || 0));
const byFile = {}, byFn = {};
let total = 0;
for (const [id, us] of selfUs) {
  const n = nodes.get(id); const cf = n.callFrame;
  const file = cf.url ? cf.url.replace(base, '').replace(/\?.*$/, '') : `(${cf.functionName || 'native'})`;
  if (file === '(idle)' || cf.functionName === '(idle)' || /^\((readPixels|finish|get memory)\)$/.test(file) || file.includes('scratchpad/perf')) continue;
  total += us;
  byFile[file] = (byFile[file] || 0) + us;
  const fn = `${cf.functionName || '(anon)'} ${file}:${cf.lineNumber + 1}`;
  byFn[fn] = (byFn[fn] || 0) + us;
}
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, +(v / 1000 / wall).toFixed(1) + ' ms/s', +(100 * v / total).toFixed(1) + '%']);

const summary = {
  world, players, native, size: `${VW}x${VH}`, wall, frames: F.length, fps: +(F.length / wall).toFixed(2),
  cpuMs: { median: +med(F.map((f) => f.cpu)).toFixed(2), mean: +mean(F.map((f) => f.cpu)).toFixed(2) },
  swiftshaderFinishMs: { median: +med(F.map((f) => f.fin)).toFixed(1) },
  draws: med(F.map((f) => f.draws)), prims: Math.round(med(F.map((f) => f.prims))), programsPerFrame: med(F.map((f) => f.progs)),
  passesPerFrame: med(F.map((f) => f.passes.length)),
  quadPxPerFrameMpx: +(med(F.map((f) => f.quadPx)) / 1e6).toFixed(2),
  uploadsKBPerFrame: +(mean(F.map((f) => f.uploads)) / 1024).toFixed(1), uploadCallsPerFrame: +mean(F.map((f) => f.uploadCalls)).toFixed(1),
  bufferKBPerFrame: +(mean(F.map((f) => f.buf)) / 1024).toFixed(1),
  copiesPerFrame: +mean(F.map((f) => f.copies)).toFixed(1), copyMpxPerFrame: +(mean(F.map((f) => f.copyPx)) / 1e6).toFixed(2),
  compilesDuring: F.reduce((s, f) => s + f.compiles, 0), linksDuring: F.reduce((s, f) => s + f.links, 0),
  c2dCallsPerFrame: +mean(F.map((f) => f.c2d)).toFixed(0), c2dMpxPerFrame: +(mean(F.map((f) => f.c2dPx)) / 1e6).toFixed(2),
  getImageDataPerFrame: +mean(F.map((f) => f.getImageData || 0)).toFixed(2), readPixelsPerFrame: +mean(F.map((f) => f.readPixels || 0)).toFixed(2), mipsPerFrame: +mean(F.map((f) => f.mips || 0)).toFixed(2),
  domMutationsPerFrame: +mean(F.map((f) => f.dom)).toFixed(1),
  heapAllocMBps: +(alloc / 1e6 / wall).toFixed(2), heapAllocKBPerFrame: +(alloc / 1024 / Math.max(1, F.length)).toFixed(1),
  texMemMB: +(texMem.bytes / 1048576).toFixed(1), textures: texMem.n, texTopMB: texMem.top.map((b) => +(b / 1048576).toFixed(1)),
  views: vAfter, spread: spreadInfo, errors: errors.slice(0, 6), hud,
  census,
  medianFramePasses: sig(median),
  medianByProgram: median && median.byProg ? Object.entries(median.byProg).sort((a, b) => b[1][1] - a[1][1]).map(([id, [d, pr, q]]) => `#${id} draws ${d} prims ${Math.round(pr)}${q ? ` quadPx ${q}` : ''}`) : [],
  timedFramePasses: sig(timed[timed.length - 1]),
  timedFrameFinishMs: timed.length ? +timed[timed.length - 1].fin.toFixed(1) : null,
  cpuByFile: top(byFile, 14), cpuByFn: top(byFn, 25),
  cpuBusyPct: +(100 * total / (wall * 1e6)).toFixed(1),
};
await writeFile(join(outDir, `${world}-${players}p${tag}.json`), JSON.stringify(summary, null, 1));
await writeFile(join(outDir, `${world}-programs.json`), JSON.stringify(programs, null, 1));
console.log(JSON.stringify({ ...summary, cpuByFn: summary.cpuByFn.slice(0, 12), timedFramePasses: summary.timedFramePasses.slice(0, 40) }, null, 1));
await browser.close();
server.close();
