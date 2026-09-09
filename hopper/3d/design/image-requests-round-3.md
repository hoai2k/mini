# Image requests · round three: after integrating round one

Round one is delivered and in the game (painted skies, horizon cards, terrain sets, trim sheets, shadow hide, reticles, landing guide, effect atlases). Integrating it showed a few things the game still draws flat, and one optional quality pass. Nothing here replaces a delivered file except the optional sky repaints, which sit beside the originals. Generated from `source/build_requests.py`.

**Initial delivery integrated.** The surfaces (T-080), the light landing guide (T-081), the Hopper effect sheet (T-082) and the prop decals (T-086) landed in `textures/` and the game uses them as each entry below says. The sky repaints (T-083..085) stay open because the generator could not reach native 4K.

**Verification: nine of ten assets fail.** The tiling, atlas-padding and alpha checks that were outstanding at delivery have been run (`design/source/verify_round3.py`, results in `textures/round3/verification.json`). The six tiling surfaces and the foam strip have visible seams, and both atlases place artwork inside the padding their prompts asked for; only the light landing guide passes. The artwork stays in the game meanwhile - these are repeat and filtering faults, not wrong pictures - and each entry below carries its own result.

| Request | Why | Priority |
| --- | --- | --- |
| T-080 Soft-landing surfaces: sea, drift dust, slag | The design makes every district floor a return to play: water and dust push Hopper back ashore, slag lifts him out. | before the region that needs it |
| T-081 Landing guide, light variant | The delivered guide is dark navy, right for the fields and the city; on the obsidian, slag and reef floors of later regions it disappears. | any time |
| T-082 Hopper effect sprites: laser bolt, eye muzzle glow, guard shield face, glide wing trail | Round one covered impacts and sparks; Hopper's own attacks still use flat shapes: the laser bolt is a red capsule, the shield a translucent dome, the glide has no trail. | any time |
| T-083 Sky repaint at native 4K: Sunseed Fields | Optional. | optional |
| T-084 Sky repaint at native 4K: Crownline City | Optional. | optional |
| T-085 Sky repaint at native 4K: Thunderhead Range | Optional. | optional |
| T-086 Checkpoint totem and spring pad decals | Small painted faces for the props the player reads at a glance. | any time |

## The requests

### T-080 · Soft-landing surfaces: sea, drift dust, slag

The design makes every district floor a return to play: water and dust push Hopper back ashore, slag lifts him out. Round one has no painted surface for any of them, so the game draws flat colour. Needed before the docks, drift and foundry districts are built.

- **Spec:** three 2048² tileable albedos with matching 512² flow/normal-free detail maps: storm-channel sea (Tempest Docks), luminous blue dust (Cobalt Drift), glowing slag (Cinder Foundries); plus a 1024×256 shoreline foam strip with alpha
- **Status:** delivered (verification-failed) · **Final:** `textures/surface/{sea,dust,slag}.png`
- **In the game:** paintTerrain paints the low floor of the harbor (sea), blue (dust) and foundry (slag) districts with the surface and scrolls its detail mask; paintKit puts slag on the barge deck and dust on the drift volumes. The foam strip waits for a district with a shoreline.
- **Verification:** The three albedos and their detail masks do not tile: opposite edges differ by 5-17 per channel against a limit of 2. The foam strip does not tile horizontally (22.3) and runs into both vertical margins. Needs an offset-and-repaint pass, not a new prompt.
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache surface, 1970s anime background style, three flat cel tones with brushed edges: (1) storm-grey sea with white spray streaks, (2) luminous ultramarine dust with cyan motes, (3) black slag crust with glowing orange seams. No lighting baked in, no text.

### T-081 · Landing guide, light variant

The delivered guide is dark navy, right for the fields and the city; on the obsidian, slag and reef floors of later regions it disappears. The game picks the variant by region floor luminance.

- **Spec:** 512² alpha ring and centre mark in ivory with a dark rim, same geometry as ui/landing-guide.png
- **Status:** delivered (verified) · **Final:** `textures/ui/landing-guide-light.png`
- **In the game:** guideVariant picks the ivory guide on dark floors; the prop decals sit on every totem lamp (lit/unlit), spring pad plate and cage crown.
- **Verification:** Passes: alpha 0-255, geometry identical to the dark guide (coverage ratio 1.000).
- **Prompt:** Use case: interface decal. The attached landing guide, redrawn in ivory #f6edcc lines with a thin dark rim, identical geometry and transparent background, no text.

### T-082 · Hopper effect sprites: laser bolt, eye muzzle glow, guard shield face, glide wing trail

Round one covered impacts and sparks; Hopper's own attacks still use flat shapes: the laser bolt is a red capsule, the shield a translucent dome, the glide has no trail. This sheet gives them paint in the same style as the delivered atlases.

- **Spec:** one 2048² sheet, four 512² alpha elements plus an 8-frame 512² strip for the muzzle glow
- **Status:** delivered (verification-failed) · **Final:** `textures/effects/hopper.png`
- **In the game:** Hopper's laser bolts, eye muzzle glow (8 frames), guard shield face and glide wing trails come from the sheet; the flat shapes remain as fallbacks.
- **Verification:** Four of the twelve sprite cells sit inside the 48px padding, the tightest at 11px, so neighbours bleed at small mip levels. Row four is intentionally empty. Needs a re-export on the grid.
- **Prompt:** Use case: effect sprites. 1970s anime cel effects on transparent background: a red-white eye laser bolt with a bright core and ink edge, an eight-frame eye muzzle glow, a teal hexagon-patterned shield face with a white rim, and a soft cream glide wing trail. Flat tones, no text.

### T-083 · Sky repaint at native 4K: Sunseed Fields

Optional. The delivered Sunseed Fields sky is painted at 1774×887 and upscaled; it reads well at 1080p but softens when the camera looks up at 4K. Only worth doing for the three mission-one skies the player sees most, and only if the softness shows in review.

- **Spec:** 4096×2048 native (not upscaled) equirectangular painting, same composition and sun position as the delivered sky
- **Status:** open · **Final:** `textures/sky/fields-hd.jpg`
- **Prompt:** Use case: environment. Repaint the attached sky at the highest native resolution available, keeping its composition, cloud shapes and sun position exactly: honey morning light, huge cumulus, sun low in the east, apricot haze band. 1970s anime gouache, brushed clouds, flat colour fields, no text.

### T-084 · Sky repaint at native 4K: Crownline City

Optional. The delivered Crownline City sky is painted at 1774×887 and upscaled; it reads well at 1080p but softens when the camera looks up at 4K. Only worth doing for the three mission-one skies the player sees most, and only if the softness shows in review.

- **Spec:** 4096×2048 native (not upscaled) equirectangular painting, same composition and sun position as the delivered sky
- **Status:** open · **Final:** `textures/sky/city-hd.jpg`
- **Prompt:** Use case: environment. Repaint the attached sky at the highest native resolution available, keeping its composition, cloud shapes and sun position exactly: golden sunset, long cloud streaks, warm pink haze. 1970s anime gouache, brushed clouds, flat colour fields, no text.

### T-085 · Sky repaint at native 4K: Thunderhead Range

Optional. The delivered Thunderhead Range sky is painted at 1774×887 and upscaled; it reads well at 1080p but softens when the camera looks up at 4K. Only worth doing for the three mission-one skies the player sees most, and only if the softness shows in review.

- **Spec:** 4096×2048 native (not upscaled) equirectangular painting, same composition and sun position as the delivered sky
- **Status:** open · **Final:** `textures/sky/mountains-hd.jpg`
- **Prompt:** Use case: environment. Repaint the attached sky at the highest native resolution available, keeping its composition, cloud shapes and sun position exactly: slate grey storm sky, apricot clouds, an eclipse beginning above the summit. 1970s anime gouache, brushed clouds, flat colour fields, no text.

### T-086 · Checkpoint totem and spring pad decals

Small painted faces for the props the player reads at a glance. The stand-ins draw them as flat emissive shapes; the delivered models (M-071 onward) will carry these as decals.

- **Spec:** 512² alpha sheet: lit and unlit totem lamp faces, a chevron ring for the spring pad plate, a signal-cage crown glyph
- **Status:** delivered (verification-failed) · **Final:** `textures/ui/props.png`
- **In the game:** guideVariant picks the ivory guide on dark floors; the prop decals sit on every totem lamp (lit/unlit), spring pad plate and cage crown.
- **Verification:** All four decals touch their cell edges (smallest margin 0px) against the 24px requested, so they bleed into each other under filtering. Needs a re-export on the grid.
- **Prompt:** Use case: prop decals. Hand-painted anime cel decals on transparent background: a glowing ivory lamp face and its dark unlit twin, a ring of four white chevrons on cyan, a violet crown glyph. Flat tones with ink edges, no text.

