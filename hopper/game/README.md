# Hopper the Grasshopper

A complete browser adventure in three episodes, built around Xbox controllers and fullscreen television/monitor play. The presentation uses generated, hand-painted 1970s anime artwork: a canonical Hopper model, twelve registered animation cels, eighteen shadow species, three bosses, nine environments, separate terrain/decor sprites, and an eight-cel explosion atlas.

## Play

Run `pnpm install`, then `pnpm dev`. Open the displayed local address. Press Start or a fresh controller button to enter the adventure and request fullscreen. Browsers that decline a fullscreen or audio request from controller polling can be activated with the on-screen fullscreen button.

| Action | Xbox | Keyboard |
| --- | --- | --- |
| Move / steer | Left stick or D-pad | A/D or arrows |
| Variable jump | Hold A; release for a short jump | Space |
| Hind-leg spin kick | X | J |
| Eye lasers | Hold RT | K or left mouse |
| Force shield | Hold B | L |
| Pause | Menu | Escape |
| Instructions | View | I |
| Menu confirm / back | A / B | Enter / Escape |

Takeoff strikes behind Hopper. Descending onto vulnerable monsters produces a stomp rebound. Airborne steering changes the trajectory without turning Hopper; facing can change once grounded. The compact flight cel remains active until descending within 80 world units of a platform or monster. The shield blocks from every direction, spends energy while held and when struck, and briefly breaks if depleted. Release it to recharge; shooting and kicking are suspended while shielding.

The camera prioritizes stable terrain. Ordinary jumps cause no vertical tracking. Very high leaps and deep drops receive screen-edge protection. Horizontal look-ahead reverses after sustained travel (at least 0.38 seconds and 150 units), so short aiming inputs do not whip the view around. The primary logical composition is 1600×900; fullscreen HUD and menu typography adapt to standard monitor/TV sizes.

## Campaign

1. **Earthbound Thunder:** Sunseed Fields → Crownline City → Thunderhead Range. Agricultural terraces, a metropolis with tall roof climbs, then storm gorges and summits. Boss: Night Rook.
2. **The Iron Migration:** Cinder Foundries → Tempest Docks → Skyhook Works. Casting lines, crane forests, descent shafts and launch scaffolds. Boss: Smelter Leviathan.
3. **Beyond the Black Sun:** Vermilion Basin (1.35g) → Cobalt Drift (0.55g) → Violet Inversion (0.85g, optional reversed-gravity galleries). Boss: the Eclipse Regent.

Each mission has fifteen named chapters, roughly 228–232k world units, 189 authored enemy spawns, 31 checkpoints and nine optional signal collectibles. Encounter clusters and recovery stretches vary between chapters. Checkpoints save locally, restore partial armor on arrival and restart nearby after defeat. Completing an episode unlocks the next. Bosses have three health phases, readable windups, attack patterns and exposed-core recovery windows.

Music is provided by the user: **Hopper the Grasshopper** accompanies title/menu screens; **Grass March 1** loops during gameplay. Track positions are preserved when changing between menus and play. Music and effects have separate volume controls.

## Implementation and verification

`src/game/engine.ts` owns the fixed 120 Hz simulation, camera, shield, saves and combat integration. `levels.ts` defines the routes, `combat.ts` defines enemies/bosses, `renderer.ts` composites the artwork and effects, `hopper-animation.ts` selects registered cels and eye origins, and `input.ts` / `audio.ts` handle devices and sound. React owns the title, HUD, accessible menus and settings.

Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`. The actual-engine traversal audit tests every one of the 810 required route transitions, including real head/side collisions. It also checks inversion recovery and laser targeting for every enemy/boss. Separate controller/audio/combat tests cover input quarantine, connection changes, shield input, looping/track routing, armor, stomps and boss phases. The camera/shield and animation reports are under `qa/`.

Visual QA includes browser checks and 100 offscreen scenes made with the production renderer. Automated numerical and visual checks do not substitute for a measured full-campaign playthrough or physical Xbox latency testing; completion times are intentionally not claimed as measured.

The browser exposes three small WebMCP tools when supported: read game status, pause, and open instructions. Localhost additionally exposes bounded development scene/step tools; these are absent on the deployed origin. All state and assets are local to the browser; no game-account backend is required.
