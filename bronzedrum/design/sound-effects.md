# Bronze Drum: sound effects

Every sound effect in the game, generated with ElevenLabs' sound-effects model from the prompts below. Generated from `source/build_audio.py`; edit the data there. `build_audio.py --generate` makes any effect whose file is missing, and `--force <id>` remakes one. The key is read from `ELEVENLABS_API_KEY` (or `~/.config/elevenlabs.key`) and never stored in the repository.

Processing: hits are trimmed so the sound starts on its transient (the drum strokes must land exactly when the player presses), one-shots get a short fade-out, every file is peak-normalised to -1 dBFS, and the game balances them with the per-sound gain. Effects with several variants are picked at random so repeated strokes do not sound mechanical.

Sound direction: real, acoustic and close — bronze, wood, bamboo, water, paper, voices. No synth tones, no music in the effects. Hits are paper tearing, never gore.

**47 of 48 files in use.**

Each generated file was checked by measuring its length, peak, level over time (50 ms windows) and the balance of energy below 200 Hz and above 2 kHz: a drum stroke must start on its loudest moment and be one stroke, a rim click must be bright and short. Takes that failed are kept out of the game:

- `sfx/drum-tung-2.mp3`: eight takes, none both a single stroke and deep (more energy under 200 Hz than over 2 kHz); the model drifts to a bright metallic hit, and two good deep strokes give enough variety.

## The drum

| Id | Use | Length | Files | Prompt |
| --- | --- | ---: | --- | --- |
| `drum-tung` | Trưng Trắc's centre stroke (tùng), played on every left-hand input. (hit) | 2.0 s | 2/3 | One strong stroke with a padded wooden beater on the centre of a large ancient Vietnamese bronze kettle drum: a deep round boom followed by a shimmering metallic bronze ring. A single hit, close-miked, dry room, no music. |
| `drum-cac` | Trưng Nhị's rim stroke (cắc), played on every right-hand input and flourish. (hit) | 0.7 s | 3/3 | One sharp stroke of a hardwood stick on the rim of a bronze kettle drum: a bright, dry, metallic click with a short ring. A single hit, close-miked, no music. |
| `drum-chau` | The shield: a stroke on the big hide barrel drum beside the bronze drum, under the shields locking (A / Space / the Shield drum). (hit) | 1.2 s | 2/2 | One heavy stroke of a padded wooden beater on the centre of a large Vietnamese barrel drum (trống chầu) with a thick buffalo-hide head: a deep, warm, dry thud with a short low boom, no metal ring. A single hit, close-miked, dry room, no music. |
| `drum-mo` | Reset the rhythm: a knock on the wooden slit drum (Y / R / the Reset drum). (hit) | 0.5 s | 2/2 | One knock of a wooden mallet on a hollow Vietnamese wooden slit drum (mõ, a temple block): a round, dry, woody 'tok' with a tiny hollow resonance. A single hit, close-miked, no music. |
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

## Story chapters

| Id | Use | Length | Files | Prompt |
| --- | --- | ---: | --- | --- |
| `pour` | Casting the Drums: a steady phrase pours bronze. (one-shot) | 2.5 s | 1/1 | Molten bronze poured from a clay crucible into a mould: a thick glugging pour with hissing steam and crackling. |
| `crack` | Casting the Drums: a phrase that drifts cracks the mould. (one-shot) | 1.5 s | 1/1 | A clay casting mould cracking from the heat: one sharp crack, then crumbling pieces and a hiss of steam. |
| `lantern` | The Oath and The Villages Answer: an answered call lights incense or lanterns. (one-shot) | 1.5 s | 1/1 | A paper lantern being lit at night: a soft whoosh of flame catching, then one small clear bronze bell. |
| `crowd-cheer` | The Coronation: the crowd answers each rhythm. (one-shot) | 3.0 s | 1/1 | A festival crowd in an ancient village square cheering and clapping with joy, a few small gongs ringing. |
| `han-horn` | Mã Viện Returns: a new Han column arrives. (one-shot) | 3.0 s | 1/1 | Several ancient war horns made of buffalo horn blown together in the distance across a river, a low ominous call that swells and fades, an army approaching. |

## Ambience

| Id | Use | Length | Files | Prompt |
| --- | --- | ---: | --- | --- |
| `amb-garden` | Chapter 1 bed, looped. (loop) | 20.0 s | 1/1 | Peaceful dawn in a northern Vietnamese garden by a lotus pond: songbirds, gentle trickling water, a distant rooster, a light breeze through bamboo. Continuous, no music. |
| `amb-river` | Chapter 2 bed, looped. (loop) | 20.0 s | 1/1 | Daytime on the bank of a wide slow river: flowing water, wind in tall reeds, distant herons and birds. Continuous, no music, no drums. |
| `amb-foundry` | Casting the Drums bed, looped. Chosen from six takes as the least tonal (the old take had a steady hum that read as a machine); looped with a 3 s crossfade and raised 7 dB under a soft limiter. (loop) | 20.0 s | 1/1 | Blacksmith's forge ambience recorded outdoors, traditional and hand-powered: crackling coal fire, slow leather bellows whooshing, hot metal hissing now and then, crickets far off. Natural, no machinery, no electrical hum, no music. |
| `amb-mourning` | The Oath (chapter 2) bed, looped. Chosen from six takes as the least synthetic (most noise-like spectrum); raised 10 dB under a soft limiter to sit with the other beds. (loop) | 20.0 s | 1/1 | Real outdoor ambience recording, evening in the countryside: a gentle crackling campfire close by, soft crickets and cicadas fading at dusk, occasional distant bird. Natural and calm, no music, no electronic sounds. |
| `breeze` | The Oath: the breeze stirred by holding A or Y, faded with the wind. (loop) | 8.0 s | 1/1 | A soft, warm breeze blowing in gentle gusts through an open courtyard, rustling leaves lightly. Continuous, airy and natural, no whistling, no howling, no music. |
| `amb-night` | Chapter 3 bed, looped. (loop) | 20.0 s | 1/1 | Night in the countryside outside a walled town: crickets, frogs croaking in flooded rice paddies, distant torches crackling, a faint wind. Continuous, no music. |
