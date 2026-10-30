// Tardigrade: climbing moss-leaf cell walls with your claws while the water
// film dries ("The Drying"). Seen through a DIC microscope.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { createFeatures } from '../shared/features.js';
import { DicMicroscope } from '../shared/techniques/tardigrade-dic.js';
import { World, Particles, LAYER_SUBSTRATE, LAYER_SPECIMEN } from './world.js';
import { Creature } from './creature.js';
import { Walker, GAITS, setGait } from './gait.js';
import { Life, COMPRESSIONS } from './life.js';
import { wireAssets } from './textures.js';
import { LEAF_FX } from './materials.js';

const MODES = ['DIC (Nomarski)', 'Brightfield', 'Lit (hypothetical)'];
const OBJECTIVES = [
  { name: '10×/0.25', field: 18, coc: 5, dof: 0.06 },
  { name: '20×/0.40', field: 9, coc: 10, dof: 0.035 },
  { name: '40×/0.65', field: 4.6, coc: 20, dof: 0.018 },
];

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
// Software GL (SwiftShader, as in headless checks) cannot afford full-screen
// float passes at full size: draw small and let the browser scale it up.
const glInfo = (() => {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
})();
const SOFTWARE = /swiftshader|llvmpipe|software/i.test(glInfo);
const PR = Number(new URLSearchParams(location.search).get('pr')) || 0; // testing override
renderer.setPixelRatio(PR || (SOFTWARE ? 0.4 : Math.min(devicePixelRatio, 1.5)));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(22, 1, 0.5, 200);
camera.layers.enableAll();
// Lit look only.
const hemi = new THREE.HemisphereLight(0xf2f6e8, 0x41502c, 1.1);
const sun = new THREE.DirectionalLight(0xfff4dc, 2.2);
sun.position.set(4, 10, 3);
for (const l of [hemi, sun]) { l.layers.enableAll(); scene.add(l); }
scene.add(sun.target);

const pad = createPad();
const hud = mountHud({
  title: 'Tardigrade · The Drying',
  sub: 'A ~350 µm eutardigrade gripping moss-leaf cell walls in a drying water film. Differential interference contrast (DIC) look.',
  controls: [
    ['LS', 'Crawl (relative to the view); push into a leaf edge to reach across'],
    ['RS', 'Turn and tilt the view'],
    ['LT', 'Fine focus down'], ['RT', 'Fine focus up'],
    ['LS click', 'Refocus on the animal'],
    ['LB', 'Lower-power objective'], ['RB', 'Higher-power objective'],
    ['A', 'Hold: grip hard / brace (slower, won’t slip)'],
    ['B', 'Bite: stylets into food or a leaf cell'],
    ['Y', 'Hold: curl into a tun (again: wake, if wet)'],
    ['X', 'Optical look: DIC / brightfield / lit'],
    ['D-pad', '↑ rain (test) · ↓ new day · ← anatomy labels'],
    ['View', 'Hide this panel'], ['Menu', 'Features: what this is doing, switches'],
  ],
  note: '1 s = 4 min of the day (240×; change it in Features). Claws drawn 1.6× longer, ~3× thicker than true. DIC relief is optical path, not height.',
});

const toast = (t, ms) => hud.toast(t, ms);
const world = new World(scene);
const assets = wireAssets(world);
const particles = new Particles(scene, assets.atlas);
const creature = new Creature(scene);
let rumbleOn = true;
const rumble = (ms, w, s) => { if (rumbleOn) pad.rumble(ms, w, s); };
let catchBudget = 0;
const walker = new Walker(world, creature, {
  catch(q, big) {
    if (big) { rumble(180, 0.35, 0.6); return; }
    if (catchBudget <= 0) { rumble(45, 0.04, 0.12 + 0.12 * q); catchBudget = 0.12; }
  },
  slip() { toast('Losing grip! Hold A to brace'); rumble(400, 0.5, 0.2); },
  fall(t) { toast(t, 2600); rumble(300, 0.6, 0.8); },
  transfer(t) { toast(t); rumble(120, 0.15, 0.3); },
});
const life = new Life(world, walker, creature, { toast, rumble });
const mic = new DicMicroscope(renderer, scene, camera, { layers: [LAYER_SUBSTRATE, LAYER_SPECIMEN], backdrop: assets.backdrop });
if (SOFTWARE) mic.setQuality(PR ? 2 : 0);

// ---------------------------------------------------------------- view state
const view = { yaw: -0.35, pitch: 1.18, obj: 1, focus: 0, mode: 0, labels: false, target: new THREE.Vector3(), claws: 1, internals: true, sway: true };
view.target.copy(walker.dispPos);

function applyMode(m) {
  view.mode = m;
  mic.mode = Math.min(m, 1);
  scene.traverse((o) => { if (o.userData && o.userData.opt) o.material = m === 2 ? o.userData.lit : o.userData.opt; });
  scene.background = m === 2 ? new THREE.Color(0x6f7d5c) : null;
  scene.fog = m === 2 ? new THREE.Fog(0x6f7d5c, 14, 60) : null;
}

// ---------------------------------------------------------------- features
const features = createFeatures({ key: 'tardigrade', pad });
const F = (o) => features.add(o);
F({ id: 'look', group: 'Rendering', label: 'Optical look', choices: MODES, value: MODES[0],
  about: 'DIC: relief from the gradient of optical path along one shear direction. Brightfield: pigment plus faint refractive edges. Lit: a hypothetical immersive view with ordinary lights (not what a microscope records). X cycles it.',
  onChange: (v) => applyMode(MODES.indexOf(v)) });
F({ id: 'opd', group: 'Rendering', label: 'Optical-path buffers (thickness from closed meshes)', fixed: true,
  about: 'Every transparent object adds Δn·thickness, depth·thickness and pigment into two float targets at once (MRT, additive, double sided): front faces subtract their depth, back faces add it, so each pixel holds the chord through the object. Shared as shared/techniques/tardigrade-dic.js.' });
F({ id: 'dof', group: 'Optics', label: 'Shallow depth of field (focal plane)', on: true,
  about: 'Leaves and specimen are two layers, each blurred by its own mean depth from the focal plane (gather blur). LT/RT turn the fine focus through them. Off: everything sharp.',
  onChange: (v) => (mic.opts.dof = v) });
F({ id: 'fringes', group: 'Optics', label: 'Three-wavelength interference', on: true,
  about: 'Evaluates sin²(π Γ/λ) at red, green and blue wavelengths, giving the warm shadows and cool highlights of real DIC. Off: one wavelength, pure grey.',
  onChange: (v) => (mic.opts.fringes = v) });
F({ id: 'shear', group: 'Optics', label: 'Shear × bias (relief strength)', choices: ['Standard', 'Subtle', 'Strong'], value: 'Standard',
  about: 'How far apart the two beams are and the bias retardation: more shear, stronger one-sided relief.',
  onChange: (v) => { mic.opts.shear = { Standard: 260, Subtle: 120, Strong: 600 }[v]; mic.opts.bias = { Standard: 95, Subtle: 80, Strong: 110 }[v]; } });
F({ id: 'angle', group: 'Optics', label: 'Shear direction', choices: ['45°', '135°', '0°', '90°'], value: '45°',
  about: 'The fixed direction of the prism shear on screen: relief is lit along this axis only, so a wall parallel to it vanishes (true of real DIC).',
  onChange: (v) => (mic.opts.angle = (parseFloat(v) * Math.PI) / 180) });
F({ id: 'grain', group: 'Rendering', label: 'Camera grain', on: true, about: 'Faint per-frame sensor noise.', onChange: (v) => (mic.opts.grain = v) });
F({ id: 'vignette', group: 'Rendering', label: 'Vignette', on: true, about: 'Light fall-off towards the edge of the field.', onChange: (v) => (mic.opts.vignette = v) });
F({ id: 'backdrop', group: 'Rendering', label: 'Out-of-focus backdrop (MP-T03)', on: true,
  about: 'A deeply defocused moss layer behind everything, as soft retardation. Procedural stand-in until the image arrives.', onChange: (v) => (mic.opts.backdrop = v) });
F({ id: 'walls', group: 'World', label: 'Cell walls as optical path', on: true,
  about: 'Raised cell walls, domed cells, costa: drawn per pixel in the leaf shader from the same pattern the claws use, so every foothold is a visible wall.', onChange: (v) => (LEAF_FX.uFx.value.x = v ? 1 : 0) });
F({ id: 'chloro', group: 'World', label: 'Chloroplasts', on: true, about: 'Lens-shaped green plastids lining each living cell: the only strong colour in the field. Cells you have sucked dry lose them.', onChange: (v) => (LEAF_FX.uFx.value.y = v ? 1 : 0) });
F({ id: 'film', group: 'World', label: 'Water film', on: true, about: 'Film thickness = capacity - dryness, as optical path (water vs air Δn 0.33): it shows as menisci and contact lines, not as blue water.', onChange: (v) => (LEAF_FX.uFx.value.z = v ? 1 : 0) });
F({ id: 'meniscus', group: 'World', label: 'Contact-line steepening', on: true, about: 'Film thickness rises as √h from the contact line, so a retreating meniscus is a sharp edge in DIC. Off: linear, soft.', onChange: (v) => (LEAF_FX.uFx.value.w = v ? 1 : 0) });
F({ id: 'artwalls', group: 'World', label: 'Footholds read from the delivered micrographs', fixed: true,
  about: 'When MP-T01/T02 arrive, wallmap.js finds the walls in the image (gradient threshold + chamfer distance transform) and labels the cells (flood fill): the claws hook the walls you see, a pierced cell empties as a whole, and the shader takes colour from the photo but relief from the wall map, so it follows this microscope’s shear.' });
F({ id: 'particles', group: 'World', label: 'Drifting bacteria and detritus', on: true, about: 'Point sprites from a 4×4 atlas (MP-T04 stand-in) in Brownian drift; they stop where the film has gone.', onChange: (v) => (particles.points.visible = v) });
F({ id: 'sdf', group: 'Body', label: 'SDF body from anatomical parts', fixed: true,
  about: 'Head, four trunk regions with cuticle folds, eight lobopod legs (IV terminal, backwards), meshed once with surface nets; buccal tube, stylets, pharyngeal bulb with placoids, eyespots, midgut, gonad and storage cells as separate meshes inside.' });
F({ id: 'internals', group: 'Body', label: 'Internal anatomy visible', on: true, about: 'Show the organs through the translucent cuticle.', onChange: (v) => { view.internals = v; for (const r of creature.internals) r.mesh.visible = v; } });
F({ id: 'claws', group: 'Body', label: 'Claw size', choices: ['Enhanced (1.6× long, ~3× thick)', 'True size'], value: 'Enhanced (1.6× long, ~3× thick)',
  about: 'Real claws are ~10 µm: barely a few pixels at 20×. Enhanced so the grip reads.', onChange: (v) => (view.claws = v.startsWith('True') ? 0.62 : 1) });
F({ id: 'rig', group: 'Body', label: 'Part rig on the CPU', fixed: true,
  about: 'Each vertex knows its part: legs stretch and turn from hip to foot (telescoping lobopods), the trunk carries a travelling lateral wave and the tun contraction, blended where parts meet.' });
F({ id: 'sway', group: 'Motion', label: 'Soft-body sway and surge', on: true, about: 'The trunk bends side to side with the gait and surges with each wave of legs.', onChange: (v) => (view.sway = v) });
F({ id: 'gait', group: 'Motion', label: 'Leg coordination', choices: Object.keys(GAITS), value: Object.keys(GAITS)[0],
  about: 'Measured in Hypsibius (Nirody et al. 2021): steps run back to front along each side, the sides half a cycle apart, a tetrapod-like pattern. Alternatives for comparison.', onChange: setGait });
F({ id: 'footholds', group: 'Motion', label: 'Claws need cell walls', on: true,
  about: 'Each foot searches for the nearest wall within reach and hooks it; junctions and walls across the pull hold best. Off: feet grip anywhere.', onChange: (v) => (walker.opts.footholds = v) });
F({ id: 'gravity', group: 'Motion', label: 'Slope load and slipping (exaggerated)', on: true,
  about: 'Steep and overhanging faces need more claws planted, or the animal slides. Real 0.35 mm animals are held mainly by surface tension; this is a game rule.', onChange: (v) => (walker.opts.gravity = v) });
F({ id: 'time', group: 'Simulation', label: 'Time compression', choices: Object.keys(COMPRESSIONS), value: Object.keys(COMPRESSIONS)[0],
  about: 'How fast the day (and so the drying) runs. Walking and feeding stay real time.', onChange: (v) => (life.compression = COMPRESSIONS[v]) });
F({ id: 'desic', group: 'Simulation', label: 'Desiccation', on: true, about: 'Dry leaf drains the water meter; empty, it forces a hasty tun.', onChange: (v) => (life.opts.desiccation = v) });
F({ id: 'risk', group: 'Simulation', label: 'Revival risk', on: true, about: 'A tun may not wake: worse after a hasty tun, on low reserves and long droughts.', onChange: (v) => (life.opts.risk = v) });
F({ id: 'capacity', group: 'Simulation', label: 'Film capacity field', fixed: true,
  about: 'Per leaf: wetter towards the stem, in random hollows and where another leaf nearly touches (capillary bridges); margins dry first. Film = capacity - dryness, which climbs through the day.' });
F({ id: 'labels', group: 'Controls', label: 'Anatomy labels', on: false, about: 'Name the claws, leg IV, buccal tube, bulb, eyespot, gut and storage cells (D-pad ←).', onChange: (v) => (view.labels = v) });
F({ id: 'rumble', group: 'Controls', label: 'Rumble on claw catch', on: true, about: 'A small knock as each claw hooks a wall; heavy on slips and falls.', onChange: (v) => (rumbleOn = v) });
F({ id: 'camrel', group: 'Controls', label: 'Camera-relative crawl', fixed: true, about: 'The stick direction on screen is projected onto the leaf the animal is on.' });

// ---------------------------------------------------------------- labels
const labelBox = document.createElement('div');
labelBox.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:12px system-ui,sans-serif;color:#fff';
document.body.appendChild(labelBox);
const labelEls = Object.keys(creature.anchors).map((name) => {
  const d = document.createElement('div');
  d.textContent = name;
  d.style.cssText = 'position:absolute;transform:translate(8px,-50%);background:rgba(10,12,16,.6);padding:1px 6px;border-radius:6px;white-space:nowrap';
  const dot = document.createElement('i');
  dot.style.cssText = 'position:absolute;left:-8px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#ffd36e';
  d.appendChild(dot);
  labelBox.appendChild(d);
  return { name, d };
});

// ---------------------------------------------------------------- loop
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const b = renderer.getDrawingBufferSize(new THREE.Vector2());
  mic.setSize(b.x, b.y);
}
addEventListener('resize', resize);
resize();

let last = performance.now();
let time = 0;
const dirV = new THREE.Vector3(), right = new THREE.Vector3(), upS = new THREE.Vector3();
applyMode(view.mode);

window.__micro = { SOFTWARE, scene, camera, renderer, world, walker, creature, life, mic, view, features, applyMode, pad };

function frame() {
  const now = performance.now();
  const rawDt = (now - last) / 1000;
  last = now;
  const dt = Math.min(view.dtMax || 0.05, rawDt);
  if (view.mode !== 2 && !SOFTWARE) mic.autoQuality(rawDt);
  time += dt;
  catchBudget -= dt;
  pad.poll();
  const inMenu = features.update();
  hud.update(pad);
  const B = pad.BTN;
  const P = (b) => !inMenu && pad.pressed(b);
  const D = (b) => !inMenu && pad.down(b);

  if (P(B.X)) { const m = (view.mode + 1) % 3; features.set('look', MODES[m]); toast(MODES[m]); }
  if (P(B.LB) && view.obj > 0) { view.obj--; toast(`Objective ${OBJECTIVES[view.obj].name}`); }
  if (P(B.RB) && view.obj < 2) { view.obj++; toast(`Objective ${OBJECTIVES[view.obj].name}`); }
  if (P(B.UP)) life.rain();
  if (P(B.DOWN)) { life.newDay(); toast('A new day: 05:00, dew-soaked'); }
  if (P(B.LEFT)) features.set('labels', !view.labels);
  if (P(B.LS)) { view.focus = 0; toast('Refocused on the animal'); }
  const rs = inMenu ? { x: 0, y: 0 } : pad.rs();
  view.yaw -= rs.x * dt * 1.6;
  view.pitch = THREE.MathUtils.clamp(view.pitch - rs.y * dt * 1.2, 0.35, 1.52);
  view.focus = THREE.MathUtils.clamp(view.focus + ((inMenu ? 0 : pad.lt()) - (inMenu ? 0 : pad.rt())) * dt * 0.8, -3, 3);

  // Camera-relative crawl direction.
  const ls = inMenu ? { x: 0, y: 0, m: 0 } : pad.ls();
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  upS.setFromMatrixColumn(camera.matrixWorld, 1);
  dirV.set(0, 0, 0).addScaledVector(right, ls.x).addScaledVector(upS, -ls.y);
  const film = life.filmHere();
  const filmF = film < 0.03 ? 0.3 : (0.4 + 0.6 * THREE.MathUtils.smoothstep(film, 0.03, 0.3)) * (film > 1.1 ? 0.7 : 1);
  walker.update(dt, { dir: dirV, mag: ls.m, brace: D(B.A), frozen: life.frozen, film: filmF, energy: life.energy, tun: life.tun > 0.02 });
  if (!view.sway) { creature.pose.sway = 0; creature.pose.surge = 0; creature.pose.bob = 0; }
  life.update(dt, { yDown: D(B.Y), yPressed: P(B.Y), bPressed: P(B.B), aPressed: P(B.A), moving: walker.speed });

  // Creature rig.
  creature.group.matrix.copy(walker.matrix);
  creature.group.matrixWorldNeedsUpdate = true;
  creature.deformAll();
  if (view.claws !== 1) for (const c of creature.claws) { const s = view.claws; c.matrix.multiply(new THREE.Matrix4().makeScale(s, s, s)); }
  if (view.mode === 2) creature.refreshNormals();
  particles.update(dt, walker.dispPos, walker.leaf, walker.side, world);

  // Camera orbit on the animal.
  const ob = OBJECTIVES[view.obj];
  const dist = ob.field / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, camera.aspect) * 1.0;
  view.dist = THREE.MathUtils.lerp(view.dist || dist, dist, 1 - Math.exp(-dt * 4));
  view.target.lerp(walker.dispPos, 1 - Math.exp(-dt * 3));
  camera.position.set(
    view.target.x + view.dist * Math.cos(view.pitch) * Math.sin(view.yaw),
    view.target.y + view.dist * Math.sin(view.pitch),
    view.target.z + view.dist * Math.cos(view.pitch) * Math.cos(view.yaw),
  );
  if (view.fixed) { // turnaround shots (testing): orbit in the animal's own frame
    const { yaw, pitch } = view.fixed;
    const off = new THREE.Vector3(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)).multiplyScalar(view.fixed.dist || 9);
    view.target.copy(walker.dispPos);
    camera.up.set(0, 1, 0).applyQuaternion(walker.dispQuat);
    camera.position.copy(walker.dispPos).add(off.applyQuaternion(walker.dispQuat));
  }
  camera.lookAt(view.target);
  camera.updateMatrixWorld();
  sun.target.position.copy(view.target);

  // Render.
  const H = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
  const ref = camera.position.distanceTo(walker.dispPos);
  const pxPerUnit = H / (2 * ref * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  for (const m of [particles.optMat]) m.uniforms.uPx.value = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  if (view.mode === 2) renderer.render(scene, camera);
  else mic.render({ ref, focus: view.focus, cocPerUnit: ob.coc, dof: ob.dof, pxPerUnit, time, backOff: new THREE.Vector3(view.yaw * 0.15, view.pitch * 0.1, 1) });

  // Labels.
  labelBox.style.display = view.labels ? '' : 'none';
  if (view.labels) {
    const v = new THREE.Vector3();
    for (const { name, d } of labelEls) {
      creature.anchorWorld(name, v).project(camera);
      d.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
      d.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
    }
  }

  // Readout.
  const st = { active: walker.slipping ? 'SLIPPING' : life.feeding ? 'feeding' : life.tun > 0.02 ? 'curling up…' : walker.speed > 0.03 ? 'walking' : 'holding on',
    tun: 'tun (dry: waits for rain; wet: Y to wake)', skip: 'tun · time passing…', revive: 'rehydrating…', dead: 'did not wake' }[life.state];
  const planted = walker.feet.filter((f) => f.state === 'stance' && f.grip > 0.5).length;
  const bar = (x) => '█'.repeat(Math.round(x * 10)).padEnd(10, '·');
  hud.stats([
    `${life.clock}   (${life.compression ? life.compression + '×' : 'paused'})`,
    `${ob.name}  ${MODES[view.mode].split(' ')[0]}  focus ${view.focus >= 0 ? '+' : ''}${Math.round(-view.focus * 100)} µm`,
    `${walker.leaf.name}${walker.side < 0 ? ' · underside' : ''}`,
    `film     ${film > 0 ? Math.round(Math.min(film, 2) * 22) + ' µm' : 'DRY'}`,
    `water    ${bar(1 - life.desic)}`,
    `reserves ${bar(life.energy)}`,
    `claws    ${planted}/8 hooked · grip ${walker.gripSum.toFixed(1)} / need ${Math.max(0, walker.required).toFixed(1)}`,
    `state    ${st}${life.state === 'skip' || life.state === 'revive' ? ` · revival ~${Math.round(life.chance * 100)}%` : ''}`,
    walker.candidate ? `reach    ${walker.candidate.M.name}${walker.candidate.bridged ? ' (film bridge)' : ''}` : '',
  ].filter(Boolean).join('\n'));

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
