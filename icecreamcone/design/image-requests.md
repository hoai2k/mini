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

4 requested, 154 delivered, 1 retired, 159 in total.

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
