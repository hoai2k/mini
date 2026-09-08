# Final validation progress

## Rest-pose animation audit

- `Context.animate()` previously created every NLA track enabled. Blender evaluates enabled tracks at the current frame even when `animation_data.action` is cleared, so multiple clips on one object can alter the default scene pose. The seed-pod hatch has both `Open` and `Close` tracks and exposed this contamination.
- New tracks now start muted. `Context.rest_pose()` also clears active actions and solo state, enables NLA evaluation for export compatibility, and mutes every stored track under LOD0.
- `build.py` applies the rest state before measuring bounds and copying LOD1, then reapplies it after export before rendering and saving the native `.blend`.
- Blender 5.2 exporter inspection: `io_scene_gltf2/blender/exp/animation/tracks.py::__get_nla_tracks_obj()` collects tracks regardless of `track.mute`; the export loop first mutes all tracks, temporarily unmutes each collected track for baking, and restores its original mute state. Muting authored tracks therefore preserves all NLA clips in `NLA_TRACKS` export mode.
- Python syntax compilation passes for `build.py` and `common.py` (with the bytecode cache redirected to `/private/tmp` because the sandbox denies the default macOS cache directory).
- Focused Blender rebuild for M-028 passes and writes a rest-state preview/native/raw model. Raw GLB inspection shows exactly `Open` and `Close`; static `HatchPivot` has translation `[0, 12, 12.5]` with no rotation, so its default rotation is identity/closed.
- Reopening the native `.blend` confirms both `HatchPivot` and `LOD1.HatchPivot` have zero rotation; both retain `Open` and `Close` tracks with `mute=true` and `is_solo=false`.
- Raw validation reaches the contract checks but fails against stale M-028 manifest measurements: rebuilt geometry is 2766/922 triangles while the manifest says 1182/396. The fresh record also reports rest-pose bounds `22.636 × 35 × 26.2`, while the current manifest has `22.437 × 35 × 29.266`; the old Z measurement reflects the contaminated animated pose. The compression-extension warnings are expected for the raw build.
- Strict 43-model validation remains pending the root task's final compressed-ready notification. Strict usage is `/Users/hoai/.local/opt/node/bin/node hopper/3d/models/source/validate.mjs`; omit `--allow-uncompressed` so the required mesh compression extensions are errors.

## Validator follow-up

- Default manifest validation now requires every listed GLB instead of silently filtering missing files. A one-entry missing-file fixture reports `ENOENT`, `0/1 GLBs passed`, and exits 1; `node --check` passes.
- M-082 does not need a `boundsScope` exception. Its base transforms place the shards at the full roughly 12 m burst envelope; the `Dissolve` clip starts them at 0.15 position/scale and expands to those base transforms. The old roughly 3.5 m static measurement was caused by enabled NLA evaluation at frame 1. A fresh build using `rest_pose()` should record the intended static envelope directly, so a bounds exception would mask the bug.

## Strict final run

- Strict validation ran across all 43 compressed manifest entries and the exact output is saved in `models/validation.txt`.
- Result: 37/43 passed. The six model/manifest size mismatches are M-026 silo Y 26.027 vs 32 m; M-040 windsock Z 2.580 vs 3 m; M-044 slag barge Z 19.200 vs 17 m; M-055 gantry elevator X 24 vs 20 m; M-078 launch gate Z 20 vs 16 m; and M-079 laser bolt Y 0.520 vs 0.6 m.
- M-082 now passes with the corrected rest-state bounds, confirming no animated-envelope exception is needed.
- Alpha audit passes: M-072 `field_violet` is used with `alphaMode=BLEND`, alpha 0.14; M-077 gravity gate `gravity_violet` is used with `BLEND`, alpha 0.20; M-081 `shield_teal` is used with `BLEND`, alpha 0.18. Their structural/seam materials remain opaque.
- After the six size corrections and recompression, the final strict rerun passes all 43/43 GLBs. The independent source audit also passes: all 43 LOD0 triangle counts are within `requests.json` budgets and all 92 required socket names from `standin-contracts.json` exist as non-mesh nodes. The final alpha audit passes all three transparent materials. Combined final evidence is saved in `models/validation.txt`.
