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
| Mite | Scramble | Bite with the chelicerae (graze hyphae and spores; nip back) | Ptychoidy (close up) |
| Tardigrade | Scramble (costs water and energy) | Pierce with the stylets | Brace (grip hard) |
| Amoeba | Bleb lunge (a fast eruptive pseudopod) | Close the food cup | Let go or egest |
| Paramecium | Trichocyst burst or ciliary sprint | Feed (oral current) | Avoidance reaction (reverse) |
| Bacterium | Sprint run (all flagella bundled) | Attach / bore (Bdellovibrio) or bind | Tumble |

## In code

Read the controls through `shared/controls.js` (`createControls(pad)`), not raw
buttons, and build the HUD list with `hudControls({...})` so every prototype
lists the same buttons in the same order. `createDash()` gives a dash with a
recharge and a HUD meter. The amoeba keeps its own two-stick pseudopod scheme
for now (both sticks grow pseudopods), but still uses A to dash and X to eat.
