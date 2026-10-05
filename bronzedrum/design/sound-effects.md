# Bronze Drum: sound effects

Every sound effect in the game, generated with ElevenLabs' sound-effects model from the prompts below. Generated from `source/build_audio.py`; edit the data there. `build_audio.py --generate` makes any effect whose file is missing, and `--force <id>` remakes one. The key is read from `ELEVENLABS_API_KEY` (or `~/.config/elevenlabs.key`) and never stored in the repository.

Processing: hits are trimmed so the sound starts on its transient (the drum strokes must land exactly when the player presses), one-shots get a short fade-out, every file is peak-normalised to -1 dBFS, and the game balances them with the per-sound gain. Effects with several variants are picked at random so repeated strokes do not sound mechanical.

Sound direction: real, acoustic and close — bronze, wood, bamboo, water, paper, voices. No synth tones, no music in the effects. Hits are paper tearing, never gore.

**35 of 36 files in use.**

Each generated file was checked by measuring its length, peak, level over time (50 ms windows) and the balance of energy below 200 Hz and above 2 kHz: a drum stroke must start on its loudest moment and be one stroke, a rim click must be bright and short. Takes that failed are kept out of the game:

- `sfx/drum-tung-2.mp3`: eight takes, none both a single stroke and deep (more energy under 200 Hz than over 2 kHz); the model drifts to a bright metallic hit, and two good deep strokes give enough variety.

## The drum

| Id | Use | Length | Files | Prompt |
| --- | --- | ---: | --- | --- |
| `drum-tung` | Trưng Trắc's centre stroke (tùng), played on every left-hand input. (hit) | 2.0 s | 2/3 | One strong stroke with a padded wooden beater on the centre of a large ancient Vietnamese bronze kettle drum: a deep round boom followed by a shimmering metallic bronze ring. A single hit, close-miked, dry room, no music. |
| `drum-cac` | Trưng Nhị's rim stroke (cắc), played on every right-hand input and flourish. (hit) | 0.7 s | 3/3 | One sharp stroke of a hardwood stick on the rim of a bronze kettle drum: a bright, dry, metallic click with a short ring. A single hit, close-miked, no music. |
| `drum-wake` | The drum wakes: four commands chained. (sting) | 4.0 s | 1/1 | A huge bronze gong struck softly and swelling: a rising shimmering bronze resonance that blooms and slowly fades, ceremonial and awe-struck. |
| `stumble` | A stroke during the army's answer, or off the beat. (hit) | 0.5 s | 1/1 | A dull, slightly off-key wooden knock, clumsy and muted, very short. |

## The army answers

| Id | Use | Length | Files | Prompt |
| --- | --- | ---: | --- | --- |
| `call` | Beats 1 and 3 of every answer, under the command's own sound. (hit) | 0.9 s | 3/3 | A group of women warriors shouting one short unison battle cry, 'Hô!', outdoors, fierce and together, a single shout. |
| `cmd-march` | Tiến (march) answer. (one-shot) | 2.5 s | 1/1 | A company of barefoot soldiers marching in step through the shallow water of a rice paddy: rhythmic splashing and squelching footsteps. |
| `cmd-strike` | Đánh (strike) answer. (one-shot) | 2.5 s | 1/1 | Bronze-tipped spears thrusting and clashing against wooden shields and armour, a short fierce skirmish of a small group, no voices. |
| `cmd-shield` | The guard: shields thrown up against a blow (A / Space). (one-shot) | 1.5 s | 1/1 | Many round wooden and hide shields raised together and locked with one heavy hollow thump. |
| `cmd-rally` | The women cheer when the drum wakes (four commands chained). (one-shot) | 2.5 s | 1/1 | A group of women ululating and cheering together outdoors, a rallying cry rising and falling. |
| `cmd-charge` | The elephant charge: a strike on a waking drum in chapter 3. (one-shot) | 3.0 s | 1/1 | A war elephant trumpets loudly, then charges: heavy thundering footsteps that shake the ground. |

## Battle

| Id | Use | Length | Files | Prompt |
| --- | --- | ---: | --- | --- |
| `volley` | The archers shoot on a strike. (one-shot) | 1.5 s | 1/1 | A volley of arrows released from several bows at once, whooshing away through the air. |
| `bolts` | Han crossbows and the fort fire. (one-shot) | 1.5 s | 1/1 | Several crossbow bolts fired and thudding into wooden shields, quick hollow thunks. |
| `hit-paper` | Every hit: in this game wounds are paper tearing. (hit) | 0.6 s | 3/3 | A sharp quick tear of thick handmade paper, a single rip. |
| `hit-straw` | Hits on the straw targets in chapter 1. (hit) | 0.7 s | 1/1 | A spear stabbing into a bundled straw training dummy: a dry rustling thud. |
| `defeat-han` | A Han soldier falls. (one-shot) | 1.2 s | 1/1 | A soldier's lamellar armour and halberd clattering to the ground, metal plates rattling. |
| `fort-break` | The fort falls. (one-shot) | 3.0 s | 1/1 | A wooden palisade of sharpened stakes splintering and collapsing, a long timber crash. |
| `trample` | The elephant charge lands. (hit) | 1.2 s | 1/1 | A heavy elephant stomp crushing wood, a deep ground-shaking impact. |
| `wound` | The army is hit while its shields are down. (one-shot) | 1.0 s | 1/1 | Arrows striking wooden shields and a few soft pained gasps from a group of women. |
| `blocked` | The army is hit with shields raised. (one-shot) | 1.0 s | 1/1 | Arrows glancing off raised bronze-studded shields, light metallic ticks. |

## Interface

| Id | Use | Length | Files | Prompt |
| --- | --- | ---: | --- | --- |
| `ui-move` | Moving focus in menus. (hit) | 0.5 s | 1/1 | A soft rustle of a single sheet of rice paper being turned, very short and quiet. |
| `ui-confirm` | Choosing a menu item. (hit) | 0.5 s | 1/1 | A small hardwood clapper knock, clean and single, like a temple woodblock. |
| `ui-back` | Closing a menu or dialog. (hit) | 0.5 s | 1/1 | A sheet of paper sliding softly across a wooden table, short. |
| `ui-start` | Press Start. (sting) | 2.5 s | 1/1 | A single resonant strike on a small bronze gong, ringing out. |

## Stings

| Id | Use | Length | Files | Prompt |
| --- | --- | ---: | --- | --- |
| `victory` | A chapter is won. (sting) | 4.5 s | 1/1 | A triumphant flourish on large bronze drums and gongs, building quickly and ending on one ringing gong stroke. |
| `defeat` | A chapter is lost. (sting) | 4.5 s | 1/1 | A low bronze gong struck softly once, fading slowly with sorrow, a breath of wind after. |

## Ambience

| Id | Use | Length | Files | Prompt |
| --- | --- | ---: | --- | --- |
| `amb-garden` | Chapter 1 bed, looped. (loop) | 20.0 s | 1/1 | Peaceful dawn in a northern Vietnamese garden by a lotus pond: songbirds, gentle trickling water, a distant rooster, a light breeze through bamboo. Continuous, no music. |
| `amb-river` | Chapter 2 bed, looped. (loop) | 20.0 s | 1/1 | Daytime on the bank of a wide slow river: flowing water, wind in tall reeds, distant herons and birds. Continuous, no music, no drums. |
| `amb-night` | Chapter 3 bed, looped. (loop) | 20.0 s | 1/1 | Night in the countryside outside a walled town: crickets, frogs croaking in flooded rice paddies, distant torches crackling, a faint wind. Continuous, no music. |
