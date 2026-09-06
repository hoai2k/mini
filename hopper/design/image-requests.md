# Image requests

Open art asks. Everything here currently works without the image, so each one is a visual upgrade rather than a blocker. Delivered requests move to [`image-history.md`](image-history.md).

Match the existing look: hand-painted 1970s anime cel style, hard ink outlines, flat shading, transparent PNG unless noted. Existing references: `assets/hopper-canonical-v1.png`, `assets/enemy-silhouettes.png`, `assets/boss-canonical-lineup.png`.

## 1. Signal cage without occupants (replaces two derived files)

The delivered `signal-cage-intact.png` and `signal-cage-broken.png` each paint a sentry and a signal inside the bars, but the game puts a live warden and a live collectible in that space, so the art doubled them. The occupants were erased programmatically into `signal-cage-{intact,broken}-frame.png`, which is what the renderer draws today. That derivation costs the intact cage its glowing floor pedestal and slightly clips the front bars where they crossed the sentry.

Wanted: the same two cages, 240×250 each, painted **empty** — hexagonal frame, six cyan bars, top and bottom nodes and the floor pedestal all intact, with nothing inside. One intact, one shattered with the bars broken outward and debris.

## 2. Regional spring pad recolors (optional)

`props/spring-pad.png` is a single neutral cyan coil used in all nine regions. Nine 160×40 recolors would let each region's launcher match its palette: fields green, city ivory, mountains slate, foundry orange, harbor teal, launchworks amber, red basalt, blue reef, violet. Purely cosmetic; the neutral pad reads well everywhere today.

## 3. Diving-flyer attack cels (optional)

Four species dive rather than leap and so were never given an airborne cel: `windowRay`, `riftCondor`, `turbineWasp`, `phaseSkate`. Their agile behaviour is an immediate second dive pass, which currently reuses the idle cel. A committed dive pose for each — wings swept back, body angled down, facing left like the other cels — at the same canvas size as its existing sprite would make that second pass read as its own attack.
