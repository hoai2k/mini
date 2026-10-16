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

async function launch({ flags = process.env.PERF_FLAGS || 'swiftshader', headless = true, width = 1280, height = 720 } = {}) {
  const browser = await chromium.launch({
    executablePath: findChrome(),
    headless,
    args: [...(FLAG_SETS[flags] || FLAG_SETS.swiftshader), '--enable-precise-memory-info', '--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true, deviceScaleFactor: 1 });
  const net = [];
  // CDN / fonts: serve from the disk cache, fill it on a miss
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

module.exports = { launch, seed, INSTRUMENT, BASE, findChrome, FLAG_SETS, HERE, WORK };
