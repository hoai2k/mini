# Image request history

Delivered art, and where it ended up in the game. Open asks live in `image-requests.md`.

## Delivered September 6, 2026 — empty cages, regional pads and diving cels

The remaining three requests (including both optional groups) were generated with the built-in imagegen tool from the existing sprites. All 15 PNGs are in `game/public/assets/upgrades/`; `followup-manifest.json` records the final prompts and export dimensions.

| Request | Files | Integration |
| --- | --- | --- |
| Empty cages | `props/signal-cage-{intact,broken}-empty.png` | Replaces the erased frame derivatives in the renderer; keeps the floor pedestal and leaves the live warden and collectible to the game |
| Regional spring pads | `props/spring-pad-{fields,city,mountains,foundry,harbor,launchworks,red,blue,violet}.png` | Uses platform skin to select one of nine 160×40 pads, with the neutral pad as fallback |
| Diving attack cels | `enemies/{windowRay,riftCondor,turbineWasp,phaseSkate}-dive.png` | Uses the committed pose during each attack, including the agile second pass; original per-species canvas dimensions and facing rules are retained |

Original art remains available; the interim erased-frame cage derivatives were deleted once the painted empty pair replaced them. These changes only affect rendering, not collision or combat timing.

Checked on integration: all 15 canvas sizes and alpha channels are as specified, the four dive cels match their idle sprites' canvases exactly, and each dive cel was confirmed to swap in on attack by hashing the rendered pixels in both states. All 91 images load with no failed requests or console errors. Two rendering problems surfaced and were fixed here:

- **Cages drew under their occupants.** Barriers were painted in the marker pass, before creatures, so the live warden covered the bars that were meant to hold it. Cage drawing moved to its own pass after the creatures.
- **The restored floor pedestal hid the caged signal.** The empty cages keep the pedestal the erased derivatives had lost, and its hub sat exactly where the collectible floats. Signals now draw last, after the cage, so a caged prize reads through its own bars.

## Delivered September 6, 2026 — the generated upgrade pack

Nine request groups, generated with the built-in imagegen tool from each existing sprite as its identity reference. The pack, its prompts and its export notes are in [`../game/public/assets/upgrades/`](../game/public/assets/upgrades/README.md); `manifest.json` there records the prompt and dimensions of every file. All nine groups are now wired into the renderer.

| #   | Request            | Files                                         | Where it is used                                                                                |
| --- | ------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Controller diagram | `controller.svg`, `controller-diagram.png`    | The instructions dialog draws the **SVG**; the PNG is kept for the printed design document only |
| 2   | Spring pad         | `props/spring-pad.png`                        | Tiled across every `kind: 'spring'` platform, with the launcher glow kept behind it             |
| 3   | Lockdown wall      | `props/lockdown-wall-segment.png`, `-cap.png` | The boss gate: segments repeat down the shaft, the cap is the leading edge that meets the floor |
| 4   | Signal cage        | `props/signal-cage-{intact,broken}-frame.png` | Drawn over each barrier; swaps to the broken frame when a parried shot opens it                 |
| 5   | Wind lane          | `effects/wind-lane-atlas.png`                 | Three frames at 12 fps, tiled across the lane and drifting along the push vector                |
| 6   | Low road           | `terrain/low-road-*.png` (nine regions)       | The recess under every hollowed fight shelf, between the shelf underside and the corridor floor |
| 7   | Enemy leap cels    | `enemies/*-leap.png` (fourteen species)       | Swapped in whenever that shadow is airborne: pounce, vault, hop or overfly                      |
| 8   | Arena pillars      | `terrain/arena-pillar-*.png` (three regions)  | The two wall-kick pillars in each boss enclosure                                                |
| 9   | Emergence burst    | `effects/emergence-burst-atlas.png`           | Eight frames at 16 fps, played once wherever an ambusher surfaces or a wave leaps in            |

### Changes made during integration

- **The cage art contained its own occupants.** Both `signal-cage-intact.png` and `signal-cage-broken.png` paint a sentry and a signal inside the bars, but the game already puts a live warden and a live collectible there, so using them as delivered showed two of each. The occupants were cleared programmatically into interim `-frame.png` derivatives, which the renderer used until the painted empty pair arrived in the follow-up delivery. Those derivatives have since been deleted; the originals are untouched.
- **The design folder's controller art was stale.** `design/assets/controller-diagram.png` and `design/source/controller.svg` were still the pre-parry versions, so the built Word and PDF design documents showed "B · FORCE SHIELD". Both were replaced with the delivered files.
- **The live PNG diagram was retired.** `game/public/assets/controller-diagram.png` is gone; the game uses the 4 KB SVG, which is sharper at television sizes than the 110 KB raster it replaced. The PNG survives in `design/assets/` for the document build and in the delivery pack.
- **Unused variants moved to `reference/`.** The pack also ships single frames beside each atlas, an assembled `lockdown-wall.png`, the unsuffixed cages with their painted occupants, and its own copies of the controller files. The renderer uses the atlases, the segment/cap pair and the `-empty` cages, so those 16 images now sit in `game/public/assets/upgrades/reference/`, mirroring the pack's own layout. Everything outside `reference/` is loaded at runtime; everything inside it is the delivery record and the source for future edits (0.7 MB, still served by Pages but never fetched by the game). Both manifests were repointed to the new paths.

### Verified

Every file in the pack loads (78 images, no failed requests, no console errors), and each group was checked on screen in the built Pages bundle: the corridor recess under a fight shelf, a cage with the live warden and signal showing through the bars, the spring pad and wind lane on a glide crossing, the boss enclosure with its pillars, an airborne chain manta on its banking cel, and an emergence burst. Alpha was confirmed genuine on every sprite; the nine corridor plates are opaque by design.
