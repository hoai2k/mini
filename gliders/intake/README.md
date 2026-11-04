# Gliders intake

## Native alpha first

Generate cutouts, sprites, stickers and emblems directly with genuine alpha transparency whenever available (`transparent_background: true` with built-in image generation). Verify the output has usable transparency, including gaps and clean edges, and preserve alpha through PNG/WebP delivery. Only try a flat-colour background and keying after native-alpha generation has been attempted and fails to work properly. Do not key an already transparent image. This takes precedence over older matte/keying instructions or historical prompts below; opaque artwork stays opaque.

Drop files for Gliders here and ask for them to be integrated. Nothing in this
folder is published or loaded by the game.

Save each image under the file name given in its **File** line in
[`../design/image-requests.md`](../design/image-requests.md). On integration it
moves to that path under `gliders/game/`, its status is set to `delivered` in
`../design/source/build_requests.py`, and the script is rerun. Images on a flat
`#FF00FF` background have the magenta keyed out.

Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
