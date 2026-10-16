# Half-Blood Quests: audit, October 2026

An audit of gameplay, level design and performance. The first part lists what
was fixed straight away. The rest are the suggestions still to do, in the
order I'd do them, each with its evidence, why it matters and a suggested
fix. Paths are under `game/js/` unless noted; line numbers are from the audit
and will drift.

How the numbers were made:

- **Gameplay:** read from the code, with damage, scaling and healing tables
  computed by importing the pure modules (`resources.js`, `loot.js`) and the
  combo tables from `heroes/*.js`. Starter gear: 119 HP, 9.8% armour.
- **Levels:** the real `generateLevel` run under Node (three.js resolved to a
  local copy) for 7,200 levels (12 chapters × 4 difficulties × 150 seeds),
  with a walk search over each voxel world: step up one block (two out of
  water), fall any height, optionally jump a one- or two-block gap.
- **Performance:** the harness in [`../perf/`](../perf/README.md), headless
  Chromium on a software GPU (three.js on its WebGL2 backend, the Low tier).
  Frame rates and GPU times there mean nothing; CPU time per frame, draw
  calls, object counts, allocations, load times and leaks do.

## Fixed in this round

| What | Where | Checked by |
| --- | --- | --- |
| **Levels stayed in memory.** three's WebGPU renderer keeps what it built for a mesh until the mesh (or its material) gets a `dispose` event; with shared materials, disposing geometry alone never freed it. Every camp → chapter → camp trip kept the old level: about 37 MB, 410 meshes and 2 render targets a trip. Removed levels, monsters, allies, props, warm-up models and remeshed chunks now get the event (`releaseObject` in `util.js`). A level's objects are released 30 frames after the next level has drawn, because releasing them also drops shader pipelines that nothing else uses yet; the next level shares most of those pipelines. Monsters that die stay referenced until the level ends, for the same reason. The old reflection probe is disposed on each load. | `main.js` `releaseLater`, `clearLevel`, the enemy loop, `warmupShaders`, `removePlayer`; `mission.js` `dispose`; `world/voxel.js` remesh; `world/biomes.js` `buildProbe` | Harness leak loop: heap +37 MB a trip → +1.2 MB; render targets flat (14); no old world reachable in a heap search |
| **Chapters 2–12 had no "where to go".** The tracker only showed in chapter 1. Now each chapter points the arrow and beam at the next thing to do: the nearest captive, trap or rift, the banner and then home, the next room while monsters remain, the arena once the way opens, the way out after the boss. The Lotus Casino points only once True Sight has found the door. Footprints show on a left-stick click. | `mission.js` `guideTarget` / `updateGuide`; `guide()` in `objectives/flag.js`, `escape.js`; `ui/tracker.js` (`quiet` goals leave the ribbon alone) | `perf/smoke.cjs`: a goal and an arrow in every chapter but 8 (by design); the goal moves on as rooms are entered |
| **The burning bus could wall off the chapter 4 arena** at Olympian when the way in was on its wall (about 9% of the arena reachable in half those levels). The bus now parks on a wall with no door, and the guardrail skips the bus and door aisles. | `world/rooms.js` `DRESS.highway.boss` | 600 chapter 4 levels: worst reachable share of the arena 9% → 80%, no boss spawn out of reach |
| **A hero switch or a gear change reset every cooldown** (D-pad ↓ twice made every ability ready) **and healed Tyson 30–75 HP.** The loadout refresh now keeps each slot's cooldown and charges, and the health share. | `entities/player.js` `refreshLoadout` | `smoke.cjs`: cooldown and health kept |
| **Battle Sense never fired against ordinary monsters** (their hits stopped at the i-frame check first), **but fired on poison and puddle ticks.** Monster blows during a roll now reach the perfect-dodge check; ticks of damage over time never do. | `entities/enemy.js` `hitPlayer`; `player.js` `takeDamage` | Code read |
| **Jump-slam spam beat every combo** (about 55–95 area DPS with 57–90% of the time invulnerable, against 68–80 for combos). It now has a 1.2 s cooldown, and a landing gives 0.1 s of i-frames instead of 0.2. | `entities/player.js` `SLAM`, `canSlam`, `landSlam` | Code read |
| **Telegraphs could vanish or mislead.** The 24 markers were handed out in turn even while still showing (a fire puddle holds one for 4 s), so a busy boss phase could steal live ones; a late cancel could hide a marker's next user; cone markers stayed put while the monster kept turning through its wind-up. Markers now come from the free ones (the pool grows when all are out), carry a generation so stale cancels do nothing, and cones turn with the attacker. The Minotaur's horn sweep showed ±171° for a ±63° hit; it now matches. | `gfx/markers.js`; `entities/enemy.js`; `entities/bosses.js` `horn_sweep` | `smoke.cjs`: 40 markers in a row all distinct; a stale cancel is ignored |
| **The Nectar Flask cancelled an Ambrosia heal in progress, and the reverse.** Heals over time now add up. | `artifacts.js`; `entities/player.js` `drink` | Code read |
| **A party wipe sent everyone back to the level start** (60–150 m back through cleared rooms) unless a trap or boss fight was on. Now they come back at the furthest main-path room they reached, by the door they came in through. | `mission.js` `checkpointSpot`; `main.js` `updateWipe` | `smoke.cjs`: the checkpoint is inside the room, in every chapter |
| **An unplugged controller didn't pause solo play** (`GAME_GUIDELINES.md` asks for it). It now pauses, once, with a toast. | `party.js` `watchPads` | Code read |
| **A light hit cut a long stun short** (Shield Bash's 1.4 s stun ended at the next 0.25 s flinch). A stagger now never shortens the one running. | `entities/enemy.js` `takeDamage` | Code read |

All 122 unit tests pass; `perf/smoke.cjs` loads every chapter with no page errors.

## Still to do

### 1. Make the chapters scale, and give losing a cost (gameplay, high)

- **Evidence:**
  - Monster and boss strength depends only on the chosen difficulty:
    monster HP `1 + (L−1)·0.35`, damage `1 + (L−1)·0.25`
    (`entities/enemy.js:107-108`), bosses `1 + (L−1)·0.45`
    (`entities/bosses.js:149`). `chapterMissionDef` passes no chapter term,
    so a chapter 12 pup is a chapter 1 pup.
  - Gear power grows with the profile level, `6 + 6·difficulty + 0.8·level`
    (`loot.js:132`): a legendary weapon is ×1.92 melee at level 1 and ×2.46
    at level 20, while Olympian monster HP is only ×2.05.
  - All four difficulties can be picked from the start.
  - A wipe brings everyone back at full health with the flask full, the
    boss keeps its wounds, and retries are unlimited.
- **Why it hurts:** later chapters get easier as you level, and any boss
  falls to attrition.
- **Fix:**
  - An effective level of `difficulty + 0.15·(chapter − 1)` for monsters and
    bosses.
  - On Hero and Olympian, either let the boss regain about 25% after a wipe,
    or give each fight a number of revives.
  - Optionally unlock the higher difficulties chapter by chapter.

### 2. Stop rebuilding the kit for gear changes (gameplay, high; follow-up to the fix above)

- **Evidence:** the fix keeps cooldowns, but `refreshLoadout` still disposes
  and rebuilds the kit. That ends live traps, Healing Tide pools and Big
  Brother part-way through. Kit health bonuses are still added in the kit
  constructors (`heroes/tyson.js:43`, `clarisse.js:38`).
- **Fix:**
  - Keep the kit and only re-read its stats on a refresh.
  - Fold kit health bonuses into `applyGear`, which keeps the health share in
    one pass.

### 3. Give every chapter a shape of its own (levels, high)

- **Evidence:**
  - `levelgen.js:71` pulls each step strongly north. At Mortal, 78–87% of
    main paths are one straight column; at Demigod and Hero, 75–89% have
    exactly one turn.
  - Room roles come in an almost fixed order (`encounters.js:43-60`): at
    Mortal, pack → battleground → breather → boss in 1,499 of 1,500 levels.
  - Rooms link as a tree: every side room is a dead end, and there are no
    loops.
  - About 95% of levels repeat a template on the main path.
- **Why it hurts:** after two or three chapters every level reads as "north
  through 3–5 boxes: small fight, big fight, quiet room, boss", whatever
  the setting.
- **Fix:**
  - Weaken the north bias and require one or two bends.
  - Add one loop or shortcut: a one-way drop, or a gate that opens from the
    far side.
  - Let each chapter supply a room grammar (an ordered list of templates and
    set pieces).
  - Draw each template at most once on the main path while the board's pool
    allows it.

### 4. Build the book scenes the intros promise (levels, medium)

- **Evidence:** every `c.slots` marker the room templates record (pine tree,
  creek, mirror, ball, bed, bus, tunnel, clock and others) is written and
  never read.
  - **Chapter 10** says "throw him the red ball", but there is no ball, only
    a toast (`bosses-book1.js:553`).
  - **Chapter 5** says to keep Medusa in a reflection, but the mirrors are
    decoration and the gaze only checks which way you face.
  - **Chapter 3** says to carry the banner across the creek, but home (the
    start room) has no creek. The creek clearing built for the hellhound is
    never opened, and the hound spawns in the start room (`flag.js:17-18,90`).
- **Fix:** read the slots and build the beats they mark:
  - Chapter 10: a red-ball pickup.
  - Chapter 3: the capture ring at the arena creek (open its gate when the
    banner is taken).
  - Chapter 5: mirrors as a hint or a counter to the gaze.
  - If a beat can't be built, change its intro line instead.

### 5. Let the climbs climb, and put the iconic rooms on the main path (levels, medium)

- **Evidence:**
  - Room heights are the parent's ±3 at random (`levelgen.js:136`). The boss
    ends level with or below the start in 61–64% of chapters 2 ("Climb
    Half-Blood Hill") and 6 ("Climb to the top of the Arch").
  - Trap rooms always take the board's one template left out of
    `OPEN_ROOMS`, so the Arch's tram shaft, the Lotus slot floor and Crusty's
    bed showroom only ever appear as side rooms.
- **Fix:**
  - A height profile per chapter: rising for chapters 2 and 6, falling for
    chapter 10's descent.
  - An ordered main path for the set-piece chapters (chapter 6: lobby →
    shaft → deck; chapter 9: road → showroom).

### 6. Make the climax chapters more than one fight (levels, medium)

- **Evidence:**
  - `objectives/boss.js:17-27` empties every room but the one before the
    arena, for chapters 11 (Ares) and 12 (Olympus).
  - A whole level is still built behind the party, with its chests
    unguarded.
  - Chapter 12 has no bolt beat at all.
- **Fix:** a short dedicated layout instead: an approach and one set piece,
  such as the pier walk, or the throne-room hand-over of the bolt.

### 7. Give the kill-count chapters a real goal (levels, medium)

- **Evidence:** chapters 2, 4, 6 and 9 say "Climb…", "Get off the bus…", but
  they are "defeat N", and N is always met on the way: the main path before
  the breather holds 1.56–2.0× what is asked.
- **Fix:** place objectives (reach the hilltop, get off the bus before a
  timer, reach the deck, get through the showroom). Or make the count matter,
  for example by clearing the battleground.

### 8. Cut draw calls per character (performance, high)

- **Evidence:**
  - Heroes are 24–54 separate meshes, monsters 11–33, bosses 15–57. Two
    builds of the same monster share 0 of 23 geometries (`character.js:132`,
    `:167`; `monsters.js:161`; `herovox.js:55,215`), and every piece casts
    shadows.
  - three's per-draw submission is 85–95% of frame CPU (about 30–50 µs a
    draw); the game's own code is under 1%.
  - Camp with 17 monsters is 414 draws on Low and 1,381 on High (about 73 ms
    of render CPU on High).
- **Fix:**
  - Merge each character's pieces per bone (about six meshes), or use one
    skinned mesh.
  - Cache geometry per model.
  - Let only the body cast shadows.
- **Expected:** roughly half the combat draws, 6–40 ms less CPU a frame.

### 9. Trim the High tier's shadows (performance, high)

- **Evidence:**
  - `pointShadows: 1` renders a six-face cube shadow, moved to a different
    light every frame (`gfx/renderer.js:31`, `gfx/lights.js:27-29,72-79`).
  - The sun's shadow box is ±34 m.
- **Fix:** no point shadows (or only for a fixed boss light), a tighter sun
  box that follows the party, and fewer shadow casters.
- **Expected:** about 40% fewer draws on High.

### 10. Make level loads not freeze the page (performance, high)

- **Evidence:**
  - A level build blocks for 1.2–4.2 s (the museum is the worst), then the
    first 30 frames take 3–7 s of shader and binding setup.
  - In the museum, `getImageData` alone took 1.9 s: character skins are
    painted texel by texel on canvases that end up GPU-backed
    (`entities/character.js:22-24,44,53`).
- **Fix:**
  - Paint skins into an `ImageData` buffer, and cache them per look.
  - `await renderer.compileAsync` after `loadWorld`, behind the loading
    screen.
  - Mesh the voxel chunks over a few frames.

### 11. Stream music instead of decoding it (performance, high on phones)

- **Evidence:** tracks are fully decoded and four are cached
  (`audio.js:263-272`). A 55–214 s track is 34–82 MB of PCM, so the cache
  can pin 200–290 MB, which `performance.memory` doesn't show.
- **Fix:** play long tracks through an `<audio>` element with a
  `MediaElementAudioSourceNode`, and keep decoded buffers for short
  stingers only.

### 12. Smarter companions (gameplay, medium)

- **Evidence:**
  - Companions dodge the moment a telegraph overlaps them (`party.js:84,182`).
    Their 0.36 s of i-frames is gone before a 0.6–1.6 s telegraph lands, and
    they roll away from the target, which keeps them inside a charge line.
  - They roll every 1.2 s next to lingering puddles.
  - They always face the nearest enemy, so Medusa's gaze stones them.
  - They attack into Luke's parry.
  - They never use magic items, and they cast heals at full health.
- **Fix:**
  - Dodge with less than 0.3 s of the telegraph left, out of its shape.
  - Ignore puddle markers unless standing in one.
  - Turn away while a gaze is coming, and hold off melee while Luke parries.
  - Use magic items, and give heals a condition (an ally below 60%).

### 13. Godly-power cinematics take the camera (gameplay, medium)

- **Evidence:**
  - `domain.js:62` pins the camera to the cast spot for the power's whole
    run (7.8 s for Hurricane) and orbits about 98°, while movement stays
    relative to the screen.
  - It also happens for a companion's power.
  - Only one power can run at a time, so a companion can block yours.
- **Fix:** keep the cinematic to the 1.3 s cast with no orbit, none for
  companions, and one power slot per hero.

### 14. Clarisse stun-locks elites (gameplay, medium)

- **Evidence:**
  - Spear Lightning (1.1 s cooldown) stuns everything but bosses for
    0.7 + 0.25·rank s, which at rank 3 outlasts its own cooldown
    (`heroes/clarisse.js:84`, `kit.js:67`).
  - It stuns super-armoured hellhounds and cyclopes too.
  - Clarisse has Percy's DPS with more reach and the best crowd control.
- **Fix:**
  - The full stun for minor monsters only; a short flinch or a slow for
    elites.
  - A stun-immunity window after each stun.

### 15. Hit-stop slows co-op down (gameplay, medium)

- **Evidence:** hit-stop freezes the whole world (`main.js:801`), and
  players' stops queue one after another. With melee held, the world runs
  at 79–86% speed solo and 49–60% with four players.
- **Fix:** cap total hit-stop at about 6–8% of each real second, or freeze
  only the attacker and target in co-op.

### 16. Power gates emergency abilities (gameplay, medium)

- **Evidence:**
  - Abilities cost Power as well as a cooldown, and Power only comes from
    dealing damage (0.08 per point, `combat.js:60`).
  - Calming Song and Healing Tide can't be cast when you're losing.
  - A press without Power fails silently.
- **Fix:** cooldown-only abilities as in Minecraft Dungeons, with Power kept
  for the godly power. At least add a "not enough Power" sound.

### 17. Damage multipliers stack too far (gameplay, medium)

- **Evidence:**
  - Two "+50%" marks multiply: Athena's Owl (`enemy.mark`) and Battle Plan
    (`pjMarkT`).
  - With Gambit's forced crit, War Cry and Forge Fire, a boss can take
    about 7.3×.
  - Medusa's Head doubles damage on a boss while it keeps attacking.
- **Fix:** one mark system that takes the higher value, and a cap on stacked
  buffs.

### 18. Smaller gameplay items (low)

- **Bled-out heroes:** a downed hero who bleeds out stays dead until the
  whole party wipes (`player.js:294`). Respawn them at the leader after
  10–15 s or when a room is cleared.
- **Boss phase change:** the roar hits within 4 m with no warning
  (`bosses.js:286-292`). Give it a 0.5 s ring, or make it push only.
- **Dodge:** the roll is faster than running and 48% invulnerable when
  spammed. Consider a 1.0 s cooldown.
- **Timers that ignore pause:** some hits run on `setTimeout` and so ignore
  pause, hit-stop and Battle Sense (Tyson's pound, Clarisse's bash, Echo,
  twin hits). Run them on game time.
- **Keyboard melee near a prompt:** within 2–2.8 m of a prompt, left click
  interacts instead of attacking (`padmap.js:101`). Use a dedicated
  interact key, or interact only on a hold during a fight.
- **Abilities 1 and 2 on keyboard** always wait 120 ms for the 1 + 2 chord,
  though 4 is a dedicated key.
- **Slow-motion setting:** the Hourglass of Kronos does nothing with slow
  motion off, and Wisdom's Gambit slows the heroes too.
- **Tyson:** he unlocks with Book 2, which has no chapters, so he is dead
  content for now.
- **Skill points** equal the player's level and the trees max out at about
  19, so there are no real choices.
- **Unused settings:** `difficultyDamageTaken` / `difficultyDamageDealt` are
  read but never set.
- **First-use hints** are missing for Ambrosia, abilities, the godly power,
  magic items and the jump slam.
- **Local co-op tether:** players can walk off screen once the camera is
  fully zoomed out.

### 19. Smaller level items (low to medium)

- **Battleground groups merge** (medium): group centres are 7.3 m apart or
  less in 10% of pairs, and an extra group with no spot is stacked on the
  first (`encounters.js:207-232`). Keep centres about 12 m apart, place them
  farthest-first, and turn an extra group into strays.
- **The secret room** is the same old generic hall in every chapter (crates,
  cobwebs and cursed weeds even on Olympus), and it holds every rare chest
  (`levelgen.js:170`). Make one secret template per board.
- **Spawn points inside guardrails or props:** about 2% of chapter 4 and 7
  levels. Run `L.spawn` through `standAt`.
- **Chests fall back to the room centre** when spots run out, occasionally
  inside blocks or in surf. Run chests through `dryItemSpot`.
- **Chapter 12's cloud bridges** can leave islands cut off. This is harmless
  only while chapter 12 empties its rooms.
- **Approaches toward the camera** show about 7–9 m ahead, against 12 m
  away from it (an estimate from the camera settings). Bias boss approaches
  up-screen.
- **Dead code:** `BIOME_ROOMS.camp_woods` is defined twice, and the old
  Jujutsu, Tokyo and Shibuya tables are unused.
- **The Road West** runs east first on the camp map.
- **A generator test:** add a test that runs `generateLevel` end to end and
  checks reachability. Node needs three.js resolved to a local copy; a few
  seeds per chapter is enough. This would have caught the chapter 4 arena.

### 20. Smaller performance items (low to medium)

- **Title loads every picture first** (medium): it waits for 8.8 MB of art
  (`main.js:110,178`; `ui/art.js` `ALL_ART`). Wait only for the logo, the
  title background and hero faces; load the cards later, as WebP at display
  size. The harness also saw `title-bg.jpg` fetched twice (the CSS
  background and the preload); worth checking.
- **The online host** sends the whole world 15 times a second: up to 90
  monsters × 17 fields, with no deltas (`net/proto.js:9`,
  `net/online.js:216-225,260-282`). Send changes only, at a lower rate for
  far monsters.
- **A smaller leak remains:** about 17 geometries and 6 textures a round
  trip (1.2 MB). Look for per-level textures (signs, skins) that are never
  disposed.
- **HUD writes:** cooldown styles are written every frame without checking
  for a change (`ui/hud.js:207`); `offsetHeight` is read inside a write loop
  (`:156`); prompts move by `left`/`top` (`:167-168`).
- **Per-hit and per-frame allocations:**
  - Damage numbers make a `<div>` and a `Vector3` per hit
    (`gfx/effects.js:127-138`).
  - `lights.js:65-77` builds a candidate array every frame.
  - `main.js` allocates vectors every frame.
- **Particle pools** always draw their full capacity (`gfx/particles.js:45`).
- **On mobile GPUs,** the world material's see-through `discard`
  (`gfx/materials.js:148`) defeats early-Z.

## Learnings

1. **Disposing in three's WebGPU renderer.** It frees what it built for an
   object only when the object or its material is disposed. With shared
   materials, `geometry.dispose()` isn't enough: send the object a `dispose`
   event when it leaves for good. The scene graph looked unchanged while the
   heap grew; counting live objects (CDP `queryObjects`) and a heap-snapshot
   retainer path found it.
2. **What costs here is draws × render passes, not triangles.** The game's
   own JavaScript is cheap; merging meshes and trimming shadow passes is
   where the frame time is.
3. **Keep runtime state off rebuildable objects.** Cooldowns and health
   bonuses lived on the kit, which a UI action rebuilds.
4. **Put every damage gate in one function.** I-frames were checked before
   the perfect-dodge hook on one path and after it on another.
5. **Give every free move a cost.** A move with no cooldown and i-frames
   (the jump slam) becomes the whole game.
6. **Pooled visuals need ownership.** A telegraph must follow the hit it
   warns of, and must not be recycled under its owner.
7. **Each objective needs a "where is my goal" hook.** Only the
   hand-scripted chapter 1 had guidance; a generic hook covers every
   generated chapter.
8. **The generator is robust but not expressive.** 7,200 levels had no
   crashes, overlaps or softlocks, but structure is where the chapters
   stop feeling like the book. The room data already names each chapter's
   scene (`room.slots`); wiring it up is the cheapest way to deliver the
   book's moments.
9. **Two quiet filters decide what players see:** the main-path / trap
   template split and the forced secret template. Check what a filter
   leaves out before adding content.
10. **Size decoded audio from track length.** JavaScript heap figures don't
    include it.
11. **Scale enemies by progress, not only by the chosen difficulty.**
    Otherwise player power growth flattens the late game.
12. **Global time effects** (hit-stop, slow motion, cinematics) multiply in
    co-op. Budget them per real second, and never trigger them for AI
    companions.
