# Hopper production sprite animation

Art source: built-in imagegen, canonical Hopper and action study as identity references. Original, alpha export, 2048×1536 production atlas, 12 individual frames, manifest, and renderer are included here. These are actual animation cels, not panels cut from the concept sheet.

## Reviewed on dark ground
- All 12 sprites face right and preserve green armor, blue thorax, red eye, gold antennae, and boy with scarf seated on the saddle.
- Four run cels alternate leg contact. Launch visibly drives the enormous hind legs backward; airborne rise folds legs; fall extends feet; all four kick cels articulate the enormous rear legs.
- No opaque background blocks or labels remain in prepared atlas. Generator emitted an RGB checkerboard despite two alpha requests, so neutral background was keyed during PNG export. Fine pale edge antialiasing is visible at magnified scale, but no checkerboard remains. Original is retained.
- Frames fit 512px cells. Ground poses share foot baseline 470px. Head registration horizontal at approximately 415px avoids whole-body lateral jitter; crouch and airborne changes retain intentional body movement.
- Renderer animates real leg cels at speed-dependent 7–16 fps while continuous secondary lean, impact compression, and breathing are evaluated at display frame rate. Cel art stays crisp without crossfade ghosts. No character geometry is procedurally drawn.

## Integration and gameplay contract
- Import drawHopper, optional hopperEye. images.hopperAtlas must be the loaded hopper-atlas.png.
- Coordinates x/y are center-bottom at collision feet. w/h are full cell size; visible character is about 0.78w by 0.64h. Try full cell 240×240 for a 190×155 visible robot.
- Keep render state object persistent so run gait integrates velocity smoothly. time, kickT, launchT, landT, invuln are seconds; kickT goes .5→0, launchT .2→0, landT .18→0.
- Update animation clock in seconds and freeze it on pause. Facing -1 mirrors art. gravitySign -1 inverts around feet; do not pass an additional renderer flip.
- Rear kick damage window: 0.075–0.36 sec after pressing X, strongest at .19–.36 sec. Rear hitbox should extend behind current facing; launch rear attack is immediate for .18 sec. Feet only cause stomp on falling contact; ceiling under reverse gravity uses same local-foot rule.
- Jump input should happen immediately, with launch pose rather than mandatory anticipation delay. Land pose lasts .18 sec without locking movement or buffered next jump. This is essential for responsive jump rhythm.

## Remaining limitation
The 4-cel run loop is intentionally 1970s limited cel animation with smooth secondary motion; it is not a dense 24-pose animation. The supplied module has not yet been observed in the parent's actual game. Parent should visually verify run/launch/fall/kick transitions against collision contacts at normal play scale.

## Standalone runtime audit completed

Viewed actual Canvas renderer in Chrome at http://127.0.0.1:8976 using index.html. The preview automatically cycles run, launch, rise, fall, landing, kick, and left-facing motion. It also shows a reversed-gravity ceiling walk and both kick facings, plus overlay comparisons of 110×90 and 110×120 collision boxes. Pose selection and frame stepping allow repeatable inspection.

Findings and fixes:
- Foot pivots look planted in grounded run, kick, crouch and reversed-gravity walk.
- Found fall art hovering about 14px above its gameplay foot anchor. Corrected fall cel baseline to469; feet now extend to the contact anchor before landing.
- Replaced approximate eye locations with measured per-cel eye coordinates. hopperEye now applies the same secondary transforms as drawHopper, so crouching and shooting while leaning retain a correctly located muzzle.
- Full rear-leg kick reaches about 110px behind body center at height70px for a240px cell. A rear attack box centered65px backward/65px above feet and sized120×80px captures the visible sweep.
- Collision recommendation: width110,height110–120 for movement; optional slightly smaller100×105 hurtbox for forgiving combat. Height90 stops at thorax/eye and visibly excludes the upper mechanical body.
- Four real running cels are sufficient for the deliberate seventies anime cadence when used at7–16fps with display-rate root motion. Do not substitute whole-image bobbing for leg cycling. Four kick cels convey coiling, upper sweep, extension and recovery; the strongest held frame is .19–.36sec after input.
- No extra procedural antenna/rider bending was added: silhouette integrity and secure rider attachment stay intact.

verify-continuity.mjs checks12 semantic transitions, registered eye movement under16px at240px cell size, repeated draw/eye reads not advancing gait, buffered jump overriding leftover landing animation, and exact eye symmetry under facing/gravity inversion. All passed. The largest eye change is the intentional tucked-rise to extended-fall pose. This is a standalone rendering audit; full engine camera/collision synchronization remains for integration audit.
