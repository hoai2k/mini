# Voice samples (spoken announcements for the Practice Routine)

The voices for the Practice Routine's spoken announcements, and how they
were chosen.

**In use** (`app/assets/audio/voice/<voice>/`, 17 lines each), in the order
the settings list them:
- **Lily:** calmA settings (multilingual v2, stability 0.85, style 0, no
  speaker boost, speed 0.85).
- **Matilda** and **George:** calmB (eleven_v3, "[softly, calmly]",
  stability 0.5).
- **Clara**, **Autumn** (Autumn Veil) and **Theo** (Theo Silk): as in
  their second-round samples (multilingual v2, stability 0.6, style 0.1,
  speed 0.92).

The lines are made with the scratch script `lines.py`, then trimmed of
silence and loudness matched (−18 LUFS) to mono 96 kbps. All the v3 lines
came out about as long as Lily's, so no tag was spoken. The lines:
- done-<kind>: "Intonation practice is complete.", "Scales are complete.",
  "Clapping rhythms are complete.", "Ghosting is complete.", and for Custom
  "That practice item is complete.";
- next-<kind>: "Next, intonation practice." and so on, and for Custom "On
  to your next practice item.";
- first-<kind>: "Let's begin with intonation practice." and so on, and for
  Custom "Let's begin.";
- finished: "That's the end of your practice routine. Well done.";
- hello: "Hello. I'll guide you through your practice routine."
A new suggestion needs its three lines in every voice.

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
A sixth library voice, Bill, was asked for under the wrong id, so Daniel
took his place in the first round (he is in the second).

### Second round: more calm voices

Once the key could read voices, the account's 84 voices and the shared
library's meditation and calm-narration voices were looked through. These
read the same lines with the same settings. Shared-library voices are used
directly by id, with no need to add them to the account.

| Sample | Voice | Character | Lines (s) |
| --- | --- | --- | --- |
| voice-milo | Milo (shared) | calm, soothing, meditative, American male | 4.4, 4.3, 3.9 |
| voice-clara | Clara (shared) | relaxing, calm, American female | 4.4, 3.8, 3.7 |
| voice-james | James (shared) | calm, comforting, gentle, British male | 5.5, 5.9, 4.3 |
| voice-autumn | Autumn Veil (shared) | warm, reflective, American female | 3.8, 3.8, 3.2 |
| voice-theo | Theo Silk (shared) | deep, British, sleep and meditation | 5.0, 4.4, 3.4 |
| voice-charlotte | Charlotte (shared) | meditation and relaxation, Australian female | 5.4, 5.1, 4.7 |
| voice-river | River (library) | relaxed, neutral (neither male nor female) | 3.4, 3.0, 3.0 |
| voice-bill | Bill (library) | wise, mature, older American male | 4.3, 3.5, 3.5 |

### Calmer Lily, Matilda and George

The first round of these three sounded a little too forceful, so each was
read again two ways:

- **calmA** (`voice-<name>-calmA`): the same model made steadier and
  slower. Stability 0.85, style 0, no speaker boost, speed 0.85, and a
  pause written into each line ("…complete... Next, scales.").
- **calmB** (`voice-<name>-calmB`): ElevenLabs' newer `eleven_v3`, asked in
  the line itself to speak "[softly, calmly]" ("[softly, warmly]" for the
  last line), stability 0.5. Lily's first v3 line runs longer than the
  others' (its first phrase 2.6–3.1 s against about 2 s, in three takes):
  listen that the instruction isn't spoken.

The key now has `voices_read`; it still lacks `speech_to_text`, which would
let the lines be checked by transcribing them.
