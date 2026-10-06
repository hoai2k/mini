#!/usr/bin/env python3
"""Generate the Gliders image requests and the game's asset list.

Edit the data in this file, then run:

    python3 gliders/design/source/build_requests.py          # write
    python3 gliders/design/source/build_requests.py --check  # verify up to date

Outputs:
    gliders/design/image-requests.md   the request document
    gliders/game/src/asset-list.js     what the game loads

Statuses:
    requested  the game draws its own stand-in and does not try to load the file
    delivered  the file is in gliders/game/assets/ and the game loads it in
               place of the stand-in
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
ASSET_LIST = ROOT / "game" / "src" / "asset-list.js"

# The look every image shares. The levels are built in code from flat-coloured
# blocks, so the art should feel like it belongs to the same world.
WORLD = (
    "The world of Gliders: huge abstract structures of clean geometric blocks (towers, arches, "
    "hollow frames, tunnels, slabs and spires) floating in an endless soft sky above a sea of "
    "clouds, in the style of the game Superflight. The blocks are flat-coloured with crisp edges "
    "and soft light, in a vivid but harmonious palette (coral, tangerine, butter yellow, mint, "
    "teal, periwinkle, lilac), fading into pastel atmospheric haze with distance."
)

ART_STYLE = (
    "Polished stylised 3D render, like key art for an indie flying game: soft global "
    "illumination, gentle rim light, clean shapes, rich but not garish colour, strong sense of "
    "speed and depth. The animals are appealing stylised versions of the real species, "
    "anatomically recognisable, not cartoon mascots with human expressions. No text, no "
    "watermark, no UI, no photographic noise."
)

LOGO_STYLE = (
    "A polished video-game title logo. Clean, bold, slightly italic geometric letterforms with a "
    "subtle bevel, as if cut from the same coloured blocks as the game's world: each letter a "
    "different colour of the palette coral, tangerine, butter yellow, mint, teal, periwinkle, "
    "lilac, with a thin white highlight on the top edges and a soft deep-indigo outline and drop "
    "shadow so it reads on both a bright sky and a dark screen. No other text, no watermark."
)

ALPHA = (
    "Transparent background (PNG with alpha). If transparency is not possible, use a flat pure "
    "magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on "
    "integration."
)

PORTRAIT = (
    "Character badge for the player HUD and results podium: the animal alone, gliding toward "
    "the viewer at a three-quarter angle from slightly above, wings or fins fully spread, filling "
    "about 85% of a square frame, centred, with a clean silhouette that reads at 64 px. "
    "Lit by a warm sun from the upper left with a cool sky fill. " + ALPHA
)

SECTIONS = {
    "ui": ("Brand", "The title screen, the browser tab and the game library card."),
    "portrait": (
        "Glider portraits",
        "One badge per playable glider. The models in play are built in code; these badges "
        "stand for each glider in the HUD, on the character cards and on the results podium.",
    ),
}

REQUESTS = [
    {
        "id": "GL-U01",
        "section": "ui",
        "name": "Title logo",
        "key": "logo",
        "file": "assets/ui/logo.png",
        "size": "1600 x 640, transparent",
        "used": "The title screen above Press Start, the pause menu header, and the card on the game library page.",
        "standin": "The word GLIDERS set in the page's font, each letter a different block colour.",
        "status": "requested",
        "prompt": LOGO_STYLE + " The single word \"GLIDERS\" in capitals, spelled exactly G-L-I-D-E-R-S. "
        "A soft swoosh of contrail curves from under the G up and over the word to end in a small "
        "sparkle above the final S, as if something just glided past. Wide landscape composition, "
        "the word filling about 85% of the width, even margins. " + ALPHA,
    },
    {
        "id": "GL-U02",
        "section": "ui",
        "name": "Title background",
        "key": "titleBg",
        "file": "assets/ui/title-bg.webp",
        "size": "1920 x 1080, opaque",
        "used": "Full-screen behind the title screen; also the cover of the game library card.",
        "standin": "A live flyover of the first level with a glider circling through it.",
        "status": "requested",
        "prompt": ART_STYLE + " " + WORLD + " A wide establishing view: in the middle distance a "
        "flying squirrel and a four-winged Microraptor glide side by side through a tall coral "
        "and teal arch, trailing thin glowing contrails (one aqua, one gold), while a flying fish "
        "with its blue pectoral fins spread skims past a tangerine tower in the foreground on the "
        "right. Bright late-afternoon light, peach and lavender sky, clouds far below. Keep the "
        "upper-middle third calm and open (soft sky and distant blocks only) for the logo, and "
        "the bottom-right corner quiet for buttons. Full-bleed 16:9, no border.",
    },
    {
        "id": "GL-U03",
        "section": "ui",
        "name": "App icon and favicon",
        "key": "icon",
        "file": "assets/ui/icon.png",
        "size": "1024 x 1024, transparent",
        "used": "Browser tab, home-screen icon (scaled to 512, 192 and 180 px) and the HUD's pause badge.",
        "standin": "A drawn SVG icon: a white glider silhouette on a coral-to-violet rounded square.",
        "status": "requested",
        "prompt": ART_STYLE + " App icon: a stylised flying squirrel seen from below and slightly "
        "behind, gliding up and to the right with its membrane fully spread, over a single "
        "mint-green block arch, on a rounded-square tile with a coral-to-violet sky gradient. "
        "Bold, simple, readable at 48 px; the squirrel fills about 70% of the tile. The rounded "
        "square fills the frame with transparent corners. " + ALPHA.replace("Transparent background", "Transparent corners"),
    },
    {
        "id": "GL-P01",
        "section": "portrait",
        "name": "Flying Squirrel",
        "key": "portrait.squirrel",
        "file": "assets/portraits/squirrel.png",
        "size": "512 x 512, transparent",
        "used": "The Flying Squirrel badge.",
        "standin": "A snapshot of the in-game 3D model, taken when the game loads.",
        "status": "requested",
        "prompt": ART_STYLE + " A northern flying squirrel (Glaucomys) with soft grey-brown back "
        "fur, cream belly, big dark glossy eyes, its furry gliding membrane stretched taut between "
        "wrists and ankles, flat fluffy tail streaming behind. " + PORTRAIT,
    },
    {
        "id": "GL-P02",
        "section": "portrait",
        "name": "Microraptor",
        "key": "portrait.microraptor",
        "file": "assets/portraits/microraptor.png",
        "size": "512 x 512, transparent",
        "used": "The Microraptor badge.",
        "standin": "A snapshot of the in-game 3D model, taken when the game loads.",
        "status": "requested",
        "prompt": ART_STYLE + " A Microraptor gui, the small four-winged feathered dinosaur: long "
        "flight feathers on both arms and legs forming four wings, a long tail ending in a "
        "feather fan, toothed narrow snout, iridescent glossy black plumage with blue-green sheen, "
        "alert amber eye. " + PORTRAIT,
    },
    {
        "id": "GL-P03",
        "section": "portrait",
        "name": "Flying Fish",
        "key": "portrait.flyingfish",
        "file": "assets/portraits/flyingfish.png",
        "size": "512 x 512, transparent",
        "used": "The Flying Fish badge.",
        "standin": "A snapshot of the in-game 3D model, taken when the game loads.",
        "status": "requested",
        "prompt": ART_STYLE + " A flying fish (Exocoetidae): streamlined body, deep cobalt-blue back "
        "fading to silver belly, huge translucent blue pectoral fins spread like wings with fine "
        "fin rays, smaller pelvic fins spread too, forked tail with a longer lower lobe, a few "
        "water droplets flying off. " + PORTRAIT,
    },
    {
        "id": "GL-P04",
        "section": "portrait",
        "name": "Draco Lizard",
        "key": "portrait.draco",
        "file": "assets/portraits/draco.png",
        "size": "512 x 512, transparent",
        "used": "The Draco Lizard badge.",
        "standin": "A snapshot of the in-game 3D model, taken when the game loads.",
        "status": "requested",
        "prompt": ART_STYLE + " A Draco volans flying lizard: slender mottled brown-green body, long "
        "thin tail, its rib-supported patagium wings spread wide on both sides, bright orange "
        "with black bars and yellow edges, small yellow throat dewlap extended. " + PORTRAIT,
    },
    {
        "id": "GL-P05",
        "section": "portrait",
        "name": "Flying Frog",
        "key": "portrait.frog",
        "file": "assets/portraits/frog.png",
        "size": "512 x 512, transparent",
        "used": "The Flying Frog badge.",
        "standin": "A snapshot of the in-game 3D model, taken when the game loads.",
        "status": "requested",
        "prompt": ART_STYLE + " Wallace's flying frog: bright leaf-green back, yellow flanks, large "
        "dark gold-rimmed eyes, all four limbs splayed with enormous webbed feet, the webbing "
        "black with yellow streaks, used as parachutes, skin flaps along the forearms. " + PORTRAIT,
    },
    {
        "id": "GL-P06",
        "section": "portrait",
        "name": "Paradise Tree Snake",
        "key": "portrait.snake",
        "file": "assets/portraits/snake.png",
        "size": "512 x 512, transparent",
        "used": "The Paradise Tree Snake badge.",
        "standin": "A snapshot of the in-game 3D model, taken when the game loads.",
        "status": "requested",
        "prompt": ART_STYLE + " A paradise tree snake (Chrysopelea paradisi) gliding: its body "
        "flattened into a ribbon and bent into a wide S-shaped wave, black scales edged in "
        "bright green with a row of red-orange spots along the back, head raised and looking "
        "forward. " + PORTRAIT,
    },
]


def asset_list() -> str:
    data = {
        r["key"]: {"file": r["file"], "delivered": r["status"] == "delivered"} for r in REQUESTS
    }
    return (
        "// Generated by gliders/design/source/build_requests.py. Do not edit by hand:\n"
        "// change the data there and rerun it. A delivered asset is loaded in place of\n"
        "// its stand-in; a requested one is not loaded at all.\n"
        "export const ASSETS = " + json.dumps(data, indent=2) + ";\n"
    )


def document() -> str:
    delivered = sum(r["status"] == "delivered" for r in REQUESTS)
    out = [
        "# Gliders: image requests",
        "",
        "Artwork for Gliders in `gliders/`. Generated from `source/build_requests.py`; edit the "
        "data there and rerun it, which also rewrites `gliders/game/src/asset-list.js`.",
        "",
        "## How to use this list",
        "",
        "1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.",
        "2. Save each image under the file name in its **File** line and drop it in `gliders/intake/`. On integration "
        "it moves to that path under `gliders/game/`, its status flips to `delivered` and the game loads it in place "
        "of its stand-in.",
        "3. Logos, icons and portraits need transparency. If the generator cannot produce alpha, use a flat pure "
        "magenta `#FF00FF` background as the prompts say; it is keyed out on integration.",
        "4. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.",
        "5. Nothing here blocks the game: the levels and the gliders are built in code, and every image has a stand-in.",
        "",
        "## Status",
        "",
        f"{len(REQUESTS) - delivered} requested, {delivered} delivered, {len(REQUESTS)} in total.",
        "",
    ]
    for key, (title, blurb) in SECTIONS.items():
        out += [f"## {title}", "", blurb, ""]
        for r in (r for r in REQUESTS if r["section"] == key):
            out += [
                f"### {r['id']} · {r['name']}",
                "",
                f"- **File:** `gliders/game/{r['file']}`",
                f"- **Size:** {r['size']}",
                f"- **Used for:** {r['used']}",
                f"- **Stand-in until delivered:** {r['standin']}",
                f"- **Status:** {r['status']}",
                "",
                "```text",
                r["prompt"],
                "```",
                "",
            ]
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    outputs = {DOC: document(), ASSET_LIST: asset_list()}
    if "--check" in sys.argv:
        stale = [p for p, text in outputs.items() if not p.exists() or p.read_text() != text]
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT.parent)} (rerun build_requests.py)")
        return 1 if stale else 0
    for p, text in outputs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        print(f"wrote {p.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
