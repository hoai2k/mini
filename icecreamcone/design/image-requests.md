# The Ice-Cream Cone Coot: image requests

Artwork still wanted for the Ice-Cream Cone Coot game in `icecreamcone/`. Only open requests are listed here; delivered and retired ones move to [`image-requests-history.md`](image-requests-history.md). Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites the history and `icecreamcone/game/src/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.
2. Save each image under the file name in its **File** line and drop it in `icecreamcone/intake/`. On integration it moves to that path under `icecreamcone/game/`, its status flips to `delivered`, the game loads it in place of its stand-in and the request moves to the history.
3. Images that need transparency say so in their prompts. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.
4. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.
5. Nothing here blocks the game: every image has a stand-in drawn in code until it arrives.
6. Prompts that name a reference photo of the book in `icecreamcone/reference/`, or an earlier painting, link to it. Give that image to the image generator along with the prompt where it can take an image.

## Status

32 requested, 154 delivered, 1 retired, 187 in total.

## Sticker book backgrounds

One picture per bird for the pages of the sticker book, unlocked when the player passes that bird. The player picks one with LB/RB and arranges the bird stickers on it. Until a picture arrives, the book offers that bird's game scene instead.

### IC-B01 · Sticker book: The Ice-Cream Cone Coot

- **File:** `icecreamcone/game/assets/book/coot.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Ice-Cream Cone Coot.
- **Stand-in until delivered:** The Ice-Cream Cone Coot's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A seaside town on a summer afternoon: a curving sandy beach and a promenade with railings, a row of faded striped bathing huts, a striped ice-cream cart with its awning, a little pier with a lighthouse far off, a wide pale sky with soft clouds over a calm sea.
```

### IC-B02 · Sticker book: The Cupadee

- **File:** `icecreamcone/game/assets/book/cupadee.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Cupadee.
- **Stand-in until delivered:** The Cupadee's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A cottage garden at teatime: a tea table laid on the lawn under an old apple tree, with a lace cloth, a teapot, a cake stand and cups, bunting strung between the branches, the cottage's open kitchen door and windows behind, late golden light.
```

### IC-B03 · Sticker book: The Shuttercluck

- **File:** `icecreamcone/game/assets/book/shuttercluck.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Shuttercluck.
- **Stand-in until delivered:** The Shuttercluck's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. Rolling countryside for spotting birds: a hedgerow with a wooden stile, a winding footpath, a pond with reeds, a windmill on a far hill, wildflowers in the long grass, a big sky with high clouds.
```

### IC-B04 · Sticker book: The Gramophone Gullfinch

- **File:** `icecreamcone/game/assets/book/gullfinch.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Gramophone Gullfinch.
- **Stand-in until delivered:** The Gramophone Gullfinch's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A park bandstand on a summer evening: an ornate painted bandstand with paper lanterns lit, deckchairs on the lawn around it, old trees, a path with lamp posts, a soft violet dusk sky.
```

### IC-B05 · Sticker book: The Flowerpot Plume

- **File:** `icecreamcone/game/assets/book/plume.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Flowerpot Plume.
- **Stand-in until delivered:** The Flowerpot Plume's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A walled flower garden in full bloom: an old glasshouse, a potting shed with stacked terracotta pots, beds of roses, foxgloves and hollyhocks, a brick wall with climbing roses, a watering can by a gravel path, bright morning.
```

### IC-B06 · Sticker book: The Highbutton Bobolinks

- **File:** `icecreamcone/game/assets/book/bobolinks.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Highbutton Bobolinks.
- **Stand-in until delivered:** The Highbutton Bobolinks's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A riverbank at night under a big full moon: willows leaning over the water, a little wooden jetty with a lantern, the moon's path on the river, a sleepy town with a few lit windows on the far bank, a deep blue starry sky.
```

### IC-B07 · Sticker book: The Newspaper Peeper

- **File:** `icecreamcone/game/assets/book/peeper.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Newspaper Peeper.
- **Stand-in until delivered:** The Newspaper Peeper's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A cobbled town square on an early morning: a newspaper kiosk with bundles of papers, an old printing house with tall windows, a clock tower, café tables not yet set out, pale morning sky.
```

### IC-B08 · Sticker book: The Pincushion Piffle

- **File:** `icecreamcone/game/assets/book/piffle.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Pincushion Piffle.
- **Stand-in until delivered:** The Pincushion Piffle's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A haberdashery shop interior: shelves of bolts of cloth, drawers of buttons, spools of thread in every colour, ribbons on reels, a dressmaker's dummy, a long counter with scissors and a tape measure, warm lamplight.
```

### IC-B09 · Sticker book: The Dollarbill Dodo

- **File:** `icecreamcone/game/assets/book/dodo.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Dollarbill Dodo.
- **Stand-in until delivered:** The Dollarbill Dodo's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A busy old market street: a general store with awnings, a little bank with columns, a greengrocer's with crates, a post box, shop signs without words, cobbles, a sunny day.
```

### IC-B10 · Sticker book: The Safecrossing Crow

- **File:** `icecreamcone/game/assets/book/crow.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Safecrossing Crow.
- **Stand-in until delivered:** The Safecrossing Crow's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A little town crossroads after school: a zebra crossing, a lollipop crossing sign, a small schoolhouse with a bell, a corner sweet shop, trees and a low wall around a playground, afternoon light.
```

### IC-B11 · Sticker book: The Milkbottle Midge

- **File:** `icecreamcone/game/assets/book/milkmidge.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Milkbottle Midge.
- **Stand-in until delivered:** The Milkbottle Midge's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A dairy farm lane at dawn: pastures with a wooden gate, a red barn, a milk stand with churns by the lane, a village with chimney smoke beyond, a pink and gold sunrise sky.
```

### IC-B12 · Sticker book: The Waterglass Goose

- **File:** `icecreamcone/game/assets/book/waterglassgoose.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Waterglass Goose.
- **Stand-in until delivered:** The Waterglass Goose's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A glass conservatory at evening: tall arched glass panes, potted palms and ferns, a long table set with crystal glasses and candles, the garden in blue dusk outside.
```

### IC-B13 · Sticker book: The Jackknife Niffy

- **File:** `icecreamcone/game/assets/book/niffy.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Jackknife Niffy.
- **Stand-in until delivered:** The Jackknife Niffy's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A formal topiary garden: clipped hedges shaped into balls, spirals and peacocks, a gravel walk, a stone fountain, a wheelbarrow with garden shears, a sunny summer day.
```

### IC-B14 · Sticker book: The Broomwhisk

- **File:** `icecreamcone/game/assets/book/broomwhisk.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Broomwhisk.
- **Stand-in until delivered:** The Broomwhisk's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A sunny old courtyard: whitewashed walls with blue shutters, a stone well, steps up to a door with pots of geraniums, a broom leaning by the door, swept flagstones, a fig tree, warm midday light.
```

### IC-B15 · Sticker book: The Buttonbeaks

- **File:** `icecreamcone/game/assets/book/buttonbeaks.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Buttonbeaks.
- **Stand-in until delivered:** The Buttonbeaks's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A tailor's shop window and street: a bow window full of coats, waistcoats and a dummy, a big button-shaped shop sign without words, a bench outside, a washing line in a back garden over the wall, breezy day.
```

### IC-B16 · Sticker book: The Key Crane

- **File:** `icecreamcone/game/assets/book/keycrane.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Key Crane.
- **Stand-in until delivered:** The Key Crane's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. An old seaside amusement arcade at evening: rows of wooden prize-crane cabinets with glowing glass fronts, a carousel through the open doors, strings of lights, a patterned carpet, the sea and sunset beyond.
```

### IC-B17 · Sticker book: The Cutitup Snippit

- **File:** `icecreamcone/game/assets/book/snippit.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Cutitup Snippit.
- **Stand-in until delivered:** The Cutitup Snippit's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A country fair: striped tents, bunting, a coconut shy, a big wheel on the hill, a hoopla stall with prizes on strings, a fence of wooden posts, a bright breezy afternoon.
```

### IC-B18 · Sticker book: The Garbage Canary

- **File:** `icecreamcone/game/assets/book/garbagecanary.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Garbage Canary.
- **Stand-in until delivered:** The Garbage Canary's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A town back lane on bin day: a row of back gates and yards, chimney pots, a rag-and-bone cart, dustbins with lids, washing lines, leaves blowing, a fresh grey-blue morning.
```

### IC-B19 · Sticker book: The Steampresser Sparrow

- **File:** `icecreamcone/game/assets/book/steampressersparrow.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Steampresser Sparrow.
- **Stand-in until delivered:** The Steampresser Sparrow's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. An old laundry yard: sheets and shirts drying on long lines, a wash house with a steaming copper, a mangle, wicker baskets, sunlight through the linen.
```

### IC-B20 · Sticker book: The Wetweather Wren

- **File:** `icecreamcone/game/assets/book/wetweatherwren.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Wetweather Wren.
- **Stand-in until delivered:** The Wetweather Wren's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A rainy market street: shop awnings dripping, puddles reflecting lit shop windows, an umbrella stand by a door, cobbles shining, soft grey rain over tall narrow houses.
```

### IC-B21 · Sticker book: The Glove Dove

- **File:** `icecreamcone/game/assets/book/glovedove.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Glove Dove.
- **Stand-in until delivered:** The Glove Dove's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A big old farmhouse scullery: a deep sink by a window, a wooden plate rack full of dishes, copper pans hanging, a dresser with jugs, a tiled floor, morning sun.
```

### IC-B22 · Sticker book: The Ten O’clock Tit Trush

- **File:** `icecreamcone/game/assets/book/titthrush.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Ten O’clock Tit Trush.
- **Stand-in until delivered:** The Ten O’clock Tit Trush's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A clockmaker's shop: walls covered in clocks of every shape, a grandfather clock, a workbench with tiny tools and a magnifying lamp, pocket watches on a velvet tray, a bay window to the street.
```

### IC-B23 · Sticker book: The Plugsocket Swift

- **File:** `icecreamcone/game/assets/book/plugsocketswift.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Plugsocket Swift.
- **Stand-in until delivered:** The Plugsocket Swift's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A town street at night: tall houses with warmly lit windows, lamp posts glowing, wires strung between the roofs, a crescent moon and stars, a cat-free quiet pavement.
```

### IC-B24 · Sticker book: The Saltshaker Shrike

- **File:** `icecreamcone/game/assets/book/saltshakershrike.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Saltshaker Shrike.
- **Stand-in until delivered:** The Saltshaker Shrike's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. An old café bistro: little round tables with checked cloths and salt and pepper shakers, a long counter with a coffee urn, a chalkboard without words, big windows onto the street, lunchtime bustle without the people.
```

### IC-B25 · Sticker book: The Soupladle Lark

- **File:** `icecreamcone/game/assets/book/ladlelark.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Soupladle Lark.
- **Stand-in until delivered:** The Soupladle Lark's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A farmhouse kitchen at suppertime: a big black range with a soup pot steaming, ladles and spoons hanging on hooks, a long wooden table with bowls set out, strings of onions, a window with evening light.
```

### IC-B26 · Sticker book: The Drippet

- **File:** `icecreamcone/game/assets/book/drippet.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Drippet.
- **Stand-in until delivered:** The Drippet's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A rainy-day garden: an old iron water pump, a water butt, watering cans of all sizes, a greenhouse with rain on its panes, a vegetable patch, puddles on the path, soft grey sky.
```

### IC-B27 · Sticker book: The Saw Bird

- **File:** `icecreamcone/game/assets/book/sawbird.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Saw Bird.
- **Stand-in until delivered:** The Saw Bird's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A carpenter's workshop: a long workbench with planes and chisels, saws hanging on the wall, stacks of planks, curls of wood shavings on the floor, a half-built rocking chair, sunlight through a dusty window.
```

### IC-B28 · Sticker book: The Radio Bird

- **File:** `icecreamcone/game/assets/book/radiobird.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** A background for the sticker book's pages, unlocked by passing The Radio Bird.
- **Stand-in until delivered:** The Radio Bird's game scene.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A full-colour picture for the two facing pages of an open children's sticker album, wide 2:1, full bleed. The left half and the right half must each work as a complete picture on its own, because on a phone held upright the two halves are shown one above the other; a vertical strip about 6% wide down the exact middle is the book's fold and holds nothing important. It is a lovely, calm, lived-in place for arranging bird stickers on, so it is empty of birds, people and animals, with plenty of open, softly painted space spread across both halves (sky, grass, floor, water, wall) where stickers can sit and still stand out: keep the detail light and mid-toned there and let it gather richer around the edges and corners. A whole place rather than a game background: a wide view with depth, a clear time of day and small charming details to find. A moonlit town rooftop: chimney pots, slate roofs and old radio aerials against a starry sky, a lit attic window, a church spire in the distance, a big round moon.
```

## New minigames: the book's other birds

Scenes, sprites and variants for the minigames of the book's 18 birds that are joining the field guide (their portraits are the IC-R requests above). Each bird's requests are kept in design/source/more/<bird>.json beside this script. The birds join the guide once these are delivered; until then their games draw stand-ins (try them with ?more).

### IC-M11g · Smashed dishes

- **File:** `icecreamcone/game/assets/sprites/dish-shards.png`
- **Size:** 3072 x 2048, transparent
- **Used for:** Slippery Dishes: what is left for a moment on the counter when a dish smashes, one for each dish in the dishes sheet (IC-M11b).
- **Stand-in until delivered:** Little triangles of the dish's colours flying off, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six small heaps of broken pieces lying on the ground, seen from the side at eye level like the delivered dishes (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/sprites/dishes.png ), each heap about 60% of its 1024 x 1024 cell wide and low, resting on the bottom third of the cell, in the same order and colours: 1) the white plate with the slate-blue band in curved shards; 2) the cream bowl with the mustard rim; 3) the tea cup with the mauve rim, its handle snapped off; 4) the steel saucepan, dented and on its side with its handle bent (metal does not shatter); 5) the black frying pan upside down with a few soap bubbles; 6) the ochre pie dish in fluted shards. A few water drops and a soap bubble round each.
```

### IC-M12f · Watch crown and bow

- **File:** `icecreamcone/game/assets/sprites/watch-crown.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Set the Clocks: the winding crown and ring bow on top of the big watch face (IC-M12b), which has none; the game sets it on the top of the gold case and glows it red while it is jammed.
- **Stand-in until delivered:** A ribbed gold box drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. One object only, centred, seen straight on, matching the gold of the delivered watch face (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/sprites/watch-face.png ) and the crown on the Ten O'clock Tit Trush's head (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/titthrush.png ): a pocket watch's winding crown, a short ribbed gold knob on a little collar stem, with a round gold ring bow through it on top, upright, about 40% of the image wide and 85% of its height, the bottom of the stem flat and level at the bottom of the painted area (it sits on the top of the watch case). No watch, no chain.
```

### IC-M17f · Saw It Straight: knots

- **File:** `icecreamcone/game/assets/sprites/knots.png`
- **Size:** 1536 x 512, transparent
- **Used for:** Saw It Straight: the knots that sit on the chalk line, laid over the painted plank; the saw grinds slowly through one, so the player steers round it.
- **Stand-in until delivered:** Dark ink-and-wash ovals drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 1 row of three knots in a wooden plank's surface, seen from straight above, each a dark brown oval knot about 1.5 times as wide as it is tall, with a darker heart, a small crack or two, and a few rings of grain swirling round it that fade out to nothing at the edges (so it can lie on any of the pale pine, honey oak or reddish cedar planks of https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/sprites/planks.png ). Each fills about 70% of its cell's width; no plank around them.
```

### IC-M18f · Tune In: speaker cabinet and tuning knob

- **File:** `icecreamcone/game/assets/sprites/radio-parts.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Tune In: the little speaker that slides along under the dial's needle (the game shows static, or a station's picture fading in, through its round grille opening, with the wanted station's tag at its top-left corner), and the knob at the dial's left end that turns as the dial does.
- **Stand-in until delivered:** A plain tan box and a brown ticked disc drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 1 row of two parts of a 1960s radio, matching the mustard-and-cream portable radio of https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/radiobird.png and the brass tuning dial of https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/sprites/dial-panel.png : left, the front of a small speaker cabinet seen straight on, a rounded rectangle exactly 230 wide by 210 tall in proportion, mustard-yellow with a cream trim, with one perfectly round hole cut right through it (fully transparent inside, no cloth, no grille) whose centre is 60% of the way across from the left and 53% of the way down, and whose diameter is 62% of the cabinet's width; nothing else on the front. Right, a round brass-and-brown bakelite tuning knob seen straight on, with ridged grip around its rim and a single cream dot near its edge, centred, about 60% of its cell across.
```
