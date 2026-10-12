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

| Delivered (playing in the game) | Next, in order of impact | Later |
| --- | --- | --- |
| `title`, `camp`, `museum`, `storm`, `boss`, `minigame`, `oracle`, `woods`, `highway`, `garden`; stingers `victory`, `defeat`, `prophecy-line`, `claimed` (made with ElevenLabs); the crickets ambience | `manhattan`, `cutscene-journey`, `cutscene-storm`, `cutscene-camp`, `arch` | `waterland`, `casino`, `desert`, `underworld`, `beach`, `olympus`, `boss-god`, `boss-fury`, `boss-minotaur`, `campfire` |

Every place without a delivered track still plays the game's own generated
music, so nothing is silent; a delivered track simply replaces it.

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

**`title` — ✓ delivered · Title screen** *(loop, 90 BPM)*
> Heroic main theme for a Greek mythology adventure game, instrumental. Opens
> with a solo lyre playing a memorable six-note motif in D Dorian, joined by
> warm strings and French horns, then the full orchestra and a wordless choir
> lift it into a soaring sea-wave crescendo with timpani and frame drums.
> Hopeful, adventurous, a touch of mystery. Loopable.

**`camp` — ✓ delivered · Camp Half-Blood, daytime hub** *(loop, 100 BPM)*
> Cheerful summer-camp adventure music with an ancient Greek flavour,
> instrumental. Bouzouki and acoustic guitar strumming, a light lyre melody,
> pizzicato strings, hand claps and frame drum, a whistled countermelody.
> Sunny, friendly, a strawberry-field morning by the sea, relaxed but lively.
> Mixolydian mode. Loopable, no big climaxes.

**`campfire` — Camp at night, the sing-along fire** *(loop, 72 BPM)*
> Cosy campfire music, instrumental. Solo nylon-string guitar and lyre, a soft
> bouzouki tremolo, crickets, low warm cello, gentle frame drum heartbeat. Warm,
> nostalgic, a little magical, embers drifting up to the stars. Loopable.

**`oracle` — ✓ delivered · The Oracle, prophecy scrolls** *(loop, 60 BPM)*
> Eerie ancient-Greek mystery music, instrumental. Low drone, breathy aulos or
> duduk melody in Phrygian mode, distant wordless female choir, reversed
> cymbals, faint bells, green smoke and an attic full of dust. Ominous but
> quiet, a prophecy about to be spoken. Loopable.

**`minigame` — ✓ delivered · Archery range and climbing wall** *(loop, 120 BPM)*
> Upbeat sports-training montage music with a Greek twist, instrumental.
> Bouncy bouzouki riff, snappy snare and frame drum, plucked strings, brass
> stabs, playful and competitive, a hint of a camp cheer. Loopable.

### The opening (new: a new game now starts in Manhattan)

A new game begins on the morning of the field trip: Percy walks through
Manhattan to the school bus, fighting off sewer rats, and short cutscenes
link the city, the museum, the storm and the arrival at camp.

**`manhattan` — The prologue: a New York morning** *(loop, 104 BPM)*
> Bright, bustling city-morning adventure music for a kid walking to a school
> field trip, instrumental. Pizzicato strings and a walking upright bass,
> brushed snare, a cheeky clarinet melody, a distant taxi-horn-like brass
> stab, a hint of a lyre motif underneath as if something ancient is
> watching. Playful, a little mischievous, never scary. Loopable.

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

**`museum` — ✓ delivered · Ch 1, The Pre-Algebra Teacher (thick Mist)** *(loop, 84 BPM)*
> Creepy museum field-trip music, instrumental. Pizzicato strings sneaking in a
> minor key, a glockenspiel melody that sounds slightly wrong, low clarinet,
> marble echo, a distant aulos hinting that something ancient is awake.
> Suspicious, mischievous, building unease. Loopable.

**`storm` — ✓ delivered · Ch 2, Half-Blood Hill in a storm** *(loop, 130 BPM)*
> Frantic chase music in a thunderstorm, instrumental. Driving low strings
> ostinato, pounding taiko and frame drums, rain and thunder, horns crying out a
> heroic motif, a menacing bull-like brass growl underneath. Urgent, running
> uphill for your life. Loopable.

**`woods` — ✓ delivered · Ch 3, Capture the Flag in the camp woods** *(loop, 115 BPM)*
> Forest skirmish music, instrumental. Woodwinds and hunting horns, bouzouki
> riffs, war drums in the distance, a creek babbling, playful but competitive,
> teams sneaking through the trees, building toward a clash. Loopable.

**`highway` — ✓ delivered · Ch 4, The Kindly Ones on the bus** *(loop, 125 BPM)*
> Dark road-trip action music, instrumental. Rain on a highway, a driving
> electric bass and rock drum groove, screeching violins like bat wings,
> distorted guitar stabs, three-note Fury motif on low brass. Tense, rainy, New
> Jersey at night. Loopable.

**`garden` — ✓ delivered · Ch 5, Aunty Em's Garden Gnome Emporium (Medusa)** *(loop, 76 BPM)*
> Unsettling roadside-attraction music, instrumental. A sweet, old-fashioned
> waltz on a music box and accordion that keeps slipping into a minor key,
> hissing shakers like snakes, stony low piano, a cold aulos melody. Polite,
> grandmotherly and deadly. Loopable.

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

**`boss` — ✓ delivered · Boss fight (shared)** *(loop, 150 BPM)*
> Intense boss battle music for a mythological monster fight, instrumental.
> Driving orchestral ostinato, heavy taiko and frame drums, distorted guitar
> chugs, aggressive brass, a wordless choir chanting in a Greek mode, bronze
> anvil hits. Relentless, heroic, loopable without a climax at the end.

**`boss-fury`, `boss-minotaur`, `boss-god`** *(optional loops; boss-fury for Alecto and the three Furies, boss-minotaur for the Minotaur and Cerberus, boss-god for Ares and Luke's final duel)*: variations on
`boss` with a creature-specific colour:
- **Fury:** screeching high strings, bat-wing tremolo, whip-crack percussion.
- **Minotaur:** stomping low brass, bull-snort bass, a labyrinth-like
  repeating figure.
- **God (Ares, Kronos's servants):** an electric guitar duel against full
  orchestra and choir.

**`victory` — ✓ made · Chapter complete** *(stinger, 6–10 s)*
> Triumphant short fanfare, instrumental. Brass and choir on the six-note main
> theme, lyre flourish, timpani roll, ends on a bright major chord.

**`defeat` — ✓ made · All heroes down** *(stinger, 5–8 s)*
> Short somber sting, instrumental. Low strings and a fading aulos phrase,
> soft frame drum, unresolved but not hopeless.

**`prophecy-line` — ✓ made · A prophecy line comes true** *(stinger, 4–6 s)*
> Mystical reveal sting, instrumental. Shimmering bells, a whispered wordless
> choir swell, a lyre glissando, ending on a suspended chord.

**`claimed` — ✓ made · A hero is claimed by their godly parent** *(stinger, 6–8 s)*
> Glorious reveal sting, instrumental. A rising harp and string swell, choir
> blooming into a major chord, a single deep bell, a sea-wave cymbal swell.

## Which tracks matter most

1. **Delivered:** `title`, `camp`, `museum`, `storm`, `boss`, `minigame`,
   `oracle`, `woods`, `highway`, `garden`. Thank you!
2. **Next five, in order:**
   - `manhattan`: the first thing every new player hears now that the game
     opens in the city.
   - `cutscene-journey`, `cutscene-storm`, `cutscene-camp`: the three story
     cutscenes of the opening; good music makes them land.
   - `arch`: chapter 6, the first chapter in order without its own track.
3. **Then, as players reach them:** `waterland`, `casino` (the Lotus escape,
   where the music itself should feel like a trap), `desert`, `underworld`,
   `beach`, `olympus`.
4. **Polish:** `boss-god` (Ares and the final duel deserve their own),
   `boss-fury`, `boss-minotaur`, and `campfire` for camp at night.

The stingers are already made with ElevenLabs
(`design/source/build_stingers.py`); new short stingers can be added there.
