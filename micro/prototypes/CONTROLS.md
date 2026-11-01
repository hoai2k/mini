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
| Y | The creature's special (tun, labels, view mode...) |
| LT / RT | Analog: zoom or focus, or the creature's own analog control |
| LB / RB | Secondary: objective, speed, dive and rise |
| D-pad left/right | Cycle the optical look |
| D-pad up/down | Objective or zoom steps, or test actions |
| Menu | Feature panel (what the prototype does, switches) |
| View | Show or hide the controls |

Keyboard fallbacks are in `shared/pad.js`.

| Creature | Dash (A) | Attack / eat (X) | Defend (B) |
| --- | --- | --- | --- |
| Springtail | Furcula jump | Graze spores and algae | Hunker in the meniscus |
| Mite | **Jump** (A; borrowed from jumping oribatids such as *Zetorchestes*); scramble on held B | Bite with the chelicerae (graze hyphae and spores; nip back) | Ptychoidy (close up, held Y: mite exception) |
| Tardigrade | Scramble, ~280 µm/s, nearly twice the full-tilt walk (recharges in 2.6 s; no other cost). LS is analogue: a slight push creeps (~30 µm/s), full tilt hurries (~150 µm/s); the keys walk mid-pace, hold G to hurry, T to creep | Pierce with the stylets | Brace (grip hard) |
| Amoeba | Surge (A): pseudopods shoot out and the cell flows after them | Close the food cup (X) | Let go or egest (B) |
| Paramecium | Ciliary sprint | Feed (oral gulp); at a hunter, ram and sting | Trichocyst burst and back off (blocks a strike when facing it) |
| Bacterium | Sprint run (all flagella bundled; the whole flock sprints) | Beacon: kin it reaches answer and join your flock; also lyses prey in reach and strikes enemies the flock touches (Bdellovibrio: attach / bore). LS steers the flock, released it stops; Y fires the toxin | Tumble |
| Phage | Current gust (A; on a surface, push off with the fibres) | Grab the aimed protein with the leading fibres (at an amoeba lobe, a fibre jab) | Fold the fibres and slip |

**B is defend in every world** except the mite and the amoeba: the mite jumps
on A, scrambles on held B and closes up (its defence) on held Y; the amoeba's
B lets go or stiffens.

**The phage drifts in open 3D water with no up or down.** LS drifts across the
view (its right and up, in 3D), RT drifts into the view and LT back toward
you; the baseplate and fibres turn to lead. RS turns the view about its own
axes (a quaternion, so there are no poles and no gimbal flips) and the view
stays wherever you leave it: nothing turns it on its own except an optional
gentle roll that keeps the sunlit surface toward the top of the screen
(Features → Keep the surface up), which fades out looking straight up or down.
Molecules striking the phage give it small kicks (Brownian motion you can
see); they are softened while you aim at a protein.

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
recharge and a HUD meter. The amoeba uses its own twin-stick scheme: LS moves the body and RS steers
the selected pseudopod (marked R in the player's colour). With no pseudopod,
RS grows one; pushed more than about 70° from the selected one, it starts a new
pseudopod there (or takes one already reaching that way). RT selects the next
pseudopod clockwise round the cell. Holding LT turns LS into a second
pseudopod hand (marked L): the neighbour of the selected one towards
screen-up, or towards screen-down if the selected one is the topmost, sprouting
one if there is none; RT with LT held moves the pair round together. A surges,
X closes the cup (and cuts or pinches), B lets go or stiffens, LB/RB spread out
/ push harder. To pinch an arm of *Chaos*, hold LT, close the two pseudopods
round it and press X. "Lead and follow" and the classic two-pseudopod scheme
remain Features choices.

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
