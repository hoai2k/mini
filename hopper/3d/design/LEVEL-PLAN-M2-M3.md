# Level plan · missions two and three

The working plan for building the second and third episodes of the 3D edition, and the record of what is done. `source/design.md` describes the game; this describes the build of these six districts against the game as it now stands: open strongholds with perched hosts in view, three gaits and climbable walls, the aiming view, the trail camera. Where the design document and this plan differ, this plan is current and the design document is updated when a district lands.

Districts, shadows and commanders are built in the order below. Each part is committed to `main` when it passes its checks. State is kept in the **Progress** section at the end.

## What changed since the design was written

- **Strongholds do not lock.** A stronghold is a dangerous cluster on the trail whose host waits in plain view on its structure tops; the threshold onward is always open. Only the commander bars an episode's end. Every stronghold below therefore needs *tall things with tops* for its host to perch on, placed where the interlude before it can see them.
- **Walls are climbable.** Any face Hopper pushes into is a way up. The exhaust shaft, the gantry tower and the root pillars are climbs as much as wall-kick ladders now, and stronghold structures can be scaled to reach their perched hosts.
- **Three gaits.** Ground past 46° is walked in the climb gait: the terrace flanks and basin walls should be authored steep enough to read as climbs where the design wants them.
- **Hosts count.** The HUD counts a stronghold's host; the region is freed when it is down. Each stronghold below lists its host in release order.

## Mechanics the new regions need

| Mechanic | Where | Build |
| --- | --- | --- |
| District gravity | Basin 1.35×, Drift 0.55×, Violet 0.85× | `REGIONS[].gravity` sets `gravityScale` at load and respawn; the crouch-leap apex and the hover follow from it |
| Soft floors | Foundry slag channel, Docks sea, Drift dust | `district.terrain.soft: { kind, level, lift, shore? }`: below `level` Hopper is lifted (slag, dust) or pushed toward the trail and lifted (sea); never a death |
| Conveyors | Foundry belts | placement `flow: { dx, dz, speed }`: a grounded Hopper on the span is carried along it |
| Press rams | Foundry presses | placement `moving` with `fling: true`: standing on the ram as it rises past 15 m/s launches Hopper with the ram's speed plus a margin |
| Drifting reefs, ring shards, crane loads, piston stairs | Drift, Violet, Docks, Works | ordinary `moving` placements; loads on crane cables and reefs on currents are just slow `moving` |
| Stepping stones | Slag casters | `world.dropStone(x, y, z, life)`: a temporary 8 × 2 × 8 collider drawn by the scene, gone after `life` seconds |
| Inverted gravity | Violet seams and gates, cantors, the Regent | a `flip` volume: inside it gravity pulls up (`gravityScale < 0`); the controller lands on ceilings (`World.ceilingAt`), the rig hangs the body from its feet, the camera keeps the horizon. Cantors and the Regent make temporary flip volumes |
| Staged bridge | Basin coral bridge | placement `staged: { stages: 3, after: 1.2 }`: each third of the deck drops away 1.2 s after Hopper leaves it, with a crack tell |

## The twelve new shadows

Numbers are in laser pulses, metres and seconds, in the form of `combat3d`'s SPECS: hp · body radius × height (authored) · size · notice · range · tell · recover · cooldown. Every kind keeps its 2D silhouette, tell and core.

| Kind | Region | Class | Spec | Behaviour |
| --- | --- | --- | --- | --- |
| furnaceHound | foundry | ground charger | 5 · 2.8×3.4 · 4.2 · 150 · 120 · 0.6 · 1.0 · 2.0 | Vents glow (tell), then a straight charge at 62 m/s along the tell line for up to 1.4 s or until a wall; contact 2 and a hard knock. Ends in a 0.7 s skid with the core open (`open` 1.0): stomp mid-skid or strike from behind. Patrols like a shade hound otherwise |
| slagCaster | foundry | rooted lobber | 6 · 3×6 · 3.0 · 220 · 220 · 0.8 · 1.2 · 2.6 | Scoops (tell), lobs one slag ball (gravity projectile, radius 3, damage 1) at Hopper's predicted spot. Where it lands it cools into a **stepping stone** (`dropStone`, 9 s). Core opens 1.2 s after each throw |
| chainManta | harbor | flyer, platform dragger | 5 · 4.5×1.6 · 3.4 · 200 · 200 · 0.9 · 1.5 · 3.0 | Tether drops (tell); for 2 s it hovers over the nearest moving structure within 140 m and boosts it (speed ×3, `moving.boost`), so the platform Hopper meant to land on slides away. The tether node is exposed for those 2 s (`open`). Its back is a bounce like any flyer |
| ballastCrab | harbor | armoured slammer | 12 · 3.6×4.5 · 3.4 · 140 · 40 · 0.85 · 1.2 · 2.4 | Walks at 16. Rears (tell), slams: a 22 m ground shockwave that only hurts a grounded Hopper (1). Rear core open 1.4 s after the slam. Armoured otherwise |
| coilWraith | launchworks | rooted lane gate | 6 · 1.6×3 · 4.0 · 240 · 240 · 0.9 · 1.5 · 2.0 | Holds a beam between itself and its `link` point (spawn extra, absolute). Nodes brighten (tell), the beam holds 3 s: crossing within 4 m of the segment is 1 damage and a knock. Node open 1.5 s after. Shooting it out clears the lane |
| turbineWasp | launchworks | flyer, dasher, platform | 5 · 3.5×2.4 · 3.5 · 180 · 160 · 0.7 · 1.6 · 2.5 | Intake contracts (tell), dashes at 70 m/s for 1.2 s, contact 1. **Kicked, it stalls**: drops 6 m and hangs still for 5 s with `open` 5 as a platform; stomping it then is full damage and a bounce |
| basaltBurrower | red | ground, erupts | 8 · 3×3.5 · 3.6 · 160 · 80 · 0.9 · 1.4 · 3.0 | Travels under the ground (`underground`, untargetable, 20 m/s) toward where Hopper will land. Cracks trace it (tell at the spot), then it erupts: 14 m shockwave (1) on the grounded, and it is airborne for a moment before landing with the soft back open 1.5 s |
| thornChoir | red | rooted fan volley | 6 · 2.4×5 · 3.0 · 220 · 220 · 1.0 · 1.5 · 3.0 | Heads open in sequence (tell), then a fan of five seeds across 40°. **Kicking one staggers every choir of its group** (all drop to recover) |
| veilMedusa | blue | flyer, the spring | 4 · 4×5 · 3.5 · 150 · 30 · 0.8 · 1.8 · 2.5 | Drifts toward Hopper at 9. Bell flashes (tell), radial pulse: 24 m in every direction (1). Lasers pierce (no armour). **Stomping it bounces 1.8× the usual apex** |
| phaseSkate | blue | blink-dasher | 5 · 3×2.5 · 3.4 · 170 · 150 · 0.5 · 1.2 · 2.2 | Fades (0.5 s `phased`: untargetable, drawn faint), shows a silhouette 30 m from Hopper (0.4 s), goes solid and dashes at 80 m/s for 0.6 s (1). `open` 0.4 s at the moment it turns solid: a free stomp |
| mirrorStalker | violet | floor and ceiling lunger | 7 · 2.6×3.6 · 3.8 · 150 · 50 · 0.7 · 1.0 · 2.0 | Mask tilts (tell), lunges at 50 m/s for 0.8 s (2), recovers open 1.0. A spawn with `ceiling: true` hangs under a lintel at its absolute y and lunges *down* along a straight line, then returns |
| gravityCantor | violet | flyer, gravity flipper | 7 · 3.5×5 · 3.2 · 220 · 200 · 1.5 · 2.0 · 4.0 | Prongs count in (a long tell), then flips gravity in a cylinder (r 30, from the ground to 80 m) under it for 4 s (`world.flip`). Core open 2 s after. Shoot the core or fly round it |

Rooted kinds (they keep their spawn, no perch): slagCaster, coilWraith, thornChoir; the audit's `ROOTED` set gains them. Ground kinds perch on tops like hounds; flyers launch from crowns.

## The commanders

### Smelter Leviathan · Skyhook Works, the gantry elevator

Coiled around the elevator tower (a `gantryElevator` at the arena centre, 150 m) with the launch ring above. Head is the aim target; the body is a chain of twelve segments along a helix around the tower, phase-driven. 160 hp.

- **Phase 1, the pad (100–66%).** The tail sweeps the deck: a rotating arc hazard 2 m off the pad, one revolution in 2.4 s, telegraphed a quarter-turn ahead. Jump it. After each sweep the tail joint (a core point at the base) opens 2 s: kick it (4) or shoot it.
- **Phase 2, the breath (66–33%).** Furnace breath fills one marked half of the tower for 3 s (damage 2 a second to anyone in that half within 60 m of the tower); the maw opens on the cool side, high (a core point 70 m up on the tower's far face). Climb or wall-kick the cool side and fire into it. The half alternates.
- **Phase 3, the ring (33–0%).** It uncoils across the ring pads and shows cracked segments in sequence (three of them, 60 to 120 m up on the ring pads): stomping a cracked segment opens the inner core (the head, 3 s) for lasers. Falling off the tower lands on the pad; a thermal at the pad's edge is the way back up.
- **Death.** Dissolves around the tower; the star gate at the top opens (the exit).

### Eclipse Regent · Violet Inversion, the eclipse dais

On the dais before the cathedral facade, in three gravity phases announced by seams and a 1.5 s count-in. 180 hp. The heart (aim target) hangs 60 m over the dais; two hands are core points at dais level.

- **Phase 1, heavy (100–66%), gravity 1.35×.** Shadow rings crawl out across the dais from the centre (expanding ring hazards, 1 damage to the grounded inside a 6 m band; jump them). After each pair of rings the hands lower for 3 s: kick a hand to open the heart 4 s.
- **Phase 2, light (66–33%), gravity 0.5×.** Lances fall on marked spots (1.2 s mark, then a strike, 2 damage within 8 m). Two medusae are summoned (capped at two) as the bounces up to heart height; the heart opens 3 s after each lance volley.
- **Phase 3, alternating (33–0%).** Every count-in (3 s) the arena's gravity flips between 0.85× down and 0.85× up; the dais floor and the ring shards overhead swap roles. Rings and lances continue. The heart opens after two successful interactions per cycle (a hand kicked or a medusa bounced).
- **Death.** The return to Earth and the credits.

## Mission two · The Iron Migration

Five chapters per district as before: interlude, stronghold, interlude, stronghold, finish. Totems at every interlude start and stronghold edge; three signals (high, low, caged) per chapter pair; a capsule where each fight is. z runs negative toward the landmark; the trail winds ±26 m through the props.

### Cinder Foundries (foundry) · 0 → −50 m · landmark: the crane forest

Ochre smoke, furnace light. Furnace doors and chimney lips are thermals; belts carry; presses fling; slag lifts anyone who falls in.

| Chapter | z | Beat | Content |
| --- | --- | --- | --- |
| 1 Furnace row | 20 → −440 | learn (conveyors) | Two conveyor spans on the road with the flow forward, a chimney (thermal) to the left, a furnace tower with a glowing door (thermal) to the right, a press beside the path with its ram as a demonstration launch. Patrol: two furnace hounds |
| 2 The Casting Yard | −440 → −900 | fight | Stronghold, centre (0, −680), r 200. Three furnace towers and two chimneys close together, a press at the centre; belts between the towers. Host in order: furnace hound ×2 on tower decks (0, 1.5 s), slag casters ×2 on the chimney lips (0.5, 2), furnace hound ×2 on the ground (3, 4), ambush hound (5); second wave: caster, two hounds. Capsule at the press |
| 3 Belt run | −900 → −1240 | run | Four conveyor spans in sequence over slag barges on the channel edge, two presses whose rams launch across gaps, a thermal from a furnace door at the end. Patrol: two hounds along a belt |
| 4 The Slag Channel | −1240 → −1700 | fight (hazard) | Stronghold, centre (0, −1470), r 210, in the casting trench (valley 100 m wide, 45 m deep, hot slag at the floor: soft lift). Slag barges are the stepping stones across; casters on the barges lob stones that add more; hounds run the belt spans crossing the trench. Host: casters ×3 (barges and trench lip), hounds ×3 on the spans, ambush hound; wave two: two casters, hound |
| 5 Trench road | −1700 → −2100 | finish | Out of the trench on a furnace-door thermal, the road between chimneys toward the crane forest; exit at (0, −2050) |

Terrain: relief 40; plateaus at the start (0) and the exit (−50 with a long shelf); valley along x at −1470, width 100, depth 45; `soft: { kind: 'slag', level: −44 (absolute), lift: 28 }`.

### Tempest Docks (harbor) · 0 → 180 m · landmark: the launch spine

Rain, sea-green steel, spray. Container stacks are stairs; crane booms carry loads on cables; the sea beside the breakwater pushes a fallen Hopper ashore.

| Chapter | z | Beat | Content |
| --- | --- | --- | --- |
| 1 Breakwater | 20 → −420 | climb (stairs) | The breakwater along the left edge with the sea beyond it (soft: sea at −6 m, pushed back to the trail), container stacks of rising height on the road as stairs, a crane boom overhead. Patrol: two crabs |
| 2 The Container Yard | −420 → −880 | fight | Stronghold, centre (0, −650), r 200. Six stacks in two rows, three crane booms whose loads (moving container stacks on short paths) are the way across, a gantry tower at the back. Host: crabs ×3 on the stack tops, mantas ×3 launching from the boom tips, ambush crab; wave two: manta, two crabs |
| 3 The freighter crossing | −880 → −1260 | vista (long crossing) | The freighter's decks over the storm channel (sea below), a boom on the far quay; the crossing is the length of the ship. Patrol: two mantas over the channel |
| 4 The Gantry Tower | −1260 → −1700 | climb + fight | Stronghold, centre (0, −1480), r 200, on a plateau at 90 m: the gantry tower with four decks and the bridge, stacks around it. The climb up the tower is the fight: crabs hold the decks, mantas drag the bridge platform. Host: crabs ×3 (decks), mantas ×3, ambush crab; wave two: crab, two mantas |
| 5 Crane forest | −1700 → −2100 | climb | Five crane booms of rising height, each boom tip a landing, toward the launch spine; exit on the last boom (0, −2050) at 180 m |

Terrain: relief 30; plateaus at the yard (0), the tower (−1480, 90) and the crane forest (−2050, 150); `soft: { kind: 'sea', level: −6, lift: 14, shore: true }` with the sea to the left of x = −140 and under the channel (a valley along x at −1070, width 140, depth 40).

### Skyhook Works (launchworks) · 0 → 300 m, shaft −120 m · landmark: the star gate

Pale gold above the clouds. The exhaust shaft descends by baffles with a thermal at the bottom; piston stairs rise and fall out of phase; the elevator rides beside the rocket; the launch ring crowns the spine.

| Chapter | z | Beat | Content |
| --- | --- | --- | --- |
| 1 Exhaust shaft | 20 → −440 | drop (climb) | The road ends at the shaft rim; the shaft descends 120 m by four baffles (ledges in its wall, climbable faces between), a thermal at the bottom lifts back out. Patrol: two wasps circling the rim |
| 2 The Piston Yard | −440 → −900 | fight | Stronghold, centre (0, −680), r 200. Three piston stairs (moving, out of phase), scaffolds, a coil wraith pair gating the lane between the stairs. Host: wasps ×3 from the stair tops, wraiths ×2 (rooted, linked), ambush wasp; wave two: two wasps, wraith |
| 3 Scaffold lanes | −900 → −1260 | run | Lanes between the rocket's gantry scaffolds, each gated by a wraith pair; wasps as platforms across a gap. Patrol: wraith pair |
| 4 The Launch Ring | −1260 → −1720 | fight | Stronghold, centre (0, −1490), r 220, at 200 m: the ring's eight pads around the spine, piston stairs up to them. Host: wasps ×4 on the pads, wraiths ×2 gating the ring, ambush wasp; wave two: three wasps |
| 5 The gantry elevator | −1720 → −2150 | finish (boss) | The elevator tower at (0, −2000) on a 300 m plateau with the rocket beside it; the Leviathan arena, r 260; the star gate at the top is the exit |

Terrain: relief 35; plateaus at the rim (0), the shaft floor (−230, −120, r 90), the yard (−680, 40), the ring (−1490, 200) and the elevator (−2000, 300).

## Mission three · Beyond the Black Sun

### Vermilion Basin (red) · gravity 1.35× · 0 → 40 m, basin −90 m · landmark: the black sun

Red coral, ivory ribs, a black sun. Leaps are short and landings heavy; terraces are wide.

| Chapter | z | Beat | Content |
| --- | --- | --- | --- |
| 1 Rib road | 20 → −420 | learn (heavy gravity) | Ivory-topped terraces as wide steps, a rib arch across the road, coral spires as cover. Patrol: two burrowers under the road |
| 2 The Choir Arches | −420 → −880 | fight | Stronghold, centre (0, −650), r 200. Three rib arches in a row with choirs on their crowns, burrowers under the terraces between. Host: choirs ×3 (rooted, on the arches), burrowers ×3, ambush burrower; wave two: choir, two burrowers |
| 3 The staged bridge | −880 → −1260 | hazard | The coral bridge over the basin breaks behind Hopper in three signalled stages; dawdle and he drops to the basin floor (−90 m) where a spring pad waits. Patrol: two burrowers on the far side |
| 4 The Basin Floor | −1260 → −1720 | fight | Stronghold, centre (0, −1480), r 210, on the basin floor with spires and a terrace ring around it. Host: burrowers ×3, choirs ×3 on the spires, ambush burrower; wave two: two choirs, burrower |
| 5 Terrace ascent | −1720 → −2100 | climb | The terraces climb 130 m out of the basin toward the eclipse; exit at (0, −2050) at 40 m |

Terrain: relief 50; plateaus at the start (0), the arches (−650, 10), the basin (−1480, −90, r 300), the exit (−2050, 40); valley along x at −1070, width 180, depth 90 (the basin the bridge spans).

### Cobalt Drift (blue) · gravity 0.55× · 0 → 330 m · landmark: the drift moon

Ultramarine, stars, the moon. Everything floats: reefs drift on current paths, pillars rise with shelves; falling lands in dust that lifts back to the lowest reef.

| Chapter | z | Beat | Content |
| --- | --- | --- | --- |
| 1 The lowest reefs | 20 → −420 | learn (light gravity, glides) | Three reefs drifting slowly on marked currents (moving), the dust floor below (soft lift), a root pillar to the side. Patrol: two skates |
| 2 The Root Pillars | −420 → −880 | fight | Stronghold, centre (0, −650), r 220. Four root pillars with shelves at 40, 80, 120 and 160 m; reefs between. Host: medusae ×3 (the bounces up), skates ×3, ambush skate; wave two: medusa, two skates |
| 3 Current crossing | −880 → −1260 | run (currents) | Two dust currents carrying a glide across a gap between reef groups, medusae as bounces. Patrol: two medusae |
| 4 The High Reef | −1260 → −1720 | fight | Stronghold, centre (0, −1480), r 220, at 330 m: a ring of reefs around a great reef. Host: skates ×4, medusae ×2, ambush skate; wave two: two skates, medusa |
| 5 The moon road | −1720 → −2100 | vista | Reefs stepping toward the moon; exit at (0, −2050) at 330 m |

Terrain: relief 20 (the floor is dust); plateaus as reef bases at 60 (start), 150 (pillars), 250 (crossing), 330 (high reef, exit); `soft: { kind: 'dust', level: 30, lift: 22 }`.

### Violet Inversion (violet) · gravity 0.85× · 0 → 160 m · landmark: the eclipse cathedral

Dark purple, obsidian arches, ring shards, glowing seams. Under every arch a seam marks an inverted lane on the lintel's underside; one arch late in the region must be crossed inverted.

| Chapter | z | Beat | Content |
| --- | --- | --- | --- |
| 1 The first arch | 20 → −420 | learn (seams) | Two obsidian arches with seams on their undersides (optional inverted lanes with a signal on one lintel), ring shards drifting overhead. Patrol: two stalkers |
| 2 The Shard Ring | −420 → −880 | fight | Stronghold, centre (0, −650), r 220. A ring of six shards orbiting (moving on chords) around an arch; stalkers on the shards and under the arch, a cantor over the centre. Host: stalkers ×3 (two floor, one ceiling), cantor, stalker ambush; wave two: two stalkers, cantor |
| 3 The inverted gallery | −880 → −1260 | hazard (required inversion) | A long arch whose floor is broken: the only way across is the seam lane under its lintel, inverted, with the way out marked. Patrol: two stalkers on the ceiling |
| 4 The Cathedral Approach | −1260 → −1720 | fight | Stronghold, centre (0, −1480), r 220, before the facade: arches and shards, cantors flipping the approach. Host: stalkers ×3, cantors ×2, ambush stalker; wave two: two stalkers, cantor |
| 5 The eclipse dais | −1720 → −2150 | finish (boss) | The dais at (0, −2000) at 160 m before the facade; the Regent arena, r 240 |

Terrain: relief 45; plateaus at 0, 40 (ring), 90 (gallery), 130 (approach), 160 (dais).

## Build order

1. Scaffolding: the twelve kinds in SPECS and the shadow-kind type, per-region behaviour files, the shadow test harness, names. *(root)*
2. Shadow behaviours in three batches, in worktrees: ground kinds; rooted kinds and stepping stones; flyers. *(sonnet agents, one file each, tests in their own files)*
3. Engine mechanics: gravity, soft floors, conveyors, press rams, staged bridge *(sonnet agent)*; inverted gravity and flip volumes *(root)*.
4. The six districts. *(root)*
5. The Leviathan *(sonnet, from the contract above)*, then the Regent *(root, needs inversion)*.
6. Episode flow: `MISSIONS` extended, play-select, episode test for all three missions, audit, docs, deploy.

## Progress

- [x] Plan written.
- [x] Scaffolding: `SPECS` for the twelve kinds, `ShadowContext`/`ShadowBehaviour`, the `BEHAVIOURS` registry (`shadows/index.ts`), the shared harness (`qa/tests/harness3d.mjs`).
- [x] Shadows: ground (`shadows/ground.ts`, 28 checks) · rooted (`shadows/rooted.ts`, 13) · flyers (`shadows/flyers.ts`, 25).
- [x] Mechanics: district gravity from the palette · soft floors (`terrain.soft`, the scene's sheet) · conveyors (`Placement.flow`) · press rams (`moving.fling`) · staged bridge (`Placement.staged`) · inverted gravity (flip volumes, `World.ceilingAt`, the mirrored step in `controller.ts`, the hanging rig and mirrored gait; `qa/tests/inversion3d.mjs`, 16 checks). A terrain `shelf` gives the Docks their sea.
- [x] Districts: foundry · harbor · launchworks · red · blue · violet, all passing `qa/audit-districts.mjs`; each region has its own middle-distance structures. The eclipse canopy hangs at 280 over the dais.
- [x] Commander interface (`Commander`, `CommanderRuntime`, marks and segments drawn generically by the scene; `commanders.ts` picks the fight by kind).
- [x] Leviathan (`leviathan3d.ts`, 37 checks in `qa/tests/boss-leviathan.mjs`) · Regent (`regent3d.ts`, 29 checks in `qa/tests/boss-regent.mjs`), both to the contracts above. The Regent counts a medusa bounce by the medusa's death (a stomp's 5 always kills its 4 hp).
- [x] The last episode ends on the finale banner (Hopper's return to Earth); the design documents are regenerated.
- [ ] Episode flow: an episode test for missions two and three (`qa/tests/episode3d-m2m3.mjs`), then the merge to `main` and the deploy.

### Notes for whoever continues

- Under inverted gravity `stepHopper` runs in `MirrorWorld` (heights negated, undersides as floors); the engine picks each frame's gravity: the commander's `runtime.gravity` while awake, else the district's, negated inside a flip volume. A turn halves `vy`, so a fall out of a seam's top settles at its edge instead of bobbing.
- Seams are permanent flips (`life: Infinity`) from a hop's height (`y − 56` of the seam) to just past the lintel; walking under a seam does nothing, a hop enters it. The piers let a hanging Hopper climb back down.
- Soft floors: Foundry slag at −60 (the trench floor is under it, the barges float at −63 with tops at −57), Docks sea at −6 with a shelf west of x = −140, Drift dust at 12. The trail never dips under a level (checked by sampling the route; add plateaus if it does).
