import { hound, HELLHOUND } from '../hounds.js';
import { withBuild } from '../../voxkit.js';

// A hellhound as big as a house: soot-black with lava running in its
// cracks, a burning ridge, a gold spiked collar and a furnace for a mouth.
export function buildHellhoundAlpha() {
  // Built like the elite hellhound (monsters.js bigHound, after
  // vox-enemies) and never smaller than it: 15% bigger, with the coat, the
  // cracks and the claws worked at that size (voxkit.js withBuild), so the
  // pack leader is made of more blocks, not bigger ones; a burning ridge of
  // spikes and more fire in its veins set it apart.
  const k = 1.15;
  const rig = withBuild({ k, key: 'b:hellhound_alpha' }, () => hound('boss_hellhound_alpha', HELLHOUND, { fur: 220, cracks: 24, collar: true, alpha: true }));
  rig.baseScale *= k; rig.root.scale.setScalar(rig.baseScale);
  return rig;
}
