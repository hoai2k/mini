# Round-three artwork

Current generated assets for T080, T081, T082 and T086 are available at the requested texture paths and the game uses them.

**The outstanding checks have now been run, and nine of the ten assets fail them.** `python3 ../../design/source/verify_round3.py` measures tiling, atlas padding and alpha, and writes [verification.json](verification.json); `manifest.json` carries the per-asset result.

| Asset | Result |
| --- | --- |
| `surface/{sea,dust,slag}.png` and their detail masks | Fail. Opposite edges differ by 5–17 per channel against a limit of 2, so the seam shows wherever the floor repeats. |
| `surface/shoreline-foam.png` | Fail. Does not tile horizontally (22.3), and the foam runs into both vertical margins the prompt asked to keep clear. |
| `effects/hopper.png` | Fail. Four of the twelve sprite cells sit inside the 48 px padding, the tightest at 11 px, so neighbours bleed at small mip levels. Row four is intentionally empty. |
| `ui/props.png` | Fail. All four decals touch their cell edges (smallest margin 0 px) against 24 px requested. |
| `ui/landing-guide-light.png` | Pass. Alpha 0–255 and geometry identical to the dark guide (coverage ratio 1.000). |

The artwork stays in place: it reads correctly in the districts that use it, and these are repeat/filtering faults rather than wrong pictures. Fixing them means an offset-and-repaint pass on the seams and a re-export of both atlases on their grids, not new prompts.

`manifest.json` records every prompt, native resolution and export size. Square painted masters are 1254×1254 and exported at requested dimensions; these are not native 2K paintings. The landing guide uses the original editable SVG geometry with ivory strokes. Three matching grayscale detail maps are scalar detail/animation masks, not normal maps or directional flow vectors.

The 2048² Hopper sheet uses a 4×4 grid: first row laser, static muzzle glow, shield and glide trail; second/third rows eight muzzle animation frames; fourth row empty. Frame metadata and individual exports will follow verification. Prop decals use a 2×2 grid: lit lamp, unlit lamp, spring chevrons, crown.

Optional T083–085 skies remain open: the native-4K test returned 1774×887, below the explicit requirement. Original skies remain in place. Unused generation attempts stay in ignored local storage.
