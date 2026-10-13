# One Monster After Another: image requests

Artwork for the One Monster After Another game in `onemonster/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `onemonster/game/src/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.
2. Save each image under the file name in its **File** line and drop it in `onemonster/intake/`. On integration it moves to that path under `onemonster/game/`, its status flips to `delivered` and the game loads it in place of its stand-in.
3. Every sprite needs transparency (all the `.png` files). If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.
4. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.
5. Nothing here blocks the game: every image has a stand-in drawn in code until it arrives.
6. Each request names one or more reference photos of the book in `onemonster/reference/`, and its prompt links to them. Give those photos to the image generator along with the prompt where it can take images; the prompt's links work once the photos are on `main`.
7. **Canonical first.** Each monster has five requests. Make its model sheet (`OM-C`) first and settle the design there, from the book's reference photo. Then make the other four (portrait `OM-M`, parts `OM-R`, swaps `OM-F`, key poses `OM-K`) with the model sheet attached, so every image of the monster is the same monster. Do the same for the people (`OM-C08`, then `OM-K08`). If a later image drifts from the sheet, regenerate it rather than the sheet.
8. **The game animates from the key poses.** Every monster is drawn from its key-poses sheet (`OM-K`), cut into single sprites by `onemonster/tools/build_sprites.py`, with squash, lean, bob and follow-through added in code. The parts (`OM-R`) and swaps (`OM-F`) sheets were delivered but the generator could not keep their pieces apart and at one scale, so the game does not use them (apart from the Yalapappus's rolled-up ball); they need no further work. Poses must keep one scale per sheet and be laid out in the grid and order the prompt gives.
9. If a generator struggles with a whole sheet, split it: make the first half of the list and the second half as two images, saved as `parts-1.png` and `parts-2.png` (and so on), each in the same order and at the same scale.
10. Every monster's design now comes from a photo of the book. Where a prompt adds something of our own (the Ice-Ferg's crack-mouth, for one), it says so.
11. Order of work: the model sheets, then the portraits, then the parts and swaps, then the key poses, props, scenes and story pages. The game keeps its stand-ins for anything not yet delivered.
12. **The Adventure** (`design/adventure.md`) adds four kinds of request: new poses for each monster (`OM-A`, drawn with its model sheet and key-poses sheet attached, at the same scale), three backdrop panels per board (`OM-B01a` to `OM-B09c`), the ground pieces of each place (`OM-G`) and a props sheet per board (`OM-Y`). Every board plays with stand-ins until they arrive. Good order: the backdrops of a board and its props sheet together, so they match, then the ground pieces of that place.
13. **How to play** (`OM-H`): three spot illustrations per minigame for its how-to-play page, with the model sheets of the characters in them attached.
14. **Minigame audit extras** (`OM-Z`): plain Bombanats, the Ice-Ferg without its sea lions and the sea lions alone, and Sally Ann's house end wall.

## Status

14 requested, 129 delivered, 143 in total.

## Brand

The title screen, the browser tab, the game library card, the letter and the postmark.

### OM-U01 · Title logo

- **File:** `onemonster/game/assets/ui/logo.png`
- **Size:** 1600 x 800, transparent
- **Used for:** The title screen above Press Start, and the card on the game library page.
- **Stand-in until delivered:** The title set in a bold serif in yellow on a black arch.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
A picture-book title like the cover of a 1974 Golden Book: chunky, bouncy, slightly wobbly display letters with rounded serifs, in warm yellow with a thin dark outline, set along a gentle upward arch on a solid black arched band. One line, spelled exactly: "One Monster After Another". A small white envelope with a red stamp is tucked under the end of the arch, a pink monster claw pinching its corner. For the lettering, see the book's cover: https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg (do not copy it, make a new title in the same spirit). Wide landscape composition, the band filling about 90% of the width, even margins, no other text. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-U02 · Title background

- **File:** `onemonster/game/assets/ui/title-bg.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Full-screen behind the title screen; also the cover of the game library card.
- **Stand-in until delivered:** A painted-in-code wood under a lilac sky.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A wide wooded landscape like the book's cover: tangled trees and dense leafy undergrowth at the sides and bottom, distant hills, and a dusty lilac and pink sky. Exactly three monsters, the three on the book's cover, chase a single white envelope across the picture from left to right, each one grabbing for it: a shaggy brown troll with a pink pig snout, a checked top hat and a yellow stamp bag; a dark shaggy bat-winged monster with a long toothy snout, a propeller cap and a striped necktie; a huge woolly bulldog-faced monster with tusks, a napkin and a fork. No other monsters anywhere in the picture: the rest of the story's monsters are a surprise. (At most, far off on the horizon and barely perceptible, a cloud that is almost shaped like a face, and a pale iceberg; nothing a child would notice at first glance, and no other creature at all.) The monsters are small, in the lower third and at the sides. Keep the upper-middle half calm and open (plain sky) for the title, and the bottom-right corner quiet for buttons. Full-bleed 16:9. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-U03 · App icon and favicon

- **File:** `onemonster/game/assets/ui/icon.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Browser tab, home-screen icon (scaled to 512, 192 and 180 px).
- **Stand-in until delivered:** A drawn icon: a white envelope with a red stamp and a pink claw on a cream tile.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. App icon: the head of the Stamp-Collecting Trollusk from the book's cover (https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg ), his pink snout, tusk, pointed ear and blue-grey cap, with a white envelope with a red stamp clamped in his grin, on a rounded-square cream tile with a thin black ink border. Bold and simple, readable at 48 px; the head fills about 75% of the tile. No text. Transparent corners outside the rounded square (PNG with alpha), or flat magenta #FF00FF corners if transparency is not possible.
```

### OM-U04 · The letter

- **File:** `onemonster/game/assets/ui/letter.png`
- **Size:** 512 x 512, transparent
- **Used for:** The letter in every chapter, on the route map and on the postmark screen; the game adds stains, nibbles and postmarks on top.
- **Stand-in until delivered:** A drawn white envelope with a red stamp.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. A single old-fashioned white paper envelope, seen straight on and slightly tilted, with a pointed flap, a small red postage stamp with a scalloped edge in the top right corner, and a few loops of scribbly handwriting (not readable words) in the middle. Ink line with light crosshatched shading, crisp and clean. It fills about 80% of the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-U05 · Postmark

- **File:** `onemonster/game/assets/ui/postmark.png`
- **Size:** 512 x 512, transparent
- **Used for:** Stamped onto the letter for each postmark won; the game tints and rotates it.
- **Stand-in until delivered:** A drawn circle of dark ink with wavy lines.
- **Status:** delivered

```text
A rubber-stamp postmark in dark grey-black ink, as if stamped on paper: a double circle with a small monster footprint in the middle, and four wavy cancellation lines trailing off to the right. Slightly uneven, with the speckled gaps of a real inked stamp. No letters or numbers. Centred, filling about 80% of the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Stamp-Collecting Trollusk

The snatcher in chapters 1 and 7 (see design.md). Make the model sheet (OM-C01) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: eyeing the prize, celebrating, idle breathing, the tiptoe sneak cycle, ducking, the fright and scuttle back, the grab, the gabbling run cycle, being snatched from, wailing, the freeze in disguise, the skid.

### OM-C01 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/trollusk/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/title-page.jpg`](../reference/title-page.jpg), [`reference/trollusk-snatches-from-yalapappus.jpg`](../reference/trollusk-snatches-from-yalapappus.jpg), [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg), [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as in the book: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout (his snerk) with a big round nostril, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a crumpled blue-green checked top hat, squashed down, with a coil of thin blue-green tubing looped round it as a hatband, and a yellow shoulder bag on a strap lettered MY STAMPS (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest, with a smirk on his snout. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: side view facing right, standing on his two short legs, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view, a back view, and a three-quarter view facing right. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/title-page.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-snatches-from-yalapappus.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-and-yalapappus-running.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M01 · Portrait

- **File:** `onemonster/game/assets/monsters/trollusk/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The monster's name card and its place in the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/title-page.jpg`](../reference/title-page.jpg), [`reference/trollusk-snatches-from-yalapappus.jpg`](../reference/trollusk-snatches-from-yalapappus.jpg), [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg), [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as in the book: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout (his snerk) with a big round nostril, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a crumpled blue-green checked top hat, squashed down, with a coil of thin blue-green tubing looped round it as a hatband, and a yellow shoulder bag on a strap lettered MY STAMPS (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest, with a smirk on his snout. Draw it from this character's canonical model sheet, request OM-C01 (file onemonster/game/assets/monsters/trollusk/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/title-page.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-snatches-from-yalapappus.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-and-yalapappus-running.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R01 · Sprite parts

- **File:** `onemonster/game/assets/monsters/trollusk/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in the sneaking game (chapter 1) and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/title-page.jpg`](../reference/title-page.jpg), [`reference/trollusk-snatches-from-yalapappus.jpg`](../reference/trollusk-snatches-from-yalapappus.jpg), [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg), [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as in the book: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout (his snerk) with a big round nostril, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a crumpled blue-green checked top hat, squashed down, with a coil of thin blue-green tubing looped round it as a hatband, and a yellow shoulder bag on a strap lettered MY STAMPS (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest, with a smirk on his snout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C01 (file onemonster/game/assets/monsters/trollusk/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, side view facing right, standing on his two short legs, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 14 pieces: 1. The torso, no head, arms, legs or bag. 2. The head with the far ear, the eyes and the upper snout with its tusk, but no lower jaw, no near ear and no hat. 3. The lower jaw, mouth closed in a smirk. 4. The near ear. 5. The near upper arm. 6. The near forearm and open clawed hand. 7. The far upper arm. 8. The far forearm and open clawed hand. 9. The near thigh. 10. The near shin and foot. 11. The far thigh. 12. The far shin and foot. 13. The checked top hat with its coiled hatband, alone, so it can bounce and fly off. 14. The yellow MY STAMPS bag with its strap, so it can swing. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F01 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/trollusk/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/title-page.jpg`](../reference/title-page.jpg), [`reference/trollusk-snatches-from-yalapappus.jpg`](../reference/trollusk-snatches-from-yalapappus.jpg), [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg), [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as in the book: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout (his snerk) with a big round nostril, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a crumpled blue-green checked top hat, squashed down, with a coil of thin blue-green tubing looped round it as a hatband, and a yellow shoulder bag on a strap lettered MY STAMPS (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest, with a smirk on his snout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C01 (file onemonster/game/assets/monsters/trollusk/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (side view facing right, standing on his two short legs), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R01; attach it too where you can. The 10 pieces: 1. The lower jaw dropped wide open, gabbling. 2. The lower jaw clenched in a toothy grin. 3. The eye area only, eyes half-lidded and sly. 4. The eye area only, eyes wide and alarmed. 5. The eye area only, eyes shut (a blink). 6. The near hand pinching, as if holding the corner of a letter (no letter drawn). 7. The near hand clenched in a fist. 8. The near foot on tiptoe. 9. The whole head turned to face the viewer, startled, as when he is caught. 10. The near hand holding up a leafy twig as a disguise. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K01 · Key poses

- **File:** `onemonster/game/assets/monsters/trollusk/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/title-page.jpg`](../reference/title-page.jpg), [`reference/trollusk-snatches-from-yalapappus.jpg`](../reference/trollusk-snatches-from-yalapappus.jpg), [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg), [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as in the book: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout (his snerk) with a big round nostril, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a crumpled blue-green checked top hat, squashed down, with a coil of thin blue-green tubing looped round it as a hatband, and a yellow shoulder bag on a strap lettered MY STAMPS (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest, with a smirk on his snout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C01 (file onemonster/game/assets/monsters/trollusk/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right, standing on his two short legs), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 14 poses: 1. Standing idle, smug. 2. Sneaking on tiptoe, near leg forward. 3. Sneaking on tiptoe, far leg forward. 4. Ducked down low in a crouch, curled up small to hide, only the hat and snout showing above his back. 5. Reaching up high with both hands to grab. 6. Gabbling away at a run, near leg forward, a letter clamped in his snout. 7. Gabbling away at a run, both feet off the ground. 8. Jolted in surprise as something snatches from above, hat flying off. 9. Scuttling back in a fright, arms flung up. 10. Sitting and wailing, head thrown back. 11. Peeking round a tree trunk, eyeing the prize, sly and greedy. 12. Celebrating: hugging a letter to his chest and doing a gabbling jig, one foot kicked up. 13. Frozen in disguise: a leafy twig held in front of his face, only the hat poking over it. 14. Skidding round on a turn mid-scurry, dust flying. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Letter-Eating Bombanat

The snatcher in chapters 2 and 8 (see design.md). Make the model sheet (OM-C02) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: eyeing the prize, celebrating, the flap cycle, gliding, diving and swooping, the snap, landing, goo-stuck flapping, struggling when grabbed, netted, the stall flutter, the swoop out of a dive, the wing-walk.

### OM-C02 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/bombanat/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg), [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, as in the book: a small, dark, shaggy body with huge lilac-mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a red striped cap with a little yellow propeller on top, a red-and-white striped necktie, clawed pink feet and a thin curling pink tail. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: side view facing right in flight, wings spread level, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view in flight with both wings spread, and a side view perched with the wings folded. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-over-the-goo.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M02 · Portrait

- **File:** `onemonster/game/assets/monsters/bombanat/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The monster's name card and its place in the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg), [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, as in the book: a small, dark, shaggy body with huge lilac-mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a red striped cap with a little yellow propeller on top, a red-and-white striped necktie, clawed pink feet and a thin curling pink tail. Flying with wings spread, a white envelope in his teeth. Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-over-the-goo.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R02 · Sprite parts

- **File:** `onemonster/game/assets/monsters/bombanat/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in the swooping game (chapters 2 and 8) and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg), [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, as in the book: a small, dark, shaggy body with huge lilac-mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a red striped cap with a little yellow propeller on top, a red-and-white striped necktie, clawed pink feet and a thin curling pink tail. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, side view facing right in flight, wings spread level, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 10 pieces: 1. The body with the chest tuft and the knot of the striped necktie, no head, wings or legs. 2. The head with the striped cap, the eye and the upper snout with its teeth, but no lower jaw and no propeller. 3. The lower jaw with its teeth, mouth closed. 4. The loose end of the striped necktie, so it can flutter. 5. The little yellow propeller from the top of the cap, seen side-on, so it can spin. 6. The thin curling pink tail. 7. The near wing, spread level. 8. The far wing, spread level, partly hidden in the master view but drawn whole here. 9. The near leg and clawed foot. 10. The far leg and clawed foot. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F02 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/bombanat/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions, wing beats.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg), [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, as in the book: a small, dark, shaggy body with huge lilac-mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a red striped cap with a little yellow propeller on top, a red-and-white striped necktie, clawed pink feet and a thin curling pink tail. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (side view facing right in flight, wings spread level), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R02; attach it too where you can. The 11 pieces: 1. The near wing raised high at the top of the upstroke. 2. The near wing swept down at the bottom of the downstroke, the membrane cupped. 3. The near wing folded against the body. 4. The far wing raised high. 5. The far wing swept down. 6. The far wing folded. 7. The near wing spread level and splattered with dripping blue goo. 8. The lower jaw snapped wide open. 9. The eye area only, eye wide in alarm. 10. The eye area only, eye shut (a blink). 11. The near foot with its claws clutched shut. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K02 · Key poses

- **File:** `onemonster/game/assets/monsters/bombanat/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg), [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, as in the book: a small, dark, shaggy body with huge lilac-mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a red striped cap with a little yellow propeller on top, a red-and-white striped necktie, clawed pink feet and a thin curling pink tail. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right in flight, wings spread level), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 15 poses: 1. Gliding, wings spread level. 2. Flapping, wings at the top of the stroke. 3. Flapping, wings at the bottom of the stroke. 4. Swooping down in a steep dive, wings swept back. 5. Snapping a letter up in the jaws. 6. Dipping to land, feet thrust forward, wings braking. 7. Grabbed from below, wriggling and flapping wildly. 8. Tangled in a butterfly net, wings crumpled. 9. Perched with the wings folded, sly. 10. Perched on a branch, eyeing the prize below, licking his snout. 11. Celebrating: a loop-the-loop, a letter in his teeth. 12. Wing-walking on the ground like a bat, hobbling on his wrist claws, near side forward. 13. Wing-walking, far side forward. 14. Stalled in mid-air, fluttering frantically. 15. Pulling up out of a dive into a swoop, wings wide. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Bombanat-Munching Grumley

The snatcher in chapter 3 (see design.md). Make the model sheet (OM-C03) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: eyeing the prize, celebrating, lurking, rising, tentacles curling and waving, the claw lunge and snap, the miss and splutter, the lunch dance, being netted and hauled up, gliding with a wake, the full lunge.

### OM-C03 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/grumley/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg), [`reference/grumley-grabs-bombanat-page.jpg`](../reference/grumley-grabs-bombanat-page.jpg), [`reference/pages-16-17-grumley-netted.jpg`](../reference/pages-16-17-grumley-netted.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as in the book: a big shaggy sea monster in olive-ochre fur shading to orange, his head and body one great hairy mass with a crown of white horns on top, heavy scowling brows, small round wire spectacles on a pink nose, and a fanged underbite; below, a tangle of octopus tentacles with ringed suckers, and two long spiny crab arms ending in big claws that have little eyes and teeth of their own. Show him rising out of glossy dark goo, dripping, claws raised. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: three-quarter view facing right, rising out of the goo with his tentacles spread (draw no goo), in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view with all the tentacles spread, and a side view facing right. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-grabs-bombanat-page.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-16-17-grumley-netted.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M03 · Portrait

- **File:** `onemonster/game/assets/monsters/grumley/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The monster's name card and its place in the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg), [`reference/grumley-grabs-bombanat-page.jpg`](../reference/grumley-grabs-bombanat-page.jpg), [`reference/pages-16-17-grumley-netted.jpg`](../reference/pages-16-17-grumley-netted.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as in the book: a big shaggy sea monster in olive-ochre fur shading to orange, his head and body one great hairy mass with a crown of white horns on top, heavy scowling brows, small round wire spectacles on a pink nose, and a fanged underbite; below, a tangle of octopus tentacles with ringed suckers, and two long spiny crab arms ending in big claws that have little eyes and teeth of their own. Show him rising out of glossy dark goo, dripping, claws raised. Draw it from this character's canonical model sheet, request OM-C03 (file onemonster/game/assets/monsters/grumley/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-grabs-bombanat-page.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-16-17-grumley-netted.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R03 · Sprite parts

- **File:** `onemonster/game/assets/monsters/grumley/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in the grabbing game (chapter 3) and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg), [`reference/grumley-grabs-bombanat-page.jpg`](../reference/grumley-grabs-bombanat-page.jpg), [`reference/pages-16-17-grumley-netted.jpg`](../reference/pages-16-17-grumley-netted.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as in the book: a big shaggy sea monster in olive-ochre fur shading to orange, his head and body one great hairy mass with a crown of white horns on top, heavy scowling brows, small round wire spectacles on a pink nose, and a fanged underbite; below, a tangle of octopus tentacles with ringed suckers, and two long spiny crab arms ending in big claws that have little eyes and teeth of their own. Show him rising out of glossy dark goo, dripping, claws raised. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C03 (file onemonster/game/assets/monsters/grumley/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, three-quarter view facing right, rising out of the goo with his tentacles spread (draw no goo), at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 10 pieces: 1. The great hairy head-and-body mass with the horns, brows, eyes and nose, but no lower jaw, no spectacles, no crab arms and no tentacles. 2. The lower jaw with its fanged underbite, closed. 3. The small round wire spectacles alone. 4. The near crab arm, long and spiny, without its claw. 5. The near claw, open, with its own little eye and teeth. 6. The far crab arm, without its claw. 7. The far claw, open. 8. One long near tentacle drawn out straight and flat, tapering from base to tip, suckers along its underside (the game bends it). 9. One long far tentacle drawn the same way, a shade darker. 10. One short tentacle drawn out straight, tapering. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F03 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/grumley/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg), [`reference/grumley-grabs-bombanat-page.jpg`](../reference/grumley-grabs-bombanat-page.jpg), [`reference/pages-16-17-grumley-netted.jpg`](../reference/pages-16-17-grumley-netted.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as in the book: a big shaggy sea monster in olive-ochre fur shading to orange, his head and body one great hairy mass with a crown of white horns on top, heavy scowling brows, small round wire spectacles on a pink nose, and a fanged underbite; below, a tangle of octopus tentacles with ringed suckers, and two long spiny crab arms ending in big claws that have little eyes and teeth of their own. Show him rising out of glossy dark goo, dripping, claws raised. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C03 (file onemonster/game/assets/monsters/grumley/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (three-quarter view facing right, rising out of the goo with his tentacles spread (draw no goo)), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R03; attach it too where you can. The 10 pieces: 1. The jaw dropped wide open, the long pink tongue out, ready to munch. 2. The jaw chomping, cheeks bulging. 3. The near claw snapped shut. 4. The far claw snapped shut. 5. The eye area only, eyes greedy behind the spectacles. 6. The eye area only, eyes squeezed shut and spluttering. 7. The eye area only, eyes crossed and dazed. 8. The spectacles knocked crooked. 9. A tentacle tip curled tight round nothing, grabbing. 10. Dripping blobs of blue goo to lay over the head. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K03 · Key poses

- **File:** `onemonster/game/assets/monsters/grumley/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg), [`reference/grumley-grabs-bombanat-page.jpg`](../reference/grumley-grabs-bombanat-page.jpg), [`reference/pages-16-17-grumley-netted.jpg`](../reference/pages-16-17-grumley-netted.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as in the book: a big shaggy sea monster in olive-ochre fur shading to orange, his head and body one great hairy mass with a crown of white horns on top, heavy scowling brows, small round wire spectacles on a pink nose, and a fanged underbite; below, a tangle of octopus tentacles with ringed suckers, and two long spiny crab arms ending in big claws that have little eyes and teeth of their own. Show him rising out of glossy dark goo, dripping, claws raised. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C03 (file onemonster/game/assets/monsters/grumley/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (three-quarter view facing right, rising out of the goo with his tentacles spread (draw no goo)), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 11 poses: 1. Lurking, only the horns, the brows and the spectacled eyes above the goo line, the rest sunk below. 2. Rising out of the goo, dripping, tentacles spreading. 3. Lunging straight up, both claws stretched as high as they go. 4. Holding a claw up in triumph, snapped shut. 5. Spluttering after a miss, goo on his spectacles. 6. Rubbing his middle with a tentacle and licking his lips, looking forward to lunch. 7. Snagged in a big fishing net and hauled up wiggly-squiggly, tentacles everywhere. 8. Eyeing the prize: only the horns and spectacled eyes above the goo, peering up. 9. Celebrating: holding a Bombanat aloft in one claw, beaming. 10. Gliding under the goo: only the horns and eyes showing, a V-shaped wake behind. 11. A full lunge: his whole head and body thrown up out of the goo, tentacles flying. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Furious-Floating Ice-Ferg

The snatcher in chapter 4 (see design.md). Make the model sheet (OM-C04) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: eyeing the prize, celebrating, drifting and bobbing, the glaring eye, huffing up, the charge, the crash, the dazed wobble, and the sea lions dozing, startling and sliding off, the sea lions clinging on.

### OM-C04 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/iceferg/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png), [`reference/ice-ferg-seals-detail.jpg`](../reference/ice-ferg-seals-detail.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg, as on the book's pages 18-19: a huge, craggy iceberg built of great cracked slabs and blocks of ice, pale lilac-white and pale blue, drawn in fine ink with crosshatched shadows, jagged icicles hanging from its ledges, and deep cracks between the slabs; in a crevice in the middle of it, a single small, dark, beady eye glares out, the only sign that it is alive and in a terrible temper. A couple of olive-yellow whiskered sea lions lounge on its ledges. Choppy dark sea drawn as rows of curling strokes laps round its base. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: front three-quarter view from a little above, floating, the waterline along its bottom edge, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a side view showing the big dark underwater part below the waterline, and a view from straight above. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/ice-ferg-seals-detail.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M04 · Portrait

- **File:** `onemonster/game/assets/monsters/iceferg/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The monster's name card and its place in the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png), [`reference/ice-ferg-seals-detail.jpg`](../reference/ice-ferg-seals-detail.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg, as on the book's pages 18-19: a huge, craggy iceberg built of great cracked slabs and blocks of ice, pale lilac-white and pale blue, drawn in fine ink with crosshatched shadows, jagged icicles hanging from its ledges, and deep cracks between the slabs; in a crevice in the middle of it, a single small, dark, beady eye glares out, the only sign that it is alive and in a terrible temper. A couple of olive-yellow whiskered sea lions lounge on its ledges. Choppy dark sea drawn as rows of curling strokes laps round its base. Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/ice-ferg-seals-detail.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R04 · Sprite parts

- **File:** `onemonster/game/assets/monsters/iceferg/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in the ramming game (chapter 4) and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png), [`reference/ice-ferg-seals-detail.jpg`](../reference/ice-ferg-seals-detail.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg, as on the book's pages 18-19: a huge, craggy iceberg built of great cracked slabs and blocks of ice, pale lilac-white and pale blue, drawn in fine ink with crosshatched shadows, jagged icicles hanging from its ledges, and deep cracks between the slabs; in a crevice in the middle of it, a single small, dark, beady eye glares out, the only sign that it is alive and in a terrible temper. A couple of olive-yellow whiskered sea lions lounge on its ledges. Choppy dark sea drawn as rows of curling strokes laps round its base. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, front three-quarter view from a little above, floating, the waterline along its bottom edge, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 9 pieces: 1. The iceberg alone, with its crevice empty (no eye) and no sea lions. 2. The beady eye in its crevice, open and glaring. 3. The overhanging slab of ice just above the eye, like a brow, so it can scowl. 4. A cluster of icicles from a ledge, so it can shiver. 5. A second, larger cluster of icicles. 6. An olive-yellow sea lion lounging on a ledge. 7. An olive-yellow sea lion sitting up, flippers raised. 8. Three chips of ice, flying apart. 9. A puff of freezing mist, so it can huff. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F04 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/iceferg/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png), [`reference/ice-ferg-seals-detail.jpg`](../reference/ice-ferg-seals-detail.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg, as on the book's pages 18-19: a huge, craggy iceberg built of great cracked slabs and blocks of ice, pale lilac-white and pale blue, drawn in fine ink with crosshatched shadows, jagged icicles hanging from its ledges, and deep cracks between the slabs; in a crevice in the middle of it, a single small, dark, beady eye glares out, the only sign that it is alive and in a terrible temper. A couple of olive-yellow whiskered sea lions lounge on its ledges. Choppy dark sea drawn as rows of curling strokes laps round its base. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (front three-quarter view from a little above, floating, the waterline along its bottom edge), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R04; attach it too where you can. The 8 pieces: 1. The eye narrowed to a furious slit. 2. The eye wide and startled. 3. The eye shut tight. 4. The brow slab tilted down in a scowl. 5. A jagged crack that opens across the ice below the eye like a roaring mouth (our own addition, for the charge). 6. A web of fresh cracks to lay over the ice after the crash. 7. A sea lion sliding off, flippers flailing. 8. A sea lion clinging on tight, eyes wide. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K04 · Key poses

- **File:** `onemonster/game/assets/monsters/iceferg/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png), [`reference/ice-ferg-seals-detail.jpg`](../reference/ice-ferg-seals-detail.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg, as on the book's pages 18-19: a huge, craggy iceberg built of great cracked slabs and blocks of ice, pale lilac-white and pale blue, drawn in fine ink with crosshatched shadows, jagged icicles hanging from its ledges, and deep cracks between the slabs; in a crevice in the middle of it, a single small, dark, beady eye glares out, the only sign that it is alive and in a terrible temper. A couple of olive-yellow whiskered sea lions lounge on its ledges. Choppy dark sea drawn as rows of curling strokes laps round its base. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (front three-quarter view from a little above, floating, the waterline along its bottom edge), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 7 poses: 1. Drifting and sulking, sea lions dozing on its ledges. 2. Huffing up, freezing mist pouring off it, the sea lions sitting up in alarm. 3. Charging forward, leaning in, its crack-mouth open. 4. The crash, SCRUNNCCCHHH, ice chips flying, a sea lion tumbling off. 5. Bumped and dazed, wobbling, cracks across its face. 6. Eyeing the prize: the beady eye just opening in its crevice, sly. 7. Celebrating: the eye glaring in triumph, the sea lions clapping their flippers. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Wild-'n-Windy Typhoonigator

The snatcher in chapter 5 (see design.md). Make the model sheet (OM-C05) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: eyeing the prize, celebrating, churning cloud, sucking, swelling as it fills, letting go, the morning sag, rolling along with the spout swinging.

### OM-C05 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/typhoonigator/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg), [`reference/pages-22-23-typhoonigator-full.jpg`](../reference/pages-22-23-typhoonigator-full.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's pages 20-23: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, puffy clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: front view from a little above, the water spout falling from its lips, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a side view facing right with the spout, and a view from high above. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-22-23-typhoonigator-full.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M05 · Portrait

- **File:** `onemonster/game/assets/monsters/typhoonigator/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The monster's name card and its place in the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg), [`reference/pages-22-23-typhoonigator-full.jpg`](../reference/pages-22-23-typhoonigator-full.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's pages 20-23: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, puffy clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. Draw it from this character's canonical model sheet, request OM-C05 (file onemonster/game/assets/monsters/typhoonigator/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-22-23-typhoonigator-full.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R05 · Sprite parts

- **File:** `onemonster/game/assets/monsters/typhoonigator/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in the sucking-up game (chapter 5) and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg), [`reference/pages-22-23-typhoonigator-full.jpg`](../reference/pages-22-23-typhoonigator-full.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's pages 20-23: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, puffy clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C05 (file onemonster/game/assets/monsters/typhoonigator/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, front view from a little above, the water spout falling from its lips, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 14 pieces: 1. The big billowing cloud mass of the body and hair, with no face features, hands or spout. 2. A loose round puff of cloud, large. 3. A loose round puff of cloud, medium. 4. A loose curling wisp of cloud. 5. The near clawed cloud hand, open. 6. The far clawed cloud hand, open. 7. Both heavy wrinkled brows together. 8. Both bulging eye whites, without pupils. 9. One small round pupil (the game uses it for both eyes). 10. The long fleshy pink nose. 11. The huge pink lips pursed to suck. 12. The top of the water spout, where it meets the lips. 13. A straight length of the streaked water spout that repeats seamlessly from top to bottom. 14. The ring of spray where the spout meets the sea. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F05 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/typhoonigator/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions, wing beats.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg), [`reference/pages-22-23-typhoonigator-full.jpg`](../reference/pages-22-23-typhoonigator-full.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's pages 20-23: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, puffy clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C05 (file onemonster/game/assets/monsters/typhoonigator/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (front view from a little above, the water spout falling from its lips), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R05; attach it too where you can. The 8 pieces: 1. The lips with the cheeks puffed out, blowing. 2. The lips stretched round and stuffed full, cheeks bulging. 3. The lips open in a relieved O. 4. The brows strained and bunched. 5. The brows drooping and sleepy. 6. The near hand clenched, grabbing. 7. The far hand clenched, grabbing. 8. The lips with the cheeks sucked hollow, inhaling hard. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K05 · Key poses

- **File:** `onemonster/game/assets/monsters/typhoonigator/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg), [`reference/pages-22-23-typhoonigator-full.jpg`](../reference/pages-22-23-typhoonigator-full.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's pages 20-23: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, puffy clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C05 (file onemonster/game/assets/monsters/typhoonigator/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (front view from a little above, the water spout falling from its lips), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 7 poses: 1. Storming along, sucking hard. 2. Bloated full and round, fishing boats and bottles poking out of the cloud. 3. Letting go, blowing everything out. 4. A small exhausted wisp at morning. 5. Eyeing the prize: the face turned down, sniffing, the eyes narrowed. 6. Celebrating: a great swirling burp, the cloud billowing out happily. 7. Rolling along at speed, cloud puffs streaming behind, the spout swinging wide. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Paper-Munching Yalapappus

The snatcher in chapter 6 (see design.md). Make the model sheet (OM-C06) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: eyeing the prize, celebrating, the trundle cycle, the hop and landing, munching, the bonk, the shouting chase, wailing, rolling up into a ball and unrolling dizzy.

### OM-C06 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/yalapappus/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg), [`reference/yalapappus-munching.jpg`](../reference/yalapappus-munching.jpg), [`reference/pages-36-37-mailman-yalapappus-grithix.jpg`](../reference/pages-36-37-mailman-yalapappus-grithix.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus, as in the book: a huge, round, lumpy monster of curly woolly fur, ochre shading to yellow-green, with a bulldog's squashed face, droopy ears, a wide mouth with two great white tusks, a heavy pink upper lip and nose, heavy-lidded greedy eyes, short stumpy legs with big pink feet, a white napkin tied round his neck and a big fork in one pink paw, ready to munch. He is trundling along at a run, a scrap of paper half-munched in his mouth. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: side view facing right, standing on his two stumpy legs, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view, a back view, and a three-quarter view facing right. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-munching.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-36-37-mailman-yalapappus-grithix.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M06 · Portrait

- **File:** `onemonster/game/assets/monsters/yalapappus/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The monster's name card and its place in the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg), [`reference/yalapappus-munching.jpg`](../reference/yalapappus-munching.jpg), [`reference/pages-36-37-mailman-yalapappus-grithix.jpg`](../reference/pages-36-37-mailman-yalapappus-grithix.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus, as in the book: a huge, round, lumpy monster of curly woolly fur, ochre shading to yellow-green, with a bulldog's squashed face, droopy ears, a wide mouth with two great white tusks, a heavy pink upper lip and nose, heavy-lidded greedy eyes, short stumpy legs with big pink feet, a white napkin tied round his neck and a big fork in one pink paw, ready to munch. He is trundling along at a run, a scrap of paper half-munched in his mouth. Draw it from this character's canonical model sheet, request OM-C06 (file onemonster/game/assets/monsters/yalapappus/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-munching.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-36-37-mailman-yalapappus-grithix.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R06 · Sprite parts

- **File:** `onemonster/game/assets/monsters/yalapappus/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in the catching game (chapter 6) and the Trollusk's getaway (chapter 7) and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg), [`reference/yalapappus-munching.jpg`](../reference/yalapappus-munching.jpg), [`reference/pages-36-37-mailman-yalapappus-grithix.jpg`](../reference/pages-36-37-mailman-yalapappus-grithix.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus, as in the book: a huge, round, lumpy monster of curly woolly fur, ochre shading to yellow-green, with a bulldog's squashed face, droopy ears, a wide mouth with two great white tusks, a heavy pink upper lip and nose, heavy-lidded greedy eyes, short stumpy legs with big pink feet, a white napkin tied round his neck and a big fork in one pink paw, ready to munch. He is trundling along at a run, a scrap of paper half-munched in his mouth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C06 (file onemonster/game/assets/monsters/yalapappus/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, side view facing right, standing on his two stumpy legs, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 11 pieces: 1. The round shaggy body, no head, arms or legs. 2. The head with the eyes, the snout, the far ear and the upper lip, but no lower jaw and no near ear. 3. The lower jaw with the two great tusks, mouth closed. 4. The white napkin tied at the neck, so it can flap. 5. The near arm and paw, open. 6. The far arm and paw, gripping. 7. The big fork alone. 8. The near droopy ear. 9. The little pink octopus that rides on his head from chapter 6 on, its tentacles loose. 10. The near stumpy leg and big clawed foot. 11. The far stumpy leg and big clawed foot. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F06 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/yalapappus/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg), [`reference/yalapappus-munching.jpg`](../reference/yalapappus-munching.jpg), [`reference/pages-36-37-mailman-yalapappus-grithix.jpg`](../reference/pages-36-37-mailman-yalapappus-grithix.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus, as in the book: a huge, round, lumpy monster of curly woolly fur, ochre shading to yellow-green, with a bulldog's squashed face, droopy ears, a wide mouth with two great white tusks, a heavy pink upper lip and nose, heavy-lidded greedy eyes, short stumpy legs with big pink feet, a white napkin tied round his neck and a big fork in one pink paw, ready to munch. He is trundling along at a run, a scrap of paper half-munched in his mouth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C06 (file onemonster/game/assets/monsters/yalapappus/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (side view facing right, standing on his two stumpy legs), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R06; attach it too where you can. The 9 pieces: 1. The lower jaw wide open. 2. The lower jaw chomping, cheeks bulging, a scrap of paper sticking out. 3. The lower jaw dropped, shouting. 4. The eye area only, eyes gleeful. 5. The eye area only, eyes furious. 6. The eye area only, eyes swirling and dizzy. 7. The eye area only, eyes shut (a blink). 8. The near paw clenched in a fist. 9. The whole Yalapappus tucked into a round furry ball, napkin and paws wrapped in, for rolling (the game spins it). Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K06 · Key poses

- **File:** `onemonster/game/assets/monsters/yalapappus/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg), [`reference/yalapappus-munching.jpg`](../reference/yalapappus-munching.jpg), [`reference/pages-36-37-mailman-yalapappus-grithix.jpg`](../reference/pages-36-37-mailman-yalapappus-grithix.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus, as in the book: a huge, round, lumpy monster of curly woolly fur, ochre shading to yellow-green, with a bulldog's squashed face, droopy ears, a wide mouth with two great white tusks, a heavy pink upper lip and nose, heavy-lidded greedy eyes, short stumpy legs with big pink feet, a white napkin tied round his neck and a big fork in one pink paw, ready to munch. He is trundling along at a run, a scrap of paper half-munched in his mouth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C06 (file onemonster/game/assets/monsters/yalapappus/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right, standing on his two stumpy legs), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 12 poses: 1. Standing idle, contented, fork up. 2. Trundling, near leg forward. 3. Trundling, far leg forward. 4. Hopping, in the air, legs tucked. 5. Landing, squashed flat. 6. Sitting with the napkin on, gleefully munching a paper off the fork. 7. Bonked on the head, dizzy, a bump rising. 8. Running and shouting, fist raised. 9. Sitting and wailing. 10. Looking up hungrily, napkin on and fork raised, eyeing the prize. 11. Celebrating: patting his tummy, napkin flapping, grinning. 12. Unrolling, dizzy and wobbling. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Bombanat-Collecting Grithix

The snatcher in chapter 9 (see design.md). Make the model sheet (OM-C07) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: eyeing the prize, celebrating, the stride cycle with a swinging tail, the net swing in three beats, the slam, posting the letter, tripping, the stroll home, the pole-vault.

### OM-C07 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/grithix/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg), [`reference/grithix-nets-bombanat-page.jpg`](../reference/grithix-nets-bombanat-page.jpg), [`reference/grithix-mailbox-scan.jpg`](../reference/grithix-mailbox-scan.jpg), [`reference/title-page.jpg`](../reference/title-page.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix, as in the book (the back cover shows him best): a tall, upright, stout monster with pale pinkish hide drawn in fine lines (not furry); a big long head with a heavy snout like a rhinoceros's, a row of blunt horns along the top of the snout and a blunt horn on the brow, two long white tusks curving up from the lower jaw, a small half-lidded eye with a sly, pleased look and a smirk, and one long floppy ear or horn curling back from the top of the head. He wears a long magenta-pink robe down to his feet with gold buttons down the front and a green bow tie, and on his back a teal scaly shell dotted with small yellow spots, showing over both shoulders. Big pink clawed hands, big pink clawed feet with long white talons, and a long pink tail ending in a spiked ball like a mace. He carries a butterfly net on a long yellow pole with a round yellow hoop and a dark mesh bag. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: side view facing right, standing upright, the net over his shoulder, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view, a back view, and a three-quarter view facing right. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/back-cover-grithix.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grithix-nets-bombanat-page.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grithix-mailbox-scan.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/title-page.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M07 · Portrait

- **File:** `onemonster/game/assets/monsters/grithix/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The monster's name card and its place in the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg), [`reference/grithix-nets-bombanat-page.jpg`](../reference/grithix-nets-bombanat-page.jpg), [`reference/grithix-mailbox-scan.jpg`](../reference/grithix-mailbox-scan.jpg), [`reference/title-page.jpg`](../reference/title-page.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix, as in the book (the back cover shows him best): a tall, upright, stout monster with pale pinkish hide drawn in fine lines (not furry); a big long head with a heavy snout like a rhinoceros's, a row of blunt horns along the top of the snout and a blunt horn on the brow, two long white tusks curving up from the lower jaw, a small half-lidded eye with a sly, pleased look and a smirk, and one long floppy ear or horn curling back from the top of the head. He wears a long magenta-pink robe down to his feet with gold buttons down the front and a green bow tie, and on his back a teal scaly shell dotted with small yellow spots, showing over both shoulders. Big pink clawed hands, big pink clawed feet with long white talons, and a long pink tail ending in a spiked ball like a mace. He carries a butterfly net on a long yellow pole with a round yellow hoop and a dark mesh bag. Draw it from this character's canonical model sheet, request OM-C07 (file onemonster/game/assets/monsters/grithix/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photos of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/back-cover-grithix.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grithix-nets-bombanat-page.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grithix-mailbox-scan.jpg , https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/title-page.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R07 · Sprite parts

- **File:** `onemonster/game/assets/monsters/grithix/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in the netting game (chapter 9) and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg), [`reference/grithix-nets-bombanat-page.jpg`](../reference/grithix-nets-bombanat-page.jpg), [`reference/grithix-mailbox-scan.jpg`](../reference/grithix-mailbox-scan.jpg), [`reference/title-page.jpg`](../reference/title-page.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix, as in the book (the back cover shows him best): a tall, upright, stout monster with pale pinkish hide drawn in fine lines (not furry); a big long head with a heavy snout like a rhinoceros's, a row of blunt horns along the top of the snout and a blunt horn on the brow, two long white tusks curving up from the lower jaw, a small half-lidded eye with a sly, pleased look and a smirk, and one long floppy ear or horn curling back from the top of the head. He wears a long magenta-pink robe down to his feet with gold buttons down the front and a green bow tie, and on his back a teal scaly shell dotted with small yellow spots, showing over both shoulders. Big pink clawed hands, big pink clawed feet with long white talons, and a long pink tail ending in a spiked ball like a mace. He carries a butterfly net on a long yellow pole with a round yellow hoop and a dark mesh bag. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C07 (file onemonster/game/assets/monsters/grithix/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, side view facing right, standing upright, the net over his shoulder, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 16 pieces: 1. The torso and the long magenta robe down to the hem, with its gold buttons and the green bow tie, no head, arms, feet or tail. 2. The head with the horns, the eye and the upper snout, but no lower jaw and no floppy ear. 3. The lower jaw with the two long tusks, mouth closed in a smirk. 4. The long floppy ear or horn from the top of the head. 5. The near upper arm. 6. The near forearm and gripping hand. 7. The far upper arm. 8. The far forearm and open hand. 9. The near foot and ankle, as it shows below the robe. 10. The far foot and ankle. 11. The loose lower edge of the robe, so it can swing as he walks. 12. The long tail without its end. 13. The spiked ball at the end of the tail. 14. The teal scaly shell on his back. 15. The long yellow pole of the net. 16. The yellow hoop and the empty net bag. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F07 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/grithix/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg), [`reference/grithix-nets-bombanat-page.jpg`](../reference/grithix-nets-bombanat-page.jpg), [`reference/grithix-mailbox-scan.jpg`](../reference/grithix-mailbox-scan.jpg), [`reference/title-page.jpg`](../reference/title-page.jpg)
- **Status:** delivered, not used (the game animates from the key poses)

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix, as in the book (the back cover shows him best): a tall, upright, stout monster with pale pinkish hide drawn in fine lines (not furry); a big long head with a heavy snout like a rhinoceros's, a row of blunt horns along the top of the snout and a blunt horn on the brow, two long white tusks curving up from the lower jaw, a small half-lidded eye with a sly, pleased look and a smirk, and one long floppy ear or horn curling back from the top of the head. He wears a long magenta-pink robe down to his feet with gold buttons down the front and a green bow tie, and on his back a teal scaly shell dotted with small yellow spots, showing over both shoulders. Big pink clawed hands, big pink clawed feet with long white talons, and a long pink tail ending in a spiked ball like a mace. He carries a butterfly net on a long yellow pole with a round yellow hoop and a dark mesh bag. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C07 (file onemonster/game/assets/monsters/grithix/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (side view facing right, standing upright, the net over his shoulder), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R07; attach it too where you can. The 6 pieces: 1. The net bag full, sagging with a tangled Bombanat. 2. The lower jaw dropped open in an AHA. 3. The lower jaw in a calm smirk that doesn't care a snickle. 4. The eye area only, eye narrowed and taking aim. 5. The eye area only, eye closed and contented. 6. The far hand holding a letter (no letter drawn), ready to post it. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K07 · Key poses

- **File:** `onemonster/game/assets/monsters/grithix/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg), [`reference/grithix-nets-bombanat-page.jpg`](../reference/grithix-nets-bombanat-page.jpg), [`reference/grithix-mailbox-scan.jpg`](../reference/grithix-mailbox-scan.jpg), [`reference/title-page.jpg`](../reference/title-page.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix, as in the book (the back cover shows him best): a tall, upright, stout monster with pale pinkish hide drawn in fine lines (not furry); a big long head with a heavy snout like a rhinoceros's, a row of blunt horns along the top of the snout and a blunt horn on the brow, two long white tusks curving up from the lower jaw, a small half-lidded eye with a sly, pleased look and a smirk, and one long floppy ear or horn curling back from the top of the head. He wears a long magenta-pink robe down to his feet with gold buttons down the front and a green bow tie, and on his back a teal scaly shell dotted with small yellow spots, showing over both shoulders. Big pink clawed hands, big pink clawed feet with long white talons, and a long pink tail ending in a spiked ball like a mace. He carries a butterfly net on a long yellow pole with a round yellow hoop and a dark mesh bag. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C07 (file onemonster/game/assets/monsters/grithix/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right, standing upright, the net over his shoulder), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 14 poses: 1. Standing idle with the net over his shoulder. 2. Striding, near foot forward, tail swinging. 3. Striding, far foot forward. 4. Winding up a swing, the net drawn back. 5. The swing, the net sweeping through. 6. Slamming the net down, FLIP-FLOP. 7. Posting a letter into a mailbox. 8. Tripping and stumbling. 9. Strolling home not caring a snickle, a netted Bombanat under one arm. 10. Peeking round a tree, net raised, smiling, eyeing the prize. 11. Celebrating: dusting off his hands after posting a letter, not caring a snickle. 12. Pole-vaulting: the net pole planted, swinging up off the ground. 13. Pole-vaulting: at the top of the arc, robe billowing, tail streaming. 14. Landing from the vault, knees bent. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Supporting cast

The people in the story: the girls, the mailman, the captain and crew, and the neighbours who look out in chapter 1. A model sheet first, then their small sprites.

### OM-C08 · Supporting cast model sheet (canonical)

- **File:** `onemonster/game/assets/cast/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical look of the people, for their sprites and the story pages.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg), [`reference/mailbox-girl-and-trollusk.jpg`](../reference/mailbox-girl-and-trollusk.jpg), [`reference/pages-36-37-mailman-yalapappus-grithix.jpg`](../reference/pages-36-37-mailman-yalapappus-grithix.jpg), [`reference/captain-throws-bottle.jpg`](../reference/captain-throws-bottle.jpg)
- **Note:** Lucy Jane is taken to be the girl in glasses in mailbox-girl-and-trollusk.jpg, since Sally Ann (pages 6-7) looks different; not confirmed.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A character model sheet for an animated game: the one definitive design of each of these people, drawn in a row, each shown twice side by side (a front view and a side view facing right), all at the same scale, standing in a calm neutral pose. 1. Sally Ann, a barefoot girl of about eight with long wavy light-brown hair tied with a big pink bow, a white short-sleeved blouse and red-checked overall shorts, as on the book's pages 6-7 ( https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg ). 2. Lucy Jane, a barefoot girl of about eight with long wavy brown hair, round glasses, a white top and a pink skirt, as the girl in https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/mailbox-girl-and-trollusk.jpg . 3. The official mailman, small and stern, in a round helmet with goggles and an ochre jacket, with a mail satchel, as on the book's pages 36-37 ( https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-36-37-mailman-yalapappus-grithix.jpg ). 4. The captain of the fishing boat, with a long nose, a long white beard, a grey cap and coat and a polka-dot hanky in his pocket, as in https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/captain-throws-bottle.jpg . Even, flat lighting and clean washes; wide gaps between the figures; no labels, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K08 · Supporting cast sprites

- **File:** `onemonster/game/assets/cast/sprites.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The lookers in chapter 1, the mailman's motorcycle along the top of chapter 1 and the epilogue, and the captain and crew in the chapter 4 hand-off.
- **Stand-in until delivered:** Small figures drawn in code.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Small game sprites of the people in the story, drawn from the supporting cast model sheet, request OM-C08 (file onemonster/game/assets/cast/model-sheet.png): attach that image and match it exactly. Each sprite is complete on its own: 1. Sally Ann in an open window frame with curtains, looking out sharply. 2. The same window, Sally Ann turned away, writing at a desk. 3. A plump neighbour lady in a rocking chair on a porch step, peering over her spectacles. 4. The same neighbour, dozing. 5. A scruffy little dog, ears up, staring. 6. The same dog, curled up asleep. 7. The mailman riding his official-looking old motorcycle piled with mail sacks, side view facing left, wheels round. 8. The same, mid-bounce, exhaust puffing. 9. The captain standing in a pink rubber raft, throwing a bottle overarm. 10. Two bearded sailors paddling the pink rubber raft with an S.O.S. flag, as on the book's page-20 spread, paddles forward. 11. The same, paddles back. 12. Lucy Jane walking along reading a letter. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Props

The things that move in each chapter and are not monsters, one sheet per chapter. The game cuts each sheet into separate sprites on integration.

### OM-X01 · Stamp-Collecting Trollusk props

- **File:** `onemonster/game/assets/props/trollusk.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in the sneaking game (chapter 1).
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/title-page.jpg`](../reference/title-page.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others: 1. A red postage stamp with a scalloped edge. 2. A green postage stamp with a scalloped edge. 3. A blue postage stamp with a scalloped edge, flipping in the wind. 4. A yellow postage stamp with a scalloped edge, curling. 5. A round leafy bush. 6. A long low flowerbed of tulips and daisies. 7. Sally Ann's grey rural mailbox with a rounded top, on a wooden post, its red flag down. 8. The same mailbox with the red flag up and the door open. 9. An eye-shaped warning bubble with a startled eye in it. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/title-page.jpg .
```

### OM-X02 · Letter-Eating Bombanat props

- **File:** `onemonster/game/assets/props/bombanat.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in the swooping game (chapters 2 and 8).
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others: 1. A bubble of blue goo, small. 2. A bubble, medium. 3. A bubble, large and swelling. 4. A bubble bursting, with spray. 5. A flung blob of goo. 6. An old torn ticket. 7. A paper menu. 8. A folded paper hat. 9. A crumpled newspaper page. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg .
```

### OM-X03 · Bombanat-Munching Grumley props

- **File:** `onemonster/game/assets/props/grumley.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in the grabbing game (chapter 3).
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others: 1. A red-and-white diamond kite with a tail, as a decoy. 2. A black umbrella flapping open, as a decoy. 3. The same umbrella blown inside-out. 4. A wicker picnic basket, empty, lid open. 5. The same basket heaped full. 6. A ring of goo splash, seen side-on. 7. The fishing boat's big net hanging from a crane hook, open, side-on. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg .
```

### OM-X04 · Furious-Floating Ice-Ferg props

- **File:** `onemonster/game/assets/props/iceferg.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in the ramming game (chapter 4).
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others, seen from high above: 1. The captain's fishing boat, the Peg, as on the book's pages 16-17: a stout teal hull with portholes, a wooden wheelhouse, a crane with a net, sailing. 2. The same boat tilted and sinking, bow up. 3. A small red rowing boat. 4. A small green rowing boat with a fisherman. 5. A curving current arrow drawn in the water as foam. 6. A white splash ring. 7. The Peg leaning into a turn, a puff of steam from its funnel. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-X05 · Wild-'n-Windy Typhoonigator props

- **File:** `onemonster/game/assets/props/typhoonigator.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in the sucking-up game (chapter 5).
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others, seen from above: 1. The captain's glass bottle, corked, with a red-and-white label and a rolled note inside. 2. A plain green bottle. 3. A plain brown bottle. 4. A silver fish. 5. A striped fish. 6. A red-and-white buoy. 7. A tiny fishing boat, tumbling. 8. A blob of blue goo. 9. The captain's bottle half under a wave, only its neck showing. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-X06 · Paper-Munching Yalapappus props

- **File:** `onemonster/game/assets/props/yalapappus.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in the catching game (chapter 6) and the Trollusk's getaway (chapter 7).
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others, side-on: 1. A round grey rock. 2. A jagged brown rock. 3. The near edge of a hole in the bumpy ground. 4. The far edge of the same hole. 5. A torn scrap of paper. 6. A crumpled paper ball. 7. A paper bag. 8. The captain's note, a rolled scrap with scribbles (no readable words). 9. A broken bottle, glass flying. 10. The captain's bottle falling, side-on, with its red-and-white label. 11. A small fishing boat tumbling down, side-on. 12. A fish falling, flapping. 13. A falling blob of blue goo. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-X07 · Bombanat-Collecting Grithix props

- **File:** `onemonster/game/assets/props/grithix.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in the netting game (chapter 9).
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others: 1. The official-looking mailbox: a squat riveted grey-mauve metal box with an arched top and a mail slot, as on the Grithix's page of the book. 2. A glass collecting jar, empty, corked. 3. The same jar with a small angry mauve bat-winged monster inside. 4. A clump of ferns for the foreground. 5. A gnarled root to trip over. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/back-cover-grithix.jpg .
```

## Chapter scenes

One background per chapter. The game draws the monsters and everything that moves on top, so each scene leaves the play area quiet, as its prompt says.

### OM-S01 · Stamp-Collecting Trollusk scene

- **File:** `onemonster/game/assets/scenes/trollusk.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the sneaking game (chapter 1).
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/title-page.jpg`](../reference/title-page.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). A leafy country lane seen side-on, as on the book's opening page: a dirt path along the bottom third, a white picket fence, gnarled old trees with faces in their knots, flowerbeds, low bushes and a dustbin spaced along it, and at the far right a grey rural mailbox with a red flag on a wooden post. Leafy branches overhead and a pale lilac sky. Keep the path along the bottom clear to walk on. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/title-page.jpg .
```

### OM-S02 · Letter-Eating Bombanat scene

- **File:** `onemonster/game/assets/scenes/bombanat.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the swooping game (chapters 2 and 8).
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). A wood seen side-on, wide enough to scroll: a mossy floor with fallen logs and roots along the bottom quarter, gnarled trees with faces in their knots, low branches and clusters of leaves, and patches of pale mauve sky between the treetops; far off at the right, through the trees, a glimpse of the glossy blue Ocean of Bubbley Goo. Keep the band above the ground open, because the Bombanat swoops through it. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg .
```

### OM-S03 · Bombanat-Munching Grumley scene

- **File:** `onemonster/game/assets/scenes/grumley.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the grabbing game (chapter 3).
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). Close to the surface of the Blue Ocean of Bubbley Goo: glossy blue-and-teal goo with bubbles across the bottom third, a small rocky shore at the left edge with a picnic basket and a checked cloth, and a big open lilac sky above with a few curling clouds. Keep the sky open, because Bombanats fly through it. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg .
```

### OM-S04 · Furious-Floating Ice-Ferg scene

- **File:** `onemonster/game/assets/scenes/iceferg.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the ramming game (chapter 4).
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). The open sea seen from high above: slate-blue and teal water drawn as rows of curling strokes, a few streaks of foam and long current lines, a harbour with a lighthouse and jetty along the top edge, and scattered rocks near the sides. Keep the middle of the sea open, because the iceberg and the boats move there. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-S05 · Wild-'n-Windy Typhoonigator scene

- **File:** `onemonster/game/assets/scenes/typhoonigator.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the sucking-up game (chapter 5).
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). A wide stormy sea seen from above at a slant: slate-blue and teal water drawn as rows of curling strokes, spray and foam, a heavy lilac-and-grey sky at the top, and at the far right a strip of bumpy brown land with a signpost, the edge of Nowhere. Keep the middle open, because the Typhoonigator and the flotsam move there. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-S06 · Paper-Munching Yalapappus scene

- **File:** `onemonster/game/assets/scenes/yalapappus.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the catching game (chapter 6) and the Trollusk's getaway (chapter 7).
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). The edge of Nowhere seen side-on, as in the book: a jungly place of palms, ferns and gnarled trees, with curtains of blue goo dripping from the branches above, bumpy ochre ground with rocks, holes and tufts of grass along the bottom third, a crooked blank wooden signpost nailed to a tree, and rolling hills and a winding road far off under a pale lilac sky. Keep the ground strip clear for running and the middle open for things falling. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-S07 · Bombanat-Collecting Grithix scene

- **File:** `onemonster/game/assets/scenes/grithix.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the netting game (chapter 9).
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of monsters, people and animals (the game draws them on top). A clearing in a thick wood: gnarled trees and dense ferns and leaves framing the left, right and top edges, a mossy floor across the bottom third, and an official-looking mailbox at the right edge, a squat riveted grey-mauve metal box with an arched top and a mail slot, as in the book. Keep the middle of the clearing open, because Bombanats fly through it and the Grithix runs about. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/back-cover-grithix.jpg .
```

## Story pages

The prologue and the epilogue, shown as picture-book pages with the game's text in the cream band at the bottom.

### OM-P01 · Prologue: Sally Ann posts her letter

- **File:** `onemonster/game/assets/story/prologue.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The opening page of the journey.
- **Stand-in until delivered:** The lane with a girl and the mailbox drawn in code.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A full-bleed story-page painting, wide 16:9, in the book's layout: the picture fills the top three-quarters and the bottom quarter is left as a plain flat cream band for the game's text. As on the book's pages 6-7 (a new picture of the same moment, not a copy): Sally Ann, a barefoot girl of about eight with long wavy light-brown hair tied with a big pink bow, a white short-sleeved blouse and red-checked overall shorts, stands on tiptoe posting a white envelope into a grey rural mailbox with a red flag on a wooden post, beside a white picket fence on a leafy country lane. Behind a gnarled old tree in the foreground, half hidden, a shaggy brown troll with a pink pig snout, a checked top hat and a yellow stamp bag peeks out, watching the letter. Morning light, a pale lilac sky. Draw the characters from the attached model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-P02 · Epilogue: the official mailman

- **File:** `onemonster/game/assets/story/mailman.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The epilogue page where the mailman takes the letter.
- **Stand-in until delivered:** A mailbox and a motorcycle drawn in code.
- **Reference:** [`reference/pages-36-37-mailman-yalapappus-grithix.jpg`](../reference/pages-36-37-mailman-yalapappus-grithix.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A full-bleed story-page painting, wide 16:9, in the book's layout: the picture fills the top three-quarters and the bottom quarter is left as a plain flat cream band for the game's text. At the edge of Nowhere, a stern little mailman in a round helmet, goggles and an ochre jacket roars up on an official-looking old motorcycle piled with mail sacks, one arm raised and pointing. In front of an official-looking mailbox (a squat riveted grey-mauve metal box with an arched top), three monsters freeze in the act of trying to carry the mailbox off: a shaggy brown troll with a pink pig snout, a checked top hat and a yellow stamp bag; a huge woolly bulldog-faced monster with tusks, a napkin and a fork; a dark shaggy bat-winged monster with a long toothy snout, a propeller cap and a striped necktie. At the side, a tall horn-snouted pink monster in a long magenta robe and a scaly shell, with a butterfly net and a spiked tail walks off home with a netted Bombanat under one arm, not caring a bit. Draw the characters from the attached model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-36-37-mailman-yalapappus-grithix.jpg .
```

### OM-P03 · Epilogue: Lucy Jane gets her letter

- **File:** `onemonster/game/assets/story/lucyjane.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The last page of the journey, before the postmark tally.
- **Stand-in until delivered:** The porch and mailbox with a girl drawn in code.
- **Reference:** [`reference/mailbox-girl-and-trollusk.jpg`](../reference/mailbox-girl-and-trollusk.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A full-bleed story-page painting, wide 16:9, in the book's layout: the picture fills the top three-quarters and the bottom quarter is left as a plain flat cream band for the game's text. A girl of about eight with long wavy brown hair, round glasses, a white top and a pink skirt, barefoot, walks away from a plain blue mailbox on a post (no lettering) in front of a wooden porch with flower baskets, reading a crumpled, goo-stained, nibbled letter with a calm, slightly bored face. All around her, unseen, only the three monsters chasing the letter peek out of the bushes, the trees and the sky: a shaggy brown troll with a pink pig snout, a checked top hat and a yellow stamp bag; a dark shaggy bat-winged monster with a long toothy snout, a propeller cap and a striped necktie; a huge woolly bulldog-faced monster with tusks, a napkin and a fork. Each of them appears exactly once. No Grumley, Ice-Ferg, Typhoonigator, Grithix or other monster; no mailman, no captain, no second girl. Warm afternoon light. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/mailbox-girl-and-trollusk.jpg .
```

## Adventure: new key poses

Extra key poses for the side-scrolling Adventure (design/adventure.md): jumping, climbing, swimming and the other moves the minigames never needed. Draw each sheet with the monster's model sheet attached, at the same scale as its key-poses sheet (OM-K), so the new poses mix with the old ones frame to frame.

### OM-A01 · Stamp-Collecting Trollusk: adventure poses

- **File:** `onemonster/game/assets/monsters/trollusk/moves.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The side-scrolling Adventure: jumps, falls, climbs and the other new moves.
- **Stand-in until delivered:** The nearest existing key pose.
- **Reference:** [`reference/title-page.jpg`](../reference/title-page.jpg), [`reference/trollusk-snatches-from-yalapappus.jpg`](../reference/trollusk-snatches-from-yalapappus.jpg), [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg), [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as in the book: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout (his snerk) with a big round nostril, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a crumpled blue-green checked top hat, squashed down, with a coil of thin blue-green tubing looped round it as a hatband, and a yellow shoulder bag on a strap lettered MY STAMPS (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest, with a smirk on his snout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C01 (file onemonster/game/assets/monsters/trollusk/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K01 (file onemonster/game/assets/monsters/trollusk/poses.png), and draw these at exactly the same scale. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right, standing on his two short legs), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 12 poses: 1. Crouched to jump, knees bent, hat squashed down. 2. Jumping up, arms flung up, bag swinging below. 3. Falling, legs dangling, hat lifting off his head. 4. Landing in a deep squash, dust puffing out. 5. Hanging from a ledge by both hands, feet kicking. 6. Pulling himself up over a ledge, one knee up. 7. Sliding along on his belly under something low, snout first. 8. Knocked back, tumbling, stars round his head, stamps flying from the bag. 9. Balancing on tiptoe on a narrow rail, arms out wide. 10. Sniffing a postage stamp held up in both hands, eyes shut in bliss. 11. Running flat out and looking back over his shoulder in alarm, a letter clamped in his snout. 12. Soaked and dripping, hat drooping, after a splash of water. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-A02 · Letter-Eating Bombanat: adventure poses

- **File:** `onemonster/game/assets/monsters/bombanat/moves.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The side-scrolling Adventure: jumps, falls, climbs and the other new moves.
- **Stand-in until delivered:** The nearest existing key pose.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg), [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, as in the book: a small, dark, shaggy body with huge lilac-mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a red striped cap with a little yellow propeller on top, a red-and-white striped necktie, clawed pink feet and a thin curling pink tail. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K02 (file onemonster/game/assets/monsters/bombanat/poses.png), and draw these at exactly the same scale. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right in flight, wings spread level), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 9 poses: 1. Flying flat out with a white envelope in his teeth, wings at mid-stroke. 2. Tumbling through the air after a bump, wings crumpled, propeller bent. 3. Hanging upside down from a branch by his feet, wings wrapped round him, asleep. 4. Banking hard into a turn, one wing high. 5. Straining at a hard climbing stroke, wings swept fully down. 6. Pulling up out of a dive into a swoop, wings spread, propeller whirring. 7. Munching a scrap of paper in flight, cheeks full. 8. Blown backwards by a gust, wings inside out like an umbrella. 9. Wings drooping and heavy, soaked and dripping. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-A03 · Bombanat-Munching Grumley: adventure poses

- **File:** `onemonster/game/assets/monsters/grumley/moves.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The side-scrolling Adventure: jumps, falls, climbs and the other new moves.
- **Stand-in until delivered:** The nearest existing key pose.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg), [`reference/grumley-grabs-bombanat-page.jpg`](../reference/grumley-grabs-bombanat-page.jpg), [`reference/pages-16-17-grumley-netted.jpg`](../reference/pages-16-17-grumley-netted.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as in the book: a big shaggy sea monster in olive-ochre fur shading to orange, his head and body one great hairy mass with a crown of white horns on top, heavy scowling brows, small round wire spectacles on a pink nose, and a fanged underbite; below, a tangle of octopus tentacles with ringed suckers, and two long spiny crab arms ending in big claws that have little eyes and teeth of their own. Show him rising out of glossy dark goo, dripping, claws raised. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C03 (file onemonster/game/assets/monsters/grumley/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K03 (file onemonster/game/assets/monsters/grumley/poses.png), and draw these at exactly the same scale. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (three-quarter view facing right, rising out of the goo with his tentacles spread (draw no goo)), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 9 poses: 1. Swimming underwater seen side-on facing right, body stretched out, tentacles streaming behind, crab arms reaching forward. 2. Swimming underwater, the tentacles pulled in for the next kick. 3. Diving steeply down, head first, tentacles trailing up behind. 4. Bursting up out of the goo in a leap, the whole body in the air, tentacles flung out. 5. Squirting a jet of goo from his mouth to shoot forward, cheeks puffed. 6. Both crab claws stretched straight up, snapping shut. 7. Tangled in a fishing net, struggling. 8. Spun and dizzy after a bump, spectacles askew. 9. Clinging to a rock with his tentacles, resting. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-A04 · Furious-Floating Ice-Ferg: adventure poses

- **File:** `onemonster/game/assets/monsters/iceferg/moves.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The side-scrolling Adventure: jumps, falls, climbs and the other new moves.
- **Stand-in until delivered:** The nearest existing key pose.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png), [`reference/ice-ferg-seals-detail.jpg`](../reference/ice-ferg-seals-detail.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg, as on the book's pages 18-19: a huge, craggy iceberg built of great cracked slabs and blocks of ice, pale lilac-white and pale blue, drawn in fine ink with crosshatched shadows, jagged icicles hanging from its ledges, and deep cracks between the slabs; in a crevice in the middle of it, a single small, dark, beady eye glares out, the only sign that it is alive and in a terrible temper. A couple of olive-yellow whiskered sea lions lounge on its ledges. Choppy dark sea drawn as rows of curling strokes laps round its base. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K04 (file onemonster/game/assets/monsters/iceferg/poses.png), and draw these at exactly the same scale. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (front three-quarter view from a little above, floating, the waterline along its bottom edge), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 6 poses: 1. Seen exactly side-on facing right, floating, the waterline along its bottom edge. 2. Sunk low in the water, only its top ledges and the eye above the waterline. 3. Risen high, its great dark underwater part showing below a waterline near the bottom. 4. Charging forward side-on, leaning in, spray bursting off the front. 5. Cracked, a chunk broken off its front, glaring. 6. Small and melted down to half its size, dripping, still glaring. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-A05 · Wild-'n-Windy Typhoonigator: adventure poses

- **File:** `onemonster/game/assets/monsters/typhoonigator/moves.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The side-scrolling Adventure: jumps, falls, climbs and the other new moves.
- **Stand-in until delivered:** The nearest existing key pose.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg), [`reference/pages-22-23-typhoonigator-full.jpg`](../reference/pages-22-23-typhoonigator-full.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's pages 20-23: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, puffy clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C05 (file onemonster/game/assets/monsters/typhoonigator/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K05 (file onemonster/game/assets/monsters/typhoonigator/poses.png), and draw these at exactly the same scale. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (front view from a little above, the water spout falling from its lips), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 6 poses: 1. Seen side-on facing right, rolling along the sky, the water spout trailing back below it. 2. Side-on, sucking hard, cheeks hollow, the spout pulled straight down. 3. Side-on, blowing a great gust forward, cheeks puffed out. 4. Side-on, swollen huge and heavy with everything it swallowed, sagging. 5. Side-on, shrunk to a thin wispy little cloud, worried. 6. Side-on, thundering in a temper, dark, a little lightning crackling. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-A06 · Paper-Munching Yalapappus: adventure poses

- **File:** `onemonster/game/assets/monsters/yalapappus/moves.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The side-scrolling Adventure: jumps, falls, climbs and the other new moves.
- **Stand-in until delivered:** The nearest existing key pose.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg), [`reference/yalapappus-munching.jpg`](../reference/yalapappus-munching.jpg), [`reference/pages-36-37-mailman-yalapappus-grithix.jpg`](../reference/pages-36-37-mailman-yalapappus-grithix.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus, as in the book: a huge, round, lumpy monster of curly woolly fur, ochre shading to yellow-green, with a bulldog's squashed face, droopy ears, a wide mouth with two great white tusks, a heavy pink upper lip and nose, heavy-lidded greedy eyes, short stumpy legs with big pink feet, a white napkin tied round his neck and a big fork in one pink paw, ready to munch. He is trundling along at a run, a scrap of paper half-munched in his mouth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C06 (file onemonster/game/assets/monsters/yalapappus/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K06 (file onemonster/game/assets/monsters/yalapappus/poses.png), and draw these at exactly the same scale. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right, standing on his two stumpy legs), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 8 poses: 1. Crouching to hop, knees bent, fork up. 2. In the air at the top of a big hop. 3. Dropping bottom-first in a ground-pound, ears flying up. 4. Hugging a tree trunk and shaking it. 5. Stuck in a blob of blue goo up to his knees, straining. 6. Looking straight up with arms raised and mouth open, waiting to catch something on his head. 7. Trundling after something in a temper, fork raised, shouting. 8. Rolling uphill in a ball, slowing. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-A07 · Bombanat-Collecting Grithix: adventure poses

- **File:** `onemonster/game/assets/monsters/grithix/moves.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The side-scrolling Adventure: jumps, falls, climbs and the other new moves.
- **Stand-in until delivered:** The nearest existing key pose.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg), [`reference/grithix-nets-bombanat-page.jpg`](../reference/grithix-nets-bombanat-page.jpg), [`reference/grithix-mailbox-scan.jpg`](../reference/grithix-mailbox-scan.jpg), [`reference/title-page.jpg`](../reference/title-page.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix, as in the book (the back cover shows him best): a tall, upright, stout monster with pale pinkish hide drawn in fine lines (not furry); a big long head with a heavy snout like a rhinoceros's, a row of blunt horns along the top of the snout and a blunt horn on the brow, two long white tusks curving up from the lower jaw, a small half-lidded eye with a sly, pleased look and a smirk, and one long floppy ear or horn curling back from the top of the head. He wears a long magenta-pink robe down to his feet with gold buttons down the front and a green bow tie, and on his back a teal scaly shell dotted with small yellow spots, showing over both shoulders. Big pink clawed hands, big pink clawed feet with long white talons, and a long pink tail ending in a spiked ball like a mace. He carries a butterfly net on a long yellow pole with a round yellow hoop and a dark mesh bag. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C07 (file onemonster/game/assets/monsters/grithix/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K07 (file onemonster/game/assets/monsters/grithix/poses.png), and draw these at exactly the same scale. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right, standing upright, the net over his shoulder), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 6 poses: 1. Swinging the net straight up overhead. 2. Scooping the net low along the ground. 3. Striding along holding a letter up high in one hand, the net over his shoulder. 4. Ducking under a low branch, robe gathered. 5. Balancing on a log, arms and net out. 6. Stepping high over a root, robe lifted. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Adventure: backdrop panels

Three panels per board, shown one after another from left to right as the player travels, slowly, behind the action. The game blends each panel into the next where they meet, so the horizon sits at the same height across all three and the edges are quiet. The bottom of each panel is covered by the game's own ground, so it stays simple.

### OM-B01a · Board 1, Faddle Street: backdrop panel 1 of 3

- **File:** `onemonster/game/assets/adventure/b01/backdrop-1.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 1 (The Stamp-Collecting Trollusk), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the first (left) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 55% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (grass and the foot of hedges), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 1: the edge of a deep old wood where the Trollusk lives, gnarled trees with faces in their knots, a fallen log and ferns, opening out to the right onto a country lane under a pale lilac morning sky. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-B01b · Board 1, Faddle Street: backdrop panel 2 of 3

- **File:** `onemonster/game/assets/adventure/b01/backdrop-2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 1 (The Stamp-Collecting Trollusk), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the second (middle) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 55% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (grass and the foot of hedges), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 2: along the lane, a neighbour's cottage with a porch and a rocking chair, flowerbeds, a kennel by a garden gate, washing on a line, a dustbin, and gnarled trees; rolling green fields and a little farm far off. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-B01c · Board 1, Faddle Street: backdrop panel 3 of 3

- **File:** `onemonster/game/assets/adventure/b01/backdrop-3.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 1 (The Stamp-Collecting Trollusk), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the third (right) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 55% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (grass and the foot of hedges), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 3: Sally Ann's house, white clapboard with an upstairs window with curtains, a picket fence, hollyhocks, a big gnarled tree, and the grey rural mailbox with a red flag on its wooden post at the right; the road curving away over a hill where the mailman will come from. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-B02a · Board 2, Out of Nowhere: backdrop panel 1 of 3

- **File:** `onemonster/game/assets/adventure/b02/backdrop-1.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 2 (The Letter-Eating Bombanat), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the first (left) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 50% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (mossy wood floor), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 1: deep in the wood, looking through layers of gnarled trees with faces in their knots, tangled branches and leaf clusters, shafts of pale light and mauve sky between the treetops. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg .
```

### OM-B02b · Board 2, Out of Nowhere: backdrop panel 2 of 3

- **File:** `onemonster/game/assets/adventure/b02/backdrop-2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 2 (The Letter-Eating Bombanat), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the second (middle) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 50% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (mossy wood floor), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 2: the wood thins: tall trunks, hanging vines and big cobwebs between the branches, a hollow tree, a glade of ferns, and pink-and-lilac clouds through the canopy. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg .
```

### OM-B02c · Board 2, Out of Nowhere: backdrop panel 3 of 3

- **File:** `onemonster/game/assets/adventure/b02/backdrop-3.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 2 (The Letter-Eating Bombanat), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the third (right) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 50% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (mossy wood floor), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 3: the edge of the wood on a cliff, the trees opening onto a wide view of the glossy blue Ocean of Bubbley Goo far below, with a rocky coast, a windmill and a billboard with a blank board. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg .
```

### OM-B03a · Board 3, A Nice Bombanat Lunch: backdrop panel 1 of 3

- **File:** `onemonster/game/assets/adventure/b03/backdrop-1.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 3 (The Bombanat-Munching Grumley), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the first (left) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 35% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (under the goo, deep blue and teal fading darker), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 1: the Blue Ocean of Bubbley Goo seen side-on and cut away, as in a cross-section: lilac sky and curling clouds in the top third, the glossy goo surface across it, and below it the goo deep blue and teal with bubbles, shafts of light, and far-off rocks and weed; a rocky coast at the left. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg .
```

### OM-B03b · Board 3, A Nice Bombanat Lunch: backdrop panel 2 of 3

- **File:** `onemonster/game/assets/adventure/b03/backdrop-2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 3 (The Bombanat-Munching Grumley), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the second (middle) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 35% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (under the goo, deep blue and teal fading darker), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 2: the same cross-section out at sea: tall goo-weed forests and arches of rock below the surface, a sunken rowing boat, and in the sky a far-off fishing boat on the horizon. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg .
```

### OM-B03c · Board 3, A Nice Bombanat Lunch: backdrop panel 3 of 3

- **File:** `onemonster/game/assets/adventure/b03/backdrop-3.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 3 (The Bombanat-Munching Grumley), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the third (right) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 35% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (under the goo, deep blue and teal fading darker), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 3: the same cross-section near a little rocky island with a palm tree: rocks rising from the bottom, bubbles streaming up, and an orange evening sky above. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg .
```

### OM-B04a · Board 4, SCRUNNCCCHHH!!: backdrop panel 1 of 3

- **File:** `onemonster/game/assets/adventure/b04/backdrop-1.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 4 (The Furious-Floating Ice-Ferg), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the first (left) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 45% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (choppy grey-blue sea), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 1: the open northern sea seen side-on: a cold lilac sky with long streaky clouds, slate-blue sea to the horizon, distant icebergs and floes. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-B04b · Board 4, SCRUNNCCCHHH!!: backdrop panel 2 of 3

- **File:** `onemonster/game/assets/adventure/b04/backdrop-2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 4 (The Furious-Floating Ice-Ferg), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the second (middle) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 45% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (choppy grey-blue sea), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 2: rocky islands with sea birds, a lighthouse on a crag far off, low grey clouds and a shaft of pale sun on the sea. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-B04c · Board 4, SCRUNNCCCHHH!!: backdrop panel 3 of 3

- **File:** `onemonster/game/assets/adventure/b04/backdrop-3.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 4 (The Furious-Floating Ice-Ferg), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the third (right) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 45% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (choppy grey-blue sea), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 3: the coast ahead, a harbour town far off with houses, a church spire, a jetty and a breakwater with a lighthouse, the evening sky pink. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-B05a · Board 5, Suck It All Up: backdrop panel 1 of 3

- **File:** `onemonster/game/assets/adventure/b05/backdrop-1.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 5 (The Wild-'n-Windy Typhoonigator), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the first (left) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 62% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (stormy sea), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 1: a wide stormy sky over the Blue Ocean of Bubbley Goo, seen side-on: heavy lilac-and-grey clouds above, rain streaks, the goo sea rolling below to the horizon. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-B05b · Board 5, Suck It All Up: backdrop panel 2 of 3

- **File:** `onemonster/game/assets/adventure/b05/backdrop-2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 5 (The Wild-'n-Windy Typhoonigator), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the second (middle) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 62% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (stormy sea), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 2: the same sky and sea with sea cliffs and a lighthouse on a headland, a windmill on the cliff top, gulls far off. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-B05c · Board 5, Suck It All Up: backdrop panel 3 of 3

- **File:** `onemonster/game/assets/adventure/b05/backdrop-3.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 5 (The Wild-'n-Windy Typhoonigator), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the third (right) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 62% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (stormy sea), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 3: the storm breaking, gaps of pale morning sun, the sea further off and drained low, stranded boats on a bare sea floor, and the edge of Nowhere, bumpy brown land with palms and a blank signpost, at the right. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-B06a · Board 6, KER-PLOP: backdrop panel 1 of 3

- **File:** `onemonster/game/assets/adventure/b06/backdrop-1.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 6 (The Paper-Munching Yalapappus), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the first (left) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 55% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (bumpy ochre ground), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 1: the edge of Nowhere: palms, ferns and gnarled trees, curtains of blue goo dripping from the branches, a pale lilac morning sky streaked with the last storm clouds. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-B06b · Board 6, KER-PLOP: backdrop panel 2 of 3

- **File:** `onemonster/game/assets/adventure/b06/backdrop-2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 6 (The Paper-Munching Yalapappus), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the second (middle) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 55% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (bumpy ochre ground), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 2: deeper in, giant ferns, a tumbledown hut, a blank wooden signpost on a tree, and rolling hills with a winding road far off. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-B06c · Board 6, KER-PLOP: backdrop panel 3 of 3

- **File:** `onemonster/game/assets/adventure/b06/backdrop-3.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 6 (The Paper-Munching Yalapappus), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the third (right) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 55% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (bumpy ochre ground), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 3: a wide open space at the edge of Nowhere with nothing much in it, a few palms and boulders, the big sky above it full of the swollen storm cloud's shadow. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-B07a · Board 7, Just Passing By: backdrop panel 1 of 3

- **File:** `onemonster/game/assets/adventure/b07/backdrop-1.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 7 (The Stamp-Collecting Trollusk), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the first (left) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 55% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (bumpy ochre ground), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 1: the edge of Nowhere where the Yalapappus sits to munch: ferns, palms and rocks to hide behind, dripping goo, a lilac sky. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-and-yalapappus-running.jpg .
```

### OM-B07b · Board 7, Just Passing By: backdrop panel 2 of 3

- **File:** `onemonster/game/assets/adventure/b07/backdrop-2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 7 (The Stamp-Collecting Trollusk), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the second (middle) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 55% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (bumpy ochre ground), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 2: a long track through the jungle edge, palms bent, a blank crooked signpost, a stream, hills far off. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-and-yalapappus-running.jpg .
```

### OM-B07c · Board 7, Just Passing By: backdrop panel 3 of 3

- **File:** `onemonster/game/assets/adventure/b07/backdrop-3.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 7 (The Stamp-Collecting Trollusk), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the third (right) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 55% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (bumpy ochre ground), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 3: the jungle giving way to open grassy ground with a few scrubby bushes, a big sky, and a dark wood far off at the right. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-and-yalapappus-running.jpg .
```

### OM-B08a · Board 8, SNIP!: backdrop panel 1 of 3

- **File:** `onemonster/game/assets/adventure/b08/backdrop-1.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 8 (The Letter-Eating Bombanat), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the first (left) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 70% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (open grassy ground), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 1: a huge open sky over open grassy ground at the edge of Nowhere, towering pink-and-lilac clouds, the jungle edge far behind at the left. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-over-the-goo.jpg .
```

### OM-B08b · Board 8, SNIP!: backdrop panel 2 of 3

- **File:** `onemonster/game/assets/adventure/b08/backdrop-2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 8 (The Letter-Eating Bombanat), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the second (middle) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 70% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (open grassy ground), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 2: the same open sky with a few dark leftover rain clouds, a far-off line of hills, and a kite caught in a lone tree. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-over-the-goo.jpg .
```

### OM-B08c · Board 8, SNIP!: backdrop panel 3 of 3

- **File:** `onemonster/game/assets/adventure/b08/backdrop-3.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 8 (The Letter-Eating Bombanat), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the third (right) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 70% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (open grassy ground), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 3: the sky over the edge of a thick wood, gnarled treetops rising at the right, evening coming on. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-over-the-goo.jpg .
```

### OM-B09a · Board 9, FLIP-FLOP: backdrop panel 1 of 3

- **File:** `onemonster/game/assets/adventure/b09/backdrop-1.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 9 (The Bombanat-Collecting Grithix), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the first (left) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 50% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (mossy wood floor), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 1: the Grithix's wood: dense ferns and leaves, gnarled trees with faces in their knots, a cottage with a round door in a hollow tree far off, shelves of jars glimpsed through its window. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/back-cover-grithix.jpg .
```

### OM-B09b · Board 9, FLIP-FLOP: backdrop panel 2 of 3

- **File:** `onemonster/game/assets/adventure/b09/backdrop-2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 9 (The Bombanat-Collecting Grithix), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the second (middle) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 50% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (mossy wood floor), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 2: a wide mossy clearing in the wood with toadstools and a stream. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/back-cover-grithix.jpg .
```

### OM-B09c · Board 9, FLIP-FLOP: backdrop panel 3 of 3

- **File:** `onemonster/game/assets/adventure/b09/backdrop-3.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The far layer of board 9 (The Bombanat-Collecting Grithix), scrolled slowly behind the action.
- **Stand-in until delivered:** The chapter's scene painting, mirrored and scrolled.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Background panel for a side-scrolling children's game, wide 16:9, full bleed, in the style of a picture-book spread. It is the third (right) of three panels shown one after another from left to right behind the action as the player travels: keep the horizon at about 50% of the way down from the top, keep the left and right edges quiet (sky and distant land, nothing big cut by the edge) so the panels can be blended where they meet, and keep the bottom quarter simple (mossy wood floor), because the game draws its own ground, platforms and props in front of it. Empty of monsters, people and animals. Panel 3: the wood thinning into scrub, and at the right a little open space where the road comes in, with room for an official-looking mailbox in front. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/back-cover-grithix.jpg .
```

## Adventure: ground pieces

The walkable ground of each place, seen exactly side-on, cut into pieces the game lays end to end (mirroring every other copy so the joins match).

### OM-G01 · Ground pieces: Faddle Street

- **File:** `onemonster/game/assets/adventure/terrain/lane.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The ground, ledges and platforms of the boards in Faddle Street.
- **Stand-in until delivered:** Ground and ledges drawn in code with an ink outline.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate ground pieces for a side-scrolling game, all seen exactly side-on and drawn at the same scale, each one complete on its own with a crisp, solid silhouette and fully drawn ends: 1. A long strip of packed dirt lane with a grassy verge and little flowers along its top edge, about four times as wide as tall, its top edge level. 2. A short raised grassy bank with a rounded top, as a step up. 3. A stretch of white picket fence, side-on, six pickets long, its top rail level so it can be walked along. 4. A low brick garden wall with a flat top. 5. A wooden porch step with three stairs. 6. A dug flowerbed of dark soil with tulips and daisies, long and low. Lay them out one above the other in the order listed, each across the full width of the sheet except the small ones, with clear space between them. No labels. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-G02 · Ground pieces: the wood

- **File:** `onemonster/game/assets/adventure/terrain/wood.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The ground, ledges and platforms of the boards in the wood.
- **Stand-in until delivered:** Ground and ledges drawn in code with an ink outline.
- **Reference:** [`reference/endpapers.jpg`](../reference/endpapers.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate ground pieces for a side-scrolling game, all seen exactly side-on and drawn at the same scale, each one complete on its own with a crisp, solid silhouette and fully drawn ends: 1. A long strip of mossy wood floor with roots and tiny ferns along its top edge, about four times as wide as tall, its top edge level. 2. A thick gnarled branch reaching out sideways from the left, flat enough on top to stand on. 3. A fallen mossy log lying side-on. 4. A gnarled tree stump with a face in its knot, flat-topped. 5. A mound of roots and earth, as a rise in the ground. 6. A tall gnarled tree trunk with a face in its knots, cut off at the top and bottom of the cell. Lay them out one above the other in the order listed, each across the full width of the sheet except the small ones, with clear space between them. No labels. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/endpapers.jpg .
```

### OM-G03 · Ground pieces: the Blue Ocean of Bubbley Goo

- **File:** `onemonster/game/assets/adventure/terrain/goo.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The ground, ledges and platforms of the boards in the Blue Ocean of Bubbley Goo.
- **Stand-in until delivered:** Ground and ledges drawn in code with an ink outline.
- **Reference:** [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate ground pieces for a side-scrolling game, all seen exactly side-on and drawn at the same scale, each one complete on its own with a crisp, solid silhouette and fully drawn ends: 1. A long strip of the goo's surface seen side-on: glossy blue and teal waves with bubbles, about four times as wide as tall, its top edge the wavy surface and the goo continuing to the bottom edge. 2. A long strip of the goo's bottom: dark blue sand and pebbles with weed, about four times as wide as tall. 3. A tall knobbly rock rising from the bottom, side-on. 4. A rocky island sticking up out of the goo, with a few tufts of grass on top. 5. A tall swaying clump of goo-weed. 6. A sunken bathtub on its side, half buried. Lay them out one above the other in the order listed, each across the full width of the sheet except the small ones, with clear space between them. No labels. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-over-the-goo.jpg .
```

### OM-G04 · Ground pieces: the open sea

- **File:** `onemonster/game/assets/adventure/terrain/sea.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The ground, ledges and platforms of the boards in the open sea.
- **Stand-in until delivered:** Ground and ledges drawn in code with an ink outline.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate ground pieces for a side-scrolling game, all seen exactly side-on and drawn at the same scale, each one complete on its own with a crisp, solid silhouette and fully drawn ends: 1. A long strip of choppy slate-blue sea seen side-on, curling waves along its top edge, about four times as wide as tall, the water continuing to the bottom edge. 2. A jagged sea rock sticking up out of the water, side-on. 3. A long wooden pier on stilts, side-on. 4. A stone harbour wall with a little lighthouse on its end, side-on. 5. A flat drifting ice floe, side-on. 6. A low stone bridge arch, side-on. Lay them out one above the other in the order listed, each across the full width of the sheet except the small ones, with clear space between them. No labels. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-G05 · Ground pieces: the edge of Nowhere

- **File:** `onemonster/game/assets/adventure/terrain/nowhere.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The ground, ledges and platforms of the boards in the edge of Nowhere.
- **Stand-in until delivered:** Ground and ledges drawn in code with an ink outline.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate ground pieces for a side-scrolling game, all seen exactly side-on and drawn at the same scale, each one complete on its own with a crisp, solid silhouette and fully drawn ends: 1. A long strip of bumpy ochre ground with tufts of grass and pebbles along its top edge, about four times as wide as tall, its top edge level. 2. A grassy slope rising from left to right, side-on. 3. A grassy slope falling from left to right, side-on. 4. A hole in the ground seen side-on: the left edge of it. 5. The right edge of the same hole. 6. A big flat-topped boulder, side-on. 7. A curtain of blue goo dripping from a branch, long and hanging. 8. A palm tree, side-on, its trunk curving. Lay them out one above the other in the order listed, each across the full width of the sheet except the small ones, with clear space between them. No labels. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

## Adventure: board props

The obstacles, hazards, creatures, platforms and collectibles of each board, one sheet per board. The game cuts each sheet into single sprites on integration.

### OM-Y01 · Board 1, Faddle Street: props

- **File:** `onemonster/game/assets/adventure/b01/props.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The obstacles, hazards, creatures and collectibles of board 1.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites for a side-scrolling game, all seen side-on, each one complete on its own and drawn at the same scale as the others: 1. A red postage stamp with a scalloped edge, fluttering. 2. A blue postage stamp with a scalloped edge, spinning. 3. A garden sprinkler on a spike, side-on. 4. A tin dustbin with its lid on, side-on. 5. A dustbin lid lying flat, as a springboard. 6. A scruffy little dog asleep in front of a wooden kennel. 7. The same dog awake, barking, straining on a rope. 8. The same dog running, ears flapping. 9. A garden gnome with a fishing rod. 10. A wheelbarrow full of flowerpots, side-on. 11. A round leafy hedge bush to hide in. 12. A wooden signpost with a blank board, side-on. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-Y02 · Board 2, Out of Nowhere: props

- **File:** `onemonster/game/assets/adventure/b02/props.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The obstacles, hazards, creatures and collectibles of board 2.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites for a side-scrolling game, all seen side-on, each one complete on its own and drawn at the same scale as the others: 1. A torn old ticket, fluttering. 2. A folded paper hat, fluttering. 3. A crumpled newspaper page, blowing. 4. A paper menu, flapping. 5. A red bird in flight, cross, beak open. 6. The same red bird perched. 7. A big cobweb strung between two twigs. 8. A hanging vine with leaves. 9. A gust of wind drawn as curling strokes and blown leaves. 10. A hollow log with a dark opening, side-on. 11. A low bush, round and leafy. 12. A tree knot face blowing out its cheeks. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg .
```

### OM-Y03 · Board 3, A Nice Bombanat Lunch: props

- **File:** `onemonster/game/assets/adventure/b03/props.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The obstacles, hazards, creatures and collectibles of board 3.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites for a side-scrolling game, all seen side-on, each one complete on its own and drawn at the same scale as the others: 1. A plain mauve bat-winged Bombanat in flight, with no necktie and no cap. 2. The same plain Bombanat, wings up. 3. A scowling fish, side-on. 4. A giant eye in the goo, open, with a lid. 5. The same giant eye shut. 6. A long tentacle curling up from below. 7. A heavy ship's anchor on a chain, falling. 8. A fishing net hanging down on a rope, open. 9. A whirlpool in the goo, seen side-on as a swirling funnel. 10. A big wobbly goo bubble, glossy. 11. A wicker picnic basket, lid open. 12. A shark fin cutting through the surface. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg .
```

### OM-Y04 · Board 4, SCRUNNCCCHHH!!: props

- **File:** `onemonster/game/assets/adventure/b04/props.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The obstacles, hazards, creatures and collectibles of board 4.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites for a side-scrolling game, all seen side-on, each one complete on its own and drawn at the same scale as the others: 1. An olive-yellow whiskered sea lion lounging, side-on. 2. The same sea lion sitting up, clapping its flippers. 3. The same sea lion sliding off, flippers up. 4. A wooden crate floating. 5. A red-and-white buoy, bobbing. 6. A barrel floating. 7. A small tugboat with a funnel, side-on. 8. The captain's fishing boat, the Peg, side-on, sailing right: a stout teal hull with portholes, a wooden wheelhouse and a crane with a net. 9. A seagull, wings spread. 10. A puff of freezing mist. 11. A warm current drawn as wavy orange-pink streaks in the water. 12. A burst of ice shards and spray. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-Y05 · Board 5, Suck It All Up: props

- **File:** `onemonster/game/assets/adventure/b05/props.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The obstacles, hazards, creatures and collectibles of board 5.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites for a side-scrolling game, all seen side-on, each one complete on its own and drawn at the same scale as the others: 1. The captain's glass bottle, corked, with a red-and-white label and a rolled note inside, bobbing upright. 2. A plain green bottle, bobbing. 3. A plain brown bottle, bobbing. 4. A silver fish leaping. 5. A pink rubber raft with three hooded sailors paddling and an S.O.S. flag, side-on. 6. The captain in the raft reaching out with a boat hook. 7. A windmill, side-on, sails turning. 8. A flock of gulls. 9. A shaft of sunlight breaking through the cloud. 10. A dark little rain cloud. 11. A lighthouse on a rock. 12. A blob of blue goo, flying. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-Y06 · Board 6, KER-PLOP: props

- **File:** `onemonster/game/assets/adventure/b06/props.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The obstacles, hazards, creatures and collectibles of board 6.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites for a side-scrolling game, all seen side-on, each one complete on its own and drawn at the same scale as the others: 1. A torn scrap of paper. 2. A paper menu. 3. A crumpled newspaper. 4. A paper bag. 5. A small fishing boat falling, side-on, upside down. 6. A fish falling, flapping. 7. A falling blob of blue goo. 8. The captain's bottle falling, red-and-white label. 9. A little pink octopus, waving. 10. A grumpy toad, side-on. 11. A bush full of paper scraps caught in its leaves. 12. A round shadow on the ground (a soft dark ellipse). Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-Y07 · Board 7, Just Passing By: props

- **File:** `onemonster/game/assets/adventure/b07/props.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The obstacles, hazards, creatures and collectibles of board 7.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites for a side-scrolling game, all seen side-on, each one complete on its own and drawn at the same scale as the others: 1. A red postage stamp with a scalloped edge, fluttering. 2. A green postage stamp with a scalloped edge, spinning. 3. A big fern clump to hide behind. 4. A round grey rock. 5. A low branch hanging across the path. 6. A puddle of goo on the ground, side-on. 7. A crooked signpost with two blank boards pointing opposite ways. 8. A fallen palm trunk across the path. 9. A pile of munched paper scraps. 10. A stream with stepping stones, side-on. 11. A scrubby bush. 12. A cloud of dust kicked up. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-and-yalapappus-running.jpg .
```

### OM-Y08 · Board 8, SNIP!: props

- **File:** `onemonster/game/assets/adventure/b08/props.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The obstacles, hazards, creatures and collectibles of board 8.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites for a side-scrolling game, all seen side-on, each one complete on its own and drawn at the same scale as the others: 1. A torn scrap of paper fluttering. 2. A rolled scrap of note, scribbled (no readable words). 3. A rising warm air current drawn as wavy upward strokes. 4. A dark rain cloud, raining. 5. A flying fork. 6. A flying rock. 7. A flying blob of goo. 8. A crow in flight. 9. A butterfly net on a yellow pole poking up out of a bush. 10. A kite with a tail, side-on. 11. A scrubby bush. 12. A lone bent tree. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-over-the-goo.jpg .
```

### OM-Y09 · Board 9, FLIP-FLOP: props

- **File:** `onemonster/game/assets/adventure/b09/props.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The obstacles, hazards, creatures and collectibles of board 9.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/back-cover-grithix.jpg`](../reference/back-cover-grithix.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites for a side-scrolling game, all seen side-on, each one complete on its own and drawn at the same scale as the others: 1. A plain mauve bat-winged Bombanat fluttering, no necktie and no cap. 2. A glass collecting jar with a cork, empty. 3. The same jar with a small angry Bombanat inside. 4. A gnarled root arching out of the ground, to trip over. 5. A big toadstool, flat-topped, to bounce on. 6. A gap in the ground with a little stream at the bottom, side-on. 7. A clump of ferns to hide in. 8. A fallen log. 9. The official-looking mailbox: a squat riveted grey-mauve metal box with an arched top and a mail slot. 10. A low branch. 11. A pile of rocks. 12. A hollow stump. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/back-cover-grithix.jpg .
```

## How to play pages

Three small spot illustrations per minigame, shown side by side on the page before it starts, each with a numbered caption the game writes underneath: what you do first, the danger to watch for, and how you win. Draw the characters from their model sheets (attach them), clear and simple enough to read small.

### OM-H1a · Chapter 1: how to play, step 1

- **File:** `onemonster/game/assets/howto/ch01-1.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 1 of chapter 1's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Trollusk tiptoeing along a country lane from one round leafy bush toward the next, a dotted line of little footprints showing the way, a picket fence behind. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-H1b · Chapter 1: how to play, step 2

- **File:** `onemonster/game/assets/howto/ch01-2.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 2 of chapter 1's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Trollusk ducked down in a flowerbed, only his checked hat showing, while a plump old lady in a rocking chair on her porch opens one eye and peers over her spectacles. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-H1c · Chapter 1: how to play, step 3

- **File:** `onemonster/game/assets/howto/ch01-3.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 3 of chapter 1's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Trollusk on tiptoe pulling a white envelope out of a grey rural mailbox with a red flag, while far down the road a little mailman on a motorcycle putters closer. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-H2a · Chapter 2: how to play, step 1

- **File:** `onemonster/game/assets/howto/ch02-1.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 1 of chapter 2's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Bombanat flapping over a wood, looking down at the Trollusk running along the ground below with a white envelope in his snout. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg .
```

### OM-H2b · Chapter 2: how to play, step 2

- **File:** `onemonster/game/assets/howto/ch02-2.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 2 of chapter 2's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Trollusk hiding in a leafy bush, only his hat showing, while the Bombanat hovers just above the bush, peering in. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg .
```

### OM-H2c · Chapter 2: how to play, step 3

- **File:** `onemonster/game/assets/howto/ch02-3.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 3 of chapter 2's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Bombanat diving steeply onto the running Trollusk and snapping the envelope out of his snout with its long toothy jaws. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/bombanat-and-pony-express-boy.jpg .
```

### OM-H3a · Chapter 3: how to play, step 1

- **File:** `onemonster/game/assets/howto/ch03-1.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 1 of chapter 3's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: Only the Grumley's crown of horns and round spectacles poking above the glossy blue goo, watching Bombanats flying overhead. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg .
```

### OM-H3b · Chapter 3: how to play, step 2

- **File:** `onemonster/game/assets/howto/ch03-2.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 2 of chapter 3's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: Among several plain Bombanats, one with a red-and-white striped necktie and a white envelope in its teeth dipping low over the goo. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg .
```

### OM-H3c · Chapter 3: how to play, step 3

- **File:** `onemonster/game/assets/howto/ch03-3.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 3 of chapter 3's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/grumley-in-the-goo.jpg`](../reference/grumley-in-the-goo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Grumley's long spiny crab arm shooting up out of the goo in a splash and grabbing the Bombanat in the striped necktie. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grumley-in-the-goo.jpg .
```

### OM-H4a · Chapter 4: how to play, step 1

- **File:** `onemonster/game/assets/howto/ch04-1.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 1 of chapter 4's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: Seen from above, the craggy Ice-Ferg with sea lions on its ledges drifting along a curving current drawn as foam arrows on the sea. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-H4b · Chapter 4: how to play, step 2

- **File:** `onemonster/game/assets/howto/ch04-2.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 2 of chapter 4's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Ice-Ferg huffing itself up, swelling, freezing mist pouring off it, its one eye narrowing in fury. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-H4c · Chapter 4: how to play, step 3

- **File:** `onemonster/game/assets/howto/ch04-3.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 3 of chapter 4's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Ice-Ferg charging into the side of a stout teal fishing boat with a wheelhouse and a crane, SCRUNCH, spray and ice flying, a harbour with a lighthouse in the distance. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-18-19-ice-ferg.png .
```

### OM-H5a · Chapter 5: how to play, step 1

- **File:** `onemonster/game/assets/howto/ch05-1.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 1 of chapter 5's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Typhoonigator, a storm cloud with a face and big pink lips, rolling across the sky over the sea, its water spout dangling down to the waves. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-H5b · Chapter 5: how to play, step 2

- **File:** `onemonster/game/assets/howto/ch05-2.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 2 of chapter 5's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: Fish, plain green and brown bottles and blobs of goo spiralling up the spout as the Typhoonigator sucks hard, cheeks hollow. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-H5c · Chapter 5: how to play, step 3

- **File:** `onemonster/game/assets/howto/ch05-3.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 3 of chapter 5's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: Among the plain bottles, one glass bottle with a red-and-white label and a rolled note inside, being sucked up the spout, the Typhoonigator delighted. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-H6a · Chapter 6: how to play, step 1

- **File:** `onemonster/game/assets/howto/ch06-1.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 1 of chapter 6's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Yalapappus at the edge of Nowhere looking up at the swollen storm cloud overhead as fish, a little boat and blobs of goo fall, round shadows on the ground below each. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-H6b · Chapter 6: how to play, step 2

- **File:** `onemonster/game/assets/howto/ch06-2.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 2 of chapter 6's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Yalapappus hopping aside, napkin flapping, as a small fishing boat crashes down where he was. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-H6c · Chapter 6: how to play, step 3

- **File:** `onemonster/game/assets/howto/ch06-3.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 3 of chapter 6's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: A glass bottle with a red-and-white label landing KER-PLOP on the Yalapappus's head and breaking, a rolled note falling out, which he munches gleefully. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-H7a · Chapter 7: how to play, step 1

- **File:** `onemonster/game/assets/howto/ch07-1.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 1 of chapter 7's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/trollusk-snatches-from-yalapappus.jpg`](../reference/trollusk-snatches-from-yalapappus.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Trollusk creeping up behind the Yalapappus, who sits munching paper with a white envelope on his fork, at the edge of Nowhere. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-snatches-from-yalapappus.jpg .
```

### OM-H7b · Chapter 7: how to play, step 2

- **File:** `onemonster/game/assets/howto/ch07-2.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 2 of chapter 7's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/trollusk-snatches-from-yalapappus.jpg`](../reference/trollusk-snatches-from-yalapappus.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Yalapappus turning round to look while the Trollusk freezes behind a leafy twig held up as a disguise. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-snatches-from-yalapappus.jpg .
```

### OM-H7c · Chapter 7: how to play, step 3

- **File:** `onemonster/game/assets/howto/ch07-3.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 3 of chapter 7's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/trollusk-snatches-from-yalapappus.jpg`](../reference/trollusk-snatches-from-yalapappus.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Trollusk running away with the envelope in his snout, stamps flying from his bag, the Yalapappus trundling after him with knife and fork. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-snatches-from-yalapappus.jpg .
```

### OM-H8a · Chapter 8: how to play, step 1

- **File:** `onemonster/game/assets/howto/ch08-1.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 1 of chapter 8's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Bombanat flying high over open ground, the Trollusk running below with the envelope and the Yalapappus stomping behind him. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-and-yalapappus-running.jpg .
```

### OM-H8b · Chapter 8: how to play, step 2

- **File:** `onemonster/game/assets/howto/ch08-2.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 2 of chapter 8's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Bombanat swerving away from the Yalapappus's big swiping paw reaching up at it. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-and-yalapappus-running.jpg .
```

### OM-H8c · Chapter 8: how to play, step 3

- **File:** `onemonster/game/assets/howto/ch08-3.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 3 of chapter 8's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/trollusk-and-yalapappus-running.jpg`](../reference/trollusk-and-yalapappus-running.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Bombanat swooping down and snipping the envelope out of the running Trollusk's snout. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/trollusk-and-yalapappus-running.jpg .
```

### OM-H9a · Chapter 9: how to play, step 1

- **File:** `onemonster/game/assets/howto/ch09-1.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 1 of chapter 9's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/grithix-nets-bombanat-page.jpg`](../reference/grithix-nets-bombanat-page.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Grithix swinging his butterfly net at the Bombanat fluttering past in a woodland clearing. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grithix-nets-bombanat-page.jpg .
```

### OM-H9b · Chapter 9: how to play, step 2

- **File:** `onemonster/game/assets/howto/ch09-2.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 2 of chapter 9's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/grithix-nets-bombanat-page.jpg`](../reference/grithix-nets-bombanat-page.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Grithix striding along holding the envelope, stepping round the Trollusk who pops out of the ferns trying to trip him. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grithix-nets-bombanat-page.jpg .
```

### OM-H9c · Chapter 9: how to play, step 3

- **File:** `onemonster/game/assets/howto/ch09-3.webp`
- **Size:** 1024 x 768, opaque
- **Used for:** Step 3 of chapter 9's how-to-play page.
- **Stand-in until delivered:** The step composed in code from the monster's poses and the chapter's props.
- **Reference:** [`reference/grithix-nets-bombanat-page.jpg`](../reference/grithix-nets-bombanat-page.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A small spot illustration for a children's game's how-to-play page, 4:3, on plain warm cream paper that the drawing fades into at the edges (no frame, no border), in the style of the book's own spot illustrations. One clear moment, the characters large and easy to read when shown small: The Grithix dropping the envelope into the slot of a squat riveted grey-mauve official-looking mailbox, very pleased. Draw the characters from their canonical model sheets where you have them. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/grithix-nets-bombanat-page.jpg .
```

## Minigame audit: extra sprites

Sprites the audit of the minigames found missing: plain Bombanats for the flocks (the delivered poses all wear the necktie and carry the letter), the Ice-Ferg without its sea lions with the sea lions on their own (so the count on the ice can change), and the end wall of Sally Ann's house for chapter 1.

### OM-Z01 · Plain Bombanats (no necktie, no letter)

- **File:** `onemonster/game/assets/monsters/bombanat/plain.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The ordinary Bombanats in the flocks of chapter 3 and boards 3 and 9, so the one with the letter stands out.
- **Stand-in until delivered:** The delivered poses with a filter, or a drawn stand-in.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg), [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, as in the book: a small, dark, shaggy body with huge lilac-mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a red striped cap with a little yellow propeller on top, a red-and-white striped necktie, clawed pink feet and a thin curling pink tail. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only.) Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K02 (file onemonster/game/assets/monsters/bombanat/poses.png), and draw these at exactly the same scale. The same Bombanat design but an ordinary one of its kind: NO necktie, NO cap or propeller, NO letter, slightly duller grey-brown fur and greyer mauve wings, otherwise identical in shape and scale. The 8 drawings: 1. Gliding, wings spread level. 2. Flapping, wings at the top of the stroke. 3. Flapping, wings at the bottom of the stroke. 4. Swooping down in a steep dive, wings swept back. 5. Grabbed from below, wriggling and flapping wildly. 6. Tangled in a butterfly net, wings crumpled. 7. Perched with the wings folded. 8. Stalling in a frantic flutter. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-Z02 · Ice-Ferg without sea lions

- **File:** `onemonster/game/assets/monsters/iceferg/bare.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Chapter 4 and board 4: the Ice-Ferg drawn without its sea lions, which the game places on its ledges one by one.
- **Stand-in until delivered:** The delivered poses with a filter, or a drawn stand-in.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png), [`reference/ice-ferg-seals-detail.jpg`](../reference/ice-ferg-seals-detail.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg, as on the book's pages 18-19: a huge, craggy iceberg built of great cracked slabs and blocks of ice, pale lilac-white and pale blue, drawn in fine ink with crosshatched shadows, jagged icicles hanging from its ledges, and deep cracks between the slabs; in a crevice in the middle of it, a single small, dark, beady eye glares out, the only sign that it is alive and in a terrible temper. A couple of olive-yellow whiskered sea lions lounge on its ledges. Choppy dark sea drawn as rows of curling strokes laps round its base. (Use this description for the design only.) Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K04 (file onemonster/game/assets/monsters/iceferg/poses.png), and draw these at exactly the same scale. Exactly the same iceberg as in its key poses, same view and scale, but with NO sea lions on it: its ledges empty and flat enough for sea lions to sit on. The 4 drawings: 1. Floating calmly, drifting. 2. Huffing itself up, swelling, freezing mist pouring off it, the eye narrowed. 3. Charging forward, spray bursting off the front. 4. Seen exactly side-on facing right, floating. Lay them out in a grid of 2 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-Z03 · The Ice-Ferg's sea lions

- **File:** `onemonster/game/assets/monsters/iceferg/sealions.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The sea lions on the Ice-Ferg's ledges in chapter 4 and board 4, reacting to what it does.
- **Stand-in until delivered:** The delivered poses with a filter, or a drawn stand-in.
- **Reference:** [`reference/pages-18-19-ice-ferg.png`](../reference/pages-18-19-ice-ferg.png), [`reference/ice-ferg-seals-detail.jpg`](../reference/ice-ferg-seals-detail.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg, as on the book's pages 18-19: a huge, craggy iceberg built of great cracked slabs and blocks of ice, pale lilac-white and pale blue, drawn in fine ink with crosshatched shadows, jagged icicles hanging from its ledges, and deep cracks between the slabs; in a crevice in the middle of it, a single small, dark, beady eye glares out, the only sign that it is alive and in a terrible temper. A couple of olive-yellow whiskered sea lions lounge on its ledges. Choppy dark sea drawn as rows of curling strokes laps round its base. (Use this description for the design only.) Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach its key-poses sheet, request OM-K04 (file onemonster/game/assets/monsters/iceferg/poses.png), and draw these at exactly the same scale. The olive-yellow whiskered sea lions that lounge on the Ice-Ferg's ledges, alone, at the same scale and view as in its key poses, each pose a single sea lion: The 6 drawings: 1. Dozing, lying on its belly. 2. Sitting up in alarm, whiskers bristling. 3. Clinging on with its flippers, eyes shut tight. 4. Sliding off backwards, flippers up. 5. Clapping its flippers. 6. Falling with a splash. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-Z04 · Sally Ann's house, the end wall with her window

- **File:** `onemonster/game/assets/props/sallyann-house.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Chapter 1: the gable end of Sally Ann's house rising behind the hedge, Sally Ann (a cast sprite) at its window.
- **Stand-in until delivered:** The wall drawn in ink in code.
- **Reference:** [`reference/pages-06-07-sally-ann-and-mailbox.jpg`](../reference/pages-06-07-sally-ann-and-mailbox.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A single game sprite: the gable end wall of a small white clapboard country house seen straight on, with a steep shingled roof edge, a brick chimney, and in the middle of the wall one open sash window with gathered curtains and a window box of red geraniums. The window opening itself is EMPTY and transparent (the game draws a girl in it), and the bottom of the wall fades out into nothing (a hedge hides it in the game). Nothing else. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-06-07-sally-ann-and-mailbox.jpg .
```

### OM-Z05 · Board 7: a fallen palm propped up to slide under

- **File:** `onemonster/game/assets/adventure/b07/palm-arch.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Board 7's slide-under obstacle: the Trollusk belly-slides through the gap beneath it.
- **Stand-in until delivered:** The flat fallen palm (OM-Y07 item 8) with a drawn gap.
- **Reference:** [`reference/yalapappus-bottle-on-head.jpg`](../reference/yalapappus-bottle-on-head.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A single side-on game sprite: a fallen palm trunk lying across a jungle path, its root end propped up on a mossy boulder at the left and its crown of fronds resting on a low stump at the right, so there is a clear empty gap beneath the trunk along its whole length, about a third of the trunk's height off the ground. Ringed palm bark, a splintered broken end, a few dry brown fronds. Nothing under the trunk. Wide landscape composition. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/yalapappus-bottle-on-head.jpg .
```

### OM-Z06 · Board 5: windmill tower and sails, separate

- **File:** `onemonster/game/assets/adventure/b05/windmill.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Board 5's windmills: the sails turn on the tower and chop puffs off the Typhoonigator.
- **Stand-in until delivered:** The delivered windmill with painted sails (OM-Y05 item 7); the chop zone is a disc round the hub.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Two separate game sprites side by side, side-on, at the same scale, with plenty of clear space between them. On the left: an old stone windmill tower with a shingled cap, standing on a small rocky island with waves at its foot, WITHOUT any sails: only the round hub on the front of the cap. On the right: the four wooden lattice sails alone, as one cross-shaped piece seen face-on, their hub exactly in the centre of the image, so the game can spin them about that centre. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-Z07 · Board 3: fishing boats on the goo, side-on

- **File:** `onemonster/game/assets/adventure/b03/boats.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Board 3's fishing grounds: boats on the surface that drop anchors and nets on the Grumley.
- **Stand-in until delivered:** Boats drawn in code.
- **Reference:** [`reference/pages-16-17-grumley-netted.jpg`](../reference/pages-16-17-grumley-netted.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Two separate game sprites side by side, both seen exactly side-on facing right, at the same scale, floating, the waterline straight along their bottom with only a little foam: 1. a stout teal fishing boat with planked hull, portholes, a wooden wheelhouse and a crate of fish on deck, like the Peg in the book; 2. a slightly smaller brick-red fishing boat with a tall crane and a net hanging from it, a bearded fisherman at the rail. The roofs of the wheelhouses flat enough for a small bat-winged creature to perch on. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/pages-16-17-grumley-netted.jpg .
```

### OM-Z08 · Plain Bombanat perched, without a branch

- **File:** `onemonster/game/assets/monsters/bombanat/plain-perched.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Plain Bombanats perched on boat roofs, rocks and the island (boards 3 and 9).
- **Stand-in until delivered:** Plain Bombanat pose 7, which is drawn on a leafy branch.
- **Reference:** [`reference/bombanat-and-pony-express-boy.jpg`](../reference/bombanat-and-pony-express-boy.jpg), [`reference/bombanat-over-the-goo.jpg`](../reference/bombanat-over-the-goo.jpg), [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, as in the book: a small, dark, shaggy body with huge lilac-mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a red striped cap with a little yellow propeller on top, a red-and-white striped necktie, clawed pink feet and a thin curling pink tail. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only.) Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Also attach the plain Bombanats sheet, request OM-Z01 (file onemonster/game/assets/monsters/bombanat/plain.png), and match it: an ordinary Bombanat with NO necktie, NO cap or propeller and NO letter, duller grey-brown fur. A single sprite: perched with the wings folded, gripping with its clawed feet, side view facing right, standing on NOTHING (no branch, no ground), its feet level at the bottom of the drawing, at the same scale as the plain Bombanats sheet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-Z09 · Wood: a tall trunk column, with and without a hollow

- **File:** `onemonster/game/assets/adventure/terrain/trunks.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Boards 2 and 9: tree trunks that rise from the floor out of the top of the frame (board 2's Bombanat flies through the hollow).
- **Stand-in until delivered:** Trunks drawn in code.
- **Reference:** [`reference/endpapers.jpg`](../reference/endpapers.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Two separate game sprites side by side, each a straight-ish section of a gnarled old tree trunk seen side-on, bark only (no branches, no leaves, no roots, no ground), cut off flat at the top and the bottom so it tiles vertically, about four times as tall as wide, with deep bark furrows, a knot or two and moss patches: 1. a plain trunk section; 2. the same trunk with a large dark oval hollow right through it in the middle, big enough for a bat-winged creature to fly through, its lower lip flat enough to perch on. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/endpapers.jpg .
```
