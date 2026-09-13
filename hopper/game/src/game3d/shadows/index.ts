/** The behaviours of the mission-two and mission-three shadows, one file per
 * class of shadow. Each is a state machine over `ShadowContext`; the six
 * original kinds still live in combat3d's own switch. A kind with no entry
 * here stands idle, which is what a new kind does until its file is written.
 */
import type { ShadowBehaviour } from '../combat3d';
import type { ShadowKind } from '../district';
import { GROUND } from './ground';
import { ROOTED } from './rooted';
import { FLYERS } from './flyers';

export const BEHAVIOURS: Partial<Record<ShadowKind, ShadowBehaviour>> = { ...GROUND, ...ROOTED, ...FLYERS };
