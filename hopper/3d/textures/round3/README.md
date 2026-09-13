# Round-three artwork

Current generated assets for T080, T081, T082 and T086 are available at the requested texture paths and the game uses them.

**The current checks report six failures among the ten assets.** `python3 ../../design/source/verify_round3.py` measures tiling, atlas padding and alpha, and writes [verification.json](verification.json); `manifest.json` carries the per-asset result.

| Asset | Result |
| --- | --- |
| `surface/{sea,dust,slag}.png` and their detail masks | Fail. Opposite edges differ by 5–17 per channel against a limit of 2, so the seam shows wherever the floor repeats. Three scripted feather candidates were rejected because they introduced visible streaks. |
| `surface/shoreline-foam.png` | Pass. Horizontal seam is 0.000 and both transparent vertical margins have alpha max 0. |
| `effects/hopper.png` | Pass. All twelve occupied cells clear the 48 px requirement (minimum 53 px); row four remains intentionally empty. The existing native paint was uniformly scaled to 0.8327 within each cell. |
| `ui/props.png` | Pass. All four occupied cells clear the 24 px requirement (minimum 28 px). The existing native paint was uniformly scaled to 0.7812 within each cell. |
| `ui/landing-guide-light.png` | Pass. Alpha 0–255 and geometry identical to the dark guide (coverage ratio 1.000). |

T-080 remains `open` because its three albedos and three detail masks still fail; its foam component is repaired. T-081, T-082 and T-086 are `delivered` and verified. The surface artwork stays in place meanwhile, and its replacement requires a painted regeneration that avoids the rejected feather streaks.

`manifest.json` records every prompt, native resolution and export size. Square painted masters are 1254×1254 and exported at requested dimensions; these are not native 2K paintings. Uniformly scaling the atlas cells for padding preserves the native paint and creates no new detail. The landing guide uses the original editable SVG geometry with ivory strokes. Three matching grayscale detail maps are scalar detail/animation masks, not normal maps or directional flow vectors.

The 2048² Hopper sheet uses a 4×4 grid: first row laser, static muzzle glow, shield and glide trail; second/third rows eight muzzle animation frames; fourth row empty. Frame metadata and individual exports will follow verification. Prop decals use a 2×2 grid: lit lamp, unlit lamp, spring chevrons, crown.

Optional T083–085 skies remain open: the native-4K test returned 1774×887, below the explicit requirement. Original skies remain in place. Unused generation attempts stay in ignored local storage.
