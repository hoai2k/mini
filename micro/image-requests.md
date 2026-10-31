# Micro prototypes: image requests

Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `design/source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

7 requested, 64 delivered, 71 in total.

## Round 5: boss reference sheets

One boss per world (micro/design/bosses.md). Orthographic modelling sheets, like the earlier reference sheets: the bosses are built in code from them.

### MP-R14 · Pond wolf spider (Pirata), boss of the bog surface

- **File:** `micro/prototypes/assets/reference-sheets/boss-wolf-spider.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling this world's boss.
- **Stand-in until delivered:** None needed: the model is built from the photographs.
- **Status:** requested
- **Reference images:**
  - [Pirata piraticus; direct wolf-spider anatomy reference, not a claim of juvenile size or bog occurrence.](research/assets/references/production/boss-wolf-spider.jpg) · Lukas Jonaitis from Vilnius, Lithuania, CC BY 2.0 · [source](https://commons.wikimedia.org/wiki/File:Flickr_-_Lukjonis_-_Spider_-_Pirata_piraticus.jpg)
  - [A swarm of water springtails (Podura aquatica) on a pool surface among algae: colour, scale and habitat.](research/assets/references/springtail-swarm.jpg) · Philippe  Garcelon, CC BY 2.0 · [source](https://commons.wikimedia.org/wiki/File:Podura_aquatica_-_1.jpg)
  - [Scottish Sphagnum bog pool; habitat analogue, not Simmelried documentation.](research/assets/references/production/bog-pool.jpg) · JarroNevsbaru, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_Bog_Pool_Bealach_na_Ba_Viewpoint_1.jpg)

```text
Orthographic model reference sheet for building a 3D model: the same single individual shown four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front view, and a three-quarter view from front-left and slightly above. All four views at exactly the same scale and aligned to one another, true orthographic projection for the first three (no perspective), even soft studio light from the front, plain flat light-grey background (#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. Natural colours as the organism really looks (for cells, as in a stained or brightfield preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing invented. It serves as a measuring tape and a paint source. A young pond wolf spider (Pirata, family Lycosidae) about 5 mm long, as it stands on the water film of a bog pool: a dark olive-brown carapace with a pale V-shaped mark and a pale band at the sides, eight eyes in three rows (four small in front, two large, two behind), exactly eight hairy legs with dark rings, held wide on the water, chelicerae with fangs, pedipalps. In the three-quarter view show it poised to lunge, front legs raised. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-R15 · Pseudoscorpion, boss of the moss canopy

- **File:** `micro/prototypes/assets/reference-sheets/boss-pseudoscorpion.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling this world's boss.
- **Stand-in until delivered:** None needed: the model is built from the photographs.
- **Status:** requested
- **Reference images:**
  - [Neobisium sylvaticum; separate walking legs and pedipalpal pincers; species-level analogue for the requested Neobisium form.](research/assets/references/production/boss-pseudoscorpion.jpg) · BKoe, CC BY-SA 2.0 · [source](https://commons.wikimedia.org/wiki/File:Neobisium_sylvaticum_03.jpg)
  - [Unidentified phthiracarid mite; adult arthropod morphology.](research/assets/references/mite.jpg) · S.E. Thorpe, Public domain · [source](https://commons.wikimedia.org/wiki/File:Phthiracarid.jpg)
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)

```text
Orthographic model reference sheet for building a 3D model: the same single individual shown four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front view, and a three-quarter view from front-left and slightly above. All four views at exactly the same scale and aligned to one another, true orthographic projection for the first three (no perspective), even soft studio light from the front, plain flat light-grey background (#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. Natural colours as the organism really looks (for cells, as in a stained or brightfield preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing invented. It serves as a measuring tape and a paint source. A moss-dwelling pseudoscorpion (e.g. Neobisium) about 2.5 mm long: a flattened pear-shaped body with a segmented abdomen and no tail or sting, a smooth amber-brown carapace with two or four small eyes, exactly eight slender walking legs, and two very large pedipalps ending in long curved chelae (pincers) with a visible venom tooth at the tip of the movable finger, held forward and open. Chelicerae small at the front. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-R16 · Predatory nematode (Prionchulus), boss of the water film

- **File:** `micro/prototypes/assets/reference-sheets/boss-nematode.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling this world's boss.
- **Stand-in until delivered:** None needed: the model is built from the photographs.
- **Status:** requested
- **Reference images:**
  - [Milnesium tardigradum SEM; alias of the existing atlas reference, not a living light-microscope view.](research/assets/references/tardigrade-sem.png) · Schokraie E, Warnken U, Hotz-Wagenblatt A, Grohme MA, Hengherr S, et al. (2012), CC BY 2.5 · [source](https://commons.wikimedia.org/wiki/File:SEM_image_of_Milnesium_tardigradum_in_active_state_-_journal.pone.0045682.g001-2.png)
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)

```text
Orthographic model reference sheet for building a 3D model: the same single individual shown four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front view, and a three-quarter view from front-left and slightly above. All four views at exactly the same scale and aligned to one another, true orthographic projection for the first three (no perspective), even soft studio light from the front, plain flat light-grey background (#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. Natural colours as the organism really looks (for cells, as in a stained or brightfield preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing invented. It serves as a measuring tape and a paint source. A predatory mononchid nematode (Prionchulus muscorum) about 2 mm long and 60 micrometres thick, transparent and colourless in a differential-interference-contrast look: a long smooth unsegmented worm tapering at both ends, a wide barrel-shaped buccal cavity at the head with one large dorsal tooth, a muscular cylindrical oesophagus, the gut with dark granules; in the three-quarter view the body bent in a strong S-curve as it whips. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-R17 · Giant amoeba (Chaos), boss of the pool floor

- **File:** `micro/prototypes/assets/reference-sheets/boss-chaos.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling this world's boss.
- **Stand-in until delivered:** None needed: the model is built from the photographs.
- **Status:** requested
- **Reference images:**
  - [Chaos amoeba; direct whole-cell morphology reference. Not a calibrated orthographic model.](research/assets/references/production/boss-chaos.jpg) · dr.Tsukii Yuuji, CC BY-SA 2.5 · [source](https://commons.wikimedia.org/wiki/File:Chaos_carolinense.jpg)
  - [Amoeba proteus with pseudopodia, nucleus and contractile vacuole.](research/assets/references/amoeba.jpg) · Cymothoa exigua, CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:Amoeba_proteus.jpg)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)

```text
Orthographic model reference sheet for building a 3D model: the same single individual shown four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front view, and a three-quarter view from front-left and slightly above. All four views at exactly the same scale and aligned to one another, true orthographic projection for the first three (no perspective), even soft studio light from the front, plain flat light-grey background (#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. Natural colours as the organism really looks (for cells, as in a stained or brightfield preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing invented. It serves as a measuring tape and a paint source. The giant amoeba Chaos (Chaos carolinensis), up to 5 mm across, in a brightfield microscope look: a huge flowing cell with many broad blunt pseudopods, granular grey-brown cytoplasm, hundreds of small nuclei (unlike Amoeba proteus, which has one), many food vacuoles with half-digested ciliates inside, a clear hyaline rim at each advancing tip. In the side view show its thickness; in the three-quarter view two pseudopods curving to surround something. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-R18 · Bladderwort trap (Utricularia), boss of the hollow pool

- **File:** `micro/prototypes/assets/reference-sheets/boss-bladderwort.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling this world's boss.
- **Stand-in until delivered:** None needed: the model is built from the photographs.
- **Status:** requested
- **Reference images:**
  - [Utricularia australis bladder trap from an Austrian pond; trap anatomy analogue.](research/assets/references/production/utricularia-bladder.jpg) · Stefan.lefnaer, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Utricularia_australis_sl68.jpg)
  - [Scottish Sphagnum bog pool; habitat analogue, not Simmelried documentation.](research/assets/references/production/bog-pool.jpg) · JarroNevsbaru, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_Bog_Pool_Bealach_na_Ba_Viewpoint_1.jpg)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)

```text
Orthographic model reference sheet for building a 3D model: the same single individual shown four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front view, and a three-quarter view from front-left and slightly above. All four views at exactly the same scale and aligned to one another, true orthographic projection for the first three (no perspective), even soft studio light from the front, plain flat light-grey background (#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. Natural colours as the organism really looks (for cells, as in a stained or brightfield preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing invented. It serves as a measuring tape and a paint source. A single bladder trap of the aquatic bladderwort Utricularia, about 2 mm long, in a brightfield microscope look: a translucent green oval bladder on a short stalk, the trap door at one end fringed with branched antennae and long bristle-like trigger hairs, glands on the door, small captured organisms visible inside. In one view the door closed and the walls drawn in (set); in the three-quarter view the door swinging open with water rushing in. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-R19 · Stentor, boss of the sediment

- **File:** `micro/prototypes/assets/reference-sheets/boss-stentor.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling this world's boss.
- **Stand-in until delivered:** None needed: the model is built from the photographs.
- **Status:** requested
- **Reference images:**
  - [Stentor coeruleus pair; whole-body extension reference to complement the contracted oral-view photo.](research/assets/references/production/boss-stentor-extended.jpg) · Martin Kreutz, CC BY 3.0 nl · [source](https://commons.wikimedia.org/wiki/File:StentorCoeruleus.jpg)
  - [Stentor coeruleus in a contracted oral view; pigment and oral-field reference.](research/assets/references/production/boss-stentor.png) · Algae17, CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Stentor_coeruleus.png)
  - [Marine seagrass biofilm SEM figure: matrix and surface-reference analogue, not freshwater habitat documentation.](research/assets/references/biofilm-sem.jpg) · Timo Kohn, Rast, P., Kallscheuer, N., Wiegand, S., Boedeker, C., Jetten, M.S., Jeske, O., Vollmers, J., Kaster, A.K., Rohde, M. and Jogler, M., CC BY-SA 4.0 · [source](https://commons.wikimedia.org/wiki/File:Electron_microscopic_analysis_of_seagrass_biofilms.jpg)
  - [Paramecium caudatum; whole-cell outline and internal contrast.](research/assets/references/paramecium.jpg) · MTadey, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Param%C3%A9cium_caud%C3%A1tum.jpg)

```text
Orthographic model reference sheet for building a 3D model: the same single individual shown four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front view, and a three-quarter view from front-left and slightly above. All four views at exactly the same scale and aligned to one another, true orthographic projection for the first three (no perspective), even soft studio light from the front, plain flat light-grey background (#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. Natural colours as the organism really looks (for cells, as in a stained or brightfield preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing invented. It serves as a measuring tape and a paint source. The giant trumpet-shaped ciliate Stentor coeruleus, about 1-2 mm when extended, in a phase-contrast and natural-colour look: a blue-green trumpet attached by a narrow foot, a broad flat oral disc at the top ringed by a spiral of long membranelles (cilia) that whirl a feeding vortex, longitudinal blue pigment stripes along the body, a bead-like chain macronucleus inside. In the three-quarter view show the vortex of particles being drawn into the mouth. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```

### MP-R20 · CRISPR-Cas complex, boss inside the host

- **File:** `micro/prototypes/assets/reference-sheets/boss-cas.webp`
- **Size:** 2048 x 2048, opaque
- **Used for:** Modelling this world's boss.
- **Stand-in until delivered:** None needed: the model is built from the photographs.
- **Status:** requested
- **Reference images:**
  - [Goodsell molecular illustration of Cascade with nucleic acid, based on PDB 4UN3; colour is explanatory, not naturally visible.](research/assets/references/production/boss-cascade.jpg) · David Goodsell, CC BY 3.0 · [source](https://commons.wikimedia.org/wiki/File:181-CascadeAndCRISPR_4un3.tiff)
  - [CRISPR-associated protein molecular illustrations; supporting shape reference, not a four-view atomic reconstruction.](research/assets/references/production/boss-cas-proteins.jpg) · David Goodsell, CC BY 3.0 · [source](https://commons.wikimedia.org/wiki/File:181-CascadeAndCRISPR_CasProteins.tiff)
  - [T4 phage electron micrograph; head, sheath and tail-fibre reference.](research/assets/references/production/phage-t4.jpg) · 7USSR7, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:T4_phage_EM.jpg)
  - [Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.](research/assets/references/production/magnetotactic.png) · Caulobacter subvibrioides (Diskussion), CC BY-SA 3.0 · [source](https://commons.wikimedia.org/wiki/File:M._gryphiswaldense.png)

```text
Orthographic model reference sheet for building a 3D model: the same single individual shown four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front view, and a three-quarter view from front-left and slightly above. All four views at exactly the same scale and aligned to one another, true orthographic projection for the first three (no perspective), even soft studio light from the front, plain flat light-grey background (#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. Natural colours as the organism really looks (for cells, as in a stained or brightfield preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing invented. It serves as a measuring tape and a paint source. A molecular illustration in the manner of David Goodsell of a type I CRISPR-Cas surveillance complex (Cascade) with its guide RNA, bound along a stretch of DNA double helix, and a Cas3 nuclease-helicase beside it ready to chop the DNA: soft watercolour shapes, the Cascade as a curved seahorse-like backbone of protein subunits around a bright RNA strand, the DNA as a twisted ladder. Show the complex from the side, from above, from the end and in three-quarter view. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```
