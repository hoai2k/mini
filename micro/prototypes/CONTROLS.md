# Micro prototypes: shared control scheme

Every prototype uses the same Xbox layout, so the creatures feel like one game
seen at different magnifications. The game is about movement: fleeing
predators, chasing prey, and the dash is the key verb.

| Button | Action |
| --- | --- |
| LS | Move (relative to the view) |
| RS | Camera (orbit, or move the stage in a microscope view) |
| **A** | **Dash**: a short burst of speed in the stick direction, on a cooldown or an energy meter shown in the HUD, with rumble. Each creature's dash is its real fastest move (or a labelled stretch of one). |
| **X** | **Attack / eat**: bite, engulf, pierce, feed, depending on the creature. Hitting a predator with it can fight back where that is biologically plausible. |
| B | Defend: block, curl up, armour, reverse, depending on the creature |
| Y | The creature's special (tun, labels, view mode...). Entering a portal or going back up a world is also Y, but the world asks for it on screen when you are there, so the controls lists leave it out |
| LT / RT | Analog: zoom (LT out, RT in) wherever the triggers are free; otherwise focus, or the creature's own analog control |
| LB / RB | Secondary: objective, speed, dive and rise |
| D-pad left/right | Cycle the optical look |
| D-pad up/down | Objective or zoom steps where the triggers are taken (springtail, tardigrade, amoeba, bacterium), or test actions |
| Menu | Feature panel (what the prototype does, switches) |
| View | Show or hide the controls |

Keyboard fallbacks are in `shared/pad.js`.

| Creature | Dash (A) | Attack / eat (X) | Defend (B) |
| --- | --- | --- | --- |
| Springtail | Furcula jump | Graze spores and algae | Hunker in the meniscus |
| Mite | **Jump** (A; borrowed from jumping oribatids such as *Zetorchestes*, with a flea's feel): tap to spring ~3 body lengths (~1.1 mm), hold up to 0.45 s to crouch deeper and release for ~6 (~2.1 mm), aimed with LS. Scramble on held B: ~1.5 mm/s, ~1.7× full tilt, on a stamina meter. LS is analogue: a slight push walks (~0.42 mm/s), full tilt hurries (~0.87 mm/s); the keys walk mid-pace (~0.61 mm/s), LB/RB (Q/F) hold the slow end / full tilt | Bite with the chelicerae: every press rears, lunges and snaps (graze hyphae and spores; nip a springtail to daze it, again to eat it, a game rule; nip back at the predator) | Ptychoidy (close up, held Y: mite exception) |
| Tardigrade | Scramble, ~280 µm/s, nearly twice the full-tilt walk (recharges in 2.6 s; no other cost). LS is analogue: a slight push creeps (~30 µm/s), full tilt hurries (~150 µm/s); the keys walk mid-pace, hold G to hurry, T to creep | Pierce with the stylets | Brace (grip hard) |
| Amoeba | Surge (A): pseudopods shoot out and the cell flows after them | Close the food cup (X) | Let go or egest (B) |
| Paramecium | Ciliary sprint | With a hunter close, a trichocyst jab ahead: it lands (a flash and a knock-back; three wear a hunter's interest out) or visibly misses (out of reach, or out of its depth); otherwise feed (oral gulp, or a cone of algae) | Block and back off: blocks the Dileptus's slash and the Didinium's crouch or lunge, with a trichocyst burst all round while charged |
| Bacterium | Sprint run (all flagella bundled; the whole flock sprints) | Beacon: kin it reaches answer and join your flock; also lyses prey in reach and strikes enemies the flock touches (Bdellovibrio: attach / bore). LS steers the flock, released it stops; Y fires the toxin | Tumble |
| Phage | Dash forward along the view (A; on a surface, push off with the fibres) | Grab / let go (X): the grab assist takes the best molecule or cell-surface point in reach; only a gold receptor injects (at an amoeba lobe, a fibre jab) | Fold the fibres and slip (lets go) |

**B is defend in every world** except the mite and the amoeba: the mite jumps
on A, scrambles on held B and closes up (its defence) on held Y; the amoeba's
B lets go or stiffens.

**The springtail focuses with the triggers.** Its LT / RT change only the
focus and the depth of field, never the lens or the camera. Held RT works like
the wider focus of a jump, over a set band: everything from the springtail out
to about two jumps ahead (60 mm) comes sharp, plants and animals included, and
what lies beyond softens again. It eases in over ~0.4 s. Held LT brings the
focus in to the water just below the springtail, shallow. Each player's own:
with company, each split view takes its players' look. Keyboard: X (RT), Z
(LT). Magnification stays on the D-pad (1 / 2).

**Zoom on the triggers.** Where the triggers drive nothing else, they zoom:
LT out and RT in, analogue and continuous (how far the trigger is squeezed sets
how fast the zoom moves, exponentially, and the view eases to it), clamped to
the world's range. The paramecium, the phage and the mite zoom this way; the
D-pad does not zoom there. The springtail keeps its triggers for focus (below),
the tardigrade for fine focus (its magnification is four real objectives,
stepped on the D-pad), and the amoeba uses them in play (LT moves the cell, RT
spreads it).

**The paramecium zooms with the triggers.** LT zooms out and RT zooms in,
analogue and continuous (eased, clamped): from its closest field (560 µm) out
to three times it; the world starts at 1.6×. The D-pad does not zoom there.
Each player's own: with company, each split view takes its players' zoom.
Its depth is continuous: RS up/down (and LB/RB) swim deeper and shallower
through the drop, and fights, eating and catches need the two near in depth.
Keyboard: Z (LT), X (RT).

**The phage zooms with the triggers** the same way and at the same rate: the
camera's distance behind the phage, from 60 to 290 units (the range of the old
D-pad steps). Each player's own: together, the shared view takes the widest of
everyone's; split, each view takes its own players' zoom.

**The mite zooms with the triggers** too: the SEM's horizontal field width,
160 µm to 4.2 mm, a little faster than the paramecium (its range is nine times
as wide). Its view is one for everyone (RS turns it for all), so any player's
triggers move the one field; the magnification shows once they are let go.

**The phage moves in open 3D water with no up or down,** all in the view's
own frame: LS up and down move it forward and back along the view (into and
out of the screen), LS left and right sideways, LB and RB down and up the
screen, A dashes forward; crisp, quick to start and stop (a game departure).
X grabs and lets go (RT used to grab too; it zooms now). The
grab assist takes the best thing in reach of the fibres, a free molecule (to
carry and let drift off) or any point of a cell (to hang on to, riding out
the occasional currents you see coming); only a gold three-lobed receptor
latches and injects. RS turns the view about its own axes (a quaternion, so
there are no poles and no gimbal flips) and the view stays wherever you leave
it: nothing turns it on its own except an optional gentle roll that keeps the
sunlit surface toward the top of the screen (Features → Keep the surface
up), which fades out looking straight up or down.

## Fighting back

Predators wind up visibly before they strike (a posture and a pause), so an
attack is never a surprise. Face a predator, block its strike with B and bite
back with X: each wears its interest down until it gives up and leaves. If it
catches you, the camera pulls back to watch it swallow you whole, follows it for
a moment, fades out and you respawn (`shared/predation.js`: `createFight`,
`createCapture`).

## In code

Read the controls through `shared/controls.js` (`createControls(pad)`), not raw
buttons, and build the HUD list with `hudControls({...})` so every prototype
lists the same buttons in the same order. `createDash()` gives a dash with a
recharge and a HUD meter. The amoeba uses its own twin-stick scheme. Each stick moves one pseudopod
(marked L and R in the player's colour): its first push grabs the pseudopod
lying that way (or grows one there), a quick flick through the centre keeps it,
and resting the stick lets it go. Hold LT to move the whole cell instead: one
stick or both the same way crawl, two ways crawl between and widen, apart
stretches, together squishes, one up and one down turn it. RT spreads the whole
cell out (held on, it slowly rounds up); LB/RB spread / push harder the
pseudopod being moved. A surges, X engulfs (and cuts), B lets go or
stiffens. Against another cell (the giant amoeba *Chaos*, or another player)
a pseudopod is a push: cells never overlap, and a broad pseudopod or a surge
pushes hardest (it can force a channel into *Chaos*, even through to the portal under it); keep a gap open so *Chaos* cannot ring you. At the open
portal the world asks for Y, which goes through as soon as any part of the cell is on it. "Lead and follow" and the classic two-pseudopod scheme remain Features
choices.

## Multiplayer

Up to four players share the screen (`shared/players.js`).

- **Player 1** plays on the keyboard (WASD and the keys in `shared/pad.js`)
  and on the first controller that presses a button or moves a stick.
- **Players 2-4 join** by pressing any button on another controller, at any
  time: in a menu (the menu shows that they joined) or during play (a "Player
  N joined" toast). A controller that is unplugged leaves its player waiting
  for a few seconds; plugging it back in resumes them.
- **Instructions:** the controls list shows controller buttons whenever any
  controller is connected, and switches the moment one connects. Keyboard keys
  appear only while no controller is connected at all (each chip's hover title
  gives the other one).
- **Split screen** (`shared/splitscreen.js`): together, players share one
  view; as they separate the screen splits LEGO-style along a brass hairline
  that turns with their direction, and merges back seamlessly when they meet.
- **Landmarks** (`shared/landmark.js`): near the edge of each view, a hollow
  ring points to the way back. The way on has no mark: its golden light
  (`shared/portal.js`) is the only marker.

`split-demo/` is the test bed for all of this.
