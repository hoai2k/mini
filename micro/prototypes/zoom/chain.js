// The zoom chain: seven worlds (scale bands of one specimen) and the six
// transitions between them, in the order of the Micro Zoom game (micro/game/):
// springtail → mite → tardigrade → amoeba → paramecium → bacterium → phage.
// Sources: micro/design/zoom-chain-levels.md. Every position is in µm in the
// world's own frame; frame k's origin is where world k begins: the zoom target
// of transition k (the point in world k-1 that becomes world k), or for a
// same-scale hand-off, the new protagonist's place. Frame 0 (the bog surface)
// and frame 1 (the capitulum) share an origin: the mite the springtail spots.

// Shared geometry the specimen shader also uses (frame 1 unless noted).
export const CHAIN_CONST = {
  cap0: [1700, 600],      // the capitulum at the lawn edge (centre)
  capR: 3600,             // its radius: a Sphagnum capitulum ~7 mm across
  capGrid: 6400,          // the lawn's capitula spacing
  T1: [-900, -700],       // the wet leaf axil with the tun
  T2W1: [-1600, -580],    // where the film runs down a leaf into the pool (frame 1)
  patch: [300, 180],      // the biofilm patch (frame 4, the Paramecium's)
  host: [0, -0.62],       // the host cell's centre (frame 6)
  hostR: 0.5, hostL: 1.0, // radius and half-length of its axis (µm)
};

/** World ids, in chain order (the game's ids). */
export const IDS = ['springtail', 'mite', 'tardigrade', 'amoeba', 'paramecium', 'bacterium', 'phage'];

/** Origin of frame k in frame k-1. */
export const ORIG = [null, [0, 0], CHAIN_CONST.T1, [-900, 150], [380, 220], CHAIN_CONST.patch, [22, 9]];

/** Global (frame 1) position of each frame's origin. */
export const G = (() => {
  const g = [[0, 0], [0, 0]];
  for (let k = 2; k < ORIG.length; k++) g[k] = [g[k - 1][0] + ORIG[k][0], g[k - 1][1] + ORIG[k][1]];
  return g;
})();

export const toGlobal = (k, v) => [G[k][0] + v[0], G[k][1] + v[1]];

/**
 * Worlds. field: the field width at rest (µm, the screen's width); look: the
 * world's own optics; instrument: what the field and magnification stand
 * for; creature: the protagonist, with an honest speed (µm/s, except the
 * amoeba's, time-compressed ×10 as in its prototype) and its path to the
 * destination (the last point) in its own frame.
 */
export const WORLDS = [
  { id: 'springtail', name: 'The bog pool surface', short: 'Bog surface', field: 18000, look: 'macro', instrument: 'Macro lens 2:1 on full frame',
    amb: 'springtail/amb-bog', creature: 'Water springtail (Podura aquatica), 1.5 mm', radius: 1400, speed: 4000, stride: 420,
    start: [-15000, -3000], path: [[-6000, 150], [-1550, 300]], destR: 400, stepSound: null },
  { id: 'mite', name: 'A Sphagnum capitulum', short: 'Moss capitulum', field: 1800, look: 'sem', instrument: 'SEM (or stereo microscope), HFW 1.8 mm',
    amb: 'mite/amb-moss', creature: 'Box mite (Oribatida), 0.35 mm', radius: 420, speed: 200, stride: 135,
    start: [0, 0], path: [[-300, -220], [-560, -420]], destR: 45, stepSound: 'mite/step' },
  { id: 'tardigrade', name: 'The water film on a leaf', short: 'Water film', field: 1800, look: 'dic', instrument: '10× objective, DIC (field number 18)',
    amb: 'tardigrade/amb-film', creature: 'Tardigrade, 350 µm', radius: 260, speed: 100, stride: 90,
    start: [0, 0], path: [[-200, 40], [-430, 60]], destR: 30, stepSound: 'tardigrade/step' },
  { id: 'amoeba', name: 'The pool floor', short: 'Pool floor', field: 1800, look: 'wetmount', instrument: '10× objective, brightfield (wet mount)',
    amb: 'amoeba/amb-pool', creature: 'Amoeba proteus, 0.45 mm (time ×10)', radius: 330, speed: 25, stride: 0,
    start: [0, 0], path: [[30, 20], [60, 40]], destR: 8, stepSound: null },
  { id: 'paramecium', name: 'The hollow pool', short: 'Pool', field: 900, look: 'bright', instrument: '20× objective, brightfield',
    amb: 'paramecium/amb-pool', creature: 'Paramecium bursaria, 120 µm', radius: 90, speed: 420, stride: 0,
    start: [0, 0], path: [[-140, 100], [60, 280], [185, 225]], destR: 18, stepSound: null },
  { id: 'bacterium', name: 'The biofilm on the leaf', short: 'Biofilm', field: 90, look: 'phase', instrument: '100× oil, 1000×, 90 µm camera crop',
    amb: 'bacterium/amb-sediment', creature: 'Magnetotactic spirillum, 3 µm', radius: 4, speed: 40, stride: 0,
    start: [0, 0], path: [[-14, 10], [6, 16], [19.5, 6.6]], destR: 1.2, stepSound: null },
  { id: 'phage', name: 'A host cell’s envelope', short: 'Envelope', field: 0.6, look: 'mol', instrument: 'Cryo-EM, then a molecular illustration',
    amb: 'bacterium/amb-sediment', creature: 'Bacteriophage (T4-like), 0.2 µm', radius: 0.3, speed: 0.12, stride: 0,
    start: [0.14, 0.2], path: [], destR: 0, stepSound: null },
];

/**
 * Transitions k = 1..6, world k-1 → world k. `looks`: the optics path (the
 * mite's and bacteria's looks can be swapped in Features). `handoff`: same
 * scale, so no highlight and no zoom; `wander`: where the old protagonist
 * walks off to during a hand-off (µm, global). `strategy`: the default
 * (the recommendation from the contact sheets). `visible`: what is
 * highlighted and why it plausibly contains the next world.
 */
export const TRANSITIONS = [
  null,
  { title: 'Springtail → mite', looks: ['macro', 'mite'], spec: '§0.6', strategy: 'after',
    visible: 'A speck moving on the capitulum at the lawn edge: a box mite. The frame is the next screen.',
    why: 'The springtail lands at the Sphagnum lawn edge; on the capitulum beside it a speck moves. The field shrinks from 18 mm to 1.8 mm and the speck becomes the mite.',
    change: 'Hand lens → SEM (or stereo microscope)', arrive: 'Play continues as the mite.', back: 'Back out to the bog surface.' },
  { title: 'Mite → tardigrade (hand-off)', looks: ['mite', 'dic'], spec: '§1.6', strategy: 'during', handoff: true, wander: [256, 192],
    visible: 'The wet axil: a dry tun lies in the water film beside the mite. Same size, same field: no zoom, the light changes and the tun wakes.',
    why: 'The mite (0.35 mm) and the tardigrade (0.35 mm) share a scale, so the camera holds: the light switches from reflected to transmitted, water darkens into the tun, its legs evert, it lengthens and takes its first steps, and the camera moves its attention from the mite to it.',
    change: 'Reflected → transmitted light at a constant 1.8 mm field', arrive: 'Play continues as the tardigrade (the revival took hours in life; shown in seconds).',
    back: 'The light turns back to reflected; the tardigrade dries to a tun and the mite returns.' },
  { title: 'Tardigrade → amoeba (hand-off)', looks: ['dic', 'wetmount'], spec: 'game order', strategy: 'during', handoff: true, wander: [190, -70],
    visible: 'Where the film meets the pool: the tardigrade cannot swim, so it stays on the leaf; on the pool floor below, an amoeba crawls. Same size, same field.',
    why: 'The tardigrade (0.35 mm) and Amoeba proteus (0.45 mm) share a scale: the DIC prisms come out and the brightfield wet mount remains; the camera passes from the film to the pool floor, where the amoeba crawls.',
    change: 'DIC → brightfield at a constant 1.8 mm field', arrive: 'Play continues as the amoeba (its crawl shown 10× faster, as in its prototype).',
    back: 'The camera passes back to the tardigrade on the leaf; DIC returns.' },
  { title: 'Amoeba → Paramecium', looks: ['wetmount', 'bright'], spec: '§2.6', strategy: 'during',
    visible: 'A green Paramecium bursaria swimming near the amoeba. The frame is the next screen: 0.9 mm round it.',
    why: 'A 120 µm green Paramecium passes the 450 µm amoeba on the pool floor; the objective clicks to 20× and the condenser closes to the round field of the Paramecium microscope. The amoeba stays as a giant at the field’s edge.',
    change: '10× → 20× objective, brightfield', arrive: 'Play continues as Paramecium bursaria.', back: 'Back out to the pool floor and the amoeba.' },
  { title: 'Paramecium → bacteria', looks: ['bright', 'bact'], spec: '§3.6 alt., §4.6', strategy: 'during',
    visible: 'A patch of biofilm on the leaf: rods and dots that read only as texture at 200×. The frame is the next screen.',
    why: 'No trap: the camera descends onto the periphyton coating the Sphagnum leaf. The bacterial film under it is texture at this magnification; at 100× oil the texture resolves into cells, and one swims differently.',
    change: 'Brightfield → phase contrast, 100× oil', arrive: 'Play continues as the magnetotactic spirillum.', back: 'Back out to the pool, 20×.' },
  { title: 'Bacterium → phage', looks: ['bact', 'cryo', 'mol'], spec: '§5.8', strategy: 'during',
    visible: 'A host cell that stops swimming and swells: phages are stuck to it, too small to see. The frame (6 px) is the next screen.',
    why: 'Nothing visible marks the target, and that is the point: past ~0.2 µm light microscopy ends. The view changes style completely, to a grey cryo-EM image that then gains colour as a molecular illustration.',
    change: 'End of light microscopy → cryo-EM → illustration', arrive: 'You are one of the phages (a stub: drift with LS).', back: 'Back to light: the biofilm at 1000×.' },
];

// The capitulum's dome (the specimen shader's capDome), for creature heights.
export function groundAt(g) {
  const dx = g[0] - CHAIN_CONST.cap0[0], dy = g[1] - CHAIN_CONST.cap0[1];
  const x = Math.hypot(dx, dy) / CHAIN_CONST.capR;
  return x < 1.15 ? 500 + 2400 * Math.max(1 - x * x, 0) + 140 : 0;
}
