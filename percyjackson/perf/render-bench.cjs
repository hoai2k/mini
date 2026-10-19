// Rendering benchmark: per model in the model workbench, and busy scenes in
// the game. For each it records draw calls, triangles, geometries, textures,
// GPU programs (pipelines), materials and meshes, shadow casters, and the CPU
// time of a frame split into the pose (rig.animate, its floor and grip guards
// counted apart), the rig's tick (rig.tick: swaying parts, keepAbove guards),
// the flames (flames.js advance) and the render submit (renderer.render), plus
// long tasks, rAF intervals and the JS allocation rate (a sampling heap
// profile over the window, objects collected by GC included).
//
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/render-bench.cjs [wb] [game] [bg]
//     [--ids automaton,cerberus,...] [--anim idle|game:inflate|...] [--secs N] [--out file.json] [--shots dir]
//
//   wb    each model alone in the workbench (?lint=0&lazy=1: no background work)
//   bg    the automaton in the workbench as it opens by default (thumbnails and
//         the animation lint of every model running behind it): long tasks and frame gaps
//   game  the open world with a fodder swarm, and a chapter with eight automatons
//   compiles  after a chapter (lt2) and the open world (camp) have loaded and
//         their shader warm-up has run, each kind in turn is spawned, hit and
//         killed, and every render pipeline (shader program) the renderer has
//         to build on the way is counted with the time it took: a hitch in play
//   shots each model drawn the same way every time (Math.random seeded, 45
//         frames of its idle at a fixed 1/30 s, a fixed camera and lights),
//         to --shots dir as shot-<id>.png, so two runs (before and after a
//         change) compare pixel for pixel
//
// Serves the repository on PERF_PORT (default 8765) if nothing is there.
// Software rendering (SwiftShader): GPU time means nothing, CPU time and
// counts do. Results print as a table and go to --out (default
// local/percyjackson-perf/results/render-bench.json).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { launch, WORK } = require('./lib.cjs');

const PORT = +(process.env.PERF_PORT || 8765);
const ROOT = path.resolve(__dirname, '../..');
const GAME = `http://127.0.0.1:${PORT}/percyjackson/game/`;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const modes = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
const MODES = new Set(modes.length ? modes : ['wb', 'bg', 'game']);
const IDS = opt('ids', 'automaton,cerberus,hellhound,minotaur,kind:hellhound,spider,scorpion,lab_bronze_warden').split(',');
const ANIM = opt('anim', 'idle');
const SECS = +opt('secs', 6);
const OUT = opt('out', path.join(WORK, 'results', 'render-bench.json'));
const SHOTS = opt('shots', null);
const SHOT_IDS = opt('shot-ids', 'automaton,cerberus,hellhound,minotaur,spider,scorpion,kind:hellhound,percy').split(',');

async function serve() {
  const up = async () => { try { return (await fetch(GAME)).ok; } catch { return false; } };
  if (await up()) return;
  spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', detached: true }).unref();
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250));
}

// ---- in-page: wrap the parts of a frame (ms accumulated per section)
const INSTALL = () => {
  const P = window.__rb = { acc: {}, frames: [], lt: [], recording: false };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (P.recording) P.lt.push(e.duration); }).observe({ type: 'longtask' }); } catch { /* none */ }
  P.wrap = (obj, name, key) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].__rb) return;
    const f = obj[name];
    const w = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { if (P.recording) P.acc[key] = (P.acc[key] ?? 0) + performance.now() - t; } };
    w.__rb = true; obj[name] = w;
  };
  let last = 0;
  const tick = (t) => { if (P.recording && last) P.frames.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  // scene counts
  P.sceneStats = (scene) => {
    const s = { meshes: 0, visible: 0, casters: 0, instanced: 0, mats: new Set(), geos: new Set() };
    scene.traverse((o) => {
      if (!o.isMesh) return;
      s.meshes++; let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) { vis = false; break; }
      if (!vis) return;
      s.visible++; if (o.castShadow) s.casters++; if (o.isInstancedMesh) s.instanced++;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && s.mats.add(m)); if (o.geometry) s.geos.add(o.geometry);
    });
    return { meshes: s.meshes, visible: s.visible, casters: s.casters, instanced: s.instanced, materials: s.mats.size, geometries: s.geos.size };
  };
  P.info = (R) => {
    const i = R.info, pr = R._pipelines?.programs;
    return { draws: i.render.drawCalls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, programs: i.memory.programs, pipelines: R._pipelines?.caches?.size ?? null, vs: pr?.vertex?.size, fs: pr?.fragment?.size };
  };
};

const stats = (a) => { const s = [...a].sort((x, y) => x - y); const q = (p) => (s.length ? s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] : 0); return { n: a.length, avg: a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, p50: q(50), p95: q(95), max: s.length ? s[s.length - 1] : 0 }; };
const r2 = (x) => Math.round(x * 100) / 100;

async function allocStart(client) { await client.send('HeapProfiler.enable'); await client.send('HeapProfiler.startSampling', { samplingInterval: 8192, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); }
async function allocStop(client, secs) {
  const { profile } = await client.send('HeapProfiler.stopSampling');
  let total = 0; const by = new Map();
  const walk = (n) => { total += n.selfSize; if (n.selfSize) { const k = `${n.callFrame.functionName || '(anon)'} ${(n.callFrame.url || '').split('/').slice(-1)[0]}:${n.callFrame.lineNumber + 1}`; by.set(k, (by.get(k) ?? 0) + n.selfSize); } for (const c of n.children) walk(c); };
  walk(profile.head);
  const top = [...by].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${(v / 1024 / secs).toFixed(0)} KB/s`);
  return { kbPerSec: Math.round(total / 1024 / secs), top };
}

// ---- workbench: one model
async function benchModel(id, { anim = ANIM, bg = false, secs = SECS } = {}) {
  const { browser, page, context } = await launch({ flags: 'webgl', width: 960, height: 600 });
  await context.addInitScript(INSTALL);
  const client = await context.newCDPSession(page);
  const q = bg ? '' : '?lint=0&lazy=1';
  await page.goto(`${GAME}workbench/index.html${q}${q ? '&' : '?'}turn=0#id=${encodeURIComponent(id)}`);
  await page.waitForFunction(() => window.__wb?.current?.rig, null, { timeout: 180000 });
  if (anim !== 'idle') await page.evaluate((a) => window.__wb.setAnim(a), anim);
  // (alone: the thumbnails of the tiles on screen done first; then the pipelines compiled and the pose settled)
  if (!bg) await page.waitForFunction(() => window.__wb.queueLength() === 0 && window.__wb.thumbs.size > 0, null, { timeout: 180000, polling: 250 }).catch(() => {});
  await page.waitForTimeout(bg ? 500 : 2500);
  await page.evaluate(() => {
    const P = window.__rb, wb = window.__wb, R = wb.renderer;
    const rig = wb.game?.rig ?? wb.current.rig;
    P.wrap(R, 'render', 'render');
    P.wrap(rig, 'animate', 'animate');
    P.wrap(rig, 'tick', 'tick');
    if (rig.floorGuard) P.wrap(rig, 'floorGuard', 'guards');
    if (rig.gripGuard) P.wrap(rig, 'gripGuard', 'guards');
    for (const F of rig.flames ?? []) P.wrap(F, 'advance', 'flames');
    if (wb.game) P.wrap(wb.game, 'step', 'gameStep');
    // the whole frame: the workbench's animation loop
    const A = R._animation, cb = A._animationLoop;
    if (cb) A.setAnimationLoop((t, f) => { const t0 = performance.now(); cb(t, f); if (P.recording) { P.acc.frame = (P.acc.frame ?? 0) + performance.now() - t0; P.acc.n = (P.acc.n ?? 0) + 1; } });
  });
  await allocStart(client);
  await page.evaluate(() => { const P = window.__rb; P.acc = {}; P.frames = []; P.lt = []; P.recording = true; });
  await page.waitForTimeout(secs * 1000);
  const r = await page.evaluate(() => {
    const P = window.__rb, wb = window.__wb; P.recording = false;
    const n = P.acc.n || 1, per = {}; for (const [k, v] of Object.entries(P.acc)) if (k !== 'n') per[k] = v / n;
    return { per, frames: P.frames, lt: P.lt, info: P.info(wb.renderer), scene: P.sceneStats(wb.scene), n };
  });
  const alloc = await allocStop(client, secs);
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.evaluate(() => { const wb = window.__wb; }); await page.locator('#stage').screenshot({ path: path.join(SHOTS, `wb-${id.replace(/[^a-z0-9_]+/gi, '_')}.png`) }); }
  await browser.close();
  const p = r.per, anim0 = (p.animate ?? 0) - (p.guards ?? 0);
  return {
    id, anim, bg, frames: r.n, fps: r2(r.frames.length / secs), raf: stats(r.frames), longtasks: { n: r.lt.length, ms: Math.round(r.lt.reduce((a, b) => a + b, 0)), max: Math.round(Math.max(0, ...r.lt)) },
    ms: { frame: r2(p.frame ?? 0), animate: r2(anim0), guards: r2(p.guards ?? 0), tick: r2((p.tick ?? 0) - (p.flames ?? 0)), flames: r2(p.flames ?? 0), gameStep: r2(p.gameStep ?? 0), render: r2(p.render ?? 0) },
    info: r.info, scene: r.scene, alloc,
  };
}

// ---- the game: busy scenes
// load the scene (then settle: its shader warm-up), and spawn its monsters
const GAME_SETUP = async (scene) => {
  const g = window.__game, base = location.origin + '/percyjackson/game/js/';
  const d = g.save.data; d.opening = 'done'; d.seenGearHint = true;
  const { CHAPTERS, chapter } = await import(base + 'story/chapters.js');
  for (const c of CHAPTERS) d.completed[c.id] = 1;
  g.ui.closeAll(); if (g.state !== 'playing') g.beginSession([{ device: 'kbm', hero: 'percy' }], { companions: ['annabeth', 'grover'] });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const { Mission } = await import(base + 'mission.js');
  if (scene === 'automatons') g.startMission(Mission.defForChapter(chapter('lt2'), 1));
  else if (scene === 'openworld') g.loadHub();   // (camp in the middle of the open world: world/openworld.js)
  for (let i = 0; i < 60 && g.state !== 'playing'; i++) { g.ui.closeAll?.(); await wait(250); }
  // immortal party
  g.addUpdater?.(() => { for (const q of g.players) { q.hp = q.maxHp; q.downed = false; q.dead = false; } return true; });
  return scene;
};
const GAME_SPAWN = (scene) => {
  const g = window.__game, p = g.players.find((q) => !q.ai);
  if (scene === 'automatons') for (let i = 0; i < 8; i++) g.spawnEnemy('automaton', p.pos.clone().add({ x: Math.cos(i) * 9, y: 0, z: Math.sin(i) * 9 }));
  else if (scene === 'openworld') {
    const kinds = ['karpos', 'karpos_slinger', 'myrmex', 'boarlet', 'colchis_calf', 'crab', 'pup', 'spider'];
    for (let i = 0; i < 24; i++) { const a = i * 0.7, r = 4 + (i % 6) * 1.1; g.spawnEnemy(kinds[i % kinds.length], p.pos.clone().add({ x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r })); }
  }
  return `${scene}: ${g.enemies.length} enemies`;
};

async function benchGame(scene, secs = SECS) {
  const { browser, page, context, logs } = await launch({ flags: 'webgl', width: 960, height: 540 });
  await context.addInitScript(INSTALL);
  await context.addInitScript(() => { try { if (!sessionStorage.getItem('__rbs')) { sessionStorage.setItem('__rbs', '1'); localStorage.clear(); localStorage.setItem('half-blood-quests-settings-v1', JSON.stringify({ dynRes: false, quality: 'medium' })); } } catch { /* blocked */ } });
  const client = await context.newCDPSession(page);
  await page.goto(GAME, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 240000, polling: 100 });
  const label = await page.evaluate(GAME_SETUP, scene).catch((e) => 'setup failed: ' + e.message);
  await page.waitForTimeout(+opt('settle', 30000));   // (the level's shader warm-up done: software rendering compiles slowly)
  const spawned = await page.evaluate(GAME_SPAWN, scene);
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const P = window.__rb, g = window.__game, base = location.origin + '/percyjackson/game/js/';
    const [{ Enemy }, { Player }] = await Promise.all([import(base + 'entities/enemy.js'), import(base + 'entities/player.js')]);
    P.wrap(g.gr, 'render', 'render');
    P.wrap(Enemy.prototype, 'update', 'enemies');
    P.wrap(Player.prototype, 'update', 'players');
    P.wrap(g.particles, 'upload', 'particles');
    P.wrap(g.lights, 'update', 'lights');
    const f = g.frame.bind(g);
    g.frame = function () { const t0 = performance.now(); f(); if (P.recording) { const d = performance.now() - t0; P.acc.frame = (P.acc.frame ?? 0) + d; P.acc.n = (P.acc.n ?? 0) + 1; (P.ft ??= []).push(d); } };
    // per-enemy rig time: animate and tick of every rig (wrapped as they spawn)
    for (const e of g.enemies) { P.wrap(e.rig, 'animate', 'rigAnimate'); P.wrap(e.rig, 'tick', 'rigTick'); for (const F of e.rig.flames ?? []) P.wrap(F, 'advance', 'flames'); if (e.rig.floorGuard) P.wrap(e.rig, 'floorGuard', 'guards'); if (e.rig.gripGuard) P.wrap(e.rig, 'gripGuard', 'guards'); }
  });
  await allocStart(client);
  await page.evaluate(() => { const P = window.__rb; P.acc = {}; P.frames = []; P.lt = []; P.recording = true; });
  await page.waitForTimeout(secs * 1000);
  const r = await page.evaluate(() => {
    const P = window.__rb, g = window.__game; P.recording = false;
    const n = P.acc.n || 1, per = {}; for (const [k, v] of Object.entries(P.acc)) if (k !== 'n') per[k] = v / n;
    return { per, frames: P.frames, ft: P.ft ?? [], lt: P.lt, info: P.info(g.gr.renderer), scene: P.sceneStats(g.scene), n, enemies: g.enemies.length, quality: g.gr.quality, pr: g.gr.pixelRatio };
  });
  const alloc = await allocStop(client, secs);
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `game-${scene}.png`) }); }
  await browser.close();
  const p = r.per;
  return {
    id: scene, label: spawned, quality: r.quality, pixelRatio: r.pr, enemies: r.enemies, frames: r.n, fps: r2(r.frames.length / secs), raf: stats(r.frames), longtasks: { n: r.lt.length, ms: Math.round(r.lt.reduce((a, b) => a + b, 0)), max: Math.round(Math.max(0, ...r.lt)) },
    frameCpu: { p50: r2(stats(r.ft).p50), p95: r2(stats(r.ft).p95), max: r2(stats(r.ft).max) },
    ms: { frame: r2(p.frame ?? 0), enemies: r2(p.enemies ?? 0), rigAnimate: r2((p.rigAnimate ?? 0) - (p.guards ?? 0)), guards: r2(p.guards ?? 0), rigTick: r2((p.rigTick ?? 0) - (p.flames ?? 0)), flames: r2(p.flames ?? 0), players: r2(p.players ?? 0), particles: r2(p.particles ?? 0), lights: r2(p.lights ?? 0), render: r2(p.render ?? 0) },
    info: r.info, scene: r.scene, alloc, errors: logs.filter((l) => l.startsWith('[pageerror]')).slice(0, 5),
  };
}

// ---- shader compiles in play
const COMPILE_KINDS = opt('kinds', 'automaton,scorpion,cyclops,harpy,karpos,myrmex,pup,spider').split(',');
const WARM_WAIT = +opt('warm-wait', 40000);   // ms after a load before the spawns (software rendering compiles slowly)
async function benchCompiles(scene) {
  const { browser, page, context } = await launch({ flags: 'webgl', width: 640, height: 360 });
  await context.addInitScript(() => { try { if (!sessionStorage.getItem('__rbs')) { sessionStorage.setItem('__rbs', '1'); localStorage.clear(); localStorage.setItem('half-blood-quests-settings-v1', JSON.stringify({ dynRes: false, quality: 'medium' })); } } catch { /* blocked */ } });
  await page.goto(GAME, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 240000, polling: 100 });
  const out = await page.evaluate(async ([kinds, scene, warmWait]) => {
    const g = window.__game, base = location.origin + '/percyjackson/game/js/';
    const { CHAPTERS, chapter } = await import(base + 'story/chapters.js'); const { Mission } = await import(base + 'mission.js');
    const d = g.save.data; d.opening = 'done'; d.seenGearHint = true; for (const c of CHAPTERS) d.completed[c.id] = 1;
    g.ui.closeAll(); g.beginSession([{ device: 'kbm', hero: 'percy' }], { companions: [] });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const B = g.gr.renderer.backend, f = B.createRenderPipeline.bind(B);
    let log = null;
    B.createRenderPipeline = (ro, p) => { const t = performance.now(); const r = f(ro, p); if (log) log.push({ ms: performance.now() - t, what: `${ro.material.name || ro.material.type} on ${ro.object.name || ro.object.type}` }); return r; };
    log = [];
    if (scene === 'hub') g.loadHub(); else g.startMission(Mission.defForChapter(chapter(scene), 1));
    for (let i = 0; i < 40 && g.state !== 'playing'; i++) { g.ui.closeAll?.(); await wait(250); }
    await wait(warmWait);   // (the warm-up: builds and compiles in the background as the level starts)
    const load = log; log = [];
    g.addUpdater(() => { for (const q of g.players) { q.hp = q.maxHp; q.dead = false; q.downed = false; } return true; });
    const p = g.players[0], steps = [];
    for (const k of kinds) {
      const e = g.spawnEnemy(k, p.pos.clone().add({ x: 3, y: 0, z: 2 })); if (!e) continue; e.spawnT = 0;
      await wait(1200); steps.push([k + ' spawned', log]); log = [];
      e.takeDamage?.(1, p, {}); await wait(700); steps.push([k + ' hit', log]); log = [];
      e.hp = 0; e.die?.({}); await wait(1200); steps.push([k + ' killed', log]); log = [];
    }
    const sum = (L) => ({ n: L.length, ms: Math.round(L.reduce((a, b) => a + b.ms, 0)), max: Math.round(Math.max(0, ...L.map((x) => x.ms))) });
    return { load: sum(load), play: sum(steps.flatMap(([, L]) => L)), steps: steps.map(([k, L]) => [k, L.length, Math.round(L.reduce((a, b) => a + b.ms, 0)), [...new Set(L.map((x) => x.what))].join('; ')]) };
  }, [COMPILE_KINDS, scene, WARM_WAIT]);
  await browser.close();
  return { id: scene, ...out };
}

// ---- deterministic model shots
function shotPage() {
  const wb = fs.readFileSync(path.join(ROOT, 'percyjackson/game/workbench/models.html'), 'utf8');
  const map = wb.match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
  return `<!doctype html><html><head><meta charset="utf-8">${map}
<script>{ let a = 12345; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }</script>
<style>body{margin:0;background:#000}</style></head><body><script type="module">
import * as THREE from 'three/webgpu';
import { buildHeroModel } from '../js/entities/models.js';
import { buildMonsterModel, MONSTERS, MONSTER_IDS } from '../js/entities/monsters.js';
import { BOSS_DEFS, BOSS_IDS } from '../js/entities/bosses.js';
import { CHAMPION_SHOWCASE, buildShowcase } from '../js/entities/champions.js';
import { HERO_LOOKS } from '../js/entities/models.js';
import { poseStep, prepStatic } from './ingame.js';
const find = (id) => HERO_LOOKS[id] ? ['heroes', () => buildHeroModel(id)] : MONSTERS[id] && MONSTER_IDS.includes(id) ? ['monsters', () => buildMonsterModel(MONSTERS[id].model)] : BOSS_DEFS[id] ? ['bosses', () => BOSS_DEFS[id].build()] : CHAMPION_SHOWCASE.includes(id) ? ['champions', () => buildShowcase(id)] : null;
const R = new THREE.WebGPURenderer({ antialias: false }); R.setPixelRatio(1); R.setSize(480, 480);
R.toneMapping = THREE.AgXToneMapping; R.toneMappingExposure = 1.15; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
document.body.append(R.domElement); await R.init();
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a2430);
const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 600);
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x7a6a50, 0.9));
const sun = new THREE.DirectionalLight(0xfff0d6, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
const ground = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x3a3226, roughness: 0.95 })); ground.receiveShadow = true; scene.add(ground);
window.shot = async (id) => {
  const f = find(id); if (!f) return { error: 'no such model ' + id };
  const [group, build] = f;
  const rig = prepStatic(group, id, build());
  rig.root.rotation.y = 0.6; scene.add(rig.root);
  const st = { t: 0 }; for (let i = 0; i < 45; i++) poseStep(rig, 'idle', st, 1 / 30);
  rig.root.updateMatrixWorld(true);
  // (framed on the vertices themselves, so a change in how the meshes are split doesn't move the camera)
  const box = new THREE.Box3(), v = new THREE.Vector3(); rig.root.traverse((o) => { const P = o.isMesh && !o.userData.flames && o.geometry?.attributes?.position; if (P) for (let i = 0; i < P.count; i++) box.expandByPoint(v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld)); });
  const c = box.getCenter(new THREE.Vector3()), r = Math.max(0.6, box.getBoundingSphere(new THREE.Sphere()).radius);
  cam.position.copy(c).add(new THREE.Vector3(0.5, 0.28, 1).normalize().multiplyScalar(r / Math.sin(THREE.MathUtils.degToRad(15)) * 1.04)); cam.lookAt(c); cam.updateMatrixWorld();
  sun.position.copy(c).add(new THREE.Vector3(0.55, 1.05, 0.8).normalize().multiplyScalar(r * 5)); sun.target.position.copy(c);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -r * 2; sc.right = sc.top = r * 2; sc.near = r * 0.5; sc.far = r * 12; sc.updateProjectionMatrix();
  ground.scale.setScalar(Math.max(2.4, r * 2.4));
  await R.compileAsync(scene, cam); R.render(scene, cam); R.render(scene, cam);
  window.__last = rig;
  return { ok: true, group };
};
window.clear = () => { if (window.__last) scene.remove(window.__last.root); };
window.ready = true;
</script></body></html>`;
}
async function takeShots(dir) {
  const { browser, page } = await launch({ flags: 'webgl', width: 480, height: 480 });
  const url = GAME + 'workbench/__shots.html';
  await page.route(url, (r) => r.fulfill({ contentType: 'text/html', body: shotPage() }));
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 300)));
  await page.goto(url);
  await page.waitForFunction(() => window.ready || false, null, { timeout: 180000 });
  fs.mkdirSync(dir, { recursive: true });
  const done = [];
  for (const id of SHOT_IDS) {
    const r = await page.evaluate((i) => window.shot(i), id);
    if (r.error) { console.log(id, r.error); continue; }
    const f = path.join(dir, `shot-${id.replace(/[^a-z0-9_]+/gi, '_')}.png`);
    await page.locator('canvas').screenshot({ path: f }); done.push(f);
    await page.evaluate(() => window.clear());
  }
  await browser.close();
  if (errors.length) console.log('page errors:', errors.join('\n'));
  return done;
}

(async () => {
  await serve();
  const out = { when: new Date().toISOString(), anim: ANIM, secs: SECS, wb: [], bg: [], game: [] };
  if (MODES.has('shots')) { const f = await takeShots(SHOTS ?? path.join(WORK, 'results', 'shots')); console.log('shots:', f.join(' ')); if (MODES.size === 1) return; }
  if (MODES.has('compiles')) for (const sc of ['lt2', 'hub']) { const r = await benchCompiles(sc); (out.compiles ??= []).push(r); console.log(`compiles ${sc}: load ${r.load.n} pipelines ${r.load.ms} ms; in play ${r.play.n} pipelines ${r.play.ms} ms (worst ${r.play.max} ms)`); for (const st of r.steps) if (st[1]) console.log('   ', st.join(' | ')); }
  if (MODES.has('wb')) for (const id of IDS) { const r = await benchModel(id); out.wb.push(r); console.log(JSON.stringify(r)); }
  if (MODES.has('bg')) { const r = await benchModel('automaton', { bg: true, secs: 20 }); out.bg.push(r); console.log(JSON.stringify(r)); }
  if (MODES.has('game')) for (const s of ['openworld', 'automatons']) { const r = await benchGame(s); out.game.push(r); console.log(JSON.stringify(r)); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  const row = (r) => [r.id.padEnd(18), String(r.info.draws).padStart(5), String(r.info.tris).padStart(7), String(r.scene.visible).padStart(5), String(r.scene.casters).padStart(5), String(r.scene.materials).padStart(4), String(r.info.programs).padStart(4), String(r.info.tex).padStart(4),
    ...['frame', 'animate', 'rigAnimate', 'guards', 'tick', 'rigTick', 'flames', 'render'].filter((k) => r.ms[k] != null).map((k) => `${k}=${r.ms[k]}`), ...(r.frameCpu ? [`p50=${r.frameCpu.p50}`, `p95=${r.frameCpu.p95}`] : []), `alloc=${r.alloc.kbPerSec}KB/s`, `lt=${r.longtasks.n}/${r.longtasks.ms}ms`, `raf95=${r2(r.raf.p95)}`].join(' ');
  console.log('\nmodel              draws    tris  mesh  cast  mat prog  tex  (ms per frame)');
  for (const r of [...out.wb, ...out.bg, ...out.game]) console.log(row(r));
  console.log('\nwritten', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
