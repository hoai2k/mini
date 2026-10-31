// The seven worlds of Micro Zoom, in chain order (largest field first). Data
// on the cards is from micro/design/zoom-chain-levels.md and each
// prototype's README: magnification (or field width), body size, look.
// `fieldMm` is the field width the transition zooms through (log scale).

export const WORLDS = [
  {
    id: 'springtail', n: 1, name: 'Bog Surface', creature: 'Water springtail', latin: 'Podura aquatica',
    mag: '1–5×', magNote: 'macro lens', field: '36–7 mm', fieldMm: 18, body: '1.5 mm', look: 'Macro photography',
    card: 'MP-U05', intro: 'MP-G07', tint: ['#6f8f6a', '#1d2a1c'], accent: '#9fbf6a',
    line: 'Walk on the surface film of a bog pool and fling yourself into the air with your tail.',
    goal: 'Cross the pool to the moss tongue at the bank, grazing on the way. A pond wolf spider guards it: jump clear of its lunges and nip or pounce on its overreaching legs until it backs off under the moss.',
    forward: 'The moss bank at the pool edge: land on a Sphagnum capitulum, where a speck is moving.',
    back: null,
    controls: [['LS', 'Walk on the water'], ['RS', 'Camera'], ['A', 'Jump with the furcula (released at an enemy: a pounce-bite)'], ['X', 'Graze; nip a predator; in the air, pounce-bite'], ['B', 'Defend: hunker (facing a predator, blocks its strike)'], ['LT/RT', 'Focus'], ['D-pad ↑↓', 'Magnification']],
    facts: [
      'A springtail spends its whole life on the surface film: to it, water is a floor.',
      'Its furcula, a forked tail folded under the body, snaps down and throws it many body lengths.',
      'Sundews on the moss catch more springtails than any other prey.',
    ],
  },
  {
    id: 'mite', n: 2, name: 'Moss Canopy', creature: 'Box mite', latin: 'Oribatida: Phthiracaridae',
    mag: '≈ 80×', magNote: 'SEM, HFW 1.6 mm', field: '4.2–0.16 mm', fieldMm: 4.2, body: '0.35 mm', look: 'Scanning electron microscope',
    card: 'MP-U01', intro: 'MP-G08', tint: ['#8a8e92', '#1c1e20'], accent: '#c9cdd1',
    line: 'An armoured mite on eight jointed legs, through moss and fungal threads.',
    goal: 'Graze, and fight off the predatory mite that hunts the same moss. A pseudoscorpion lies in wait before the wet leaf axil: stay out of its pincers, close up to survive a grab, and bite its pincer joints until it backs into the moss.',
    forward: 'A wet leaf axil where water has gathered, with a dry tun lying in it.',
    back: 'A giant springtail resting on the moss: dwell beside it and press Y to rise to the bog surface.',
    controls: [['LS', 'Walk'], ['RS', 'Orbit'], ['A', 'Jump (X in the air: a pounce-bite)'], ['X', 'Bite: graze, or bite back'], ['B', 'Defend: close up (ptychoidy)'], ['RT', 'Hold: scramble'], ['Y', 'Observer; at the backdoor, rise a world'], ['D-pad ↑↓', 'Magnification']],
    facts: [
      'Box mites fold their legs inside and close the shell like a lid: ptychoidy.',
      'An electron microscope sees no colour; every grey is the tilt of a surface to the beam.',
      'A gram of moss can hold hundreds of mites.',
    ],
  },
  {
    id: 'tardigrade', n: 3, name: 'Water Film', creature: 'Tardigrade', latin: 'Eutardigrada',
    mag: '10–12.5×', magNote: 'objective, DIC', field: '1.8–1.4 mm', fieldMm: 1.8, body: '0.35 mm', look: 'Differential interference contrast',
    card: 'MP-U02', intro: 'MP-G09', tint: ['#a9b4a0', '#3d4a3a'], accent: '#c8d4b8',
    line: 'Climb moss leaf cells with clawed stubby legs while the water film dries.',
    goal: 'Feed and keep wet as the film dries; face Milnesium and brace (B) or jab (X) to drive it off, and get past Prionchulus, the predatory nematode guarding the Sphagnum leaf.',
    forward: 'The tip of the Sphagnum leaf below, dipping into the pool where the film meets open water.',
    back: 'The leaf axil to the left, where leaves meet the stem: dwell there and press Y to rise to the moss.',
    controls: [['LS', 'Crawl'], ['RS', 'Turn and tilt'], ['A', 'Scramble'], ['X', 'Pierce: feed, or jab back'], ['B', 'Brace: block facing a predator'], ['Y', 'Curl into a tun'], ['LT/RT', 'Fine focus'], ['D-pad ↑↓', 'Magnification']],
    facts: [
      'Dried into a tun, a tardigrade can wait out years without water.',
      'The mite and the tardigrade are the same size: this step changes the light, not the scale.',
      'DIC turns differences in thickness into relief, like light raking across a carving.',
    ],
  },
  {
    id: 'amoeba', n: 4, name: 'Pool Floor', creature: 'Amoeba', latin: 'Amoeba proteus',
    mag: '10–20×', magNote: 'objective, brightfield', field: '1.8–0.9 mm', fieldMm: 1.4, body: '0.45 mm', look: 'Brightfield',
    card: 'MP-U03', intro: 'MP-G10', tint: ['#efe6cf', '#a99f84'], accent: '#e8d9a8',
    line: 'Push out pseudopods, each drawing body from elsewhere, and cup a food vacuole round prey.',
    goal: 'Hunt ciliates; stiffen (B) against the fungal traps and cut their tips (X); pinch off the arms of Chaos, the giant amoeba, before its cup closes, and slip past it.',
    forward: 'A green Paramecium bursaria swimming low over the slide, to the right.',
    back: 'A Sphagnum leaf tip dipping into the pool, to the left: dwell there and press Y to rise to the water film.',
    controls: [['LS', 'Body or pseudopod'], ['RS', 'Pseudopod or body'], ['A', 'Surge'], ['X', 'Close the cup / cut / pinch'], ['B', 'Let go / stiffen'], ['LT/RT', 'Second pseudopod'], ['LB/RB', 'Spread / push'], ['D-pad ↑↓', 'Objective']],
    facts: [
      'An amoeba keeps its volume: every arm it grows takes body from somewhere else.',
      'It cups prey without touching it, then closes the cup into a food vacuole.',
      'At 0.45 mm it is longer than the tardigrade: here the habitat changes, not the size.',
    ],
  },
  {
    id: 'paramecium', n: 5, name: 'Hollow Pool', creature: 'Paramecium', latin: 'Paramecium bursaria',
    mag: '20×', magNote: 'objective, brightfield', field: '0.9 mm', fieldMm: 0.9, body: '0.12 mm', look: 'Brightfield and darkfield',
    card: 'MP-U04', intro: 'MP-G11', tint: ['#2a4a6a', '#05070b'], accent: '#8fc0e8',
    line: 'A fast ciliate carrying green algae: no gliding here, only beating cilia.',
    goal: 'Eat six prey, keep your algae in the light, and fight off Didinium and the giant amoeba: watch for the wind-up, then block or sting back.',
    forward: 'A biofilm patch on a submerged leaf: rods and dots that read only as texture.',
    back: 'The amoeba’s slow pseudopod reaching in from the edge: dwell there and press Y to rise to the pool floor.',
    controls: [['LS', 'Swim'], ['RS', 'Camera'], ['A', 'Ciliary sprint'], ['X', 'Eat · at a hunter: ram and sting'], ['B', 'Defend: trichocysts, back off (blocks a strike)'], ['Y', 'Microscope view'], ['D-pad ↑↓', 'Objective']],
    facts: [
      'Its cilia beat in waves that run across the cell like wind over wheat.',
      'P. bursaria carries hundreds of Chlorella algae that feed it in the light.',
      'At this size water is thick as syrup: stop beating and you stop dead.',
    ],
  },
  {
    id: 'bacterium', n: 6, name: 'Sediment', creature: 'Magnetotactic bacterium', latin: 'Magnetospirillum',
    mag: '1000×', magNote: '100× oil, phase', field: '180 µm', fieldMm: 0.18, body: '3 µm', look: 'Phase contrast and fluorescence',
    card: 'MP-U06', intro: 'MP-G12', tint: ['#2a2f3a', '#08090c'], accent: '#a8b4c8',
    line: 'Run and tumble at the limit of the light microscope, guided by a chain of magnets.',
    goal: 'Find the narrow band where oxygen runs out; tumble at the moment a grazer, phage or Bdellovibrio strikes.',
    forward: 'A host cell that swells as something invisible clings to it.',
    back: 'The Paramecium’s beating cilia sweeping the field’s edge: dwell there and press Y to rise to the pool.',
    controls: [['LS', 'Steer the run'], ['RS', 'Move the stage'], ['A', 'Sprint run'], ['X', 'Feed · Bdellovibrio: bore in'], ['B', 'Defend: tumble (evades a strike)'], ['Y', 'Data overlay'], ['LB/RB', 'Reverse the run'], ['D-pad ↑↓', 'Field']],
    facts: [
      'A bacterium cannot steer: it chooses only when to tumble into a new direction.',
      'Its magnetosomes, a chain of magnetite crystals, line it up with the Earth’s field.',
      'At 1000× it is a dot or a dash: its anatomy comes from electron microscopes.',
    ],
  },
  {
    id: 'phage', n: 7, name: 'Host Surface', creature: 'Bacteriophage', latin: 'T4-like phage',
    mag: 'Beyond light', magNote: 'molecular illustration', field: '≈ 1 µm', fieldMm: 0.0012, body: '0.2 µm', look: 'Molecular illustration',
    card: 'MP-U07', intro: 'MP-G13', tint: ['#2c6e6a', '#e0a65a'], accent: '#f0c070',
    line: 'A virus with no engine: drift, bind the right host, and commit.',
    goal: 'Bind a host with your long tail fibres, walk to a receptor patch and inject your DNA; inside, outrun the host’s CRISPR complex until the cell bursts.',
    forward: null,
    back: 'The bacterium’s flagellum sweeping past: dwell beside it and press Y to rise to the sediment.',
    controls: [['LS', 'Drift · on a host: walk'], ['RS', 'Camera'], ['A', 'Current gust · push off'], ['X', 'Commit: inject · at an amoeba lobe: fibre jab'], ['B', 'Defend: fold the fibres and slip'], ['Y', 'Odds overlay · at the flagellum: back'], ['D-pad ↑↓', 'Zoom']],
    facts: [
      'No light microscope can see a phage: it is smaller than the wavelength of light.',
      'A phage has no motor; Brownian motion carries it until it touches a receptor.',
      'Its sheath contracts like a syringe and drives the tail tube through the cell wall.',
    ],
  },
];

export const byId = Object.fromEntries(WORLDS.map((w) => [w.id, w]));
export const indexOf = (id) => WORLDS.findIndex((w) => w.id === id);
