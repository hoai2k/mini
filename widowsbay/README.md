# Widow's Bay

A toy-theatre voyage built on the look of Langan, Frost & Wane's "Widow's Bay"
video: Méliès footage from *Le Royaume des fées* (1903), stencil-tinted colour,
and the video's plum and magenta title cards. Play it at
https://hoai2k.github.io/mini/widowsbay/.

## Act I — The Crossing (the first board)

You sail a cut-out ship along three cranked rows of painted waves toward the
lighthouse at Widow's Bay.

- **Rows and steering.** Up and down hop between the wave rows; left and right
  move the ship along its rail. Sailing further ahead makes the voyage
  slightly faster.
- **Rocks** rise through trapdoors where the water churns. Leap over them (A)
  or change rows.
- **Lightning** strikes whichever row has the witch's darkening cloud over
  it. Leaping doesn't help; changing rows does.
- **The wind.** The weathervane on the valance spins as a warning, then the
  sea witch turns the wind. A headwind pushes you back and slows the voyage.
- **Pearls** score points. Three **keepsakes** from the lyrics (tea leaves, a
  pearl, a sea rose) each float past once. Bring all three to the bay and a
  lamp is lit in the cottage window; miss any and the window stays dark.
- Three lanterns are your hull. Lose them all and the act ends on a magenta
  "The Sea Keeps Her Own" card.

A voyage lasts about 100 seconds of sailing.

## How it's built

A static page with no build step: canvas 2D plus Web Audio.

- `src/board.js`: the rules as pure state (seeded, no DOM). Tested headless
  by `qa/board.test.mjs`.
- `src/art.js`: the renderer. Each frame is painted twice, once as a
  monochrome print and once as flat colour. The colour pass is shifted out of
  register, blotched, and laid over the print with the `color` blend. Grain,
  flicker, scratches and gate weave follow. *Settings → Film look* reduces or
  removes these effects.
- `src/audio.js`: plays the band's recording when it is delivered, or a
  stand-in shanty in D dorian (fingerpicking, a driven organ drone, a penny
  whistle); sea wash and sound effects play under either.
- `src/input.js` and `src/main.js`: controller, keyboard and touch input; the
  title screen, act cards, pause menu, instructions and settings, following
  [`GAME_GUIDELINES.md`](../GAME_GUIDELINES.md).

## Art

The first art delivery includes 19 game PNGs and 14 mood boards generated with
the built-in imagegen tool. Browse [the art gallery](design/generated/gallery.html)
for previews, originals and prompts. The ten existing image slots now load their
delivered art; the nine planned scenery files are recorded under `plannedArt`
in the manifest and await renderer integration. The sky alternates reflected
panels for a continuous loop. The wave strips still need seam tuning before
ordinary left-to-right repetition.

Additional source references and provenance live in [reference/](reference/README.md).
[`design/image-requests.md`](design/image-requests.md) lists the requests: the
look, the palette taken from the video frames in `design/references/`, mood
boards, and one entry per game asset. Each asset id matches a slot in
`assets/manifest.json`. To use a delivered image, put the file in `assets/`
and set its slot's status to `delivered`; the procedural stand-ins remain the
fallback.

## Music

The score is the band's recording of "Widow's Bay". To install it, drop the
file (MP3 is safest across browsers; OGG, M4A or WAV also work) in
[`intake/`](intake/README.md) and ask for it to be integrated. It lands at
`assets/audio/widows-bay.mp3` (or whatever `audio.song.file` names in
`assets/manifest.json`), with `audio.song.status` set to `delivered`. The
track loops; set `loopStart` and `loopEnd` in seconds to loop just a section.
Until a file is delivered, or if it fails to load, the procedural shanty in
`src/audio.js` plays instead. Separate stems (guitar, organ, vocals) would
allow music that reacts to the game later, such as dropping the vocals during
storms.

## Checks

```sh
node widowsbay/qa/board.test.mjs           # rules
widowsbay/publish.sh local/pages/widowsbay  # what Pages deploys
```

Adding `?qa` to the URL exposes the shell state as `window.__widowsBay` for
browser smoke tests.
