# Film edition production artwork

[Browse the searchable gallery](index.html).

This delivery follows the 100 production requests in [image-requests.md](../../image-requests.md), using the canonical [character sheets and tableaux](../../references/film-planning/index.html). Native imagegen originals and one generation record per request are retained here. Each record includes the full submitted prompt, reference paths and the generator's native file path.

Prepared WebP files live in the game's `assets/` directory, at their requested dimensions and anchors. `deliveries.json` records native sizes, sprite crops and placement. The source PNGs remain unchanged. The fitter aligns painted bounds; custom anatomical anchors, such as the swimming shoulder position and pull-up ledge line, need alignment review when these sprites are wired into gameplay. Preparation reuses the existing sprite-fitting routine; backcloths are resized to the requested full frame. Delivered film slots are marked in `assets/manifest.json`. Legacy sprites and images are retained.

The original 100 production requests from 11 October 2026 have been generated and prepared. The requests and manifest track delivery status; any future pending requests remain marked `requested`. The hourly request check additionally delivered `witch-storm` (520 × 340) and `playbill-film` (1400 × 2000), with seven blank act panels plus its title banner. Their native originals and submitted prompts are retained alongside the earlier 80 deliveries. The next hourly check delivered 13 additions: a distinct bosun, a second sleeping crewman, two idle frames each for four crew members and the Water Fairy, and a seated sailor without his guitar for the partial edition. The rejected mirrored bosun frame is retained under `progress/rejected/`; its replacement preserves the lantern and rope sides. A further hourly check delivered the five playable-prologue requests: `prince-court-walk-a`, `prince-court-walk-b`, `prince-bound`, `armour-helmet`, and `armour-shield`. They follow the delivered court-dress prince and canonical Bel-Azor character sheet. New images are available under their film asset IDs; this delivery does not change gameplay, remap legacy asset IDs, or implement the future story chapters.

To prepare saved results and update delivery status:

```sh
python3 kingdomofthefairies/design/source/prepare_film_production.py
python3 kingdomofthefairies/design/source/build_film_assets.py
python3 kingdomofthefairies/design/source/build_film_production_gallery.py
python3 kingdomofthefairies/design/source/build_film_assets.py --check
```

Generation runs keep full-resolution images on disk and print only progress metadata to avoid exceeding the conversation's image-content limit.

The film-witch correction pass replaced `witch-hooded`, `witch-cloud`, `witch-storm`, `witch-swoop`, and `witch-barrel` with the F7 briefs using the two source frames in `references/film-witch/`. All five were generated with built-in imagegen and reviewed for the visible old face, intact heavy sea-green hooded robe, bare old hands, plain staff where requested, and scene-specific pose. Native originals, full prompts, reference paths, generation IDs and review notes are saved in the per-asset records. Earlier spectre originals and their generation records are preserved under `progress/superseded-witch-spectre/`; their game sprites remain in `assets/interim/witch-*-spectre.webp`. Prepared replacements retain the requested dimensions, anchors and transparency.

## F8: tinted cast alternates

All 64 F8 alternates have been generated with built-in imagegen, reviewed and prepared at the original sprites’ dimensions and anchors. The existing sprite is the pose reference; the three source frames named in each brief guide the soft photographic stage finish and sparse stencil washes. Simplified gowns, plain armour and the gift fairies’ pointed hennins follow the character audit. Court-dress prince poses remain bareheaded and unarmoured. Crew idle frames additionally reference their accepted tinted standing sprite for costume and prop consistency. Native PNGs, full submitted prompts, references, generation IDs and review notes are retained in each `*-tinted.json` record. `progress/f8-requests.json` preserves the initial prompt set and `progress/f8-state.json` records completion. The man-at-arms’ idle-C head direction was corrected; the rejected take and its record remain under `progress/rejected/`.

The alternates are separate `assets/*-tinted.webp` files. Compare them in the film edition with **Settings › Cast look › Tinted**, or `?widowsbay=off&look=tinted`. Every existing original sprite remains unchanged. The production gallery links to both native originals and prepared files.

For a batch that only changes selected sprites, use `prepare_film_production.py --ids <id> ...`; it validates cached deliveries for the other sprites, preserving their existing encoding and refreshing review metadata.

F8 verification: all 64 originals and prepared sprites checked for readable image data, target dimensions, anchors, alpha, local references and accepted review records; all original game sprite files unchanged. A local browser loaded all 64 tinted sprites and rendered 36 film scenes with no page errors. The film gameplay, theme, animation and generated request checks passed.

The lobster anatomy review corrected both poses in both original and tinted looks. Each guard now has two shoulder-to-pincer arms and two legs. The closed pincers visibly enclose the halberd shaft; in the snap pose one pincer grips the upright weapon while the other opens. Enlarged grip/shoulder details were checked. Prior native PNGs, prepared WebPs and generation records are preserved in `progress/rejected/lobster-anatomy/`. The source briefs now state these anatomy and grip constraints explicitly.
