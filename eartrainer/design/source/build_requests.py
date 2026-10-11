#!/usr/bin/env python3
"""Generate the Ear Trainer image requests and the app's asset list.

Edit the data below, then run:

    python3 eartrainer/design/source/build_requests.py          # write
    python3 eartrainer/design/source/build_requests.py --check  # verify up to date

Outputs:
    eartrainer/design/image-requests.md    the request document
    eartrainer/app/data/asset-list.json    what the app loads (delivered) or draws itself (requested)

Statuses:
    requested  the app draws a stand-in in CSS (styles.css) until the file arrives
    delivered  the file is at its path under eartrainer/app/ and the app loads it

Delivered art goes in eartrainer/intake/; once it is checked and copied to its
path, flip its status here to "delivered" and rerun.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
ASSET_LIST = ROOT / "app" / "data" / "asset-list.json"

STYLE = (
    "Warm late-night jazz-club illustration: deep midnight blue and ink-black shadows, pools of "
    "warm brass and amber lamplight, ivory piano keys, soft film grain, painterly but crisp "
    "shapes in the manner of a 1950s Blue Note record sleeve crossed with modern editorial "
    "illustration. Elegant, calm, inviting. No text, no letters, no logos, no watermark, no "
    "frame or border unless the prompt asks for one."
)

BOOK_STYLE = (
    STYLE + " A single centred emblem on a plain deep midnight-blue (#182033) ground, "
    "readable at 44 pixels, with generous margin."
)

ASSETS = [
    # Title
    dict(id="logo", file="assets/ui/logo.png", size="1600×640, transparent PNG", status="requested", group="Title",
         prompt="The words “Ear Trainer” as a hand-lettered logo: “Ear” in an elegant high-contrast "
                "serif with a soft italic swash, “Trainer” in flowing italic script, both in polished "
                "brass-gold with an ivory highlight and a subtle warm glow. A small stylised ear whose "
                "curve becomes a treble clef sits beside the word “Ear”, and three piano keys "
                "(ivory, ebony, ivory) underline the lettering. Clean silhouette on a fully "
                "transparent background, centred, no other text.",
         note="Must read clearly at 300 px wide. The text title (Fraunces) shows until this arrives."),
    dict(id="title-bg", file="assets/ui/title-bg.webp", size="2400×1350 (16:9), WebP", status="requested", group="Title",
         prompt="An intimate jazz club after hours seen from the side of a grand piano: the open lid "
                "catching a warm spotlight, a long row of ivory and ebony keys sweeping across the "
                "lower third in soft focus, music staves and a few notes drifting up like smoke "
                "into a midnight-blue room, a double bass and a microphone silhouetted in the "
                "background, string lights blurred into bokeh. Leave the centre third calm and "
                "darker so a logo and a button read over it. " + STYLE,
         note="Landscape phones crop it to roughly 19.5:9, so keep the subject inside the middle 80%."),
    dict(id="rotate-card", file="assets/ui/rotate-card.png", size="800×800, transparent PNG", status="requested", group="Title",
         prompt="A friendly illustration of a smartphone turning from portrait to landscape, drawn "
                "as a small ivory-and-ebony piano keyboard on its screen, with a curved brass arrow "
                "showing the turn. Simple, bold shapes on a transparent background. " + STYLE),
    # Songbooks
    *[
        dict(id=f"book-{bid}", file=f"assets/books/{bid}.png", size="512×512, PNG", status="requested", group="Songbook emblems",
             prompt=f"An emblem for the songbook “{name}”: {subject}. " + BOOK_STYLE)
        for bid, name, subject in [
            ("all", "Everything", "a vinyl record whose grooves glow brass, with a small star of light at the label"),
            ("children", "Children's Songs", "a wooden toy xylophone and a paper boat with a twinkling star above"),
            ("traditional", "Folk & Traditional", "a fiddle and a sprig of heather crossed over an old map"),
            ("holiday", "Carols & Hymns", "a brass hand bell with holly and a single falling snowflake"),
            ("classical", "Classical Themes", "a marble bust's laurel wreath around a treble clef"),
            ("jazz", "Jazz Standards", "a brass saxophone bell with a curl of smoke and a spotlight"),
            ("licks", "Jazz & Blues Licks", "a trumpet valve cluster and a winding glowing line of notes"),
            ("popular", "Film & Pop Hooks", "a cinema film reel and a vintage microphone"),
        ]
    ],
    # App icons and the library cover
    dict(id="icon", file="icons/icon-1024.png", size="1024×1024, PNG, no transparency", status="requested", group="App icon",
         prompt="An app icon: a stylised ear whose curve becomes a treble clef, in brass-gold, above "
                "three ivory-and-ebony piano keys, on a deep midnight-blue rounded-square ground with "
                "a soft warm glow behind the ear. Bold, simple, centred, legible at 60 pixels. " + STYLE,
         note="Resized to icons/icon-180.png, icon-192.png and icon-512.png (also used maskable, so keep the motif inside the middle 80%). Stand-ins are drawn by design/source/make_icons.py."),
    dict(id="cover", file="assets/ui/cover.webp", size="1200×900 (4:3), WebP", status="requested", group="Game library card",
         prompt="A close view of grand piano keys under warm lamplight, a single key glowing brass as "
                "if just pressed, with a few golden notes rising from it into a midnight-blue "
                "background. Leave the upper middle calm for the logo to sit on. " + STYLE,
         note="Background of the Ear Trainer card on the game library page (index.html), with the logo over it."),
]


def render() -> tuple[str, str]:
    lines = [
        "# Ear Trainer image requests",
        "",
        "<!-- Generated by eartrainer/design/source/build_requests.py. Edit the data there and rerun. -->",
        "",
        "Generate each image from its prompt and drop the files in `eartrainer/intake/`.",
        "Until a file is delivered the app draws a stand-in, so nothing here blocks play.",
        "",
        "**House style** (already included in every prompt): " + STYLE,
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
        lines += ["", f"### `{a['id']}` · {a['status']}", "", f"- File: `eartrainer/app/{a['file']}`", f"- Size: {a['size']}"]
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
