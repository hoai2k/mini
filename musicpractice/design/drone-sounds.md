# Drone sounds

The Drone's **Cello** (the default voice) plays recordings: takes generated with
ElevenLabs sound effects (`eleven_text_to_sound_v2`, 15 s, prompt influence
0.7), each cut into a seamless loop. The other voices are still synthesized
(`app/src/drone.js`) until their recordings are done the same way.

## Cello takes

Five notes a few semitones apart, so every note from C2 to B3 is at most three
semitones from a recording (the loop is retuned by playback rate). The source
takes are kept in `sounds/drone/`.

| Loop | Take | Steady stroke used | Prompt |
| --- | --- | --- | --- |
| `cello-D2.mp3` | `cello-e1` | 2.8–6.1 s, loop 2.4 s | Solo cello sustaining one long low D2 note (73 Hz) for the entire duration without stopping, continuous smooth bowing, constant volume, no vibrato, studio recording |
| `cello-E2.mp3` | `cello-c4` | 5.3–9.8 s, loop 3.6 s | Solo cello holding a single sustained note E3, long smooth bow, no vibrato, rich tone, studio recording |
| `cello-G2.mp3` | `cello-c5` | 6.6–13.4 s, loop 6.0 s | Professional cellist bowing a single long sustained low note on the cello, perfectly steady pitch, no vibrato, full rich tone, studio recording, dry, continuous |
| `cello-D3.mp3` | `cello-c2` | 3.8–8.5 s, loop 3.9 s | Solo cello sustaining the open D string, a single long bowed note, steady pitch, no vibrato, rich warm tone, studio recording |
| `cello-A3.mp3` | `cello-d1` | 5.5–8.3 s, loop 2.0 s | Solo cello in its tenor register sustaining a single high note around A3 (220 Hz), long bow, no vibrato, singing tone, studio recording |

Picked from 26 cello takes. What was learned on the way:

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
   - **the loop**: a whole number of those cycles, its last 0.8 s blended into
     its start; the cycles line up, so the join is between near-identical
     waveforms. Level: −20 dBFS RMS.
3. `export.mjs` writes each loop for the app with 0.3 s of its own
   continuation before and after (so a decoder that shifts the audio a little
   still loops inside seamless material; the app's `loopStart` and `loopEnd`
   are the margin and margin + loop), measures the finished loop's pitch, and
   prints the manifest copied into `SAMPLED` in `app/src/drone.js`:
   `node export.mjs <outDir> cello --steady D2=cello-e1 E2=cello-c4 G2=cello-c5 D3=cello-c2 A3=cello-d1`
   reproduces the shipped files exactly. (`loop.mjs` without `--steady` makes
   the earlier, realistic loops.)
4. `gen.sh` makes new takes (`ELEVENLABS_API_KEY` from the environment only;
   about 11 credits a second).

## Checks

- Every loop's seam, played three times round: the sample step and the 20 ms
  level and brightness change across the join are within the loop's own
  variation.
- In Chromium, every note C2–B3 rendered for 22 s (each loop going round 4 to
  11 times): pitch on the note (within ±0.2 cents), pitch variation 0.1–0.6
  cents (the takes wavered ±3–10), level variation 0.3–0.9 dB in 20 ms frames,
  the largest 20 ms change 3 dB at most (under 1.5 dB above E2), loudness
  within 1 dB note to note, and no clicks.
- Live in the app: loading, fading in, crossfading between notes, the timed
  sequence moving on, and silence on pause.
