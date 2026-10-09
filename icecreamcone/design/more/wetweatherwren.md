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
  the Wren stops and can't open for a moment. Walk under with it shut, or tap
  the action for a quick, low, furled hop.
- **Inside out.** After landing the Wren needs a moment before it can hop
  again (a press held through that moment hops when it is up), and an
  umbrella snapped open and shut more than three times in quick succession
  blows inside out and stops it. So mashing does not pay; timing does.

## Scoring

One point per puddle hopped and per little bird kept dry, and every fifth
puddle in a row without a splash or a snag adds two more ("5 dry in a row!
+3"). The page opens at 13.

## Getting harder

The first seconds are only small puddles with long dry stretches. Little
birds join at 5 s, awnings at 13 s (with a reminder on screen), gusts of wind
at 17 s (they lift an open umbrella, which stretches a glide and makes an
awning riskier), two puddles close together at 20 s, and a narrow puddle under
an awning (only a quick furled hop clears it) at 27 s. The dry stretches
shorten, the puddles widen and the street speeds up throughout.

Bots (`node --test test/wetweatherwren.test.mjs`): a sloppy
beginner (presses early or late, forgets one puddle in seven) scores 13 to
26, a good walker 22 to 31; holding the button, idling and every mashing
rhythm stay under the pass mark (mashing scores 0 to 8).

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
  floating open, walking open, and blown inside out. Until it arrives a black
  canopy is drawn in code above the furled stand-in.
- **IC-M10c, puddles and awnings** (`sprites.rainStreet`, 2 x 2): a small and
  a long puddle, stretched to each puddle's width, and two striped market
  awnings (the game draws their poles).
- The little birds reuse Safe Crossing's delivered `sprites.chicks` (standing,
  and flying off).
