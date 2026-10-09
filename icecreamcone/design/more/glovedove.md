# Glove Dove: Squeaky Clean (45 s)

Bird 11 of the book's other birds. The Glove Dove is a long pink rubber
washing-up glove with a dove's head. Code: `game/src/games/glovedove.js`;
entry: `game/src/more/glovedove.js`; tests: `game/test/glovedove.test.mjs`.

## Rules

A dirty dish lies in the sink, splashed with jam, egg, gravy, spaghetti,
burnt-on crust or a coffee ring. The Glove Dove stands on a sponge and
scrubs with its feet. Move it onto a spot and rub: back and forth, or round
and round. Every bit of rubbing over a spot wears it away (it fades and
shrinks); standing still does nothing. When the last spot is gone the dish
squeaks ("Squeaky clean!"), goes up on the rack on the draining board, and
the next one slides in.

**Soap.** Press the action for a squirt of washing-up liquid: for about three
seconds the suds scrub twice as fast. Each squirt also raises the foam in the
sink (the gauge beside it, under the bottle), which drains away slowly. Three
squirts close together and the sink foams over: "Mop up!", and nothing can be
scrubbed for a moment and a half.

## Scoring

One point per dish washed. The page opens at 7. The results card also shows
the spots scrubbed and the fastest dish.

## Getting harder

The first two dishes are plates with two or three easy spots. Then bowls and
mugs, then saucepans, frying pans and pie dishes; each dish has more spots (up
to seven) and tougher grime (burnt-on crust takes two and a half times as
much rubbing as jam). From the seventh dish the dishes float and slowly turn
in the water, faster later on, so the spots move under the bird.

Bots (`node --test test/glovedove.test.mjs`): a slow beginner who rubs in
long lazy strokes and never uses soap washes 7 to 8 dishes; a good scrubber
who uses soap on crust washes 11 to 13. Pushing the stick about at random
(with or without mashing), spinning it without steering, and idling wash 0
to 2.

## Controls

| Device | Move the bird | Scrub | Soap |
| --- | --- | --- | --- |
| Controller | left stick | rub back and forth, or spin the stick in circles over a spot | A |
| Keyboard | arrows / WASD | tap back and forth over a spot | Space or Enter |
| Mouse / touch | the bird follows the pointer | rub or drag in circles | click or tap |

Only real movement counts, and no more than a set amount each frame, so
flinging the pointer about is no faster than a steady rub. On a narrow
screen the view follows the bird across the sink.

## Images

- **IC-M11a, the scene** (`scene.glovedove`): the kitchen sink seen from
  above, its water left plain for the dishes, a bare counter on the left for
  the soap bottle and foam gauge, and the draining board with an empty plate
  rack on the right.
- **IC-M11b, dishes** (`sprites.dishes`, 3 x 2): six clean dishes from above,
  each centred in its cell at a fixed size so the game can scale and turn
  them by their round body.
- **IC-M11c, grime** (`sprites.grime`, 3 x 2): the six kinds of spot, faded
  and shrunk by the game as they are scrubbed.
- **IC-M11d, the Glove Dove scrubbing** (`sprites.glovedoveScrub`, 2 x 1):
  two frames swapped while it rubs; until it arrives the portrait jiggles.
- **IC-M11e, the Glove Dove cheering and swamped** (`sprites.glovedovePoses`,
  2 x 1): cheering while a clean dish goes up on the rack, and buried in foam
  while the sink is mopped; until it arrives the portrait hops or squashes.
