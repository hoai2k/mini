// Half-Blood Quests performance harness.
//   NODE_PATH=/opt/node22/lib/node_modules node run.cjs [--quality low|medium|high] [--secs 12]
//       [--scenes title,prologue,lt1,hub,combat,lt2,lt4,lt10,boss-lt2,boss-lt11] [--no-profile] [--no-leak] [--out results/x.json]
// Needs the repo served at http://127.0.0.1:$PERF_PORT (default 8765): see README.md.
const fs = require('fs');
const path = require('path');
const { launch, seed, INSTRUMENT, BASE, WORK } = require('./lib.cjs');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes('--' + k);
const QUALITY = opt('quality', 'auto');
const SECS = +opt('secs', 12);
const SCENES = opt('scenes', 'title,prologue,lt1,hub,combat,lt2,lt4,lt10,boss-lt2,boss-lt11').split(',');
const OUT = path.resolve(WORK, opt('out', `results/run-${QUALITY}.json`));
const PROFILE_SCENE = opt('profile-scene', 'combat');
const LEAK_CYCLES = +opt('leak-cycles', 5);

const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
const stats = (a) => ({ n: a.length, avg: a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : 0, p50: +pct(a, 50).toFixed(2), p95: +pct(a, 95).toFixed(2), p99: +pct(a, 99).toFixed(2), max: +Math.max(0, ...a).toFixed(2) });

// ---------------------------------------------------------------- in-page helpers (installed once after boot)
const PAGE_SETUP = async () => {
  const base = location.origin + '/percyjackson/game/js/';
  const [{ Mission }, { chapter }, { Enemy }, { Player }, { Boss }, THREE] = await Promise.all([
    import(base + 'mission.js'), import(base + 'story/chapters.js'), import(base + 'entities/enemy.js'),
    import(base + 'entities/player.js'), import(base + 'entities/bosses.js'), import('three/webgpu').catch(() => null),
  ]);
  const g = window.__game;
  const P = window.__perf;
  P.seg = {}; P.cpu = []; P.render = []; P.heap = []; P.info = [];
  // per-subsystem CPU time: wrap methods (ms accumulated per frame)
  const acc = {};
  const wrap = (obj, name, key) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].__w) return;
    const f = obj[name];
    const w = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { acc[key] = (acc[key] ?? 0) + performance.now() - t; } };
    w.__w = true; obj[name] = w;
  };
  wrap(Player.prototype, 'update', 'players');
  wrap(Enemy.prototype, 'update', 'enemies');
  wrap(Boss.prototype, 'update', 'boss');
  wrap(Mission.prototype, 'update', 'mission');
  for (const [o, n, k] of [[g.gr, 'render', 'render'], [g.hud, 'update', 'hud'], [g.tracker, 'update', 'tracker'], [g.minimap, 'draw', 'minimap'],
    [g.fx, 'update', 'fx'], [g.fx, 'ambient', 'fxAmbient'], [g.particles, 'upload', 'particles'], [g.rig, 'update', 'camera'], [g.lights, 'update', 'lights'],
    [g.env, 'update', 'env'], [g.signs, 'update', 'signs'], [g.online, 'update', 'online'], [g.roaming, 'update', 'roaming'], [g.mist, 'update', 'mist'],
    [g.partyMgr, 'update', 'party'], [g.projectiles, 'update', 'projectiles'], [g.hazards, 'update', 'hazards'], [g.pickups, 'update', 'pickups'],
    [g.loot, 'update', 'loot'], [g.markers, 'update', 'markers'], [g.debris, 'update', 'debris'], [g, 'updateInteract', 'interact'], [g.input, 'poll', 'input'],
    [g.domainSys, 'update', 'domain'], [g.ui, 'update', 'ui']]) wrap(o, n, k);
  // world methods are re-bound per level: wrap the prototype
  const wproto = Object.getPrototypeOf(g.world);
  wrap(wproto, 'flush', 'worldFlush'); wrap(wproto, 'updateRoofs', 'roofs');
  const origFrame = g.frame.bind(g);
  let n = 0;
  g.frame = function () {
    for (const k in acc) acc[k] = 0;
    const t0 = performance.now();
    origFrame();
    const dt = performance.now() - t0;
    if (!P.recording) return;
    P.cpu.push(dt);
    for (const k in acc) (P.seg[k] ??= []).push(acc[k]);
    const m = performance.memory; if (m) P.heap.push(m.usedJSHeapSize);
    if ((n++ % 2) === 0) {
      const i = g.gr.renderer.info;
      P.info.push({ draws: i.render.drawCalls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, programs: i.memory.programs, rts: i.memory.renderTargets, frameCalls: i.render.frameCalls });
    }
  };
  // keep the party alive while measuring (no wipe, no respawn)
  window.__immortal = () => g.addUpdater(() => { for (const p of g.players) { p.hp = p.maxHp; p.downed = false; p.dead = false; } return true; });
  window.__api = { Mission, chapter, THREE, g };
  window.__sceneStats = () => {
    const s = { objects: 0, meshes: 0, visibleMeshes: 0, instanced: 0, instances: 0, sprites: 0, points: 0, lines: 0, lights: 0, shadowCasters: 0, materials: new Set(), geometries: new Set(), vertices: 0 };
    g.scene.traverse((o) => {
      s.objects++;
      if (o.isLight) s.lights++;
      if (o.isMesh || o.isSprite || o.isPoints || o.isLine) {
        if (o.isMesh) s.meshes++; if (o.isSprite) s.sprites++; if (o.isPoints) s.points++; if (o.isLine) s.lines++;
        if (o.isInstancedMesh) { s.instanced++; s.instances += o.count; }
        let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) { vis = false; break; }
        if (vis) { s.visibleMeshes++; if (o.castShadow) s.shadowCasters++; }
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && s.materials.add(m));
        if (o.geometry) { s.geometries.add(o.geometry); }
      }
    });
    for (const geo of s.geometries) s.vertices += geo.attributes?.position?.count ?? 0;
    return { ...s, materials: s.materials.size, geometries: s.geometries.size, enemies: g.enemies.length, players: g.players.length, lightsPool: g.lights.pool?.length, dom: document.getElementsByTagName('*').length, dmgNodes: document.getElementById('dmg-layer')?.childElementCount };
  };
  return true;
};

// ---------------------------------------------------------------- scenes
const SCENE_SETUP = {
  title: () => { /* boot lands here */ },
  _session: () => { const g = window.__game; if (g.state !== 'playing') { const d = g.save.data; d.completed.lt1 = d.completed.lt1 ?? 1; d.completed.lt2 = d.completed.lt2 ?? 1; d.opening = 'done'; d.seenGearHint = true; d.unlockAll = true; g.ui.closeAll(); g.beginSession([{ device: 'kbm', hero: 'percy' }], { companions: ['annabeth', 'grover'] }); } },
  prologue: () => { const g = window.__game; g.opening.startPrologue(); },
  hub: () => { const g = window.__game; g.loadHub(); },
  combat: () => { const g = window.__game; g.loadHub(); g.wave = 3; g.spawnWave(); g.spawnWave(); g.spawnWave(); g.placePlayers(g.level.dummy.clone()); },
  chapter: (id) => { const { g, Mission, chapter } = window.__api; const def = Mission.defForChapter(chapter(id), 1); g.startMission(def); },
  boss: (id) => {
    const { g, Mission, chapter, THREE } = window.__api; g.startMission(Mission.defForChapter(chapter(id), 1));
    const room = g.level.bossRoom; if (!room) return 'no boss room';
    const sp = room.spawns?.[1] ?? room.spawns?.[0] ?? [room.center.x, room.y, room.center.z];
    g.placePlayers(new THREE.Vector3(room.center.x + 3, room.y, room.center.z + 3));
    g.mission.startBoss(room);
    g.mission.revealDisguisedBoss?.();
    return 'boss ' + (g.mission.boss?.B?.title ?? '?');
  },
};

async function playInput(page, secs) {
  // walk in a loop and attack: W/A/S/D held in turn, left click every ~0.4 s
  const vp = page.viewportSize();
  await page.mouse.move(vp.width / 2 + 120, vp.height / 2 - 40);
  const keys = ['w', 'd', 's', 'a'];
  const end = Date.now() + secs * 1000;
  let k = 0;
  while (Date.now() < end) {
    await page.keyboard.down(keys[k % 4]);
    for (let i = 0; i < 3 && Date.now() < end; i++) { await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(330); }
    await page.keyboard.up(keys[k % 4]); k++;
  }
}

async function measure(page, name, secs, { play = true } = {}) {
  await page.evaluate(() => { const P = window.__perf; P.frames = []; P.cpu = []; P.seg = {}; P.heap = []; P.info = []; P.ltStart = performance.now(); P.recording = true; });
  const t0 = Date.now();
  if (play) await playInput(page, secs); else await page.waitForTimeout(secs * 1000);
  const r = await page.evaluate(() => {
    const P = window.__perf; P.recording = false;
    const lt = P.longtasks.filter((e) => e.start >= P.ltStart);
    // heap: count drops (GCs) and the sum of rises between them (allocation rate)
    let rise = 0, gcs = 0, freed = 0;
    for (let i = 1; i < P.heap.length; i++) { const d = P.heap[i] - P.heap[i - 1]; if (d > 0) rise += d; else if (d < -262144) { gcs++; freed -= d; } }
    const seg = {}; for (const k in P.seg) { const a = P.seg[k]; seg[k] = +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3); }
    const m = performance.memory || {};
    return { frames: P.frames.slice(), cpu: P.cpu.slice(), seg, longtasks: lt, heapNow: m.usedJSHeapSize, heapTotal: m.totalJSHeapSize, rise, gcs, freed, info: P.info.slice(), scene: window.__sceneStats(), heapFirst: P.heap[0], heapLast: P.heap[P.heap.length - 1] };
  });
  const wall = (Date.now() - t0) / 1000;
  const info = r.info.length ? r.info.reduce((a, b) => (b.draws > a.draws ? b : a)) : {};
  const avgDraws = r.info.length ? Math.round(r.info.reduce((s, x) => s + x.draws, 0) / r.info.length) : 0;
  return {
    scene: name, secs: wall,
    fps: +(r.frames.length / wall).toFixed(1),
    rafInterval: stats(r.frames),
    frameCpu: stats(r.cpu),
    segmentsAvgMs: Object.fromEntries(Object.entries(r.seg).sort((a, b) => b[1] - a[1])),
    longtasks: { count: r.longtasks.length, totalMs: Math.round(r.longtasks.reduce((s, e) => s + e.dur, 0)), max: Math.round(Math.max(0, ...r.longtasks.map((e) => e.dur))) },
    heapMB: +(r.heapNow / 1048576).toFixed(1), heapTotalMB: +(r.heapTotal / 1048576).toFixed(1),
    allocMBperSec: +(r.rise / 1048576 / wall).toFixed(2), gcDrops: r.gcs,
    renderer: { ...info, avgDraws }, sceneGraph: r.scene,
  };
}

async function cpuProfile(page, client, secs) {
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 200 });
  await client.send('Profiler.start');
  await playInput(page, secs);
  const { profile } = await client.send('Profiler.stop');
  const total = profile.endTime - profile.startTime;
  const dt = {}; // nodeId -> sample time
  for (let i = 0; i < profile.samples.length; i++) dt[profile.samples[i]] = (dt[profile.samples[i]] ?? 0) + (profile.timeDeltas[i] ?? 0);
  const byFn = {}, byFile = {};
  for (const n of profile.nodes) {
    const t = dt[n.id] ?? 0; if (!t) continue;
    const cf = n.callFrame; const file = cf.url.replace(/^.*\/percyjackson\/game\//, '').replace(/^https:\/\/cdn\.jsdelivr\.net\/npm\//, 'cdn:');
    const key = `${cf.functionName || '(anon)'} ${file}:${cf.lineNumber + 1}`;
    byFn[key] = (byFn[key] ?? 0) + t;
    const fk = file || cf.functionName; byFile[fk] = (byFile[fk] ?? 0) + t;
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ fn: k, ms: +(v / 1000).toFixed(1), pct: +(100 * v / total).toFixed(2) }));
  const game = Object.fromEntries(Object.entries(byFn).filter(([k]) => / js\//.test(k)));
  return { totalMs: +(total / 1000).toFixed(0), topAll: top(byFn, 40), topGame: top(game, 40), byFile: top(byFile, 25) };
}

async function allocProfile(page, client, secs) {
  await client.send('HeapProfiler.enable');
  await client.send('HeapProfiler.startSampling', { samplingInterval: 8192, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  await playInput(page, secs);
  const { profile } = await client.send('HeapProfiler.stopSampling');
  const by = {};
  const walk = (n) => { const cf = n.callFrame; const file = cf.url.replace(/^.*\/percyjackson\/game\//, '').replace(/^https:\/\/cdn\.jsdelivr\.net\/npm\//, 'cdn:'); const k = `${cf.functionName || '(anon)'} ${file}:${cf.lineNumber + 1}`; by[k] = (by[k] ?? 0) + n.selfSize; for (const c of n.children) walk(c); };
  walk(profile.head);
  const tot = Object.values(by).reduce((a, b) => a + b, 0);
  return { totalMB: +(tot / 1048576).toFixed(1), perSecMB: +(tot / 1048576 / secs).toFixed(2), top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 35).map(([k, v]) => ({ fn: k, MB: +(v / 1048576).toFixed(2), pct: +(100 * v / tot).toFixed(1) })) };
}

function netSummary(net, until) {
  const rows = net.filter((n) => !until || n.t <= until);
  const cat = (n) => {
    if (/cdn\.jsdelivr/.test(n.url)) return 'cdn-js';
    if (/fonts\.g/.test(n.url)) return 'fonts';
    if (/\.m?js(\?|$)/.test(n.url)) return 'game-js';
    if (/\.css/.test(n.url)) return 'css';
    if (/assets\/music\//.test(n.url)) return 'music';
    if (/assets\/cards\//.test(n.url)) return 'cards';
    if (/assets\/(sfx|ambience)\//.test(n.url)) return 'sfx+ambience';
    if (/\.(png|jpe?g|webp|svg)/.test(n.url)) return 'images';
    if (/\.(mp3|ogg|wav|m4a)/.test(n.url)) return 'audio-other';
    return 'other';
  };
  const out = {};
  for (const n of rows) { const c = cat(n); (out[c] ??= { count: 0, MB: 0 }); out[c].count++; out[c].MB += n.bytes / 1048576; }
  for (const c in out) out[c].MB = +out[c].MB.toFixed(2);
  const big = rows.filter((n) => n.bytes > 300000).sort((a, b) => b.bytes - a.bytes).slice(0, 25).map((n) => ({ url: n.url.replace(/^.*\/percyjackson\/game\//, ''), MB: +(n.bytes / 1048576).toFixed(2) }));
  return { total: { count: rows.length, MB: +(rows.reduce((s, n) => s + n.bytes, 0) / 1048576).toFixed(2) }, byCategory: out, largest: big };
}

(async () => {
  const results = { when: new Date().toISOString(), quality: QUALITY, secs: SECS, scenes: [], notes: [] };
  const W = +(process.env.PERF_W || 640), H = +(process.env.PERF_H || 360);
  const { browser, context, page, net, logs } = await launch({ flags: process.env.PERF_FLAGS || 'webgl', width: W, height: H });
  results.viewport = [W, H];
  const settings = { dynRes: false, damageNumbers: true };
  if (QUALITY !== 'auto') settings.quality = QUALITY;
  await seed(context, { settings });
  await page.addInitScript(INSTRUMENT);
  const client = await context.newCDPSession(page);
  // ---- load
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 240000, polling: 100 });
  const tTitle = Date.now() - t0;
  await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 30000, polling: 100 }).catch(() => {});
  const tInteractive = Date.now() - t0;
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), resources: performance.getEntriesByType('resource').length }; });
  const boot = await page.evaluate(() => ({ backend: window.__game.gr.backend, quality: window.__game.gr.quality, gpu: window.__game.gr.info.name, pixelRatio: window.__game.gr.pixelRatio, preset: window.__game.gr.preset }));
  results.boot = { ...boot, msToTitleState: tTitle, msToInteractive: tInteractive, nav, network: netSummary(net, Date.now()) };
  console.log('boot', JSON.stringify(results.boot.network.total), boot.backend, boot.quality, tInteractive + 'ms');
  await page.evaluate(PAGE_SETUP);
  await page.waitForTimeout(3000);
  // after a few seconds of title: what else got fetched lazily (music etc)
  results.boot.networkAfterTitle = netSummary(net);
  // ---- scenes
  for (const s of SCENES) {
    const [kind, arg] = s.includes('-') ? s.split('-') : (/^lt\d+$/.test(s) ? ['chapter', s] : [s, null]);
    try {
      if (s !== 'title') await page.evaluate(`(${SCENE_SETUP._session.toString()})()`);
      const netBefore = net.length;
      const tLoad = await page.evaluate(`(() => { const t = performance.now(); const r = (${SCENE_SETUP[kind].toString()})(${arg ? JSON.stringify(arg) : ''}); window.__immortal?.(); return { ms: performance.now() - t, r }; })()`);
      // the first frames after a load compile shaders: time them separately
      const settle = await page.evaluate(() => new Promise((res) => { const t = performance.now(); let f = 0; const out = []; let last = t; const step = (now) => { out.push(now - last); last = now; if (++f < 30) requestAnimationFrame(step); else res({ first30ms: Math.round(now - t), worst: Math.round(Math.max(...out)) }); }; requestAnimationFrame(step); }));
      await page.waitForTimeout(2500);
      const m = await measure(page, s, SECS, { play: s !== 'title' });
      m.loadMs = Math.round(tLoad.ms); m.loadNote = tLoad.r ?? null; m.firstFrames = settle;
      m.network = netSummary(net.slice(netBefore));
      results.scenes.push(m);
      console.log(s, `load ${m.loadMs}ms`, `cpu avg ${m.frameCpu.avg} p95 ${m.frameCpu.p95} max ${m.frameCpu.max}`, `raf p95 ${m.rafInterval.p95}`, `draws ${m.renderer.avgDraws}/${m.renderer.draws}`, `heap ${m.heapMB}MB alloc ${m.allocMBperSec}MB/s`, `LT ${m.longtasks.count}`);
      if (s === PROFILE_SCENE && !flag('no-profile')) {
        results.cpuProfile = { scene: s, ...(await cpuProfile(page, client, 8)) };
        results.allocProfile = { scene: s, ...(await allocProfile(page, client, 6)) };
        console.log('profiled', s);
      }
    } catch (e) { results.scenes.push({ scene: s, error: String(e).slice(0, 500) }); console.log(s, 'ERROR', String(e).slice(0, 300)); }
  }
  // ---- leaks: chapter in/out several times
  if (!flag('no-leak')) {
    const snap = async (label) => {
      await page.evaluate(() => { window.gc?.(); window.gc?.(); });
      await page.waitForTimeout(400);
      return page.evaluate((label) => { const g = window.__game; const i = g.gr.renderer.info.memory; const s = window.__sceneStats(); return { label, heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), geometries: i.geometries, textures: i.textures, programs: i.programs, renderTargets: i.renderTargets, sceneObjects: s.objects, sceneGeos: s.geometries, sceneMats: s.materials, updaters: g.updaters.length, dynLights: g.lights.dynamic?.length, dom: s.dom }; }, label);
    };
    const rows = [];
    const chs = ['lt4', 'lt10', 'lt2'];
    await page.evaluate(() => window.__game.loadHub());
    await page.waitForTimeout(1500);
    rows.push(await snap('hub-0'));
    for (let c = 0; c < LEAK_CYCLES; c++) {
      const id = chs[c % chs.length];
      await page.evaluate(`(${SCENE_SETUP.chapter.toString()})(${JSON.stringify(id)})`);
      await page.waitForTimeout(2500);
      rows.push(await snap(`in-${id}-${c + 1}`));
      await page.evaluate(() => window.__game.loadHub());
      await page.waitForTimeout(2500);
      rows.push(await snap(`hub-${c + 1}`));
      console.log('leak', JSON.stringify(rows[rows.length - 1]));
    }
    results.leak = rows;
  }
  results.consoleErrors = [...new Set(logs)].slice(0, 30);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  console.log('wrote', OUT);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
