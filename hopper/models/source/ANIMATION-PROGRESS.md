# M-001 / M-002 animation extension checkpoint

2026-09-12: Authored 15 new Hopper clips, 6 seated rider reactions and non-deforming `Hopper.Wing.L/R` socket nodes. Root reviewed all five keypose sheets and authorized integration. Final GLBs are now copied to canonical `hopper/models/`; assets.json, manifest.json, README.md and the separate animation-extension-validation.json receipt are updated. M-001/M-002 are delivered in the request source and regenerated docs. Changes await root commit; no commit was made by the animation agent. Ignored candidates and baseline exports remain under `local/hopper-animation-extension/`.

## Integrated contract

- `hopper.glb`: 35 clips, 3,566,344 bytes.
- `rider.glb`: 19 clips, 2,836,676 bytes.
- `hopper-rider.glb`: 46 clips, 7,288,784 bytes.
- All original binary bytes, meshes, skins, inverse binds, vertex weights, materials, textures, accessors, buffer views, original clips and existing nodes are preserved. Only wing nodes receive new non-deforming children; skin joint lists are untouched.
- Physics owns actor movement. New clips never animate actor roots or sockets. Thorax squash/spin is skeletal pose only.
- Combined rider-only clips contain only rider DEF channels, so they can layer over Hopper movement. Rider pelvis and leg roots remain at the verified Riding_Idle seated pose. Root-sibling shoulder/arm chains receive the chest transform delta so shoulders remain attached during lean.
- Wing tips use the existing wing bone endpoint `[0, 0.329203584, 0]` in each wing's local coordinate system. No skin weights or new deform bones.
- `Crouch_Charge_Loop` is a clamped 0.8s charge ramp, intentionally not a cyclic loop despite the requested name. Sample its normalized time from charge.
- Authored loop lengths: Glide 1.6s, Dive 1.2s, left/right strafe 1.0s; rider Glide_Lean 1.6s and Dive_Tuck 1.2s. Rider one-shots: Stomp_Brace 0.6s, Point_Forward 1.3s, Look_Up_Long 2.4s, Cheer_Short 1.1s. Other Hopper durations match the request exactly. All sampled at 30fps plus exact fractional endpoints.
- Existing rig has no independent scarf joint. The scarf follows its existing torso skinning; independent cloth streaming would require a separate rig/mesh request.

## Verification

In `local/hopper-animation-extension/`, `validation.json` holds candidate hashes, duration/loop metadata and append checks. The checked-in `hopper/models/animation-extension-validation.json` consolidates current checks and keeps `hopper/models/validation.json` explicitly identified as the historical baseline audit. `independent-validation.json` independently compares all original resources, root exclusions, masked rider channels, finite values, quaternion lengths and exact loop closure. `blender-validation.json` confirms 1/1/2 skinned meshes, 64,925/30,000/94,925 triangles, max weight sum error 5.22e-8, 441 finite deformed-mesh pose evaluations and zero rider pelvis local drift.

Visual QA rendered 63 combined key poses (three per clip), including close seated views for the six reactions. Five labelled sheets are `hopper-keyposes-{1,2,3}.jpg` and `rider-keyposes-{1,2}.jpg`. Review corrected the wing spread to near horizontal, rider pitch direction, shoulder attachment and pointing-arm clearance. These are bounded keypose renders, not a claim of gameplay transition testing. Existing clips are untouched.

## Reproduce

Run from repo root with Node, Python/Pillow and Blender installed. The generator requires the original 20/13/25-clip baseline and refuses a second append after integration. Use `--source-dir` to select the preserved `local/hopper-animation-extension/baseline/`; `--output-dir` optionally chooses a disposable output directory. The baseline is also recoverable from Git revision `cfe00df`. Regeneration to a second output directory matched all three final binaries byte-for-byte. Three.js/MeshoptDecoder currently come from the existing local test fixture `local/hopper-3d-tests/node_modules/three`.

```sh
node hopper/models/source/extend-animations.mjs --source-dir local/hopper-animation-extension/baseline
node hopper/models/source/validate-animation-extension.mjs --source-dir local/hopper-animation-extension/baseline --candidate-dir hopper/models
node hopper/models/source/decode-animation-qa.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b --python hopper/models/source/reimport-animation-qa.py
/Applications/Blender.app/Contents/MacOS/Blender -b --python hopper/models/source/render-animation-qa.py -- hopper-rider
python3 hopper/models/source/animation-contact-sheets.py
```

Blender on this Mac needs the approved executable escalation; sandbox startup exits 139 before import. `*-qa-decoded.glb` files are disposable expanded Blender input, never production exports.
