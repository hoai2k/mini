# Half-Blood Quests: performance harness

Drives the game (`/percyjackson/game/`) in headless Chromium with Playwright and
measures each scene. It reads the repository and never writes to it: results
and a cache of the CDN files go to `local/percyjackson-perf/` (ignored by Git;
`PERF_DIR` moves it). It isn't published and isn't part of the game's checks.
The findings it produced, and what is still to do, are in
[../design/audit.md](../design/audit.md).

## Run

From the repository root:

```bash
bash percyjackson/perf/run-all.sh            # everything, about 15 min
QUICK=1 bash percyjackson/perf/run-all.sh    # auto tier, 4 scenes, about 4 min
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/smoke.cjs   # every chapter loads; the audit fixes hold
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/weapons.cjs # every weapon points forward, at rest and in each strike
NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/animlint.cjs # every pose of every model: the floor, parts flying off, weapons at the strike
```

It needs Node, Playwright (`NODE_PATH` points at a global install; default
`/opt/node22/lib/node_modules`) and a Chromium under `/opt/pw-browsers`, as in
the Claude Code cloud container. `run-all.sh` serves the repository on
`127.0.0.1:8765` (python `http.server`) if nothing is there yet.

Environment: `PERF_PORT`, `PERF_W` / `PERF_H` (viewport, default 640 x 360),
`PERF_FLAGS` (`webgl` default; `swiftshader` tries WebGPU; `gpu` for a real GPU),
`PERF_DIR`.

| Script | What it does | Output (in `local/percyjackson-perf/results/`) |
| --- | --- | --- |
| `run.cjs [--quality low/medium/high] [--secs N] [--scenes a,b] [--no-profile] [--no-leak] [--leak-cycles N]` | Boot timing and network; then per scene: the synchronous load time, the first 30 frames, N s of scripted play (a WASD loop and attacks, the party kept alive), frame CPU time per subsystem, rAF intervals, long tasks, heap and allocation rate, `renderer.info` (draws, triangles, geometries, textures, programs) and scene-graph counts. A CPU profile and an allocation profile of the `combat` scene. A leak loop: camp → chapter → camp with forced GC. | `run-<quality>.json` |
| `profile-load.cjs [hub,lt1,...]` | CPU profiles of boot and of each level build plus its first 20 frames; meshes, geometries, materials and triangles per hero, monster and boss model; whether two builds share geometry | `load-profile.json` |
| `leak-hunt.cjs [cycles] [--snapshot]` | Live instances per class (CDP `Runtime.queryObjects`) after each round trip; detached meshes grouped by root; whether an old level is still reachable | `leak-hunt.json` |
| `retainers.cjs` | Marks camp's world group, reloads camp twice, takes a heap snapshot and prints the retainer path | `retainers.json` |
| `summarize.cjs` | Tables from every `run-*.json` | `summary.json`, `summary.md` |
| `smoke.cjs` | Every Book 1 chapter loads and runs with no page errors; the tracker has a goal; a hero refresh keeps cooldowns and health; the marker pool and the party-wipe checkpoint | stdout |
| `weapons.cjs [ids]` | Every armed model (heroes, bosses, monsters and fodder, champions, people, mortals) at rest and at the strike of each attack style: the weapon's tip (`markTip`, see the hand-axis convention in `game/js/entities/character.js`) must point forward of the hand along the model's facing, raised allowed at rest. Exits 1 on a failure | stdout |
| `animlint.cjs [ids] [--hero-styles] [--all]` | Every model in every pose the game plays on it (`game/workbench/animlint.js`): the hero poses for heroes and people; for monsters, champions and bosses also each of their own attacks, run by the real `Enemy` or `Boss` against a dummy on a flat floor (`game/workbench/ingame.js`). 30 frames a second, each checked: the lowest vertex under the floor (more than 5 cm, or 3% of a big model's height; deaths sink on purpose), a part further than 1.5 x the model's size from rest or a NaN transform, a weapon tip backward all through a strike. `--hero-styles` adds the hero poses a monster never plays (as info). Exits 1 on a failure | stdout |

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
