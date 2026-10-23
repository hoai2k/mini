# Half-Blood Quests: creature size audit, October 2026

Every model the workbench lists (heroes, camp NPCs, monsters, bosses,
champions, mortal disguises and open-world people), measured against Percy and
compared with Rick Riordan's books, Greek myth and the game's own design
documents. Round 2 adds the size descriptions the books give and the owner's
decisions. Round 6 replaces judgement by eye with an enforced spec: every
model has a size category in [sizes.json](sizes.json), and
`perf/bodysize.cjs --check` fails when a model leaves its category's band or
a big body keeps a hero's big head.

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
| Harpy / Restless Spirit | 0.68× / 0.77× | bird-women / people as they were in life | the spirit 0.92× (×1.2); the harpy 0.81× (×1.2), then re-sculpted to body 1.10× (round 6) |
| Dracaena | body 0.87× (the 1.03× box was her snake hair and spear) | the owner: notably bigger than Percy; the sheet draws her as tall as the hellhound | body 1.80×, re-sculpted (round 6) |
| Bronze Warden | 1.16× | request: "a giant bronze automaton" | 1.87× (×1.6) |
| Cerberus | 1.98× | *The Lightning Thief* ch. 18†: "twice the size of a woolly mammoth" | 2.9–3.2× after the other agent's rebuild; recommended 7.5 blocks (below) |
| Telekhine | 0.46× | *Battle of the Labyrinth*: adults "at least seven feet tall" | 1.18× (×2.6, round 3) |
| Alecto, the Furies | body 1.20× (the 2.3× box was her whip and wings) | the owner: a boss that looms, 1.8–2× | body 1.89× (scale 1.75 → 2.8, round 4), the sisters 1.69× |
| Fury | body 0.69× (the 1.3× box was her whip) | the owner: 1.4–1.5×, under the sisters | body 1.42× (scale 1.0 → 2.1, round 4) |

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
- **Body size (round 4).** The box counts whatever a model holds or trails,
  so round 4 also measures the body: torso, head and legs, without arms,
  held things, weapons, wings, whips, tails, stings, flame hair, flames,
  capes and props (`percyjackson/perf/bodysize.cjs`; details under "Round 4").
  Body height is the top of the body over the ground line. Judge size by the
  body column first.
- **The size spec (round 6).** Each model's size category, its band and the
  head rule are in [sizes.json](sizes.json); `bodysize.cjs --check` enforces
  them, with the sheet measurements and the reasons behind each category.
  See "Round 6".
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
    `sz/lineup.cjs`, `sz/table2.cjs`, `sz/sheet.py`); round 4's body measure
    is in the repository, `percyjackson/perf/bodysize.cjs`.
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
| Stymphalian birds | *The Sea of Monsters* (chariot race): "monstrous pigeon-like birds"; no size found in the books. Pausanias 8.22.4–5: "man-eating birds", "of the size of a crane" (round 4) | ~0.7 standing, wingspan ~1.5–2 |
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

### Round 4: bodies, not boxes (the owner's decisions)

**The mistake.** Rounds 1–3 judged each model by its whole bounding box. A
box takes in everything a model holds or trails, so a whip hanging under a
Fury, wings, a boulder held overhead, raised arms, a raised sting or snake
hair made a small body pass as big enough. Round 4 measures the body itself.

**The body measure** (`percyjackson/perf/bodysize.cjs`, run against the
workbench like the other tools; see "How this was measured"):
- It keeps the core torso, head and legs of the rig, at rest, and reports the
  top of the body over the ground line it stands on.
- It leaves out a humanoid's arms and hands, held things (`markHeld`) and the
  weapon carrying a `markTip` tip, wings (`addWings`), the whip (`addWhip`),
  tails and stings, the chimera's snake, flame hair, the live flames
  (`flames.js`), capes, hair strands and props named in `rig.extras` (a
  shield, a pot, a gun, a key, ...). Glows and hidden parts are left out as
  before.
- For each model it lists what it left out and how high each part reached,
  so a row can be checked by eye. It covers all 103 workbench models.
- Percy's body is 2.18 (his box 2.19), so × Percy hardly changes for people.

**First pass** (the owner's earlier requests this round):

| id | change | body (× Percy) | stat height / radius |
|---|---|---|---|
| stymphalian | `eagle` scale 1.1 → 1.5 (×1.36); its Road West champion's look 1.8 → 1.4, so the champion keeps its size | level, wings left out: 0.90 (0.41×); wingspan 4.9 | 1.7 / 0.45 → 2.0 / 0.6 |
| empousa | legs 12 → 16 px, torso 12 → 10 px, scale 1.1 → 1.25 | 1.81 → 2.15 (0.83 → 0.99×) without the flame mane | 2.3 → 2.5 |
| fury | scale 1.0 → 1.5, float 0.8 → 1.0 | 1.50 → 2.20 (0.69 → 1.02×) | 2.1 / 0.45 → 3.2 / 0.65 |

**Second pass: the Fury family.** The ordinary Fury could not grow further
while she stood level with the boss sisters, whose bodies were only 1.2×
Percy. The owner asked for Alecto's body to loom at about 1.8–2× Percy, her
sisters a little smaller, and the plain Fury at 1.4–1.5×.

| model | scale | body standing (× Percy) | hovering, head at | wingspan | whole box |
|---|---|---|---|---|---|
| Fury (`monsters.js` `MODELS.fury`) | 1.5 → 2.1; float 1.0 → 1.25 | 2.20 → 3.10 (1.02 → 1.42×) | 3.2 → 4.35 | 6.05 → 7.2 | 4.35 → 5.90 |
| Megaera, Tisiphone (`bossmodels.js`) | 1.6 → 2.5 | 2.37 → 3.68 (1.09 → 1.69×) | boss hover 1.4 → 1.9 | — | — |
| Alecto (`bossmodels.js`) | 1.75 → 2.8 | 2.59 → 4.12 (1.20 → 1.89×) | 3.99 → 6.0 | 7.18 → 8.5 | 5.12 → 7.84 |

- **`buildFury`** (`monsters.js`):
  - The wings grow as the square root of her size past scale 1.5 (`ws` ×
    √(1.5 / scale)), so a span stays about twice her height instead of
    nearly three times: 8.5 for Alecto rather than 11.4.
  - The strips, curls and claws stop getting finer past Alecto's old scale
    1.75 (`densityFor(min(scale, 1.75))`); past it the strips grow with her.
    So Alecto costs no more triangles than before (9.1k with her smaller
    wings), and the sisters and the plain Fury, drawn at Alecto's old
    fineness, a little more (the Fury 9.5k).
  - `hoverMin` (her hem 11 px under the soles, plus 0.22) and the whip's pose
    (`whipPose`) follow the scale by themselves. `hoverMin` is now 1.30 for
    the Fury, 1.50 for the sisters and 1.65 for Alecto.
- **The plain Fury's stats** (`MONSTERS.fury`): radius 0.65 → 0.9, height
  3.2 → 3.9, slash range 2.2 → 2.8 (its whip is 1.4× longer; the cone reaches
  `range + 0.4`). Height 3.9 still passes the chapter rooms' 4-high doors and
  stands under the 5-high Labyrinth and Asphodel ceilings where she camps.
  Hovering, her hair rises to 4.35, so it passes 0.35 over a 4-high lintel.
  Her float rose to 1.25 so her hem clears the floor at the bottom of her bob.
- **The boss stats** (`bosses.js`):

  | boss | radius | height | hover |
  |---|---|---|---|
  | Alecto (chapter 1) | 0.9 → 1.2 | 3 → 3.9 | 1.4 → 1.9 |
  | The Furies (chapter 4) | 0.9 → 1.2 | 3 → 5.8 | 1.4 → 1.9 |

  - Hover 1.9 keeps the bigger hem off the floor (1.43 under Alecto's soles)
    at the bottom of the ±0.2 bob.
  - Alecto's collision height stays at 3.9. In chapter 1 she flees from
    gallery to gallery and fights in each, and the museum's doors are 4
    high, so a taller box would shut her into one room. Her head, at about 6,
    passes over their lintels; the galleries are 6–8 high inside.
  - The Furies fight in the open highway arena, so theirs is the body's.
- **Reach that comes from her size** (`FURY_REACH`, `bosses-book1.js`, used
  by `bosses.js` and `bosses-book1.js`). The reaches grew by about a quarter,
  short of the 1.6× the bodies grew, so the arenas keep room to dodge:

  | attack | before | after |
  |---|---|---|
  | whip lash (`whip_lash`, `fury_whip`) and the triple whip: line length / width | 10 / 1.8 | 12 / 2.4 (the triple whip's length still runs to each hero, up to 16) |
  | whip ring (`whip_ring`): radius / ring of fire | 5.5 / 4.2 | 6.8 / 5.2 |
  | swoop (`swoop`, `fury_swoop`): lane width / hit radius | 3 / 2 | 4 / 2.6 (length unchanged) |
  | sister swap landing: blast radius / ring of fire | 3.6 / 3 | 4.2 / 3.6 |
  | the waiting sisters' circle: radius / height | 7.5 / 4.6 | 8.5 / 5.6 |

  `windup`, `cd`, `dmg` and the timings are unchanged, as are `enemy.js`,
  `projectiles.js` and `rangedRules.js`.
- **Fit, checked in the game** (headless, each pattern run to its end in the
  real boss arenas):
  - Chapter 1, the museum arena (a 30-block ring, columns 7 high, no roof):
    the lash, the swoop and the ring run with no errors. The swoop stops at
    the arena's edge and drops her to `hoverMin` (1.65).
  - Chapter 4, the highway arena: the lash, swoop, sister swap, triple whip
    and ring run with no errors. The bus there is a set piece along the wall,
    4 high inside with a 2-wide, 3-high side door: at 5.8 tall and 1.2 across
    the Furies cannot follow a hero in. Their attacks need no line of
    sight, so the bus is still no hiding place. The waiting sisters circle
    the fighting one, so when she stands at the ring's edge they pass up to
    about 8 blocks outside it (7 before); they are airborne.

**Every other model, by body** (the full table below has a body column; the
models whose box hid a smaller body):

| model | body (× Percy) | box (× Percy) | what made the box | verdict |
|---|---|---|---|---|
| Alecto, the Furies | 1.20 → 1.89 | 2.35 → 3.6 | the whip under her, the wings | fixed (above) |
| Fury | 1.02 → 1.42 | 2.0 → 2.7 | the whip, the wings | fixed (above) |
| Laistrygonian | 1.62 | 2.11 | the boulder overhead, raised arms | kept by the owner; doubt below |
| Medusa | 1.57 | 1.97 | snake hair | kept by the owner; doubt below |
| Stymphalian Bird | 0.41 standing level | 0.70 | wings up | the owner has not decided its pose; not changed |
| The Red King (champion) | 0.82 | 1.10 | the raised sting | OK: it reads by its 8.8 length |
| Giant Scorpion, its champion | 0.26, 0.65 | 0.46, 0.91 | the raised sting | no book size; reads by length (3.6, 7.3) |
| Bronze Spider, its champion | 0.27, 0.47 | 0.40, 0.67 | the wind-up key | between the books (tiny) and the design (a dog, ~0.3–0.4); for the owner |
| Earthborn | 1.39 | 1.61 | raised upper arms | OK: the books' 7–8 feet |
| Greek-Fire Automaton | 0.24 | 0.43 | the pot of Greek fire it carries | OK: a game invention |
| Dracaena | 0.87 | 1.03 | snake hair, the spear | a little short, inside the people's band; for the owner (wrongly left: fixed in round 6, 1.80×) |
| Ker | 0.99 | 1.12 | wings | OK |
| Empousa | 0.99 | 1.07 | flame hair | OK (fixed in the first pass) |

Everything else measures within 0.1× of its box: heroes, people and mortals
hold weapons below their heads, and the hounds' and beasts' tails hang lower
than their backs.

**Kept by the owner, measured by body:**
- Tyson 1.51×, his box 1.52×: no change.
- Medusa 1.57× (box 1.97×): nearer the books' "tall woman" (~1.1×) than the
  box suggested, though still a stylised boss.
- The hellhounds 2.2–2.8× (Road West champion 2.78×, the alpha 2.59×): their
  tails hang below the back, so the box was already the body.
- The Laistrygonians 1.62× (box 2.11×): the books say eight feet, about 1.4×,
  so the body is only 0.2× over. The owner's earlier "×0.8 for canon"
  was judged from the box; on the body it would make him 1.3×, under the
  books. Worth a second look before applying it.

**Checks after round 4:**
- `node --test test/*.test.mjs`: 194 of 194 pass.
- `perf/weapons.cjs`: 23 weapons, 0 failing.
- `perf/houndlegs.cjs`: all legs stay attached.
- `perf/animlint.cjs --all`: 103 models, 0 problems (the Fury, Alecto and the
  Furies through every pose, the whip and the swoop included).
- `perf/smoke.cjs`: 0 page errors.
- `perf/bodysize.cjs`: 103 models, 0 page errors.

### Round 5: the hellhound pup (the owner's ruling)

The owner: "I think the standard 'Hellhound Puppy' is Mrs O'Leary, so going
smaller than a tank is OK, but not smaller than a person. It should in fact be
larger than a person." So a pup is a puppy the way Mrs O'Leary is one (the
books' "petite puppy" beside Cerberus, and "bigger than a tank" beside a
person), only younger and smaller: a head taller than Percy, about half the
elite hellhound.

- **Model:** re-sculpted, not scaled (`monsters.js` `PUP` and `bigPup`).
  It is built like the full hellhound at the heroes' voxel size (rig scale
  1.18), so the bigger body is made of more blocks, not bigger ones. It has a
  puppy's proportions: a round barrel of a body, short sturdy legs on
  oversized four-toed paws with amber claws and embers between the toes, a big
  round head with full cheeks and a short muzzle, big molten eyes under a soft
  scowl, ears that fold over at the tips, and a stubby curled tail with a
  smouldering tip. The coat is thick and fluffy: soot-black clumps, a fluffy
  bib and a soft ember-tipped ridge of hackles. The magma cracks have red rims
  (as on the hellhound). The mouth is dark, with pink gums only along the jaws
  and the nose flush with the muzzle. `vox-enemies` already draws the pup at
  about Percy's height, so the sheet still holds.
- **Size:** body 0.83 → 2.64 (0.38 → 1.21× Percy), 2.8 long; triangles
  3.3k → 8.7k. The Road West champion (`kind:pup`, look.scale 1.4, unchanged)
  is 3.73 (1.71×). The elite hellhound is 4.93 (2.27×).
- **Stats:** radius 0.45 → 0.8, height 1.1 → 2.7. Melee range 1.5 → 2, so
  the bite still reaches a hero past its own muzzle and its wider body (the
  separation keeps it 1.2 from a hero's centre). knockResist 0 → 0.2: a little
  heavier to knock about, still far under the elite's 0.7. The bark is a
  little deeper (pitch 1.5 → 1.2). hp, speed, damage, wind-up and cooldown
  are unchanged.
- **Fit:** a 1.6 footprint and a 2.7 height go through every doorway: room
  doors 5 × 4, the camp's 3 × 3, the museum's 4 high, the bus's 2 × 3, and the
  corridors (5 wide, 5 high). Packs in a chapter room now start a body-width
  apart (`encounters.js` `place`: the gap between members grows with their
  radius, 1.1 to at most 2), and separation and `unoverlap` keep a pack of
  six from jamming round a hero.
- **Summons:** the empousa calls hers 1.8 from her centre (her 0.5 and the
  pup's 0.8 leave a gap). Alecto (3.5) and the alpha (4) call theirs on a
  ring well clear of their own bodies. A boss's summon now checks the pup's
  whole footprint and height against the walls, and tries other turns of the
  ring (`bosses.js` `summonSpot`), instead of testing only the centre.

**Checks after round 5:**
- `node --test test/*.test.mjs`: 195 of 195 pass.
- `perf/weapons.cjs`: 23 weapons, 0 failing.
- `perf/houndlegs.cjs`: all legs stay attached. The pup and `kind:pup` are now
  checked too.
- `perf/animlint.cjs --all`: 103 models, 0 problems.
- `perf/smoke.cjs`: 0 page errors.
- `perf/bodysize.cjs`: 103 models, 0 page errors.

### Round 6: a size spec the check enforces (the owner's ruling)

The owner: "Harpies are smaller than Percy, and so is the Dracaena, and it
seems like she should be notably bigger than him. Did your audit not catch
these things?" It did not, and the cause was the method, not the measuring.

**What went wrong.**
- **No written target.** Each round measured every model well, then judged
  it by eye against a loose "expected" column. Nothing said what size a
  model *should* be, so nothing could fail.
- **Text over pictures.** The audit leaned on the books. Where they give no
  size (harpies, dracaenae), anything near Percy was accepted: the harpy at
  0.81× passed as "roughly human-sized", the dracaena at 0.87× as "inside the
  people's band".
- **The strongest evidence went unused.** The concept sheets draw a Percy
  beside each creature for scale. Round 4 noted that the sheet draws the
  dracaena "about twice Percy" and still left her as a doubt for the owner.
  No sheet was measured.
- **Canon read as a ceiling.** A book size, or none, capped a model even
  where the game wants it to loom.

**The spec: [sizes.json](sizes.json).**
- **Categories, not ranges.** Each workbench model (all 103) has a size
  category relative to Percy, with its source and reason. The bands are one
  table at the top, the one place to tune them (body height × Percy):

  | category | label | band |
  |---|---|---|
  | `tiny` | much smaller | 0–0.45 |
  | `small` | smaller | 0.4–0.8 |
  | `slightlySmaller` | slightly smaller | 0.75–0.95 |
  | `same` | about the same | 0.85–1.15 |
  | `slightlyBigger` | slightly bigger | 1.05–1.45 |
  | `bigger` | bigger | 1.4–2.0 |
  | `muchBigger` | much bigger | 1.85–2.7 |
  | `giant` | giant / towering | 2.55–6 |

- **How a category is chosen.**
  1. The owner's rulings fix it: Tyson, Medusa, the hellhounds and the
     Laistrygonian kept, the pup larger than a person, Cerberus 3.4× and
     over, the Fury family grown, the empousa as tall as Percy.
  2. Then the role and the drama: an elite or a boss should loom, so
     "imposing beats canon". Exaggeration is expected; what matters is the
     relation to Percy.
  3. The concept sheets and the books are the guide, not the ceiling.
- **Sheet measurements.** For 27 models, the drawing's height over its Percy
  figure, read off the image with a pixel ruler (`sheetMeasure`: the sheet,
  both pixel heights, the ratio). The sheets draw everything bigger than the
  game: a person-sized figure on the same sheet (the skeleton and empousa on
  `vox-enemies`, the shades on `vox-ow-fodder`, the keres on
  `vox-ow-fodder-3`) measures 1.7–1.8× its Percy. So each measurement also
  gives `norm`, the ratio over that figure's. On `vox-ow-fodder` the normed
  sizes match the game's karpos (0.74 for 0.69), myrmex (0.51 for 0.57) and
  crab (0.56 for 0.54). The champion and boss sheets draw every figure about
  4–4.5× a small running Percy, so only their relative sizes count.
- **The head rule** (the owner, during this round): as characters grow, the
  Minecraft-style big head gives way to realistic proportions.
  - `bodysize.cjs` now measures an upright rig's head block (its skin cube,
    or the head group's own meshes where the builder dropped the cube) over
    its body height. Heroes measure 0.23–0.29; an adult is about 0.13.
  - Allowed: 0.30 at 1× Percy and under, falling in a straight line to 0.17 at
    2× and over. Four-legged rigs and serpents are not checked.
  - The sheets agree: on `vox-enemies` Percy's head is about 0.41 of his
    height and the dracaena's about 0.17.

**The check.** `bodysize.cjs - '' --check` (listed in `perf/README.md`)
reads the spec, measures every model and fails on:
- a body outside its category's band;
- a head over the head rule, unless the spec marks it `"head": "followUp"`
  with a note: a known case left for a later pass. It prints as a warning,
  and says so when the mark can go.

`test/sizes.test.mjs` checks the spec itself:
- every workbench model has an entry, with a known category, a source and a
  reason;
- the bands grow in order and overlap by 0.15 at most;
- each sheet measurement adds up;
- the owner's rulings keep their categories.

**What the check flagged, run on the models before this round's fixes:**

| model | body × Percy | category (band) |
|---|---|---|
| harpy | 0.80 | slightly bigger (1.05–1.45) |
| dracaena | 0.87 | bigger (1.4–2.0) |
| Queen Gale (harpy champion) | 1.35 | bigger (1.4–2.0) |
| `kind:harpy` | 1.37 | bigger (1.4–2.0) |
| `kind:dracaena` | 1.29 | much bigger (1.85–2.7) |

The head rule flagged 12 more. They are marked `followUp` for a later pass,
since none of them is a harpy or a dracaena:

| model | body × Percy | head / body | allowed |
|---|---|---|---|
| Tyson (size kept by the owner) | 1.51 | 0.25 | 0.234 |
| Fury | 1.42 | 0.28 | 0.245 |
| Earthborn | 1.39 | 0.27 | 0.249 |
| Medusa | 1.56 | 0.47 | 0.227 |
| Laistrygonian | 1.61 | 0.45 | 0.221 |
| Cyclops | 1.82 | 0.45 | 0.193 |
| Bronze Warden | 1.86 | 0.26 | 0.188 |
| Alecto, the Furies | 1.90 | 0.28 | 0.183 |
| Minotaur | 1.96 | 0.42 | 0.175 |
| Gorgos, `kind:cyclops` | 2.21 | 0.49, 0.52 | 0.170 |

The cyclops kinds, the Laistrygonian, Medusa and the Minotaur drop their
skin head cube. Their head block is measured from the head group, so it
takes in the mane, beard, veil and snakes, or the bull's head. Those numbers
overstate the head, but even the face alone is hero-sized on those bodies.

**The fixes.** Both are re-sculpted, not scaled: the bigger body is made of
more cells at the heroes' voxel size, and the head is kept small for the
body.

- **The harpy** (`monsters.js` `harpyWoman`, rig scale 1.2 kept):
  - Body 1.74 → **2.39 (0.80 → 1.10×)**, head 0.25 → 0.18 of her body.
  - The torso is 11.5 → 16 px: a narrow chest over a pinched waist, a
    scrawny neck with collarbones and cords.
  - The legs are 8 → 15 px: three rings of ragged thigh feathers, a knee, a
    long yellow shank ringed with scales and scutes, and jointed toes with
    black talons.
  - Feathers: breast feathers in rows, each with a dark tip and a light
    shaft; a two-layer feather skirt; a tail of seven long feathers with
    shafts and pale torn tips; longer tangled hair down her back.
  - Wings: span 25 → 31, chord 11 → 13.5 (about 2.3× her height tip to tip,
    whole box 4.7). Two rows of covert feathers over the arm, marginal
    coverts on the leading edge, pale shafts on the secondaries, eight torn
    hanging feathers, the alula at the wrist, the clawed thumb.
  - 2.5k → 5.5k triangles.
  - Stats: height 2 → 2.5, radius 0.4 → 0.5. A ranged flier, so no reach
    depends on her size. 2.5 tall and 1 across she passes every door,
    including the 3 × 3 barn and farmhouse doors.
- **Her champions:**
  - Queen Gale: look scale 1.85 → 1.6, body 1.35 → 1.56×.
  - `kind:harpy`: 1.6 → 1.4, body 1.36 → 1.61×.
  - Both stay "bigger" than the harpy, as champions are. Their radius
    follows: 0.6 → 0.75 and 0.7. Their hit height is measured from the
    model.
- **The dracaena** (`monsters.js` `buildDracaena`): a woman's torso reared up
  on one long serpent tail, as this game's model and the `vox-enemies` sheet
  draw her.
  - Rig scale 1.2 → 1.85, with the skin painted finer (`skinMat` `scale`)
    and every detail sized in hero pixels (`densityFor`). The tail she rears
    on is 12 → 25 px, the torso 12 → 13. The head is 6.2 px
    (`headS`, was 8), so the head is 0.15 of her body (was 0.26).
  - Body 1.90 → **3.93 (0.87 → 1.80×)**; with the writhing hair snakes 4.4.
  - The trunk rises in a gentle S to a coil on the ground, its tip curled up.
    It is scaled all over in two-hero-pixel plates, with a broad band of
    gold belly plates with dark seams and a zigzag gold stripe down each
    side. The coil is ×1.25, in the same scales.
  - Armour: a black bodice in two cups rimmed in gold, a gold rib, straps,
    side studs, a gold collar with a green pendant, a banded belt with a
    square buckle and a hanging gold tongue. Two layers of leather skirt
    strips with gold studs and worn hems. Gold armlets, and wide banded
    bracers set with green stones.
  - Hair: 18 snake heads in the curls (jaw, eyes, some with a flicked
    tongue), 6 writhing snakes (was 4), gold earrings.
  - The spear: a leather grip wrap, banded gold rings, a butt cap, a blade
    with a midrib and barbs. It is about her height, as on the sheet, and
    still points forward.
  - 4.6k → 10.7k triangles.
  - **Stats:** radius 0.8 → 1.1; height 2.6 → 3.8; slam trigger range
    2.6 → 3; slam radius 2.6 → 2.9 (`slamR`, its circle 1.8 ahead). Her spear
    and her bigger body reach further. `windup`, `cd` and `dmg` are
    unchanged.
  - **Fit:**
    - The collision height of 3.8 passes the chapter rooms' 4-high doors,
      and her 2.2 width passes the 5-wide ones. Her crown (3.93) and hair
      snakes (4.4) pass over a lintel, as the Fury's hair does.
    - The Labyrinth's 5-high corridors fit her whole.
    - She cannot enter the farmhouse (3 × 3 doors) or the highway bus (2 ×
      3). The hellhounds can't either, and neither is a place she needs to
      reach.
- **Her champions:**
  - `kind:dracaena` (look scale 1.3, unchanged): body 1.28 → 2.61×. It
    fights on open ground.
  - The Bronze Warden spawns as a dracaena with the automaton's look. It
    keeps its size and attack scale. Its radius follows the kind (1.2 →
    1.65), and so do its slam trigger (3) and radius (2.9). Its hall is a
    15-block open ring.

Before and after images (Percy beside each, a line every block) are working
files outside the repository, as before.

**Checks after round 6:**
- `node --test test/*.test.mjs`: 200 of 200 pass (5 new in `sizes.test.mjs`).
- `perf/weapons.cjs`: 23 weapons, 0 failing.
- `perf/houndlegs.cjs`: all legs stay attached.
- `perf/animlint.cjs --all`: 103 models, 0 problems.
- `perf/smoke.cjs`: 0 page errors.
- `perf/bodysize.cjs - '' --check`: 103 models, 0 failing, 12 warnings (the
  head follow-ups above).

### Round 7: head proportions (the owner's rules)

The owner: "As characters grow, reduce the Minecraft-style head-size
exaggeration. A bigger creature has more realistic head-to-body
proportions." And then: "Note the proportion of legs to body too."

**The head rule** was already in [sizes.json](sizes.json) (`head`): an
upright model's head over its body height may be at most 0.30 up to 1×
Percy, falling in a straight line to 0.17 at 2× and over. Twelve models were
marked `"head": "followUp"` (warnings only). Round 7 fixed all twelve and took
the marks out, so the check now enforces the rule for every model.

**A truer head measure.** `perf/bodysize.cjs` used to measure the whole head
group of a sculpted head, so a mane, beard, veil, hood or horns counted as
head: the cyclops read 0.45, Medusa 0.47. Now a builder names the skull and
face, `markHeadCore(rig, centre, size)` (`game/js/entities/proportions.js`,
kept in `rig.extras.headCore`), and the check measures that, along the head's
own axis so a hunched or bowed head is not taller for its tilt. A model that
names no core is measured as before (its skin cube, else its head group).
The core is set for the cyclops (skull and face, mane and beard aside), the
Laistrygonian, the Earthborn, the Minotaur (skull and muzzle, horns and
forelock aside), Medusa (the face in the cowl), the Furies and Tyson (the
skin cube, hair aside) and the Bronze Warden (the helm, crest aside). With the
new measure alone the cyclops read 0.27, Medusa 0.25, the Minotaur 0.20:
still over, so every one was re-proportioned.

**The leg rule** (new, `legs` in sizes.json, checked the same way): an
upright model's legs, hip joint to sole, over its body height must be at
least 0.27 up to 1.15× Percy, rising in a straight line to 0.42 at 2× and
over. Measured this way the heroes read 0.27–0.32: their voxel hair tops the
body (to the top of the skull it is about 0.35–0.38, the owner's "short-ish"
0.35–0.45), and 0.42 to the crown is about half the height to the skull, the
owner's 0.45–0.5 for a human-shaped giant. The numbers live in one place,
`legs` in sizes.json. A model whose legs are hidden or not a person's is
marked `"legs": "exempt"` with a `legsNote` (Alecto and the Furies hover in
long dresses, Medusa's robe falls to the floor, Bronzebeak is a bird); a known
follow-up is `"legs": "followUp"` (a warning). Four-legged models record leg
root height over shoulder height in the table (marked q) and are not checked.

**How a model is re-proportioned: re-sculpted, not scaled.**
`proportions.js` `reshape(rig, part, [fx, fy, fz])` tells the voxel kits
(monsters.js `VoxKit`, fodder.js `blob`, bossmodels.js `vox`) to lay what is
drawn into that part through its shape; they voxelise afresh at the model's
own cell size (parts.js density), so a smaller head is a new sculpt of the
same hero-sized cells with its features drawn smaller, and clumps, shag tufts
and cells keep their size. A leg reshaped with `{ ankle }` grows in the thigh
and shin over the same foot. `applyShape(rig)` then moves what hangs on a
reshaped part (neck, shoulders, hands, a shoulder skull, wings, a hood).
Skin-cube heads (the Furies, Tyson) are built with a smaller `headS`.
Each body stays in its size category; weapons, grips, animations, hit
flashes, stats and material code are untouched.

| model | body × Percy | head / body (allowed) | legs / body (needed) | triangles |
|---|---|---|---|---|
| Tyson | 1.50 → 1.52 | 0.221 → 0.199 (≤ 0.232) | 0.298 → 0.340 (≥ 0.335) | 5,100 → 5,100 |
| Fury | 1.42 → 1.45 | 0.282 → 0.228 (≤ 0.241) | 0.314 → 0.340 (≥ 0.323) | 10,058 → 10,508 |
| Cyclops | 1.82 → 1.94 | 0.269 → 0.156 (≤ 0.178) | 0.297 → 0.461 (≥ 0.409) | 20,070 → 21,822 |
| Earthborn | 1.39 → 1.40 | 0.254 → 0.223 (≤ 0.248) | 0.318 → 0.351 (≥ 0.314) | 14,568 → 14,134 |
| Laistrygonian | 1.61 → 1.61 | 0.261 → 0.203 (≤ 0.221) | 0.311 → 0.379 (≥ 0.351) | 21,688 → 19,350 |
| Alecto | 1.89 → 1.88 | 0.281 → 0.164 (≤ 0.186) | exempt (hovers, dress) | 9,666 → 10,546 |
| the Furies | 1.90 → 1.89 | 0.282 → 0.165 (≤ 0.184) | exempt (hover, dresses) | 9,666 → 10,546 |
| Minotaur | 1.96 → 2.09 | 0.204 → 0.153 (≤ 0.170) | 0.342 → 0.429 (≥ 0.420) | 32,856 → 31,660 |
| Medusa | 1.55 → 1.55 | 0.254 → 0.210 (≤ 0.228) | exempt (robe) | 35,172 → 34,944 |
| Bronze Warden | 1.85 → 1.82 | 0.271 → 0.173 (≤ 0.193) | 0.314 → 0.430 (≥ 0.388) | 2,810 → 2,822 |
| Gorgos | 2.21 → 2.26 | 0.248 → 0.151 (≤ 0.170) | 0.275 → 0.442 (≥ 0.420) | 23,392 → 23,884 |
| cyclops champion | 2.21 → 2.23 | 0.238 → 0.147 (≤ 0.170) | 0.266 → 0.432 (≥ 0.420) | 21,808 → 23,116 |
| Pale King | 1.37 → 1.34 | 0.232 → 0.237 | 0.311 → 0.319 (≥ 0.304) | 3,358 → 3,358 |

(Before: the old model under the new measures. The old head measure read
Tyson 0.249, the cyclops 0.454, the Laistrygonian 0.450, Medusa 0.473, the
Minotaur 0.414, Gorgos 0.493 and the cyclops champion 0.524.)

- **Cyclops** (and through him Gorgos and the cyclops champion): the head
  sculpted at 0.62 of its old size, the one eye drawn wider in it so it stays
  the face's big feature, the beard fuller and longer than the smaller head
  alone gives; legs 10 → 16.4 pixels over the same sandalled feet, the kilt
  with them; broader shoulders and arms that still reach down the thigh; the
  ram's skull 0.8. Gorgos's bear hood is sculpted to the smaller head; the
  champion's crown sits on the mane (`rig.crownY`) and is sized to the head.
  He grew a little, 1.83 → 1.94×, still "bigger".
- **Laistrygonian**: head 0.78 (hair and beard round it as before), legs 10 →
  12.2 over the same feet, the kilt with them, arms 1.1 longer. His cells are
  0.92 of a hero's density, so the elite stays under 20k triangles (it was
  21.7k before this round).
- **Earthborn**: head 0.88, legs 9 → 10 over the same feet.
- **Minotaur**: the bull's head 0.8, the horns kept near their old sweep and a
  little thicker, legs 15 → 20 over the same hooves, the loincloth and arms
  longer. He grew to 2.09× ("much bigger" is 1.85–2.7).
- **Medusa**: the cowl, face, veil and staring eyes 0.82; the snakes keep
  their size, so the hair writhes larger round the smaller head; a longer
  trunk and robe keep her height.
- **The Furies**: one builder graded by size: the plain Fury (1.4×) gets a
  skin head 0.82 of a hero's, Alecto and her sisters (1.9×) 0.58, their wild
  curls standing out further round it; longer trunks, arms and dresses keep
  their height.
- **Bronze Warden**: the helm 0.62, legs 11 → 14.8 over the same boots,
  broader shoulders, longer arms.
- **Tyson** (his 1.5× kept): a skin head of 7.2 pixels instead of 8, legs 12
  → 13.8. (With the skin-cube measure alone he already passed, 0.221; the
  reshape also passes the old hat-and-all measure.)
- **The Pale King**: his crown's spikes lowered (3.2 → 2.4); the crown had
  topped him to exactly the leg rule's line.

**What the leg check flags beyond these.** Ares (0.417 at 1.60×) and
Procrustes (0.404 at 1.65×) pass; so do the dracaenae, the empousa champion,
the skeleton and spartoi champions and Chiron. Left as follow-ups for the
owner (`"legs": "followUp"`, warnings): the Queen of the Gale (0.327, needs
0.344) and the harpy champion (0.333, needs 0.351), whose legs are an
eagle's, so whether to lengthen them is a design call. Bronzebeak is a bird
and exempt.

**The sheet.** A before/after sheet (the concept crop, the model before and
after, Percy beside each) was rendered for the round; the renderer is a
scratch tool, not part of the repository.

### Round 9: adults, former adults, headwear and the giant scorpion (the owner's rules)

The owner: "Living Statue, Skeleton Warrior, Spartoi should all be notably
larger than Percy, not counting their helmets. These are former adults and
Percy is an adolescent, and they should read that way. Also, why are the
Karpos so small, are you counting their huge plumes? … the Giant Scorpion …
should also be bigger than a person to be intimidating, probably 2–3 times as
large as now."

**Why these were missed (an honest account).**

- **The categories were fitted to what was there.** In round 6 a model's
  category was chosen from the books, the sheets and the model as built. The
  skeleton, the spartoi and the living statue were already about Percy's
  height, and "a person-sized figure" on the sheets matched that. So they were
  filed as "same", with "a statue of a person" as the reason. Nobody asked
  *which* person: a grown man, or a twelve-year-old?
- **There was no rule for adults.** The heroes are adolescents, but "a
  person: about Percy's height" was written for every teacher, tourist,
  skeleton and statue alike.
- **The measure counted headwear.** Round 4 took weapons, wings and props
  out of the body, but not helmets, crests, plumes or hats. Effects:
  - the skeleton's helmet made it read 0.89× where its body was 0.83×;
  - the spartoi's crest made it 0.89× where it was 0.72×;
  - the statue's crest made it 0.91× where it was 0.81×.
  - **The karpos was much worse**: its wheat spray counted as body, so it
    read 0.68×, "small" and passing, while the creature under it was 0.44×.
    The owner's suspicion was right.
- **The scorpion followed real life and the books.** It was filed as
  "tiny / knee-high", read by its length. The rule that an intimidating
  enemy should outsize a person whatever its book counterpart was never
  written down.
- **The check could only enforce what the spec said.** It passed all of
  these, because the spec itself was wrong.

**The principles** (now in [sizes.json](sizes.json) "about", applied to every model):

1. Percy and the young heroes, adolescents, are the "same" reference, and so
   are the teen campers, the Hunters and other kids.
2. Adult humans read as adults, slightly bigger than Percy. The new
   **"adult"** band is 1.0–1.2×; with a full head of hair an adult measures
   1.1–1.15×.
   - `ADULT_SCALE` 1.24 → 1.4 puts an adult's skull 1.19× Percy's.
   - An adult in a hat, or with cropped hair, measures about 1.0–1.05×,
     because Percy's own curls are a sixth of his height.
   - A grown-up the books call short or tiny (Mr. D, Coach Hedge, Grandma
     Mae) stands about a twelve-year-old's height, skull level with Percy's,
     in "same".
3. Former adults made monstrous (skeleton warriors, spartoi, living statues of
   people) are "bigger", about 1.3–1.5×, measured without helmets, crests,
   plumes or hats. Their champions stand a step above.
4. An enemy meant to intimidate outsizes a person, even when its book or
   real-life counterpart is small. Game drama beats canon.
5. Small fodder still reads clearly at gameplay distance: no smaller than
   about 0.75×, its plume aside.

**The measurement fix: headwear is not body.**

- What counts as headwear: helmets, crests, plumes, hats, caps, crowns,
  circlets and horns.
- How it is marked: `proportions.js markHeadwear` sets `userData.headwear` on
  the meshes. A builder draws its headwear with a second voxel kit on the same
  part, so in game the headwear still merges into that part (charmat.js) and
  costs no extra draw. `perf/bodysize.cjs` leaves it out and lists it as
  "headwear".
- People and mortals: they take a `hat` slot in their parts (people.js,
  mortals.js). `character.js mergeChildren` keeps a hat apart only while the
  part merge is off, which is how the checks measure.
- What is marked: every helmet and crest (skeleton, spartoi, statue,
  Clarisse), Annabeth's cap, Grover's, Hedge's and the Minotaur's horns, Mr.
  D's wreath, every champion crown, the Bronze Warden's crest, Gorgos's bear
  hood, the karpos's wheat spray and every person's hat, cap, visor or
  headscarf.
- What stays body: hair, a cowl that is the creature's own head (the karpos),
  and a bird's own feathered crest (Bronzebeak).

Re-measured, all 103 models, with no model changed (body × Percy):

| model | before | headwear left out | what it meant |
|---|---|---|---|
| karpos / slinger | 0.68 / 0.69 | 0.44 / 0.44 | the plume was most of its "body" |
| spartoi | 0.89 | 0.72 | |
| skeleton | 0.89 | 0.83 | |
| living statue | 0.91 | 0.81 | |
| Minotaur | 2.09 | 1.78 | horns; moved to "bigger" (was "muchBigger") |
| Clarisse | 1.09 | 0.84 | helmet; "same" now runs down to 0.82 |
| Annabeth | 0.97 | 0.86 | cap |
| Grover | 1.10 | 1.00 | horns |
| tourist, farmer, the Mist's mortal | 1.02 | 0.90 | sun and straw hats |
| Coach Hedge | 0.90 | 0.79 | cap |
| Big Earl / Ranger Mae / Mrs. Pruitt / Sal | 1.09 / 0.99 / 0.95 / 1.00 | 0.98 / 0.88 / 0.90 / 0.94 | cap, hat, headscarf, cap |
| Grandma Mae / Katie | 0.80 / 0.96 | 0.75 / 0.86 | bucket hat, straw hat |
| Pale King / skeleton and spartoi champions | 1.35 / 1.33 / 1.23 | 1.20 / 1.15 / 1.00 | crowns, helmets |
| Queen Gale / harpy champion | 1.57 / 1.61 | 1.47 / 1.56 | crowns; their legs now pass the leg rule, so their follow-up marks are gone |
| Stymphalian champion | 0.78 | 0.58 | crown; to "small" |
| Bronze Warden / Gorgos / cyclops champion | 1.84 / 2.29 / 2.29 | 1.74 / 2.11 / 2.10 | crest, hood, crown; categories hold |
| dracaena / empousa champions | 2.62 / 1.42 | 2.36 / 1.29 | crowns; categories hold |

Every other model moved by 0.03 or less, which is run-to-run jitter from the
rigs' random idle phase.

**The changes.** Every regrown model keeps hero-sized cells: it is sculpted
in cells of `voxDensity`, and `proportions.js reshape` gives it the
proportions of its size. The head rule and the leg rule pass for every model.

| model | body × Percy, before → after | triangles |
|---|---|---|
| skeleton warrior | 0.89 (0.83 without the helmet) → 1.40 | 1,506 → 4,324 |
| spartoi | 0.89 (0.72) → 1.40 | 2,286 → 4,538 |
| living statue | 0.91 (0.81) → 1.41 | 1,108 → 4,048 |
| skeleton champion | 1.33 (1.15) → 1.77 | 2,538 → 6,546 |
| spartoi champion | 1.23 (1.00) → 1.77 | 2,938 → 6,084 |
| the Pale King | 1.35 (1.20) → 1.77 | 3,358 → 6,308 |
| karpos / slinger | 0.68 (0.44) → 0.79 / 0.80 (1.22 / 1.25 with the plume) | 4,126 / 4,046 → 4,300 / 4,236 |
| giant scorpion | 0.26 → 0.59 (its back); tail crown at rest about 1.8 → 3.97 blocks | 1,524 → 11,926 |
| scorpion champion | 0.66 (0.53) → 0.78; tail about 5.2 blocks | 17,686 → 17,062 |
| the Red King | 0.83 → 1.12; tail about 5.8 blocks | 21,126 → 18,140 |

- **Skeleton warrior, spartoi, living statue.**
  - Rig scale 1.15 / 1.0 / 1.05 → 1.56.
  - A grown man's proportions: the skull 0.92 of a hero's skin cube, legs 12
    → 19 pixels over the same boots or plinth, a trunk 1.1 longer, limbs
    0.85–0.88 as thick, arms 1.35–1.4 longer (to mid-thigh). Head/body is
    0.19–0.20, under the rule's 0.25 and over Percy's head in absolute size;
    legs/body is 0.45.
  - The skeleton is re-sculpted. Its trunk is bones under the plate carrier:
    floating ribs at its sides, the lumbar spine, the pelvis and sacrum over
    the belt, and a neck of bare vertebrae. It has a jaw under the painted
    skull, two forearm bones, a wrist and finger bones, a kneecap, shin
    bones and low boots.
  - The vest, sleeves, shorts, helmet dome, the spartoi's tunic, scarf and
    helmet, and the statue's cuirass, helmet and shield are shells of
    hero-sized cells.
  - The statue's head is measured along its own axis (`markHeadCore`),
    because it is turned.
  - Stats: radius 0.45–0.5 → 0.65–0.7, height 2–2.1 → 3.2–3.4 (under a
    dungeon door's 4 and a corridor's 5). The melee reach of the longer arms
    goes from 1.8 → 2.1 (spartoi) and from 2.2 → 2.5 (statue).
  - Champions: the skeleton and spartoi looks go 1.4 → 1.26 and the Pale King
    1.45 → 1.26, so all three stand about 1.8×, a step above. The Pale King's
    crown is sized to the smaller skull and set again after the reshape.
- **Karpos and slinger.**
  - Rig scale 0.74 → 1.27; legs 8 → 10 pixels over the same root toes.
  - The plume is kept, in its own kit.
  - Stats: radius 0.4 → 0.48 and height 1.25 → 1.9. That is 0.96 between two
    of them plus the separation gap, still a tight swarm.
  - The awns are sunk into their last grains (one hung off by a corner,
    perf/islands.cjs).
- **Giant scorpion.**
  - Rig scale 1.25 → 2.8 (2.24×). Its back stands over Percy's waist, and the
    tail's crown at rest is 3.97 blocks, under a dungeon door's 4, with the
    sting over his head.
  - Every plate and segment is a shell of cells, at 0.8 of a hero pixel's
    density, gaining only √k for a champion.
  - Stats: radius 0.8 → 1.3 (it fits a 5-wide corridor between its rail
    posts) and height 1.3 → 2.4.
  - Reach from its size: range 2.2 → 3.6; the pinch trigger 1.9 → 3.4 and
    its reach 2 → 3.2; the sting lands 1.5 → 2.8 ahead and is 0.9 → 1.4
    wide. Its body lunge grows ×2.24.
  - Windups, cooldowns and damage are unchanged.
  - Champions: the Red King 2.4 → 1.45 and the Road West look 2 → 1.32, so
    their size against the old scorpion is about the same as before. The
    Red King's den, 19 × 15 and 6–7 high, still holds him.
- **Adults.**
  - `ADULT_SCALE` 1.24 → 1.4 for every mortal disguise but the student and
    for the open world's adults.
  - Charon 1.32 → 1.45, Argus 1.42 → 1.47, Big Earl 1.34 → 1.4. Ranger Mae,
    Trudy and Galene go to `ADULT_SCALE`.
  - Mr. D 1.05 → 1.18, Coach Hedge 1.08 → 1.18, Grandma Mae 1.02 → 1.18
    (short adults, skull level with Percy's).
  - The Mist's real mortal goes to height 2.2 (from 1.9) and radius 0.4
    (from 0.38).
  - A disguised monster keeps enemy.js's 0.38 / 1.9 while disguised (enemy.js
    is out of this round's scope).
  - These are rescaled skin-box models, not re-sculpted, so their cells grow
    with them (×1.13). Argus is held at 1.47 because his hero-sized head is
    at the head rule's top for his size.

**Classification** (sizes.json, each with its reason):

- **Adult** ("adult" band): teacher, guard, tourist, farmer, old lady,
  bellhop, salesman, the Mist's mortal, Quintus, Charon, Sisyphus, Argus,
  Big Earl, Mrs. Pruitt, Ranger Mae, Sal, Trudy and Galene the Nereid.
- **Short adult** ("same"): Mr. D, Coach Hedge, Grandma Mae.
- **Teen** ("same"): Percy, Annabeth, Grover, Clarisse, Thalia, Nico, Luke,
  the student, Katie, Travis, Juniper, Beckendorf, Lee, Zoë, Rachel, Phoebe,
  Bianca, Silena and Chad. Tyson is the owner's 1.5× young Cyclops.

**Left for the owner.** The ghost (0.89×), the shade (0.97×) and the keres
(0.99×) are dead adults, but they are spirits, not adults "made monstrous".
They stay "same" unless the owner wants them grown too. Grover reads 1.00×
without his horns, against the wiki's tall 5 ft 9 in.

### Round 10: adults are 1.2–1.3×, not giants (the owner's rules)

The owner: ghosts, shades, keres and other adults should be roughly 1.2–1.3×
Percy's height; the skeleton warriors, statues and the like read about 1.5×
and should come down to that too. "They should be bigger but not read as
giants." Champions stay a modest step above.

**What the "1.5" was.** In the workbench's True scale with the Percy
reference, the skeleton's body (round 9's measure, without the helmet) was
1.40×, but the helmet put its visible top at 1.48×. The spartoi read 1.40×
bare and 1.63× to the top of its crest, the living statue 1.42× and 1.56×.
So what the eye sees, helmet included, was 1.5–1.65×. The round 10 rule
caps that too: about 1.2–1.3× without headwear, and no more than about 1.4×
with it.

**The spec** ([sizes.json](sizes.json)):

- `adult` is now 1.15–1.35×, and it covers grown-up humans (mortals,
  teachers, tourists, adult NPCs and people), the dead (ghost, shade, keres)
  and former adults made monstrous (skeleton, spartoi, living statue).
- `adultChampion` (new) is 1.42–1.6×, for their champions: about 1.5×.
- Both bands are marked `aside`: a class of models beside the ladder of
  sizes rather than a step of it. `test/sizes.test.mjs` checks the ladder's
  order and overlaps without them.
- The principles text in `about` and the categories' note say this.
- **Short adults stay short.** Mr. D, Coach Hedge and Grandma Mae keep the
  owner's earlier ruling: about a twelve-year-old's height, in `same`
  (0.97×, 0.86×, 0.86×). This round leaves them unchanged.

**How the adults are measured.** An adult with a full head of hair measures
to the top of the hair, about 1.25–1.3×. One in a hat, or with cropped hair,
measures to the skull. Percy's own curls are a sixth of his height, so a
hatted adult is set to 1.2× at the skull. That puts its skull level with the
others', with the hat on top at 1.3–1.35×.

**Before → after**, body without headwear, then with headwear, then the
whole box (the whole box includes held props: the statue's raised spear,
Charon's oar). All are × Percy's body, from `perf/bodysize.cjs`; Percy's
body is 2.179.

| model | body × Percy | with headwear × Percy | whole box × Percy | triangles |
|---|---|---|---|---|
| mortal | 1.01 → 1.20 | 1.14 → 1.34 | 1.15 → 1.34 | 2140 → 2140 |
| ghost | 0.88 → 1.24 | — → — | 0.92 → 1.30 | 1730 → 2014 |
| skeleton | 1.40 → 1.25 | 1.48 → 1.32 | 1.48 → 1.32 | 4324 → 3600 |
| spartoi | 1.40 → 1.24 | 1.63 → 1.39 | 1.64 → 1.40 | 4538 → 4044 |
| gorgon_statue | 1.42 → 1.24 | 1.56 → 1.36 | 1.70 → 1.48 | 4048 → 3226 |
| shade | 0.97 → 1.23 | — → — | 1.05 → 1.31 | 3760 → 4226 |
| keres | 0.99 → 1.23 | — → — | 1.12 → 1.39 | 2802 → 3350 |
| teacher | 1.15 → 1.27 | — → — | 1.16 → 1.28 | 1664 → 1664 |
| guard | 1.00 → 1.18 | — → — | 1.00 → 1.19 | 120 → 120 |
| tourist | 1.01 → 1.20 | 1.14 → 1.34 | 1.15 → 1.35 | 2140 → 2140 |
| farmer | 1.01 → 1.20 | 1.14 → 1.34 | 1.14 → 1.35 | 2568 → 2568 |
| old_lady | 1.15 → 1.26 | — → — | 1.16 → 1.27 | 2424 → 2424 |
| bellhop | 1.12 → 1.23 | — → — | 1.12 → 1.23 | 648 → 648 |
| salesman | 1.12 → 1.24 | — → — | 1.12 → 1.24 | 1620 → 1620 |
| shore_nereid | 1.09 → 1.25 | — → — | 1.10 → 1.26 | 7076 → 7076 |
| quintus | 1.15 → 1.27 | — → — | 1.16 → 1.28 | 2662 → 2662 |
| asphodel_charon | 1.16 → 1.29 | — → — | 1.31 → 1.52 | 2994 → 2994 |
| asphodel_sisyphus | 1.15 → 1.27 | — → — | 1.16 → 1.28 | 3422 → 3422 |
| camp_argus | 1.14 → 1.27 | — → — | 1.15 → 1.28 | 2938 → 2938 |
| rt_turnpike_earl | 1.02 → 1.20 | 1.13 → 1.33 | 1.14 → 1.33 | 2554 → 2554 |
| rt_auntyem_pruitt | 1.02 → 1.20 | 1.08 → 1.27 | 1.08 → 1.28 | 2904 → 2904 |
| rt_stlouis_mae | 1.02 → 1.20 | 1.16 → 1.35 | 1.16 → 1.36 | 3772 → 3772 |
| rt_vegas_valet | 1.05 → 1.24 | 1.12 → 1.32 | 1.12 → 1.32 | 2346 → 2346 |
| rt_la_guide | 1.05 → 1.20 | 1.07 → 1.23 | 1.07 → 1.23 | 3556 → 3556 |
| asphodel_pale_king | 1.77 → 1.50 | 1.95 → 1.65 | 1.95 → 1.66 | 6308 → 5082 |
| kind:skeleton | 1.77 → 1.50 | 1.99 → 1.68 | 1.99 → 1.69 | 6546 → 4936 |
| kind:spartoi | 1.77 → 1.49 | 2.07 → 1.67 | 2.07 → 1.68 | 6084 → 5042 |

Every other model moved by 0.04 or less, which is idle-phase jitter.

**The changes.**

- **Skeleton, spartoi, living statue.**
  - Rig scale 1.56 → 1.39 / 1.38 / 1.37.
  - Every mass is drawn with `voxDensity`, so the smaller body is
    re-voxelised in hero-sized cells, not shrunk.
  - Their round 9 grown-man proportions stay: head/body 0.19–0.20, legs/body
    0.45.
  - The spartoi's horsehair crest is lower (strands 3.6–6 → 2.2–3.7 head
    pixels), so with its helmet it tops out at 1.39×.
  - Stats:
    - radius 0.65–0.7 → 0.58–0.62;
    - height 3.2 / 3.4 / 3.3 → 2.85 / 3.0 / 2.9;
    - the melee reach that came from their longer arms, 2.1 → 1.9 (spartoi)
      and 2.5 → 2.25 (statue).
  - Windups, cooldowns, damage and shots are unchanged.
- **Their champions.**
  - Look scale 1.26 → 1.2 for the skeleton kind, the spartoi kind and the
    Pale King, so each stands 1.5× (1.65–1.68× with crown or helmet).
  - Hit size and reach follow the look scale (`champions.js
    applyChampionLook`).
- **Ghost.**
  - Rig 1.2 → 1.74, with a grown-up's head (`reshape` 0.9).
  - The skin is painted at the finer resolution its size needs (`skinMat`
    scale).
  - The shroud, hair and wisps are drawn in hero-sized cells (`voxDensity`;
    before this round they were at the rig's own skin pixel).
  - Stats: radius 0.45 → 0.55, height 2 → 2.8.
- **Shade and keres.**
  - Rig 1.15 → 1.48 and 1.3 → 1.64, in hero-sized cells (`voxDensity`).
  - The keres's mane clumps, finer now, are seated on the skull (`clumps
    on`), so none floats (`perf/islands.cjs`).
  - Stats: radius 0.4 / 0.45 → 0.48 / 0.52, height 1.8 → 2.3, and the reach
    of their longer arms 1.5 → 1.8.
- **Mortals and the open world's adults.**
  - `ADULT_SCALE` 1.4 → 1.62 for a full head of hair.
  - `ADULT_SCALE_HAT` 1.72 for one measured to the skull: the guard, tourist,
    farmer, Big Earl, Mrs. Pruitt, Ranger Mae and Sal.
  - Galene and Trudy (close-set hair) are 1.66, Charon 1.68 and Argus 1.72,
    the tallest of the adults.
  - Every grown-up gets an adult's smaller head, `ADULT_HEAD` 0.88. The skin
    box, hair, beard, hat and ponytail are reshaped together. Head/body goes
    from 0.26–0.30 → 0.24–0.27, inside the head rule at their size, and
    legs/body rises to 0.33–0.37.
  - The Mist's real mortal goes to height 2.7 (from 2.2) and radius 0.45
    (from 0.4).
  - These are skin-box models: their limbs and hair cells grow with the rig,
    about ×1.16–1.23. They are not re-sculpted in hero-sized cells, which
    would mean redrawing each of 18 people. Their skins are already painted
    at 128 × 128.

**Checks:**

- `perf/bodysize.cjs --check`: 103 models, 0 failing, and no head or leg
  warnings.
- `perf/islands.cjs --check` passes.
- `animlint`: 0 problems.
- `weapons.cjs`: 0 failing.
- The game's tests pass.
- Smoke check: 0 page errors.

Lineups (Percy at the left; lines at 1.0, 1.25 and 1.5× Percy's body) were
rendered for this round but are not committed.

**Also this round: shots and deaths.**

- **The skeleton's shot.** The wind-up of a shot played the hero "cast"
  pose: both arms raised forward, the wrist straight. So the rifle, held
  along the hand, pointed at the sky. A shooter (`rig.levelAim`: the
  skeleton, its champion and the Pale King) now shoulders its weapon in the
  wind-up and holds it level at the target. The recoil after it is a kick of
  the arms and muzzle, and then it lowers to the hip still pointing forward.
  The wrists turn against the arm, the torso's pitch and the hunch
  (`character.js aimPose`). The rifle itself is now built level.
  `perf/weapons.cjs` checks every ranged monster and champion that holds a
  weapon: aim and kick must be ≥ 0.85 forward, the lowering ≥ 0.3.
- **Deaths in the air.** The death fall turned the body about the hip joint
  and left the hips at standing height. A body laid flat therefore hung at
  hip height: the skeleton (lying for 3 s as bones) 0.8 m up, and the long-
  legged spartoi, statue, cyclops and Laistrygonian likewise. The same was
  true in game. Beasts rolled on their side had the same fault (QuadRig).
  - Now `character.js groundLying` lowers the hips until the posed body's
    lowest point is on the floor. It is used for every humanoid and four-
    legged rig in a death fall or down, and while getting back up.
  - A held weapon falls along the body instead of standing up.
  - `animlint` has a new `float` check: a fall that ends more than 0.12 m
    (or 4% of the height) above the floor is flagged.
  - With the fix switched off, the check finds 15 models: Tyson; the pup,
    ghost, dracaena, hellhound, empousa, skeleton, spartoi, telekhine,
    statue, cyclops, boarlet, Earthborn, Laistrygonian and shade in their
    in-game deaths. With the fix on, it finds none.

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

## The Chimera: twice the size (round 9)

- **The owner's ruling:** about twice as large as it was. Its body went from
  3.48 m (1.6× Percy, "bigger") to 6.92 m (3.18×, "giant"); stat height 3 → 6
  and radius 1.3 → 2.6 (`bosses.js`). The sheet draws it 3.52× its Percy.
- **Re-sculpted, not rescaled** (`bossmodels.js`, rig scale 2.5 → 4): a big
  cat's body (deep chest, shoulder blades, haunches, a tucked waist) on long
  legs set wide in a planted stance (`stance`, `legSpread`), big paws with
  cream claws, and a diamondback rattlesnake for a tail rising over the back.
- **Heads:** the lion's and the goat's are equal, side by side on twin necks
  from the shoulders. The sheet half hides the goat behind the lion, but the
  owner says that is not meant. Both mouths breathe fire
  (`rig.mouthWorld(out, i)`).
- **Proportions,** against the body's length (chest to rump), read off the
  sheet (design/sizes.json `quadShape`):
  - the lion's face: 0.57 → 0.32 (sheet 0.34);
  - its mane: 0.81 → 0.45 (sheet 0.60);
  - the belly over the withers: 0.41 → 0.48 (sheet 0.42; a little higher,
    for the owner's longer legs);
  - the leg root over the body height (the bodysize table's leg/body): 0.26
    → 0.46.
- **Voxels:** first cut to a boss's 45k triangles, with body cells of
  0.16 m and head cells of 0.13 m (a hero's cube is 0.06 m): 43.6k
  triangles. Round 10, the owner raised its budget to about 70k (hard cap
  75k), as it is a single boss on screen:
  - cells of 0.10 m on the body and legs, 0.085 m on the heads, 0.075 m on
    the paws and hooves and 0.13 m on the serpent tail (`VD.chimera 1.85`,
    `chimeraHead 1.75`, `chimeraTail 1.3`);
  - still greedy-meshed (`rig.merge`); its tone jitter and ragged edge are
    picked per block of 3 cells (`rig.hg = 3`), so the merging can join
    them;
  - 69.6k triangles, the same 25 meshes and the kit's 4 materials as before
    (no new material or draw).
- **Colours** (round 10, sampled off the sheet by pixel): a warm tawny lion
  (`TAN`, orange mane `maneC`, a bright muzzle) over a cream belly; a
  darker, browner goat rear (`PALE`) on dark grey-brown goat legs (`GLEG`)
  ending in dark cloven hooves; the goat's head and neck charcoal-brown
  (`greyF`); the serpent tail in dark and gold bands.
- **The arena:** the observation deck (`world/rooms.js`, `DRESS.arch.boss`)
  was 13 blocks wide with a 5-block ceiling. It is now 19 wide and 8 high
  (`archHall` `half: 9, rise: 3`), so a 6-block-tall boss can move in it.
- **Reaches** in its patterns follow the size: the fire breath's cone is 11 →
  14 (the mouths sit about 5 m ahead of its middle), the tail strike's ring
  5 → 7.5, and the pounce's landing 3 → 4.5. It stops 5.5 from its target,
  not 3.5.

## History moved out of the model code

The model builders' comments used to carry their history ("pass 4: …",
"round 9: …", "the owner: …", "was …"). They now say only what the code does
and why; the history they held is kept here when it was not recorded above.
The builders live in `game/js/entities/models/` (one module per family, the
fodder in `models/fodder/`, the bosses in `models/bosses/`), the stat blocks
in `game/js/data/`.

**Round 8: heads toward each creature's own sheet** (the owner: "it
shouldn't converge to a single size, only toward the proportion in the
source image"; design/sizes.json `headSheet`). Round 7's heads went too far
for three of them:

- **Cyclops:** head 0.62 → 0.84 (vox-bosses-2 draws it about 0.22 of his
  height). The larger head sits 2.2 pixels lower between the shoulders, a
  touch forward of the chest, so he stands as tall as before and his legs keep
  their share of his height.
- **Laistrygonian:** head 0.78 → 0.86 (his sheets draw it 0.18–0.2 of his
  height).
- **Alecto and her sisters:** head 0.58 → 0.66 of a hero's skin cube (the
  vox-enemies Fury's head is about 0.185 of her height).

**The Minotaur's loincloth.**

- Round 8, after vox-bosses-1: the gold belt and its medallion moved to the
  hips, with a white loincloth under them.
- Round 9: fitted tight. The belt's ring (5.6 × 4.1 pixels) hugs the
  sculpted waist (about ±4.7 wide and −3.3…4 deep at belt height). The hem
  first hung in fourteen panels, each on its own pivot swinging with the
  thigh behind it; then, as his thighs are far wider than his waist and cloth
  all round flared into a skirt, it became a front apron and a back apron
  only, tipped out just enough to clear the thigh sculpt.
- The owner then preferred the aprons hanging still: they no longer swing,
  and the legs may pass through them (they are there for modesty, not cloth
  physics).

**Model passes** (the comments' "pass 3", "pass 4", "pass 4b" and "pass 5",
reworks of the looks alongside the size rounds):

- **Pass 3, the bosses after vox-bosses-1:**
  - Medusa: a finer sculpt grid (`rig.vd` 1.1, the snakes above all); the
    snakes slimmer and longer, carved from small cells with scaled bodies, a
    pale belly, dark bands, an S over six joints and wedge heads, where they
    were chunky boxes.
  - Minotaur: a V from broad shoulders to a narrow waist, defined pecs with a
    cleft, a slimmer gut; rounder deltoids, slimmer upper arms and elbows,
    longer arms so the fists hang low.
  - Procrustes: a tall, lean man instead of a wide box (a smaller head,
    longer legs, a slim suit), about the same height.
  - Ares: a smaller head, longer legs and an open leather jacket over a
    narrower waist, the chest and arms still huge; a short crop and a trimmed
    beard, so his face shows.
  - Cerberus: a coarser body grid and finer heads, greedy-meshed
    (`rig.merge`).
  - Cyclops: rounder trunk masses (`pw` nearer 2), round deltoids, biceps
    bulging forward, narrow elbows.
  - The empousa and the spider built bigger (a champion, `BUILD.k`): more,
    smaller flame and tassel cubes; a big spider (the Road West champion at
    1.7) takes the spider queen's fine build without her crown and gears.
- **Pass 4, the owner's review against vox-enemies and vox-bosses-1:**
  - The hellhound: a powerful crouching dog, not a lean column. The trunk
    wider than the head, a fifth longer and deeper in the chest; shorter,
    thicker legs planted wide (`stance`), their roots deep in the body
    (`legY`) and hung from the torso (`legsOnTorso`); the head 24 → 19 pixels
    (the owner: a large creature without a Minecraft head); a heavier collar
    ring standing proud of the ruff; a dark mouth with pink gums only along
    the jaws (the owner's note); the cracks as glowing magma, an orange-yellow
    core in a deep red rim. The smoke puffs at the jaws were dropped: they
    read as a nose sticking out and wiggling (the smoke aura stays).
  - Cerberus: the body far bigger for its heads, broad and deep, crouched on
    thick legs planted wide; then the whole of him far bigger, at the owner's
    asking and after the book, about 7.75 blocks tall at rest (3.5 Percys,
    1.2 Shadowfangs), 8.6 wide and 13 long with the tail, re-sculpted at that
    size with smaller heads (5.6 and 6) and finer grids. Pass 4b added the
    sheet's massive hump over the shoulders, the back sloping to a lower rump
    and the belly tucked well up.
- **Pass 5, the hellhounds' darks** (the owner: "a bit washed out"): the
  sheet's coat is near-black, RGB 8–47, and the game drew it at about 80–90
  by day (mostly the open world's distance fog, also the sheen of a
  near-black dielectric and the flat hemisphere fill). The coat palette went
  to 0.75 of its tones (`HOUND_DIM`), matt (roughness 1) with metalness 0.2;
  the magma, eyes and teeth were left as they were.

**Fixes the comments recorded:**

- The Furies' whip used to hang from the fist wherever the arm pointed,
  dangling straight down and trailing up to 2 m through the floor. It is
  now posed in the rig's own space and bent up along the floor
  (`models/whip.js whipPose`).
- A champion lost its kind's own behaviour (`rig.onTick`, the fodder's
  charges and restyled shots) when `buildChampionRig` set its tick; the tick
  now calls it.
- Gorgos was first built on the cyclops; he has his own builder on the
  cyclops's giant frame and cell size, and still fights as the cyclops kind.
- Procrustes's robe panels below the waist hung on the torso, so they stood
  still over the thighs while the legs walked through them
  (`perf/props.cjs`); they hang on a flap that swings with the striding leg
  (`character.js swingSkirt`).
- Luke's scabbard chape and throat were set at each other's depth, so the
  chape floated in front of his thigh (`perf/islands.cjs`).
- The Colchis bull calf's plates were made darker than its first build:
  bronze-brown, copper and dark iron, dull brass rivets, nothing yellow.
- The fodder's concept sheet `vox-ow-fodder-fix` replaced the earlier
  sheets' ants and king crab.
- The keres's finer mane clumps of round 10 no longer reached the skull, so
  each is seated on it (`clumps on`).

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
- **Round 4 doubts, by body** (nothing changed):
  - Laistrygonian: body 1.62×, near the books' 1.4×; the earlier ×0.8 idea
    came from the 2.27× box.
  - Medusa: body 1.57×; the 1.96× was her snake hair.
  - Bronze Spider: body 0.27×, under the design's "size of a dog"; ×1.25
    (scale 0.85 → 1.05) would make it one.
  - Dracaena: body 0.87×, a little short for a woman (the concept sheet draws
    her about twice Percy). Resolved in round 6: re-sculpted to 1.80×.
  - Stymphalian Bird: 0.41× standing level, about 0.7× if it stood upright;
    its pose is undecided.
  - The plain Fury's hovering hair (4.35) passes 0.35 over a 4-high door's
    lintel, and Alecto's (about 6) passes over the museum's; their collision
    heights (3.9) fit the doors.

## Lineups

The lineups are working images outside the repository: Percy beside each
model, at true scale, with a grid line every block. Run `sz/lineup.cjs <dir>`
and then `sz/sheet.py <dir> out.jpg` against the workbench to make them again.

## The full table

Heights are in blocks (Percy = 2.19; his body 2.18). An arrow runs from
round 0 (before this audit) to now (round 4). "Body height" is the round 4
body measure (arms, held things, wings, whips, tails and flames left out),
measured after round 4; it has an arrow only where round 4's second pass
changed it. The Bronze Warden's stat column shows its look's
kind (automaton × 2.4); in game its hit height is now measured from the
model (4.05). The arrows show this audit's changes and the other agents': the
hellhounds, the Mist Serpent and Cerberus were changing under their rebuilds
while this was measured. Heroes, mortals and people are measured too; none is
outside 0.82–1.19× except Tyson and Chiron, a centaur. Round 6 corrects the
harpy, the dracaena and their champions (their body column runs to the round
6 measure). The "expected" column is the old judgement; the size each model
must now keep is its category in [sizes.json](sizes.json), which the check
enforces.


### heroes

| id | name | rendered height (× Percy) | body height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|---|
| percy | Percy | 2.19 → 2.17 (1.00 → 0.99×) | 2.16 (0.99×) | 1.7 | — / — | 1.00 | reference | OK | — |
| annabeth | Annabeth | 2.11 → 2.10 (0.96×) | 2.09 (0.96×) | 1.2 | — / — | ~0.95–1.0 | books: same age as Percy | OK | — |
| grover | Grover | 2.40 (1.10×) | 2.39 (1.10×) | 1.2 | — / — | ~1.0 | Riordan Wiki infobox: 175 cm (5 ft 9 in), "a tall satyr" | OK | — |
| tyson | Tyson | 3.30 → 3.29 (1.50×) | 3.29 (1.51×) | 2.1 | — / — | ~1.05–1.2 | Riordan Wiki infobox: 6 ft 0 in (183 cm); request: "a head taller" | big (1.50×), kept by the owner | keep (owner) |
| clarisse | Clarisse | 2.38 → 2.36 (1.08×) | 2.36 (1.08×) | 2.6 | — / — | ~1.05 | TLT: big and tough, older | OK | — |
| thalia | Thalia | 2.25 → 2.24 (1.03 → 1.02×) | 2.24 (1.03×) | 2.6 | — / — | ~1.0 | TC | OK | — |
| nico | Nico | 2.23 → 2.25 (1.02 → 1.03×) | 2.24 (1.03×) | 1.4 | — / — | ~0.9–1.0 | TC: ten when found; older later | OK | — |

### npcs

| id | name | rendered height (× Percy) | body height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|---|
| chiron | Chiron | 2.99 → 3.00 (1.37×) | 3.00 (1.38×) | 1.8 | — / — | ~1.4 | Riordan Wiki: "taller than an average man"; a stallion's body under a man's torso | OK | — |
| mr_d | Mr. D | 1.89 (0.86×) | 1.87 (0.86×) | 1.1 | — / — | ~0.9 | TLT ch. 5: a short, pudgy man | OK | — |
| dummy | Training Dummy | 1.56 → 1.57 (0.71 → 0.72×) | 1.55 (0.71×) | 0.8 | — / — | — | prop | OK | — |

### monsters

| id | name | rendered height (× Percy) | body height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|---|
| pup | Hellhound Pup | 0.80 → 2.66 (0.37 → 1.22×) | 2.64 (1.21×) | 2.8 | 1.10 → 2.70 / 0.45 → 0.80 | over 1.0 (the owner) | game invention (hellhound pup); the owner's ruling, round 5: "the standard 'Hellhound Puppy' is Mrs O'Leary … larger than a person" | **re-sculpted** (round 5): a head taller than Percy, about half the elite hellhound | rebuilt at hero voxel size (bigPup), not scaled; 8.7k triangles |
| rat | Sewer Rat | 0.62 (0.28×) | 0.64 (0.29×) | 1.2 | 0.85 / 0.42 | ~0.3 | a sewer rat (game) | OK | — |
| serpent | Mist Serpent | 0.57 → 1.31 (0.26 → 0.60×) | 1.30 (0.60×) | 3.6 | 1.30 / 0.55 | — | game invention (Mist Serpent) | n/a | being rebuilt by another agent |
| mortal | Mortal | 2.21 → 2.23 (1.01 → 1.02×) | 2.21 (1.02×) | 1.2 | 1.90 / 0.38 | 1.0 | a person | OK | — |
| spider | Bronze Spider | 0.86 (0.39×) | 0.59 (0.27×) | 1.6 | 0.80 / 0.38 | ~0.3–0.4 | TLT ch. 14 (Waterland): tiny bronze spiders; design: "the size of a dog" | **corrected**: the 0.39× box was the wind-up key on her back; her body is 0.27×, under the design's dog (~0.3–0.4×) and well over the books' tiny spiders | not changed: between the books and the design; ×1.25 (scale 0.85 → 1.05) would make her a dog, for the owner |
| harpy | Wild Harpy | 1.48 → 1.77 → 2.44 (0.68 → 0.81 → 1.12×) | 1.74 → 2.39 (0.80 → 1.10×) | 3.9 → 4.7 | 2.00 → 2.50 / 0.40 → 0.50 | slightly bigger, 1.05–1.45 (round 6) | the owner, round 6: at least Percy's size; SoM: the camp's cleaning harpies, "crossbred with the dodo birds"; SoN: Ella, small and skinny (Riordan Wiki); no height given; the vox-enemies upright bird, her first shape, stands about Percy's height normed | **misjudged in rounds 2–5**: 0.81× was accepted as "roughly human-sized" | FIXED ×1.2 (round 2), then re-sculpted (round 6): a 16 px torso and 15 px legs at the same voxel size, more feathers and wing structure, head 0.18 of the body; 5.5k triangles |
| stymphalian | Stymphalian Bird | 1.12 → 1.53 (0.51 → 0.70×, wings up); body 0.68 → 0.93, about Percy's length; wingspan 3.6 → 4.9 (1.64 → 2.24×) | 0.90 (0.41×) | 4.9 | 1.70 → 2.00 / 0.45 → 0.60 | crane-sized, a body near a 12-year-old's waist with a wingspan wider than he is tall | Pausanias 8.22.4–5 (tr. W. H. S. Jones): "man-eating birds", "quite as savage against men as lions or leopards", "of the size of a crane", pierce bronze and iron armour; SoM: "monstrous pigeon-like birds", Annabeth: "They'll strip everyone to bones" (Riordan Wiki); *The Sun and the Star*: a flock carries Will Solace off (Riordan Wiki); no size given in the books | was small for a man-eater (owner, round 4); round 4, second pass: standing level, its body (head, back and legs, wings left out) is 0.90, 0.41×; upright it would be about 0.7× (the owner has not decided) | FIXED ×1.36 (scale 1.1 → 1.5, round 4); its champion look 1.8 → 1.4 so the champion stays its old size; Bronzebeak and the harpy build separately and are unchanged |
| automaton | Greek-Fire Automaton | 1.04 (0.47×) | 0.51 (0.24×) | 0.9 | 1.10 / 0.55 | — | game invention (Greek-fire automaton) | OK; its own body is 0.24×, the Greek-fire pot on its back makes it 0.43× | — |
| ghost | Restless Spirit | 1.68 → 2.01 (0.77 → 0.92×) | 1.93 (0.88×) | 1.1 | 2.00 / 0.45 | ~1.0 | Riordan Wiki: ghosts are "physically identical to when they were alive" | was a little small (0.77×) | FIXED ×1.2 |
| fury | Fury | 2.86 → 4.40 (round 4, scale 1.5) → 5.90 (round 4, second pass, 2.1), whip tip under the soles to hair; hovering (float 0.8 → 1.0 → 1.25) her head at 2.30 → 3.30 → 4.35 (1.05 → 1.51 → 2.0×); wingspan 3.7 → 6.2 → 7.2 | 2.20 → 3.10 (1.02 → 1.42×) | 7.2 | 2.10 → 3.20 → 3.90 / 0.45 → 0.65 → 0.90 | body ~1.4–1.5 standing (owner, round 4, second pass) | TLT ch. 1: Mrs Dodds, "little" in disguise, grows leathery bat wings; her true form a monster; vox-enemies: a looming winged hag, well over Percy | was smaller than Percy (owner, round 4: the old 2.86 counted the whip hanging under her); round 4 brought her body only to 1.02×, so round 4, second pass grew her again with the boss sisters | FIXED ×1.5 (scale 1.0 → 1.5, round 4), then ×1.4 (1.5 → 2.1, round 4, second pass); slash range 2.2 → 2.8; under the boss sisters (Megaera and Tisiphone 2.5, Alecto 2.8); stat height 3.9 passes the rooms' 4-high doors and the 5-high Labyrinth and Asphodel ceilings; hovering, her hair passes 0.35 over a 4-high lintel |
| dracaena | Dracaena | 2.24 → 2.25 → 4.41 (1.02 → 1.03 → 2.03×, hair snakes) | 1.89 → 3.93 (0.87 → 1.80×) | 2.8 → 4.2 | 2.60 → 3.80 / 0.80 → 1.10 | bigger, 1.4–2.0 (round 6) | the owner, round 6: notably bigger than Percy; vox-enemies draws her 2.66× its Percy (1.56× normed), as tall as the hellhound beside her; SoM/BotL: women with serpent trunks for legs (no height given) | **misjudged in rounds 1–5**: 1.03× from the box, then 0.87× by body left as a doubt though the sheet drew her twice Percy | FIXED round 6: re-sculpted reared up on a 25 px serpent trunk at rig scale 1.85, detail in hero-pixel cells, head 0.15 of the body; slam range 3, slamR 2.9; 10.7k triangles |
| hellhound | Hellhound | 5.13 → 4.81 (2.34 → 2.19×) | 4.85 (2.23×) | 7.0 | 5.00 / 1.60 | ~1.0–1.3 at the shoulder | TLT ch. 8: "the size of a rhino"; Riordan Wiki: grizzly-bear or rhino size, up to garbage-truck size (Mrs O'Leary, BotL: "bigger than a tank") | big (2.1×), kept by the owner | keep (owner) |
| empousa | Empousa | 2.15 → 2.55 with flames; head to foot without the flame mane 1.81 → 2.16 (0.83 → 0.99×) | 2.15 (0.99×) | 1.6 | 2.30 → 2.50 / 0.50 | ~1.0 | BotL ch. 1: Kelli, a cheerleader (a teenage girl's height); one bronze leg and one donkey leg | was short and short-legged (owner, round 4) | FIXED round 4: legs 12 → 16 px, torso 12 → 10 px, scale 1.1 → 1.25 |
| scorpion | Giant Scorpion | 1.01 (0.46×) | 0.57 (0.26×) | 3.6 | 1.30 / 0.80 | — (game's giant scorpion) | BotL: Daedalus's giant scorpions (no size given); TLT ch. 22†: the pit scorpion is hand-sized, so it is now named Giant Scorpion | **corrected**: the 0.46× box is the sting raised over the back; the body stands 0.26× tall (3.6 long) | ROUND 3: renamed Giant Scorpion; no size in the books, so not changed; it reads by length |
| skeleton | Skeleton Warrior | 1.68 → 1.94 (0.77 → 0.88×) | 1.92 (0.88×) | 1.3 | 2.00 / 0.45 | ~0.9–1.0 | TC: spartoi in uniforms pass as soldiers and guards (Riordan Wiki); the spartoi request: "the size of a grown man" | was too small (0.77×) | FIXED ×1.15 (round 1) |
| spartoi | Spartoi | 1.93 → 1.94 (0.88×) | 1.93 (0.88×) | 1.2 | 2.00 / 0.45 | ~0.9–1.0 | myth: men sown from dragon's teeth (Apollodorus 1.9.23, 3.4.1) | OK | — |
| telekhine | Telekhine | 0.99 → 2.60 (0.45 → 1.18×) | 2.60 (1.19×) | 3.9 | 1.30 → 2.30 / 0.55 → 0.90 | ~1.2 (adults) | BotL (Mount St. Helens): adults "at least seven feet tall" (Riordan Wiki) | was too small (0.46×) | ROUND 3: ×2.6, stat 1.3/0.55 → 2.3/0.9 |
| gorgon_statue | Living Statue | 2.03 → 2.01 (0.92×) | 1.98 (0.91×) | 1.4 | 2.10 / 0.50 | ~1.0 | a statue of a person | OK | — |
| cyclops | Cyclops | 4.00 (1.82×) | 3.96 (1.82×) | 3.4 | 4.20 / 1.20 | ~1.6–2.7 | SoM: Polyphemus "so huge he couldn't even fit into the room", "made Tyson look vertically challenged" (Riordan Wiki estimate: 15 ft) | OK | — |
| karpos | Karpos | 2.22 → 1.55 (1.01 → 0.71×) | 1.50 (0.69×) | 1.2 | 1.25 / 0.40 | ~0.5 | SoN: karpoi "the size of toddlers, with rolls of baby fat" (Riordan Wiki); Hidden Oracle: Peaches, a "Demon Diaper Baby" | was too big (1.01×) | FIXED ×0.7 (books smaller than the ×0.8 asked) |
| karpos_slinger | Karpos Slinger | 2.22 → 1.57 (1.01 → 0.72×) | 1.50 (0.69×) | 1.2 | 1.25 / 0.40 | ~0.5 | as karpos | was too big | FIXED ×0.7 |
| colchis_calf | Colchis Bull Calf | 1.84 → 1.86 (0.84 → 0.85×) | 1.88 (0.86×) | 2.7 | 1.50 / 0.85 | ~0.8 | SoM: Colchis bulls "the size of elephants" (Riordan Wiki); a calf is the game's own | OK | — |
| myrmex | Myrmex | 1.90 → 1.23 (0.87 → 0.56×) | 1.24 (0.57×) | 1.9 | 0.90 / 0.55 | ~0.35 tall, ~0.6 long | Demigod Files ("The Bronze Dragon") / Hidden Oracle: "the size of a full grown German Shepherd" (Riordan Wiki) | was too big (0.87×, 2.9 long) | FIXED ×0.65 (books smaller than the ×0.8 asked) |
| myrmex_spitter | Myrmex Spitter | 1.90 → 1.24 (0.87 → 0.57×) | 1.24 (0.57×) | 2.0 | 1.00 / 0.60 | ~0.35 tall | as myrmex | was too big | FIXED ×0.65 |
| boarlet | Calydonian Boarlet | 2.24 → 2.23 (1.02×) | 2.26 (1.04×) | 3.0 | 1.40 → 1.90 / 0.85 | ~0.7–1.0 | myth: the Calydonian Boar was huge; a "boarlet" is the game's | OK | — |
| crab | Giant Crab | 1.10 → 1.11 (0.50 → 0.51×) | 1.17 (0.54×) | 1.9 | 0.90 / 0.70 | ~0.5 | design: "waist-high" shore crabs | OK | — |
| king_crab | King Crab | 2.77 → 4.10 (1.26 → 1.87×) | 4.30 (1.98×) | 6.2 | 2.40 → 3.60 / 1.50 → 1.80 | ~1.75 | TLO: Karkinos "rose ten feet out of the water... its pincers longer than my body"; design: "TWICE Percy's height" | was too small (1.26×) | FIXED ×1.5 (round 1) |
| basilisk | Basilisk | 1.99 → 0.64 (0.91 → 0.29×) | 0.64 (0.30×) | 1.5 | 1.10 → 0.60 / 0.50 → 0.35 | ~0.3 tall, ~0.4 long (arm-long) | The Son of Neptune, The Blood of Olympus, The Sun and the Star: "little green snakes" with a collar of white spikes, as long as a man's arm (Riordan Wiki) | now book size (stretched ~2× in length to read) | ROUND 3: re-sculpted as a snake, 1.5 long; fast fodder in threes on Othrys |
| earthborn | Earthborn | 3.48 (1.59×) | 3.04 (1.39×) | 3.6 | 3.00 / 1.00 | ~1.4 | TLH / SoN: Gegeines, six-armed clay giants "7 to 8 feet tall" (Riordan Wiki) | OK; **corrected**: the 1.59× box is the raised upper arms; the body is 1.39×, the books' "7 to 8 feet" | other agent (rebuilding) |
| daedalus_drone | Daedalus Drone | 2.18 (1.00 → 0.99×) | 2.15 (0.99×) | 4.6 | 1.40 → 1.80 / 0.50 | — | game invention | OK | — |
| laistrygonian | Laistrygonian | 4.93 → 4.96 (2.25 → 2.26×) | 3.52 (1.62×) | 3.4 | 3.60 → 4.40 / 1.10 | ~1.4 | SoM ch. 1; The Ultimate Guide: "eight-foot-tall cannibalistic giants with heavily tattooed arms" (Riordan Wiki) | kept by the owner; **corrected**: the 2.27× box is the boulder held over his head and his raised arms; his body is 1.62×, near the books' 1.4× | FIXED stat height 3.6 → 4.4 (round 1); the owner's ×0.8 for canon would bring his body to 1.3×, under the books; doubt below |
| shade | Shade | 2.29 → 2.27 (1.04×) | 2.10 (0.96×) | 1.1 | 1.80 / 0.40 | ~1.0 | spirits of the dead | OK | — |
| keres | Ker | 2.45 (1.12×) | 2.16 (0.99×) | 3.2 | 1.80 / 0.45 | ~1.0 | myth: death spirits (Hesiod, Shield 248ff) | OK; the 1.12× box is the wings, the body 0.99× | — |

### bosses

| id | name | rendered height (× Percy) | body height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|---|
| alecto | Alecto | 5.13 → 5.10 → 7.84 (2.34 → 3.60×; most of the box is the whip under her and the wings) | 2.59 → 4.12 (1.20 → 1.89×) | 7.1 → 8.5 (wingspan) | 3.00 → 3.90 / 0.90 → 1.20; hover 1.4 → 1.9 | body ~1.8–2.0 standing (owner, round 4, second pass) | TLT ch. 1: Mrs Dodds, a "little" fifty-year-old woman | **misjudged in rounds 1–3**: "OK" from the 5.1 box, which held the whip and the wings; her body was 1.20×, smaller than the owner wants a boss to loom | FIXED round 4, second pass: scale 1.75 → 2.8 (body 1.89×); whip, ring, swoop and landing reach in `FURY_REACH`; collision height 3.9 so she still passes the museum's 4-high doors in chapter 1 |
| minotaur | The Minotaur | 4.32 → 4.33 (1.97 → 1.98×) | 4.27 (1.96×) | 4.0 | 3.40 → 4.00 / 1.20 | ~1.2 (TLT) / ~1.75 (TLO) | TLT: "seven feet tall" (Riordan Wiki); TLO: seemed to have "grown three more feet" after reforming | big (1.97×), OK as a boss | FIXED stat height 3.4 → 4 |
| hellhound_alpha | The Hellhound | 5.91 → 5.53 (2.70 → 2.52×) | 5.61 (2.58×) | 8.0 | 5.80 / 1.80 | ~1.5 | as hellhound | big | other agent |
| furies | The Furies | 5.09 → 7.93 (2.32 → 3.64×; box with whip and wings) | 2.58 → 4.15 (1.19 → 1.91×) | 7.0 → 8.5 (wingspan) | 3.00 → 5.80 / 0.90 → 1.20; hover 1.4 → 1.9 | body ~1.8–2.0 (Alecto), the sisters a little smaller (owner, round 4, second pass) | TLT | **misjudged in rounds 1–3**: body 1.19×, the box was the whip and wings | FIXED round 4, second pass: Alecto 2.8 (1.89×), Megaera and Tisiphone 1.6 → 2.5 (body 3.68, 1.69×); the sisters circle 8.5 out and 5.6 up (were 7.5 and 4.6); the fight is in the open highway arena, so the collision height is the body's |
| medusa | Medusa | 4.27 → 4.25 (1.95 → 1.94×) | 3.41 (1.57×) | 2.9 | 4.00 / 1.00 | ~1.0–1.1 | TLT: a woman in a black gown and veil; Greek Gods: "a tall woman" (Riordan Wiki) | big, kept by the owner; **corrected**: the 1.96× box is her raised snake hair, her body is 1.57× | keep (owner); doubt below |
| chimera | The Chimera | 3.54 → 6.95 (1.62 → 3.20×) | 3.54 → 6.92 (1.63 → 3.18×) | 6.5 → 11.6 | 3.00 → 6.00 / 1.30 → 2.60 | ~1.5–2 | TLT ch. 12: grows from Echidna's Chihuahua, with "a ten-foot-long diamondback" snake tail; Greek Heroes: Bellerophon's Chimera was "about the size of a woolly mammoth" (Riordan Wiki) | the owner, round 9: twice the size (see "The Chimera" below) | re-sculpted at 2× |
| spiders | The Spider Queen | 2.57 → 2.56 (1.17×) | 1.97 (0.90×) | 4.8 | 2.60 / 1.60 | — | game boss (Spider Queen) | OK; the 2.56 box ran 0.6 under the ground line (her legs at rest); her top is 1.97 (0.90×) | — |
| procrustes | Procrustes | 3.61 (1.65×) | 3.57 (1.64×) | 3.4 | 4.40 → 3.80 / 1.20 | ~1.2 | TLT ch. 17: "seven feet tall", hairless, a raptor in a leisure suit (Riordan Wiki) | big (1.65×), OK as a boss | FIXED stat height 4.4 → 3.8 |
| cerberus | Cerberus | 4.34 → 7.96 (1.98 → 3.63×) | 7.24 (3.32×) | 16.2 | 4.40 → 7.70 / 2.00 → 3.60 | ~3.5–4+ | TLT ch. 18: "twice the size of a woolly mammoth, mostly invisible, and had three heads"; Mrs O'Leary is a "petite puppy" beside him (Riordan Wiki) | now OK (3.21×) after the other agent's ×1.6 | keep 7.0, or ×1.1 at most |
| ares | Ares | 3.52 → 3.53 (1.61×) | 3.49 (1.61×) | 2.9 | 4.20 / 1.10 | ~1.2–1.4 | TLT ch. 10: "a huge, muscular man" (Riordan Wiki) | OK | — |
| luke | Luke Castellan | 2.40 (1.09×) | 2.40 (1.10×) | 1.8 | 2.60 / 0.70 | ~1.1 | older teen | OK | other agent |

### champions

| id | name | rendered height (× Percy) | body height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|---|
| fields_bronzebeak | Bronzebeak | 2.60 → 2.61 (1.19×) | 2.53 (1.16×) | 6.6 | 3.57 / 0.68 | — | game champion: kind × look.scale | OK | — |
| woods_shadowfang | Shadowfang | 6.68 → 6.45 (3.05 → 2.94×) | 6.39 (2.93×) | 9.0 | 6.50 / 2.08 | — | game champion: kind × look.scale | OK | — |
| shore_queen_gale | Queen Gale | 3.00 → 3.01 → 3.44 (1.37 → 1.58×) | 2.93 → 3.39 (1.35 → 1.56×) | 6.1 → 6.4 | 3.70 → 4.00 / 0.60 → 0.75 | bigger (round 6) | game champion: kind × look.scale; vox-ow-champions draws her as tall as the Pale King | grows with the harpy | look.scale 1.85 → 1.6 (round 6) |
| canyon_red_king | The Red King | 2.41 → 2.39 (1.10 → 1.09×) | 1.79 (0.82×) | 8.8 | 3.12 / 1.20 | — | game champion: kind × look.scale | OK; its body is 0.82× tall, the sting raises it to 1.09× (it reads by its 8.8 length) | — |
| lab_bronze_warden | The Bronze Warden | 2.54 → 4.08 (1.16 → 1.86×) | 4.06 (1.86×) | 4.1 | 2.64 / 0.83 | — | game champion: kind × look.scale | OK | — |
| oth_gorgos | Gorgos the Cyclops Chief | 4.85 → 4.84 (2.21×) | 4.83 (2.22×) | 4.1 | 4.70 / 1.34 | — | game champion: kind × look.scale | OK | — |
| asphodel_pale_king | The Pale King | 2.76 → 3.19 (1.26 → 1.46×) | 2.99 (1.37×) | 1.9 | 2.90 / 0.65 | — | game champion: kind × look.scale | OK | — |
| kind:hellhound | Hellhound (Road West champion) | 6.36 → 6.19 (2.90 → 2.83×) | 6.11 (2.81×) | 8.7 | 6.25 / 2.00 | — | game champion: kind × look.scale | OK | — |
| kind:pup | Hellhound Pup (Road West champion) | 1.17 → 3.76 (0.53 → 1.73×) | 3.73 (1.71×) | 3.9 | 3.78 / 1.12 | — | game champion: kind × look.scale (1.4, unchanged) | OK: bigger than the pup, under the elite hellhound (2.27×) | follows the pup (round 5) |
| kind:skeleton | Skeleton Warrior (Road West champion) | 2.52 → 2.89 (1.15 → 1.32×) | 2.90 (1.33×) | 1.8 | 2.80 / 0.63 | — | game champion: kind × look.scale | OK | — |
| kind:spartoi | Spartoi (Road West champion) | 2.70 (1.23×) | 2.68 (1.23×) | 1.6 | 2.80 / 0.63 | — | game champion: kind × look.scale | OK | — |
| kind:spider | Bronze Spider (Road West champion) | 1.48 → 1.47 (0.68 → 0.67×) | 1.01 (0.47×) | 2.7 | 1.36 / 0.57 | — | game champion: kind × look.scale | OK | — |
| kind:dracaena | Dracaena (Road West champion) | 2.91 → 2.92 → 5.73 (1.33 → 2.63×) | 2.80 → 5.68 (1.29 → 2.61×) | 3.6 → 5.5 | 3.38 → 4.94 / 1.04 → 1.43 | much bigger (round 6) | game champion: kind × look.scale | follows the dracaena (round 6) | look.scale 1.3 kept |
| kind:empousa | Empousa (Road West champion) | 2.78 → 3.29 (1.27 → 1.50×); 3.07 without flames | 3.06 (1.40×) | 2.0 | 2.99 → 3.25 / 0.65 | — | game champion: kind × look.scale | OK | follows the empousa (round 4) |
| kind:harpy | Wild Harpy (Road West champion) | 2.52 → 3.04 → 3.55 (1.15 → 1.39 → 1.63×) | 2.96 → 3.51 (1.36 → 1.61×) | 6.4 → 6.8 | 3.20 → 3.50 / 0.60 → 0.70 | bigger (round 6) | game champion: kind × look.scale | grows with the harpy | look.scale 1.6 → 1.4 (round 6) |
| kind:stymphalian | Stymphalian Bird (Road West champion) | 2.02 → 2.15 (0.92 → 0.98×) | 1.71 (0.79×) | 6.5 → 6.9 | 3.06 → 2.80 / 0.68 → 0.84 | — | game champion: kind × look.scale | OK | look.scale 1.8 → 1.4 as the bird grew (round 4) |
| kind:scorpion | Giant Scorpion (Road West champion) | 2.02 → 1.98 (0.92 → 0.91×) | 1.41 (0.65×) | 7.3 | 2.60 / 1.20 | — | game champion: kind × look.scale | OK | — |
| kind:cyclops | Cyclops (Road West champion) | 4.84 → 4.85 (2.21×) | 4.85 (2.23×) | 3.7 | 4.54 / 1.30 | — | game champion: kind × look.scale | OK | — |

### mortals

| id | name | rendered height (× Percy) | body height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|---|
| teacher | Mrs. Dodds | 2.22 (1.01×) | 2.23 (1.02×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| student | Student | 2.11 → 2.12 (0.96 → 0.97×) | 2.10 (0.97×) | 1.1 | — / — | ~1.0 | a person | OK | — |
| guard | Museum Guard | 1.94 (0.89×) | 1.93 (0.89×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| tourist | Tourist | 2.21 → 2.23 (1.01 → 1.02×) | 2.20 (1.01×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| farmer | Farmer | 2.21 → 2.23 (1.01 → 1.02×) | 2.21 (1.01×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| old_lady | Old Lady | 2.24 (1.02×) | 2.22 (1.02×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| bellhop | Bellhop | 2.15 → 2.17 (0.98 → 0.99×) | 2.15 (0.99×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| salesman | Salesman | 2.16 (0.99×) | 2.16 (0.99×) | 1.3 | — / — | ~1.0 | a person | OK | — |

### people

| id | name | rendered height (× Percy) | body height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|---|
| fields_katie | Katie Gardner | 2.10 → 2.09 (0.96×) | 2.08 (0.96×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| fields_travis | Travis Stoll | 2.29 → 2.30 (1.04 → 1.05×) | 2.28 (1.05×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| woods_juniper | Juniper | 2.01 (0.92×) | 2.00 (0.92×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| woods_beckendorf | Charles Beckendorf | 2.40 → 2.42 (1.10×) | 2.40 (1.10×) | 1.6 | — / — | ~1.0 | a person | OK | — |
| shore_lee | Lee Fletcher | 2.24 → 2.25 (1.02 → 1.03×) | 2.24 (1.03×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| shore_nereid | Galene the Nereid | 2.04 → 2.02 (0.93 → 0.92×) | 2.01 (0.92×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| canyon_hedge | Coach Hedge | 1.95 → 1.96 (0.89×) | 1.95 (0.89×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| zoe | Zoë Nightshade | 1.94 → 1.95 (0.88 → 0.89×) | 1.93 (0.88×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| rachel | Rachel Elizabeth Dare | 2.17 (0.99×) | 2.17 (1.00×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| quintus | Quintus | 2.22 → 2.24 (1.01 → 1.02×) | 2.21 (1.02×) | 1.5 | — / — | ~1.0 | a person | OK | — |
| canyon_phoebe | Phoebe the Hunter | 2.18 (0.99 → 1.00×) | 2.16 (0.99×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| bianca | Bianca di Angelo | 2.13 → 2.12 (0.97×) | 2.10 (0.96×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| asphodel_charon | Charon | 2.61 → 2.60 (1.19×) | 2.29 (1.05×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| asphodel_sisyphus | Sisyphus | 2.23 → 2.24 (1.02×) | 2.23 (1.02×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| camp_argus | Argus | 2.40 → 2.41 (1.10×) | 2.38 (1.09×) | 1.7 | — / — | ~1.0 | a person | OK | — |
| camp_silena | Silena Beauregard | 1.93 → 1.94 (0.88 → 0.89×) | 1.93 (0.89×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| rt_turnpike_earl | Big Earl, Trucker | 2.37 → 2.38 (1.08 → 1.09×) | 2.37 (1.09×) | 1.7 | — / — | ~1.0 | a person | OK | — |
| rt_auntyem_pruitt | Mrs. Pruitt | 2.09 → 2.10 (0.95 → 0.96×) | 2.09 (0.96×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| rt_stlouis_mae | Ranger Mae | 2.18 → 2.17 (0.99×) | 2.16 (0.99×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| rt_denver_chad | Chad, Ex-Lifeguard | 2.16 (0.98×) | 2.13 (0.98×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| rt_vegas_valet | Sal the Valet | 2.18 → 2.16 (0.99×) | 2.17 (0.99×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| rt_la_guide | Trudy the Tour Guide | 2.02 → 2.01 (0.92×) | 2.00 (0.92×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| rt_sm_fisher | Grandma Mae | 1.80 (0.82×) | 1.75 (0.80×) | 1.2 | — / — | ~1.0 | a person | OK | — |
