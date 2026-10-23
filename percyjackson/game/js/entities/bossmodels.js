// Boss models for The Lightning Thief, after design/concept/vox-bosses-1.png
// (and vox-enemies.png for the Furies and hellhounds, vox-npcs.png for Luke).
// Every skin and prop material is cached, so a boss arriving mid-fight never
// compiles a shader. Each builder returns a Rig or QuadRig; rig.extras holds
// the parts the boss patterns move (whips, heads, beds, the motorcycle).
import { buildFury } from './models/furies.js';
import { bronzeSpider } from './models/spiders.js';
import { withBuild } from './voxkit.js';
import { buildCerberus } from './models/bosses/cerberus.js';
import { buildMinotaur } from './models/bosses/minotaur.js';
import { buildChimera } from './models/bosses/chimera.js';
import { buildHellhoundAlpha } from './models/bosses/hellhoundAlpha.js';
import { buildMedusa } from './models/bosses/medusa.js';
import { buildProcrustes } from './models/bosses/procrustes.js';
import { buildAres } from './models/bosses/ares.js';
import { buildLuke } from './models/bosses/luke.js';
export { buildBed } from './models/bosses/procrustes.js';

export const BOSS_MODELS = {
  // Alecto: Mrs. Dodds as she really is (vox-enemies, bottom right). (size
  // audit, round 4: her body, standing, without wings and whip, looms at about
  // 1.9× Percy (scale 1.75 → 2.8); her sisters 1.7× (1.6 → 2.5); the plain
  // Fury 1.4× (2.1). Her stats and reaches follow in bosses.js.)
  alecto: () => withBuild({ key: 'b:alecto' }, () => buildFury('alecto', { scale: 2.8, seed: 71 })),
  megaera: () => withBuild({ key: 'b:megaera' }, () => buildFury('megaera', { scale: 2.5, skin: 0xa8ae98, hair: 0xb8b8b0, wing: 0x4a3424, seed: 72 })),
  tisiphone: () => withBuild({ key: 'b:tisiphone' }, () => buildFury('tisiphone', { scale: 2.5, skin: 0xa8a2a8, hair: 0xf0f0ec, wing: 0x5a2a22, dress: 0x24141a, mouthGrin: false, seed: 73 })),
  minotaur: () => buildMinotaur(),
  chimera: () => buildChimera(),
  hellhound_alpha: () => buildHellhoundAlpha(),
  medusa: () => buildMedusa(),

  // Hephaestus's mechanical queen: the bronze spider at boss size, with a
  // crown of spikes, gears turning in her abdomen and a furnace glow.
  // (each boss built through the kit keeps its geometry for the next build: withBuild key)
  spiders: () => withBuild({ key: 'b:spiders' }, () => bronzeSpider('boss_spider_queen', { scale: 2.6, queen: true })),
  procrustes: () => buildProcrustes(),
  cerberus: () => buildCerberus(),
  ares: () => buildAres(),
  luke: () => buildLuke(),
};
