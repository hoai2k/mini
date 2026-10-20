# Half-Blood Quests: rendering performance (October 2026)

The owner asked: "Greek-Fire Automaton seemed a little laggy in the
workbench. I don't think there are that many particles, nor very complex
geometry, so are we properly optimizing our normal rendering? Is our engine
actually optimized for voxels?"

This page answers that question. It describes how the engine draws voxels,
what was measured before and after this round, what changed, and what is
still worth doing. The numbers come from `render-bench.cjs` in this folder
(see the [README](README.md)).

## The short answer

**Is the engine optimised for voxels? For geometry, yes. For draw calls and
shaders, it wasn't, and the shaders were what made the game lag.**

- **Geometry is in good shape.**
  - The world is meshed in 16³ chunks: one indexed mesh per chunk, only the
    faces that touch air, with ambient occlusion and baked light per vertex.
    Chunks stream in near the action.
  - A model's voxel detail is merged per bone into one vertex-coloured
    mesh. Faces hidden inside other boxes are dropped, and the geometry is
    cached per kind, so the hundredth pup costs no geometry work.
  - Triangle counts are small for any GPU. The automaton is 4,400
    triangles; the open world with 24 monsters is 377,000.
- **Draw calls are the CPU cost.**
  - three.js spends 30–50 µs of CPU per draw, whatever the draw's size, and
    with the sun's shadow every mesh is drawn twice.
  - A monster is 9–36 meshes, a hero was 24–54.
  - There is no instancing of crowds and no level of detail.
- **Shaders were the lag.**
  - The engine compiled new shader programs in the middle of play: when a
    new kind first appeared, when a monster was first hit, after every lull
    in a fight, and for every automaton that spawned.
  - Each compile froze the frame. In the headless browser that freeze
    lasted 0.3–1.4 s; on a real GPU it is tens to hundreds of ms.
  - The shader warm-up meant to prevent this compiled nothing (see below).

## Why the automaton was laggy

It isn't expensive to draw. On its own in the workbench it is 43 draw calls,
4,400 triangles and about 3 ms of CPU a frame. Its pose takes 0.08 ms, its
floor guard 0.03 ms and its flames 0.04 ms. Two separate problems made it
stutter.

1. **Its fire compiled a shader of its own.**
   - The Greek-fire flames (`entities/flames.js`) were one `InstancedMesh`
     per model.
   - three.js r186 stores a small instanced mesh's matrices in a uniform
     block named after the node's id (`NodeBuffer_<id>`). So the shader
     source was different for every automaton, Ares's sword, Fury whip and
     empousa.
   - Each one compiled and linked a program the first time it drew: about
     1 s each in software rendering.
   - With eight automatons in a chapter, the log showed 15 flame pipelines
     built, 10 s of compiling in all.
   - In the workbench the same happened on every build: the selected model,
     its thumbnail, and every in-game attack you picked.
2. **The workbench never stopped working behind it.**
   - After opening, it built and photographed every model, then ran the
     animation lint of every model in every pose, flat out.
   - Measured from opening:
     - The background work ran for 78 s.
     - Long tasks took 53.5 s of the main thread (68%).
     - The longest single task was 3.2 s.
   - Over the first 20 s with the automaton on show:
     - 68 long tasks, 17 s in all.
     - Frame gaps of up to 1.5 s.
     - 112 MB/s of allocation.
   - Every model on show stuttered. The automaton showed it most, because
     its flames never stop moving.

It was not the floor and grip guards, `measure()`, shadows, the flash and
glow uniforms, or the inflate attack. Those cost hundredths of a
millisecond, and `measure()` runs only when a model is selected.

## How the engine draws now

- **Renderer.**
  - three.js r186 `WebGPURenderer`, with WebGL2 as the fallback.
  - The post-processing chain in `gfx/renderer.js`: scene pass, then AO /
    SSR / SSGI depending on the tier, bloom, depth of field on High, AgX
    tone mapping and colour grading, then FXAA or TRAA.
  - Quality tiers (`PRESETS`) set:
    - the pixel ratio (0.7–1, capped at 1–2);
    - the sun's shadow (Medium and up: 1024–4096, PCF or VSM, a ±34 m box
      that follows the focus);
    - point-light shadows (High and Ultra);
    - the size of the point-light pool (2–48);
    - the bloom strength and the particle budget.
  - Dynamic resolution steps the pixel ratio down, then the tier.
- **Characters.**
  - `Rig` (humanoids, `entities/character.js`) and `QuadRig` (beasts,
    `entities/quad.js`) are jointed groups.
  - Each limb has a skin-textured box: one material per kind, painted once
    (`parts.js skinMat`).
  - The voxel kit (`monsters.js VoxKit`) collects loose boxes per parent
    group and merges them into one non-indexed, vertex-coloured mesh:
    - hidden faces are culled, both a face wholly inside one box and a face
      covered by several boxes together;
    - the geometry is cached per build (`KIT_GEO`);
    - there is one material per look (`voxMat`), sharing the skin
      material's flash, glow and dissolve uniforms.
  - A monster's skin box and voxel detail on one bone are then drawn as one
    mesh with one "part material" (`entities/charmat.js`, see "Second
    round" below).
  - Two or more monsters of a kind are drawn part by part as instanced
    meshes (`gfx/crowd.js`, see "Second round" below).
  - A hit flash swaps a rig's meshes to the shared `FLASH_MATERIAL`.
  - Greedy merging happens only in the boss kit for Cerberus and the
    Chimera (`rig.merge`; the Chimera, a single boss on screen, has a
    budget of about 70k triangles) and along x in the fodder blobs.
  - Flames are one dynamic mesh per model.
- **World.**
  - `world/voxel.js`: 16³ chunks, each one indexed mesh with only the
    exposed faces.
  - Per vertex: ambient occlusion, baked coloured light, and roughness,
    metalness and emission.
  - Separate meshes for liquids and glows.
  - The open world streams chunks near the focus, three per frame, and
    drops the far ones.
  - Textures come from an atlas, so faces are not greedy-merged: a merged
    face can't repeat an atlas tile.
- **Culling and lighting.**
  - three's per-mesh frustum culling.
  - The shadow map is re-rendered every frame because the sun follows the
    focus.
  - Flames and particles cast no shadow; everything else does.

## Measured before and after

All numbers come from headless Chromium on SwiftShader, at 960 × 540 and the
Medium tier. The GPU there is software, so frame rates and GPU time mean
little. Draw calls, programs, CPU time, compiles, long tasks and allocation
do mean something.

"Before" is the same tree with this round's changes taken out. Both sides
were run back to back with `render-bench.cjs compiles wb game bg`.

### Shader pipelines built during play

After the level loaded and its warm-up had run, each kind (automaton,
scorpion, cyclops, harpy, karpos, myrmex, pup, spider) was spawned, hit and
killed in turn.

| Scene | Before | After |
| --- | --- | --- |
| Chapter (lt2) | 22 pipelines, 10.0 s, worst 1.0 s | **0** |
| Open world (camp) | 21 pipelines, 10.5 s, worst 1.2 s | **1** (a one-off effect mesh, 1.4 s) |

Before, the first hit of every kind compiled a shadow program, and every
spawn of a new kind compiled its detail material. The automaton cost three
to seven programs.

### Busy scenes in the game

Each scene was measured for 6 s after the warm-up had settled.

| Scene | Draws | Meshes / shadow casters | Frame CPU p50 / p95 (ms) | Render submit (ms) |
| --- | --- | --- | --- | --- |
| Open world, 24 fodder: before | 860 | 2,089 / 1,770 | 64.8 / 93.5 | 56.2 |
| Open world, 24 fodder: after | **761** | 2,010 / 1,688 | **59.4 / 75.6** | **43.6** |
| Chapter, 8 automatons: before | 598 | 402 / 373 | 41.7 / 61.0 | 37.1 |
| Chapter, 8 automatons: after | **473** | 329 / 304 | **30.0 / 56.1** | **30.6** |

Per frame, the monsters' own code (poses, guards, ticks and flames) is under
1.5 ms for the whole crowd.

### The workbench

| | Before | After |
| --- | --- | --- |
| Opening the workbench on the automaton, first 20 s | 75 long tasks (16.7 s); frame gap p95 533 ms, max 1,117 ms; 122 MB/s allocated | 32 long tasks (2.9 s); frame gap p95 250 ms, max 350 ms; 66 MB/s allocated |
| Until every thumbnail and lint is done | 78 s, 68% of it in long tasks, longest 3.2 s | 175 s, 17% in long tasks, longest 0.65 s |
| The automaton alone (no background work) | 43 draws, 33 programs, 3.1 ms CPU a frame | 43 draws, 28 programs, 2.8 ms |

### Per model, alone in the workbench

The CPU columns are ms a frame. Triangles are unchanged, so they are not
shown again.

| Model | Draws | Triangles | Meshes | Programs before → after | Pose | Guards | Flames | Render |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Automaton | 43 | 4,400 | 22 | 33 → 28 | 0.09 | 0.04 | 0.05 | 3.6 |
| Cerberus | 94 | 90,697 | 28 | 35 → 31 | 0.08 | 0.04 | – | 3.3 |
| Hellhound | 56 | 40,397 | 28 | 26 → 20 | 0.07 | 0.05 | – | 3.4 |
| Minotaur | 24 | 67,953 | 9 | 35 → 28 | 0.08 | 0 | – | 1.9 |
| Hellhound champion | 59 | 48,237 | 30 | 25 → 21 | 0.07 | 0.03 | – | 3.0 |
| Spider | 34 | 5,425 | 17 | 30 → 26 | 0.10 | 0.03 | – | 3.7 |
| Scorpion | 72 | 5,289 | 36 | 26 → 22 | 0.14 | 0.03 | – | 5.2 |

The floor and grip guards (`QuadRig.floorGuard`, `Rig.gripGuard`,
`parts.js keepAbove`) already work from extreme points found once and
cached. They cost 0.02–0.05 ms a model, so throttling them would gain
nothing, and they were left as they are. No per-frame `Box3`, `measure()`
or bounding-box work runs in a tick.

### Boot

Boot is close to what it was. In software rendering the loading screen
cleared at 8.1 s before and at 8.5–8.7 s after, and the title showed at
4.8 s before and at 5.5–7.0 s after, with a lot of run-to-run noise. The open world's warm-up builds one
kind of monster a frame once camp is on screen, so it doesn't hold up
loading.

### Visual check

Each model was drawn deterministically by `render-bench.cjs shots` (seeded
`Math.random`, 45 frames of its idle, a fixed camera and lights), before and
after: automaton, Cerberus, hellhound, Minotaur, spider, scorpion, the
hellhound champion, pup, Percy, Annabeth, Grover, Tyson, Katie and the
teacher.

- Every image is identical pixel for pixel.
- Grover differs by at most 1 in 255 on a few pixels, from rounding.
- The game scenes look the same. They can't be compared pixel for pixel
  because they are live.

## What changed

1. **The flames are geometry, not instances** (`entities/flames.js`,
   `flameSim.js` `writeCubes` and `CUBE_INDEX`).
   - Each live cube is written as 8 corners and 36 indices into a dynamic,
     vertex-coloured buffer.
   - Only the live cubes go up to the GPU (update ranges, `drawRange`).
   - The bounds are fixed, so nothing is recomputed per frame.
   - Every flame in the game shares one program, and the cubes look the
     same.
   - The tests cover the cube corners and the winding.
2. **The shader warm-up works** (`main.js warmupShaders`, `compileScene`,
   `compileFor`, `warmShadows`). Before this, it compiled nothing useful,
   for three reasons:
   - The warm-up models sat 500 m under the level, and `compileAsync` skips
     what the camera can't see. They are now compiled on their own, with
     the scene's lights, unculled and never drawn.
   - They were compiled for the canvas, but the frame draws into the
     post-processing scene pass, which needs different programs. They are
     now compiled into the scene pass's target and MRT, as three's own
     `PassNode.compileAsync` does. At boot, one empty frame sets that pass
     up first.
   - Neither hit flashes nor shadows were covered. Each model is now
     compiled flashed as well. Then, for two frames, the models and a
     flashed twin of each mesh are drawn into the sun's shadow map only:
     they go on layer 1, which the shadow camera draws and the view camera
     doesn't, under the floor.
   - Those twins also hold the flash shadow program for the whole level.
     Without them it was released when the last flash ended and compiled
     again on the next hit (three.js uses one shadow render object per mesh,
     so a flash switches its program).
   - The open world and the Road West now warm up too. They didn't before.
   - Hidden pooled effects (markers, rings, slashes) are shown for the
     compile call.
3. **One program for every kind's voxel detail** (`monsters.js voxMat`).
   `emit` and `fill` are uniforms now, not constants baked into the shader,
   so every kind's detail material has the same shader source.
4. **Additive two-sided effects are drawn in one pass** (`forceSinglePass`
   in markers, rings, slashes, orbs, light shafts, the champion aura and two
   hero effects).
   - A see-through two-sided material is otherwise drawn twice: back faces,
     then front faces.
   - Additive light with no depth writes sums the same in one pass, so this
     halves those draws.
   - It also fixes a mismatch: three's `compileAsync` only compiles the
     one-pass program.
5. **Same-material meshes are merged per bone for heroes, people and
   mortals** (`character.js mergeChildren`).
   - A limb's skin box and its overlay are merged, as are a held weapon's
     blocks. Percy went from 24 meshes to 12.
   - Only plain leaf meshes are merged. Sub-groups that code turns or hides
     (wings, hair strands, shields, capes) are left alone, and the merged
     mesh is put into `rig.meshes` in place of the originals, so hit
     flashes still cover it.
   - Monsters were already merged per parent and material by the kit, so
     there was nothing left to merge there (524 → 489 possible, not worth
     the risk).
6. **One PMREM generator for the session** (`world/biomes.js`). Its blur
   shaders were compiled again on every level load.
7. **The workbench takes turns with the viewer** (`workbench.js`,
   `animlint.js lintModelAsync`).
   - The background thumbnails and lint rest twice as long as each step
     took, and hold off while you drag, zoom or press keys.
   - The lint runs one pose at a time.
   - A thumbnail compiles its shaders asynchronously before it is drawn.
   - Thumbnails are encoded with `toBlob`, off the main thread, from a CPU
     canvas. `toDataURL` had been the single biggest cost.
8. **A quality hook for the flames:** `FLAME_BUDGET.k` is 0.6 on Low and 1
   on the other tiers, set alongside the particle budget.

No scale, size, stat or gameplay values were changed.

## Second round: one material per part, and crowd batching

The owner approved items 1 and 2 of "What is left", on the condition that
the renders look no different. Both are in, and both can be switched off.

### One material per part (`entities/charmat.js`)

- **What it does.** On each bone of a monster, the skin box (textured,
  `makeCharMaterial`) and the voxel detail the kit merged there (vertex
  colours, `voxMat`) become one mesh with one "part material".
  - Every vertex carries an attribute `cm`: the detail's roughness,
    metalness, emit and fill, or a roughness of -1 for the skin.
  - The shader computes each half's own colour, emissive, roughness and
    metalness exactly as the two materials wrote them. It picks one with
    `select`, not a blend, through a flat varying, so no value is changed by
    interpolation.
  - The hit flash, the elite and champion glow and the dissolve are the same
    uniforms the two materials shared (the look's `userData`), so they still
    cover both.
- **What it leaves alone.**
  - Anything code reaches through the rig (`rig.extras`, wings, tails and
    the like), since code may turn, scale or hide it.
  - Transparent and additive parts, the live flames, elite shells,
    solid-colour props (`solidMat`), voxel hair, and meshes turned on their
    bone.
  - Meshes that are moved or scaled (but not turned) are merged with the
    transform baked in.
  - A bone's meshes are merged only in runs that nothing else on the bone
    draws between, so every other mesh keeps its draw order against them.
- **Guards still see the same points.** The merged mesh keeps its sources
  (`userData.parts`). The floor and grip guards (`parts.js keepAbove`,
  `character.js extremePoints`) read those, so a pose comes out exactly as
  before.
- **Geometry is shared by content**, so every spawn of a kind draws the same
  buffers. That is what lets the crowd batches below share them.
- **Where it runs.**
  - `buildMonsterModel` merges every monster.
  - `buildChampionRig` merges once the champion is recoloured and crowned
    (`PART_MERGE.defer`).
  - Bosses and heroes are not merged.
- **Two pitfalls found on the way**, both fixed:
  - three's shadow pass multiplies in a material's `map` alpha. With the
    skin set as `map`, the detail's vertices took the alpha of texel (0, 0),
    and some lost their shadows. The part material samples the skin itself.
  - Creating meshes draws uuids from `Math.random`, which shifted every
    seeded build and animation after the merge. The merge now draws them
    from a generator of its own.
- **Result.** Monster meshes across the 32 kinds go from 512 to 424:
  - the automaton from 20 to 12;
  - the hellhound from 26 to 19;
  - the pup from 22 to 15;
  - the gorgon statue from 19 to 9;
  - the ghost from 17 to 9, the skeleton from 11 to 7.
- **Smaller than the audit estimated.** The open-world fodder (karpos,
  myrmex, boarlet, crab and the rest) was already one detail mesh per bone,
  so it gains almost nothing on its own. Overall that is about 17%, not 40%.

### Crowd batching (`gfx/crowd.js`)

- **What it does.** Each frame, after the game has posed everything,
  `Crowd.update(game.enemies)` gathers the live monsters of each kind.
  - Part k of every one of them is drawn by one `InstancedMesh` per
    (kind, part).
  - Its instance matrices are those meshes' own world matrices.
  - The rigs keep running as before: AI, animation, guards and flames.
  - Their batched meshes only move to a layer no camera draws, and come back
    the moment the rig leaves the batch.
- **Spawn and death.** Nothing registers or unregisters, so there are no
  hooks in `enemy.js`, `projectiles.js` or `rangedRules.js`.
  - A monster in `game.enemies`, in the scene and visible, is batched.
  - One that has left the list (died and was removed), or that is hidden, is
    not.
  - The only hooks are in `main.js`:
    - `new Crowd(...)` at boot;
    - `crowd.update(this.enemies)` just before `gr.render()`;
    - `crowd.clear()` in `clearLevel`;
    - `crowd.warmFor(rigs)` in `warmupShaders`.
  - `monsters.js buildMonsterModel` sets `rig.batchKey`.
- **Flash, dissolve and champions.**
  - A monster whose material is swapped (the hit flash) leaves the batch for
    those frames and draws its own meshes, flashed, exactly as before.
  - Glow and dissolve are per-kind uniforms of the shared materials, so a
    batch shows them as the single meshes did.
- **Never batched:**
  - bosses (not in `game.enemies`), champions (`rig.championLook`), mortal
    disguises and the training dummy;
  - a lone monster of its kind (`CROWD.minGroup` is 2);
  - an elite (its shell makes its meshes differ from its kind's), and any
    part whose geometry or material differs from the kind's first;
  - transparent or additive parts, flames and shells.
- **No compiles.**
  - three.js r186 keeps a small `InstancedMesh`'s matrices in a uniform
    block named after the node (`NodeBuffer_<id>`), which compiles a program
    per mesh (the flames' old trouble).
  - The batches hold more matrices than the device's uniform-buffer limit
    (1,025 at 64 KB), which takes three's attribute path instead. Its shader
    is the same for every batch of a material.
  - Only the live range is uploaded each frame (`updateRanges`).
  - The warm-up adds one stand-in instanced mesh per distinct material and
    vertex layout to its group. That compiles the batch programs and their
    shadow programs with the level.
- **Culling and shadows.**
  - Each batch is culled as a whole, on bounds grown each frame from its
    instances' part spheres.
  - Batches cast and receive shadows like the parts they draw.
- **Fallback.**
  - `CROWD.on = false` draws the individual meshes, exactly as before.
  - It is set from the quality preset (`preset.batch: false` turns it off
    for a tier; every tier has it on now) or with `?batch=0` in the URL.
  - `PART_MERGE.on = false` (`charmat.js`) turns the part merge off.

**`BatchedMesh`, the alternative, was evaluated by reading r186; it was not
measured.**

- For: one draw could cover every part of every kind that shares a material.
- Against:
  - It takes one material.
  - Its matrices live in a texture that is uploaded whole when anything
    moves (every frame), with no update ranges.
  - On WebGPU, r186 issues one `drawIndexed` per instance inside the object.
  - Geometry has to be copied into its own buffers, with capacity reserved
    up front.
  - Its per-instance culling and sorting run on the CPU each frame.
- `InstancedMesh` per part needs none of that, and the draw count it leaves
  (one per kind and part) is already small.

### Measured

Headless Chromium, SwiftShader, 960 × 540, Medium, as before.

- **"Before"** is the tree as this round started (a copy made first).
- **"After"** has both changes; **"merge only"** is after with `?batch=0`.
- **The scenes.** The bench now:
  - clears the level's own monsters;
  - freezes the chapter's waves and the open world's roamers;
  - keeps the spawned monsters alive (`render-bench.cjs GAME_CLEAR`);
  - waits 60 s for the warm-up.
- **"Character draws"** are the frame's draws less those just before the
  spawn.
- **Timing.** These runs came before scaled (unturned) meshes joined the
  merge. That only touches humanoid kinds (the Bronze Warden below goes from
  22 meshes to 12), none of which are in these two scenes.
- **Runs.** Medians of 3 runs, interleaved. Another agent's browser shared
  the machine, so CPU times are noisy (the per-run values are in the
  scratch results); draw counts move with where the monsters walk.

| Scene | Variant | Draws (character) | Frame CPU p50 / p95 (ms) | Render submit (ms) |
| --- | --- | --- | --- | --- |
| Open world, 24 fodder | before | 941 (591) | 63.4 / 80.7 | 57.3 |
| | merge only | 753 (403) | 50.8 / 68.7 | 48.5 |
| | **after** | **489 (139)** | **48.3 / 58.6** | **37.7** |
| Chapter, 8 automatons | before | 452 (287) | 30.4 / 91.4 | 36.3 |
| | merge only | 342 (183) | 23.5 / 1,290 | 136.8 |
| | **after** | **210 (46)** | **19.6 / 31.4** | **19.6** |

- **The batches themselves.**
  - The 24 fodder (8 kinds) are 243 parts drawn by 81 instanced meshes.
  - The 8 automatons are 88 parts drawn by 11.
  - Each instanced mesh is drawn once more in the shadow pass.
- **Long tasks.** A single 1.3–2 s long task shows up in some chapter runs
  of every variant, before included: a one-off effect compiling as the
  automatons first attack. It is what inflates those p95 and render means.

**Shader pipelines built in play.**

- **What was spawned.** After the warm-up, three of each kind were spawned
  together, so they batched: automaton, scorpion, cyclops, harpy, karpos,
  myrmex, pup and spider. One of each was then hit, and all three killed.
- **Two runs of each scene:**
  - Chapter (lt2): 1, then 0.
  - Open world: 0, then 1.
- **The one pipeline** is always a `MeshBasicNodeMaterial` effect mesh, on
  a first spawn or hit. The before tree builds the same one in the same
  probe. No batch or part material was ever compiled in play.
- **At load, the warm-up builds more:** 29 pipelines in the chapter where it
  built 19 (the part material, and the batch and shadow variants). That adds
  about 3 s of loading in software rendering.

**The workbench** shows single models and has no crowd. Per model, alone:

| Model | Draws before → after | Meshes before → after |
| --- | --- | --- |
| Automaton | 43 → 27 | 22 → 14 |
| Pup | 48 → 34 | 24 → 17 |
| Hellhound | 56 → 42 | 28 → 21 |
| Hellhound champion | 59 → 45 | 30 → 23 |
| Spider | 34 → 30 | 17 → 15 |
| Scorpion | 72 → 68 | 36 → 34 |
| Bronze Warden (champion) | 43 → 23 | 22 → 12 |

Its other checks pass: the animation lint of all 103 models, and the weapon
and hound-leg checks.

### Visual check

**`render-bench.cjs shots`, the 14 reference models.**

- Automaton, Cerberus, hellhound, Minotaur, spider, scorpion, hellhound
  champion, pup, Percy, Annabeth, Grover, Tyson, Katie and the teacher.
- Compared with the copy taken before this round: 12 are identical pixel
  for pixel.
- Minotaur and Tyson differ, because another agent's resizing landed in
  between. Built from the same tree with the merge off and on, all 14 are
  identical pixel for pixel.

**The same, merge off against on, for 30 models** (the 14 and cyclops,
skeleton, spartoi, empousa, ghost, gorgon statue, telekhine, fury,
stymphalian, rat, karpos, keres, shade and three champions).

- 26 are identical.
- Fury and karpos differ by 1/255 on one pixel each, from the baked scale.
- Skeleton differs on 1 pixel, and the telekhine on 68 pixels at one tooth.
  - There, a detail face lies exactly in the plane of the skin box, and the
    two z-fight.
  - Which one wins depends on the last bit of depth each shader program
    computes. One program now draws both, so the winner changed: the
    z-fighting is the same, its pattern is not.
  - Changing the draw order inside the part made it worse (245 pixels), so
    the order is not the cause.

**Batches.** The same paused frame was drawn with batching on and off
(chapter with 8 automatons and one flashed; open world with 24 fodder).

- The images match: their difference is no larger than between two frames
  of the same setting (film grain).
- The flashed automaton shows white in both.

### Risks

- **Code that keeps a mesh only in a closure** and moves or hides it would
  have that mesh merged into its bone.
  - The merge only spares what it can reach through the rig's properties.
  - Every builder in the tree keeps such meshes in `rig.extras` or on the
    rig, and the animation lint, weapon and hound-leg checks pass. A future
    builder must do the same, or mark the mesh `userData.noMerge`.
- **Game code that changes a monster mesh's layers** would fight the
  batcher, which hides batched meshes on layer 29.
- **A batch's matrices are a frame's worth of world matrices.** Something
  that moves a monster after `crowd.update` and before the render would
  show a frame late.
- **Memory.** Each live (kind, part) batch holds 1,025 matrices (64 KB, CPU
  and GPU), so 100 batches in a level is about 6.5 MB. Batches are made
  when a kind first gathers and dropped when the level ends.
- **Untested on WebGPU.** This container runs WebGL2 only. What was checked
  against three r186's source:
  - the flat `vec4` varying (`@interpolate(flat)` in WGSL);
  - `select`;
  - the instanced attribute path above the uniform limit (the device's
    default 64 KB, since the renderer requests no limits);
  - the shadow pass's handling of `colorNode` alpha and `maskNode`.
  - Whether the warm-up compiles exactly the WebGPU pipelines the batches
    use is untested, as in the first round.
- **Other agents' edits.** `monsters.js` and `champions.js` were being
  edited by another agent at the same time (resizing). The "before" numbers
  predate those edits, which change shapes and not draw counts.

## What is left

These are in order of benefit, with rough estimates.

Items 1 and 2 of the first list (one material per character, instanced
crowds) are done: see "Second round" above. What remains of them:

1. **More of the part merge** (low to medium benefit).
   - Bosses and heroes don't go through it yet (bosses are single, heroes
     already merge same-material meshes, `character.js mergeChildren`).
     Cerberus is still 28 meshes.
   - Meshes turned on their bone, solid-colour props (`solidMat`) and the
     voxel hair and flame-hair materials stay apart. Folding them in means
     more branches in the part material, each to be proved pixel-equal.
2. **Per-instance culling in the crowd batches** (low benefit now).
   - A batch is culled as a whole, on bounds grown over its instances. A
     crowd spread wide draws its off-screen members' vertices too (cheap on
     the GPU; no CPU cost per instance).
3. **Shadow casters** (medium benefit, small to medium job).
   - 1,700 of the open world's 2,000 meshes cast shadows.
   - Letting only each model's body parts cast, and not small props, deco
     or far chunks, would cut roughly 25–30% of the shadow pass's draws.
   - A tighter sun box would help too (this is also item 9 of
     [../design/audit.md](../design/audit.md)).
4. **Impostors or a lower detail level for far monsters and people**
   (medium benefit).
   - Beyond about 25 m, a model could drop its voxel detail meshes and keep
     the skin boxes.
   - That roughly halves its draws, at no visible cost from the game's
     camera.
5. **Greedy meshing** (low benefit).
   - The kit's boxes are already culled for hidden faces.
   - The colour jitter on each box means few coplanar neighbours share a
     colour.
   - The world's atlas tiles can't repeat across a merged face without
     texture arrays.
   - Triangles are not the bottleneck: under 400,000 a frame.
6. **Remaining compile edges** (low benefit).
   - The open world's warm-up builds over the first second or two on a real
     machine, so a monster spawned before it finishes still compiles once.
   - Point-light shadows on High and Ultra aren't warmed.
   - One pooled effect mesh compiled once in the bench run.
   - Untested here: whether the scene-pass compile matches the live
     pipelines exactly on the WebGPU backend. The container only runs
     WebGL2. three's `PassNode.compileAsync` does the same thing, so it
     should.
7. **Allocation** (low benefit).
   - Play allocates 5–8 MB/s, mostly inside three.js: its material cache
     keys and binding updates.
   - The game's own per-frame allocations are a few small vectors in
     `player.js` and `enemy.js`. Not worth touching for now.

## Running it

```bash
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/render-bench.cjs compiles wb game bg
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/render-bench.cjs shots --shots /some/dir   # deterministic model images
```

The script serves the repository on `PERF_PORT` if nothing is there yet. To
compare against another tree, serve that tree on another port and run the
script with that port in `PERF_PORT`.
