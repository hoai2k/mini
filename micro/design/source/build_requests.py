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


def ref(*ids: str) -> list[str]:
    return list(ids)


# Each prototype groups its images. `refs` are research-atlas reference ids
# (micro/research/assets/references/manifest.json) and `concepts` are concept
# board files (micro/research/assets/concepts/).
GROUPS = [
    {
        "title": "Launcher cards",
        "intro": "One card per prototype on the prototypes page (micro/prototypes/). Until they arrive each card shows a live-drawn thumbnail colour and its title.",
        "items": [
            {
                "id": "MP-U01", "name": "Mite card (SEM)",
                "file": "assets/cards/mite.webp", "size": "1200 x 800, opaque",
                "used": "The Mite card on the prototypes page.",
                "standin": "A grey gradient with the title.",
                "refs": ref("mite", "moss", "tardigrade-sem"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{CARD} {SEM} An armoured oribatid moss mite (box-mite, family Phthiracaridae: a smooth domed notogaster about 0.6 mm long, eight short jointed legs, a hinged prodorsum, a few stiff setae) walking over a dry moss leaf edge among fungal hyphae and angular mineral grains, three-quarter view from slightly above, the mite in the left half of the frame. Exactly eight legs, each with five visible segments and a single claw. {SCIENCE}",
            },
            {
                "id": "MP-U02", "name": "Tardigrade card",
                "file": "assets/cards/tardigrade.webp", "size": "1200 x 800, opaque",
                "used": "The Tardigrade card on the prototypes page.",
                "standin": "A grey-green gradient with the title.",
                "refs": ref("tardigrade-light", "tardigrade-sem", "moss"), "concepts": ["02-waterfilm.webp"],
                "prompt": f"{CARD} {DIC} A moss-dwelling tardigrade (a eutardigrade about 0.35 mm long: plump segmented body, exactly four pairs of stubby unjointed lobopod legs, the fourth pair pointing backwards at the rear end, each leg ending in hooked double claws, a pale translucent body with greenish gut contents and two dark eye-spots) gripping the ridged cell walls of a moss leaf lamina under a thin film of water, the long rectangular leaf cells receding diagonally. {SCIENCE}",
            },
            {
                "id": "MP-U03", "name": "Amoeba card",
                "file": "assets/cards/amoeba.webp", "size": "1200 x 800, opaque",
                "used": "The Amoeba card on the prototypes page.",
                "standin": "A pale warm gradient with the title.",
                "refs": ref("amoeba", "paramecium", "spirogyra"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{CARD} {BRIGHTFIELD} Amoeba proteus about 400 µm across with several broad blunt pseudopods, a clear hyaline cap at each advancing tip, granular streaming endoplasm, one disc-shaped nucleus and a round contractile vacuole, two pseudopods curving to form a food cup around a small green flagellate. A strand of Spirogyra with its spiral chloroplast crosses the background out of focus. {SCIENCE}",
            },
            {
                "id": "MP-U04", "name": "Paramecium card",
                "file": "assets/cards/paramecium.webp", "size": "1200 x 800, opaque",
                "used": "The Paramecium card on the prototypes page.",
                "standin": "A dark blue gradient with the title.",
                "refs": ref("paramecium", "spirogyra", "vorticella"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{CARD} {DARKFIELD} Paramecium caudatum about 230 µm long, slipper-shaped with a blunt front and a tapered rear, an oral groove running diagonally along one side, a dense coat of short cilia shimmering as a fine bright fringe, two star-shaped contractile vacuoles and many food vacuoles inside, swimming in a gentle helical path past green Spirogyra filaments and a cluster of bell-shaped Vorticella on stalks. A faint motion trail of displaced particles behind it. {SCIENCE}",
            },
        ],
    },
    {
        "title": "Mite (SEM)",
        "intro": "Textures for the scanning-electron-microscope mite prototype. The moss, grains and mite are geometry built in code; these add surface detail and a far backdrop. Greyscale only.",
        "items": [
            {
                "id": "MP-M01", "name": "SEM moss leaf surface",
                "file": "assets/mite/sem-moss-leaf.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "Detail texture on the moss leaf blades the mite walks over.",
                "standin": "Procedural elongated cell pattern with bright cell walls.",
                "refs": ref("moss", "tardigrade-sem", "biofilm-sem"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{TILE} {SEM} The dried surface of a moss leaf (Bryum or Sphagnum-like lamina) at about 300 µm across: long narrow rhomboid cells in parallel rows, each cell slightly sunken with raised cell-wall ridges between them, occasional papillae and a few scattered bacteria and fungal spores. The cell rows run vertically in the image.",
            },
            {
                "id": "MP-M02", "name": "SEM litter and mineral grains",
                "file": "assets/mite/sem-litter.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The ground plane between moss stems.",
                "standin": "Procedural grains and noise.",
                "refs": ref("biofilm-sem", "moss"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{TILE} {SEM} Soil and leaf litter at about 2 mm across: angular quartz and clay mineral grains from 20 to 200 µm, flakes of decomposing leaf with visible cell outlines, a loose net of fungal hyphae 3 to 5 µm thick draped between grains, a few round fungal spores and pollen grains.",
            },
            {
                "id": "MP-M03", "name": "SEM oribatid cuticle",
                "file": "assets/mite/sem-cuticle.webp", "size": "1024 x 1024, opaque, tileable",
                "used": "Detail texture on the mite's notogaster and leg segments.",
                "standin": "Procedural fine pitting and sockets.",
                "refs": ref("mite", "tardigrade-sem"), "concepts": ["01-moss-frontier.webp"],
                "prompt": f"{TILE} {SEM} The sclerotised cuticle of an oribatid mite's notogaster at about 100 µm across: a smooth gently curved hard surface with fine shallow pits (foveae), a faint cerotegument crust in patches, and a few setal sockets (small raised rings) spaced widely. No whole animal.",
            },
            {
                "id": "MP-M04", "name": "SEM moss forest backdrop",
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
                "id": "MP-T01", "name": "Moss lamina cells (DIC)",
                "file": "assets/tardigrade/lamina-dic.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "Surface of the leaf the tardigrade climbs on.",
                "standin": "Procedural cell walls with directional relief.",
                "refs": ref("moss", "tardigrade-light"), "concepts": ["02-waterfilm.webp"],
                "prompt": f"{TILE} {DIC} A single-cell-thick moss leaf lamina at about 400 µm across: long rectangular to rhomboid cells 15 to 25 µm wide and 60 to 120 µm long in parallel rows running vertically, thick bright cell walls, each cell holding a few lens-shaped green chloroplasts pressed against the wall. Faint colour only in the chloroplasts.",
            },
            {
                "id": "MP-T02", "name": "Sphagnum hyaline cells (DIC)",
                "file": "assets/tardigrade/sphagnum-dic.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "A second leaf type, with big water-holding cells and pores.",
                "standin": "Procedural large cells with fibril bands.",
                "refs": ref("moss"), "concepts": ["02-waterfilm.webp"],
                "prompt": f"{TILE} {DIC} A Sphagnum leaf at about 400 µm across: large empty hyaline cells with spiral fibril reinforcing bands and round pores, framed by a network of narrow green chlorophyllose cells between them, as in the classic Sphagnum leaf micrograph.",
            },
            {
                "id": "MP-T03", "name": "Water-film backdrop",
                "file": "assets/tardigrade/film-backdrop.webp", "size": "2560 x 1440, opaque",
                "used": "Out-of-focus plate behind the climbing plane.",
                "standin": "Soft gradient with blurred leaf shapes.",
                "refs": ref("moss", "tardigrade-light", "rotifer"), "concepts": ["02-waterfilm.webp"],
                "prompt": f"{DIC} A deeply out-of-focus view through a wet moss cushion at about 2 mm across: overlapping translucent leaf blades with cell rows, curved water menisci between them catching light, a bdelloid rotifer barely visible as a blur. Very shallow depth of field, everything soft. No tardigrade. {SCIENCE}",
            },
            {
                "id": "MP-T04", "name": "Detritus and food particles",
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
                "id": "MP-A01", "name": "Wet-mount background (brightfield)",
                "file": "assets/amoeba/wetmount.webp", "size": "2048 x 2048, opaque, tileable",
                "used": "The slide the amoeba crawls over.",
                "standin": "Procedural pale field with soft detritus.",
                "refs": ref("amoeba", "spirogyra", "diatoms"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{TILE} {BRIGHTFIELD} A pond-water wet mount at about 1 mm across, seen at the glass: a pale even field with scattered small brown detritus flakes, a few bacteria clumps, empty diatom frustules and out-of-focus specks, sparse enough that most of the image is clear background. No large organisms.",
            },
            {
                "id": "MP-A02", "name": "Amoeba cytoplasm granules",
                "file": "assets/amoeba/cytoplasm.webp", "size": "1024 x 1024, opaque, tileable",
                "used": "Granular endoplasm texture that streams inside the amoeba.",
                "standin": "Procedural granule noise.",
                "refs": ref("amoeba"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{TILE} {BRIGHTFIELD} The granular endoplasm of Amoeba proteus at about 80 µm across: densely packed tiny refractile granules and crystals 1 to 3 µm, a few small food vacuoles and lipid droplets, colourless to faint grey-yellow, on a pale field.",
            },
            {
                "id": "MP-A03", "name": "Algal filament backdrop",
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
                "id": "MP-P01", "name": "Pond habitat plate (darkfield)",
                "file": "assets/paramecium/darkfield-plate.webp", "size": "2560 x 1440, opaque",
                "used": "The far background in darkfield mode.",
                "standin": "Black field with procedural scattering specks.",
                "refs": ref("spirogyra", "vorticella", "diatoms"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{DARKFIELD} A pond-water scene at about 2 mm across, out of focus: Spirogyra filaments, flakes of detritus and a cluster of stalked Vorticella, all as glowing edges on black. No Paramecium. {SCIENCE}",
            },
            {
                "id": "MP-P02", "name": "Pond habitat plate (phase contrast)",
                "file": "assets/paramecium/phase-plate.webp", "size": "2560 x 1440, opaque",
                "used": "The far background in phase-contrast mode.",
                "standin": "Mid-grey field with procedural haloed specks.",
                "refs": ref("spirogyra", "vorticella", "paramecium"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"Phase-contrast microscope look: mid-grey background, transparent structures dark with bright halos at their edges, colourless. The same pond-water scene at about 2 mm across, out of focus: Spirogyra filaments, detritus flakes and stalked Vorticella. No Paramecium. {SCIENCE}",
            },
            {
                "id": "MP-P03", "name": "Paramecium pellicle",
                "file": "assets/paramecium/pellicle.webp", "size": "1024 x 1024, opaque, tileable",
                "used": "Surface pattern on the cell body under the cilia.",
                "standin": "Procedural kinety rows.",
                "refs": ref("paramecium"), "concepts": ["03-protist-garden.webp"],
                "prompt": f"{TILE} The pellicle of Paramecium at about 40 µm across as seen in silver-stained or SEM preparations: a regular lattice of hexagonal to rhomboid alveolar units in long parallel rows (kineties) running vertically, a cilium base at the centre of each unit, faint grey on light grey. {SCIENCE}",
            },
        ],
    },
]


def load_refs() -> dict:
    return {r["id"]: r for r in json.loads(MANIFEST.read_text())}


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
                r = refs[rid]
                out.append(
                    f"  - [{r['note']}](../research/{r['local']}) · {r['author']}, {r['license']} · [source]({r['source']})"
                )
            for c in i.get("concepts", []):
                out.append(f"  - Concept board (mood only): [`{c}`](../research/assets/concepts/{c})")
            out += ["", "```text", i["prompt"], "```", ""]
    return "\n".join(out)


def main() -> int:
    outputs = {DOC: document(), ASSET_LIST: asset_list()}
    if "--check" in sys.argv:
        stale = [p for p, text in outputs.items() if not p.exists() or p.read_text() != text]
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT.parent)}")
        return 1 if stale else 0
    for p, text in outputs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        print(f"wrote {p.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
