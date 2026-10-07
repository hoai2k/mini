# Gliders: sound effects

Generated with ElevenLabs sound effects (`eleven_text_to_sound_v2`) by [`source/build_audio.py`](source/build_audio.py); edit the data there and rerun it. Loops are generated as loops and then crossfaded tail-to-head so they repeat seamlessly; everything is loudness-matched (loops at -20 LUFS, one-shots at -17).

The wind layers are mixed by speed in `game/src/audio.js`: glide below about 35 m/s, fast from 35 to 90, dive above; close rises with proximity, flutter with speed and flaring.

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `wind-glide` | loop | 12 s | 1 | Slow gliding: the bed under everything at low speed. |
| `wind-fast` | loop | 12 s | 1 | Normal flight at 40-80 m/s. |
| `wind-dive` | loop | 12 s | 1 | Full-speed dives above 90 m/s. |
| `wind-close` | loop | 10 s | 1 | Proximity: rises as a glider skims close to a block. |
| `flutter` | loop | 8 s | 1 | Wing membrane flutter: rises with speed and when flaring. |
| `whoosh` | shot | 1.2 s | 3 | A gap threaded or a tunnel cleared: a pass-by. |
| `crash` | shot | 1.4 s | 2 | A glider hits a block. |

## Prompts

### wind-glide

```text
Constant soft airflow rushing past the ears while gliding slowly high in the open sky, smooth even airy hush with a faint low rumble, the same level the whole time, no gusts, no swells. Continuous, seamless. No music, no voices, no birds, no engines.
```

### wind-fast

```text
Strong continuous wind rushing past a wingsuit flyer at speed, full airy roar with a breathy hiss on top and gentle buffeting, steady intensity. Continuous, seamless. No music, no voices, no birds, no engines.
```

### wind-dive

```text
Extreme high-speed wind roar of a steep wingsuit dive, intense turbulent howling rush with heavy low buffeting and whistling, loud and powerful but steady. Continuous, seamless. No music, no voices, no birds, no engines.
```

### wind-close

```text
Constant bright hissing rush of air streaming at high speed along a smooth stone wall right beside you, reflected tunnel-like roar, the same level the whole time, never stops or fades. Continuous, seamless. No music, no voices, no birds, no engines.
```

### flutter

```text
Thin taut fabric wing membrane fluttering rapidly in strong wind, fast rattling flap like a small kite edge, steady rhythm, close up, little background wind. Continuous, seamless. No music, no voices, no birds, no engines.
```

### whoosh

```text
Very fast close whoosh of something small flying past a pillar, short sharp doppler air swish, clean, no impact. No music, no voices, no birds, no engines.
```

### crash

```text
Soft heavy thump of a small flying animal bonking into a hard painted block, dull wooden knock with a puff of air and a little scatter of tumbling debris, not violent, slightly comic. No music, no voices, no birds, no engines.
```
