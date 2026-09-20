#!/usr/bin/env node
/** Audits the baked collision against the surface each delivered structure
 * actually draws -- the thing a player stands on.
 *
 * `collision-audit.mjs` compares a delivered GLB against the *stand-in*
 * colliders it replaced; that is the mismatch baked collision was introduced
 * to fix, so its numbers describe the state before the bake existed. This
 * one asks the question that is still live: where the picture has a surface,
 * does the collision have one too?
 *
 * Method: load each model's LOD0 in headless Chromium, cast rays straight
 * down on a 2 m grid (offset off the grid lines so a ray never runs along a
 * shared triangle edge), and for each column compare the drawn surface with
 * the nearest baked box top in that column. Everything is in the model's own
 * local frame -- the frame `collision.json` stores and `swapDelivered` draws
 * in -- so no placement, yaw or district is involved.
 *
 * A column whose nearest collision surface is more than `TOL` from the drawn
 * one is a fall-through: floor you can see and cannot stand on.
 *
 * Writes `models/surface-audit.json`, which `qa/tests/surface-audit.mjs`
 * holds to a contract. Re-run it after any re-bake.
 *
 * Usage: node source/surface-audit.mjs [file-fragment|M-0xx ...]
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODELS = path.resolve(HERE, '..');
const ROOT = path.resolve(MODELS, '../../..');
const require = createRequire(path.join(ROOT, 'hopper/game/package.json'));
/** How far the collision may sit from the drawn surface, in metres. */
const TOL = 3;
const STEP = 2;

const delivery = JSON.parse(fs.readFileSync(path.join(MODELS, 'manifest.json'), 'utf8'));
const collision = JSON.parse(fs.readFileSync(path.join(MODELS, 'collision.json'), 'utf8'));
const only = process.argv.slice(2);
const structures = delivery.models.filter(
  (m) =>
    m.category === 'structure' &&
    m.status === 'delivered' &&
    (!only.length || only.some((o) => m.file.includes(o) || m.request === o)),
);

const PAGE = `<!doctype html><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/hopper/game/node_modules/three/build/three.module.js","three/addons/":"/hopper/game/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const q = new URLSearchParams(location.search);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
loader.load(q.get('model'), (gltf) => {
  const root = gltf.scene;
  root.traverse((o) => { if (/^LOD\\d/.test(o.name)) o.visible = o.name.startsWith('LOD0'); });
  root.updateWorldMatrix(true, true);
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    let n = o, ok = true;
    while (n && n !== root.parent) { if (n.visible === false) { ok = false; break; } n = n.parent; }
    if (ok) meshes.push(o);
  });
  const box = new THREE.Box3();
  for (const m of meshes) box.expandByObject(m);
  const caster = new THREE.Raycaster();
  const step = ${STEP};
  const cols = [];
  for (let x = Math.floor(box.min.x / step) * step; x <= box.max.x; x += step)
    for (let z = Math.floor(box.min.z / step) * step; z <= box.max.z; z += step) {
      caster.set(new THREE.Vector3(x + 0.37, box.max.y + 5, z + 0.19), new THREE.Vector3(0, -1, 0));
      caster.far = box.max.y - box.min.y + 20;
      const hits = caster.intersectObjects(meshes, false);
      if (hits.length) cols.push({ x: x + 0.37, z: z + 0.19, y: hits[0].point.y });
    }
  window.__result = { cols, min: box.min.toArray() };
}, undefined, (e) => { window.__result = { error: String(e) }; });
</script>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/scan') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(PAGE);
  }
  const file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  const type = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const { chromium } = require('playwright-core');
const executablePath = process.env.CHROMIUM || ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });

const models = [];
for (const m of structures) {
  await page.goto(`http://127.0.0.1:${port}/scan?model=${encodeURIComponent('/hopper/3d/models/' + m.file)}`);
  await page.waitForFunction(() => window.__result !== undefined, null, { timeout: 60000 });
  const r = await page.evaluate(() => window.__result);
  if (r.error) {
    console.log(`FAIL ${m.file}: ${r.error}`);
    continue;
  }
  const boxes = collision[m.file] || [];
  let through = 0,
    worst = 0;
  for (const c of r.cols) {
    let near = Infinity;
    for (const b of boxes) {
      if (Math.abs(c.x - b.ox) > b.hx || Math.abs(c.z - b.oz) > b.hz) continue;
      near = Math.min(near, Math.abs(b.y1 - c.y));
    }
    if (near > TOL) {
      through++;
      worst = Math.max(worst, Number.isFinite(near) ? near : c.y - r.min[1]);
    }
  }
  models.push({
    request: m.request,
    name: m.name,
    file: m.file,
    columns: r.cols.length,
    fallThrough: through,
    frac: r.cols.length ? through / r.cols.length : 0,
    worst: +worst.toFixed(1),
    boxes: boxes.length,
  });
  console.log(`${m.request} ${m.name}: ${through}/${r.cols.length} (${((100 * through) / Math.max(1, r.cols.length)).toFixed(1)}%)`);
}
await browser.close();
server.close();
models.sort((a, b) => b.frac - a.frac);
const columns = models.reduce((n, m) => n + m.columns, 0);
const fallThrough = models.reduce((n, m) => n + m.fallThrough, 0);
const out = { tolerance: TOL, step: STEP, columns, fallThrough, frac: columns ? fallThrough / columns : 0, models };
fs.writeFileSync(path.join(MODELS, 'surface-audit.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`\n${models.length} structures, ${columns} drawn columns, ${fallThrough} fall-through (${((100 * fallThrough) / columns).toFixed(1)}%)`);
