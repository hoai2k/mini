#!/usr/bin/env python3
"""Generate the Image Annotator image requests and the app's asset list.

Edit the data below, then run:

    python3 imageannotator/design/source/build_requests.py          # write
    python3 imageannotator/design/source/build_requests.py --check  # verify up to date

Outputs:
    imageannotator/design/image-requests.md    the request document
    imageannotator/app/data/asset-list.json    what the app loads (delivered) or draws itself (requested)

Statuses:
    requested  the app draws a stand-in (inline SVG and CSS) until the file arrives
    delivered  the file is at its path under imageannotator/app/ and the app loads it
    revise     delivered and in use, but a new version is wanted (see its note)

Delivered art goes in imageannotator/intake/; once it is checked and copied to
its path, flip its status here to "delivered" and rerun (for the icon, rerun
make_icons.mjs too). Tool buttons (arrow, circle, pen, undo, settings and the
rest) are inline SVG in the app and need no art.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
ASSET_LIST = ROOT / "app" / "data" / "asset-list.json"

STYLE = (
    "Clean, friendly modern app artwork: a warm off-white and soft charcoal palette with one bold "
    "coral-red accent (#ff4d4f) used for annotation marks, hand-drawn marker strokes with a slightly "
    "imperfect, confident line, flat shapes with gentle soft shadows, crisp edges, generous empty "
    "space. Playful but tidy, like a designer's markup on a photo. No text, no letters, no logos, "
    "no watermark, no frame or border unless the prompt asks for one."
)

ASSETS = [
    # Brand
    dict(id="icon", file="icons/icon-1024.png", size="1024×1024, PNG, full bleed, no transparency", status="delivered", group="Brand",
         prompt="An app icon for a photo markup app: a small square photograph of rolling hills under a "
                "pale sky, tilted a few degrees, with a bold coral-red hand-drawn arrow sweeping in from "
                "the lower right and pointing at a tiny tree on the hill, and a loose coral-red marker "
                "circle around the tree, on a deep charcoal (#1c1d22) ground. Centred, bold, readable at "
                "60 pixels, full bleed with the subject inside the middle 80% so rounded-corner masks "
                "never cut it. " + STYLE,
         note="Home-screen and browser icon; the 512, 192 and 180 px sizes and the favicon are made from it "
              "by design/source/make_icons.mjs. Until it arrives they are made from the SVG stand-in (app/icon.svg)."),
    dict(id="logo", file="assets/ui/logo.webp", size="1200×300, transparent PNG (shipped as WebP, trimmed to the wordmark)", status="revise", group="Brand",
         prompt="The words “Image Annotator” as a clean modern wordmark for a dark app screen, in a friendly "
                "rounded geometric sans serif: “Image” in a heavy weight, solid warm off-white (#f4f2ee); "
                "“Annotator” in the same face at a lighter weight, solid pale grey (#c9c7c2); a short "
                "coral-red (#ff4d4f) hand-drawn marker arrow curving under “Annotator” and pointing up at "
                "its first letter. Solid filled letters with no outline, no dark strokes and no shadow, so it "
                "reads cleanly on a charcoal (#1c1d22) background. Crisp silhouette on a fully transparent "
                "background, centred, no other text.",
         note="Revise (round 2): the delivered wordmark's heavy “Image” is charcoal, so on the app's charcoal "
              "start screen only its thin outline shows. Wanted: the same wordmark with light letters. Shown on the "
              "start screen at about 300 px wide; the current version stays in use until the new one arrives."),
    dict(id="cover", file="assets/ui/cover.webp", size="1200×900 (4:3), WebP", status="delivered", group="Brand",
         prompt="Cover art for a photo markup app on a library shelf: a phone lying on a light wooden desk "
                "showing a holiday photo of a seaside town, the photo marked up with a coral-red arrow, a "
                "loose coral-red circle and a scribbled underline, a few printed photos scattered around "
                "it with similar marker notes. Seen from above, soft daylight. Leave the centre calm so the "
                "app's icon reads over it. " + STYLE,
         note="The card on the game library page (index.html). Until it arrives the card shows a gradient and the SVG icon."),

    # Screens
    dict(id="welcome", file="assets/ui/welcome.webp", size="1200×900 (4:3), transparent PNG (shipped as WebP)", status="delivered", group="Screens",
         prompt="A friendly illustration for the empty start screen of a photo markup app: a stack of three "
                "loose photographs (a mountain, a cat, a city street) fanned out, a coral-red marker pen "
                "lying across them, and a coral-red hand-drawn arrow and circle floating above the top "
                "photo as if just drawn. Isolated on a fully transparent background with a soft grey shadow "
                "under the stack. " + STYLE,
         note="Shown above the “Open an image” button before a picture is opened, at about 260 px wide on a phone. "
              "Until it arrives the screen shows an SVG stand-in."),
]


def render() -> tuple[str, str]:
    requested = [a["id"] for a in ASSETS if a["status"] in ("requested", "revise")]
    lines = [
        "# Image Annotator image requests",
        "",
        "<!-- Generated by imageannotator/design/source/build_requests.py. Edit the data there and rerun. -->",
        "",
        "Generate each image from its prompt and drop the files in `imageannotator/intake/`.",
        "Until a file is delivered the app draws a stand-in, so nothing here blocks use.",
        "Tool buttons (arrow, circle, free draw, undo, settings and the rest) are drawn",
        "as inline SVG in the app and need no art.",
        "",
        "**Round 1:** delivered and in use.",
        "",
        ("**Round 2:** " + str(len(requested)) + " image" + ("s" if len(requested) != 1 else "") + " wanted, marked `requested` or `revise` (see the note)."
         if requested else "**Round 2:** nothing wanted."),
        "",
        "**House style** (already included in every prompt but the logo's): " + STYLE,
        "",
        "| Status | Id | File | Size |",
        "| --- | --- | --- | --- |",
    ]
    for a in ASSETS:
        lines.append(f"| {a['status']} | `{a['id']}` | `app/{a['file']}` | {a['size']} |")
    group = None
    for a in ASSETS:
        if a["group"] != group:
            group = a["group"]
            lines += ["", f"## {group}"]
        lines += ["", f"### `{a['id']}` · {a['status']}", "", f"- File: `imageannotator/app/{a['file']}`", f"- Size: {a['size']}"]
        if a.get("note"):
            lines.append(f"- Note: {a['note']}")
        lines += ["", "```text", a["prompt"], "```"]
    doc = "\n".join(lines) + "\n"
    assets = json.dumps([{"id": a["id"], "file": a["file"], "status": a["status"]} for a in ASSETS], indent=2) + "\n"
    return doc, assets


def main() -> int:
    doc, assets = render()
    if "--check" in sys.argv:
        stale = [p for p, text in ((DOC, doc), (ASSET_LIST, assets)) if not p.exists() or p.read_text(encoding="utf-8") != text]
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT.parent)} (run build_requests.py)")
        missing = [a["file"] for a in ASSETS if a["status"] == "delivered" and not (ROOT / "app" / a["file"]).exists()]
        for f in missing:
            print(f"delivered but missing: app/{f}")
        return 1 if stale or missing else 0
    DOC.write_text(doc, encoding="utf-8")
    ASSET_LIST.write_text(assets, encoding="utf-8")
    print(f"wrote {DOC.relative_to(ROOT.parent)} and {ASSET_LIST.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
