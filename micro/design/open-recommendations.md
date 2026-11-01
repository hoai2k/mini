# Micro Zoom: open recommendations

Written on 2026-11-01, after the first big pass on performance, crowds, bosses and world mechanics. Last updated 2026-11-01 (pre-deploy audit: resolved and rings-era items removed, the audit's open items added under "From the pre-deploy audit").

This file lists every recommendation for the game that is **not built yet**. It reads the design notes, the world READMEs and the notes from that pass. Built things are left out. The built list is in the world READMEs.

**How to keep it up to date**

- When you build an item, delete its line. Do not tick it off. Say what you built in the world's README.
- When a design note proposes something new, add one line under the right heading. Give the date in the commit message.
- Keep one line per item: what it is, why, the source link, and an effort tag.
- Effort tags: **[Small]** is under a day, **[Medium]** is a few days, **[Large]** is a week or more.
- Items marked "check" may already be done. Grep the code, then delete the line or drop the word "check".
- Update the date at the top of this file when you change it.

---

## Performance

Source for most lines: [`performance.md`](performance.md), "Fixes, ranked".

- [Medium] Move the tardigrade body bend and leg frames into the vertex shader. The CPU skip is done, but the real fix removes the per-creature upload for good. Source: [performance.md](performance.md) (T2).
- [Small] Tardigrade: reuse one matrix per claw and other temporaries to cut garbage. Check. Source: [performance.md](performance.md) (T4).
- [Small] Amoeba: compute the density gradient once per step instead of four lookups per granule. Check. Source: [performance.md](performance.md) (A4).
- [Small] Make the quality governor on by default in every world, with a "fixed quality" switch in the developer features. Check. Source: [performance.md](performance.md) (owner question 4).
- [Medium] Throttle predators and wandering creatures that no player can see to 20 to 30 updates a second. Nobody sees them, and it saves CPU in every world. Source: [performance.md](performance.md) (Trade-off T11).
- [Medium] Springtail: run the ripple wave at 120 Hz instead of 240, or move it to the GPU. The GPU way needs a small read-back for the height under the player. Source: [performance.md](performance.md) (Trade-off T4).
- [Medium] Amoeba: run the cytoplasm at 30 Hz and blend between steps. Less visible than cutting the granules. Only if the work already done is not enough. Source: [performance.md](performance.md) (Trade-off T7, T8).
- [Small] Paramecium: draw fewer cilia on other players' cells, or use three buffers instead of four, if the governor must drop below 0.6 scale. Source: [performance.md](performance.md) (Trade-off T9).
- [Medium] Phage: draw the ink outlines in a screen pass instead of inverted hulls. Only if phage is still over budget. It changes the look, so it is the owner's call. Source: [performance.md](performance.md) (Trade-off T5).
- [Medium] Mite: a lighter G-buffer (16-bit colour plus a separate depth). Compare screenshots for banding first. Not needed for 60 fps. Source: [performance.md](performance.md) (Trade-off T6).
- [Small] Draw the title background at pixel ratio 1 and stop at five nested fields. Optional, because it does not run in play. Source: [performance.md](performance.md) (Trade-off T12).
- [Large] Compress textures with KTX2. It would cut texture memory (60 to 100 MB per world) and load time, but needs a decoder and a new step in the art pipeline. Source: [performance.md](performance.md).


### From the second performance pass (2026-11-01)

Each of these was left out because it changes the picture or feel, or needs more work than a safe pass. Source: [performance.md](performance.md) (Second pass).

- [Small] Shared: cache the landmark marks (now only the backdoor's ring) as sprites (not pixel-identical, so needs a look).
- [Medium] Shared: skip redrawing an unchanged landmark overlay; the mite and amoeba draw on its canvas, so it needs a small API.
- [Small] Shared: rings a world draws on the landmark canvas can smear on a frame with no landmark (latent; nothing shows it today).
- [Small] Springtail: re-save the big PNG textures as lossless WebP (about 2–3 MB less to load).
- [Small] Shell: load the zoom transition player during the intro (about 200 ms off the first transition; could stutter a running world).
- [Small] Mite: 3 mm chunks (98 fewer draws, 360 k more triangles), a trade.
- [Small] Mite: lower-poly springtails at the far edge of the thicket crowd (about 100 k triangles per view; slightly changes the look).
- [Medium] Amoeba: replace three.js mask triangulation (about 600 KB a frame of garbage).
- [Small] Amoeba: granules at 30 Hz (about 30% less granule CPU; motion less smooth).
- [Medium] Springtail: cache the SDF meshes between visits (1.2 s at startup, returning players only).
- [Small] Springtail: the ripple wave step costs about 2 ms a frame. A cheaper step (0.35 ms) is in as the Features switch "Cheaper ripples (experimental)", off by default: try it, then decide whether it becomes the default.
- [Small] Paramecium: thin far bloom cells and freeze members far from every player (about 30% of the bloom's fill; visible; freezing needs `shared/crowd.js`).
- [Small] Tardigrade: lower-poly rotifers (visible, small gain).
- [Medium] Bacterium: the remaining `draw.js` / `stepCell` garbage, about 300 KB a frame (no visible change).
- [Small] Phage: per-look shader variants (small gain; recompiles when the look changes).
- [Small] Phage: background noise at quarter resolution (about 40% of the final pass; slightly softer). Deferred in the third pass because it changes the look.
- [Small] Perf harness: runs get only 5–8 frames on a loaded machine and its 4-player spread never splits the screen; widen the spread and lengthen runs.

## From the pre-deploy audit (2026-11-01)

What the audit found and did not fix (fixed items are in the commit log; the run notes are in the audit report).

- [Small] Shell: the continuous transition waits 25 s for the next world to be ready. Under software rendering the amoeba (about 30 s to ready) and the mite (about 35 s) can miss that, and the move falls back to the microscope zoom (seen once, tardigrade → amoeba, a player put straight onto the portal). Start the preload a little earlier, or keep waiting while the load is visibly progressing. Source: `game/src/main.js` (`continuousForward`).
- [Medium] Amoeba: a scripted cell steering at the portal from the 90° bearing (Chaos stood down) crawled 90–140° off its command for about 20 s once it was ~200 µm from the portal and did not reach it in 240 s; from 0°, 45° and 270° it reached it in 81–158 s with no snag, and no run wedged for more than ~15 s. The cause is not isolated (not Chaos, not a trap catch); playtest the approach with a controller. Source: `prototypes/amoeba/README.md` (Checks).
- [Small] Tardigrade: the 180° and 210° spokes' hand-over gaps (0.47–0.57) sit at the claws' reach (0.55, 1.2 across a wet film). A scripted walker steering along each leaf ping-ponged between two overlapping leaves of the 210° spoke (leaves 2 and 3, about 5.1 mm out) for over two minutes. Playtest those spokes; consider moving their leaves a little closer. A few spoke leaves also cut through each other near the shoot (looks only). Source: `prototypes/tardigrade/world.js`.
- [Small] Tardigrade → amoeba: the glimpsed *Amoeba proteus* is rounder than the amoeba world's opening cell and holds green inclusions that vanish in the crossfade. Match the glimpse to the opening cell. Source: `prototypes/tardigrade/landmarks.js`.
- [Small] Paramecium → bacterium: the spirillum's glint is still small at the freeze (the portal's glow now dims through the slow-down); a larger glint at the freeze would make the target clearer. Source: `prototypes/paramecium/main.js` (`stepSpirillum`, `spirGlint`).
- [Small] `publish.sh` copies the test scripts (`*.test.mjs`, `phage/play-check.mjs`) into the deployed site. Harmless, but they are not needed there.
- [Small] Shell: at a short window (960×540) the intro card's text runs past the bottom (the forward-landmark line is cut off).
- [Small] Phage: a player who joins during play is not carried on (its `embed.join` sends no roster, unlike the other six worlds); it matters only once the phage leads somewhere (the return journey, or Back). Source: `prototypes/phage/main.js` (`onJoin`).
- [Small] Stale comments from the rings era: `prototypes/tardigrade/predator.js` ("halfway"), `prototypes/springtail/main.js` ("the rings round the start", `ZONES`), `prototypes/bacterium/main.js` ("oxygen and starvation"). Comments only; the behaviour is the director's.

## Springtail

- [Medium] Dunked, not dead: a strider grab or a raindrop pushes you under, and the air layer pops you back up. It turns a death into a scare. Source: [combat-ideas.md](combat-ideas.md) (springtail idea 4).
- [Small] Hold B in the air to raise the chance of an upright landing. It makes the 15% tumble a choice. It needs a label as a departure. Source: [combat-ideas.md](combat-ideas.md) (springtail idea 3).
- [Medium] Meniscus climbing: reach the moss edge by climbing the curved film at a stem. Source: [zoom-chain-levels.md](zoom-chain-levels.md) (0.7).
- [Small] Sundew glue drops on the bank that stick you, with A to wriggle free only near the leaf edge. The sundew patch exists, but not the drops. Source: [combat-ideas.md](combat-ideas.md) (springtail idea 6).
- [Medium] Wolf spider and a teammate: a co-op landing pulls the spider round, so the other player can nip a tarsus from behind. Check how far the flank rule goes. Source: [combat-ideas.md](combat-ideas.md) (springtail boss note).
- [Large] On moss, climb through the branches instead of walking over the tops. Source: [springtail README](../prototypes/springtail/README.md) (known issues).
- [Large] Real shadow maps for the sun, in place of soft round blobs. Source: [springtail README](../prototypes/springtail/README.md) (known issues).

## Mite

- [Small] Seal timing: closing up (held Y) takes about 0.3 s. A strike on a sealed box goes "clank" and costs the predator a lot of interest. A strike during closing is only partly blocked. It makes the defence a skill. Source: [combat-ideas.md](combat-ideas.md) (mite idea 1).
- [Medium] Armour gauge: a pseudoscorpion grip drains it, and teammates bite its pincer joints to help. It makes "close up and wait" honest. Source: [combat-ideas.md](combat-ideas.md) (mite idea 2).
- [Medium] Shepherd the juvenile (co-op): a soft juvenile follows you and gamasids want it. Adults shield it. Source: [combat-ideas.md](combat-ideas.md) (mite idea 3), [zoom-chain-levels.md](zoom-chain-levels.md) (1.7).
- [Medium] Oil cloud (Y) for a cousin character: a repellent puff, one charge, refilled slowly. Give it to a cousin only, because the box mite has lost its oil. Source: [combat-ideas.md](combat-ideas.md) (mite idea 4).
- [Medium] Pseudoscorpion ambush: the tell is a pincer tip in a crevice, and it chases once you pass. Phase two brings in a bolder nymph. Source: [combat-ideas.md](combat-ideas.md) (mite boss note).
- [Medium] Rove beetle set piece: only legs and jaws cross the screen, and you wedge into a gap narrower than its head. Source: [zoom-chain-levels.md](zoom-chain-levels.md) (1.7).
- [Small] Seal and drop: a closed box falls off the leaf and rolls away. Low fidelity (no study measures it), so it is optional. Source: [combat-ideas.md](combat-ideas.md) (mite idea 5).

## Tardigrade

- [Large] Scent trails: you leave a fading trail that *Milnesium* follows. Doubling back or crossing water muddles it. It turns the level into stealth and route finding. Source: [combat-ideas.md](combat-ideas.md) (tardigrade idea 1).
- [Medium] Too big to swallow: piercing algae grows you, and small hatchlings then give up on you. Source: [combat-ideas.md](combat-ideas.md) (tardigrade idea 3).
- [Small] Brace as an anchor: a full brace holds you against the whip, and without it you are knocked into thicker film. Check how much of this the boss already does. Source: [combat-ideas.md](combat-ideas.md) (tardigrade idea 4).
- [Medium] Nematode latch: if the whip lands, the tooth latches on. Brace to slow the pull while a teammate jabs the head; alone, mash a wriggle. Source: [combat-ideas.md](combat-ideas.md) (tardigrade boss note).
- [Large] Rotifer chapter, "Dry up and blow away": play the rotifer, find a dry leaf and enter dormancy. Source: [zoom-chain-levels.md](zoom-chain-levels.md) (2.7).
- [Medium] Focal-plane puzzle: a hidden gun cell shows in one focal slice only, so you scrub focus to find it. Source: [zoom-chain-levels.md](zoom-chain-levels.md) (2.7).
- [Small] Rotifer meadow: check the performance at four players. Tonight's pass left this in progress. Source: [tardigrade README](../prototypes/tardigrade/README.md).

## Amoeba

- [Medium] Sacrifice a pseudopod: a pseudopod stuck to a hypha can be let go (B) to save the body. The hypha traps exist; check that this release is fully built. Source: [combat-ideas.md](combat-ideas.md) (amoeba idea 1).
- [Large] The nucleus is the life: show your nucleus, make mass your health, and let a lost arm cost cytoplasm. A food cup only kills if it closes round the nucleus. Source: [combat-ideas.md](combat-ideas.md) (amoeba idea 2).
- [Medium] Multi-nucleus twist for *Chaos*: an arm cut off with a nucleus inside crawls off as a small *Chaos*. Nuclei streaming into an arm is the tell. Source: [combat-ideas.md](combat-ideas.md) (amoeba idea 3).
- [Small] Joint food cup (co-op): two players wrap prey too big for one. It is a departure, since amoebae do not cooperate. Source: [combat-ideas.md](combat-ideas.md) (amoeba idea 4).
- [Medium] Heliozoan in darkfield: switching to darkfield reveals axopods, at the cost of a short pause. Source: [zoom-chain-levels.md](zoom-chain-levels.md) (3.7).

## Paramecium

- [Small] Show the trichocyst stock as a clearer gauge (now 3 charges, one back every 9 s) and tie the refill to a longer, honest time. Check what the HUD shows. Source: [combat-ideas.md](combat-ideas.md) (Paramecium idea 2).
- [Medium] Green shield: algae are armour in bright water, and a cell that loses them in shade is fragile. Shade now slows only the dash recharge. Source: [combat-ideas.md](combat-ideas.md) (Paramecium idea 3).
- [Medium] *Didinium* tether and a teammate's ram that knocks the proboscis off. Today a hold ends in a capture. It is a departure. Source: [combat-ideas.md](combat-ideas.md) (Paramecium idea 4).
- [Medium] The suctorian forest: a minefield where moving fast protects you. Source: [zoom-chain-levels.md](zoom-chain-levels.md) (3.7).
- [Small] A brightfield habitat backdrop: brightfield has no plate in `shared/techniques/paramecium-microscope.js`, so its richness comes only from the scene (`ambient.js`). Adding one changes a shared module that other prototypes borrow. Source: [paramecium README](../prototypes/paramecium/README.md) (Look and roll).
- [Small] The CO2 ring (co-op): a weak-acid ring round a bubble as a safe spot. Low value and not shown to protect, so it is optional. Source: [combat-ideas.md](combat-ideas.md) (Paramecium idea 5).
- [Large] Level 4, *Trachelomonas* (find the light, *Peranema*, the chytrid storm). It is not in the chain; the zoom skips it. Source: [zoom-chain-levels.md](zoom-chain-levels.md) (4.7), [zoom README](../prototypes/zoom/README.md).

## Bacterium

- [Medium] Coordinated escape run (co-op): when bound cells all press A within a short window, the whole colony launches along the field line. Source: [combat-ideas.md](combat-ideas.md) (bacterium idea 3).
- [Small] Hardened survivor: after shaking off *Bdellovibrio*, you are briefly harder to attach to. Source: [combat-ideas.md](combat-ideas.md) (bacterium idea 4).
- [Small] Last-moment reverse: a pause on contact before the pili grab, which a reverse (B) beats. The pause is unverified, so label it. Source: [combat-ideas.md](combat-ideas.md) (bacterium idea 5).
- [Small] *Stentor* habituation: each later bump at its foot works less well, and re-extension is long and safe. Today a bump pauses it for 3.5 s every time. Source: [combat-ideas.md](combat-ideas.md) (bacterium boss note).
- [Medium] Play as *Bdellovibrio*: sprint, collide, attach, enter, grow and burst. Source: [zoom-chain-levels.md](zoom-chain-levels.md) (5.9).
- [Small] Check *Stentor* in modes other than phase contrast. Source: tonight's notes.
- [Small] Add a button or clearer cue for leaving the collective. Today you leave by moving 20 µm away. Source: tonight's notes.

## Phage

- [Medium] The glucose coat: restriction enzymes slide off you, Cascade scans more slowly, and a rare Cas12a enemy ignores the coat. Source: [combat-ideas.md](combat-ideas.md) (phage idea 2).
- [Medium] Holding the host: each further player who injects delays the burst and enlarges it, and gives CRISPR longer to scan. Source: [combat-ideas.md](combat-ideas.md) (phage idea 3).
- [Medium] The first one in pays: a cut injection leaves the host weakened for a while, so a second player can get in. A departure for T4. Source: [combat-ideas.md](combat-ideas.md) (phage idea 4).
- [Small] Escape mutant: after a Cas3 cut, a small chance you respawn as a variant the complex ignores. Source: [combat-ideas.md](combat-ideas.md) (phage idea 5).
- [Large] Lineage play: after a burst, pick which new phage to follow. Source: [zoom-chain-levels.md](zoom-chain-levels.md) (6.5).
- [Medium] Real Brownian drift in the zoom player: the phage there drifts without it (the phage world now has molecular kicks). Source: [zoom README](../prototypes/zoom/README.md) (known issues).
- [Medium] Richer host membrane: a true membrane mesh with a lipid-headgroup texture (MP-V05 gives its albedo) under the bead forest, and true transmission. The revamp (2 November 2026) did the density: GPU baths of bead-cluster molecules in every direction, hosts furred all round. Source: [phage LOOK.md](../prototypes/phage/LOOK.md).
- [Small] Phage: ambient occlusion that spares the phage's own glow (the pass darkens creases on it too). Source: [phage LOOK.md](../prototypes/phage/LOOK.md).
- [Small] Phage: keep the bath's molecules out of the flocs and the stray phage too (only hosts, the amoeba and the clay are solids in the shader now). Source: [phage README](../prototypes/phage/README.md) (known issues).
- [Small] Phage: a kick sound of its own (a soft click per strike, pitched by the molecule's size); the strikes are silent except for proteins, which reuse the bacterium's tumble. Source: [phage README](../prototypes/phage/README.md).
- [Medium] Phage: impostor beads for the far bath at quarter resolution, or MP-V07's sprites, if the bath's fill is too much on weak GPUs (software WebGL halves the frame rate against the old slab). Source: [phage README](../prototypes/phage/README.md) (performance, revamp).
- [Small] Phage: the UV shafts are vertical columns (sunlight comes from the surface), so a phage heading straight up or straight down meets none of that shell; the flocs, decoys and the portal do meet every bearing. Source: [phage README](../prototypes/phage/README.md) (threats and pacing).
- [Medium] Phage: a second guard behaviour for co-op (the lobe splits its attention between two phages, so one lures while the other slips in). Source: [encounter pattern](encounter-pattern.md).
- [Small] Phage, owner's call: an optional chase camera that turns slowly behind the travel direction (the revamp keeps the view where you leave it, which fixes the spin). Source: [phage README](../prototypes/phage/README.md).

## Game shell

- [Large] The continuous transition going up (the backdoors): every forward pair from the springtail to the phage is continuous; Back still plays the microscope zoom out. Source: [game README](../game/README.md) (The continuous transition).
- [Small] Give the springtail's mite speck a finer model for the push-in (today a glossy ellipsoid with stick legs; it reads well only as a speck, so the crossfade runs while it is still small). Source: [game README](../game/README.md) (The continuous transition).
- [Large] The glowing return journey: after a Phage clear, go back up through every world with a glowing creature and end at the fingertip. Not built; the Phage ending is "Work in progress". Source: [super-gene-return.html](super-gene-return.html), [game README](../game/README.md).
- [Medium] Wire the real worlds into the zoom prototype in place of its look-alike stand-ins. Source: [zoom README](../prototypes/zoom/README.md) (known issues).
- [Small] Show the time stretch or squeeze on screen for each level (slow motion in strikes, fast-forward in drying, compressed rearming). Check which levels do. Source: [movement.md](movement.md) (time scale table).
- [Small] Keep the zoom frame visible on small targets (transitions 5 and 6), and stop the HUD panels overlapping on short windows. Source: [zoom README](../prototypes/zoom/README.md) (known issues).
- [Small] Let a controller alone open fullscreen and sound without a mouse click. Source: [game README](../game/README.md) (known issues).

## Art and sound

- [Medium] Sound for the phage world: a humic-water ambience, fibre ticks, a sheath snap, a DNA zipper, an enzyme clamp, a capsid crack and the lysis burst. It reuses the bacterium's sounds now. Source: [phage README](../prototypes/phage/README.md).
- [Small] Add sound prompts for the new mechanics (collective join and leave, quorum shield, rotifer meadow, bloom gulp). Check which were added. Source: [sound-effects.md](sound-effects.md).
- [Small] No music ideas are written yet. Decide whether the game wants music at all; if so, write a short brief first. Source: [sound-effects.md](sound-effects.md).
- [Small] The rest-state looks in the zoom hand-off could use the delivered images. Source: [zoom README](../prototypes/zoom/README.md).

## Known issues

Tonight's "open" lines, plus items in the world READMEs.

- [Medium] Tardigrade: the rotifers in the meadow read mostly as blobs at high zoom; add the corona and foot detail. Source: tonight's notes.
- [Small] Springtail: the first frame takes about 6 s in software rendering (7.4 s before the second performance pass); caching SDF meshes would cut more. Source: [performance.md](performance.md) (Second pass).
- [Medium] Paramecium: *Dileptus* engages in some test runs and not others. Tune its homing. Source: tonight's notes.
- [Small] Phage: text labels use the shared camera, so in a split they sit in the merged position. Source: [phage README](../prototypes/phage/README.md).
- [Small] Zoom: the springtail shows as a dark shape at the top of the amoeba and Paramecium fields. Source: [zoom README](../prototypes/zoom/README.md).
