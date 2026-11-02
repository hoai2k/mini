# Micro prototypes: image requests

Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `design/source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

3 requested, 82 delivered, 85 in total.

## Paramecium

Images for the Paramecium swimming prototype, which can switch between darkfield and phase contrast. The cell and its cilia are geometry and shaders; these supply the habitat.

### MP-P06 · Paramecium bursaria, darkfield, top down (body sprite)

- **File:** `micro/prototypes/assets/paramecium/bursaria-darkfield.webp`
- **Size:** 1024 x 512, transparent (#FF00FF background), the cell's long axis horizontal, front to the right
- **Used for:** The 2D slide (2026-11-02 redesign): the inside of the player's cell, drawn under its procedural outline, beating cilia fringe, granules and contractile vacuoles, tinted per player's Chlorella shade. The card art (MP-U04) is the target look.
- **Stand-in until delivered:** Procedural: a faint fill, about 150 Chlorella dots, golden granules, the macronucleus and two star-shaped contractile vacuoles.
- **Status:** requested
- **Reference images:**
  - [Paramecium bursaria in DIC; green symbionts and body proportions.](research/assets/references/production/paramecium-bursaria.jpg) · Anatoly Mikhaltsov, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Paramecium_bursaria.jpg)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](research/assets/concepts/03-protist-garden.webp)

```text
Darkfield microscope look: near-black background, objects visible only as bright scattering edges and internal granules in cool white and pale gold, faint coloured chloroplasts, small particles as sparkling points, shallow depth of field. Seen straight down, one Paramecium bursaria about 120 µm long filling the frame, its long axis horizontal with the front to the right: a broad slipper shape with a blunt rounded rear, the oral groove running diagonally from the front edge to the mouth at mid-length on the lower side. A thin luminous pellicle outline in cool white, the inside nearly black but packed with round green Chlorella (3 to 5 µm) and scattered pale-gold granules, a pale oval macronucleus in the middle and two star-shaped contractile vacuoles with radiating canals, one near each end. Draw the cilia only as a very faint short fringe (the game draws its own beating cilia). Flat #FF00FF background outside the cell. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-P07 · Hunters of the pond drop in darkfield (reference sheet)

- **File:** `micro/prototypes/assets/reference-sheets/paramecium-hunters-darkfield.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling the 2D slide's enemies as the card shows its creatures (luminous outlines, golden granules on black): Didinium, Dileptus, Amoeba proteus and the bladderwort trap, each seen straight down.
- **Stand-in until delivered:** Procedural outlines built from the brightfield sheets (MP-R06 Didinium, MP-R17 Chaos, MP-R18 bladderwort) and anatomy.
- **Status:** requested
- **Reference images:**
  - [Historical morphology drawing of Didinium feeding on Paramecium; anatomy reference, not a photograph or micrograph.](research/assets/references/production/didinium.jpg) · S. O. Mast, Public domain · [source](https://commons.wikimedia.org/wiki/File:Didinium_nasutum_consuming_a_paramecium.jpg)
  - [Amoeba proteus with pseudopodia, nucleus and contractile vacuole.](research/assets/references/amoeba.jpg) · Cymothoa exigua, CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:Amoeba_proteus.jpg)
  - `boss-bladderwort`: reference photograph still being collected for the atlas
  - [Paramecium caudatum; whole-cell outline and internal contrast.](research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](research/assets/concepts/03-protist-garden.webp)

```text
Darkfield microscope look: near-black background, objects visible only as bright scattering edges and internal granules in cool white and pale gold, faint coloured chloroplasts, small particles as sparkling points, shallow depth of field. A reference sheet on black with four pond-water organisms, each seen straight down and labelled only by position (no text), at true relative size: Didinium nasutum (about 100 µm, a barrel with a short cone proboscis and two girdles of cilia), Dileptus (about 350 µm, a flask-shaped ciliate drawn out into a long flexible trunk with a row of toxicysts, a bead-chain macronucleus), Amoeba proteus (about 500 µm across, a flowing cell with blunt pseudopods, a granular interior glittering gold, a bright clear rim at each advancing tip, a disc nucleus and food vacuoles), and a bladderwort trap (Utricularia, about 1 mm, a translucent green sac with an oval door, branched antennae with bristles and short trigger hairs). Thin luminous outlines in cool white, granules in pale gold, chloroplasts faintly green. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-P08 · World intro plate: the pond drop in darkfield (2D slide)

- **File:** `micro/prototypes/assets/game/intro-paramecium-darkfield.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** A replacement for the Hollow Pool intro plate (MP-G11, a brightfield 3D scene) to match the 2D darkfield slide the world now is and its card (MP-U04); the shell switches to it once delivered.
- **Stand-in until delivered:** MP-G11.
- **Status:** requested
- **Reference images:**
  - [Paramecium bursaria in DIC; green symbionts and body proportions.](research/assets/references/production/paramecium-bursaria.jpg) · Anatoly Mikhaltsov, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Paramecium_bursaria.jpg)
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - [Attached Vorticella ciliates; stalks connect feeding bodies to substrate.](research/assets/references/vorticella.jpg) · Bwiltz, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Vorticella_1.jpg)
  - [Marine Antarctic sea-ice diatoms: morphology reference, not evidence of freshwater co-occurrence.](research/assets/references/diatoms.jpg) · Prof. Gordon T. Taylor, Stony Brook University, Public domain · [source](https://commons.wikimedia.org/wiki/File:Diatoms_through_the_microscope.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](research/assets/concepts/03-protist-garden.webp)

```text
A wide intro plate for a microscopy game, framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with an engraved brass rim), showing a darkfield microscope look seen straight down onto a slide: a green Paramecium bursaria with a bright fringe of cilia and golden granules inside, crossing near-black water between green Spirogyra filaments with spiral chloroplast ribbons, a few bell-shaped Vorticella on coiled stalks, golden-brown detritus clumps, pennate diatoms and fine glittering specks; a barrel-shaped Didinium approaching from one side. Lush, crisp, high contrast. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.
```
