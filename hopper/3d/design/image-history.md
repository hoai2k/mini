# 3D image delivery history

## 2026-09-08 — painted environment, UI and effects pack

Delivered all 43 previously outstanding request groups from `image-requests.md`: T-001–037, T-039–041, T-045–047. T-038 remains procedural-final; T-042–044 reuse the previously delivered artwork. The generator data and manifest now record delivery.

**Mode:** built-in imagegen. 60 base painting calls: nine skies, nine horizon atlases, 27 individual terrain materials, nine trim sheets, one shadow hide and five effect atlases. The full base prompts and dimensions are preserved in [`../textures/paintings.json`](../textures/paintings.json). Regional palette hex values came from `standins/src/palette.js`; atmosphere and material briefs came from this request document. UI is intentionally authored as vector-clean SVG and rasterized, matching the request for a vector-clean landing ring and the existing ivory HUD. Signal glyphs retain the 2D signal diamond frame, with a new regional mark inside.

**Correction passes:** nine horizon edits used each generated atlas as an image reference to remove suns, moons, eclipses and background clouds while retaining landforms, architecture and chimney smoke. One effect edit removed unwanted mechanical leg geometry from the kick spark, retaining only the starburst and sparks. Some corrections returned baked checkerboards despite requesting alpha; neutral background pixels were removed with the image-processing permission already given in this conversation. Cleaned horizon strips were cropped at row boundaries, fitted without stretching into four strips, and graded to the two specified haze depths.

Horizon correction prompt:

> Edit this four-row game horizon sprite atlas. Preserve the four painted landscape/architecture silhouette strips and their exact layout, scale, 1970s gouache brushwork. REMOVE EVERY SUN, MOON, BLACK DISC, and all background clouds/sky from ALL four rows, replacing them with genuine transparent alpha. Preserve only terrain, buildings, cranes, bridges and floating rocks. Keep smoke ONLY when attached to an industrial chimney. No celestial bodies, no circles floating above or behind silhouettes, no background coloured clouds, no labels. Make four separate horizontal strips on transparent background. Preserve mountains and structure contours, with clean antialiased alpha.

Kick spark correction prompt:

> Remove every piece of the mechanical leg from this effect sprite sheet, leaving ONLY gold-white impact starbursts and their small fading sparks. Exactly four frames in a 2 by 2 grid, each centered inside its quadrant. No limbs, no character, no robot parts, no rocks: only painted starbursts and energy sparks. Preserve original 1970s anime gouache style and timing from initial starburst to larger flare to dispersing sparks to fading sparks. Genuine transparent alpha, no checkerboard, no background.

**Finishing:** opposing terrain edges blended in a narrow band; trim horizontal edges joined; poles of sky panoramas softened to uniform rows. Sky panoramas rotated half a turn to the existing `paintSky` UV convention. KTX-Software 4.4.2 `toktx` encoded ETC1S quality 180, sRGB, full mip chains, lower-left origin. Browser inspection caught the initial upper-left-origin inversion; the delivered files use the corrected encoding. Non-luminous trim masks are intentionally black; other masks are derived from aligned painted highlights. Splat templates are authored RGB blend data.

**Resolution caveat:** native paintings are smaller than their requested export sizes. The 8192×4096 skies, 4096² trims/cards and 2048² terrain are upscaled exports, not claims of native generated detail. Horizon sets contain four distinct painted shapes plus mirrored reuse, not 16 independently generated landscapes. Effects have four generated keys expanded to eight timed frames through anticipation scaling and fading. See the texture README for integration details.

**Review:** inspected original and corrected horizon contact sheets; removed the duplicated celestial bodies and kick-leg contamination. Loaded all nine region sets in `viewer/textures.html`, using 200 m surfaces at six repeats, with sky domes and both horizon depths. Compared against the existing stand-in path and checked shadow hide at the same scale. KTX2 loaded in the browser with the corrected orientation and no console errors. UI/effect alpha, dimensions and terrain/trim seam borders are covered by `textures/validation.json`. Distant surface colours remain distinct across the nine palettes. Larger-scale repetition should still be broken up by actual terrain splatting, props and level geometry during game integration.

Raw/generated masters, corrections, 8K intermediate PNGs, contact sheets and the downloaded encoder remain under ignored `local/hopper-3d-textures/`. Published files live in `hopper/3d/textures/`; review code lives in `hopper/3d/viewer/textures.html` and `textures.js`.
