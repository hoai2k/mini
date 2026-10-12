// Procedural 16x16 pixel-art block textures with matching normal maps.
// Everything is painted at start-up into one atlas (and a sprite atlas for
// alpha-tested decorations), so there are no image files to download.
import * as THREE from 'three/webgpu';
import { mulberry32, hashStr, clamp } from '../util.js';
import { EXTRA_TILES, paintExtraTile, EXTRA_SPRITES, paintExtraSprite } from '../world/textures.js';

export const TILE = 16;          // pixels per tile
const CELL = 32;                 // atlas cell incl. gutter (mip-safe)
const PAD = (CELL - TILE) / 2;
const COLS = 16, ROWS = 8;
export const ATLAS_W = COLS * CELL, ATLAS_H = ROWS * CELL;

// ---------------------------------------------------------------- painters
// A painter receives (px, r) where px.set(x,y,[r,g,b], height) and r is a
// seeded RNG. Height (0..1) feeds the normal map; the bevel is added later.
const C = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const jitter = (c, r, amt) => { const f = 1 + (r() - 0.5) * amt; return shade(c, f); };

function noiseFill(px, r, cols, amt = 0.18, hAmt = 0.5) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const c = cols[Math.floor(r() * cols.length)];
    const h = 0.5 + (r() - 0.5) * hAmt;
    px.set(x, y, jitter(c, r, amt), h);
  }
}
function bricks(px, r, base, mortar, { bw = 8, bh = 4, offset = 4, crack = 0, moss = 0, mossCol } = {}) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const row = Math.floor(y / bh);
    const ox = (row % 2) * offset;
    const bx = (x + ox) % bw, by = y % bh;
    const isM = by === bh - 1 || bx === bw - 1;
    if (isM) { px.set(x, y, jitter(mortar, r, 0.15), 0.1); continue; }
    const brickId = row * 7 + Math.floor((x + ox) / bw);
    const rb = mulberry32(brickId * 97 + 13);
    let c = jitter(base, rb, 0.22);
    c = jitter(c, r, 0.12);
    let h = 0.75 + (r() - 0.5) * 0.2;
    if (bx === 0 || by === 0) { c = shade(c, 1.12); h = 0.85; }
    if (bx === bw - 2 || by === bh - 2) { c = shade(c, 0.88); h = 0.65; }
    px.set(x, y, c, h);
  }
  if (moss) for (let i = 0; i < moss; i++) {
    let x = Math.floor(r() * TILE), y = Math.floor(r() * TILE);
    for (let k = 0; k < 6; k++) {
      px.set(x, y, jitter(mossCol, r, 0.3), 0.9);
      x = clamp(x + Math.round(r() * 2 - 1), 0, 15); y = clamp(y + (r() < 0.6 ? 1 : 0), 0, 15);
    }
  }
  for (let i = 0; i < crack; i++) {
    let x = Math.floor(r() * TILE), y = Math.floor(r() * 4);
    for (let k = 0; k < 10; k++) {
      px.set(x, y, shade(mortar, 0.5), 0.0);
      x = clamp(x + Math.round(r() * 2 - 1), 0, 15); y = clamp(y + 1, 0, 15);
    }
  }
}
function planks(px, r, base, { dir = 'h', ph = 4, dark = 0.72 } = {}) {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const a = dir === 'h' ? y : x, b = dir === 'h' ? x : y;
    const plank = Math.floor(a / ph);
    const seam = a % ph === ph - 1;
    const joint = (b + plank * 5) % 16 === 0;
    const rp = mulberry32(plank * 31 + 7);
    let c = jitter(base, rp, 0.18);
    const grain = Math.sin((b + rp() * 20) * 0.9 + a * 2.1) * 0.06;
    c = shade(c, 1 + grain + (r() - 0.5) * 0.08);
    let h = 0.7 + grain;
    if (seam || joint) { c = shade(base, dark); h = 0.15; }
    px.set(x, y, c, h);
  }
  // nail heads
  for (let i = 0; i < 2; i++) px.set(2 + i * 11, 1, shade(base, 0.45), 0.9);
}
function each(px, f) { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const [c, h] = f(x, y); px.set(x, y, c, h); } }
function paintTile(name, px, r) {
  switch (name) {
    case 'stone': noiseFill(px, r, [C(0x7a7a80), C(0x6e6e74), C(0x85858a)], 0.14);
      for (let i = 0; i < 6; i++) { const x = r() * 16 | 0, y = r() * 16 | 0; px.set(x, y, C(0x5a5a60), 0.2); px.set(Math.min(15, x + 1), y, C(0x626268), 0.3); }
      break;
    case 'stone_brick': bricks(px, r, C(0x77767c), C(0x4a4a50), { bw: 8, bh: 8, offset: 4 }); break;
    case 'mossy_brick': bricks(px, r, C(0x6f7270), C(0x464a46), { bw: 8, bh: 8, offset: 4, moss: 6, mossCol: C(0x4f7a3a) }); break;
    case 'cracked_brick': bricks(px, r, C(0x716f75), C(0x403f44), { bw: 8, bh: 8, offset: 4, crack: 3 }); break;
    case 'dark_brick': bricks(px, r, C(0x3b3440), C(0x1f1a24), { bw: 8, bh: 4, offset: 4 }); break;
    case 'red_brick': bricks(px, r, C(0x8e4a3c), C(0x5b4b44), { bw: 8, bh: 4, offset: 4 }); break;
    case 'cobble': {
      noiseFill(px, r, [C(0x6a6a6c)], 0.1, 0.1);
      for (let i = 0; i < 9; i++) {
        const cx = r() * 16, cy = r() * 16, rad = 2 + r() * 2.5; const col = jitter(C(0x8a8a8c), r, 0.3);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d < rad) px.set(x, y, shade(col, 1.1 - d / rad * 0.3), 1 - d / rad * 0.6);
        }
      }
      break;
    }
    case 'dirt': noiseFill(px, r, [C(0x6b4a33), C(0x5d402c), C(0x7a553a), C(0x4e3625)], 0.12); break;
    case 'grass_top': noiseFill(px, r, [C(0x4f8a35), C(0x5c9a3c), C(0x467d2f), C(0x68a845)], 0.12, 0.7); break;
    case 'grass_side': {
      noiseFill(px, r, [C(0x6b4a33), C(0x5d402c), C(0x7a553a)], 0.12);
      for (let x = 0; x < 16; x++) { const d = 3 + (r() * 3 | 0); for (let y = 0; y < d; y++) px.set(x, y, jitter(C(0x55913a), r, 0.2), 0.8); }
      break;
    }
    case 'cursed_grass_top': noiseFill(px, r, [C(0x3a4a32), C(0x2f3f2b), C(0x45553a), C(0x4a3a52)], 0.14, 0.7); break;
    case 'cursed_grass_side': {
      noiseFill(px, r, [C(0x3f2e2a), C(0x35261f)], 0.12);
      for (let x = 0; x < 16; x++) { const d = 3 + (r() * 3 | 0); for (let y = 0; y < d; y++) px.set(x, y, jitter(C(0x3c4c34), r, 0.2), 0.8); }
      break;
    }
    case 'moss_floor': noiseFill(px, r, [C(0x3d5a2e), C(0x2f4a26), C(0x4a6632), C(0x5a4a33)], 0.15, 0.8); break;
    case 'planks': planks(px, r, C(0x9a7446)); break;
    case 'dark_planks': planks(px, r, C(0x4d3421)); break;
    case 'floor_boards': planks(px, r, C(0x8a6440), { dir: 'v', ph: 4 }); break;
    case 'log_side': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const s = Math.sin(x * 1.7 + (r() - 0.5)) * 0.1; px.set(x, y, jitter(shade(C(0x5a3d24), 1 + s), r, 0.1), 0.6 + s);
    } break;
    case 'log_top': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5); const ring = Math.sin(d * 1.8) * 0.12;
      px.set(x, y, d > 7 ? C(0x4a321e) : jitter(shade(C(0xa7834f), 1 + ring), r, 0.06), 0.6 + ring);
    } break;
    case 'roof_tile': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const row = y >> 2, ox = (row & 1) * 2; const u = (x + ox) % 4;
      const curve = Math.sin((u / 4) * Math.PI);
      const c = shade(C(0x3b4250), 0.7 + curve * 0.45 - (y % 4 === 3 ? 0.25 : 0));
      px.set(x, y, jitter(c, r, 0.06), curve * 0.8 + (y % 4 === 3 ? -0.3 : 0.2));
    } break;
    case 'red_lacquer': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const band = y < 2 || y > 13; px.set(x, y, band ? jitter(C(0x1d1a1a), r, 0.1) : jitter(C(0xb5281f), r, 0.1), band ? 0.4 : 0.7);
    } break;
    case 'tatami': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const weave = ((x + (y >> 1)) % 2) * 0.06; const edge = x === 0 || x === 15;
      px.set(x, y, edge ? jitter(C(0x2b3a28), r, 0.1) : jitter(shade(C(0xb7b074), 1 - weave), r, 0.06), edge ? 0.8 : 0.5 + weave);
    } break;
    case 'asphalt': noiseFill(px, r, [C(0x2d2e33), C(0x34353a), C(0x28292d), C(0x3a3a40)], 0.2, 0.4); break;
    case 'asphalt_line': noiseFill(px, r, [C(0x2d2e33), C(0x34353a), C(0x28292d)], 0.2, 0.4);
      for (let y = 0; y < 16; y++) for (let x = 6; x < 10; x++) if (y % 8 < 5) px.set(x, y, jitter(C(0xd9cf9a), r, 0.1), 0.6);
      break;
    case 'concrete': noiseFill(px, r, [C(0x8c8b88), C(0x84837f), C(0x93928e)], 0.07, 0.25);
      for (let x = 0; x < 16; x++) { px.set(x, 15, C(0x6a6966), 0.1); px.set(15, x, C(0x6a6966), 0.1); }
      break;
    case 'subway_tile': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const g = x % 8 === 7 || y % 4 === 3; px.set(x, y, g ? C(0x8f9795) : jitter(C(0xd8e0dc), r, 0.05), g ? 0.2 : 0.8);
    } break;
    case 'subway_floor': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const chk = ((x >> 2) + (y >> 2)) & 1; px.set(x, y, jitter(chk ? C(0x55595c) : C(0x6a6e70), r, 0.08), 0.55 + chk * 0.1);
    } break;
    case 'metal_grate': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const hole = (x % 4 !== 0) && (y % 4 !== 0); px.set(x, y, hole ? C(0x1c1e20) : jitter(C(0x6d7479), r, 0.1), hole ? 0.05 : 0.9);
    } break;
    case 'sand': noiseFill(px, r, [C(0xc8b37e), C(0xbfa874), C(0xd1bd8a)], 0.08, 0.3); break;
    case 'water': noiseFill(px, r, [C(0x2a5a8a), C(0x2f6496), C(0x275584)], 0.08, 0.3); break;
    case 'cursed_pool': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.8 + y * 0.5) * Math.cos(y * 0.9 - x * 0.3);
      px.set(x, y, jitter(mix(C(0x5a1a9a), C(0xd070ff), v * 0.5 + 0.5), r, 0.1), 0.5 + v * 0.3);
    } break;
    case 'lava': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.9 + y * 0.4) * Math.cos(y * 0.7 - x * 0.5);
      px.set(x, y, jitter(mix(C(0xc23a08), C(0xffc23a), v * 0.5 + 0.5), r, 0.1), 0.5 + v * 0.3);
    } break;
    case 'lantern': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const frame = x < 1 || x > 14 || y < 2 || y > 13; const rib = y % 4 === 1;
      px.set(x, y, frame ? C(0x1f1612) : rib ? C(0xd8812e) : jitter(C(0xffc766), r, 0.06), frame ? 0.9 : 0.4);
    } break;
    case 'gold_trim': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const p = ((x + y) % 6 === 0); px.set(x, y, jitter(p ? C(0xfff0a0) : C(0xc9a23c), r, 0.1), p ? 0.9 : 0.6);
    } break;
    case 'plaster': noiseFill(px, r, [C(0xe6e0d2), C(0xdcd6c8), C(0xefe9dc)], 0.05, 0.15); break;
    case 'shoji': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const f = x % 5 === 0 || y % 5 === 0; px.set(x, y, f ? C(0x5a3a22) : jitter(C(0xf2ead0), r, 0.03), f ? 0.9 : 0.3);
    } break;
    case 'obsidian': noiseFill(px, r, [C(0x1d1826), C(0x241d30), C(0x16121e), C(0x2e2340)], 0.2, 0.6); break;
    case 'leaves': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = r(); px.set(x, y, v < 0.12 ? C(0x1d3a18) : jitter(C(0x3d7a2c), r, 0.35), v < 0.12 ? 0.1 : 0.4 + v * 0.5);
    } break;
    case 'dead_leaves': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = r(); px.set(x, y, v < 0.15 ? C(0x1a1420) : jitter(C(0x4a3860), r, 0.35), v < 0.15 ? 0.1 : 0.4 + v * 0.5);
    } break;
    case 'polished': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.4 + y * 0.9 + Math.sin(y * 0.5) * 2) * 0.5 + 0.5;
      px.set(x, y, mix(C(0x2a2a33), C(0x4c4c5a), v * 0.6 + r() * 0.1), 0.5);
    } break;
    case 'marble': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.5 + y * 0.8 + Math.sin(x * 0.7) * 2) * 0.5 + 0.5;
      px.set(x, y, mix(C(0xdcdcdc), C(0xa9a9b4), Math.pow(v, 4)), 0.5);
    } break;
    case 'window': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const frame = x < 1 || x > 14 || y < 1 || y > 14 || x === 7 || x === 8 || y === 7;
      px.set(x, y, frame ? C(0x2a2c30) : mix(C(0xffd98a), C(0xffb74a), y / 16 + r() * 0.1), frame ? 0.9 : 0.3);
    } break;
    case 'window_dark': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const frame = x < 1 || x > 14 || y < 1 || y > 14 || x === 7 || x === 8 || y === 7;
      px.set(x, y, frame ? C(0x2a2c30) : mix(C(0x1a2436), C(0x33476a), 1 - y / 16 + r() * 0.1), frame ? 0.9 : 0.3);
    } break;
    case 'crate': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x < 2 || x > 13 || y < 2 || y > 13; const diag = Math.abs(x - y) < 1.5 || Math.abs(x - (15 - y)) < 1.5;
      const base = edge || diag ? C(0x7b5530) : C(0xa27a47);
      px.set(x, y, jitter(base, r, 0.12), edge || diag ? 0.9 : 0.5);
    } break;
    case 'barrel_side': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const band = y === 2 || y === 3 || y === 12 || y === 13; const stave = x % 4 === 0;
      px.set(x, y, band ? jitter(C(0x55585c), r, 0.1) : jitter(shade(C(0x8a5a32), stave ? 0.75 : 1), r, 0.1), band ? 0.9 : stave ? 0.3 : 0.6);
    } break;
    case 'barrel_top': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      px.set(x, y, d > 6.5 ? C(0x55585c) : jitter(shade(C(0x7a4e2b), x % 4 === 0 ? 0.8 : 1), r, 0.08), d > 6.5 ? 0.9 : 0.5);
    } break;
    case 'bone_block': noiseFill(px, r, [C(0xe0dac4), C(0xd4ceb6)], 0.05, 0.2);
      for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) px.set(x, y, C(0xa9a38e), 0.2);
      break;
    case 'talisman_wall': bricks(px, r, C(0x6b6770), C(0x3c3a40), { bw: 8, bh: 8, offset: 4 });
      for (let y = 3; y < 14; y++) for (let x = 6; x < 10; x++) px.set(x, y, y === 3 ? C(0xc93a2a) : jitter(C(0xe8d9a0), r, 0.05), 0.95);
      for (let y = 5; y < 12; y += 2) px.set(7 + (y & 1), y, C(0xa81f1f), 0.95);
      break;
    case 'blood_brick': bricks(px, r, C(0x5a2a2e), C(0x2a1416), { bw: 8, bh: 8, offset: 4, moss: 5, mossCol: C(0x8a1414) }); break;
    case 'void_floor': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const star = r() < 0.04; px.set(x, y, star ? C(0xcfe8ff) : jitter(C(0x0b0d22), r, 0.4), 0.5);
    } break;
    case 'shrine_floor': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const g = x % 8 === 0 || y % 8 === 0; px.set(x, y, g ? C(0x2a0808) : jitter(C(0x5a1010), r, 0.25), g ? 0.1 : 0.6);
    } break;
    case 'shadow_floor': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.6 + y * 0.3) * 0.5 + 0.5; px.set(x, y, mix(C(0x06060a), C(0x1a1a2a), v * 0.5 + r() * 0.2), 0.3);
    } break;
    case 'vending': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const glass = x > 1 && x < 11 && y > 1 && y < 11; const btn = x > 12 && x < 15 && y % 3 === 1 && y < 11;
      px.set(x, y, glass ? mix(C(0x9fd6ff), C(0xffffff), ((x + y) % 5 === 0) ? 0.6 : 0.1) : btn ? C(0xff4a4a) : jitter(C(0xc2334a), r, 0.05), glass ? 0.3 : 0.8);
    } break;
    case 'sign': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const border = x < 1 || x > 14 || y < 1 || y > 14; const glyph = !border && ((x * 7 + y * 3) % 5 === 0) && y > 3 && y < 12;
      px.set(x, y, border ? C(0x222222) : glyph ? C(0xffffff) : C(0x1d6fd8), 0.5);
    } break;
    case 'neon_pink': noiseFill(px, r, [C(0xff5fb0), C(0xff7ac0)], 0.05, 0.1); break;
    case 'blue_energy': noiseFill(px, r, [C(0x3ad0ff), C(0x6ae0ff), C(0x9ff0ff)], 0.1, 0.2); break;
    case 'rail': noiseFill(px, r, [C(0x3b3129), C(0x453a30)], 0.15, 0.4);
      for (let y = 0; y < 16; y++) { for (const x of [3, 12]) { px.set(x, y, C(0xa7a9ac), 1); px.set(x + 1, y, C(0x7a7c80), 0.9); } }
      for (let y = 1; y < 16; y += 5) for (let x = 0; x < 16; x++) if (x !== 3 && x !== 4 && x !== 12 && x !== 13) px.set(x, y, C(0x5a4030), 0.7);
      break;
    case 'bark_dark': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const s = Math.sin(x * 2.1 + Math.sin(y * 0.4)) * 0.12; px.set(x, y, jitter(shade(C(0x2e2230), 1 + s), r, 0.12), 0.6 + s);
    } break;

    // ------------------------------------------------ Half-Blood Quests tiles
    case 'clapboard_blue': each(px, (x, y) => {
      const b = y % 4; const rb = mulberry32((y >> 2) * 13 + 5);
      const c = shade(C(0x4f78b0), 1.06 - b * 0.07 + (rb() - 0.5) * 0.06);
      return b === 3 ? [shade(C(0x2c4670), 1), 0.1] : [jitter(c, r, 0.05), 0.75 - b * 0.12];
    }); break;
    case 'white_trim': planks(px, r, C(0xeeeae0), { dir: 'v', ph: 8, dark: 0.82 }); break;
    case 'window_day': each(px, (x, y) => {
      const frame = x < 2 || x > 13 || y < 2 || y > 13 || x === 7 || x === 8 || y === 7 || y === 8;
      if (frame) return [jitter(C(0xf2efe6), r, 0.04), 0.9];
      const refl = (x + (15 - y)) % 9 < 2;
      return [refl ? C(0xcfe6f5) : mix(C(0x6f9cc4), C(0x2d4c6e), y / 16), 0.25];
    }); break;
    case 'roof_slate': each(px, (x, y) => {
      const row = y >> 2, ox = (row & 1) * 4; const u = (x + ox) % 8;
      const rb = mulberry32(row * 17 + ((x + ox) >> 3) * 3);
      const c = shade(C(0x3e4a5e), 0.85 + rb() * 0.3 - (y % 4 === 3 ? 0.3 : 0) - (u === 0 ? 0.2 : 0));
      return [jitter(c, r, 0.05), y % 4 === 3 || u === 0 ? 0.2 : 0.7];
    }); break;
    case 'roof_terracotta': each(px, (x, y) => {
      const row = y >> 2, ox = (row & 1) * 2; const u = (x + ox) % 4;
      const curve = Math.sin((u / 4) * Math.PI);
      const c = shade(C(0xc4552e), 0.72 + curve * 0.42 - (y % 4 === 3 ? 0.25 : 0));
      return [jitter(c, r, 0.06), curve * 0.8 + (y % 4 === 3 ? -0.3 : 0.2)];
    }); break;
    case 'marble_white': each(px, (x, y) => {
      const v = Math.sin(x * 0.45 + y * 0.7 + Math.sin(y * 0.6 + x * 0.2) * 2.4) * 0.5 + 0.5;
      return [jitter(mix(C(0xf4f1ea), C(0xc9c6c2), Math.pow(v, 6)), r, 0.025), 0.55];
    }); break;
    case 'column_side': each(px, (x, y) => {
      const f = x % 4; const c = f === 0 ? C(0xb9b4ab) : f === 1 ? C(0xe2ddd3) : f === 2 ? C(0xf6f3ec) : C(0xd8d3c9);
      return [jitter(c, r, 0.03), f === 0 ? 0.15 : f === 2 ? 0.9 : 0.6];
    }); break;
    case 'column_top': each(px, (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const ring = d > 6.2 ? C(0xcfcac0) : d > 5 ? C(0xf2eee6) : C(0xe6e1d8);
      return [jitter(ring, r, 0.03), d > 6.2 ? 0.3 : 0.7];
    }); break;
    case 'marble_floor': each(px, (x, y) => {
      const chk = ((x >> 3) + (y >> 3)) & 1;
      const v = Math.sin(x * 0.6 + y * 0.9 + Math.sin(x * 0.8) * 1.8) * 0.5 + 0.5;
      const base = chk ? C(0xeee6d6) : C(0xb9ab98);
      const grout = x % 8 === 0 || y % 8 === 0;
      return [grout ? shade(base, 0.82) : mix(base, shade(base, 0.8), Math.pow(v, 5)), grout ? 0.3 : 0.55];
    }); break;
    case 'gallery_wall': each(px, (x, y) => {
      const seam = y === 15 || (x === 15 && y > 8) || (x === 7 && y <= 8) || y === 8;
      return [seam ? C(0xcfc3ad) : jitter(C(0xebe2d0), r, 0.025), seam ? 0.3 : 0.6];
    }); break;
    case 'key_frieze': { // gold meander on dark teal
      const KEY = ['.#########......', '.#.......#......', '.#.#####.#......', '.#.#...#.#......', '.#.#.#.#.#......', '.#...#.#.#......', '.#####.#.#......', '.......#.#......', '########.#######', '................'];
      each(px, (x, y) => {
        if (y < 2 || y > 13) return [y === 0 || y === 15 ? C(0x9a7428) : C(0xd6aa4a), 0.85];
        if (y === 2 || y === 13) return [C(0x0b3a3f), 0.3];
        const on = KEY[y - 3][x] === '#';
        return on ? [jitter(C(0xe2b24c), r, 0.08), 0.85] : [jitter(C(0x0f4f55), r, 0.08), 0.35];
      });
      break;
    }
    case 'vase_frieze': each(px, (x, y) => { // black-figure band on terracotta
      if (y < 2 || y > 13) return [C(0x17130f), 0.5];
      if (y === 2 || y === 13) return [C(0xd9813a), 0.6];
      const fig = (() => { const fx = (x + 16) % 8; if (fx === 3 || fx === 4) return y > 4 && y < 12; if (fx === 2 || fx === 5) return y === 4 || (y > 6 && y < 9) || y === 11 || y === 12; return (fx === 1 || fx === 6) && y === 7; })();
      return fig ? [C(0x17130f), 0.8] : [jitter(C(0xd9813a), r, 0.06), 0.5];
    }); break;
    case 'glass': each(px, (x, y) => {
      const edge = x === 0 || y === 0 || x === 15 || y === 15; const glint = (x - y === 3 || x - y === 5) && x > 2 && x < 13;
      return [edge ? C(0xc9a24a) : glint ? C(0xf4fbff) : jitter(C(0xb8d8e4), r, 0.03), edge ? 0.9 : 0.4];
    }); break;
    case 'plinth': each(px, (x, y) => {
      const v = r(); const edge = y < 2 || y > 13;
      return [edge ? C(0x6a7472) : v < 0.12 ? C(0x9aa6a2) : jitter(C(0x4a5654), r, 0.15), edge ? 0.8 : 0.5];
    }); break;
    case 'bronze': each(px, (x, y) => {
      const rivet = (x === 2 || x === 13) && (y === 2 || y === 13); const seam = x === 0 || y === 0;
      const g = Math.sin(x * 0.7 + y * 0.3) * 0.08;
      return [rivet ? C(0xffe0a0) : seam ? C(0x6a4a1c) : jitter(shade(C(0xc9963a), 1 + g), r, 0.08), rivet ? 1 : seam ? 0.1 : 0.6];
    }); break;
    case 'sea_stone': {
      noiseFill(px, r, [C(0x8a9296), C(0x7c8488), C(0x969fa2), C(0x6f777b)], 0.1, 0.6);
      for (let i = 0; i < 3; i++) { const cx = 2 + r() * 12 | 0, cy = 2 + r() * 12 | 0; // scallop shells
        for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 0; dy++) if (dx * dx + dy * dy <= 4) px.set(cx + dx, cy + dy, (dx & 1) ? C(0xf2d9c4) : C(0xe8b8a0), 0.95);
        px.set(cx, cy + 1, C(0xd49a84), 0.9); }
      for (let i = 0; i < 6; i++) px.set(r() * 16 | 0, r() * 16 | 0, C(0x3f7f78), 0.7);
      break;
    }
    case 'red_plank': planks(px, r, C(0xa8261e), { ph: 4, dark: 0.55 }); break;
    case 'owl_stone': bricks(px, r, C(0x9aa3ae), C(0x5d6570), { bw: 8, bh: 4, offset: 4 }); break;
    case 'gold_plate': each(px, (x, y) => {
      const sun = Math.hypot(x - 7.5, y - 7.5); const ray = sun > 3 && sun < 6.5 && (Math.round(Math.atan2(y - 7.5, x - 7.5) / (Math.PI / 4) * 2) % 2 === 0);
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      return [edge ? C(0xa8781e) : sun < 3 || ray ? C(0xfff0a0) : jitter(C(0xe8b838), r, 0.06), edge ? 0.3 : sun < 3 ? 0.9 : 0.6];
    }); break;
    case 'silver_plate': each(px, (x, y) => {
      const edge = x === 0 || y === 0 || x === 15 || y === 15; const v = Math.sin((x + y) * 0.5) * 0.06;
      return [edge ? C(0x8a96a8) : jitter(shade(C(0xd9e2ee), 1 + v), r, 0.04), edge ? 0.3 : 0.6];
    }); break;
    case 'pink_plaster': noiseFill(px, r, [C(0xf2a7b8), C(0xeea0b2), C(0xf6b4c3)], 0.04, 0.15);
      for (let x = 0; x < 16; x++) { px.set(x, 0, C(0xffffff), 0.8); px.set(x, 15, C(0xd9879a), 0.2); }
      break;
    case 'old_plank': planks(px, r, C(0x7a5a3a), { ph: 4, dark: 0.6 });
      for (let i = 0; i < 10; i++) px.set(r() * 16 | 0, r() * 16 | 0, C(0x5a4630), 0.3);
      break;
    case 'vine_wall': planks(px, r, C(0x8a6440), { ph: 4 });
      for (let v = 0; v < 3; v++) { let x = 2 + v * 5 + (r() * 2 | 0);
        for (let y = 0; y < 16; y++) { px.set(x, y, jitter(C(0x3f7a2a), r, 0.2), 0.9); if (r() < 0.3) px.set(x + 1, y, C(0x5a9a3a), 0.9); if (r() < 0.25) x = clamp(x + (r() < 0.5 ? -1 : 1), 0, 15); }
        const gy = 4 + (r() * 8 | 0); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]) px.set(x + dx + 1, gy + dy, C(0x6a2a7a), 1); }
      break;
    case 'grass_roof': noiseFill(px, r, [C(0x6a9a3a), C(0x7aaa44), C(0x5a8a30)], 0.12, 0.8);
      for (let i = 0; i < 5; i++) { const x = r() * 16 | 0, y = r() * 16 | 0; px.set(x, y, [C(0xffe066), C(0xffffff), C(0xe8664a)][i % 3], 1); }
      for (let i = 0; i < 4; i++) { const x = r() * 16 | 0; for (let y = 0; y < 3; y++) px.set(x, (r() * 13 | 0) + y, C(0xd8b84a), 0.9); }
      break;
    case 'iron_plate': each(px, (x, y) => {
      const rivet = (x % 8 === 2) && (y % 8 === 2); const seam = x % 8 === 0 || y % 8 === 0;
      return [rivet ? C(0x9aa0a8) : seam ? C(0x24272b) : jitter(C(0x4a4f56), r, 0.12), rivet ? 1 : seam ? 0.1 : 0.55];
    }); break;
    case 'gravel_path': {
      noiseFill(px, r, [C(0xc8b48a), C(0xbba57a), C(0xd4c29a), C(0xb09a70)], 0.08, 0.4);
      for (let i = 0; i < 14; i++) { const x = r() * 16 | 0, y = r() * 16 | 0; px.set(x, y, C(0xe8dcc0), 0.9); px.set(x + 1, y, C(0x9a8460), 0.2); }
      break;
    }
    case 'strawberry_top': each(px, (x, y) => {
      if (y % 8 >= 6) return [jitter(C(0x5a3a26), r, 0.15), 0.2];
      const leaf = ((x * 3 + y * 5) % 7) < 5;
      return [leaf ? jitter(C(0x3f8a34), r, 0.25) : C(0x2e5a24), leaf ? 0.8 : 0.5];
    });
      for (let i = 0; i < 9; i++) { const x = r() * 15 | 0, y = (r() < 0.5 ? 1 : 9) + (r() * 4 | 0); px.set(x, y, C(0xe02a2a), 1); px.set(x + 1, y, C(0xc41c24), 1); px.set(x, y + 1, C(0xa8141c), 0.9); }
      break;
    case 'farm_soil': each(px, (x, y) => { const f = y % 4; return [jitter(f === 0 ? C(0x7a5236) : f === 3 ? C(0x4a3020) : C(0x634330), r, 0.12), f === 0 ? 0.8 : f === 3 ? 0.1 : 0.5]; }); break;
    case 'pine_leaves': each(px, (x, y) => {
      const v = r(); const needle = (x + y * 2) % 5 === 0;
      return [v < 0.14 ? C(0x0e2418) : needle ? C(0x3f7a52) : jitter(C(0x24553a), r, 0.3), v < 0.14 ? 0.1 : 0.5 + v * 0.4];
    }); break;
    case 'pine_bark': each(px, (x, y) => {
      const s = Math.sin(x * 1.9 + Math.sin(y * 0.5) * 1.5) * 0.14; const plate = (y + (x >> 2) * 5) % 7 === 0;
      return [plate ? C(0x3a2216) : jitter(shade(C(0x7a4a2e), 1 + s), r, 0.1), plate ? 0.1 : 0.6 + s];
    }); break;
    case 'forest_floor': {
      noiseFill(px, r, [C(0x4e5a2e), C(0x5a4a2e), C(0x46522a), C(0x6a5634)], 0.18, 0.7);
      for (let i = 0; i < 10; i++) { const x = r() * 15 | 0, y = r() * 15 | 0; px.set(x, y, C(0x8a5a2a), 0.7); px.set(x + 1, y + 1, C(0x8a5a2a), 0.7); }
      break;
    }
    case 'rock': {
      noiseFill(px, r, [C(0x8d8f8c), C(0x7f817e), C(0x999b97), C(0x737571)], 0.1, 0.7);
      for (let i = 0; i < 4; i++) { let x = r() * 16 | 0, y = r() * 16 | 0; for (let k = 0; k < 5; k++) { px.set(x, y, C(0x5c5e5b), 0.1); x = clamp(x + (r() < 0.5 ? 1 : 0), 0, 15); y = clamp(y + 1, 0, 15); } }
      for (let i = 0; i < 4; i++) { const x = r() * 15 | 0, y = r() * 15 | 0; px.set(x, y, C(0x9aa86a), 0.8); px.set(x + 1, y, C(0xb4b878), 0.8); }
      break;
    }
    case 'basalt': {
      noiseFill(px, r, [C(0x3a3634), C(0x332f2d), C(0x423d3a)], 0.15, 0.6);
      const holds = [C(0xf28c28), C(0xffd84a), C(0x2e8b6e), C(0xe8664a)];
      for (let i = 0; i < 3; i++) { const x = 2 + r() * 11 | 0, y = 2 + r() * 11 | 0, c = holds[i % 4]; px.set(x, y, c, 1); px.set(x + 1, y, c, 1); px.set(x, y + 1, shade(c, 0.7), 0.9); px.set(x + 1, y + 1, shade(c, 0.7), 0.9); }
      break;
    }
    case 'target_face': each(px, (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const c = d < 2 ? C(0xffd84a) : d < 4 ? C(0xd8322a) : d < 6 ? C(0x2a6ad8) : d < 7.6 ? C(0xf4f0e6) : C(0xd9c48a);
      return [c, d < 7.6 ? 0.7 : 0.4];
    }); break;
    case 'hay': each(px, (x, y) => {
      const band = y === 4 || y === 11; const s = Math.sin(x * 2.3 + y * 0.7) * 0.1;
      return [band ? C(0x6a4a2a) : jitter(shade(C(0xd8b85a), 1 + s), r, 0.12), band ? 0.3 : 0.6 + s];
    }); break;
    case 'awning': each(px, (x, y) => {
      const stripe = (x >> 2) & 1; const scal = y > 12 && ((x % 4) - 1.5) ** 2 + (y - 12) ** 2 > 6;
      if (scal) return [C(0x6a3a1a), 0.1];
      return [jitter(stripe ? C(0xf28c28) : C(0xf6efe0), r, 0.04), 0.6];
    }); break;
    case 'barn_red': planks(px, r, C(0x8a2a22), { dir: 'v', ph: 4, dark: 0.55 }); break;
    case 'dirt_road': each(px, (x, y) => {
      const rut = x === 3 || x === 4 || x === 11 || x === 12;
      return [jitter(rut ? C(0x4a3424) : C(0x6f5238), r, 0.14), rut ? 0.2 : 0.6];
    }); break;
    case 'teal_panel': each(px, (x, y) => {
      const edge = x === 0 || y === 0 || x === 15 || y === 15; const inner = x === 2 || y === 2 || x === 13 || y === 13;
      return [edge ? C(0x0a3a3e) : inner ? C(0xc9963a) : jitter(C(0x0f6f73), r, 0.06), edge ? 0.2 : inner ? 0.85 : 0.5];
    }); break;
    case 'carpet_red': each(px, (x, y) => {
      const edge = x < 2 || x > 13; const gold = x === 2 || x === 13;
      return [gold ? C(0xd6aa4a) : edge ? C(0x5a1418) : jitter(C(0x9a1e24), r, 0.08), 0.4];
    }); break;
    case 'navy_panel': each(px, (x, y) => {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      return [edge ? C(0xc9963a) : jitter(C(0x10233d), r, 0.12), edge ? 0.8 : 0.5];
    }); break;
    case 'shingle_green': each(px, (x, y) => {
      const row = y >> 2, ox = (row & 1) * 4; const u = (x + ox) % 8;
      const c = shade(C(0x3f6a4a), 0.85 + mulberry32(row * 7 + ((x + ox) >> 3))() * 0.3 - (y % 4 === 3 ? 0.3 : 0) - (u === 0 ? 0.2 : 0));
      return [jitter(c, r, 0.05), y % 4 === 3 || u === 0 ? 0.2 : 0.7];
    }); break;
    case 'mud': noiseFill(px, r, [C(0x6a5038), C(0x5c4430), C(0x765a40)], 0.1, 0.3);
      for (let i = 0; i < 3; i++) { const x = r() * 12 | 0, y = r() * 14 | 0; for (let k = 0; k < 4; k++) px.set(x + k, y, C(0x7a8a96), 0.05); }
      break;
    case 'lightning_stone': each(px, (x, y) => { // Zeus: white marble with a gold bolt
      const bolt = (y < 8 && Math.abs(x - (10 - y * 0.6)) < 1.2) || (y >= 7 && Math.abs(x - (12 - (y - 7) * 0.9)) < 1.2) || (y === 7 && x > 4 && x < 12);
      const v = Math.sin(x * 0.5 + y * 0.8) * 0.5 + 0.5;
      return bolt ? [C(0xffd84a), 0.95] : [jitter(mix(C(0xf2efe8), C(0xcdc9c2), Math.pow(v, 6)), r, 0.03), 0.55];
    }); break;
    default: if (!paintExtraTile(name, px, r, { C, mix, shade, jitter, noiseFill, bricks, planks, each })) noiseFill(px, r, [C(0xff00ff), C(0x000000)], 0, 0);
  }
}

export const TILE_NAMES = [
  'stone', 'stone_brick', 'mossy_brick', 'cracked_brick', 'dark_brick', 'red_brick', 'cobble', 'dirt',
  'grass_top', 'grass_side', 'cursed_grass_top', 'cursed_grass_side', 'moss_floor', 'planks', 'dark_planks', 'floor_boards',
  'log_side', 'log_top', 'roof_tile', 'red_lacquer', 'tatami', 'asphalt', 'asphalt_line', 'concrete',
  'subway_tile', 'subway_floor', 'metal_grate', 'sand', 'water', 'cursed_pool', 'lava', 'lantern',
  'gold_trim', 'plaster', 'shoji', 'obsidian', 'leaves', 'dead_leaves', 'polished', 'marble',
  'window', 'window_dark', 'crate', 'barrel_side', 'barrel_top', 'bone_block', 'talisman_wall', 'blood_brick',
  'void_floor', 'shrine_floor', 'shadow_floor', 'vending', 'sign', 'neon_pink', 'blue_energy', 'rail', 'bark_dark',
  // Half-Blood Quests
  'clapboard_blue', 'white_trim', 'window_day', 'roof_slate', 'roof_terracotta', 'marble_white', 'column_side', 'column_top',
  'marble_floor', 'gallery_wall', 'key_frieze', 'vase_frieze', 'glass', 'plinth', 'bronze', 'sea_stone',
  'red_plank', 'owl_stone', 'gold_plate', 'silver_plate', 'pink_plaster', 'old_plank', 'vine_wall', 'grass_roof',
  'iron_plate', 'gravel_path', 'strawberry_top', 'farm_soil', 'pine_leaves', 'pine_bark', 'forest_floor', 'rock',
  'basalt', 'target_face', 'hay', 'awning', 'barn_red', 'dirt_road', 'teal_panel', 'carpet_red',
  'navy_panel', 'shingle_green', 'mud', 'lightning_stone',
  // the Book 1 road-trip worlds (world/textures.js)
  ...EXTRA_TILES,
];
export const TILE_INDEX = Object.fromEntries(TILE_NAMES.map((n, i) => [n, i]));

// Returns [u0, v0, u1, v1] of a tile's 16x16 content area.
export function tileUV(index) {
  const col = index % COLS, row = Math.floor(index / COLS);
  const u0 = (col * CELL + PAD) / ATLAS_W, u1 = (col * CELL + PAD + TILE) / ATLAS_W;
  const v1 = 1 - (row * CELL + PAD) / ATLAS_H, v0 = 1 - (row * CELL + PAD + TILE) / ATLAS_H;
  return [u0, v0, u1, v1];
}
// Average colour per tile (for debris cubes, minimap, particles).
export const tileAvgColor = [];

function makePx() {
  const col = new Float32Array(TILE * TILE * 3), h = new Float32Array(TILE * TILE);
  return {
    col, h,
    set(x, y, c, height = 0.5) { if (x < 0 || y < 0 || x >= TILE || y >= TILE) return; const i = y * TILE + x; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; h[i] = height; },
  };
}

// Writes a tile + its extruded gutter into ImageData.
function blit(img, index, fn) {
  const col = index % COLS, row = Math.floor(index / COLS);
  const ox = col * CELL, oy = row * CELL;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const sx = clamp(x - PAD, 0, TILE - 1), sy = clamp(y - PAD, 0, TILE - 1);
    const o = ((oy + y) * img.width + ox + x) * 4;
    const c = fn(sx, sy);
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = c[3] ?? 255;
  }
}

export function buildBlockAtlas() {
  const cv = document.createElement('canvas'); cv.width = ATLAS_W; cv.height = ATLAS_H;
  const nv = document.createElement('canvas'); nv.width = ATLAS_W; nv.height = ATLAS_H;
  const ctx = cv.getContext('2d'), nctx = nv.getContext('2d');
  const img = ctx.createImageData(ATLAS_W, ATLAS_H), nimg = nctx.createImageData(ATLAS_W, ATLAS_H);
  TILE_NAMES.forEach((name, index) => {
    const px = makePx();
    paintTile(name, px, mulberry32(hashStr(name)));
    // bevel: pull edges down so every block reads as a chiselled cube
    const H = (x, y) => {
      x = clamp(x, 0, 15); y = clamp(y, 0, 15);
      const e = Math.min(x, y, 15 - x, 15 - y);
      const bevel = e === 0 ? -0.55 : e === 1 ? -0.18 : 0;
      return px.h[y * TILE + x] * 0.6 + bevel;
    };
    let ar = 0, ag = 0, ab = 0;
    blit(img, index, (x, y) => {
      const i = y * TILE + x; const e = Math.min(x, y, 15 - x, 15 - y);
      const f = e === 0 ? 0.86 : e === 1 ? 1.03 : 1; // light rim + dark edge
      return [clamp(px.col[i * 3] * f, 0, 255), clamp(px.col[i * 3 + 1] * f, 0, 255), clamp(px.col[i * 3 + 2] * f, 0, 255)];
    });
    for (let i = 0; i < TILE * TILE; i++) { ar += px.col[i * 3]; ag += px.col[i * 3 + 1]; ab += px.col[i * 3 + 2]; }
    const n = TILE * TILE; tileAvgColor[index] = new THREE.Color(ar / n / 255, ag / n / 255, ab / n / 255).convertSRGBToLinear();
    blit(nimg, index, (x, y) => {
      const k = 1.5;
      let nx = -(H(x + 1, y) - H(x - 1, y)) * k, ny = -(H(x, y - 1) - H(x, y + 1)) * k, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      return [(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255];
    });
  });
  ctx.putImageData(img, 0, 0); nctx.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestMipmapLinearFilter;
  map.anisotropy = 4; map.generateMipmaps = true;
  const normalMap = new THREE.CanvasTexture(nv);
  normalMap.magFilter = THREE.NearestFilter; normalMap.minFilter = THREE.NearestMipmapLinearFilter;
  normalMap.generateMipmaps = true;
  return { map, normalMap, canvas: cv };
}

// ---------------------------------------------------------------- sprites
// Alpha-tested decoration sprites: grass tufts, cobwebs, talismans, etc.
export const SPRITE_NAMES = ['grass', 'tall_grass', 'cobweb', 'talisman', 'chain', 'flower_red', 'flower_blue', 'cursed_weed', 'banner', 'fern', 'bone', 'candle', 'paper',
  // Half-Blood Quests: plants, details and the twelve cabin emblems
  'strawberry', 'barbed_wire', 'vine', 'reeds', 'shell', 'mushroom', 'leaf_litter', 'flower_yellow', 'puddle',
  'em_zeus', 'em_hera', 'em_poseidon', 'em_demeter', 'em_ares', 'em_athena', 'em_apollo', 'em_artemis', 'em_hephaestus', 'em_aphrodite', 'em_hermes', 'em_dionysus',
  'camp_banner', 'shard', ...EXTRA_SPRITES];
export const SPRITE_INDEX = Object.fromEntries(SPRITE_NAMES.map((n, i) => [n, i]));
const SCOLS = 8, SROWS = 6;
export function spriteUV(index) {
  const col = index % SCOLS, row = Math.floor(index / SCOLS);
  const W = SCOLS * CELL, Hh = SROWS * CELL;
  return [(col * CELL + PAD) / W, 1 - (row * CELL + PAD + TILE) / Hh, (col * CELL + PAD + TILE) / W, 1 - (row * CELL + PAD) / Hh];
}
function paintSprite(name, set, r) {
  const G = (hex) => C(hex);
  switch (name) {
    case 'grass': case 'tall_grass': case 'fern': case 'cursed_weed': {
      const base = name === 'cursed_weed' ? G(0x4a3a5a) : name === 'fern' ? G(0x3a7a34) : G(0x5aa23e);
      const blades = name === 'tall_grass' ? 7 : 6;
      for (let b = 0; b < blades; b++) {
        let x = 2 + r() * 12, lean = (r() - 0.5) * 0.6; const hgt = (name === 'tall_grass' ? 10 : 6) + r() * 5;
        for (let y = 15; y > 15 - hgt; y--) { set(Math.round(x), y, jitter(shade(base, 0.7 + (15 - y) / hgt * 0.5), r, 0.15)); x += lean; }
      }
      break;
    }
    case 'flower_red': case 'flower_blue': {
      const petal = name === 'flower_red' ? G(0xd8323a) : G(0x4a7aff);
      for (let y = 7; y < 16; y++) set(8, y, G(0x3f8a2e));
      set(7, 11, G(0x3f8a2e)); set(9, 12, G(0x3f8a2e));
      for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1]]) set(8 + dx, 5 + dy, petal);
      set(8, 5, G(0xffe066));
      break;
    }
    case 'cobweb': for (let i = 0; i < 16; i++) {
      set(i, i, G(0xe8e8f0)); set(15 - i, i, G(0xe8e8f0)); set(8, i, G(0xdcdce6)); set(i, 8, G(0xdcdce6));
      if (i > 2 && i < 13 && (i % 4 === 0)) for (let k = 16 - i; k < i; k++) { set(k, i, G(0xcfd0da)); set(i, k, G(0xcfd0da)); }
    } break;
    case 'talisman': for (let y = 1; y < 15; y++) for (let x = 4; x < 12; x++) {
      set(x, y, y < 3 ? G(0xc4302a) : jitter(G(0xefe2b0), r, 0.05));
      if (y > 4 && y < 13 && x > 5 && x < 10 && (x + y * 3) % 4 === 0) set(x, y, G(0xa01818));
    } break;
    case 'chain': for (let y = 0; y < 16; y++) { const link = (y >> 2) & 1; if (link) { set(7, y, G(0x7a7f86)); set(8, y, G(0x5a5f66)); } else { set(6, y, G(0x7a7f86)); set(9, y, G(0x5a5f66)); if (y % 4 === 0) { set(7, y, G(0x8a8f96)); set(8, y, G(0x8a8f96)); } } } break;
    case 'banner': for (let y = 0; y < 16; y++) for (let x = 2; x < 14; x++) {
      const tail = y > 12 && Math.abs(x - 7.5) < (y - 12) * 1.5; if (tail) continue;
      let c = y < 2 ? G(0x2a2a2a) : G(0x1d2a5a);
      if (Math.hypot(x - 7.5, y - 7) < 3 && Math.hypot(x - 7.5, y - 7) > 1.6) c = G(0xe0c050);
      set(x, y, jitter(c, r, 0.08));
    } break;
    case 'bone': for (let x = 3; x < 13; x++) { set(x, 9, G(0xe8e2cc)); set(x, 10, G(0xd6cfb8)); }
      for (const [x, y] of [[2, 8], [3, 8], [2, 11], [3, 11], [12, 8], [13, 8], [12, 11], [13, 11]]) set(x, y, G(0xe8e2cc));
      break;
    case 'candle': for (let y = 8; y < 16; y++) for (let x = 6; x < 10; x++) set(x, y, jitter(G(0xefe6cc), r, 0.05));
      set(8, 7, G(0x222222)); set(8, 5, G(0xffd070)); set(8, 6, G(0xffa030)); set(7, 6, G(0xffe090)); break;
    case 'paper': for (let y = 10; y < 15; y++) for (let x = 3; x < 13; x++) set(x, y, jitter(G(0xe8e0c8), r, 0.1)); break;
    // ---------------- Half-Blood Quests
    case 'strawberry': {
      for (let b = 0; b < 5; b++) { const x = 3 + b * 2.5; for (let y = 9; y < 16; y++) set(x + (y - 12) * (b - 2) * 0.15, y, jitter(G(0x3f8a34), r, 0.2)); }
      for (const [x, y] of [[4, 9], [5, 9], [10, 8], [11, 8], [7, 11], [12, 10]]) set(x, y, G(0x5aaa44));
      for (const [x, y] of [[5, 12], [9, 13], [12, 12]]) { set(x, y, G(0xe02a2a)); set(x + 1, y, G(0xc41c24)); set(x, y + 1, G(0xa8141c)); set(x, y - 1, G(0x3f8a34)); }
      set(7, 8, G(0xffffff)); set(8, 8, G(0xffe066));
      break;
    }
    case 'barbed_wire': for (let x = 0; x < 16; x++) {
      for (const yy of [5, 10]) { set(x, yy + Math.round(Math.sin(x * 0.8) * 0.6), G(0x8a8e94)); }
      if (x % 5 === 2) for (const yy of [5, 10]) { set(x - 1, yy - 1, G(0xb8bcc2)); set(x + 1, yy + 1, G(0xb8bcc2)); set(x + 1, yy - 1, G(0x6a6e74)); set(x - 1, yy + 1, G(0x6a6e74)); }
    } break;
    case 'vine': { let x = 8; for (let y = 0; y < 16; y++) { set(x, y, G(0x3f7a2a)); if (y % 3 === 0) { set(x - 1, y, G(0x5a9a3a)); set(x + 1, y + 1, G(0x5a9a3a)); set(x + 2, y + 1, G(0x4a8a32)); } if (r() < 0.3) x += r() < 0.5 ? -1 : 1; }
      for (const [gx, gy] of [[5, 10], [10, 5]]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [-1, 1]]) set(gx + dx, gy + dy, G(0x6a2a7a));
    } break;
    case 'reeds': for (let b = 0; b < 6; b++) { const x = 2 + b * 2.3; const h = 9 + r() * 6; for (let y = 15; y > 15 - h; y--) set(x, y, jitter(G(0x7a9a4a), r, 0.15)); if (b % 2) { set(x, 15 - h, G(0x6a4a2a)); set(x, 16 - h, G(0x6a4a2a)); set(x, 17 - h, G(0x5a3a1a)); } } break;
    case 'shell': for (let y = 7; y < 15; y++) for (let x = 4; x < 12; x++) { const dx = x - 7.5, dy = y - 14; if (dx * dx + dy * dy < 40 && y < 14) set(x, y, (x & 1) ? G(0xf6dcc8) : G(0xe8b8a0)); } set(7, 14, G(0xd49a84)); set(8, 14, G(0xd49a84)); break;
    case 'mushroom': for (let y = 10; y < 16; y++) { set(7, y, G(0xefe6cc)); set(8, y, G(0xe0d6bc)); }
      for (let x = 4; x < 12; x++) for (let y = 7; y < 10; y++) if (!(y === 7 && (x < 5 || x > 10))) set(x, y, (x * 3 + y) % 5 === 0 ? G(0xffffff) : G(0xc8322a));
      break;
    case 'leaf_litter': for (let i = 0; i < 9; i++) { const x = 2 + r() * 12, y = 2 + r() * 12; const c = [G(0x8a5a2a), G(0xa8742e), G(0x6a5a2a)][i % 3]; set(x, y, c); set(x + 1, y, c); set(x, y + 1, shade(c, 0.8)); } break;
    case 'flower_yellow': for (let y = 8; y < 16; y++) set(8, y, G(0x3f8a2e)); set(7, 12, G(0x3f8a2e));
      for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) set(8 + dx, 6 + dy, G(0xffd84a)); set(8, 6, G(0xc9761a)); break;
    case 'puddle': for (let y = 6; y < 12; y++) for (let x = 2; x < 14; x++) { const dx = (x - 7.5) / 6, dy = (y - 8.5) / 3; if (dx * dx + dy * dy < 1) set(x, y, (x + y) % 5 === 0 ? G(0xa8c0d8) : G(0x4a6078)); } break;
    case 'em_zeus': for (let y = 1; y < 15; y++) { const x = y < 8 ? 10 - y * 0.6 : 12 - (y - 7) * 0.9; set(x, y, G(0xffd84a)); set(x + 1, y, G(0xfff0a0)); } for (let x = 5; x < 12; x++) set(x, 7, G(0xffd84a)); break;
    case 'em_hera': { // peacock feather
      for (let y = 2; y < 16; y++) set(8, y, G(0x2e6a4a));
      for (let y = 2; y < 9; y++) for (let x = 4; x < 13; x++) { const d = Math.hypot((x - 8) / 4, (y - 5) / 3.4); if (d < 1) set(x, y, d < 0.3 ? G(0x1a2a6a) : d < 0.55 ? G(0x2a8aa8) : d < 0.8 ? G(0xc9963a) : G(0x2e8b6e)); }
    } break;
    case 'em_poseidon': for (let y = 3; y < 16; y++) set(8, y, G(0xc9963a));
      for (const x of [4, 8, 12]) { for (let y = 2; y < 6; y++) set(x, y, G(0xe2b24c)); set(x, 1, G(0xfff0a0)); }
      for (let x = 4; x <= 12; x++) set(x, 6, G(0xc9963a)); break;
    case 'em_demeter': for (let y = 6; y < 16; y++) { set(7, y, G(0xc9a23c)); set(9, y - 1, G(0xc9a23c)); }
      for (let y = 1; y < 8; y++) { set(6 + (y & 1), y, G(0xe8c050)); set(9 + (y & 1), y - 1, G(0xe8c050)); set(8, y + 1, G(0xd8b040)); } break;
    case 'em_ares': // boar-head spear
      for (let y = 4; y < 16; y++) set(8, y, G(0x5a3a1a));
      for (let y = 0; y < 5; y++) for (let x = 8 - (y >> 1); x <= 8 + (y >> 1); x++) set(x, y + 1, G(0xb8bcc2));
      set(8, 6, G(0xa8261e)); set(7, 7, G(0xa8261e)); set(9, 7, G(0xa8261e)); break;
    case 'em_athena': { // owl
      for (let y = 3; y < 15; y++) for (let x = 4; x < 12; x++) { const d = Math.hypot((x - 7.5) / 4, (y - 9) / 6); if (d < 1) set(x, y, G(0x8c96a3)); }
      for (const ex of [6, 9]) { set(ex, 7, G(0xffd84a)); set(ex + 1, 7, G(0xffd84a)); set(ex, 8, G(0xffd84a)); set(ex + 1, 8, G(0x17130f)); }
      set(4, 3, G(0x8c96a3)); set(11, 3, G(0x8c96a3)); set(7, 9, G(0xc9963a)); set(8, 9, G(0xc9963a));
      for (let x = 5; x < 11; x += 2) set(x, 12, G(0x5c6670));
    } break;
    case 'em_apollo': for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); const a = Math.atan2(y - 7.5, x - 7.5); if (d < 3.5) set(x, y, G(0xffd84a)); else if (d < 7.5 && Math.cos(a * 8) > 0.6) set(x, y, G(0xf28c28)); } break;
    case 'em_artemis': for (let y = 1; y < 15; y++) for (let x = 2; x < 14; x++) { const a = Math.hypot(x - 7.5, y - 7.5), b = Math.hypot(x - 10, y - 6.5); if (a < 6.5 && b > 5.2) set(x, y, G(0xe6eef8)); } break;
    case 'em_hephaestus': for (let y = 7; y < 16; y++) { set(7, y, G(0x6a4a2a)); set(8, y, G(0x5a3a1a)); }
      for (let y = 2; y < 7; y++) for (let x = 3; x < 13; x++) set(x, y, y === 2 ? G(0x9aa0a8) : G(0x4a4f56)); break;
    case 'em_aphrodite': for (let y = 2; y < 15; y++) for (let x = 1; x < 15; x++) { const X = (x - 7.5) / 6, Y = (7.5 - y) / 6; const v = (X * X + Y * Y - 0.35) ** 3 - X * X * Y * Y * Y; if (v < 0) set(x, y, Y > 0.3 && X < -0.1 ? G(0xffb4c8) : G(0xe8506a)); } break;
    case 'em_hermes': for (let y = 2; y < 16; y++) set(8, y, G(0xc9963a));
      for (const [x, y] of [[6, 2], [5, 1], [4, 1], [10, 2], [11, 1], [12, 1], [7, 2], [9, 2]]) set(x, y, G(0xe6eef8));
      for (let y = 4; y < 14; y++) { const o = Math.round(Math.sin(y * 0.9) * 2.5); set(8 + o, y, G(0x2e8b6e)); set(8 - o, y, G(0x2e6a4a)); } break;
    case 'em_dionysus': for (const [gx, gy] of [[5, 4], [8, 4], [11, 4], [6.5, 7], [9.5, 7], [8, 10], [5, 7], [11, 7]]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(gx + dx, gy + dy, (dx + dy) ? G(0x6a2a7a) : G(0x9a5aaa));
      for (const [x, y] of [[8, 1], [8, 2], [9, 3], [6, 1], [5, 2], [10, 1]]) set(x, y, G(0x3f7a2a)); break;
    case 'camp_banner': for (let y = 0; y < 16; y++) for (let x = 2; x < 14; x++) {
      const tail = y > 12 && Math.abs(x - 7.5) < (y - 12) * 1.5; if (tail) continue;
      let c = y < 2 ? G(0x17130f) : G(0xf28c28);
      if (y === 3 || y === 11) c = G(0xc9963a);
      if (y > 4 && y < 10 && Math.abs(x - 7.5) < 3 && (x === 5 || x === 10 || y === 5 || y === 9 || (x === 7 && y === 7))) c = G(0x17130f);
      set(x, y, jitter(c, r, 0.06));
    } break;
    default: paintExtraSprite(name, set, r, G); break;
    case 'shard': for (const [x0, y0, w] of [[3, 10, 4], [9, 11, 3], [6, 13, 3]]) for (let y = y0; y < y0 + 2; y++) for (let x = x0; x < x0 + w - (y - y0); x++) set(x, y, y === y0 ? G(0xd9813a) : G(0x17130f)); break;
  }
}
export function buildSpriteAtlas() {
  const W = SCOLS * CELL, Hh = SROWS * CELL;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, Hh);
  SPRITE_NAMES.forEach((name, index) => {
    const px = new Array(TILE * TILE).fill(null);
    paintSprite(name, (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 16 && y < 16) px[y * 16 + x] = c; }, mulberry32(hashStr(name) + 5));
    const col = index % SCOLS, row = Math.floor(index / SCOLS);
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const sx = clamp(x - PAD, 0, 15), sy = clamp(y - PAD, 0, 15);
      const c = px[sy * 16 + sx]; const o = ((row * CELL + y) * W + col * CELL + x) * 4;
      if (c) { img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
    }
  });
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace; map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestMipmapLinearFilter;
  return map;
}
