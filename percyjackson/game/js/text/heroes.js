// Heroes: names, titles, godly powers, skill trees, ability names and toasts.
export default {
  // Hero select, party screens and the HUD
  heroes: {
    percy: { name: 'Percy', full: 'Percy Jackson', title: 'Son of Poseidon', parent: 'Poseidon', desc: 'Riptide and the sea: water jets, Wave Surge, a healing tide, and Riptide thrown and recalled.', power: 'Hurricane' },
    annabeth: { name: 'Annabeth', full: 'Annabeth Chase', title: 'Daughter of Athena', parent: 'Athena', desc: 'A quick bronze dagger, the invisibility cap, traps and battle plans that mark a weak point for the team.', power: "Wisdom's Gambit" },
    grover: { name: 'Grover', full: 'Grover Underwood', title: 'Satyr Protector', parent: 'Pan (satyr)', desc: 'Reed-pipe songs that tangle, heal and calm; winged sneakers that fly over danger.', power: 'Panic' },
    tyson: { name: 'Tyson', full: 'Tyson', title: 'Cyclops, Son of Poseidon', parent: 'Poseidon', desc: 'Huge fists, thrown boulders, a watch that becomes a shield, and fire that cannot hurt him.', power: 'Big Brother' },
    clarisse: { name: 'Clarisse', full: 'Clarisse La Rue', title: 'Daughter of Ares', parent: 'Ares', desc: 'An electric spear, charges, war cries and a boar shield.', power: "Ares's Fury" },
    thalia: { name: 'Thalia', full: 'Thalia Grace', title: 'Daughter of Zeus', parent: 'Zeus', desc: 'Spear and the terrifying Aegis; lightning that chains between foes.', power: 'Storm of Zeus' },
    nico: { name: 'Nico', full: 'Nico di Angelo', title: 'Son of Hades', parent: 'Hades', desc: 'Stygian iron, shadow travel and an army of the dead.', power: 'King of the Dead' },
  },

  // Skill screen: reasons a rank cannot be bought, then each hero's starters, branches and nodes
  skills: {
    reasons: {
      unknown: 'Unknown skill',
      fullyTrained: 'Fully trained',
      needsSkill: 'Needs {name}',
      needsBranchPoints: 'Needs {gate} points in {branch} ({have} so far)',
      needsPoints: { one: 'Needs {n} point', other: 'Needs {n} points' },
    },
    // Percy Jackson
    percy: {
      surge: { name: 'Wave Surge', desc: 'A cone of seawater that knocks monsters flat.' },
      tide: { name: 'Healing Tide', desc: 'A pool of seawater that heals heroes in it and slows monsters.' },
      throw: { name: 'Riptide Throw', desc: 'Riptide spins out in a line and comes back to his hand.' },
      branch: {
        blade: { name: 'Riptide', desc: 'Swordsmanship, as Luke taught it' },
        tides: { name: 'Tides', desc: 'Water as a weapon' },
        sea: { name: 'Son of the Sea', desc: 'The sea heals and shields' },
      },
      riptide: { name: 'Celestial Bronze', desc: 'Melee damage.', at: '{pct} melee damage' },
      throw_up: { name: 'Returning Blade', desc: 'Riptide Throw flies further and hits harder.', at: '{metres} m, {damage} damage' },
      disarm: { name: 'Disarming Strike', desc: 'A lunging thrust. The monster it hits is stunned; a boss is left open (marked) instead.', at: '{damage} damage, {seconds} s stun' },
      jet: { name: 'Pressure Jet', desc: 'Water Jet hits harder.', at: '{damage} damage a jet' },
      surge_up: { name: 'Tidal Force', desc: 'Wave Surge reaches further and hits harder.', at: '{metres} m, {damage} damage' },
      geyser: { name: 'Geyser', desc: 'Water bursts out of the ground where you aim and throws monsters into the air.', at: '{damage} damage, {metres} m across' },
      sea: { name: 'Son of the Sea', desc: 'In water Percy heals faster and hits harder.', at: 'heals {n}/s in water, {pct} damage in water' },
      tide_up: { name: 'Deep Tide', desc: 'Healing Tide is wider, lasts longer and heals more.', at: '{metres} m, {seconds} s' },
      bubble: { name: 'Air Bubble', desc: 'A bubble of sea air round Percy and the heroes near him: half damage from every hit.', at: '{seconds} s, heroes within {metres} m' },
      hurricane: { name: 'Eye of the Storm', desc: 'Hurricane lasts longer.', at: '{seconds} s' },
    },
    // Annabeth Chase
    annabeth: {
      cap: { name: 'Yankees Cap', desc: 'Invisible for a few seconds; the first hit out of hiding is critical.' },
      plan: { name: 'Battle Plan', desc: "Marks a monster's weak point: it takes +50% damage from the team." },
      trap: { name: 'Daedalus Trap', desc: 'A bronze snare that roots the monsters that step on it.' },
      branch: {
        stealth: { name: 'Stealth', desc: 'The cap and the dagger' },
        strategy: { name: 'Strategy', desc: 'Plans that win battles' },
        workshop: { name: 'Workshop', desc: "Daedalus's inventions" },
      },
      blade: { name: 'Bronze Edge', desc: 'Melee damage.', at: '{pct} melee damage' },
      backstab: { name: 'Weak Spot', desc: 'Hits from behind deal more.', at: '{pct} damage from behind' },
      cap_up: { name: 'Yankees Cap', desc: 'Invisibility lasts longer.', at: '{seconds} s invisible' },
      flank: { name: 'Flank', desc: 'She darts round behind the monster you aim at and strikes: the hit is critical.', at: '{damage} damage, x2 critical' },
      owl: { name: 'Grey Eyes', desc: 'Critical chance.', at: '{pct} critical chance' },
      plan_up: { name: 'Strategist', desc: 'Battle Plan lasts longer and the mark bites harder.', at: '{seconds} s, mark +{percent}%' },
      orders: { name: 'Battle Orders', desc: 'Every hero near her runs faster and gains Power.', at: '+30% speed for {seconds} s, +{power} Power' },
      gambit: { name: 'Wisdom', desc: "Wisdom's Gambit lasts longer.", at: '{seconds} s' },
      trap_up: { name: 'Daedalus Workshop', desc: 'Traps root longer and hit harder.', at: '{seconds} s root, {damage} damage' },
      automaton: { name: 'Bronze Automaton', desc: 'A little bronze sentry that throws knives at the monsters near it.', at: '{seconds} s, {damage} damage a knife' },
    },
    // Grover Underwood
    grover: {
      vines: { name: 'Tangle Vines', desc: 'Blocky vines burst from the ground and root monsters.' },
      calm: { name: 'Calming Song', desc: 'Heals every hero near him over a few seconds and slows monsters.' },
      maia: { name: 'Maia!', desc: 'Winged sneakers carry him over gaps and monsters.' },
      branch: {
        wild: { name: 'Wild', desc: 'The forest fights for him' },
        pipes: { name: 'Reed Pipes', desc: 'Songs of Pan' },
        satyr: { name: 'Satyr', desc: 'Hooves, sneakers and snacks' },
      },
      vines_up: { name: 'Wild Growth', desc: 'Tangle Vines cover more ground and hold longer.', at: '{metres} m, {seconds} s' },
      briar: { name: 'Briar Burst', desc: 'Thorns burst up all round Grover, hurting, slowing and pushing back the monsters close by.', at: '{damage} damage, {metres} m' },
      pipes: { name: 'Reed Pipes', desc: 'Pipe Song bolts hit harder.', at: '{damage} damage a bolt' },
      song: { name: 'Calming Song', desc: 'Calming Song heals more.', at: '{percent}% health every half second' },
      lullaby: { name: 'Lullaby', desc: 'A sleepy tune: monsters near him nod off (bosses only slow down).', at: '{seconds} s asleep, {metres} m' },
      panic: { name: 'Voice of Pan', desc: 'Panic lasts longer.', at: '{seconds} s' },
      hooves: { name: 'Hoof Kick', desc: 'Melee damage.', at: '{pct} melee damage' },
      maia_up: { name: 'Maia!', desc: 'Flies further and lands with a stomp that hits harder.', at: '{metres} m, {damage} damage stomp' },
      snack: { name: 'Tin-Can Snack', desc: 'Grover munches a tin can: health and Power back.', at: '{percent}% health, +{power} Power' },
    },
    // Tyson
    tyson: {
      pound: { name: 'Ground Pound', desc: 'Leaps and slams the ground, launching everything near.' },
      shield: { name: 'Watch Shield', desc: 'A bronze shield that blocks every hit from the front and bats arrows back.' },
      forge: { name: 'Forge Fire', desc: "Immune to fire; the team's melee hits deal +30% for a while." },
      branch: {
        fists: { name: 'Fists', desc: 'Huge and heavy' },
        hide: { name: 'Cyclops Hide', desc: 'Nothing gets past him' },
        forge: { name: 'Forge and Sea', desc: 'Fire, bronze and a hippocampus friend' },
      },
      fists: { name: 'Heavy Hands', desc: 'Melee damage.', at: '{pct} melee damage' },
      mighty: { name: 'Mighty Blow', desc: 'A wider timing window for Mighty Blows.', at: '{ms} ms window' },
      mighty_ce: { name: "Smith's Rhythm", desc: 'Mighty Blows restore Power.', at: '+{power} Power a Mighty Blow' },
      pound_up: { name: 'Earthshaker', desc: 'Ground Pound covers more ground and hits harder.', at: '{metres} m, {damage} damage' },
      clap: { name: 'Thunder Clap', desc: 'He claps his hands: a shock wave in front of him that stuns.', at: '{damage} damage, {seconds} s stun' },
      vitality: { name: 'Cyclops Hide', desc: 'Max health.', at: '+{health} max health' },
      shield_up: { name: 'Hephaestus Steel', desc: 'Watch Shield lasts longer.', at: '{seconds} s' },
      ironskin: { name: 'Iron Skin', desc: 'Half damage and no knock-back for a while; every hit he takes gives Power.', at: '{seconds} s, +{power} Power a hit' },
      boulder: { name: 'Bigger Boulders', desc: 'Boulders are bigger and burst wider on landing.', at: '{damage} damage, {metres} m burst' },
      forge_up: { name: 'Hot Forge', desc: 'Forge Fire burns longer.', at: '{seconds} s' },
      rainbow: { name: 'Call Rainbow', desc: 'Rainbow the hippocampus surges through in a line of seawater, trampling monsters.', at: '{damage} damage, {metres} m' },
    },
    // Clarisse La Rue
    clarisse: {
      charge: { name: 'Charge', desc: 'A shield-first dash that carries monsters along and slams them down.' },
      cry: { name: 'War Cry', desc: 'The whole team deals +25% damage for a while.' },
      bash: { name: 'Shield Bash', desc: 'A cone of shield bash that stuns.' },
      branch: {
        spear: { name: 'Spear', desc: 'Lightning down the spear' },
        ares: { name: 'Ares', desc: 'War, and loving it' },
        cabin: { name: 'Cabin Five', desc: 'Tough as the Ares cabin' },
      },
      spear: { name: 'Maimer', desc: 'Melee damage.', at: '{pct} melee damage' },
      volt: { name: 'Live Current', desc: 'Spear Lightning reaches further and stuns longer.', at: '{metres} m, {seconds} s stun' },
      chain: { name: 'Chain Lightning', desc: 'A bolt from the spear that leaps from monster to monster.', at: '{damage} damage, {n} monsters' },
      cry_up: { name: 'Battle Cry', desc: 'War Cry lasts longer and heals the team a little.', at: '{seconds} s, heals {n}' },
      charge_up: { name: 'Battering Ram', desc: 'Charge goes further and slams harder.', at: '{damage} damage slam' },
      frenzy: { name: 'Battle Frenzy', desc: 'Her melee hits deal more and heal her for a while.', at: '{seconds} s, +30% melee, {n} health a hit' },
      fury: { name: 'Blood of Ares', desc: "Ares's Fury lasts longer and burns hotter.", at: '{seconds} s, {n} burn a second' },
      tough: { name: 'Cabin Five', desc: 'Max health and armour.', at: '+{health} max health, +{percent}% armour' },
      bash_up: { name: 'Boar Shield', desc: 'Shield Bash is wider and stuns longer.', at: '{seconds} s stun' },
      hold: { name: 'Hold the Line', desc: 'She plants her spear: half damage, and lightning crackles into the monsters round her.', at: '{seconds} s, {damage} damage a zap' },
    },
  },

  // Ability names on the HUD that are not skills (basic ranged attacks)
  powers: {
    base: { ranged: 'Power Bolt' },
    percy: { ranged: 'Water Jet' },
    annabeth: { ranged: 'Thrown Knife' },
    grover: { ranged: 'Pipe Song' },
    tyson: { ranged: 'Boulder' },
    clarisse: { ranged: 'Spear Lightning' },
  },

  // Toasts when an ability is used
  kit: {
    annabeth: { weakPoint: 'Weak point marked', orders: 'Battle Orders: move!' },
    grover: { lullaby: 'Lullaby: the monsters doze off' },
    tyson: { forge: 'Forge Fire: the team hits harder' },
    clarisse: { warCry: 'War Cry: the team hits harder' },
  },
}
