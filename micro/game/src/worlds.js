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
    goal: 'Head out across the pool in any direction: the challenges find you one at a time, with a little calm water between: Stenus (jump on its tell, mash A if the labium sticks, then dodge the mandible lunge), a water strider and a mass of springtails to hide in, then the rain. Then the way on opens: moss rafts under a golden sparkle, each where floating pondweed grows thick and a pond wolf spider hunts. Spot a spider and its raft is near: follow it home, lure it off, then get round it. Sundews dot the pool: go round or jump over them.',
    forward: 'A floating raft of Sphagnum under a golden sparkle, amid thick pondweed: lure its wolf spider off it, then land on it, where a speck is moving on a capitulum.',
    back: null,
    controls: [['LS', 'Walk on the water'], ['RS', 'Camera'], ['A', 'Jump with the furcula (released at an enemy: a pounce-bite; mash A to wriggle free)'], ['X', 'Graze; nip a predator; in the air, pounce-bite'], ['B', 'Defend: hunker (facing a predator, blocks its strike)'], ['RT', 'Hold: look far (focus out across the water)'], ['LT', 'Hold: a close look'], ['D-pad ↑↓', 'Magnification']],
    facts: [
      'A springtail spends its whole life on the surface film: to it, water is a floor.',
      'Its furcula, a forked tail folded under the body, snaps down and throws it many body lengths.',
      'Sundews on the moss catch more springtails than any other prey.',
      'Pond wolf spiders hunt across the water from floating leaves, feeling for ripples, and run back to cover.',
    ],
  },
  {
    id: 'mite', n: 2, name: 'Moss Canopy', creature: 'Box mite', latin: 'Oribatida: Phthiracaridae',
    mag: '≈ 80×', magNote: 'SEM, HFW 1.6 mm', field: '4.2–0.16 mm', fieldMm: 4.2, body: '0.35 mm', look: 'Scanning electron microscope',
    card: 'MP-U01', intro: 'MP-G08', tint: ['#8a8e92', '#1c1e20'], accent: '#c9cdd1',
    line: 'An armoured mite on eight jointed legs, through moss and fungal threads.',
    goal: 'Head out through the moss any way you like: a family of box mites, the predatory mite on its hunting ground, a drop of water falling into the moss, the predatory mite again (hungrier and faster), a shower of drops, the predator a third time, and at last a golden glow over a wet leaf axil, guarded by a pseudoscorpion; the moss grows wetter, beaded with water, as the water nears. Lure the pseudoscorpion off its post and get round it, or bite its pincer joints until it backs into the moss.',
    forward: 'A wet leaf axil under a golden glow, where a tardigrade walks in the water.',
    back: 'A giant springtail resting on the moss: dwell beside it and press Y to rise to the bog surface.',
    controls: [['LS', 'Walk: a slight push walks, full tilt hurries'], ['RS', 'Orbit'], ['A', 'Jump: tap to spring, hold for farther (X in the air: a pounce-bite)'], ['X', 'Bite: graze, or bite back'], ['B', 'Hold: dash (scramble)'], ['Y', 'Hold: defend (close up); in a portal: enter it; at the backdoor, rise a world'], ['D-pad ↑↓', 'Magnification']],
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
    line: 'Climb moss leaf cells with clawed stubby legs, out through the water film in any direction.',
    goal: 'Head out along the leaves any way you like: get past Milnesium (brace B or jab X), push and jab (X) through a band of rotifers, walk round the dry patches, then lure Prionchulus, the predatory nematode, off its post and get round it to the golden pool.',
    forward: 'About 8 mm out, whichever way you go: the tip of a broad Sphagnum leaf dipping into the pool under a golden sparkle, guarded by Prionchulus.',
    back: 'The leaf axil to the left, where leaves meet the stem: dwell there and press Y to rise to the moss.',
    controls: [['LS', 'Crawl: a slight push creeps, full tilt hurries'], ['RS', 'Turn and tilt'], ['A', 'Scramble'], ['X', 'Pierce: feed, or jab back'], ['B', 'Brace: block facing a predator'], ['Y', 'Curl into a tun (again: wake); in a portal: enter it'], ['LT/RT', 'Fine focus'], ['D-pad ↑↓', 'Magnification']],
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
    goal: 'Crawl out any way you like, eating easy prey and steering round fungal traps (stiffen with B, cut tips with X): ahead of you come fleeing ciliates (surge to catch them), then a patch with Paramecium caudatum, each a short crawl apart. Then the way on glows gold, guarded by the giant amoeba Chaos: lure it off, or pinch its arms (hold LT, close two pseudopods round one, X) until it gives up.',
    forward: 'A green Paramecium bursaria in a golden glow, at the opening toward open water, ahead of wherever you head.',
    back: 'A Sphagnum leaf tip dipping into the pool, to the left: dwell there and press Y to rise to the water film.',
    controls: [['LS', 'Move the body · LT: steer the L pseudopod'], ['RS', 'Steer the selected (R) pseudopod · grow one'], ['A', 'Surge'], ['X', 'Close the cup / cut / pinch'], ['B', 'Let go / stiffen'], ['LT', 'Hold: LS steers a second (L) pseudopod'], ['RT', 'Hold: RS chooses R (or grows one); LT+RT: both sticks choose'], ['LB/RB', 'Spread / push'], ['Y', 'In a portal: enter it'], ['D-pad ↑↓', 'Objective']],
    facts: [
      'An amoeba keeps its volume: every arm it grows takes body from somewhere else.',
      'It cups prey without touching it, then closes the cup into a food vacuole.',
      'At 0.45 mm it is longer than the tardigrade: here the habitat changes, not the size.',
      'Some fungi farm amoebae: their sticky hyphae catch a passing cell and grow feeding threads into it.',
    ],
  },
  {
    id: 'paramecium', n: 5, name: 'Hollow Pool', creature: 'Paramecium', latin: 'Paramecium bursaria',
    mag: '20×', magNote: 'objective, darkfield', field: '0.9 mm', fieldMm: 0.9, body: '0.12 mm', look: 'Darkfield and brightfield',
    card: 'MP-U04', intro: 'MP-G11', tint: ['#2a4a6a', '#05070b'], accent: '#8fc0e8',
    line: 'A fast ciliate carrying green algae: no gliding here, only beating cilia.',
    goal: 'Head out in any direction: past Dileptus (trichocysts drive it off), a Chlamydomonas bloom you push and gulp through and two Didinium (keep away and dodge the lunge) to a biofilm under a golden light. A bladderwort trap guards it: make it fire and miss until it is spent, then slip past.',
    forward: 'A biofilm patch on a submerged leaf: rods and dots that read only as texture.',
    back: 'The amoeba’s floor, behind where you start: dwell there and press Y to rise to the pool floor.',
    controls: [['LS', 'Swim forward · turn left/right'], ['RS', 'Camera · aim swimming'], ['A', 'Ciliary sprint'], ['X', 'Eat · in the bloom: gulp a way · at a hunter: ram'], ['B', 'Trichocysts: drive off Dileptus, burst free (not Didinium)'], ['Y', 'Microscope view; in a portal: enter it'], ['D-pad ↑↓', 'Objective']],
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
    line: 'Call your kin into a flock and lead an army, at the limit of the light microscope.',
    goal: 'Press X near kin: they answer your beacon and join your flock. X also eats prey, so the army grows. Head out any way you like: a grazer, a Bdellovibrio pack, a phage cloud, an amoeba and a bigger grazer come your way one at a time, with calm water between, and last Stentor guards the glowing host. Beat it with your army to go through.',
    forward: 'A host cell that swells as something invisible clings to it.',
    back: 'The Paramecium’s beating cilia sweeping the field’s edge: dwell there and press Y to rise to the pool.',
    controls: [['LS', 'Steer the flock (let go: it stops)'], ['RS', 'Move the stage'], ['A', 'Sprint run'], ['X', 'Beacon: call kin · eat prey · strike · Bdellovibrio: bore in'], ['B', 'Defend: tumble (evades a strike)'], ['Y', 'Toxin burst (army of 12); in a portal: enter it'], ['LB/RB', 'Reverse the run'], ['D-pad ↑↓', 'Field']],
    facts: [
      'A bacterium cannot steer: it chooses only when to tumble into a new direction.',
      'Its magnetosomes, a chain of magnetite crystals, line it up with the Earth’s field.',
      'At 1000× it is a dot or a dash: its anatomy comes from electron microscopes.',
      'Quorum sensing: bacteria switch on toxins only when enough of them are close together.',
      'Some bacteria kill their neighbours, and even amoebae, by touch, with a molecular spear (type VI secretion).',
    ],
  },
  {
    id: 'phage', n: 7, name: 'Host Surface', creature: 'Bacteriophage', latin: 'T4-like phage',
    mag: 'Beyond light', magNote: 'realistic false light', field: '≈ 1 µm', fieldMm: 0.0012, body: '0.2 µm', look: 'False light',
    card: 'MP-U09', intro: 'MP-G14', tint: ['#1f6f80', '#f0b44a'], accent: '#f0c070',
    line: 'A virus with no engine, knocked about by molecules: drift legs-first and grab the matching protein.',
    goal: 'Head out any way you like: two decoy hosts come your way one after the other, among humic flocs (fold your fibres with B to slip through), big bacteria and violet UV shafts (touch one and you are damaged). Then a golden glow marks the way on, a gold receptor on Host A, guarded by an amoeba: lure it off, or fold and jab it until it gives up, then grab the receptor (X) and outrun the CRISPR complex inside. Damaged? Co-infect a host with a teammate (or the other damaged phage) to recombine.',
    forward: null,
    back: 'The bacterium’s flagellum sweeping past: dwell beside it and press Y to rise to the sediment.',
    controls: [['LS', 'Drift across the view, legs first'], ['LT/RT', 'Drift back toward you / into the view'], ['RS', 'Turn the view (no up or down)'], ['A', 'Current gust · push off'], ['X', 'Grab protein · matching receptor injects · fibre jab at amoeba'], ['B', 'Defend: fold the fibres and slip'], ['Y', 'Odds overlay · at the flagellum: back'], ['D-pad ↑↓', 'Zoom']],
    facts: [
      'No light microscope can see a phage: it is smaller than the wavelength of light.',
      'A phage has no motor; molecules striking it from every side (Brownian motion) carry it until it touches a receptor.',
      'Its sheath contracts like a syringe and drives the tail tube through the cell wall.',
      'UV-damaged T4 phages that infect one cell together can recombine into a working genome (multiplicity reactivation).',
    ],
  },
];

export const byId = Object.fromEntries(WORLDS.map((w) => [w.id, w]));
export const indexOf = (id) => WORLDS.findIndex((w) => w.id === id);
