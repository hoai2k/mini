#!/usr/bin/env python3
"""Bronze Drum audio: sound effects from ElevenLabs, and the music requests.

    python3 bronzedrum/design/source/build_audio.py               # write docs + manifest
    python3 bronzedrum/design/source/build_audio.py --generate    # also generate missing SFX
    python3 bronzedrum/design/source/build_audio.py --generate --force drum-tung
    python3 bronzedrum/design/source/build_audio.py --check       # verify docs, manifest, files

Generation needs an ElevenLabs key in ELEVENLABS_API_KEY, or in
~/.config/elevenlabs.key. The key is never written into the repository.

Outputs:
    bronzedrum/design/sound-effects.md    - every effect, its prompt and use
    bronzedrum/design/music-requests.md   - prompts for the score
    bronzedrum/game/assets/sfx/*.mp3      - processed effects (generated)
    bronzedrum/game/assets/audio.json     - what the game loads
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SFX_DIR = ROOT / "game" / "assets" / "sfx"
MUSIC_DIR = ROOT / "game" / "assets" / "music"
AUDIO_MANIFEST = ROOT / "game" / "assets" / "audio.json"
SFX_DOC = ROOT / "design" / "sound-effects.md"
MUSIC_DOC = ROOT / "design" / "music-requests.md"
API = "https://api.elevenlabs.io/v1/sound-generation"

# ------------------------------------------------------------------ sound effects
#
# id, prompt, seconds, prompt influence, variants, kind, use
# kind: "hit" (onset trimmed to 0 ms, mono), "oneshot" (mono), "loop" (stereo,
# crossfaded so it loops cleanly), "sting" (stereo).

SFX: list[dict] = []


def sfx(group, sid, prompt, seconds, use, influence=0.5, variants=1, kind="oneshot", gain=1.0, post=None):
    SFX.append(dict(group=group, id=sid, prompt=prompt, seconds=seconds, use=use,
                    influence=influence, variants=variants, kind=kind, gain=gain, post=post))


# Generated files that failed review. They are not loaded, and --generate does
# not remake them unless forced (then remove the entry here if the new take is good).
REJECTED = {
    "sfx/drum-tung-2.mp3": "eight takes, none both a single stroke and deep (more energy under 200 Hz than over 2 kHz); "
    "the model drifts to a bright metallic hit, and two good deep strokes give enough variety",
}


G = "The drum"
sfx(G, "drum-tung",
    "One strong stroke with a padded wooden beater on the centre of a large ancient Vietnamese "
    "bronze kettle drum: a deep round boom followed by a shimmering metallic bronze ring. A single "
    "hit, close-miked, dry room, no music.",
    2.0, "Trưng Trắc's centre stroke (tùng), played on every left-hand input.",
    influence=0.7, variants=3, kind="hit")
sfx(G, "drum-cac",
    "One sharp stroke of a hardwood stick on the rim of a bronze kettle drum: a bright, dry, "
    "metallic click with a short ring. A single hit, close-miked, no music.",
    0.7, "Trưng Nhị's rim stroke (cắc), played on every right-hand input and flourish.",
    influence=0.7, variants=3, kind="hit",
    # The model tends to add body and ring; a rim stroke must be short and bright.
    post="highpass=f=400,highpass=f=400,atrim=0:0.32,afade=t=out:st=0.12:d=0.2")
sfx(G, "drum-wake",
    "A huge bronze gong struck softly and swelling: a rising shimmering bronze resonance that "
    "blooms and slowly fades, ceremonial and awe-struck.",
    4.0, "The drum wakes: four commands chained.", kind="sting", gain=0.8)
sfx(G, "stumble",
    "A dull, slightly off-key wooden knock, clumsy and muted, very short.",
    0.5, "A stroke during the army's answer, or off the beat.", kind="hit", gain=0.7)

G = "The army answers"
sfx(G, "call",
    "A group of women warriors shouting one short unison battle cry, 'Hô!', outdoors, fierce and "
    "together, a single shout.",
    0.9, "Beats 1 and 3 of every answer, under the command's own sound.", variants=3, kind="hit", gain=0.6)
sfx(G, "cmd-march",
    "A company of barefoot soldiers marching in step through the shallow water of a rice paddy: "
    "rhythmic splashing and squelching footsteps.",
    2.5, "Tiến (march) answer.")
sfx(G, "cmd-strike",
    "Bronze-tipped spears thrusting and clashing against wooden shields and armour, a short "
    "fierce skirmish of a small group, no voices.",
    2.5, "Đánh (strike) answer.")
sfx(G, "cmd-shield",
    "Many round wooden and hide shields raised together and locked with one heavy hollow thump.",
    1.5, "The guard: shields thrown up against a blow (A / Space).")
sfx(G, "cmd-rally",
    "A group of women ululating and cheering together outdoors, a rallying cry rising and "
    "falling.",
    2.5, "The women cheer when the drum wakes (four commands chained).", gain=0.8)
sfx(G, "cmd-charge",
    "A war elephant trumpets loudly, then charges: heavy thundering footsteps that shake the "
    "ground.",
    3.0, "The elephant charge: a strike on a waking drum in chapter 3.")

G = "Battle"
sfx(G, "volley",
    "A volley of arrows released from several bows at once, whooshing away through the air.",
    1.5, "The archers shoot on a strike.", gain=0.7)
sfx(G, "bolts",
    "Several crossbow bolts fired and thudding into wooden shields, quick hollow thunks.",
    1.5, "Han crossbows and the fort fire.", gain=0.8)
sfx(G, "hit-paper",
    "A sharp quick tear of thick handmade paper, a single rip.",
    0.6, "Every hit: in this game wounds are paper tearing.", variants=3, kind="hit", gain=0.9)
sfx(G, "hit-straw",
    "A spear stabbing into a bundled straw training dummy: a dry rustling thud.",
    0.7, "Hits on the straw targets in chapter 1.", kind="hit")
sfx(G, "defeat-han",
    "A soldier's lamellar armour and halberd clattering to the ground, metal plates rattling.",
    1.2, "A Han soldier falls.", gain=0.8)
sfx(G, "fort-break",
    "A wooden palisade of sharpened stakes splintering and collapsing, a long timber crash.",
    3.0, "The fort falls.")
sfx(G, "trample",
    "A heavy elephant stomp crushing wood, a deep ground-shaking impact.",
    1.2, "The elephant charge lands.", kind="hit")
sfx(G, "wound",
    "Arrows striking wooden shields and a few soft pained gasps from a group of women.",
    1.0, "The army is hit while its shields are down.", gain=0.6)
sfx(G, "blocked",
    "Arrows glancing off raised bronze-studded shields, light metallic ticks.",
    1.0, "The army is hit with shields raised.", gain=0.6)

G = "Interface"
sfx(G, "ui-move",
    "A soft rustle of a single sheet of rice paper being turned, very short and quiet.",
    0.5, "Moving focus in menus.", kind="hit", gain=0.5)
sfx(G, "ui-confirm",
    "A small hardwood clapper knock, clean and single, like a temple woodblock.",
    0.5, "Choosing a menu item.", kind="hit", gain=0.6)
sfx(G, "ui-back",
    "A sheet of paper sliding softly across a wooden table, short.",
    0.5, "Closing a menu or dialog.", kind="hit", gain=0.5)
sfx(G, "ui-start",
    "A single resonant strike on a small bronze gong, ringing out.",
    2.5, "Press Start.", kind="sting", gain=0.7)

G = "Stings"
sfx(G, "victory",
    "A triumphant flourish on large bronze drums and gongs, building quickly and ending on one "
    "ringing gong stroke.",
    4.5, "A chapter is won.", kind="sting")
sfx(G, "defeat",
    "A low bronze gong struck softly once, fading slowly with sorrow, a breath of wind after.",
    4.5, "A chapter is lost.", kind="sting")

G = "Story chapters"
sfx(G, "pour",
    "Molten bronze poured from a clay crucible into a mould: a thick glugging pour with hissing "
    "steam and crackling.",
    2.5, "Casting the Drums: a steady phrase pours bronze.", gain=0.8)
sfx(G, "crack",
    "A clay casting mould cracking from the heat: one sharp crack, then crumbling pieces and a "
    "hiss of steam.",
    1.5, "Casting the Drums: a phrase that drifts cracks the mould.")
sfx(G, "lantern",
    "A paper lantern being lit at night: a soft whoosh of flame catching, then one small clear "
    "bronze bell.",
    1.5, "The Oath and The Villages Answer: an answered call lights incense or lanterns.", gain=0.7)
sfx(G, "crowd-cheer",
    "A festival crowd in an ancient village square cheering and clapping with joy, a few small "
    "gongs ringing.",
    3.0, "The Coronation: the crowd answers each rhythm.", gain=0.7)

G = "Ambience"
sfx(G, "amb-garden",
    "Peaceful dawn in a northern Vietnamese garden by a lotus pond: songbirds, gentle trickling "
    "water, a distant rooster, a light breeze through bamboo. Continuous, no music.",
    20.0, "Chapter 1 bed, looped.", kind="loop", gain=0.45)
sfx(G, "amb-river",
    "Daytime on the bank of a wide slow river: flowing water, wind in tall reeds, distant herons "
    "and birds. Continuous, no music, no drums.",
    20.0, "Chapter 2 bed, looped.", kind="loop", gain=0.45)
sfx(G, "amb-foundry",
    "Inside an ancient bronze foundry at night: a roaring furnace, crackling charcoal, leather "
    "bellows breathing, distant hammering on metal. Continuous, no music.",
    20.0, "Casting the Drums bed, looped.", kind="loop", gain=0.45)
sfx(G, "amb-night",
    "Night in the countryside outside a walled town: crickets, frogs croaking in flooded rice "
    "paddies, distant torches crackling, a faint wind. Continuous, no music.",
    20.0, "Chapter 3 bed, looped.", kind="loop", gain=0.45)


# ------------------------------------------------------------------ music

MUSIC_STYLE = (
    "Score for a game about the Trưng sisters' uprising in ancient Vietnam (40 CE), staged as a "
    "backlit paper-cut theatre. Intimate, folkloric and ceremonial rather than epic-orchestral. "
    "Northern Vietnamese traditional instruments: đàn bầu (monochord, its bending voice is the "
    "sisters' grief and longing), đàn tranh (16-string zither), sáo trúc (bamboo flute), đàn "
    "nguyệt (moon lute), đàn nhị (two-string fiddle), bamboo percussion (song lang, mõ), and "
    "bronze: gongs, bells and the low hum of a bronze drum. Voices in the manner of quan họ, the "
    "call-and-response duet singing of Bắc Ninh, close to where the sisters lived: two women's "
    "voices, unaccompanied or lightly accompanied."
)

MUSIC_RULES = [
    "The player is the drummer and sets their own speed: commands are judged on evenness, not "
    "on a metronome, so the player may drum faster or slower than the music. The tempo given "
    "for a battle track is the Han war drum, the beat on which the enemy strikes. Keep that "
    "pulse soft and felt rather than hammered (sustained textures, melodic phrases, gentle "
    "plucked ostinati), so drumming at another speed on top never clashes; leave the low and "
    "low-mid range open: no kick drum, no accented percussion on the beat, no big taiko hits. "
    "The player's bronze drum is the lead percussion.",
    "In-battle tracks start exactly on the first downbeat at 0.000 s, with no pickup, no fade-in "
    "and no silence, and loop seamlessly after the stated number of bars.",
    "Each chapter has a second layer, the waking drum, at the same tempo, key and length. It is "
    "played on top of the base when four commands chain, so it must sound right both alone and "
    "layered.",
    "Avoid generic \"Asian\" clichés, Chinese or Japanese instrument colour (guzheng, erhu, "
    "shakuhachi, koto) for the Viet side, Western rock drums, EDM drops, and trailer-music "
    "braams. Keep it acoustic and human.",
    "Lyrics: none, unless a request says otherwise. Wordless vocables (\"ơi\", \"à ơi\", "
    "\"hò\") are welcome.",
]

# id, title, use, length, bpm, key, loop, structure, style tags (short), prompt, status
MUSIC: list[dict] = []


def track(mid, title, use, length, bpm, key, loop, structure, tags, prompt, status="requested"):
    MUSIC.append(dict(id=mid, title=title, use=use, length=length, bpm=bpm, key=key, loop=loop,
                      structure=structure, tags=tags, prompt=prompt, status=status))


track("mu-title", "Trống Đồng (title theme)",
      "Title screen and chapter select, looping.",
      "about 90 s, loopable", 72, "D minor pentatonic (D–F–G–A–C)",
      "loop the whole track; ends where it began",
      "Solo sáo trúc states the main theme over slow đàn tranh arpeggios; a soft bronze gong "
      "marks each phrase; a woman's voice hums the theme back, quan họ style; it returns to the "
      "flute alone.",
      "vietnamese traditional, sao truc bamboo flute, dan tranh zither, bronze gong, quan ho female voice, slow, intimate, folkloric, 72 bpm",
      "A slow, intimate title theme for a Vietnamese folk-epic game. A bamboo flute (sáo trúc) "
      "plays a proud but tender pentatonic melody over gently rippling 16-string zither (đàn "
      "tranh) arpeggios. A soft bronze gong rings at the start of each phrase. Halfway through, a "
      "solo female voice hums the melody back in the style of quan họ folk singing, then the "
      "flute returns alone. Warm, candlelit, like a story about to be told. 72 BPM, D minor "
      "pentatonic, acoustic, no drums.")
track("mu-garden", "The Garden at Mê Linh (chapter 1)",
      "Chapter 1 battle loop under the player's drumming.",
      "16 bars = 41.74 s", 92, "G major pentatonic",
      "16 bars from 0.000 s; loops at 41.739 s",
      "Bars 1–8: đàn tranh ostinato on every beat, sáo trúc phrases answering in the gaps. Bars "
      "9–16: đàn bầu takes the tune, playful, bending notes (Nhị's theme).",
      "vietnamese folk, dan tranh, sao truc, dan bau, playful, light, 92 bpm, 4/4, no drums, game loop",
      "A light, playful loop for the training chapter of a rhythm game set in an ancient "
      "Vietnamese lord's garden at dawn. Exactly 92 BPM in 4/4, 16 bars, seamless loop, starting "
      "on the downbeat. A clear zither (đàn tranh) ostinato marks every beat, the bamboo flute "
      "answers in the gaps, and in the second half the monochord (đàn bầu) plays a cheeky, "
      "bending melody, the younger sister's theme. Bright, green, morning birds in spirit. No "
      "drums or bass on the beat: the player plays a bronze drum on top.")
track("mu-garden-wake", "The Garden at Mê Linh: the drum wakes",
      "Layer on top of mu-garden while the drum is awake.",
      "16 bars = 41.74 s", 92, "G major pentatonic",
      "same length and bar lines as mu-garden",
      "Adds a second zither in counterpoint, a high flute descant and two women's voices "
      "trading short calls (quan họ call-and-response), plus small bronze bells on beats 2 and 4.",
      "vietnamese folk, quan ho call and response, bronze bells, flute descant, joyful, 92 bpm, layer",
      "An extra layer for the training-chapter loop, same tempo (92 BPM), key (G major "
      "pentatonic) and 16-bar length, to play on top when the player's drum chain 'wakes'. Two "
      "women's voices trade short joyful calls in quan họ style, a high bamboo-flute descant "
      "soars, a second zither adds counterpoint, small bronze bells ring on beats 2 and 4. "
      "Sounds complete alone, fits exactly over the base. No low percussion.")
track("mu-river", "The Outpost on the Hát River (chapter 2)",
      "Chapter 2 battle loop.",
      "16 bars = 40.00 s", 96, "A minor pentatonic",
      "16 bars from 0.000 s; loops at 40.000 s",
      "A tense đàn nguyệt ostinato in eighth notes; đàn nhị carries a determined melody; a low "
      "bowed drone; a bronze gong every 4 bars.",
      "vietnamese traditional, dan nguyet lute ostinato, dan nhi fiddle, tense, determined, river battle, 96 bpm, no drums",
      "A tense, determined battle loop for a rhythm game: an army of ancient Vietnamese women "
      "advances on an enemy outpost by a river. Exactly 96 BPM in 4/4, 16 bars, seamless loop "
      "from the downbeat. A moon lute (đàn nguyệt) plays a driving eighth-note ostinato, a "
      "two-string fiddle (đàn nhị) carries a resolute melody, a low drone underneath, a bronze "
      "gong every four bars. Wind and water in the colour. No drum kit, no percussion on the "
      "beat: the player drums.")
track("mu-river-wake", "The Hát River: the drum wakes",
      "Layer on top of mu-river while the drum is awake.",
      "16 bars = 40.00 s", 96, "A minor pentatonic",
      "same length and bar lines as mu-river",
      "Adds a women's chorus in unison chant on vocables, đàn bầu answering the fiddle, and "
      "ringing bronze bells.",
      "vietnamese, women's chorus chant, dan bau, bronze bells, rising courage, 96 bpm, layer",
      "An extra layer for the river-battle loop, same tempo (96 BPM), key (A minor pentatonic) "
      "and 16-bar length. A chorus of women chants in unison on wordless vocables (hò, ơi), the "
      "monochord (đàn bầu) answers the fiddle line, bronze bells ring out. Courage rising. Fits "
      "exactly over the base, sounds complete alone, no low percussion.")
track("mu-luylau", "The Citadel at Luy Lâu (chapter 3)",
      "Chapter 3 battle loop, at night.",
      "16 bars = 38.40 s", 100, "D minor pentatonic",
      "16 bars from 0.000 s; loops at 38.400 s",
      "Majestic and dark: low bronze gongs in a slow pattern, đàn tranh tremolo, a sáo trúc "
      "theme that recalls the title, a low women's choir on long notes.",
      "vietnamese epic folk, bronze gongs, dan tranh tremolo, bamboo flute, low female choir, night, majestic, 100 bpm",
      "The climactic night battle loop of a game about the Trưng sisters storming a walled "
      "citadel on war elephants. Exactly 100 BPM in 4/4, 16 bars, seamless loop from the "
      "downbeat. Low bronze gongs in a slow, heavy pattern (not on every beat), a trembling "
      "zither (đàn tranh) tremolo, the bamboo flute playing the main title melody in a darker, "
      "nobler form, and a low women's choir on long notes. Moonlit, majestic, a little ominous. "
      "No drum kit, no kick: the player drums on top.")
track("mu-luylau-wake", "Luy Lâu: the drum wakes",
      "Layer on top of mu-luylau while the drum is awake.",
      "16 bars = 38.40 s", 100, "D minor pentatonic",
      "same length and bar lines as mu-luylau",
      "Full chorus in call-and-response, đàn bầu soaring above, bright bronze bells: triumph.",
      "vietnamese epic folk, full women's chorus call and response, dan bau soaring, bronze bells, triumphant, 100 bpm, layer",
      "An extra layer for the citadel-battle loop, same tempo (100 BPM), key (D minor "
      "pentatonic) and 16-bar length. A full women's chorus in call and response, the monochord "
      "(đàn bầu) soaring over it with long bends, bright bronze bells. Triumphant and fierce. "
      "Fits exactly over the base, sounds complete alone, no low percussion.")
track("mu-sisters", "Two Sisters (story theme)",
      "Story scenes and the training years between chapters.",
      "about 2 min", 66, "C major pentatonic",
      "not looped",
      "Two themes that meet: Trắc's on đàn tranh, steady and dignified; Nhị's on sáo trúc, "
      "quick and free. They alternate, then play together.",
      "vietnamese traditional duet, dan tranh and sao truc, tender, two themes intertwining, 66 bpm",
      "A tender piece about two sisters with different temperaments. The 16-string zither "
      "(đàn tranh) plays the elder sister's theme: steady, dignified, measured. The bamboo flute "
      "(sáo trúc) plays the younger sister's theme: quick, playful, free. They take turns, tease "
      "each other, then finally play together in harmony. Intimate, warm, a little bittersweet. "
      "66 BPM, acoustic, no percussion.")
track("mu-elegy", "The Drums Are Melted (ending)",
      "The ending, after the last battle.",
      "about 3 min", 58, "A minor pentatonic",
      "not looped",
      "Đàn bầu alone, then a quan họ duet lament (vocables only), a single bronze bell at the "
      "end, letting the ring die out.",
      "vietnamese lament, solo dan bau monochord, quan ho female duet, mournful, sparse, bronze bell ending",
      "A sparse, mournful ending piece. The monochord (đàn bầu) plays alone, bending each note "
      "like a voice holding back tears. Two women's voices enter in the quan họ folk style, "
      "singing a lament on wordless vocables (à ơi). At the end a single bronze bell is struck "
      "and left to ring until silence. It should feel like dawn on a river after a loss. Very "
      "slow, about 58 BPM, no percussion.")
track("mu-victory", "Victory sting",
      "Chapter won.",
      "about 8 s", 100, "D major pentatonic",
      "not looped",
      "A rising flute run and zither glissando onto one held chord, a bronze gong at the end.",
      "short victory sting, vietnamese, sao truc run, dan tranh glissando, bronze gong, 8 seconds",
      "An 8-second victory fanfare in Vietnamese folk style: a quick rising bamboo-flute run and "
      "a sweeping zither glissando land on one bright held chord, closing with a ringing bronze "
      "gong. Joyful, no drum kit.")
track("mu-defeat", "Defeat sting",
      "Chapter lost.",
      "about 8 s", 60, "A minor pentatonic",
      "not looped",
      "A falling đàn bầu phrase over a low drone, ending unresolved.",
      "short defeat sting, vietnamese, dan bau falling phrase, low drone, sorrowful, 8 seconds",
      "An 8-second defeat sting: the monochord (đàn bầu) plays a single falling, bending phrase "
      "over a low drone, ending unresolved. Sorrowful but not hopeless. No percussion.")
track("mu-oath", "The Oath (funeral)",
      "Under The Oath, the father's funeral, while the mourning drum calls.",
      "about 2 min, loopable", 56, "A minor pentatonic",
      "loop the whole track",
      "Đàn bầu alone over a low drone and a soft bronze bell every few bars; a single woman's "
      "voice hums a lament in the second half. Very sparse, leaving room for the slow mourning "
      "drum and the player's answers.",
      "vietnamese funeral lament, dan bau, low drone, soft bronze bell, female humming, sparse, slow, 56 bpm",
      "A sparse funeral piece for a Vietnamese lord, ancient times. The monochord (đàn bầu) bends "
      "slow, grieving phrases over a low drone, a soft bronze bell rings every few bars, and in "
      "the second half a single woman's voice hums a lament. About 56 BPM, very slow and quiet, "
      "lots of space: a mourning drum and the player's drumming sit on top. No other percussion.")
track("mu-foundry", "Casting the Drums",
      "Under Casting the Drums, in the foundry.",
      "about 2 min, loopable", 92, "D minor pentatonic",
      "loop the whole track",
      "A low steady bowed drone like the furnace's breath, a đàn nguyệt figure, metallic "
      "shimmer from struck bronze bars; work-song humming from men's and women's voices.",
      "vietnamese work song, foundry, low drone, dan nguyet, metallic bronze shimmer, humming voices, steady, 92 bpm",
      "Music for a night in an ancient bronze foundry. A low bowed drone breathes like the "
      "furnace, a moon lute (đàn nguyệt) plays a patient repeating figure, struck bronze bars add "
      "a metallic shimmer, and men's and women's voices hum a work song. Steady and warm, about "
      "92 BPM, but with no drums on the beat: the player keeps the hammer rhythm on top.")
track("mu-villages", "The Villages Answer",
      "Under The Villages Answer, at night along the river.",
      "about 2 min, loopable", 90, "G major pentatonic",
      "loop the whole track",
      "Night insects and water in the colour; sáo trúc phrases calling from far away and "
      "answered by another flute nearer; soft đàn tranh harmonics.",
      "vietnamese night music, two bamboo flutes call and answer, dan tranh harmonics, river at night, hopeful, sparse",
      "Night along the Red River. One bamboo flute (sáo trúc) calls a short phrase from far "
      "away and a second flute, nearer, answers it, again and again, like villages calling to each "
      "other; soft zither (đàn tranh) harmonics shimmer underneath. Hopeful and sparse, leaving "
      "space for drum calls and answers. No percussion.")
track("mu-coronation", "The Coronation at Mê Linh",
      "Under The Coronation, the festival.",
      "about 2 min, loopable", 116, "D major pentatonic",
      "loop the whole track",
      "A festive ensemble: đàn tranh, sáo trúc, đàn nguyệt and small gongs in a bright dance; "
      "a women's chorus in quan họ style on the refrain.",
      "vietnamese festival music, joyful, dan tranh, sao truc, dan nguyet, small gongs, quan ho chorus, 116 bpm",
      "A joyful festival piece for the crowning of two queens in ancient Vietnam. Zither, bamboo "
      "flute and moon lute play a bright dance tune, small gongs shimmer, and a women's chorus "
      "sings the refrain on vocables in the quan họ style. About 116 BPM, light and celebratory, "
      "without heavy drums: festival drummers and the player drum on top.")
track("mu-mavien", "Mã Viện Returns",
      "Battle loop for the hold-the-line chapter, at dusk.",
      "16 bars = 38.40 s", 100, "E minor pentatonic",
      "16 bars from 0.000 s; loops at 38.400 s",
      "Grave and urgent: a low brass-like bronze drone, a đàn nhị lament over tense đàn nguyệt "
      "ostinato, distant war horns; the title theme fragmented.",
      "vietnamese battle music, grave, urgent, dan nhi lament, dan nguyet ostinato, bronze drone, distant horns, 100 bpm",
      "A grave, urgent loop for a last stand at a river ford as a great Han army arrives. A low "
      "bronze drone, a tense moon-lute (đàn nguyệt) ostinato, a two-string fiddle (đàn nhị) "
      "playing a broken, mournful form of the main theme, distant war horns. Exactly 100 BPM in "
      "4/4, 16 bars, seamless loop from the downbeat. No drum kit or kick: the player drums.")
track("mu-anthem", "Song of the Two Queens (vocal song)",
      "Trailer and end credits.",
      "about 3 min 30 s", 84, "D minor pentatonic",
      "not looped",
      "Verse (solo voice and đàn tranh), chorus (two voices, full ensemble with bronze drums), "
      "bridge (đàn bầu solo), final chorus, quiet outro on the title theme.",
      "vietnamese folk ballad, female duet quan ho influenced, dan tranh, dan bau, bronze drums in chorus, anthemic but intimate, 84 bpm",
      "A folk ballad in Vietnamese about the Trưng sisters: two queens who rode elephants and "
      "beat the bronze drum so the villages would rise. Verses sung by one woman over zither, "
      "choruses by two women in close quan họ-style harmony with the full ensemble and deep "
      "bronze drums, a monochord (đàn bầu) solo bridge, a final chorus, and an outro that returns "
      "to the title theme on bamboo flute. 84 BPM. Lyrics: to be written with the author; until "
      "then, sing on vocables.")


# ------------------------------------------------------------------ helpers

def files_for(s):
    if s["variants"] == 1:
        return [f"sfx/{s['id']}.mp3"]
    return [f"sfx/{s['id']}-{i + 1}.mp3" for i in range(s["variants"])]


def api_key():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        p = Path.home() / ".config" / "elevenlabs.key"
        if p.exists():
            key = p.read_text().strip()
    if not key:
        sys.exit("No ElevenLabs key: set ELEVENLABS_API_KEY or write ~/.config/elevenlabs.key")
    return key


def generate(s, out: Path, key: str):
    body = {"text": s["prompt"], "duration_seconds": s["seconds"], "prompt_influence": s["influence"]}
    if s["kind"] == "loop":
        body["loop"] = True
    req = urllib.request.Request(API, data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            raw = res.read()
    except urllib.error.HTTPError as e:
        if e.code in (400, 422) and body.pop("loop", None):
            # Older models have no loop option; the crossfade below still makes it loop.
            req = urllib.request.Request(API, data=json.dumps(body).encode(), method="POST",
                                         headers={"xi-api-key": key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as res:
                raw = res.read()
        else:
            raise SystemExit(f"{s['id']}: ElevenLabs returned {e.code}: {e.read()[:300]!r}")
    with tempfile.NamedTemporaryFile(suffix=".mp3") as tmp:
        tmp.write(raw)
        tmp.flush()
        process(tmp.name, out, s)


def process(src, out: Path, s):
    """Trim, normalise and encode. Hits start on their transient so they stay in time."""
    filters = []
    if s["kind"] == "hit":
        # Trim up to the transient: anything 30 dB under the clip's own peak is lead-in.
        raw_peak = measure_peak(src, None)
        filters.append(f"silenceremove=start_periods=1:start_threshold={raw_peak - 30:.1f}dB:start_silence=0.002")
    if s.get("post"):
        filters.append(s["post"])
    if s["kind"] != "loop" and not s.get("post"):
        dur = s["seconds"]
        filters.append(f"afade=t=out:st={max(0.0, dur - min(0.25, dur * 0.3)):.3f}:d={min(0.25, dur * 0.3):.3f}")
    # Peak-normalise to -1 dBFS (loudness is balanced in the game by per-sound gain).
    peak = measure_peak(src, ",".join(filters) if filters else None)
    filters.append(f"volume={-1.0 - peak:.2f}dB")
    channels = ["-ac", "2"] if s["kind"] in ("loop", "sting") else ["-ac", "1"]
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", ",".join(filters),
                    *channels, "-ar", "44100", "-b:a", "128k" if s["kind"] in ("loop", "sting") else "96k",
                    str(out)], check=True)


def measure_peak(src, filters):
    cmd = ["ffmpeg", "-hide_banner", "-i", src]
    if filters:
        cmd += ["-af", filters + ",volumedetect"]
    else:
        cmd += ["-af", "volumedetect"]
    cmd += ["-f", "null", "-"]
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    for line in err.splitlines():
        if "max_volume" in line:
            return float(line.split("max_volume:")[1].split("dB")[0])
    raise RuntimeError(f"no peak measured for {src}")


# ------------------------------------------------------------------ outputs

def build_manifest():
    sfx_entries = {}
    for s in SFX:
        files = [f for f in files_for(s) if (ROOT / "game" / "assets" / f).exists() and f not in REJECTED]
        if files:
            sfx_entries[s["id"]] = {"files": files, "gain": s["gain"], "loop": s["kind"] == "loop"}
    music_entries = {}
    for m in MUSIC:
        f = f"music/{m['id']}.mp3"
        if m["status"] == "delivered" and (ROOT / "game" / "assets" / f).exists():
            entry = {"file": f, "bpm": m["bpm"]}
            if "bars" in m["loop"] or "same length" in m["loop"]:
                entry["bars"] = 16
            music_entries[m["id"]] = entry
    return json.dumps({"generatedBy": "bronzedrum/design/source/build_audio.py",
                       "sfx": sfx_entries, "music": music_entries}, indent=2, ensure_ascii=False) + "\n"


def build_sfx_doc():
    out = ["# Bronze Drum: sound effects\n"]
    out.append(
        "Every sound effect in the game, generated with ElevenLabs' sound-effects model from the "
        "prompts below. Generated from `source/build_audio.py`; edit the data there. "
        "`build_audio.py --generate` makes any effect whose file is missing, and "
        "`--force <id>` remakes one. The key is read from `ELEVENLABS_API_KEY` (or "
        "`~/.config/elevenlabs.key`) and never stored in the repository.\n")
    out.append(
        "Processing: hits are trimmed so the sound starts on its transient (the drum strokes must "
        "land exactly when the player presses), one-shots get a short fade-out, every file is "
        "peak-normalised to -1 dBFS, and the game balances them with the per-sound gain. Effects "
        "with several variants are picked at random so repeated strokes do not sound "
        "mechanical.\n")
    out.append("Sound direction: real, acoustic and close — bronze, wood, bamboo, water, paper, "
               "voices. No synth tones, no music in the effects. Hits are paper tearing, never "
               "gore.\n")
    have = sum(1 for s in SFX for f in files_for(s) if (ROOT / "game" / "assets" / f).exists() and f not in REJECTED)
    total = sum(s["variants"] for s in SFX)
    missing = [f for s in SFX for f in files_for(s) if not (ROOT / "game" / "assets" / f).exists() and f not in REJECTED]
    out.append(f"**{have} of {total} files in use.**" + (f" Not generated yet: {', '.join(f'`{m}`' for m in missing)}." if missing else "") + "\n")
    out.append("Each generated file was checked by measuring its length, peak, level over time "
               "(50 ms windows) and the balance of energy below 200 Hz and above 2 kHz: a drum "
               "stroke must start on its loudest moment and be one stroke, a rim click must be "
               "bright and short. Takes that failed are kept out of the game:\n")
    for f, why in REJECTED.items():
        out.append(f"- `{f}`: {why}.")
    out.append("")
    groups = []
    for s in SFX:
        if s["group"] not in groups:
            groups.append(s["group"])
    for gname in groups:
        out.append(f"## {gname}\n")
        out.append("| Id | Use | Length | Files | Prompt |")
        out.append("| --- | --- | ---: | --- | --- |")
        for s in [x for x in SFX if x["group"] == gname]:
            files = files_for(s)
            present = [f for f in files if (ROOT / "game" / "assets" / f).exists() and f not in REJECTED]
            ftxt = f"{len(present)}/{len(files)}"
            kind = {"hit": "hit", "oneshot": "one-shot", "loop": "loop", "sting": "sting"}[s["kind"]]
            out.append(f"| `{s['id']}` | {s['use']} ({kind}) | {s['seconds']} s | {ftxt} | {s['prompt']} |")
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def build_music_doc():
    out = ["# Bronze Drum: music requests\n"]
    out.append(
        "Prompts for the score, ready to paste into a music generator (Suno, Udio, ElevenLabs "
        "Music or similar). Generated from `source/build_audio.py`; edit the data there and "
        "rerun it.\n")
    out.append("## How to use this list\n")
    out.append(
        "- Each request has **style tags** (short, for a generator's style field) and a full "
        "**prompt** (for a description field, or both together).\n"
        "- Battle loops must hold their exact tempo and length: the game starts each one with the "
        "chapter, in time with the Han war drum, and the player drums on top at whatever speed "
        "they like. Trim any silence before the first downbeat and cut the loop at the stated "
        "time. If a generator drifts in tempo, regenerate rather than stretch.\n"
        "- Save each finished track as `bronzedrum/game/assets/music/<id>.mp3` (or drop it in "
        "`bronzedrum/intake/`). On integration the request is marked delivered and the game plays it.\n")
    out.append("## The sound of the game\n")
    out.append(MUSIC_STYLE + "\n")
    out.append("**Rules for every track**\n")
    for r in MUSIC_RULES:
        out.append(f"- {r}")
    out.append("")
    out.append("**Leitmotifs.** The title theme (on sáo trúc) is the uprising itself and returns "
               "in chapter 3 and the anthem. Trắc's theme is steady and on the beat (đàn tranh); "
               "Nhị's bends and syncopates (đàn bầu or sáo trúc), just as her drum strokes fall "
               "between the beats.\n")
    out.append("## Summary\n")
    out.append("| Id | Title | Use | Tempo | Length | Status |")
    out.append("| --- | --- | --- | ---: | --- | --- |")
    for m in MUSIC:
        out.append(f"| `{m['id']}` | {m['title']} | {m['use']} | {m['bpm']} BPM | {m['length']} | {m['status']} |")
    out.append("")
    for m in MUSIC:
        out.append(f"## {m['id']} · {m['title']}\n")
        out.append(f"{m['use']}\n")
        out.append(f"- **Tempo / key:** {m['bpm']} BPM, {m['key']}")
        out.append(f"- **Length:** {m['length']}")
        out.append(f"- **Loop:** {m['loop']}")
        out.append(f"- **Shape:** {m['structure']}")
        out.append(f"- **File:** `bronzedrum/game/assets/music/{m['id']}.mp3`")
        out.append(f"- **Style tags:** `{m['tags']}`")
        out.append(f"- **Prompt:** {m['prompt']}\n")
    return "\n".join(out).rstrip() + "\n"


def validate():
    ids = [s["id"] for s in SFX]
    assert len(ids) == len(set(ids)), "duplicate sfx id"
    mids = [m["id"] for m in MUSIC]
    assert len(mids) == len(set(mids)), "duplicate music id"
    for m in MUSIC:
        if "bars" in m["length"]:
            secs = float(m["length"].split("=")[1].strip().rstrip("s").strip())
            assert abs(secs - 16 * 4 * 60 / m["bpm"]) < 0.01, f"{m['id']}: length does not match tempo"
        assert len(m["tags"]) <= 200, f"{m['id']}: style tags over 200 characters"


def main():
    validate()
    args = sys.argv[1:]
    if "--generate" in args:
        key = api_key()
        force = set(args[args.index("--force") + 1].split(",")) if "--force" in args else set()
        for s in SFX:
            for f in files_for(s):
                out = ROOT / "game" / "assets" / f
                if (out.exists() or f in REJECTED) and s["id"] not in force:
                    continue
                print(f"generating {f} …", flush=True)
                generate(s, out, key)
    outputs = {SFX_DOC: build_sfx_doc(), MUSIC_DOC: build_music_doc(), AUDIO_MANIFEST: build_manifest()}
    if "--check" in args:
        stale = [p for p, t in outputs.items() if not p.exists() or p.read_text(encoding="utf-8") != t]
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT.parent)} (run build_audio.py)")
        return 1 if stale else 0
    for p, t in outputs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(t, encoding="utf-8")
        print(f"wrote {p.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
