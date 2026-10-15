// Objective types beyond the built-in ones in mission.js (exorcise, rescue,
// seal). Each is a class built with the Mission (museum.js, chapter 1, adds
// retrySpot, sightChanged and the flags ownLook / quietMist / mistShare); see flag.js for the hooks:
// setup, update, text, netState / applyNet / onNetAct (online), dispose, and
// the flags autoBoss (start the boss in its arena) and keepGates.
import { FlagObjective } from './flag.js';
import { EscapeObjective } from './escape.js';
import { BossObjective } from './boss.js';
import { MuseumObjective } from './museum.js';

export const OBJECTIVES = { flag: FlagObjective, escape: EscapeObjective, boss: BossObjective, museum: MuseumObjective };
