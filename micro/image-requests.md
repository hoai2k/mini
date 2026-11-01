# Micro prototypes: image requests

Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `design/source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

2 requested, 79 delivered, 81 in total.

## Paramecium

Images for the Paramecium swimming prototype, which can switch between darkfield and phase contrast. The cell and its cilia are geometry and shaders; these supply the habitat.

### MP-P04 · Pond habitat tile (darkfield, seamless)

- **File:** `micro/prototypes/assets/paramecium/darkfield-tile.webp`
- **Size:** 2048 x 2048, opaque, tileable
- **Used for:** The far background in darkfield mode (the default look again), repeated as the view moves. MP-P01 is not seamless, so its edges show as straight dark seams across the screen as you swim.
- **Stand-in until delivered:** MP-P01, with its seams.
- **Status:** requested
- **Reference images:**
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - [Attached Vorticella ciliates; stalks connect feeding bodies to substrate.](research/assets/references/vorticella.jpg) · Bwiltz, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Vorticella_1.jpg)
  - [Marine Antarctic sea-ice diatoms: morphology reference, not evidence of freshwater co-occurrence.](research/assets/references/diatoms.jpg) · Prof. Gordon T. Taylor, Stony Brook University, Public domain · [source](https://commons.wikimedia.org/wiki/File:Diatoms_through_the_microscope.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](research/assets/concepts/03-protist-garden.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Darkfield microscope look: near-black background, objects visible only as bright scattering edges and internal granules in cool white and pale gold, faint coloured chloroplasts, small particles as sparkling points, shallow depth of field. Pond water at about 2 mm across, out of focus, seen through the water rather than onto a surface: Spirogyra filaments crossing at different angles and depths (each continuing across the edges), loose golden flocs of detritus, scattered pennate diatoms and two or three small clusters of stalked Vorticella, spread evenly so no one corner draws the eye. Mostly dark background between them. No Paramecium. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-P05 · Pond habitat tile (phase contrast, seamless)

- **File:** `micro/prototypes/assets/paramecium/phase-tile.webp`
- **Size:** 2048 x 2048, opaque, tileable
- **Used for:** The far background in phase-contrast mode, repeated as the view moves (MP-P02 is not seamless).
- **Stand-in until delivered:** MP-P02, with its seams.
- **Status:** requested
- **Reference images:**
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - [Attached Vorticella ciliates; stalks connect feeding bodies to substrate.](research/assets/references/vorticella.jpg) · Bwiltz, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Vorticella_1.jpg)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](research/assets/concepts/03-protist-garden.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Phase-contrast microscope look: mid-grey background, transparent structures dark with bright halos at their edges, colourless. The same pond water at about 2 mm across, out of focus: Spirogyra filaments continuing across the edges, detritus flocs, diatoms and a few small clusters of stalked Vorticella, spread evenly. No Paramecium. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```
