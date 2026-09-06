# Hopper requested image pack

Generated from `hopper/design/image-requests.md` with the built-in imagegen tool, using each existing enemy sprite as its canonical identity reference and the three regional concept sheets as environment references. Full prompts and dimensions are in `manifest.json`. Large generation masters and intermediate exports remain local.

## Follow-up delivery

The 15 follow-up assets are recorded in [`followup-manifest.json`](followup-manifest.json): two empty cages with intact floor pedestals, nine regional spring pad colors, and four committed diving attack cels. They are wired into the renderer. Empty cages use the `-empty.png` suffix; the older originals and erased frame derivatives remain as history.

## Contents

| Request          | Files                                                                                     | Export                                                           |
| ---------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Updated controls | `controller.svg`, `controller-diagram.png`                                                | Editable vector + 1440×580 PNG                                   |
| Spring pad       | `props/spring-pad.png`                                                                    | 160×40; neutral cyan version                                     |
| Lockdown gate    | `props/lockdown-wall-segment.png`, `lockdown-wall-cap.png`, `lockdown-wall.png`           | 80×256 repeat, 80×120 cap, assembled 80×1690 wall                |
| Signal cage      | `props/signal-cage-intact.png`, `signal-cage-broken.png`                                  | 240×250 each; sentry and signal included                         |
| Wind             | `effects/wind-lane-atlas.png`, `wind-lane-0.png` through `wind-lane-2.png`                | 768×256 strip; three 256×256 frames                              |
| Low road         | `terrain/low-road-{fields,city,mountains,foundry,harbor,launchworks,red,blue,violet}.png` | All nine regions, 470×210 each                                   |
| Enemy leap cels  | `enemies/*-leap.png`                                                                      | All 14 requested species, original per-species canvas dimensions |
| Arena pillars    | `terrain/arena-pillar-{mountains,launchworks,violet}.png`                                 | 140×430 each                                                     |
| Emergence burst  | `effects/emergence-burst-atlas.png`, `emergence-0.png` through `emergence-7.png`          | 1024×128 strip; eight 128×128 frames                             |

## Integration

**All nine groups are now wired into the renderer.** See [`design/image-history.md`](../../../design/image-history.md) for where each one is drawn and what changed during integration. The instructions dialog draws `../controller.svg` directly; the PNG diagram is kept for the printed design document. The cage art shipped with a painted sentry and signal inside it, which the game already places live, so occupant-free derivatives (`props/signal-cage-{intact,broken}-frame.png`) were produced from these originals and were used until the painted empty pair arrived. The renderer now uses `props/signal-cage-{intact,broken}-empty.png`.

Load new assets relative to `./assets/upgrades/` to preserve GitHub Pages subpath support. Enemy cels face left where directional; use the same world anchor as the existing cel and reflect for opposite travel. They are single airborne poses, not complete animation cycles. Blend pose changes through the existing animation timing rather than scaling collision boxes to the artwork.

Atlas source rectangles are `(frame * frameWidth, 0, frameWidth, frameHeight)`. Suggested playback: wind at 12 fps looping; emergence at 16 fps once (0.5 seconds). Frame zero is the first frame. Wind tiles repeat in X/Y; gate segment repeats vertically; corridors repeat horizontally. Their matching boundary pixels were verified after export. Keep interpolation within each frame's rectangle to avoid atlas bleed.

The nine corridor plates intentionally include a dark opaque recess to make the underpass readable. Other new sprites/effects have real PNG alpha; the controller uses an opaque ivory background. Gate/corridor artwork is decoration: continue using authored collision surfaces, not painted outlines. The historical unsuffixed cage artwork includes occupants; the new `-empty` pair leaves those to the live game.

## Production checks

Inspected contact sheets for identity, pose, legibility, and transparency. Corrected six baked-in backgrounds with user-authorized image processing. Normalized export dimensions and atlas grids, and matched repeated tile boundaries. No physical-controller animation playthrough is claimed; integration and in-game timing remain separate work.
