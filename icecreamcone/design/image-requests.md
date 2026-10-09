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

14 requested, 140 delivered, 1 retired, 155 in total.

## New minigames: the book's other birds

Scenes, sprites and variants for the minigames of the book's 18 birds that are joining the field guide (their portraits are the IC-R requests above). Each bird's requests are kept in design/source/more/<bird>.json beside this script. The birds join the guide once these are delivered; until then their games draw stand-ins (try them with ?more).

### IC-M01g · Milk Round: garden path and fence

- **File:** `icecreamcone/game/assets/sprites/milk-garden.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Milk Round: in front of each house, the path from the pavement up to its doorstep (the game cuts it off at the step, so near houses show a short path and far ones a long one), and the low garden fence along the back of the pavement, repeated along the street with a gap where each path meets it.
- **Stand-in until delivered:** A pale wash of a path with a few stepping stones, and an ink line of fence posts, drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 1 grid of two pieces, in the delivered street painting's soft dawn light. Left: a garden path of pale flagstones seen from the front and above, running straight away from the viewer: about 300 px wide at the bottom, narrowing to about 120 px at the top, about 900 px tall, with grass edges and a few tufts and daisies along its sides, ending at the top without a doorstep or house. Right: a straight length of low, weathered wooden picket fence seen exactly side-on, about 900 px long and 200 px tall, its posts evenly spaced and its two rails continuous, so that copies placed end to end join without a visible seam (the same post spacing at both ends), with a little grass at its foot. No gate, no people, no animals.
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
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Drippet (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/drippet.png ): a rusty sky-blue water tap whose spout is its long beak pointing left with a brass collar at its mouth and a water drop hanging from it, a blue cross handle on a brass stem as its crest, one big round yellow eye, a grey-blue wing, a fan of pink-red tail feathers and long ochre knobbly legs with curved claws, in two poses side by side on one sheet, each in its own half, facing left, at the portrait's scale: left half, in mid-hop, legs tucked up under its round body and claws curled, a few water drops flung from its spout; right half, skidding, its whole body tipped far back, both legs shot forward and splayed, its eye wide, water sloshing out of its spout. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M16e · The Drippet running and pouring

- **File:** `icecreamcone/game/assets/sprites/drippet-more.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Drip Drop Dash: the Drippet's run (this stride and the portrait by turns) and its pose while it fills a thirsty thing.
- **Stand-in until delivered:** The portrait (or its stand-in) bobbing and tilting as it runs, and tipped forward while it pours.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Drippet (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/drippet.png ): a rusty sky-blue water tap whose spout is its long beak pointing left with a brass collar at its mouth and a water drop hanging from it, a blue cross handle on a brass stem as its crest, one big round yellow eye, a grey-blue wing, a fan of pink-red tail feathers and long ochre knobbly legs with curved claws, in two poses side by side on one sheet, each in its own half, facing left, at the portrait's scale with its feet on the same ground line: left half, running mid-stride, one long leg reaching forward and the other pushing off behind, body tipped slightly forward; right half, standing with its round body tipped forward so its spout points straight down at the floor just in front of its feet, a thin steady stream of water running from the spout's brass mouth, its eye looking down. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
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
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Saw Bird (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/sawbird.png ): its head is a whole carpenter's handsaw held out horizontally, the long grey steel blade with its teeth along the bottom edge pointing left as its beak and the brown wooden handle (with its hand-hole, brass screws and one big yellow eye) as its head, a pink crest above the handle, a round body of pink and slate-blue feathers under the handle, a pink tail and long thin tan legs with curved claws. Here it is sawing, facing left: the whole bird leans forward and down so that its saw-head is perfectly level, the blade pointing left with its toothed edge straight along the very bottom of the picture, and its feathered body, tail and legs are drawn crouched up above and behind the handle (legs folded tight, claws tucked), so nothing hangs below the line of the teeth: the teeth are the lowest part of the picture. Eye narrowed in concentration, a few curls of sawdust at the teeth. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M17e · The Saw Bird snagged and proud

- **File:** `icecreamcone/game/assets/sprites/sawbird-poses.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Saw It Straight: the Saw Bird caught on a knot (or after a crooked cut), and standing proud beside the plank after a straight one.
- **Stand-in until delivered:** The sawing pose shaken for a snag; the portrait hopping beside the plank for pride.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Saw Bird (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/sawbird.png ): its head is a whole carpenter's handsaw held out horizontally, the long grey steel blade with its teeth along the bottom edge pointing left as its beak and the brown wooden handle (with its hand-hole, brass screws and one big yellow eye) as its head, a pink crest above the handle, a round body of pink and slate-blue feathers under the handle, a pink tail and long thin tan legs with curved claws, in two poses side by side on one sheet, each in its own half, facing left: left half, snagged, framed exactly like its sawing pose (the whole bird crouched forward with its saw-head level and pointing left, the toothed edge along the very bottom of the picture, body and folded legs above and behind the handle) but with the blade bowed and twanging (a few small ink wobble lines beside it) and its eye wide in alarm; right half, proud, standing upright on its two thin legs at the portrait's scale, its saw-head tipped up high like a salute, chest feathers puffed out, a few curls of sawdust at its feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
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
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described. The Radio Bird (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/radiobird.png ): a mustard-yellow 1960s portable transistor radio with a carrying handle on top, a red knob and a silver dial on its front and a green speaker grille, a long neck striped mustard and sage, a small head with a big round eye, a long pink beak and a pink crest, a teal-blue wing, a plume of pink tail feathers and long pink legs, in three poses in a row on one sheet, each in its own third, facing left, at the portrait's scale with its feet on the same ground line: 1) listening, its long striped neck curved down and round so its head is cocked close to its own green speaker grille, eye narrowed, a few faint fuzzy static marks around the grille; 2) singing, head thrown back on its long neck, beak wide open, crest flared, a few small ink music notes coming from the grille; 3) startled, neck jerked back into an S, crest standing straight up, eye wide, one foot lifted. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```
