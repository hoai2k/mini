#!/usr/bin/env python3
"""Generate the Micro prototypes' sound effects with ElevenLabs, and their audio list.

Edit the data in this file, then run:

    python3 micro/design/source/build_audio.py                    # make missing sounds
    python3 micro/design/source/build_audio.py --force mite/close
    python3 micro/design/source/build_audio.py --check            # verify up to date

The key is read from ELEVENLABS_API_KEY or ~/.config/elevenlabs.key; it is
never written to the repository. Generation needs ffmpeg. Adapted from
gliders/design/source/build_audio.py.

Outputs:
    micro/prototypes/assets/audio/<prototype>/<name>[-n].mp3
    micro/prototypes/shared/audio-list.js   what the prototypes load
    micro/design/sound-effects.md           the prompts, for regenerating by hand
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

ROOT = Path(__file__).resolve().parents[2]  # micro/
OUT = ROOT / "prototypes" / "assets" / "audio"
LIST = ROOT / "prototypes" / "shared" / "audio-list.js"
DOC = ROOT / "design" / "sound-effects.md"
API = "https://api.elevenlabs.io/v1/sound-generation"
XFADE = 1.5

NATURE = ("Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: "
          "rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. ")
CLEAN = "No music, no narration, no voices, no speech."
CLOSE = "Extremely close-miked, tiny, intimate, detailed. " + CLEAN
# The shell's menus: a brass Victorian microscope (the title music is "Clockwork Chamber Music").
BRASS = ("Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, "
         "warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. ")


def U(id, seconds, used, prompt, variants=1, volume=1, influence=0.6):
    return S(id, "oneshot", seconds, used, BRASS + prompt + " " + CLEAN, influence, variants, volume, nature=False)


def S(id, kind, seconds, used, prompt, influence=0.55, variants=1, volume=1, nature=True):
    return {"id": id, "kind": kind, "seconds": seconds, "used": used, "prompt": (NATURE if nature else "") + prompt,
            "influence": influence, "variants": variants, "volume": volume}


GROUPS = [
    ("shared", "Shared (every world)"),
    ("springtail", "Springtail (bog surface)"),
    ("mite", "Mite (moss canopy, SEM)"),
    ("tardigrade", "Tardigrade (water film)"),
    ("amoeba", "Amoeba (pool)"),
    ("paramecium", "Paramecium (pool)"),
    ("bacterium", "Bacterium (sediment)"),
    ("phage", "Phage (bog water)"),
    ("ui", "Shell (menus and transitions; game/src/sound.js synthesises these today)"),
]

SOUNDS = [
    # Shared: the portal (the way on to the next world), the same in every world.
    S("shared/portal-chime", "oneshot", 2.5, "Going through a portal (the way on): the success chime before the freeze and the zoom into the next world.",
      "A warm magical golden shimmer: a soft glassy chime, a rising sparkle of tiny high bell tones and an airy swell that "
      "rings out and fades, wondrous and rewarding. " + CLEAN, 0.5),
    # Springtail: the bog surface, the only level with real outdoor air.
    S("springtail/amb-bog", "loop", 12, "Ambience: the bog pool surface at springtail height.",
      "Calm outdoor ambience at the edge of a still bog pool on a mild day: a soft breeze over moss, faint water lapping, "
      "a distant insect hum, very sparse faraway birdsong. Even level, continuous, seamless. " + CLEAN, 0.5),
    S("springtail/jump", "oneshot", 0.6, "A (dash): the furcula jump.",
      "A tiny sharp springy snap-click followed by a very short airy whoosh, like a miniature catapult releasing. " + CLOSE, variants=3),
    S("springtail/land-water", "oneshot", 0.5, "Landing on the water film.",
      "A tiny soft plip of something very light landing on a still water surface, delicate, almost no splash. " + CLOSE, variants=3),
    S("springtail/land-sticky", "oneshot", 1.0, "Landing on a sundew leaf: stuck.",
      "A small wet sticky squelch and a stretchy tacky pull, like a fingertip pressed into honey. " + CLOSE),
    S("springtail/eat", "oneshot", 0.6, "X (eat): grazing pollen and spores.",
      "Tiny dry crunchy nibbling, a few quick crisp bites on a grain. " + CLOSE, variants=2),
    S("springtail/raindrop", "oneshot", 1.5, "A raindrop cratering the pool next to you.",
      "A single big heavy raindrop plunking into a calm pond right beside the microphone, deep resonant bloop and a ring of ripples. " + CLEAN),
    S("springtail/stenus-skim", "oneshot", 1.2, "The rove beetle skimming across the water.",
      "A fast thin hissing zip across a water surface, like a tiny speedboat streaking past, fading quickly. " + CLEAN),
    S("springtail/stenus-strike", "oneshot", 0.5, "The rove beetle's harpoon strike.",
      "An instant sharp sticky thwip, a tiny elastic tongue shooting out and snapping back. " + CLOSE),
    # Mite: moss and litter, plus the electron microscope's own hum.
    S("mite/amb-moss", "loop", 12, "Ambience: inside the moss cushion.",
      "Muffled, close, damp ambience deep inside a cushion of moss: very soft rustling, faint creaks of stems, a distant muted breeze "
      "overhead. Low and even, continuous, seamless. " + CLEAN, 0.5),
    S("mite/step", "oneshot", 0.5, "Footfalls (rate follows the gait).",
      "One tiny dry hard tap, like the tip of a beetle's leg clicking on a dry leaf. " + CLOSE, variants=4, volume=0.5),
    S("mite/dash", "oneshot", 1.0, "A (dash): the scramble.",
      "A quick flurry of tiny dry clicking scrabbles, many little hard legs scurrying fast over dry leaves. " + CLOSE),
    S("mite/close", "oneshot", 0.8, "B: closing into the armoured capsule.",
      "A small hollow hard clack-thunk of an armoured shell snapping shut, like a tiny seed pod closing. " + CLOSE),
    S("mite/open", "oneshot", 0.8, "Opening up again.",
      "A small hollow creak and soft click of a hard little shell hinging open. " + CLOSE),
    S("mite/bite", "oneshot", 0.5, "X: chelicerae bite.",
      "A tiny crisp pinching crunch, like snipping a thin dry fibre. " + CLOSE, variants=2),
    S("mite/blade", "oneshot", 0.8, "Pushing past a moss blade, which springs back.",
      "A soft swish and springy rustle of a thin green blade bending and flicking back. " + CLOSE, variants=3, volume=0.6),
    S("mite/predator", "oneshot", 1.5, "The predatory mite closing in.",
      "Fast, light, menacing skittering of long thin legs approaching quickly over dry leaves. " + CLOSE),
    # Tardigrade: the water film, wet and slow.
    S("tardigrade/amb-film", "loop", 12, "Ambience: inside the water film on a moss leaf.",
      "Close underwater ambience in a very thin layer of water: soft muffled bubbling, slow gentle gurgles, faint fizz, "
      "a dull distant pressure. Even, continuous, seamless. " + CLEAN, 0.5),
    S("tardigrade/step", "oneshot", 0.5, "Footfalls: a padded squish with a claw tick.",
      "A soft small squishy padded step with a tiny click of a claw at the end, underwater. " + CLOSE, variants=4, volume=0.5),
    S("tardigrade/dash", "oneshot", 1.0, "A (dash): the scramble.",
      "A hurried patter of soft squishy little steps underwater, clumsy and quick. " + CLOSE),
    S("tardigrade/bite", "oneshot", 0.6, "X: stylets pierce a cell.",
      "A tiny crisp puncture: a needle-sharp click piercing a taut cell wall, then a small tight pop. Sharp, percussive, not a lick or slurp. " + CLOSE, variants=2),
    S("tardigrade/tun", "oneshot", 2.5, "Y: drying into a tun.",
      "A slow shrinking dry crinkle and a soft deflating sigh, like a damp leaf curling up as it dries. " + CLOSE),
    S("tardigrade/revive", "oneshot", 2.5, "Rehydrating out of the tun.",
      "A slow gentle watery swelling gurgle, like a sponge soaking up water and plumping out. " + CLOSE),
    S("tardigrade/rain", "oneshot", 4.0, "Rain arriving on the moss.",
      "Rain beginning to fall on a moss cushion, heard muffled from inside: soft pattering building up, water trickling down. " + CLEAN),
    S("tardigrade/milnesium", "oneshot", 1.5, "The predatory tardigrade lunging.",
      "A heavy wet lunge and a deep sucking gulp underwater, ominous and close. " + CLOSE),
    # Amoeba: thick and viscous.
    S("amoeba/amb-pool", "loop", 12, "Ambience: the pool, very viscous and slow.",
      "Deep, slow, thick underwater ambience: a low rumbling murmur, occasional very slow viscous bubbles, muffled and calm. "
      "Even, continuous, seamless. " + CLEAN, 0.5),
    S("amoeba/stretch", "oneshot", 1.5, "A pseudopod flowing out.",
      "A slow soft gooey stretching sound, thick slime being pulled and flowing, wet and elastic. " + CLOSE, variants=3, volume=0.6),
    S("amoeba/boost", "oneshot", 1.0, "A (dash): the surge.",
      "A quick gooey surging whoosh, thick liquid rushing forward inside something soft. " + CLOSE),
    S("amoeba/engulf", "oneshot", 1.5, "X: the food cup closing round prey.",
      "A wet enveloping squelch and a soft closing gulp, slime folding around something and sealing. " + CLOSE),
    S("amoeba/vacuole", "oneshot", 0.5, "The contractile vacuole emptying.",
      "One soft round watery bubble pop. " + CLOSE, variants=2, volume=0.6),
    S("amoeba/digest", "oneshot", 2.0, "Digesting a food vacuole.",
      "A slow low gentle stomach-like gurgle, muffled. " + CLOSE),
    # Paramecium: a fast swimmer in the pond.
    S("paramecium/amb-pool", "loop", 12, "Ambience: open pond water.",
      "Faint underwater ambience in clear pond water: a very soft airy hiss, tiny distant ticks and fizzes, calm. "
      "Even, continuous, seamless. " + CLEAN, 0.5, volume=0.35),
    S("paramecium/swim", "loop", 6, "The cilia beating (volume and rate follow the swim speed).",
      "A soft continuous rhythmic shimmering rustle, like thousands of tiny feathers fluttering in water, steady. "
      "Continuous, seamless. " + CLOSE, 0.6, volume=0.7),
    S("paramecium/dash", "oneshot", 0.8, "A (dash): the sprint.",
      "A quick rushing underwater swish, a fast swimmer darting forward. " + CLOSE),
    S("paramecium/gulp", "oneshot", 0.6, "X: a feeding gulp.",
      "A small quick watery suction gulp. " + CLOSE, variants=2),
    S("paramecium/trichocysts", "oneshot", 0.8, "X when touched: trichocyst discharge.",
      "A sharp burst of many tiny needle-like snaps fired all at once, a crackling spray. " + CLOSE),
    S("paramecium/reverse", "oneshot", 0.8, "B: the avoidance reaction.",
      "A quick swirling reversing whoosh underwater, a sudden back-pedal and turn. " + CLOSE),
    S("paramecium/didinium", "oneshot", 1.5, "Didinium closing in.",
      "An ominous fast fluttering whirr approaching underwater, a spinning hunter getting closer, tense. " + CLOSE),
    S("paramecium/held", "oneshot", 1.5, "Held by Didinium's proboscis.",
      "A tense squeezing creak and a wet struggling stretch underwater. " + CLOSE),
    # Bacterium: Brownian fizz and the rotary motor.
    S("bacterium/amb-sediment", "loop", 12, "Ambience: Brownian motion in the sediment.",
      "A dense soft crackling fizz of a busy microbial world in pond mud, like tiny bubbles and grains jostling, constant tiny random pops, even and continuous, seamless. "
      + CLEAN, 0.5),
    S("bacterium/run", "loop", 4, "The flagellar motor during a run (rate follows speed).",
      "A fine soft continuous whirring hum, like a tiny insect wing or a spinning seed heard very close, organic and steady. Continuous, seamless. "
      + CLOSE, 0.6, volume=0.6),
    S("bacterium/tumble", "oneshot", 0.6, "B: a tumble.",
      "A short fluttering stutter, a tiny whirl faltering and flicking round in a new direction. " + CLOSE, variants=2),
    S("bacterium/sprint", "oneshot", 1.0, "A (dash): the sprint run.",
      "A quick rising whirr, a tiny organism surging forward with a soft high rush, then easing. " + CLOSE),
    S("bacterium/eat", "oneshot", 0.6, "X: absorbing nutrients.",
      "A tiny soft fizzy absorbing sip, bubbles dissolving. " + CLOSE, variants=2),
    S("bacterium/phage", "oneshot", 0.5, "A phage latching on.",
      "A tiny sharp sticky click, something minute latching firmly onto a soft surface. " + CLOSE),
    S("bacterium/graze", "oneshot", 2.0, "A grazer's feeding current pulling at you.",
      "A deep slow sucking current whoosh, a big drain pulling water in. " + CLEAN),
    # ---- Added 2026-11-02 (generated in one batch while ElevenLabs access lasts; the wiring list for
    # each is in sound-effects.md under "Wiring"). Frequent sounds have 2-3 takes.
    # Shared: the portal, encounters, death and re-forming, in every world.
    S("shared/portal-appear", "oneshot", 2.5, "The way on unseals: the portal's light first appears (every earlier encounter met).",
      "A soft magical golden glow blooming into being: a low warm swell, a gentle shimmer of tiny glassy bell tones opening up, "
      "hopeful and inviting, fading out slowly. " + CLEAN, 0.5),
    S("shared/portal-near", "oneshot", 1.2, "Arriving at the open portal: the \"Y Enter the portal\" prompt appears.",
      "A short soft airy golden sparkle, two or three tiny high glassy chime tones rising, delicate and inviting. " + CLEAN, 0.5, variants=2, volume=0.6),
    S("shared/portal-enter", "oneshot", 1.2, "Y at the open portal: being drawn in (just before the success chime).",
      "A soft rising airy whoosh pulling inward, a gentle suck of air into warm light with a faint shimmer at the end. " + CLEAN, 0.5),
    S("shared/slowdown", "oneshot", 3.0, "The success slow-down: time easing to a freeze frame after the chime.",
      "A long deep soft descending swell, like time slowing down: a warm low tone gently bending down in pitch and fading into "
      "a hushed still glow. " + CLEAN, 0.5),
    S("shared/portal-sealed", "oneshot", 0.8, "Y at a sealed or guarded portal: \"not yet\".",
      "A short soft muted closed thud, like a hand pressed against thick glass, a dull low bump with a faint falling glassy tone. "
      "Gentle, a polite no. " + CLEAN, 0.55, variants=2),
    S("shared/backdoor", "oneshot", 1.5, "Y at the backdoor: back up a world.",
      "A soft airy reversed whoosh rising and pulling away upward, a gentle receding shimmer. " + CLEAN, 0.5),
    S("shared/danger", "oneshot", 1.2, "A predator's wind-up tell (any world): something is about to strike.",
      "A short tense rising organic creak and hiss, like a living thing drawing itself back to strike, a building threat "
      "that stops abruptly. " + CLOSE, variants=3),
    S("shared/block", "oneshot", 0.6, "A braced block: a predator's strike glances off (any world).",
      "A firm dull glancing knock, something hard sliding off a tough shell, a short scrape. " + CLOSE, variants=2),
    S("shared/hit", "oneshot", 0.6, "Hit, knocked or stunned (any world).",
      "A soft heavy wet impact thump, a body being knocked aside, brief. " + CLOSE, variants=2),
    S("shared/death", "oneshot", 2.5, "Death: the body dissolves into motes (any world without its own).",
      "A gentle sad dissolving: a soft fizzing crumble breaking up into tiny scattering particles, fading downward into silence. "
      + CLOSE, 0.5),
    S("shared/reform", "oneshot", 2.0, "Re-forming: motes gathering into a fresh body.",
      "Tiny soft particles gathering and drawing together, a gentle rising sparkle that settles into a soft wet plop of something "
      "whole again. Hopeful. " + CLOSE, 0.5),
    S("shared/foe-flees", "oneshot", 1.5, "A predator gives up and retreats.",
      "A receding scramble or swish moving quickly away into the distance and fading, relief. " + CLOSE),
    S("shared/join", "oneshot", 0.8, "Another player joins.",
      "A friendly round bubbly pop and a small bright watery bloop, welcoming. " + CLOSE, 0.5),
    # Springtail
    S("springtail/charge", "oneshot", 0.8, "Holding A: cocking the furcula (charging a jump).",
      "A tiny tightening creak of a spring being wound, rising tension, very small. " + CLOSE, volume=0.6),
    S("springtail/flip", "oneshot", 0.6, "Landing on its back (the back-landing flip).",
      "A tiny clumsy tumbling clatter, a light little body flipping over and landing on its back with a soft tick. " + CLOSE, variants=2),
    S("springtail/right", "oneshot", 0.5, "Righting itself after a back landing.",
      "A tiny quick kick and flick, a small body flipping back upright with a soft tap. " + CLOSE, variants=2),
    S("springtail/pounce", "oneshot", 0.5, "The pounce-bite landing on a foe.",
      "A small sharp nip landing hard: a tiny thwack and crisp pinch. " + CLOSE, variants=2),
    S("springtail/glue-snap", "oneshot", 0.5, "A sundew glue strand thinning and snapping.",
      "A tiny thin sticky strand stretching and snapping with a wet elastic pop, like a string of honey breaking. " + CLOSE, variants=3),
    S("springtail/struggle", "oneshot", 0.8, "Wriggling and kicking in sundew glue.",
      "Tiny frantic wet sticky squelching and tugging, a small body thrashing in thick glue. " + CLOSE, variants=2),
    S("springtail/tear-free", "oneshot", 0.8, "Tearing free of the sundew.",
      "A sticky tearing rip and a release, the last gluey strands letting go with a springy pop. " + CLOSE),
    S("springtail/sundew-fold", "oneshot", 2.5, "Slipped back: the tentacles fold over and the leaf cups.",
      "A slow wet sticky curling creak, many glistening tentacles slowly folding inward and a soft gluey closing. Ominous. " + CLOSE),
    S("springtail/strider", "oneshot", 1.5, "The water strider skating in.",
      "Light quick rhythmic skating strokes across a still water surface, soft dimpling rowing pulses approaching. " + CLEAN),
    S("springtail/spider", "oneshot", 2.0, "The pond wolf spider (boss) stalking over the moss.",
      "Heavy, slow, deliberate footfalls of a large spider approaching over damp moss, soft thuds and rustles, menacing. " + CLEAN),
    S("springtail/spider-lunge", "oneshot", 1.0, "The wolf spider's lunge.",
      "A sudden fast heavy pounce, a rush of legs and a dull thump onto moss. " + CLEAN, variants=2),
    # Mite
    S("mite/jump", "oneshot", 0.5, "The jump launch (A).",
      "A tiny explosive springy snap and a short airy flick, like a flea leaping off a dry leaf. " + CLOSE, variants=2),
    S("mite/land", "oneshot", 0.5, "Landing from a jump.",
      "A tiny hard dry tick-thud of a little armoured body landing on dry moss, a light skitter. " + CLOSE, variants=3),
    S("mite/crouch", "oneshot", 1.0, "Holding A: the crouch quivering at full charge.",
      "A tiny tense creaking and fine trembling of small hard legs bracing, rising tension. " + CLOSE, volume=0.6),
    S("mite/strike", "oneshot", 0.5, "X: the lunge and chelicerae snap (every press).",
      "A tiny fast lunge and crisp hard pincer snap, a quick clack of tiny jaws. " + CLOSE, variants=3),
    S("mite/devour", "oneshot", 1.8, "Eating a springtail (the devour).",
      "Tiny busy crunchy chewing and crackling, small jaws working quickly through something crisp. " + CLOSE),
    S("mite/drop-fall", "oneshot", 1.5, "A drop of water falling into the moss.",
      "A drop of water forming, stretching and letting go from a leaf tip, a wet tick then a short rushing fall. " + CLEAN),
    S("mite/drop-splash", "oneshot", 1.2, "The drop splashing down beside the mite.",
      "A big heavy drop of water smacking into dry moss close to the microphone, a wet slap and a spray of droplets. " + CLEAN, variants=2),
    S("mite/predator-windup", "oneshot", 1.0, "The predatory mite rears to strike (wind-up).",
      "A short tense dry rasp and creak, long thin legs rearing up, a threat about to strike. " + CLOSE),
    S("mite/predator-strike", "oneshot", 0.6, "The predatory mite's strike.",
      "A fast vicious dry snap-lunge, sharp tiny jaws striking. " + CLOSE, variants=2),
    S("mite/glance", "oneshot", 0.5, "A strike sliding off the closed capsule.",
      "A tiny hard tick and scrape, something sharp glancing off a smooth hard shell. " + CLOSE, variants=2),
    S("mite/pincer", "oneshot", 0.8, "The pseudoscorpion's pincer snapping.",
      "A heavier crisp claw snap, a small pincer clacking shut hard, then a scrape. " + CLOSE, variants=2),
    # Tardigrade
    S("tardigrade/attack", "oneshot", 0.6, "X at a foe: the lunge and stylet snap.",
      "A quick soft underwater lunge ending in a tiny sharp needle click, a jab. " + CLOSE, variants=3),
    S("tardigrade/impact", "oneshot", 0.6, "The attack landing on a foe.",
      "A soft heavy squishy thump underwater, a padded body bumping hard into another. " + CLOSE, variants=2),
    S("tardigrade/feed", "oneshot", 1.5, "Feeding: sucking a cell's contents through the stylets.",
      "A tiny slow wet sucking slurp drawn through a very thin straw underwater, pulsing gently. " + CLOSE, variants=2),
    S("tardigrade/brace", "oneshot", 0.6, "B: gripping hard, claws digging in.",
      "Tiny claws digging into a soft surface with a squeak and a firm wet grip. " + CLOSE),
    S("tardigrade/prionchulus", "oneshot", 2.0, "Prionchulus (the nematode boss) thrashing.",
      "A long slick body whipping and thrashing through water, wet sinuous swishes, powerful and unsettling. " + CLOSE),
    S("tardigrade/whip", "oneshot", 0.8, "Prionchulus's whip strike.",
      "A fast wet whip crack underwater, a slick body lashing. " + CLOSE, variants=2),
    # Amoeba
    S("amoeba/drain", "loop", 6, "Being drained by a trap fungus (the stain spreading, the membrane trembling).",
      "A steady sickly seeping, a constant soft wet hiss of fluid drawn out with a faint trembling flutter, never pausing, "
      "even level. Seamless. " + CLOSE, 0.6, volume=0.7),
    S("amoeba/tremble", "oneshot", 1.0, "The membrane trembling where it is drained or poisoned.",
      "A soft wet quivering wobble, jelly trembling. " + CLOSE, variants=2, volume=0.6),
    S("amoeba/squish", "oneshot", 0.6, "Subtle: the cell changing shape (spread, round up).",
      "A very soft subtle gooey squish of soft jelly shifting. " + CLOSE, variants=3, volume=0.4),
    S("amoeba/roll", "oneshot", 1.0, "Subtle: the cell turning (rotating).",
      "A slow soft viscous rolling slosh, thick slime turning over. " + CLOSE, variants=2, volume=0.4),
    S("amoeba/stick", "oneshot", 0.6, "Touching a sticky trap hypha: stuck.",
      "A small tacky sticky squelch, slime stuck to glue. " + CLOSE),
    S("amoeba/tear", "oneshot", 0.8, "Tearing free of a trap (the surge breaks out).",
      "A gooey stretching tear and a wet release pop. " + CLOSE, variants=2),
    S("amoeba/pierce", "oneshot", 0.8, "Haustoria piercing the membrane.",
      "A slow soft wet puncture, something thin pushing into jelly with a small pop. " + CLOSE),
    S("amoeba/pinch", "oneshot", 0.8, "X: pinching off Chaos's pseudopod.",
      "A soft gooey pinch and a wet snip, slime pinched off. " + CLOSE, variants=2),
    S("amoeba/chaos", "oneshot", 2.5, "Chaos, the giant amoeba, flowing in.",
      "A deep slow massive gooey surge, an enormous mass of thick slime flowing closer, low and heavy. " + CLOSE),
    S("amoeba/chaos-windup", "oneshot", 1.5, "Chaos rears its pseudopods to cup (or gathers to lunge).",
      "A deep slow rising gooey stretch, huge slime arms rising and spreading, building. " + CLOSE),
    S("amoeba/chaos-engulf", "oneshot", 2.0, "Cupped and engulfed by Chaos.",
      "A huge deep wet enveloping gulp, a giant soft mass folding round and sealing with a muffled squelch. " + CLOSE),
    S("amoeba/death", "oneshot", 2.5, "The cell goes slack and breaks up.",
      "A soft slow deflating sigh of jelly going slack, then a gentle scattering of tiny granules drifting apart. " + CLOSE, 0.5),
    S("amoeba/reform", "oneshot", 2.0, "A fresh cell gathers itself up.",
      "Tiny granules softly gathering and a gooey jelly drawing together, a gentle swelling into a whole. " + CLOSE, 0.5),
    # Paramecium (the 2.5D darkfield slide)
    S("paramecium/depth", "oneshot", 0.8, "RS / LB / RB: moving deeper or shallower.",
      "A soft smooth underwater glide, a gentle airy pressure shift, very subtle. " + CLOSE, variants=2, volume=0.5),
    S("paramecium/burst", "oneshot", 1.0, "B with a charge: the trichocyst burst all round.",
      "A big bright burst of hundreds of tiny needle-like snaps fired all around at once, a crackling explosive spray underwater. " + CLOSE),
    S("paramecium/stun", "oneshot", 0.6, "The jab landing: a foe stunned or staggered.",
      "A small soft knock and a fizzy sting, something prickled and recoiling. " + CLOSE, variants=2),
    S("paramecium/dileptus", "oneshot", 1.0, "Dileptus winds its trunk back (the tell).",
      "A slow wet swishing coil, a long flexible trunk drawing back underwater, tense. " + CLOSE),
    S("paramecium/slash", "oneshot", 0.6, "Dileptus's slash.",
      "A fast wet slicing whip underwater, a lash. " + CLOSE, variants=2),
    S("paramecium/giant", "oneshot", 2.5, "The giant amoeba reaching for you.",
      "A deep slow looming gooey flow, a huge soft mass of slime reaching closer underwater. " + CLOSE),
    S("paramecium/giant-engulf", "oneshot", 2.0, "Closed round by the giant amoeba.",
      "A deep wet enveloping squelch, an enormous soft mass folding around and closing. " + CLOSE),
    S("paramecium/trap-tell", "oneshot", 1.5, "The bladderwort trap's door quivering (about to fire).",
      "A tense taut creaking strain of a sealed elastic door under pressure underwater, a faint high quiver building. " + CLOSE),
    S("paramecium/trap-fire", "oneshot", 1.0, "The bladderwort trap fires: a sudden suction.",
      "An instant violent underwater suction pop, a door snapping open and water rushing in with a deep gulp, then sealing shut. " + CLOSE, variants=2),
    S("paramecium/divide", "oneshot", 1.5, "The cell divides (prey goal reached).",
      "A soft gooey stretching pinch and a wet pop as one soft cell splits into two, pleasant and satisfying. " + CLOSE, 0.5),
    S("paramecium/vorticella", "oneshot", 0.6, "A Vorticella's stalk contracting nearby.",
      "A quick springy coiling zip, a tiny stalk snapping into a coil underwater. " + CLOSE, variants=2, volume=0.5),
    S("paramecium/bloom", "oneshot", 0.8, "The dash flinging bloom cells aside.",
      "A soft fizzy scatter, many tiny particles swept aside underwater. " + CLOSE, volume=0.6),
    # Bacterium
    S("bacterium/beacon", "oneshot", 1.2, "X: the beacon (an autoinducer pulse from the flock's middle).",
      "A soft round expanding underwater pulse, a gentle bubbly ripple spreading outward. " + CLOSE, 0.5, variants=2),
    S("bacterium/answer", "oneshot", 0.5, "A kin cell answers the beacon.",
      "One tiny bright soft watery blip. " + CLOSE, variants=3, volume=0.5),
    S("bacterium/join", "oneshot", 0.5, "A kin cell joins the flock.",
      "A tiny soft wet click and pop, a little cell snuggling in. " + CLOSE, variants=3, volume=0.5),
    S("bacterium/toxin", "oneshot", 1.5, "Y: the toxin burst.",
      "A big fizzy explosive pop and a crackling spreading hiss, a cloud of tiny bubbles bursting outward. " + CLOSE),
    S("bacterium/lyse", "oneshot", 0.6, "A prey rod lysed.",
      "A small wet bursting pop and a fizzing spill. " + CLOSE, variants=2),
    S("bacterium/strike", "oneshot", 0.5, "A volley: the flock striking an enemy.",
      "A quick flurry of tiny soft wet jabs. " + CLOSE, variants=2),
    S("bacterium/stentor", "oneshot", 3.0, "Stentor's membranelles speeding up, its vortex brightening (the tell).",
      "A swirling underwater vortex building into a roaring whirlpool, rising in speed and pitch, menacing. " + CLEAN),
    S("bacterium/bdello", "oneshot", 0.6, "Bdellovibrio ramming.",
      "A tiny sharp whizzing rush ending in a hard little knock. " + CLOSE, variants=2),
    S("bacterium/gate", "oneshot", 2.0, "A gate beaten (a grazer or pack driven off).",
      "A warm rising organic swell of many tiny fizzing bubbles lifting together, triumphant and soft. " + CLOSE, 0.5),
    S("bacterium/infected", "oneshot", 0.8, "A member lost to a phage.",
      "A small sad soft deflating fizz, a tiny cell fading out. " + CLOSE, volume=0.7),
    # Phage (it borrowed the bacterium's sounds until now)
    S("phage/amb-water", "loop", 12, "Ambience: crowded molecular bog water (the phage world).",
      "A dense, very fine soft shimmering hiss of countless tiny molecules jostling, faint delicate ticks and a calm deep hush "
      "underneath, crowded but serene. Even, continuous, seamless. " + CLEAN, 0.5),
    S("phage/grab", "oneshot", 0.5, "X / RT: the fibres close on something.",
      "A tiny quick soft clasp, thin fibres closing on something with a small sticky click. " + CLOSE, variants=3),
    S("phage/release", "oneshot", 0.5, "Letting go.",
      "A tiny soft unclasping, a gentle sticky release and a light push off. " + CLOSE, variants=2),
    S("phage/miss", "oneshot", 0.5, "A grab with nothing in reach (or a wrong protein: slipping off).",
      "A tiny soft empty swipe, thin fibres closing on nothing. " + CLOSE, volume=0.6),
    S("phage/throw", "oneshot", 0.5, "Flinging a carried molecule.",
      "A quick tiny flick and a soft whoosh of something small tossed away. " + CLOSE, variants=2),
    S("phage/fold", "oneshot", 0.6, "B: folding the fibres back (and out again).",
      "A soft quick rustling fold, thin fibres sweeping back against a stem. " + CLOSE, variants=2),
    S("phage/dash", "oneshot", 0.6, "A: the dash forward.",
      "A quick soft darting whoosh, something tiny shooting forward through water. " + CLOSE, variants=2),
    S("phage/jab", "oneshot", 0.5, "X at the amoeba's lobe: a fibre jab.",
      "A tiny sharp poke into soft jelly, a quick prick and recoil. " + CLOSE, variants=2),
    S("phage/lobe", "oneshot", 1.5, "The amoeba's lobe rearing and lunging.",
      "A deep slow looming gooey surge rising and lunging, a huge soft mass reaching. " + CLOSE),
    S("phage/current-coming", "oneshot", 4.0, "A current approaching (seen coming).",
      "A low distant underwater rushing whoosh slowly building and getting closer, a wave of water approaching. " + CLEAN),
    S("phage/current-pass", "oneshot", 3.0, "The current sweeping past.",
      "A full rushing underwater sweep passing right by, a strong swirling flow that washes over and fades away. " + CLEAN),
    S("phage/latch", "oneshot", 0.6, "The fibres latching on a receptor.",
      "A firm tiny sticky lock-on click, something minute docking snugly into place. " + CLOSE, variants=2),
    S("phage/sheath", "oneshot", 1.0, "The tail sheath contracting (the injection snap).",
      "A sharp tight springy contraction snap, a tiny coiled tube punching down with a firm pop. " + CLOSE),
    S("phage/inject", "oneshot", 2.5, "The DNA sliding into the host.",
      "A long smooth slithering draw, a thin strand being pulled through a tiny tube, wet and steady. " + CLOSE),
    S("phage/cas", "oneshot", 0.8, "Cas3 swinging in to cut (inside the host).",
      "A quick tight clamping snip, tiny molecular scissors closing, organic and sharp. " + CLOSE, variants=2),
    S("phage/burst", "oneshot", 2.5, "The host bursting: forty new phages spill out.",
      "A soft wet bursting pop of a swollen cell rupturing, then a fizzing spray of many tiny particles spilling out. " + CLOSE),
    S("phage/snag", "oneshot", 0.8, "Snagged in a humic floc, or stuck to clay.",
      "A soft fibrous tangling drag, thin fibres catching in a fluffy clump with a gritty rasp. " + CLOSE),
    # Shell (game/src): menus, intros, pause and the zoom between worlds. Today these are synthesised in
    # game/src/sound.js; these are generated alternatives.
    U("ui/move", 0.5, "Menu focus moving (d-pad, stick, hover).",
      "One tiny crisp brass tick, like a fine focus knob clicking one notch.", variants=3, volume=0.5),
    U("ui/select", 0.6, "Menu select (A).",
      "A small satisfying brass click of a microscope objective turret locking into place, with a faint glassy ring.", variants=2),
    U("ui/back", 0.6, "Menu back (B).",
      "A soft lower brass click and a gentle slide back, a turret turning back a notch.", variants=2),
    U("ui/intro-in", 1.2, "A world's intro card sliding in.",
      "A soft smooth brass slide and a glass slide being placed on a microscope stage, a gentle whoosh ending in a soft click.", volume=0.7),
    U("ui/intro-out", 1.0, "The intro card sliding away.",
      "A soft smooth glass slide sliding off a brass stage, a gentle whoosh fading.", volume=0.7),
    U("ui/pause", 0.8, "Pause.",
      "A soft muted brass click and a gentle falling hush, like a shutter closing.", volume=0.7),
    U("ui/resume", 0.8, "Resume.",
      "A soft brass click and a gentle rising airy breath, like a shutter opening.", volume=0.7),
    U("ui/card", 0.8, "The controls card opening (and closing).",
      "A soft paper card sliding out of a brass holder, a light papery whoosh.", variants=2, volume=0.6),
    U("ui/zoom-in", 4.0, "The zoom from one world into the next (the transition).",
      "A long smooth deep rising whoosh of a microscope racking in focus, a slow airy swell with soft shimmering glass resonance, "
      "wondrous, ending gently."),
    U("ui/zoom-out", 3.0, "The zoom back out to the previous world.",
      "A long smooth falling whoosh of a microscope racking out, an airy swell receding, soft glass resonance fading."),
    U("ui/start", 2.0, "Starting a game from the title.",
      "A warm bright brass and glass flourish: a soft click and a rising shimmer of tiny glass chimes, inviting."),
]

# Where each sound added on 2026-11-02 is played: (id, event, where). Wired on 2 November 2026: each is
# an audio.play(id) at the event named, in that world's createAudio([...]) list so it preloads; the
# shell's ui/ sounds are game/src/sound.js's, with its synthesised sounds as the fallback.
WIRING = [
    ("shared/portal-enter", "Y at the open portal", "enterPortal() in springtail, mite, tardigrade, amoeba, paramecium and bacterium, just before startOutro() (amoeba and bacterium: beside the chime); phage tryEnter() when Y takes the open receptor"),
    ("shared/slowdown", "the success slow-down", "next to shared/portal-chime with { delay: OUTRO.beat }: startOutro() in springtail, mite, tardigrade and paramecium; enterPortal() in amoeba and bacterium (their chime is there). Not in the phage (no outro: the burst ends the chain)"),
    ("shared/portal-near", "\"Y Enter the portal\" appears", "setPortalPrompt(on) as it turns on (mite, tardigrade, amoeba, paramecium, bacterium); springtail checkLandmark() as lm.readyOn turns true; phage updatePortalPrompt()"),
    ("shared/portal-sealed", "Y at a sealed or guarded portal", "the sealed and the guarded (turned back) branches: springtail checkLandmark(), mite checkLandmarks(), tardigrade checkPortal(), amoeba checkLandmarks(), paramecium stepLandmarks(), bacterium landmarkTick(); phage tryGrab() and tryEnter()"),
    ("shared/portal-appear", "the way on unseals", "on the edge where the portal stops being sealed (an lm.wasSealed flag): springtail checkLandmark() (sealed()), mite checkLandmarks(), tardigrade checkPortal(), amoeba checkLandmarks(), paramecium stepLandmarks(), bacterium landmarkTick(), phage updatePortalPrompt()"),
    ("shared/backdoor", "Y at the backdoor", "next to embed.landmark('back'): mite goBack(), tardigrade fireLandmark('back'), amoeba frame() (c.atBack), paramecium readInput(), bacterium landmark('back'), phage stepMember()"),
    ("shared/danger", "a predator's wind-up (generic)", "springtail stepWorld() on Stenus's and the strider's 'windup' and the wolf spider's 'tell'; mite tick() on the pseudoscorpion's 'tell' (the other wind-ups have sounds of their own)"),
    ("shared/block", "a braced block", "springtail wearDown() for a block (in place of the land-water splash at rate 1.6); tardigrade step() 'blocked' from Prionchulus and Milnesium (in place of the slowed tardigrade/bite); phage updateGuard() when the lobe slides off"),
    ("shared/hit", "knocked or stunned", "mite stepLife() once per splash that reaches a player; bacterium absorbHit() (at most every 0.3 s a player)"),
    ("shared/death", "dissolving (generic)", "springtail die() and the sundew catch's 'eat' phase (animateCapture); paramecium kill() 0.5 s after paramecium/held; bacterium startCatch() (0.4 s after); phage startCapture() unless the genome was cut"),
    ("shared/reform", "re-forming from motes", "springtail startReform(); mite afterCatch() and respawnNear(); tardigrade respawnSafe() and respawnNear(); paramecium respawn(); bacterium respawnPlayer(); phage respawn()"),
    ("shared/foe-flees", "a predator gives up", "springtail wearDown(), missFoe(), the fights' retreat and the spider's 'retreat'; mite wearDown(), the predator's retreat, the pseudoscorpion beaten (stepAct) or retreating; tardigrade 'retreat' from Prionchulus and Milnesium; amoeba stepChaos() 'retreat'; paramecium 'fled'; phage updateGuard() when the lobe is driven off"),
    ("shared/join", "another player joins", "the players' onJoin in every world's main.js"),
    ("springtail/charge", "A held: cocking the furcula", "stepPlayer() on the edge where P.charging turns true (P.wasCharging)"),
    ("springtail/flip", "landing on its back", "landAt() where the landing flips it, and stepPlayer() where a wave flips it"),
    ("springtail/right", "righting itself", "stepPlayer() where P.rightT = 0 (the flick back over)"),
    ("springtail/pounce", "the pounce-bite lands", "diveImpact() on a hit (in place of springtail/eat at rate 1.2)"),
    ("springtail/glue-snap", "a glue strand snaps", "poseTail(): sundew-glue.js update() returns the strands snapped this frame; heard at most every 0.1 s (in place of the land-sticky stand-in)"),
    ("springtail/struggle", "wriggling and kicking in glue", "stepPlayer() in the stuck branch on each kick (r.kick), at most every 0.35 s"),
    ("springtail/tear-free", "torn free of the sundew", "stepPlayer() when the sundew struggle escapes (r.escaped) and when it wriggles free of Stenus's labium"),
    ("springtail/sundew-fold", "slipped back: the leaf closes", "animateCapture() as the sundew catch's 'strike' phase starts"),
    ("springtail/strider", "the strider skating in", "stepWorld() when the strider first hears you (the 'heard' event with its toast)"),
    ("springtail/spider", "the wolf spider stalking", "stepWorld() on the wolf spider's 'wake' (it engages)"),
    ("springtail/spider-lunge", "the wolf spider's lunge", "stepWorld() on the wolf spider's 'lunge' and 'pounce' (in place of the slowed stenus-strike)"),
    ("mite/jump", "the jump launch", "soundTick() on 'jump' (in place of mite/dash at rate 1.3)"),
    ("mite/land", "landing", "soundTick() on 'land' (in place of the slowed mite/step)"),
    ("mite/crouch", "A held: crouching to jump", "soundTick() when mite.mode turns 'crouch' (every jump crouches first: kept quiet)"),
    ("mite/strike", "X: lunge and snap", "stepAct() 'strike' at the snap; mite/bite stays for a bite on a springtail, mite/glance for a box mite's shut capsule"),
    ("mite/devour", "eating a springtail", "stepAct() 'devour' at the first snap (the repeated bites dropped)"),
    ("mite/drop-fall", "a drop falling", "stepLife() on a drop's 'fall' (in place of the slowed mite/dash)"),
    ("mite/drop-splash", "the drop splashing down", "stepLife() on a drop's 'splash' (in place of the slowed mite/close)"),
    ("mite/predator-windup", "the predatory mite rears", "tick() predator events, 'windup' (with the toast)"),
    ("mite/predator-strike", "its strike", "tick() predator events, 'strike'"),
    ("mite/glance", "a strike sliding off the capsule", "tick() on the predator's 'blocked' (a strike sliding off the closed capsule) and the pseudoscorpion's 'survived'; stepAct() when a strike glances off a box mite"),
    ("mite/pincer", "the pseudoscorpion's pincer", "startBossCapture() and the pseudoscorpion's 'snap' (sweep and step keep the slowed mite/predator)"),
    ("tardigrade/attack", "X at a foe: lunge and stylets", "startAttack()"),
    ("tardigrade/impact", "the attack lands", "step(): Prionchulus 'bitten' and Milnesium 'recoil', with tardigrade/bite"),
    ("tardigrade/feed", "feeding", "step() when feeding starts (in place of tardigrade/bite), then every 1.5 s while it feeds"),
    ("tardigrade/brace", "B: gripping hard", "step() when B is pressed (active, not held)"),
    ("tardigrade/prionchulus", "Prionchulus thrashing", "step() Prionchulus 'windupWhip' and 'windupThrash'"),
    ("tardigrade/whip", "Prionchulus's whip strike", "step() Prionchulus 'strike' (in place of the slowed tardigrade/dash)"),
    ("amoeba/drain", "being drained (loop)", "soundTick(): a loop (cell.drainSnd) while a trap fungus's catch is in its 'eat' phase; stopped as the catch moves on, ends, is torn free, or the player leaves"),
    ("amoeba/tremble", "the membrane trembling", "soundTick(): every 1 s while caught in 'hold' or 'eat'"),
    ("amoeba/squish", "changing shape (subtle)", "soundTick(): LT pressed or released (spread / round up), at most every 0.3 s, quiet"),
    ("amoeba/roll", "turning (subtle)", "soundTick(): the cell's front turning fast (over 0.8 rad/s, moving), at most every 1.5 s, quiet"),
    ("amoeba/stick", "stuck on a trap hypha", "trapStep where the 'Caught on a fungal trap hypha' toast shows (n && !C.stuckN)"),
    ("amoeba/tear", "tearing free", "stepCatch() at 'Torn free!' and stepEngulf() at 'Surged out!'"),
    ("amoeba/pierce", "haustoria pierce", "startCatch() (in place of the slowed amoeba/engulf)"),
    ("amoeba/pinch", "pinching off Chaos's arm", "pinchChaos() (in place of amoeba/engulf at rate 1.4) and pinchOff()"),
    ("amoeba/chaos", "Chaos flowing in", "stepChaos() on 'wake' (Chaos starts its chase)"),
    ("amoeba/chaos-windup", "Chaos rears / gathers", "stepChaos() on 'windupCup' and 'windupLunge'"),
    ("amoeba/chaos-engulf", "engulfed by Chaos", "startEngulf() (in place of the slowed amoeba/engulf)"),
    ("amoeba/death", "the cell dies", "stepCatch() and stepEngulf() as the phase turns 'die'"),
    ("amoeba/reform", "a fresh cell gathers", "captureRespawn() (solo or beside a teammate: respawnCell)"),
    ("paramecium/depth", "deeper / shallower", "readInput() on the edge where the depth input passes half (rate 0.9 deeper, 1.1 shallower)"),
    ("paramecium/burst", "B: the trichocyst burst", "defend() when a charge is spent, with paramecium/trichocysts"),
    ("paramecium/stun", "the jab lands", "attack() when the jab lands on Dileptus, a Didinium or the giant's pseudopod"),
    ("paramecium/dileptus", "Dileptus winds back", "stepWorld() on 'tell' from Dileptus"),
    ("paramecium/slash", "Dileptus slashes", "kill() by Dileptus, and stepWorld() on Dileptus's 'miss' (the slash sweeping past)"),
    ("paramecium/giant", "the giant amoeba reaching", "stepWorld() on the giant's new 'hunt' event (foes.js stepGiant: it starts reaching for a player), at most every 4 s"),
    ("paramecium/giant-engulf", "closed round by the giant", "stepWorld() on 'engulf' (in place of paramecium/held)"),
    ("paramecium/trap-tell", "the trap's door quivers", "stepWorld() on 'trap-tell'"),
    ("paramecium/trap-fire", "the trap fires", "stepWorld() on 'trap-pulse'"),
    ("paramecium/divide", "the cell divides", "ate() where game.divided++"),
    ("paramecium/vorticella", "a Vorticella contracts", "stepWorld(): world.js stepVorticella() now returns the Vorticellae a swimmer startled this step (contracted by near() from extended); heard at most every 0.25 s"),
    ("paramecium/bloom", "the dash flings bloom cells", "readInput() on a dash when flingBloom() flings any bloom cells (it now returns how many)"),
    ("bacterium/beacon", "X: the beacon", "coll onBeacon (in place of bacterium/eat at rate 1.9)"),
    ("bacterium/answer", "a kin cell answers", "coll onRecruit, the first recruit after each beacon (at most every 0.3 s)"),
    ("bacterium/join", "a kin cell joins", "coll onRecruit (in place of bacterium/tumble at rate 1.7), at most every 0.25 s"),
    ("bacterium/toxin", "Y: the toxin burst", "toxinBurst() (in place of bacterium/eat at rate 0.55)"),
    ("bacterium/lyse", "a prey rod lysed", "pressX() when prey is lysed and guards onKill (in place of bacterium/eat)"),
    ("bacterium/strike", "a volley on an enemy", "pressX() when the volley hits an enemy"),
    ("bacterium/stentor", "Stentor's tell", "runBoss() as Stentor's fight turns 'windup' (bossInfo.log 'tell')"),
    ("bacterium/bdello", "Bdellovibrio rams", "runFights() as a Bdellovibrio's fight turns 'strike' (it rams)"),
    ("bacterium/gate", "a gate beaten", "guards onBeaten (in place of bacterium/eat at rate 0.6)"),
    ("bacterium/infected", "a member lost to a phage", "guards onInfected, and coll onLost for a member lost to a phage (at most every 0.5 s)"),
    ("phage/amb-water", "ambience", "audio.loop('phage/amb-water') in place of bacterium/amb-sediment (the world's ambience: always on, through the Ambience switch)"),
    ("phage/grab", "the fibres close on something", "holdCell(), holdMol() and the grab of a fitting protein in tryGrab() (in place of bacterium/tumble), at most every 0.25 s a player"),
    ("phage/release", "letting go", "releaseHold() with a push (in place of bacterium/tumble at rate 1.3)"),
    ("phage/miss", "nothing in reach, or the wrong protein", "tryGrab() with nothing in reach and at the wrong protein ('does not fit'); updateGrab() when it slips off; at most every 0.3 s a player"),
    ("phage/throw", "flinging a carried molecule", "stepMember(): A (the dash) while carrying a molecule, in place of phage/dash"),
    ("phage/fold", "B: fold / unfold", "stepMember() at the fold toggle (rate 1.15 unfolding)"),
    ("phage/dash", "A: dash", "stepMember() at the dash (in place of bacterium/sprint)"),
    ("phage/jab", "X at the lobe", "tryJab() (in place of bacterium/sprint at rate 1.4)"),
    ("phage/lobe", "the lobe rears and lunges", "updateGuard() as the lobe's fight turns 'windup'"),
    ("phage/current-coming", "a current seen coming", "stepCurrents() on 'start' (in place of bacterium/sprint at rate 0.45)"),
    ("phage/current-pass", "the current sweeps past", "stepCurrents() where curWarned turns true"),
    ("phage/latch", "fibres latch on a receptor", "beginCommit() (in place of bacterium/phage)"),
    ("phage/sheath", "the sheath contracts", "updateCommit() at P.snapped (in place of bacterium/eat at rate 0.8)"),
    ("phage/inject", "the DNA slides in", "updateCommit() once, after the sheath snap, as the genome starts in (commitT 2.1 s)"),
    ("phage/cas", "Cas3 swings in", "stepMember() as the CRISPR lock (inside.bossLock()) turns 'windup'"),
    ("phage/burst", "the host bursts", "updateBurst() where the progeny spill (in place of bacterium/graze)"),
    ("phage/snag", "snagged in a floc / stuck to clay", "updateDrift() at the floc snag and enterClay() (in place of bacterium/tumble)"),
    ("ui/move", "menu focus moves", "game/src/sound.js tick() (focus moves), at most every 0.07 s"),
    ("ui/select", "menu select", "game/src/sound.js select()"),
    ("ui/back", "menu back", "game/src/sound.js back()"),
    ("ui/zoom-in", "the zoom into the next world", "game/src/sound.js zoom('in', seconds), stretched to the move (playbackRate = its length / seconds, 0.5-2): the continuous transition and the microscope zoom"),
    ("ui/zoom-out", "the zoom back out", "game/src/sound.js zoom('out', seconds): the microscope zoom back out (transition.js)"),
    ("ui/intro-in", "an intro card slides in", "game/src/sound.js introIn(): main.js openIntro()"),
    ("ui/intro-out", "the intro card leaves", "game/src/sound.js introOut(): main.js closeIntro() (back to the tray)"),
    ("ui/pause", "pause", "game/src/sound.js pause(): main.js pause(), before setPaused(true) (heard over the paused mute)"),
    ("ui/resume", "resume", "game/src/sound.js resume(): main.js resume()"),
    ("ui/card", "the controls card opens / closes", "game/src/sound.js card(): main.js selectCard(), the world card changing in the tray"),
    ("ui/start", "starting from the title", "game/src/sound.js start(): Press Start on the title and Begin (beginPlay())"),
]


def files(s):
    if s["variants"] == 1:
        return [f"{s['id']}.mp3"]
    return [f"{s['id']}-{i + 1}.mp3" for i in range(s["variants"])]


def api_key():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        p = Path.home() / ".config" / "elevenlabs.key"
        if p.exists():
            key = p.read_text().strip()
    if not key:
        sys.exit("No ElevenLabs key: set ELEVENLABS_API_KEY or write ~/.config/elevenlabs.key")
    return key


COST = {"credits": 0, "calls": 0}


def request(s, key, loop):
    body = {"text": s["prompt"], "duration_seconds": s["seconds"], "prompt_influence": s["influence"],
            "model_id": "eleven_text_to_sound_v2"}
    if loop:
        body["loop"] = True
    req = urllib.request.Request(API, data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as res:
        cost = res.headers.get("character-cost") or res.headers.get("x-character-count")
        COST["calls"] += 1
        if cost and cost.isdigit():
            COST["credits"] += int(cost)
        return res.read()


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def process(src, out: Path, s):
    out.parent.mkdir(parents=True, exist_ok=True)
    loud = "loudnorm=I=-20:TP=-2:LRA=11" if s["kind"] == "loop" else "loudnorm=I=-17:TP=-1.5:LRA=11"
    if s["kind"] == "loop":
        d = duration(src)
        x = min(XFADE, d / 4)
        # body + crossfade(tail -> head): plays body, then the tail fading into the
        # head, whose end leads straight back into the body. Seamless.
        graph = (
            f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=3[a][b][c];"
            f"[a]atrim={x}:{d - x},asetpts=PTS-STARTPTS[body];"
            f"[b]atrim={d - x}:{d},asetpts=PTS-STARTPTS[tail];"
            f"[c]atrim=0:{x},asetpts=PTS-STARTPTS[head];"
            f"[tail][head]acrossfade=d={x}:c1=qsin:c2=qsin[seam];"
            f"[body][seam]concat=n=2:v=0:a=1,{loud}[out]"
        )
    else:
        graph = (f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,"
                 f"silenceremove=start_periods=1:start_threshold=-55dB,afade=t=out:st={max(0.1, s['seconds'] - 0.25)}:d=0.25,{loud}[out]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-filter_complex", graph, "-map", "[out]",
                    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", str(out)], check=True)


def levels(path):
    """Loudness in dB of each quarter second, and of the first and last 50 ms."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "22050", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    import array, math
    x = array.array("h", raw)
    def db(a):
        return 20 * math.log10(math.sqrt(sum(v * v for v in a) / max(1, len(a))) / 32768 + 1e-9)
    q = 22050 // 4
    return [db(x[i:i + q]) for i in range(0, len(x) - q, q)], db(x[:1100]), db(x[-1100:])


def steady(path):
    """A wind loop must never drop out, stay even, and match level across the seam."""
    segs, head, tail = levels(path)
    return min(segs) > -42 and max(segs) - min(segs) < 15 and abs(head - tail) < 6


def generate(s, key, force=False):
    for name in files(s):
        out = OUT / name
        if out.exists() and not force:
            continue
        for attempt in range(4):
            try:
                raw = request(s, key, s["kind"] == "loop")
            except urllib.error.HTTPError as e:
                raise SystemExit(f"{name}: ElevenLabs returned {e.code}: {e.read()[:300]!r}")
            with tempfile.NamedTemporaryFile(suffix=".mp3") as tmp:
                tmp.write(raw)
                tmp.flush()
                process(tmp.name, out, s)
            if s["kind"] != "loop" or steady(out):
                break
            print(f"  {name}: uneven take, trying again")
        else:
            print(f"  {name}: kept the last take, still uneven")
        print(f"made {out.relative_to(ROOT.parent)} ({duration(str(out)):.2f} s)")


def audio_list():
    data = {}
    for s in SOUNDS:
        present = [f"assets/audio/{n}" for n in files(s) if (OUT / n).exists()]
        data[s["id"]] = {"kind": s["kind"], "files": present, "volume": s.get("volume", 1)}
    return (
        "// Generated by micro/design/source/build_audio.py. Do not edit by hand.\n"
        "// Sounds listed with no files are not generated yet; the game synthesises\n"
        "// nothing (or its own stand-in) for them. Paths are relative to micro/prototypes/.\n"
        "export const SOUNDS = " + json.dumps(data, indent=2) + ";\n"
    )


def document():
    out = [
        "# Micro prototypes: sound effects",
        "",
        "Generated with ElevenLabs sound effects (`eleven_text_to_sound_v2`) by "
        "[`source/build_audio.py`](source/build_audio.py); edit the data there and rerun it. "
        "Loops are generated as loops and crossfaded tail-to-head so they repeat seamlessly; "
        "everything is loudness-matched (loops at -20 LUFS, one-shots at -17). The prototypes play "
        "them through `micro/prototypes/shared/audio.js`.",
        "",
        "Nothing makes a sound we could hear at these scales, so this is nature-documentary foley, as a "
        "wildlife film of these scenes would score them: each sound is "
        "what the action would feel like if you could hear it, scaled to the creature. The deeper the "
        "zoom, the more abstract it gets: bog and moss sounds for the springtail and mite, wet and "
        "viscous sounds for the water film and the pool, fizzing and rotary motor sounds for the bacterium.",
        "",
    ]
    for proto, title in GROUPS:
        out += [f"## {title}", "", "| Id | Kind | Length | Files | Used for |", "| --- | --- | --- | --- | --- |"]
        for s in [s for s in SOUNDS if s["id"].split("/")[0] == proto]:
            out.append(f"| `{s['id']}` | {s['kind']} | {s['seconds']} s | {len(files(s))} | {s['used']} |")
        out.append("")
    out += ["## Wiring", "",
            "Where each sound added on 2 November 2026 plays (wired the same day). Each is an `audio.play(id)` "
            "at the event named, and is in that world's `createAudio([...])` list so it preloads. Frequent "
            "sounds are rate-limited as noted; the two loops (`amoeba/drain`, `phage/amb-water`) start and stop "
            "with their condition. Where a new sound replaces a borrowed or slowed stand-in, the row says so; "
            "the phage keeps a few bacterium sounds that have no phage counterpart (its drift loop, the walk "
            "steps, the surge, the near miss, the captures). The shell's `ui/` sounds replace the synthesised "
            "ones in `game/src/sound.js`, loaded from `../prototypes/assets/audio/ui/` (the synthesised sound "
            "plays while a file loads, or if it fails to).", "",
            "| Id | Event | Where |", "| --- | --- | --- |"]
    out += [f"| `{i}` | {e} | {w} |" for i, e, w in WIRING]
    out += ["", "## Prompts", ""]
    for s in SOUNDS:
        out += [f"### {s['id']}", "", "```text", s["prompt"], "```", ""]
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    args = sys.argv[1:]
    unknown = [i for i, _, _ in WIRING if i not in {s["id"] for s in SOUNDS}]
    if unknown:
        print(f"WIRING names sounds not in SOUNDS: {', '.join(unknown)}")
        return 1
    long = [s["id"] for s in SOUNDS if len(s["prompt"]) > 450]
    if long:
        print(f"prompts over ElevenLabs' 450 characters: {', '.join(long)}")
        return 1
    if "--check" in args:
        stale = []
        for p, text in {LIST: audio_list(), DOC: document()}.items():
            if not p.exists() or p.read_text() != text:
                stale.append(p)
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT.parent)} (rerun build_audio.py)")
        return 1 if stale else 0
    force = set(args[args.index("--force") + 1:]) if "--force" in args else set()
    key = None
    for s in SOUNDS:
        missing = any(not (OUT / n).exists() for n in files(s))
        if missing or s["id"] in force:
            key = key or api_key()
            generate(s, key, force=s["id"] in force)
    if COST["calls"]:
        print(f"{COST['calls']} ElevenLabs calls, {COST['credits'] or 'unknown'} credits (from the response headers)")
    LIST.write_text(audio_list())
    DOC.write_text(document())
    print(f"wrote {LIST.relative_to(ROOT.parent)} and {DOC.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
