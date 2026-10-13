# Kingdom of the Fairies — images and production direction

The complete [film story](film-story.md) and [five-act design](acts.md) are the
primary briefs. Use the original 1903 film’s theatrical framing, hand-painted
sets, costume gestures, shells, coral, enchanted armour, tower and cloud
transformations. The default game does not use modern band imagery.

## Agent workflow for image batches

Keep full-resolution artwork on disk; use small previews in conversation.
Generating many images is supported, but accumulating generated images,
full-size inspections and repeated references in one conversation can exceed
the model request's image-content limit, even on a later text-only turn.

- **Save immediately.** Copy each completed original to its named delivery
  location before starting more work. Preserve its full resolution and
  transparency. Record the request id, file path, prompt, generation id,
  reference paths, review status and outstanding corrections in a manifest
  or progress note on disk. Do not print base64 image data into tool output.
- **Review previews first.** For composition and consistency checks, use a
  separate thumbnail (roughly 640–1024 pixels on its longest edge), or a
  compact contact sheet for a small group. Keep the originals untouched.
  Inspect one image at a time; load a larger preview or a detail crop only
  when a specific check needs it. These sizes are practical starting points,
  not guaranteed service limits.
- **Choose references per scene.** Attach only the character sheets and
  scenery needed for the current prompt. Prefer suitably sized reference
  copies that still show the necessary faces, costumes and props; use an
  original when fine detail requires it. Do not attach the entire cast or
  repeatedly bring every previous image into context.
- **Work in small batches.** Generate, save and review a few images before
  continuing. Avoid returning a large batch of full-size images together.
  If the generation tool already displays a result, do not display it again
  just to confirm its path. Follow the tool's required output format.
- **Checkpoint conversation context.** Update the progress note between
  batches, then compact the conversation when supported before its image
  history grows large. Keep ids, paths, decisions and remaining work in the
  summary rather than reattaching artwork. Smaller previews reduce new
  inputs; they do not remove full-size images already in the history.
- **Recover without regenerating.** If “The combined resolved image content
  is too large” blocks even text-only messages, stop retrying the same
  request. Compact if available, or resume with a short text handoff in a
  clean conversation that has access to the same workspace. Check saved
  files and metadata first, finish preparation and validation, and generate
  only missing or specifically rejected images. Preserve unfinished work.
  Splitting Git commits does not fix a model image-input limit.
- **Finish the delivery.** Verify file counts, dimensions, transparency,
  naming, gallery links and generated-document checks. Keep planning art
  separate from playable assets unless integration is requested. Commit
  according to the repository agreement; do not leave the only record of
  delivered images in conversation history.

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
[The film adaptation plan](film-adaptation.md) scopes them chapter by chapter;
its planning images (character sheets and scene concepts) are requested below,
and the production art for the film edition (F1–F4) after them.

<!-- FILM ASSETS START: generated by source/build_film_assets.py -->

## Production art for the film edition

Requested 11 October 2026: 233 game assets for following the film (see [the adaptation plan](film-adaptation.md)). Each prompt is complete; paste it as it stands and attach the references it names (the character sheets and scene concepts are in [references/film-planning/](references/film-planning/index.html)). Sizes are 2× game units, as for the existing art, and match the sprite each one replaces so it drops into place. Name each file by its id and drop it in [`../intake/`](../intake/README.md). The ids are listed as `requested` in `assets/manifest.json`; until each arrives the game draws an interim cut-out or stand-in.

Delivery: 233 of 233 assets generated and prepared. [Delivery notes](generated/film-production/README.md) retain native originals and generation records.

### F1. Prince Bel-Azor

The player, in every act. One set, all to the same scale, so the whole game switches from the sailor at once. Until they arrive the game uses a cut-out of the prince from his character sheet, moved as a toy-theatre puppet.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `prince-stand` | 220 × 360 | bottom centre | `sailor-stand` | [delivered](../assets/prince-stand.webp) |
| `prince-walk-a` | 220 × 360 | bottom centre | `sailor-walk-a` | [delivered](../assets/prince-walk-a.webp) |
| `prince-walk-b` | 220 × 360 | bottom centre | `sailor-walk-b` | [delivered](../assets/prince-walk-b.webp) |
| `prince-leap` | 260 × 360 | bottom centre | `sailor-leap` | [delivered](../assets/prince-leap.webp) |
| `prince-crouch` | 240 × 300 | bottom centre | `sailor-crouch` | [delivered](../assets/prince-crouch.webp) |
| `prince-carry` | 360 × 400 | bottom centre | `sailor-carry` | [delivered](../assets/prince-carry.webp) |
| `prince-swim-a` | 360 × 240 | centre (between his shoulder blades) | `sailor-swim-a` | [delivered](../assets/prince-swim-a.webp) |
| `prince-swim-b` | 360 × 240 | centre (between his shoulder blades) | `sailor-swim-b` | [delivered](../assets/prince-swim-b.webp) |
| `prince-seated` | 220 × 220 | bottom centre | `sailor-seated` | [delivered](../assets/prince-seated.webp) |
| `prince-hang` | 220 × 440 | top centre (his hands) | `sailor-hang` | [delivered](../assets/prince-hang.webp) |
| `prince-pullup` | 260 × 300 | ledge line 25% up from the bottom, centred | `sailor-pullup` | [delivered](../assets/prince-pullup.webp) |
| `prince-climb-a` | 360 × 440 | bottom centre (lowest boot) | `sailor-climb-a` | [delivered](../assets/prince-climb-a.webp) |
| `prince-climb-b` | 360 × 440 | bottom centre (lowest boot) | `sailor-climb-b` | [delivered](../assets/prince-climb-b.webp) |
| `prince-apex` | 360 × 440 | bottom centre (lowest boot) | `sailor-apex` | [delivered](../assets/prince-apex.webp) |
| `prince-fall` | 360 × 440 | bottom centre (lowest boot) | `sailor-fall` | [delivered](../assets/prince-fall.webp) |
| `prince-land` | 360 × 440 | bottom centre (lowest boot) | `sailor-land` | [delivered](../assets/prince-land.webp) |
| `prince-stairs-a` | 360 × 440 | bottom centre (lowest boot) | `sailor-stairs-a` | [delivered](../assets/prince-stairs-a.webp) |
| `prince-stairs-b` | 360 × 440 | bottom centre (lowest boot) | `sailor-stairs-b` | [delivered](../assets/prince-stairs-b.webp) |
| `prince-push` | 360 × 440 | bottom centre (lowest boot) | new | [delivered](../assets/prince-push.webp) |
| `prince-court` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-court.webp) |

#### `prince-stand` — Standing

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, standing at ease, sword lowered, shield on his left arm. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-walk-a` — Walking, stride A

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, mid-stride, left leg forward. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-walk-b` — Walking, stride B

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, mid-stride, right leg forward. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-leap` — Leaping

260 × 360 px, anchor bottom centre.

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, in the air mid-leap, knees tucked, cloak flying behind, sword arm forward. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-crouch` — Courtly pose (hiding)

240 × 300 px, anchor bottom centre.

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, frozen in a deep courtly bow, one knee bent, plumed helmet lowered, as if he were one of Neptune's courtiers. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-carry` — Carrying Azurine

360 × 400 px, anchor bottom centre.

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, walking right carrying Princess Azurine as in references/film-planning/originals/char-azurine.png (attach it): dark hair in a jewelled circlet, a pale azure gown with gold stars and rose-pink sleeves in his arms, her head on his shoulder, her gown trailing. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-swim-a` — Swimming, stroke A

360 × 240 px, anchor centre (between his shoulder blades).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, swimming horizontally facing right, arms reaching forward together, legs together, cloak streaming. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-swim-b` — Swimming, stroke B

360 × 240 px, anchor centre (between his shoulder blades).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, swimming horizontally facing right, arms swept back to his sides, legs kicking. The same scale as prince-swim-a. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-seated` — Seated in the conch carriage

220 × 220 px, anchor bottom centre.

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, seated upright as in a carriage, one hand raised forward, shield beside him. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-hang` — Hanging from an edge

220 × 440 px, anchor top centre (his hands).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, hanging at full stretch by both gauntleted hands gripping at the very top centre, arms straight above his head, body hanging, boot toes against an unseen wall. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-pullup` — Pulling himself up

260 × 300 px, anchor ledge line 25% up from the bottom, centred.

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, hauling himself over an unseen ledge whose top runs across the canvas 25% up from the bottom: forearms and right knee planted on that line, chest above it, left leg dangling. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-climb-a` — Climbing, reach A

360 × 440 px, anchor bottom centre (lowest boot).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, climbing a rock face, seen from slightly behind in right profile: right hand reaching high, left foot pushing up, shield slung on his back. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-climb-b` — Climbing, reach B

360 × 440 px, anchor bottom centre (lowest boot).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, climbing, the mirror phase of prince-climb-a: left hand reaching high, right foot pushing up, shield on his back. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-apex` — Top of a leap

360 × 440 px, anchor bottom centre (lowest boot).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, at the top of a leap, both arms reaching up for a hold, body stretched. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-fall` — Falling

360 × 440 px, anchor bottom centre (lowest boot).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, falling, arms flung up, legs apart, cloak billowing up. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-land` — Landing

360 × 440 px, anchor bottom centre (lowest boot).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, landing in a crouch, one hand down for balance. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-stairs-a` — Climbing stairs, step A

360 × 440 px, anchor bottom centre (lowest boot).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, climbing a stair: front boot on a higher step, rear leg straight. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-stairs-b` — Climbing stairs, step B

360 × 440 px, anchor bottom centre (lowest boot).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, pushing up a step, rear boot lifting to catch up. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-push` — Pushing (the barrel)

360 × 440 px, anchor bottom centre (lowest boot).

> Prince Bel-Azor exactly as in references/film-planning/originals/char-bel-azor.png (attach it): silver plumed helmet with a magenta plume, silver cuirass with a gold star over an azure tunic with gold fleurs-de-lis, a crimson cloak, sword and round star shield, dark moustache and pointed beard, leaning hard into a push with both hands forward at waist height, legs braced. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court` — In court dress (prologue)

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor in his court dress as in the small figure on char-bel-azor.png: plum doublet with gold stars, ermine-edged cape, no armour, standing facing right with one hand open in greeting. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F2. The cast

The film's characters as cut-outs for the scenes they appear in. Match each character sheet in references/film-planning/originals/.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `azurine-stand` | 200 × 380 | bottom centre | `beloved-stand` | [delivered](../assets/azurine-stand.webp) |
| `azurine-asleep` | 360 × 160 | bottom centre | new | [delivered](../assets/azurine-asleep.webp) |
| `azurine-window` | 160 × 200 | bottom centre | new | [delivered](../assets/azurine-window.webp) |
| `aurora-stand` | 260 × 420 | bottom centre | new | [delivered](../assets/aurora-stand.webp) |
| `aurora-point` | 300 × 420 | bottom centre | new | [delivered](../assets/aurora-point.webp) |
| `water-fairy-stand` | 260 × 420 | bottom centre | `witch-stand` | [delivered](../assets/water-fairy-stand.webp) |
| `king-stand` | 220 × 420 | bottom centre | new | [delivered](../assets/king-stand.webp) |
| `queen-stand` | 220 × 420 | bottom centre | new | [delivered](../assets/queen-stand.webp) |
| `fairy-ring` | 220 × 420 | bottom centre | new | [delivered](../assets/fairy-ring.webp) |
| `fairy-crown` | 220 × 420 | bottom centre | new | [delivered](../assets/fairy-crown.webp) |
| `fairy-gold` | 220 × 420 | bottom centre | new | [delivered](../assets/fairy-gold.webp) |
| `demon-red` | 220 × 360 | bottom centre | new | [delivered](../assets/demon-red.webp) |
| `demon-teal` | 220 × 360 | bottom centre | new | [delivered](../assets/demon-teal.webp) |
| `crew-squire` | 220 × 420 | bottom centre | `reveller-yellow` | [delivered](../assets/crew-squire.webp) |
| `crew-helmsman` | 220 × 420 | bottom centre | `reveller-jester` | [delivered](../assets/crew-helmsman.webp) |
| `crew-manatarms` | 220 × 420 | bottom centre | `reveller-lady` | [delivered](../assets/crew-manatarms.webp) |
| `crew-asleep` | 260 × 120 | bottom centre | new | [delivered](../assets/crew-asleep.webp) |
| `crew-rider` | 320 × 240 | bottom centre | new | [delivered](../assets/crew-rider.webp) |

#### `azurine-stand` — Azurine standing

200 × 380 px, anchor bottom centre.

> Princess Azurine as in references/film-planning/originals/char-azurine.png (attach it): dark hair in a jewelled circlet, a pale azure gown with gold stars and rose-pink sleeves, standing three-quarter facing left, hands clasped at her heart. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-asleep` — Azurine asleep (carried off)

360 × 160 px, anchor bottom centre.

> Princess Azurine as in references/film-planning/originals/char-azurine.png (attach it): dark hair in a jewelled circlet, a pale azure gown with gold stars and rose-pink sleeves, lying asleep on her back as if borne along, one arm trailing, gown and hair falling. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-window` — Azurine at the tower window

160 × 200 px, anchor bottom centre.

> Princess Azurine as in references/film-planning/originals/char-azurine.png (attach it): dark hair in a jewelled circlet, a pale azure gown with gold stars and rose-pink sleeves, head and shoulders, hands on a sill that is not drawn, looking out sadly. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `aurora-stand` — Aurora, wand raised

260 × 420 px, anchor bottom centre.

> the fairy Aurora as in references/film-planning/originals/char-aurora.png (attach it): white and moon-gold gauze with rose and plum veils, a starred diadem and a star-tipped wand, standing facing left, wand raised high with its star glowing, other hand open. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `aurora-point` — Aurora pointing the way

300 × 420 px, anchor bottom centre.

> the fairy Aurora as in references/film-planning/originals/char-aurora.png (attach it): white and moon-gold gauze with rose and plum veils, a starred diadem and a star-tipped wand, standing facing left, one arm extended pointing the way, wand in the other hand. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `water-fairy-stand` — The Water Fairy

260 × 420 px, anchor bottom centre.

> the Water Fairy as in references/film-planning/originals/char-water-fairy.png (attach it): sea-green and pearl gown hung with shells and starfish, a crown of shells and coral, long golden hair like weed, standing facing left, one hand held out low in blessing (where witch-stand holds the rose, so the game's sparkles still line up), the other at her side. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `king-stand` — The king

220 × 420 px, anchor bottom centre.

> Azurine's father as in char-royal-court.png (attach it): elderly white-bearded king in crimson and ermine with a gold crown, standing facing right, hand raised in welcome. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `queen-stand` — The queen

220 × 420 px, anchor bottom centre.

> Azurine's mother as in char-royal-court.png (attach it): grey-haired queen in crimson and ermine with a gold crown and veil, standing facing right. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `fairy-ring` — The fairy with the ring

220 × 420 px, anchor bottom centre.

> The gift fairy in cream and gold from char-royal-court.png (attach it), standing facing left, holding up a ruby ring. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `fairy-crown` — The fairy with the crown

220 × 420 px, anchor bottom centre.

> The gift fairy in azure from char-royal-court.png (attach it), standing facing left, holding out a crown on a crimson cushion. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `fairy-gold` — The fairy with the gold

220 × 420 px, anchor bottom centre.

> The gift fairy in coral red from char-royal-court.png (attach it), standing facing left, holding out a gold casket. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `demon-red` — Red demon with a torch

220 × 360 px, anchor bottom centre.

> a demon as in references/film-planning/originals/char-demons.png (attach it): a stage performer in tights with a horned cap, in red, running right with a flaming torch held high. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `demon-teal` — Teal demon with a torch

220 × 360 px, anchor bottom centre.

> a demon as in references/film-planning/originals/char-demons.png (attach it): a stage performer in tights with a horned cap, in teal, running right with a flaming torch held high. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-squire` — The squire

220 × 420 px, anchor bottom centre.

> The stout comic squire, one of the prince's crew as in references/film-planning/originals/char-crew.png (attach it): azure and gold striped livery with fleurs-de-lis, magenta-plumed caps, standing with a halberd, one hand raised in cheer. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-helmsman` — The helmsman

220 × 420 px, anchor bottom centre.

> The bearded helmsman, one of the prince's crew as in references/film-planning/originals/char-crew.png (attach it): azure and gold striped livery with fleurs-de-lis, magenta-plumed caps, standing, hauling on a rope over his shoulder. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-manatarms` — The man-at-arms

220 × 420 px, anchor bottom centre.

> The man-at-arms, one of the prince's crew as in references/film-planning/originals/char-crew.png (attach it): azure and gold striped livery with fleurs-de-lis, magenta-plumed caps, in a helmet and half armour with a star shield and halberd, standing. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-asleep` — A drowned crewman, asleep

260 × 120 px, anchor bottom centre.

> one of the prince's crew as in references/film-planning/originals/char-crew.png (attach it): azure and gold striped livery with fleurs-de-lis, magenta-plumed caps, lying asleep on his side on the sea floor, cap askew, one arm under his head, a few bubbles. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-rider` — A crewman riding a fish

320 × 240 px, anchor bottom centre.

> one of the prince's crew as in references/film-planning/originals/char-crew.png (attach it): azure and gold striped livery with fleurs-de-lis, magenta-plumed caps, sitting astride a saddled fish from references/film-planning/originals/char-sea-creatures.png (attach it), the fish swimming right. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F3. Sea creatures and props

Creatures, keepsakes and props for the recast acts and the new scenes.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `octopus` | 600 × 420 | bottom centre | new | [delivered](../assets/octopus.webp) |
| `dolphin-carriage` | 520 × 340 | bottom centre | `witch-moonboat` | [delivered](../assets/dolphin-carriage.webp) |
| `lobster-guard-closed` | 500 × 340 | bottom centre | `sentry-creature-closed` | [delivered](../assets/lobster-guard-closed.webp) |
| `lobster-guard-open` | 500 × 340 | bottom centre | `sentry-creature-open` | [delivered](../assets/lobster-guard-open.webp) |
| `scrying-eye` | 200 × 300 | top centre (it hangs) | `gaze-lantern` | [delivered](../assets/scrying-eye.webp) |
| `galley` | 380 × 400 | bottom centre (the waterline) | `ship` | [delivered](../assets/galley.webp) |
| `galley-wreck-bow` | 300 × 400 | bottom centre | `ship-wreck-bow` | [delivered](../assets/galley-wreck-bow.webp) |
| `galley-wreck-stern` | 300 × 400 | bottom centre | `ship-wreck-stern` | [delivered](../assets/galley-wreck-stern.webp) |
| `sword-sinking` | 220 × 520 | centre | `guitar-sinking` | [delivered](../assets/sword-sinking.webp) |
| `aurora-star` | 64 × 64 | bottom centre | `tea-leaf` | [delivered](../assets/aurora-star.webp) |
| `keepsake-star` | 128 × 128 | bottom centre | `keepsake-tea` | [delivered](../assets/keepsake-star.webp) |
| `keepsake-sword` | 128 × 128 | bottom centre | `keepsake-guitar` | [delivered](../assets/keepsake-sword.webp) |
| `keepsake-shell` | 128 × 128 | bottom centre | `keepsake-rose` | [delivered](../assets/keepsake-shell.webp) |
| `keepsake-seal` | 128 × 128 | bottom centre | `keepsake-pearl` | [delivered](../assets/keepsake-seal.webp) |
| `keepsake-lamp` | 128 × 128 | bottom centre | `keepsake-stone` | [delivered](../assets/keepsake-lamp.webp) |
| `chariot` | 600 × 320 | centre | new | [delivered](../assets/chariot.webp) |
| `gift-ring` | 96 × 96 | bottom centre | new | [delivered](../assets/gift-ring.webp) |
| `gift-flower` | 96 × 96 | bottom centre | new | [delivered](../assets/gift-flower.webp) |
| `gift-crown` | 96 × 96 | bottom centre | new | [delivered](../assets/gift-crown.webp) |
| `gift-gold` | 96 × 96 | bottom centre | new | [delivered](../assets/gift-gold.webp) |
| `playbill-film` | 1400 × 2000 | centre | `playbill` | [delivered](../assets/playbill-film.webp) |
| `whirlpool` | 800 × 260 | centre | new | [delivered](../assets/whirlpool.webp) |
| `tower-window` | 200 × 260 | bottom centre | new | [delivered](../assets/tower-window.webp) |
| `cavern-ledge` | 320 × 100 | top edge (the walkable top) | new | [delivered](../assets/cavern-ledge.webp) |

#### `octopus` — The great octopus

600 × 420 px, anchor bottom centre.

> The great pink octopus from references/film-planning/originals/char-sea-creatures.png (attach it), seen front-on, arms spread wide across the canvas, jewelled shell crown. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `dolphin-carriage` — Conch carriage and dolphin

520 × 340 px, anchor bottom centre.

> The dolphin harnessed to a conch-shell carriage on shell wheels from references/film-planning/originals/char-sea-creatures.png (attach it), travelling right, the carriage empty. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `lobster-guard-closed` — Lobster guard, claws shut

500 × 340 px, anchor bottom centre.

> An upright lobster guard from references/film-planning/originals/char-sea-creatures.png (attach it), crouched low facing left: a performer with exactly two arms and two legs, one pincer at the end of each arm. Both pincers close visibly around the diagonal halberd shaft held across his body; the shaft passes inside their grips, not in front of them. No extra arm, hand or detached claw. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `lobster-guard-open` — Lobster guard, claws snapping

500 × 340 px, anchor bottom centre.

> The same lobster guard as lobster-guard-closed, same scale and framing, exactly two arms and two legs. One pincer stays closed, visibly gripping the upright halberd shaft; the other is thrown wide open mid-snap. Each arm connects from its shoulder to its single pincer. No third arm or small extra weapon hand. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `scrying-eye` — The witch's scrying eye

200 × 300 px, anchor top centre (it hangs).

> A ghostly hooded eye: a pale staring eye inside a swirl of dark-teal smoke shaped like the witch's hood, a thin thread of smoke above, glowing faintly. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `galley` — The royal galley

380 × 400 px, anchor bottom centre (the waterline).

> The prince's royal galley from references/film-planning/originals/concept-galley-departure.png (attach it): gold-trimmed hull with a lion figurehead, azure sails with a gold star and fleurs-de-lis, sailing right, crew at the rail. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `galley-wreck-bow` — Galley wreck, bow half

300 × 400 px, anchor bottom centre.

> The bow half of the royal galley broken in two, mast snapped, sail torn. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `galley-wreck-stern` — Galley wreck, stern half

300 × 400 px, anchor bottom centre.

> The stern half of the royal galley broken in two, lantern swinging. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sword-sinking` — The enchanted sword sinking

220 × 520 px, anchor centre.

> The prince's enchanted sword from char-bel-azor.png sinking point-down through the water, a trail of gold sparkles and bubbles above it. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `aurora-star` — Aurora's star (pickup)

64 × 64 px, anchor bottom centre.

> A small five-pointed gold star with a soft glow, a fairy charm floating on the sea. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-star` — Keepsake: Aurora's three stars

128 × 128 px, anchor bottom centre.

> Three small gold stars in a triangle, glowing. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-sword` — Keepsake: the enchanted sword

128 × 128 px, anchor bottom centre.

> The prince's enchanted sword, tilted, with a star on the pommel. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-shell` — Keepsake: the Water Fairy's blessing

128 × 128 px, anchor bottom centre.

> A pearly scallop shell with a small glow, the Water Fairy's blessing. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-seal` — Keepsake: Neptune's seal

128 × 128 px, anchor bottom centre.

> A gold seal ring stamped with a trident, Neptune's favour. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-lamp` — Keepsake: Aurora's lamp

128 × 128 px, anchor bottom centre.

> A small brass fairy lamp with a star-shaped flame. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `chariot` — The witch's fiery chariot

600 × 320 px, anchor centre.

> The witch's flying chariot from references/expanded-world/flying-fire-chariot.png (attach it), bat-winged and wreathed in fire, travelling right, empty. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `gift-ring` — Gift: the ring

96 × 96 px, anchor bottom centre.

> A gold ring with a ruby, glowing. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `gift-flower` — Gift: the protective flower

96 × 96 px, anchor bottom centre.

> A white lily, glowing faintly gold. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `gift-crown` — Gift: the crown

96 × 96 px, anchor bottom centre.

> A small gold crown on a crimson cushion. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `gift-gold` — Gift: the gold

96 × 96 px, anchor bottom centre.

> An open gold casket heaped with coins. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `playbill-film` — Playbill with seven panels

1400 × 2000 px, anchor centre.

> The same playbill as the delivered playbill.webp (attach it), but with SEVEN large empty horizontal panels down the middle (a prologue and six acts) instead of five, and the empty banner at the top for the title. No words at all. A flat Victorian theatre playbill, portrait, full bleed, printed on cream paper with ornate plum and gold letterpress borders, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `whirlpool` — The whirlpool

800 × 260 px, anchor centre.

> A spiralling painted whirlpool in the sea seen from above at an angle, white foam spiralling into a dark centre. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `tower-window` — The tower window

200 × 260 px, anchor bottom centre.

> A barred arched window in rough stone, faint golden light inside, a few ivy leaves. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `cavern-ledge` — Cavern ledge

320 × 100 px, anchor top edge (the walkable top).

> A ledge of pink and grey cavern rock with small stalactites hanging below. The walkable top edge must be straight and level across the full width, as the game stands figures on it. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F4. Sets for the new scenes

Backcloths for the prologue and Acts V and VI, and the transformations. Full-frame cloths fill the 1280 × 720 stage at half size.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `betrothal-court` | 2560 × 1440 | full frame | new | [delivered](../assets/betrothal-court.webp) |
| `rampart-strip` | 2560 × 720 | bottom edge | new | [delivered](../assets/rampart-strip.webp) |
| `armoury` | 2560 × 1440 | full frame | new | [delivered](../assets/armoury.webp) |
| `tempest-sky` | 2560 × 820 | top edge | `sky-backdrop` | [delivered](../assets/tempest-sky.webp) |
| `lobster-palace` | 2560 × 1440 | full frame | new | [delivered](../assets/lobster-palace.webp) |
| `sea-flora` | 2560 × 1440 | full frame | new | [delivered](../assets/sea-flora.webp) |
| `azure-grotto` | 2560 × 1440 | full frame | new | [delivered](../assets/azure-grotto.webp) |
| `shore-cave` | 2560 × 1440 | full frame | new | [delivered](../assets/shore-cave.webp) |
| `cavern` | 2560 × 1440 | full frame | new | [delivered](../assets/cavern.webp) |
| `coast-gap` | 2560 × 1440 | full frame | new | [delivered](../assets/coast-gap.webp) |
| `tower-wall-tall` | 1400 × 3600 | bottom centre | new | [delivered](../assets/tower-wall-tall.webp) |
| `tower-interior` | 1400 × 1800 | bottom centre | `house-front` | [delivered](../assets/tower-interior.webp) |
| `cliff-whirlpool` | 2560 × 1440 | full frame | new | [delivered](../assets/cliff-whirlpool.webp) |
| `wedding-street` | 2560 × 1440 | full frame | `pageant-backcloth` | [delivered](../assets/wedding-street.webp) |
| `apotheosis` | 2560 × 1440 | full frame | new | [delivered](../assets/apotheosis.webp) |

#### `betrothal-court` — The betrothal court

2560 × 1440 px, anchor full frame.

> The royal throne room from references/film-planning/originals/concept-betrothal.png (attach it) without its figures: two thrones on a dais under a crimson canopy, heraldic banners, gold chandeliers, a marble floor in front across the bottom quarter. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `rampart-strip` — The moonlit rampart

2560 × 720 px, anchor bottom edge.

> The castle rampart at night from references/expanded-world/moonlit-rampart.png (attach it): a carved stone balustrade with shields along the front, a walkway behind it at 80% height, the moonlit landscape beyond. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable). The left and right edges must join seamlessly when it is repeated side by side.

#### `armoury` — The royal armoury

2560 × 1440 px, anchor full frame.

> The royal armoury from references/film-planning/originals/concept-arming.png (attach it) without figures: vaulted hall, weapon racks, suits of armour, banners. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `tempest-sky` — The tempest sky

2560 × 820 px, anchor top edge.

> A storm sky over the sea: black and violet clouds with magenta lightning, a pale moon swallowed by cloud. Tiles left to right. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `lobster-palace` — The lobster palace

2560 × 1440 px, anchor full frame.

> The first stage of concept-azure-grotto.png (attach it): a pearly shell palace guarded by upright lobsters, without figures in front. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `sea-flora` — The sea flowers

2560 × 1440 px, anchor full frame.

> The middle stage of concept-azure-grotto.png: giant pink and white sea flowers filling the stage. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `azure-grotto` — The azure grotto

2560 × 1440 px, anchor full frame.

> The last stage of concept-azure-grotto.png: a glowing azure grotto of shells, pearls and coral with a shell throne at the back. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `shore-cave` — The shore and the cave

2560 × 1440 px, anchor full frame.

> The shore from references/film-planning/originals/concept-whale-shore.png (attach it) without the whale or figures: rocks, dawn sea, and the glowing cave mouth in the cliff at the right. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `cavern` — The cavern route

2560 × 1440 px, anchor full frame.

> The cavern from references/film-planning/originals/concept-cavern.png (attach it) without figures or the dragon: pink and grey stalactites, dark pools, a far opening onto the night sea at the right. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `coast-gap` — The cliff, the sea gap and the tower

2560 × 1440 px, anchor full frame.

> From references/film-planning/originals/concept-cliff-gap.png (attach it) without figures: the cliff at the left, rough sea across the middle, the witch's tower on its rock at the right, night with a moon. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `tower-wall-tall` — The tower wall (climb)

1400 × 3600 px, anchor bottom centre.

> The outside of the witch's tower seen front-on as a tall climbing wall, from concept-tower-climb.png (attach it): rough grey stone blocks with jutting stones and ivy, the sea breaking at the foot, battlements across the top 3%. Keep it the full width all the way up; the climb is drawn over it. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `tower-interior` — Inside the tower

1400 × 1800 px, anchor bottom centre.

> The tower cut open like a dollhouse, from concept-tower-fire.png (attach it): three storeys of stone floor with a winding stair against the left wall up to a high chamber at the top right with a canopied bed, torches, painted flames waiting in the wings. Floors at 35%, 60% and 85% of the height up from the bottom, each straight and level. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `cliff-whirlpool` — The cliff over the whirlpool

2560 × 1440 px, anchor full frame.

> From references/film-planning/originals/concept-barrel.png (attach it) without figures or the barrel: a cliff top at the left with roses, the night sea below at the right with a whirlpool, moon. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `wedding-street` — The wedding procession

2560 × 1440 px, anchor full frame.

> From references/film-planning/originals/concept-wedding.png (attach it) without figures: the castle with banners and garlands in daylight, a paved way across the bottom. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

#### `apotheosis` — The apotheosis

2560 × 1440 px, anchor full frame.

> From references/film-planning/originals/concept-apotheosis.png (attach it) without figures: clouds parting onto a marble colonnade in tiers of light, gilded and starry. A painted theatre backcloth seen square-on, full bleed to every edge, scene painting in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; faint film grain; no figures unless the prompt asks for them.

### F5. Crew variety and idle frames

Requested 11 October 2026 after the sprite audit. Two crew roles shared one sprite, so the deck and the grotto showed twins; the bosun makes four. The idle frames give the crew and the Water Fairy the old-film idle the original revellers have (two extra frames each, flicked between with the film tricks in src/animation.js). sailor-seated-plain is for the default (partial) edition, where the sailor rides the moon boat without his guitar. Until each arrives the game draws the still (or a mirrored stand-in for the bosun and the second sleeper).

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `crew-bosun` | 220 × 420 | bottom centre | `reveller-shaggy` | [delivered](../assets/crew-bosun.webp) |
| `crew-asleep-b` | 260 × 120 | bottom centre | new | [delivered](../assets/crew-asleep-b.webp) |
| `crew-squire-idle-b` | 220 × 420 | bottom centre | new | [delivered](../assets/crew-squire-idle-b.webp) |
| `crew-squire-idle-c` | 220 × 420 | bottom centre | new | [delivered](../assets/crew-squire-idle-c.webp) |
| `crew-helmsman-idle-b` | 220 × 420 | bottom centre | new | [delivered](../assets/crew-helmsman-idle-b.webp) |
| `crew-helmsman-idle-c` | 220 × 420 | bottom centre | new | [delivered](../assets/crew-helmsman-idle-c.webp) |
| `crew-manatarms-idle-b` | 220 × 420 | bottom centre | new | [delivered](../assets/crew-manatarms-idle-b.webp) |
| `crew-manatarms-idle-c` | 220 × 420 | bottom centre | new | [delivered](../assets/crew-manatarms-idle-c.webp) |
| `crew-bosun-idle-b` | 220 × 420 | bottom centre | new | [delivered](../assets/crew-bosun-idle-b.webp) |
| `crew-bosun-idle-c` | 220 × 420 | bottom centre | new | [delivered](../assets/crew-bosun-idle-c.webp) |
| `water-fairy-stand-idle-b` | 260 × 420 | bottom centre | new | [delivered](../assets/water-fairy-stand-idle-b.webp) |
| `water-fairy-stand-idle-c` | 260 × 420 | bottom centre | new | [delivered](../assets/water-fairy-stand-idle-c.webp) |
| `sailor-seated-plain` | 220 × 220 | bottom centre | `sailor-seated` | [delivered](../assets/sailor-seated-plain.webp) |

#### `crew-bosun` — The bosun

220 × 420 px, anchor bottom centre.

> The lanky bosun, one of the prince's crew as in references/film-planning/originals/char-crew.png (attach it): azure and gold striped livery with fleurs-de-lis, magenta-plumed caps, standing, a coil of rope over one shoulder and a lantern held up in one hand; plainly a different man from the squire, helmsman and man-at-arms (attach crew-squire.webp, crew-helmsman.webp and crew-manatarms.webp for scale and to keep him distinct). Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-asleep-b` — A second drowned crewman, asleep

260 × 120 px, anchor bottom centre.

> one of the prince's crew as in references/film-planning/originals/char-crew.png (attach it): azure and gold striped livery with fleurs-de-lis, magenta-plumed caps, the man-at-arms this time, lying asleep on his back on the sea floor with his helmet tipped over his eyes and his halberd beside him, a few bubbles; the same scale as crew-asleep.webp (attach it). Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-squire-idle-b` — The squire, idle frame B

220 × 420 px, anchor bottom centre.

> An idle frame for crew-squire.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the head turned a little toward the viewer and the free hand lifted slightly. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-squire-idle-c` — The squire, idle frame C

220 × 420 px, anchor bottom centre.

> An idle frame for crew-squire.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the weight shifted onto the other foot and the head tilted the other way. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-helmsman-idle-b` — The helmsman, idle frame B

220 × 420 px, anchor bottom centre.

> An idle frame for crew-helmsman.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the head turned a little toward the viewer and the free hand lifted slightly. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-helmsman-idle-c` — The helmsman, idle frame C

220 × 420 px, anchor bottom centre.

> An idle frame for crew-helmsman.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the weight shifted onto the other foot and the head tilted the other way. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-manatarms-idle-b` — The man-at-arms, idle frame B

220 × 420 px, anchor bottom centre.

> An idle frame for crew-manatarms.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the head turned a little toward the viewer and the free hand lifted slightly. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-manatarms-idle-c` — The man-at-arms, idle frame C

220 × 420 px, anchor bottom centre.

> An idle frame for crew-manatarms.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the weight shifted onto the other foot and the head tilted the other way. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-bosun-idle-b` — The bosun, idle frame B

220 × 420 px, anchor bottom centre.

> An idle frame for crew-bosun.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the head turned a little toward the viewer and the free hand lifted slightly. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-bosun-idle-c` — The bosun, idle frame C

220 × 420 px, anchor bottom centre.

> An idle frame for crew-bosun.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the weight shifted onto the other foot and the head tilted the other way. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `water-fairy-stand-idle-b` — The Water Fairy, idle frame B

260 × 420 px, anchor bottom centre.

> An idle frame for water-fairy-stand.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the head turned a little toward the viewer and her wand hand lifted slightly. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `water-fairy-stand-idle-c` — The Water Fairy, idle frame C

260 × 420 px, anchor bottom centre.

> An idle frame for water-fairy-stand.webp (attach it): exactly the same figure, costume, colours, scale and foot position, so that laid over it only one detail moves: the weight shifted onto the other foot and the head tilted the other way. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sailor-seated-plain` — The sailor seated, without the guitar

220 × 220 px, anchor bottom centre.

> The sailor exactly as in sailor-seated.webp (attach it): the same scale, pose, seat height and foot position, but with no guitar. His hands rest on his knees and a sword in its scabbard lies across his lap. Nothing else changes. For the default (partial) edition. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F6. The playable prologue

Requested 11 October 2026 for the prologue as a short playable scene (the owner chose this over the painted tableaux): the prince walks the betrothal court in his court dress, chases the chariot along the rampart, and takes up his arms in the armoury. Until these arrive the court-dress still is moved as a puppet, the binding is drawn as ropes over it, and the helmet and shield are drawn plainly.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `prince-court-walk-a` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-court-walk-a.webp) |
| `prince-court-walk-b` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-court-walk-b.webp) |
| `prince-bound` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-bound.webp) |
| `armour-helmet` | 128 × 128 | bottom centre | new | [delivered](../assets/armour-helmet.webp) |
| `armour-shield` | 128 × 128 | bottom centre | new | [delivered](../assets/armour-shield.webp) |

#### `prince-court-walk-a` — Prince in court dress, walking A

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor in his court dress exactly as in prince-court.webp (attach it): plum doublet with gold stars, ermine-edged cape, no armour; walking to the right, the left foot forward. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-walk-b` — Prince in court dress, walking B

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor in his court dress exactly as in prince-court.webp (attach it), walking to the right, the right foot forward (the other half of prince-court-walk-a). Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-bound` — Prince bound by the witch

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor in his court dress as in prince-court.webp (attach it), standing, his arms bound to his sides by glowing teal cords of the witch's magic, straining against them. Seen in profile facing right, the same scale and proportions as every other prince- sprite (match prince-stand: cap-of-helmet to chin is one ninth of a standing figure). Nothing but the figure: no ground, wall, ledge or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `armour-helmet` — The plumed helmet (pickup)

128 × 128 px, anchor bottom centre.

> The prince's silver plumed helmet with its magenta plume, from char-bel-azor.png (attach it), resting on its own, seen from the side. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `armour-shield` — The star shield (pickup)

128 × 128 px, anchor bottom centre.

> The prince's round shield with its gold star on azure, from char-bel-azor.png (attach it), standing upright on its rim, seen front-on. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F7. The witch, redrawn after the film

Requested 11 October 2026. The first witch art drew a faceless, ragged spectre with claws and a twisted staff; the film's witch is a stooped old crone in one heavy shaggy sea-green hooded robe, her old face showing, with a plain staff (compare references/film-witch/). These replace the five witch sprites at the same sizes and anchors (delivered; the superseded spectre originals are kept in generated/film-production/progress/superseded-witch-spectre/).

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `witch-hooded` | 240 × 400 | bottom centre | new | [delivered](../assets/witch-hooded.webp) |
| `witch-cloud` | 400 × 400 | bottom centre | new | [delivered](../assets/witch-cloud.webp) |
| `witch-storm` | 520 × 340 | bottom centre | new | [delivered](../assets/witch-storm.webp) |
| `witch-swoop` | 400 × 240 | centre | new | [delivered](../assets/witch-swoop.webp) |
| `witch-barrel` | 200 × 240 | bottom centre | new | [delivered](../assets/witch-barrel.webp) |

#### `witch-hooded` — The witch standing

240 × 400 px, anchor bottom centre.

> the witch exactly as she appears in Méliès's 1903 film (attach references/film-witch/witch-05m18s.jpg and witch-13m20s.jpg, frames from the film): an old crone played on stage, bent almost double at the waist, in one heavy, long, shaggy woollen hooded robe hand-tinted a deep sea-green teal, hanging in thick soft folds to the ground and pooling at her feet (whole cloth, not torn into rags or wisps), tied with a cord girdle with tassels; the hood is up but her face shows beneath it: pale, deeply wrinkled, hook-nosed, with wisps of straggling white hair; bare bony old hands (not claws); a plain, straight, long wooden walking staff. A living old woman, never a faceless spectre or a grim reaper. Standing bent over, leaning on her staff with one hand and raising the other in a curse, facing left. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-cloud` — The witch on her storm cloud

400 × 400 px, anchor bottom centre.

> the witch exactly as she appears in Méliès's 1903 film (attach references/film-witch/witch-05m18s.jpg and witch-13m20s.jpg, frames from the film): an old crone played on stage, bent almost double at the waist, in one heavy, long, shaggy woollen hooded robe hand-tinted a deep sea-green teal, hanging in thick soft folds to the ground and pooling at her feet (whole cloth, not torn into rags or wisps), tied with a cord girdle with tassels; the hood is up but her face shows beneath it: pale, deeply wrinkled, hook-nosed, with wisps of straggling white hair; bare bony old hands (not claws); a plain, straight, long wooden walking staff. A living old woman, never a faceless spectre or a grim reaper. Rising out of a churning black-and-magenta storm cloud that hides her feet, both arms raised and the staff held high, lightning at her fingers, facing right. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-storm` — The witch in the storm sky (Act I)

520 × 340 px, anchor bottom centre.

> the witch exactly as she appears in Méliès's 1903 film (attach references/film-witch/witch-05m18s.jpg and witch-13m20s.jpg, frames from the film): an old crone played on stage, bent almost double at the waist, in one heavy, long, shaggy woollen hooded robe hand-tinted a deep sea-green teal, hanging in thick soft folds to the ground and pooling at her feet (whole cloth, not torn into rags or wisps), tied with a cord girdle with tassels; the hood is up but her face shows beneath it: pale, deeply wrinkled, hook-nosed, with wisps of straggling white hair; bare bony old hands (not claws); a plain, straight, long wooden walking staff. A living old woman, never a faceless spectre or a grim reaper. Crouched on a small churning black-and-magenta storm cloud crossing the sky toward the left, staff raised, lightning cracking from its tip. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-swoop` — The witch swooping

400 × 240 px, anchor centre.

> the witch exactly as she appears in Méliès's 1903 film (attach references/film-witch/witch-05m18s.jpg and witch-13m20s.jpg, frames from the film): an old crone played on stage, bent almost double at the waist, in one heavy, long, shaggy woollen hooded robe hand-tinted a deep sea-green teal, hanging in thick soft folds to the ground and pooling at her feet (whole cloth, not torn into rags or wisps), tied with a cord girdle with tassels; the hood is up but her face shows beneath it: pale, deeply wrinkled, hook-nosed, with wisps of straggling white hair; bare bony old hands (not claws); a plain, straight, long wooden walking staff. A living old woman, never a faceless spectre or a grim reaper. Flying horizontally to the left as if hung on a wire across the stage, the heavy robe streaming back behind her, one bony hand reaching forward, the staff along her body. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-barrel` — The witch in the barrel

200 × 240 px, anchor bottom centre.

> the witch exactly as she appears in Méliès's 1903 film (attach references/film-witch/witch-05m18s.jpg and witch-13m20s.jpg, frames from the film): an old crone played on stage, bent almost double at the waist, in one heavy, long, shaggy woollen hooded robe hand-tinted a deep sea-green teal, hanging in thick soft folds to the ground and pooling at her feet (whole cloth, not torn into rags or wisps), tied with a cord girdle with tassels; the hood is up but her face shows beneath it: pale, deeply wrinkled, hook-nosed, with wisps of straggling white hair; bare bony old hands (not claws); a plain, straight, long wooden walking staff. A living old woman, never a faceless spectre or a grim reaper. Shut inside an old iron-hooped wooden barrel, only her hooded head, her furious wrinkled face and her two bony hands showing over the rim, gripping it. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F8. Tinted alternates, after the film's look

Requested 11 October 2026 after the character audit (design/character-audit.md). The delivered cast are crisp storybook chromolithographs; the 1903 film is photographed stage performers, hand stencil-coloured. Each entry redraws an existing sprite in the film's look as a separate <id>-tinted file at the same size, pose, scale and anchor. They are the film edition's default cast look; Settings › Cast look › Original (or ?look=original) returns to the first art.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `prince-stand-tinted` | 220 × 360 | bottom centre | `prince-stand` | [delivered](../assets/prince-stand-tinted.webp) |
| `prince-walk-a-tinted` | 220 × 360 | bottom centre | `prince-walk-a` | [delivered](../assets/prince-walk-a-tinted.webp) |
| `prince-walk-b-tinted` | 220 × 360 | bottom centre | `prince-walk-b` | [delivered](../assets/prince-walk-b-tinted.webp) |
| `prince-leap-tinted` | 260 × 360 | bottom centre | `prince-leap` | [delivered](../assets/prince-leap-tinted.webp) |
| `prince-crouch-tinted` | 240 × 300 | bottom centre | `prince-crouch` | [delivered](../assets/prince-crouch-tinted.webp) |
| `prince-carry-tinted` | 360 × 400 | bottom centre | `prince-carry` | [delivered](../assets/prince-carry-tinted.webp) |
| `prince-swim-a-tinted` | 360 × 240 | centre (between his shoulder blades) | `prince-swim-a` | [delivered](../assets/prince-swim-a-tinted.webp) |
| `prince-swim-b-tinted` | 360 × 240 | centre (between his shoulder blades) | `prince-swim-b` | [delivered](../assets/prince-swim-b-tinted.webp) |
| `prince-seated-tinted` | 220 × 220 | bottom centre | `prince-seated` | [delivered](../assets/prince-seated-tinted.webp) |
| `prince-hang-tinted` | 220 × 440 | top centre (his hands) | `prince-hang` | [delivered](../assets/prince-hang-tinted.webp) |
| `prince-pullup-tinted` | 260 × 300 | ledge line 25% up from the bottom, centred | `prince-pullup` | [delivered](../assets/prince-pullup-tinted.webp) |
| `prince-climb-a-tinted` | 360 × 440 | bottom centre (lowest boot) | `prince-climb-a` | [delivered](../assets/prince-climb-a-tinted.webp) |
| `prince-climb-b-tinted` | 360 × 440 | bottom centre (lowest boot) | `prince-climb-b` | [delivered](../assets/prince-climb-b-tinted.webp) |
| `prince-apex-tinted` | 360 × 440 | bottom centre (lowest boot) | `prince-apex` | [delivered](../assets/prince-apex-tinted.webp) |
| `prince-fall-tinted` | 360 × 440 | bottom centre (lowest boot) | `prince-fall` | [delivered](../assets/prince-fall-tinted.webp) |
| `prince-land-tinted` | 360 × 440 | bottom centre (lowest boot) | `prince-land` | [delivered](../assets/prince-land-tinted.webp) |
| `prince-stairs-a-tinted` | 360 × 440 | bottom centre (lowest boot) | `prince-stairs-a` | [delivered](../assets/prince-stairs-a-tinted.webp) |
| `prince-stairs-b-tinted` | 360 × 440 | bottom centre (lowest boot) | `prince-stairs-b` | [delivered](../assets/prince-stairs-b-tinted.webp) |
| `prince-push-tinted` | 360 × 440 | bottom centre (lowest boot) | `prince-push` | [delivered](../assets/prince-push-tinted.webp) |
| `prince-court-tinted` | 220 × 360 | bottom centre | `prince-court` | [delivered](../assets/prince-court-tinted.webp) |
| `prince-court-walk-a-tinted` | 220 × 360 | bottom centre | `prince-court-walk-a` | [delivered](../assets/prince-court-walk-a-tinted.webp) |
| `prince-court-walk-b-tinted` | 220 × 360 | bottom centre | `prince-court-walk-b` | [delivered](../assets/prince-court-walk-b-tinted.webp) |
| `prince-bound-tinted` | 220 × 360 | bottom centre | `prince-bound` | [delivered](../assets/prince-bound-tinted.webp) |
| `azurine-stand-tinted` | 200 × 380 | bottom centre | `azurine-stand` | [delivered](../assets/azurine-stand-tinted.webp) |
| `azurine-asleep-tinted` | 360 × 160 | bottom centre | `azurine-asleep` | [delivered](../assets/azurine-asleep-tinted.webp) |
| `azurine-window-tinted` | 160 × 200 | bottom centre | `azurine-window` | [delivered](../assets/azurine-window-tinted.webp) |
| `aurora-stand-tinted` | 260 × 420 | bottom centre | `aurora-stand` | [delivered](../assets/aurora-stand-tinted.webp) |
| `aurora-point-tinted` | 300 × 420 | bottom centre | `aurora-point` | [delivered](../assets/aurora-point-tinted.webp) |
| `water-fairy-stand-tinted` | 260 × 420 | bottom centre | `water-fairy-stand` | [delivered](../assets/water-fairy-stand-tinted.webp) |
| `water-fairy-stand-idle-b-tinted` | 260 × 420 | bottom centre | `water-fairy-stand-idle-b` | [delivered](../assets/water-fairy-stand-idle-b-tinted.webp) |
| `water-fairy-stand-idle-c-tinted` | 260 × 420 | bottom centre | `water-fairy-stand-idle-c` | [delivered](../assets/water-fairy-stand-idle-c-tinted.webp) |
| `king-stand-tinted` | 220 × 420 | bottom centre | `king-stand` | [delivered](../assets/king-stand-tinted.webp) |
| `queen-stand-tinted` | 220 × 420 | bottom centre | `queen-stand` | [delivered](../assets/queen-stand-tinted.webp) |
| `fairy-ring-tinted` | 220 × 420 | bottom centre | `fairy-ring` | [delivered](../assets/fairy-ring-tinted.webp) |
| `fairy-crown-tinted` | 220 × 420 | bottom centre | `fairy-crown` | [delivered](../assets/fairy-crown-tinted.webp) |
| `fairy-gold-tinted` | 220 × 420 | bottom centre | `fairy-gold` | [delivered](../assets/fairy-gold-tinted.webp) |
| `demon-red-tinted` | 220 × 360 | bottom centre | `demon-red` | [delivered](../assets/demon-red-tinted.webp) |
| `demon-teal-tinted` | 220 × 360 | bottom centre | `demon-teal` | [delivered](../assets/demon-teal-tinted.webp) |
| `crew-squire-tinted` | 220 × 420 | bottom centre | `crew-squire` | [delivered](../assets/crew-squire-tinted.webp) |
| `crew-helmsman-tinted` | 220 × 420 | bottom centre | `crew-helmsman` | [delivered](../assets/crew-helmsman-tinted.webp) |
| `crew-manatarms-tinted` | 220 × 420 | bottom centre | `crew-manatarms` | [delivered](../assets/crew-manatarms-tinted.webp) |
| `crew-bosun-tinted` | 220 × 420 | bottom centre | `crew-bosun` | [delivered](../assets/crew-bosun-tinted.webp) |
| `crew-squire-idle-b-tinted` | 220 × 420 | bottom centre | `crew-squire-idle-b` | [delivered](../assets/crew-squire-idle-b-tinted.webp) |
| `crew-squire-idle-c-tinted` | 220 × 420 | bottom centre | `crew-squire-idle-c` | [delivered](../assets/crew-squire-idle-c-tinted.webp) |
| `crew-helmsman-idle-b-tinted` | 220 × 420 | bottom centre | `crew-helmsman-idle-b` | [delivered](../assets/crew-helmsman-idle-b-tinted.webp) |
| `crew-helmsman-idle-c-tinted` | 220 × 420 | bottom centre | `crew-helmsman-idle-c` | [delivered](../assets/crew-helmsman-idle-c-tinted.webp) |
| `crew-manatarms-idle-b-tinted` | 220 × 420 | bottom centre | `crew-manatarms-idle-b` | [delivered](../assets/crew-manatarms-idle-b-tinted.webp) |
| `crew-manatarms-idle-c-tinted` | 220 × 420 | bottom centre | `crew-manatarms-idle-c` | [delivered](../assets/crew-manatarms-idle-c-tinted.webp) |
| `crew-bosun-idle-b-tinted` | 220 × 420 | bottom centre | `crew-bosun-idle-b` | [delivered](../assets/crew-bosun-idle-b-tinted.webp) |
| `crew-bosun-idle-c-tinted` | 220 × 420 | bottom centre | `crew-bosun-idle-c` | [delivered](../assets/crew-bosun-idle-c-tinted.webp) |
| `crew-asleep-tinted` | 260 × 120 | bottom centre | `crew-asleep` | [delivered](../assets/crew-asleep-tinted.webp) |
| `crew-asleep-b-tinted` | 260 × 120 | bottom centre | `crew-asleep-b` | [delivered](../assets/crew-asleep-b-tinted.webp) |
| `crew-rider-tinted` | 320 × 240 | bottom centre | `crew-rider` | [delivered](../assets/crew-rider-tinted.webp) |
| `witch-hooded-tinted` | 240 × 400 | bottom centre | `witch-hooded` | [delivered](../assets/witch-hooded-tinted.webp) |
| `witch-cloud-tinted` | 400 × 400 | bottom centre | `witch-cloud` | [delivered](../assets/witch-cloud-tinted.webp) |
| `witch-storm-tinted` | 520 × 340 | bottom centre | `witch-storm` | [delivered](../assets/witch-storm-tinted.webp) |
| `witch-swoop-tinted` | 400 × 240 | centre | `witch-swoop` | [delivered](../assets/witch-swoop-tinted.webp) |
| `witch-barrel-tinted` | 200 × 240 | bottom centre | `witch-barrel` | [delivered](../assets/witch-barrel-tinted.webp) |
| `octopus-tinted` | 600 × 420 | bottom centre | `octopus` | [delivered](../assets/octopus-tinted.webp) |
| `dolphin-carriage-tinted` | 520 × 340 | bottom centre | `dolphin-carriage` | [delivered](../assets/dolphin-carriage-tinted.webp) |
| `lobster-guard-closed-tinted` | 500 × 340 | bottom centre | `lobster-guard-closed` | [delivered](../assets/lobster-guard-closed-tinted.webp) |
| `lobster-guard-open-tinted` | 500 × 340 | bottom centre | `lobster-guard-open` | [delivered](../assets/lobster-guard-open-tinted.webp) |
| `chariot-tinted` | 600 × 320 | centre | `chariot` | [delivered](../assets/chariot-tinted.webp) |
| `scrying-eye-tinted` | 200 × 300 | top centre (it hangs) | `scrying-eye` | [delivered](../assets/scrying-eye-tinted.webp) |

#### `prince-stand-tinted` — prince-stand, tinted after the film

220 × 360 px, anchor bottom centre.

> Redraw prince-stand.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-walk-a-tinted` — prince-walk-a, tinted after the film

220 × 360 px, anchor bottom centre.

> Redraw prince-walk-a.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-walk-b-tinted` — prince-walk-b, tinted after the film

220 × 360 px, anchor bottom centre.

> Redraw prince-walk-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-leap-tinted` — prince-leap, tinted after the film

260 × 360 px, anchor bottom centre.

> Redraw prince-leap.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-crouch-tinted` — prince-crouch, tinted after the film

240 × 300 px, anchor bottom centre.

> Redraw prince-crouch.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-carry-tinted` — prince-carry, tinted after the film

360 × 400 px, anchor bottom centre.

> Redraw prince-carry.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-swim-a-tinted` — prince-swim-a, tinted after the film

360 × 240 px, anchor centre (between his shoulder blades).

> Redraw prince-swim-a.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-swim-b-tinted` — prince-swim-b, tinted after the film

360 × 240 px, anchor centre (between his shoulder blades).

> Redraw prince-swim-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-seated-tinted` — prince-seated, tinted after the film

220 × 220 px, anchor bottom centre.

> Redraw prince-seated.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-hang-tinted` — prince-hang, tinted after the film

220 × 440 px, anchor top centre (his hands).

> Redraw prince-hang.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-pullup-tinted` — prince-pullup, tinted after the film

260 × 300 px, anchor ledge line 25% up from the bottom, centred.

> Redraw prince-pullup.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-climb-a-tinted` — prince-climb-a, tinted after the film

360 × 440 px, anchor bottom centre (lowest boot).

> Redraw prince-climb-a.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-climb-b-tinted` — prince-climb-b, tinted after the film

360 × 440 px, anchor bottom centre (lowest boot).

> Redraw prince-climb-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-apex-tinted` — prince-apex, tinted after the film

360 × 440 px, anchor bottom centre (lowest boot).

> Redraw prince-apex.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-fall-tinted` — prince-fall, tinted after the film

360 × 440 px, anchor bottom centre (lowest boot).

> Redraw prince-fall.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-land-tinted` — prince-land, tinted after the film

360 × 440 px, anchor bottom centre (lowest boot).

> Redraw prince-land.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-stairs-a-tinted` — prince-stairs-a, tinted after the film

360 × 440 px, anchor bottom centre (lowest boot).

> Redraw prince-stairs-a.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-stairs-b-tinted` — prince-stairs-b, tinted after the film

360 × 440 px, anchor bottom centre (lowest boot).

> Redraw prince-stairs-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-push-tinted` — prince-push, tinted after the film

360 × 440 px, anchor bottom centre (lowest boot).

> Redraw prince-push.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-tinted` — prince-court, tinted after the film

220 × 360 px, anchor bottom centre.

> Redraw prince-court.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-walk-a-tinted` — prince-court-walk-a, tinted after the film

220 × 360 px, anchor bottom centre.

> Redraw prince-court-walk-a.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-walk-b-tinted` — prince-court-walk-b, tinted after the film

220 × 360 px, anchor bottom centre.

> Redraw prince-court-walk-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-bound-tinted` — prince-bound, tinted after the film

220 × 360 px, anchor bottom centre.

> Redraw prince-bound.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's Bel-Azor is an actor in a plain belted tunic and tights with a simple helmet and plume, not ornate plate armour: keep the star shield and sword but make the armour plain grey metal and the cloak a single red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-stand-tinted` — azurine-stand, tinted after the film

200 × 380 px, anchor bottom centre.

> Redraw azurine-stand.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. In the film Azurine is a young woman in a plain pale gown, almost white, with long dark hair; keep only a faint blue wash and a simple circlet. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-asleep-tinted` — azurine-asleep, tinted after the film

360 × 160 px, anchor bottom centre.

> Redraw azurine-asleep.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. In the film Azurine is a young woman in a plain pale gown, almost white, with long dark hair; keep only a faint blue wash and a simple circlet. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-window-tinted` — azurine-window, tinted after the film

160 × 200 px, anchor bottom centre.

> Redraw azurine-window.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. In the film Azurine is a young woman in a plain pale gown, almost white, with long dark hair; keep only a faint blue wash and a simple circlet. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `aurora-stand-tinted` — aurora-stand, tinted after the film

260 × 420 px, anchor bottom centre.

> Redraw aurora-stand.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A painted card star on a wand, yellow wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `aurora-point-tinted` — aurora-point, tinted after the film

300 × 420 px, anchor bottom centre.

> Redraw aurora-point.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A painted card star on a wand, yellow wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `water-fairy-stand-tinted` — water-fairy-stand, tinted after the film

260 × 420 px, anchor bottom centre.

> Redraw water-fairy-stand.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A dancer in a pale sea-green gown with a few shells, the hair loose; the green as one translucent wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `water-fairy-stand-idle-b-tinted` — water-fairy-stand-idle-b, tinted after the film

260 × 420 px, anchor bottom centre.

> Redraw water-fairy-stand-idle-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A dancer in a pale sea-green gown with a few shells, the hair loose; the green as one translucent wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `water-fairy-stand-idle-c-tinted` — water-fairy-stand-idle-c, tinted after the film

260 × 420 px, anchor bottom centre.

> Redraw water-fairy-stand-idle-c.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A dancer in a pale sea-green gown with a few shells, the hair loose; the green as one translucent wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `king-stand-tinted` — king-stand, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw king-stand.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A stage king in a long robe with an ermine-edged cape and a card crown; reds and whites only, little gold. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `queen-stand-tinted` — queen-stand, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw queen-stand.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A stage queen in a long gown and veil with a card crown; reds and whites only, little gold. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `fairy-ring-tinted` — fairy-ring, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw fairy-ring.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. One of the film's court ladies: a pastel gown and a tall pointed white hennin with a veil, the gift held simply. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `fairy-crown-tinted` — fairy-crown, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw fairy-crown.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. One of the film's court ladies: a pastel gown and a tall pointed white hennin with a veil, the gift held simply. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `fairy-gold-tinted` — fairy-gold, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw fairy-gold.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. One of the film's court ladies: a pastel gown and a tall pointed white hennin with a veil, the gift held simply. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `demon-red-tinted` — demon-red, tinted after the film

220 × 360 px, anchor bottom centre.

> Redraw demon-red.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. As in the film: a performer in close-fitting tights tinted solid red (or teal) with a horned cap, a real torch; already close, needs only the photographic look. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `demon-teal-tinted` — demon-teal, tinted after the film

220 × 360 px, anchor bottom centre.

> Redraw demon-teal.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. As in the film: a performer in close-fitting tights tinted solid red (or teal) with a horned cap, a real torch; already close, needs only the photographic look. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-squire-tinted` — crew-squire, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-squire.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-helmsman-tinted` — crew-helmsman, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-helmsman.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-manatarms-tinted` — crew-manatarms, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-manatarms.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-bosun-tinted` — crew-bosun, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-bosun.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-squire-idle-b-tinted` — crew-squire-idle-b, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-squire-idle-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-squire-idle-c-tinted` — crew-squire-idle-c, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-squire-idle-c.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-helmsman-idle-b-tinted` — crew-helmsman-idle-b, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-helmsman-idle-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-helmsman-idle-c-tinted` — crew-helmsman-idle-c, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-helmsman-idle-c.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-manatarms-idle-b-tinted` — crew-manatarms-idle-b, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-manatarms-idle-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-manatarms-idle-c-tinted` — crew-manatarms-idle-c, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-manatarms-idle-c.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-bosun-idle-b-tinted` — crew-bosun-idle-b, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-bosun-idle-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-bosun-idle-c-tinted` — crew-bosun-idle-c, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw crew-bosun-idle-c.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-asleep-tinted` — crew-asleep, tinted after the film

260 × 120 px, anchor bottom centre.

> Redraw crew-asleep.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-asleep-b-tinted` — crew-asleep-b, tinted after the film

260 × 120 px, anchor bottom centre.

> Redraw crew-asleep-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `crew-rider-tinted` — crew-rider, tinted after the film

320 × 240 px, anchor bottom centre.

> Redraw crew-rider.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A courtier of the film's court in a padded doublet, hose and soft cap, colours as pale washes rather than bold stripes. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-hooded-tinted` — witch-hooded, tinted after the film

240 × 400 px, anchor bottom centre.

> Redraw witch-hooded.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. Keep the redrawn crone (references/film-witch/) and give her the photographic base and a single teal wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-cloud-tinted` — witch-cloud, tinted after the film

400 × 400 px, anchor bottom centre.

> Redraw witch-cloud.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. Keep the redrawn crone (references/film-witch/) and give her the photographic base and a single teal wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-storm-tinted` — witch-storm, tinted after the film

520 × 340 px, anchor bottom centre.

> Redraw witch-storm.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. Keep the redrawn crone (references/film-witch/) and give her the photographic base and a single teal wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-swoop-tinted` — witch-swoop, tinted after the film

400 × 240 px, anchor centre.

> Redraw witch-swoop.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. Keep the redrawn crone (references/film-witch/) and give her the photographic base and a single teal wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-barrel-tinted` — witch-barrel, tinted after the film

200 × 240 px, anchor bottom centre.

> Redraw witch-barrel.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. Keep the redrawn crone (references/film-witch/) and give her the photographic base and a single teal wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `octopus-tinted` — octopus, tinted after the film

600 × 420 px, anchor bottom centre.

> Redraw octopus.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A painted stage prop: a large octopus cut-out on wires, flatter and less jewelled. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `dolphin-carriage-tinted` — dolphin-carriage, tinted after the film

520 × 340 px, anchor bottom centre.

> Redraw dolphin-carriage.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A stage float: a painted card dolphin drawing a shell car, little jewellery. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `lobster-guard-closed-tinted` — lobster-guard-closed, tinted after the film

500 × 340 px, anchor bottom centre.

> Redraw lobster-guard-closed.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A performer in a lobster costume, as in the film's court of sea creatures; coral red wash, few ornaments. Exactly two arms, each connected from a shoulder to one pincer, and two legs. The halberd must be visibly gripped inside a pincer, never floating in front of it. In the open pose the weapon claw stays closed around the shaft while the other pincer opens; no third arm or extra weapon hand. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `lobster-guard-open-tinted` — lobster-guard-open, tinted after the film

500 × 340 px, anchor bottom centre.

> Redraw lobster-guard-open.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A performer in a lobster costume, as in the film's court of sea creatures; coral red wash, few ornaments. Exactly two arms, each connected from a shoulder to one pincer, and two legs. The halberd must be visibly gripped inside a pincer, never floating in front of it. In the open pose the weapon claw stays closed around the shaft while the other pincer opens; no third arm or extra weapon hand. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `chariot-tinted` — chariot, tinted after the film

600 × 320 px, anchor centre.

> Redraw chariot.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. The film's fiery chariot: a dark painted car with bat wings and orange-yellow stencilled flames. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `scrying-eye-tinted` — scrying-eye, tinted after the film

200 × 300 px, anchor top centre (it hangs).

> Redraw scrying-eye.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same character, pose, framing, scale, foot position and canvas, so it lays over the original. A painted stage effect: a glowing eye in drifting teal smoke. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F9. Tinted alternates, the rest of the film edition

Requested 12 October 2026 after the tinted cast arrived: the remaining figures, creatures and props the film edition draws (Neptune's court, the sea creatures, the whale, the gifts, keepsakes, armour and sword) are still in the clean first style beside the tinted cast. Same look and rules as F8: a separate <id>-tinted file at exactly the original's canvas, pose and placement. The tinted cast look draws them where delivered; the originals stay for the Original look and the other editions.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `sea-king-throne-tinted` | 600 × 620 | bottom centre | `sea-king-throne` | [delivered](../assets/sea-king-throne-tinted.webp) |
| `attendant-pink-tinted` | 220 × 420 | bottom centre | `attendant-pink` | [delivered](../assets/attendant-pink-tinted.webp) |
| `attendant-blue-tinted` | 220 × 420 | bottom centre | `attendant-blue` | [delivered](../assets/attendant-blue-tinted.webp) |
| `attendant-green-tinted` | 220 × 420 | bottom centre | `attendant-green` | [delivered](../assets/attendant-green-tinted.webp) |
| `seahorse-guard-tinted` | 240 × 460 | bottom centre | `seahorse-guard` | [delivered](../assets/seahorse-guard-tinted.webp) |
| `sea-dragon-tinted` | 400 × 160 | bottom centre | `sea-dragon` | [delivered](../assets/sea-dragon-tinted.webp) |
| `sea-spirit-tinted` | 300 × 600 | bottom centre | `sea-spirit` | [delivered](../assets/sea-spirit-tinted.webp) |
| `sea-spirit-idle-b-tinted` | 300 × 600 | bottom centre | `sea-spirit-idle-b` | [delivered](../assets/sea-spirit-idle-b-tinted.webp) |
| `sea-spirit-idle-c-tinted` | 300 × 600 | bottom centre | `sea-spirit-idle-c` | [delivered](../assets/sea-spirit-idle-c-tinted.webp) |
| `jellyfish-tinted` | 180 × 280 | bottom centre | `jellyfish` | [delivered](../assets/jellyfish-tinted.webp) |
| `fish-large-tinted` | 700 × 400 | bottom centre | `fish-large` | [delivered](../assets/fish-large-tinted.webp) |
| `fish-school-tinted` | 420 × 200 | bottom centre | `fish-school` | [delivered](../assets/fish-school-tinted.webp) |
| `whale-beached-tinted` | 1800 × 900 | bottom centre | `whale-beached` | [delivered](../assets/whale-beached-tinted.webp) |
| `whale-mouth-tinted` | 1600 × 1200 | bottom centre | `whale-mouth` | [delivered](../assets/whale-mouth-tinted.webp) |
| `whale-tail-tinted` | 700 × 500 | bottom centre | `whale-tail` | [delivered](../assets/whale-tail-tinted.webp) |
| `whale-side-tinted` | 3000 × 1100 | bottom centre | `whale-side` | [delivered](../assets/whale-side-tinted.webp) |
| `gift-ring-tinted` | 96 × 96 | bottom centre | `gift-ring` | [delivered](../assets/gift-ring-tinted.webp) |
| `gift-flower-tinted` | 96 × 96 | bottom centre | `gift-flower` | [delivered](../assets/gift-flower-tinted.webp) |
| `gift-crown-tinted` | 96 × 96 | bottom centre | `gift-crown` | [delivered](../assets/gift-crown-tinted.webp) |
| `gift-gold-tinted` | 96 × 96 | bottom centre | `gift-gold` | [delivered](../assets/gift-gold-tinted.webp) |
| `keepsake-star-tinted` | 128 × 128 | bottom centre | `keepsake-star` | [delivered](../assets/keepsake-star-tinted.webp) |
| `keepsake-sword-tinted` | 128 × 128 | bottom centre | `keepsake-sword` | [delivered](../assets/keepsake-sword-tinted.webp) |
| `keepsake-shell-tinted` | 128 × 128 | bottom centre | `keepsake-shell` | [delivered](../assets/keepsake-shell-tinted.webp) |
| `keepsake-seal-tinted` | 128 × 128 | bottom centre | `keepsake-seal` | [delivered](../assets/keepsake-seal-tinted.webp) |
| `keepsake-lamp-tinted` | 128 × 128 | bottom centre | `keepsake-lamp` | [delivered](../assets/keepsake-lamp-tinted.webp) |
| `sword-sinking-tinted` | 220 × 520 | centre | `sword-sinking` | [delivered](../assets/sword-sinking-tinted.webp) |
| `aurora-star-tinted` | 64 × 64 | bottom centre | `aurora-star` | [delivered](../assets/aurora-star-tinted.webp) |
| `armour-helmet-tinted` | 128 × 128 | bottom centre | `armour-helmet` | [delivered](../assets/armour-helmet-tinted.webp) |
| `armour-shield-tinted` | 128 × 128 | bottom centre | `armour-shield` | [delivered](../assets/armour-shield-tinted.webp) |
| `tower-window-tinted` | 200 × 260 | bottom centre | `tower-window` | [delivered](../assets/tower-window-tinted.webp) |
| `pearl-tinted` | 64 × 64 | bottom centre | `pearl` | [delivered](../assets/pearl-tinted.webp) |

#### `sea-king-throne-tinted` — sea-king-throne, tinted after the film

600 × 620 px, anchor bottom centre.

> Redraw sea-king-throne.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. The film's sea court: Neptune is an actor with a white beard, a crown and a trident on a painted shell throne; his attendants and the sea spirit are dancers in pale gowns; the seahorse guard a performer in costume; the dragon and fish painted card props on wires. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `attendant-pink-tinted` — attendant-pink, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw attendant-pink.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. One of Neptune's attendants: a dancer in a pale gown with a shell head-dress, one translucent wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `attendant-blue-tinted` — attendant-blue, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw attendant-blue.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. One of Neptune's attendants: a dancer in a pale gown with a shell head-dress, one translucent wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `attendant-green-tinted` — attendant-green, tinted after the film

220 × 420 px, anchor bottom centre.

> Redraw attendant-green.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. One of Neptune's attendants: a dancer in a pale gown with a shell head-dress, one translucent wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `seahorse-guard-tinted` — seahorse-guard, tinted after the film

240 × 460 px, anchor bottom centre.

> Redraw seahorse-guard.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A performer in a seahorse guard's costume, a coral red wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sea-dragon-tinted` — sea-dragon, tinted after the film

400 × 160 px, anchor bottom centre.

> Redraw sea-dragon.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. The film's sea court: Neptune is an actor with a white beard, a crown and a trident on a painted shell throne; his attendants and the sea spirit are dancers in pale gowns; the seahorse guard a performer in costume; the dragon and fish painted card props on wires. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sea-spirit-tinted` — sea-spirit, tinted after the film

300 × 600 px, anchor bottom centre.

> Redraw sea-spirit.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. The film's sea court: Neptune is an actor with a white beard, a crown and a trident on a painted shell throne; his attendants and the sea spirit are dancers in pale gowns; the seahorse guard a performer in costume; the dragon and fish painted card props on wires. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sea-spirit-idle-b-tinted` — sea-spirit-idle-b, tinted after the film

300 × 600 px, anchor bottom centre.

> Redraw sea-spirit-idle-b.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. The film's sea court: Neptune is an actor with a white beard, a crown and a trident on a painted shell throne; his attendants and the sea spirit are dancers in pale gowns; the seahorse guard a performer in costume; the dragon and fish painted card props on wires. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sea-spirit-idle-c-tinted` — sea-spirit-idle-c, tinted after the film

300 × 600 px, anchor bottom centre.

> Redraw sea-spirit-idle-c.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. The film's sea court: Neptune is an actor with a white beard, a crown and a trident on a painted shell throne; his attendants and the sea spirit are dancers in pale gowns; the seahorse guard a performer in costume; the dragon and fish painted card props on wires. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `jellyfish-tinted` — jellyfish, tinted after the film

180 × 280 px, anchor bottom centre.

> Redraw jellyfish.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A painted gauze stage prop, rose wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `fish-large-tinted` — fish-large, tinted after the film

700 × 400 px, anchor bottom centre.

> Redraw fish-large.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A painted card fish prop, orange wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `fish-school-tinted` — fish-school, tinted after the film

420 × 200 px, anchor bottom centre.

> Redraw fish-school.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A painted card fish prop, orange wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `whale-beached-tinted` — whale-beached, tinted after the film

1800 × 900 px, anchor bottom centre.

> Redraw whale-beached.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. The film's whale is a huge painted canvas prop with a hinged jaw: grey photographic paint, a single blue-grey wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `whale-mouth-tinted` — whale-mouth, tinted after the film

1600 × 1200 px, anchor bottom centre.

> Redraw whale-mouth.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. The film's whale is a huge painted canvas prop with a hinged jaw: grey photographic paint, a single blue-grey wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `whale-tail-tinted` — whale-tail, tinted after the film

700 × 500 px, anchor bottom centre.

> Redraw whale-tail.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. The film's whale is a huge painted canvas prop with a hinged jaw: grey photographic paint, a single blue-grey wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `whale-side-tinted` — whale-side, tinted after the film

3000 × 1100 px, anchor bottom centre.

> Redraw whale-side.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. The film's whale is a huge painted canvas prop with a hinged jaw: grey photographic paint, a single blue-grey wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `gift-ring-tinted` — gift-ring, tinted after the film

96 × 96 px, anchor bottom centre.

> Redraw gift-ring.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A theatre prop: card and paste jewels, a yellow wash for gold. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `gift-flower-tinted` — gift-flower, tinted after the film

96 × 96 px, anchor bottom centre.

> Redraw gift-flower.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A theatre prop: card and paste jewels, a yellow wash for gold. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `gift-crown-tinted` — gift-crown, tinted after the film

96 × 96 px, anchor bottom centre.

> Redraw gift-crown.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A theatre prop: card and paste jewels, a yellow wash for gold. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `gift-gold-tinted` — gift-gold, tinted after the film

96 × 96 px, anchor bottom centre.

> Redraw gift-gold.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A theatre prop: card and paste jewels, a yellow wash for gold. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-star-tinted` — keepsake-star, tinted after the film

128 × 128 px, anchor bottom centre.

> Redraw keepsake-star.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A small theatre prop, yellow and one other wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-sword-tinted` — keepsake-sword, tinted after the film

128 × 128 px, anchor bottom centre.

> Redraw keepsake-sword.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A small theatre prop, yellow and one other wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-shell-tinted` — keepsake-shell, tinted after the film

128 × 128 px, anchor bottom centre.

> Redraw keepsake-shell.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A small theatre prop, yellow and one other wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-seal-tinted` — keepsake-seal, tinted after the film

128 × 128 px, anchor bottom centre.

> Redraw keepsake-seal.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A small theatre prop, yellow and one other wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `keepsake-lamp-tinted` — keepsake-lamp, tinted after the film

128 × 128 px, anchor bottom centre.

> Redraw keepsake-lamp.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A small theatre prop, yellow and one other wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sword-sinking-tinted` — sword-sinking, tinted after the film

220 × 520 px, anchor centre.

> Redraw sword-sinking.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A stage sword, grey steel, a yellow wash on the hilt. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `aurora-star-tinted` — aurora-star, tinted after the film

64 × 64 px, anchor bottom centre.

> Redraw aurora-star.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A painted card star on a wand, yellow wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `armour-helmet-tinted` — armour-helmet, tinted after the film

128 × 128 px, anchor bottom centre.

> Redraw armour-helmet.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A stage armour piece, grey metal, the plume a rose wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `armour-shield-tinted` — armour-shield, tinted after the film

128 × 128 px, anchor bottom centre.

> Redraw armour-shield.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A stage armour piece, grey metal, the plume a rose wash. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `tower-window-tinted` — tower-window, tinted after the film

200 × 260 px, anchor bottom centre.

> Redraw tower-window.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A painted window in the tower flat, a warm yellow wash in the glass. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `pearl-tinted` — pearl, tinted after the film

64 × 64 px, anchor bottom centre.

> Redraw pearl.webp (attach it) in the look of the 1903 film (attach references/expanded-world/source-frames/frame-00m26s.jpg, frame-04m54s.jpg and frame-05m51s.jpg). Keep exactly the same subject, pose, framing, scale, foot position and canvas, so it lays over the original. A white paste pearl, no colour. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F10. The prince's stride frames

Requested 12 October 2026 after play-testing: the delivered walk-a/walk-b pairs hardly move the legs, and the court-dress pair changes costume between frames (pink tights and a silver belt in A, grey tights and a green belt in B). The game flicks between two frames as he walks, so each pair must be two opposite strides of one identical figure. Until a pair arrives the game alternates walk-a with the standing pose. Each look has its own pair; draw the tinted ones over the tinted standing pose and the others over the original.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `prince-stride-a-tinted` | 220 × 360 | bottom centre | `prince-walk-a-tinted` | [delivered](../assets/prince-stride-a-tinted.webp) |
| `prince-stride-b-tinted` | 220 × 360 | bottom centre | `prince-walk-b-tinted` | [delivered](../assets/prince-stride-b-tinted.webp) |
| `prince-stride-a` | 220 × 360 | bottom centre | `prince-walk-a` | [delivered](../assets/prince-stride-a.webp) |
| `prince-stride-b` | 220 × 360 | bottom centre | `prince-walk-b` | [delivered](../assets/prince-stride-b.webp) |
| `prince-court-stride-a-tinted` | 220 × 360 | bottom centre | `prince-court-walk-a-tinted` | [delivered](../assets/prince-court-stride-a-tinted.webp) |
| `prince-court-stride-b-tinted` | 220 × 360 | bottom centre | `prince-court-walk-b-tinted` | [delivered](../assets/prince-court-stride-b-tinted.webp) |
| `prince-court-stride-a` | 220 × 360 | bottom centre | `prince-court-walk-a` | [delivered](../assets/prince-court-stride-a.webp) |
| `prince-court-stride-b` | 220 × 360 | bottom centre | `prince-court-walk-b` | [delivered](../assets/prince-court-stride-b.webp) |

#### `prince-stride-a-tinted` — Prince armed, stride A (tinted)

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor walking to the right, exactly the figure, costume, colours, scale and head height of prince-stand-tinted.webp (attach it, and prince-stride-b-tinted.webp if already drawn, which must match it in every detail but the legs and arms). A full stride with the LEFT leg forward, heel down, and the right leg straight behind on its toes; the arms swing opposite to the legs. Both feet on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the legs and arms: same tights, belt, cloak, sword and shield. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-stride-b-tinted` — Prince armed, stride B (tinted)

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor walking to the right, exactly the figure, costume, colours, scale and head height of prince-stand-tinted.webp (attach it, and prince-stride-a-tinted.webp if already drawn, which must match it in every detail but the legs and arms). A full stride with the RIGHT leg forward, heel down, and the left leg straight behind on its toes; the arms swing opposite to the legs. Both feet on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the legs and arms: same tights, belt, cloak, sword and shield. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-stride-a` — Prince armed, stride A

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor walking to the right, exactly the figure, costume, colours, scale and head height of prince-stand.webp (attach it, and prince-stride-b.webp if already drawn, which must match it in every detail but the legs and arms). A full stride with the LEFT leg forward, heel down, and the right leg straight behind on its toes; the arms swing opposite to the legs. Both feet on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the legs and arms: same tights, belt, cloak, sword and shield. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-stride-b` — Prince armed, stride B

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor walking to the right, exactly the figure, costume, colours, scale and head height of prince-stand.webp (attach it, and prince-stride-a.webp if already drawn, which must match it in every detail but the legs and arms). A full stride with the RIGHT leg forward, heel down, and the left leg straight behind on its toes; the arms swing opposite to the legs. Both feet on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the legs and arms: same tights, belt, cloak, sword and shield. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-stride-a-tinted` — Prince in court dress, stride A (tinted)

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor walking to the right, exactly the figure, costume, colours, scale and head height of prince-court-tinted.webp (attach it, and prince-court-stride-b-tinted.webp if already drawn, which must match it in every detail but the legs and arms). A full stride with the LEFT leg forward, heel down, and the right leg straight behind on its toes; the arms swing opposite to the legs. Both feet on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the legs and arms: same tights, belt, cloak, sword and shield. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-stride-b-tinted` — Prince in court dress, stride B (tinted)

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor walking to the right, exactly the figure, costume, colours, scale and head height of prince-court-tinted.webp (attach it, and prince-court-stride-a-tinted.webp if already drawn, which must match it in every detail but the legs and arms). A full stride with the RIGHT leg forward, heel down, and the left leg straight behind on its toes; the arms swing opposite to the legs. Both feet on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the legs and arms: same tights, belt, cloak, sword and shield. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-stride-a` — Prince in court dress, stride A

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor walking to the right, exactly the figure, costume, colours, scale and head height of prince-court.webp (attach it, and prince-court-stride-b.webp if already drawn, which must match it in every detail but the legs and arms). A full stride with the LEFT leg forward, heel down, and the right leg straight behind on its toes; the arms swing opposite to the legs. Both feet on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the legs and arms: same tights, belt, cloak, sword and shield. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-stride-b` — Prince in court dress, stride B

220 × 360 px, anchor bottom centre.

> Prince Bel-Azor walking to the right, exactly the figure, costume, colours, scale and head height of prince-court.webp (attach it, and prince-court-stride-a.webp if already drawn, which must match it in every detail but the legs and arms). A full stride with the RIGHT leg forward, heel down, and the left leg straight behind on its toes; the arms swing opposite to the legs. Both feet on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the legs and arms: same tights, belt, cloak, sword and shield. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F11. Azurine's stride frames

Requested 12 October 2026 in the same audit: when Azurine walks beside the prince (the wedding street and the apotheosis) the game slides and bobs her standing pose, so she glides. Two opposite strides of one identical figure let her walk; until they arrive the game keeps the slide.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `azurine-walk-a-tinted` | 200 × 380 | bottom centre | `azurine-stand` | [delivered](../assets/azurine-walk-a-tinted.webp) |
| `azurine-walk-b-tinted` | 200 × 380 | bottom centre | `azurine-stand` | [delivered](../assets/azurine-walk-b-tinted.webp) |
| `azurine-walk-a` | 200 × 380 | bottom centre | `azurine-stand` | [delivered](../assets/azurine-walk-a.webp) |
| `azurine-walk-b` | 200 × 380 | bottom centre | `azurine-stand` | [delivered](../assets/azurine-walk-b.webp) |

#### `azurine-walk-a-tinted` — Azurine walking, stride A (tinted)

200 × 380 px, anchor bottom centre.

> Princess Azurine walking to the LEFT, exactly the figure, gown, colours, scale and head height of azurine-stand-tinted.webp (attach it, and azurine-walk-b-tinted.webp if already drawn, which must match it in every detail but the stride). Her LEFT foot steps forward from under the hem, the gown swinging forward with it; one hand lifts her skirt a little, the other relaxed. Feet and hem on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the stride and the swing of the gown. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-walk-b-tinted` — Azurine walking, stride B (tinted)

200 × 380 px, anchor bottom centre.

> Princess Azurine walking to the LEFT, exactly the figure, gown, colours, scale and head height of azurine-stand-tinted.webp (attach it, and azurine-walk-a-tinted.webp if already drawn, which must match it in every detail but the stride). Her RIGHT foot steps forward from under the hem, the gown swinging the other way; the hands as in stride A but mirrored in their swing. Feet and hem on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the stride and the swing of the gown. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-walk-a` — Azurine walking, stride A

200 × 380 px, anchor bottom centre.

> Princess Azurine walking to the LEFT, exactly the figure, gown, colours, scale and head height of azurine-stand.webp (attach it, and azurine-walk-b.webp if already drawn, which must match it in every detail but the stride). Her LEFT foot steps forward from under the hem, the gown swinging forward with it; one hand lifts her skirt a little, the other relaxed. Feet and hem on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the stride and the swing of the gown. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-walk-b` — Azurine walking, stride B

200 × 380 px, anchor bottom centre.

> Princess Azurine walking to the LEFT, exactly the figure, gown, colours, scale and head height of azurine-stand.webp (attach it, and azurine-walk-a.webp if already drawn, which must match it in every detail but the stride). Her RIGHT foot steps forward from under the hem, the gown swinging the other way; the hands as in stride A but mirrored in their swing. Feet and hem on one level ground line at the very bottom of the canvas; the head at the same height as in the standing pose. Nothing changes between the two frames but the stride and the swing of the gown. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F12. Walking passing poses

Requested 12 October 2026: complete every ground-walking cycle with contact A, passing A, contact B, passing B. Passing poses bring the legs together beneath the hips, with one support foot planted and the opposite knee bent as its foot swings through. They are moving poses, not standing stills. Keep costume, face, head scale and ground anchor consistent across the entire cycle. The sailor poses are shared by the partial and Widow’s Bay editions.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `prince-pass-a-tinted` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-pass-a-tinted.webp) |
| `prince-pass-b-tinted` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-pass-b-tinted.webp) |
| `prince-pass-a` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-pass-a.webp) |
| `prince-pass-b` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-pass-b.webp) |
| `prince-court-pass-a-tinted` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-court-pass-a-tinted.webp) |
| `prince-court-pass-b-tinted` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-court-pass-b-tinted.webp) |
| `prince-court-pass-a` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-court-pass-a.webp) |
| `prince-court-pass-b` | 220 × 360 | bottom centre | new | [delivered](../assets/prince-court-pass-b.webp) |
| `azurine-pass-a-tinted` | 200 × 380 | bottom centre | new | [delivered](../assets/azurine-pass-a-tinted.webp) |
| `azurine-pass-b-tinted` | 200 × 380 | bottom centre | new | [delivered](../assets/azurine-pass-b-tinted.webp) |
| `azurine-pass-a` | 200 × 380 | bottom centre | new | [delivered](../assets/azurine-pass-a.webp) |
| `azurine-pass-b` | 200 × 380 | bottom centre | new | [delivered](../assets/azurine-pass-b.webp) |
| `sailor-pass-a` | 220 × 360 | bottom centre | new | [delivered](../assets/sailor-pass-a.webp) |
| `sailor-pass-b` | 220 × 360 | bottom centre | new | [delivered](../assets/sailor-pass-b.webp) |

#### `prince-pass-a-tinted` — prince, passing A (tinted)

220 × 360 px, anchor bottom centre.

> Exactly the character in prince-stand-tinted.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The left leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-pass-b-tinted` — prince, passing B (tinted)

220 × 360 px, anchor bottom centre.

> Exactly the character in prince-stand-tinted.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The right leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-pass-a` — prince, passing A

220 × 360 px, anchor bottom centre.

> Exactly the character in prince-stand.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The left leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-pass-b` — prince, passing B

220 × 360 px, anchor bottom centre.

> Exactly the character in prince-stand.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The right leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-pass-a-tinted` — prince-court, passing A (tinted)

220 × 360 px, anchor bottom centre.

> Exactly the character in prince-court-tinted.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The left leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-pass-b-tinted` — prince-court, passing B (tinted)

220 × 360 px, anchor bottom centre.

> Exactly the character in prince-court-tinted.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The right leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-pass-a` — prince-court, passing A

220 × 360 px, anchor bottom centre.

> Exactly the character in prince-court.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The left leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-court-pass-b` — prince-court, passing B

220 × 360 px, anchor bottom centre.

> Exactly the character in prince-court.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The right leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-pass-a-tinted` — azurine, passing A (tinted)

200 × 380 px, anchor bottom centre.

> Exactly the character in azurine-stand-tinted.webp (attach it and the matching delivered stride-A frame): walking left, at the legs-together PASSING phase. The left leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-pass-b-tinted` — azurine, passing B (tinted)

200 × 380 px, anchor bottom centre.

> Exactly the character in azurine-stand-tinted.webp (attach it and the matching delivered stride-A frame): walking left, at the legs-together PASSING phase. The right leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-pass-a` — azurine, passing A

200 × 380 px, anchor bottom centre.

> Exactly the character in azurine-stand.webp (attach it and the matching delivered stride-A frame): walking left, at the legs-together PASSING phase. The left leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `azurine-pass-b` — azurine, passing B

200 × 380 px, anchor bottom centre.

> Exactly the character in azurine-stand.webp (attach it and the matching delivered stride-A frame): walking left, at the legs-together PASSING phase. The right leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sailor-pass-a` — sailor, passing A

220 × 360 px, anchor bottom centre.

> Exactly the character in sailor-stand.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The left leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sailor-pass-b` — sailor, passing B

220 × 360 px, anchor bottom centre.

> Exactly the character in sailor-stand.webp (attach it and the matching delivered stride-A frame): walking right, at the legs-together PASSING phase. The right leg supports the body vertically, its foot planted beneath the hip; the other knee is bent and its foot is lifted just off the floor as it passes close beside the support ankle. Both legs close together beneath the hips, not spread in a stride and not both feet standing flat. Arms counter-swing through a neutral position. Same face, costume, tights, belt, cloak/gown, props, body scale and head height as the standing and stride frames. The planted sole meets the bottom ground line. Keep anatomically coherent hands and weapon grips, and exactly two arms and two legs. No floor or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

### F13. Walking while carrying

Requested 12 October 2026: carrying someone still requires a ground-walking cycle. These contact and passing frames keep the carried woman, the carrier’s arms and the hold unchanged while the legs move. Walking uses all four phases, including carrying on stairs; stationary carrying and airborne movement retain their own poses. The sailor set is shared by the partial and Widow’s Bay editions.

| Id | Size | Anchor | Replaces | Delivery |
| --- | --- | --- | --- | --- |
| `prince-carry-walk-a-tinted` | 360 × 400 | bottom centre | `prince-carry` | [delivered](../assets/prince-carry-walk-a-tinted.webp) |
| `prince-carry-pass-a-tinted` | 360 × 400 | bottom centre | `prince-carry` | [delivered](../assets/prince-carry-pass-a-tinted.webp) |
| `prince-carry-walk-b-tinted` | 360 × 400 | bottom centre | `prince-carry` | [delivered](../assets/prince-carry-walk-b-tinted.webp) |
| `prince-carry-pass-b-tinted` | 360 × 400 | bottom centre | `prince-carry` | [delivered](../assets/prince-carry-pass-b-tinted.webp) |
| `prince-carry-walk-a` | 360 × 400 | bottom centre | `prince-carry` | [delivered](../assets/prince-carry-walk-a.webp) |
| `prince-carry-pass-a` | 360 × 400 | bottom centre | `prince-carry` | [delivered](../assets/prince-carry-pass-a.webp) |
| `prince-carry-walk-b` | 360 × 400 | bottom centre | `prince-carry` | [delivered](../assets/prince-carry-walk-b.webp) |
| `prince-carry-pass-b` | 360 × 400 | bottom centre | `prince-carry` | [delivered](../assets/prince-carry-pass-b.webp) |
| `sailor-carry-walk-a` | 360 × 400 | bottom centre | `sailor-carry` | [delivered](../assets/sailor-carry-walk-a.webp) |
| `sailor-carry-pass-a` | 360 × 400 | bottom centre | `sailor-carry` | [delivered](../assets/sailor-carry-pass-a.webp) |
| `sailor-carry-walk-b` | 360 × 400 | bottom centre | `sailor-carry` | [delivered](../assets/sailor-carry-walk-b.webp) |
| `sailor-carry-pass-b` | 360 × 400 | bottom centre | `sailor-carry` | [delivered](../assets/sailor-carry-pass-b.webp) |

#### `prince-carry-walk-a-tinted` — prince carrying, walk-a (tinted)

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in prince-carry-tinted.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the walk-a phase. Left leg forward, heel down; right leg straight behind, toe down. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-carry-pass-a-tinted` — prince carrying, pass-a (tinted)

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in prince-carry-tinted.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the pass-a phase. Left support leg vertical beneath the hip; right knee bent and right foot lifted beside the support ankle. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-carry-walk-b-tinted` — prince carrying, walk-b (tinted)

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in prince-carry-tinted.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the walk-b phase. Right leg forward with a bent leading knee, heel down; left leg straight behind, toe down. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-carry-pass-b-tinted` — prince carrying, pass-b (tinted)

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in prince-carry-tinted.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the pass-b phase. Right support leg vertical beneath the hip; left knee bent and left foot lifted beside the support ankle. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Render it like a frame of a hand stencil-coloured 1903 Méliès print, not an illustration: a soft-focus black-and-white photograph of a real stage performer in costume (silvery greys, deep blacks, gentle film grain and a little halation), with only a few flat, translucent aniline dye washes laid over by stencil (sea-green teal, orange-yellow, rose and coral red, pale sky blue, magenta), each bleeding slightly past its edges and a little out of register, and large areas left untinted grey; a simple theatre costume of cloth, tights, wig and painted card props with little fine detail and no gold filigree; flat frontal stage lighting; no ink outlines and no glossy finish. Isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-carry-walk-a` — prince carrying, walk-a

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in prince-carry.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the walk-a phase. Left leg forward, heel down; right leg straight behind, toe down. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-carry-pass-a` — prince carrying, pass-a

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in prince-carry.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the pass-a phase. Left support leg vertical beneath the hip; right knee bent and right foot lifted beside the support ankle. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-carry-walk-b` — prince carrying, walk-b

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in prince-carry.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the walk-b phase. Right leg forward with a bent leading knee, heel down; left leg straight behind, toe down. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `prince-carry-pass-b` — prince carrying, pass-b

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in prince-carry.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the pass-b phase. Right support leg vertical beneath the hip; left knee bent and left foot lifted beside the support ankle. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sailor-carry-walk-a` — sailor carrying, walk-a

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in sailor-carry.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the walk-a phase. Left leg forward, heel down; right leg straight behind, toe down. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sailor-carry-pass-a` — sailor carrying, pass-a

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in sailor-carry.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the pass-a phase. Left support leg vertical beneath the hip; right knee bent and right foot lifted beside the support ankle. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sailor-carry-walk-b` — sailor carrying, walk-b

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in sailor-carry.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the walk-b phase. Right leg forward with a bent leading knee, heel down; left leg straight behind, toe down. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `sailor-carry-pass-b` — sailor carrying, pass-b

360 × 400 px, anchor bottom centre.

> Exactly the two figures and carrying hold in sailor-carry.webp (attach it). Keep both faces, costumes, colours, the carried woman’s pose and the supporting arms unchanged. The carrier walks RIGHT in the pass-b phase. Right support leg vertical beneath the hip; left knee bent and left foot lifted beside the support ankle. The passing phases have the legs together under the hips, distinct from the spread-leg contacts. Preserve the carrier’s head height and body scale, place the planted foot on the bottom ground line. Exactly the existing two people, no extra limbs or hands; no ground or shadow. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

<!-- FILM ASSETS END -->

<!-- FILM PLANNING START: generated by source/build_film_requests.py -->

## Planning images for the film adaptation

Delivery: 30 images generated for design review. [Browse the gallery](references/film-planning/index.html) or [read the delivery notes](references/film-planning/README.md). The original briefs below are retained. Character sheets guided scene generation; the images are not integrated into gameplay. Actual native dimensions are recorded in the manifest; the larger requested dimensions remain production targets.

Requested 11 October 2026 for [the film adaptation plan](film-adaptation.md): 10 canonical character sheets and 20 scene concepts. They are for agreeing the cast, the look and the staging before the art and code rounds, and are documentation art, not game files, so they are not in `assets/manifest.json`. Every prompt is complete; paste it as it stands. Generate the character sheets first and agree on them, then attach the relevant sheets as image references for each scene so the cast stays consistent. Where a prompt names a file under `references/expanded-world/`, attach that image too. Name each file by its id (for example `char-bel-azor.png`) and drop it in [`../intake/`](../intake/README.md); on integration they land in `references/film-planning/`.

### Character sheets

Each 2400 × 1600 px (landscape).

| Id | Character |
| --- | --- |
| `char-bel-azor` | [Prince Bel-Azor](references/film-planning/index.html#char-bel-azor) |
| `char-azurine` | [Princess Azurine](references/film-planning/index.html#char-azurine) |
| `char-aurora` | [The fairy Aurora](references/film-planning/index.html#char-aurora) |
| `char-witch` | [The witch](references/film-planning/index.html#char-witch) |
| `char-water-fairy` | [The Water Fairy](references/film-planning/index.html#char-water-fairy) |
| `char-neptune` | [Neptune](references/film-planning/index.html#char-neptune) |
| `char-royal-court` | [The king, the queen and the three gift fairies](references/film-planning/index.html#char-royal-court) |
| `char-demons` | [The demons](references/film-planning/index.html#char-demons) |
| `char-crew` | [The prince's crew](references/film-planning/index.html#char-crew) |
| `char-sea-creatures` | [Sea creatures](references/film-planning/index.html#char-sea-creatures) |

#### `char-bel-azor` — Prince Bel-Azor

> Prince Bel-Azor (a mature, dignified prince with a dark moustache and short pointed beard, played in the film by Méliès himself) in the enchanted armour Aurora gives him: a silver plumed helmet, a silver cuirass over an azure tunic, a sword and a round shield with a star; one small extra figure of him in his court dress for the prologue. He is the player character, so his silhouette must read clearly at small size. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

#### `char-azurine` — Princess Azurine

> Princess Azurine (a young princess with dark hair in a jewelled circlet and a pale azure-blue gown); add one small figure of her asleep, as she is carried off, and one in her wedding veil. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

#### `char-aurora` — The fairy Aurora

> the fairy Aurora (Azurine's fairy godmother: tall, luminous, in white and moon-gold gauze with a starred diadem and a star-tipped wand), raising her wand in the arming gesture. Kind and commanding, never sinister; clearly a different person from the witch and the Water Fairy. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

#### `char-witch` — The witch

> the witch (hunched, in a dark teal hood and ragged cloak that hide her face, a crooked staff; match references/expanded-world/hooded-witch.png); add one small figure of her rising on a storm cloud and one shut in a barrel. Menacing but theatrical, a stage villain. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

#### `char-water-fairy` — The Water Fairy

> the Water Fairy (a mermaid-queen figure in sea-green and pearl, a crown of shells and coral, flowing hair like weed), bending to revive a sleeper with a breath of bubbles. Benevolent; distinct in colour and shape from Aurora and the witch. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

#### `char-neptune` — Neptune

> Neptune (white-bearded, white-robed, gold crown and trident; match the delivered sea-king art), seated on a shell throne and standing; gracious, an ally. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

#### `char-royal-court` — The king, the queen and the three gift fairies

> Azurine's parents, an elderly king and queen in ermine and crowns, and the three fairies who bring gifts beside Aurora, each with her gift: the ring, the crown and a casket of gold (Aurora's own gift is the protective flower). One line-up at the same scale. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

#### `char-demons` — The demons

> The witch's demon attendants as stage performers, in red and in teal, with horned caps and flaming torches; match references/expanded-world/demon-attendants.png. A front, profile and running pose for each colour. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

#### `char-crew` — The prince's crew

> the prince's crew (royal sailors and men-at-arms in azure and gold livery): a stout comic squire, a helmsman and a man-at-arms. The same men will appear asleep on the sea floor, riding fish and lobsters, and crawling out of the whale, so add one small figure of a sleeper lying on his side. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

#### `char-sea-creatures` — Sea creatures

> A creature sheet of the film's sea creatures as painted stage props: a great octopus, a dolphin harnessed to a conch-shell carriage, a lobster guard standing upright with a halberd, and a large fish with a saddle as a mount. A character model sheet in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. One full figure seen front-on, one in profile facing right and one three-quarter view, standing side by side at the same scale on a flat warm-grey card background, with two or three small detail sketches (face, hands, a key prop) along the bottom. Painted as a toy-theatre cut-out: gouache on card with a faint pale cut edge, no cast shadow.

### Scene concepts

Each 2560 × 1440 px (16:9).

| Id | Scene |
| --- | --- |
| `concept-betrothal` | [Prologue: the betrothal and the gifts](references/film-planning/index.html#concept-betrothal) |
| `concept-curse` | [Prologue: the witch's curse](references/film-planning/index.html#concept-curse) |
| `concept-abduction` | [Prologue: the abduction from the rampart](references/film-planning/index.html#concept-abduction) |
| `concept-arming` | [Prologue: the prison vision and the arming](references/film-planning/index.html#concept-arming) |
| `concept-galley-departure` | [Act I: the royal galley sets out](references/film-planning/index.html#concept-galley-departure) |
| `concept-tempest` | [Act I: the tempest and the wreck](references/film-planning/index.html#concept-tempest) |
| `concept-water-fairy` | [Act II: the Water Fairy's revival](references/film-planning/index.html#concept-water-fairy) |
| `concept-octopus` | [Act II: the octopus and the sword](references/film-planning/index.html#concept-octopus) |
| `concept-procession` | [Act II: the marine procession](references/film-planning/index.html#concept-procession) |
| `concept-azure-grotto` | [Act III: from the lobster palace to the azure grotto](references/film-planning/index.html#concept-azure-grotto) |
| `concept-neptune-hall` | [Act III: Neptune's hall](references/film-planning/index.html#concept-neptune-hall) |
| `concept-whale-shore` | [Act IV: ashore from the whale](references/film-planning/index.html#concept-whale-shore) |
| `concept-cavern` | [Act V: the cavern route](references/film-planning/index.html#concept-cavern) |
| `concept-cliff-gap` | [Act V: the cliff and the sea gap](references/film-planning/index.html#concept-cliff-gap) |
| `concept-tower-climb` | [Act V: the tower wall](references/film-planning/index.html#concept-tower-climb) |
| `concept-tower-fire` | [Act VI: demons fire the tower](references/film-planning/index.html#concept-tower-fire) |
| `concept-stair-carry` | [Act VI: down the collapsing stair](references/film-planning/index.html#concept-stair-carry) |
| `concept-barrel` | [Act VI: the barrel and the whirlpool](references/film-planning/index.html#concept-barrel) |
| `concept-wedding` | [Epilogue: the wedding procession](references/film-planning/index.html#concept-wedding) |
| `concept-apotheosis` | [Epilogue: the apotheosis](references/film-planning/index.html#concept-apotheosis) |

#### `concept-betrothal` — Prologue: the betrothal and the gifts

> The royal court at the betrothal: Prince Bel-Azor (a mature, dignified prince with a dark moustache and short pointed beard, played in the film by Méliès himself) in court dress and Princess Azurine (a young princess with dark hair in a jewelled circlet and a pale azure-blue gown) before the king and queen; the fairy Aurora (Azurine's fairy godmother: tall, luminous, in white and moon-gold gauze with a starred diadem and a star-tipped wand) and the three gift fairies step forward one by one with the ring, the flower, the crown and the gold, each gift glowing; courtiers in tiers. Base the architecture on references/expanded-world/betrothal-court.png. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-curse` — Prologue: the witch's curse

> The same court, darkened: the witch (hunched, in a dark teal hood and ragged cloak that hide her face, a crooked staff; match references/expanded-world/hooded-witch.png) has burst in through a trapdoor in smoke, pointing her staff in a curse; the fairies shield the princess; the courtiers recoil. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-abduction` — Prologue: the abduction from the rampart

> Night on the castle rampart (base it on references/expanded-world/moonlit-rampart.png): demons bear the sleeping princess up into a fiery winged chariot (references/expanded-world/flying-fire-chariot.png) climbing away across the moon; guards with lanterns run along the rampart walkway, which runs left to right as a playable lane. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-arming` — Prologue: the prison vision and the arming

> The royal armoury (references/expanded-world/royal-armoury.png): on one side the wall dissolves into a vision of Azurine confined in a far dark tower; on the other the fairy Aurora (Azurine's fairy godmother: tall, luminous, in white and moon-gold gauze with a starred diadem and a star-tipped wand) raises her wand over Prince Bel-Azor (a mature, dignified prince with a dark moustache and short pointed beard, played in the film by Méliès himself) as the enchanted helmet, sword and shield appear on him in a shower of stars. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-galley-departure` — Act I: the royal galley sets out

> A royal galley with azure sails and gold trim, Prince Bel-Azor (a mature, dignified prince with a dark moustache and short pointed beard, played in the film by Méliès himself) armoured at the prow and the prince's crew (royal sailors and men-at-arms in azure and gold livery) at the oars and rigging, riding three rows of painted waves from left to right; Aurora's three small stars glinting over the sea; calm moonlit sky. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-tempest` — Act I: the tempest and the wreck

> The same sea in a storm: the witch (hunched, in a dark teal hood and ragged cloak that hide her face, a crooked staff; match references/expanded-world/hooded-witch.png) rising on a black storm cloud with lightning, the crew hauling ropes, the galley breaking on jagged rocks and beginning to sink; the enchanted sword falling from the prince's hand into the waves. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-water-fairy` — Act II: the Water Fairy's revival

> The sea floor among kelp and coral: the Water Fairy (a mermaid-queen figure in sea-green and pearl, a crown of shells and coral, flowing hair like weed) bends over the armoured prince, waking him with a breath of bubbles; the drowned crew lie asleep around the wreck; conch horns glow on the rocks; the sword sinks far below. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-octopus` — Act II: the octopus and the sword

> A deep grotto where the enchanted sword lies on a rock, guarded by a great painted octopus whose arms sweep across the way; the prince swims toward it with air bubbles rising from vents. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-procession` — Act II: the marine procession

> The prince in a conch-shell carriage drawn by a dolphin, the Water Fairy (a mermaid-queen figure in sea-green and pearl, a crown of shells and coral, flowing hair like weed) leading, the revived crew riding saddled fish and lobsters beside him, all moving left to right along three rows of undersea waves, with sea nymphs on wires overhead. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-azure-grotto` — Act III: from the lobster palace to the azure grotto

> A Méliès transformation in three stages side by side: a palace guarded by upright lobsters, dissolving through giant sea flowers, into a glowing azure grotto of shells, pearls and coral. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-neptune-hall` — Act III: Neptune's hall

> Neptune's court as a long hall: Neptune (white-bearded, white-robed, gold crown and trident; match the delivered sea-king art) on his shell throne at the far right, rows of pastel courtiers gliding along three floor grooves, lobster guards snapping by the front groove, and a sweeping beam from a ghostly eye of the witch (hunched, in a dark teal hood and ragged cloak that hide her face, a crooked staff; match references/expanded-world/hooded-witch.png) (her scrying spell) hunting across the floor while the prince hides among the courtiers. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-whale-shore` — Act IV: ashore from the whale

> A painted shore at dawn: the great whale beached with its mouth open, the prince and the crew climbing out over its lip onto the rocks; the fairy Aurora (Azurine's fairy godmother: tall, luminous, in white and moon-gold gauze with a starred diadem and a star-tipped wand) appearing in light at the mouth of a cave in the cliff behind, pointing the way. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-cavern` — Act V: the cavern route

> A winding stage cavern of painted rock flats and stalactites, lit by Aurora's glow, with ledges to leap between from left to right and a far opening onto the night sea. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-cliff-gap` — Act V: the cliff and the sea gap

> A high cliff at the left; across a strip of rough sea, the witch's isolated tower on a rock (base it on references/expanded-world/sea-moat-tower.png); the prince diving from the cliff; the witch (hunched, in a dark teal hood and ragged cloak that hide her face, a crooked staff; match references/expanded-world/hooded-witch.png) swooping down after him and the fairy Aurora (Azurine's fairy godmother: tall, luminous, in white and moon-gold gauze with a starred diadem and a star-tipped wand)'s light driving her back. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-tower-climb` — Act V: the tower wall

> The outside of the witch's tower seen front-on as a tall climbing wall: rough stone with jutting stones and ivy, a barred window high up with a faint glow, the sea breaking at its foot; the armoured prince climbing. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-tower-fire` — Act VI: demons fire the tower

> Inside the tower: a winding stone stair round a central well, torch-bearing demons setting painted flame flats alight, smoke rising, and the prince finding Princess Azurine (a young princess with dark hair in a jewelled circlet and a pale azure-blue gown) in a high chamber. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-stair-carry` — Act VI: down the collapsing stair

> The prince carrying Princess Azurine (a young princess with dark hair in a jewelled circlet and a pale azure-blue gown) down the stair as it breaks away behind them in stage fire, falling scenery and sparks, the doorway ahead. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-barrel` — Act VI: the barrel and the whirlpool

> On the cliff top at night: the fairy Aurora (Azurine's fairy godmother: tall, luminous, in white and moon-gold gauze with a starred diadem and a star-tipped wand) holding the witch (hunched, in a dark teal hood and ragged cloak that hide her face, a crooked staff; match references/expanded-world/hooded-witch.png) pinned in her light, half inside a barrel; the prince ready to roll it over the edge into a spiralling painted whirlpool below; Azurine safe behind them. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-wedding` — Epilogue: the wedding procession

> The wedding procession returning to court: Prince Bel-Azor (a mature, dignified prince with a dark moustache and short pointed beard, played in the film by Méliès himself) and Princess Azurine (a young princess with dark hair in a jewelled circlet and a pale azure-blue gown) in a palanquin carried by pages, heralds with banners, the crew and courtiers, moving left to right before the castle. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

#### `concept-apotheosis` — Epilogue: the apotheosis

> The final tableau: clouds dissolving into the fairy kingdom, a marble colonnade in tiers of light, the fairy Aurora (Azurine's fairy godmother: tall, luminous, in white and moon-gold gauze with a starred diadem and a star-tipped wand) and the fairies crowning the prince and princess at the centre, Neptune and the Water Fairy among the tiers, the crew below. A concept tableau for a toy-theatre video game, in the manner of Georges Méliès' 1903 film Le Royaume des fées: theatrical costume, deliberate stage gesture, early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register), faint film grain; no lettering, no modern elements, no musicians. The scene is staged front-on inside a small theatre with a red velvet proscenium, painted backcloths, cut-out flats and visible stage machinery (wires, wave rows, trapdoors) where it suits; a wide 16:9 frame; the playable space reads clearly from left to right.

<!-- FILM PLANNING END -->

## Preserved delivery catalogue

Historical production prompts and the original generated Part C are in
[legacy/image-requests.md](legacy/image-requests.md). The generator now maintains
that archived document; `--check` still verifies delivery consistency.
Band stills, idle frames, footage loops and song remain in the asset tree for
`?widowsbay`. `src/theme.js` excludes their slots before the default loader
fetches any of them. Other scenic assets stay shared.
