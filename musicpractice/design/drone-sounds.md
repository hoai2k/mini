# Drone sounds

The Drone's **Cello** (the default voice) plays recordings: takes generated with
ElevenLabs sound effects (`eleven_text_to_sound_v2`, 15 s, prompt influence
0.7), each cut into a seamless loop. The other voices are still synthesized
(`app/src/drone.js`) until their recordings are done the same way.

## Cello takes

Five notes a few semitones apart, so every note from C2 to B3 is at most three
semitones from a recording (the loop is retuned by playback rate). The source
takes are kept in `sounds/drone/`.

| Loop | Take | Measured | Prompt |
| --- | --- | --- | --- |
| `cello-D2.mp3` | `cello-e1` | 73.57 Hz (D2 +3 ¢) | Solo cello sustaining one long low D2 note (73 Hz) for the entire duration without stopping, continuous smooth bowing, constant volume, no vibrato, studio recording |
| `cello-E2.mp3` | `cello-c4` | 82.97 Hz (E2 +12 ¢) | Solo cello holding a single sustained note E3, long smooth bow, no vibrato, rich tone, studio recording |
| `cello-G2.mp3` | `cello-b1` | 98.72 Hz (G2 +13 ¢) | Professional cellist bowing a single long sustained low note on the cello, perfectly steady pitch, no vibrato, full rich tone, studio recording, dry, continuous |
| `cello-D3.mp3` | `cello-c2` | 146.19 Hz (D3 −11 ¢) | Solo cello sustaining the open D string, a single long bowed note, steady pitch, no vibrato, rich warm tone, studio recording |
| `cello-A3.mp3` | `cello-d1` | 219.47 Hz (A3 −5 ¢) | Solo cello in its tenor register sustaining a single high note around A3 (220 Hz), long bow, no vibrato, singing tone, studio recording |

Picked from 26 cello takes. What was learned on the way:

- Without a note in the prompt, the model almost always plays the open G
  string (G2). Naming a frequency ("A3 (220 Hz)") or an open string ("the open
  D string") steers it; "for the entire duration without stopping" keeps a low
  note from dying away after a few seconds.
- The API's own `loop` option gave a quiet, mostly unpitched take, so loops are
  made here instead.
- Takes were kept only if their pitch held within about ±5 cents (no vibrato,
  no note changes) for 7 s or more.

## Making a loop (`source/drone/`)

1. `analyze.mjs` tracks the take's pitch and level every 0.1 s.
2. `auto.mjs` finds the steady stretch: from 0.6 s after the level first
   reaches within 6 dB of its median, to just before it falls away.
3. `loop.mjs` evens out bow swells partly (a 0.4 s level follower, 60 %),
   chooses the loop length, a whole number of pitch periods, where what
   follows the loop's end best matches its start in level and brightness over
   the crossfade, and crossfades the end into the start over 1.5 s (equal
   power), so going round has no seam. Level: −20 dBFS RMS.
4. `export.mjs` writes each loop for the app with 0.3 s of its own
   continuation before and after (so a decoder that shifts the audio a little
   still loops inside seamless material; the app's `loopStart` and `loopEnd`
   are the margin and margin + loop), measures the finished loop's pitch, and
   prints the manifest copied into `SAMPLED` in `app/src/drone.js`.
   `node export.mjs <outDir> cello D2=cello-e1 E2=cello-c4 G2=cello-b1 D3=cello-c2 A3=cello-d1`
   reproduces the shipped files exactly.
5. `gen.sh` makes new takes (`ELEVENLABS_API_KEY` from the environment only;
   about 11 credits a second).

## Checks

- Every loop's seam, played three times round: the sample step and the 20 ms
  level and brightness change across the join are within the take's own
  variation (no larger than its 95th percentile elsewhere, ×1.2).
- In Chromium, every note C2–B3 rendered for 22 s (each loop going round two
  to four times): pitch within ±1.4 cents of equal temperament, loudness
  −20.5 to −22 dB (within 1.5 dB note to note), no clicks (the largest sample
  step under 1.8× the 99.9th percentile). The biggest 20 ms level changes are
  bow nuances inside the takes, a quarter of the way into a loop, not at the
  joins.
- Live in the app: loading, fading in, crossfading between notes, the timed
  sequence moving on, and silence on pause.
