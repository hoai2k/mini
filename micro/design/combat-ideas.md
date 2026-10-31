# Micro Zoom: how each creature really fights, and what the game can take from it

The owner asked for this:

> "Have an agent also consider the fighting challenges of each character in
> real life and see if any interesting ideas emerge"

This document looks at how each protagonist really escapes, defends itself and
fights back against the enemies named in [`bosses.md`](bosses.md) and
[`zoom-chain-levels.md`](zoom-chain-levels.md). It then turns that into
mechanics for the shared controls in
[`../prototypes/CONTROLS.md`](../prototypes/CONTROLS.md): **A** dash or jump,
**B** defend, **X** attack, eat or bite back, **Y** special. The amoeba keeps
its two-stick lead-and-follow pseudopods. The shared fight model in
`prototypes/shared/predation.js` stays the baseline: a predator winds up, then
strikes. You block with B or bite back with X, and the predator's interest
wears down until it retreats. If it catches you, the camera follows it, the
screen fades and you respawn.

**Labels** are the same as in [`movement.md`](movement.md):

- **[Observed]**: cited biology.
- **[Unverified]**: a claim this research could not confirm, or one confirmed
  only for a relative of the creature.
- **[Proposal]**: a game idea.
- **[Departure]**: a deliberate break from biology.

S-numbers are the sources of `zoom-chain-levels.md`. C-numbers are new and
listed at the end. Most new sources were read only at abstract level, and the
source list says so. Research checked 31 October 2026.

**How ideas are ranked.** Each idea is scored from 1 to 3 on three things:

- **Fun**: does it give the player a readable choice or a good moment?
- **Fidelity**: how close is it to what the animal really does?
- **Cost**: 3 is cheap, meaning it fits `createFight` and the existing buttons.
  1 means a new system.

The **score** is fun × fidelity × cost, out of 27. **Fits** means the idea
works with the current scheme. **New verb** means it needs a button or a
state that no world has yet.

---

## 0. Water springtail (*Podura aquatica*)

### Real facts

| Fact | Label | Source |
| --- | --- | --- |
| *Stenus* catches springtails with a sticky, protrusible labium that shoots out in 1–3 ms. It used the labium in almost half of its attacks. Large springtails and springtails covered in scales or setae often came loose from the sticky tip. Against large springtails the beetle attacked more often with its mandibles alone. | [Observed] for *S. comma* (abstract and reviews) | S78, C1 |
| A globular springtail leaves the ground in about 1.7 ms. So a jump only beats the labium if it starts as the strike starts, not after it. | [Observed] for relatives; [Unverified] for *P. aquatica* | S75, S78 |
| The semiaquatic *Isotomurus* sets the direction of its jump, rights itself in the air in under ~20 ms, and lands upright about 85% of the time, catching the water with its collophore. | [Observed] for *I. retardatus* | S40 |
| The cuticle is unwettable and holds an air layer, so a swamped springtail comes back up. | [Observed] | S74 |
| *P. aquatica* gathers in dense masses on still water, at a pond's drift line or over decaying leaves. No study was found showing that these masses protect it from predators. | Massing [Observed] (field guides, photographs); protection [Unverified] | C2 |
| Water striders find prey by the ripples it makes on the surface. | [Observed] (popular sources) | S80 |
| Sundews catch springtails. On the leaves of one Australian sundew, a springtail was the main prey. | [Observed] for *D. erythrorhiza*; [Unverified] for bog sundews | C3 |
| A springtail has no weapon to fight back with. | [Observed, general] | movement.md |

### Game ideas

| # | Idea | Controls | Fun | Fidelity | Cost | Score |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **The two-stage *Stenus* strike.** Tell: the beetle lowers its head and freezes. Pressing A inside that window is a clean escape, shown in slow motion. Pressing it late lets the labium stick: you get a short **wriggle** (mash A) to come loose, which is the real slip-off, but costs your jump. Whether you get free or not, the beetle follows up with a **mandible lunge**, a second and slower tell that you dodge again. Fighting back is impossible: the beetle's interest drops only through misses. | Fits (A; the wriggle reuses A) | 3 | 3 | 3 | **27** |
| 2 | **Ripple stealth.** Walking makes small rings and a jump makes one big splash. Striders and the wolf spider turn towards fresh ripples. Holding B (hunker in the meniscus) makes no ripples, so a still springtail is invisible to them. | Fits (B) | 3 | 2 | 3 | 18 |
| 3 | **Upright or tumbling landings.** About 85% of landings are upright and ready to jump again. The other 15% tumble and leave you open for about 0.4 s. Holding B in the air (the collophore anchoring) raises the chance [Departure: the real animal's control comes from its body angle, not a held button]. | Fits | 2 | 3 | 3 | 18 |
| 4 | **Dunked, not dead.** A strider's grab or a raindrop that pushes you under is a knockdown, not a catch: the air layer pops you back up a moment later. | Fits | 2 | 3 | 3 | 18 |
| 5 | **The swarm.** In a mass of NPC springtails, a predator's target lock wanders. Co-op players hiding in the same mass split its attention further [Departure: dilution and confusion are general predator–prey ideas, not measured for *Podura*]. | Fits | 3 | 1 | 2 | 6 |
| 6 | **Sundew drops** as a terrain hazard: glistening drops on the bank. Landing on one sticks you, and A wriggles you free only if you are near the leaf's edge [Departure: the real plant traps over minutes; whether springtails ever escape was not found]. | Fits | 2 | 2 | 2 | 8 |

**For the boss** (pond wolf spider): with ripple stealth (2), a teammate's
landing pulls the spider round. That lets the other player nip a tarsus from
behind, using the double-damage flank rule `bosses.md` already has. Keep the
spider's pounce single-stage. The two-stage strike belongs to *Stenus*, so the
two fights read differently.

---

## 1. Box mite (Phthiracaridae; also *Limnozetes*)

### Real facts

| Fact | Label | Source |
| --- | --- | --- |
| **Ptychoidy:** a box mite folds legs and mouthparts inside and closes into a sealed box. Phthiracaroid mites resisted crushing better than relatives of the same size, and the study tested them against staphylinid beetles. | [Observed] | S39 |
| Predatory gamasid mites rejected most hard-bodied adult oribatids and took springtails and juvenile mites. | [Observed] | S38 |
| Many oribatids carry **oil glands**. In *Archegozetes*, intact mites were largely avoided by *Stenus juno*. Once their glands had been discharged, the same mites were eaten as readily as springtails. Juveniles are also protected. | [Observed] | C4 |
| The secretion regenerates slowly: about 10% after 24 hours, and the normal amount after 2–6 days. | [Observed] | C4 |
| Among box mites, only Euphthiracaroidea (for example *Euphthiracarus*) combine ptychoidy with chemical defence. Chemically armed specimens repelled a gamasid and two staphylinid beetles. **Phthiracaroidea, the protagonist's family, appear to have lost the chemical defence**, but their ptychoidy holds up better against large predators. | [Observed] (abstracts) | C5, S39 |
| Pseudoscorpions carry venom glands in their pincers, which open at the finger tips. Many ambush prey from crevices. In one species the nymphs were the bolder hunters and chased prey further. Up to three pseudoscorpions were seen sharing one prey item. | [Observed], general and for *Mundochthonius*; venom against oribatids [Unverified] | C6 |
| Whether *Limnozetes* has working oil glands was not checked. | [Unverified] | — |

### Game ideas

| # | Idea | Controls | Fun | Fidelity | Cost | Score |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Seal timing.** B takes a moment to close fully (about 0.3 s, a stand-in). A strike that lands on a fully sealed box goes *clank*: no damage, and a big drop in the predator's interest. A strike during the closing is only partly blocked. Closing too early wastes the predator's time but not yours, since you can't move while sealed. | Fits (B) | 3 | 2 | 3 | 18 |
| 2 | **Who can crack you.** Gamasids give up on a closed adult almost at once. A pseudoscorpion grips and squeezes, which drains an armour gauge, while teammates bite its pincer joints (X). Only a big predator can crack the box at all. That makes the true answer to most enemies "close up and wait", which is honest and different from every other world. | Fits | 2 | 3 | 3 | 18 |
| 3 | **Shepherd the juvenile (co-op).** A soft juvenile tags along and gamasids want it. Adults block for it with their sealed bodies and nip back. | Fits | 3 | 3 | 2 | 18 |
| 4 | **Oil cloud (Y)** for an *Euphthiracarus* or *Limnozetes* character: a repellent puff that makes predators break off and keeps them out of a small area for a few seconds. One charge, refilled slowly (days compressed into minutes). It is the only chemical defence on the mite level. Give it only to a cousin character, because **the box mite itself has lost it** [Departure if put on the box mite]. | New verb (Y as an area denial) | 3 | 2 | 2 | 12 |
| 5 | **Seal and drop.** A closed box falls off a moss leaf and rolls away from an attacker. | Fits | 2 | 1 | 3 | 6 |

[Unverified] Box mites do drop when disturbed, but no study was found that
measures it as an escape.

**For the boss** (pseudoscorpion):

- Make it an **ambush**: the tell is the tip of a pincer showing at the mouth of
  a crevice. Once you have passed it, it gives chase.
- Make the venom's limit explicit: the venom only works on a mite that is still
  open, so a grab on a sealed box does no harm, as `bosses.md` already
  intends.
- Phase two can bring in a nymph that hunts more boldly [Proposal, after C6].

---

## 2. Eutardigrade

### Real facts

| Fact | Label | Source |
| --- | --- | --- |
| *Milnesium* hunts rotifers and other tardigrades. Adults can swallow prey whole, but hatchlings cannot until their third instar, so size is a real limit. | [Observed] | S41, S42 |
| *Milnesium lagniappe* clustered where prey had been earlier. The prey, *Macrobiotus*, gathered where the predator had never been. Both seem to read chemical or other traces. | [Observed] (abstract) | C7 |
| In feeding trials with nine predatory tardigrade species, the predators generally preferred nematodes and avoided tardigrade prey. | [Observed] | S43 |
| *Prionchulus* (a mononchid nematode) has a single large tooth in its mouth cavity. Mononchids cut their prey or swallow it whole, and need a film thick enough to move in. A complex habitat lowers their success. | [Observed] | S44, C8 |
| The tun forms by drying out and takes minutes to hours to revive from. | [Observed] | S73 |
| **Grouping helps tardigrades survive drying:** in *Richtersius coronifer*, animals that dried in aggregates survived better than animals that dried alone. Evidence that tardigrades aggregate in the wild is scarce. | [Observed] for *R. coronifer* | C9 |
| A tardigrade grips the substrate with its claws and pierces cells with its stylets. Whether stylets are used against a predator was not found. | Grip [Observed]; stylets against a predator [Unverified] | S02 |

### Game ideas

| # | Idea | Controls | Fun | Fidelity | Cost | Score |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Scent trails.** You leave a faint, fading trail and *Milnesium* follows it. You can sense its trail as a tint in the film and avoid it. Doubling back, crossing water or walking through a teammate's trail muddles the scent. The level becomes stealth and route-finding rather than racing, which suits a slow animal. | Fits (no new button; a trail system) | 3 | 3 | 2 | 18 |
| 2 | **Huddle tun (co-op).** When a patch dries, players who tun (Y) touching each other survive. A lone tun has a chance of not reviving, which costs a respawn. In the meantime, *Milnesium* can't eat a tun that is stuck to others [Departure for that last part; survival is from C9]. | Fits (Y) | 3 | 2 | 2 | 12 |
| 3 | **Too big to swallow.** Piercing algae (X) grows you a little. Past a threshold, small *Milnesium* hatchlings give up on you at once, and only adults hunt you. | Fits | 2 | 3 | 2 | 12 |
| 4 | **Brace as an anchor.** Against the nematode's whip, a full brace (B) holds you in place. Without it, you are knocked into thicker film, where the nematode is stronger. | Fits | 2 | 2 | 3 | 12 |
| 5 | **Stylet jab** as X at a predator's soft head [Departure: a counter-attack with the stylets is not documented; keep it weak]. | Fits | 2 | 1 | 3 | 6 |

**For the boss** (*Prionchulus*): after the S-coil tell, if the whip lands,
the tooth **latches on**. You brace (B) to slow the pull while a teammate jabs
its head (X) to make it let go. Alone, you have to mash a wriggle. Thin film
stays the main tactic. Whether the S-coil is a real pre-strike posture is
**[Unverified]**: no attack footage was found, so label it a readable game
tell.

---

## 3. *Amoeba proteus*

### Real facts

| Fact | Label | Source |
| --- | --- | --- |
| Zoopagalean fungi (*Stylopage*, *Acaulopage*) trap amoebae with an adhesive on their hyphae, then push a haustorium into the cell to feed. | [Observed] (taxonomic sources) | C10 |
| *A. proteus* at Simmelried carries an undescribed fungus living on its surface. | [Observed] | S29 |
| *Chaos* grows up to 5 mm long (mostly 1–3 mm), has many nuclei, and engulfs *Paramecium* in food cups. Whether it eats *A. proteus* was not confirmed. | Size and food cups [Observed]; eating amoebae [Unverified] (a 1976 paper on cannibalism was not read) | C11 |
| A cut fragment of an amoeba regenerates only if it holds a nucleus. Large holes in the membrane seal quickly, though some cytoplasm usually escapes. | [Observed] | C12 |
| Amoeboid flow is slow, a few µm/s, while a *Paramecium* swims at about 1 mm/s. The amoeba catches what is resting or cornered. | [Observed] | S85, S86 |
| Old reports of *A. proteus* forming cysts are disputed. | [Unverified] | C13 |

### Game ideas

| # | Idea | Controls | Fun | Fidelity | Cost | Score |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Sacrifice a pseudopod.** Fungal hyphae lie across the pool floor (a faint glistening thread is the tell). A pseudopod that touches one sticks. Withdraw it (B, let go) to save the body. If the body flows onto the thread instead, the haustorium pierces you and you are caught. [Unverified: whether amoebae really escape by pulling back a stuck pseudopod.] | Fits (B, both sticks) | 3 | 2 | 3 | 18 |
| 2 | **The nucleus is the life.** Show your nucleus inside the body. Mass is health: a lost pseudopod costs cytoplasm, and eating (X) regrows it. A *Chaos* food cup only kills if it closes round the part with your nucleus, so you can lose half your body and live. | Fits | 3 | 3 | 2 | 18 |
| 3 | **Multinucleate boss twist.** *Chaos* has many nuclei. An arm pinched off empty rounds up and dies, as `bosses.md` already says. An arm pinched off with a nucleus inside crawls off as a small new *Chaos*. Watch for the nuclei streaming into an arm (the tell) and cut it before they arrive. [Unverified: plausible from C12, not checked for *Chaos*.] | Fits (pincer cut) | 3 | 2 | 2 | 12 |
| 4 | **Joint food cup (co-op).** Two amoebae each send a pseudopod round prey too big for either of them [Departure: amoebae don't cooperate]. | Fits | 3 | 1 | 2 | 6 |
| 5 | **Cyst (Y)**: a last-resort shell when the pool dries [Departure, disputed for this species]. | New verb | 1 | 1 | 2 | 2 |

---

## 4. *Paramecium bursaria*

### Real facts

| Fact | Label | Source |
| --- | --- | --- |
| **Trichocysts defend against *Dileptus*:** mutants that cannot discharge them were eaten **9–45 times faster** than wild type. Locally triggered discharge pushes the cell away from the side that was touched. Mutants that cannot swim backwards escaped nearly as often as wild type, so the discharge, not the reversal, is what saves it. | [Observed] in *P. caudatum* and *P. tetraurelia* | C14, S09 |
| **Trichocysts do not help against *Didinium*:** wild type and mutants were equally vulnerable. Discharge did protect against the related *Monodinium*. | [Observed] (abstract) | C15 |
| *Didinium* attacks on contact. Its proboscis fires **pexicysts**, which stick to the prey's surface, and **toxicysts**, which pierce it and stay anchored in the proboscis, apparently paralysing the cilia. It then swallows the prey whole and re-forms its proboscis. No timings were found. | [Observed] | S56, C16 |
| Spent trichocysts take hours to regenerate. A jump uses about 8–10 of them. | [Observed] in *P. tetraurelia* | S85 |
| The symbiotic *Chlorella* shield *P. bursaria* from UV: cells without algae died more under UV. | [Observed] | C17 |
| A 1980 study proposed that the algae discourage *Didinium* through distasteful products. | [Unverified]: one old paper, not read | C17 |
| *Paramecium* gathers in weakly acidic zones, for example as a ring round a CO₂ bubble. | [Observed], historical | C18 |
| The bladderwort's trap fires in about half a millisecond and resets in about an hour. | [Observed] | S52 |

### Game ideas

| # | Idea | Controls | Fun | Fidelity | Cost | Score |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **The right tool for the predator.** The trichocyst jump (A) saves you from *Dileptus*: time it to the proboscis touch and the jump throws you clear, away from the side that was touched. Against *Didinium* the jump does nothing, because its pexicysts hold on. The only answer is to keep it from touching you: reverse early (B) and keep your distance. Each predator teaches a different, true rule. | Fits | 3 | 3 | 3 | **27** |
| 2 | **A limited stock of trichocysts.** Show a stock of about 30, refilling slowly (hours compressed into a minute or so). Each jump spends about 8–10. The jump fires away from where you were touched, not where the stick points. | Fits (A plus a HUD stock) | 2 | 3 | 3 | 18 |
| 3 | **Green shield.** Feeding in light (X) grows your algae. Algae are armour in UV-bright water, and a cell that loses them in shade bleaches and becomes fragile. An optional rule could make *Didinium* hesitate before biting a very green cell [Unverified, C17; label it]. | Fits | 2 | 3 | 2 | 12 |
| 4 | **The *Didinium* tether.** Once it touches you, you are tethered and slowed. A teammate ramming the *Didinium* knocks the proboscis off before it reels you in [Departure: no escape at this stage is documented]. | New state (tether) | 3 | 1 | 2 | 6 |
| 5 | **The CO₂ ring (co-op).** Players gather in the weak-acid ring round a bubble. It is a safe spot where predators drift past [Departure: the ring isn't shown to be protective]. | Fits | 1 | 1 | 2 | 2 |

**For the boss** (bladderwort): no change to the fight, but the trap is a good
place to teach idea 1. A trichocyst burst at the edge of the inflow is honest:
discharge pushes the cell away from the stimulus. It is the jump's best use in
the level.

---

## 5. Bacterium (magnetotactic hero; *Bdellovibrio* as enemy or chapter)

### Real facts

| Fact | Label | Source |
| --- | --- | --- |
| Fast swimmers suffer the least grazing. Large cells, filaments and microcolonies escape grazers that cannot swallow them. | [Observed] | S96 |
| **Biofilm chemical defence:** in biofilms, some bacteria make the toxin violacein, which kills grazing protozoa. In *Chromobacterium* its production is switched on by **quorum sensing**: a mutant that cannot make the signal fed flagellates well, and adding the signal back restored the toxicity. A group shares a cost that would be too high for one cell. | [Observed] for *C. violaceum* and *J. lividum*; not for magnetotactic bacteria | C19 |
| **Multicellular magnetotactic prokaryotes** (*Ca.* Magnetoglobus) swim as a ball of cells. They shuttle back and forth along magnetic field lines in sudden, highly coordinated **escape** runs. Non-magnetic aggregates of a similar shape don't. | [Observed] | C20 |
| *Bdellovibrio* swims up to 160 µm/s, faster than the hero's 20–60 µm/s. It attaches with pili, forms a plaque and enters the prey through a portal. | [Observed] | S92, S93 |
| **Plastic resistance:** prey cells that survive *Bdellovibrio* become more resistant for a while. The change is not genetic and fades once the predator is gone. | [Observed] (abstract) | C21 |
| An S-layer was thought to protect *Caulobacter* from *Bdellovibrio*. A 2024 study found an epibiotic *Bdellovibrio* feeds on it regardless. | Contested | C22 |
| *Stentor* contracts in about 10–20 ms when touched and takes about a minute to stretch out again. Repeated mild touches make it habituate. | [Observed] | C23 |

### Game ideas

| # | Idea | Controls | Fun | Fidelity | Cost | Score |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Quorum shield (co-op).** When enough cells stay bound together (players plus NPC cells, X bind) for a few seconds, the colony "reaches quorum". A toxic halo comes up, and grazers that swallow from it spit you out and stop hunting. If the colony breaks up, the halo fades. | Fits (X bind; quorum is a group state) | 3 | 2 | 2 | 12 |
| 2 | **Too big to eat.** A bound microcolony is too large for *Stentor*'s mouth: the vortex pulls you in and spits you out. Lone cells get eaten. Binding becomes the real block of Level 5. | Fits | 3 | 3 | 3 | **27** |
| 3 | **Coordinated escape run (co-op).** While bound, a dash (A) pressed by every player within a short window launches the whole colony along the field line, fast and far. Out-of-sync presses waste the run. | New verb (group dash) | 3 | 3 | 2 | 18 |
| 4 | **Hardened survivor.** After you shake off a *Bdellovibrio* (tumble or reverse, B, before the plaque forms), you are briefly harder to attach to. The effect fades. | Fits (a timed buff) | 2 | 3 | 3 | 18 |
| 5 | **Last-moment reverse.** *Bdellovibrio* outruns you, so a race is lost. Its tell is a brief pause on contact before the pili grab, and a reverse (B) in that window escapes. | Fits | 2 | 2 | 3 | 12 |

Notes on the ideas:

- **Quorum shield (1):** this is a **[Departure]** for a magnetotactic
  bacterium: violacein comes from other genera. A neighbouring biofilm species
  can lend the halo, or a *Chromobacterium*-like ally can join the colony.
  Either way, the shield is real biology for that ally rather than for the
  hero.
- **Escape run (3):** this is real for multicellular magnetotactic prokaryotes,
  which suits the magnetotactic hero.
- **Last-moment reverse (5):** the pause before the pili grab is
  **[Unverified]**.

**For the boss** (*Stentor*): bumping its foot makes it contract in a flash.
Use the real numbers:

- After a contraction, give a long and safe re-extension (a minute, compressed
  to about 8 s). That is the moment to sprint past.
- Make each later bump work less well, because *Stentor* habituates. The player
  can't stand at the foot and spam it.

### Lead a swarm (the owner's idea, designed as a feature)

The owner's idea:

> "leading a swarm would also be a great gameplay dynamic, for bacteria
> collecting a swarm to battle with (by going around and finding and touching
> allies) might be super cool"

This is the strongest idea in the document. It gathers ideas 1–3 above
(quorum shield, too big to eat, the coordinated escape run) into one system.

#### The real basis

| Fact | Label | Source |
| --- | --- | --- |
| **Quorum sensing:** cells release a signal molecule. When its concentration passes a threshold, which happens only when enough cells are close together, they switch on group behaviour such as toxin production. A quorum-sensing mutant made no toxin until the signal was added back. | [Observed] | C19 |
| **Microcolonies resist grazers.** In *Pseudomonas aeruginosa* biofilms facing a surface-feeding flagellate, the cells formed grazing-resistant microcolonies. Biofilms grown without the predator did not. Quorum-sensing mutants made fewer and smaller microcolonies, and cells without flagella made none. | [Observed] | C28 |
| **Mature biofilms poison grazers.** Older wild-type biofilms were acutely toxic to the flagellate, and quorum sensing drove those lethal factors. Microcolonies protect best early on. Toxins in mature biofilms work against a wider range of predators. | [Observed] | C28 |
| **Swarming motility:** on surfaces, bacteria move as a dense group. The leading edge is made of **rafts** of aligned, heavily flagellated cells. Swarming needs more flagella, contact between cells and a surfactant. It starts only after a lag that depends on cell density, and the lag disappears if actively swarming cells are used. Swarms also tolerate antibiotics better than single cells, through their collective motion. | [Observed] | C29 |
| **A ball of cells that swims as one:** multicellular magnetotactic prokaryotes (*Ca.* Magnetoglobus) are aggregates of cells whose flagella beat in coordination. They make sudden, coordinated escape runs along field lines. This is the closest real match to a magnetotactic hero leading a swarm. | [Observed] | C20 |
| **Wolf-pack hunting** is real in *Myxococcus xanthus*. Groups of cells move together onto a prey colony and kill it from outside with antibiotics. When they reach the prey they synchronise their reversals ("rippling"), which keeps the pack on the prey patch. | [Observed] for *Myxococcus*; [Departure] for the hero | C30 |
| ***Bdellovibrio* hunts alone** and has no such behaviour. It readily attacks biofilms: dense prey suits it. | Lone hunting [Observed]; biofilm attack [Observed] but not re-checked here | S93, C31 |

**What departs from biology:** real bacteria don't follow a leader. Quorum
sensing is a density switch, not a call to gather. Gathering through
chemotaxis towards the signal is **[Unverified]** for these cells. "The player
leads the swarm" is therefore the core **[Departure]**, and the game should say
so plainly.

#### The design

**1. Recruiting (touch, plus a signal that snowballs).**

- Solitary kin cells drift in the sediment: dim, the same colour as you,
  wandering.
- **Touch one (X bind) to recruit it.** It lights up and joins the flock.
- Your swarm carries a **signal cloud**: a soft halo whose radius grows with
  the swarm's size. Kin inside the halo turn and drift towards you, so
  recruiting gets easier as you grow. At first you hunt for each cell; later,
  stragglers come to you.
- Show the **quorum gauge** as a brass ring that fills with density, not just
  head count. A spread-out swarm of 20 cells is below quorum. A tight swarm of
  12 is above it. Holding the group together is the skill.
- Only kin answer (your colour). Other bacteria are scenery, food for grazers,
  or rival swarms [Proposal; signal specificity is simplified].

**2. Shape and movement (a flock).**

- Members follow boids rules: separation (no overlap), alignment (match the
  heading of their neighbours), cohesion (stay with the group), plus a pull
  towards the leader (you).
- LS steers the leader and the flock follows with a slight lag, so turns sweep
  round like a school of fish.
- Packing depends on size:
  - **Loose cloud** (under 8 cells): members swirl round you.
  - **Raft** (8–20): members line up in short parallel rows behind you, the
    real swarming-edge rafts. A raft is steadier and slower to turn.
  - **Ball** (20 or more, magnetotactic hero only): a tight sphere, like a
    multicellular magnetotactic prokaryote. It swims along the field line by
    itself (RS nudges the field direction) and turns slowly.
- **B (reverse)** reverses the whole flock along its heading, as the real
  magnetotactic reversal does.
- **A (escape run)**, from the raft size up: a dash that only goes off at full
  strength if the members are aligned. A neat flock gets a long run and a
  scattered one a weak one. In co-op, every leader presses A within a short
  window for the combined run (idea 3 above).

**3. What the swarm can do, by size (thresholds are stand-ins).**

| Size or state | Ability | Real basis | Label |
| --- | --- | --- | --- |
| 5 or more | **Slime shield.** A thin halo of slime round the flock. A grazer's bite on the swarm takes a member from the edge, not you. You are in the middle. | Biofilm matrix (EPS) and microcolony protection [C28] | Matrix as a shield [Proposal]; members dying in your place [Departure] |
| 8 or more, in raft shape | **Vortex-proof raft.** *Stentor*'s pull drags a raft but can't swallow it. Holding B while caught anchors the raft (members grip the surface), and the vortex strips only edge members. A lone cell is pulled straight in. | Too big to swallow [S96]; microcolonies resist grazers [C28] | [Observed] principle; anchoring as a button [Proposal] |
| Quorum gauge full | **Toxin burst (Y).** A purple shock ring. Grazers inside it recoil and retreat, losing all interest; small flagellates die. The charge builds only while the swarm **settles**: it holds still on a surface with B held for a few seconds, the "mature biofilm". The swarm then chooses between moving and arming. One burst empties the charge. | Quorum-gated toxins of mature biofilms [C19, C28] | [Observed] for *Chromobacterium* and *Pseudomonas*; **[Departure]** for a magnetotactic hero, so give it to a kin strain or label it |
| 12 or more | **Overwhelm a patch.** Sweep the flock over a nutrient patch (the oxic band, a lump of detritus) to claim it: members spread out over it, and rival cells and small grazers are pushed off. Feeding there makes members divide (see "Losses and regrowth" below). In a *Myxococcus* side chapter, the pack swarms a prey colony and holds it with rippling (rhythmic B presses keep the pack on the patch). | Swarming over surfaces [C29]; wolf-pack predation [C30] | Patch claiming [Proposal]; prey swarming [Departure] for the hero, [Observed] for *Myxococcus* |

**4. Battles with the swarm.**

- **Surface-feeding flagellates** (small grazers) nibble the edges, taking
  one cell at a time. A raft or ball shrugs them off, and a toxin burst kills
  them. This is the real experiment in C28, so it should be the first fight
  the player has with a swarm.
- **Ciliates and amoebae**: ciliates pull with feeding currents and amoebae
  engulf from the surface. A raft resists the current. An amoeba is slow, so
  the swarm simply moves on.
- ***Stentor* (the boss)**:
  - **Phase 1:** the vortex pulls in stragglers. Keep the flock tight and in
    raft shape, and anchor (B) at each pulse.
  - **Phase 2:** settle in the lee of a sediment grain to charge the toxin,
    while edge members are stripped.
  - **Phase 3:** fire the burst at the mouth, or bump the foot. Either makes
    *Stentor* contract (10–20 ms). Its long re-extension is the window to run
    the flock past to the host cell.
  - **Habituation:** a second bump works less well, so the toxin is the
    reliable key.
  - Contraction in response to a chemical is **[Unverified]**. The real
    trigger in C23 is touch, so label the toxin's effect.
- ***Bdellovibrio*** is the swarm's **counter-enemy**: it loves dense prey.
  It darts into the flock and picks off a member from inside, and a tight
  ball makes that easier. The answer is a reverse, or scattering (hold B
  longer to loosen the flock). The swarm is the answer to grazers, and
  scattering is the answer to the predatory bacterium. This is true to
  biology and keeps the swarm from being the answer to everything.

**5. Losses and regrowth.**

- **Members are your health.** Each lost member dims and drifts off, or is
  eaten on screen (a small version of the catch sequence).
- If the leader is caught while the swarm has 5 or more members, control
  passes to the nearest member, a short "new leader" flash [Departure], and
  the swarm loses a few cells in the confusion. Below 5, the swarm scatters to
  solitary kin, and you respawn alone to recruit again.
- **Regrowth by division:** members feeding on a claimed patch divide. One
  cell becomes two, with a visible pinch in the middle. Real division takes
  hours, so it is compressed to seconds [Departure, labelled]. A ball might
  split as a whole into two balls [Unverified for *Magnetoglobus*]: in co-op,
  it can be offered as "split the swarm".

**6. Multiplayer.**

- **Each player leads a swarm**, in their own kin colour. When halos overlap,
  a solitary cell joins whoever touches it first. There is no stealing of
  members in co-op; versus play can allow it.
- **Merging:** leaders touch and both hold X. The flocks blend into one swarm
  with joint leadership: it follows the average of the leaders' sticks, and a
  leader who pulls away hard drags a share of it along. A merged swarm reaches
  quorum and the ball shape sooner, and its synchronised escape run is the
  strongest move in the level.
- **Splitting:** hold B and pull apart. Members go to the nearer leader.
- **Roles:** one swarm settles and charges the toxin while another lures
  *Stentor*'s pull, then they swap. Co-op split screen already splits along
  the direction between players, which suits two flocks.

**Scores**, on the same scale as the tables above:

| Part | Fun | Fidelity | Cost | Score |
| --- | --- | --- | --- | --- |
| Core (recruit by touch, flock, raft as a block, members as health) | 3 | 2 | 2 | 12 |
| With the quorum toxin and division | 3 | 2 | 1 | 6 |

The formula underrates the swarm, because it is a level-defining system
rather than a tweak. It absorbs the 27-point "too big to eat" and the
18-point escape run. It is the top recommendation below.

**Build order:**

1. Flock and recruit (boids plus touch).
2. Members as health, and raft blocking against the vortex.
3. Flagellate grazers as the first enemies.
4. Quorum gauge and toxin.
5. Division.
6. Merging in multiplayer.
7. The *Stentor* rework.

#### Does swarm-leading transfer to other worlds?

| World | Version | Fidelity | Verdict |
| --- | --- | --- | --- |
| Phage | **Your burst is your swarm.** A burst releases about 100 phages, or about 1,000 under lysis inhibition [C27]. They become your lives, drifting out by Brownian motion, and you pick which one to follow next. Co-infection and multiplicity reactivation are the phage's real form of strength in numbers. You can't lead, because there is no motor. | High, with no leader | **Yes**: a natural fit for the phage's "odds" design |
| Box mite | Shepherding the juvenile (idea 3 there) is herding on a small scale. A crowd of adults closing round juveniles is plausible, but not documented. | Medium | Keep it small, one to three juveniles |
| Tardigrade | Gathering wandering tardigrades into a clump before the film dries (the huddle tun) [C9]. | Medium: the benefit is real, the gathering is not | Yes, as a short herding objective |
| Springtail | Leading a mass of *Podura* across the film to confuse a strider [C2]. | Low: the protective effect is unverified | Only as a labelled departure |
| *Paramecium* | Leading cells into a weak-acid ring [C18]. | Low | No; it doesn't make a fight |
| Amoeba | — | — | No: amoebae are solitary |

---

## 6. T4-like phage

### Real facts

| Fact | Label | Source |
| --- | --- | --- |
| T4's DNA carries **glucosylated hydroxymethylcytosine**, which defeats almost all restriction enzymes and the host's modified-cytosine restriction systems. | [Observed] | C24 |
| The same glucose coat gives **partial** protection against CRISPR: it lowers how well Cascade (type I-E) and Cas9 bind. How much it helps depends on the target, and Cas12a is not impaired at all. Partial protection lets mutant phages escape CRISPR quickly. | [Observed]; an early study disagreed for Cas9 | C24 |
| **Anti-CRISPR phages cooperate.** A first phage that fails to replicate still leaves its anti-CRISPR proteins behind. They keep the cell immunosuppressed, so a second phage succeeds. Whether the phages win depends on their starting density, with a tipping point. | [Observed] in *Pseudomonas* phages; **T4 is not known to carry anti-CRISPRs** | C25 |
| **Multiplicity reactivation:** UV-killed T-even phages (T2, T4, T6) that infect the same cell together can produce live phage. Their damaged genomes recombine into a working one. Small phages such as T1 and T7 cannot do this. | [Observed] (Luria 1947 and later) | C26 |
| **Lysis inhibition:** a second T4 that infects an already infected cell a few minutes later makes it delay bursting by up to several hours. The burst grows to about 1,000 phages. | [Observed] | C27 |
| A phage has no motor. UV near the surface inactivates phages, and clay shelters them. | [Observed] | S100, S103, S104 |

### Game ideas

| # | Idea | Controls | Fun | Fidelity | Cost | Score |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Two damaged halves make one phage (co-op revive).** UV-bright water doesn't kill a player outright: it marks them **damaged**, and a damaged phage's injection fails. Two damaged players who inject into the **same host** recombine, and both count as live. This is a revive mechanic that is literally true for T4. | Fits (X inject) | 3 | 3 | 2 | 18 |
| 2 | **The glucose coat.** Restriction enzymes slide over you harmlessly, which is real and makes clear why they are only "lesser hazards" in `bosses.md`. Cascade scans more slowly and its match takes longer to lock. Add a rare **Cas12a** enemy that ignores the coat, so a late level has one enemy you must truly avoid. | Fits | 2 | 3 | 3 | 18 |
| 3 | **Holding the host.** Each further player who injects into an infected host delays its burst and makes the burst bigger. The longer wait also gives CRISPR longer to scan. More players means more risk and a bigger score. | Fits | 3 | 3 | 2 | 18 |
| 4 | **The first one in pays (co-op).** A player whose injection is cut by CRISPR still leaves the host **immunosuppressed** for a while (the guide RNA's glow dims). A second player who injects into that host in time succeeds. | Fits | 3 | 2 | 2 | 12 |
| 5 | **Escape mutant.** When Cas3 cuts you, a small chance applies that a copy carrying a mismatch survives. You respawn as a variant whose guide no longer matches that CRISPR complex, which ignores you for the rest of the level. | Fits | 2 | 3 | 2 | 12 |

Notes on the ideas:

- **The first one in pays (4):** this is real biology, but for anti-CRISPR
  phages of *Pseudomonas*. It is a **[Departure]** for a T4-like hero.
  Alternatively, it could be a skin or a chapter with a *Pseudomonas* phage.
- **Escape mutant (5):** this follows C24's "rapid evolution of mutant phages
  that escape" **[Proposal]**.

**For the boss** (CRISPR-Cas):

- The glucose coat (2) gives the scan a readable slowdown.
- The escape mutant (5) gives a failure a silver lining.
- In co-op, the first one in pays (4) and holding the host (3) turn the fight
  into a relay inside one cell.

---

## Across the worlds

### Recurring patterns

- **Armour against agility.** The mite closes up and waits, while the
  springtail and the bacteria get away. The tardigrade does neither and relies
  on terrain and scent. That is a good spread: each world's best answer to a
  predator differs, so the shared B button means "the defence this body
  really has", not one generic block.
- **The defence depends on the predator.** Trichocysts beat *Dileptus* but not
  *Didinium*. Oil glands beat *Stenus*, but gamasids already ignore a hard
  adult. The glucose coat beats restriction enzymes, works partly on Cascade
  and Cas9, and fails against Cas12a. Biology keeps saying "this works on
  *that* enemy". `createFight` can carry this cheaply as a per-predator list
  of which defences work [Proposal]. It is the single most useful
  engineering change here.
- **Two-stage attacks.** *Stenus* strikes with its labium and then with its
  mandibles. *Didinium* sticks with pexicysts, then pierces with toxicysts.
  *Bdellovibrio* attaches, then forms its plaque. `createFight` could support a
  second tell after the first strike, so a late dodge still has a chance.
- **Chemical defence as timed area denial.** Oil glands and violacein are real
  repellents with a slow refill: days for the oil, and a sustained quorum for
  the violacein. Both suit a Y charge that keeps predators out of a small
  area for a few seconds and refills slowly.
- **A limited stock of defences.** Trichocysts take hours to rearm and oil
  glands days. Showing the stock makes "when do I spend it?" a real decision.
- **Group defence.** This is the real strength-in-numbers list:
  - tardigrades drying in clumps (C9);
  - quorum-sensed toxins (C19);
  - multicellular magnetotactic prokaryotes escaping together (C20);
  - phages co-infecting one host (C25–C27).

  Springtail swarms, *Paramecium* rings and joint amoeba feeding were not
  shown to protect, so they stay **[Departure]**.
- **Size as a defence.** You can be too big for a young *Milnesium*, too big as
  a microcolony for *Stentor*, and too hard a box for a gamasid. Growing
  by eating is a natural progression in several worlds.

### The five strongest ideas to build next

1. **The right tool for the predator** (*Paramecium*, score 27). The jump saves
   you from *Dileptus* (mutants without trichocysts were eaten 9–45× faster)
   and is useless against *Didinium*, which you must avoid early. It is
   cheap, readable and true, and it builds the per-predator defence list that
   every world can reuse.
2. **The two-stage *Stenus* strike** (springtail, score 27). Jump on the tell or
   wriggle off the labium, then dodge the mandible follow-up. The best duel in
   the game, built on real millisecond timings.
3. **Too big to eat, with a coordinated escape run** (bacterium, scores 27 and
   18). Binding into a microcolony is the bacterium's real block, and a
   synchronised dash is the real escape of multicellular magnetotactic
   prokaryotes. It is the best co-op design that needs no departure.
4. **Two damaged halves make one phage** (phage, score 18). A co-op revive
   that is literally true for T4 (multiplicity reactivation). Pair it with
   holding the host for a risk-and-reward relay against the CRISPR boss.
5. **Scent trails, with the huddle tun** (tardigrade, scores 18 and 12).
   Stealth suits a slow animal, and *Milnesium* really tracks where its prey
   has been. Drying in a clump really improves survival, which gives a quiet
   co-op moment.

Honourable mentions:

- the seal timing and "who can crack you" for the box mite;
- the sacrificed pseudopod and "the nucleus is the life" for the amoeba;
- the glucose coat for the phage, which needs almost no new work.

### Departures to label on screen if built

- A pause before *Bdellovibrio*'s pili grab, and the S-coil as a nematode tell
  (both readable tells that the research did not confirm).
- The quorum toxin on a magnetotactic hero (it needs an ally from another
  genus).
- Anti-CRISPR cooperation for a T4-like hero.
- An oil cloud on a phthiracarid box mite.
- Any escape from a *Didinium* that has already touched you.
- Protection from swarms or rings.
- Joint food cups.
- Cysts of *A. proteus*.
- All refill times compressed from hours or days.

---

## New sources

Most of these were read at abstract or summary level through search results.
Exact pages were not checked unless stated.

| ID | Topic | Reference | How read |
| --- | --- | --- | --- |
| C1 | *Stenus* against springtails | Bauer T, Pfeiffer M (1991). "Shooting" springtails with a sticky rod: the flexible hunting behaviour of *Stenus comma* and the counter-strategies of its prey. Animal Behaviour 41: 819–828. Catalogue: https://www.cambridge.org/core/product/1858042A9DAD4681ED973BD337542C77 ; summary: https://collemboles.fr/en/biotope-and-role/105-the-spearing-of-springtails-by-a-beetle-an-unprecedented-mode-of-predation.html | Abstract: labium used in almost half of attacks; large or scaly or setose prey slip off; mandibles used more on large prey |
| C2 | *Podura aquatica* massing | Missouri Department of Conservation, Water Springtail, https://mdc.mo.gov/discover-nature/field-guide/water-springtail ; UWM Field Station, A Sproing of Springtails, https://uwm.edu/field-station/bug-of-the-week/a-sproing-of-springtails/ | Popular sources; no study of why they mass |
| C3 | Sundews catch springtails | Study of *Drosera erythrorhiza* (Australian Journal of Ecology 7, 1982): springtail *Hypogastrura vernalis* the main prey on the leaves. Record: https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_miscellaneous_15492266 | Abstract only |
| C4 | Oribatid oil glands | Heethoff M, Koerner L, Norton RA, Raspotnig G (2011). Tasty but protected: first evidence of chemical defense in oribatid mites. Journal of Chemical Ecology 37. doi:10.1007/s10886-011-0009-2 ; Heethoff M, Raspotnig G (2012), juvenile defence against *Stenus juno*, Experimental and Applied Acarology ; regeneration (2012), https://publikationen.uni-tuebingen.de/xmlui/handle/10900/43315 | Abstracts: disarmed mites eaten like springtails; ~10% refilled in 24 h, normal amount after 2–6 days |
| C5 | Ptychoidy plus chemical defence | Heethoff M, et al. (2018). Defensive strategies of *Euphthiracarus reticulatus*. BMC Zoology 3. doi:10.1186/s40850-018-0031-8, https://link.springer.com/10.1186/s40850-018-0031-8 ; with S39 (Frontiers in Zoology 2019) on Phthiracaroidea having secondarily reduced chemical defence | Abstracts |
| C6 | Pseudoscorpion hunting | Pseudoscorpion overview, Espace pour la vie, https://espacepourlavie.ca/en/pseudoscorpions ; Andrade R, Gnaspini P, on *Mundochthonius iporangae* feeding, Journal of Arachnology 30(3): 613, https://www.americanarachnology.org/journal-joa/joa-all-articles/article/download/arac-30-03-613.pdf | Summaries: venom glands in the pincer fingers, ambush, bold nymphs, prey shared by up to three |
| C7 | *Milnesium* tracking | Meyer HA, et al. (2020). Predator and prey detection in two species of water bear (Tardigrada). Record: https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_journals_2457690211 | Abstract |
| C8 | Mononchid anatomy and prey | Nemaplex, Family Mononchidae, https://nemaplex.ucdavis.edu/Taxadata/Monoidae.aspx ; mononch gut contents, https://repository.ias.ac.in/85651 | Summaries |
| C9 | Tardigrades dry better in groups | Ivarsson H, Jönsson KI (2004). Aggregation effects on anhydrobiotic survival in the tardigrade *Richtersius coronifer*. Journal of Experimental Zoology. https://lup.lub.lu.se/record/135428 | Abstract |
| C10 | Fungi that trap amoebae | *Stylopage*, Wikipedia, https://en.wikipedia.org/wiki/Stylopage ; Zygomycetes database, https://zygomycetes.org/index.php?id=146 | Encyclopaedic and taxonomic summaries |
| C11 | *Chaos* | Wikipedia, *Chaos* (genus), https://en.wikipedia.org/wiki/Chaos_(genus) ; A study of phagocytosis in the ameba *Chaos chaos*, Journal of Cell Biology 25: 443, https://rupress.org/jcb/article/25/3/443/16635 | Summaries |
| C12 | Fragments and wounds | Review of unicellular regeneration (Frontiers in Cell and Developmental Biology, 2021), https://www.frontiersin.org/journals/cell-and-developmental-biology/articles/10.3389/fcell.2021.753625/pdf (citing Tartar 1961) ; Jeon KW, Jeon MS (1975), cytoplasmic filaments and wound healing in *Amoeba proteus*, Journal of Cell Biology 67, https://pmc.ncbi.nlm.nih.gov/articles/PMC2109580 | Summaries |
| C13 | *A. proteus* cysts | Historical reports, e.g. Carter (1919); disputed by later authors. https://archive.org/download/biostor-6784/biostor-6784.pdf | Search summary only |
| C14 | Trichocysts against *Dileptus* | Harumoto T, Miyake A (1991). Defensive function of trichocysts in *Paramecium*. Journal of Experimental Zoology 260: 84–92 ; Knoll G, et al., Local trichocyst exocytosis provides an efficient escape mechanism for *Paramecium* cells, https://data.zhenzhi.com/details/1/1006107059 ; NIES record, https://www.nies.go.jp/chiiki1/protoz/refere/id7999/7328.htm | Abstracts: mutants eaten 9–45× faster; backward-swimming mutants escaped nearly as often |
| C15 | Trichocysts against *Didinium* | Miyake A, Harumoto T (1996). Defensive function of trichocysts in *Paramecium* against the predatory ciliate *Monodinium balbiani*. European Journal of Protistology. doi:10.1016/S0932-4739(96)80048-4, https://data.zhenzhi.com/details/1/881629731 | Abstract |
| C16 | *Didinium* attack | Wessenberg H, Antipa G (1970). Journal of Protozoology 17: 250–270. doi:10.1111/j.1550-7408.1970.tb02366.x ; Cell Image Library captions, https://www.cellimagelibrary.org/browse/organism/Didinium%20nasutum | Abstract and captions; no timings |
| C17 | *Chlorella* protection | Summerer M, Sonntag B, Sommaruga R (2009). Symbiotic algae protect *Paramecium bursaria* from UV. Protist. https://www.ciliates.at/en/wp-content/uploads/2013/10/UV_photoprotection_paramecium_bursaria1.pdf ; Berger J (1980), *Didinium* feeding on *P. bursaria*, https://www.microbiologyresearch.org/content/journal/micro/10.1099/00221287-118-2-397 | UV: abstract; *Didinium*: abstract summary only |
| C18 | *Paramecium* acid and CO₂ rings | Wagner (historical); Biology Classics teaching guide, https://dcmp.org/guides/TID6199.pdf | Historical and teaching sources |
| C19 | Violacein and quorum sensing | Matz C, et al. (2004). Impact of violacein-producing bacteria on survival and feeding of bacterivorous nanoflagellates. Applied and Environmental Microbiology 70: 1593. https://pmc.ncbi.nlm.nih.gov/articles/PMC368400 ; Matz C, et al. (2008). Marine biofilm bacteria evade eukaryotic predation by targeted chemical defense. PLoS ONE 3: e2744. doi:10.1371/journal.pone.0002744 ; Chemistry World news, https://chemistryworld.com/news/biofilms-deploy-chemical-weapons/3000541.article | Abstracts and news |
| C20 | Escape of multicellular magnetotactic prokaryotes | Yang, Prakash, Brumley (2024). Escape motility of multicellular magnetotactic prokaryotes. https://pmc.ncbi.nlm.nih.gov/articles/PMC11480751 | Abstract |
| C21 | Plastic resistance to *Bdellovibrio* | Shemesh Y, Jurkevitch E (2004). Plastic phenotypic resistance to predation by *Bdellovibrio* and like organisms in bacterial prey. Environmental Microbiology 6: 12–18. https://cris.huji.ac.il/en/publications/plastic-phenotypic-resistance-to-predation-by-bdellovibrio-and-li/ | Abstract |
| C22 | S-layer and predatory bacteria | Santin YG, et al. (2024). Lifecycle of a predatory bacterium vampirizing its prey through the cell envelope and S-layer. Nature Communications 15. https://pmc.ncbi.nlm.nih.gov/articles/PMC11055950/ ; Koval SF, Hynes SH (1991) | Abstracts |
| C23 | *Stentor* contraction | High-speed analysis of *Stentor coeruleus* contraction, https://pmc.ncbi.nlm.nih.gov/articles/PMC2409986/ ; habituation study, https://par.nsf.gov/servlets/purl/10448642 | Abstracts: 10–20 ms contraction; re-extension about a minute |
| C24 | T4 DNA modification | Vlot M, et al. (2018). Bacteriophage DNA glucosylation impairs target DNA binding by type I and II but not by type V CRISPR–Cas effector complexes. Nucleic Acids Research. https://pmc.ncbi.nlm.nih.gov/articles/PMC5778469/ ; Bryson AL, et al. (2015), mBio ; Yaung SJ, Esvelt KM, Church GM (2014), disagreeing result ; spacer study, https://pmc.ncbi.nlm.nih.gov/articles/PMC7654273 | Abstracts |
| C25 | Anti-CRISPR cooperation | Landsberger M, et al. (2018). Anti-CRISPR phages cooperate to overcome CRISPR-Cas immunity. Cell 174: 908–916. https://pubmed.ncbi.nlm.nih.gov/30033365/ ; Borges AL, et al. (2018). Bacteriophage cooperation suppresses CRISPR-Cas3 and Cas9 immunity. Cell. | Abstracts |
| C26 | Multiplicity reactivation | Luria SE (1947). Reactivation of irradiated bacteriophage by transfer of self-reproducing units. PNAS 33: 253–264. NLM profile, https://profiles.nlm.nih.gov/101584611X91 ; Luria–Latarjet genetics, https://resolve.cambridge.org/core/journals/genetics-research/article/genetics-of-the-lurialatarjet-effect-in-bacteriophage-t4-evidence-for-the-involvement-of-multiple-dna-repair-pathways/E6946EEE04EA61231E4F95034993CC57 | Summaries |
| C27 | Lysis inhibition | Paddison P, et al. (1998). The roles of the bacteriophage T4 r genes in lysis inhibition and fine-structure genetics. Genetics. https://pmc.ncbi.nlm.nih.gov/articles/PMC93942 | Abstract: delay of up to several hours; burst about 1,000 |
