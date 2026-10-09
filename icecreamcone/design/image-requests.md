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

2 requested, 225 delivered, 1 retired, 228 in total.

## New minigames: the book's other birds

Scenes, sprites and variants for the minigames of the book's 18 birds that are joining the field guide (their portraits are the IC-R requests above). Each bird's requests are kept in design/source/more/<bird>.json beside this script. The birds join the guide once these are delivered; until then their games draw stand-ins (try them with ?more).

### IC-M06f · Broomwhisk sweeping, painted again at one scale

- **File:** `icecreamcone/game/assets/sprites/broomwhisk-sweep.png`
- **Size:** 2048 x 1024, transparent
- **Used for:** Replaces IC-M06d in the same file: Clean Sweep: the Broomwhisk as it sweeps across the floor and as it flicks its bristles.
- **Stand-in until delivered:** The delivered IC-M06d sheet, drawn at a compromise scale (head a little big, broom a little small).
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Broomwhisk (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/broomwhisk.png): an old straw broom alive as a bird; the long ochre broomstick is its neck, with a small head on top, a pinkish crest, one round pale-yellow eye and a long slate-blue beak pointing left; its body is the bound straw head of the broom (a bulb of straw tied with twine bands), whose loose ochre-and-pink straw bristles hang like a skirt above two thin ochre legs with dark claws. Two poses side by side on one sheet, each in its own half, at the same scale, facing left, standing on its legs: left, mid-sweep, the broomstick neck leaning back to the right and the straw skirt dragged back to the right, its tips brushing the floor; right, flicking, the straw skirt fanned out and swept hard forward to the left along the floor with a few bits of straw flying. Feet at the bottom of each cell. PAINTED AGAIN, at one scale: the delivered sheet painted the head at the portrait's size but the broom about 12% smaller (its binding 0.80 to 0.93 of the portrait's), so no single size fits the whole bird. Paint the Broomwhisk in every cell at exactly the scale of its portrait painting: the head (from the beak's tip to the back of the eye) and the broom (the width of the twine binding, the length of the broomstick neck) all the same size as in the portrait, in every pose. Same poses as before. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### IC-M06g · Broomwhisk pushing, braced and pleased, painted again at one scale

- **File:** `icecreamcone/game/assets/sprites/broomwhisk-poses.png`
- **Size:** 3072 x 1024, transparent
- **Used for:** Replaces IC-M06e in the same file: Clean Sweep: the Broomwhisk sweeping into or out of the picture, bracing against a gust (mirrored to face the wind), and pleased when something lands in the pan.
- **Stand-in until delivered:** The delivered IC-M06e sheet, drawn at a compromise scale (head a little big, broom a little small).
- **Status:** requested

```text
Children's picture-book illustration in the style of Arnold Lobel's 1971 book The Ice-Cream Cone Coot and Other Rare Birds: fine brown-black pen-and-ink line with delicate crosshatching and stippling, soft transparent watercolour washes in a slightly faded early-1970s print palette (lemon and mustard yellow, olive and sage green, dusty pink and mauve, strawberry pink, ochre, slate blue, warm grey), on cream paper with visible grain. Whimsical, gentle and slightly eerie, dreamlike mood. No text, no lettering, no watermark, no border, no UI. Exactly the same bird as in its delivered portrait (same design, proportions, colours, line and texture; use that portrait image as the reference), at the same scale, facing left, with only the change described.  The Broomwhisk (https://raw.githubusercontent.com/hoai2k/mini/main/icecreamcone/game/assets/subjects/broomwhisk.png): an old straw broom alive as a bird; the long ochre broomstick is its neck, with a small head on top, a pinkish crest, one round pale-yellow eye and a long slate-blue beak pointing left; its body is the bound straw head of the broom (a bulb of straw tied with twine bands), whose loose ochre-and-pink straw bristles hang like a skirt above two thin ochre legs with dark claws. Three poses in a row on one sheet, each in its own third, at the same scale, facing left, standing on its legs: left, pushing straight ahead, knees bent and the straw skirt pressed down and splayed out wide on both sides along the floor; middle, braced against a strong wind blowing from the left, leaning into it, its crest and the loose straws of its skirt streaming back to the right; right, pleased, standing tall and straight with its straw skirt fluffed out full and its head held high. Feet at the bottom of each cell. PAINTED AGAIN, at one scale: the delivered sheet painted the head at the portrait's size but the broom about 12% smaller (its binding 0.80 to 0.93 of the portrait's), so no single size fits the whole bird. Paint the Broomwhisk in every cell at exactly the scale of its portrait painting: the head (from the beak's tip to the back of the eye) and the broom (the width of the twine binding, the length of the broomstick neck) all the same size as in the portrait, in every pose. Same poses as before. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```
