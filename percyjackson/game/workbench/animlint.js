// Animation lint: plays every pose of a model (the hero poses the game uses
// for its group, and each in-game attack, ingame.js) at 30 frames a second and
// flags, with the frame each problem first shows on:
//   floor    the lowest vertex sinks below the floor (y = 0) by more than
//            FLOOR_TOL, or FLOOR_K x the model's height for a big one (a
//            giant's toe dipping as a rigid leg swings). A floating rig is
//            checked at its hover height. Not checked while a monster dies:
//            in game every monster sinks into the ground on purpose.
//   detached a part has moved further than FLY_K x the model's size (its
//            longest side at rest) from where it sits at rest, measured in
//            the model's own space so a lunge or a charge doesn't count; or
//            a transform is NaN or infinite.
//   float    a death fall that ends in the air: once the fall is over (the
//            death action at t >= FALL_T), the body's lowest point, in the
//            rig's own space and at its full size (so a monster's sinking
//            into the ground in game doesn't count), stays more than
//            FLOAT_TOL, or FLOAT_K x the model's height for a big one, above
//            its floor (a floating rig: its hover height). character.js
//            groundLying lays a fallen body on the floor.
//   weapon   a weapon's tip (character.js markTip) points backward at the
//            strike: its forward share along the facing stays under
//            STRIKE_MIN all through the strike (the same measure as
//            perf/weapons.cjs).
// Interpenetration of parts is not checked (no cheap test that tells a
// clipping arm from a hand on a hip).
//
// lintModel({ group, id, build }) -> { poses: [...], problems: [...] }, where a
// problem is { pose, label, check, frame, time, value, part, info }. info:
// a hero style the game never plays on this model (listed, not counted).
import * as THREE from 'three/webgpu';
import { HERO_POSES, GAME_POSES, MONSTER_GROUPS, poseStep, prepStatic, inGameVariants, InGame } from './ingame.js';

export const FLOOR_TOL = 0.05, FLOOR_K = 0.03, FLY_K = 1.5, STRIKE_MIN = 0.3, FLOAT_TOL = 0.12, FLOAT_K = 0.04, FALL_T = 0.9;
const FPS = 30, DT = 1 / FPS;
export const SETTLE = 0.6;          // seconds of idle before a pose, so it starts from rest

// A few points per mesh that stand in for its shape: the extreme vertex
// along each of N directions (the lowest point of a rigid mesh after any
// turn is one of them, to within a percent or two of its size).
const DIRS = (() => { const n = 96, out = []; for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996; out.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); } return out; })();
const hullCache = new WeakMap();
function hullOf(geo) {
  if (hullCache.has(geo)) return hullCache.get(geo);
  const P = geo.attributes?.position; let pts = [];
  if (P) {
    if (P.count <= DIRS.length * 2) for (let i = 0; i < P.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(P, i));
    else {
      const best = DIRS.map(() => -Infinity), idx = DIRS.map(() => 0), v = new THREE.Vector3();
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); for (let k = 0; k < DIRS.length; k++) { const d = v.dot(DIRS[k]); if (d > best[k]) { best[k] = d; idx[k] = i; } } }
      pts = [...new Set(idx)].map((i) => new THREE.Vector3().fromBufferAttribute(P, i));
    }
  }
  hullCache.set(geo, pts);
  return pts;
}
// names for the parts, from the rig's own fields
function partNames(rig) {
  const names = new Map();
  const put = (o, n) => { if (o?.isObject3D && !names.has(o)) names.set(o, n); };
  for (const k of ['handR', 'handL', 'head', 'armR', 'armL', 'legR', 'legL', 'neck', 'torso', 'hips']) put(rig[k], k);
  (rig.legs ?? []).forEach((l, i) => put(l, `leg ${i + 1}`));
  (rig.tail ?? []).forEach((l, i) => put(l, `tail ${i + 1}`));
  for (const [k, v] of Object.entries(rig.extras ?? {})) { if (Array.isArray(v)) v.forEach((x, i) => put(x?.root ?? x?.g ?? x, `${k} ${i + 1}`)); else put(v, k); }
  return (o) => { for (let p = o; p; p = p.parent) if (names.has(p)) return names.get(p); return 'body'; };
}
// the meshes a check looks at: drawn, not an outline shell, not the champion's ground ring
function meshesOf(root) {
  const out = [];
  root.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && !o.isInstancedMesh && o.geometry && !o.userData.shell && !o.userData.noLint) out.push(o); });
  return out;
}
const visibleIn = (o, root) => { for (let p = o; p && p !== root.parent; p = p.parent) if (p.visible === false) return false; return true; };
function tipsOf(rig) {
  if (rig.handR === rig.handL) return [];   // (a quadruped's "hands" are its jaw)
  const out = [];
  rig.root.traverse((o) => {
    if (!o.userData?.weaponTip) return;
    let side = null; for (let p = o; p && !side; p = p.parent) { if (p === rig.handR || p === rig.armR) side = 'R'; else if (p === rig.handL || p === rig.armL) side = 'L'; }
    if (side) out.push({ o, side, label: o.userData.label || 'weapon' });
  });
  return out;
}

const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _f = new THREE.Vector3(), _inv = new THREE.Matrix4(), _m = new THREE.Matrix4();
// One model in one pose: a fresh rig (or harness), SETTLE s of rest, then the
// pose for `secs`, every frame checked.
function runPose(spec, pose, label, opts) {
  const { group } = spec;
  let rig, h = null, root;
  if (pose.startsWith('game:')) { h = new InGame(group, spec.id, pose.slice(5), { visual: false }); rig = h.rig; root = h.group; }
  else { rig = prepStatic(group, spec.id, spec.build()); root = rig.root; }
  if (!rig?.animate) return [];
  const st = { t: 0 };
  for (let t = 0; t < SETTLE; t += DT) poseStep(rig, 'idle', st, DT);
  // rest: each mesh's centre in the rig's own space, and the model's height
  rig.root.updateMatrixWorld(true);
  const meshes = meshesOf(rig.root), name = partNames(rig), tips = tipsOf(rig);
  _inv.copy(rig.root.matrixWorld).invert();
  const rest = new Map();
  const box = new THREE.Box3();
  for (const m of meshes) {
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    rest.set(m, m.geometry.boundingSphere.center.clone().applyMatrix4(_m.multiplyMatrices(_inv, m.matrixWorld)));
    for (const p of hullOf(m.geometry)) box.expandByPoint(_v.copy(p).applyMatrix4(m.matrixWorld));
  }
  const size = box.isEmpty() ? 1 : Math.max(0.5, box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
  const fly = Math.max(1, FLY_K * size);   // (a turn of the whole body about its middle moves a part at most 1.41 x the size)
  const tol = Math.max(FLOOR_TOL, FLOOR_K * (box.isEmpty() ? 1 : box.max.y - box.min.y));
  const floatTol = Math.max(FLOAT_TOL, FLOAT_K * (box.isEmpty() ? 1 : box.max.y - box.min.y)), S0 = rig.baseScale ?? rig.root.scale.y;
  let fallen = null;   // the death fall's end: { low, frame, part } on its last frame
  const out = [], seen = new Set();
  // one entry per check (and weapon): the first frame it shows on, and the worst value and part
  const flag = (check, frame, value, part, extra = {}) => {
    const k = check === 'weapon' ? `${check}:${part}` : check;
    const prev = out.find((p) => p.key === k);
    if (prev) { if (Math.abs(value) > Math.abs(prev.value)) { prev.value = value; prev.worst = frame; prev.part = part; } return; }
    out.push({ key: k, pose, label, check, frame, time: +(frame * DT).toFixed(2), value, part, worst: frame, ...extra });
  };
  const death = pose === 'death' || pose === 'game:die';
  const floorOff = opts.noFloor || (death && (MONSTER_GROUPS.has(group) || pose === 'game:die'));
  const secs = h ? (group === 'bosses' ? 9 : 6) : Math.max(2.6, (HERO_POSES[pose]?.period ?? 1) * (pose === 'attack' ? 4 : 2));
  const strikes = new Map();   // tip -> best forward share in the current strike window
  const n = Math.round(secs * FPS);
  let inStrike = false;
  for (let f = 0; f < n; f++) {
    let action;
    try { action = h ? h.step(DT).action : poseStep(rig, pose, st, DT); } catch (e) { flag('error', f, 0, String(e.message).slice(0, 120)); break; }
    root.updateMatrixWorld(true);
    // NaN / infinite transforms
    let bad = null;
    for (const m of meshes) { const e = m.matrixWorld.elements; for (let i = 0; i < 16; i++) if (!Number.isFinite(e[i])) { bad = m; break; } if (bad) break; }
    if (bad) { flag('detached', f, Infinity, name(bad), { nan: true }); continue; }
    // the floor, and parts far from rest
    _inv.copy(rig.root.matrixWorld).invert();
    let low = Infinity, lowM = null;
    for (const m of meshes) {
      if (!visibleIn(m, rig.root)) continue;
      if (!floorOff && !h?.dying) for (const p of hullOf(m.geometry)) { const y = _v.copy(p).applyMatrix4(m.matrixWorld).y; if (y < low) { low = y; lowM = m; } }
      const c = _v.copy(m.geometry.boundingSphere.center).applyMatrix4(_m.multiplyMatrices(_inv, m.matrixWorld)).multiplyScalar(rig.root.scale.x);
      const d = c.distanceTo(_a.copy(rest.get(m)).multiplyScalar(rig.root.scale.x));
      if (d > fly) flag('detached', f, +d.toFixed(2), name(m));
    }
    if (low < -tol) flag('floor', f, +low.toFixed(3), name(lowM));
    // a fall that is over: how far its lowest point lies above the floor (rig space, full size)
    if ((action?.type === 'death' || action?.type === 'down') && (action.t ?? 0) >= FALL_T && (!h || h.dying)) {   // (h.dying: not the frame the harness stands a monster back up)
      let lo = Infinity, loM = null;
      for (const m of meshes) {
        if (!visibleIn(m, rig.root)) continue;
        _m.multiplyMatrices(_inv, m.matrixWorld);
        for (const p of hullOf(m.geometry)) { const y = _v.copy(p).applyMatrix4(_m).y; if (y < lo) { lo = y; loM = m; } }
      }
      if (loM) fallen = { low: lo * S0, frame: f, part: name(loM) };
    }
    // weapons at the strike: the best forward share over the strike window must reach STRIKE_MIN
    const k = action?.type === 'attack' ? action.t ?? 0 : -1, w = action?.windup ?? 0.25, s = action?.strike ?? 0.5;
    const now = tips.length && k >= w && k <= s + 0.05;
    if (now) {
      rig.root.getWorldDirection(_f);
      for (const t of tips) {
        if (!visibleIn(t.o, rig.root)) continue;
        t.o.getWorldPosition(_a); (t.side === 'R' ? rig.handR : rig.handL).getWorldPosition(_b);
        const d = _a.sub(_b), L = d.length(), share = L > 1e-6 ? d.dot(_f) / L : 0;
        const cur = strikes.get(t); if (!cur) strikes.set(t, { best: share, frame: f, style: action.style }); else if (share > cur.best) cur.best = share;
      }
    }
    if (inStrike && !now) { for (const [t, r] of strikes) if (r.best < STRIKE_MIN) flag('weapon', r.frame, +r.best.toFixed(2), `${t.label} (${t.side === 'R' ? 'right' : 'left'} hand, ${r.style})`); strikes.clear(); }
    inStrike = !!now;
  }
  if (fallen && fallen.low > floatTol) flag('float', fallen.frame, +fallen.low.toFixed(2), fallen.part);
  h?.dispose();
  return out.map(({ key, ...p }) => p);
}

// Every pose of one model: the game's hero poses for its group, each in-game
// attack, and (as info) the hero styles a monster never plays.
function posesOf(spec, opts) {
  const { group, id } = spec;
  const poses = [];
  for (const p of GAME_POSES[group] ?? ['idle']) poses.push({ pose: p, label: HERO_POSES[p].label });
  for (const v of inGameVariants(group, id)) poses.push({ pose: `game:${v.key}`, label: `${v.label} (in game)` });
  if (opts.heroStyles && MONSTER_GROUPS.has(group)) for (const p of Object.keys(HERO_POSES)) if (!GAME_POSES[group].includes(p)) poses.push({ pose: p, label: `${HERO_POSES[p].label} (hero style)`, info: true });
  return poses;
}
function lintPose(spec, p, opts, problems) {
  let r;
  try { r = runPose(spec, p.pose, p.label, opts); } catch (e) { r = [{ pose: p.pose, label: p.label, check: 'error', frame: 0, time: 0, value: 0, part: String(e.message).slice(0, 160) }]; console.warn('animlint:', spec.id, p.pose, e); }
  for (const x of r) problems.push(p.info ? { ...x, info: true } : x);
}
export function lintModel(spec, opts = {}) {
  const poses = posesOf(spec, opts), problems = [];
  for (const p of poses) lintPose(spec, p, opts, problems);
  return { poses, problems, failing: problems.filter((x) => !x.info).length };
}
// The same, a pose at a time: `between(ms)` is awaited after each pose with
// the time it took (the workbench lints in the background this way, so its
// viewer keeps drawing between poses instead of stopping for a whole model).
export async function lintModelAsync(spec, opts = {}, between = () => new Promise((r) => setTimeout(r, 0))) {
  const poses = posesOf(spec, opts), problems = [];
  for (const p of poses) { const t0 = performance.now(); lintPose(spec, p, opts, problems); await between(performance.now() - t0); }
  return { poses, problems, failing: problems.filter((x) => !x.info).length };
}
export const describe = (p) => {
  const at = p.worst != null && p.worst !== p.frame ? ` (worst at frame ${p.worst})` : '';
  if (p.check === 'floor') return `${p.part} ${(-p.value).toFixed(2)} m under the floor${at}`;
  if (p.check === 'detached') return p.nan ? `${p.part}: NaN or infinite transform` : `${p.part} ${p.value} m from its rest place${at}`;
  if (p.check === 'float') return `the fall ends in the air: its lowest point (${p.part}) lies ${p.value} m above the floor`;
  if (p.check === 'weapon') return `${p.part} points backward at the strike (forward share ${p.value})`;
  return `error: ${p.part}`;
};
