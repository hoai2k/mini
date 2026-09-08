/** Hopper proxy: a primitive Hopper with the rider, built to the delivered
 * GLB's socket names and measured socket positions (metres, +Y up, +Z
 * forward). It is a scale reference and an engine test double, not a
 * replacement for hopper-rider.glb — the real model is already delivered.
 * Socket positions come from hopper/models/manifest.json and the GLB itself.
 */
import { Vector3 } from 'three';
import { GEOMETRY as G, mirrored, part, socket, standIn, toon } from './kit.js';

const UP = new Vector3(0, 1, 0);
/** Point a capsule (Y axis) from its parent origin toward a local target. */
function aim(mesh, target) {
  mesh.quaternion.setFromUnitVectors(UP, new Vector3(...target).normalize());
}
import { HOPPER } from './palette.js';

/** Socket positions measured from hopper-rider.glb in the rest pose. */
export const HOPPER_SOCKETS = {
  'Hopper.Foot.Front.L': [7.86, 0.45, 8.34],
  'Hopper.Foot.Front.R': [-7.86, 0.45, 8.34],
  'Hopper.Foot.Middle.L': [9.42, 0.36, 2.04],
  'Hopper.Foot.Middle.R': [-9.42, 0.36, 2.04],
  'Hopper.Foot.Rear.L': [9.6, 0.3, -9.75],
  'Hopper.Foot.Rear.R': [-9.6, 0.3, -9.75],
  'Hopper.Hitbox.RearKick.L': [9.6, 0.96, -9.75],
  'Hopper.Hitbox.RearKick.R': [-9.6, 0.96, -9.75],
  'Hopper.Laser.L': [1.71, 12.06, 9.36],
  'Hopper.Laser.R': [-1.71, 12.06, 9.36],
  'Hopper.Shield': [0, 11.61, 11.4],
  'Hopper.Camera': [0, 14.01, 0.75],
  'Hopper.CenterOfMass': [0, 8.31, 0],
  'Hopper.Seat': [0, 12.51, -0.15],
  'Hopper.Footrest.L': [0.8, 11.2, 0.6],
  'Hopper.Footrest.R': [-0.8, 11.2, 0.6],
  'Hopper.Grip.L': [0.9, 13.4, 1.1],
  'Hopper.Grip.R': [-0.9, 13.4, 1.1],
};
export const RIDER_SOCKETS = {
  'Rider.Mount': [0, 12.51, -0.15],
  'Rider.Foot.L': [0.47, 10.38, 0.07],
  'Rider.Foot.R': [-0.47, 10.38, 0.07],
  'Rider.Hand.L': [1.25, 12.66, -0.03],
  'Rider.Hand.R': [-1.25, 12.66, -0.03],
  'Rider.Chest': [0, 14.0, 0.14],
  'Rider.Head': [0, 15.17, -0.08],
  'Rider.Camera': [0, 15.09, 0.59],
};
/** Clip names in the delivered combined GLB (see models/manifest.json). */
export const HOPPER_CLIPS = ['Idle', 'Walk', 'Run', 'Crouch', 'Crouch_Hold', 'Jump_Start', 'Jump_Loop', 'Land', 'Jump_Preview', 'Back_Kick', 'Spin_Kick', 'Fire_Start', 'Fire_Loop', 'Fire_End', 'Block_Start', 'Block_Loop', 'Block_End', 'Hit_Reaction', 'Defeat', 'Victory', 'Rider_Cheer', 'Rider_Lean_Forward', 'Rider_Lean_Back', 'Mount_Seat', 'Dismount_Seat'];

/** Overall gameplay height: feet to the camera socket on the head. */
export const HOPPER_HEIGHT_M = 14;

function hopperLeg(parent, name, foot, { upper, lower, r, knee }) {
  const [x, , z] = foot;
  const hip = socket(parent, `${name}.Hip`, [x * 0.55, 7.5, z * 0.7]);
  const dx = x - x * 0.55,
    dz = z - z * 0.7;
  const kneePos = [dx * 0.6, knee - 7.5, dz * 0.6];
  const u = part(hip, G.capsule(r, upper), toon(HOPPER.green), { name: `${name}.Upper`, position: [kneePos[0] / 2, kneePos[1] / 2, kneePos[2] / 2] });
  aim(u, kneePos);
  const kneeNode = socket(hip, `${name}.Knee`, kneePos);
  const footLocal = [dx - kneePos[0], foot[1] - 7.5 - kneePos[1], dz - kneePos[2]];
  const l = part(kneeNode, G.capsule(r * 0.8, lower), toon(HOPPER.greenDark), { name: `${name}.Lower`, position: [footLocal[0] / 2, footLocal[1] / 2, footLocal[2] / 2] });
  aim(l, footLocal);
  part(kneeNode, G.box(r * 2.4, 0.9, r * 3), toon(HOPPER.red), { name: `${name}.Boot`, position: footLocal });
  return hip;
}

export function makeHopperProxy({ rider = true } = {}) {
  const g = standIn('hopper.proxy', { kind: 'hopper', rig: 'insect-hexapod', size: [23, 19, 29], clips: HOPPER_CLIPS });
  const green = toon(HOPPER.green),
    cream = toon(HOPPER.cream),
    blue = toon(HOPPER.blue),
    red = toon(HOPPER.red),
    gold = toon(HOPPER.gold);
  const thorax = part(g, G.capsule(3.6, 5), blue, { name: 'thorax', position: [0, 8.3, 1.5], rotation: [Math.PI / 2, 0, 0] });
  part(thorax, G.box(4.5, 1.2, 8), red, { name: 'ThoraxStripe', position: [0, 3.4, 0], outline: false });
  const abdomen = part(g, G.capsule(3.0, 9), green, { name: 'abdomen', position: [0, 8.6, -6.5], rotation: [Math.PI / 2 + 0.12, 0, 0] });
  part(abdomen, G.box(3.6, 0.8, 10), cream, { name: 'AbdomenStripe', position: [0, -3.1, 0], outline: false });
  const head = part(g, G.sphere(3.2, 14), green, { name: 'head', position: [0, 11.5, 8.2], scale: [1, 1.05, 1.2] });
  part(head, G.box(2.4, 3.4, 1.2), cream, { name: 'Faceplate', position: [0, -0.6, 3.2], outline: false });
  mirrored((s) => {
    part(head, G.sphere(1.5, 10), toon(HOPPER.eye, { emissive: HOPPER.eye, emissiveIntensity: 0.6 }), { name: `Eye.${s > 0 ? 'L' : 'R'}`, position: [s * 2.2, 0.5, 2.4], scale: [1, 1.3, 0.7] });
    const ant = socket(head, `antenna_1.${s > 0 ? 'L' : 'R'}`, [s * 1.2, 2.6, 0.5], [-0.9, 0, s * 0.35]);
    part(ant, G.cylinder(0.14, 0.24, 8, 5), gold, { name: `antenna_2.${s > 0 ? 'L' : 'R'}`, position: [0, 4, 0], outline: false });
    part(ant, G.cylinder(0.08, 0.14, 7, 5), gold, { name: `antenna_3.${s > 0 ? 'L' : 'R'}`, position: [0, 11.3, 0], rotation: [0.25, 0, 0], outline: false });
    // Wings: folded along the abdomen in the rest pose.
    const wing = socket(g, `wing.${s > 0 ? 'L' : 'R'}`, [s * 2.2, 11.4, 0], [0.1, s * 0.15, s * 0.5]);
    part(wing, G.box(0.4, 3.4, 15), toon(HOPPER.greenDark), { name: `WingBlade.${s > 0 ? 'L' : 'R'}`, position: [0, 0, -7] });
    part(wing, G.box(0.5, 0.7, 14), red, { name: `WingStripe.${s > 0 ? 'L' : 'R'}`, position: [0, 1.2, -7], outline: false });
  });
  hopperLeg(g, 'front', HOPPER_SOCKETS['Hopper.Foot.Front.L'], { upper: 5.5, lower: 6.5, r: 0.6, knee: 9.5 });
  hopperLeg(g, 'front', HOPPER_SOCKETS['Hopper.Foot.Front.R'], { upper: 5.5, lower: 6.5, r: 0.6, knee: 9.5 });
  hopperLeg(g, 'middle', HOPPER_SOCKETS['Hopper.Foot.Middle.L'], { upper: 5.5, lower: 6.5, r: 0.6, knee: 9.5 });
  hopperLeg(g, 'middle', HOPPER_SOCKETS['Hopper.Foot.Middle.R'], { upper: 5.5, lower: 6.5, r: 0.6, knee: 9.5 });
  // Hind legs: the enormous folded femur and the serrated tibia.
  mirrored((s) => {
    const hip = socket(g, `rear_upper.${s > 0 ? 'L' : 'R'}.Hip`, [s * 4.2, 9.5, -4]);
    const femur = part(hip, G.capsule(1.3, 10), green, { name: `rear_upper.${s > 0 ? 'L' : 'R'}`, position: [s * 2.2, 3.5, -4.5] });
    aim(femur, [s * 4.4, 7, -9]);
    part(femur, G.box(1.0, 0.8, 9), red, { name: `FemurStripe.${s > 0 ? 'L' : 'R'}`, position: [s * 1.2, 0, 0], outline: false });
    const knee = socket(hip, `rear_lower.${s > 0 ? 'L' : 'R'}.Knee`, [s * 4.4, 7, -9]);
    const tibia = part(knee, G.capsule(0.7, 14), toon(HOPPER.greenDark), { name: `rear_lower.${s > 0 ? 'L' : 'R'}`, position: [s * 0.5, -8, 1.5] });
    aim(tibia, [s * 1, -16.2, 3.25]);
    for (let i = 0; i < 6; i++) part(tibia, G.cone(0.35, 1.2, 4), cream, { name: `Serration${i}`, position: [s * 0.8, -6 + i * 2.2, 0], rotation: [0, 0, s * -Math.PI / 2], outline: false });
    part(knee, G.box(2.0, 1.0, 2.6), red, { name: `rear_foot.${s > 0 ? 'L' : 'R'}`, position: [s * 1, -16.2, 3.25] });
  });
  // Saddle: the yellow frame and red couch the rider sits on.
  const saddle = part(g, G.box(3.2, 0.8, 3.6), red, { name: 'saddle', position: [0, 12.2, -0.2] });
  part(saddle, G.box(3.6, 1.6, 0.4), gold, { name: 'SaddleRail', position: [0, 0.9, -1.8], outline: false });
  for (const [name, p] of Object.entries(HOPPER_SOCKETS)) socket(g, name, p);
  if (rider) {
    const r = standIn('rider.proxy', { kind: 'rider', rig: 'humanoid', size: [2.6, 5.6, 1.4] });
    r.position.set(0, 12.51, -0.15);
    r.name = 'RiderRig';
    part(r, G.box(1.5, 1.2, 0.9), toon(HOPPER.riderShorts), { name: 'DEF-pelvis', position: [0, 0.3, 0] });
    part(r, G.box(1.7, 1.9, 1.0), toon(HOPPER.riderShirt), { name: 'DEF-spine.003', position: [0, 1.7, 0.1] });
    part(r, G.sphere(0.75, 10), toon(HOPPER.riderSkin), { name: 'DEF-spine.006', position: [0, 3.0, 0] });
    part(r, G.sphere(0.8, 10), toon(HOPPER.riderHair), { name: 'Hair', position: [0, 3.3, -0.15], scale: [1, 0.7, 1], outline: false });
    part(r, G.box(1.9, 0.5, 1.2), toon(HOPPER.riderScarf), { name: 'Scarf', position: [0, 2.5, 0], outline: false });
    part(r, G.box(0.35, 0.3, 2.6), toon(HOPPER.riderScarf), { name: 'ScarfTail', position: [-0.5, 2.6, -1.4], rotation: [-0.3, 0, 0], outline: false });
    mirrored((s) => {
      part(r, G.capsule(0.28, 1.4, 4), toon(HOPPER.riderShirt), { name: `DEF-upper_arm.${s > 0 ? 'L' : 'R'}`, position: [s * 1.15, 1.6, 0.3], rotation: [-0.9, 0, s * 0.3] });
      part(r, G.capsule(0.32, 1.2, 4), toon(HOPPER.riderSkin), { name: `DEF-thigh.${s > 0 ? 'L' : 'R'}`, position: [s * 0.45, -0.5, 0.5], rotation: [-0.9, 0, 0] });
      part(r, G.box(0.6, 0.4, 0.9), toon('#6b3d21'), { name: `DEF-foot.${s > 0 ? 'L' : 'R'}`, position: [s * 0.47, -2.1, 0.25] });
    });
    for (const [name, p] of Object.entries(RIDER_SOCKETS)) socket(r, name, [p[0], p[1] - 12.51, p[2] + 0.15]);
    g.getObjectByName('Hopper.Seat').add(r);
    r.position.set(0, 0, 0);
  }
  g.userData.animate = (t) => {
    const breathe = Math.sin(t * 2.6) * 0.06;
    thorax.position.y = 8.3 + breathe;
    abdomen.position.y = 8.6 + breathe;
    head.position.y = 11.5 + breathe;
  };
  return g;
}
