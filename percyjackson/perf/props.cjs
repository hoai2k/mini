// Held props and clothing check: every workbench model (heroes, Chiron and
// Mr. D, monsters, bosses, champions, mortal disguises, the open world's
// people) built in headless Chromium and posed as the workbench poses it
// (game/workbench/ingame.js poseStep), with four checks on what it holds and
// wears. Units are skin pixels (character.js PX), measured in the part's own
// frame, so a model's scale doesn't matter.
//
//   grip     A prop held in a fist (anything hung on rig.handR or rig.handL;
//            the people's and mortals' parts slots handR / handL) comes out
//            of the fist, not up along the forearm: no part of it may rise
//            more than RISE px above the fist (the hand frame's +y runs up
//            the forearm, see the hand-axis convention at HOLD_PITCH in
//            game/js/entities/character.js) within REACH px of the forearm's
//            sides. A sword, club, pole or book built along the arm "sticks
//            to the arm" this way; one gripped at the convention's angle
//            leaves the forearm's side within a pixel or two of the fist. A
//            long prop (LONG px or more, twice as long as it is wide) must
//            also point out of the fist: its main axis, toward its far end,
//            at least AXIS degrees off the forearm's line toward the elbow (a
//            pole, staff or sword standing up along the arm fails; one at the
//            convention's angle, or hanging from the fist, passes). And it
//            must be gripped: its nearest point within GRIP px of the fist's
//            box.
//   arm      Nothing but the sleeve is drawn on an arm (the arm slot): a
//            people's or mortal's arm-slot geometry stays within SLEEVE px of
//            the arm's skin box. A prop drawn there instead of in the hand
//            stays fixed along the forearm while the wrist turns (the
//            attacks' wrist cock, the walk's carry).
//   clip     Through idle, walk and run (30 frames a second), no held prop
//            (in a hand) enters the head or the torso: its points stay out of
//            the head's and torso's skin boxes shrunk by their outer layer
//            (the hat and jacket overlays), by more than CLIP px.
//   cloth    Clothing on the hips or torso (skirts, coats, aprons, belts and
//            what hangs from them) doesn't stand still while a leg swings
//            through it: through walk and run, no point of it below the hip
//            joints (BELOW px down the hips) that lies outside a leg's skin
//            box at rest ends up inside it by more than PIERCE px. Leg wear belongs on the leg (rig.legR / legL), a skirt
//            on the swinging skirt panels (people.js / mortals.js "skirt").
//            design/sizes.json "props.reviewed" lists the models looked at
//            and left as they are (the Minotaur's aprons hang still: the owner).
//   strike   A marked weapon tip (character.js markTip) on a person or a
//            mortal points forward at the strike of the workbench's attack
//            poses (forward share >= STRIKE_MIN, as perf/weapons.cjs measures
//            the game's armed models; people and mortals never attack in game,
//            but the workbench shows them attacking).
//
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/props.cjs [keys] [--all] [--json out.json]
// keys: a comma list of workbench keys (default: all). --all prints the
// models that pass too. Exits 1 if a check fails. Serves the repository on
// PERF_PORT (default 8765) if nothing is there yet. As a module (check.cjs):
// run({ browser, base, page?, bootErrors?, only?, all?, jsonOut? }) resolves
// to { ok, lines, summary, rows } (page: the workbench, lib.cjs openWorkbench).
const fs = require('fs');
const path = require('path');
const util = require('util');
const { openWorkbench, watchErrors, reseed, cli } = require('./lib.cjs');

const SPEC = path.resolve(__dirname, '../design/sizes.json');
const LIM = { RISE: 1.5, REACH: 3, AXIS: 35, LONG: 6, GRIP: 1.5, SLEEVE: 1.6, CLIP: 0.5, PIERCE: 1.5, BELOW: 1, STRIKE_MIN: 0.3 };

// in the workbench page: every model's issues
const PAGE = async ({ only, LIM }) => {
  const THREE = await import('three/webgpu');
  const { PX } = await import('../js/entities/character.js');
  const { poseStep } = await import('./ingame.js');
  const DT = 1 / 30;
  const visible = (o, top) => { for (let x = o; x && x !== top.parent; x = x.parent) if (!x.visible) return false; return true; };
  const fx = (m) => { const mt = Array.isArray(m.material) ? m.material[0] : m.material; return !mt || mt.blending === THREE.AdditiveBlending || (mt.transparent && !mt.map && !mt.vertexColors); };
  const under = (o, g) => { for (let x = o; x; x = x.parent) if (x === g) return true; return false; };
  // the vertices of the meshes under g (not under any group in skip), as
  // [mesh, Float32Array of local positions] (a merged part: its sources)
  function meshesUnder(g, root, skip = []) {
    const out = [];
    g.traverse((m) => {
      if (!m.isMesh || m.isInstancedMesh || !m.geometry?.attributes?.position || m.userData.shell || m.userData.noLint || m.userData.flames || fx(m) || !visible(m, root)) return;
      if (skip.some((s) => s !== g && under(m, s))) return;
      out.push(m);
    });
    return out;
  }
  // Points over a mesh's surface (its own space; a box's corners alone
  // would miss a leg passing through the middle of a skirt's face, or a
  // shaft passing through a fist): each triangle sampled about every
  // SPACING px, at most cap points a mesh (sparser for a big one). Cached.
  const SPACING = 0.6, surf = new WeakMap();
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
  function surface(m, cap) {
    const key = m.geometry; let S = surf.get(key)?.[cap]; if (S) return S;
    const P = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : P.count, pts = [];
    const g = (i, o) => o.fromBufferAttribute(P, idx ? idx.getX(i) : i);
    let area = 0;
    for (let t = 0; t + 2 < n; t += 3) { g(t, _a); g(t + 1, _b); g(t + 2, _c); area += _b.clone().sub(_a).cross(_c.clone().sub(_a)).length() / 2; }
    const sp = Math.max(SPACING * PX, Math.sqrt(area / cap) * 1.4);
    for (let t = 0; t + 2 < n; t += 3) {
      g(t, _a); g(t + 1, _b); g(t + 2, _c);
      const L = Math.max(_a.distanceTo(_b), _b.distanceTo(_c), _c.distanceTo(_a)), s = Math.max(1, Math.ceil(L / sp));
      for (let i = 0; i <= s; i++) for (let j = 0; j <= s - i; j++) { const u = i / s, w = j / s; pts.push(_a.x * (1 - u - w) + _b.x * u + _c.x * w, _a.y * (1 - u - w) + _b.y * u + _c.y * w, _a.z * (1 - u - w) + _b.z * u + _c.z * w); }
    }
    S = new Float32Array(pts);
    const e = surf.get(key) ?? {}; e[cap] = S; surf.set(key, e);
    return S;
  }
  // points of the meshes in frame F (world matrices current), in px
  const _M = new THREE.Matrix4(), _I = new THREE.Matrix4(), _v = new THREE.Vector3();
  function pointsIn(meshes, F, cap = 4000) {
    _I.copy(F.matrixWorld).invert();
    const pts = [];
    for (const m of meshes) {
      _M.multiplyMatrices(_I, m.matrixWorld);
      const S = surface(m, cap);
      for (let i = 0; i < S.length; i += 3) { _v.set(S[i], S[i + 1], S[i + 2]).applyMatrix4(_M); pts.push(_v.x / PX, _v.y / PX, _v.z / PX); }
    }
    return pts;
  }
  // a bone's skin box (the meshes drawn with the rig's skin material) in the bone's own frame, px
  const isSkin = (rig, m) => (m.userData.baseMat ?? m.material) === rig.material || m.material === rig.material;
  function skinBox(rig, g) {
    const box = new THREE.Box3(); let any = false;
    _I.copy(g.matrixWorld).invert();
    for (const m of g.children) {
      if (!m.isMesh || !isSkin(rig, m)) continue;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox.clone().applyMatrix4(_M.multiplyMatrices(_I, m.matrixWorld));
      box.union(bb); any = true;
    }
    if (!any) return null;
    box.min.divideScalar(PX); box.max.divideScalar(PX);
    return box;
  }
  // the principal axis of a cloud of points [x, y, z, ...]: its centre c, unit direction v, length (extent along v) and how much longer it is than wide
  function mainAxis(P) {
    const n = P.length / 3, c = [0, 0, 0]; if (!n) return { len: 0, ratio: 0, c, v: [0, 1, 0] };
    for (let i = 0; i < P.length; i += 3) { c[0] += P[i] / n; c[1] += P[i + 1] / n; c[2] += P[i + 2] / n; }
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < P.length; i += 3) { const d = [P[i] - c[0], P[i + 1] - c[1], P[i + 2] - c[2]]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a][b] += d[a] * d[b] / n; }
    let v = [0.3, 0.9, 0.2];
    for (let k = 0; k < 60; k++) { const w = [0, 1, 2].map((a) => C[a][0] * v[0] + C[a][1] * v[1] + C[a][2] * v[2]); const L = Math.hypot(...w) || 1; v = w.map((x) => x / L); }
    let lo = Infinity, hi = -Infinity, side = 0;
    for (let i = 0; i < P.length; i += 3) {
      const d = [P[i] - c[0], P[i + 1] - c[1], P[i + 2] - c[2]], t = d[0] * v[0] + d[1] * v[1] + d[2] * v[2];
      lo = Math.min(lo, t); hi = Math.max(hi, t); side = Math.max(side, Math.hypot(d[0] - t * v[0], d[1] - t * v[1], d[2] - t * v[2]));
    }
    return { c, v, len: hi - lo, ratio: (hi - lo) / Math.max(0.5, 2 * side) };
  }
  const shrink = (bx, d) => { const o = bx.clone(); o.min.addScalar(d); o.max.addScalar(-d); return o; };
  // how deep a point lies inside a box (<= 0: outside)
  const depth = (bx, x, y, z) => Math.min(x - bx.min.x, bx.max.x - x, y - bx.min.y, bx.max.y - y, z - bx.min.z, bx.max.z - z);
  const settle = (rig) => { const st = { t: 0 }; for (let i = 0; i < 18; i++) poseStep(rig, 'idle', st, DT); rig.root.position.set(0, 0, 0); rig.root.rotation.set(0, 0, 0); rig.root.updateMatrixWorld(true); };
  // play a pose for n frames, calling f each frame
  const play = (rig, pose, n, f) => { const st = { t: 0 }; for (let i = 0; i < n; i++) { poseStep(rig, pose, st, DT); rig.root.position.set(0, 0, 0); rig.root.rotation.y = 0; rig.root.updateMatrixWorld(true); f(i); } };
  const out = [];
  for (const it of window.__wb.items) {
    if (only.length && !only.includes(it.key)) continue;
    globalThis.__perfReseed?.();   // (PERF_SEED: lib.cjs reseed)
    let rig; try { rig = it.build(); } catch (e) { out.push({ key: it.key, group: it.group, error: String(e.message) }); continue; }
    const R = { key: it.key, group: it.group, issues: [] };
    out.push(R);
    const humanoid = rig.armR && rig.handR && rig.handL && rig.handR !== rig.handL && rig.torso && rig.head && !rig.isQuad && !rig.isSerpent;
    if (!humanoid || typeof rig.animate !== 'function') { R.skip = 'not a humanoid rig'; continue; }
    settle(rig);
    const boxed = it.group === 'people' || it.group === 'mortals';
    const torsoB = skinBox(rig, rig.torso), headB = skinBox(rig, rig.head);
    const armB = { R: skinBox(rig, rig.armR), L: skinBox(rig, rig.armL) }, legB = { R: skinBox(rig, rig.legR), L: skinBox(rig, rig.legL) };
    const hands = [['R', rig.handR], ['L', rig.handL]];
    // ---- grip: each thing a hand holds, in the hand's own frame
    const held = [];
    for (const [s, hand] of hands) {
      const fist = armB[s] && (() => { const f = armB[s].clone(); const o = hand.position.clone().divideScalar(PX); f.min.sub(o); f.max.sub(o); return f; })();   // (the arm's box in the hand's frame: the fist is its bottom)
      for (const c of hand.children) {
        const ms = meshesUnder(c, rig.root); if (!ms.length) continue;
        const P = pointsIn(ms, hand);
        held.push({ s, hand, ms });
        if (!fist) continue;
        const fw = { x0: fist.min.x, x1: fist.max.x, z0: fist.min.z, z1: fist.max.z };
        let rise = 0, near = Infinity;
        for (let i = 0; i < P.length; i += 3) {
          const x = P[i], y = P[i + 1], z = P[i + 2];
          // beside the forearm (within REACH of its sides) and above the fist's top (the fist: the arm box's bottom 3 px)
          if (x > fw.x0 - LIM.REACH && x < fw.x1 + LIM.REACH && z > fw.z0 - LIM.REACH && z < fw.z1 + LIM.REACH) rise = Math.max(rise, y - 3);
          const dx = Math.max(fw.x0 - x, 0, x - fw.x1), dy = Math.max(-0.5 - y, 0, y - 3), dz = Math.max(fw.z0 - z, 0, z - fw.z1);
          near = Math.min(near, Math.hypot(dx, dy, dz));
        }
        const name = c.userData.weaponTip || c.children.some((o) => o.userData?.weaponTip) ? 'weapon' : (c.name || 'prop');
        // the main axis of a long prop (its points' principal direction),
        // turned toward its far end (the point furthest from the fist's
        // middle): it must leave the forearm's line by AXIS degrees or more
        const ax = mainAxis(P), F = [0, 1.5, 0];
        if (ax.len >= LIM.LONG && ax.ratio >= 2) {
          let far = 0, fd = -1; for (let i = 0; i < P.length; i += 3) { const d = (P[i] - F[0]) ** 2 + (P[i + 1] - F[1]) ** 2 + (P[i + 2] - F[2]) ** 2; if (d > fd) { fd = d; far = i; } }
          const sgn = (P[far] - ax.c[0]) * ax.v[0] + (P[far + 1] - ax.c[1]) * ax.v[1] + (P[far + 2] - ax.c[2]) * ax.v[2] < 0 ? -1 : 1;
          const ang = Math.acos(Math.max(-1, Math.min(1, sgn * ax.v[1]))) * 180 / Math.PI;
          if (ang < LIM.AXIS) R.issues.push({ check: 'grip', side: s, what: name, value: +ang.toFixed(0), text: `${name} in the ${s} hand points ${ang.toFixed(0)} degrees off the forearm, toward the elbow (along the arm; min ${LIM.AXIS})` });
        }
        if (rise > LIM.RISE) R.issues.push({ check: 'grip', side: s, what: name, value: +rise.toFixed(1), text: `${name} in the ${s} hand runs ${rise.toFixed(1)} px up along the forearm (max ${LIM.RISE})` });
        if (near > LIM.GRIP) R.issues.push({ check: 'grip', side: s, what: name, value: +near.toFixed(1), text: `${name} in the ${s} hand is ${near.toFixed(1)} px from the fist (not gripped; max ${LIM.GRIP})` });
      }
    }
    // ---- arm: only the sleeve on a people's or mortal's arm slot
    if (boxed) for (const [s, arm] of [['R', rig.armR], ['L', rig.armL]]) {
      const parts = rig.extras['arm' + s + 'Parts'], glow = rig.extras['arm' + s + 'Glow'];
      const ms = [parts, glow].filter((m) => m && visible(m, rig.root)); if (!ms.length || !armB[s]) continue;
      const P = pointsIn(ms, arm), A = armB[s];
      let worst = 0, at = null;
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i], y = P[i + 1], z = P[i + 2];
        const d = Math.max(A.min.x - x, x - A.max.x, A.min.y - y, y - A.max.y, A.min.z - z, z - A.max.z);
        if (d > worst) { worst = d; at = [x, y, z].map((v) => +v.toFixed(1)); }
      }
      if (worst > LIM.SLEEVE) R.issues.push({ check: 'arm', side: s, value: +worst.toFixed(1), at, text: `the ${s} arm slot reaches ${worst.toFixed(1)} px off the arm at [${at}] (a prop drawn on the arm, not held in the hand; max ${LIM.SLEEVE})` });
    }
    // ---- clip and cloth: through idle, walk and run
    const coreT = torsoB && shrink(torsoB, 0.6), coreH = headB && shrink(headB, 1.2);
    const legCore = { R: legB.R && shrink(legB.R, 0.3), L: legB.L && shrink(legB.L, 0.3) };
    // clothing: what hangs on the hips and torso, but not on the limbs, head or hands
    const limbs = [rig.legR, rig.legL, rig.armR, rig.armL, rig.head, rig.neck, rig.handR, rig.handL].filter(Boolean);
    // (a glow is light, not cloth: the sea curling round the Nereid)
    const glows = new Set(Object.entries(rig.extras ?? {}).filter(([k]) => /Glow$/.test(k)).map(([, v]) => v));
    // (a cape hangs on its own spring, character.js physics, which lifts it behind a body on the move: the poses here stand still)
    const capes = (rig.cape ?? []).map((c) => c.g);
    const cloth = [...meshesUnder(rig.hips, rig.root, [...limbs, rig.torso]), ...meshesUnder(rig.torso, rig.root, [...limbs, ...capes])].filter((m) => !isSkin(rig, m) && !glows.has(m));
    const clothRest = {};
    // (hidden legs: Chiron stands on a horse's body)
    // (only cloth below the hip joints, BELOW px down on the hips: a belt or a jacket's waist always meets a thigh's top at a run's full stride)
    const Ph = cloth.length ? pointsIn(cloth, rig.hips, 6000) : null;
    if (legCore.R && legCore.L && cloth.length && visible(rig.legR, rig.root) && visible(rig.legL, rig.root)) for (const s of ['R', 'L']) {
      const leg = s === 'R' ? rig.legR : rig.legL, P = pointsIn(cloth, leg, 6000), out0 = new Uint8Array(P.length / 3);
      for (let i = 0; i < out0.length; i++) out0[i] = Ph[i * 3 + 1] < -LIM.BELOW && depth(legCore[s], P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) <= 0 ? 1 : 0;
      clothRest[s] = out0;
    }
    const worst = { clip: {}, cloth: {} };
    for (const [pose, n] of [['idle', 30], ['walk', 45], ['run', 30]]) {
      play(rig, pose, n, (f) => {
        for (const h of held) {
          for (const [part, F, core] of [['torso', rig.torso, coreT], ['head', rig.head, coreH]]) {
            if (!core) continue;
            const P = pointsIn(h.ms, F, 600);
            for (let i = 0; i < P.length; i += 3) { const d = depth(core, P[i], P[i + 1], P[i + 2]); const k = `${h.s}:${part}`; if (d > (worst.clip[k]?.d ?? LIM.CLIP)) worst.clip[k] = { d, pose, f, s: h.s, part }; }
          }
        }
        for (const s of ['R', 'L']) {
          if (!clothRest[s]) continue;
          const leg = s === 'R' ? rig.legR : rig.legL, P = pointsIn(cloth, leg, 6000), o0 = clothRest[s];
          for (let i = 0; i < o0.length; i++) {
            if (!o0[i]) continue;
            const d = depth(legCore[s], P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
            if (d > (worst.cloth[s]?.d ?? LIM.PIERCE)) worst.cloth[s] = { d, pose, f, s, at: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]].map((v) => +v.toFixed(1)) };
          }
        }
      });
    }
    for (const w of Object.values(worst.clip)) R.issues.push({ check: 'clip', side: w.s, value: +w.d.toFixed(1), text: `a prop in the ${w.s} hand goes ${w.d.toFixed(1)} px into the ${w.part} (${w.pose}, frame ${w.f}; max ${LIM.CLIP})` });
    for (const w of Object.values(worst.cloth)) R.issues.push({ check: 'cloth', side: w.s, value: +w.d.toFixed(1), at: w.at, text: `the ${w.s} leg swings ${w.d.toFixed(1)} px through clothing on the hips or torso (${w.pose}, frame ${w.f}, at [${w.at}] in the leg's frame; max ${LIM.PIERCE})` });
    // ---- strike: a person's or mortal's marked weapon, forward at the strike of each workbench attack
    if (boxed) {
      const tips = []; rig.root.traverse((o) => { if (o.userData?.weaponTip) { let s = null; for (let q = o; q && !s; q = q.parent) { if (q === rig.handR || q === rig.armR) s = 'R'; else if (q === rig.handL || q === rig.armL) s = 'L'; } if (s) tips.push({ o, s }); } });
      const a = new THREE.Vector3(), c = new THREE.Vector3();
      for (const [style, frame] of [['swingR', 17], ['swingL', 56], ['punch', 95], ['slam', 134]]) {
        settle(rig);
        play(rig, 'attack', frame + 1, () => {});
        for (const t of tips) {
          t.o.getWorldPosition(a); (t.s === 'R' ? rig.handR : rig.handL).getWorldPosition(c);
          const d = a.sub(c), L = d.length(), fwd = L > 1e-6 ? d.z / L : 0;
          if (fwd < LIM.STRIKE_MIN) R.issues.push({ check: 'strike', side: t.s, value: +fwd.toFixed(2), text: `${t.o.userData.label || 'weapon'} points ${fwd.toFixed(2)} forward at the ${style} strike (min ${LIM.STRIKE_MIN})` });
        }
      }
    }
    rig.root.traverse((o) => o.geometry?.dispose?.());
  }
  return out;
};

function report(res, errs, { all: ALL = false, jsonOut = null } = {}) {
  const lines = [];
  const spec = fs.existsSync(SPEC) ? JSON.parse(fs.readFileSync(SPEC, 'utf8')) : {};
  const reviewed = spec.props?.reviewed ?? {};
  let bad = 0, models = 0, known = 0;
  for (const r of res) {
    if (r.error) { lines.push(`ERROR ${r.key}: ${r.error}`); bad++; continue; }
    models++;
    const rev = reviewed[r.key];
    const list = (r.issues ?? []).map((i) => ({ ...i, ok: !!rev?.checks?.includes(i.check) }));
    const fails = list.filter((i) => !i.ok);
    if (fails.length) bad++;
    known += list.length - fails.length;
    if (!list.length && !ALL) continue;
    if (!list.length) { lines.push(`ok    ${r.group.padEnd(9)} ${r.key}${r.skip ? `  (${r.skip})` : ''}`); continue; }
    for (const i of list) lines.push(`${i.ok ? 'known' : 'FAIL '} ${r.group.padEnd(9)} ${r.key.padEnd(24)} ${i.check.padEnd(6)} ${i.text}${i.ok ? `  (reviewed: ${rev.note})` : ''}`);
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(res, null, 1));
  lines.push(util.format(`\nprops: ${models} models, ${bad} failing, ${known} reviewed findings (design/sizes.json props.reviewed); page errors ${errs.length}`, errs.slice(0, 3)));
  return { ok: !(errs.length || bad), lines, rows: res, summary: { models, failing: bad, reviewed: known, pageErrors: errs.length }, text: `${models} models, ${bad} failing, ${known} reviewed` + (errs.length ? `, ${errs.length} page errors` : '') };
}

async function run({ browser, base, page = null, bootErrors = [], only = [], all = false, jsonOut = null }) {
  const own = page ? null : await openWorkbench(browser, base);
  page = page ?? own.page;
  const w = watchErrors(page);
  try {
    await reseed(page);
    const res = await page.evaluate(PAGE, { only: only ?? [], LIM });
    return report(res, own ? own.errors : [...bootErrors, ...w.errors], { all, jsonOut });
  } finally { w.stop(); if (own) await own.page.close(); }
}

module.exports = { run, report, PAGE, LIM };
if (require.main === module) {
  const ARGS = process.argv.slice(2);
  cli(run, { all: ARGS.includes('--all'), jsonOut: ARGS.includes('--json') ? ARGS[ARGS.indexOf('--json') + 1] : null,
    only: (ARGS.find((a, i) => !a.startsWith('--') && ARGS[i - 1] !== '--json') || '').split(',').filter(Boolean) });
}
