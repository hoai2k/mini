// Body size: every workbench model's body, measured apart from what it holds
// or trails. The size audit (design/size-audit.md) once judged models by
// their whole bounding box, so a whip hanging under a Fury or a tall staff
// made a small body look big enough. This measures the BODY: the core torso,
// head and legs of the rig, standing at rest (animate with dt 0), leaving out
//   - a humanoid Rig's arms and hands (raised arms, and everything held);
//   - anything held or aimed: markHeld() props, and the weapon that carries a
//     markTip() tip (character.js);
//   - wings (addWings), the whip (addWhip), tails (QuadRig tail, the
//     chimera's snake, extras.tails), stings, flame hair (extras.flameHair),
//     the live flames (flames.js, an InstancedMesh), capes, hair strands and
//     props named in rig.extras (weapon, shield, pot, gun, bike, ...);
//   - headwear (round 9): helmets, crests, plumes, hats, caps, crowns,
//     circlets and horns its builder marked (proportions.js markHeadwear,
//     userData.headwear), so a crest never counts as body;
//   - glows and additive effects, sprites and hidden parts.
// It prints body height (top of the body over the soles), total height (the
// whole visible box) and both as × Percy, and writes JSON to argv[2]. For an
// upright model (a Rig, not a QuadRig or serpent) it also measures the head:
// the height of the rig's head block (the skin cube, hair and props aside)
// over the body height (the skull and face alone where the builder names
// them, rig.extras.headCore).
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/bodysize.cjs [out.json] [keys] [--check]
// --check tests every model against the size spec (design/sizes.json): its
// body × Percy must lie in its size category's band, and a big upright
// model's head must go from a hero's proportions toward its own concept
// sheet's (the spec's head rule, design/sizes.json "headSheet"), and never be
// smaller than Percy's,
// nor its legs a hero's short ones (the leg rule: hip joint to sole over
// body height, the "leg/body" column; QuadRigs, marked q, unchecked). It
// lists each failure and exits 1 if there is any.
// Serves the repository on PERF_PORT (default 8765) if nothing is there yet.
// As a module (check.cjs): run({ browser, base, page?, bootErrors?, only?,
// check?, out? }) resolves to { ok, lines, summary, rows }.
const fs = require('fs');
const path = require('path');
const util = require('util');
const { openWorkbench, watchErrors, reseed, cli } = require('./lib.cjs');

const SPEC = path.resolve(__dirname, '../design/sizes.json');

// in the workbench page: every model measured
const PAGE = async ({ only }) => {
  const THREE = await import('three/webgpu');
  const champ = await import('../js/entities/champions.js');
  const mons = await import('../js/entities/monsters.js');
  const models = await import('../js/entities/models.js');
  const chr = await import('../js/entities/character.js');
  // measured unmerged: charmat.js mergeRig folds every mesh on a bone into
  // one part, the head's skin cube with its hair, beard and hat, so the
  // head block (rig.headMesh) would measure the whole head part
  (await import('../js/entities/charmat.js')).PART_MERGE.on = false;
  // props and trailing parts kept in rig.extras (body parts such as heads,
  // the goat, the abdomen, the trunk, hair, a veil or a collar stay in)
  const PROP_KEYS = ['wings', 'weapon', 'shield', 'flameHair', 'sword', 'fire', 'blade', 'whip', 'whipTip', 'spear', 'pipes', 'key', 'hammer', 'gun', 'club', 'axe', 'bike', 'ball', 'pot', 'flame', 'venom', 'sting', 'snake', 'snakes', 'tails', 'ring', 'crusherArm', 'crusher', 'muzzle', 'breath'];
  const fx = (o) => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return !!m && (m.blending === THREE.AdditiveBlending || (m.transparent && !m.map && !m.vertexColors)); };
  const visible = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const addObj = (set, v) => {
    if (!v) return;
    if (Array.isArray(v)) { for (const x of v) addObj(set, x); return; }
    if (v.isObject3D) { set.add(v); return; }
    if (typeof v === 'object') for (const k of ['root', 'g', 'mesh', 'group']) if (v[k]?.isObject3D) set.add(v[k]);
    if (typeof v === 'object' && Array.isArray(v.segs)) addObj(set, v.segs);
  };
  const skipSet = (rig) => {
    const s = new Map(); s.add = function (o, label = this._label) { if (!this.has(o)) this.set(o, label); return this; };
    const skel = new Set([rig.root, rig.hips, rig.torso, rig.neck, rig.head].filter(Boolean));
    // a humanoid's arms (a QuadRig's armR/armL are its front legs, a serpent's a stub)
    if (!rig.isQuad && rig.armR && rig.armR !== rig.legR && rig.armR.parent) { s.add(rig.armR, 'arms'); s.add(rig.armL, 'arms'); }
    for (const k of PROP_KEYS) { s._label = k; addObj(s, rig.extras?.[k]); }
    s._label = 'tail'; for (const t of rig.tail ?? []) addObj(s, t.g ?? t);
    s._label = 'cape'; for (const c of rig.cape ?? []) addObj(s, c.g ?? c);
    s._label = 'strands'; for (const h of rig.strands ?? []) addObj(s, h.g ?? h);
    s._label = 'weapon';
    rig.root.traverse((o) => {
      if (o.userData?.heldProp) s.add(o, 'held');
      if (o.userData?.headwear) s.add(o, 'headwear');   // helmets, crests, plumes, hats, crowns, horns (proportions.js markHeadwear)
      if (o.userData?.weaponTip) {   // the weapon: up from the tip to the part it hangs on
        let w = o.parent; while (w && w.parent && !skel.has(w.parent) && w.parent !== rig.handR && w.parent !== rig.handL) w = w.parent;
        if (w && !skel.has(w)) s.add(w);
      }
    });
    return s;
  };
  const measure = (rig) => {
    try { rig.animate?.({ dt: 0, speed: 0, vel: new THREE.Vector3(), action: null }); } catch {}
    rig.root.position.set(0, 0, 0); rig.root.rotation.set(0, 0, 0); rig.root.updateMatrixWorld(true);
    const skip = skipSet(rig);
    const under = (o) => { for (let x = o; x; x = x.parent) if (skip.has(x)) return skip.get(x); return null; };
    const all = new THREE.Box3(), body = new THREE.Box3(), parts = {}; let tris = 0;
    rig.root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSprite || fx(o) || !visible(o)) return;
      o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      all.union(bb); const u = under(o); if (!u) body.union(bb); else parts[u] = Math.max(parts[u] ?? -Infinity, bb.max.y);
    });
    const sa = all.getSize(new THREE.Vector3()), sb = body.isEmpty() ? new THREE.Vector3() : body.getSize(new THREE.Vector3());
    // the head block of an upright rig: the skull and face its builder
    // named (rig.extras.headCore, proportions.js markHeadCore: measured
    // along the head's own axis, so a hunched or bowed head is not taller
    // for its tilt; mane, beard, veil, hood and horns left out), else its
    // skin cube where the builder kept it (rig.headMesh), else the head
    // group's own solid meshes
    let headH = null;
    const core = !rig.isQuad && rig.head && rig.extras?.headCore;
    if (core) {
      const PXu = chr.PX, a = new THREE.Vector3(core.c[0] * PXu, (core.c[1] - core.s[1] / 2) * PXu, core.c[2] * PXu), b = new THREE.Vector3(core.c[0] * PXu, (core.c[1] + core.s[1] / 2) * PXu, core.c[2] * PXu);
      headH = rig.head.localToWorld(a).distanceTo(rig.head.localToWorld(b));
    } else if (!rig.isQuad && rig.head) {
      const hb = new THREE.Box3(), hm = rig.headMesh;
      const attached = (o) => { for (let x = o; x; x = x.parent) if (x === rig.root) return true; return false; };
      if (hm && attached(hm) && visible(hm)) { hm.geometry.computeBoundingBox(); hb.copy(hm.geometry.boundingBox).applyMatrix4(hm.matrixWorld); }
      else rig.head.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !fx(o) && visible(o) && !under(o)) { o.geometry.computeBoundingBox(); hb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
      if (!hb.isEmpty()) headH = hb.max.y - hb.min.y;
    }
    // the legs: hip joint to sole (a Rig's leg pivots over the ground it
    // stands on); for a QuadRig its front leg's root over the ground,
    // recorded beside the shoulder (body) height but not checked
    let legH = null;
    const legs = rig.isQuad ? [rig.legs?.[0]].filter(Boolean) : [rig.legR, rig.legL].filter((g) => g && g.parent && g !== rig.armR);
    if (legs.length && !rig.isSerpent) { const w = new THREE.Vector3(); legH = Math.max(...legs.map((g) => g.getWorldPosition(w).y)); }
    return { legH, headH, allTop: all.max.y, allBot: all.min.y, allH: sa.y, bodyTop: body.isEmpty() ? 0 : body.max.y, bodyBot: body.isEmpty() ? 0 : body.min.y, bodyH: sb.y, bodyLong: Math.max(sb.x, sb.z), allLong: Math.max(sa.x, sa.z), float: rig.float ?? 0, parts, tris };
  };
  globalThis.__perfReseed?.();   // (PERF_SEED: lib.cjs reseed)
  const percy = measure(models.buildHeroModel('percy'));
  const P = percy.bodyTop;
  const out = [];
  for (const it of window.__wb.items) {
    if (only.length && !only.includes(it.key)) continue;
    globalThis.__perfReseed?.();   // (PERF_SEED: lib.cjs reseed)
    let rig; try { rig = it.build(); } catch (e) { out.push({ group: it.group, key: it.key, name: it.name, error: String(e.message) }); continue; }
    const m = measure(rig);
    const d = it.data || {};
    let sh = d.height, sr = d.radius;
    if (it.group === 'champions') {
      const kind = it.id.startsWith('kind:') ? it.id.slice(5) : champ.CHAMPION_LOOKS[it.id]?.kind;
      const look = it.id.startsWith('kind:') ? champ.KIND_LOOKS[kind] : champ.CHAMPION_LOOKS[it.id];
      const k = look?.size ?? look?.scale ?? 1.3; const def = mons.MONSTERS[kind];
      if (def) { sh = def.height * k; sr = def.radius * Math.min(1.5, k); }
    }
    const r2 = (v) => +(+v).toFixed(2);
    // body height: the top of the body over the ground line it stands on at
    // rest (a Fury's hem hangs under it; she hovers by rig.float in game)
    const bodyH = m.bodyTop;
    out.push({ group: it.group, key: it.key, name: it.name,
      bodyH: r2(bodyH), bodyX: r2(bodyH / P), allH: r2(m.allTop - Math.min(0, m.allBot)), allX: r2((m.allTop - Math.min(0, m.allBot)) / P),
      bodyBot: r2(m.bodyBot), bodyLong: r2(m.bodyLong), allLong: r2(m.allLong), float: m.float, hoverTop: r2(m.bodyTop + (m.float || d.hover || 0)),
      legR: m.legH == null || !bodyH ? null : +(m.legH / bodyH).toFixed(3), quad: !!rig.isQuad,
      headH: m.headH == null ? null : r2(m.headH), headR: m.headH == null || !bodyH ? null : +(m.headH / bodyH).toFixed(3),
      statH: sh, statR: sr, base: rig.baseScale, tris: Math.round(m.tris),
      left: Object.entries(m.parts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ') });
    rig.root.traverse((o) => o.geometry?.dispose?.());
  }
  return { percy: { bodyH: +P.toFixed(3), allH: +percy.allH.toFixed(3) }, rows: out };
};

function report(res, errs, { check: CHECK = false, out = null } = {}) {
  const lines = [];
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
  lines.push(`Percy body ${res.percy.bodyH}, whole ${res.percy.allH}`);
  lines.push('group      key                         body  ×P    total ×P    statH  head/body  leg/body  tris');
  for (const r of res.rows) {
    if (r.error) { lines.push([r.key, 'ERROR', r.error].join(' ')); continue; }
    lines.push(`${r.group.padEnd(10)} ${r.key.padEnd(27)} ${String(r.bodyH).padStart(5)} ${r.bodyX.toFixed(2)}  ${String(r.allH).padStart(5)} ${r.allX.toFixed(2)}  ${String(r.statH ?? '—').slice(0, 5).padEnd(5)}  ${r.headR == null ? '  —  ' : r.headR.toFixed(3)}  ${r.legR == null ? '  —  ' : r.legR.toFixed(3)}${r.quad ? 'q' : ' '}  ${String(r.tris).padStart(6)}  left out: ${r.left}`);
  }
  lines.push(util.format('models', res.rows.length, 'page errors', errs.length, errs.slice(0, 3)));
  let bad = 0;
  if (CHECK) bad = check(res.rows, lines);
  const ok = !(errs.length || bad);
  return { ok, lines, rows: res.rows, percy: res.percy, summary: { models: res.rows.length, failing: bad, pageErrors: errs.length, percyBody: res.percy.bodyH }, text: `${res.rows.length} models` + (CHECK ? `, ${bad} outside the size spec` : '') + (errs.length ? `, ${errs.length} page errors` : '') };
}

// The page's raw results and its page errors (check.cjs shards this over pages: only, the keys of one shard)
async function collect({ browser, base, page = null, bootErrors = [], only = [] }) {
  const own = page ? null : await openWorkbench(browser, base);
  page = page ?? own.page;
  const w = watchErrors(page);
  try {
    await reseed(page);
    const res = await page.evaluate(PAGE, { only: only ?? [] });
    return { res, errors: own ? own.errors : [...bootErrors, ...w.errors] };
  } finally { w.stop(); if (own) await own.page.close(); }
}

async function run(o) {
  const { res, errors } = await collect(o);
  return report(res, errors, { check: !!o.check, out: o.out ?? null });
}

module.exports = { run, collect, report, PAGE, check };
if (require.main === module) {
  const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  cli(run, { check: process.argv.includes('--check'), out: ARGS[0] && ARGS[0] !== '-' ? ARGS[0] : null, only: (ARGS[1] || '').split(',').filter(Boolean) });
}

// ---- the size spec check (--check) ------------------------------------------
// design/sizes.json gives each model a size category; the category's band (×
// Percy, body height) is in its "categories" table, the one place to tune
// them. The head rule: an upright model's head block over its body height
// goes from a hero's (head.hero at head.from × Percy and under) toward its
// own concept sheet's proportion (its "headSheet" ratio, reached at head.to
// × Percy and over), never under that ratio less its tolerance; a model with
// no sheet measurement falls back to the general top, head.big at head.to.
// And an upright model of head.floorFrom × Percy or more never has a head
// smaller than Percy's (absolute size).
const ramp = (H, x) => Math.max(0, Math.min(1, (x - H.from) / (H.to - H.from)));
function headMax(H, x, sheet) {
  if (sheet) return H.hero + (sheet.ratio - H.hero) * ramp(H, x) + (sheet.tol ?? H.sheetTol);
  return H.hero + (H.big - H.hero) * ramp(H, x) + H.tol;
}
const headMin = (H, sheet) => (sheet ? sheet.ratio - (sheet.tol ?? H.sheetTol) : -Infinity);
// The leg rule (spec.legs): an upright model's legs (hip joint to sole) over
// its body height must be at least legs.hero at legs.from × Percy and under,
// rising in a straight line to legs.big at legs.to × Percy and over.
function legMin(L, x) {
  const t = Math.max(0, Math.min(1, (x - L.from) / (L.to - L.from)));
  return L.hero + (L.big - L.hero) * t - L.tol;
}
function check(rows, lines) {
  const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
  const C = spec.categories, H = spec.head, L = spec.legs, out = [], warn = [], lwarn = [];
  const percyHead = rows.find((r) => r.key === 'percy')?.headH ?? null;
  for (const r of rows) {
    if (r.error) { out.push(`${r.key}: did not build (${r.error})`); continue; }
    const e = spec.models[r.key];
    if (!e) { out.push(`${r.key}: no entry in design/sizes.json`); continue; }
    const c = C[e.category];
    if (!c) { out.push(`${r.key}: unknown category "${e.category}"`); continue; }
    const x = r.bodyX;
    if (x < c.min || x > c.max) out.push(`${r.key}: body ${x.toFixed(2)}× Percy is outside "${e.category}" (${c.label}, ${c.min}–${c.max}×)`);
    const sh = e.headSheet ?? null;
    const max = r.headR != null && x > H.from ? headMax(H, x, sh) : Infinity, min = r.headR != null && x > H.from ? headMin(H, sh) : -Infinity;
    const small = H.floorFrom != null && percyHead != null && r.headH != null && x >= H.floorFrom && r.headH < percyHead;
    if (r.headR > max || r.headR < min || small) {
      const msg = r.headR > max ? `${r.key}: head ${r.headR.toFixed(3)} of its body at ${x.toFixed(2)}× Percy, over the head rule's ${max.toFixed(3)} (${sh ? `on its way to its sheet's ${sh.ratio}` : 'a hero-proportioned head on a big body'})`
        : r.headR < min ? `${r.key}: head ${r.headR.toFixed(3)} of its body at ${x.toFixed(2)}× Percy, under its sheet's ${sh.ratio} less ${(sh.tol ?? H.sheetTol)} (${min.toFixed(3)}): a head smaller than its concept draws it`
        : `${r.key}: head ${r.headH} at ${x.toFixed(2)}× Percy, smaller than Percy's own ${percyHead} (the floor for a model of ${H.floorFrom}× Percy and more)`;
      if (e.head === 'followUp') warn.push(msg + ' [known: follow-up]'); else out.push(msg);
    } else if (e.head === 'followUp') warn.push(`${r.key}: marked "head": "followUp" but its head now passes (${r.headR == null ? 'not an upright rig' : r.headR.toFixed(3)}); remove the mark`);
    if (L && e.legs !== 'exempt') {
      const min = r.legR != null && !r.quad && x > L.from ? legMin(L, x) : -Infinity;
      if (r.legR < min) {
        const msg = `${r.key}: legs ${r.legR.toFixed(3)} of its body at ${x.toFixed(2)}× Percy, under the leg rule's ${min.toFixed(3)} (a hero's short legs on a big body)`;
        if (e.legs === 'followUp') lwarn.push(msg + ' [known: follow-up]'); else out.push(msg);
      } else if (e.legs === 'followUp') lwarn.push(`${r.key}: marked "legs": "followUp" but its legs now pass (${r.legR == null ? 'not an upright rig' : r.legR.toFixed(3)}); remove the mark`);
    } else if (e.legs === 'exempt' && !e.legsNote) out.push(`${r.key}: "legs": "exempt" needs a legsNote giving the reason`);
  }
  lines.push(`\nsize check (design/sizes.json): ${rows.length} models, ${out.length} failing, ${warn.length} head warnings, ${lwarn.length} leg warnings`);
  for (const l of out) lines.push('  FAIL ' + l);
  for (const l of warn) lines.push('  WARN ' + l);
  for (const l of lwarn) lines.push('  WARN ' + l);
  return out.length;
}
