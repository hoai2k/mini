### The Garbage Canary: Bin Day (45 s)

A windy street on bin day. The Garbage Canary stands on the pavement, a
dustbin with a canary peering from under the lid, facing into the wind, and
everything the wind picks up blows down the street towards it: paper,
banana peel, tins, apple cores, fish bones, old boots, and also a
gentleman's hat, a letter, a ginger cat and a sparrow. Hold the action and
the lid swings up (the canary's head rises with it); let go and it shuts.
Whatever reaches the bin's rim while the lid is up goes in; whatever finds
it shut bumps over the top and goes on its way. The mechanic is a one-
button gate: judge each thing as it comes, then open just in time and shut
again before the next.

**Scoring.** Rubbish in the bin: +1. Something that isn't rubbish
swallowed: the Canary splutters it out, −1 (never below zero), and its lid
stays shut for 0.9 s. Rubbish that
finds the lid shut is lost and lies in the gutter. Five in a row without a
slip earns a bonus that grows with the run: +1 at five, +2 at ten, +3 at
fifteen.

**Getting harder.** Things come every 1.5 s at first and every 0.6 s by
the end, and faster (330 to 560 px a second). About one in five isn't
rubbish at first, nearly half by the end; the very first thing is always
rubbish. From 10 s on, something that isn't rubbish often follows close
behind rubbish (as little as 0.5 s behind), so the lid must snap shut.
From 14 s, gusts hurry some things along partway, shown by streaks of
wind. Nothing ever arrives less than half a second after the thing before
it.

**Controls.** Controller: hold A. Keyboard: hold Space or Enter. Mouse or
touch: hold anywhere. Nothing else to move. On a narrow screen the view
keeps the bin at the left and the street coming in from the right.

**Pass.** 18 points. Bots: a beginner (opens 0.5 s early, reacts 0.3 s
late, timing off by up to 0.2 s; seeds 1–8) 23–35; a sharp minder 41–44;
holding the lid open all the time 0–11; mashing about 6; idle 0.

**Images.** IC-M08a is the street: houses, pavement, kerb and lamp-post,
with the band where things blow kept plain. IC-M08b is the ten things on
the wind, rubbish and not, which must read at a glance at about 70 px.
IC-M08c is the Canary in two pieces, the bin without its lid and the lid
with the canary's head, drawn in place, so the game can swing the lid up on
its hinge. IC-M08d is the lid piece again with the canary squawking (as it
spits something out) and singing (when a run earns a bonus).

## Changes after the audit

1. Everything that isn't rubbish now carries the same cue: a soft gold glow,
   a gold ring and a twinkling star behind it, so "keep it shut" can be read
   without knowing every object. Everything on the wind is drawn 1.3 times
   bigger (about 85 px). IC-M08b's note now says the game adds the glow.
2. The canary's head is drawn larger in the stand-in, peeping out from under
   the lid's front edge, with its pupil following whatever comes next and its
   beak opening when it squawks or sings. IC-M08c and IC-M08d now ask for a
   large, clearly seen canary head (about a third as wide as the lid).
3. Gaps never go below 0.5 s: the "keeper on rubbish's heels" gap is 0.65 s
   down to 0.5 s, a new arrival is slowed if it would catch the one in front,
   and a gust never brings something within 0.5 s of the one ahead. A test
   checks it on three seeds.
4. Pops that would land on top of one still showing are stacked above it.

Shared item 2 (penalties): swallowing something that isn't rubbish now costs
1, not 2. To keep holding the lid open from paying, the cost is now mostly
time: the Canary splutters and the lid stays shut for 0.9 s, so rubbish
arriving then is lost. Holding the lid open all game scores 0–12 on seeds
1–16, below the pass mark of 18.

## Matched to the painting

The bin's rim, the lid's hinge and the height things cross at are taken
from the painting when it has loaded (rim slanting from 303 units up at the
front to 285 at the back, hinge 87 units behind the middle), so the lid is
cut along the painted rim and swings up on its painted hinge with the
canary's head under it; the dark mouth follows the rim's slant. The lid
sprites (IC-M08c, IC-M08d) are placed at the portrait's own feet line (97%
down), and their prompts now describe the painted bin: fluted, rusty and
dented, with its ring handle, the canary's wing and paper-scrap tail, and
the lid tipped up at the front.

## Matched to the delivered art

The street scene (IC-M08a) is in. Its pavement runs from the house fronts at
582 px to the kerb at 705, so the Canary now stands at 690 (it stood at 770,
on the kerb and road); the rim, the crossing height and the gutter where
missed rubbish lands all follow from that, and the painted lamp-post replaces
the stand-in's. The opening hint is two short lines on a paper backing,
centred on the view, and now says to keep the lid shut for "anything that
glows". Still stand-in: the things on the wind (IC-M08b) and the lid pieces
and calls (IC-M08c, IC-M08d), which are cut from the portrait meanwhile.

The sprites are in too (IC-M08b, IC-M08c, IC-M08d). The things on the wind
are drawn by their painted longer side (about 92 px; the cat 130, the
sparrow 84, the fish bones 112), measured per cell, with the gold glow
still added behind the four that aren't rubbish. The bin and lid pieces are
drawn at the portrait's framing, the lid swung up about its painted back
corner (cell (745, 322), 95 units behind the middle and 276 up), and the
squawking and singing lids swap in over it; the code-drawn dark mouth is
left out, as the painted bin has its own. Nothing is stand-in any more.
