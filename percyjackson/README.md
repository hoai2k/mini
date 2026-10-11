# Half-Blood Quests (Percy Jackson)

A co-op action dungeon crawler in the blocky 3D style of Minecraft Dungeons,
set in Rick Riordan's *Percy Jackson and the Olympians*. You play demigods
from Camp Half-Blood, see through the Mist, and play the books as chapters,
starting with *The Lightning Thief*. It's a fan project. Characters and story
belong to their author and publishers.

Play: <https://hoai2k.github.io/mini/percyjackson/>

## What's in it now

- **Camp Half-Blood** is the home base, with Half-Blood Hill, the Big House,
  the twelve cabins, the forge, the store, the archery range and the lava
  climbing wall.
  - Chapters start from places in camp: chapter 1 from the field-trip bus by
    the camp road, chapter 2 from Thalia's pine on Half-Blood Hill. A chapter
    unlocks when the one before it is finished.
  - The chapter map on the Big House porch lists every book.
- **Two playable chapters of Book 1:**
  - *The Pre-Algebra Teacher*: the museum in thick Mist. Mrs. Dodds waits in
    disguise until a hero sees through the Mist, then fights as the Fury
    Alecto.
  - *Half-Blood Hill*: a storm, then the Minotaur. Make him charge into a
    tree or a wall and he is stuck for three seconds and takes double damage.
- **Five playable heroes:** Percy, Annabeth, Grover, Tyson and Clarisse, each
  with a melee combo, a ranged move, three abilities and a godly power. Thalia
  and Nico are shown as coming later.
  - Alone, you lead a party of up to three. The others follow as AI companions,
    and D-pad ↓ or Tab switches which one you control.
- **The Mist and True Sight:** LT or V repaints the world in teal and gold,
  reveals monsters disguised as mortals, and dissolves walls made of Mist. It
  drains faster where the Mist is thick.
- **Battle Sense:** dodging the instant before a hit lands slows the monsters,
  but not the heroes.
- **Gear:** in the Minecraft Dungeons style, from Greek myth.
  - 61 weapons, armours and magic items.
  - Enchantment rows with choices, refunded when you salvage.
  - Blessed items and hero favourites.
  - The forge: temper items and re-roll enchantment choices.
  - Loot drops separately for every player.
- **Camp minigames:** the archery range and the climbing wall.
- **Multiplayer:** up to four players on one screen (press Start on a
  controller to join), and online play through the Iris-message fountain in
  camp (see *Online* below).
- **Story:** story cards with the concept art, a prophecy scroll whose lines
  turn from Greek letters into English as chapters are fulfilled, and
  writing that rearranges itself from Greek letters.

**Music:** delivered tracks play from `game/assets/music/` (title, camp,
museum, storm, boss, minigame, oracle, woods, highway, garden), looping with
a crossfade; places without a track yet keep the generated music. The
victory, defeat and prophecy stingers come from
`design/source/build_stingers.py` (ElevenLabs). Camp and the woods have a
recorded crickets bed (`game/assets/ambience/crickets.mp3`). Prompts for the
remaining tracks are in [design/music-requests.md](design/music-requests.md).

The full design, including the later chapters and books, is in
[design/game-design.md](design/game-design.md).

## Controls

| Action | Xbox controller | Keyboard and mouse |
| --- | --- | --- |
| Move · aim | Left stick · right stick | WASD · mouse |
| Melee · ranged | X · RT | Left click · right click |
| Jump | A | Space |
| Dodge (Battle Sense) | B | Shift |
| Abilities 1 · 2 · 3 | LB · RB · Y | 1 · 2 · 3 |
| Godly power | LB + RB together | F |
| True Sight | LT | V |
| Interact | X (when a prompt shows) | E |
| Ambrosia (heal) | D-pad ↑ | Q |
| Switch hero | D-pad ↓ | Tab |
| Magic items | D-pad ← · → | R · T |
| Inventory | View | I |
| Map | Click the right stick | M |
| Pause | Menu | Esc |

The in-game Instructions screen has the controller diagram.

## Online

Online play goes through the shared relay (see [MULTIPLAYER.md](../MULTIPLAYER.md)).
Open the Iris-message fountain in camp to host or join, with up to four
people and one hero each.

| What | Sent as | Owner |
| --- | --- | --- |
| Each player's heroes: position, facing, animation, health, downed | presence | that player |
| `setup`: camp or chapter, with the level seed | host presence | host |
| `world`: monsters, objective, chests, boss | host presence (12 a second) | host |
| `hit`: a guest's hero hit a monster | topic, guest → host | host applies it |
| `hurt`: a monster hit a guest's hero | topic, host → guest | that guest applies it |
| `act`: a guest freed a captive, destroyed an object, opened a chest or left | topic, guest → host | host |
| `done`: the chapter is complete | topic, host → all | everyone |

- The host runs the monsters and the chapter. Guests build the same level from
  the seed and see the host's monsters as puppets.
- Every browser keeps its own save and rolls its own loot.

## Files

| Path | What |
| --- | --- |
| `game/index.html`, `game/style.css`, `game/js/` | The game: plain ES modules and Three.js r186 from a CDN, with no build step. It started from Cursed Dungeons (`hoai2k/francis`). |
| `game/js/heroes/` | The hero kits |
| `game/js/entities/` | Hero models and voxel hair, monsters, the four-legged rig, mortals, bosses |
| `game/js/world/` | Camp Half-Blood, the biomes, room templates, the level generator |
| `game/js/story/` | Books and chapters, chapter start places in camp |
| `game/js/mist.js`, `party.js`, `loot.js`, `lootdrops.js`, `artifacts.js`, `minigames/`, `net/` | True Sight, companions and switching, gear, loot beams, magic items, minigames, online play |
| `game/workbench/models.html` | A turntable of every character model, to compare with the 3D sheets |
| `game/assets/` | Web copies of the art: chapter cards, hero cards and portraits, title background, logo |
| `game/test/` | Checks: modules parse, imports resolve, ids agree, loot rules |
| `design/` | The design, image requests, concept art and the scripts that make the web copies |
| `reference/` | Private style references (not published) |
| `intake/` | Drop box for new art |
| `publish.sh` | Copies the game into the Pages output |

## Checks

```sh
cd percyjackson/game && node --test test/*.test.mjs
python3 percyjackson/design/source/build_requests.py --check
python3 percyjackson/design/source/build_cards.py --check
python3 percyjackson/design/source/build_hero_art.py --check
```

To try it locally, serve the repository root (for example
`python3 -m http.server`) and open `/percyjackson/game/`.

## Known limits

- Only chapters 1 and 2 are playable. The other chapters show on the map as
  coming.
- Online play has been tested with a stand-in relay between two tabs, not yet
  against the live relay. On a guest's screen, enemy projectiles don't show,
  though their hits land.
- It hasn't been tested yet with a real Xbox controller or on a real GPU. The
  checks ran in headless Chromium with WebGL.
