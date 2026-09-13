# Image requests · round three: after integrating round one

Round one is delivered and in the game (painted skies, horizon cards, terrain sets, trim sheets, shadow hide, reticles, landing guide, effect atlases). Integrating it showed a few things the game still draws flat, and one quality pass. Nothing here replaces a delivered file except the sky repaints, which sit beside the originals. Generated from `source/build_requests.py`.

**Initial delivery integrated.** The surfaces (T-080), the light landing guide (T-081), the Hopper effect sheet (T-082) and the prop decals (T-086) landed in `textures/` and the game uses them as each entry below says. The sky repaints (T-083..085) stay open, and are no longer conditional: the 4K review ran, the softness is measurable, and what they ask for is native detail at 4096x2048 rather than a larger file.

**Verification: all ten assets pass.** The current tiling, atlas-padding and alpha checks are in `textures/round3/verification.json`. The six surface albedo/detail files and repaired foam strip have zero measured seams, both atlases meet their cell padding, and the light landing guide matches the dark guide geometry. T-083..085 remain open on the native-detail rule: the delivered skies lose under one grey level RMS when halved and re-expanded, which is how an upscale measures, and the repaints must clear 3.0.

| Request | Why | Priority |
| --- | --- | --- |
| T-080 Soft-landing surfaces: sea, drift dust, slag | The design makes every district floor a return to play: water and dust push Hopper back ashore, slag lifts him out. | before the region that needs it |
| T-081 Landing guide, light variant | The delivered guide is dark navy, right for the fields and the city; on the obsidian, slag and reef floors of later regions it disappears. | any time |
| T-082 Hopper effect sprites: laser bolt, eye muzzle glow, guard shield face, glide wing trail | Round one covered impacts and sparks; Hopper's own attacks still use flat shapes: the laser bolt is a red capsule, the shield a translucent dome, the glide has no trail. | any time |
| T-083 Sky repaint with native 4K detail: Sunseed Fields | The review ran and the softness is real, so this is no longer conditional: what it requires is native detail, not a larger file. | quality pass, before any 4K polish |
| T-084 Sky repaint with native 4K detail: Crownline City | The review ran and the softness is real, so this is no longer conditional: what it requires is native detail, not a larger file. | quality pass, before any 4K polish |
| T-085 Sky repaint with native 4K detail: Thunderhead Range | The review ran and the softness is real, so this is no longer conditional: what it requires is native detail, not a larger file. | quality pass, before any 4K polish |
| T-086 Checkpoint totem and spring pad decals | Small painted faces for the props the player reads at a glance. | any time |

## The requests

### T-080 · Soft-landing surfaces: sea, drift dust, slag

The design makes every district floor a return to play: water and dust push Hopper back ashore, slag lifts him out. Round one has no painted surface for any of them, so the game draws flat colour. Needed before the docks, drift and foundry districts are built.

- **Spec:** three 2048² tileable albedos with matching 512² flow/normal-free detail maps: storm-channel sea (Tempest Docks), luminous blue dust (Cobalt Drift), glowing slag (Cinder Foundries); plus a 1024×256 shoreline foam strip with alpha
- **Status:** delivered (verified) · **Final:** `textures/surface/{sea,dust,slag}.png`
- **In the game:** paintTerrain paints the low floor of the harbor (sea), blue (dust) and foundry (slag) districts with the surface and scrolls its detail mask; paintKit puts slag on the barge deck and dust on the drift volumes. The foam strip waits for a district with a shoreline.
- **Verification:** Passes: three imagegen seam-cross repaints tile at 0.000/0.000 after a trivial 8px wrap-edge finish; matching registered 512px grayscale detail maps also tile at 0.000/0.000. Native paintings are 1254px square and the 2048px albedos are upscaled exports, not new detail. The repaired foam strip passes at seam 0.000 with clear margins. Rejected 10% feather candidates were not used.
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
- **Status:** delivered (verified) · **Final:** `textures/effects/hopper.png`
- **In the game:** Hopper's laser bolts, eye muzzle glow (8 frames), guard shield face and glide wing trails come from the sheet; the flat shapes remain as fallbacks.
- **Verification:** Passes: all twelve occupied cells clear the 48px padding requirement (minimum 53px); row four remains intentionally empty. Existing native painted cells were uniformly scaled to 0.8327, which creates no new detail.
- **Prompt:** Use case: effect sprites. 1970s anime cel effects on transparent background: a red-white eye laser bolt with a bright core and ink edge, an eight-frame eye muzzle glow, a teal hexagon-patterned shield face with a white rim, and a soft cream glide wing trail. Flat tones, no text.

### T-083 · Sky repaint with native 4K detail: Sunseed Fields

The review ran and the softness is real, so this is no longer conditional: what it requires is native detail, not a larger file. The delivered Sunseed Fields sky is a 4096x2048 file upscaled from a 1774x887 painting, and it measures like one - halving it and re-expanding costs under one grey level RMS, so there is no detail above roughly half its stated width. The dome gives about 11 px per degree at 4096 wide and the painting behind it only 3-6; a 4K frame wants about 42 (3840 px across the 91 degree horizontal FOV), so the sky is magnified several times over wherever the camera looks up. A repaint at the same 4096x2048 with real detail is worth 2-4x the effective sharpness at no runtime cost; a bigger file that is still an upscale is worth nothing. If native 4K is genuinely out of reach, deliver a high-detail horizon strip over the procedural gradient instead, because the painted dome only carries the top fifth of a gameplay frame and the rest is hazed out.

- **Spec:** 4096×2048 equirectangular painting carrying real detail at that size - no upscale of a smaller painting - same composition and sun position as the delivered sky; must clear 3.0 RMS in `source/verify_native_detail.py`
- **Status:** open · **Final:** `textures/sky/fields-hd.jpg`
- **Prompt:** Use case: environment. Repaint the attached sky so that every cloud edge and brush mark is painted at 4096x2048 itself, never upscaled or super-resolved from a smaller render, keeping its composition, cloud shapes and sun position exactly: honey morning light, huge cumulus, sun low in the east, apricot haze band. 1970s anime gouache, brushed clouds, flat colour fields, no text.

### T-084 · Sky repaint with native 4K detail: Crownline City

The review ran and the softness is real, so this is no longer conditional: what it requires is native detail, not a larger file. The delivered Crownline City sky is a 4096x2048 file upscaled from a 1774x887 painting, and it measures like one - halving it and re-expanding costs under one grey level RMS, so there is no detail above roughly half its stated width. The dome gives about 11 px per degree at 4096 wide and the painting behind it only 3-6; a 4K frame wants about 42 (3840 px across the 91 degree horizontal FOV), so the sky is magnified several times over wherever the camera looks up. A repaint at the same 4096x2048 with real detail is worth 2-4x the effective sharpness at no runtime cost; a bigger file that is still an upscale is worth nothing. If native 4K is genuinely out of reach, deliver a high-detail horizon strip over the procedural gradient instead, because the painted dome only carries the top fifth of a gameplay frame and the rest is hazed out.

- **Spec:** 4096×2048 equirectangular painting carrying real detail at that size - no upscale of a smaller painting - same composition and sun position as the delivered sky; must clear 3.0 RMS in `source/verify_native_detail.py`
- **Status:** open · **Final:** `textures/sky/city-hd.jpg`
- **Prompt:** Use case: environment. Repaint the attached sky so that every cloud edge and brush mark is painted at 4096x2048 itself, never upscaled or super-resolved from a smaller render, keeping its composition, cloud shapes and sun position exactly: golden sunset, long cloud streaks, warm pink haze. 1970s anime gouache, brushed clouds, flat colour fields, no text.

### T-085 · Sky repaint with native 4K detail: Thunderhead Range

The review ran and the softness is real, so this is no longer conditional: what it requires is native detail, not a larger file. The delivered Thunderhead Range sky is a 4096x2048 file upscaled from a 1774x887 painting, and it measures like one - halving it and re-expanding costs under one grey level RMS, so there is no detail above roughly half its stated width. The dome gives about 11 px per degree at 4096 wide and the painting behind it only 3-6; a 4K frame wants about 42 (3840 px across the 91 degree horizontal FOV), so the sky is magnified several times over wherever the camera looks up. A repaint at the same 4096x2048 with real detail is worth 2-4x the effective sharpness at no runtime cost; a bigger file that is still an upscale is worth nothing. If native 4K is genuinely out of reach, deliver a high-detail horizon strip over the procedural gradient instead, because the painted dome only carries the top fifth of a gameplay frame and the rest is hazed out.

- **Spec:** 4096×2048 equirectangular painting carrying real detail at that size - no upscale of a smaller painting - same composition and sun position as the delivered sky; must clear 3.0 RMS in `source/verify_native_detail.py`
- **Status:** open · **Final:** `textures/sky/mountains-hd.jpg`
- **Prompt:** Use case: environment. Repaint the attached sky so that every cloud edge and brush mark is painted at 4096x2048 itself, never upscaled or super-resolved from a smaller render, keeping its composition, cloud shapes and sun position exactly: slate grey storm sky, apricot clouds, an eclipse beginning above the summit. 1970s anime gouache, brushed clouds, flat colour fields, no text.

### T-086 · Checkpoint totem and spring pad decals

Small painted faces for the props the player reads at a glance. The stand-ins draw them as flat emissive shapes; the delivered models (M-071 onward) will carry these as decals.

- **Spec:** 512² alpha sheet: lit and unlit totem lamp faces, a chevron ring for the spring pad plate, a signal-cage crown glyph
- **Status:** delivered (verified) · **Final:** `textures/ui/props.png`
- **In the game:** guideVariant picks the ivory guide on dark floors; the prop decals sit on every totem lamp (lit/unlit), spring pad plate and cage crown.
- **Verification:** Passes: all four occupied cells clear the 24px padding requirement (minimum 28px). Existing native painted cells were uniformly scaled to 0.7812, which creates no new detail.
- **Prompt:** Use case: prop decals. Hand-painted anime cel decals on transparent background: a glowing ivory lamp face and its dark unlit twin, a ring of four white chevrons on cyan, a violet crown glyph. Flat tones with ink edges, no text.

