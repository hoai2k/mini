### The Soupladle Lark: Soup's On (50 s)

A big copper pot of soup swirls on the stove, carrots, peas, dumplings and
mushrooms going round and round in it (the middle turns faster than the
edge). A queue of hungry creatures waits at the counter, and the one at
the front says what it wants in a bubble over the pot: two carrots and a
pea, say, with a patience bar. The Lark is the ladle: move the dotted ring
over the soup and press the action to dip. Everything inside the ring
comes up and flies into the creature's bowl, and the bubble ticks off what
was wanted. The mechanic is picking an exact set out of a moving crowd:
choose a moment when only wanted bits are in the ring (or two of them at
once), rather than catching (Scoop Stack) or framing one target (Say
Cheese).

**Scoring.** A bowl with just what was asked: 3, or 4 if served while the
patience bar is still green ("Quick and delicious!"). One unwanted bit is
forgiven ("No peas!"): the bowl then scores 1. A second unwanted bit, or
the old boot that bobs up now and then, is "Yuck!": the creature leaves
and it costs 1. A creature kept waiting too long leaves ("Hmph!"). An empty
dip is just a splash.

**Getting harder.** The soup swirls from 0.45 to 1 turn-rate as time goes
on. Orders are one or two of a single thing for the first ten seconds,
then two or three of up to two kinds, then three or four of up to three.
Dumplings join after 7 s, mushrooms after 20 s, the boot after 12 s.
Patience runs from 13 s down to 8 s, plus 1.5 s per item. The cook drops in
more of anything the pot is short of, so every order can be made.

**Controls.** Controller: left stick or D-pad moves the ring, A dips.
Keyboard: arrows or WASD, Space. Mouse or touch: the ring follows the
pointer over the pot; click or tap to dip. On a narrow screen the view
stays on the pot and the order bubble, 920 wide (the queue is off to the
right).

**Pass.** 36 points. Bots over seeds 1–6: a beginner (slower, no lead,
looks only at the ring as it is now, sometimes dips in a hurry, pauses to
look after each dip) 42–53; a good cook (leads the swirl, dips two at
once, checks the ring where it really is) 55–82; dipping on the nearest
wanted bit without looking round it 27–46; mashing 0–9; dipping on the
spot 0–8; idle 0.

**Images.** IC-M15a is the soup kitchen, the middle kept plain for the
pot and the counter on the right clear for the queue. IC-M15b is the pot,
its broth oval as wide as the pot and three-eighths as tall so the game can
fit the swirl to it, and the serving bowl. IC-M15c is the carrot, pea,
dumpling, mushroom and boot. IC-M15d is the four creatures in the queue,
waiting and pulling a face. IC-M15e is the Lark in the air over the pot:
hovering with its wings beating, dipping bowl first, and rising with a
brimming bowl, its bowl at the centre of each picture so it sits over the
ring.

## Changes after the audit

1. **The Lark no longer covers the ring.** It hovers higher (its bowl about
   150 above the ring, not 80, so its feet clear the ring) and is drawn at 60%
   opacity while it only hovers; it comes down at full strength only to dip.
   While dipping, everything of it below the soup's surface is hidden and a
   ring of ripples spreads, instead of a broth-coloured patch that hid the
   bits.
2. **Peas are bigger:** 26 px across, not 20 (and up to about 40 px with
   the pot's own scale).
- Shared guidance: a "Yuck!" now costs 1, not 2 (the creature leaving is
  already the cost). Pass stays 36. Bots over seeds 1–6: beginner 44–55,
  good 55–82, dipping at the nearest wanted bit without looking round it
  34–52, mashing 0–13, dipping on the spot 0–8, idle 0.

## Matched to the painting

The painting's bowl bottom is at (42, −128) in bird units (the stand-in's was
at (20, −90)). The bowl is now placed over the ring by that point, and the
code wings are left off because the painting has its own. The pose request
IC-M15e now describes the painting: speckled grey enamel, its curled hook
floating above its back, grey-blue wings, ochre legs.
