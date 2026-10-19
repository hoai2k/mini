# Chime sounds (for a Practice timer)

Candidate sounds to mark the start and end of a timed practice block:
singing bowls, bells and chimes, resonant and calm. Nothing in the app uses
them yet; they are here to be listened to and chosen from.

Generated with ElevenLabs sound effects (`eleven_text_to_sound_v2`, prompt
influence 0.7, not looped), two takes per prompt, then cleaned with
`source/chimes-clean.py`:

- **Start:** at the strike, with a 5 ms fade in.
- **Tail:** faded into true silence over the last 1.5 s.
- **Loudness:** evened out, with the first 2 s at a common level and peaks at most −1 dBFS.

The files are `sounds/chimes/chime-<name>-<take>.mp3`, at 160 kbps stereo, about 180 KB each.

## Takes

Floor is the broadband noise against the strongest partial (1.5–4.5 s in).
Lower is cleaner, and anything under about −75 dB is inaudible. HF is the
share of energy above 6 kHz: high means bright or jangly.

| Name | Prompt (shortened) | s | Take 1: floor / HF | Take 2: floor / HF | Pitch |
| --- | --- | --- | --- | --- | --- |
| bowl-deep | large Tibetan singing bowl, soft mallet, deep warm | 10 | −103 / −60 | −91 / −52 | 277 Hz (C♯4) |
| bowl-mid | medium Himalayan bowl, warm, soft beating | 9 | −87 / −40 | −99 / −56 | 650 Hz |
| bowl-rim | bowl rim rubbed, hum swells then rings | 10 | −78 / −30 (busy) | −87 / −40 | 430 Hz |
| bowl-two | two gentle strikes, end of meditation | 10 | −104 / −60 | −107 / −64 | 312 / 335 Hz |
| crystal-bowl | quartz crystal bowl, pure, luminous | 9 | −85 / −44 | −84 / −41 | 299 Hz |
| rin-bell | Japanese rin bell, pure bright | 8 | −83 / −42 | −82 / −41 | 700 / 2034 Hz |
| bell-soft | small brass meditation bell, mellow | 8 | −76 / −36 | −77 / −40 | 900 Hz |
| three-chimes-down | three chime tones, descending, felt mallet | 8 | −95 / −52 | −105 / −60 | 700 / 659 Hz |
| three-chimes-up | three chime tones, rising, hopeful | 8 | −98 / −59 | −99 / −59 | 698 / 660 Hz |
| koshi | Koshi wind chime tipped once | 8 | −64 / −19 | −44 / −2 (harsh) | – |
| tingsha | tingsha cymbals touched once | 8 | −69 / −29 | −62 / −1 (harsh) | 2421 / 6122 Hz |
| gong-soft | small wind gong, felt mallet, soft bloom | 10 | −82 / −43 | −95 / −50 | 270 / 432 Hz |

The full prompts all end *…long natural decay to silence, clean, no background noise*.
Neither "bowl-two" take actually has a second strike, so they are single bowls.

## Shortlist (to be confirmed by ear)

- **Start a block:** `three-chimes-up-1` (rising), `rin-bell-1`, `bowl-deep-1`.
- **End a block:** `three-chimes-down-2` (falling), `bowl-mid-2`, `crystal-bowl-1`.
- **Left out:** `koshi-2` and `tingsha-2` (harsh, noisy highs), and `bowl-rim-1`
  (busy and scratchy).

A rising set for a start and a falling set for an end tell the two apart
without looking. Every sound is a few seconds of ringing, so the timer should
play the end chime as the block ends and start the next block's chime once
the voice (if any) has finished.
