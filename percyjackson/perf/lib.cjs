// Shared helpers for the Half-Blood Quests perf harness.
// Launches the preinstalled Chromium, routes CDN requests through a disk cache
// (so load timing is repeatable and not at the mercy of the proxy), records
// every network response and its size.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');

const HERE = __dirname;
// cache (CDN files) and results live outside Git, in local/ (PERF_DIR to move them)
const WORK = process.env.PERF_DIR || path.resolve(HERE, '../../local/percyjackson-perf');
const CACHE = path.join(WORK, 'cache');
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(path.join(WORK, 'results'), { recursive: true });
const PORT = +(process.env.PERF_PORT || 8765);
const BASE = `http://127.0.0.1:${PORT}/percyjackson/game/`;

function findChrome() {
  const roots = ['/opt/pw-browsers'];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r).sort().reverse()) {
      const p = path.join(r, d, 'chrome-linux', 'chrome');
      if (/^chromium-\d+/.test(d) && fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

const FLAG_SETS = {
  // what actually gave us a renderer in this container (see README)
  swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader'],
  webgl: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  gpu: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'],
};

// CDN / fonts: serve from the disk cache, fill it on a miss
async function cacheCdn(context) {
  await context.route(/^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//, async (route) => {
    const url = route.request().url();
    const key = crypto.createHash('sha1').update(url).digest('hex');
    const f = path.join(CACHE, key), meta = f + '.json';
    if (fs.existsSync(f) && fs.existsSync(meta)) {
      const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
      return route.fulfill({ status: m.status, headers: m.headers, body: fs.readFileSync(f) });
    }
    // a miss: fetch it with curl (it knows the agent proxy and its CA), keep it
    try {
      const hdr = f + '.hdr';
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
      execFileSync('curl', ['-sSL', '-A', ua, '-D', hdr, '-o', f, url], { timeout: 60000 });
      const raw = fs.readFileSync(hdr, 'utf8').split(/\r?\n\r?\n/).filter(Boolean).pop();
      const lines = raw.split(/\r?\n/); const status = +lines[0].split(' ')[1] || 200;
      const headers = {};
      for (const l of lines.slice(1)) { const i = l.indexOf(':'); if (i > 0) headers[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
      delete headers['content-encoding']; delete headers['content-length']; delete headers['transfer-encoding'];
      headers['access-control-allow-origin'] = '*';
      fs.writeFileSync(meta, JSON.stringify({ url, status, headers }));
      return route.fulfill({ status, headers, body: fs.readFileSync(f) });
    } catch (e) { console.error('cache miss failed', url, e.message); return route.abort(); }
  });
}

const EXTRA_ARGS = ['--enable-precise-memory-info', '--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required'];
// shared: a browser passed in (check.cjs runs every check in one) gets a new
// context, and the returned browser's close() closes only that context
async function launch({ flags = process.env.PERF_FLAGS || 'swiftshader', headless = true, width = 1280, height = 720, browser: shared = null } = {}) {
  const browser = shared ? { close: () => context.close(), shared } : await chromium.launch({
    executablePath: findChrome(),
    headless,
    args: [...(FLAG_SETS[flags] || FLAG_SETS.swiftshader), ...EXTRA_ARGS],
  });
  const context = await (shared ?? browser).newContext({ viewport: { width, height }, ignoreHTTPSErrors: true, deviceScaleFactor: 1 });
  const net = [];
  await cacheCdn(context);
  const page = await context.newPage();
  page.on('response', async (r) => {
    const url = r.url();
    let bytes = 0;
    try { const b = await r.body(); bytes = b.length; } catch (e) { /* redirects etc */ }
    net.push({ url, status: r.status(), bytes, type: r.request().resourceType(), t: Date.now() });
  });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`.slice(0, 400)); });
  page.on('pageerror', (e) => logs.push('[pageerror] ' + String(e).slice(0, 400)));
  return { browser, context, page, net, logs };
}

// Seed localStorage before the page runs (an init script): settings and saves.
async function seed(context, { settings = {}, profile = null } = {}) {
  await context.addInitScript(([settings, profile]) => {
    try {
      if (sessionStorage.getItem('__seeded')) return;   // (only on the first load: reloads keep what the game wrote)
      sessionStorage.setItem('__seeded', '1');
      localStorage.clear();
      localStorage.setItem('half-blood-quests-settings-v1', JSON.stringify(settings));
      if (profile) {
        const id = 'perfprof01';
        localStorage.setItem('hbq-profiles-v2', JSON.stringify({ version: 2, main: id, ids: [id], slots: {}, migratedV1: true }));
        localStorage.setItem('hbq-profile-' + id, JSON.stringify({ id, name: 'Perf', ...profile }));
      }
    } catch (e) { /* storage blocked */ }
  }, [settings, profile]);
}

// In-page instrumentation, installed before the game's modules run.
const INSTRUMENT = () => {
  window.__perf = { longtasks: [], frames: [], recording: false, gcMarks: [] };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.longtasks.push({ start: e.startTime, dur: e.duration }); }).observe({ type: 'longtask', buffered: true });
  } catch (e) { /* no longtask */ }
  let last = 0;
  const tick = (t) => {
    const P = window.__perf;
    if (P.recording && last) P.frames.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

// ---- the checks (check.cjs and the check scripts it runs) ---------------------
const http = require('http');
const ROOT = path.resolve(HERE, '../..');
const gameUrl = (port) => `http://127.0.0.1:${port}/percyjackson/game/`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.cjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.txt': 'text/plain', '.md': 'text/markdown', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
// A static file server over the repository root (Node's http, no Python), on
// a free port when port is 0. Resolves to { port, base, close }.
function serveStatic(root = ROOT, port = 0) {
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
    const file = path.join(root, path.normalize(rel));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) {
        if (!rel.endsWith('/')) { res.writeHead(301, { Location: rel + '/' }); return res.end(); }
        return send(path.join(file, 'index.html'));
      }
      send(file);
    });
    function send(f) {
      fs.readFile(f, (err, body) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(body);
      });
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const p = server.address().port;
      resolve({ port: p, base: gameUrl(p), close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }) });
    });
  });
}
// The game on PERF_PORT (default 8765): the server already there, else one
// started here (stopped by close()).
async function ensureServer(port = +(process.env.PERF_PORT || 8765)) {
  const base = gameUrl(port);
  try { if ((await fetch(base)).ok) return { port, base, close: async () => {} }; } catch { /* nothing there */ }
  return serveStatic(ROOT, port);
}
// the browser the checks run in: SwiftShader's WebGL (three.js's WebGL2 backend)
const CHECK_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const launchChecks = (args = CHECK_ARGS) => chromium.launch({ executablePath: findChrome(), args });
// The workbench's import map (models.html), for a page of the check's own.
function importMap() {
  const wb = fs.readFileSync(path.join(ROOT, 'percyjackson/game/workbench/models.html'), 'utf8');
  return wb.match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
}
// Serve a check's in-page module at <game>/workbench/__<name>.js on this
// page's context (beside the workbench, so its '../js/...' imports resolve),
// for page.evaluate to import('./__<name>.js') on any page under workbench/.
async function routeModule(page, base, name, source) {
  await page.context().route(`${base}workbench/__${name}.js`, (r) => r.fulfill({ contentType: 'text/javascript', body: source }));
}
// A blank page under workbench/ with the workbench's import map, for the
// checks' own modules (loadModule). Its .errors collects what it throws.
async function openModulePage(browser, base) {
  const page = await browser.newPage();
  await cacheCdn(page.context());
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 300)));
  const url = `${base}workbench/__checks.html`;
  await page.route(url, (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8">${importMap()}</head><body></body></html>` }));
  await page.goto(url);
  return { page, errors };
}
// Serve a check's module and import it on the page: null when it loaded,
// else the error it (or a module it imports) threw.
async function loadModule(page, base, name, source) {
  await routeModule(page, base, name, source);
  return page.evaluate((n) => import(`./__${n}.js`).then(() => null, (e) => String(e?.message ?? e).slice(0, 300)), name);
}
// The model workbench as the size, island and props checks open it.
async function openWorkbench(browser, base) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await cacheCdn(page.context());
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}workbench/?turn=0&lazy=1&lint=0&bg=light`);
  await page.waitForFunction(() => window.__wb, null, { timeout: 180000 });
  return { page, errors };
}
// PERF_SEED=n: Math.random on the page made a seeded generator just before a
// check's work (reseed), so two runs (the old scripts against check.cjs, or
// before and after a change) compare number for number. Unset: left alone.
const SEED_FN = (seed) => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
async function reseed(page) {
  if (process.env.PERF_SEED == null || process.env.PERF_SEED === '') return;
  // (and again before each model: the loops call __perfReseed, so a model's numbers don't hang on the ones before it)
  await page.evaluate(([f, seed]) => { const fn = new Function('return ' + f)(); window.__perfReseed = () => fn(seed); window.__perfReseed(); }, [SEED_FN.toString(), +process.env.PERF_SEED]);
}
// Collects the page errors thrown from now until stop().
function watchErrors(page, map = (e) => e.message) {
  const out = [], f = (e) => out.push(map(e));
  page.on('pageerror', f);
  return { errors: out, stop: () => { page.off('pageerror', f); return out; } };
}
// Run a check module as its old command line did: a server if none is up,
// one browser, the check, its report printed, the exit code set.
async function cli(run, opts = {}) {
  const srv = await ensureServer();
  let browser, res;
  try {
    browser = await launchChecks();
    res = await run({ browser, base: srv.base, ...opts });
  } finally {
    await browser?.close();
    await srv.close();
  }
  for (const l of res.lines) console.log(l);
  process.exit(res.ok ? 0 : 1);
}

module.exports = { launch, seed, INSTRUMENT, BASE, findChrome, FLAG_SETS, HERE, WORK, ROOT, cacheCdn, serveStatic, ensureServer, gameUrl, CHECK_ARGS, launchChecks, importMap, routeModule, openModulePage, loadModule, openWorkbench, watchErrors, reseed, SEED_FN, cli };
