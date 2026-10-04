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
- `src/audio.js`: the band's recording as the score, the generated foley
  effects and sea loop, and synthesised fallbacks for all of them.
- `src/input.js` and `src/main.js`: controller, keyboard and touch input; the
  title screen, act cards, pause menu, instructions and settings, following
  [`GAME_GUIDELINES.md`](../GAME_GUIDELINES.md).

## Art

Everything is drawn in code until real art arrives.
[`design/image-requests.md`](design/image-requests.md) lists the requests: the
look, the palette taken from the video frames in `design/references/`, mood
boards, and one entry per game asset. Each asset id matches a slot in
`assets/manifest.json`. To use a delivered image, put the file in `assets/`
and set its slot's status to `delivered`; the procedural stand-ins remain the
fallback.

## Sound

**Score.** The band's recording, `assets/audio/widowsbay.mp3` (3:28, 192 kbps),
starts on Press Start and loops. `audio.song.loopEnd` in `assets/manifest.json`
is set to 206.4 s to skip the 2.2 s of silence at the end. If the file fails to
load, the procedural shanty in `src/audio.js` (transposed to F) plays instead.

**What the recording sets for everything else.** These are measurements of the
file, not listening notes:

- Key F major, with F♯ and A♭ colour that gives it a modal, psychedelic edge.
- About 76 BPM in 4/4, with a strong 152 BPM eighth-note pulse (duple, not a
  6/8 jig).
- Warm and dark: 53% of the energy is in the low mids (120–500 Hz), 24% in the
  mids, and only 1.5% above 6 kHz.
- Compressed: it holds −13 to −17 dB RMS from the end of an 8 s fade-in to the
  fade-out at about 3:22.
- Very wide stereo (side/mid ratio 0.78), in a 60s style.

**Effects.** All 17 effects are generated with the ElevenLabs sound-generation
API by [`design/source/build_sfx.py`](design/source/build_sfx.py), which holds
every prompt. They are written as period stage foley (a wave machine of peas
in a drum, a canvas wind machine, a thunder sheet, ropes and pulleys) to match
the toy theatre. The script keeps raw generations in
`design/source/sfx-raw/` and processes them into `assets/sfx/` to sit with the
song: a roll-off above 9 kHz and below 40 Hz, a common loudness (about −19 dB
mean), and tonal effects retuned into F (pearl to C8, keepsake harp to C5,
music-box flourish to C6, harbour bell to F6). `src/audio.js` plays the
recordings with slight pitch variation, except the tuned ones, and falls back
to synthesised versions if a file is missing.

```sh
ELEVENLABS_API_KEY=... python3 widowsbay/design/source/build_sfx.py          # generate missing, process all
ELEVENLABS_API_KEY=... python3 widowsbay/design/source/build_sfx.py strike   # regenerate one
python3 widowsbay/design/source/build_sfx.py --process                       # reprocess only, no API
```

The key comes from the environment and is never committed. New effects for
later acts go in the script's `SFX` table, with the same foley direction.

## Checks

```sh
node widowsbay/qa/board.test.mjs           # rules
widowsbay/publish.sh local/pages/widowsbay  # what Pages deploys
```

Adding `?qa` to the URL exposes the shell state as `window.__widowsBay` for
browser smoke tests.
