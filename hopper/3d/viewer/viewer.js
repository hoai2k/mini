/** Stand-in review viewer. Query parameters:
 *   ?item=enemy.shadeHound      one stand-in on a turntable
 *   ?diorama=city               a region layout from dioramas.js
 *   ?sheet=enemies              a labelled contact sheet from dioramas.js
 *   &shot=1                     hide the UI and use the fixed camera (document renders)
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import {
  listStandIns,
  createStandIn,
  makeTerrain,
  makeHorizon,
  makeSkyDome,
  makeLandmark,
  makeFog,
  regionById,
  REGIONS,
  TEXTURE_NAMES,
  makeTexture,
  measure,
  HOPPER_CLIPS,
} from '../standins/src/index.js';
import { DIORAMAS, SHEETS } from './dioramas.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot') === '1';
if (shot) document.body.classList.add('shot');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 30000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
let scene = new THREE.Scene();
const animated = [];
let mixer = null;
const clock = new THREE.Clock();
window.__ready = false;

function lights(region) {
  const hemi = new THREE.HemisphereLight(new THREE.Color(region.sky).lerp(new THREE.Color('#ffffff'), 0.3), new THREE.Color(region.ground), 0.5);
  const sun = new THREE.DirectionalLight(new THREE.Color(region.sun || '#fff1c2').lerp(new THREE.Color('#ffffff'), 0.5), 1.15);
  sun.position.set(-600, 900, 500);
  const fill = new THREE.DirectionalLight(new THREE.Color(region.haze), 0.35);
  fill.position.set(500, 200, -400);
  scene.add(hemi, sun, fill);
}
function atmosphere(region, { horizon = {}, landmark = true } = {}) {
  scene.background = new THREE.Color(region.sky);
  scene.add(makeSkyDome(region));
  scene.fog = makeFog(region, 0.00016);
  const h = makeHorizon(region, horizon);
  scene.add(h);
  if (landmark) scene.add(makeLandmark(region));
}
function label(text, y, scale = 8) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0f1f1fcc';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#f6edcc';
  ctx.font = 'bold 44px Trebuchet MS, Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 62);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(scale, scale * 96 / 512, 1);
  s.position.y = y;
  return s;
}
function reset() {
  scene = new THREE.Scene();
  animated.length = 0;
  mixer = null;
  window.__ready = false;
}
function add(object) {
  scene.add(object);
  object.traverse((o) => o.userData.animate && animated.push(o));
  return object;
}
function frame(object, { pad = 1.35, elevation = 0.3, azimuth = 0.6, fit = 'sphere' } = {}) {
  const { box, size } = measure(object);
  const centre = box.getCenter(new THREE.Vector3());
  const vfov = (camera.fov * Math.PI) / 360,
    hfov = Math.atan(Math.tan(vfov) * camera.aspect);
  let dist;
  if (fit === 'sheet') {
    // A grid seen from above and in front: fit its width and its depth.
    dist = Math.max(size.x / 2 / Math.tan(hfov), (size.z * 0.8 + size.y) / 2 / Math.tan(vfov)) * pad;
  } else {
    dist = (size.length() / 2 / Math.sin(vfov)) * pad;
  }
  camera.position.set(centre.x + Math.sin(azimuth) * dist, centre.y + dist * elevation, centre.z + Math.cos(azimuth) * dist);
  camera.near = Math.max(0.1, dist / 200);
  camera.far = Math.max(30000, dist * 6);
  camera.updateProjectionMatrix();
  controls.target.copy(centre);
  controls.update();
}

async function loadHopper(position, rotation) {
  try {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('../../models/hopper-rider.glb');
    const root = gltf.scene;
    root.position.set(...position);
    root.rotation.y = rotation;
    mixer = new THREE.AnimationMixer(root);
    const idle = gltf.animations.find((c) => c.name === 'Idle') || gltf.animations[0];
    if (idle) mixer.clipAction(idle).play();
    root.userData.standIn = { id: 'hopper.glb', kind: 'hopper' };
    scene.add(root);
    return root;
  } catch (e) {
    console.warn('hopper-rider.glb unavailable, using the proxy', e);
    const p = createStandIn('hopper.proxy');
    p.position.set(...position);
    p.rotation.y = rotation;
    return add(p);
  }
}

async function showItem(id) {
  reset();
  if (id === 'hopper.glb') {
    const region = regionById('fields');
    lights(region);
    atmosphere(region, { landmark: false });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4000, 48), new THREE.MeshToonMaterial({ color: new THREE.Color(region.ground) }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const root = await loadHopper([0, 0, 0], 0.5);
    frame(root, { pad: 1.1, elevation: 0.25, azimuth: 0.9 });
    info('<b>hopper-rider.glb</b> · the delivered model, Idle clip, 1:1<br>14 m to the head socket, 29 m long, 25 clips, 26 sockets');
    window.__ready = true;
    return;
  }
  const region = regionById(params.get('region') || (id.startsWith('structure.') ? id.split('.')[1] : 'mountains')) || regionById('mountains');
  lights(region);
  atmosphere(region, { landmark: false });
  const o = add(createStandIn(id, id.startsWith('terrain.') ? { region: region.id } : {}));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4000, 48), new THREE.MeshToonMaterial({ color: new THREE.Color(region.ground) }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  if (!id.startsWith('terrain.')) scene.add(ground);
  frame(o, { pad: id.startsWith('terrain.') ? 0.5 : 1.2 });
  info(`<b>${id}</b><br>${describe(o)}`);
  window.__ready = true;
}
function describe(o) {
  const m = o.userData.standIn || {};
  const { size } = measure(o);
  const bits = [`${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} m`];
  if (m.rig) bits.push(`rig: ${m.rig}`);
  if (o.userData.landings) bits.push(`${o.userData.landings.length} landing${o.userData.landings.length > 1 ? 's' : ''}`);
  if (m.region) bits.push(m.region);
  return bits.join(' · ');
}
async function showDiorama(regionId) {
  reset();
  const region = regionById(regionId),
    d = DIORAMAS[regionId];
  lights(region);
  atmosphere(region, { horizon: d.horizon || {} });
  const terrain = add(makeTerrain(region, d.terrain || {}));
  const heightAt = terrain.userData.heightAt;
  for (const [id, x, z, y = 0, rot = 0, opts, mode = 'r'] of d.items) {
    const o = createStandIn(id, opts || {});
    const base = mode === 'a' ? y : heightAt(x, z) + y - (id.startsWith('structure.') && y === 0 ? 1.5 : 0);
    o.position.set(x, base, z);
    o.rotation.y = rot;
    add(o);
  }
  const [hx, hz, hy, hr] = d.hopper;
  await loadHopper([hx, heightAt(hx, hz) + hy, hz], hr);
  const [[cx, cy, cz], [tx, ty, tz]] = d.camera;
  camera.position.set(cx, heightAt(cx, cz) + cy, cz);
  camera.near = 0.5;
  camera.far = 30000;
  camera.updateProjectionMatrix();
  controls.target.set(tx, ty, tz);
  controls.update();
  info(`<b>${region.name}</b> · stand-in diorama<br>${d.items.length} placed stand-ins, Hopper at 1:1 scale. ${region.gravity !== 1 ? `Gravity ${region.gravity}×.` : ''}`);
  window.__ready = true;
}
async function showSheet(name) {
  reset();
  const s = SHEETS[name],
    region = regionById(s.region);
  lights(region);
  scene.background = new THREE.Color(region.sky).lerp(new THREE.Color('#0f1f1f'), 0.5);
  const group = new THREE.Group();
  if (s.textures) {
    TEXTURE_NAMES.forEach((t, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: makeTexture(t, { size: 256 }) }));
      m.position.set((i % 5) * 12 - 24, -Math.floor(i / 5) * 12 + 12, 0);
      m.add(label(t, -6.2, 10));
      group.add(m);
    });
    scene.add(group);
    camera.position.set(0, 0, 60);
    controls.target.set(0, 0, 0);
    controls.update();
  } else {
    const columns = s.columns,
      cell = s.cell;
    s.ids.forEach((id, i) => {
      const o = createStandIn(id);
      const { box } = measure(o);
      const c = box.getCenter(new THREE.Vector3());
      o.position.set((i % columns) * cell - ((columns - 1) * cell) / 2 - c.x, -box.min.y, -Math.floor(i / columns) * cell * 0.9 - c.z);
      add(o);
      const l = label(id.split('.').slice(-1)[0], box.max.y - box.min.y + cell * 0.12, cell * 0.55);
      l.position.x = o.position.x + c.x;
      l.position.z = o.position.z + c.z;
      scene.add(l);
    });
    // Creature sheets sit on cream paper like the 2D concept sheets; structures on the region ground.
    const paper = name === 'enemies' || name === 'bosses' || name === 'props';
    const floorColour = paper ? new THREE.Color('#e6dcc3') : new THREE.Color(region.ground);
    if (paper) scene.background = new THREE.Color('#efe5cf');
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(columns * cell * 1.4, Math.ceil(s.ids.length / columns) * cell * 1.4), new THREE.MeshToonMaterial({ color: floorColour }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.05, -Math.ceil(s.ids.length / columns) * cell * 0.4);
    scene.add(floor);
    group.add(...scene.children.filter((c) => c.userData.standIn));
    scene.add(group);
    frame(group, { pad: 1.02, elevation: 0.75, azimuth: 0, fit: 'sheet' });
  }
  info(`<b>${name}</b> · contact sheet`);
  window.__ready = true;
}
function info(html) {
  document.getElementById('info').innerHTML = html;
}

/* ---------- panel ---------- */
const groups = document.getElementById('groups');
function section(title, entries, current) {
  const h = document.createElement('h2');
  h.textContent = title;
  groups.appendChild(h);
  for (const [labelText, href] of entries) {
    const b = document.createElement('button');
    b.textContent = labelText;
    if (href === current) b.classList.add('active');
    b.onclick = () => (location.search = href);
    groups.appendChild(b);
  }
}
const current = location.search;
section('Dioramas', REGIONS.map((r) => [r.name, `?diorama=${r.id}`]), current);
section('Contact sheets', Object.keys(SHEETS).map((k) => [k, `?sheet=${k}`]), current);
const all = listStandIns();
section('Hopper', [['hopper-rider.glb (delivered)', '?item=hopper.glb'], ['hopper.proxy (scale reference)', '?item=hopper.proxy']], current);
section('Enemies', all.filter((i) => i.startsWith('enemy.')).map((i) => [i.slice(6), `?item=${i}`]), current);
section('Bosses', all.filter((i) => i.startsWith('boss.')).map((i) => [i.slice(5), `?item=${i}`]), current);
for (const r of REGIONS) section(`Structures · ${r.name}`, all.filter((i) => i.startsWith(`structure.${r.id}.`)).map((i) => [i.split('.').pop(), `?item=${i}`]), current);
section('Props', all.filter((i) => i.startsWith('prop.')).map((i) => [i.slice(5), `?item=${i}`]), current);
section('Terrain', all.filter((i) => i.startsWith('terrain.')).map((i) => [i.slice(8), `?item=${i}&region=mountains`]), current);

/* ---------- boot ---------- */
if (params.get('item')) showItem(params.get('item'));
else if (params.get('sheet')) showSheet(params.get('sheet'));
else showDiorama(params.get('diorama') || 'fields');

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta(),
    t = clock.elapsedTime;
  if (!shot) for (const o of animated) o.userData.animate(t);
  if (mixer) mixer.update(dt);
  controls.update();
  renderer.render(scene, camera);
});
export { HOPPER_CLIPS };
