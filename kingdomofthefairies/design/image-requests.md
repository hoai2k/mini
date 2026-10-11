# Kingdom of the Fairies — images and production direction

The complete [film story](film-story.md) and [five-act design](acts.md) are the
primary briefs. Use the original 1903 film’s theatrical framing, hand-painted
sets, costume gestures, shells, coral, enchanted armour, tower and cloud
transformations. The default game does not use modern band imagery.

## New delivered artwork

| Asset | Delivery | Use |
| --- | --- | --- |
| Fairy title | `assets/fairies-title.webp`; PNG original in `generated/fairies/title-original.png` | Default title and game index cover. Original logo remains query-only. |
| Full-journey concept sheet | `generated/fairies/story-sheet.webp`; PNG original in `generated/fairies/story-original.png` | Documentation reference spanning all twelve story groups. |
| Install icons | `icons/*.png`, fitted from new title art | Default home-screen installation; originals in `icons/legacy/`. |

See [delivery notes and prompts](generated/fairies/README.md). Generated concepts
are illustrative; the film and written continuity have priority. The whale panel was revised to show the prince’s party leaving its mouth;
Azurine remains captive until the burning-castle rescue.

## Existing film reference images

The [expanded-world gallery](references/expanded-world/index.html) includes the
betrothal court, rampart, chariot, armoury, prison vision, hooded witch, demons,
fairy gifts and sea-moat tower. Its captured source frames and prompts explain
which details are reconstructed. The new sheet adds the complete underwater,
whale, rescue and wedding progression to those earlier studies.

## Future production requests

| Group | Characters and props | Setting or transformation |
| --- | --- | --- |
| Betrothal and curse | Bel-Azor, Azurine, Aurora, three gift-bearing fairies, hostile witch; ring, flower, crown, gold and cradle | Royal court; shell-shaped bed; trapdoor apparition |
| Abduction and vision | Bound Azurine, demons, winged chariot, torches, broom | Rampart, airborne procession, armoury-to-tower dissolve |
| Arming and crossing | Prince in protected armour, helmet and sword, fairy gesture, royal sailors | Galley departure, mechanical water storm and wreck |
| Undersea rescue | Water fairy, conch/dolphin carriage, octopus, revived party, fish and lobster mounts | Wreck, submarine caves, lobster palace, sea-flora-to-azure-grotto dissolve |
| Neptune and whale | Neptune, tritons, naiads, lobster guards, swallowed travelers | Shell throne, whale entrance, shore delivery |
| Coastal rescue | Aurora guiding, prince diving/swimming, demon fire-setters, carried Azurine, witch in barrel | Cave exit, cliff/sea gap, prison tower, burning stair collapse, whirlpool |
| Wedding | Royal family, couple, heralds, pages and crowning fairies | Palanquin procession, cloud dissolve, fairy colonnade |

These are future requests, not new assets promised by this pass. Avoid replacing
playable scenery or sprites until the corresponding story update is scoped.

## Preserved delivery catalogue

Historical production prompts and the original generated Part C are in
[legacy/image-requests.md](legacy/image-requests.md). The generator now maintains
that archived document; `--check` still verifies delivery consistency.
Band stills, idle frames, footage loops and song remain in the asset tree for
`?widowsbay`. `src/theme.js` excludes their slots before the default loader
fetches any of them. Other scenic assets stay shared.
