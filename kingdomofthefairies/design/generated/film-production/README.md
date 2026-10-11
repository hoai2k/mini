# Film edition production artwork

[Browse the searchable gallery](index.html).

This delivery follows the 100 production requests in [image-requests.md](../../image-requests.md), using the canonical [character sheets and tableaux](../../references/film-planning/index.html). Native imagegen originals and one generation record per request are retained here. Each record includes the full submitted prompt, reference paths and the generator's native file path.

Prepared WebP files live in the game's `assets/` directory, at their requested dimensions and anchors. `deliveries.json` records native sizes, sprite crops and placement. The source PNGs remain unchanged. The fitter aligns painted bounds; custom anatomical anchors, such as the swimming shoulder position and pull-up ledge line, need alignment review when these sprites are wired into gameplay. Preparation reuses the existing sprite-fitting routine; backcloths are resized to the requested full frame. Delivered film slots are marked in `assets/manifest.json`. Legacy sprites and images are retained.

All 100 production requests from 11 October 2026 have been generated. The requests and manifest track delivery status; any future pending requests remain marked `requested`. The hourly request check additionally delivered `witch-storm` (520 × 340) and `playbill-film` (1400 × 2000), with seven blank act panels plus its title banner. Their native originals and submitted prompts are retained alongside the earlier 80 deliveries. The next hourly check delivered 13 additions: a distinct bosun, a second sleeping crewman, two idle frames each for four crew members and the Water Fairy, and a seated sailor without his guitar for the partial edition. The rejected mirrored bosun frame is retained under `progress/rejected/`; its replacement preserves the lantern and rope sides. A further hourly check delivered the five playable-prologue requests: `prince-court-walk-a`, `prince-court-walk-b`, `prince-bound`, `armour-helmet`, and `armour-shield`. They follow the delivered court-dress prince and canonical Bel-Azor character sheet. New images are available under their film asset IDs; this delivery does not change gameplay, remap legacy asset IDs, or implement the future story chapters.

To prepare saved results and update delivery status:

```sh
python3 kingdomofthefairies/design/source/prepare_film_production.py
python3 kingdomofthefairies/design/source/build_film_assets.py
python3 kingdomofthefairies/design/source/build_film_production_gallery.py
python3 kingdomofthefairies/design/source/build_film_assets.py --check
```

Generation runs keep full-resolution images on disk and print only progress metadata to avoid exceeding the conversation's image-content limit.
