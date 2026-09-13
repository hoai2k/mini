/** flyers shadows of missions two and three. See LEVEL-PLAN-M2-M3.md for
 * each kind's contract; the numbers are in combat3d's SPECS. */
import type { ShadowBehaviour } from '../combat3d';
import type { ShadowKind } from '../district';

export const FLYERS: Partial<Record<ShadowKind, ShadowBehaviour>> = {};
