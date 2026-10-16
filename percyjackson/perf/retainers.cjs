// Who keeps an old level's world group alive? Tags camp's world group with a
// LeakMarker, reloads camp twice, takes a heap snapshot and prints the
// shortest retainer paths from the GC roots to the marked group.
//   NODE_PATH=/opt/node22/lib/node_modules node retainers.cjs
const fs = require('fs');
const path = require('path');
const { launch, seed, INSTRUMENT, BASE, WORK } = require('./lib.cjs');

(async () => {
  const { browser, context, page } = await launch({ flags: 'webgl', width: 480, height: 270 });
  await seed(context, { settings: { dynRes: false } });
  await page.addInitScript(INSTRUMENT);
  const client = await context.newCDPSession(page);
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 240000, polling: 100 });
  await page.evaluate(() => {
    const g = window.__game; const d = g.save.data; d.completed.lt1 = 1; d.completed.lt2 = 1; d.opening = 'done'; d.seenGearHint = true;
    g.ui.closeAll(); g.beginSession([{ device: 'kbm', hero: 'percy' }], { companions: ['annabeth', 'grover'] });
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { class LeakMarker {} const g = window.__game; g.world.group.userData.__leak = new LeakMarker(); g.world.__leakW = new LeakMarker(); });
  await page.evaluate(() => window.__game.loadHub()); await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.loadHub()); await page.waitForTimeout(1500);
  await page.evaluate(() => { window.gc?.(); window.gc?.(); });
  const chunks = [];
  client.on('HeapProfiler.addHeapSnapshotChunk', (e) => chunks.push(e.chunk));
  await client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  await browser.close();
  const snap = JSON.parse(chunks.join(''));
  const m = snap.snapshot.meta, NF = m.node_fields.length, EF = m.edge_fields.length;
  const nTypes = m.node_types[0], eTypes = m.edge_types[0];
  const N = snap.nodes, E = snap.edges, S = snap.strings;
  const fi = (k) => m.node_fields.indexOf(k), ei = (k) => m.edge_fields.indexOf(k);
  const nType = fi('type'), nName = fi('name'), nEdges = fi('edge_count'), nSelf = fi('self_size');
  const eType = ei('type'), eName = ei('name_or_index'), eTo = ei('to_node');
  const count = N.length / NF;
  const firstEdge = new Uint32Array(count + 1);
  for (let i = 0, e = 0; i < count; i++) { firstEdge[i] = e; e += N[i * NF + nEdges] * EF; }
  firstEdge[count] = E.length;
  // reverse edges
  const rev = Array.from({ length: count }, () => []);
  for (let i = 0; i < count; i++) for (let e = firstEdge[i]; e < firstEdge[i + 1]; e += EF) {
    const t = eTypes[E[e + eType]]; if (t === 'weak') continue;
    rev[E[e + eTo] / NF].push([i, e]);
  }
  const name = (i) => S[N[i * NF + nName]];
  const type = (i) => nTypes[N[i * NF + nType]];
  const edgeName = (e) => { const t = eTypes[E[e + eType]]; const v = E[e + eName]; return t === 'element' || t === 'hidden' ? `[${v}]` : S[v]; };
  const markers = []; for (let i = 0; i < count; i++) if (type(i) === 'object' && name(i) === 'LeakMarker') markers.push(i);
  console.log('LeakMarker instances alive:', markers.length);
  // BFS backwards from each marker to a root (node 0 is the synthetic root)
  const out = [];
  for (const mk of markers) {
    const prev = new Map([[mk, null]]); const q = [mk]; let found = null;
    while (q.length) { const v = q.shift(); if (v === 0) { found = v; break; } for (const [u, e] of rev[v]) if (!prev.has(u)) { prev.set(u, [v, e]); q.push(u); } }
    const chain = [];
    for (let v = found; v != null && prev.get(v); ) { const [nxt, e] = prev.get(v); chain.push(`${type(v)}:${name(v).slice(0, 60)} --${edgeName(e)}-->`); v = nxt; }
    chain.push(`${type(mk)}:${name(mk)}`);
    out.push(chain);
    console.log('\nPATH:\n  ' + chain.join('\n  '));
  }
  fs.writeFileSync(path.join(WORK, 'results', 'retainers.json'), JSON.stringify(out, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
