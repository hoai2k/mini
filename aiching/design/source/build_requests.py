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

# The interface keeps one ancient look: ink, silk, seals and gold.
UI_STYLE = (
    "Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) "
    "joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and "
    "malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, "
    "saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft "
    "drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no "
    "seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram "
    "line symbols unless the prompt asks for them."
)

# The content pictures (hexagrams, trigrams, topics) range across colourful
# Chinese art from any era; each one takes the style that suits its theme.
ART_STYLES = {
    "tang": ("Tang blue-green landscape", "Tang dynasty blue-and-green landscape painting (qinglü shanshui): mineral azurite and malachite mountains outlined in fine ink, gold-leaf edges on peaks and clouds, on warm silk."),
    "gongbi": ("Song gongbi", "Song dynasty gongbi meticulous painting: hair-fine ink outlines, layered transparent colour washes, luminous birds, flowers and figures, on pale silk."),
    "dunhuang": ("Dunhuang mural", "Dunhuang Mogao cave mural painting: earthy red ochre, lapis blue, malachite green and gold, flying apsaras with streaming ribbons, flat decorative halos, softly weathered plaster texture."),
    "nianhua": ("New Year woodblock print", "Chinese New Year woodblock print (nianhua, Yangliuqing and Taohuawu style): bold black keyblock lines, flat hand-applied pinks, emerald, yellow and vermilion, cheerful plump figures and auspicious symbols."),
    "papercut": ("Paper-cut", "Chinese paper-cut art (jianzhi) in many layered colours: crisp cut silhouettes, lace-like patterns of clouds, waves and flowers, layers of red, gold, turquoise and pink paper casting soft shadows."),
    "poster": ("1930s Shanghai poster", "1930s Shanghai calendar-poster painting (yuefenpai): soft airbrushed watercolour, glowing pastel skin tones and silk qipao, art deco borders of flowers, luminous skies."),
    "inkanim": ("Ink-wash animation", "1960s Shanghai Animation Film Studio ink-wash animation: living Qi Baishi-style ink creatures and plants that bleed softly into wet paper, with a few clear touches of colour."),
    "havoc": ("Havoc in Heaven animation", "Classic 1960s Chinese animated film style, as in Havoc in Heaven: bold flat colours, strong graphic outlines drawn from temple murals and Peking opera, dynamic heroic poses, swirling stylised clouds."),
    "lianhuan": ("Picture-story book", "Lianhuanhua picture-story book illustration: confident ink line drawing with rich watercolour, cinematic framing, expressive figures in period costume, lively storytelling detail."),
    "guochao": ("Guochao illustration", "Contemporary Chinese guochao (national trend) digital illustration: vivid saturated gradients, flat graphic shapes, traditional motifs (waves, clouds, lanterns) reimagined boldly and playfully, crisp and modern."),
    "opera": ("Peking opera", "Peking opera inspired painting: painted-face masks with symbolic colours, embroidered costumes with pheasant plumes and water sleeves, dramatic stage poses against a deep red and gold ground."),
    "cloisonne": ("Cloisonné enamel", "Chinese cloisonné enamel: gleaming gold wire outlines enclosing turquoise, cobalt, coral red, jade green and white enamel, jewel-like and polished."),
    "famille": ("Famille-rose porcelain", "Qing famille-rose porcelain painting: soft enamels of rose pink, pale green, lemon yellow and sky blue with gold, delicate flowers, figures and garden scenes as if painted on a porcelain vase or plate."),
    "pomo": ("Splashed colour", "Splashed ink and colour (pomo) in the manner of Zhang Daqian: pools of brilliant azurite blue and malachite green flooding across the paper, ink accents and small precise details emerging from the colour."),
    "lingnan": ("Lingnan school", "Lingnan school painting: lively ink and bright colour combined, Western light and atmosphere with Chinese brushwork, vivid skies, birds and blossoms full of movement."),
    "modern": ("Modern ink and colour", "Modern Chinese ink and colour in the manner of Wu Guanzhong: rhythmic black lines like dancing threads, scattered dots of pure red, blue, green and yellow, white walls and grey roofs, joyful abstraction."),
    "embroidery": ("Silk embroidery", "Suzhou silk embroidery: thousands of fine silk-thread stitches with a soft sheen, gradated threads in jewel colours, every petal, feather and ripple stitched, on ivory satin."),
    "puppet": ("Shadow puppets", "Chinese shadow puppetry (piyingxi): translucent dyed leather figures in red, green, yellow and black with intricate punched patterns and jointed limbs, glowing in front of a warm lamplit screen."),
    "lacquer": ("Lacquer painting", "Chinese lacquerware painting: deep cinnabar red and lustrous black lacquer with gold and silver inlay, mother-of-pearl highlights, elegant layered scenes."),
}

# Style for each hexagram, in King Wen order, chosen for its theme.
HEX_STYLES = [
    "cloisonne", "tang", "lingnan", "lianhuan", "nianhua", "opera", "puppet", "papercut",  # 1-8
    "gongbi", "havoc", "famille", "modern", "poster", "lacquer", "tang", "nianhua",  # 9-16
    "guochao", "lianhuan", "embroidery", "dunhuang", "opera", "famille", "pomo", "papercut",  # 17-24
    "inkanim", "tang", "gongbi", "lingnan", "pomo", "cloisonne", "embroidery", "lacquer",  # 25-32
    "modern", "havoc", "poster", "puppet", "nianhua", "guochao", "tang", "havoc",  # 33-40
    "inkanim", "papercut", "opera", "poster", "dunhuang", "lingnan", "lianhuan", "gongbi",  # 41-48
    "guochao", "cloisonne", "havoc", "modern", "embroidery", "papercut", "lacquer", "lianhuan",  # 49-56
    "inkanim", "nianhua", "pomo", "famille", "dunhuang", "puppet", "guochao", "lingnan",  # 57-64
]

TRIGRAM_STYLES = {"qian": "cloisonne", "kun": "tang", "zhen": "havoc", "kan": "pomo", "gen": "modern", "xun": "embroidery", "li": "dunhuang", "dui": "nianhua"}
TOPIC_STYLES = {"love": "embroidery", "work": "lianhuan", "money": "nianhua", "health": "lingnan", "family": "papercut", "creativity": "famille",
                "study": "gongbi", "travel": "poster", "spirit": "dunhuang", "conflict": "opera", "decision": "guochao", "timing": "lacquer"}

# What each style must look like as a made object, stated first in the prompt:
# the first round of hexagrams came back in one painterly style when the
# style only closed the prompt.
MEDIUM = {
    "tang": "a Tang dynasty blue-and-green landscape painting on silk, with flat mineral-blue and malachite-green mountains outlined in ink and edged in gold",
    "gongbi": "a Song dynasty gongbi painting on silk, with hair-fine ink outlines and flat layered washes, no oil-paint texture",
    "dunhuang": "a Dunhuang cave mural: flat ochre, lapis and malachite pigment on weathered plaster, figures with halos and streaming ribbons, visible cracks and fading",
    "nianhua": "a Chinese New Year woodblock print: thick black printed outlines, flat bright colours laid in by hand, no shading, folk-art figures",
    "papercut": "a layered Chinese paper-cut: every shape is cut from flat coloured paper with crisp knife edges and lace-like cut patterns, layers stacked with small drop shadows, no painted texture at all",
    "poster": "a 1930s Shanghai calendar poster (yuefenpai): soft airbrushed watercolour, pastel glow, an art deco border of flowers running round the edge",
    "inkanim": "a frame from a 1960s Shanghai ink-wash animated film: wet black ink on white rice paper bleeding softly at the edges, mostly empty paper, only one or two touches of pale colour",
    "havoc": "a frame from a 1960s Chinese animated film like Havoc in Heaven: flat cel colours, bold graphic outlines, stylised curling clouds, no realistic lighting",
    "lianhuan": "a page of a Chinese picture-story book (lianhuanhua): confident ink line drawing with watercolour, framed as one cinematic panel",
    "guochao": "a contemporary Chinese guochao poster illustration: flat vector shapes, bold saturated gradients, simplified graphic waves, clouds and lanterns, crisp modern design, no painterly texture",
    "opera": "a Peking opera scene: painted-face masks, embroidered stage costumes and pheasant plumes, stage poses before a red and gold backdrop",
    "cloisonne": "a cloisonné enamel plaque photographed straight on: every shape is a cell of glossy enamel bounded by raised gold wire, flat jewel colours, polished surface, no brushwork",
    "famille": "famille-rose porcelain painting: the whole scene painted in soft enamels on the white glazed surface of a large porcelain plaque, with a gold rim, delicate and decorative",
    "pomo": "a splashed-colour painting in the manner of Zhang Daqian: big pools of brilliant azurite blue and malachite green flooding across the paper, with a few small precise ink details emerging from them",
    "lingnan": "a Lingnan school painting: lively wet ink with bright colour and Western-style light and atmosphere",
    "modern": "a modern ink-and-colour painting in the manner of Wu Guanzhong: rhythmic black lines like dancing threads, white walls and grey roofs, scattered dots of pure red, yellow, blue and green, mostly white paper, joyful abstraction",
    "embroidery": "a Suzhou silk embroidery: the whole picture stitched in shiny silk thread on ivory satin, every area made of visible directional stitches, no paint",
    "puppet": "a Chinese shadow-puppet play: translucent dyed-leather puppets with punched patterns and jointed limbs pressed against a glowing lamp-lit paper screen, flat side-on figures",
    "lacquer": "a Chinese carved and painted lacquer panel: deep cinnabar red and black lacquer with gold and silver inlay and mother-of-pearl, glossy, flat decorative scenes",
}

# Delivered hexagrams that missed their style: requested again. The delivered
# picture stays in use until the replacement arrives.
REPLACE = {
    1: "came back as a painted landscape, not cloisonné enamel",
    7: "painted, not shadow puppets",
    11: "painted, not famille-rose porcelain",
    13: "realistic painting, not a 1930s Shanghai poster",
    14: "painted, not lacquer",
    17: "painterly, not flat guochao illustration",
    19: "painted, not silk embroidery",
    22: "painted, not famille-rose porcelain",
    23: "detailed painting, not splashed colour",
    24: "painted snow scene, not paper-cut",
    25: "coloured painting, not ink-wash animation",
    30: "painted, not cloisonné enamel",
    31: "painted, not silk embroidery",
    32: "painted, not lacquer",
    33: "detailed ink landscape, not Wu Guanzhong's lines and dots",
    35: "realistic painting, not a 1930s Shanghai poster",
    36: "painted night scene, not shadow puppets",
    38: "painterly, not flat guochao illustration",
    49: "painted, not flat guochao illustration",
    53: "painted, not silk embroidery",
    55: "painted, not lacquer",
    59: "painted, not splashed colour",
    60: "painted, not famille-rose porcelain",
    63: "painterly, not flat guochao illustration",
}


def style_lead(key):
    return f"This picture must be made as {MEDIUM[key]}. Every part of it, edge to edge, is in that medium: not a realistic, painterly or digital-art illustration. "


ART_RULES = (
    "Colourful, rich and full of life, clearly illustrating the theme described above so that "
    "the picture tells its meaning at a glance. No text, no lettering, no calligraphy, no seals, "
    "no signature, no watermark, no frame, no UI, no hexagram or trigram line symbols."
)


assert len(HEX_STYLES) == 64 and all(k in ART_STYLES for k in [*HEX_STYLES, *TRIGRAM_STYLES.values(), *TOPIC_STYLES.values()])


def art_style(key):
    return f"Style: {ART_STYLES[key][1]} {ART_RULES}"


ALPHA = (
    "Transparent background (PNG with alpha). If transparency is not possible, use a flat pure "
    "magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on "
    "integration."
)

ROUNDEL = (
    "Made as a circular medallion, the round picture filling about 92% of the square and "
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
    "The subject is the I Ching hexagram {n}, {zh} {pinyin}, \"{name}\": the upper trigram is "
    "{upper} and the lower trigram is {lower}. Its theme is {theme}, and the picture should make "
    "that theme felt. {scene} The season or hour is {season}. Colours that "
    "suit it (adapt them to the style): {palette}. A wide 16:10 landscape composition, full bleed, opaque; "
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
DELIVERED: set[str] = {
    "ui-logo",
    "ui-icon",
    "ui-home-bg",
    "ui-paper",
    "ui-result-bg",
    "ui-clouds",
    "ui-coin-yang",
    "ui-coin-yin",
    "ui-yang",
    "ui-yin",
    "ui-divider",
    "ui-share",
    "trigram-qian",
    "trigram-kun",
    "trigram-zhen",
    "trigram-kan",
    "trigram-gen",
    "trigram-xun",
    "trigram-li",
    "trigram-dui",
    "topic-love",
    "topic-work",
    "topic-money",
    "topic-health",
    "topic-family",
    "topic-creativity",
    "topic-study",
    "topic-travel",
    "topic-spirit",
    "topic-conflict",
    "topic-decision",
    "topic-timing",
    "hexagram-01",
    "hexagram-02",
    "hexagram-03",
    "hexagram-04",
    "hexagram-05",
    "hexagram-06",
    "hexagram-07",
    "hexagram-08",
    "hexagram-09",
    "hexagram-10",
    "hexagram-11",
    "hexagram-12",
    "hexagram-13",
    "hexagram-14",
    "hexagram-15",
    "hexagram-16",
    "hexagram-17",
    "hexagram-18",
    "hexagram-19",
    "hexagram-20",
    "hexagram-21",
    "hexagram-22",
    "hexagram-23",
    "hexagram-24",
    "hexagram-25",
    "hexagram-26",
    "hexagram-27",
    "hexagram-28",
    "hexagram-29",
    "hexagram-30",
    "hexagram-31",
    "hexagram-32",
    "hexagram-33",
    "hexagram-34",
    "hexagram-35",
    "hexagram-36",
    "hexagram-37",
    "hexagram-38",
    "hexagram-39",
    "hexagram-40",
    "hexagram-41",
    "hexagram-42",
    "hexagram-43",
    "hexagram-44",
    "hexagram-45",
    "hexagram-46",
    "hexagram-47",
    "hexagram-48",
    "hexagram-49",
    "hexagram-50",
    "hexagram-51",
    "hexagram-52",
    "hexagram-53",
    "hexagram-54",
    "hexagram-55",
    "hexagram-56",
    "hexagram-57",
    "hexagram-58",
    "hexagram-59",
    "hexagram-60",
    "hexagram-61",
    "hexagram-62",
    "hexagram-63",
    "hexagram-64",
}


def entries():
    out = []
    for code, aid, title, path, size, alpha, used, standin, prompt in UI:
        out.append(dict(section="Interface", code=code, id=aid, title=title, path=path, size=size, alpha=alpha,
                        used=used, standin=standin, style="Ancient Chinese (interface)", prompt=f"{prompt} {UI_STYLE} {ALPHA if alpha else ''}".strip()))
    for i, (key, title, scene) in enumerate(TRIGRAMS, 1):
        out.append(dict(section="The eight trigrams", code=f"TR{i:02d}", id=f"trigram-{key}", title=title,
                        path=f"assets/trigrams/{key}.png", size="800 x 800", alpha=True,
                        used="The trigram cards of a reading (upper and lower trigram).",
                        standin="The three lines on a coloured ground, drawn in code.",
                        style=ART_STYLES[TRIGRAM_STYLES[key]][0],
                        prompt=f"{style_lead(TRIGRAM_STYLES[key])}{ROUNDEL}{scene} {art_style(TRIGRAM_STYLES[key])} {ALPHA}"))
    for i, (key, title, scene) in enumerate(TOPICS, 1):
        out.append(dict(section="Question topics", code=f"TP{i:02d}", id=f"topic-{key}", title=title,
                        path=f"assets/topics/{key}.png", size="800 x 800", alpha=True,
                        used=f"The counsel card for questions about {title.lower()}.",
                        standin="A seal-red character in a circle, drawn in code.",
                        style=ART_STYLES[TOPIC_STYLES[key]][0],
                        prompt=f"{style_lead(TOPIC_STYLES[key])}{ROUNDEL}{scene} {art_style(TOPIC_STYLES[key])} {ALPHA}"))
    for h in HEXAGRAMS:
        up, lo = trigrams(h["n"])
        prompt = HEX_PROMPT.format(n=h["n"], zh=h["zh"], pinyin=h["pinyin"], name=h["name"],
                                   upper=f"{TRI[up]}", lower=f"{TRI[lo]}", scene=h["scene"].strip(),
                                   season=h["season"], theme=", ".join(k.lower() for k in h["keywords"]), palette=", ".join(h["palette"]))
        out.append(dict(section="The sixty-four hexagrams", code=f"HX{h['n']:02d}", id=f"hexagram-{h['n']:02d}",
                        title=f"{h['n']}. {h['zh']} {h['pinyin']} · {h['name']}",
                        path=f"assets/hexagrams/{h['n']:02d}.webp", size="1600 x 1000", alpha=False,
                        used="The picture at the top of a reading, and the small picture of the hexagram it becomes.",
                        standin="A misty landscape in the hexagram's colours, drawn in code.",
                        style=ART_STYLES[HEX_STYLES[h["n"] - 1]][0],
                        replace=REPLACE.get(h["n"]),
                        prompt=f"{style_lead(HEX_STYLES[h['n'] - 1])}{prompt} {art_style(HEX_STYLES[h['n'] - 1])}"))
    for e in out:
        e["status"] = "delivered" if e["id"] in DELIVERED else "requested"
    return out


def web_path(path):
    """Where the page loads a picture from: its web copy (tools/build_web.py)."""
    return "web/" + path.split("/", 1)[1].rsplit(".", 1)[0] + ".webp"


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
        "1. Each prompt is complete on its own: paste it as it stands. The style text is already in every prompt.",
        "2. **Two looks.** The interface pictures (logo, icon, backgrounds, coins, brush strokes, ornaments) share one ancient Chinese look of ink, silk, seals and gold, to match the page. The content pictures (the 64 hexagrams, 8 trigrams and 12 topics) are colourful and illustrative, each in a Chinese art style from any era chosen for its theme: Dunhuang murals, gongbi, New Year woodblock prints, paper-cut, 1930s Shanghai posters, 1960s Shanghai animation, picture-story books, Peking opera, cloisonné, famille-rose porcelain, splashed colour, Lingnan, modern ink and colour, silk embroidery, shadow puppets, lacquer and contemporary guochao. Each entry's **Style** line names it.",
        "3. Save each image under the file name in its **File** line (the path is under `aiching/app/`) and drop it in `aiching/intake/`. On integration it moves into place, its id is added to `DELIVERED` in the script, and the script is rerun.",
        "4. Transparent images are `.png`. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration. Opaque images are listed as `.webp`; PNG or JPEG is fine too and is converted on integration.",
        "5. Nothing here blocks the app: until an image arrives it draws a stand-in in code.",
        "6. Suggested order: the icon and title (UI01, UI02), the home background (UI03), then a handful of hexagrams to settle the look (1 Heaven, 2 Earth, 29 Water, 30 Fire, 63 and 64), then the trigrams and topics, then the rest of the hexagrams.",
        "7. The content pictures differ in style on purpose, so do not attach one as a style reference for another; what keeps them together is the colour, the clarity of the theme and the gold-edged roundel for trigrams and topics.",
        "",
        "## Status",
        "",
        f"{len(items) - done} requested, {done} delivered, {len(items)} in total.",
    ]
    again = [e for e in items if e.get("replace")]
    if again:
        lines += [
            "",
            "## Replacements wanted",
            "",
            f"{len(again)} delivered hexagram pictures illustrate their theme but missed their art style, so they are requested again with the style first in the prompt. "
            "Generate them from their entries below and save them under the same file names; until then the app keeps showing the delivered ones.",
            "",
        ] + [f"- {e['code']} · {e['title']} ({e['style']}): {e['replace']}" for e in again]
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
            f"- **Style:** {e['style']}",
            f"- **Used for:** {e['used']}",
            f"- **Stand-in until delivered:** {e['standin']}",
            f"- **Status:** {e['status']}" + (f"; **replacement wanted:** {e['replace']}. Save it under the same file name; the delivered picture is used until it arrives." if e.get("replace") else ""),
            "",
            "```text",
            e["prompt"],
            "```",
        ]
    return "\n".join(lines) + "\n"


def main():
    items = entries()
    doc = render(items)
    assets = {e["id"]: {"path": web_path(e["path"]), "source": e["path"], "status": e["status"], "code": e["code"]} for e in items}
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
