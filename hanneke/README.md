# Hanneke

A shifting collage after the work of Hanneke de Neve, a Dutch-born artist in
New Jersey and a friend of the repository owner. Each scene is one of her
pictures built as a live patchwork, and the controllers reach into it: some
controls nudge a single moon, some swirl the whole picture, and small moves
set up the large ones. The colour comes from her fibercollages, quilts and
paintings, and the interface from the fluid line of her drawings.

So far this folder holds the reference material, the design and the image
requests. Nothing is published yet; a `publish.sh` and a card in the game
library come with the first playable build.

- [`reference/`](reference/README.md): 33 photos of 28 of her works and two of
  her (fibre and textile, paintings, drawings and collage), a catalogue with
  sources, her statement, sampled palettes and style notes on colour and line.
  Reference only, never published.
- [`design/design.md`](design/design.md): the scenes, the layers, the verbs,
  and how the controls work (finding the large ones, setting them up with the
  small ones).
- [`design/image-requests.md`](design/image-requests.md): the image requests
  (for each of ten scenes a composition, its ground and its pieces; morph
  chains; fabric textures; dissolve masks; the title, icon, line drawings and
  threads), generated from
  [`design/source/build_requests.py`](design/source/build_requests.py), which
  also writes `design/asset-list.json`. Edit the data there and rerun it.
  Generated images go in [`intake/`](intake/README.md).
- [`intake/`](intake/README.md): drop box for new photos of her work and
  anything else for this project.

Checks:

```sh
python3 hanneke/design/source/build_requests.py --check
```
