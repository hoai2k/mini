# Architecture production progress

- [x] Read `BUILD-CONTRACT.md`, `model-requests.md`, and authoritative structure stand-ins.
- [x] Inspected approved City, Foundry, Harbor, and Launchworks kit PNGs before design.
- [x] Implement City M-029–M-035.
- [x] Implement Foundry M-041–M-045.
- [x] Implement Harbor M-046–M-050.
- [x] Implement Launchworks M-051–M-055.
- [x] Verify exact landing surfaces and authoritative sockets against `local/hopper-model-production/standin-contracts.json` (0 mismatches across 22 assets).
- [x] Run Python AST syntax check and a fake-context construction pass for all dispatch keys.
- [ ] Root Blender/export/render validation pending the central runner.

Design direction: use region trim-backed `base`, `metal`, `dark`, and `glow` materials for primary surfaces; reserve flat accent materials for signals and paint. Preserve the kit sheets' strong silhouettes: stepped Art Deco masonry, exposed foundry framing, trussed dock machinery, and rust launch gantries.

## Per-model delivery report

| Request | Stand-in | Authored rigid clip(s) | Authoritative non-landing sockets | Deliberate visual/detail notes |
| --- | --- | --- | --- | --- |
| M-029 | `structure.city.ivoryTower` | — | — | Five stepped bands, continuous inset teal bays, corner ribs/caps, asymmetric lower turrets, and an octagonal glass crown; gameplay keeps only the stand-in's roof and `ledge0` surfaces even though all bands read visually. |
| M-030 | `structure.city.roofDeck` | — | — | Art Deco corner pilasters, teal window bands, cornices, three roof vents. |
| M-031 | `structure.city.railSpan` | — | `TrackStart`, `TrackEnd` | Four capitaled piers, under-deck arch braces, twin rails and end signals. |
| M-032 | `structure.city.trainCar` | `Ride_Loop` | — | Chamfered cream shell, red stripe, paired window rows, wheel details; route translation remains game-driven. |
| M-033 | `structure.city.constructionCrown` | `Jib_Slew` | `Crane` | Six open slabs with crossed bracing and a parent-local trussed crane. |
| M-034 | `structure.city.billboard` | `Landing_Tip` | — | Bottom-hinged board pivot with painted panel, top lip, and support braces. |
| M-035 | `structure.city.observatoryDome` | — | — | Sixteen-sided drum, broad ring, glass sphere with ten ivory ribs and crown. |
| M-041 | `structure.foundry.furnaceTower` | — | — | Two-stage drum, rust bands, downpipes, furnace glow, guarded catwalk, offset stack. |
| M-042 | `structure.foundry.conveyorSpan` | — | `BeltStart`, `BeltEnd` | Trim-backed belt, ten roller pairs, four cross-braced supports and guard rails; belt velocity/UV scroll remains runtime-driven. |
| M-043 | `structure.foundry.chimney` | — | — | Tapered stack with five rings and a guarded upper lip; landing stays at the exact 110 m stand-in height. |
| M-044 | `structure.foundry.slagBarge` | `Barge_Rock` | — | Chamfered hull, emissive slag bed, tyre fenders and twin gunwales; route translation remains game-driven. |
| M-045 | `structure.foundry.stampingPress` | `Press_Cycle` | `Strike` (ram-local) | Long dwell, fast warning stroke, return; side flywheels and crossed column braces. |
| M-046 | `structure.harbor.craneBoom` | `Boom_Slew`, `Container_Hoist` | `BoomPivot`, `Landing.Hook` (load-local) | Fully trussed boom, raised cable apex, counterweight and ribbed suspended container. |
| M-047 | `structure.harbor.containerStack` | — | — | Three alternating rows, region-painted containers, doors and corner ribs. |
| M-048 | `structure.harbor.freighter` | — | — | Chamfered 228 m hull, deck rails, four cargo blocks, bridge glass, funnel and 65 m foremast. |
| M-049 | `structure.harbor.gantryTower` | — | — | Four cross-braced legs, four guarded decks, broad top bridge and beacon lamps. |
| M-050 | `structure.harbor.breakwater` | — | — | Battered concrete mesh, trim-backed landing cap and six shaped bollards. |
| M-051 | `structure.launchworks.launchRing` | — | — | Double ring, four braced struts, eight ivory pads and orange beacon posts. |
| M-052 | `structure.launchworks.rocket` | — | — | Ivory/red staged rocket with four compact fins, climbable umbilical arms, mast and nose beacon. |
| M-053 | `structure.launchworks.pistonStair` | `Piston_Cycle` (five phased tracks) | — | Five independently parented heads share one synchronized clip with phase offsets. |
| M-054 | `structure.launchworks.exhaustShaft` | — | `Updraft` | True open 16-panel shaft, structural ribs, four wall rings, braced baffles and bottom vent. |
| M-055 | `structure.launchworks.gantryElevator` | `Lift_Cycle` | `LiftBottom`, `LiftTop` | Cage is a rigid child between cross-braced rails; clip includes generous top and bottom dwell. |

All `Landing.N` sockets are emitted in stand-in order at the exact published positions. The visual geometry follows the rounded request bounds; small non-playable trim, lamps, and guards account for the request-versus-landing differences.
