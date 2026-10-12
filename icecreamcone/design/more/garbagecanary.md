### The Garbage Canary: Bin Day (45 s)

A windy street on bin day, and all sorts of things blowing down it from the
right at every depth, some along the pavement, some out over the cobbles:
paper, banana peel, tins, apple cores, fish bones, old boots, and also a
gentleman's hat, a letter, a ginger cat and a sparrow. The Garbage Canary is
a dustbin on legs with a canary living inside it. You walk the bin about,
left and right a little (x 200 to 900) and back and forth across the
pavement and the road (its feet from 612 to 862 px, drawn a little bigger
nearer the front, everything drawn in depth order), and you hold the action
to lift its lid. The mechanic is lining up and timing a catch in 2.5D: get
into the lane of what you want, lift the lid as it comes, and step out of
the way (or keep the lid shut) for what you don't.

**The canary.** It lives in the bin and helps by itself. Lid shut: its head
peeps out under the lid (the delivered lid piece). Lid up: it rises out of
the mouth on its neck, ready; when something passes within reach in the
bin's lane (its lane: within 40 px of depth) it stretches towards it, grips
it in its beak, pulls it down into the bin and pops back up. Anything that
comes down into the open mouth falls in as well (something passing above
the rim needs the canary). It climbs out at its own pace (about a fifth of
a second), so a lid flapped up and down never gets it out. And it only
manages one thing at a time and has no patience: left gaping for 1.3 s
without a catch, it gets bored and ducks back down ("Yawn…"), and after
2.4 s the wind starts whisking the top piece of rubbish back out of the
bin (−1, every 1.2 s), so holding the lid up for ages is pointless. Its
states: in, rise, up, reach, pull, pop.

**The lid is physical.** Shutting it while the canary pulls something in
slams that home; shutting it while the canary is still reaching pushes
canary and catch into the bin; shutting it on something at the mouth
catches that too (snap down on top). Lifting it with something just above
or behind the lid knocks that thing back, up and away over the bin, not
caught. With the lid shut, anything in the lane bumps over the top.

**Scoring.** Rubbish in the bin: +1. Five in a row: a bonus that grows with
the run (+1 at five, +2 at ten, ...). Something that isn't rubbish caught:
the canary splutters it out, −1 (never below zero), the run ends and the
lid stays shut for 2.2 s. Rubbish that bumps over a shut lid ends the run.
The four things that aren't rubbish glow gold. Their shadows on the ground,
like everyone's, darken when they are in the bin's lane.

**Difficulty over the round.** One eased curve (`level()`, progress to the
power 1.6) drives every knob, so the first third stays gentle, the middle
is about the old average and the end is harder than before (2026-10-12).
Things come every 1.35 s at first and every 0.5 s by the end, and blow
along at 225 px a second rising to 550 (was 230 to 520). Each starts 300 px
off the right edge, shown there by an arrow at its height (bold when it is
in the bin's lane, gold when it isn't rubbish), so a slower child has time
to line up. The first thing is always rubbish; at first all rubbish comes
near the bin's lane, a share that falls to a quarter by about 19 s, the
rest anywhere. About a fifth of things aren't rubbish at first, over half
by the end, and those come towards wherever the bin is; cats and sparrows
that see the lid up turn towards it (140 px a second of depth, within
400 px). From 14 s gusts hurry some along (5% of things, up to 40%).

**Controls.** Controller: left stick or D-pad walks (up and down crosses the
street), hold A for the lid. Keyboard: arrows or WASD, hold Space or Enter.
Mouse or touch: press anywhere and the bin walks there with its lid shut
(drag and it follows); press on the bin itself and hold to lift the lid,
dragging walks it with the lid up. On a narrow screen the view follows the
bin, keeping the street coming in from the right in sight.

**Pass.** 15 points. Bots (all lift the lid as things come, 0.7–0.9 s
early; seeds 1–16), after the ramp (2026-10-12), with the scores before it:

| Bot | Scores | Average | Before the ramp |
| --- | --- | --- | --- |
| Clumsy beginner (stick at 60%, 0.3 s late, timing off by 0.2 s) | 15–34, passes on all | 24.6 | 14–32, 15 of 16, 23.8 |
| Beginner (stick at 80%, 0.2 s late) | 17–37, passes on all | 28.4 | 16–36, 28.7 |
| Sharp minder | 23–52 | 34.6 | 29–43, 33.4 |
| Wandering, holding the lid up | 0 | 0 | 0 |
| Wandering, flapping the lid (twice a second) | 5–25, 2 of 16 reach 15 | 10.1 | 1–19, 4 of 16, 9.3 |
| Wandering, flapping it slowly | 0–17, 2 of 16 reach 15 | 8.0 | 1–18, 1 of 16, 6.6 |
| Standing still, lid up | 0 | 0 | 0 |
| Idle | 0 | 0 | 0 |

A lucky flapping run can still reach the pass mark now and then, as it
could before the ramp; on average flapping scores well under half of a
clumsy beginner.

**Images.** IC-M08a is the street. IC-M08b is the ten things on the wind.
IC-M08c is the bin and the lid-with-head in two pieces (the head shows under
the shut lid), IC-M08d the lid with the canary squawking and singing. For
the redesign: IC-M08e is the canary out of the bin, head and neck only, in
six poses (ready, reaching, gripping with a gap for the caught thing,
pulling in, squawking, singing), each registered with its neck's base on
the cell's centre line 88% down so the game can anchor it at the mouth and
turn it to aim; IC-M08f is the lid alone, to swing up while the canary is
out; IC-M08g is the bin piece walking, four frames. Until they arrive the
canary out of the bin, the lid alone and the walk (a bob) are drawn in
code.

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

## Redesigned at the owner's request

The bin now walks about the street, left and right and across the pavement
and road, and things blow along at every depth, so you line up with what
you want and step aside from what you don't (before, the bin stood still
and everything came at one height). The canary is a helper living in the
bin: lifting the lid lets it rise out (no longer cut off by the lid),
reach, grip, pull things in and pop back up, and the lid's timing matters
in both directions (slam it home, push in a half-caught thing, snap down
on something at the mouth, knock back what's above it). Catching is
generous: anything that passes within the canary's reach, or through the
open mouth, is caught, rather than being judged at one edge.

Rule and balance changes: catching something that isn't rubbish still
costs 1, but the lid now stays shut for 2.2 s (was 0.9 s); more things
aren't rubbish (a third rising to a half, was a quarter rising to just
under a half), and they come towards the bin, cats and sparrows turning
towards an open one, so wandering with the lid up doesn't pay. The pass
mark is 16 (was 18). The bots now walk and use the lid. Pointer play is
new: press on the bin to lift the lid, anywhere else to walk.

Widening the margins (after the redesign): a clumsier child scored about
10 against a mark of 16, and wandering with the lid held up reached 15. Now
the canary gets bored of a gaping bin and the wind whisks rubbish back out
of it; it climbs out at its own pace, so flapping the lid doesn't work; the
open mouth only takes what comes down into it, not what passes above;
things come 300 px off the edge with an arrow showing them, slower for the
first 15 s; and three in ten bits of rubbish keep coming near the bin. The
pass mark is 15 (the table above).

## Registered to the delivered pieces

The canary-out-of-the-bin, lid-alone and walk sheets (IC-M08e, f, g) came
back without the requested registration, and the game had trusted it: the
head floated, the bin shrank when it walked, the lid came away from the bin.
Each piece is now registered by measurement (design/source/measure_sprites.py
writes design/source/sprite-measures.json, and a test checks every frame and
pose stays within 4%):

- **Scale from a feature that never changes size**, never a cell's height:
  the bin's rim width (482 px on the standing bin; 390–396 on the walk
  frames, so they are drawn 1.22–1.24 times as big), each lid's length from
  front tip to back corner (594 px on the shut lid; 548 on the lid alone,
  drawn 1.084 times; 644 and 636 on the calling lids, drawn 0.92 and 0.93
  times), and the canary's eye across its ink ring (57.5 px under the shut
  lid; 41–44 on the head-and-neck poses, drawn 1.31–1.40 times).
- **Placed on a landmark**: the walk frames by their rim's top middle, the
  lids by their front tips (the lid alone sits exactly where the shut lid
  does and swings up about the same back corner), the canary by its eye
  (where the game keeps its head), with each pose's neck base and beak tip
  measured; the bin's mouth is the rim's middle, 15 units in front of the
  feet. The walk frames' legs are painted a little shorter, so while walking
  the feet sit about 3% of the bin's height higher.
- **The head never disappears**: with the lid up and the canary inside
  (just opening, or bored), its head peeks over the rim instead of nothing.

Catching now follows what the player sees. A playtest with a scripted
player that lines up exactly found most "misses" were the lid stuck shut
for 2.2 s after a swallow; the splutter is now 0.6 s. The lane is wider
(60 px of depth, which the darkened shadow and bold arrow show), anything
that passes through or just above the open mouth while the canary is keen
falls in, and the canary grips with its beak's reach, not its eye's. Lined
up, a player now catches nearly everything that isn't lost to a swallow.

Balance after the fixes (seeds 1–16, pass 15): clumsy beginner 12–24
(average 18.5; all of seeds 1–8 pass), beginner 19–32 (26.0), sharp minder
(lid up 0.6 s early) 18–43, wandering with the lid up 0, flapping it twice a
second 0–7, slowly 0–9, standing with it up 0, idle 0.

### More forgiving catches and deliberate knockback
The lane tolerance is 85 px, and the bird reaches above and below the whole rim,
including backwards under the hinge. Reach and grip poses mirror when reaching
behind the bin. Closed-lid collisions no longer knock passing items down.
Only a fresh player opening knocks items away; automatic reopening after a jam
does not. Knocked items travel right, back against the incoming wind, at
650–830 px/s with an upward arc.
