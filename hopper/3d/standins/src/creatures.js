/** Stand-in shadow creatures: the eighteen species and three commanders.
 * Each builder returns a Group whose named children match the rig nodes the
 * model request asks for (Core, Mouth, Emitter, Hitbox.*, Wing.L/R …), so the
 * game code written against a stand-in keeps working when the GLB arrives.
 * The forms follow the turnaround sheets in design/references: plated black
 * bodies with violet seams, ivory ribs, teeth and masks, and a lit core.
 * userData.animate(t) gives each one a small idle motion for review.
 */
import { Vector3 } from 'three';
import { GEOMETRY as G, clawOutline, leafOutline, mirrored, part, socket, standIn, strand, toon } from './kit.js';
import { SHADOW } from './palette.js';

const hide = () => toon(SHADOW.body, { texture: 'shadow' });
const deep = () => toon(SHADOW.bodyDeep);
const seam = () => toon('#3a2452', { emissive: SHADOW.edge, emissiveIntensity: 0.35 });
const edge = () => toon(SHADOW.edge, { emissive: SHADOW.edge, emissiveIntensity: 0.5 });
const ivory = () => toon(SHADOW.core);
const core = (hot = false) => toon(hot ? SHADOW.coreHot : SHADOW.core, { emissive: hot ? SHADOW.furnace : SHADOW.core, emissiveIntensity: hot ? 1.1 : 0.8 });
const mask = () => toon(SHADOW.mask, { emissive: SHADOW.mask, emissiveIntensity: 0.25 });
const eye = (parent, pos, r = 0.25, name = 'Eye') => part(parent, G.sphere(r, 8), toon(SHADOW.eye, { emissive: SHADOW.eye }), { name, position: pos, outline: false });
const L = (s) => (s > 0 ? 'L' : 'R');
/** Geometry X → world Z, so an outline drawn with +X forward faces forward. */
const FWD = [0, -Math.PI / 2, 0];
/** Geometry X → world -Z with the plate lying flat: a feather trailing back off a wing bone. */
const FLAT_BACK = [-Math.PI / 2, 0, Math.PI / 2];
const Y_AXIS = new Vector3(0, 1, 0);

/** Jointed leg: hip → knee → foot, tapered, with clawed toes. */
function leg(parent, name, pos, { upper = 1.6, lower = 1.6, r = 0.22, splay = 0.35, bend = 0.9, claws = 3, reverse = false } = {}) {
  const hip = socket(parent, `${name}.Hip`, pos, [0, 0, splay]);
  const u = part(hip, G.cylinder(r * 0.7, r, upper, 7), hide(), { name: `${name}.Upper`, position: [0, -upper * 0.5, 0] });
  const knee = socket(u, `${name}.Knee`, [0, -upper * 0.5, 0], [reverse ? -bend : bend, 0, 0]);
  part(knee, G.sphere(r * 0.85, 8), deep(), { name: `${name}.KneeCap`, outline: false });
  part(knee, G.cylinder(r * 0.45, r * 0.75, lower, 7), deep(), { name: `${name}.Lower`, position: [0, -lower * 0.5, 0] });
  const foot = socket(knee, `${name}.Foot`, [0, -lower, 0], [reverse ? bend : -bend, 0, 0]);
  for (let c = 0; c < claws; c++) part(foot, G.cone(r * 0.35, r * 2.2, 4), ivory(), { name: `${name}.Claw${c}`, position: [(c - (claws - 1) / 2) * r * 0.9, 0, r * 1.2], rotation: [Math.PI / 2 + 0.3, 0, 0], outline: false });
  return hip;
}

/** A row of plate spikes along +Z (a spine crest), each a swept fin. */
function crest(parent, { count = 5, from = 0, to = -3, y = 1, h = 0.6, w = 0.45, lean = -0.6, material = deep(), name = 'Crest' } = {}) {
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    const s = 1 - t * 0.45;
    part(parent, G.fin([[-w * 0.5, 0], [w * 0.5, 0], [w * 0.1 + lean * h * 0.3, h * s]], 0.12), material, { name: `${name}${i}`, position: [0, y, from + (to - from) * t], rotation: FWD });
  }
}

/** Ivory rib arcs wrapped under a body: the species' shared "exposed core" tell. */
function ribs(parent, count, { y = 0, z0 = -1, spacing = 0.45, r = 0.9, tube = 0.07, hot = false } = {}) {
  for (let i = 0; i < count; i++)
    part(parent, G.torus(r, tube, 6, 14, Math.PI), core(hot), { name: `Rib${i}`, position: [0, y, z0 + i * spacing], rotation: [0, 0, Math.PI], outline: false });
}

/** Studs and small spikes scattered over a dome. */
function studs(parent, count, radius, { y = 0, h = 0.5, r = 0.18, material = deep(), name = 'Stud', tilt = 0.9, seed = 1 } = {}) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + seed,
      lift = 0.35 + ((i * 7) % 5) * 0.12;
    const x = Math.cos(a) * radius * Math.sqrt(1 - lift * lift),
      z = Math.sin(a) * radius * Math.sqrt(1 - lift * lift),
      yy = y + radius * lift;
    const m = part(parent, G.cone(r, h, 5), material, { name: `${name}${i}`, position: [x, yy, z] });
    m.lookAt(x * 3, yy + (yy - y) * 2 * tilt, z * 3);
    m.rotateX(Math.PI / 2);
  }
}

/* ------------------------------------------------------------------ hounds */
function hound(id, { length = 9, height = 3, width = 3, hot = false, vents = false, crestCount = 6, tail = true, mask: masked = false, horns = false, digitigrade = false, rig = 'quadruped' } = {}) {
  const g = standIn(id, { kind: 'enemy', rig, size: [width + (horns ? 0 : 0), height + (masked ? height * 0.9 : 0.6), length] });
  const legLen = height * 0.58,
    chestY = legLen + height * 0.22,
    chestR = height * 0.3;
  // Chest and hips, joined by the spine; the chest is the heavier end.
  const chest = part(g, G.capsule(chestR, length * 0.22), hide(), { name: 'Body', position: [0, chestY, length * 0.1], rotation: [Math.PI / 2, 0, 0] });
  part(g, G.capsule(chestR * 0.78, length * 0.14), hide(), { name: 'Hips', position: [0, chestY + height * 0.03, -length * 0.22], rotation: [Math.PI / 2 + 0.08, 0, 0] });
  part(g, G.box(chestR * 1.3, chestR * 0.9, length * 0.36), seam(), { name: 'SpinePlate', position: [0, chestY + chestR * 0.55, -length * 0.06], outline: false });
  // Shoulder and hip plates hang over the leg roots like armour.
  mirrored((s) => {
    part(g, G.fin(leafOutline(length * 0.2, height * 0.42, 0.4), 0.16), deep(), { name: `ShoulderPlate.${L(s)}`, position: [s * chestR * 0.95, chestY + height * 0.08, length * 0.22], rotation: [0, -Math.PI / 2, -0.35 * s] });
    part(g, G.fin(leafOutline(length * 0.16, height * 0.34, 0.4), 0.16), deep(), { name: `HipPlate.${L(s)}`, position: [s * chestR * 0.8, chestY + height * 0.08, -length * 0.12], rotation: [0, -Math.PI / 2, -0.35 * s] });
  });
  ribs(chest, 4, { y: 0, z0: -chestR * 0.35, spacing: chestR * 0.32, r: chestR * 0.98, tube: chestR * 0.07, hot });
  // The rib arcs sit in the chest's own frame: it is rotated to lie along Z,
  // so lay them across its local axes instead.
  chest.children.filter((c) => /^Rib/.test(c.name)).forEach((rib, i) => {
    rib.position.set(0, -chestR * 0.3 + i * chestR * 0.32, chestR * 0.05);
    rib.rotation.set(Math.PI / 2, 0, Math.PI);
  });
  crest(g, { count: crestCount, from: length * 0.18, to: -length * 0.36, y: chestY + chestR * 0.95, h: height * 0.32, w: height * 0.22, lean: -0.7 });
  // Neck and the wedge head, drawn in profile and extruded across.
  const neckLen = length * 0.16;
  part(g, G.cylinder(chestR * 0.45, chestR * 0.6, neckLen, 8), hide(), { name: 'Neck', position: [0, chestY + height * 0.08, length * 0.3], rotation: [Math.PI / 2 - 0.35, 0, 0] });
  const headY = chestY + height * 0.16,
    headZ = length * 0.38;
  const head = part(g, G.fin([[0, height * 0.16], [length * 0.09, height * 0.18], [length * 0.2, height * 0.06], [length * 0.24, 0], [length * 0.2, -height * 0.05], [length * 0.05, -height * 0.11], [0, -height * 0.06]], height * 0.36), deep(), { name: 'Head', position: [0, headY, headZ], rotation: FWD });
  const jaw = part(head, G.fin([[0, 0], [length * 0.17, -height * 0.02], [length * 0.2, -height * 0.06], [length * 0.02, -height * 0.11]], height * 0.28), deep(), { name: 'Jaw', position: [length * 0.02, -height * 0.08, 0] });
  for (let i = 0; i < 4; i++) {
    part(head, G.cone(height * 0.02, height * 0.06, 4), ivory(), { name: `Tooth${i}`, position: [length * 0.07 + i * length * 0.035, -height * 0.1, height * 0.11], rotation: [Math.PI, 0, 0], outline: false });
    part(head, G.cone(height * 0.02, height * 0.06, 4), ivory(), { name: `Tooth${i + 4}`, position: [length * 0.07 + i * length * 0.035, -height * 0.1, -height * 0.11], rotation: [Math.PI, 0, 0], outline: false });
  }
  socket(head, 'Mouth', [length * 0.2, -height * 0.06, 0]);
  if (masked) {
    // The Mirror Stalker's ivory mask: a long pointed visor with one eye slit.
    part(head, G.fin([[-length * 0.02, height * 0.17], [length * 0.3, height * 0.02], [length * 0.02, -height * 0.07]], height * 0.3), mask(), { name: 'Mask', position: [length * 0.02, 0, 0] });
    part(head, G.sphere(height * 0.05, 8), toon('#0e0b12'), { name: 'MaskEye', position: [length * 0.1, height * 0.06, 0], outline: false });
    mirrored((s) => part(head, G.fin(clawOutline(height * 0.7, height * 0.12, 0.5), 0.1), mask(), { name: `Horn.${L(s)}`, position: [-length * 0.02, height * 0.12, s * height * 0.1], rotation: [0, 0, Math.PI / 2 - 0.5] }));
  } else {
    eye(head, [length * 0.1, height * 0.06, height * 0.17], height * 0.04);
    eye(head, [length * 0.1, height * 0.06, -height * 0.17], height * 0.04);
    // Crest fins sweep back off the skull.
    for (let i = 0; i < 3; i++) part(head, G.fin([[0, 0], [-length * 0.1 - i * length * 0.02, height * 0.22 - i * height * 0.05], [-length * 0.02, 0]], 0.1), deep(), { name: `HeadCrest${i}`, position: [length * 0.02 - i * length * 0.04, height * 0.15, (i - 1) * height * 0.12] });
  }
  if (vents) mirrored((s) => {
    const v = part(g, G.cylinder(height * 0.2, height * 0.24, height * 0.3, 10), deep(), { name: `Vent.${L(s)}`, position: [s * (chestR + height * 0.12), chestY + height * 0.16, length * 0.2], rotation: [0, 0, s * Math.PI / 2] });
    part(v, G.cylinder(height * 0.14, height * 0.14, height * 0.08, 10), core(true), { name: `VentGlow.${L(s)}`, position: [0, height * 0.14, 0], outline: false });
  });
  const legR = height * 0.09;
  for (const [nm, z, up] of [['Leg.Front', length * 0.22, 1], ['Leg.Rear', -length * 0.26, 1.1]])
    mirrored((s) => leg(g, `${nm}.${L(s)}`, [s * chestR * 0.9, chestY - height * 0.05, z], { upper: legLen * 0.55 * up, lower: legLen * 0.5 * up, r: legR, splay: s * 0.12, bend: digitigrade ? 1.1 : 0.7, reverse: digitigrade }));
  if (tail === 'crescent') {
    // The Mirror Stalker's crescent tail blade rising off the hips.
    part(g, G.fin(clawOutline(height * 1.1, height * 0.3, 1.6, 8), 0.18), deep(), { name: 'Tail', position: [0, chestY + height * 0.1, -length * 0.36], rotation: [0, -Math.PI / 2, Math.PI / 2 - 0.9] });
  } else if (tail) {
    const t = strand(g, [[0, chestY + height * 0.05, -length * 0.3], [0, chestY + height * 0.22, -length * 0.46], [0, chestY + height * 0.16, -length * 0.62], [0, chestY - height * 0.12, -length * 0.78]], chestR * 0.5, 0.06, hide(), { name: 'Tail', steps: 10 });
    t.forEach((m, i) => i % 2 === 0 && part(m, G.cone(chestR * 0.08, chestR * 0.35, 4), deep(), { name: `TailSpike${i}`, position: [0, 0, chestR * 0.4 * (1 - i / 8)], rotation: [Math.PI / 2 + 0.4, 0, 0], outline: false }));
  }
  socket(g, 'Core', [0, chestY - chestR * 0.5, length * 0.1]);
  socket(g, 'Hitbox.Body', [0, chestY, 0]);
  if (masked) socket(g, 'SurfaceNormal', [0, -1, 0]);
  const hips = g.children.filter((c) => c.name.endsWith('.Hip'));
  g.userData.animate = (t) => {
    chest.position.y = chestY + Math.sin(t * 3) * 0.05;
    jaw.rotation.z = -0.1 - Math.max(0, Math.sin(t * 2.2)) * 0.25;
    hips.forEach((h, i) => (h.rotation.x = Math.sin(t * 6 + i * 1.6) * 0.35));
  };
  return g;
}

/* --------------------------------------------------------------- rooted */
/** A spiked ball: the Seed Spitter's body and the Thorn Choir's heads. */
function spikedBall(parent, r, { name = 'Ball', spikes = 18, spikeH = 0.9, y = 0, material = hide() } = {}) {
  const b = part(parent, G.sphere(r, 14), material, { name, position: [0, y, 0] });
  for (let i = 0; i < spikes; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / spikes),
      theta = i * 2.399963;
    const n = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
    const m = part(b, G.cone(r * 0.12, spikeH, 5), deep(), { name: `Spike${i}`, position: [n[0] * r * 0.96, n[1] * r * 0.96, n[2] * r * 0.96] });
    m.lookAt(n[0] * r * 4, y + n[1] * r * 4, n[2] * r * 4);
    m.rotateX(Math.PI / 2);
  }
  // Faceted plate seams: a few violet ridges around the ball.
  for (let i = 0; i < 3; i++) part(b, G.torus(r * 0.98, r * 0.03, 4, 24), seam(), { name: `Seam${i}`, rotation: [i * 1.05, i * 0.7, 0], outline: false });
  return b;
}

/** A funnel mouth ringed with ivory teeth; the cavity glows when it sings. */
function toothedMouth(parent, r, { name = 'Mouth', depth = 0.8, teeth = 12, position = [0, 0, 0], rotation = [0, 0, 0], lit = false } = {}) {
  const m = part(parent, G.lathe([[r * 0.55, 0], [r * 0.9, depth * 0.4], [r, depth], [r * 0.7, depth], [r * 0.4, depth * 0.35], [0, 0]], 14), toon('#2a0f18'), { name: `${name}Funnel`, position, rotation });
  part(m, G.cylinder(r * 0.4, r * 0.4, depth * 0.3, 10), lit ? core(true) : toon('#3a1420', { emissive: '#7a2030', emissiveIntensity: 0.6 }), { name: `${name}Throat`, position: [0, depth * 0.2, 0], outline: false });
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    part(m, G.cone(r * 0.09, r * 0.34, 4), ivory(), { name: `Tooth${i}`, position: [Math.cos(a) * r * 0.8, depth * 0.95, Math.sin(a) * r * 0.8], rotation: [Math.PI - 0.5 * Math.sin(a), 0, 0.5 * Math.cos(a)], outline: false });
  }
  return m;
}

function seedSpitter() {
  const h = 5.8,
    r = 2.1;
  const g = standIn('enemy.seedSpitter', { kind: 'enemy', rig: 'rooted', size: [5.3, h, 5.5] });
  const ball = spikedBall(g, r, { name: 'Bulb', spikes: 22, spikeH: 0.8, y: 3.2 });
  // The snout: a short barrel mouth on the front with a ring of teeth.
  const snout = part(ball, G.cylinder(0.75, 0.95, 1.3, 12), hide(), { name: 'Snout', position: [0, -0.2, r * 0.85], rotation: [Math.PI / 2, 0, 0] });
  toothedMouth(snout, 0.8, { depth: 0.6, teeth: 10, position: [0, 0.65, 0], rotation: [0, 0, 0] });
  socket(snout, 'Mouth', [0, 0.9, 0]);
  eye(ball, [0.55, 0.55, r * 0.75], 0.16);
  eye(ball, [-0.55, 0.55, r * 0.75], 0.16);
  // Four braced legs under the ball, knees out.
  for (const [x, z] of [[1.3, 1.1], [-1.3, 1.1], [1.4, -1.0], [-1.4, -1.0]])
    leg(g, `Leg.${x > 0 ? 'L' : 'R'}${z > 0 ? 'F' : 'B'}`, [x, 2.0, z], { upper: 1.1, lower: 1.1, r: 0.24, splay: Math.sign(x) * 0.9, bend: 0.8 });
  // Belly panel that opens on the core.
  const belly = part(ball, G.lathe([[0, 0], [1.1, 0.2], [1.3, 0.7], [0.9, 1.0], [0, 1.05]], 12), deep(), { name: 'BellyPlate', position: [0, -r * 0.55, 0.3], rotation: [Math.PI, 0, 0] });
  const c = part(belly, G.sphere(0.6, 10), core(), { name: 'CoreOrb', position: [0, 0.55, 0], outline: false });
  socket(c, 'Core');
  socket(g, 'Hitbox.Body', [0, 3.2, 0]);
  g.userData.animate = (t) => {
    ball.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
    snout.scale.setScalar(1 + Math.max(0, Math.sin(t * 2)) * 0.12);
  };
  return g;
}

function thornChoir() {
  const g = standIn('enemy.thornChoir', { kind: 'enemy', rig: 'rooted', size: [6.6, 7.2, 6.9] });
  // A hub over two great claw legs and a rear spur, the stems rising from it.
  const hub = part(g, G.sphere(1.0, 12), hide(), { name: 'Hub', position: [0, 3.0, 0] });
  part(hub, G.lathe([[0.6, -0.9], [1.05, -0.2], [0.9, 0.7], [0.3, 1.1]], 10), deep(), { name: 'HubPlate', outline: false });
  const c = part(hub, G.sphere(0.5, 10), core(true), { name: 'CoreOrb', position: [0, -0.1, 0.8], outline: false });
  socket(c, 'Core');
  mirrored((s) => part(g, G.fin(clawOutline(3.4, 0.9, 1.1, 8), 0.5), deep(), { name: `ClawLeg.${L(s)}`, position: [s * 0.8, 2.6, 0.2], rotation: [0.15, 0, s * (Math.PI / 2 + 0.55)] }));
  part(g, G.fin(clawOutline(2.4, 0.6, 0.9, 6), 0.4), deep(), { name: 'Spur', position: [0, 2.4, -0.9], rotation: [Math.PI / 2 + 0.6, 0, 0] });
  const heads = [];
  for (let i = 0; i < 3; i++) {
    const a = i === 0 ? 0 : i === 1 ? 2.1 : -2.1,
      lean = i === 0 ? 0.25 : 0.8;
    const dir = [Math.sin(a) * lean, 1, Math.cos(a) * lean * 0.6];
    const stem = socket(g, `Stem${i}`, [0, 3.6, 0]);
    const tip = [dir[0] * 3.2, 3.6 + dir[1] * (i === 0 ? 3.2 : 2.4), dir[2] * 3.2];
    strand(stem, [[0, 0, 0], [dir[0] * 1.2, dir[1] * 1.6, dir[2] * 1.2], [tip[0], tip[1] - 3.6, tip[2]]], 0.42, 0.28, hide(), { name: `StemRod${i}`, steps: 6 });
    for (let k = 0; k < 4; k++) part(stem, G.cone(0.12, 0.5, 4), deep(), { name: `StemThorn${i}_${k}`, position: [dir[0] * (0.6 + k * 0.7), dir[1] * (0.8 + k * 0.75), dir[2] * (0.6 + k * 0.7)], rotation: [0, 0, 0.9 * (k % 2 ? 1 : -1)], outline: false });
    const head = spikedBall(stem, 1.05, { name: `Head${i}`, spikes: 14, spikeH: 0.6, y: 0 });
    head.position.set(tip[0], tip[1] - 3.6, tip[2]);
    toothedMouth(head, 0.95, { depth: 0.7, teeth: 12, position: [0, 0, 0.55], rotation: [Math.PI / 2, 0, 0], lit: true });
    socket(head, `Mouth${i}`, [0, 0, 1.4]);
    heads.push(head);
  }
  socket(g, 'Hitbox.Body', [0, 5.5, 0]);
  g.userData.animate = (t) => heads.forEach((b, i) => {
    b.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.05);
    b.rotation.y = Math.sin(t * 0.7 + i) * 0.25;
  });
  return g;
}

/* ---------------------------------------------------------------- flyers */
/** A feathered wing: a jointed bone with tapered blade feathers fanning off it. */
function featheredWing(parent, side, { span = 9, feathers = 7, chord = 3, sweep = 0.35, y = 0, material = hide(), name = 'Wing', bones = 3 } = {}) {
  const root = socket(parent, `${name}.${L(side)}`, [side * 0.4, y, 0]);
  let node = root;
  const half = span * 0.5,
    boneLen = half / bones;
  for (let b = 0; b < bones; b++) {
    const next = socket(node, `${name}Bone${b}.${L(side)}`, [b ? side * boneLen : 0, 0, 0], [0, side * -sweep * 0.35, 0]);
    part(next, G.cylinder(0.14 - b * 0.03, 0.18 - b * 0.03, boneLen, 6), deep(), { name: `${name}Bone${b}Rod.${L(side)}`, position: [side * boneLen * 0.5, 0, 0], rotation: [0, 0, Math.PI / 2] });
    const per = Math.ceil(feathers / bones);
    for (let f = 0; f < per; f++) {
      const i = b * per + f,
        t = i / Math.max(1, feathers - 1);
      const len = chord * (0.55 + 0.75 * Math.sin(Math.PI * (0.25 + 0.75 * t))) * (b === bones - 1 && f === per - 1 ? 1.3 : 1);
      const feather = part(next, G.fin(leafOutline(len, chord * 0.22, 0.55, 0.02), 0.08), f % 2 ? material : deep(), { name: `Feather${i}.${L(side)}`, position: [side * (f + 0.5) * (boneLen / per), -0.05, -0.1], rotation: FLAT_BACK, outline: false });
      feather.rotateOnWorldAxis(Y_AXIS, side * (0.55 - t * 0.7));
    }
    node = next;
  }
  return root;
}

function riftCondor() {
  const g = standIn('enemy.riftCondor', { kind: 'enemy', rig: 'flyer', size: [18, 2.6, 6.5] });
  const body = part(g, G.capsule(0.7, 2.6), hide(), { name: 'Body', rotation: [Math.PI / 2, 0, 0] });
  part(body, G.lathe([[0.3, -1.6], [0.8, -0.6], [0.85, 0.6], [0.4, 1.5]], 8), deep(), { name: 'Chest', position: [0, 0, -0.3], outline: false });
  ribs(body, 4, { r: 0.7, tube: 0.06 });
  body.children.filter((c) => /^Rib/.test(c.name)).forEach((rib, i) => {
    rib.position.set(0, 0.5 - i * 0.4, -0.55);
    rib.rotation.set(Math.PI / 2, 0, 0);
  });
  const c = part(body, G.sphere(0.32, 8), core(), { name: 'Sternum', position: [0, 0.1, -0.7], outline: false });
  socket(c, 'Core');
  // Head with a hooked beak, drawn in profile.
  const head = part(g, G.fin([[0, 0.45], [0.9, 0.5], [1.5, 0.2], [1.8, -0.2], [1.55, -0.35], [1.2, -0.15], [0.7, -0.35], [0, -0.3]], 0.7), deep(), { name: 'Head', position: [0, 0.45, 1.8], rotation: FWD });
  part(head, G.fin([[0.7, -0.15], [1.4, -0.28], [1.7, -0.5], [0.9, -0.42]], 0.4), deep(), { name: 'Jaw', position: [0, 0, 0] });
  eye(head, [0.5, 0.15, 0.36], 0.09);
  eye(head, [0.5, 0.15, -0.36], 0.09);
  for (let i = 0; i < 3; i++) part(head, G.fin([[0, 0], [-0.8 - i * 0.2, 0.7 - i * 0.15], [-0.15, 0]], 0.08), hide(), { name: `HeadCrest${i}`, position: [0.2 - i * 0.2, 0.4, (i - 1) * 0.22] });
  socket(head, 'Mouth', [1.7, -0.3, 0]);
  const wings = [];
  mirrored((s) => wings.push(featheredWing(g, s, { span: 18, feathers: 9, chord: 4.2, sweep: 0.45, y: 0.2 })));
  // A fan tail and hanging talons.
  for (let i = -2; i <= 2; i++) {
    const f = part(g, G.fin(leafOutline(2.4, 0.6, 0.6), 0.08), i % 2 ? deep() : hide(), { name: `TailFeather${i + 2}`, position: [i * 0.28, -0.1, -1.5], rotation: FLAT_BACK, outline: false });
    f.rotateOnWorldAxis(Y_AXIS, -i * 0.18);
  }
  mirrored((s) => leg(g, `Leg.${L(s)}`, [s * 0.5, -0.4, -0.2], { upper: 0.9, lower: 0.9, r: 0.13, splay: s * 0.3, bend: 0.9 }));
  socket(g, 'Hitbox.Body', [0, 0, 0]);
  socket(g, 'Landing', [0, 0.9, -0.3]);
  g.userData.animate = (t) => wings.forEach((w, i) => (w.rotation.z = Math.sin(t * 2.4) * 0.3 * (i ? -1 : 1)));
  return g;
}

/* ------------------------------------------------------------ industry */
function slagCaster() {
  const g = standIn('enemy.slagCaster', { kind: 'enemy', rig: 'biped-heavy', size: [9.9, 6.8, 5.4] });
  // The pot: a squat egg with a hood rising to the crown, the mouth a slit down its front.
  const pot = part(g, G.lathe([[0, 0], [2.2, 0.15], [2.9, 1.4], [2.95, 2.9], [2.5, 4.5], [1.6, 5.6], [0.9, 6.3], [0.35, 6.7], [0, 6.75]], 18), hide(), { name: 'Body', position: [0, 0.9, 0] });
  for (let i = 0; i < 4; i++) part(pot, G.torus(2.96 - Math.abs(i - 1.5) * 0.35, 0.05, 4, 32), seam(), { name: `Band${i}`, position: [0, 1.4 + i * 1.1, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  // The furnace mouth: a tall slit lined with ivory teeth, orange inside.
  const mouth = part(pot, G.box(1.5, 3.2, 1.0), toon('#1c0906', { emissive: SHADOW.furnace, emissiveIntensity: 0.9 }), { name: 'Furnace', position: [0, 4.5, 2.35], rotation: [-0.2, 0, 0], outline: false });
  for (let i = 0; i < 5; i++) {
    part(mouth, G.cone(0.13, 0.7, 4), ivory(), { name: `ToothL${i}`, position: [-0.55, 1.5 - i * 0.7, 0.45], rotation: [0, 0, -Math.PI / 2 + 0.3], outline: false });
    part(mouth, G.cone(0.13, 0.7, 4), ivory(), { name: `ToothR${i}`, position: [0.55, 1.5 - i * 0.7, 0.45], rotation: [0, 0, Math.PI / 2 - 0.3], outline: false });
  }
  socket(mouth, 'Mouth', [0, 0, 0.6]);
  for (let i = 0; i < 4; i++) eye(pot, [-0.6 + i * 0.4, 6.35, 1.0], 0.13);
  // Belly vents and the furnace core behind them.
  for (let i = 0; i < 3; i++) part(pot, G.box(0.32, 1.1, 0.3), core(true), { name: `Vent${i}`, position: [-0.6 + i * 0.6, 2.4, 2.75], rotation: [-0.25, 0, 0], outline: false });
  const furnace = part(pot, G.sphere(1.0, 10), core(true), { name: 'FurnaceCore', position: [0, 2.5, 2.0], outline: false });
  socket(furnace, 'Core');
  // Ladle arms: a shoulder boss, a long rod, and a bowl of slag.
  mirrored((s) => {
    part(pot, G.sphere(0.7, 10), deep(), { name: `Shoulder.${L(s)}`, position: [s * 2.7, 4.6, 0.4], outline: false });
    const arm = socket(pot, `Arm.${L(s)}`, [s * 2.9, 4.6, 0.4], [0, 0, s * 0.8]);
    part(arm, G.cylinder(0.18, 0.24, 4.2, 7), deep(), { name: `ArmRod.${L(s)}`, position: [0, -2.1, 0] });
    part(arm, G.sphere(0.32, 8), deep(), { name: `Elbow.${L(s)}`, position: [0, -2.2, 0], outline: false });
    const ladle = part(arm, G.lathe([[0, 0], [0.9, 0.05], [1.2, 0.5], [1.15, 0.9], [1.0, 0.9], [0.95, 0.5], [0.7, 0.2], [0, 0.15]], 14), toon(SHADOW.chain), { name: `Ladle.${L(s)}`, position: [0, -4.4, 0], rotation: [0, 0, s * -0.8] });
    part(ladle, G.cylinder(0.95, 0.95, 0.25, 14), core(true), { name: `LadleSlag.${L(s)}`, position: [0, 0.75, 0], outline: false });
    socket(ladle, `Emitter.${L(s)}`, [0, 0.9, 0]);
    leg(g, `Leg.${L(s)}`, [s * 1.3, 1.5, 0.3], { upper: 0.7, lower: 0.7, r: 0.42, splay: s * 0.15, bend: 0.3, claws: 3 });
  });
  socket(g, 'Hitbox.Body', [0, 4.2, 0]);
  const arms = [g.getObjectByName('Arm.L'), g.getObjectByName('Arm.R')];
  g.userData.animate = (t) => arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 1.5 + i * Math.PI) * 0.25));
  return g;
}

function ballastCrab() {
  const g = standIn('enemy.ballastCrab', { kind: 'enemy', rig: 'crab', size: [11, 5, 6.5] });
  // A hexagonal armoured shell with a rim, studded; the mouth grille in front, the vent core behind.
  const body = part(g, G.lathe([[0, 0], [2.4, 0.15], [3.0, 0.9], [3.05, 2.2], [2.5, 3.3], [1.4, 4.0], [0, 4.2]], 6), hide(), { name: 'Body', position: [0, 1.4, 0], rotation: [0, Math.PI / 6, 0], scale: [1.3, 0.9, 1] });
  part(body, G.lathe([[3.0, 0.7], [3.25, 1.0], [3.05, 1.3]], 6), seam(), { name: 'Rim', outline: false });
  studs(body, 14, 2.6, { y: 1.2, h: 0.55, r: 0.17, seed: 0.3 });
  const grille = part(body, G.lathe([[0, 0], [0.9, 0], [1.0, 0.55], [0.75, 0.9], [0, 0.95]], 12), ivory(), { name: 'Grille', position: [0, 1.4, 2.5], rotation: [Math.PI / 2 - 0.25, 0, 0], scale: [1.3, 1, 1] });
  for (let i = 0; i < 6; i++) part(grille, G.box(0.08, 1.0, 0.12), toon('#2a1d24'), { name: `GrilleSlot${i}`, position: [-0.62 + i * 0.25, 0.25, 0.55], outline: false });
  socket(grille, 'Mouth', [0, 0.9, 0]);
  const rear = part(body, G.lathe([[0, 0], [0.7, 0.05], [0.8, 0.5], [0, 0.55]], 10), core(true), { name: 'RearCore', position: [0, 1.4, -2.5], rotation: [-Math.PI / 2, 0, 0], outline: false });
  socket(rear, 'Core');
  // Anchor claws: a jointed arm forward and out, ending in a broad anchor blade.
  mirrored((s) => {
    const claw = socket(g, `Claw.${L(s)}`, [s * 3.6, 2.6, 1.6], [0, s * -0.35, 0]);
    part(claw, G.cylinder(0.26, 0.34, 2.4, 7), deep(), { name: `ClawArm.${L(s)}`, position: [s * 1.0, 0.2, 0.5], rotation: [0.5, 0, s * -1.25] });
    part(claw, G.sphere(0.42, 8), deep(), { name: `ClawElbow.${L(s)}`, position: [s * 2.0, 0.5, 1.0], outline: false });
    const anchor = socket(claw, `ClawHead.${L(s)}`, [s * 2.0, 0.5, 1.0], [0, s * 0.5, 0]);
    // The blade: a wide anchor head, its two flukes hooked, seen broadside from the front.
    part(anchor, G.fin([[-0.35, -2.6], [0.35, -2.6], [0.45, 0.6], [1.9, 1.9], [2.4, 1.2], [1.1, 2.9], [0.3, 3.4], [0, 3.9], [-0.3, 3.4], [-1.1, 2.9], [-2.4, 1.2], [-1.9, 1.9], [-0.45, 0.6]], 0.5), deep(), { name: `ClawBlade.${L(s)}`, position: [0, 0.4, 0], rotation: [0, 0, s * 0.4] });
    for (const k of [-1, 1]) part(anchor, G.fin([[0, 0], [k * 0.9, -0.6], [k * 0.55, 0.15]], 0.32), edge(), { name: `ClawTooth${k > 0 ? 'A' : 'B'}.${L(s)}`, position: [k * 1.6, 2.4, 0], rotation: [0, 0, s * 0.4], outline: false });
    for (let i = 0; i < 3; i++) leg(g, `Leg${i}.${L(s)}`, [s * 3.3, 2.0, 1.0 - i * 1.2], { upper: 1.8, lower: 1.7, r: 0.2, splay: s * 1.15, bend: 1.2, claws: 1 });
  });
  socket(g, 'Hitbox.Body', [0, 2.8, 0]);
  socket(g, 'Hitbox.Claws', [0, 2.8, 2.8]);
  const claws = [g.getObjectByName('Claw.L'), g.getObjectByName('Claw.R')];
  g.userData.animate = (t) => claws.forEach((c, i) => (c.rotation.x = -0.2 + Math.max(0, Math.sin(t * 1.2 + i)) * 0.8));
  return g;
}

function coilWraith() {
  const g = standIn('enemy.coilWraith', { kind: 'enemy', rig: 'spline-chain', size: [9, 13.8, 5] });
  // A hooded torso high on the lane, a serpent tail coiling down to the
  // bottom node, two clawed arms; the nodes are the energy anchors.
  const torsoY = 9.6;
  const torso = part(g, G.lathe([[0.6, -1.6], [1.3, -0.6], [1.5, 0.8], [1.1, 1.9], [0.5, 2.4], [0, 2.5]], 10), hide(), { name: 'Torso', position: [0, torsoY, 0] });
  part(torso, G.lathe([[1.5, 0.5], [2.1, 1.0], [1.7, 2.2], [0.6, 2.8], [0, 2.9]], 10), deep(), { name: 'Hood', position: [0, 0.2, -0.2], outline: false });
  for (let i = 0; i < 5; i++) part(torso, G.fin([[0, 0], [-0.5, 1.1 + (i === 2 ? 0.6 : 0)], [0.25, 0.1]], 0.1), deep(), { name: `HoodSpike${i}`, position: [(i - 2) * 0.5, 2.4 - Math.abs(i - 2) * 0.25, -0.4], rotation: [0.5, 0, (i - 2) * -0.3] });
  const head = part(torso, G.fin([[0, 0.35], [1.3, 0.25], [1.7, 0], [1.2, -0.25], [0, -0.35]], 0.6), deep(), { name: 'Head', position: [0, 1.7, 0.4], rotation: FWD });
  eye(head, [0.9, 0.08, 0.31], 0.08);
  eye(head, [0.9, 0.08, -0.31], 0.08);
  const chest = part(torso, G.sphere(0.65, 10), core(), { name: 'ChestCore', position: [0, 0.2, 1.0], outline: false });
  chest.material = toon('#c9a8ff', { emissive: SHADOW.edge, emissiveIntensity: 1.0 });
  mirrored((s) => {
    const arm = socket(torso, `Arm.${L(s)}`, [s * 1.4, 0.9, 0.4], [0.3, 0, s * 1.3]);
    part(arm, G.cylinder(0.14, 0.2, 2.4, 6), deep(), { name: `ArmRod.${L(s)}`, position: [0, -1.2, 0] });
    const hand = socket(arm, `Hand.${L(s)}`, [0, -2.5, 0], [0.9, 0, 0]);
    for (let c = 0; c < 3; c++) part(hand, G.fin(clawOutline(1.3, 0.22, 1.0), 0.08), deep(), { name: `Claw${c}.${L(s)}`, position: [(c - 1) * 0.28, 0, 0], rotation: [0, Math.PI / 2, -Math.PI / 2 + (c - 1) * 0.3] });
  });
  // The tail: a coil down to the bottom node, ribbed with fins.
  const tail = strand(g, [[0, torsoY - 1.6, 0], [0.4, torsoY - 3.2, 0.6], [-0.9, torsoY - 4.8, 0.2], [-0.3, torsoY - 6.4, -0.9], [1.0, torsoY - 7.6, -0.2], [0.2, torsoY - 8.8, 0.7]], 0.75, 0.16, hide(), { name: 'Segment', steps: 9, sides: 8 });
  tail.forEach((m, i) => i % 2 === 0 && part(m, G.fin([[-0.35, 0], [0.35, 0], [0, 0.7 - i * 0.04]], 0.08), seam(), { name: `TailFin${i}`, position: [0, 0, 0.55 - i * 0.05], rotation: [0.9, 0, 0], outline: false }));
  for (const [nm, y] of [['Node.Bottom', 0.4], ['Node.Top', torsoY + 3.6]]) {
    const n = part(g, G.lathe([[0, -0.55], [0.55, -0.2], [0.55, 0.2], [0, 0.55]], 6), core(), { name: nm, position: [0, y, 0], outline: false });
    n.material = toon('#d9c4ff', { emissive: SHADOW.edge, emissiveIntensity: 1.0 });
    socket(n, `${nm}.Core`);
  }
  socket(torso, 'Core', [0, 0.2, 1.0]);
  socket(g, 'Hitbox.Body', [0, 7, 0]);
  const arms = [g.getObjectByName('Arm.L'), g.getObjectByName('Arm.R')];
  g.userData.animate = (t) => {
    torso.position.y = torsoY + Math.sin(t * 1.4) * 0.25;
    arms.forEach((a, i) => (a.rotation.x = 0.3 + Math.sin(t * 1.4 + i * 2) * 0.25));
  };
  return g;
}

/* -------------------------------------------------------------- the drift */
function veilMedusa() {
  const g = standIn('enemy.veilMedusa', { kind: 'enemy', rig: 'soft-tendril', size: [11, 9.5, 12] });
  const bellY = 6.0;
  // The bell: a dome with a scalloped rim and violet seams down its pleats.
  const bell = part(g, G.lathe([[0, 0], [1.6, 0.1], [3.0, 0.6], [3.45, 1.5], [3.3, 2.4], [2.5, 3.3], [1.4, 3.9], [0, 4.1]], 24), hide(), { name: 'Bell', position: [0, bellY, 0] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    part(bell, G.fin([[-0.7, 0], [0.7, 0], [0.45, -0.7], [0, -1.0], [-0.45, -0.7]], 0.08), deep(), { name: `Scallop${i}`, position: [Math.cos(a) * 3.3, 1.2, Math.sin(a) * 3.3], rotation: [0.35, -a + Math.PI / 2, 0], outline: false });
    part(bell, G.box(0.08, 2.4, 0.05), seam(), { name: `Pleat${i}`, position: [Math.cos(a) * 2.4, 2.4, Math.sin(a) * 2.4], rotation: [Math.sin(a) * 0.7, -a, -Math.cos(a) * 0.7], outline: false });
  }
  part(bell, G.torus(3.42, 0.09, 6, 32), seam(), { name: 'RimSeam', position: [0, 1.5, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  // The lantern core hanging in the bell, ribbed like a pale fruit.
  const lantern = part(bell, G.lathe([[0, -1.3], [0.7, -1.0], [1.0, -0.2], [0.7, 0.6], [0, 0.8]], 12), core(), { name: 'BellCore', position: [0, 0.4, 0], outline: false });
  for (let i = 0; i < 8; i++) part(lantern, G.torus(1.0, 0.04, 4, 20, Math.PI), toon('#c4b48a'), { name: `LanternRib${i}`, rotation: [0, (i / 8) * Math.PI, Math.PI / 2], outline: false });
  socket(lantern, 'Core');
  socket(g, 'Hitbox.Bell', [0, bellY + 1.5, 0]);
  // Ten major tendrils drifting outward, beaded at the tips, with thin filaments between.
  const tendrils = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2,
      r0 = 1.4 + (i % 3) * 0.6,
      sway = ((i * 5) % 7) / 7 - 0.5;
    const holder = socket(g, `Tendril${i}`, [Math.cos(a) * r0, bellY + 0.3, Math.sin(a) * r0]);
    const dx = Math.cos(a),
      dz = Math.sin(a);
    const segs = strand(holder, [[0, 0, 0], [dx * 0.4, -1.8, dz * 0.4], [dx * 1.3 + sway, -3.6, dz * 1.3 - sway], [dx * 2.4, -5.0 + sway * 0.6, dz * 2.4], [dx * 3.4 + sway, -5.7, dz * 3.4]], 0.16, 0.05, toon('#6a4fa0', { emissive: SHADOW.edge, emissiveIntensity: 0.35 }), { name: `Tendril${i}Seg`, steps: 8, sides: 5, outline: false });
    const last = segs[segs.length - 1];
    part(last, G.sphere(0.12, 6), edge(), { name: `Bead${i}`, position: [0, 0.4, 0], outline: false });
    tendrils.push(holder);
    if (i % 2 === 0) strand(holder, [[dx * 0.3, 0, dz * 0.3], [dx * 0.9 - sway, -2.2, dz * 0.9], [dx * 1.4, -4.2, dz * 1.4 + sway]], 0.05, 0.02, toon('#9a86c8'), { name: `Filament${i}`, steps: 5, sides: 4, outline: false });
  }
  socket(g, 'Hitbox.Tendrils', [0, bellY - 3, 0]);
  socket(g, 'Hitbox.Body', [0, bellY + 1.5, 0]);
  g.userData.animate = (t) => {
    bell.scale.set(1 + Math.sin(t * 1.4) * 0.05, 1 - Math.sin(t * 1.4) * 0.06, 1 + Math.sin(t * 1.4) * 0.05);
    tendrils.forEach((tn, i) => {
      tn.rotation.z = Math.sin(t * 1.1 + i) * 0.14;
      tn.rotation.x = Math.cos(t * 0.9 + i * 1.3) * 0.12;
    });
  };
  return g;
}

/* --------------------------------------------------------------- violet */
function gravityCantor() {
  const g = standIn('enemy.gravityCantor', { kind: 'enemy', rig: 'rigid-rotating', size: [8.9, 8.5, 6] });
  const y0 = 3.2;
  // A crowned, hooded figure floating in a feathered mantle; the clock-face core on its chest.
  const mantle = part(g, G.lathe([[0.4, 0], [1.6, 0.6], [2.3, 2.2], [2.2, 3.8], [1.4, 4.9], [0, 5.2]], 14), hide(), { name: 'Mantle', position: [0, y0, 0] });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2,
      len = 1.6 + ((i * 3) % 4) * 0.35;
    part(mantle, G.fin(leafOutline(len, 0.6, 0.35, 0.02), 0.08), i % 2 ? deep() : hide(), { name: `MantleFeather${i}`, position: [Math.cos(a) * 1.9, 1.0, Math.sin(a) * 1.9], rotation: [0, -a, -Math.PI / 2 - 0.25], outline: false });
  }
  const shoulders = part(mantle, G.lathe([[1.6, 0], [2.6, 0.5], [2.3, 1.1], [0.9, 1.5], [0, 1.6]], 10), deep(), { name: 'Shoulders', position: [0, 3.9, 0], outline: false });
  const face = part(mantle, G.cylinder(1.05, 1.05, 0.25, 24), ivory(), { name: 'ClockFace', position: [0, 3.0, 1.9], rotation: [Math.PI / 2 - 0.15, 0, 0], outline: false });
  part(face, G.torus(1.05, 0.08, 6, 28), toon('#6a5b3a'), { name: 'ClockRim', rotation: [Math.PI / 2, 0, 0], outline: false });
  for (let i = 0; i < 12; i++) part(face, G.box(0.06, 0.08, i % 3 ? 0.14 : 0.26), toon('#4a3a2a'), { name: `Tick${i}`, position: [Math.cos((i / 12) * Math.PI * 2) * 0.85, 0.14, Math.sin((i / 12) * Math.PI * 2) * 0.85], rotation: [0, -(i / 12) * Math.PI * 2, 0], outline: false });
  part(face, G.box(0.08, 0.1, 0.8), toon('#2a2020'), { name: 'Hand0', position: [0, 0.16, 0.3], outline: false });
  part(face, G.box(0.08, 0.1, 0.55), toon('#2a2020'), { name: 'Hand1', position: [0.22, 0.16, 0], rotation: [0, 1.2, 0], outline: false });
  const c = part(face, G.sphere(0.28, 8), core(), { name: 'RingCore', position: [0, 0.2, 0], outline: false });
  socket(c, 'Core');
  // Head: a beaked mask under the hood, the crown of horns above.
  const head = part(mantle, G.lathe([[0, 0], [0.55, 0.2], [0.7, 0.9], [0.5, 1.5], [0, 1.7]], 10), deep(), { name: 'Head', position: [0, 5.0, 0.2] });
  part(head, G.fin([[0, 0.2], [0.9, 0.05], [0, -0.15]], 0.5), mask(), { name: 'Beak', position: [0, 0.7, 0.55], rotation: FWD });
  eye(head, [0.25, 0.95, 0.5], 0.08);
  eye(head, [-0.25, 0.95, 0.5], 0.08);
  const prongs = [];
  const prongAt = (i, pos, rot, len) => {
    const p = part(mantle, G.fin(clawOutline(len, 0.5, 1.1, 8), 0.28), deep(), { name: `Prong${i}`, position: pos, rotation: rot });
    socket(p, `Emitter${i}`, [Math.sin(1.1) * (len / 1.1), (1 - Math.cos(1.1)) * (len / 1.1), 0]);
    prongs.push(p);
  };
  prongAt(0, [1.1, 5.0, 0], [0, 0, 0.35], 2.8);
  prongAt(1, [-1.1, 5.0, 0], [0, Math.PI, 0.35], 2.8);
  prongAt(2, [2.4, 4.5, 0.2], [0, 0, -0.3], 2.2);
  prongAt(3, [-2.4, 4.5, 0.2], [0, Math.PI, -0.3], 2.2);
  for (let i = 0; i < 3; i++) part(head, G.cone(0.1, 0.9 + (i === 1 ? 0.6 : 0), 4), mask(), { name: `CrownSpike${i}`, position: [(i - 1) * 0.35, 1.9, 0], outline: false });
  mirrored((s) => {
    const arm = socket(mantle, `Arm.${L(s)}`, [s * 2.3, 3.4, 0.5], [0.4, 0, s * 1.05]);
    part(arm, G.cylinder(0.13, 0.2, 2.6, 6), deep(), { name: `ArmRod.${L(s)}`, position: [0, -1.3, 0] });
    const hand = socket(arm, `Hand.${L(s)}`, [0, -2.7, 0], [1.1, 0, 0]);
    for (let k = 0; k < 4; k++) part(hand, G.fin(clawOutline(1.2, 0.2, 0.9), 0.07), deep(), { name: `Claw${k}.${L(s)}`, position: [(k - 1.5) * 0.24, 0, 0], rotation: [0, Math.PI / 2, -Math.PI / 2 + (k - 1.5) * 0.25] });
  });
  socket(g, 'Hitbox.Ring', [0, y0 + 3, 0]);
  socket(g, 'Hitbox.Body', [0, y0 + 3, 0]);
  const arms = [g.getObjectByName('Arm.L'), g.getObjectByName('Arm.R')];
  g.userData.animate = (t) => {
    mantle.position.y = y0 + Math.sin(t * 1.2) * 0.3;
    mantle.rotation.y = Math.sin(t * 0.5) * 0.15;
    arms.forEach((a, i) => (a.rotation.x = 0.4 + Math.sin(t * 1.2 + i * 1.5) * 0.2));
    prongs.forEach((p, i) => (p.rotation.z += 0));
  };
  return g;
}

/* ------------------------------------------------------------- delivered */
/* Species with delivered GLBs keep simple silhouettes: the game swaps the
 * real model in, and these only stand for it in tests and the viewer. */
function flyer(id, { span = 9, body = 3, wingSweep = 0.4, crescent = false, tail = 1.5, hooks = false, flat = true } = {}) {
  const g = standIn(id, { kind: 'enemy', rig: 'flyer', size: [span, hooks ? 7.5 : flat ? 1.4 : 2.5, body + tail] });
  const b = part(g, flat ? G.box(body * 0.35, 0.5, body) : G.capsule(0.6, body * 0.6), hide(), { name: 'Body', rotation: flat ? [0, 0, 0] : [Math.PI / 2, 0, 0] });
  eye(b, [0, 0.35, body * 0.3], 0.3);
  socket(b, 'Core', [0, -0.2, 0]);
  socket(b, 'Mouth', [0, 0, body * 0.5]);
  const wings = [];
  mirrored((s) => {
    const w = socket(g, `Wing.${L(s)}`, [s * body * 0.15, 0, 0]);
    const half = span * 0.5;
    const geo = crescent ? G.box(half, 0.18, body * 0.35) : G.box(half, 0.14, body * 0.8);
    part(w, geo, hide(), { name: `WingBlade.${L(s)}`, position: [s * half * 0.5, 0, -body * 0.05], rotation: [0, s * -wingSweep, 0] });
    if (hooks) part(w, G.cone(0.25, 1.2, 5), edge(), { name: `Hook.${L(s)}`, position: [s * half * 0.98, 0, body * 0.1], rotation: [Math.PI / 2, 0, 0] });
    wings.push(w);
  });
  if (tail > 0) part(g, G.box(0.25, 0.14, tail), edge(), { name: 'Tail', position: [0, 0, -body * 0.5 - tail * 0.5] });
  socket(g, 'Hitbox.Body', [0, 0, 0]);
  g.userData.animate = (t) => wings.forEach((w, i) => (w.rotation.z = Math.sin(t * 4) * 0.35 * (i ? -1 : 1)));
  return g;
}

function shell(id, { length = 8, height = 4.5, spikes = 12, drill = false } = {}) {
  const g = standIn(id, { kind: 'enemy', rig: 'quadruped-shell', size: [length * 0.75, height, length] });
  const dome = part(g, G.sphere(length * 0.42, 14), hide(), { name: 'Shell', position: [0, height * 0.35, 0], scale: [0.9, height / (length * 0.84), 1] });
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2,
      r = length * 0.3;
    part(dome, G.cone(0.35, 1.4, 5), deep(), { name: `Spike${i}`, position: [Math.cos(a) * r, length * 0.25, Math.sin(a) * r], rotation: [Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6] });
  }
  const belly = part(g, G.box(length * 0.55, 0.6, length * 0.7), core(), { name: 'Belly', position: [0, height * 0.14, 0], outline: false });
  socket(belly, 'Core', [0, -0.3, 0]);
  const head = drill
    ? part(g, G.cone(height * 0.3, length * 0.45, 8), edge(), { name: 'Drill', position: [0, height * 0.3, length * 0.62], rotation: [Math.PI / 2, 0, 0] })
    : part(g, G.box(height * 0.45, height * 0.35, length * 0.25), deep(), { name: 'Head', position: [0, height * 0.28, length * 0.5] });
  if (!drill) eye(head, [height * 0.12, 0.1, length * 0.12], 0.2), eye(head, [-height * 0.12, 0.1, length * 0.12], 0.2);
  socket(head, 'Mouth', [0, 0, length * 0.15]);
  for (const [nm, z] of [['Leg.Front', length * 0.3], ['Leg.Rear', -length * 0.3]])
    mirrored((s) => leg(g, `${nm}.${L(s)}`, [s * length * 0.32, height * 0.25, z], { upper: height * 0.18, lower: height * 0.2, r: height * 0.07, splay: 0.9 }));
  socket(g, 'Hitbox.Body', [0, height * 0.4, 0]);
  g.userData.animate = (t) => {
    if (drill) head.rotation.z = t * 6;
    dome.position.y = height * 0.35 + Math.sin(t * 1.5) * 0.05;
  };
  return g;
}

function chain(id, { segments = 7, radius = 0.55, spacing = 1.1 } = {}) {
  const g = standIn(id, { kind: 'enemy', rig: 'spline-chain', size: [radius * 3, radius * 3, segments * spacing] });
  const segs = [];
  for (let i = 0; i < segments; i++) {
    const s = part(g, G.sphere(radius * (1 - i / (segments * 2)), 10), hide(), { name: `Segment${i}`, position: [0, radius, (i - segments / 2) * spacing] });
    segs.push(s);
    if (i % 2 === 1) part(s, G.box(radius * 1.6, 0.12, 0.2), core(), { name: `Rib${i}`, position: [0, -radius * 0.7, 0], outline: false });
  }
  const head = segs[segments - 1];
  const m = part(head, G.cone(radius * 1.1, radius * 1.4, 8), edge(), { name: 'Mouth', position: [0, 0, radius * 1.2], rotation: [Math.PI / 2, 0, 0] });
  socket(m, 'Emitter', [0, radius * 0.5, 0]);
  eye(head, [radius * 0.4, radius * 0.4, radius * 0.5], radius * 0.25);
  eye(head, [-radius * 0.4, radius * 0.4, radius * 0.5], radius * 0.25);
  socket(segs[Math.floor(segments / 2)], 'Core', [0, 0, 0]);
  socket(g, 'Hitbox.Body', [0, radius, 0]);
  g.userData.animate = (t) => segs.forEach((s, i) => (s.position.y = radius + Math.sin(t * 3 + i * 0.9) * radius * 0.3));
  return g;
}

export const ENEMIES = {
  shadeHound: () => hound('enemy.shadeHound', { length: 9, height: 3, width: 3 }),
  furnaceHound: () => hound('enemy.furnaceHound', { length: 11.2, height: 4.1, width: 3.8, hot: true, vents: true, crestCount: 8 }),
  mirrorStalker: () => hound('enemy.mirrorStalker', { length: 12.6, height: 4.6, width: 4.1, tail: 'crescent', mask: true, digitigrade: true, crestCount: 0, rig: 'quadruped-digitigrade' }),
  seedSpitter,
  thornChoir,
  windowRay: () => flyer('enemy.windowRay', { span: 9, body: 3.5, tail: 2.4 }),
  riftCondor,
  chainManta: () => {
    const g = flyer('enemy.chainManta', { span: 12, body: 4, hooks: true, tail: 3 });
    const tether = part(g, G.cylinder(0.08, 0.08, 6, 5), toon(SHADOW.chain), { name: 'Tether', position: [0, -3.2, 0], outline: false });
    socket(tether, 'TetherNode', [0, -3, 0]);
    part(tether, G.sphere(0.45, 8), core(), { name: 'TetherAnchor', position: [0, -3, 0], outline: false });
    return g;
  },
  phaseSkate: () => {
    const g = flyer('enemy.phaseSkate', { span: 7, body: 3, tail: 0 });
    g.userData.standIn.size = [8.7, 0.9, 6.1];
    for (let i = 0; i < 3; i++) part(g, G.box(0.35, 0.12, 0.7), edge(), { name: `TailShard${i}`, position: [0, 0, -1.8 - i * 1.1] });
    return g;
  },
  spireLeech: () => chain('enemy.spireLeech', { segments: 7, radius: 0.55, spacing: 1.1 }),
  coilWraith,
  cragTortoise: () => shell('enemy.cragTortoise', { length: 8, height: 4.5, spikes: 12 }),
  basaltBurrower: () => shell('enemy.basaltBurrower', { length: 9, height: 4, spikes: 9, drill: true }),
  slagCaster,
  ballastCrab,
  turbineWasp: () => {
    const g = standIn('enemy.turbineWasp', { kind: 'enemy', rig: 'flyer-rigid', size: [7, 3, 6] });
    const body = part(g, G.capsule(0.7, 1.6), hide(), { name: 'Body', rotation: [Math.PI / 2, 0, 0] });
    const intake = part(body, G.torus(0.9, 0.18, 6, 16), edge(), { name: 'IntakeRing', position: [0, 0, 1.4], outline: false });
    socket(intake, 'Core');
    eye(body, [0.45, 0.4, 0.9], 0.2);
    eye(body, [-0.45, 0.4, 0.9], 0.2);
    part(g, G.cone(0.35, 2.8, 6), deep(), { name: 'Stinger', position: [0, 0, -2.8], rotation: [-Math.PI / 2, 0, 0] });
    const fans = [];
    for (const [nm, p] of [['Fan.L', [2.4, 0.9, 0.4]], ['Fan.R', [-2.4, 0.9, 0.4]], ['Fan.Tail', [0, 1.4, -1.6]]]) {
      const f = socket(g, nm, p);
      part(f, G.torus(1.2, 0.22, 6, 16), deep(), { name: `${nm}.Ring`, rotation: [Math.PI / 2, 0, 0] });
      const blades = socket(f, `${nm}.Blades`);
      for (let b = 0; b < 3; b++) part(blades, G.box(2.0, 0.08, 0.35), core(), { name: `${nm}.Blade${b}`, rotation: [0, (b / 3) * Math.PI, 0], outline: false });
      fans.push(blades);
    }
    mirrored((s) => part(g, G.capsule(0.09, 1.8), deep(), { name: `Leg.${L(s)}`, position: [s * 0.6, -1.0, 0.8], rotation: [0.6, 0, s * 0.5] }));
    socket(g, 'Hitbox.Body', [0, 0, 0]);
    g.userData.animate = (t) => fans.forEach((f) => (f.rotation.y = t * 14));
    return g;
  },
  veilMedusa,
  gravityCantor,
};

/* --------------------------------------------------------------- bosses */
function nightRook() {
  const g = standIn('boss.nightRook', { kind: 'boss', rig: 'winged-biped', size: [75, 44, 39] });
  // A raven-headed giant: armoured torso with ivory sternum, feathered wings on
  // three-boned arms, clawed hands, digitigrade legs with talons, a feather skirt.
  const torso = part(g, G.lathe([[3.5, -7], [6.2, -3], [6.6, 2], [5.4, 6.5], [3.2, 9], [0, 9.5]], 12), hide(), { name: 'Torso', position: [0, 24, 0] });
  part(torso, G.lathe([[6.0, 4], [8.2, 6.5], [6.5, 9], [2.5, 10.5], [0, 10.8]], 10), deep(), { name: 'Collar', outline: false });
  for (let i = 0; i < 4; i++) part(torso, G.torus(4.6 - i * 0.5, 0.3, 6, 16, Math.PI), core(), { name: `Rib${i}`, position: [0, 4.5 - i * 1.8, 4.8 - i * 0.5], rotation: [Math.PI / 2 + 0.2, 0, Math.PI], outline: false });
  const sternum = part(torso, G.lathe([[0, -1.5], [1.6, -0.9], [2.0, 0.3], [1.4, 1.4], [0, 1.8]], 8), core(), { name: 'Sternum', position: [0, 1.5, 5.4], rotation: [Math.PI / 2, 0, 0], outline: false });
  socket(sternum, 'Core');
  // Neck, head and beak.
  part(torso, G.cylinder(2.2, 3.2, 5, 10), hide(), { name: 'Neck', position: [0, 11.5, 0.5] });
  const head = part(torso, G.fin([[-3, 2], [1, 4.5], [4.5, 3.2], [9.5, 0.4], [10.5, -1.6], [7, -1.2], [3.5, -2.2], [-2.5, -2.5]], 4.5), deep(), { name: 'Head', position: [0, 15.5, 1.5], rotation: FWD });
  part(head, G.fin([[3.5, -2.0], [8.5, -2.4], [9.8, -3.6], [4.5, -3.4]], 3.0), deep(), { name: 'Jaw', position: [0, 0.2, 0] });
  for (let i = 0; i < 3; i++) part(head, G.fin([[0, 0], [-5.5 - i * 1.2, 4.5 - i * 0.8], [-0.8, 0]], 0.5), i % 2 ? hide() : deep(), { name: `HeadCrest${i}`, position: [-0.5 - i * 1.4, 3.6, (i - 1) * 1.4] });
  eye(head, [4.2, 1.2, 2.3], 0.7);
  eye(head, [4.2, 1.2, -2.3], 0.7);
  socket(head, 'Mouth', [10, -1.4, 0]);
  // Feathered wings on the shoulders; blade feathers as rigid fins.
  const wings = [];
  mirrored((s) => {
    const w = featheredWing(torso, s, { span: 62, feathers: 11, chord: 20, sweep: 0.3, y: 7.5, bones: 3 });
    w.position.set(s * 5.5, 7.5, -2);
    w.rotation.set(0, 0, s * 0.35);
    socket(w, `WingJoint.${L(s)}`, [s * 6, 0, 0]);
    wings.push(w);
    // Arms with three talons.
    const arm = socket(torso, `Arm.${L(s)}`, [s * 6.5, 3, 2.5], [0.5, 0, s * 0.9]);
    part(arm, G.cylinder(0.7, 1.0, 9, 8), deep(), { name: `ArmRod.${L(s)}`, position: [0, -4.5, 0] });
    const hand = socket(arm, `Hand.${L(s)}`, [0, -9.5, 0], [1.0, 0, 0]);
    for (let c = 0; c < 3; c++) part(hand, G.fin(clawOutline(4.5, 0.9, 1.0), 0.35), edge(), { name: `Talon${c}.${L(s)}`, position: [(c - 1) * 1.0, 0, 0], rotation: [0, Math.PI / 2, -Math.PI / 2 + (c - 1) * 0.25] });
    leg(g, `Leg.${L(s)}`, [s * 4, 17, 0], { upper: 7.5, lower: 7.5, r: 1.2, splay: s * 0.15, bend: 0.9, reverse: true, claws: 3 });
  });
  // The feather skirt and tail.
  for (let i = -3; i <= 3; i++) {
    const f = part(torso, G.fin(leafOutline(12 - Math.abs(i) * 1.5, 3.2, 0.5), 0.3), i % 2 ? deep() : hide(), { name: `TailFeather${i + 3}`, position: [i * 1.5, -6.5, -2], rotation: FLAT_BACK, outline: false });
    f.rotateOnWorldAxis(Y_AXIS, -i * 0.16);
    f.rotateOnWorldAxis(new Vector3(1, 0, 0), 0.6);
  }
  socket(g, 'Hitbox.Body', [0, 24, 0]);
  socket(g, 'Landing', [0, 34, -3]);
  g.userData.animate = (t) => wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.35 + Math.sin(t * 1.6) * 0.4)));
  return g;
}

function smelterLeviathan() {
  const segments = 16;
  const g = standIn('boss.smelterLeviathan', { kind: 'boss', rig: 'spline-chain', size: [20, 24, 160], segments });
  const rust = toon('#7a4a2a', { texture: 'rust' });
  const iron = toon('#3a3238', { texture: 'iron' });
  const segs = [];
  for (let i = 0; i < segments; i++) {
    const r = 6.4 - i * 0.18,
      z = (segments / 2 - i) * 8;
    const cracked = i % 3 === 2;
    // An iron drum with a riveted rust band; every third one a cracked core window.
    const s = part(g, G.cylinder(r, r * 0.96, 7.2, 14), cracked ? core(true) : iron, { name: `Segment${i}`, position: [0, r, z], rotation: [Math.PI / 2, 0, 0], outline: !cracked });
    part(s, G.torus(r + 0.25, 0.7, 6, 20), rust, { name: `Ring${i}`, position: [0, 2.4, 0], outline: false });
    part(s, G.torus(r + 0.25, 0.7, 6, 20), rust, { name: `Ring${i}b`, position: [0, -2.4, 0], outline: false });
    if (cracked) for (let k = 0; k < 6; k++) part(s, G.box(1.2, 7.4, 0.5), iron, { name: `Bar${i}_${k}`, position: [Math.cos((k / 6) * Math.PI * 2) * r, 0, Math.sin((k / 6) * Math.PI * 2) * r], rotation: [0, -(k / 6) * Math.PI * 2, 0], outline: false });
    for (let k = 0; k < 8; k++) part(s, G.sphere(0.35, 5), toon('#8a6a4a'), { name: `Rivet${i}_${k}`, position: [Math.cos((k / 8) * Math.PI * 2) * (r + 0.6), 2.4, Math.sin((k / 8) * Math.PI * 2) * (r + 0.6)], outline: false });
    // Two hooked legs each side, angled back like a centipede's.
    mirrored((side) => {
      for (const [k, zz] of [[0, 2.2], [1, -2.2]]) {
        const lg = part(s, G.fin(clawOutline(r * 1.1, r * 0.22, 0.8), 0.6), deep(), { name: `Leg${i}.${L(side)}${k}`, position: [side * (r + 0.4), zz, -r * 0.4], rotation: [Math.PI / 2, 0, side * (Math.PI / 2 + 0.4)] });
        lg.rotateY(side * -0.5);
      }
    });
    if (cracked) socket(s, `Core${Math.floor(i / 3)}`);
    socket(s, `Hitbox.Segment${i}`);
    segs.push(s);
  }
  // The head: a furnace drum whose maw is a glowing radial grate, stacks on top, hooks at the lip.
  const headZ = (segments / 2) * 8 + 8;
  const head = part(g, G.cylinder(6.3, 5.4, 9, 16), iron, { name: 'Head', position: [0, 5.6, headZ], rotation: [Math.PI / 2, 0, 0] });
  part(head, G.torus(6.4, 0.8, 6, 24), rust, { name: 'HeadRing', position: [0, 3.6, 0], outline: false });
  const maw = part(head, G.cylinder(5.4, 5.4, 1.6, 16), core(true), { name: 'FurnaceMouth', position: [0, 4.6, 0], outline: false });
  for (let k = 0; k < 12; k++) part(maw, G.box(0.5, 1.7, 4.6), iron, { name: `Grate${k}`, position: [Math.cos((k / 12) * Math.PI) * 2.6, 0, Math.sin((k / 12) * Math.PI) * 2.6], rotation: [0, -(k / 12) * Math.PI, 0], outline: false });
  part(maw, G.sphere(1.6, 10), toon('#fff1c2', { emissive: '#ffd27a', emissiveIntensity: 1.2 }), { name: 'FurnaceEye', position: [0, 0.3, 0], outline: false });
  socket(maw, 'Mouth', [0, 1, 0]);
  socket(maw, 'Core');
  for (let i = 0; i < 6; i++) part(head, G.fin(clawOutline(3.2, 1.0, 1.2), 0.6), deep(), { name: `Hook${i}`, position: [Math.cos((i / 6) * Math.PI * 2) * 6.2, 4.2, Math.sin((i / 6) * Math.PI * 2) * 6.2], rotation: [0, -(i / 6) * Math.PI * 2, Math.PI / 2 - 0.4] });
  for (let i = 0; i < 3; i++) part(head, G.cylinder(0.6, 0.8, 3, 8), rust, { name: `Stack${i}`, position: [(i - 1) * 2.2, -1 + Math.abs(i - 1), -6.5], rotation: [Math.PI / 2, 0, 0], outline: false });
  // The tail: two blade pincers off the last segment.
  mirrored((s) => part(g, G.fin(clawOutline(11, 2.6, 0.9), 0.8), deep(), { name: `TailBlade.${L(s)}`, position: [s * 3, 4, -(segments / 2) * 8 - 3], rotation: [0, Math.PI / 2 + s * 0.3, s * 0.4] }));
  socket(g, 'Hitbox.Body', [0, 5, 0]);
  socket(g, 'Landing.Segment', [0, 12, 0]);
  g.userData.animate = (t) => segs.forEach((s, i) => (s.position.y = 6.4 - i * 0.18 + Math.sin(t * 1.2 + i * 0.5) * 2.5 + 2.5));
  return g;
}

function eclipseRegent() {
  const g = standIn('boss.eclipseRegent', { kind: 'boss', rig: 'humanoid-four-arm', size: [45, 69, 21] });
  const violet = toon('#3b1d59', { emissive: '#5a2a8a', emissiveIntensity: 0.3 });
  const violetLight = toon('#6a3aa8', { emissive: '#7a3fd0', emissiveIntensity: 0.35 });
  const gold = toon('#b08a3e', { emissive: '#8a6a2a', emissiveIntensity: 0.3 });
  // A tall regal figure: the mantle a long flame of violet, the torso a narrow
  // black cuirass with the heart, four thin arms, a crowned head under the black sun.
  const mantle = part(g, G.lathe([[4, 0], [13, 1.2], [14, 6], [9.5, 18], [6.0, 28], [4.4, 36], [0, 37]], 18), violet, { name: 'Mantle', position: [0, 0.5, 0], outline: false });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2,
      len = 12 + ((i * 5) % 6) * 2.6;
    part(mantle, G.fin(leafOutline(len, 4.2, 0.3, 0.05), 0.35), i % 2 ? violetLight : violet, { name: `MantleFlame${i}`, position: [Math.cos(a) * 11, 6, Math.sin(a) * 11], rotation: [0, -a, -Math.PI / 2 - 0.45 - ((i * 3) % 4) * 0.14], outline: false });
  }
  const torso = part(g, G.lathe([[3.6, -8], [5.5, -3], [5.2, 4], [4.0, 9], [2.0, 12], [0, 12.5]], 10), hide(), { name: 'Torso', position: [0, 40, 0] });
  part(torso, G.lathe([[4.2, 5], [8.5, 8.5], [7.0, 10.5], [2.4, 12.6], [0, 12.9]], 8), deep(), { name: 'Pauldrons', outline: false });
  for (let i = 0; i < 3; i++) part(torso, G.torus(4.4 - i * 0.6, 0.18, 4, 24), gold, { name: `Filigree${i}`, position: [0, 2 - i * 4, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  const heart = part(torso, G.lathe([[0, -1.8], [1.6, -0.8], [2.0, 0.6], [1.2, 1.9], [0, 2.3]], 10), toon('#fff4d6', { emissive: '#ffd6a0', emissiveIntensity: 1.1 }), { name: 'Heart', position: [0, 4, 4.6], outline: false });
  socket(heart, 'Core');
  const head = part(torso, G.lathe([[0, 0], [1.6, 0.4], [2.2, 2.4], [1.8, 4.4], [0.9, 5.6], [0, 6]], 10), deep(), { name: 'Head', position: [0, 12.6, 0] });
  part(head, G.fin([[0, 0.6], [2.4, 0.2], [0, -0.4]], 1.2), mask(), { name: 'Visor', position: [0, 3.2, 1.6], rotation: FWD });
  eye(head, [0.7, 3.6, 1.6], 0.28);
  eye(head, [-0.7, 3.6, 1.6], 0.28);
  socket(head, 'Mouth', [0, 2.6, 2]);
  for (let i = 0; i < 5; i++) part(head, G.fin([[-0.5, 0], [0.5, 0], [0, 4 + (i === 2 ? 5 : Math.abs(i - 2) === 1 ? 2 : 0)]], 0.4), gold, { name: `CrownSpike${i}`, position: [(i - 2) * 1.0, 5.4, 0.2], rotation: [0, 0, (i - 2) * -0.25] });
  mirrored((s) => part(head, G.fin(clawOutline(6, 1.2, 1.0), 0.4), deep(), { name: `CrownHorn.${L(s)}`, position: [s * 2, 4.6, 0], rotation: [0, 0, s * (Math.PI / 2 - 0.9)] }));
  // The black sun: a disc behind the head with a spiked corona.
  const halo = part(torso, G.cylinder(9.5, 9.5, 0.6, 40), toon('#05030a', { emissive: '#000000' }), { name: 'BlackSun', position: [0, 23, -3], rotation: [Math.PI / 2, 0, 0], outline: false });
  part(halo, G.torus(9.8, 0.55, 6, 48), toon('#9a5cff', { emissive: '#b070ff', emissiveIntensity: 0.9 }), { name: 'Corona', rotation: [Math.PI / 2, 0, 0], outline: false });
  for (let i = 0; i < 24; i++) part(halo, G.cone(0.5, 2.2 + (i % 3) * 1.2, 4), toon('#b070ff', { emissive: '#b070ff', emissiveIntensity: 0.9 }), { name: `CoronaSpike${i}`, position: [Math.cos((i / 24) * Math.PI * 2) * 10.6, 0, Math.sin((i / 24) * Math.PI * 2) * 10.6], rotation: [0, 0, -(i / 24) * Math.PI * 2 - Math.PI / 2], outline: false });
  socket(halo, 'Halo');
  const arms = [];
  mirrored((s) => {
    for (let a = 0; a < 2; a++) {
      const arm = socket(torso, `Arm${a}.${L(s)}`, [s * 5.5, 8 - a * 6, 0], [0.2 + a * 0.3, 0, s * (0.9 + a * 0.5)]);
      part(arm, G.cylinder(0.55, 0.8, 8, 7), deep(), { name: `ArmRod${a}.${L(s)}`, position: [0, -4, 0] });
      part(arm, G.sphere(1.0, 8), deep(), { name: `Elbow${a}.${L(s)}`, position: [0, -8.2, 0], outline: false });
      const fore = socket(arm, `Forearm${a}.${L(s)}`, [0, -8.2, 0], [0.9, 0, 0]);
      part(fore, G.cylinder(0.45, 0.6, 7, 7), deep(), { name: `ForeRod${a}.${L(s)}`, position: [0, -3.5, 0] });
      const hand = socket(fore, `Hand${a}.${L(s)}`, [0, -7.2, 0]);
      socket(hand, `Hand${a * 2 + (s > 0 ? 0 : 1)}`);
      for (let c = 0; c < 4; c++) part(hand, G.fin(clawOutline(2.6, 0.45, 0.8), 0.18), deep(), { name: `Claw${c}`, position: [(c - 1.5) * 0.6, 0, 0], rotation: [0, Math.PI / 2, -Math.PI / 2 + (c - 1.5) * 0.2] });
      arms.push(arm);
    }
    leg(g, `Leg.${L(s)}`, [s * 3, 30, 0], { upper: 13, lower: 13, r: 1.1, splay: s * 0.08, bend: 0.25, claws: 3 });
  });
  socket(g, 'Hitbox.Body', [0, 40, 0]);
  g.userData.animate = (t) => {
    halo.rotation.z = t * 0.2;
    mantle.rotation.y = Math.sin(t * 0.3) * 0.08;
    arms.forEach((a, i) => (a.rotation.x = 0.2 + Math.sin(t * 0.8 + i) * 0.2));
  };
  return g;
}

export const BOSSES = { nightRook, smelterLeviathan, eclipseRegent };

export const ENEMY_IDS = Object.keys(ENEMIES);
export const BOSS_IDS = Object.keys(BOSSES);
