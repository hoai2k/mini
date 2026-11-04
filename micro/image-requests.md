# Micro prototypes: image requests

## Native alpha first

Generate cutouts, sprites, stickers and emblems directly with genuine alpha transparency whenever available (`transparent_background: true` with built-in image generation). Verify the output has usable transparency, including gaps and clean edges, and preserve alpha through PNG/WebP delivery. Only try a flat-colour background and keying after native-alpha generation has been attempted and fails to work properly. Do not key an already transparent image. This takes precedence over older matte/keying instructions or historical prompts below; opaque artwork stays opaque.

Open artwork requests for Micro Zoom (the game and its worlds in `micro/game/`). Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `design/source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/game/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/game/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

0 requested, 85 delivered, 85 in total.

Nothing is open right now.
