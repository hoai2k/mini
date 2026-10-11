# Kingdom of the Fairies — period accompaniment

The default edition begins with period instrumental music on the first user
gesture. There is no opening song and no song reprise at the pageant or curtain
call. Music volume remains adjustable. The old song-versus-accompaniment toggle
is hidden because the default edition always uses the period pieces.

These are delivered modern recordings in a period style, not an authenticated
original score for the silent film. Keep the existing stage-foley effects.

| Manifest id | Recording | Scene mood |
| --- | --- | --- |
| `period-piano` | Paris Cinema: solo piano, 2:09, B major, rubato | Voyage and moon-boat ride |
| `period-band` | Festival March: café-concert ensemble, 2:32, E-flat major, rubato | Deck party, court, pageant and curtain call (`revel`) |
| `period-harmonium` | Sea and Grotto Waltz: harmonium/piano, 2:05, C minor | Grotto and whale (`deep`) |
| `period-storm` | The Shipwreck: piano agitato, 2:00, C minor | Wreck, storm and fire |
| `period-tender` | Tender Evening: salon romance, 3:00, D minor/F major | Cliff, endings and playbill |

Files are in `assets/audio/`, with delivery metadata in `assets/manifest.json`.
The scene mood chooses a ready recording and crossfades when needed. Recordings
load sequentially after audio unlock; playback starts with the first ready
piece and follows the current mood as more pieces arrive. A failed piece is
skipped; if all fail, gameplay continues without a music substitute.
The beat-sensitive game machinery uses the retained 76.5 BPM clock independently
of these rubato performances. No gameplay tempo change is part of this update.

The preserved query edition keeps its opening recording, optional period
handover, and song reprise. Its original score plan, measurements and generation
prompts are in [legacy/music.md](legacy/music.md). The `period-band` id describes
a period instrumental ensemble and is unrelated to the removed modern band cast.
