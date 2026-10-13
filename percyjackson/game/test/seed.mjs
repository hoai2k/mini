// Every test file imports this first: Math.random becomes a seeded generator,
// so anything a test rolls (items, groups, rooms, loot) comes out the same on
// every run. TEST_SEED=<n> tries another seed, to hunt for luck-dependent tests.
import { mulberry32 } from '../js/util.js';

export const SEED = Number(process.env.TEST_SEED ?? 20261013) >>> 0;
Math.random = mulberry32(SEED);
