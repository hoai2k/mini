# Zoom Chain: level specification

A design specification for the zoom levels of **Zoom Chain**. It builds on the
research atlas in `micro/research/` (sources S01–S24, cited here by number) and
adds new sources from S25 onward. Research checked 30 October 2026.

**Revision of 30 October 2026 (owner's decisions):** a new **Level 0** (the
bog surface, a water springtail) above the mite; **Level 3 corrected** so
that *Paramecium bursaria* is the protagonist and *Amoeba proteus* a giant
threat; **Level 5** (bacteria) promoted from epilogue to a full level;
a new, optional **Level 6** (a bacteriophage); and a **movement** section,
because the game is about movement and every creature has a **dash (A)** and
an **attack/eat (X)** (`micro/prototypes/CONTROLS.md`). The per-level movement
detail is in [`movement.md`](movement.md). New sources are S74–S105.

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

## The recommended habitat: one Sphagnum bog with ponds

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

### One bog, top to bottom: where Levels 0, 5 and 6 sit

The three new levels do not need a new place. They are the top and the
bottom of the same pool:

| Level | Where in the Simmelried-type bog | What ties it to its neighbours |
| --- | --- | --- |
| **0: the surface** | The **surface film of a hollow pool** and the wet Sphagnum lawn at its edge, with sundews on the lawn | *Podura aquatica* lives its whole life on the film of still water [S74]. *Drosera intermedia* grows in the wetter, lower parts of a bog and *D. rotundifolia* higher up, where it catches more springtails [S79]. Level 1's capitulum is the lawn the springtail lands on. |
| 1–2 | Lawn and hollow (as before) | — |
| 3–4 | The open pool, bladderwort, periphyton (as before) | — |
| **5: the sediment and the biofilm** | The **mud at the bottom of the hollow pool**, at the boundary where oxygen runs out, and the bacterial film under Level 4's periphyton | Magnetotactic bacteria live in sediments and swim to the oxic–anoxic transition zone [S89, S90]. Living ones have been found in **acidic peat soils at pH 4.3–5.7** [S91], close to Simmelried's pH 5–6 ponds [S26]. *Bdellovibrio* lives in fresh water and soil [S94]. |
| **6: the water itself** | **Everywhere**, but alive mainly below the top few centimetres: the bog's brown, humic water absorbs UV within centimetres [S104] | A phage that infects the Level 5 bacteria. The surface film of Level 0 is where UV is worst, so the chain's top and bottom meet: the springtail's sunlit film is the phage's most dangerous place. |

**Honesty constraints for the new levels:** magnetotactic bacteria are
recorded in acidic peat in China [S91], not at Simmelried; *Bdellovibrio* is
recorded from fresh water generally [S94], not from this bog. Both are
**[Unverified at our site]**. A Sphagnum bog has little mineral clay
**[Unverified for Simmelried]**, so Level 6's "clay" hazard should be read as
mineral and peat particles (see 6.3).

---

## Level overview

The settled chain has **six core levels (0–5) plus one optional level (6)**.
Body size does not shrink in a straight line: a Level 3 amoeba can be longer
than the Level 1 mite. What narrows at every click is the **field**, the
**medium**, and the **optics** [atlas index]. The table makes this explicit.

| # | Level | Protagonist (body) | Objective / total | Field | Resolvable (≈ d) | Depth of field (≈) | Optical treatment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | **The bog surface** | Water springtail *Podura aquatica*, up to ~1.5 mm [S74] | Macro lens or hand lens, 1–5× | ~2–5 cm (not FN18) | ~0.1 mm by eye, ~20 µm at 5× (approximate) | Millimetres | Daylight, reflected; the water surface as a mirror and a membrane |
| 1 | **The Sphagnum canopy** | *Limnozetes* oribatid mite, 270–390 µm | Stereo 10–20× (zoom body) | ~6–12 mm (stereo; not FN18) | ~10–20 µm | Hundreds of µm | Reflected light (stereo), daylight |
| 2 | **The water film** | Grazing eutardigrade 250–500 µm, or bdelloid rotifer | 10× / 100× | 1.8 mm | ~1.1 µm (NA 0.25) | ~8.5 µm | DIC or brightfield, with focal-plane slicing |
| 3 | **The hollow pool** | *Paramecium bursaria*, 85–150 µm (*Amoeba proteus*, 160–760 µm, is a giant here) | 20× / 200× | 0.9 mm | ~0.7 µm (NA 0.40) | ~5.8 µm | Brightfield, plus darkfield for threat reveals |
| 4 | **The periphyton and the trap** | *Trachelomonas hispida*, lorica 20–42 µm (alt. *Euglena* sp.) | 40× / 400× | 450 µm | ~0.42 µm (NA 0.65) | ~1 µm | Phase contrast or DIC |
| 5 | **The sediment and the biofilm** | A magnetotactic bacterium (rods, spirilla, cocci of a few µm), or *Bdellovibrio* (~0.2–0.5 × 0.5–2.5 µm) | 100× oil / 1000× | 180 µm | ~0.2 µm (NA 1.25–1.4) | ~0.2 µm | Phase contrast and fluorescence at the optical limit; electron-microscope insets for anatomy (see 5.1) |
| 6 (optional) | **The virus** | T4-like tailed phage, head ~120 × 86 nm, tail ~100–140 nm [S98] | None: below light microscopy | ~1–2 µm (one host cell) | — | — | **[Departure]** molecular illustration and cryo-EM style, labelled as such |

**Why a Level 0 above the mite?** It narrows the field the way the other
clicks do. The springtail (~1.5 mm) is about five times the mite's length,
and the field shrinks from a few centimetres (a hand lens over the pool edge)
to the 6–12 mm of the stereo microscope. It also adds the one medium the chain
lacked: the **surface film itself**, where the water is a floor and the air
is the open world.

**Why no extra level between mite and tardigrade?** The two protagonists are
the same size: a 300 µm *Limnozetes* and a 300 µm tardigrade. Inserting
another animal level, such as a nematode, would add a level without narrowing
the field. The real jump from Level 1 to Level 2 is from **air to water and
from reflected to transmitted light**, and the transition should sell exactly
that. Nematodes stay as characters instead: the predatory nematode
*Prionchulus* in Level 2. Springtails, now Level 0's protagonist, reappear in
Level 1 as giants.

**Why Level 3's protagonist is the ciliate, not the amoeba.** An *Amoeba
proteus* (160–760 µm) [S29] is the tardigrade's size (250–500 µm) [S02]. With
the amoeba as protagonist, the step from Level 2 to Level 3 was a change of
**habitat, not of magnification**: film to open pool, with no smaller hero.
*P. bursaria* (85–150 µm) [S27] is two to four times shorter than the
tardigrade, so the field can honestly narrow. The amoeba becomes what it is
to a *Paramecium*: a slow giant that engulfs ciliates [S87].

**Why Level 5 is now a full level.** The earlier draft kept bacteria as an
epilogue because a light microscope barely resolves them [S17]. The owner has
chosen a full level. That is workable if the level is honest about what it
shows: bacteria are **dots and dashes** under phase contrast, **points of
light** under fluorescence, and their anatomy (flagella, magnetosome chains,
the bdelloplast's interior) comes from **electron microscopy of fixed cells**
[S20, S93]. Section 5.1 sets out the look. The design also makes the level
about something a microscope does show well: **paths**. Bacteria are tracked
in exactly this way in the lab [S95].

**Why Level 6 is optional.** No light microscope sees a phage, and a phage
does not steer: it drifts by Brownian motion until it touches a receptor
[S99, S100]. Level 6 is therefore a level about **changing odds**, not
steering, drawn in a frankly illustrative style. It stays optional.

**Possible split [Proposal]:** Level 3 could split into **3a, the open
hollow pool** and **3b, inside a bladderwort trap**. The trap interior is a
closed, acidic, nearly anoxic world with its own resident community [S54].
This spec instead uses the trap as the **transition from Level 3 to Level 4**
(see 3.6), and makes the trap interior one of Level 4's environments.

---

## Level 0: The bog surface (water springtail)

### 0.1 Scale and optics

- **Protagonist size:** *Podura aquatica* reaches about **1.5 mm** [S74]. A
  population in one predation study measured 0.8 mm [S78, popular summary].
- **Field:** about **2–5 cm** across: a hand lens or a macro lens at 1–5×
  over the edge of a hollow pool. That holds a stretch of open film, the
  first Sphagnum shoots of the lawn, and a sundew rosette. This is a camera
  field, not an FN18 figure.
- **Treatment:** daylight from above and from the water. The surface is the
  main character: a **mirror** that reflects sky and moss, a **membrane** the
  springtail stands on, and a curved **meniscus** where it meets a stem. The
  dimples under each foot and under the furcula should read clearly; for an
  unwettable animal the surface acts as a floor [S74].
- **Resolvable:** at reading distance the unaided eye resolves about 0.1 mm;
  a 5× lens brings this near 20 µm (approximate figures, no source). Legs,
  antennae, the furcula, the springtail's blue-grey bloom and the sundew's
  glue droplets are visible. **Not resolvable:** the mite on the moss, which
  at 0.3 mm is a moving speck **[Proposal: foreshadowing, as the tardigrade is
  in Level 1]**.

### 0.2 Playable protagonist

| Candidate | Why | Real abilities and costs |
| --- | --- | --- |
| ***Podura aquatica***: **recommended** | "Exclusively aquatic": it lives its whole life on the surface of still water [S74] | **[Observed]** A large, flattened furcula lets it jump from the water without breaking the surface [S74]. Its cuticle is unwettable, so the surface works as a floor; a springtail pushed under by waves is wrapped in a silvery air layer that lifts it back up [S74]. It finds water surfaces by sight: adults are phototactic, most sensitive to blue (~484 nm) and green-yellow (~570 nm), and strongly attracted to horizontally polarised blue light, which is how a water surface looks [S74]. Eggs are laid on the surface, are wettable, and sink; the hatchling is unwettable and rises to the surface [S74]. **[Unverified]** Diet in detail: summaries describe surface-film algae, spores, bacteria and decaying matter, and Wikipedia says only "scavenger" [S74]. |
| ***Sminthurides aquaticus*** (alternative) | A globular water-surface springtail: females up to ~1.0 mm, males 0.3–0.5 mm [S76] | **[Observed]** The male grips the base of the female's antennae with clasping antennae and can be carried for days [S76]. A two-character option (carry, be carried) **[Proposal]**. Globular springtails jump hardest of all measured springtails (see 0.7) [S75]. **[Unverified]** at Simmelried. |

**The collophore.** Springtails carry a ventral tube, the **collophore**, on
the first abdominal segment. In *P. aquatica* it is hydrophilic and has been
linked to water uptake, excretion and adhesion to the water surface
(Noble-Nesbitt 1963, as cited in [S74]). In the semiaquatic *Isotomurus
retardatus*, the collophore anchors the animal to the water before a jump and
catches the water on landing; together with body angle and furcula stroke it
sets the jump's direction [S40]. The function is described differently by
different sources **[Unverified in detail]**.

**Movement model [Proposal]:** a six-legged walker on a deformable floor,
plus a ballistic jump. On the film it walks slowly; the jump is its only fast
move (see the movement section and [`movement.md`](movement.md)).

### 0.3 Enemies and threats

| Threat | Size | How it hunts or harms | How the player could evade or counter | Evidence |
| --- | --- | --- | --- | --- |
| **The rove beetle *Stenus*** | About 5 mm (inferred: 400–750 mm/s is given as 80–150 body lengths/s) [S77] | **The harpoon.** Its labium shoots out by **haemolymph pressure in 1–3 ms** (*S. comma*); paired adhesive pads on its tip stick to the prey, and it is withdrawn at once, bringing the prey to the mandibles [S78]. *S. comma* used the labium in almost half its attacks on three springtail species [S78]; a popular summary of the *Stenus* literature lists *P. aquatica* among the prey studied [S78]. The labium works less well on **large springtails, or those covered in scales or setae**, which slip off the pads; against them the beetle lunges with its mandibles [S78]. In standard trials most *Stenus* species caught springtails much more successfully with the labium, which lets a slow-reacting predator catch fast-escaping prey [S78]. **The skim.** On water *Stenus* releases surfactants from its pygidial glands; the lowered surface tension behind it pushes it forward (Marangoni propulsion) at **400–750 mm/s** for *S. comma* [S77]. | **[Observed]** Skimming is an escape and a way back to the bank, not a hunting move [S77]. **[Proposal]** A duel of reaction times: the labium (1–3 ms) against the springtail's jump (~1.7 ms take-off in a globular species [S75]). Jump at the first sign of the strike, not after. Being large helps. Use skimming as the beetle's exit or as a surface-wrecking hazard: its surfactant wake flattens the film **[Departure if it is shown hunting by skimming]**. | S77, S78 |
| **Sundew** (*Drosera rotundifolia*, *D. intermedia*) | Leaves of a few mm to cm; glue droplets on stalked tentacles | A sticky trap. Collembola were found more often on *D. rotundifolia*, whose leaves lie flat on the moss, than on the erect leaves of *D. intermedia*, which caught more flying insects [S79]. At one English bog, Collembola were **5.8–16.5%** of sundew prey [S79]. | **[Proposal]** A static minefield on the lawn edge. Touch one droplet and you stick; struggling brings neighbouring tentacles in. A jump can carry you onto a leaf: aim matters. **[Unverified]** tentacle timing for *D. rotundifolia*: show the bend as slow (seconds to minutes), never a snap. | S79 |
| **Water striders** (Gerridae) | ~1 cm and up | They find prey by the ripples it makes in the surface film and grasp it with the front legs; they mostly eat insects that fall onto the water and struggle [S80]. A strider eating a springtail has been photographed [S80]. | **[Proposal]** Ripples are your signature: walking or struggling broadcasts your position. Hold still to vanish; jump to relocate. **[Unverified]** how often striders take springtails; diet studies name flies, bugs and Hymenoptera [S80]. | S80 |
| **Juvenile spiders** (wolf spiders *Pirata*, the raft spider *Dolomedes fimbriatus*) | Juveniles a few mm | *Pirata piraticus* lives on the sunlit surface of Sphagnum bogs with small ponds [S81]. In moorland, *Dolomedes fimbriatus* juveniles of 6–9 mm took the largest prey relative to their size [S81]. | **[Proposal]** Ambushers at the lawn edge: the open film is safe from them, the moss is not. **[Unverified]** springtails in the diet of these species in bogs. | S81 |
| **Raindrops** | Drops of 4–100 mg [S82] | A drop is 2–50 times a mosquito's mass, yet mosquitoes survive being hit by moving with the drop rather than resisting it, at accelerations of 100–300 g [S82]. | **[Proposal]** Rain is a weather hazard: drops crater the film and throw you. Being light and unwettable, you bounce and resurface (the air layer [S74]). **[Departure/Unverified]** No study of springtails under raindrops was found; the mosquito work is an analogue only. | S82 |

### 0.4 Environments

| Sub-habitat | Physical rules | Hazards |
| --- | --- | --- |
| **Open pool film** | A level, elastic floor. Walking dimples the surface; ripples spread from every move. Sky reflections. | Water striders, rain, the *Stenus* wake |
| **Meniscus at a stem** | The film curves up against moss stems and sedge leaves: a slope to climb, and a place to hold still. | Being pinned; the climb costs time |
| **Sphagnum lawn edge** | Wet moss tips rising out of the water; the way into Level 1. | Spiders, *Stenus* hunting on land |
| **Sundew patch** | Flat rosettes on the moss; glistening tentacles. *D. rotundifolia* sits higher and drier; *D. intermedia* lower and wetter [S79]. | Glue |
| **Rain** | Drops crater and refill the film. | Being thrown or swamped |

### 0.5 Food and resources

**[Unverified species-level]** Grazing on the surface film: algae, fungal
spores, bacteria and decaying matter [S74]. **[Proposal]** Pollen and spores
gather in the meniscus corners; that is where food and danger (the lawn edge)
meet.

### 0.6 Zoom transition to Level 1

- **The visible thing:** the springtail lands on the Sphagnum lawn edge. On
  the capitulum beside it, a speck moves: a *Limnozetes* mite.
- **Handoff [Proposal]:** a jump goes wrong (rain, a *Stenus* strike) and the
  springtail lands in the moss. The camera follows it down onto a capitulum,
  the lens changes from a hand lens to a stereo microscope, the field shrinks
  from centimetres to about 1 cm, and the speck becomes the mite. The
  springtail stays in Level 1 as a giant neighbour.

### 0.7 Gameplay possibilities [Proposal]

- **Furcula jumps:** the dash. Charge a direction, release, and accept a
  partly random landing. Holding the collophore anchor makes the take-off
  more directed; landing upright depends on the aerial "U" pose [S40].
- **Surface-film walking:** every step makes ripples (stealth versus speed).
- **Meniscus climbing:** reach the moss edge by climbing the curved film at a
  stem.
- **Set piece: the *Stenus* harpoon.** Read the beetle's approach, jump on the
  strike. A slow-motion window sells the 1–3 ms strike **[Departure: time
  slowed, and labelled]**.
- **Sundew field:** cross the lawn edge, choosing landings away from glue.
- **Departures to label:** slowed time in the duel; any steering in mid-air.

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
| **Rove beetle** (Staphylinidae: *Stenus*, *Othius*; *Stenus* is Level 0's harpooner, see 0.3) | 7–14 mm as given for the trial beetles; *S. comma* is nearer 5 mm (inferred, 0.3): a giant, bigger than the whole field either way | Bites and crushes. *Othius punctulatus* cracked chemically undefended box mites but not equal-sized Phthiracaroidea; *Stenus juno* cracked neither [S39]. | **[Proposal]** A screen-filling set piece, shown only as legs and mandibles. You survive by armour, or by slipping into a leaf axil narrower than its head. | S39 |
| **Springtails** (Collembola; Level 0's protagonist, now a giant) | ~0.2–2 mm | **Not a predator.** A competitor and a living hazard: its furcula launches it unpredictably, and it can knock small animals aside. Semiaquatic springtails control take-off direction, right themselves in mid-air in ~20 ms, and land on water by adhesion [S40]. | **[Proposal]** Its sudden jumps scatter food and can tip the mite off a leaf edge. Springtails also attract predators (*Stenus* and gamasids hunt them [S38, S78]): being near them is risky. | S40, S38, S78 |
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

## Level 3: The hollow pool (*Paramecium bursaria*)

**Correction.** An earlier draft offered *Amoeba proteus* as an alternate
protagonist. It is the tardigrade's size, so with it the step from Level 2 to
Level 3 was one of habitat, not of magnification (see the overview). The
protagonist is ***P. bursaria***; *A. proteus* is a **giant threat**.

### 3.1 Scale and optics

- **Protagonist size:** *Paramecium bursaria* 85–150 µm long, 40–70 µm wide
  [S27]. The giant *Amoeba proteus* is 160–760 µm [S29], up to about five
  times longer, and can fill most of the 0.9 mm field.
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

### 3.2 Playable protagonist: *Paramecium bursaria*

| Aspect | What is real | Sources |
| --- | --- | --- |
| **Movement** | A ciliary swimmer on a helical path. On contact it performs the **avoiding reaction**: a ciliary reversal (back up), a turn, and forward again [S08]. Cruising *Paramecium* swim on the order of **1 mm/s** (measured after an escape in *P. tetraurelia*) [S85]. | S08, S85 |
| **Escape gaits** | *Paramecium* has three: normal swimming; a faster, synchronised ciliary gait for stronger threats; and for a life-threatening stimulus, a **trichocyst "jump"**: about 8–10 trichocysts, each ~40 µm long, fire toward the threat in under 3 ms, and the cell reaches **~10 mm/s within 5 ms**, slowing again in ~10 ms [S85]. Spent trichocysts take **several hours** to regenerate [S85]. Local trichocyst discharge is a real escape from *Dileptus* [S09]. | S09, S85 |
| **Symbionts and light** | Hundreds of *Chlorella* (5–6 µm) make it green [S27]. It **gathers in light**: at a light–shade border it performs the avoiding reaction on entering the shade (a step-down photophobic response) and so stays in the light. Cells without algae do not photoaccumulate, and blocking photosynthesis stops it, so the symbionts drive it [S88]. Photoaccumulation is stronger by day, and swimming slows as light gets brighter [S88]. | S27, S88 |
| **Costs** | The avoiding reaction is a short organised manoeuvre, not a dash. Trichocysts are a local defence, not ammunition [S09, atlas powers], and a spent cell is defenceless for hours [S85]. A parasite, *Holospora elegans*, can infect its micronucleus [S27]. | S09, S27, S85 |

**Why *P. bursaria* rather than *P. caudatum*:** it is recorded at
Simmelried and very common there [S27]. Its algal symbionts tie it to
light [S27, S88]. That gives **light as a resource** that carries into
Level 4. **[Unverified]** The escape-gait numbers are from *P. tetraurelia*
[S85]; *P. bursaria* is assumed to behave similarly.

### 3.3 Enemies and threats

| Threat | Size | Mechanism | Evade or counter | Evidence |
| --- | --- | --- | --- | --- |
| ***Didinium nasutum*** | 80–200 µm long [S28] | Mainly eats other ciliates. It **swallows prey much larger than itself**, including *Paramecium* [S28]. On contact, its proboscis fires **pexicysts**, which stick, and **toxicysts**, which penetrate and anchor. Cytoplasmic streaming then reels the prey into the mouth [S56]. Recorded regularly at Simmelried [S28]. | **[Proposal]** It must touch you first, so read its fast, straight approach and reverse early [S08]. The trichocyst escape is a real, limited option [S09]. **[Unverified]** whether trichocysts work as well against *Didinium* as against *Dileptus*. | S28, S56 |
| ***Amoeba proteus*** (the giant) | 160–760 µm [S29]: up to five times the protagonist's length | An amoeboid crawler on the bottom and on plants. It moves by pseudopods and cytoplasmic streaming [S04, S06]; particles inside a motile *A. proteus* drift at only about **0–3 µm/s** [S86]. It surrounds prey with pseudopods into a **food cup** [S05]. *A. proteus* feeding on *Paramecium aurelia* was studied by Salt (1968) [S87]. Recorded at Simmelried [S29]. | **[Proposal]** The amoeba is hundreds of times slower than you, so it is not a chase but a **trap of terrain**: it creeps across the substrate, and the danger is resting, feeding or being cornered against it. A trichocyst jump breaks a closing cup if you fire before it seals **[Unverified]**. Its own pseudopod lunge is its "dash" (see movement). | S04–S06, S29, S86, S87 |
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
- **The giant *Amoeba proteus*** engulfs smaller protists, algae and
  ciliates [S04, S05, S87]: it competes with you for nothing and eats you if
  it can.

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
- **The amoeba floor:** feed on the detritus floor while a giant *A. proteus*
  spreads across it. Its cup closes slowly, but resting too long is fatal
  [S05, S86].
- **The trichocyst budget:** one jump per long cooldown, since real
  trichocysts take hours to regenerate [S85]. Spend it on *Dileptus* or the
  amoeba's cup, not on a bump.
- **The heliozoan in darkfield:** toggling to darkfield is a "sense" that
  reveals axopods. It costs a short pause, while the brightfield view keeps
  them faint.
- **Light management:** keep *P. bursaria*'s symbionts lit without straying
  into open, exposed water.
- **Departures to label:** any duel pacing that makes extrusome discharge
  repeatable on a cooldown (real regeneration takes hours [S85]); the speed
  of trap reset if shortened.

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
the moment the flagellum stops. *E. gracilis* swims at about **50–100 µm/s**
while rolling about its long axis at 1–2 Hz [S105]; no speed was found for
*Trachelomonas* **[Unverified]**. It **steers by light**: phototaxis toward
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

### 4.6 Zoom transition to Level 5

- **The visible thing:** the **bacterial film** under the periphyton, rods
  and dots that show only as texture at 400×; or, if the level was played in
  the trap, the dark detritus at the bottom of the pool below it.
- **Handoff [Proposal]:** the flagellate settles on the biofilm or sinks
  toward the mud. The camera holds on a texture of moving dots, and one of
  them moves differently: it swims straight down and keeps its heading, as if
  on a rail. The objective clicks to 100× oil. The new protagonist is a
  **magnetotactic bacterium** [S89] (or, for the *Bdellovibrio* chapter, a
  moving dot that suddenly stops against a larger rod [S65]).

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

## Level 5: The sediment and the biofilm (bacteria)

### 5.1 Scale and optics

- **Protagonist sizes:** magnetotactic bacteria are rods, spirilla and cocci
  of a few µm **[Unverified range for bog forms]**. Their magnetosomes, the
  magnetic crystals they build, are **35–120 nm** long and lie in one or more
  chains [S89]. *Bdellovibrio* cells measured about 0.2–0.5 µm wide and
  0.5–2.5 µm long [MicrobeWiki, via S65].
- **Field:** 180 µm at 100× oil / 1000×. Resolution ≈ 0.2 µm, at NA 1.25–1.4
  [S17]. Depth of field ≈ 0.2 µm [S18]. A 2 µm cell is about 1% of the field.
- **What the light microscope shows, honestly:** a cell 0.5 µm wide is two or
  three resolution units across: a **dash**. Flagella (the *Bdellovibrio*
  filament is ~11–12 nm thick [S93]) and magnetosomes (35–120 nm [S89]) are
  below the resolution limit and **cannot be seen**. What *is* visible is
  **behaviour**: paths, speeds, reversals, a whole population turning when a
  magnet is turned, and a prey rod rounding into a sphere (the bdelloplast)
  [S65, S93].
- **The look [Proposal]**, in three honest layers:
  1. **Phase contrast as the play view.** Dark or bright dashes with halos;
     the halos are optical artefacts [atlas visual-styles]. Swimming tracks
     drawn as fading trails, the way bacterial motion is recorded in the lab
     (Berg's tracking microscope followed single cells in 3D [S95]). The
     trail is an overlay, labelled as one.
  2. **Fluorescence as a "sense".** Cells as glowing points on black, as
     with stained or labelled cells. It is useful inside a biofilm, where
     phase contrast is a muddle. The glow is larger than the cell because
     resolution does not change [S17]; colours are labels.
  3. **Electron-microscope insets for anatomy.** The magnetosome chain, the
     flagellum and the inside of a bdelloplast come from transmission EM and
     cryo-electron tomography of fixed or frozen cells [S20, S21, S93]. Show
     them as freeze-frame cards ("frozen cell, not live"), never as the live
     camera.
- **[Departure, if chosen]:** playing the level in an SEM-like 3D view would
  show what no live microscope shows [S20]. If the owner wants that look, it
  must be labelled on screen as an illustration.

### 5.2 Playable protagonists

| Candidate | Movement | Real abilities and costs | Sources |
| --- | --- | --- | --- |
| **Magnetotactic bacterium** (a *Magnetospirillum*-like spirillum or a coccus from the pool mud): **recommended** | Swims along magnetic field lines. Its magnetosome chain is a built-in **compass needle**: the crystals are in the single-domain size range, so the chain is a permanent magnet that turns the whole cell passively [S89]. It swims forward or backward along the line: in *Magnetospirillum gryphiswaldense*, aerotaxis decides when it **reverses**, and its swimming polarity depends on the same sensory pathway [S90]. | **[Observed]** *M. gryphiswaldense* swims at **20–60 µm/s** (mean 41.6 µm/s) in the lab; it reverses most often without oxygen (0.126 per second) and least at 5% oxygen (0.055 per second) [S90]. Magnetotactic cocci are faster, above 100 µm/s, and one two-bundled coccus swims faster than 500 µm/s [S90]. Magnetotactic bacteria navigate toward the **oxic–anoxic transition zone** of layered water and sediment [S89, S90]. Living cells occur in acidic peat soils at pH 4.3–5.7 [S91]. **Cost:** the field locks its heading. It cannot steer sideways, only choose forward or back. | S89, S90, S91 |
| ***Bdellovibrio*** (the hunter's chapter) | A single sheathed polar flagellum drives fast swimming; on surfaces it **glides** slowly to scout for prey [S92]. | **[Observed]** Up to **160 µm/s** in strain HD100 (35 µm/s in the lab strain 109J), about 100 body lengths a second [S92]. Motility helps it find prey in liquid but is not needed to enter prey [S92]. It attaches with type IV pili and an **attachment plaque**, takes its flagellum into the prey's periplasm and breaks it down, enters through a sealed **portal**, rounds the prey into a **bdelloplast**, grows inside it and leaves as two or three progeny (in the minicells studied) [S93]. The cycle takes about four hours in the lab **[Unverified exact]**. It eats only **Gram-negative** bacteria [S94]. | S65, S92, S93, S94 |

**Recommendation [Proposal]:** play the magnetotactic bacterium as the main
chapter: its magnetic "rail" and oxygen hunt are a movement idea no other
level has. Offer *Bdellovibrio* as the second chapter, where the hunt is
yours. Magnetotactic bacteria are Gram-negative, so a *Bdellovibrio* hunting
one is plausible **[Unverified: no study of *Bdellovibrio* attacking
magnetotactic bacteria was found]**.

### 5.3 Run and tumble: the control scheme

**[Observed, *E. coli*]** A bacterium with several flagella swims in
**runs** of about 1 s, broken by **tumbles** of about 0.1 s that leave it
pointing in a new, roughly random direction (on average ~60–70° away); run
speed is ~20 µm/s, between ~10 and 30 µm/s depending on strain [S95]. During
a run the flagellar motors turn counter-clockwise and the filaments form one
bundle. A tumble starts when one or more motors switch to clockwise and their
filaments leave the bundle; the switch is driven by the signalling protein
CheY-P binding the motor [S95].

**How the tumble bias encodes chemotaxis.** The cell cannot steer. It
compares the attractant concentration now with a few seconds ago. When
things improve, CheY-P falls, tumbles become rarer, and runs get longer; when
things get worse, it tumbles at the normal rate. The result is a **biased
random walk**: runs up the gradient last longer than runs down it [S95].

**The control scheme [Proposal]:**

- The cell runs on its own. **B (tumble)** throws a new random heading. The
  skill is *when* to tumble, read from a gradient display (oxygen, food,
  autoinducer), exactly the cell's own "decision".
- **A (dash)** is a sprint run (see movement); **X** attaches or binds.
- **For the magnetotactic protagonist:** "tumble" becomes **reverse**, and
  the heading stays locked to the field line [S90]. The oxygen gradient is
  vertical, so the puzzle is timing reversals to hold the transition zone.
- **[Departure]** Run-and-tumble is *E. coli*'s scheme. Spirilla such as
  *Magnetospirillum* run and reverse [S90], and *Bdellovibrio*'s search
  pattern was not found **[Unverified]**. Any stick input that biases the new
  heading after a tumble is a departure; offer a "purist" setting without it.

### 5.4 Enemies and threats

| Threat | Size | Mechanism | Evade or counter | Evidence |
| --- | --- | --- | --- | --- |
| **Protist grazers** (flagellates, ciliates: the earlier protagonists as giants) | 10–150 µm | Grazing is **size-selective**: medium-sized bacteria are eaten most, while filaments and microcolonies can be too big to swallow [S96]. Grazing mortality was lowest for large cells (>0.5 µm³) and for **small, highly motile** cells [S96]. *P. bursaria* sweeps bacteria into its oral groove [S27]. | **[Observed]** Speed protects: motile cells are grazed less [S96]. **[Proposal]** The oral current of a passing *P. bursaria* is a moving whirlpool; sprint across it. Join a microcolony to be too big. | S27, S96 |
| **Amoeba food cups** | 10–760 µm | Pseudopods surround the prey [S05]. | **[Proposal]** A wall that closes slowly; outrun it in liquid, but not when stuck in the biofilm. | S05 |
| ***Bdellovibrio*** (for the magnetotactic protagonist) | ~1 µm | Faster than you (up to 160 µm/s against your 20–60 µm/s) [S90, S92]. It collides, attaches with pili, builds the attachment plaque and enters [S93]. On surfaces it glides to scout [S92], so the biofilm is not a full refuge. | **[Proposal]** You cannot outrun it, so out-turn it: reverse at the last moment, or stay in moving water where it must swim to find you. Contact before the plaque forms is survivable **[Unverified]**. | S92, S93 |
| **Phages** (Level 6 foreshadowed) | ~0.2 µm | They drift until they hit a receptor, then inject DNA [S99]. | **[Observed]** Defences are the cell's own: CRISPR and restriction-modification [S101, S102]. **[Proposal]** "Immunity cards" carried from past infections. | S99, S101, S102 |
| **The wrong oxygen** | Habitat | Magnetotactic bacteria seek the transition zone; reversals depend on oxygen [S90]. | **[Proposal]** Too high or too low drains the cell; reversal timing holds the band. | S90 |

### 5.5 Environments

| Sub-habitat | Physical rules | Hazards |
| --- | --- | --- |
| **Mud surface of the hollow pool** | A vertical oxygen gradient: oxygen above, none a short way down. Field lines dip into the mud; the transition zone is the target [S89, S90]. | Grazers above, no oxygen below |
| **Biofilm under the periphyton** | Matrix, channels, and gradients of oxygen and nutrients [S16]. Diffusion is slower inside. | Gliding *Bdellovibrio* [S92]; amoebae |
| **Microcolony** | A clump of cells too large to graze [S96]. | Crowding; phage spread |
| **Inside a bdelloplast** (*Bdellovibrio* chapter) | A rounded prey cell; the predator grows in its periplasm [S93]. Shown as an EM inset. | — |

### 5.6 Food and resources

- **Magnetotactic bacterium:** the right oxygen level, nutrients from the
  sediment, and **iron** for its magnetosomes **[Unverified: metabolism
  differs between groups and was not researched]**. **[Proposal]** A
  "chain" meter: a cell with a weak chain aligns poorly.
- ***Bdellovibrio*:** the prey cell's contents, digested from inside [S65,
  S93].

### 5.7 Biofilm by quorum sensing

**[Observed]** Bacteria release small signal molecules, **autoinducers**. As
the population grows, the signal builds up, and above a threshold the whole
population changes gene expression [S97]. In *Pseudomonas aeruginosa*,
biofilms formed **grazing-resistant microcolonies** when a flagellate grazer
was present, and microcolonies and toxins together let the biofilm resist
grazing [S96].

**[Proposal]** A task: gather enough cells in one spot (the autoinducer
display fills), then the colony switches to biofilm mode, a matrix that
grazers cannot clear. **[Departure]** One cell "leading" the colony; real
quorum sensing has no leader.

### 5.8 Zoom transition to Level 6 (optional)

- **The visible thing:** nothing, and that is the point. A host cell stops
  swimming, swells and bursts; the particles that leave it are too small to
  see.
- **Handoff [Proposal]:** a caption marks the **end of light microscopy**
  [S17]. The view changes style completely, to a frozen, grey cryo-EM image
  that then gains colour as a molecular illustration. The player is one of
  the released particles.

### 5.9 Gameplay possibilities [Proposal]

- **Gradients:** find and hold the oxic–anoxic band by timing reversals
  (magnetotactic) or tumbles (run-and-tumble).
- **Biofilm by quorum sensing:** build a colony big enough to resist grazers.
- **The *Bdellovibrio* hunt:** as the magnetotactic bacterium, survive it;
  as *Bdellovibrio*, hunt: sprint, collide, attach, enter, grow, burst.
- **The grazer gauntlet:** a *P. bursaria* (Level 3's hero) passes overhead
  as a whirlpool.
- **Departures to label:** steering bias after a tumble, quorum sensing as a
  player decision, any SEM-like play view.

---

## Level 6 (optional): The virus (bacteriophage)

### 6.1 Scale and the look

- **The protagonist:** a tailed phage modelled on **T4**: a prolate head
  about **120 × 86 nm**, a contractile tail ~100–140 nm long (sources
  differ), a hexagonal baseplate, and **six kinked long tail fibres of
  ~160 nm** [S98]. Its genome is ~169 kbp [S98]: about 57 µm of DNA
  (computed at 0.34 nm per base pair), some 500 times the head's length,
  packed inside.
- **The field:** one host cell, 1–2 µm: a wall ten to twenty times the
  phage's length.
- **No microscope view:** the best light microscope resolves ~0.2 µm [S17];
  a phage head is ~0.1 µm. Real images of phages infecting cells come from
  **cryo-electron tomography** of frozen cells: Hu et al. used it to catch T4
  at successive stages of infection [S99], and Kaplan et al. to catch
  *Bdellovibrio* [S93].
- **The look [Proposal]:** a molecular illustration in the manner of David
  Goodsell's watercolours (crowded, colour-coded molecules), grounded in the
  shapes from cryo-EM. **[Departure]** Colour, continuous motion and the
  uncrowded view are all invented; cryo-EM gives grey, frozen snapshots
  [S99]. Label the level as an illustration.
- **[Departure]** T4 infects *E. coli*. It stands in for a T4-like tailed
  phage of a bog bacterium (perhaps the Level 5 hero). Phages of
  magnetotactic bacteria were not researched **[Unverified]**.

### 6.2 Movement: Brownian motion, not steering

**[Observed]** A phage has no motor. It moves by diffusion until it touches a
host [S100].

- **Diffusion coefficient:** for T4, about **4 µm²/s** (2.4 × 10⁻⁶ cm² per
  minute, from Stent 1963 as quoted in [S100]); a 1966 thesis quotes
  8 µm²/s as the accepted value [S100]. **Illustrative check:** the
  Stokes–Einstein relation D = kT / (6πηr) for a sphere of radius 50 nm in
  water at 20 °C gives D ≈ 4.05 × 10⁻²¹ J / (6π × 1.0 × 10⁻³ Pa·s ×
  5 × 10⁻⁸ m) ≈ **4.3 µm²/s**, in line with the measured value.
- **Time to cross a distance** (mean-square displacement ⟨r²⟩ = 6Dt in three
  dimensions, D = 4 µm²/s):

  | Distance | Time | What it means |
  | --- | --- | --- |
  | 1 µm | ~0.04 s (~0.12 s along one axis) | Across a host cell: fast |
  | 10 µm | ~4 s | To the next cell in a biofilm |
  | 100 µm | ~7 min | Half the Level 5 field |
  | 180 µm | ~22 min | The whole Level 5 field |

  Diffusion is quick over short distances and hopeless over long ones, since
  time grows with the square of distance.
- **Orientation:** the rotational diffusion of the same 50 nm sphere,
  D_r = kT / (8πηr³), is about 1.3 × 10³ rad²/s, so its orientation is
  forgotten within about a millisecond (illustrative). The phage cannot hold
  a heading, even for a moment.
- **Encounter odds:** T-even phages adsorb with a rate constant of about
  **2.4 × 10⁻⁹ ml/min** [S100]. The diffusion-limited estimate k = 4πRD
  for a 1 µm target and D = 4 µm²/s gives about 3 × 10⁻⁹ ml/min, which
  agrees. **So host density decides everything:** at 10⁶ host cells per
  ml, the mean time to hit a host is about 1/(kN) ≈ 7 hours; at 10⁸ per ml,
  about 4 minutes (illustrative). In a gel, T4 diffused more slowly
  (apparent D 4.2 µm²/s, or 2.4 µm²/s with dead host cells in the gel)
  [S100].
- **On the cell surface:** before infection, most T4 long tail fibres are
  folded back against the virion. Not all of them engage before the short
  fibres bind, and the virion may **walk randomly across the cell surface**
  to find a good site [S99].

### 6.3 The infection [Observed, T4]

1. **Reversible binding:** long tail fibres bind lipopolysaccharide or the
   outer-membrane protein OmpC on *E. coli* [S99].
2. **Surface walk:** fibres bind and let go as the virion moves [S99].
3. **Commitment:** short tail fibres bind irreversibly; the baseplate changes
   from a hexagon to a star; the **tail sheath contracts** and drives the
   tail tube through the cell envelope to the inner membrane [S98, S99].
4. **Injection:** the DNA moves into the cell. Membrane fusion does not need
   the host's proton motive force, but moving the genome in does [S99].

### 6.4 Enemies and hazards

| Hazard | Mechanism | What the player can do | Evidence |
| --- | --- | --- | --- |
| **CRISPR-Cas** | An adaptive immune system: the host stores short pieces of past invaders' DNA (spacers) and cuts DNA that matches. Present in roughly 40% of bacterial and 85–90% of archaeal genomes (figures vary by dataset); new spacers are rarely acquired in most species [S101]. | **[Proposal]** A host with a matching spacer is a dead end. Progeny that differ at the target escape **[Unverified here: point-mutation escape is standard biology but was not sourced]**. | S101 |
| **Restriction-modification** | The host cuts foreign DNA at short recognition sites and protects its own by methylation. R-M systems are widespread in bacterial genomes and nearly absent from phages [S102]. | **[Proposal]** The "passport": phage DNA copied in a host is marked with that host's methylation and passes the same kind of host next time **[Unverified here: host-controlled modification was not sourced]**. | S102 |
| **Clay and particles** | Phages sorb to clay minerals, mainly by hydrophobic interaction; T-2 sorbed most among three phages tested, and hectorite most among the clays [S103]. | **[Observed]** Sorbed phages are partly **protected from UV**: free PBS1 lost about ten-fold infectivity in 5 minutes while clay-bound phage held steady from 1 to 10 minutes [S103]. **[Proposal]** A trap and a shelter. In a bog, peat and humic particles take clay's role **[Unverified]**. | S103 |
| **UV** | Sunlight damages phage DNA. In humic lakes UV-B is absorbed within centimetres: 10% of surface UV-B remained at 1.5 cm in the most humic lake, against 55 cm in the clearest [S104]. | **[Proposal]** Depth is safety; the Level 0 surface film is the danger zone. | S104 |
| **The wrong host** | No receptor, a dead cell, a cell already infected. | **[Proposal]** A wasted commitment: the irreversible bind is the level's one big decision. | S99 |

### 6.5 Gameplay: tilting probabilities, not steering [Proposal]

- **No steering, no dash.** The phage drifts. The screen shows **odds**
  (an encounter-probability field, the host density, the UV depth), not a
  direction arrow.
- **B: fibres out or folded.** Extended fibres widen the capture zone but
  stick to particles; folded fibres drift cleanly. **[Departure]** A real
  phage does not choose; the fibres' state follows conditions.
- **X: commit.** The irreversible bind and sheath contraction, then
  injection. One use per particle.
- **Lineage play:** a burst releases many particles. The player picks which
  one to follow, trading CRISPR and R-M risks (immunity cards, methylation
  passports) against host density.
- **Departures to state on screen:** all agency (the phage makes no
  decisions; the player's choices stand for chance); colour and continuous
  motion in a cryo-EM-derived style; T4 standing in for a bog phage; and time
  compression, since an encounter may take hours [S100].

---

## Movement: dash, attack and defence at every level

The owner's rule: the game is **about movement**. Some encounters are
escapes (run, block, tumble, fight back) and some are chases, so the dash
(A) is the key verb, with attack/eat on X and defend on B
(`micro/prototypes/CONTROLS.md`). Each dash is the creature's **fastest real
move**, or a labelled stretch of one. Full detail, chase/flee dynamics and
time scaling per level are in [`movement.md`](movement.md).

| Level | Creature | Dash (A): the real fastest move | Attack / eat (X) | Defend / escape (B) |
| --- | --- | --- | --- | --- |
| 0 | *Podura aquatica* | **Furcula jump**: take-off ~1 m/s in ~1.7 ms (globular springtail) [S75]; a semiaquatic springtail ~0.7 m/s, up to 48 body lengths [S40, S75] | Graze the surface film [S74] | Hunker in the meniscus; resurface in its air layer [S74] |
| 0 | *Stenus* (enemy) | **Skimming** at 400–750 mm/s (escape only) [S77] | **Labium harpoon**, out in 1–3 ms [S78] | — |
| 1 | *Limnozetes* | **Scramble**: oribatids walk only ~0.1–5.7 cm/min in lab studies [S83] **[stretch]** | Chelicerae: graze; nip back **[Departure]** | Hunker; ptychoidy (box mite) [S39] |
| 2 | Tardigrade | **Scramble**: 79–264 µm/s (mean 163 µm/s, ~0.5 body lengths/s), up to ~2 body lengths/s [S84] | Stylets pierce cells [S02] | Brace with claws; tun [S03] |
| 3 | *P. bursaria* | **Trichocyst jump**: ~10 mm/s within 5 ms, decays in ~10 ms; hours to rearm [S85] | Oral current feeding [S27] | Avoiding reaction (reverse) [S08] |
| 3 | *A. proteus* (giant) | **Pseudopod/bleb lunge**: streaming 0–3 µm/s [S86]; bleb bursts 10–20 µm/s in *Entamoeba* [S86] **[stretch]** | Food cup [S05] | Let go or egest **[Proposal]** |
| 4 | *Trachelomonas* | **Flagellar sprint**: *Euglena* 50–100 µm/s [S105] **[Unverified for *Trachelomonas*]** | Photosynthesis (light) [S13] | The lorica [S34] |
| 5 | Magnetotactic bacterium | **Run**: 20–60 µm/s; cocci >100, one >500 µm/s [S90] | Bind / attach | **Reverse** (tumble) [S90, S95] |
| 5 | *Bdellovibrio* | **Run**: up to 160 µm/s, ~100 body lengths/s [S92] | **Attach and bore** [S93] | Tumble or glide away **[Unverified]** |
| 6 | Phage | **None**: Brownian motion only, D ≈ 4 µm²/s [S100] | Commit and inject [S99] | Fibres folded or out **[Departure]** |

**A cross-level finding:** in body lengths per second, the fastest movers are
the smallest and the largest: *Stenus* skims at 80–150 body lengths/s [S77]
and *Bdellovibrio* swims at ~100 [S92], while the mite and the tardigrade
manage about two at most [S83, S84]. And the time scales run opposite ways:
Level 0's duel (a 1–3 ms harpoon against a ~1.7 ms jump [S75, S78]) needs
**slow motion**, while Levels 1 and 2 (walkers at a fraction of a body length
per second) need **fast-forward**. Both are **[Departures]** to be stated.

---

## Cross-level: one world at nested scales

### Creatures at more than one scale

| Creature | Its level | Where it reappears | How it looks there |
| --- | --- | --- | --- |
| *Podura aquatica* (springtail) | 0 | **Level 1** | A 1.5 mm giant that lands without warning on the capitulum, five times the mite's length |
| *Stenus* | 0 | **Level 1** | Legs and mandibles only, crossing a field smaller than the beetle |
| *Limnozetes* mite | 1 | **Level 2**, same size as the tardigrade (~300 µm) | A dark, armoured walker crossing the film, a quiet reminder that L1→L2 changed the medium, not body size |
| Tardigrade (protagonist) | 2 | **Level 3**, at the pool edge | A clawed, translucent giant (250–500 µm in a 0.9 mm field) |
| *Milnesium* | 2 | **Level 3** | Up to 1.2 mm [S42]: it fills more than the whole field |
| Bdelloid rotifer | 2 | **Level 4** | Its corona's current, a hazard from off-screen |
| *Utricularia* bladder | 3 | **Level 2** (a dark shape beyond the leaf edge) and **Level 4** (inside) | 0.5–3 mm bladders [S52] |
| *Amoeba proteus* | 3 (giant threat) | **Level 4** and **Level 5** | 160–760 µm [S29]: a moving wall at 400×; at 1000× only an edge of the field, its food cup a landscape |
| *Paramecium bursaria* | 3 | **Level 4** and **Level 5** | A huge, green, ciliated body, perhaps inside the trap; at Level 5 its oral current is a whirlpool sweeping bacteria in [S27, S96] |
| Chlorella symbionts (5–6 µm) | — | **Level 3** inside *P. bursaria*, **Level 4** free | The same algal type, seen at both scales [S27] |
| Chytrids / fungi | 2–4 | Every wet level | A recurring kind of threat: a spore, an attachment, an injection |
| *Bdellovibrio* | 5 | **Level 4** (as texture) | A fast dot in the biofilm, invisible as an individual at 400× |
| The Level 5 bacterium | 5 | **Level 6** | The host: a wall 10–20 times the phage's length |
| Phages | 6 | **Level 5** | Invisible; known only by their effect, a host that stops and bursts |

### Keeping one coherent habitat

- **One place:** the Simmelried-type bog, with a gradient from the **pool's
  surface film** (Level 0) and **hummock** (Level 1) through **lawn**
  (Level 2) to **hollow pool** (Level 3), the **periphyton and trap**
  (Level 4), and the **mud and biofilm** at the bottom (Level 5); Level 6's
  phages are in the water throughout [S26, S55, S68, S79, S89].
- **One weather:** drying and rewetting carry across all levels: rain on the
  film in Level 0, the dew in Level 1, the retreating film in Level 2, the
  shrinking pond in Level 3, and the trap's sealed fluid in Level 4 [S26].
  Rain and drying also stir and expose the mud of Level 5 **[Proposal]**.
- **One light:** daylight from above. Levels 0 and 1 show it as reflected
  light; Levels 2–5 show it as transmitted microscope light (and Level 5 as
  fluorescence too). **[Departure]** The microscope's light is the observer's
  illumination, not the sun. Light as a resource (Levels 3 and 4) and as a
  hazard (UV in Level 6, strongest at the Level 0 surface [S104]) should
  still be modelled as daylight.
- **One oxygen gradient:** oxygen from the air at the Level 0 surface, low in
  the Level 4 trap [S54], and running out in the Level 5 mud, where the
  magnetotactic bacteria hold the boundary [S89, S90].
- **One rule for movement:** every level's dash is the creature's real
  fastest move or a labelled stretch of it (see the Movement section).
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
9. **Speeds.** Now collected for most creatures (see [`movement.md`](movement.md)).
   Still missing: *Podura aquatica*'s own jump numbers (the figures are from
   a globular and a semiaquatic relative [S40, S75]), *Limnozetes*'s walking
   speed (only other oribatids [S83]), *Trachelomonas* (only *Euglena*
   [S105]), the *A. proteus* bleb (only *Entamoeba* [S86]), *Didinium*, and
   all predators of Levels 1–2. The time compression for each level must
   still be stated.
10. **Water-holding figures for Sphagnum** (90% between plants, 10% in
    hyaline cells) come from a search summary of an MDPI study and should be
    checked before they set film-thickness rules.
11. **Level 0 predators at Simmelried:** *Stenus*, water striders, *Pirata*
    and *Dolomedes* juveniles are bog creatures in general [S77–S81], but
    their presence and diets at Simmelried were not checked. Whether water
    striders take springtails regularly is unverified [S80].
12. **Level 5 protagonist:** magnetotactic bacterium (recommended) or
    *Bdellovibrio*? Neither is recorded at Simmelried [S91, S94]. Which
    magnetotactic group (spirillum, coccus) fits a pH 5–6 pool?
13. **Run-and-tumble as the Level 5 controls:** it is *E. coli*'s scheme
    [S95]; the magnetotactic spirillum runs and reverses [S90]. Is "tumble
    becomes reverse" acceptable, and should a stick bias on the new heading
    be allowed at all?
14. **Level 5's look:** phase contrast and fluorescence with EM insets, or an
    SEM-like play view labelled as illustration?
15. **Level 6:** keep it? If so, which phage stands in for a bog phage, and
    is lineage play (choosing which progeny to follow) the right frame?
16. **Phage hazards in a bog:** clay is scarce; do peat and humic particles
    adsorb phages the way clays do? Not researched [S103].

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
| S74 | *Podura aquatica* | Wikipedia: *Podura aquatica*, https://en.wikipedia.org/wiki/Podura_aquatica ; Egri Á, Kriska G (2019). How does the water springtail optically locate suitable habitats? Spectral sensitivity of phototaxis and polarotaxis in *Podura aquatica*. Journal of Experimental Biology 222: jeb199760. doi:10.1242/jeb.199760 ; manuscript: https://real.mtak.hu/48491/1/EgriA_etal_JEB_Corr_ms.pdf | Up to 1.5 mm; flattened furcula; unwettable cuticle and air layer; collophore (citing Noble-Nesbitt 1963); phototaxis and polarotaxis. Encyclopedia and paper introduction; diet only "scavenger" |
| S75 | Springtail jump performance | Smith AA, Harrison JS (2024). Jumping performance and behavior of the globular springtail *Dicyrtomina minuta*. Integrative Organismal Biology 6: obae029. doi:10.1093/iob/obae029. https://pmc.ncbi.nlm.nih.gov/articles/PMC11360184/ | Full text read: take-off 0.98 m/s (max 1.52) in 1.7 ms; peak 1,938 m/s²; 1.53 mm body; 282–369 Hz spin; uncontrolled or collophore-anchored landings. Quotes S40 (*Isotomurus retardatus*: just over 0.7 m/s, up to 48 body lengths) |
| S76 | *Sminthurides aquaticus* | BugGuide, https://www.bugguide.net/node/view/93966 ; Chaos of Delight, "Springtail of the month: *Sminthurides aquaticus*", https://chaosofdelight.org/blog/springtail-of-the-month-sminthurides-aquaticus/31/8/2020 | Popular and amateur sources; females to 1.0 mm, males 0.3–0.5 mm; clasping antennae |
| S77 | *Stenus* skimming | Lang C, Seifert K, Dettner K (2012). Skimming behaviour and spreading potential of *Stenus* species and *Dianous coerulescens*. Naturwissenschaften 99: 937–947. doi:10.1007/s00114-012-0975-4 ; Ke X, Yong H, Xu F, Ding H, Wu Z (2024). *Stenus*-inspired, swift, and agile untethered insect-scale soft propulsors. Nature Communications 15: 1491. https://pmc.ncbi.nlm.nih.gov/articles/PMC10876683/ ; Wikipedia: *Stenus* | Abstract-level (Lang) and figure caption (Ke: 400–750 mm/s, 80–150 body lengths/s); Wikipedia: 0.75 m/s, up to 15 m with continuous secretion; skimming as escape |
| S78 | *Stenus* labium | Bauer T, Pfeiffer M (1991). "Shooting" springtails with a sticky rod: the flexible hunting behaviour of *Stenus comma* and the counter-strategies of its prey. Animal Behaviour 41: 819–828 ; Betz O (1998). Comparative studies on the predatory behaviour of *Stenus* spp. Journal of Zoology 244: 527–544 ; Betz O, Koerner L, Dettner K (2018). The biology of Steninae. In: Biology of Rove Beetles, Springer, https://rd.springer.com/chapter/10.1007/978-3-319-70257-5_11 ; summary: https://collemboles.fr/en/biotope-and-role/105-the-spearing-of-springtails-by-a-beetle-an-unprecedented-mode-of-predation.html | Abstract-level and summaries. 1–3 ms protrusion (*S. comma*, via Wikipedia and reviews); labium in almost half of attacks; large or scaly springtails slip off. Exact titles, volumes and pages of Bauer & Pfeiffer and Betz were not checked |
| S79 | Sundew prey | Thum M (1986). Segregation of habitat and prey in two sympatric carnivorous plant species, *Drosera rotundifolia* and *Drosera intermedia*. Oecologia 70: 601–605 ; Foot G, Rice SP, Millett J (2014). Red trap colour of the carnivorous plant *Drosera rotundifolia* does not serve a prey attraction or camouflage function. Biology Letters 10: 20131024 | Abstract-level. Collembola more often on *D. rotundifolia* (southern German bog); 5.8–16.5% Collembola at Thorne Moors |
| S80 | Water striders | Wikipedia: *Gerris lacustris* ; Missouri Department of Conservation field guide, https://mdc.mo.gov/discover-nature/field-guide/water-striders ; photograph of a strider eating a springtail, https://www.cirrusimage.com/bugs_water_strider | Popular sources: ripple detection, diet of fallen insects. No diet study naming Collembola was found |
| S81 | Bog spiders | Nørgaard E (1952). Entomologiske Meddelelser 26, https://samlinger.snm.ku.dk/digitale-ressourcer/entomologiske-meddelelser/bind-26/n__rgaard__e._1952.pdf ; *Dolomedes fimbriatus* prey in moorland, Arachnologische Mitteilungen 9: 1–11 (1995), https://www.zobodat.at/pdf/Arachnologische-Mitteilungen_9_0001-0011.pdf | Search summaries; titles and the 1995 authors not checked |
| S82 | Raindrop impacts | Dickerson AK, Shankles PG, Madhavan NM, Hu DL (2012). Mosquitoes survive raindrop collisions by virtue of their low mass. PNAS 109: 9822–9827. https://pmc.ncbi.nlm.nih.gov/articles/PMC3382494 | An analogue for flying insects, not springtails |
| S83 | Oribatid walking speeds | Slow-moving soil organisms on a water highway: aquatic dispersal and survival potential of Oribatida and Collembola in running water. Movement Ecology (2019). https://pmc.ncbi.nlm.nih.gov/articles/PMC6604229/ | Search summary of its review of lab speeds (Nicolet 1855: 0.1–5.7 cm/min; *Scheloribates* 2.4 cm/min; *Damaeus onustus* up to 3.12 m/h) |
| S84 | Tardigrade walking | Nirody JA, Duran LA, Johnston D, Cohen DJ (2021). Tardigrades exhibit robust interlimb coordination across walking speeds and terrains. PNAS 118: e2107289118. doi:10.1073/pnas.2107289118 | Via press coverage (author list not checked): *Hypsibius exemplaris*, mean 163 µm/s (0.48 body lengths/s), range 79–264 µm/s, up to ~2 body lengths/s |
| S85 | *Paramecium* escape gaits | Hamel A, Fisch C, Combettes L, Dupuis-Williams P, Baroud CN (2011). Transitions between three swimming gaits in *Paramecium* escape. PNAS 108: 7290–7295. https://pmc.ncbi.nlm.nih.gov/articles/PMC3088577 ; commentary by Lauga, https://pmc.ncbi.nlm.nih.gov/articles/PMC3093470 | Full text read: *P. tetraurelia*; ~10 mm/s in 5 ms; ~8–10 trichocysts of 40 µm, ejected in <3 ms; regeneration takes several hours |
| S86 | Amoeboid speeds | Rogers SS, Waigh TA, Lu JR (2008). Intracellular microrheology of motile *Amoeba proteus*. https://arxiv.org/abs/0710.2510 ; bleb-based motility of *Entamoeba histolytica* (Maugis et al. 2010), https://research.pasteur.fr/en/b/K7E | Abstract-level, author lists not checked: particle drift 0–3 µm/s in *A. proteus*; bleb protrusion 10–20 µm/s in *Entamoeba*, not *A. proteus* |
| S87 | *A. proteus* eating *Paramecium* | Salt GW (1968). The feeding of *Amoeba proteus* on *Paramecium aurelia*. Journal of Protozoology. doi:10.1111/j.1550-7408.1968.tb02122.x | Abstract-level (NIES record); volume and pages not checked |
| S88 | *P. bursaria* and light | Iwatsuki K, Naitoh Y (1988). Behavioural responses to light in *Paramecium bursaria* in relation to its symbiotic green alga *Chlorella*. Journal of Experimental Biology 134: 43 | Abstract-level (exact title not checked): photoaccumulation needs the symbionts and is blocked by DCMU; step-down avoiding reaction at shade; slower swimming in bright light; circadian rhythm |
| S89 | Magnetosomes | Bazylinski DA, Frankel RB (2004). Magnetosome formation in prokaryotes. Nature Reviews Microbiology 2: 217–230 ; Faivre D, Schüler D (2008). Magnetotactic bacteria and magnetosomes. Chemical Reviews 108: 4875–4898 | Abstract and search-summary level: 35–120 nm single-domain crystals in chains; sediments; navigation to the oxic–anoxic zone |
| S90 | Magnetotactic swimming | Popp F, Armitage JP, Schüler D (2014). Polarity of bacterial magnetotaxis is controlled by aerotaxis through a common sensory pathway. Nature Communications 5: 5398. https://epub.ub.uni-muenchen.de/33382/1/10.1038_ncomms6398.pdf ; Bente K, et al. (2020). High-speed motility originates from cooperatively pushing and pulling flagella bundles in bilophotrichous bacteria. eLife 9: e47551. https://elifesciences.org/articles/47551 | Popp: 20–60 µm/s (mean 41.6), reversal rates by oxygen (search summary of the full text). Bente: >500 µm/s; cocci >100 µm/s from a review quoted in search |
| S91 | Magnetotactic bacteria in peat | Lin W, et al. (2020). Expanding magnetic organelle biogenesis in the domain Bacteria. Microbiome 8: 152. https://pmc.ncbi.nlm.nih.gov/articles/PMC7602337 ; magnetotactic Elusimicrobiota from bog soil, ISME Journal (2022), https://www.nature.com/articles/s41396-022-01339-z | Lin: living cells in acidic peat soils, pH 4.3–5.7 (China), mainly Nitrospirota and Omnitrophota. The 2022 paper is title-level |
| S92 | *Bdellovibrio* motility | Lambert C, et al. (2006). Characterizing the flagellar filament and the role of motility in bacterial prey-penetration by *Bdellovibrio bacteriovorus*. Molecular Microbiology 60: 274–286. https://pmc.ncbi.nlm.nih.gov/articles/PMC1453311 ; BioNumbers 101969 (160 µm/s HD100, 35 µm/s 109J) ; Lambert C, Fenton AK, Hobley L, Sockett RE (2011). Predatory *Bdellovibrio* bacteria use gliding motility to scout for prey on surfaces. Journal of Bacteriology 193: 3139–3141 | Abstracts and BioNumbers; "100 body lengths/s" from press coverage |
| S93 | *Bdellovibrio* by cryo-ET | Kaplan M, et al. (2023). *Bdellovibrio* predation cycle characterized at nanometre-scale resolution with cryo-electron tomography. Nature Microbiology 8: 1267–1279. https://pmc.ncbi.nlm.nih.gov/articles/PMC11061892 | Most of the full text read: pili, attachment plaque, flagellum resorbed, portal, 2–3 progeny; stage timings not given |
| S94 | *Bdellovibrio* ecology | Williams HN, Chen H (2020). Environmental regulation of the distribution and ecology of *Bdellovibrio* and like organisms. Frontiers in Microbiology 11: 545070 | Abstract-level: fresh water, soils; Gram-negative prey only |
| S95 | Run and tumble | Berg HC, Brown DA (1972). Chemotaxis in *Escherichia coli* analysed by three-dimensional tracking. Nature 239: 500–504 ; Berg HC (2004). *E. coli* in Motion. Springer | Via reviews and lecture notes: runs ~1 s, tumbles ~0.1 s, ~20 µm/s (10–30 by strain), ~60–70° turns, CheY-P and clockwise switching |
| S96 | Escaping grazers | Pernthaler J (2005). Predation on prokaryotes in the water column and its ecological implications. Nature Reviews Microbiology 3: 537–546 ; Matz C, Kjelleberg S (2005). Off the hook: how bacteria survive protozoan grazing. Trends in Microbiology 13: 302–307 ; Matz C, Jürgens K (2005), high motility reduces grazing mortality of planktonic bacteria, https://orbit.dtu.dk/en/publications/high-motility-reduces-grazing-mortality-of-planktonic-bacteria/ ; Matz C, Bergfeld T, Rice SA, Kjelleberg S (2004), *P. aeruginosa* microcolonies resist grazing | Abstract-level and search summaries |
| S97 | Quorum sensing | Waters CM, Bassler BL (2005). Quorum sensing: cell-to-cell communication in bacteria. Annual Review of Cell and Developmental Biology 21: 319–346 | Abstract-level |
| S98 | T4 structure | Rao VB, et al. (2023). Bacteriophage T4 head: structure, assembly, and genome packaging. Viruses 15: 527 ; Fokine A, et al. (2023). Structure and function of Hoc. Viruses 15: 1517 ; Leiman PG, PhD thesis on the T4 baseplate, https://docs.lib.purdue.edu/dissertations/AAI3113832 | Search summaries: head 120 × 86 nm; tail ~93–140 nm by source; six ~160 nm fibres; baseplate hexagon to star; genome ~169 kbp |
| S99 | T4 infection initiation | Hu B, Margolin W, Molineux IJ, Liu J (2015). Structural remodeling of bacteriophage T4 and host membranes during infection initiation. PNAS 112: E4919. https://pmc.ncbi.nlm.nih.gov/articles/PMC4568249 | Abstract and summaries; author list not checked: folded long fibres, surface walk, LPS/OmpC binding, PMF needed for genome translocation |
| S100 | Phage diffusion and adsorption | Cookson JT (1966). Kinetics and mechanisms of adsorption of *E. coli* bacteriophage T4 to activated carbon. PhD thesis, Caltech, https://thesis.library.caltech.edu/9065/ ; phage biofilm calculator (citing Stent 1963), https://biofilm.phage.org/ ; Abedon ST (2023). Bacteriophage adsorption: likelihood of virion encounter with bacteria and other factors affecting rates. Antibiotics 12: 723 | Search summaries: D ≈ 2.4 × 10⁻⁶ cm²/min (4 µm²/s); 8 × 10⁻⁸ cm²/s "accepted" in 1966; k ≈ 2.4 × 10⁻⁹ ml/min; gel values. The Abedon authorship was not checked |
| S101 | CRISPR-Cas | Makarova KS, et al. (2020). Evolutionary classification of CRISPR–Cas systems: a burst of class 2 and derived variants. Nature Reviews Microbiology 18: 67–83 | Classification from the abstract; prevalence (~40% of bacteria, 85–90% of archaea) and rare spacer acquisition from several reviews' summaries, not from this paper |
| S102 | Restriction-modification | Oliveira PH, Touchon M, Rocha EPC (2014). The interplay of restriction-modification systems with mobile genetic elements and their prokaryotic hosts. Nucleic Acids Research 42: 10618–10631. https://pmc.ncbi.nlm.nih.gov/articles/PMC4176335/ | Abstract-level: 2,261 genomes; R-M rare in plasmids and prophages, nearly absent from other phages. The "~90% of genomes" figure is secondhand and unverified |
| S103 | Phages and clay | Chattopadhyay S, Puls RW (1999). Adsorption of bacteriophages on clay minerals. Environmental Science & Technology 33: 3609–3614. https://pubs.usgs.gov/publication/70185242 ; Vettori C, Gallori E, Stotzky G (2000). Clay minerals protect bacteriophage PBS1 of *Bacillus subtilis* against inactivation by UV rays. Canadian Journal of Microbiology 46: 770–773 | Abstract-level |
| S104 | UV in humic lakes | Lindell M (1996). Effects of sunlight on organic matter and bacteria in lakes. PhD thesis, Lund University. https://lup.lub.lu.se/record/28765 | Abstract: 10% of surface UV-B at 1.5 cm in the most humic lake, 55 cm in the clearest |
| S105 | *Euglena* swimming | Tsang ACH, Lam AT, Riedel-Kruse IH (2018). Polygonal motion and adaptable phototaxis via flagellar beat switching in the microswimmer *Euglena gracilis*. Nature Physics (2018). Preprint: https://www.biorxiv.org/content/10.1101/292896v3 | Search summary: ~50–100 µm/s, rolling at 1–2 Hz; author list not checked |

(S58, S70 and S72 are unused; the numbering is kept so citations stay stable.)
