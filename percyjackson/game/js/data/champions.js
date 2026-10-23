// Champion looks as data: which kind each named champion fights as, its
// outline and aura colours and its size, and the recolouring any other
// champion of a kind wears. No Three.js; the models are entities/champions.js.
// look: { kind (what it fights as), shell (outline colour), aura: { kind: 'embers'|'smoke'|'spark'|'wisp'|'dust', col: [r, g, b] HDR, at: 'head'|'body' }, scale (on top of the model's own), size (hit height and radius factor) }
export const CHAMPION_LOOKS = {
  fields_bronzebeak: { kind: 'stymphalian', shell: 0xff6a1a, aura: { kind: 'embers', col: [2.6, 1.2, 0.3] }, scale: 2.1 },
  woods_shadowfang: { kind: 'hellhound', glow: 0, shell: 0xff2a0a, aura: { kind: 'smoke', col: [2.6, 0.6, 0.1], at: 'head' }, scale: 1.3 },
  shore_queen_gale: { kind: 'harpy', shell: 0xffe040, aura: { kind: 'spark', col: [2.6, 2.4, 0.8] }, scale: 1.6 },   // (size audit, round 6: the harpy grew 1.37×, so 1.85 → 1.6 keeps the queen about 1.6× Percy, "bigger" in design/sizes.json)
  canyon_red_king: { kind: 'scorpion', shell: 0xffb020, aura: { kind: 'dust', col: [2.4, 1.6, 0.3] }, scale: 1.45 },   // (round 9: the scorpion itself grew 2.24×, so 2.4 → 1.45 keeps the king a step above it, the size of a pickup truck)
  lab_bronze_warden: { kind: 'automaton', shell: 0x3ae8ff, aura: { kind: 'spark', col: [0.5, 2.2, 2.6] }, scale: 1.6, size: 2.4 },   // (size audit: a giant automaton, about 1.85× a hero; its hall is a 15-block open ring)
  // (Gorgos is a two-eyed giant now, but fights as the cyclops kind: its club
  // swing and ground slam suit a club-wielding giant, where the giant kind,
  // the Laistrygonian, keeps its distance and lobs fire bombs)
  oth_gorgos: { kind: 'cyclops', shell: 0xff6a20, aura: { kind: 'embers', col: [2.6, 1, 0.2], at: 'head' }, scale: 1.12 },
  asphodel_pale_king: { kind: 'skeleton', glow: 0.008, shell: 0x3aff7a, aura: { kind: 'wisp', col: [0.5, 2.6, 1.0] }, scale: 1.2 },   // (the skeleton's 1.25x Percy (round 10), so 1.45 → 1.26 → 1.2 keeps the king a modest step above it, about 1.5x, not a giant)
};

// ---- any other champion: a crown, a colour scheme by kind and a glow -----------
// remap(hsl, hot): turn a colour (sRGB h, s, l in 0..1) in place.
const hueIn = (h, a, b) => (a < b ? h >= a && h <= b : h >= a || h <= b);
export const KIND_LOOKS = {
  // blue-flame hounds: the lava burns cyan
  hellhound: { shell: 0x3a9aff, aura: { kind: 'smoke', col: [0.4, 1.4, 2.6], at: 'head' }, scale: 1.25, remap: (c) => { if (hueIn(c.h, 0.97, 0.14) && c.s > 0.55 && c.l > 0.3) c.h = 0.55; } },
  pup: { shell: 0x3a9aff, aura: { kind: 'smoke', col: [0.4, 1.4, 2.6] }, scale: 1.4, remap: (c) => { if (hueIn(c.h, 0.97, 0.14) && c.s > 0.55 && c.l > 0.3) c.h = 0.55; } },
  // bone-white skeletons in crimson armour
  skeleton: { shell: 0xff3a3a, aura: { kind: 'wisp', col: [2.6, 0.5, 0.4] }, scale: 1.2,   // (the kind is 1.25x Percy (round 10); 1.4 → 1.26 → 1.2 keeps the champion a modest step above, about 1.5x, not a giant)
    remap: (c) => { if (hueIn(c.h, 0.1, 0.32) && c.l < 0.58 && c.s > 0.12) { c.h = 0.99; c.s = Math.min(1, c.s + 0.35); c.l *= 0.85; } } },
  spartoi: { shell: 0xff3a3a, aura: { kind: 'wisp', col: [2.6, 0.5, 0.4] }, scale: 1.2,   // (as the skeleton, 1.4 → 1.26 → 1.2: about 1.5x)
    remap: (c) => { if (hueIn(c.h, 0.42, 0.55)) { c.h = 0.99; } } },
  // obsidian spiders with violet fire
  spider: { shell: 0xb05aff, aura: { kind: 'spark', col: [1.8, 0.6, 2.6] }, scale: 1.7, remap: (c, hot) => { if (hot) c.h = 0.8; else if (hueIn(c.h, 0.02, 0.16)) { c.h = 0.72; c.s *= 0.4; c.l *= 0.55; } } },
  // royal purple dracaenae
  dracaena: { shell: 0xd060ff, aura: { kind: 'spark', col: [2, 0.6, 2.6] }, scale: 1.3, remap: (c) => { if (hueIn(c.h, 0.25, 0.5)) c.h = 0.78; } },
  // blue-fire empousai
  empousa: { shell: 0x40c0ff, aura: { kind: 'embers', col: [0.4, 1.6, 2.6], at: 'head' }, scale: 1.3, remap: (c, hot) => { if (hueIn(c.h, 0.97, 0.12) && (hot || c.s > 0.75)) c.h = 0.56; } },
  harpy: { shell: 0xffd84a, aura: { kind: 'spark', col: [2.6, 2, 0.6] }, scale: 1.4 },   // (size audit, round 6: the harpy grew 1.37×, so 1.6 → 1.4)
  stymphalian: { shell: 0xff8a2a, aura: { kind: 'embers', col: [2.6, 1.2, 0.3] }, scale: 1.4 },   // (size audit, round 4: the bird itself grew ×1.36, so the champion stays near its old size, a wingspan about 3× Percy)
  scorpion: { shell: 0xffb020, aura: { kind: 'dust', col: [2.4, 1.6, 0.3] }, scale: 1.32 },   // (round 9: the scorpion grew 2.24×, so 2 → 1.32)
  cyclops: { shell: 0xff6a20, aura: { kind: 'embers', col: [2.6, 1, 0.2] }, scale: 1.08 },
};
const DEFAULT_LOOK = { shell: 0xffd84a, aura: { kind: 'spark', col: [2.6, 2, 0.6] }, scale: 1.3 };

export function championLook(id, kind) {
  if (CHAMPION_LOOKS[id]) return CHAMPION_LOOKS[id];
  return KIND_LOOKS[kind] ?? DEFAULT_LOOK;
}

// Every look, for the workbench: the seven by id, the rest as 'kind:<kind>'.
export const CHAMPION_SHOWCASE = [...Object.keys(CHAMPION_LOOKS), ...Object.keys(KIND_LOOKS).map((k) => `kind:${k}`)];
