# Zoom Chain: level specification

A design specification for the zoom levels of **Zoom Chain**. It builds on the
research atlas in `micro/research/` (sources S01–S24, cited here by number) and
adds new sources from S25 onward. Research checked 30 October 2026.

The atlas's rules still apply:

- **[Observed]** marks biology with a cited source.
- **[Proposal]** marks a gameplay idea. None of these are decided yet.
- **[Departure]** marks a deliberate break from biology. Each one has to stay
  labelled in the game's own notes and, where it shows, on screen.
- **[Unverified]** marks a claim, or a co-occurrence at our chosen site, that
  this research could not confirm.

Sizes are ranges from the cited populations, not universal species limits.
Field widths assume the atlas's **10× eyepiece and FN18** (field ≈ 18 mm ÷
objective) [S24]. Resolution figures use the Abbe estimate d ≈ λ / (2·NA) with
λ = 550 nm and typical NA values for each objective class [S17]. Depth-of-field
figures are the approximate values for typical objectives in the Nikon
MicroscopyU table [S18].

---

## 0. The recommended habitat: one Sphagnum bog with ponds

Recommendation: set the whole chain in **one quaking Sphagnum bog with small
ponds**, modelled on **Simmelried near Konstanz, Germany**. This is the bog
Martin Kreutz has sampled since 1993, with Wilhelm Foissner [S25, S26].

Why this site, rather than a wall moss cushion or a plain pond margin:

| Need | Why Simmelried-type bog works |
| --- | --- |
| A real moss world for the mite and the water film | A Sphagnum lawn and quaking mat surround small ponds of 5–50 m² [S26]. Semi-aquatic oribatid mites (*Limnozetes*) are specialists of wet Sphagnum bogs [S37]. In boreal peatlands, tardigrades turned up in 72% of moss samples [S68]. Bdelloid rotifers live inside Sphagnum's own hyaline and retort cells [S69]. |
| Large protists that really live there | Kreutz records *Paramecium bursaria*, *Didinium nasutum*, *Amoeba proteus*, *Stentor coeruleus*, *Actinophrys sol*, *Peranema*, *Trachelomonas hispida* and *Euglena deses* at Simmelried itself [S27–S36]. |
| A documented, very rich community | Of the 955 species on Kreutz's site, 640 come from Simmelried, including 314 ciliates, 84 euglenids, 102 rotifers and 247 algae (statistics page, updated 30 Sept 2026) [S26]. |
| A spectacular set piece | Bladderworts (*Utricularia minor*, *U. intermedia*) define the plant community of shallow bog pools, the *Sphagno-Utricularion* [S55]. Their traps catch rotifers, ciliates and algae [S52–S54]. |
| Chemistry with a gradient | The small ponds sit at pH 5–6, and the outflow at pH 7 [S26]. That is mildly acidic: wide enough for common ciliates, while still favouring the bog's typical diatoms and desmids [S60, S61]. |
| Drying as a real, local hazard | In 2018, Simmelried's outlet channel dried out completely. In the 2026 drought, many of its ponds dried out [S26]. Drying is the habitat's own story, not an invented timer. |

**Honesty constraints for this choice:**

- Simmelried is the model, not a documented one-sample community. The species
  lists come from years of sampling across several of its ponds and
  microhabitats. Putting two species in the same 1 mm field is still an
  editorial choice. Where a species is recorded only at a nearby site, the
  level says so: *Actinosphaerium* (Mindelsee) and *Hyalosphenia papilio*
  (Sima Moor, Austria).
- Simmelried's ponds are pH 5–6, not a raised-bog pool at pH 4. Taxa from a
  true ombrotrophic bog, such as *Hyalosphenia papilio* and the strongly
  acidophilic *Euglena mutabilis*, fit the **Sphagnum lawn** side of the
  gradient better than the open pond.
- Marine images in the atlas (diatoms, biofilm) stay analogues only [atlas
  callout, 04-cells].

---

## Level overview

The settled chain has **four core levels plus one optional epilogue**. Body
size does not shrink in a straight line: a Level 3 amoeba can be longer than
the Level 1 mite. What narrows at every click is the **field**, the
**medium**, and the **optics** [atlas index]. The table makes this explicit.

| # | Level | Protagonist (body) | Objective / total | Field (FN18) | Resolvable (≈ d) | Depth of field (≈) | Optical treatment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **The Sphagnum canopy** | *Limnozetes* oribatid mite, 270–390 µm | Stereo 10–20× (zoom body) | ~6–12 mm (stereo; not FN18) | ~10–20 µm | Hundreds of µm | Reflected light (stereo), daylight |
| 2 | **The water film** | Grazing eutardigrade 250–500 µm, or bdelloid rotifer | 10× / 100× | 1.8 mm | ~1.1 µm (NA 0.25) | ~8.5 µm | DIC or brightfield, with focal-plane slicing |
| 3 | **The hollow pool** | *Paramecium bursaria*, 85–150 µm | 20× / 200× | 0.9 mm | ~0.7 µm (NA 0.40) | ~5.8 µm | Brightfield, plus darkfield for threat reveals |
| 4 | **The periphyton and the trap** | *Trachelomonas hispida*, lorica 20–42 µm (alt. *Euglena* sp.) | 40× / 400× | 450 µm | ~0.42 µm (NA 0.65) | ~1 µm | Phase contrast or DIC |
| 5 (optional) | **The film of bacteria** | *Bdellovibrio*-type predator, ~0.2–0.5 × 0.5–2.5 µm | 100× oil / 1000× | 180 µm | ~0.2 µm (NA 1.25–1.4) | ~0.2 µm | Phase, at the optical limit (heavy **[Departure]**) |

**Why no extra level between mite and tardigrade?** The two protagonists are
the same size: a 300 µm *Limnozetes* and a 300 µm tardigrade. Inserting
another animal level, such as a nematode or springtail, would add a level
without narrowing the field. The real jump from Level 1 to Level 2 is from
**air to water and from reflected to transmitted light**, and the transition
should sell exactly that. Springtails and nematodes stay as characters
instead: springtails in Level 1, the predatory nematode *Prionchulus* in
Level 2.

**Why the optional Level 5?** It finishes the chain at the limit of light
microscopy, the point where the next "click" no longer reveals anything new
[S17]. A bacterial predator such as *Bdellovibrio* is real and dramatic
[S65], but at about 0.3 µm wide it sits at the optical limit. A
light-microscope view cannot show its attack in detail. So Level 5 is either
a short, clearly labelled epilogue or a stylised coda. It should not be a full
level that pretends the microscope sees more than it does.

**Possible split [Proposal]:** Level 3 could split into **3a, the open
hollow pool** and **3b, inside a bladderwort trap**. The trap interior is a
closed, acidic, nearly anoxic world with its own resident community [S54].
This spec instead uses the trap as the **transition from Level 3 to Level 4**
(see 3.6), and makes the trap interior one of Level 4's environments.

---

## Level 1: The Sphagnum canopy (mite)

### 1.1 Scale and optics

- **Protagonist size:** 270–390 µm for *Limnozetes* adults [S37]. Box-mite
  alternatives (Phthiracaroidea) measure 405–1042 µm [S39].
- **Field:** about 6–12 mm across, under a stereo microscope at 10–20× total.
  That is one Sphagnum capitulum (the head of the shoot) and a few branch
  leaves. Stereo fields depend on the instrument; this is not an FN18 figure
  [atlas 01-mites].
- **Treatment:** reflected light with restrained daylight and contact shadows,
  as the atlas recommends [atlas visual-styles]. Wet surfaces are local
  specular patches, not a general sheen.
- **Resolvable:** leaf cells, at roughly 10 µm wide, show as texture. The
  mite's legs, setae and armour plates are visible. **Not resolvable:**
  bacteria and most protists. At this scale a tardigrade (~300 µm) is a small
  translucent grub, visible only when it is out of the water film and the
  light catches it **[Proposal: use this as foreshadowing]**.

### 1.2 Playable protagonist

| Candidate | Why | Real abilities and costs |
| --- | --- | --- |
| ***Limnozetes*** (e.g. *L. rugosus*, *L. lustrum*): **recommended** | A semi-aquatic oribatid of wet Sphagnum bogs and Sphagnum lake edges, small and abundant (up to ~370 individuals per litre of moss) [S37] | **[Observed]** Eight jointed legs, a hardened cuticle, and a life in the wet transition zone [S01, S37]. **[Unverified]** Diet at species level. Oribatids broadly feed on fungi, algae and detritus [S23], so treat it as a microbial and detrital grazer. |
| Box mite (Phthiracaroidea, ptychoid) | The most gameable real defence: it folds its legs into a sealed armoured box [S39] | **[Observed]** Ptychoidy retracts the legs into a cavity sealed by the prodorsum, and Phthiracaroidea resist crushing better than equal-sized Euphthiracaroidea [S39]. **Cost:** while closed it cannot move or feed. A large predator that keeps biting can still crack it [S39]. **[Unverified]** Typical of litter and forest soil; presence in a wet Sphagnum lawn is not confirmed. |

**Movement model [Proposal]:** a legged walker with eight contact points.
Gait comes from foot placement on curved leaf surfaces. Its traction is good
on dry or damp leaves. On a meniscus, surface tension can hold or trap it
(see hazards). It cannot swim. A semi-aquatic oribatid can tolerate wet
conditions, but the related aquatic *Hydrozetes* needs a plastron to breathe
under water [S71]. *Limnozetes* gets no swimming ability **[Departure if
added]**.

**Defensive verb:** "hunker", a short armour-up that blocks small attacks but
halts movement. Only a box-mite protagonist gets the full sealed box, and that
version carries the cost and limit from [S39].

### 1.3 Enemies and threats

| Threat | Size | How it hunts or harms | How the player could evade or counter | Evidence |
| --- | --- | --- | --- | --- |
| **Predatory mesostigmatid mite** (*Pergamasus*-type, Parasitidae) | Larger than the protagonist; mm class **[Unverified exact size]** | A fast, active hunter. It favours springtails and juvenile mites. When it does attack an oribatid, it **cuts off the legs first, then opens the body** near the genital plates or mouthparts [S38]. | **[Observed]** Hard-bodied adult oribatids were mostly rejected or eaten only occasionally. Adult oribatids live in near "enemy-free space"; soft immatures do not [S38]. **[Proposal]** Hunker to keep the legs tucked. Being an adult is protection; juveniles in the nest are vulnerable. | S38 |
| **Rove beetle** (Staphylinidae: *Stenus*, *Othius*) | 7–14 mm: a giant, bigger than the whole field | Bites and crushes. *Othius punctulatus* cracked chemically undefended box mites but not equal-sized Phthiracaroidea; *Stenus juno* cracked neither [S39]. | **[Proposal]** A screen-filling set piece, shown only as legs and mandibles. You survive by armour, or by slipping into a leaf axil narrower than its head. | S39 |
| **Springtails** (Collembola) | ~0.2–2 mm | **Not a predator.** A competitor and a living hazard: its furcula launches it unpredictably, and it can knock small animals aside. Semiaquatic springtails control take-off direction, right themselves in mid-air in ~20 ms, and land on water by adhesion [S40]. | **[Proposal]** Its sudden jumps scatter food and can tip the mite off a leaf edge. Springtails also attract predators: being near them is risky. | S40, S38 |
| **Drying** | Habitat | The capitulum loses water first. Films break and humidity falls. | **[Proposal]** Retreat down the shoot into wetter, more enclosed leaf axils; that is where the Sphagnum mat stays wet. | S68 (hummock vs hollow), atlas environments |
| **Flooding and the meniscus** | Habitat | When water rises (rain, a sinking quaking mat), the film can pin a small arthropod. | **[Proposal]** The meniscus is a trap you must climb out of, not a pool to swim in. | **[Unverified]** for *Limnozetes* behaviour |

### 1.4 Environments

| Sub-habitat | Physical rules | Hazards |
| --- | --- | --- |
| **The capitulum (top of the shoot)** | The densest knot of young branches. Driest by day, it catches dew and rain first. Lit from above through moss gaps. | Drying, exposure to rove beetles |
| **Branch-leaf "shingles"** | Sphagnum leaves are one cell layer thick and overlap like scales. Big dead hyaline cells sit between narrow green cells [S69]. Seen from above, the hyaline pores are dark dots. | Slippery wet patches; gaps narrower than the body |
| **Leaf axils and the stem cortex** | Enclosed, humid pockets where film water persists. The stem cortex carries **retort cells**, flask-shaped cells with an opening that bdelloid rotifers live in [S69]. | Dead-end pockets where a predator can corner you |
| **Hummock-to-hollow slope** | Toward the pond, the lawn gets wetter. Tardigrade density in peatland mosses differs between hummocks, lawns and hollows [S68]. | Flooding; the step down to the meniscus |

### 1.5 Food and resources

**[Observed, general]** Oribatids are mostly microbivorous and detritivorous,
feeding on fungal hyphae and spores, algae, and decaying plant material [S23].
**[Unverified]** *Limnozetes*'s own diet. In play, use **fungal hyphae on
dying leaves**, **algal films on wet leaf surfaces**, and **dead plant
tissue**. Never live animal prey **[Departure if added]**.

### 1.6 Zoom transition to Level 2

- **The visible thing:** a **water film** wraps a branch leaf in the leaf
  axil where the mite stands. In it, a tardigrade **tun** (a dry, shrunken,
  inactive tardigrade) rehydrates.
- **Handoff [Proposal]:** the mite brings or follows water into a dry axil:
  dew drips, or the mite steps onto a film that spreads. The camera holds on a
  tiny shrunken barrel lying in the axil. As water reaches it, the tun swells,
  its legs evert, and it starts to walk. That is real: rehydration reverses
  the tun's body contraction and leg retraction [S03, S73]. The objective
  clicks to 10×, the light switches from reflected to transmitted, and the
  new protagonist is waking up.
- **Departure to label:** a real tun takes minutes to hours to revive, not
  seconds [S73]. The game speeds this up and must say by how much (the atlas
  "time is another scale" rule).

### 1.7 Gameplay possibilities [Proposal]

- **Objective: "Find the wet axil."** Cross a drying capitulum to a humid leaf
  axil before humidity runs out. The route choice is between an exposed fast
  path and slow sheltered gaps.
- **Encounter: the gamasid.** A *Pergamasus*-type hunter sweeps the leaf.
  Hunkering protects the adult. The player then shepherds a soft juvenile,
  which has no such protection [S38].
- **Set piece: the rove beetle.** Only legs and mandibles cross the frame. The
  answer is to wedge into a gap narrower than its head.
- **Springtail chaos:** feeding near springtails is rich but risky; their
  jumps flip the field.
- **Departures to label:** time compression of drying, and any swimming
  ability.

---

## Level 2: The water film (tardigrade or rotifer)

### 2.1 Scale and optics

- **Protagonist size:** commonly ~250–500 µm for tardigrades [S02].
  Bdelloid rotifers are similar in length when extended **[Unverified exact
  range for the chosen species]**.
- **Field:** 1.8 mm at 10× / 100×. That covers about two or three branch
  leaves, each about one cell layer thick.
- **Treatment:** DIC or brightfield transmitted light [S19, atlas 02].
  **Depth of field is about 8.5 µm at a typical 10×/0.25** [S18], so a
  50–100 µm thick animal never sits fully in focus. **[Proposal]** Make that a
  mechanic: the focal plane is a slice the player scrubs through. Leaf cell
  walls are sharp in one slice and the tardigrade's claws in another.
- **Resolvable:** claws, the buccal tube and stylets of a tardigrade, the gut
  contents, the rotifer's wheel organ (corona) as a flicker, leaf cell walls,
  hyaline-cell pores and fibrils, and testate amoeba shells. **Not
  resolvable:** individual bacteria, beyond a fuzzy texture of dots, and
  flagella.

### 2.2 Playable protagonists

| Candidate | Movement model | Real abilities and costs | Sources |
| --- | --- | --- | --- |
| **Grazing eutardigrade** (Macrobiotidae or Hypsibiidae-type; species to be chosen) | A lobopod crawler. Four pairs of clawed legs grip the surface. It is slow, and it cannot swim well in open water. | **[Observed]** Claws need a reachable substrate. Stylets pierce algal and plant cells. Under drying it enters a tun: an inactive state, not invulnerability [S02, S03]. **Cost:** the tun cannot move, feed or flee, and revival takes time [S73]. | S02, S03, S73 |
| **Bdelloid rotifer** (*Habrotrocha*; for example *H. reclusa*, which lives in Sphagnum hyaline cells) | Two modes. **Leech-like inchworm creeping** (anchor the foot, extend, attach the head, pull up), and **swimming** by whirling the wheel organ [S69]. | **[Observed]** Filter-feeding currents [S23]. Can live in Sphagnum hyaline cells (*H. reclusa*) and retort cells (*H. roeperi*, up to 10 per stem) [S69]. **Anhydrobiosis plus wind dispersal lets bdelloids escape a lethal fungal parasite** [S45]. **Cost:** drying means leaving everything and gambling on where you land. | S45, S69, S23 |

**Recommendation [Proposal]:** make the tardigrade the main protagonist
(walking and gripping in a thin film), with the rotifer as a **second
playable chapter or alternate route**. The rotifer brings two good verbs: the
feeding current, and the "dry up and blow away" escape.

### 2.3 Enemies and threats

| Threat | Size | Mechanism | Evade or counter | Evidence |
| --- | --- | --- | --- | --- |
| ***Milnesium*** (predatory tardigrade) | Up to ~1.2 mm, larger than the protagonist [S42] | It actively hunts **rotifers and other tardigrades**. In ~4,000 *Milnesium* specimens, nearly all identifiable gut contents were tardigrades or rotifers; only ~3% held nematodes or amoebae [S41]. Adults swallow rotifers whole [S42]. Its buccal tube is wide and short; tubes in tardigrade-eating individuals were longer and wider [S41]. In feeding trials with nine predatory tardigrade species, predators generally favoured nematodes and avoided tardigrade prey [S43]. | **[Proposal]** It is slow, like you, so this is a stalking encounter. Escape to film too thin for its larger body. Size is a real limit: hatchlings could not swallow whole prey until the third instar [S42], so a large adult protagonist is safer from a small *Milnesium*. | S41, S42 |
| **Predatory nematode** *Prionchulus muscorum* (Mononchida) | Large among nematodes **[Unverified exact]** | Described as a typical moss-dwelling semiaquatic predatory nematode [S44]. Mononchs **cut prey or swallow it whole**. Gut-content studies found rotifer remains and other nematodes, and about 20% cannibalism [S44]. | **[Proposal]** Thrashing, sinusoidal approach; it needs a film thick enough to move in. A thin film hampers it, and habitat complexity reduces predatory nematodes' feeding success [S44]. | S44 |
| **Testate amoebae** (*Nebela tincta–collaris* complex) | ~100–150 µm shell **[Unverified exact]** | It engulfs prey through the shell aperture. **Rotifers and large ciliates were ingested, mainly in summer, when the thin water film makes mobile prey easier to reach** [S51]. | **[Proposal]** A drying-film threat that sits still: a shell parked at a film narrows to an ambush point. Keep to deeper film. | S51 |
| **Rotifer-killing fungi** (*Rotiferophthora*, for the rotifer protagonist) | Spores or conidia of a few µm; hyphae fill the host | *Rotiferophthora angustispora* killed *Habrotrocha elusa* cultures within ~13 days in water [S45]. **Escape:** desiccation plus wind dispersal leaves the fungus behind [S45]. | **[Proposal]** The "dry up and blow away" verb. You lose your position and food but cure the infection. | S45, S46 |
| ***Haptoglossa*** **gun cells** (oomycete, for the rotifer protagonist) | A gun cell of tens of µm, **[Unverified exact]** | A **harpoon**: the gun cell injects a walled sporidium into rotifers such as *Adineta*, and it grows into the parasite's body [S46]. | **[Proposal]** Stationary "turrets" stuck to the leaf. Touching one triggers it. Read the field, and route your creeping. | S46 |
| ***Zoophagus*** (oomycete "lethal lollipop") | Short hyphal pegs | Traps **loricate (armoured) rotifers** on short sticky branches [S49]. | **[Proposal]** A hazard in open-water pockets, more for monogonont (armoured) rotifers than bdelloids. **[Unverified]** at a Sphagnum site. | S49 |
| ***Ballocephala*** (Entomophthorales, on tardigrades) | Spores of a few µm | Spores attach to the cuticle, a germ tube penetrates, and hyphae fill and kill the tardigrade. Recorded from Finland, Scotland, Wales and Japan [S47]. | **[Proposal]** A slow infection that appears late in the level. Moulting or drying does not help. **[Unverified]** details: low-grade sources. | S47 |
| **Nematode-trapping fungi** (*Arthrobotrys* sticky nets; *Drechslerella* constricting rings) | Net loops ~20 µm across [S48] | Rings of three cells **inflate within ~0.1 s** around a nematode. Adhesive networks are the most widespread trap type [S48]. | **[Departure]** These traps are built for nematodes. Do not show them catching a 300 µm tardigrade. **[Proposal]** Use them as set dressing: a nematode, maybe the *Prionchulus* that hunted you, gets snared in the background. **[Unverified]** in Sphagnum. | S48 |
| **Drying film** | Habitat | The film thins and breaks into islands. Solutes concentrate [atlas environments]. | Tardigrade: become a tun (time cost). Rotifer: anhydrobiosis and dispersal. Both: get into hyaline cells or retort cells, which hold water longer [S69]. | S03, S45, S69 |

### 2.4 Environments

| Sub-habitat | Physical rules | Hazards |
| --- | --- | --- |
| **Leaf-surface film** | Film thickness varies across the leaf. A 300 µm body cannot occupy a gap much thinner than itself without exposure [atlas 02]. Menisci form the walls. | Film breaking, solute build-up |
| **Hyaline cell (interior)** | A dead, water-storing cell with pores in its wall that let in water and micro-organisms [S69]. Bdelloid *H. reclusa* lives in such cells [S69]. About 90% of a Sphagnum carpet's water is held between the plants, and only ~10% inside the hyaline cells [search summary, MDPI Sphagnum water-holding study; **[Unverified figure]**]. | Too narrow for a tardigrade. **[Proposal]** It is a rotifer-only refuge. |
| **Retort cell row on the stem** | Flask-shaped cortex cells with openings, the home of *Habrotrocha roeperi*, *Scepanotrocha rubra* [S69]. | Same: a rotifer refuge |
| **Detritus pocket** | Dead leaf fragments, fungal hyphae, algae. Food-rich. | Where *Milnesium* and nematodes hunt |
| **The meniscus edge** | Seen from inside the film, the air–water boundary is a curved wall. | Being stranded as the film retreats |

### 2.5 Food and resources

- **Tardigrade (grazer):** pierces algal and moss cells with its stylets and
  sucks out the contents [S02]. **[Proposal]** Leaf chlorophyllose cells and
  algal cells are food points. Hyaline cells hold no cytoplasm and are empty.
- **Bdelloid rotifer:** filters fine particles such as bacteria, small algae
  and detritus with its corona currents [S23]. *H. roeperi* shows food
  pellets in its gut [S69].

### 2.6 Zoom transition to Level 3

- **The visible thing:** the tip of a Sphagnum leaf dipping into the
  **hollow pool**. In the film's edge, green ovals about 120 µm long swim past
  the tardigrade's claws: *Paramecium bursaria*.
- **Handoff [Proposal]:** the drying film retreats, so the tardigrade walks
  down toward the pool's edge. There the film meets open water, and the
  camera follows a passing green *Paramecium* out into the pool. The
  objective clicks to 20×. The tardigrade stays behind as a slow, clawed giant
  in the corner of the new field (see Cross-level).
- **Alternative [Proposal]:** the tardigrade is washed into the pool by rain,
  and the camera "dives" with it, then picks up a ciliate. *Milnesium* can be
  used as a threat that drives the handoff.

### 2.7 Gameplay possibilities [Proposal]

- **Objective: "Reach the green cells."** Feed on chlorophyllose leaf cells
  while the film shrinks, then get to a refuge before it breaks.
- **Encounter: the *Milnesium* stalk.** A slow chase in shallow film. The
  escape is thinner film, a narrower gap, or the tun gamble.
- **Rotifer chapter: "Dry up and blow away."** Infected by *Rotiferophthora*,
  the rotifer must find a dry exposed leaf, enter anhydrobiosis, and land
  somewhere clean [S45].
- **Focal-plane puzzle:** at ~8.5 µm depth of field [S18], a *Haptoglossa*
  gun cell is visible only in one focal slice. Scrub focus to find it.
- **Departures to label:** time compression of the tun; wind dispersal shown
  as a cut, not simulated physics.

---

## Level 3: The hollow pool (ciliate or amoeba)

### 3.1 Scale and optics

- **Protagonist size:** *Paramecium bursaria* 85–150 µm long, 40–70 µm wide
  [S27]. The *Amoeba proteus* alternative is 160–760 µm [S29].
- **Field:** 0.9 mm at 20× / 200×. That is a few large protists, a strand of
  algae, and a corner of a bladderwort leaf.
- **Treatment:** brightfield as the base. **[Proposal]** Use darkfield as a
  "threat reveal": edges of transparent predators, such as *Actinosphaerium*
  axopods, scatter brightly [S19, atlas visual-styles]. Depth of field ≈
  5.8 µm [S18], so swimmers drift in and out of focus.
- **Resolvable:** cilia as a shimmering fringe, food vacuoles, the green
  *Chlorella* symbionts (5–6 µm) of *P. bursaria* [S27], contractile vacuoles,
  extrusome firing as a blur. **Not resolvable:** single trichocysts in
  flight, membranes as a double line [atlas 04].

### 3.2 Playable protagonists

| Candidate | Movement | Real abilities and costs | Sources |
| --- | --- | --- | --- |
| ***Paramecium bursaria***: **recommended** | A ciliary swimmer. It swims on a helical path and does a **ciliary reversal** (back up and turn) on contact [S08]. | **[Observed]** Symbiotic *Chlorella* make it green; in samples it gathers on the side facing the light [S27]. Trichocyst discharge gives a short escape from attackers such as *Dileptus* [S09]. **Costs:** reversal is a short organised manoeuvre, not a dash. Trichocysts are a local defence, not ammunition [S09, atlas powers]. A parasite, *Holospora elegans*, can infect its micronucleus [S27]. | S08, S09, S27 |
| ***Amoeba proteus*** (alternate chapter) | An amoeboid crawler. It needs a substrate and moves by pseudopods and cytoplasmic streaming [S04, S06]. | **[Observed]** Engulfs prey in a food cup [S05]. Recorded at Simmelried, 160–760 µm [S29]. Kreutz describes an **undescribed exoparasitic fungus** whose conidia anchor in the amoeba's outer cytoplasm and feed from it through a haustorium [S29]. **Costs:** slow, needs contact, digestion takes time. | S04–S06, S29 |

**Why *P. bursaria* rather than *P. caudatum*:** it is recorded at
Simmelried and very common there [S27]. Its algal symbionts tie it to
light: it carries photosynthetic partners and seeks light [S27]. That gives
**light as a resource** that carries into Level 4.

### 3.3 Enemies and threats

| Threat | Size | Mechanism | Evade or counter | Evidence |
| --- | --- | --- | --- | --- |
| ***Didinium nasutum*** | 80–200 µm long [S28] | Mainly eats other ciliates. It **swallows prey much larger than itself**, including *Paramecium* [S28]. On contact, its proboscis fires **pexicysts**, which stick, and **toxicysts**, which penetrate and anchor. Cytoplasmic streaming then reels the prey into the mouth [S56]. Recorded regularly at Simmelried [S28]. | **[Proposal]** It must touch you first, so read its fast, straight approach and reverse early [S08]. The trichocyst escape is a real, limited option [S09]. **[Unverified]** whether trichocysts work as well against *Didinium* as against *Dileptus*. | S28, S56 |
| ***Dileptus*** (*D. margaritifer*-type) | Several hundred µm, with a long proboscis **[Unverified exact range]** | A proboscis lined with toxicysts strikes and stuns prey, which is swallowed at the base of the proboscis [S09]. | **[Observed]** *Paramecium* escapes *Dileptus* by **local trichocyst discharge** [S09]. **[Proposal]** The signature duel: time the discharge to the strike. | S09 |
| **Heliozoans**: *Actinosphaerium eichhornii* | 200–1000 µm across [S31] | A floating star. Its axopods catch ciliates and rotifers on contact, which are taken in by phagocytosis; well-fed cells turn opaque [S31]. | **[Proposal]** A stationary or drifting minefield. Contact with an axopod means capture. Darkfield reveals the arms. **[Unverified at Simmelried]**: recorded at nearby Mindelsee "and often in other sampling areas" [S31]. | S31 |
| **Suctorians** (*Podophrya*-type) | Tens of µm, on a stalk or free **[Unverified exact]** | Stalked ambushers. Tentacle tips carry **haptocysts** that fix ciliates on contact. Prey cytoplasm is moved through the tentacles by microtubule-driven transport, not suction. Most suctorians catch only particular ciliate taxa [S57]. | **[Proposal]** A static turret forest on detritus. Brushing a tentacle tip is lethal; slow swimmers are captured more often [S57]. | S57 |
| ***Stentor coeruleus*** | Up to ~2–4 mm extended (Kreutz: a stretched specimen of 1.89 mm; "up to 4 mm") [S30, S59] | A filter feeder whose oral funnel makes a strong current. It eats unicellular algae and dinoflagellates [S30]; it is reported to eat rotifers [S59]. | **[Proposal]** A whirlpool hazard rather than a hunter: the current near its funnel pulls you in. It snaps contracted if touched. **[Unverified]** that it eats *Paramecium*-sized ciliates. | S30, S59 |
| ***Hyalosphenia papilio*** (testate amoeba, Sphagnum lawn edge) | 70–140 µm [S35b] | **Ciliates made up ~55% of its prey** in a Jura Sphagnum mire, microalgae ~35% [S50]. It carries algal symbionts too. | **[Proposal]** It ambushes from the Sphagnum fringe, slowly. **[Unverified at Simmelried]**: Kreutz records it only in the Austrian Sima Moor [S35b]. | S50 |
| **Bladderwort trap** (*Utricularia*) | Bladders 0.5–3 mm [S52] | Trigger hairs on the door. The door **buckles open in ~0.5 ms**, sucking in about 1 mm³ of water at up to 1.5 m/s. Traps also **fire spontaneously every 5–20 hours** and reset by pumping water out over ~1 hour [S52]. Prey includes rotifers and ciliates, and many algae [S53]. | **[Proposal]** Stay away from the door and its trigger hairs. A freshly fired trap is safe for about an hour. A random spontaneous firing is the unavoidable danger. **[Observed]** Small swimmers like algae are thought too weak to trigger it; spontaneous firing catches them [S52]. | S52, S53 |

### 3.4 Environments

| Sub-habitat | Physical rules | Hazards |
| --- | --- | --- |
| **Open hollow pool** | Mildly acidic water, pH 5–6 [S26]. Low Reynolds number: no coasting [S15]. Sunlit near the surface. | *Didinium*, *Dileptus*, heliozoans |
| **Bladderwort shoot** | Submerged, finely divided leaves carrying bladders 0.5–3 mm long [S52]. The plants grow in water 2–20 cm deep [S55]. | Trap doors; spontaneous firing |
| **Sphagnum fringe** (*S. fallax*, *S. cuspidatum*-type submerged) | Moss tips in the pool [S26, S55]. Testate amoebae, rotifers. | *Hyalosphenia*, *Nebela* |
| **Detritus floor** | Decaying leaves on the bottom; where *Actinosphaerium* sits "in the uppermost leaf layer at the bottom" [S31]. Lower oxygen with depth [S16]. | Suctorian forests, heliozoans |
| **A drying pond** | Ponds dried out in the 2018 and 2026 droughts [S26]. | Shrinking water; crowding raises encounter rates |

### 3.5 Food and resources

- ***P. bursaria*:** bacteria and small particles swept into the oral groove,
  plus sugars from its *Chlorella* in light [S27]. **[Proposal]** Two
  resource bars: food vacuoles from feeding, and light for the symbionts.
  Dark water starves the symbionts.
- ***Amoeba proteus*:** engulfs smaller protists and algae [S04, S05].

### 3.6 Zoom transition to Level 4

- **The visible thing:** a **bladderwort trap** on the pool edge, with green
  periphyton covering its outside.
- **Handoff [Proposal]:** *P. bursaria* swims near a trap. Something brushes
  the trigger hairs, or a spontaneous firing happens [S52]. The door opens in
  half a millisecond, and the camera is swept inside with the water. Inside is
  a **resident community** of bacteria, algae, euglenids, ciliates and rotifers,
  in acidic, almost anoxic trap fluid [S54]. The trap's community seems to
  come largely from the periphyton outside [S54]. The objective clicks to 40×,
  and a tiny armoured flagellate, *Trachelomonas*, becomes the protagonist
  among the trap's algae and the periphyton.
- **Narrative honesty:** the *Paramecium* does not "become" the flagellate.
  The camera picks a new focal creature, exactly as an observer would at the
  bench. *P. bursaria* may die in the trap or live as part of its community
  **[Unverified which]**. In *U. reflexa* traps, a ciliate with algal symbionts is
  thought to survive the anaerobic, acidic fluid by mixotrophy (a 2016
  *Journal of Eukaryotic Microbiology* study, abstract-level, in the S54
  literature).
- **Alternative [Proposal]:** no trap. The camera descends onto the
  periphyton coating a bladderwort leaf or a Sphagnum leaf outside the trap.

### 3.7 Gameplay possibilities [Proposal]

- **The *Dileptus* duel:** time trichocyst discharge to its proboscis strike
  [S09].
- **The *Didinium* chase:** read its approach and reverse before contact [S08,
  S28]. It wins any contact.
- **The suctorian forest:** cross a static minefield where speed itself
  protects you [S57].
- **The heliozoan in darkfield:** toggling to darkfield is a "sense" that
  reveals axopods. It costs a short pause, while the brightfield view keeps
  them faint.
- **Light management:** keep *P. bursaria*'s symbionts lit without straying
  into open, exposed water.
- **Departures to label:** any duel pacing that makes extrusome discharge
  repeatable on a cooldown; the speed of trap reset if shortened.

---

## Level 4: The periphyton and the trap (small flagellate)

### 4.1 Scale and optics

- **Protagonist size:** *Trachelomonas hispida* lorica (the outer shell)
  20–42 µm long, 15–26 µm wide; its flagellum is about twice the body length
  [S34]. The *Euglena* alternatives are E. gracilis 35–50 µm and E. viridis
  40–65 µm [S12].
- **Field:** 450 µm at 40× / 400×. A 30 µm cell is about 7% of the field.
- **Treatment:** phase contrast or DIC [atlas visual-styles]. Phase halos are
  imaging artifacts. Depth of field is about 1 µm [S18]: the focal plane
  is thinner than a diatom.
- **Resolvable:** diatom raphe and striae (outlines, coarse pattern), desmid
  shapes, chloroplasts, the red eyespot (stigma), the lorica's spines,
  bacteria as dots and rods. **Not resolvable:** the flagellum's internal
  structure, fine pore structure of diatom valves without oil, single
  molecules or "chemical clouds" [S17, atlas 04].

### 4.2 Playable protagonists

| Candidate | Movement | Real abilities and costs | Sources |
| --- | --- | --- | --- |
| ***Trachelomonas hispida***: **recommended** | A flagellar swimmer **inside a lorica**: an armoured, spiny shell the cell builds around itself [S34]. | **[Observed]** Recorded at Simmelried [S34]. Swims freely; collects on the illuminated side in samples [S34]. **Cost:** a heavy shell. **[Observed]** In one old sample, ~80% of specimens carried one or two cells of a **parasitic fungus** [S34]. | S34 |
| ***Euglena*** sp. (the atlas's anchor) | Flagellar swimming plus **metaboly** (the euglenoid shape-shifting crawl) | **[Observed]** Light-seeking or light-avoiding through the stigma and photoreceptor [S13]. *E. deses* (62–229 µm, metabolic, short flagellum) is recorded at Simmelried [S35]. ***E. mutabilis*** (acidophilic, Sphagnum-associated; 53–206 µm) has no emergent flagellum and moves only by metaboly and gliding [S67]. | S12, S13, S35, S67 |

**Why Trachelomonas:** it is small enough to make the field feel large,
recorded at the model site, and it carries its own armour: a different
answer to predation than the earlier levels. *E. gracilis* is the atlas's
anchor [S12] but is **[Unverified]** at pH 5–6 bog ponds. *E. deses* and
*E. mutabilis* are bog-plausible but as large as a *Paramecium*, which
breaks the "field narrows" feel.

**Movement model [Proposal]:** at Re ≪ 1 [S15], a pulled swimmer that stops
the moment the flagellum stops. It **steers by light**: phototaxis toward
moderate light and away from intense light [S13]. For a *Euglena* chapter,
add metaboly as a squeeze through gaps, keeping its volume constant.

### 4.3 Enemies and threats

| Threat | Size | Mechanism | Evade or counter | Evidence |
| --- | --- | --- | --- | --- |
| ***Peranema trichophorum*** | 22–81 µm (Simmelried) [S33] | A colourless euglenid predator. It feeds with a **two-rod ingestion apparatus** that widens its mouth [S33]. Kreutz watched one attack a flagellate too large to ingest [S33]. Ingestion of *Euglena* has been reported (Brown 1930, cited in [S66]). Whether the rods mainly suck or rasp is disputed [S66]. | **[Proposal]** Your lorica is protection against small *Peranema*: size decides. A big *Peranema* can still cut in. **[Unverified]** that it eats *Trachelomonas*. | S33, S66 |
| ***Actinophrys sol*** (sun animalcule) | 20–90 µm, commonly 40–50 µm (Simmelried) [S32] | Axopods catch small flagellates, ciliates and algae, and it can catch very large prey [S32]. | **[Proposal]** A drifting mine. Don't swim into its arms; it is slow to reach you. | S32 |
| **Rotifer feeding currents** (the Level 2 bdelloid, now a giant) | 200–500 µm | The corona's whirl draws in small cells [S23]. | **[Proposal]** A whirlpool in the corner of the field. This is the former protagonist as the new hazard. | S23 |
| **Testate amoebae** (*Hyalosphenia papilio*, *Nebela*) | 70–150 µm | Microalgae were about 25–35% of their diet [S50]. | **[Proposal]** Slow ambushers on the Sphagnum fringe. | S50 |
| **Chytrid parasites** | Zoospores a few µm; swim ~160 µm/s in a marine study [S63] | A zoospore attaches to an algal cell, encysts, injects its contents, and becomes a sporangium that releases new zoospores [S63]. Freshwater: *Staurastromyces oculus* infects only *Staurastrum* desmids [S62]. *Zygorhizidium* enters the lake diatom *Asterionella* through the girdle between the two valves (lake, not bog) **[Unverified at our site]**. | **[Proposal]** For the protagonist: an infection risk from the fungus seen on 80% of one *Trachelomonas* sample [S34]. Its identity is **[Unverified]**; Kreutz does not name it. For the world: diatoms and desmids around you collapse into sporangia. | S34, S62, S63 |
| ***Vampyrella*** (vampire amoebae) | Tens of µm **[Unverified exact]** | It perforates the cell walls of filamentous green algae (*Spirogyra*, *Mougeotia*, *Zygnema*): it dissolves a hole about 5–7 µm wide, then engulfs the protoplast. Some relatives extract it differently [S64]. | **[Proposal]** Not a threat to you but an environmental event: it eats the algal "trees" of the level. **[Unverified]** at Simmelried. | S64 |
| **Trap fluid (if inside a bladderwort)** | Habitat | Acidic, almost anoxic fluid, with the plant's digestion [S54]. | **[Proposal]** Inside, light is low and oxygen poor. Find the door before it fires again, or live as part of the resident community. | S54 |
| **Spontaneous trap firing** | Habitat | Every 5–20 h [S52]; catches algae that can't trigger it themselves [S52, S53]. | **[Proposal]** If outside, the current is a sudden sweep. | S52 |

### 4.4 Environments

| Sub-habitat | Physical rules | Hazards |
| --- | --- | --- |
| **Periphyton on a bladderwort leaf or Sphagnum leaf** | A biofilm of diatoms, desmids, bacteria and extracellular matrix. Gradients of oxygen and nutrients [S16]. The bog diatom flora: ***Eunotia***, ***Pinnularia***, ***Frustulia*** [S60]. Gliding raphid diatoms move on the surface [S14]. | Chytrid outbreaks, *Peranema* |
| **Desmid meadow** | *Cosmarium*, *Staurastrum*, *Closterium*: the most species-rich desmid genera in peat bogs [S61]. Symmetrical, rigid, green. | Chytrid-infected *Staurastrum* [S62] |
| **Filamentous algae** (*Spirogyra*, *Mougeotia*) | Long strands, the "forest" | *Vampyrella* attacks [S64] |
| **Inside a bladderwort trap** | A closed chamber 0.5–3 mm across [S52], with acidic, nearly anoxic fluid and a resident community of bacteria, algae, euglenids, ciliates and rotifers [S54]. Dim. | Low oxygen; plant digestion; it may refire [S52] |

### 4.5 Food and resources

- ***Trachelomonas* and *Euglena*:** photosynthesis, as **light**. Phototaxis
  takes it toward moderate light and away from damaging intensity [S13]. Many
  euglenids also take up dissolved organic matter **[Unverified for
  *T. hispida*]**.
- **[Proposal]** A light field (which matters) and an oxygen or nutrient field
  (a separate overlay, labelled data, not a visible colour [S16, atlas
  environments]).

### 4.6 Zoom transition to Level 5 (optional)

- **The visible thing:** the **bacterial film** under the periphyton, rods
  and dots that show only as texture at 400×.
- **Handoff [Proposal]:** the flagellate settles on the biofilm. The camera
  holds on a moving rod that suddenly stops against a larger rod. The
  objective clicks to 100× oil. The new protagonist is the attacker, a
  *Bdellovibrio*-type predatory bacterium [S65].

### 4.7 Gameplay possibilities [Proposal]

- **Objective: "Find the light."** In the trap, find the dim light near the
  door. Outside, hold a band of moderate light without straying into
  damaging intensity [S13].
- **Encounter: *Peranema*.** Size decides; grow, or lure a small one.
- **Chytrid storm:** around you the desmids collapse as sporangia burst. The
  zoospores pick hosts, mostly not you.
- **Departures to label:** the exact identity and host range of the
  *Trachelomonas* parasite; trap life of any specific species.

---

## Level 5 (optional epilogue): The film of bacteria

### 5.1 Scale and optics

- **Protagonist:** *Bdellovibrio bacteriovorus*-type. Cells measured about
  0.2–0.5 µm wide and 0.5–2.5 µm long [MicrobeWiki, via S65]; a reported
  peak speed of 160 µm/s (one maximum, not typical) **[Unverified]**.
- **Field:** 180 µm at 100× oil / 1000×. Resolution ≈ 0.2 µm, at NA 1.25–1.4
  [S17]. Depth of field ≈ 0.2 µm [S18].
- **What the microscope shows:** *Bdellovibrio* is about one or two resolution
  units wide: a moving dot or short dash. Its entry into a prey cell shows
  only as the prey's change of shape. The prey rod rounds into a sphere, the
  **bdelloplast** [S65]. **Everything inside is beyond light microscopy.**

### 5.2 Protagonist and life cycle [Observed]

*Bdellovibrio* attacks Gram-negative bacteria. It enters the **periplasm**,
the space between the prey's two membranes, sheds its flagellum, rounds the
prey into a bdelloplast, grows as a filament inside it, then divides into new
attack-phase cells that burst out [S65].

### 5.3 Enemies, environment and food

- **Threats:** grazing flagellates and ciliates, which eat bacteria
  indiscriminately (the Level 3–4 creatures as giants); and running out of
  prey. **[Unverified]** specific grazers in this bog.
- **Environment:** the bacterial biofilm under the periphyton, with matrix,
  channels and gradients [S16].
- **Food:** the prey cell's contents, digested from inside [S65].

### 5.4 Why this is an epilogue, not a level

The chain's honesty rule is: **zoom cannot create detail the optics cannot
show** [S17]. A full action level at this scale would need an immersive,
electron-microscope-like view **[Departure]**. **[Proposal]** Keep it to a
short coda: the player directs one attack, the light-microscope view shows
only the prey rounding, and a caption marks the limit of the microscope. That
ends the chain on the point the atlas makes.

---

## Cross-level: one world at nested scales

### Creatures at more than one scale

| Creature | Its level | Where it reappears | How it looks there |
| --- | --- | --- | --- |
| *Limnozetes* mite | 1 | **Level 2**, same size as the tardigrade (~300 µm) | A dark, armoured walker crossing the film, a quiet reminder that L1→L2 changed the medium, not body size |
| Tardigrade (protagonist) | 2 | **Level 3**, at the pool edge | A clawed, translucent giant (250–500 µm in a 0.9 mm field) |
| *Milnesium* | 2 | **Level 3** | Up to 1.2 mm [S42]: it fills more than the whole field |
| Bdelloid rotifer | 2 | **Level 4** | Its corona's current, a hazard from off-screen |
| *Utricularia* bladder | 3 | **Level 2** (a dark shape beyond the leaf edge) and **Level 4** (inside) | 0.5–3 mm bladders [S52] |
| *Amoeba proteus* | 3 (alt.) | **Level 4** | 160–760 µm [S29]: a moving wall |
| *Paramecium bursaria* | 3 | **Level 4** | A huge, green, ciliated body, perhaps inside the trap |
| Chlorella symbionts (5–6 µm) | — | **Level 3** inside *P. bursaria*, **Level 4** free | The same algal type, seen at both scales [S27] |
| Chytrids / fungi | 2–4 | Every wet level | A recurring kind of threat: a spore, an attachment, an injection |

### Keeping one coherent habitat

- **One place:** the Simmelried-type bog, with a gradient from **hummock**
  (Level 1) through **lawn** (Level 2) to **hollow pool** (Level 3) and the
  **periphyton and trap** (Level 4) [S26, S55, S68].
- **One weather:** drying and rewetting carry across all levels: the dew in
  Level 1, the retreating film in Level 2, the shrinking pond in Level 3, and
  the trap's sealed fluid in Level 4 [S26].
- **One light:** daylight from above. Level 1 shows it as reflected light;
  Levels 2–4 show it as transmitted microscope light. **[Departure]** The
  microscope's transmitted light is the observer's illumination, not the sun.
  Light as a resource (Levels 3 and 4) should still be modelled as daylight.
- **One cast:** every creature is either recorded at Simmelried by Kreutz or
  explicitly marked with the nearby site where it is recorded, or as
  **[Unverified]**.

### Open questions

1. **The mite's food.** *Limnozetes*'s diet is not documented here. Is a
   generic oribatid diet (fungi, algae, detritus) acceptable, or should the
   protagonist be a better-studied oribatid?
2. **The box-mite option.** Is a ptychoid box mite present in a wet
   Sphagnum lawn? If not, its defence stays a reference only.
3. **The tardigrade species.** Which grazing tardigrade occurs in Sphagnum at
   Simmelried? Kreutz's site lists rotifers and gastrotrichs, but tardigrade
   records were not checked.
4. **Zoophagus, Haptoglossa and Ballocephala** in Sphagnum: their presence in
   bog water films is unconfirmed.
5. **Nematode-trapping fungi** in wet Sphagnum: unconfirmed, and their traps
   are nematode-sized.
6. ***Dileptus*** and ***Actinosphaerium*** at Simmelried: not confirmed on
   Kreutz's site (*Actinosphaerium* is listed from Mindelsee).
7. ***Trachelomonas* in bladderwort traps:** euglenids are reported in trap
   fluid generally [S54], but not this genus specifically.
8. **The *Trachelomonas* parasite:** Kreutz does not name the fungus.
9. **Speeds.** Swimming and walking speeds for each protagonist were not
   collected. They need sourced numbers before tuning, and the time
   compression for each level must be stated.
10. **Water-holding figures for Sphagnum** (90% between plants, 10% in
    hyaline cells) come from a search summary of an MDPI study and should be
    checked before they set film-thickness rules.

---

## Sources (continuing from the atlas)

S01–S24 are the atlas's sources (`micro/research/build.py`, `sources.html`).
New sources follow. "Abstract-level" means only the abstract or a summary was
read.

| ID | Topic | Source | Notes |
| --- | --- | --- | --- |
| S25 | Simmelried monograph | Kreutz M, Foissner W (2006). *The Sphagnum ponds of Simmelried in Germany: a biodiversity hot-spot for microscopic organisms.* Protozoological Monographs 3. Shaker. Review: https://www.bioimages.org.uk/bioinfohtml/html/b155183.htm | Bibliographic and review level; the book was not read |
| S26 | Simmelried site and statistics | Kreutz M. Real Micro Life: Simmelried, https://realmicrolife.com/simmelried/ ; Statistics, https://realmicrolife.com/statistic/ | About 3 ha; ponds pH 5–6; outflow pH 7; droughts in 2018 and 2026; 640 of 955 species from Simmelried |
| S27 | *Paramecium bursaria* | Kreutz M. Real Micro Life, https://realmicrolife.com/paramecium-bursaria/ | 85–150 µm; *Chlorella* 5–6 µm; *Holospora elegans*; Simmelried |
| S28 | *Didinium nasutum* | Kreutz M. Real Micro Life, https://realmicrolife.com/didinium-nasutum/ | 80–200 µm; regularly at Simmelried; swallows *P. caudatum* |
| S29 | *Amoeba proteus* | Kreutz M. Real Micro Life, https://realmicrolife.com/amoeba-proteus/ | 160–760 µm; Simmelried; undescribed exoparasitic fungus |
| S30 | *Stentor coeruleus* | Kreutz M. Real Micro Life, https://realmicrolife.com/stentor-coeruleus/ | Up to 4 mm elongated; Simmelried |
| S31 | *Actinosphaerium eichhornii* | Kreutz M. Real Micro Life, https://realmicrolife.com/actinosphaerium-eichhornii/ | 200–1000 µm; rotifers and ciliates as prey; Mindelsee |
| S32 | *Actinophrys sol* | Kreutz M. Real Micro Life, https://realmicrolife.com/actinophrys-sol/ | 20–90 µm (commonly 40–50); Simmelried |
| S33 | *Peranema trichophorum* | Kreutz M. Real Micro Life, https://realmicrolife.com/peranema-trichophorum/ | 22–81 µm; two-rod ingestion apparatus; all of Kreutz's sites |
| S34 | *Trachelomonas hispida* | Kreutz M. Real Micro Life, https://realmicrolife.com/trachelomonas-hispida/ | Lorica 20–42 × 15–26 µm; Simmelried; parasitic fungus on ~80% of one sample |
| S35 | *Euglena deses* | Kreutz M. Real Micro Life, https://realmicrolife.com/euglena-deses/ | 62–229 µm; Simmelried only |
| S35b | *Hyalosphenia papilio* | Kreutz M. Real Micro Life, https://realmicrolife.com/hyalosphenia-papilio/ | 70–140 µm; Sima Moor (Austria) only |
| S36 | *Spathidiodes euglenivora* | Kreutz M. Real Micro Life, https://realmicrolife.com/spathidiodes-euglenivora/ | 90–130 µm; feeds only on colourless euglenids; Simmelried; not used in levels, kept as a candidate predator of *Peranema* |
| S37 | *Limnozetes* | Seniczak A, Seniczak S (2010). Morphological differentiation of *Limnozetes*… Belgian Journal of Zoology 140(1): 40–58. https://biblio.naturalsciences.be/associated_publications/bjz/140-1/bjz_seniczak.pdf | 270–390 µm; wet Sphagnum bogs; full text read |
| S38 | Oribatid enemy-free space | Peschel K, Norton RA, Scheu S, Maraun M (2006). Do oribatid mites live in enemy-free space? Soil Biology & Biochemistry 38: 2985–2989. | Abstract-level |
| S39 | Box-mite force resistance | Schmelzle S, Blüthgen N (2019). Under pressure: force resistance measurements in box mites. Frontiers in Zoology 16: 24. https://pmc.ncbi.nlm.nih.gov/articles/PMC6611053/ | Body sizes; staphylinid trials; ptychoidy |
| S40 | Springtail jumps | Ortega-Jiménez VM, et al. (2022). Directional takeoff, aerial righting, and adhesion landing of semiaquatic springtails. PNAS. Preprint: https://arxiv.org/abs/2211.04285 | Abstract-level and press releases |
| S41 | *Milnesium* diet | Roszkowska M, et al. (2016). Is the gut content of *Milnesium* related to buccal tube size? Zoological Journal of the Linnean Society. doi:10.1111/zoj.12459 | Abstract-level |
| S42 | *Milnesium* life history | Suzuki AC (2003). Life history of *Milnesium tardigradum* under a rearing environment. Zoological Science 20(1): 49–57. https://bioone.org/journals/zoological-science/volume-20/issue-1/zsj.20.49/ | Hatchlings can't swallow whole prey until the 3rd instar |
| S43 | Tardigrade prey preference | Tůmová et al. Buccal tube dimensions and prey preferences in predatory tardigrades. Applied Soil Ecology. https://asep.lib.cas.cz/arl-cav/en/detail-cav_un_epca-0557130-Buccal-tube-dimensions-and-prey-preferences-in-predatory-tardigrades | Abstract-level; predators favoured nematodes over tardigrades in trials |
| S44 | Predatory nematodes | Study of mononch intestinal contents, https://repository.ias.ac.in/85651 ; *Prionchulus muscorum* as a moss predator, Scientific Reports (2019), https://www.nature.com/articles/s41598-019-42213-x | Abstract-level; titles and authors not verified |
| S45 | Rotifers escaping fungi | Wilson CG, Sherman PW (2010). Anciently asexual bdelloid rotifers escape lethal fungal parasites by drying up and blowing away. Science 327: 574–576. | Read through commentary and press coverage |
| S46 | Rotifer fungi | Barron GL. Two new fungal parasites of bdelloid rotifers. Canadian Journal of Botany, doi:10.1139/b81-198; *Haptoglossa* gun cells, Scientific American "Artful Amoeba", https://www.scientificamerican.com/blog/artful-amoeba/parasite-s-harpoon-loaded-canon-relies-on-physics-not-chemistry | Abstract-level and popular |
| S47 | Tardigrade fungi | *Ballocephala verrucispora*, BioImages: https://www.bioimages.org.uk/bioinfohtml/html/Ballocephala_verrucispora.htm | Low-grade source |
| S48 | Nematode-trapping fungi | Review in Protein & Cell (2012), doi:10.1007/s13238-012-2031-8 | Rings triple in volume within 0.1 s; net loops ~20 µm |
| S49 | *Zoophagus* | Kendrick B. *The Fifth Kingdom*, ch. 15, https://mail.mycolog.com/chapter15.html | Pictorial supplement only |
| S50 | Testate amoeba diets | Jassey VEJ, et al. (2012). Characterizing the feeding habits of the testate amoebae *Hyalosphenia papilio* and *Nebela tincta*… Protist 163. Companion: https://hal.archives-ouvertes.fr/hal-00682493/file/MECO-2010-0247-R2.pdf | Figures from the abstract summary |
| S51 | *Nebela* eating rotifers | Gilbert D, et al. (2003). Population dynamics and food preferences of the testate amoeba *Nebela tincta major-bohemica-collaris* complex in a *Sphagnum* peatland. Acta Protozoologica 42: 99–104. | Abstract-level |
| S52 | Bladderwort mechanics | Vincent O, et al. (2011). Ultra-fast underwater suction traps. Proc. R. Soc. B 278: 2909–2914. doi:10.1098/rspb.2010.2292. https://pmc.ncbi.nlm.nih.gov/articles/PMC3151700 | Full text read |
| S53 | Bladderwort prey | Alkhalaf IA, Hübener T, Porembski S (2009). Prey spectra of aquatic *Utricularia* species in northeastern Germany: the role of planktonic algae. https://lentibulariaceae.myspecies.info/node/13 | Abstract-level |
| S54 | Trap community | Sirová D, et al. (2009). Microbial community development in the traps of aquatic *Utricularia* species. Aquatic Botany. https://www.butbn.cas.cz/adamec/Sirova09.pdf ; with Adamec's review and Sirová (2020) | Abstract and summary level; the PDF was unavailable |
| S55 | Bladderwort bog pools | Pladias: *Sphagno-Utricularion*, https://pladias.cz/en/vegetation/description/Sphagno-Utricularion | Vegetation database |
| S56 | *Didinium* capture | Wessenberg H, Antipa G (1970). Capture and ingestion of *Paramecium* by *Didinium nasutum*. Journal of Protozoology. NIES record: https://web.nies.go.jp/chiiki1/protoz/refere/id1999/1170.htm | Abstract-level |
| S57 | Suctorian feeding | *Podophrya* feeding studies, NIES records: https://web.nies.go.jp/chiiki1/protoz/refere/id999/795.htm , https://web.nies.go.jp/chiiki1/protoz/refere/id999/793.htm | Abstract-level |
| S59 | *Stentor* | NIES: *Stentor* morphology, https://web.nies.go.jp/chiiki1/protoz/morpho/ciliopho/stentor.htm ; MicrobeWiki: *Stentor* | Rotifer prey claim is from MicrobeWiki (student-edited) |
| S60 | Bog diatoms | Kulikovskiy M, et al. (2010). *Diatom assemblages from Sphagnum bogs of the World. I. Nur bog in northern Mongolia.* Bibliotheca Diatomologica. Plus Japanese, Czech and Russian bog surveys | Search summaries; *Eunotia*, *Pinnularia*, *Frustulia* dominate |
| S61 | Bog desmids | Desmids of four Serbian peat bogs. Archives of Biological Sciences (2013). https://doaj.org/article/a2c53feb534b42e7a57670891700a121 | Abstract-level |
| S62 | Desmid chytrid | Van den Wyngaert S, et al. (2017). *Staurastromyces oculus*, a parasitic chytrid of *Staurastrum*. Protist. | Abstract-level; obligate and genus-specific |
| S63 | Diatom chytrids (marine analogue) | Scholz B, et al. (2017). Chytridiomycosis of marine diatoms… Marine Drugs 15(2): 26. https://pmc.ncbi.nlm.nih.gov/articles/PMC5334607/ | Marine; used for mechanism and zoospore speed only |
| S64 | Vampire amoebae | Hess S, Sausen N, Melkonian M (2012). Shedding light on vampires: the phylogeny of vampyrellid amoebae revisited. PLoS ONE 7(2): e31165. Suthaus A, Hess S (2024), *Strigomyxa ruptor*, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11358034/ | 5–7 µm hole figure via secondary summary |
| S65 | *Bdellovibrio* | Sockett RE (2009). Predatory lifestyle of *Bdellovibrio bacteriovorus*. Annual Review of Microbiology 63: 523–539. doi:10.1146/annurev.micro.091208.073346 | Abstract-level; sizes from MicrobeWiki |
| S66 | *Peranema* feeding | Archiv für Protistenkunde 81 (1934): 308–317, https://www.zobodat.at/pdf/Archiv-fuer-Protistenkunde_81_1934_0308-0317.pdf (cites Brown 1930 on *Euglena* ingestion) | Old; rod function disputed |
| S67 | *Euglena mutabilis* | Pentecost A (1982). The distribution of *Euglena mutabilis* in sphagna, with reference to Malham Tarn North Fen. Field Studies. https://www.field-studies-council.org/resources/field-studies-journal/the-distribution-of-euglena-mutabilis-in-sphagna-with-reference-to-malham-tarn-north-fen/ | Bibliographic record; sizes and movement from secondary summaries |
| S68 | Peatland tardigrades | A first look into moss-living tardigrades in boreal peatlands. Ecology and Evolution (2024). https://jyx.jyu.fi/jyx/Record/jyx_123456789_96860 | Abstract-level; 116 samples, 13 sites |
| S69 | Sphagnum cells and resident rotifers | Plewka M. Plingfactory: *Sphagnum*, https://plingfactory.de/Science/Atlas/Kennkarten%20Pflanzen/Moose/Sphagnum/e-source/Sphagnum.html ; *Habrotrocha roeperi*, https://plingfactory.de/Science/Atlas/KennkartenTiere/Rotifers/01RotEng/source/Habrotrocha%20roeperi.html | Expert amateur atlas |
| S71 | *Hydrozetes* | Mites at the edges of bog pools in the Orawa–Nowy-Targ Basin. Biological Letters (2015). https://pressto.amu.edu.pl/index.php/BIOLET/article/view/biolet-2015-0009 | Abstract-level |
| S73 | Tun formation | Ultrastructural analysis of the dehydrated tardigrade *Hypsibius exemplaris*. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7062702/ | Tun = body contraction and leg retraction, reversed on rehydration; revival timing is protocol-dependent |

(S58, S70 and S72 are unused; the numbering is kept so citations stay stable.)
