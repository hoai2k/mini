// Small helpers the fodder builders share.
import * as THREE from 'three/webgpu';
import { paintQuad } from '../../quad.js';

// a colour from a hex
export const C = (c) => new THREE.Color(c);

// ---- helpers ------------------------------------------------------------------
// a rig's skin boxes in a group, gone: the kit draws cheaper ones
export function dropAll(rig, g) { for (const m of [...g.children]) if (m.isMesh) { g.remove(m); rig.meshes.splice(rig.meshes.indexOf(m), 1); } }
export function dropOne(rig, m) { if (!m) return; m.parent?.remove(m); const i = rig.meshes.indexOf(m); if (i >= 0) rig.meshes.splice(i, 1); }
export const hatOf = (rig) => rig.head.children.find((m) => m.isMesh && m !== rig.headMesh);
// small parts cast no shadow (a horde of forty is a lot of shadow casters)
export function noShadow(rig, ...groups) { for (const g of groups) for (const m of g.children) if (m.isMesh) m.castShadow = false; }
// plain skins for models the kit draws almost entirely
export const flatQuad = (base, dark, belly, eye) => (S) => paintQuad(S, { base, dark, belly, eye, teeth: false, nose: dark, noise: 0.1, speckles: 10 });
// a colour from a list with a little jitter, picked at random (a pixel mosaic)
export const mix = (K, cols, j = 0.14) => K.tone(cols, j);
