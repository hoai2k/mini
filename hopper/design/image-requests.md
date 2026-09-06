# Image requests

**Delivered September 6, 2026:** see [the generated image pack](../game/public/assets/upgrades/README.md) for all nine request groups, exact filenames, prompts, and integration notes. The controller PNG and [editable SVG reference](../game/public/assets/controller.svg) are updated in the live asset directory. Other sprites are supplied for renderer integration; all nine low-road regions are included. Optional regional spring recolors are not included.

Assets that would replace procedural drawing or stale art. Everything listed here currently works without the image (the renderer draws a placeholder in code), so each one is a visual upgrade, not a blocker. Match the existing look: hand-painted 1970s anime cel style, hard ink outlines, flat shading, transparent PNG unless noted. Existing references: `assets/hopper-canonical-v1.png`, `assets/enemy-silhouettes.png`, `assets/boss-canonical-lineup.png`.

## 1. Controller diagram (replaces `assets/controller-diagram.png`)

The current diagram still labels B as "force shield" and X as an all-round spin, and has no right stick label. Same composition as the existing image (Xbox controller, callouts on a 1440×580 canvas), with these callouts:

- Left stick / D-pad: move
- Right stick: look around (ahead, behind, up, down)
- A: jump (hold to soar; jump at a wall to kick off it)
- X: rear spin kick · parry (sweeps behind and overhead only)
- B: forward guard (hold; parries the front only)
- RT: eye lasers (auto-aim ahead and downward)
- Menu: pause · View: instructions

## 2. Spring pad (new, 160×40 tile, 9 regional variants optional)

A coiled launcher set into the ledge: a cyan-glowing coil or leaf-spring with three upward chevrons on the face. Drawn today as a cyan band with white chevrons. One neutral version is enough; regional recolors (fields green, foundry orange, blue reef, violet) are a bonus.

## 3. Lockdown wall (new, 80×1690, tileable vertically)

Boss enclosure gate: a column of warm amber energy bars with a hazard-striped frame, meant to drop from above and lift when the boss dies. Drawn today as a gradient bar with diagonal light streaks. A 80×256 tileable segment plus a 80×120 cap for the top edge would cover it.

## 4. Signal cage (new, 240×250)

A hexagonal cage of cyan bars around a signal collectible, with a small ranged shadow standing inside. Only a parried shot opens it. Drawn today as a glowing hexagon outline. Provide an intact version and a broken version (bars shattered outward).

## 5. Wind lane streaks (new, 3 frames, 256×256 tileable)

Diagonal pale streaks that read as a crosswind pushing down and back. Drawn today as animated lines. Three frames for a simple loop.

## 6. Low-road corridor (new, 470×210 tile per region)

The hollowed underside of a fight shelf: a dark corridor with exposed roots, pipes or crystal depending on region, so the underpass reads as an intended path. Drawn today by simply stopping the architectural fill 200 units below the ledge. Priority regions: fields (0), foundry (3), violet (8).

## 7. Enemy leap cels (new, one per species that has agile spawns)

Agile spawns pounce, vault over Hopper, or overfly. Each currently reuses the idle cel while airborne. Requested per species, same canvas size as its existing sheet:

- shadeHound, furnaceHound, mirrorStalker: a mid-air pounce cel (legs tucked, jaws open)
- seedSpitter, spireLeech, slagCaster, thornChoir: a vault cel (body stretched, seen from below)
- chainManta, coilWraith, veilMedusa, gravityCantor: a banking cel for the overfly
- cragTortoise, ballastCrab: a short hop cel (shell lifted, legs dangling)
- basaltBurrower: a burst-from-ground cel with dirt spray

## 8. Boss enclosure pillars (new, 140×430 per boss region)

Two solid pillars flank each arena for wall kicks: mountains (Night Rook), launchworks (Smelter Leviathan), violet cathedral (Eclipse Regent). Drawn today with the regional platform tile.

## 9. Emergence burst (new, 8-frame atlas, 128×128 per frame)

The puff used when an ambusher surfaces or a wave leaps in: violet-pink dust and sparks. Drawn today with the generic particle burst.
