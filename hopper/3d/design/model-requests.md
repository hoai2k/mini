# 3D model requests

Every model the 3D edition needs, with the rig it must have. Ids are stable: the stand-in manifest, the stand-in registry and the game code use them. `Stand-in` names the procedural placeholder from `hopper/3d/standins/` that is in use until the model arrives; `Final` is where the delivered GLB goes. Generated from `source/build_requests.py`; edit the data there, not this file.

**Round two references.** Before any model here is started, its reference sheet from `image-requests-round-2.md` is generated and approved: a turnaround per species and commander, a kit sheet per region, a props sheet and a Hopper pose sheet for the new clips. That document maps every sheet to the models that wait on it. A single side-view sprite is not enough to model from; a turnaround is.

**Code-built entries need a clean-up pass.** They are exported straight from three.js primitives: one mesh per part, no welding between parts, faceted duplicates, full 1024² trim and terrain sheets embedded in every file. `models/CODE-BUILT-CLEANUP.md` lists the Blender processing that turns them into shippable meshes (merge by material, weld and remove hidden faces, retopologise the rock and canopy shells, unwrap to one atlas per model, bake the trim and terrain paint into it, author LOD1 by hand, re-export through the same validator). Until then they cost about 4 MB each, mostly texture.

**Code-built entries.** Requests marked `delivered` with the note *Code-built* were exported by `hopper/game/scripts/code-models.mjs` (three.js geometry painted with the delivered trim and terrain sheets, same GLB contract, `authoring: code-built` in `models/manifest.json`). They are in the game so episode one plays end to end, and they remain replaceable by painted models without any code change: drop the new GLB at the same path and rerun the validator.

Conventions for every delivery: glTF binary, metres, +Y up, +Z forward, `KHR_mesh_quantization` and `EXT_meshopt_compression` like the delivered Hopper GLBs, hand-painted albedo (no photographic PBR), emissive masks for cores and lights, LOD0 and LOD1 in the same file, and named sockets as empties. Root motion only where a clip says so.

## Rig types

- **skeletal** — Skeletal, skinned. Joints listed, clips authored, sockets as named empties. Delivered as GLB with KHR_mesh_quantization + EXT_meshopt_compression, +Y up, +Z forward, metres, like the Hopper GLBs.
- **rigid** — Rigid hierarchy. Separate parts parented to named pivots, animated by transforms only (no skinning). Same GLB conventions.
- **spline** — Spline chain. A run of bones along a curve that the game drives at runtime (follow-the-leader or IK). Deliver the bone chain, one rest curve and any head/tail clips.
- **static** — Static mesh. No rig; collision comes from the game (see landings). Optional UV scroll for belts.
- **blend** — Blend shapes added to a skeletal rig for organic tells (throat inflate, bell pulse, wing fold).

## Summary

| Category | Requests | Delivered | Stand-in | Open |
| --- | ---: | ---: | ---: | ---: |
| hopper | 2 | 1 | 0 | 1 |
| rider | 1 | 0 | 0 | 1 |
| enemy | 18 | 0 | 18 | 0 |
| boss | 3 | 0 | 3 | 0 |
| structure | 44 | 44 | 0 | 0 |
| prop | 15 | 15 | 0 | 0 |
| landmark | 9 | 9 | 0 | 0 |
| terrain | 1 | 1 | 0 | 0 |
| **total** | **93** | **70** | **21** | **2** |

## Hopper and the rider

### M-000 · Hopper and rider (combined GLB)

The delivered insect rig (51 joints) with the boy parented under Hopper.Seat. The 3D game loads this file as-is; the proxy exists for engine tests and for scale in stand-in scenes.

- **Rig:** skeletal · **Status:** delivered · **Final:** `models/hopper-rider.glb` · **Stand-in:** `hopper.proxy`
- **Clips:** 25 delivered (see models/manifest.json)
- **Sockets:** 18 Hopper + 8 rider sockets (see models/manifest.json)
- **Textures:** delivered 4K colour + normal

### M-001 · Hopper: traversal and air-combat clips

New clips on the existing HopperRig. No mesh or joint changes. Walk/Run stay in place; every airborne clip is physics-driven (no root motion). Wings open from the folded rest pose.

- **Rig:** skeletal · **Status:** open · **Final:** `models/hopper-rider.glb (new clips)` · **Stand-in:** `hopper.proxy`
- **Clips:** Wing_Open (0.25 s), Glide_Loop (wings spread, hind legs trailing), Wing_Close (0.2 s), Dive_Loop (legs tucked, head down), Stomp_Land (deep compression + shockwave pose, 0.6 s), Air_Kick (Spin_Kick timed for 0.6 s with the body level), Wall_Kick (plant + push, 0.35 s), Ledge_Mantle (front legs hook, haul, 0.7 s), Hop_Back (0.45 s), Crouch_Charge_Loop (femurs compressing progressively, 0.8 s, sampled by charge), Super_Leap_Start (0.3 s), Lock_Strafe_L/R (sidestep loops), Hit_Air (0.5 s), Land_Heavy (from a dive, 0.8 s)
- **Sockets:** existing; add Hopper.Wing.L/R tip sockets for glide trails
- **Textures:** existing

### M-002 · Rider: reaction clips

Additional seated reactions layered over Riding_Idle: Glide_Lean (arms back, scarf streaming), Dive_Tuck, Stomp_Brace, Point_Forward (used by Horizon View), Look_Up_Long (watching a flyer), Cheer_Short. All local to the seat; never leave the couch.

- **Rig:** skeletal · **Status:** open · **Final:** `models/hopper-rider.glb (new rider clips)` · **Stand-in:** `hopper.proxy`
- **Clips:** 6 listed
- **Sockets:** existing
- **Textures:** existing

## Shadow species (18)

Sizes are the stand-in's measured bounds and the model's target. Every species needs: a `Core` socket at its weak point, a `Hitbox.Body` socket, a `Mouth` or `Emitter` socket where it attacks from, the listed clips, a 2K painted sheet over the shared shadow hide (T-037), and a `Dissolve` that hands over to the shared shadow-dissolve effect. Flyers and anything stompable add a `Landing` socket on the surface Hopper bounces from.

### M-003 · Shade Hound (Sunseed Fields)

Low angular quadruped with luminous ivory ribs. Pounces at Hopper from cover and from rooftops; the ribs open when it lands.

- **Rig:** skeletal — spine ×3, neck, head, jaw, tail ×3, 4 legs × 3
- **Size:** 3 × 3 × 9 m · **Triangles:** 6k / 2k · **Stand-in:** `enemy.shadeHound` · **Final:** `models/enemies/shadeHound.glb`
- **Clips:** Idle, Prowl, Run, Crouch_Tell, Pounce (root motion), Land, Bite, Hit, Dissolve
- **Sockets:** Core (belly ribs), Mouth, Hitbox.Body

### M-004 · Seed Spitter (Sunseed Fields)

Rooted ink flower. Inflates its throat, then lobs three arcing seeds. Rooted on terraces and roof gardens; cannot move, so it is the sniper the route bends around.

- **Rig:** blend — stalk ×3, bulb, 6 petals, throat; blend: ThroatInflate
- **Size:** 5.3 × 5.8 × 5.5 m · **Triangles:** 5k / 1.5k · **Stand-in:** `enemy.seedSpitter` · **Final:** `models/enemies/seedSpitter.glb`
- **Clips:** Idle, Root_Sway, Inflate_Tell, Spit ×3, Stagger, Dissolve
- **Sockets:** Core (stalk base), Mouth, Hitbox.Body

### M-005 · Window Ray (Crownline City)

Flat winged silhouette that hangs between towers, pauses, then dives in a straight line. Its back is a stomp platform: the first flyer the player learns to bounce off.

- **Rig:** skeletal — body, wing.L/R ×2, tail ×2, eye
- **Size:** 11 × 0.9 × 6.3 m · **Triangles:** 4k / 1.2k · **Stand-in:** `enemy.windowRay` · **Final:** `models/enemies/windowRay.glb`
- **Clips:** Hover, Bank_L/R, Dive_Tell (pause, wings fold), Dive (root motion), Recover, Hit, Dissolve
- **Sockets:** Core (back), Mouth (eye), Hitbox.Body, Landing (stomp target)

### M-006 · Spire Leech (Crownline City)

Segmented wall-clinger. Crawls on any tower face, charges a visible eye, then projects a horizontal beam across a gap. Killed from the flank or with a reflected shot.

- **Rig:** spline — 7 chain bones, head, jaw
- **Size:** 1.3 × 1.3 × 8.2 m · **Triangles:** 5k / 1.5k · **Stand-in:** `enemy.spireLeech` · **Final:** `models/enemies/spireLeech.glb`
- **Clips:** Cling_Idle, Crawl (surface-relative), Charge_Tell (eye glow), Beam_Hold, Retract, Hit, Dissolve
- **Sockets:** Core (mid segment), Emitter (mouth), Hitbox.Body

### M-007 · Crag Tortoise (Thunderhead Range)

Armoured dome with a pale belly shown only during its uphill lunge. Stomping the spikes bounces Hopper off harmlessly; the belly is the only target.

- **Rig:** skeletal — spine ×2, shell (rigid child), head, jaw, 4 legs × 3
- **Size:** 7.1 × 4.7 × 8.6 m · **Triangles:** 7k / 2k · **Stand-in:** `enemy.cragTortoise` · **Final:** `models/enemies/cragTortoise.glb`
- **Clips:** Idle, Walk, Lunge_Tell (rear up), Lunge (root motion), Belly_Open_Hold, Withdraw, Hit, Dissolve
- **Sockets:** Core (belly), Mouth, Hitbox.Shell (rejects stomps), Hitbox.Body

### M-008 · Rift Condor (Thunderhead Range)

Skeletal crescent-winged soarer that rides the same thermals Hopper does. Marks a dive corridor, swoops, climbs out. Sharing thermals makes it a mid-air duel.

- **Rig:** skeletal — body, wing.L/R ×3 (crescent), tail, head
- **Size:** 18 × 0.9 × 5.1 m · **Triangles:** 5k / 1.5k · **Stand-in:** `enemy.riftCondor` · **Final:** `models/enemies/riftCondor.glb`
- **Clips:** Soar, Mark_Corridor (feather trail), Swoop (root motion), Climb_Out, Hit, Dissolve
- **Sockets:** Core (sternum), Mouth, Hitbox.Body, Landing

### M-009 · Furnace Hound (Cinder Foundries)

Broad-shouldered hound with ember seams. Vents, then charges in a straight line along conveyors and decks. Jumped over and struck from behind, or stomped mid-skid.

- **Rig:** skeletal — as Shade Hound + 2 shoulder vents
- **Size:** 3.8 × 4.1 × 11.2 m · **Triangles:** 7k / 2k · **Stand-in:** `enemy.furnaceHound` · **Final:** `models/enemies/furnaceHound.glb`
- **Clips:** Idle, Vent_Tell, Charge (root motion, straight line), Skid, Bite, Hit, Dissolve
- **Sockets:** Core (ribs, hot), Mouth, Vent.L/R (emitters), Hitbox.Body

### M-010 · Slag Caster (Cinder Foundries)

Pot-bellied soot silhouette with ladle forelimbs. Lobs slag that cools into temporary stepping stones; its core opens briefly after each throw.

- **Rig:** skeletal — spine ×2, head, 2 arms × 3 with ladles, 2 legs × 2
- **Size:** 9.9 × 6.8 × 5.4 m · **Triangles:** 8k / 2.5k · **Stand-in:** `enemy.slagCaster` · **Final:** `models/enemies/slagCaster.glb`
- **Clips:** Idle, Waddle, Scoop_Tell, Lob (both arms), Core_Open_Hold, Close, Hit, Dissolve
- **Sockets:** Core (furnace belly), Emitter.L/R (ladles), Mouth, Hitbox.Body

### M-011 · Chain Manta (Tempest Docks)

Hook-winged flyer that drops a tether onto a container or crane load and drags it sideways. Shooting the tether node frees the platform; stomping its back is a big bounce.

- **Rig:** skeletal — body, wing.L/R ×3, hook.L/R, tail ×3, tether (spline, 6 bones)
- **Size:** 14.2 × 7.3 × 7.6 m · **Triangles:** 6k / 2k · **Stand-in:** `enemy.chainManta` · **Final:** `models/enemies/chainManta.glb`
- **Clips:** Soar, Tether_Tell, Tether_Pull (wings brace), Release, Bank, Hit, Dissolve
- **Sockets:** Core (back), TetherNode (weak point at the tether end), Hook.L/R, Hitbox.Body, Landing

### M-012 · Ballast Crab (Tempest Docks)

Wide anchor-clawed heavy. Rears up and slams a deck, sending a shockwave along the surface; the rear core is exposed while it settles. Fought by circling, or from above.

- **Rig:** skeletal — body, 2 claws × 3, 6 legs × 3
- **Size:** 9.5 × 4.1 × 5.6 m · **Triangles:** 8k / 2.5k · **Stand-in:** `enemy.ballastCrab` · **Final:** `models/enemies/ballastCrab.glb`
- **Clips:** Idle, Scuttle (sideways), Rear_Tell, Slam (root motion), Core_Exposed_Hold, Settle, Hit, Dissolve
- **Sockets:** Core (rear vent), Claw.L/R, Hitbox.Body, Hitbox.Claws (block)

### M-013 · Coil Wraith (Skyhook Works)

Tall ribbon of shadow strung between two electrical nodes. Fills a lane between scaffolds with a beam until a node is shot out. A gate, not a chaser.

- **Rig:** spline — 9 ribbon bones between two node anchors
- **Size:** 1.6 × 13.8 × 1.5 m · **Triangles:** 4k / 1k · **Stand-in:** `enemy.coilWraith` · **Final:** `models/enemies/coilWraith.glb`
- **Clips:** Ribbon_Idle, Charge_Tell (nodes brighten), Beam_Hold (lane beam), Break (a node destroyed), Dissolve
- **Sockets:** Node.Top.Core, Node.Bottom.Core, Hitbox.Body

### M-014 · Turbine Wasp (Skyhook Works)

Three blunt fan lobes and a pointed tail. Contracts its intake ring, then dashes. Kicking it stalls the fans and turns it into a platform for a follow-up stomp.

- **Rig:** rigid — body, 3 fan pivots (spin), intake ring, stinger, 2 legs
- **Size:** 7.7 × 3.4 × 6.1 m · **Triangles:** 6k / 2k · **Stand-in:** `enemy.turbineWasp` · **Final:** `models/enemies/turbineWasp.glb`
- **Clips:** Hover, Intake_Tell (ring contracts), Dash (root motion), Guard_Break (fans stall), Hit, Dissolve
- **Sockets:** Core (intake ring), Fan.L/R/Tail, Hitbox.Body, Landing (after guard break)

### M-015 · Basalt Burrower (Vermilion Basin)

Drilling snout and broken dorsal plates. Tunnels under the ground Hopper is about to land on, cracks trace its path, then it erupts. The back is soft as it emerges.

- **Rig:** skeletal — spine ×3, drill (spin pivot), 4 legs × 3
- **Size:** 7.7 × 4.1 × 11.4 m · **Triangles:** 7k / 2k · **Stand-in:** `enemy.basaltBurrower` · **Final:** `models/enemies/basaltBurrower.glb`
- **Clips:** Buried_Idle, Tunnel (surface crack trail), Erupt_Tell, Erupt (root motion up), Land, Withdraw, Hit, Dissolve
- **Sockets:** Core (unarmoured back), Drill, Hitbox.Body

### M-016 · Thorn Choir (Vermilion Basin)

Stationary fan of three pointed masks that sing a spreading projectile fan. Kicking one head staggers the whole choir; lasers between pulses.

- **Rig:** blend — base, 3 stems × 3, 3 heads; blend: Sing_Open per head
- **Size:** 6.6 × 7.2 × 6.9 m · **Triangles:** 6k / 2k · **Stand-in:** `enemy.thornChoir` · **Final:** `models/enemies/thornChoir.glb`
- **Clips:** Idle, Sing_Tell (heads open in sequence), Fan_Volley, Stagger (kicked), Dissolve
- **Sockets:** Core (base), Mouth0..2, Hitbox.Body

### M-017 · Veil Medusa (Cobalt Drift)

Umbrella of shadow with long soft tendrils, drifting in low gravity. Flashes, then pulses radially. Its bell is the springiest stomp in the game and the way up through the reef towers.

- **Rig:** blend — bell (blend: Pulse), 10 tendril chains × 4
- **Size:** 7 × 8.4 × 7 m · **Triangles:** 6k / 2k · **Stand-in:** `enemy.veilMedusa` · **Final:** `models/enemies/veilMedusa.glb`
- **Clips:** Drift, Flash_Tell, Radial_Pulse, Stomped_Rebound (bell compresses), Hit, Dissolve
- **Sockets:** Core (bell core), Hitbox.Bell (stomp target: high rebound), Hitbox.Tendrils

### M-018 · Phase Skate (Cobalt Drift)

Thin diamond ray with a broken tail. Fades, leaves a destination silhouette, becomes solid, dashes. Untouchable while faded; a free stomp for the 0.4 s after it solidifies.

- **Rig:** rigid — body, 2 wing pivots, 3 tail shards
- **Size:** 8.7 × 0.9 × 6.1 m · **Triangles:** 3k / 1k · **Stand-in:** `enemy.phaseSkate` · **Final:** `models/enemies/phaseSkate.glb`
- **Clips:** Glide, Fade_Out, Silhouette_Hold (destination ghost), Fade_In, Dash (root motion), Hit, Dissolve
- **Sockets:** Core (eye), Hitbox.Body (inactive while faded)

### M-019 · Mirror Stalker (Violet Inversion)

Forked ivory mask and long crescent limbs. Walks floors and ceilings and lunges at a mirrored angle. Its stance always shows which surface it stands on.

- **Rig:** skeletal — spine ×3, neck, mask head, 2 horns, 4 legs × 3 (digitigrade), crescent tail
- **Size:** 4.1 × 6.2 × 12.6 m · **Triangles:** 8k / 2.5k · **Stand-in:** `enemy.mirrorStalker` · **Final:** `models/enemies/mirrorStalker.glb`
- **Clips:** Stance_Floor, Stance_Ceiling, Stalk, Lunge_Tell (mask tilts), Lunge (root motion), Land, Hit, Dissolve
- **Sockets:** Core (exposed ribs), Mouth, Hitbox.Body, SurfaceNormal (which way is down for it)

### M-020 · Gravity Cantor (Violet Inversion)

Floating ring organ with four hanging prongs. Counts in, then flips local gravity in a marked volume beneath it. Shot in the core, or simply flown around.

- **Rig:** rigid — ring (spin), core, 4 prong pivots
- **Size:** 8.9 × 4.7 × 8.9 m · **Triangles:** 5k / 1.5k · **Stand-in:** `enemy.gravityCantor` · **Final:** `models/enemies/gravityCantor.glb`
- **Clips:** Ring_Idle, Count_In (prongs rise ×3), Gate_Activate, Gate_Hold, Core_Exposed, Dissolve
- **Sockets:** Core (ring centre), Emitter0..3 (prong tips), Hitbox.Ring

## Shadow commanders (3)

### M-021 · Night Rook (Thunderhead Range)

Skeletal raven of folded night, 3 H tall with a 6 H span. Fights around the transmitter mast: dives past the summit shelves, fans feathers from the mast top, lands to channel through its wing joints.

- **Rig:** skeletal — spine ×4, neck ×2, head, beak, 2 wings × 5 (blade feathers as rigid children), 2 arms × 3 with talons, 2 legs × 3
- **Size:** 65 × 41 × 16 m · **Triangles:** 40k / 12k · **Stand-in:** `boss.nightRook` · **Final:** `models/bosses/nightRook.glb`
- **Clips:** Perch_Idle, Take_Off, Soar, Mark_Corridor, Sweep (root motion), Land, Feather_Fan, Channel_Tell, Channel_Hold, Wing_Guard_Break, Core_Open, Stagger, Defeat_Dissolve
- **Sockets:** Core (sternum), WingJoint.L/R (kick targets), Mouth, Hitbox.Body, Landing (back, after wings fold)
- **Textures:** 4K hand-painted albedo, 2K emissive mask

### M-022 · Smelter Leviathan (Skyhook Works)

Segmented shadow centipede in stolen foundry rings, 8–10 H long, coiled around the gantry elevator tower. The fight climbs the tower while its cores open in sequence.

- **Rig:** spline — 16-segment spline chain, head with maw, 2 tail blades; each segment has a rigid ring and 2 leg pivots
- **Size:** 17 × 12 × 149 m · **Triangles:** 60k / 18k · **Stand-in:** `boss.smelterLeviathan` · **Final:** `models/bosses/smelterLeviathan.glb`
- **Clips:** Coil_Idle, Climb_Gantry, Tail_Sweep, Breath_Tell, Breath_Hold, Core_Crack (segment), Uncoil, Defeat_Dissolve
- **Sockets:** Core0..4 (every third segment), Mouth (furnace maw), Hitbox.Segment0..15, Landing.Segment (cracked segments)
- **Textures:** 4K hand-painted albedo, 2K emissive mask

### M-023 · Eclipse Regent (Violet Inversion)

Crowned ring of black space over a four-armed body, 5 H tall. Three phases over the eclipse dais: heavy gravity crawling rings, low gravity lances, then alternating floor and ceiling gravity.

- **Rig:** skeletal — spine ×5, neck, head, crown (rigid), 4 arms × 3 with claws, 2 legs × 3, mantle (cloth sim or 6 chain bones), black sun halo (rigid spin)
- **Size:** 45 × 69 × 21 m · **Triangles:** 45k / 14k · **Stand-in:** `boss.eclipseRegent` · **Final:** `models/bosses/eclipseRegent.glb`
- **Clips:** Idle_Hover, Descend, Ring_Crawl_Summon, Hands_Lower_Tell, Hands_Slam, Heart_Open_Hold, Lance_Call, Inversion_Count_In (1.5 s), Phase_Shift ×2, Stagger, Defeat_Dissolve
- **Sockets:** Core (heart), Hand0..3 (kick targets when lowered), Mouth, Hitbox.Body, Halo
- **Textures:** 4K hand-painted albedo, 2K emissive mask

## Structure kits (44)

Each region has a kit that maps onto one trim sheet (T-028..T-036). `Landings` are the flat tops the route tools may use; the stand-in publishes them as `userData.landings` and the final model must keep the same surfaces within 0.5 m. Rigid pieces list the pivot that moves.

### Sunseed Fields

| Id | Piece | Rig | Size | Tris | Landings | Stand-in |
| --- | --- | --- | --- | ---: | --- | --- |
| M-024 | Terrace step | static | 62 × 19 × 41 m | 3k | one per tier | `structure.fields.terraceStep` |
| M-025 | Farmhouse | static | 35 × 12 × 35 m | 2k | ridge | `structure.fields.farmhouse` |
| M-026 | Grain silo | static | 11 × 32 × 11 m | 1.5k | cap | `structure.fields.silo` |
| M-027 | Windbreak row | static | 52 × 24 × 6 m | 3k | none | `structure.fields.windbreak` |
| M-028 | Fallen seed vessel | rigid | 25 × 34 × 29 m | 4k | none | `structure.fields.seedPod` |

- **M-024 Terrace step.** Three-tier planted terrace with irrigation lips. The first thing Hopper climbs; the tiers are one hop apart.
- **M-025 Farmhouse.** Ivory farmhouse with a red tile roof and chimney. Barely reaches Hopper's knees; a scale prop first, a ridge landing second.
- **M-026 Grain silo.** Concrete drum with a conical cap. The first tall thing in the fields; the cap is a one-Hopper landing.
- **M-027 Windbreak row.** Row of six poplars. Lines the routes and shows wind direction; not landable (canopy is soft collision that slows a fall).
- **M-028 Fallen seed vessel.** Crashed shadow vessel, half-buried, spines glowing violet. Spawns hounds when Hopper passes; the pod cracks open (rigid lid pivot).

### Crownline City

| Id | Piece | Rig | Size | Tris | Landings | Stand-in |
| --- | --- | --- | --- | ---: | --- | --- |
| M-029 | Ivory tower | static | 31 × 133 × 31 m | 6k | roof + ledge per band | `structure.city.ivoryTower` |
| M-030 | Roof deck block | static | 44 × 44 × 28 m | 3k | roof | `structure.city.roofDeck` |
| M-031 | Elevated rail span | static | 166 × 32 × 10 m | 4k | deck | `structure.city.railSpan` |
| M-032 | Train car | rigid | 23 × 5 × 5 m | 2k | roof | `structure.city.trainCar` |
| M-033 | Construction crown | rigid | 62 × 132 × 35 m | 8k | one per floor + jib | `structure.city.constructionCrown` |
| M-034 | Rooftop billboard | rigid | 25 × 43 × 2 m | 1.5k | board top | `structure.city.billboard` |
| M-035 | Highline observatory | static | 55 × 53 × 55 m | 5k | crown, ring | `structure.city.observatoryDome` |

- **M-029 Ivory tower.** Stepped ivory tower with teal glass bands, 90–150 m. The roof is the prize; each band ledge is a wall-kick rest.
- **M-030 Roof deck block.** Low mid-rise with a parapet and vents. The rooftop-run floor of Crownline City; decks sit a tap-jump apart.
- **M-031 Elevated rail span.** Elevated line on ivory piers. The train runs along it (M-036 moves on TrackStart→TrackEnd). Landing on the deck is safe; the train pushes, never hurts.
- **M-032 Train car.** Cream and red carriage, teal windows. A moving platform whose roof carries Hopper along the span.
- **M-033 Construction crown.** Open-frame tower under construction, six slabs and a tower crane. The jib is a rigid pivot that slews slowly; the classic ladder climb.
- **M-034 Rooftop billboard.** Painted billboard on a post. Its top is a thin landing; it tilts (rigid pivot) when landed on, dropping Hopper onto the deck below. Never hurts.
- **M-035 Highline observatory.** Ivory drum and teal glass dome at the top of the city. The region's exit landmark; the crown is the checkpoint.

### Thunderhead Range

| Id | Piece | Rig | Size | Tris | Landings | Stand-in |
| --- | --- | --- | --- | ---: | --- | --- |
| M-036 | Crag column | static | 57 × 94 × 57 m | 4k | top | `structure.mountains.cragColumn` |
| M-037 | Ledge shelf | static | 52 × 9 × 19 m | 1.5k | shelf | `structure.mountains.ledgeShelf` |
| M-038 | Ravine bridge | static | 124 × 42 × 10 m | 3k | deck | `structure.mountains.ravineBridge` |
| M-039 | Summit transmitter | rigid | 50 × 217 × 50 m | 8k | plinth | `structure.mountains.transmitterMast` |
| M-040 | Windsock | rigid | 7 × 14 × 3 m | 0.5k | none | `structure.mountains.windsock` |

- **M-036 Crag column.** Tilted stack of slate blocks with a turf cap. The gorge's stepping stones, 60–130 m tall.
- **M-037 Ledge shelf.** Turf-topped rock shelf that bolts onto a cliff face. The unit every climbing route is built from.
- **M-038 Ravine bridge.** Timber deck on slate pylons across a gorge. Wide enough to fight on, narrow enough to be knocked off.
- **M-039 Summit transmitter.** The mast on the summit: plinth, three mast sections, red rings, beacon. Region and mission landmark; the Night Rook's perch. Rings rotate (rigid).
- **M-040 Windsock.** Orange sock on a pole, aligned to the nearest wind lane. Rigid pivot; a wind signal, not a platform.

### Cinder Foundries

| Id | Piece | Rig | Size | Tris | Landings | Stand-in |
| --- | --- | --- | --- | ---: | --- | --- |
| M-041 | Furnace tower | static | 39 × 112 × 39 m | 6k | roof, catwalk | `structure.foundry.furnaceTower` |
| M-042 | Conveyor span | static | 93 × 23 × 8 m | 3k | belt | `structure.foundry.conveyorSpan` |
| M-043 | Chimney | static | 12 × 114 × 12 m | 1.5k | lip | `structure.foundry.chimney` |
| M-044 | Slag barge | rigid | 41 × 6 × 17 m | 2k | gunwales | `structure.foundry.slagBarge` |
| M-045 | Stamping press | rigid | 31 × 44 × 21 m | 4k | anvil, head | `structure.foundry.stampingPress` |

- **M-041 Furnace tower.** Iron drum with rust bands, a stack and a glowing furnace door. The door is a thermal source: heat lifts Hopper.
- **M-042 Conveyor span.** Rollered belt on legs, UV-scrolled. Adds its velocity to Hopper; belts running against the route are the foundry's treadmill fights.
- **M-043 Chimney.** Tall rust stack. A one-Hopper lip 110 m up and a thermal above it.
- **M-044 Slag barge.** Iron barge of glowing slag on the casting channel. Moves along a path; the slag surface is a hot updraft, the gunwales are the walkway.
- **M-045 Stamping press.** Two columns, a ram and an anvil. The ram (rigid) cycles with a long warning stroke; it flings Hopper aside, it never crushes.

### Tempest Docks

| Id | Piece | Rig | Size | Tris | Landings | Stand-in |
| --- | --- | --- | --- | ---: | --- | --- |
| M-046 | Crane boom | rigid | 85 × 96 × 10 m | 5k | boom, hooked container | `structure.harbor.craneBoom` |
| M-047 | Container stack | static | 48 × 18 × 10 m | 3k | one per row | `structure.harbor.containerStack` |
| M-048 | Freighter | static | 228 × 65 × 41 m | 10k | deck, cargo tops, bridge roof | `structure.harbor.freighter` |
| M-049 | Gantry tower | static | 62 × 135 × 25 m | 6k | four decks + bridge | `structure.harbor.gantryTower` |
| M-050 | Breakwater | static | 207 × 14 × 25 m | 2k | top | `structure.harbor.breakwater` |

- **M-046 Crane boom.** Dock crane on a green-steel mast. The boom slews (rigid pivot) and carries a container on a cable; both are landings that move.
- **M-047 Container stack.** Stepped stack of coloured containers. The dock's stairs; the top row is a tap-jump above the quay.
- **M-048 Freighter.** Green-steel freighter on the storm channel: deck, four cargo blocks, bridge and funnel. The chapter's long crossing lands on it.
- **M-049 Gantry tower.** Four-legged steel tower with decks every 32 m and a bridge on top. The upper gantry the crane forest climbs to.
- **M-050 Breakwater.** Concrete breakwater with bollards. The region floor at the water's edge; the sea beside it is a soft landing that pushes Hopper back ashore.

### Skyhook Works

| Id | Piece | Rig | Size | Tris | Landings | Stand-in |
| --- | --- | --- | --- | ---: | --- | --- |
| M-051 | Launch ring | static | 137 × 211 × 137 m | 8k | eight ring pads | `structure.launchworks.launchRing` |
| M-052 | Rocket on the pad | static | 31 × 163 × 20 m | 5k | four umbilical arms | `structure.launchworks.rocket` |
| M-053 | Piston stair | rigid | 58 × 76 × 10 m | 3k | one per piston head | `structure.launchworks.pistonStair` |
| M-054 | Exhaust shaft | static | 75 × 124 × 75 m | 5k | four baffles | `structure.launchworks.exhaustShaft` |
| M-055 | Gantry elevator | rigid | 20 × 155 × 17 m | 3k | cage | `structure.launchworks.gantryElevator` |

- **M-051 Launch ring.** Rust ring on four struts, 200 m up, eight lit pads. The launch spine's crown and the Leviathan arena's upper tier.
- **M-052 Rocket on the pad.** Ivory rocket with red fins beside an umbilical mast. Its arms are the climb; the nose is a vista point.
- **M-053 Piston stair.** Five pistons whose heads rise and fall out of phase (rigid). A stair that changes shape; dwell times are generous.
- **M-054 Exhaust shaft.** Open iron shaft 120 m deep with staggered baffles. The descent chapter; the vent at the bottom is a thermal back to the top.
- **M-055 Gantry elevator.** Two rails and a cage (rigid) that rides 140 m. The Leviathan coils around this tower.

### Vermilion Basin

| Id | Piece | Rig | Size | Tris | Landings | Stand-in |
| --- | --- | --- | --- | ---: | --- | --- |
| M-056 | Ivory rib arch | static | 93 × 89 × 5 m | 4k | crown | `structure.red.ivoryRibArch` |
| M-057 | Coral spire | static | 23 × 71 × 25 m | 3k | tier | `structure.red.coralSpire` |
| M-058 | Ivory-topped terrace | static | 72 × 13 × 41 m | 1.5k | ivory top | `structure.red.basinTerrace` |
| M-059 | Staged coral bridge | rigid | 140 × 31 × 12 m | 3k | three stages | `structure.red.coralBridge` |

- **M-056 Ivory rib arch.** Bone ribs in a half ring, 45 m high. The basin's bridges and the choir's perches.
- **M-057 Coral spire.** Stacked red coral cones with glowing fronds. Vertical cover in heavy gravity.
- **M-058 Ivory-topped terrace.** Coral block with an ivory top. Wide landing shelves that make the short heavy-gravity arcs readable.
- **M-059 Staged coral bridge.** Three-stage bridge on bone piers that breaks in sequence (rigid stages drop) after Hopper crosses each. Falling lands on the basin floor.

### Cobalt Drift

| Id | Piece | Rig | Size | Tris | Landings | Stand-in |
| --- | --- | --- | --- | ---: | --- | --- |
| M-060 | Floating reef | rigid | 61 × 44 × 60 m | 4k | top | `structure.blue.floatingReef` |
| M-061 | Root pillar | static | 50 × 166 × 50 m | 4k | four shelves | `structure.blue.rootPillar` |
| M-062 | Dust current | static | 120 × 23 × 24 m | 0.5k | none | `structure.blue.dustCurrent` |

- **M-060 Floating reef.** Reef island with glowing roots and crystals. Drifts slowly on a path (rigid root); the archipelago the whole region is made of.
- **M-061 Root pillar.** Three twisted reef strands rising 160 m with shelves. The way up when a reef drifts out of reach.
- **M-062 Dust current.** Luminous dust flow volume (translucent). Marks a moving-island path and lifts a gliding Hopper.

### Violet Inversion

| Id | Piece | Rig | Size | Tris | Landings | Stand-in |
| --- | --- | --- | --- | ---: | --- | --- |
| M-063 | Obsidian arch | static | 93 × 72 × 17 m | 3k | lintel top | `structure.violet.obsidianArch` |
| M-064 | Ring shard | rigid | 124 × 13 × 21 m | 2k | face | `structure.violet.ringShard` |
| M-065 | Gravity cathedral facade | static | 166 × 193 × 124 m | 12k | roof, steps | `structure.violet.cathedralFacade` |
| M-066 | Gravity seam | static | 100 × 4 × 2 m | 0.5k | none | `structure.violet.gravitySeam` |
| M-067 | Eclipse dais | static | 100 × 23 × 99 m | 5k | dais + six shelves | `structure.violet.eclipseDais` |

- **M-063 Obsidian arch.** Obsidian piers and lintel with a glowing ceiling seam underneath: an inverted lane runs along the seam.
- **M-064 Ring shard.** Fragment of a broken planetary ring, orbiting slowly (rigid). Landings that rotate through the sky.
- **M-065 Gravity cathedral facade.** Obsidian facade with the black sun above the door, twin spires and steps. The final landmark; the Regent's arena sits before it.
- **M-066 Gravity seam.** Glowing seam with animated arrows marking where local gravity changes. Purely a signal; attached to arches and gates.
- **M-067 Eclipse dais.** Obsidian dais with a glowing circle and six mirrored shelves at two heights. The Regent arena.

## Props and effects (15)

| Id | Prop | Rig | Size | Tris | Stand-in | Final |
| --- | --- | --- | --- | ---: | --- | --- |
| M-068 | Spring pad | rigid | 11 × 3 × 11 m | 1k | `prop.springPad` | `models/props/springPad.glb` |
| M-069 | Signal | rigid | 3 × 5 × 3 m | 0.5k | `prop.signalBeacon` | `models/props/signalBeacon.glb` |
| M-070 | Signal cage | rigid | 14 × 10 × 14 m | 1.5k | `prop.signalCage` | `models/props/signalCage.glb` |
| M-071 | Lockdown emitter | rigid | 10 × 18 × 10 m | 1k | `prop.lockdownEmitter` | `models/props/lockdownEmitter.glb` |
| M-072 | Lockdown dome | static | 520 × 260 × 520 m | 1k | `prop.lockdownDome` | `models/props/lockdownDome.glb` |
| M-073 | Checkpoint totem | rigid | 3 × 15 × 3 m | 0.8k | `prop.checkpointTotem` | `models/props/checkpointTotem.glb` |
| M-074 | Recovery capsule | rigid | 2 × 4 × 2 m | 0.5k | `prop.recoveryCapsule` | `models/props/recoveryCapsule.glb` |
| M-075 | Thermal vent | static | 20 × 162 × 20 m | 1k | `prop.thermalVent` | `models/props/thermalVent.glb` |
| M-076 | Wind lane | static | 202 × 40 × 40 m | 0.5k | `prop.windLane` | `models/props/windLane.glb` |
| M-077 | Gravity gate | rigid | 62 × 40 × 5 m | 1.5k | `prop.gravityGate` | `models/props/gravityGate.glb` |
| M-078 | Launch gate | rigid | 203 × 203 × 16 m | 4k | `prop.launchGate` | `models/props/launchGate.glb` |
| M-079 | Eye laser bolt | static | 0.6 × 0.6 × 6 m | 0.1k | `prop.laserBolt` | `models/props/laserBolt.glb` |
| M-080 | Kick arc | static | 20 × 1 × 20 m | 0.2k | `prop.kickArc` | `models/props/kickArc.glb` |
| M-081 | Guard shield | static | 18 × 18 × 9 m | 0.5k | `prop.shieldDome` | `models/props/shieldDome.glb` |
| M-082 | Shadow dissolve | rigid | 12 × 12 × 12 m | 0.5k | `prop.dissolveBurst` | `models/props/dissolveBurst.glb` |

- **M-068 Spring pad.** Cyan plate on an iron base with four chevrons. Plate compresses (rigid) and launches Hopper to 12 H. Regional recolours as in the 2D game.
- **M-069 Signal.** Twin gold crystals and a halo, spinning. The optional collectible; nine per region.
- **M-070 Signal cage.** Ten shadow bars on a pedestal with a violet crown. Only a reflected shot opens it (crown breaks, bars drop: rigid).
- **M-071 Lockdown emitter.** Obsidian pylon with a violet emitter. Pairs raise the lockdown dome around a knot or boss arena.
- **M-072 Lockdown dome.** Translucent violet field (shader). Blocks Hopper, never hurts; drops when the arena is cleared.
- **M-073 Checkpoint totem.** Ivory post with red bands and a lamp. Lights when reached (emissive swap); Hopper respawns beside it.
- **M-074 Recovery capsule.** Cream capsule with a red band and white cross, spinning. Restores two armour pips.
- **M-075 Thermal vent.** Grate with a translucent rising column. An updraft volume that carries a gliding Hopper up to 160 m.
- **M-076 Wind lane.** Translucent crosswind volume with streaks. Pushes airborne Hopper sideways; never carries a committed jump past its landing.
- **M-077 Gravity gate.** Obsidian sill and lintel with a violet curtain and five arrows (animated). Flips local gravity for whatever passes through.
- **M-078 Launch gate.** Rust ring on struts with a glowing portal. The mission-two exit; the star tunnel transition begins at Entry.
- **M-079 Eye laser bolt.** Red-white capsule with a bright core. Spawned in pairs from Hopper.Laser.L/R.
- **M-080 Kick arc.** Translucent gold arc that sweeps with the spin kick. Reads the kick radius (7 m) on screen.
- **M-081 Guard shield.** Translucent teal half-dome at Hopper.Shield with a white rim. Shown while B is held.
- **M-082 Shadow dissolve.** Fourteen charcoal and violet shards around a pale flash. Every shadow dies into this (scale-up over 0.5 s).

## Landmarks and terrain

Landmarks are the far things: each region shows its exit from its entrance, so each needs a silhouette LOD that reads from 3 km and hands over to the kit model on approach.

| Id | Landmark | Region | Stand-in | Final |
| --- | --- | --- | --- | --- |
| M-083 | Crownline skyline | Sunseed Fields | `terrain.landmark` | `models/landmarks/fields.glb` |
| M-084 | Thunderhead summit | Crownline City | `terrain.landmark` | `models/landmarks/city.glb` |
| M-085 | Transmitter mast | Thunderhead Range | `terrain.landmark` | `models/landmarks/mountains.glb` |
| M-086 | Crane forest | Cinder Foundries | `terrain.landmark` | `models/landmarks/foundry.glb` |
| M-087 | Launch spine | Tempest Docks | `terrain.landmark` | `models/landmarks/harbor.glb` |
| M-088 | Star gate | Skyhook Works | `terrain.landmark` | `models/landmarks/launchworks.glb` |
| M-089 | Black sun | Vermilion Basin | `terrain.landmark` | `models/landmarks/red.glb` |
| M-090 | Drift moon | Cobalt Drift | `terrain.landmark` | `models/landmarks/blue.glb` |
| M-091 | Eclipse cathedral | Violet Inversion | `terrain.landmark` | `models/landmarks/violet.glb` |

- **M-083 Crownline skyline.** The city's ivory towers seen from the fields, 3 km off. Grows from a haze silhouette to real towers over the region.
- **M-084 Thunderhead summit.** The mountain and its mast above the city. The observatory at the top of the city looks straight at it.
- **M-085 Transmitter mast.** The mast itself, seen from the gorge floor as a beacon, reached at the summit.
- **M-086 Crane forest.** The dock cranes beyond the foundry smoke.
- **M-087 Launch spine.** The launchworks' vertical spine and ring above the storm channel.
- **M-088 Star gate.** The captured launch gate, lit, at the top of the spine.
- **M-089 Black sun.** The eclipse hanging over the basin; the route climbs toward it.
- **M-090 Drift moon.** The huge moon the reefs drift toward.
- **M-091 Eclipse cathedral.** The gravity cathedral with its corona, the campaign's last landmark.

### M-092 · Region terrain sculpts (×9)

One sculpted heightfield per region with the route's plateaus, valleys and floor levels authored in, plus separate cliff meshes where slopes exceed 60°. The game keeps sampling the heightmap for collision, so the sculpt and the heightmap are delivered together. Vertex-painted four-tone colour bands.

- **Rig:** static · **Size:** 2400 × 300 × 2400 m per region · **Triangles:** 60k per region (heightfield + cliff meshes) · **Stand-in:** `terrain.heightfield` · **Final:** `models/terrain/<region>.glb + heightmap PNG`

## Generation order

1. Round one images (`image-requests.md`): skies, horizon cards, terrain sets and trim sheets for the region being built, UI and effects at any time.
2. Round two reference sheets (`image-requests-round-2.md`): the Hopper pose sheet, the four mission-one species turnarounds, the Sunseed and Crownline kit sheets, the props sheet; then the rest by mission.
3. Models, each only after its reference sheet is approved: Hopper clips, mission-one species, mission-one kits, props, the Night Rook; then missions two and three.

## Delivery checks

- Load through the same glTF loader and meshopt decoder as the Hopper GLBs; `hopper/3d/standins/test` has the socket and size checks each model must pass when its manifest entry flips from `stand-in` to `delivered`.
- Sockets and clip names exactly as listed; the game code binds by name.
- Check silhouettes at gameplay distance (35 m camera) against the darkest and brightest region sky.
- Keep the painted style: flat tones, ink edges, no specular, no normal-map micro detail.

