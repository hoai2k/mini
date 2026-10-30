# Reference-guided texture generation

All 2,024 requests for Minecraft 26.3 are integrated into the built-in HD resource
pack: 1,274 block, 740 entity and 10 sky/effect textures. The 56 animated sheets
retain their original frame order and timing. Current file coverage,
sizes, frame counts, transparency, hashes and source job ids are in
[manifest.json](manifest.json). The main request catalog records all 2,024 as
delivered. This folder retains provenance and workflow documentation; the accepted
images live in the resource pack rather than being duplicated here.

[Verification summary](verification.json): 2,024 valid textures, none missing or
invalid; 13 texture-contract tests and 20 Java tests passed. The mod build and
client game test passed with the complete pack loaded, and every texture hash
inside the built jar matches the manifest. The game test produced 28 screenshots.
[Representative gallery](review.jpg) shows terrain, camel, wolf, damaged golem,
cat and llama from that run.

The images are generated with `image_gen.imagegen` using the vanilla textures
as layout references. The vanilla images, client jar, generation state, tool
binaries and review previews stay in ignored `local/smoothcraft/`; they are not
shipped as replacement artwork.

## Preparation and checks

From the repository root, with Pillow, NumPy, SciPy, ImageMagick, a C++17 compiler and
the FFTW3 runtime installed:

```sh
python3 smoothcraft/tools/make_references.py path/to/minecraft-client.jar
python3 smoothcraft/tools/texture_batches.py plan
python3 smoothcraft/tools/texture_batches.py pending --count 4
```

Paint each returned reference atlas with the supplied prompt using the image
generator, then record its output:

```sh
python3 smoothcraft/tools/texture_batches.py record JOB_ID path/to/generated-atlas.png
python3 smoothcraft/tools/texture_batches.py finish path/to/minecraft-client.jar
python3 smoothcraft/tools/texture_batches.py manifest
python3 smoothcraft/tools/check_textures.py \
  --jar path/to/minecraft-client.jar \
  --report local/smoothcraft/checks.json --complete
python3 -m unittest discover -s smoothcraft/tools -p 'test_*.py'
```

`record` prepares and checks candidates under this folder as each batch arrives.
Before integration, pass `--pack smoothcraft/design/generated/reference-guided`
to the checker; its default destination is the integrated HD pack. Block atlas cells use a
small guard crop to exclude neighbouring pixels at fractional cell boundaries.
Simple entity sprites are registered to the occupied reference bounds before cropping;
this handles small sprites that the generator enlarged within a padded cell.
For one/two-component sprites, unrelated neighbouring-cell slivers are excluded
from that registration. Complex UV nets and opaque maps retain their original
cell coordinates; a global bounds fit could otherwise shrink a UV net when a
neighbouring row contributes a stray pixel. Registration checks
the overall extent; internal facial and UV features still need visual review.
Images are resized to the exact requested
dimensions, frames are reassembled in order, and vanilla alpha masks and
`.png.mcmeta` settings are restored. Explicit animation pixel widths/heights
are scaled to the HD dimensions; frame order, timing and other settings stay
unchanged. Neutral biome/dye maps are kept greyscale.

Banner and shield dye layers share a generated neutral white cloth material,
masked with each individual vanilla motif. This preserves printed shapes and
gradients without introducing miniature rendered objects into the dye maps.
Their wood/metal base UV maps use their own generated artwork. Dyeable leather
armour bases and pet collars similarly share a generated neutral leather grain,
with their individual source alpha masks restored. Villager rank badges reuse the
generated emerald, diamond, gold, iron and stone materials through their exact
badge masks. End-crystal beams and dragon death/eye layers use generated neutral
white or magenta light materials through their original effect masks. Iron golem
damage overlays share a generated dark oxidized iron material through the exact
three original crack masks, preserving their increasing damage coverage. Camel eye
details were registered to the original small feature coordinates after a fur
repaint, avoiding extra faces on body regions. Material source hashes,
including reviewed foliage replacements, are recorded in the manifest.

`periodize_rgb.cpp` removes the smooth boundary lighting bias with a periodic
Poisson solve, then matches opposite RGB edge samples. It does not move UV
features or alter alpha masks. Grass, snowy grass, mycelium and podzol side maps
repeat horizontally while retaining their intended fringe at the top. Other
block maps repeat on both axes. The opaque End portal and gateway-beam shader
materials also repeat on both axes; model UV nets and celestial sprites retain
their layout without periodic correction. The helper binary is compiled into ignored
`local/smoothcraft/` on first use.

The checker fails on wrong dimensions, alpha-mask differences, partial alpha
in cutouts, baked colour in neutral tint maps, mismatched repeating RGB edges,
changed/missing vanilla animation metadata, or loss of visible frame variation.
Hidden RGB noise under transparent pixels does not count as motion. `--complete` also fails for any
missing request, so a partial batch cannot pass as the complete set.

## Visual review and integration

Numerical edge agreement does not establish a natural repeated pattern. Review
repeated previews, albedo lighting, the position of UV features, and motion
through the complete animation loop. The optional `seam-reference` and
`seam-finish` commands support image-generated repairs in half-period offset
space; the mask regression test ensures unaffected pixels stay untouched.

The pack is checked in `runClientGameTest`, which photographs the villager,
terrain, shoreline and underwater scenes with Smoothcraft on and off. The optional
mob gallery supports review of UV placement, fur, feathers, skin, wool, equipment
and damage overlays. This checks representative rendering, rather than every
possible mob variant. Numerical edge agreement and exact masks do not establish
that every generated feature or animation looks perfect in every setting.

Set `SMOOTHCRAFT_TEXTURE_REVIEW=true` when running `runClientGameTest` to add
close views of sixteen mob types and a damaged iron golem for UV and material review. This opt-in gallery
includes fur, feathers, skin, insects, wool and metal; it keeps the routine
terrain test short when texture review is not needed.

After review, integrate accepted files and their metadata into the matching
paths under `smoothcraft/mod/src/main/resources/resourcepacks/hd/assets/minecraft/textures/`
and rerun `smoothcraft/design/source/build_requests.py`. Keep rejected candidates
out of the resource pack and leave their requests pending.
