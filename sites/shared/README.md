# Shared site scripts

Small scripts more than one band page loads. The folder has no `index.html`,
so `sites/publish.sh` copies it explicitly, the way it copies `music/`.

| File | What it is |
| --- | --- |
| `play-debug.js` | The `?debug=play` switch: turns the in-page player back on |

## `?debug=play`

The band pages publish their catalogues as lists: a track or two links out to
Spotify, the rest are listed greyed with "Coming soon". The playback code
underneath was switched off, not removed — each page keeps its `player.js`,
each row keeps its `data-src`, and each row that used to show a duration
keeps it in `data-dur`.

Adding `?debug=play` to the URL hands the page back:

    https://games.hoai.net/mini/sites/mechmayhem/?debug=play

Every row becomes a play button again, Spotify links included; the durations
come back; the player element appears and the page's own `player.js` is
loaded to drive it. `<html data-debug-play="on">` marks the state, for
styling or for a quick check that the flag took.

Without the flag the script does nothing, so every page can carry it
unconditionally.

## Adding a Spotify link for another song

A row that has a Spotify link and a row that does not are the same row with
two attributes different, and `?debug=play` works on both without being
told. So when a song goes up on streaming, change its row and nothing else.

From this — a song not on streaming yet:

    <button type="button" class="track is-quiet" data-src="music/Titan Clash Suite 1.mp3" data-dur="3:38" disabled>
      <span class="n">02</span>
      <span class="t"><strong>Titan Clash Suite I</strong><small>Neurofunk</small></span>
      <span class="d">Coming soon</span>
    </button>

to this — the same song, now on Spotify:

    <a class="track" href="https://open.spotify.com/track/XXXX" rel="noopener" target="_blank" data-src="music/Titan Clash Suite 1.mp3" data-dur="3:38">
      <span class="n">02</span>
      <span class="t"><strong>Titan Clash Suite I</strong><small>Neurofunk</small></span>
      <span class="d"><svg class="mark" …Spotify glyph… /> Spotify</span>
    </a>

Copy the `<svg class="mark">` from a row that already links out, on the same
page. What matters:

- **Keep `data-src`** — the path the player uses. Drop it and the song stops
  working under `?debug=play`.
- **Keep `data-dur`** — what the row shows when the player is back, since
  the published row now says "Spotify" instead of a running time. Keep
  `data-local` too, where a row has it.
- **Drop `is-quiet` and `disabled`** — the row is live now.
- **Strip the tracking query** off the Spotify URL (`?si=…`, `?autoplay_ok=…`).
  The bare `/track/<id>` is the link.

Then the row shows Spotify to visitors and plays in the page under
`?debug=play`, like every other row. Nothing else needs editing — not the
script tags, not `player.js`, not this file. If it was the last song on the
page that was not on streaming, the line above the track list ("two are up
on streaming; the rest follow") is worth a look.

**It is not a lock.** The flag is visible in the page source, and the
recordings it plays are already served publicly by the games. It is the
author's view of the page, not access control.

Pages that carry it: `space-tiber/`, `charlies-girl-dolls/`, `mechmayhem/`.
Not `canagentsis/`, which has one song and plays it outright.
