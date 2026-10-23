// The Greek monster bestiary: blocky models (procedurally painted skins,
// shared per kind so spawning never compiles shaders) and stat blocks.
// Tiers: minor (swarms, two or three hits), elite (a threat with a tell),
// champion (mini-boss), boss (see bosses.js). Monsters never bleed: they
// burst into golden dust (goldDust below).
// The looks follow the 3D sheets in design/concept/vox-enemies.png and
// vox-bosses-*.png: soot-black hellhounds with lava cracks and gold spiked
// collars, boxy bronze spiders with glowing eyes, snake-haired dracaenae in
// gold armour, flaming-haired cheerleader empousai, white-haired Furies in
// ragged black with leather wings, skeletons in combat gear.
import { fodderModels } from './fodder.js';
import { buildSerpent } from './serpent.js';
import { mergeRig } from './charmat.js';
import { withBuild } from './voxkit.js';
import { eagle } from './models/birds.js';
import { buildFury } from './models/furies.js';
import { animateExtras } from './models/animate.js';
import { HELLHOUND, PUP, hound } from './models/hounds.js';
import { buildRat, buildTelekhine, buildAutomaton } from './models/small.js';
import { bronzeSpider, buildScorpion } from './models/spiders.js';
import { buildDracaena } from './models/dracaena.js';
import { buildEmpousa } from './models/empousa.js';
import { buildSkeleton, buildSpartoi, buildStatue, buildGhost } from './models/skeletons.js';
import { buildCyclops } from './models/cyclops.js';
export { addWings, eagle } from './models/birds.js';
export { addWhip } from './models/whip.js';
export { buildFury } from './models/furies.js';
export { animateExtras } from './models/animate.js';
export { HELLHOUND, PUP, hound } from './models/hounds.js';
export { bronzeSpider, buildScorpion } from './models/spiders.js';
export { buildSkeleton } from './models/skeletons.js';
export { cycDensity, buildCyclops } from './models/cyclops.js';
export { goldDust, mistPuff, eliteMaterial, addEliteShell } from './monsterFx.js';
export { MONSTERS, LEGACY_KINDS, MONSTER_IDS, CURSES, resolveKind } from '../data/monsters.js';

// (compatibility: perf/islands.cjs reaches the kit class through this module; the kit is voxkit.js)
export { VoxKit } from './voxkit.js';
const MODELS = {
  pup: () => hound('pup', PUP, { cracks: 10 }),
  rat: () => buildRat(),
  hellhound: () => hound('hellhound', HELLHOUND, { fur: 170, cracks: 14, collar: true }),
  spider: () => bronzeSpider('spider', { scale: 0.85 }),
  // A serpent out of the Mist (what a "person" in the museum may really be,
  // entities/mistPeople.js): a long green snake banded in gold, rearing its
  // head and hood, with a flickering forked tongue. Nothing like a person.
  // (entities/serpent.js: a legless spine that slithers, rears and strikes)
  serpent: () => buildSerpent(),
  automaton: () => buildAutomaton(),
  harpy: () => eagle('harpy', { scale: 1.2 }),   // (size audit: ×1.2, then round 6 sculpted her taller at that voxel size, about 1.1× Percy)
  // Stymphalian bird: a level bronze bird of prey in knife feathers (bronzeHunter)
  // (size audit, round 4: Pausanias's man-eaters are "of the size of a crane";
  // ×1.36, a wingspan over twice Percy's height and a body the size of a big dog)
  stymphalian: () => eagle('stymphalian', { scale: 1.5, metal: true, form: 'hunter' }),
  // (size audit, round 4: the owner found her smaller than Percy. Her body,
  // standing, without wings and whip, is now about 1.4× his height (scale 1.5
  // → 2.1), under the boss sisters (2.5, Alecto 2.8); she flies a little higher
  // so her longer hem clears the floor at the bottom of her bob)
  fury: () => buildFury('fury', { scale: 2.1, float: 1.25 }),
  dracaena: () => buildDracaena(),
  empousa: () => buildEmpousa(),
  scorpion: () => buildScorpion(),
  skeleton: () => buildSkeleton(),
  spartoi: () => buildSpartoi(),
  // Telekhine (design/concept/vox-telekhine.png; the sea-demon smiths of
  // Rhodes, Hephaestus's old forge hands): half dog, half seal, sitting up
  // like a sea lion on wide front flippers, the body tapering back to a
  // fluked tail. Grey-blue hide speckled teal, a cream throat and muzzle, a
  // dog's head with a blunt seal snout, fangs and glowing orange eyes; a
  // leather smith's apron, a harness with brass buckles and tools, and an
  // iron cauldron of green-orange Greek fire on its back that it lobs at you.
  telekhine: () => buildTelekhine(),
  cyclops: () => buildCyclops(),
  gorgon_statue: () => buildStatue(),
  ghost: () => buildGhost(),
  // the open world's and the Road West's fodder and their larger kin (entities/fodder.js)
  ...fodderModels(),
};

// opts.k: build it this much bigger (a champion, voxkit.js withBuild): its skin,
// kit and blobs are made finer to match, so it is not just the kind enlarged.
export function buildMonsterModel(model, { k } = {}) { const id = MODELS[model] ? model : 'pup'; const rig = withBuild({ k, key: `m:${id}` }, () => MODELS[id]()); rig.tick = (dt, e) => { animateExtras(rig, dt, e); rig.onTick?.(dt, e); }; mergeRig(rig); rig.batchKey ??= `m:${id}@${(k ?? 1).toFixed(3)}`; rig.root.userData.rig = rig; return rig; }   // (batchKey: gfx/crowd.js draws a crowd of one kind as instanced parts)
export const buildCurseModel = buildMonsterModel;
// Build one of each model and throw it away, filling the skin and geometry
// caches, so the first spawn of a big kind (the hellhound's first build is
// several hundred ms) happens at a load screen instead of mid-fight.
export function prewarmModels(models) { for (const m of models) buildMonsterModel(m); }
