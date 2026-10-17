# Half-Blood Quests (Percy Jackson)

A co-op action dungeon crawler in the blocky 3D style of Minecraft Dungeons,
set in Rick Riordan's *Percy Jackson and the Olympians*. You play demigods
from Camp Half-Blood, see through the Mist, and play the books as chapters,
starting with *The Lightning Thief*. It's a fan project. Characters and story
belong to their author and publishers.

Play: <https://hoai2k.github.io/mini/percyjackson/>

## What's in it now

- **The opening of a new game** tells the start of the book before camp
  opens up: a morning in Manhattan (the walk to the yellow school bus at Yancy
  Academy, a minute or two of fighting), a cutscene of the bus driving to the American Museum of
  Natural History, chapter 1 in the museum, a cutscene of summer at Montauk
  and the drive through the storm, chapter 2 on Half-Blood Hill, and a
  cutscene of waking at the Big House. Then Camp Half-Blood is the open hub.
  - The walk to the bus goes up-right on screen, then up-left, then up-right
    again: north up a short side avenue, west along a long cross street, north
    up the avenue to Yancy. It is a training board with a one-time hint for
    each control in the words of the device you play with (a new hint
    replaces the last, never a stack):
    - a dozen quiet metres to learn moving, ending at a dug-up sidewalk to
      jump;
    - then a fight the rest of the way: sewer rats lounging round trash cans
      at the corner, an alley dumpster, a hot-dog cart and bin bags (melee).
      They sniff, eat and wander, and notice you only up close (about 4–5 m)
      or when hit: they rear up and squeak, then come at you. Every five to
      nine seconds one a fair way off dashes at you, never more than three
      rats at once;
    - further on, rats where shooting first is the obvious move (ranged):
      behind the chain-link fence of a construction lot (shots go through it,
      rats have to run round to the gate), on a dumpster lid and on sidewalk
      scaffolding ahead, which see you from further off and rear up for
      longer, and single rats out of the storm drains.
    - Students, passers-by, hot-dog vendors and two taxis that drive along
      the street (and stop, and honk, for anyone in front).
  - Before each cutscene shot (and each boss-intro or godly-power camera) plays, a
    camera the set would hide (a roof, a wall, a tree between it and what it
    looks at or the people in frame) is turned or raised clear
    (`game/js/story/framing.js`). Mortals are drawn to the heroes' size:
    classmates at 1.14 (the heroes 1.18), grown-ups at 1.24 (all times
    CHAR_SCALE).
  - Cutscenes are in the engine (letterbox, subtitles in the story voice in
    plain English with time to read each, story-card pictures; people climb
    steps one at a time); hold A, Esc or the screen to skip. Each story beat
    is told once: the cutscenes, the chapter cards and the results don't
    repeat each other.
  - A save keeps where it is in the opening, and Continue picks it up in the
    prologue or at the start of a cutscene. Saves that had already finished
    chapters 1 and 2 start in camp. Settings → Data → Skip the opening goes
    straight to camp; a save that has seen the opening can also start a new
    game without it.
- **Where to go:** the objective ribbon names the current goal, a gold arrow
  at the edge of the screen points to it (with the distance), a beam marks
  it, and in camp glowing footprints lead the way (not in the prologue: the
  arrow is enough there). In camp the goal is the next chapter's quest
  marker. In a chapter the arrow and beam point to the next thing to do: the
  nearest captive, trap or rift left, the banner (then home with it), the next
  room while there are monsters to beat, the arena once the way is open, and
  the way out after the boss (in the Lotus Casino only once True Sight has
  found the door); clicking the left stick (middle click) shows footprints
  there for a few seconds. Chapter 1 points the way to Mrs. Dodds.
- **Monsters while you walk around:** small packs of low-level monsters turn
  up out of sight in the camp woods and along the Road West (pups, bronze
  spiders, Stymphalian birds, scorpions on the far road), never inside the
  cabins, the Big House or the forge (a monster that strays there turns
  back), and not during minigames or cutscenes. Each is a little group with
  one posted a few metres toward you as a scout, which sees you first and runs
  back to raise the others.
- **Camp Half-Blood** is the home base, with Half-Blood Hill, the Big House,
  the twelve cabins, the forge, the store, the archery range and the lava
  climbing wall.
  - Chapters 3 to 12 start from places in camp; chapters 1 and 2 are played
    in the opening, and replayed from the field-trip bus by the camp road and
    Thalia's pine on Half-Blood Hill. A chapter unlocks when the one before it
    is finished.
  - The chapter map on the Big House porch lists every book.
- **All twelve chapters of Book 1, *The Lightning Thief*,** each started from
  its own place in camp (the early ones near the cabins, the later ones along
  the Road West out past Half-Blood Hill), each unlocked by the one before:
  1. *The Pre-Algebra Teacher*: the museum in thick Mist. You walk the
     galleries with no fighting (the gold arrow leads to Mrs. Dodds) until you
     see her: the Mist lifts on its own, she turns into the Fury Alecto and
     tells you, in her own snarky voice, which button sees through the Mist
     (V, the right stick or 👁, for the device you play with). From then on
     every monster in disguise in the museum comes for you, two or three at a
     time (at most three hunting you at once at Mortal alone): under the Mist
     they look like ordinary people, can't be hurt and still hurt you with no
     swing to see (a one-time hint says to use True Sight); under True Sight
     they are serpents, spiders and ghosts you can fight. Turn True Sight on
     before she shows herself and you can fight them early (they fight back
     once hit), and those stay gone. She fights you in her gallery; at 75%,
     50% and 25% of her health she draws a breath (a violet ring and a rising
     wail for 1.3 s), shrieks, paralyzing every hero within 6 m for 1.8 s
     (never twice within three seconds), and flies off over the walls to
     another room (her bar reads "Mrs. Dodds — fled", the arrow and the
     footprints lead to her); come close and she fights on, until the last
     stretch ends with her down and her pets crumbling back into the Mist.
  2. *Half-Blood Hill*: a storm, then the Minotaur; make him charge into a
     tree or a wall and he is stuck and takes double damage (a charge at the
     open edge of the hilltop skids to a stop there).
  3. *Capture the Flag*: carry the Ares cabin's banner back across the creek,
     then a hellhound summoned into camp; Percy is claimed.
  4. *The Kindly Ones*: the three Furies at the wrecked Greyhound bus.
  5. *Aunty Em's Garden Gnome Emporium*: free the stone satyrs, then Medusa,
     whose gaze turns to stone any hero facing her.
  6. *The Gateway Arch*: the Chimera on the observation deck.
  7. *Waterland*: shut Hephaestus's traps, then the bronze spider queen.
  8. *The Lotus Hotel and Casino*: no boss; get out before too many days pass,
     with True Sight showing the way and lotus flowers costing time.
  9. *Crusty's Water Bed Palace*: Procrustes, who grabs heroes for his beds.
  10. *DOA Recording Studios*: close the rifts, then Cerberus at the gates of
      Erebus.
  11. *The God of War*: Ares on Santa Monica beach; heroes in the surf heal
      and hit harder.
  12. *The Six-Hundredth Floor*: Olympus, then Luke's duel on the camp hill.
- **Five playable heroes:** Percy, Annabeth, Grover, Tyson and Clarisse, each
  with a melee combo, a ranged move, three abilities and a godly power. Thalia
  and Nico are shown as coming later.
  - The opening follows the story, with no AI companions: alone you are
    Percy; a second player is Grover, a third Annabeth, a fourth Clarisse.
    The hero select offers no other heroes then, and switching does nothing.
    Someone joining or leaving mid-opening adds or removes the matching hero.
  - From Camp Half-Blood on, each player picks any hero they have unlocked,
    and the party is three heroes (four with four players): the AI plays
    whoever is missing, from the unlocked heroes. Arriving in camp at the end
    of the opening, Annabeth and Grover are summoned at Percy's side. Alone,
    you lead two AI companions; two players share one, the third hero, and
    either can swap into it. D-pad ↓ or F switches (one swap at a time, so two
    players pressing together never fight over a hero). With three or four
    players there are no companions and switching is off. Online, the same
    rules count everyone in the room (the host hands out the story heroes).
  - Join and leave any time, mid-chapter, at no cost: a player who joins
    (Start on a controller, or online) takes over a companion's hero where it
    stands, with its health; a player who leaves, or whose controller is
    unplugged for two seconds, hands their hero to the AI, and gets it back
    if they return. Playing alone, an unplugged controller pauses the game.
  - A party wipe brings everyone back at the furthest room they reached
    (inside a sealed trap, or at the arena door in a boss fight).
  - Companions follow you and never start a fight: they go only for monsters
    already in the battle (fighting, hit by a player, or in a group whose
    alarm is up), and come back to you when it's over. Monsters notice
    players, not companions, so a companion walking behind you never wakes a
    group or a scout; you pick every fight.
- **Skill trees:** each hero has a tree of three branches (Percy: Riptide,
  Tides, Son of the Sea; Annabeth: Stealth, Strategy, Workshop; Grover: Wild,
  Reed Pipes, Satyr; Tyson: Fists, Cyclops Hide, Forge and Sea; Clarisse:
  Spear, Ares, Cabin Five), opened from the pause menu or Chiron in camp.
  - A node is a **new power** (an ability for the 1 · 2 · 3 slots), an
    **upgrade** (ranks that improve a power, the ranged move or the godly
    power) or a **passive**. Every hero starts with three powers (the ones it
    always had, equipped) and can learn three more, one in each branch:
    Percy Disarming Strike, Geyser and Air Bubble; Annabeth Flank, Battle
    Orders and the Bronze Automaton; Grover Briar Burst, Lullaby and the
    Tin-Can Snack; Tyson Thunder Clap, Iron Skin and Call Rainbow; Clarisse
    Chain Lightning, Battle Frenzy and Hold the Line.
  - One point a level, for every hero alike. A rank costs 1; learning a power
    costs 2 and each later rank of it 1. A tree costs about 30 points, so at
    the end of Book 1 (around level 14) a hero has under half of it. A node
    can need another first, and a tier-2 node needs 2 points spent in the
    branch's tier-1 nodes (a tier-3 node, the godly power's upgrade, needs 5).
  - **Equip:** the three slots are at the top of the screen; pick a slot, then
    any power the hero knows (one already slotted swaps over). A power keeps
    its own cooldown when it moves; one new to a slot takes over what was
    left on the slot's last one, so a swap never hands out a fresh ability.
  - **Reset:** free, but only in camp, so a build can be tried out at leisure
    while what you take into a chapter is what you fight with there.
  - AI companions use whatever their hero has equipped. Online, each screen
    keeps its own players' trees and nothing more is sent.
  - Older saves keep what they had bought (the starter abilities' upgrades
    moved to new ids, and the three abilities stay equipped); a rank whose new
    tier gate isn't met is refunded.
  - Companions don't walk off ledges (they slide along the edge, and dodge
    only where there's floor to land on).
  - A boss's health grows with the party: 60% more for each extra player,
    35% for each AI companion.
  - Any player standing at a prompt can use it (A or left click), even with another
    player nearer to it.
- **Falling in a boss fight:** if the whole party is down, it comes back
  just inside the arena door after a moment, with two seconds of safety, to
  try again; the boss keeps the wounds it has taken. (In chapter 1, in the
  room where Mrs. Dodds last fought, as far from her as it can.)
- **The Mist and True Sight:** clicking the right stick (or V) repaints the world in teal and gold,
  reveals monsters disguised as mortals, and dissolves walls made of Mist. It
  drains faster where the Mist is thick.
  - Where the Mist is thick, mortals mill around (students, tourists, guards,
    teachers in the museum), some real and some monsters in disguise. Nobody
    who looks like a person can be hurt: a swing or a shot passes through,
    and they flinch, tell you off in a speech bubble ("Young man!", "No
    horseplay in the museum!", one line every few seconds, on every screen
    online) and go back to their business.
  - True Sight turns the disguised ones, with a puff of Mist, into creatures
    nothing like people: Mist serpents, spiders and ghosts (by chapter). Then
    they can be fought, and they stay revealed (in chapter 1 they follow the
    view instead: the Mist back up makes them people again, still hitting
    you). Once the fight is on there, True Sight lasts about 12 s and refills
    in about 7. Real mortals stay people,
    with a soft calm outline. A monster you killed is gone: that "person"
    isn't there when you come back, and Continue keeps it so.
- **Battles, as in Minecraft Dungeons:** the monsters are already there when
  you come near a room, in big groups milling about in the open, with a scout
  or two posted toward the way you come in. You meet a couple first, then more
  and more as the alarm runs through the group (the nearest join first); pick
  the scouts off at range before they run back and you can take a group a few
  at a time, or charge in and take it all at once. Companions leave a group
  milling about to you.
  - The rooms you fight in are large and open: combat rooms fill their part of
    the map (26-29 blocks a side, the boss arena 30 x 30; a room holds about as
    many monsters as when they were 20-22), one on the way to the boss is a
    battleground two rooms long (about 62 x 27), with
    boulders, columns or stubs of wall to fight round. Each chapter goes: a
    group, the big battleground (more groups further on, on harder settings),
    and a quieter room with a few strays before the boss, with groups growing
    along the way. Side rooms hold a smaller group guarding a chest.
  - Traps: now and then (none to two a chapter) a small side room slams its
    gates shut behind you ("It's a trap!"), and waves come in from marked
    points until they're beaten; then the gates open. Fall there and you're
    back on your feet inside, to finish it.
  - Groups are mixed by what monsters do: a clump of melee monsters (the
    board's commonest kind at the core), two or three that shoot or lob from
    the back, now and then a Greek-fire automaton, and an elite (a dracaena,
    a Fury, a hellhound…) in the middle; sometimes a swarm of one kind (all
    bronze spiders, a ghost swarm). Bigger on harder settings, later in the
    chapter, and with more players. Every board has its own signature monsters
    (Mist serpents and Furies in the museum, living statues in Aunty Em's
    garden, bronze spiders and telekhines at Waterland, scorpions in the
    desert, spirits and spartoi in the Underworld, Stymphalian birds and a rare
    cyclops on Olympus).
  - Spartoi (sword-and-shield skeleton warriors) and telekhines (seal-dog
    smiths that lob Greek fire at a marked spot) fill the melee and artillery
    parts of the boards that lacked them.
- **Battle Sense:** dodging the instant before a hit lands slows the monsters,
  but not the heroes. The jump slam has a 1.2 s cooldown.
- **Solid things are solid:** trees, statues, fences, campfires, braziers,
  lamp posts, tram pods and the like stand on invisible blocks
  (`world/deco.js` `SOLID_PROPS`): one block high can be stepped or hopped
  over, two need a jump from something lower. The field-trip bus in camp
  parks in open ground: its bonnet is a step and its roof a jump from there.
- **Character size:** every character is drawn at 0.8 of its model's scale
  (`game/js/entities/character.js` `CHAR_SCALE`): a hero's head is 1.8 m up,
  the top of the body that collides, in a world of 1 m blocks (it was 2.26 m,
  hair to 3 m, and heroes filled the doorways). People, monsters and bosses
  shrink with them; hitboxes, reach and ranges are unchanged.
- **The camera** starts a little further out than it did (zoom 24, was 22;
  Settings → Gameplay → Default zoom). In a boss fight it also leans toward the boss and
  pulls back to keep it in frame.
- **Boss attacks are aimed or local:** lines, cones and target circles go
  where a hero is; rings round a boss are about 5 m (6 m for Mrs. Dodds's
  shriek), small enough to run out of in the wind-up. No boss charge or dash
  leaves the room it starts in.
- **Healing and ammo, as in Minecraft Dungeons:**
  - Ambrosia (LT or E) is one square on a cooldown: a bite restores 65%
    of your health over 1.2 s, then it refills over 22 s (shown as a radial
    fill on its icon, which glows when it is ready and you are hurt). General
    cooldown reduction counts for half, the Hebe's Cup enchantment (12% a
    level) and the Golden Fleece Mantle in full; it never drops below 9 s.
    Apollo's Blessing makes a bite heal more. Companions bite below 35%.
  - The ranged attack (RT or right click) shoots from a quiver of 20, shown
    next to its icon (Percy's water, Annabeth's knives, Grover's notes,
    Tyson's boulders, Clarisse's sparks). A second after the last shot it
    refills one shot every 1.75 s; ammo bundles (+8) drop from 7% of minor
    monsters, 25% of elites, 15% of crates and barrels, 60% of chests (every
    rare chest) and two from every boss, and fly only to a hero whose quiver
    isn't full. Empty, the button clicks and says once that it comes back
    over time. Abilities never use ammo. Artemis's Quiver (+5 a level) and
    the Hunter's Silver Parka (+10) carry more. Companions shoot only at range
    when they run low.
  - Monster hits are scaled by tier (`js/resources.js`): at Mortal with the
    starting gear a minor monster's hit takes about a tenth of a hero's health,
    an elite's about a fifth, a boss's big telegraphed blow about a third;
    Demigod and Hero add their step on top. The prologue's rats bite for about
    6%.
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
- **Story:** story cards with the concept art, and a prophecy scroll whose
  lines turn from Greek letters into English as chapters are fulfilled.
- **Greek letters:** titles and in-game writing appear as Greek letters that
  hold for a while and then settle, letter by letter, into English with time
  to read them: chapter and place titles (about 1.8 s of Greek, then English
  for 2.5 s or more), boss names, godly powers, the chapter map, the words on
  the school bus (all Greek until you are close to it in Manhattan, and in
  the cutscene until its last shot of the bus, about two seconds before the
  cut), and signs in the world (they settle once you have had a look). The
  Greek is Greek all the way through: no letter stands in for a Latin one
  that looks the same.
  Narration, objectives, hints and messages are always plain English.
  Settings → Greek letters turns it off; reduced motion shows English.
- **Loading:** a loading screen with the title and a bar that follows the
  scripts, the textures, building camp, compiling shaders and the pictures;
  the logo, the title backdrop, the heroes' faces and cards, the chapter
  cards and the cutscene pictures are all loaded before the title shows, so
  nothing is drawn as a placeholder first.

**Music:** delivered tracks play from `game/assets/music/` (title, camp,
museum, storm, boss, minigame, oracle, woods, highway, garden, manhattan,
road-west and otherworld; the last two cover every chapter and cutscene
without its own track), looping with
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

## Debug: jump to any scene

For testing and auditing levels and cutscenes. Turn on Settings → Data →
Debug; a **Debug: scenes** button then shows on the title, in the pause menu
and in Settings. The menu jumps to:

- any step of the opening: the Manhattan prologue, the three cutscenes, and
  chapters 1 and 2 in their story form;
- camp;
- any chapter, with a chosen hero and difficulty, optionally after its story
  cards, and optionally straight into the boss fight (its arena, the gates
  open, the boss up; not for chapters 1, 3 and 8, whose bosses have their own
  way in).

Nothing is saved while debugging. The first jump swaps the save for one held
in memory (every hero and chapter unlocked), and Continue's resume point and
the save-slot list stop writing. A red **DEBUG · nothing is saved** badge
stays on screen; **Leave** reloads the page with the real save as it was.
`game/js/ui/debugMenu.js` has the code.

## Controls

| Action | Xbox controller | Keyboard and mouse |
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

The controller and keyboard layouts follow Minecraft Dungeons II's defaults (`game/js/padmap.js`; WASD still moves), except that B rolls and LB is ability 2 (swapped at the owner's request);
the in-game Instructions screen has the controller diagram.

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
| `sc`: camp, story cards, a chapter with its level seed, the opening's Manhattan prologue, or a cutscene | host presence | host |
| `w`: monsters and bosses, objective, chests, gates, rooms, True Sight | host presence, 15 a second | host |
| `R`: join order and room generation (for host migration) | host presence | host |
| `ev`: effects, telegraphs, projectiles and hazards of what that screen runs | topic, batched every 50 ms | anyone |
| `hit`: a guest's hero hit monsters | topic, guest → host | host applies it |
| `hurt`: a monster hit someone's hero (or Mrs. Dodds's shriek paralyzed it) | topic, host → owner | that screen applies it |
| `act`: freed a captive, opened a chest, revealed a disguise, objective actions (in chapter 1, True Sight on or off: the view is shared), took the way out, reached the school bus, asked to skip a cutscene | topic, guest → host | host |
| `load`: the host is building a level | topic, host → all | guests wait |
| `done`: the chapter is complete | topic, host → all | everyone |
| `swap`, `swapok`, `swapno`: swapping into the AI companion | topic, guest ↔ host | host grants one at a time |
| `ping`, `pong`: the shared clock | topic | host answers |
| `full`: the room already has four players | topic, host → one | that screen leaves |

- The opening is the host's: guests see the same Manhattan prologue and
  cutscenes; a guest who reaches the bus gets everyone on it. A cutscene is
  skipped when the host holds skip, or when every guest has. Roaming monsters
  are the host's like any other.
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
| `game/js/heroes/` | The hero kits; `skillRules.js` the skill trees and their rules (costs, requirements, gates, loadouts, reset, save migration), pure and tested; the screen is `game/js/ui/skills.js` |
| `game/js/entities/` | Hero models and voxel hair, monsters, the four-legged rig, mortals, bosses |
| `game/js/world/` | Camp Half-Blood, the biomes, room templates, the level generator |
| `game/js/world/encounters.js`, `game/js/entities/packRules.js` | The battle cadence: each room's part (group, battleground, strays, breather, guard, trap), group sizes and role mix, where groups and scouts stand; how a group notices you and joins in |
| `game/js/story/` | Books and chapters, chapter start places in camp, the opening (`opening.js` steps, `openingFlow.js`), cutscenes (`cutscene.js` player, `cutscenes.js` the three of the opening) |
| `game/js/world/manhattan.js`, `cutsceneSets.js`, `vehicles.js`, `roaming.js`, `roamZones.js` | The Manhattan prologue, the cutscene sets (Central Park West and the museum, Montauk), the bus and cars, roaming monsters and where they may go |
| `game/js/ui/tracker.js` | Where to go: the goal line, the edge arrow, the beam and the footprints |
| `game/js/entities/ratRules.js`, `story/prologueHints.js` | The prologue's rats (loiter, notice, dash, leash) and its how-to-play hints |
| `game/js/entities/mistPeople.js` | People in the Mist: what the disguised really are, and the lines they scold you with |
| `game/js/objectives/museum.js`, `game/js/story/museumRules.js` | Chapter 1: the calm walk to Mrs. Dodds, the reveal and her lines, the hunt by the people in the Mist (hidden blows), her shriek and three flights; the rules, pure and tested |
| `game/js/ui/greekTiming.js`, `ui/greekText.js`, `world/liveSign.js` | Greek letters settling into English: the timings, on the page, on painted signs and the bus |
| `game/js/ui/art.js` | The pictures preloaded behind the loading screen (and the logo, keyed out of its magenta) |
| `game/js/mist.js`, `party.js`, `loot.js`, `lootdrops.js`, `artifacts.js`, `minigames/`, `net/` | True Sight, companions and switching, gear, loot beams, magic items, minigames, online play |
| `game/js/padmap.js` | The Xbox controller layout (after Minecraft Dungeons II): buttons, the Y + LB chord, the right-stick flick dodge |
| `game/js/resources.js` | The Ambrosia flask's cooldown, the quiver (refill, size, bundle drops) and monster hit scaling by tier |
| `game/js/save.js`, `profiles.js`, `slots.js`, `resume.js`, `ui/saves.js` | A profile's data, player profiles (merging, export codes), save slots, the resume point for Continue, the Saves screens |
| `game/js/net/` | Online: `session.js` (rooms, identity, reconnects, host migration, clock), `online.js` (what is shared and who owns it), `interp.js` (smooth remote motion), `netfx.js` (effects seen by everyone), `lobby.js`, `nametags.js` |
| `game/workbench/models.html` | A turntable of every character model, to compare with the 3D sheets |
| `game/workbench/` | The model workbench ([published](https://hoai2k.github.io/mini/percyjackson/workbench/)): a thumbnail grid of every character model, an orbit viewer and an inspector |
| `game/assets/` | Web copies of the art: chapter cards, hero cards and portraits, title background, logo |
| `game/test/` | Checks: modules parse, imports resolve, ids agree, loot rules, profiles and save slots (migration, merging, new games), physics, spawn and prop placement off canopies, the battle cadence (rooms by role, groups and scouts placed from the seed, traps per chapter, room sizes, kill objectives a level can meet), boss health for the party, the prologue's rats and hints, the Greek-letter timings, the preloaded pictures, people in the Mist, chapter 1's museum (the calm walk, the reveal, hidden blows under the Mist, her three flights to rooms you can walk to, her lines in your device's words), the Ambrosia flask, the quiver and monster hit sizes, the controller layout |
| `design/` | The design, image requests, concept art and the scripts that make the web copies |
| `design/audit.md` | The October 2026 audit of gameplay, level design and performance: what was fixed and what is still to do |
| `perf/` | The performance harness (headless Chromium): load times, frame CPU, draw calls, leaks, a smoke check of every chapter; not published |
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

The tests are repeatable: every test file imports `test/seed.mjs` first,
which makes `Math.random` a seeded generator, and tests that roll items pass
their own seeded `rng`. To look for a test that only passes by luck, run the
suite under other seeds, for example
`for s in $(seq 1 50); do TEST_SEED=$s node --test test/*.test.mjs | grep '^not ok'; done`.

Performance and a browser smoke check of every chapter (not needed for every
change; see [perf/README.md](perf/README.md)):
`bash percyjackson/perf/run-all.sh` and
`NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/smoke.cjs`.

To try it locally, serve the repository root (for example
`python3 -m http.server`) and open `/percyjackson/game/`.

## Known limits

- Books 2 to 5 show on the chapter map as coming.
- Online play has been tested against a local stand-in for the relay (the same
  protocol, with added latency, jitter, lost updates and dropped sockets), not
  yet against the live relay. Blocks broken by a guest aren't sent to the
  others, and monsters spawned in the last moment before a host vanishes can
  be lost in the handover.
- It hasn't been tested yet with a real Xbox controller or on a real GPU. The
  checks ran in headless Chromium with WebGL.
