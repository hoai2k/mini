# Half-Blood Quests: performance harness

Drives the game (`/percyjackson/game/`) in headless Chromium with Playwright and
measures each scene. It reads the repository and never writes to it: results
and a cache of the CDN files go to `local/percyjackson-perf/` (ignored by Git;
`PERF_DIR` moves it). It isn't published and isn't part of the game's checks.
The findings it produced, and what is still to do, are in
[../design/audit.md](../design/audit.md).

## The pre-push checks: one runner

From the repository root:

```bash
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/check.cjs           # every check, one table; exits 1 on a failure
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/check.cjs --fast    # without the slow ones (smoke, islands), for quick iteration
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/check.cjs --only weapons,animlint
```

`check.cjs` serves the repository itself (Node's `http` on a free port,
stopped at the end; no Python needed), launches one Chromium
(`--use-angle=swiftshader --enable-unsafe-swiftshader`) and runs, in one
browser session, several pages at once:

| Check | What | Its script |
| --- | --- | --- |
| `node` | the node tests, `cd game && node --test test/*.test.mjs` | |
| `design` | `python3 design/source/build_requests.py --check` | |
| `smoke` | every chapter loads and runs, no page errors (slow) | `smoke.cjs` |
| `weapons` | weapons point forward at rest and in each strike, ranged aim | `weapons.cjs` |
| `houndlegs` | the hellhounds' legs stay attached | `houndlegs.cjs` |
| `animlint` | floor clipping, parts flying off, strikes backward | `animlint.cjs` |
| `props` | held-prop grip, arm, clip, cloth, strike | `props.cjs` |
| `rig` | the rig contract (`js/entities/rigContract.js` `validateRig`, through the workbench's `window.__validateAll`); skipped with a note where the workbench has neither | |
| `islands` | floating voxel islands, `--check` (slow) | `islands.cjs` |
| `bodysize` | size categories, head and leg rules (`design/sizes.json`), `--check` | `bodysize.cjs` |
| `shots` | the deterministic model images, to `local/percyjackson-perf/results/shots/` (`--shots dir` moves them), with a digest of the files to compare runs by | `render-bench.cjs shots` |
| `bench` | the render benchmark per model (draws, triangles, frame CPU split; slow, about 5 minutes), run last and alone so its CPU times are its own. Opt-in: only with `--only bench` (or naming it with others) | `render-bench.cjs wb` |

It prints one summary table (pass, FAIL or skip per check, its time and its
key numbers) and the full report of any check that failed, exactly as its
script prints it. Options: `--only a,b`, `--skip a,b`, `--fast`, `--json`
(one JSON object instead of the table), `--port N` (use the server already on
`127.0.0.1:N` instead of starting one), `--log dir` (each check's full report
to `dir/<check>.txt`), `--verbose` (print them all), `--serial` (one page at a
time), `--jobs N` (pages at once beside the game's, default 2), `--shards N`
(how many workbench pages split islands, default 3), `--shots dir`.

How it saves time: the game (smoke) and the node tests run throughout while
the other pages share the remaining cores, two at a time, the biggest first:
weapons, houndlegs and animlint share one page (the modules load once); props
and the rig check share a workbench; bodysize gets a fresh workbench (it
switches the part merge off page-wide, and its builds share the workbench's
blob cache, so it starts as it does alone); islands, the slowest check, is
split over three workbench pages by model (it builds every model afresh with
the blob cache off, so a model's result doesn't depend on its page) and its
rows put back in order. In the cloud container (4 cores), on the same tree:

| | the separate scripts, one after another | `check.cjs` |
| --- | --- | --- |
| every check but the benchmark | 432 s (smoke 141, islands 207, props 22, animlint 28, bodysize 10, weapons 8, houndlegs 5, shots 5, node tests 6) | 173 s (`--skip bench`) |
| `--fast` (no smoke, islands or bench) | 84 s (the same parts summed) | 42 s |
| the benchmark (`render-bench.cjs wb`) | 281 s | 301 s (run alone, last; the same work) |

Sharing one build of each model between islands and bodysize was tried and
left out: islands builds with the blob cache off, bodysize with it on, and a
seeded comparison showed ten models' sizes moving in the second decimal.

Each check's script still runs on its own as before, and is now a thin
command line over its module: `require('./weapons.cjs').run({ browser, base,
page })` (and the same for the others) resolves to `{ ok, lines, summary,
rows }`, `lines` being what the script prints. Run alone, a script uses the
server on `PERF_PORT` (default 8765) or starts its own Node server there for
the run.

`PERF_SEED=n` makes `Math.random` a seeded generator before each model the
model checks build (`lib.cjs` `reseed`; the in-page loops call
`__perfReseed`), so two runs give the same numbers to the last digit (with
`check.cjs` and with the scripts alone): without it the idle poses, hair and
blobs draw on `Math.random` and the second decimals of weapons, props, islands
and bodysize wander from run to run (the findings don't). The smoke check's
levels are random either way.

## Run

From the repository root:

```bash
bash percyjackson/perf/run-all.sh            # everything, about 15 min
QUICK=1 bash percyjackson/perf/run-all.sh    # auto tier, 4 scenes, about 4 min
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/smoke.cjs   # every chapter loads; the audit fixes hold
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/weapons.cjs # every weapon points forward, at rest and in each strike
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/animlint.cjs # every pose of every model: the floor, parts flying off, weapons at the strike
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/houndlegs.cjs # the full-size hellhounds' legs stay rooted in the body in every pose
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/render-bench.cjs # rendering: draw calls, programs, frame CPU split, shader compiles in play (see RENDERING.md)
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/bodysize.cjs  # every model's body height (no arms, weapons, wings, whips, tails or flames) beside its whole box, × Percy
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/bodysize.cjs - '' --check  # the size check: every model inside its size category (design/sizes.json), big heads on big bodies flagged
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/props.cjs   # what every model holds and wears: props out of the fist, not along the forearm; none through the head or torso; no leg walking through clothing
```

It needs Node, Playwright (`NODE_PATH` points at a global install; default
`/opt/node22/lib/node_modules`) and a Chromium under `/opt/pw-browsers`, as in
the Claude Code cloud container. `run-all.sh` serves the repository on
`127.0.0.1:8765` (python `http.server`) if nothing is there yet; the check
scripts start a Node server there for the run if nothing is, and stop it.

Environment: `PERF_PORT`, `PERF_W` / `PERF_H` (viewport, default 640 x 360),
`PERF_FLAGS` (`webgl` default; `swiftshader` tries WebGPU; `gpu` for a real GPU),
`PERF_DIR`.

| Script | What it does | Output (in `local/percyjackson-perf/results/`) |
| --- | --- | --- |
| `check.cjs [--only a,b] [--skip a,b] [--fast] [--json] [--port N] [--log dir]` | Every pre-push check in one Chromium, one table (above) | stdout |
| `run.cjs [--quality low/medium/high] [--secs N] [--scenes a,b] [--no-profile] [--no-leak] [--leak-cycles N]` | Boot timing and network; then per scene: the synchronous load time, the first 30 frames, N s of scripted play (a WASD loop and attacks, the party kept alive), frame CPU time per subsystem, rAF intervals, long tasks, heap and allocation rate, `renderer.info` (draws, triangles, geometries, textures, programs) and scene-graph counts. A CPU profile and an allocation profile of the `combat` scene. A leak loop: camp → chapter → camp with forced GC. | `run-<quality>.json` |
| `profile-load.cjs [hub,lt1,...]` | CPU profiles of boot and of each level build plus its first 20 frames; meshes, geometries, materials and triangles per hero, monster and boss model; whether two builds share geometry | `load-profile.json` |
| `leak-hunt.cjs [cycles] [--snapshot]` | Live instances per class (CDP `Runtime.queryObjects`) after each round trip; detached meshes grouped by root; whether an old level is still reachable | `leak-hunt.json` |
| `retainers.cjs` | Marks camp's world group, reloads camp twice, takes a heap snapshot and prints the retainer path | `retainers.json` |
| `summarize.cjs` | Tables from every `run-*.json` | `summary.json`, `summary.md` |
| `smoke.cjs` | Every Book 1 chapter loads and runs with no page errors; the tracker has a goal; a hero refresh keeps cooldowns and health; the marker pool and the party-wipe checkpoint | stdout |
| `weapons.cjs [ids]` | Every armed model (heroes, bosses, monsters and fodder, champions, people, mortals) at rest and at the strike of each attack style: the weapon's tip (`markTip`, see the hand-axis convention in `game/js/entities/character.js`) must point forward of the hand along the model's facing, raised allowed at rest. Exits 1 on a failure | stdout |
| `animlint.cjs [ids] [--hero-styles] [--all]` | Every model in every pose the game plays on it (`game/workbench/animlint.js`): the hero poses for heroes and people; for monsters, champions and bosses also each of their own attacks, run by the real `Enemy` or `Boss` against a dummy on a flat floor (`game/workbench/ingame.js`). 30 frames a second, each checked: the lowest vertex under the floor (more than 5 cm, or 3% of a big model's height; deaths sink on purpose), a part further than 1.5 x the model's size from rest or a NaN transform, a weapon tip backward all through a strike. `--hero-styles` adds the hero poses a monster never plays (as info). Exits 1 on a failure | stdout |
| `render-bench.cjs [compiles] [wb] [game] [bg] [shots] [--ids a,b] [--shot-ids a,b] [--shots dir] [--secs N] [--settle ms] [--warm-wait ms] [--query ?batch=0]` | Rendering (the findings are in [RENDERING.md](RENDERING.md)). `compiles`: after a chapter and the open world load, each kind spawned, hit and killed, counting the shader pipelines built in play and their time. `wb`: each model alone in the workbench: draws, triangles, meshes, shadow casters, materials, programs, textures, the frame's CPU split (pose, floor and grip guards, tick, flames, render) and the allocation rate. `game`: the open world with a swarm of 24 fodder and a chapter with eight automatons (the level's own monsters cleared and its spawns frozen first, so runs compare), the same plus frame CPU percentiles, the draws before the spawn, and the crowd batches (`--query ?batch=0` runs it without them). `bg`: the automaton in the workbench as it opens, thumbnails and lint running behind it (long tasks, frame gaps). `shots`: each model drawn deterministically (seeded, fixed frames, camera and lights), so two runs compare pixel for pixel | `render-bench.json`, the shots in `results/shots/` |
| `props.cjs [keys] [--all] [--json out.json]` | Every workbench model as the workbench poses it: **grip**, a prop in a hand (`rig.handR` / `handL`; the people's and mortals' `handR` / `handL` parts) comes out of the fist and doesn't rise along the forearm (more than 1.5 px above the fist within 3 px of the forearm's sides), a long one's main axis lies 35 degrees or more off the forearm's line toward the elbow, and it is gripped (within 1.5 px of the fist); **arm**, a person's or mortal's arm slot holds only the sleeve (a prop drawn there stays fixed along the forearm while the wrist turns); **clip**, through idle, walk and run no held prop enters the head's or torso's skin box; **cloth**, through walk and run no leg swings more than 1.5 px into clothing hung from the hips or torso below the hip joints (a skirt, robe, coat or apron belongs on the swinging skirt panels, `Rig.swingSkirt`; leg wear on the leg); **strike**, a person's or mortal's marked weapon points forward at the strike of the workbench's attack poses. `design/sizes.json` `props.reviewed` lists what was looked at and left (the Minotaur's still aprons). Exits 1 on a failure | stdout, `out.json` if given |
| `houndlegs.cjs` | The full-size hellhounds (the elite, the alpha boss, Shadowfang and the Road West's hellhound champion; `monsters.js` `bigHound`) through idle, walk, run, bite, slam, bite on the run, hit, stagger and dodge at 30 frames a second: on every frame each leg's joint must sit at least 2 skin pixels inside the chest or haunch block it hangs from (`rig.extras.trunk`, above its underside and in from its ends) and the leg's own blocks must overlap that block. Exits 1 on a failure | stdout |
| `bodysize.cjs [out.json\|-] [keys] [--check]` | Every workbench model at rest: its body height (the torso, head and legs; a humanoid's arms, held things and `markTip` weapons, wings, the whip, tails and stings, flame hair, live flames, capes, hair strands and props in `rig.extras` left out) and its whole visible box, both × Percy, with the stat height, the triangle count, how high each left-out part reached and, for an upright rig, its head block's height over its body height. `--check` tests each against the size spec, [`../design/sizes.json`](../design/sizes.json): the body must lie in the band of the model's size category (the bands are one table there), and a big upright model's head must have shrunk toward an adult's proportions (the head rule; a known case marked `"head": "followUp"` is a warning). Used by the size audit (`../design/size-audit.md`, rounds 4 and 6). Exits 1 on a page error or a failed check | stdout, `out.json` if given |

Scenes: `title`, `prologue` (Manhattan), `lt1` (museum), `hub` (camp), `combat`
(camp plus 3 training waves, about 16 monsters), `lt2`, `lt4`, `lt10`,
`boss-lt2` (Minotaur), `boss-lt11` (Ares). They are reached through
`window.__game` (`beginSession`, `opening.startPrologue`, `loadHub`,
`startMission(Mission.defForChapter(chapter(id)))`, then
`mission.startBoss(level.bossRoom)` for the bosses). The scripts mark the save
as past the opening in memory only.

## How to read it

- In the cloud container WebGPU on SwiftShader loses its device, so the harness
  uses `--use-angle=swiftshader` and three.js falls back to its WebGL2 backend.
  Auto quality picks Low there; `--quality` forces another tier.
- The GPU is software, so frame rates (3–9 fps) and GPU times mean nothing.
  What does mean something is the CPU time of `game.frame()` and how it
  splits (`render` is three.js's JavaScript work per draw call), draw calls,
  object counts, allocations, load times and the leak counts.
- CDN files (three.js, fonts) come from the cache, filled on the first run,
  so load timings repeat.

## Animation lint

`animlint.cjs` lists nothing (October 2026). The shared causes it used to
find are handled in the rigs, so a new model gets them for free:

- **Whips** (`monsters.js` `whipPose`, used by the fury, Alecto and the
  Furies): the chain is posed in the body's own upright plane, not hung from
  the fist: a coiled loop at rest, streaming behind when moving or swooping,
  thrown back over the shoulder in a wind-up and lashed forward over the top
  in the crack. Any segment that would end below the ground is bent up to lie
  along it. A Fury's swoop flies no lower than her hem (`rig.hoverMin`).
- **Long weapons** (`Rig.gripGuard`, `character.js`): after the pose, a wrist
  whose weapon would sink below the soles turns by the least angle that puts
  its lowest point on the floor, so a slam's spear or club stops on the ground
  in front and a roll or a fall drags it along the floor.
- **Feet** (`Rig.footLift` and `QuadRig.floorGuard`, `quad.js`): humanoid hips
  stay as high as the legs' actual swing needs; a four- (six-, eight-) legged
  body rises by the deepest dip of any foot, splayed legs sweep fore and aft
  about the upright, as a spider's do, instead of dipping as they swing.
- **Heads, jaws and tails on QuadRig**: the head pitches up just enough to
  keep the jaw and fangs (and claws on the head) out of the ground, the body's
  rear end lifts the hips as it rears back, and each tail segment lifts as far
  as it must.
