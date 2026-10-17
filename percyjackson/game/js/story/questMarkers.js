// Chapters start from places in camp. Each playable chapter has a start
// marker somewhere fitting (the field-trip bus by the camp road, Thalia's
// pine on Half-Blood Hill, the edge of the woods…): a column of gold light
// with the chapter's card floating in it. Walk up and press A / click. The early
// chapters sit near where you arrive; later ones open up further out as the
// story goes on. A chapter you can't play yet shows a grey marker that says
// what to finish first. The Big House chapter map still lists everything.
import * as THREE from 'three/webgpu';
import { CHAPTERS, chapter as chapterDef, chapterPlayable } from './chapters.js';
import { h } from '../ui/ui.js';
import { openingDone } from './opening.js';
import { B } from '../world/blocks.js';
import { whenArt, artReady } from '../ui/art.js';

const DIFFS = [[1, 'Mortal'], [2, 'Demigod'], [3, 'Hero'], [4, 'Olympian']];
// the chapter cards as textures, made once from the pictures preloaded with the title (ui/art.js)
const cardTex = new Map();
function cardTexture(src, fn) {
  if (cardTex.has(src)) { fn(cardTex.get(src)); return; }
  whenArt(src, (img) => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; cardTex.set(src, t); fn(t); });
}

export function chapterUnlocked(game, ch) {
  const d = game.save.data;
  if (!chapterPlayable(ch)) return false;
  if (d.unlockAll) return true;
  const list = CHAPTERS.filter(chapterPlayable);
  const i = list.indexOf(ch);
  return i <= 0 || !!d.completed[list[i - 1].id];
}

// A little yellow school bus for the field trip, sized to the block world:
// its roof two blocks up and its bonnet one, so a hero can't walk through it
// but can step onto the bonnet and jump onto the roof (a jump rises about
// 1.7 m). Body x -3..3 and bonnet x 3..4.3, 2.4 wide (see busColliders).
function bus() {
  const g = new THREE.Group();
  const m = (c, o = {}) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: o.r ?? 0.6, metalness: o.m ?? 0 });
  const box = (w, hh, d, x, y, z, mat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  const yellow = m(0xf2b81a), black = m(0x1a1a1e), glass = m(0x9ac8e8, { r: 0.1, m: 0.2 });
  box(6, 1.65, 2.4, 0, 1.175, 0, yellow); box(1.3, 0.65, 2.3, 3.65, 0.675, 0, yellow);
  box(5.5, 0.55, 2.42, -0.2, 1.55, 0, glass); box(0.08, 0.6, 2.44, -2.8, 1.55, 0, black);
  box(6.05, 0.14, 2.44, 0, 1.05, 0, black);
  for (const [x, z] of [[-1.9, 1.05], [2.1, 1.05], [-1.9, -1.05], [2.1, -1.05]]) box(0.8, 0.8, 0.45, x, 0.4, z, black);
  return g;
}
const BUS_AT = [-4.6, 0.5];   // the bus's middle from its quest marker
// Invisible solid blocks under the bus: two high under the body, one under
// the bonnet (cells whose middle lies inside its outline).
function busColliders(world, pos) {
  const bx = pos.x + BUS_AT[0], bz = pos.z + BUS_AT[1], y = Math.round(pos.y);
  for (let x = Math.floor(bx - 3); x <= Math.floor(bx + 4.3); x++) for (let z = Math.floor(bz - 1.2); z <= Math.floor(bz + 1.2); z++) {
    const u = x + 0.5 - bx, v = z + 0.5 - bz;
    if (u < -3 || u > 4.3 || Math.abs(v) > 1.2) continue;
    for (let k = 0; k < (u <= 3 ? 2 : 1); k++) if (!world.get(x, y + k, z)) world.set(x, y + k, z, B.barrier);
  }
}

// The ground under (x, z) near height `y` (no more than two blocks above it):
// tree canopies don't count, so a marker by Thalia's pine stands on the
// hillside under the branches, not up in them.
const LEAVES = new Set([B.leaves, B.pine_leaves, B.dead_leaves, B.poplar_leaves]);
function terrainNear(world, x, z, y) {
  const solid = (yy) => { const id = world.get(Math.floor(x), yy, Math.floor(z)); return !!id && !LEAVES.has(id) && world.solidAt(x, yy + 0.5, z); };
  for (let yy = Math.floor(y) + 2; yy >= Math.max(0, y - 16); yy--) if (solid(yy) && !solid(yy + 1) && !solid(yy + 2)) return yy + 1;
  return -Infinity;
}

// Nearest open ground to `want`, at about the height of the ground under it
// (`y` is the anchor's height: `want` can be down a slope from it), with the
// footprint [x0, x1, z0, z1] (relative) clear for three blocks up (six for
// the bus) and flat (a small footprint may be on a gentle slope). margin:
// that many cells round it must be open ground too (the bus once stood
// across a passage, which a solid bus would block).
function findSpot(world, want, y, fp, margin = 0) {
  const ty = terrainNear(world, want.x, want.z, y);
  const base = isFinite(ty) ? ty : y;
  const big = fp[1] - fp[0] > 2, tol = big ? 0.6 : 1, clear = big ? 6 : 3;   // (the bus: flat, and nothing low overhead)
  const spot = (x, z) => {
    const cy = world.groundBelow(x + 0.5, z + 0.5, base + 2.5);
    if (!isFinite(cy) || Math.abs(cy - base) > 2) return null;
    for (let dx = fp[0]; dx <= fp[1]; dx++) for (let dz = fp[2]; dz <= fp[3]; dz++) {
      const g = world.groundBelow(x + dx + 0.5, z + dz + 0.5, cy + 1.5);
      if (!isFinite(g) || Math.abs(g - cy) > tol) return null;
      for (let k = 0; k < clear; k++) if (world.solidAt(x + dx + 0.5, g + 0.5 + k, z + dz + 0.5)) return null;
    }
    for (let dx = fp[0] - margin; dx <= fp[1] + margin; dx++) for (let dz = fp[2] - margin; dz <= fp[3] + margin; dz++) {
      if (dx >= fp[0] && dx <= fp[1] && dz >= fp[2] && dz <= fp[3]) continue;
      const g = world.groundBelow(x + dx + 0.5, z + dz + 0.5, cy + 1.5);
      if (!isFinite(g) || Math.abs(g - cy) > 1.5) return null;
      for (let k = 0; k < 3; k++) if (world.solidAt(x + dx + 0.5, g + 0.5 + k, z + dz + 0.5)) return null;
    }
    return cy;
  };
  const bx = Math.floor(want.x), bz = Math.floor(want.z);
  for (let r = 0; r <= 24; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const cy = spot(bx + dx, bz + dz);
    if (cy != null) return new THREE.Vector3(bx + dx + 0.5, cy, bz + dz + 0.5);
  }
  return margin ? null : want.clone().setY(base);   // (with a margin: null, and the caller tries without)
}

export function placeQuestMarkers(game, L) {
  const out = [];
  for (const ch of CHAPTERS) {
    if (!chapterPlayable(ch) || !ch.start) continue;
    // chapters 1 and 2 are played in the opening (story/opening.js): their markers are for replays
    if ((ch.id === 'lt1' || ch.id === 'lt2') && !game.save.data.completed[ch.id] && !openingDone(game.save.data)) continue;
    // camp anchors (woodsEdge, road1..road9 along the Road West): a chapter
    // whose anchor isn't in camp yet gets no marker (the Big House map still
    // starts it)
    const anchor = L[ch.start.at] ?? L.anchors?.[ch.start.at];
    if (!anchor?.isVector3) continue;
    const want = anchor.clone().add(new THREE.Vector3(ch.start.dx ?? 0, 0, ch.start.dz ?? 0));
    const isBus = ch.start.prop === 'bus';
    const pos = (isBus && findSpot(game.world, want, anchor.y, [-8, 2, -2, 2], 2)) || findSpot(game.world, want, anchor.y, isBus ? [-8, 2, -2, 2] : [-1, 1, -1, 1]);
    const open = chapterUnlocked(game, ch), done = !!game.save.data.completed[ch.id];
    const grp = new THREE.Group(); grp.position.copy(pos);
    const col = new THREE.Color(open ? (done ? 0x7ad8ff : 0xffd84a) : 0x8c96a3);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 7, 12, 1, true).translate(0, 3.5, 0), new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(1.5), transparent: true, opacity: open ? 0.28 : 0.12, depthWrite: false, side: THREE.DoubleSide }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.08, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(2) }));
    ring.position.y = 0.06;
    // the chapter card, floating
    // (shown only with its picture: a missing one leaves the beam and ring)
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.35), new THREE.MeshBasicNodeMaterial({ color: open ? 0xffffff : 0x666670, side: THREE.DoubleSide, transparent: true }));
    card.visible = false;
    cardTexture(ch.card, (t) => { card.material.map = t; card.material.needsUpdate = true; card.visible = true; });
    card.position.y = 3.1;
    grp.add(beam, ring, card);
    if (isBus) { const b = bus(); b.position.set(BUS_AT[0], 0, BUS_AT[1]); grp.add(b); busColliders(game.world, pos); }
    game.scene.add(grp); game.hubProps.push(grp);
    if (open) game.lights.attach(grp, col.getHex(), 3, 7, { offsetY: 2 });
    let t = Math.random() * 6;
    game.addUpdater((dt) => { t += dt; card.position.y = 3.1 + Math.sin(t * 1.6) * 0.15; card.rotation.y = game.rig.yaw ?? 0; ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05); return grp.parent != null; });
    const list = CHAPTERS.filter(chapterPlayable), prev = list[list.indexOf(ch) - 1];
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
      artReady(ch.card) ? h('img', { src: ch.card, alt: '', style: 'width:100%;border-radius:8px;border:2px solid #c9963a' }) : null,
      h('h2', {}, `Chapter ${ch.num}: ${ch.title}`),
      h('p', { class: 'hint' }, `${ch.place} · Mist ${mist}${best ? ` · Finished on ${DIFFS[best - 1][1]}` : ''}`),
      h('div', { class: 'row', style: 'justify-content:center;gap:6px;flex-wrap:wrap' }, ...DIFFS.map(([v, label]) => h('button', { class: 'btn small' + (v === diff ? ' primary' : ''), 'aria-pressed': String(v === diff), onclick: () => { diff = v; game.ui.refresh('quest'); } }, label))),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' },
        h('button', { class: 'btn', onclick: close }, 'Not yet'),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { d.lastDifficulty = diff; game.save.write(); close(); game.startChapter(ch.id, diff); } }, 'Begin the quest'))));
  }, { dim: true, onBack: close });
}
