# Hopper campaign movement and rhythm audit

## Delivered module

`levels.ts` exports `buildLevel(mission)` using zero-based mission indexes 0–2. Player and enemy spawn `y` means feet/surface y. Platform `y` means top surface; ceiling platforms support at `y + h`. Skins and background indexes are 0–8. Areas have local indexes 0–2. Each mission includes five named chapters per area, checkpoint metadata, 18 distinct campaign enemy types, optional signal shelves, salvage shelves, terrain hazards, and a broad three-tier boss arena. Every chapter runs nine main shelves: an entrance lesson, two encounters framing a rest checkpoint, the chapter crossing, and a closing push onto the exit shelf. After the lesson chapter every fight shelf carries a two-shelf high road, every chapter crossing is 40% longer than its authored gap and has a catch floor with a step back up, and the last foe of each encounter is an ambush: from behind in odd chapters and on finish shelves, from overhead in even chapters. See `LEVEL_DESIGN_AUDIT.md` for the design review behind these.

| Mission | Main route width | Main shelves incl. arena | Enemies | Checkpoints | Optional fragments |
|---|---:|---:|---:|---:|---:|
| Earthbound Thunder | 116,568 px | 136 | 87 | 31 | 9 |
| The Iron Migration | 116,458 px | 136 | 87 | 31 | 9 |
| Beyond the Black Sun | 119,291 px | 136 | 87 | 31 | 9 |

The route is generated from authored width, gap, rhythm and elevation control points. No collision surface depends on visual image content. The five chapters in each environment have different regional elevation destinations, shifted platform proportions and local relief; these should be surfaced as landmarks in the camera/HUD where useful.

## Verified

Run `node --experimental-strip-types audit-levels.mjs` using Node 22+ to regenerate `audit-results.json`.

The fixed-step simulation runs at 120 Hz with a 90 px body height, 650 px/s horizontal maximum, 2,400 px/s² air acceleration, -1,000 px/s launch impulse, 1,900 px/s² normal gravity, 0.48 held-gravity multiplier for the first 0.32 seconds, and 0.45 upward-velocity release cut. Gravity is sampled from the actual area at each simulated x. It explores multiple hold durations, approach speeds, acceleration, braking and target-centering trajectories. Takeoff is 100 px inside the old ledge, and a valid destination requires 70 px horizontal center clearance from both edges.

- Every one of the 408 main-route shelves, including all three boss arenas, is reachable through the directed ballistic graph. No failed mandatory jumps.
- All 27 optional signal shelves are reachable from their base shelf. All 54 high roads rise from their fight shelf, continue to their second shelf and drop onto the next landing. All 65 catch floors reach their recovery step, and every step rejoins the route.
- Every checkpoint lies on a stable, nonmoving shelf and outside immediate enemy/hazard proximity.
- Red region required gaps cap at 322 px and rises at 128 px; blue gaps cap at 882 px and rises at 291 px. Earth/industrial gaps cap at 490 px with rises below 230 px. The longest gap in every chapter is its crossing, and every crossing has a catch floor. These are deliberately forgiving while airborne combat is added.
- Mountain range vertical span is ~3,000 px, city ~2,629 px, launchworks ~3,600 px, blue drift ~3,197 px. The route includes long climbs, deliberate descents, quiet outlook shelves and safe recovery floors.
- Selected large crossings have lower salvage shelves and a short recovery step. Their visual/collision handling still requires engine integration verification.
- The optional purple inversion gallery activates above ordinary route-jump height, has a reachable intermediate staging shelf, a registered ceiling, and exits on either side above a single 1,100 px wide safe floor. Vertical entry and restored-gravity fall were simulated. Mandatory progress does not require inversion.

## Rhythm and integration requirements

Each region has ~13 authored combat shelves and ~32 traversal/rest shelves. The first chapter introduces each enemy alone before combinations. Each later chapter opens on a clear staging platform; demand alternates among climbing, downward flight, combat and a broad vista. Chapter starts and midpoints provide stable checkpoints. Three optional fragments per area create actual upper-route detours; they confer no required power.

Raw maximum-speed traversal takes about 55–65 seconds per area, before climbs, enemy engagement, corrections and optional routes. A first-clear estimate per area remains **unverified** until integrated playtesting. This audit does not claim measured campaign completion times or physical Xbox hardware testing.

The engine must cull offscreen scenery/enemies before expensive drawing/AI, since each mission spans over 115,000 world pixels. Keep platforms' painted tops aligned with collision `y`; do not stretch scenery into a giant opaque block that hides the route below. Paint salvage shelves in a lighter readable value.

`kind: oneWay` platforms must allow ascent through their underside. `kind: conveyor` is a static landing geometry with horizontal drift. Moving and crumble shelves occur only on optional routes. `press` and `arc` hazard cycles require visible preattack warnings; zero damaging offscreen attacks. Gravity gates use `{x,y,w,h,sign:-1}` with an explicit `ceilingId` and `label`; outside that rectangle restore the area's positive gravity. The optional gate should retain a clear “exit either side” cue.

Re-run this audit against final engine constants if any movement values change. Then play the teaching chapter, each gravity transition, each environment's steepest ascent/descent, a salvage recovery, optional inversion, and every boss approach in the browser. Numerical reachability cannot verify camera framing, animation feel, attack readability, input latency or actual render performance.
