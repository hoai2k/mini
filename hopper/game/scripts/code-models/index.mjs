/** Registry of code-built model builders, by stand-in id. Each builder takes
 * the LOD level (0 full, 1 distant) and returns a three.js root. */
import { fieldsBuilders } from './fields.mjs';
import { mountainsBuilders } from './mountains.mjs';
import { terrainBuilders, prepareTerrain } from './terrain.mjs';

export const BUILDERS = { ...fieldsBuilders, ...mountainsBuilders };
export { terrainBuilders, prepareTerrain };
