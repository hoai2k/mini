# Bacterium

Level 5 of the Zoom Chain, as a playable prototype: be a **magnetotactic
bacterium** (a *Magnetospirillum*-like spirillum, 3 µm long) in a drop of
bog-pond water under a coverslip at 1000×, at the limit of the light
microscope, and **grow a swarm of your kin, hundreds strong, and drill your
way through the enemies that block the way to the host cell**. Or switch, in Features, to
the predator ***Bdellovibrio bacteriovorus*** (1 µm), which rams a prey cell,
bores into its periplasm and eats it from inside. Published in the prototype
archive at `micro/game/bacterium/`.

The owner's brief (1 November 2026): no circle round the group; move, slow
down and stop as you like, spinning faster as you move; the group a flock
whose cells each follow it in their own way, not clones; X sends a beacon
that kin touching the group answer as they join (no automatic joining), and
X also eats prey; no oxygen meter; the challenge is to gather an army and
fight your way to your destination, paced as a rhythm of moving, an
obstacle, a calm break, the next, to a boss at the end. No time limits. And
(the same day, for every world: `../../design/encounter-pattern.md`) the
encounters placed as you go, in water you haven't seen, the same order
whichever way you head, explored water never changing, every danger
visible, and a safe area you can stay in forever.

**You steer with LS, as fast as you tilt; let go and you stop.** A real
bacterium cannot steer: it runs straight, rotational Brownian motion slowly
bends its course, and it tumbles into a new random direction, so chemotaxis
is only a choice of *when* to tumble. Steering is therefore a labelled game
assist. While the stick is held the cell turns toward it, fast but not
instantly, and swims at a speed set by the tilt, from a slow drift (a third
of the way: about 13 µm/s) to a full run (45 µm/s). Release it and the
motors stop: at low Reynolds number the cell stops dead, and only Brownian
motion, the flow and the magnetic torque move it. Its flagella and body turn
with its speed: fast in a run, slower as it slows, still when it stops.
Honest run and tumble (no steering) is a Features choice.

**The rework (the owner, 3 November 2026):** "I found the edge of the world
which was an invisible wall ... I couldn't find the portal ... I saw some
spiral looking bacteria that wouldn't join my group even when I beacon'd them
... the messages about them were weird ... You should be able to find a portal
long before you find the edge of the world, and if you end up at the edge of
the world it should look like a border (for example like the edge of a water
droplet in a slide including some visual light bending as you approach the
very edge). The default camera should also slowly zoom out as your group
becomes bigger and bigger, and you should eventually be able to have hundreds
or a thousand bacteria in your group ... a progressive path to the final
portal, and putting in specific enemies that block your way and that you can
battle with in that they each [eat] some of your group and you can drill into
them ... each additional bacterium is like an extra HP". What changed: **The
drop** (no invisible walls), **The way** (a route with enemies and colonies),
**The battles**, the swarm up to 1000 (**The army**), the camera (**The view**
in Approach), and every creature's message (`text_config.js`). What was wrong
before (the diagnosis):

- **The invisible walls** were five clamps with nothing drawn at them: the
  field was a 1120 µm square (`WORLD.x0/x1 = ±560`, `y1 = 560`) and your cell
  (`swim.js`), every member and free kin cell (`collective.js` `clampCell`)
  and every free cell (`world.js` `stepCell`: bounced at the top, wrapped
  round left and right) were clamped to it; the biofilm floor stopped you
  dead 20 µm into the slab. The host sat on its default path 440 µm out, so
  heading almost any other way met a wall within ~12 s, and the host was
  sealed until five gates placed as you go had all been met.
- **The spirals that would not join** were the stranger strain (eight
  magnetotactic cells kept near any army of 4 or more to waylay it): drawn
  exactly like your kin, never recruitable, and tinted amber only while
  luring. (Kin past the old cap of 48 members would not answer either.) They
  are now drawn apart (longer, thinner, a tighter helix, no magnetosome
  chain, always faintly amber) and the cap is 1000.
- **The messages**: "A grazer took a member of your army (5 left): members
  are your health" on every loss (and "grazer" for what the gauge called a
  peritrich), "A clay grain, bigger than you" at random on bumps, "The
  peritrich jerked back on its coiling stalk" whenever you brushed its bell,
  "The host's phages are not ready for you yet: meet the gates first",
  "Toxin burst! Peritrich hit (a quorum-gated toxin, like violacein)", the
  phage gate's tip naming the D-pad, a features note saying "three"
  Bdellovibrio. They now say what is happening and what to do, once.

## Landmarks (the Micro Zoom chain)

World 6 of the game (`micro/game/`), between the Paramecium and the phage.
Both landmarks are drawn into the specimen with the same optics as
everything else (`draw.js`, `landmarks`). A quiet edge mark
(`shared/landmark.js`, a hollow ring) shows where the way back is when it is
off screen; there is no arrow to the way on unless the Portal arrow setting
is on (see **The way**).

- **Forward (the portal): a host cell with phages landing on it**, the
  director's last encounter (see **The way**): at the end of the route,
  1700 µm out, from the first frame (sealed until every gate has been met),
  else placed after every gate has been met, in water nobody has seen, a
  little ahead of whoever leads, out of view (`placePortal` in `main.js`).
  Its signal thickens toward it as a haze in every look (**The way**). The shared golden glow
  (`shared/portal.js` `createPortalGlow`, its ground plane turned to face the
  microscope, drawn over the optics with an orthographic camera; dimmer while
  guarded) and its light spilling in from the screen's edge
  (`createPortalLight`) mark it, with no text. Stentor guards it: touching it
  (your cell or any cell of your army) while Stentor is on guard turns you
  back; once your army has beaten Stentor it is open, but never an automatic
  door (the owner, 2026-11-01): while you (or your army) touch it, the game
  shows "Y Enter the portal" (`embed.near('portal', true)`; standalone,
  `shared/embed.js` shows it), and your **Y** (R) calls `enterPortal(P)`
  instead of the toxin burst or the overlay (LS click still fires the toxin),
  the one place that fires `embed.landmark('forward')` (a golden burst, a
  bloom and the portal chime). While Stentor guards it there is no prompt
  and Y does what it does elsewhere. It is swollen, its contents crowded with new
  phage heads, phages are docked all over its surface; phase contrast shows
  only the swollen host, fluorescence (SYBR) and darkfield the phages.
- **Backdoor: the looming Paramecium** at the top left, in the open water
  above the biofilm: the edge of a cell forty times your length, its pellicle
  with the trichocyst seam, green *Chlorella* inside and a row of cilia
  beating along its edge. Stay within 38 µm of it for half a second: a quiet
  prompt "Y · back to the Paramecium's pool" shows (in the game the shell
  draws it, `embed.near('back')`), and Y rises to the pool
  (`embed.landmark('back')`). There Y means "go back".
- Standalone, the page behaves the same and `embed.js` shows a small toast
  in place of the zoom. The stats corner gives both distances.

## The boss: Stentor coeruleus

`stentor.js` (state, vortex, the oral disc), drawn in `draw.js`, run by
`runBoss` in `main.js` (`shared/predation.js` `createFight` as its state
machine) and fought as the last gate (`guards.js`). The giant blue trumpet
ciliate (1–2 mm) is anchored by its foot to the biofilm beside the host
cell: at 1000× it is enormous, so only the rim of its oral disc with the
band of membranelles beating round it looms in from the right edge of the
field, its striped blue body tapering down to the foot. Its vortex of specks
spirals into the oral pouch off-frame.

- **Its look** follows the delivered reference sheet
  (`assets/reference-sheets/boss-stentor.webp`): a trumpet flaring from a
  narrow foot with a little flared holdfast to a wide oral disc seen
  obliquely, its rim ringed all round by the membranelle band, spiral
  grooves on the disc running into the oral pouch, fine longitudinal
  pigment stripes, the macronucleus as a chain of beads, and green
  zoochlorellae and food vacuoles inside (`SHAPE.TRUMPET` in
  `bacterium-shapes.js`).
- **Placed with the portal** (`stentor.place`): its mouth 122 µm beyond the
  host, its foot on a clay grain to one side. **Wakes** when a player comes
  within 200 µm of its mouth; a brass gauge
  shows its health (the enemy gauge at the top, shared by every gate).
- **The steady vortex:** within 150 µm of the mouth a swirling current you
  can swim against. **Inside the rim of its oral disc** (the ellipse the
  membranelles ring, `stentor.disc()`) a cell is swept in: in about 3 s in
  the steady vortex, in about half a second during a pull.
- **Its tell:** the membranelles beat faster and the vortex brightens
  (1.4 s). **The pull** (0.9 s): a strong draw toward the mouth. **Below half
  health** the pull is harder.
- **Your play:** bring a swarm and drill into its rim (**The battles**):
  every member that reaches the rim latches on and bores in (up to 520 at
  once); every member it sweeps in poisons it; X drills harder; Y's toxin
  takes 12 % of its health. Its bite is the pull: each pull sweeps up to 30
  members at its rim and inside it into the oral pouch. A tumble (B) at the
  pull breaks your own cell free, as does bumping its foot (it contracts in a
  flash and pauses), and each costs it 2 % of its health, as does a pull that
  comes up empty. Beaten, it contracts and stays shut: the host is yours.
- **Measured** (`flock.test.mjs`, a swarm pushed at its mouth, X every
  0.5 s): 120 is eaten; 300 wins in ~15 s with about a third lost; 900 in
  ~7 s losing a few. Health 6500, regrowth 8/s.
- **Swept in:** the follow-and-respawn catch: round the vortex, into the
  oral pouch, packed into a food vacuole carried down into its body, the
  camera pulled back to the 90 µm field; then the fade and a respawn in open
  water nearby, away from the gates (together: beside a teammate).
- **Departures:** the vortex's reach and strength are game values, the pulls
  are a rhythm for play (a real Stentor feeds steadily), and the host only
  letting you in once it is beaten is a game rule.
- Test hooks: `__micro.boss()` (awake, state, resolve, vortex strength,
  contraction, a log), `__micro.stentor`, `debug.wakeBoss()`.

## The army (a flock of kin)

`collective.js`, drawn in `draw.js` (`kin`), run from `main.js`.

- **The beacon (X).** X sends a pulse from your flock, from its front while it moves (the cell furthest along its way) or its middle when still, riding with the flock, out to
  its reach: its edge plus 7 µm (alone: 9 µm, three body lengths; at most
  44 µm). It is drawn on the medium as a ring of soft spots spreading and
  fading. Free kin cells (your own species, the dim spirilla wandering in the
  meadow by the start, in the colonies along the way, and kept near you wherever you go) that the ring passes answer
  with their own small pulse, one after another (0.08 s plus 0.09 s per
  answer before them for the first eight, then a quick ripple, never more
  than 1.8 s: `answerDelay`), and join. **Kin never join by themselves.** One
  beacon every 0.3 s, so you can press X everywhere. The reach grows with the
  swarm (its edge plus 7 µm, up to 90 µm).
- **The swarm grows without a limit you will meet** (`COLL.max` 1000; the owner:
  "you should eventually be able to have hundreds or a thousand bacteria in
  your group if you keep collecting"): the colonies along the way hold 90,
  180 and 320 kin, X lyses prey and every member grows toward dividing
  (`COLL.grow`: 300 s on its own, twice as fast in a food patch, a third of
  the way per prey rod). A scripted run that visits every colony reaches
  ~550–1000 at the host. **Every member is a life** (**The battles**).
- **The stranger strain never joins**, and is drawn so you can tell: longer and
  thinner than your kin, a tighter helix, no magnetosome chain in
  fluorescence, and always faintly amber (brighter while it lures).
- **X also eats.** Every prey rod (the E. coli-like rods) within 1.7 µm of a
  member's middle, beyond its half length, is lysed: it rounds up, swells and
  bursts into a fading puff, and the member that took it grows a third of
  the way to dividing. Members divide into the flock (up to 1000), so eating
  grows the army as well as calling kin does. X also strikes: every member
  touching an enemy adds a volley (`guards.js`). Holding X still takes up
  dissolved food in a patch for your own cell.
- **You steer the flock, not a cell.** The stick sets the flock's intent: a
  heading and a speed. Your own cell reacts at once; every member follows by
  its own rules (`FLOCK` and each cell's personality):
  - the intent **as it has perceived it so far**: its own reaction lag
    (0.05–0.35 s) plus 0.04 s for every µm it is behind the flock's leading
    edge, so the front moves first and the rest follow bit by bit;
  - **cohesion** toward the middle beyond a comfortable radius
    (1.05 √n + 1.2 µm), and with the stick released a gentle pull so the
    flock settles; **separation** (cells keep 2.3 µm apart: a physical push
    and a steer); **alignment** with the neighbours within 6 µm (each to its
    own degree, 0.2–0.6); a slow **wander** of its own;
  - its own **top speed** (0.82–1.18 × 45 µm/s), **turn rate**
    (4–8 rad/s), **speed ramp** (0.12–0.32 s) and a slight variety of
    **length and helix**. It swims along its body, so to change direction
    it must turn round, slowing while it faces away: the laggards overshoot
    and loop back. Release the stick and the leaders stop first, the rest
    coast in, turn back and settle; a stopped cell needs a little more push
    to start again, so a resting flock rests. Each cell's flagella and body
    spin with its own speed.
  - Measured (`flock.test.mjs`, 40 members): 0.15 s after pressing forward
    under a fifth of the flock is moving, after 0.4 s nearly all; cruising,
    their speeds differ by ±2.5–3.5 µm/s and their headings by ±0.08 rad;
    after a reversal the first turns round at about 0.45 s and the last at
    about 1.2 s; released, the flock is still within about 4 s.
  - The camera (a follow camera: **The view**) and "where the flock is" (the
    split screen, the edge arrows' origin, the gates) use the flock's middle,
    smoothed; alone, your cell.
    Your own cell's corner brackets show only while you are alone (or, in
    multiplayer, in your colour).
- **Waylaying** (the owner, 3 November 2026: "interactions with some other
  bacteria able to cause certain members of your group able to be picked off
  by kind of waylaying them, so you'd have to call them back ... If you go
  around spamming X then you won't have this problem"; `WAYLAY` in
  `collective.js`). A **stranger strain** (other magnetotactic cells,
  `world.js`) comes over to a flock of 4 or more and loiters just beyond its
  edge, edging slowly away; every 2.4 s it sends a decoy pulse (an amber ring)
  that draws off the nearest member within 10 µm of it (at most 2 per stranger
  and 3 per flock at once; a member just called back is left alone for 4 s).
  A **drifting member** leaves the formation for the stranger, more the longer
  it drifts: it is tinted amber, ringed in amber and trails a thin dashed amber
  link back to the flock that thins and fades as its time runs out (no meter).
  Left **7 s** (or 45 µm from the middle after 3 s), it is **picked off**: an
  amber flash, and it swims away with the stranger and is gone; the stranger
  leaves with its catch. **Your beacon (X)** reaching a drifting member calls
  it back at once (its own small answer pulse), and reaching the stranger
  drives it off (its followers come back too); the beacon stretches up to
  60 µm to reach them. A stranger loiters 12 s at most and comes back to
  waylay after 25 s, so a player who pulses X now and then never loses one.
  Never in the meadow round the start (it stays safe for ever). Measured
  (`flock.test.mjs`): a stranger 18 µm off a resting flock of 10 comes over
  and draws a member off within ~2.5 s; ignored, the member is picked off ~7 s
  later; X calls it back in under 0.8 s; pulsing X every 1.5 s for 30 s loses
  none. Real basis: autoinducer crosstalk between strains and chemotaxis to a
  neighbour's attractants. **[Departure]**: a strain luring cells on purpose,
  and the numbers. Test hooks: `__micro.waylays()`, `debug.stranger(slot, d,
  a)`.
- **Members are your health** (**The battles**). A predator that would take you (the peritrich's
  funnel, the amoeba, Stentor, a Bdellovibrio's ram, a phage) takes the
  member on its side instead. Members it eats poison it (`guards.js`).
- **Army size** (members plus the players' cells) gates three abilities,
  shown in a quiet line at the bottom of the screen ("Swarm 23 · slime shield
  · raft · toxin 60 %"; alone: "press X near the spirilla like you to call them"), never a ring:
  - **5, slime shield:** EPS round every member (a haze in fluorescence).
    Phages stick in the slime; a Bdellovibrio's ram glances off half the time
    (a pack's, three times in ten).
  - **8, raft:** currents (the grazers', Stentor's vortex) drag the flock less
    the bigger it is: 1 / (1 + army / 6), a third at 12, an eighth at 40.
  - **12, toxin:** the toxin burst charges over 6 s and holds; **Y** (or LS
    click) fires it: a purple ring 32 µm across, a big hit on every enemy in
    reach, grazers recoil, Bdellovibrio die, phages are destroyed. The cells
    of a charged flock show a faint purple (violacein-like) absorbance.
- **Together:** touch another player's flock (your cell against any of its
  cells) and you join it: one flock, the sticks blended into one intent (each
  player's own cell steers half by its own stick). **Leaving is by moving
  away:** branch off 20 µm from the other players and the army **splits
  evenly**, each player taking an equal share, the members on their side.
  Tested with four players of 20–40 each: two merged into one flock of 60 and
  split 30 / 30 by steering apart.
- **Real basis:** quorum sensing is a density switch read from diffusing
  autoinducers (C19, C28); swarms move as rafts of aligned cells (C29);
  multicellular magnetotactic prokaryotes swim as one (C20); contact killing
  by type VI secretion (Pukatzki et al. 2006). **[Departure]:** a player
  steering a group, the visible beacon (autoinducers are invisible small
  molecules), kin answering one by one, members dying in your place, a
  magnetotactic spirillum lysing prey (myxobacteria hunt in packs;
  *Magnetospirillum* does not), and the numbers.
- Features → Body → *Your army* (on by default). Test hooks:
  `__micro.coll()`, `__micro.collective`, `__micro.members(slot)`,
  `debug.x(slot)` (X), `debug.fill(n, slot)`, `debug.recruit(n, slot)` (kin
  beside you, for a beacon), `debug.charge(slot)`, `debug.burst(slot)`;
  `?flock=n` keeps every player's army at n.

## The drop (no invisible walls)

`world.js` `DROP`, `rimMove`, `soften`; the optics' `uDrop`
(`shared/techniques/bacterium-fluorescence.js`). The world is a round drop of
water under the coverslip, 4300 µm in radius, centred on the start: more than
twice as far out as the host (2100 µm) in every direction, so the route's end
comes long before its edge (`route.test.mjs`: 16 rushes in every direction
meet the host 1850–2500 µm out, never nearer the edge than ~1800 µm).

- **Its edge is the meniscus, and it shows** (in every look, from the optics'
  composite): within ~30 µm of it the water darkens a little, then a bright
  refracted line with coloured fringes, a dark wall of curved water just past
  it, and beyond, the flat empty air under the coverslip. **The light bends**
  as you come to it: the last ~60 µm inside the edge are magnified outward (each
  pixel shows the water a little nearer the edge, in a few soft moving
  bands), the edge itself staying put, more strongly the nearer the view comes
  (`dropUniform` in `main.js`). Phase contrast: the line bright, the air pale;
  fluorescence: a faint blue line on black, the air black; darkfield: a white
  line.
- **Surface tension, not a wall**: within 30 µm of the edge the outward part
  of every move (your cell, every member, free kin, every free cell) is cut,
  to nothing at the edge itself (`rimMove`: smoothstep of the distance), so a
  cell swimming straight out eases to a stop about a micrometre inside the
  line you can see, and slides freely along it; a swarm piles up against it.
  Measured (`flock.test.mjs`): full tilt from 60 µm out stops 0–3 µm inside the
  edge, the speed falling by under 15 µm/s a frame (the Brownian jitter's
  size; a wall would be 45), and sliding along it covers 40+ µm in 2 s.
- **The sediment bank** along the bottom of the drop (the biofilm slab, 548 µm
  below the start) is the only other barrier, and it is drawn as what it is
  (a slab deep enough that you never see past it). Its EPS slows you more the
  deeper you go (`filmK`: from 1 above its fuzzy surface to 0.45 just inside,
  to nothing 24 µm in), so you ease to a stop in it; free kin turn back at its
  surface.
- **Clay grains** you push round or ride over (2.5D), as before.
- **Ambient life in a window** (perf): the drop is ~30× the old field, so the
  specks, ambient phages and bacteria live within ~460 µm of the players and
  are recycled out of view (never into a view) as they fall behind; kin and
  prey are kept near every player (`keepAmbient`). The scenery (clay grains,
  their microcolonies, matrix strands) is laid out once over the whole drop
  in seeded 100 µm tiles and found through a grid (`createBuckets`).

## The way: a route, its enemies and colonies

`world.js` `BEATS`, `COLONIES`, `DEFAULT_PATH`, `DIRECTOR`, `ENCOUNTERS`,
`guards.js`, the director in `main.js` (`shared/director.js`;
`../../design/encounter-pattern.md`). The camera has no forward (it looks
straight down and never turns), so the way is a route laid out from the start
along a bearing (0.25 rad: right and a little up, away from the Paramecium and
the sediment bank), with everything on it from the first frame:

| µm along | Beat | What | Its `need` |
| --- | --- | --- | --- |
| 0 | the meadow | ~40 kin and 60 prey rods round the start (you start among them: the kin clump); safe for ever | — |
| 400 | gate 1 | **a peritrich** (Vorticella-like), its funnel turned aside | 14 |
| 680 | colony 1 | 90 kin round a big clay grain with its microcolony, a food patch, 26 prey rods | — |
| 980 | gate 2 | **a Bdellovibrio pack** (sixteen) | 50 |
| 1260 | colony 2 | 180 kin, food, 34 prey | — |
| 1560 | gate 3 | **an amoeba's edge**, 190 µm across the way, sliding along it to stay in front of you | 150 |
| 1830 | colony 3 | 320 kin, food, 40 prey | — |
| 2100 | the host | **Stentor** guarding the host cell (the portal) | 300 |

- **The default path** (`DEFAULT_PATH`, `dists` the gates' and the host's
  beats, `lateral` steps aside to fit): every gate and the host are
  pre-placed along the route on the first frame, out of sight, each as near
  the line as fits. Walk it and you meet them in order, a colony of kin and
  food behind each, each colony bigger than the last, so the swarm can grow
  fast enough for the next gate. Head off another way and the next one,
  while nobody has seen it, leaves the route and is placed ahead of you as
  before (`single`), after a calm break (4 s of moving, longer while your
  swarm is short of its `need`: a second per four cells short, up to 8 s;
  cut to 1 s once you are 1900 µm from the start, `FAR_OUT`, so off the
  route the host still comes long before the drop's edge). The colonies stay
  on the route (scenery); kin and prey are kept near you wherever you go.
- **The gradient toward the host**: the sediment thickens toward the host on
  the route (`hostK`: up to 2.8× the clay grains and bigger microcolonies
  within ~500 µm of it), and the host's signal shows as a haze thickening
  over its last ~650 µm (the optics' `uHost`, from wherever the host is now:
  a warm brightening in phase contrast, the green of free phage DNA in
  fluorescence, a glow of fine scatter in darkfield; stronger once its way
  is open).
- **Sealed until every gate is met**: the host stays shut (no prompt, its
  glow dim, nothing preloaded; at it: "The host is closed: get past the
  enemies on the way first") until the director has met every gate (a swarm
  in its zone, or beaten), and Stentor turns you back until it is beaten.
- **Met, passed, lingering**: as before (the director): a gate met counts
  even if you leave it, one seen and left behind counts as passed, and
  lingering still brings the next one to you (placed round you, then
  drifting over at 6 µm/s, a labelled departure).
- **Timings** (`route.test.mjs`, the real director and gates, a flock at
  45 µm/s, no fights): walking the route meets the gates at ~8, 20 and 33 s
  and reaches the host at ~46 s; rushing in 16 directions off it, the gates
  at 6–8, 19–29 and 35–45 s and the host at 46–64 s, 1850–2500 µm out. With
  the fights: **Timeline**, below.
- **No arrow by default** to the way on: once open, its golden light spills
  in from the edge of the view on its side (`createPortalLight`), and haloes
  it in view. With **Portal arrow** on in the game's Settings (default off;
  `?arrow=1` on this page) each view gets a brass arrow at its edge toward
  the host, sealed or not, with the distance. Test hooks: `portalArrow()`,
  `portals()`, `portalSealed()`, `focus(slot)`, `challenges()`.

### Timeline (scripted browser runs, 4 November 2026)

Scripted in the page with `debug.step` (the real game: director, gates,
battles, kin; X pressed on a timer), start to the portal entered:

| Event | Paced (tilt 0.75, X every 1 s, 14 s at each colony) | Efficient (full tilt, X every 0.5 s, 6 s at each colony) | Rushed with a big swarm (starts at 400, no stops) |
| --- | --- | --- | --- |
| left the meadow | 14 s (30 cells) | 6 s (37) | — |
| peritrich reached / beaten | 27 / 32 s (47) | 16 / 18 s (46) | 10 / 11 s (424) |
| colony 1 left | 55 s (145) | 31 s (133) | — |
| pack reached / beaten | 63 / 71 s (138) | 37 / 43 s (145) | 23 / 28 s (507) |
| colony 2 left | 95 s (338) | 57 s (305) | — |
| amoeba reached / beaten | 103 / 108 s (315) | 62 / 67 s (302) | 42 / 45 s (635) |
| colony 3 left | 131 s (648) | 89 s (529) | — |
| Stentor reached / beaten | 138 / 148 s (608) | 94 / 103 s (511) | 56 / 63 s (840) |
| portal entered | **152 s** | **109 s** | **68 s** |

The scripts know the way and never wander; a first run that looks round,
reads the messages and misses a colony or two takes longer (about 3–5
minutes), and the rushed run is about a minute. A swarm that skips the
colonies meets the amoeba (150) and Stentor (300) short and loses.

## The battles: members are HP, and you drill

`guards.js` (`FIGHT`, `GATES`, `drill`, `attack`, `bite`, `stentorPull`),
drawn in `draw.js`, the gauge and the bars in `main.js`. The owner: "specific
enemies that block your way and that you can battle with in that they each
[eat] some of your group and you can drill into them ... each additional
bacterium is like an extra HP for fighting sake". A tug-of-war you can read:

- **Every member is a life.** A predator that would take you takes a member
  instead (the one nearest it), so while you have a swarm your own cell is
  safe; only when the swarm is gone does a catch take you (and you respawn
  nearby with kin kept round you). The swarm's size is in the line at the
  bottom ("Swarm 214 · slime shield · raft · toxin ready").
- **They eat, in a rhythm you can see.** Each enemy has a **tell**, then a
  **bite**: the peritrich's cilia race and its current swells (1.2 s, the
  gauge and its bar turn warm), then it surges and sucks in up to 2 members
  (in front of its funnel, or drilling on its bell), every 4 s; the amoeba's
  edge bulges forward in a wave (1.2 s), then engulfs up to 15 it closes over,
  every 3 s; Stentor's membranelles speed up and its vortex brightens, then
  its pull sweeps up to 30 at its rim into the oral pouch; each Bdellovibrio
  of the pack lines up, latches on a member's pole, trembles for 1 s and
  bores in. A member taken is drawn into the mouth (sucked in, engulfed,
  swept into the pouch) as it rounds up and fades. Each one eaten poisons
  the enemy a little (violacein-like: 1 + the swarm's level).
- **You fight by drilling.** Steer the swarm into the enemy: every member
  that touches its surface (the peritrich's bell or stalk, the amoeba's edge,
  Stentor's rim, a Bdellovibrio) latches on and bores in: held nose-in at
  its place on the surface, turning hard, a bright pore flickering at its
  tip, wearing the enemy down by 1 health a second each, × (1 + 0.15 ·
  log2(swarm / 12)) for a big swarm's quorum (×1.96 at 1000). A Bdellovibrio
  is tiny: each drill into it counts double, and drilled it cannot swim off.
  Up to 90 drill a peritrich at once, 300 the amoeba, 520 Stentor, 8 each
  Bdellovibrio, so a bigger swarm drills faster. **X** drills harder (every
  driller bores 0.35 more at once), **Y** fires the toxin (army 12: 12 % of
  the enemy's health). Steer on and the drills let go once the swarm's middle
  has gone 24 µm past its own radius from them.
- **Its health** is the brass gauge at the top ("Amoeba · 63 drilling") and a
  bar over the enemy (warm in its tell), and the enemy shows it: the bell
  shrinks and darkens, the amoeba's edge thins and loses its granules,
  Stentor pales, and each flashes where it is hit. Out of contact it grows
  back (twice as fast with nobody drilling).
- **Beaten**, it dies, dissolves or flees, and the way is open: the
  peritrich coils up and its bell dissolves away, the pack is killed off,
  the amoeba withdraws into the sediment and fades, Stentor contracts and
  stays shut. It stays beaten.
- **The numbers** (`flock.test.mjs`, a swarm pushed at it, X every 0.5 s;
  health / regrowth per s):

| Gate | Health | A small swarm | Its need | Three times that |
| --- | --- | --- | --- | --- |
| peritrich | 80 / 3 | 5 is eaten | 14 wins in ~9–14 s, ~8–10 left | 42 in ~4–6 s |
| Bdellovibrio pack | 16 × 10 | 14 is eaten | 50 wins in ~6–10 s, ~40 left | 150 in ~4–7 s |
| amoeba | 1750 / 15 | 60 is eaten | 150 wins in ~9 s, ~105 left | 450 in ~3 s |
| Stentor | 6500 / 8 | 120 is eaten | 300 wins in ~15 s, ~200 left | 900 in ~7 s |

- **A lone cell** still has its own fights with the predators that come for
  it when it has no swarm (`runFights`: the peritrich's surge, a pack
  Bdellovibrio's ram, a phage homing in), each with a wind-up and B to evade;
  it cannot beat a gate.
- **Real basis**: contact killing by type VI secretion (Pukatzki et al.
  2006), quorum-regulated toxins killing protist grazers (atlas C28).
  **[Departure]**: a magnetotactic spirillum doing any of this, "drilling"
  into a protist, the rhythm of the bites, enemies staying beaten, and the
  numbers.

## Multiplayer

Up to four players (`shared/players.js`, see `../CONTROLS.md`): player 1 on
the keyboard and the first controller; anyone else joins at any time by
pressing a button on another controller ("Player 2 joined"; in the game the
shell's roster comes in with `embed.players`).

- **Each player is their own cell and their own flock** (the same species;
  the Features choice applies to all), with its own dash, growth and catch,
  and its own fluorescent label (**Telling players apart**). The corner brackets that mark your cell are drawn in each player's
  colour with a "P2" tag (alone: the gold brackets as before).
- **One shared field, then a split.** The stage follows the players' flocks' middle,
  and the field grows as they spread (the split's `zoom`, up to 1.6x the
  field); only further apart does the screen split LEGO-style, merging again
  once they are back inside 0.75 of that for most of a second (split views
  keep 1.2x; `shared/splitscreen.js`,
  its 2D mode: each view is the field drawn round its own centre, captured,
  at 70 % resolution while split, without the field stop). Each player zooms
  their own field (LT/RT); a shared view shows everyone's widest, and each
  split view its own players' widest, eased in and out with the split and
  zoomed about the view's players, so they stay at their region's middle and
  a merge needs no zoom change. Each player has their own follow camera
  and RS look, and a split view follows its own players.
  Player 1 has the look and Y for the data overlay.
- **Hunters pick a player:** the amoeba's edge slides toward the nearest
  living cell; grazers, phages and Bdellovibrio catch whoever they touch. The
  warning line names the player. The gates are fought by every flock at once.
- **Caught together:** a catch plays out as alone (strike, hold, eat,
  follow; only the full-screen fade is left out); then the player rejoins
  beside a teammate. Alone a catch respawns you in open water nearby.
- **Landmarks** fire for any player.
- **Flocks:** see **The army** (join by touch, leave by moving away, an
  even split).

Test hooks: `__micro.players`, `__micro.split`, `__micro.roster()`,
`__micro.landmarks` (positions, the log, `near`),
`debug.teleport(x, y, a, slot)`, `forceCapture(kind, slot)`, `beacon(slot)`,
`seedFlock(slot, n)` (n daughters join that player's flock, with its label),
`placePlayer(slot, x, y)`, and `coll()` (each flock's members' `labels`).

## Telling players apart

Every player's strain carries a fluorescent protein in its cytoplasm
(`LABELS` in `draw.js`), and kin that join a player's flock by answering
**that player's** beacon take the same label (the answer turns them,
`collective.js`; their daughters keep it, and freed members keep it until
they are recycled). Player 1 is today's cell, unlabelled.

| Player (colour) | Label | Fluorescence | Phase contrast |
| --- | --- | --- | --- |
| P1 (gold) | none (today's) | magenta membrane, green flagella | today's |
| P2 (teal) | CFP | cyan fill (the blue channel) | faint teal tint |
| P3 (rose) | mCherry | red fill | faint rose tint |
| P4 (blue) | mTagBFP2 | violet fill | faint slate-blue tint |

So in fluorescence each flock reads in its player's colour, and a shared
flock shows whose beacon called each member. The two new pseudo-colours ride
in the alpha of the field's attachments 1 and 2
(`shared/techniques/bacterium-shapes.js` `lab: [a, b]`,
`bacterium-fluorescence.js` `uCol3`, `uCol4`). Features → Optics → "Players'
labels" turns them off. **Departures**: a label cannot change when a cell
answers a beacon (it is genetic), and these proteins barely tint a cell in
transmitted light; the phase tint is there so players can tell their flocks
apart without switching looks. Nothing shows in darkfield. The plan named
GFP for player 1; that would change today's solo look, so player 1 stays
unlabelled (its flagella stain is already green).

## No oxygen meter

At the owner's request (1 November 2026: "let's have no oxygen meter thing")
the oxygen damage, starvation, their warnings and meters, the Run over cards
for them and the Features switch are gone. The oxygen gradient is still in
the scene (the magnetotactic cells' field lines and senses run on it), but
nothing on screen measures it and nothing dies of it.

## Controls

The shared scheme (`../CONTROLS.md`, read through `shared/controls.js`):

| Xbox | Keyboard | Action |
| --- | --- | --- |
| LS | WASD | **Steer your flock** (a labelled assist): it heads where you point, as fast as you tilt (0–45 µm/s); your own cell turns toward the stick (up to ~5.5 rad/s), every member follows in its own way (see **The army**). Released: the motors stop and the flock settles; only Brownian motion, flow and the field move you. Tumbles (B) also lean toward the stick. Features → LS steering → *Tumble bias only* or *Honest: no steering* |
| RS | Arrows | **Look around**: held, the view looks that way (up to 40 % of the field, by how far it is pushed), easing back when released (see **The view**) |
| **A** | Space | **Sprint run**: every flagellum at full motor speed (spirillum 95 µm/s, Bdellovibrio 160 µm/s), 0.6 s, recharging (HUD `dash` meter); the whole flock sprints. It also shakes off loosely bound phages and an attaching Bdellovibrio, and sprinting out of a grazer's current wears it down |
| **X** | E | **Beacon, eat, drill harder** (magnetotactic, one press every 0.3 s): a pulse from your swarm's front, riding with it, that kin in reach answer as they join; every prey rod in reach of a member lysed; every member drilling into an enemy bores harder at once (**The battles**). Held, your cell also takes up food in a patch. Bdellovibrio: press while touching a Gram-negative rod to attach and bore in (it spins on its pole and a pore opens in the prey's wall) |
| **B** | Shift | **Defend: tumble** (the shared defend button, an evasive move): stop, turn to a random new heading (E. coli's distribution, mean 68°), run on. For Bdellovibrio it is a reverse plus a flick. While you hold LS, the stick turns you back afterwards. **At the moment a predator strikes** (a grazer's surge, a phage committing, a Bdellovibrio's ram) it evades it |
| Y | R | **Toxin burst** when your army's toxin is charged (army 12; also LS click). Otherwise: data overlay (food, field lines and feeding currents, marked on screen as data, not optics) |
| LT / RT | Z / X | **Zoom** out / in, analogue and continuous (eased), on top of the view that widens by itself as your swarm grows (45 µm alone, ~120–200 µm for hundreds to a thousand): ×0.4 to ×4 of it, a field from 22 to 480 µm (the round field stop shows when you zoom well out past 180 µm). Each player's own |
| LB / RB | Q / F | **Reverse the run**: the other pole leads. For the magnetotactic cell, this is how it swims back the other way along the field line |
| D-pad ←→ | 3 / 4 | Look: phase contrast, fluorescence, darkfield, SEM (borrowed), DIC (borrowed) |
| Menu | Esc | Features panel |
| View | Tab | Hide or show the controls |

The portal and the way back are not in this list: at the open host and at the
Paramecium the game asks for Y on screen (see **Landmarks**). There is no focus
control (the focus follows your cell's height) and no D-pad zoom (the owner,
3 November 2026: "LT/RT be zoom (like paramecium) instead of DPad ... we don't
need a 'focus' control").

The stats corner shows the real speed in µm/s and body lengths per second,
growth or prey, the dash meter, phages on you, the magnetic alignment
(mB/kT), each gate's health, and your army (size, abilities, toxin, drag,
the flock's speed and spread). The army line at the bottom and the enemy
gauge at the top are the only HUD in play.

**Goals.** Magnetotactic: grow a swarm (X near kin, X on prey, the colonies
along the way), drill through the three enemies on the route and Stentor,
touch the host and press Y to enter it.
Bdellovibrio: take three prey; the last bdelloplast bursts with five new
cells.

**Ways to lose your cell** (members die in your place while you have them):
swept into the peritrich's oral funnel or Stentor's oral pouch; the amoeba's edge
closing over you; a phage binding irreversibly and injecting;
(magnetotactic) a Bdellovibrio boring in. Each is played out on screen, then
you respawn in open water nearby (see **Threats**).

## Threats

The pacing is the way's rhythm of gates (see **The way**), not a clock: the
calm opening and the predators' on/off spells are gone. Every gate's enemy
is on until your army beats it. The predators' wind-ups and catches use the
shared `shared/predation.js` (`createFight`, `createCapture`), as in the
other prototypes.

- **Wind-ups and fighting back for your own cell** (`runFights` in
  `main.js`). A calm predator looks calm; one attacking your cell winds up
  visibly (a pulsing red ring marks it too), then strikes. B (the tumble) at
  the strike evades it; each evasion and each sprint out costs it interest,
  and out of interest it leaves you alone for a while.
  (While your swarm fights a gate, its tell and bite are the swarm's battle,
  **The battles**; these are a lone cell's.)
  - *Peritrich:* within ≈45 µm of its funnel it stalks; within ≈24 µm it winds
    up (1.1 s): its oral cilia beat harder and faster, the funnel tips
    toward you and the feeding current intensifies (×2.5), then surges
    (×3.4, 0.5 s). Within 8 µm of the mouth at the end of the surge, you are
    swept in (a member is, if you have one). Sprinting (A) out of its current
    wears it down; out of interest it coils back on its stalk for a while.
  - *Phage* (the old phage-cloud gate's; the cloud is no longer on the way, so these stay dormant): one homes in on you (a game stretch: phages
    only diffuse; drawn 3× so it reads), its long tail fibres catch your
    wall and splay while its baseplate settles (0.75 s), then it commits and
    binds. A tumble then shakes it off; once bound, it is reversible for
    3 s.
  - *Bdellovibrio* (at the pack): it stalks you, lines up 4 µm off,
    trembling, its leading pole brightening (0.85 s), then rams (0.3 s).
    Rammed, you have 2.2 s to sprint or tumble it off.
- **Every catch of your cell plays a sequence** (strike, hold, eat, then the
  camera pulls back to the 90 µm field and follows the predator for 2 s:
  the grazer's bell jerks back on its stalk carrying your vacuole, the
  amoeba's edge creeps on with you inside, the new phages drift off; a
  caption says what ate you; then a fade and you respawn in open water
  nearby). Your members go free where they are, so you can call them again.
  Control stops only for it, and a red line at the top says what is
  happening:
  - *Grazer:* drawn into the oral funnel, spinning; swept down it by the
    oral cilia (beating hard); packed into a food vacuole that drifts into
    the bell and darkens (`bacterium/graze`, then `eat` at a low pitch).
  - *Amoeba edge:* two lobes of the edge rise either side of you and meet
    over you; a phagosome closes, is drawn 6 µm in and darkens.
  - *Phage:* the phage (drawn 3× larger so it reads) contracts its tail
    sheath, its DNA goes in as a fluorescent thread; the cell rounds up,
    fills with new phages and bursts (lysis), leaving a ghost and releasing
    30 new phages into the water (`bacterium/phage`).
  - *Bdellovibrio:* it rams your pole, bores through into the periplasm and
    you round into a bdelloplast with it curled inside.
- **Testing:** `__micro.encounters()` (the director's state: the order, what
  is placed and met, when, how), `__micro.encounterLog()`, `seenAt(x, y)`,
  `placeNow()`, `__micro.rings()` (the director's log, the portal, how often
  someone was turned back), `__micro.placePortal(a, slot, d)` and
  `placeEncounter(id, x, y, b)` (out of order: tests), `__micro.enterPortal()`,
  `__micro.challenges()` (where each gate stands now, placed or not);
  `window.__micro.pacing()` reports the run time, the first
  threat and catch, each gate's health and a log of gates reached and
  beaten; `__micro.gates()`, `__micro.guards`;
  `window.__micro.forceCapture('grazer' | 'amoeba' | 'phage' |
  'bdellovibrio')` starts that catch.

Sound: generated nature-documentary foley (`shared/audio.js`; Features: Sound effects, Ambience). A sediment ambience loop and a flagellar-motor run loop whose rate follows your speed; the sprint (A), the beacon and each answer, lysed prey and uptake (X), tumbles (B), a phage latching on, the grazer's feeding current catching you, and a gate beaten.

## Performance

Measured with the session's perf scripts (`measure.mjs`, SwiftShader, so
relative numbers only); the bacterium section of `../../design/performance.md`
lists the bottlenecks.

- **Downsample, then blur** (`bacterium-fluorescence.js` `render`): when the
  PSF is 2 px or wider on screen, its horizontal pass writes a target 2×
  narrower (4× from 4.5 px), the vertical one 2× shorter, and the composite
  reads it back bilinearly with that filter's width taken out of σ. About
  0.38× (or 0.16×) of the full-resolution cost, and nothing visible (no
  detail finer than σ exists to lose). `diffract()` keeps its old in-place
  behaviour for the borrowed DIC look.
- **Split screen:** each view's passes (specimen, PSF, low-pass, composite)
  are scissored to its region (`split`'s view rect) plus the blurs' reach,
  and the shared governor drops the render scale to 0.7 (2 views) or 0.55
  (3–4), so 4 views cost about what one did.
- **Quality governor** (`shared/quality.js`): the optics' buffers render at
  its scale and the composite draws them to the full canvas; it owns the
  pixel ratio (×0.5 more under a software renderer, as before). Features →
  Rendering; `?q=high|medium|low` fixes it.
- **The optics keep their last two sizes' targets**, so a split or merge
  doesn't reallocate them.
- **`eatenByGrazer` and the feeding currents** read a list of feeding grazers
  made once per step, so specks, phages and cells skip resting grazers.
- **One cull box for every view:** the shapes were culled against the last
  view drawn (the previous frame's), so a split view could miss shapes; now
  the union of the views' fields, and `draw.js` skips off-view objects before
  building their materials.
- A/B switches: `?psfdown=0` (full-resolution PSF), `?rects=0` (no
  per-view scissor).

### Performance (second pass)

Measured on 1 November 2026 with `micro/tools/perf/measure.mjs` and hot loops
of one simulation step and one `draw()` (40 members per player, `?q=high`).
Screenshots before and after, on a seeded, fixed-step clock, are identical to
the pixel (phase, fluorescence, darkfield, 4 players).

- **The collective is cheap:** `collective.post` is about 4 % of a step.
  Separation is 40² pairs per collective behind an axis test, and quorum is one
  pass, so it needs no spatial grid below ~150 members per collective.
- **The step allocated 1.5 MB.** `pushOutOfGrains` ran `Math.hypot` against
  all 54 grains for every cell, kin cell and speck. V8 doesn't inline
  `Math.hypot` and boxes its result, and the reads of `o.x` were megamorphic.
  An exact axis test now skips far grains, and the position is read once. Per
  step: 1.53 MB → 0.22 MB, about 9 → 3.7 ms in this container.
- **`draw.js`**: the spirillum and kin parts reuse scratch materials, which
  saves about 45 KB a frame per 40 members. `collective.js` finds the
  recruiting collectives once per step and passes a scratch vector to
  `world.flowAt(x, y, out)`. In `bacterium-shapes.js`, a round disc (no
  wobble) skips its outline noise.
- Not done: the other shapes in `draw.js` (grazer cilia, film, cells) still
  build option objects, about 200 KB a frame. World cells come in five shapes,
  so the reads in `stepCell` are megamorphic and box, about 100 KB a step.

### Performance (the flock, 1 November 2026)

The flock replaced the old collective with the same budget: one pair loop per
flock (separation and alignment, behind an axis test, into scratch typed
arrays), no allocations per member. Measured with a flock of 40 per player
(`?flock=40`, `?q=high`), before and after, in this container:

| | 1 player | 4 players |
| --- | --- | --- |
| one simulation step (`debug.step`, median of 5 × 120) | 1.14 → 1.28 ms (in the rings layout, repeated: 1.6 / 2.5 → 1.7 / 1.9 ms) | 1.76 → 1.17 ms |
| `measure.mjs` CPU per frame (median) | 8.9 → 9.9 ms | 20.6 → 11.2 ms |
| heap allocated per frame | 460 → 399 KB | 442 → 227 KB |
| `collective.js` in the CPU profile | 0.6 → 0.4 ms/s | 0.2 → 0.1 ms/s |
| draw calls | 7 → 7 | 33 → 33 |

SwiftShader dominates every frame here and the container was shared (load
average 15–28), so the numbers are noisy;
the flock itself stays a few per cent of a step. The beacon and answer
pulses are a ring of discs in the existing shape batch (no new draw calls).

## Performance (the swarm, 3 November 2026)

A swarm of up to 1000 (the owner: "hundreds or a thousand bacteria in your
group"):

- **A neighbour grid** (`collective.js` `buildGrid`): separation and alignment
  look only at the 3×3 cells (6 µm) round each member, not at every pair, so a
  step is about n × 9 × a few pairs. The same grid finds the member nearest
  each prey rod when X eats.
- **LOD in the simulation**: members out of every view (`world.watch.inView`,
  the director's views) follow the swarm's intent and its middle only (no
  alignment, wander or Brownian jitter, their height every fourth step);
  free kin more than 520 µm from every player rest; members skip the
  currents' sums far from any current (`world.flowNear`).
- **LOD in the drawing** (`draw.js` `lod`): a member shorter than 12 px on
  screen is drawn as its body alone (one instanced shape, no flagella or
  magnetosome chain); a swarm of more than 200 draws no per-member
  footprints, windows over grains or slime discs. Everything is still the
  one instanced draw (`bacterium-shapes.js`, now 24 000 instances).
- **Scenery in a grid** (`world.js` `createBuckets`): grains, attached cells
  and matrix strands are found by where they are, for drawing (only the view)
  and for every push and height test.
- **Measured** (headless, `flock.test.mjs`: one step, 1000 members): about
  4.5 ms. In the browser with SwiftShader (software WebGL, so relative
  numbers only), the whole frame and one simulation step (`debug.step`):

| Swarm | Step | Frame (SwiftShader) | Shapes |
| --- | --- | --- | --- |
| 40 | 1.2 ms | 72 ms (1.0×) | ~560 |
| 300 | 1.9 ms | ~104 ms (1.45×) | ~1300 |
| 1000 | 4.4–5.0 ms | ~146 ms (2.0×) | ~4150 |

  SwiftShader's frame is mostly the optics' full-screen passes, which do not
  grow with the swarm; on a laptop GPU the instanced shapes are cheap, so the
  CPU step (under 5 ms at 1000) is the budget, well inside 60 fps at a few
  hundred.

## Checks

```bash
node micro/game/bacterium/flock.test.mjs
node micro/game/bacterium/followcam.test.mjs
node micro/game/bacterium/route.test.mjs   # the drop and the route; the director: 16 rushes, a wide field, a small army, lingering, out and back; the route walked
node micro/game/check-worlds.mjs bacterium
```

`flock.test.mjs` runs the world, your swimmer, the flock and the gates
headless (no page, no GPU): a lone cell's speed follows the tilt, stops on
release and spins with its speed; kin never join by touch, X calls exactly
those in reach, one after another; a flock of 40 starts front first, cruises
with its own speeds and headings, turns round bit by bit and settles when
released; X lyses prey in reach only; waylaying (a stranger draws a member
off; ignored it is picked off; X calls it back and drives the stranger off;
pulsing X loses none; the meadow stays safe); the 2.5D layer; **no invisible
walls** (full tilt at the drop's edge eases to a stop at the meniscus and
slides along it; a swarm piles against it, none beyond; the biofilm slows you
to a stop; nothing left where the old walls were); kin over the old cap
answer and the stranger strain never joins; **members are HP** (three hits
take three members, then your cell); **the battles** (for each gate: a lone
cell gets nowhere, a small swarm loses, its need wins losing cells, three
times that wins fast; members drill in; it eats with a tell before each
bite); **a swarm of 1000** steps within 16 ms; **the camera's field** grows
with the swarm and fits it. `route.test.mjs`: the order, the drop's edge more
than twice as far as the host in every direction, the beats spaced along the
route with each colony beside it and bigger than the last; 16 rushes (every
gate in order, the host within two minutes, long before the edge, nothing
placed on seen water); the route walked (every gate and the host pre-placed in
order on it, the colonies between them). The smoke check opens the page in
headless Chromium, drives the keyboard and fails on any console error.
`window.__micro.debug` has hooks for scripted runs and screenshots
(`teleport` (your flock comes along), `step(n, dt, input | { slots })` (it
keeps the views where the cameras are), `x`, `fill(n)`, `look`, `zoom(field
µm, slot)`, `zoomAuto(slot)`, `zoomHold(±1 | null, slot)` (LT/RT),
`rsHold(x, y | null)`, `stranger(slot, d, a)`, `tumble`, `dash`, `reverse`,
`overlay`, `species`, `phageOnMe`, `nearGrazer`; `__micro.cam()` gives the
view centre, each player's follow camera and field, and each view;
`__micro.gates()` each gate's health, drills, attack state, bites and eaten).
`followcam.test.mjs` checks the follow camera.

## Approach

### The scene

A flat chamber of bog water over the sediment, seen from above. The screen's
up is toward the air (the meniscus), down is into the sediment. That is how a
real oxygen gradient is set up under a microscope: in a flat capillary or at
the edge of a coverslip, with the gradient along the slide. **[Departure]** the
sediment surface sits in the same focal plane as the water.

- **Oxygen** falls about exponentially from the meniscus (100 %) and is used up
  by the biofilm, reaching 0 just above it (scenery and the cells' senses
  only: nothing measures it on screen and nothing dies of it).
- **Food**: dissolved organic matter in patches round decaying detritus
  flakes or lysed cells (with a cloud of phages from the lysis). The dissolved
  food is invisible in every optical look; only the flake shows. Patches are
  eaten down and new ones appear elsewhere.
- **The Earth's field** is a fixed vector. North points into the sediment, as
  the field's downward dip does in the Northern Hemisphere, so north-seeking
  cells swim down toward lower oxygen.
- **The biofilm**: an EPS-rich layer of attached rods and cocci (slows you to
  45 %), matrix strands, clay and silt grains far bigger than you.
- **Other bacteria**: E. coli-like rods that run and tumble (18–28 µm/s), cocci
  and Gram-positive chains (non-motile, Brownian), a stranger strain of
  magnetotactic cells (eight, one kept near an army big enough to waylay; they
  swim along the field and reverse by their oxygen sense, and waylay your
  members: **The army**), and three Bdellovibrio hunting rods and leaving
  bdelloplasts.
- **Grazers**: two Vorticella-like peritrichs on stalks. Their oral cilia beat
  a feeding current, a sink about 60 µm/s at 16 µm from the funnel and faster
  near it (faster than you), strongest in front of the opening. Specks,
  phages and bacteria are drawn in and vanish. They contract on their stalks
  now and then, or when bumped, and the current stops for a few seconds.
- **Amoeba**: the leading edge of a giant amoeba, its hyaline margin thin and
  the granular cytoplasm behind streaming toward it, creeping at ~1.4 µm/s.
- **Phages**: diffuse (D ≈ 4 µm²/s) and stick where they touch you.

### Swimming

- **Low Reynolds number**: speed follows the motor at once; no coasting.
- **Rotational diffusion**: D_r ≈ 0.15 rad²/s for the spirillum, 0.6 rad²/s
  for tiny Bdellovibrio, which therefore loses its heading within a second.
- **Translational Brownian motion**: D ≈ 0.25 µm²/s for you, visible as a
  jitter at 45 µm; clay specks D ≈ 0.22/r µm²/s; phages ~4 µm²/s.
- **Magnetotaxis**: the magnetosome chain's moment m ≈ 10⁻¹⁵ A·m² feels a
  torque m × B. The heading relaxes toward the field at a rate
  (mB/kT)·D_r, with mB/kT ≈ 5 in a 20 µT horizontal field, so the cell lines up
  within 1–2 s and wanders about ±25° about it. A tumble turns the body, and
  the torque then turns it back: tumbling cannot change which way along the
  field you swim. Only a **reversal** (LB/RB) does. That is **magneto-
  aerotaxis**: the field gives the axis, the oxygen sense picks the
  direction. The field can be set to a bar magnet (200 µT) or cancelled.
- **Steering (LS, the assist)**: the heading turns toward the stick at
  min(7·Δθ, 5.5) rad/s, so a U-turn takes about half a second; speed is
  0–100 % of the run speed by the tilt (up to 120 % when the flock asks your
  cell to catch up; A still sprints). While steering, rotational diffusion is
  cut to 35 % of its σ, translational to 55 %, and the magnetic torque to 60 %
  (in the Earth's field it bends a held course by a few degrees; a bar magnet
  fights back hard). Released: the motors stop, with full Brownian motion,
  flow and torque. Flagella and body turn at a rate set by the motor
  (`swim.js`), so a slow cell spins slowly and a stopped one is still.
- **Tumbles**: angle from E. coli's distribution (mean 68°, Berg & Brown
  1972), 0.1–0.3 s. The **assist** draws eight angles from that distribution
  and keeps the nearest to the stick: still random, but leaning.
- **Spontaneous tumbles** (Features): the motor's own switching (about
  once a second for E. coli, rarer for the spirillum), suppressed while the
  remembered signal is rising, as the Che network does.
- **Sensing**: oxygen and food are compared over time, not space (the cell is
  too small to compare its two ends): the HUD's "getting better / worse".

### Rendering: forming a microscope image at the limit

No lights. Each object writes what a microscope responds to into three float
buffers, additively: **optical path** (Δn × thickness), scatter, height (for
the SEM), **fluorescent stain** in three channels and absorbance. The shapes
are 2D signed-distance quads (`shared/techniques/bacterium-shapes.js`):
capsules bent into vibrios, sine strands for helical cells and flagella seen
side-on, wobbly discs for grains, chains of dots for the magnetosomes, a bell
with a carved oral funnel, the amoeba's edge and the biofilm slab. Each pixel
receives the real chord through the cross-section (2√(r² − d²)).

- **The diffraction limit** (`shared/techniques/bacterium-fluorescence.js`):
  every buffer is blurred by a Gaussian of σ = 0.21 λ/NA ≈ 89 nm (FWHM
  ≈ 0.21 µm at 550 nm, NA 1.3), in µm, so on screen the blur grows as you zoom
  the camera crop: **empty magnification**, softer, never sharper. Parts
  thinner than a pixel are widened with their integrated amount kept, so a
  20 nm flagellum carries its true tiny signal into the blur, and vanishes in
  phase contrast as it really does.
- **Depth of field ≈ 0.4 µm**: objects off the focal plane are drawn wider and
  fainter with their total kept. The focus follows your cell's height (2.5D).
- **The view** (`followcam.js`; the owner, 3 November 2026: "I think we
  don't need a 3d camera in 2d. Let's keep the slide for now, and have a
  follow camera ... a little look ahead in your direction of movement. RS can
  adjust this positioning by holding a look ahead in any given direction").
  Straight down on the slide, as the microscope sees it. Each player has a
  follow camera on their flock's middle (alone: their cell): it stays put
  while the flock moves within a **dead zone** (16 % of the field height
  round it), then catches up with a **critically damped spring** (4.5/s)
  toward the zone's edge, moving with the flock, so it is eased but never
  locked and never overshoots; a **look-ahead** along the flock's velocity
  (up to 22 % of the field at full run speed) eases in and out over 0.9 s, so
  a reversal swings it through rather than whipping it across; **RS** held
  adds a look in its direction (up to 40 % of the field, by how far it is
  pushed), easing in over 0.25 s and back when released. All scaled by the
  field shown, so it feels the same at every zoom. A view centres on its
  players' follow points (the split screen lays them out), so each split view
  follows its own. A jump (a respawn, a teleport) puts the camera there at
  once; the catch's pull-back and the continuous transitions' poses work as
  before.
- **2.5D** (the owner: "like controlling a flock in a 3d world but just
  moving through it on a 2d path ... the flock is distributed in 3d and the
  creatures you encounter ... you can amble over them"; `LAYER` in
  `world.js`). Steering stays on the slide. Everything that moves (your cell,
  every member and free kin cell, the stranger strain, the rods, the
  Bdellovibrio) has a height above the sediment in a water layer 8 µm deep:
  each wanders on its own random walk between 0.4 and 5 µm (round 2 µm), so a
  flock is spread in depth, and rides up and over a clay grain (a dome as
  high as the grain is thick, up to 7 µm) instead of being pushed round it,
  then settles back. Your own cell climbs too, more gently (it is still
  pushed round the part of a grain above it). The phage cloud's particles
  each hang at their own height. Contact uses 3D distance with 3 µm of slack
  (`zGap`), so play stays readable: the beacon reaches kin and drifting
  members in a slab round the flock's mean height, X lyses prey in reach in
  3D, a stranger's pulse draws the nearest member in 3D, and a predator takes
  the member nearest it in 3D (the grazers' funnels and the amoeba still act
  through the whole layer). **Depth cues** (`depth` in `draw.js`), gentle:
  the focus follows your cell's height, and a mover's height above or below
  it is fed (×0.15) into the optics' own defocus, so it is softer, not lost;
  a 1.5 % per µm scale; and a faint footprint offset on the sediment under
  anything more than 1.2 µm above it. The image is formed in transmitted
  light, so every layer's optical path adds (as through a real specimen) and
  there is no draw order as such; for "higher over lower", a cell riding on a
  clay grain takes the grain's optical path out under itself (a cell-shaped
  window, `overGrain`), so in phase contrast it shows as a light shape
  crossing the dark grain instead of vanishing in it (the grain's texture
  shows round it). **[Departure]**: the heights compressed into the defocus,
  the footprints (a microscope shows no shadows), the windows, and cells
  riding over grains.
- **Phase contrast** (Ph3, 100× oil): I = e^(−OD)·(1 − c·tanh(k(φ − 0.75·φ_low))):
  dark cells with bright halos and shade-off. Flagella and phages invisible.
- **Fluorescence**: pseudo-coloured channels on black: membranes (FM 4-64,
  magenta, brighter at the rim), flagella (Alexa 488 maleimide on
  cysteine-substituted flagellin, green; the bundle in a run, splayed filaments
  in a tumble), the magnetosome chain (MamC-GFP, shown blue so it reads apart)
  and phages (SYBR Gold, green spots). Haze, autofluorescence and shot noise.
  A Bdellovibrio expressing a fluorescent protein shows (green) inside its
  bdelloplast only here; phase contrast shows only the prey rounding up.
- **High-intensity darkfield**: the squared high-pass of φ plus scatter, which
  does show flagellar bundles (Macnab 1976).
- **Data overlay (Y)**, drawn on top and tagged *DATA OVERLAY · not optics*:
  oxygen as a colour wash with the band outlined and isolines with % labels at
  the edge, food contours, field lines with chevrons pointing north, streaks
  into the grazers' funnels, and the magnetosome chain picked out.
- **Field stop** at 180 µm (the eyepiece field), noise, an out-of-focus
  background mottle.

## Features

Every technique is listed in the panel (Menu), switchable where it can be
mixed:

- **Body**: protagonist (Magnetospirillum / Bdellovibrio); flagella on/off;
  how each cell turns (fixed, explained).
- **Optics**: look; diffraction limit; phase halo; depth of field (fixed:
  focused on your cell); background; noise; field stop; each stain channel; data overlay;
  the corner brackets that mark your cell (a game marker, not optics).
- **Rendering**: the instanced distance-field specimen; the shared optical
  field (fixed, explained).
- **Motion**: LS steering (steer, the default / tumble bias only / honest:
  no steering); spontaneous tumbles (off / real
  motor clock); rotational and translational Brownian motion; low Reynolds
  number; flagellar rotation speed shown.
- **Simulation**: magnetic field (Earth 20 µT / bar magnet / cancelled).
- **World**: grazers, amoeba, phages, Bdellovibrio hunters, other bacteria
  swimming; scenery (fixed); the way: enemies that block it, colonies behind
  them (fixed, explained).
- **Borrowed** (default off, also on the D-pad look cycle): **SEM** from the
  mite (the height buffer through the adapters' `fieldFromBuffers` and
  `semFromField`, with its detector choice) and **DIC** from the tardigrade
  (optical path ×6, after the diffraction blur, with its DIC/brightfield
  choice).

### Technique modules (for other prototypes)

- `shared/techniques/bacterium-fluorescence.js`: diffraction PSF in µm,
  phase contrast with halo, epifluorescence with pseudo-coloured channels,
  high-intensity darkfield, field stop and noise. Its field is the adapters'
  optical field plus a fluorescence attachment.
- `shared/techniques/bacterium-shapes.js`: the instanced 2D distance-field
  specimen renderer (rods, vibrios, helical strands, discs, chains, a
  peritrich bell, a giant-cell edge, a surface slab) with energy-kept
  sub-pixel widening and defocus.

## Art

Wired with `loadTexture` (null until delivered; unknown ids are caught, so the
page runs before the request list has them), with procedural stand-ins:

| Id | Use |
| --- | --- |
| MP-B01 | Sediment-bacteria background plate behind phase contrast (stand-in: fbm mottle) |
| MP-B02 | Biofilm surface texture in the slab's optical path (stand-in: fbm) |
| MP-B03 | Ciliate oral region plate on the peritrich bell (stand-in: fbm) |
| MP-B04 | Magnetosome-chain fluorescence texture along the chain (stand-in: even dots) |
| MP-U06 | The launcher card (`../index.html`) |

## Departures, labelled

- **The army** (see above): a player steering a flock of cells, the visible
  beacon and kin answering it one by one, members dying in a player's place,
  a magnetotactic spirillum lysing prey and growing on it, flock rules and
  personalities (game values), and members changing speed over 0.1–0.3 s
  (real cells change speed in milliseconds).
- **The gates** (see **The way** and **The battles**): contact killing and
  members poisoning what eats them are real kinds of defence (type VI
  secretion, violacein) but not of *Magnetospirillum*; "drilling" into a
  protist, the enemies' rhythm of tell and bite, the health numbers, an enemy
  staying beaten, the amoeba sliding along its edge to stay in front of you
  and withdrawing, the pack keeping to its gate, and the host letting you in
  only once Stentor is beaten are game rules.
- **The drop** (see **The drop**): a real drop's meniscus bends light in a
  much thinner band, and a cell reaching it is held by surface tension in a
  film rather than eased to a stop; the bands of bending, the darkening and
  the coloured fringes are drawn to read at this zoom. The sediment bank
  sits in the drop like a shore (in life the sediment would be under the
  water, out of focus). Cells far out are drawn a little fatter than life
  (at least 1.6 px) so a swarm reads at a wide field, and a big swarm's own
  field can be wider than the eyepiece's 180 µm (as if through a lower-power
  objective).
- **A swarm of a thousand** spirilla following one player's stick, kin
  colonies laid out along a route, and the host's signal as a visible haze
  are game devices.
- **The catch sequences** are game values: catches lasting a few seconds (a lytic cycle takes tens of minutes, a
  bdelloplast hours). During a phage catch the phage is drawn 3× its 60 nm
  size and visible in every look.
- **Steering with the stick** (the default): a bacterium cannot choose its
  heading or slow down at will; it can only choose when to tumble or
  reverse. Features → LS
  steering → Honest restores that.
- **Time compression**: attachment to entry takes minutes in life, 2.5 s here;
  growth inside the bdelloplast takes 3–4 h, 4 s here. Phage binding is
  reversible for ~3 s, then injection follows 2 s later (minutes in life).
- **Bdellovibrio re-emerges** after each prey so you can hunt three. In life
  it grows as a filament inside one prey and divides into several progeny
  that burst out together (this happens only after the third).
- **Shedding phages by dashing** is a stretch: reversible adsorption is real,
  shear stripping it is a game rule.
- **Shaking off an attaching Bdellovibrio** by dashing or tumbling is a game
  rule (early attachment is reversible).
- **Magnetospirillum's tumble** (B): real spirilla mostly reverse (LB/RB here).
  The tumble is a stop-and-turn with E. coli's angle distribution.
- **Bdellovibrio's reverse-and-flick** is borrowed from *Vibrio*
  (polar flagellum); its own reorientation is less studied.
- **Peak sprint speeds**: 95 µm/s for the spirillum (some magnetotactic
  bacteria are faster, Magnetospirillum usually slower); 160 µm/s for
  Bdellovibrio, one reported maximum **[Unverified]**.
- **All stains at once**: a real experiment stains one strain or one structure.
  The fluorescence look shows four labels together, pseudo-coloured.
- **Flagellar rotation** is shown slowed (100–300 Hz in life).
- **One focal plane** holds the sediment surface and the water above it.
- **Grazer flow** is a 2D sink with a forward bias, not a solved Stokes flow.
- **The amoeba homes** on you slowly; real amoebae find prey by contact and
  chemical cues.

## Sources

- Berg HC, Brown DA (1972). Chemotaxis in *Escherichia coli* analysed by
  three-dimensional tracking. Nature 239: 500–504. (Runs ~1 s, tumbles
  ~0.1 s, mean tumble angle 68°, speeds ~14–30 µm/s.)
- Berg HC (1993). *Random Walks in Biology*. Princeton. (Rotational
  diffusion, why small cells compare over time, low Reynolds number.)
- Purcell EM (1977). Life at low Reynolds number. Am J Phys 45: 3–11.
- Turner L, Ryu WS, Berg HC (2000). Real-time imaging of fluorescent flagellar
  filaments. J Bacteriol 182: 2793–2801. (Alexa-labelled flagella; bundles
  in runs, splaying in tumbles.)
- Macnab RM (1976). Examination of bacterial flagellation by dark-field
  microscopy. J Clin Microbiol 4: 258–265.
- Xie L, Altindal T, Chattopadhyay S, Wu XL (2011). Bacterial flagellum as a
  propeller and as a rudder for efficient chemotaxis. PNAS 108: 2246–2251.
  (*Vibrio*'s run-reverse-flick.)
- Blakemore R (1975). Magnetotactic bacteria. Science 190: 377–379.
- Frankel RB, Bazylinski DA, Johnson MS, Taylor BL (1997). Magneto-aerotaxis
  in marine coccoid bacteria. Biophys J 73: 994–1000. (Axial and polar
  magneto-aerotaxis, oxic–anoxic bands.)
- Faivre D, Schüler D (2008). Magnetotactic bacteria and magnetosomes. Chem Rev
  108: 4875–4898. (Chain moments ~10⁻¹⁵ A·m², mB/kT, microaerophily.)
- Lang C, Schüler D (2008). Expression of green fluorescent protein fused to
  magnetosome proteins in microaerophilic magnetotactic bacteria. Appl
  Environ Microbiol 74: 4944–4953. (MamC-GFP labels the chain.)
- Katzmann E, et al. (2011). Magnetosome chains are recruited to cellular
  division sites and split by asymmetric septation. Mol Microbiol 82:
  1316–1329.
- Sockett RE (2009). Predatory lifestyle of *Bdellovibrio bacteriovorus*. Annu
  Rev Microbiol 63: 523–539. (Attack, periplasmic entry, bdelloplast,
  filamentous growth, progeny release; Gram-negative prey.) Atlas S65.
- Noble RT, Fuhrman JA (1998). Use of SYBR Green I for rapid epifluorescence
  counts of marine viruses and bacteria. Aquat Microb Ecol 14: 113–118.
- Moldovan R, et al. (2007). On kinetics of phage adsorption. Biophys J 93:
  303–315. (Reversible, then irreversible binding.)
- Abbe/Rayleigh resolution at NA 1.25–1.4 and depth of field: atlas S17, S18.
