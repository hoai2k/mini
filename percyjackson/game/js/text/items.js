// Text section (merged into js/text_config.js at the end of the extraction).
// Items, enchantments, loot, the inventory and forge screens, resources, pickups, magic items.
export default {
  // Gear: names and descriptions of every base item, in loot.js order
  items: {
    // Weapons
    training_sword: { name: 'Camp Training Sword', desc: 'A bronze practice sword from the camp armoury. Reliable.' },
    bronze_dagger: { name: 'Bronze Dagger', desc: 'Quick and light. Up close is where a dagger shines.' },
    camp_spear: { name: 'Camp Spear', desc: 'Long reach, steady thrusts.' },
    club: { name: 'Cyclops Club', desc: 'A table leg from the Big House. Heavy, slow, and sends monsters flying.' },
    bronze_axe: { name: 'Bronze Hand Axe', desc: 'Wide, chopping swings that catch several monsters at once.' },
    shepherd_crook: { name: 'Shepherd’s Crook', desc: 'Satyrs swear by it. Long reach and a gentle hook.' },
    xiphos: { name: 'Celestial Bronze Xiphos', desc: 'A leaf-bladed Greek sword. Monsters fear its glow.' },
    hammer: { name: 'Forge Hammer', desc: 'Made in the Hephaestus cabin. Every third blow shakes the ground.' },
    reed_staff: { name: 'Reed Staff of Pan', desc: 'A satyr’s staff, humming with wild music.' },
    lamer: { name: 'Electric Spear', desc: 'A spear that crackles with stolen lightning.' },
    labrys: { name: 'Labrys of Knossos', desc: 'The double axe of the labyrinth’s kings. Huge sweeping arcs.' },
    kopis: { name: 'Spartan Kopis', desc: 'A forward-curved blade that bites hardest into the wounded.' },
    dory: { name: 'Hoplite Dory', desc: 'The great spear of the phalanx. Reach that keeps monsters at bay.' },
    backbiter: { name: 'Backbiter', desc: 'Half celestial bronze, half tempered steel: it cuts mortals and monsters alike, and ignores shields.' },
    stygian_blade: { name: 'Stygian Iron Blade', desc: 'Forged in the Styx. It drinks the essence of what it strikes.' },
    twin_daggers: { name: 'Twin Huntress Knives', desc: 'Silver knives of the Hunters of Artemis. Every hit strikes twice.' },
    imperial_gladius: { name: 'Imperial Gold Gladius', desc: 'A Roman blade of Imperial gold. Sturdy, sharp and fast.' },
    harpe: { name: 'Harpe of Perseus', desc: 'The sickle-sword that took Medusa’s head. Deadly to the mightiest monsters.' },
    heracles_club: { name: 'Club of Heracles', desc: 'Olive wood studded with bronze. Every swing is a thunderclap.' },
    pelian_spear: { name: 'Pelian Spear of Achilles', desc: 'Only Achilles could wield it. Its strikes find every gap in armour.' },
    ares_sword: { name: 'Burning Sword of Ares', desc: 'The war god’s own blade. Monsters it fells burst into flame.' },
    trident_blade: { name: 'Tide-Forged Sword', desc: 'Cooled in the sea by Poseidon’s Cyclopes. It hits like a wave.' },
    // Armour
    camp_shirt: { name: 'Camp Half-Blood T-shirt', desc: 'Orange, with a pegasus. Surprisingly tough.' },
    bronze_breastplate: { name: 'Bronze Breastplate', desc: 'Standard camp battle armour. Heavy.' },
    hermes_uniform: { name: 'Hermes Express Uniform', desc: 'Built for fast deliveries.' },
    linothorax: { name: 'Linothorax', desc: 'Layered linen armour: light and quick to move in.' },
    biker_jacket: { name: 'Biker Jacket of Ares', desc: 'Smells of smoke and war. Fighting makes you stronger.' },
    hunter_parka: { name: 'Hunter’s Silver Parka', desc: 'Silver, light and warm, with a huntress’s quiver. Abilities come back faster.' },
    sea_armor: { name: 'Sea-Green Mail', desc: 'Scales from Poseidon’s armoury. Power flows like the tide.' },
    hoplite_panoply: { name: 'Hoplite Panoply', desc: 'Full bronze armour of a Greek soldier: helm, cuirass and greaves.' },
    spartan_cloak: { name: 'Spartan Crimson Cloak', desc: 'Come back with your shield, or on it.' },
    satyr_vest: { name: 'Satyr’s Woven Vest', desc: 'Wild-grown and alive. It mends you slowly.' },
    nemean_pelt: { name: 'Nemean Lion Pelt', desc: 'The golden pelt no blade can pierce.' },
    fleece_cloak: { name: 'Golden Fleece Mantle', desc: 'Healing magic woven into gold. Ambrosia refills faster.' },
    forge_apron: { name: 'Fireproof Forge Apron', desc: 'Hephaestus’s own. Nothing near you stays cool for long.' },
    amazon_armor: { name: 'Armour of the Amazons', desc: 'Queen Hylla’s fighters move like the wind and strike true.' },
    achilles_armor: { name: 'Armour of Achilles', desc: 'Forged by Hephaestus for the greatest hero of Troy. Nearly invulnerable.' },
    hermes_cap: { name: 'Winged Travelling Cloak', desc: 'Hermes’s own travelling gear. Light as a breeze.' },
    // Magic items
    master_bolt: { name: 'Spark of the Master Bolt', desc: 'A javelin of lightning that pierces every monster in a line.' },
    hephaestus_net: { name: 'Hephaestus’s Golden Net', desc: 'Throw the net and drag every monster it catches to you.' },
    medusa_head: { name: 'Medusa’s Head (in a bag)', desc: 'Lift the bag and every nearby monster turns to stone for 4 seconds. Don’t look.' },
    nemesis_coin: { name: 'Nemesis’s Fortune Coin', desc: 'Balance: damages every monster you hit in the last 5 seconds.' },
    aegis: { name: 'Aegis Charm', desc: 'A shimmer of Zeus’s shield: halves damage taken for 5 seconds.' },
    pegasus_whistle: { name: 'Pegasus Whistle', desc: 'Calls a pegasus who dives at monsters for 12 seconds.' },
    nectar_flask: { name: 'Nectar Flask', desc: 'Heals you and nearby friends over 4 seconds.' },
    bag_of_winds: { name: 'Bag of Winds', desc: 'A gift of Aeolus: a gale that hurls monsters away.' },
    helm_of_darkness: { name: 'Shadow of the Helm', desc: 'For 5 seconds the whole team turns invisible to monsters.' },
    winged_shoes: { name: 'Winged Sneakers', desc: 'Maia! Run much faster for 6 seconds.' },
    greek_fire: { name: 'Jar of Greek Fire', desc: 'A thrown jar: green fire that burns where it lands.' },
    zeus_thunder: { name: 'Thunder of Zeus', desc: 'Lightning strikes the five nearest monsters.' },
    orpheus_lyre: { name: 'Lyre of Orpheus', desc: 'A song so sad that every monster nearby falls asleep. Hitting them wakes them.' },
    apple_of_discord: { name: 'Golden Apple of Discord', desc: '“To the fairest.” Monsters near it turn on each other for 6 seconds.' },
    athena_owl: { name: 'Athena’s Owl', desc: 'The owl marks every monster in sight: your team does +50% damage to them for 8 seconds.' },
    ariadne_thread: { name: 'Ariadne’s Thread', desc: 'A golden thread shows the way to what you seek, and quickens your step.' },
    caduceus: { name: 'Caduceus of Hermes', desc: 'George and Martha, the staff’s two snakes, slither out to bite monsters for 12 seconds.' },
    boar_tusk: { name: 'Erymanthian Boar Tusk', desc: 'Charge forward like the great boar, trampling everything in your path.' },
    trident_charm: { name: 'Trident of the Sea', desc: 'Strike the ground: geysers of seawater burst up all around you.' },
    sun_chariot: { name: 'Ray of the Sun Chariot', desc: 'Apollo’s sunlight burns a line of monsters.' },
    kronos_hourglass: { name: 'Hourglass of Kronos', desc: 'The Titan of time’s sand: monsters slow to a crawl for 4 seconds.' },
    cornucopia: { name: 'Cornucopia', desc: 'The horn of plenty spills healing fruit and drachmas.' },
    stymphalian_feathers: { name: 'Stymphalian Feathers', desc: 'A fan of bronze feathers, thrown like knives.' },
  },

  // Enchantments ({n} is the number the level works out to; {n2} a second one)
  enchantments: {
    // Weapons
    sharpness: { name: 'Celestial Edge', desc: '+{n}% melee damage' },
    swirling: { name: 'Whirlwind', desc: 'Every third hit spins, striking all around for {n}%' },
    committed: { name: 'Relentless', desc: 'Up to +{n}% damage to wounded monsters' },
    rampaging: { name: 'War Frenzy', desc: 'Defeating a monster gives +{n}% attack speed for 5 s' },
    leeching: { name: 'Nectar Thirst', desc: 'Heal {n}% of your health when you defeat a monster' },
    exploding: { name: 'Greek Fire', desc: 'Monsters you defeat explode for {n}% of their health' },
    freezing: { name: 'Boreas’s Chill', desc: 'Hits slow monsters for {n} s' },
    critical: { name: 'Athena’s Eye', desc: '+{n}% critical chance' },
    thundering: { name: 'Zeus’s Spark', desc: '{n}% chance on hit to call down lightning' },
    echo: { name: 'Echo', desc: '{n}% chance to strike twice' },
    bane: { name: 'Monster Bane', desc: '+{n}% damage to elites, champions and bosses' },
    // Armour
    health: { name: 'Ambrosia-Fed', desc: '+{n} health' },
    protection: { name: 'Aegis Ward', desc: '+{n}% damage reduction' },
    swiftness: { name: 'Hermes’s Speed', desc: '+{n}% move speed' },
    cooldown: { name: 'Focus', desc: '-{n}% ability cooldowns (Ambrosia -{n2}%)' },
    surge: { name: 'Godly Blood', desc: '+{n}% Power gain' },
    potency: { name: 'Divine Might', desc: '+{n}% ability damage' },
    vitality: { name: 'Apollo’s Blessing', desc: 'Ambrosia heals {n}% more of your health' },
    nectar: { name: 'Hebe’s Cup', desc: 'Ambrosia refills {n}% faster' },
    quiver: { name: 'Artemis’s Quiver', desc: '+{n} shots in your quiver' },
    thorns: { name: 'Demeter’s Briars', desc: 'Monsters that hit you take {n}% of the damage back' },
    embers: { name: 'Hephaestus’s Embers', desc: 'Burn monsters right next to you for {n} damage a second' },
    evasion: { name: 'Nimble as a Satyr', desc: '{n}% chance to dodge a hit' },
    lucky: { name: 'Tyche’s Luck', desc: '+{n}% drachmas found' },
  },

  // Rarity names (also used for the Blessed gift of a god)
  rarity: {
    common: 'Common',
    rare: 'Rare',
    unique: 'Legendary',
    blessed: 'Blessed',
  },

  // Loot: kinds of gear and the card shown when an item is picked up
  loot: {
    kind: { weapon: 'Weapon', armor: 'Armour', artifact: 'Magic item' },
    blessedName: 'Blessed {name}',
    card: {
      newSlot: 'New slot!',
      power: 'Power {arrow}{n}',
      change: '{label} {arrow}{value}',
      damage: 'Damage',
      speed: 'Speed',
      health: 'Health',
      armour: 'Armour',
      nameFor: 'P{n} · {name}',
      sub: '{rarity} {kind} · Power {power}',
      subFavourite: '{rarity} {kind} · Power {power} · {hero}’s favourite',
      hint: 'Equip it from the inventory (pause menu, or I)',
    },
  },

  // Inventory screen (pause menu, or I)
  inventory: {
    title: 'Inventory',
    slots: { weapon: 'Weapon', armor: 'Armour', artifact1: 'Magic item 1', artifact2: 'Magic item 2' },
    filters: { all: 'All', weapon: 'Weapons', armor: 'Armour', artifact: 'Magic items' },
    companion: '{hero} (companion)',
    equipped: 'Equipped · {hero}',
    summary: {
      one: 'Level {level} · ◆ {coins} drachmas · {n} enchantment point',
      other: 'Level {level} · ◆ {coins} drachmas · {n} enchantment points',
    },
    empty: 'Nothing here yet. Open chests and defeat monsters for loot.',
    itemLabel: '{name}, power {power}',
    itemLabelEquipped: '{name}, power {power}, equipped',
    new: 'NEW',
    favouriteTitle: '{hero}’s favourite',
    favourite: '★ {hero}’s favourite: +10% power for {hero}',
    choose: 'Choose an item to see it, enchant it or equip it.',
    // Hero stat lines
    stats: {
      health: 'Health',
      melee: 'Melee damage',
      ability: 'Ability damage',
      attackSpeed: 'Attack speed',
      armor: 'Damage reduction',
      speed: 'Move speed',
      crit: 'Critical chance',
      cooldowns: 'Cooldowns',
      dodge: 'Dodge chance',
      flask: 'Ambrosia refills in',
      quiver: 'Quiver',
    },
    percent: '{n}%',
    seconds: '{n} s',
    times: '×{n}',
    change: '{label} {arrow} {value}',
    // Item detail
    rarityLine: '{rarity} {kind} · Power {power}',
    descCooldown: '{desc} Cooldown {n} s.',
    comparedWith: 'Compared with your {slot}:',
    enchantHeading: {
      one: 'Enchantments · {n} point to spend',
      other: 'Enchantments · {n} points to spend',
    },
    builtIn: 'built in',
    chooseOne: 'Choose one:',
    pointCost: '{n} pt',
    levelCost: '{level} · {cost} pt',
    max: 'max',
    blessedMark: '✦',
    godsBlessing: 'a god’s blessing',
    unequip: 'Unequip',
    equip: 'Equip ({slot})',
    equips: '{hero} equips {name}',
    // Salvage
    salvage: 'Salvage (+◆{coins})',
    salvaged: 'Salvaged: +◆{coins}',
    salvagedPoints: 'Salvaged: +◆{coins}, +{points} enchantment points',
    salvageTitle: 'Salvage this item?',
    salvageText: '{name} will be gone. You get ◆{coins}.',
    salvageTextPoints: '{name} will be gone. You get ◆{coins} and {points} enchantment points back.',
    salvageYes: 'Salvage',
    salvageNo: 'Keep',
    close: 'Close',
  },

  // The forge in camp (the inventory with tempering and re-rolling)
  forge: {
    title: 'The Forge',
    summary: {
      one: 'Level {level} · ◆ {coins} drachmas · {n} enchantment point · Temper items and re-roll enchantment choices here',
      other: 'Level {level} · ◆ {coins} drachmas · {n} enchantment points · Temper items and re-roll enchantment choices here',
    },
    noDrachmas: 'Not enough drachmas',
    reroll: 'Re-roll choices (◆{cost})',
    temper: 'Temper +1 power (◆{cost})',
    temperCap: 'This item is as strong as the forge can make it for now',
  },

  // Store: shop listings use the item, rarity and kind names above
  store: {},

  // Quiver contents per hero: what the ammo is called and the out-of-ammo hint
  resources: {
    ammo: {
      percy: { name: 'water', out: 'Out of water — it comes back over time' },
      annabeth: { name: 'knives', out: 'Out of knives — they come back over time' },
      grover: { name: 'notes', out: 'Out of breath for the pipes — it comes back over time' },
      tyson: { name: 'boulders', out: 'Out of boulders — they come back over time' },
      clarisse: { name: 'sparks', out: 'Out of sparks — they come back over time' },
      default: { name: 'arrows', out: 'Out of arrows — they come back over time' },
    },
  },

  // Pickups: the number shown when an ammo bundle is collected
  pickups: {
    ammoGain: '+{n}',
  },

  // Magic item toasts
  artifacts: {
    owlMarks: { one: 'The owl marks {n} monster', other: 'The owl marks {n} monsters' },
    owlSeesNone: 'The owl sees no monsters',
    threadStill: 'The thread lies still: nothing left to find here',
  },
};
