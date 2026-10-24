# Generated texture candidates

This directory contains 85 image-generated candidates for the static, opaque
Tier 1 block requests in [the request catalog](../image-requests.md). Each PNG
uses its request id as its path and is exactly 256x256, RGB, with one frame.
[manifest.json](manifest.json) records the prompts, checksums, source atlas
checksums and cell positions. The image generator produced six 4x4 atlases;
ImageMagick cropped the occupied cells and resized them to the requested size.

These are candidates, not delivered resource-pack textures. Visual inspection
found baked shading, highlights and edge discontinuities in the generated art.
Those need correction and a repeated-tile review before integration. In
particular, gems, obsidian and metal plates have prominent lighting. Grass top
also needs a biome-tint review. The HD pack and generated request statuses are
unchanged so these issues do not enter the game as accepted textures.

Of the 151 Tier 1 requests, 66 have no candidate here: 12 block textures with
transparency or animation requirements, 52 entity UV maps and two sky textures.
The vanilla references required for UV regions, transparency masks and animation
layouts are absent from this checkout. Use `tools/make_references.py` with the
Minecraft client jar as described in the request catalog before generating
those textures. Tier 2 and Tier 3 have not been generated in this pass.

To accept a candidate, correct the albedo and seams, verify it repeated in both
directions, then move it through `smoothcraft/intake/` into the HD resource pack
and rerun `smoothcraft/design/source/build_requests.py`. Do not mark candidates
delivered merely because a generated file exists in this directory.
