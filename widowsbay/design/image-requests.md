# Widow's Bay — image requests

Two kinds of request live here:

- **Part A — inspiration and mood.** Reference to gather and concept boards to
  generate. They set the look and are never loaded by the game.
- **Part B — game assets.** Files the prototype loads. Each has an id that
  matches a slot in [`../assets/manifest.json`](../assets/manifest.json). A
  slot draws its procedural stand-in until its file arrives and its status is
  set to `delivered`.

Drop finished images in `hopper/intake/widowsbay/assets/` (or loose in
`hopper/intake/`, named by id) and ask for them to be integrated.

---

## The look in one paragraph

The game is a **toy-theatre stage seen square-on**, as Méliès shot his films.
Everything is a flat painted cut-out: wave strips cranked side to side, clouds
and the moon hung on visible wires, a ship on a rail. The colour is
**early-1900s stencil tinting**. It reads as a monochrome print with
translucent washes of flat colour that sit slightly out of register with the
lines, so a coral or gold patch spills past its outline. This is the colouring
in the video's Méliès footage. Text and cards follow the **video's own
graphics**: a swash script in pale pink inside a fine double rule, on deep
plum or hot magenta. The title also borrows the cover art's **1960s
bubble-lettering** and its orange-and-cream striped collage. The tone is acid
folk: a sea shanty with a psychedelic tinge, a love triangle and a sea witch.

### Palette (from the video frames in `references/`)

| Name | Hex | Where it comes from |
| --- | --- | --- |
| Plum | `#2a1424` | intertitle card background |
| Card pink | `#f3c6dc` | intertitle script lettering |
| Magenta | `#e0127a` | second intertitle card |
| Lavender | `#cfc0dc` | cover bubble lettering |
| Moon gold | `#d9b34a` | crescent shell boat in the grotto |
| Dragon coral | `#c8321e` | red sea dragon in the grotto |
| Grotto teal | `#5f8c88` | cave rock and water in the grotto |
| Foam | `#eef3ea` | wave crests, coral, anemones |
| Cover orange | `#e9a46a` | stripes on the cover collage |
| Velvet | `#8e1730` | proscenium curtain (game-side addition) |

### Rules for every generated asset

1. **Front-on, flat, theatrical.** No perspective tilt and no three-quarter
   views. Draw it the way a scene painter would cut it from board.
2. **Painted cut-out finish.** Gouache or watercolour on card, with a faint
   pale edge where the board was cut. Paint the light into the art; don't add
   a cast shadow.
3. **Stencil tint, not full colour.** Grey-sepia line and tone underneath,
   with flat washes from the palette above sitting slightly off the lines.
   The game does its own colour pass. Fully painted colour still works, but
   the stencil look matches best.
4. **Transparent PNG** for every sprite, trimmed to the art, with the anchor
   (usually bottom centre) at the bottom edge of the canvas.
5. **Size at 2× game units.** The game stage is 1280 × 720. Each request below
   gives the pixel size to deliver.
6. **No lettering** unless the request asks for it.

---

## Part A — inspiration and mood

### A1. References already in the repository

Grabbed from the video's public preview frames (`design/references/`):

| File | What it shows | Use it for |
| --- | --- | --- |
| `video-cover.jpg` | Cover frame: lavender 60s bubble lettering on black blobs, orange and cream vertical stripes over a sepia, hand-tinted Méliès collage, and the trio in grainy halftone (one with a hat, one with an acoustic guitar, one bearded) | Title-screen key art, logo, the band's cameo |
| `video-intertitle-plum.jpg` | "Widow's Bay / by Langan, Frost & Wane" in pale pink swash script on plum, inside a double rule | Act cards, menus, UI frame (the prototype copies this) |
| `video-intertitle-magenta.jpg` | The same card on hot magenta | Shipwreck and alert cards |
| `video-grotto-moonboat.jpg` | Méliès footage: a woman in pink in a gold crescent shell boat, a red sea dragon, white coral and anemones, a teal cave opening onto light | The sea witch, her moon boat and dragon, and Act II's grotto |

### A2. References to gather (please drop stills into intake)

I could only see the four public preview frames of the video. Grab stills of
these moments and drop them in `hopper/intake/widowsbay/references/`, named
`video-<mm>m<ss>s-<subject>.jpg` (for example `video-01m12s-ship.jpg`). Each
one becomes a direct reference for the matching asset in Part B:

1. Every **intertitle card** and any lyric card, to match the typeface, colour
   and border exactly.
2. Any **ship, boat or voyage** shot. This sets the player's ship (`ship`).
3. Every **sea witch, fairy or sorceress** shot: costume, wand, and how she
   flies or rides.
4. **Storm, waves and shipwreck** shots: how the painted waves are built and
   tinted.
5. **Underwater and grotto** shots, for the Act II backdrop and its creatures
   (the red dragon, shells, coral).
6. Any **castle, harbour, window or lover** shot, for the bay, the cottage
   window and the ending card.
7. Any frame showing **the band** in the video, for the curtain-call cameo
   (B14).

Outside material worth having beside them:

- **Georges Méliès, *Le Royaume des fées* (1903).** The video's source. A
  restored hand-coloured print is the best guide to the tinting.
- **Méliès, *Le Voyage dans la Lune* (1902) and *Le Voyage à travers
  l'impossible* (1904).** The moon with a face, painted seas, and scenery
  machinery seen from the front.
- **Pathé stencil colour (Pathécolor) prints, 1905–1910.** How tint washes
  sit off the line.
- **Victorian toy-theatre sheets** ("penny plain, tuppence coloured";
  Pollock's toy theatres). The cut-out sets, wings and proscenium.
- **Lotte Reiniger, *The Adventures of Prince Achmed* (1926).** Cut-out
  silhouettes in motion, a good model for the witch and the dragon.
- **Olaus Magnus, *Carta Marina* (1539).** Sea monsters drawn on an old chart,
  for the map and the dragon.
- **Tasseography cups.** Teacups with symbols painted inside, read from tea
  leaves. This is the source of the tea-leaves keepsake.
- **Late-60s acid-folk and psychedelic graphics.** Wes Wilson and Victor
  Moscoso concert-poster lettering, and Incredible String Band-era album
  covers, for the cover's bubble lettering and stripes.

### A3. Concept boards to generate

These are mood pieces, not game files. Generate two or three takes of each,
then pick a direction.

| Id | Subject | Prompt |
| --- | --- | --- |
| `mood-act1` | Act I stage, wide | A Victorian toy-theatre stage seen square-on: red velvet curtains and a scalloped gold valance; three rows of cut-out cardboard waves; a little sailing ship on a rail; a moon with a sleepy face hanging on a wire; lavender cut-out clouds on strings. Night sea in teal and plum. Hand-tinted 1903 Méliès film still, stencil colour slightly out of register, film grain. |
| `mood-act2` | The witch's grotto | A Méliès undersea grotto painted on stage flats: teal rock arches opening onto bright water, white coral and anemones, a gold crescent-moon shell boat drawn by a red sea dragon, a woman in pink robes holding a star wand. Stencil-tinted 1903 film still, front-on stage view. |
| `mood-act3` | Widow's Bay harbour | A painted harbour backdrop at night: a red-and-white lighthouse sweeping its beam, a small cottage with one lit window, fishing boats as flat cut-outs, cliffs. Victorian toy-theatre style, hand-tinted, film grain, square-on. |
| `mood-poster` | Key art and poster | A psychedelic 1968 folk-rock poster. "WIDOW'S BAY" in lavender bubble lettering on a black cloud shape, over vertical orange and cream stripes on a sepia Méliès collage of ships, waves and a sea witch. Halftone, risograph grain. |
| `mood-witch` | Sea witch character sheet | Character turnaround reduced to front and profile cut-outs. A sea witch in flowing pink robes with long black hair, a gold star wand and a small pearl crown, riding a gold crescent shell. Silent-film costume drama, stencil tint, flat painted card. |
| `mood-sailor` | Sailor character sheet | The returning sailor as a toy-theatre cut-out. Navy pea coat, flat cap, a bundle on his shoulder, a weathered face. Front and profile, flat painted card, sepia line with blue and red tint. |
| `mood-palette` | Palette swatch board | A swatch board of hand-tinted film colours: plum, card pink, magenta, lavender, moon gold, dragon coral, grotto teal, foam, cover orange, velvet. Shown as torn painted paper chips with names. |

---

## Part B — game assets

**Wired** means the prototype already loads the slot. **Planned** slots are
stand-ins drawn in code that will be wired when their art arrives.

| # | Id | Wired | Deliver | Anchor |
| --- | --- | --- | --- | --- |
| B1 | `logo` | yes | 1600 × 1200 PNG, transparent or plum | centre |
| B2 | `sky-backdrop` | yes | 2560 × 820 PNG, tiles left-right | bottom |
| B3 | `ship` | yes | 380 × 400 PNG | waterline, bottom centre |
| B4 | `witch-moonboat` | yes | 520 × 340 PNG, facing left | bottom centre |
| B5 | `rock` | yes | 240 × 220 PNG | bottom centre |
| B6 | `cloud` | yes | 400 × 180 PNG | bottom centre |
| B7 | `pearl` | yes | 64 × 64 PNG | bottom centre |
| B8 | `keepsake-tea` | yes | 128 × 128 PNG | bottom centre |
| B9 | `keepsake-pearl` | yes | 128 × 128 PNG | bottom centre |
| B10 | `keepsake-rose` | yes | 128 × 128 PNG | bottom centre |
| B11 | `proscenium` | planned | 2560 × 1440 PNG, transparent centre | full frame |
| B12 | `waves-back`, `waves-mid`, `waves-front` | planned | 2560 × 300 PNG each, tiles left-right | top = crest line |
| B13 | `lighthouse` | planned | 700 × 420 PNG | bottom centre |
| B14 | `band-trio` | planned | 900 × 900 PNG | bottom centre |
| B15 | `moon-face` | planned | 260 × 260 PNG | centre |
| B16 | `sea-dragon` | planned | 400 × 160 PNG, facing left | centre |

### B1. `logo` — title logo

The title screen's main image (the alt text is supplied in the page). Match
the video's intertitle: **"Widow's Bay"** in a flowing 1970s swash script,
pale pink `#f3c6dc`, with **"by LANGAN, FROST & WANE"** in small bold
geometric capitals underneath, inside a fine double-rule frame on plum
`#2a1424`. An alternative take in the cover's lavender bubble lettering on a
black cloud shape is welcome; we'll choose between them. The lettering must
be crisp and correctly spelled, apostrophe included.

### B2. `sky-backdrop` — moving panorama

A long painted night-sky roll that scrolls slowly behind the sea and loops,
so its left and right edges must match. Stars, a faint Milky Way wash, and a
low line of distant headlands along the bottom edge in dark teal. No moon:
the moon is a separate hung piece (B15). Stencil tint: teal to plum toward
the horizon.

### B3. `ship` — the sailor's ship

A small two-masted sailing ship as a flat toy-theatre cut-out, side view,
bow to the right. Brown hull with a gold rail, a coral stripe, three gunports
and full cream sails. A magenta pennant on the main mast. A tiny sailor in a
navy pea coat and cap stands at the stern. The waterline sits at the bottom
of the canvas, so cut off the hull below it. Leave a small hole at the top of
each mast for the puppet wires.

### B4. `witch-moonboat` — the sea witch

The sea witch from the video's grotto shot (`video-grotto-moonboat.jpg`): a
woman in flowing pink robes with long dark hair, seated in a gold crescent
shell boat and raising a gold star wand. A red sea dragon in harness pulls
the boat from the front, facing left. One cut-out piece; the dragon may be
delivered separately as B16 so it can animate.

### B5. `rock` — trapdoor rock

A jagged sea rock that rises through a trapdoor. Grey-brown, lit from the
left, with white foam painted at its base, which is the bottom of the canvas.
Give it a slightly menacing silhouette, like a crooked tooth.

### B6. `cloud` — hanging cloud flat

A lavender cut-out cloud as a scene painter would make it: rounded lobes on
top and a straight cut bottom edge, with a darker lilac outline along the
cut. The game also darkens it into a storm cloud for lightning, so keep the
painting mid-toned.

### B7. `pearl`

A single lustrous pearl, white with a lilac sheen and a bright highlight.

### B8–B10. Keepsakes (from the lyrics: tea leaves, pearls, flowers)

- **`keepsake-tea`.** A cream china teacup and saucer with a magenta band.
  Dark tea leaves curl up out of it, and fortune symbols painted inside the
  cup are just visible.
- **`keepsake-pearl`.** An open pink scallop or oyster shell holding one
  large pearl.
- **`keepsake-rose`.** A sea rose: deep pink petals, a pale centre and a
  short green stem dripping with water.

### B11. `proscenium` — stage frame

Red velvet side curtains gathered in the wings with gold tie-backs, a top
valance with scallops, gold fringe and tassels, and a gilt frame. A
weathervane mount sits at top centre. The centre is transparent. The game
animates opening the curtains, so later we may ask for the curtains as
separate left and right panels.

### B12. Wave strips (three rows)

Three cut-out wave strips, back to front, each tiling left-right. Scalloped
crests with white painted foam curls, and a solid body below the crest. The
back strip is darkest (`#2f5552`), the middle is `#3f6f6a`, and the front is
lightest (`#5f8c88`). Show a small wooden crank axle at the left end of each
strip, as if a stagehand turns it.

### B13. `lighthouse` — Widow's Bay

The arrival set piece. A white lighthouse with red bands and a lit lamp room
stands on a dark headland. Beside it is a small cottage with **one window**.
Deliver two variants: `lighthouse.png` with the window dark, and
`lighthouse-lit.png` with a warm lamp in the window. The ending depends on
which one shows.

### B14. `band-trio` — curtain-call cameo

The three band members as one halftone cut-out, taken from the trio in
`video-cover.jpg`: the one in the hat, the one with the acoustic guitar, and
the bearded one. Black-and-white halftone with a hand-tinted wash, cut out
with a pale card edge so they look like toy-theatre figures. Used for the
title screen and the curtain call at the end of each act. A clean photo from
the band would make a better source than the frame grab.

### B15. `moon-face`

A full moon with a sleepy, kindly face in the Méliès manner: closed eyes,
a gentle smile, pink cheeks. Pale gold `#f4e7b8`. It hangs on a wire, so
leave a small hole at the top.

### B16. `sea-dragon`

The red sea dragon on its own, facing left: a long coral body with a
spined back, a gold eye, and harness lines trailing to the right. Painted
like the creature in the grotto frame.

---

## Status

All slots are stand-ins as of this document. When a file lands, set its slot
to `"delivered"` in `assets/manifest.json`, then check it in the game at
https://hoai2k.github.io/mini/widowsbay/.
