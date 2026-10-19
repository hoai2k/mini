# Voice samples (spoken announcements for the Practice Routine)

A first comparison of voices for the Practice Routine's spoken
announcements. Nothing in the app uses them yet: the routine has a hook for
them (`cues` in `app/src/timer.js`).

**The plan:** one line per kind of practice item, generated whole (not
stitched from fragments, which is what makes a voice sound choppy):
- the ending line, e.g. "Intonation practice is complete. Next, scales.";
- a generic line for a Custom item, "That practice item is complete. On to
  the next one.";
- the end of the routine.
Lengths are not spoken, so there is no line per number. **Every new kind of
practice item needs its lines generated too**, as it needs its picture.

## Samples

`sounds/voices/voice-<name>.mp3` has each voice reading the same three
lines, 0.8 s apart, loudness matched (−18 LUFS), so they compare fairly:

1. "Intonation practice is complete. Next, scales."
2. "That practice item is complete. On to the next one."
3. "That's the end of your practice routine. Well done."

| Sample | Voice (ElevenLabs library) | Character | Lines (s) |
| --- | --- | --- | --- |
| voice-sarah | Sarah | soft, young, American female | 3.9, 3.3, 2.9 |
| voice-lily | Lily | warm, British female | 3.7, 3.3, 3.6 |
| voice-matilda | Matilda | warm, friendly, American female | 3.5, 3.2, 3.2 |
| voice-george | George | warm, mature, British male | 3.8, 4.2, 3.1 |
| voice-brian | Brian | deep, calm, American male | 3.4, 3.0, 3.2 |
| voice-daniel | Daniel | steady, British male | 4.1, 4.1, 3.8 |

All are `eleven_multilingual_v2`, with the same settings for a calm, even
read: stability 0.6, similarity 0.75, style 0.1, speaker boost, speed 0.92.
A sixth library voice, Bill (older, American), wasn't available to this
account, so Daniel took his place.

The API key used can generate speech and sound effects but lacks the
`voices_read` permission. So it cannot list the account's voices or browse
the library; the voices above are standard library voices named by id.
