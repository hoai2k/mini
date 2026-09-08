# Hopper 3D painted texture pack

Delivery for T-001–T-037, T-039–T-041 and T-045–T-047. Existing controller, title and episode artwork is unchanged; toon ramps remain procedural.

Open `../viewer/textures.html` through a web server. Choose a region and surface, compare the stand-in, inspect the gallery, and load the full KTX2 sky. This is an asset review scene, not an integration into the future 3D game.

## Files and conventions

| Directory | Contents |
|---|---|
| `sky/` | Nine 8192×4096 ETC1S KTX2 skies with mipmaps; JPEG previews/fallbacks |
| `horizon/` | 144 transparent 4096×1024 cards: nine regions × two haze depths × eight cards |
| `terrain/<region>/` | Three 2048² albedos and a 512² RGB splat template |
| `trim/` | Nine 4096² albedos and matching grayscale emissive masks |
| `creatures/` | 2048² shadow hide and aligned emissive mask |
| `ui/` | Landing guide, two lock-on states, five 128² icons, nine 256² signal glyphs; PNG atlases, individual PNGs and editable SVG sources |
| `effects/` | Five 2048×1024 atlases with eight 512² frames each, plus gravity arrow and scrolling seam strip |

Albedos and painted sprites use sRGB. Masks use linear/no colour-space conversion. PNG alpha is straight, not premultiplied. Set RepeatWrapping on both terrain axes, and only horizontally on trim strips. Trim UVs should remain inside a chosen horizontal material band with a filtering inset; trim sheets are not vertically repeating wall textures. Use mipmaps and anisotropic filtering.

Splat template channels: **R ground, G cliff, B path**; bytes sum to 255. This is an editable example distribution, not a finished level's terrain mask. Sample without sRGB conversion. Emissive maps are grayscale intensity derived from the matching painting. Fields, city, mountains, harbor, launchworks and red trims intentionally have black emissive masks. Blue, violet and furnace highlights emit; tint and intensity belong to the material.

Horizon names use zero-based `<region>-<ring>-<card>.png`: ring 0 at 5 km, ring 1 at 6.75 km. Four painted shapes per region are reused with four mirrored variants, then graded to two haze depths. Leave out the sector occupied by the exit landmark (the review scene omits card 2 in both rings). Use alpha blending, no depth write, and overlap adjacent cards slightly. These are distant decoration, never collision geometry.

Skies use the existing `paintSky` convention, whose disc is around **u=.28** in its top-origin image. Generated paintings were rotated half a panorama from the prompted u=.78. The prose “100° right of +Z” and existing dome/light conventions are not mathematically identical; use the UV convention consistently and rotate the dome/light together if changing world axes. KTX2 files are encoded with a **lower-left origin** for Three.js/OpenGL; JPEG previews use the normal TextureLoader flip. Do not flip KTX2 a second time.

See `effects/atlas.json` for frame order and timing, and `ui/atlas.json` for icon order and reticle behavior. Four generated key drawings per effect were expanded to eight frames using scaled anticipation and opacity-tail frames. These are not eight independently painted keyframes. Particle spawn position/rotation should supply motion; use additive blending for hot sparks if desired, alpha blending for dust.

## Resolution and provenance

The built-in image generator created the painted masters. Native sources are around 1254² for tiles and 1774×887 for skies, with correction outputs of varying sizes. The larger requested exports are **upscaled delivery sizes**, not native 8K detail. Exact generation prompts and source sizes are in `paintings.json`; correction and acceptance notes are in `../design/image-history.md`.

Unused/raw masters and the encoder stay in ignored `local/hopper-3d-textures/`. Only finished assets, previews, metadata and small source scripts belong in Git. `validation.json` records file dimensions, alpha and border checks.
