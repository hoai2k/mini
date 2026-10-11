// Chapters start from places in camp. Each playable chapter has a start
// marker somewhere fitting (the field-trip bus by the camp road, Thalia's
// pine on Half-Blood Hill, the edge of the woods…): a column of gold light
// with the chapter's card floating in it. Walk up and press X / E. The early
// chapters sit near where you arrive; later ones open up further out as the
// story goes on. A chapter you can't play yet shows a grey marker that says
// what to finish first. The Big House chapter map still lists everything.
import * as THREE from 'three/webgpu';
import { CHAPTERS, chapter as chapterDef } from './chapters.js';
import { h } from '../ui/ui.js';

const DIFFS = [[1, 'Mortal'], [2, 'Demigod'], [3, 'Hero'], [4, 'Olympian']];
const texLoader = new THREE.TextureLoader();

export function chapterUnlocked(game, ch) {
  const d = game.save.data;
  if (!ch.ready) return false;
  if (d.unlockAll) return true;
  const list = CHAPTERS.filter((c) => c.ready);
  const i = list.indexOf(ch);
  return i <= 0 || !!d.completed[list[i - 1].id];
}

// A little yellow school bus for the field trip.
function bus() {
  const g = new THREE.Group();
  const m = (c, o = {}) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: o.r ?? 0.6, metalness: o.m ?? 0 });
  const box = (w, hh, d, x, y, z, mat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  const yellow = m(0xf2b81a), black = m(0x1a1a1e), glass = m(0x9ac8e8, { r: 0.1, m: 0.2 });
  box(7, 2.4, 2.6, 0, 1.6, 0, yellow); box(1.6, 1.6, 2.5, 4.2, 1.2, 0, yellow);
  box(6.4, 0.7, 2.62, -0.2, 2.1, 0, glass); box(0.08, 0.8, 2.64, -3.5, 2.1, 0, black);
  box(7.1, 0.18, 2.64, 0, 1.25, 0, black);
  for (const [x, z] of [[-2.4, 1.2], [2.6, 1.2], [-2.4, -1.2], [2.6, -1.2]]) box(1, 1, 0.5, x, 0.5, z, black);
  return g;
}

// Nearest open ground to `want` at about height `y`, with the footprint
// [x0, x1, z0, z1] (relative) flat and clear for three blocks up.
function findSpot(world, want, y, fp) {
  const clear = (x, z) => {
    for (let dx = fp[0]; dx <= fp[1]; dx++) for (let dz = fp[2]; dz <= fp[3]; dz++) {
      const g = world.groundBelow(x + dx + 0.5, z + dz + 0.5, y + 6);
      if (!isFinite(g) || Math.abs(g - y) > 0.6) return false;
      for (let k = 0; k < 3; k++) if (world.solidAt(x + dx + 0.5, g + 0.5 + k, z + dz + 0.5)) return false;
    }
    return true;
  };
  const bx = Math.floor(want.x), bz = Math.floor(want.z);
  for (let r = 0; r <= 16; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    if (clear(bx + dx, bz + dz)) { const gy = world.groundBelow(bx + dx + 0.5, bz + dz + 0.5, y + 6); return new THREE.Vector3(bx + dx + 0.5, gy, bz + dz + 0.5); }
  }
  return want.clone();
}

export function placeQuestMarkers(game, L) {
  const out = [];
  for (const ch of CHAPTERS) {
    if (!ch.ready || !ch.start) continue;
    // camp anchors (woodsEdge, road1..road9 along the Road West): a chapter
    // whose anchor isn't in camp yet gets no marker (the Big House map still
    // starts it)
    const anchor = L[ch.start.at] ?? L.anchors?.[ch.start.at];
    if (!anchor?.isVector3) continue;
    const want = anchor.clone().add(new THREE.Vector3(ch.start.dx ?? 0, 0, ch.start.dz ?? 0));
    const pos = findSpot(game.world, want, anchor.y, ch.start.prop === 'bus' ? [-8, 2, -2, 2] : [-1, 1, -1, 1]);
    const open = chapterUnlocked(game, ch), done = !!game.save.data.completed[ch.id];
    const grp = new THREE.Group(); grp.position.copy(pos);
    const col = new THREE.Color(open ? (done ? 0x7ad8ff : 0xffd84a) : 0x8c96a3);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 7, 12, 1, true).translate(0, 3.5, 0), new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(1.5), transparent: true, opacity: open ? 0.28 : 0.12, depthWrite: false, side: THREE.DoubleSide }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.08, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(2) }));
    ring.position.y = 0.06;
    // the chapter card, floating
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.35), new THREE.MeshBasicNodeMaterial({ color: open ? 0xffffff : 0x666670, side: THREE.DoubleSide, transparent: true }));
    texLoader.load(ch.card, (t) => { t.colorSpace = THREE.SRGBColorSpace; card.material.map = t; card.material.needsUpdate = true; });
    card.position.y = 3.1;
    grp.add(beam, ring, card);
    if (ch.start.prop === 'bus') { const b = bus(); b.position.set(-4.5, 0, 0.5); grp.add(b); }
    game.scene.add(grp); game.hubProps.push(grp);
    if (open) game.lights.attach(grp, col.getHex(), 3, 7, { offsetY: 2 });
    let t = Math.random() * 6;
    game.addUpdater((dt) => { t += dt; card.position.y = 3.1 + Math.sin(t * 1.6) * 0.15; card.rotation.y = game.rig.yaw ?? 0; ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05); return grp.parent != null; });
    const prev = CHAPTERS.filter((c) => c.ready)[CHAPTERS.filter((c) => c.ready).indexOf(ch) - 1];
    game.interactables.push({
      id: 'quest-' + ch.id, pos, radius: 2.6,
      label: open ? `Chapter ${ch.num}: ${ch.title}${done ? ' ✓' : ''}` : `Locked: finish “${prev?.title}” first`,
      action: () => { if (open) openQuestStart(game, ch.id); else game.toast?.(`Finish “${prev?.title}” first`); },
    });
    out.push({ ch, pos, open });
  }
  return out;
}

// The start dialog: card, place, Mist, difficulty, Start.
export function openQuestStart(game, id) {
  const ch = chapterDef(id), d = game.save.data;
  if (game.online?.isGuest) { game.toast?.('The host chooses the chapter'); return; }
  let diff = d.lastDifficulty ?? 1;
  game.paused = true;
  const close = () => { game.ui.close('quest'); game.paused = false; game.last = performance.now(); };
  game.ui.open('quest', (el) => {
    const best = d.completed[ch.id];
    const mist = '☁'.repeat(Math.round(ch.mist * 5)) + '·'.repeat(5 - Math.round(ch.mist * 5));
    el.appendChild(h('div', { class: 'panel quest-start', style: 'width:min(620px,94vw);text-align:center' },
      h('img', { src: ch.card, alt: '', style: 'width:100%;border-radius:8px;border:2px solid #c9963a', onerror: (e) => e.target.remove() }),
      h('h2', {}, `Chapter ${ch.num}: ${ch.title}`),
      h('p', { class: 'hint' }, `${ch.place} · Mist ${mist}${best ? ` · Finished on ${DIFFS[best - 1][1]}` : ''}`),
      h('div', { class: 'row', style: 'justify-content:center;gap:6px;flex-wrap:wrap' }, ...DIFFS.map(([v, label]) => h('button', { class: 'btn small' + (v === diff ? ' primary' : ''), 'aria-pressed': String(v === diff), onclick: () => { diff = v; game.ui.refresh('quest'); } }, label))),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' },
        h('button', { class: 'btn', onclick: close }, 'Not yet'),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { d.lastDifficulty = diff; game.save.write(); close(); game.startChapter(ch.id, diff); } }, 'Begin the quest'))));
  }, { dim: true, onBack: close });
}
