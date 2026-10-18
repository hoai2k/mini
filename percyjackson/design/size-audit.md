# Half-Blood Quests: creature size audit, October 2026

Every model the workbench lists (heroes, camp NPCs, monsters, bosses,
champions, mortal disguises and open-world people), measured against Percy and
compared with Rick Riordan's books, Greek myth and the game's own design
documents. Round 2 adds the size descriptions the books give and the owner's
decisions.

## The basilisk in the books

Riordan's basilisks are **small**. They are "little green snakes" with an
expandable collar of white spikes around the neck, pale yellow eyes, fiery
breath and a poisonous touch, and they are "as long as a man's arm", about
60–70 cm.

- **Where they appear:**
  - In *The Son of Neptune*, the giant Polybotes shakes three out of his hair
    outside Iris's shop, R.O.F.L. Frank fights them and Iris remarks that
    "Weasels are deadly to basilisks". The chapter is in Frank's part of the
    book, at about 48% of the ebook; its number is unverified.
  - They come back at the battle of Camp Jupiter, in *The Blood of Olympus*
    (under the sea, against Percy and Jason) and in *The Sun and the Star*.
- **Sources:**
  - The Riordan Wiki's Basilisk page (infobox height: "Long as a man's arm")
    and a reader's quoted highlights.
  - Myth agrees: Pliny (*Natural History* 8.33) gives "not more than twelve
    fingers long".
- **In the game (round 3, the owner's decision): book size.**
  - Re-sculpted as a snake on the Mist Serpent's slithering spine
    (`serpent.js` `SerpentRig`, imported, not changed), at the heroes' voxel
    size.
  - It is 1.5 blocks long and 0.64 tall when rearing (0.29× Percy). That is
    about twice a man's arm in length, so a trio still reads at the game
    camera's distance.
  - It has a white spiked collar (it flares as the snake rears), a small white
    crown, glowing pale yellow eyes, an ember-hot mouth and a tongue of flame.
  - Its role, stats and placement are under "Round 3" below.
  - Rounds 1–2 had made the old lizard 1.35× bigger (1.24× Percy); that is
    gone.

## Summary: the worst mismatches, and what happened to them

| Creature | Before | Books / design | Now |
|---|---|---|---|
| Basilisk | 0.91× Percy (a lizard) | books: arm-long snake | a 1.5-block snake, 0.29× tall; fast fodder in threes on Othrys (round 3) |
| King crab | 1.26× | *The Last Olympian*: Karkinos "rose ten feet"; request: "TWICE Percy's height" | 1.88× |
| Skeleton warrior | 0.77× | soldiers, "the size of a grown man" | 0.89× |
| Karpos | 1.01× | *The Son of Neptune*: "the size of toddlers" | 0.71× (×0.7) |
| Myrmex | 0.87× tall, 2.9 long | "the size of a full grown German Shepherd" | 0.57× incl. antennae, 1.9 long (×0.65) |
| Harpy / Restless Spirit | 0.68× / 0.77× | bird-women / people as they were in life | 0.81× / 0.92× (×1.2) |
| Bronze Warden | 1.16× | request: "a giant bronze automaton" | 1.87× (×1.6) |
| Cerberus | 1.98× | *The Lightning Thief* ch. 18†: "twice the size of a woolly mammoth" | 2.9–3.2× after the other agent's rebuild; recommended 7.5 blocks (below) |
| Telekhine | 0.46× | *Battle of the Labyrinth*: adults "at least seven feet tall" | 1.18× (×2.6, round 3) |

**Kept as they are, by the owner** ("approximate, slightly cartoony
exaggerations"):
- Tyson: 1.50×, where the Riordan Wiki infobox gives 6 ft 0 in.
- Medusa: 1.96×, a "tall woman".
- The hellhounds: 2.1–2.8×, where a plain hellhound is "the size of a rhino".

## How this was measured

- **Units.** Percy (`buildHeroModel('percy')`) is **2.19 blocks** tall at rest.
  Adult mortals are the same height, so the game treats him as an adult-sized
  hero, about 1.75 m. One block is about 0.8 m, and "× Percy" is height
  divided by 2.19. A book's "7 ft" (2.13 m) is about 1.2× Percy.
- **Rendered size.** Each workbench item's `build()` is posed at rest
  (`animate` with `dt 0`). The axis-aligned box covers its visible meshes;
  glow and additive effects are skipped. Height is the box's Y extent;
  "longest side" is the larger of its X and Z.
- **Stat size.**
  - `height` and `radius` come from `MONSTERS` (`monsters.js`, which includes
    `FODDER_MONSTERS` from `fodder.js`) and from `BOSS_DEFS` (`bosses.js`).
  - For champions they are `def.height × (look.size ?? look.scale)` and
    `def.radius × min(1.5, k)` (`champions.js` `applyChampionLook`).
  - Stat `height` matters in game:
    - it is the collision box for walls and ceilings (`physics.js`);
    - status markers over the head use it: stun stars, the fear glow
      (`enemy.js`, `heroes/grover.js`), and a disguised enemy's speech bubble
      at `height + 0.5` (`ui/hud.js`);
    - **correction:** rounds 1 and 2 called this "the health bar". The game
      draws no bar over ordinary monsters; a boss's or a champion's health
      bar is on the HUD (`hud.setBoss`). Where those rounds say "bar", read
      "the hit band and the markers over the head".
    - projectiles hit between −0.3 and `height + 0.3`;
    - shots leave from `height × 0.8`.
  - Raising it can block a creature under a low ceiling, so it was only
    raised for creatures that meet no low ceilings, and never above a hero's
    1.8 in places heroes walk.
- **Tools.**
  - The scripts are in the session scratchpad (`sz/measure.cjs`,
    `sz/lineup.cjs`, `sz/table2.cjs`, `sz/sheet.py`).
  - They run in headless Chromium against `workbench/?lazy=1` and use
    `window.__wb.items`.
  - The lineup renders each model with Percy beside it, with a level
    orthographic camera at 34 px per block and grid lines every block.
- **Game readability.**
  - Minecraft Dungeons makes fodder smaller than its threats and bosses 2–4×
    the hero.
  - The concept sheets go further: bosses at 4–5× Percy, giants at 3–4×.
  - Within that, a creature counts as OK when it is near both canon and its
    own request.
- **Book sources.**
  - Quotes come from the Riordan Wiki (riordan.fandom.com, read through its
    API). It quotes or paraphrases the books; its infobox heights are
    sometimes the editors' own estimates. Those are marked "Riordan Wiki".
  - Cerberus's line is also a reader's quoted highlight from the ebook.
  - A chapter number marked † is the scene's place in the book's chapter
    plan, not checked against the text, so treat it as unverified. The
    quotes themselves are checked against the Riordan Wiki.
  - Cerberus's quote sits at 78% of the ebook, which matches ch. 18.
  - Where no chapter is given, only the book is known.

## What the books say

| Creature | The books (series, book, chapter where known) | × Percy |
|---|---|---|
| Basilisk | *The Son of Neptune*, *The Blood of Olympus*, *The Sun and the Star*: "little green snakes" with a collar of white spikes, "as long as a man's arm" | ~0.1 tall |
| Hellhound | *The Lightning Thief* ch. 8† (Capture the Flag): "the size of a rhino". Wiki: from grizzly-bear or rhino size up to garbage-truck size | ~1.0–1.3 at the shoulder |
| Mrs O'Leary | *The Battle of the Labyrinth*: "bigger than a tank", about "the size of a garbage truck" | ~1.8–2 |
| Cerberus | *The Lightning Thief* ch. 18†: "twice the size of a woolly mammoth, mostly invisible, and had three heads". Mrs O'Leary is a "petite puppy" beside him (Wiki) | ~3.5–4+ |
| Minotaur | *The Lightning Thief* (Montauk, ch. 4†): "seven feet tall". *The Last Olympian*: after reforming he "seemed to have grown three more feet" | ~1.2 / ~1.75 |
| Chimera | *The Lightning Thief* ch. 12† (the Arch): grows from Echidna's Chihuahua; "a ten-foot-long diamondback" snake tail. *Greek Heroes*: Bellerophon's Chimera was "about the size of a woolly mammoth" | ~1.5–2+ |
| Echidna | Wiki infobox: 6 ft 4 in | ~1.1 |
| Polyphemus | *The Sea of Monsters*: "so huge he couldn't even fit into the room", "made Tyson look vertically challenged", hands "as big as Percy's entire body" (Wiki estimate: 15 ft) | ~2.6 |
| Tyson | Wiki infobox: 6 ft 0 in; a "baby" Cyclops in *The Sea of Monsters*; a Cyclops can grow to 30 ft at will | ~1.05 |
| Laistrygonians | *The Sea of Monsters* ch. 1†. *The Ultimate Guide*: "eight-foot-tall cannibalistic giants with heavily tattooed arms" | ~1.4 |
| Empousai | *The Battle of the Labyrinth*: Kelli, a cheerleader; women with one bronze and one donkey leg | ~1.0 |
| Harpies | *The Sea of Monsters*: the camp's cleaning harpies, "crossbred with the dodo birds". *The Son of Neptune*: Ella, small and skinny. No height given | ~0.8–1.0 |
| Stymphalian birds | *The Sea of Monsters* (chariot race): "monstrous pigeon-like birds"; no size found | small |
| Karpoi | *The Son of Neptune*: "the size of toddlers, with rolls of baby fat", corn-husk wings. *The Hidden Oracle*: Peaches, a "Demon Diaper Baby" | ~0.5 |
| Myrmekes | *The Demigod Files* ("The Bronze Dragon"), *The Hidden Oracle*: "the size of a full grown German Shepherd" | ~0.35 tall, ~0.6 long |
| Telekhines | *The Battle of the Labyrinth* (Mount St. Helens): a Doberman, a human child and a sea lion blended; adults "at least seven feet tall" (Wiki) | ~1.2+ adults |
| Dracaenae | Women with twin snake trunks for legs; no height given | ~1.0 |
| Spartoi / skeleton warriors | *The Titan's Curse*: pass as soldiers, police and guards | ~1.0 |
| Furies (Alecto) | *The Lightning Thief* ch. 1†: Mrs Dodds, a "little" fifty-year-old woman who grows leathery bat wings | ~0.9 + wings |
| Medusa | *The Lightning Thief* ch. 11†: "Aunty Em", a woman in a black gown and veil. *Greek Gods*: "a tall woman" | ~1.0–1.1 |
| Procrustes | *The Lightning Thief* ch. 17†: "seven feet tall", hairless, grey and leathery | ~1.2 |
| Earthborn (Gegeines) | *The Lost Hero*, *The Son of Neptune*: six-armed clay giants, "7 to 8 feet tall" | ~1.3–1.4 |
| Colchis bulls | *The Sea of Monsters*: bronze bulls "the size of elephants" (the calves are the game's own) | ~1.8 (adults) |
| Pit scorpion | *The Lightning Thief* ch. 22†: "about the size of my hand". *The Battle of the Labyrinth*: Daedalus's giant scorpions from the Triple G Ranch, no size given | tiny |
| Karkinos (giant crab) | *The Last Olympian*: "The monster rose ten feet out of the water... its pincers longer than my body" | ~1.75 |
| Keres | *The Last Olympian*: part women, part bats | ~1.0 |
| Ghosts | "Physically identical to when they were alive" (Wiki) | ~1.0 |
| Charon | Tall (Wiki infobox) | ~1.1 |
| Ares | *The Lightning Thief* ch. 10†: "a huge, muscular man"; his motorbike is "the size of a baby elephant" | ~1.2–1.4 |
| Argus | Wiki infobox: almost 7 ft | ~1.2 |
| Chiron | "Taller than an average man" (as a centaur) | ~1.4 |
| Grover | Wiki infobox: 5 ft 9 in, "a tall satyr" | ~1.0 |
| Antaeus, Nemean Lion (not in the game) | *The Battle of the Labyrinth*: Antaeus "15 feet tall". *The Titan's Curse*: the Nemean Lion "the size of a pick-up truck" | — |

## What changed

### Round 1

| id | file | change | height before → after | stat height / radius |
|---|---|---|---|---|
| basilisk | `entities/fodder.js` `buildBasilisk` | `QuadRig` scale 2.15 → 2.9 (×1.35). Kit `density: BUILD.k * 1.35`, so its cells stay the same size | 1.99 → 2.72 (0.91 → 1.24×), 3.8 → 5.2 long | 1.1 → 1.5 / 0.5 → 0.65 |
| king_crab | `entities/fodder.js` `buildKingCrab` | `QuadRig` scale 3 → 4.5 (×1.5). Kit density `voxDensity(rig) / 1.25` | 2.77 → 4.11 (1.26 → 1.88×) | 2.4 → 3.6 / 1.5 → 1.8 |
| skeleton | `entities/monsters.js` `buildSkeleton` | `Rig` scale 1.0 → 1.15. Also grows the Pale King (2.76 → 3.19) and the Road West skeleton champion (2.52 → 2.92) | 1.68 → 1.94 (0.77 → 0.89×) | unchanged |
| laistrygonian | `entities/fodder.js` stat table | stat height only | unchanged (4.96) | 3.6 → 4.4 |

### Round 2: the owner's decisions

| id | file | change | height before → after (× Percy) | stat height |
|---|---|---|---|---|
| harpy | `monsters.js` `MODELS.harpy` | `eagle` scale 1.0 → 1.2. Also grows the Road West harpy champion (2.52 → 3.04) | 1.46 → 1.78 (0.68 → 0.81×) | unchanged (2) |
| ghost (Restless Spirit) | `monsters.js` `buildGhost` | `Rig` scale 1.0 → 1.2 | 1.68 → 2.02 (0.77 → 0.92×) | unchanged (2) |
| karpos, karpos_slinger | `fodder.js` `buildKarpos` | `Rig` scale 1.05 → 0.74 (×0.7). The books' "toddler" points smaller than the ×0.8 asked; ×0.7 keeps the wheat spray at a hero's chest so a swarm still reads | 2.22 → 1.57 (1.01 → 0.71×) | unchanged (1.25): the bar now sits just above the spray |
| myrmex, myrmex_spitter | `fodder.js` `buildMyrmex` | `QuadRig` scale 1.75 → 1.14 (×0.65). The books' German Shepherd points smaller than the ×0.8 asked | 1.90 → 1.24 incl. antennae (0.87 → 0.57×); 2.9 → 1.9 long | unchanged (0.9 / 1): the body is now about that tall |
| lab_bronze_warden | `champions.js` `CHAMPION_LOOKS` | `scale` 1 → 1.6 (`size` kept at 2.4, so its attacks and hit box are unchanged). Its hall in the Labyrinth heart is an open 15-block ring with no roof, so it fits | 2.54 → 4.08 (1.16 → 1.87×) | unchanged |
| procrustes | `bosses.js` | stat height | model 3.60 | 4.4 → 3.8 |
| minotaur | `bosses.js` | stat height (the arena, `storm_hill`, is open) | model 4.30 | 3.4 → 4 |
| boarlet | `fodder.js` stat table | stat height (it roams the open fields, woods and Road West) | model 2.23 | 1.4 → 1.9 |
| daedalus_drone | `fodder.js` stat table | stat height, at a hero's 1.8 | model 2.17 incl. wings | 1.4 → 1.8 |

The hellhounds, Cerberus's builder, the Mist Serpent, the Earthborn, Luke,
`enemy.js`, `projectiles.js`, `rangedRules.js` and every attack field are
untouched.

**Checks after round 2:**
- `node --test test/*.test.mjs`: 189 of 189 pass.
- `perf/weapons.cjs`: 23 weapons, 0 failing.
- `perf/animlint.cjs --all`: 103 models, 0 problems.
- `perf/smoke.cjs`: 0 page errors.

### Round 3: the owner's decisions

**Basilisk: book size, a new role and a new home.**

- **Model** (`fodder.js` `buildBasilisk`):
  - Rebuilt on `SerpentRig` (`serpent.js`, imported and not changed), so it
    slithers, rears, strikes and recoils like the Mist Serpent. It is
    `scale 0.5`, under half the Mist Serpent's 1.18, with kit density
    `voxDensity(rig)` (one cell is a hero cube).
  - The look: chunky green segments over a pale belly; a collar of white
    spikes with glowing tips on the two hood groups, which flares in the
    wind-up; a small three-spike white crown; glowing pale yellow eyes; an
    ember-orange mouth; and a forked tongue of flame that the rig flicks.
  - Size: **1.52 blocks long, 0.64 tall** when rearing (0.29× Percy). That is
    about twice the books' arm length, so a trio reads at the game camera's
    distance (fov 35, pitch 50°, 26 blocks).
- **Fire:** `behave()` throws sparks at its lips while it rears, then a short
  cone of fire from the mouth as it strikes (the same particles as the Colchis
  calf's jet).
- **Role:** small, fast, close-range fodder in threes, as in the books
  (Polybotes shakes three out of his hair).
  - It no longer shoots: no projectile, so `rangedRules.js` and the
    multi-shot gate don't apply.
  - Its attack is a `moves` sting, the scorpion's telegraphed strike at a
    marked spot: a fire puff 1.1 blocks ahead, 0.8 across, with the poison
    touch.

| stat | before | after |
|---|---|---|
| role / ai | ranged / `ranged` (acid shots, range 8, keep 5) | rusher / `melee` with `moves: [{ kind: 'sting', trigger 1.9, at 1.1, radius 0.8, windup 0.5, recover 0.5, dmg 1 }]` |
| hp / speed / dmg | 16 / 5.6 / 5 | 14 / 6 (faster than a hellhound pup's 5) / 5 |
| windup / cd / range | 0.75 / 3 / 8 | 0.5 / 1.6 / 1.6 |
| radius / height | 0.65 / 1.5 | 0.35 / 0.6 |
| poison | 2 dps for 3 s | unchanged, now on the fire puff |
| horde (`roamZones.js` `HORDE`) | 3–5 | exactly 3 |
| colour | — | `slashColor` fire orange; no aura (fodder carries none) |

**The open world's fodder mix, before and after.** Only the canyon and
Othrys changed:

| region (`owLayout.js`) | before | after |
|---|---|---|
| Red Canyon (5–7) | myrmex 3.5 (swarm melee), **basilisk 2.5 (small ranged)**, spartoi 2 (melee), Stymphalian 1 (flier, ranged), scorpion 0.4 (elite bruiser), Earthborn 0.9 (elite lobber) | myrmex 3.5, **myrmex spitter 2 (small lobber: the desert ants of Herodotus keep the canyon a small ranged kind)**, spartoi 2, Stymphalian 1, scorpion 0.4, Earthborn 0.9 |
| Mount Othrys (8–10) | spartoi 4 (melee), telekhine 2.5 (lobber), harpy 2 (flier, ranged), Laistrygonian 0.8 (elite lobber). No small or fast kind | spartoi 3.5, **basilisk 2.5 (small, fast, fire puff, in threes, under the giants)**, telekhine 2.5 (now a big lobber), harpy 2, Laistrygonian 0.8 |

- **Each region's mix now:**
  - Fields: small melee, small ranged, fast rats, a big charger.
  - Woods: small melee, small lobber, pups, a big charger.
  - Shore: small melee crabs, a big lobber (the telekhine), a ranged flier,
    the king crab tank.
  - Canyon: small melee, small lobber, melee, a ranged flier, two elites.
  - Labyrinth: melee, fast small spiders, a ranged drone, exploders.
  - Othrys: melee, small fast basilisks, a big lobber, a ranged flier, an
    elite giant.
  - Asphodel: slow melee, fast fliers, melee, ranged ghosts.
- **Shares:** fodder is 77% in the canyon and 75% on Othrys; elites are 13%
  and 7%. The tests want fodder at 68–84% and elites at 14% or less.
- **The Road West keeps its basilisks** at Aunty Em's (1.5) and Las Vegas
  (2.5). Both stretches keep a ranged kind: the karpos slinger at Aunty Em's,
  and the harpy, empousa and Laistrygonian at Las Vegas.
- **Tests updated** for the new role:
  - `test/fodder.test.mjs`: the basilisk is melee with a sting move, poisons,
    stands no taller than 0.8, is faster than a pup and comes in threes. The
    canyon and Othrys rosters are updated.
  - `test/ranged.test.mjs`: 11 shooters, since the basilisk no longer shoots.

**Telekhines at book size.**
- `monsters.js` `buildTelekhine`: `QuadRig` scale 1.1 → 2.85 (×2.6), kit
  density `BUILD.k * 1.8` (cells 1.45× a hero's, holding its triangles).
- It goes from 0.99 to **2.60 blocks tall (1.18× Percy)** and is 3.9 long.
- Stat height / radius: 1.3 / 0.55 → 2.3 / 0.9.
- **Where it spawns:**
  - Chapter levels: the Arch, Waterland, the beach and Olympus (`levelgen.js`
    tables). Room doors there are 5 wide and 4 tall (`rooms.js`); the
    smallest, the barn's, are 3 × 3. A 2.3-tall body 1.8 across fits all of
    them.
  - The shore and Othrys in the open world, in packs of 2–3.
- Its attack fields are unchanged.

**"Pit Scorpion" is now "Giant Scorpion"** wherever players see it:
- the monster's name (`text_config.js` `monsters.scorpion.name`, which also
  names the Road West champion of that kind in the workbench);
- Luke's fight: "Luke, and his giant scorpion", "The giant scorpion",
  "watch for the giant scorpion he brought", "Luke summons a giant scorpion!";
- the workbench descriptions of `scorpion` and `kind:scorpion`;
- chapter 12's boss in `game-design.md`.

The internal ids (`scorpion`, `pit_scorpion`) and code comments stay.
`build_requests.py` doesn't name it, so the request documents were not
regenerated.

**The Bronze Warden: hit height apart from attack size, for every champion.**
- **The problem:** a champion's `size` set both its hit height
  (`def.height × size`) and its attack scale, because `enemy.js` `sizeK` was
  `height / def.height`. The Warden spawns as a `dracaena` (2.6 tall) with
  size 2.4, so its hit band reached 6.24, 2.2 blocks above its 4.08 model.
- **The fix:**
  - `champions.js` `applyChampionLook` keeps the attack scale in `e.attackK`
    (the look's size, as before) and sets `e.height` to the model's own
    measured height. `modelTop` takes the visible solid meshes over the feet,
    leaving out glows and hidden parts.
  - `enemy.js` gets one line: `get sizeK()` returns `this.attackK ?? height /
    def.height`.
  - So every champion's attacks reach exactly as before, while its hit band,
    collision height and overhead markers follow its model.
- **Measured at spawn:**

  | champion | hit height before | after | attackK |
  |---|---|---|---|
  | Bronze Warden | 6.24 | **4.05** | 2.4 |
  | Bronzebeak | 3.57 | 2.55 | 2.1 |
  | Queen Gale | 3.70 | 2.94 | 1.85 |
  | Red King | 3.12 | 2.29 | 2.4 |
  | Shadowfang | 6.50 | 6.29 | 1.3 |
  | Gorgos | 4.70 | 4.81 | 1.12 |
  | Pale King | 2.90 | 3.17 | 1.45 |

- **Where they stand:** every champion's spot is open ground or an open ring
  (the Warden's hall is 15 blocks across with no roof).
- **The health bar:** a champion's is the HUD boss bar (`hud.setBoss`), so it
  has no height in the world.

The other agents' work is untouched: `bigHound` / `HELLHOUND`, Cerberus in
`bossmodels.js` and `bosses.js`, the Mist Serpent's code, the Earthborn and
Luke. The Laistrygonian is kept as it is.

**Checks after round 3:**
- `node --test test/*.test.mjs`: 189 of 189 pass.
- `perf/weapons.cjs`: 23 weapons, 0 failing.
- `perf/animlint.cjs --all`: 103 models, 0 problems.
- `perf/smoke.cjs`: 0 page errors.
- The workbench's in-game harness ran the basilisk's fire puff (wind-up,
  strike, recover) with no errors.

## Cerberus: the recommended size

- **The books:** *The Lightning Thief* ch. 18† says "twice the size of a woolly
  mammoth". A mammoth stood about 3–3.5 m, so Cerberus is about 6–7 m, 3.5–4×
  a 1.75 m hero, or 7.5–8.75 blocks.
- **The game now:**
  - The other agent's rebuild set his stats to radius 3.2 and height 7
    (`bosses.js`).
  - The model measured 7.0 blocks tall and 13.6 long in one pass and 6.35 /
    13.3 in the next, while it was still being reshaped.
  - The biggest hounds are Shadowfang at 6.1–6.2, the Road West hellhound
    champion at 5.8 and the hellhound alpha at 5.5.
- **Recommendation:** about **7.5 blocks tall at rest (3.4× Percy)**.
  - From the model as last measured (6.35 tall), that is **×1.18**. Against
    the round-0 model (4.34 tall), it is ×1.73.
  - This keeps him at least 1.2× Shadowfang, so he is plainly bigger than any
    hellhound.
  - His stats would follow: height 7 → 7.5 and radius 3.2 → 3.6.
  - He would be about 15.7 blocks long in a boss arena of 30 × 30 blocks
    (`world/levelgen.js`): about half its width. That fits, but going much
    bigger would crowd the arena.
- **Not applied:** his stat line is the other agent's, set with the model they
  are still reshaping.

## Proposals left for the owner or the other agents

- **Laistrygonian:** kept as it is by the owner (2.27× Percy, where the books
  say eight feet, about 1.4×).
- **Other stat heights below the model** (the hit band and the markers over
  the head sit low):
  - Colchis calf: 1.5 for 1.85;
  - keres: 1.8 for 2.44 (wings);
  - shade: 1.8 for 2.26.
  - All three are open-world kinds; raising each to about 0.85× its model is
    safe.
- **Tyson, Medusa, the hellhounds:** kept by the owner.

## Lineups

The lineups are working images outside the repository: Percy beside each
model, at true scale, with a grid line every block. Run `sz/lineup.cjs <dir>`
and then `sz/sheet.py <dir> out.jpg` against the workbench to make them again.

## The full table

Heights are in blocks (Percy = 2.19). An arrow runs from round 0 (before this
audit) to now (round 3). The Bronze Warden's stat column shows its look's
kind (automaton × 2.4); in game its hit height is now measured from the
model (4.05). The arrows show this audit's changes and the other agents': the
hellhounds, the Mist Serpent and Cerberus were changing under their rebuilds
while this was measured. Heroes, mortals and people are measured too; none is
outside 0.82–1.19× except Tyson and Chiron, a centaur.


### heroes

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| percy | Percy | 2.19 → 2.17 (1.00 → 0.99×) | 1.7 | — / — | 1.00 | reference | OK | — |
| annabeth | Annabeth | 2.11 → 2.10 (0.96×) | 1.2 | — / — | ~0.95–1.0 | books: same age as Percy | OK | — |
| grover | Grover | 2.40 (1.10×) | 1.2 | — / — | ~1.0 | Riordan Wiki infobox: 175 cm (5 ft 9 in), "a tall satyr" | OK | — |
| tyson | Tyson | 3.30 → 3.29 (1.50×) | 2.1 | — / — | ~1.05–1.2 | Riordan Wiki infobox: 6 ft 0 in (183 cm); request: "a head taller" | big (1.50×), kept by the owner | keep (owner) |
| clarisse | Clarisse | 2.38 → 2.36 (1.08×) | 2.6 | — / — | ~1.05 | TLT: big and tough, older | OK | — |
| thalia | Thalia | 2.25 → 2.24 (1.03 → 1.02×) | 2.6 | — / — | ~1.0 | TC | OK | — |
| nico | Nico | 2.23 → 2.25 (1.02 → 1.03×) | 1.4 | — / — | ~0.9–1.0 | TC: ten when found; older later | OK | — |

### npcs

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| chiron | Chiron | 2.99 → 3.00 (1.37×) | 1.8 | — / — | ~1.4 | Riordan Wiki: "taller than an average man"; a stallion's body under a man's torso | OK | — |
| mr_d | Mr. D | 1.89 (0.86×) | 1.1 | — / — | ~0.9 | TLT ch. 5: a short, pudgy man | OK | — |
| dummy | Training Dummy | 1.56 → 1.57 (0.71 → 0.72×) | 0.8 | — / — | — | prop | OK | — |

### monsters

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| pup | Hellhound Pup | 0.80 (0.37×) | 1.2 | 1.10 / 0.45 | — | game invention (hellhound pup) | OK | hellhound family: other agent |
| rat | Sewer Rat | 0.62 (0.28×) | 1.2 | 0.85 / 0.42 | ~0.3 | a sewer rat (game) | OK | — |
| serpent | Mist Serpent | 0.57 → 1.31 (0.26 → 0.60×) | 3.6 | 1.30 / 0.55 | — | game invention (Mist Serpent) | n/a | being rebuilt by another agent |
| mortal | Mortal | 2.21 → 2.23 (1.01 → 1.02×) | 1.2 | 1.90 / 0.38 | 1.0 | a person | OK | — |
| spider | Bronze Spider | 0.86 (0.39×) | 1.6 | 0.80 / 0.38 | ~0.3–0.4 | TLT ch. 14 (Waterland): tiny bronze spiders; design: "the size of a dog" | OK (design) | — |
| harpy | Wild Harpy | 1.48 → 1.77 (0.68 → 0.81×) | 3.9 | 2.00 / 0.40 | ~0.8–1.0 | SoM: the camp's cleaning harpies, "crossbred with the dodo birds"; SoN: Ella, small and skinny (Riordan Wiki); no height given | was a little small (0.68×) | FIXED ×1.2 |
| stymphalian | Stymphalian Bird | 1.12 → 1.13 (0.51×) | 3.6 | 1.70 / 0.45 | small | SoM: "monstrous pigeon-like birds" (Riordan Wiki; no size quote found); design draws them big | OK (stylised) | — |
| automaton | Greek-Fire Automaton | 1.04 (0.47×) | 0.9 | 1.10 / 0.55 | — | game invention (Greek-fire automaton) | OK | — |
| ghost | Restless Spirit | 1.68 → 2.01 (0.77 → 0.92×) | 1.1 | 2.00 / 0.45 | ~1.0 | Riordan Wiki: ghosts are "physically identical to when they were alive" | was a little small (0.77×) | FIXED ×1.2 |
| fury | Fury | 2.86 (1.31×) | 3.7 | 2.10 / 0.45 | ~1.0 + wings | TLT ch. 1: Mrs Dodds, "little", grows leathery bat wings | OK | — |
| dracaena | Dracaena | 2.24 → 2.25 (1.02 → 1.03×) | 2.8 | 2.60 / 0.80 | ~1.0 | SoM/BotL: humanoid women with twin serpent trunks for legs (no height given) | OK | — |
| hellhound | Hellhound | 5.13 → 4.81 (2.34 → 2.19×) | 7.0 | 5.00 / 1.60 | ~1.0–1.3 at the shoulder | TLT ch. 8: "the size of a rhino"; Riordan Wiki: grizzly-bear or rhino size, up to garbage-truck size (Mrs O'Leary, BotL: "bigger than a tank") | big (2.1×), kept by the owner | keep (owner) |
| empousa | Empousa | 2.15 (0.98×) | 1.4 | 2.30 / 0.50 | ~1.0 | BotL ch. 1: Kelli, a cheerleader | OK | — |
| scorpion | Giant Scorpion | 1.01 (0.46×) | 3.6 | 1.30 / 0.80 | — (game's giant scorpion) | BotL: Daedalus's giant scorpions (no size given); TLT ch. 22†: the pit scorpion is hand-sized, so it is now named Giant Scorpion | OK | ROUND 3: renamed Giant Scorpion |
| skeleton | Skeleton Warrior | 1.68 → 1.94 (0.77 → 0.88×) | 1.3 | 2.00 / 0.45 | ~0.9–1.0 | TC: spartoi in uniforms pass as soldiers and guards (Riordan Wiki); the spartoi request: "the size of a grown man" | was too small (0.77×) | FIXED ×1.15 (round 1) |
| spartoi | Spartoi | 1.93 → 1.94 (0.88×) | 1.2 | 2.00 / 0.45 | ~0.9–1.0 | myth: men sown from dragon's teeth (Apollodorus 1.9.23, 3.4.1) | OK | — |
| telekhine | Telekhine | 0.99 → 2.60 (0.45 → 1.18×) | 3.9 | 1.30 → 2.30 / 0.55 → 0.90 | ~1.2 (adults) | BotL (Mount St. Helens): adults "at least seven feet tall" (Riordan Wiki) | was too small (0.46×) | ROUND 3: ×2.6, stat 1.3/0.55 → 2.3/0.9 |
| gorgon_statue | Living Statue | 2.03 → 2.01 (0.92×) | 1.4 | 2.10 / 0.50 | ~1.0 | a statue of a person | OK | — |
| cyclops | Cyclops | 4.00 (1.82×) | 3.4 | 4.20 / 1.20 | ~1.6–2.7 | SoM: Polyphemus "so huge he couldn't even fit into the room", "made Tyson look vertically challenged" (Riordan Wiki estimate: 15 ft) | OK | — |
| karpos | Karpos | 2.22 → 1.55 (1.01 → 0.71×) | 1.2 | 1.25 / 0.40 | ~0.5 | SoN: karpoi "the size of toddlers, with rolls of baby fat" (Riordan Wiki); Hidden Oracle: Peaches, a "Demon Diaper Baby" | was too big (1.01×) | FIXED ×0.7 (books smaller than the ×0.8 asked) |
| karpos_slinger | Karpos Slinger | 2.22 → 1.57 (1.01 → 0.72×) | 1.2 | 1.25 / 0.40 | ~0.5 | as karpos | was too big | FIXED ×0.7 |
| colchis_calf | Colchis Bull Calf | 1.84 → 1.86 (0.84 → 0.85×) | 2.7 | 1.50 / 0.85 | ~0.8 | SoM: Colchis bulls "the size of elephants" (Riordan Wiki); a calf is the game's own | OK | — |
| myrmex | Myrmex | 1.90 → 1.23 (0.87 → 0.56×) | 1.9 | 0.90 / 0.55 | ~0.35 tall, ~0.6 long | Demigod Files ("The Bronze Dragon") / Hidden Oracle: "the size of a full grown German Shepherd" (Riordan Wiki) | was too big (0.87×, 2.9 long) | FIXED ×0.65 (books smaller than the ×0.8 asked) |
| myrmex_spitter | Myrmex Spitter | 1.90 → 1.24 (0.87 → 0.57×) | 2.0 | 1.00 / 0.60 | ~0.35 tall | as myrmex | was too big | FIXED ×0.65 |
| boarlet | Calydonian Boarlet | 2.24 → 2.23 (1.02×) | 3.0 | 1.40 → 1.90 / 0.85 | ~0.7–1.0 | myth: the Calydonian Boar was huge; a "boarlet" is the game's | OK | — |
| crab | Giant Crab | 1.10 → 1.11 (0.50 → 0.51×) | 1.9 | 0.90 / 0.70 | ~0.5 | design: "waist-high" shore crabs | OK | — |
| king_crab | King Crab | 2.77 → 4.10 (1.26 → 1.87×) | 6.2 | 2.40 → 3.60 / 1.50 → 1.80 | ~1.75 | TLO: Karkinos "rose ten feet out of the water... its pincers longer than my body"; design: "TWICE Percy's height" | was too small (1.26×) | FIXED ×1.5 (round 1) |
| basilisk | Basilisk | 1.99 → 0.64 (0.91 → 0.29×) | 1.5 | 1.10 → 0.60 / 0.50 → 0.35 | ~0.3 tall, ~0.4 long (arm-long) | The Son of Neptune, The Blood of Olympus, The Sun and the Star: "little green snakes" with a collar of white spikes, as long as a man's arm (Riordan Wiki) | now book size (stretched ~2× in length to read) | ROUND 3: re-sculpted as a snake, 1.5 long; fast fodder in threes on Othrys |
| earthborn | Earthborn | 3.48 (1.59×) | 3.6 | 3.00 / 1.00 | ~1.4 | TLH / SoN: Gegeines, six-armed clay giants "7 to 8 feet tall" (Riordan Wiki) | OK | other agent (rebuilding) |
| daedalus_drone | Daedalus Drone | 2.18 (1.00 → 0.99×) | 4.6 | 1.40 → 1.80 / 0.50 | — | game invention | OK | — |
| laistrygonian | Laistrygonian | 4.93 → 4.96 (2.25 → 2.26×) | 3.4 | 3.60 → 4.40 / 1.10 | ~1.4 | SoM ch. 1; The Ultimate Guide: "eight-foot-tall cannibalistic giants with heavily tattooed arms" (Riordan Wiki) | big (2.27×), OK stylised | FIXED stat height 3.6 → 4.4 (round 1); owner: model ×0.8 for canon |
| shade | Shade | 2.29 → 2.27 (1.04×) | 1.1 | 1.80 / 0.40 | ~1.0 | spirits of the dead | OK | — |
| keres | Ker | 2.45 (1.12×) | 3.2 | 1.80 / 0.45 | ~1.0 | myth: death spirits (Hesiod, Shield 248ff) | OK | — |

### bosses

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| alecto | Alecto | 5.13 → 5.10 (2.34 → 2.33×) | 7.1 | 3.00 / 0.90 | ~1.0 + wings | TLT ch. 1: Mrs Dodds, a "little" fifty-year-old woman | OK (boss, stylised) | — |
| minotaur | The Minotaur | 4.32 → 4.33 (1.97 → 1.98×) | 4.0 | 3.40 → 4.00 / 1.20 | ~1.2 (TLT) / ~1.75 (TLO) | TLT: "seven feet tall" (Riordan Wiki); TLO: seemed to have "grown three more feet" after reforming | big (1.97×), OK as a boss | FIXED stat height 3.4 → 4 |
| hellhound_alpha | The Hellhound | 5.91 → 5.53 (2.70 → 2.52×) | 8.0 | 5.80 / 1.80 | ~1.5 | as hellhound | big | other agent |
| furies | The Furies | 5.09 (2.32×) | 7.0 | 3.00 / 0.90 | ~1.0 + wings | TLT | OK (boss) | — |
| medusa | Medusa | 4.27 → 4.25 (1.95 → 1.94×) | 2.9 | 4.00 / 1.00 | ~1.0–1.1 | TLT: a woman in a black gown and veil; Greek Gods: "a tall woman" (Riordan Wiki) | big (1.96×), kept by the owner | keep (owner) |
| chimera | The Chimera | 3.54 (1.62×) | 6.5 | 3.00 / 1.30 | ~1.5–2 | TLT ch. 12: grows from Echidna's Chihuahua, with "a ten-foot-long diamondback" snake tail; Greek Heroes: Bellerophon's Chimera was "about the size of a woolly mammoth" (Riordan Wiki) | OK | — |
| spiders | The Spider Queen | 2.57 → 2.56 (1.17×) | 4.8 | 2.60 / 1.60 | — | game boss (Spider Queen) | OK | — |
| procrustes | Procrustes | 3.61 (1.65×) | 3.4 | 4.40 → 3.80 / 1.20 | ~1.2 | TLT ch. 17: "seven feet tall", hairless, a raptor in a leisure suit (Riordan Wiki) | big (1.65×), OK as a boss | FIXED stat height 4.4 → 3.8 |
| cerberus | Cerberus | 4.34 → 7.96 (1.98 → 3.63×) | 16.2 | 4.40 → 7.70 / 2.00 → 3.60 | ~3.5–4+ | TLT ch. 18: "twice the size of a woolly mammoth, mostly invisible, and had three heads"; Mrs O'Leary is a "petite puppy" beside him (Riordan Wiki) | now OK (3.21×) after the other agent's ×1.6 | keep 7.0, or ×1.1 at most |
| ares | Ares | 3.52 → 3.53 (1.61×) | 2.9 | 4.20 / 1.10 | ~1.2–1.4 | TLT ch. 10: "a huge, muscular man" (Riordan Wiki) | OK | — |
| luke | Luke Castellan | 2.40 (1.09×) | 1.8 | 2.60 / 0.70 | ~1.1 | older teen | OK | other agent |

### champions

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| fields_bronzebeak | Bronzebeak | 2.60 → 2.61 (1.19×) | 6.6 | 3.57 / 0.68 | — | game champion: kind × look.scale | OK | — |
| woods_shadowfang | Shadowfang | 6.68 → 6.45 (3.05 → 2.94×) | 9.0 | 6.50 / 2.08 | — | game champion: kind × look.scale | OK | — |
| shore_queen_gale | Queen Gale | 3.00 → 3.01 (1.37×) | 6.1 | 3.70 / 0.60 | — | game champion: kind × look.scale | OK | — |
| canyon_red_king | The Red King | 2.41 → 2.39 (1.10 → 1.09×) | 8.8 | 3.12 / 1.20 | — | game champion: kind × look.scale | OK | — |
| lab_bronze_warden | The Bronze Warden | 2.54 → 4.08 (1.16 → 1.86×) | 4.1 | 2.64 / 0.83 | — | game champion: kind × look.scale | OK | — |
| oth_gorgos | Gorgos the Cyclops Chief | 4.85 → 4.84 (2.21×) | 4.1 | 4.70 / 1.34 | — | game champion: kind × look.scale | OK | — |
| asphodel_pale_king | The Pale King | 2.76 → 3.19 (1.26 → 1.46×) | 1.9 | 2.90 / 0.65 | — | game champion: kind × look.scale | OK | — |
| kind:hellhound | Hellhound (Road West champion) | 6.36 → 6.19 (2.90 → 2.83×) | 8.7 | 6.25 / 2.00 | — | game champion: kind × look.scale | OK | — |
| kind:pup | Hellhound Pup (Road West champion) | 1.16 → 1.17 (0.53×) | 1.7 | 1.54 / 0.63 | — | game champion: kind × look.scale | OK | — |
| kind:skeleton | Skeleton Warrior (Road West champion) | 2.52 → 2.89 (1.15 → 1.32×) | 1.8 | 2.80 / 0.63 | — | game champion: kind × look.scale | OK | — |
| kind:spartoi | Spartoi (Road West champion) | 2.70 (1.23×) | 1.6 | 2.80 / 0.63 | — | game champion: kind × look.scale | OK | — |
| kind:spider | Bronze Spider (Road West champion) | 1.48 → 1.47 (0.68 → 0.67×) | 2.7 | 1.36 / 0.57 | — | game champion: kind × look.scale | OK | — |
| kind:dracaena | Dracaena (Road West champion) | 2.91 → 2.92 (1.33×) | 3.6 | 3.38 / 1.04 | — | game champion: kind × look.scale | OK | — |
| kind:empousa | Empousa (Road West champion) | 2.78 (1.27×) | 1.8 | 2.99 / 0.65 | — | game champion: kind × look.scale | OK | — |
| kind:harpy | Wild Harpy (Road West champion) | 2.52 → 3.04 (1.15 → 1.39×) | 6.4 | 3.20 / 0.60 | — | game champion: kind × look.scale | OK | — |
| kind:stymphalian | Stymphalian Bird (Road West champion) | 2.02 (0.92×) | 6.5 | 3.06 / 0.68 | — | game champion: kind × look.scale | OK | — |
| kind:scorpion | Giant Scorpion (Road West champion) | 2.02 → 1.98 (0.92 → 0.91×) | 7.3 | 2.60 / 1.20 | — | game champion: kind × look.scale | OK | — |
| kind:cyclops | Cyclops (Road West champion) | 4.84 → 4.85 (2.21×) | 3.7 | 4.54 / 1.30 | — | game champion: kind × look.scale | OK | — |

### mortals

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| teacher | Mrs. Dodds | 2.22 (1.01×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| student | Student | 2.11 → 2.12 (0.96 → 0.97×) | 1.1 | — / — | ~1.0 | a person | OK | — |
| guard | Museum Guard | 1.94 (0.89×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| tourist | Tourist | 2.21 → 2.23 (1.01 → 1.02×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| farmer | Farmer | 2.21 → 2.23 (1.01 → 1.02×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| old_lady | Old Lady | 2.24 (1.02×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| bellhop | Bellhop | 2.15 → 2.17 (0.98 → 0.99×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| salesman | Salesman | 2.16 (0.99×) | 1.3 | — / — | ~1.0 | a person | OK | — |

### people

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| fields_katie | Katie Gardner | 2.10 → 2.09 (0.96×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| fields_travis | Travis Stoll | 2.29 → 2.30 (1.04 → 1.05×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| woods_juniper | Juniper | 2.01 (0.92×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| woods_beckendorf | Charles Beckendorf | 2.40 → 2.42 (1.10×) | 1.6 | — / — | ~1.0 | a person | OK | — |
| shore_lee | Lee Fletcher | 2.24 → 2.25 (1.02 → 1.03×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| shore_nereid | Galene the Nereid | 2.04 → 2.02 (0.93 → 0.92×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| canyon_hedge | Coach Hedge | 1.95 → 1.96 (0.89×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| zoe | Zoë Nightshade | 1.94 → 1.95 (0.88 → 0.89×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| rachel | Rachel Elizabeth Dare | 2.17 (0.99×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| quintus | Quintus | 2.22 → 2.24 (1.01 → 1.02×) | 1.5 | — / — | ~1.0 | a person | OK | — |
| canyon_phoebe | Phoebe the Hunter | 2.18 (0.99 → 1.00×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| bianca | Bianca di Angelo | 2.13 → 2.12 (0.97×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| asphodel_charon | Charon | 2.61 → 2.60 (1.19×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| asphodel_sisyphus | Sisyphus | 2.23 → 2.24 (1.02×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| camp_argus | Argus | 2.40 → 2.41 (1.10×) | 1.7 | — / — | ~1.0 | a person | OK | — |
| camp_silena | Silena Beauregard | 1.93 → 1.94 (0.88 → 0.89×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| rt_turnpike_earl | Big Earl, Trucker | 2.37 → 2.38 (1.08 → 1.09×) | 1.7 | — / — | ~1.0 | a person | OK | — |
| rt_auntyem_pruitt | Mrs. Pruitt | 2.09 → 2.10 (0.95 → 0.96×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| rt_stlouis_mae | Ranger Mae | 2.18 → 2.17 (0.99×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| rt_denver_chad | Chad, Ex-Lifeguard | 2.16 (0.98×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| rt_vegas_valet | Sal the Valet | 2.18 → 2.16 (0.99×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| rt_la_guide | Trudy the Tour Guide | 2.02 → 2.01 (0.92×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| rt_sm_fisher | Grandma Mae | 1.80 (0.82×) | 1.2 | — / — | ~1.0 | a person | OK | — |
