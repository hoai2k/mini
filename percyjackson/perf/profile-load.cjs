// CPU profile of the synchronous level builds (camp, a chapter) and of boot.
//   NODE_PATH=/opt/node22/lib/node_modules node profile-load.cjs [lt4,lt1,hub] [--out results/load-profile.json]
// Also measures per-entity draw cost: meshes per hero / monster / boss.
const fs = require('fs');
const path = require('path');
const { launch, seed, INSTRUMENT, BASE, WORK } = require('./lib.cjs');

const argv = process.argv.slice(2);
const targets = (argv.find((a) => !a.startsWith('--')) || 'hub,lt1,lt4,lt10').split(',');
const OUT = path.resolve(WORK, argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'results/load-profile.json');

function summarize(profile, n = 30) {
  const total = profile.endTime - profile.startTime;
  const dt = {};
  for (let i = 0; i < profile.samples.length; i++) dt[profile.samples[i]] = (dt[profile.samples[i]] ?? 0) + (profile.timeDeltas[i] ?? 0);
  const byFn = {};
  for (const nd of profile.nodes) {
    const t = dt[nd.id] ?? 0; if (!t) continue;
    const cf = nd.callFrame; const file = cf.url.replace(/^.*\/percyjackson\/game\//, '').replace(/^https:\/\/cdn\.jsdelivr\.net\/npm\//, 'cdn:');
    const k = `${cf.functionName || '(anon)'} ${file}:${cf.lineNumber + 1}`;
    byFn[k] = (byFn[k] ?? 0) + t;
  }
  return { totalMs: Math.round(total / 1000), top: Object.entries(byFn).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ fn: k, ms: +(v / 1000).toFixed(1), pct: +(100 * v / total).toFixed(1) })) };
}

(async () => {
  const W = +(process.env.PERF_W || 640), H = +(process.env.PERF_H || 360);
  const { browser, context, page } = await launch({ flags: process.env.PERF_FLAGS || 'webgl', width: W, height: H });
  await seed(context, { settings: { dynRes: false } });
  await page.addInitScript(INSTRUMENT);
  const client = await context.newCDPSession(page);
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 250 });
  // boot profile: from navigation to the title
  await client.send('Profiler.start');
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 240000, polling: 100 });
  const out = { boot: summarize((await client.send('Profiler.stop')).profile) };
  await page.evaluate(() => { const g = window.__game; const d = g.save.data; d.completed.lt1 = 1; d.completed.lt2 = 1; d.opening = 'done'; d.seenGearHint = true; g.ui.closeAll(); g.beginSession([{ device: 'kbm', hero: 'percy' }], { companions: ['annabeth', 'grover'] }); });
  await page.waitForTimeout(1500);
  out.loads = {};
  for (const t of targets) {
    await client.send('Profiler.start');
    const ms = await page.evaluate(async (t) => {
      const g = window.__game; const base = location.origin + '/percyjackson/game/js/';
      const { Mission } = await import(base + 'mission.js'); const { chapter } = await import(base + 'story/chapters.js');
      const t0 = performance.now();
      if (t === 'hub') g.loadHub(); else g.startMission(Mission.defForChapter(chapter(t), 1));
      const sync = performance.now() - t0;
      // and the frames until things settle (shader compiles happen in the first renders)
      const frames = await new Promise((res) => { const a = []; let last = performance.now(); let n = 0; const f = (now) => { a.push(now - last); last = now; if (++n < 20) requestAnimationFrame(f); else res(a); }; requestAnimationFrame(f); });
      return { syncMs: Math.round(sync), first20: frames.map((x) => Math.round(x)) };
    }, t);
    out.loads[t] = { ...ms, profile: summarize((await client.send('Profiler.stop')).profile, 25) };
    console.log(t, JSON.stringify(ms));
    await page.waitForTimeout(1000);
  }
  // per-entity draw-call cost: count meshes under each object
  out.entities = await page.evaluate(async () => {
    const g = window.__game; const base = location.origin + '/percyjackson/game/js/';
    const { MONSTERS, buildMonsterModel } = await import(base + 'entities/monsters.js');
    const { BOSS_DEFS: BOSSES } = await import(base + 'entities/bosses.js');
    const { buildHeroModel } = await import(base + 'entities/models.js');
    const { HERO_IDS } = await import(base + 'heroes/index.js');
    const count = (root) => { let meshes = 0, geos = new Set(), mats = new Set(), tris = 0; root.traverse((o) => { if (o.isMesh) { meshes++; geos.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m)); const gg = o.geometry; tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; } }); return { meshes, geos: geos.size, mats: mats.size, tris: Math.round(tris) }; };
    const r = { heroes: {}, monsters: {}, bosses: {}, sharedGeometryBetweenTwoBuilds: null };
    for (const id of HERO_IDS) { try { r.heroes[id] = count(buildHeroModel(id).root); } catch (e) { r.heroes[id] = String(e); } }
    for (const k of Object.keys(MONSTERS)) { try { r.monsters[k] = count(buildMonsterModel(MONSTERS[k].model).root); } catch (e) { r.monsters[k] = String(e); } }
    for (const [k, b] of Object.entries(BOSSES)) { try { r.bosses[k] = count(b.build().root); } catch (e) { r.bosses[k] = String(e); } }
    // do two builds of the same monster share geometry?
    const a = buildMonsterModel(MONSTERS.pup.model).root, b = buildMonsterModel(MONSTERS.pup.model).root;
    const ga = new Set(); a.traverse((o) => o.geometry && ga.add(o.geometry)); let shared = 0, tot = 0; b.traverse((o) => { if (o.geometry) { tot++; if (ga.has(o.geometry)) shared++; } });
    r.sharedGeometryBetweenTwoBuilds = `${shared}/${tot}`;
    // player objects in the scene
    r.livePlayers = g.players.map((p) => ({ hero: p.hero, ...count(p.object) }));
    return r;
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log('wrote', OUT);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
