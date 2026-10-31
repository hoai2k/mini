# Micro prototypes: image requests

Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

3 requested, 48 delivered, 51 in total.

## Phage (molecular illustration)

Images for the phage prototype (Level 6): no light microscope can see a phage, so the level is a Goodsell-style molecular illustration grounded in cryo-EM shapes. The phage and host are built in code; these give the surfaces and the crowded water.

### MP-V01 · Outer membrane surface (top view)

- **File:** `micro/prototypes/assets/phage/envelope.webp`
- **Size:** 2048 x 2048, opaque, tileable
- **Used for:** The host cell's surface the phage lands on and walks across.
- **Stand-in until delivered:** Procedural lipopolysaccharide brush and protein dots.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](../research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Tagged Pseudomonas biofilm; fluorescence and matrix analogue, not a live/dead-stain image.](../research/assets/references/production/biofilm-fluorescence.png) · Schwarz, Michael (ORCID: 0009-0002-1414-3291), CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:NFDI4BIOIMAGE_Calendar_March_2025_-_image_march.png)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Molecular-illustration look in the manner of David Goodsell's watercolours: flat, softly outlined shapes with no lighting effects, every protein and nucleic acid drawn at true relative size, crowded as real cytoplasm and water are, a restrained palette (warm pinks and oranges for proteins, purples for nucleic acid, pale yellows and greens for membranes and polysaccharide). Electron microscopes and models show this scale; a light microscope cannot. The outer surface of a Gram-negative bacterium seen from above at about 200 nm across: a dense lawn of lipopolysaccharide chains like a soft brush, with the trimeric pores of outer-membrane proteins (porins such as OmpC) scattered through it as rounded triangular clusters, and a few longer O-antigen chains. Muted, warm, evenly lit. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-V02 · Crowded water (backdrop)

- **File:** `micro/prototypes/assets/phage/water.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The far backdrop of the water the phage drifts through.
- **Stand-in until delivered:** A soft gradient with procedural molecule dots.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](../research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)

```text
Molecular-illustration look in the manner of David Goodsell's watercolours: flat, softly outlined shapes with no lighting effects, every protein and nucleic acid drawn at true relative size, crowded as real cytoplasm and water are, a restrained palette (warm pinks and oranges for proteins, purples for nucleic acid, pale yellows and greens for membranes and polysaccharide). Electron microscopes and models show this scale; a light microscope cannot. Water crowded with small dissolved molecules and a few humic particles seen at about 1 µm across, softly out of focus, with depth fading into a pale blue-green haze; no cells and no phages, an even, calm backdrop. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-V03 · Envelope cross-section

- **File:** `micro/prototypes/assets/phage/envelope-section.webp`
- **Size:** 2560 x 1080, opaque
- **Used for:** The cutaway shown when the tail tube pierces the envelope and the DNA enters.
- **Stand-in until delivered:** Procedural layered bands.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](../research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](../research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)

```text
Molecular-illustration look in the manner of David Goodsell's watercolours: flat, softly outlined shapes with no lighting effects, every protein and nucleic acid drawn at true relative size, crowded as real cytoplasm and water are, a restrained palette (warm pinks and oranges for proteins, purples for nucleic acid, pale yellows and greens for membranes and polysaccharide). Electron microscopes and models show this scale; a light microscope cannot. A horizontal cross-section through a Gram-negative cell envelope about 400 nm wide: from top to bottom, water, the outer membrane with lipopolysaccharide chains and porins, the periplasm with a thin peptidoglycan mesh, the inner membrane with embedded proteins, and crowded cytoplasm with ribosomes and a DNA strand. Layers horizontal and continuous across the image. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```
