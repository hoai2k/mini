/** Stand-in props: the interactive objects shared by every region. */
import { GEOMETRY as G, part, socket, standIn, toon } from './kit.js';
import { SURFACE } from './palette.js';

const meta = (size, extra = {}) => ({ kind: 'prop', size, ...extra });

function springPad({ w = 10 } = {}) {
  const g = standIn('prop.springPad', meta([w, 3, w], { launch: 1.6 }));
  part(g, G.cylinder(w * 0.5, w * 0.55, 1.2, 12), toon(SURFACE.iron, { texture: 'iron' }), { name: 'Base', position: [0, 0.6, 0] });
  const plate = part(g, G.cylinder(w * 0.42, w * 0.42, 0.8, 12), toon('#37d4d8', { emissive: '#37d4d8', emissiveIntensity: 0.6 }), { name: 'Plate', position: [0, 1.6, 0], outline: false });
  for (let i = 0; i < 4; i++) part(g, G.cone(0.8, 1.6, 4), toon('#ffffff', { emissive: '#bffcff', emissiveIntensity: 0.8 }), { name: `Chevron${i}`, position: [Math.cos((i / 4) * Math.PI * 2) * w * 0.25, 2.4, Math.sin((i / 4) * Math.PI * 2) * w * 0.25], outline: false });
  socket(g, 'Launch', [0, 2, 0]);
  g.userData.animate = (t) => (plate.position.y = 1.6 + Math.max(0, Math.sin(t * 2.5)) * 0.4);
  return g;
}
function signalBeacon() {
  const g = standIn('prop.signalBeacon', meta([3, 5, 3], { collectible: true }));
  const crystal = part(g, G.cone(1, 2.4, 4), toon('#ffe27a', { emissive: '#ffd24a', emissiveIntensity: 1.2 }), { name: 'Crystal', position: [0, 3, 0], outline: false });
  part(g, G.cone(1, 2.4, 4), toon('#ffe27a', { emissive: '#ffd24a', emissiveIntensity: 1.2 }), { name: 'CrystalLower', position: [0, 0.6, 0], rotation: [Math.PI, 0, 0], outline: false });
  part(g, G.torus(1.5, 0.12, 5, 20), toon('#fff6d0', { emissive: '#fff6d0', emissiveIntensity: 1 }), { name: 'Halo', position: [0, 1.8, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  socket(g, 'Pickup', [0, 1.8, 0]);
  g.userData.animate = (t) => {
    g.rotation.y = t;
    crystal.position.y = 3 + Math.sin(t * 2) * 0.2;
  };
  return g;
}
function signalCage({ r = 6, h = 8 } = {}) {
  const g = standIn('prop.signalCage', meta([r * 2, h + 2, r * 2], { barrier: 'reflectOnly' }));
  part(g, G.cylinder(r, r * 1.1, 1.2, 12), toon(SURFACE.iron, { texture: 'iron' }), { name: 'Pedestal', position: [0, 0.6, 0] });
  for (let i = 0; i < 10; i++) part(g, G.cylinder(0.18, 0.18, h, 5), toon('#1a1520'), { name: `Bar${i}`, position: [Math.cos((i / 10) * Math.PI * 2) * r * 0.85, 1.2 + h / 2, Math.sin((i / 10) * Math.PI * 2) * r * 0.85], outline: false });
  part(g, G.torus(r * 0.85, 0.25, 5, 20), toon('#8a4bd8', { emissive: '#8a4bd8', emissiveIntensity: 0.8 }), { name: 'Crown', position: [0, 1.2 + h, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  socket(g, 'Prize', [0, 3, 0]);
  socket(g, 'Lock', [0, 1.2 + h, 0]);
  return g;
}
function lockdownEmitter({ r = 5, h = 14 } = {}) {
  const g = standIn('prop.lockdownEmitter', meta([r * 2, h + 3, r * 2], { arena: 'seal' }));
  part(g, G.cylinder(r * 0.6, r, h, 8), toon(SURFACE.obsidian, { texture: 'obsidian' }), { name: 'Pylon', position: [0, h / 2, 0] });
  part(g, G.sphere(r * 0.5, 10), toon('#8a4bd8', { emissive: '#8a4bd8', emissiveIntensity: 1.2 }), { name: 'Emitter', position: [0, h + 1.5, 0], outline: false });
  socket(g, 'FieldAnchor', [0, h + 1.5, 0]);
  return g;
}
function lockdownDome({ r = 260 } = {}) {
  const g = standIn('prop.lockdownDome', meta([r * 2, r, r * 2], { arena: 'field' }));
  const m = toon('#8a4bd8', { emissive: '#5a2a9a', emissiveIntensity: 0.6 });
  m.transparent = true;
  m.opacity = 0.18;
  part(g, G.sphere(r, 24), m, { name: 'Field', outline: false, castShadow: false });
  return g;
}
function checkpointTotem({ h = 12 } = {}) {
  const g = standIn('prop.checkpointTotem', meta([5, h + 2, 5], { checkpoint: true }));
  part(g, G.box(2.2, h, 2.2), toon(SURFACE.ivory, { texture: 'ivory' }), { name: 'Post', position: [0, h / 2, 0] });
  part(g, G.box(2.6, 1.2, 2.6), toon('#c8352b'), { name: 'BandLow', position: [0, h * 0.3, 0], outline: false });
  part(g, G.box(2.6, 1.2, 2.6), toon('#c8352b'), { name: 'BandHigh', position: [0, h * 0.7, 0], outline: false });
  const lamp = part(g, G.sphere(1.3, 10), toon('#ffdf7a', { emissive: '#ffdf7a', emissiveIntensity: 0.4 }), { name: 'Lamp', position: [0, h + 1, 0], outline: false });
  socket(g, 'Respawn', [0, 0, 6]);
  g.userData.animate = (t) => (lamp.material.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.3);
  g.userData.lit = (on) => (lamp.material = toon(on ? '#ffdf7a' : '#7a7060', on ? { emissive: '#ffdf7a', emissiveIntensity: 1 } : {}));
  return g;
}
function recoveryCapsule() {
  const g = standIn('prop.recoveryCapsule', meta([3, 4, 3], { heal: 2 }));
  const cap = part(g, G.capsule(0.9, 1.6, 6), toon('#efe3c4'), { name: 'Capsule', position: [0, 2, 0] });
  part(cap, G.box(1.9, 0.5, 1.9), toon('#c8352b'), { name: 'Band', outline: false });
  part(cap, G.box(0.9, 0.25, 0.3), toon('#ffffff', { emissive: '#ffffff' }), { name: 'CrossA', position: [0, 0, 0.95], outline: false });
  part(cap, G.box(0.25, 0.9, 0.3), toon('#ffffff', { emissive: '#ffffff' }), { name: 'CrossB', position: [0, 0, 0.95], outline: false });
  socket(g, 'Pickup', [0, 2, 0]);
  g.userData.animate = (t) => (cap.rotation.y = t * 1.2);
  return g;
}
function thermalVent({ r = 8, height = 160 } = {}) {
  const g = standIn('prop.thermalVent', meta([r * 2.4, height, r * 2.4], { volume: 'updraft', lift: 1.0 }));
  part(g, G.cylinder(r, r * 1.2, 2, 12), toon(SURFACE.slate, { texture: 'rock' }), { name: 'Grate', position: [0, 1, 0] });
  const m = toon('#fff1c2', { emissive: '#ffd27a', emissiveIntensity: 0.5 });
  m.transparent = true;
  m.opacity = 0.16;
  part(g, G.cylinder(r * 0.9, r * 0.5, height, 12, 1, true), m, { name: 'Column', position: [0, height / 2 + 2, 0], outline: false, castShadow: false });
  socket(g, 'LiftBase', [0, 2, 0]);
  socket(g, 'LiftTop', [0, height, 0]);
  return g;
}
function windLane({ length = 200, r = 20 } = {}) {
  const g = standIn('prop.windLane', meta([length, r * 2, r * 2], { volume: 'wind' }));
  const m = toon('#b4f2df', { emissive: '#b4f2df', emissiveIntensity: 0.4 });
  m.transparent = true;
  m.opacity = 0.14;
  part(g, G.box(length, r * 2, r * 2), m, { name: 'Volume', outline: false, castShadow: false });
  for (let i = 0; i < Math.floor(length / 25); i++) part(g, G.cone(1.2, 4, 4), toon('#ffffff', { emissive: '#ffffff' }), { name: `Streak${i}`, position: [(i - Math.floor(length / 25) / 2) * 25, (i % 3 - 1) * r * 0.5, 0], rotation: [0, 0, -Math.PI / 2], outline: false, castShadow: false });
  socket(g, 'FlowStart', [-length / 2, 0, 0]);
  socket(g, 'FlowEnd', [length / 2, 0, 0]);
  return g;
}
function gravityGate({ w = 60, h = 40 } = {}) {
  const g = standIn('prop.gravityGate', meta([w, h, 6], { gate: 'inversion' }));
  part(g, G.box(w, 2, 4), toon(SURFACE.obsidian, { texture: 'obsidian' }), { name: 'Sill', position: [0, 1, 0] });
  part(g, G.box(w, 2, 4), toon(SURFACE.obsidian, { texture: 'obsidian' }), { name: 'Lintel', position: [0, h - 1, 0] });
  const m = toon('#e5b8ff', { emissive: '#a56cff', emissiveIntensity: 0.8 });
  m.transparent = true;
  m.opacity = 0.3;
  part(g, G.box(w, h - 4, 0.5), m, { name: 'Curtain', position: [0, h / 2, 0], outline: false, castShadow: false });
  for (let i = 0; i < 5; i++) part(g, G.cone(1.4, 3, 4), toon('#ffffff', { emissive: '#e5b8ff', emissiveIntensity: 1 }), { name: `Arrow${i}`, position: [(i - 2) * (w / 5), h * 0.5, 1], rotation: [Math.PI, 0, 0], outline: false });
  socket(g, 'FlipPlane', [0, h / 2, 0]);
  return g;
}
function launchGate({ r = 90 } = {}) {
  const g = standIn('prop.launchGate', meta([r * 2.2, r * 2.4, 30], { transition: 'starTunnel' }));
  part(g, G.torus(r, r * 0.09, 10, 40), toon(SURFACE.rust, { texture: 'rust', repeat: 6 }), { name: 'Ring', position: [0, r * 1.1, 0] });
  part(g, G.cylinder(r * 0.92, r * 0.92, 2, 40), toon('#fff3d2', { emissive: '#ffd38c', emissiveIntensity: 1 }), { name: 'Portal', position: [0, r * 1.1, 0], rotation: [Math.PI / 2, 0, 0], outline: false });
  for (let i = 0; i < 4; i++) part(g, G.box(6, r * 1.1, 6), toon(SURFACE.iron, { texture: 'iron', repeat: 4 }), { name: `Strut${i}`, position: [Math.cos((i / 4) * Math.PI * 2 + 0.78) * r * 0.9, r * 0.55, 0], outline: true });
  socket(g, 'Entry', [0, r * 1.1, 10]);
  return g;
}
function laserBolt() {
  const g = standIn('prop.laserBolt', meta([0.6, 0.6, 6], { effect: true }));
  part(g, G.capsule(0.3, 5, 4), toon('#ff5a4a', { emissive: '#ffffff', emissiveIntensity: 1.5 }), { name: 'Bolt', rotation: [Math.PI / 2, 0, 0], outline: false, castShadow: false });
  return g;
}
function kickArc() {
  const g = standIn('prop.kickArc', meta([16, 8, 16], { effect: true }));
  const m = toon('#ffe8a0', { emissive: '#ffd27a', emissiveIntensity: 1.2 });
  m.transparent = true;
  m.opacity = 0.5;
  part(g, G.torus(7, 0.6, 6, 30, Math.PI * 1.3), m, { name: 'Arc', rotation: [Math.PI / 2, 0, Math.PI * 0.35], outline: false, castShadow: false });
  return g;
}

function shieldDome({ r = 9 } = {}) {
  const g = standIn('prop.shieldDome', meta([r * 2, r * 2, r], { effect: true }));
  const m = toon('#b9fff1', { emissive: '#7fe8d8', emissiveIntensity: 1 });
  m.transparent = true;
  m.opacity = 0.35;
  part(g, G.sphere(r, 16), m, { name: 'Dome', scale: [1, 1, 0.45], outline: false, castShadow: false });
  part(g, G.torus(r * 0.98, 0.25, 5, 32), toon('#ffffff', { emissive: '#ffffff' }), { name: 'Rim', outline: false, castShadow: false });
  socket(g, 'Anchor', [0, 0, -r * 0.2]);
  return g;
}
function dissolveBurst({ r = 5 } = {}) {
  const g = standIn('prop.dissolveBurst', meta([r * 2.4, r * 2.4, r * 2.4], { effect: true }));
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4,
      b = i * 1.3;
    part(g, G.cone(0.35 + (i % 3) * 0.2, 1.6 + (i % 4) * 0.5, 4), i % 2 ? toon('#1a1520') : toon('#8a4bd8', { emissive: '#8a4bd8', emissiveIntensity: 0.8 }), { name: `Shard${i}`, position: [Math.cos(a) * Math.sin(b) * r, Math.cos(b) * r, Math.sin(a) * Math.sin(b) * r], rotation: [b, a, 0], outline: false, castShadow: false });
  }
  part(g, G.sphere(r * 0.35, 10), toon('#f3e7c8', { emissive: '#f3e7c8', emissiveIntensity: 1.2 }), { name: 'CoreFlash', outline: false, castShadow: false });
  g.userData.animate = (t) => (g.scale.setScalar(0.6 + ((t * 1.5) % 1) * 0.8));
  return g;
}

export const PROPS = {
  springPad,
  signalBeacon,
  signalCage,
  lockdownEmitter,
  lockdownDome,
  checkpointTotem,
  recoveryCapsule,
  thermalVent,
  windLane,
  gravityGate,
  launchGate,
  laserBolt,
  kickArc,
  shieldDome,
  dissolveBurst,
};
export const PROP_IDS = Object.keys(PROPS);
