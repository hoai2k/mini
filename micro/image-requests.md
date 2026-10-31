# Micro prototypes: image requests

Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `design/source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

7 requested, 57 delivered, 64 in total.

## Round 4: Micro Zoom game UI and world intros

Art for the full game (micro/game/): title screen, menu, cards and the intro screen of each world. Until they arrive the game draws its own stand-ins in the same style.

### MP-G07 · World intro: Bog surface (springtail)

- **File:** `micro/prototypes/assets/game/intro-springtail.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The intro screen of this world, which the select card zooms into; text sits over the left third.
- **Stand-in until delivered:** The world's launcher card, enlarged and blurred.
- **Status:** requested
- **Reference images:**
  - [A swarm of water springtails (Podura aquatica) on a pool surface among algae: colour, scale and habitat.](research/assets/references/springtail-swarm.jpg) · Philippe  Garcelon, CC BY 2.0 · [source](https://commons.wikimedia.org/wiki/File:Podura_aquatica_-_1.jpg)
  - [Round-leaved sundew leaf and glandular tentacles.](research/assets/references/production/sundew.jpg) · Petr Dlouhý, CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:Drosera_rotundifolia_leaf1.jpg)
  - [Scottish Sphagnum bog pool; habitat analogue, not Simmelried documentation.](research/assets/references/production/bog-pool.jpg) · JarroNevsbaru, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_Bog_Pool_Bealach_na_Ba_Viewpoint_1.jpg)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing macro photograph at about 2:1, natural daylight, very shallow depth of field: a blue-black water springtail (Podura aquatica) standing on the dimpled water film of a bog pool, Sphagnum islands and a sundew in soft focus behind. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.
```

### MP-G08 · World intro: Moss canopy (mite)

- **File:** `micro/prototypes/assets/game/intro-mite.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The intro screen of this world, which the select card zooms into; text sits over the left third.
- **Stand-in until delivered:** The world's launcher card, enlarged and blurred.
- **Status:** requested
- **Reference images:**
  - [Unidentified phthiracarid mite; adult arthropod morphology.](research/assets/references/mite.jpg) · S.E. Thorpe, Public domain · [source](https://commons.wikimedia.org/wiki/File:Phthiracarid.jpg)
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [SEM of an animal prepared from the active state; not live in-chamber footage.](research/assets/references/tardigrade-sem.png) · Schokraie E, Warnken U, Hotz-Wagenblatt A, Grohme MA, Hengherr S, et al. (2012), CC BY 2.5 · [source](https://commons.wikimedia.org/wiki/File:SEM_image_of_Milnesium_tardigradum_in_active_state_-_journal.pone.0045682.g001-2.png)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing scanning electron micrograph look, greyscale: a small armoured box mite among towering Sphagnum leaves and fungal hyphae, deep focus. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.
```

### MP-G09 · World intro: Water film (tardigrade)

- **File:** `micro/prototypes/assets/game/intro-tardigrade.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The intro screen of this world, which the select card zooms into; text sits over the left third.
- **Stand-in until delivered:** The world's launcher card, enlarged and blurred.
- **Status:** requested
- **Reference images:**
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [Milnesium tardigradum SEM; alias of the existing atlas reference, not a living light-microscope view.](research/assets/references/tardigrade-sem.png) · Schokraie E, Warnken U, Hotz-Wagenblatt A, Grohme MA, Hengherr S, et al. (2012), CC BY 2.5 · [source](https://commons.wikimedia.org/wiki/File:SEM_image_of_Milnesium_tardigradum_in_active_state_-_journal.pone.0045682.g001-2.png)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing differential interference contrast microscope look: a plump tardigrade gripping the cell walls of a moss leaf under a thin water film, chloroplasts in the cells, a Milnesium as a soft blur in the distance. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.
```

### MP-G10 · World intro: Pool floor (amoeba)

- **File:** `micro/prototypes/assets/game/intro-amoeba.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The intro screen of this world, which the select card zooms into; text sits over the left third.
- **Stand-in until delivered:** The world's launcher card, enlarged and blurred.
- **Status:** requested
- **Reference images:**
  - [Amoeba proteus with pseudopodia, nucleus and contractile vacuole.](research/assets/references/amoeba.jpg) · Cymothoa exigua, CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:Amoeba_proteus.jpg)
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing brightfield microscope look: Amoeba proteus with broad pseudopods curving round a small ciliate on the slide, Spirogyra filaments out of focus behind. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.
```

### MP-G11 · World intro: Hollow pool (Paramecium)

- **File:** `micro/prototypes/assets/game/intro-paramecium.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The intro screen of this world, which the select card zooms into; text sits over the left third.
- **Stand-in until delivered:** The world's launcher card, enlarged and blurred.
- **Status:** requested
- **Reference images:**
  - [Paramecium bursaria in DIC; green symbionts and body proportions.](research/assets/references/production/paramecium-bursaria.jpg) · Anatoly Mikhaltsov, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Paramecium_bursaria.jpg)
  - [Historical morphology drawing of Didinium feeding on Paramecium; anatomy reference, not a photograph or micrograph.](research/assets/references/production/didinium.jpg) · S. O. Mast, Public domain · [source](https://commons.wikimedia.org/wiki/File:Didinium_nasutum_consuming_a_paramecium.jpg)
  - [Attached Vorticella ciliates; stalks connect feeding bodies to substrate.](research/assets/references/vorticella.jpg) · Bwiltz, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Vorticella_1.jpg)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing brightfield microscope look: a green Paramecium bursaria full of Chlorella swimming in a bog pool, a barrel-shaped Didinium approaching, stalked Vorticella in the background. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.
```

### MP-G12 · World intro: Sediment (bacterium)

- **File:** `micro/prototypes/assets/game/intro-bacterium.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The intro screen of this world, which the select card zooms into; text sits over the left third.
- **Stand-in until delivered:** The world's launcher card, enlarged and blurred.
- **Status:** requested
- **Reference images:**
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)
  - [Tagged Pseudomonas biofilm; fluorescence and matrix analogue, not a live/dead-stain image.](research/assets/references/production/biofilm-fluorescence.png) · Schwarz, Michael (ORCID: 0009-0002-1414-3291), CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:NFDI4BIOIMAGE_Calendar_March_2025_-_image_march.png)
  - [Marine seagrass biofilm SEM figure: matrix and surface-reference analogue, not freshwater habitat documentation.](research/assets/references/biofilm-sem.jpg) · Timo Kohn, Rast, P., Kallscheuer, N., Wiegand, S., Boedeker, C., Jetten, M.S., Jeske, O., Vollmers, J., Kaster, A.K., Rohde, M. and Jogler, M., CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Electron_microscopic_analysis_of_seagrass_biofilms.jpg)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing phase-contrast microscope look at 1000x: a magnetotactic spirillum with a chain of magnetosomes among rods and cocci on a biofilm, the edge of a ciliate's mouth looming. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.
```

### MP-G13 · World intro: Host surface (phage)

- **File:** `micro/prototypes/assets/game/intro-phage.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The intro screen of this world, which the select card zooms into; text sits over the left third.
- **Stand-in until delivered:** The world's launcher card, enlarged and blurred.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)
  - [Marine seagrass biofilm SEM figure: matrix and surface-reference analogue, not freshwater habitat documentation.](research/assets/references/biofilm-sem.jpg) · Timo Kohn, Rast, P., Kallscheuer, N., Wiegand, S., Boedeker, C., Jetten, M.S., Jeske, O., Vollmers, J., Kaster, A.K., Rohde, M. and Jogler, M., CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Electron_microscopic_analysis_of_seagrass_biofilms.jpg)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing molecular illustration in the manner of David Goodsell's watercolours: a T4-like bacteriophage landing on the lipopolysaccharide surface of a bacterium, crowded water with small molecules around it. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.
```
