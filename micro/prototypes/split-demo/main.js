// Split-screen test bed: up to four local players on a slide-like plane with
// scattered grains, the LEGO-style dynamic split (shared/splitscreen.js), the
// join flow (shared/players.js) and the landmark edge indicators
// (shared/landmark.js): a brass chevron towards the next stage (the brass
// ring), a hollow ring towards the way back (the dark well).
//
// P1 plays on the keyboard and/or the first controller used; anyone else
// joins by pressing a button on another controller. Y switches between the
// perspective orbit camera and a top-down orthographic view (both are what
// the worlds use). D-pad up/down changes the render scale of split views.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPlayers } from '../shared/players.js';
import { hudControls } from '../shared/controls.js';
import { mountHud } from '../shared/hud.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks } from '../shared/landmark.js';
import { createFeatures } from '../shared/features.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

// ------------------------------------------------------------------ world
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d2622');
scene.fog = new THREE.Fog('#1d2622', 70, 160);
scene.add(new THREE.HemisphereLight('#e9efe4', '#26302a', 1.6));
const sun = new THREE.DirectionalLight('#fff4e0', 1.8);
sun.position.set(30, 60, 20);
scene.add(sun);

function groundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#5d6e5c'; g.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Cells like a plant epidermis: blobs with dark walls.
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 26 + rnd() * 30, ry = r * (0.7 + rnd() * 0.3), rot = rnd() * 3;
    const fill = `hsl(${95 + rnd() * 30}, ${18 + rnd() * 14}%, ${40 + rnd() * 14}%)`;
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) {
      g.beginPath();
      g.ellipse(x + dx, y + dy, r, ry, rot, 0, Math.PI * 2);
      g.fillStyle = fill;
      g.fill();
      g.lineWidth = 3; g.strokeStyle = 'rgba(30,40,28,.55)'; g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const HALF = 110;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Scattered grains and stalks.
{
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const sphere = new THREE.SphereGeometry(1, 16, 12), cyl = new THREE.CylinderGeometry(0.35, 0.5, 1, 10);
  const mats = ['#b69a6a', '#8ea07a', '#c7b38f', '#7d8c95', '#a37a62'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
  for (let i = 0; i < 260; i++) {
    const tall = rnd() < 0.3;
    const m = new THREE.Mesh(tall ? cyl : sphere, mats[(rnd() * mats.length) | 0]);
    const x = (rnd() * 2 - 1) * HALF * 0.95, z = (rnd() * 2 - 1) * HALF * 0.95;
    if (Math.hypot(x, z) < 6) continue;
    if (tall) { const h = 3 + rnd() * 7; m.scale.set(1, h, 1); m.position.set(x, h / 2, z); }
    else { const r = 0.5 + rnd() * 1.6; m.scale.set(r, r * 0.8, r); m.position.set(x, r * 0.5, z); }
    scene.add(m);
  }
}

// The two landmarks: the next stage (a brass ring standing up) and the way
// back (a dark well with a pale rim).
const FORWARD = new THREE.Vector3(72, 2.6, -46);
const BACKDOOR = new THREE.Vector3(-64, 0.1, 52);
{
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.35, 12, 48), new THREE.MeshStandardMaterial({ color: '#c9a35a', metalness: 0.7, roughness: 0.35, emissive: '#3a2a08' }));
  ring.position.copy(FORWARD);
  scene.add(ring);
  const well = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshBasicMaterial({ color: '#0d0f0e' }));
  well.rotation.x = -Math.PI / 2; well.position.copy(BACKDOOR);
  scene.add(well);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.18, 8, 48), new THREE.MeshStandardMaterial({ color: '#d9ddd6', roughness: 0.6 }));
  rim.rotation.x = -Math.PI / 2; rim.position.copy(BACKDOOR);
  scene.add(rim);
}

// ---------------------------------------------------------------- players
const bodies = []; // slot -> { mesh, vel, dash }
function makeBody(p, at) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.5 });
  const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.3, 6, 16), mat);
  cap.position.y = 1.45;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshStandardMaterial({ color: '#f2ead6' }));
  nose.position.set(0, 1.9, -0.75);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.45, 40), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.7 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
  g.add(cap, nose, ring);
  g.position.copy(at);
  scene.add(g);
  bodies[p.slot] = { mesh: g, vel: new THREE.Vector3(), dash: 0, heading: 0 };
}

const joins = [];
const leaves = [];
const players = createPlayers({
  max: 4,
  onJoin: (p) => {
    joins.push({ slot: p.slot, padIndex: p.padIndex, color: p.color });
    const c = centroid();
    makeBody(p, new THREE.Vector3(c.x + 3 * Math.cos(p.slot * 2.1), 0, c.z + 3 * Math.sin(p.slot * 2.1)));
    hud.toast(`Player ${p.slot + 1} joined`);
    hud.players(players.list);
  },
  onLeave: (p) => {
    leaves.push({ slot: p.slot });
    const b = bodies[p.slot];
    if (b) { scene.remove(b.mesh); bodies[p.slot] = null; }
    hud.toast(`Player ${p.slot + 1} left`);
    hud.players(players.list);
  },
  onChange: (list) => hud && hud.players(list),
});
makeBody(players.get(0), new THREE.Vector3(0, 0, 0));

const hud = mountHud({
  title: 'Split screen',
  sub: 'Up to four players. Walk apart and the view splits like the LEGO games; come back together and it merges. The brass chevron points to the next stage, the ring to the way back.',
  controls: hudControls({
    move: 'Walk (relative to the view)',
    camera: 'Turn the shared camera (any player)',
    dash: 'Dash',
    special: 'Perspective orbit / top-down view',
    zoom: 'Render scale of each split view (quality)',
  }),
  note: 'To join, press any button on another controller, here or in a menu. Player 1 also plays on the keyboard.',
});

// --------------------------------------------------------------- features
const features = createFeatures({ key: 'split-demo', pad: players.pad(0) });
let camMode = 'orbit';
features.add({ id: 'view', group: 'Rendering', label: 'Camera', choices: ['Orbit', 'Top-down'], value: 'Orbit',
  about: 'Orbit: a perspective camera looking down at about 50°, like the 3D worlds. Top-down: an orthographic camera straight down, like the microscope views. The split works the same in both.',
  onChange: (v) => { camMode = v === 'Top-down' ? 'top' : 'orbit'; } });
const split = createSplitScreen(renderer, { renderScale: 1 });
features.add({ id: 'scale', group: 'Rendering', label: 'Split view render scale', choices: ['100%', '85%', '70%', '50%'], value: '100%',
  about: 'Each split view renders into its own target at this fraction of the screen size, then the regions are drawn through polygon masks. N views cost N renders; one shared view renders straight to the screen with no extra cost.',
  onChange: (v) => { split.renderScale = parseFloat(v) / 100; } });
const marks = createLandmarks();

// ----------------------------------------------------------------- camera
const persp = new THREE.PerspectiveCamera(45, 16 / 9, 0.5, 400);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.5, 400);
const rig = { yaw: 0, pitch: 0.92, focus: new THREE.Vector3(), dist: 28 };

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  persp.aspect = w / h;
  persp.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function centroid() {
  const ps = players.list.map((p) => bodies[p.slot]).filter(Boolean).map((b) => b.mesh.position);
  return split.centroid(ps.length ? ps : [new THREE.Vector3()]);
}

function placeCamera(dt, snap = false) {
  const ps = players.list.map((p) => bodies[p.slot]).filter(Boolean).map((b) => b.mesh.position);
  const c = split.centroid(ps);
  const k = snap ? 1 : 1 - Math.exp(-dt * 6);
  rig.focus.lerp(new THREE.Vector3(c.x, 0, c.z), k);
  // Zoom out a little as the group spreads, up to a cap (then the view splits).
  const want = 28 + Math.min(10, split.spread(ps) * 0.35);
  rig.dist += (want - rig.dist) * k;
  let cam;
  if (camMode === 'top') {
    cam = ortho;
    const hh = rig.dist * 0.5, hw = hh * (innerWidth / innerHeight);
    Object.assign(ortho, { left: -hw, right: hw, top: hh, bottom: -hh });
    ortho.position.set(rig.focus.x, 80, rig.focus.z);
    ortho.up.set(Math.sin(rig.yaw), 0, -Math.cos(rig.yaw));
    ortho.lookAt(rig.focus);
    ortho.updateProjectionMatrix();
  } else {
    cam = persp;
    const cp = Math.cos(rig.pitch);
    persp.position.set(rig.focus.x + Math.sin(rig.yaw) * cp * rig.dist, Math.sin(rig.pitch) * rig.dist, rig.focus.z + Math.cos(rig.yaw) * cp * rig.dist);
    persp.lookAt(rig.focus);
  }
  cam.updateMatrixWorld();
  return cam;
}

// ------------------------------------------------------------------- loop
let last = performance.now();
const fwd = new THREE.Vector3(), rgt = new THREE.Vector3();
function step(dt) {
  players.poll();
  const p1 = players.pad(0);
  hud.update(p1);
  if (features.update()) return;
  let yaw = 0;
  fwd.set(-Math.sin(rig.yaw), 0, -Math.cos(rig.yaw));
  rgt.set(Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  for (const p of players.active) {
    const b = bodies[p.slot];
    if (!b) continue;
    const ctl = players.controls(p.slot);
    const m = ctl.move();
    yaw += ctl.look().yaw;
    if (ctl.dash.pressed() && b.dash <= 0) b.dash = 0.25;
    b.dash -= dt;
    const speed = b.dash > 0 ? 26 : 9;
    const want = new THREE.Vector3().addScaledVector(rgt, m.x).addScaledVector(fwd, -m.y).multiplyScalar(speed);
    b.vel.lerp(want, 1 - Math.exp(-dt * 10));
    b.mesh.position.addScaledVector(b.vel, dt);
    b.mesh.position.x = THREE.MathUtils.clamp(b.mesh.position.x, -HALF + 2, HALF - 2);
    b.mesh.position.z = THREE.MathUtils.clamp(b.mesh.position.z, -HALF + 2, HALF - 2);
    if (b.vel.lengthSq() > 0.5) b.heading = Math.atan2(-b.vel.x, -b.vel.z);
    b.mesh.rotation.y = b.heading;
    if (p.slot === 0 && ctl.special.pressed()) {
      features.set('view', camMode === 'top' ? 'Orbit' : 'Top-down');
      hud.toast(camMode === 'top' ? 'Top-down (orthographic)' : 'Orbit (perspective)');
    }
    if (p.slot === 0) {
      const zs = ctl.zoomStep();
      if (zs) {
        const opts = ['50%', '70%', '85%', '100%'];
        const i = THREE.MathUtils.clamp(opts.indexOf(Math.round(split.renderScale * 100) + '%') + zs, 0, 3);
        features.set('scale', opts[i]);
        hud.toast(`Split view render scale ${opts[i]}`);
      }
    }
  }
  rig.yaw -= THREE.MathUtils.clamp(yaw, -1, 1) * 1.8 * dt;
}

let lastCam = null;
function render(dt, snap = false) {
  const cam = placeCamera(dt, snap);
  lastCam = cam;
  const list = players.list.filter((p) => bodies[p.slot]).map((p) => ({ slot: p.slot, position: bodies[p.slot].mesh.position }));
  split.update(list, { camera: cam }, dt);
  split.render(cam, (view, target) => {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, cam);
  });
  marks.begin();
  marks.drawSplit(split, FORWARD, { kind: 'forward', label: 'Next', range: 160 });
  marks.drawSplit(split, BACKDOOR, { kind: 'backdoor', label: 'Back', range: 160 });
  const L = split.layout;
  hud.stats(`players ${players.count} · views ${L.views.length}${L.merged ? ' (merged)' : ''} · scale ${Math.round(split.renderScale * 100)}%`);
}

let frames = 0, manual = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!manual) { frames++; step(dt); render(dt); }
  requestAnimationFrame(frame);
}

// A small copy of the frame just drawn (read before the browser presents it).
let grabCv = null;
function grabPixels(w) {
  const h = Math.round(w * canvas.height / canvas.width);
  if (!grabCv) grabCv = document.createElement('canvas');
  grabCv.width = w; grabCv.height = h;
  const g = grabCv.getContext('2d', { willReadFrequently: true });
  g.drawImage(canvas, 0, 0, w, h);
  return { w, h, data: Array.from(g.getImageData(0, 0, w, h).data) };
}
requestAnimationFrame(frame);

// Test hooks (Playwright drives these; harmless otherwise).
window.__splitDemo = {
  players, split, joins, leaves, hud,
  get frames() { return frames; },
  get layout() { return split.layout; },
  positions: () => players.list.map((p) => (bodies[p.slot] ? bodies[p.slot].mesh.position.toArray() : null)),
  /** Place players: [[x, z], ...] by slot; snaps the camera. */
  setPositions(arr) {
    arr.forEach((xz, slot) => { const b = bodies[slot]; if (b && xz) { b.mesh.position.set(xz[0], 0, xz[1]); b.vel.set(0, 0, 0); } });
    render(1 / 60, true);
  },
  setYaw(v) { rig.yaw = v; render(1 / 60, true); },
  setView(v) { features.set('view', v === 'top' ? 'Top-down' : 'Orbit'); render(1 / 60, true); },
  /** Manual stepping: the animation loop stops advancing; tick() runs one fixed frame. */
  set manual(v) { manual = !!v; },
  get manual() { return manual; },
  /**
   * One frame of play at a fixed dt (input from the controllers, mocked or real),
   * then a sample: the layout as numbers, and optionally the picture
   * (pixels: width of a downsampled copy; jpeg: a JPEG data URL of the canvas).
   */
  tick(dt = 1 / 60, { pixels = 0, jpeg = false } = {}) {
    frames++;
    step(dt);
    render(dt);
    const L = split.layout;
    const out = {
      frame: frames, merged: L.merged, amount: L.amount, spread: L.spread, angle: L.angle,
      positions: players.list.map((p) => (bodies[p.slot] ? [bodies[p.slot].mesh.position.x, bodies[p.slot].mesh.position.z] : null)),
      // where each player is in the shared (unsplit) view, CSS px from the top-left
      screen: players.list.map((p) => {
        if (!bodies[p.slot]) return null;
        const v = bodies[p.slot].mesh.position.clone().project(lastCam);
        return [(v.x + 1) * innerWidth / 2, (1 - v.y) * innerHeight / 2];
      }),
      views: L.views.map((v) => ({ slots: v.slots, shift: [v.shift.x, v.shift.y], offset: v.offset.isVector3 ? v.offset.toArray() : [v.offset.x, v.offset.y] })),
      edges: L.edges.map((e) => ({ slots: e.slots, angle: e.angle, alpha: e.alpha, a: e.a, b: e.b })),
      regions: L.regions.map((r) => ({ slot: r.slot, view: r.view, area: r.area, anchor: r.anchor })),
    };
    if (pixels) out.pixels = grabPixels(pixels);
    if (jpeg) out.jpeg = canvas.toDataURL('image/jpeg', 0.8);
    return out;
  },
  get yaw() { return rig.yaw; },
};
