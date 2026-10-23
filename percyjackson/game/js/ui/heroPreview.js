// The hero in the inventory: a small 3D view of the hero in their gear, as
// Minecraft Dungeons shows its hero beside the slots, with the weapon or
// armour chosen in the stash tried on (gear/equip.js dresses the model live).
//
// One small renderer of its own, made the first time the inventory opens and
// kept (the screen is rebuilt on every change: the same canvas is put back
// into it), on WebGL2 so it never asks for a second WebGPU device. Its models
// are its own, one per hero, so the game's models are never touched. It draws
// only while its canvas is on the page.
import * as THREE from 'three/webgpu';
import { buildHeroModel } from '../entities/models.js';
import { dressHero } from '../entities/gear/equip.js';

const W = 138, H = 184, ZERO = new THREE.Vector3();
let P = null;
function make() {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-preview-cv'; canvas.width = W; canvas.height = H;
  const wrap = document.createElement('div'); wrap.className = 'hero-preview'; wrap.setAttribute('role', 'img');
  const tag = document.createElement('span'); tag.className = 'try'; tag.hidden = true;
  wrap.append(canvas, tag);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a4a38, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.4); sun.position.set(1.5, 3, 2.5); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xffd9a0, 1.2); rim.position.set(-2, 2, -2); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 50);
  P = { canvas, wrap, tag, scene, camera, renderer: null, ready: null, rigs: new Map(), cur: null, want: null, t: 0, last: 0, off: 0 };
  P.ready = (async () => {
    try {
      const r = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true, forceWebGL: true });
      r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(W, H, false);
      r.toneMapping = THREE.AgXToneMapping; r.toneMappingExposure = 1.15; r.setClearColor(0x000000, 0);
      await r.init();
      P.renderer = r;
    } catch (e) { console.warn('hero preview: no renderer', e); wrap.classList.add('off'); }
  })();
  return P;
}
function frame(now) {
  if (!P.canvas.isConnected) { if ((P.off += 1) > 30) { P.renderer?.setAnimationLoop(null); P.looping = false; } return; }
  P.off = 0;
  const dt = Math.min(0.05, P.last ? (now - P.last) / 1000 : 0.016); P.last = now; P.t += dt;
  const rig = P.cur; if (!rig) return;
  rig.root.rotation.y = 0.35 + Math.sin(P.t * 0.6) * 0.55;   // (a slow turn either way: the front, then each side and its cape)
  rig.animate({ dt, speed: 0, vel: ZERO, action: null });
  P.renderer.render(P.scene, P.camera);
}
// The preview's element (the same one every time), showing hero `id` in gear
// { weapon, armor, tier } (gear/equip.js), tryOn: the label of an item tried on.
export function heroPreview(id, gear, { tryOn = null, label = '' } = {}) {
  if (!P) make();
  let rig = P.rigs.get(id);
  if (!rig) {
    try { rig = buildHeroModel(id); } catch (e) { console.warn('hero preview: no model for', id, e); return P.wrap; }
    P.rigs.set(id, rig);
  }
  dressHero(rig, gear ?? {});
  if (P.cur !== rig) {
    if (P.cur) P.scene.remove(P.cur.root);
    P.scene.add(rig.root); P.cur = rig;
    // the camera on the whole hero, the cape and the crest too
    rig.root.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(rig.root), c = b.getCenter(new THREE.Vector3()), h = b.max.y - b.min.y;
    P.camera.position.set(c.x, c.y + h * 0.06, c.z + h * 2.3); P.camera.lookAt(c.x, c.y, c.z);
  }
  P.tag.hidden = !tryOn; P.tag.textContent = tryOn ?? '';
  P.wrap.setAttribute('aria-label', label);
  P.ready.then(() => { if (P.renderer && !P.looping) { P.looping = true; P.last = 0; P.renderer.setAnimationLoop(frame); } });
  return P.wrap;
}
