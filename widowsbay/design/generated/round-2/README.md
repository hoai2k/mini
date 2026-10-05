# Second art round

All 56 C8–C12 requests and `touch-pause` in C13 were generated with the built-in
image generator. The earlier delivered artwork supplied the palette, painted
textures and character references. State variants use their new base image as
the edit input.

See [the review gallery](index.html), [complete prompts](prompts.json), and
[requested specifications](requests.json). Full-size selected PNGs are in
`originals/`; earlier takes used as correction inputs are in `rejected/`.
Production PNGs are in `../../../intake/`, named by request id. They are ready
for integration; the existing game assets and manifest statuses remain as they
were before this delivery.

Rebuild the sized deliveries and gallery from the retained recipes with:

```sh
python3 widowsbay/design/source/prepare_round2_delivery.py
```

Preparation preserves generated alpha, sizes sprites to their requested
anchors, and retains the crank's canvas padding so its axle stays centred.
The three grotto ground rows are cropped to a continuous painted top edge;
the exact crop and placement are recorded in `prompts.json`. Rectangular strips
retain one transparent canvas row when their cropped art fills the frame.
The five review sheets show the complete delivery on a neutral background.
