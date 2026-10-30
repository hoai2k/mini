// Mite prototype: a box mite walking through a moss cushion, imaged as if in
// a scanning electron microscope. Units are µm throughout.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { createSem, shared, MODES, CLS } from './sem.js';
import { semTextures } from './textures.js';
import { buildWorld, HALF } from './world.js';
import { createMite } from './mite.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(DPR);
renderer.autoClear = false;

const scene = new THREE.Scene();
const VFOV = 12; // a narrow scan field: SEM images have very little perspective
const camera = new THREE.PerspectiveCamera(VFOV, 16 / 9, 20, 30000);

let tex;
const swapTex = (key, t) => {
  const old = tex[key];
  scene.traverse((o) => {
    const u = o.material && o.material.uniforms;
    if (u && u.uTex && (u.uTex.value === old || (key === 'cuticle' && u.uCls && u.uTex.value === old))) {
      u.uTex.value = t;
    }
  });
  if (key === 'backdrop') sem.setBackdrop(t);
  tex[key] = t;
};
tex = semTextures((k, t) => swapTex(k, t));

const sem = createSem(renderer, tex.backdrop);
const world = buildWorld(tex);
scene.add(world.group);

const mite = createMite(scene, world.colliders, { cls: CLS.CUTICLE, tex });
mite.place(0, 0, 0.3);
const npc = createMite(scene, world.colliders, { cls: CLS.NPC, tex });
npc.place(650, -420, 2.2);

const pad = createPad();
const hud = mountHud({
  title: 'Mite · SEM',
  sub: 'A box mite (Phthiracaridae), about 0.6 mm long, in a moss cushion, imaged like a scanning electron micrograph.',
  controls: [
    ['LS', 'Walk (relative to the view)'],
    ['RS', 'Orbit the specimen'],
    ['LT', 'Lower magnification'],
    ['RT', 'Higher magnification'],
    ['A', 'Hold: close up (ptychoidy)'],
    ['LB', 'Walk slowly'],
    ['RB', 'Hurry'],
    ['Y', 'Imaging mode: SE, BSE, false colour'],
    ['X', 'Observer: data bar and scan lines'],
    ['View', 'Hide this panel'],
  ],
  note: 'A live mite walking in an SEM is a deliberate fiction: real specimens are dried and gold-coated in a vacuum. The mag and scale bar are true to the field of view.',
});

// SEM data bar (observer mode)
const bar = document.createElement('div');
bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:34px;background:#000;color:#e8e8e8;display:none;align-items:center;gap:22px;padding:0 14px;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;z-index:5;white-space:nowrap;overflow:hidden';
document.body.appendChild(bar);
let observer = false;

const rig = { yaw: -0.6, pitch: 0.62, hfw: 1400, target: mite.center.clone() };
const camFwd = new THREE.Vector3(), camRight = new THREE.Vector3();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  sem.resize(Math.floor(w * DPR), Math.floor(h * DPR));
}
addEventListener('resize', resize);
resize();

function placeCamera(dt) {
  const tanH = Math.tan(THREE.MathUtils.degToRad(VFOV) / 2) * camera.aspect;
  const d = rig.hfw / (2 * tanH);
  const k = dt ? 1 - Math.exp(-dt / 0.25) : 1;
  rig.target.lerp(mite.center, k);
  const cp = Math.cos(rig.pitch);
  camera.position.set(rig.target.x + Math.cos(rig.yaw) * cp * d, rig.target.y + Math.sin(rig.pitch) * d, rig.target.z + Math.sin(rig.yaw) * cp * d);
  camera.lookAt(rig.target);
  camera.near = Math.max(20, d * 0.08);
  camera.far = d + 9000;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  shared.uCutP.value.copy(rig.target).applyMatrix4(camera.matrixWorldInverse);
  shared.uCutR.value = 380 + rig.hfw * 0.06;
  return d;
}

function niceScale(hfw) {
  const want = hfw * 0.2;
  const p = Math.pow(10, Math.floor(Math.log10(want)));
  for (const m of [5, 2, 1]) if (m * p <= want) return m * p;
  return p;
}

// NPC: wanders, and shuts when the player comes close
const ai = { ang: 2.2, t: 0, scared: 0, pause: 0 };
function npcInput(dt) {
  ai.t += dt;
  ai.ang += (Math.sin(ai.t * 0.37) + Math.sin(ai.t * 0.83 + 1)) * 0.5 * dt;
  const c = npc.center;
  if (Math.hypot(c.x, c.z) > HALF * 0.75) ai.ang = Math.atan2(-c.z, -c.x);
  const dist = c.distanceTo(mite.center);
  if (dist < 420 && ai.scared <= 0 && npc.mode === 'walk') ai.scared = 3 + Math.random() * 2;
  ai.scared -= dt;
  ai.pause = (ai.pause + dt) % 14;
  const moving = ai.pause < 10;
  return { dir: new THREE.Vector3(Math.cos(ai.ang), 0, Math.sin(ai.ang)), mag: moving ? 0.6 : 0, maxSpeed: 180, hold: ai.scared > 0 };
}

let speedMul = 1;
function tick(dt, input) {
  const ev = mite.update(dt, input);
  npc.update(dt, npcInput(dt));
  return ev;
}

function readInput(dt) {
  pad.poll();
  hud.update(pad);
  const rs = pad.rs();
  rig.yaw += rs.x * 1.8 * dt;
  rig.pitch = THREE.MathUtils.clamp(rig.pitch - rs.y * 1.2 * dt, 0.12, 1.45);
  const zoom = pad.rt() - pad.lt();
  rig.hfw = THREE.MathUtils.clamp(rig.hfw * Math.exp(-zoom * 1.3 * dt), 260, 4200);
  if (pad.pressed(pad.BTN.Y)) { sem.setMode((sem.mode + 1) % MODES.length); hud.toast(MODES[sem.mode]); }
  if (pad.pressed(pad.BTN.X)) { observer = !observer; bar.style.display = observer ? 'flex' : 'none'; sem.setRaster(observer); hud.toast(observer ? 'Observer mode' : 'Observer mode off'); }
  speedMul = pad.down(pad.BTN.LB) ? 0.45 : pad.down(pad.BTN.RB) ? 1.7 : 1;
  const ls = pad.ls();
  camFwd.set(-Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  camRight.set(-camFwd.z, 0, camFwd.x);
  const dir = camFwd.clone().multiplyScalar(-ls.y).addScaledVector(camRight, ls.x);
  return { dir: dir.lengthSq() > 0 ? dir.normalize() : dir, mag: ls.m, maxSpeed: 210 * speedMul, hold: pad.down(pad.BTN.A) || pad.down(pad.BTN.B) };
}

function react(ev) {
  for (const e of ev) {
    if (e === 'step') pad.rumble(25, 0.08, 0);
    else if (e === 'closed') { pad.rumble(140, 0.35, 0.7); }
    else if (e === 'opened') pad.rumble(70, 0.2, 0.1);
    else if (e === 'impact') pad.rumble(110, 0.4, 0.5);
  }
}

let frames = 0, statT = 0;
function updateText(d) {
  const mag = 127000 / rig.hfw; // relative to a 127 mm (Polaroid 4x5) reference image width
  const st = mite.mode === 'walk' ? (mite.speed > 5 ? `walking ${mite.speed.toFixed(0)} µm/s` : 'standing') : mite.mode === 'closed' ? 'closed (ptychoid)' : mite.mode;
  const info = renderer.info.render;
  hud.stats(`${MODES[sem.mode]}\nHFW ${rig.hfw.toFixed(0)} µm   mag ${mag.toFixed(0)}x\n${st}\n${info.calls} draws  ${(info.triangles / 1000).toFixed(0)}k tris`);
  if (observer) {
    const sb = niceScale(rig.hfw);
    const px = (sb / rig.hfw) * innerWidth;
    bar.innerHTML = `<span>HV 5.00 kV</span><span>WD ${(d / 1000).toFixed(1)} mm</span><span>mag ${mag.toFixed(0)} x</span><span>HFW ${(rig.hfw / 1000).toFixed(2)} mm</span><span>det ${sem.mode === 1 ? 'BSED' : 'ETD'}</span><span>${sem.mode === 1 ? 'LowVac 60 Pa' : 'HiVac'}</span>`
      + `<span style="margin-left:auto;display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:${px.toFixed(1)}px;height:6px;background:#fff"></span>${sb >= 1000 ? sb / 1000 + ' mm' : sb + ' µm'}</span><span>Micro prototypes</span>`;
  }
}

const clock = new THREE.Clock();
const api = {
  scene, camera, renderer, sem, world, mite, npc, rig, paused: false,
  tick(dt, input = { dir: new THREE.Vector3(), mag: 0, maxSpeed: 210, hold: false }) { return tick(dt, input); },
  render(dt = 1 / 60) { const d = placeCamera(0); sem.render(scene, camera, dt, rig.yaw, rig.pitch); updateText(d); },
  isolate(on) { world.group.visible = !on; npc.setVisible(!on); },
  setMode(m) { sem.setMode(m); sem.material.uniforms.uScanY.value = 1; },
};
window.__micro = api;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (api.paused) return;
  const input = readInput(dt);
  react(tick(dt, input));
  const d = placeCamera(dt);
  sem.render(scene, camera, dt, rig.yaw, rig.pitch);
  frames++; statT += dt;
  if (statT > 0.25) { updateText(d); statT = 0; }
}
frame();
