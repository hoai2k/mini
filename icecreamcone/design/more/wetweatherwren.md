# Wetweather Wren: Puddle Hop (45 s)

Bird 10 of the book's other birds. The Wetweather Wren is a furled black
umbrella with a wren's head; its picture in the book shows rain. Code:
`game/src/games/wetweatherwren.js`; entry: `game/src/more/wetweatherwren.js`;
tests: `game/test/wetweatherwren.test.mjs`.

## Rules

It is raining, and the Wren walks along the wet pavement; the street scrolls
past on its own, a little faster as time goes on. Press the action and the
umbrella pops open: the gust under it lifts the Wren into a hop. Hold the
action and it floats down slowly under its canopy; let go and it furls and
drops. A press in the air opens it again to stretch a glide.

- **Puddles.** Each puddle hopped scores one. Land in one, or walk into it,
  and the Wren splashes and stops for a moment.
- **Little birds** wait in the rain under their own small cloud. Pass over
  one with the umbrella open (floating, or walking with it open) and it is
  kept dry and flies off: one point.
- **Market awnings** hang over the pavement from a quarter of the way in. An
  open umbrella (or a hop that is too high) catches on one: "Snagged!", and
  the Wren stops and can't open for a moment. Walk under with it shut.

Mashing does not pay: the puddles are wider than a short tap-hop carries,
and an umbrella popped open under an awning snags.

## Scoring

One point per puddle hopped and per little bird kept dry, and every fifth
puddle in a row without a splash or a snag adds two more ("5 dry in a row!
+2"). The page opens at 15.

## Getting harder

The first seconds are only small puddles with long dry stretches. Little
birds join at 5 s, awnings at 13 s (with a reminder on screen), gusts of wind
at 17 s (they lift an open umbrella, which stretches a glide and makes an
awning riskier), and two puddles close together at 20 s. The dry stretches
shorten, the puddles widen and the street speeds up throughout.

Bots (`node --test test/wetweatherwren.test.mjs`): a sloppy
beginner (presses early or late, forgets one puddle in seven) scores 18 to
29 over eight seeds, a good walker 23 to 30; holding the button and idling
score 0, and eight mashing rhythms over three seeds score 3 to 12.

## Controls

| Device | Press | Hold | Let go |
| --- | --- | --- | --- |
| Controller | A or RT: pop open, hop | float | furl, drop |
| Keyboard | Space or Enter | float | drop |
| Mouse / touch | click or tap | hold | release |

On a narrow screen the view keeps the Wren near the left with the street
ahead of it in view.

## Images

- **IC-M10a, the scene** (`scene.wetweatherwren`): the rainy street, a row of
  houses across the road and an empty near pavement where the game scrolls the
  puddles, awnings and birds past. No painted rain (the game draws its own,
  which the open canopy shelters).
- **IC-M10b, the Wren's umbrella poses** (`sprites.wrenPoses`, 3 x 1):
  floating open, walking open, and snagged inside out on an awning. Until it arrives a black
  canopy is drawn in code above the furled stand-in.
- **IC-M10c, puddles and awnings** (`sprites.rainStreet`, 2 x 2): a small and
  a long puddle, stretched to each puddle's width, and two striped market
  awnings (the game draws their poles).
- **IC-M10e, the Wren walking** (`sprites.wrenWalk`, 2 x 1): two furled
  strides without the portrait's painted rain and puddle.
- The little birds reuse Safe Crossing's delivered `sprites.chicks` (standing,
  and flying off).
- **IC-M10d, the Wren drenched** (`sprites.wrenSplash`): standing in the
  puddle, dripping, for the moment after a splash; until it arrives the
  stand-in sags.

## Changes after the audit

1. Dropped the inside-out rule and the 0.3 s settle after landing: a press
   on the ground now always hops at once. Mashing is held back instead by
   wider puddles (250 to 460 px, wider than a short tap-hop carries) and by
   the awnings; the test now asserts eight mashing rhythms on three seeds stay
   under the pass mark.
2. Dropped the narrow puddle under an awning, so there are only two kinds of
   press: a hop, and a hop held to float.
3. The streak pop now says what it adds: "5 dry in a row! +2".
4. Re-tuned: pass 13 → 15. The beginner bot scores 18 to 29 over eight
   seeds, the good bot 23 to 30 (mean 27.5 against the beginner's 22 on the
   first four), mashing at most 12. The tips no longer mention the tap-hop or
   the inside-out rule.

## Matched to the painting

The portrait (a furled umbrella body with a feathered wing, the wren's head
and beak at the front, the wooden crook handle rising behind) stands in a
painted puddle in painted rain. In the game it faces right, the way it walks.
How tall it stands for the awnings now comes from the painting (220 px, it
was 175 for the stand-in), and in the air the painted puddle and the claws'
tips are clipped away so it doesn't carry a puddle into the sky. A walking
pair without rain or puddle is requested (IC-M10e). The open, inside-out and
drenched poses (IC-M10b, IC-M10d) now describe the painting's design: the head
at the umbrella's tip, the canopy spreading below it, and the crook handle
hanging as a tail.

## Matched to the delivered art

The street scene (IC-M10a) has the near pavement from its kerb (y 728) down;
the Wren walks at y 760 on it, where the puddles, awnings' poles and little
birds stand. The painting stays still, so the game now scrolls the painted
near pavement itself with the street (two copies side by side, the second
mirrored so the seam matches): the flagstones move under the Wren with the
puddles. The kerb, road and houses stay still. Still drawn in code: the
puddles and awnings (IC-M10c) and the Wren's open, walking and drenched poses
(IC-M10b, IC-M10d, IC-M10e), all requested.

All the Wren's sheets have now arrived (IC-M10b open poses, IC-M10c puddles
and awnings, IC-M10d drenched, IC-M10e walking). They are painted at the
portrait's framing, so each cell is drawn whole at the portrait's scale and
stood on its measured feet (floating 0.951 of the cell down, walking open
0.985, inside out 0.938, walking 0.936, drenched 0.93, flipped to face the
way it walks); no code canopy or clipped portrait is drawn any more. The game
now uses the art's measurements: the open Wren is 225 px tall with a canopy
106 px wide each side (it was 285 and 140 for the code canopy), and the rain
stops at the painted canopy's dome. Because the open canopy is now no taller
than the furled bird, an open umbrella snags on an awning whatever its height
(as the rules always said), and a furled one only if it hops too high. The
code drips stop while the drenched painting (which has its own) shows. The
puddles and awnings are drawn from IC-M10c, the awnings over the poles the
game draws. Bots unchanged: beginner 18 to 29, good 23 to 30, mashing at
most 12, pass 15. Nothing the Wren shows is drawn in code any more apart from
the rain, gusts, ripples and splash drops, which are effects.
