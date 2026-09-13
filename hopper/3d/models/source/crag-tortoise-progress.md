# M-007 Crag Tortoise scaffold progress

This checkpoint is a mechanical skeletal and animation foundation for a later
Astra art pass. It is not a finished creature-art delivery and has not been
copied to production.

## Contract and compatibility

- Request: `hopper/3d/design/model-requests.md` (M-007).
- Canonical sprite: `hopper/game/public/assets/enemies/cragTortoise.png`.
- Implementation reference: `hopper/3d/design/references/enemies/cragTortoise-turnaround.png` and adjacent JSON metadata.
- No canonical/rig conflict was found. The domed shell and spikes are rigidly
  weighted to a child `Shell` bone while the ivory belly remains visible below.
- Axis contract: +Y up, +Z forward.
- Exact bounds: 7.1 × 4.7 × 8.6 m.
- Triangle budgets: 7,000 / 2,000.
- Skeleton per LOD: `Spine.0`, `Spine.1`, `Shell`, `Head`, `Jaw`, and
  `Leg.FL/FR/RL/RR.0/.1/.2` (17 deform bones total).
- Required clips: `Idle`, `Walk`, `Lunge_Tell`, `Lunge`,
  `Belly_Open_Hold`, `Withdraw`, `Hit`, `Dissolve`.
- Required sockets: `Core`, `Mouth`, `Hitbox.Shell`, `Hitbox.Body`.

## Source and isolated outputs

- Source: `hopper/3d/models/source/crag_tortoise.py`.
- Output directory: `local/hopper-rigid-creatures/M-007/` (ignored).
- Candidate files: `cragTortoise.glb`, `cragTortoise-uncompressed.glb`,
  `cragTortoise.blend`, `record.json`, `manifest.json`, `rig-qa.json`,
  `preview-scaffold.png`, and `preview-belly-tell.png`.
- Rebuild from repository root:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/crag_tortoise.py -- full`
- Validate from repository root:
  `node hopper/3d/models/source/validate.mjs --manifest local/hopper-rigid-creatures/M-007/manifest.json local/hopper-rigid-creatures/M-007/cragTortoise.glb`

## Current QA

- Repository validator: PASS; 154 nodes, 56 meshes, 5 materials, 1,748 / 786
  triangles.
- Rest bounds: LOD0 7.100000 × 4.700000 × 8.600001 m; LOD1 7.100000 ×
  4.700000 × 8.600000 m.
- The compressed GLB contains two skins with 17 joints each. All 56 mesh
  primitives retain `JOINTS_0` and `WEIGHTS_0`.
- Every mesh vertex on both LODs has finite normalized weights assigned only to
  the permitted bones. Belly vertices blend between the two spine bones; the
  shell, spikes, head, jaw, leg segments, and feet use their intended rigid
  groups.
- `rig-qa.json` records isolated evaluated-mesh samples at every authored
  keyframe. Every required clip produces finite nonzero motion on both LODs;
  sampled maximum displacement ranges from 0.063699 m (`Belly_Open_Hold`) to
  6.871489 m (`Dissolve`).
- `Idle`, `Walk`, and `Belly_Open_Hold` close exactly; the largest recorded
  first/last channel delta is below 0.00000000000000006.
- Only `Lunge` animates the two LOD roots. Its authored game-space root delta is
  `[0, 1.15, 5.4]`; every other clip keeps root motion on the skeleton.
- All four feet on both LODs rest at game-space Y = 0 within the 0.03 m
  grounding tolerance. The rest and tell previews keep the belly readable and
  demonstrate the requested rear-up presentation.

## Art handoff

The placeholder establishes a low domed shell, rigid spikes, visible ivory
belly, one head and jaw, and four grounded three-joint legs only far enough to
exercise the rig. The creative pass should replace the primitive shell, legs,
head, and belly with the canonical layered rock armour and creature anatomy
while preserving bone and clip names, shell rigidity, root-motion isolation,
socket placement, normalized skinning, exact bounds, and LOD budgets.

No shared request document, manifest, production-state file, production GLB or
game file was edited.
