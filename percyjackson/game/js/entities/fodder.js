// The open world's fodder (concept sheets design/concept/vox-ow-fodder.png,
// -2 and -3, with -fix for the ants and the king crab): the
// monsters you plow through in the Minecraft
// Dungeons way, in hordes, each region with a few kinds that play
// differently (short and long range, small and large) and a tough rare one.
//
//   fields     karpos (swarm melee), karpos slinger (seed pods from range),
//              Colchis bull calf (larger: charges, a short jet of fire)
//   woods      myrmex (swarm melee), myrmex spitter (lobs acid),
//              Calydonian boarlet (larger: charges)
//   shore      crab (scuttles sideways), king crab (rare tank: crusher claw)
//   canyon     (myrmekes and spitters, as in the woods), Earthborn (rare: a
//              six-armed clay giant lobbing mud)
//   labyrinth  Daedalus drone (a bronze clockwork bird firing bolts)
//   othrys     basilisk (the books' arm-long snake, in threes: fast, a puff
//              of fire, a poison touch), Laistrygonian (rare: a huge giant
//              lobbing flaming balls)
//   asphodel   shade (slow, drifts in crowds), keres (fast swooping fliers)
//
// Every model is seen by the hundred, so each has a strong silhouette and a
// bold accent that reads in a crowd (glowing eyes, a fire glow, a gold crown,
// a red claw), and costs little: rounded voxel masses (K.blob: only the
// cells' open faces) and boxes merged into one mesh per moving part
// (the voxel kit, voxkit.js), geometry built once per kind and shared by every
// spawn (the kit's share option), skins shared per kind (no shaders built per spawn; painted
// without a read-back pass), no ambient aura, and small parts cast no shadow. Each bursts into its own bits as it goes (on
// top of the golden dust every monster leaves) with its own small sound
// (audio.js fodderVoice / fodderDie).
//
// Behaviour rides on the existing AIs (entities/enemy.js) through rig.onTick
// (monsters.js calls it every frame): the chargers' bite becomes a dash with
// dust (and for the calf a jet of fire), the keres drop out of the air to
// strike, and the shooters' shots are restyled (seed pods, mud, bolts,
// flaming balls).
//
// monsters.js wires these in (fodderModels below). The stat blocks are
// js/data/fodder.js; the builders are entities/models/fodder/, a module per
// region, with the behaviour and death bits they share in behaviour.js.
import { buildKarpos, buildCalf } from './models/fodder/fields.js';
import { buildMyrmex, buildBoarlet } from './models/fodder/woods.js';
import { buildCrab, buildKingCrab } from './models/fodder/shore.js';
import { buildEarthborn } from './models/fodder/canyon.js';
import { buildDrone } from './models/fodder/labyrinth.js';
import { buildBasilisk, buildLaistrygonian } from './models/fodder/othrys.js';
import { buildShade, buildKeres } from './models/fodder/asphodel.js';

export { FODDER_IDS, FODDER_MONSTERS } from '../data/fodder.js';

// The model builders, keyed by model id (monsters.js takes them in).
export function fodderModels() {
  return {
    karpos: () => buildKarpos(),
    karpos_slinger: () => buildKarpos(true),
    colchis_calf: () => buildCalf(),
    myrmex: () => buildMyrmex(),
    myrmex_spitter: () => buildMyrmex(true),
    boarlet: () => buildBoarlet(),
    crab: () => buildCrab(),
    king_crab: () => buildKingCrab(),
    basilisk: () => buildBasilisk(),
    earthborn: () => buildEarthborn(),
    daedalus_drone: () => buildDrone(),
    laistrygonian: () => buildLaistrygonian(),
    shade: () => buildShade(),
    keres: () => buildKeres(),
  };
}
