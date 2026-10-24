#!/usr/bin/env python3
"""Generate the Meditation Timer image requests and the app's asset list.

Edit the data below, then run:

    python3 meditation/design/source/build_requests.py          # write
    python3 meditation/design/source/build_requests.py --check  # verify up to date

Outputs:
    meditation/design/image-requests.md    the request document
    meditation/app/data/asset-list.json    what the app loads (delivered) or draws itself (requested)

Statuses:
    requested  the app draws a stand-in (inline SVG and CSS) until the file arrives
    delivered  the file is at its path under meditation/app/ and the app loads it
    revise     delivered and in use, but a new version is wanted (see its note)

Delivered art goes in meditation/intake/; once it is checked and copied to
its path, flip its status here to "delivered" and rerun (for the icon and the
favicon, rerun make_icons.mjs too). Buttons (play, pause, stop, settings) are
inline SVG in the app and need no art.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
ASSET_LIST = ROOT / "app" / "data" / "asset-list.json"

STYLE = (
    "Calm, quiet artwork for a meditation app: a deep night-indigo palette (#141826 to #232a40) "
    "with warm burnished brass and bronze (#c9a15b) and a soft candle-glow light, painterly but "
    "clean, gentle gradients, soft rim light on metal, a faint warm haze, generous empty space, "
    "nothing busy or bright. Serene and still, like early morning before sunrise. No people, no "
    "text, no letters, no logos, no watermark, no frame or border."
)

INSTRUMENT = (
    " Shown alone, three-quarter view from slightly above, centred with a little space around it, "
    "isolated on a fully transparent background with a soft shadow beneath. " + STYLE
)

ASSETS = [
    # Brand
    dict(id="icon", file="icons/icon-1024.png", size="1024×1024, PNG, full bleed, no transparency", status="delivered", group="Brand",
         prompt="An app icon for a meditation timer: a hammered brass singing bowl seen from slightly above, "
                "glowing softly from within, three faint concentric sound rings rising from its rim like "
                "ripples, on a deep night-indigo (#141826) ground with a soft warm halo behind the bowl. "
                "Centred, bold and simple, readable at 60 pixels, full bleed with the subject inside the "
                "middle 80% so rounded-corner masks never cut it. " + STYLE,
         note="Home-screen icon; the 512, 192 and 180 px sizes are made from it by design/source/make_icons.mjs. "
              "Until it arrives they are made from the SVG stand-in (app/icon.svg)."),
    dict(id="favicon", file="icons/favicon-256.png", size="256×256, transparent PNG", status="delivered", group="Brand",
         prompt="A tiny browser-tab mark for a meditation timer: the plain silhouette of a singing bowl, a "
                "wide shallow curve with a flat rim, in warm brass (#c9a15b) with a single arc of sound "
                "rising above it. Flat, two tones at most, very thick shapes, no fine detail and no "
                "gradient, so it still reads at 16 and 32 pixels. Centred, filling most of the square, on "
                "a fully transparent background. No text, no letters, no frame.",
         note="The browser-tab icon (favicon). make_icons.mjs makes the 32 px favicon.png and favicon.ico from it; "
              "a full icon shrunk to 16 px turns to mud, so this one is drawn simpler. Until it arrives the tab "
              "uses the SVG stand-in."),
    dict(id="cover", file="assets/ui/cover.webp", size="1200×900 (4:3), WebP", status="delivered", group="Brand",
         prompt="Cover art for a meditation timer on an app shelf: a brass singing bowl and its wooden striker "
                "resting on a round indigo cushion on a low wooden table, a small pair of tingsha cymbals on "
                "a leather cord beside it, a thin curl of incense smoke, a window behind with the first pale "
                "light of dawn. Leave the centre calm so the app's icon reads over it. " + STYLE,
         note="The card on the game library page (index.html). Until it arrives the card shows a gradient and the icon."),

    # Screens
    dict(id="bowl", file="assets/ui/bowl.webp", size="1200×1200, transparent PNG (shipped as WebP)", status="delivered", group="Screens",
         prompt="The meditation bowl at the heart of the timer screen: a large hand-hammered Tibetan singing "
                "bowl in warm burnished brass with a darker bronze inner wall and fine hammer marks, a "
                "softly polished rim catching a candle-glow highlight, sitting on a round, plump "
                "night-indigo silk cushion with a gold-thread edge, a turned wooden striker wrapped in "
                "suede leaning against the cushion. Seen from slightly above, centred." + INSTRUMENT,
         note="Shown in the middle of the timer ring at about 220 px wide on a phone, and glows gently while a "
              "chime rings. Until it arrives the screen draws an SVG bowl."),
    dict(id="backdrop", file="assets/ui/backdrop.webp", size="1600×2400 (2:3, portrait), WebP", status="delivered", group="Screens",
         prompt="A quiet background for a meditation timer, made to sit behind text and a large ring: a dim "
                "night-indigo room at the hour before dawn, a soft out-of-focus warm glow low in the centre "
                "as if from a hidden candle, faint drifting haze, the barest suggestion of a window's edge "
                "at one side. Very low contrast and dark overall, nothing in sharp focus, the middle "
                "two-thirds left almost empty. " + STYLE,
         note="Covers the whole page behind the timer, darkened further by the app. Until it arrives the page "
              "uses a CSS gradient."),

    # Chime instruments (one per sound in the chime picker)
    dict(id="instrument-bowl-large", file="assets/instruments/bowl-large.webp", size="600×600, transparent PNG (shipped as WebP)", status="delivered", group="Chime instruments",
         prompt="A large, deep Tibetan singing bowl, about 28 cm across, hand-hammered bronze with a dark "
                "patina inside, wide and shallow, a broad flat rim with two thin engraved rings, sitting on "
                "a small round dark cushion." + INSTRUMENT,
         note="The “Large singing bowl” card in the chime picker, at about 96 px."),
    dict(id="instrument-bowl-small", file="assets/instruments/bowl-small.webp", size="600×600, transparent PNG (shipped as WebP)", status="delivered", group="Chime instruments",
         prompt="A small, bright singing bowl, about 11 cm across, smooth polished golden brass, taller and "
                "rounder than a large bowl, its rim gleaming, resting on a tiny ring cushion of woven cord, "
                "a slim wooden striker beside it." + INSTRUMENT,
         note="The “Small singing bowl” card in the chime picker."),
    dict(id="instrument-rin", file="assets/instruments/rin.webp", size="600×600, transparent PNG (shipped as WebP)", status="delivered", group="Chime instruments",
         prompt="A Japanese rin, the temple bowl bell of a Buddhist altar: a deep, steep-sided polished brass "
                "bowl with a slightly inward rim, sitting on a square brocade cushion in deep red and gold "
                "on a small black lacquer stand, a short lacquered striker (bai) lying in front." + INSTRUMENT,
         note="The “Rin” card in the chime picker."),
    dict(id="instrument-tingsha", file="assets/instruments/tingsha.webp", size="600×600, transparent PNG (shipped as WebP)", status="delivered", group="Chime instruments",
         prompt="A pair of Tibetan tingsha: two small thick bronze cymbals, each with a raised central dome "
                "embossed with a simple eight-spoked wheel, joined by a knotted brown leather cord, one "
                "lying flat and the other tilted against it so both faces show." + INSTRUMENT,
         note="The “Tingsha” card in the chime picker."),
    dict(id="instrument-koshi", file="assets/instruments/koshi.webp", size="600×600, transparent PNG (shipped as WebP)", status="delivered", group="Chime instruments",
         prompt="A Koshi wind chime: a slim cylinder of pale bamboo about 15 cm tall with eight fine metal "
                "rods hanging inside around a small glass-bead clapper, a wooden top and bottom, hanging "
                "from a short braided cord with a round wooden sail below." + INSTRUMENT,
         note="The “Koshi chimes” card in the chime picker."),
    dict(id="instrument-bell", file="assets/instruments/bell.webp", size="600×600, transparent PNG (shipped as WebP)", status="delivered", group="Chime instruments",
         prompt="A small temple bell in the shape of a Japanese bonshō: a tall rounded bronze bell with a "
                "verdigris-green patina and a band of raised bosses near the top, hanging from a dark "
                "wooden frame by a thick rope, a short wooden beam striker hanging beside it." + INSTRUMENT,
         note="The “Temple bell” card in the chime picker."),
]


def render() -> tuple[str, str]:
    requested = [a["id"] for a in ASSETS if a["status"] in ("requested", "revise")]
    lines = [
        "# Meditation Timer image requests",
        "",
        "<!-- Generated by meditation/design/source/build_requests.py. Edit the data there and rerun. -->",
        "",
        "Generate each image from its prompt and drop the files in `meditation/intake/`.",
        "Until a file is delivered the app draws a stand-in, so nothing here blocks use.",
        "Buttons (start, pause, stop, settings) are drawn as inline SVG in the app and",
        "need no art. The chime sounds are recordings and synthesis, not images; see",
        "`meditation/README.md`.",
        "",
        ("**Round 1:** " + str(len(requested)) + " image" + ("s" if len(requested) != 1 else "") + " wanted, marked `requested` or `revise`."
         if requested else "**Round 1:** delivered and in use."),
        "",
        "**House style** (already included in every prompt but the favicon's): " + STYLE,
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
        lines += ["", f"### `{a['id']}` · {a['status']}", "", f"- File: `meditation/app/{a['file']}`", f"- Size: {a['size']}"]
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
