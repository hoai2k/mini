# M-011 Chain Manta scaffold progress

This checkpoint is a mechanical skeletal and animation foundation for a later
Astra art pass. It is not a finished creature-art delivery and has not been
copied to production.

Current disposition (2026-09-12): M-011 remains a stand-in in the generated
request inventory. This validated scaffold is queued for Astra after M-007;
only a reviewed canonical art pass and production integration remain locally
feasible.

## Contract and interpretation

- Request: `hopper/3d/design/model-requests.md` (M-011).
- Canonical sprite: `hopper/game/public/assets/enemies/chainManta.png`.
- Implementation reference: `hopper/3d/design/references/enemies/chainManta-turnaround.png` and adjacent JSON metadata.
- The written joint list specifies `tail ×3` plus one six-bone tether spline,
  while the canonical art shows two trailing chains and a short central rear
  fin. The scaffold uses `Tail.0/.1/.2` for the central fin and applies the one
  requested `Tether.0`–`Tether.5` spline to both parallel chain meshes. Separate
  `HookJoint.L/R` bones articulate the two terminal hooks; the required socket
  empties retain the exact `Hook.L/R` names without duplicate exported nodes.
- Axis contract: +Y up, +Z forward.
- Exact bounds: 14.2 × 7.3 × 7.6 m.
- Triangle budgets: 6,000 / 2,000.
- Skeleton per LOD: `Body`, three joints per left/right wing,
  `HookJoint.L/R`, three tail joints, and six tether joints (18 deform bones).
- Required clips: `Soar`, `Tether_Tell`, `Tether_Pull`, `Release`, `Bank`,
  `Hit`, `Dissolve`.
- Required sockets: `Core`, `TetherNode`, `Hook.L`, `Hook.R`, `Hitbox.Body`,
  `Landing`.

## Source and isolated outputs

- Source: `hopper/3d/models/source/chain_manta.py`.
- Output directory: `local/hopper-rigid-creatures/M-011/` (ignored).
- Candidate files: `chainManta.glb`, `chainManta-uncompressed.glb`,
  `chainManta.blend`, `record.json`, `manifest.json`, `rig-qa.json`,
  `preview-scaffold.png`, and `preview-tether-pull.png`.
- Rebuild from repository root:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/chain_manta.py -- full`
- Validate from repository root:
  `node hopper/3d/models/source/validate.mjs --manifest local/hopper-rigid-creatures/M-011/manifest.json local/hopper-rigid-creatures/M-011/chainManta.glb`

## Current QA

- Repository validator: PASS; 126 nodes, 40 meshes, 7 materials, 2,156 / 1,134
  triangles.
- Rest bounds for both LODs: 14.200000 × 7.300000 × 7.599999 m.
- The compressed GLB contains two skins with 18 joints each. All 40 mesh
  primitives retain `JOINTS_0` and `WEIGHTS_0`.
- Every mesh vertex on both LODs has finite normalized weights assigned only to
  the permitted bones. Both visible chain strands share the same six-joint
  tether spline; wing and tail meshes span their respective three-joint chains.
- `rig-qa.json` records isolated evaluated-mesh samples at every authored
  keyframe. Every required clip produces finite nonzero motion on both LODs;
  sampled maximum displacement ranges from 1.040209 m (`Soar`) to 7.031570 m
  (`Dissolve`).
- Every tether joint on both LODs has a verified 0.1-radian keyed rotation range
  in `Tether_Pull`, and the evaluated chain meshes deform through the pose.
- `Soar` closes exactly; maximum first/last channel delta is below
  0.00000000000000003.
- Neither LOD root has animation tracks. No clip is marked for root motion in
  the request, so all movement remains on the skeleton.
- The compressed file retains all seven clip names and all six authoritative
  socket names as unique nodes.

## Art handoff

The placeholder establishes a broad flat manta, two three-joint wings, a short
central tail, two chain strands, separate terminal hooks, a top core, and a
front eye only far enough to exercise the rig. The creative pass should replace
the flat prisms and simple tubes with the canonical hooked wing silhouette,
layered armour, linked chains, crescent hooks, inset eye, and back core while
preserving the bone semantics, shared six-joint tether interface, clip and
socket names, static roots, normalized skinning, exact bounds, and LOD budgets.

No shared request document, manifest, production-state file, production GLB or
game file was edited.
