# Hopper sprite and animation audit

## Scope and provenance

The runtime-qa PNGs are offscreen renders of the project's actual renderer, animation, level and combat modules, executed through @napi-rs/canvas. They are not browser UI screenshots or physical Xbox-controller tests. Modules are copied into this directory and stripped of TypeScript syntax without changing rendering behavior. Production image assets are loaded directly from the game public/assets directory.

Separately, actual Chrome gameplay was opened through Press Start and exercised with keyboard jump/kick and menu navigation. Takeoff, rear-leg kick, rider attachment, ground contact, pause and episode gating were visually observed in the real game. The Chrome tool emits instantaneous key presses, which limits sustained movement/beam capture; controller hardware was not connected or claimed as tested.

## Visual results

- All nine environments were reviewed with idle, running, rising, distant descending, kick, laser, grounded landing and drawn explosion scenes. Additional frames cover launch, close landing preparation, both left-facing attacks, the three boss arenas and the purple reverse-gravity gallery.
- Hopper consistently retains green mechanical armor, red eye, blue thorax, gold antennae and seated boy with scarf. No model-sheet labels or opaque sprite backgrounds appear.
- The normal ground foot anchor and reversed-gravity ceiling anchor match the platform collision surfaces. Feet and antennae remain within atlas cells.
- The eye beam starts at the red eye in both facings, using each cel's measured eye coordinate and the exact renderer lean/squash transform.
- Kick art visibly extends the enormous hind leg behind the current facing. The drawn glow/sweep accompanies the leg extension, and the boy remains attached.
- Generated explosion cels expand from spark into orange/cream fire and then smoke/embers with clean generated transparency. These are visible in the full explosion PNGs; the hero-detail crops intentionally do not include distant explosion centers.
- The three boss silhouettes remain readable against their own environment backgrounds and larger than Hopper. The reverse-gravity gallery keeps Hopper's feet touching the ceiling with the entire rider/robot assembly coherently inverted.

## User-requested airborne revision

Airborne descent now stays in the compact tucked pose until a valid landing surface is less than80 world units away and velocity points toward that surface. Only then does Hopper extend his feet. Ground compression is reserved for actual grounded landT. Missing/infinite distances keep the compact pose.

The clearest five-panel comparison is landing-and-facing-revision.png: far descent; near landing preparation; ground compression; left-facing hind kick; left-facing eye laser. This uses the latest production animation module. The broader sheets were regenerated after this revision.

## Automated checks

verify.mjs verifies pose sequencing, all gait cels, four kick phases, facing/gravity transforms and eye direction. verify-atlas.cjs verifies true RGBA, all12 frames contained, and grounded-foot registration. verify-continuity.mjs verifies stable repeated pose/eye reads, registered semantic transitions, buffered jumping during landing recovery and eye symmetry. verify-landing-prep.mjs covers near/far boundaries, rising/apex, unknown distances, inverted-gravity approach, actual ground compression and attack precedence. All passed.

## Integration notes

The actual engine uses the recommended110×120 movement body with240×240 sprite cells. The visible cel is intentionally smaller than the full cell because padding preserves long antennae, hind-leg extensions and consistent registration. A separately forgiving hurtbox can be retained without changing the foot anchor. Landing-distance queries should include valid enemy stomp surfaces, in addition to board platforms, so stomp impacts also show timely foot preparation.

No new blocking animation or asset-compositing defect was found in the final offscreen scene audit. Frame-count style remains intentional limited cel anime: four running cels at7–16fps with smooth display-rate secondary root motion, rather than a dense24-pose run loop.
