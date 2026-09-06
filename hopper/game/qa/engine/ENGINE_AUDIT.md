# Actual engine movement and combat audit

Source inspected and executed: `/Users/hoai/Documents/Games/mini/hopper/game/src/game/engine.ts` together with its actual `levels.ts`, `combat.ts`, and `hopper-animation.ts` imports. The test transpiles those files into a temporary directory. Only DOM/Renderer/audio/localStorage are mocked. Engine physics, static and optional platform collision, held-jump/release logic, gravity transitions, attack selection and damage remain actual game code.

## Findings fixed during audit

1. Optional crumble shelves originally collided with Hopper's head as solid ceilings. The City route jump `m0-a1-c4-p15 → m0-a1-c4-p16` was blocked after ~30px rise by the shelf overhead. Treating all optional platforms as one-way for side/head collisions fixes this while retaining landing/collapse behavior.
2. Moving platform metadata `speed:35` means 35px/s, but was used as 35 radians/s, giving a peak speed of 2,275px/s on a 65px oscillation. Dividing speed by range produces a readable slow swing and consistent player carry.
3. The registered eye sits ~101px above Hopper's feet; ordinary enemy colliders stand 65px high. Original narrow laser selection missed those ground foes. The corrected small forward cone and actual visible endpoint now hit their upper body while keeping the true eye origin.
4. Enemy aiming/projectile/contact code originally centered every player at `feet−45`, including inverted play. The final combat module uses `feet − gravitySign × playerHeight/2` and actual player width/height. Regression tests confirm that an inverted 120px body is hit below its feet and has no former ghost collider above them.

## Results

- **414 / 414 required route transitions pass the actual engine**, covering 138 per mission. Tests include head/side collisions, optional shelves and salvage geometry, with Hopper's actual 120px collider. Tested takeoffs are 100px inside each departure shelf; valid landings require 70px center clearance from destination edges. Multiple hold lengths, fast/standing starts and lateral steering policies are explored. - Purple optional gallery: **entry, inverted ceiling landing, lateral exit, and recovery on the safe floor all pass** using actual engine gravity switching and collision resolution. - Laser targeting: **all 18 enemy species take valid forward eye-laser hits**. Armored variants receive the intended 0.3 damage while closed; normal variants receive 1. - Every boss receives **0.3 closed-core / 1 exposed-core laser damage** when Hopper reaches its eye-height firing lane. The boss spawn, raised arena tiers and floor use consistent feet coordinates. - Core combat tests verify all species attack, all bosses cycle/transition phases, victory callback occurs once, launches hit behind, stomps rebound, armored crowns reject stomps, attack IDs prevent multiple hits per swing, and inverted player collision is correctly placed.

## Rhythm changes

The original terrain/elevation envelopes varied, but six fight positions repeated identically in every 18-shelf chapter. The final level module changes three chapter patterns into early paired fights followed by release, quiet vista/run stretches before late pressure, and paired final encounters. Enemy totals and safe checkpoint locations are preserved. This breaks a metronomic repeated encounter cadence without adding health padding or required arena locks.

Each mission retains 15 chapters, 138 route shelves including three crossing islands, ~116–118k world pixels, 93–95 enemies (about a third ambushes), 31 checkpoints, 9 optional fragments, 15 high roads, 3 low roads and 16–22 catch floors. The route test scripts the required inverted crossing (leap into the gate, ride the ceiling, drop onto the next landing) and tests every swinging main shelf at four phases. Raw maximum-speed movement is ~55–64 seconds per area; actual first-clear/campaign times are unmeasured and should not be presented as verified.

## Practical limits

These are headless execution tests, not browser screenshots or physical Xbox hardware tests. They verify actual numerical movement/collision and targeting, but cannot prove perceived animation smoothness, full-run pacing, audio quality, camera composition in every aspect ratio, or controller latency. The camera at the 1600×900 logical viewport leaves ~470 world pixels behind Hopper and ~1,130 ahead at rest, enough to show authored mandatory destinations. Narrow portrait window framing deserves a separate visual check if supported.

Evidence: `run.mjs`, `results.json`, `laser-results.json`; combat tests in `/private/tmp/hopper-combat/test-combat.mjs`.
