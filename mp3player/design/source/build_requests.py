#!/usr/bin/env python3
"""Generate the MP3 Player image requests and the app's asset list.

Edit the data below, then run:

    python3 mp3player/design/source/build_requests.py          # write
    python3 mp3player/design/source/build_requests.py --check  # verify up to date

Outputs:
    mp3player/design/image-requests.md    the request document
    mp3player/app/data/asset-list.json    what the app loads (delivered) or draws itself (requested)

Statuses:
    requested  the app draws a stand-in (CSS gradients and inline SVG) until the file arrives
    delivered  the file is at its path under mp3player/app/ and the app loads it
    revise     delivered and in use, but a new version is wanted (see its note)

Delivered art goes in mp3player/intake/; once it is checked and copied to its
path, flip its status here to "delivered" and rerun. Player controls (play,
skip, shuffle, repeat and the rest) are inline SVG in the app and need no art.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
ASSET_LIST = ROOT / "app" / "data" / "asset-list.json"

STYLE = (
    "Sleek modern music-app artwork: deep charcoal and ink-black grounds lit by glowing coral "
    "(#ff6b4a) and warm amber (#ffb340) light with a touch of deep violet, smooth gradients, "
    "soft film grain, bold simple shapes, in the manner of the editorial artwork of a premium "
    "streaming service. Confident, warm, late-night. No text, no letters, no logos, no "
    "watermark, no frame or border unless the prompt asks for one."
)

TILE_STYLE = (
    STYLE + " A square, full-bleed abstract album-cover tile that still reads at 40 pixels: one "
    "strong shape, high contrast, nothing important within 6% of the edges."
)

TILES = [
    ("art-1", "concentric vinyl grooves seen from above, a coral sun rising behind the record's edge"),
    ("art-2", "a single sound wave drawn as a ribbon of amber light curving across a dark field"),
    ("art-3", "three overlapping translucent circles in coral, amber and violet, like stage lights"),
    ("art-4", "a cassette tape's two reels abstracted into glowing rings on charcoal"),
    ("art-5", "a tall stack of equaliser bars in a coral-to-amber gradient, softly glowing"),
    ("art-6", "a pair of headphones reduced to one elegant arc of light over a violet haze"),
    ("art-7", "a night skyline melting into a horizon of sound-wave lines in amber"),
    ("art-8", "a spiral of tiny points of light like a record's groove turning into a galaxy"),
]

ASSETS = [
    # Brand
    dict(id="icon", file="icons/icon-1024.png", size="1024×1024, PNG, full bleed, no transparency", status="requested", group="Brand",
         prompt="An app icon for a personal music player: a glossy vinyl record turned slightly toward "
                "the viewer, its label a glowing coral-to-amber disc with a small white play triangle "
                "at its centre, a soft beam of warm light sweeping across the grooves, on a deep "
                "charcoal ground with a faint violet glow behind the record. Centred, bold, readable "
                "at 60 pixels, full bleed with the subject inside the middle 80% so rounded-corner "
                "masks never cut it. " + STYLE,
         note="Home-screen and browser icon; the 512, 192 and 180 px sizes and the favicon are made from it. "
              "Until it arrives the app uses its SVG stand-in (app/icon.svg)."),
    dict(id="logo", file="assets/ui/logo.webp", size="1200×320, transparent PNG (shipped as WebP)", status="requested", group="Brand",
         prompt="The words “MP3 Player” as a clean modern wordmark: “MP3” in a heavy geometric sans "
                "serif with a coral-to-amber gradient fill, “Player” in the same face at a lighter "
                "weight in warm off-white, with the dot of a small vinyl record standing in for the "
                "counter of the “P” in “Player”. Crisp silhouette on a fully transparent background, "
                "centred, no other text.",
         note="Shown in the app's header at about 140 px wide and on the welcome screen at about 320 px. "
              "The text title shows until it arrives, so it must read at 140 px."),
    dict(id="cover", file="assets/ui/cover.webp", size="1200×900 (4:3), WebP", status="requested", group="Brand",
         prompt="Cover art for a music player app on a library shelf: a vinyl record and a phone lying "
                "side by side on a dark surface, ribbons of coral and amber light flowing out of the "
                "phone's speaker and wrapping round the record, small floating album-cover squares "
                "glowing in the haze. Leave the centre calm and darker so the app's icon reads over it. "
                + STYLE,
         note="The card on the game library page (index.html). Until it arrives the card shows a gradient and the SVG icon."),

    # Screens
    dict(id="welcome", file="assets/ui/welcome.webp", size="1200×900 (4:3), transparent PNG (shipped as WebP)", status="requested", group="Screens",
         prompt="A friendly illustration for an empty music library: an open cardboard box of vinyl "
                "records and a phone beside it, songs flying from the phone into the box as small "
                "glowing album-cover squares and music notes, drawn in bold simple shapes. Isolated "
                "on a fully transparent background with a soft coral glow under the box. " + STYLE,
         note="Shown above “Add your music” when the library is empty, at about 280 px wide on a phone."),
    dict(id="artist", file="assets/art/artist.webp", size="512×512, PNG (shipped as 256×256 WebP)", status="requested", group="Screens",
         prompt="A placeholder portrait for a music artist with no photo: a vintage microphone in "
                "silhouette, rim-lit in coral and amber against a soft violet haze, centred so it "
                "survives a circular crop. " + STYLE,
         note="Artists have no pictures in music files, so every artist circle uses this (tinted per artist)."),
] + [
    dict(id=tid, file=f"assets/art/{tid}.webp", size="800×800, PNG (shipped as 512×512 WebP)", status="requested", group="Stand-in album covers",
         prompt=f"Abstract stand-in album cover: {desc}. " + TILE_STYLE,
         note="Songs and albums whose files carry no cover art get one of the eight tiles, chosen from the album name."
              if tid == "art-1" else None)
    for tid, desc in TILES
]


def render() -> tuple[str, str]:
    requested = [a["id"] for a in ASSETS if a["status"] in ("requested", "revise")]
    lines = [
        "# MP3 Player image requests",
        "",
        "<!-- Generated by mp3player/design/source/build_requests.py. Edit the data there and rerun. -->",
        "",
        "Generate each image from its prompt and drop the files in `mp3player/intake/`.",
        "Until a file is delivered the app draws a stand-in, so nothing here blocks use.",
        "Player controls (play, pause, skip, shuffle, repeat, queue and the rest) are",
        "drawn as inline SVG in the app and need no art; album covers come from the",
        "music files themselves.",
        "",
        ("**Round 1:** " + str(len(requested)) + " images wanted, marked `requested`."
         if requested else "**Round 1:** delivered and in use."),
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
        lines += ["", f"### `{a['id']}` · {a['status']}", "", f"- File: `mp3player/app/{a['file']}`", f"- Size: {a['size']}"]
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
