#!/usr/bin/env node
/** Studio previews for GLBs, rendered with headless Chromium (Playwright).
 * Usage: node source/previews.mjs [--force] [model.glb ...]
 * With no arguments, every manifest entry without a preview image is rendered.
 * Serves the repository over a local HTTP server so three.js can load from
 * hopper/game/node_modules and the GLBs from hopper/3d/models.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODELS = path.resolve(HERE, '..');
const ROOT = path.resolve(MODELS, '../../..');
const GAME = path.join(ROOT, 'hopper/game');
const require = createRequire(path.join(GAME, 'package.json'));
const args = process.argv.slice(2);
const force = args.includes('--force');
const inputs = args.filter((a) => !a.startsWith('--')).map((a) => path.resolve(a));

const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#697475}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/hopper/game/node_modules/three/build/three.module.js","three/addons/":"/hopper/game/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const url = new URLSearchParams(location.search).get('model');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(900, 750); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#697475');
scene.add(new THREE.HemisphereLight('#fff8e8', '#293332', 2.2));
const key = new THREE.DirectionalLight('#fff5d6', 2.8); key.position.set(-4, 7, 5); scene.add(key);
const fill = new THREE.DirectionalLight('#c8dddf', 1.2); fill.position.set(5, 2, -4); scene.add(fill);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
loader.load(url, (gltf) => {
  const root = gltf.scene;
  root.traverse((o) => { if (/^LOD\\d/.test(o.name)) o.visible = o.name === 'LOD0'; });
  scene.add(root);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3(); box.getSize(size);
  const centre = new THREE.Vector3(); box.getCenter(centre);
  const span = Math.max(size.x, size.y, size.z);
  const camera = new THREE.OrthographicCamera(-span * 0.725, span * 0.725, span * 0.6, -span * 0.6, 0.1, span * 40);
  camera.position.copy(centre).add(new THREE.Vector3(1.15, 0.95, 1.55).multiplyScalar(span));
  camera.lookAt(centre);
  renderer.render(scene, camera);
  window.__done = true;
}, undefined, (e) => { window.__error = String(e); });
</script>`;

function contentType(file) {
  return { '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.html': 'text/html' }[path.extname(file)] || 'application/octet-stream';
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(MODELS, 'manifest.json'), 'utf8'));
  const entries = manifest.models.filter((m) => (inputs.length ? inputs.includes(path.resolve(MODELS, m.file)) : force || !fs.existsSync(path.join(MODELS, m.preview))));
  if (!entries.length) {
    console.log('Nothing to render.');
    return;
  }
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/preview') {
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
  const page = await browser.newPage({ viewport: { width: 900, height: 750 } });
  for (const entry of entries) {
    const out = path.join(MODELS, entry.preview);
    await page.goto(`http://127.0.0.1:${port}/preview?model=${encodeURIComponent('/hopper/3d/models/' + entry.file)}`);
    await page.waitForFunction(() => window.__done || window.__error, null, { timeout: 60000 });
    const error = await page.evaluate(() => window.__error);
    if (error) {
      console.log(`FAIL ${entry.file}: ${error}`);
      continue;
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out });
    console.log(`${entry.request} ${entry.preview}`);
  }
  await browser.close();
  server.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
