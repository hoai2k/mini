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

Requested 11 October 2026: 82 game assets for following the film (see [the adaptation plan](film-adaptation.md)). Each prompt is complete; paste it as it stands and attach the references it names (the character sheets and scene concepts are in [references/film-planning/](references/film-planning/index.html)). Sizes are 2× game units, as for the existing art, and match the sprite each one replaces so it drops into place. Name each file by its id and drop it in [`../intake/`](../intake/README.md). The ids are listed as `requested` in `assets/manifest.json`; until each arrives the game draws an interim cut-out or stand-in.

### F1. Prince Bel-Azor

The player, in every act. One set, all to the same scale, so the whole game switches from the sailor at once. Until they arrive the game uses a cut-out of the prince from his character sheet, moved as a toy-theatre puppet.

| Id | Size | Anchor | Replaces |
| --- | --- | --- | --- |
| `prince-stand` | 220 × 360 | bottom centre | `sailor-stand` |
| `prince-walk-a` | 220 × 360 | bottom centre | `sailor-walk-a` |
| `prince-walk-b` | 220 × 360 | bottom centre | `sailor-walk-b` |
| `prince-leap` | 260 × 360 | bottom centre | `sailor-leap` |
| `prince-crouch` | 240 × 300 | bottom centre | `sailor-crouch` |
| `prince-carry` | 360 × 400 | bottom centre | `sailor-carry` |
| `prince-swim-a` | 360 × 240 | centre (between his shoulder blades) | `sailor-swim-a` |
| `prince-swim-b` | 360 × 240 | centre (between his shoulder blades) | `sailor-swim-b` |
| `prince-seated` | 220 × 220 | bottom centre | `sailor-seated` |
| `prince-hang` | 220 × 440 | top centre (his hands) | `sailor-hang` |
| `prince-pullup` | 260 × 300 | ledge line 25% up from the bottom, centred | `sailor-pullup` |
| `prince-climb-a` | 360 × 440 | bottom centre (lowest boot) | `sailor-climb-a` |
| `prince-climb-b` | 360 × 440 | bottom centre (lowest boot) | `sailor-climb-b` |
| `prince-apex` | 360 × 440 | bottom centre (lowest boot) | `sailor-apex` |
| `prince-fall` | 360 × 440 | bottom centre (lowest boot) | `sailor-fall` |
| `prince-land` | 360 × 440 | bottom centre (lowest boot) | `sailor-land` |
| `prince-stairs-a` | 360 × 440 | bottom centre (lowest boot) | `sailor-stairs-a` |
| `prince-stairs-b` | 360 × 440 | bottom centre (lowest boot) | `sailor-stairs-b` |
| `prince-push` | 360 × 440 | bottom centre (lowest boot) | new |
| `prince-court` | 220 × 360 | bottom centre | new |

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

| Id | Size | Anchor | Replaces |
| --- | --- | --- | --- |
| `azurine-stand` | 200 × 380 | bottom centre | `beloved-stand` |
| `azurine-asleep` | 360 × 160 | bottom centre | new |
| `azurine-window` | 160 × 200 | bottom centre | new |
| `aurora-stand` | 260 × 420 | bottom centre | new |
| `aurora-point` | 300 × 420 | bottom centre | new |
| `water-fairy-stand` | 260 × 420 | bottom centre | `witch-stand` |
| `witch-hooded` | 240 × 400 | bottom centre | new |
| `witch-cloud` | 400 × 400 | bottom centre | new |
| `witch-storm` | 520 × 340 | bottom centre | `witch-moonboat` |
| `witch-swoop` | 400 × 240 | centre | new |
| `witch-barrel` | 200 × 240 | bottom centre | new |
| `king-stand` | 220 × 420 | bottom centre | new |
| `queen-stand` | 220 × 420 | bottom centre | new |
| `fairy-ring` | 220 × 420 | bottom centre | new |
| `fairy-crown` | 220 × 420 | bottom centre | new |
| `fairy-gold` | 220 × 420 | bottom centre | new |
| `demon-red` | 220 × 360 | bottom centre | new |
| `demon-teal` | 220 × 360 | bottom centre | new |
| `crew-squire` | 220 × 420 | bottom centre | `reveller-yellow` |
| `crew-helmsman` | 220 × 420 | bottom centre | `reveller-jester` |
| `crew-manatarms` | 220 × 420 | bottom centre | `reveller-lady` |
| `crew-asleep` | 260 × 120 | bottom centre | new |
| `crew-rider` | 320 × 240 | bottom centre | new |

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

#### `witch-hooded` — The witch standing

240 × 400 px, anchor bottom centre.

> the witch as in references/film-planning/originals/char-witch.png (attach it): a hunched figure in a ragged dark-teal hooded cloak that hides her face, grey clawed hands, a twisted staff, standing facing left, staff raised in a curse. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-cloud` — The witch on her storm cloud

400 × 400 px, anchor bottom centre.

> the witch as in references/film-planning/originals/char-witch.png (attach it): a hunched figure in a ragged dark-teal hooded cloak that hides her face, grey clawed hands, a twisted staff, rising out of a churning black-and-magenta storm cloud, arms and staff raised, lightning at her hands. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-storm` — The witch in the storm sky (Act I)

520 × 340 px, anchor bottom centre.

> the witch as in references/film-planning/originals/char-witch.png (attach it): a hunched figure in a ragged dark-teal hooded cloak that hides her face, grey clawed hands, a twisted staff, riding a small churning black-and-magenta storm cloud across the sky toward the left, staff raised, lightning crackling from it. Replaces the witch in her moon boat in the voyage's sky; keep the same overall footprint as witch-moonboat. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-swoop` — The witch swooping

400 × 240 px, anchor centre.

> the witch as in references/film-planning/originals/char-witch.png (attach it): a hunched figure in a ragged dark-teal hooded cloak that hides her face, grey clawed hands, a twisted staff, flying horizontally to the left, cloak streaming behind, clawed hand reaching. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `witch-barrel` — The witch in the barrel

200 × 240 px, anchor bottom centre.

> the witch as in references/film-planning/originals/char-witch.png (attach it): a hunched figure in a ragged dark-teal hooded cloak that hides her face, grey clawed hands, a twisted staff, hunched inside an old wooden barrel, only her hood and clawed hands showing over the rim. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

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

| Id | Size | Anchor | Replaces |
| --- | --- | --- | --- |
| `octopus` | 600 × 420 | bottom centre | new |
| `dolphin-carriage` | 520 × 340 | bottom centre | `witch-moonboat` |
| `lobster-guard-closed` | 500 × 340 | bottom centre | `sentry-creature-closed` |
| `lobster-guard-open` | 500 × 340 | bottom centre | `sentry-creature-open` |
| `scrying-eye` | 200 × 300 | top centre (it hangs) | `gaze-lantern` |
| `galley` | 380 × 400 | bottom centre (the waterline) | `ship` |
| `galley-wreck-bow` | 300 × 400 | bottom centre | `ship-wreck-bow` |
| `galley-wreck-stern` | 300 × 400 | bottom centre | `ship-wreck-stern` |
| `sword-sinking` | 220 × 520 | centre | `guitar-sinking` |
| `aurora-star` | 64 × 64 | bottom centre | `tea-leaf` |
| `keepsake-star` | 128 × 128 | bottom centre | `keepsake-tea` |
| `keepsake-sword` | 128 × 128 | bottom centre | `keepsake-guitar` |
| `keepsake-shell` | 128 × 128 | bottom centre | `keepsake-rose` |
| `keepsake-seal` | 128 × 128 | bottom centre | `keepsake-pearl` |
| `keepsake-lamp` | 128 × 128 | bottom centre | `keepsake-stone` |
| `chariot` | 600 × 320 | centre | new |
| `gift-ring` | 96 × 96 | bottom centre | new |
| `gift-flower` | 96 × 96 | bottom centre | new |
| `gift-crown` | 96 × 96 | bottom centre | new |
| `gift-gold` | 96 × 96 | bottom centre | new |
| `playbill-film` | 1400 × 2000 | centre | `playbill` |
| `whirlpool` | 800 × 260 | centre | new |
| `tower-window` | 200 × 260 | bottom centre | new |
| `cavern-ledge` | 320 × 100 | top edge (the walkable top) | new |

#### `octopus` — The great octopus

600 × 420 px, anchor bottom centre.

> The great pink octopus from references/film-planning/originals/char-sea-creatures.png (attach it), seen front-on, arms spread wide across the canvas, jewelled shell crown. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `dolphin-carriage` — Conch carriage and dolphin

520 × 340 px, anchor bottom centre.

> The dolphin harnessed to a conch-shell carriage on shell wheels from references/film-planning/originals/char-sea-creatures.png (attach it), travelling right, the carriage empty. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `lobster-guard-closed` — Lobster guard, claws shut

500 × 340 px, anchor bottom centre.

> An upright lobster guard from references/film-planning/originals/char-sea-creatures.png (attach it), crouched low facing left, claws closed, halberd held across. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

#### `lobster-guard-open` — Lobster guard, claws snapping

500 × 340 px, anchor bottom centre.

> The same lobster guard as lobster-guard-closed, same scale and framing, claws thrown wide open mid-snap. Flat painted toy-theatre cut-out seen square-on, gouache on card with a faint pale cut edge, in the manner of Georges Méliès' 1903 film Le Royaume des fées: early-1900s stencil-tinted colour (sepia-grey line and tone with translucent washes of plum #2a1424, rose pink #f3c6dc, magenta #e0127a, moon gold #d9b34a, coral red #c8321e, grotto teal #5f8c88 and azure #6f9fc8 laid slightly out of register); no lettering; no cast shadow; isolated on a transparent background (or flat pure magenta #FF00FF if transparency is unavailable).

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

| Id | Size | Anchor | Replaces |
| --- | --- | --- | --- |
| `betrothal-court` | 2560 × 1440 | full frame | new |
| `rampart-strip` | 2560 × 720 | bottom edge | new |
| `armoury` | 2560 × 1440 | full frame | new |
| `tempest-sky` | 2560 × 820 | top edge | `sky-backdrop` |
| `lobster-palace` | 2560 × 1440 | full frame | new |
| `sea-flora` | 2560 × 1440 | full frame | new |
| `azure-grotto` | 2560 × 1440 | full frame | new |
| `shore-cave` | 2560 × 1440 | full frame | new |
| `cavern` | 2560 × 1440 | full frame | new |
| `coast-gap` | 2560 × 1440 | full frame | new |
| `tower-wall-tall` | 1400 × 3600 | bottom centre | new |
| `tower-interior` | 1400 × 1800 | bottom centre | `house-front` |
| `cliff-whirlpool` | 2560 × 1440 | full frame | new |
| `wedding-street` | 2560 × 1440 | full frame | `pageant-backcloth` |
| `apotheosis` | 2560 × 1440 | full frame | new |

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
