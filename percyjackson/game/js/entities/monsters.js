// The Greek monster bestiary, one module for its callers: the model registry
// (buildMonsterModel, keyed by a stat block's model), and the stat blocks,
// the builders, the shared animation and the effects passed on from where
// they live:
//   js/data/monsters.js        the stat blocks (MONSTERS; no Three.js)
//   entities/models/*.js       the builders, one module per family
//   entities/models/animate.js animateExtras, every monster's extras each frame
//   entities/monsterFx.js      golden dust, the Mist's puff, the elite outline
//   entities/fodder.js         the open world's fodder (its own registry)
// Tiers: minor (swarms, two or three hits), elite (a threat with a tell),
// champion (mini-boss), boss (see bosses.js). Monsters never bleed: they
// burst into golden dust (monsterFx.js goldDust).
// The looks follow the 3D sheets in design/concept/vox-enemies.png and
// vox-bosses-*.png: soot-black hellhounds with lava cracks and gold spiked
// collars, boxy bronze spiders with glowing eyes, snake-haired dracaenae in
// gold armour, flaming-haired cheerleader empousai, white-haired Furies in
// ragged black with leather wings, skeletons in combat gear.
import { withBuild } from './voxkit.js';
import { mergeRig } from './charmat.js';
import { buildSerpent } from './serpent.js';
import { fodderModels } from './fodder.js';
import { animateExtras } from './models/animate.js';
import { HELLHOUND, PUP, hound } from './models/hounds.js';
import { eagle } from './models/birds.js';
import { buildFury } from './models/furies.js';
import { bronzeSpider, buildScorpion } from './models/spiders.js';
import { buildDracaena } from './models/dracaena.js';
import { buildEmpousa } from './models/empousa.js';
import { buildSkeleton, buildSpartoi, buildStatue, buildGhost } from './models/skeletons.js';
import { buildCyclops } from './models/cyclops.js';
import { buildRat, buildTelekhine, buildAutomaton } from './models/small.js';

export { MONSTERS, LEGACY_KINDS, MONSTER_IDS, CURSES, resolveKind } from '../data/monsters.js';
export { animateExtras } from './models/animate.js';
export { addWhip } from './models/whip.js';
export { addWings, eagle } from './models/birds.js';
export { buildFury } from './models/furies.js';
export { HELLHOUND, PUP, hound } from './models/hounds.js';
export { bronzeSpider, buildScorpion } from './models/spiders.js';
export { buildSkeleton } from './models/skeletons.js';
export { cycDensity, buildCyclops } from './models/cyclops.js';
export { goldDust, mistPuff, eliteMaterial, addEliteShell } from './monsterFx.js';

// (compatibility: perf/islands.cjs reaches the kit class through this module; the kit is voxkit.js)
export { VoxKit } from './voxkit.js';

// The builders by model id: a stat block's model names one.
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
  harpy: () => eagle('harpy', { scale: 1.2 }),   // (about 1.1× Percy)
  // Stymphalian bird: a level bronze bird of prey in knife feathers (bronzeHunter);
  // Pausanias's man-eaters are "of the size of a crane": a wingspan over twice
  // Percy's height and a body the size of a big dog
  stymphalian: () => eagle('stymphalian', { scale: 1.5, metal: true, form: 'hunter' }),
  // the plain Fury: her body, standing, without wings and whip, about 1.4×
  // Percy's height, under the boss sisters (2.5, Alecto 2.8); she flies high
  // enough that her long hem clears the floor at the bottom of her bob
  fury: () => buildFury('fury', { scale: 2.1, float: 1.25 }),
  dracaena: () => buildDracaena(),
  empousa: () => buildEmpousa(),
  scorpion: () => buildScorpion(),
  skeleton: () => buildSkeleton(),
  spartoi: () => buildSpartoi(),
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
