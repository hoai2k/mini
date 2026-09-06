# Image request history

Delivered art, and where it ended up in the game. Open asks live in `image-requests.md`.

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

- **The cage art contained its own occupants.** Both `signal-cage-intact.png` and `signal-cage-broken.png` paint a sentry and a signal inside the bars, but the game already puts a live warden and a live collectible there, so using them as delivered showed two of each. The occupants were cleared programmatically from the interior of both, keeping every bar and node, and saved beside the originals as `signal-cage-intact-frame.png` and `signal-cage-broken-frame.png`. The originals are untouched. A painted occupant-free pair is the one open ask in `image-requests.md`.
- **The design folder's controller art was stale.** `design/assets/controller-diagram.png` and `design/source/controller.svg` were still the pre-parry versions, so the built Word and PDF design documents showed "B · FORCE SHIELD". Both were replaced with the delivered files.
- **The live PNG diagram was retired.** `game/public/assets/controller-diagram.png` is gone; the game uses the 4 KB SVG, which is sharper at television sizes than the 110 KB raster it replaced. The PNG survives in `design/assets/` for the document build and in the delivery pack.
- **Unused variants were left in place.** The pack also ships single frames beside each atlas, an assembled `lockdown-wall.png`, and its own copies of the controller files. The renderer uses the atlases and the segment/cap pair; the rest stay as the delivery record.

### Verified

Every file in the pack loads (78 images, no failed requests, no console errors), and each group was checked on screen in the built Pages bundle: the corridor recess under a fight shelf, a cage with the live warden and signal showing through the bars, the spring pad and wind lane on a glide crossing, the boss enclosure with its pillars, an airborne chain manta on its banking cel, and an emergence burst. Alpha was confirmed genuine on every sprite; the nine corridor plates are opaque by design.
