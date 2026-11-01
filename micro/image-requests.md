# Micro prototypes: image requests

Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `design/source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

10 requested, 71 delivered, 81 in total.

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

## Phage (molecular illustration)

Images for the phage world (Level 6): no light microscope can see a phage, so the level is an illustration grounded in cryo-EM shapes. Since the revamp (November 2026) its default look is an illustrative molecular scene in false light (micro/prototypes/phage/LOOK.md): dense bead-cluster molecules with ambient occlusion, thin silhouettes and colour by molecule type. The phage, hosts and molecules are built in code; these give surfaces, the backdrop in every direction, look-development sheets, the new humic-floc obstacle, and an updated card and intro plate. Everything open here has a procedural stand-in (the card and intro keep the current art until delivered).

### MP-V04 · Molecule species sheet (look development)

- **File:** `micro/prototypes/assets/reference-sheets/phage-molecules.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Look development for the revamped phage world: sets the shape, size and colour of each kind of molecule in the water and on the host (the bead-cluster templates and palette in shared/techniques/phage-beads.js). Not drawn in the game.
- **Stand-in until delivered:** None needed: the templates and palette are built in code from the species list in phage/LOOK.md.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Goodsell molecular illustration of Cascade with nucleic acid, based on PDB 4UN3; colour is explanatory, not naturally visible.](research/assets/references/production/boss-cascade.jpg) · David Goodsell, CC BY 3.0 · [source](https://commons.wikimedia.org/wiki/File:181-CascadeAndCRISPR_4un3.tiff)
  - [CRISPR-associated protein molecular illustrations; supporting shape reference, not a four-view atomic reconstruction.](research/assets/references/production/boss-cas-proteins.jpg) · David Goodsell, CC BY 3.0 · [source](https://commons.wikimedia.org/wiki/File:181-CascadeAndCRISPR_CasProteins.tiff)

```text
Illustrative molecular look, as in modern molecular visualisation (mesoscale cellPACK-style scenes, PDB-101 art, ambient-occlusion molecular renderers): every molecule a lumpy cluster of small spheres at true relative size, packed densely with small molecules filling every gap, soft ambient occlusion darkening the creases between them, a thin dark silhouette edge, colour by molecule type (proteins in violet-blues, teals and soft greens, nucleic acid gold, membranes teal-blue, polysaccharide pale blue-white), lit by an invented warm key light from the upper left and a teal fill, with depth fading into a teal-blue haze. Organic and irregular, never smooth plastic or geometric primitives. A visual hypothesis: no microscope shows colour or light at this scale. A look-development reference sheet on a plain dark teal background (#0E2F38): a 4 by 3 grid of single molecules, each centred in its cell, all at the same scale, each in its own colour: a large globular protein (about 10 nm, violet-blue), a small globular protein (about 4 nm, teal), a protein dimer (soft green), a ribosome-sized complex (about 20 nm, blue-violet with a darker cleft), a humic colloid (an irregular brown-olive tangle about 15 nm), a short polysaccharide chain (pale blue-white beads), a glucose cluster and single ions (tiny pale beads), a lipopolysaccharide chain standing upright (a gold-green core with a pale branching O-antigen), an OmpC porin trimer seen from above (three blue lobes round a dark triangular pore), a gold three-lobed receptor protein on a beaded stalk, and a violet two-lobed non-matching protein. Every molecule drawn as a cluster of small spheres with soft contact shadows. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-V05 · Host envelope surface (false light, tileable)

- **File:** `micro/prototypes/assets/phage/envelope-fl.webp`
- **Size:** 2048 x 2048, opaque, tileable
- **Used for:** The revamped hosts' wet outer membrane: its albedo and relief under the bead forest of LPS and proteins (replaces MP-V01's grain in the default look).
- **Stand-in until delivered:** Procedural wet relief (world-space noise bump and cavity darkening) under a bead forest of LPS and proteins.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Tagged Pseudomonas biofilm; fluorescence and matrix analogue, not a live/dead-stain image.](research/assets/references/production/biofilm-fluorescence.png) · Schwarz, Michael (ORCID: 0009-0002-1414-3291), CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:NFDI4BIOIMAGE_Calendar_March_2025_-_image_march.png)

```text
Seamlessly tileable square texture: the left edge continues into the right edge and the top into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; viewed straight down onto the surface. Illustrative molecular look, as in modern molecular visualisation (mesoscale cellPACK-style scenes, PDB-101 art, ambient-occlusion molecular renderers): every molecule a lumpy cluster of small spheres at true relative size, packed densely with small molecules filling every gap, soft ambient occlusion darkening the creases between them, a thin dark silhouette edge, colour by molecule type (proteins in violet-blues, teals and soft greens, nucleic acid gold, membranes teal-blue, polysaccharide pale blue-white), lit by an invented warm key light from the upper left and a teal fill, with depth fading into a teal-blue haze. Organic and irregular, never smooth plastic or geometric primitives. A visual hypothesis: no microscope shows colour or light at this scale. The outer membrane of a Gram-negative bacterium seen from straight above at about 150 nm across: a wet, lumpy teal-blue lipid surface packed with the bases of lipopolysaccharide chains (small pale-blue bead tufts), the rounded triangular tops of OmpC porin trimers in deeper blue, and a few larger violet-blue membrane proteins, with soft ambient occlusion in the creases. Evenly lit, no single dominant feature, no cast shadows across the tile. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-V06 · Deep water panorama (every direction)

- **File:** `micro/prototypes/assets/phage/water-panorama.webp`
- **Size:** 4096 x 2048, opaque, equirectangular, wraps left to right
- **Used for:** The far backdrop of the revamped phage world, sampled by view direction so the water is full wherever the camera turns (no up or down). Replaces MP-V02's flat plate in the default look.
- **Stand-in until delivered:** A procedural backdrop drawn by view direction in the final pass, behind a bath of thousands of molecules and a shell of far cells in every direction.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Tagged Pseudomonas biofilm; fluorescence and matrix analogue, not a live/dead-stain image.](research/assets/references/production/biofilm-fluorescence.png) · Schwarz, Michael (ORCID: 0009-0002-1414-3291), CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:NFDI4BIOIMAGE_Calendar_March_2025_-_image_march.png)

```text
Illustrative molecular look, as in modern molecular visualisation (mesoscale cellPACK-style scenes, PDB-101 art, ambient-occlusion molecular renderers): every molecule a lumpy cluster of small spheres at true relative size, packed densely with small molecules filling every gap, soft ambient occlusion darkening the creases between them, a thin dark silhouette edge, colour by molecule type (proteins in violet-blues, teals and soft greens, nucleic acid gold, membranes teal-blue, polysaccharide pale blue-white), lit by an invented warm key light from the upper left and a teal fill, with depth fading into a teal-blue haze. Organic and irregular, never smooth plastic or geometric primitives. A visual hypothesis: no microscope shows colour or light at this scale. An equirectangular 360-degree panorama (2:1, the left edge continuing seamlessly into the right edge, no visible seam, the top and bottom rows smoothly converging as at the poles of a sphere) of deep bog water seen from inside it at about 3 µm across: a dim teal-blue haze crowded with countless out-of-focus molecules as soft bead clusters, and a few far rod-shaped bacteria (about 1 µm long, translucent teal-blue, coated with a fuzz of surface proteins) hanging at different depths in every direction. No single light source in the frame, no surface, no ground, no up or down: it should look equally full whichever way you face. Soft, low contrast, so the near scene reads in front of it. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-V07 · Far molecule sprite sheet

- **File:** `micro/prototypes/assets/phage/molecule-sprites.webp`
- **Size:** 2048 x 2048, transparent (or #FF00FF background)
- **Used for:** Optional far layer: the most distant molecules of the phage world as soft camera-facing sprites (the near ones stay 3D bead clusters).
- **Stand-in until delivered:** Procedural bead-cluster impostors drawn in the shader (the same shader the near molecules use).
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Goodsell molecular illustration of Cascade with nucleic acid, based on PDB 4UN3; colour is explanatory, not naturally visible.](research/assets/references/production/boss-cascade.jpg) · David Goodsell, CC BY 3.0 · [source](https://commons.wikimedia.org/wiki/File:181-CascadeAndCRISPR_4un3.tiff)

```text
Illustrative molecular look, as in modern molecular visualisation (mesoscale cellPACK-style scenes, PDB-101 art, ambient-occlusion molecular renderers): every molecule a lumpy cluster of small spheres at true relative size, packed densely with small molecules filling every gap, soft ambient occlusion darkening the creases between them, a thin dark silhouette edge, colour by molecule type (proteins in violet-blues, teals and soft greens, nucleic acid gold, membranes teal-blue, polysaccharide pale blue-white), lit by an invented warm key light from the upper left and a teal fill, with depth fading into a teal-blue haze. Organic and irregular, never smooth plastic or geometric primitives. A visual hypothesis: no microscope shows colour or light at this scale. A 4 by 4 sprite sheet of single molecules, each centred in its square cell with clear space round it on a flat #FF00FF background: soft-focus, slightly blurred bead clusters of varied shape and size (globular proteins, dimers, small chains, irregular humic tangles, tiny ion clusters), in violet-blue, teal, soft green, pale blue-white and olive, each with soft self-shadowing and a faint dark rim, all lit from the upper left. No cell edges, no text. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-R21 · Humic floc (a new obstacle)

- **File:** `micro/prototypes/assets/reference-sheets/humic-floc.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling the humic flocs of the revamped phage world: drifting sticky tangles of humic matter that snag extended tail fibres (fold them with B to slip through).
- **Stand-in until delivered:** Procedural flocs: tangled bead chains with clumps, built in code.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Scottish Sphagnum bog pool; habitat analogue, not Simmelried documentation.](research/assets/references/production/bog-pool.jpg) · JarroNevsbaru, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_Bog_Pool_Bealach_na_Ba_Viewpoint_1.jpg)

```text
Orthographic model reference sheet for building a 3D model: the same single individual shown four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front view, and a three-quarter view from front-left and slightly above. All four views at exactly the same scale and aligned to one another, true orthographic projection for the first three (no perspective), even soft studio light from the front, plain flat light-grey background (#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. Natural colours as the organism really looks (for cells, as in a stained or brightfield preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing invented. It serves as a measuring tape and a paint source. Illustrative molecular look, as in modern molecular visualisation (mesoscale cellPACK-style scenes, PDB-101 art, ambient-occlusion molecular renderers): every molecule a lumpy cluster of small spheres at true relative size, packed densely with small molecules filling every gap, soft ambient occlusion darkening the creases between them, a thin dark silhouette edge, colour by molecule type (proteins in violet-blues, teals and soft greens, nucleic acid gold, membranes teal-blue, polysaccharide pale blue-white), lit by an invented warm key light from the upper left and a teal fill, with depth fading into a teal-blue haze. Organic and irregular, never smooth plastic or geometric primitives. A visual hypothesis: no microscope shows colour or light at this scale. A humic aggregate (floc) from tea-brown bog water, about 0.3 µm across: a loose, irregular, sponge-like tangle of branching humic and fulvic chains (beaded strands a few nanometres thick, olive-brown to amber) knotted round a few denser clumps, with small molecules and a couple of bound mineral flakes caught in it; open gaps between the strands. Shown from four sides on a plain dark teal background (#0E2F38) instead of grey. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-R22 · Host bacterium in the new look

- **File:** `micro/prototypes/assets/reference-sheets/phage-host.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling and colouring the revamped host cells (Host A and B, Gram-negative rods) and, for contrast, the wrong host (a Gram-positive rod) of the phage world.
- **Stand-in until delivered:** None needed: the hosts are built in code (capsule body, wet relief, bead forest).
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)
  - [Tagged Pseudomonas biofilm; fluorescence and matrix analogue, not a live/dead-stain image.](research/assets/references/production/biofilm-fluorescence.png) · Schwarz, Michael (ORCID: 0009-0002-1414-3291), CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:NFDI4BIOIMAGE_Calendar_March_2025_-_image_march.png)

```text
Orthographic model reference sheet for building a 3D model: the same single individual shown four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front view, and a three-quarter view from front-left and slightly above. All four views at exactly the same scale and aligned to one another, true orthographic projection for the first three (no perspective), even soft studio light from the front, plain flat light-grey background (#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. Natural colours as the organism really looks (for cells, as in a stained or brightfield preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing invented. It serves as a measuring tape and a paint source. Illustrative molecular look, as in modern molecular visualisation (mesoscale cellPACK-style scenes, PDB-101 art, ambient-occlusion molecular renderers): every molecule a lumpy cluster of small spheres at true relative size, packed densely with small molecules filling every gap, soft ambient occlusion darkening the creases between them, a thin dark silhouette edge, colour by molecule type (proteins in violet-blues, teals and soft greens, nucleic acid gold, membranes teal-blue, polysaccharide pale blue-white), lit by an invented warm key light from the upper left and a teal fill, with depth fading into a teal-blue haze. Organic and irregular, never smooth plastic or geometric primitives. A visual hypothesis: no microscope shows colour or light at this scale. A Gram-negative rod-shaped bacterium about 1.5 µm long and 0.7 µm wide, seen at the scale of its surface: a wet, lumpy, translucent teal-blue outer membrane densely coated with a short fuzz of lipopolysaccharide chains (pale blue bead tufts) and studded with blue OmpC porin trimers and a few gold three-lobed receptor proteins on beaded stalks, two or three of them in small patches. In the lower right corner of the sheet, smaller, the same views of a Gram-positive rod for contrast: a thicker, smoother, duller olive-green wall with no outer membrane and no porins. On a plain dark teal background (#0E2F38) instead of grey. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-U09 · Phage card (the new look)

- **File:** `micro/prototypes/assets/cards/phage.webp`
- **Size:** 1200 x 800, opaque
- **Used for:** The Phage card in Micro Zoom's world select and on the prototypes page. Replaces MP-U07's file in place: until it is delivered, the card shows MP-U07 (the old watercolour card).
- **Stand-in until delivered:** MP-U07, the current card.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)
  - [Tagged Pseudomonas biofilm; fluorescence and matrix analogue, not a live/dead-stain image.](research/assets/references/production/biofilm-fluorescence.png) · Schwarz, Michael (ORCID: 0009-0002-1414-3291), CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:NFDI4BIOIMAGE_Calendar_March_2025_-_image_march.png)

```text
Landscape key art for a scientific microscopy game prototype, 3:2. Leave the lower third calm and fairly even so a title can sit over it. Illustrative molecular look, as in modern molecular visualisation (mesoscale cellPACK-style scenes, PDB-101 art, ambient-occlusion molecular renderers): every molecule a lumpy cluster of small spheres at true relative size, packed densely with small molecules filling every gap, soft ambient occlusion darkening the creases between them, a thin dark silhouette edge, colour by molecule type (proteins in violet-blues, teals and soft greens, nucleic acid gold, membranes teal-blue, polysaccharide pale blue-white), lit by an invented warm key light from the upper left and a teal fill, with depth fading into a teal-blue haze. Organic and irregular, never smooth plastic or geometric primitives. A visual hypothesis: no microscope shows colour or light at this scale. A single T4-like bacteriophage glowing warm gold (a prolate faceted icosahedral head about 120 by 86 nm with a glassy capsid and the DNA spool glowing inside, a straight ridged contractile tail sheath, a hexagonal baseplate, six long thin kinked tail fibres reaching forward) drifting legs-first toward the curved, wet, teal-blue outer membrane of a rod-shaped bacterium, its surface densely furred with lipopolysaccharide chains and studded with blue porin trimers and a gold three-lobed receptor; the water around it packed with small molecules in violet-blue, teal and soft green, with tiny molecules filling every gap; further cells hanging in the teal haze. A small molecule visibly glancing off the phage's head. Large depth of field: the phage, the receptor and the nearby molecules all readable. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-G14 · World intro: Host surface (phage), the new look

- **File:** `micro/prototypes/assets/game/intro-phage.webp`
- **Size:** 2560 x 1440, opaque
- **Used for:** The phage world's intro screen, which the select card zooms into; text sits over the left third. Replaces MP-G13's file in place: until it is delivered, the intro shows MP-G13.
- **Stand-in until delivered:** MP-G13, the current intro plate.
- **Status:** requested
- **Reference images:**
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)
  - [Marine seagrass biofilm SEM figure: matrix and surface-reference analogue, not freshwater habitat documentation.](research/assets/references/biofilm-sem.jpg) · Timo Kohn, Rast, P., Kallscheuer, N., Wiegand, S., Boedeker, C., Jetten, M.S., Jeske, O., Vollmers, J., Kaster, A.K., Rohde, M. and Jogler, M., CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Electron_microscopic_analysis_of_seagrass_biofilms.jpg)

```text
Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry. A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim). Inside the circle, the illustrative molecular look: Illustrative molecular look, as in modern molecular visualisation (mesoscale cellPACK-style scenes, PDB-101 art, ambient-occlusion molecular renderers): every molecule a lumpy cluster of small spheres at true relative size, packed densely with small molecules filling every gap, soft ambient occlusion darkening the creases between them, a thin dark silhouette edge, colour by molecule type (proteins in violet-blues, teals and soft greens, nucleic acid gold, membranes teal-blue, polysaccharide pale blue-white), lit by an invented warm key light from the upper left and a teal fill, with depth fading into a teal-blue haze. Organic and irregular, never smooth plastic or geometric primitives. A visual hypothesis: no microscope shows colour or light at this scale. A glowing gold T4-like bacteriophage (faceted head, ridged sheath, six kinked tail fibres) drifting legs-first through water packed with molecules toward a gold three-lobed receptor on the furred, wet, teal-blue surface of a rod bacterium, more cells hanging in the teal haze behind. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.
```
