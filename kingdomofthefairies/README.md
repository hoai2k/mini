# Kingdom of the Fairies

A hand-tinted toy-theatre voyage inspired by Georges Méliès’s silent film
*Le Royaume des fées* (1903). Play at
https://hoai2k.github.io/mini/kingdomofthefairies/.

The default edition uses the new title and artwork, removes the modern band
characters, and plays only the delivered period accompaniment. Adding
[`?widowsbay`](https://hoai2k.github.io/mini/kingdomofthefairies/?widowsbay)
restores the preserved Widow’s Bay title, Langan, Frost & Wane cast and song.
Presence of the parameter enables that edition, even with an empty value.
Saves and settings use separate storage keys for the two editions; the legacy
keys remain compatible with existing saves.

## Current game and future story

The five playable acts retain their controls, scoring, keepsakes, checkpoints,
and branching endings. This pass changes the presentation, not those rules:

1. The Crossing: steer along three wave rows, leap rocks, collect pearls and
   tea leaves; light the deck-party lanterns on the beat before the wreck.
2. The Sleepers’ Grotto: swim, gather air, wake the sleepers and recover the
   sinking guitar; choose whether to take the rose, then ride the moon boat.
3. The Sea King’s Court: cross the court’s moving floors.
4. The Whale’s Road: climb through the whale and reach shore.
5. The Enchanted Tower: climb the cliff, cross the burning house, rescue the
   beloved, and see the ending and pageant.

Moving scenic stones replace the cliff’s band boots visually, retaining their
foothold anchors and timing. Band cut-outs and procedural band figures are
excluded from the default title, deck, cliff, pageant and curtain call.

The retained sailor, guitar, rose bargain and alternate endings are adaptation
mechanics, not events in the film. For the complete original storyline and
character identities, start with [the film reference](design/film-story.md).
[The design](design/acts.md) maps that story to future updates;
[the story appendix](design/story-appendix.md) records proposed extensions.

## Implementation

This is a static canvas 2D / Web Audio page, with no build step.

- `src/theme.js` selects the edition, filters legacy image/animation slots and
  the song before loading, and applies the document title and install metadata.
- `src/board.js` and `src/acts/` hold the seeded gameplay rules.
- `src/art.js` paints a monochrome print and an offset stencil-colour pass;
  film look settings reduce grain, scratches, flicker and gate weave.
- `src/audio.js` starts period recordings on the first user gesture in the
  default edition and switches by scene mood. The old song-first and reprise
  behavior remains in the query edition. Sound effects retain their recorded
  stage-foley and synthesized fallbacks. The 76.5 BPM gameplay clock stays fixed
  when the song is absent; the rubato period recordings do not drive it.
- `src/main.js`, `input.js`, `touch.js`, `fit.js` and `chrome.js` handle the shell,
  controllers, keyboard, landscape touch controls, fitting and fullscreen.

Use arrows/WASD to move and Space/Z/J to act. Touch uses swipes for rows and a
floating stick for swimming/climbing. The game includes per-act instructions,
pause, scene select and checkpoints. Hull and pearl tuning is in
`src/game_config.js`.

## Art, sound and workbench

[Image requests and delivery](design/image-requests.md) describe the new title
and film storyboard; PNG originals are in `design/generated/fairies/`.
The existing scenic art remains shared, with modern band assets restricted to
the query edition. Historical requests, prompts and video reference are retained
under [design/legacy/](design/legacy/README.md) and existing generated galleries.
New documentation uses the full film, not the music-video edit, as its authority.

[Music](design/music.md) describes the five delivered period tracks and their
scene moods. New effects use `design/source/build_sfx.py`; its key comes from
`ELEVENLABS_API_KEY` and must never be committed.

[The workbench](workbench/README.md), at
https://hoai2k.github.io/mini/kingdomofthefairies/workbench/, reviews every
cinematic with pause, scrub, stepping and copied moment links. Append
`?widowsbay` there to review the legacy cast.

Home-screen installation uses the new manifest and icons; the query edition
selects its preserved manifest/icons with `start_url: ./?widowsbay`.

## Checks and publication

From the repository root:

```sh
for t in board act2 act3 act4 act5 animation sailor-motion theme; do node kingdomofthefairies/qa/$t.test.mjs; done
python3 kingdomofthefairies/design/source/build_act_requests.py --check
CHROMIUM_PATH=/usr/bin/chromium node kingdomofthefairies/qa/theme-browser.mjs
kingdomofthefairies/publish.sh local/pages/kingdomofthefairies
```

`?qa` exposes the shell as `window.__kingdomOfTheFairies` (and the compatible
`window.__widowsBay` alias). GitHub Pages publishes the renamed directory;
the repository game index and workflow point to it.
