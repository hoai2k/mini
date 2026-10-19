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
//   - glows and additive effects, sprites and hidden parts.
// It prints body height (top of the body over the soles), total height (the
// whole visible box) and both as × Percy, and writes JSON to argv[2].
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/bodysize.cjs [out.json] [keys]
// Serves the repository on PERF_PORT (default 8765) if nothing is there yet.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { findChrome } = require('./lib.cjs');

const PORT = +(process.env.PERF_PORT || 8765);
const ROOT = path.resolve(__dirname, '../..');
const GAME = `http://127.0.0.1:${PORT}/percyjackson/game/`;
const OUT = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);

async function serve() {
  const up = async () => { try { return (await fetch(GAME)).ok; } catch { return false; } };
  if (await up()) return;
  spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', detached: true }).unref();
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250));
}

(async () => {
  await serve();
  const b = await chromium.launch({ executablePath: findChrome(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${GAME}workbench/?turn=0&lazy=1&lint=0&bg=light`);
  await p.waitForFunction(() => window.__wb, null, { timeout: 180000 });
  const res = await p.evaluate(async (only) => {
    const THREE = await import('three/webgpu');
    const champ = await import('../js/entities/champions.js');
    const mons = await import('../js/entities/monsters.js');
    const models = await import('../js/entities/models.js');
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
      return { allTop: all.max.y, allBot: all.min.y, allH: sa.y, bodyTop: body.isEmpty() ? 0 : body.max.y, bodyBot: body.isEmpty() ? 0 : body.min.y, bodyH: sb.y, bodyLong: Math.max(sb.x, sb.z), allLong: Math.max(sa.x, sa.z), float: rig.float ?? 0, parts, tris };
    };
    const percy = measure(models.buildHeroModel('percy'));
    const P = percy.bodyTop;
    const out = [];
    for (const it of window.__wb.items) {
      if (only.length && !only.includes(it.key)) continue;
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
        statH: sh, statR: sr, base: rig.baseScale, tris: Math.round(m.tris),
        left: Object.entries(m.parts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ') });
      rig.root.traverse((o) => o.geometry?.dispose?.());
    }
    return { percy: { bodyH: +P.toFixed(3), allH: +percy.allH.toFixed(3) }, rows: out };
  }, ONLY);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log(`Percy body ${res.percy.bodyH}, whole ${res.percy.allH}`);
  console.log('group      key                         body  ×P    total ×P    statH');
  for (const r of res.rows) {
    if (r.error) { console.log(r.key, 'ERROR', r.error); continue; }
    console.log(`${r.group.padEnd(10)} ${r.key.padEnd(27)} ${String(r.bodyH).padStart(5)} ${r.bodyX.toFixed(2)}  ${String(r.allH).padStart(5)} ${r.allX.toFixed(2)}  ${String(r.statH ?? '—').slice(0, 5).padEnd(5)}  left out: ${r.left}`);
  }
  console.log('models', res.rows.length, 'page errors', errs.length, errs.slice(0, 3));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
