# Micro prototypes: image requests

Artwork for the prototypes in `micro/prototypes/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

0 requested, 18 delivered, 18 in total.

## Launcher cards

One card per prototype on the prototypes page (micro/prototypes/). Until they arrive each card shows a live-drawn thumbnail colour and its title.

### MP-U01 · Mite card (SEM)

- **File:** `micro/prototypes/assets/cards/mite.webp`
- **Size:** 1200 x 800, opaque
- **Used for:** The Mite card on the prototypes page.
- **Stand-in until delivered:** A grey gradient with the title.
- **Status:** delivered
- **Reference images:**
  - [Unidentified phthiracarid mite; adult arthropod morphology.](../research/assets/references/mite.jpg) · S.E. Thorpe, Public domain · [source](https://commons.wikimedia.org/wiki/File:Phthiracarid.jpg)
  - [Moss habitat structure; use leaf architecture as environmental reference.](../research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [SEM of an animal prepared from the active state; not live in-chamber footage.](../research/assets/references/tardigrade-sem.png) · Schokraie E, Warnken U, Hotz-Wagenblatt A, Grohme MA, Hengherr S, et al. (2012), CC BY 2.5 · [source](https://commons.wikimedia.org/wiki/File:SEM_image_of_Milnesium_tardigradum_in_active_state_-_journal.pone.0045682.g001-2.png)
  - Concept board (mood only): [`01-moss-frontier.webp`](../research/assets/concepts/01-moss-frontier.webp)

```text
Landscape key art for a scientific microscopy game prototype, 3:2. Leave the lower third calm and fairly even so a title can sit over it. Scanning-electron-microscope look: greyscale secondary-electron image, bright edges where surfaces tilt away from the detector, soft dark crevices, very deep focus, crisp tactile surface detail, slight fine grain, no colour. An armoured oribatid moss mite (box-mite, family Phthiracaridae: a smooth domed notogaster about 0.6 mm long, eight short jointed legs, a hinged prodorsum, a few stiff setae) walking over a dry moss leaf edge among fungal hyphae and angular mineral grains, three-quarter view from slightly above, the mite in the left half of the frame. Exactly eight legs, each with five visible segments and a single claw. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-U02 · Tardigrade card

- **File:** `micro/prototypes/assets/cards/tardigrade.webp`
- **Size:** 1200 x 800, opaque
- **Used for:** The Tardigrade card on the prototypes page.
- **Stand-in until delivered:** A grey-green gradient with the title.
- **Status:** delivered
- **Reference images:**
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](../research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)
  - [SEM of an animal prepared from the active state; not live in-chamber footage.](../research/assets/references/tardigrade-sem.png) · Schokraie E, Warnken U, Hotz-Wagenblatt A, Grohme MA, Hengherr S, et al. (2012), CC BY 2.5 · [source](https://commons.wikimedia.org/wiki/File:SEM_image_of_Milnesium_tardigradum_in_active_state_-_journal.pone.0045682.g001-2.png)
  - [Moss habitat structure; use leaf architecture as environmental reference.](../research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - Concept board (mood only): [`02-waterfilm.webp`](../research/assets/concepts/02-waterfilm.webp)

```text
Landscape key art for a scientific microscopy game prototype, 3:2. Leave the lower third calm and fairly even so a title can sit over it. Differential-interference-contrast (Nomarski) microscope look: smooth grey background, transparent structures rendered with directional pseudo-relief (light on one side, dark on the other, the same direction everywhere), gentle colourless tones with at most a faint amber cast, shallow depth of field. A moss-dwelling tardigrade (a eutardigrade about 0.35 mm long: plump segmented body, exactly four pairs of stubby unjointed lobopod legs, the fourth pair pointing backwards at the rear end, each leg ending in hooked double claws, a pale translucent body with greenish gut contents and two dark eye-spots) gripping the ridged cell walls of a moss leaf lamina under a thin film of water, the long rectangular leaf cells receding diagonally. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-U03 · Amoeba card

- **File:** `micro/prototypes/assets/cards/amoeba.webp`
- **Size:** 1200 x 800, opaque
- **Used for:** The Amoeba card on the prototypes page.
- **Stand-in until delivered:** A pale warm gradient with the title.
- **Status:** delivered
- **Reference images:**
  - [Amoeba proteus with pseudopodia, nucleus and contractile vacuole.](../research/assets/references/amoeba.jpg) · Cymothoa exigua, CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:Amoeba_proteus.jpg)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](../research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](../research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](../research/assets/concepts/03-protist-garden.webp)

```text
Landscape key art for a scientific microscopy game prototype, 3:2. Leave the lower third calm and fairly even so a title can sit over it. Transmitted-light brightfield microscope look: pale warm-grey to faintly green background, transparent bodies with weak contrast, darker refractive edges, pigment only where it is real (green chloroplasts, brown detritus), soft out-of-focus layers, slight optical softness, no hard drop shadows, no specular highlights. Amoeba proteus about 400 µm across with several broad blunt pseudopods, a clear hyaline cap at each advancing tip, granular streaming endoplasm, one disc-shaped nucleus and a round contractile vacuole, two pseudopods curving to form a food cup around a small green flagellate. A strand of Spirogyra with its spiral chloroplast crosses the background out of focus. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-U04 · Paramecium card

- **File:** `micro/prototypes/assets/cards/paramecium.webp`
- **Size:** 1200 x 800, opaque
- **Used for:** The Paramecium card on the prototypes page.
- **Stand-in until delivered:** A dark blue gradient with the title.
- **Status:** delivered
- **Reference images:**
  - [Paramecium caudatum; whole-cell outline and internal contrast.](../research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](../research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - [Attached Vorticella ciliates; stalks connect feeding bodies to substrate.](../research/assets/references/vorticella.jpg) · Bwiltz, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Vorticella_1.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](../research/assets/concepts/03-protist-garden.webp)

```text
Landscape key art for a scientific microscopy game prototype, 3:2. Leave the lower third calm and fairly even so a title can sit over it. Darkfield microscope look: near-black background, objects visible only as bright scattering edges and internal granules in cool white and pale gold, faint coloured chloroplasts, small particles as sparkling points, shallow depth of field. Paramecium caudatum about 230 µm long, slipper-shaped with a blunt front and a tapered rear, an oral groove running diagonally along one side, a dense coat of short cilia shimmering as a fine bright fringe, two star-shaped contractile vacuoles and many food vacuoles inside, swimming in a gentle helical path past green Spirogyra filaments and a cluster of bell-shaped Vorticella on stalks. A faint motion trail of displaced particles behind it. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

## Mite (SEM)

Textures for the scanning-electron-microscope mite prototype. The moss, grains and mite are geometry built in code; these add surface detail and a far backdrop. Greyscale only.

### MP-M01 · SEM moss leaf surface

- **File:** `micro/prototypes/assets/mite/sem-moss-leaf.webp`
- **Size:** 2048 x 2048, opaque, tileable
- **Used for:** Detail texture on the moss leaf blades the mite walks over.
- **Stand-in until delivered:** Procedural elongated cell pattern with bright cell walls.
- **Status:** delivered
- **Reference images:**
  - [Moss habitat structure; use leaf architecture as environmental reference.](../research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [SEM of an animal prepared from the active state; not live in-chamber footage.](../research/assets/references/tardigrade-sem.png) · Schokraie E, Warnken U, Hotz-Wagenblatt A, Grohme MA, Hengherr S, et al. (2012), CC BY 2.5 · [source](https://commons.wikimedia.org/wiki/File:SEM_image_of_Milnesium_tardigradum_in_active_state_-_journal.pone.0045682.g001-2.png)
  - [Marine seagrass biofilm SEM figure: matrix and surface-reference analogue, not freshwater habitat documentation.](../research/assets/references/biofilm-sem.jpg) · Timo Kohn, Rast, P., Kallscheuer, N., Wiegand, S., Boedeker, C., Jetten, M.S., Jeske, O., Vollmers, J., Kaster, A.K., Rohde, M. and Jogler, M., CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Electron_microscopic_analysis_of_seagrass_biofilms.jpg)
  - Concept board (mood only): [`01-moss-frontier.webp`](../research/assets/concepts/01-moss-frontier.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Scanning-electron-microscope look: greyscale secondary-electron image, bright edges where surfaces tilt away from the detector, soft dark crevices, very deep focus, crisp tactile surface detail, slight fine grain, no colour. The dried surface of a moss leaf (Bryum or Sphagnum-like lamina) at about 300 µm across: long narrow rhomboid cells in parallel rows, each cell slightly sunken with raised cell-wall ridges between them, occasional papillae and a few scattered bacteria and fungal spores. The cell rows run vertically in the image.
```

### MP-M02 · SEM litter and mineral grains

- **File:** `micro/prototypes/assets/mite/sem-litter.webp`
- **Size:** 2048 x 2048, opaque, tileable
- **Used for:** The ground plane between moss stems.
- **Stand-in until delivered:** Procedural grains and noise.
- **Status:** delivered
- **Reference images:**
  - [Marine seagrass biofilm SEM figure: matrix and surface-reference analogue, not freshwater habitat documentation.](../research/assets/references/biofilm-sem.jpg) · Timo Kohn, Rast, P., Kallscheuer, N., Wiegand, S., Boedeker, C., Jetten, M.S., Jeske, O., Vollmers, J., Kaster, A.K., Rohde, M. and Jogler, M., CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Electron_microscopic_analysis_of_seagrass_biofilms.jpg)
  - [Moss habitat structure; use leaf architecture as environmental reference.](../research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - Concept board (mood only): [`01-moss-frontier.webp`](../research/assets/concepts/01-moss-frontier.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Scanning-electron-microscope look: greyscale secondary-electron image, bright edges where surfaces tilt away from the detector, soft dark crevices, very deep focus, crisp tactile surface detail, slight fine grain, no colour. Soil and leaf litter at about 2 mm across: angular quartz and clay mineral grains from 20 to 200 µm, flakes of decomposing leaf with visible cell outlines, a loose net of fungal hyphae 3 to 5 µm thick draped between grains, a few round fungal spores and pollen grains.
```

### MP-M03 · SEM oribatid cuticle

- **File:** `micro/prototypes/assets/mite/sem-cuticle.webp`
- **Size:** 1024 x 1024, opaque, tileable
- **Used for:** Detail texture on the mite's notogaster and leg segments.
- **Stand-in until delivered:** Procedural fine pitting and sockets.
- **Status:** delivered
- **Reference images:**
  - [Unidentified phthiracarid mite; adult arthropod morphology.](../research/assets/references/mite.jpg) · S.E. Thorpe, Public domain · [source](https://commons.wikimedia.org/wiki/File:Phthiracarid.jpg)
  - [SEM of an animal prepared from the active state; not live in-chamber footage.](../research/assets/references/tardigrade-sem.png) · Schokraie E, Warnken U, Hotz-Wagenblatt A, Grohme MA, Hengherr S, et al. (2012), CC BY 2.5 · [source](https://commons.wikimedia.org/wiki/File:SEM_image_of_Milnesium_tardigradum_in_active_state_-_journal.pone.0045682.g001-2.png)
  - Concept board (mood only): [`01-moss-frontier.webp`](../research/assets/concepts/01-moss-frontier.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Scanning-electron-microscope look: greyscale secondary-electron image, bright edges where surfaces tilt away from the detector, soft dark crevices, very deep focus, crisp tactile surface detail, slight fine grain, no colour. The sclerotised cuticle of an oribatid mite's notogaster at about 100 µm across: a smooth gently curved hard surface with fine shallow pits (foveae), a faint cerotegument crust in patches, and a few setal sockets (small raised rings) spaced widely. No whole animal.
```

### MP-M04 · SEM moss forest backdrop

- **File:** `micro/prototypes/assets/mite/sem-backdrop.webp`
- **Size:** 2560 x 1080, opaque
- **Used for:** The far backdrop behind the walkable area, wrapped around the scene.
- **Stand-in until delivered:** Dark gradient with fog.
- **Status:** delivered
- **Reference images:**
  - [Moss habitat structure; use leaf architecture as environmental reference.](../research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [Unidentified phthiracarid mite; adult arthropod morphology.](../research/assets/references/mite.jpg) · S.E. Thorpe, Public domain · [source](https://commons.wikimedia.org/wiki/File:Phthiracarid.jpg)
  - Concept board (mood only): [`01-moss-frontier.webp`](../research/assets/concepts/01-moss-frontier.webp)

```text
Scanning-electron-microscope look: greyscale secondary-electron image, bright edges where surfaces tilt away from the detector, soft dark crevices, very deep focus, crisp tactile surface detail, slight fine grain, no colour. A wide panoramic view at mite height inside a moss cushion, about 5 mm across: overlapping moss leaves and stems rising like a forest, fungal hyphae strung between them, mineral grains on the ground, depth fading to dark grey with distance as in a low-magnification SEM overview. No animals. Even horizon at about one third height so it can wrap around a scene. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

## Tardigrade

Images for the tardigrade climbing prototype, seen through a DIC-style wet mount. The leaf cells are geometry; these textures give them the real surface.

### MP-T01 · Moss lamina cells (DIC)

- **File:** `micro/prototypes/assets/tardigrade/lamina-dic.webp`
- **Size:** 2048 x 2048, opaque, tileable
- **Used for:** Surface of the leaf the tardigrade climbs on.
- **Stand-in until delivered:** Procedural cell walls with directional relief.
- **Status:** delivered
- **Reference images:**
  - [Moss habitat structure; use leaf architecture as environmental reference.](../research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](../research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)
  - Concept board (mood only): [`02-waterfilm.webp`](../research/assets/concepts/02-waterfilm.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Differential-interference-contrast (Nomarski) microscope look: smooth grey background, transparent structures rendered with directional pseudo-relief (light on one side, dark on the other, the same direction everywhere), gentle colourless tones with at most a faint amber cast, shallow depth of field. A single-cell-thick moss leaf lamina at about 400 µm across: long rectangular to rhomboid cells 15 to 25 µm wide and 60 to 120 µm long in parallel rows running vertically, thick bright cell walls, each cell holding a few lens-shaped green chloroplasts pressed against the wall. Faint colour only in the chloroplasts.
```

### MP-T02 · Sphagnum hyaline cells (DIC)

- **File:** `micro/prototypes/assets/tardigrade/sphagnum-dic.webp`
- **Size:** 2048 x 2048, opaque, tileable
- **Used for:** A second leaf type, with big water-holding cells and pores.
- **Stand-in until delivered:** Procedural large cells with fibril bands.
- **Status:** delivered
- **Reference images:**
  - [Moss habitat structure; use leaf architecture as environmental reference.](../research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - Concept board (mood only): [`02-waterfilm.webp`](../research/assets/concepts/02-waterfilm.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Differential-interference-contrast (Nomarski) microscope look: smooth grey background, transparent structures rendered with directional pseudo-relief (light on one side, dark on the other, the same direction everywhere), gentle colourless tones with at most a faint amber cast, shallow depth of field. A Sphagnum leaf at about 400 µm across: large empty hyaline cells with spiral fibril reinforcing bands and round pores, framed by a network of narrow green chlorophyllose cells between them, as in the classic Sphagnum leaf micrograph.
```

### MP-T03 · Water-film backdrop

- **File:** `micro/prototypes/assets/tardigrade/film-backdrop.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** Out-of-focus plate behind the climbing plane.
- **Stand-in until delivered:** Soft gradient with blurred leaf shapes.
- **Status:** delivered
- **Reference images:**
  - [Moss habitat structure; use leaf architecture as environmental reference.](../research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](../research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)
  - [Bdelloid rotifer; compare corona, foot and transparent body.](../research/assets/references/rotifer.jpg) · Juan Carlos Fonseca Mata, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Philodina_sp._(Class%CB%90_Bdelloidea)_-_Phylum_Rotifera.jpg)
  - Concept board (mood only): [`02-waterfilm.webp`](../research/assets/concepts/02-waterfilm.webp)

```text
Differential-interference-contrast (Nomarski) microscope look: smooth grey background, transparent structures rendered with directional pseudo-relief (light on one side, dark on the other, the same direction everywhere), gentle colourless tones with at most a faint amber cast, shallow depth of field. A deeply out-of-focus view through a wet moss cushion at about 2 mm across: overlapping translucent leaf blades with cell rows, curved water menisci between them catching light, a bdelloid rotifer barely visible as a blur. Very shallow depth of field, everything soft. No tardigrade. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-T04 · Detritus and food particles

- **File:** `micro/prototypes/assets/tardigrade/particles.png`
- **Size:** 1024 x 1024, transparent, 4 x 4 sprite grid
- **Used for:** Drifting particles in the water film and food the tardigrade can reach.
- **Stand-in until delivered:** Procedural specks.
- **Status:** delivered
- **Reference images:**
  - [Light-microscope photograph; phone-camera filtering is part of the source image.](../research/assets/references/tardigrade-light.png) · Dorathyexplorer, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:BeautifulTardigrade.png)
  - [Bdelloid rotifer; compare corona, foot and transparent body.](../research/assets/references/rotifer.jpg) · Juan Carlos Fonseca Mata, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Philodina_sp._(Class%CB%90_Bdelloidea)_-_Phylum_Rotifera.jpg)
  - [Euglena gracilis; green pigment and elongated cell silhouette.](../research/assets/references/euglena.jpg) · naturalismus, CC BY-SA 2.0 · [source](https://commons.wikimedia.org/wiki/File:Euglena_gracilis.jpg)
  - Concept board (mood only): [`02-waterfilm.webp`](../research/assets/concepts/02-waterfilm.webp)

```text
Differential-interference-contrast (Nomarski) microscope look: smooth grey background, transparent structures rendered with directional pseudo-relief (light on one side, dark on the other, the same direction everywhere), gentle colourless tones with at most a faint amber cast, shallow depth of field. A 4 by 4 grid of sixteen separate small objects, each centred in its own cell with clear space around it: brown detritus flakes, single green algal cells, a few rod bacteria clumps, a diatom, a pollen grain, a moss leaf fragment, fungal spores. Each object at the same scale, about 10 to 40 µm. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

## Amoeba

Images for the amoeba prototype, seen in brightfield. The amoeba and its prey are soft bodies built in code; these supply the wet-mount background and the granular cytoplasm.

### MP-A01 · Wet-mount background (brightfield)

- **File:** `micro/prototypes/assets/amoeba/wetmount.webp`
- **Size:** 2048 x 2048, opaque, tileable
- **Used for:** The slide the amoeba crawls over.
- **Stand-in until delivered:** Procedural pale field with soft detritus.
- **Status:** delivered
- **Reference images:**
  - [Amoeba proteus with pseudopodia, nucleus and contractile vacuole.](../research/assets/references/amoeba.jpg) · Cymothoa exigua, CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:Amoeba_proteus.jpg)
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](../research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - [Marine Antarctic sea-ice diatoms: morphology reference, not evidence of freshwater co-occurrence.](../research/assets/references/diatoms.jpg) · Prof. Gordon T. Taylor, Stony Brook University, Public domain · [source](https://commons.wikimedia.org/wiki/File:Diatoms_through_the_microscope.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](../research/assets/concepts/03-protist-garden.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Transmitted-light brightfield microscope look: pale warm-grey to faintly green background, transparent bodies with weak contrast, darker refractive edges, pigment only where it is real (green chloroplasts, brown detritus), soft out-of-focus layers, slight optical softness, no hard drop shadows, no specular highlights. A pond-water wet mount at about 1 mm across, seen at the glass: a pale even field with scattered small brown detritus flakes, a few bacteria clumps, empty diatom frustules and out-of-focus specks, sparse enough that most of the image is clear background. No large organisms.
```

### MP-A02 · Amoeba cytoplasm granules

- **File:** `micro/prototypes/assets/amoeba/cytoplasm.webp`
- **Size:** 1024 x 1024, opaque, tileable
- **Used for:** Granular endoplasm texture that streams inside the amoeba.
- **Stand-in until delivered:** Procedural granule noise.
- **Status:** delivered
- **Reference images:**
  - [Amoeba proteus with pseudopodia, nucleus and contractile vacuole.](../research/assets/references/amoeba.jpg) · Cymothoa exigua, CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:Amoeba_proteus.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](../research/assets/concepts/03-protist-garden.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Transmitted-light brightfield microscope look: pale warm-grey to faintly green background, transparent bodies with weak contrast, darker refractive edges, pigment only where it is real (green chloroplasts, brown detritus), soft out-of-focus layers, slight optical softness, no hard drop shadows, no specular highlights. The granular endoplasm of Amoeba proteus at about 80 µm across: densely packed tiny refractile granules and crystals 1 to 3 µm, a few small food vacuoles and lipid droplets, colourless to faint grey-yellow, on a pale field.
```

### MP-A03 · Algal filament backdrop

- **File:** `micro/prototypes/assets/amoeba/filaments.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** Out-of-focus layer above the slide.
- **Stand-in until delivered:** Blurred procedural filaments.
- **Status:** delivered
- **Reference images:**
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](../research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - [Attached Vorticella ciliates; stalks connect feeding bodies to substrate.](../research/assets/references/vorticella.jpg) · Bwiltz, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Vorticella_1.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](../research/assets/concepts/03-protist-garden.webp)

```text
Transmitted-light brightfield microscope look: pale warm-grey to faintly green background, transparent bodies with weak contrast, darker refractive edges, pigment only where it is real (green chloroplasts, brown detritus), soft out-of-focus layers, slight optical softness, no hard drop shadows, no specular highlights. Slightly out-of-focus Spirogyra filaments crossing the field diagonally at about 1.5 mm across, each cell showing its spiral ribbon chloroplast, with a few Vorticella on stalks attached to one filament and loose detritus. Shallow depth of field. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

## Paramecium

Images for the Paramecium swimming prototype, which can switch between darkfield and phase contrast. The cell and its cilia are geometry and shaders; these supply the habitat.

### MP-P01 · Pond habitat plate (darkfield)

- **File:** `micro/prototypes/assets/paramecium/darkfield-plate.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The far background in darkfield mode.
- **Stand-in until delivered:** Black field with procedural scattering specks.
- **Status:** delivered
- **Reference images:**
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](../research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - [Attached Vorticella ciliates; stalks connect feeding bodies to substrate.](../research/assets/references/vorticella.jpg) · Bwiltz, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Vorticella_1.jpg)
  - [Marine Antarctic sea-ice diatoms: morphology reference, not evidence of freshwater co-occurrence.](../research/assets/references/diatoms.jpg) · Prof. Gordon T. Taylor, Stony Brook University, Public domain · [source](https://commons.wikimedia.org/wiki/File:Diatoms_through_the_microscope.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](../research/assets/concepts/03-protist-garden.webp)

```text
Darkfield microscope look: near-black background, objects visible only as bright scattering edges and internal granules in cool white and pale gold, faint coloured chloroplasts, small particles as sparkling points, shallow depth of field. A pond-water scene at about 2 mm across, out of focus: Spirogyra filaments, flakes of detritus and a cluster of stalked Vorticella, all as glowing edges on black. No Paramecium. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-P02 · Pond habitat plate (phase contrast)

- **File:** `micro/prototypes/assets/paramecium/phase-plate.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The far background in phase-contrast mode.
- **Stand-in until delivered:** Mid-grey field with procedural haloed specks.
- **Status:** delivered
- **Reference images:**
  - [Freshwater filament with spiral chloroplasts; useful habitat scaffolding.](../research/assets/references/spirogyra.jpg) · Wiedehopf20, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:The_freshwater_alga_Spirogyra.jpg)
  - [Attached Vorticella ciliates; stalks connect feeding bodies to substrate.](../research/assets/references/vorticella.jpg) · Bwiltz, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Vorticella_1.jpg)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](../research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](../research/assets/concepts/03-protist-garden.webp)

```text
Phase-contrast microscope look: mid-grey background, transparent structures dark with bright halos at their edges, colourless. The same pond-water scene at about 2 mm across, out of focus: Spirogyra filaments, detritus flakes and stalked Vorticella. No Paramecium. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-P03 · Paramecium pellicle

- **File:** `micro/prototypes/assets/paramecium/pellicle.webp`
- **Size:** 1024 x 1024, opaque, tileable
- **Used for:** Surface pattern on the cell body under the cilia.
- **Stand-in until delivered:** Procedural kinety rows.
- **Status:** delivered
- **Reference images:**
  - [Paramecium caudatum; whole-cell outline and internal contrast.](../research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)
  - Concept board (mood only): [`03-protist-garden.webp`](../research/assets/concepts/03-protist-garden.webp)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. The pellicle of Paramecium at about 40 µm across as seen in silver-stained or SEM preparations: a regular lattice of hexagonal to rhomboid alveolar units in long parallel rows (kineties) running vertically, a cilium base at the centre of each unit, faint grey on light grey. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```
