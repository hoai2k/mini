# Kingdom of the Fairies

A hand-tinted toy-theatre voyage inspired by Georges Méliès’s silent film
*Le Royaume des fées* (1903). Play at
https://hoai2k.github.io/mini/kingdomofthefairies/.

There are three editions, chosen by the address:

- **The default** (no parameter, or `?widowsbay` with any value but `on` or
  `off`) is the original five-act game under the new title: no band, no song,
  and the sailor's guitar becomes a sword (its art and its words), with new art
  filling the gaps (`PARTIAL_CAST` in `src/theme.js`). It shares the improved
  climbing.
- **[`?widowsbay=off`](https://hoai2k.github.io/mini/kingdomofthefairies/?widowsbay=off)**
  is the film edition: the prince's story after Méliès, with a prologue and six
  acts and only the period accompaniment.
- **[`?widowsbay=on`](https://hoai2k.github.io/mini/kingdomofthefairies/?widowsbay=on)**
  restores the preserved Widow’s Bay title, Langan, Frost & Wane cast and song.

Acts open in order as they are finished. **`?edit=local`** (with any of the
above) opens a panel for this browser that sets how far each edition is
unlocked, independently, and can open every scene of the open acts
(`src/editor.js`).

Each edition keeps its own saves and settings; the legacy keys remain
compatible with existing saves.

## The editions' acts

The film edition (`?widowsbay=off`) follows the film's story
([the film adaptation plan](design/film-adaptation.md)): a prologue and six
acts. The first four keep their stage machinery and rules, recast:

0. Prologue, The Betrothal: a short playable scene on the delivered sets. The
   prince receives the fairies' gifts in the betrothal court, the witch curses
   it, he chases the demons' chariot along the rampart, and Aurora arms him in
   the armoury. Nothing can be lost; B skips a scene; it leads straight into
   the Royal Crossing.
1. The Royal Crossing: the royal ship's voyage (the original ship), then the
   witch's tempest: walk the deck lighting the four lanterns while dodging her
   lightning.
2. The Water Fairy: the sleepers' grotto; he swims to the Water Fairy for her
   blessing, and her dolphin carriage carries him on.
3. Neptune's Court: a walk through the lobster palace (past the guards'
   claws), the sea flora and the azure grotto, then the court's moving floors,
   watched by the scrying eye.
4. The Whale's Passage: through the whale to shore, where Aurora points the
   way through the cavern (a run through the dark, by Aurora's lamp).
5. The Enchanted Tower: the cliff, a dive from its edge, a swim across the sea gap diving under the
   witch's swoops, and the tower wall up to Azurine's window.
6. The Burning Tower: the burning floors, carrying Azurine out, pushing the
   witch's barrel over the cliff (step back when it lurches), walking Azurine
   along the wedding street to the gate, and into the light of the apotheosis.
   Every scene is played: nothing is timed to the beat or shown as a still.

The film cast, props and sets use the delivered production art; anything still
requested is drawn by an interim cut-out from the planning sheets (`assets/interim/`, `assets/tableaux/`, made by
`design/source/cut_planning.py`) until the production requests arrive.

[`?widowsbay=on`](https://hoai2k.github.io/mini/kingdomofthefairies/?widowsbay=on)
keeps the original five acts unchanged (and the default plays them without the band or guitar): The Crossing, The Sleepers' Grotto,
The Sea King's Court, The Whale's Road and The Enchanted Tower (cliff, burning
house, beloved, endings and pageant). Climbing in both editions shows the
reachable holds, an arrow for each direction and the leap arc.

The retained sailor, guitar, rose bargain and alternate endings are adaptation
mechanics, not events in the film. For the complete original storyline and
character identities, start with [the film reference](design/film-story.md).
[The design](design/acts.md) maps that story to future updates;
[the film adaptation plan](design/film-adaptation.md) proposes the chapters to keep, recast, replace and add;
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

[The film planning gallery](design/references/film-planning/index.html) contains
the ten character sheets and twenty scene concepts for the proposed adaptation.
Source request briefs, named references and native originals are retained. These are design references; interim cut-outs from them remain only for assets whose production art has not arrived.

[The production artwork gallery](design/generated/film-production/index.html)
contains the film-edition sprites, props and sets, with native originals and
submitted prompts. [Image requests](design/image-requests.md) track delivery
status. The film edition draws these through its cast maps (`src/theme.js`
and each act's `cast`).

[The character audit](design/character-audit.md) compares the cast with the
film; its hand-tinted alternates (requests F8, all delivered) are the film
edition's default cast look; Settings › Cast look › Original (or
`?look=original`) returns to the first, cleaner art.

An optional menu ambience, `?crackle=on`, holds the score back until play and
fills the title, playbill, act cards and pause with an old record's crackle
(`sfx/record.mp3` from `build_sfx.py`, with a synthesized fallback in
`src/audio.js`). It is off by default; Widow's Bay never uses it.

[Music](design/music.md) describes the five delivered period tracks and their
scene moods. New effects use `design/source/build_sfx.py`; its key comes from
`ELEVENLABS_API_KEY` and must never be committed.

[The workbench](workbench/README.md), at
https://hoai2k.github.io/mini/kingdomofthefairies/workbench/, reviews every
cinematic with pause, scrub, stepping and copied moment links. Append
`?widowsbay=on` there to review the legacy cast.

Home-screen installation uses the new manifest and icons; the query edition
selects its preserved manifest/icons with `start_url: ./?widowsbay=on`.

## Checks and publication

From the repository root:

```sh
for e in widowsbay partial; do for t in board act2 act3 act4 act5; do KOTF_EDITION=$e node kingdomofthefairies/qa/$t.test.mjs; done; done
for t in animation sailor-motion walking theme assets-loader; do node kingdomofthefairies/qa/$t.test.mjs; done
KOTF_EDITION=film node kingdomofthefairies/qa/film.test.mjs
for g in build_act_requests build_film_requests build_film_assets; do python3 kingdomofthefairies/design/source/$g.py --check; done
CHROMIUM_PATH=/usr/bin/chromium node kingdomofthefairies/qa/theme-browser.mjs
CHROMIUM_PATH=/usr/bin/chromium node kingdomofthefairies/qa/walking-browser.mjs
kingdomofthefairies/publish.sh local/pages/kingdomofthefairies
```

`?qa` exposes the shell as `window.__kingdomOfTheFairies` (and the compatible
`window.__widowsBay` alias). GitHub Pages publishes the renamed directory;
the repository game index and workflow point to it.
