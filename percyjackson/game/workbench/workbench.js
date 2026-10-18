// Half-Blood Quests model workbench: every character model in one viewer.
// Left: thumbnails (rendered once, offscreen, with the viewer's own renderer).
// Middle: orbit viewer. Right: inspector. Models are enumerated from the game's
// registries at load, so a model added to a registry shows up on its own.
// Deep link: #id=<id> (or #id=<group>:<id> when an id is used in two groups).
// Options: ?turn=0 stops the turntable, ?bg=dark|light|sky, ?anim=run|attack|...
// ?capture=1 hides the description overlay (for thumbnails of the page).
// ?scale=true opens in True scale: one fixed camera for every model with Percy
// standing beside it, so a hellhound dwarfs a pup (the default view fits each
// model to the frame, which hides size).
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null) e.append(k);
  return e;
};
const status = (msg) => { $('status').textContent = msg; };
const PX = 0.058;   // world units per skin pixel (js/entities/character.js)
const pretty = (s) => String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ------------------------------------------------------------------ registries
const loadErrors = [];
const tryImport = async (path) => { try { return await import(path); } catch (e) { loadErrors.push(`${path}: ${e.message}`); console.error('workbench: could not import', path, e); return {}; } };
const [models, monsters, bosses, mortals, heroes, people, champions, text] = await Promise.all([
  tryImport('../js/entities/models.js'), tryImport('../js/entities/monsters.js'), tryImport('../js/entities/bosses.js'),
  tryImport('../js/entities/mortals.js'), tryImport('../js/heroes/index.js'), tryImport('../js/entities/people.js'),
  tryImport('../js/entities/champions.js'), tryImport('../js/text_config.js'),
]);
const PEOPLE = people.PEOPLE ?? {};
const HEROES = heroes.HEROES ?? {}, HERO_LOOKS = models.HERO_LOOKS ?? {};
const MONSTERS = monsters.MONSTERS ?? {}, BOSS_DEFS = bosses.BOSS_DEFS ?? {}, MORTALS = mortals.MORTALS ?? {};
// the poses, the in-game attacks (a real Enemy or Boss in a small fake game) and the animation lint
const [ingame, animlint, descs] = await Promise.all([tryImport('./ingame.js'), tryImport('./animlint.js'), tryImport('./descriptions.js')]);
const DESCRIPTIONS = descs.DESCRIPTIONS ?? {};

const GROUPS = [
  { id: 'heroes', label: 'Heroes' }, { id: 'npcs', label: 'Camp NPCs' }, { id: 'monsters', label: 'Monsters' },
  { id: 'bosses', label: 'Bosses' }, { id: 'champions', label: 'Champions' }, { id: 'mortals', label: 'Mortal disguises' }, { id: 'people', label: 'Open-world people' },
];
// A real mortal (monsters.js 'mortal') is drawn in game as a person (Enemy builds the Mist's mortal look, never its placeholder 'pup' model), so the workbench builds the same: an ordinary museum visitor.
const WB_MORTAL = 'tourist';
// ?capture=1 (or ?thumb=1): a clean frame for a screenshot or page thumbnail, with no description overlay
if (q.has('capture') || q.has('thumb')) document.body.classList.add('capture');
const TIER_COLOR = { minor: '#9a9a8a', elite: '#4ad0ff', champion: '#ff9a2a', boss: '#e8664a' };
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const items = [];
const add = (group, id, name, data, build, chip) => items.push({ group, id, name, data, build, chip, key: id });
{
  const heroIds = [...new Set([...Object.keys(HEROES), ...Object.keys(HERO_LOOKS)])];
  for (const id of heroIds) {
    add('heroes', id, HEROES[id]?.name ?? pretty(id), HEROES[id] ?? {}, HERO_LOOKS[id] && models.buildHeroModel ? () => models.buildHeroModel(id) : () => { throw new Error('no 3D model for this hero yet'); }, HEROES[id]?.color ?? '#c9963a');
  }
  const npcs = { chiron: ['Chiron', 'Activities director of Camp Half-Blood, a centaur. Not playable.'], mr_d: ['Mr. D', 'Camp director (Dionysus). Not playable.'] };
  for (const [id, [name, blurb]] of Object.entries(npcs)) add('npcs', id, name, { blurb }, () => models.buildNpc(id), '#f28c28');
  if (models.buildDummy) add('npcs', 'dummy', 'Training Dummy', { blurb: 'Straw dummy for the hub and the test room.' }, () => models.buildDummy(), '#d8c078');
  for (const id of monsters.MONSTER_IDS ?? Object.keys(MONSTERS)) add('monsters', id, MONSTERS[id].name ?? pretty(id), MONSTERS[id], () => (MONSTERS[id].mortal ? mortals.buildMortal(WB_MORTAL) : monsters.buildMonsterModel(MONSTERS[id].model)), TIER_COLOR[MONSTERS[id].tier] ?? '#9a9a8a');
  for (const id of bosses.BOSS_IDS ?? Object.keys(BOSS_DEFS)) add('bosses', id, BOSS_DEFS[id].name ?? pretty(id), BOSS_DEFS[id], () => BOSS_DEFS[id].build(), BOSS_DEFS[id].color != null ? hex(BOSS_DEFS[id].color) : TIER_COLOR.boss);
  for (const id of mortals.MORTAL_IDS ?? Object.keys(MORTALS)) add('mortals', id, MORTALS[id].name ?? pretty(id), MORTALS[id], () => mortals.buildMortal(id), '#e4d4b8');
  // the open world's side-quest people (model 'npc:<id>' in world/regions and world/road)
  for (const id of people.PEOPLE_IDS ?? Object.keys(PEOPLE)) add('people', id, PEOPLE[id].name ?? pretty(id), PEOPLE[id], () => people.buildPerson(id), PEOPLE[id].accent != null ? hex(PEOPLE[id].accent) : '#c9963a');
  // the open world's named champions, and the crowned look a Road West champion of each kind wears (entities/champions.js)
  for (const id of champions.CHAMPION_SHOWCASE ?? []) {
    const kind = id.startsWith('kind:') ? id.slice(5) : null;
    const name = kind ? `${MONSTERS[kind]?.name ?? pretty(kind)} (Road West champion)` : (text.TEXT?.champions?.[id]?.name ?? pretty(id.replace(/^[a-z]+_/, '')));
    add('champions', id, name, kind ? { ...MONSTERS[kind], blurb: 'The look a Road West champion of this kind wears: a crown, a glow and its own colours.' } : { tier: 'champion', blurb: 'A named champion of the open world (world/regions): triple health, an epic chest when beaten.' }, () => champions.buildShowcase(id), TIER_COLOR.champion);
  }
  const seen = new Map(); for (const it of items) seen.set(it.id, (seen.get(it.id) ?? 0) + 1);
  for (const it of items) if (seen.get(it.id) > 1) it.key = `${it.group}:${it.id}`;
}
const itemByKey = (k) => items.find((i) => i.key === k) ?? items.find((i) => `${i.group}:${i.id}` === k) ?? items.find((i) => i.id === k);

// ------------------------------------------------------------------ renderer + stage
const stageEl = $('stage');
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
stageEl.appendChild(renderer.domElement);
await renderer.init();
const isGPU = !!renderer.backend?.isWebGPUBackend;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 600);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.12; controls.screenSpacePanning = true;

// background: dark, light, or a sky gradient
function gradientTex(stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([p, col]) => gr.addColorStop(p, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const BGS = {
  dark: { label: 'dark', bg: gradientTex([[0, '#0d0a07'], [1, '#2a2012']]), ground: 0x3a3226, ring: 0xc9963a },
  light: { label: 'light', bg: new THREE.Color(0xb8bcc4), ground: 0xa8acb4, ring: 0x8a5f1c },
  sky: { label: 'game sky', bg: gradientTex([[0, '#5b9bd5'], [0.65, '#a9d2ee'], [1, '#e8e4cf']]), ground: 0x6a8a52, ring: 0xf0c867 },
};
let bgName = BGS[q.get('bg')] ? q.get('bg') : 'dark';

// three-point lighting, shaped like the game's look: warm key with shadow, cool fill, golden rim
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x7a6a50, 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
const fill = new THREE.DirectionalLight(0x9ab8ff, 0.8), rim = new THREE.DirectionalLight(0xffd9a0, 1.6);
scene.add(sun, sun.target, fill, fill.target, rim, rim.target);

// ground disc with a radial fade (the shadow shows only where the disc is opaque)
const radial = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.62, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
})();
const groundMat = new THREE.MeshStandardNodeMaterial({ color: 0x3a3226, roughness: 0.95, transparent: true, alphaMap: radial, depthWrite: false });
const ground = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), groundMat); ground.receiveShadow = true; ground.renderOrder = -1; scene.add(ground);
const ringMat = new THREE.MeshBasicNodeMaterial({ color: 0xc9963a, transparent: true, opacity: 0.55 });
const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.635, 96).rotateX(-Math.PI / 2), ringMat); ring.position.y = 0.004; scene.add(ring);

const holder = new THREE.Group(); scene.add(holder);        // the model in the viewer
const thumbHolder = new THREE.Group(); scene.add(thumbHolder); // a model being photographed
const refGroup = new THREE.Group(); scene.add(refGroup);    // 1-block cube and a hero silhouette
const percyGroup = new THREE.Group(); scene.add(percyGroup); // the Percy reference (toolbar): full colour, true size, draggable
function applyBg() {
  const b = BGS[bgName];
  scene.background = b.bg; groundMat.color.setHex(b.ground); ringMat.color.setHex(b.ring);
  $('b-bg').textContent = `Background: ${b.label}`;
}
applyBg();

function fitLights(center, r) {
  sun.position.copy(center).add(new THREE.Vector3(0.55, 1.05, 0.8).normalize().multiplyScalar(r * 5)); sun.target.position.copy(center);
  const s = sun.shadow.camera; s.left = s.bottom = -r * 2; s.right = s.top = r * 2; s.near = r * 0.5; s.far = r * 12; s.updateProjectionMatrix();
  fill.position.copy(center).add(new THREE.Vector3(-1, 0.3, 0.7).multiplyScalar(r * 4)); fill.target.position.copy(center);
  rim.position.copy(center).add(new THREE.Vector3(-0.3, 0.7, -1).multiplyScalar(r * 4)); rim.target.position.copy(center);
  const R = Math.max(2.4, r * 2.4); ground.scale.setScalar(R); ring.scale.setScalar(R);
}

// ------------------------------------------------------------------ model bookkeeping
const meshesOf = (root) => { const out = []; root.traverse((o) => { if (o.isMesh || o.isInstancedMesh) out.push(o); }); return out; };
const matsOf = (m) => (Array.isArray(m.material) ? m.material : [m.material]).filter(Boolean);
function measure(rig) {
  rig.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(rig.root);
  if (box.isEmpty()) box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1.8, 0.5));
  let tris = 0; const mats = new Set(), meshes = meshesOf(rig.root);
  for (const m of meshes) {
    const g = m.geometry; const n = g?.index ? g.index.count / 3 : (g?.attributes.position?.count ?? 0) / 3;
    tris += n * (m.isInstancedMesh ? m.count : 1); matsOf(m).forEach((x) => mats.add(x));
  }
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  return { box, size, center, r: Math.max(0.6, box.getBoundingSphere(new THREE.Sphere()).radius), tris: Math.round(tris), meshes: meshes.length, mats: mats.size };
}
// Heroes and camp NPCs get a fresh material and skin texture on every build, so
// those are released with the geometry. Monster, boss and mortal materials are
// cached by the game, so only their geometry is released (three re-uploads it
// if a cached part is ever reused).
function disposeRig(rig, item) {
  if (!rig) return;
  const own = item.group === 'heroes' || item.group === 'npcs';
  rig.root.removeFromParent();
  rig.root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (own) for (const m of matsOf(o)) { m.map?.dispose(); m.dispose(); }
  });
}
function safeBuild(item) {
  try {
    const rig = item.build();
    if (!rig?.root) throw new Error('builder returned no rig');
    return { rig };
  } catch (e) { console.warn('workbench: build failed for', item.key, e); return { error: e }; }
}

// ------------------------------------------------------------------ thumbnails
const TS = 176;
const thumbRT = new THREE.RenderTarget(TS, TS, { type: THREE.UnsignedByteType, samples: 4 });
thumbRT.texture.colorSpace = THREE.SRGBColorSpace;
const thumbCam = new THREE.PerspectiveCamera(30, 1, 0.05, 600);
const thumbs = new Map();           // key -> { url } | { error }
const tileOf = new Map();           // key -> button
const queue = [], queued = new Set();
let flipRows = !isGPU;              // WebGL readback is bottom-up, WebGPU top-down
const canvas2d = document.createElement('canvas'); canvas2d.width = canvas2d.height = TS;
async function photograph(item) {
  const { rig, error } = safeBuild(item);
  if (error) return { error: error.message };
  try {
    rig.root.rotation.y = 0.6;
    if (typeof rig.animate === 'function') { try { rig.animate({ dt: 1, speed: 0, vel: new THREE.Vector3(), action: null }); } catch { /* keep the rest pose */ } }
    const m = measure(rig);
    thumbHolder.add(rig.root);
    fitLights(m.center, m.r);
    const dir = new THREE.Vector3(0.5, 0.28, 1).normalize();
    thumbCam.position.copy(m.center).addScaledVector(dir, m.r / Math.sin(THREE.MathUtils.degToRad(15)) * 1.04);
    thumbCam.lookAt(m.center); thumbCam.updateMatrixWorld();
    const refVis = refGroup.visible, percyVis = percyGroup.visible; holder.visible = false; refGroup.visible = false; percyGroup.visible = false;
    const bg = scene.background; scene.background = null;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(thumbRT); renderer.render(scene, thumbCam); renderer.setRenderTarget(null);
    rig.root.removeFromParent();   // out of the scene before the async read-back, or the viewer draws it too
    scene.background = bg; holder.visible = true; refGroup.visible = refVis; percyGroup.visible = percyVis;
    if (current) { const f = viewFrame(); fitLights(f.c, f.r); }
    const buf = await renderer.readRenderTargetPixelsAsync(thumbRT, 0, 0, TS, TS);
    const px = buf instanceof Uint8Array || buf instanceof Uint8ClampedArray ? buf : Uint8Array.from(buf, (v) => Math.max(0, Math.min(255, v * 255)));
    // WebGPU pads every read-back row to a multiple of 256 bytes (176 px is 704
    // bytes, padded to 768), so the stride comes from the buffer, not the width.
    const img = new ImageData(TS, TS), row = TS * 4, stride = (px.length - row) / (TS - 1);
    for (let y = 0; y < TS; y++) { const s = (flipRows ? TS - 1 - y : y) * stride; img.data.set(px.subarray(s, s + row), y * row); }
    const g = canvas2d.getContext('2d'); g.putImageData(img, 0, 0);
    return { url: canvas2d.toDataURL('image/png') };
  } catch (e) {
    console.warn('workbench: thumbnail failed for', item.key, e);
    holder.visible = true; refGroup.visible = showRef; percyGroup.visible = percyOn && !!current?.m; scene.background = BGS[bgName].bg; renderer.setRenderTarget(null);
    return { error: e.message };
  } finally { disposeRig(rig, item); }
}
function paintTile(item) {
  const t = tileOf.get(item.key), th = t?.querySelector('.th'), r = thumbs.get(item.key);
  if (!th || !r) return;
  th.className = 'th'; th.textContent = '';
  if (r.url) th.append(el('img', { src: r.url, alt: '', draggable: 'false' }));
  else { th.classList.add('err'); th.textContent = 'build error'; th.title = r.error; }
}
let pumping = false;
async function pump() {
  if (pumping) return; pumping = true;
  while (queue.length) {
    const item = queue.shift(); queued.delete(item.key);
    if (thumbs.has(item.key)) continue;
    thumbs.set(item.key, await photograph(item)); paintTile(item);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));   // stay responsive
  }
  pumping = false;
}
function want(item, front) {
  if (thumbs.has(item.key) || queued.has(item.key)) { if (front && queued.has(item.key)) { queue.splice(queue.indexOf(item), 1); queue.unshift(item); } return; }
  queued.add(item.key); front ? queue.unshift(item) : queue.push(item); pump();
}
// ------------------------------------------------------------------ animation lint
// Each model's poses checked in the background (animlint.js: floor, detached
// parts, weapons at the strike); a badge on its tile, the details in the inspector.
const lints = new Map();            // key -> { problems, failing } | { error }
const lintQueue = [];
let linting = false;
function wantLint(item, front) {
  if (!animlint.lintModel || lints.has(item.key)) return;
  const i = lintQueue.indexOf(item); if (i >= 0) lintQueue.splice(i, 1);
  front ? lintQueue.unshift(item) : lintQueue.push(item);
  if (!linting) { linting = true; setTimeout(lintNext, front ? 30 : 400); }
}
function lintNext() {
  const item = lintQueue.shift();
  if (!item) { linting = false; return; }
  if (!lints.has(item.key)) {
    let r;
    try { r = animlint.lintModel({ group: item.group, id: item.id, build: item.build }, { heroStyles: true }); } catch (e) { r = { error: e.message, problems: [], failing: 0 }; console.warn('workbench: lint failed', item.key, e); }
    lints.set(item.key, r); paintLint(item);
    if (current?.item === item) renderInspector();
  }
  setTimeout(lintNext, queue.length ? 250 : 60);   // (thumbnails first)
}
function paintLint(item) {
  const b = tileOf.get(item.key)?.querySelector('.lint'), r = lints.get(item.key);
  if (!b || !r) return;
  const n = r.failing, info = r.problems.filter((p) => p.info).length;
  b.hidden = !n && !r.error; b.textContent = r.error ? '!' : String(n);
  b.title = r.error ? `Lint failed: ${r.error}` : `${n} animation problem${n === 1 ? '' : 's'}: ${[...new Set(r.problems.filter((p) => !p.info).map((p) => `${p.label} (${p.check})`))].join(', ')}${info ? ` · ${info} more in hero styles` : ''}`;
}
function lintSection(item) {
  const r = lints.get(item.key);
  if (!animlint.lintModel) return null;
  if (!r) return sect('Animation lint', el('div', { class: 'dim', text: 'Checking every pose…' }));
  const row = (p) => el('li', { class: p.info ? 'info' : null }, el('button', { class: 'lint-pose', title: 'Show this pose at the frame', onclick: () => seekLint(p), text: p.label }), ' ', el('b', { text: p.check }), ' ', animlint.describe(p), el('small', { text: ` · frame ${p.frame} (${p.time} s)` }));
  const real = r.problems.filter((p) => !p.info), hero = r.problems.filter((p) => p.info);
  return sect(`Animation lint${real.length ? ` (${real.length})` : ''}`,
    r.error ? el('div', { class: 'err', text: r.error }) : null,
    real.length ? el('ul', { class: 'list lint-list' }, real.map(row)) : el('div', { class: 'dim', text: 'No problems in the poses the game plays.' }),
    hero.length ? [el('div', { class: 'dim', text: 'In hero styles (never played on this model in game):' }), el('ul', { class: 'list lint-list' }, hero.map(row))] : null,
    el('div', { class: 'dim', text: `Frames at 30 a second from the start of the pose. Floor: more than ${animlint.FLOOR_TOL} m (or ${animlint.FLOOR_K * 100}% of the height) under; deaths sink on purpose. Detached: further than ${animlint.FLY_K} x the model's size from rest, or NaN. Weapon: tip forward share under ${animlint.STRIKE_MIN} all through the strike.` }));
}
const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { const it = itemByKey(e.target.dataset.key); if (it) want(it, true); } }, { root: $('grid'), rootMargin: '120px' });

// ------------------------------------------------------------------ left panel
let groupFilter = 'all', filterText = '';
const visible = (it) => (groupFilter === 'all' || it.group === groupFilter) && (!filterText || `${it.name} ${it.id} ${it.group} ${it.data?.tier ?? ''}`.toLowerCase().includes(filterText));
function buildTabs() {
  const tabs = $('tabs'); tabs.textContent = '';
  for (const g of [{ id: 'all', label: 'All' }, ...GROUPS]) {
    const n = items.filter((i) => g.id === 'all' || i.group === g.id).length;
    if (!n) continue;
    tabs.append(el('button', { role: 'tab', 'aria-pressed': String(groupFilter === g.id), onclick: () => { groupFilter = g.id; buildTabs(); buildGrid(); }, text: `${g.label} ${n}` }));
  }
}
function buildGrid() {
  const grid = $('grid'); io.disconnect(); grid.textContent = ''; tileOf.clear();
  let any = false;
  for (const g of GROUPS) {
    const list = items.filter((i) => i.group === g.id && visible(i));
    if (!list.length) continue; any = true;
    grid.append(el('section', { class: 'group' }, el('h2', {}, g.label, el('span', { text: String(list.length) })),
      el('div', { class: 'tiles' }, list.map((it) => {
        const t = el('button', { class: 'tile', role: 'option', 'data-key': it.key, 'aria-selected': String(current?.item === it), title: `${it.name} (${it.id})`, onclick: () => select(it) },
          el('span', { class: 'chip', style: `background:${it.chip}` }), el('span', { class: 'lint', hidden: true }), el('span', { class: 'th wait' }), el('span', { class: 'nm', text: it.name }));
        tileOf.set(it.key, t); if (thumbs.has(it.key)) queueMicrotask(() => paintTile(it)); if (lints.has(it.key)) queueMicrotask(() => paintLint(it)); io.observe(t); return t;
      }))));
  }
  if (!any) grid.append(el('p', { class: 'empty', text: items.length ? 'No model matches the filter.' : 'No models could be loaded.' }));
  if (cursor && tileOf.has(cursor.key)) tileOf.get(cursor.key).classList.add('cursor');
}
$('search').addEventListener('input', (e) => { filterText = e.target.value.trim().toLowerCase(); buildGrid(); });
$('search').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; filterText = ''; buildGrid(); e.target.blur(); } else if (e.key === 'ArrowDown') { e.preventDefault(); e.target.blur(); moveCursor(0, 1, true); } });

let cursor = null;
function setCursor(it, scroll = true) {
  cursor = it; document.querySelectorAll('.tile.cursor').forEach((t) => t.classList.remove('cursor'));
  const t = it && tileOf.get(it.key); if (t) { t.classList.add('cursor'); if (scroll) t.scrollIntoView({ block: 'nearest' }); }
}
function moveCursor(dx, dy, andSelect) {
  const tiles = [...document.querySelectorAll('.tile')]; if (!tiles.length) return;
  let i = tiles.findIndex((t) => t.dataset.key === (cursor ?? current?.item)?.key);
  let next;
  if (i < 0) next = tiles[0];
  else if (dy === 0) next = tiles[Math.max(0, Math.min(tiles.length - 1, i + dx))];
  else {
    const r = tiles[i].getBoundingClientRect(), cx = r.left + r.width / 2;
    const cand = tiles.filter((t) => { const b = t.getBoundingClientRect(); return dy > 0 ? b.top > r.top + 6 : b.top < r.top - 6; });
    if (cand.length) {
      const rowTop = dy > 0 ? Math.min(...cand.map((t) => t.getBoundingClientRect().top)) : Math.max(...cand.map((t) => t.getBoundingClientRect().top));
      next = cand.filter((t) => Math.abs(t.getBoundingClientRect().top - rowTop) < 6).sort((a, b) => Math.abs(a.getBoundingClientRect().left + a.offsetWidth / 2 - cx) - Math.abs(b.getBoundingClientRect().left + b.offsetWidth / 2 - cx))[0];
    } else next = tiles[i];
  }
  const it = itemByKey(next.dataset.key); setCursor(it); if (andSelect) select(it);
}
function cycleGroup(d) {
  const ids = ['all', ...GROUPS.filter((g) => items.some((i) => i.group === g.id)).map((g) => g.id)];
  groupFilter = ids[(ids.indexOf(groupFilter) + d + ids.length) % ids.length]; buildTabs(); buildGrid();
  const first = items.find(visible); if (first) { setCursor(first); }
}

// ------------------------------------------------------------------ viewer state
let current = null;       // { item, rig, m, error }
let turning = q.get('turn') !== '0';
let anim = ANIM_FROM_URL();
let animT = 0, animCycle = 0, animError = null;
let wire = false, showBox = false, showRef = false, boxHelper = null;
let trueScale = q.has('scale') ? q.get('scale') === 'true' : (() => { try { return localStorage.getItem('wb-true-scale') === '1'; } catch { return false; } })();
const TRUE_C = new THREE.Vector3(-1, 2.3, 0), TRUE_R = 4.3;   // the fixed True scale frame: Percy and a model up to a full hellhound
let percyH = 0;                                                  // Percy's height in blocks, measured from the reference figure
const wired = [];         // materials switched to wireframe, restored on switch
function ANIM_FROM_URL() { return q.get('anim') || 'idle'; }

// The hero poses (ingame.js HERO_POSES). Monsters, champions and bosses also
// get their own attacks as the game plays them ('game:<key>': an InGame
// harness runs the real Enemy or Boss against a dummy on a flat floor).
const ANIMS = ingame.HERO_POSES ?? { idle: { label: 'Idle', speed: 0 } };
const animSt = { t: 0 };   // (ingame.js poseStep's clock)
let game = null;           // the InGame harness while an in-game attack plays
let paused = false;        // the pose held still (Pause, or a lint row's frame)
const gameVariants = (item) => (ingame.inGameVariants && item ? ingame.inGameVariants(item.group, item.id) : []);
function stopGame() {
  if (!game) return;
  game.dispose(); game = null; holder.rotation.y = 0;
  if (current?.rig) current.rig.root.visible = true;
}
// Play a pose: a hero pose on the model itself, or an in-game attack in its harness.
function setAnim(id) {
  anim = id; animT = 0; animCycle = 0; animSt.t = 0; animError = null; setPaused(false);
  const n = $('anim-err'); if (n) n.textContent = '';
  stopGame();
  if (id.startsWith('game:') && current?.rig) {
    try {
      game = new ingame.InGame(current.item.group, current.item.id, id.slice(5));
      holder.add(game.group); current.rig.root.visible = false;
    } catch (e) { animError = e; console.warn('workbench: in-game attack failed', e); if (n) n.textContent = `In-game attack failed: ${e.message}`; }
    resetView();
  } else if (current?.m) resetView();
  document.querySelectorAll('[data-anim]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.anim === id)));
}
function setPaused(on) { paused = on; const b = $('anim-pause'); if (b) { b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Play' : 'Pause'; } }
// Show the frame a lint problem was found on: the pose from the same start
// (animlint.js: SETTLE s at rest, then 30 frames a second), held there.
function seekLint(p) {
  setAnim(p.pose);
  const rig = current?.rig, dt = 1 / 30;
  if (!rig) return;
  try {
    const st = { t: 0 }, r = game ? game.rig : rig;
    for (let t = 0; t < (animlint.SETTLE ?? 0.6); t += dt) ingame.poseStep(r, 'idle', st, dt);
    animSt.t = 0;
    for (let f = 0; f <= p.frame; f++) { if (game) game.step(dt); else ingame.poseStep(rig, anim, animSt, dt); }
  } catch (e) { console.warn('workbench: seek failed', e); }
  setPaused(true); status(`${p.label}: frame ${p.frame} (${p.time} s), paused`);
}

function setWire(on) {
  for (const m of wired.splice(0)) m.wireframe = false;
  wire = on;
  if (on && current?.rig) for (const mesh of meshesOf(current.rig.root)) for (const m of matsOf(mesh)) { if (!m.wireframe) { m.wireframe = true; wired.push(m); } }
}
function clearModel() {
  stopGame();
  setWire(false);
  if (boxHelper) { boxHelper.removeFromParent(); boxHelper = null; }
  if (current?.rig) disposeRig(current.rig, current.item);
  refGroup.clear();
  current = null;
}
let silhouette = null;
function buildRef() {
  refGroup.clear();
  if (!current?.m) return;
  const { m } = current, x = trueScale ? Math.min(-0.3, m.box.min.x - 0.5) : m.center.x - m.r * 1.05 - 1.4;
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardNodeMaterial({ color: 0xc9963a, roughness: 0.7, transparent: true, opacity: 0.55 }));
  cube.position.set(x, 0.5, m.center.z); cube.castShadow = true;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicNodeMaterial({ color: 0xf0c867 })); cube.add(edges);
  refGroup.add(cube);
  if (!silhouette && models.buildHeroModel) {
    try {
      const r = models.buildHeroModel('percy'), mat = new THREE.MeshStandardNodeMaterial({ color: 0x7a6a50, roughness: 0.9 });
      r.root.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = true; } });
      silhouette = r;
      r.root.updateMatrixWorld(true); percyH = new THREE.Box3().setFromObject(r.root).getSize(new THREE.Vector3()).y;
    } catch (e) { console.warn('workbench: reference hero failed', e); }
  }
  if (silhouette && !percyOn) { silhouette.root.position.set(x - 1.3, 0, trueScale ? 0 : m.center.z); silhouette.root.rotation.y = 0.45; refGroup.add(silhouette.root); }
  refGroup.visible = showRef || trueScale;
}
// The view's frame: fitted to the model, or in True scale one fixed frame
// for every model (grown only when a model and Percy do not fit in it).
function viewFrame() {
  const { m } = current;
  if (game) {   // an in-game attack: the monster and its target, with room for a lunge
    const d = game.target.pos.z, r = Math.max(m.r * 1.15, d / 2 + m.r * 0.7);
    return { c: new THREE.Vector3(0, Math.min(m.size.y * 0.5, r * 0.6), d / 2), r };
  }
  if (!trueScale) { const d = percyGroup.visible && percyRig ? percyRig.root.position.distanceTo(m.center) * 0.62 + 0.8 : 0; return { c: m.center, r: Math.max(m.r, d) }; }
  const box = m.box.clone(); refGroup.updateMatrixWorld(true); if (silhouette?.root.parent) box.expandByObject(silhouette.root);
  const pts = [box.min, box.max, new THREE.Vector3(box.min.x, box.min.y, box.max.z), new THREE.Vector3(box.max.x, box.max.y, box.min.z)];
  if (pts.every((p) => p.distanceTo(TRUE_C) <= TRUE_R)) return { c: TRUE_C, r: TRUE_R };
  const s = box.getBoundingSphere(new THREE.Sphere());
  return { c: s.center, r: Math.max(TRUE_R, s.radius) };
}
function resetView() {
  if (!current) return;
  const { c, r } = viewFrame(), fov = THREE.MathUtils.degToRad(camera.fov / 2);
  const d = Math.max(r / Math.sin(fov), r / Math.sin(Math.atan(Math.tan(fov) * camera.aspect))) * (trueScale ? 1.1 : 1.3);
  controls.target.copy(c);
  camera.position.copy(c).addScaledVector((game ? new THREE.Vector3(1, 0.32, 0.3) : new THREE.Vector3(0.45, 0.28, 1)).normalize(), d);   // (an in-game attack from the side, so the lunge reads)
  controls.minDistance = r * 0.35; controls.maxDistance = r * 12; controls.update();
  if (trueScale || game) fitLights(c, r);
}
function setTrueScale(on) {
  trueScale = on; $('b-scale').setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('wb-true-scale', on ? '1' : '0'); } catch { /* storage blocked */ }
  if (current?.m) { if (!on) fitLights(current.m.center, current.m.r); buildRef(); resetView(); renderInspector(); }
}

// ------------------------------------------------------------------ the Percy reference
// Percy at his true size, standing on the edge of the ring and facing the
// model, so every model's intended scale reads at a glance. Drag him about
// the floor to look at a part up close (P toggles; it stays on between models).
let percyOn = (() => { try { return localStorage.getItem('wb-percy-ref') === '1'; } catch { return false; } })();
let percyRig = null, percyDrag = null;
function placePercy() {
  percyGroup.visible = percyOn && !!current?.m;
  if (!percyGroup.visible) return;
  if (!percyRig && models.buildHeroModel) {
    try {
      percyRig = models.buildHeroModel('percy');
      percyRig.animate?.({ dt: 0, speed: 0, vel: new THREE.Vector3(), action: null });
      percyRig.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.percyRef = true; } });
      percyGroup.add(percyRig.root);
    } catch (e) { console.warn('workbench: Percy reference failed', e); return; }
  }
  const R = ring.scale.x * 0.6275, dir = new THREE.Vector3(-0.85, 0, 0.53).normalize();   // front-left of the model, where the default camera sees him
  percyRig.root.position.set(dir.x * R, 0, dir.z * R);
  facePercy();
}
function facePercy() { const p = percyRig.root.position, c = current?.m?.center ?? new THREE.Vector3(); percyRig.root.rotation.y = Math.atan2(c.x - p.x, c.z - p.z); }
function setPercy(on) {
  percyOn = on; $('b-percy').setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('wb-percy-ref', on ? '1' : '0'); } catch { /* storage blocked */ }
  placePercy(); if (current?.m) { buildRef(); resetView(); }
}
{
  // drag Percy along the floor: press on him, move, let go (the orbit controls wait meanwhile)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const at = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!percyGroup.visible || !percyRig) return;
    at(e);
    if (!ray.intersectObject(percyRig.root, true).length || !ray.ray.intersectPlane(floor, hit)) return;
    percyDrag = { id: e.pointerId, off: percyRig.root.position.clone().sub(hit) };
    controls.enabled = false; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.style.cursor = 'grabbing';
    e.stopImmediatePropagation(); e.preventDefault();
  }, { capture: true });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!percyDrag) {
      if (percyGroup.visible && percyRig && e.buttons === 0) { at(e); renderer.domElement.style.cursor = ray.intersectObject(percyRig.root, true).length ? 'grab' : ''; }
      return;
    }
    at(e); if (!ray.ray.intersectPlane(floor, hit)) return;
    percyRig.root.position.set(hit.x + percyDrag.off.x, 0, hit.z + percyDrag.off.z); facePercy();
  });
  const end = (e) => { if (!percyDrag || e.pointerId !== percyDrag.id) return; percyDrag = null; controls.enabled = true; renderer.domElement.style.cursor = ''; };
  renderer.domElement.addEventListener('pointerup', end); renderer.domElement.addEventListener('pointercancel', end);
}

function select(item, { fromHash = false } = {}) {
  if (!item) return;
  clearModel(); animError = null; animT = 0; animCycle = 0;
  const { rig, error } = safeBuild(item);
  current = { item, rig, error };
  if (rig) {
    ingame.prepStatic?.(item.group, item.id, rig);
    rig.root.rotation.y = 0.45; holder.add(rig.root);
    current.m = measure(rig);
    fitLights(current.m.center, current.m.r);
    buildRef(); placePercy(); resetView();
    if (showBox) { boxHelper = new THREE.Box3Helper(current.m.box, 0x4ad0ff); scene.add(boxHelper); }
    if (wire) setWire(true);
    status('');
  } else status(`Build error: ${error.message}`);
  $('t-desc').textContent = DESCRIPTIONS[item.key] ?? '';
  $('t-name').textContent = item.name; $('t-sub').textContent = `${GROUPS.find((g) => g.id === item.group)?.label ?? item.group} · ${item.id}`;
  document.querySelectorAll('.tile').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.key === item.key)));
  setCursor(item);
  if (anim.startsWith('game:') && !gameVariants(item).some((v) => `game:${v.key}` === anim)) anim = 'idle';
  if (rig) setAnim(anim);
  renderInspector();
  wantLint(item, true);
  if (!fromHash) { try { history.replaceState(null, '', `#id=${encodeURIComponent(item.key)}`); } catch { /* sandboxed frames */ } }
}

// ------------------------------------------------------------------ inspector
// Which concept sheet (and which part of it) each model was built from:
// sources.json, written by design/source/build_concept_web.py.
let SOURCES = {};
fetch('sources.json').then((r) => (r.ok ? r.json() : {})).then((j) => { SOURCES = j; if (current) renderInspector(); }).catch(() => { /* no sources */ });
function sourceSection(item) {
  const src = SOURCES[`${item.group}:${item.id}`];
  if (!src) return null;
  const [x, y, w, h] = src.box, SHEET_ASPECT = 1.5;
  const crop = el('button', { class: 'src-crop', title: 'Show the whole sheet', 'aria-label': `Source image: ${src.caption}. Show the whole sheet`, onclick: () => openSheet(src) });
  crop.style.backgroundImage = `url("${src.sheet}")`;
  crop.style.backgroundSize = `${100 / w}% ${100 / h}%`;
  crop.style.backgroundPosition = `${w < 1 ? (x / (1 - w)) * 100 : 0}% ${h < 1 ? (y / (1 - h)) * 100 : 0}%`;
  crop.style.aspectRatio = String((w * SHEET_ASPECT) / h);
  return sect('Source image', crop, el('div', { class: 'dim', text: `${src.caption} · ${src.design}` }));
}
function openSheet(src) {
  const [x, y, w, h] = src.box;
  const close = () => { lb.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const mark = el('div', { class: 'src-mark' });
  Object.assign(mark.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
  const lb = el('div', { class: 'src-lightbox', role: 'dialog', 'aria-label': src.caption, onclick: close },
    el('figure', {}, el('div', { class: 'src-wrap' }, el('img', { src: src.sheet, alt: src.caption }), w < 1 || h < 1 ? mark : null), el('figcaption', { text: `${src.caption} — click or Esc to close` })));
  document.body.append(lb);
  document.addEventListener('keydown', onKey, true);
}
const COLOR_KEY = /color|blast|puff|slash|glow|accent|tint/i;
function fmt(v, key, loose) {
  if (v == null) return '–';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') {
    if (Number.isInteger(v) && v <= 0xffffff && v >= 0 && (loose ? v >= 0x1000 : COLOR_KEY.test(key))) return el('span', {}, el('i', { class: 'sw', style: `background:${hex(v)}` }), hex(v));
    return Number.isInteger(v) ? String(v) : String(+v.toFixed(3));
  }
  if (typeof v === 'string') return /^#[0-9a-f]{6}$/i.test(v) ? el('span', {}, el('i', { class: 'sw', style: `background:${v}` }), v) : v;
  if (Array.isArray(v)) return v.every((x) => typeof x !== 'object') ? el('span', {}, v.map((x, i) => [i ? ', ' : '', fmt(x, key, loose)])) : `${v.length} entries`;
  if (typeof v === 'object') return el('span', {}, Object.entries(v).map(([k, x], i) => [i ? '; ' : '', `${k} `, fmt(x, k, loose)]));
  return null;
}
const table = (obj, { loose = false, skip = [] } = {}) => {
  const rows = Object.entries(obj).filter(([k, v]) => typeof v !== 'function' && !skip.includes(k)).map(([k, v]) => { const f = fmt(v, k, loose); return f == null ? null : el('tr', {}, el('td', { text: k }), el('td', {}, f)); });
  return el('table', { class: 'kv' }, rows);
};
const sect = (title, ...kids) => el('section', {}, el('h3', { text: title }), kids);
const kitCache = new Map();
async function skillsFor(id) {
  if (!['percy', 'annabeth', 'grover', 'clarisse'].includes(id)) return null;   // the kits that exist so far
  if (!kitCache.has(id)) kitCache.set(id, import(`../js/heroes/${id}.js`).then(() => heroes.SKILL_TREES?.[id] ?? null).catch((e) => { console.warn('workbench: kit not loadable', id, e.message); return null; }));
  return kitCache.get(id);
}

function renderInspector() {
  document.querySelector('.src-lightbox')?.remove();   // a new selection closes the sheet viewer
  const box = $('insp'); box.textContent = '';
  if (!current) { box.append(el('p', { class: 'dim', text: 'Pick a model from the grid.' })); return; }
  const { item, rig, m, error } = current, d = item.data ?? {};
  const grp = GROUPS.find((g) => g.id === item.group)?.label ?? item.group;
  box.append(el('section', {}, el('div', { class: 'name', text: item.name }), el('div', { class: 'sub', text: `${grp} · id ${item.id}` }),
    el('div', { class: 'tags' }, [d.tier && el('span', { class: `tag ${d.tier}`, text: d.tier }), d.soon && el('span', { class: 'tag', text: 'not playable yet' }), d.title && item.group === 'heroes' && el('span', { class: 'tag', text: d.title })].filter(Boolean))));
  const srcSec = sourceSection(item); if (srcSec) box.append(srcSec);
  if (error) box.append(sect('Build error', el('div', { class: 'err', text: String(error.stack ?? error.message).split('\n').slice(0, 5).join('\n') })));

  if (item.group === 'heroes') {
    box.append(sect('Hero', d.desc ? el('p', { class: 'desc', text: d.desc }) : null, table(d, { skip: ['desc', 'name'] })));
    const slot = el('div', { class: 'dim', text: 'Loading abilities…' }); box.append(sect('Abilities', slot));
    skillsFor(item.id).then((sk) => {
      if (current?.item !== item) return;
      slot.textContent = '';
      const power = d.power && el('li', {}, el('b', { text: d.power }), ' ', el('small', { text: 'ultimate' }));
      if (sk?.length || power) slot.replaceWith(el('ul', { class: 'list' }, power, (sk ?? []).map((s) => el('li', {}, el('b', { text: s.name }), ' ', el('small', { text: s.desc ?? '' })))));
      else slot.textContent = 'No ability kit for this hero yet.';
    });
    const look = HERO_LOOKS[item.id];
    if (look) {
      box.append(sect('Look: painted skin', table(look.paint ?? {}, { loose: true })));
      if (look.vox) box.append(sect('Look: voxel hair', table(look.vox, { loose: true })));
      const rest = Object.fromEntries(Object.entries(look).filter(([k]) => !['paint', 'vox'].includes(k)));
      if (Object.keys(rest).length) box.append(sect('Look: other', table(rest, { loose: true })));
    }
  } else if (item.group === 'monsters') {
    box.append(sect('Stat block', table(d, { skip: ['name'] })));
  } else if (item.group === 'bosses') {
    const hooks = ['init', 'tick', 'damageMul', 'onDie', 'ambient'].filter((k) => typeof d[k] === 'function');
    box.append(sect('Boss', el('p', { class: 'desc', text: d.title ?? '' }), table(d, { skip: ['name', 'title', 'phases', 'build'] })));
    if (Array.isArray(d.phases)) box.append(sect(`Phases (${d.phases.length})`, d.phases.map((p, i) => el('div', { class: 'tags' }, el('b', { text: `${i + 1}` }), (Array.isArray(p) ? p : [p]).map((n) => el('span', { class: 'tag', text: String(n) }))))));
    if (hooks.length) box.append(sect('Hooks', el('div', { class: 'tags' }, hooks.map((h) => el('span', { class: 'tag', text: h })))));
  } else if (item.group === 'mortals') {
    box.append(sect('Disguise', d.blurb ? el('p', { class: 'desc', text: d.blurb }) : null, table(d.paint ?? {}, { loose: true })));
  } else if (item.group === 'people') {
    box.append(sect('Person', el('p', { class: 'desc', text: `npc:${item.id} · painted like ${d.painter === 'hero' ? 'the heroes' : 'the mortals'}` }), table(Object.fromEntries(Object.entries(d.paint ?? {}).filter(([, v]) => typeof v !== 'function')), { loose: true })));
  } else if (d.blurb) box.append(sect('About', el('p', { class: 'desc', text: d.blurb })));

  if (rig && m) {
    const extras = Object.keys(rig.extras ?? {});
    box.append(sect('Geometry',
      table({ triangles: m.tris.toLocaleString(), meshes: m.meshes, materials: m.mats, 'size (blocks)': `${m.size.x.toFixed(2)} × ${m.size.y.toFixed(2)} × ${m.size.z.toFixed(2)}  (w × h × d)`, 'height vs Percy': percyH ? `× ${(m.size.y / percyH).toFixed(2)}` : '–', 'root scale': +rig.root.scale.x.toFixed(3), 'voxel (blocks)': +(rig.root.scale.x * PX).toFixed(4), parts: extras.length ? extras.join(', ') : '–' })));
    const can = typeof rig.animate === 'function';
    // the hero poses (for a monster, those the game never plays on it are marked as hero styles), then its in-game attacks
    const used = ingame.GAME_POSES?.[item.group], monster = ingame.MONSTER_GROUPS?.has(item.group), vars = gameVariants(item);
    const poseBtn = (id, label, hero) => el('button', { 'data-anim': id, class: hero ? 'hero-style' : null, title: hero ? 'A hero pose: the game never plays it on this model' : null, 'aria-pressed': String(anim === id), onclick: () => setAnim(id), text: label });
    box.append(sect('Animation', can ? el('div', { class: 'row', id: 'anim-row' }, Object.entries(ANIMS).filter(([id]) => !monster || used?.includes(id)).map(([id, a]) => poseBtn(id, a.label)))
      : el('div', { class: 'dim', text: 'This model has no rig animation.' }),
    can && vars.length ? [el('div', { class: 'dim', text: 'In game: its own attacks, run by the game\'s code against a dummy' }), el('div', { class: 'row' }, vars.map((v) => poseBtn(`game:${v.key}`, v.label)))] : null,
    can && monster ? [el('div', { class: 'dim', text: 'Hero styles (never played on this model in game)' }), el('div', { class: 'row' }, Object.entries(ANIMS).filter(([id]) => !used?.includes(id)).map(([id, a]) => poseBtn(id, a.label, true)))] : null,
    can ? el('button', { id: 'anim-pause', 'aria-pressed': String(paused), onclick: () => setPaused(!paused), text: paused ? 'Play' : 'Pause' }) : null,
    can ? el('label', { class: 'dim' }, 'Speed ', el('input', { type: 'range', id: 'anim-speed', min: '0.1', max: '2', step: '0.05', value: '1' })) : null,
    el('div', { class: 'err', id: 'anim-err' })));
    box.append(sect('View',
      el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: wire, onchange: (e) => setWire(e.target.checked) }), 'Wireframe'),
      el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: showBox, onchange: (e) => { showBox = e.target.checked; if (boxHelper) { boxHelper.removeFromParent(); boxHelper = null; } if (showBox) { boxHelper = new THREE.Box3Helper(current.m.box, 0x4ad0ff); scene.add(boxHelper); } } }), 'Bounding box'),
      el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: showRef, onchange: (e) => { showRef = e.target.checked; refGroup.visible = showRef || trueScale; } }), 'Scale reference (1 block + Percy)'),
      el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: trueScale, onchange: (e) => setTrueScale(e.target.checked) }), 'True scale (fixed camera, Percy beside it)'),
      el('div', { class: 'dim', text: 'True Sight is not offered: character materials do not read the sight uniform.' })));
    box.append(lintSection(item));
  }
  const key = `wb-notes:${item.key}`;
  let saved = ''; try { saved = localStorage.getItem(key) ?? ''; } catch { /* storage blocked */ }
  box.append(sect('Notes', el('textarea', { placeholder: 'Reserved for future use. Notes typed here stay in this browser only.', 'aria-label': 'Notes', value: saved, oninput: (e) => { try { localStorage.setItem(key, e.target.value); } catch { /* ignore */ } } })));
  const ta = box.querySelector('textarea'); if (ta) ta.value = saved;
}

// ------------------------------------------------------------------ toolbar, keys, link
function syncTurn() { $('b-turn').setAttribute('aria-pressed', String(turning)); }
syncTurn();
$('b-turn').onclick = () => { turning = !turning; syncTurn(); };
$('b-reset').onclick = resetView;
$('b-scale').setAttribute('aria-pressed', String(trueScale));
$('b-scale').onclick = () => setTrueScale(!trueScale);
$('b-percy').setAttribute('aria-pressed', String(percyOn));
$('b-percy').onclick = () => setPercy(!percyOn);
$('b-bg').onclick = () => { const k = Object.keys(BGS); bgName = k[(k.indexOf(bgName) + 1) % k.length]; applyBg(); };
$('b-link').onclick = async () => {
  if (!current) return;
  const url = `${location.origin}${location.pathname}#id=${encodeURIComponent(current.item.key)}`;
  try { await navigator.clipboard.writeText(url); status('Link copied'); } catch {
    const t = el('textarea', { style: 'position:fixed;opacity:0' }); t.value = url; document.body.append(t); t.select();
    try { document.execCommand('copy'); status('Link copied'); } catch { status(url); } t.remove();
  }
  setTimeout(() => status(current?.error ? `Build error: ${current.error.message}` : ''), 2200);
};
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName) && document.activeElement.type !== 'checkbox' && document.activeElement.type !== 'range';
  if (typing) return;
  const k = e.key;
  if (k === '/') { e.preventDefault(); $('search').focus(); }
  else if (k === 'ArrowLeft') { e.preventDefault(); moveCursor(-1, 0, true); } else if (k === 'ArrowRight') { e.preventDefault(); moveCursor(1, 0, true); }
  else if (k === 'ArrowUp') { e.preventDefault(); moveCursor(0, -1, true); } else if (k === 'ArrowDown') { e.preventDefault(); moveCursor(0, 1, true); }
  else if (k === 'Enter' && cursor && document.activeElement?.tagName !== 'BUTTON') select(cursor);
  else if (k === 'PageUp') { e.preventDefault(); cycleGroup(-1); } else if (k === 'PageDown') { e.preventDefault(); cycleGroup(1); }
  else if (k === ' ' && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); $('b-turn').click(); }
  else if (k === 'r' || k === 'R') resetView(); else if (k === 't' || k === 'T') setTrueScale(!trueScale); else if (k === 'p' || k === 'P') setPercy(!percyOn); else if (k === 'b' || k === 'B') $('b-bg').click();
});
function fromHash() {
  const id = new URLSearchParams(location.hash.slice(1)).get('id');
  const it = id && itemByKey(id);
  if (it && it !== current?.item) { if (!visible(it)) { groupFilter = 'all'; filterText = ''; $('search').value = ''; buildTabs(); buildGrid(); } select(it, { fromHash: true }); return true; }
  return !!it;
}
addEventListener('hashchange', fromHash);

// ------------------------------------------------------------------ controller
let padPrev = [], padRepeat = 0, padHeld = null;
function pollPad(dt) {
  const gp = (navigator.getGamepads?.() ?? []).find((g) => g && g.connected);
  if (!gp) return;
  const b = (i) => !!gp.buttons[i]?.pressed, edge = (i) => b(i) && !padPrev[i];
  const sx = gp.axes[0] ?? 0, sy = gp.axes[1] ?? 0;
  let dx = (b(15) ? 1 : 0) - (b(14) ? 1 : 0), dy = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
  if (!dx && !dy) { if (Math.abs(sx) > 0.6) dx = Math.sign(sx); else if (Math.abs(sy) > 0.6) dy = Math.sign(sy); }
  const key = `${dx},${dy}`;
  if (dx || dy) { padRepeat -= dt; if (key !== padHeld || padRepeat <= 0) { moveCursor(dx, dy, false); padRepeat = key !== padHeld ? 0.38 : 0.14; padHeld = key; } } else { padHeld = null; padRepeat = 0; }
  if (edge(0) && cursor) select(cursor);
  if (edge(2)) $('b-turn').click(); if (edge(3)) resetView(); if (edge(1)) $('b-bg').click();
  if (edge(4)) cycleGroup(-1); if (edge(5)) cycleGroup(1);
  const rx = gp.axes[2] ?? 0, ry = gp.axes[3] ?? 0, zoom = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
  if (Math.abs(rx) > 0.15 || Math.abs(ry) > 0.15 || Math.abs(zoom) > 0.05) {
    const off = camera.position.clone().sub(controls.target), s = new THREE.Spherical().setFromVector3(off);
    s.theta -= (Math.abs(rx) > 0.15 ? rx : 0) * dt * 2.4; s.phi = THREE.MathUtils.clamp(s.phi + (Math.abs(ry) > 0.15 ? ry : 0) * dt * 1.8, 0.08, Math.PI / 2 + 0.25);
    s.radius = THREE.MathUtils.clamp(s.radius * (1 + zoom * dt * 1.6), controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(off.setFromSpherical(s));
  }
  padPrev = gp.buttons.map((x) => x.pressed);
}

// ------------------------------------------------------------------ frame loop
function resize() {
  const w = Math.max(50, stageEl.clientWidth), h = Math.max(50, stageEl.clientHeight);
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stageEl); resize();
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  pollPad(dt);
  const rig = current?.rig;
  if (rig) {
    if (turning && !paused) { if (game) holder.rotation.y += dt * 0.3; else rig.root.rotation.y += dt * 0.55; }   // (an in-game attack turns the whole arena, slower)
    if (typeof rig.animate === 'function' && !animError && !paused) {
      const speedK = +($('anim-speed')?.value ?? 1), adt = dt * speedK;
      animT += adt;
      try {
        if (game) game.step(adt);
        else if (ingame.poseStep) ingame.poseStep(rig, anim, animSt, adt);   // (the hunch and arm spread on top, a floating rig at its hover height)
      } catch (e) { animError = e; console.warn('workbench: animation failed', e); const n = $('anim-err'); if (n) n.textContent = `Animation failed: ${e.message}`; }
    }
  }
  controls.update();
  renderer.render(scene, camera);
});

// ------------------------------------------------------------------ go
buildTabs(); buildGrid();
if (q.get('lazy') !== '1') setTimeout(() => { for (const it of items) want(it, false); }, 1500);   // then the rest, in the background
if (q.get('lint') !== '0') setTimeout(() => { for (const it of items) wantLint(it, false); }, 2500);   // and the animation lint (?lint=0: only the selected model)
if (loadErrors.length) status(`Some modules failed to load:\n${loadErrors.join('\n')}`);
if (!fromHash()) { const first = items.find((i) => i.group === 'heroes') ?? items[0]; if (first) select(first, { fromHash: true }); else renderInspector(); }
status(isGPU ? '' : '');
stageEl.title = isGPU ? 'WebGPU' : 'WebGL2';
window.__wbSeek = seekLint;
window.__wb = { items, thumbs, lints, setAnim, seek: seekLint, get game() { return game; }, camera, controls, select: (k) => select(itemByKey(k)), get current() { return current; }, backend: isGPU ? 'webgpu' : 'webgl2', queueLength: () => queue.length };
