// Dressing a hero in their gear: the weapon in the hand and the armour on
// the body, changed live (no rebuild of the hero, no reload).
//
//   dressHero(rig, { weapon, armor, tier })   item ids (loot.js), or null
//   gearOf(items)                             { weapon, armor, tier } from a hero's equipped items
//
// The hero's own look (models.js buildHeroModel) stays underneath: shoes,
// cuffs, beads and buckles are drawn in the same mesh as the armour on each
// bone, so a dressed hero costs about one draw per bone that wears
// something, plus the weapon, a helmet or hood, the two skirt panels and the
// two cape segments when the armour has them (perf/gear.cjs prints the
// counts).
//
// Hero identity (the signature weapon): each hero's own weapon is their
// look in the books and the heart of their kit: Riptide (Percy throws it),
// Annabeth's knife, Clarisse's and Thalia's spears, Nico's Stygian sword,
// Grover's reed pipes, Tyson's fists. Every new game starts every hero with
// the Camp Training Sword, so that starter (or no weapon at all) is drawn as
// the hero's own signature weapon, with the kit's own attack poses. Any other
// weapon shows as itself, Minecraft Dungeons style, and the combo is
// re-posed for its family (weapons.js FAMILY): a hammer slams where a sword
// would thrust, a spear thrusts where a sword would cut back, two knives cut
// with both hands.
//
// Magic items have no model on the hero: they show when used (artifacts.js
// draws each one's effect: the bolt, the net, the owl, the pegasus...), and
// a hero's draw calls stay low.
import * as THREE from 'three/webgpu';
import { PX } from '../character.js';
import { applyShape } from '../proportions.js';
import { gearMesh, gearMaterial } from './gearmesh.js';
import { buildWeapon, WEAPON_LOOKS, FAMILY } from './weapons.js';
import { armourPieces } from './armour.js';
import { itemInfo, itemTier } from '../../loot.js';

// the starter every hero is given: drawn as the hero's own weapon
export const SIGNATURE_STAND_IN = new Set(['training_sword']);
export const showsSignature = (weapon) => !weapon || SIGNATURE_STAND_IN.has(weapon) || !WEAPON_LOOKS[weapon];

// a hero's equipped items (save.gearFor: [weapon, armour, magic, magic]) as gear ids
export function gearOf(items) {
  const out = { weapon: null, armor: null, tier: null };
  for (const it of items ?? []) {
    if (!it) continue;
    const b = itemInfo(it);
    if (b?.kind === 'weapon') { out.weapon = b.id; out.tier = itemTier(it); }
    if (b?.kind === 'armor') out.armor = b.id;
  }
  return out;
}
export const gearKey = (g) => `${g?.weapon ?? ''}|${g?.armor ?? ''}|${g?.tier === 'heroic' ? 'h' : ''}`;

const BONES = ['torso', 'armR', 'armL', 'legR', 'legL'];
function drop(rig, o) {
  o.removeFromParent();
  o.traverse((m) => {
    if (!m.isMesh) return;
    const i = rig.meshes.indexOf(m); if (i >= 0) rig.meshes.splice(i, 1);
    m.geometry?.dispose();
  });
}
function addMesh(rig, parent, list, unit = PX) {
  if (!list?.length) return null;
  const m = gearMesh(list, rig.gearMat, unit);
  rig.meshes.push(m); parent.add(m);
  return m;
}

export function dressHero(rig, gear = {}) {
  const key = gearKey(gear);
  if (rig.gearKey === key) return rig;
  rig.gearMat ??= gearMaterial(rig.material);
  for (const o of rig.gearParts ?? []) drop(rig, o);
  const parts = rig.gearParts = [];
  const look = rig.look ?? {}, w = look.wide ?? 1, kz = 1 + (w - 1) * 0.6;

  // ---- the weapon
  const sig = rig.signature ?? {};
  const weapon = showsSignature(gear.weapon) ? null : gear.weapon;
  delete rig.extras.weaponL;
  if (!weapon) {
    if (sig.weapon && !sig.weapon.parent) sig.hand.add(sig.weapon);
    if (sig.weapon) rig.extras.weapon = sig.weapon; else delete rig.extras.weapon;
    if (sig.pipes) sig.pipes.visible = true;
    rig.restyle = null; rig.twoHand = false;
  } else {
    sig.weapon?.removeFromParent();
    const fam = WEAPON_LOOKS[weapon].fam, F = FAMILY[fam], tier = gear.tier;
    const R = buildWeapon(weapon, { material: rig.gearMat, tier });
    rig.handR.add(R); parts.push(R); rig.meshes.push(...R.children.filter((m) => m.isMesh));
    rig.extras.weapon = R;
    if (F.hands === 'twin') {
      const Lw = buildWeapon(weapon, { material: rig.gearMat, tier, mirror: true });
      rig.handL.add(Lw); parts.push(Lw); rig.meshes.push(...Lw.children.filter((m) => m.isMesh));
      rig.extras.weaponL = Lw;
    }
    // (the left hand holds the second knife or joins a two-handed grip: Grover's pipes go away meanwhile)
    if (sig.pipes) sig.pipes.visible = F.hands === 'one';
    const map = F.styles;
    rig.restyle = (s) => map[s] ?? s;
    rig.twoHand = F.hands === 'two';
  }

  // ---- the armour, with the hero's own outfit blocks on the same meshes
  const A = armourPieces(gear.armor) ?? {}, own = rig.outfitLists ?? {};
  for (const b of BONES) {
    const m = addMesh(rig, rig[b], [...(own[b] ?? []), ...(A[b] ?? [])]);
    if (!m) continue;
    parts.push(m);
    if (b === 'torso' && w !== 1) m.scale.set(w, 1, kz);
    if ((b === 'armR' || b === 'armL') && w !== 1) m.scale.set(1.15, 1, 1.15);
  }
  if (rig.shape) applyShape(rig);   // (longer legs: the leg's blocks drawn along it, proportions.js)
  // the head: in head pixels, marked as headwear (bodysize.cjs leaves it out of the body)
  if (A.head) {
    const hs = (rig.dims.headS / 8) * 1.12, m = addMesh(rig, rig.head, A.head);
    m.scale.setScalar(hs); m.userData.headwear = true; parts.push(m);
    rig.extras.headgear = m;
  } else delete rig.extras.headgear;
  for (const k of ['cap', 'helmet']) if (rig.extras[k] && !rig.extras[k].userData?.gear) rig.extras[k].visible = !A.head;
  if (rig.extras.collar) rig.extras.collar.visible = !A.covers;
  if ((A.hair ?? null) !== (rig.hairCut ?? null)) rig.rebuildHair?.(A.hair ?? null);
  // the skirt panels on the hips (character.js swingSkirt)
  if (A.front || A.back) {
    const sk = {};
    for (const side of ['front', 'back']) {
      const p = new THREE.Group(); p.name = 'skirt:' + side;
      if (w !== 1) p.scale.set(kz, 1, kz);
      rig.hips.add(p); parts.push(p); sk[side] = p;
      addMesh(rig, p, A[side]);
    }
    rig.skirt = sk;
  } else delete rig.skirt;
  // the cape chain on the torso's back (character.js physics)
  rig.cape = [];
  if (A.cape) {
    let parent = new THREE.Group(); parent.name = 'cape';
    parent.position.set(0, 11.2 * PX, -2.9 * PX * kz); if (w !== 1) parent.scale.set(w, 1, 1);
    rig.torso.add(parent); parts.push(parent);
    const segH = A.cape.len / A.cape.segs.length;
    A.cape.segs.forEach((list, i) => {
      const seg = new THREE.Group(); if (i > 0) seg.position.y = -segH * PX;
      addMesh(rig, seg, list); parent.add(seg);
      rig.cape.push({ g: seg, a: 0.1, v: 0 });
      parent = seg;
    });
  }
  rig.gear = { weapon: weapon ?? null, armor: armourPieces(gear.armor) ? gear.armor : null, family: weapon ? WEAPON_LOOKS[weapon].fam : null, tier: weapon ? gear.tier ?? null : null };
  rig.gearKey = key;
  return rig;
}

// The weapon a hero holds, as a fresh model (Percy's Riptide Throw throws what he holds).
export function heldWeaponModel(rig, fallback) {
  const id = rig?.gear?.weapon;
  return id ? buildWeapon(id, { material: rig.gearMat }) : fallback();
}
