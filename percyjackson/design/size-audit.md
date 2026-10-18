# Half-Blood Quests: creature size audit, October 2026

Every model the workbench lists (heroes, camp NPCs, monsters, bosses,
champions, mortal disguises and open-world people), measured against Percy and
compared with Rick Riordan's books, Greek myth and the game's own design
documents.

## Summary: the worst mismatches

- **The basilisk was too small for what the owner and the concept sheet
  expect.** It was 0.91× Percy's height (1.99 blocks to the tip of its crown,
  3.8 long). In myth the basilisk is tiny: Pliny (*Natural History* 8.33) says
  it is "not more than twelve fingers long" and has a crown-shaped mark. As far
  as I know, Riordan's five Percy Jackson books don't include one. The
  pop-culture idea (Harry Potter) is a giant serpent. The game's request asks
  for "a small quick crowned lizard", but `vox-ow-fodder-3.png` draws it about
  2× Percy, about two thirds as tall as the Laistrygonian beside it. In the
  game it was 0.40× the Laistrygonian. **Fixed: built 1.35× bigger.** It is
  now 1.22× Percy and 5.2 long. It stays fodder, a lizard you can see over.
- **The king crab was a third of the size its request asks for.** Both
  `build_requests.py` (vox-ow-fodder-fix) and the code comment say "TWICE
  Percy's height", but it was 1.26×. **Fixed: ×1.5**, now 1.87×.
- **The skeleton warriors were shorter than the spartoi and than a man**, at
  0.77× Percy. **Fixed: ×1.15**, now 0.89×, level with the spartoi (0.88×).
- **The Laistrygonian's stat height (3.6) sat well inside its 4.9-block
  model**, so its health bar floated at its chest. **Fixed: stat height 4.4.**
  The model is bigger than in the books (2.25× Percy against about 1.5×), but
  it reads well as an elite giant. Shrinking it is the owner's call.
- **Left for the agents rebuilding them:** hellhounds (about 2.1–2.3× Percy's
  height and 7 long, which is past "the size of a rhino"), Cerberus (1.97×,
  which is small for a hound the books make gigantic and smaller than the
  hellhound alpha), the Mist Serpent and the Earthborn. See the proposals
  below.
- **Left for the owner:** Tyson is 1.50× Percy, where the books and the request
  ("a head taller") give about 1.15–1.2×. Medusa is 1.95× Percy, though she is
  a woman in the books. Neither is changed: the first is a playable hero, and
  the second is a boss that a stylised game can make big.

## How this was measured

- **Units.** Percy (`buildHeroModel('percy')`) is **2.19 blocks** tall at rest.
  Adult mortals are the same height (2.2), so the game treats him as an
  adult-sized hero, about 1.75 m. That makes one block about 0.8 m, and
  "× Percy" below is height divided by 2.19. In the books Percy is 12 to 16
  and a little shorter than a grown man, so canon ratios here are, if
  anything, generous to the monsters.
- **Rendered size.** Each workbench item's `build()` is posed at rest
  (`animate` with `dt 0`). The axis-aligned box covers its visible meshes;
  glow and additive effects are skipped. Height is the box's Y extent;
  "longest side" is the larger of its X and Z.
- **Stat size.**
  - `height` and `radius` come from `MONSTERS` (`monsters.js`, which includes
    `FODDER_MONSTERS` from `fodder.js`) and from `BOSS_DEFS` (`bosses.js`).
  - For champions they are `def.height × look.size ?? look.scale` and
    `def.radius × min(1.5, k)` (`champions.js` `applyChampionLook`).
  - Stat `height` matters in game:
    - it is the collision box for walls and ceilings (`physics.js`);
    - the health bar sits at `height + 0.5` (`ui/hud.js`);
    - projectiles hit between −0.3 and `height + 0.3`;
    - shots leave from `height × 0.8`.
  - Raising it can block a creature under a low ceiling, so it was only
    raised for creatures that spawn in the open world.
- **Tools.**
  - The scripts are in the session scratchpad (`sz/measure.cjs`,
    `sz/lineup.cjs`, `sz/table.cjs`, `sz/sheet.py`).
  - They run in headless Chromium against `workbench/?lazy=1` and use
    `window.__wb.items`.
  - The lineup renders each model with Percy beside it, with a level
    orthographic camera at 34 px per block and grid lines every block.
- **Game readability.**
  - Minecraft Dungeons makes fodder smaller than its threat and bosses 2–4×
    the hero.
  - The concept sheets go further: bosses at 4–5× Percy, giants at 3–4×.
  - This audit counts a creature as OK when it is within a stylised range of
    canon and of its own request. It is marked too small or too big only when
    it misses both, or when its own design text names a size it doesn't meet.
- **Canon citations.** Some are marked "from memory": the book and chapter are
  recalled, not checked against the text. Treat those as approximate.

## What changed

| id | file | change | height before → after | stat height / radius |
|---|---|---|---|---|
| basilisk | `entities/fodder.js` `buildBasilisk` | `QuadRig` scale 2.15 → 2.9 (×1.35). Kit `density: BUILD.k * 1.35`, so its voxel cells stay the same size (about 3.0k → 5.5k triangles) | 1.99 → 2.68 (0.91 → 1.22×), 3.8 → 5.2 long | 1.1 → 1.5 / 0.5 → 0.65 |
| king_crab | `entities/fodder.js` `buildKingCrab` | `QuadRig` scale 3 → 4.5 (×1.5). Kit density `voxDensity(rig)` → `voxDensity(rig) / 1.25`, 1.25 hero pixels a cell like the boarlet, to hold the triangle budget | 2.77 → 4.10 (1.26 → 1.87×), 4.1 → 6.2 long | 2.4 → 3.6 / 1.5 → 1.8 |
| skeleton | `entities/monsters.js` `buildSkeleton` | `Rig` scale 1.0 → 1.15. This also grows its champions: the Pale King goes from 2.76 to 3.17 and the Road West skeleton champion from 2.52 to 2.91 | 1.68 → 1.94 (0.77 → 0.89×) | unchanged (2 / 0.45) |
| laistrygonian | `entities/fodder.js` `FODDER_MONSTERS` | stat height only | unchanged (4.93) | 3.6 → 4.4 / 1.1 |

**Where they spawn:**
- **Basilisk:** in the open world only. It is in the canyon (`owLayout.js`)
  and on the Road West (`rtLayout.js`), in roam packs of 3–5
  (`roamZones.js`).
- **King crab:** on the open shore (`owLayout.js`, `rtLayout.js`). It doesn't
  spawn in any chapter level or interior.
- **Laistrygonian:** at Othrys and on the Road West, in the open world.
- **Skeleton:** in chapter levels and in the Labyrinth as well. Only its look
  grew there: its stat height (2) and radius (0.45) are unchanged, and at 1.94
  it is still no taller than a hero.

**King crab reach:** its tank attack starts when a hero is within
`range + 0.2` = 2.6. Body contact with the new radius is
1.8 + 0.32 + 0.1 = 2.22, so it still reaches. `range`, `slamR`, `windup`,
`cd` and `dmg` are unchanged.

**Checks after the change:**
- `node --test test/*.test.mjs`: 188 of 189 pass. The one failure, "under True
  Sight the disguised are creatures nothing like people"
  (`training.test.mjs`), looks for `serpent: () => {` in `monsters.js`. The
  Mist Serpent's builder has moved to `serpent.js` in the other agent's
  in-progress rebuild, so that failure is not from this change.
- `perf/weapons.cjs`: 23 weapons checked, 0 failing.
- `perf/animlint.cjs --all`: 103 models checked, 0 problems.
- `perf/smoke.cjs`: 0 page errors.

## Proposals left for the owner or the other agents

- **Hellhounds (all kinds):**
  - Canon:
    - The Lightning Thief ch. 8 has a hellhound "the size of a rhino". A rhino
      is about 1.6–1.8 m at the shoulder, about 1.0× Percy, and 3.5–4 m long.
    - Mrs O'Leary (Battle of the Labyrinth) is "bigger than a garbage truck"
      (from memory).
  - In the game they are 2.1–2.3× Percy tall and 6.6–7.3 long; the alpha is
    2.4–2.7× and Shadowfang 2.8–3.0×.
  - Proposal:
    - plain hellhound about 1.4–1.6× Percy to the ears;
    - the alpha and Shadowfang about 2–2.3×;
    - stat height following the model.
  - The plain hellhound's request says "as big as a truck", so the owner may
    prefer to keep it big.
- **Cerberus:**
  - Canon: gigantic in The Lightning Thief ch. 18, much bigger than a
    hellhound (from memory). In myth he guards Hades' gate.
  - The game has him at 1.97× Percy, *smaller* than the hellhound alpha
    (2.4–2.7×).
  - Proposal: about 3× Percy (×1.5), and always bigger than any hellhound.
    Check the boss arena's size first.
- **Mist Serpent, Earthborn, Luke:** no canon conflict.
  - The Earthborn is 1.59× Percy, a sound size for six-armed giants
    (*Argonautica* 1.936ff).
  - Luke is 1.09×, right for an older teen.
  - The Mist Serpent is the game's own creature.
- **Tyson (hero):** 1.50× Percy, where Sea of Monsters ("six foot three", from
  memory) and the request ("a head taller") give about 1.15–1.2×. Proposal:
  ×0.8 (`HERO_LOOKS.tyson` scale), but as a playable hero this changes the
  camera, his hit box and his abilities' reach. It is the owner's call.
- **Medusa (boss):** 1.95× Percy, where The Lightning Thief ch. 11 has her as
  a woman ("Aunty Em"). Fine as a stylised boss; ×0.8 would bring her nearer
  canon without losing her presence.
- **Procrustes (boss):** his stat height is 4.4, but the model is 3.61 tall,
  so his health bar floats a block above his head. Proposal: stat height 3.8.
- **Laistrygonian:** the model is 2.25× Percy, where Sea of Monsters ch. 1
  has giants passing as big eighth-graders (about 8 ft, from memory, so about
  1.4–1.7×). Proposal, if the owner wants canon: ×0.8 and stat height 3.6.
  Otherwise keep it as a readable elite giant.
- **Karpoi:**
  - Their request says "knee-high" and their code comment says "chest-high",
    but at 2.22 they stand as tall as Percy, wheat spray included.
  - Proposal: ×0.8 for both kinds. That keeps the swarm readable and makes it
    clearly smaller than the heroes.
- **Myrmekes:** "dog-sized" in the request, but 1.9 tall to the antennae and
  2.9–3.0 long, pony-sized. Proposal: ×0.8, and stat height 0.9 → 1.2 to
  match the body.
- **Harpy** (0.68×) and **Restless Spirit** (0.77×): both a little small for
  human-sized bird-women and spirits. Proposal: ×1.2. Their stat height is
  already 2.
- **The Bronze Warden** (Labyrinth champion): its request calls it a "giant
  bronze automaton", but it is 1.16× Percy. It spawns in the Labyrinth, so
  growing it needs a corridor check first. Flagged, not changed.
- **Stat height below the model**, so the health bar sits inside the creature:
  - myrmex: 0.9 for a 1.9 model;
  - boarlet: 1.4 for 2.2;
  - Daedalus drone: 1.4 for 2.2;
  - karpos: 1.25 for 2.2;
  - Minotaur: 3.4 for 4.3.
  - Raise these only where the creature never meets a low ceiling.

## Lineups

The before and after lineups (each model beside Percy, true scale) are
working images. They are not in the repository: re-run
`sz/lineup.cjs <dir>` and then `sz/sheet.py <dir> out.jpg` against the
workbench to make them again.

## The full table

Heights are in blocks (Percy = 2.19). An arrow shows a change, both mine and
the other agents': the hellhound, the Mist Serpent and Cerberus were changing
under their rebuild while this was measured. Heroes, mortals and people are
measured too; none is outside 0.82–1.19× except Tyson and Chiron, a centaur.

### heroes

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| percy | Percy | 2.19 (1.00×) | 1.7 | — / — | 1.00 | reference | OK | — |
| annabeth | Annabeth | 2.11 → 2.10 (0.96×) | 1.2 | — / — | ~0.95–1.0 | books: same age as Percy | OK | — |
| grover | Grover | 2.40 (1.10×) | 1.2 | — / — | ~0.95–1.0 | TLT: a scrawny kid; the cap and horns add height | OK | — |
| tyson | Tyson | 3.30 → 3.31 (1.50 → 1.51×) | 2.1 | — / — | ~1.15–1.2 | SoM ch. 1: big for his age, "a head taller" (the request: twice Percy's bulk and a head taller) | too big (1.50×) | owner: ×0.8 (hero; left) |
| clarisse | Clarisse | 2.38 → 2.37 (1.08×) | 2.7 | — / — | ~1.05 | TLT: big and tough, older | OK | — |
| thalia | Thalia | 2.25 → 2.23 (1.03 → 1.02×) | 2.6 | — / — | ~1.0 | TC | OK | — |
| nico | Nico | 2.23 → 2.25 (1.02 → 1.03×) | 1.4 | — / — | ~0.9–1.0 | TC: ten when found; older later | OK | — |

### npcs

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| chiron | Chiron | 2.99 → 3.00 (1.37×) | 1.8 | — / — | ~1.4 | a centaur: a stallion's body under a man's torso | OK | — |
| mr_d | Mr. D | 1.89 (0.86×) | 1.1 | — / — | ~0.9 | TLT ch. 5: a short, pudgy man | OK | — |
| dummy | Training Dummy | 1.56 → 1.57 (0.71 → 0.72×) | 0.8 | — / — | — | prop | OK | — |

### monsters

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| pup | Hellhound Pup | 0.80 → 0.82 (0.37×) | 1.2 | 1.10 / 0.45 | — | game invention (hellhound pup) | OK | hellhound family: other agent |
| rat | Sewer Rat | 0.62 → 0.61 (0.28×) | 1.2 | 0.85 / 0.42 | ~0.3 | a sewer rat (game) | OK | — |
| serpent | Mist Serpent | 0.57 → 1.22 (0.26 → 0.56×) | 3.5 | 1.30 / 0.55 | — | game invention (Mist Serpent) | n/a | being rebuilt by another agent |
| mortal | Mortal | 2.21 → 2.23 (1.01 → 1.02×) | 1.2 | 1.90 / 0.38 | 1.0 | a person | OK | — |
| spider | Bronze Spider | 0.86 (0.39×) | 1.6 | 0.80 / 0.38 | ~0.3–0.4 | TLT ch. 14 (Waterland): tiny bronze spiders; design: "the size of a dog" | OK (design) | — |
| harpy | Wild Harpy | 1.48 (0.68 → 0.67×) | 3.2 | 2.00 / 0.40 | ~0.8–1.0 | myth: bird-women (Virgil, Aeneid 3); the game's is mid-flight, hunched | a little small (0.68×) | owner: ×1.2 (flier, cheap; left) |
| stymphalian | Stymphalian Bird | 1.12 (0.51×) | 3.6 | 1.70 / 0.45 | ~0.3 (canon) / design big | SoM ch. 6 (from memory): birds about the size of ducks with bronze beaks; design draws them big | OK (stylised) | — |
| automaton | Greek-Fire Automaton | 1.04 → 1.05 (0.47 → 0.48×) | 0.9 | 1.10 / 0.55 | — | game invention (Greek-fire automaton) | OK | — |
| ghost | Restless Spirit | 1.68 (0.77 → 0.76×) | 1.0 | 2.00 / 0.45 | ~1.0 | spirits of the dead keep their human shape | a little small (0.77×) | owner: ×1.2 (left) |
| fury | Fury | 2.86 → 2.83 (1.31 → 1.29×) | 3.6 | 2.10 / 0.45 | ~1.0 + wings | TLT ch. 1: Mrs Dodds, a teacher who grows leathery wings | OK | — |
| dracaena | Dracaena | 2.24 (1.02×) | 2.7 | 2.60 / 0.80 | ~1.0–1.2 | SoM/BotL: snake-women with two snake trunks for legs | OK | — |
| hellhound | Hellhound | 5.13 → 4.67 (2.34 → 2.13×) | 7.3 | 5.00 / 1.60 | ~1.0–1.3 at the shoulder, ~2 long | TLT ch. 8: "the size of a rhino" | too big (2.3×) | other agent (rebuilding); propose ≈1.3–1.6× height |
| empousa | Empousa | 2.15 → 2.14 (0.98×) | 1.4 | 2.30 / 0.50 | ~1.0 | BotL ch. 1: Kelli, a cheerleader | OK | — |
| scorpion | Pit Scorpion | 1.01 → 1.00 (0.46×) | 3.6 | 1.30 / 0.80 | ~0.5 tall, ~1.5 long | myth: the scorpion that killed Orion was giant; no fixed size; game: a pit scorpion | OK | — |
| skeleton | Skeleton Warrior | 1.68 → 1.94 (0.77 → 0.88×) | 1.3 | 2.00 / 0.45 | ~0.9–1.0 | TC: skeleton warriors pass as soldiers (men); the spartoi request: "the size of a grown man" | was too small (0.77×) | FIXED ×1.15 |
| spartoi | Spartoi | 1.93 (0.88×) | 1.1 | 2.00 / 0.45 | ~0.9–1.0 | myth: men sown from dragon's teeth (Apollodorus 1.9.23, 3.4.1) | OK | — |
| telekhine | Telekhine | 0.99 → 0.98 (0.45×) | 1.5 | 1.30 / 0.55 | ~0.5 | design: "the size of a large dog" | OK | — |
| gorgon_statue | Living Statue | 2.03 → 2.01 (0.92×) | 1.4 | 2.10 / 0.50 | ~1.0 | a statue of a person | OK | — |
| cyclops | Cyclops | 4.00 → 3.99 (1.82×) | 3.4 | 4.20 / 1.20 | ~1.6–2.5 | myth: giants; SoM: Polyphemus huge; an adult cyclops well over Tyson | OK | — |
| karpos | Karpos | 2.22 → 2.20 (1.01×) | 1.7 | 1.25 / 0.40 | ~0.4–0.7 | design: "knee-high" (the request) / "chest-high" (the code); BotL: Peaches, child-sized (from memory) | a little big (1.01× incl. the wheat spray) | owner: ×0.8 (left) |
| karpos_slinger | Karpos Slinger | 2.22 → 2.21 (1.01×) | 1.6 | 1.25 / 0.40 | ~0.4–0.7 | as karpos | a little big | owner: ×0.8 (left) |
| colchis_calf | Colchis Bull Calf | 1.84 → 1.85 (0.84 → 0.85×) | 2.7 | 1.50 / 0.85 | ~0.8 | game invention: a calf of the Colchis bulls (SoM) | OK | — |
| myrmex | Myrmex | 1.90 → 1.88 (0.87 → 0.86×) | 2.9 | 0.90 / 0.55 | ~0.5–0.6 | design: "dog-sized" giant ants; myth: Pliny NH 11.111 gold-digging ants the size of foxes/dogs | a little big (0.87×, 2.9 long) | owner: ×0.8 (swarm; left) |
| myrmex_spitter | Myrmex Spitter | 1.90 → 1.89 (0.87 → 0.86×) | 3.0 | 1.00 / 0.60 | ~0.5–0.6 | as myrmex | a little big | owner: ×0.8 (left) |
| boarlet | Calydonian Boarlet | 2.24 → 2.23 (1.02×) | 3.0 | 1.40 / 0.85 | ~0.7–1.0 | myth: the Calydonian Boar was huge; a "boarlet" is the game's | OK | — |
| crab | Giant Crab | 1.10 → 1.11 (0.50 → 0.51×) | 1.9 | 0.90 / 0.70 | ~0.5 | design: "waist-high" shore crabs | OK | — |
| king_crab | King Crab | 2.77 → 4.10 (1.26 → 1.87×) | 6.2 | 2.40 → 3.60 / 1.50 → 1.80 | ~2.0 | design + code: "TWICE Percy's height"; myth: Karkinos, the giant crab Hera sent against Heracles | was too small (1.26×) | FIXED ×1.5 |
| basilisk | Basilisk | 1.99 → 2.68 (0.91 → 1.22×) | 5.2 | 1.10 → 1.50 / 0.50 → 0.65 | ~1.0–2.0 (design) / tiny (myth) | myth: Pliny NH 8.33, "not more than twelve fingers long" with a crown-like spot; not in the five PJO books as far as I know; the concept sheet draws it ~2× Percy | too small (0.91×) | FIXED ×1.35 |
| earthborn | Earthborn | 3.48 → 3.50 (1.59 → 1.60×) | 3.6 | 3.00 / 1.00 | ~1.5–2.0 | myth: the six-armed Gegeneis (Apollonius, Argonautica 1.936ff) | OK | other agent (rebuilding) |
| daedalus_drone | Daedalus Drone | 2.18 → 2.17 (1.00 → 0.99×) | 4.5 | 1.40 / 0.50 | — | game invention | OK | — |
| laistrygonian | Laistrygonian | 4.93 → 4.92 (2.25×) | 3.3 | 3.60 → 4.40 / 1.10 | ~1.4–1.7 | SoM ch. 1: giants who pass as big eighth-graders (about 8 ft, from memory); Odyssey 10: giants | big (2.25×), OK stylised; stat height was low | FIXED stat height 3.6 → 4.4; owner: model ×0.8 |
| shade | Shade | 2.29 → 2.27 (1.04×) | 1.1 | 1.80 / 0.40 | ~1.0 | spirits of the dead | OK | — |
| keres | Ker | 2.45 (1.12×) | 3.2 | 1.80 / 0.45 | ~1.0 | myth: death spirits (Hesiod, Shield 248ff) | OK | — |

### bosses

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| alecto | Alecto | 5.13 → 5.09 (2.34 → 2.32×) | 7.0 | 3.00 / 0.90 | ~1.0 + wings | TLT ch. 1: Mrs Dodds | OK (boss, stylised) | — |
| minotaur | The Minotaur | 4.32 → 4.30 (1.97 → 1.96×) | 3.9 | 3.40 / 1.20 | ~1.3–1.5 | TLT ch. 4: about seven feet tall (from memory), a bull-headed man | big (1.97×), OK as a boss | — |
| hellhound_alpha | The Hellhound | 5.91 → 5.34 (2.70 → 2.44×) | 8.4 | 5.80 / 1.80 | ~1.5 | as hellhound | big | other agent |
| furies | The Furies | 5.09 → 5.14 (2.32 → 2.35×) | 7.2 | 3.00 / 0.90 | ~1.0 + wings | TLT ch. 1/20 | OK (boss) | — |
| medusa | Medusa | 4.27 → 4.24 (1.95 → 1.93×) | 2.9 | 4.00 / 1.00 | ~1.0 | TLT ch. 11: "Aunty Em", a woman | too big vs canon (1.95×), OK as a boss | owner: maybe ×0.8 |
| chimera | The Chimera | 3.54 → 3.50 (1.62 → 1.60×) | 6.5 | 3.00 / 1.30 | ~1.5 | TLT ch. 12: grows from a "Chihuahua" to a huge beast (from memory); myth: lion-goat-serpent | OK | — |
| spiders | The Spider Queen | 2.57 → 2.56 (1.17×) | 4.8 | 2.60 / 1.60 | — | game boss (Spider Queen) | OK | — |
| procrustes | Procrustes | 3.61 → 3.58 (1.65 → 1.64×) | 3.3 | 4.40 / 1.20 | ~1.3 | TLT ch. 17: "Crusty", a huge man (from memory) | OK; stat height 4.4 above the model | owner: stat 4.4 → 3.8 |
| cerberus | Cerberus | 4.34 → 4.30 (1.98 → 1.96×) | 5.8 | 4.40 / 2.00 | 3–4+ | TLT ch. 18: bigger than a woolly mammoth / as big as a ... (from memory); myth: gigantic | too small (1.98×) | other agent (rebuilding): propose ×1.5 |
| ares | Ares | 3.52 → 3.53 (1.61×) | 2.9 | 4.20 / 1.10 | ~1.2–1.4 | TLT ch. 10: a huge biker | OK | — |
| luke | Luke Castellan | 2.40 (1.09×) | 1.8 | 2.60 / 0.70 | ~1.1 | older teen | OK | other agent |

### champions

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| fields_bronzebeak | Bronzebeak | 2.60 (1.19×) | 6.5 | 3.57 / 0.68 | — | game champion: kind × look.scale | OK | — |
| woods_shadowfang | Shadowfang | 6.68 → 6.17 (3.05 → 2.82×) | 9.4 | 6.50 / 2.08 | — | game champion: kind × look.scale | OK | — |
| shore_queen_gale | Queen Gale | 3.00 (1.37×) | 6.1 | 3.70 / 0.60 | — | game champion: kind × look.scale | OK | — |
| canyon_red_king | The Red King | 2.41 → 2.40 (1.10 → 1.09×) | 8.8 | 3.12 / 1.20 | — | game champion: kind × look.scale | OK | — |
| lab_bronze_warden | The Bronze Warden | 2.54 → 2.53 (1.16×) | 2.5 | 2.64 / 0.83 | — | game champion: kind × look.scale | OK | — |
| oth_gorgos | Gorgos the Cyclops Chief | 4.85 → 4.86 (2.21 → 2.22×) | 4.1 | 4.70 / 1.34 | — | game champion: kind × look.scale | OK | — |
| asphodel_pale_king | The Pale King | 2.76 → 3.17 (1.26 → 1.45×) | 1.8 | 2.90 / 0.65 | — | game champion: kind × look.scale | OK | — |
| kind:hellhound | Hellhound (Road West champion) | 6.36 → 5.78 (2.90 → 2.64×) | 9.1 | 6.25 / 2.00 | — | game champion: kind × look.scale | OK | — |
| kind:pup | Hellhound Pup (Road West champion) | 1.16 → 1.17 (0.53×) | 1.7 | 1.54 / 0.63 | — | game champion: kind × look.scale | OK | — |
| kind:skeleton | Skeleton Warrior (Road West champion) | 2.52 → 2.91 (1.15 → 1.33×) | 1.9 | 2.80 / 0.63 | — | game champion: kind × look.scale | OK | — |
| kind:spartoi | Spartoi (Road West champion) | 2.70 (1.23×) | 1.6 | 2.80 / 0.63 | — | game champion: kind × look.scale | OK | — |
| kind:spider | Bronze Spider (Road West champion) | 1.48 (0.68×) | 2.7 | 1.36 / 0.57 | — | game champion: kind × look.scale | OK | — |
| kind:dracaena | Dracaena (Road West champion) | 2.91 → 2.90 (1.33 → 1.32×) | 3.5 | 3.38 / 1.04 | — | game champion: kind × look.scale | OK | — |
| kind:empousa | Empousa (Road West champion) | 2.78 → 2.77 (1.27×) | 1.8 | 2.99 / 0.65 | — | game champion: kind × look.scale | OK | — |
| kind:harpy | Wild Harpy (Road West champion) | 2.52 → 2.53 (1.15 → 1.16×) | 5.3 | 3.20 / 0.60 | — | game champion: kind × look.scale | OK | — |
| kind:stymphalian | Stymphalian Bird (Road West champion) | 2.02 (0.92×) | 6.4 | 3.06 / 0.68 | — | game champion: kind × look.scale | OK | — |
| kind:scorpion | Pit Scorpion (Road West champion) | 2.02 → 2.01 (0.92×) | 7.3 | 2.60 / 1.20 | — | game champion: kind × look.scale | OK | — |
| kind:cyclops | Cyclops (Road West champion) | 4.84 → 4.86 (2.21 → 2.22×) | 3.7 | 4.54 / 1.30 | — | game champion: kind × look.scale | OK | — |

### mortals

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| teacher | Mrs. Dodds | 2.22 → 2.23 (1.01 → 1.02×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| student | Student | 2.11 → 2.12 (0.96 → 0.97×) | 1.1 | — / — | ~1.0 | a person | OK | — |
| guard | Museum Guard | 1.94 (0.89×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| tourist | Tourist | 2.21 → 2.23 (1.01 → 1.02×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| farmer | Farmer | 2.21 (1.01×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| old_lady | Old Lady | 2.24 (1.02×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| bellhop | Bellhop | 2.15 → 2.16 (0.98×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| salesman | Salesman | 2.16 → 2.17 (0.99×) | 1.3 | — / — | ~1.0 | a person | OK | — |

### people

| id | name | rendered height (× Percy) | longest side | stat height / radius | expected (× Percy) | source | verdict | scale / action |
|---|---|---|---|---|---|---|---|---|
| fields_katie | Katie Gardner | 2.10 (0.96×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| fields_travis | Travis Stoll | 2.29 (1.04×) | 1.1 | — / — | ~1.0 | a person | OK | — |
| woods_juniper | Juniper | 2.01 → 1.99 (0.92 → 0.91×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| woods_beckendorf | Charles Beckendorf | 2.40 → 2.41 (1.10×) | 1.6 | — / — | ~1.0 | a person | OK | — |
| shore_lee | Lee Fletcher | 2.24 → 2.25 (1.02 → 1.03×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| shore_nereid | Galene the Nereid | 2.04 → 2.03 (0.93×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| canyon_hedge | Coach Hedge | 1.95 → 1.96 (0.89 → 0.90×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| zoe | Zoë Nightshade | 1.94 (0.88 → 0.89×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| rachel | Rachel Elizabeth Dare | 2.17 (0.99×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| quintus | Quintus | 2.22 → 2.23 (1.01 → 1.02×) | 1.5 | — / — | ~1.0 | a person | OK | — |
| canyon_phoebe | Phoebe the Hunter | 2.18 (0.99×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| bianca | Bianca di Angelo | 2.13 → 2.12 (0.97×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| asphodel_charon | Charon | 2.61 → 2.60 (1.19×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| asphodel_sisyphus | Sisyphus | 2.23 → 2.24 (1.02×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| camp_argus | Argus | 2.40 → 2.42 (1.10×) | 1.7 | — / — | ~1.0 | a person | OK | — |
| camp_silena | Silena Beauregard | 1.93 (0.88×) | 1.1 | — / — | ~1.0 | a person | OK | — |
| rt_turnpike_earl | Big Earl, Trucker | 2.37 (1.08×) | 1.6 | — / — | ~1.0 | a person | OK | — |
| rt_auntyem_pruitt | Mrs. Pruitt | 2.09 → 2.10 (0.95 → 0.96×) | 1.4 | — / — | ~1.0 | a person | OK | — |
| rt_stlouis_mae | Ranger Mae | 2.18 (0.99×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| rt_denver_chad | Chad, Ex-Lifeguard | 2.16 → 2.14 (0.98×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| rt_vegas_valet | Sal the Valet | 2.18 → 2.17 (0.99×) | 1.3 | — / — | ~1.0 | a person | OK | — |
| rt_la_guide | Trudy the Tour Guide | 2.02 (0.92×) | 1.2 | — / — | ~1.0 | a person | OK | — |
| rt_sm_fisher | Grandma Mae | 1.80 → 1.79 (0.82×) | 1.2 | — / — | ~1.0 | a person | OK | — |
