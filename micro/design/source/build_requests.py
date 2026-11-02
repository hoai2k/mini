#!/usr/bin/env python3
"""Generate the Micro prototypes' image requests and their asset list.

Edit the data in this file, then run:

    python3 micro/design/source/build_requests.py          # write
    python3 micro/design/source/build_requests.py --check  # verify up to date

Outputs:
    micro/image-requests.md                 the open requests (status `requested`)
    micro/image-requests-history.md         every delivered request, for the record
    micro/prototypes/shared/asset-list.js   what the prototypes load

Statuses:
    requested  the prototype draws its own procedural stand-in and does not
               try to load the file
    delivered  the file is in micro/prototypes/assets/ and the prototype loads
               it in place of (or on top of) the stand-in

The creatures themselves are built in code from measured anatomy, so these
images are textures, background plates and launcher cards, never the bodies.
Every request names the reference photographs it should be checked against:
the research atlas's credited images in micro/research/assets/references/ and
its AI concept boards in micro/research/assets/concepts/ (mood only, never
anatomy).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # micro/
DOC = ROOT / "image-requests.md"
HISTORY = ROOT / "image-requests-history.md"
ASSET_LIST = ROOT / "prototypes" / "shared" / "asset-list.js"
MANIFEST = ROOT / "research" / "assets" / "references" / "manifest.json"

# Shared honesty clause: the atlas's rule that art is a visual hypothesis.
SCIENCE = (
    "Scientifically grounded: match real microscopy of the named organisms and habitat, "
    "with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing "
    "magic, no text, no labels, no scale bars, no watermark, no UI."
)

SEM = (
    "Scanning-electron-microscope look: greyscale secondary-electron image, bright edges where "
    "surfaces tilt away from the detector, soft dark crevices, very deep focus, crisp tactile "
    "surface detail, slight fine grain, no colour."
)

BRIGHTFIELD = (
    "Transmitted-light brightfield microscope look: pale warm-grey to faintly green background, "
    "transparent bodies with weak contrast, darker refractive edges, pigment only where it is "
    "real (green chloroplasts, brown detritus), soft out-of-focus layers, slight optical "
    "softness, no hard drop shadows, no specular highlights."
)

DIC = (
    "Differential-interference-contrast (Nomarski) microscope look: smooth grey background, "
    "transparent structures rendered with directional pseudo-relief (light on one side, dark on "
    "the other, the same direction everywhere), gentle colourless tones with at most a faint "
    "amber cast, shallow depth of field."
)

DARKFIELD = (
    "Darkfield microscope look: near-black background, objects visible only as bright "
    "scattering edges and internal granules in cool white and pale gold, faint coloured "
    "chloroplasts, small particles as sparkling points, shallow depth of field."
)

TILE = (
    "Seamlessly tileable square texture: the left edge continues into the right edge and the top "
    "into the bottom, evenly lit with no vignette, no single dominant feature, no perspective; "
    "viewed straight down onto the surface."
)

CARD = (
    "Landscape key art for a scientific microscopy game prototype, 3:2. Leave the lower third "
    "calm and fairly even so a title can sit over it."
)

MACRO = (
    "Macro-photography look: a real photograph through a macro lens at 2 to 5 times life size, "
    "natural overcast daylight, real colours, very shallow depth of field with creamy out-of-focus "
    "areas, fine water droplets and surface tension visible where they are real, no studio "
    "flash glare, no HDR, no colour grading."
)

PHASE = (
    "Phase-contrast microscope look at 1000x oil immersion: mid-grey background, transparent "
    "cells dark with thin bright halos at their edges, colourless, slight optical softness at the "
    "limit of resolution (nothing sharper than about 0.2 µm), very shallow depth of field."
)

FLUOR = (
    "Epifluorescence microscope look: black background, structures visible only where they are "
    "stained, glowing in one or two saturated stain colours (green as for SYTO 9, red as for "
    "propidium iodide or chlorophyll autofluorescence), soft glow and slight out-of-focus haze, "
    "no white light."
)

MOLECULAR = (
    "Molecular-illustration look in the manner of David Goodsell's watercolours: flat, softly "
    "outlined shapes with no lighting effects, every protein and nucleic acid drawn at true "
    "relative size, crowded as real cytoplasm and water are, a restrained palette (warm pinks and "
    "oranges for proteins, purples for nucleic acid, pale yellows and greens for membranes and "
    "polysaccharide). Electron microscopes and models show this scale; a light microscope cannot."
)

TURNAROUND = (
    "Orthographic model reference sheet for building a 3D model: the same single individual shown "
    "four times on one sheet in a 2 by 2 grid: side view facing right, top view (head up), front "
    "view, and a three-quarter view from front-left and slightly above. All four views at exactly "
    "the same scale and aligned to one another, true orthographic projection for the first three "
    "(no perspective), even soft studio light from the front, plain flat light-grey background "
    "(#D9D9D9), no shadows on the background, no text, no labels, no arrows, no scale bar. "
    "Natural colours as the organism really looks (for cells, as in a stained or brightfield "
    "preparation, transparent parts drawn as pale translucent). Correct anatomy only; nothing "
    "invented. It serves as a measuring tape and a paint source."
)


# The phage world's look since the revamp (2 November 2026): the false-light
# references in micro/design/generated/phage-false-light/ rendered as an
# illustrative molecular scene (micro/prototypes/phage/LOOK.md).
MOLECULAR_FL = (
    "Illustrative molecular look, as in modern molecular visualisation (mesoscale cellPACK-style "
    "scenes, PDB-101 art, ambient-occlusion molecular renderers): every molecule a lumpy cluster "
    "of small spheres at true relative size, packed densely with small molecules filling every "
    "gap, soft ambient occlusion darkening the creases between them, a thin dark silhouette edge, "
    "colour by molecule type (proteins in violet-blues, teals and soft greens, nucleic acid gold, "
    "membranes teal-blue, polysaccharide pale blue-white), lit by an invented warm key light from "
    "the upper left and a teal fill, with depth fading into a teal-blue haze. Organic and "
    "irregular, never smooth plastic or geometric primitives. A visual hypothesis: no microscope "
    "shows colour or light at this scale."
)


GAMEUI = (
    "Visual style for the game Micro Zoom: a Victorian natural-history laboratory seen through clean modern "
    "editorial design. Brass microscope fittings, engraved scale rules and vernier marks, aged ivory paper, "
    "specimen-slide labels, copperplate details, deep ink green, oxblood and brass accents, soft natural light. "
    "Scientific and a little steampunk, never technological: no screens, no holograms, no neon, no circuitry."
)


def ref(*ids: str) -> list[str]:
    return list(ids)


# Each prototype groups its images. `refs` are research-atlas reference ids
# (micro/research/assets/references/manifest.json) and `concepts` are concept
# board files (micro/research/assets/concepts/).
GROUPS = [
    {
        "title": "Launcher cards",
        "intro": "One card per prototype on the prototypes page (micro/prototypes/), from the springtail on the bog surface down to the bacterium at the limit of the light microscope. Until they arrive each card shows a live-drawn thumbnail colour and its title.",
        "items": [
            {
                "id": "MP-U01", "status": "delivered", "name": "Mite card (SEM)",
                "file": "assets/cards/mite.webp", "size": "1200 x 800, opaque",
                "used": "The Mite card on the prototypes page.",
                "standin": "A grey gradient with the title.",
                "refs": ref("mite", "moss", "tardigrade-sem"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{CARD} {SEM} An armoured oribatid moss mite (box-mite, family Phthiracaridae: a smooth domed notogaster about 0.6 mm long, eight short jointed legs, a hinged prodorsum, a few stiff setae) walking over a dry moss leaf edge among fungal hyphae and angular mineral grains, three-quarter view from slightly above, the mite in the left half of the frame. Exactly eight legs, each with five visible segments and a single claw. {SCIENCE}",
            },
            {
                "id": "MP-U02", "status": "delivered", "name": "Tardigrade card",
                "file": "assets/cards/tardigrade.webp", "size": "1200 x 800, opaque",
                "used": "The Tardigrade card on the prototypes page.",
                "standin": "A grey-green gradient with the title.",
                "refs": ref("tardigrade-light", "tardigrade-sem", "moss"), "concepts": ["02-waterfilm.webp"],
                "prompt": f"{CARD} {DIC} A moss-dwelling tardigrade (a eutardigrade about 0.35 mm long: plump segmented body, exactly four pairs of stubby unjointed lobopod legs, the fourth pair pointing backwards at the rear end, each leg ending in hooked double claws, a pale translucent body with greenish gut contents and two dark eye-spots) gripping the ridged cell walls of a moss leaf lamina under a thin film of water, the long rectangular leaf cells receding diagonally. {SCIENCE}",
            },
            {
                "id": "MP-U03", "status": "delivered", "name": "Amoeba card",
                "file": "assets/cards/amoeba.webp", "size": "1200 x 800, opaque",
                "used": "The Amoeba card on the prototypes page.",
                "standin": "A pale warm gradient with the title.",
                "refs": ref("amoeba", "paramecium", "spirogyra"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{CARD} {BRIGHTFIELD} Amoeba proteus about 400 µm across with several broad blunt pseudopods, a clear hyaline cap at each advancing tip, granular streaming endoplasm, one disc-shaped nucleus and a round contractile vacuole, two pseudopods curving to form a food cup around a small green flagellate. A strand of Spirogyra with its spiral chloroplast crosses the background out of focus. {SCIENCE}",
            },
            {
                "id": "MP-U04", "status": "delivered", "name": "Paramecium card",
                "file": "assets/cards/paramecium.webp", "size": "1200 x 800, opaque",
                "used": "The Paramecium card on the prototypes page.",
                "standin": "A dark blue gradient with the title.",
                "refs": ref("paramecium", "spirogyra", "vorticella"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{CARD} {DARKFIELD} Paramecium caudatum about 230 µm long, slipper-shaped with a blunt front and a tapered rear, an oral groove running diagonally along one side, a dense coat of short cilia shimmering as a fine bright fringe, two star-shaped contractile vacuoles and many food vacuoles inside, swimming in a gentle helical path past green Spirogyra filaments and a cluster of bell-shaped Vorticella on stalks. A faint motion trail of displaced particles behind it. {SCIENCE}",
            },
            {
                "id": "MP-U05", "status": "delivered", "name": "Springtail card (macro photography)",
                "file": "assets/cards/springtail.webp", "size": "1200 x 800, opaque",
                "used": "The Springtail card on the prototypes page.",
                "standin": "A moss-green gradient with the title.",
                "refs": ref("springtail", "bog-pool", "sundew", "moss"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{CARD} {MACRO} A water springtail, Podura aquatica, about 1.5 mm long, standing on the bare surface film of a Sphagnum bog pool: a plump blue-black to slate-grey granular body, short four-segmented antennae, six short legs whose claws dimple but do not break the water surface, the forked springing organ (furcula) folded forward under the abdomen and held by its catch, the stubby ventral tube (collophore) touching the film. Its reflection and the dimples under its feet are visible. Sphagnum capitula and a red sundew leaf blur softly at the pool edge behind. Exactly six legs, no wings. {SCIENCE}",
            },
            {
                "id": "MP-U06", "status": "delivered", "name": "Bacterium card (phase contrast)",
                "file": "assets/cards/bacterium.webp", "size": "1200 x 800, opaque",
                "used": "The Bacterium card on the prototypes page.",
                "standin": "A dark slate gradient with the title.",
                "refs": ref("magnetotactic", "bdellovibrio", "biofilm-fluorescence", "biofilm-sem"), "concepts": ["04-cell-neighborhood.webp"],
                "prompt": f"{CARD} {PHASE} A field of bog-sediment bacteria at 1000x, about 40 µm across: short rods and curved vibrios 1 to 3 µm long, a few swimming with faint motion blur, one curved magnetotactic spirillum near the centre slightly sharper than the rest, loose clumps of cells in a faint matrix, and at one edge the out-of-focus curved margin of a much larger ciliate looming as a soft dark wall with a blurred fringe of cilia. No cell drawn with more detail than the optics allow. {SCIENCE}",
            },
            {
                "id": "MP-U07", "status": "delivered", "name": "Phage card (molecular illustration)",
                "file": "assets/cards/phage.webp", "size": "1200 x 800, opaque",
                "used": "The Phage card on the prototypes page.",
                "standin": "A teal and amber gradient with the title.",
                "refs": ref("phage-t4", "magnetotactic"),
                "prompt": f"{CARD} {MOLECULAR} A single T4-like bacteriophage (prolate icosahedral head about 120 by 86 nm, a straight contractile tail sheath, a hexagonal baseplate, six long kinked tail fibres) drifting just above the curved outer membrane of a rod-shaped bacterium, its long fibres reaching down towards lipopolysaccharide chains and outer-membrane proteins on the surface; water crowded with small molecules around it. {SCIENCE}",
            },
            {
                "id": "MP-U08", "status": "delivered", "name": "Zoom transitions card",
                "file": "assets/cards/zoom.webp", "size": "1200 x 800, opaque",
                "used": "The Zoom transitions card on the prototypes page.",
                "standin": "A radial gradient with the title.",
                "refs": ref("springtail-swarm", "moss", "tardigrade-light", "paramecium"),
                "prompt": f"{CARD} A single continuous image that zooms into itself: on the left a macro photograph of a blue-black water springtail on a bog pool beside Sphagnum moss; a nested series of thin white rectangular frames leads inward from it, each frame showing the next, smaller world in its own microscope look: a moss leaf with a tardigrade in DIC, then a green Paramecium in brightfield, then rod bacteria in phase contrast at the centre. Clean, elegant, scientifically grounded, no text, no labels, no scale bars, no fantasy creatures.",
            },
        ],
    },
    {
        "title": "Mite (SEM)",
        "intro": "Textures for the scanning-electron-microscope mite prototype. The moss, grains and mite are geometry built in code; these add surface detail and a far backdrop. Greyscale only.",
        "items": [
            {
                "id": "MP-M01", "status": "delivered", "name": "SEM moss leaf surface",
                "file": "assets/mite/sem-moss-leaf.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "Detail texture on the moss leaf blades the mite walks over.",
                "standin": "Procedural elongated cell pattern with bright cell walls.",
                "refs": ref("moss", "tardigrade-sem", "biofilm-sem"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{TILE} {SEM} The dried surface of a moss leaf (Bryum or Sphagnum-like lamina) at about 300 µm across: long narrow rhomboid cells in parallel rows, each cell slightly sunken with raised cell-wall ridges between them, occasional papillae and a few scattered bacteria and fungal spores. The cell rows run vertically in the image.",
            },
            {
                "id": "MP-M02", "status": "delivered", "name": "SEM litter and mineral grains",
                "file": "assets/mite/sem-litter.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The ground plane between moss stems.",
                "standin": "Procedural grains and noise.",
                "refs": ref("biofilm-sem", "moss"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{TILE} {SEM} Soil and leaf litter at about 2 mm across: angular quartz and clay mineral grains from 20 to 200 µm, flakes of decomposing leaf with visible cell outlines, a loose net of fungal hyphae 3 to 5 µm thick draped between grains, a few round fungal spores and pollen grains.",
            },
            {
                "id": "MP-M03", "status": "delivered", "name": "SEM oribatid cuticle",
                "file": "assets/mite/sem-cuticle.webp", "size": "1024 x 1024, opaque, tileable",
                "used": "Detail texture on the mite's notogaster and leg segments.",
                "standin": "Procedural fine pitting and sockets.",
                "refs": ref("mite", "tardigrade-sem"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{TILE} {SEM} The sclerotised cuticle of an oribatid mite's notogaster at about 100 µm across: a smooth gently curved hard surface with fine shallow pits (foveae), a faint cerotegument crust in patches, and a few setal sockets (small raised rings) spaced widely. No whole animal.",
            },
            {
                "id": "MP-M04", "status": "delivered", "name": "SEM moss forest backdrop",
                "file": "assets/mite/sem-backdrop.webp", "size": "2560 x 1080, opaque",
                "used": "The far backdrop behind the walkable area, wrapped around the scene.",
                "standin": "Dark gradient with fog.",
                "refs": ref("moss", "mite"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{SEM} A wide panoramic view at mite height inside a moss cushion, about 5 mm across: overlapping moss leaves and stems rising like a forest, fungal hyphae strung between them, mineral grains on the ground, depth fading to dark grey with distance as in a low-magnification SEM overview. No animals. Even horizon at about one third height so it can wrap around a scene. {SCIENCE}",
            },
        ],
    },
    {
        "title": "Tardigrade",
        "intro": "Images for the tardigrade climbing prototype, seen through a DIC-style wet mount. The leaf cells are geometry; these textures give them the real surface.",
        "items": [
            {
                "id": "MP-T01", "status": "delivered", "name": "Moss lamina cells (DIC)",
                "file": "assets/tardigrade/lamina-dic.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "Surface of the leaf the tardigrade climbs on.",
                "standin": "Procedural cell walls with directional relief.",
                "refs": ref("moss", "tardigrade-light"), "concepts": ["02-waterfilm.webp"],
                "prompt": f"{TILE} {DIC} A single-cell-thick moss leaf lamina at about 400 µm across: long rectangular to rhomboid cells 15 to 25 µm wide and 60 to 120 µm long in parallel rows running vertically, thick bright cell walls, each cell holding a few lens-shaped green chloroplasts pressed against the wall. Faint colour only in the chloroplasts.",
            },
            {
                "id": "MP-T02", "status": "delivered", "name": "Sphagnum hyaline cells (DIC)",
                "file": "assets/tardigrade/sphagnum-dic.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "A second leaf type, with big water-holding cells and pores.",
                "standin": "Procedural large cells with fibril bands.",
                "refs": ref("moss"), "concepts": ["02-waterfilm.webp"],
                "prompt": f"{TILE} {DIC} A Sphagnum leaf at about 400 µm across: large empty hyaline cells with spiral fibril reinforcing bands and round pores, framed by a network of narrow green chlorophyllose cells between them, as in the classic Sphagnum leaf micrograph.",
            },
            {
                "id": "MP-T03", "status": "delivered", "name": "Water-film backdrop",
                "file": "assets/tardigrade/film-backdrop.webp", "size": "2560 x 1440, opaque",
                "used": "Out-of-focus plate behind the climbing plane.",
                "standin": "Soft gradient with blurred leaf shapes.",
                "refs": ref("moss", "tardigrade-light", "rotifer"), "concepts": ["02-waterfilm.webp"],
                "prompt": f"{DIC} A deeply out-of-focus view through a wet moss cushion at about 2 mm across: overlapping translucent leaf blades with cell rows, curved water menisci between them catching light, a bdelloid rotifer barely visible as a blur. Very shallow depth of field, everything soft. No tardigrade. {SCIENCE}",
            },
            {
                "id": "MP-T04", "status": "delivered", "name": "Detritus and food particles",
                "file": "assets/tardigrade/particles.png", "size": "1024 x 1024, transparent, 4 x 4 sprite grid",
                "used": "Drifting particles in the water film and food the tardigrade can reach.",
                "standin": "Procedural specks.",
                "refs": ref("tardigrade-light", "rotifer", "euglena"), "concepts": ["02-waterfilm.webp"],
                "prompt": f"{DIC} A 4 by 4 grid of sixteen separate small objects, each centred in its own cell with clear space around it: brown detritus flakes, single green algal cells, a few rod bacteria clumps, a diatom, a pollen grain, a moss leaf fragment, fungal spores. Each object at the same scale, about 10 to 40 µm. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. {SCIENCE}",
            },
        ],
    },
    {
        "title": "Amoeba",
        "intro": "Images for the amoeba prototype, seen in brightfield. The amoeba and its prey are soft bodies built in code; these supply the wet-mount background and the granular cytoplasm.",
        "items": [
            {
                "id": "MP-A01", "status": "delivered", "name": "Wet-mount background (brightfield)",
                "file": "assets/amoeba/wetmount.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The slide the amoeba crawls over.",
                "standin": "Procedural pale field with soft detritus.",
                "refs": ref("amoeba", "spirogyra", "diatoms"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{TILE} {BRIGHTFIELD} A pond-water wet mount at about 1 mm across, seen at the glass: a pale even field with scattered small brown detritus flakes, a few bacteria clumps, empty diatom frustules and out-of-focus specks, sparse enough that most of the image is clear background. No large organisms.",
            },
            {
                "id": "MP-A02", "status": "delivered", "name": "Amoeba cytoplasm granules",
                "file": "assets/amoeba/cytoplasm.webp", "size": "1024 x 1024, opaque, tileable",
                "used": "Granular endoplasm texture that streams inside the amoeba.",
                "standin": "Procedural granule noise.",
                "refs": ref("amoeba"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{TILE} {BRIGHTFIELD} The granular endoplasm of Amoeba proteus at about 80 µm across: densely packed tiny refractile granules and crystals 1 to 3 µm, a few small food vacuoles and lipid droplets, colourless to faint grey-yellow, on a pale field.",
            },
            {
                "id": "MP-A03", "status": "delivered", "name": "Algal filament backdrop",
                "file": "assets/amoeba/filaments.webp", "size": "2560 x 1440, opaque",
                "used": "Out-of-focus layer above the slide.",
                "standin": "Blurred procedural filaments.",
                "refs": ref("spirogyra", "vorticella"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{BRIGHTFIELD} Slightly out-of-focus Spirogyra filaments crossing the field diagonally at about 1.5 mm across, each cell showing its spiral ribbon chloroplast, with a few Vorticella on stalks attached to one filament and loose detritus. Shallow depth of field. {SCIENCE}",
            },
        ],
    },
    {
        "title": "Paramecium",
        "intro": "Images for the Paramecium swimming prototype, which can switch between darkfield and phase contrast. The cell and its cilia are geometry and shaders; these supply the habitat.",
        "items": [
            {
                "id": "MP-P01", "status": "delivered", "name": "Pond habitat plate (darkfield)",
                "file": "assets/paramecium/darkfield-plate.webp", "size": "2560 x 1440, opaque",
                "used": "The far background in darkfield mode.",
                "standin": "Black field with procedural scattering specks.",
                "refs": ref("spirogyra", "vorticella", "diatoms"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{DARKFIELD} A pond-water scene at about 2 mm across, out of focus: Spirogyra filaments, flakes of detritus and a cluster of stalked Vorticella, all as glowing edges on black. No Paramecium. {SCIENCE}",
            },
            {
                "id": "MP-P02", "status": "delivered", "name": "Pond habitat plate (phase contrast)",
                "file": "assets/paramecium/phase-plate.webp", "size": "2560 x 1440, opaque",
                "used": "The far background in phase-contrast mode.",
                "standin": "Mid-grey field with procedural haloed specks.",
                "refs": ref("spirogyra", "vorticella", "paramecium"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"Phase-contrast microscope look: mid-grey background, transparent structures dark with bright halos at their edges, colourless. The same pond-water scene at about 2 mm across, out of focus: Spirogyra filaments, detritus flakes and stalked Vorticella. No Paramecium. {SCIENCE}",
            },
            {
                "id": "MP-P03", "status": "delivered", "name": "Paramecium pellicle",
                "file": "assets/paramecium/pellicle.webp", "size": "1024 x 1024, opaque, tileable",
                "used": "Surface pattern on the cell body under the cilia.",
                "standin": "Procedural kinety rows.",
                "refs": ref("paramecium"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{TILE} The pellicle of Paramecium at about 40 µm across as seen in silver-stained or SEM preparations: a regular lattice of hexagonal to rhomboid alveolar units in long parallel rows (kineties) running vertically, a cilium base at the centre of each unit, faint grey on light grey. {SCIENCE}",
            },
            {
                "id": "MP-P04", "status": "delivered", "name": "Pond habitat tile (darkfield, seamless)",
                "file": "assets/paramecium/darkfield-tile.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The far background in darkfield mode (the default look again), repeated as the view moves. MP-P01 is not seamless, so its edges show as straight dark seams across the screen as you swim.",
                "standin": "MP-P01, with its seams.",
                "refs": ref("spirogyra", "vorticella", "diatoms"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{TILE} {DARKFIELD} Pond water at about 2 mm across, out of focus, seen through the water rather than onto a surface: Spirogyra filaments crossing at different angles and depths (each continuing across the edges), loose golden flocs of detritus, scattered pennate diatoms and two or three small clusters of stalked Vorticella, spread evenly so no one corner draws the eye. Mostly dark background between them. No Paramecium. {SCIENCE}",
            },
            {
                "id": "MP-P05", "status": "delivered", "name": "Pond habitat tile (phase contrast, seamless)",
                "file": "assets/paramecium/phase-tile.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The far background in phase-contrast mode, repeated as the view moves (MP-P02 is not seamless).",
                "standin": "MP-P02, with its seams.",
                "refs": ref("spirogyra", "vorticella", "paramecium"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{TILE} Phase-contrast microscope look: mid-grey background, transparent structures dark with bright halos at their edges, colourless. The same pond water at about 2 mm across, out of focus: Spirogyra filaments continuing across the edges, detritus flocs, diatoms and a few small clusters of stalked Vorticella, spread evenly. No Paramecium. {SCIENCE}",
            },
            {
                "id": "MP-P06", "status": "delivered", "name": "Paramecium bursaria, darkfield, top down (body sprite)",
                "file": "assets/paramecium/bursaria-darkfield.webp", "size": "1024 x 512, transparent (#FF00FF background), the cell's long axis horizontal, front to the right",
                "used": "The 2D slide (2026-11-02 redesign): the inside of the player's cell, drawn under its procedural outline, beating cilia fringe, granules and contractile vacuoles, tinted per player's Chlorella shade. The card art (MP-U04) is the target look.",
                "standin": "Procedural: a faint fill, about 150 Chlorella dots, golden granules, the macronucleus and two star-shaped contractile vacuoles.",
                "refs": ref("paramecium-bursaria", "paramecium"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{DARKFIELD} Seen straight down, one Paramecium bursaria about 120 µm long filling the frame, its long axis horizontal with the front to the right: a broad slipper shape with a blunt rounded rear, the oral groove running diagonally from the front edge to the mouth at mid-length on the lower side. A thin luminous pellicle outline in cool white, the inside nearly black but packed with round green Chlorella (3 to 5 µm) and scattered pale-gold granules, a pale oval macronucleus in the middle and two star-shaped contractile vacuoles with radiating canals, one near each end. Draw the cilia only as a very faint short fringe (the game draws its own beating cilia). Flat #FF00FF background outside the cell. {SCIENCE}",
            },
            {
                "id": "MP-P07", "status": "delivered", "name": "Hunters of the pond drop in darkfield (reference sheet)",
                "file": "assets/reference-sheets/paramecium-hunters-darkfield.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling the 2D slide's enemies as the card shows its creatures (luminous outlines, golden granules on black): Didinium, Dileptus, Amoeba proteus and the bladderwort trap, each seen straight down.",
                "standin": "Procedural outlines built from the brightfield sheets (MP-R06 Didinium, MP-R17 Chaos, MP-R18 bladderwort) and anatomy.",
                "refs": ref("didinium", "amoeba", "boss-bladderwort", "paramecium"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{DARKFIELD} A reference sheet on black with four pond-water organisms, each seen straight down and labelled only by position (no text), at true relative size: Didinium nasutum (about 100 µm, a barrel with a short cone proboscis and two girdles of cilia), Dileptus (about 350 µm, a flask-shaped ciliate drawn out into a long flexible trunk with a row of toxicysts, a bead-chain macronucleus), Amoeba proteus (about 500 µm across, a flowing cell with blunt pseudopods, a granular interior glittering gold, a bright clear rim at each advancing tip, a disc nucleus and food vacuoles), and a bladderwort trap (Utricularia, about 1 mm, a translucent green sac with an oval door, branched antennae with bristles and short trigger hairs). Thin luminous outlines in cool white, granules in pale gold, chloroplasts faintly green. {SCIENCE}",
            },
            {
                "id": "MP-P08", "status": "delivered", "name": "World intro plate: the pond drop in darkfield (2D slide)",
                "file": "assets/game/intro-paramecium-darkfield.webp", "size": "2560 x 1440, opaque",
                "used": "A replacement for the Hollow Pool intro plate (MP-G11, a brightfield 3D scene) to match the 2D darkfield slide the world now is and its card (MP-U04); the shell switches to it once delivered.",
                "standin": "MP-G11.",
                "refs": ref("paramecium-bursaria", "spirogyra", "vorticella", "diatoms"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"A wide intro plate for a microscopy game, framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with an engraved brass rim), showing a darkfield microscope look seen straight down onto a slide: a green Paramecium bursaria with a bright fringe of cilia and golden granules inside, crossing near-black water between green Spirogyra filaments with spiral chloroplast ribbons, a few bell-shaped Vorticella on coiled stalks, golden-brown detritus clumps, pennate diatoms and fine glittering specks; a barrel-shaped Didinium approaching from one side. Lush, crisp, high contrast. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.",
            },
        ],
    },
    {
        "title": "Springtail (macro photography)",
        "intro": "Images for the springtail prototype (Level 0, the bog surface), seen as a macro photograph in daylight. The springtail, its enemies and the water surface are geometry and shaders built in code; these supply the surface texture, the moss lawn, the far backdrop and the sundew. Real colours, shallow focus.",
        "items": [
            {
                "id": "MP-S01", "status": "delivered", "name": "Bog pool water surface",
                "file": "assets/springtail/water-surface.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The surface film the springtail walks and jumps on.",
                "standin": "Procedural dark water with drifting specks.",
                "refs": ref("bog-pool", "springtail", "water-strider"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{TILE} {MACRO} The still, tea-brown surface of a small Sphagnum bog pool at about 15 mm across, seen from directly above in soft overcast light: dark peaty water, a faint grey sky reflection, scattered floating debris (yellow pine and birch pollen grains as fine dust, tiny brown leaf fragments, a few single Sphagnum leaves, a shed springtail skin), a thin patchy surface film catching the light. Everything at the same focus. No animals, no ripples from a single source.",
            },
            {
                "id": "MP-S02", "status": "delivered", "name": "Sphagnum lawn from above",
                "file": "assets/springtail/sphagnum-lawn.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The moss lawn around the pool, the springtail's dry ground.",
                "standin": "Procedural green star clusters.",
                "refs": ref("bog-hummock", "moss", "bog-pool"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{TILE} {MACRO} A Sphagnum bog lawn seen from directly above at about 40 mm across: densely packed capitula (the star-shaped heads of the moss shoots, each 5 to 10 mm across, with short curved branches in tight rosettes), mixing green and wine-red Sphagnum species, with water droplets caught between the branches and a few dead brown leaves of sedge lying across them. Even focus across the frame. No animals, no flowers.",
            },
            {
                "id": "MP-S03", "status": "delivered", "name": "Bog backdrop plate",
                "file": "assets/springtail/bog-backdrop.webp", "size": "2560 x 1080, opaque",
                "used": "The far backdrop, wrapped around the scene at springtail height.",
                "standin": "Soft green-brown gradient with blurred shapes.",
                "refs": ref("bog-hummock", "bog-pool", "sundew"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{MACRO} A wide panoramic view taken from a lens resting on the water at the edge of a Sphagnum bog pool, at the eye height of a 1.5 mm springtail: the pool surface stretching away as a bright reflective plane, the far edge a wall of Sphagnum hummocks, cotton-grass and sundew rosettes, all heavily out of focus into soft shapes of green, wine red and straw, a pale grey sky above. Horizon at about one third height so it can wrap around a scene. No animals. {SCIENCE}",
            },
            {
                "id": "MP-S04", "status": "delivered", "name": "Sundew leaf plate",
                "file": "assets/springtail/sundew-leaf.png", "size": "1536 x 1536, transparent",
                "used": "The sundew leaf hazard: sticky tentacles that hold the springtail.",
                "standin": "Procedural red stalks with clear droplets.",
                "refs": ref("sundew", "springtail"),
                "prompt": f"{MACRO} One round-leaved sundew leaf (Drosera rotundifolia) seen from directly above, isolated: a round green-to-red blade about 8 mm across on a narrow petiole pointing down, covered with about 200 red glandular tentacles, short ones in the centre and long ones at the margin, each tipped with a clear glistening droplet of sticky mucilage; a few marginal tentacles bending inward. No insect on it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. {SCIENCE}",
            },
            {
                "id": "MP-S05", "status": "delivered", "name": "Raindrop and ripple sprites",
                "file": "assets/springtail/ripples.png", "size": "2048 x 2048, transparent, 4 x 4 sprite grid",
                "used": "Raindrop impacts and the ripples they send across the pool surface.",
                "standin": "Procedural expanding rings.",
                "refs": ref("bog-pool"),
                "prompt": f"{MACRO} A 4 by 4 grid of sixteen frames, each centred in its own cell with clear space around it, showing one raindrop hitting still dark water from directly above in sequence: the falling drop, the crater, the crown splash, the rebound jet, then expanding concentric ripple rings that grow and fade. Same scale in every frame, the drop about 3 mm across. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. {SCIENCE}",
            },
            {
                "id": "MP-S06", "status": "delivered", "name": "Bog pondweed floating leaf plate",
                "file": "assets/springtail/pondweed-leaf.png", "size": "1536 x 768, transparent",
                "used": "The floating leaves of bog pondweed that grow thick round each portal raft (the wolf spiders' hunting grounds) and only here and there elsewhere: a sign that the way on is a few seconds off. Mapped onto each leaf from above.",
                "standin": "Procedural smooth, glossy fresh-green leaves with a soft yellow-green rim, a pale midrib and parallel veins, some faintly flushed red.",
                "refs": ref("bog-pool", "moss"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{MACRO} One floating leaf of bog pondweed (Potamogeton polygonifolius) seen from directly above, isolated, its long axis left to right filling the frame: a smooth, leathery elliptic blade about 30 mm long and 12 mm wide with a blunt tip, fresh mid green with a soft yellow-green margin and only a faint reddish flush near the base, a glossy waxy surface with a soft sheen and no water droplets, a pale midrib and fine curved parallel veins running tip to base, the short stalk at the left edge. It must read as a calm, harmless floating leaf, nothing like a sundew: no hairs, no tentacles, no glistening drops, no red rim. Even soft daylight, the whole leaf in focus. No insect on it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. {SCIENCE}",
            },
        ],
    },
    {
        "title": "Bacterium (phase contrast and fluorescence)",
        "intro": "Images for the run-and-tumble bacterium prototype (Level 5), at 1000x oil immersion, the limit of the light microscope. The bacterium and its enemies are built in code; these supply the sediment background, the biofilm, a looming grazer and a fluorescence texture. Nothing here may show more detail than the optics can resolve.",
        "items": [
            {
                "id": "MP-B01", "status": "delivered", "name": "Bog-sediment bacteria (phase contrast)",
                "file": "assets/bacterium/sediment-phase.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The far background: the sediment field the bacterium swims over.",
                "standin": "Procedural grey field with haloed rods.",
                "refs": ref("magnetotactic", "bdellovibrio", "biofilm-sem"), "concepts": ["04-cell-neighborhood.webp"],
                "prompt": f"{TILE} {PHASE} Bog-pool sediment at 1000x, about 60 µm across: scattered bacteria (short rods, cocci, curved vibrios and a few spirilla, 0.5 to 3 µm long), small mineral and humic particles 1 to 5 µm with bright halos, a few empty diatom frustule fragments, mostly clear grey background between them. No large organisms.",
            },
            {
                "id": "MP-B02", "status": "delivered", "name": "Biofilm surface",
                "file": "assets/bacterium/biofilm.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The biofilm floor: dense cells in matrix, with channels between clusters.",
                "standin": "Procedural cell clusters on a dark field.",
                "refs": ref("biofilm-fluorescence", "biofilm-sem"), "concepts": ["04-cell-neighborhood.webp"],
                "prompt": f"{TILE} {FLUOR} A freshwater bacterial biofilm seen from above at about 50 µm across, stained as in a live/dead assay: mushroom-shaped and mound-shaped microcolonies of densely packed rod cells glowing green, a few red dead cells, darker water channels winding between the clusters, a faint haze of extracellular matrix. Cells about 1 to 2 µm, packed but individually just discernible.",
            },
            {
                "id": "MP-B03", "status": "delivered", "name": "Grazer's oral region (looming ciliate)",
                "file": "assets/bacterium/grazer-mouth.webp", "size": "2560 x 1440, opaque",
                "used": "The looming threat: a ciliate's feeding current and mouth filling the frame.",
                "standin": "A dark procedural wall with a beating fringe.",
                "refs": ref("paramecium", "paramecium-bursaria", "vorticella"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{PHASE} The oral region of a bacteria-eating ciliate (Paramecium-like) seen at bacterial scale, about 40 µm across: the curved funnel of the oral groove and buccal cavity filling the right two-thirds of the frame as a soft dark wall, rows of beating cilia along its rim blurred by motion, a stream of small rod bacteria and particles being drawn in along curved paths, a forming food vacuole deep inside as a pale round shape. The ciliate itself is too large to be in focus everywhere. {SCIENCE}",
            },
            {
                "id": "MP-B04", "status": "delivered", "name": "Magnetosome chain (fluorescence texture)",
                "file": "assets/bacterium/magnetosomes.webp", "size": "1024 x 1024, opaque, tileable",
                "used": "Texture inside the magnetotactic bacterium's body and on its compass display.",
                "standin": "Procedural dotted chain.",
                "refs": ref("magnetotactic"),
                "prompt": f"{TILE} {FLUOR} Magnetosome chains of magnetotactic bacteria at about 10 µm across, as seen when the magnetosome membrane protein is tagged with a green fluorescent protein: several thin straight-to-slightly-curved lines of tightly spaced glowing dots (each dot a crystal of magnetite about 50 nm, blurred to the 0.2 µm limit so the dots merge into beaded lines), each chain about 1 to 2 µm long, all roughly parallel to one another, with faint diffuse cell-body glow around each.",
            },
        ],
    },
    {
        "title": "Phage (molecular illustration)",
        "intro": "Images for the phage world (Level 6): no light microscope can see a phage, so the level is an illustration grounded in cryo-EM shapes. Since the revamp (November 2026) its default look is an illustrative molecular scene in false light (micro/prototypes/phage/LOOK.md): dense bead-cluster molecules with ambient occlusion, thin silhouettes and colour by molecule type. The phage, hosts and molecules are built in code; these give surfaces, the backdrop in every direction, look-development sheets, the new humic-floc obstacle, and an updated card and intro plate. Everything open here has a procedural stand-in (the card and intro keep the current art until delivered).",
        "items": [
            {
                "id": "MP-V01", "status": "delivered", "name": "Outer membrane surface (top view)",
                "file": "assets/phage/envelope.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The host cell's surface the phage lands on and walks across.",
                "standin": "Procedural lipopolysaccharide brush and protein dots.",
                "refs": ref("phage-t4", "biofilm-fluorescence"),
                "prompt": f"{TILE} {MOLECULAR} The outer surface of a Gram-negative bacterium seen from above at about 200 nm across: a dense lawn of lipopolysaccharide chains like a soft brush, with the trimeric pores of outer-membrane proteins (porins such as OmpC) scattered through it as rounded triangular clusters, and a few longer O-antigen chains. Muted, warm, evenly lit. {SCIENCE}",
            },
            {
                "id": "MP-V02", "status": "delivered", "name": "Crowded water (backdrop)",
                "file": "assets/phage/water.webp", "size": "2560 x 1440, opaque",
                "used": "The far backdrop of the water the phage drifts through.",
                "standin": "A soft gradient with procedural molecule dots.",
                "refs": ref("phage-t4"),
                "prompt": f"{MOLECULAR} Water crowded with small dissolved molecules and a few humic particles seen at about 1 µm across, softly out of focus, with depth fading into a pale blue-green haze; no cells and no phages, an even, calm backdrop. {SCIENCE}",
            },
            {
                "id": "MP-V03", "status": "delivered", "name": "Envelope cross-section",
                "file": "assets/phage/envelope-section.webp", "size": "2560 x 1080, opaque",
                "used": "The cutaway shown when the tail tube pierces the envelope and the DNA enters.",
                "standin": "Procedural layered bands.",
                "refs": ref("phage-t4", "magnetotactic"),
                "prompt": f"{MOLECULAR} A horizontal cross-section through a Gram-negative cell envelope about 400 nm wide: from top to bottom, water, the outer membrane with lipopolysaccharide chains and porins, the periplasm with a thin peptidoglycan mesh, the inner membrane with embedded proteins, and crowded cytoplasm with ribosomes and a DNA strand. Layers horizontal and continuous across the image. {SCIENCE}",
            },
            {
                "id": "MP-V04", "status": "delivered", "name": "Molecule species sheet (look development)",
                "file": "assets/reference-sheets/phage-molecules.webp", "size": "2048 x 2048, opaque",
                "used": "Look development for the revamped phage world: sets the shape, size and colour of each kind of molecule in the water and on the host (the bead-cluster templates and palette in shared/techniques/phage-beads.js). Not drawn in the game.",
                "standin": "None needed: the templates and palette are built in code from the species list in phage/LOOK.md.",
                "refs": ref("phage-t4", "boss-cascade", "boss-cas-proteins"),
                "prompt": f"{MOLECULAR_FL} A look-development reference sheet on a plain dark teal background (#0E2F38): a 4 by 3 grid of single molecules, each centred in its cell, all at the same scale, each in its own colour: a large globular protein (about 10 nm, violet-blue), a small globular protein (about 4 nm, teal), a protein dimer (soft green), a ribosome-sized complex (about 20 nm, blue-violet with a darker cleft), a humic colloid (an irregular brown-olive tangle about 15 nm), a short polysaccharide chain (pale blue-white beads), a glucose cluster and single ions (tiny pale beads), a lipopolysaccharide chain standing upright (a gold-green core with a pale branching O-antigen), an OmpC porin trimer seen from above (three blue lobes round a dark triangular pore), a gold three-lobed receptor protein on a beaded stalk, and a violet two-lobed non-matching protein. Every molecule drawn as a cluster of small spheres with soft contact shadows. {SCIENCE}",
            },
            {
                "id": "MP-V05", "status": "delivered", "name": "Host envelope surface (false light, tileable)",
                "file": "assets/phage/envelope-fl.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The revamped hosts' wet outer membrane: its albedo and relief under the bead forest of LPS and proteins (replaces MP-V01's grain in the default look).",
                "standin": "Procedural wet relief (world-space noise bump and cavity darkening) under a bead forest of LPS and proteins.",
                "refs": ref("phage-t4", "biofilm-fluorescence"),
                "prompt": f"{TILE} {MOLECULAR_FL} The outer membrane of a Gram-negative bacterium seen from straight above at about 150 nm across: a wet, lumpy teal-blue lipid surface packed with the bases of lipopolysaccharide chains (small pale-blue bead tufts), the rounded triangular tops of OmpC porin trimers in deeper blue, and a few larger violet-blue membrane proteins, with soft ambient occlusion in the creases. Evenly lit, no single dominant feature, no cast shadows across the tile. {SCIENCE}",
            },
            {
                "id": "MP-V06", "status": "delivered", "name": "Deep water panorama (every direction)",
                "file": "assets/phage/water-panorama.webp", "size": "4096 x 2048, opaque, equirectangular, wraps left to right",
                "used": "The far backdrop of the revamped phage world, sampled by view direction so the water is full wherever the camera turns (no up or down). Replaces MP-V02's flat plate in the default look.",
                "standin": "A procedural backdrop drawn by view direction in the final pass, behind a bath of thousands of molecules and a shell of far cells in every direction.",
                "refs": ref("phage-t4", "biofilm-fluorescence"),
                "prompt": f"{MOLECULAR_FL} An equirectangular 360-degree panorama (2:1, the left edge continuing seamlessly into the right edge, no visible seam, the top and bottom rows smoothly converging as at the poles of a sphere) of deep bog water seen from inside it at about 3 µm across: a dim teal-blue haze crowded with countless out-of-focus molecules as soft bead clusters, and a few far rod-shaped bacteria (about 1 µm long, translucent teal-blue, coated with a fuzz of surface proteins) hanging at different depths in every direction. No single light source in the frame, no surface, no ground, no up or down: it should look equally full whichever way you face. Soft, low contrast, so the near scene reads in front of it. {SCIENCE}",
            },
            {
                "id": "MP-V07", "status": "delivered", "name": "Far molecule sprite sheet",
                "file": "assets/phage/molecule-sprites.webp", "size": "2048 x 2048, transparent (or #FF00FF background)",
                "used": "Optional far layer: the most distant molecules of the phage world as soft camera-facing sprites (the near ones stay 3D bead clusters).",
                "standin": "Procedural bead-cluster impostors drawn in the shader (the same shader the near molecules use).",
                "refs": ref("phage-t4", "boss-cascade"),
                "prompt": f"{MOLECULAR_FL} A 4 by 4 sprite sheet of single molecules, each centred in its square cell with clear space round it on a flat #FF00FF background: soft-focus, slightly blurred bead clusters of varied shape and size (globular proteins, dimers, small chains, irregular humic tangles, tiny ion clusters), in violet-blue, teal, soft green, pale blue-white and olive, each with soft self-shadowing and a faint dark rim, all lit from the upper left. No cell edges, no text. {SCIENCE}",
            },
            {
                "id": "MP-R21", "status": "delivered", "name": "Humic floc (a new obstacle)",
                "file": "assets/reference-sheets/humic-floc.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling the humic flocs of the revamped phage world: drifting sticky tangles of humic matter that snag extended tail fibres (fold them with B to slip through).",
                "standin": "Procedural flocs: tangled bead chains with clumps, built in code.",
                "refs": ref("phage-t4", "bog-pool"),
                "prompt": f"{TURNAROUND} {MOLECULAR_FL} A humic aggregate (floc) from tea-brown bog water, about 0.3 µm across: a loose, irregular, sponge-like tangle of branching humic and fulvic chains (beaded strands a few nanometres thick, olive-brown to amber) knotted round a few denser clumps, with small molecules and a couple of bound mineral flakes caught in it; open gaps between the strands. Shown from four sides on a plain dark teal background (#0E2F38) instead of grey. {SCIENCE}",
            },
            {
                "id": "MP-R22", "status": "delivered", "name": "Host bacterium in the new look",
                "file": "assets/reference-sheets/phage-host.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling and colouring the revamped host cells (Host A and B, Gram-negative rods) and, for contrast, the wrong host (a Gram-positive rod) of the phage world.",
                "standin": "None needed: the hosts are built in code (capsule body, wet relief, bead forest).",
                "refs": ref("phage-t4", "magnetotactic", "biofilm-fluorescence"),
                "prompt": f"{TURNAROUND} {MOLECULAR_FL} A Gram-negative rod-shaped bacterium about 1.5 µm long and 0.7 µm wide, seen at the scale of its surface: a wet, lumpy, translucent teal-blue outer membrane densely coated with a short fuzz of lipopolysaccharide chains (pale blue bead tufts) and studded with blue OmpC porin trimers and a few gold three-lobed receptor proteins on beaded stalks, two or three of them in small patches. In the lower right corner of the sheet, smaller, the same views of a Gram-positive rod for contrast: a thicker, smoother, duller olive-green wall with no outer membrane and no porins. On a plain dark teal background (#0E2F38) instead of grey. {SCIENCE}",
            },
            {
                "id": "MP-U09", "status": "delivered", "name": "Phage card (the new look)",
                "file": "assets/cards/phage.webp", "size": "1200 x 800, opaque",
                "used": "The Phage card in Micro Zoom's world select and on the prototypes page. Replaces MP-U07's file in place: until it is delivered, the card shows MP-U07 (the old watercolour card).",
                "standin": "MP-U07, the current card.",
                "refs": ref("phage-t4", "magnetotactic", "biofilm-fluorescence"),
                "prompt": f"{CARD} {MOLECULAR_FL} A single T4-like bacteriophage glowing warm gold (a prolate faceted icosahedral head about 120 by 86 nm with a glassy capsid and the DNA spool glowing inside, a straight ridged contractile tail sheath, a hexagonal baseplate, six long thin kinked tail fibres reaching forward) drifting legs-first toward the curved, wet, teal-blue outer membrane of a rod-shaped bacterium, its surface densely furred with lipopolysaccharide chains and studded with blue porin trimers and a gold three-lobed receptor; the water around it packed with small molecules in violet-blue, teal and soft green, with tiny molecules filling every gap; further cells hanging in the teal haze. A small molecule visibly glancing off the phage's head. Large depth of field: the phage, the receptor and the nearby molecules all readable. {SCIENCE}",
            },
            {
                "id": "MP-G14", "status": "delivered", "name": "World intro: Host surface (phage), the new look",
                "file": "assets/game/intro-phage.webp", "size": "2560 x 1440, opaque",
                "used": "The phage world's intro screen, which the select card zooms into; text sits over the left third. Replaces MP-G13's file in place: until it is delivered, the intro shows MP-G13.",
                "standin": "MP-G13, the current intro plate.",
                "refs": ref("phage-t4", "magnetotactic", "biofilm-sem"),
                "prompt": f"{GAMEUI} A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim). Inside the circle, the illustrative molecular look: {MOLECULAR_FL} A glowing gold T4-like bacteriophage (faceted head, ridged sheath, six kinked tail fibres) drifting legs-first through water packed with molecules toward a gold three-lobed receptor on the furred, wet, teal-blue surface of a rod bacterium, more cells hanging in the teal haze behind. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.",
            },
        ],
    },
    {
        "title": "Round 4: Micro Zoom game UI and world intros",
        "intro": "Art for the full game (micro/game/): title screen, menu, cards and the intro screen of each world. Until they arrive the game draws its own stand-ins in the same style.",
        "items": [
            {
                "id": "MP-G01", "status": "delivered", "name": "Micro Zoom logo",
                "file": "assets/game/logo.png", "size": "1600 x 640, transparent",
                "used": "The title screen, the pause menu header and the library card.",
                "standin": "The words MICRO ZOOM set in the game's display font.",
                "refs": ref("springtail-swarm", "tardigrade-light"),
                "prompt": f"{GAMEUI} A game title logo: the words \"MICRO ZOOM\" in capitals, spelled exactly M-I-C-R-O Z-O-O-M, in an elegant engraved serif with brass inlay and a thin ink outline, the O of MICRO drawn as a microscope objective lens seen end-on with concentric brass rings and a tiny tardigrade silhouette inside. A fine engraved scale rule underlines the words. Wide landscape composition, even margins, no other text, no watermark. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.",
            },
            {
                "id": "MP-G02", "status": "delivered", "name": "Title screen key art",
                "file": "assets/game/title.webp", "size": "2560 x 1440, opaque",
                "used": "Full-screen behind the title (Press Start).",
                "standin": "A slow procedural zoom through the worlds' colours.",
                "refs": ref("springtail-swarm", "moss", "tardigrade-light", "paramecium", "phage-t4"),
                "prompt": f"{GAMEUI} Key art: a brass microscope's objective lens hangs above a single drop of bog water on a glass slide; inside the drop, nested like a spiral of shrinking worlds, a water springtail on the surface film, a mite among moss leaves, a tardigrade gripping a leaf cell, an amoeba, a green Paramecium, rod bacteria and a tiny bacteriophage at the centre, each painted in its own microscope look (macro photo, electron micrograph, DIC, brightfield, phase contrast, molecular illustration). Warm lamplight, deep green shadows. Keep the upper-middle third calm for the logo and the bottom third quiet for the Press Start line. Full-bleed 16:9, no text.",
            },
            {
                "id": "MP-G03", "status": "delivered", "name": "Menu background",
                "file": "assets/game/menu.webp", "size": "2560 x 1440, opaque",
                "used": "Behind the world-select cards.",
                "standin": "A dark green-to-ink gradient with a faint engraved grid.",
                "refs": ref("moss"),
                "prompt": f"{GAMEUI} A naturalist's laboratory bench seen from above, softly out of focus: dark green baize, a brass microscope stage edge, glass slides with hand-written specimen labels, an engraved brass scale rule, a magnifying glass, sepia field notes with ink sketches of mites and tardigrades. The centre is dark and calm so a row of cards can sit over it. Full-bleed 16:9, no legible text.",
            },
            {
                "id": "MP-G04", "status": "delivered", "name": "Card frame",
                "file": "assets/game/card-frame.png", "size": "1024 x 1400, transparent",
                "used": "The frame around each world card on the select screen (stretched as a 9-slice).",
                "standin": "A CSS brass border with engraved corner marks.",
                "refs": ref("moss"),
                "prompt": f"{GAMEUI} An empty portrait frame for a specimen card: a thin polished brass bezel with engraved corner ornaments and a small vernier scale along the bottom edge, like the mount of a microscope slide; the inside is completely empty and transparent; even line weights so it can be stretched as a nine-slice. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.",
            },
            {
                "id": "MP-G05", "status": "delivered", "name": "Paper panel texture",
                "file": "assets/game/paper.webp", "size": "1024 x 1024, opaque, tileable",
                "used": "Panels: the intro text, the pause menu, settings and the controls card.",
                "standin": "A flat warm ivory with procedural grain.",
                "refs": ref("moss"),
                "prompt": f"{TILE} Aged ivory laboratory paper with a fine even fibre texture, a very faint pale-green engraved millimetre grid and the slightest foxing, light and calm so dark text reads on it. No stains in one spot, no text.",
            },
            {
                "id": "MP-G06", "status": "delivered", "name": "App icon",
                "file": "assets/game/icon.png", "size": "1024 x 1024, transparent",
                "used": "Browser tab and home-screen icon.",
                "standin": "A drawn brass objective ring.",
                "refs": ref("tardigrade-light"),
                "prompt": f"{GAMEUI} An app icon: a brass microscope objective seen end-on, concentric brass and black rings around a glowing round field of view that holds a small plump tardigrade in soft DIC grey-green; on a rounded-square tile of deep ink green. Bold and readable at 48 px. The rounded square fills the frame with transparent corners. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.",
            },
            {
                "id": "MP-G07", "status": "delivered", "name": "World intro: Bog surface (springtail)",
                "file": "assets/game/intro-springtail.webp", "size": "2560 x 1440, opaque",
                "used": "The intro screen of this world, which the select card zooms into; text sits over the left third.",
                "standin": "The world's launcher card, enlarged and blurred.",
                "refs": ref("springtail-swarm", "sundew", "bog-pool"),
                "prompt": f"{GAMEUI} A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing macro photograph at about 2:1, natural daylight, very shallow depth of field: a blue-black water springtail (Podura aquatica) standing on the dimpled water film of a bog pool, Sphagnum islands and a sundew in soft focus behind. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.",
            },
            {
                "id": "MP-G08", "status": "delivered", "name": "World intro: Moss canopy (mite)",
                "file": "assets/game/intro-mite.webp", "size": "2560 x 1440, opaque",
                "used": "The intro screen of this world, which the select card zooms into; text sits over the left third.",
                "standin": "The world's launcher card, enlarged and blurred.",
                "refs": ref("mite", "moss", "tardigrade-sem"),
                "prompt": f"{GAMEUI} A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing scanning electron micrograph look, greyscale: a small armoured box mite among towering Sphagnum leaves and fungal hyphae, deep focus. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.",
            },
            {
                "id": "MP-G09", "status": "delivered", "name": "World intro: Water film (tardigrade)",
                "file": "assets/game/intro-tardigrade.webp", "size": "2560 x 1440, opaque",
                "used": "The intro screen of this world, which the select card zooms into; text sits over the left third.",
                "standin": "The world's launcher card, enlarged and blurred.",
                "refs": ref("tardigrade-light", "moss", "milnesium"),
                "prompt": f"{GAMEUI} A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing differential interference contrast microscope look: a plump tardigrade gripping the cell walls of a moss leaf under a thin water film, chloroplasts in the cells, a Milnesium as a soft blur in the distance. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.",
            },
            {
                "id": "MP-G10", "status": "delivered", "name": "World intro: Pool floor (amoeba)",
                "file": "assets/game/intro-amoeba.webp", "size": "2560 x 1440, opaque",
                "used": "The intro screen of this world, which the select card zooms into; text sits over the left third.",
                "standin": "The world's launcher card, enlarged and blurred.",
                "refs": ref("amoeba", "spirogyra", "paramecium"),
                "prompt": f"{GAMEUI} A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing brightfield microscope look: Amoeba proteus with broad pseudopods curving round a small ciliate on the slide, Spirogyra filaments out of focus behind. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.",
            },
            {
                "id": "MP-G11", "status": "delivered", "name": "World intro: Hollow pool (Paramecium)",
                "file": "assets/game/intro-paramecium.webp", "size": "2560 x 1440, opaque",
                "used": "The intro screen of this world, which the select card zooms into; text sits over the left third.",
                "standin": "The world's launcher card, enlarged and blurred.",
                "refs": ref("paramecium-bursaria", "didinium", "vorticella"),
                "prompt": f"{GAMEUI} A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing brightfield microscope look: a green Paramecium bursaria full of Chlorella swimming in a bog pool, a barrel-shaped Didinium approaching, stalked Vorticella in the background. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.",
            },
            {
                "id": "MP-G12", "status": "delivered", "name": "World intro: Sediment (bacterium)",
                "file": "assets/game/intro-bacterium.webp", "size": "2560 x 1440, opaque",
                "used": "The intro screen of this world, which the select card zooms into; text sits over the left third.",
                "standin": "The world's launcher card, enlarged and blurred.",
                "refs": ref("magnetotactic", "biofilm-fluorescence", "biofilm-sem"),
                "prompt": f"{GAMEUI} A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing phase-contrast microscope look at 1000x: a magnetotactic spirillum with a chain of magnetosomes among rods and cocci on a biofilm, the edge of a ciliate's mouth looming. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.",
            },
            {
                "id": "MP-G13", "status": "delivered", "name": "World intro: Host surface (phage)",
                "file": "assets/game/intro-phage.webp", "size": "2560 x 1440, opaque",
                "used": "The intro screen of this world, which the select card zooms into; text sits over the left third.",
                "standin": "The world's launcher card, enlarged and blurred.",
                "refs": ref("phage-t4", "magnetotactic", "biofilm-sem"),
                "prompt": f"{GAMEUI} A wide intro plate framed as if seen through a brass microscope eyepiece at the right two thirds of the image (a soft round field stop with engraved brass rim), showing molecular illustration in the manner of David Goodsell's watercolours: a T4-like bacteriophage landing on the lipopolysaccharide surface of a bacterium, crowded water with small molecules around it. The left third is calm dark ink-green paper texture for text. Scientifically grounded anatomy. Full-bleed 16:9, no text, no labels.",
            },
        ],
    },
    {
        "title": "Round 5: boss reference sheets",
        "intro": "One boss per world (micro/design/bosses.md). Orthographic modelling sheets, like the earlier reference sheets: the bosses are built in code from them.",
        "items": [
            {
                "id": "MP-R14", "status": "delivered", "name": "Pond wolf spider (Pirata), boss of the bog surface",
                "file": "assets/reference-sheets/boss-wolf-spider.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling this world's boss.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("boss-wolf-spider", "springtail-swarm", "bog-pool"),
                "prompt": f"{TURNAROUND} A young pond wolf spider (Pirata, family Lycosidae) about 5 mm long, as it stands on the water film of a bog pool: a dark olive-brown carapace with a pale V-shaped mark and a pale band at the sides, eight eyes in three rows (four small in front, two large, two behind), exactly eight hairy legs with dark rings, held wide on the water, chelicerae with fangs, pedipalps. In the three-quarter view show it poised to lunge, front legs raised. {SCIENCE}",
            },
            {
                "id": "MP-R15", "status": "delivered", "name": "Pseudoscorpion, boss of the moss canopy",
                "file": "assets/reference-sheets/boss-pseudoscorpion.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling this world's boss.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("boss-pseudoscorpion", "mite", "moss"),
                "prompt": f"{TURNAROUND} A moss-dwelling pseudoscorpion (e.g. Neobisium) about 2.5 mm long: a flattened pear-shaped body with a segmented abdomen and no tail or sting, a smooth amber-brown carapace with two or four small eyes, exactly eight slender walking legs, and two very large pedipalps ending in long curved chelae (pincers) with a visible venom tooth at the tip of the movable finger, held forward and open. Chelicerae small at the front. {SCIENCE}",
            },
            {
                "id": "MP-R16", "status": "delivered", "name": "Predatory nematode (Prionchulus), boss of the water film",
                "file": "assets/reference-sheets/boss-nematode.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling this world's boss.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("milnesium", "moss"),
                "prompt": f"{TURNAROUND} A predatory mononchid nematode (Prionchulus muscorum) about 2 mm long and 60 micrometres thick, transparent and colourless in a differential-interference-contrast look: a long smooth unsegmented worm tapering at both ends, a wide barrel-shaped buccal cavity at the head with one large dorsal tooth, a muscular cylindrical oesophagus, the gut with dark granules; in the three-quarter view the body bent in a strong S-curve as it whips. {SCIENCE}",
            },
            {
                "id": "MP-R17", "status": "delivered", "name": "Giant amoeba (Chaos), boss of the pool floor",
                "file": "assets/reference-sheets/boss-chaos.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling this world's boss.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("boss-chaos", "amoeba", "paramecium"),
                "prompt": f"{TURNAROUND} The giant amoeba Chaos (Chaos carolinensis), up to 5 mm across, in a brightfield microscope look: a huge flowing cell with many broad blunt pseudopods, granular grey-brown cytoplasm, hundreds of small nuclei (unlike Amoeba proteus, which has one), many food vacuoles with half-digested ciliates inside, a clear hyaline rim at each advancing tip. In the side view show its thickness; in the three-quarter view two pseudopods curving to surround something. {SCIENCE}",
            },
            {
                "id": "MP-R18", "status": "delivered", "name": "Bladderwort trap (Utricularia), boss of the hollow pool",
                "file": "assets/reference-sheets/boss-bladderwort.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling this world's boss.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("utricularia-bladder", "bog-pool", "paramecium"),
                "prompt": f"{TURNAROUND} A single bladder trap of the aquatic bladderwort Utricularia, about 2 mm long, in a brightfield microscope look: a translucent green oval bladder on a short stalk, the trap door at one end fringed with branched antennae and long bristle-like trigger hairs, glands on the door, small captured organisms visible inside. In one view the door closed and the walls drawn in (set); in the three-quarter view the door swinging open with water rushing in. {SCIENCE}",
            },
            {
                "id": "MP-R19", "status": "delivered", "name": "Stentor, boss of the sediment",
                "file": "assets/reference-sheets/boss-stentor.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling this world's boss.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("boss-stentor-extended", "boss-stentor", "biofilm-sem", "paramecium"),
                "prompt": f"{TURNAROUND} The giant trumpet-shaped ciliate Stentor coeruleus, about 1-2 mm when extended, in a phase-contrast and natural-colour look: a blue-green trumpet attached by a narrow foot, a broad flat oral disc at the top ringed by a spiral of long membranelles (cilia) that whirl a feeding vortex, longitudinal blue pigment stripes along the body, a bead-like chain macronucleus inside. In the three-quarter view show the vortex of particles being drawn into the mouth. {SCIENCE}",
            },
            {
                "id": "MP-R20", "status": "delivered", "name": "CRISPR-Cas complex, boss inside the host",
                "file": "assets/reference-sheets/boss-cas.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling this world's boss.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("boss-cascade", "boss-cas-proteins", "phage-t4", "magnetotactic"),
                "prompt": f"{TURNAROUND} A molecular illustration in the manner of David Goodsell of a type I CRISPR-Cas surveillance complex (Cascade) with its guide RNA, bound along a stretch of DNA double helix, and a Cas3 nuclease-helicase beside it ready to chop the DNA: soft watercolour shapes, the Cascade as a curved seahorse-like backbone of protein subunits around a bright RNA strand, the DNA as a twisted ladder. Show the complex from the side, from above, from the end and in three-quarter view. {SCIENCE}",
            },
        ],
    },
    {
        "title": "Model reference sheets",
        "intro": "One orthographic turnaround sheet per creature or enemy that will be built as a 3D model in code. Each shows the same individual from the side, top, front and three-quarter view on plain grey at one scale: a measuring tape for proportions and a paint source for colours, the method that worked for the sibling Wobblers project. Check every sheet against its reference photographs before modelling from it; where the sheet and the photographs disagree, the photographs win.",
        "items": [
            {
                "id": "MP-R01", "status": "delivered", "name": "Water springtail (Podura aquatica)",
                "file": "assets/reference-sheets/springtail.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling the springtail protagonist (Level 0).",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("springtail"),
                "prompt": f"{TURNAROUND} The water springtail Podura aquatica, about 1.5 mm long: a plump, cylindrical, slightly flattened body with a blue-black to slate-grey granular cuticle; a head with short, stout four-segmented antennae and a dark eye patch of eight eyespots on each side; a thorax and abdomen of segments without wings; exactly three pairs of short five-part legs ending in a single claw each; a ventral tube (collophore) projecting downward from the first abdominal segment; and the furcula, a forked springing organ, folded forward under the abdomen and clipped in a small catch (retinaculum) on the third abdominal segment, its two flattened tines (mucrones) broad at the tips. In the side view show the furcula folded; in the three-quarter view show it folded too. No wings, no fantasy features. {SCIENCE}",
            },
            {
                "id": "MP-R02", "status": "delivered", "name": "Rove beetle (Stenus)",
                "file": "assets/reference-sheets/stenus.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling the Stenus rove beetle that skims on the water and harpoons springtails.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("stenus", "springtail"),
                "prompt": f"{TURNAROUND} A rove beetle of the genus Stenus, about 5 mm long: a slender black body with fine dense punctures and a faint lead-grey sheen; a broad head with very large bulging compound eyes on each side; long thin eleven-segmented antennae; a narrow cylindrical pronotum; short elytra covering only the front of the abdomen, leaving a long, flexible, segmented abdomen exposed and slightly raised; exactly six long slender legs. The labium (lower lip) is extended forward as a long thin rod far beyond the head, ending in a pair of small sticky pads: the labial harpoon it shoots out to catch springtails. Show the harpoon extended in the side and three-quarter views and retracted under the head in the top and front views. {SCIENCE}",
            },
            {
                "id": "MP-R03", "status": "delivered", "name": "Water strider (Gerris)",
                "file": "assets/reference-sheets/water-strider.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling the water strider standing on the pool surface.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("water-strider"),
                "prompt": f"{TURNAROUND} A water strider of the genus Gerris, about 10 mm long body: a narrow dark brown-black body covered with a fine velvety silver-grey hair pile, a small head with prominent eyes and four-segmented antennae, a piercing beak (rostrum) folded under the head; exactly six legs: short front legs held forward for grabbing prey, very long thin middle legs spread sideways for rowing, long hind legs trailing backward for steering; the middle and hind legs rest on the water along their last segments with small dimples, not touching the water anywhere else. Show the legs in their natural resting stance on a flat invisible water plane. Wingless form. {SCIENCE}",
            },
            {
                "id": "MP-R04", "status": "delivered", "name": "Predatory mite (Pergamasus-type)",
                "file": "assets/reference-sheets/predatory-mite.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling the predatory mesostigmatid mite (Levels 0 and 1).",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("predatory-mite", "mite"),
                "prompt": f"{TURNAROUND} A predatory mesostigmatid mite of the family Parasitidae (Pergamasus-type), about 1 mm long: an oval, flattened, glossy amber-to-chestnut body covered by smooth sclerotised dorsal shields with a few short setae; exactly eight legs, each with seven visible segments, the first pair longer and held forward like antennae, the others walking; at the front a projecting gnathosoma with a pair of long chelicerae ending in small pincers (chelae), and short pedipalps. No eyes. {SCIENCE}",
            },
            {
                "id": "MP-R13", "status": "delivered", "name": "Predatory mite (Pergamasus-type), revision",
                "file": "assets/reference-sheets/predatory-mite-v2.webp", "size": "2048 x 2048, opaque",
                "used": "Replaces MP-R04, which came out as a domed, glossy, dark tick-like mite. Modelling the predatory mesostigmatid mite (Levels 0 and 1).",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("predatory-mite", "mite"),
                "prompt": f"{TURNAROUND} A predatory mesostigmatid mite of the family Parasitidae (Pergamasus-type), about 1 mm long, a fast running hunter of soil and moss. Its body is strongly flattened top to bottom like a coin, NOT domed: in the side and front views the body is only about a quarter as tall as it is wide. Pale tan to light honey-yellow, satin rather than glossy, with smooth plate-like dorsal shields (a front and a rear shield meeting across the middle) and a few short fine setae; it must not look like a tick or a round beetle-mite. Exactly eight long slender legs, each with seven visible segments: the first pair is longer and thinner than the others, has no claws, and is held raised and forward like a pair of antennae, as these mites feel their way; the other three pairs are spread wide, walking, each ending in a small claw and pad. At the front, a projecting gnathosoma with a pair of long chelicerae ending in small toothed pincers (chelae), clearly visible from the top and front, and short five-segmented pedipalps beside them. No eyes. {SCIENCE}",
            },
            {
                "id": "MP-R05", "status": "delivered", "name": "Predatory tardigrade (Milnesium)",
                "file": "assets/reference-sheets/milnesium.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling Milnesium, the carnivorous tardigrade of Level 2.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("milnesium", "tardigrade-sem", "tardigrade-light"),
                "prompt": f"{TURNAROUND} The carnivorous tardigrade Milnesium, about 0.5 to 0.7 mm long: a plump, barrel-shaped, translucent body with faint segmentation, a smooth cuticle without plates, often brownish-orange gut contents; a broad head with a wide terminal mouth opening surrounded by six small peribuccal papillae and two lateral papillae, a short wide buccal tube with stylets visible through the body wall, two dark eye spots; exactly four pairs of stubby, unjointed lobopod legs, the fourth pair pointing backward at the rear, each leg ending in two double claws of unequal shape (a long slender branch and a short hooked one). {SCIENCE}",
            },
            {
                "id": "MP-R06", "status": "delivered", "name": "Didinium nasutum",
                "file": "assets/reference-sheets/didinium.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling Didinium, the Paramecium hunter of Level 3.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("didinium", "paramecium"),
                "prompt": f"{TURNAROUND} The ciliate Didinium nasutum, about 100 µm long, as in a brightfield preparation: a barrel-shaped transparent cell, its front end drawn out into a short cone-shaped proboscis (snout) with the cell mouth at its tip, from which toxicysts are fired; exactly two girdles of cilia (pectinelles) encircling the barrel, one just behind the proboscis and one around the middle, and no other cilia on the body; a curved horseshoe-shaped macronucleus inside, a contractile vacuole at the rear end. {SCIENCE}",
            },
            {
                "id": "MP-R07", "status": "delivered", "name": "Paramecium bursaria",
                "file": "assets/reference-sheets/paramecium-bursaria.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling the Level 3 protagonist, the green Paramecium.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("paramecium-bursaria", "paramecium"),
                "prompt": f"{TURNAROUND} The ciliate Paramecium bursaria, about 120 µm long, as in a brightfield preparation: a broad, slightly flattened slipper or foot shape, shorter and wider than Paramecium caudatum, with a blunt rounded rear; a wide oral groove running diagonally from the front to a mouth at the middle of one side; an even coat of short cilia over the whole surface; the cell packed with hundreds of round green symbiotic Chlorella algae, about 3 to 5 µm each, giving it a uniform grass-green colour, with a pale macronucleus and two contractile vacuoles visible through them. {SCIENCE}",
            },
            {
                "id": "MP-R08", "status": "delivered", "name": "Peranema trichophorum",
                "file": "assets/reference-sheets/peranema.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling Peranema, the gliding predatory euglenid of Level 4.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("peranema", "euglena"),
                "prompt": f"{TURNAROUND} The colourless euglenid Peranema trichophorum, about 40 to 70 µm long, as in a brightfield preparation: a flexible, elongated, spindle-to-pear-shaped transparent cell, broad at the rear and tapered at the front, with fine spiral striations on its pellicle; one thick leading flagellum about as long as the body held straight forward with only its tip beating; a second thin trailing flagellum lying along the body; a rod-like feeding apparatus near the front; many refractive granules inside; no chloroplasts, no eyespot. {SCIENCE}",
            },
            {
                "id": "MP-R09", "status": "delivered", "name": "Actinophrys sol (sun animalcule)",
                "file": "assets/reference-sheets/actinophrys.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling Actinophrys, the radiating ambush predator of Level 4.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("actinophrys"),
                "prompt": f"{TURNAROUND} The heliozoan Actinophrys sol, a cell body about 40 µm across, as in a brightfield preparation: a spherical, frothy, vacuolated transparent cell with one central nucleus, from which many straight, stiff, thin radiating arms (axopodia) about as long as the cell's diameter project evenly in all directions, each with tiny granules (extrusomes) scattered along it. Being spherical it looks the same from every side: keep the views identical in proportion and arm density. {SCIENCE}",
            },
            {
                "id": "MP-R10", "status": "delivered", "name": "Magnetotactic bacterium",
                "file": "assets/reference-sheets/magnetotactic.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling the Level 5 protagonist.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("magnetotactic"),
                "prompt": f"{TURNAROUND} A magnetotactic spirillum (Magnetospirillum-type), as reconstructed from electron micrographs: a helical, gently twisted rod-shaped cell about 3 µm long and 0.5 µm wide, one and a half to two turns of helix, with a single long flagellum at each end; a straight chain of 15 to 20 cube-octahedral magnetite crystals (magnetosomes, each about 50 nm, dark grey-black, each in its own thin membrane) running along the long axis inside the cell, drawn visible through a pale translucent cell body. {SCIENCE}",
            },
            {
                "id": "MP-R11", "status": "delivered", "name": "Bdellovibrio bacteriovorus",
                "file": "assets/reference-sheets/bdellovibrio.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling Bdellovibrio, the predatory bacterium of Level 5.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("bdellovibrio"),
                "prompt": f"{TURNAROUND} The predatory bacterium Bdellovibrio bacteriovorus in its free-swimming attack phase, as reconstructed from electron micrographs: a small comma-shaped (vibrioid) cell about 1 µm long and 0.3 µm wide, with a single thick sheathed flagellum at one pole about three times the cell's length, and fine short pili at the opposite, attacking pole. Pale translucent grey cell body. {SCIENCE}",
            },
            {
                "id": "MP-R12", "status": "delivered", "name": "Bacteriophage T4",
                "file": "assets/reference-sheets/phage-t4.webp", "size": "2048 x 2048, opaque",
                "used": "Modelling the phage protagonist of Level 6 and the phages that threaten Level 5.",
                "standin": "None needed: the model is built from the photographs.",
                "refs": ref("phage-t4"),
                "prompt": f"{TURNAROUND} Bacteriophage T4 as reconstructed from cryo-electron microscopy, about 0.2 µm tall: an elongated icosahedral head (a prolate capsid about 110 nm long and 85 nm wide, with flat triangular faces) containing the DNA; a short collar with whiskers below it; a straight cylindrical contractile tail sheath about 100 nm long with helical ridges around a central tube; a hexagonal baseplate at the bottom with six short tail pins; and exactly six long, thin, kinked tail fibres (each bent at a knee halfway along) hanging down and outward from the baseplate corners. Draw in molecular-model colours (soft blues and greens for the capsid, ochre for the sheath, orange for baseplate and fibres). {SCIENCE}",
            },
        ],
    },
    {
        "title": "Environment concepts",
        "intro": "Concept plates for the levels that have no prototype art yet: the mood, palette and optical look of each place. They guide set dressing and the shaders; they are not used in the game.",
        "items": [
            {
                "id": "MP-E01", "status": "delivered", "name": "The bog surface at springtail height",
                "file": "assets/concepts/bog-surface.webp", "size": "2560 x 1440, opaque",
                "used": "Concept for Level 0, the bog surface.",
                "standin": "None needed.",
                "refs": ref("bog-pool", "bog-hummock", "springtail", "sundew", "water-strider", "stenus"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{MACRO} The edge of a small Sphagnum bog pool at the eye height of a 1.5 mm water springtail: in the foreground a group of blue-black Podura aquatica springtails on the dark tea-brown water film, their feet dimpling the surface; a Sphagnum shore of green and red capitula rising like a cliff behind them; a round-leaved sundew leaf on the bank with glistening red tentacles; further out, the long legs of a water strider resting in dimples, and on the mossy edge a slender black Stenus rove beetle. Soft overcast daylight, very shallow depth of field. {SCIENCE}",
            },
            {
                "id": "MP-E02", "status": "delivered", "name": "The periphyton at 400x",
                "file": "assets/concepts/periphyton.webp", "size": "2560 x 1440, opaque",
                "used": "Concept for Level 4, the periphyton and the trap.",
                "standin": "None needed.",
                "refs": ref("trachelomonas", "peranema", "actinophrys", "chytrid", "euglena", "diatoms", "utricularia-bladder"), "concepts": ["04-cell-neighborhood.webp"],
                "prompt": f"{DIC} The periphyton on a submerged Utricularia leaf in a bog pool at 400x, about 450 µm across: a felt of diatoms, green algal filaments and desmids on the leaf surface, brown Trachelomonas loricae with spines among them and a green Euglena swimming past, a colourless Peranema gliding with its forward flagellum, an Actinophrys sol with stiff radiating arms waiting at the edge, a few chytrid sporangia like small round flasks on an algal cell. At one side the translucent wall and bristly door of a bladderwort trap. Shallow depth of field. {SCIENCE}",
            },
            {
                "id": "MP-E03", "status": "delivered", "name": "The bacterial sediment at 1000x",
                "file": "assets/concepts/bacterial-sediment.webp", "size": "2560 x 1440, opaque",
                "used": "Concept for Level 5, the film of bacteria.",
                "standin": "None needed.",
                "refs": ref("magnetotactic", "bdellovibrio", "biofilm-fluorescence", "biofilm-sem"), "concepts": ["04-cell-neighborhood.webp"],
                "prompt": f"{PHASE} The bacterial film on bog sediment at 1000x, about 60 µm across: a mounded biofilm of packed rods in the lower third, open water above with swimming rods and spirilla, a magnetotactic spirillum among them, small Bdellovibrio as tiny commas and one prey rod rounded into a sphere (a bdelloplast), and the out-of-focus edge of a large ciliate looming at the top. Nothing shown more sharply than the 0.2 µm limit allows. {SCIENCE}",
            },
            {
                "id": "MP-E04", "status": "delivered", "name": "The phage level (molecular illustration)",
                "file": "assets/concepts/phage-level.webp", "size": "2560 x 1440, opaque",
                "used": "Concept for Level 6, the viruses.",
                "standin": "None needed.",
                "refs": ref("phage-t4", "magnetotactic", "biofilm-sem"),
                "prompt": f"{MOLECULAR} The world of a bacteriophage at about 1 µm across: in the lower half, a curved section through the surface of a Gram-negative bacterium (outer membrane with lipopolysaccharide chains, periplasm with its thin peptidoglycan layer, inner membrane with embedded proteins, then crowded cytoplasm with ribosomes and DNA); above it, water crowded with small dissolved molecules, a flat clay mineral platelet and a few drifting T4 phages (icosahedral heads, tail sheaths, baseplates, six kinked tail fibres), one landed with its fibres bound to the outer membrane and its sheath contracted, injecting its DNA. Inside the cell a CRISPR-Cas complex and a restriction enzyme on the DNA. {SCIENCE}",
            },
        ],
    },
]


def load_refs() -> dict:
    references = {r["id"]: r for r in json.loads(MANIFEST.read_text())}
    production = MANIFEST.with_name("production-manifest.json")
    if production.exists():
        references.update({r["id"]: r for r in json.loads(production.read_text())})
    return references


def asset_list() -> str:
    items = {i["id"]: {"file": i["file"], "status": i.get("status", "requested")} for g in GROUPS for i in g["items"]}
    return (
        "// Generated by micro/design/source/build_requests.py; do not edit.\n"
        "// Paths are relative to micro/prototypes/. Only `delivered` files are loaded.\n"
        f"export const ASSETS = {json.dumps(items, indent=2)};\n"
    )


def document(history: bool = False) -> str:
    """The open requests, or with history=True every delivered request."""
    refs = load_refs()
    all_items = [i for g in GROUPS for i in g["items"]]
    done = sum(1 for i in all_items if i.get("status") == "delivered")
    keep = (lambda i: i.get("status") == "delivered") if history else (lambda i: i.get("status") != "delivered")
    if history:
        out = [
            "# Micro prototypes: image request history",
            "",
            "Every image request that has been delivered, with its prompt and reference images, for the record. "
            "Open requests are in [`image-requests.md`](image-requests.md). Generated from `design/source/build_requests.py`; "
            "a request moves here when its status is set to `delivered`.",
            "",
            f"{done} delivered.",
            "",
        ]
    else:
        out = [
        "# Micro prototypes: image requests",
        "",
        "Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in "
        "[`image-requests-history.md`](image-requests-history.md). Generated from `design/source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.",
        "",
        "## How to use this list",
        "",
        "1. Each prompt is complete on its own: paste it as it stands.",
        "2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.",
        "3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.",
        "4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.",
        "5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.",
        "",
        "## Status",
        "",
        f"{len(all_items) - done} requested, {done} delivered, {len(all_items)} in total.",
        "",
        ]
        if done == len(all_items):
            out += ["Nothing is open right now.", ""]
    for g in GROUPS:
        items = [i for i in g["items"] if keep(i)]
        if not items:
            continue
        out += [f"## {g['title']}", "", g["intro"], ""]
        for i in items:
            out += [
                f"### {i['id']} · {i['name']}",
                "",
                f"- **File:** `micro/prototypes/{i['file']}`",
                f"- **Size:** {i['size']}",
                f"- **Used for:** {i['used']}",
                f"- **Stand-in until delivered:** {i['standin']}",
                f"- **Status:** {i.get('status', 'requested')}",
                "- **Reference images:**",
            ]
            for rid in i["refs"]:
                r = refs.get(rid)
                if r is None:
                    out.append(f"  - `{rid}`: reference photograph still being collected for the atlas")
                    continue
                out.append(
                    f"  - [{r['note']}](research/{r['local']}) · {r['author']}, {r['license']} · [source]({r['source']})"
                )
            for c in i.get("concepts", []):
                out.append(f"  - Concept board (mood only): [`{c}`](research/assets/concepts/{c})")
            out += ["", "```text", i["prompt"], "```", ""]
    return "\n".join(out)


def missing_links(doc: str) -> list[str]:
    """Local files the document links to that do not exist."""
    import re

    found = []
    for target in re.findall(r"\]\(((?!https?:)[^)#]+)\)", doc):
        if not (DOC.parent / target).resolve().exists():
            found.append(target)
    return sorted(set(found))


def main() -> int:
    outputs = {DOC: document(), HISTORY: document(history=True), ASSET_LIST: asset_list()}
    ids = [i["id"] for g in GROUPS for i in g["items"]]
    dupes = sorted({x for x in ids if ids.count(x) > 1})
    if dupes:
        print(f"duplicate request ids: {', '.join(dupes)}")
        return 1
    missing = sorted(set(missing_links(outputs[DOC]) + missing_links(outputs[HISTORY])))
    for m in missing:
        print(f"missing linked file: {m}")
    if "--check" in sys.argv:
        stale = [p for p, text in outputs.items() if not p.exists() or p.read_text() != text]
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT.parent)}")
        return 1 if stale or missing else 0
    for p, text in outputs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        print(f"wrote {p.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
