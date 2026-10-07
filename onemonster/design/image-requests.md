# One Monster After Another: image requests

Artwork for the One Monster After Another game in `onemonster/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `onemonster/game/src/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.
2. Save each image under the file name in its **File** line and drop it in `onemonster/intake/`. On integration it moves to that path under `onemonster/game/`, its status flips to `delivered` and the game loads it in place of its stand-in.
3. Every sprite needs transparency (all the `.png` files). If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.
4. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.
5. Nothing here blocks the game: every image has a stand-in drawn in code until it arrives.
6. Each request names a reference photo of the book in `onemonster/reference/`, and its prompt links to it. Give that photo to the image generator along with the prompt where it can take an image; the prompt's link works once the photo is on `main`.
7. **Canonical first.** Each monster has five requests. Make its model sheet (`OM-C`) first and settle the design there, from the book's reference photo. Then make the other four (portrait `OM-M`, parts `OM-R`, swaps `OM-F`, key poses `OM-K`) with the model sheet attached, so every image of the monster is the same monster. Do the same for the people (`OM-C08`, then `OM-K08`). If a later image drifts from the sheet, regenerate it rather than the sheet.
8. **The sprites are cut-out rigs.** The parts sheet takes the monster apart (wings, jaw, ears, limbs, cap, net) and the game moves and rotates each piece on its own, so the animation is smooth at any frame rate without drawing every frame. The swaps sheet holds the shapes rotation cannot make (a wing at the top of its beat, an open jaw, a blink), swapped in for a frame or two. The key poses are the targets the animations are fitted to, and the stills of each hand-off. Pieces must be at the same scale as the model sheet's master view and laid out in the grid and order the prompt gives; the pieces are cut apart and named in that order on integration, and their pivots are fitted then.
9. If a generator struggles with a whole sheet, split it: make the first half of the list and the second half as two images, saved as `parts-1.png` and `parts-2.png` (and so on), each in the same order and at the same scale.
10. Some monsters (the Ice-Ferg, the Yalapappus, the Grithix) are not in any photo we have, and their designs are ours; their model sheets say so under **Note**. If you can look at the book (the Internet Archive lends a scan), adjust those prompts to match first.
11. Order of work: the model sheets, then the portraits, then the parts and swaps, then the key poses, props, scenes and story pages. The game keeps its stand-ins for anything not yet delivered.

## Status

59 requested, 0 delivered, 59 in total.

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

## Stamp-Collecting Trollusk

Chapter 1, Before the Mailman Comes, the sneaking game. Make the model sheet (OM-C01) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: idle breathing, the tiptoe sneak cycle, ducking, the fright and scuttle back, the grab, the gabbling run cycle, being snatched from, wailing.

### OM-C01 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/trollusk/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as on the book's cover: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a squashed blue-grey cap and a yellow bib lettered STAMPS across his chest (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest with a smirk on his snout. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: side view facing right, standing on his two short legs, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view, a back view, and a three-quarter view facing right. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M01 · Portrait

- **File:** `onemonster/game/assets/monsters/trollusk/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 1 and the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as on the book's cover: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a squashed blue-grey cap and a yellow bib lettered STAMPS across his chest (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest with a smirk on his snout. Draw it from this character's canonical model sheet, request OM-C01 (file onemonster/game/assets/monsters/trollusk/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R01 · Sprite parts

- **File:** `onemonster/game/assets/monsters/trollusk/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in Before the Mailman Comes, the sneaking game and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as on the book's cover: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a squashed blue-grey cap and a yellow bib lettered STAMPS across his chest (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest with a smirk on his snout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C01 (file onemonster/game/assets/monsters/trollusk/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, side view facing right, standing on his two short legs, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 13 pieces: 1. The torso with the yellow STAMPS bib, no head, arms or legs. 2. The head with the cap, the far ear, the eyes and the upper snout with its tusk, but no lower jaw and no near ear. 3. The lower jaw, mouth closed in a smirk. 4. The near ear. 5. The near upper arm. 6. The near forearm and open clawed hand. 7. The far upper arm. 8. The far forearm and open clawed hand. 9. The near thigh. 10. The near shin and foot. 11. The far thigh. 12. The far shin and foot. 13. The blue-grey cap alone, so it can bounce and fly off. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F01 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/trollusk/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as on the book's cover: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a squashed blue-grey cap and a yellow bib lettered STAMPS across his chest (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest with a smirk on his snout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C01 (file onemonster/game/assets/monsters/trollusk/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (side view facing right, standing on his two short legs), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R01; attach it too where you can. The 9 pieces: 1. The lower jaw dropped wide open, gabbling. 2. The lower jaw clenched in a toothy grin. 3. The eye area only, eyes half-lidded and sly. 4. The eye area only, eyes wide and alarmed. 5. The eye area only, eyes shut (a blink). 6. The near hand pinching, as if holding the corner of a letter (no letter drawn). 7. The near hand clenched in a fist. 8. The near foot on tiptoe. 9. The whole head turned to face the viewer, startled, as when he is caught. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K01 · Key poses

- **File:** `onemonster/game/assets/monsters/trollusk/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Stamp-Collecting Trollusk, as on the book's cover: a squat, shaggy monster covered in long dark-brown fur, with a long pink pig-like snout, one white tusk, big pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a squashed blue-grey cap and a yellow bib lettered STAMPS across his chest (the only lettering allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest with a smirk on his snout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C01 (file onemonster/game/assets/monsters/trollusk/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right, standing on his two short legs), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 10 poses: 1. Standing idle, smug. 2. Sneaking on tiptoe, near leg forward. 3. Sneaking on tiptoe, far leg forward. 4. Ducked down low in a crouch, curled up small to hide, only the cap and snout showing above his back. 5. Reaching up high with both hands to grab. 6. Gabbling away at a run, near leg forward, a letter clamped in his snout. 7. Gabbling away at a run, both feet off the ground. 8. Jolted in surprise as something snatches from above, cap flying off. 9. Scuttling back in a fright, arms flung up. 10. Sitting and wailing, head thrown back. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Letter-Eating Bombanat

Chapter 2, Over the Bubbley Goo, the flying game. Make the model sheet (OM-C02) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: the flap cycle, gliding, diving and swooping, the snap, landing, goo-stuck flapping, struggling when grabbed, netted.

### OM-C02 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/bombanat/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, the bat-winged flier on the book's cover: huge mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a tuft of dark fur on the chest, a red-and-white striped necktie, a pink striped cap with a yellow flower on top, and clawed pink feet. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: side view facing right in flight, wings spread level, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view in flight with both wings spread, and a side view perched with the wings folded. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M02 · Portrait

- **File:** `onemonster/game/assets/monsters/bombanat/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 2 and the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, the bat-winged flier on the book's cover: huge mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a tuft of dark fur on the chest, a red-and-white striped necktie, a pink striped cap with a yellow flower on top, and clawed pink feet. Flying with wings spread, a white envelope in his teeth. Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R02 · Sprite parts

- **File:** `onemonster/game/assets/monsters/bombanat/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in Over the Bubbley Goo, the flying game and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, the bat-winged flier on the book's cover: huge mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a tuft of dark fur on the chest, a red-and-white striped necktie, a pink striped cap with a yellow flower on top, and clawed pink feet. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, side view facing right in flight, wings spread level, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 8 pieces: 1. The body with the chest tuft and the knot of the striped necktie, no head, wings or legs. 2. The head with the striped cap and its flower, the eye and the upper snout with its teeth, but no lower jaw. 3. The lower jaw with its teeth, mouth closed. 4. The loose end of the striped necktie, so it can flutter. 5. The near wing, spread level. 6. The far wing, spread level, partly hidden in the master view but drawn whole here. 7. The near leg and clawed foot. 8. The far leg and clawed foot. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F02 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/bombanat/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions, wing beats.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, the bat-winged flier on the book's cover: huge mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a tuft of dark fur on the chest, a red-and-white striped necktie, a pink striped cap with a yellow flower on top, and clawed pink feet. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (side view facing right in flight, wings spread level), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R02; attach it too where you can. The 11 pieces: 1. The near wing raised high at the top of the upstroke. 2. The near wing swept down at the bottom of the downstroke, the membrane cupped. 3. The near wing folded against the body. 4. The far wing raised high. 5. The far wing swept down. 6. The far wing folded. 7. The near wing spread level and splattered with dripping blue goo. 8. The lower jaw snapped wide open. 9. The eye area only, eye wide in alarm. 10. The eye area only, eye shut (a blink). 11. The near foot with its claws clutched shut. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K02 · Key poses

- **File:** `onemonster/game/assets/monsters/bombanat/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Letter-Eating Bombanat, the bat-winged flier on the book's cover: huge mauve bat wings with thin finger bones and little claws at the tips, a long pink crocodile-like snout full of small sharp teeth, a sly frowning eye, a tuft of dark fur on the chest, a red-and-white striped necktie, a pink striped cap with a yellow flower on top, and clawed pink feet. Flying with wings spread, a white envelope in his teeth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C02 (file onemonster/game/assets/monsters/bombanat/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right in flight, wings spread level), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 9 poses: 1. Gliding, wings spread level. 2. Flapping, wings at the top of the stroke. 3. Flapping, wings at the bottom of the stroke. 4. Swooping down in a steep dive, wings swept back. 5. Snapping a letter up in the jaws. 6. Dipping to land, feet thrust forward, wings braking. 7. Grabbed from below, wriggling and flapping wildly. 8. Tangled in a butterfly net, wings crumpled. 9. Perched with the wings folded, sly. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Bombanat-Munching Grumley

Chapter 3, A Nice Bombanat Lunch, the grabbing game. Make the model sheet (OM-C03) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: lurking, rising, the lunge and grab, the miss and splutter, the lunch dance, the SNAP.

### OM-C03 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/grumley/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Note:** That the cover's yellow monster is the Grumley is inferred from his napkin and fork, not confirmed; check the Internet Archive scan.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as the big shaggy monster at the left of the book's cover: a huge, round, lumpy body of curly ochre-yellow fur, a wide grinning mouth with two great white tusks, a broad pink snout, heavy-lidded greedy eyes, a white napkin tied round his neck and a big fork held up in one pink paw, ready for lunch. Show him rising chest-deep out of glossy blue goo, dripping, reaching up with his free paw. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: three-quarter view facing right, from the waist up, as he rises out of the goo (draw no goo), in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view of the whole monster standing on a shore (feet and all), and a side view facing right from the waist up. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M03 · Portrait

- **File:** `onemonster/game/assets/monsters/grumley/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 3 and the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as the big shaggy monster at the left of the book's cover: a huge, round, lumpy body of curly ochre-yellow fur, a wide grinning mouth with two great white tusks, a broad pink snout, heavy-lidded greedy eyes, a white napkin tied round his neck and a big fork held up in one pink paw, ready for lunch. Show him rising chest-deep out of glossy blue goo, dripping, reaching up with his free paw. Draw it from this character's canonical model sheet, request OM-C03 (file onemonster/game/assets/monsters/grumley/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R03 · Sprite parts

- **File:** `onemonster/game/assets/monsters/grumley/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in A Nice Bombanat Lunch, the grabbing game and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as the big shaggy monster at the left of the book's cover: a huge, round, lumpy body of curly ochre-yellow fur, a wide grinning mouth with two great white tusks, a broad pink snout, heavy-lidded greedy eyes, a white napkin tied round his neck and a big fork held up in one pink paw, ready for lunch. Show him rising chest-deep out of glossy blue goo, dripping, reaching up with his free paw. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C03 (file onemonster/game/assets/monsters/grumley/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, three-quarter view facing right, from the waist up, as he rises out of the goo (draw no goo), at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 9 pieces: 1. The torso from the waist up, its bottom edge drawn complete and round (the game hides it under the goo). 2. The head with the eyes, brows and broad snout, but no lower jaw. 3. The lower jaw with the two great tusks, mouth closed in a grin. 4. The white napkin tied at the neck, so it can flap. 5. The near upper arm. 6. The near forearm and open paw, reaching. 7. The far upper arm. 8. The far forearm and paw, gripping. 9. The big fork alone. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F03 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/grumley/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as the big shaggy monster at the left of the book's cover: a huge, round, lumpy body of curly ochre-yellow fur, a wide grinning mouth with two great white tusks, a broad pink snout, heavy-lidded greedy eyes, a white napkin tied round his neck and a big fork held up in one pink paw, ready for lunch. Show him rising chest-deep out of glossy blue goo, dripping, reaching up with his free paw. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C03 (file onemonster/game/assets/monsters/grumley/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (three-quarter view facing right, from the waist up, as he rises out of the goo (draw no goo)), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R03; attach it too where you can. The 7 pieces: 1. The lower jaw wide open, ready to munch. 2. The lower jaw chomping, cheeks bulging. 3. The eye area only, eyes heavy-lidded and greedy. 4. The eye area only, eyes squeezed shut and spluttering. 5. The eye area only, eyes crossed and dazed. 6. The near paw clenched shut, grabbing. 7. Dripping blobs of blue goo to lay over the head and shoulders. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K03 · Key poses

- **File:** `onemonster/game/assets/monsters/grumley/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Munching Grumley, as the big shaggy monster at the left of the book's cover: a huge, round, lumpy body of curly ochre-yellow fur, a wide grinning mouth with two great white tusks, a broad pink snout, heavy-lidded greedy eyes, a white napkin tied round his neck and a big fork held up in one pink paw, ready for lunch. Show him rising chest-deep out of glossy blue goo, dripping, reaching up with his free paw. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C03 (file onemonster/game/assets/monsters/grumley/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (three-quarter view facing right, from the waist up, as he rises out of the goo (draw no goo)), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 7 poses: 1. Lurking, only the eyes and brow above the goo line, the rest sunk below. 2. Rising out of the goo, dripping. 3. Lunging straight up, the near arm stretched as high as it goes. 4. Holding a clenched fist up in triumph. 5. Spluttering after a miss, goo on his face. 6. Fork raised, napkin on, licking his lips. 7. Startled by a SNAP, jaw dropped. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Furious-Floating Ice-Ferg

Chapter 4, Furious Floating, the ramming game. Make the model sheet (OM-C04) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: drifting and bobbing, huffing up, the charge, the crash, the dazed bump.

### OM-C04 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/iceferg/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Note:** No picture of this monster was found: the design is ours. Check the Internet Archive scan and adjust the prompt before generating.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg: a craggy iceberg in a terrible temper, its pale-blue and white ice drawn in crosshatched facets, with a furious face in the front: two glaring eyes under a jutting frowning brow of ice, a scowling mouth with icicle teeth, little puffs of cold steam from its nostrils, and the dark underwater part of it showing below a band of choppy sea. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: front three-quarter view from high above, floating, the waterline along its bottom edge, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a side view showing the big dark underwater part below the waterline, and a view from straight above. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. No picture of this monster from the book was available, so the design here is our own: draw it as a monster from the same book, matching the drawing style, palette and mood of the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-M04 · Portrait

- **File:** `onemonster/game/assets/monsters/iceferg/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 4 and the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg: a craggy iceberg in a terrible temper, its pale-blue and white ice drawn in crosshatched facets, with a furious face in the front: two glaring eyes under a jutting frowning brow of ice, a scowling mouth with icicle teeth, little puffs of cold steam from its nostrils, and the dark underwater part of it showing below a band of choppy sea. Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. No picture of this monster from the book was available, so the design here is our own: draw it as a monster from the same book, matching the drawing style, palette and mood of the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-R04 · Sprite parts

- **File:** `onemonster/game/assets/monsters/iceferg/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in Furious Floating, the ramming game and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg: a craggy iceberg in a terrible temper, its pale-blue and white ice drawn in crosshatched facets, with a furious face in the front: two glaring eyes under a jutting frowning brow of ice, a scowling mouth with icicle teeth, little puffs of cold steam from its nostrils, and the dark underwater part of it showing below a band of choppy sea. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, front three-quarter view from high above, floating, the waterline along its bottom edge, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 9 pieces: 1. The iceberg alone, with its face area left as smooth ice (no brow, eyes or mouth). 2. The jutting frowning brow of ice. 3. The near eye white, without its pupil. 4. The far eye white, without its pupil. 5. One round pupil (the game uses it for both eyes). 6. The scowling mouth, closed. 7. A puff of cold steam, small. 8. A puff of cold steam, large. 9. Three chips of ice, flying apart. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F04 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/iceferg/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg: a craggy iceberg in a terrible temper, its pale-blue and white ice drawn in crosshatched facets, with a furious face in the front: two glaring eyes under a jutting frowning brow of ice, a scowling mouth with icicle teeth, little puffs of cold steam from its nostrils, and the dark underwater part of it showing below a band of choppy sea. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (front three-quarter view from high above, floating, the waterline along its bottom edge), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R04; attach it too where you can. The 7 pieces: 1. The brow raised and bunched up as it huffs up its fury. 2. The brow pulled furiously low. 3. The mouth roaring wide open with icicle teeth. 4. The mouth gritted, teeth bared. 5. The mouth wobbly and dazed. 6. Both eyes squeezed shut. 7. A crack pattern to lay over the ice after a crash. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K04 · Key poses

- **File:** `onemonster/game/assets/monsters/iceferg/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Furious-Floating Ice-Ferg: a craggy iceberg in a terrible temper, its pale-blue and white ice drawn in crosshatched facets, with a furious face in the front: two glaring eyes under a jutting frowning brow of ice, a scowling mouth with icicle teeth, little puffs of cold steam from its nostrils, and the dark underwater part of it showing below a band of choppy sea. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C04 (file onemonster/game/assets/monsters/iceferg/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (front three-quarter view from high above, floating, the waterline along its bottom edge), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 5 poses: 1. Drifting and sulking. 2. Huffing up, swollen, steam blasting from its nostrils. 3. Charging forward, leaning in, roaring. 4. The crash, eyes squeezed shut, ice chips flying. 5. Bumped and dazed, deflated. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Wild-'n-Windy Typhoonigator

Chapter 5, Suck It All Up, the inhaling game. Make the model sheet (OM-C05) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: churning cloud, sucking, swelling as it fills, letting go, the morning sag.

### OM-C05 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/typhoonigator/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's page-20 spread: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: front view from a little above, the water spout falling from its lips, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a side view facing right with the spout, and a view from high above. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-M05 · Portrait

- **File:** `onemonster/game/assets/monsters/typhoonigator/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 5 and the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's page-20 spread: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. Draw it from this character's canonical model sheet, request OM-C05 (file onemonster/game/assets/monsters/typhoonigator/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this monster in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg , keeping its shapes, colours and proportions, but as clean new full-colour drawings of the monster alone (no book, page, hands, other monsters or printed text).
```

### OM-R05 · Sprite parts

- **File:** `onemonster/game/assets/monsters/typhoonigator/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in Suck It All Up, the inhaling game and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's page-20 spread: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C05 (file onemonster/game/assets/monsters/typhoonigator/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, front view from a little above, the water spout falling from its lips, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 14 pieces: 1. The big billowing cloud mass of the body and hair, with no face features, hands or spout. 2. A loose round puff of cloud, large. 3. A loose round puff of cloud, medium. 4. A loose curling wisp of cloud. 5. The near clawed cloud hand, open. 6. The far clawed cloud hand, open. 7. Both heavy wrinkled brows together. 8. Both bulging eye whites, without pupils. 9. One small round pupil (the game uses it for both eyes). 10. The long fleshy pink nose. 11. The huge pink lips pursed to suck. 12. The top of the water spout, where it meets the lips. 13. A straight length of the streaked water spout that repeats seamlessly from top to bottom. 14. The ring of spray where the spout meets the sea. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F05 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/typhoonigator/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions, wing beats.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's page-20 spread: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C05 (file onemonster/game/assets/monsters/typhoonigator/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (front view from a little above, the water spout falling from its lips), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R05; attach it too where you can. The 7 pieces: 1. The lips with the cheeks puffed out, blowing. 2. The lips stretched round and stuffed full, cheeks bulging. 3. The lips open in a relieved O. 4. The brows strained and bunched. 5. The brows drooping and sleepy. 6. The near hand clenched, grabbing. 7. The far hand clenched, grabbing. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K05 · Key poses

- **File:** `onemonster/game/assets/monsters/typhoonigator/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. The Wild-'n-Windy Typhoonigator, as on the book's page-20 spread: a storm cloud with a face, its body and hair billowing grey-brown and lilac cloud, clawed cloud hands at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a streaked blue-grey water spout. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C05 (file onemonster/game/assets/monsters/typhoonigator/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (front view from a little above, the water spout falling from its lips), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 4 poses: 1. Storming along, sucking hard. 2. Bloated full and round, fishing boats and bottles poking out of the cloud. 3. Letting go, blowing everything out. 4. A small exhausted wisp at morning. Lay them out in a grid of 2 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Paper-Munching Yalapappus

Chapter 6, Munch and Chase, the chasing game. Make the model sheet (OM-C06) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: the trundle cycle, the hop and landing, munching, the bonk, the shouting chase, wailing.

### OM-C06 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/yalapappus/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Note:** No picture of this monster was found: the design is ours. Check the Internet Archive scan and adjust the prompt before generating.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus: a round, pear-shaped, shaggy monster in mottled mauve and dusty-pink fur, on short stumpy legs with big pink paws, with a wide flat munching mouth full of square teeth, a little pink snout, droopy ears, round heavy-lidded eyes and a tuft of hair on top. He is trundling along at a run, a scrap of paper half-munched in his mouth. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: side view facing right, standing on his two stumpy legs, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view, a back view, and a three-quarter view facing right. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. No picture of this monster from the book was available, so the design here is our own: draw it as a monster from the same book, matching the drawing style, palette and mood of the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-M06 · Portrait

- **File:** `onemonster/game/assets/monsters/yalapappus/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 6 and the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus: a round, pear-shaped, shaggy monster in mottled mauve and dusty-pink fur, on short stumpy legs with big pink paws, with a wide flat munching mouth full of square teeth, a little pink snout, droopy ears, round heavy-lidded eyes and a tuft of hair on top. He is trundling along at a run, a scrap of paper half-munched in his mouth. Draw it from this character's canonical model sheet, request OM-C06 (file onemonster/game/assets/monsters/yalapappus/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. No picture of this monster from the book was available, so the design here is our own: draw it as a monster from the same book, matching the drawing style, palette and mood of the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-R06 · Sprite parts

- **File:** `onemonster/game/assets/monsters/yalapappus/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in Munch and Chase, the chasing game and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus: a round, pear-shaped, shaggy monster in mottled mauve and dusty-pink fur, on short stumpy legs with big pink paws, with a wide flat munching mouth full of square teeth, a little pink snout, droopy ears, round heavy-lidded eyes and a tuft of hair on top. He is trundling along at a run, a scrap of paper half-munched in his mouth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C06 (file onemonster/game/assets/monsters/yalapappus/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, side view facing right, standing on his two stumpy legs, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 9 pieces: 1. The round body, no head, arms or legs. 2. The head with the eyes, the little snout and the far ear, but no lower jaw, no near ear and no tuft. 3. The lower jaw with its square teeth, mouth closed. 4. The near droopy ear. 5. The springy tuft of hair on top. 6. The near arm and paw. 7. The far arm and paw. 8. The near stumpy leg and big paw. 9. The far stumpy leg and big paw. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F06 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/yalapappus/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus: a round, pear-shaped, shaggy monster in mottled mauve and dusty-pink fur, on short stumpy legs with big pink paws, with a wide flat munching mouth full of square teeth, a little pink snout, droopy ears, round heavy-lidded eyes and a tuft of hair on top. He is trundling along at a run, a scrap of paper half-munched in his mouth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C06 (file onemonster/game/assets/monsters/yalapappus/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (side view facing right, standing on his two stumpy legs), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R06; attach it too where you can. The 7 pieces: 1. The lower jaw wide open. 2. The lower jaw chomping, cheeks bulging, a scrap of paper sticking out. 3. The lower jaw dropped, shouting. 4. The eye area only, eyes gleeful. 5. The eye area only, eyes furious. 6. The eye area only, eyes swirling and dizzy. 7. The eye area only, eyes shut (a blink). Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K06 · Key poses

- **File:** `onemonster/game/assets/monsters/yalapappus/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Paper-Munching Yalapappus: a round, pear-shaped, shaggy monster in mottled mauve and dusty-pink fur, on short stumpy legs with big pink paws, with a wide flat munching mouth full of square teeth, a little pink snout, droopy ears, round heavy-lidded eyes and a tuft of hair on top. He is trundling along at a run, a scrap of paper half-munched in his mouth. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C06 (file onemonster/game/assets/monsters/yalapappus/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right, standing on his two stumpy legs), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 9 poses: 1. Standing idle, contented. 2. Trundling, near leg forward. 3. Trundling, far leg forward. 4. Hopping, in the air, legs tucked. 5. Landing, squashed flat. 6. Sitting and gleefully munching a paper. 7. Bonked on the head, dizzy, a bump rising. 8. Running and shouting, fist raised. 9. Sitting and wailing. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Bombanat-Collecting Grithix

Chapter 7, Net Them All, the netting game. Make the model sheet (OM-C07) first and settle the design on it; then attach it to each of the other four requests, which are all drawn from it. The portrait is the name card; the parts, swaps and poses are the sprites the game animates. The animations: the stride cycle, the net swing in three beats, the slam, posting the letter, tripping, the stroll home.

### OM-C07 · Model sheet (canonical)

- **File:** `onemonster/game/assets/monsters/grithix/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical design that every other image of this monster is drawn from, and the guide for fitting its sprite rig.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/forest-spread-unidentified.jpg`](../reference/forest-spread-unidentified.jpg)
- **Note:** No picture of this monster was found: the design is ours. Check the Internet Archive scan and adjust the prompt before generating.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix: a tall, gangly, long-armed monster in olive and sage-green fur with a long knobbly nose, bushy eyebrows over beady pleased eyes, a satchel of glass collecting jars across his chest and a big butterfly net held high in one long pink hand, mid-swing. (Use this description for the design only; the pose is given below.) A character model sheet (turnaround) for an animated game: the one definitive design of this character, which every other picture and sprite of it will be drawn from. On the left, large and filling the full height: side view facing right, standing, holding the net upright, in a calm neutral pose, with every limb, wing and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: a front view, a back view, and a three-quarter view facing right. Every view shows exactly the same character, with identical proportions, colours and clothing. Even, flat lighting and clean, even washes, so the colours are easy to match later. Wide gaps between the views, no labels, no arrows, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. No picture of this monster from the book was available, so the design here is our own: draw it as a monster from the same book, matching the drawing style, palette and mood of the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/forest-spread-unidentified.jpg .
```

### OM-M07 · Portrait

- **File:** `onemonster/game/assets/monsters/grithix/portrait.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The name card of chapter 7 and the chapter select.
- **Stand-in until delivered:** The monster's stand-in rig, drawn in code, posed on the card.
- **Reference:** [`reference/forest-spread-unidentified.jpg`](../reference/forest-spread-unidentified.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix: a tall, gangly, long-armed monster in olive and sage-green fur with a long knobbly nose, bushy eyebrows over beady pleased eyes, a satchel of glass collecting jars across his chest and a big butterfly net held high in one long pink hand, mid-swing. Draw it from this character's canonical model sheet, request OM-C07 (file onemonster/game/assets/monsters/grithix/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Full-body portrait of the monster alone in a lively three-quarter pose facing right, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. No picture of this monster from the book was available, so the design here is our own: draw it as a monster from the same book, matching the drawing style, palette and mood of the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/forest-spread-unidentified.jpg .
```

### OM-R07 · Sprite parts

- **File:** `onemonster/game/assets/monsters/grithix/parts.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The pieces of the monster's cut-out rig, moved and rotated by the game in Net Them All, the netting game and in the hand-offs.
- **Stand-in until delivered:** The same rig with each piece drawn in code from simple shapes with a wobbly ink outline.
- **Reference:** [`reference/forest-spread-unidentified.jpg`](../reference/forest-spread-unidentified.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix: a tall, gangly, long-armed monster in olive and sage-green fur with a long knobbly nose, bushy eyebrows over beady pleased eyes, a satchel of glass collecting jars across his chest and a big butterfly net held high in one long pink hand, mid-swing. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C07 (file onemonster/game/assets/monsters/grithix/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates each piece on its own. Draw the character in the master view of the model sheet, side view facing right, standing, holding the net upright, at the same scale, then take it apart into the separate pieces below. Each piece is drawn complete and unbroken, in the same orientation it has in the master view (do not turn it to fit the cell). Where two pieces join, draw each one a little past the joint with a rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near ones, as they are in shadow. The 15 pieces: 1. The torso with the satchel of collecting jars, no head, arms or legs. 2. The head with the bushy brows, beady eyes and knobbly nose, mouth closed in a pleased smile. 3. The near upper arm. 4. The near forearm. 5. The near hand, gripping. 6. The far upper arm. 7. The far forearm. 8. The far hand, open. 9. The near thigh. 10. The near shin and foot. 11. The far thigh. 12. The far shin and foot. 13. The long wooden handle of the net. 14. The hoop and the empty net bag. 15. One empty glass collecting jar with a cork. Lay them out in a grid of 4 columns and 4 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-F07 · Sprite swaps

- **File:** `onemonster/game/assets/monsters/grithix/swaps.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Swapped in over the rig's pieces for a frame or two: the shapes rotation cannot make, such as mouths, blinks, expressions.
- **Stand-in until delivered:** Drawn-in-code versions of the same pieces.
- **Reference:** [`reference/forest-spread-unidentified.jpg`](../reference/forest-spread-unidentified.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix: a tall, gangly, long-armed monster in olive and sage-green fur with a long knobbly nose, bushy eyebrows over beady pleased eyes, a satchel of glass collecting jars across his chest and a big butterfly net held high in one long pink hand, mid-swing. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C07 (file onemonster/game/assets/monsters/grithix/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the place of the piece it replaces on the parts sheet, at the same scale and in the same master view (side view facing right, standing, holding the net upright), so the game can swap it in for a frame or two. For the matching pieces, see this character's parts sheet, request OM-R07; attach it too where you can. The 6 pieces: 1. The net bag full, sagging with something heavy and wriggling. 2. The mouth area only, open in an AHA. 3. The mouth area only, a calm smirk that doesn't care a snickle. 4. The eye area only, eyes narrowed and taking aim. 5. The eye area only, eyes closed and contented. 6. The far hand holding a letter (no letter drawn), ready to post it. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### OM-K07 · Key poses

- **File:** `onemonster/game/assets/monsters/grithix/poses.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The targets the rig's animations are fitted to, and the stills of the snatch and hand-off.
- **Stand-in until delivered:** The stand-in rig posed in code.
- **Reference:** [`reference/forest-spread-unidentified.jpg`](../reference/forest-spread-unidentified.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or put-upon rather than frightening, with pink snout, paws and feet where it has them. The Bombanat-Collecting Grithix: a tall, gangly, long-armed monster in olive and sage-green fur with a long knobbly nose, bushy eyebrows over beady pleased eyes, a satchel of glass collecting jars across his chest and a big butterfly net held high in one long pink hand, mid-swing. (Use this description for the design only; the pose is given below.) Draw it from this character's canonical model sheet, request OM-C07 (file onemonster/game/assets/monsters/grithix/model-sheet.png): attach that image and match it exactly, with the same design, proportions, colours, line weight and clothing. Where the two disagree, the model sheet wins over this description. Key poses for animating this character: the whole character in each pose, all at the same scale as the master view of the model sheet (side view facing right, standing, holding the net upright), with exactly the same design. They are the poses the game's animations move through, and the stills it shows in the hand-off between chapters, so make each one clear, lively and readable as a silhouette. The 9 poses: 1. Standing idle with the net. 2. Striding, near leg forward. 3. Striding, far leg forward. 4. Winding up a swing, the net drawn back. 5. The swing, the net sweeping through. 6. Slamming the net down, FLIP-FLOP. 7. Posting a letter at a mailbox slot. 8. Tripping and stumbling. 9. Strolling home not caring a snickle, something tucked under one arm. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Supporting cast

The people in the story: the girls, the mailman, the captain and crew, and the neighbours who look out in chapter 1. A model sheet first, then their small sprites.

### OM-C08 · Supporting cast model sheet (canonical)

- **File:** `onemonster/game/assets/cast/model-sheet.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Not shown in the game: the canonical look of the people, for their sprites and the story pages.
- **Stand-in until delivered:** None needed.
- **Reference:** [`reference/mailbox-girl-and-trollusk.jpg`](../reference/mailbox-girl-and-trollusk.jpg)
- **Note:** Sally Ann's and the mailman's looks are ours; Lucy Jane follows the girl in the reference photo, whose identity is not confirmed.
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A character model sheet for an animated game: the one definitive design of each of these people, drawn in a row, each shown twice side by side (a front view and a side view facing right), all at the same scale, standing in a calm neutral pose. 1. Sally Ann, a girl of about eight with short curly red hair, freckles, a green dress and white socks. 2. Lucy Jane, a girl of about eight with long wavy brown hair, round glasses, a white top and a pink skirt, barefoot, as the girl in the reference photo. 3. The mailman, short and stern, in a blue uniform, peaked cap and goggles, with a mail satchel. 4. The ship's captain, bearded, in a grey cap and long grey coat, as the sailors on the book's page-20 spread ( https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg ). Even, flat lighting and clean washes; wide gaps between the figures; no labels, no ground line. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/mailbox-girl-and-trollusk.jpg .
```

### OM-K08 · Supporting cast sprites

- **File:** `onemonster/game/assets/cast/sprites.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The lookers in chapter 1, the mailman's motorcycle along the top of chapter 1 and the epilogue, and the captain and crew in the chapter 4 hand-off.
- **Stand-in until delivered:** Small figures drawn in code.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. Small game sprites of the people in the story, drawn from the supporting cast model sheet, request OM-C08 (file onemonster/game/assets/cast/model-sheet.png): attach that image and match it exactly. Each sprite is complete on its own: 1. Sally Ann in an open window frame with curtains, looking out sharply. 2. The same window, Sally Ann turned away, writing at a desk. 3. A plump neighbour lady in a rocking chair on a porch step, peering over her spectacles. 4. The same neighbour, dozing. 5. A scruffy little dog, ears up, staring. 6. The same dog, curled up asleep. 7. The mailman riding his official-looking old motorcycle with a sidecar of mail sacks, side view facing left, wheels round. 8. The same, mid-bounce, exhaust puffing. 9. The captain standing in a pink rubber raft, throwing a bottle overarm. 10. Two bearded sailors paddling the pink rubber raft with an S.O.S. flag, as on the book's page-20 spread, paddles forward. 11. The same, paddles back. 12. Lucy Jane walking along reading a letter. Lay them out in a grid of 4 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Props

The things that move in each chapter and are not monsters, one sheet per chapter. The game cuts each sheet into separate sprites on integration.

### OM-X01 · Stamp-Collecting Trollusk props

- **File:** `onemonster/game/assets/props/trollusk.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in Before the Mailman Comes, the sneaking game.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others: 1. A red postage stamp with a scalloped edge. 2. A green postage stamp with a scalloped edge. 3. A blue postage stamp with a scalloped edge, flipping in the wind. 4. A yellow postage stamp with a scalloped edge, curling. 5. A round leafy bush. 6. A long low flowerbed of tulips and daisies. 7. A blue curbside mailbox on a post with its little red flag down. 8. The same mailbox with the flag up and the door open. 9. An eye-shaped warning bubble with a startled eye in it. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-X02 · Letter-Eating Bombanat props

- **File:** `onemonster/game/assets/props/bombanat.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in Over the Bubbley Goo, the flying game.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others: 1. A bubble of blue goo, small. 2. A bubble, medium. 3. A bubble, large and swelling. 4. A bubble bursting, with spray. 5. A flung blob of goo. 6. An old torn ticket. 7. A paper menu. 8. A folded paper hat. 9. A crumpled newspaper page. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-X03 · Bombanat-Munching Grumley props

- **File:** `onemonster/game/assets/props/grumley.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in A Nice Bombanat Lunch, the grabbing game.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others: 1. A red-and-white diamond kite with a tail, as a decoy. 2. A black umbrella flapping open, as a decoy. 3. The same umbrella blown inside-out. 4. A wicker picnic basket, empty, lid open. 5. The same basket heaped full. 6. A ring of goo splash, seen side-on. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-X04 · Furious-Floating Ice-Ferg props

- **File:** `onemonster/game/assets/props/iceferg.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in Furious Floating, the ramming game.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others, seen from high above: 1. The captain's little steamship, sailing. 2. The same ship tilted and sinking, bow up. 3. A small red fishing boat. 4. A small green fishing boat with a net. 5. A curving current arrow drawn in the water as foam. 6. A white splash ring. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-X05 · Wild-'n-Windy Typhoonigator props

- **File:** `onemonster/game/assets/props/typhoonigator.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in Suck It All Up, the inhaling game.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/typhoonigator-spread.jpg`](../reference/typhoonigator-spread.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others, seen from above: 1. The captain's glass bottle, corked, with a red-and-white label and a rolled note inside. 2. A plain green bottle. 3. A plain brown bottle. 4. A silver fish. 5. A striped fish. 6. A red-and-white buoy. 7. A tiny fishing boat, tumbling. 8. A blob of blue goo. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/typhoonigator-spread.jpg .
```

### OM-X06 · Paper-Munching Yalapappus props

- **File:** `onemonster/game/assets/props/yalapappus.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in Munch and Chase, the chasing game.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/cover-golden-book-1974.jpg`](../reference/cover-golden-book-1974.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others, side-on: 1. A round grey rock. 2. A jagged brown rock. 3. The near edge of a hole in the bumpy ground. 4. The far edge of the same hole. 5. A torn scrap of paper. 6. A crumpled paper ball. 7. A paper bag. 8. The captain's note, a rolled scrap with scribbles (no readable words). 9. A broken bottle, glass flying. Lay them out in a grid of 3 columns and 3 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/cover-golden-book-1974.jpg .
```

### OM-X07 · Bombanat-Collecting Grithix props

- **File:** `onemonster/game/assets/props/grithix.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** The moving things in Net Them All, the netting game.
- **Stand-in until delivered:** The same things drawn in code.
- **Reference:** [`reference/forest-spread-unidentified.jpg`](../reference/forest-spread-unidentified.jpg)
- **Status:** requested

```text
Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no watermark, no border, no UI. A sheet of separate small game sprites, each one complete on its own and drawn at the same scale as the others: 1. An official-looking blue mailbox on a post, with a mail slot and an eagle badge (no lettering). 2. A glass collecting jar, empty, corked. 3. The same jar with a small angry mauve bat-winged monster inside. 4. A clump of ferns for the foreground. 5. A gnarled root to trip over. Lay them out in a grid of 3 columns and 2 rows, in the order listed, from left to right and top to bottom, one per cell and centred in it, with plenty of clear background around each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide lines, outlines around the cells or shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/forest-spread-unidentified.jpg .
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
