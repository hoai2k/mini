// Biome look & feel: palette of blocks, sky gradient, fog, light colours,
// colour grade, ambient sound and music keys.
import * as THREE from 'three/webgpu';
import { screenUV, color, mix, smoothstep, vec3, uniform, positionWorldDirection, normalize, pow, max, float } from 'three/tsl';
import { B } from './blocks.js';
import { Grade } from '../gfx/renderer.js';

export const BIOMES = {
  jujutsu_high: {
    name: 'Jujutsu High', sub: 'School Grounds · Night',
    skyTop: 0x0a1030, skyHorizon: 0x2a2a52, fog: 0x1c2040, fogDensity: 0.018,
    hemiSky: 0x6a78b8, hemiGround: 0x2a2018, hemiI: 0.5, sun: 0xa8b8ff, sunI: 1.0,
    grade: { tint: [1.0, 0.98, 1.04], lift: [0.0, 0.0, 0.015], sat: 1.08, contrast: 1.06, vignette: 0.32 },
    floor: B.stone_brick, floor2: B.cobble, path: B.dirt_path, wall: B.stone_brick, wall2: B.mossy_brick, trim: B.dark_planks, pillar: B.pillar_red, roof: B.roof, ground: B.grass, accent: B.lantern, pit: B.stone,
    ambience: 'night', music: 'shrine', particles: 'fireflies', wind: 1,
  },
  tokyo_night: {
    name: 'Ruined Tokyo', sub: 'Streets at Night',
    skyTop: 0x05060e, skyHorizon: 0x2e1a2c, fog: 0x20141e, fogDensity: 0.022,
    hemiSky: 0x6070a0, hemiGround: 0x201418, hemiI: 0.7, sun: 0x8898d8, sunI: 0.8,
    grade: { tint: [1.02, 0.96, 1.06], lift: [0.01, 0.0, 0.02], sat: 1.15, contrast: 1.1, vignette: 0.38 },
    floor: B.asphalt, floor2: B.asphalt_line, path: B.concrete, wall: B.concrete, wall2: B.red_brick, trim: B.window_dark, pillar: B.concrete_pillar, roof: B.concrete, ground: B.asphalt, accent: B.neon_pink, pit: B.concrete,
    ambience: 'city', music: 'city', particles: 'embers', wind: 0.6,
  },
  cursed_forest: {
    name: 'Cursed Forest', sub: 'Where the Curses Nest',
    skyTop: 0x06080a, skyHorizon: 0x14201a, fog: 0x14201c, fogDensity: 0.03,
    hemiSky: 0x6a8a7a, hemiGround: 0x1a1420, hemiI: 0.75, sun: 0x9ab8a8, sunI: 0.7,
    grade: { tint: [0.96, 1.02, 0.98], lift: [0.0, 0.01, 0.005], sat: 0.95, contrast: 1.12, vignette: 0.45 },
    floor: B.moss_floor, floor2: B.cursed_grass, path: B.dirt, wall: B.bark_dark, wall2: B.mossy_brick, trim: B.log, pillar: B.log, roof: B.dead_leaves, ground: B.cursed_grass, accent: B.cursed_pool, pit: B.dirt,
    ambience: 'forest', music: 'forest', particles: 'spores', wind: 1.4,
  },
  flooded_subway: {
    name: 'Flooded Subway', sub: 'Toei Line · Abandoned',
    skyTop: 0x040608, skyHorizon: 0x0a1418, fog: 0x0c1a1e, fogDensity: 0.028,
    hemiSky: 0x5a7a88, hemiGround: 0x101418, hemiI: 0.55, sun: 0x6a8a9a, sunI: 0.35,
    grade: { tint: [0.94, 1.02, 1.06], lift: [0.0, 0.01, 0.02], sat: 0.9, contrast: 1.1, vignette: 0.45 },
    floor: B.subway_floor, floor2: B.metal_grate, path: B.subway_floor, wall: B.subway_tile, wall2: B.concrete, trim: B.sign, pillar: B.concrete_pillar, roof: B.concrete, ground: B.subway_floor, accent: B.lantern, pit: B.concrete,
    ambience: 'drips', music: 'subway', particles: 'drips', wind: 0.2, flooded: true,
  },
  shibuya: {
    name: 'Shibuya Station', sub: 'Halloween · The Incident',
    skyTop: 0x0c0408, skyHorizon: 0x3a1214, fog: 0x2a1014, fogDensity: 0.02,
    hemiSky: 0xa06a6a, hemiGround: 0x201010, hemiI: 0.75, sun: 0xff8a6a, sunI: 0.9,
    grade: { tint: [1.06, 0.96, 0.94], lift: [0.02, 0.0, 0.0], sat: 1.12, contrast: 1.12, vignette: 0.4 },
    floor: B.polished, floor2: B.subway_floor, path: B.concrete, wall: B.concrete, wall2: B.window, trim: B.sign, pillar: B.concrete_pillar, roof: B.concrete, ground: B.asphalt, accent: B.lava, pit: B.concrete,
    ambience: 'city', music: 'shibuya', particles: 'embers', wind: 0.8,
  },
  // ---------------------------------------------------------------- Half-Blood Quests
  // The hub: a sunny Long Island valley.
  camp: {
    id: 'camp', name: 'Camp Half-Blood', sub: 'Long Island Sound · Summer',
    skyTop: 0x3f86d8, skyHorizon: 0xc4e4f4, fog: 0xc8e2ee, fogDensity: 0.0055,
    hemiSky: 0xd8ecff, hemiGround: 0x7a6a44, hemiI: 1.15, sun: 0xfff0d2, sunI: 2.6,
    grade: { tint: [1.04, 1.01, 0.96], lift: [0.012, 0.01, 0.0], sat: 1.12, contrast: 1.04, vignette: 0.18 },
    floor: B.grass, floor2: B.grass, path: B.gravel_path, wall: B.marble_white, wall2: B.marble_white, trim: B.bronze, pillar: B.column, roof: B.roof_terracotta, ground: B.grass, accent: B.lantern, pit: B.dirt,
    ambience: 'forest', music: 'camp', particles: 'pollen', wind: 1,
  },
  // The prologue: a Manhattan street on a bright spring morning (the field trip).
  manhattan: {
    id: 'manhattan', name: 'Manhattan', sub: 'The Morning of the Field Trip',
    skyTop: 0x4a8ad8, skyHorizon: 0xf0dcc0, fog: 0xd8d4cc, fogDensity: 0.0045,
    hemiSky: 0xdceaff, hemiGround: 0x6a5a4a, hemiI: 1.1, sun: 0xffe6c0, sunI: 2.4,
    grade: { tint: [1.04, 1.0, 0.95], lift: [0.012, 0.008, 0.0], sat: 1.1, contrast: 1.05, vignette: 0.2 },
    floor: B.asphalt, floor2: B.asphalt_line, path: B.sidewalk, wall: B.brownstone, wall2: B.red_brick, trim: B.white_trim, pillar: B.concrete_pillar, roof: B.roof_slate, ground: B.sidewalk, accent: B.lantern, pit: B.concrete,
    ambience: 'city', music: 'manhattan', particles: 'pollen', wind: 0.6,
  },
  // Chapter 1: the Greek and Roman galleries of a big city museum.
  museum: {
    id: 'museum', name: 'The Museum', sub: 'Greek and Roman Galleries',
    skyTop: 0x2a1e14, skyHorizon: 0x7a5a3c, fog: 0x3e2e22, fogDensity: 0.016,
    hemiSky: 0xffe4bc, hemiGround: 0x4a3622, hemiI: 1.0, sun: 0xffdcaa, sunI: 1.1,
    grade: { tint: [1.05, 1.0, 0.92], lift: [0.015, 0.008, 0.0], sat: 1.04, contrast: 1.06, vignette: 0.3 },
    floor: B.marble_floor, floor2: B.marble_floor, path: B.carpet_red, wall: B.gallery_wall, wall2: B.gallery_wall, trim: B.key_frieze, pillar: B.column, roof: B.marble_white, ground: B.marble_floor, accent: B.lantern, pit: B.plinth,
    ambience: 'museum', music: 'museum', particles: 'dust', wind: 0.1, indoor: true,
    dmgStep: 0.4,   // monsters hit harder on Demigod and up than elsewhere (the first chapter was too easy there)
  },
  // Chapter 2: Long Island farmland at night in a violent storm.
  storm_hill: {
    id: 'storm_hill', name: 'Half-Blood Hill', sub: 'Long Island · Storm',
    skyTop: 0x05070c, skyHorizon: 0x222c3a, fog: 0x18202a, fogDensity: 0.028,
    hemiSky: 0x6a7c9c, hemiGround: 0x1c1a14, hemiI: 0.85, sun: 0x9ab0d8, sunI: 0.85,
    grade: { tint: [0.95, 1.0, 1.06], lift: [0.0, 0.006, 0.02], sat: 0.85, contrast: 1.12, vignette: 0.42 },
    floor: B.grass, floor2: B.mud, path: B.dirt_road, wall: B.rock, wall2: B.cobble, trim: B.rock, pillar: B.pine_log, roof: B.barn_red, ground: B.grass, accent: B.lantern, pit: B.dirt,
    ambience: 'storm', music: 'storm', particles: 'rain', wind: 2.4, storm: true,
  },
  // Chapter 3: the camp woods at night, capture the flag.
  camp_woods: {
    id: 'camp_woods', name: 'The Camp Woods', sub: 'Capture the Flag · Night',
    skyTop: 0x060c1c, skyHorizon: 0x1e3048, fog: 0x12222e, fogDensity: 0.024,
    hemiSky: 0x8aaae0, hemiGround: 0x1a1e14, hemiI: 0.95, sun: 0xbcd0ff, sunI: 1.2,
    grade: { tint: [0.95, 1.0, 1.06], lift: [0.0, 0.008, 0.022], sat: 0.95, contrast: 1.08, vignette: 0.38 },
    floor: B.forest_floor, floor2: B.grass, path: B.dirt, wall: B.rock, wall2: B.mossy_brick, trim: B.rock, pillar: B.pine_log, roof: B.pine_leaves, ground: B.forest_floor, accent: B.lantern, pit: B.dirt,
    ambience: 'forest', music: 'woods', particles: 'fireflies', wind: 1.2,
  },
  // Chapter 4: a Greyhound bus on a rainy New Jersey highway, crashed and burning.
  highway: {
    id: 'highway', name: 'The New Jersey Turnpike', sub: 'The Kindly Ones · Rain',
    skyTop: 0x0a0e16, skyHorizon: 0x3a3a44, fog: 0x262a32, fogDensity: 0.026,
    hemiSky: 0x8a98b8, hemiGround: 0x2a241e, hemiI: 1.1, sun: 0xb8c8e8, sunI: 1.0,
    grade: { tint: [0.97, 0.99, 1.05], lift: [0.008, 0.006, 0.016], sat: 0.88, contrast: 1.12, vignette: 0.4 },
    floor: B.asphalt, floor2: B.asphalt_line, path: B.asphalt, wall: B.concrete, wall2: B.red_brick, trim: B.guardrail, pillar: B.concrete_pillar, roof: B.bus_panel, ground: B.grass, accent: B.lantern, pit: B.dirt,
    ambience: 'highway', music: 'highway', particles: 'stormfire', wind: 2.0, storm: true,
  },
  // Chapter 5: Aunty Em's Garden Gnome Emporium at dusk.
  statue_garden: {
    id: 'statue_garden', name: 'Aunty Em’s Garden Gnome Emporium', sub: 'New Jersey · Dusk',
    skyTop: 0x1a2048, skyHorizon: 0xc87a5a, fog: 0x3e3a4a, fogDensity: 0.02,
    hemiSky: 0xb8b8d8, hemiGround: 0x2a2a1e, hemiI: 0.95, sun: 0xffc090, sunI: 1.3,
    grade: { tint: [1.02, 0.99, 0.98], lift: [0.006, 0.004, 0.014], sat: 0.95, contrast: 1.08, vignette: 0.36 },
    floor: B.grass, floor2: B.cobble, path: B.cobble, wall: B.corrugated, wall2: B.stone_brick, trim: B.vine_wall, pillar: B.stone, roof: B.corrugated, ground: B.grass, accent: B.lantern, pit: B.dirt,
    ambience: 'garden', music: 'garden', particles: 'pollen', wind: 0.6,
  },
  // Chapter 6: the Gateway Arch in St. Louis: the steel tram and deck, then the Mississippi.
  arch: {
    id: 'arch', name: 'The Gateway Arch', sub: 'St. Louis · 630 Feet Up',
    skyTop: 0x3a7ad0, skyHorizon: 0xf2d0a8, fog: 0xd8c8b8, fogDensity: 0.011,
    hemiSky: 0xd8e6ff, hemiGround: 0x4a4440, hemiI: 0.8, sun: 0xfff0d8, sunI: 1.8,
    grade: { tint: [1.0, 1.0, 1.02], lift: [0.004, 0.004, 0.01], sat: 1.06, contrast: 1.1, vignette: 0.26 },
    floor: B.steel_panel, floor2: B.iron_plate, path: B.concrete, wall: B.steel_panel, wall2: B.steel_window, trim: B.iron_plate, pillar: B.steel_panel, roof: B.steel_panel, ground: B.grass, accent: B.lantern, pit: B.concrete,
    ambience: 'wind', music: 'arch', particles: 'dust', wind: 1.2,
  },
  // Chapter 7: Waterland, an abandoned water park in Denver, at night.
  waterland: {
    id: 'waterland', name: 'Waterland', sub: 'Denver · Closed for the Season',
    skyTop: 0x060a1a, skyHorizon: 0x2a3a5a, fog: 0x1a2436, fogDensity: 0.022,
    hemiSky: 0x9aaad8, hemiGround: 0x2a2018, hemiI: 1.0, sun: 0xb8c8ff, sunI: 1.15,
    grade: { tint: [0.96, 1.0, 1.06], lift: [0.0, 0.008, 0.02], sat: 0.98, contrast: 1.1, vignette: 0.38 },
    floor: B.concrete, floor2: B.pool_tile, path: B.concrete, wall: B.rust_metal, wall2: B.concrete, trim: B.slide_glass, pillar: B.rust_metal, roof: B.rust_metal, ground: B.concrete, accent: B.lantern, pit: B.concrete,
    ambience: 'park', music: 'waterland', particles: 'moths', wind: 0.9,
  },
  // Chapter 8: the Lotus Hotel and Casino: neon, carpet and a party that never ends.
  casino: {
    id: 'casino', name: 'The Lotus Hotel and Casino', sub: 'Las Vegas · Every Game Is Free',
    skyTop: 0x12051e, skyHorizon: 0x6a1a5a, fog: 0x3a1440, fogDensity: 0.016,
    hemiSky: 0xffc0e8, hemiGround: 0x2a0a20, hemiI: 1.1, sun: 0xffe0b0, sunI: 1.1,
    grade: { tint: [1.05, 0.97, 1.03], lift: [0.016, 0.006, 0.02], sat: 1.22, contrast: 1.04, vignette: 0.3 },
    floor: B.casino_carpet, floor2: B.casino_carpet, path: B.carpet_red, wall: B.lotus_panel, wall2: B.gold_plate, trim: B.gold_plate, pillar: B.gold_plate, roof: B.lotus_panel, ground: B.casino_carpet, accent: B.neon_pink, pit: B.lotus_panel,
    ambience: 'casino', music: 'casino', particles: 'neon', wind: 1.6, indoor: true, dreamy: true,
  },
  // Chapter 9: the Nevada desert and Crusty's Water Bed Palace.
  desert: {
    id: 'desert', name: 'The Nevada Desert', sub: 'Crusty’s Water Bed Palace',
    skyTop: 0x2a5ab0, skyHorizon: 0xf2b07a, fog: 0xe0a878, fogDensity: 0.012,
    hemiSky: 0xd8e0f0, hemiGround: 0x7a4a2a, hemiI: 0.95, sun: 0xffd8a0, sunI: 2.1,
    grade: { tint: [1.05, 1.0, 0.92], lift: [0.01, 0.004, 0.0], sat: 1.1, contrast: 1.1, vignette: 0.26 },
    floor: B.desert_sand, floor2: B.sand, path: B.asphalt, wall: B.red_rock, wall2: B.sand, trim: B.red_rock, pillar: B.red_rock, roof: B.roof_terracotta, ground: B.desert_sand, accent: B.neon_bulbs, pit: B.red_rock,
    ambience: 'desert', music: 'desert', particles: 'sand', wind: 1.5,
  },
  // Chapter 10: DOA Recording Studios, the River Styx, the Fields of Asphodel and the gates of Erebus.
  underworld: {
    id: 'underworld', name: 'The Underworld', sub: 'DOA Recording Studios · The River Styx',
    skyTop: 0x05040c, skyHorizon: 0x2a2240, fog: 0x1e1a30, fogDensity: 0.024,
    hemiSky: 0x9a9ad8, hemiGround: 0x1a1420, hemiI: 1.25, sun: 0xb0b0f0, sunI: 1.1,
    grade: { tint: [0.96, 1.0, 1.06], lift: [0.014, 0.012, 0.03], sat: 0.8, contrast: 1.1, vignette: 0.46 },
    floor: B.underworld_rock, floor2: B.basalt, path: B.asphodel, wall: B.underworld_rock, wall2: B.obsidian, trim: B.basalt, pillar: B.basalt, roof: B.underworld_rock, ground: B.asphodel, accent: B.styx, pit: B.underworld_rock,
    ambience: 'underworld', music: 'underworld', particles: 'ash', wind: 0.4,
  },
  // Chapter 11: Santa Monica beach at dusk; the surf is real water.
  beach: {
    id: 'beach', name: 'Santa Monica Beach', sub: 'Los Angeles · Dusk',
    skyTop: 0x2a3a7a, skyHorizon: 0xff9a5a, fog: 0xd88a6a, fogDensity: 0.012,
    hemiSky: 0xc8c0e0, hemiGround: 0x4a3a2a, hemiI: 1.0, sun: 0xffb080, sunI: 1.9,
    grade: { tint: [1.04, 0.99, 0.97], lift: [0.012, 0.006, 0.012], sat: 1.12, contrast: 1.08, vignette: 0.28 },
    floor: B.sand, floor2: B.wet_sand, path: B.planks, wall: B.white_trim, wall2: B.teal_panel, trim: B.white_trim, pillar: B.log, roof: B.teal_panel, ground: B.sand, accent: B.lantern, pit: B.sand,
    ambience: 'surf', music: 'beach', particles: 'spray', wind: 1.4,
  },
  // Chapter 12: Mount Olympus above the Empire State Building, then the duel on a camp hill.
  olympus: {
    id: 'olympus', name: 'Mount Olympus', sub: 'The Six-Hundredth Floor',
    skyTop: 0x2a7ae0, skyHorizon: 0xbcdcff, fog: 0xc8dcf4, fogDensity: 0.007,
    hemiSky: 0xe8f0ff, hemiGround: 0x8a8070, hemiI: 0.95, sun: 0xfff0d0, sunI: 2.1,
    grade: { tint: [1.03, 1.01, 0.98], lift: [0.004, 0.004, 0.008], sat: 1.1, contrast: 1.1, vignette: 0.22 },
    floor: B.gold_marble, floor2: B.marble_floor, path: B.marble_white, wall: B.marble_white, wall2: B.gold_marble, trim: B.key_frieze, pillar: B.column, roof: B.marble_white, ground: B.grass, accent: B.lantern, pit: B.cloud,
    ambience: 'olympus', music: 'olympus', particles: 'sparkle', wind: 1.0,
    // the last fight (Luke on a camp hill at night) is lit like this; see bossEnv in the report
    bossEnv: {
      skyTop: 0x040818, skyHorizon: 0x1a2848, fog: 0x101a2e, fogDensity: 0.022,
      hemiSky: 0x8aa0d8, hemiGround: 0x141a10, hemiI: 0.8, sun: 0xbcd0ff, sunI: 1.0,
      grade: { tint: [0.95, 1.0, 1.07], lift: [0.0, 0.008, 0.024], sat: 0.95, contrast: 1.1, vignette: 0.4 },
    },
  },
};

// Domain Expansion overrides use the same structure.
export const DOMAINS = {
  unlimited_void: { skyTop: 0x000000, skyHorizon: 0x1a2a6a, fog: 0x050818, fogDensity: 0.008, hemiSky: 0x9ab0ff, hemiGround: 0x101020, hemiI: 1.4, sun: 0xc0d8ff, sunI: 0.6, grade: { tint: [0.95, 1.0, 1.12], lift: [0.0, 0.01, 0.04], sat: 1.2, contrast: 1.15, vignette: 0.5 }, floor: B.void_floor },
  malevolent_shrine: { skyTop: 0x100000, skyHorizon: 0x4a0606, fog: 0x200404, fogDensity: 0.018, hemiSky: 0xc84a3a, hemiGround: 0x100000, hemiI: 0.55, sun: 0xff5a4a, sunI: 0.9, grade: { tint: [1.08, 0.92, 0.9], lift: [0.015, 0.0, 0.0], sat: 1.1, contrast: 1.18, vignette: 0.55 }, floor: B.shrine_floor },
  chimera_garden: { skyTop: 0x000000, skyHorizon: 0x10101a, fog: 0x06060c, fogDensity: 0.025, hemiSky: 0x6a6aa0, hemiGround: 0x000000, hemiI: 0.9, sun: 0x8a8ac8, sunI: 0.5, grade: { tint: [0.92, 0.95, 1.1], lift: [0.0, 0.0, 0.02], sat: 0.75, contrast: 1.25, vignette: 0.55 }, floor: B.shadow_floor },
  coffin_iron_mountain: { skyTop: 0x200800, skyHorizon: 0xff5a1a, fog: 0x401008, fogDensity: 0.02, hemiSky: 0xff9a5a, hemiGround: 0x300800, hemiI: 1.1, sun: 0xffa060, sunI: 1.3, grade: { tint: [1.12, 0.96, 0.85], lift: [0.03, 0.01, 0.0], sat: 1.2, contrast: 1.1, vignette: 0.45 }, floor: B.obsidian },
  resonance: { skyTop: 0x100808, skyHorizon: 0x6a3a1a, fog: 0x2a140a, fogDensity: 0.02, hemiSky: 0xffb07a, hemiGround: 0x200a00, hemiI: 1.0, sun: 0xffc080, sunI: 1.0, grade: { tint: [1.08, 1.0, 0.9], lift: [0.02, 0.01, 0.0], sat: 1.15, contrast: 1.12, vignette: 0.45 }, floor: B.floor_boards },
};

// Environment controller: sky background node, fog, lights & grade, with
// smooth transitions (used for domain expansions).
export class Environment {
  constructor(scene, lights) {
    this.scene = scene; this.lights = lights;
    this.skyTop = uniform(new THREE.Color()); this.skyHor = uniform(new THREE.Color());
    const dir = normalize(positionWorldDirection);
    const h = max(dir.y, float(0));
    // sky above the horizon, a dark fogged abyss below it (levels float over the void)
    const abyss = mix(this.skyHor.mul(0.35), vec3(0.004, 0.004, 0.008), smoothstep(-0.05, -0.75, dir.y));
    scene.backgroundNode = mix(abyss, mix(this.skyHor, this.skyTop, pow(h, 0.6)), smoothstep(-0.04, 0.02, dir.y));
    this.fog = new THREE.FogExp2(0x000000, 0.02);
    scene.fog = this.fog;
    this.cur = null; this.from = null; this.to = null; this.k = 1;
  }
  set(b, instant = true) {
    const snap = this.snapshot(b);
    if (instant || !this.cur) { this.cur = snap; this.apply(snap); this.k = 1; return; }
    this.from = this.cur; this.to = snap; this.k = 0;
  }
  snapshot(b) {
    const g = b.grade;
    return {
      skyTop: new THREE.Color(b.skyTop), skyHor: new THREE.Color(b.skyHorizon), fog: new THREE.Color(b.fog), fogD: b.fogDensity,
      hemiSky: new THREE.Color(b.hemiSky), hemiGround: new THREE.Color(b.hemiGround), hemiI: b.hemiI, sun: new THREE.Color(b.sun), sunI: b.sunI,
      tint: new THREE.Color(...g.tint), lift: new THREE.Color(...g.lift), sat: g.sat, contrast: g.contrast, vignette: g.vignette,
    };
  }
  apply(s) {
    this.skyTop.value.copy(s.skyTop); this.skyHor.value.copy(s.skyHor);
    this.fog.color.copy(s.fog); this.fog.density = s.fogD;
    const L = this.lights;
    L.hemi.color.copy(s.hemiSky); L.hemi.groundColor.copy(s.hemiGround); L.hemi.intensity = s.hemiI;
    L.sun.color.copy(s.sun); L.sun.intensity = s.sunI;
    Grade.tint.value.copy(s.tint); Grade.lift.value.copy(s.lift);
    Grade.saturation.value = s.sat; Grade.contrast.value = s.contrast; Grade.vignette.value = s.vignette;
  }
  update(dt) {
    if (this.k >= 1 || !this.to) return;
    this.k = Math.min(1, this.k + dt * 1.6);
    const a = this.from, b = this.to, t = this.k;
    const lerpC = (x, y) => x.clone().lerp(y, t), L = (x, y) => x + (y - x) * t;
    const s = {
      skyTop: lerpC(a.skyTop, b.skyTop), skyHor: lerpC(a.skyHor, b.skyHor), fog: lerpC(a.fog, b.fog), fogD: L(a.fogD, b.fogD),
      hemiSky: lerpC(a.hemiSky, b.hemiSky), hemiGround: lerpC(a.hemiGround, b.hemiGround), hemiI: L(a.hemiI, b.hemiI), sun: lerpC(a.sun, b.sun), sunI: L(a.sunI, b.sunI),
      tint: lerpC(a.tint, b.tint), lift: lerpC(a.lift, b.lift), sat: L(a.sat, b.sat), contrast: L(a.contrast, b.contrast), vignette: L(a.vignette, b.vignette),
    };
    this.apply(s);
    if (this.k >= 1) this.cur = b;
  }
  // Reflection probe: a PMREM of the sky gradient, used for water/metal on every tier.
  buildProbe(renderer, b) {
    const env = new THREE.Scene();
    const top = new THREE.Color(b.skyTop), hor = new THREE.Color(b.skyHorizon);
    const geo = new THREE.SphereGeometry(10, 32, 16);
    const cols = [];
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const c = hor.clone().lerp(top, Math.pow(Math.max(0, y), 0.6)); if (y < 0) c.multiplyScalar(0.4); cols.push(c.r * 2, c.g * 2, c.b * 2); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    env.add(new THREE.Mesh(geo, new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.BackSide })));
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromScene(env, 0.02);
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.35;
    pm.dispose();
  }
}
