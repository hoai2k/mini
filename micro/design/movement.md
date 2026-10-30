# Zoom Chain: movement at every level

The owner's rule for the whole game:

> "In general I want the game to be about movement, with some avoiding
> predators by running away / blocking / tumbling / fighting back etc, and
> some chasing prey, so the dash action is key."

Every creature has a **dash (A)**, an **attack/eat (X)** and a **defend
(B)**, on the shared layout in `micro/prototypes/CONTROLS.md`. This document
gives, for each level, the real biology behind those three buttons, with
numbers, and the chase or flee dynamic that makes the level about movement.

Sources (S-numbers) and labels are those of
[`zoom-chain-levels.md`](zoom-chain-levels.md): **[Observed]** is cited
biology, **[Proposal]** a gameplay idea, **[Departure]** a deliberate break
from biology, **[Unverified]** a claim this research could not confirm. A
**[Stretch]** is a dash built on a real move but made faster, longer or more
repeatable than the animal manages; it is a kind of departure and must be
labelled the same way. Research checked 30 October 2026.

---

## The design rule for a dash

1. **Name the real move.** Every dash is the creature's fastest real
   movement, not a generic speed boost.
2. **State its real numbers.** Speed, duration, and how often it can be
   repeated.
3. **Keep its real cost.** A furcula jump lands at random; a trichocyst jump
   takes hours to rearm; a bacterium's run cannot turn.
4. **Label any stretch** on screen and in the level's notes.
5. **State the time scale.** Some levels need slow motion and some
   fast-forward (see the end of this document).

---

## Level 0: water springtail (*Podura aquatica*)

| Button | Real basis | Numbers | Label |
| --- | --- | --- | --- |
| **A: furcula jump** | The furcula, folded under the body, strikes the ground or the water film and throws the animal into the air. In *P. aquatica* it is large and flattened, so it pushes on the water without breaking the surface [S74]. | A globular springtail: take-off **0.98 m/s on average (up to 1.52 m/s) in 1.7 ms**, peak acceleration up to 1,938 m/s², spinning at 282–369 turns a second [S75]. The semiaquatic *Isotomurus retardatus*: just over **0.7 m/s**, travelling up to **48 body lengths** [S40, via S75]. | **[Observed]** for relatives; **[Unverified]** for *P. aquatica* itself |
| **X: graze** | Grazing the surface film: algae, spores, bacteria, decaying matter [S74]. | — | **[Unverified]** species-level diet |
| **B: hunker** | Hold still in the meniscus. If swamped, the unwettable cuticle and its air layer bring it back up [S74]. The collophore can anchor it to the water [S40]. | — | **[Observed]** for the air layer; hunkering as a stance is a **[Proposal]** |

**Control of the jump.** *I. retardatus* anchors on the water with its
collophore and sets the jump's direction with its body angle and the
furcula's stroke. In the air it curls into a U and rights itself in under
~20 ms, and it lands on its belly about 85% of the time, catching the water
with its collophore [S40]. The globular *Dicyrtomina* has no such control:
it keeps spinning, and lands either tumbling or by anchoring its collophore
[S75].

**[Proposal]** A charged jump: hold A to set the direction (anchoring), and
release. Landing spot has scatter; landing upright is likely but not certain
(85% [S40]). No steering in the air **[Departure if added]**.

**Chase and flee.** Level 0 is a level of **escape**. The springtail is
prey; it chases nothing.

- ***Stenus*:** the duel of the level. The beetle's labium shoots out in
  **1–3 ms** [S78]; the springtail needs **~1.7 ms** to leave the ground
  (globular species [S75]). So the jump only works if it starts *with* the
  strike, not after it. Large or scaly springtails slip off the labium's
  pads, and the beetle then lunges with its mandibles [S78]. **[Proposal]**
  A visible tell (the beetle's head lowers and freezes) opens a short window.
- ***Stenus* skimming** at **400–750 mm/s** [S77] is faster than the
  springtail's jump, but it is an escape move [S77]: use it as the beetle's
  exit, not its pursuit **[Departure if shown hunting]**.
- **Water striders** locate prey by surface ripples [S80]. **[Proposal]**
  Walking makes ripples; a jump makes one big splash and a new position.
  Stealth (stillness) versus speed (jump).
- **Fight back:** none. A springtail has no weapon **[Observed, general]**.

---

## Level 1: oribatid mite (*Limnozetes*)

| Button | Real basis | Numbers | Label |
| --- | --- | --- | --- |
| **A: scramble** | Eight-legged running. Oribatids are slow. | Lab speeds for oribatids range from about **0.1 to 5.7 cm/min** (Nicolet 1855); *Scheloribates laevigatus* 2.4 cm/min; *Damaeus onustus* up to 3.12 m/h (about 0.9 mm/s) [S83]. A 0.3 mm mite at 1–2 cm/min covers about one body length a second. | **[Stretch]**: *Limnozetes*'s own speed is **[Unverified]**; any burst above these figures must be labelled |
| **X: bite** | Chelicerae graze hyphae, spores and algae [S23]. "Nipping back" at a predator. | — | Grazing **[Observed, general]**; fighting back **[Departure]**: oribatids defend by armour, not attack [S38, S39] |
| **B: hunker / close** | Hard adult cuticle; a box mite folds into a sealed box (ptychoidy) [S39]. | Phthiracaroidea resisted crushing better than equal-sized relatives [S39]. | **[Observed]**; full ptychoidy only for a box mite |

**Chase and flee.** The mite is a **blocker**, not a runner. The
predatory gamasid is faster **[Unverified speed]** and favours springtails
and juvenile mites; it rejected most hard-bodied adult oribatids [S38]. So
the right answer to a gamasid is B, not A. The dash matters for reaching
cover (a leaf axil narrower than a rove beetle's head) and for shepherding a
soft juvenile, which has no armour [S38].

---

## Level 2: tardigrade (or bdelloid rotifer)

| Button | Real basis | Numbers | Label |
| --- | --- | --- | --- |
| **A: scramble** | Faster walking with the same gait. | *Hypsibius exemplaris*: mean **163 µm/s** (~0.5 body lengths/s), range **79–264 µm/s**; at its fastest about **2 body lengths/s** [S84]. | **[Observed]** for *H. exemplaris*; costs water and energy **[Proposal]** |
| **X: pierce** | Stylets pierce algal and moss cells; it sucks out the contents [S02]. | — | **[Observed]** |
| **B: brace** | Claws grip the substrate [S02]. The tun is the last resort [S03, S73]. | Revival takes minutes to hours [S73]. | **[Observed]**; brace as a stance **[Proposal]** |

**Chase and flee.** *Milnesium* is a **slow stalker**, like you [S41, S42].
Escape is about **terrain**, not speed: film too thin for its bigger body, a
gap it cannot follow [S42, S44]. *Prionchulus* needs thicker film to thrash
in [S44]. The rotifer chapter's escape is the most drastic of all: dry up and
blow away [S45].

---

## Level 3: *Paramecium bursaria* (and the giant *Amoeba proteus*)

### The protagonist

| Button | Real basis | Numbers | Label |
| --- | --- | --- | --- |
| **A: trichocyst jump** (or a ciliary sprint) | The third, emergency escape gait: trichocysts fire toward the threat and push the cell away [S85]. A faster, synchronised ciliary gait is the milder second gear [S85]. | Normal swimming ~**1 mm/s**. Jump: **~10 mm/s within 5 ms**, decaying in ~10 ms; about 8–10 trichocysts of ~40 µm, ejected in <3 ms; regeneration takes **several hours** [S85]. Jump distance is about one body length (estimate: 10 mm/s × 10 ms ≈ 100 µm, an upper bound). | **[Observed]** in *P. tetraurelia* [S85]; **[Unverified]** for *P. bursaria*. A cooldown shorter than hours is a **[Departure]** |
| **X: feed** | The oral current sweeps bacteria and small particles into the oral groove; the *Chlorella* feed it in light [S27, S88]. | — | **[Observed]** |
| **B: avoiding reaction** | Ciliary reversal: back up, turn, go forward [S08]. At a light–shade border it is the step-down photophobic response [S88]. | — | **[Observed]** |

**Chase and flee.**

- ***Didinium*:** the chase. It swims fast and attacks on contact with
  toxicysts and pexicysts [S28, S56] **[Unverified: no speed found]**.
  Reverse early (B), and spend the jump (A) only on contact.
- ***Dileptus*:** the duel. Local trichocyst discharge is the real escape
  [S09]; time A to the proboscis strike.
- **Light chase [Proposal]:** a gentler "chase": staying in the sunlit patch,
  which drifts as the light moves, using the avoiding reaction at its edge
  as the real cell does [S88].
- **Fight back:** none. Trichocysts push; they do not harm the attacker
  [S09, atlas powers] **[Departure if they do]**.

### The giant: *Amoeba proteus*

The amoeba is now a threat, but it has a prototype, so its buttons are kept
for an optional chapter or for the AI.

| Button | Real basis | Numbers | Label |
| --- | --- | --- | --- |
| **A: bleb lunge** | A pseudopod or bleb erupts forward as cytoplasm flows into it [S04, S06]. | Particles in a motile *A. proteus* drift at **0–3 µm/s** [S86]. Bleb protrusion reaches **10–20 µm/s** in *Entamoeba histolytica* [S86]. | **[Stretch]**: the *A. proteus* bleb speed is **[Unverified]**; *Entamoeba* is an analogue |
| **X: close the food cup** | Pseudopods surround and close over the prey [S05]. | — | **[Observed]** |
| **B: let go / egest** | Release the substrate or expel food. | — | **[Proposal]** |

**The speed gap.** A *Paramecium* at ~1 mm/s [S85] is a few hundred times
faster than amoeboid flow at a few µm/s [S86]. The amoeba cannot chase a
swimming ciliate; it catches what rests, feeds or is cornered against the
substrate [S05, S87]. That makes the giant a **moving terrain hazard**, and
the right response is to keep moving.

---

## Level 4: *Trachelomonas* (or *Euglena*)

| Button | Real basis | Numbers | Label |
| --- | --- | --- | --- |
| **A: flagellar sprint** | The single emergent flagellum pulls the cell; *Euglena* rolls as it swims [S105]. | *E. gracilis*: **~50–100 µm/s**, rolling at 1–2 Hz [S105]. | **[Unverified]** for *Trachelomonas*; any burst above cruising is a **[Stretch]** |
| **X: photosynthesise / feed** | Light, by phototaxis to moderate intensity [S13]. | — | **[Observed]** |
| **B: armour** | The lorica [S34]. For *Euglena*, metaboly to squeeze through gaps [S67]. | — | **[Observed]** |

**Chase and flee.** Size decides against *Peranema* [S33]: the lorica is the
block. *Actinophrys* is a drifting mine, slow to reach you [S32]. The rotifer
current (Level 2's hero) is a whirlpool to cross with a sprint [S23].

---

## Level 5: bacteria

| Button | Real basis | Numbers | Label |
| --- | --- | --- | --- |
| **A: sprint run** | The fastest straight run. | Magnetotactic *Magnetospirillum*: **20–60 µm/s** (mean 41.6) [S90]; magnetotactic cocci **>100 µm/s**, one two-bundled coccus **>500 µm/s** [S90]. *Bdellovibrio*: up to **160 µm/s** (HD100), about 100 body lengths/s [S92]. *E. coli*: ~20 µm/s, 10–30 by strain [S95]. | Run speeds **[Observed]**; a "sprint" above the cell's normal run is a **[Stretch]** |
| **X: attach / bind / bore** | *Bdellovibrio*: pili, attachment plaque, entry through a portal [S93]. For the magnetotactic hero: binding into a microcolony [S96, S97]. | — | **[Observed]** for *Bdellovibrio*; microcolony binding as a button is a **[Proposal]** |
| **B: tumble / reverse** | *E. coli* tumbles: ~0.1 s, new heading ~60–70° away [S95]. *Magnetospirillum* reverses along the field line, at 0.055–0.126 reversals per second depending on oxygen [S90]. | — | **[Observed]**; tumbling for the magnetotactic hero is a **[Departure]**, so use "reverse" |

**Chase and flee.**

- **Speed is a real defence:** small, highly motile bacteria suffered the
  least grazing [S96]. Sprinting across a ciliate's feeding current is honest
  biology.
- **Size is the other:** large cells, filaments and microcolonies escape
  grazers that cannot swallow them [S96]. That is the "block" of Level 5.
- ***Bdellovibrio* outruns you** (160 against 20–60 µm/s [S90, S92]), so the
  answer is a last-moment reverse or tumble, not a race **[Proposal]**.
- **The *Bdellovibrio* chapter is a chase:** sprint, collide, attach [S93].
  Prey that tumbles away before the plaque forms escapes **[Unverified]**.
- **Gradients are a slow chase** after a place, not an animal: the oxygen
  band, by timing reversals [S90] or tumbles [S95].

---

## Level 6: bacteriophage (optional)

| Button | Real basis | Numbers | Label |
| --- | --- | --- | --- |
| **A: none** | A phage has no motor. Its motion is Brownian [S100]. | D ≈ **4 µm²/s** for T4 [S100]: about 0.04 s to wander 1 µm, ~7 minutes for 100 µm (illustrative, see Level 6.2) | **[Observed]**. Any dash is a **[Departure]**; the button is better left empty or used for "commit" |
| **X: commit and inject** | Short fibres bind irreversibly, the baseplate becomes a star, the sheath contracts and the tube crosses the envelope; the DNA follows [S98, S99]. | Sheath-contraction timing was not found **[Unverified]**. | **[Observed]** sequence |
| **B: fibres out / folded** | Most long fibres are folded back before infection; the virion may walk across the cell surface on them [S99]. | — | The choice is a **[Departure]**: the phage does not decide |

**Chase and flee.** None in the usual sense. Level 6 inverts the game: the
movement is random, and the player tilts **odds** (host density, depth below
the UV-bright surface, which hosts carry CRISPR or R-M defences) instead of
steering [S100–S104].

---

## Time scale per level

The levels run at very different speeds. Each must say on screen how much
time is stretched or compressed (the atlas rule "time is another scale").

| Level | Fastest real event | Slowest needed event | Proposal |
| --- | --- | --- | --- |
| 0 | *Stenus* labium, 1–3 ms [S78]; springtail take-off, 1.7 ms [S75] | Walking the film | **Slow motion** for strikes and jumps **[Departure, labelled]** |
| 1 | Mite scramble, ~1 body length/s [S83] | Drying of the capitulum | **Fast-forward** travel and drying **[Departure]** |
| 2 | Tardigrade, up to ~2 body lengths/s [S84] | Tun revival, minutes to hours [S73] | Fast-forward travel; compress the tun **[Departure]** |
| 3 | Trichocyst jump, ~10 ms [S85] | Trichocyst regeneration, hours [S85]; trap reset ~1 h [S52] | Near real time; compress rearming **[Departure]** |
| 4 | Trap door, ~0.5 ms [S52] | Spontaneous firing every 5–20 h [S52] | Real time; compress firing intervals **[Departure]** |
| 5 | Runs of ~1 s, tumbles ~0.1 s [S95] | *Bdellovibrio* cycle, about 4 h **[Unverified]** | Real time for movement; compress growth **[Departure]** |
| 6 | Wandering 1 µm, ~0.04 s (illustrative) [S100] | Finding a host at low density, hours (illustrative) [S100] | Real time near the cell; compress the search **[Departure]** |

## Open questions on movement

1. *P. aquatica*'s own jump speed and landing control were not found; the
   numbers come from two relatives [S40, S75].
2. *Limnozetes*'s walking speed, and the speeds of the gamasid, *Milnesium*,
   *Didinium*, *Peranema* and *Trachelomonas*, were not found.
3. The *A. proteus* bleb speed is taken from *Entamoeba* [S86].
4. Whether a *Stenus* skim is ever used to approach prey; the sources found
   describe it as an escape [S77].
5. Whether X should ever "fight back" for creatures that have no real
   counter-attack (the mite, the springtail, *Paramecium*). Each such use is
   a **[Departure]**.
