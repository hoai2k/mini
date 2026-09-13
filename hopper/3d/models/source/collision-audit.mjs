#!/usr/bin/env node
/** Audits every delivered STRUCTURE model against the stand-in colliders it
 * visually replaces, at a representative placement (the first placement of
 * that stand-in in each district that uses it, with its own opts).
 *
 * For each (model, placement) pair:
 *   1. Build the district's World (from the game's real district data) and
 *      read the stand-in's own colliders for that one instance -- exactly
 *      what `groundAt` would see today.
 *   2. Load the delivered GLB in headless Chromium, place it at the exact
 *      position/yaw `swapDelivered` places it (a child of the stand-in group
 *      at local-origin, unit scale -- so this *is* that transform), and cast
 *      rays straight down on a 2 m grid over its footprint to find its own
 *      drawn top surface.
 *   3. Compare the two height fields: a grid point where the GLB has a top
 *      but the stand-in collider does not (within 1 m) is a fall-through --
 *      Hopper sees floor that is not there. The reverse is an invisible
 *      floor -- solid but nothing drawn under his feet.
 *
 * Usage: node source/collision-audit.mjs [--out collision-audit.md] [id ...]
 * With no ids, every delivered structure is audited.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODELS = path.resolve(HERE, '..');
const ROOT = path.resolve(MODELS, '../../..');
const GAME = path.join(ROOT, 'hopper/game');
const require = createRequire(path.join(GAME, 'package.json'));
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.join(MODELS, 'collision-audit.md');
const wantIds = new Set(args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out'));

// ---------------------------------------------------------------------
// Load the game's real district data + World, the same way qa/tests do.
// ---------------------------------------------------------------------
const ts = require('typescript');
const source = path.join(GAME, 'src/game3d/');
const standIns = path.join(ROOT, 'hopper/3d/standins/src/index.js');
const threeModule = require.resolve('three', { paths: [GAME] }).replace(/three\.cjs$/, 'three.module.js');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hopper-collision-audit-'));
const names = ['world', 'controller', 'district', 'district2', 'district3', 'route', 'scenery'];
for (const name of names) {
  const raw = fs
    .readFileSync(source + name + '.ts', 'utf8')
    .replace(/from '(\.\.?\/[\w-/]+)'/g, (m, rel) => {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), rel));
      return names.includes(target) ? `from '${rel}.mjs'` : m;
    })
    .replace("'../../../3d/standins/src/index.js'", `'${standIns}'`)
    .replace("'../../../3d/standins/src/palette.js'", `'${path.join(ROOT, 'hopper/3d/standins/src/palette.js')}'`)
    .replace("'../../../3d/standins/src/textures.js'", `'${path.join(ROOT, 'hopper/3d/standins/src/textures.js')}'`)
    .replace(/from 'three'/g, `from '${threeModule}'`);
  fs.writeFileSync(path.join(temp, name + '.mjs'), ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, verbatimModuleSyntax: false } }).outputText);
}
const { World } = await import(path.join(temp, 'world.mjs'));
const { MISSIONS } = await import(path.join(temp, 'district.mjs'));

// ---------------------------------------------------------------------
// Which stand-ins have a delivered structure, and where each is placed.
// ---------------------------------------------------------------------
const design = JSON.parse(fs.readFileSync(path.join(ROOT, 'hopper/3d/design/standin-manifest.json'), 'utf8'));
const delivery = JSON.parse(fs.readFileSync(path.join(MODELS, 'manifest.json'), 'utf8'));
const deliveredByRequest = new Map(delivery.models.filter((m) => m.status === 'delivered').map((m) => [m.request, m]));
const structures = design.requests
  .filter((r) => r.kind === 'model' && r.status === 'delivered' && r.standIn?.startsWith('structure.') && deliveredByRequest.has(r.request))
  .map((r) => ({ standIn: r.standIn, ...deliveredByRequest.get(r.request) }))
  .filter((m) => !wantIds.size || wantIds.has(m.standIn) || wantIds.has(m.request));

// Build every district once; find, per district, the first placement of
// each stand-in id (before scenery -- authored placements only).
const districts = MISSIONS.flat().map((factory) => factory());
const worlds = districts.map((d) => new World(d));

function casesFor(standIn) {
  const out = [];
  for (let i = 0; i < districts.length; i++) {
    const d = districts[i];
    const p = d.placements.find((pl) => pl.id === standIn);
    if (!p) continue;
    const world = worlds[i];
    const instance = world.instances.find((inst) => inst.placement === p);
    if (!instance) continue;
    const colliders = world.colliders.filter((c) => c.instance === instance);
    out.push({ district: d.name, placement: p, instance, colliders });
  }
  return out;
}

/** Highest top of this instance's own colliders under a world point, else null. */
function instanceTopAt(colliders, x, z) {
  let best = null;
  for (const c of colliders) {
    const dx = x - c.cx,
      dz = z - c.cz,
      cos = Math.cos(-c.yaw),
      sin = Math.sin(-c.yaw),
      lx = dx * cos - dz * sin - c.ox,
      lz = dx * sin + dz * cos - c.oz;
    if (Math.abs(lx) <= c.hx && Math.abs(lz) <= c.hz) {
      if (best === null || c.y1 > best) best = c.y1;
    }
  }
  return best;
}

// ---------------------------------------------------------------------
// Headless Chromium: load the GLB at the exact placement transform
// swapDelivered uses (child of the stand-in group, local origin, unit
// scale -- i.e. this position and yaw ARE that transform) and grid-raycast
// its drawn top surface.
// ---------------------------------------------------------------------
const PAGE = `<!doctype html><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/hopper/game/node_modules/three/build/three.module.js","three/addons/":"/hopper/game/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const q = new URLSearchParams(location.search);
const url = q.get('model');
const px = +q.get('px'), py = +q.get('py'), pz = +q.get('pz'), yaw = +q.get('yaw');
const step = +q.get('step') || 2;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
loader.load(url, (gltf) => {
  const root = gltf.scene;
  // Mirror swapDelivered's selectLod: only LOD0 visible.
  root.traverse((o) => { if (/^LOD\\d/.test(o.name)) o.visible = o.name.startsWith('LOD0'); });
  root.position.set(px, py, pz);
  root.rotation.y = yaw;
  root.updateWorldMatrix(true, true);
  // Only meshes whose full visibility chain (up to root) is visible.
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    let n = o, ok = true;
    while (n && n !== root.parent) { if (n.visible === false) { ok = false; break; } n = n.parent; }
    if (ok) meshes.push(o);
  });
  if (!meshes.length) { window.__result = { error: 'no visible meshes' }; return; }
  const box = new THREE.Box3();
  for (const m of meshes) box.expandByObject(m);
  const caster = new THREE.Raycaster();
  const points = [];
  const x0 = Math.floor(box.min.x / step) * step, x1 = Math.ceil(box.max.x / step) * step;
  const z0 = Math.floor(box.min.z / step) * step, z1 = Math.ceil(box.max.z / step) * step;
  for (let x = x0; x <= x1; x += step) {
    for (let z = z0; z <= z1; z += step) {
      caster.set(new THREE.Vector3(x, box.max.y + 5, z), new THREE.Vector3(0, -1, 0));
      caster.far = box.max.y - box.min.y + 10;
      const hits = caster.intersectObjects(meshes, false);
      points.push({ x, z, y: hits.length ? hits[0].point.y : null });
    }
  }
  window.__result = { bounds: { min: box.min.toArray(), max: box.max.toArray() }, points };
}, undefined, (e) => { window.__result = { error: String(e) }; });
</script>`;

function contentType(file) {
  return { '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.html': 'text/html' }[path.extname(file)] || 'application/octet-stream';
}

async function main() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/audit') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(PAGE);
      return;
    }
    const file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': contentType(file) });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const { chromium } = require('playwright-core');
  const executablePath = process.env.CHROMIUM || ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  if (process.env.AUDIT_DEBUG) {
    page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
    page.on('pageerror', (e) => console.log('PAGEERROR', e));
  }

  const rows = [];
  for (const m of structures) {
    const cases = casesFor(m.standIn);
    if (!cases.length) {
      rows.push({ model: m, district: '(unplaced)', error: 'no placement found in any district' });
      continue;
    }
    for (const c of cases) {
      const { x: px, y: py, z: pz } = c.instance.object.position;
      const yaw = c.instance.object.rotation.y;
      const modelUrl = '/hopper/3d/models/' + m.file;
      await page.goto(`http://127.0.0.1:${port}/audit?model=${encodeURIComponent(modelUrl)}&px=${px}&py=${py}&pz=${pz}&yaw=${yaw}`);
      await page.waitForFunction(() => window.__result !== undefined, null, { timeout: 60000 });
      const result = await page.evaluate(() => window.__result);
      if (result.error) {
        rows.push({ model: m, district: c.district, opts: c.placement.opts, error: result.error });
        continue;
      }
      let n = 0,
        sumDiff = 0,
        maxDiff = 0,
        glbNoCollider = 0,
        colliderNoGlb = 0,
        both = 0;
      for (const pt of result.points) {
        const colY = instanceTopAt(c.colliders, pt.x, pt.z);
        const glbY = pt.y;
        if (glbY === null && colY === null) continue;
        n++;
        if (glbY !== null && colY !== null) {
          const d = Math.abs(glbY - colY);
          sumDiff += d;
          maxDiff = Math.max(maxDiff, d);
          both++;
          if (d > 1) {
            // Still a mismatch even though both exist -- count on the side
            // whichever reads higher (that's where the surface actually is).
            if (glbY > colY) glbNoCollider++;
            else colliderNoGlb++;
          }
        } else if (glbY !== null && colY === null) glbNoCollider++;
        else if (glbY === null && colY !== null) colliderNoGlb++;
      }
      rows.push({
        model: m,
        district: c.district,
        opts: c.placement.opts,
        points: result.points.length,
        sampled: n,
        meanDiff: both ? sumDiff / both : null,
        maxDiff: both ? maxDiff : null,
        fallThroughFrac: n ? glbNoCollider / n : 0,
        invisibleFrac: n ? colliderNoGlb / n : 0,
      });
    }
  }
  await browser.close();
  server.close();

  // ---- report ----
  const lines = [];
  lines.push('# Delivered-structure collision audit');
  lines.push('');
  lines.push(`Generated by \`node source/collision-audit.mjs\`. Compares each delivered GLB's own drawn top surface (grid raycast, 2 m) against the stand-in colliders' tops at the same world points, for the first placement of that stand-in in each district that uses it.`);
  lines.push('');
  lines.push('| Model | Stand-in | District | opts | max Δh (m) | mean Δh (m) | fall-through frac | invisible-floor frac |');
  lines.push('|---|---|---|---|---|---|---|---|');
  const worst = [];
  for (const r of rows) {
    if (r.error) {
      lines.push(`| ${r.model.request} ${r.model.name} | ${r.model.standIn} | ${r.district} | ${JSON.stringify(r.opts || {})} | ERROR: ${r.error} | | | |`);
      continue;
    }
    lines.push(
      `| ${r.model.request} ${r.model.name} | ${r.model.standIn} | ${r.district} | ${JSON.stringify(r.opts || {})} | ${r.maxDiff?.toFixed(2) ?? 'n/a'} | ${r.meanDiff?.toFixed(2) ?? 'n/a'} | ${(r.fallThroughFrac * 100).toFixed(1)}% | ${(r.invisibleFrac * 100).toFixed(1)}% |`,
    );
    worst.push(r);
  }
  worst.sort((a, b) => b.fallThroughFrac + b.invisibleFrac - (a.fallThroughFrac + a.invisibleFrac));
  lines.push('');
  lines.push('## Worst offenders (by combined fall-through + invisible-floor fraction)');
  lines.push('');
  for (const r of worst.slice(0, 15)) {
    lines.push(`- ${r.model.request} ${r.model.name} @ ${r.district}: fall-through ${(r.fallThroughFrac * 100).toFixed(1)}%, invisible-floor ${(r.invisibleFrac * 100).toFixed(1)}%, max Δh ${r.maxDiff?.toFixed(2)} m, opts=${JSON.stringify(r.opts || {})}`);
  }
  fs.writeFileSync(outFile, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log(`\nWritten to ${outFile}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
