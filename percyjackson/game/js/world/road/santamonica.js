// Santa Monica (the Road West's end, chapters 11 and 12): the beach, the pier
// and its Ferris wheel, the Pacific and, at the end of the pier, the way home
// to Olympus (a model of the Empire State Building in the clouds).
import { B } from '../blocks.js';
import { t } from '../../text_config.js';

export const terrain = {
  height: (x) => (x < 40 ? -Math.max(0, (40 - x) / 14) : 0),
  surface: (x) => (x < 52 ? B.sand : B.sidewalk),
};

export function build(ctx) {
  const { deco, add, ROAD_Z, FY, W, sign } = ctx;
  add.waystone('rt_santamonica', 56, ROAD_Z + 8);
  // the pier: planks out over the water, rails along both sides
  for (let x = 4; x <= 46; x++) for (let dz = -3; dz <= 3; dz++) { const z = ROAD_Z - 2 + dz; W.set(x, FY - 1, z, B.planks); for (let y = FY; y < FY + 4; y++) if (W.get(x, y, z) === B.barrier) W.set(x, y, z, 0); if (Math.abs(dz) === 3) W.set(x, FY, z, B.dark_planks); if (x % 6 === 0 && Math.abs(dz) === 3) for (let y = 1; y < FY - 1; y++) W.set(x, y, z, B.log); }
  deco.prop('ferris_wheel', 24.5, FY, ROAD_Z - 9.5, { r: 5 });
  for (let x = 20; x <= 29; x++) for (let z = ROAD_Z - 11; z <= ROAD_Z - 8; z++) W.set(x, FY - 1, z, B.planks);
  for (let y = FY; y < FY + 3; y++) for (const x of [22, 27]) W.set(x, y, ROAD_Z - 10, B.barrier);
  add.landmark({ id: 'rt_pier', x: 30, z: ROAD_Z - 2 });
  // the beach: umbrellas, a lifeguard tower
  for (const [x, z, c] of [[44, ROAD_Z + 10, 0xd8322a], [36, ROAD_Z + 16, 0x2a6ad8], [48, ROAD_Z + 20, 0xffd84a], [30, ROAD_Z + 22, 0x3ab05a]]) deco.prop('umbrella', x + 0.5, FY, z + 0.5, { color: c });
  deco.prop('lifeguard_tower', 34.5, FY, ROAD_Z + 28.5, { rot: Math.PI / 2 });
  // the end of the pier: the model of the Empire State Building on its cloud
  deco.prop('empire_state', 8.5, FY, ROAD_Z - 1.5, { h: 12, glow: true });
  for (let y = FY; y < FY + 6; y++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) W.set(8 + dx, y, ROAD_Z - 2 + dz, B.barrier);
  W.addLight(8.5, FY + 8, ROAD_Z - 1.5, 0xffe8a0, 5, 14);
  sign(14, ROAD_Z + 1, t('rt.signs.santaMonica'), { w: 3.6, h: 0.9, post: 2.4, bg: '#2ab0c8', fg: '#ffffff', border: '#f2efe6' });
  add.landmark({ id: 'rt_olympus', x: 8, z: ROAD_Z - 2 });
  add.chest({ id: 'rt_sm_pier', x: 6, z: ROAD_Z - 4, rarity: 'epic' });
  add.chest({ id: 'rt_sm_beach', x: 40, z: ROAD_Z + 26, rarity: 'rare' });
}
export const QUESTS = [];
