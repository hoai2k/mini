# Hopper 3D models

Review snapshot for a future 3D version of Hopper the Grasshopper. These models are **not integrated into the current 2D game** and can continue to be refined.

| File | Contents | Clips | Triangles |
| --- | --- | ---: | ---: |
| [hopper.glb](hopper.glb) | Repaired insect rig, two wings, six legs | 20 | 64,925 |
| [rider.glb](rider.glb) | Boy with humanoid rig | 13 | 30,000 |
| [hopper-rider.glb](hopper-rider.glb) | Boy attached to Hopper's original red couch seat | 25 | 94,925 |

The GLBs contain their textures, skins, animation clips and attachment sockets. Together they are approximately 10.6 MB. [assets.json](assets.json) records sizes, hashes and required extensions.

## Loading and playback

Use a glTF loader with **Meshopt decoding** and `KHR_mesh_quantization` support. For Three.js, configure `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` before loading. Both characters face +Z with +Y up. The files use metre units, but the boy's enlarged scale is an artistic fit to the visible couch, not a literal child-height measurement.

The combined GLB contains two skins and already parents the rider under `Hopper.Seat`; do not attach it a second time. Play `Idle` to see its seated pose. The unanimated rest pose retains the boy's source A-pose.

For separate character files, [attachments.js](attachments.js) provides socket lookup, seat binding, laser-origin/direction lookup and clip playback helpers. Capture a rider binding in rest pose, update both animation mixers each frame, then call `binding.update()`. The helper preserves the boy's authored size instead of inheriting Hopper's giant socket scale. Three.js sanitizes dotted node names; the helper also searches the original names stored in `userData.name`.

## Animation and gameplay hooks

[manifest.json](manifest.json) lists exact clip durations, repeating/one-shot flags, socket names and proposed event timings.

- **Hopper:** idle, walk, run, crouch/hold, takeoff, airborne hold, landing, jump preview, rear kick, spin kick, firing transitions/hold, blocking transitions/hold, hit, defeat and victory.
- **Boy:** standing, mounting/settling, seated idle, forward/back lean, brace, looking left/right, cheering, landing/hit reactions and dismounting.
- **Combined:** all 20 Hopper actions with rider reactions, plus independent cheering, leaning, mounting and dismounting previews.

Use `Jump_Start → Jump_Loop → Land` with game physics. `Jump_Preview` contains a demonstration height arc and should not be layered over a physics jump. Walk/run are in-place. Fire/block have start, looping hold and end clips. Begin with short crossfades of approximately 0.1–0.15 seconds and tune responsiveness in-game.

Seat, hand, foot, six ground-contact, eye-laser, shield, rear-kick, camera and body-reference sockets are included. Grip/footrest sockets are neutral-pose references for future controls; they do not add geometry to the original seat. Effects, damage, terrain IK and collision shapes are gameplay work, not embedded in these models. Mounting is a local settling transition, not a climb from the ground. Fingers and facial expressions are not individually rigged.

## Repair and validation

This snapshot includes the corrected couch fit and subsequent skinning repair. The boy is four times larger than the first animation pass. Complete cleaner-side limb assemblies were mirrored, joint pivots fitted, wing/leg boundaries separated along connected surfaces and detached source-limb remnants removed. UV artwork is retained.

[validation.json](validation.json) includes compressed re-import checks, clip counts, rider-attachment checks, independent wing/leg landmark checks, rigid triangle ownership and walk/run continuity samples. Textured walk phases, jump, kick and block were inspected, along with live viewer playback. The original generated surface still has irregularities and visible articulation seams at close range.

The editable Blender masters, original generations, intermediate exports and rendering diagnostics remain in the ignored `local/hopper-3d/` workspace. This directory contains the current runtime assets and portable integration references; it does not require those local dependencies to load the models.
