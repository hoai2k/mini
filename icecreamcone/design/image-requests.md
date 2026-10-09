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

3 requested, 216 delivered, 1 retired, 220 in total.

## New minigames: the book's other birds

Scenes, sprites and variants for the minigames of the book's 18 birds that are joining the field guide (their portraits are the IC-R requests above). Each bird's requests are kept in design/source/more/<bird>.json beside this script. The birds join the guide once these are delivered; until then their games draw stand-ins (try them with ?more).

### IC-M08e · Garbage Canary: the canary out of its bin

- **File:** `icecreamcone/game/assets/sprites/garbagecanary-neck.png`
- **Size:** 3072 x 2048, transparent
- **Used for:** Bin Day: the canary that lives in the bin. When the lid opens it rises out of the bin's mouth, stretches its neck to reach a passing thing, grips it in its beak, pulls it down into the bin and pops back up; it squawks when it has caught something that isn't rubbish and sings after a run. The game anchors each cell's neck base at the bin's mouth and turns the whole piece to aim the reach, and draws the caught thing between the open tips of the beak in the gripping pose.
- **Stand-in until delivered:** A yellow head on a stretching neck drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The canary from the Garbage Canary (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/garbagecanary.png), exactly as painted there: the same yellow canary with its big round staring eye with a dot pupil, its long pale-ochre pointed beak, its fluffy yellow head feathers, in the same line and colours. A 3 x 2 grid of six poses of ONLY the canary's head and neck (no bin, no lid, no body, no legs), each in its own 1024 x 1024 cell, facing left, at exactly the portrait's scale (the head the same size as painted there, about 140 px tall in a cell). Registration, the same in every cell: the bottom of the neck is a soft rounded stump of feathers whose middle is exactly on the cell's vertical centre line, 88% of the way down; the neck rises from there straight up (the game tilts the whole piece to aim it), and nothing is drawn below 92%. Top row, left to right: 1) ready: a short neck, the head just above the stump, looking left, beak shut; 2) reaching: the neck stretched long and thin straight up, the head at the top leaning left, beak wide open ready to snatch; 3) gripping: the same long neck, the beak clamped nearly shut with a clear empty gap between its tips (the game draws the caught thing there). Bottom row: 4) pulling in: the neck bent down in an S, the head ducked low beside the stump, beak shut and tugging, as if dragging something down; 5) squawking: a short neck, head thrown up, beak wide open, feathers ruffled, a few spat crumbs; 6) singing: a short neck, head tipped up happily, beak open in song, two or three small ink musical notes. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M08f · Garbage Canary: the lid alone

- **File:** `icecreamcone/game/assets/sprites/garbagecanary-lid-only.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Bin Day: the lid on its own, swung up on its hinge while the canary is out of the bin (the canary's head is drawn separately, IC-M08e).
- **Stand-in until delivered:** A grey lid with a handle drawn in code.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Garbage Canary's dustbin lid (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/garbagecanary.png), ONLY the lid, exactly as in the right half of its lid sheet (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/sprites/garbagecanary-lid.png): the same rusty grey galvanised lid with its handle on top, tipped up at the front exactly as there, at the same scale and in exactly the same place in the frame (framed like the portrait, so it lays over the bin's left half exactly), but with NO canary under it: under the lid's front edge only the lid's own dark rusty underside shows. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M08g · Garbage Canary walking

- **File:** `icecreamcone/game/assets/sprites/garbagecanary-walk.png`
- **Size:** 4096 x 1024, transparent
- **Used for:** Bin Day: the bin walks left and right along the street and back and forth across the pavement and road. Each frame replaces the bin piece (the left half of IC-M08c) while it walks; the lid is drawn over it as before.
- **Stand-in until delivered:** The standing bin piece bobbing as it walks.
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Garbage Canary's bin piece, exactly as the left half of its lid sheet (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/sprites/garbagecanary-lid.png): the rusty fluted dented dustbin with its ring handle, the canary's yellow wing and paper-scrap tail, its thin orange legs, WITHOUT its lid and without the canary's head, its round open top showing a dark inside, facing left. A 4 x 1 row of four frames of a walk cycle, each in its own 1024 x 1024 cell framed exactly like the portrait (same scale, the bin in exactly the same place in every frame, the feet's line 97% of the way down): 1) left leg forward, right leg back; 2) legs passing, the bin raised a little; 3) right leg forward, left leg back; 4) legs passing, the bin raised a little. Only the legs move (and the bin rises at most 2% in frames 2 and 4); the bin, wing and tail are otherwise identical. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```
