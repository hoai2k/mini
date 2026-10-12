# Half-Blood Quests: music requests

Prompts for generating the game's music with a text-to-music tool (Suno,
Udio, Stable Audio, ElevenLabs Music and so on). Until a track arrives, the
game keeps playing its own generated music for that place.

## How to deliver

- Save each track as `<id>.mp3` (or `.ogg`), using the **id** in its heading,
  and drop it in [`../intake/`](../intake/). On integration it moves to
  `game/assets/music/` and replaces the generated music for that place.
  Descriptive file names (like "Camp Half-Blood.mp3" in the first batch) are
  fine too, as long as it's clear which track is which.
- **Instrumental only.** Every prompt below asks for no vocals, apart from the
  wordless choir where it says so. Add "instrumental" if the tool has a switch
  for it.
- **Loops:** tracks marked *loop* should end where they began (same key,
  tempo and energy) so the game can repeat them. Generate 2–3 minutes. A fade-out
  at the end is fine. Stingers and cutscene tracks are short and don't
  loop; a cutscene track that runs longer than its cutscene fades out.
- **Don't name the books, the films or composers in the prompts.** Most tools
  refuse or water down prompts with copyrighted titles or real artists. The
  prompts describe the sound instead.

## Status

| Delivered (see [music-request-history.md](music-request-history.md)) | Next, in order of impact | Later |
| --- | --- | --- |
| `title`, `camp`, `museum`, `storm`, `boss`, `minigame`, `oracle`, `woods`, `highway`, `garden`, `manhattan`, `road-west`, `otherworld`; stingers `victory`, `defeat`, `prophecy-line`, `claimed` (made with ElevenLabs); the crickets ambience | Nothing urgent: every place has fitting music. Own tracks, if wanted: `cutscene-journey`, `cutscene-storm`, `cutscene-camp`, `arch` | `waterland`, `casino`, `desert`, `underworld`, `beach`, `olympus`, `boss-god`, `boss-fury`, `boss-minotaur`, `campfire` |

Every place now has fitting music: `road-west` plays at the Arch, Waterland,
the desert, the beach and in the bus-ride cutscene; `otherworld` in the
Lotus Casino, the Underworld, Olympus and the storm and Big House
cutscenes. Any track below that gets delivered takes over its place.

## The sound of the game

The game is about modern American kids who find out the Greek myths are real.
Its music mixes the two:

- **Ancient Greece:** lyre and kithara (plucked harp-like strings), bouzouki,
  the aulos (a reedy double pipe; a duduk or oboe stands in), frame drums,
  bronze bells and a wordless choir in old modes (Dorian, Phrygian, Mixolydian).
- **Modern adventure:** a full orchestra for the big moments, plus driving
  drums, electric bass and an overdriven electric guitar for fights. Percy is
  a 12-year-old with ADHD who smart-mouths monsters, and the music can be
  cheeky too.
- **Blocky adventure-game warmth:** like the soundtracks of block-built
  dungeon crawlers. Melodic, readable and not too dense, so it stays pleasant
  through hours of play and sound effects cut through it.

A style line to start any prompt with, if the tool takes one:

> Epic fantasy adventure game score, ancient Greek instruments (lyre, bouzouki,
> aulos, frame drum) blended with modern orchestra, heroic and playful,
> instrumental

## Tracks



### Title and camp

**`campfire` — Camp at night, the sing-along fire** *(loop, 72 BPM)*
> Cosy campfire music, instrumental. Solo nylon-string guitar and lyre, a soft
> bouzouki tremolo, crickets, low warm cello, gentle frame drum heartbeat. Warm,
> nostalgic, a little magical, embers drifting up to the stars. Loopable.

### The opening (new: a new game now starts in Manhattan)

A new game begins on the morning of the field trip: Percy walks through
Manhattan to the school bus, fighting off sewer rats, and short cutscenes
link the city, the museum, the storm and the arrival at camp.


**`cutscene-journey` — Cutscene: the bus ride to the museum** *(60–90 s, no
loop needed)*
> Light travelling music for a school bus rolling up Central Park West,
> instrumental. Warm strings and woodwinds, a gentle rhythmic ostinato like
> wheels on the road, a clarinet and lyre trading a curious melody, then a
> slow swell with a single low aulos note as the grand museum steps appear.
> Ends on a held, slightly ominous chord.

**`cutscene-storm` — Cutscene: Montauk and the drive through the storm**
*(60–90 s)*
> Tense storytelling music for a stormy night at a beach cabin, a friend at
> the door with a secret, and a frantic drive through the rain, instrumental.
> Starts with quiet piano and rain, rising low strings and timpani rumbles,
> a racing string ostinato and horns for the drive, distant thunder; ends
> abruptly on a dark, unresolved chord.

**`cutscene-camp` — Cutscene: waking at the Big House** *(45–75 s)*
> Gentle, wondrous awakening music for a boy waking on a farmhouse porch at a
> magical summer camp, instrumental. Soft harp and lyre arpeggios, warm
> strings, birdsong, a hopeful horn statement of the main six-note theme,
> a glimpse of bouzouki camp colour at the end, bright and welcoming.

### Book 1 chapters

**`arch` — Ch 6, The Gateway Arch (Chimera)** *(loop, 110 BPM)*
> Vertigo action music high above a river city, instrumental. Shimmering
> metallic percussion, rising string arpeggios, a heroic horn line, roaring
> low brass and fiery timpani hits, a sense of height and wind. Loopable.

**`waterland` — Ch 7, Waterland (Hephaestus's trap)** *(loop, 100 BPM)*
> Abandoned water park music, instrumental. Rusty clockwork ticking, clanking
> metal percussion, dripping water, a broken carnival organ melody, eerie
> bronze-spider clicking rhythms, building mechanical suspense. Loopable.

**`casino` — Ch 8, The Lotus Hotel and Casino** *(loop, 96 BPM)*
> Hypnotic, too-perfect lounge music, instrumental. Smooth lounge jazz, vintage
> electric piano and vibraphone, lush strings, slot-machine chimes, slowly
> warping and detuning as time slips away, dreamy and dangerously relaxing.
> Loopable.

**`desert` — Ch 9, Crusty's Water Bed Palace** *(loop, 92 BPM)*
> Desert-highway western music with menace, instrumental. Twangy baritone
> guitar, a lonely harmonica, a cheesy salesman muzak melody on an organ that
> turns sinister, low brass, heat shimmer. Loopable.

**`underworld` — Ch 10, DOA Recording Studios and the Underworld** *(loop, 70 BPM)*
> Underworld descent music, instrumental. Deep sub-bass drone, slow funeral
> frame drum, a ghostly wordless choir, a sad aulos melody, distant howls, the
> River Styx lapping, cold and enormous but beautiful. Phrygian mode. Loopable.

**`beach` — Ch 11, The God of War on Santa Monica beach** *(loop, 140 BPM)*
> Epic rock-orchestral duel music, instrumental. Overdriven electric guitar
> riff, pounding drums, motorcycle-engine bass, full orchestra and war brass,
> crashing surf, a heroic sea motif on horns answering the guitar. Fierce,
> unstoppable, sunset showdown. Loopable.

**`olympus` — Ch 12, The 600th floor, Mount Olympus** *(loop, 88 BPM)*
> Majestic divine palace music, instrumental. Golden harp and lyre arpeggios,
> radiant strings, a wordless choir, celestial bells, a noble horn theme, clouds
> and marble halls, awe and danger at once. Loopable.

### Bosses and moments

**`boss-fury`, `boss-minotaur`, `boss-god`** *(optional loops; boss-fury for Alecto and the three Furies, boss-minotaur for the Minotaur and Cerberus, boss-god for Ares and Luke's final duel)*: variations on
`boss` with a creature-specific colour:
- **Fury:** screeching high strings, bat-wing tremolo, whip-crack percussion.
- **Minotaur:** stomping low brass, bull-snort bass, a labyrinth-like
  repeating figure.
- **God (Ares, Kronos's servants):** an electric guitar duel against full
  orchestra and choir.

## Which tracks matter most

1. **Delivered:** `title`, `camp`, `museum`, `storm`, `boss`, `minigame`,
   `oracle`, `woods`, `highway`, `garden`, `manhattan`, `road-west`,
   `otherworld`. Thank you!
2. **Every gap is filled** (`road-west` and `otherworld` delivered). What
   follows is optional polish.
3. **Then, each place's own track, as players reach them:** `cutscene-journey`,
   `cutscene-storm`, `cutscene-camp`, `arch`, `waterland`, `casino` (the Lotus escape,
   where the music itself should feel like a trap), `desert`, `underworld`,
   `beach`, `olympus`.
4. **Polish:** `boss-god` (Ares and the final duel deserve their own),
   `boss-fury`, `boss-minotaur`, and `campfire` for camp at night.

The stingers are already made with ElevenLabs
(`design/source/build_stingers.py`); new short stingers can be added there.
