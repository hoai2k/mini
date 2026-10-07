# The Ice-Cream Cone Coot: image requests

Artwork for the Ice-Cream Cone Coot game in `icecreamcone/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `icecreamcone/game/src/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.
2. Save each image under the file name in its **File** line and drop it in `icecreamcone/intake/`. On integration it moves to that path under `icecreamcone/game/`, its status flips to `delivered` and the game loads it in place of its stand-in.
3. The logo, icon and bird portraits need transparency. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.
4. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.
5. Nothing here blocks the game: every image has a stand-in drawn in code until it arrives.
6. Each request names a reference photo of the book in `icecreamcone/reference/`, and its prompt links to it. Give that photo to the image generator along with the prompt where it can take an image; the prompt's link works once the photo is on `main`.
7. The bird portraits matter most, since each one is both the bird's page and the bird in its game. If you only make some, start there.

## Status

14 requested, 25 delivered, 39 in total.

## Brand

The title screen, the browser tab, the game library card and the book's paper.

### IC-U01 · Title logo

- **File:** `icecreamcone/game/assets/ui/logo.png`
- **Size:** 1600 x 800, transparent
- **Used for:** The title screen above Press Start, and the card on the game library page.
- **Stand-in until delivered:** The title set in the page's serif font in brown ink.
- **Reference:** [`reference/cover-ice-cream-cone-coot.jpg`](../reference/cover-ice-cream-cone-coot.jpg)
- **Status:** delivered

```text
A hand-lettered picture-book title in brown ink and watercolour, like the cover of an early-1970s children's book: old-fashioned, slightly wobbly serif letters with fine crosshatched shading, filled with soft washes of strawberry pink, vanilla cream and waffle-cone ochre. Two lines, spelled exactly: a large first line "The Ice-Cream Cone Coot" and a smaller second line "and Other Rare Birds". A tiny ink drawing of a coot whose body is an ice-cream cone stands at the end of the second line. For the lettering and the coot, see the book's cover: https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/cover-ice-cream-cone-coot.jpg . Wide landscape composition, the lettering filling about 85% of the width, even margins, no other text. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-U02 · Title background

- **File:** `icecreamcone/game/assets/ui/title-bg.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Full-screen behind the title screen; also the cover of the game library card.
- **Stand-in until delivered:** A painted-in-code landscape of hills under a pale sky.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A wide, dreamy landscape at golden hour: gentle rolling hills, a winding path, a split-rail fence and a few round trees, a pale peach and slate-blue sky. Small in the middle distance, rare birds made of everyday objects go about their day: a teacup bird on long legs, a camera bird, a pair of pink high-button boots singing on a fence, a traffic-light crow on stilt legs, a newspaper bird. Keep the upper-middle half calm and open (plain sky) for the title, and the bottom-right corner quiet for buttons. Full-bleed 16:9.
```

### IC-U03 · App icon and favicon

- **File:** `icecreamcone/game/assets/ui/icon.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Browser tab, home-screen icon (scaled to 512, 192 and 180 px).
- **Stand-in until delivered:** A drawn icon: an ice-cream cone with a coot's head on a cream tile.
- **Reference:** [`reference/cover-ice-cream-cone-coot.jpg`](../reference/cover-ice-cream-cone-coot.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. App icon: the Ice-Cream Cone Coot from the book's cover (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/cover-ice-cream-cone-coot.jpg ): its pink strawberry-scoop head with the big pale-blue eye, waffle-cone beak and orange wafer crest, and the top of its striped neck, on a rounded-square cream paper tile with a thin brown ink border. Bold and simple, readable at 48 px; the bird fills about 75% of the tile. No text. Transparent corners outside the rounded square (PNG with alpha), or flat magenta #FF00FF corners if transparency is not possible.
```

### IC-U04 · Paper texture

- **File:** `icecreamcone/game/assets/ui/paper.webp`
- **Size:** 1024 x 1024, opaque, tiling
- **Used for:** The pages of the field guide, behind every page and card.
- **Stand-in until delivered:** A flat cream colour with a faint drawn grain.
- **Status:** delivered

```text
A flat scan of plain, slightly aged cream watercolour paper: soft natural grain, very faint fibres, a few barely-there warm speckles, even lighting, no folds, no stains, no vignette, nothing drawn on it. A square tile that repeats seamlessly in both directions: each edge continues exactly into the opposite edge.
```

### IC-U05 · All the birds together

- **File:** `icecreamcone/game/assets/ui/gathering.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** The last page of the field guide, shown once every bird has been spotted.
- **Stand-in until delivered:** Every bird's portrait (or stand-in) drawn together on a hillside.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A crowded, happy gathering of all the rare birds together for a group portrait, each clearly visible: Ice-Cream Cone Coot (an ice-cream cone with strawberry and lemon scoops); Cupadee (a yellow teacup); Shuttercluck (an old box camera); Gramophone Gullfinch (a wind-up gramophone); Flowerpot Plume (a terracotta flowerpot with a blooming plume); Highbutton Bobolinks (a pair of pink high-button boots); Newspaper Peeper (a newspaper); Pincushion Piffle (a pincushion full of pins); Dollarbill Dodo (a banknote); Safecrossing Crow (a traffic light on stilt legs). Packed and lively like the book's endpapers (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg ), on a pale lemon-yellow ground with a grassy strip along the bottom. Full-bleed 16:9.
```

### IC-U06 · Medals

- **File:** `icecreamcone/game/assets/ui/medals.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** The result card, the field guide's tabs and the gathering page.
- **Stand-in until delivered:** Coloured circles.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 1 row of three round prize rosettes with short ribbon tails, hand-drawn in ink and watercolour: bronze (warm brown-orange), silver (cool grey) and gold (warm yellow ochre), each with a tiny ice-cream cone embossed in the centre. No text.
```

## Bird portraits

One portrait per bird. Each is shown large on the bird's page in the field guide and is the bird itself in its minigame, where the game moves, tilts and squashes it.

### IC-B01 · The Ice-Cream Cone Coot

- **File:** `icecreamcone/game/assets/birds/coot.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Scoop Stack, the scoop-catching game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/cover-ice-cream-cone-coot.jpg`](../reference/cover-ice-cream-cone-coot.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Ice-Cream Cone Coot, as on the book's cover: its body is a golden waffle ice-cream cone lying on its side, tip pointing back and down, crowned with a big lumpy lemon-yellow scoop (tiny brown speckles) as its chest and back. A thin neck striped red and yellow like a candy straw curves up to a head that is a pink strawberry scoop, with one big pale-blue round eye and a beak that is a small waffle cone pointing forward. Three orange wafer fingers tipped with magenta bobbles stick out behind the head as a crest. A little mint-green and pistachio drip where cone meets scoop. Two long thin legs striped pink and white, ending in spiky magenta bird feet. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/cover-ice-cream-cone-coot.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

### IC-B02 · The Cupadee

- **File:** `icecreamcone/game/assets/birds/cupadee.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Tea Time, the pouring game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/cupadee-and-shuttercluck.jpg`](../reference/cupadee-and-shuttercluck.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Cupadee: a pale-yellow china teacup with a dusty-pink band around its rim is its body, tipped slightly forward. Its round eye with a dot pupil is on the side of the cup, a long sharp ochre beak points forward and down from the cup's front, and the cup's curly handle is at the back with a little tuft of yellow tail feathers. It stands on two very long, thin, knobbly legs with spiky claws. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/cupadee-and-shuttercluck.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

### IC-B03 · The Shuttercluck

- **File:** `icecreamcone/game/assets/birds/shuttercluck.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Say Cheese, the photograph game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/cupadee-and-shuttercluck.jpg`](../reference/cupadee-and-shuttercluck.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Shuttercluck: its body is a boxy old 1930s camera in dark brown-black leatherette with a little viewfinder and a winding knob on top. Its single big round lens, ringed in yellow, is its one staring eye on the front. A long, tapering tan beak sticks straight out of the camera's side, curly pink plumes rise from the top as a crest and curl out of the back as a tail, and it stands on two short scaly orange legs with grey claws. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/cupadee-and-shuttercluck.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

### IC-B04 · The Gramophone Gullfinch

- **File:** `icecreamcone/game/assets/birds/gullfinch.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Wind and Sing, the music game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/gramophone-gullfinch.jpg`](../reference/gramophone-gullfinch.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Gramophone Gullfinch, in olive and mustard yellow: a huge fluted brass gramophone horn flares out behind its head like a giant flower, a small green-grey finch head with a round eye and a spray of long curved yellow crest feathers sits where the horn narrows, a neck of overlapping scaly feathers curves down to its body, which is a square record-player box with a black record and a tone arm on top and a crank handle on the side. It stands on one long, thin yellow leg with long claws, the other leg raised. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/gramophone-gullfinch.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

### IC-B05 · The Flowerpot Plume

- **File:** `icecreamcone/game/assets/birds/plume.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Bloom, the watering game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/flowerpot-plume.jpg`](../reference/flowerpot-plume.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Flowerpot Plume: a dusty-pink terracotta flowerpot is its body, with a small ochre-yellow face on the upper front of the pot (one round eye, a short magenta beak), a little pink wing on its side, a pink tail tuft at the back, and two short orange legs. A small yellow-green sprout of leaves grows from the soil at the top of the pot, which is its head. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/flowerpot-plume.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

### IC-B06 · The Highbutton Bobolinks

- **File:** `icecreamcone/game/assets/birds/bobolinks.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Left Foot, Right Foot, the stepping-stone game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/highbutton-bobolinks.jpg`](../reference/highbutton-bobolinks.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Highbutton Bobolinks: a pair of old-fashioned ladies' high-button boots in dusty mauve-pink leather with a row of small round buttons, cream soles and little heels. Each boot is a bird: a round yellow eye near the top and a long white pointed beak opening upward out of the boot's top, singing. The two stand side by side, one slightly behind the other, as a left and a right. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/highbutton-bobolinks.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

### IC-B07 · The Newspaper Peeper

- **File:** `icecreamcone/game/assets/birds/peeper.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Hot off the Press, the letter-catching game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/newspaper-peeper.jpg`](../reference/newspaper-peeper.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Newspaper Peeper: its body is a folded sheet of old newspaper standing upright, covered in columns of tiny grey print, a bold headline and two small printed photos; long torn strips of newspaper curl up and back from the top as its crest and tail. A pale-yellow bird head with a round eye and a long thin open beak leans out from the top-left corner, and it stands on two yellow legs with long claws. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/newspaper-peeper.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

### IC-B08 · The Pincushion Piffle

- **File:** `icecreamcone/game/assets/birds/piffle.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Stitch in Time, the sewing game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/pincushion-piffle.jpg`](../reference/pincushion-piffle.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Pincushion Piffle: a plump round olive-ochre pincushion body bristling with pins along its back like a crest: pearl-headed pins in rose, cream and plum, long needles, hatpins and two safety pins. A silver thimble with a lacy dimpled pattern sits on the front like a little hat, a short pointed tail sticks out at the back, and it walks on two thin dark legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/pincushion-piffle.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

### IC-B09 · The Dollarbill Dodo

- **File:** `icecreamcone/game/assets/birds/dodo.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Spot the Dodo, the shell game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/dollarbill-dodo.jpg`](../reference/dollarbill-dodo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Dollarbill Dodo: its body is a long, flat, green-yellow paper banknote held level like a plank, with ornate engraved borders, scrolls and a numeral 1 in each corner (an invented note, not a real currency, no portrait). Curly yellow-green feather tufts at the back end, a long two-pointed yellow beak at the front, and two thin yellow legs underneath. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/dollarbill-dodo.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

### IC-B10 · The Safecrossing Crow

- **File:** `icecreamcone/game/assets/birds/crow.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** The bird's page, and the bird itself in Safe Crossing, the traffic game.
- **Stand-in until delivered:** The bird drawn in code from simple shapes in ink and wash.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The Safecrossing Crow, as in the bottom right of the book's endpapers: its head is an old-fashioned dark-green cast-iron traffic signal lantern with a knob on top, little spikes at the sides and three round lamps (red, amber, green) in a column, a short pointed beak and a tuft of orange tail feathers. The lantern sits on a long thin black pole that is its neck, and it stands on two very long, thin black legs with pink spiky feet. Show all three lamps dim and unlit, because the game lights them. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match the design of this bird in the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg , keeping its shapes, colours and proportions, but as a clean new full-colour painting of the bird alone (no book, page, hands or printed text).
```

## Minigame scenes

One background per minigame. The game draws the birds and everything that moves on top, so each scene leaves the play area quiet, as its prompt says.

### IC-S01 · Ice-Cream Cone Coot scene

- **File:** `icecreamcone/game/assets/scenes/coot.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Scoop Stack, the scoop-catching game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/cover-ice-cream-cone-coot.jpg`](../reference/cover-ice-cream-cone-coot.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A sunny seaside promenade in summer: a striped ice-cream cart with an awning at the far right edge, a pale wide sky with a few soft clouds over a calm sea, and a flat wooden boardwalk running along the bottom fifth. Keep the whole upper two-thirds open, plain sky, because ice-cream scoops fall through it. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/cover-ice-cream-cone-coot.jpg .
```

### IC-S02 · Cupadee scene

- **File:** `icecreamcone/game/assets/scenes/cupadee.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Tea Time, the pouring game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/cupadee-and-shuttercluck.jpg`](../reference/cupadee-and-shuttercluck.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A tea table in a sunny old-fashioned kitchen: a lace-edged tablecloth across the bottom third, a window with a geranium, a dresser with plates far behind. Keep the tabletop and the space above it clear, because the teapot and the Cupadee go there. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/cupadee-and-shuttercluck.jpg .
```

### IC-S03 · Shuttercluck scene

- **File:** `icecreamcone/game/assets/scenes/shuttercluck.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Say Cheese, the photograph game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/cupadee-and-shuttercluck.jpg`](../reference/cupadee-and-shuttercluck.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A quiet meadow at midday: tall grass along the bottom, a low mossy stone wall, two round bushes, a hollow old tree with a knothole, a hedge and a wooden gate, spread evenly across the picture with sky above, so there are many places a bird might peek out from. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/cupadee-and-shuttercluck.jpg .
```

### IC-S04 · Gramophone Gullfinch scene

- **File:** `icecreamcone/game/assets/scenes/gullfinch.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Wind and Sing, the music game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/gramophone-gullfinch.jpg`](../reference/gramophone-gullfinch.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A cosy old parlour in the evening: patterned wallpaper, a fringed lamp, an armchair, a rug and a little table, all around the edges. Keep the centre and the lower middle open, plain wall and floor, for the gramophone and the notes that float to it. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/gramophone-gullfinch.jpg .
```

### IC-S05 · Flowerpot Plume scene

- **File:** `icecreamcone/game/assets/scenes/plume.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Bloom, the watering game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/flowerpot-plume.jpg`](../reference/flowerpot-plume.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A sunny cottage garden: a long wooden potting bench runs across the lower third, a brick wall with climbing roses behind it, open sky above. Keep the bench top and the sky above it clear, because the pots and the watering can go there. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/flowerpot-plume.jpg .
```

### IC-S06 · Highbutton Bobolinks scene

- **File:** `icecreamcone/game/assets/scenes/bobolinks.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Left Foot, Right Foot, the stepping-stone game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/highbutton-bobolinks.jpg`](../reference/highbutton-bobolinks.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A night stream through woods seen from the side: dark blue-black sky with a small glowing yellow moon, gnarled branches at the edges, dark water across the lower half catching the moonlight. Keep the water's surface open, without stones, because the game places the stepping stones. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/highbutton-bobolinks.jpg .
```

### IC-S07 · Newspaper Peeper scene

- **File:** `icecreamcone/game/assets/scenes/peeper.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Hot off the Press, the letter-catching game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/newspaper-peeper.jpg`](../reference/newspaper-peeper.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). An old print shop: a big iron printing press at the left edge, drying sheets pegged on lines along the top, wooden type cases on the far wall, a plank floor along the bottom. Keep the middle open, because letters flutter through it. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/newspaper-peeper.jpg .
```

### IC-S08 · Pincushion Piffle scene

- **File:** `icecreamcone/game/assets/scenes/piffle.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Stitch in Time, the sewing game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/pincushion-piffle.jpg`](../reference/pincushion-piffle.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A sewing table seen from above at a slight angle: a patterned quilt laid across it, a tape measure, a spool of red thread and a pair of scissors at the edges. Keep the middle of the quilt open, because the stitching path is drawn there. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/pincushion-piffle.jpg .
```

### IC-S09 · Dollarbill Dodo scene

- **File:** `icecreamcone/game/assets/scenes/dodo.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Spot the Dodo, the shell game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/dollarbill-dodo.jpg`](../reference/dollarbill-dodo.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A shop counter in an old general store: a polished wooden counter top across the lower third, a brass till at the far left, shelves of jars behind. Keep the counter top clear, because the hats the Dodo hides under go there. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/dollarbill-dodo.jpg .
```

### IC-S10 · Safecrossing Crow scene

- **File:** `icecreamcone/game/assets/scenes/crow.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Safe Crossing, the traffic game.
- **Stand-in until delivered:** A simple painted-in-code version of the same place.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A small-town street crossing seen from slightly above: a road runs straight across the middle of the picture from left to right, with a striped zebra crossing in its centre, a pavement in the foreground at the bottom and another along the far side, old shop fronts and a tree behind. The road and pavements are empty of cars and people. For the drawing style, palette and mood, look at the reference photo of the book, https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

## Sprites and variants

What the minigames need beyond one still portrait per bird, found while building them and checking them with the first art. A portrait can only breathe and hop, so a bird that steps, grows, sings or changes shows that with these variants; and the props each game still draws in code (scoops, hats, cars, stones, hiding places) get painted versions so nothing drawn in code sits on top of a painted scene. Every variant must match its delivered portrait exactly in design, colours and line (the portrait in game/assets/birds/ is the reference), drawn at the same scale and facing left.

### IC-P01 · Scoop Stack props

- **File:** `icecreamcone/game/assets/sprites/scoops.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Scoop Stack: the falling ice creams and the things that knock them off.
- **Stand-in until delivered:** Scoops, a cherry, a pickle and a sock drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 5 x 2 grid of ten objects, each about 300 px across: seven single round lumpy scoops of ice cream with no cone (strawberry pink, lemon yellow, vanilla cream, chocolate brown, mint green, pistachio, blueberry), seen from the side, soft and slightly melting at the bottom edge; one glossy red cherry with a stem and a tiny gold sparkle; one green dill pickle; one striped wool sock. Lumpy, crosshatched shadows, like the scoops on the Coot's cover.
```

### IC-P02 · Coot walking and looking up

- **File:** `icecreamcone/game/assets/sprites/coot-poses.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Scoop Stack: the Coot runs left and right, and looks up at the falling scoops.
- **Stand-in until delivered:** The portrait, hopping.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Ice-Cream Cone Coot (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/birds/coot.png) in two poses side by side on one sheet, each in its own half: left, mid-stride with its left leg reaching forward; right, standing with its head tipped back looking straight up, beak pointing to the sky, so a scoop can land on its head. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P03 · Cupadee, empty cup facing up

- **File:** `icecreamcone/game/assets/sprites/cupadee-open.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Tea Time: the game paints the tea inside the cup and a fill line on it.
- **Stand-in until delivered:** The game's own cup drawn over the portrait.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Cupadee (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/birds/cupadee.png) standing with its cup upright and level, not tipped, the rim seen slightly from above as a wide open ellipse so the whole empty white inside of the cup is visible, ready to be filled. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P04 · Teapot

- **File:** `icecreamcone/game/assets/sprites/teapot.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Tea Time: the teapot that tips and pours.
- **Stand-in until delivered:** A teapot drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. An old-fashioned round china teapot with a long curved spout pointing to the left, a rose pattern and a domed lid with a knob, level (not pouring), hanging from a short loop of string on its handle. Centred, filling about 70% of the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P05 · Say Cheese hiding places

- **File:** `icecreamcone/game/assets/sprites/hides.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Say Cheese: the foreground pieces the rare birds peek out from behind. Each is drawn over the meadow scene, with the bird between the scene and it.
- **Stand-in until delivered:** Bushes, a wall, a tree, a gate pillar, a hedge and grass drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six foreground pieces matching the meadow scene (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/scenes/shuttercluck.webp), each cut out cleanly at its base: a round leafy bush; a low mossy dry-stone wall section; an old tree trunk with a dark knothole halfway up (only the trunk, cut off above the knothole); a square stone gate pillar with a ball on top; a clipped hedge section; a clump of tall meadow grass and wildflowers.
```

### IC-P06 · Gullfinch singing

- **File:** `icecreamcone/game/assets/sprites/gullfinch-sing.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Wind and Sing: the Gullfinch's pose for each note the player hits.
- **Stand-in until delivered:** The portrait, breathing.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Gramophone Gullfinch (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/birds/gullfinch.png) in full song: beak wide open, head thrown back a little, crest feathers flared, a few small ink musical notes drifting out of the horn. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P07 · Plume growing, four stages

- **File:** `icecreamcone/game/assets/sprites/plume-growth.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Bloom: the plant in each Flowerpot Plume's pot as it is watered, from sprout to the book's towering bloom, and wilted.
- **Stand-in until delivered:** An ink stem, leaves and flower drawn in code over the portrait.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 1 row of four plants only (no pot, no bird), each growing up from a small mound of soil at the bottom centre of its cell, all at the same scale: 1) a short stem with four leaves; 2) a taller stem with leaves and a closed pink bud; 3) the full bloom from the book (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/flowerpot-plume.jpg ): a tall leafy stem topped by a huge rounded flower head of many petals in rose, slate blue, ochre and mauve; 4) the same tall plant wilted, the stem bent over and the flower drooping, leaves curled and brownish.
```

### IC-P08 · Bobolinks, one boot at a time

- **File:** `icecreamcone/game/assets/sprites/bobolink-boots.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Left Foot, Right Foot: each boot steps on its own.
- **Stand-in until delivered:** The pair's portrait hopping as one.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Highbutton Bobolinks (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/birds/bobolinks.png) as two separate single boots on one sheet, each in its own half: left half, the left boot alone, standing; right half, the right boot alone, standing. Same boot design as the pair, each a bird with its eye and its long white beak open upward. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P09 · Stepping stones

- **File:** `icecreamcone/game/assets/sprites/stones.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Left Foot, Right Foot: the stones across the moonlit stream.
- **Stand-in until delivered:** Flat discs drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six flat, rounded river stepping stones seen from a low side angle, wet on top and catching pale moonlight, with a thin ring of dark water ripple around each base, for a night scene (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/scenes/bobolinks.webp).
```

### IC-P10 · Newsprint scraps

- **File:** `icecreamcone/game/assets/sprites/scraps.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Hot off the Press: the scraps the letters are printed on as they flutter down.
- **Stand-in until delivered:** Paper rectangles drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 2 grid of eight small torn scraps of old newspaper, each roughly square with ragged torn edges, slightly curled, with faint grey columns of tiny print and a blank cream patch in the middle (the game prints a big letter there).
```

### IC-P11 · Hats

- **File:** `icecreamcone/game/assets/sprites/hats.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Spot the Dodo: the hats on the shop counter that the Dodo hides under.
- **Stand-in until delivered:** Hats drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 1 row of three gentleman's hats seen from the side, sitting on their brims: a black bowler with a plum band, a tall black top hat with a grey band, and a brown bowler with a faded green band. Each about the same width.
```

### IC-P12 · Old cars

- **File:** `icecreamcone/game/assets/sprites/cars.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Safe Crossing: the cars that stop and go at the Crow's light.
- **Stand-in until delivered:** Simple cars drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 2 grid of four small rounded 1930s motor cars in side view, all facing left (the game mirrors them for the other lane): dusty pink, pale blue, mustard yellow and sage green, with running boards, round headlamps and spoked wheels, for a small-town street (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/scenes/crow.webp).
```

### IC-P13 · Little crossing birds

- **File:** `icecreamcone/game/assets/sprites/chicks.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Safe Crossing: the little birds that wait on the pavement and cross on red.
- **Stand-in until delivered:** Small ink birds drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six small round sparrow-like birds facing left, in soft browns, buffs and dusty pinks with round staring eyes and thin legs, in the book's odd, gentle way: three standing waiting, two mid-step walking, one flapping off in a fright.
```
