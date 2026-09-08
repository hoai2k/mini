/** Stand-in structures: the things Hopper hops between.
 * Every builder returns a Group with userData.standIn {kind:'structure', ...}
 * and a userData.landings list — the flat tops a route can use, as
 * {y, halfX, halfZ, x, z} in local metres — so the level tools can place
 * jumps against a stand-in before the modelled building exists.
 */
import { GEOMETRY as G, mirrored, part, socket, standIn, toon } from './kit.js';
import { SURFACE } from './palette.js';

const landing = (g, y, halfX, halfZ, x = 0, z = 0, label = 'roof') => {
  (g.userData.landings ||= []).push({ y, halfX, halfZ, x, z, label });
  socket(g, `Landing.${g.userData.landings.length - 1}`, [x, y, z]);
};
const meta = (id, size, region, extra = {}) => ({ kind: 'structure', region, size, ...extra });

/* ---------- Sunseed Fields ---------- */
function terraceStep({ w = 60, d = 40, h = 6, tiers = 3 } = {}) {
  const g = standIn('structure.fields.terraceStep', meta('terraceStep', [w, h * tiers, d], 'fields'));
  for (let i = 0; i < tiers; i++) {
    const tw = w - i * (w / tiers) * 0.6;
    part(g, G.box(tw, h, d - i * (d / tiers) * 0.4), toon(SURFACE.soil, { texture: 'terrace', repeat: 4 }), { name: `Tier${i}`, position: [0, h * (i + 0.5), 0] });
    part(g, G.box(tw, 0.6, d - i * (d / tiers) * 0.4), toon(SURFACE.grass, { texture: 'grass', repeat: 6 }), { name: `Top${i}`, position: [0, h * (i + 1) + 0.3, 0], outline: false });
    landing(g, h * (i + 1) + 0.6, tw / 2, (d - i * (d / tiers) * 0.4) / 2, 0, 0, `tier${i}`);
  }
  return g;
}
function farmhouse({ w = 14, d = 18, h = 7 } = {}) {
  const g = standIn('structure.fields.farmhouse', meta('farmhouse', [w, h + 5, d], 'fields'));
  part(g, G.box(w, h, d), toon(SURFACE.ivory, { texture: 'ivory', repeat: 2 }), { name: 'Walls', position: [0, h / 2, 0] });
  part(g, G.cylinder(0, w * 0.75, 5, 4), toon('#a0402e'), { name: 'Roof', position: [0, h + 2.5, 0], rotation: [0, Math.PI / 4, 0], scale: [1, 1, d / w] });
  part(g, G.box(1.6, 3, 1.6), toon(SURFACE.slate), { name: 'Chimney', position: [w * 0.3, h + 3, -d * 0.2] });
  landing(g, h + 5, w * 0.15, d * 0.15, 0, 0, 'ridge');
  return g;
}
function silo({ r = 5, h = 26 } = {}) {
  const g = standIn('structure.fields.silo', meta('silo', [r * 2, h + r, r * 2], 'fields'));
  part(g, G.cylinder(r, r, h, 14), toon(SURFACE.concrete, { texture: 'ivory', repeat: 3 }), { name: 'Drum', position: [0, h / 2, 0] });
  part(g, G.cone(r + 0.4, r, 14), toon('#7d3b32'), { name: 'Cap', position: [0, h + r / 2, 0] });
  landing(g, h, r * 0.5, r * 0.5, 0, 0, 'cap');
  return g;
}
function windbreak({ count = 6, spacing = 9, height = 22 } = {}) {
  const g = standIn('structure.fields.windbreak', meta('windbreak', [spacing * count, height, 8], 'fields'));
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * spacing;
    part(g, G.cylinder(0.6, 0.9, height * 0.35, 6), toon(SURFACE.wood), { name: `Trunk${i}`, position: [x, height * 0.175, 0] });
    part(g, G.cone(3.2, height * 0.7, 7), toon(SURFACE.grassDeep, { texture: 'grass' }), { name: `Crown${i}`, position: [x, height * 0.35 + height * 0.35, 0] });
  }
  return g;
}
function seedPod({ r = 9 } = {}) {
  const g = standIn('structure.fields.seedPod', meta('seedPod', [r * 2.2, r * 2.4, r * 2.2], 'fields', { hazard: 'spawner' }));
  const pod = part(g, G.sphere(r, 14), toon('#1a1520', { texture: 'shadow' }), { name: 'Pod', position: [0, r * 0.9, 0], rotation: [0.5, 0, 0.3], scale: [1, 1.3, 1] });
  for (let i = 0; i < 4; i++) part(pod, G.cone(1.5, r * 0.9, 5), toon('#8a4bd8', { emissive: '#8a4bd8', emissiveIntensity: 0.4 }), { name: `Spine${i}`, position: [Math.cos(i * 1.57) * r * 0.8, r * 0.4, Math.sin(i * 1.57) * r * 0.8], rotation: [Math.sin(i * 1.57), 0, -Math.cos(i * 1.57)] });
  socket(g, 'Spawn', [0, r * 1.2, r * 0.7]);
  return g;
}

/* ---------- Crownline City ---------- */
function ivoryTower({ w = 30, d = 30, h = 120, bands = 5, deckSize = 0.6 } = {}) {
  const g = standIn('structure.city.ivoryTower', meta('ivoryTower', [w, h + 10, d], 'city'));
  const bandH = h / bands;
  for (let b = 0; b < bands; b++) {
    const k = 1 - b * 0.06;
    part(g, G.box(w * k, bandH * 0.7, d * k), toon(SURFACE.ivory, { texture: 'ivory', repeat: 3 }), { name: `Band${b}`, position: [0, bandH * b + bandH * 0.35, 0] });
    part(g, G.box(w * k * 0.96, bandH * 0.3, d * k * 0.96), toon(SURFACE.tealGlass, { texture: 'glass', repeat: 2 }), { name: `Glass${b}`, position: [0, bandH * b + bandH * 0.85, 0], outline: false });
  }
  const top = h,
    dk = 1 - bands * 0.06;
  part(g, G.box(w * dk, 2, d * dk), toon(SURFACE.ivoryShade), { name: 'RoofDeck', position: [0, top + 1, 0] });
  part(g, G.cylinder(1, 1.4, 10, 8), toon(SURFACE.slate), { name: 'Mast', position: [0, top + 7, 0] });
  landing(g, top + 2, (w * dk) / 2 * deckSize, (d * dk) / 2 * deckSize, 0, 0, 'roof');
  landing(g, bandH * 0.7, (w - w * 0.94) / 2 + w * 0.47, d * 0.02 + d * 0.47, 0, 0, 'ledge0');
  return g;
}
function roofDeck({ w = 40, d = 26, h = 40 } = {}) {
  const g = standIn('structure.city.roofDeck', meta('roofDeck', [w, h + 4, d], 'city'));
  part(g, G.box(w, h, d), toon(SURFACE.ivory, { texture: 'ivory', repeat: 2 }), { name: 'Block', position: [0, h / 2, 0] });
  part(g, G.box(w * 1.05, 1.2, d * 1.05), toon(SURFACE.ivoryShade), { name: 'Parapet', position: [0, h + 0.6, 0] });
  for (let i = 0; i < 3; i++) part(g, G.box(4, 2.5, 4), toon(SURFACE.slate), { name: `Vent${i}`, position: [-w * 0.3 + i * w * 0.3, h + 2.4, d * 0.3] });
  landing(g, h + 1.2, w * 0.5, d * 0.5, 0, 0, 'roof');
  return g;
}
function railSpan({ length = 160, height = 30, piers = 4 } = {}) {
  const g = standIn('structure.city.railSpan', meta('railSpan', [length, height + 4, 12], 'city', { moving: 'train' }));
  part(g, G.box(length, 2.4, 10), toon(SURFACE.concrete, { texture: 'ivory', repeat: 6 }), { name: 'Deck', position: [0, height, 0] });
  for (let i = 0; i < piers; i++) part(g, G.box(6, height, 6), toon(SURFACE.ivoryShade), { name: `Pier${i}`, position: [(i - (piers - 1) / 2) * (length / piers), height / 2, 0] });
  mirrored((s) => part(g, G.box(length, 0.3, 0.3), toon(SURFACE.slate), { name: `Rail.${s > 0 ? 'L' : 'R'}`, position: [0, height + 1.4, s * 2.2], outline: false }));
  socket(g, 'TrackStart', [-length / 2, height + 1.2, 0]);
  socket(g, 'TrackEnd', [length / 2, height + 1.2, 0]);
  landing(g, height + 1.2, length / 2, 5, 0, 0, 'deck');
  return g;
}
function trainCar({ length = 22 } = {}) {
  const g = standIn('structure.city.trainCar', meta('trainCar', [length, 6, 5], 'city', { moving: true }));
  part(g, G.capsule(2.4, length - 4.8, 6), toon('#e9e2d0'), { name: 'Hull', position: [0, 3, 0], rotation: [0, 0, Math.PI / 2] });
  part(g, G.box(length * 0.9, 1.0, 5.2), toon('#c8352b'), { name: 'Stripe', position: [0, 3.2, 0], outline: false });
  part(g, G.box(length * 0.85, 1.1, 5.1), toon(SURFACE.tealGlass, { texture: 'glass', repeat: 4 }), { name: 'Windows', position: [0, 4.2, 0], outline: false });
  landing(g, 5.4, length * 0.4, 1.6, 0, 0, 'roof');
  return g;
}
function constructionCrown({ w = 34, h = 90, floors = 6 } = {}) {
  const g = standIn('structure.city.constructionCrown', meta('constructionCrown', [w + 30, h + 40, w], 'city'));
  const fh = h / floors;
  for (let f = 0; f < floors; f++) {
    part(g, G.box(w, 1.2, w), toon(SURFACE.concrete), { name: `Slab${f}`, position: [0, fh * (f + 1), 0] });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, G.box(1.4, fh, 1.4), toon(SURFACE.iron, { texture: 'iron' }), { name: `Column${f}_${x}_${z}`, position: [x * w * 0.45, fh * f + fh / 2, z * w * 0.45] });
    landing(g, fh * (f + 1) + 0.6, w * 0.5, w * 0.5, 0, 0, `floor${f}`);
  }
  const crane = socket(g, 'Crane', [w * 0.6, h, 0]);
  part(crane, G.box(3, 40, 3), toon('#d9a33a', { texture: 'iron' }), { name: 'CraneMast', position: [0, 20, 0] });
  part(crane, G.box(60, 2.5, 2.5), toon('#d9a33a'), { name: 'CraneJib', position: [-20, 40, 0] });
  landing(g, h + 41.5, 30, 1.2, w * 0.6 - 20, 0, 'jib');
  return g;
}
function billboard({ w = 24, h = 12, height = 30 } = {}) {
  const g = standIn('structure.city.billboard', meta('billboard', [w, height + h, 3], 'city', { crumble: true }));
  part(g, G.box(2, height, 2), toon(SURFACE.iron, { texture: 'iron' }), { name: 'Post', position: [0, height / 2, 0] });
  part(g, G.box(w, h, 1), toon('#f2e4bd'), { name: 'Board', position: [0, height + h / 2, 0] });
  part(g, G.box(w * 0.8, h * 0.5, 0.2), toon('#c8352b'), { name: 'Print', position: [0, height + h / 2, 0.6], outline: false });
  landing(g, height + h, w / 2, 0.5, 0, 0, 'boardTop');
  return g;
}
function observatoryDome({ r = 22, base = 30 } = {}) {
  const g = standIn('structure.city.observatoryDome', meta('observatoryDome', [r * 2.4, base + r, r * 2.4], 'city'));
  part(g, G.cylinder(r * 1.1, r * 1.2, base, 16), toon(SURFACE.ivory, { texture: 'ivory', repeat: 4 }), { name: 'Drum', position: [0, base / 2, 0] });
  part(g, G.sphere(r, 20), toon(SURFACE.tealGlass, { texture: 'glass', repeat: 3 }), { name: 'Dome', position: [0, base, 0] });
  landing(g, base + r * 0.95, r * 0.25, r * 0.25, 0, 0, 'crown');
  landing(g, base, r * 1.1, r * 1.1, 0, 0, 'ring');
  return g;
}

/* ---------- Thunderhead Range ---------- */
function cragColumn({ r = 14, h = 90, tilt = 0.08 } = {}) {
  const g = standIn('structure.mountains.cragColumn', meta('cragColumn', [r * 2.6, h, r * 2.6], 'mountains'));
  for (let i = 0; i < 3; i++) part(g, G.cylinder(r * (0.75 + i * 0.1), r * (1.1 + i * 0.15), h / 3, 7), toon(SURFACE.slate, { texture: 'rock', repeat: 3 }), { name: `Block${i}`, position: [i * tilt * h * 0.3, (h / 3) * (2 - i) + h / 6, 0], rotation: [0, i * 0.4, tilt] });
  part(g, G.cylinder(r * 0.7, r * 0.75, 1, 7), toon(SURFACE.grassDeep, { texture: 'grass' }), { name: 'Cap', position: [tilt * h * 0.3 * 0, h + 0.5, 0], outline: false });
  landing(g, h + 1, r * 0.55, r * 0.55, 0, 0, 'top');
  return g;
}
function ledgeShelf({ w = 50, d = 18, thick = 8 } = {}) {
  const g = standIn('structure.mountains.ledgeShelf', meta('ledgeShelf', [w, thick, d], 'mountains'));
  part(g, G.box(w, thick, d), toon(SURFACE.slate, { texture: 'rock', repeat: 3 }), { name: 'Shelf', position: [0, -thick / 2, 0] });
  part(g, G.box(w * 0.9, 0.5, d * 0.9), toon(SURFACE.grassDeep, { texture: 'grass', repeat: 2 }), { name: 'Turf', position: [0, 0.25, 0], outline: false });
  landing(g, 0.5, w / 2, d / 2, 0, 0, 'shelf');
  return g;
}
function ravineBridge({ length = 120, width = 10, drop = 40 } = {}) {
  const g = standIn('structure.mountains.ravineBridge', meta('ravineBridge', [length, drop + 4, width], 'mountains'));
  part(g, G.box(length, 3, width), toon(SURFACE.wood), { name: 'Deck', position: [0, 0, 0] });
  for (let i = 0; i < 5; i++) part(g, G.cylinder(0.8, 1.2, drop, 6), toon(SURFACE.slate, { texture: 'rock' }), { name: `Pylon${i}`, position: [(i - 2) * (length / 5), -drop / 2, 0] });
  landing(g, 1.5, length / 2, width / 2, 0, 0, 'deck');
  return g;
}
function transmitterMast({ h = 180, base = 40 } = {}) {
  const g = standIn('structure.mountains.transmitterMast', meta('transmitterMast', [base * 1.2, h + 20, base * 1.2], 'mountains', { landmark: true }));
  part(g, G.cylinder(base * 0.35, base * 0.6, 30, 8), toon(SURFACE.slate, { texture: 'rock', repeat: 3 }), { name: 'Plinth', position: [0, 15, 0] });
  for (let i = 0; i < 3; i++) part(g, G.cylinder(2 - i * 0.5, 3 - i * 0.6, h / 3, 6), toon(SURFACE.iron, { texture: 'iron', repeat: 2 }), { name: `Mast${i}`, position: [0, 30 + (h / 3) * i + h / 6, 0] });
  for (let i = 0; i < 3; i++) part(g, G.torus(base * 0.4 - i * 4, 0.8, 6, 20), toon('#c8352b', { emissive: '#c8352b', emissiveIntensity: 0.4 }), { name: `Ring${i}`, position: [0, 30 + h * (0.5 + i * 0.18), 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  part(g, G.sphere(4, 10), toon('#fff1c2', { emissive: '#ffd27a', emissiveIntensity: 1 }), { name: 'Beacon', position: [0, h + 32, 0], outline: false });
  socket(g, 'Beacon', [0, h + 32, 0]);
  landing(g, 30, base * 0.35, base * 0.35, 0, 0, 'plinth');
  return g;
}
function windsock({ h = 12 } = {}) {
  const g = standIn('structure.mountains.windsock', meta('windsock', [8, h, 2], 'mountains', { signal: 'wind' }));
  part(g, G.cylinder(0.15, 0.2, h, 6), toon(SURFACE.iron), { name: 'Pole', position: [0, h / 2, 0] });
  const sock = part(g, G.cone(1.2, 6, 8), toon('#ffb454'), { name: 'Sock', position: [3.5, h - 0.5, 0], rotation: [0, 0, Math.PI / 2 + 0.2] });
  g.userData.animate = (t) => (sock.rotation.z = Math.PI / 2 + 0.2 + Math.sin(t * 2.3) * 0.15);
  return g;
}

/* ---------- Cinder Foundries ---------- */
function furnaceTower({ r = 16, h = 80 } = {}) {
  const g = standIn('structure.foundry.furnaceTower', meta('furnaceTower', [r * 2.6, h + 30, r * 2.6], 'foundry'));
  part(g, G.cylinder(r, r * 1.15, h, 14), toon(SURFACE.ironWarm, { texture: 'iron', repeat: 4 }), { name: 'Drum', position: [0, h / 2, 0] });
  part(g, G.cylinder(r * 0.4, r * 0.5, 30, 10), toon(SURFACE.rust, { texture: 'rust', repeat: 2 }), { name: 'Stack', position: [r * 0.4, h + 15, 0] });
  part(g, G.box(r * 0.8, r * 0.6, 2), toon(SURFACE.lava, { emissive: SURFACE.lava, emissiveIntensity: 1.1 }), { name: 'FurnaceDoor', position: [0, r * 0.5, r * 1.12], outline: false });
  for (let i = 0; i < 3; i++) part(g, G.torus(r * 1.18, 0.8, 6, 24), toon(SURFACE.rust), { name: `Band${i}`, position: [0, h * (0.25 + i * 0.3), 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  landing(g, h, r * 0.55, r * 0.55, -r * 0.3, 0, 'roof');
  landing(g, h * 0.55 + 0.8, r * 1.2, 2, 0, r * 1.1, 'catwalk');
  part(g, G.box(r * 2.4, 0.6, 4), toon(SURFACE.iron), { name: 'Catwalk', position: [0, h * 0.55, r * 1.1], outline: false });
  return g;
}
function conveyorSpan({ length = 90, width = 8, height = 20 } = {}) {
  const g = standIn('structure.foundry.conveyorSpan', meta('conveyorSpan', [length, height + 3, width], 'foundry', { conveyor: true }));
  part(g, G.box(length, 1.5, width), toon(SURFACE.iron, { texture: 'iron', repeat: 8 }), { name: 'Belt', position: [0, height, 0] });
  for (let i = 0; i < Math.floor(length / 30) + 1; i++) part(g, G.box(2, height, 2), toon(SURFACE.rust, { texture: 'rust' }), { name: `Leg${i}`, position: [(i - Math.floor(length / 30) / 2) * 30, height / 2, 0] });
  for (let i = 0; i < 6; i++) part(g, G.cylinder(1.2, 1.2, width + 1, 8), toon(SURFACE.slate), { name: `Roller${i}`, position: [(i - 2.5) * (length / 6), height + 0.9, 0], rotation: [0, 0, Math.PI / 2], outline: false });
  socket(g, 'BeltStart', [-length / 2, height + 1, 0]);
  socket(g, 'BeltEnd', [length / 2, height + 1, 0]);
  landing(g, height + 1.6, length / 2, width / 2, 0, 0, 'belt');
  return g;
}
function chimney({ r = 5, h = 110 } = {}) {
  const g = standIn('structure.foundry.chimney', meta('chimney', [r * 2.4, h, r * 2.4], 'foundry'));
  part(g, G.cylinder(r * 0.8, r * 1.2, h, 12), toon(SURFACE.rust, { texture: 'rust', repeat: 3 }), { name: 'Stack', position: [0, h / 2, 0] });
  part(g, G.torus(r * 0.9, 0.5, 6, 16), toon(SURFACE.iron), { name: 'Lip', position: [0, h, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  landing(g, h, r * 0.7, r * 0.7, 0, 0, 'lip');
  return g;
}
function slagBarge({ length = 40, width = 16 } = {}) {
  const g = standIn('structure.foundry.slagBarge', meta('slagBarge', [length, 8, width], 'foundry', { moving: 'barge' }));
  part(g, G.box(length, 5, width), toon(SURFACE.iron, { texture: 'iron', repeat: 4 }), { name: 'Hull', position: [0, 2.5, 0] });
  part(g, G.box(length * 0.8, 1, width * 0.7), toon(SURFACE.lava, { emissive: SURFACE.lava, emissiveIntensity: 1 }), { name: 'Slag', position: [0, 5.2, 0], outline: false });
  part(g, G.box(length * 0.9, 0.4, 2), toon(SURFACE.slate), { name: 'GunwaleA', position: [0, 5.5, width * 0.45], outline: false });
  part(g, G.box(length * 0.9, 0.4, 2), toon(SURFACE.slate), { name: 'GunwaleB', position: [0, 5.5, -width * 0.45], outline: false });
  landing(g, 5.7, length * 0.45, 1, 0, width * 0.45, 'gunwale');
  return g;
}
function stampingPress({ w = 20, h = 40 } = {}) {
  const g = standIn('structure.foundry.stampingPress', meta('stampingPress', [w * 1.4, h + 4, w], 'foundry', { hazard: 'press' }));
  part(g, G.box(w * 1.4, 4, w), toon(SURFACE.iron, { texture: 'iron', repeat: 3 }), { name: 'Anvil', position: [0, 2, 0] });
  mirrored((s) => part(g, G.box(2.5, h, 2.5), toon(SURFACE.rust, { texture: 'rust' }), { name: `Column.${s > 0 ? 'L' : 'R'}`, position: [s * w * 0.6, h / 2, 0] }));
  const ram = part(g, G.box(w, 6, w * 0.8), toon(SURFACE.ironWarm, { texture: 'iron' }), { name: 'Ram', position: [0, h * 0.7, 0] });
  part(g, G.box(w * 1.5, 3, 4), toon(SURFACE.iron), { name: 'Head', position: [0, h + 1.5, 0] });
  socket(ram, 'Strike', [0, -3, 0]);
  landing(g, 4, w * 0.7, w * 0.5, 0, 0, 'anvil');
  landing(g, h + 3, w * 0.75, 2, 0, 0, 'head');
  g.userData.animate = (t) => (ram.position.y = h * 0.7 - Math.max(0, Math.sin(t * 1.1)) ** 8 * (h * 0.7 - 7));
  return g;
}

/* ---------- Tempest Docks ---------- */
function craneBoom({ h = 90, reach = 80 } = {}) {
  const g = standIn('structure.harbor.craneBoom', meta('craneBoom', [reach + 10, h + 10, 12], 'harbor', { moving: 'boom' }));
  part(g, G.box(8, h, 8), toon(SURFACE.wetSteel, { texture: 'wetSteel', repeat: 4 }), { name: 'Mast', position: [0, h / 2, 0] });
  const boom = socket(g, 'BoomPivot', [0, h, 0]);
  part(boom, G.box(reach, 4, 5), toon(SURFACE.rust, { texture: 'rust', repeat: 3 }), { name: 'Boom', position: [reach / 2 - 4, 2, 0] });
  part(boom, G.cylinder(0.15, 0.15, 30, 5), toon(SURFACE.slate), { name: 'Cable', position: [reach - 8, -15, 0], outline: false });
  const hook = part(boom, G.box(14, 8, 10), toon('#a0402e', { texture: 'rust' }), { name: 'HookedContainer', position: [reach - 8, -34, 0] });
  socket(hook, 'Landing.Hook', [0, 4, 0]);
  landing(g, h + 4, reach / 2, 2.5, reach / 2 - 4, 0, 'boom');
  landing(g, h - 30, 7, 5, reach - 8, 0, 'hookedContainer');
  g.userData.animate = (t) => (boom.rotation.y = Math.sin(t * 0.25) * 0.6);
  return g;
}
function containerStack({ rows = 3, cols = 4, w = 12, h = 6, d = 5 } = {}) {
  const g = standIn('structure.harbor.containerStack', meta('containerStack', [cols * w, rows * h, d * 2], 'harbor'));
  const colours = ['#a0402e', '#2f5f9a', '#3f8a3c', '#c99a3c', '#5c626d'];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols - (r % 2); c++)
      part(g, G.box(w - 0.4, h - 0.3, d * 2 - 0.4), toon(colours[(r * cols + c) % colours.length], { texture: 'iron', repeat: 2 }), { name: `Box${r}_${c}`, position: [(c - (cols - 1 - (r % 2)) / 2) * w, r * h + h / 2, 0] });
  for (let r = 0; r < rows; r++) landing(g, (r + 1) * h - 0.15, (cols - (r % 2)) * w * 0.5, d, 0, 0, `row${r}`);
  return g;
}
function freighter({ length = 220, width = 40, height = 20 } = {}) {
  const g = standIn('structure.harbor.freighter', meta('freighter', [length, height + 40, width], 'harbor'));
  part(g, G.box(length, height, width), toon(SURFACE.wetSteel, { texture: 'wetSteel', repeat: 8 }), { name: 'Hull', position: [0, height / 2, 0] });
  part(g, G.box(length * 0.2, 30, width * 0.8), toon(SURFACE.ivory, { texture: 'ivory', repeat: 3 }), { name: 'Bridge', position: [-length * 0.35, height + 15, 0] });
  part(g, G.cylinder(3, 3.5, 14, 10), toon(SURFACE.rust), { name: 'Funnel', position: [-length * 0.35, height + 37, 0] });
  for (let i = 0; i < 4; i++) part(g, G.box(length * 0.12, 12, width * 0.7), toon(['#a0402e', '#2f5f9a', '#c99a3c', '#3f8a3c'][i], { texture: 'iron', repeat: 2 }), { name: `Cargo${i}`, position: [-length * 0.1 + i * length * 0.15, height + 6, 0] });
  landing(g, height, length / 2, width / 2, 0, 0, 'deck');
  landing(g, height + 30, length * 0.1, width * 0.4, -length * 0.35, 0, 'bridgeRoof');
  for (let i = 0; i < 4; i++) landing(g, height + 12, length * 0.06, width * 0.35, -length * 0.1 + i * length * 0.15, 0, `cargo${i}`);
  return g;
}
function gantryTower({ w = 24, h = 130 } = {}) {
  const g = standIn('structure.harbor.gantryTower', meta('gantryTower', [w * 2.5, h + 6, w], 'harbor'));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, G.box(2, h, 2), toon(SURFACE.wetSteel, { texture: 'wetSteel', repeat: 6 }), { name: `Leg${x}_${z}`, position: [x * w * 0.45, h / 2, z * w * 0.45] });
  for (let f = 1; f <= 4; f++) {
    part(g, G.box(w, 1, w), toon(SURFACE.iron, { texture: 'iron', repeat: 3 }), { name: `Deck${f}`, position: [0, (h / 4) * f, 0] });
    landing(g, (h / 4) * f + 0.5, w / 2, w / 2, 0, 0, `deck${f}`);
  }
  part(g, G.box(w * 2.5, 3, 6), toon(SURFACE.rust, { texture: 'rust', repeat: 3 }), { name: 'Bridge', position: [0, h + 1.5, 0] });
  landing(g, h + 3, w * 1.25, 3, 0, 0, 'bridge');
  return g;
}
function breakwater({ length = 200, height = 10 } = {}) {
  const g = standIn('structure.harbor.breakwater', meta('breakwater', [length, height, 24], 'harbor'));
  part(g, G.box(length, height, 24), toon(SURFACE.concrete, { texture: 'rock', repeat: 6 }), { name: 'Wall', position: [0, height / 2, 0] });
  for (let i = 0; i < 6; i++) part(g, G.box(2, 4, 2), toon(SURFACE.rust), { name: `Bollard${i}`, position: [(i - 2.5) * (length / 6), height + 2, 8] });
  landing(g, height, length / 2, 12, 0, 0, 'top');
  return g;
}

/* ---------- Skyhook Works ---------- */
function launchRing({ r = 60, tube = 6, height = 200 } = {}) {
  const g = standIn('structure.launchworks.launchRing', meta('launchRing', [r * 2 + tube * 2, height + tube, r * 2 + tube * 2], 'launchworks', { landmark: true }));
  part(g, G.torus(r, tube, 10, 36), toon(SURFACE.rust, { texture: 'rust', repeat: 6 }), { name: 'Ring', position: [0, height, 0], rotation: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 8; i++) part(g, G.box(4, 3, 4), toon('#ffd38c', { emissive: '#ffd38c', emissiveIntensity: 0.8 }), { name: `Lamp${i}`, position: [Math.cos((i / 8) * Math.PI * 2) * r, height + tube, Math.sin((i / 8) * Math.PI * 2) * r], outline: false });
  for (let i = 0; i < 4; i++) part(g, G.box(5, height, 5), toon(SURFACE.iron, { texture: 'iron', repeat: 10 }), { name: `Strut${i}`, position: [Math.cos((i / 4) * Math.PI * 2 + 0.4) * r, height / 2, Math.sin((i / 4) * Math.PI * 2 + 0.4) * r] });
  for (let i = 0; i < 8; i++) landing(g, height + tube, 4, 4, Math.cos((i / 8) * Math.PI * 2) * r, Math.sin((i / 8) * Math.PI * 2) * r, `ring${i}`);
  return g;
}
function rocket({ r = 9, h = 160 } = {}) {
  const g = standIn('structure.launchworks.rocket', meta('rocket', [r * 3, h, r * 3], 'launchworks'));
  part(g, G.cylinder(r, r, h * 0.8, 14), toon(SURFACE.ivory, { texture: 'ivory', repeat: 6 }), { name: 'Stage', position: [0, h * 0.4, 0] });
  part(g, G.cone(r, h * 0.2, 14), toon('#c8352b'), { name: 'Nose', position: [0, h * 0.9, 0] });
  for (let i = 0; i < 4; i++) part(g, G.box(1.5, h * 0.18, r * 1.2), toon('#c8352b'), { name: `Fin${i}`, position: [Math.cos((i / 4) * Math.PI * 2) * r, h * 0.09, Math.sin((i / 4) * Math.PI * 2) * r], rotation: [0, -(i / 4) * Math.PI * 2, 0] });
  part(g, G.box(4, h * 0.8, 6), toon(SURFACE.iron, { texture: 'iron', repeat: 8 }), { name: 'Umbilical', position: [r + 2, h * 0.4, 0] });
  for (let i = 1; i <= 4; i++) {
    part(g, G.box(12, 0.8, 8), toon(SURFACE.rust), { name: `Arm${i}`, position: [r + 6, h * 0.16 * i, 0], outline: false });
    landing(g, h * 0.16 * i + 0.4, 6, 4, r + 6, 0, `arm${i}`);
  }
  return g;
}
function pistonStair({ count = 5, w = 12, rise = 14 } = {}) {
  const g = standIn('structure.launchworks.pistonStair', meta('pistonStair', [count * w, rise * count + 10, w], 'launchworks', { moving: 'piston' }));
  const heads = [];
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * w;
    part(g, G.cylinder(w * 0.3, w * 0.35, rise * count, 10), toon(SURFACE.iron, { texture: 'iron', repeat: 5 }), { name: `Cylinder${i}`, position: [x, (rise * count) / 2 - 4, 0] });
    const head = part(g, G.cylinder(w * 0.42, w * 0.42, 2, 10), toon('#d9a33a', { texture: 'iron' }), { name: `Head${i}`, position: [x, rise * (i + 1), 0] });
    heads.push(head);
    landing(g, rise * (i + 1) + 1, w * 0.4, w * 0.4, x, 0, `piston${i}`);
  }
  g.userData.animate = (t) => heads.forEach((h, i) => (h.position.y = rise * (i + 1) + Math.sin(t * 0.7 + i * 1.2) * 3));
  return g;
}
function exhaustShaft({ r = 30, depth = 120 } = {}) {
  const g = standIn('structure.launchworks.exhaustShaft', meta('exhaustShaft', [r * 2.4, depth, r * 2.4], 'launchworks', { descent: true }));
  part(g, G.cylinder(r * 1.2, r * 1.2, depth, 20, 1, true), toon(SURFACE.iron, { texture: 'iron', repeat: 8 }), { name: 'Wall', position: [0, -depth / 2, 0] });
  for (let i = 1; i <= 4; i++) {
    const a = i * 1.7;
    part(g, G.box(r * 0.8, 1.2, 10), toon(SURFACE.rust, { texture: 'rust' }), { name: `Baffle${i}`, position: [Math.cos(a) * r * 0.75, -depth * (i / 5), Math.sin(a) * r * 0.75], rotation: [0, -a, 0] });
    landing(g, -depth * (i / 5) + 0.6, r * 0.4, 5, Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75, `baffle${i}`);
  }
  part(g, G.cylinder(r * 0.5, r * 0.5, 2, 16), toon(SURFACE.lava, { emissive: SURFACE.lava, emissiveIntensity: 0.6 }), { name: 'Vent', position: [0, -depth, 0], outline: false });
  socket(g, 'Updraft', [0, -depth + 2, 0]);
  return g;
}
function gantryElevator({ h = 150, w = 16 } = {}) {
  const g = standIn('structure.launchworks.gantryElevator', meta('gantryElevator', [w * 2, h, w], 'launchworks', { moving: 'lift' }));
  part(g, G.box(4, h, 4), toon(SURFACE.iron, { texture: 'iron', repeat: 10 }), { name: 'RailA', position: [-w * 0.5, h / 2, 0] });
  part(g, G.box(4, h, 4), toon(SURFACE.iron, { texture: 'iron', repeat: 10 }), { name: 'RailB', position: [w * 0.5, h / 2, 0] });
  const cage = part(g, G.box(w, 1.5, w), toon('#d9a33a', { texture: 'iron' }), { name: 'Cage', position: [0, 10, 0] });
  part(cage, G.box(w, 6, 0.4), toon(SURFACE.rust), { name: 'CageRail', position: [0, 3, -w * 0.5], outline: false });
  socket(g, 'LiftBottom', [0, 10, 0]);
  socket(g, 'LiftTop', [0, h - 5, 0]);
  landing(g, 11, w / 2, w / 2, 0, 0, 'cage');
  g.userData.animate = (t) => (cage.position.y = 10 + ((Math.sin(t * 0.15) + 1) / 2) * (h - 15));
  return g;
}

/* ---------- Vermilion Basin ---------- */
function ivoryRibArch({ span = 80, height = 45, ribs = 7 } = {}) {
  const g = standIn('structure.red.ivoryRibArch', meta('ivoryRibArch', [span * 1.15, height * 2, 16], 'red'));
  for (let i = 0; i < ribs; i++) {
    const t = i / (ribs - 1),
      x = (t - 0.5) * span,
      y = Math.sin(t * Math.PI) * height;
    part(g, G.capsule(1.8, 10), toon(SURFACE.bone, { texture: 'bone', repeat: 2 }), { name: `Rib${i}`, position: [x, y * 0.85 + 2, 0], rotation: [0, 0, (t - 0.5) * 1.6] });
  }
  part(g, G.torus(span * 0.5, 2.2, 8, 28, Math.PI), toon(SURFACE.bone, { texture: 'bone', repeat: 4 }), { name: 'Spine', position: [0, 2, 0] });
  landing(g, height * 0.5 + 4, 8, 2, 0, 0, 'crown');
  return g;
}
function coralSpire({ r = 10, h = 70 } = {}) {
  const g = standIn('structure.red.coralSpire', meta('coralSpire', [r * 2.6, h, r * 2.6], 'red'));
  for (let i = 0; i < 4; i++) part(g, G.cone(r * (1 - i * 0.2), h * 0.4, 6), toon(SURFACE.coral, { texture: 'coral', repeat: 2 }), { name: `Tier${i}`, position: [Math.sin(i) * r * 0.3, h * 0.2 * i + h * 0.2, Math.cos(i) * r * 0.3], rotation: [0, i * 0.7, 0] });
  for (let i = 0; i < 5; i++) part(g, G.cylinder(0.3, 0.6, 8, 5), toon('#ff8a6a', { emissive: '#ff5a3a', emissiveIntensity: 0.4 }), { name: `Frond${i}`, position: [Math.cos(i * 1.26) * r * 0.9, h * 0.15, Math.sin(i * 1.26) * r * 0.9], rotation: [Math.sin(i * 1.26) * 0.7, 0, -Math.cos(i * 1.26) * 0.7], outline: false });
  landing(g, h * 0.6, r * 0.5, r * 0.5, Math.sin(2) * r * 0.3, Math.cos(2) * r * 0.3, 'tier2');
  return g;
}
function basinTerrace({ w = 70, d = 40, h = 12 } = {}) {
  const g = standIn('structure.red.basinTerrace', meta('basinTerrace', [w, h, d], 'red'));
  part(g, G.box(w, h, d), toon('#7d2f2c', { texture: 'coral', repeat: 4 }), { name: 'Block', position: [0, h / 2, 0] });
  part(g, G.box(w * 0.96, 0.8, d * 0.96), toon(SURFACE.bone, { texture: 'bone', repeat: 3 }), { name: 'IvoryTop', position: [0, h + 0.4, 0], outline: false });
  landing(g, h + 0.8, w / 2, d / 2, 0, 0, 'ivory');
  return g;
}
function coralBridge({ length = 140, width = 12 } = {}) {
  const g = standIn('structure.red.coralBridge', meta('coralBridge', [length, 30, width], 'red', { crumble: 'staged' }));
  for (let s = 0; s < 3; s++) {
    part(g, G.box(length / 3 - 2, 4, width), toon(SURFACE.coral, { texture: 'coral', repeat: 3 }), { name: `Stage${s}`, position: [(s - 1) * (length / 3), 0, 0] });
    landing(g, 2, length / 6 - 1, width / 2, (s - 1) * (length / 3), 0, `stage${s}`);
  }
  for (let i = 0; i < 4; i++) part(g, G.cylinder(1.5, 2.5, 26, 6), toon(SURFACE.bone, { texture: 'bone' }), { name: `Pier${i}`, position: [(i - 1.5) * (length / 4), -15, 0] });
  return g;
}

/* ---------- Cobalt Drift ---------- */
function floatingReef({ r = 30, thick = 14, roots = 6 } = {}) {
  const g = standIn('structure.blue.floatingReef', meta('floatingReef', [r * 2.2, thick + 24, r * 2.2], 'blue', { moving: 'drift' }));
  const body = part(g, G.cylinder(r, r * 0.55, thick, 9), toon(SURFACE.reef, { texture: 'reef', repeat: 3 }), { name: 'Rock', position: [0, -thick / 2, 0] });
  part(g, G.cylinder(r * 0.98, r * 0.98, 0.8, 9), toon('#6fa5d9'), { name: 'Top', position: [0, 0.4, 0], outline: false });
  for (let i = 0; i < roots; i++) {
    const a = (i / roots) * Math.PI * 2;
    part(body, G.cone(1.2, 24, 5), toon(SURFACE.reefGlow, { emissive: SURFACE.reefGlow, emissiveIntensity: 0.6 }), { name: `Root${i}`, position: [Math.cos(a) * r * 0.5, -thick / 2 - 10, Math.sin(a) * r * 0.5], rotation: [Math.PI + Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3], outline: false });
  }
  for (let i = 0; i < 3; i++) part(g, G.cone(1.5, 8, 4), toon(SURFACE.reefGlow, { emissive: SURFACE.reefGlow, emissiveIntensity: 0.9 }), { name: `Crystal${i}`, position: [Math.cos(i * 2.1) * r * 0.6, 4, Math.sin(i * 2.1) * r * 0.6], outline: false });
  landing(g, 0.8, r * 0.85, r * 0.85, 0, 0, 'top');
  g.userData.animate = (t) => (g.position.y = Math.sin(t * 0.4) * 2);
  return g;
}
function rootPillar({ h = 160, r = 6 } = {}) {
  const g = standIn('structure.blue.rootPillar', meta('rootPillar', [r * 8.5, h, r * 8.5], 'blue'));
  for (let i = 0; i < 3; i++) part(g, G.cylinder(r * 0.6, r * (1.2 - i * 0.2), h, 7), toon(SURFACE.reef, { texture: 'reef', repeat: 6 }), { name: `Strand${i}`, position: [Math.cos(i * 2.1) * r, h / 2, Math.sin(i * 2.1) * r], rotation: [0, 0, 0.04 * (i - 1)] });
  for (let i = 0; i < 4; i++) {
    const y = h * (0.25 + i * 0.2);
    part(g, G.cylinder(r * 2.2, r * 2.2, 1.2, 8), toon('#6fa5d9'), { name: `Shelf${i}`, position: [Math.cos(i * 1.5) * r * 2, y, Math.sin(i * 1.5) * r * 2], outline: false });
    landing(g, y + 0.6, r * 2, r * 2, Math.cos(i * 1.5) * r * 2, Math.sin(i * 1.5) * r * 2, `shelf${i}`);
  }
  return g;
}
function dustCurrent({ length = 120, r = 12 } = {}) {
  const g = standIn('structure.blue.dustCurrent', meta('dustCurrent', [length, r * 2, r * 2], 'blue', { volume: 'updraft' }));
  const m = toon(SURFACE.reefGlow, { emissive: SURFACE.reefGlow, emissiveIntensity: 0.5 });
  m.transparent = true;
  m.opacity = 0.25;
  part(g, G.cylinder(r, r, length, 10, 1, true), m, { name: 'Volume', rotation: [0, 0, Math.PI / 2], outline: false, castShadow: false });
  socket(g, 'FlowStart', [-length / 2, 0, 0]);
  socket(g, 'FlowEnd', [length / 2, 0, 0]);
  return g;
}

/* ---------- Violet Inversion ---------- */
function obsidianArch({ span = 90, height = 70, thick = 10 } = {}) {
  const g = standIn('structure.violet.obsidianArch', meta('obsidianArch', [span, height, thick * 1.6], 'violet', { inverted: 'ceilingRoute' }));
  mirrored((s) => part(g, G.box(thick, height, thick * 1.6), toon(SURFACE.obsidian, { texture: 'obsidian', repeat: 3 }), { name: `Pier.${s > 0 ? 'L' : 'R'}`, position: [s * (span / 2 - thick / 2), height / 2, 0] }));
  part(g, G.box(span, thick, thick * 1.6), toon(SURFACE.obsidian, { texture: 'obsidian', repeat: 5 }), { name: 'Lintel', position: [0, height - thick / 2, 0] });
  part(g, G.box(span * 0.9, 0.3, thick * 1.2), toon(SURFACE.obsidianEdge, { emissive: SURFACE.obsidianEdge, emissiveIntensity: 0.8 }), { name: 'CeilingSeam', position: [0, height - thick - 0.2, 0], outline: false });
  landing(g, height, span / 2, thick * 0.8, 0, 0, 'lintelTop');
  socket(g, 'CeilingLane', [0, height - thick - 1, 0]);
  return g;
}
function ringShard({ length = 120, width = 20 } = {}) {
  const g = standIn('structure.violet.ringShard', meta('ringShard', [length, 8, width], 'violet', { moving: 'orbit' }));
  part(g, G.box(length, 6, width), toon('#5a4a6a', { texture: 'rock', repeat: 4 }), { name: 'Shard', position: [0, 0, 0], rotation: [0, 0, 0.05] });
  part(g, G.box(length * 0.95, 0.5, width * 0.9), toon('#8a7a9a'), { name: 'Face', position: [0, 3.2, 0], rotation: [0, 0, 0.05], outline: false });
  landing(g, 3.5, length * 0.45, width * 0.45, 0, 0, 'face');
  g.userData.animate = (t) => (g.rotation.y = t * 0.05);
  return g;
}
function cathedralFacade({ w = 160, h = 140 } = {}) {
  const g = standIn('structure.violet.cathedralFacade', meta('cathedralFacade', [w, h + 55, 125], 'violet', { landmark: true, arena: true }));
  part(g, G.box(w, h, 40), toon(SURFACE.obsidian, { texture: 'obsidian', repeat: 6 }), { name: 'Wall', position: [0, h / 2, -20] });
  for (let i = 0; i < 5; i++) part(g, G.box(w / 7, h * 0.7, 6), toon('#120a1a'), { name: `Window${i}`, position: [(i - 2) * (w / 6), h * 0.45, 1], outline: false });
  part(g, G.box(w * 0.3, h * 0.35, 12), toon('#0a0510'), { name: 'Door', position: [0, h * 0.175, 4], outline: false });
  part(g, G.cylinder(18, 18, 1.5, 32), toon('#05030a'), { name: 'BlackSun', position: [0, h + 14, -10], rotation: [Math.PI / 2, 0, 0], outline: false });
  part(g, G.torus(19, 1, 6, 40), toon(SURFACE.obsidianEdge, { emissive: SURFACE.obsidianEdge, emissiveIntensity: 1 }), { name: 'Corona', position: [0, h + 14, -10], outline: false });
  mirrored((s) => part(g, G.cone(8, 50, 5), toon(SURFACE.obsidian, { texture: 'obsidian', repeat: 2 }), { name: `Spire.${s > 0 ? 'L' : 'R'}`, position: [s * w * 0.42, h + 25, -20] }));
  for (let i = 0; i < 6; i++) part(g, G.box(4, 4 + i * 1.5, 16), toon('#3a2a4a'), { name: `Step${i}`, position: [0, 2 + i * 0.75, 30 + i * 9], outline: false });
  landing(g, h, w / 2, 18, 0, -20, 'roof');
  landing(g, 4, 6, 8, 0, 30, 'steps');
  socket(g, 'ArenaCenter', [0, 0, 60]);
  return g;
}
function gravitySeam({ length = 100 } = {}) {
  const g = standIn('structure.violet.gravitySeam', meta('gravitySeam', [length, 3, 3], 'violet', { gate: 'gravity' }));
  part(g, G.box(length, 1.2, 1.2), toon(SURFACE.obsidianEdge, { emissive: SURFACE.obsidianEdge, emissiveIntensity: 1.2 }), { name: 'Seam', outline: false, castShadow: false });
  for (let i = 0; i < Math.floor(length / 12); i++) part(g, G.cone(1, 2.5, 4), toon('#e5b8ff', { emissive: '#e5b8ff', emissiveIntensity: 1 }), { name: `Arrow${i}`, position: [(i - Math.floor(length / 12) / 2) * 12, 2.5, 0], outline: false, castShadow: false });
  g.userData.animate = (t) => g.children.forEach((c, i) => c.name.startsWith('Arrow') && (c.position.y = 2.5 + Math.sin(t * 3 + i) * 0.6));
  return g;
}
function eclipseDais({ r = 40 } = {}) {
  const g = standIn('structure.violet.eclipseDais', meta('eclipseDais', [r * 2.4, 20, r * 2.4], 'violet', { arena: true }));
  part(g, G.cylinder(r, r * 1.2, 6, 24), toon(SURFACE.obsidian, { texture: 'obsidian', repeat: 6 }), { name: 'Dais', position: [0, 3, 0] });
  part(g, G.torus(r * 0.9, 0.6, 6, 40), toon(SURFACE.obsidianEdge, { emissive: SURFACE.obsidianEdge, emissiveIntensity: 1 }), { name: 'Circle', position: [0, 6.2, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(g, G.box(12, 1.5, 12), toon('#5a4a6a'), { name: `Shelf${i}`, position: [Math.cos(a) * r * 1.1, 6 + (i % 2) * 8 + 8, Math.sin(a) * r * 1.1], outline: false });
    landing(g, 6.8 + (i % 2) * 8 + 8, 6, 6, Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1, `shelf${i}`);
  }
  landing(g, 6.5, r * 0.9, r * 0.9, 0, 0, 'dais');
  return g;
}

export const STRUCTURES = {
  'fields.terraceStep': terraceStep,
  'fields.farmhouse': farmhouse,
  'fields.silo': silo,
  'fields.windbreak': windbreak,
  'fields.seedPod': seedPod,
  'city.ivoryTower': ivoryTower,
  'city.roofDeck': roofDeck,
  'city.railSpan': railSpan,
  'city.trainCar': trainCar,
  'city.constructionCrown': constructionCrown,
  'city.billboard': billboard,
  'city.observatoryDome': observatoryDome,
  'mountains.cragColumn': cragColumn,
  'mountains.ledgeShelf': ledgeShelf,
  'mountains.ravineBridge': ravineBridge,
  'mountains.transmitterMast': transmitterMast,
  'mountains.windsock': windsock,
  'foundry.furnaceTower': furnaceTower,
  'foundry.conveyorSpan': conveyorSpan,
  'foundry.chimney': chimney,
  'foundry.slagBarge': slagBarge,
  'foundry.stampingPress': stampingPress,
  'harbor.craneBoom': craneBoom,
  'harbor.containerStack': containerStack,
  'harbor.freighter': freighter,
  'harbor.gantryTower': gantryTower,
  'harbor.breakwater': breakwater,
  'launchworks.launchRing': launchRing,
  'launchworks.rocket': rocket,
  'launchworks.pistonStair': pistonStair,
  'launchworks.exhaustShaft': exhaustShaft,
  'launchworks.gantryElevator': gantryElevator,
  'red.ivoryRibArch': ivoryRibArch,
  'red.coralSpire': coralSpire,
  'red.basinTerrace': basinTerrace,
  'red.coralBridge': coralBridge,
  'blue.floatingReef': floatingReef,
  'blue.rootPillar': rootPillar,
  'blue.dustCurrent': dustCurrent,
  'violet.obsidianArch': obsidianArch,
  'violet.ringShard': ringShard,
  'violet.cathedralFacade': cathedralFacade,
  'violet.gravitySeam': gravitySeam,
  'violet.eclipseDais': eclipseDais,
};
export const STRUCTURE_IDS = Object.keys(STRUCTURES);
