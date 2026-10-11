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
its planning images (character sheets and scene concepts) are requested below.

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
