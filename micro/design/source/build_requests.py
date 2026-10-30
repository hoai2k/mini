#!/usr/bin/env python3
"""Generate the Micro prototypes' image requests and their asset list.

Edit the data in this file, then run:

    python3 micro/design/source/build_requests.py          # write
    python3 micro/design/source/build_requests.py --check  # verify up to date

Outputs:
    micro/design/image-requests.md          the request document
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
DOC = ROOT / "design" / "image-requests.md"
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
                "id": "MP-S05", "status": "requested", "name": "Raindrop and ripple sprites",
                "file": "assets/springtail/ripples.png", "size": "2048 x 2048, transparent, 4 x 4 sprite grid",
                "used": "Raindrop impacts and the ripples they send across the pool surface.",
                "standin": "Procedural expanding rings.",
                "refs": ref("bog-pool"),
                "prompt": f"{MACRO} A 4 by 4 grid of sixteen frames, each centred in its own cell with clear space around it, showing one raindrop hitting still dark water from directly above in sequence: the falling drop, the crater, the crown splash, the rebound jet, then expanding concentric ripple rings that grow and fade. Same scale in every frame, the drop about 3 mm across. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. {SCIENCE}",
            },
        ],
    },
    {
        "title": "Bacterium (phase contrast and fluorescence)",
        "intro": "Images for the run-and-tumble bacterium prototype (Level 5), at 1000x oil immersion, the limit of the light microscope. The bacterium and its enemies are built in code; these supply the sediment background, the biofilm, a looming grazer and a fluorescence texture. Nothing here may show more detail than the optics can resolve.",
        "items": [
            {
                "id": "MP-B01", "status": "requested", "name": "Bog-sediment bacteria (phase contrast)",
                "file": "assets/bacterium/sediment-phase.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The far background: the sediment field the bacterium swims over.",
                "standin": "Procedural grey field with haloed rods.",
                "refs": ref("magnetotactic", "bdellovibrio", "biofilm-sem"), "concepts": ["04-cell-neighborhood.webp"],
                "prompt": f"{TILE} {PHASE} Bog-pool sediment at 1000x, about 60 µm across: scattered bacteria (short rods, cocci, curved vibrios and a few spirilla, 0.5 to 3 µm long), small mineral and humic particles 1 to 5 µm with bright halos, a few empty diatom frustule fragments, mostly clear grey background between them. No large organisms.",
            },
            {
                "id": "MP-B02", "status": "requested", "name": "Biofilm surface",
                "file": "assets/bacterium/biofilm.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The biofilm floor: dense cells in matrix, with channels between clusters.",
                "standin": "Procedural cell clusters on a dark field.",
                "refs": ref("biofilm-fluorescence", "biofilm-sem"), "concepts": ["04-cell-neighborhood.webp"],
                "prompt": f"{TILE} {FLUOR} A freshwater bacterial biofilm seen from above at about 50 µm across, stained as in a live/dead assay: mushroom-shaped and mound-shaped microcolonies of densely packed rod cells glowing green, a few red dead cells, darker water channels winding between the clusters, a faint haze of extracellular matrix. Cells about 1 to 2 µm, packed but individually just discernible.",
            },
            {
                "id": "MP-B03", "status": "requested", "name": "Grazer's oral region (looming ciliate)",
                "file": "assets/bacterium/grazer-mouth.webp", "size": "2560 x 1440, opaque",
                "used": "The looming threat: a ciliate's feeding current and mouth filling the frame.",
                "standin": "A dark procedural wall with a beating fringe.",
                "refs": ref("paramecium", "paramecium-bursaria", "vorticella"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{PHASE} The oral region of a bacteria-eating ciliate (Paramecium-like) seen at bacterial scale, about 40 µm across: the curved funnel of the oral groove and buccal cavity filling the right two-thirds of the frame as a soft dark wall, rows of beating cilia along its rim blurred by motion, a stream of small rod bacteria and particles being drawn in along curved paths, a forming food vacuole deep inside as a pale round shape. The ciliate itself is too large to be in focus everywhere. {SCIENCE}",
            },
            {
                "id": "MP-B04", "status": "requested", "name": "Magnetosome chain (fluorescence texture)",
                "file": "assets/bacterium/magnetosomes.webp", "size": "1024 x 1024, opaque, tileable",
                "used": "Texture inside the magnetotactic bacterium's body and on its compass display.",
                "standin": "Procedural dotted chain.",
                "refs": ref("magnetotactic"),
                "prompt": f"{TILE} {FLUOR} Magnetosome chains of magnetotactic bacteria at about 10 µm across, as seen when the magnetosome membrane protein is tagged with a green fluorescent protein: several thin straight-to-slightly-curved lines of tightly spaced glowing dots (each dot a crystal of magnetite about 50 nm, blurred to the 0.2 µm limit so the dots merge into beaded lines), each chain about 1 to 2 µm long, all roughly parallel to one another, with faint diffuse cell-body glow around each.",
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
                "id": "MP-R13", "name": "Predatory mite (Pergamasus-type), revision",
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
                "id": "MP-E01", "status": "requested", "name": "The bog surface at springtail height",
                "file": "assets/concepts/bog-surface.webp", "size": "2560 x 1440, opaque",
                "used": "Concept for Level 0, the bog surface.",
                "standin": "None needed.",
                "refs": ref("bog-pool", "bog-hummock", "springtail", "sundew", "water-strider", "stenus"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{MACRO} The edge of a small Sphagnum bog pool at the eye height of a 1.5 mm water springtail: in the foreground a group of blue-black Podura aquatica springtails on the dark tea-brown water film, their feet dimpling the surface; a Sphagnum shore of green and red capitula rising like a cliff behind them; a round-leaved sundew leaf on the bank with glistening red tentacles; further out, the long legs of a water strider resting in dimples, and on the mossy edge a slender black Stenus rove beetle. Soft overcast daylight, very shallow depth of field. {SCIENCE}",
            },
            {
                "id": "MP-E02", "status": "requested", "name": "The periphyton at 400x",
                "file": "assets/concepts/periphyton.webp", "size": "2560 x 1440, opaque",
                "used": "Concept for Level 4, the periphyton and the trap.",
                "standin": "None needed.",
                "refs": ref("trachelomonas", "peranema", "actinophrys", "chytrid", "euglena", "diatoms", "utricularia-bladder"), "concepts": ["04-cell-neighborhood.webp"],
                "prompt": f"{DIC} The periphyton on a submerged Utricularia leaf in a bog pool at 400x, about 450 µm across: a felt of diatoms, green algal filaments and desmids on the leaf surface, brown Trachelomonas loricae with spines among them and a green Euglena swimming past, a colourless Peranema gliding with its forward flagellum, an Actinophrys sol with stiff radiating arms waiting at the edge, a few chytrid sporangia like small round flasks on an algal cell. At one side the translucent wall and bristly door of a bladderwort trap. Shallow depth of field. {SCIENCE}",
            },
            {
                "id": "MP-E03", "status": "requested", "name": "The bacterial sediment at 1000x",
                "file": "assets/concepts/bacterial-sediment.webp", "size": "2560 x 1440, opaque",
                "used": "Concept for Level 5, the film of bacteria.",
                "standin": "None needed.",
                "refs": ref("magnetotactic", "bdellovibrio", "biofilm-fluorescence", "biofilm-sem"), "concepts": ["04-cell-neighborhood.webp"],
                "prompt": f"{PHASE} The bacterial film on bog sediment at 1000x, about 60 µm across: a mounded biofilm of packed rods in the lower third, open water above with swimming rods and spirilla, a magnetotactic spirillum among them, small Bdellovibrio as tiny commas and one prey rod rounded into a sphere (a bdelloplast), and the out-of-focus edge of a large ciliate looming at the top. Nothing shown more sharply than the 0.2 µm limit allows. {SCIENCE}",
            },
            {
                "id": "MP-E04", "status": "requested", "name": "The phage level (molecular illustration)",
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


def document() -> str:
    refs = load_refs()
    all_items = [i for g in GROUPS for i in g["items"]]
    done = sum(1 for i in all_items if i.get("status") == "delivered")
    out = [
        "# Micro prototypes: image requests",
        "",
        "Artwork for the prototypes in `micro/prototypes/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.",
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
    for g in GROUPS:
        out += [f"## {g['title']}", "", g["intro"], ""]
        for i in g["items"]:
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
                    f"  - [{r['note']}](../research/{r['local']}) · {r['author']}, {r['license']} · [source]({r['source']})"
                )
            for c in i.get("concepts", []):
                out.append(f"  - Concept board (mood only): [`{c}`](../research/assets/concepts/{c})")
            out += ["", "```text", i["prompt"], "```", ""]
    return "\n".join(out)


def missing_links(doc: str) -> list[str]:
    """Local files the document links to that do not exist."""
    import re

    found = []
    for target in re.findall(r"\]\((\.\./[^)]+)\)", doc):
        if not (DOC.parent / target).resolve().exists():
            found.append(target)
    return sorted(set(found))


def main() -> int:
    outputs = {DOC: document(), ASSET_LIST: asset_list()}
    ids = [i["id"] for g in GROUPS for i in g["items"]]
    dupes = sorted({x for x in ids if ids.count(x) > 1})
    if dupes:
        print(f"duplicate request ids: {', '.join(dupes)}")
        return 1
    missing = missing_links(outputs[DOC])
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
