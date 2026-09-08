/** Registry of every procedural stand-in.
 * createStandIn('enemy.shadeHound') builds a stand-in by the same id the
 * design's standin-manifest.json uses, so swapping a stand-in for a final
 * asset is a manifest change, not a code change.
 */
import { ENEMIES, BOSSES } from './creatures.js';
import { STRUCTURES } from './structures.js';
import { PROPS } from './props.js';
import { makeTerrain, makeHorizon, makeSkyDome, makeLandmark, makeFog, makeHeightField } from './terrain.js';
import { makeHopperProxy, HOPPER_SOCKETS, RIDER_SOCKETS, HOPPER_CLIPS, HOPPER_HEIGHT_M } from './hopper.js';
import { REGIONS, regionById, HOPPER, SHADOW, SURFACE } from './palette.js';
import { TEXTURE_NAMES, paintTexture, makeTexture, makeSkyTexture, paintSky } from './textures.js';
import { measure, socketNames } from './kit.js';

const registry = new Map();
for (const [k, f] of Object.entries(ENEMIES)) registry.set(`enemy.${k}`, f);
for (const [k, f] of Object.entries(BOSSES)) registry.set(`boss.${k}`, f);
for (const [k, f] of Object.entries(STRUCTURES)) registry.set(`structure.${k}`, f);
for (const [k, f] of Object.entries(PROPS)) registry.set(`prop.${k}`, f);
registry.set('hopper.proxy', makeHopperProxy);
registry.set('terrain.heightfield', (o = {}) => makeTerrain(regionById(o.region || 'fields'), o));
registry.set('terrain.horizon', (o = {}) => makeHorizon(regionById(o.region || 'fields'), o));
registry.set('terrain.sky', (o = {}) => makeSkyDome(regionById(o.region || 'fields'), o));
registry.set('terrain.landmark', (o = {}) => makeLandmark(regionById(o.region || 'fields'), o));

export function listStandIns() {
  return [...registry.keys()];
}
export function hasStandIn(id) {
  return registry.has(id);
}
export function createStandIn(id, options = {}) {
  const f = registry.get(id);
  if (!f) throw new Error(`No stand-in registered for ${id}`);
  return f(options);
}

export {
  ENEMIES,
  BOSSES,
  STRUCTURES,
  PROPS,
  REGIONS,
  regionById,
  HOPPER,
  SHADOW,
  SURFACE,
  TEXTURE_NAMES,
  paintTexture,
  paintSky,
  makeTexture,
  makeSkyTexture,
  makeTerrain,
  makeHorizon,
  makeSkyDome,
  makeLandmark,
  makeFog,
  makeHeightField,
  makeHopperProxy,
  HOPPER_SOCKETS,
  RIDER_SOCKETS,
  HOPPER_CLIPS,
  HOPPER_HEIGHT_M,
  measure,
  socketNames,
};
