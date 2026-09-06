# Camera, facing, shield and movement regression audit

Executed the current real `engine.ts`, `levels.ts`, `combat.ts`, `hopper-animation.ts` and `input.ts` from `/Users/hoai/Documents/Games/mini/hopper/game`. TypeScript is transpiled into this temporary audit directory. Renderer/DOM/audio/storage are mocked; Renderer supplies a conservative 1600×900 world viewport. Tests invoke the actual fixed-step engine, actual registered animation function, and actual Xbox input polling.

Run:

```sh
node /private/tmp/hopper-camera-audit/all-jumps.mjs
node /private/tmp/hopper-camera-audit/targeted.mjs
```

The first script refreshes transpiled copies from the real source before testing. The second consumes those copies. Evidence is written to `results.json`, `laser-results.json`, and `targeted-results.json`.

## Results

| Regression | Measured outcome |
|---|---|
| Normal tap jump | Camera Y span **0px**; jump rise 130.52px |
| Full normal jump | Camera Y span **0px**; jump rise 399.88px |
| Full blue jump | Camera follows 178.29px only for edge protection; rise 625.90px; entire 240px atlas retains ≥24.90px top clearance |
| Rapid left/right on ground | Camera lead remains +330px; **zero direction flips** |
| Sustained reversal | New lead direction accepted after 0.425s |
| Air braking | vx reaches −270px/s while facing stays right; facing changes left on first subsequent grounded tick |
| Landing anticipation | 120px away uses tucked airborne pose; 60px away uses landing/fall pose |
| Blocked incoming damage | HP stays 7/7; immediate shield cost 0.2 |
| Shield depletion | Repeated quarter-second hits break shield in ~0.992s; no damage on the breaking hit; next unblocked hit lowers HP |
| Shield recharge | Releasing B restores energy to 1.0 |
| Xbox B | Actual input emits `blockHeld=true`, `pausePressed=false`; actual playing UI branch ignores the menu-only `backPressed` edge |
| Campaign reachability | **810/810** actual-engine route transitions pass |
| Inversion gallery | Entry, ceiling landing, side exit and safe-floor recovery pass |
| Laser targeting | All 18 species hit; all 3 bosses take intended 0.3 closed / 1.0 exposed damage |

## Recommendations and limits

No regression blocker found. Preserve these camera and facing values through this release. The blue-jump clearance is measured against the full 240px image canvas rather than merely the 120px collider; at the actual 0.95 zoom the viewport is slightly taller than the conservative mock, giving additional room.

This is deterministic headless numerical testing and code inspection, not a claim of physical Xbox hardware testing. The B menu-routing check combines real InputManager polling with inspection of the actual `mode==='playing'` branch; it does not mount React or synthesize a browser button click. Final browser checks should confirm the perceived transition and shield readability with the drawn sprites and HUD.
