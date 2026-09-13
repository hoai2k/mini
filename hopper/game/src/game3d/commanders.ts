/** The three commanders, by the kind a district's boss spec names. */
import type { BossSpec } from './district';
import type { World } from './world';
import { NightRook, type Commander } from './boss3d';
import { SmelterLeviathan } from './leviathan3d';
import { EclipseRegent } from './regent3d';

export function makeCommander(spec: BossSpec, world: World): Commander {
  switch (spec.kind) {
    case 'smelterLeviathan':
      return new SmelterLeviathan(spec, world);
    case 'eclipseRegent':
      return new EclipseRegent(spec, world);
    default:
      return new NightRook(spec, world);
  }
}
