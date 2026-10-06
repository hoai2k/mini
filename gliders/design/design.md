# Gliders: design

A gliding score-attack game in the spirit of Superflight, for one to four
players on one screen. Everyone flies the same procedurally built sky at the
same time, each in their own view, and the highest score when the clock runs
out wins.

## The loop

1. Launch from high above the sky, diving through the start gate.
2. Fly close to the floating structures. Proximity fills a **combo pot**; the
   closer and faster, the faster it fills.
3. Tricks while close raise the **multiplier** by one each.
4. Clear every surface for **two seconds** and the pot times the multiplier is
   **banked**. Hit anything first and the combo is lost.
5. Dive into the cloud sea or fly off the edge and you are sent back to the
   start, with the combo banked.

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

`game/src/flight.js`. An arcade glider with real energy: gravity, quadratic
drag, and lift that swings the velocity toward the nose at a rate that grows
with speed. Hands off at a level attitude it settles to about 26 m/s with a
glide ratio near 7; a steep dive reaches about 80 m/s and tucked about 115.
Climbing spends speed; below about 20 m/s the glider stalls and the nose drops.
Banking turns the glider (a coordinated turn around world up), and pitching in
a bank tightens it. Optional flight assist levels the wings when the stick is
released. Movement is substepped so fast gliders never pass through thin beams.

## Skies

`game/src/levels.js`. Each sky is a seed, a palette and a mix of formation
kinds: arches and aqueducts, frame runs (some twisting or curving), tunnels with
windows, towers with open cage storeys and cantilevers, spire forests, split
mesas with canyons and bridges, beam lattices, spiral stairs, walls with holes,
block rings and megaliths. Formations are scattered through a cylinder about
430 m across and 420 m tall without overlapping, then some are joined by long
beams. A gate under the launch point frames the way in, and the launch lane is
kept clear. Ten named skies, a Daily sky (seeded from the date) and a Random
sky (a five-letter seed; Y or R rolls a new one).

Rendering (`game/src/scene.js`): one instanced mesh of boxes. A shader bevels
their edges, darkens them toward the depths, adds a glow on night palettes,
and lights up the surface near a scoring player in that player's colour. A
gradient sky with a sun, a drifting fbm cloud sea, and linear fog in the
horizon colour so distant blocks dissolve into the sky.

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

Sound is synthesised (`game/src/audio.js`): wind that rises with speed, a
whoosh while close to a surface, chimes for tricks, an arpeggio for a bank, a
thud for a crash, and a slow generative ambient score.

## Art

Everything in play is built in code. Generated images are requested in
[`image-requests.md`](image-requests.md): the logo, the title background, the
app icon and a portrait badge per glider. Until they arrive the game uses
stand-ins: the logo in the page font, a live flyover behind the title, a
drawn SVG icon, and portraits rendered from the 3D models.
