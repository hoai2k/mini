# Film edition production artwork

[Browse the searchable gallery](index.html).

This delivery follows the 80 production requests in [image-requests.md](../../image-requests.md), using the canonical [character sheets and tableaux](../../references/film-planning/index.html). Native imagegen originals and one generation record per request are retained here. Each record includes the full submitted prompt, reference paths and the generator's native file path.

Prepared WebP files live in the game's `assets/` directory, at their requested dimensions and anchors. `deliveries.json` records native sizes, sprite crops and placement. The source PNGs remain unchanged. Preparation reuses the existing sprite-fitting routine; backcloths are resized to the requested full frame. Delivered film slots are marked in `assets/manifest.json`. Legacy sprites and images are retained.

The requests and manifest show the current delivery count. This is an incremental batch; pending requests remain marked `requested`. New images are available under their film asset IDs; this delivery does not change gameplay, remap legacy asset IDs, or implement the future story chapters.

To prepare saved results and update delivery status:

```sh
python3 kingdomofthefairies/design/source/prepare_film_production.py
python3 kingdomofthefairies/design/source/build_film_assets.py
python3 kingdomofthefairies/design/source/build_film_production_gallery.py
python3 kingdomofthefairies/design/source/build_film_assets.py --check
```

Generation runs keep full-resolution images on disk and print only progress metadata to avoid exceeding the conversation's image-content limit.
