# Gliders: design

A gliding score-attack game in the spirit of Superflight, for one to four
players on one screen. Everyone flies the same procedurally built sky at the
same time, each in their own view, and the highest score when the clock runs
out wins.

## The loop

1. Launch from high above the edge of a vast field of floating rock islands,
   diving in over the tallest of them.
2. Fly close to the rock. Proximity fills a **combo pot**; the closer and
   faster, the faster it fills.
3. Tricks while close raise the **multiplier** by one each.
4. Clear every surface for **two seconds** and the pot times the multiplier is
   **banked**. Hit anything first and the combo is lost.
5. Fly through a **portal** (a tumbling ring of purple cubes) for 1000 points
   and a fresh dive from the top, combo banked.
6. Dive into the mist below or fly far out past the islands and you are sent
   back to the top, combo banked.

### Tricks

| Trick | When |
| --- | --- |
| Thread | Blocks within 8 m on both sides at once (left and right, or above and below) |
| Tunnel | Blocks on three or four sides for half a second |
| Skim | Within 2.4 m of a surface for 0.6 s |
| Upside down | Inverted while close for 0.8 s |
| Blazing | Faster than 80 m/s while close for 0.8 s |
| Flow | Every six seconds of one unbroken combo |

Each trick also adds 300 points to the pot and has a short cooldown. The
multiplier caps at ×30. Values live in `game/src/scoring.js` (`SCORING`).

### Modes

- **Best run** (Superflight's rule): a crash ends the run; the player's score
  is their best run of the round.
- **Score attack**: everything banked counts; a crash only loses the pot.

Round lengths: 1, 2, 3 or 5 minutes, or free flight with no clock (end it from
the pause menu). When time runs out, open combos are banked. The best scores
per sky and mode are saved in the browser.

## Flight model

`game/src/flight.js`. A glider with real lift, so you feel the forces:

- Lift grows with the square of airspeed and with the angle of attack (the nose
  above the flight path), up to about 6.6 G, and pulls along the wing's up
  axis. Drag grows with angle of attack, so hard pulls bleed energy.
- The stick asks for an angle of attack around a trim angle; the airflow turns
  the nose to it. Hands off, the glider settles at about 35 m/s with a glide
  ratio near 10. Pushing over dives at negative G (75 m/s in four seconds);
  tucked, dives reach about 160 m/s.
- Pulling up at speed is heavy: at 80 m/s full back stick is about 6.5 G and
  swoops you up 60 m in two seconds while speed drains. Too slow, past the
  stall angle, lift collapses and the nose drops until you have speed again.
- Banking tilts the lift, so you turn and sink unless you pull; the nose
  weathervanes into the airflow. Optional flight assist levels the wings.
- **Updrafts** rise along the cliffs of the larger islands (motes drift up in
  them): up to about 17 m/s² of lift, with buffeting.

The forces are felt, not just simulated. The camera is pushed against the G
(the glider climbs in the frame in a hard pull, floats under negative G), the
view narrows under heavy G and widens with speed, the edges grey out under
heavy G and flush red under negative G, a bright rush gathers at the edges at
full speed, and the camera buffets with speed, G, closeness to the rock and
rising air. Controllers rumble with the same, and the wind loads up and
gusts. Reduce motion tones all of the camera effects down. Movement is
substepped so fast gliders never pass through rock.

## Skies

`game/src/levels.js`. Superflight's worlds are huge floating islands of chunky
cubes, mountainous and stacked, with cliffs, tunnels and holes, above a white
mist; flying into the mist or too far out takes you to a new world. Gliders
matches that scale: each world is a field about 2.5 km across and 1.2 km tall.

- **Islands** are voxel masses (cubes of 14, 11 or 7 m for big, medium and
  small islands): an irregular outline, a top shaped as a mesa, peak, ridge or
  terraces, and an underside that tapers into hanging spurs. Tunnels wander
  right through, holes are punched through cliffs, canyons split some mesas,
  spires rise from the tops, and loose rocks drift alongside. Only the surface
  cubes are kept, slightly jittered in size and place so the rock reads as
  rough, with cohesive caps, darker undersides and faint strata.
- About four big, a dozen or more medium and a couple of dozen small islands
  per world, some stacked above others with gaps of 55 m or more to fly
  between. About 50,000 cubes in all.
- **Rock materials.** Superflight's seeds differ in character as much as in
  colour: players describe "needle town", "flat wide channels", "tons of flat
  floating platforms", "hollow shelves", "large columns with tiny spaces",
  "one large mountain with lots of holes" and "tons of windows". Each world
  here mixes one to three materials, each a 3D noise rule inside the island
  outlines: **massive** (thick, smooth), **craggy** (ridged noise pushing
  spikes out and biting in), **sponge** (windows everywhere), **wispy** (thin
  curling sheets, finer cubes), **needles** (noise stretched tall), **shelves**
  (noise squashed flat: stacked platforms) and **columns** (great pillars with
  narrow gaps). Materials also change the cube size and the outline (tall for
  needles and columns, flat for shelves, wide for wispy). Random and Daily
  skies roll their own mix; some palettes are monochrome (Ash) or two-tone
  silhouettes (Mint Silhouette).
- **Distant giants**: a ring of huge islands 2.6 to 4.6 km out, scenery only,
  softened by the haze, so the world seems to go on.
- **Updrafts** (see above) and three **portals** in open air near the rock.
- Styles: archipelago, spires, canyon, stacks, caverns and peaks. Twelve named
  skies, a Daily sky (seeded from the date) and Random skies.

Rendering (`game/src/scene.js`): one instanced mesh per island so islands out
of view are skipped. The rock shader bevels each cube and lights it near a
scoring player. Haze thickens with distance and with depth, so the islands'
undersides sink into the mist. A gradient sky with a sun turns to haze at the
horizon and to bright mist below it, and painted greyscale cloud layers are
tinted in when delivered. Three drifting sheets of mist lie below the islands.
Low graphics shortens the view to 2.8 km with thicker haze.

## Gliders

Six procedural characters (`game/src/creatures.js`), each with four colour
variants: Flying Squirrel, Microraptor, Flying Fish, Draco Lizard, Wallace's
Flying Frog and Paradise Tree Snake. They are built from lofted bodies and
animated membranes, fins and feathers that react to speed, tuck, flare and
the stick. All six fly the same way: the choice is a look, not a stat, so
the competition stays fair.

## Players and input

- **Joining:** on the glider screen, A on a controller (or Space / Enter on the
  keyboard's two sides) joins. ◀ ▶ glider, ▲ ▼ colours, Y invert pitch, A ready,
  B back. The controller that pressed Start on the title joins as P1.
- **Flight:** left stick pitch and roll (pull back for nose up; invertible per
  player), RT or A tuck, LT or X flare, LB / RB and right stick rudder, Menu
  pause. Keyboard: WASD + Q/E + Space/Shift, or arrows + , . + Right Shift/Ctrl.
- **Split screen:** one view; two stacked; three in quarters with a live
  standings panel and an overview camera in the fourth; four in quarters.
- A controller disconnecting mid-round pauses the game. Losing focus or
  hiding the tab pauses too.

## Look and feel

Superflight's palette of clean, flat-coloured blocks in pastel haze, with a
softer, rounder UI (Fredoka and Nunito) and frosted panels. The camera rolls
part-way with the glider and widens its field of view with speed; speed
streaks appear past 45 m/s; contrails from the wingtips glow and widen while
a combo is open. Reduce motion turns off the roll, the FOV kick and the
crash shake.

Wind is the heart of the sound, as in Superflight. Five loops generated with
ElevenLabs ([`sound-effects.md`](sound-effects.md), made by
`source/build_audio.py`) are layered in `game/src/audio.js`:

| Layer | Behaviour |
| --- | --- |
| `wind-glide` | Soft bed, full below about 30 m/s, a fifth of that by 70 |
| `wind-fast` | Steady rush from about 25 m/s, eases off in the fastest dives |
| `wind-dive` | Howling roar from 65 m/s, full by 115 |
| `wind-close` | Bright rush that rises as you skim a surface |
| `flutter` | Membrane flutter, rising with speed and when you flare |

The beds are pitched up a little with speed, and a low-pass filter opens from
dull to full as you speed up. In split screen the wind follows the fastest
player. A pass-by whoosh plays when you thread a gap or clear a tunnel, and a
recorded thump when you crash. The menus keep a soft breeze. Chimes for tricks
and banks, the countdown, menu ticks and the slow ambient score are
synthesised. If the recordings are missing, synthesised wind stands in.

## Art

Everything in play is built in code. The generated images
([`image-requests.md`](image-requests.md)) are all delivered: the logo (title
screen, pause menu, library card), the title key art (title screen, library
card), the app icon (tab and home screen, scaled into `game/icons/`) and a
portrait badge per glider (HUD and results). The key art places its gliders in
the upper middle, so with it the title screen sets the logo at the top and
Press Start low, leaving the middle band to the picture. If an image is
missing the game falls back to its stand-in: the logo in the page font, a live
flyover behind the title, and portraits rendered from the 3D models.
