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
- **Text:** writing first appears as Greek letters, then rearranges itself into
  English. This is how a demigod reads: their brains are wired for ancient
  Greek. It applies to signs, objectives, the prophecy and story cards. A
  setting makes it instant.

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

**Battle Sense.** Dodging the instant before a hit lands slows time for about
two seconds for the whole team, with a gold-edged screen and a heartbeat.
Demigods' reflexes are wired for battle. A meter stops it from being spammed,
and it can be turned off in settings.

**Switching.** Playing alone, you lead a party of up to three. **D-pad ↓** (or
**Tab**) cycles heroes, and holding it opens a radial to choose. The others
follow as AI companions using simple versions of their kits. With friends, each
player controls one hero and there are no AI companions.

## The Mist and True Sight

Like the Sift in Minecraft Dungeons 2, True Sight is a second version of the
world that runs alongside the first. It has its own look, its own dangers and
its own rewards.

- **The Mist (mortal view)** is the default. The world looks ordinary: a museum,
  a bus, a water park. Monsters are disguised as mortals: a maths teacher,
  three old ladies, a nice lady selling garden gnomes. Disguised monsters can't
  be hurt and don't attack until revealed, but something is always slightly
  off about them.
- **True Sight (LT on a controller, V on a keyboard)** rewrites the world
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
Mist: a field trip in which only Percy notices Mrs. Dodds is wrong.

## Prophecies

Each book begins with the Oracle (the mummy in the Big House attic) giving the
prophecy. It appears on a scroll as Greek letters. Each line rearranges into
English when the chapter that fulfils it is finished, and a line can be
re-read at any time from the pause menu. *The Lightning Thief*:

1. *You shall go west, and face the god who has turned* (The Bus)
2. *You shall find what was stolen, and see it safely returned* (The Underworld)
3. *You shall be betrayed by one who calls you a friend* (The Last Chapter)
4. *And you shall fail to save what matters most, in the end* (The Underworld)

## Chapters

Chapters are chosen on the map in the Big House. Each book is a column of
chapters, and each chapter has a card from the concept art. A finished chapter
can be replayed at any difficulty, from **Mortal** to **Olympian**.

### Book 1: The Lightning Thief

| # | Chapter | Place | Mist | Goal and twist | Boss |
| --- | --- | --- | --- | --- | --- |
| 1 | **The Pre-Algebra Teacher** | The museum on a field trip | Very thick | Tutorial. Follow Mrs. Dodds into the empty Greek gallery. True Sight reveals the Fury; Mr. Brunner throws a pen. | Mrs. Dodds (Alecto) |
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
| 12 | **The Six-Hundredth Floor** | The Empire State Building, Olympus, camp | None | Return the master bolt to Zeus. Back at camp, Luke's betrayal. | The pit scorpion |

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
| **Minor** | Swarms; die in two or three hits | Hellhound pups, mechanical spiders, harpies (at camp, harmless), mortal-disguised minions | Stymphalian birds, telekhines, myrmekes (giant ants), skeleton warriors' dogs |
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

- **Golden drachmas** are the currency. Spend them at the camp store, or send
  an **Iris message** (throw a coin into a rainbow) to ask Chiron for a hint or
  call a friend's hero as a one-time ally.
- **Ambrosia** (a square) and **nectar** (a cup) heal. They replace
  Reverse Cursed Technique and the healing potion.
- **Weapons** (celestial bronze, then Imperial gold and Stygian iron) and
  **armour** (camp armour, a Hunter's silver cloak), in three rarities.
- **Magic items** go in the artefact slots: Hermes's winged shoes, the Bag of
  Winds, the Pearls of Poseidon (escape), the Helm of Darkness (brief
  invisibility for the team), Ariadne's thread (shows the way), Hephaestus's
  net, the Golden Fleece (heals in an area), Daedalus's laptop.

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

Xbox controller first, and the whole game can be played with one.

| Action | Controller | Keyboard and mouse |
| --- | --- | --- |
| Move | Left stick | WASD |
| Aim | Right stick (auto-aim when idle) | Mouse |
| Melee | A | Left click |
| Ranged | RT | Right click |
| Dodge (Battle Sense on a perfect dodge) | B | Space |
| Abilities 1 · 2 · 3 | LB · RB · Y | 1 · 2 · 3 |
| Godly power | LB + RB together | F |
| True Sight | LT | V |
| Interact | X | E |
| Ambrosia (heal) | D-pad ↑ | Q |
| Switch hero (hold for radial) | D-pad ↓ | Tab |
| Magic items | D-pad ← · → | R · T |
| Map | View | M |
| Pause | Menu | Esc |

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
