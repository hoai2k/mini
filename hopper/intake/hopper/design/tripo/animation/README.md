# Hopper and rider animation delivery

Animation pass completed September 7, 2026. These are usable, reviewable animation assets; they have not yet been integrated into the 2D game. Original Tripo assets and previous static exports are preserved.

The rider fit was revised to use the original visual couch seat. The standalone boy and combined model share the enlarged scale. This is an artistic proportion adjustment; the previous 1.4-metre rider scale no longer applies.

Skinning was subsequently repaired: complete symmetric limbs, corrected pivots, surface-connected wing separation and removal of detached source-limb remnants. See [skinning repair](skinning-repair.md).

## Preview

- [Hopper — 20 clips](http://localhost:8765/?model=hopper)
- [Boy — 13 clips](http://localhost:8765/?model=rider)
- [Combined — 25 synchronized clips](http://localhost:8765/?model=hopper-rider)
- [Seated close-up](http://localhost:8765/?model=hopper-rider&clip=Idle&focus=rider)

Choose a clip button. Loop defaults to repeating for locomotion and held actions, and to once for attacks and transitions. The timeline, playback speed, skeleton display, rest pose and rider close-up controls remain available. The combined model starts in its animated riding idle; its unanimated rest pose still shows the boy's source A-pose.

The viewer is in `/Users/hoai/Documents/Stuff/Generations/viewer`. Run `start.command` if the local server is stopped.

## Files

All model files are local, under `/Users/hoai/Documents/Games/mini/local/hopper-3d/models/`:

| Asset | Delivery | Clips | Triangles | Size |
| --- | --- | ---: | ---: | ---: |
| Hopper | `output/hopper.glb` | 20 | 64,925 | 2.89 MB |
| Boy | `output/rider.glb` | 13 | 30,000 | 2.37 MB |
| Combined | `output/hopper-rider.glb` | 25 | 94,925 | 5.38 MB |

Editable control rigs and animation actions: `animated/hopper-animated.blend`, `animated/rider-animated.blend`, `animated/hopper-rider-animated.blend`. Uncompressed exports: `animated/*-raw.glb`. Compression uses Meshopt, embedded textures and preserved node names. Previous static outputs: `static-output/hopper.glb` and `static-output/rider.glb`.

The combined Blender master bakes the rider's global movement for editing. The combined GLB replaces that motion with a true seat-parent attachment, eliminating drift between animation samples. `attach_export.py` reproduces this step. Reimported compressed scenes are also retained in `animated/*-reimport.blend`.

## Clip behavior

**Hopper:** Idle, Walk, Run, Crouch, Crouch_Hold, Jump_Start, Jump_Loop, Land, Jump_Preview, Back_Kick, Spin_Kick, Fire_Start, Fire_Loop, Fire_End, Block_Start, Block_Loop, Block_End, Hit_Reaction, Defeat and Victory.

Walk and Run use alternating tripod legs with in-place travel. Crouching compresses the body while targeting planted feet. Jump_Loop holds the legs tucked; Land lowers them just before contact and absorbs impact. Back_Kick uses both large rear legs. Spin_Kick rotates the body and extends the rear legs. Fire poses brace the body and angle the head. Block raises the front legs and braces behind the shield socket. Wings and antennae contribute secondary motion.

**Boy:** Standing_Idle, Mount_Seat, Riding_Idle, Lean_Forward, Lean_Back, Brace, Look_Left, Look_Right, Cheer, Cheer_Loop, Landing_React, Hit_Reaction and Dismount_Seat.

Mount_Seat and Dismount_Seat are local settling/standing transitions on the saddle platform, not a climb from ground level onto the giant robot. The boy keeps the approved hand mesh: hand and arm motion is animated, but fingers and facial expressions are not individually rigged.

**Combined:** All 20 Hopper clips synchronize a seated rider reaction, plus Rider_Cheer, Rider_Lean_Forward, Rider_Lean_Back, Mount_Seat and Dismount_Seat. The rider is four times larger than the first animation delivery and sits on the original central red couch cushion, inside the yellow frame. The added booster, controls and support geometry have been removed. Hand contact matches riding idle; leaning and cheering intentionally release or shift the hands. Continuous grip locking during arbitrary blended poses would need runtime hand IK.

## Attachment sockets

Socket names below are original GLB names. Three.js sanitizes dots in `Object3D.name`; use the provided lookup helper, which also checks `userData.name`.

| Character | Socket | Purpose |
| --- | --- | --- |
| Hopper | `Hopper.Seat` | Canonical attachment frame for the rider |
| Hopper | `Hopper.Grip.L/R` | Neutral palm target for future controls |
| Hopper | `Hopper.Footrest.L/R` | Neutral rider foot reference |
| Hopper | `Hopper.Laser.L/R` | Left and right eye emission origins |
| Hopper | `Hopper.Shield` | Force-shield placement in front of the head |
| Hopper | `Hopper.Foot.Front/Middle/Rear.L/R` | Six foot placement/contact references |
| Hopper | `Hopper.Hitbox.RearKick.L/R` | Swept rear-foot attack references |
| Hopper | `Hopper.Camera`, `Hopper.CenterOfMass` | Camera and body reference points |
| Boy | `Rider.Mount` | Stable seat connection independent of torso lean |
| Boy | `Rider.Hand.L/R`, `Rider.Foot.L/R` | Palms and soles |
| Boy | `Rider.Head`, `Rider.Chest`, `Rider.Camera` | Head/body/accessory and camera references |

Hopper also retains the prior `rider_seat` and `laser.L/R` bones for reference. Use the new names above for integration. Both exports use metre units, +Y up and +Z forward. Socket-local +Z points forward. Socket scales inherit authoring scales, so normalize their direction vectors and do not inherit socket scale into laser particles, shield radii or the separate rider root.

## Game integration

[manifest.json](manifest.json) lists exact exported durations, loop flags, socket names and proposed normalized event windows. Events are metadata hooks; GLBs contain gestures, not laser beams, shield effects, collision shapes or damage logic. Contact sockets are suitable starting points for ray tests and swept attacks, not a replacement for gameplay collision tuning.

Use Jump_Start → Jump_Loop → Land, driven by the actual physics state. Jump_Preview includes a demonstration height arc and should not be layered over a physics jump. Spin_Kick rotates the animated body locally; keep the player's gameplay facing independent. Use Fire_Start → Fire_Loop → Fire_End and Block_Start → Block_Loop → Block_End. Held lean/brace/crouch clips clamp on their final pose. Start with approximately 0.1–0.15 seconds of crossfade, tuning attack responsiveness in the game.

[attachments.js](attachments.js) provides Three.js socket lookup, ray origins/directions, clip playback and separate-model seat binding. Capture the binding with the rider in rest pose, then update both animation mixers before calling `binding.update()` each frame. It removes the seat's giant scale while preserving the rider's authored size. Do **not** apply this helper to the combined GLB: its rider already inherits the seat structurally.

## Validation and remaining limits

- Rendered seated, cheering, leaning, crouching, airborne, backward-kick and blocking poses; inspected the combined seating at real character scale.
- Checked all 58 raw clips for finite transforms and all repeating clips for matching endpoint transforms.
- Sampled each combined clip at 31 times. Maximum seat attachment error, excluding intentional mounting/dismounting movement: 0.000002 m. Neutral hand/foot contact error: below 0.000005 m in the uncompressed export.
- Reimported all compressed GLBs and evaluated every clip. Clip counts, two separate skins in the combined model, full weight coverage and a maximum of four influences are preserved. Maximum weight-sum error is below 0.00000006.
- Tested the separate-model binding against 30 translated/rotated Hopper placements with rider size preserved.
- Verified live browser loading, animation buttons, playback/pause, airborne loop and rider close-up.

These are animation-ready review candidates, not a claim of finished game feel. The generated triangulated joints and textured armor retain their source limitations; extreme closeups can expose mechanical seams. Foot terrain adaptation, collision sizing, grounded movement speed, transitions under player input, fingers/facial performance and actual visual effects remain integration work. See [validation.json](validation.json) for results.
