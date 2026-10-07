# One Monster After Another: image requests

Artwork for the One Monster After Another game in `onemonster/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `onemonster/game/src/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.
2. Save each image under the file name in its **File** line and drop it in `onemonster/intake/`. On integration it moves to that path under `onemonster/game/`, its status flips to `delivered` and the game loads it in place of its stand-in.
3. The logo, icon, letter, postmark and monster portraits need transparency. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.
4. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.
5. Nothing here blocks the game: every image has a stand-in drawn in code until it arrives.
6. Each request names a reference photo of the book in `onemonster/reference/`, and its prompt links to it. Give that photo to the image generator along with the prompt where it can take an image; the prompt's link works once the photo is on `main`.
7. Some monsters (the Ice-Ferg, the Yalapappus, the Grithix) are not in any photo we have, and their designs are ours; their requests say so under **Note**. If you can look at the book (the Internet Archive lends a scan), adjust those prompts to match first.
8. The monster portraits matter most, since each one is both the name card and the monster in its chapter. If you only make some, start there.

## Status

22 requested, 0 delivered, 22 in total.

## Brand

The title screen, the browser tab, the game library card, the letter and the postmark.

### OM-U01 · Title logo

- **File:** `onemonster/game/assets/ui/logo.png`
- **Size:** 1600 x 800, transparent
- **Used for:** The title screen above Press Start, and the card on the game library page.
- **Stand-in until delivered:** The title set in a bold serif in yellow on a black arch.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
A picture-book title like the cover of a 1974 Golden Book: chunky, bouncy, slightly wobbly display letters with rounded serifs, in warm yellow with a thin dark outline, set along a gentle upward arch on a solid black arched band. One line, spelled exactly: "One Monster After Another". A small white envelope with a red stamp is tucked under the end of the arch, a pink monster claw pinching its corner. For the lettering, see the book's cover: https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg (do not copy it, make a new title in the same spirit). Wide landscape composition, the band filling about 90% of the width, even margins, no other text. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-U02 · Title background

- **File:** `onemonster/game/assets/ui/title-bg.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Full-screen behind the title screen; also the cover of the game library card.
- **Stand-in until delivered:** A painted-in-code wood under a lilac sky.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A wide wooded landscape like the book's cover: tangled trees and dense leafy undergrowth at the sides and bottom, distant hills, and a dusty lilac and pink sky. A chain of monsters chases a single white envelope across the picture from left to right, each one grabbing for it: a shaggy brown troll with a pink pig snout, a cap and a yellow STAMPS bib; a bat-winged monster with a long toothy snout and a striped necktie; a huge shaggy ochre monster with tusks, a napkin and a fork; a furious iceberg with a face; a storm cloud with a face and big pink lips; a round shaggy mauve paper-muncher; a tall green monster with a butterfly net. The monsters are small, in the lower third and at the sides. Keep the upper-middle half calm and open (plain sky) for the title, and the bottom-right corner quiet for buttons. Full-bleed 16:9. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-U03 · App icon and favicon

- **File:** `onemonster/game/assets/ui/icon.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Browser tab, home-screen icon (scaled to 512, 192 and 180 px).
- **Stand-in until delivered:** A drawn icon: a white envelope with a red stamp and a pink claw on a cream tile.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. App icon: the head of the Stamp-Collecting Trollusk from the book's cover (https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg ), his pink snout, tusk, pointed ear and blue-grey cap, with a white envelope with a red stamp clamped in his grin, on a rounded-square cream tile with a thin black ink border. Bold and simple, readable at 48 px; the head fills about 75% of the tile. No text. Transparent corners outside the rounded square (PNG with alpha), or flat magenta #FF00FF corners if transparency is not possible.
```

### OM-U04 · The letter

- **File:** `onemonster/game/assets/ui/letter.png`
- **Size:** 512 x 512, transparent
- **Used for:** The letter in every chapter, on the route map and on the postmark screen; the game adds stains, nibbles and postmarks on top.
- **Stand-in until delivered:** A drawn white envelope with a red stamp.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. A single old-fashioned white paper envelope, seen straight on and slightly tilted, with a pointed flap, a small red postage stamp with a scalloped edge in the top right corner, and a few loops of scribbly handwriting (not readable words) in the middle. Ink line with light crosshatched shading, crisp and clean. It fills about 80% of the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-U05 · Postmark

- **File:** `onemonster/game/assets/ui/postmark.png`
- **Size:** 512 x 512, transparent
- **Used for:** Stamped onto the letter for each postmark won; the game tints and rotates it.
- **Stand-in until delivered:** A drawn circle of dark ink with wavy lines.
- **Status:** requested

```text
A rubber-stamp postmark in dark grey-black ink, as if stamped on paper: a double circle with a small monster footprint in the middle, and four wavy cancellation lines trailing off to the right. Slightly uneven, with the speckled gaps of a real inked stamp. No letters or numbers. Centred, filling about 80% of the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Monster portraits

One portrait per monster, in the order the letter meets them. Each is shown large on the monster's name card and is the monster itself in its chapter, where the game moves, tilts and squashes it.

### OM-M01 · Stamp-Collecting Trollusk

- **File:** `onemonster/game/assets/monsters/trollusk.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 1, and the monster itself in Before the Mailman Comes, the sneaking game.
- **Stand-in until delivered:** The monster drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as on the book's cover: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a squashed blue-grey cap and a yellow bib lettered STAMPS across his chest (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest with a smirk on his snout. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour drawing of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M02 · Letter-Eating Bombanat

- **File:** `onemonster/game/assets/monsters/bombanat.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 2, and the monster itself in Over the Bubbley Goo, the flying game.
- **Stand-in until delivered:** The monster drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, the bat-winged flier on the book's cover: huge mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a tuft of dark fur on the chest, a red-and-white striped necktie, a pink striped cap with a yellow flower on top, and clawed pink feet. Flying with wings spread, a white envelope in his teeth. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour drawing of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M03 · Bombanat-Munching Grumley

- **File:** `onemonster/game/assets/monsters/grumley.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 3, and the monster itself in A Nice Bombanat Lunch, the grabbing game.
- **Stand-in until delivered:** The monster drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Note:** That the cover's yellow monster is the Grumley is inferred from his napkin and fork, not confirmed; check the Internet Archive scan.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as the big shaggy monster at the left of the book's cover: a huge, round, lumpy body of curly ochre-yellow fur, a wide grinning mouth with two great white tusks, a broad pink snout, heavy-lidded greedy eyes, a white napkin tied round his neck and a big fork held up in one pink paw, ready for lunch. Show him rising chest-deep out of glossy blue goo, dripping, reaching up with his free paw. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour drawing of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M04 · Furious-Floating Ice-Ferg

- **File:** `onemonster/game/assets/monsters/iceferg.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 4, and the monster itself in Furious Floating, the ramming game.
- **Stand-in until delivered:** The monster drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Note:** No picture of this monster was found: the design is ours. Check the Internet Archive scan and adjust the prompt before generating.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg: a craggy iceberg in a terrible temper, its pale-blue and white ice drawn in crosshatched facets, with a furious face in the front: two glaring eyes under a jutting frowning brow of ice, a scowling mouth with icicle teeth, little puffs of cold steam from its nostrils, and the dark underwater part of it showing below a band of choppy sea. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. No picture of this monster from the book was available, so the design here is our own: draw it as a monster from the same book, matching the drawing style, palette and mood of the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-M05 · Wild-'n-Windy Typhoonigator

- **File:** `onemonster/game/assets/monsters/typhoonigator.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 5, and the monster itself in Suck It All Up, the inhaling game.
- **Stand-in until delivered:** The monster drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's page-20 spread: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour drawing of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M06 · Paper-Munching Yalapappus

- **File:** `onemonster/game/assets/monsters/yalapappus.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 6, and the monster itself in Munch and Chase, the chasing game.
- **Stand-in until delivered:** The monster drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Note:** No picture of this monster was found: the design is ours. Check the Internet Archive scan and adjust the prompt before generating.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus: a round, pear-shaped, shaggy monster in mottled mauve and dusty-pink fur, on short stumpy legs with big pink paws, with a wide flat munching mouth full of square teeth, a little pink snout, droopy ears, round heavy-lidded eyes and a tuft of hair on top. He is trundling along at a run, a scrap of paper half-munched in his mouth. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. No picture of this monster from the book was available, so the design here is our own: draw it as a monster from the same book, matching the drawing style, palette and mood of the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-M07 · Bombanat-Collecting Grithix

- **File:** `onemonster/game/assets/monsters/grithix.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 7, and the monster itself in Net Them All, the netting game.
- **Stand-in until delivered:** The monster drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/forest-spread-unidentified.jpg`](../reference/forest-spread-unidentified.jpg)
- **Note:** No picture of this monster was found: the design is ours. Check the Internet Archive scan and adjust the prompt before generating.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix: a tall, gangly, long-armed monster in olive and sage-green fur with a long knobbly nose, bushy eyebrows over beady pleased eyes, a satchel of glass collecting jars across his chest and a big butterfly net held high in one long pink hand, mid-swing. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. No picture of this monster from the book was available, so the design here is our own: draw it as a monster from the same book, matching the drawing style, palette and mood of the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/forest-spread-unidentified.jpg .
```

## Chapter scenes

One background per chapter. The game draws the monsters and everything that moves on top, so each scene leaves the play area quiet, as its prompt says.

### OM-S01 · Stamp-Collecting Trollusk scene

- **File:** `onemonster/game/assets/scenes/trollusk.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Before the Mailman Comes, the sneaking game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). A sunny small-town street seen side-on: a row of wooden porches with turned posts, hanging flower baskets, flowerbeds and low bushes spaced along the bottom third, a picket fence, and a blue curbside mailbox on a post at the far right. Leafy trees and a pale lilac sky above. Keep the ground strip along the bottom clear to walk on. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-S02 · Letter-Eating Bombanat scene

- **File:** `onemonster/game/assets/scenes/bombanat.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Over the Bubbley Goo, the flying game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). The Blue Ocean of Bubbley Goo seen side-on: a thick, glossy blue-and-teal sea of goo along the bottom quarter, full of round bubbles of every size, some swelling, some popping, under a wide pale mauve sky with long curling clouds. A far-off shore on the horizon. Keep the whole sky open, because the Bombanat flies through it. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-S03 · Bombanat-Munching Grumley scene

- **File:** `onemonster/game/assets/scenes/grumley.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind A Nice Bombanat Lunch, the grabbing game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). Close to the surface of the Blue Ocean of Bubbley Goo: glossy blue-and-teal goo with bubbles across the bottom third, a small rocky shore at the left edge with a picnic basket and a checked cloth, and a big open lilac sky above with a few curling clouds. Keep the sky open, because Bombanats fly through it. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-S04 · Furious-Floating Ice-Ferg scene

- **File:** `onemonster/game/assets/scenes/iceferg.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Furious Floating, the ramming game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). The open sea seen from high above: slate-blue and teal water drawn as rows of curling strokes, a few streaks of foam and long current lines, a harbour with a lighthouse and jetty along the top edge, and scattered rocks near the sides. Keep the middle of the sea open, because the iceberg and the ships move there. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-S05 · Wild-'n-Windy Typhoonigator scene

- **File:** `onemonster/game/assets/scenes/typhoonigator.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Suck It All Up, the inhaling game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). A wide stormy sea seen from above at a slant: slate-blue and teal water drawn as rows of curling strokes, spray and foam, a heavy lilac-and-grey sky at the top, and at the far right a strip of bumpy brown land with a signpost, the edge of Nowhere. Keep the middle open, because the Typhoonigator and the flotsam move there. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-S06 · Paper-Munching Yalapappus scene

- **File:** `onemonster/game/assets/scenes/yalapappus.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Munch and Chase, the chasing game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). The edge of Nowhere seen side-on: bumpy, scrubby brown-and-ochre ground with rocks, holes and tufts of grass along the bottom third, a crooked signpost, a few bare twisted trees, and a wide pale lilac sky with curling clouds. Keep the ground strip clear for running and the sky open above it. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-S07 · Bombanat-Collecting Grithix scene

- **File:** `onemonster/game/assets/scenes/grithix.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Net Them All, the netting game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/forest-spread-unidentified.jpg`](../reference/forest-spread-unidentified.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). A clearing in a thick wood: gnarled trees and dense ferns and leaves framing the left, right and top edges, a mossy floor across the bottom third, and an official-looking blue mailbox on a post at the right edge. Keep the middle of the clearing open, because Bombanats fly through it and the Grithix runs about. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/forest-spread-unidentified.jpg .
```

## Story pages

The prologue and the epilogue, shown as picture-book pages with the game's text in the cream band at the bottom.

### OM-P01 · Prologue: Sally Ann posts her letter

- **File:** `onemonster/game/assets/story/prologue.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The opening page of the journey.
- **Stand-in until delivered:** The street scene with a girl and the mailbox drawn in code.
- **Reference:** [`reference/mailbox-girl-and-trollusk.jpg`](../reference/mailbox-girl-and-trollusk.jpg)
- **Note:** Which girl the reference photo shows is not confirmed; Sally Ann's look here is ours.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A full-bleed story-page painting, wide 16:9, in the book's layout: the picture fills the top three-quarters and the bottom quarter is left as a plain flat cream band for the game's text. A girl of about eight with short curly red hair, freckles, a green dress and white socks stands on tiptoe at a blue curbside mailbox in front of a wooden porch with turned posts and hanging flower baskets, posting a white envelope. Behind the flowerbed, half hidden, the pink snout and pointed ears of a shaggy brown monster in a blue-grey cap peek out, watching the letter. Morning light, a pale lilac sky. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/mailbox-girl-and-trollusk.jpg .
```

### OM-P02 · Epilogue: the official mailman

- **File:** `onemonster/game/assets/story/mailman.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The epilogue page where the mailman takes the letter.
- **Stand-in until delivered:** A mailbox and a motorcycle drawn in code.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A full-bleed story-page painting, wide 16:9, in the book's layout: the picture fills the top three-quarters and the bottom quarter is left as a plain flat cream band for the game's text. At the edge of a wood, a stern little mailman in a blue uniform, peaked cap and goggles roars up on an official-looking old motorcycle with a sidecar full of mail sacks, one arm raised and pointing. In front of an official-looking blue mailbox, three monsters freeze in the act of trying to carry the mailbox off: a shaggy brown troll with a pink pig snout, a cap and a yellow STAMPS bib; a round shaggy mauve paper-muncher; a bat-winged monster with a long toothy snout and a striped necktie. At the side, a tall green monster with a butterfly net walks off home with a netted Bombanat under one arm, not caring a bit. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-P03 · Epilogue: Lucy Jane gets her letter

- **File:** `onemonster/game/assets/story/lucyjane.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The last page of the journey, before the postmark tally.
- **Stand-in until delivered:** The porch and mailbox with a girl drawn in code.
- **Reference:** [`reference/mailbox-girl-and-trollusk.jpg`](../reference/mailbox-girl-and-trollusk.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A full-bleed story-page painting, wide 16:9, in the book's layout: the picture fills the top three-quarters and the bottom quarter is left as a plain flat cream band for the game's text. A girl of about eight with long wavy brown hair, round glasses, a white top and a pink skirt, barefoot, walks away from a plain blue mailbox on a post (no lettering) in front of a wooden porch with flower baskets, reading a crumpled, goo-stained, nibbled letter with a calm, slightly bored face. All around her, unseen, the monsters from the story peek out of the bushes, the trees and the sky: a shaggy brown troll with a pink pig snout, a cap and a yellow STAMPS bib; a bat-winged monster with a long toothy snout and a striped necktie; a huge shaggy ochre monster with tusks, a napkin and a fork; a furious iceberg with a face; a storm cloud with a face and big pink lips; a round shaggy mauve paper-muncher; a tall green monster with a butterfly net. Warm afternoon light. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/mailbox-girl-and-trollusk.jpg .
```
