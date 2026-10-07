#!/usr/bin/env python3
"""Generate the One Monster After Another image requests and the game's asset list.

Edit the data in this file, then run:

    python3 onemonster/design/source/build_requests.py          # write
    python3 onemonster/design/source/build_requests.py --check  # verify up to date

Outputs:
    onemonster/design/image-requests.md   the request document
    onemonster/game/src/asset-list.js     what the game loads

Statuses:
    requested  the game draws its own stand-in and does not try to load the file
    delivered  the file is in onemonster/game/assets/ and the game loads it in place
               of the stand-in
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
ASSET_LIST = ROOT / "game" / "src" / "asset-list.js"

# The look every image shares: a 1970s Golden Book, dense ink under faded washes.
STYLE = (
    "Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One "
    "Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur "
    "drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling "
    "strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, "
    "lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey "
    "for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, "
    "hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no "
    "watermark, no border, no UI."
)

# Where the reference photos of the book live once pushed (onemonster/reference/).
REF_URL = "https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/"
REF = (
    "Match the design of this monster in the reference photo of the book, " + REF_URL + "{0} , "
    "keeping its shapes, colours and proportions, but as a clean new full-colour drawing of the "
    "monster alone (no book, page, hands, other monsters or printed text)."
)
REF_STYLE = (
    "No picture of this monster from the book was available, so the design here is our own: "
    "draw it as a monster from the same book, matching the drawing style, palette and mood of "
    "the reference photo " + REF_URL + "{0} ."
)
REF_SCENE = (
    "For the drawing style, palette and mood, look at the reference photo of the book, "
    + REF_URL + "{0} ."
)

MONSTER = (
    "A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or "
    "put-upon rather than frightening, with pink snout, paws and feet where it has them."
)

ALPHA = (
    "Transparent background (PNG with alpha). If transparency is not possible, use a flat pure "
    "magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on "
    "integration."
)

PORTRAIT = (
    "Full-body portrait of the monster alone in a lively three-quarter pose facing right, "
    "filling about 80% of a square frame, centred, with a clean silhouette that still reads at "
    "96 px. Only a small soft shadow under it. " + ALPHA
)

SCENE = (
    "Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of "
    "monsters, people and animals (the game draws them on top). "
)

STORY = (
    "A full-bleed story-page painting, wide 16:9, in the book's layout: the picture fills the top "
    "three-quarters and the bottom quarter is left as a plain flat cream band for the game's "
    "text. "
)

SECTIONS = {
    "ui": ("Brand", "The title screen, the browser tab, the game library card, the letter and the postmark."),
    "monster": (
        "Monster portraits",
        "One portrait per monster, in the order the letter meets them. Each is shown large on the "
        "monster's name card and is the monster itself in its chapter, where the game moves, tilts "
        "and squashes it.",
    ),
    "scene": (
        "Chapter scenes",
        "One background per chapter. The game draws the monsters and everything that moves on "
        "top, so each scene leaves the play area quiet, as its prompt says.",
    ),
    "story": (
        "Story pages",
        "The prologue and the epilogue, shown as picture-book pages with the game's text in the "
        "cream band at the bottom.",
    ),
}

# Each monster: id (also the file name), name, the reference photo in
# onemonster/reference/, whether that photo shows this monster ("seen") or only
# the style (False), "shaggy": False for monsters that are not furry beasts,
# the portrait description and its chapter scene. Order is
# the order the letter meets them in the book; see onemonster/reference/README.md.
MONSTERS = [
    {
        "id": "trollusk",
        "name": "The Stamp-Collecting Trollusk",
        "ref": "cover-golden-book-1974.jpg",
        "seen": True,
        "look": "The Stamp-Collecting Trollusk, as on the book's cover: a squat, shaggy monster "
        "covered in long dark-brown fur, with a long pink pig-like snout, one white tusk, big "
        "pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a squashed "
        "blue-grey cap and a yellow bib lettered STAMPS across his chest (the only lettering "
        "allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest "
        "with a smirk on his snout.",
        "scene": "A sunny small-town street seen side-on: a row of wooden porches with turned "
        "posts, hanging flower baskets, flowerbeds and low bushes spaced along the bottom third, "
        "a picket fence, and a blue curbside mailbox on a post at the far right. Leafy trees and a "
        "pale lilac sky above. Keep the ground strip along the bottom clear to walk on.",
        "used": "Before the Mailman Comes, the sneaking game",
    },
    {
        "id": "bombanat",
        "name": "The Letter-Eating Bombanat",
        "ref": "cover-golden-book-1974.jpg",
        "seen": True,
        "look": "The Letter-Eating Bombanat, the bat-winged flier on the book's cover: huge mauve "
        "bat wings with thin finger bones and little claws at the tips, a long pink "
        "crocodile-like snout full of small sharp teeth, a sly frowning eye, a tuft of dark fur "
        "on the chest, a red-and-white striped necktie, a pink striped cap with a yellow flower "
        "on top, and clawed pink feet. Flying with wings spread, a white envelope in his teeth.",
        "scene": "The Blue Ocean of Bubbley Goo seen side-on: a thick, glossy blue-and-teal sea "
        "of goo along the bottom quarter, full of round bubbles of every size, some swelling, "
        "some popping, under a wide pale mauve sky with long curling clouds. A far-off shore on "
        "the horizon. Keep the whole sky open, because the Bombanat flies through it.",
        "used": "Over the Bubbley Goo, the flying game",
    },
    {
        "id": "grumley",
        "name": "The Bombanat-Munching Grumley",
        "ref": "cover-golden-book-1974.jpg",
        "seen": True,
        "look": "The Bombanat-Munching Grumley, as the big shaggy monster at the left of the "
        "book's cover: a huge, round, lumpy body of curly ochre-yellow fur, a wide grinning mouth "
        "with two great white tusks, a broad pink snout, heavy-lidded greedy eyes, a white napkin "
        "tied round his neck and a big fork held up in one pink paw, ready for lunch. Show him "
        "rising chest-deep out of glossy blue goo, dripping, reaching up with his free paw.",
        "scene": "Close to the surface of the Blue Ocean of Bubbley Goo: glossy blue-and-teal goo "
        "with bubbles across the bottom third, a small rocky shore at the left edge with a "
        "picnic basket and a checked cloth, and a big open lilac sky above with a few curling "
        "clouds. Keep the sky open, because Bombanats fly through it.",
        "used": "A Nice Bombanat Lunch, the grabbing game",
        "note": "That the cover's yellow monster is the Grumley is inferred from his napkin and "
        "fork, not confirmed; check the Internet Archive scan.",
    },
    {
        "id": "iceferg",
        "shaggy": False,
        "name": "The Furious-Floating Ice-Ferg",
        "ref": "typhoonigator-spread.jpg",
        "seen": False,
        "look": "The Furious-Floating Ice-Ferg: a craggy iceberg in a terrible temper, its "
        "pale-blue and white ice drawn in crosshatched facets, with a furious face in the front: "
        "two glaring eyes under a jutting frowning brow of ice, a scowling mouth with icicle "
        "teeth, little puffs of cold steam from its nostrils, and the dark underwater part of it "
        "showing below a band of choppy sea.",
        "scene": "The open sea seen from high above: slate-blue and teal water drawn as rows of "
        "curling strokes, a few streaks of foam and long current lines, a harbour with a "
        "lighthouse and jetty along the top edge, and scattered rocks near the sides. Keep the "
        "middle of the sea open, because the iceberg and the ships move there.",
        "used": "Furious Floating, the ramming game",
    },
    {
        "id": "typhoonigator",
        "shaggy": False,
        "name": "The Wild-'n-Windy Typhoonigator",
        "ref": "typhoonigator-spread.jpg",
        "seen": True,
        "look": "The Wild-'n-Windy Typhoonigator, as on the book's page-20 spread: a storm cloud "
        "with a face, its body and hair billowing grey-brown and lilac cloud, clawed cloud hands "
        "at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a "
        "long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a "
        "streaked blue-grey water spout.",
        "scene": "A wide stormy sea seen from above at a slant: slate-blue and teal water drawn "
        "as rows of curling strokes, spray and foam, a heavy lilac-and-grey sky at the top, and "
        "at the far right a strip of bumpy brown land with a signpost, the edge of Nowhere. Keep "
        "the middle open, because the Typhoonigator and the flotsam move there.",
        "used": "Suck It All Up, the inhaling game",
    },
    {
        "id": "yalapappus",
        "name": "The Paper-Munching Yalapappus",
        "ref": "cover-golden-book-1974.jpg",
        "seen": False,
        "look": "The Paper-Munching Yalapappus: a round, pear-shaped, shaggy monster in mottled "
        "mauve and dusty-pink fur, on short stumpy legs with big pink paws, with a wide flat "
        "munching mouth full of square teeth, a little pink snout, droopy ears, round "
        "heavy-lidded eyes and a tuft of hair on top. He is trundling along at a run, a scrap of "
        "paper half-munched in his mouth.",
        "scene": "The edge of Nowhere seen side-on: bumpy, scrubby brown-and-ochre ground with "
        "rocks, holes and tufts of grass along the bottom third, a crooked signpost, a few bare "
        "twisted trees, and a wide pale lilac sky with curling clouds. Keep the ground strip "
        "clear for running and the sky open above it.",
        "used": "Munch and Chase, the chasing game",
    },
    {
        "id": "grithix",
        "name": "The Bombanat-Collecting Grithix",
        "ref": "forest-spread-unidentified.jpg",
        "seen": False,
        "look": "The Bombanat-Collecting Grithix: a tall, gangly, long-armed monster in olive "
        "and sage-green fur with a long knobbly nose, bushy eyebrows over beady pleased eyes, a "
        "satchel of glass collecting jars across his chest and a big butterfly net held high in "
        "one long pink hand, mid-swing.",
        "scene": "A clearing in a thick wood: gnarled trees and dense ferns and leaves framing "
        "the left, right and top edges, a mossy floor across the bottom third, and an "
        "official-looking blue mailbox on a post at the right edge. Keep the middle of the "
        "clearing open, because Bombanats fly through it and the Grithix runs about.",
        "used": "Net Them All, the netting game",
    },
]

# One-word reminders of what each monster is, for the prompts that show them together.
WHAT = {
    "trollusk": "a shaggy brown troll with a pink pig snout, a cap and a yellow STAMPS bib",
    "bombanat": "a bat-winged monster with a long toothy snout and a striped necktie",
    "grumley": "a huge shaggy ochre monster with tusks, a napkin and a fork",
    "iceferg": "a furious iceberg with a face",
    "typhoonigator": "a storm cloud with a face and big pink lips",
    "yalapappus": "a round shaggy mauve paper-muncher",
    "grithix": "a tall green monster with a butterfly net",
}

REQUESTS = [
    {
        "id": "OM-U01",
        "section": "ui",
        "name": "Title logo",
        "key": "logo",
        "file": "assets/ui/logo.png",
        "size": "1600 x 800, transparent",
        "used": "The title screen above Press Start, and the card on the game library page.",
        "standin": "The title set in a bold serif in yellow on a black arch.",
        "ref": "cover-golden-book-1974.jpg",
        "status": "requested",
        "prompt": "A picture-book title like the cover of a 1974 Golden Book: chunky, bouncy, "
        "slightly wobbly display letters with rounded serifs, in warm yellow with a thin dark "
        "outline, set along a gentle upward arch on a solid black arched band. One line, spelled "
        "exactly: \"One Monster After Another\". A small white envelope with a red stamp is "
        "tucked under the end of the arch, a pink monster claw pinching its corner. For the "
        "lettering, see the book's cover: " + REF_URL + "cover-golden-book-1974.jpg (do not copy "
        "it, make a new title in the same spirit). Wide landscape composition, the band filling "
        "about 90% of the width, even margins, no other text. " + ALPHA,
    },
    {
        "id": "OM-U02",
        "section": "ui",
        "name": "Title background",
        "key": "titleBg",
        "file": "assets/ui/title-bg.webp",
        "size": "1920 x 1080, opaque",
        "used": "Full-screen behind the title screen; also the cover of the game library card.",
        "standin": "A painted-in-code wood under a lilac sky.",
        "ref": "cover-golden-book-1974.jpg",
        "status": "requested",
        "prompt": STYLE + " A wide wooded landscape like the book's cover: tangled trees and "
        "dense leafy undergrowth at the sides and bottom, distant hills, and a dusty lilac and "
        "pink sky. A chain of monsters chases a single white envelope across the picture from "
        "left to right, each one grabbing for it: "
        + "; ".join(WHAT[m["id"]] for m in MONSTERS)
        + ". The monsters are small, in the lower third and at the sides. Keep the upper-middle "
        "half calm and open (plain sky) for the title, and the bottom-right corner quiet for "
        "buttons. Full-bleed 16:9. " + REF_SCENE.format("cover-golden-book-1974.jpg"),
    },
    {
        "id": "OM-U03",
        "section": "ui",
        "name": "App icon and favicon",
        "key": "icon",
        "file": "assets/ui/icon.png",
        "size": "1024 x 1024, transparent",
        "used": "Browser tab, home-screen icon (scaled to 512, 192 and 180 px).",
        "standin": "A drawn icon: a white envelope with a red stamp and a pink claw on a cream tile.",
        "ref": "cover-golden-book-1974.jpg",
        "status": "requested",
        "prompt": STYLE.replace("No text, no lettering, no watermark, no border, no UI.", "")
        + "App icon: the head of the Stamp-Collecting Trollusk from the book's cover ("
        + REF_URL + "cover-golden-book-1974.jpg ), his pink snout, tusk, pointed ear and "
        "blue-grey cap, with a white envelope with a red stamp clamped in his grin, on a "
        "rounded-square cream tile with a thin black ink border. Bold and simple, readable at "
        "48 px; the head fills about 75% of the tile. No text. Transparent corners outside the "
        "rounded square (PNG with alpha), or flat magenta #FF00FF corners if transparency is not "
        "possible.",
    },
    {
        "id": "OM-U04",
        "section": "ui",
        "name": "The letter",
        "key": "letter",
        "file": "assets/ui/letter.png",
        "size": "512 x 512, transparent",
        "used": "The letter in every chapter, on the route map and on the postmark screen; the "
        "game adds stains, nibbles and postmarks on top.",
        "standin": "A drawn white envelope with a red stamp.",
        "ref": "typhoonigator-spread.jpg",
        "status": "requested",
        "prompt": STYLE.replace("No text, no lettering, no watermark, no border, no UI.", "")
        + "A single old-fashioned white paper envelope, seen straight on and slightly tilted, "
        "with a pointed flap, a small red postage stamp with a scalloped edge in the top right "
        "corner, and a few loops of scribbly handwriting (not readable words) in the middle. Ink "
        "line with light crosshatched shading, crisp and clean. It fills about 80% of the frame. "
        + ALPHA,
    },
    {
        "id": "OM-U05",
        "section": "ui",
        "name": "Postmark",
        "key": "postmark",
        "file": "assets/ui/postmark.png",
        "size": "512 x 512, transparent",
        "used": "Stamped onto the letter for each postmark won; the game tints and rotates it.",
        "standin": "A drawn circle of dark ink with wavy lines.",
        "status": "requested",
        "prompt": "A rubber-stamp postmark in dark grey-black ink, as if stamped on paper: a "
        "double circle with a small monster footprint in the middle, and four wavy cancellation "
        "lines trailing off to the right. Slightly uneven, with the speckled gaps of a real "
        "inked stamp. No letters or numbers. Centred, filling about 80% of the frame. " + ALPHA,
    },
]

for i, m in enumerate(MONSTERS, start=1):
    ref = REF.format(m["ref"]) if m["seen"] else REF_STYLE.format(m["ref"])
    REQUESTS.append({
        "id": f"OM-M{i:02d}",
        "section": "monster",
        "name": m["name"].replace("The ", ""),
        "key": f"monster.{m['id']}",
        "file": f"assets/monsters/{m['id']}.png",
        "size": "1024 x 1024, transparent",
        "used": f"The name card of chapter {i}, and the monster itself in {m['used']}.",
        "standin": "The monster drawn in code from simple shapes with a wobbly ink outline.",
        "status": "requested",
        "ref": m["ref"],
        "note": m.get("note") or (None if m["seen"] else "No picture of this monster was found: "
                                  "the design is ours. Check the Internet Archive scan and adjust "
                                  "the prompt before generating."),
        "prompt": STYLE + " " + (MONSTER + " " if m.get("shaggy", True) else "") + m["look"] + " "
        + PORTRAIT + " " + ref,
    })

for i, m in enumerate(MONSTERS, start=1):
    REQUESTS.append({
        "id": f"OM-S{i:02d}",
        "section": "scene",
        "name": m["name"].replace("The ", "") + " scene",
        "key": f"scene.{m['id']}",
        "file": f"assets/scenes/{m['id']}.webp",
        "size": "1920 x 1080, opaque",
        "used": f"Behind {m['used']}.",
        "standin": "A simple painted-in-code version of the same place.",
        "status": "requested",
        "ref": m["ref"],
        "prompt": STYLE + " " + SCENE + m["scene"] + " " + REF_SCENE.format(m["ref"]),
    })

REQUESTS += [
    {
        "id": "OM-P01",
        "section": "story",
        "name": "Prologue: Sally Ann posts her letter",
        "key": "story.prologue",
        "file": "assets/story/prologue.webp",
        "size": "1920 x 1080, opaque",
        "used": "The opening page of the journey.",
        "standin": "The street scene with a girl and the mailbox drawn in code.",
        "ref": "mailbox-girl-and-trollusk.jpg",
        "status": "requested",
        "note": "Which girl the reference photo shows is not confirmed; Sally Ann's look here is ours.",
        "prompt": STYLE + " " + STORY + "A girl of about eight with short curly red hair, "
        "freckles, a green dress and white socks stands on tiptoe at a blue curbside mailbox in "
        "front of a wooden porch with turned posts and hanging flower baskets, posting a white "
        "envelope. Behind the flowerbed, half hidden, the pink snout and pointed ears of a "
        "shaggy brown monster in a blue-grey cap peek out, watching the letter. Morning light, a "
        "pale lilac sky. " + REF_SCENE.format("mailbox-girl-and-trollusk.jpg"),
    },
    {
        "id": "OM-P02",
        "section": "story",
        "name": "Epilogue: the official mailman",
        "key": "story.mailman",
        "file": "assets/story/mailman.webp",
        "size": "1920 x 1080, opaque",
        "used": "The epilogue page where the mailman takes the letter.",
        "standin": "A mailbox and a motorcycle drawn in code.",
        "ref": "cover-golden-book-1974.jpg",
        "status": "requested",
        "prompt": STYLE + " " + STORY + "At the edge of a wood, a stern little mailman in a "
        "blue uniform, peaked cap and goggles roars up on an official-looking old motorcycle "
        "with a sidecar full of mail sacks, one arm raised and pointing. In front of an "
        "official-looking blue mailbox, three monsters freeze in the act of trying to carry the "
        "mailbox off: " + WHAT["trollusk"] + "; " + WHAT["yalapappus"] + "; "
        + WHAT["bombanat"] + ". At the side, " + WHAT["grithix"] + " walks off home with a "
        "netted Bombanat under one arm, not caring a bit. "
        + REF_SCENE.format("cover-golden-book-1974.jpg"),
    },
    {
        "id": "OM-P03",
        "section": "story",
        "name": "Epilogue: Lucy Jane gets her letter",
        "key": "story.lucyjane",
        "file": "assets/story/lucyjane.webp",
        "size": "1920 x 1080, opaque",
        "used": "The last page of the journey, before the postmark tally.",
        "standin": "The porch and mailbox with a girl drawn in code.",
        "ref": "mailbox-girl-and-trollusk.jpg",
        "status": "requested",
        "prompt": STYLE + " " + STORY + "A girl of about eight with long wavy brown hair, round "
        "glasses, a white top and a pink skirt, barefoot, walks away from a plain blue mailbox on a "
        "post (no lettering) in front of a wooden porch with flower baskets, "
        "reading a crumpled, goo-stained, nibbled letter with a calm, slightly bored face. All "
        "around her, unseen, the monsters from the story peek out of the bushes, the trees and "
        "the sky: " + "; ".join(WHAT[m["id"]] for m in MONSTERS) + ". Warm afternoon light. "
        + REF_SCENE.format("mailbox-girl-and-trollusk.jpg"),
    },
]


def asset_list() -> str:
    data = {
        r["key"]: {"file": r["file"], "delivered": r["status"] == "delivered"} for r in REQUESTS
    }
    return (
        "// Generated by onemonster/design/source/build_requests.py. Do not edit by hand:\n"
        "// change the data there and rerun it. A delivered asset is loaded in place of\n"
        "// its stand-in; a requested one is not loaded at all.\n"
        "export const ASSETS = " + json.dumps(data, indent=2) + ";\n"
    )


def document() -> str:
    delivered = sum(r["status"] == "delivered" for r in REQUESTS)
    out = [
        "# One Monster After Another: image requests",
        "",
        "Artwork for the One Monster After Another game in `onemonster/`. Generated from "
        "`source/build_requests.py`; edit the data there and rerun it, which also rewrites "
        "`onemonster/game/src/asset-list.js`.",
        "",
        "## How to use this list",
        "",
        "1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.",
        "2. Save each image under the file name in its **File** line and drop it in `onemonster/intake/`. On integration "
        "it moves to that path under `onemonster/game/`, its status flips to `delivered` and the game loads it in place "
        "of its stand-in.",
        "3. The logo, icon, letter, postmark and monster portraits need transparency. If the generator cannot produce "
        "alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.",
        "4. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.",
        "5. Nothing here blocks the game: every image has a stand-in drawn in code until it arrives.",
        "6. Each request names a reference photo of the book in `onemonster/reference/`, and its "
        "prompt links to it. Give that photo to the image generator along with the prompt where "
        "it can take an image; the prompt's link works once the photo is on `main`.",
        "7. Some monsters (the Ice-Ferg, the Yalapappus, the Grithix) are not in any photo we "
        "have, and their designs are ours; their requests say so under **Note**. If you can look "
        "at the book (the Internet Archive lends a scan), adjust those prompts to match first.",
        "8. The monster portraits matter most, since each one is both the name card and the "
        "monster in its chapter. If you only make some, start there.",
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
                f"- **File:** `onemonster/game/{r['file']}`",
                f"- **Size:** {r['size']}",
                f"- **Used for:** {r['used']}",
                f"- **Stand-in until delivered:** {r['standin']}",
                *([f"- **Reference:** [`reference/{r['ref']}`](../reference/{r['ref']})"] if r.get("ref") else []),
                *([f"- **Note:** {r['note']}"] if r.get("note") else []),
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
