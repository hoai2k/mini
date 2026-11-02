# Micro prototypes: sound effects

Generated with ElevenLabs sound effects (`eleven_text_to_sound_v2`) by [`source/build_audio.py`](source/build_audio.py); edit the data there and rerun it. Loops are generated as loops and crossfaded tail-to-head so they repeat seamlessly; everything is loudness-matched (loops at -20 LUFS, one-shots at -17). The prototypes play them through `micro/prototypes/shared/audio.js`.

Nothing makes a sound we could hear at these scales, so this is nature-documentary foley, as a wildlife film of these scenes would score them: each sound is what the action would feel like if you could hear it, scaled to the creature. The deeper the zoom, the more abstract it gets: bog and moss sounds for the springtail and mite, wet and viscous sounds for the water film and the pool, fizzing and rotary motor sounds for the bacterium.

## Shared (every world)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `shared/portal-chime` | oneshot | 2.5 s | 1 | Going through a portal (the way on): the success chime before the freeze and the zoom into the next world. |
| `shared/portal-appear` | oneshot | 2.5 s | 1 | The way on unseals: the portal's light first appears (every earlier encounter met). |
| `shared/portal-near` | oneshot | 1.2 s | 2 | Arriving at the open portal: the "Y Enter the portal" prompt appears. |
| `shared/portal-enter` | oneshot | 1.2 s | 1 | Y at the open portal: being drawn in (just before the success chime). |
| `shared/slowdown` | oneshot | 3.0 s | 1 | The success slow-down: time easing to a freeze frame after the chime. |
| `shared/portal-sealed` | oneshot | 0.8 s | 2 | Y at a sealed or guarded portal: "not yet". |
| `shared/backdoor` | oneshot | 1.5 s | 1 | Y at the backdoor: back up a world. |
| `shared/danger` | oneshot | 1.2 s | 3 | A predator's wind-up tell (any world): something is about to strike. |
| `shared/block` | oneshot | 0.6 s | 2 | A braced block: a predator's strike glances off (any world). |
| `shared/hit` | oneshot | 0.6 s | 2 | Hit, knocked or stunned (any world). |
| `shared/death` | oneshot | 2.5 s | 1 | Death: the body dissolves into motes (any world without its own). |
| `shared/reform` | oneshot | 2.0 s | 1 | Re-forming: motes gathering into a fresh body. |
| `shared/foe-flees` | oneshot | 1.5 s | 1 | A predator gives up and retreats. |
| `shared/join` | oneshot | 0.8 s | 1 | Another player joins. |

## Springtail (bog surface)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `springtail/amb-bog` | loop | 12 s | 1 | Ambience: the bog pool surface at springtail height. |
| `springtail/jump` | oneshot | 0.6 s | 3 | A (dash): the furcula jump. |
| `springtail/land-water` | oneshot | 0.5 s | 3 | Landing on the water film. |
| `springtail/land-sticky` | oneshot | 1.0 s | 1 | Landing on a sundew leaf: stuck. |
| `springtail/eat` | oneshot | 0.6 s | 2 | X (eat): grazing pollen and spores. |
| `springtail/raindrop` | oneshot | 1.5 s | 1 | A raindrop cratering the pool next to you. |
| `springtail/stenus-skim` | oneshot | 1.2 s | 1 | The rove beetle skimming across the water. |
| `springtail/stenus-strike` | oneshot | 0.5 s | 1 | The rove beetle's harpoon strike. |
| `springtail/charge` | oneshot | 0.8 s | 1 | Holding A: cocking the furcula (charging a jump). |
| `springtail/flip` | oneshot | 0.6 s | 2 | Landing on its back (the back-landing flip). |
| `springtail/right` | oneshot | 0.5 s | 2 | Righting itself after a back landing. |
| `springtail/pounce` | oneshot | 0.5 s | 2 | The pounce-bite landing on a foe. |
| `springtail/glue-snap` | oneshot | 0.5 s | 3 | A sundew glue strand thinning and snapping. |
| `springtail/struggle` | oneshot | 0.8 s | 2 | Wriggling and kicking in sundew glue. |
| `springtail/tear-free` | oneshot | 0.8 s | 1 | Tearing free of the sundew. |
| `springtail/sundew-fold` | oneshot | 2.5 s | 1 | Slipped back: the tentacles fold over and the leaf cups. |
| `springtail/strider` | oneshot | 1.5 s | 1 | The water strider skating in. |
| `springtail/spider` | oneshot | 2.0 s | 1 | The pond wolf spider (boss) stalking over the moss. |
| `springtail/spider-lunge` | oneshot | 1.0 s | 2 | The wolf spider's lunge. |

## Mite (moss canopy, SEM)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `mite/amb-moss` | loop | 12 s | 1 | Ambience: inside the moss cushion. |
| `mite/step` | oneshot | 0.5 s | 4 | Footfalls (rate follows the gait). |
| `mite/dash` | oneshot | 1.0 s | 1 | A (dash): the scramble. |
| `mite/close` | oneshot | 0.8 s | 1 | B: closing into the armoured capsule. |
| `mite/open` | oneshot | 0.8 s | 1 | Opening up again. |
| `mite/bite` | oneshot | 0.5 s | 2 | X: chelicerae bite. |
| `mite/blade` | oneshot | 0.8 s | 3 | Pushing past a moss blade, which springs back. |
| `mite/predator` | oneshot | 1.5 s | 1 | The predatory mite closing in. |
| `mite/jump` | oneshot | 0.5 s | 2 | The jump launch (A). |
| `mite/land` | oneshot | 0.5 s | 3 | Landing from a jump. |
| `mite/crouch` | oneshot | 1.0 s | 1 | Holding A: the crouch quivering at full charge. |
| `mite/strike` | oneshot | 0.5 s | 3 | X: the lunge and chelicerae snap (every press). |
| `mite/devour` | oneshot | 1.8 s | 1 | Eating a springtail (the devour). |
| `mite/drop-fall` | oneshot | 1.5 s | 1 | A drop of water falling into the moss. |
| `mite/drop-splash` | oneshot | 1.2 s | 2 | The drop splashing down beside the mite. |
| `mite/predator-windup` | oneshot | 1.0 s | 1 | The predatory mite rears to strike (wind-up). |
| `mite/predator-strike` | oneshot | 0.6 s | 2 | The predatory mite's strike. |
| `mite/glance` | oneshot | 0.5 s | 2 | A strike sliding off the closed capsule. |
| `mite/pincer` | oneshot | 0.8 s | 2 | The pseudoscorpion's pincer snapping. |

## Tardigrade (water film)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `tardigrade/amb-film` | loop | 12 s | 1 | Ambience: inside the water film on a moss leaf. |
| `tardigrade/step` | oneshot | 0.5 s | 4 | Footfalls: a padded squish with a claw tick. |
| `tardigrade/dash` | oneshot | 1.0 s | 1 | A (dash): the scramble. |
| `tardigrade/bite` | oneshot | 0.6 s | 2 | X: stylets pierce a cell. |
| `tardigrade/tun` | oneshot | 2.5 s | 1 | Y: drying into a tun. |
| `tardigrade/revive` | oneshot | 2.5 s | 1 | Rehydrating out of the tun. |
| `tardigrade/rain` | oneshot | 4.0 s | 1 | Rain arriving on the moss. |
| `tardigrade/milnesium` | oneshot | 1.5 s | 1 | The predatory tardigrade lunging. |
| `tardigrade/attack` | oneshot | 0.6 s | 3 | X at a foe: the lunge and stylet snap. |
| `tardigrade/impact` | oneshot | 0.6 s | 2 | The attack landing on a foe. |
| `tardigrade/feed` | oneshot | 1.5 s | 2 | Feeding: sucking a cell's contents through the stylets. |
| `tardigrade/brace` | oneshot | 0.6 s | 1 | B: gripping hard, claws digging in. |
| `tardigrade/prionchulus` | oneshot | 2.0 s | 1 | Prionchulus (the nematode boss) thrashing. |
| `tardigrade/whip` | oneshot | 0.8 s | 2 | Prionchulus's whip strike. |

## Amoeba (pool)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `amoeba/amb-pool` | loop | 12 s | 1 | Ambience: the pool, very viscous and slow. |
| `amoeba/stretch` | oneshot | 1.5 s | 3 | A pseudopod flowing out. |
| `amoeba/boost` | oneshot | 1.0 s | 1 | A (dash): the surge. |
| `amoeba/engulf` | oneshot | 1.5 s | 1 | X: the food cup closing round prey. |
| `amoeba/vacuole` | oneshot | 0.5 s | 2 | The contractile vacuole emptying. |
| `amoeba/digest` | oneshot | 2.0 s | 1 | Digesting a food vacuole. |
| `amoeba/drain` | loop | 6 s | 1 | Being drained by a trap fungus (the stain spreading, the membrane trembling). |
| `amoeba/tremble` | oneshot | 1.0 s | 2 | The membrane trembling where it is drained or poisoned. |
| `amoeba/squish` | oneshot | 0.6 s | 3 | Subtle: the cell changing shape (spread, round up). |
| `amoeba/roll` | oneshot | 1.0 s | 2 | Subtle: the cell turning (rotating). |
| `amoeba/stick` | oneshot | 0.6 s | 1 | Touching a sticky trap hypha: stuck. |
| `amoeba/tear` | oneshot | 0.8 s | 2 | Tearing free of a trap (the surge breaks out). |
| `amoeba/pierce` | oneshot | 0.8 s | 1 | Haustoria piercing the membrane. |
| `amoeba/pinch` | oneshot | 0.8 s | 2 | X: pinching off Chaos's pseudopod. |
| `amoeba/chaos` | oneshot | 2.5 s | 1 | Chaos, the giant amoeba, flowing in. |
| `amoeba/chaos-windup` | oneshot | 1.5 s | 1 | Chaos rears its pseudopods to cup (or gathers to lunge). |
| `amoeba/chaos-engulf` | oneshot | 2.0 s | 1 | Cupped and engulfed by Chaos. |
| `amoeba/death` | oneshot | 2.5 s | 1 | The cell goes slack and breaks up. |
| `amoeba/reform` | oneshot | 2.0 s | 1 | A fresh cell gathers itself up. |

## Paramecium (pool)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `paramecium/amb-pool` | loop | 12 s | 1 | Ambience: open pond water. |
| `paramecium/swim` | loop | 6 s | 1 | The cilia beating (volume and rate follow the swim speed). |
| `paramecium/dash` | oneshot | 0.8 s | 1 | A (dash): the sprint. |
| `paramecium/gulp` | oneshot | 0.6 s | 2 | X: a feeding gulp. |
| `paramecium/trichocysts` | oneshot | 0.8 s | 1 | X when touched: trichocyst discharge. |
| `paramecium/reverse` | oneshot | 0.8 s | 1 | B: the avoidance reaction. |
| `paramecium/didinium` | oneshot | 1.5 s | 1 | Didinium closing in. |
| `paramecium/held` | oneshot | 1.5 s | 1 | Held by Didinium's proboscis. |
| `paramecium/depth` | oneshot | 0.8 s | 2 | RS / LB / RB: moving deeper or shallower. |
| `paramecium/burst` | oneshot | 1.0 s | 1 | B with a charge: the trichocyst burst all round. |
| `paramecium/stun` | oneshot | 0.6 s | 2 | The jab landing: a foe stunned or staggered. |
| `paramecium/dileptus` | oneshot | 1.0 s | 1 | Dileptus winds its trunk back (the tell). |
| `paramecium/slash` | oneshot | 0.6 s | 2 | Dileptus's slash. |
| `paramecium/giant` | oneshot | 2.5 s | 1 | The giant amoeba reaching for you. |
| `paramecium/giant-engulf` | oneshot | 2.0 s | 1 | Closed round by the giant amoeba. |
| `paramecium/trap-tell` | oneshot | 1.5 s | 1 | The bladderwort trap's door quivering (about to fire). |
| `paramecium/trap-fire` | oneshot | 1.0 s | 2 | The bladderwort trap fires: a sudden suction. |
| `paramecium/divide` | oneshot | 1.5 s | 1 | The cell divides (prey goal reached). |
| `paramecium/vorticella` | oneshot | 0.6 s | 2 | A Vorticella's stalk contracting nearby. |
| `paramecium/bloom` | oneshot | 0.8 s | 1 | The dash flinging bloom cells aside. |

## Bacterium (sediment)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `bacterium/amb-sediment` | loop | 12 s | 1 | Ambience: Brownian motion in the sediment. |
| `bacterium/run` | loop | 4 s | 1 | The flagellar motor during a run (rate follows speed). |
| `bacterium/tumble` | oneshot | 0.6 s | 2 | B: a tumble. |
| `bacterium/sprint` | oneshot | 1.0 s | 1 | A (dash): the sprint run. |
| `bacterium/eat` | oneshot | 0.6 s | 2 | X: absorbing nutrients. |
| `bacterium/phage` | oneshot | 0.5 s | 1 | A phage latching on. |
| `bacterium/graze` | oneshot | 2.0 s | 1 | A grazer's feeding current pulling at you. |
| `bacterium/beacon` | oneshot | 1.2 s | 2 | X: the beacon (an autoinducer pulse from the flock's middle). |
| `bacterium/answer` | oneshot | 0.5 s | 3 | A kin cell answers the beacon. |
| `bacterium/join` | oneshot | 0.5 s | 3 | A kin cell joins the flock. |
| `bacterium/toxin` | oneshot | 1.5 s | 1 | Y: the toxin burst. |
| `bacterium/lyse` | oneshot | 0.6 s | 2 | A prey rod lysed. |
| `bacterium/strike` | oneshot | 0.5 s | 2 | A volley: the flock striking an enemy. |
| `bacterium/stentor` | oneshot | 3.0 s | 1 | Stentor's membranelles speeding up, its vortex brightening (the tell). |
| `bacterium/bdello` | oneshot | 0.6 s | 2 | Bdellovibrio ramming. |
| `bacterium/gate` | oneshot | 2.0 s | 1 | A gate beaten (a grazer or pack driven off). |
| `bacterium/infected` | oneshot | 0.8 s | 1 | A member lost to a phage. |

## Phage (bog water)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `phage/amb-water` | loop | 12 s | 1 | Ambience: crowded molecular bog water (the phage world). |
| `phage/grab` | oneshot | 0.5 s | 3 | X / RT: the fibres close on something. |
| `phage/release` | oneshot | 0.5 s | 2 | Letting go. |
| `phage/miss` | oneshot | 0.5 s | 1 | A grab with nothing in reach (or a wrong protein: slipping off). |
| `phage/throw` | oneshot | 0.5 s | 2 | Flinging a carried molecule. |
| `phage/fold` | oneshot | 0.6 s | 2 | B: folding the fibres back (and out again). |
| `phage/dash` | oneshot | 0.6 s | 2 | A: the dash forward. |
| `phage/jab` | oneshot | 0.5 s | 2 | X at the amoeba's lobe: a fibre jab. |
| `phage/lobe` | oneshot | 1.5 s | 1 | The amoeba's lobe rearing and lunging. |
| `phage/current-coming` | oneshot | 4.0 s | 1 | A current approaching (seen coming). |
| `phage/current-pass` | oneshot | 3.0 s | 1 | The current sweeping past. |
| `phage/latch` | oneshot | 0.6 s | 2 | The fibres latching on a receptor. |
| `phage/sheath` | oneshot | 1.0 s | 1 | The tail sheath contracting (the injection snap). |
| `phage/inject` | oneshot | 2.5 s | 1 | The DNA sliding into the host. |
| `phage/cas` | oneshot | 0.8 s | 2 | Cas3 swinging in to cut (inside the host). |
| `phage/burst` | oneshot | 2.5 s | 1 | The host bursting: forty new phages spill out. |
| `phage/snag` | oneshot | 0.8 s | 1 | Snagged in a humic floc, or stuck to clay. |

## Shell (menus and transitions; game/src/sound.js synthesises these today)

| Id | Kind | Length | Files | Used for |
| --- | --- | --- | --- | --- |
| `ui/move` | oneshot | 0.5 s | 3 | Menu focus moving (d-pad, stick, hover). |
| `ui/select` | oneshot | 0.6 s | 2 | Menu select (A). |
| `ui/back` | oneshot | 0.6 s | 2 | Menu back (B). |
| `ui/intro-in` | oneshot | 1.2 s | 1 | A world's intro card sliding in. |
| `ui/intro-out` | oneshot | 1.0 s | 1 | The intro card sliding away. |
| `ui/pause` | oneshot | 0.8 s | 1 | Pause. |
| `ui/resume` | oneshot | 0.8 s | 1 | Resume. |
| `ui/card` | oneshot | 0.8 s | 2 | The controls card opening (and closing). |
| `ui/zoom-in` | oneshot | 4.0 s | 1 | The zoom from one world into the next (the transition). |
| `ui/zoom-out` | oneshot | 3.0 s | 1 | The zoom back out to the previous world. |
| `ui/start` | oneshot | 2.0 s | 1 | Starting a game from the title. |

## Wiring (follow-up)

The sounds added on 2 November 2026 are generated but not played yet: the worlds' `main.js` files were being refactored at the time. Each goes in as a one-line `audio.play(id)` at the event named (and into that world's `createAudio([...])` list so it preloads). "(hook)" marks an event with no single line to hang it on yet. The shell's `ui/` sounds would replace the synthesised ones in `game/src/sound.js`, loaded from `../prototypes/assets/audio/ui/`.

| Id | Event | Where |
| --- | --- | --- |
| `shared/portal-enter` | Y at the open portal | every world's enterPortal() (springtail, amoeba, bacterium, paramecium, tardigrade, mite, phage), just before startOutro() |
| `shared/slowdown` | the success slow-down | every world's startOutro(), next to shared/portal-chime, with { delay: OUTRO.beat } (0.3 s; the bacterium and amoeba use their own outro timing) |
| `shared/portal-near` | "Y Enter the portal" appears | setPortalPrompt(on) when on turns true (amoeba, bacterium, mite, paramecium, tardigrade); springtail checkLandmark() where lm.readyOn becomes true; phage updatePortalPrompt() |
| `shared/portal-sealed` | Y at a sealed or guarded portal | where lm.log gets kind/type 'sealed': amoeba checkLandmarks(), bacterium landmarkTick(), mite checkLandmarks(), springtail checkLandmark(), tardigrade checkPortal(); phage tryGrab() at its 'do not take you yet' and guarded branches |
| `shared/portal-appear` | the way on unseals | (hook) each world's frame: on the edge where portalSealed() turns false (keep a wasSealed flag) |
| `shared/backdoor` | Y at the backdoor | next to embed.landmark('back'): mite goBack(), bacterium readInput() (landmark('back', P)), paramecium readInput(), phage stepMember(), amoeba frame() (c.atBack) |
| `shared/danger` | a predator's wind-up (generic) | springtail stepWorld() on e === 'windup' (Stenus and the strider); any wind-up below that has no sound of its own |
| `shared/block` | a braced block | springtail wearDown() for a block; tardigrade step() events 'blocked' (both Prionchulus and Milnesium; replaces the slowed tardigrade/bite) |
| `shared/hit` | knocked or stunned | mite stepLife() on a splash that reaches a player; bacterium absorbHit() |
| `shared/death` | dissolving (generic) | springtail die() and caught() (the sundew digestion); paramecium kill() after paramecium/held; phage startCapture() for kind 'dead'; bacterium startCatch() |
| `shared/reform` | re-forming from motes | springtail startReform(); paramecium respawn(); bacterium respawnPlayer(); phage respawn(); tardigrade respawnSafe()/respawnNear(); mite respawnNear() |
| `shared/foe-flees` | a predator gives up | springtail stepWorld() on e.type === 'retreat'; paramecium stepWorld() on e.type === 'fled'; amoeba stepChaos() on e === 'retreat'; mite stepAct() when the pseudoscorpion has had enough |
| `shared/join` | another player joins | the players onJoin callback in each main.js (paramecium, bacterium, phage, ...) |
| `springtail/charge` | A held: cocking the furcula | springtail stepPlayer() on the edge where P.charging turns true |
| `springtail/flip` | landing on its back | springtail landAt() where pl.mode = 'flipped' (and stepPlayer() where a knock flips it) |
| `springtail/right` | righting itself | springtail stepPlayer() where P.rightT = 0 (the flick back over) |
| `springtail/pounce` | the pounce-bite lands | springtail diveImpact() on a hit |
| `springtail/glue-snap` | a glue strand snaps | (hook) sundew-glue.js reports each snapped strand; play from stepPlayer() after poseTail() (rate-limit ~0.1 s) |
| `springtail/struggle` | wriggling and kicking in glue | springtail stepPlayer() in the stuck branch on each effort (r.kick), rate-limited |
| `springtail/tear-free` | torn free of the sundew | springtail stepPlayer() at 'torn loose' |
| `springtail/sundew-fold` | slipped back: the leaf closes | springtail sundewStep() at the start of phase 'strike' (or animateCapture() when the sundew catch starts) |
| `springtail/strider` | the strider skating in | springtail stepWorld() on the strider's skim/stalk event (stenus-skim is used for both today) |
| `springtail/spider` | the wolf spider stalking | springtail stepSpiders() when a spider engages |
| `springtail/spider-lunge` | the wolf spider's lunge | springtail stepSpiders() / stepWorld() on the boss's lunge event |
| `mite/jump` | the jump launch | mite soundTick() on e === 'jump' (replaces mite/dash at rate 1.3) |
| `mite/land` | landing | mite soundTick() on e === 'land' (replaces the slowed mite/step) |
| `mite/crouch` | A held: crouching to jump | mite soundTick() when mite.mode turns 'crouch' |
| `mite/strike` | X: lunge and snap | mite stepAct() play.act === 'strike' at the snap (play.snapped = true); keep mite/bite for a bite that lands |
| `mite/devour` | eating a springtail | mite stepAct() play.act === 'devour' at the first snap (replaces the repeated mite/bite) |
| `mite/drop-fall` | a drop falling | mite stepLife() on e.type === 'fall' (replaces the slowed mite/dash) |
| `mite/drop-splash` | the drop splashing down | mite stepLife() on e.type === 'splash' (replaces the slowed mite/close) |
| `mite/predator-windup` | the predatory mite rears | mite tick() predator events, e === 'windup' (with the toast) |
| `mite/predator-strike` | its strike | mite tick() predator events, e === 'strike' |
| `mite/glance` | a strike sliding off the capsule | mite tick() where a strike hits a closed mite (the strike slides off) |
| `mite/pincer` | the pseudoscorpion's pincer | mite startBossCapture() and the boss's strike event |
| `tardigrade/attack` | X at a foe: lunge and stylets | tardigrade startAttack() |
| `tardigrade/impact` | the attack lands | tardigrade step() events 'bitten' (Prionchulus) and 'recoil' (Milnesium), with tardigrade/bite |
| `tardigrade/feed` | feeding | tardigrade step() where feeding starts (feeding && !a.feeding: replaces tardigrade/bite there), repeating every ~1.5 s while it feeds |
| `tardigrade/brace` | B: gripping hard | tardigrade step() when B (defend) is first pressed |
| `tardigrade/prionchulus` | Prionchulus thrashing | tardigrade step() events 'windupThrash' and 'windupWhip' |
| `tardigrade/whip` | Prionchulus's whip strike | tardigrade step() Prionchulus e === 'strike' (replaces the slowed tardigrade/dash) |
| `amoeba/drain` | being drained (loop) | amoeba stepCatch(): audio.loop() when the 'eat' phase starts, .stop() when the catch ends or tears free |
| `amoeba/tremble` | the membrane trembling | amoeba stepCatch() during 'hold'/'eat' every ~1 s |
| `amoeba/squish` | changing shape (subtle) | amoeba frame() when LT (spread / round up) is pressed or released |
| `amoeba/roll` | turning (subtle) | amoeba moveCell() when the cell turns fast, rate-limited |
| `amoeba/stick` | stuck on a trap hypha | amoeba where the 'Caught on a fungal trap hypha' toast shows (n && !C.stuckN) |
| `amoeba/tear` | tearing free | amoeba stepCatch() at 'Torn free!' and stepEngulf() at 'Surged out!' |
| `amoeba/pierce` | haustoria pierce | amoeba startCatch() (with the slowed amoeba/engulf, or instead of it) |
| `amoeba/pinch` | pinching off Chaos's arm | amoeba pinchChaos() when chaos.cut() takes something; pinchOff() for the cell's own pinch-off |
| `amoeba/chaos` | Chaos flowing in | amoeba stepChaos() when Chaos starts its chase |
| `amoeba/chaos-windup` | Chaos rears / gathers | amoeba stepChaos() events 'windupCup' and 'windupLunge' |
| `amoeba/chaos-engulf` | engulfed by Chaos | amoeba startEngulf() |
| `amoeba/death` | the cell dies | amoeba stepCatch() / stepEngulf() when the phase turns 'die' |
| `amoeba/reform` | a fresh cell gathers | amoeba respawnCell() |
| `paramecium/depth` | deeper / shallower | paramecium readInput() on the edge where the depth input starts |
| `paramecium/burst` | B: the trichocyst burst | paramecium defend() when a charge is spent (after paramecium/reverse) |
| `paramecium/stun` | the jab lands | paramecium attack() when the jab hits Dileptus, Didinium or the giant's pseudopod |
| `paramecium/dileptus` | Dileptus winds back | paramecium stepWorld() e.type === 'tell' && e.who.kind === 'dileptus' |
| `paramecium/slash` | Dileptus slashes | paramecium stepWorld() on Dileptus's strike (foes.js event), or kill() when by Dileptus |
| `paramecium/giant` | the giant amoeba reaching | paramecium stepWorld() when the giant starts reaching for a player (foes.js 'hunt' for the giant) |
| `paramecium/giant-engulf` | closed round by the giant | paramecium stepWorld() e.type === 'engulf' (replaces paramecium/held there) |
| `paramecium/trap-tell` | the trap's door quivers | paramecium stepWorld() e.type === 'trap-tell' |
| `paramecium/trap-fire` | the trap fires | paramecium stepWorld() e.type === 'trap-pulse' |
| `paramecium/divide` | the cell divides | paramecium ate() where game.divided++ |
| `paramecium/vorticella` | a Vorticella contracts | (hook) paramecium/world.js stepVorticella(): when st.c is set to 1 by the near() callback |
| `paramecium/bloom` | the dash flings bloom cells | paramecium readInput() after flingBloom() |
| `bacterium/beacon` | X: the beacon | bacterium coll onBeacon (replaces bacterium/eat at rate 1.9) |
| `bacterium/answer` | a kin cell answers | bacterium coll onRecruit, the first time per beacon |
| `bacterium/join` | a kin cell joins | bacterium coll onRecruit (replaces bacterium/tumble at rate 1.7; keep the 0.06 s rate limit) |
| `bacterium/toxin` | Y: the toxin burst | bacterium toxinBurst() (replaces bacterium/eat at rate 0.55) |
| `bacterium/lyse` | a prey rod lysed | bacterium pressX() / guards onKill (replaces bacterium/eat at rate 1.3) |
| `bacterium/strike` | a volley on an enemy | bacterium pressX() when members touch an enemy |
| `bacterium/stentor` | Stentor's tell | bacterium runBoss() where f.state turns 'windup' (bossInfo.log 'tell') |
| `bacterium/bdello` | Bdellovibrio rams | bacterium runFights() where the Bdellovibrio fight turns 'strike' |
| `bacterium/gate` | a gate beaten | bacterium guards onBeaten (replaces bacterium/eat at rate 0.6) |
| `bacterium/infected` | a member lost to a phage | bacterium guards onInfected / coll onLost |
| `phage/amb-water` | ambience | phage: audio.loop('phage/amb-water') in place of bacterium/amb-sediment |
| `phage/grab` | the fibres close on something | phage holdCell() and holdMol() (replaces bacterium/tumble at rate 1.5 / 1.8) |
| `phage/release` | letting go | phage releaseHold() (replaces bacterium/tumble at rate 1.3) |
| `phage/miss` | nothing in reach, or the wrong protein | phage tryGrab() with nothing in reach; updateGrab() at 'this protein does not fit' |
| `phage/throw` | flinging a carried molecule | phage releaseHold() for a molecule when dashing (A while carrying) |
| `phage/fold` | B: fold / unfold | phage stepMember() at the fold toggle (replaces bacterium/tumble; rate 1.15 for unfolding) |
| `phage/dash` | A: dash | phage stepMember() at the dash (replaces bacterium/sprint) |
| `phage/jab` | X at the lobe | phage tryJab() (replaces bacterium/sprint at rate 1.4) |
| `phage/lobe` | the lobe rears and lunges | phage updateGuard() when f.state turns 'windup' |
| `phage/current-coming` | a current seen coming | phage stepCurrents() on ev === 'start' (replaces bacterium/sprint at rate 0.45) |
| `phage/current-pass` | the current sweeps past | phage stepCurrents() where curWarned turns true (a.t > warn - 0.3) |
| `phage/latch` | fibres latch on a receptor | phage beginCommit() (replaces bacterium/phage) |
| `phage/sheath` | the sheath contracts | phage updateCommit() at P.snapped (replaces bacterium/eat at rate 0.8) |
| `phage/inject` | the DNA slides in | phage updateCommit() after the sheath snap, once |
| `phage/cas` | Cas3 swings in | phage stepMember() binding events, when b.state turns 'windup' |
| `phage/burst` | the host bursts | phage updateBurst() where the progeny spill (replaces bacterium/graze at rate 1.3) |
| `phage/snag` | snagged in a floc / stuck to clay | phage updateDrift() at the floc snag; enterClay() (both bacterium/tumble today) |
| `ui/move` | menu focus moves | game/src/sound.js tick() (synthesised today): play the file instead, keeping the synth as the fallback |
| `ui/select` | menu select | game/src/sound.js select() |
| `ui/back` | menu back | game/src/sound.js back() |
| `ui/zoom-in` | the zoom into the next world | game/src/sound.js zoom('in', duration) (stretch with playbackRate = 4 / duration) |
| `ui/zoom-out` | the zoom back out | game/src/sound.js zoom('out', duration) |
| `ui/intro-in` | an intro card slides in | game/src/main.js where the intro screen is shown |
| `ui/intro-out` | the intro card leaves | game/src/main.js where the intro is dismissed and the world starts |
| `ui/pause` | pause | game/src/main.js where sound.setPaused(true) is called on opening the pause menu |
| `ui/resume` | resume | game/src/main.js resume() |
| `ui/card` | the controls card opens / closes | game/src/main.js where the controls card is shown and hidden |
| `ui/start` | starting from the title | game/src/main.js where the title's A / Start begins a game (sound.start()) |

## Prompts

### shared/portal-chime

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A warm magical golden shimmer: a soft glassy chime, a rising sparkle of tiny high bell tones and an airy swell that rings out and fades, wondrous and rewarding. No music, no narration, no voices, no speech.
```

### springtail/amb-bog

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Calm outdoor ambience at the edge of a still bog pool on a mild day: a soft breeze over moss, faint water lapping, a distant insect hum, very sparse faraway birdsong. Even level, continuous, seamless. No music, no narration, no voices, no speech.
```

### springtail/jump

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny sharp springy snap-click followed by a very short airy whoosh, like a miniature catapult releasing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/land-water

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny soft plip of something very light landing on a still water surface, delicate, almost no splash. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/land-sticky

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small wet sticky squelch and a stretchy tacky pull, like a fingertip pressed into honey. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/eat

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Tiny dry crunchy nibbling, a few quick crisp bites on a grain. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/raindrop

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A single big heavy raindrop plunking into a calm pond right beside the microphone, deep resonant bloop and a ring of ripples. No music, no narration, no voices, no speech.
```

### springtail/stenus-skim

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A fast thin hissing zip across a water surface, like a tiny speedboat streaking past, fading quickly. No music, no narration, no voices, no speech.
```

### springtail/stenus-strike

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. An instant sharp sticky thwip, a tiny elastic tongue shooting out and snapping back. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/amb-moss

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Muffled, close, damp ambience deep inside a cushion of moss: very soft rustling, faint creaks of stems, a distant muted breeze overhead. Low and even, continuous, seamless. No music, no narration, no voices, no speech.
```

### mite/step

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. One tiny dry hard tap, like the tip of a beetle's leg clicking on a dry leaf. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/dash

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick flurry of tiny dry clicking scrabbles, many little hard legs scurrying fast over dry leaves. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/close

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small hollow hard clack-thunk of an armoured shell snapping shut, like a tiny seed pod closing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/open

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small hollow creak and soft click of a hard little shell hinging open. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/bite

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny crisp pinching crunch, like snipping a thin dry fibre. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/blade

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft swish and springy rustle of a thin green blade bending and flicking back. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/predator

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Fast, light, menacing skittering of long thin legs approaching quickly over dry leaves. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/amb-film

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Close underwater ambience in a very thin layer of water: soft muffled bubbling, slow gentle gurgles, faint fizz, a dull distant pressure. Even, continuous, seamless. No music, no narration, no voices, no speech.
```

### tardigrade/step

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft small squishy padded step with a tiny click of a claw at the end, underwater. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/dash

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A hurried patter of soft squishy little steps underwater, clumsy and quick. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/bite

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny crisp puncture: a needle-sharp click piercing a taut cell wall, then a small tight pop. Sharp, percussive, not a lick or slurp. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/tun

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow shrinking dry crinkle and a soft deflating sigh, like a damp leaf curling up as it dries. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/revive

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow gentle watery swelling gurgle, like a sponge soaking up water and plumping out. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/rain

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Rain beginning to fall on a moss cushion, heard muffled from inside: soft pattering building up, water trickling down. No music, no narration, no voices, no speech.
```

### tardigrade/milnesium

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A heavy wet lunge and a deep sucking gulp underwater, ominous and close. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/amb-pool

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Deep, slow, thick underwater ambience: a low rumbling murmur, occasional very slow viscous bubbles, muffled and calm. Even, continuous, seamless. No music, no narration, no voices, no speech.
```

### amoeba/stretch

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow soft gooey stretching sound, thick slime being pulled and flowing, wet and elastic. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/boost

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick gooey surging whoosh, thick liquid rushing forward inside something soft. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/engulf

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A wet enveloping squelch and a soft closing gulp, slime folding around something and sealing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/vacuole

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. One soft round watery bubble pop. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/digest

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow low gentle stomach-like gurgle, muffled. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/amb-pool

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Faint underwater ambience in clear pond water: a very soft airy hiss, tiny distant ticks and fizzes, calm. Even, continuous, seamless. No music, no narration, no voices, no speech.
```

### paramecium/swim

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft continuous rhythmic shimmering rustle, like thousands of tiny feathers fluttering in water, steady. Continuous, seamless. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/dash

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick rushing underwater swish, a fast swimmer darting forward. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/gulp

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small quick watery suction gulp. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/trichocysts

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A sharp burst of many tiny needle-like snaps fired all at once, a crackling spray. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/reverse

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick swirling reversing whoosh underwater, a sudden back-pedal and turn. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/didinium

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. An ominous fast fluttering whirr approaching underwater, a spinning hunter getting closer, tense. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/held

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tense squeezing creak and a wet struggling stretch underwater. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/amb-sediment

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A dense soft crackling fizz of a busy microbial world in pond mud, like tiny bubbles and grains jostling, constant tiny random pops, even and continuous, seamless. No music, no narration, no voices, no speech.
```

### bacterium/run

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A fine soft continuous whirring hum, like a tiny insect wing or a spinning seed heard very close, organic and steady. Continuous, seamless. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/tumble

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A short fluttering stutter, a tiny whirl faltering and flicking round in a new direction. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/sprint

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick rising whirr, a tiny organism surging forward with a soft high rush, then easing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/eat

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny soft fizzy absorbing sip, bubbles dissolving. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/phage

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny sharp sticky click, something minute latching firmly onto a soft surface. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/graze

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A deep slow sucking current whoosh, a big drain pulling water in. No music, no narration, no voices, no speech.
```

### shared/portal-appear

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft magical golden glow blooming into being: a low warm swell, a gentle shimmer of tiny glassy bell tones opening up, hopeful and inviting, fading out slowly. No music, no narration, no voices, no speech.
```

### shared/portal-near

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A short soft airy golden sparkle, two or three tiny high glassy chime tones rising, delicate and inviting. No music, no narration, no voices, no speech.
```

### shared/portal-enter

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft rising airy whoosh pulling inward, a gentle suck of air into warm light with a faint shimmer at the end. No music, no narration, no voices, no speech.
```

### shared/slowdown

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A long deep soft descending swell, like time slowing down: a warm low tone gently bending down in pitch and fading into a hushed still glow. No music, no narration, no voices, no speech.
```

### shared/portal-sealed

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A short soft muted closed thud, like a hand pressed against thick glass, a dull low bump with a faint falling glassy tone. Gentle, a polite no. No music, no narration, no voices, no speech.
```

### shared/backdoor

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft airy reversed whoosh rising and pulling away upward, a gentle receding shimmer. No music, no narration, no voices, no speech.
```

### shared/danger

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A short tense rising organic creak and hiss, like a living thing drawing itself back to strike, a building threat that stops abruptly. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### shared/block

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A firm dull glancing knock, something hard sliding off a tough shell, a short scrape. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### shared/hit

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft heavy wet impact thump, a body being knocked aside, brief. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### shared/death

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A gentle sad dissolving: a soft fizzing crumble breaking up into tiny scattering particles, fading downward into silence. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### shared/reform

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Tiny soft particles gathering and drawing together, a gentle rising sparkle that settles into a soft wet plop of something whole again. Hopeful. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### shared/foe-flees

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A receding scramble or swish moving quickly away into the distance and fading, relief. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### shared/join

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A friendly round bubbly pop and a small bright watery bloop, welcoming. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/charge

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny tightening creak of a spring being wound, rising tension, very small. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/flip

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny clumsy tumbling clatter, a light little body flipping over and landing on its back with a soft tick. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/right

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny quick kick and flick, a small body flipping back upright with a soft tap. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/pounce

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small sharp nip landing hard: a tiny thwack and crisp pinch. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/glue-snap

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny thin sticky strand stretching and snapping with a wet elastic pop, like a string of honey breaking. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/struggle

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Tiny frantic wet sticky squelching and tugging, a small body thrashing in thick glue. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/tear-free

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A sticky tearing rip and a release, the last gluey strands letting go with a springy pop. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/sundew-fold

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow wet sticky curling creak, many glistening tentacles slowly folding inward and a soft gluey closing. Ominous. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### springtail/strider

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Light quick rhythmic skating strokes across a still water surface, soft dimpling rowing pulses approaching. No music, no narration, no voices, no speech.
```

### springtail/spider

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Heavy, slow, deliberate footfalls of a large spider approaching over damp moss, soft thuds and rustles, menacing. No music, no narration, no voices, no speech.
```

### springtail/spider-lunge

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A sudden fast heavy pounce, a rush of legs and a dull thump onto moss. No music, no narration, no voices, no speech.
```

### mite/jump

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny explosive springy snap and a short airy flick, like a flea leaping off a dry leaf. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/land

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny hard dry tick-thud of a little armoured body landing on dry moss, a light skitter. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/crouch

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny tense creaking and fine trembling of small hard legs bracing, rising tension. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/strike

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny fast lunge and crisp hard pincer snap, a quick clack of tiny jaws. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/devour

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Tiny busy crunchy chewing and crackling, small jaws working quickly through something crisp. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/drop-fall

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A drop of water forming, stretching and letting go from a leaf tip, a wet tick then a short rushing fall. No music, no narration, no voices, no speech.
```

### mite/drop-splash

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A big heavy drop of water smacking into dry moss close to the microphone, a wet slap and a spray of droplets. No music, no narration, no voices, no speech.
```

### mite/predator-windup

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A short tense dry rasp and creak, long thin legs rearing up, a threat about to strike. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/predator-strike

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A fast vicious dry snap-lunge, sharp tiny jaws striking. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/glance

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny hard tick and scrape, something sharp glancing off a smooth hard shell. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### mite/pincer

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A heavier crisp claw snap, a small pincer clacking shut hard, then a scrape. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/attack

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick soft underwater lunge ending in a tiny sharp needle click, a jab. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/impact

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft heavy squishy thump underwater, a padded body bumping hard into another. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/feed

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny slow wet sucking slurp drawn through a very thin straw underwater, pulsing gently. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/brace

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Tiny claws digging into a soft surface with a squeak and a firm wet grip. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/prionchulus

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A long slick body whipping and thrashing through water, wet sinuous swishes, powerful and unsettling. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### tardigrade/whip

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A fast wet whip crack underwater, a slick body lashing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/drain

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A steady sickly seeping, a constant soft wet hiss of fluid drawn out with a faint trembling flutter, never pausing, even level. Seamless. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/tremble

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft wet quivering wobble, jelly trembling. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/squish

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A very soft subtle gooey squish of soft jelly shifting. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/roll

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow soft viscous rolling slosh, thick slime turning over. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/stick

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small tacky sticky squelch, slime stuck to glue. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/tear

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A gooey stretching tear and a wet release pop. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/pierce

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow soft wet puncture, something thin pushing into jelly with a small pop. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/pinch

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft gooey pinch and a wet snip, slime pinched off. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/chaos

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A deep slow massive gooey surge, an enormous mass of thick slime flowing closer, low and heavy. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/chaos-windup

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A deep slow rising gooey stretch, huge slime arms rising and spreading, building. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/chaos-engulf

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A huge deep wet enveloping gulp, a giant soft mass folding round and sealing with a muffled squelch. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/death

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft slow deflating sigh of jelly going slack, then a gentle scattering of tiny granules drifting apart. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### amoeba/reform

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. Tiny granules softly gathering and a gooey jelly drawing together, a gentle swelling into a whole. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/depth

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft smooth underwater glide, a gentle airy pressure shift, very subtle. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/burst

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A big bright burst of hundreds of tiny needle-like snaps fired all around at once, a crackling explosive spray underwater. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/stun

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small soft knock and a fizzy sting, something prickled and recoiling. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/dileptus

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A slow wet swishing coil, a long flexible trunk drawing back underwater, tense. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/slash

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A fast wet slicing whip underwater, a lash. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/giant

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A deep slow looming gooey flow, a huge soft mass of slime reaching closer underwater. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/giant-engulf

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A deep wet enveloping squelch, an enormous soft mass folding around and closing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/trap-tell

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tense taut creaking strain of a sealed elastic door under pressure underwater, a faint high quiver building. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/trap-fire

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. An instant violent underwater suction pop, a door snapping open and water rushing in with a deep gulp, then sealing shut. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/divide

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft gooey stretching pinch and a wet pop as one soft cell splits into two, pleasant and satisfying. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/vorticella

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick springy coiling zip, a tiny stalk snapping into a coil underwater. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### paramecium/bloom

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft fizzy scatter, many tiny particles swept aside underwater. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/beacon

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft round expanding underwater pulse, a gentle bubbly ripple spreading outward. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/answer

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. One tiny bright soft watery blip. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/join

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny soft wet click and pop, a little cell snuggling in. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/toxin

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A big fizzy explosive pop and a crackling spreading hiss, a cloud of tiny bubbles bursting outward. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/lyse

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small wet bursting pop and a fizzing spill. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/strike

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick flurry of tiny soft wet jabs. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/stentor

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A swirling underwater vortex building into a roaring whirlpool, rising in speed and pitch, menacing. No music, no narration, no voices, no speech.
```

### bacterium/bdello

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny sharp whizzing rush ending in a hard little knock. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/gate

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A warm rising organic swell of many tiny fizzing bubbles lifting together, triumphant and soft. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### bacterium/infected

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A small sad soft deflating fizz, a tiny cell fading out. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/amb-water

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A dense, very fine soft shimmering hiss of countless tiny molecules jostling, faint delicate ticks and a calm deep hush underneath, crowded but serene. Even, continuous, seamless. No music, no narration, no voices, no speech.
```

### phage/grab

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny quick soft clasp, thin fibres closing on something with a small sticky click. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/release

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny soft unclasping, a gentle sticky release and a light push off. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/miss

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny soft empty swipe, thin fibres closing on nothing. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/throw

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick tiny flick and a soft whoosh of something small tossed away. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/fold

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft quick rustling fold, thin fibres sweeping back against a stem. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/dash

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick soft darting whoosh, something tiny shooting forward through water. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/jab

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A tiny sharp poke into soft jelly, a quick prick and recoil. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/lobe

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A deep slow looming gooey surge rising and lunging, a huge soft mass reaching. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/current-coming

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A low distant underwater rushing whoosh slowly building and getting closer, a wave of water approaching. No music, no narration, no voices, no speech.
```

### phage/current-pass

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A full rushing underwater sweep passing right by, a strong swirling flow that washes over and fades away. No music, no narration, no voices, no speech.
```

### phage/latch

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A firm tiny sticky lock-on click, something minute docking snugly into place. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/sheath

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A sharp tight springy contraction snap, a tiny coiled tube punching down with a firm pop. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/inject

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A long smooth slithering draw, a thin strand being pulled through a tiny tube, wet and steady. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/cas

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A quick tight clamping snip, tiny molecular scissors closing, organic and sharp. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/burst

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft wet bursting pop of a swollen cell rupturing, then a fizzing spray of many tiny particles spilling out. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### phage/snag

```text
Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. A soft fibrous tangling drag, thin fibres catching in a fluffy clump with a gritty rasp. Extremely close-miked, tiny, intimate, detailed. No music, no narration, no voices, no speech.
```

### ui/move

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. One tiny crisp brass tick, like a fine focus knob clicking one notch. No music, no narration, no voices, no speech.
```

### ui/select

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A small satisfying brass click of a microscope objective turret locking into place, with a faint glassy ring. No music, no narration, no voices, no speech.
```

### ui/back

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A soft lower brass click and a gentle slide back, a turret turning back a notch. No music, no narration, no voices, no speech.
```

### ui/intro-in

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A soft smooth brass slide and a glass slide being placed on a microscope stage, a gentle whoosh ending in a soft click. No music, no narration, no voices, no speech.
```

### ui/intro-out

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A soft smooth glass slide sliding off a brass stage, a gentle whoosh fading. No music, no narration, no voices, no speech.
```

### ui/pause

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A soft muted brass click and a gentle falling hush, like a shutter closing. No music, no narration, no voices, no speech.
```

### ui/resume

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A soft brass click and a gentle rising airy breath, like a shutter opening. No music, no narration, no voices, no speech.
```

### ui/card

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A soft paper card sliding out of a brass holder, a light papery whoosh. No music, no narration, no voices, no speech.
```

### ui/zoom-in

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A long smooth deep rising whoosh of a microscope racking in focus, a slow airy swell with soft shimmering glass resonance, wondrous, ending gently. No music, no narration, no voices, no speech.
```

### ui/zoom-out

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A long smooth falling whoosh of a microscope racking out, an airy swell receding, soft glass resonance fading. No music, no narration, no voices, no speech.
```

### ui/start

```text
Sound design for the menus of a gentle, wondrous game about a brass Victorian microscope: small, warm, tactile, acoustic and precise, real brass and glass, soft and pleasant, never harsh or electronic. A warm bright brass and glass flourish: a soft click and a rising shimmer of tiny glass chimes, inviting. No music, no narration, no voices, no speech.
```
