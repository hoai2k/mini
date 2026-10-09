### The Plugsocket Swift: Lights On (45 s)

Dusk falls on a tall house with twelve windows, four across and three
high. One at a time a little creature comes to a window and asks for a
light: a bulb in a bubble, ringed by a timer that runs from green to red.
Fly the Swift anywhere over the house and press the action at an asking
window to plug its lamp in. The creature reads by it (a bar of pages runs
down) and then falls asleep with the lamp still on, which scores. Pressing
again at a sleeping window unplugs it ("Night night"); pressing at a window
still reading does nothing but say so.

The fuse box on the garden wall shows every lamp that is on as a lit bulb,
and a heat gauge. Three lamps are safe and the gauge cools; a fourth warms
it (blown after about 3 s), five or more heat it fast. When the fuse blows,
every lamp goes out, the creatures still reading give up, and no lamp
plugs in until the Swift flies to the fuse box and flips it back on (after
a moment for it to cool). So the game is juggling a load: answer the
window closest to giving up, and keep unplugging sleepers to make room. The
mechanic is switching things on and off under a shared limit, rather than
keeping things topped up (Bloom) or toggling one light (Safe Crossing).

**Scoring.** One per room lit until its reader falls asleep. A window kept
waiting gives up ("Too dark!") and so do readers when the fuse blows; they
cost nothing but the point.

**Getting harder.** Requests come every 2.2 s at first and every 0.65 s by
the end; books take 3–4.5 s at first and up to 7.5 s at the end, so more
lamps are wanted at once than the fuse can carry, and patience shrinks from
8.5 s to 5 s. The sky darkens as it goes. The first ten seconds rarely need
more than two lamps.

**Controls.** Controller: left stick or D-pad flies, A plugs in, unplugs
or flips the fuse. Keyboard: arrows or WASD and Space. Mouse or touch: the
Swift follows the pointer; a click or tap on a window (or the fuse box)
sends the Swift there and acts when it arrives. The window the Swift is at
is outlined. On a narrow screen the view follows the Swift, 820 wide.

**Pass.** 12 rooms lit. Bots over seeds 1–5: a beginner (slower, lets a
fourth lamp in, sometimes picks a window at random) 13–16; a good
electrician (never more than three, unplugs the nearest sleeper first,
serves the most impatient window) 19–20; plugging in everything and never
unplugging 5–7; flying at random mashing 2–5; idle 0.

**Images.** IC-M13a is the garden at dusk with the tall house, its front
wall left blank for the game's windows and a clear patch on the garden wall
for the fuse box. IC-M13b is the window in its four states (dark, asking,
reading, asleep with the lamp on) and the fuse box whole and blown; the
game draws the lamp count and heat gauge above the box. IC-M13c is the
Swift's three poses, mirrored to fly right: in flight, diving at a socket
as it plugs a lamp in, and singed (bulb out, smoking) while the fuse is
blown. Its page portrait is the Swift standing still.

## Changes after the audit

1. **"Three is safe" is visible.** The fuse box's six lamp places are pale
   green for the first three and pale red for the rest; they light up green,
   then amber for the fourth, then red.
2. **A fuse warning on a phone.** On a narrow screen, when the fuse box is
   out of view and the fuse is heating or blown, a small copy of the lamp
   count and heat gauge rides at the view's left edge, on the lawn ("◀ FUSE",
   or "◀ Flip the fuse!"), and flashes red when the fuse is hot.

The scores and pass are unchanged (pass 12; beginner 13–16, good 19–20).

## Matched to the painting

The painting's socket (the body) is at (−46, −192) in bird units, and its
bulb is straight above it at (−46, −326). The Swift's position is now the
socket. The bulb's glow and the singed smoke sit on the painted bulb, and
the code wings are left off because the painting has its own pink wings. The
pose request IC-M13c now describes the painting: a clear bulb with an orange
filament, a cream wall socket on a blue-green body, pink wings, and a flex
tail ending in a plug.
