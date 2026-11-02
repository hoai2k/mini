// The seven worlds of Micro Zoom, in chain order (largest field first). Data
// on the cards is from micro/design/zoom-chain-levels.md and each
// prototype's README: magnification (or field width), body size, look.
// `fieldMm` is the field width the transition zooms through (log scale).
// Player-facing text is in plain game terms (the owner, 2026-11-02): `goal` is
// one line naming the portal and the main threats, `controls` short labels,
// `back` whether the world has a way back up (Y at its ring).

export const WORLDS = [
  {
    id: 'springtail', n: 1, name: 'Bog Surface', creature: 'Water springtail', latin: 'Podura aquatica',
    mag: '1–5×', magNote: 'macro lens', field: '36–7 mm', fieldMm: 18, body: '1.5 mm', look: 'Macro photography',
    card: 'MP-U05', intro: 'MP-G07', tint: ['#6f8f6a', '#1d2a1c'], accent: '#9fbf6a',
    line: 'Skate on the skin of a bog pool and fling yourself into the air with your tail.',
    goal: 'Reach the glowing portal, and avoid getting eaten by Stenus the rove beetle, the water strider and the wolf spider.',
    back: false,
    controls: [['LS', 'Move'], ['RS', 'Camera'], ['A', 'Jump (hold for distance)'], ['X', 'Attack / eat'], ['B', 'Block (hold)'], ['Y', 'Top view / enter portal'], ['RT', 'Focus ahead'], ['LT', 'Focus near'], ['D-pad ↑↓', 'Zoom']],
    facts: [
      'A springtail spends its whole life on the water’s surface: to it, water is a floor.',
      'Its forked tail, folded under the body, snaps down and throws it many body lengths.',
      'Sundews catch more springtails than any other prey.',
      'Pond wolf spiders hunt across the water from floating leaves, feeling for ripples.',
    ],
  },
  {
    id: 'mite', n: 2, name: 'Moss Canopy', creature: 'Box mite', latin: 'Oribatida: Phthiracaridae',
    mag: '≈ 80×', magNote: 'SEM, HFW 1.6 mm', field: '4.2–0.16 mm', fieldMm: 4.2, body: '0.35 mm', look: 'Scanning electron microscope',
    card: 'MP-U01', intro: 'MP-G08', tint: ['#8a8e92', '#1c1e20'], accent: '#c9cdd1',
    line: 'An armoured mite on eight legs, climbing through moss and fungus.',
    goal: 'Reach the glowing portal, and avoid getting eaten by the predatory mite and the pseudoscorpion.',
    back: true,
    controls: [['LS', 'Move'], ['RS', 'Camera'], ['A', 'Jump (hold to charge)'], ['X', 'Attack / eat'], ['B', 'Dash (hold)'], ['Y', 'Block (hold) / enter portal'], ['LB/RB', 'Walk slow / fast'], ['D-pad ↑↓', 'Zoom']],
    facts: [
      'Box mites fold their legs inside and close the shell like a lid.',
      'An electron microscope sees no colour: every grey is the tilt of a surface.',
      'A gram of moss can hold hundreds of mites.',
    ],
  },
  {
    id: 'tardigrade', n: 3, name: 'Water Film', creature: 'Tardigrade', latin: 'Eutardigrada',
    mag: '10–12.5×', magNote: 'objective, DIC', field: '1.8–1.4 mm', fieldMm: 1.8, body: '0.35 mm', look: 'Differential interference contrast',
    card: 'MP-U02', intro: 'MP-G09', tint: ['#a9b4a0', '#3d4a3a'], accent: '#c8d4b8',
    line: 'A water bear on stubby clawed legs, climbing moss leaves in a film of water.',
    goal: 'Reach the glowing portal, and avoid getting eaten by Milnesium and the nematode.',
    back: true,
    controls: [['LS', 'Move'], ['RS', 'Camera'], ['A', 'Dash'], ['X', 'Attack / eat'], ['B', 'Block (hold)'], ['Y', 'Curl up / enter portal'], ['LT/RT', 'Focus'], ['D-pad ↑↓', 'Zoom']],
    facts: [
      'Dried into a tun, a tardigrade can wait out years without water.',
      'The mite and the tardigrade are the same size: this step changes the light, not the scale.',
      'This microscope turns differences in thickness into relief, like light raking across a carving.',
    ],
  },
  {
    id: 'amoeba', n: 4, name: 'Pool Floor', creature: 'Amoeba', latin: 'Amoeba proteus',
    mag: '10–20×', magNote: 'objective, brightfield', field: '1.8–0.9 mm', fieldMm: 1.4, body: '0.45 mm', look: 'Brightfield',
    card: 'MP-U03', intro: 'MP-G10', tint: ['#efe6cf', '#a99f84'], accent: '#e8d9a8',
    line: 'A shapeshifting blob: reach out arms, flow after them and swallow your prey whole.',
    goal: 'Reach the glowing portal, and avoid getting eaten by the fungus and Chaos the giant amoeba.',
    back: true,
    controls: [['LS/RS', 'Move a pseudopod'], ['RT', 'Hold: move the cell'], ['LT', 'Hold: spread / round up'], ['LB/RB', 'Push harder / spread a pseudopod'], ['A', 'Surge'], ['X', 'Engulf / cut'], ['B', 'Let go / stiffen'], ['Y', 'Enter portal'], ['D-pad ↑↓', 'Zoom']],
    facts: [
      'An amoeba keeps its volume: every arm it grows takes body from somewhere else.',
      'It cups prey without touching it, then closes the cup into a bubble and digests it.',
      'Some fungi farm amoebae: their sticky threads catch a passing cell and grow into it.',
    ],
  },
  {
    id: 'paramecium', n: 5, name: 'Hollow Pool', creature: 'Paramecium', latin: 'Paramecium bursaria',
    mag: '20×', magNote: 'objective, darkfield', field: '0.9 mm', fieldMm: 0.9, body: '0.12 mm', look: 'Darkfield and brightfield',
    card: 'MP-U04', intro: 'MP-G11', tint: ['#2a4a6a', '#05070b'], accent: '#8fc0e8',
    line: 'A fast swimmer covered in beating hairs, carrying green algae that feed it in the light.',
    goal: 'Reach the glowing portal, and avoid getting eaten by Dileptus, Didinium and the bladderwort.',
    back: true,
    controls: [['LS', 'Swim'], ['RS', 'Camera'], ['A', 'Dash'], ['X', 'Attack / eat'], ['B', 'Block / drive off'], ['Y', 'Camera view / enter portal'], ['LB/RB', 'Dive / rise'], ['D-pad ↑↓', 'Zoom']],
    facts: [
      'Its cilia beat in waves that run across the cell like wind over wheat.',
      'It carries hundreds of green algae that feed it in the light.',
      'At this size water is thick as syrup: stop swimming and you stop dead.',
    ],
  },
  {
    id: 'bacterium', n: 6, name: 'Sediment', creature: 'Magnetotactic bacterium', latin: 'Magnetospirillum',
    mag: '1000×', magNote: '100× oil, phase', field: '180 µm', fieldMm: 0.18, body: '3 µm', look: 'Phase contrast and fluorescence',
    card: 'MP-U06', intro: 'MP-G12', tint: ['#2a2f3a', '#08090c'], accent: '#a8b4c8',
    line: 'Call your kin into a swarm and lead an army, at the limit of the light microscope.',
    goal: 'Gather an army, then reach the glowing portal past Stentor.',
    back: true,
    controls: [['LS', 'Lead your army'], ['RS', 'Move the view'], ['A', 'Sprint'], ['X', 'Call allies / eat'], ['B', 'Dodge'], ['Y', 'Toxin burst / enter portal'], ['LB/RB', 'Turn around'], ['D-pad ↑↓', 'Zoom']],
    facts: [
      'A bacterium cannot steer: it chooses only when to tumble into a new direction.',
      'A chain of magnetic crystals inside it lines it up with the Earth’s field.',
      'Bacteria switch on their toxins only when enough of them are close together.',
      'Some bacteria kill their neighbours, even amoebae, by touch, with a molecular spear.',
    ],
  },
  {
    id: 'phage', n: 7, name: 'Host Surface', creature: 'Bacteriophage', latin: 'T4-like phage',
    mag: 'Beyond light', magNote: 'realistic false light', field: '≈ 1 µm', fieldMm: 0.0012, body: '0.2 µm', look: 'False light',
    card: 'MP-U09', intro: 'MP-G14', tint: ['#1f6f80', '#f0b44a'], accent: '#f0c070',
    line: 'A virus with no engine, knocked about by molecules: drift legs-first and latch onto a host.',
    goal: 'Get into the glowing host, and avoid the amoeba.',
    back: true,
    controls: [['LS', 'Drift'], ['LT/RT', 'Drift nearer / farther'], ['RS', 'Turn the view'], ['A', 'Dash'], ['X', 'Grab / attack'], ['B', 'Block / slip through'], ['Y', 'Enter portal / info'], ['D-pad ↑↓', 'Zoom']],
    facts: [
      'No light microscope can see a phage: it is smaller than the wavelength of light.',
      'A phage has no motor: molecules knock it about until it touches a host.',
      'Its tail contracts like a syringe and injects its genes through the cell wall.',
      'Two damaged phages that infect one cell together can rebuild a working genome.',
    ],
  },
];

export const byId = Object.fromEntries(WORLDS.map((w) => [w.id, w]));
export const indexOf = (id) => WORLDS.findIndex((w) => w.id === id);
