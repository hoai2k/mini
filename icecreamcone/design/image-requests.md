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

22 requested, 132 delivered, 1 retired, 155 in total.

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

### IC-M10b · Wetweather Wren, umbrella open

- **File:** `icecreamcone/game/assets/sprites/wren-poses.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Puddle Hop: the Wren with its umbrella popped open, floating over a puddle and walking with it open, and blown inside out after snagging an awning. The game flips it to face the way it walks.
- **Stand-in until delivered:** A black canopy drawn in code above the furled stand-in.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Wetweather Wren (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/wetweatherwren.png ): a furled dark grey-brown umbrella as its body, its cloth folds held by a strap with a brass button and brass rib tips poking out, a feathered brown wing lying along its side, a round brown wren's head with a big round yellow eye and a long pale ochre beak at the front (the umbrella's tip end), the curved brown wooden crook handle rising behind as its tail, and long ochre scaly legs with claws, in three poses in a 3 x 1 row, one per 1024 x 1024 cell, all at the same scale, each facing left with its feet at the bottom of its cell and the top of the canopy near the top, about 85% of the cell high. Its umbrella has popped open: the shaft now stands upright through the bird, the wren's head and beak at the top as the umbrella's tip, and the dark grey-brown cloth spread out below the head as a wide round canopy with brass-tipped ribs and a scalloped edge, the crook handle hanging down below the body as a tail, the feathered wing tucked against the shaft. 1) Floating: legs dangling, toes pointed, eye calm. 2) The same, standing on the ground mid-stride, one leg forward. 3) Blown inside out: the canopy flipped upward into a cup, ribs bent and a brass tip or two sprung loose, the eye wide, legs splayed in surprise. No rain and no puddle (the game draws its own). Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M10c · Puddles and market awnings

- **File:** `icecreamcone/game/assets/sprites/rain-street.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Puddle Hop: the puddles the Wren hops (the game stretches them to each puddle's width) and the striped market-stall awnings it must walk under with its umbrella shut (the game draws their poles and stretches each to its length).
- **Stand-in until delivered:** Blue-grey puddle blobs and striped scalloped awnings drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 2 x 2 grid of four street things, each centred in its own 1024 x 512 cell and filling about 85% of the cell's width, seen from the side at a low angle: top left, a small round rain puddle on flagstones, a flat ellipse about five times as wide as it is tall, grey-blue water with a pale reflection of the sky and a ring of ripples; top right, a long rain puddle, a flat irregular ellipse about nine times as wide as it is tall, the same water; bottom left, a market stall's canvas awning seen from the front, a straight top edge and a scalloped hanging lower edge, striped strawberry pink and cream, about four times as wide as it is tall, wet and dripping; bottom right, the same awning striped sage green and cream. No poles, frames, stalls or ground under the awnings (the game draws its own poles), and no ground round the puddles beyond their wet edge.
```

### IC-M10d · Wetweather Wren, drenched

- **File:** `icecreamcone/game/assets/sprites/wren-splash.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Puddle Hop: the Wren for the moment after it lands in a puddle and splashes, before it walks on (the game flips it to face the way it walks).
- **Stand-in until delivered:** The furled stand-in squashed down, with drops falling off it.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Wetweather Wren (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/wetweatherwren.png ): a furled dark grey-brown umbrella as its body, its cloth folds held by a strap with a brass button and brass rib tips poking out, a feathered brown wing lying along its side, a round brown wren's head with a big round yellow eye and a long pale ochre beak at the front (the umbrella's tip end), the curved brown wooden crook handle rising behind as its tail, and long ochre scaly legs with claws, just after landing in a puddle: still furled, ankle-deep in a small grey-blue splash of puddle water, drenched, its cloth sagging and streaming, drops flying off its beak and crook handle, its head shaken to one side with the eye squeezed half shut, knock-kneed. Facing left, feet at the bottom, at the same scale and framing as the portrait. No falling rain (the game draws its own). Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M10e · Wetweather Wren walking

- **File:** `icecreamcone/game/assets/sprites/wren-walk.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Puddle Hop: the Wren walking along the dry pavement, furled, two strides swapped as it goes (the portrait stands in a painted puddle with painted rain, which looks wrong on dry ground and in the air).
- **Stand-in until delivered:** The portrait, with its puddle clipped off while it is in the air.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Wetweather Wren (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/wetweatherwren.png ): a furled dark grey-brown umbrella as its body, its cloth folds held by a strap with a brass button and brass rib tips poking out, a feathered brown wing lying along its side, a round brown wren's head with a big round yellow eye and a long pale ochre beak at the front (the umbrella's tip end), the curved brown wooden crook handle rising behind as its tail, and long ochre scaly legs with claws, walking, furled, exactly as in the portrait but WITHOUT the painted rain drops and WITHOUT the puddle under its feet, in two frames side by side, each in its own half and at the same scale, facing left, feet at the bottom: left, its left leg stepping forward and the right pushing off behind; right, the other way about, the body a little higher mid-stride. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M11b · Dishes from the side

- **File:** `icecreamcone/game/assets/sprites/dishes.png`
- **Size:** 3072 x 2048, transparent
- **Used for:** Slippery Dishes: the wet dishes flying through the air (the game spins them) and standing in the rack.
- **Stand-in until delivered:** Plates, a bowl, a cup and pans drawn in code from the side.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six clean, wet, shiny dishes, each centred in its own 1024 x 1024 cell, all seen from the side at eye level (a plate shows as a flat, slightly tilted ellipse), each about 70% of the cell wide, with a few drops of water and a soap bubble or two on them: 1) a white dinner plate with a slate-blue band round its rim; 2) a cream soup bowl with a mustard rim; 3) a tea cup with a mauve rim and its handle on the right; 4) a steel saucepan with its straight handle out to the right; 5) a black iron frying pan with its long handle out to the right; 6) a glazed ochre pie dish with a fluted rim.
```

### IC-M11e · Glove Dove cheering and dismayed

- **File:** `icecreamcone/game/assets/sprites/glovedove-poses.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Slippery Dishes: the Glove Dove cheering when a dish lands in the rack, and dismayed when one smashes.
- **Stand-in until delivered:** The portrait hopping, or squashed down.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Glove Dove (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/glovedove.png ): its head and long neck are one long pink rubber washing-up glove held level, the glove's fingers splayed back as a crest on top of a dove's head with a round yellow eye and a long open pink beak at the front, the glove's long studded cuff stretching straight back behind the head to a ruffled open cuff end, on a round body of scalloped blue-grey feathers, with long ochre scaly legs and dark claws, in two poses side by side, each in its own half and at the same scale, facing left, feet at the bottom: left, cheering: the long glove neck swung up at a jaunty angle with the cuff end high, the finger crest fanned wide, beak open, one foot lifted in a little jump; right, dismayed: the long glove neck drooping down at the cuff end, the finger crest curled in, the head lowered and the eye wide, as if it has just dropped a plate. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M11f · Glove Dove catching and flicking

- **File:** `icecreamcone/game/assets/sprites/glovedove-toss.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Slippery Dishes: the Glove Dove bracing to catch a falling dish on top of its long glove neck, and flicking it up into the air (the game draws the dish).
- **Stand-in until delivered:** The portrait braced, then tipped back, with little pink marks over the glove while a catch is ready.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Glove Dove (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/glovedove.png ): its head and long neck are one long pink rubber washing-up glove held level, the glove's fingers splayed back as a crest on top of a dove's head with a round yellow eye and a long open pink beak at the front, the glove's long studded cuff stretching straight back behind the head to a ruffled open cuff end, on a round body of scalloped blue-grey feathers, with long ochre scaly legs and dark claws, in two poses side by side, each in its own half and at the same scale, facing left, feet at the bottom: left, ready to catch, crouched a little with knees bent, the long glove neck held dead level and steady like a tray, the head tipped to look up with the eye on the sky; right, flicking, sprung up on tiptoe, the long glove neck snapping upward from the shoulders so the cuff end points up at an angle, a few soap drops flying off it. No dish (the game draws it). Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M12b · The big watch face

- **File:** `icecreamcone/game/assets/sprites/watch-face.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Set the Clocks: the Tit Trush's watch face, large, whose hands the player turns (the game draws the hands, the crown and the chain).
- **Stand-in until delivered:** A gold ring and a cream face with numbers drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. The face of the Ten O'clock Tit Trush's gold pocket watch (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/titthrush.png ) seen straight on and filling the image, in the same gold and cream: a round, slightly worn gold case with a little engraved and crosshatched edge, and inside it a cream face exactly centred in the image whose diameter is 80% of the image's width, with black old-fashioned serif numbers 1 to 12 and a ring of fine minute ticks round its edge, like the painting's face. No hands at all, and no lid, crown, bow or chain (the game draws them). Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
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
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Ten O'clock Tit Trush (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/titthrush.png ): a round gold pocket watch as its body, its cream face showing ten o'clock with black numerals and blue steel hands, the hinged gold lid open at its front, a small gold head on top with a big round eye and a long thin gold beak, the winding crown and ring bow on top of the head, a pink plume crest behind the head, a pink feathered wing at the back, a gold chain curling out behind as its tail, and pink scaly legs with dark claws, singing: its head tipped back and its long beak wide open, the pink crest and wing lifted, the lid swung a little wider, standing on both feet, at the same scale and framing as the portrait, facing left. Its face still shows ten o'clock. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M12e · Tit Trush flustered

- **File:** `icecreamcone/game/assets/sprites/titthrush-fluster.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Set the Clocks: the Tit Trush when the wrong time is set (the crown jams) or a town clock gives up waiting.
- **Stand-in until delivered:** The portrait shaking.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Ten O'clock Tit Trush (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/titthrush.png ): a round gold pocket watch as its body, its cream face showing ten o'clock with black numerals and blue steel hands, the hinged gold lid open at its front, a small gold head on top with a big round eye and a long thin gold beak, the winding crown and ring bow on top of the head, a pink plume crest behind the head, a pink feathered wing at the back, a gold chain curling out behind as its tail, and pink scaly legs with dark claws, flustered: leaning back on its heels, its pink crest and wing ruffled and standing on end, its beak open in an indignant squawk, the lid flapping half shut, the chain tail swinging, little ink shake lines round its case. Its face still shows ten o'clock. Facing left, at the same scale and framing as the portrait. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M13b · Windows and the fuse box

- **File:** `icecreamcone/game/assets/sprites/swift-house.png`
- **Size:** 1536 x 1024, transparent
- **Used for:** Lights On: each of the twelve windows shows one of four states (dark, asking for a light, reading by a lamp, asleep with the lamp still on); the fuse box hangs on the garden wall, closed or blown.
- **Stand-in until delivered:** Window frames with curtains, little round creatures, a table lamp and a grey fuse box drawn in code.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. A sprite sheet of separate objects on one transparent background, evenly spaced in the grid the prompt gives, each object centred in its cell with clear empty space all round it (no object touching another or the edge), all lit the same way from the upper left, no cast shadows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. A 3 x 2 grid of six pictures, each in its own square cell, all four windows exactly the same size and framing (about 400 px wide and 430 px tall, seen straight on), row by row: 1, a square old sash window at night, dark blue-black glass, dusty-pink curtains drawn back at the sides, a wooden sill, nobody inside; 2, the same dark window with a small brown mouse in a striped nightshirt standing inside, one paw raised waving, holding a closed book; 3, the same window glowing warm yellow from inside, a little table lamp with a pleated pink shade lit on the right, the mouse sitting reading an open book in its light; 4, the same lit window, the lamp still on, the mouse asleep in a small bed under a patchwork blanket with its book fallen open on the floor; 5, an old grey-painted metal fuse box with a little door, a round dial and a big switch lever pointing up, about 300 x 400 px; 6, the same fuse box blown: its lever snapped down, a black scorch mark and a puff of grey smoke with a few yellow sparks. The windows' wooden frames and sills fill each window picture edge to edge so they line up on the house wall.
```

### IC-M13c · Plugsocket Swift: flying, plugging in, singed

- **File:** `icecreamcone/game/assets/sprites/swift-poses.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Lights On: the Swift flies from window to window (pose 1), dives at a socket as it plugs a lamp in (pose 2), and hangs singed while the fuse is blown (pose 3). The game mirrors it to fly right and draws the bulb's glow.
- **Stand-in until delivered:** The portrait (or its stand-in) with ink-and-wash wings drawn in code: beating, swept back and tilted for the dive, drooping with grey smoke when singed.
- **Status:** delivered

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Plugsocket Swift (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/plugsocketswift.png), exactly as painted there: a clear glass light-bulb head with a glowing orange coiled filament, one round pale eye and a long pointed tan beak, on a ribbed brass screw-cap neck; a round blue-green body whose front is a cream wall socket with two slots, a round earth hole and two brass screws; dusty-pink wings; a grey flex for a tail ending in a two-pin plug; thin tan legs with dark claws. Three poses side by side, each in its own square third of the sheet, the socket body at the exact centre of each square and the bird filling about 80% of the square's width, all at the same scale, facing left, seen from the side: 1, in flight: its pink wings spread wide and swept back like a swift's, the flex and plug streaming out behind, legs tucked up under the body, the bulb stretched forward, its filament glowing; 2, plugging in: diving head first and down to the left, wings swept right back, legs reaching forward, the bulb blazing bright with little rays; 3, singed: hovering limply, wings drooping, a few feathers ruffled and sooty, the bulb dark and grey with a thin crack and the filament out, a small wisp of smoke rising from the brass cap. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
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
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Saltshaker Shrike (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/saltshakershrike.png), exactly as painted there: a fluted clear-glass salt shaker full of white salt for its body; its head is the domed, perforated silver cap with a black shrike's eye mask, one round pale eye and a dark hooked beak; mauve and olive-brown wings and tail; thin olive legs with black claws. Four poses side by side, each in its own square quarter of the sheet, all at the same scale, facing left, each hanging UPSIDE DOWN by its claws from an unseen horizontal rail at the very top of the square, like a bat: its legs go straight up from the body to the claws, which grip a point at the top centre of the square; the glass body hangs below them and the domed cap points straight down, its holes about 75% of the way down the square and centred, the hooked beak turned to the left. Lit from the upper left as a real object hanging upside down would be. 1, hanging still, calm; 2, shaking: swung slightly to one side, a little puff of white salt grains spilling from the cap's holes; 3, pleased: beak wide open in a cheerful squawk, wings flared a little; 4, flinching: body pulled up tight towards the rail, wings clamped, eye squeezed half shut. No rail drawn. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
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
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Soupladle Lark (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/ladlelark.png), exactly as painted there: one speckled grey enamel soup ladle in a single piece, its deep round bowl the body (open at the top, behind the neck), its long handle rising as a slender neck to a small head with one round pale eye and a long tan beak, and the handle's hooked end curling up and back from the top of the head as a crest; small feathery grey-blue wings and tail; thin ochre legs with dark claws. Three poses side by side, each in its own square third of the sheet, all at the same scale, facing left, the ladle's bowl at the exact centre of each square: 1, hovering in the air: wings beating either side of the bowl, legs tucked up, the neck curved with the head looking down; 2, dipping: tipped forward bowl first, the bowl's open top turned down to the lower left as if scooping, wings swept up, the neck bent down; 3, rising: level again, wings pushing down, the bowl brimming with golden soup with a carrot coin and a pea showing, drops of broth falling from its rim. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
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
