// The springtail's portals (the way on), drawn in the world: a floating raft
// of Sphagnum at each of the fixed portals (PORTALS in world.js; mossTop
// honours them, so you land and walk on them) crowned with big red and green
// capitula, and on the tallest one a speck that moves: the Limnozetes mite of
// the next stage (design §0.6). A golden sparkle hangs over each
// (shared/portal.js), dim while its wolf spider guards it or the way on is
// still closed, bright once it is open. Rafts far from every player are
// hidden and not updated (`update`'s `near`). The one in focus (the nearest
// to the players, `focus(i)`) is what the outro and the screen light use
// (`glow`, `position`, `speck`, `mite()`). Over every raft a column of light
// comes down from the sky (`createPortalColumn`, shared/portal.js): it rises
// far above the horizon of the low macro camera, so a portal is seen from
// hundreds of mm off (hold RT to look far: it comes into focus). Columns
// within COLUMN_SHOW of a player are drawn, and always the COLUMN_KEEP
// nearest. Also the players' colour rings, a
// faint loop on the film under each springtail when more than one plays.
// Units: mm.
import * as THREE from '../shared/vendor/three.module.min.js';
import { litMaterial } from '../shared/techniques/springtail-macro.js';
import { createPortalGlow, createGlint, createPortalColumn } from '../shared/portal.js';
import { capitulumGeometry, PORTALS, PORTAL_R, raftTop } from './world.js';

/** Rafts farther than this (mm) from every player are hidden and not updated. */
export const RAFT_SHOW = 260;
/** The mite (and its glint) are drawn only within this (mm) of a player: a 0.36 mm speck is under a pixel farther out. */
export const MITE_SHOW = 120;
/** Light columns farther than this (mm) from every player are hidden, except the COLUMN_KEEP nearest. */
export const COLUMN_SHOW = 900;
export const COLUMN_KEEP = 4;
/** The column: how tall (mm; from the sky as the low camera sees it) and its radius at the foot. */
export const COLUMN = { height: 700, radius: 7 };

export function createLandmarkProps(world, { pixelHeight } = {}) {
  const group = new THREE.Group();
  let seed = 977;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = PORTAL_R;
  // the raft: a low floating mat of moss, wet and dark at the waterline (one geometry for every raft)
  const dome = new THREE.SphereGeometry(1, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  {
    const dp = dome.attributes.position;
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i) * (R + 0.4), z = dp.getZ(i) * (R + 0.4), d = Math.hypot(x, z);
      dp.setXYZ(i, x, d > R ? -0.3 : raftTop(d) - 0.6, z);
    }
    dome.computeVertexNormals();
  }
  // capitula packed over the raft: larger than the rim's, lit red and green
  const geo = capitulumGeometry(rnd, { spreading: 20, bud: 14, sides: 5 });
  const heads = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const u = Math.sqrt((i + 0.5) / n) * (R - 1.4), a = i * 2.39996;
    heads.push({ x: Math.cos(a) * u, z: Math.sin(a) * u, s: 1.2 + rnd() * 0.3 });
  }
  // the tallest head, a little off centre: the mite's
  heads.unshift({ x: R * 0.25, z: 0.8, s: 1.7 });
  const palette = [[0.24, 0.035, 0.03], [0.11, 0.19, 0.025], [0.2, 0.05, 0.03], [0.16, 0.17, 0.03]];
  const headIM = new THREE.InstancedMesh(geo, world.mossMat, heads.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  heads.forEach((h, i) => {
    h.y = raftTop(Math.hypot(h.x, h.z)) - 1.15 * h.s;
    q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.2, rnd() * 6.28, (rnd() - 0.5) * 0.2));
    m4.compose(new THREE.Vector3(h.x, h.y, h.z), q, new THREE.Vector3(h.s, h.s, h.s));
    headIM.setMatrixAt(i, m4);
    headIM.setColorAt(i, col.setRGB(...palette[i === 0 ? 0 : i % palette.length]));
  });
  headIM.computeBoundingSphere();
  const top = heads[0];
  const topY = top.y + top.s * 1.42;
  const shell = litMaterial({ surface: `s.albedo = vec3(0.09, 0.035, 0.015); s.rough = 0.22; s.f0 = 0.05; s.sheen = 0.2; s.sheenCol = vec3(0.5, 0.3, 0.2);` });
  const legMat = litMaterial({ surface: `s.albedo = vec3(0.16, 0.08, 0.04); s.rough = 0.5;` });
  const bodyGeo = new THREE.SphereGeometry(1, 16, 10);
  const legGeo = new THREE.CylinderGeometry(0.012, 0.016, 1, 4).translate(0, 0.5, 0);

  /** One raft at portal L (x, z, a): built at the origin and moved there, turned so the mite's head faces the start. */
  function buildRaft(L) {
    const raft = new THREE.Group();
    raft.add(new THREE.Mesh(dome, world.domeMat));
    // the far tile shares the instance data
    const im = new THREE.InstancedMesh(geo, world.mossMat, heads.length);
    im.instanceMatrix = headIM.instanceMatrix; im.instanceColor = headIM.instanceColor; im.boundingSphere = headIM.boundingSphere;
    raft.add(im);
    // the sparkle: the way on looks like somewhere to go (a tall soft beacon,
    // 60 mm, with motes rising up it: seen whenever the camera looks out over
    // the film)
    const glow = createPortalGlow({ THREE, size: R + 3, height: 9, intensity: 1.6, beam: 60, beamWidth: 3.2, count: 110, pixelHeight });
    raft.add(glow.group);
    // the speck: a Limnozetes mite, ~0.35 mm, glossy red-brown, eight legs
    const mite = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, shell);
    body.scale.set(0.18, 0.11, 0.13);
    body.position.y = 0.1;
    mite.add(body);
    const legs = [];
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(0.1 - k * 0.065, 0.1, s * 0.09);
      leg.userData = { k, s };
      leg.scale.set(1, 0.2, 1);
      mite.add(leg);
      legs.push(leg);
    }
    raft.add(mite);
    const speck = new THREE.Vector3(top.x, topY, top.z);
    // a golden glint on the speck: the creature the portal leads to (and the
    // point the camera pushes into when you go through)
    const glint = createGlint({ THREE, size: 1.8, intensity: 1.3, pixelHeight });
    raft.add(glint.points);
    raft.position.set(L.x, 0, L.z);
    raft.rotation.y = -L.a;
    raft.updateMatrixWorld(true);
    group.add(raft);
    const position = new THREE.Vector3(L.x, topY, L.z);
    // the column of light from the sky: in the landmarks' group (not the raft's), so it shows from much farther
    const column = createPortalColumn({ THREE, height: COLUMN.height, radius: COLUMN.radius, intensity: 1.5 });
    column.setPosition(L.x, 0.2, L.z);
    group.add(column.mesh);
    const r = { i: L.i, raft, glow, glint, mite, body, legs, speck, position, column, shown: true, colShown: true, phase: L.i * 1.7 };
    return r;
  }
  const rafts = PORTALS.map(buildRaft);
  let cur = rafts[0];
  // player rings: a faint loop of light on the film, one per player
  const rings = [];
  const ringGeo = new THREE.RingGeometry(0.95, 1.12, 48).rotateX(-Math.PI / 2);
  function ring(color) {
    const c = new THREE.Color(color);
    const mat = litMaterial({ surface: `s.albedo = vec3(0.0); s.rough = 1.0; s.emit = vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)}) * 0.55;`, shadow: false });
    mat.transparent = false;
    const m = new THREE.Mesh(ringGeo, mat);
    m.visible = false;
    m.renderOrder = 2;
    group.add(m);
    rings.push(m);
    return m;
  }

  const _fw = new THREE.Vector3();
  function stepRaft(r, t, dt, camera, open, burstT) {
    r.glow.setOpen(open);
    r.glow.update(dt, t, camera, burstT);
    const tt = t + r.phase;
    const a = tt * 0.45 + Math.sin(tt * 0.31) * 1.3;
    const rr = 0.55 + 0.25 * Math.sin(tt * 0.23);
    r.speck.set(top.x + Math.cos(a) * rr, topY + 0.05 * Math.sin(tt * 1.7), top.z + Math.sin(a) * rr);
    r.mite.position.copy(r.speck);
    r.glint.setPosition(r.speck.x, r.speck.y + 0.12, r.speck.z);
    r.glint.update(t);
    r.mite.rotation.y = -a - Math.PI / 2;
    for (const leg of r.legs) {
      const { k, s } = leg.userData;
      const ph = tt * 9 + k * 1.6 + (s > 0 ? Math.PI : 0);
      leg.rotation.set(s * (1.9 + 0.15 * Math.sin(ph)), 0, (k - 1.5) * 0.45 + 0.25 * Math.cos(ph));
    }
  }
  const api = {
    group, rafts, ring, rings,
    /**
     * The nearest four columns drawn, for the water's reflection
     * (springtail-surface.js uCol): fills `out` (four Vector4s) with (x, z,
     * radius, strength); strength 0 for none.
     */
    columnLights(out, k = 1) {
      const list = rafts.filter((r) => r.colShown).sort((a, b) => a.d - b.d);
      out.forEach((v, j) => {
        const r = list[j];
        if (!r) { v.w = 0; return; }
        v.set(r.position.x, r.position.z, COLUMN.radius * 1.3, k * (0.45 + 0.55 * r.column.open) * r.column.fade);
      });
      return COLUMN.height;
    },
    /** The light columns drawn now: [{ i, d, open, fade }] (tests). */
    columns() { return rafts.filter((r) => r.colShown).map((r) => ({ i: r.i, d: +r.d.toFixed(1), open: +r.column.open.toFixed(2) })); },
    /** The raft in focus: its glow, the raft's top (world), the mite speck (raft-local). */
    get raft() { return cur.raft; },
    get glow() { return cur.glow; },
    get glint() { return cur.glint; },
    get position() { return cur.position; },
    get speck() { return cur.speck; },
    get focus() { return cur.i; },
    /** Put raft i in focus (the nearest to the players: the outro and the screen light use it). */
    setFocus(i) { cur = rafts[i] || cur; return cur; },
    /**
     * The mite speck for a continuous transition (embed.js "Continuous
     * transitions"): its centre in world space, its heading (atan2(z, x) of
     * its local +x) and its length (mm).
     */
    mite() {
      cur.mite.updateMatrixWorld(true);
      const c = cur.body.getWorldPosition(new THREE.Vector3());
      _fw.set(1, 0, 0).transformDirection(cur.mite.matrixWorld);
      return { c, heading: Math.atan2(_fw.z, _fw.x), len: 0.36 };
    },
    /** (Kept for callers: the rafts are fixed now.) */
    place() {},
    /**
     * Walk each speck about on its capitulum; the sparkles twinkle (open(i):
     * brighter). Rafts farther than RAFT_SHOW from every point in `near`
     * ([{ x, z }]) are hidden and skipped. burstT: the focus raft's burst clock.
     */
    update(t, dt = 0, camera = null, open = () => false, burstT = undefined, near = null) {
      // the light columns: within COLUMN_SHOW of a player, and always the COLUMN_KEEP nearest
      for (const r of rafts) {
        let d = Infinity;
        if (near) for (const p of near) d = Math.min(d, Math.hypot(p.x - r.position.x, p.z - r.position.z));
        r.d = d;
      }
      const keep = near ? rafts.slice().sort((a, b) => a.d - b.d).slice(0, COLUMN_KEEP) : rafts;
      for (const r of rafts) {
        const col = !near || r.d < COLUMN_SHOW || keep.includes(r);
        if (col !== r.colShown) { r.column.mesh.visible = col; r.colShown = col; }
        if (!col) continue;
        r.column.setOpen(typeof open === 'function' ? open(r.i) : open);
        // thinner where a player stands at its foot (the raft and the mite stay clear), and gone in the outro
        let fade = 0.35 + 0.65 * Math.min(1, Math.max(0, (r.d - 12) / 48));
        if (r === cur && burstT !== undefined) fade *= Math.max(0, 1 - burstT * 1.5);
        r.column.setFade(fade);
        r.column.update(dt, t);
      }
      for (const r of rafts) {
        const d = r.d;
        const show = !near || d < RAFT_SHOW || (r === cur && burstT !== undefined);
        if (show !== r.shown) { r.raft.visible = show; r.shown = show; }
        const mite = show && (!near || d < MITE_SHOW || r === cur && burstT !== undefined);
        if (mite !== r.mite.visible) { r.mite.visible = mite; r.glint.points.visible = mite; }
        if (show) stepRaft(r, t, dt, camera, typeof open === 'function' ? open(r.i) : open, r === cur ? burstT : undefined);
      }
    },
  };
  return api;
}
