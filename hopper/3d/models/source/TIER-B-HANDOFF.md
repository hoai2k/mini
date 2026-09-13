# Tier B environment handoff — 2026-09-13

Rechecked against merge `522185a` (mission expansion `a0ed51b`) on 2026-09-13.
Review only. No Tier B model has been completed or approved by this review. The
27/28 Tier A deliveries in `../CODE-BUILT-CLEANUP.md` are mechanical cleanup;
M-056 remains held. Scope here is those 28 files: four Earth kits, twelve alien
kits, nine landmarks, and three M-092 terrain files. The six other requested
regional terrains are additional undelivered scope, not hidden within these three.
Their mission-two/three district layouts now exist in `game/src/game3d/district2.ts`
and `district3.ts`; they no longer require inventing route/plateau specifications.

## Recommended batches

| Order | Requests | Concrete art work and acceptance focus | Disposition |
|---|---|---|---|
| 1 | M-024, M-027 | Terrace LOD1 retaining all three usable tiers; six narrow poplar crowns with layered, uneven foliage and concealed seams. Preserve the windbreak row envelope. Current triangles 1536/216 and 1416/348; budgets 3k each. | Locally feasible, smallest restart batch. Inspect `kits/fields-preview.jpg`; preserve numeric terrace tops at 6.6, 12.6, 18.6 m and their full rectangles. |
| 2 | M-036, M-037 | Carved slate courses, turf caps and coherent scree; replace random faceting with long vertical strata. LOD1 preserves the crag lean and ledge silhouette. Current 1364/304 and 1052/312; budgets 4k and 1.5k. | Locally feasible. `kits/mountains-preview.jpg`; protect crag top y=91, half extents 7.7×7.7 and shelf y=0.5, half extents 25×9. Avoid expanding visible traversable surfaces beyond existing collision. |
| 3 | M-057, M-058, M-061 | Coral spire with readable ivory shelf; terrace with recessed coral/bone cavities under its uninterrupted top; three twisted blue strands supporting four shelves. Current 148/32, 24/12, 212/48 versus budgets 3k, 1.5k, 4k show why cleanup alone is insufficient. | Locally feasible reference modeling. Start with terrace, then spire, then pillar. Keep every landing rectangle, especially pillar y=40.6/72.6/104.6/136.6. Do not copy the drawings' extra terraces as new gameplay landings. |
| 4 | M-063, M-065, M-067 | Layered obsidian piers and underside seam; cathedral buttresses/door/black sun/twin spires; dais plus six alternating-height shelves. Author deliberate LOD1: cathedral currently collapses 784 triangles to 12. | Locally feasible inside fixed contracts. Preserve CeilingLane, ArenaCenter, roof/steps, and all seven dais landings; make luminous regions shared surface faces or texture details, not floating geometry. Cathedral first needs an underside/roof contact check against its stand-in boxes. |
| 5 | M-059, M-060, M-064 | Three bone-supported bridge stages; reef island with hanging roots/crystals; curved broken ringstone slab. Separate rigid-owner geometry before authoring LODs. | Locally feasible art, higher validation cost. Keep exact stage/root pivots and ownership. Bridge Landing.0–2 are authored LOD-root siblings. The merged runtime now groups and drops stage colliders (`world.ts:357–393,476–489`); verify visual stages follow that existing behavior rather than inventing new landing parents. Preserve the reef's full square landing extent despite the round drawing. |
| 6 | M-062, M-066 | Dust flow ribbons and coherent arrow/seam signal using the existing translucent/emissive surfaces. | Static asset refinement is local. Gravity seam flip volumes now exist (`world.ts:454–459`); preserve and test them. Animated flow/particles/arrow timing are runtime responsibilities, not implicit mesh delivery. Keep FlowStart/FlowEnd, alpha/BLEND/double-sided semantics, arrow pivots and LOD omissions. Do not turn painted motion into solid debris. |
| 7 | M-083–085, then M-086–091 | Simplify skyline tower groups and summit strata; mast beacon first. Then crane booms, launch spine/ring, star gate, black sun, drift moon and cathedral silhouette. Use broad painted color bands; retain existing placement and measured envelopes rather than forcing nominal 400×600×400 dimensions. | Locally feasible, but first confirm which shots use fallback landmark GLBs. `game/src/game3d/scene.ts:300–308` uses the actual next district when available; only the fallback loads the landmark. Choose regional haze silhouettes with limited bands by default; a wholesale near/far replacement scheme is a rendering/design decision. Match M-091 to the approved M-065 when that kit exists. |
| Separate gate | M-056 | Reconcile visual arch, crown landing and runtime collision before art. | Not safely fixable under both unchanged contracts; see below. |
| Separate gate | M-092 | Reallocate triangles to cliff/plateau breaks, retain flat structure pads, deliver mesh plus matching 16-bit heightmap. | Local candidate sculpting is feasible; production collision integration and region extent need an explicit engineering/design decision. See below. |

All five kit previews (fields, mountains, red, blue, violet) and the three level
paintings were inspected for this review. Kit paths are under
`hopper/3d/design/references/kits/`; the level paintings actually live at
`hopper/design/assets/level-{1-earth,2-industry,3-alien}.png`. Existing landmark
metadata's `design/assets/...` path is relative to the Hopper project, not the
`hopper/3d/design/` directory. Read full kit PNGs when starting an individual asset.

## M-056: a deck alone is not a safe gameplay fix

The authoritative entry and preserved Tier A contract specify `Landing.0` at
**(0, 26.5, 0), halfX=8, halfZ=2**: a 16×4 m landing. Production bounds are
92.264×87.25×4.4; target 93×89×5; budget 4k. The text says a 45 m half-ring,
while the drawing puts a flat crown at the top. Those are not interchangeable.

Source evidence (re-read after the mission expansion; the arch helper and collision rule are unchanged):

- `hopper/3d/standins/src/structures.js:337` defaults span=80, height=45; line
  **345** passes `Math.PI` as a fifth argument to `G.torus(...)` for Spine.
- `hopper/3d/standins/src/kit.js:51` accepts only `(r, tube, seg, tub)` and calls
  `new TorusGeometry(r, tube, seg, tub)`. The requested half-ring angle is ignored:
  the source creates a full ring. This explains the large vertical envelope.
- `structures.js:346` separately computes the landing as height×0.5+4 = 26.5.
- `hopper/game/src/game3d/world.ts:124–167` builds solid collision boxes from
  stand-in mesh bounding boxes. Line **150** excludes `RibN`, but not `Spine`.
  The default Spine has radius 40, tube 2.2 and center y=2: its box covers about
  x=[-42.2,42.2], y=[-40.2,44.2], z=[-2.2,2.2]. The entire landing lies inside it.
- `hopper/game/src/game3d/models3d.ts:1–6` explicitly retains the original
  stand-in colliders when swapping the visible GLB. Adding a deck only to the
  delivered model does not add a runtime surface at y=26.5.
- `tier_a_cleanup.py:282–304` casts downward from each socket +0.05 m and requires
  a face within 0.5 m. The unchanged M-056 failed this check; evidence remains in
  `local/hopper-tier-a/jobs/M-056-ivoryRibArch/{contract.json,blender.log}`.

M-056 is now placed in Vermilion Basin: `game/src/game3d/district3.ts:21,30,33,37,61,77`
uses spans 90–100 and heights 45–52. Their locally computed landing heights range
from 26.5 to 30 m, while Spine box tops range from 49.2 to 54.2 m. The same
obstruction therefore affects these actual placements, not just the default
asset. `models3d.ts:73–97` clones the fixed GLB under each stand-in without a
parameter-driven geometry adapter; review these size variants during any repair.

**Conclusion:** a 16×4 cap at y=26.5 can satisfy the asset's raycast without moving
its socket, but cannot make that landing usable inside the unchanged Spine
collider. It also reads as an intermediate perch, not the reference's top crown.
Do not relax the raycast, move the socket to ~44.2, or silently add such a cap and
call M-056 fixed. The older progress wording “inside the central rib” is not
needed for this conclusion; the specific proven runtime obstruction is Spine's
bounding box.

Recommended resolution when this work resumes: keep the numeric landing as the
initial constraint, propose explicit support/crown collision pieces that leave
an arch opening, and review the intended perch height against the half-ring
reference and existing routes. If the perch must instead be at the true crown,
that requires coordinated landing/route changes. Either choice changes the
current collision contract and belongs in a separately reviewed runtime + asset
repair. A true half-ring helper fix alone still leaves a broad torus bounding
box across its opening, so it is insufficient by itself. Afterwards validate
full footprint coverage on both LODs and controller approach/landing clearance,
not just a single center ray. No model or gameplay repair was attempted here.

## M-092: asset changes currently do not drive the world

`hopper/game/scripts/code-models/terrain.mjs:120` states that runtime samples the
generator rather than the PNG. `game/src/game3d/world.ts:197` confirms
`makeHeightField(...)`; `scene.ts:313` independently generates visible terrain.
Therefore exporting a matching GLB/PNG pair does not by itself synchronize game
collision or make the edited GLB visible. Preserve the generator surface for any
asset-only pass; changed plateau heights require coordinated rendering/collision
loading. Merely resampling a sculpt is not complete integration.

The three existing files span **4800×4800 m**, matching district.ts:311/485/651;
the request's 2400×300×2400 is nominal and conflicts with them. Keep current
extents unless the district/route contract changes. Decode heightmap values as
`min + value/65535 × (max-min)`, where `heightRange` stores **[min,max]**, not
[min,range]. Existing maps are 513²; LOD0 is 59,858 triangles. Near-vertical cliffs
may be separate decorative meshes, but a heightmap cannot represent overhang
collision. Complete Fields first, then City/Mountains. Mission-two/three route,
plateau and terrain parameters now exist: `district2.ts:136–150,294–310,448–465`
and `district3.ts:121–137,275–291,439–457` (all six use size 4800). The exporter at
`game/scripts/code-models/terrain.mjs:109–114` still enumerates only the three
Earth districts, so those new layouts are not six delivered terrain GLB/PNG pairs.
Extend candidate export coverage using these actual district definitions when
scheduled, rather than request new route designs or reuse the Earth maps.

The merge also adds a terrain `shelf` in `standins/src/terrain.js:36–41` and soft
sea/slag/dust floors. `world.ts:196` reads soft-floor metadata; `scene.ts:316–326`
draws its separate sheet. New-terrain audits must preserve the shore/shelf shape,
soft-floor level and lift behavior as well as solid height samples. Do not bake
these transient/volume surfaces into a solid collision heightmap.

## Restart and completion gate

Start with M-024/M-027 isolated candidates under `local/hopper-tier-b/<request>/`.
Use current production GLBs as preservation evidence, approved references as the
art guide, and `BUILD-CONTRACT.md` plus stand-in numeric landings as constraints.
Do not rerun the broad code-model exporter over accepted production assets.
For each batch: capture current bounds/landing rectangles/sockets/rigid owners;
author both LODs; test the full landing footprint and underside clearance; inspect
matched close, 100 m and 300 m silhouettes against light/dark regional skies;
run the repository validator and runtime collider overlay where relevant. Keep
original painted textures when atlasing loses detail. Root reviews candidate
sheets before copying artifacts and updating manifest metrics. Only then change
`processing` to `cleaned` and remove that asset's cleanup pointer. A numerical
validator pass or a Tier A delivery is not Tier B art approval.
