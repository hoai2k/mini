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

84 requested, 67 delivered, 1 retired, 152 in total.

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
- **Used for:** Nothing any more: the game dropped medals for a best score and New World Records. Kept, delivered, in case it is wanted again; the game does not load it.
- **Stand-in until delivered:** None.
- **Status:** retired

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

### IC-S11 · Ice-Cream Cone Coot scene, wide

- **File:** `icecreamcone/game/assets/scenes/coot-wide.webp`
- **Size:** 3840 x 2160, opaque
- **Used for:** Scoop Stack, once the stack grows tall: the camera pulls back over it, so the seaside shrinks with the Coot instead of the Coot shrinking on a fixed backdrop.
- **Stand-in until delivered:** The delivered scene stays fixed and only the Coot and its scoops shrink.
- **Reference:** [`reference/cover-ice-cream-cone-coot.jpg`](../reference/cover-ice-cream-cone-coot.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). The same sunny seaside promenade as the existing scene (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/scenes/coot.webp), seen from twice as far away: extend that picture outwards on every side, keeping it unchanged, as if the camera had pulled straight back. The existing picture must sit, at exactly half the width and half the height of this one, in the region from 25% to 75% across and from 46.7% to 96.7% down, with the boardwalk, the railing, the sea's horizon and the ice-cream cart all continuing seamlessly out of it at the same height. Below it, a little more of the near boardwalk planks fills the bottom 3.3%. To the left and right, the promenade goes on: more railing posts, the boardwalk, the sea and the far headland with its lighthouse on the left, and a bench or a lamp post on the right. Above it, a tall, open, pale summer sky with a few soft clouds, seagulls far off and nothing else, because ice-cream scoops fall through all of it. Keep the horizon a straight level line. Wide 16:9.
```

## Shuttercluck's subjects: the book's other birds

Say Cheese photographs the undiscovered birds, the ones you don't play as: these are the rest of Lobel's birds: the 18 of the book's 28 that the field guide doesn't have a page for, so that every bird in the book has a painting. The names come from the book as quoted in its descriptions and reviews; most birds are matched to the crowded yellow endpapers (reference/endpapers-all-birds.jpg), where each prompt says where to look. Four are named but not found in our photos, so they are drawn from their names; two endpaper birds (the saw and the radio) are in the pictures but their names were not found, so they have plain names for now. The Drippet as the tap is a likely match, not a certain one. Each is drawn like the field-guide portraits, at the same framing, because the game raises them over hedges, walls and the knothole the same way.

### IC-R01 · The Milkbottle Midge

- **File:** `icecreamcone/game/assets/subjects/milkmidge.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A small glass milk bottle full of white milk with a foil cap for a crest, tiny wings, one eye and a short beak, standing on two little legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (the white bottle bird near the middle of the left-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R02 · The Waterglass Goose

- **File:** `icecreamcone/game/assets/subjects/waterglassgoose.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/newspaper-peeper.jpg`](../reference/newspaper-peeper.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A plain white drinking glass (a tumbler) tipped on its side as the body, a long pale goose neck and small head rising from it, dark tail feathers, on long thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/newspaper-peeper.jpg (the white tumbler bird on the page facing the Newspaper Peeper), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R03 · The Jackknife Niffy

- **File:** `icecreamcone/game/assets/subjects/niffy.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A red folding pocketknife with its blades half open like wings and a sharp blade for a beak, a small round eye on the handle's end. A little menacing, as in the book. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (top left of the left-hand page, flying), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R04 · The Cutitup Snippit

- **File:** `icecreamcone/game/assets/subjects/snippit.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A pair of pink-handled dressmaker's scissors: the long blades are the beak, the hinge screw its one eye, the finger loops its body, with fluttery pink tail feathers and thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (the pink scissors bird, upper left of the left-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R05 · The Buttonbeaks

- **File:** `icecreamcone/game/assets/subjects/buttonbeaks.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. Named in the book but not found in the photos, so drawn from its name: a pair of small round birds whose beaks and eyes are big sewing buttons with thread holes, plump bodies of button-sized feathers, on thin legs, standing side by side. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and palette, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-R06 · The Broomwhisk

- **File:** `icecreamcone/game/assets/subjects/broomwhisk.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A tall straw broom standing on its bundled bristles, which splay out like a skirt of tail feathers, with a slim bird's head and neck where the handle ends. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (bottom left of the left-hand page, standing on its bristles), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R07 · The Key Crane

- **File:** `icecreamcone/game/assets/subjects/keycrane.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A long old brass door key laid flat as the body, its ring bow as a round head with one eye, the bit's teeth as a little tail, with a dark crest like a top hat and long thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (top right of the right-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R08 · The Garbage Canary

- **File:** `icecreamcone/game/assets/subjects/garbagecanary.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A dented grey galvanised dustbin with its lid tipped up like a cap, a yellow canary's head peering out from under the lid, scraps of paper for tail feathers, on thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (the dented dustbin bird, left of the left-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R09 · The Steampresser Sparrow

- **File:** `icecreamcone/game/assets/subjects/steampressersparrow.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. Named in the book but not found in the photos, so drawn from its name: an old cast-iron steam iron as the body, puffs of steam from its sole like ruffled feathers, the handle arching over its back like folded wings, a sparrow's brown head and beak at the point. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and palette, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-R10 · The Wetweather Wren

- **File:** `icecreamcone/game/assets/subjects/wetweatherwren.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. Named in the book but not found in the photos (a review says its picture shows rain), so drawn from its name: a small round furled black umbrella with a crook handle for a tail, a tiny wren's head with one bright eye at the tip, rain falling on it, thin legs in a puddle. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and palette, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-R11 · The Glove Dove

- **File:** `icecreamcone/game/assets/subjects/glovedove.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A long pink rubber washing-up glove, fingers splayed back as a crest of tail feathers, the cuff as a long neck ending in a head with one eye and a long beak, over a scalloped grey-blue feathered body, on two thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (the long pink glove bird, middle of the right-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R12 · The Ten O'clock Tit Trush

- **File:** `icecreamcone/game/assets/subjects/titthrush.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A round gold pocket watch with its lid open, its face showing ten o'clock as a big round body, the winding crown as a little head and beak, a short chain for a tail, pink plumes. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (the yellow pocket watch bird, middle of the left-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R13 · The Plugsocket Swift

- **File:** `icecreamcone/game/assets/subjects/plugsocketswift.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A high-voltage bird: its head is an old clear light bulb with a glowing filament and one eye, on a brass screw cap neck, its body an old round wall plug socket, with swept-back swift's wings and a trailing flex for a tail. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (the light bulb bird, upper middle of the right-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R14 · The Saltshaker Shrike

- **File:** `icecreamcone/game/assets/subjects/saltshakershrike.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. Named in the book but not found in the photos, so drawn from its name: a glass salt shaker with a domed perforated silver cap as the head, a shrike's hooked beak and black eye mask, a few grains of salt falling, on thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and palette, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-R15 · The Soupladle Lark

- **File:** `icecreamcone/game/assets/subjects/ladlelark.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A grey enamel soup ladle: the round bowl is the body, the long hooked handle a curving neck with a small head and beak at its end, on two thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (the grey ladle bird, middle left of the left-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R16 · The Drippet

- **File:** `icecreamcone/game/assets/subjects/drippet.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A blue-painted brass water tap: the spout is the beak with a drip at its tip, the cross handle on top a crest, one round eye on the body, leaving a little puddle wherever it runs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (most likely the blue tap bird, bottom left of the left-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R17 · The Saw Bird (name not found)

- **File:** `icecreamcone/game/assets/subjects/sawbird.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A long carpenter's handsaw: the toothed blade is a long serrated beak, the wooden handle the head and body with one eye, with a few feathers and thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (the handsaw across the middle of the right-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

### IC-R18 · The Radio Bird (name not found)

- **File:** `icecreamcone/game/assets/subjects/radiobird.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck): it peeks out of a hiding place to be photographed.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Reference:** [`reference/endpapers-all-birds.jpg`](../reference/endpapers-all-birds.jpg)
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A small 1960s portable transistor radio with a carrying handle and a speaker grille as the body, a long curving striped neck with a crested head, and long thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Match this bird as the book shows it in the reference photo https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg (the portable radio bird, bottom of the right-hand page), keeping its shapes and colours, but as a clean new full-colour painting of the bird alone (no book, page, hands or other birds).
```

## In our pocket: ten new rare birds

A second flock in Lobel's manner, invented here, for when the field guide grows beyond the book's own birds. Until then they have no page, but they are among the undiscovered birds that Shuttercluck photographs in Say Cheese. Each note says what its game might be. Same framing as the portraits, so any of them can become a page later.

### IC-N01 · The Hourglass Heron

- **File:** `icecreamcone/game/assets/pocket/hourglassheron.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Turn it over at the right moment to keep the sand running.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A tall wooden-framed hourglass as the body, pale sand trickling from the top bulb to the bottom, a long heron's neck and dagger beak rising from the top of the frame, on very long legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-N02 · The Spectacle Snipe

- **File:** `icecreamcone/game/assets/pocket/spectaclesnipe.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Spot the differences through its lenses.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A pair of round wire-rimmed spectacles: the two lenses are its two big round eyes, the bridge between them its long thin snipe's beak, the folded arms its tail, on wiry legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-N03 · The Bellows Bittern

- **File:** `icecreamcone/game/assets/pocket/bellowsbittern.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Puff a feather or the embers along at the right strength.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A pair of leather-and-wood fireside bellows as the body, the brass nozzle its beak, the pleated leather puffing in and out as it breathes, two handles as stubby wings. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-N04 · The Lampshade Loon

- **File:** `icecreamcone/game/assets/pocket/lampshadeloon.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Light up the moths that come to it, not the bats.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A fringed, pleated parchment lampshade as a bell-shaped body glowing softly from inside, the fringe as tail feathers, a loon's dark sleek head and neck on top, on thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-N05 · The Concertina Curlew

- **File:** `icecreamcone/game/assets/pocket/concertinacurlew.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Squeeze and stretch in time to play its tune.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A small hexagonal concertina squeezebox with patterned ends and pleated bellows as the body, a curlew's long down-curved beak from one end, buttons like a row of tiny feathers. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-N06 · The Weathervane Warbler

- **File:** `icecreamcone/game/assets/pocket/weathervanewarbler.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Turn into the wind as it changes.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A green-copper rooftop weathervane: the arrow is the body and beak, the swallow-tailed vane its tail, the N-E-S-W cross below like perched feet on a little roof ridge. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-N07 · The Mousetrap Magpie

- **File:** `icecreamcone/game/assets/pocket/mousetrapmagpie.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Grab the shiny things without setting itself off.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. The mousetrap itself is the whole torso: a flat honey-brown wooden plank with a coiled spring and snapping metal bar built into it. A yellow cheese wedge forms its head and left-pointing beak, with round cheese holes and one round staring eye set in its side. The spring bar rises as its crest. Two thin bird legs grow from the wood below, small black-and-white wing tufts from its sides, and a long blue-black magpie tail from the rear. No feathered torso or conventional magpie head beneath the trap, and no separate cheese accessory sitting on top. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-N08 · The Hatbox Hoopoe

- **File:** `icecreamcone/game/assets/pocket/hatboxhoopoe.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Catch the hats that blow off people's heads.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A round striped hatbox with its lid lifting like a crest of hoopoe feathers, a long thin curved beak, a ribbon bow, on thin legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-N09 · The Candlestick Kiwi

- **File:** `icecreamcone/game/assets/pocket/candlestickkiwi.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Shelter its flame from the draughts.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A brass candlestick with a dripping white candle whose small flame is its crest, a round kiwi body in the saucer at the bottom, a long thin kiwi beak, short sturdy legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

### IC-N10 · The Rollingpin Rail

- **File:** `icecreamcone/game/assets/pocket/rollingpinrail.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Say Cheese (the Shuttercluck), as one of the undiscovered birds it photographs; later, a page of its own. A game idea: Roll out the pastry evenly before it tears.
- **Stand-in until delivered:** The object drawn in code in ink and wash, with an eye, a beak and legs.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The bird IS the object: a real, clearly recognisable everyday object that has come alive as a bird, with a round staring eye with a dot pupil, a long pointed beak, little wings or plumes, and long, thin, knobbly bird legs ending in spiky claws, growing naturally out of it, so the object's shape still reads at a glance. Calm and a little odd, not a cartoon mascot: no human expression, no smile. A floury wooden rolling pin laid flat as the body, the handles as a stubby tail and a neck with a small rail's head and beak, on quick little legs. Full-body portrait of the bird alone, standing in a three-quarter view facing left, filling about 80% of a square frame, centred, with a clean silhouette that still reads at 96 px. Only a small soft shadow under the feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. For the drawing style and the way the object becomes a bird, look at the book's birds in https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/endpapers-all-birds.jpg .
```

## New minigames: the book's other birds

Scenes, sprites and variants for the minigames of the book's 18 birds that are joining the field guide (their portraits are the IC-R requests above). Each bird's requests are kept in design/source/more/<bird>.json beside this script. The birds join the guide once these are delivered; until then their games draw stand-ins (try them with ?more).

### IC-M01a · Milk Round: the street at dawn

- **File:** `icecreamcone/game/assets/scenes/milkmidge.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Milk Round (the Milkbottle Midge): the background behind the scrolling houses, the milk float and the flying bottles.
- **Stand-in until delivered:** A dawn sky, a line of distant rooftops, a green haze of back gardens, the pavement and the road, painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A quiet suburban street at dawn, seen straight from the side, as one long even strip that could carry on to the left and right. Top 35%: a pale early-morning sky, lemon and dusty pink near the horizon, with a low sun just risen on the right (about 78% across, 25% down). From about 20% to 40% down: a soft, faded line of distant rooftops and chimney pots, far away and pale. From 40% to 74% down: a plain, quiet haze of back gardens and hedges in soft sage green, with no houses, gates or paths in it, because the game draws the near houses, their front gardens and their fences over this band. From 74% to 81% down: a plain pale grey pavement, empty. At 81% a stone kerb. From 81% to the bottom: an empty grey road with faint pale centre dashes at about 89% down. No milk float, no houses close up, no people, no animals, no cars.
```

### IC-M01b · Milk Round: house fronts

- **File:** `icecreamcone/game/assets/sprites/milk-houses.png`
- **Size:** 2048 x 1536, transparent
- **Used for:** Milk Round: the houses the float passes, set back at different depths behind their gardens; the game picks one per house and scales it smaller the further back it stands.
- **Stand-in until delivered:** Plain coloured boxes with a roof, two windows and a door, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six small, different terraced and cottage house fronts seen straight on, each about 420 px wide and 520 px tall including its roof and chimney, each in a different soft colour (dusty pink, lemon, sage, mauve, ochre, cream brick), each with two windows and one front door in the middle of the bottom edge, and a plain flat stone doorstep across the very bottom in the centre, in front of the door. The house stops at the doorstep: no garden, path, fence, ground, people or bottles. Nothing written on the doors.
```

### IC-M01c · Milk Round: bottles, dogs and cards

- **File:** `icecreamcone/game/assets/sprites/milk-props.png`
- **Size:** 1536 x 1024, transparent
- **Used for:** Milk Round: the pint bottle in flight and on the doorsteps, a smashed bottle, the sleeping and barking dogs, the card that says no milk today, and the doormat that marks a house waiting for its pint.
- **Stand-in until delivered:** A bottle, a milk splash, a curled-up dog, a standing dog, a white card reading NO MILK and a yellow mat, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six objects, each about 380 px at its longest. Top row, left to right: one full glass pint milk bottle standing upright, white milk inside, a silver foil cap; a small splash of spilt milk on the ground with a few broken glass shards and a crumpled silver cap, seen from the side and slightly above, flat and wide; a scruffy brown terrier curled up asleep with its eyes shut, facing left. Bottom row: the same terrier standing on all four legs, wide awake, barking with its mouth open and its ears up, facing left; a small white card hanging from a loop of string, with a simple picture on it of a milk bottle crossed out with a red line (a picture only, no letters or words); a small plain doormat, seen from the side and slightly above, flat and wide, in mustard yellow.
```

### IC-M01d · Milk Round: the milk float

- **File:** `icecreamcone/game/assets/sprites/milk-float.png`
- **Size:** 1536 x 1024, transparent
- **Used for:** Milk Round: the electric milk float the Midge rides on, shown at the bottom left of the screen (the game turns it to drive right).
- **Stand-in until delivered:** A flatbed with three crates of bottles and a little green cab, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A small old-fashioned electric milk float seen exactly from the side, facing left: a small rounded cab with a windscreen at the left end, a long low open flatbed behind it carrying three wooden crates full of white milk bottles with silver caps, four small black wheels, painted sage green and cream. The crates at the back (right) end make a flat place to stand on. Filling about 90% of the frame width, centred, wheels near the bottom. No driver, no lettering, no number plate. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M01e · Milk Round: the Midge throwing

- **File:** `icecreamcone/game/assets/sprites/midge-throw.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Milk Round: the Midge winds up while the action is held, then flings the bottle when it is let go (the game turns it to face right).
- **Stand-in until delivered:** The portrait, leaning back and squashing a little as it winds up.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Milkbottle Midge (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/milkmidge.png) in two poses side by side on one sheet, each in its own half, both facing left: left, winding up, leaning back with one little wing raised behind its head holding a full pint milk bottle with a silver cap, ready to throw; right, the follow-through, leaning forward with the wing swept forward and empty, as if it has just lobbed the bottle up and away. Feet in the same place in both. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M01f · Milk Round: the Midge pleased and startled

- **File:** `icecreamcone/game/assets/sprites/midge-moods.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Milk Round: the Midge for a moment after each bottle lands: pleased when a pint reaches its step, startled when a bottle smashes, a dog wakes or a bottle comes back (the game turns it to face right).
- **Stand-in until delivered:** The portrait, hopping when pleased and shivering when startled.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Milkbottle Midge (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/milkmidge.png) in two poses side by side on one sheet, each in its own half, both facing left with empty wings and its feet in the same place: left, pleased, standing tall and proud on tiptoe, both little wings raised, beak lifted, its milky body brimming; right, startled, flinching back with its wings up by its foil-capped head, eye wide, knees bent, a few drops of milk sloshing out of its neck. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M02a · Glass Harp: the table by the window

- **File:** `icecreamcone/game/assets/scenes/waterglassgoose.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Glass Harp (the Waterglass Goose): the background, a table where the glasses stand.
- **Stand-in until delivered:** A warm wall, a window with a moon, a lamp's glow and a wooden table, painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A cosy old-fashioned room in the evening, seen straight on. A plain warm cream wall with faded patterned wallpaper fills the top three quarters. On the right, a small window (about 74% to 92% across, 10% to 47% down) shows a dusky blue evening sky with a pale moon. On the left, the soft yellow glow of a lamp just out of the picture warms the wall. Across the whole width, a long polished wooden table: its far edge at about 74% down, its top surface a band from 74% to 81% down with a long white lace runner along it, and its plain front panel from 81% to the bottom. The table top is completely bare and the wall above it, between 15% and 78% across, is quiet and plain, because the game stands a row of glasses and the bird there. No glasses, cups, people or animals.
```

### IC-M02b · Glass Harp: a tumbler, whole and cracked

- **File:** `icecreamcone/game/assets/sprites/harp-glass.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Glass Harp: each glass on the table; the game paints the coloured water inside it, at a different level for each note, and swaps to the cracked one after a wrong tap.
- **Stand-in until delivered:** A clear glass outline with a rim ellipse and a glint, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 1 grid of two tall, plain, straight-sided drinking tumblers seen from the side at eye level, very slightly wider at the rim than at the base, each about 260 px wide and 500 px tall: left, the empty glass whole; right, the same empty glass with a jagged crack running down from the rim. Drawn as clear glass: only the outline, the rim ellipse, the thick base and a few white highlights and soft grey reflections; the inside of the glass must be fully transparent (no tint, no fill, no water) so the game can paint water inside it. Same size and position in both cells.
```

### IC-M02c · Glass Harp: the Goose tapping and honking

- **File:** `icecreamcone/game/assets/sprites/goose-tap.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Glass Harp: the Goose taps a glass with its beak as it plays the tune (and as you tap), and honks with pride when a tune is played back right.
- **Stand-in until delivered:** The portrait, leaning towards the glass.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Waterglass Goose (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/waterglassgoose.png) in two poses side by side on one sheet, each in its own half, both facing left: left, its long neck bent forward and down so the tip of its beak reaches out to the left at about the height of its own glass body's rim, as if tapping a glass that stands just in front of it; right, its neck stretched straight up, beak open to the sky, honking happily. Body and feet in the same place in both. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M02d · Glass Harp: the Goose walking and recoiling

- **File:** `icecreamcone/game/assets/sprites/goose-moves.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Glass Harp: the Goose stepping along the table from glass to glass, and jerking back when a glass cracks or it is too slow.
- **Stand-in until delivered:** The portrait, bobbing as it slides along, and shaking and leaning back on a crack.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Waterglass Goose (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/waterglassgoose.png) in two poses side by side on one sheet, each in its own half, both facing left: left, walking mid-stride, one long leg lifted and reaching forward, neck held level, the water in its glass body tilting a little; right, recoiling in dismay, neck pulled back in an S, beak open, wings flung up, its water sloshing up the side of the glass. Body at the same height in both. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M03a · Snip Snap: the park promenade

- **File:** `icecreamcone/game/assets/scenes/niffy.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Snip Snap (the Jackknife Niffy): the background; people walk along the promenade at the bottom, the Niffy flies in the sky above, and the Park Keeper stands on the right.
- **Stand-in until delivered:** Sky, a row of round trees, a pond, gravel, iron railings and the promenade, painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A town park on a fresh spring morning, seen straight from the side. The top half is a wide, pale, open sky with a few soft clouds, kept quiet because the bird flies there. A bare-ish branch reaches in from the top-left corner (from the left edge at about 23% down, rising to about 17% down at 13% across), as a perch for a nest. From about 26% to 62% down, a row of round, gentle park trees on thin trunks along the back. From 58% to 66% a strip of a calm pond, then a band of pale gravel from 66% to 78%, and a low black iron railing along it at about 71% to 78% down. From 78% to the bottom: a wide, plain, empty paved promenade where people will walk, with faint paving lines. On the right (around 85% to 95% across) the gravel behind the railing is open and plain, where the park keeper stands. No people, birds, dogs, benches in front or signs.
```

### IC-M03b · Snip Snap: the passers-by

- **File:** `icecreamcone/game/assets/sprites/niffy-walkers.png`
- **Size:** 2048 x 1536, transparent
- **Used for:** Snip Snap: the people strolling along the promenade; the game hangs the feathers, flowers, threads, tags and balloons on them and bobs them as they walk (turned round for those walking right).
- **Stand-in until delivered:** Coated figures with a round head and a hat, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six townsfolk out for a stroll, in Arnold Lobel's gentle, slightly old-fashioned 1970s picture-book manner, each a full figure walking mid-stride, facing left, about 560 px tall (the child about 380 px): a tall gentleman in a long grey coat and a bowler hat; a lady in a mauve coat and a wide round hat; a stout man in a mustard overcoat and a flat cap; an old lady with a handbag and a small felt hat; a young man in a brick-red jacket and a trilby; and (bottom right) a small child in a blue coat with one hand held up, empty, as if holding a balloon string. Plain clothes with nothing pinned or hanging on them: no feathers, flowers, badges, tags or balloons (the game adds those). Kind, calm faces in profile.
```

### IC-M03c · Snip Snap: things to snip, and the nest

- **File:** `icecreamcone/game/assets/sprites/niffy-props.png`
- **Size:** 1536 x 1024, transparent
- **Used for:** Snip Snap: what the people carry (and the Niffy snips), a child's balloon, and the Niffy's nest where its snippings go.
- **Stand-in until delivered:** A pink feather, a pink flower, a yellow thread, a white tag, a red balloon and a brown nest, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six objects. Top row, left to right: a long curling magenta hat feather (about 300 px long); a small pink buttonhole flower with a short stem; a loose yellow thread dangling in a wavy line with a little loop at the end. Bottom row: a small white paper price tag on a loop of thin string, blank (no writing or numbers); a round red toy balloon with a little knot at the bottom and no string; a small round bird's nest of twigs, seen from the side, holding a few bright snippings (a feather, a flower, a thread).
```

### IC-M03d · Snip Snap: the Park Keeper

- **File:** `icecreamcone/game/assets/sprites/park-keeper.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Snip Snap: the Park Keeper, who watches the pond with his back turned, then glances over his shoulder (the warning), then turns to look up at the sky.
- **Stand-in until delivered:** A stout figure in a green coat and peaked cap, drawn in code with a big eye above him while he looks.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 1 grid of the same stout, kindly park keeper in a long bottle-green coat with brass buttons and a peaked cap, a whistle on a chain, about 900 px tall, standing in the same place in each cell: left, seen from behind with his back to us and his hands behind his back, looking away at a pond; middle, still with his back to us but his head turned over his shoulder, one eyebrow raised, suspicious; right, facing us, looking up at the sky, eyebrows raised, whistle in his mouth, one finger pointing up. A storybook grown-up, stern but not frightening.
```

### IC-M03e · Snip Snap: the Niffy swooping

- **File:** `icecreamcone/game/assets/sprites/niffy-dive.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Snip Snap: the Niffy on the way down with its blade open, and on the way back up with it snapped shut (the game tilts it nose-down into the swoop).
- **Stand-in until delivered:** The portrait, tilted nose-down.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Jackknife Niffy (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/niffy.png) in two poses side by side on one sheet, each in its own half, both flying level and facing left, legs tucked back: left, its little wings swept back and its knife blade (its beak) open wide, pointing ahead; right, the blade snapped shut like a closed pocketknife, wings beating up. Same size in both. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M03f · Snip Snap: the Niffy hovering and dazed

- **File:** `icecreamcone/game/assets/sprites/niffy-fly.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Snip Snap: the Niffy hovering over the promenade between swoops (two frames, flapping), and dazed after the Keeper whistles at it.
- **Stand-in until delivered:** The standing portrait, bobbing in the sky, and wobbling when dazed.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Jackknife Niffy (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/niffy.png) in three poses side by side on one sheet, each in its own third, all in the air facing left with the legs tucked up under the red body and the knife blade (its beak) half open: left, hovering with its little wings raised high; middle, the same with its wings pressed down (the other half of a flap); right, dazed and tumbling, tipped over sideways, wings askew, the blade folded shut, its eye a dizzy spiral. Same size in all three. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M04a · Snip the String: the fairground fence

- **File:** `icecreamcone/game/assets/scenes/snippit.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Snip the String (the Cutitup Snippit): the whole background. The balloons, their strings, the knots and the Snippit are drawn on top.
- **Stand-in until delivered:** A pale sky, soft hills, a striped tent and a wooden rail fence painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). The edge of a small country fair on a breezy summer afternoon, seen straight on. Across the lower part runs a long plain wooden rail fence from edge to edge: its top rail is a level horizontal bar about 79% of the way down the picture, a second rail about 87% down, and simple square posts every eighth of the width reaching to the bottom edge. In front of the fence a strip of short grass fills the bottom. Behind it, low rolling meadow hills, and a single small striped pink-and-cream fair tent far off at the right edge, below the 60% line. The sky above is pale and soft with two or three small flat clouds kept to the very top corners. Keep the whole middle of the sky, from 15% to 65% down, empty and quiet, and keep the top rail plain and uncluttered along its whole length, because the game hangs a bunch of balloons there and ties their strings to that rail.
```

### IC-M04b · Balloons and kites

- **File:** `icecreamcone/game/assets/sprites/balloons.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Snip the String: the balloons and kites tied in the tangle, and the one shown on the tag. The game draws their strings.
- **Stand-in until delivered:** Round balloons and diamond kites drawn in code in six washes.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 6 x 2 grid of twelve objects, each about 300 px tall. Top row: six round party balloons, slightly egg-shaped, each with a small tied knot at the bottom and a soft pale highlight, in this order from left to right: strawberry pink, lemon yellow, slate blue, sage green, mauve, orange. Bottom row: six small diamond-shaped paper kites with a thin cross of sticks and a short tail of two little paper bows, in the same six colours in the same order. No strings on any of them (the game draws the strings from the balloon's knot or the kite's bottom point).
```

### IC-M04c · Cutitup Snippit snipping

- **File:** `icecreamcone/game/assets/sprites/snippit-snip.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Snip the String: the Snippit walks along the fence with its blades open and shuts them on the string it snips.
- **Stand-in until delivered:** The Snippit's stand-in, tipping as it snips, with ink strokes for the closing blades.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Cutitup Snippit (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/snippit.png) in two poses side by side on one sheet, each in its own half, standing on its legs and facing left: left, the scissor blades (its beak) held wide open, ready to cut; right, the blades snapped shut, with the bird leaning a little forward as it snips. The hinge, its eye, at the same height in both. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M04d · Cutitup Snippit walking, jammed and watching

- **File:** `icecreamcone/game/assets/sprites/snippit-poses.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Snip the String: the Snippit striding along the fence (alternating with its open-bladed stand from IC-M04c), stuck after a wrong snip, and watching the right balloon float away.
- **Stand-in until delivered:** Its stand-in, rocking as it walks, shaking when jammed and tipping back when a balloon goes.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Cutitup Snippit (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/snippit.png) in three poses in a row on one sheet, each in its own third, facing left, blades open in all three: left, mid-stride, one long leg reaching forward and the other pushing off behind; middle, jammed, the blades stuck half open and twisted askew, its eye wide, legs braced apart; right, standing tall with its head and open blades tipped back to look straight up at the sky, watching something float away. The hinge, its eye, at about the same height in all three. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M05a · Button Up: the washing line

- **File:** `icecreamcone/game/assets/scenes/buttonbeaks.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Button Up (the Buttonbeaks): the whole background. The washing line, the coats, the button tin and the birds are drawn on top.
- **Stand-in until delivered:** Sky, a hedge, two wooden posts and a grey-blue tin painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A back garden on a fresh, breezy washing day, seen straight on. Two tall plain wooden clothes posts stand at the far left and far right edges, their tops about 16% of the way down, with nothing strung between them (the game draws the line). Behind, a low clipped hedge about 70% down, a soft lawn below it, and a pale sky with a few small clouds near the top corners. Across the bottom, from 12% to 88% of the width and from 90% down to the bottom edge, the long open lid-side of an old blue-grey tin sewing box, seen from the front, its top edge level. Keep the sky between the posts (from 18% to 55% down) completely clear, and the lawn above the tin quiet, because coats travel along the line there and the birds walk in front of the tin.
```

### IC-M05b · Buttons

- **File:** `icecreamcone/game/assets/sprites/buttons.png`
- **Size:** 1536 x 1024, transparent
- **Used for:** Button Up: the buttons in the bowls, the one the Buttonbeaks carry and toss, and the ones sewn on. Each hole's missing button is drawn in code as a ghost of it.
- **Stand-in until delivered:** Buttons drawn in code: round, square and flower-shaped, with two or four thread holes.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six large sewing buttons seen flat from the front, each about 360 px across, in this order, row by row: 1, a round strawberry-pink button with a raised rim and four thread holes; 2, a round slate-blue button with a raised rim and two thread holes; 3, a square lemon-yellow button with rounded corners and four thread holes; 4, a sage-green flower-shaped button with five round petals and two thread holes; 5, a square strawberry-pink button with rounded corners and two thread holes; 6, a slate-blue flower-shaped button with five round petals and four thread holes. The holes clearly visible and evenly placed, a little shine on each.
```

### IC-M05c · Coats on the line

- **File:** `icecreamcone/game/assets/sprites/coats.png`
- **Size:** 2048 x 768, transparent
- **Used for:** Button Up: the clothes that travel along the washing line. The game adds the clothes pegs, and the buttonholes and buttons down the middle.
- **Stand-in until delivered:** Coats drawn in code in mustard, olive, pink, ochre and blue-grey washes.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 1 row of four children's garments hanging flat and straight, front view, each filling its cell's height (about 700 px tall), with their shoulders level along the top: a mustard wool coat with long sleeves, an olive knitted cardigan, a dusty-pink waistcoat with no sleeves, a pale blue-grey jacket. Each is open-necked with a small collar and closes down the exact vertical centre line with a plain flat placket that has NO buttons and NO buttonholes and nothing else on it (the game adds them down the middle); any pockets are low and well to the sides. No pegs, hangers or line.
```

### IC-M05d · Button bowl

- **File:** `icecreamcone/game/assets/sprites/button-bowl.png`
- **Size:** 512 x 512, transparent
- **Used for:** Button Up: each bowl in the open tin that holds one kind of button (the game piles the buttons in it).
- **Stand-in until delivered:** A wooden bowl drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A single small, shallow, round turned-wood bowl seen from the front and a little above, so its open inside shows as a wide dark ellipse, empty, warm honey-brown with a fine grain. Centred, filling about 80% of the width. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M05e · Buttonbeaks holding and tossing a button

- **File:** `icecreamcone/game/assets/sprites/buttonbeaks-toss.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Button Up: the Buttonbeaks carry a button between them and toss it up into a coat (the game draws the button).
- **Stand-in until delivered:** Their stand-in, hopping, with the button drawn above them on a loop of thread.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Buttonbeaks (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/buttonbeaks.png), the pair together, in two poses side by side on one sheet, each in its own half, facing left: left, standing close together with their beaks raised and touching at the tips, as if holding something small up between them; right, both springing up on their toes with their beaks flung up towards the sky, having just tossed it. Nothing held in the beaks (the game draws the button). Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M05f · Buttonbeaks walking, pecking, dazed and cheering

- **File:** `icecreamcone/game/assets/sprites/buttonbeaks-poses.png`
- **Size:** 4096 x 1024, transparent
- **Used for:** Button Up: the pair walking empty-beaked (alternating with the portrait), pecking a button out of a bowl, dizzy after a wrong button, and hopping for joy when one is sewn on.
- **Stand-in until delivered:** Their stand-in, bobbing as they walk, shaking when dazed and jumping when a button is sewn on.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Buttonbeaks (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/buttonbeaks.png), the pair together, in four poses in a row on one sheet, each in its own quarter, facing left, nothing in their beaks: 1, walking side by side mid-stride, each with one leg reaching forward; 2, both bending down low, beaks pointing down to peck at something on the ground in front of them; 3, dizzy, both reeling and leaning against each other, heads tilted, legs wobbly, eyes wide; 4, both hopping up off the ground together for joy, beaks open and pointing up, little tail plumes raised. The same size in each, feet at the bottom of the cell. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M06a · Clean Sweep: the courtyard

- **File:** `icecreamcone/game/assets/scenes/broomwhisk.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Clean Sweep (the Broomwhisk): the whole background. The leaves, the dust, the dustpan and the broom are drawn on top.
- **Stand-in until delivered:** A plastered wall with a window and a blue door, a fig tree in a tub, and flagstones in perspective, painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A small sunny paved courtyard behind a house, seen from slightly above. The back wall, warm cream plaster, fills the top half down to a straight horizontal line where it meets the floor, 52% of the way down. In the wall: a small four-paned window left of centre and a plain slate-blue wooden door right of centre. At the top left a fig tree in a big terracotta tub stands against the wall, its broad leafy branches overhanging the top of the picture towards the middle. The floor below is wide, plain, pale stone flagstones in gentle perspective, from the wall line to the bottom edge and from side to side, clean and empty, with no leaves, puddles, furniture or plants on it. Keep the whole floor clear and evenly lit, because the leaves, the dust and the broom move all over it.
```

### IC-M06b · Leaves and dust

- **File:** `icecreamcone/game/assets/sprites/sweepings.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Clean Sweep: what the Broomwhisk sweeps (leaves lie flat on the floor; the game turns them as they slide).
- **Stand-in until delivered:** Leaf shapes and a fuzzy grey dust ball drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 2 grid of eight small things lying on a floor, seen from above at a slant, each about 300 px across, row by row: 1, an olive-green fig leaf; 2, a mustard-yellow leaf; 3, a brick-red leaf; 4, a sage-green leaf, all four lying flat, pointing right; 5, a fluffy grey ball of dust with a few hairs and threads sticking out; 6, a small curled grey feather; 7, a shining golden leaf, the same shape as the first, with a tiny sparkle; 8, a crumpled pink sweet wrapper.
```

### IC-M06c · Dustpan

- **File:** `icecreamcone/game/assets/sprites/dustpan.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Clean Sweep: the dustpan the leaves are swept into, against a side wall (the game mirrors it for the right wall) or against the back wall.
- **Stand-in until delivered:** A blue-grey dustpan drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 1 pair of the same old painted tin dustpan in pale blue-grey with a short upright handle, each about 600 px across: left, seen from the side, lying flat on the floor with its wide open mouth facing right and its handle rising up and to the left; right, seen from the front, its wide low open mouth facing straight at us and its handle rising straight up behind it. Both with a little wear and dents, sitting on the floor (bottom edge flat).
```

### IC-M06d · Broomwhisk sweeping

- **File:** `icecreamcone/game/assets/sprites/broomwhisk-sweep.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Clean Sweep: the Broomwhisk as it sweeps across the floor and as it flicks its bristles.
- **Stand-in until delivered:** Its stand-in, leaning into the sweep, with an ink swish for the flick.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Broomwhisk (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/broomwhisk.png) in two poses side by side on one sheet, each in its own half, facing left: left, mid-sweep, the handle leaning back and the straw bristles bent and dragged back to the right along the floor; right, flicking, the bristles fanned out and swept hard forward to the left with a few bits of straw flying. The bristles touch the bottom of each cell. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M06e · Broomwhisk pushing, braced and pleased

- **File:** `icecreamcone/game/assets/sprites/broomwhisk-poses.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Clean Sweep: the Broomwhisk sweeping into or out of the picture, bracing against a gust (mirrored to face the wind), and pleased when something lands in the pan.
- **Stand-in until delivered:** Its stand-in, leaning into the wind and hopping when something goes in the pan.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Broomwhisk (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/broomwhisk.png) in three poses in a row on one sheet, each in its own third, facing left: left, pushing straight ahead, the straw bristles squashed and splayed out wide on both sides along the floor; middle, braced against a strong wind blowing from the left, leaning into it, its head crest and the loose straws of its bristles streaming back to the right; right, pleased, standing tall and straight with its bristles fluffed out full and its head held high. The bristles touch the bottom of each cell. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M07a · Lucky Dip: inside the crane cabinet

- **File:** `icecreamcone/game/assets/scenes/keycrane.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Lucky Dip (the Key Crane): the whole background. The trolley, the string, the Key Crane and every prize are drawn on top.
- **Stand-in until delivered:** A wooden cabinet frame, faded wallpaper behind glass, a brass rail, a velvet floor and a wooden chute painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). Looking straight into an old wooden penny-arcade prize-crane cabinet, as if through its glass front, filling the whole picture. A dark carved wooden frame about 3% thick runs round all four edges. Across the top, about 13% of the way down (leave the strip above it plain wood and wallpaper), a single plain level brass rail runs from the left side of the cabinet to the right, polished and slightly worn. The back wall behind the glass is faded cream wallpaper with a sparse pattern of small mauve sprigs. The floor is worn dusty-rose velvet, a level strip from about 90% of the way down to the bottom frame. At the bottom left, a square-ish wooden prize chute rises from the floor: a box with a dark round hole in its top, its left edge against the frame, about 18% of the picture wide, its top at about 58% of the way down, with a small faded yellow painted arrow pointing down at the hole on the wall above it. Everything else is empty: keep the whole space between the rail and the floor, from 18% to 88% down and from the chute to the right edge, plain and quiet (just the wallpaper), because the game hangs the crane from the rail there and piles the prizes on the velvet floor.
```

### IC-M07b · Lucky Dip prizes

- **File:** `icecreamcone/game/assets/sprites/keycrane-prizes.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Lucky Dip: the lost-property trinkets in the jumble that the Key Crane hooks and carries to the chute. The game draws a wire ring on top of each, at its own size (the rings shrink as the game goes on).
- **Stand-in until delivered:** A lantern, a birdcage, a pocket watch, a handbag, a basket, a bell, a kettle and an alarm clock drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 2 grid of eight old-fashioned lost-property trinkets, each standing upright on its base in side view, each about 280 px tall, all to the same scale. Top row, left to right: a small brass carriage lantern with a lit candle inside; a domed wire birdcage with a wooden base, empty; a shining golden pocket watch with a white face standing on its edge, clearly the most precious thing on the sheet; a mauve lady's handbag with a gold clasp. Bottom row: a woven wicker shopping basket; a brass hand bell; a slate-blue enamel kettle with a spout to the left; a strawberry-pink twin-bell alarm clock. Each has a plain flat top centre with NO handle, loop, ring or chain on top (the game adds a ring there).
```

### IC-M07c · Key Crane hanging on its string

- **File:** `icecreamcone/game/assets/sprites/keycrane-hang.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Lucky Dip: the Key Crane as it hangs from the trolley on its string and swings, its claws open while it is lowered and closed once it has hooked a ring. The game draws the string down to the middle of its shaft and rotates the whole figure as it swings.
- **Stand-in until delivered:** The Key Crane's stand-in hanging from its shaft, with two ink claws that open and close.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Key Crane (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/keycrane.png) in two poses side by side on one sheet, each in its own half, hanging in the air as if from a string tied round the middle of its key shaft (do not draw the string): the key's shaft level and horizontal, its ring head on the left with the eye looking down, its long thin legs hanging straight down below it. The middle of the shaft is exactly above the feet and about a third of the way down from the top of the figure. Left: its spiky claws spread wide open, reaching. Right: its claws curled tightly shut, as if gripping a ring. Same height and position in both halves. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M07d · Key Crane startled

- **File:** `icecreamcone/game/assets/sprites/keycrane-startle.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Lucky Dip: for a moment when a carried prize slips off, or the claws close on nothing, the hanging Key Crane starts in surprise. Drawn and swung on the string like IC-M07c.
- **Stand-in until delivered:** The hanging Key Crane jolting on its string.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Key Crane (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/keycrane.png) hanging in the air exactly as in its hanging pose (IC-M07c): as if from a string tied round the middle of its key shaft (do not draw the string), the shaft level and horizontal, the ring head on the left, the middle of the shaft directly above the feet and about a third of the way down from the top of the figure, at the same scale. Startled: its eye wide and staring, its beak open, its crest feathers flicked up, and its long thin legs kicked out apart in a jerky splay with the claws spread empty. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M08a · Bin Day: the windy street

- **File:** `icecreamcone/game/assets/scenes/garbagecanary.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Bin Day (the Garbage Canary): the whole background. The Canary, everything blowing down the street and the litter are drawn on top.
- **Stand-in until delivered:** A row of tall houses, a pavement, a kerb, the road and a lamp-post painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A quiet little town street on a blustery grey-blue morning, seen straight on from across the road. A row of narrow old terraced houses in faded pink, sage, cream and mauve stands along the back, their doors and windows plain, their roofs reaching about 10% to 20% of the way down. In front of them runs a wide pale paving-stone pavement, its back edge about 69% of the way down and its front edge, a long grey kerb, about 90% down; below the kerb a strip of grey cobbled road fills the bottom. One thin dark-green iron lamp-post stands on the pavement at about 77% across. A few wind-tossed leaves at the very top corners only. Keep the pavement clear from 20% to 75% across, and keep the band from 45% to 75% down across the whole width plain and uncluttered (no shop signs, no washing lines, no trees in front), because the game stands the dustbin bird at the left of the pavement and blows things down the street through that band from right to left.
```

### IC-M08b · Bin Day things on the wind

- **File:** `icecreamcone/game/assets/sprites/garbage-items.png`
- **Size:** 2560 x 1024, transparent
- **Used for:** Bin Day: everything the wind blows towards the bin. The top row is rubbish to let in; the bottom row (hat, letter, cat, sparrow) must be kept out, and the old boot is rubbish again. They are drawn at about 85 px and must read at a glance; the game adds a gold glow behind the four that aren't rubbish.
- **Stand-in until delivered:** A paper ball, a banana peel, a tin, an apple core, fish bones, a bowler hat, a letter, a ginger cat, a sparrow and a boot drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 5 x 2 grid of ten things, each about 300 px across, all moving to the left. Top row, rubbish, left to right: a crumpled ball of old newspaper; a brown-spotted empty banana peel; a dented empty tin can with a torn red label; a nibbled apple core; the bones of a fish with its head and tail. Bottom row, left to right: a gentleman's black bowler hat with a mauve band, tumbling; a sealed cream envelope with a pink stamp and a red wax seal, clearly a letter someone wants; a ginger tabby cat in mid-leap facing left, front paws reaching; a small brown sparrow flying to the left, wings up; and, last, a battered old brown boot with a hole in the toe and its laces trailing (rubbish).
```

### IC-M08c · Garbage Canary: bin and lid apart

- **File:** `icecreamcone/game/assets/sprites/garbagecanary-lid.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Bin Day: the Canary lifts its lid to swallow rubbish. The game draws the two pieces one over the other and swings the lid up on its hinge at the back rim, so the canary's head rises with it.
- **Stand-in until delivered:** The Canary's stand-in cut at the rim, the top half (lid and head) swung up.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Garbage Canary (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/garbagecanary.png), facing left, cut into two pieces shown side by side on one sheet, each half framed exactly like the portrait (the bird filling about 80% of the height, feet near the bottom), each piece drawn exactly where it sits on the whole bird so that laying the two halves over each other rebuilds the portrait. Left half: the dustbin body with its legs, WITHOUT its lid, its round open top showing a dark inside. Right half: ONLY the lid, closed and level, with the yellow canary's head, large and clearly seen (about a third as wide as the lid, its round eye big), peering out from under its front edge, nothing else. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M08d · Garbage Canary squawking and singing

- **File:** `icecreamcone/game/assets/sprites/garbagecanary-call.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Bin Day: the lid piece (the right half of IC-M08c) in place of the plain one: squawking as the Canary spits out something that wasn't rubbish, singing when a run of five earns a bonus. Hinged up with the lid like IC-M08c.
- **Stand-in until delivered:** The lid piece shaking (squawk) or unchanged (song).
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Garbage Canary (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/garbagecanary.png), facing left: ONLY its lid with the yellow canary's head, large and clearly seen (about a third as wide as the lid, its round eye big), peering out from under the lid's front edge, exactly as the right half of its lid sheet (IC-M08c): same scale, same framing as the portrait, the lid closed, level and in exactly the same place, nothing else (no bin). Two versions side by side, each in its own half. Left: squawking crossly, beak wide open, head feathers ruffled up, eye squeezed, a few spat crumbs flying from the beak. Right: singing happily, head tipped up, beak open in song, two or three small ink musical notes rising. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M09a · Pressing Business: the laundry

- **File:** `icecreamcone/game/assets/scenes/steampressersparrow.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Pressing Business (the Steampresser Sparrow): the whole background, with the ironing board. The garments, their creases, the steam and the Sparrow are drawn on top.
- **Stand-in until delivered:** A tiled wall, a wooden floor, a folded pile, a washing basket and a long padded ironing board painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). An old-fashioned laundry room seen from above at a steep angle, as if standing over the ironing board. The top 38% is a wall of pale sage-green square tiles. Below it, a warm wooden floor. Across the middle and lower part lies a long padded ironing board seen from above: a plain cream cover with a faint pattern of tiny slate-blue dots, pointed and rounded at its left end, square at its right end, stretching from about 7% to 92% across and from about 42% to 88% down. At the top left, against the wall, a neat stack of four folded garments; at the top right, a round wicker basket heaped with crumpled washing in pale blue, pink, cream and grey. Keep the whole top of the ironing board plain, empty and evenly lit, with nothing lying on it, because the game slides the garments onto it and irons them there.
```

### IC-M09b · Pressing Business garments

- **File:** `icecreamcone/game/assets/sprites/press-garments.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Pressing Business: the garments that slide onto the ironing board, one at a time. The game draws the creases and scorch marks on them.
- **Stand-in until delivered:** A shirt, a handkerchief, trousers, a silk scarf, a pillowcase and a checked tablecloth drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six pieces of washing, each laid out perfectly flat and smooth (no creases at all, and no busy pattern in the middle: the game draws dark creases and brown scorch marks there, and they must stand out) and seen from directly above, each filling most of its cell's width, with these width-to-height shapes. Top row, left to right: a pale-blue man's shirt laid face down with its sleeves spread out to the sides, its collar at the top (about 2.5 : 1); a white cotton handkerchief with a slate-blue border (about 1.7 : 1); a pair of grey flannel trousers laid sideways with the legs pointing right (about 3 : 1). Bottom row: a long plain pale-pink silk scarf, very fine and shiny, with only a narrow magenta border and short fringed ends, the whole middle plain (about 5 : 1); a cream pillowcase with a mauve hem stripe at its right end (about 2.5 : 1); a plain cream tablecloth with a narrow red-and-white gingham border round its edge, the middle plain (about 3 : 1).
```

### IC-M09c · Steampresser Sparrow pressing

- **File:** `icecreamcone/game/assets/sprites/sparrow-press.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Pressing Business: the Sparrow gliding over the cloth with its sole flat on it, dry and with a puff of steam. It replaces the portrait during the game, whose legs would stand it off the board.
- **Stand-in until delivered:** The Sparrow's stand-in with its legs hidden below the sole line, and code-drawn steam puffs.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Steampresser Sparrow (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/steampressersparrow.png) in two poses side by side on one sheet, each in its own half, facing left, in side view: its legs folded away out of sight underneath, so the cast-iron body sits with its flat sole level and resting on the bottom of the picture, as an iron does on cloth; head forward at the pointed toe. Left: dry, calm. Right: the same, with soft white steam billowing up around its sides and back from the holes in its sole, and the sparrow's beak a little open; no steam below the sole line. The sole at exactly the same height in both halves. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M09d · Steampresser Sparrow scorched

- **File:** `icecreamcone/game/assets/sprites/sparrow-scorch.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Pressing Business: for a moment after a scorch, the Sparrow jerks up off the cloth in alarm. Drawn standing on the same sole line as IC-M09c.
- **Stand-in until delivered:** The pressing stand-in hopping up off the board.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Steampresser Sparrow (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/steampressersparrow.png) in side view facing left, as in its pressing pose (IC-M09c) with its legs folded away out of sight and at the same scale, but jerked up in alarm: the pointed toe of the iron tipped up off the cloth, the heel of the sole still at the bottom of the picture, the sparrow's eye wide and beak open in a squawk, a thin wisp of brown smoke curling up from under the sole. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M10a · Wetweather Wren scene

- **File:** `icecreamcone/game/assets/scenes/wetweatherwren.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Puddle Hop (the Wetweather Wren): the rainy street the Wren walks along while the game scrolls puddles, market awnings and little birds past it.
- **Stand-in until delivered:** A row of tall narrow houses and a grey pavement painted in code, with moving paving joints.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A quiet old town street on a soft grey rainy day, seen straight from the side like a stage. Across the street, filling the middle of the picture from about 20% to 67% of the height, a row of tall, narrow, gabled houses in faded pink, sage, ochre and mauve, with lit yellow windows and a few chimneys, their fronts flat to the viewer; above them a low pale grey sky with soft wash clouds. Below the houses, a strip of wet road (67% to 76% of the height), a kerb, and then the near pavement filling the bottom quarter: plain, even, wet grey flagstones with a faint sheen, the same all the way from left to right. The near pavement and the air above it are where the game plays (the Wren walks along the pavement at about 84% of the height and hops up to the middle of the picture, and the game draws the puddles, striped market awnings and little birds on top, scrolling them past), so keep it completely empty: no puddles, lamp posts, awnings, benches, people or birds on the near side of the street, and nothing tall in front of the houses. Do not paint falling rain streaks (the game draws its own rain); a damp, dripping, misty mood is enough. The picture stays still while the street things scroll, so keep it evenly busy from left to right with no strong feature in one place.
```

### IC-M10b · Wetweather Wren, umbrella open

- **File:** `icecreamcone/game/assets/sprites/wren-poses.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Puddle Hop: the Wren with its umbrella popped open, floating over a puddle and walking with it open, and blown inside out after snagging an awning. The game flips it to face the way it walks.
- **Stand-in until delivered:** A black canopy drawn in code above the furled stand-in.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Wetweather Wren (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/wetweatherwren.png ), the furled black umbrella with a wren's head, in three poses in a 3 x 1 row, one per 1024 x 1024 cell, all at the same scale, each facing left with its feet at the bottom of its cell and the top of the canopy near the top, about 85% of the cell high: 1) umbrella popped wide open as a round black canopy with its ribs and scalloped edge, the shaft upright, the wren's head with its round eye and long beak peeking out at the very top of the canopy as the tip, the crook handle hanging below as a tail, the thin legs dangling and toes pointed, floating; 2) the same, open, but standing on the ground mid-stride, one leg forward; 3) the canopy blown inside out into a cup shape, ribs bent and showing, a rib or two sprung loose, the wren's eye wide and legs splayed in surprise. Same black cloth, same wren's head and colours as the portrait. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M10c · Puddles and market awnings

- **File:** `icecreamcone/game/assets/sprites/rain-street.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Puddle Hop: the puddles the Wren hops (the game stretches them to each puddle's width) and the striped market-stall awnings it must walk under with its umbrella shut (the game draws their poles and stretches each to its length).
- **Stand-in until delivered:** Blue-grey puddle blobs and striped scalloped awnings drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 2 grid of four street things, each centred in its own 1024 x 512 cell and filling about 85% of the cell's width, seen from the side at a low angle: top left, a small round rain puddle on flagstones, a flat ellipse about five times as wide as it is tall, grey-blue water with a pale reflection of the sky and a ring of ripples; top right, a long rain puddle, a flat irregular ellipse about nine times as wide as it is tall, the same water; bottom left, a market stall's canvas awning seen from the front, a straight top edge and a scalloped hanging lower edge, striped strawberry pink and cream, about four times as wide as it is tall, wet and dripping; bottom right, the same awning striped sage green and cream. No poles, frames, stalls or ground under the awnings (the game draws its own poles), and no ground round the puddles beyond their wet edge.
```

### IC-M10d · Wetweather Wren, drenched

- **File:** `icecreamcone/game/assets/sprites/wren-splash.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Puddle Hop: the Wren for the moment after it lands in a puddle and splashes, before it walks on (the game flips it to face the way it walks).
- **Stand-in until delivered:** The furled stand-in squashed down, with drops falling off it.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Wetweather Wren (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/wetweatherwren.png ), the furled black umbrella with a wren's head, just after landing in a puddle: still furled, standing ankle-deep in a small splash of grey-blue puddle water, drenched, its cloth sagging and dripping, water drops flying off its beak and crook handle, its head shaken to one side and eye squeezed half shut, its legs knock-kneed. Facing left, feet at the bottom, at the same scale and framing as the portrait. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M11a · Glove Dove scene

- **File:** `icecreamcone/game/assets/scenes/glovedove.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Slippery Dishes (the Glove Dove): the kitchen counter the Dove runs along, the sink the wet dishes pop out of on the left, and the plate rack they are flicked into on the right.
- **Stand-in until delivered:** A tiled wall, a window, a counter, a sink of suds and a wire plate rack drawn in code, from the side.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). An old-fashioned kitchen seen straight from the side, like a stage. A long wooden counter top runs right across the picture at about 81% of the height, with plain cupboard doors below it to the bottom edge. On the left, from 2% to 21% of the width, a deep white ceramic sink set into the counter, heaped with soap suds (its rim at about 65% of the height), with an old curved chrome tap above it. On the right, from 77% to 97% of the width, an empty wire plate rack standing on a drip tray on the counter, its thin upright wires rising to about 66% of the height, ready for plates. Behind, a pale tiled wall with a small window showing grey rain at the top middle. The counter between the sink and the rack, and all the air above it, are where the game plays (the bird runs along the counter and flicks dishes up through the air into the rack), so keep the wall there plain and quiet, and nothing at all on the counter: no dishes, cloths, bottles or jars anywhere.
```

### IC-M11b · Dishes from the side

- **File:** `icecreamcone/game/assets/sprites/dishes.png`
- **Size:** 3072 x 2048, transparent
- **Used for:** Slippery Dishes: the wet dishes flying through the air (the game spins them) and standing in the rack.
- **Stand-in until delivered:** Plates, a bowl, a cup and pans drawn in code from the side.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six clean, wet, shiny dishes, each centred in its own 1024 x 1024 cell, all seen from the side at eye level (a plate shows as a flat, slightly tilted ellipse), each about 70% of the cell wide, with a few drops of water and a soap bubble or two on them: 1) a white dinner plate with a slate-blue band round its rim; 2) a cream soup bowl with a mustard rim; 3) a tea cup with a mauve rim and its handle on the right; 4) a steel saucepan with its straight handle out to the right; 5) a black iron frying pan with its long handle out to the right; 6) a glazed ochre pie dish with a fluted rim.
```

### IC-M11e · Glove Dove cheering and dismayed

- **File:** `icecreamcone/game/assets/sprites/glovedove-poses.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Slippery Dishes: the Glove Dove cheering when a dish lands in the rack, and dismayed when one smashes.
- **Stand-in until delivered:** The portrait hopping, or squashed down.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Glove Dove (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/glovedove.png ), the long pink rubber glove with a dove's head, in two poses side by side, each in its own half and at the same scale, facing left, feet at the bottom: left, cheering, head and long cuff neck stretched up, beak open, the glove's fingers (its tail crest) fanned wide like a hand waving, one foot lifted in a little jump; right, dismayed, looking down at the floor, neck drooping, the fingers curled in, its eye wide, as if it has just dropped a plate. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M11f · Glove Dove catching and flicking

- **File:** `icecreamcone/game/assets/sprites/glovedove-toss.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Slippery Dishes: the Glove Dove with its fingers ready to catch a falling dish, and flicking it up into the air (the game draws the dish).
- **Stand-in until delivered:** The portrait stretched up, with a pink cup of fingers drawn over its head.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Glove Dove (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/glovedove.png ), the long pink rubber glove with a dove's head, in two poses side by side, each in its own half and at the same scale, facing left, feet at the bottom: left, ready to catch, its long cuff neck and head tipped back to look straight up, the five rubber fingers of the glove raised above it and spread open like a cupped hand waiting for something to fall into it; right, flicking, stretched up tall on tiptoe, the fingers snapping upward together as if tossing a plate into the air, a few soap drops flying off them. No dish (the game draws it). Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M12a · Tit Trush scene

- **File:** `icecreamcone/game/assets/scenes/titthrush.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind Set the Clocks (the Ten O'clock Tit Trush): the town square where the town's clocks call out the time.
- **Stand-in until delivered:** Gabled houses and cobbles drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A small old town square in the warm early morning, seen from the side. Along the back, a row of gabled houses, shops and chimneys in faded pink, sage, ochre and mauve, from about 25% to 72% of the height, their tops against a pale lemon and peach sky; in front, a cobbled square filling the bottom 28%, its round cobbles in warm grey. The game draws a large gold pocket watch over the left middle (from about 20% to 60% of the width and 13% to 87% of the height), a town clock in its tower or frame at the upper right (about 62% to 87% of the width, 5% to 60% of the height) with a speech bubble under it, and the bird on the cobbles at the far left, so keep those places calm, soft and low in detail. No clocks, clock towers or clock faces anywhere in the painting (the game draws them), and no people or animals.
```

### IC-M12b · The big watch face

- **File:** `icecreamcone/game/assets/sprites/watch-face.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Set the Clocks: the Tit Trush's watch face, large, whose hands the player turns (the game draws the hands, the crown and the chain).
- **Stand-in until delivered:** A gold ring and a cream face with numbers drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The face of an old gold pocket watch seen straight on, filling the image: a round, slightly worn gold case with a little engraved and crosshatched edge, and inside it a cream enamel face exactly centred in the image whose diameter is 80% of the image's width, with bold black numbers 1 to 12 in an old-fashioned serif, a ring of minute ticks (longer every five minutes) round its edge, and a little gold sunburst at the centre. No hands at all, and no crown, bow or chain (the game draws them). Like the Ten O'clock Tit Trush's own face (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/titthrush.png ). Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M12c · Town clocks

- **File:** `icecreamcone/game/assets/sprites/town-clocks.png`
- **Size:** 2048 x 2048, transparent
- **Used for:** Set the Clocks: the four town clocks that take turns calling out the time to set (the game draws their hands).
- **Stand-in until delivered:** A stone tower, a hanging clock, a gold clock and a wooden cuckoo house drawn in code round plain faces.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 2 grid of four clocks, each in its own 1024 x 1024 cell, seen straight on. In every cell the clock's round dial is exactly centred in the cell and is half the cell's width across, with numbers and minute ticks but NO HANDS (the game draws them); its surround fits round it inside the cell: 1) a church tower clock, a stone tower top with a little pointed roof round a cream dial with Roman numerals; 2) a round railway station clock with a thick black rim on an iron bracket from above, plain black numbers; 3) a town hall clock, a gilded rim with laurel scrolls round a cream dial with Roman numerals; 4) a cuckoo clock, a carved brown wooden house with a pitched roof, a little closed door above the dial, and carved leaves.
```

### IC-M12d · Tit Trush singing

- **File:** `icecreamcone/game/assets/sprites/titthrush-sing.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Set the Clocks: the Tit Trush sings for a moment each time a clock is set right.
- **Stand-in until delivered:** The portrait, hopping.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Ten O'clock Tit Trush (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/titthrush.png ), the gold pocket watch bird, singing: its head tipped back and its beak wide open, its pink plumes lifted, standing on both feet, at the same scale and framing as the portrait. Its face still shows ten o'clock. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M12e · Tit Trush flustered

- **File:** `icecreamcone/game/assets/sprites/titthrush-fluster.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Set the Clocks: the Tit Trush when the wrong time is set (the crown jams) or a town clock gives up waiting.
- **Stand-in until delivered:** The portrait shaking.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Ten O'clock Tit Trush (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/titthrush.png ), the gold pocket watch bird, flustered: leaning back on its heels, its pink plumes ruffled and standing on end, its beak open in an indignant squawk, little ink shake lines round its case. Its face still shows ten o'clock. Facing left, at the same scale and framing as the portrait. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M13a · Lights On: the tall house at dusk

- **File:** `icecreamcone/game/assets/scenes/plugsocketswift.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Lights On (the Plugsocket Swift): the whole background. The twelve windows, the fuse box and its cable, the Swift and everything that moves are drawn on top.
- **Stand-in until delivered:** A dusk sky in bands, a tall plastered house with a red roof, a garden wall and a lawn, painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A garden at dusk, seen straight on. In the middle stands one tall, narrow old townhouse of warm buff plaster: its front wall runs from 25% to 75% of the way across and from 22% down to the ground line 89% down, under a steep red-tiled roof whose peak nearly touches the top edge, with one brick chimney at the right of the roof. The front wall is completely plain and blank: no windows, no door, no drainpipes, no ivy, because the game paints a grid of twelve windows (four across, three high) over the whole of it. On the left, a low old garden wall of grey stone from 4% to 25% across, its flat top 37% down, with a plain clear patch in its middle where the game hangs a fuse box. On the right, the dark gabled roofs of two neighbouring houses, lower than ours, without lit windows. Above, a deepening dusk sky in soft bands, slate blue at the top through mauve to a warm apricot glow near the horizon, a pale moon in the top right. A strip of green lawn along the bottom 11%. Keep the house front and the sky around it quiet and even, because the Swift flies all over it.
```

### IC-M13b · Windows and the fuse box

- **File:** `icecreamcone/game/assets/sprites/swift-house.png`
- **Size:** 1536 x 1024, transparent
- **Used for:** Lights On: each of the twelve windows shows one of four states (dark, asking for a light, reading by a lamp, asleep with the lamp still on); the fuse box hangs on the garden wall, closed or blown.
- **Stand-in until delivered:** Window frames with curtains, little round creatures, a table lamp and a grey fuse box drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six pictures, each in its own square cell, all four windows exactly the same size and framing (about 400 px wide and 430 px tall, seen straight on), row by row: 1, a square old sash window at night, dark blue-black glass, dusty-pink curtains drawn back at the sides, a wooden sill, nobody inside; 2, the same dark window with a small brown mouse in a striped nightshirt standing inside, one paw raised waving, holding a closed book; 3, the same window glowing warm yellow from inside, a little table lamp with a pleated pink shade lit on the right, the mouse sitting reading an open book in its light; 4, the same lit window, the lamp still on, the mouse asleep in a small bed under a patchwork blanket with its book fallen open on the floor; 5, an old grey-painted metal fuse box with a little door, a round dial and a big switch lever pointing up, about 300 x 400 px; 6, the same fuse box blown: its lever snapped down, a black scorch mark and a puff of grey smoke with a few yellow sparks. The windows' wooden frames and sills fill each window picture edge to edge so they line up on the house wall.
```

### IC-M13c · Plugsocket Swift: flying, plugging in, singed

- **File:** `icecreamcone/game/assets/sprites/swift-poses.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Lights On: the Swift flies from window to window (pose 1), dives at a socket as it plugs a lamp in (pose 2), and hangs singed while the fuse is blown (pose 3). The game mirrors it to fly right and draws the bulb's glow.
- **Stand-in until delivered:** The portrait (or its stand-in) with ink-and-wash wings drawn in code: beating, swept back and tilted for the dive, drooping with grey smoke when singed.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Plugsocket Swift (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/plugsocketswift.png) in three poses side by side, each in its own square third of the sheet, the plug-socket body at the exact centre of each square and the bird filling about 80% of the square's width, all at the same scale, facing left, seen from the side: 1, in flight, its long sickle-shaped swift's wings spread wide and swept back, its trailing flex tail streaming out behind, legs tucked up under the body, the bulb head stretched forward with its filament glowing; 2, diving head first and down to the left to plug in, wings swept right back, legs reaching forward, the bulb blazing bright with little rays; 3, singed: hovering limply, wings drooping, a few feathers ruffled and sooty, the bulb dark and grey with a thin crack, a small wisp of smoke rising from the screw cap. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M14a · Just a Pinch: the café

- **File:** `icecreamcone/game/assets/scenes/saltshakershrike.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Just a Pinch (the Saltshaker Shrike): the whole background. The brass rail the Shrike hangs from, the round revolving table, the plates, the diner, the salt and the Shrike are drawn on top.
- **Stand-in until delivered:** Striped wallpaper, a chalk menu board, a clock, the kitchen hatch and a tiled floor, painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). Inside a small old-fashioned café, seen straight on from a little above. The back wall is papered in soft cream and sage-green stripes down to a straight skirting line 52% of the way down; below it a floor of cream and pale slate-blue checked tiles runs to the bottom edge, in gentle perspective. Top left, a small chalk menu board with a few illegible scribbled lines (no readable words); top right, a plain round wall clock; at the far right edge, between 33% and 58% down, the dark open hatch of the kitchen with a little steam. Keep the wide middle of the picture, from 10% to 97% across and from 44% to 95% down, plain wallpaper and floor with nothing on it, because the game puts a big round revolving table there; keep the band from 10% to 45% down plain too, because salt falls through it. No tables, chairs, counter, people, animals, plates or food, and no rail along the top (the game draws its own).
```

### IC-M14b · Plates of food

- **File:** `icecreamcone/game/assets/sprites/shrike-plates.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Just a Pinch: the plates that slide along the counter; the first six want salt, the last two are puddings that want none.
- **Stand-in until delivered:** A white plate and simple foods drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 2 grid of eight dishes, each served on the same plain white china plate seen from the side and slightly above, the plate about 420 px wide with its foot on the bottom of the picture, row by row: 1, a fried egg with a bright yolk; 2, a heap of golden chips; 3, a baked potato split open with a pat of butter; 4, a buttery cob of sweetcorn; 5, a white bowl of tomato soup on the plate; 6, a big brown pretzel; 7, a slice of strawberry layer cake with a cherry on top; 8, an ice-cream sundae in a tall glass, strawberry and vanilla with chocolate sauce. The food sits in the middle of each plate, no cutlery.
```

### IC-M14c · Diners

- **File:** `icecreamcone/game/assets/sprites/shrike-diners.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Just a Pinch: the diner at the end of the counter who tastes each plate; pleased (and bouncing) when it's right, pulling a face when it isn't.
- **Stand-in until delivered:** Round grey, brown and green creatures with a napkin and a fork, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 2 grid of four small animal diners in Lobel's gentle manner, each seen from the front, from the waist up as if sitting behind a counter (the bottom of each figure cut straight across), about 380 px tall, with a white napkin tucked under its chin and a fork held upright: row 1, waiting happily: a velvety dark-grey mole with tiny round spectacles, a grey mouse, a green frog, a black-and-white badger; row 2, the same four in the same order pulling a face at their food: eyes screwed shut, mouth turned down, tongue out.
```

### IC-M14d · Saltshaker Shrike hanging upside down

- **File:** `icecreamcone/game/assets/sprites/shrike-poses.png`
- **Size:** 4096 x 1024, transparent
- **Used for:** Just a Pinch: the Shrike hangs head down from the brass rail all game (pose 1), shakes out a pinch (pose 2), squawks pleased at a plate that's just right (pose 3) and flinches at a frown (pose 4). The game mirrors it to face the plates.
- **Stand-in until delivered:** The portrait (or its stand-in) turned upside down in code; it jiggles when shaking, bounces when pleased and shivers when flinching.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Saltshaker Shrike (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/saltshakershrike.png) in four poses side by side, each in its own square quarter of the sheet, all at the same scale, facing left, each hanging UPSIDE DOWN by its claws from an unseen horizontal rail at the very top of the square, like a bat: its thin legs go straight up from the body to the claws, which grip a point at the top centre of the square; the glass body hangs below them and the domed perforated silver cap (its head) points straight down, the cap's holes about 75% of the way down the square, centred, the hooked beak and black eye mask on the cap. Lit from the upper left as a real object hanging upside down would be. 1, hanging still, calm; 2, shaking: swung slightly to one side, a little puff of white salt grains spilling from the holes; 3, pleased: beak wide open in a cheerful squawk, little wings flared; 4, flinching: body pulled up tight towards the rail, wings clamped, eye squeezed half shut. No rail drawn. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M14e · The revolving table

- **File:** `icecreamcone/game/assets/sprites/shrike-table.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Just a Pinch: the big round lazy Susan the plates ride round on, from the cook's hatch on the right, round the near side, to the diner on the left. The game draws the plates on its rim and turning knots on its top.
- **Stand-in until delivered:** A wooden oval with an edge, a pedestal and a round foot, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. One object filling the sheet: a big round wooden revolving café table (a lazy Susan on a pedestal), seen from the front and a little above, so its round top is a wide flat oval 4.6 times as wide as it is tall; the top's outer edge touches the left and right sides of the painted area and its back edge is the very top of the painted area. Plain honey-coloured wood with a faint inner ring and a few knots, nothing on it, a thick darker edge below the top, a stout turned central pedestal and a round foot on the floor. About 1900 px wide.
```

### IC-M15a · Soup's On: the soup kitchen

- **File:** `icecreamcone/game/assets/scenes/ladlelark.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Soup's On (the Soupladle Lark): the whole background. The pot, the vegetables, the queue, the bowl and the Lark are drawn on top.
- **Stand-in until delivered:** A tiled wall with a window, an iron stove and a wooden serving counter, painted in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A cosy old soup kitchen, seen straight on. The back wall is plain cream tiles down to 71% of the way down, then a worn stone-flagged floor. A small four-paned window high up on the left, between 10% and 29% across and 12% and 37% down. A black iron cooking range low in the middle, from 19% to 61% across, its top at 91% down, with a little orange glow from its fire door. On the right, a wooden serving counter from 69% across to the right edge, its top 82% down, with a clear stretch of wall behind it where a queue of creatures stands. Keep the whole area from 10% to 68% across and from 30% to 95% down plain (tiles, floor, range top), because the game puts a big soup pot there, and keep the wall above the counter clear. No pot, no food, no people or animals.
```

### IC-M15b · Soup pot and bowl

- **File:** `icecreamcone/game/assets/sprites/lark-pot.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Soup's On: the big pot the Lark dips into (the game fits its broth oval to the swirling vegetables), and the bowl on the counter that fills.
- **Stand-in until delivered:** A copper pot, a golden broth oval and a wooden bowl drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 1 pair: left, a huge old copper soup pot, about 900 px wide, seen from the front and above at about 25 degrees, two loop handles on its sides, dents and crosshatched shine; its open mouth is a wide oval of clear golden broth with nothing floating in it, ringed by the rolled rim, and the rim's outer oval is exactly as wide as the pot and three-eighths as tall as it is wide, its top edge at the very top of the painted pot. Right, a plain round wooden soup bowl, about 400 px wide, seen the same way, holding a shallow oval of the same golden broth with nothing in it.
```

### IC-M15c · What's in the soup

- **File:** `icecreamcone/game/assets/sprites/lark-bits.png`
- **Size:** 2560 x 512, transparent
- **Used for:** Soup's On: the bits that swirl round the pot, sit in the order bubble and fly into the bowl.
- **Stand-in until delivered:** An orange carrot coin, a green pea, a cream dumpling, a brown mushroom and a dark boot drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 5 x 1 row of five things floating in soup, each seen from above at a slant and each about 300 px across, in a square cell: 1, a round coin of carrot with its pale rings; 2, a single round green pea (smaller, about 160 px); 3, a plump pleated white dumpling; 4, a halved brown mushroom; 5, a battered old brown leather boot with a loose lace, lying on its side (about 400 px long). Wet and glistening, a few drops of broth.
```

### IC-M15d · The hungry queue

- **File:** `icecreamcone/game/assets/sprites/lark-queue.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Soup's On: the creatures queueing at the counter; the one at the front bounces when served and pulls a face at a bad bowl.
- **Stand-in until delivered:** A hedgehog, a rabbit, a bear cub and a frog drawn in code, each with a spoon.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 2 grid of four small hungry creatures in Lobel's gentle manner, each standing upright, full length, in a three-quarter view facing left, about 440 px tall, holding a big spoon: row 1, hopeful and waiting: a hedgehog, a white rabbit, a brown bear cub, a green frog; row 2, the same four in the same order pulling a face: eyes screwed shut, tongue out, the spoon held away.
```

### IC-M15e · Soupladle Lark hovering, dipping and rising

- **File:** `icecreamcone/game/assets/sprites/lark-poses.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Soup's On: the Lark hovers over the pot (pose 1), plunges its bowl into the soup to dip (pose 2) and rises with a full bowl (pose 3), always over the ring the player aims.
- **Stand-in until delivered:** The portrait (or its stand-in) with ink-and-wash wings in code: beating while it hovers, swept up and tilted forward as it dips, a golden brim drawn on the bowl as it rises.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Soupladle Lark (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/ladlelark.png) in three poses side by side, each in its own square third of the sheet, all at the same scale, facing left, the round bowl of the ladle (its body) at the exact centre of each square: 1, hovering in the air: little grey wings beating either side of the bowl, legs tucked up, the long handle-neck curved up with the head looking down; 2, dipping: tipped forward bowl first, the bowl's open side turned down to the lower left as if scooping, wings swept up, the neck bent down; 3, rising: level again, wings pushing down, the bowl brimming with golden soup, a carrot coin and a pea showing, drops of broth falling from its rim. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M16a · Drip Drop Dash: the kitchen

- **File:** `icecreamcone/game/assets/scenes/drippet.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Drip Drop Dash: the background. The Drippet, its puddles and the thirsty things are drawn on the floor on top.
- **Stand-in until delivered:** A wall, a window, a cupboard and a perspective tiled floor drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). An old-fashioned country kitchen on a rainy afternoon, seen from a little above. The back wall fills the top 52%: pale sage-green distemper, a low wooden dresser or sink cupboard with a white enamel sink on the left half, a tall window on the right with rain running down the panes, a skirting board along the foot of the wall at about 53% of the height. The floor fills everything below that, from 55% of the height to the bottom edge and from edge to edge: large cream and sage-green checked tiles in gentle perspective, dry, clean and evenly lit, with nothing standing on them (no rugs, chairs, bowls, mats or puddles), because the Drippet runs all over it and the game draws puddles, pots and bowls there.
```

### IC-M16b · Drip Drop Dash: thirsty things

- **File:** `icecreamcone/game/assets/sprites/drippet-things.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Drip Drop Dash: the things waiting on the floor for a drink, before and after the Drippet fills them.
- **Stand-in until delivered:** A fern pot, a cat bowl, a glass and a vase of daisies drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 2 grid of eight small objects standing on the floor, each seen from the side and a little above, each about 300 px tall, all at the same scale, standing on the bottom of their cell. Top row, thirsty and dry, from left to right: 1) a terracotta pot with a fern whose fronds droop limply over the rim; 2) an empty slate-blue enamel cat's bowl; 3) an empty plain drinking tumbler; 4) a mauve china vase of white daisies with their heads drooping down. Bottom row, the same four refreshed, in the same order and at the same size: 5) the fern standing up fresh and green; 6) the bowl full of water; 7) the tumbler full of water; 8) the daisies upright and open. No puddles, no shadows under them.
```

### IC-M16c · Drip Drop Dash: puddles

- **File:** `icecreamcone/game/assets/sprites/puddles.png`
- **Size:** 1536 x 512, transparent
- **Used for:** Drip Drop Dash: the puddles the Drippet leaves; the game grows, shrinks and fades them, and squashes them flat to lie on the tiles.
- **Stand-in until delivered:** Pale blue blobs drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 1 row of three shallow water puddles seen from a low angle, so each is a wide flat oval about two and a half times as wide as it is tall, with soft irregular edges: translucent slate-blue watercolour, a darker pooled rim, and a pale highlight streak on the surface. Three different outlines (one round, one with a little bay, one with a smaller puddle splashed beside it). Each fills about 80% of its cell's width.
```

### IC-M16d · The Drippet hopping and skidding

- **File:** `icecreamcone/game/assets/sprites/drippet-poses.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Drip Drop Dash: the Drippet in the air when it hops a puddle, and skidding when it runs into one.
- **Stand-in until delivered:** The portrait (or its stand-in), lifted for a hop and rocked from side to side for a skid.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Drippet (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/drippet.png ) in two poses side by side on one sheet, each in its own half, facing left: left half, in mid-hop, legs tucked up under its body and claws curled, a few water drops flung from its spout; right half, skidding, leaning far back with both legs shot forward and splayed, its eye wide, water sloshing out of its spout. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M16e · The Drippet running and pouring

- **File:** `icecreamcone/game/assets/sprites/drippet-more.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Drip Drop Dash: the Drippet's run (this stride and the portrait by turns) and its pose while it fills a thirsty thing.
- **Stand-in until delivered:** The portrait (or its stand-in) bobbing and tilting as it runs, and tipped forward while it pours.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Drippet (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/drippet.png ) in two poses side by side on one sheet, each in its own half, facing left, at the portrait's scale with its feet on the same ground line: left half, running mid-stride, one long leg reaching forward and the other pushing off behind, body tipped slightly forward; right half, standing with its body tipped forward and down so its spout points at the floor just in front of its feet, a thin steady stream of water running from the spout, its eye looking down. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M17a · Saw It Straight: the carpenter's yard

- **File:** `icecreamcone/game/assets/scenes/sawbird.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Saw It Straight: the background. The sawhorses, the plank and the Saw Bird are drawn on top.
- **Stand-in until delivered:** A plank wall hung with tools and a sandy yard drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). The yard in front of an old wooden carpenter's workshop on a still, pale morning. Across the top of the picture, from about 12% to 40% of the height, the workshop's weathered board wall, with a few tools hanging on nails (a hammer, a carpenter's square, a coil of rope) and a small window. Below it the yard: packed earth and sand, scattered with a few curls of wood shavings and sawdust near the edges. Keep the middle of the yard plain and quiet from 42% to 92% of the height and from 20% to 80% of the width (no sawhorses, benches, planks or logs there), because the game puts two sawhorses and a long plank across the middle. A neat stack of logs may sit at the far left and a wheelbarrow at the far right, both kept small.
```

### IC-M17b · Saw It Straight: planks

- **File:** `icecreamcone/game/assets/sprites/planks.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Saw It Straight: the plank on the sawhorses. The game stretches it to each plank's length, draws the chalk line and the cut over it, and splits it along the cut when it is sawn through.
- **Stand-in until delivered:** A wood-coloured band with grain lines drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 1 x 3 grid: three long, plain, unmarked wooden planks, one per row, each lying flat and seen from above at a slight slant so its wide top face is visible and, under it, a thin strip of its near edge, the face about ten times as tall as that edge strip. Each plank fills its cell's whole width (cut square at both ends) and about 60% of its height, with long straight grain lines running along it. Top row pale pine; middle row honey-coloured oak; bottom row reddish cedar. No knots, no saw cuts, no pencil or chalk marks.
```

### IC-M17c · Saw It Straight: sawhorse

- **File:** `icecreamcone/game/assets/sprites/sawhorse.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Saw It Straight: the two sawhorses the plank lies across (the same picture twice).
- **Stand-in until delivered:** A beam and four splayed legs drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A single old wooden sawhorse seen from the front and a little above: a flat beam across the top, about 1.5 times as wide as the sawhorse is tall, and four splayed legs, nicked and paint-spattered, standing on the ground. Centred, filling about 80% of the frame's width. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M17d · The Saw Bird sawing

- **File:** `icecreamcone/game/assets/sprites/sawbird-sawing.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Saw It Straight: the Saw Bird as it saws back and forth along the line, its teeth in the cut.
- **Stand-in until delivered:** The portrait (or its stand-in), standing with its blade over the plank and its legs dangling.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Saw Bird (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/sawbird.png ) at work, facing left: its long blade held perfectly level, pointing left, with the toothed edge straight along the bottom, and its legs folded up tight under its handle-body so that nothing hangs below the line of the teeth: the teeth are the lowest part of the picture. Eye narrowed in concentration, a few curls of sawdust at the teeth. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M17e · The Saw Bird snagged and proud

- **File:** `icecreamcone/game/assets/sprites/sawbird-poses.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Saw It Straight: the Saw Bird caught on a knot (or after a crooked cut), and standing proud beside the plank after a straight one.
- **Stand-in until delivered:** The sawing pose shaken for a snag; the portrait hopping beside the plank for pride.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Saw Bird (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/sawbird.png ) in two poses side by side on one sheet, each in its own half, facing left: left half, snagged, framed exactly like its sawing pose (blade level and pointing left, toothed edge along the bottom, legs folded tight under its handle-body so the teeth are the lowest part), but with the blade bowed and twanging (a few small ink wobble lines beside it) and its eye wide in alarm; right half, proud, standing upright on its two thin legs at the portrait's scale, blade raised high at an angle like a salute, chest out, a few curls of sawdust at its feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M18a · Tune In: the sitting room

- **File:** `icecreamcone/game/assets/scenes/radiobird.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Tune In: the background. The dial, the signal meter, the speaker, the listeners and the Radio Bird are drawn on top.
- **Stand-in until delivered:** Striped wallpaper, a lamp's glow, a rug and a sage sofa drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of birds, people and animals (the game draws them on top). A cosy 1960s sitting room in the evening: softly striped cream-and-mauve wallpaper, the warm glow of a standard lamp at the far right edge, a wooden floor across the bottom third with a dusty-pink oval rug on the left. On the right an empty low sage-green sofa, its back top at about 65% of the height, its seat front at about 87%, spanning from 55% to 93% of the width, with nothing on it (the game seats three little birds there). Keep the whole upper wall plain, from the top down to 55% of the height and across the full width, with no pictures, shelves or windows, because the game draws a long tuning dial across the top and a signal meter and speaker below it. Keep the left third of the room, where the Radio Bird stands on the rug, plain as well.
```

### IC-M18b · Tune In: the stations

- **File:** `icecreamcone/game/assets/sprites/stations.png`
- **Size:** 1536 x 1024, transparent
- **Used for:** Tune In: the picture of each station, in the listener's speech bubble, in the speaker when it is tuned in, and pencilled small on the dial once found.
- **Stand-in until delivered:** A fiddle, a trumpet, a drum, bells, a cuckoo clock and a rain cloud drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six simple, bold little emblems, each about 300 px across, each readable at 48 px: 1) a fiddle with its bow; 2) a brass trumpet; 3) a red marching drum with sticks; 4) two golden church bells; 5) a carved wooden cuckoo clock with the green cuckoo popping out; 6) a grey rain cloud with three slate-blue drops.
```

### IC-M18c · Tune In: the listeners

- **File:** `icecreamcone/game/assets/sprites/listeners.png`
- **Size:** 1536 x 1024, transparent
- **Used for:** Tune In: the three little birds on the sofa who call for the stations, waiting and then delighted while their song plays.
- **Stand-in until delivered:** Three round birds drawn in code, their eyes closing when the song plays.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of three small, round, plump little songbirds sitting down (legs tucked under them), each facing left and about 250 px tall, all at the same scale: lemon yellow, sage green and strawberry pink, each with one round eye with a dot pupil and a short ochre beak. Top row: the three waiting, sitting up straight, looking expectantly to the left. Bottom row: the same three in the same order, delighted, eyes closed in bliss, heads tilted, a tiny ink music note beside each.
```

### IC-M18d · Tune In: the tuning dial

- **File:** `icecreamcone/game/assets/sprites/dial-panel.png`
- **Size:** 2048 x 512, transparent
- **Used for:** Tune In: the long tuning dial across the top of the screen; the game draws the red needle, the station marks and the knob on it.
- **Stand-in until delivered:** A cream panel with tick marks in a brass frame drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A long 1960s radio tuning-dial window, seen straight on, filling the image's whole width and about 70% of its height: a narrow brass bezel around a pale cream face with a single row of evenly spaced tick marks along its bottom edge (a longer tick every fifth), and faint warm light glowing from behind. No numbers, no lettering, no needle, no knob. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M18e · The Radio Bird listening, singing and startled

- **File:** `icecreamcone/game/assets/sprites/radiobird-poses.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Tune In: the Radio Bird listening while the dial turns through the static, singing while the asked-for station plays (and when the listeners cheer), and startled by a wrong station.
- **Stand-in until delivered:** The portrait (or its stand-in) leaning a little to listen, swaying to sing, and jittering when startled.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Radio Bird (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/radiobird.png ) in three poses in a row on one sheet, each in its own third, facing left, at the portrait's scale with its feet on the same ground line: 1) listening, its long neck bent down and round so its head is cocked close to its own speaker grille, eye narrowed, a few faint fuzzy static marks around the grille; 2) singing, head thrown back on its long neck, beak wide open, crest flared, a few small ink music notes coming from the grille and the beak; 3) startled, neck jerked back into an S, crest standing straight up, eye wide, one foot lifted. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Sprites and variants

What the minigames need beyond one still portrait per bird, found while building them and checking them with the first art. A portrait can only breathe and hop, so a bird that steps, grows, sings or changes shows that with these variants; and the props each game still draws in code (scoops, hats, cars, stones, hiding places) get painted versions so nothing drawn in code sits on top of a painted scene. Every variant must match its delivered portrait exactly in design, colours and line (the portrait in game/assets/birds/ is the reference), drawn at the same scale and facing left.

### IC-P01 · Scoop Stack props

- **File:** `icecreamcone/game/assets/sprites/scoops.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Scoop Stack: the falling ice creams and the things that knock them off.
- **Stand-in until delivered:** Scoops, a cherry, a pickle and a sock drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 5 x 2 grid of ten objects, each about 300 px across: seven single round lumpy scoops of ice cream with no cone (strawberry pink, lemon yellow, vanilla cream, chocolate brown, mint green, pistachio, blueberry), seen from the side, soft and slightly melting at the bottom edge; one glossy red cherry with a stem and a tiny gold sparkle; one green dill pickle; one striped wool sock. Lumpy, crosshatched shadows, like the scoops on the Coot's cover.
```

### IC-P02 · Coot walking and looking up

- **File:** `icecreamcone/game/assets/sprites/coot-poses.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Scoop Stack: the Coot runs left and right, and looks up at the falling scoops.
- **Stand-in until delivered:** The portrait, hopping.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Ice-Cream Cone Coot (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/birds/coot.png) in two poses side by side on one sheet, each in its own half: left, mid-stride with its left leg reaching forward; right, standing with its head tipped back looking straight up, beak pointing to the sky, so a scoop can land on its head. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P03 · Cupadee, empty cup facing up

- **File:** `icecreamcone/game/assets/sprites/cupadee-open.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Tea Time: the game paints the tea inside the cup and a fill line on it.
- **Stand-in until delivered:** The game's own cup drawn over the portrait.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Cupadee (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/birds/cupadee.png) standing with its cup upright and level, not tipped, the rim seen slightly from above as a wide open ellipse so the whole empty white inside of the cup is visible, ready to be filled. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P04 · Teapot

- **File:** `icecreamcone/game/assets/sprites/teapot.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Tea Time: the teapot that tips and pours.
- **Stand-in until delivered:** A teapot drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. An old-fashioned round china teapot with a long curved spout pointing to the left, a rose pattern and a domed lid with a knob, level (not pouring), hanging from a short loop of string on its handle. Centred, filling about 70% of the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P05 · Say Cheese hiding places

- **File:** `icecreamcone/game/assets/sprites/hides.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Say Cheese: the foreground pieces the rare birds peek out from behind. Each is drawn over the meadow scene, with the bird between the scene and it.
- **Stand-in until delivered:** Bushes, a wall, a tree, a gate pillar, a hedge and grass drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six foreground pieces matching the meadow scene (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/scenes/shuttercluck.webp), each cut out cleanly at its base: a round leafy bush; a low mossy dry-stone wall section; an old tree trunk with a dark knothole halfway up (only the trunk, cut off above the knothole); a square stone gate pillar with a ball on top; a clipped hedge section; a clump of tall meadow grass and wildflowers.
```

### IC-P06 · Gullfinch singing

- **File:** `icecreamcone/game/assets/sprites/gullfinch-sing.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Wind and Sing: the Gullfinch's pose for each note the player hits.
- **Stand-in until delivered:** The portrait, breathing.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Gramophone Gullfinch (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/birds/gullfinch.png) in full song: beak wide open, head thrown back a little, crest feathers flared, a few small ink musical notes drifting out of the horn. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P07 · Plume growing, four stages

- **File:** `icecreamcone/game/assets/sprites/plume-growth.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Bloom: the plant in each Flowerpot Plume's pot as it is watered, from sprout to the book's towering bloom, and wilted.
- **Stand-in until delivered:** An ink stem, leaves and flower drawn in code over the portrait.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 1 row of four plants only (no pot, no bird), each growing up from a small mound of soil at the bottom centre of its cell, all at the same scale: 1) a short stem with four leaves; 2) a taller stem with leaves and a closed pink bud; 3) the full bloom from the book (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/reference/flowerpot-plume.jpg ): a tall leafy stem topped by a huge rounded flower head of many petals in rose, slate blue, ochre and mauve; 4) the same tall plant wilted, the stem bent over and the flower drooping, leaves curled and brownish.
```

### IC-P08 · Bobolinks, one boot at a time

- **File:** `icecreamcone/game/assets/sprites/bobolink-boots.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Left Foot, Right Foot: each boot steps on its own.
- **Stand-in until delivered:** The pair's portrait hopping as one.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Highbutton Bobolinks (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/birds/bobolinks.png) as two separate single boots on one sheet, each in its own half: left half, the left boot alone, standing; right half, the right boot alone, standing. Same boot design as the pair, each a bird with its eye and its long white beak open upward. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-P09 · Stepping stones

- **File:** `icecreamcone/game/assets/sprites/stones.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Left Foot, Right Foot: the stones across the moonlit stream.
- **Stand-in until delivered:** Flat discs drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six flat, rounded river stepping stones seen from a low side angle, wet on top and catching pale moonlight, with a thin ring of dark water ripple around each base, for a night scene (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/scenes/bobolinks.webp).
```

### IC-P10 · Newsprint scraps

- **File:** `icecreamcone/game/assets/sprites/scraps.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Hot off the Press: the scraps the letters are printed on as they flutter down.
- **Stand-in until delivered:** Paper rectangles drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 4 x 2 grid of eight small torn scraps of old newspaper, each roughly square with ragged torn edges, slightly curled, with faint grey columns of tiny print and a blank cream patch in the middle (the game prints a big letter there).
```

### IC-P11 · Hats

- **File:** `icecreamcone/game/assets/sprites/hats.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Spot the Dodo: the hats on the shop counter that the Dodo hides under.
- **Stand-in until delivered:** Hats drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 1 row of three gentleman's hats seen from the side, sitting on their brims: a black bowler with a plum band, a tall black top hat with a grey band, and a brown bowler with a faded green band. Each about the same width.
```

### IC-P12 · Old cars

- **File:** `icecreamcone/game/assets/sprites/cars.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Safe Crossing: the cars that stop and go at the Crow's light.
- **Stand-in until delivered:** Simple cars drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 2 grid of four small rounded 1930s motor cars in side view, all facing left (the game mirrors them for the other lane): dusty pink, pale blue, mustard yellow and sage green, with running boards, round headlamps and spoked wheels, for a small-town street (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/scenes/crow.webp).
```

### IC-P13 · Little crossing birds

- **File:** `icecreamcone/game/assets/sprites/chicks.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Safe Crossing: the little birds that wait on the pavement and cross on red.
- **Stand-in until delivered:** Small ink birds drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six small round sparrow-like birds facing left, in soft browns, buffs and dusty pinks with round staring eyes and thin legs, in the book's odd, gentle way: three standing waiting, two mid-step walking, one flapping off in a fright.
```
