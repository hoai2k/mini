# Bacterium

Level 5 of the Zoom Chain, as a playable prototype: be a **magnetotactic
bacterium** (a *Magnetospirillum*-like spirillum, 3 µm long) in bog-pond
sediment at 1000×, at the limit of the light microscope, and **gather an army
of your kin and fight your way to the host cell**. Or switch, in Features, to
the predator ***Bdellovibrio bacteriovorus*** (1 µm), which rams a prey cell,
bores into its periplasm and eats it from inside. Published in the prototype
archive at `micro/prototypes/bacterium/`.

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

## Landmarks (the Micro Zoom chain)

World 6 of the game (`micro/game/`), between the Paramecium and the phage.
Both landmarks are drawn into the specimen with the same optics as
everything else (`draw.js`, `landmarks`). A quiet edge mark
(`shared/landmark.js`, a hollow ring) shows where the way back is when it is
off screen; there is no arrow to the way on.

- **Forward (the portal): a host cell with phages landing on it**, the
  director's last encounter (see **The way**): placed after every gate has
  been met, in water nobody has seen, a little ahead of whoever leads, out of
  view (`placePortal` in `main.js`). The shared golden glow
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
- **Your play:** bring an army. Every cell of it among the membranelles (up
  to 20 µm outside the rim) wears it down; every member it sweeps in poisons
  it (more in a bigger army); X adds volleys; Y's toxin burst a big hit. A
  tumble (B) at the pull breaks your own cell free (and costs it health), as
  does bumping its foot (it contracts in a flash and pauses) and every pull
  that comes up empty. Beaten, it contracts and stays shut: the host is yours.
- **Measured** (`flock.test.mjs`-style scripted runs that push the army
  straight at its rim and press X): an army of 12 or 20 is swept in before it
  wins; 28 wins in about 6.5 s with half of it lost; 40 in about 6 s losing a
  few.
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

- **The beacon (X).** X sends a pulse from the middle of your flock out to
  its reach: its edge plus 7 µm (alone: 9 µm, three body lengths; at most
  44 µm). It is drawn on the medium as a ring of soft spots spreading and
  fading. Free kin cells (your own species, the dim spirilla wandering in the
  meadow by the start and kept near you wherever you go) that the ring passes answer
  with their own small pulse, one after another (0.08 s plus 0.09 s per
  answer before them), and join. **Kin never join by themselves.** One
  beacon every 0.3 s, so you can press X everywhere.
- **X also eats.** Every prey rod (the E. coli-like rods) within 1.7 µm of a
  member's middle, beyond its half length, is lysed: it rounds up, swells and
  bursts into a fading puff, and the member that took it grows a third of
  the way to dividing. Members divide into the flock (up to 48), so eating
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
  - The camera and "where the flock is" (the split screen, the edge arrows'
    origin, the gates) use the flock's middle, smoothed; alone, your cell.
    Your own cell's corner brackets show only while you are alone (or, in
    multiplayer, in your colour).
- **Members are your health.** A predator that would take you (a grazer's
  funnel, the amoeba, Stentor, a Bdellovibrio's ram, a phage) takes the
  member on its side instead. Members it eats poison it (`guards.js`).
- **Army size** (members plus the players' cells) gates three abilities,
  shown in a quiet line at the bottom of the screen ("Army 23 · slime shield
  · raft · toxin 60 %"; alone: "press X near kin to call them"), never a ring:
  - **5, slime shield:** EPS round every member (a haze in fluorescence).
    Phages stick in the slime; a Bdellovibrio's ram glances off half the time.
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

## The way: placed as you go

`world.js` `DIRECTOR` and `ENCOUNTERS`, `guards.js`, the director in
`main.js` (`shared/director.js`; `../../design/encounter-pattern.md`,
"Placed as you go"). The world is open water 1120 µm across round the
start, clay grains with microcolonies on them scattered everywhere, the
biofilm along its bottom edge: that scenery is there from the start and never
moves. You start among your kin: a clump laid out by `../shared/kin-clump.js`
(28 kin, 44 prey rods from the meadow, 76 attached cocci and rods moved in
from microcolonies far off) round your cell, the same layout the Paramecium
draws round its spirillum, so the continuous transition's dive resolves its
dark mass into exactly these cells. The gates are not: the director places each one, in this order, in
water nobody has seen (a 20 µm grid of what every split view has framed),
a little ahead of whoever leads, out of every view, after a calm break;
until then it is parked far off, invisible and inert.

| Order | What | Army that beats it (scripted runs; its `need`) |
| --- | --- | --- |
| warm-up | ~5 s of moving in the meadow round the start: most kin and plenty of prey; safe for ever | — |
| 1 | a peritrich (Vorticella-like), its funnel turned aside as you come | 6 is swept in; 12 wins in ~7 s (12) |
| 2 | a Bdellovibrio pack (four) | 4 loses; 8 wins in ~15 s, 12 in ~9 s (8) |
| 3 | a phage cloud (80 phages) | 3 loses members; 6 (the slime shield) sweeps it in ~2 s (6) |
| 4 | an amoeba's edge, a wall 170 µm long across your way | 8 and 12 are engulfed; 16 wins in ~3 s (16) |
| 5 | a bigger peritrich | 10 loses; 14 wins in ~8 s (14) |
| last | the portal (the host), guarded by Stentor | ~24 (16 is swept in) (24) |

Between each and the next, a calm break of ~5 s of moving clear of the one
just met. An encounter counts as met when a flock comes into its zone (where
the army fights it) or beats it; one that has been seen and left behind
(everyone 200 µm off) or watched for 10 s counts as met too, and is never
moved, so it cannot hold the game up.

- **Army sizes (the decision).** A gate is placed whatever your army: the
  owner's rule is that nothing waits on the player for ever and lingering
  still progresses, and a gate's threat is the point of growing an army, so
  it does not scale down. Instead the world makes sure you can always grow
  it first: while the leader's army is short of the next gate's need, the
  calm break before it lasts up to 8 s longer (`ARMY_HOLD`: a second per
  missing cell), and every player who is short has 18 free kin kept within
  130 µm (8 otherwise) and 14 prey rods (eating three makes a division).
  So a player who presses X on the way meets each gate with about the army
  it needs; one who rushes on meets it short, and can always go back to the
  kin round them.
- **Kin and prey are ambient** (`keepAmbient` in `main.js`): 40 kin and 60
  prey rods in the meadow, the other 60 kin scattered over the water, and
  every 0.4 s the counts round each player are topped up from the parked
  ones (lysed rods, members lost in battle) or from free ones far from every
  player, only from water nobody has seen to water nobody has seen, out of
  view, ahead of the flock. Water a player has seen keeps what it had.
- **Lingering:** stay put and the next gate is placed anyway (after the
  break plus 6 s), round you, out of view; after 4 s more it comes over to
  you (behaviour, not a placement: the pack swims, the cloud drifts, the
  amoeba creeps, a peritrich's clay grain is carried on a slow current at
  6 µm/s, a labelled departure) until its zone reaches you. In the end the
  portal is placed near you too.
- **Timings** (`route.test.mjs`, headless, the real gates and the director,
  a flock at 45 µm/s that goes to each thing once it has seen it and to the
  portal once its light shows; and scripted browser runs, `debug.step`):
  rushing out in 16 directions at the default field: the first gate placed
  at 5.1 s and met at 6–7 s, the portal placed at 50–63 s and reached at
  54–67 s (browser, 4 directions: 56–60 s); at the eyepiece field (180 µm,
  more seen, so things go farther) 68–86 s; with a one-cell army the warm-up
  is 13 s and the portal comes at ~94 s; lingering at the start, a gate every
  ~26 s (placed round you, then coming over) and the portal at ~145 s;
  heading out and turning back past the start, nothing is ever placed on
  seen water and no grain or biofilm cell a view has seen ever moves.
- **No arrow** to the way on: once placed, its golden light spills in from
  the edge of the view on its side (`createPortalLight`), and haloes it in
  view.

- **Calm water:** the meadow has no enemy in it (linger there and the next
  encounter comes to you all the same: the owner's rule). The peritrichs'
  currents reach 45 µm, in a cone in front of the funnel (to the sides and
  behind only within 20 µm of the bell), the pack keeps within about 40 µm of
  its post, so the breaks are calm too. Nothing runs down: no oxygen, no
  starvation, no timers.
- **Every danger shows:** a peritrich's current is a stream of specks
  pouring into its funnel (faster and brighter as it pulls), Stentor's
  vortex a swirl of specks, the phage cloud is drawn so it reads in every
  look, the amoeba's edge is a wall.

- **Fighting is by contact** (`guards.js`): every cell of your army touching
  an enemy wears it down (1.2 health per second each) while it recovers by
  its own rate (3–6 a second), so a small flock gets nowhere and a big one
  wins, losing members on the way. **A member an enemy eats poisons it**
  (1.5, plus 1 for each ability the army has). X adds a volley (0.3 per
  member in contact), Y's toxin burst 15. The enemy gauge at the top shows
  the nearest enemy your flock is fighting ("Peritrich · 9 fighting").
- **The peritrichs:** their feeding current sweeps cells into the funnel
  (members within 3 µm of the mouth are eaten). Fight them at the back of
  the bell or along their stalk, out of the funnel's cone.
  Beaten, they coil back on their stalks for good.
- **The Bdellovibrio pack** keeps to its gate and goes for the nearest
  member: each one **latches on to a member's pole** for 1.5 s, trembling,
  then bores in (the member is lost and it hides in the bdelloplast for
  1.5 s). The members round it can kill it while it clings (3 health each, a
  little regrowth); kill all four.
- **The phage cloud** hangs across the way (drawn 3× so it reads in phase
  contrast; spots in fluorescence and darkfield). A phage touching an
  unshielded member infects it (lost); at army 5 the slime catches them
  within 1.5 µm of every member, so the flock sweeps the cloud up. Swept
  under half, the rest drift apart.
- **The amoeba's edge** stands across the way, its body to the right: cells
  inside it are slowed to a third and engulfed after 1.2 s. Push on its edge
  with your army (every cell within 2.5 µm of it fights). Beaten, it
  withdraws down into the sediment and engulfs nothing more.
- **A lone cell** still has its own fights with the predators that come for
  it (`runFights`: a grazer's surge, a phage homing in, a pack Bdellovibrio's
  ram), each with a wind-up and B to evade; it cannot beat a gate.
- **Respawn:** a catch puts you back in open water 90-130 µm from where you
  were, as far as it can from every gate still standing and from Stentor
  (`safeSpot`); kin are kept near you wherever you are.

## Multiplayer

Up to four players (`shared/players.js`, see `../CONTROLS.md`): player 1 on
the keyboard and the first controller; anyone else joins at any time by
pressing a button on another controller ("Player 2 joined"; in the game the
shell's roster comes in with `embed.players`).

- **Each player is their own cell and their own flock** (the same species;
  the Features choice applies to all), with its own dash, growth and catch. The corner brackets that mark your cell are drawn in each player's
  colour with a "P2" tag (alone: the gold brackets as before).
- **One shared field, then a split.** The stage follows the players' flocks' middle;
  as players separate the screen splits LEGO-style (`shared/splitscreen.js`,
  its 2D mode: each view is the field drawn round its own centre, captured,
  at 70 % resolution while split, without the field stop). Player 1 has the
  view controls (look, field, focus, stage, Y for the data overlay).
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
`debug.teleport(x, y, a, slot)`, `forceCapture(kind, slot)`.

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
| RS | Arrows | Move the stage (the view drifts back to your flock) |
| **A** | Space | **Sprint run**: every flagellum at full motor speed (spirillum 95 µm/s, Bdellovibrio 160 µm/s), 0.6 s, recharging (HUD `dash` meter); the whole flock sprints. It also shakes off loosely bound phages and an attaching Bdellovibrio, and sprinting out of a grazer's current wears it down |
| **X** | E | **Beacon, eat, strike** (magnetotactic, one press every 0.3 s): a pulse from your flock's middle that kin in reach answer as they join; every prey rod in reach of a member lysed; a volley from every member touching an enemy. Held, your cell also takes up food in a patch. Bdellovibrio: press while touching a Gram-negative rod to attach and bore in (it spins on its pole and a pore opens in the prey's wall) |
| **B** | Shift | **Defend: tumble** (the shared defend button, an evasive move): stop, turn to a random new heading (E. coli's distribution, mean 68°), run on. For Bdellovibrio it is a reverse plus a flick. While you hold LS, the stick turns you back afterwards. **At the moment a predator strikes** (a grazer's surge, a phage committing, a Bdellovibrio's ram) it evades it |
| Y | R | **Toxin burst** when your army's toxin is charged (army 12; also LS click). Otherwise: data overlay (food, field lines and feeding currents, marked on screen as data, not optics). At the open host (the portal, "Y Enter the portal" showing): enter it. At the Paramecium (the backdoor): back to the pool |
| LT / RT | Z / X | Fine focus down / up (it drifts back to your cell's plane unless switched off) |
| LB / RB | Q / F | **Reverse the run**: the other pole leads. For the magnetotactic cell, this is how it swims back the other way along the field line |
| D-pad ←→ | 3 / 4 | Look: phase contrast, fluorescence, darkfield, SEM (borrowed), DIC (borrowed) |
| D-pad ↑↓ | 1 / 2 | Field: 180 µm (the eyepiece field) / 90 / 45 / 22 µm (camera crops) |
| Menu | Esc | Features panel |
| View | Tab | Hide or show the controls |

The stats corner shows the real speed in µm/s and body lengths per second,
growth or prey, the dash meter, phages on you, the magnetic alignment
(mB/kT), each gate's health, and your army (size, abilities, toxin, drag,
the flock's speed and spread). The army line at the bottom and the enemy
gauge at the top are the only HUD in play.

**Goals.** Magnetotactic: gather an army (X near kin, X on prey) and fight
your way through the five gates to Stentor, beat it, touch the host and
press Y to enter it.
Bdellovibrio: take three prey; the last bdelloplast bursts with five new
cells.

**Ways to lose your cell** (members die in your place while you have them):
swept into a grazer's oral funnel or Stentor's oral pouch; the amoeba's edge
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
  - *Grazer:* within ≈45 µm of its funnel it stalks; within ≈24 µm it winds
    up (1.1 s): its oral cilia beat harder and faster, the funnel tips
    toward you and the feeding current intensifies (×2.5), then surges
    (×3.4, 0.5 s). Within 8 µm of the mouth at the end of the surge, you are
    swept in (a member is, if you have one). Sprinting (A) out of its current
    wears it down; out of interest it coils back on its stalk for a while.
  - *Phage* (at the phage cloud): one homes in on you (a game stretch: phages
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

## Checks

```bash
node micro/prototypes/bacterium/flock.test.mjs
node micro/prototypes/bacterium/route.test.mjs   # the director: 16 rushes, the eyepiece field, a small army, lingering, out and back
node micro/prototypes/check.mjs bacterium
```

`flock.test.mjs` runs the world, your swimmer, the flock and the gates
headless (no page, no GPU, about 5 s): a lone cell's speed follows the tilt,
stops on release and spins with its speed; kin never join by touch, X calls
exactly those in reach, one after another; a flock of 40 starts front first,
cruises with its own speeds and headings, turns round bit by bit and settles
when released; X lyses prey in reach only; a lone cell cannot wear the first
peritrich down and an army of 12 beats it. The smoke check opens the page in
headless Chromium, drives the keyboard and fails on any console error.
`window.__micro.debug` has hooks for scripted runs and screenshots
(`teleport` (your flock comes along), `step(n, dt, input | { slots })`, `x`,
`fill`, `look`, `zoom`, `tumble`, `dash`, `reverse`, `overlay`, `species`,
`phageOnMe`, `nearGrazer`).

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
  and Gram-positive chains (non-motile, Brownian), ten other magnetotactic
  cells that swim along the field and reverse by their oxygen sense (so the
  field lines show in their traffic), and three Bdellovibrio hunting rods and
  leaving bdelloplasts.
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
  fainter with their total kept. LT/RT move the focus.
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
- **Optics**: look; diffraction limit; phase halo; depth of field and focus
  follow; background; noise; field stop; each stain channel; data overlay;
  the corner brackets that mark your cell (a game marker, not optics).
- **Rendering**: the instanced distance-field specimen; the shared optical
  field (fixed, explained).
- **Motion**: LS steering (steer, the default / tumble bias only / honest:
  no steering); spontaneous tumbles (off / real
  motor clock); rotational and translational Brownian motion; low Reynolds
  number; flagellar rotation speed shown.
- **Simulation**: magnetic field (Earth 20 µT / bar magnet / cancelled).
- **World**: grazers, amoeba, phages, Bdellovibrio hunters, other bacteria
  swimming; scenery (fixed); the way: gates in a rhythm (fixed, explained).
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
- **The gates** (see **The way**): contact killing and members poisoning
  what eats them are real kinds of defence (type VI secretion, violacein)
  but not of *Magnetospirillum*; the health numbers, an enemy staying beaten,
  the phage cloud hanging together, the amoeba withdrawing, the pack keeping
  to its gate, and the host letting you in only once Stentor is beaten are
  game rules. The cloud's phages are drawn 3× so they read in phase
  contrast.
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
