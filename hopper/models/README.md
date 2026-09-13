# Hopper 3D models

Canonical character assets for the Hopper 3D game. `hopper/game/vite.models.ts` serves and emits this directory at `./models/`; `engine3d.ts` loads `hopper-rider.glb` from that path. The separate files support previews and external rider binding.

| File | Contents | Clips | Triangles |
| --- | --- | ---: | ---: |
| [hopper.glb](hopper.glb) | Repaired insect rig, two wings, six legs | 35 | 64,925 |
| [rider.glb](rider.glb) | Boy with humanoid rig | 19 | 30,000 |
| [hopper-rider.glb](hopper-rider.glb) | Boy attached to Hopper's original red couch seat | 46 | 94,925 |

The GLBs contain their textures, skins, animation clips and attachment sockets. Together they are approximately 13.7 MB. [assets.json](assets.json) records sizes, hashes and required extensions.

## Loading and playback

Use a glTF loader with **Meshopt decoding** and `KHR_mesh_quantization` support. For Three.js, configure `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` before loading. Both characters face +Z with +Y up. The files use metre units, but the boy's enlarged scale is an artistic fit to the visible couch, not a literal child-height measurement.

The combined GLB contains two skins and already parents the rider under `Hopper.Seat`; do not attach it a second time. Play `Idle` to see its seated pose. The unanimated rest pose retains the boy's source A-pose.

For separate character files, [attachments.js](attachments.js) provides socket lookup, seat binding, laser-origin/direction lookup and clip playback helpers. Capture a rider binding in rest pose, update both animation mixers each frame, then call `binding.update()`. The helper preserves the boy's authored size instead of inheriting Hopper's giant socket scale. Three.js sanitizes dotted node names; the helper also searches the original names stored in `userData.name`.

## Animation and gameplay hooks

[manifest.json](manifest.json) lists exact clip durations, repeating/one-shot flags, socket names and proposed event timings.

- **Hopper:** idle, walk, run, crouch/hold, takeoff, airborne hold, landing, jump preview, rear kick, spin kick, firing transitions/hold, blocking transitions/hold, hit, defeat and victory.
- **Boy:** standing, mounting/settling, seated idle, forward/back lean, brace, looking left/right, cheering, landing/hit reactions and dismounting.
- **Combined:** all 35 Hopper actions, the five original rider previews, and six new masked seated reactions.

Use `Jump_Start → Jump_Loop → Land` with game physics. `Jump_Preview` contains a demonstration height arc and should not be layered over a physics jump. Walk/run are in-place. Fire/block have start, looping hold and end clips. Begin with short crossfades of approximately 0.1–0.15 seconds and tune responsiveness in-game.

Seat, hand, foot, six ground-contact, eye-laser, shield, rear-kick, wing-tip, camera and body-reference sockets are included. `Hopper.Wing.L/R` are non-deforming child nodes at each wing bone endpoint, with local translation `[0, 0.329203584, 0]`; the 51 Hopper and 41 rider skin joints are unchanged. Grip/footrest sockets are neutral-pose references for future controls; they do not add geometry to the original seat. Effects, damage, terrain IK and collision shapes are gameplay work, not embedded in these models. Mounting is a local settling transition, not a climb from the ground. Fingers and facial expressions are not individually rigged.

## M-001: 15 new traversal and combat clips

All clips below are included in the separate Hopper and combined GLBs. Actor movement remains physics-driven. The existing mesh, skinning and 20 baseline Hopper clips are unchanged.

| Clip | Seconds | Playback / pose |
| --- | ---: | --- |
| Wing_Open | 0.25 | One-shot wing spread into glide |
| Glide_Loop | 1.60 | Loop; near-horizontal wings, trailing hind legs |
| Wing_Close | 0.20 | One-shot wing recovery |
| Dive_Loop | 1.20 | Loop; tucked legs and head-down pose |
| Stomp_Land | 0.60 | One-shot compression and recovery |
| Air_Kick | 0.60 | One-shot local body spin with hind-leg extension |
| Wall_Kick | 0.35 | One-shot front-leg plant and push |
| Ledge_Mantle | 0.70 | One-shot front-leg hook and haul pose |
| Hop_Back | 0.45 | One-shot crouch, airborne tuck and recovery |
| Crouch_Charge_Loop | 0.80 | **Clamped charge ramp**, sampled from normalized charge; not cyclic |
| Super_Leap_Start | 0.30 | One-shot compression release and takeoff |
| Lock_Strafe_L | 1.00 | Loop; left sidestep gait |
| Lock_Strafe_R | 1.00 | Loop; right sidestep gait |
| Hit_Air | 0.50 | One-shot airborne recoil |
| Land_Heavy | 0.80 | One-shot dive recovery and deep compression |

## M-002: 6 new seated rider reactions

These clips are present in both the separate rider and combined GLBs. Pelvis and leg roots retain the verified `Riding_Idle` seated pose. Root-sibling shoulders and upper-arm chains follow the chest transform during leaning.

| Clip | Seconds | Playback / pose |
| --- | ---: | --- |
| Glide_Lean | 1.60 | Loop; arms back and slight backward lean |
| Dive_Tuck | 1.20 | Loop; forward tuck and lowered gaze |
| Stomp_Brace | 0.60 | One-shot seated brace and recovery |
| Point_Forward | 1.30 | One-shot extended right-arm gesture above the dashboard |
| Look_Up_Long | 2.40 | One-shot held upward gaze and recovery |
| Cheer_Short | 1.10 | One-shot raised arms, returning to seated idle |

The six reaction clips are **absolute seated poses masked to rider DEF nodes**, not additive deltas. They contain no Hopper, actor-root or socket tracks. Use normal mixer actions and the manifest loop flags; do not call `makeClipAdditive()` without separately converting against the seated reference pose.

Combined locomotion clips also contain rider pose tracks. Playing a full combined locomotion action and a reaction at weight 1 blends their shared rider tracks, reducing the reaction. For independent full-strength gestures, split the base animation into Hopper and rider tracks, keep the Hopper action running, and crossfade only the rider actions:

```js
const isRider = track => track.name.startsWith('DEF-');
const base = gltf.animations.find(clip => clip.name === 'Walk');
const idle = gltf.animations.find(clip => clip.name === 'Idle');
const hopperWalk = new THREE.AnimationClip('HopperWalk', base.duration,
  base.tracks.filter(track => !isRider(track)));
const riderIdle = new THREE.AnimationClip('SeatedIdle', idle.duration,
  idle.tracks.filter(isRider));
mixer.clipAction(hopperWalk).play();
const seated = mixer.clipAction(riderIdle).play();
const pointClip = gltf.animations.find(clip => clip.name === 'Point_Forward');
const point = mixer.clipAction(pointClip).reset().setLoop(THREE.LoopOnce, 1);
point.clampWhenFinished = true;
point.play().crossFadeFrom(seated, 0.12, false);
// On completion, crossfade the rider back to seated idle; keep HopperWalk running.
```

The scarf retains its existing torso skinning because the rig has no independent scarf joint. Fingers and facial expressions are also not separately rigged. No new deform joints were introduced.

## Repair and validation

This snapshot includes the corrected couch fit and subsequent skinning repair. The boy is four times larger than the first animation pass. Complete cleaner-side limb assemblies were mirrored, joint pivots fitted, wing/leg boundaries separated along connected surfaces and detached source-limb remnants removed. UV artwork is retained.

[validation.json](validation.json) preserves the historical 20/13/25-clip baseline audit: compressed re-import, rider attachments, independent wing/leg landmarks, rigid triangle ownership and walk/run continuity. [animation-extension-validation.json](animation-extension-validation.json) records the current 35/19/46-clip delivery, source and final hashes, exact original-resource preservation, masked track checks, quaternion/loop validation, 441 finite skinned-pose evaluations and zero rider pelvis local drift. All 63 new keypose renders were reviewed; gameplay transitions and timing still need tuning in context. Textured walk phases, jump, kick and block were inspected, along with live viewer playback. The original generated surface still has irregularities and visible articulation seams at close range.

The editable Blender masters, original generations, intermediate exports and rendering diagnostics remain in the ignored `local/hopper-3d/` workspace. This directory contains the current runtime assets and portable integration references; it does not require those local dependencies to load the models.

## Reproducing the extension

The original 20/13/25-clip exports are preserved under ignored `local/hopper-animation-extension/baseline/` and are also recoverable from Git revision `cfe00df`. [source/ANIMATION-PROGRESS.md](source/ANIMATION-PROGRESS.md) lists the authoring and visual QA commands. The generator rejects a second append to already extended assets. It accepts explicit source and output directories:

```sh
node hopper/models/source/extend-animations.mjs --source-dir local/hopper-animation-extension/baseline --output-dir local/hopper-animation-extension/reproduction
node hopper/models/source/validate-animation-extension.mjs --source-dir local/hopper-animation-extension/baseline --candidate-dir hopper/models
```

Regeneration from the preserved baseline was checked byte-for-byte against all three integrated GLBs. `*-qa-decoded.glb` files are expanded Blender inputs, not delivery files.
