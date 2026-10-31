# Micro prototypes: image requests

Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `design/source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

18 requested, 46 delivered, 64 in total.

## Launcher cards

One card per prototype on the prototypes page (micro/prototypes/), from the springtail on the bog surface down to the bacterium at the limit of the light microscope. Until they arrive each card shows a live-drawn thumbnail colour and its title.

### MP-U07 · Phage card (molecular illustration)

- **File:** `micro/prototypes/assets/cards/phage.webp`
- **Size:** 1200 x 800, opaque
- **Used for:** The Phage card on the prototypes page.
- **Stand-in until delivered:** A teal and amber gradient with the title.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)

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
  - [A swarm of water springtails (Podura aquatica) on a pool surface among algae: colour, scale and habitat.](research/assets/references/springtail-swarm.jpg) · Philippe  Garcelon, CC BY 2.0 · [source](https://commons.wikimedia.org/wiki/File:Podura_aquatica_-_1.jpg)
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)

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
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Tagged Pseudomonas biofilm; fluorescence and matrix analogue, not a live/dead-stain image.](research/assets/references/production/biofilm-fluorescence.png) · Schwarz, Michael (ORCID: 0009-0002-1414-3291), CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:NFDI4BIOIMAGE_Calendar_March_2025_-_image_march.png)

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
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)

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
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)

```text
Molecular-illustration look in the manner of David Goodsell's watercolours: flat, softly outlined shapes with no lighting effects, every protein and nucleic acid drawn at true relative size, crowded as real cytoplasm and water are, a restrained palette (warm pinks and oranges for proteins, purples for nucleic acid, pale yellows and greens for membranes and polysaccharide). Electron microscopes and models show this scale; a light microscope cannot. A horizontal cross-section through a Gram-negative cell envelope about 400 nm wide: from top to bottom, water, the outer membrane with lipopolysaccharide chains and porins, the periplasm with a thin peptidoglycan mesh, the inner membrane with embedded proteins, and crowded cytoplasm with ribosomes and a DNA strand. Layers horizontal and continuous across the image. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

## Round 4: Micro Zoom game UI and world intros

Art for the full game (micro/game/): title screen, menu, cards and the intro screen of each world. Until they arrive the game draws its own stand-ins in the same style.

### MP-G01 · Micro Zoom logo

- **File:** `micro/prototypes/assets/game/logo.png`
- **Size:** 1600 x 640, transparent
- **Used for:** The title screen, the pause menu header and the library card.
- **Stand-in until delivered:** The words MICRO ZOOM set in the game's display font.
- **Status:** requested
- **Reference images:**
  - [A swarm of water springtails (Podura aquatica) on a pool surface among algae: colour, scale and habitat.](research/assets/references/springtail-swarm.jpg) · Philippe  Garcelon, CC BY 2.0 · [source](https://commons.wikimedia.org/wiki/File:Podura_aquatica_-_1.jpg)
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A game title logo: the words "MICRO ZOOM" in capitals, spelled exactly M-I-C-R-O Z-O-O-M, in an elegant engraved serif with brass inlay and a thin ink outline, the O of ZOOM drawn as a microscope objective lens seen end-on with concentric brass rings and a tiny tardigrade silhouette inside. A fine engraved scale rule underlines the words. Wide landscape composition, even margins, no other text, no watermark. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### MP-G02 · Title screen key art

- **File:** `micro/prototypes/assets/game/title.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** Full-screen behind the title (Press Start).
- **Stand-in until delivered:** A slow procedural zoom through the worlds' colours.
- **Status:** requested
- **Reference images:**
  - [A swarm of water springtails (Podura aquatica) on a pool surface among algae: colour, scale and habitat.](research/assets/references/springtail-swarm.jpg) · Philippe  Garcelon, CC BY 2.0 · [source](https://commons.wikimedia.org/wiki/File:Podura_aquatica_-_1.jpg)
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. Key art: a brass microscope's objective lens hangs above a single drop of bog water on a glass slide; inside the drop, nested like a spiral of shrinking worlds, a water springtail on the surface film, a mite among moss leaves, a tardigrade gripping a leaf cell, an amoeba, a green Paramecium, rod bacteria and a tiny bacteriophage at the centre, each painted in its own microscope look (macro photo, electron micrograph, DIC, brightfield, phase contrast, molecular illustration). Warm lamplight, deep green shadows. Keep the upper-middle third calm for the logo and the bottom third quiet for the Press Start line. Full-bleed 16:9, no text.
```

### MP-G03 · Menu background

- **File:** `micro/prototypes/assets/game/menu.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** Behind the world-select cards.
- **Stand-in until delivered:** A dark green-to-ink gradient with a faint engraved grid.
- **Status:** requested
- **Reference images:**
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A naturalist's laboratory bench seen from above, softly out of focus: dark green baize, a brass microscope stage edge, glass slides with hand-written specimen labels, an engraved brass scale rule, a magnifying glass, sepia field notes with ink sketches of mites and tardigrades. The centre is dark and calm so a row of cards can sit over it. Full-bleed 16:9, no legible text.
```

### MP-G04 · Card frame

- **File:** `micro/prototypes/assets/game/card-frame.png`
- **Size:** 1024 x 1400, transparent
- **Used for:** The frame around each world card on the select screen (stretched as a 9-slice).
- **Stand-in until delivered:** A CSS brass border with engraved corner marks.
- **Status:** requested
- **Reference images:**
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. An empty portrait frame for a specimen card: a thin polished brass bezel with engraved corner ornaments and a small vernier scale along the bottom edge, like the mount of a microscope slide; the inside is completely empty and transparent; even line weights so it can be stretched as a nine-slice. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### MP-G05 · Paper panel texture

- **File:** `micro/prototypes/assets/game/paper.webp`
- **Size:** 1024 x 1024, opaque, tileable
- **Used for:** Panels: the intro text, the pause menu, settings and the controls card.
- **Stand-in until delivered:** A flat warm ivory with procedural grain.
- **Status:** requested
- **Reference images:**
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Aged ivory laboratory paper with a fine even fibre texture, a very faint pale-green engraved millimetre grid and the slightest foxing, light and calm so dark text reads on it. No stains in one spot, no text.
```

### MP-G06 · App icon

- **File:** `micro/prototypes/assets/game/icon.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Browser tab and home-screen icon.
- **Stand-in until delivered:** A drawn brass objective ring.
- **Status:** requested
- **Reference images:**
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. An app icon: a brass microscope objective seen end-on, concentric brass and black rings around a glowing round field of view that holds a small plump tardigrade in soft DIC grey-green; on a rounded-square tile of deep ink green. Bold and readable at 48 px. The rounded square fills the frame with transparent corners. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

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
