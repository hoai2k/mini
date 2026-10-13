# Drone sounds

Every Drone voice plays recordings: takes generated with ElevenLabs sound
effects (`eleven_text_to_sound_v2`, 15 s, prompt influence 0.7), each cut into
a seamless loop. The bowed and blown voices are also made perfectly steady, as
if the bow or breath never ended. The synthesized voices in `app/src/drone.js`
remain only as a fallback if a voice's files can't load.

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

## The other voices

Made the same way, from the takes in `sounds/drone/`. Where an instrument's
natural range doesn't reach a note within 4 semitones (7 for the organ), it
plays that note an octave up or down. **Cello, soft** is the steady cello
through a 900 Hz low-pass (darker, as if bowed over the fingerboard), a
little louder and with a little more room.

### Cello section

Steady, brightness held, whole stretch (an ensemble changes bow at staggered times).

| Loop | Take | Measured | Loop | Prompt |
| --- | --- | --- | --- | --- |
| `section-D2.mp3` | `section-a2` | 73.50 Hz | 10.4 s | Cello ensemble sustaining a single low drone note (D3, 147 Hz) for the whole duration, many cellos in unison, constant volume, no vibrato, lush and warm |
| `section-G2.mp3` | `section-a1` | 97.57 Hz | 9.9 s | A section of cellos playing one long unison note together (G2, 98 Hz) for the entire duration, continuous smooth bowing, no vibrato, warm and full, orchestral recording in a hall |
| `section-D3.mp3` | `section-c1` | 147.00 Hz | 9.9 s | A section of cellos playing one long unison note together (D3, 147 Hz) for the entire duration, continuous smooth bowing, no vibrato, warm and full, orchestral recording in a hall |
| `section-A3.mp3` | `section-b2` | 219.39 Hz | 10.6 s | A section of cellos playing one long unison note together (A3, 220 Hz) for the entire duration, continuous smooth bowing, no vibrato, warm and full, orchestral recording in a hall |

### Tanpura

Natural loop (plucked: no steadying), loop point where the sound after it best matches its start.

| Loop | Take | Measured | Loop | Prompt |
| --- | --- | --- | --- | --- |
| `tanpura-E2.mp3` | `tanpura-c3` | 82.06 Hz | 11.5 s | Tanpura drone for Indian classical music tuned to E (tonic E2, 82 Hz), low and deep, the four strings plucked slowly in a repeating cycle, buzzing jawari resonance, continuous, solo |
| `tanpura-C3.mp3` | `tanpura-a1` | 131.62 Hz | 10.2 s | Indian tanpura drone, continuous cycle of four plucked strings with buzzing jawari bridge, tonic Sa at C3 (131 Hz), steady rhythm, rich shimmering overtones, no other instruments |
| `tanpura-Ab3.mp3` | `tanpura-c2` | 210.05 Hz | 11.2 s | Tanpura drone tuned high for a female singer, tonic G3 (196 Hz), the four strings plucked slowly in a repeating cycle, buzzing jawari resonance, continuous, solo |

### Sitar

Natural loop, as the tanpura.

| Loop | Take | Measured | Loop | Prompt |
| --- | --- | --- | --- | --- |
| `sitar-C3.mp3` | `sitar-a1` | 132.22 Hz | 10.0 s | Sitar drone: the chikari drone strings strummed in a steady repeating rhythm with sympathetic strings ringing, tonic C3, no melody, continuous, solo sitar, studio recording |
| `sitar-A3.mp3` | `sitar-d2` | 221.23 Hz | 10.5 s | Sitar drone tuned to A (tonic A3, 220 Hz), the drone strings struck slowly in a repeating cycle, sympathetic strings shimmering, continuous, solo, no melody, studio recording |

### Shruti box

Steady, brightness held, whole stretch, two periods per cycle (tonic and fifth).

| Loop | Take | Measured | Loop | Prompt |
| --- | --- | --- | --- | --- |
| `shruti-E2.mp3` | `shruti-d1` | 81.82 Hz | 12.4 s | Bass shruti box with deep reeds, a continuous drone of the tonic and fifth, tonic E2 (82 Hz), very low and warm, steady bellows, solo, no melody |
| `shruti-C3.mp3` | `shruti-b2` | 131.64 Hz | 12.5 s | Shruti box drone, reeds sustaining the tonic and fifth together continuously, steady bellows, warm harmonium-like tone, tonic C3 (131 Hz), low register, solo, no melody |
| `shruti-Fs3.mp3` | `shruti-b1` | 185.29 Hz | 12.5 s | Shruti box drone, reeds sustaining the tonic and fifth together continuously, steady bellows, warm harmonium-like tone, tonic E2 (82 Hz), solo, no melody |
| `shruti-C4.mp3` | `shruti-a1` | 262.49 Hz | 12.6 s | Shruti box drone, reeds sustaining the tonic and fifth together continuously, steady bellows, warm harmonium-like tone, tonic C3, solo, no melody |

### Organ

Steady, brightness held, whole stretch; stretches up to 7 semitones (pipes stay natural).

| Loop | Take | Measured | Loop | Prompt |
| --- | --- | --- | --- | --- |
| `organ-G2.mp3` | `organ-a1` | 98.22 Hz | 6.8 s | Pipe organ holding a single low note (G2, 98 Hz) for the entire duration, soft principal stops, steady, in a church with gentle reverb, no other notes |
| `organ-C3.mp3` | `organ-c1` | 130.86 Hz | 7.8 s | Pipe organ holding a single low note (C2, 65 Hz) for the entire duration, soft principal and bourdon stops, steady, in a church with gentle reverb, no other notes |
| `organ-D3.mp3` | `organ-a2` | 147.98 Hz | 10.4 s | Church pipe organ sustaining one deep drone note continuously (D3, 147 Hz), warm flue pipes, constant volume, gentle reverberation, no melody |
| `organ-F3.mp3` | `organ-d2` | 175.00 Hz | 10.8 s | Pipe organ holding a single sustained note (F3, 175 Hz) for the entire duration, soft 8 foot principal, steady, church reverb, no other notes |

### Bagpipe drones

Steady, brightness held, whole stretch, 2 s crossfade.

| Loop | Take | Measured | Loop | Prompt |
| --- | --- | --- | --- | --- |
| `bagpipes-Fs2.mp3` | `bagpipe-d1` | 92.45 Hz | 8.4 s | Only the bass drone of a bagpipe, one deep continuous buzzing note (F2, 87 Hz), steady, no chanter, no melody, no other notes |
| `bagpipes-Bb2.mp3` | `bagpipe-b1` | 116.36 Hz | 11.2 s | Only the bass drone of a bagpipe, one deep continuous buzzing note (A2, 110 Hz), steady, no chanter, no melody, no other notes |
| `bagpipes-D3.mp3` | `bagpipe-c1` | 146.52 Hz | 9.2 s | Only the bass drone of a bagpipe, one deep continuous buzzing note (D2, 73 Hz), steady, no chanter, no melody, no other notes |

Reproduce them with `export.mjs` (flags after each take: `:sp` brightness held, `:whole` the whole steady stretch, `:p2` two periods per cycle, `:xf2` a 2 s crossfade; no `--steady` for the plucked voices):

```sh
node export.mjs out cello-section --steady D2=section-a2:sp:whole G2=section-a1:sp:whole D3=section-c1:sp:whole A3=section-b2:sp:whole
node export.mjs out tanpura E2=tanpura-c3 C3=tanpura-a1 Ab3=tanpura-c2
node export.mjs out sitar C3=sitar-a1 A3=sitar-d2
node export.mjs out shruti --steady E2=shruti-d1:sp:whole:p2 C3=shruti-b2:sp:whole:p2 Fs3=shruti-b1:sp:whole:p2 C4=shruti-a1:sp:whole:p2
node export.mjs out organ --steady G2=organ-a1:sp:whole C3=organ-c1:sp:whole D3=organ-a2:sp:whole F3=organ-d2:sp:whole
node export.mjs out bagpipes --steady Fs2=bagpipe-d1:sp:whole:xf2 Bb2=bagpipe-b1:sp:whole:xf2 D3=bagpipe-c1:sp:whole:xf2
```

What was learned: the model has favourite registers. Tanpura and sitar gravitate to C3 and A♭3–A3, the shruti box to C3–C4, bagpipes to B♭2–D3 (asking for a chanter-free *bass drone* is what keeps the melody pipe out), and the organ ignores a low C request (it played C3). Naming the note with its frequency still steers it some of the time. Takes asked for a soft sul tasto cello came out faint and unpitched, hence the filtered steady cello.

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
