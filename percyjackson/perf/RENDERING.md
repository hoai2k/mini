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
  - A hit flash swaps a rig's meshes to the shared `FLASH_MATERIAL`.
  - Greedy merging happens only in Cerberus's boss kit (`rig.merge`) and
    along x in the fodder blobs.
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

## What is left

These are in order of benefit, with rough estimates.

1. **One material per character, so one draw per bone** (high benefit, a
   large job).
   - A monster still draws its skin boxes and its voxel detail as separate
     meshes, because they use two materials: a textured one and a
     vertex-coloured one.
   - One node material could do both: texture times vertex colour, with
     white texels for the kit and white vertices for the skin, and the same
     emissive rules chosen by an attribute.
   - That would make every bone one draw: the automaton would go from 22 to
     about 12 meshes, the scorpion from 36 to about 18.
   - Expect about 40% fewer character draws, 4–8 ms of CPU a frame in a
     swarm.
2. **Instanced crowds** (high benefit for swarms, a large job).
   - Same-kind monsters already share geometry and materials.
   - Drawing part k of every pup as one instanced mesh, with per-instance
     bone matrices, turns N × parts draws into parts draws.
   - The open-world swarm would go from about 500 character draws to about
     60, saving 15–20 ms of CPU a frame in the bench scene.
   - The per-kind flash, dissolve and glow would have to become
     per-instance attributes.
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
