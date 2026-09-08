/** Stand-in shadow creatures: the eighteen species and three commanders.
 * Each builder returns a Group whose named children match the rig nodes the
 * model request asks for (Core, Mouth, Emitter, Hitbox.*, Wing.L/R …), so the
 * game code written against a stand-in keeps working when the GLB arrives.
 * userData.animate(t) gives each one a small idle motion for review.
 */
import { GEOMETRY as G, mirrored, part, socket, standIn, toon } from './kit.js';
import { SHADOW } from './palette.js';

const hide = () => toon(SHADOW.body, { texture: 'shadow' });
const deep = () => toon(SHADOW.bodyDeep);
const edge = () => toon(SHADOW.edge, { emissive: SHADOW.edge, emissiveIntensity: 0.5 });
const core = (hot = false) => toon(hot ? SHADOW.coreHot : SHADOW.core, { emissive: hot ? SHADOW.furnace : SHADOW.core, emissiveIntensity: hot ? 1.1 : 0.8 });
const mask = () => toon(SHADOW.mask, { emissive: SHADOW.mask, emissiveIntensity: 0.25 });
const eye = (parent, pos, r = 0.25) => part(parent, G.sphere(r, 8), toon(SHADOW.eye, { emissive: SHADOW.eye }), { name: 'Eye', position: pos, outline: false });

/** Jointed leg: hip → knee → foot, with named joints for rig parity. */
function leg(parent, name, pos, { upper = 1.6, lower = 1.6, r = 0.22, splay = 0.35, bend = 0.9 } = {}) {
  const hip = socket(parent, `${name}.Hip`, pos, [0, 0, splay]);
  const u = part(hip, G.capsule(r, upper), hide(), { name: `${name}.Upper`, position: [0, -upper * 0.5, 0] });
  const knee = socket(u, `${name}.Knee`, [0, -upper * 0.5, 0], [bend, 0, 0]);
  part(knee, G.capsule(r * 0.8, lower), deep(), { name: `${name}.Lower`, position: [0, -lower * 0.5, 0] });
  socket(knee, `${name}.Foot`, [0, -lower, 0]);
  return hip;
}

/** Ivory rib cage strips on a belly: the species' shared "exposed core" tell. */
function ribs(parent, count, { y = -0.4, z0 = -1, spacing = 0.45, w = 1.2 } = {}) {
  for (let i = 0; i < count; i++)
    part(parent, G.box(w, 0.12, 0.14), core(), { name: `Rib${i}`, position: [0, y, z0 + i * spacing], outline: false });
}

function hound(id, { length = 6, height = 2.2, shoulders = false, hot = false, tail = true } = {}) {
  const g = standIn(id, { kind: 'enemy', rig: 'quadruped', size: [length * 0.45, height + 1.2, length] });
  const body = part(g, G.capsule(height * 0.42, length * 0.55), hide(), { name: 'Body', position: [0, height * 0.55 + 0.6, 0], rotation: [Math.PI / 2, 0, 0] });
  ribs(body, 4, { y: -height * 0.36, z0: -0.6, spacing: 0.4, w: height * 0.6 });
  const head = part(g, G.box(height * 0.6, height * 0.5, length * 0.28), deep(), { name: 'Head', position: [0, height * 0.75 + 0.6, length * 0.42] });
  part(head, G.cone(height * 0.22, length * 0.22, 6), deep(), { name: 'Jaw', position: [0, -height * 0.05, length * 0.2], rotation: [Math.PI / 2, 0, 0] });
  eye(head, [height * 0.18, height * 0.1, length * 0.12], 0.16);
  eye(head, [-height * 0.18, height * 0.1, length * 0.12], 0.16);
  socket(head, 'Mouth', [0, -height * 0.1, length * 0.3]);
  if (shoulders)
    mirrored((s) => part(g, G.box(0.8, 1.0, 1.3), edge(), { name: `Vent.${s > 0 ? 'L' : 'R'}`, position: [s * height * 0.55, height + 0.7, length * 0.18] }));
  for (const [nm, z] of [['Leg.Front', length * 0.28], ['Leg.Rear', -length * 0.3]])
    mirrored((s) => leg(g, `${nm}.${s > 0 ? 'L' : 'R'}`, [s * height * 0.35, height * 0.55 + 0.6, z], { upper: height * 0.5, lower: height * 0.5, r: height * 0.09 }));
  if (tail) part(g, G.cone(0.25, length * 0.4, 6), edge(), { name: 'Tail', position: [0, height * 0.7 + 0.6, -length * 0.55], rotation: [-Math.PI / 2 - 0.3, 0, 0] });
  socket(g, 'Core', [0, height * 0.3 + 0.6, 0]);
  socket(g, 'Hitbox.Body', [0, height * 0.55 + 0.6, 0]);
  const hips = g.children.filter((c) => c.name.endsWith('.Hip'));
  g.userData.animate = (t) => {
    body.position.y = height * 0.55 + 0.6 + Math.sin(t * 3) * 0.05;
    hips.forEach((h, i) => (h.rotation.x = Math.sin(t * 6 + i * 1.6) * 0.35));
  };
  return g;
}

function flyer(id, { span = 9, body = 3, wingSweep = 0.4, crescent = false, tail = 1.5, hooks = false, flat = true } = {}) {
  const g = standIn(id, { kind: 'enemy', rig: 'flyer', size: [span, hooks ? 7.5 : flat ? 1.4 : 2.5, body + tail] });
  const b = part(g, flat ? G.box(body * 0.35, 0.5, body) : G.capsule(0.6, body * 0.6), hide(), { name: 'Body', rotation: flat ? [0, 0, 0] : [Math.PI / 2, 0, 0] });
  eye(b, [0, 0.35, body * 0.3], 0.3);
  socket(b, 'Core', [0, -0.2, 0]);
  socket(b, 'Mouth', [0, 0, body * 0.5]);
  const wings = [];
  mirrored((s) => {
    const w = socket(g, `Wing.${s > 0 ? 'L' : 'R'}`, [s * body * 0.15, 0, 0]);
    const half = span * 0.5;
    const geo = crescent ? G.box(half, 0.18, body * 0.35) : G.box(half, 0.14, body * 0.8);
    part(w, geo, hide(), { name: `WingBlade.${s > 0 ? 'L' : 'R'}`, position: [s * half * 0.5, 0, -body * 0.05], rotation: [0, s * -wingSweep, 0] });
    if (crescent) part(w, G.box(half * 0.6, 0.16, body * 0.25), deep(), { name: `WingTip.${s > 0 ? 'L' : 'R'}`, position: [s * half * 0.95, 0, -body * 0.35], rotation: [0, s * -wingSweep * 2, 0] });
    if (hooks) part(w, G.cone(0.25, 1.2, 5), edge(), { name: `Hook.${s > 0 ? 'L' : 'R'}`, position: [s * half * 0.98, 0, body * 0.1], rotation: [Math.PI / 2, 0, 0] });
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
    mirrored((s) => leg(g, `${nm}.${s > 0 ? 'L' : 'R'}`, [s * length * 0.32, height * 0.25, z], { upper: height * 0.18, lower: height * 0.2, r: height * 0.07, splay: 0.9 }));
  socket(g, 'Hitbox.Body', [0, height * 0.4, 0]);
  g.userData.animate = (t) => {
    if (drill) head.rotation.z = t * 6;
    dome.position.y = height * 0.35 + Math.sin(t * 1.5) * 0.05;
  };
  return g;
}

function rooted(id, { height = 5, heads = 1, petals = 6 } = {}) {
  const g = standIn(id, { kind: 'enemy', rig: 'rooted', size: [height * 0.9, height, height * 0.9] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(g, G.cone(0.35, height * 0.5, 5), deep(), { name: `Root${i}`, position: [Math.cos(a) * height * 0.3, height * 0.08, Math.sin(a) * height * 0.3], rotation: [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2] });
  }
  const stalk = part(g, G.cylinder(height * 0.12, height * 0.2, height * 0.5, 8), hide(), { name: 'Stalk', position: [0, height * 0.3, 0] });
  const heads_ = [];
  for (let h = 0; h < heads; h++) {
    const a = heads === 1 ? 0 : ((h / heads) * Math.PI * 2);
    const stem = socket(g, `Stem${h}`, [Math.cos(a) * (heads === 1 ? 0 : height * 0.25), height * 0.55, Math.sin(a) * (heads === 1 ? 0 : height * 0.25)]);
    if (heads > 1) part(stem, G.cylinder(0.12, 0.16, height * 0.35, 6), deep(), { name: `StemRod${h}`, position: [0, height * 0.15, 0] });
    const bulb = part(stem, G.sphere(height * (heads === 1 ? 0.28 : 0.16), 12), hide(), { name: `Head${h}`, position: [0, height * (heads === 1 ? 0.2 : 0.38), 0] });
    for (let p = 0; p < petals; p++) {
      const pa = (p / petals) * Math.PI * 2;
      part(bulb, G.cone(height * 0.05, height * 0.26, 4), edge(), { name: `Petal${h}_${p}`, position: [Math.cos(pa) * height * 0.22, 0, Math.sin(pa) * height * 0.22], rotation: [Math.sin(pa) * 1.1, 0, -Math.cos(pa) * 1.1] });
    }
    const throat = part(bulb, G.cylinder(height * 0.08, height * 0.12, height * 0.2, 8), core(), { name: `Throat${h}`, position: [0, 0, height * 0.25], rotation: [Math.PI / 2, 0, 0], outline: false });
    socket(throat, heads === 1 ? 'Mouth' : `Mouth${h}`, [0, height * 0.1, 0]);
    heads_.push(bulb);
  }
  socket(stalk, 'Core', [0, height * 0.2, 0]);
  socket(g, 'Hitbox.Body', [0, height * 0.55, 0]);
  g.userData.animate = (t) => heads_.forEach((b, i) => (b.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.06)));
  return g;
}

function chain(id, { segments = 7, radius = 0.55, spacing = 1.1, vertical = false, mouth = true, nodes = false } = {}) {
  const g = standIn(id, { kind: 'enemy', rig: 'spline-chain', size: vertical ? [radius * 4, segments * spacing, radius * 4] : [radius * 3, radius * 3, segments * spacing] });
  const segs = [];
  for (let i = 0; i < segments; i++) {
    const p = vertical ? [0, i * spacing + radius, 0] : [0, radius, (i - segments / 2) * spacing];
    const s = part(g, vertical ? G.box(radius * 3, spacing * 0.7, radius * 0.8) : G.sphere(radius * (1 - i / (segments * 2)), 10), hide(), { name: `Segment${i}`, position: p });
    segs.push(s);
    if (i % 2 === 1 && !vertical) part(s, G.box(radius * 1.6, 0.12, 0.2), core(), { name: `Rib${i}`, position: [0, -radius * 0.7, 0], outline: false });
  }
  if (mouth) {
    const head = vertical ? segs[segments - 1] : segs[segments - 1];
    const m = part(head, G.cone(radius * 1.1, radius * 1.4, 8), edge(), { name: 'Mouth', position: vertical ? [0, spacing * 0.6, 0] : [0, 0, radius * 1.2], rotation: vertical ? [0, 0, 0] : [Math.PI / 2, 0, 0] });
    socket(m, 'Emitter', [0, radius * 0.5, 0]);
    if (!vertical) eye(head, [radius * 0.4, radius * 0.4, radius * 0.5], radius * 0.25), eye(head, [-radius * 0.4, radius * 0.4, radius * 0.5], radius * 0.25);
  }
  if (nodes) {
    for (const [nm, y] of [['Node.Bottom', 0], ['Node.Top', segments * spacing + radius]]) {
      const n = part(g, G.sphere(radius * 1.6, 10), core(), { name: nm, position: [0, y, 0], outline: false });
      socket(n, `${nm}.Core`);
    }
  }
  socket(segs[Math.floor(segments / 2)], 'Core', [0, 0, 0]);
  socket(g, 'Hitbox.Body', vertical ? [0, (segments * spacing) / 2, 0] : [0, radius, 0]);
  g.userData.animate = (t) => segs.forEach((s, i) => {
    if (vertical) s.position.x = Math.sin(t * 2 + i * 0.7) * radius * 0.6;
    else s.position.y = radius + Math.sin(t * 3 + i * 0.9) * radius * 0.3;
  });
  return g;
}

export const ENEMIES = {
  shadeHound: () => hound('enemy.shadeHound', { length: 6, height: 2.2 }),
  furnaceHound: () => {
    const g = hound('enemy.furnaceHound', { length: 7.5, height: 2.6, shoulders: true });
    g.traverse((o) => { if (/^Rib/.test(o.name)) o.material = core(true); });
    return g;
  },
  mirrorStalker: () => {
    const g = hound('enemy.mirrorStalker', { length: 8, height: 3.4, tail: false });
    g.userData.standIn.rig = 'quadruped-digitigrade';
    const head = g.getObjectByName('Head');
    head.children.filter((c) => c.name === 'Eye').forEach((e) => head.remove(e));
    part(head, G.box(1.9, 2.0, 0.35), mask(), { name: 'Mask', position: [0, 0.4, 1.2] });
    mirrored((s) => part(head, G.cone(0.2, 1.4, 4), mask(), { name: `Horn.${s > 0 ? 'L' : 'R'}`, position: [s * 0.7, 1.6, 1.2] }));
    part(g, G.torus(2.2, 0.22, 6, 18, Math.PI), edge(), { name: 'Crescent', position: [0, 3.2, -4.2], rotation: [0, Math.PI / 2, 0] });
    return g;
  },
  seedSpitter: () => rooted('enemy.seedSpitter', { height: 5 }),
  thornChoir: () => rooted('enemy.thornChoir', { height: 6, heads: 3, petals: 5 }),
  windowRay: () => flyer('enemy.windowRay', { span: 9, body: 3.5, tail: 2.4 }),
  riftCondor: () => flyer('enemy.riftCondor', { span: 14, body: 3.5, crescent: true, tail: 1.5 }),
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
  coilWraith: () => chain('enemy.coilWraith', { segments: 9, radius: 0.5, spacing: 1.3, vertical: true, mouth: false, nodes: true }),
  cragTortoise: () => shell('enemy.cragTortoise', { length: 8, height: 4.5, spikes: 12 }),
  basaltBurrower: () => shell('enemy.basaltBurrower', { length: 9, height: 4, spikes: 9, drill: true }),
  slagCaster: () => {
    const g = standIn('enemy.slagCaster', { kind: 'enemy', rig: 'biped-heavy', size: [7, 6, 5] });
    const belly = part(g, G.sphere(2.4, 14), hide(), { name: 'Body', position: [0, 3.2, 0] });
    const furnace = part(belly, G.sphere(1.1, 10), core(true), { name: 'FurnaceCore', position: [0, -0.3, 2.0], outline: false });
    socket(furnace, 'Core');
    const head = part(belly, G.box(1.6, 1.2, 1.4), deep(), { name: 'Head', position: [0, 2.6, 0.6] });
    for (let i = 0; i < 4; i++) eye(head, [-0.5 + i * 0.33, 0.35, 0.72], 0.1);
    socket(head, 'Mouth', [0, -0.3, 0.8]);
    mirrored((s) => {
      const arm = socket(belly, `Arm.${s > 0 ? 'L' : 'R'}`, [s * 2.3, 0.6, 0.3], [0, 0, s * 0.6]);
      part(arm, G.capsule(0.28, 2.6), deep(), { name: `ArmRod.${s > 0 ? 'L' : 'R'}`, position: [0, -1.5, 0] });
      const ladle = part(arm, G.cylinder(0.9, 0.6, 0.6, 10), toon(SHADOW.chain), { name: `Ladle.${s > 0 ? 'L' : 'R'}`, position: [0, -3.1, 0] });
      part(ladle, G.cylinder(0.75, 0.75, 0.2, 10), core(true), { name: `LadleSlag.${s > 0 ? 'L' : 'R'}`, position: [0, 0.25, 0], outline: false });
      socket(ladle, `Emitter.${s > 0 ? 'L' : 'R'}`, [0, 0.4, 0]);
      leg(g, `Leg.${s > 0 ? 'L' : 'R'}`, [s * 1.1, 1.6, 0], { upper: 0.8, lower: 0.8, r: 0.35, splay: 0.2, bend: 0.4 });
    });
    socket(g, 'Hitbox.Body', [0, 3.2, 0]);
    const arms = [g.getObjectByName('Arm.L'), g.getObjectByName('Arm.R')];
    g.userData.animate = (t) => arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 1.5 + i * Math.PI) * 0.25));
    return g;
  },
  ballastCrab: () => {
    const g = standIn('enemy.ballastCrab', { kind: 'enemy', rig: 'crab', size: [10, 4, 6] });
    const body = part(g, G.sphere(2.4, 14), hide(), { name: 'Body', position: [0, 2.2, 0], scale: [1.4, 0.7, 1] });
    for (let i = 0; i < 6; i++) part(body, G.cone(0.25, 0.7, 5), deep(), { name: `Stud${i}`, position: [-1.5 + i * 0.6, 1.5, 0] });
    const rear = part(body, G.box(1.6, 0.9, 0.5), core(), { name: 'RearCore', position: [0, -0.4, -2.2], outline: false });
    socket(rear, 'Core');
    part(body, G.box(1.2, 0.9, 0.3), core(), { name: 'Grille', position: [0, -0.5, 2.3], outline: false });
    mirrored((s) => {
      const claw = socket(g, `Claw.${s > 0 ? 'L' : 'R'}`, [s * 3.4, 2.2, 1.2], [0, s * -0.5, 0]);
      part(claw, G.box(1.2, 2.4, 0.5), deep(), { name: `ClawBlade.${s > 0 ? 'L' : 'R'}`, position: [s * 0.9, 0, 0.6], rotation: [0.3, 0, 0] });
      part(claw, G.cone(0.5, 1.4, 4), edge(), { name: `ClawTip.${s > 0 ? 'L' : 'R'}`, position: [s * 0.9, 1.6, 0.9] });
      for (let i = 0; i < 3; i++) leg(g, `Leg${i}.${s > 0 ? 'L' : 'R'}`, [s * 2.6, 2.0, 0.8 - i * 1.0], { upper: 1.3, lower: 1.4, r: 0.16, splay: s * 1.0 });
    });
    socket(g, 'Hitbox.Body', [0, 2.2, 0]);
    const claws = [g.getObjectByName('Claw.L'), g.getObjectByName('Claw.R')];
    g.userData.animate = (t) => claws.forEach((c, i) => (c.rotation.x = -0.2 + Math.max(0, Math.sin(t * 1.2 + i)) * 0.8));
    return g;
  },
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
    mirrored((s) => part(g, G.capsule(0.09, 1.8), deep(), { name: `Leg.${s > 0 ? 'L' : 'R'}`, position: [s * 0.6, -1.0, 0.8], rotation: [0.6, 0, s * 0.5] }));
    socket(g, 'Hitbox.Body', [0, 0, 0]);
    g.userData.animate = (t) => fans.forEach((f) => (f.rotation.y = t * 14));
    return g;
  },
  veilMedusa: () => {
    const g = standIn('enemy.veilMedusa', { kind: 'enemy', rig: 'soft-tendril', size: [7, 10, 7] });
    const bell = part(g, G.sphere(3.4, 16), hide(), { name: 'Bell', position: [0, 7, 0], scale: [1, 0.6, 1] });
    const c = part(bell, G.sphere(1.2, 10), core(), { name: 'BellCore', position: [0, -0.4, 0], outline: false });
    socket(c, 'Core');
    const tendrils = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2,
        r = 1.2 + (i % 3) * 0.7;
      const t = part(g, G.cylinder(0.08, 0.16, 5.5, 5), edge(), { name: `Tendril${i}`, position: [Math.cos(a) * r, 3.5, Math.sin(a) * r], outline: false });
      tendrils.push(t);
    }
    socket(g, 'Hitbox.Body', [0, 7, 0]);
    g.userData.animate = (t) => {
      bell.scale.y = 0.6 + Math.sin(t * 1.4) * 0.06;
      tendrils.forEach((tn, i) => (tn.rotation.z = Math.sin(t * 1.4 + i) * 0.18));
    };
    return g;
  },
  gravityCantor: () => {
    const g = standIn('enemy.gravityCantor', { kind: 'enemy', rig: 'rigid-rotating', size: [8, 7, 8] });
    const ring = part(g, G.torus(3.6, 0.7, 10, 28), hide(), { name: 'Ring', position: [0, 5, 0], rotation: [Math.PI / 2, 0, 0] });
    const c = part(ring, G.sphere(1.0, 10), core(), { name: 'RingCore', outline: false });
    socket(c, 'Core');
    const prongs = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const p = part(g, G.cone(0.28, 3.2, 5), edge(), { name: `Prong${i}`, position: [Math.cos(a) * 3.2, 2.9, Math.sin(a) * 3.2], rotation: [Math.PI, 0, 0] });
      socket(p, `Emitter${i}`, [0, -1.6, 0]);
      prongs.push(p);
    }
    socket(g, 'Hitbox.Body', [0, 5, 0]);
    g.userData.animate = (t) => {
      ring.rotation.z = t * 0.6;
      prongs.forEach((p, i) => (p.position.y = 2.9 + Math.sin(t * 2 + i) * 0.3));
    };
    return g;
  },
};

export const BOSSES = {
  nightRook: () => {
    const g = standIn('boss.nightRook', { kind: 'boss', rig: 'winged-biped', size: [84, 42, 30] });
    const torso = part(g, G.capsule(6, 12), hide(), { name: 'Torso', position: [0, 24, 0] });
    const sternum = part(torso, G.box(6, 9, 2), core(), { name: 'Sternum', position: [0, 1, 5.5], outline: false });
    socket(sternum, 'Core');
    const head = part(torso, G.cone(4, 9, 8), deep(), { name: 'Head', position: [0, 12, 3], rotation: [Math.PI / 2 + 0.3, 0, 0] });
    eye(head, [0, 1.5, 1.5], 0.9);
    socket(head, 'Mouth', [0, 5, 0]);
    const wings = [];
    mirrored((s) => {
      const w = socket(torso, `Wing.${s > 0 ? 'L' : 'R'}`, [s * 5, 7, -2], [0, 0, s * 0.3]);
      for (let f = 0; f < 4; f++) part(w, G.box(28 - f * 4, 1.2, 4 - f * 0.5), f % 2 ? deep() : hide(), { name: `Feather${f}.${s > 0 ? 'L' : 'R'}`, position: [s * (14 - f), -f * 2.4, -f * 1.2], rotation: [0, 0, s * -0.12 * f] });
      socket(w, `WingJoint.${s > 0 ? 'L' : 'R'}`, [s * 4, 0, 0]);
      wings.push(w);
      leg(g, `Leg.${s > 0 ? 'L' : 'R'}`, [s * 4, 13, 0], { upper: 6, lower: 6.5, r: 1.1, splay: s * 0.2, bend: 0.5 });
      const arm = socket(torso, `Arm.${s > 0 ? 'L' : 'R'}`, [s * 6.5, 3, 2], [0.4, 0, s * 0.8]);
      part(arm, G.capsule(0.8, 8), deep(), { name: `ArmRod.${s > 0 ? 'L' : 'R'}`, position: [0, -4.5, 0] });
      for (let c = 0; c < 3; c++) part(arm, G.cone(0.4, 3, 4), edge(), { name: `Talon${c}.${s > 0 ? 'L' : 'R'}`, position: [(c - 1) * 0.9, -10.5, 0], rotation: [Math.PI, 0, 0] });
    });
    socket(g, 'Hitbox.Body', [0, 24, 0]);
    g.userData.animate = (t) => wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.3 + Math.sin(t * 1.6) * 0.45)));
    return g;
  },
  smelterLeviathan: () => {
    const segments = 16;
    const g = standIn('boss.smelterLeviathan', { kind: 'boss', rig: 'spline-chain', size: [40, 30, 130], segments });
    const segs = [];
    for (let i = 0; i < segments; i++) {
      const r = 5 - i * 0.12,
        z = (segments / 2 - i) * 8;
      const s = part(g, G.cylinder(r, r, 6.5, 12), i % 3 === 2 ? core(true) : hide(), { name: `Segment${i}`, position: [0, r, z], rotation: [Math.PI / 2, 0, 0], outline: i % 3 !== 2 });
      part(s, G.torus(r + 0.3, 0.6, 6, 18), toon('#7a4a2a', { texture: 'rust' }), { name: `Ring${i}`, position: [0, 0, 0], rotation: [0, 0, 0], outline: false });
      mirrored((side) => part(s, G.cone(0.5, 3.5, 5), deep(), { name: `Leg${i}.${side > 0 ? 'L' : 'R'}`, position: [side * (r + 1.5), -r * 0.5, 0], rotation: [0, 0, side * 1.6] }));
      if (i % 3 === 2) socket(s, `Core${Math.floor(i / 3)}`);
      segs.push(s);
    }
    const head = part(g, G.cylinder(6, 4.5, 8, 12), toon('#4a3a3a', { texture: 'iron' }), { name: 'Head', position: [0, 5.5, (segments / 2) * 8 + 8], rotation: [Math.PI / 2, 0, 0] });
    const maw = part(head, G.cylinder(4.5, 4.5, 1.5, 12), core(true), { name: 'FurnaceMouth', position: [0, 4.4, 0], outline: false });
    socket(maw, 'Mouth', [0, 1, 0]);
    socket(maw, 'Core');
    for (let i = 0; i < 10; i++) part(head, G.cone(0.6, 2.5, 4), deep(), { name: `Tooth${i}`, position: [Math.cos((i / 10) * Math.PI * 2) * 5, 4.5, Math.sin((i / 10) * Math.PI * 2) * 5], rotation: [0, 0, 0] });
    mirrored((s) => part(g, G.cone(1.2, 6, 4), deep(), { name: `TailBlade.${s > 0 ? 'L' : 'R'}`, position: [s * 3, 4, -(segments / 2) * 8 - 4], rotation: [-Math.PI / 2, 0, s * 0.5] }));
    socket(g, 'Hitbox.Body', [0, 5, 0]);
    g.userData.animate = (t) => segs.forEach((s, i) => (s.position.y = 5 - i * 0.12 + Math.sin(t * 1.2 + i * 0.5) * 2.5 + 2.5));
    return g;
  },
  eclipseRegent: () => {
    const g = standIn('boss.eclipseRegent', { kind: 'boss', rig: 'humanoid-four-arm', size: [36, 70, 20] });
    const torso = part(g, G.capsule(4.5, 16), hide(), { name: 'Torso', position: [0, 40, 0] });
    const heart = part(torso, G.sphere(2, 10), core(), { name: 'Heart', position: [0, 4, 4.2], outline: false });
    socket(heart, 'Core');
    part(torso, G.cylinder(9, 4, 22, 10, 1, true), toon('#3b1d59', { emissive: '#5a2a8a', emissiveIntensity: 0.3 }), { name: 'Mantle', position: [0, -16, 0], outline: false });
    const head = part(torso, G.capsule(2, 3), deep(), { name: 'Head', position: [0, 13, 0] });
    eye(head, [0, 0.5, 1.8], 0.5);
    for (let i = 0; i < 7; i++) part(head, G.cone(0.4, 4 + (i === 3 ? 4 : 0), 4), mask(), { name: `CrownSpike${i}`, position: [(i - 3) * 1.1, 4, 0] });
    const halo = part(torso, G.cylinder(9, 9, 0.6, 32), toon('#05030a', { emissive: '#000000' }), { name: 'BlackSun', position: [0, 22, -2], rotation: [Math.PI / 2, 0, 0], outline: false });
    part(halo, G.torus(9.4, 0.5, 6, 40), edge(), { name: 'Corona', outline: false });
    const arms = [];
    mirrored((s) => {
      for (let a = 0; a < 2; a++) {
        const arm = socket(torso, `Arm${a}.${s > 0 ? 'L' : 'R'}`, [s * 5.5, 8 - a * 6, 0], [0, 0, s * (0.9 + a * 0.5)]);
        part(arm, G.capsule(0.9, 12), deep(), { name: `ArmRod${a}.${s > 0 ? 'L' : 'R'}`, position: [0, -7, 0] });
        const hand = socket(arm, `Hand${a}.${s > 0 ? 'L' : 'R'}`, [0, -14, 0]);
        for (let c = 0; c < 4; c++) part(hand, G.cone(0.35, 3, 4), edge(), { name: `Claw${c}`, position: [(c - 1.5) * 0.8, -1.5, 0], rotation: [Math.PI, 0, 0] });
        arms.push(arm);
      }
      leg(g, `Leg.${s > 0 ? 'L' : 'R'}`, [s * 3, 28, 0], { upper: 12, lower: 13, r: 1.2, splay: s * 0.1, bend: 0.25 });
    });
    socket(g, 'Hitbox.Body', [0, 40, 0]);
    g.userData.animate = (t) => {
      halo.rotation.z = t * 0.2;
      arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 0.8 + i) * 0.2));
    };
    return g;
  },
};

export const ENEMY_IDS = Object.keys(ENEMIES);
export const BOSS_IDS = Object.keys(BOSSES);
