# Bronze Drum: music requests

Prompts for the score, ready to paste into a music generator (Suno, Udio, ElevenLabs Music or similar). Generated from `source/build_audio.py`; edit the data there and rerun it.

## How to use this list

- Each request has **style tags** (short, for a generator's style field) and a full **prompt** (for a description field, or both together).
- Battle loops must hold their exact tempo and length: the game starts each one with the chapter, in time with the Han war drum, and the player drums on top at whatever speed they like. Trim any silence before the first downbeat and cut the loop at the stated time. If a generator drifts in tempo, regenerate rather than stretch.
- Save each finished track as `bronzedrum/game/assets/music/<id>.mp3` (or drop it in `bronzedrum/intake/`). On integration the request is marked delivered and the game plays it.

## The sound of the game

Score for a game about the Trưng sisters' uprising in ancient Vietnam (40 CE), staged as a backlit paper-cut theatre. Intimate, folkloric and ceremonial rather than epic-orchestral. Northern Vietnamese traditional instruments: đàn bầu (monochord, its bending voice is the sisters' grief and longing), đàn tranh (16-string zither), sáo trúc (bamboo flute), đàn nguyệt (moon lute), đàn nhị (two-string fiddle), bamboo percussion (song lang, mõ), and bronze: gongs, bells and the low hum of a bronze drum. Voices in the manner of quan họ, the call-and-response duet singing of Bắc Ninh, close to where the sisters lived: two women's voices, unaccompanied or lightly accompanied.

**Rules for every track**

- The player is the drummer and sets their own speed: commands are judged on evenness, not on a metronome, so the player may drum faster or slower than the music. The tempo given for a battle track is the Han war drum, the beat on which the enemy strikes. Keep that pulse soft and felt rather than hammered (sustained textures, melodic phrases, gentle plucked ostinati), so drumming at another speed on top never clashes; leave the low and low-mid range open: no kick drum, no accented percussion on the beat, no big taiko hits. The player's bronze drum is the lead percussion.
- In-battle tracks start exactly on the first downbeat at 0.000 s, with no pickup, no fade-in and no silence, and loop seamlessly after the stated number of bars.
- Each chapter has a second layer, the waking drum, at the same tempo, key and length. It is played on top of the base when four commands chain, so it must sound right both alone and layered.
- Avoid generic "Asian" clichés, Chinese or Japanese instrument colour (guzheng, erhu, shakuhachi, koto) for the Viet side, Western rock drums, EDM drops, and trailer-music braams. Keep it acoustic and human.
- Lyrics: none, unless a request says otherwise. Wordless vocables ("ơi", "à ơi", "hò") are welcome.

**Leitmotifs.** The title theme (on sáo trúc) is the uprising itself and returns in chapter 3 and the anthem. Trắc's theme is steady and on the beat (đàn tranh); Nhị's bends and syncopates (đàn bầu or sáo trúc), just as her drum strokes fall between the beats.

## Summary

| Id | Title | Use | Tempo | Length | Status |
| --- | --- | --- | ---: | --- | --- |
| `mu-title` | Trống Đồng (title theme) | Title screen and chapter select, looping. | 72 BPM | about 90 s, loopable | requested |
| `mu-garden` | The Garden at Mê Linh (chapter 1) | Chapter 1 battle loop under the player's drumming. | 92 BPM | 16 bars = 41.74 s | requested |
| `mu-garden-wake` | The Garden at Mê Linh: the drum wakes | Layer on top of mu-garden while the drum is awake. | 92 BPM | 16 bars = 41.74 s | requested |
| `mu-river` | The Outpost on the Hát River (chapter 2) | Chapter 2 battle loop. | 96 BPM | 16 bars = 40.00 s | requested |
| `mu-river-wake` | The Hát River: the drum wakes | Layer on top of mu-river while the drum is awake. | 96 BPM | 16 bars = 40.00 s | requested |
| `mu-luylau` | The Citadel at Luy Lâu (chapter 3) | Chapter 3 battle loop, at night. | 100 BPM | 16 bars = 38.40 s | requested |
| `mu-luylau-wake` | Luy Lâu: the drum wakes | Layer on top of mu-luylau while the drum is awake. | 100 BPM | 16 bars = 38.40 s | requested |
| `mu-sisters` | Two Sisters (story theme) | Story scenes and the training years between chapters. | 66 BPM | about 2 min | requested |
| `mu-elegy` | The Drums Are Melted (ending) | The ending, after the last battle. | 58 BPM | about 3 min | requested |
| `mu-victory` | Victory sting | Chapter won. | 100 BPM | about 8 s | requested |
| `mu-defeat` | Defeat sting | Chapter lost. | 60 BPM | about 8 s | requested |
| `mu-oath` | The Oath (funeral) | Under The Oath, the father's funeral, while the mourning drum calls. | 56 BPM | about 2 min, loopable | requested |
| `mu-foundry` | Casting the Drums | Under Casting the Drums, in the foundry. | 92 BPM | about 2 min, loopable | requested |
| `mu-villages` | The Villages Answer | Under The Villages Answer, at night along the river. | 90 BPM | about 2 min, loopable | requested |
| `mu-coronation` | The Coronation at Mê Linh | Under The Coronation, the festival. | 116 BPM | about 2 min, loopable | requested |
| `mu-mavien` | Mã Viện Returns | Battle loop for the hold-the-line chapter, at dusk. | 100 BPM | 16 bars = 38.40 s | requested |
| `mu-anthem` | Song of the Two Queens (vocal song) | Trailer and end credits. | 84 BPM | about 3 min 30 s | requested |

## mu-title · Trống Đồng (title theme)

Title screen and chapter select, looping.

- **Tempo / key:** 72 BPM, D minor pentatonic (D–F–G–A–C)
- **Length:** about 90 s, loopable
- **Loop:** loop the whole track; ends where it began
- **Shape:** Solo sáo trúc states the main theme over slow đàn tranh arpeggios; a soft bronze gong marks each phrase; a woman's voice hums the theme back, quan họ style; it returns to the flute alone.
- **File:** `bronzedrum/game/assets/music/mu-title.mp3`
- **Style tags:** `vietnamese traditional, sao truc bamboo flute, dan tranh zither, bronze gong, quan ho female voice, slow, intimate, folkloric, 72 bpm`
- **Prompt:** A slow, intimate title theme for a Vietnamese folk-epic game. A bamboo flute (sáo trúc) plays a proud but tender pentatonic melody over gently rippling 16-string zither (đàn tranh) arpeggios. A soft bronze gong rings at the start of each phrase. Halfway through, a solo female voice hums the melody back in the style of quan họ folk singing, then the flute returns alone. Warm, candlelit, like a story about to be told. 72 BPM, D minor pentatonic, acoustic, no drums.

## mu-garden · The Garden at Mê Linh (chapter 1)

Chapter 1 battle loop under the player's drumming.

- **Tempo / key:** 92 BPM, G major pentatonic
- **Length:** 16 bars = 41.74 s
- **Loop:** 16 bars from 0.000 s; loops at 41.739 s
- **Shape:** Bars 1–8: đàn tranh ostinato on every beat, sáo trúc phrases answering in the gaps. Bars 9–16: đàn bầu takes the tune, playful, bending notes (Nhị's theme).
- **File:** `bronzedrum/game/assets/music/mu-garden.mp3`
- **Style tags:** `vietnamese folk, dan tranh, sao truc, dan bau, playful, light, 92 bpm, 4/4, no drums, game loop`
- **Prompt:** A light, playful loop for the training chapter of a rhythm game set in an ancient Vietnamese lord's garden at dawn. Exactly 92 BPM in 4/4, 16 bars, seamless loop, starting on the downbeat. A clear zither (đàn tranh) ostinato marks every beat, the bamboo flute answers in the gaps, and in the second half the monochord (đàn bầu) plays a cheeky, bending melody, the younger sister's theme. Bright, green, morning birds in spirit. No drums or bass on the beat: the player plays a bronze drum on top.

## mu-garden-wake · The Garden at Mê Linh: the drum wakes

Layer on top of mu-garden while the drum is awake.

- **Tempo / key:** 92 BPM, G major pentatonic
- **Length:** 16 bars = 41.74 s
- **Loop:** same length and bar lines as mu-garden
- **Shape:** Adds a second zither in counterpoint, a high flute descant and two women's voices trading short calls (quan họ call-and-response), plus small bronze bells on beats 2 and 4.
- **File:** `bronzedrum/game/assets/music/mu-garden-wake.mp3`
- **Style tags:** `vietnamese folk, quan ho call and response, bronze bells, flute descant, joyful, 92 bpm, layer`
- **Prompt:** An extra layer for the training-chapter loop, same tempo (92 BPM), key (G major pentatonic) and 16-bar length, to play on top when the player's drum chain 'wakes'. Two women's voices trade short joyful calls in quan họ style, a high bamboo-flute descant soars, a second zither adds counterpoint, small bronze bells ring on beats 2 and 4. Sounds complete alone, fits exactly over the base. No low percussion.

## mu-river · The Outpost on the Hát River (chapter 2)

Chapter 2 battle loop.

- **Tempo / key:** 96 BPM, A minor pentatonic
- **Length:** 16 bars = 40.00 s
- **Loop:** 16 bars from 0.000 s; loops at 40.000 s
- **Shape:** A tense đàn nguyệt ostinato in eighth notes; đàn nhị carries a determined melody; a low bowed drone; a bronze gong every 4 bars.
- **File:** `bronzedrum/game/assets/music/mu-river.mp3`
- **Style tags:** `vietnamese traditional, dan nguyet lute ostinato, dan nhi fiddle, tense, determined, river battle, 96 bpm, no drums`
- **Prompt:** A tense, determined battle loop for a rhythm game: an army of ancient Vietnamese women advances on an enemy outpost by a river. Exactly 96 BPM in 4/4, 16 bars, seamless loop from the downbeat. A moon lute (đàn nguyệt) plays a driving eighth-note ostinato, a two-string fiddle (đàn nhị) carries a resolute melody, a low drone underneath, a bronze gong every four bars. Wind and water in the colour. No drum kit, no percussion on the beat: the player drums.

## mu-river-wake · The Hát River: the drum wakes

Layer on top of mu-river while the drum is awake.

- **Tempo / key:** 96 BPM, A minor pentatonic
- **Length:** 16 bars = 40.00 s
- **Loop:** same length and bar lines as mu-river
- **Shape:** Adds a women's chorus in unison chant on vocables, đàn bầu answering the fiddle, and ringing bronze bells.
- **File:** `bronzedrum/game/assets/music/mu-river-wake.mp3`
- **Style tags:** `vietnamese, women's chorus chant, dan bau, bronze bells, rising courage, 96 bpm, layer`
- **Prompt:** An extra layer for the river-battle loop, same tempo (96 BPM), key (A minor pentatonic) and 16-bar length. A chorus of women chants in unison on wordless vocables (hò, ơi), the monochord (đàn bầu) answers the fiddle line, bronze bells ring out. Courage rising. Fits exactly over the base, sounds complete alone, no low percussion.

## mu-luylau · The Citadel at Luy Lâu (chapter 3)

Chapter 3 battle loop, at night.

- **Tempo / key:** 100 BPM, D minor pentatonic
- **Length:** 16 bars = 38.40 s
- **Loop:** 16 bars from 0.000 s; loops at 38.400 s
- **Shape:** Majestic and dark: low bronze gongs in a slow pattern, đàn tranh tremolo, a sáo trúc theme that recalls the title, a low women's choir on long notes.
- **File:** `bronzedrum/game/assets/music/mu-luylau.mp3`
- **Style tags:** `vietnamese epic folk, bronze gongs, dan tranh tremolo, bamboo flute, low female choir, night, majestic, 100 bpm`
- **Prompt:** The climactic night battle loop of a game about the Trưng sisters storming a walled citadel on war elephants. Exactly 100 BPM in 4/4, 16 bars, seamless loop from the downbeat. Low bronze gongs in a slow, heavy pattern (not on every beat), a trembling zither (đàn tranh) tremolo, the bamboo flute playing the main title melody in a darker, nobler form, and a low women's choir on long notes. Moonlit, majestic, a little ominous. No drum kit, no kick: the player drums on top.

## mu-luylau-wake · Luy Lâu: the drum wakes

Layer on top of mu-luylau while the drum is awake.

- **Tempo / key:** 100 BPM, D minor pentatonic
- **Length:** 16 bars = 38.40 s
- **Loop:** same length and bar lines as mu-luylau
- **Shape:** Full chorus in call-and-response, đàn bầu soaring above, bright bronze bells: triumph.
- **File:** `bronzedrum/game/assets/music/mu-luylau-wake.mp3`
- **Style tags:** `vietnamese epic folk, full women's chorus call and response, dan bau soaring, bronze bells, triumphant, 100 bpm, layer`
- **Prompt:** An extra layer for the citadel-battle loop, same tempo (100 BPM), key (D minor pentatonic) and 16-bar length. A full women's chorus in call and response, the monochord (đàn bầu) soaring over it with long bends, bright bronze bells. Triumphant and fierce. Fits exactly over the base, sounds complete alone, no low percussion.

## mu-sisters · Two Sisters (story theme)

Story scenes and the training years between chapters.

- **Tempo / key:** 66 BPM, C major pentatonic
- **Length:** about 2 min
- **Loop:** not looped
- **Shape:** Two themes that meet: Trắc's on đàn tranh, steady and dignified; Nhị's on sáo trúc, quick and free. They alternate, then play together.
- **File:** `bronzedrum/game/assets/music/mu-sisters.mp3`
- **Style tags:** `vietnamese traditional duet, dan tranh and sao truc, tender, two themes intertwining, 66 bpm`
- **Prompt:** A tender piece about two sisters with different temperaments. The 16-string zither (đàn tranh) plays the elder sister's theme: steady, dignified, measured. The bamboo flute (sáo trúc) plays the younger sister's theme: quick, playful, free. They take turns, tease each other, then finally play together in harmony. Intimate, warm, a little bittersweet. 66 BPM, acoustic, no percussion.

## mu-elegy · The Drums Are Melted (ending)

The ending, after the last battle.

- **Tempo / key:** 58 BPM, A minor pentatonic
- **Length:** about 3 min
- **Loop:** not looped
- **Shape:** Đàn bầu alone, then a quan họ duet lament (vocables only), a single bronze bell at the end, letting the ring die out.
- **File:** `bronzedrum/game/assets/music/mu-elegy.mp3`
- **Style tags:** `vietnamese lament, solo dan bau monochord, quan ho female duet, mournful, sparse, bronze bell ending`
- **Prompt:** A sparse, mournful ending piece. The monochord (đàn bầu) plays alone, bending each note like a voice holding back tears. Two women's voices enter in the quan họ folk style, singing a lament on wordless vocables (à ơi). At the end a single bronze bell is struck and left to ring until silence. It should feel like dawn on a river after a loss. Very slow, about 58 BPM, no percussion.

## mu-victory · Victory sting

Chapter won.

- **Tempo / key:** 100 BPM, D major pentatonic
- **Length:** about 8 s
- **Loop:** not looped
- **Shape:** A rising flute run and zither glissando onto one held chord, a bronze gong at the end.
- **File:** `bronzedrum/game/assets/music/mu-victory.mp3`
- **Style tags:** `short victory sting, vietnamese, sao truc run, dan tranh glissando, bronze gong, 8 seconds`
- **Prompt:** An 8-second victory fanfare in Vietnamese folk style: a quick rising bamboo-flute run and a sweeping zither glissando land on one bright held chord, closing with a ringing bronze gong. Joyful, no drum kit.

## mu-defeat · Defeat sting

Chapter lost.

- **Tempo / key:** 60 BPM, A minor pentatonic
- **Length:** about 8 s
- **Loop:** not looped
- **Shape:** A falling đàn bầu phrase over a low drone, ending unresolved.
- **File:** `bronzedrum/game/assets/music/mu-defeat.mp3`
- **Style tags:** `short defeat sting, vietnamese, dan bau falling phrase, low drone, sorrowful, 8 seconds`
- **Prompt:** An 8-second defeat sting: the monochord (đàn bầu) plays a single falling, bending phrase over a low drone, ending unresolved. Sorrowful but not hopeless. No percussion.

## mu-oath · The Oath (funeral)

Under The Oath, the father's funeral, while the mourning drum calls.

- **Tempo / key:** 56 BPM, A minor pentatonic
- **Length:** about 2 min, loopable
- **Loop:** loop the whole track
- **Shape:** Đàn bầu alone over a low drone and a soft bronze bell every few bars; a single woman's voice hums a lament in the second half. Very sparse, leaving room for the slow mourning drum and the player's answers.
- **File:** `bronzedrum/game/assets/music/mu-oath.mp3`
- **Style tags:** `vietnamese funeral lament, dan bau, low drone, soft bronze bell, female humming, sparse, slow, 56 bpm`
- **Prompt:** A sparse funeral piece for a Vietnamese lord, ancient times. The monochord (đàn bầu) bends slow, grieving phrases over a low drone, a soft bronze bell rings every few bars, and in the second half a single woman's voice hums a lament. About 56 BPM, very slow and quiet, lots of space: a mourning drum and the player's drumming sit on top. No other percussion.

## mu-foundry · Casting the Drums

Under Casting the Drums, in the foundry.

- **Tempo / key:** 92 BPM, D minor pentatonic
- **Length:** about 2 min, loopable
- **Loop:** loop the whole track
- **Shape:** A low steady bowed drone like the furnace's breath, a đàn nguyệt figure, metallic shimmer from struck bronze bars; work-song humming from men's and women's voices.
- **File:** `bronzedrum/game/assets/music/mu-foundry.mp3`
- **Style tags:** `vietnamese work song, foundry, low drone, dan nguyet, metallic bronze shimmer, humming voices, steady, 92 bpm`
- **Prompt:** Music for a night in an ancient bronze foundry. A low bowed drone breathes like the furnace, a moon lute (đàn nguyệt) plays a patient repeating figure, struck bronze bars add a metallic shimmer, and men's and women's voices hum a work song. Steady and warm, about 92 BPM, but with no drums on the beat: the player keeps the hammer rhythm on top.

## mu-villages · The Villages Answer

Under The Villages Answer, at night along the river.

- **Tempo / key:** 90 BPM, G major pentatonic
- **Length:** about 2 min, loopable
- **Loop:** loop the whole track
- **Shape:** Night insects and water in the colour; sáo trúc phrases calling from far away and answered by another flute nearer; soft đàn tranh harmonics.
- **File:** `bronzedrum/game/assets/music/mu-villages.mp3`
- **Style tags:** `vietnamese night music, two bamboo flutes call and answer, dan tranh harmonics, river at night, hopeful, sparse`
- **Prompt:** Night along the Red River. One bamboo flute (sáo trúc) calls a short phrase from far away and a second flute, nearer, answers it, again and again, like villages calling to each other; soft zither (đàn tranh) harmonics shimmer underneath. Hopeful and sparse, leaving space for drum calls and answers. No percussion.

## mu-coronation · The Coronation at Mê Linh

Under The Coronation, the festival.

- **Tempo / key:** 116 BPM, D major pentatonic
- **Length:** about 2 min, loopable
- **Loop:** loop the whole track
- **Shape:** A festive ensemble: đàn tranh, sáo trúc, đàn nguyệt and small gongs in a bright dance; a women's chorus in quan họ style on the refrain.
- **File:** `bronzedrum/game/assets/music/mu-coronation.mp3`
- **Style tags:** `vietnamese festival music, joyful, dan tranh, sao truc, dan nguyet, small gongs, quan ho chorus, 116 bpm`
- **Prompt:** A joyful festival piece for the crowning of two queens in ancient Vietnam. Zither, bamboo flute and moon lute play a bright dance tune, small gongs shimmer, and a women's chorus sings the refrain on vocables in the quan họ style. About 116 BPM, light and celebratory, without heavy drums: festival drummers and the player drum on top.

## mu-mavien · Mã Viện Returns

Battle loop for the hold-the-line chapter, at dusk.

- **Tempo / key:** 100 BPM, E minor pentatonic
- **Length:** 16 bars = 38.40 s
- **Loop:** 16 bars from 0.000 s; loops at 38.400 s
- **Shape:** Grave and urgent: a low brass-like bronze drone, a đàn nhị lament over tense đàn nguyệt ostinato, distant war horns; the title theme fragmented.
- **File:** `bronzedrum/game/assets/music/mu-mavien.mp3`
- **Style tags:** `vietnamese battle music, grave, urgent, dan nhi lament, dan nguyet ostinato, bronze drone, distant horns, 100 bpm`
- **Prompt:** A grave, urgent loop for a last stand at a river ford as a great Han army arrives. A low bronze drone, a tense moon-lute (đàn nguyệt) ostinato, a two-string fiddle (đàn nhị) playing a broken, mournful form of the main theme, distant war horns. Exactly 100 BPM in 4/4, 16 bars, seamless loop from the downbeat. No drum kit or kick: the player drums.

## mu-anthem · Song of the Two Queens (vocal song)

Trailer and end credits.

- **Tempo / key:** 84 BPM, D minor pentatonic
- **Length:** about 3 min 30 s
- **Loop:** not looped
- **Shape:** Verse (solo voice and đàn tranh), chorus (two voices, full ensemble with bronze drums), bridge (đàn bầu solo), final chorus, quiet outro on the title theme.
- **File:** `bronzedrum/game/assets/music/mu-anthem.mp3`
- **Style tags:** `vietnamese folk ballad, female duet quan ho influenced, dan tranh, dan bau, bronze drums in chorus, anthemic but intimate, 84 bpm`
- **Prompt:** A folk ballad in Vietnamese about the Trưng sisters: two queens who rode elephants and beat the bronze drum so the villages would rise. Verses sung by one woman over zither, choruses by two women in close quan họ-style harmony with the full ensemble and deep bronze drums, a monochord (đàn bầu) solo bridge, a final chorus, and an outro that returns to the title theme on bamboo flute. 84 BPM. Lyrics: to be written with the author; until then, sing on vocables.
