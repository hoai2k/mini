#!/usr/bin/env python3
"""Generate the Ai-Ching image requests and the app's asset list.

The 64 hexagram scenes and palettes come from aiching/app/data/hexagrams.json;
everything else is the data below. Edit it, then run:

    python3 aiching/design/source/build_requests.py          # write
    python3 aiching/design/source/build_requests.py --check  # verify up to date

Outputs:
    aiching/design/image-requests.md   the request document
    aiching/app/data/asset-list.json   what the app loads (delivered) or draws (requested)

Statuses:
    requested  the app draws a stand-in in code (src/art.js)
    delivered  the file is in aiching/app/assets/ and the app loads it
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "app"
DOC = ROOT / "design" / "image-requests.md"
ASSET_LIST = APP / "data" / "asset-list.json"
HEXAGRAMS = json.loads((APP / "data" / "hexagrams.json").read_text(encoding="utf-8"))

STYLE = (
    "Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) "
    "joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and "
    "malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, "
    "saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft "
    "drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no "
    "seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram "
    "line symbols unless the prompt asks for them."
)

ALPHA = (
    "Transparent background (PNG with alpha). If transparency is not possible, use a flat pure "
    "magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on "
    "integration."
)

ROUNDEL = (
    "Painted as a circular medallion, the round picture filling about 92% of the square and "
    "cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. "
)

# id, title, file (under aiching/app/), size, transparent, used for, stand-in, prompt
UI = [
    ("UI01", "ui-logo", "Title", "assets/ui/logo.png", "1600 x 560", True,
     "The wordmark in the top bar and on the home page, and the card on the game library page.",
     "The name set in type beside a red seal drawn in code.",
     'The name "Ai-Ching" written exactly like that, in elegant brush-written Latin letters with '
     "the energy of Chinese running-script calligraphy, in deep black ink with a faint gold sheen, "
     "and to its left a square cinnabar-red carved seal stamp bearing the single character 易 in "
     "white seal script. Wide landscape composition, nothing else, no other text."),
    ("UI02", "ui-icon", "App icon and favicon", "assets/ui/icon.png", "1024 x 1024", True,
     "Favicon, home-screen icon and the seal in the top bar.",
     "A red square with 易 drawn in code.",
     "A square cinnabar-red seal stamp with slightly worn, irregular carved edges, bearing the "
     "single character 易 in white seal script, centred and filling the square. Printed-ink "
     "texture with tiny gaps where the paste did not take. Nothing else."),
    ("UI03", "ui-home-bg", "Home background", "assets/ui/home-bg.webp", "2400 x 1400", False,
     "Behind the question box on the home page.",
     "Pale paper with ink mountains drawn in code.",
     "A very pale, quiet ink-wash landscape on warm cream rice paper: distant misty mountains "
     "rise along the bottom fifth and up the far left and right edges, a lone pine on a rock at "
     "lower left, two cranes small in the sky at upper right, a faint full moon. The whole centre "
     "and top-centre stay almost empty pale paper, because a text box sits there. Mostly soft "
     "grey ink with only a whisper of blue-green and one tiny red sun. Full bleed, opaque, wide."),
    ("UI04", "ui-paper", "Paper texture", "assets/ui/paper.webp", "1024 x 1024", False,
     "Tiled under the cards and the home page.",
     "A noise texture drawn in code.",
     "Seamlessly tileable texture of handmade cream xuan rice paper: soft visible fibres, slight "
     "mottling, very low contrast, evenly lit, no objects, no stains at the edges. Must tile "
     "without visible seams. Opaque."),
    ("UI05", "ui-result-bg", "Reading background", "assets/ui/result-bg.webp", "2400 x 1400", False,
     "Behind the reading page, tinted by each hexagram's colours.",
     "A gradient in the hexagram's colours.",
     "A rich, dark imperial silk brocade: deep indigo ground woven with a subtle repeating "
     "pattern of auspicious clouds (xiangyun) and small gold cranes, and a scattering of tiny "
     "gold-leaf flecks. Low contrast so text can sit on it, darkest at the centre. Full bleed, "
     "opaque, wide, evenly patterned edge to edge."),
    ("UI06", "ui-clouds", "Cloud border", "assets/ui/clouds.png", "1800 x 320", True,
     "A border along the top of the reading and under the home page heading.",
     "A row of curls drawn in code.",
     "A horizontal band of stylised auspicious clouds (xiangyun) in the gongbi manner: curling "
     "spiral cloud forms outlined in fine gold, filled with soft azurite blue to white gradients, "
     "flowing left to right in a long frieze, thinning out at both ends."),
    ("UI07", "ui-coin-yang", "Coin, heads", "assets/ui/coin-yang.png", "600 x 600", True,
     "The coins thrown while a reading is cast (heads, worth 3).",
     "A bronze disc with a square hole drawn in code.",
     "One old Chinese bronze cash coin seen straight on: round with a square hole in the "
     "centre, a raised rim, four characters in clerical script around the hole, warm bronze with "
     "patches of green verdigris and a worn golden shine on the high points. Nothing else."),
    ("UI08", "ui-coin-yin", "Coin, tails", "assets/ui/coin-yin.png", "600 x 600", True,
     "The other face of the thrown coins (tails, worth 2).",
     "A darker bronze disc drawn in code.",
     "The back of the same old Chinese bronze cash coin, seen straight on: round with a square "
     "hole, raised rim, a plain field with only two small crescent-and-dot marks, darker bronze "
     "with verdigris. Same size and lighting as the front. Nothing else."),
    ("UI09", "ui-yang", "Solid line stroke", "assets/ui/yang.png", "1400 x 180", True,
     "Each solid (yang) line of the hexagram drawings. Used as a mask, so only its shape counts.",
     "A rounded bar drawn in code.",
     "One single horizontal brush stroke of black ink, made with a loaded broad brush from left "
     "to right: a firm pressed start, an even body, a slightly dry, feathered end with a few "
     "split-hair streaks. It fills the width, about one eighth as tall as it is long. Nothing else."),
    ("UI10", "ui-yin", "Broken line stroke", "assets/ui/yin.png", "1400 x 180", True,
     "Each broken (yin) line of the hexagram drawings. Used as a mask, so only its shape counts.",
     "Two rounded bars drawn in code.",
     "Two short horizontal brush strokes of black ink side by side with a clear gap between "
     "them, together filling the width: each stroke a firm pressed start and a slightly dry end, "
     "the gap about one sixth of the width, in the middle. Same weight as a single long stroke. "
     "Nothing else."),
    ("UI11", "ui-divider", "Divider", "assets/ui/divider.png", "1400 x 140", True,
     "Between the sections of a reading.",
     "A thin gold rule drawn in code.",
     "A slender ornamental divider: a fine gold line that thickens toward a small central "
     "motif of a round jade bi disc flanked by two tiny curling clouds, tapering to hair-thin "
     "points at both ends."),
    ("UI12", "ui-share", "Share card", "assets/ui/share.webp", "1200 x 630", False,
     "The preview picture when a link to Ai-Ching is shared.",
     "None (no preview picture).",
     "A wide painting: a scholar in a pale robe sits at a low table on a terrace above a misty "
     "blue-green river valley at dawn, three bronze coins lying on the table before them and a "
     "small incense burner trailing smoke into the shape of a dragon. Leave the right third calm "
     "sky and mist. Full bleed, opaque."),
]

TRIGRAMS = [
    ("qian", "Heaven 乾", "Heaven itself: a vast luminous sky with golden clouds parting, a coiled azure dragon soaring through them, the sun behind. Strength without effort."),
    ("kun", "Earth 坤", "The receptive earth: terraced fields in harvest gold rolling to the horizon, a mare grazing, a calm overcast sky, a mother's shawl of ochre colour in the land itself. Yielding and abundant."),
    ("zhen", "Thunder 震", "Thunder: a spring storm over a bamboo forest, a branching bolt of lightning, new green shoots bursting through the earth, a startled flight of birds. Shock that awakens."),
    ("kan", "Water 坎", "Water: a deep gorge where a river rushes between dark cliffs under a crescent moon, white foam curling in gongbi wave patterns. Danger, depth and flow."),
    ("gen", "Mountain 艮", "Mountain: a single great still mountain with a small temple gate at its foot and a monk seated in meditation, mist wrapping the slopes. Stillness and stopping."),
    ("xun", "Wind 巽", "Wind: a gentle wind moving through a willow grove, long branches and ribbons streaming, petals and a kite carried on the air. Gentle penetration."),
    ("li", "Fire 離", "Fire: the brilliant sun over a phoenix in flight, its plumage of flame red and gold, a lit lantern below. Clarity and clinging brightness."),
    ("dui", "Lake 兌", "Lake: a joyful lake at sunset with lotus flowers, two young women laughing in a small boat, ripples spreading, a pavilion on the shore. Joy and openness."),
]

TOPICS = [
    ("love", "Love & partnership", "A pair of mandarin ducks swimming side by side among lotus leaves under a full moon, a red silk thread running from one to the other across the water."),
    ("work", "Work & calling", "A master carpenter's workbench in a sunlit courtyard: plane, chisel and ink line tools, a half-built wooden bracket set of a temple roof rising beside it."),
    ("money", "Wealth & resources", "A golden carp leaping from a pool toward a waterfall, bronze coins and gold ingots glinting on the pool's floor, peonies on the bank."),
    ("health", "Health & body", "An old pine leaning over a mountain spring, a white crane standing on one leg beside it, a gourd of medicine hanging from a branch, morning light."),
    ("family", "Family & friends", "A round table in a lantern-lit courtyard under the mid-autumn full moon, mooncakes and tea set out, an empty circle of stools waiting for the family."),
    ("creativity", "Creative work", "A scholar's desk by an open window: brushes in a holder, an ink stone, a half-painted scroll of bamboo, a guqin zither and a plum branch in a vase."),
    ("study", "Study & learning", "A quiet library pavilion among bamboo, stacks of thread-bound books and bamboo-slip scrolls, an oil lamp burning, an open window onto stars."),
    ("travel", "Journeys & moves", "A long winding mountain road with a lone traveller and a laden horse heading toward a distant city gate at dawn, a river boat below, wild geese in a line overhead."),
    ("spirit", "Spirit & meaning", "A sage seated on a rock beside a waterfall, gazing at drifting clouds, a yin-yang shaped pool of light and dark water at his feet, deep mist beyond."),
    ("conflict", "Conflict & rivals", "Two tigers facing each other across a mountain stream, one golden, one silver, neither yet leaping, with a calm moon above and a narrow log bridge between them."),
    ("decision", "A choice to make", "A fork in a mountain path marked by an old stone lantern, one way climbing into sunlit pines, the other descending into a misty valley, a single traveller pausing."),
    ("timing", "A question of time", "A bronze water clock and a sundial on a terrace, a plum tree in bud beside them, the sky turning from night to dawn across the picture, a faint crescent moon setting."),
]

HEX_PROMPT = (
    "An illustration of the I Ching hexagram {n}, {zh} {pinyin}, \"{name}\": the upper trigram is "
    "{upper} and the lower trigram is {lower}. {scene} The season or hour is {season}. Let these "
    "colours lead the picture: {palette}. A wide 16:10 landscape composition, full bleed, opaque; "
    "keep the upper-right quarter quieter (sky, mist or water) because a title sits over it."
)

TRI = {"qian": "Heaven", "kun": "Earth", "zhen": "Thunder", "kan": "Water", "gen": "Mountain", "xun": "Wind", "li": "Fire", "dui": "Lake"}
ORDER = ["qian", "zhen", "kan", "gen", "kun", "xun", "li", "dui"]
KING_WEN = [
    [1, 34, 5, 26, 11, 9, 14, 43], [25, 51, 3, 27, 24, 42, 21, 17], [6, 40, 29, 4, 7, 59, 64, 47],
    [33, 62, 39, 52, 15, 53, 56, 31], [12, 16, 8, 23, 2, 20, 35, 45], [44, 32, 48, 18, 46, 57, 50, 28],
    [13, 55, 63, 22, 36, 37, 30, 49], [10, 54, 60, 41, 19, 61, 38, 58],
]


def trigrams(n):
    for lo in range(8):
        for up in range(8):
            if KING_WEN[lo][up] == n:
                return ORDER[up], ORDER[lo]
    raise ValueError(n)


# Delivered assets: list their ids here when the art arrives.
DELIVERED: set[str] = set()


def entries():
    out = []
    for code, aid, title, path, size, alpha, used, standin, prompt in UI:
        out.append(dict(section="Interface", code=code, id=aid, title=title, path=path, size=size, alpha=alpha,
                        used=used, standin=standin, prompt=f"{prompt} {STYLE} {ALPHA if alpha else ''}".strip()))
    for i, (key, title, scene) in enumerate(TRIGRAMS, 1):
        out.append(dict(section="The eight trigrams", code=f"TR{i:02d}", id=f"trigram-{key}", title=title,
                        path=f"assets/trigrams/{key}.png", size="800 x 800", alpha=True,
                        used="The trigram cards of a reading (upper and lower trigram).",
                        standin="The three lines on a coloured ground, drawn in code.",
                        prompt=f"{ROUNDEL}{scene} {STYLE} {ALPHA}"))
    for i, (key, title, scene) in enumerate(TOPICS, 1):
        out.append(dict(section="Question topics", code=f"TP{i:02d}", id=f"topic-{key}", title=title,
                        path=f"assets/topics/{key}.png", size="800 x 800", alpha=True,
                        used=f"The counsel card for questions about {title.lower()}.",
                        standin="A seal-red character in a circle, drawn in code.",
                        prompt=f"{ROUNDEL}{scene} {STYLE} {ALPHA}"))
    for h in HEXAGRAMS:
        up, lo = trigrams(h["n"])
        prompt = HEX_PROMPT.format(n=h["n"], zh=h["zh"], pinyin=h["pinyin"], name=h["name"],
                                   upper=f"{TRI[up]}", lower=f"{TRI[lo]}", scene=h["scene"].strip(),
                                   season=h["season"], palette=", ".join(h["palette"]))
        out.append(dict(section="The sixty-four hexagrams", code=f"HX{h['n']:02d}", id=f"hexagram-{h['n']:02d}",
                        title=f"{h['n']}. {h['zh']} {h['pinyin']} · {h['name']}",
                        path=f"assets/hexagrams/{h['n']:02d}.webp", size="1600 x 1000", alpha=False,
                        used="The picture at the top of a reading, and the small picture of the hexagram it becomes.",
                        standin="A misty landscape in the hexagram's colours, drawn in code.",
                        prompt=f"{prompt} {STYLE}"))
    for e in out:
        e["status"] = "delivered" if e["id"] in DELIVERED else "requested"
    return out


def render(items):
    done = sum(e["status"] == "delivered" for e in items)
    lines = [
        "# Ai-Ching: image requests",
        "",
        "Artwork for Ai-Ching, the I Ching reader in `aiching/` (see [`../README.md`](../README.md)). "
        "Generated from `source/build_requests.py`, which takes the hexagram scenes and colours from "
        "`app/data/hexagrams.json`; edit the data there and rerun it, which also rewrites `app/data/asset-list.json`.",
        "",
        "## How to use this list",
        "",
        "1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.",
        "2. Save each image under the file name in its **File** line (the path is under `aiching/app/`) and drop it in `aiching/intake/`. On integration it moves into place, its id is added to `DELIVERED` in the script, and the script is rerun.",
        "3. Transparent images are `.png`. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration. Opaque images are listed as `.webp`; PNG or JPEG is fine too and is converted on integration.",
        "4. Nothing here blocks the app: until an image arrives it draws a stand-in in code.",
        "5. Suggested order: the icon and title (UI01, UI02), the home background (UI03), then a handful of hexagrams to settle the look (1 Heaven, 2 Earth, 29 Water, 30 Fire, 63 and 64), then the trigrams and topics, then the rest of the hexagrams.",
        "6. Keep the 64 hexagram pictures consistent with each other: once the first few are settled, attach one or two of them as a style reference for the rest.",
        "",
        "## Status",
        "",
        f"{len(items) - done} requested, {done} delivered, {len(items)} in total.",
    ]
    section = None
    for e in items:
        if e["section"] != section:
            section = e["section"]
            lines += ["", f"## {section}"]
        lines += [
            "",
            f"### {e['code']} · {e['title']}",
            "",
            f"- **File:** `aiching/app/{e['path']}`",
            f"- **Size:** {e['size']}, {'transparent' if e['alpha'] else 'opaque'}",
            f"- **Used for:** {e['used']}",
            f"- **Stand-in until delivered:** {e['standin']}",
            f"- **Status:** {e['status']}",
            "",
            "```text",
            e["prompt"],
            "```",
        ]
    return "\n".join(lines) + "\n"


def main():
    items = entries()
    doc = render(items)
    assets = {e["id"]: {"path": e["path"], "status": e["status"], "code": e["code"]} for e in items}
    data = json.dumps(assets, ensure_ascii=False, indent=1) + "\n"
    if "--check" in sys.argv:
        stale = [p for p, text in ((DOC, doc), (ASSET_LIST, data)) if not p.exists() or p.read_text(encoding="utf-8") != text]
        if stale:
            print("out of date, rerun build_requests.py:", ", ".join(str(p.relative_to(ROOT)) for p in stale))
            sys.exit(1)
        print(f"image requests up to date ({len(items)} images)")
        return
    DOC.write_text(doc, encoding="utf-8")
    ASSET_LIST.write_text(data, encoding="utf-8")
    print(f"wrote {DOC.relative_to(ROOT)} and {ASSET_LIST.relative_to(ROOT)} ({len(items)} images)")


if __name__ == "__main__":
    main()
