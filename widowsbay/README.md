# Widow's Bay

A toy-theatre voyage built on the look of Langan, Frost & Wane's "Widow's Bay"
video: Méliès footage from *Le Royaume des fées* (1903), stencil-tinted colour,
and the video's plum and magenta title cards. Play it at
https://hoai2k.github.io/mini/widowsbay/.

The full game has five acts, each driven by a different piece of stage
machinery and following the band's video scene by scene:

1. The crossing, ending in a celebration on deck before the witch sinks the
   ship.
2. The sleepers' grotto, waking the drowned revellers and chasing the
   sinking guitar.
3. The Sea King's court.
4. Inside the whale.
5. The cliff and the burning house at Widow's Bay.

Keepsakes carried between acts decide which of three endings plays before
the closing pageant. The design is in
[`design/acts.md`](design/acts.md), and the art it needs is Part C of
[`design/image-requests.md`](design/image-requests.md). Act I is built.

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

All the art is delivered and drawn in the game: 19 images listed in
[`design/image-requests.md`](design/image-requests.md), which also records how
each was checked and fitted. The game loads WebP copies from `assets/` (ids
match `assets/manifest.json`). Full-size PNG originals, the 14 mood boards and
the generation prompts are in [`design/generated/`](design/generated/gallery.html).
Reference frames from the video (one every 5 s), reconstructions made from
them, and a still from the 1903 film are in `design/references/`,
and [`design/video-reference.md`](design/video-reference.md) is a timed account
of the video.

- **Two passes.** The renderer draws each image twice: in colour, and as a
  greyscale print for the stencil-tint pass. The greyscale copies are baked
  once at load, at the size they are drawn, because a canvas filter run on
  every draw cut the frame rate by about ten times.
- **Fitting.** The wave strips tile measured seamless spans, the sky
  alternates mirrored panels, and the proscenium is drawn at 1.3× so its
  painted drapes frame the stage. `design/image-requests.md` gives the numbers.
- **Fallbacks.** A slot whose file is missing, or whose status isn't
  `delivered`, falls back to its procedural stand-in.

## Sound

**Score.** The band's recording, `assets/audio/widowsbay.mp3` (3:28, 192 kbps,
5 MB), is the only music; there is no stand-in. It starts downloading when the
page opens, and a loading bar under Press Start shows its progress. Pressing
Start before it arrives holds the Act I card, with the same bar, until the song
is decoded; then the curtain opens with the song playing. It loops, and
`audio.song.loopEnd` in `assets/manifest.json` is set to 206.4 s to skip the
2.2 s of silence at the end. If the file can't be loaded, the title says so and
the game plays without music.

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
python3 widowsbay/design/source/build_act_requests.py --check   # Part C requests in sync
node widowsbay/qa/board.test.mjs           # rules
widowsbay/publish.sh local/pages/widowsbay  # what Pages deploys
```

Adding `?qa` to the URL exposes the shell state as `window.__widowsBay` for
browser smoke tests.
