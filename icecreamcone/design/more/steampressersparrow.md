### The Steampresser Sparrow: Pressing Business (45 s)

The laundry's ironing board and a basket of crumpled washing. One garment
at a time slides onto the board, crossed with creases: a handkerchief
first, then shirts, pillowcases, trousers, tablecloths and silk scarves.
The Steampresser Sparrow is the iron. Move it anywhere on the board, and
any crease under its sole is pressed as it passes; the crease fades and,
once all of it is flat, it's gone. Press the action for a puff of steam:
for 0.65 s the sole is a little bigger and presses nearly twice as fast.
The tank holds three puffs and refills one every 1.3 s. But an iron that
lingers heats the cloth (the glow under it warms from yellow to red), and
steam heats it faster: too hot and it scorches. The mechanic is steering
in two dimensions, running the iron along each crease and keeping it
moving.

**Scoring.** One per crease pressed out. Every crease of a garment pressed
out with no scorch: +2. A scorch leaves an iron-shaped brown mark, costs 1
(never below zero) and loses that garment's bonus. The next garment comes as soon as the last crease is
out, or when its time runs out (the ribbon along the top of the board).

**Getting harder.** Two or three creases at first, up to seven by the end,
longer ones, and less time per garment (13 s down to 8 s, plus a little per
crease). From 14 s some garments are silk (a little label says so), which
heats 1.7 times as fast. Moving at 400 px a second or more never heats the
cloth; standing still with steam scorches it in under a second, dry in
about 2.5 s.

**Controls.** Controller: left stick or D-pad moves the iron, A puffs
steam. Keyboard: arrows or WASD, Space; the iron eases in, so a short tap
nudges it. Mouse or touch: the iron follows the pointer; a click or tap on
the iron itself puffs steam (a finger put down elsewhere only moves it). On a narrow screen the view
follows the iron.

**Pass.** 16 points. Bots: a beginner (keyboard at less than half speed, no
steam; seeds 1–8) 19–25; a good presser (stick, steam on every stroke)
36–39; standing
still puffing steam 0; sweeping the whole board row by row with steam 0–1;
idle 0.

**Images.** IC-M09a is the laundry with the ironing board seen from above,
its top kept plain for the garments. IC-M09b is the six garments laid flat
and smooth (the game draws the creases and scorches on them). IC-M09c is
the Sparrow pressing, legs tucked away and sole flat on the cloth, dry and
steaming, since the standing portrait would put it on stilts. IC-M09d is the Sparrow
jerking its toe up off the cloth in alarm, shown for a moment after a
scorch.

## Changes after the audit

1. With a pointer, steam puffs only on a tap on the iron itself (within
   about 130 px of it); a finger put down anywhere else only moves the
   iron. The opening hint says "tap the iron for steam" on touch.
2. The cloth is plain where the creases go: the silk scarf has only a sheen,
   a narrow border and fringed ends (no blots), and the tablecloth's checks
   are a border only. Scorches are a clear, darker brown iron shape with an
   ink outline and its steam holes. IC-M09b now asks for the scarf and
   tablecloth plain in the middle.
3. With the keyboard the iron eases in (a slower acceleration), so a short
   tap nudges it; the stick stays direct. A test checks a short tap moves it
   only a little.
4. The steam-and-heat core stays, as the audit asks (the Glove Dove is the
   one being changed).

Shared item 2 (penalties): a scorch now costs 1, not 2; it also loses the
garment's +2 bonus. Standing still and puffing steam still scores 0.
