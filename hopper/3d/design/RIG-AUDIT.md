# Hopper rig audit

Date: 2026-09-12  
Scope: read-only inventory for M-001 (Hopper animation) and M-002 (seated rider animation).

## Canonical runtime assets

The runtime loads `./models/hopper-rider.glb` in `hopper/game/src/game3d/engine3d.ts`; `hopper/game/vite.models.ts` maps source `hopper/models/` to that served/emitted `/models/` path (while the delivered registry for other assets is under `hopper/3d/models/`). The publishable character files are therefore `hopper/models/hopper.glb`, `rider.glb`, and `hopper-rider.glb`. `hopper/models/assets.json` and `local/hopper-3d/models/animated/delivery-manifest.json` agree on sizes and SHA-256 hashes. The local copies at `local/hopper-3d/models/animated/` are the same exports, not a different runtime branch.

The combined file already parents `RiderRig` under `Hopper.Seat`; do not apply `createRiderBinding()` to it. Separate files use `attachments.js` and require both mixers to update before `binding.update()`. All assets are metre units, +Y up, +Z forward, with Meshopt and quantized glTF extensions.

## Actual GLB inventory

Binary GLB JSON inspection (header/chunk read only) found:

| asset | skins / joints | meshes | clips |
| --- | ---: | ---: | ---: |
| hopper.glb | 1 / 51 | 1 | 20 |
| rider.glb | 1 / 41 | 1 | 13 |
| hopper-rider.glb | 2 / 51 + 41 | 2 | 25 |

Hopper's deform/attachment node names include `thorax`, `abdomen`, `head`, `saddle`, `wing.L/R`, `antenna_1/2/3.L/R`, three `upper/lower/foot` chains for each side of `front`, `middle`, and `rear`, and the named gameplay sockets listed below. Rider's deform names include the `DEF-*` humanoid chain through `DEF-spine.006`, with named hand/foot/head/chest/camera/mount sockets. The runtime GLB node names and skin joint lists retain these names exactly; Three.js name sanitization is accounted for by `attachments.js`.

Sockets currently present and validated are Hopper: `Hopper.Foot.Front.L/R`, `Hopper.Foot.Middle.L/R`, `Hopper.Foot.Rear.L/R`, `Hopper.Laser.L/R`, `Hopper.Shield`, `Hopper.Camera`, `Hopper.CenterOfMass`, `Hopper.Hitbox.RearKick.L/R`, `Hopper.Footrest.L/R`, `Hopper.Grip.L/R`, `Hopper.Seat`; Rider: `Rider.Foot.L/R`, `Rider.Hand.L/R`, `Rider.Camera`, `Rider.Head`, `Rider.Chest`, `Rider.Mount`. Wing-tip sockets requested by the production state are not in this inventory and must be added deliberately in the next animation/model pass.

## Existing baseline versus open M-001 / M-002

The current 20 Hopper, 13 Rider, and 25 combined clips in `hopper/models/manifest.json` are the existing baseline. M-001/M-002 request new clips in `hopper/3d/design/model-requests.md`; they are not present in the GLB inventory. Baseline M-001-adjacent clips are `Idle` 2.433s, `Walk` 1.233s, `Run` 0.833s, `Crouch` 0.533s, `Crouch_Hold` 1.233s, `Jump_Start` 0.567s, `Jump_Loop` 1.033s, `Land` 0.700s, `Jump_Preview` 2.233s, `Back_Kick` 0.900s, `Spin_Kick` 1.033s, `Fire_Start` 0.300s, `Fire_Loop` 0.833s, `Fire_End` 0.333s, `Block_Start` 0.367s, `Block_Loop` 1.233s, `Block_End` 0.367s, `Hit_Reaction` 0.533s, `Defeat` 1.533s, `Victory` 2.033s. Loop flags are in the manifest; Walk/Run and the jump family remain compatible with procedural gait/physics as described there.

M-001 new Hopper clips are: `Wing_Open` 0.25s, `Glide_Loop` (duration unspecified; loop), `Wing_Close` 0.20s, `Dive_Loop` (unspecified; loop), `Stomp_Land` 0.60s, `Air_Kick` 0.60s, `Wall_Kick` 0.35s, `Ledge_Mantle` 0.70s, `Hop_Back` 0.45s, `Crouch_Charge_Loop` 0.80s (sampled by charge), `Super_Leap_Start` 0.30s, `Lock_Strafe_L` and `Lock_Strafe_R` (unspecified; loops), `Hit_Air` 0.50s, and `Land_Heavy` 0.80s. All are physics-driven/no root motion. Add the requested `Hopper.Wing.L` and `Hopper.Wing.R` tip sockets; their exact local offsets are unspecified.

M-002 new Rider clips are `Glide_Lean`, `Dive_Tuck`, `Stomp_Brace`, `Point_Forward`, `Look_Up_Long`, and `Cheer_Short`. The request gives no durations; author them at the existing 30 fps and record the final durations/loop flags in the manifest. They must layer over `Riding_Idle` and remain local to the seat. The combined baseline currently has the 20 Hopper clips plus `Rider_Cheer`, `Rider_Lean_Forward`, `Rider_Lean_Back`, `Mount_Seat`, and `Dismount_Seat` (25 total), so a completed M-001/M-002 combined candidate should have 46 clips if the two strafe clips are separate and all six rider clips are appended.

## Source lineage and safe path

The latest local work is under `local/hopper-3d/models/animated/`. File timestamps show repaired skinning work and animation/export checkpoints on 2026-09-07, but timestamp order does not prove source lineage; use the delivery hashes and reimport reports as the reliable linkage. `animation_core.py` and `build_animations.py` are earlier script files and must be reviewed against the repaired master before reuse. The compressed exports passed the existing reimport checks: one skinned mesh per separate actor, 2 meshes/2 skins combined, complete weights (max sum error about 5.22e-8 for rider/combined), and the expected baseline clip counts. This audit did not open Blender or render scenes.

For future work, duplicate the latest repaired `.blend` masters, make animation-only edits on existing deform bones, and preserve mesh datablocks, armature rest matrices, vertex groups, scales, sockets, NLA names, and the rider seat parent. Add only the required wing-tip socket bones under the existing wing chains, then export a candidate and compare mesh/skin/node/socket invariants to the canonical GLB. An animation-only GLB append/merge is safer than re-exporting the character from source: it avoids repeating skin repair, UV/material, scale, and seat-fitting operations. Use a full re-export only if Blender cannot preserve the repaired armature or if socket insertion requires it; keep the canonical files unchanged until candidate validation passes.

## Validation commands

Run from the repository root, with Blender available:

```sh
blender -b --python local/hopper-3d/scripts/inspect_animation_rigs.py
blender -b --python local/hopper-3d/scripts/audit_animations.py
blender -b --python local/hopper-3d/scripts/reimport_animations.py
```

For a candidate, run the audit and reimport scripts in a disposable copy (they write validation reports and reimport `.blend` files), then compare `animation-validation.json`, `compressed-validation.json`, node/socket names, skin joint ordering, triangle counts, weight sums, clip names/durations/loop seams, and rider seat drift against the canonical reports. The checked-in `test_attachments.mjs` has a stale hard-coded helper path and is not a reliable validation command until that path is corrected; use the current `hopper/models/attachments.js` in a small loader test instead. Use the existing browser viewer for a bounded visual review of Idle, Walk, Jump_Loop, Back_Kick, Land, Rider Riding_Idle, Lean_Forward, Cheer, and combined Mount/Dismount. No destructive overwrite, source regeneration, or expensive scene render is needed for this path.

## Uncertainties

The current runtime snapshots contain authored baseline clips while M-001/M-002 remain open because the requested new clips are absent. Existing validation proves structural invariants and numerical seat drift, not visual quality of every extreme pose. The exact local offsets for `Hopper.Wing.L/R` remain unspecified; decide them before authoring effects that depend on them. The local `raw.glb` files are uncompressed intermediates and should not replace the hashed runtime GLBs.
