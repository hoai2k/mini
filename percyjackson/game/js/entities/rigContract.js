// The rig contract: the tags a model builder hangs on a rig, who reads them,
// and validateRig(), which checks a built model carries what it needs.
//
// A builder (models.js, monsters.js, fodder.js, champions.js, bossmodels.js,
// people.js, mortals.js, serpent.js) returns a Rig, QuadRig or SerpentRig.
// The game, the per-part merge (charmat.js), the crowd batcher (gfx/crowd.js),
// the workbench and the checks in percyjackson/perf/ then rely on informal
// tags. This header is their one list. The helpers that set them are
// re-exported below, so a builder can take them all from here.
//
// ---- marks on objects (userData) -------------------------------------------
// markTip(weapon, x, y, z, label)   (character.js) an Object3D named
//     'weaponTip' (userData.weaponTip, .label) at a weapon's point, in skin
//     pixels of the weapon's frame. Read by perf/weapons.cjs (the tip points
//     forward of the hand at rest and at every strike; a shooter's aim),
//     perf/props.cjs (strike), perf/bodysize.cjs (the weapon is left out of
//     the body) and workbench/animlint.js (a weapon pointing backward).
//     Without it: weapons.cjs measures a long prop at its farthest point (a
//     hilt can pass for the tip), bodysize counts the weapon as body.
// markHeld(g)   (character.js) userData.heldProp: something held with no
//     point to aim (a shield, pom-poms, panpipes, a sling, a trailing whip).
//     Read by weapons.cjs (exempt) and bodysize.cjs (left out of the body).
//     Without it: weapons.cjs flags a long held thing as an unmarked weapon.
// markHeadwear(rig, fn) | markHeadwear(obj)   (proportions.js)
//     userData.headwear on every mesh fn adds (a second voxel kit drawn only
//     with the helmet, its K.done() inside fn) or on obj: helmets, crests,
//     plumes, hats, caps, crowns, circlets, horns. Read by bodysize.cjs (left
//     out of the body height) and character.js mergeChildren (kept apart
//     while PART_MERGE is off, for the size checks). Without it: a crest makes
//     a model read taller than its body (the size categories, design/sizes.json).
// userData.noMerge   a mesh code moves, scales or hides on its own: never
//     merged into its part (charmat.js mergeable, character.js mergeChildren).
//     Without it: the mesh is baked into the part and the code moves nothing
//     (anything reachable from rig.extras or another rig field is safe anyway:
//     charmat.js referenced()).
// userData.baseMat   a mesh's own material. Set by every mesh helper
//     (rig.mesh, VoxKit.done, sculpt, cellMesh users). Read by swap() (the hit
//     flash puts it back: Rig, QuadRig, SerpentRig), charmat.js and crowd.js
//     (a part batches only at its base material). Without it: a mesh in
//     rig.meshes loses its material after the first hit flash.
// userData.shell, userData.flames, userData.noLint, userData.crowd   an elite's glow shell
//     (monsterFx.js addEliteShell), the live flame cubes (flames.js), effects
//     out of the animation lint and the bounds, a crowd batch (crowd.js).
//     Never merged, never batched, left out of the lint, photo and size checks.
// userData.parts   (charmat.js) a merged part's source geometries and
//     matrices: the floor and grip guards (keepAbove, extremePoints) read the
//     points of what was merged.
// root.userData.rig   (buildMonsterModel) the rig, so main.js's shader
//     warm-up finds the rigs in its group.
//
// ---- rig fields ------------------------------------------------------------
// rig.extras.*   parts code reaches: animated by models/animate.js animateExtras
//     (wings, tails, snakes, sway, flameHair, key, tongue, breath), moved by
//     the boss patterns (bosses.js, bosses-book1.js: heads, fists, crusher,
//     kilt, blade, ...), named by the checks: trunk (perf/houndlegs.cjs: a
//     full-size hound's chest and haunch blocks, [x0,y0,z0,x1,y1,z1] in skin
//     pixels of the torso; set by bigHound / bigPup), headCore (markHeadCore
//     below), the held and trailing props bodysize.cjs leaves out (weapon,
//     shield, sword, spear, club, axe, gun, pot, whip, sting, ...),
//     hair / mane / beard (islands.cjs), and a person's or mortal's slot
//     meshes (hair, <slot>Parts, <slot>Glow: props.cjs). charmat.js never
//     merges anything reachable from the rig's own fields (referenced()).
//     Without a name: the part is merged away and nothing moves it.
// markHeadCore(rig, c, s)   (proportions.js) rig.extras.headCore = { c, s }:
//     the skull and face (centre and size in head pixels, through the head's
//     reshape). Read by bodysize.cjs (the head rule: a big upright model's
//     head shrinks toward an adult's). Without it: the head is measured from
//     the skin cube (rig.headMesh) or, where the kit replaced that, from every
//     solid mesh on the head: mane, hood, beard and horns count as head.
// rig.tick(dt, e)   per frame, after animate: enemy.js and bosses.js (which
//     gives a boss animateExtras when it has none), the workbench, online.js.
//     buildMonsterModel and buildChampionRig set it to animateExtras and then
//     rig.onTick. Without it: wings, snakes, sways and flames freeze in game.
// rig.onTick(dt, e)   behaviour and guards chained by builders: fodder.js
//     behaviours (charges, swoops, restyled shots), keepAbove() guards.
//     Only runs if rig.tick calls it (monsters and champions do).
// keepAbove(rig, g, opts)   (parts.js) after the pose, pitch group g back
//     until what hangs under it clears the floor (a long club, a low head);
//     chains rig.onTick. Without rig.tick calling onTick, the guard never runs.
// groundLying(rig, lift, skip)   (character.js) lays a fallen body on the
//     floor (Rig and QuadRig death), skipping held parts (heldParts()).
// rig.batchKey   (buildMonsterModel: 'm:<model>@<k>') the crowd batcher's
//     kind (gfx/crowd.js): every live monster of one key draws part by part
//     as one instanced mesh. Without it: never batched (bosses, champions,
//     mortals and the dummy on purpose). Two different looks under one key
//     only cost draws (a part that differs draws alone).
// rig.championLook   a champion's trimmings: crowd.js never batches it.
// rig.levelAim   a shooter (the skeleton's rifle): character.js plays the
//     'shoot' style and aimPose shoulders the weapon in the RIGHT hand, so
//     handR must hold a marked tip (weapons.cjs checks the aim).
// rig.hoverMin   (a Fury's ragged hem) the lowest a boss's swoop flies
//     (bosses.js, bosses-book1.js). Without it a hem drags through the floor.
// rig.float / rig.hover   a floating monster's hover height (enemy.js; the
//     workbench bobs it) / a boss's (bosses.js B.hover, workbench prepStatic).
// rig.hunch, rig.armSpread   static pose offsets (parts.js rigOffsets).
// rig.skirt = { front, back }   cloth pivots on the hips that swing with the
//     legs (character.js; mortals.js hangSkirt; a boss's kilt).
// Slots (people.js, mortals.js): parts.head, torso, hips, armR, armL, handR,
//     handL, legR, legL become one mesh per rig group (rig.extras.hair /
//     <slot>Parts / <slot>Glow); parts.hat its own mesh on the head marked as
//     headwear; parts.skirt the skirt panels; a hand slot is markTip'd
//     (def.tip) or markHeld.
// Hero gear (entities/gear/: equip.js dressHero, weapons.js, armour.js,
//     gearmesh.js): rig.gear = { weapon, armor, family, tier } what the hero
//     wears (null: the hero's own weapon and clothes); rig.extras.weapon the
//     weapon in handR (markTip, label the item id), rig.extras.weaponL the
//     left of a pair; rig.extras.headgear a helmet, hood or hat (markHeadwear);
//     rig.restyle(style) the combo's attack style re-posed for the weapon's
//     family (character.js attackPose); rig.twoHand the left hand on the haft
//     (idle carry and swings); rig.skirt and rig.cape set by the armour; every
//     gear mesh carries userData.gearBoxes (its box list, perf/gear.cjs) and
//     rig.gearParts lists what dressHero hung on, taken off on the next change.
// rig.isQuad / rig.isSerpent   QuadRig / SerpentRig: the checks branch on
//     them (no arms, the jaw as hands, legs on the torso).
// rig.headMesh   the head's skin cube (bodysize.cjs's fallback head).
// rig.meshes   every mesh the hit flash swaps (swap()).
// rig.shape / rig.shapeDone   (proportions.js reshape) parts drawn through a
//     shape by the voxel kit (voxkit.js).
import { markTip, markHeld, groundLying } from './character.js';
import { markHeadCore, markHeadwear } from './proportions.js';
import { keepAbove } from './parts.js';

export { markTip, markHeld, groundLying, markHeadCore, markHeadwear, keepAbove };

// The kinds validateRig knows (the workbench's groups), and what each needs.
export const RIG_KINDS = ['hero', 'npc', 'monster', 'boss', 'champion', 'mortal', 'person'];
export const KIND_OF_GROUP = { heroes: 'hero', npcs: 'npc', monsters: 'monster', bosses: 'boss', champions: 'champion', mortals: 'mortal', people: 'person' };
// rig.extras keys that name a weapon (it must carry a tip, or be marked held)
export const WEAPON_KEYS = ['weapon', 'weaponL', 'sword', 'spear', 'club', 'axe', 'blade', 'gun', 'hammer', 'arrow'];
// rig.extras keys that name headwear (marked, so the size checks leave it out)
export const HEADWEAR_KEYS = ['helmet', 'cap', 'crown', 'hat', 'crest', 'plume', 'headgear'];
// rig.extras keys animateExtras moves every frame (they need rig.tick)
export const ANIMATED_KEYS = ['wings', 'tails', 'snakes', 'sway', 'flameHair', 'key', 'tongue', 'breath'];

const objs = (v) => (Array.isArray(v) ? v.flatMap(objs) : v?.isObject3D ? [v] : v?.root?.isObject3D ? [v.root] : v?.g?.isObject3D ? [v.g] : []);
const within = (o, top) => { for (let x = o; x; x = x.parent) if (x === top) return true; return false; };
const anyUnder = (o, f) => { let hit = false; o.traverse((x) => { if (!hit && f(x)) hit = true; }); return hit; };
const anyAbove = (o, f, top) => { for (let x = o; x && x !== top?.parent; x = x.parent) if (f(x)) return true; return false; };
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const tipOrHeld = (o, rig) => anyUnder(o, (x) => x.userData?.weaponTip || x.userData?.heldProp) || anyAbove(o, (x) => x.userData?.heldProp, rig.root);
const headwearMarked = (o, rig) => anyAbove(o, (x) => x.userData?.headwear, rig.root) || (() => { let n = 0, m = 0; o.traverse((x) => { if (x.isMesh) { n++; if (x.userData?.headwear) m++; } }); return n > 0 && m === n; })();
const kindOf = (rig) => (rig.batchKey || rig.championLook ? (rig.championLook ? 'champion' : 'monster') : rig.person ? 'person' : rig.mortal ? 'mortal' : null);

// Check a built rig against the contract. kind: one of RIG_KINDS (the
// workbench group's, KIND_OF_GROUP), or left out to infer what it can.
// Returns { ok, problems: [text], warnings: [text] }: a problem breaks a
// reader listed above; a warning is a likely gap the reader survives.
export function validateRig(rig, kind = kindOf(rig)) {
  const problems = [], warnings = [];
  const P = (t) => problems.push(t), W = (t) => warnings.push(t);
  if (!rig?.root?.isObject3D) return { ok: false, problems: ['no rig.root'], warnings };
  const X = rig.extras ?? {}, upright = !rig.isQuad && !!rig.head, enemy = kind === 'monster' || kind === 'champion';
  rig.root.updateMatrixWorld(true);
  // every flashed mesh can be put back (swap: userData.baseMat)
  const noBase = (rig.meshes ?? []).filter((m) => m?.isMesh && !m.userData?.baseMat);
  if (noBase.length) P(`${noBase.length} mesh(es) in rig.meshes without userData.baseMat (the hit flash leaves them without a material)`);
  // weapons: named ones carry a tip or are held; a long unmarked hand prop is a gap
  for (const k of WEAPON_KEYS) for (const o of objs(X[k])) if (!tipOrHeld(o, rig)) P(`extras.${k} has no markTip (and is not markHeld)`);
  for (const k of Object.keys(X)) if (/^hand[RL](Parts|Glow)$/.test(k)) for (const o of objs(X[k])) if (!tipOrHeld(o, rig)) P(`extras.${k} (in the hand) has neither markTip nor markHeld`);
  rig.root.traverse((o) => { if (o.userData?.weaponTip && typeof o.userData.label !== 'string') P(`a weaponTip without a label`); });
  if (rig.handR && rig.handL && rig.handR !== rig.handL) for (const hand of [rig.handR, rig.handL]) for (const c of hand.children) {
    if (tipOrHeld(c, rig) || c.userData?.noLint || c.userData?.flames) continue;
    const inv = hand.matrixWorld.clone().invert(), v = c.position.clone().setScalar(0);
    let far = 0;
    c.traverse((m) => { const A = m.isMesh && m.geometry?.attributes?.position; if (!A) return; for (let i = 0; i < A.count; i += Math.max(1, Math.floor(A.count / 300))) far = Math.max(far, v.fromBufferAttribute(A, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv).length()); });
    if (far * rig.root.scale.x >= 0.4) W(`an unmarked long prop in ${hand === rig.handR ? 'handR' : 'handL'} (${c.name || c.type}): markTip or markHeld`);
  }
  // a shooter shoulders its weapon in the right hand
  if (rig.levelAim && !(rig.handR && anyUnder(rig.handR, (x) => x.userData?.weaponTip))) P('rig.levelAim without a markTip weapon in handR (aimPose shoulders the right hand)');
  // a full-size hound names its chest and haunch (perf/houndlegs.cjs)
  if (rig.isQuad && !rig.isSerpent && rig.spec?.big) {
    const T = X.trunk, box = (b) => Array.isArray(b) && b.length === 6 && b.every(finite);
    if (!T) P('a full-size quad (spec.big) without rig.extras.trunk (houndlegs.cjs)');
    else if (!box(T.chest) || !box(T.haunch)) P('rig.extras.trunk needs chest and haunch boxes [x0,y0,z0,x1,y1,z1]');
  }
  // the head core: well formed where named; where the skin cube is gone the head needs one
  const C = X.headCore;
  if (C && !(Array.isArray(C.c) && Array.isArray(C.s) && C.c.length === 3 && C.s.length === 3 && C.c.every(finite) && C.s.every((v) => finite(v) && v > 0))) P('rig.extras.headCore is not { c: [x,y,z], s: [w,h,d] > 0 }');
  if (upright && !C) {
    const hm = rig.headMesh, cube = hm && within(hm, rig.root) && anyAbove(hm, (x) => !x.visible, rig.root) === false;
    if (!cube && kind !== 'hero') W('an upright model whose head skin cube is gone has no markHeadCore (bodysize.cjs measures every mesh on the head)');
  }
  // headwear named in extras is marked
  for (const k of HEADWEAR_KEYS) for (const o of objs(X[k])) if (!headwearMarked(o, rig)) P(`extras.${k} is not markHeadwear'd (bodysize.cjs counts it as body)`);
  // a skirt hangs from two pivots on the rig
  if (rig.skirt && !(rig.skirt.front?.isObject3D && rig.skirt.back?.isObject3D && within(rig.skirt.front, rig.root) && within(rig.skirt.back, rig.root))) P('rig.skirt needs front and back pivots on the rig');
  // numbers the movers read
  for (const k of ['hoverMin', 'float', 'hover', 'hunch', 'armSpread']) if (rig[k] != null && !finite(rig[k])) P(`rig.${k} is not a number`);
  if (rig.batchKey != null && typeof rig.batchKey !== 'string') P('rig.batchKey is not a string');
  if (kind === 'monster' && !rig.batchKey && !rig.mortal) W('a monster without rig.batchKey (never crowd-batched)');
  // what moves every frame needs rig.tick, and rig.tick must run rig.onTick
  const moving = ANIMATED_KEYS.filter((k) => X[k] && (!Array.isArray(X[k]) || X[k].length));
  if (rig.whip) moving.push('whip'); if (rig.flames?.length) moving.push('flames');
  // (a boss without one gets animateExtras from bosses.js; heroes, people and mortals are posed by their own code)
  if (moving.length && typeof rig.tick !== 'function' && (enemy || !kind)) P(`animated parts (${moving.join(', ')}) but no rig.tick (enemy.js only calls rig.tick)`);
  if (typeof rig.onTick === 'function' && (enemy || kind === 'boss')) {
    if (typeof rig.tick !== 'function') P('rig.onTick (behaviour or a keepAbove guard) but no rig.tick to run it (bosses.js\'s default tick only animates extras)');
    else {
      const on = rig.onTick; let ran = false;
      rig.onTick = function (...a) { ran = true; };
      try { rig.tick(0, { state: 'idle', swooping: false, dead: false }); } catch (e) { W(`rig.tick threw on a bare entity: ${e.message}`); ran = true; }
      rig.onTick = on;
      if (!ran) P('rig.tick does not call rig.onTick (its behaviour and keepAbove guards never run)');
    }
  }
  // what extras name hangs on the rig (a part merged away or never added moves nothing)
  for (const [k, v] of Object.entries(X)) for (const o of objs(v)) if (!within(o, rig.root)) W(`extras.${k} is not attached under rig.root`);
  return { ok: !problems.length, problems, warnings };
}
