# Half-Blood Quests: game design

*Working title.* A co-op action dungeon crawler in the blocky 3D style of
Minecraft Dungeons, set in Rick Riordan's *Percy Jackson and the Olympians*.
Players are demigods. They train at Camp Half-Blood between quests, then play
the books as chapters: fight monsters, see through the Mist, solve each myth's
riddle, and fulfil the prophecy line by line.

The first build starts from Cursed Dungeons (`hoai2k/francis`,
`cursed-dungeons/`). That game already has the Three.js voxel world, blocky
characters with code-painted skins, combat, loot, bosses, a hub and up to four
players on one screen. This game keeps that engine and replaces its theme, then
adds the story, the Mist, hero switching, the camp minigames and online play.

## Pillars

1. **Be a demigod with friends.** Every hero plays differently. Switch heroes
   mid-fight alone, or play together on one screen or online.
2. **The Mist hides the real world.** Early chapters are mostly an ordinary
   world with something wrong in it. Seeing through the Mist reveals the
   monsters, the paths and the gold-ornamental world of the gods.
3. **Know the myth, beat the monster.** Bosses are riddles from Greek myth
   before they are health bars.
4. **Camp is home.** Short, replayable camp games give you a reason to stay
   between quests.
5. **True to the books, fit for ages 8 to 14.** The books' humour, scared and
   brave by turns. Monsters burst into golden dust, never gore.

## Platform: made for desktop

The game is optimized for a desktop or laptop screen, played with a
controller or keyboard and mouse. Phones and tablets are supported but not
prioritized: the touch controls and the small-screen layouts keep working,
but no decision about the desktop game (character and world sizes, camera
distance, how many monsters fight at once, effects, UI density, controls) is
made smaller, simpler or safer for them. Weigh a choice on a desktop screen;
where a phone needs something different, branch for it (`isMobile`,
`body.is-touch`, CSS for small screens) rather than changing the desktop
game.

The workbenches (`game/workbench/`: the model workbench and the turntable)
are the exception: they support phones natively, as well as desktop. On a
phone the workbench's viewer stays at the top while the list and the
inspector scroll under it, every control is finger-sized, and both pages
turn and zoom by touch (drag, pinch).

## Look

- **World and characters:** blocky voxel models and 16-pixel textures, seen
  from the high isometric camera of Minecraft Dungeons. Colours follow the
  concept art: camp orange, sea teal, deep navy, jade, coral and bronze gold.
- **True Sight:** when a hero sees through the Mist, the world's surfaces take
  on the ornamental style of the concept art: gold Greek-key and vase-frieze
  linework over teal and navy. This joins the two art directions. The Mist is
  the plain blocky world, and the gods' world is the ornamental one.
- **Interface:** black-and-gold ornamental frames, wave-scroll health bars and
  round vase-style ability icons, from `concept/ui-hero-cards.png`.
- **Text:** in-game and title writing first appears as Greek letters, holds a
  moment, then rearranges itself into English with time left to read it. This
  is how a demigod reads: their brains are wired for ancient Greek. It applies
  to chapter and place titles, boss names, signs in the world, the words on
  the school bus and the prophecy. Narration (cutscene subtitles, story-card
  lines), objectives, hints and messages stay plain English, to be read at
  once. A setting turns it off.

## Heroes

Each hero has a melee combo, a ranged move, three abilities, a **godly power**
(the ultimate, which charges by fighting), a dodge roll and **Battle Sense**.
Heroes unlock as the story reaches them. Every unlocked hero can be taken on any
chapter.

| Hero | Parent | Melee | Ranged | Abilities (1 · 2 · 3) | Godly power | Unlocks |
| --- | --- | --- | --- | --- | --- | --- |
| **Percy** | Poseidon | Riptide sword combo | Water jet | Wave Surge (knock-back cone) · Healing Tide (heals and buffs anyone standing in water; makes a pool) · Riptide Throw (returns to his pocket) | **Hurricane**: a whirlpool storm that pulls in and batters everything | Start |
| **Annabeth** | Athena | Bronze dagger, fast, crits from behind | Thrown knife | Yankees Cap (invisible, enemies lose track; next hit from hiding crits) · Battle Plan (marks an enemy's weak point; the team does extra damage to it) · Daedalus Trap (a snare that roots) | **Wisdom's Gambit**: the battlefield freezes in a blueprint view; she marks every enemy and the team's hits all crit | Start |
| **Grover** | Satyr | Reed-pipe whack and hoof kick | Pipe song bolt | Tangle Vines (roots in an area) · Calming Song (heals allies, puts animals to sleep) · Maia! (winged sneakers: flies over gaps and enemies) | **Panic**: the voice of Pan sends every enemy running | Start |
| **Tyson** | Cyclops, Poseidon's son | Huge fists, slow and heavy | Thrown boulder | Ground Pound · Watch Shield (blocks everything in front, reflects arrows) · Forge Fire (immune to fire; upgrades the team's weapons for a while) | **Big Brother**: grows, cannot be stopped, throws enemies | Book 2 |
| **Clarisse** | Ares | Electric spear | Spear lightning (stuns) | Charge · War Cry (team damage up) · Boar Shield bash | **Ares's Fury**: a burning rampage | Chapter 3 (as an ally in capture the flag, then playable) |
| **Thalia** | Zeus | Spear | Lightning bolt | Aegis (the shield's face terrifies enemies) · Chain Lightning · Thunder Leap | **Storm of Zeus**: lightning strikes all around | Book 3 |
| **Nico** | Hades | Stygian iron sword | Shadow bolt | Shadow Travel (teleport) · Raise the Dead (skeleton allies) · Earth Rend (ground spikes) | **King of the Dead**: an army rises | Book 3 |

**Skill trees.** Each hero levels up a tree of three branches, each a
side of the hero from the books. The ranged move and the godly power are
fixed; the three ability slots are the player's choice from six powers: the
three the hero starts with and one new power learned in each branch.

| Hero | Branches | New powers (one per branch) |
| --- | --- | --- |
| **Percy** | Riptide · Tides · Son of the Sea | Disarming Strike (Luke's lunge: stuns, or opens a boss's guard) · Geyser (water bursts from the ground and throws monsters up) · Air Bubble (heroes near him take half damage) |
| **Annabeth** | Stealth · Strategy · Workshop | Flank (round the back of a monster: a critical stab) · Battle Orders (the team runs faster and gains Power) · Bronze Automaton (a Daedalus sentry that throws knives) |
| **Grover** | Wild · Reed Pipes · Satyr | Briar Burst (thorns all round push monsters off) · Lullaby (monsters near him fall asleep) · Tin-Can Snack (health and Power back) |
| **Tyson** | Fists · Cyclops Hide · Forge and Sea | Thunder Clap (a stunning shock wave) · Iron Skin (half damage, no knock-back, Power from hits) · Call Rainbow (the hippocampus tramples a line of monsters) |
| **Clarisse** | Spear · Ares · Cabin Five | Chain Lightning (leaps from monster to monster) · Battle Frenzy (harder melee that heals her) · Hold the Line (half damage, lightning zaps round her) |

- **Nodes:** a new power (rank 1 learns it for 2 points; later ranks improve
  it for 1), an upgrade (ranks that improve a power, the ranged move or the
  godly power) or a passive (melee damage, crits, health). Tier 2 needs 2
  points in its branch's tier 1, tier 3 (the godly power's upgrade) 5 in the
  tiers above; some nodes need another first (Fire Hose needs Pressure Jet).
- **Scarce points:** one a level, every hero alike, and a tree costs about 30,
  so a hero at the end of Book 1 has under half of it: you choose a side of
  the hero to grow, and which three powers to take.
- **Equip** on the same screen: three slot buttons, then the known powers.
  A power keeps its cooldown wherever it goes, and a power new to a slot
  takes over the slot's remaining cooldown.
- **Reset** is free but only in camp (Chiron), so building is never
  punished, yet the build you take into a chapter is the one you fight with.
- AI companions use their hero's loadout; online each screen owns its own
  players' trees, and nothing new travels.
- The rules are one pure module (`game/js/heroes/skillRules.js`) with tests;
  saves from the first tree (one flat list of ranks per hero) migrate with
  their ranks kept and today's three abilities equipped.

**Battle Sense.** Dodging the instant before a hit lands slows time for about
two seconds for the whole team, with a gold-edged screen and a heartbeat.
Demigods' reflexes are wired for battle. A meter stops it from being spammed,
and it can be turned off in settings.

**Switching.** Playing alone, you lead a party of up to three. **D-pad ↓** (or
**F**) cycles heroes, and holding it opens a radial to choose. The others
follow as AI companions using simple versions of their kits. With friends, each
player controls one hero and there are no AI companions.

## The Mist and True Sight

Like the Sift in Minecraft Dungeons 2, True Sight is a second version of the
world that runs alongside the first. It has its own look, its own dangers and
its own rewards.

- **The Mist (mortal view)** is the default. The world looks ordinary: a museum,
  a bus, a water park. Monsters are disguised as mortals: a maths teacher,
  three old ladies, a nice lady selling garden gnomes. Real mortals mill
  around among them. Nobody who looks like a person can be hurt: a swing or a
  shot passes through, and they flinch and tell the hero off ("Young man!"),
  then go back to their business; disguised monsters do the same, so they
  don't give themselves away (only a rare glint in the eyes is off). Under
  True Sight the disguised ones become creatures nothing like people
  (serpents, spiders, ghosts) and can be fought, and stay revealed; real
  mortals stay people, with a calm outline. A monster killed is gone for good:
  the "person" isn't there when you come back.
- **True Sight (right stick click on a controller, V on a keyboard)** rewrites the world
  outward from the hero in a ring, using the same radial material takeover as
  Cursed Dungeons' Domain Expansion. Surfaces turn gold-ornamental, and
  disguised monsters show their true form and attack. Hidden things appear:
  Greek-key doors, vase friezes that are paths, glowing drachmas, Ariadne's
  thread. Some things exist only in the Mist, such as the mortal bridge whose
  stones are real, or a guard who lets you past. So the view is switched, not
  just switched on.
- **The Sight meter** drains while True Sight is on and refills in the Mist.
  The Mist is **thick** in Book 1, which drains fast and re-forms quickly. It
  thins as the books go on, the way Percy gets better at seeing.
- **Rifts** are places where the Mist is torn, like the Sift's rifts: True
  Sight is free inside them and the strongest loot waits there. Some rifts
  come with a hazard. Underworld rifts drain health like the Sift's liquid, and
  Olympian rifts crackle with lightning.
- **Mortals** in the Mist (tourists, students, drivers) wander and panic. They
  can't be hurt. Fighting where mortals can see makes a "Mist report" in the
  chapter results, which is just for fun.
- **In co-op** the view is shared. Any player can switch it, and the meter is
  shared.

Book 1's chapters lean on the Mist the most. The first chapter is almost all
Mist: a field trip in which only Percy notices Mrs. Dodds is wrong. It
teaches True Sight by making it matter: the walk to her is calm; when you see
her, she lifts the Mist herself and tells you the button; then everyone in
disguise comes for you. With the Mist up they look like ordinary people going
about their business, can't be hurt, and their blows still land with no
attacker to be seen; under True Sight they are monsters you can fight. Players
who already know the trick can see through them before she shows herself and
thin the crowd early. She fights in her gallery, and at three thresholds of her
health she shrieks (a telegraphed paralysis of a second or two) and flies off
to another room of the museum to be found again.

## Prophecies

Each book begins with the Oracle (the mummy in the Big House attic) giving the
prophecy. It appears on a scroll as Greek letters. Each line rearranges into
English when the chapter that fulfils it is finished, and a line can be
re-read at any time from the pause menu. *The Lightning Thief*:

1. *You shall go west, and face the god who has turned* (The Bus)
2. *You shall find what was stolen, and see it safely returned* (The Underworld)
3. *You shall be betrayed by one who calls you a friend* (The Last Chapter)
4. *And you shall fail to save what matters most, in the end* (The Underworld)

## The opening

A new game doesn't start in camp. It tells the first chapters of the book in
order, then opens camp up:

1. **Prologue: Manhattan, the morning of the field trip.** A city corner
   (brownstones, Yancy Academy, taxis, a deli, hot-dog carts, a subway
   entrance, a park) laid out as a training board. You're late: a long walk
   (about 180 m) to the yellow school bus at the curb, in three beats: a quiet
   stretch to learn moving and jumping; sewer rats (weak, quick, golden dust
   when they fall: the Mist calls them "just rats") lounging round the trash,
   which notice you only up close and now and then dash at you (melee); and
   rats behind a construction fence, up on scaffolding and a dumpster lid, and
   out of the storm drains, where shooting first is the obvious move (ranged).
   Each control gets one hint as it is first needed. Reaching the bus ends it.
2. **Cutscene:** the bus drives up Central Park West to the American Museum of
   Natural History; the class gets out; Mrs. Dodds is watching.
3. **Chapter 1**, the museum.
4. **Cutscene:** summer at Montauk, Grover at the door in the storm, the drive
   to Long Island, the lightning.
5. **Chapter 2**, Half-Blood Hill and the Minotaur.
6. **Cutscene:** waking up on the lawn of the Big House; Annabeth; Chiron.
7. **Camp Half-Blood**, the open hub.

Cutscenes are shot in the engine on small sets. A (Enter, a click or a tap)
skips to the next shot, holding B (Esc) pauses, and holding A (Enter, the mouse
button, or the Skip all button on touch) skips the whole cutscene. The save keeps the step, so Continue resumes the prologue or the
cutscene. Settings can skip the opening.

**Guidance everywhere:** one line in the objective ribbon names the goal; a
gold arrow at the screen edge points to it when it is off screen, a beam marks
it, and in camp footprints on the ground lead along the walkable way (the
prologue has only the arrow and the beam). In camp the goal is the next
chapter's quest marker; in a chapter, the next thing to do (footprints on a
left-stick click).

**Roaming monsters:** as in Minecraft Dungeons, low-level monsters turn up as
you walk around: rats in the prologue; pups, bronze spiders, Stymphalian birds
and (on the far road) scorpions in the camp woods and along the Road West. The
woods are stocked for training, but nothing crosses into the cabins, the Big
House or the forge. Small packs, out of sight, capped, gone when far away, a
little tougher as the save goes on.

## Chapters

Chapters are chosen on the map in the Big House. Each book is a column of
chapters, and each chapter has a card from the concept art. A finished chapter
can be replayed at any difficulty, from **Mortal** to **Olympian**.

### Book 1: The Lightning Thief

| # | Chapter | Place | Mist | Goal and twist | Boss |
| --- | --- | --- | --- | --- | --- |
| 1 | **The Pre-Algebra Teacher** | The museum on a field trip | Very thick | Tutorial. A calm walk after Mrs. Dodds into the empty Greek gallery; when you see her the Mist lifts and she explains True Sight. Then the disguised crowd hunts you (unseen blows under the Mist), and she shrieks and flies off three times to rooms you must find her in. Mr. Brunner throws a pen. | Mrs. Dodds (Alecto) |
| 2 | **Half-Blood Hill** | Long Island in a storm | Thick | Get Mom and Grover up the hill to the pine tree. Lightning shows the way. | The Minotaur: make it charge into the tree and grab a horn |
| 3 | **Capture the Flag** | Camp woods and creek | Light | Team game with Annabeth invisible. The creek heals Percy and the trident sign appears. | A hellhound from the Underworld |
| 4 | **The Kindly Ones** | A Greyhound bus in New Jersey | Thick | Three old ladies on a bus. Escape before it crashes. | The three Furies |
| 5 | **Aunty Em's Garden Gnome Emporium** | A statue garden | Thick | Stealth: never look at her directly; use reflections. Free the satyr statues. | Medusa (seen only in mirrors) |
| 6 | **The Gateway Arch** | St. Louis, the top of the Arch | Medium | A tourist lady and her "Chihuahua". Climb, escape and leap into the Mississippi. | The Chimera and Echidna |
| 7 | **Waterland** | An abandoned water park in Denver | Medium | Ares sends you for his shield. The Tunnel of Love is a trap. | Hephaestus's spider swarm |
| 8 | **The Lotus Hotel and Casino** | Las Vegas | Thick | Every game is fun and the clock speeds up the longer you play. Escape with the green card before time runs out. | None: the trap is the boss |
| 9 | **Crusty's Water Bed Palace** | The Nevada desert | Medium | Trick the salesman onto his own bed. | Procrustes |
| 10 | **DOA Recording Studios** | Los Angeles and the Underworld | Light (rifts drain health) | Charon's ferry, Cerberus (play fetch with the red ball), the Fields of Asphodel, the pit of Tartarus calling. | Cerberus (calmed, not beaten); Hades's court |
| 11 | **The God of War** | Santa Monica beach | None | Duel Ares in the surf; the Furies watch. | Ares: strike his heel from the water |
| 12 | **The Six-Hundredth Floor** | The Empire State Building, Olympus, camp | None | Return the master bolt to Zeus. Back at camp, Luke's betrayal. | Luke and his giant scorpion |

### Later books

Each later book is a column of chapters on the map, locked until the book
before it is finished. Outline:

- **Book 2, The Sea of Monsters:** Laistrygonian dodgeball at Meriwether
  Prep; the *Princess Andromeda*; the CSS *Birmingham*; Scylla and Charybdis;
  C.C.'s Spa (Circe turns heroes into guinea pigs); the Sirens; Polyphemus's
  island and the Golden Fleece. Tyson joins.
- **Book 3, The Titan's Curse:** Westover Hall and the Manticore; the Hunters
  of Artemis; skeleton warriors; the Nemean Lion in the Air and Space Museum;
  the junkyard of the gods and Talos; the Hoover Dam; Mount Tamalpais, Atlas
  and Ladon. Thalia and Nico join.
- **Book 4, The Battle of the Labyrinth:** the Labyrinth, a maze that changes
  every visit; Kampê at Alcatraz; Geryon's ranch; Antaeus's arena; Daedalus's
  workshop; the battle for camp.
- **Book 5, The Last Olympian:** the *Princess Andromeda* again; the defence of
  Manhattan, bridge by bridge; Typhon; Kronos on Olympus.

## Monsters

Enemies are graded by tier like Cursed Dungeons' curse grades. Their stats
scale with the book and the difficulty, and each tier has a clear silhouette
and a tell before it attacks.

| Tier | Role | Book 1 | Later books |
| --- | --- | --- | --- |
| **Minor** | Swarms; die in two or three hits | Sewer rats (the prologue), hellhound pups (a puppy the way Mrs O'Leary is one: a head taller than Percy, half a grown hellhound), mechanical spiders, harpies (at camp, harmless), mortal-disguised minions | Stymphalian birds, telekhines, myrmekes (giant ants), skeleton warriors' dogs |
| **Elite** | A threat on their own; a tell and a counter | Hellhounds, Furies, dracaenae (snake-women with spears), Echidna's brood | Laistrygonian giants (dodgeballs of fire), skeleton warriors (regrow unless their bones are scattered), empousai (charm; True Sight breaks it), Cyclops thugs, earthborn |
| **Champion** | A mini-boss in a room | Mrs. Dodds, the three Furies, Procrustes | Scylla's heads, Ladon, the Manticore, Geryon's cattle |
| **Boss** | A chapter boss: phases, an arena, a myth riddle | The Minotaur, Medusa, the Chimera, Cerberus, Ares | Polyphemus, the Nemean Lion (hit only in the mouth), Talos (the plug on his heel), Kampê, Antaeus (lift him off the ground), Typhon, Kronos |

Each boss has a riddle that beats it faster than damage alone:

- **The Minotaur:** charge it into the pine tree.
- **Medusa:** you can only see her in a reflection.
- **The Chimera:** survive until the river.
- **Procrustes:** make him lie on his own bed.
- **Cerberus:** play fetch with the ball.
- **Ares:** hit his heel while standing in water.
- **The Nemean Lion:** hit it only inside its mouth.
- **Antaeus:** lift him off the ground, where he can't heal.

## Loot and items

The gear system follows Minecraft Dungeons. The items come from Percy Jackson
and Greek myth. The full list is in `game/js/loot.js`; its rules are tested in
`game/test/loot.test.mjs`.

- **Slots:** each hero has a weapon, an armour and two magic items (D-pad ← / →,
  or R / T). Gear is kept per hero, and companions can be equipped too.
- **Items:** 84 base items (`design/loot-design.md` has the full design).
  - 32 weapons (6 Common, 11 Rare, 15 Legendary). They differ in damage,
    speed, reach, swing width and knock-back, and some hit twice or pierce
    shields. Examples: the Labrys of Knossos, Backbiter, the Harpe of Perseus,
    the Club of Heracles, the Pelian Spear and the Horn of the Minotaur.
  - 24 armours (5 / 10 / 9). They differ in health, protection, speed,
    cooldowns, healing over time and the chance to dodge a hit. Examples: the
    Nemean Lion Pelt, the Armour of Achilles, the Golden Fleece Mantle and the
    Hellhound Hide.
  - 28 magic items (6 / 13 / 9), each with its own effect. Examples: Medusa's
    Head petrifies, the Lyre of Orpheus puts monsters to sleep, the Golden
    Apple of Discord turns monsters on each other, the Hourglass of Kronos
    slows time, the Bag of Winds hurls monsters away, the Shadow of the Helm
    hides the team, Ariadne's Thread shows the way, the Shield of Ares raises
    a dome that stops shots, and the Lotus Casino Card dazes every monster
    near you.
  - Items carry place tags (sea, fire, storm, underworld, wild, forge, hunt,
    war, mortal, lotus); in a place that lists a tag, its items drop three
    times as often.
- **Rarity** is rolled for each drop: Common (parchment), Rare (turquoise),
  Heroic (violet: a Common or Rare base raised a tier) and Legendary
  (orange). The tier gives the enchantment rows (1 / 2 / 2 / 3) and the boons,
  small rolled bonuses such as Keen (+4-8% melee damage) or Fleet (+3-6% move
  speed): 0 / 1 / 2 / 1. Legendary items carry a built-in enchantment. A
  Blessed item, a god's gift, adds an enchantment already at III and extra
  power.
- **Rarity odds** depend on the source (a monster, a chest, a rare chest or
  elite, a boss or epic chest, a quest, the store), the player's level (no
  Heroic or Legendary at level 1, more as you level) and the difficulty
  (+25% Heroic and Legendary a step). The store never sells Legendaries.
  The Fates' Thread: after 40 drops without a Legendary, the next drop from a
  rare chest, an elite, a champion, a boss or an epic chest is Legendary.
- **Power:** an item's power grows with the difficulty and your level. An item
  marked as a hero's favourite (★) gives that hero 10% more power.
- **Enchanting:** an item has one row of enchantments per rarity level. Each
  row offers two or three choices, and you put enchantment points into ONE of
  them, raising it to II and III. Powerful choices (✦) cost a point more per
  level. There are 33 enchantments, for example:
  - Celestial Edge
  - Zeus's Spark, which calls down lightning on a hit
  - Echo, a chance to strike twice
  - Monster Bane
  - Greek Fire, which makes defeated monsters explode
  - Demeter's Briars, which hurt monsters that hit you
  - Hephaestus's Embers
  - Tyche's Luck, more drachmas
  - Nimble as a Satyr, a chance to dodge a hit
  - Chimera Venom, which poisons and slows
  - Hermes's Haul (monsters drop items more often) and Tyche's Favour
    (drops are sometimes a rarity better)

  Points come from levelling up. Salvaging an item refunds every point spent,
  plus drachmas (Common 8, Rare 18, Heroic 30, Legendary 45, more for power
  and Blessed items).
- **The forge** (camp): temper an item for a quarter of a gear level, up to a
  cap that rises with your level; reforge it straight up to what drops now;
  and re-roll the choices of a row you haven't invested in. All cost
  drachmas, more for rarer items. Gear more than a gear level behind is
  marked outdated (an amber dot on its slot and on the HUD bag).
- **The camp store** sells a rotating set of items, tilted toward your hero's
  favourites, and never a Legendary.
- **Drops are per player.** Every human hero near a kill or a chest gets their
  own: a minor monster drops an item 2% of the time (swarm fodder 0.4%), an
  elite-tier kind 8%, an affixed elite 25%, a champion kind 60%, an
  open-world champion one and often two. A chest drops one (a rare chest one
  and often two, an epic chest two). A boss drops one to four (2.5 on
  average) and, the first time you beat it at a difficulty, its **signature
  Legendary** (12 chapters, 12 signatures: Fury's Flaming Lash, the Horn of
  the Minotaur, Hellhound Hide, the Wings of the Kindly Ones, Medusa's Head,
  the Chimera Fang Spear, the Shield of Ares, the Lotus Casino Card,
  Procrustes's Cleaver, Cerberus's Red Ball, the Burning Sword of Ares and
  Backbiter). The chest by the exit holds the chapter reward: one item and 20
  drachmas a level. About 12-13 items a chapter in all.
- **On the ground**, an item pops out in an arc and lands under a beam of its
  rarity colour, taller and brighter for rarer items (a Legendary's falls
  slowly and lands with a shockwave), with a ring in its owner's player
  colour; only that player can pick it up, and it flies to them from 2.6 m.
  A Legendary off screen gets an arrow at the edge of the screen; Heroic and
  Legendary drops show on the minimap. Each rarity has its own landing and
  pickup sound. After switching heroes, your drops follow you. Online, each
  browser rolls and keeps its own loot.
- **Picking an item up** shows a card that compares it with what that hero has
  equipped (▲ / ▼): one line for a Common (three in a row merge), the full
  card for a Rare, its boons for a Heroic, and a large card with a LEGENDARY
  ribbon for a Legendary. New items are marked NEW in the inventory, and the
  HUD bag counts them.
- **Golden drachmas** are the currency, shared by the players on one screen.
  Minor monsters pay only now and then; chests, bosses and broken pots,
  crates and barrels pay most. A payout of five or more drops as stacks
  worth five. Spend them in the store and at the forge.
- **Ambrosia** (a square) and **nectar** (a cup) heal.

## Camp Half-Blood (the home base)

Camp replaces Jujutsu High. Walk to a place and press **A** to use it.

- **The Big House porch:** the chapter map. Chiron gives hints and Mr. D
  plays pinochle.
- **The Oracle's attic:** read the prophecies.
- **The cabins:** visit a parent's cabin to choose a hero and their
  appearance.
- **The forge:** upgrade and enchant gear.
- **The camp store:** spend drachmas.
- **Minigames,** each a short arcade round with a high score and a camp medal:
  - **Archery range:** moving targets, wind, and Apollo's kids to beat.
  - **The climbing wall:** climb while it shakes and pours lava.
  - **Chariot race:** a lap of the track, three teams, bronze birds.
  - **Canoe race:** across the lake, with naiads helping or splashing.
  - **Sing-along at the campfire:** a rhythm game; the fire grows with the
    singing.
  - **Capture the flag:** cabins against cabins in the woods. Played locally
    against AI, or online.
  - **Pegasus flight:** fly a lap through rings above the camp.

The first build includes archery and the climbing wall. The others follow.

## Multiplayer

- **Local co-op:** up to four players on one screen and one shared camera.
  Press **Start** on a controller to join. It comes from Cursed Dungeons, along
  with reviving downed teammates and respawning together.
- **Online:** through `multiplayer/` (`MULTIPLAYER.md`). The host owns the
  chapter, the enemies and the loot. Each guest publishes their own hero's
  state, and attacks and pickups are topics. Up to four heroes in total, mixing
  local and online players. Capture the flag online is cabin against cabin.
- One hero per player. In single-player, switching swaps the hero you control.

## Controls

Xbox controller first, and the whole game can be played with one. The layout
follows Minecraft Dungeons II's defaults.

| Action | Controller | Keyboard and mouse |
| --- | --- | --- |
| Move | Left stick | WASD (or the arrow keys) |
| Show the way to the goal | Click the left stick | Middle click |
| Aim | Auto-aim (Settings → Controller right stick → Aim to aim with it) | Mouse |
| Dodge (Battle Sense on a perfect dodge) | B (forward), or flick the right stick (that way) | R or Mouse 4 (toward the cursor), Mouse 5 (forward) |
| Melee · ranged | X · RT | Left click · right click |
| Attack in place (stand still, face the cursor) | — | Hold Shift |
| Jump slam | X in the air after a jump | Q |
| Jump | A | Space |
| Interact | A (when a prompt shows) | Left click (when a prompt shows) |
| Abilities 1 · 2 · 3 | Y · LB · RB | 1 · 2 · 3 |
| Godly power | Y + LB together | 4, or 1 + 2 together |
| Ambrosia (heal) | LT | E |
| True Sight | Click the right stick | V |
| Inventory | D-pad ↑ | I or Tab |
| Switch hero | D-pad ↓ | F |
| Magic items | D-pad ← · → | Z · X |
| Map (in camp: the chapter map) | View | M (chapter map: J) |
| Pause | Menu | Esc |
| Turn the camera (if on in Settings) | — | [ · ] |
| Hero select: change profile · play online | X · Y | Click the profile · Play online |

The title screen, instructions (with an Xbox controller diagram), settings and
pause menu follow `GAME_GUIDELINES.md`.

## Build order

1. **Requests:** round 2 in [image-requests.md](image-requests.md). The 3D hero
   sheets come first so the models can be built from them.
2. **Engine port:** Cursed Dungeons copied into `game/`, running under this
   repository's shell: title screen, Press Start, Instructions, Settings and
   Fullscreen.
3. **Heroes:** Percy, Annabeth and Grover with switching and Battle Sense,
   then Tyson and Clarisse.
4. **The Mist:** True Sight, the meter, disguised monsters, hidden paths and
   rifts.
5. **Camp:** the hub, the chapter map, the Oracle and two minigames.
6. **Book 1:** chapters 1 and 2 first, then the rest.
7. **Online play.**
8. **Later books.**
