# Fibre Art assets

48 generated images from the requests in `../../design/image-requests.md`:
ten compositions, nine grounds, eight transparent piece sheets, the title,
interface drawings and threads, four morph chains, eight fabric swatches and
six greyscale dissolve maps. The game loads optimised copies made from these
by `../../tools/build_web.py` into `../web/`; these full-size files are not published.

The built-in image generator used the local artwork references. Grounds and
piece sheets used their generated composition as the reference. Files were
converted to the requested PNG/WebP formats and dimensions; the requested
dimensions sometimes exceed the generator's native output size. Alpha was
preserved. Dissolve maps are opaque single-channel greyscale, spanning 0–255.

`../../design/image-deliveries.json` records prompts, references, native and
saved dimensions, hashes, and failed requests. `../../design/generated-preview.jpg`
shows the generated images; `../../design/pieces-preview.jpg` shows all 66
extracted tableau pieces. The extracted paths, names and sheet coordinates
are in `pieces.json`, in request order. Rebuild those cuts with
`python3 fibreart/tools/extract_pieces.py` (Pillow, NumPy, SciPy); review the
component selections whenever a sheet changes. These are approximate generated
matches to the composition, not pixel-identical layers for reconstruction.

Fabric swatches have the requested appearance, but repeat-edge continuity is
approximate; seams can remain visible, especially in lace and paisley. Check
them with the intended wrapping/sampling before using them as large fills.

Six requests remain undelivered because the image service rejected their
inputs with category `other`, without a more specific explanation:

- HK-U02: app icon.
- HK-T01-B: Viriditas ground.
- HK-T02-C: Moons and hearts pieces.
- HK-T06-C: Dancers pieces.
- HK-M02: tree morph chain.
- HK-M04: bird morph chain.

Their request and asset-list statuses remain requested/false.
