// Block registry. id 0 is air. Each block names atlas tiles for its top,
// sides and bottom plus material hints used by the mesher and gameplay:
//   rough  – roughness written per-vertex (low = shiny: SSR picks it up)
//   metal  – metalness per-vertex
//   emit   – emissive strength (lanterns, windows, lava)
//   liquid – 'water' | 'cursed' | 'lava' (drawn by the liquid mesher)
//   hp     – destructible blocks break into debris after this much damage
//   step   – footstep surface ('stone' | 'grass' | 'wood' | 'metal' | 'water' | 'sand')
//   light  – [hex, intensity, distance] static light source (lanterns etc.)
import { TILE_INDEX as T } from '../gfx/textures.js';

const defs = [];
export const B = {};
function def(name, tiles, opts = {}) {
  const id = defs.length;
  const t = typeof tiles === 'string' ? { top: tiles, side: tiles, bottom: tiles } : tiles;
  defs.push({
    id, name,
    top: T[t.top], side: T[t.side ?? t.top], bottom: T[t.bottom ?? t.top],
    solid: opts.solid ?? true, opaque: opts.opaque ?? true,
    rough: opts.rough ?? 0.85, metal: opts.metal ?? 0, emit: opts.emit ?? 0,
    liquid: opts.liquid ?? null, hp: opts.hp ?? 0, step: opts.step ?? 'stone',
    light: opts.light ?? null, debris: opts.debris ?? 6,
  });
  B[name] = id;
  return id;
}

def('air', 'stone', { solid: false, opaque: false });
def('stone', 'stone');
def('stone_brick', 'stone_brick');
def('mossy_brick', 'mossy_brick');
def('cracked_brick', 'cracked_brick', { hp: 40, debris: 10 });
def('dark_brick', 'dark_brick');
def('red_brick', 'red_brick');
def('cobble', 'cobble');
def('dirt', 'dirt', { step: 'grass' });
def('grass', { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, { step: 'grass' });
def('cursed_grass', { top: 'cursed_grass_top', side: 'cursed_grass_side', bottom: 'dirt' }, { step: 'grass' });
def('moss_floor', { top: 'moss_floor', side: 'dirt' }, { step: 'grass' });
def('planks', 'planks', { step: 'wood' });
def('dark_planks', 'dark_planks', { step: 'wood' });
def('floor_boards', 'floor_boards', { step: 'wood', rough: 0.45 });
def('log', { top: 'log_top', side: 'log_side' }, { step: 'wood' });
def('roof', 'roof_tile', { rough: 0.5 });
def('red_lacquer', 'red_lacquer', { rough: 0.35, step: 'wood' });
def('pillar_red', 'red_lacquer', { rough: 0.35, step: 'wood', hp: 60, debris: 8 });
def('tatami', { top: 'tatami', side: 'dark_planks' }, { step: 'wood' });
def('asphalt', { top: 'asphalt', side: 'concrete' }, { rough: 0.3 });   // wet night streets
def('asphalt_line', { top: 'asphalt_line', side: 'concrete' }, { rough: 0.3 });
def('concrete', 'concrete');
def('concrete_pillar', 'concrete', { hp: 70, debris: 10 });
def('subway_tile', 'subway_tile', { rough: 0.25 });
def('subway_floor', { top: 'subway_floor', side: 'concrete' }, { rough: 0.2 });
def('metal_grate', 'metal_grate', { metal: 0.8, rough: 0.4, step: 'metal', opaque: true });
def('sand', 'sand', { step: 'sand' });
def('water', 'water', { solid: false, opaque: false, liquid: 'water', step: 'water' });
def('cursed_pool', 'cursed_pool', { solid: false, opaque: false, liquid: 'cursed', emit: 1.6, light: [0xb040ff, 5, 9] });
def('lava', 'lava', { solid: false, opaque: false, liquid: 'lava', emit: 2.2, light: [0xff7a2a, 6, 10] });
def('lantern', 'lantern', { emit: 1.8, light: [0xffa850, 5, 10], hp: 10, debris: 4 });
def('gold_trim', 'gold_trim', { metal: 0.9, rough: 0.3 });
def('plaster', 'plaster');
def('shoji', 'shoji', { step: 'wood', hp: 15, debris: 6 });
def('obsidian', 'obsidian', { rough: 0.25 });
def('leaves', 'leaves', { step: 'grass' });
def('dead_leaves', 'dead_leaves', { step: 'grass' });
def('polished', 'polished', { rough: 0.12, metal: 0.1 });
def('marble', 'marble', { rough: 0.15 });
def('window', { top: 'concrete', side: 'window' }, { emit: 1.1 });
def('window_dark', { top: 'concrete', side: 'window_dark' }, { rough: 0.1 });
def('crate', 'crate', { hp: 12, step: 'wood', debris: 8 });
def('barrel', { top: 'barrel_top', side: 'barrel_side' }, { hp: 12, step: 'wood', debris: 8 });
def('bone_block', 'bone_block');
def('talisman_wall', 'talisman_wall');
def('blood_brick', 'blood_brick');
def('void_floor', 'void_floor', { emit: 0.6, rough: 0.1 });
def('shrine_floor', 'shrine_floor', { rough: 0.3 });
def('shadow_floor', 'shadow_floor', { rough: 0.05, metal: 0.3 });
def('vending', { top: 'concrete', side: 'vending' }, { emit: 0.9, hp: 30, step: 'metal', light: [0xff6a8a, 2.5, 6] });
def('sign', { top: 'concrete', side: 'sign' }, { emit: 1.2 });
def('neon_pink', 'neon_pink', { emit: 2.5, light: [0xff5fb0, 3, 8] });
def('blue_energy', 'blue_energy', { emit: 0.45, light: [0x5ad8ff, 3, 7] });
def('rail', { top: 'rail', side: 'concrete' }, { step: 'metal' });
def('bark_dark', { top: 'log_top', side: 'bark_dark' }, { step: 'wood' });
def('dirt_path', { top: 'cobble', side: 'dirt' });
def('barrier', 'stone', { opaque: false });   // invisible wall

// ---------------------------------------------------------------- Half-Blood Quests
// Camp Half-Blood
def('clapboard', 'clapboard_blue', { step: 'wood' });                 // the Big House siding
def('white_trim', 'white_trim', { step: 'wood', rough: 0.6 });
def('window_day', { top: 'white_trim', side: 'window_day' }, { rough: 0.15 });
def('roof_slate', 'roof_slate', { rough: 0.55 });
def('roof_terracotta', 'roof_terracotta', { rough: 0.6 });
def('marble_white', 'marble_white', { rough: 0.2 });
def('column', { top: 'column_top', side: 'column_side' }, { rough: 0.25, hp: 60, debris: 8 });
def('column_solid', { top: 'column_top', side: 'column_side' }, { rough: 0.25 });   // never breaks (hub)
def('bronze', 'bronze', { metal: 0.5, rough: 0.35, step: 'metal' });
def('sea_stone', 'sea_stone');
def('red_plank', 'red_plank', { step: 'wood', rough: 0.5 });
def('owl_stone', 'owl_stone');
def('gold_plate', 'gold_plate', { metal: 0.55, rough: 0.3, step: 'metal' });
def('silver_plate', 'silver_plate', { metal: 0.5, rough: 0.25, step: 'metal', emit: 0.12 });
def('pink_plaster', 'pink_plaster');
def('old_plank', 'old_plank', { step: 'wood' });
def('vine_wall', 'vine_wall', { step: 'wood' });
def('grass_roof', { top: 'grass_roof', side: 'grass_roof', bottom: 'dirt' }, { step: 'grass' });
def('iron_plate', 'iron_plate', { metal: 0.7, rough: 0.4, step: 'metal' });
def('lightning_stone', 'lightning_stone', { rough: 0.2 });
def('gravel_path', { top: 'gravel_path', side: 'dirt' }, { step: 'sand' });
def('strawberry_bed', { top: 'strawberry_top', side: 'farm_soil', bottom: 'dirt' }, { step: 'grass' });
def('farm_soil', { top: 'farm_soil', side: 'dirt' }, { step: 'grass' });
def('pine_leaves', 'pine_leaves', { step: 'grass' });
def('pine_log', { top: 'log_top', side: 'pine_bark' }, { step: 'wood' });
def('forest_floor', { top: 'forest_floor', side: 'dirt' }, { step: 'grass' });
def('rock', 'rock');
def('basalt', 'basalt');
def('target', { top: 'hay', side: 'target_face' }, { step: 'grass', hp: 8, debris: 6 });
def('hay', 'hay', { step: 'grass', hp: 10, debris: 6 });
def('awning', 'awning', { step: 'wood' });
def('teal_panel', 'teal_panel', { rough: 0.4 });
def('navy_panel', 'navy_panel', { rough: 0.4 });
def('shingle_green', 'shingle_green', { rough: 0.55 });
// Museum (chapter 1)
def('marble_floor', { top: 'marble_floor', side: 'marble_white' }, { rough: 0.12 });
def('gallery_wall', { top: 'marble_white', side: 'gallery_wall' }, { rough: 0.5 });
// Looks exactly like gallery_wall; the Mist system dissolves these when a hero sees through the Mist.
def('mist_wall', { top: 'marble_white', side: 'gallery_wall' }, { rough: 0.5 });
def('key_frieze', { top: 'marble_white', side: 'key_frieze', bottom: 'marble_white' }, { rough: 0.3, metal: 0.25 });
def('vase_frieze', { top: 'marble_white', side: 'vase_frieze', bottom: 'marble_white' }, { rough: 0.4 });
def('glass', 'glass', { opaque: false, rough: 0.05, hp: 6, debris: 5 });
def('plinth', 'plinth', { rough: 0.2 });
def('carpet_red', { top: 'carpet_red', side: 'marble_white' }, { step: 'wood', rough: 0.9 });
// Storm hill / farmland (chapter 2) and the camp woods (chapter 3)
def('barn_red', 'barn_red', { step: 'wood', hp: 30, debris: 8 });
def('dirt_road', { top: 'dirt_road', side: 'dirt' }, { step: 'grass' });
def('mud', { top: 'mud', side: 'dirt' }, { step: 'water', rough: 0.25 });

// The road west (Book 1, chapters 4-12)
def('bus_seat', { top: 'bus_seat', side: 'bus_seat', bottom: 'dark_planks' }, { step: 'wood', hp: 14, debris: 6 });
def('bus_panel', { top: 'silver_plate', side: 'bus_panel' }, { metal: 0.6, rough: 0.3, step: 'metal' });
def('guardrail', { top: 'iron_plate', side: 'guardrail' }, { metal: 0.6, rough: 0.35, step: 'metal' });
def('corrugated', 'corrugated', { metal: 0.4, rough: 0.5, step: 'metal' });
def('steel_panel', 'steel_panel', { metal: 0.75, rough: 0.22, step: 'metal' });
def('steel_window', { top: 'steel_panel', side: 'steel_window' }, { metal: 0.4, rough: 0.1, emit: 0.35 });
def('pool_tile', 'pool_tile', { rough: 0.2 });
def('slide_glass', 'slide_glass', { rough: 0.3 });
def('rust_metal', 'rust_metal', { metal: 0.35, rough: 0.7, step: 'metal' });
def('casino_carpet', { top: 'casino_carpet', side: 'lotus_panel' }, { step: 'wood', rough: 0.95 });
def('slot_machine', { top: 'gold_plate', side: 'slot_machine' }, { emit: 1.0, hp: 30, step: 'metal', light: [0xff7ab0, 2.5, 6] });
def('neon_green', 'neon_green', { emit: 1.6, light: [0x4affa0, 1.6, 6] });
def('lotus_panel', 'lotus_panel', { rough: 0.35 });
def('desert_sand', { top: 'desert_sand', side: 'desert_sand' }, { step: 'sand' });
def('red_rock', 'red_rock');
def('satin_pink', 'satin_pink', { rough: 0.2, step: 'water' });
def('satin_blue', 'satin_blue', { rough: 0.2, step: 'water' });
def('asphodel', { top: 'asphodel_top', side: 'dirt' }, { step: 'grass' });
def('underworld_rock', 'underworld_rock', { rough: 0.3 });
def('styx', 'styx', { solid: false, opaque: false, liquid: 'cursed', emit: 0.5, step: 'water', light: [0x3aff9a, 2.2, 7] });
def('black_marble', 'black_marble', { rough: 0.1 });
def('wet_sand', 'wet_sand', { step: 'sand', rough: 0.35 });
def('cloud', 'cloud', { rough: 0.95, step: 'grass' });
def('gold_marble', 'gold_marble', { rough: 0.15 });
def('elevator_door', { top: 'gold_plate', side: 'elevator_door' }, { metal: 0.7, rough: 0.25, step: 'metal' });
def('neon_bulbs', 'neon_bulbs', { emit: 1.8, light: [0xffd070, 3, 8] });
def('waystone', { top: 'gold_plate', side: 'marble_white' }, { rough: 0.25 });
def('poplar_leaves', 'basalt', { step: 'grass', rough: 0.9 });
// cloud drifting round Olympus: drawn like cloud, but you fall through it (so it never
// bridges two rooms or strands a hero below the floor)
def('cloud_puff', 'cloud', { solid: false, rough: 0.95 });
// Manhattan (the prologue)
def('brownstone', 'brownstone', { rough: 0.8 });
def('sidewalk', 'concrete', { rough: 0.7 });
def('shop_window', { top: 'dark_planks', side: 'window_day' }, { emit: 0.9, rough: 0.2 });
def('cornice', { top: 'roof_slate', side: 'dark_planks' }, { rough: 0.5 });

export const BLOCKS = defs;
export const isSolid = (id) => defs[id].solid;
export const isOpaque = (id) => defs[id].opaque;
