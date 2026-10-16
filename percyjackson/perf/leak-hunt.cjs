// Leak hunt: count live instances of the game's classes (CDP Runtime.queryObjects)
// after N camp <-> chapter round trips, and optionally save a heap snapshot.
//   NODE_PATH=/opt/node22/lib/node_modules node leak-hunt.cjs [cycles=3] [--snapshot]
const fs = require('fs');
const path = require('path');
const { launch, seed, INSTRUMENT, BASE, WORK } = require('./lib.cjs');
const cycles = +(process.argv[2] || 3);
const snapshot = process.argv.includes('--snapshot');

(async () => {
  const { browser, context, page } = await launch({ flags: 'webgl', width: 480, height: 270 });
  await seed(context, { settings: { dynRes: false } });
  await page.addInitScript(INSTRUMENT);
  const client = await context.newCDPSession(page);
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 240000, polling: 100 });
  await page.evaluate(async () => {
    const g = window.__game; const base = location.origin + '/percyjackson/game/js/';
    const d = g.save.data; d.completed.lt1 = 1; d.completed.lt2 = 1; d.opening = 'done'; d.seenGearHint = true;
    g.ui.closeAll(); g.beginSession([{ device: 'kbm', hero: 'percy' }], { companions: ['annabeth', 'grover'] });
    const mods = {
      World: (await import(base + 'world/voxel.js')).World, Enemy: (await import(base + 'entities/enemy.js')).Enemy,
      Mission: (await import(base + 'mission.js')).Mission, Decorations: (await import(base + 'world/deco.js')).Decorations,
      Player: (await import(base + 'entities/player.js')).Player, Rig: (await import(base + 'entities/character.js')).Rig,
      LiveSign: (await import(base + 'world/liveSign.js')).LiveSign, Boats: (await import(base + 'world/boats.js')).Boats,
    };
    const THREE = await import('three/webgpu');
    Object.assign(mods, { Mesh: THREE.Mesh, BufferGeometry: THREE.BufferGeometry, Texture: THREE.Texture, Material: THREE.Material, RenderTarget: THREE.RenderTarget, Object3D: THREE.Object3D });
    window.__protos = Object.fromEntries(Object.entries(mods).filter(([, v]) => v).map(([k, v]) => [k, v.prototype]));
    window.__mission = (await import(base + 'mission.js')).Mission; window.__chapter = (await import(base + 'story/chapters.js')).chapter;
  });
  if (process.argv.includes('--patch')) {
    // candidate fix, applied in the page only: objects that leave the scene in clearLevel get a 'dispose' event,
    // which is what makes three.js drop their RenderObjects (and so the meshes, groups and levels they hold)
    await page.evaluate(() => {
      const g = window.__game, orig = g.clearLevel.bind(g);
      g.clearLevel = function () {
        const before = new Set(); g.scene.traverse((o) => before.add(o));
        const r = orig();
        const after = new Set(); g.scene.traverse((o) => after.add(o));
        for (const o of before) if (!after.has(o)) o.dispatchEvent({ type: 'dispose' });
        return r;
      };
    });
  }
  const count = async () => {
    await page.evaluate(() => { window.gc?.(); window.gc?.(); });
    const out = {};
    const names = await page.evaluate(() => Object.keys(window.__protos));
    for (const n of names) {
      const { result } = await client.send('Runtime.evaluate', { expression: `window.__protos[${JSON.stringify(n)}]` });
      const { objects } = await client.send('Runtime.queryObjects', { prototypeObjectId: result.objectId });
      const { result: len } = await client.send('Runtime.callFunctionOn', { objectId: objects.objectId, functionDeclaration: 'function(){return this.length}', returnByValue: true });
      out[n] = len.value;
      await client.send('Runtime.releaseObject', { objectId: objects.objectId });
    }
    out.heapMB = await page.evaluate(() => +(performance.memory.usedJSHeapSize / 1048576).toFixed(1));
    return out;
  };
  const rows = [];
  await page.waitForTimeout(1500);
  rows.push({ at: 'hub-0', ...(await count()) }); console.log(JSON.stringify(rows.at(-1)));
  for (let c = 0; c < cycles; c++) {
    await page.evaluate(() => window.__game.startMission(window.__mission.defForChapter(window.__chapter('lt4'), 1)));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.loadHub());
    await page.waitForTimeout(1500);
    rows.push({ at: `hub-${c + 1}`, ...(await count()) }); console.log(JSON.stringify(rows.at(-1)));
  }
  // hub -> hub only (no chapter): does camp alone leak?
  for (let c = 0; c < 2; c++) { await page.evaluate(() => window.__game.loadHub()); await page.waitForTimeout(1000); }
  rows.push({ at: 'hub-x2-only', ...(await count()) }); console.log(JSON.stringify(rows.at(-1)));
  // what holds an old World? walk from the game object (bounded BFS) for references to a World that isn't g.world
  const paths = await page.evaluate(() => {
    const g = window.__game, W = Object.getPrototypeOf(g.world);
    const seen = new Set(), out = [];
    const q = [[g, 'game'], [window, 'window']];
    let n = 0;
    while (q.length && n < 400000 && out.length < 15) {
      const [o, p] = q.shift(); n++;
      if (!o || (typeof o !== 'object' && typeof o !== 'function') || seen.has(o)) continue;
      seen.add(o);
      if (Object.getPrototypeOf(o) === W && o !== g.world) { out.push(p); continue; }
      if (o === g.world || o === g.scene || o instanceof Node) continue;
      let keys; try { keys = o instanceof Map ? [...o.entries()].slice(0, 2000) : o instanceof Set ? [...o].slice(0, 2000).map((v, i) => [i, v]) : Object.keys(o).slice(0, 2000).map((k) => [k, o[k]]); } catch (e) { continue; }
      for (const [k, v] of keys) if (v && (typeof v === 'object' || typeof v === 'function') && !ArrayBuffer.isView(v)) q.push([v, p + '.' + String(k).slice(0, 40)]);
    }
    return { visited: n, paths: out };
  });
  // detached meshes: group by the root of their parent chain
  {
    const { result } = await client.send('Runtime.evaluate', { expression: 'window.__protos.Mesh' });
    const { objects } = await client.send('Runtime.queryObjects', { prototypeObjectId: result.objectId });
    const { result: r, exceptionDetails: ex } = await client.send('Runtime.callFunctionOn', { objectId: objects.objectId, returnByValue: true, functionDeclaration: `function(){
      const g = window.__game, by = {};
      for (const m of this) { if (!m || !Object.prototype.hasOwnProperty.call(m, 'uuid')) continue;
        let root = m; while (root.parent) root = root.parent;
        if (root === g.scene) continue;
        const desc = (o) => (o.name || o.type) + (o.userData && Object.keys(o.userData).length ? '{' + Object.keys(o.userData).slice(0, 4).join(',') + '}' : '');
        const k = 'root=' + desc(root) + ' kids=' + (root.children?.length ?? '-') + ' geo=' + m.geometry?.type + ' mat=' + (m.material?.type || '?') + (m.userData.chunk ? ' CHUNK' : '');
        by[k] = (by[k] ?? 0) + 1;
      }
      return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 25);
    }` });
    console.log('detached meshes by root:', JSON.stringify(r.value, null, 1), ex ? JSON.stringify(ex).slice(0, 600) : '');
  }
  console.log('old World reachable at:', JSON.stringify(paths, null, 1));
  if (snapshot) {
    const f = path.join(WORK, 'results', 'leak.heapsnapshot'); const ws = fs.createWriteStream(f);
    client.on('HeapProfiler.addHeapSnapshotChunk', (e) => ws.write(e.chunk));
    await client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
    ws.end(); console.log('snapshot', f);
  }
  fs.writeFileSync(path.join(WORK, 'results', 'leak-hunt.json'), JSON.stringify({ rows, paths }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
