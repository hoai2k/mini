# Camera, look, facing, parry, shield, knockback, ledge-catch and wall-kick regression audit

Executed the current real `engine.ts`, `levels.ts`, `combat.ts`, `hopper-animation.ts` and `input.ts` from `/Users/hoai/Documents/Games/mini/hopper/game`. TypeScript is transpiled into this temporary audit directory. Renderer/DOM/audio/storage are mocked; Renderer supplies a conservative 1600×900 world viewport. Tests invoke the actual fixed-step engine, actual registered animation function, and actual Xbox input polling.

Run:

```sh
node /private/tmp/hopper-camera-audit/all-jumps.mjs
node /private/tmp/hopper-camera-audit/targeted.mjs
```

The first script refreshes transpiled copies from the real source before testing. The second consumes those copies. Evidence is written to `results.json`, `laser-results.json`, and `targeted-results.json`.

## Results

| Regression                 | Measured outcome                                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal tap jump            | Camera Y span **0px**; jump rise 130.52px                                                                                                                                                                                                                       |
| Full normal jump           | Camera Y span **0px**; jump rise 399.88px                                                                                                                                                                                                                       |
| Full blue jump             | Camera follows 178.29px only for edge protection; rise 625.90px; entire 240px atlas retains ≥24.90px top clearance                                                                                                                                              |
| Rapid left/right on ground | Camera lead remains +330px; **zero direction flips**                                                                                                                                                                                                            |
| Sustained reversal         | New lead direction accepted after 0.425s                                                                                                                                                                                                                        |
| Air braking                | vx reaches −270px/s while facing stays right; facing changes left on first subsequent grounded tick                                                                                                                                                             |
| Landing anticipation       | 120px away uses tucked airborne pose; 60px away uses landing/fall pose                                                                                                                                                                                          |
| Parry directions           | A blow from behind or straight down during the spin kick does no damage and flashes; the same blow from the front lands. The held guard turns a frontal blow at an energy cost and lets a rear blow land. Hazards, and blows after the kick window, always land |
| Knockback                  | A hit sets a 0.3s stun; steering is ignored and Hopper travels ~94px backward before control returns                                                                                                                                                            |
| Ledge catch                | Falling 40px below a lip, 80px short of it, pressing toward it: caught and standing. 140px short, 140px low, or pulling away: not caught. Thin one-way shelves are caught only as the feet pass the lip                                                         |
| Guard                      | Held B turns a 2-damage frontal blow (HP 7/7, energy −0.2); quarter-second frontal hits break it in under a second with no damage on the breaking hit; the next unguarded hit lowers HP; releasing recharges to 1.0                                             |
| Wall kick                  | A jump pressed while touching a solid face launches at vy < −800, vx < −400 away from the wall, facing away; 24 frames after leaving the face the kick is gone                                                                                                  |
| Right-stick look           | Full deflection ahead and up drifts the rendered camera > 400 units ahead and > 250 up and widens zoom by > 0.15; 2 s after release it is back within 5 units and 0.01 zoom                                                                                     |
| Spring pad                 | Walking onto a pad launches Hopper to a 510 px apex without a jump press                                                                                                                                                                                        |
| Counter belt               | Standing on a −70 belt for one second drifts Hopper 70 px backward                                                                                                                                                                                              |
| Wind lane                  | Under a −150/+400 push a full jump's apex drops from 309 to 276 px and it lands 87 px shorter                                                                                                                                                                   |
| Laser aim                  | A shadow on a shelf 519 px below is hit; one 69 px below and ahead is hit; one directly behind is ignored; one behind solid terrain is not hit                                                                                                                  |
| Xbox B                     | Actual input emits `blockHeld=true` and the menu `backPressed` edge, `pausePressed=false`; the playing branch ignores the menu edge                                                                                                                             |
| Campaign reachability      | **405/405** actual-engine route transitions pass                                                                                                                                                                                                                |
| Inversion gallery          | Entry, ceiling landing, side exit and safe-floor recovery pass                                                                                                                                                                                                  |
| Laser targeting            | All 18 species hit; all 3 bosses take intended 0.3 closed / 1.0 exposed damage                                                                                                                                                                                  |

## Recommendations and limits

No regression blocker found. Preserve these camera and facing values through this release. The blue-jump clearance is measured against the full 240px image canvas rather than merely the 120px collider; at the actual 0.95 zoom the viewport is slightly taller than the conservative mock, giving additional room.

This is deterministic headless numerical testing and code inspection, not a claim of physical Xbox hardware testing. The B menu-routing check combines real InputManager polling with inspection of the actual `mode==='playing'` branch; it does not mount React or synthesize a browser button click. Final browser checks should confirm the perceived transition and parry readability with the drawn sprites and HUD.
