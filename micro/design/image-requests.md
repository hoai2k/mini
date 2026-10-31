# Micro prototypes: image requests

Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

5 requested, 46 delivered, 51 in total.

## Launcher cards

One card per prototype on the prototypes page (micro/prototypes/), from the springtail on the bog surface down to the bacterium at the limit of the light microscope. Until they arrive each card shows a live-drawn thumbnail colour and its title.

### MP-U07 · Phage card (molecular illustration)

- **File:** `micro/prototypes/assets/cards/phage.webp`
- **Size:** 1200 x 800, opaque
- **Used for:** The Phage card on the prototypes page.
- **Stand-in until delivered:** A teal and amber gradient with the title.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](../research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](../research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)

```text
Landscape key art for a scientific microscopy game prototype, 3:2. Leave the lower third calm and fairly even so a title can sit over it. Molecular-illustration look in the manner of David Goodsell's watercolours: flat, softly outlined shapes with no lighting effects, every protein and nucleic acid drawn at true relative size, crowded as real cytoplasm and water are, a restrained palette (warm pinks and oranges for proteins, purples for nucleic acid, pale yellows and greens for membranes and polysaccharide). Electron microscopes and models show this scale; a light microscope cannot. A single T4-like bacteriophage (prolate icosahedral head about 120 by 86 nm, a straight contractile tail sheath, a hexagonal baseplate, six long kinked tail fibres) drifting just above the curved outer membrane of a rod-shaped bacterium, its long fibres reaching down towards lipopolysaccharide chains and outer-membrane proteins on the surface; water crowded with small molecules around it. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-U08 · Zoom transitions card

- **File:** `micro/prototypes/assets/cards/zoom.webp`
- **Size:** 1200 x 800, opaque
- **Used for:** The Zoom transitions card on the prototypes page.
- **Stand-in until delivered:** A radial gradient with the title.
- **Status:** requested
- **Reference images:**
  - [A swarm of water springtails (Podura aquatica) on a pool surface among algae: colour, scale and habitat.](../research/assets/references/springtail-swarm.jpg) · Philippe  Garcelon, CC BY 2.0 · [source](https://commons.wikimedia.org/wiki/File:Podura_aquatica_-_1.jpg)
  - [Moss habitat structure; use leaf architecture as environmental reference.](../research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](../research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](../research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)

```text
Landscape key art for a scientific microscopy game prototype, 3:2. Leave the lower third calm and fairly even so a title can sit over it. A single continuous image that zooms into itself: on the left a macro photograph of a blue-black water springtail on a bog pool beside Sphagnum moss; a nested series of thin white rectangular frames leads inward from it, each frame showing the next, smaller world in its own microscope look: a moss leaf with a tardigrade in DIC, then a green Paramecium in brightfield, then rod bacteria in phase contrast at the centre. Clean, elegant, scientifically grounded, no text, no labels, no scale bars, no fantasy creatures.
```

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
