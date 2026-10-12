// "Where do I go?": the current goal, everywhere you walk around.
//   - one line in the HUD's objective ribbon (title: the goal, below: where);
//   - a gold beam and ring at the goal, with a floating chevron;
//   - at the screen edge, a gold arrow pointing at the goal when it is off
//     screen (with the distance); over the goal when it is on screen;
//   - glowing footprints on the ground along the walkable way there, from a
//     distance field worked out once per goal over the voxel world.
// The prologue sets the school bus as the goal; in camp it is the next
// chapter's quest marker (main.js). Reduced motion: nothing bobs or pulses.
import * as THREE from 'three/webgpu';
import { h } from './ui.js';
import { prefersReducedMotion } from '../settings.js';

const STEPS = 30;          // footprints shown ahead of the leader
const GAP = 1.5;           // metres between footprints
const tmp = new THREE.Vector3();
const ARROW = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 6 L34 20 L8 34 L14 20 Z" fill="#ffd84a" stroke="#5a3a0a" stroke-width="2.5" stroke-linejoin="round"/></svg>';

// The lowest place a hero could stand in column (x, z): air for two blocks
// over something solid. null if there is none below maxY.
export function standY(world, x, z, maxY = world.sy - 2) {
  for (let y = 1; y < maxY; y++) if (world.solidAt(x + 0.5, y - 0.5, z + 0.5) && !world.solidAt(x + 0.5, y + 0.5, z + 0.5) && !world.solidAt(x + 0.5, y + 1.5, z + 0.5)) return y;
  return null;
}
// Breadth-first distance (in cells) to the goal over walkable cells; a step
// may rise or fall one block. Returns { d: Float32Array, ys: Int16Array }.
export function distanceField(world, gx, gz, radius = 1.5) {
  const W = world.sx, D = world.sz, n = W * D;
  const ys = new Int16Array(n).fill(-1);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const y = standY(world, x, z); if (y != null) ys[z * W + x] = y; }
  const d = new Float32Array(n).fill(Infinity);
  const q = new Int32Array(n * 2); let qh = 0, qt = 0;
  const r = Math.ceil(radius);
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const x = Math.floor(gx) + dx, z = Math.floor(gz) + dz;
    if (x < 0 || z < 0 || x >= W || z >= D || ys[z * W + x] < 0 || Math.hypot(dx, dz) > radius + 0.5) continue;
    d[z * W + x] = 0; q[qt++] = z * W + x;
  }
  const N = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  // (a few passes of a queue relaxation: close enough to Dijkstra on a grid this size)
  while (qh < qt) {
    const i = q[qh++ % q.length]; const x = i % W, z = (i / W) | 0, y = ys[i];
    for (const [dx, dz, c] of N) {
      const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
      const j = nz * W + nx, yj = ys[j]; if (yj < 0 || Math.abs(yj - y) > 1) continue;
      if (dx && dz && (ys[z * W + nx] < 0 || ys[nz * W + x] < 0 || Math.abs(ys[z * W + nx] - y) > 1 || Math.abs(ys[nz * W + x] - y) > 1)) continue;   // no corner cutting
      const nd = d[i] + c;
      if (nd < d[j] - 1e-3) { d[j] = nd; q[qt++ % q.length] = j; if (qt - qh >= q.length) return { d, ys, W, D }; }
    }
  }
  return { d, ys, W, D };
}
// Walk downhill on the field from (x, z): the cells of the way to the goal.
export function pathFrom(field, x, z, maxLen = 80) {
  const { d, ys, W, D } = field;
  let cx = Math.floor(x), cz = Math.floor(z);
  const at = (a, b) => (a < 0 || b < 0 || a >= W || b >= D ? Infinity : d[b * W + a]);
  if (!isFinite(at(cx, cz))) {   // standing on a prop or a step: the nearest cell with a way
    let best = null, bd = Infinity;
    for (let r = 1; r <= 4 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const v = at(cx + dx, cz + dz); if (v < bd) { bd = v; best = [cx + dx, cz + dz]; } }
    if (!best) return [];
    [cx, cz] = best;
  }
  const out = [];
  for (let i = 0; i < maxLen; i++) {
    out.push([cx + 0.5, ys[cz * W + cx], cz + 0.5]);
    const here = at(cx, cz); if (here <= 0) break;
    let nx = cx, nz = cz, nd = here;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const v = at(cx + dx, cz + dz) + (dx && dz ? 0.01 : 0); if (v < nd) { nd = v; nx = cx + dx; nz = cz + dz; } }
    if (nx === cx && nz === cz) break;
    cx = nx; cz = nz;
  }
  return out;
}

export class Tracker {
  constructor(game) {
    this.game = game; this.goal = null; this.field = null; this.t = 0; this.pathT = 0; this.path = [];
    const root = document.getElementById('hud');
    this.arrow = h('div', { class: 'trk-arrow hidden', 'aria-hidden': 'true' }, h('span', { class: 'ic', html: ARROW }), h('span', { class: 'dist' }));
    this.pin = h('div', { class: 'trk-pin hidden', 'aria-hidden': 'true' }, h('span', { class: 'chev' }, '▼'), h('span', { class: 'dist' }));
    root.append(this.arrow, this.pin);
    // 3D: beam, ring, chevron, footprints
    const gold = new THREE.Color(0xffd84a);
    const add = (o) => { o.frustumCulled = false; return o; };
    this.group = new THREE.Group(); this.group.visible = false;
    this.beam = add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 16, 16, 1, true).translate(0, 8, 0), new THREE.MeshBasicNodeMaterial({ color: gold.clone().multiplyScalar(1.4), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })));
    this.ring = add(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 6, 40).rotateX(Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: gold.clone().multiplyScalar(2.2), transparent: true, opacity: 0.9, depthWrite: false })));
    this.ring.position.y = 0.08;
    this.chev = add(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 4).rotateX(Math.PI), new THREE.MeshBasicNodeMaterial({ color: gold.clone().multiplyScalar(2.4) })));
    this.group.add(this.beam, this.ring, this.chev);
    const fg = new THREE.BoxGeometry(0.17, 0.02, 0.32);
    this.feet = add(new THREE.InstancedMesh(fg, new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }), STEPS));
    this.feet.count = 0;
    for (let i = 0; i < STEPS; i++) this.feet.setColorAt(i, gold);
    this.col = new THREE.Color();
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.s = new THREE.Vector3(1, 1, 1);
  }
  // goal: { title, desc, pos (Vector3, standing height), radius }; null clears it
  setGoal(goal) {
    const g = this.game;
    this.goal = goal;
    this.field = null; this.path = []; this.pathT = 0;
    if (!goal) { this.hide(); return; }
    g.hud?.setObjective(goal.title, goal.desc ?? '');
    if (!this.group.parent) g.scene.add(this.group);
    if (!this.feet.parent) g.scene.add(this.feet);
    this.group.position.copy(goal.pos);
    // the way there, worked out once (a few milliseconds on camp's 116 x 184 columns)
    try { this.field = distanceField(g.world, goal.pos.x, goal.pos.z, goal.radius ?? 1.5); } catch (e) { console.warn('tracker', e); this.field = null; }
  }
  hide() { this.group.visible = false; this.feet.visible = false; this.arrow.classList.add('hidden'); this.pin.classList.add('hidden'); }
  // after a level change the old scene objects went with the world
  reattach() { const g = this.game; if (this.goal) { g.scene.add(this.group); g.scene.add(this.feet); } }
  leader() {
    const g = this.game;
    return g.players.find((p) => !p.ai && !p.remote && !p.dead) ?? g.players.find((p) => !p.remote && !p.dead) ?? null;
  }
  update(dt) {
    const g = this.game, goal = this.goal;
    const show = !!goal && g.state === 'playing' && !g.cutscene && !g.minigame && (g.mode === 'hub' || g.mode === 'prologue');
    if (!show) { this.hide(); return; }
    const lead = this.leader(); if (!lead) { this.hide(); return; }
    const still = prefersReducedMotion();
    this.t += dt;
    this.group.visible = true;
    this.chev.position.y = 4.2 + (still ? 0 : Math.sin(this.t * 2.6) * 0.25);
    this.chev.rotation.y = still ? 0 : this.t * 1.4;
    this.ring.scale.setScalar(still ? 1 : 1 + Math.sin(this.t * 3) * 0.06);
    const dist = Math.hypot(goal.pos.x - lead.pos.x, goal.pos.z - lead.pos.z);
    // footprints along the way
    this.pathT -= dt;
    if (this.pathT <= 0 && this.field) { this.pathT = 0.35; this.path = pathFrom(this.field, lead.pos.x, lead.pos.z, 120); }
    this.drawFeet(lead, dist, still);
    // screen: a pin over the goal, or an arrow at the edge
    const cam = g.rig.camera;
    tmp.copy(goal.pos).setY(goal.pos.y + 3.2).project(cam);
    const behind = tmp.z > 1;
    const sw = window.innerWidth, sh = window.innerHeight;
    let sx = (tmp.x * 0.5 + 0.5) * sw, sy = (-tmp.y * 0.5 + 0.5) * sh;
    if (behind) { sx = sw - sx; sy = sh - sy; }
    const m = 56;
    const label = dist < 3 ? '' : `${Math.round(dist)} m`;
    if (!behind && sx > m && sx < sw - m && sy > m && sy < sh - m) {
      this.arrow.classList.add('hidden'); this.pin.classList.remove('hidden');
      this.pin.style.transform = `translate(${sx.toFixed(0)}px, ${sy.toFixed(0)}px)`;
      const d = this.pin.lastChild; if (d.textContent !== label) d.textContent = label;
    } else {
      this.pin.classList.add('hidden'); this.arrow.classList.remove('hidden');
      const cx = sw / 2, cy = sh / 2; let dx = sx - cx, dy = sy - cy;
      if (Math.hypot(dx, dy) < 1) dy = -1;
      const k = Math.min((cx - m) / Math.abs(dx || 1e-6), (cy - m) / Math.abs(dy || 1e-6));
      const ax = cx + dx * k, ay = cy + dy * k, ang = Math.atan2(dy, dx);
      this.arrow.style.transform = `translate(${ax.toFixed(0)}px, ${ay.toFixed(0)}px)`;
      this.arrow.firstChild.style.transform = `rotate(${ang.toFixed(3)}rad)`;
      const d = this.arrow.lastChild; if (d.textContent !== label) d.textContent = label;
    }
  }
  drawFeet(lead, dist, still) {
    const path = this.path;
    if (!path.length || dist < 5) { this.feet.visible = false; return; }
    this.feet.visible = true;
    // resample the cell path every GAP metres, starting a little ahead of the leader
    let n = 0, carry = 1.4, side = 1;
    for (let i = 1; i < path.length && n < STEPS; i++) {
      const [ax, ay, az] = path[i - 1], [bx, by, bz] = path[i];
      const L = Math.hypot(bx - ax, bz - az); if (L < 1e-4) continue;
      let t = carry;
      while (t <= L && n < STEPS) {
        const f = t / L, x = ax + (bx - ax) * f, z = az + (bz - az) * f, y = ay + (by - ay) * f;
        const yaw = Math.atan2(bx - ax, bz - az);
        const ox = Math.cos(yaw) * 0.16 * side, oz = -Math.sin(yaw) * 0.16 * side;
        this.e.set(0, yaw, 0); this.q.setFromEuler(this.e);
        this.m4.compose(tmp.set(x + ox, y + 0.04, z + oz), this.q, this.s);
        this.feet.setMatrixAt(n, this.m4);
        const a = still ? 0.55 : 0.25 + 0.6 * Math.max(0, Math.sin(this.t * 4 - n * 0.55));
        const fade = Math.min(1, (STEPS - n) / 6);
        this.feet.setColorAt(n, this.col.setRGB(1.0 * a * fade, 0.85 * a * fade, 0.3 * a * fade));
        n++; side = -side; t += GAP;
      }
      carry = t - L;
    }
    this.feet.count = n;
    this.feet.instanceMatrix.needsUpdate = true;
    if (this.feet.instanceColor) this.feet.instanceColor.needsUpdate = true;
  }
}
