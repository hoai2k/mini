# Drone sounds

The Drone's **Cello** (the default voice) plays recordings: takes generated with
ElevenLabs sound effects (`eleven_text_to_sound_v2`, 15 s, prompt influence
0.7), each cut into a seamless loop. The other voices are still synthesized
(`app/src/drone.js`) until their recordings are done the same way.

## Cello takes

Four notes a fifth apart (D2, G2, D3, A3, like the cello's own strings), so
every note from C2 to B3 is at most about three semitones from a recording
(the loop is retuned by playback rate). The source takes are kept in
`sounds/drone/`. All four come from the same prompt, with only the note
named: *Professional cellist bowing a single long sustained [low] note on the
cello ([note], [Hz]), perfectly steady pitch, no vibrato, full rich tone,
studio recording, dry, continuous* (G2's take named no note).

| Loop | Take | Steady stroke used | Loop | Brightness steadied |
| --- | --- | --- | --- | --- |
| `cello-D2.mp3` | `cello-f2` | 1.6–7.6 s | 4.9 s | yes |
| `cello-G2.mp3` | `cello-c5` | 6.6–13.4 s | 6.0 s | no (approved as it was) |
| `cello-D3.mp3` | `cello-g2` | 1.8–9.0 s | 6.2 s | yes |
| `cello-A3.mp3` | `cello-h2` | 1.1–13.4 s | 11.3 s | yes |

Picked from 37 cello takes. What was learned on the way:

- Without a note in the prompt, the model almost always plays the open G
  string (G2). Naming a frequency ("A3 (220 Hz)") or an open string ("the open
  D string") steers it; "for the entire duration without stopping" keeps a low
  note from dying away after a few seconds.
- The API's own `loop` option gave a quiet, mostly unpitched take, so loops are
  made here instead.
- Every take wavers (pitch ±3–10 cents, level swings of 8–24 dB with the bow
  strokes) and changes bow. A drone should sound as if the bow never ends, so
  the loops are made **steady** (below): one stroke only, pitch held exactly,
  level evened out. The first version (whole takes, crossfaded) was realistic
  but wavered and had bow changes in it.
- Listening to the steady version: G2 was good; the others were not (C2
  wavered, C3 and D3 swelled, A3 sounded like a waveform). Measured, the
  difference was the takes: G2's came from a long single stroke (6.8 s, a 6 s
  loop) and its brightness held steady, while D3's brightness swung (twice
  G2's variation, heard as swelling even at an even level) and A3's loop was
  only 2 s (a short, perfectly repeated cycle sounds synthetic). New takes
  with G2's prompt gave longer strokes, and brightness steadying (below)
  brought their brightness variation under G2's.

## Making a loop (`source/drone/`)

1. `analyze.mjs` tracks the take's pitch and level every 0.1 s, and `auto.mjs`
   finds the steady stretch between the attack and the release.
2. `steady.mjs` makes it perfectly steady:
   - **one bow stroke**: bow changes show as a dip in level (2.5 dB below the
     level around it) or a sudden jump; only the longest stretch between them
     is used, so no change of direction is ever heard;
   - **pitch held exactly**: the pitch is measured every 256 samples (NSDF
     within ±5 % of the note) and the audio is resampled continuously (cubic
     interpolation) so every cycle is the same whole number of samples long;
   - **level evened out**: a level follower over two periods, smoothed over
     30 ms, divides out 92 % of the swells;
   - **brightness held** (`spectral.mjs`, for D2, D3 and A3): each
     frequency's strength, smoothed over 150 ms, is pulled 85 % of the way to
     its usual level (STFT, 4096-point frames, 8× overlap, the original
     phases kept), so the tone doesn't swell brighter and darker; faster
     texture, like bow noise, is left alone;
   - **the loop**: a whole number of those cycles, its last 0.8 s blended into
     its start; the cycles line up, so the join is between near-identical
     waveforms. Level: −20 dBFS RMS.
3. `export.mjs` writes each loop for the app with 0.3 s of its own
   continuation before and after (so a decoder that shifts the audio a little
   still loops inside seamless material; the app's `loopStart` and `loopEnd`
   are the margin and margin + loop), measures the finished loop's pitch, and
   prints the manifest copied into `SAMPLED` in `app/src/drone.js`:
   `node export.mjs <outDir> cello --steady D2=cello-f2:sp G2=cello-c5 D3=cello-g2:sp A3=cello-h2:sp`
   reproduces the shipped files exactly. (`loop.mjs` without `--steady` makes
   the earlier, realistic loops.)
4. `gen.sh` makes new takes (`ELEVENLABS_API_KEY` from the environment only;
   about 11 credits a second).

## Checks

- Every loop's seam, played three times round: the sample step and the 20 ms
  level and brightness change across the join are within the loop's own
  variation.
- In Chromium, every note C2–B3 rendered for 22 s (each loop going round 2 to
  11 times): pitch on the note (within ±0.2 cents), pitch variation 0.1–0.8
  cents (the takes wavered ±3–10), level variation 0.3–0.8 dB in 20 ms frames,
  the largest 20 ms change 2.6 dB at most, loudness within 1 dB note to note,
  and no clicks. Brightness variation (six bands, 50 ms frames) of each loop:
  D2 1.0, G2 1.3, D3 1.1, A3 1.2 dB, where the swelling D3 had 2.5.
- Live in the app: loading, fading in, crossfading between notes, the timed
  sequence moving on, and silence on pause.
