#!/usr/bin/env python3
"""Generate the Music Practice image requests and the app's asset list.

Edit the data below, then run:

    python3 musicpractice/design/source/build_requests.py          # write
    python3 musicpractice/design/source/build_requests.py --check  # verify up to date

Outputs:
    musicpractice/design/image-requests.md    the request document
    musicpractice/app/data/asset-list.json    what the app loads (delivered) or draws itself (requested)

Statuses:
    requested  the app draws a stand-in (inline SVG) until the file arrives
    delivered  the file is at its path under musicpractice/app/ and the app loads it
    revise     delivered and in use, but a new version is wanted (see its note)

Delivered art goes in musicpractice/intake/; once it is checked and copied to
its path, flip its status here to "delivered" and rerun.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
ASSET_LIST = ROOT / "app" / "data" / "asset-list.json"

STYLE = (
    "Clean, warm practice-room illustration: polished walnut wood, brushed brass, cream and "
    "ivory, soft studio lighting with a gentle highlight from the upper left, crisp simple "
    "shapes with subtle painterly shading, like a premium modern app illustration. Friendly "
    "and calm. No text, no letters, no numbers, no logos, no watermark, no frame or border "
    "unless the prompt asks for one."
)

ICON_STYLE = (
    STYLE + " A single centred object on a fully transparent background, bold readable "
    "silhouette that still reads at 64 pixels, generous even margin on every side, no "
    "shadow beyond a soft contact shadow directly under the object."
)

ASSETS = [
    # Home screen
    dict(id="home-metronome", file="assets/ui/home-metronome.webp", size="768×768, transparent PNG (shipped as 384×384 WebP)",
         status="delivered", group="Home screen buttons",
         prompt="A classic pyramid-shaped mechanical metronome in polished walnut with a cream "
                "tempo scale on its face, its brass pendulum tilted a little to the right "
                "mid-swing, with two faint curved motion arcs beside the tip of the pendulum. "
                "Seen straight from the front. " + ICON_STYLE,
         note="The big Metronome button on the home screen; the label is written by the app. "
              "Keep the tempo scale as plain tick marks (no numbers)."),
    dict(id="home-record", file="assets/ui/home-record.webp", size="768×768, transparent PNG (shipped as 384×384 WebP)",
         status="delivered", group="Home screen buttons",
         prompt="A vintage brass-and-cream studio microphone on a short stand, with a glowing "
                "round red record light beside it and a small ribbon of sound wave curling "
                "from the microphone back toward a looping arrow (record, then play back). "
                "Seen from the front, slightly from above. " + ICON_STYLE,
         note="The big Record/Playback button on the home screen; the label is written by the app."),
    # Metronome animation (two layers: the body stays still, the pendulum rotates)
    dict(id="metronome-body", file="assets/ui/metronome-body.webp", size="800×1200, transparent PNG (shipped as WebP)",
         status="delivered", group="Metronome animation",
         prompt="A classic pyramid-shaped mechanical metronome in polished walnut, seen exactly "
                "straight on from the front, perfectly symmetrical, standing upright and filling "
                "the canvas top to bottom with a small margin. The front face is a tall recessed "
                "cream panel with a vertical scale of evenly spaced fine tick marks (no numbers). "
                "There is NO pendulum, rod or weight anywhere: the face panel is empty apart from "
                "the tick marks. Near the bottom of the face, centred left-to-right, a small round "
                "brass pivot screw sits exactly at 50% of the width and 83% of the height. A "
                "slightly wider walnut base at the bottom. " + STYLE + " Fully transparent background.",
         note="The app rotates the separate pendulum image over this one, pivoting on the brass "
              "screw at (400, 1000) in an 800×1200 canvas. Exact symmetry and the pivot position "
              "matter more than detail; small offsets can be corrected in asset-list data."),
    dict(id="metronome-pendulum", file="assets/ui/metronome-pendulum.webp", size="200×1000, transparent PNG (shipped as WebP)",
         status="delivered", group="Metronome animation",
         prompt="Just the pendulum of a mechanical metronome, isolated: a single thin, perfectly "
                "straight, perfectly vertical polished brass rod running down the exact centre of a "
                "tall narrow canvas, from about 3% from the top to a round brass hub whose centre "
                "is at 96% of the height. A sliding brass weight shaped like a small trapezoid "
                "with a centre notch sits on the rod at about 30% of the height. Seen straight "
                "on, symmetrical, nothing else in the picture. " + STYLE + " Fully transparent background.",
         note="The app rotates this about the hub centre (100, 960) in a 200×1000 canvas. The rod "
              "must be exactly vertical and centred left-to-right."),
    # App icon and library card
    dict(id="icon", file="icons/icon-1024.png", size="1024×1024, PNG, full bleed, no transparency",
         status="delivered", group="App icon",
         prompt="An app icon, full bleed: a warm deep walnut-brown gradient ground fills the whole "
                "square right to the edges and corners (no rounded-square frame, no border, no "
                "white margin; the phone rounds the corners itself). Centred on it, a simple cream "
                "and brass pyramid metronome, pendulum tilted slightly, and in front of its lower "
                "right corner a small round red record dot with a soft glow. Bold, simple shapes "
                "that read at 60 pixels. Keep everything important inside the middle 80% (it is "
                "also used as a maskable Android icon). " + STYLE,
         note="Resized to icons/icon-180.png, icon-192.png and icon-512.png."),
    dict(id="cover", file="assets/ui/cover.webp", size="1200×900 (4:3), WebP",
         status="delivered", group="Game library card",
         prompt="A cosy music practice corner: a walnut metronome mid-swing on the left and a "
                "brass studio microphone on the right, standing on a wooden music stand shelf with "
                "an open page of sheet music behind them (staff lines and note heads only, no "
                "readable text), warm lamplight, soft blurred room behind. The centre of the picture "
                "is calm enough for a title laid over it. " + STYLE,
         note="The Music Practice card on the game library page (mini apps shelf)."),
]


def render() -> tuple[str, str]:
    requested = [a for a in ASSETS if a["status"] in ("requested", "revise")]
    lines = [
        "# Music Practice image requests",
        "",
        "<!-- Generated by musicpractice/design/source/build_requests.py. Edit the data there and rerun. -->",
        "",
        "Generate each image from its prompt and drop the files in `musicpractice/intake/`.",
        "Until a file is delivered the app draws a stand-in, so nothing here blocks use.",
        "",
        ("**Round 1:** " + str(len(requested)) + " images wanted: "
         + ", ".join(f"`{a['id']}`" for a in requested) + "."
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
        lines += ["", f"### `{a['id']}` · {a['status']}", "", f"- File: `musicpractice/app/{a['file']}`", f"- Size: {a['size']}"]
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
