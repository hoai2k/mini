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
    revise     delivered and in use, but a new version is wanted (see its note)

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
    dict(id="logo", file="assets/ui/logo.webp", size="1600×640, transparent PNG (shipped as WebP)", status="delivered", group="Title",
         prompt="The words “Ear Trainer” as a hand-lettered logo: “Ear” in an elegant high-contrast "
                "serif with a soft italic swash, “Trainer” in flowing italic script, both in polished "
                "brass-gold with an ivory highlight and a subtle warm glow. A small stylised ear whose "
                "curve becomes a treble clef sits beside the word “Ear”, and three piano keys "
                "(three equal ivory white keys, no black key) underline the lettering. Clean silhouette on a fully "
                "transparent background, centred, no other text.",
         note="Must read clearly at 300 px wide. The text title (Fraunces) shows until this arrives."),
    dict(id="title-bg", file="assets/ui/title-bg.webp", size="2400×1350 (16:9), WebP", status="delivered", group="Title",
         prompt="An intimate jazz club after hours seen from the side of a grand piano: the open lid "
                "catching a warm spotlight, a long row of ivory and ebony keys sweeping across the "
                "lower third in soft focus, music staves and a few notes drifting up like smoke "
                "into a midnight-blue room, a double bass and a microphone silhouetted in the "
                "background, string lights blurred into bokeh. Leave the centre third calm and "
                "darker so a logo and a button read over it. " + STYLE,
         note="Landscape phones crop it to roughly 19.5:9, so keep the subject inside the middle 80%."),
    dict(id="rotate-card", file="assets/ui/rotate-card.webp", size="800×800, transparent PNG (shipped as 600×600 WebP)", status="delivered", group="Title",
         prompt="A friendly illustration of a smartphone turning from portrait to landscape, drawn "
                "as a small ivory-and-ebony piano keyboard on its screen, with a curved brass arrow "
                "showing the turn. Simple, bold shapes on a transparent background. " + STYLE),
    # Songbooks
    *[
        dict(id=f"book-{bid}", file=f"assets/books/{bid}.webp", size="512×512, PNG (shipped as 256×256 WebP)", status="delivered", group="Songbook emblems",
             prompt=f"An emblem for the songbook “{name}”: {subject}. " + BOOK_STYLE)
        for bid, name, subject in [
            ("all", "Everything", "a vinyl record whose grooves glow brass, with a small star of light at the label"),
            ("children", "Children's Songs", "a wooden toy xylophone and a paper boat with a twinkling star above"),
            ("traditional", "Folk & Traditional", "a fiddle and a sprig of heather crossed over an old map"),
            ("holiday", "Carols & Hymns", "a brass hand bell with holly and a single falling snowflake"),
            ("classical", "Classical Themes", "a marble bust's laurel wreath around a treble clef"),
            ("jazz", "Jazz Standards", "a brass saxophone bell with a curl of smoke and a spotlight"),
            ("licks", "Jazz & Blues Licks", "a straight side-view brass trumpet with three aligned upright piston valves, a straight level leadpipe and bell tube, compact conventional U-shaped valve slides, a naturally flared bell, and a winding glowing line of notes"),
            ("popular", "Film & Pop Hooks", "a cinema film reel and a vintage microphone"),
        ]
    ],
    dict(id="book-bebop", file="assets/books/bebop.webp", size="512×512, PNG (shipped as 256×256 WebP)", status="delivered", group="Songbook emblems",
         prompt="An emblem for the songbook “Bebop Heads”: a brass alto saxophone seen from the side, "
                "angled upward, with a fast flurry of small glowing eighth notes streaming from its bell "
                "in a tight zigzag line, and a 1940s club neon sign glow behind. " + BOOK_STYLE,
         note="Round 3 delivered: for the new Bebop Heads songbook (Charlie Parker's Omnibook and other bebop "
              "tunes). Keep it distinct from the Jazz Standards saxophone: side view, alto, a flurry of notes."),
    # App icons and the library cover
    dict(id="icon", file="icons/icon-1024.png", size="1024×1024, PNG, full bleed, no transparency", status="delivered", group="App icon",
         prompt="An app icon, full bleed: the deep midnight-blue ground fills the whole square right to "
                "the edges and corners (no rounded-square frame, no border, no white or light margin; "
                "the phone rounds the corners itself). Centred on it, the same brass-gold ear as the "
                "Ear Trainer logo: the outer curve of a human ear drawn as one smooth brass line, with "
                "a treble clef nestled inside it, so it reads clearly as an ear and not as a question "
                "mark. Below it three equal ivory piano keys edged in brass. A soft warm glow behind "
                "the ear; no other objects (no piano, bass, lamps or tables), so the motif reads at "
                "60 pixels. Keep everything important inside the middle 80% (it is also used as a "
                "maskable Android icon). " + STYLE,
         note="Round 2 delivered: full-bleed midnight-blue ground, clear ear-and-clef motif, three "
              "ivory keys, and a simplified background. Resized to icons/icon-180.png, "
              "icon-192.png and icon-512.png."),
    dict(id="cover", file="assets/ui/cover.webp", size="1200×900 (4:3), WebP", status="delivered", group="Game library card",
         prompt="A dim jazz club seen past the end of a grand piano: the keys run along the bottom fifth "
                "of the picture only, one key glowing brass as if just pressed, a few golden notes "
                "rising from it toward the top corners. The middle half of the picture, from left to "
                "right, is calm, dark midnight-blue air with soft bokeh and nothing else in it, so a "
                "gold logo laid over the centre reads cleanly. " + STYLE,
         note="Round 2 delivered: piano keys along the bottom fifth and calm dark space behind "
              "the central logo."),
]


def render() -> tuple[str, str]:
    revisions = [a for a in ASSETS if a["status"] == "revise"]
    lines = [
        "# Ear Trainer image requests",
        "",
        "<!-- Generated by eartrainer/design/source/build_requests.py. Edit the data there and rerun. -->",
        "",
        "Generate each image from its prompt and drop the files in `eartrainer/intake/`.",
        "Until a file is delivered the app draws a stand-in, so nothing here blocks play.",
        "",
        ("**Round 2:** revisions wanted, marked `revise`: "
         + ", ".join(f"`{a['id']}`" for a in revisions)
         + ". Their notes say what to change; existing versions stay in use until then."
         if revisions else "**Round 2:** the revised app icon and library cover are delivered and in use."),
        "",
        ("**Round 3:** one new image, marked `requested`: " + ", ".join(f"`{a['id']}`" for a in ASSETS if a["status"] == "requested")
         + ". The app shows a stand-in until it arrives."
         if any(a["status"] == "requested" for a in ASSETS) else "**Round 3:** delivered and in use."),
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
