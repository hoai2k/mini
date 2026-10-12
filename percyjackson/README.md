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
  - The party is always three heroes (four with four players), and the AI
    plays whoever is missing. Alone, you lead two AI companions; two players
    share one, the third hero, and either can swap into it. D-pad ↓ or Tab
    switches (one swap at a time, so two players pressing together never
    fight over a hero). With three or four players there are no companions
    and switching is off. Online, the same rule counts everyone in the room.
  - Join and leave any time, mid-chapter, at no cost: a player who joins
    (Start on a controller, or online) takes over a companion's hero where it
    stands, with its health; a player who leaves, or whose controller is
    unplugged for two seconds, hands their hero to the AI, and gets it back
    if they return.
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
  controller to join), and online play from the hero select (Play online, Y)
  or the Iris-message fountain in camp, with players on one screen able to
  play online together (see *Online* below).
- **Saves and Continue:** each save is a whole game. Starting a new game
  makes a new save and keeps the others; Settings → Saves lists them (make
  one active, rename, delete after a confirmation). In a chapter the game
  keeps a resume point at checkpoints (entering a room, a room cleared, an
  objective step, a chest or gate opened) and when the page hides or closes;
  after Press Start, Continue rebuilds the same level and puts the party back
  at the last checkpoint, and Return to camp discards it. Online, the host's
  resume point is the one that counts; guests just rejoin.
- **Profiles:** every player has their own saved progress, chosen on the hero
  select (X on a controller cycles it): level, drachmas, gear for each hero,
  unlocked heroes, chapters and the prophecy. Loot and drachmas go to whoever
  picks them up; finishing a chapter credits everyone. A profile's code
  (Profiles on the hero select) carries it to another device, where it merges
  with what's there.
- **Story:** story cards with the concept art, a prophecy scroll whose lines
  turn from Greek letters into English as chapters are fulfilled, and
  writing that rearranges itself from Greek letters.

**Music:** delivered tracks play from `game/assets/music/` (title, camp,
museum, storm, boss, minigame, oracle, woods, highway, garden), looping with
a crossfade; places without a track yet keep the generated music. The
victory, defeat and prophecy stingers come from
`design/source/build_stingers.py` (ElevenLabs). Camp and the woods have a
recorded crickets bed (`game/assets/ambience/crickets.mp3`).
**Sound effects:** sword swings, hits, clangs, golden-dust bursts, coins,
loot, chests, breakables, rolls, monster voices (bark, screech, hiss, click,
roar), the boss gong, healing, Percy's wave, thunder, gates, True Sight and
arrows are ElevenLabs recordings in `game/assets/sfx/` (two or three variants
each, pitch-nudged), made by `design/source/build_sfx.py`; every other sound,
and any recording that fails to load, is synthesised. Prompts for the
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
| Hero select: change profile · play online | X · Y | Click the profile · Play online |

The in-game Instructions screen has the controller diagram.

## Online

Online play goes through the shared relay (see [MULTIPLAYER.md](../MULTIPLAYER.md)),
with Brick Kart's session layer (identity, reconnects, host migration and a
shared clock) in `game/js/net/session.js`. Host from the hero select (Play
online) or the Iris-message fountain in camp; friends join with the
five-letter room code, from the list, or with Rejoin. Up to four players
across every screen.

| What | Sent as | Owner |
| --- | --- | --- |
| `hs`: each hero this screen runs (humans keyed by profile id, companions by `ai:<hero>`): position, velocity, facing, action, health, downed | presence, 15 a second | that screen |
| `T` shared time of the update, `rs` heroes being re-synced after a reconnect | presence | every screen |
| `sc`: camp, story cards, or a chapter with its level seed | host presence | host |
| `w`: monsters and bosses, objective, chests, gates, rooms, True Sight | host presence, 15 a second | host |
| `R`: join order and room generation (for host migration) | host presence | host |
| `ev`: effects, telegraphs, projectiles and hazards of what that screen runs | topic, batched every 50 ms | anyone |
| `hit`: a guest's hero hit monsters | topic, guest → host | host applies it |
| `hurt`: a monster hit someone's hero | topic, host → owner | that screen applies it |
| `act`: freed a captive, opened a chest, revealed a disguise, objective actions, took the way out | topic, guest → host | host |
| `load`: the host is building a level | topic, host → all | guests wait |
| `done`: the chapter is complete | topic, host → all | everyone |
| `swap`, `swapok`, `swapno`: swapping into the AI companion | topic, guest ↔ host | host grants one at a time |
| `ping`, `pong`: the shared clock | topic | host answers |
| `full`: the room already has four players | topic, host → one | that screen leaves |

- The host runs the monsters, the chapter and the AI companions. Every screen
  runs its own players' heroes, so controls never wait for the network.
- Everything else is drawn about 0.1 s behind from buffered updates and
  carried on for a moment when one is late (`net/interp.js`). A guest's hit
  flashes, shows its number and hit-stops at once; the host applies the damage.
- Online, menus never pause the game: your hero stands still, protected for
  up to eight seconds. The climbing wall (which pauses) is closed online.
- A player who drops is played by the host as an AI companion; if they come
  back (the same profile) they get the hero back where it is. If they don't,
  it stays as the companion when the party rule wants one. A tab that stops
  drawing frames is handled the same way.
- If the host leaves, the next player in the join order takes over the room
  with the world as they have it: monsters, the boss and its health, the
  objective and the companions carry on. A hidden host hands over after two
  seconds. If the relay can't be reached at all, everyone plays on offline.
- Every screen keeps its own players' profiles and rolls its own loot; no
  screen writes another's save.

## Files

| Path | What |
| --- | --- |
| `game/index.html`, `game/style.css`, `game/js/` | The game: plain ES modules and Three.js r186 from a CDN, with no build step. It started from Cursed Dungeons (`hoai2k/francis`). |
| `game/js/heroes/` | The hero kits |
| `game/js/entities/` | Hero models and voxel hair, monsters, the four-legged rig, mortals, bosses |
| `game/js/world/` | Camp Half-Blood, the biomes, room templates, the level generator |
| `game/js/story/` | Books and chapters, chapter start places in camp |
| `game/js/mist.js`, `party.js`, `loot.js`, `lootdrops.js`, `artifacts.js`, `minigames/`, `net/` | True Sight, companions and switching, gear, loot beams, magic items, minigames, online play |
| `game/js/save.js`, `profiles.js`, `slots.js`, `resume.js`, `ui/saves.js` | A profile's data, player profiles (merging, export codes), save slots, the resume point for Continue, the Saves screens |
| `game/js/net/` | Online: `session.js` (rooms, identity, reconnects, host migration, clock), `online.js` (what is shared and who owns it), `interp.js` (smooth remote motion), `netfx.js` (effects seen by everyone), `lobby.js`, `nametags.js` |
| `game/workbench/models.html` | A turntable of every character model, to compare with the 3D sheets |
| `game/workbench/` | The model workbench ([published](https://hoai2k.github.io/mini/percyjackson/workbench/)): a thumbnail grid of every character model, an orbit viewer and an inspector |
| `game/assets/` | Web copies of the art: chapter cards, hero cards and portraits, title background, logo |
| `game/test/` | Checks: modules parse, imports resolve, ids agree, loot rules, profiles and save slots (migration, merging, new games) |
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
- Online play has been tested against a local stand-in for the relay (the same
  protocol, with added latency, jitter, lost updates and dropped sockets), not
  yet against the live relay. Blocks broken by a guest aren't sent to the
  others, and monsters spawned in the last moment before a host vanishes can
  be lost in the handover.
- It hasn't been tested yet with a real Xbox controller or on a real GPU. The
  checks ran in headless Chromium with WebGL.
