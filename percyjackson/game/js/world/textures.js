// Block tiles and decoration sprites for the Book 1 road-trip worlds (the
// bus on the New Jersey turnpike, Aunty Em's, the Arch, Waterland, the Lotus,
// Crusty's, the Underworld, Santa Monica and Olympus). gfx/textures.js appends
// these names to its atlases and calls the painters below with its helpers,
// so this file stays free of imports.
//
// A tile painter gets (name, px, r, H) where px.set(x, y, [r,g,b], height),
// r is a seeded RNG and H = { C, mix, shade, jitter, noiseFill, bricks, planks,
// each }. It returns true when it painted the tile.

export const EXTRA_TILES = [
  'bus_seat', 'bus_panel', 'guardrail', 'corrugated', 'steel_panel', 'steel_window', 'pool_tile', 'slide_glass',
  'rust_metal', 'casino_carpet', 'slot_machine', 'neon_green', 'lotus_panel', 'desert_sand', 'red_rock', 'satin_pink',
  'satin_blue', 'asphodel_top', 'underworld_rock', 'styx', 'black_marble', 'wet_sand', 'cloud', 'gold_marble',
  'elevator_door', 'neon_bulbs',
];

export function paintExtraTile(name, px, r, H) {
  const { C, mix, shade, jitter, noiseFill, bricks, planks, each } = H;
  switch (name) {
    case 'bus_seat': each(px, (x, y) => { // navy fabric with a teal and gold zig-zag
      const z = (x + (y >> 1)) % 6;
      let c = jitter(C(0x1c2c5a), r, 0.14);
      if (z === 0) c = C(0x2a8aa8); else if (z === 1 && y % 4 === 0) c = C(0xd6aa4a);
      if (y === 0 || y === 15) c = C(0x111a36);
      return [c, 0.55 + (z === 0 ? 0.1 : 0)];
    }); return true;
    case 'bus_panel': each(px, (x, y) => { // silver Greyhound body with the blue stripe
      let c = jitter(C(0xc8ccd2), r, 0.05), h = 0.6;
      if (y >= 9 && y <= 11) c = C(0x2a5ab8);
      if (y === 8 || y === 12) { c = C(0x8a9098); h = 0.4; }
      if (x === 0) { c = shade(c, 0.75); h = 0.3; }
      return [c, h];
    }); return true;
    case 'guardrail': each(px, (x, y) => { // corrugated steel W-beam over a post
      const post = x >= 6 && x <= 9 && y > 10;
      const band = y >= 3 && y <= 10;
      const wave = Math.sin(y * 1.1) * 0.5 + 0.5;
      if (post) return [jitter(C(0x6a6e74), r, 0.1), 0.6];
      if (band) return [shade(C(0xb4b9c0), 0.8 + wave * 0.35), 0.5 + wave * 0.4];
      return [jitter(C(0x3a3d42), r, 0.1), 0.15];
    }); return true;
    case 'corrugated': each(px, (x, y) => { // warehouse sheet metal, a little rusty
      const w = Math.sin(x * 1.57) * 0.5 + 0.5;
      let c = shade(C(0x8a948c), 0.8 + w * 0.3);
      if (r() < 0.06 + (y > 11 ? 0.12 : 0)) c = mix(c, C(0x8a4a2a), 0.6);
      return [jitter(c, r, 0.05), 0.4 + w * 0.4];
    }); return true;
    case 'steel_panel': each(px, (x, y) => { // the Arch's stainless steel, brushed, riveted seams
      const seam = x === 0 || y === 0;
      const rivet = (x === 2 || x === 13) && (y === 2 || y === 13);
      const brush = Math.sin(x * 0.4 + y * 3.1 + r()) * 0.04;
      let c = shade(C(0xb8bec6), 1 + brush - y * 0.008);
      if (seam) c = C(0x6a7078); if (rivet) c = C(0xe6eaee);
      return [c, seam ? 0.1 : rivet ? 0.9 : 0.6];
    }); return true;
    case 'steel_window': each(px, (x, y) => { // a slit window looking out over St. Louis
      const win = x >= 3 && x <= 12 && y >= 4 && y <= 10;
      if (!win) return [shade(C(0xb8bec6), 1 - y * 0.01 + (x === 0 || y === 0 ? -0.35 : 0)), 0.6];
      const sky = mix(C(0x9ad0f0), C(0xf0c890), (y - 4) / 7);
      return [(x + y) % 7 === 0 ? C(0xffffff) : sky, 0.2];
    }); return true;
    case 'pool_tile': each(px, (x, y) => { // little light-blue tiles, grout, the odd chip
      const g = x % 4 === 3 || y % 4 === 3;
      let c = g ? C(0xc8d8dc) : jitter(C(0x6ac0e0), r, 0.12);
      if (!g && r() < 0.03) c = C(0x9aa8a8);
      return [c, g ? 0.2 : 0.65];
    }); return true;
    case 'slide_glass': each(px, (x, y) => { // faded fibreglass slide, teal with a sun-bleached stripe
      const stripe = (x + y) % 16 < 3;
      let c = stripe ? C(0xf2b04a) : jitter(C(0x2aa8a0), r, 0.08);
      if (r() < 0.05) c = mix(c, C(0xe8e0c8), 0.6);
      return [c, 0.7];
    }); return true;
    case 'rust_metal': noiseFill(px, r, [C(0x7a4a2a), C(0x8a5a32), C(0x6a3a22), C(0x9a6a3a)], 0.18, 0.6);
      for (let i = 0; i < 4; i++) { const y = r() * 16 | 0; for (let x = 0; x < 16; x++) if (r() < 0.7) px.set(x, y, C(0x4a2a18), 0.2); }
      return true;
    case 'casino_carpet': each(px, (x, y) => { // the Lotus carpet: plum with gold lotus diamonds
      const dx = Math.abs(((x + 4) % 8) - 4), dy = Math.abs(((y + 4) % 8) - 4);
      const d = dx + dy;
      let c = jitter(C(0x3a1440), r, 0.1);
      if (d === 3) c = C(0xd6aa4a); else if (d < 2) c = C(0x1e8a6a); else if ((x * 7 + y * 3) % 11 === 0) c = C(0x6a2a70);
      return [c, d === 3 ? 0.7 : 0.45];
    }); return true;
    case 'slot_machine': each(px, (x, y) => { // glowing reels on a gold cabinet
      if (y < 3) return [C(0xff3a6a), 0.7];
      if (y >= 4 && y <= 9 && x >= 2 && x <= 13) {
        const reel = Math.floor((x - 2) / 4); const edge = (x - 2) % 4 === 3;
        if (edge) return [C(0x17130f), 0.2];
        const sym = [C(0xffd84a), C(0xff4a5a), C(0x4aff8a)][(reel + (y >> 1)) % 3];
        return [y === 6 || y === 7 ? sym : C(0xf6f0e0), 0.5];
      }
      if (y === 11 && x > 4 && x < 11) return [C(0x4ad8ff), 0.6];
      return [jitter(C(0xb8862a), r, 0.1), 0.5];
    }); return true;
    case 'neon_green': noiseFill(px, r, [C(0x4affa0), C(0x6affb8), C(0x8affc8)], 0.05, 0.1); return true;
    case 'lotus_panel': each(px, (x, y) => { // art deco: jade with a gold sunburst
      const dx = x - 7.5, dy = y - 15;
      const a = Math.atan2(dy, dx);
      const ray = Math.cos(a * 9) > 0.8 && Math.hypot(dx, dy) > 4;
      const edge = x === 0 || x === 15 || y === 0;
      let c = jitter(C(0x0e5a4a), r, 0.1);
      if (ray) c = C(0xd6aa4a); if (edge) c = C(0xc9963a);
      if (Math.hypot(dx, dy) < 3.5) c = C(0xf2c85a);
      return [c, ray || edge ? 0.8 : 0.45];
    }); return true;
    case 'desert_sand': noiseFill(px, r, [C(0xd8a868), C(0xcf9c5c), C(0xe0b47a), C(0xc89050)], 0.08, 0.35);
      for (let x = 0; x < 16; x++) { const y = (Math.round(Math.sin(x * 0.6) * 1.5) + 8) & 15; px.set(x, y, C(0xb88040), 0.3); }
      return true;
    case 'red_rock': each(px, (x, y) => { // layered sandstone
      const band = Math.floor((y + Math.sin(x * 0.5) * 1.2) / 3) % 3;
      const c = [C(0xb05a32), C(0xc8743e), C(0x9a4a2a)][band];
      return [jitter(c, r, 0.12), 0.4 + band * 0.15];
    }); return true;
    case 'satin_pink': case 'satin_blue': { // tufted water-bed satin with buttons
      const base = name === 'satin_pink' ? C(0xe0506a) : C(0x2ab0c8);
      each(px, (x, y) => {
        const bx = ((x + 4) % 8) - 4, by = ((y + 4) % 8) - 4;
        const d = Math.hypot(bx, by);
        const btn = Math.abs(((x) % 8) - 4) < 1 && Math.abs(((y) % 8) - 4) < 1;
        const c = btn ? shade(base, 0.55) : shade(base, 0.82 + (d / 6) * 0.35);
        return [c, btn ? 0.1 : 0.4 + d * 0.08];
      }); return true;
    }
    case 'asphodel_top': each(px, (x, y) => { // the Fields of Asphodel: dry grey grass, pale flowers
      let c = jitter(mix(C(0x6a6e64), C(0x8a8a7c), r()), r, 0.12);
      if (r() < 0.04) c = C(0xe8e4d4);
      return [c, 0.4 + r() * 0.3];
    }); return true;
    case 'underworld_rock': each(px, (x, y) => { // glossy black volcanic rock with a cold sheen
      const v = Math.sin(x * 0.9 + y * 0.4) * Math.cos(y * 0.7 - x * 0.2);
      let c = mix(C(0x14121a), C(0x2e2a38), v * 0.5 + 0.5);
      if (r() < 0.03) c = C(0x5a5070);
      return [jitter(c, r, 0.1), 0.4 + v * 0.3];
    }); return true;
    case 'styx': each(px, (x, y) => { // the River Styx: oily black-green with grey swirls
      const v = Math.sin(x * 0.7 + Math.sin(y * 0.5) * 2) * Math.cos(y * 0.6 - x * 0.2);
      return [jitter(mix(C(0x0a1a16), C(0x3a5a50), Math.max(0, v)), r, 0.12), 0.5 + v * 0.2];
    }); return true;
    case 'black_marble': each(px, (x, y) => { // DOA Recording Studios lobby: black marble, gold veins
      const vein = Math.abs(Math.sin(x * 0.45 + y * 0.8 + Math.sin(y * 0.3) * 2)) < 0.08;
      return [vein ? C(0xc9a24a) : jitter(C(0x18161c), r, 0.18), vein ? 0.6 : 0.5];
    }); return true;
    case 'wet_sand': noiseFill(px, r, [C(0x9a8660), C(0xa48e66), C(0x8e7a56)], 0.08, 0.3);
      for (let i = 0; i < 5; i++) px.set(r() * 16 | 0, r() * 16 | 0, C(0xd8d0c0), 0.6);
      return true;
    case 'cloud': each(px, (x, y) => { // Olympus cloud: soft white with a blue-lilac underside
      const v = Math.sin(x * 0.7) * Math.cos(y * 0.6) * 0.5 + 0.5;
      return [jitter(mix(C(0xdce6f6), C(0xffffff), v), r, 0.04), 0.5 + v * 0.3];
    }); return true;
    case 'gold_marble': each(px, (x, y) => { // white marble with gold veins (the gods' halls)
      const vein = Math.abs(Math.sin(x * 0.35 - y * 0.7 + Math.sin(x * 0.4) * 1.5)) < 0.07;
      return [vein ? C(0xe8b84a) : jitter(C(0xf4f0e6), r, 0.05), vein ? 0.7 : 0.55];
    }); return true;
    case 'elevator_door': each(px, (x, y) => { // brass art-deco elevator doors
      const split = x === 7 || x === 8;
      const fan = y < 6 && Math.cos(Math.atan2(y - 6, x - 7.5) * 7) > 0.7;
      let c = jitter(C(0xc9963a), r, 0.06);
      if (split) c = C(0x5a3a1a); else if (fan) c = C(0xffe08a); else if (y === 6) c = C(0x8a6a2a);
      return [c, split ? 0.1 : fan ? 0.8 : 0.55];
    }); return true;
    case 'neon_bulbs': each(px, (x, y) => { // marquee light bulbs on red
      const bulb = (x % 4 === 1 || x % 4 === 2) && (y % 4 === 1 || y % 4 === 2);
      return [bulb ? C(0xfff2a0) : jitter(C(0xc02a2a), r, 0.1), bulb ? 0.8 : 0.4];
    }); return true;
  }
  return false;
}

export const EXTRA_SPRITES = ['chain_link', 'ivy', 'lotus', 'chips', 'skull', 'asphodel', 'kelp', 'road_crack', 'heart', 'dry_grass', 'gnome_hat', 'starfish'];

// set(x, y, [r,g,b]); G = hex → rgb
export function paintExtraSprite(name, set, r, G) {
  switch (name) {
    case 'chain_link': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if ((x + y) % 4 === 0 || (x - y + 16) % 4 === 0) set(x, y, (x + y) % 8 === 0 ? G(0xb8bcc2) : G(0x8a8e94));
    } for (let x = 0; x < 16; x++) { set(x, 0, G(0x6a6e74)); set(x, 15, G(0x6a6e74)); } return true;
    case 'ivy': for (let b = 0; b < 4; b++) { let x = 2 + b * 4; for (let y = 0; y < 16; y++) {
      set(x, y, G(0x2a5a22)); if (y % 3 === b % 3) for (const [dx, dy] of [[1, 0], [2, 0], [1, 1], [-1, 0], [-1, 1]]) set(x + dx * (y % 2 ? 1 : -1), y + dy, y % 6 < 3 ? G(0x3f7a2e) : G(0x4f8f36));
      if (r() < 0.25) x += r() < 0.5 ? -1 : 1;
    } } return true;
    case 'lotus': for (let y = 10; y < 16; y++) set(8, y, G(0x2e6a3a));
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 1], [2, 1], [-3, 2], [3, 2], [0, 1], [-1, 1], [1, 1], [0, -2]]) set(8 + dx, 7 + dy, Math.abs(dx) > 1 ? G(0xf6a0c0) : G(0xffd0e0));
      for (let x = 3; x < 14; x++) set(x, 10, G(0x3a8a4a));
      return true;
    case 'chips': for (const [cx, cy, c] of [[5, 9, 0xd8322a], [10, 8, 0x2a6ad8], [7, 12, 0x17130f], [11, 12, 0x2aa85a]]) for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const d = Math.hypot(x, y); if (d < 2.4) set(cx + x, cy + y, d > 1.4 && (x + y) % 2 === 0 ? G(0xffffff) : G(c)); }
      return true;
    case 'skull': for (let y = 6; y < 13; y++) for (let x = 4; x < 12; x++) { const d = Math.hypot((x - 7.5) / 4, (y - 9) / 3.4); if (d < 1) set(x, y, G(0xe8e2cc)); }
      for (const [x, y] of [[6, 9], [9, 9], [6, 10], [9, 10]]) set(x, y, G(0x17130f)); set(7, 12, G(0x17130f)); set(8, 12, G(0x17130f));
      for (let x = 5; x < 11; x++) set(x, 13, G(0xd6cfb8));
      return true;
    case 'asphodel': for (let b = 0; b < 3; b++) { const x = 4 + b * 4; for (let y = 6 + b; y < 16; y++) set(x, y, G(0x5a6a50)); for (let k = 0; k < 4; k++) { set(x - 1, 5 + b - k, G(0xf0ece0)); set(x + 1, 6 + b - k, G(0xe0dccc)); set(x, 4 + b - k, G(0xfffcf0)); } }
      return true;
    case 'kelp': for (let b = 0; b < 3; b++) { let x = 4 + b * 4; for (let y = 15; y > 4 + b * 2; y--) { set(x, y, G(0x4a6a2a)); set(x + 1, y, G(0x3a5a22)); if (y % 3 === 0) x += b % 2 ? 1 : -1; } }
      return true;
    case 'road_crack': { let x = 2, y = 7; for (let i = 0; i < 18; i++) { set(x, y, G(0x141414)); set(x, y + 1, G(0x222222)); x += 1; y += r() < 0.5 ? -1 : 1; y = Math.max(2, Math.min(13, y)); if (i === 8) { let bx = x, by = y; for (let k = 0; k < 5; k++) { set(bx, by, G(0x141414)); bx++; by += 1; } } } return true; }
    case 'heart': for (let y = 2; y < 15; y++) for (let x = 1; x < 15; x++) { const X = (x - 7.5) / 6.5, Y = (8 - y) / 6.5; const v = (X * X + Y * Y - 0.35) ** 3 - X * X * Y * Y * Y; if (v < 0) set(x, y, v > -0.0015 ? G(0xffe0f0) : G(0xff3a7a)); }
      return true;
    case 'dry_grass': for (let b = 0; b < 7; b++) { let x = 2 + r() * 12; const lean = (r() - 0.5) * 1.2; const h = 5 + r() * 7; for (let y = 15; y > 15 - h; y--) { set(Math.round(x), y, G(b % 2 ? 0xc8a860 : 0xa88848)); x += lean * 0.3; } }
      return true;
    case 'gnome_hat': for (let y = 2; y < 9; y++) for (let x = 8 - (y - 2) * 0.6; x <= 8 + (y - 2) * 0.6; x++) set(x, y, G(0xd8322a));
      for (let x = 5; x < 12; x++) { set(x, 9, G(0xf0d8b8)); set(x, 10, G(0xf0d8b8)); } for (let y = 11; y < 15; y++) for (let x = 5; x < 12; x++) set(x, y, Math.abs(x - 8) < 3 - (y - 11) * 0.5 ? G(0xf2f2f2) : G(0x2a6ad8));
      return true;
    case 'starfish': for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; for (let t = 0; t < 6; t++) { set(8 + Math.cos(a) * t, 9 + Math.sin(a) * t, G(t < 2 ? 0xf28c28 : 0xe86a3a)); } }
      return true;
  }
  return false;
}
