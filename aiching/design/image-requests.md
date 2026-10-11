# Ai-Ching: image requests

Artwork for Ai-Ching, the I Ching reader in `aiching/` (see [`../README.md`](../README.md)). Generated from `source/build_requests.py`, which takes the hexagram scenes and colours from `app/data/hexagrams.json`; edit the data there and rerun it, which also rewrites `app/data/asset-list.json`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.
2. Save each image under the file name in its **File** line (the path is under `aiching/app/`) and drop it in `aiching/intake/`. On integration it moves into place, its id is added to `DELIVERED` in the script, and the script is rerun.
3. Transparent images are `.png`. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration. Opaque images are listed as `.webp`; PNG or JPEG is fine too and is converted on integration.
4. Nothing here blocks the app: until an image arrives it draws a stand-in in code.
5. Suggested order: the icon and title (UI01, UI02), the home background (UI03), then a handful of hexagrams to settle the look (1 Heaven, 2 Earth, 29 Water, 30 Fire, 63 and 64), then the trigrams and topics, then the rest of the hexagrams.
6. Keep the 64 hexagram pictures consistent with each other: once the first few are settled, attach one or two of them as a style reference for the rest.

## Status

96 requested, 0 delivered, 96 in total.

## Interface

### UI01 · Title

- **File:** `aiching/app/assets/ui/logo.png`
- **Size:** 1600 x 560, transparent
- **Used for:** The wordmark in the top bar and on the home page, and the card on the game library page.
- **Stand-in until delivered:** The name set in type beside a red seal drawn in code.
- **Status:** requested

```text
The name "Ai-Ching" written exactly like that, in elegant brush-written Latin letters with the energy of Chinese running-script calligraphy, in deep black ink with a faint gold sheen, and to its left a square cinnabar-red carved seal stamp bearing the single character 易 in white seal script. Wide landscape composition, nothing else, no other text. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### UI02 · App icon and favicon

- **File:** `aiching/app/assets/ui/icon.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Favicon, home-screen icon and the seal in the top bar.
- **Stand-in until delivered:** A red square with 易 drawn in code.
- **Status:** requested

```text
A square cinnabar-red seal stamp with slightly worn, irregular carved edges, bearing the single character 易 in white seal script, centred and filling the square. Printed-ink texture with tiny gaps where the paste did not take. Nothing else. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### UI03 · Home background

- **File:** `aiching/app/assets/ui/home-bg.webp`
- **Size:** 2400 x 1400, opaque
- **Used for:** Behind the question box on the home page.
- **Stand-in until delivered:** Pale paper with ink mountains drawn in code.
- **Status:** requested

```text
A very pale, quiet ink-wash landscape on warm cream rice paper: distant misty mountains rise along the bottom fifth and up the far left and right edges, a lone pine on a rock at lower left, two cranes small in the sky at upper right, a faint full moon. The whole centre and top-centre stay almost empty pale paper, because a text box sits there. Mostly soft grey ink with only a whisper of blue-green and one tiny red sun. Full bleed, opaque, wide. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### UI04 · Paper texture

- **File:** `aiching/app/assets/ui/paper.webp`
- **Size:** 1024 x 1024, opaque
- **Used for:** Tiled under the cards and the home page.
- **Stand-in until delivered:** A noise texture drawn in code.
- **Status:** requested

```text
Seamlessly tileable texture of handmade cream xuan rice paper: soft visible fibres, slight mottling, very low contrast, evenly lit, no objects, no stains at the edges. Must tile without visible seams. Opaque. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### UI05 · Reading background

- **File:** `aiching/app/assets/ui/result-bg.webp`
- **Size:** 2400 x 1400, opaque
- **Used for:** Behind the reading page, tinted by each hexagram's colours.
- **Stand-in until delivered:** A gradient in the hexagram's colours.
- **Status:** requested

```text
A rich, dark imperial silk brocade: deep indigo ground woven with a subtle repeating pattern of auspicious clouds (xiangyun) and small gold cranes, and a scattering of tiny gold-leaf flecks. Low contrast so text can sit on it, darkest at the centre. Full bleed, opaque, wide, evenly patterned edge to edge. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### UI06 · Cloud border

- **File:** `aiching/app/assets/ui/clouds.png`
- **Size:** 1800 x 320, transparent
- **Used for:** A border along the top of the reading and under the home page heading.
- **Stand-in until delivered:** A row of curls drawn in code.
- **Status:** requested

```text
A horizontal band of stylised auspicious clouds (xiangyun) in the gongbi manner: curling spiral cloud forms outlined in fine gold, filled with soft azurite blue to white gradients, flowing left to right in a long frieze, thinning out at both ends. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### UI07 · Coin, heads

- **File:** `aiching/app/assets/ui/coin-yang.png`
- **Size:** 600 x 600, transparent
- **Used for:** The coins thrown while a reading is cast (heads, worth 3).
- **Stand-in until delivered:** A bronze disc with a square hole drawn in code.
- **Status:** requested

```text
One old Chinese bronze cash coin seen straight on: round with a square hole in the centre, a raised rim, four characters in clerical script around the hole, warm bronze with patches of green verdigris and a worn golden shine on the high points. Nothing else. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### UI08 · Coin, tails

- **File:** `aiching/app/assets/ui/coin-yin.png`
- **Size:** 600 x 600, transparent
- **Used for:** The other face of the thrown coins (tails, worth 2).
- **Stand-in until delivered:** A darker bronze disc drawn in code.
- **Status:** requested

```text
The back of the same old Chinese bronze cash coin, seen straight on: round with a square hole, raised rim, a plain field with only two small crescent-and-dot marks, darker bronze with verdigris. Same size and lighting as the front. Nothing else. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### UI09 · Solid line stroke

- **File:** `aiching/app/assets/ui/yang.png`
- **Size:** 1400 x 180, transparent
- **Used for:** Each solid (yang) line of the hexagram drawings. Used as a mask, so only its shape counts.
- **Stand-in until delivered:** A rounded bar drawn in code.
- **Status:** requested

```text
One single horizontal brush stroke of black ink, made with a loaded broad brush from left to right: a firm pressed start, an even body, a slightly dry, feathered end with a few split-hair streaks. It fills the width, about one eighth as tall as it is long. Nothing else. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### UI10 · Broken line stroke

- **File:** `aiching/app/assets/ui/yin.png`
- **Size:** 1400 x 180, transparent
- **Used for:** Each broken (yin) line of the hexagram drawings. Used as a mask, so only its shape counts.
- **Stand-in until delivered:** Two rounded bars drawn in code.
- **Status:** requested

```text
Two short horizontal brush strokes of black ink side by side with a clear gap between them, together filling the width: each stroke a firm pressed start and a slightly dry end, the gap about one sixth of the width, in the middle. Same weight as a single long stroke. Nothing else. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### UI11 · Divider

- **File:** `aiching/app/assets/ui/divider.png`
- **Size:** 1400 x 140, transparent
- **Used for:** Between the sections of a reading.
- **Stand-in until delivered:** A thin gold rule drawn in code.
- **Status:** requested

```text
A slender ornamental divider: a fine gold line that thickens toward a small central motif of a round jade bi disc flanked by two tiny curling clouds, tapering to hair-thin points at both ends. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### UI12 · Share card

- **File:** `aiching/app/assets/ui/share.webp`
- **Size:** 1200 x 630, opaque
- **Used for:** The preview picture when a link to Ai-Ching is shared.
- **Stand-in until delivered:** None (no preview picture).
- **Status:** requested

```text
A wide painting: a scholar in a pale robe sits at a low table on a terrace above a misty blue-green river valley at dawn, three bronze coins lying on the table before them and a small incense burner trailing smoke into the shape of a dragon. Leave the right third calm sky and mist. Full bleed, opaque. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

## The eight trigrams

### TR01 · Heaven 乾

- **File:** `aiching/app/assets/trigrams/qian.png`
- **Size:** 800 x 800, transparent
- **Used for:** The trigram cards of a reading (upper and lower trigram).
- **Stand-in until delivered:** The three lines on a coloured ground, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. Heaven itself: a vast luminous sky with golden clouds parting, a coiled azure dragon soaring through them, the sun behind. Strength without effort. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TR02 · Earth 坤

- **File:** `aiching/app/assets/trigrams/kun.png`
- **Size:** 800 x 800, transparent
- **Used for:** The trigram cards of a reading (upper and lower trigram).
- **Stand-in until delivered:** The three lines on a coloured ground, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. The receptive earth: terraced fields in harvest gold rolling to the horizon, a mare grazing, a calm overcast sky, a mother's shawl of ochre colour in the land itself. Yielding and abundant. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TR03 · Thunder 震

- **File:** `aiching/app/assets/trigrams/zhen.png`
- **Size:** 800 x 800, transparent
- **Used for:** The trigram cards of a reading (upper and lower trigram).
- **Stand-in until delivered:** The three lines on a coloured ground, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. Thunder: a spring storm over a bamboo forest, a branching bolt of lightning, new green shoots bursting through the earth, a startled flight of birds. Shock that awakens. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TR04 · Water 坎

- **File:** `aiching/app/assets/trigrams/kan.png`
- **Size:** 800 x 800, transparent
- **Used for:** The trigram cards of a reading (upper and lower trigram).
- **Stand-in until delivered:** The three lines on a coloured ground, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. Water: a deep gorge where a river rushes between dark cliffs under a crescent moon, white foam curling in gongbi wave patterns. Danger, depth and flow. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TR05 · Mountain 艮

- **File:** `aiching/app/assets/trigrams/gen.png`
- **Size:** 800 x 800, transparent
- **Used for:** The trigram cards of a reading (upper and lower trigram).
- **Stand-in until delivered:** The three lines on a coloured ground, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. Mountain: a single great still mountain with a small temple gate at its foot and a monk seated in meditation, mist wrapping the slopes. Stillness and stopping. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TR06 · Wind 巽

- **File:** `aiching/app/assets/trigrams/xun.png`
- **Size:** 800 x 800, transparent
- **Used for:** The trigram cards of a reading (upper and lower trigram).
- **Stand-in until delivered:** The three lines on a coloured ground, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. Wind: a gentle wind moving through a willow grove, long branches and ribbons streaming, petals and a kite carried on the air. Gentle penetration. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TR07 · Fire 離

- **File:** `aiching/app/assets/trigrams/li.png`
- **Size:** 800 x 800, transparent
- **Used for:** The trigram cards of a reading (upper and lower trigram).
- **Stand-in until delivered:** The three lines on a coloured ground, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. Fire: the brilliant sun over a phoenix in flight, its plumage of flame red and gold, a lit lantern below. Clarity and clinging brightness. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TR08 · Lake 兌

- **File:** `aiching/app/assets/trigrams/dui.png`
- **Size:** 800 x 800, transparent
- **Used for:** The trigram cards of a reading (upper and lower trigram).
- **Stand-in until delivered:** The three lines on a coloured ground, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. Lake: a joyful lake at sunset with lotus flowers, two young women laughing in a small boat, ripples spreading, a pavilion on the shore. Joy and openness. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Question topics

### TP01 · Love & partnership

- **File:** `aiching/app/assets/topics/love.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about love & partnership.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A pair of mandarin ducks swimming side by side among lotus leaves under a full moon, a red silk thread running from one to the other across the water. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP02 · Work & calling

- **File:** `aiching/app/assets/topics/work.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about work & calling.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A master carpenter's workbench in a sunlit courtyard: plane, chisel and ink line tools, a half-built wooden bracket set of a temple roof rising beside it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP03 · Wealth & resources

- **File:** `aiching/app/assets/topics/money.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about wealth & resources.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A golden carp leaping from a pool toward a waterfall, bronze coins and gold ingots glinting on the pool's floor, peonies on the bank. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP04 · Health & body

- **File:** `aiching/app/assets/topics/health.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about health & body.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. An old pine leaning over a mountain spring, a white crane standing on one leg beside it, a gourd of medicine hanging from a branch, morning light. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP05 · Family & friends

- **File:** `aiching/app/assets/topics/family.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about family & friends.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A round table in a lantern-lit courtyard under the mid-autumn full moon, mooncakes and tea set out, an empty circle of stools waiting for the family. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP06 · Creative work

- **File:** `aiching/app/assets/topics/creativity.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about creative work.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A scholar's desk by an open window: brushes in a holder, an ink stone, a half-painted scroll of bamboo, a guqin zither and a plum branch in a vase. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP07 · Study & learning

- **File:** `aiching/app/assets/topics/study.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about study & learning.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A quiet library pavilion among bamboo, stacks of thread-bound books and bamboo-slip scrolls, an oil lamp burning, an open window onto stars. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP08 · Journeys & moves

- **File:** `aiching/app/assets/topics/travel.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about journeys & moves.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A long winding mountain road with a lone traveller and a laden horse heading toward a distant city gate at dawn, a river boat below, wild geese in a line overhead. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP09 · Spirit & meaning

- **File:** `aiching/app/assets/topics/spirit.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about spirit & meaning.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A sage seated on a rock beside a waterfall, gazing at drifting clouds, a yin-yang shaped pool of light and dark water at his feet, deep mist beyond. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP10 · Conflict & rivals

- **File:** `aiching/app/assets/topics/conflict.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about conflict & rivals.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. Two tigers facing each other across a mountain stream, one golden, one silver, neither yet leaping, with a calm moon above and a narrow log bridge between them. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP11 · A choice to make

- **File:** `aiching/app/assets/topics/decision.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about a choice to make.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A fork in a mountain path marked by an old stone lantern, one way climbing into sunlit pines, the other descending into a misty valley, a single traveller pausing. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### TP12 · A question of time

- **File:** `aiching/app/assets/topics/timing.png`
- **Size:** 800 x 800, transparent
- **Used for:** The counsel card for questions about a question of time.
- **Stand-in until delivered:** A seal-red character in a circle, drawn in code.
- **Status:** requested

```text
Painted as a circular medallion, the round picture filling about 92% of the square and cleanly edged in a thin gold line, like a painted fan leaf or a round album leaf. A bronze water clock and a sundial on a terrace, a plum tree in bud beside them, the sky turning from night to dawn across the picture, a faint crescent moon setting. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## The sixty-four hexagrams

### HX01 · 1. 乾 Qián · The Creative

- **File:** `aiching/app/assets/hexagrams/01.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 1, 乾 Qián, "The Creative": the upper trigram is Heaven and the lower trigram is Heaven. Six golden dragons coil and climb through towering summer clouds above a vast open plain. The lowest lies half-hidden in a misty lake, one walks the green fields, others rise higher, and the topmost soars alone near a blazing sun. Strong midday light, deep blue sky, wind streaming through the clouds. The season or hour is early summer noon. Let these colours lead the picture: #1f3a6e, #d9a72c, #f4e3b0. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX02 · 2. 坤 Kūn · The Receptive

- **File:** `aiching/app/assets/hexagrams/02.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 2, 坤 Kūn, "The Receptive": the upper trigram is Earth and the lower trigram is Earth. Endless ploughed fields of golden-brown earth roll to a soft horizon under a pale sky. A dark mare walks calmly along a furrow toward the southwest. Early frost glitters on the stubble at the field's edge, and a figure in a plain yellow robe tends the soil. Low, warm afternoon light. The season or hour is early autumn afternoon. Let these colours lead the picture: #6b4e2e, #d8b25a, #eae2cf. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX03 · 3. 屯 Zhūn · Difficulty at the Beginning

- **File:** `aiching/app/assets/hexagrams/03.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 3, 屯 Zhūn, "Difficulty at the Beginning": the upper trigram is Water and the lower trigram is Thunder. A green sprout pushes up through cracked, rain-dark soil while thunderclouds churn over a misty forest. A horse stands stalled beside an overturned cart on a muddy track, and a lone hunter peers uncertainly into dense woods where a deer vanishes. Flickers of lightning, cool grey spring light, puddles everywhere. The season or hour is early spring storm. Let these colours lead the picture: #3d4a3a, #7fa046, #c9d6e3. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX04 · 4. 蒙 Méng · Youthful Folly

- **File:** `aiching/app/assets/hexagrams/04.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 4, 蒙 Méng, "Youthful Folly": the upper trigram is Mountain and the lower trigram is Water. A clear spring bubbles from the foot of a mist-wrapped mountain into a small pool. A young child kneels at the water's edge, gazing up at an old teacher seated on a mossy rock beneath a pine. Morning fog veils the peak, dew on ferns, soft silver light. The season or hour is misty spring morning. Let these colours lead the picture: #4f6b6a, #a9c6b8, #f0ece0. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX05 · 5. 需 Xū · Waiting

- **File:** `aiching/app/assets/hexagrams/05.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 5, 需 Xū, "Waiting": the upper trigram is Water and the lower trigram is Heaven. A traveller sits on a riverbank meadow with bread and a jug of wine, gazing calmly across wide water toward dark billowing rainclouds over the far shore. Sand and mud stretch at the water's edge, and three strangers approach along the path. Heavy humid light, the hush before rain. The season or hour is humid summer afternoon before rain. Let these colours lead the picture: #3c5873, #c8a564, #e8e2d2. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX06 · 6. 訟 Sòng · Conflict

- **File:** `aiching/app/assets/hexagrams/06.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 6, 訟 Sòng, "Conflict": the upper trigram is Heaven and the lower trigram is Water. On a windswept plain, two cloaked figures argue across a deep rushing river beneath a sky split between clear high heaven and low dark clouds. A calm judge sits on a stone seat on a rise between them. A leather belt lies dropped on the bank. Grey autumn light, wind bending the reeds. The season or hour is windy late autumn. Let these colours lead the picture: #2f3d4c, #9a7b4f, #c94f3d. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX07 · 7. 師 Shī · The Army

- **File:** `aiching/app/assets/hexagrams/07.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 7, 師 Shī, "The Army": the upper trigram is Earth and the lower trigram is Water. Orderly ranks of soldiers with banners march across a vast brown plain at dawn, a seasoned general on horseback riding among them. Beneath the earth a hidden stream glints in a cut riverbank. Breath steams in cold air; a pale sun rises over distant hills. The season or hour is cold winter dawn. Let these colours lead the picture: #4a3b2a, #8b2f2a, #d6c39a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX08 · 8. 比 Bǐ · Holding Together

- **File:** `aiching/app/assets/hexagrams/08.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 8, 比 Bǐ, "Holding Together": the upper trigram is Water and the lower trigram is Earth. Many small streams wind across a green plain after rain, all flowing together into a shining lake at the centre. Villagers walk along the banks toward a gathering by the water, where a leader welcomes them. A royal hunt in the distance leaves an open path for deer to flee. Clear, fresh spring light. The season or hour is spring after rain. Let these colours lead the picture: #2e5c6e, #7cae7a, #f2d68a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX09 · 9. 小畜 Xiǎo Chù · The Taming Power of the Small

- **File:** `aiching/app/assets/hexagrams/09.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 9, 小畜 Xiǎo Chù, "The Taming Power of the Small": the upper trigram is Wind and the lower trigram is Heaven. Dense dark clouds roll in from the west over a quiet farmhouse and tidy garden, while a soft wind bends the grain. A small figure gently leads a large ox on a rope. A wagon wheel with broken spokes rests by the gate. Above, a nearly full moon shows through a break in the clouds. Humid dusk light. The season or hour is humid summer dusk. Let these colours lead the picture: #5a6470, #a7b98a, #f1e4b8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX10 · 10. 履 Lǚ · Treading

- **File:** `aiching/app/assets/hexagrams/10.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 10, 履 Lǚ, "Treading": the upper trigram is Heaven and the lower trigram is Lake. A barefoot traveller in plain robes steps lightly along a sunlit forest path, carefully passing a great striped tiger lying across the way, whose tail stretches onto the trail. Ahead the path opens onto a still lake mirroring a high clear sky. Dappled early summer light through bamboo. The season or hour is bright early summer morning. Let these colours lead the picture: #2f5d50, #d7892f, #f3ead2. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX11 · 11. 泰 Tài · Peace

- **File:** `aiching/app/assets/hexagrams/11.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 11, 泰 Tài, "Peace": the upper trigram is Earth and the lower trigram is Heaven. A green spring valley where blue sky seems to descend to touch the blossoming earth. Farmers and nobles share a meal under flowering trees, and grass and roots are lifted together from the soil. Across a gentle river, a wedding procession crosses a bridge. Warm, clear morning light. The season or hour is early spring morning. Let these colours lead the picture: #3f7d5a, #87b6d9, #f6d6a8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX12 · 12. 否 Pǐ · Standstill

- **File:** `aiching/app/assets/hexagrams/12.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 12, 否 Pǐ, "Standstill": the upper trigram is Heaven and the lower trigram is Earth. A grey early-winter landscape where low heavy clouds hang far above frozen, barren fields that seem not to meet the sky. A lone scholar in a padded robe walks away along a bare path toward a hut in the hills. Near the hut, a cluster of mulberry shoots shows first green buds. Cold, dim light. The season or hour is early winter, overcast. Let these colours lead the picture: #4b4e57, #8c8f86, #b9cf8e. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX13 · 13. 同人 Tóng Rén · Fellowship with Others

- **File:** `aiching/app/assets/hexagrams/13.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 13, 同人 Tóng Rén, "Fellowship with Others": the upper trigram is Heaven and the lower trigram is Fire. On an open meadow at dusk, many people from different villages gather around a great bonfire whose flames rise toward a clear deep-blue sky. Two old friends embrace, laughing through tears. On a distant hill, hidden spears lie abandoned in a thicket, and a city wall stands quiet. Warm firelight against cool twilight. The season or hour is summer evening. Let these colours lead the picture: #1d3557, #e07a2e, #f6d9a6. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX14 · 14. 大有 Dà Yǒu · Possession in Great Measure

- **File:** `aiching/app/assets/hexagrams/14.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 14, 大有 Dà Yǒu, "Possession in Great Measure": the upper trigram is Fire and the lower trigram is Heaven. A radiant midday sun blazes over golden fields heavy with grain. A large oxcart, piled high with sheaves, rolls toward a palace gate where a prince humbly offers baskets to a seated sovereign. Villagers share bread beneath shade trees. Brilliant midsummer light, deep blue sky. The season or hour is midsummer noon. Let these colours lead the picture: #c78a1e, #2e5aa7, #f7e7a1. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX15 · 15. 謙 Qiān · Modesty

- **File:** `aiching/app/assets/hexagrams/15.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 15, 謙 Qiān, "Modesty": the upper trigram is Earth and the lower trigram is Mountain. A great mountain lies low and broad beneath rolling farmland, its peak worn smooth and covered with fields. A humble farmer in plain clothes levels soil, carrying earth from a high mound to fill a hollow. Nearby a quiet river is being forded. Soft golden harvest light, wide calm sky. The season or hour is late autumn harvest. Let these colours lead the picture: #7a6a4f, #b7c48a, #efe3c4. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX16 · 16. 豫 Yù · Enthusiasm

- **File:** `aiching/app/assets/hexagrams/16.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 16, 豫 Yù, "Enthusiasm": the upper trigram is Thunder and the lower trigram is Earth. Spring thunder rumbles from dark clouds rising out of the green earth while villagers gather on a hillside, drumming, playing flutes and dancing around a bright shrine. A leader with a jade hair clasp stands at the centre as friends gather close. Birds burst from blossoming trees. Fresh, electric spring light. The season or hour is spring thunder. Let these colours lead the picture: #2f4f3a, #c43d3d, #f2c94c. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX17 · 17. 隨 Suí · Following

- **File:** `aiching/app/assets/hexagrams/17.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 17, 隨 Suí, "Following": the upper trigram is Lake and the lower trigram is Thunder. Late dusk over a broad still lake. Low thunderclouds rest on the water, faint lightning glowing within them. Along the shore a line of travelers walks behind a lantern-bearer toward a lit farmhouse, an old man leading and a small boy trailing. Reeds bend one way in the breeze. On a far western mountain a thin column of offering smoke rises. The season or hour is autumn evening. Let these colours lead the picture: #3b4a5c, #c98f3d, #e8d9a8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX18 · 18. 蠱 Gǔ · Work on What Has Been Spoiled

- **File:** `aiching/app/assets/hexagrams/18.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 18, 蠱 Gǔ, "Work on What Has Been Spoiled": the upper trigram is Mountain and the lower trigram is Wind. Early spring in a mountain valley. A strong wind pours down the slope beneath a snow-capped peak, scattering dead leaves from an overgrown courtyard. A young man and an old woman scrub a moss-stained bronze cauldron by a cracked well. Beetles crawl from a rotted beam they have pulled away. Fresh green shoots push up among the broken flagstones. The season or hour is early spring. Let these colours lead the picture: #4a5a3c, #8c6a3f, #b9d27a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX19 · 19. 臨 Lín · Approach

- **File:** `aiching/app/assets/hexagrams/19.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 19, 臨 Lín, "Approach": the upper trigram is Earth and the lower trigram is Lake. A low green hill descends to the edge of a wide shining lake under a pale late-winter sun. A teacher in a padded robe walks down the slope toward a cluster of children and herders waiting by the water, arms open. Willow buds show the first green. Geese return in a long line above the far shore. The season or hour is end of winter. Let these colours lead the picture: #6b8c5a, #d9b65c, #a7c7d9. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX20 · 20. 觀 Guān · Contemplation

- **File:** `aiching/app/assets/hexagrams/20.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 20, 觀 Guān, "Contemplation": the upper trigram is Wind and the lower trigram is Earth. A tall wooden watchtower stands on an open plain in late autumn. Wind combs the yellowed grass flat in long waves. A robed figure stands at the top with hands folded, gazing over villages spread below. At the tower's base a child peers through a narrow door crack. A brass basin of water sits on a stone altar beside an unlit incense bowl. The season or hour is late autumn. Let these colours lead the picture: #8a7a5a, #5a6f7f, #e3d2a2. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX21 · 21. 噬嗑 Shì Hé · Biting Through

- **File:** `aiching/app/assets/hexagrams/21.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 21, 噬嗑 Shì Hé, "Biting Through": the upper trigram is Fire and the lower trigram is Thunder. A summer night in an old courtyard. Lightning splits the sky above a tiled roof while thunder rolls. Under a lantern a magistrate in dark robes sits at a low table with brush and scales. Before him a pair of carved wooden jaws clamps a bronze rod. A strip of dried meat lies on a dish beside a few scattered arrowheads and a lump of gold. The season or hour is summer storm. Let these colours lead the picture: #2b2a3a, #e0b93a, #b33a2e. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX22 · 22. 賁 Bì · Grace

- **File:** `aiching/app/assets/hexagrams/22.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 22, 賁 Bì, "Grace": the upper trigram is Mountain and the lower trigram is Fire. Evening at the foot of a green mountain. A bonfire glows at its base, lighting terraced gardens and a pavilion hung with modest silk. A young man has stepped down from an ornate carriage to walk barefoot on the path. A white horse with flowing mane gallops toward the garden gate. Petals drift through warm firelight. The season or hour is late summer evening. Let these colours lead the picture: #2f4f3a, #e07a3b, #f4efe6. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX23 · 23. 剝 Bō · Splitting Apart

- **File:** `aiching/app/assets/hexagrams/23.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 23, 剝 Bō, "Splitting Apart": the upper trigram is Mountain and the lower trigram is Earth. A grey late-autumn hillside. A lone stone mountain sits heavy on cracked earth, its base crumbling into scree. Nearby a wooden bed lies outdoors, its legs split and its frame splintered. Wind strips the last leaves from a gnarled tree where one large ripe fruit still hangs. A woman leads a line of maidens along the path below, like fish on a string. The season or hour is late autumn. Let these colours lead the picture: #5e5a55, #9c6b3d, #d64f2a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX24 · 24. 復 Fù · Return

- **File:** `aiching/app/assets/hexagrams/24.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 24, 復 Fù, "Return": the upper trigram is Earth and the lower trigram is Thunder. A snowy valley at dawn on the winter solstice. A single shaft of pale sunlight breaks over the ridge and touches a closed mountain pass where a gate stands shut. A lone traveler walks back down a winding path toward a cottage with smoke rising. Beneath the snow, a faint crack of green shows where a shoot is stirring. Distant thunder rumbles underground. The season or hour is winter solstice. Let these colours lead the picture: #cfd8e3, #5a6b7c, #f2c45a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX25 · 25. 無妄 Wú Wàng · Innocence

- **File:** `aiching/app/assets/hexagrams/25.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 25, 無妄 Wú Wàng, "Innocence": the upper trigram is Heaven and the lower trigram is Thunder. Spring under a vast open sky. Thunderheads roll above a freshly plowed field where a farmer guides an ox without looking back at the furrows. At the field edge a tethered cow is being led away by a passing wanderer, while a villager stands startled. Wildflowers spring up everywhere in the rain-washed light. The season or hour is spring. Let these colours lead the picture: #7a9bb8, #6a8c3f, #f0e3b0. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX26 · 26. 大畜 Dà Chù · The Taming Power of the Great

- **File:** `aiching/app/assets/hexagrams/26.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 26, 大畜 Dà Chù, "The Taming Power of the Great": the upper trigram is Mountain and the lower trigram is Heaven. A great mountain in late winter, its inner caves glowing with a golden light as if the sky were stored inside. In front, a young bull with a wooden guard on its horns stands calmly beside a cart with its axle pins removed. A scholar sits in a cave mouth surrounded by bamboo scrolls. A broad road climbs past the peak into open blue sky. The season or hour is late winter. Let these colours lead the picture: #3e4f5e, #c9a14a, #9ecbe0. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX27 · 27. 頤 Yí · Nourishment

- **File:** `aiching/app/assets/hexagrams/27.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 27, 頤 Yí, "Nourishment": the upper trigram is Mountain and the lower trigram is Thunder. Early summer at the foot of a mountain. A wide mouth-shaped cave opens above a terraced field where thunderclouds gather. Inside, an old woman serves rice and soup to children seated in a ring. A large tortoise basks on a stone by the entrance. On a ledge above, a tiger watches, eyes bright and steady. Ripening grain fills the lower terraces. The season or hour is early summer. Let these colours lead the picture: #5f7a45, #d9a85b, #a63d2f. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX28 · 28. 大過 Dà Guò · Preponderance of the Great

- **File:** `aiching/app/assets/hexagrams/28.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 28, 大過 Dà Guò, "Preponderance of the Great": the upper trigram is Lake and the lower trigram is Wind. A spring flood has risen over a riverbank, the water lapping at the branches of drowned willows. An old wooden hall stands half in the water, its massive ridgepole bowing in the middle, propped up by men with fresh timbers. White rushes are spread on the ground beneath an altar. A dry willow sprouts green shoots at its root while another bursts into pale flowers. The season or hour is spring flood. Let these colours lead the picture: #3a5a6b, #a68457, #e8e3d0. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX29 · 29. 坎 Kǎn · The Abysmal

- **File:** `aiching/app/assets/hexagrams/29.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 29, 坎 Kǎn, "The Abysmal": the upper trigram is Water and the lower trigram is Water. Midnight in midwinter. A black river rushes through a deep double gorge, falling from pool to pool between wet cliffs. Moonlight glints on spray. On a narrow ledge, a figure lowers a clay jug and bowl through a small window cut into the rock. Further down, thorn bushes choke a dry ravine bound with old ropes. The season or hour is midwinter midnight. Let these colours lead the picture: #16243a, #3d6b8a, #cfe0ec. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX30 · 30. 離 Lí · The Clinging

- **File:** `aiching/app/assets/hexagrams/30.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 30, 離 Lí, "The Clinging": the upper trigram is Fire and the lower trigram is Fire. High summer noon. Two great bonfires blaze one above the other on a terraced hillside, their light doubling across a valley. A pheasant with brilliant plumage perches on a burning branch. Below, a gentle cow is led by a herder to drink. Along the western ridge an old man beats a clay pot and sings toward the sun. The season or hour is midsummer noon. Let these colours lead the picture: #d94a2a, #f2b632, #3a2a1f. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX31 · 31. 咸 Xián · Influence

- **File:** `aiching/app/assets/hexagrams/31.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 31, 咸 Xián, "Influence": the upper trigram is Lake and the lower trigram is Mountain. Late spring on a mountaintop where a clear lake lies in a hollow of grey stone. A young man and a young woman sit on opposite rocks at the water's edge, leaning toward each other. Blossoms float on the surface. Mist rises from the lake into soft morning light, and a pair of mandarin ducks glide side by side. The season or hour is late spring morning. Let these colours lead the picture: #7fa3a8, #e8b4b8, #f7efe2. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX32 · 32. 恆 Héng · Duration

- **File:** `aiching/app/assets/hexagrams/32.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 32, 恆 Héng, "Duration": the upper trigram is Thunder and the lower trigram is Wind. A long-married elderly couple walk hand in hand along a path through an old orchard as autumn wind and distant thunder stir the trees. Leaves swirl but the deep-rooted trunks stand firm. Behind them a stone house with a smoking chimney sits on a hillside. A hunter in an empty field waits with bow lowered, the meadow bare. The season or hour is autumn. Let these colours lead the picture: #6b4f3a, #a8a074, #d6cfa8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX33 · 33. 遯 Dùn · Retreat

- **File:** `aiching/app/assets/hexagrams/33.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 33, 遯 Dùn, "Retreat": the upper trigram is Heaven and the lower trigram is Mountain. A lone figure in a grey travelling cloak walks up a narrow mountain path at dusk, leading a small ox loaded with bundles. Below, a walled town glows with crowded torchlight. Above, the sky opens wide and pale, drawing away from the peaks. Pines lean in a cool wind, and a few late-summer leaves are already turning. The season or hour is late summer, as the days begin to shorten. Let these colours lead the picture: #5b6770, #c9b37e, #e8eef2. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX34 · 34. 大壯 Dà Zhuàng · The Power of the Great

- **File:** `aiching/app/assets/hexagrams/34.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 34, 大壯 Dà Zhuàng, "The Power of the Great": the upper trigram is Thunder and the lower trigram is Heaven. A great storm breaks over a high plateau in early spring: thunder cracks from towering clouds while a powerful ram stands at the edge of a thorny hedge, horns lowered but held still. Behind it, a heavy wooden cart with a stout axle waits on the road. Rain streaks the air and the first green shoots push through dark soil. The season or hour is early spring, the month of the first great thunder. Let these colours lead the picture: #3e4a5c, #b98a3c, #f2e3a0. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX35 · 35. 晉 Jìn · Progress

- **File:** `aiching/app/assets/hexagrams/35.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 35, 晉 Jìn, "Progress": the upper trigram is Fire and the lower trigram is Earth. Dawn breaks over wide flat farmland: a golden sun lifts above the horizon and floods the fields with light. Along a straight road a young official rides toward a distant palace, followed by a train of fine horses with bright harness. Peasants pause in the furrows to watch. Mist burns off the earth, and a small field rat scurries into the ditch. The season or hour is early morning in spring. Let these colours lead the picture: #c4692f, #f4c75a, #7a8f4a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX36 · 36. 明夷 Míng Yí · Darkening of the Light

- **File:** `aiching/app/assets/hexagrams/36.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 36, 明夷 Míng Yí, "Darkening of the Light": the upper trigram is Earth and the lower trigram is Fire. A winter night over a dark plain: the last red glow of sunset sinks beneath the earth, leaving only a thin line of fire on the horizon. A pheasant with lowered wings flies low over frozen reeds. In a humble village hut, a scholar sits by a shuttered lamp whose light leaks through the cracks. Snow falls softly. The season or hour is deep winter night. Let these colours lead the picture: #1c2233, #8f2e22, #e0a24a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX37 · 37. 家人 Jiā Rén · The Family

- **File:** `aiching/app/assets/hexagrams/37.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 37, 家人 Jiā Rén, "The Family": the upper trigram is Wind and the lower trigram is Fire. A warm farmhouse kitchen at evening: a fire burns in a clay hearth, its smoke drifting up and out through a window into a breezy autumn dusk. Three generations gather around a low table set with steaming bowls. A grandmother ladles soup while a father pours tea and children set out chopsticks. Lanterns glow and dried herbs hang from the beams. The season or hour is autumn evening, when lamps are lit. Let these colours lead the picture: #7a3b24, #e3a857, #f5e6c8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX38 · 38. 睽 Kuí · Opposition

- **File:** `aiching/app/assets/hexagrams/38.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 38, 睽 Kuí, "Opposition": the upper trigram is Fire and the lower trigram is Lake. On a lakeshore at dusk, flames from a beacon fire leap upward while their reflection trembles on still dark water below. Two travellers stand on opposite banks, one raising a bow, then lowering it. A muddy cart with a halted ox waits on the road, and a stray horse wanders back toward its owner. Summer rain clouds gather overhead. The season or hour is summer twilight before rain. Let these colours lead the picture: #2f4858, #d9562b, #f2c14e. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX39 · 39. 蹇 Jiǎn · Obstruction

- **File:** `aiching/app/assets/hexagrams/39.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 39, 蹇 Jiǎn, "Obstruction": the upper trigram is Water and the lower trigram is Mountain. A narrow mountain pass in early winter: a swollen stream tumbles over black rocks between steep cliffs, and the trail ahead vanishes under a rockfall. A traveller with a staff has turned back toward a sheltered hollow where friends tend a small fire. Snow dusts the pines, and pale light falls from the southwest across lower, gentler hills. The season or hour is early winter in the mountains. Let these colours lead the picture: #3b4a54, #8fa3ad, #d8c8a8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX40 · 40. 解 Xiè · Deliverance

- **File:** `aiching/app/assets/hexagrams/40.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 40, 解 Xiè, "Deliverance": the upper trigram is Thunder and the lower trigram is Water. Early spring after a thunderstorm: rain sweeps across a valley as dark clouds break apart, and sunlight spills over fresh green fields. A hunter in a yellow robe holds a bow, three foxes slipping away into the grass. On a high city wall a hawk is struck from its perch. Swollen streams run freely and buds burst on wet branches. The season or hour is early spring, just after the first storm. Let these colours lead the picture: #4b6b52, #d9b44a, #a9c9d9. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX41 · 41. 損 Sǔn · Decrease

- **File:** `aiching/app/assets/hexagrams/41.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 41, 損 Sǔn, "Decrease": the upper trigram is Mountain and the lower trigram is Lake. A clear lake lies at the foot of a rugged mountain in late autumn, its mist rising to water the slopes above. On a stone ledge, a person in plain robes sets down two small earthen bowls of rice and water as an offering. Bare trees stand reflected in still water, a few red leaves floating. Two pilgrims walk the shore path together. The season or hour is late autumn. Let these colours lead the picture: #6b6a5a, #b5523a, #cfd8d4. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX42 · 42. 益 Yì · Increase

- **File:** `aiching/app/assets/hexagrams/42.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 42, 益 Yì, "Increase": the upper trigram is Wind and the lower trigram is Thunder. A fertile river valley in spring: thunder rolls in the distance as a strong wind bends young wheat in silver waves. Farmers carry baskets of seed and share them across field boundaries. A wide river runs to the sea, where a sturdy boat with full sails sets out across the water. Blossoming trees line the banks under a bright, cloud-swept sky. The season or hour is spring sowing. Let these colours lead the picture: #3f7a5c, #e1b83f, #9ac7e0. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX43 · 43. 夬 Guài · Breakthrough

- **File:** `aiching/app/assets/hexagrams/43.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 43, 夬 Guài, "Breakthrough": the upper trigram is Lake and the lower trigram is Heaven. A high marsh lake swollen by spring rains, its waters lapping almost to the sky beneath massing storm clouds. A messenger strides toward a palace gate under a single umbrella, splattered by sudden rain. In the foreground, a farmer pulls stubborn purslane from a wet field. A small sheep follows a herder along a muddy track. Lightning glimmers far off. The season or hour is early summer, before the rains break. Let these colours lead the picture: #41566b, #c7d3d9, #d6a03a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX44 · 44. 姤 Gòu · Coming to Meet

- **File:** `aiching/app/assets/hexagrams/44.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 44, 姤 Gòu, "Coming to Meet": the upper trigram is Heaven and the lower trigram is Wind. A midsummer afternoon under a vast clear sky, a warm wind sweeping across the plain and bending tall grass. At a village crossroads, a tall young woman in bright robes meets a weathered traveller. A ripe melon lies hidden beneath trailing willow branches, a fish circles in a stone tank, and a lean pig roots by a cart wheel fitted with a bronze brake. The season or hour is midsummer, just after the solstice. Let these colours lead the picture: #5c86a8, #e3c66a, #b0473a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX45 · 45. 萃 Cuì · Gathering Together

- **File:** `aiching/app/assets/hexagrams/45.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 45, 萃 Cuì, "Gathering Together": the upper trigram is Lake and the lower trigram is Earth. A broad lake rises over green lowlands at harvest time, and from every road people stream toward a hilltop temple with baskets of fruit, grain and flowers. A king in ceremonial robes climbs the stone steps as drums sound. Guards polish their spears in the shade. Lanterns hang from pines, and the late summer sky glows gold. The season or hour is late summer harvest. Let these colours lead the picture: #3d6e6a, #d6a64b, #c2453b. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX46 · 46. 升 Shēng · Pushing Upward

- **File:** `aiching/app/assets/hexagrams/46.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 46, 升 Shēng, "Pushing Upward": the upper trigram is Earth and the lower trigram is Wind. A green hillside in late spring: young trees push upward from dark soil, new leaves glowing in warm sunlight. A long stone stairway winds up the slope toward a mountain shrine, and a lone figure climbs step by step with a small offering basket. Below lies a quiet, open city with its gates wide. Birds circle in a bright southern sky. The season or hour is late spring, the time of vigorous growth. Let these colours lead the picture: #4f7a3a, #a9c96b, #e9d8a6. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX47 · 47. 困 Kùn · Oppression

- **File:** `aiching/app/assets/hexagrams/47.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 47, 困 Kùn, "Oppression": the upper trigram is Lake and the lower trigram is Water. A cracked, empty lakebed in late autumn, its mud split into dry plates. A weary traveller sits beneath a bare, leafless tree at the edge of a shadowed valley. Thorny bushes and a heavy boulder block the path; creeping vines curl around a stalled golden carriage. Thin clouds drift overhead, and a faint line of rain approaches from far away. The season or hour is late autumn drought. Let these colours lead the picture: #6e5a46, #b9a07a, #7f8c99. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX48 · 48. 井 Jǐng · The Well

- **File:** `aiching/app/assets/hexagrams/48.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 48, 井 Jǐng, "The Well": the upper trigram is Water and the lower trigram is Wind. A stone well stands at the centre of an old village square in early morning. A wooden windlass creaks as a woman lowers a bucket on a long rope, and clear cold water sparkles in the dark shaft. Villagers wait with clay jugs, one of them cracked. Willows lean over the well, and soft mist hangs over tiled roofs. The season or hour is early morning in spring. Let these colours lead the picture: #3b5a6b, #8a6f4e, #cfe4e8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX49 · 49. 革 Gé · Revolution

- **File:** `aiching/app/assets/hexagrams/49.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 49, 革 Gé, "Revolution": the upper trigram is Lake and the lower trigram is Fire. A wide mountain lake at dawn in late summer, its surface steaming where a ring of bonfires burns on rafts across the water. On the shore a tiger and a leopard stand on wet rocks, their coats bright and freshly molted, old fur drifting on the shallows. A yellow ox hide lies folded on a stone. Mist, orange firelight and pale blue sky meet. The season or hour is late summer turning to autumn. Let these colours lead the picture: #2e5c6e, #d9732b, #f2c14e. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX50 · 50. 鼎 Dǐng · The Cauldron

- **File:** `aiching/app/assets/hexagrams/50.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 50, 鼎 Dǐng, "The Cauldron": the upper trigram is Fire and the lower trigram is Wind. Inside a dim stone hall on a cool autumn evening, a great three-legged bronze cauldron sits over a crackling fire of split logs. Steam rises from it into slanting gold light. Its handles gleam yellow, its carrying rings are pale green jade. Beside it, a pheasant lies on a wooden board, and robed figures wait quietly with bowls. The season or hour is autumn evening. Let these colours lead the picture: #3b2a1e, #b8862f, #7fa88a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX51 · 51. 震 Zhèn · The Arousing

- **File:** `aiching/app/assets/hexagrams/51.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 51, 震 Zhèn, "The Arousing": the upper trigram is Thunder and the lower trigram is Thunder. A spring night over a green valley: lightning splits a purple sky and strikes a lone pine on a hill. Below, villagers in a lantern-lit courtyard flinch, but one elder stands still at an altar, holding a bronze ladle and cup without spilling. Rain begins to fall, puddles shiver, and newly sprouted rice shines in the flashes. The season or hour is early spring storm. Let these colours lead the picture: #2b2140, #f4e285, #5f8f4e. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX52 · 52. 艮 Gèn · Keeping Still

- **File:** `aiching/app/assets/hexagrams/52.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 52, 艮 Gèn, "Keeping Still": the upper trigram is Mountain and the lower trigram is Mountain. Two snow-dusted mountain ranges rise one behind the other in early winter, utterly still under a pale sky. On a flat rock in the foreground a lone figure sits cross-legged with a straight back, facing the peaks, a wooden gate and an empty courtyard behind them. No wind; frost on the grass, a single crow resting on a stone wall. The season or hour is early winter, the quiet hour before dawn. Let these colours lead the picture: #5a6b73, #e8e4dc, #9b5d3a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX53 · 53. 漸 Jiàn · Development

- **File:** `aiching/app/assets/hexagrams/53.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 53, 漸 Jiàn, "Development": the upper trigram is Wind and the lower trigram is Mountain. An autumn mountainside where a single old pine grows from rocky ground above a shore. Wild geese appear in stages along the slope: one on the beach, two on a cliff ledge, others on the high plain, in the pine branches and on the summit, with a final skein flying into bright clouds. Golden afternoon light, reeds and gentle mist. The season or hour is mid autumn. Let these colours lead the picture: #47603f, #d9b56a, #c6d4dc. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX54 · 54. 歸妹 Guī Mèi · The Marrying Maiden

- **File:** `aiching/app/assets/hexagrams/54.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 54, 歸妹 Guī Mèi, "The Marrying Maiden": the upper trigram is Thunder and the lower trigram is Lake. Early spring on a lakeshore under a rumbling grey-violet sky, distant thunder rippling the water. A bridal procession of lanterns and red silk winds along the path; a young woman in plain clothes walks behind an elaborately robed maid. A nearly full moon rises over reeds, and an empty basket rests on the ground by a willow. The season or hour is early spring, moonrise. Let these colours lead the picture: #4a4466, #b8323f, #e9dcb8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX55 · 55. 豐 Fēng · Abundance

- **File:** `aiching/app/assets/hexagrams/55.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 55, 豐 Fēng, "Abundance": the upper trigram is Thunder and the lower trigram is Fire. Midsummer noon above a ripening river valley: the sun blazes overhead while a thunderstorm crackles at the edges of the sky, lightning flashing gold. A great timber hall stands open, its tables piled with fruit and grain, banners flying. People crowd its courtyard in bright clothing, and the heavy fields shimmer in heat. The season or hour is midsummer noon. Let these colours lead the picture: #c7621f, #f5c542, #2f4a7a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX56 · 56. 旅 Lǚ · The Wanderer

- **File:** `aiching/app/assets/hexagrams/56.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 56, 旅 Lǚ, "The Wanderer": the upper trigram is Fire and the lower trigram is Mountain. A late-autumn evening on a mountain road: a lone traveller with a staff and bundle walks past a wayside inn while, on the ridge above, a grass fire runs in a thin orange line against a dusky sky. A pheasant rises from bracken. Bare trees, a small lantern at the inn's door and long purple shadows. The season or hour is late autumn dusk. Let these colours lead the picture: #3d3550, #e0702c, #c9a77c. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX57 · 57. 巽 Xùn · The Gentle

- **File:** `aiching/app/assets/hexagrams/57.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 57, 巽 Xùn, "The Gentle": the upper trigram is Wind and the lower trigram is Wind. A spring hillside where gusts of wind move through tall grass and a stand of bamboo in long silver waves, one following another. Pale green willow branches stream sideways, kites hang in a soft blue sky, and a robed messenger walks the path with banners fluttering. Petals and seeds drift through the light. The season or hour is late spring, breezy morning. Let these colours lead the picture: #6f9a6c, #d8e6c3, #7a6aa8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX58 · 58. 兌 Duì · The Joyous

- **File:** `aiching/app/assets/hexagrams/58.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 58, 兌 Duì, "The Joyous": the upper trigram is Lake and the lower trigram is Lake. Two calm lakes side by side in a golden autumn afternoon, joined by a narrow channel and reflecting a soft sky. On a wooden pavilion between them, friends sit with tea and scrolls, laughing and talking; one plays a flute. Ducks drift on bright water, reeds glow, and a gentle breeze ruffles their robes. The season or hour is mid autumn afternoon. Let these colours lead the picture: #5d8fa6, #f0c987, #d8665b. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX59 · 59. 渙 Huàn · Dispersion

- **File:** `aiching/app/assets/hexagrams/59.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 59, 渙 Huàn, "Dispersion": the upper trigram is Wind and the lower trigram is Water. A wide river in early spring where wind pushes over the water, breaking sheets of ice into drifting floes and spray. A ferry boat full of people crosses toward a temple on the far bank, its incense smoke streaming sideways. On the near shore a horse gallops along the bank. Pale sun breaks through scattering clouds. The season or hour is early spring thaw. Let these colours lead the picture: #3f6f8f, #e4ecef, #c87a3a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX60 · 60. 節 Jié · Limitation

- **File:** `aiching/app/assets/hexagrams/60.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 60, 節 Jié, "Limitation": the upper trigram is Water and the lower trigram is Lake. A terraced garden beside a still lake at the start of winter, with a bamboo grove whose segmented stalks are drawn in crisp detail. Stone channels and a small sluice gate regulate water from the hills into the lake, which brims exactly to its edge. A courtyard door stands half open, a lantern beside it, morning frost on the steps. The season or hour is start of winter. Let these colours lead the picture: #2f5d62, #a7c4a0, #d6a25e. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX61 · 61. 中孚 Zhōng Fú · Inner Truth

- **File:** `aiching/app/assets/hexagrams/61.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 61, 中孚 Zhōng Fú, "Inner Truth": the upper trigram is Wind and the lower trigram is Lake. Dusk over a calm lake in early autumn, a gentle wind stirring silver ripples. On a reed bank in shadow, a crane calls with lifted head while its young answers from the water. Carp break the surface; a few pigs root near a farmhouse on the shore. A nearly full moon rises, and a boat waits at the jetty. The season or hour is early autumn dusk. Let these colours lead the picture: #3a4f6b, #e8dcc2, #c45c4a. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX62 · 62. 小過 Xiǎo Guò · Preponderance of the Small

- **File:** `aiching/app/assets/hexagrams/62.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 62, 小過 Xiǎo Guò, "Preponderance of the Small": the upper trigram is Thunder and the lower trigram is Mountain. A late-spring afternoon in rocky hills under low, heavy clouds that do not rain. Muffled thunder rolls over a small mountain. A sparrow flutters low over the grass rather than soaring; a hunter crouches at the mouth of a cave with a short bow. In the foreground, a careful figure bows at a modest roadside shrine. The season or hour is late spring, overcast afternoon. Let these colours lead the picture: #5e5a52, #a8b38a, #c98b53. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX63 · 63. 既濟 Jì Jì · After Completion

- **File:** `aiching/app/assets/hexagrams/63.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 63, 既濟 Jì Jì, "After Completion": the upper trigram is Water and the lower trigram is Fire. A quiet harvest evening in a farmhouse kitchen: an iron kettle steams on a carefully banked fire, everything neatly in its place, jars sealed and shelves stocked. Through the open door a river shines, a carriage stands on the far bank having just crossed, and a fox shakes its wet tail on the bank. A single lamp glows. The season or hour is after harvest, evening. Let these colours lead the picture: #2c4058, #d0613a, #e6d6a8. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```

### HX64 · 64. 未濟 Wèi Jì · Before Completion

- **File:** `aiching/app/assets/hexagrams/64.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** The picture at the top of a reading, and the small picture of the hexagram it becomes.
- **Stand-in until delivered:** A misty landscape in the hexagram's colours, drawn in code.
- **Status:** requested

```text
An illustration of the I Ching hexagram 64, 未濟 Wèi Jì, "Before Completion": the upper trigram is Fire and the lower trigram is Water. Late winter at twilight: a young red fox picks its way across a frozen river on thinning ice, its tail held high just above dark open water. On the far bank, a campfire burns beside bare trees, flames reflected in the water below. The first pale stars appear, and loose ice floes drift between the two shores. The season or hour is late winter twilight. Let these colours lead the picture: #24324a, #e06b2d, #b7c9d6. A wide 16:10 landscape composition, full bleed, opaque; keep the upper-right quarter quieter (sky, mist or water) because a title sits over it. Traditional Chinese painting in the blue-and-green landscape manner (qinglü shanshui) joined with meticulous gongbi brushwork: fine ink outlines, mineral azurite blue and malachite green, cinnabar red, ochre, and touches of gold leaf, on warm aged silk. Lush, saturated, luminous colour, as in a freshly restored Song or Ming handscroll, with soft drifting mist and layered depth. Calm, wise and dreamlike. No text, no calligraphy, no seals, no signature, no watermark, no frame, no border, no UI, no hexagram or trigram line symbols unless the prompt asks for them.
```
