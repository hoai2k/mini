/** Manifest-driven final GLB review viewer. Query: ?model=structures/fields/terraceStep.glb */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const $ = (id) => document.getElementById(id);
const ui = { search: $('search'), category: $('category'), list: $('list'), review: $('review'), lods: $('lods'), clips: $('clips'), sockets: $('socket-toggle'), status: $('status') };
const params = new URLSearchParams(location.search);
const manifestUrl = new URL(params.get('manifest') || './manifest.json', location.href);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.insertBefore(renderer.domElement, document.body.firstChild);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#697475');
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.01, 50000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.screenSpacePanning = true;
scene.add(new THREE.HemisphereLight('#fff8e8', '#293332', 2.25));
const key = new THREE.DirectionalLight('#fff5d6', 3.0);
key.position.set(-4, 7, 5);
scene.add(key);
const fill = new THREE.DirectionalLight('#c8dddf', 1.4);
fill.position.set(5, 2, -4);
scene.add(fill);
const grid = new THREE.GridHelper(2000, 100, '#d8c888', '#87918c');
grid.material.opacity = 0.34;
grid.material.transparent = true;
scene.add(grid);

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const clock = new THREE.Clock();
let manifest = [];
let current = null;
let currentEntry = null;
let mixer = null;
let socketLayer = null;
let loadSerial = 0;
window.__ready = false;

function cleanModelPath(path) {
  const value = String(path || '').replaceAll('\\', '/').replace(/^\.\//, '').replace(/^models\//, '');
  if (!value || value.startsWith('/') || value.split('/').includes('..') || !value.toLowerCase().endsWith('.glb')) throw new Error(`Unsafe or invalid model path: ${path}`);
  return value;
}

function modelPath(entry) { return cleanModelPath(entry.file || entry.final || entry.path); }
function modelUrl(entry) { return new URL(modelPath(entry), manifestUrl).href; }

function previewPath(entry) {
  if (!entry.preview) return '';
  const p = String(entry.preview).replaceAll('\\', '/');
  if (/^(https?:|data:|\/)/.test(p)) return p;
  if (p.startsWith('hopper/3d/')) return new URL(`../../${p.slice('hopper/'.length)}`, manifestUrl).href;
  if (p.startsWith('design/')) return new URL(`../${p}`, manifestUrl).href;
  return new URL(p, manifestUrl).href;
}

function setStatus(message, error = false) {
  ui.status.textContent = message;
  ui.status.classList.toggle('error', error);
}

function listText(entry) { return [entry.name, entry.request, entry.category, entry.region, entry.file, entry.source].filter(Boolean).join(' ').toLowerCase(); }

function renderList() {
  const term = ui.search.value.trim().toLowerCase();
  const category = ui.category.value;
  ui.list.replaceChildren();
  const visible = manifest.filter((entry) => (!term || listText(entry).includes(term)) && (!category || entry.category === category));
  for (const entry of visible) {
    const button = document.createElement('button');
    button.className = 'asset';
    button.type = 'button';
    let visual;
    if (previewPath(entry)) {
      visual = document.createElement('img');
      visual.src = previewPath(entry);
      visual.alt = '';
      visual.loading = 'lazy';
    } else {
      visual = document.createElement('span');
      visual.className = 'thumb-placeholder';
    }
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = entry.name || modelPath(entry).split('/').at(-1).replace(/\.glb$/i, '');
    const meta = document.createElement('small');
    meta.textContent = [entry.request, entry.region || entry.category, modelPath(entry)].filter(Boolean).join(' · ');
    copy.append(title, meta);
    button.append(visual, copy);
    button.classList.toggle('active', entry === currentEntry);
    button.addEventListener('click', () => loadEntry(entry));
    ui.list.append(button);
  }
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'lede';
    empty.textContent = 'No manifest entries match this filter.';
    ui.list.append(empty);
  }
}

function button(text, handler, active = false) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = text;
  el.classList.toggle('active', active);
  el.addEventListener('click', handler);
  return el;
}

function fit(object) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) throw new Error('The exported scene has no visible geometry.');
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const distance = Math.max(sphere.radius * 2.65, 1);
  camera.position.copy(sphere.center).add(new THREE.Vector3(distance * 0.62, distance * 0.35, distance));
  camera.near = Math.max(distance / 10000, 0.001);
  camera.far = Math.max(distance * 30, 100);
  camera.updateProjectionMatrix();
  controls.target.copy(sphere.center);
  controls.minDistance = Math.max(sphere.radius * 0.03, 0.01);
  controls.maxDistance = distance * 12;
  controls.update();
  grid.position.y = Math.min(0, box.min.y);
  grid.scale.setScalar(Math.max(sphere.radius / 80, 0.05));
}

function findLods(root) {
  const found = [];
  root.traverse((node) => {
    const match = /^LOD([01])$/i.exec(node.name);
    if (match) found.push({ level: Number(match[1]), node });
  });
  return found;
}

function showLod(level, lods) {
  for (const lod of lods) lod.node.visible = lod.level === level;
  [...ui.lods.children].forEach((el) => el.classList.toggle('active', Number(el.dataset.level) === level));
}

function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#182321e8'; ctx.fillRect(0, 0, 512, 80);
  ctx.strokeStyle = '#f5d66e'; ctx.strokeRect(1, 1, 510, 78);
  ctx.fillStyle = '#fff5cc'; ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(2.8, .44, 1);
  return sprite;
}

function socketNames(entry) {
  if (Array.isArray(entry.sockets)) return entry.sockets.map((s) => typeof s === 'string' ? s : s.name).filter(Boolean);
  if (typeof entry.sockets === 'string') return entry.sockets.split(/\s*,\s*/).filter(Boolean);
  return [];
}

function buildSockets(root, entry, radius) {
  const layer = new THREE.Group();
  layer.name = '__viewer_sockets';
  const wanted = new Set(socketNames(entry));
  const candidates = [];
  root.traverse((node) => {
    if (!node.name || node.isMesh || node.isBone || node === root) return;
    if (wanted.has(node.name) || /^(Core|Mouth|Emitter|Landing|Hitbox|Socket|Node\.|Hook\.|Claw\.|Fan\.|Drill|TetherNode|Halo|Hand\d|WingJoint)/i.test(node.name)) candidates.push(node);
  });
  for (const node of candidates) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(Math.max(radius * .012, .025), 10, 7), new THREE.MeshBasicMaterial({ color: '#ffd84a', depthTest: false }));
    marker.userData.socketTarget = node;
    node.getWorldPosition(marker.position);
    const label = makeLabel(node.name);
    label.userData.socketTarget = node;
    label.userData.socketOffset = Math.max(radius * .035, .08);
    label.position.copy(marker.position).add(new THREE.Vector3(0, Math.max(radius * .035, .08), 0));
    label.scale.multiplyScalar(Math.max(radius * .13, .2));
    layer.add(marker, label);
  }
  layer.visible = false;
  scene.add(layer);
  return { layer, count: candidates.length, expected: wanted.size };
}

function populateReview(gltf, entry) {
  ui.review.hidden = false;
  ui.lods.replaceChildren(); ui.clips.replaceChildren();
  const lods = findLods(gltf.scene);
  const levels = [...new Set(lods.map((x) => x.level))].sort();
  if (levels.length) for (const level of levels) {
    const b = button(`LOD${level}`, () => showLod(level, lods), level === 0);
    b.dataset.level = String(level); ui.lods.append(b);
  } else ui.lods.append(document.createTextNode('No named LOD roots'));
  if (levels.includes(0)) showLod(0, lods);
  mixer = gltf.animations.length ? new THREE.AnimationMixer(gltf.scene) : null;
  if (mixer) ui.clips.append(button('Rest pose', () => { mixer.stopAllAction(); [...ui.clips.children].forEach(el => el.classList.remove('active')); }));
  if (mixer) for (const clip of gltf.animations) {
    const b = button(clip.name || '(unnamed)', () => {
      mixer.stopAllAction(); mixer.clipAction(clip).reset().play();
      [...ui.clips.children].forEach((el) => el.classList.toggle('active', el === b));
    });
    ui.clips.append(b);
  } else ui.clips.append(document.createTextNode('No animation clips'));
  const sphere = new THREE.Box3().setFromObject(gltf.scene).getBoundingSphere(new THREE.Sphere());
  const socketResult = buildSockets(gltf.scene, entry, sphere.radius);
  socketLayer = socketResult.layer;
  ui.sockets.textContent = `Show sockets (${socketResult.count})`;
  ui.sockets.classList.remove('active');
  ui.sockets.onclick = () => {
    socketLayer.visible = !socketLayer.visible;
    ui.sockets.classList.toggle('active', socketLayer.visible);
    ui.sockets.textContent = `${socketLayer.visible ? 'Hide' : 'Show'} sockets (${socketResult.count})`;
  };
  return { lods: levels, sockets: socketResult.count };
}

async function loadEntry(entry, updateUrl = true) {
  const serial = ++loadSerial;
  window.__ready = false;
  const path = modelPath(entry);
  setStatus(`Loading ${entry.name || path}…`);
  try {
    const gltf = await loader.loadAsync(modelUrl(entry));
    if (serial !== loadSerial) return;
    if (current) scene.remove(current);
    if (socketLayer) scene.remove(socketLayer);
    if (mixer) mixer.stopAllAction();
    current = gltf.scene; currentEntry = entry;
    scene.add(current);
    fit(current);
    const review = populateReview(gltf, entry);
    const size = new THREE.Box3().setFromObject(current).getSize(new THREE.Vector3());
    const tris = (() => { let n = 0; current.traverse((o) => { let shown=o.visible; for(let p=o.parent;p&&shown;p=p.parent) shown=p.visible; if (shown&&o.isMesh&&o.geometry) n += o.geometry.index ? o.geometry.index.count / 3 : (o.geometry.attributes.position?.count || 0) / 3; }); return Math.round(n); })();
    setStatus(`${entry.request ? `${entry.request} · ` : ''}${entry.name || path} · ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m · ${tris.toLocaleString()} LOD0 triangles · ${gltf.animations.length} clips · ${review.sockets} sockets`);
    if (updateUrl) { const next = new URL(location.href); next.searchParams.set('model', path); history.replaceState(null, '', next); }
    renderList();
    window.__ready = true;
  } catch (error) {
    console.error(error);
    setStatus(`Could not load ${path}: ${error.message}. Serve hopper/3d/models over HTTP; file:// cannot fetch the manifest or GLBs.`, true);
  }
}

async function start() {
  try {
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    manifest = Array.isArray(data) ? data : data.models || data.entries || [];
    manifest = manifest.filter((entry) => entry && (entry.file || entry.final || entry.path));
    const categories = [...new Set(manifest.map((entry) => entry.category).filter(Boolean))].sort();
    for (const category of categories) { const option = document.createElement('option'); option.value = category; option.textContent = category; ui.category.append(option); }
    renderList();
    const requested = params.get('model');
    let entry = requested && manifest.find((item) => { if (item.request === requested) return true; try { return modelPath(item) === cleanModelPath(requested); } catch { return false; } });
    if (!entry && requested) entry = { name: cleanModelPath(requested).split('/').at(-1), file: cleanModelPath(requested) };
    if (!entry) entry = manifest[0];
    if (entry) await loadEntry(entry, false); else { setStatus('manifest.json contains no model entries.', true); window.__ready = true; }
  } catch (error) {
    setStatus(`Could not load manifest.json: ${error.message}. Serve this directory over HTTP.`, true);
  }
}

ui.search.addEventListener('input', renderList);
ui.category.addEventListener('change', renderList);
function layout() {
  const hidden = document.body.classList.contains('panel-hidden');
  const offset = hidden || innerWidth <= 700 ? 0 : 350;
  const width = Math.max(1, innerWidth - offset);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.left = `${offset}px`;
  camera.aspect = width / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(width, innerHeight);
  $('panel-toggle').textContent = hidden ? 'Models & controls' : 'Hide controls';
  $('panel-toggle').setAttribute('aria-expanded', String(!hidden));
}
if (innerWidth <= 700) document.body.classList.add('panel-hidden');
$('panel-toggle').addEventListener('click', () => { document.body.classList.toggle('panel-hidden'); layout(); });
addEventListener('resize', layout);
layout();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05);
  mixer?.update(dt);
  if (socketLayer?.visible) {
    scene.updateMatrixWorld(true);
    socketLayer.children.forEach((item) => {
      item.userData.socketTarget?.getWorldPosition(item.position);
      if (item.isSprite) item.position.y += item.userData.socketOffset || 0;
    });
  }
  controls.update(); renderer.render(scene, camera);
});
start();
