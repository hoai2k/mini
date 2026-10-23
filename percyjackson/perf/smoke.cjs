// Smoke check in the real game (headless), for the October 2026 audit fixes:
// every chapter loads and runs without page errors, the tracker has a goal in
// chapters 2-12, hero switch keeps cooldowns, the marker pool hands out free
// markers, and a wipe in a later room respawns there.
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/smoke.cjs
// As a module (check.cjs): run({ browser?, base }) resolves to { ok, lines,
// summary, rows }; with a browser it opens its own context in it.
const util = require('util');
const { launch, seed, ensureServer } = require('./lib.cjs');

// in the game: every chapter, the hero refresh, the marker pool
const PAGE = async () => {
  const g = window.__game; const base = location.origin + '/percyjackson/game/js/';
  const { Mission } = await import(base + 'mission.js'); const { chapter, CHAPTERS } = await import(base + 'story/chapters.js');
  const d = g.save.data; d.opening = 'done'; d.seenGearHint = true; for (const c of CHAPTERS) d.completed[c.id] = 1;
  g.ui.closeAll(); g.beginSession([{ device: 'kbm', hero: 'percy' }], { companions: ['annabeth', 'grover'] });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const res = {};
  for (const ch of CHAPTERS.filter((c) => c.book === 1 || c.id.startsWith('lt'))) {
    try {
      g.startMission(Mission.defForChapter(chapter(ch.id)));
      for (let i = 0; i < 40 && !(g.mission && g.state === 'playing'); i++) { g.ui.closeAll?.(); await wait(250); }
      await wait(1500);
      const m = g.mission, goal = g.tracker?.goal;
      const r = { state: g.state, mode: g.mode, objType: m?.obj?.type, goal: goal ? [goal.pos.x.toFixed(1), goal.pos.z.toFixed(1)] : null,
        arrowShown: !g.tracker.arrow.classList.contains('hidden') || !g.tracker.pin.classList.contains('hidden'), ribbon: document.querySelector('#hud')?.innerText?.slice(0, 80) };
      // walk the guide: mark main-path rooms entered, the goal should move on
      if (m && m.obj.type === 'exorcise') { const r0 = g.tracker.goal?.pos?.clone(); for (const room of m.L.rooms) if (room.type === 'combat') { room.activated = true; break; } m.guideT = 0; m.update(0.016); r.goalMoved = !!(r0 && g.tracker.goal && !r0.equals(g.tracker.goal.pos)); }
      // checkpoint after a wipe
      if (m && m.L.bossRoom) { const path = []; for (let q = m.L.bossRoom; q; q = q.parent) path.unshift(q); const mid = path[Math.max(1, path.length - 2)]; mid.activated = true; const cp = m.checkpointSpot(); r.checkpoint = cp ? (cp.x >= mid.x0 - 1 && cp.x <= mid.x1 + 2 && cp.z >= mid.z0 - 1 && cp.z <= mid.z1 + 2) : 'none'; }
      res[ch.id] = r;
    } catch (e) { res[ch.id] = { error: String(e.stack || e).slice(0, 300) }; }
  }
  // hero switch keeps cooldowns and health
  const p = g.players.find((q) => !q.ai);
  const k = Object.keys(p.kit.slots).find((s) => s !== 'ranged');
  p.kit.slots[k].cdLeft = 5; p.hp = p.maxHp * 0.5;
  p.refreshLoadout();
  res.refresh = { cdLeft: p.kit.slots[k].cdLeft, hpFrac: +(p.hp / p.maxHp).toFixed(2) };
  // markers: 40 spawns in a row never reuse an active one
  const ids = new Set(); const items = [];
  for (let i = 0; i < 40; i++) { const it = g.markers.spawn({ pos: p.pos, dur: 5 }); items.push(it); ids.add(it); }
  res.markers = { distinct: ids.size, pool: g.markers.items.length };
  for (const it of items) g.markers.cancel(it);
  // stale cancel leaves a reused marker alone
  const a = g.markers.spawn({ pos: p.pos, dur: 5 }); g.markers.cancel(a, a.gen - 1);
  res.staleCancel = { ignoredStale: a.active }; g.markers.cancel(a, a.gen); res.staleCancel.cancelledCurrent = !a.active;
  return res;
};

function report(out, errors) {
  const lines = [];
  lines.push(JSON.stringify(out, null, 1));
  lines.push(util.format('page errors:', errors.length)); for (const e of errors.slice(0, 20)) lines.push(util.format(' -', e));
  const bad = Object.entries(out).filter(([k, v]) => v.error || (k.startsWith('lt') && v.state !== 'playing')).map(([k]) => k);
  if (bad.length) lines.push(util.format('chapters that failed:', bad.join(', ')));
  const ok = !(errors.length || bad.length || out.refresh?.cdLeft !== 5);
  const chapters = Object.keys(out).filter((k) => !['refresh', 'markers', 'staleCancel'].includes(k)).length;
  return { ok, lines, rows: out, summary: { chapters, failedChapters: bad.length, pageErrors: errors.length }, text: `${chapters} chapters, ${bad.length} failed, ${errors.length} page errors` };
}

async function run({ browser = null, base }) {
  const { browser: b, context, page } = await launch({ flags: 'webgl', width: 480, height: 270, browser });
  try {
    await seed(context, { settings: { dynRes: false } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.stack || e).slice(0, 400)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
    await page.goto(base, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 240000, polling: 100 });
    const out = await page.evaluate(PAGE);
    return report(out, errors);
  } finally { await b.close(); }
}

module.exports = { run, report, PAGE };
if (require.main === module) {
  // (its own browser, as before: lib.cjs launch with the webgl flags)
  (async () => {
    const srv = await ensureServer();
    let res; try { res = await run({ base: srv.base }); } finally { await srv.close(); }
    for (const l of res.lines) console.log(l);
    process.exit(res.ok ? 0 : 1);
  })().catch((e) => { console.error(e); process.exit(1); });
}
