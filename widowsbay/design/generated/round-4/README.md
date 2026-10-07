# Fourth art round — idle poses, 7 October 2026

Eighteen B/C pose variants for nine existing sprites, generated with built-in
imagegen using the delivered frame A as the precise edit input. See the
[A/B/C comparison and A/B/A/C playback gallery](index.html), [complete prompts](prompts.json),
and [asset validation](validation.json).

Full-size generated outputs are in `originals/`; PNG copies of the exact
reference images are in `references/`. PNG deliveries are retained in
`widowsbay/intake/`; quality-94 alpha WebP copies are installed in `assets/`
and registered as delivered in the manifest. The existing idle player selects
A, B, A, C when Settings → Extra Animations is enabled. The jellyfish loop is
unchanged and the renderer required no changes.

Sizing retains the whole generated canvas, then translates it vertically to
the reference’s lowest painted row. It does not crop to limb bounds or recenter
the figure, which would make lowered-arm poses zoom. Exact source dimensions,
whole-canvas bounds, baseline and placement are recorded in the prompt manifest.
Intentional pose changes include small head/body movement and different foot
positions; the shared floor baseline remains identical in every exported pair.

`prepare_delivery.py` reproduces PNG sizing from retained originals and recipes
into `delivery/`. Browser checks verify all nine previews display A, B and C,
and the actual asset loader and idle selector load all 18 variants in the
intended A/B/A/C order. Extra Animations defaults to Off. All six game and
animation test suites pass.

Local animation edits present before synchronization were preserved in the
stash named `Preserve local animation edits before main sync 2026-10-07`.
