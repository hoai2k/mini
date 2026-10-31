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
| Tardigrade | Scramble (costs water and energy) | Pierce with the stylets | Brace (grip hard) |
| Amoeba | Surge (A): pseudopods shoot out and the cell flows after them | Close the food cup (X) | Let go or egest (B) |
| Paramecium | Ciliary sprint | Feed (oral gulp); at a hunter, ram and sting | Trichocyst burst and back off (blocks a strike when facing it) |
| Bacterium | Sprint run (all flagella bundled) | Attach / bore (Bdellovibrio) or bind | Tumble |

**B is defend in every world** (the amoeba may differ). The mite jumps on A and
scrambles on held RT.

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
recharge and a HUD meter. The amoeba uses its own stick scheme, "lead and follow": the first
stick pushed grows a pseudopod and owns it, the other stick moves the body
after it (both held: the cell travels behind its lead pseudopod; body stick
alone: the body flows in and absorbs it). Holding LT or RT turns the body
stick into a second pseudopod beside the first, for encircling prey. LB/RB
spread out / push harder. The classic two-pseudopod scheme is a Features
choice. It still uses A to dash, X to eat and D-pad ←→ for the look.

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
- **Landmarks** (`shared/landmark.js`): near the edge of each view, a brass
  chevron points to the next stage and a hollow ring to the way back.

`split-demo/` is the test bed for all of this.
