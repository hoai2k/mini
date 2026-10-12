#!/usr/bin/env python3
"""Generate the Music Practice image requests and the app's asset list.

Edit the data below, then run:

    python3 musicpractice/design/source/build_requests.py          # write
    python3 musicpractice/design/source/build_requests.py --check  # verify up to date

Outputs:
    musicpractice/design/image-requests.md    the request document
    musicpractice/app/data/asset-list.json    what the app loads (delivered) or draws itself (requested)

Themes:
    Every image belongs to one theme (Classic, Art Deco, ...) or to none
    (the app icon and library cover). The app shows the theme's own image
    when it is delivered and otherwise draws that theme's stand-in.

Anchors:
    Images that are laid over each other (the metronome body and its
    pendulum) record their canvas size and named points in their own pixels:
    the body's "pivot" and the pendulum's "hub", plus the pendulum's swing in
    degrees. Each theme's art can put them anywhere; on delivery, measure the
    points in the delivered file and record them here.

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

DECO_STYLE = (
    "Art Deco illustration in the manner of a 1920s–30s poster and a Chrysler Building "
    "interior: black lacquer and polished onyx, gleaming gold leaf and champagne brass, "
    "accents of deep jade green and ivory, crisp geometric forms, stepped (ziggurat) "
    "silhouettes, sunburst rays, fan motifs, chevrons and fine parallel gold pinstripes, "
    "strict symmetry, flat lacquered surfaces with sharp metallic highlights. Elegant, "
    "glamorous, simple. No text, no letters, no numbers, no logos, no watermark, no frame "
    "or border unless the prompt asks for one."
)

DECO_ICON_STYLE = (
    DECO_STYLE + " A single centred object on a fully transparent background, bold readable "
    "silhouette that still reads at 64 pixels, generous even margin on every side, no "
    "cast shadow."
)


# Round 3: six more themes. Each has a house style and its own take on the
# four themed images; the prompts are assembled from these in ROUND3 below.
NO_TEXT = ("No text, no letters, no numbers, no logos, no watermark, no frame or border "
           "unless the prompt asks for one.")

MORE_THEMES = [
    dict(id="sixties", name="Vintage 60s",
         style="Mid-century 1960s illustration like a vintage record sleeve or a space-age kitchen "
               "advert: warm cream, mustard yellow, burnt orange, teal and avocado green, simple "
               "rounded shapes, boomerang and starburst (atomic) motifs, flat colour with a soft "
               "screen-print grain and slightly offset printing. Cheerful, optimistic, simple. " + NO_TEXT,
         metronome="a rounded mid-century metronome in teak with a mustard-yellow face and a teal "
                   "base, its chrome pendulum tilted a little to the right, with a small orange "
                   "atomic starburst beside the tip",
         mic="a chrome 1960s 'bullet' microphone on a short teak stand with a round orange record "
             "light and a small mustard starburst beside it",
         body="a rounded mid-century metronome in warm teak with softly rounded corners and a "
              "slight tapering pyramid shape, a mustard-yellow front face with evenly spaced cream "
              "tick marks (no numbers) and a thin teal band near the base, standing on a short "
              "flared teal plinth with tapered peg feet",
         boss="a round chrome pivot cap",
         pendulum="a thin straight chrome rod with a rounded teal-and-orange sliding weight shaped "
                  "like a small boomerang, and a round chrome hub"),
    dict(id="baroque", name="18th Century",
         style="18th-century illustration in the manner of a Rococo engraving and a gilded "
               "harpsichord: warm ivory and parchment, carved walnut and fruitwood, burnished "
               "gilt, deep burgundy and a little powder blue, scrolling acanthus leaves, shell "
               "(rocaille) ornaments and fine engraved hatching. Elegant and refined. " + NO_TEXT,
         metronome="an elegant 18th-century metronome case in carved walnut with gilt acanthus "
                   "scrolls and an ivory dial panel, its gilt pendulum tilted a little to the right",
         mic="a period-inspired recording horn: a gilded flared brass horn on a carved walnut "
             "stand with a small burgundy wax-seal record mark beside it",
         body="an 18th-century style metronome case in carved walnut with a tall arched top crowned "
              "by a small gilt finial, gilt rococo scrolls and shell ornaments around its edges, "
              "and a tall ivory dial panel with fine engraved tick marks (no numbers), on a "
              "moulded plinth with small gilt scroll feet",
         boss="a round gilt rosette",
         pendulum="a thin straight gilt rod with a small gilt sliding weight shaped like a "
                  "scalloped shell, and a round gilt rosette hub"),
    dict(id="scifi", name="Sci Fi Future",
         style="Sleek science-fiction illustration of a far-future starship console: deep space "
               "navy and graphite, glowing cyan and magenta light lines, brushed titanium, "
               "glass panels, crisp chamfered geometric forms and fine HUD-style tick marks, a "
               "soft neon glow. Clean, futuristic, simple. " + NO_TEXT,
         metronome="a futuristic metronome as a chamfered graphite-and-titanium obelisk with a "
                   "glowing cyan scale and a light-blade pendulum tilted a little to the right",
         mic="a futuristic floating microphone: a glowing cyan ring around a small titanium "
             "capsule above a hexagonal base, with a magenta record light",
         body="a futuristic metronome: a tall tapering graphite-and-titanium obelisk with chamfered "
              "(cut) corners, a dark glass front panel with a vertical row of glowing cyan HUD "
              "tick marks (no numbers), thin cyan light lines along its edges, on a hexagonal "
              "titanium base",
         boss="a round glowing cyan pivot ring",
         pendulum="a thin straight glowing cyan light-blade rod with a small chamfered titanium "
                  "weight with a magenta light, and a round glowing cyan hub ring"),
    dict(id="nouveau", name="French Nouveau",
         style="French Art Nouveau illustration in the manner of Alphonse Mucha and a Paris Métro "
               "entrance: soft sage and olive green, cream, muted gold, dusty rose and plum, "
               "flowing whiplash curves, lilies, irises and vines, elegant outlined forms with "
               "flat, gently graded colour. Graceful and organic. " + NO_TEXT,
         metronome="an Art Nouveau metronome whose case curves like a lily stem in sage green "
                   "and gold, with a cream face and a gold pendulum tilted a little to the right",
         mic="an Art Nouveau microphone wrapped in gold vines and an iris flower on a curving "
             "stand, with a small dusty-rose record bud",
         body="an Art Nouveau metronome: a tall case with gently curving whiplash sides and a "
              "rounded arched top, in sage green enamel with gold vine and lily ornaments climbing "
              "its edges, a cream front face with fine gold tick marks (no numbers), on a "
              "softly flared base with curling gold feet",
         boss="a round gold flower-shaped pivot",
         pendulum="a thin straight gold rod with a small gold sliding weight shaped like a lily "
                  "bud, and a round gold flower-shaped hub"),
    dict(id="anime", name="Anime",
         style="Bright anime and manga illustration: clean bold outlines, flat cel shading with "
               "one soft highlight, candy pink, sky blue, lilac and sunny yellow on white, "
               "sparkles and little star glints, cute and energetic. " + NO_TEXT,
         metronome="a cute rounded metronome in candy pink with a white face and a sky-blue "
                   "pendulum tilted a little to the right, with sparkles and motion lines",
         mic="a cute rounded anime-style microphone in sky blue and white with a heart-shaped "
             "pink record light and sparkles",
         body="a cute anime-style metronome: a rounded pyramid in candy pink with a bold dark "
              "outline, a white front face with simple sky-blue tick marks (no numbers), a "
              "little sparkle glint on the top corner, on a rounded lilac base",
         boss="a round sky-blue pivot button",
         pendulum="a thin straight sky-blue rod with a bold outline, a small star-shaped yellow "
                  "sliding weight, and a round sky-blue hub"),
    dict(id="steampunk", name="Steam Punk",
         style="Steampunk illustration of Victorian brass machinery: polished brass, copper and "
               "dark leather, riveted plates, exposed cogs and gears, small pressure gauges and "
               "pipes, warm gaslight glow on dark mahogany. Intricate but readable. " + NO_TEXT,
         metronome="a steampunk metronome of riveted copper plates with visible brass gears and "
                   "a brass pendulum tilted a little to the right",
         mic="a steampunk microphone: a brass and copper capsule with a riveted grille, small "
             "gears and a pressure gauge on its stand, and a glowing red valve light",
         body="a steampunk metronome: a tapering pyramid of riveted copper and brass plates on a "
              "dark mahogany frame, a cream enamel front face with fine black tick marks (no "
              "numbers), a few exposed brass cogs at its sides and a small pressure gauge on the "
              "base, on a heavy riveted brass plinth",
         boss="a round brass gear-shaped pivot",
         pendulum="a thin straight brass rod with a small riveted copper sliding weight with a "
                  "tiny cog, and a round brass gear-shaped hub"),
]

THEMES = [
    dict(id="classic", name="Classic"),
    dict(id="deco", name="Art Deco"),
    *[dict(id=t["id"], name=t["name"]) for t in MORE_THEMES],
]

ICON_STYLE = (
    STYLE + " A single centred object on a fully transparent background, bold readable "
    "silhouette that still reads at 64 pixels, generous even margin on every side, no "
    "shadow beyond a soft contact shadow directly under the object."
)

ASSETS = [
    # Home screen
    dict(id="home-metronome", theme="classic", round=1, file="assets/ui/home-metronome.webp", size="768×768, transparent PNG (shipped as 384×384 WebP)",
         status="delivered", group="Home screen buttons",
         prompt="A classic pyramid-shaped mechanical metronome in polished walnut with a cream "
                "tempo scale on its face, its brass pendulum tilted a little to the right "
                "mid-swing, with two faint curved motion arcs beside the tip of the pendulum. "
                "Seen straight from the front. " + ICON_STYLE,
         note="The big Metronome button on the home screen; the label is written by the app. "
              "Keep the tempo scale as plain tick marks (no numbers)."),
    dict(id="home-record", theme="classic", round=1, file="assets/ui/home-record.webp", size="768×768, transparent PNG (shipped as 384×384 WebP)",
         status="delivered", group="Home screen buttons",
         prompt="A vintage brass-and-cream studio microphone on a short stand, with a glowing "
                "round red record light beside it and a small ribbon of sound wave curling "
                "from the microphone back toward a looping arrow (record, then play back). "
                "Seen from the front, slightly from above. " + ICON_STYLE,
         note="The big Playback Recorder button on the home screen; the label is written by the app."),
    # Metronome animation (two layers: the body stays still, the pendulum rotates)
    dict(id="metronome-body", theme="classic", round=1, file="assets/ui/metronome-body.webp", size="800×1200, transparent PNG (shipped as WebP)",
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
              "matter more than detail; small offsets can be corrected in asset-list data.",
         canvas=[800, 1200], anchors={"pivot": [400, 985]}),
    dict(id="metronome-pendulum", theme="classic", round=1, file="assets/ui/metronome-pendulum.webp", size="200×1000, transparent PNG (shipped as WebP)",
         status="delivered", group="Metronome animation",
         prompt="Just the pendulum of a mechanical metronome, isolated: a single thin, perfectly "
                "straight, perfectly vertical polished brass rod running down the exact centre of a "
                "tall narrow canvas, from about 3% from the top to a round brass hub whose centre "
                "is at 96% of the height. A sliding brass weight shaped like a small trapezoid "
                "with a centre notch sits on the rod at about 30% of the height. Seen straight "
                "on, symmetrical, nothing else in the picture. " + STYLE + " Fully transparent background.",
         note="The app rotates this about the hub centre (100, 960) in a 200×1000 canvas. The rod "
              "must be exactly vertical and centred left-to-right.",
         canvas=[200, 1000], anchors={"hub": [102, 927]}, swing=24),
    # App icon and library card
    dict(id="icon", theme=None, round=1, file="icons/icon-1024.png", size="1024×1024, PNG, full bleed, no transparency",
         status="delivered", group="App icon",
         prompt="Create a square Music Practice favicon/app icon in Art Deco style, matching the reference's black lacquer, gold and jade geometric design. Use a simplified stepped ziggurat metronome with a cream face, a thick champagne-gold pendulum tilted slightly right, and a small bright ruby-red record jewel at its lower right. Strong simple silhouette readable at 32 pixels; remove fine ornamental details and tiny scale marks. Full-bleed dark jade/black background right to all square edges, no rounded square frame, no border, no light margins. Motif within central 80%. Crisp black lacquer surfaces, gold edging, small sunburst accent. No text, letters, numbers, watermark or other objects. Reference image is a style reference only.",
         note="Art Deco favicon and app icon delivered. Resized to icons/icon-32.png, icon-180.png, icon-192.png and icon-512.png."),
    dict(id="cover", theme=None, round=1, file="assets/ui/cover.webp", size="1200×900 (4:3), WebP",
         status="delivered", group="Game library card",
         prompt="A cosy music practice corner: a walnut metronome mid-swing on the left and a "
                "brass studio microphone on the right, standing on a wooden music stand shelf with "
                "an open page of sheet music behind them (staff lines and note heads only, no "
                "readable text), warm lamplight, soft blurred room behind. The centre of the picture "
                "is calm enough for a title laid over it. " + STYLE,
         note="The Music Practice card on the game library page (mini apps shelf)."),

    # Round 2: the Art Deco theme (the default theme)
    dict(id="home-metronome", theme="deco", round=2, file="assets/ui/deco/home-metronome.webp",
         size="768×768, transparent PNG (shipped as 384×384 WebP)", status="delivered", group="Art Deco · Home screen buttons",
         prompt="An Art Deco metronome as a stepped ziggurat tower in black lacquer edged in gold, "
                "its face an ivory panel with a gold sunburst rising from the bottom, the gold "
                "pendulum tilted a little to the right mid-swing, with two thin gold arcs beside the "
                "tip of the pendulum like a fan. Seen straight from the front, perfectly symmetrical "
                "apart from the pendulum. " + DECO_ICON_STYLE,
         note="The big Metronome button on the home screen in the Art Deco theme; the label is written "
              "by the app. Tick marks only, no numbers."),
    dict(id="home-record", theme="deco", round=2, file="assets/ui/deco/home-record.webp",
         size="768×768, transparent PNG (shipped as 384×384 WebP)", status="delivered", group="Art Deco · Home screen buttons",
         prompt="A 1930s Art Deco radio-studio microphone: a gold rounded-rectangle ribbon "
                "microphone with fine horizontal grille bars, held in a gold ring on a short stepped "
                "black-and-gold stand, a small glowing ruby-red record jewel set in a gold fan beside "
                "it, and three thin gold arcs of sound radiating from it. Seen from the front, "
                "symmetrical. " + DECO_ICON_STYLE,
         note="The big Playback Recorder button on the home screen in the Art Deco theme."),
    dict(id="metronome-body", theme="deco", round=2, file="assets/ui/deco/metronome-body.webp",
         size="800×1200, transparent PNG (shipped as WebP)", status="delivered", group="Art Deco · Metronome animation",
         prompt="An Art Deco mechanical metronome seen exactly straight on from the front, perfectly "
                "symmetrical, standing upright and filling the canvas top to bottom with a small "
                "margin: a tall stepped pyramid like a skyscraper crown, in black lacquer with gold "
                "edging and fine gold pinstripes following each step. The front face is a tall "
                "narrow ivory panel with evenly spaced fine gold tick marks up the centre (no "
                "numbers) and a gold sunburst fanning up from the bottom of the panel. There is NO "
                "pendulum, rod or weight anywhere. Near the bottom of the face, centred "
                "left-to-right, a round gold pivot boss sits exactly at 50% of the width and 83% of "
                "the height. A wider stepped black-and-gold plinth at the bottom with a small "
                "chevron band. " + DECO_STYLE + " Fully transparent background.",
         note="The app rotates the Art Deco pendulum over this one about the pivot boss. Ask for "
              "(400, 1000) in an 800×1200 canvas, then measure where it really is in the delivered "
              "file and record it as this image's pivot anchor; it need not match the Classic art.",
         canvas=[800, 1200], anchors={"pivot": [400, 908]}),
    dict(id="metronome-pendulum", theme="deco", round=2, file="assets/ui/deco/metronome-pendulum.webp",
         size="200×1000, transparent PNG (shipped as WebP)", status="delivered", group="Art Deco · Metronome animation",
         prompt="Just the pendulum of an Art Deco metronome, isolated: a single thin, perfectly "
                "straight, perfectly vertical polished gold rod running down the exact centre of a "
                "tall narrow canvas, from about 3% from the top to a round gold hub ringed in black "
                "enamel whose centre is at 96% of the height. A sliding weight shaped like a small "
                "stepped ziggurat in black lacquer and gold sits on the rod at about 30% of the "
                "height, with a tiny gold fan on its face. Seen straight on, symmetrical, nothing "
                "else in the picture. " + DECO_STYLE + " Fully transparent background.",
         note="The app rotates this about the hub. Ask for (100, 960) in a 200×1000 canvas, then "
              "record the measured hub as this image's anchor. The rod must be exactly vertical.",
         canvas=[200, 1000], anchors={"hub": [99.5, 917]}, swing=26),
]

def round3_assets(t: dict) -> list[dict]:
    style = t["style"]
    icon_style = (style + " A single centred object on a fully transparent background, bold "
                  "readable silhouette that still reads at 64 pixels, generous even margin on "
                  "every side, no cast shadow.")
    folder = f"assets/ui/{t['id']}"
    group = t["name"]
    return [
        dict(id="home-metronome", theme=t["id"], round=3, file=f"{folder}/home-metronome.webp",
             size="768×768, transparent PNG (shipped as 384×384 WebP)", status="requested",
             group=f"{group} · Home screen buttons",
             prompt=f"{t['metronome'].capitalize()}. Seen from the front. " + icon_style,
             note=f"The big Metronome button on the home screen in the {group} theme; the label is "
                  "written by the app. Tick marks only, no numbers."),
        dict(id="home-record", theme=t["id"], round=3, file=f"{folder}/home-record.webp",
             size="768×768, transparent PNG (shipped as 384×384 WebP)", status="requested",
             group=f"{group} · Home screen buttons",
             prompt=f"{t['mic'].capitalize()}. Seen from the front. " + icon_style,
             note=f"The big Playback Recorder button on the home screen in the {group} theme."),
        dict(id="metronome-body", theme=t["id"], round=3, file=f"{folder}/metronome-body.webp",
             size="800×1200, transparent PNG (shipped as WebP)", status="requested",
             group=f"{group} · Metronome animation",
             prompt=(f"{t['body'].capitalize()}. Seen exactly straight on from the front, perfectly "
                     "symmetrical, standing upright and filling the canvas top to bottom with a small "
                     "margin. There is NO pendulum, rod or weight anywhere. Near the bottom of the "
                     f"face, centred left-to-right, {t['boss']} sits exactly at 50% of the width and "
                     "83% of the height. " + style + " Fully transparent background."),
             note=f"The app rotates the {group} pendulum over this one about the pivot. Ask for "
                  "(400, 1000) in an 800×1200 canvas, then measure where it really is in the "
                  "delivered file and record it as this image's pivot anchor.",
             canvas=[800, 1200], anchors={"pivot": [400, 1000]}),
        dict(id="metronome-pendulum", theme=t["id"], round=3, file=f"{folder}/metronome-pendulum.webp",
             size="200×1000, transparent PNG (shipped as WebP)", status="requested",
             group=f"{group} · Metronome animation",
             prompt=(f"Just the pendulum of a metronome, isolated: {t['pendulum']}. The rod is "
                     "perfectly straight and perfectly vertical down the exact centre of a tall "
                     "narrow canvas, from about 3% from the top to the hub, whose centre is at 96% "
                     "of the height; the weight sits on the rod at about 30% of the height. Seen "
                     "straight on, symmetrical, nothing else in the picture. " + style
                     + " Fully transparent background."),
             note="The app rotates this about the hub. Ask for (100, 960) in a 200×1000 canvas, "
                  "then record the measured hub as this image's anchor. The rod must be exactly vertical.",
             canvas=[200, 1000], anchors={"hub": [100, 960]}, swing=24),
    ]


ROUND3 = [a for t in MORE_THEMES for a in round3_assets(t)]

# Measured anchors and fitted pendulum scales in the delivered Round 3 art.
ROUND3_GEOMETRY = {'sixties': {'pivot': [400, 867], 'hub': [100.0, 855.1], 'scale': 1},
 'baroque': {'pivot': [400, 877], 'hub': [99.4, 866.3], 'scale': 0.8},
 'scifi': {'pivot': [400, 893], 'hub': [100.3, 924.7], 'scale': 0.85},
 'nouveau': {'pivot': [400, 937], 'hub': [99.7, 898.7], 'scale': 0.85},
 'anime': {'pivot': [400, 871], 'hub': [98.0, 927.9], 'scale': 0.8},
 'steampunk': {'pivot': [400, 776], 'hub': [94.8, 870.6], 'scale': 0.65}}
for asset in ROUND3:
    asset["status"] = "delivered"
    geometry = ROUND3_GEOMETRY[asset["theme"]]
    if asset["id"] == "metronome-body":
        asset["anchors"] = {"pivot": geometry["pivot"]}
    elif asset["id"] == "metronome-pendulum":
        asset["anchors"] = {"hub": geometry["hub"]}
        asset["scale"] = geometry["scale"]
ASSETS += ROUND3


def render() -> tuple[str, str]:
    theme_name = {t["id"]: t["name"] for t in THEMES}
    lines = [
        "# Music Practice image requests",
        "",
        "<!-- Generated by musicpractice/design/source/build_requests.py. Edit the data there and rerun. -->",
        "",
        "Generate each image from its prompt and drop the files in `musicpractice/intake/`.",
        "Until a file is delivered the app draws a stand-in, so nothing here blocks use.",
        "Images belong to a theme (Settings → Theme); each theme has its own set.",
        "",
    ]
    for rnd, title in ((1, "Classic theme, app icon and library card"), (2, "Art Deco theme"),
                       (3, ", ".join(t["name"] for t in MORE_THEMES) + " themes")):
        wanted = [a for a in ASSETS if a["round"] == rnd and a["status"] in ("requested", "revise")]
        lines.append(f"**Round {rnd} ({title}):** "
                     + (f"{len(wanted)} images wanted: " + ", ".join(f"`{a['file']}`" for a in wanted) + "."
                        if wanted else "delivered and in use."))
        lines.append("")
    lines += [
        "**House styles** (already included in every prompt):",
        "",
        "- Classic: " + STYLE,
        "- Art Deco: " + DECO_STYLE,
        *[f"- {t['name']}: {t['style']}" for t in MORE_THEMES],
        "",
        "**Anchors:** the metronome body and pendulum are separate layers. Each image records its",
        "canvas size and the point the app pins it by (the body's pivot, the pendulum's hub), so",
        "each theme's art can put them where it likes. Ask for the requested points, then record",
        "the measured ones for the delivered file in `build_requests.py`.",
        "",
        "| Round | Theme | Status | Id | File | Size |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for a in ASSETS:
        lines.append(f"| {a['round']} | {theme_name.get(a['theme'], 'all')} | {a['status']} | `{a['id']}` | `app/{a['file']}` | {a['size']} |")
    group = None
    for a in ASSETS:
        if a["group"] != group:
            group = a["group"]
            lines += ["", f"## {group}"]
        lines += ["", f"### `{a['id']}` · {theme_name.get(a['theme'], 'all themes')} · {a['status']}", "",
                  f"- File: `musicpractice/app/{a['file']}`", f"- Size: {a['size']}"]
        if a.get("anchors"):
            pts = ", ".join(f"{k} ({v[0]}, {v[1]})" for k, v in a["anchors"].items())
            lines.append(f"- Anchors ({'measured' if a['status'] == 'delivered' else 'requested'}): {pts} in a {a['canvas'][0]}×{a['canvas'][1]} canvas"
                         + (f"; swings ±{a['swing']}°" if a.get("swing") else ""))
        if a.get("note"):
            lines.append(f"- Note: {a['note']}")
        lines += ["", "```text", a["prompt"], "```"]
    doc = "\n".join(lines) + "\n"
    keys = ("id", "theme", "file", "status", "canvas", "anchors", "swing", "scale")
    assets = json.dumps([{k: a[k] for k in keys if a.get(k) is not None} for a in ASSETS], indent=2) + "\n"
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
