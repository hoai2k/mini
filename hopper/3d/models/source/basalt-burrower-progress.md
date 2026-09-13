# M-015 Basalt Burrower scaffold progress

This checkpoint is a mechanical skeletal and animation foundation for a later
Astra art pass. It is not a finished creature-art delivery and has not been
copied to production.

## Contract and compatibility

- Request: `hopper/3d/design/model-requests.md` (M-015).
- Canonical sprite: `hopper/game/public/assets/enemies/basaltBurrower.png`.
- Corrected implementation reference:
  `hopper/3d/design/references/enemies/basaltBurrower-turnaround.png` and
  adjacent JSON metadata. The corrected top view and all other panels specify
  exactly four legs.
- No canonical/rig conflict was found: the three spine joints carry the body,
  the four legs each have three joints, and `DrillPivot` is the rotating snout
  joint. The internal joint name avoids colliding with the required `Drill`
  socket empty.
- Axis contract: +Y up, +Z forward.
- Exact bounds: 7.7 × 4.1 × 11.4 m.
- Triangle budgets: 7,000 / 2,000.
- Skeleton per LOD: `Spine.0/.1/.2`, `DrillPivot`, and
  `Leg.FL/FR/RL/RR.0/.1/.2` (16 deform bones).
- Required clips: `Buried_Idle`, `Tunnel`, `Erupt_Tell`, `Erupt`, `Land`,
  `Withdraw`, `Hit`, `Dissolve`.
- Required sockets: `Core`, `Drill`, `Hitbox.Body`.

## Source and isolated outputs

- Source: `hopper/3d/models/source/basalt_burrower.py`.
- Output directory: `local/hopper-rigid-creatures/M-015/` (ignored).
- Candidate files: `basaltBurrower.glb`, `basaltBurrower-uncompressed.glb`,
  `basaltBurrower.blend`, `record.json`, `manifest.json`, `rig-qa.json`,
  `preview-scaffold.png`, and `preview-erupt-tell.png`.
- Rebuild from repository root:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/basalt_burrower.py -- full`
- Validate from repository root:
  `node hopper/3d/models/source/validate.mjs --manifest local/hopper-rigid-creatures/M-015/manifest.json local/hopper-rigid-creatures/M-015/basaltBurrower.glb`

## Current QA

- Repository validator: PASS; 157 nodes, 59 meshes, 4 materials, 1,696 / 882
  triangles.
- Rest bounds: LOD0 7.700000 × 4.100000 × 11.400000 m; LOD1 7.699999 ×
  4.099999 × 11.399996 m.
- The compressed GLB contains two skins with 16 joints each. All 59 mesh
  primitives retain `JOINTS_0` and `WEIGHTS_0`, and all exported node names are
  unique.
- Every mesh vertex on both LODs has finite normalized weights assigned only to
  the permitted bones. Body vertices blend across the three spines; drill,
  plates, core proxy, leg segments, and feet use their intended controls.
- `rig-qa.json` records isolated evaluated-mesh samples at every authored
  keyframe. Every required clip produces finite nonzero movement on both LODs;
  sampled maximum displacement ranges from 2.334635 m (`Buried_Idle`) to
  9.795710 m (`Dissolve`).
- The `Tunnel` drill channel completes two full revolutions (12.566371 radians)
  on both LODs. The drill index blades make the rotation visible rather than
  relying on a radially symmetric cone alone.
- `Buried_Idle` and `Tunnel` close to the same orientation. Rotation closure is
  checked modulo complete revolutions; the largest residual is below
  0.00000035 radians.
- Only `Erupt` animates the two LOD roots. Its verified game-space root delta is
  `[0, 4.8, 0]`, so the motion is strictly upward.
- Every foot on both LODs rests at game-space Y = 0 within the 0.03 m grounding
  tolerance. The rest and tell previews retain a plausible low belly and four
  ground contacts.

## Art handoff

The placeholder establishes a long low body, three-spine deformation, four
grounded digging legs, dorsal plate proxies, a visible back core, and a spinning
drill only far enough to exercise the rig. The creative pass should replace the
simple ellipsoid, boxes, cones, and feet with the canonical broken layered
basalt armour, ringed drill, claws, and protected core mechanism while
preserving bone and clip semantics, drill rotation, root-motion isolation,
socket names, normalized skinning, exact bounds, and LOD budgets.

No shared request document, manifest, production-state file, production GLB or
game file was edited.
