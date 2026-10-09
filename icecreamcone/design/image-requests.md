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

21 requested, 165 delivered, 1 retired, 187 in total.

## Sticker book backgrounds

One picture per bird for the pages of the sticker book, unlocked when the player passes that bird. The player picks one with LB/RB and arranges the bird stickers on it. Until a picture arrives, the book offers that bird's game scene instead.

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
