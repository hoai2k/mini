# Combat audit: enemy techniques, progression and the boss enclosure

The brief: jumping is plentiful, but the core of the game is fighting while jumping. The hardest moments in a mission should be a jump fought through, not a bare jump; enemies should get more mobile and more numerous as the campaign goes on, in waves rather than as tougher individuals; a few of them should jump and shoot, most should stay simple; and bosses should be fought in a sealed enclosure with platforms worth fighting from.

## What the fights were doing before

- **No enemy ever left the ground.** Eighteen species, and every ground species held its shelf: hounds charged along it, shooters stood and fired, the tortoise shuffled. Only the four diving flyers moved through the air. Stomping was therefore always available: nothing could be under Hopper one moment and behind it the next.
- **Every encounter was the same size.** Two foes on a fight shelf, three on a finish shelf, in every chapter of every mission. Progression was entirely by species (a hound in the fields, a stalker in the cathedral), never by numbers.
- **Nothing arrived mid-fight.** All spawns were present from the start; there was no second wave, so a fight had a fixed shape you could read from the landing.
- **The hardest moments were jumps.** Before this pass the ballistic audit's tight-jump count was the only difficulty signal, and long crossings had nothing over them or waiting on the far side. A crossing was pure execution.
- **Bosses fought over an open floor.** Three one-way shelves, no walls: Hopper could back out of the arena, and there was nothing to wall-kick, spring from, or time a jump onto.

## What changed

### Techniques: the agile few

A spawn may be flagged `agile`. Roughly a third of spawns are agile from pacing tier 1 and half from tier 3 (`(n + i + ci) % 3` or `% 2`); lesson chapters have none. Agile spawns use a movement technique every other attack, and are otherwise the ordinary species. Non-agile spawns never leave the ground and never change their pattern, so most of what Hopper meets stays readable.

| Species group                                                           | Ordinary attack                   | Agile technique (every other attack)                                                                                                                                                                              |
| ----------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hounds (shade, furnace, mirror stalker on the ground)                   | Charge along the shelf            | **Pounce**: a 640 units/s leap at Hopper (260–520 across), landing back on its shelf. It is airborne, so it can be stomped mid-arc or parried, but it is not on the ground to be kicked.                          |
| Ground shooters (seed spitter, spire leech, slag caster, thorn choir)   | Volley                            | **Vault**: if Hopper is within 420 units on the same level, an 0.8 s arc clean over Hopper to land ~220 units behind, then a 0.28 s tell and the volley from behind. Turn, parry, and the shot goes back into it. |
| Shooting flyers (chain manta, coil wraith, veil medusa, gravity cantor) | Aimed shot / lance / orbs / rings | **Overfly**: cross to Hopper's far side at 560 units/s, 240 above, then the volley from the blind side.                                                                                                           |
| Diving flyers (window ray, rift condor, turbine wasp, phase skate)      | Dive                              | **Double dive**: the second pass comes 0.2 s after the first instead of ~1 s.                                                                                                                                     |
| Armored shells (crag tortoise, ballast crab)                            | Shell charge / waves              | **Hop**: a short 470 units/s hop toward Hopper. Armored, so still not stompable; the hop is a body coming at head height.                                                                                         |
| Basalt burrower                                                         | Seed lob                          | No leap (it surfaces, see the level design audit).                                                                                                                                                                |

Pacing tier (0–3, from mission, region and chapter half) shortens tells to 90% at tier 2 and 78% at tier 3 and cooldowns to 60% at tier 3. Tier never changes damage or health.

### Waves

A fight shelf spawns `2 + tier` foes (max 5); a finish shelf `3 + ⌊(tier−1)/2⌋`. The first two (three) are present; the rest are wave 1 and wave 2, hidden until every earlier wave of the shelf is down, or until the shelf has held Hopper for 7 s per wave. A wave leaps in from where it stands (an arc, not an appearance) 240 units deeper along the shelf per wave, past the landing fight. Waves carry no ambush and no tier bonus; they are more of the same, which is the point.

### Crossing guards

From the third chapter, or wherever the tier is at least 1, every chapter crossing is contested: a flyer hangs 300 units over the middle of the gap in even chapters (agile from tier 2, so it may double-dive), or the region's shooter waits 140 units past the far landing in odd chapters and fires back across. Clearing the flyer with a stomp or a parry mid-arc, or shielding through the shot on the way down, is the jump-and-fight moment the audit below measures.

### Boss enclosure

Each arena is 3,400 units wide (about two and a half screens at the boss zoom) with a checkpoint at its mouth. Crossing the mouth wakes the boss, and two **lockdown walls** seal the arena over 0.6 s: 80-unit columns at both ends that drop from 1,500 units up, drawn as amber energy bars, solid once 60% closed. The boss's death lifts them over 0.7 s. Inside: two solid pillars for wall kicks, five one-way shelves at 200/230/390/430 rises (the 390 one swings ±80), and two spring pads on the floor. The boss still clamps to the arena and its three phases are unchanged.

## Progression (measured)

From `audit-levels.mjs` on the current build. "Agile" and "waves" are spawn counts; "biggest fight" is the largest group on one shelf.

| Region            | Spawns | Agile | In waves | Ambushes | Crossing guards | Tier | Biggest fight | Mean fight |
| ----------------- | -----: | ----: | -------: | -------: | --------------: | ---: | ------------: | ---------: |
| Sunseed Fields    |     38 |     6 |        4 |       11 |               3 |    1 |             3 |        2.8 |
| Crownline City    |     45 |    12 |       10 |       11 |               4 |    2 |             4 |        3.4 |
| Thunderhead Range |     43 |    12 |       10 |       11 |               2 |    2 |             4 |        3.4 |
| Cinder Foundries  |     45 |    11 |       10 |       11 |               4 |    2 |             4 |        3.4 |
| Tempest Docks     |     54 |    22 |       18 |       11 |               5 |    3 |             5 |        4.1 |
| Skyhook Works     |     54 |    22 |       18 |       11 |               5 |    3 |             5 |        4.1 |
| Vermilion Basin   |     56 |    20 |       18 |       13 |               5 |    3 |             5 |        4.1 |
| Cobalt Drift      |     58 |    28 |       22 |       11 |               5 |    3 |             5 |        4.5 |
| Violet Inversion  |     58 |    28 |       22 |       11 |               5 |    3 |             5 |        4.5 |

Spawns rise 38 → 58 across the campaign, agile share 16% → 48%, and the biggest single fight goes from 3 to 5 in three waves. Health and damage per foe are unchanged throughout: a stomp still kills an ordinary shadow outright and a kick takes three of its four hit points, so a five-foe wave is cleared by movement, not attrition.

## Challenge index: jump-and-fight beats bare jumps

For every required route transition the audit scores the **jump** (0–4: hold and speed the ballistic solver needed, plus 1 for a gap over 350 units) and the **combat** engaged by that landing (foes over the gap or within the first 520 units of the next shelf, weighted: melee 1, ranged or flyer 1.5, armored 2, halved for later waves, +0.5 agile, +0.4 ambush). Three checks:

1. The hardest moment in the mission (highest jump + combat) must be a transition with combat, never a bare jump.
2. No transition may be both a hard jump (≥3) and a heavy fight (≥5).
3. No landing may be denser than 9.

| Mission              | Hardest bare jump |                                      Hardest combined moment | Mean combat per landing |
| -------------------- | ----------------: | -----------------------------------------------------------: | ----------------------: |
| Earthbound Thunder   |                 4 |    6.9 (Road to Crownline, first fight: jump 1 + combat 5.9) |                    1.38 |
| The Iron Migration   |                 3 |                 8.4 (Pressure hall, first fight: combat 8.2) |                    1.79 |
| Beyond the Black Sun |                 4 | 8.2 (Thorn choir terraces, first fight: jump 1 + combat 7.2) |                    1.67 |

All three checks pass in every mission. Two things the checks made me change: the gap onto a finish shelf is no longer stretched by the chapter signature (the finish is a fight fought on arrival, and the glide chapter's 1.22× gap into it scored a 3 + 5.4), and finish shelves grow by one foe every two tiers instead of every tier, with later waves landing 240 units deeper so they are not part of the landing fight.

Full-hold-at-speed jumps are 5 per mission; the hardest combined moments are landings with a jump score of 0–1. The challenge is where it was asked to be.

## Directional defence and the respawn delay

A later pass changed what the two guard buttons cover, to make the answer to "something is attacking me" depend on where it is:

- **X sweeps behind and overhead only.** The kick's damage arc is centred 55 units behind Hopper and uses the same rear filter as the takeoff strike, so it reaches nothing in front. It parries a blow arriving from behind or straight down. Deflecting shots with it also only works behind. *(Reversed since: see "The spin kick turns all the way round" below.)*
- **B guards the front and does no damage.** Held, it parries frontal blows and shots at 0.2 energy each, staggering the attacker and turning shots back at their shooter, and leaves the back open. It still drains while held, breaks when empty, recharges on release, and suspends kicking and shooting.
- **A parried shot is turned, not swallowed.** Whichever guard catches it, the projectile becomes Hopper's and flies back as a `reflect` hit (armor-opening like a kick, but with no rear filter).
- **Eye lasers auto-aim downward.** Targets are chosen in a cone reaching 1.9× the horizontal distance below and 0.45× above, measured from Hopper's body so a shadow pressed against it still counts, and the beam is clipped against solid terrain and unbroken cages by a slab test rather than the old horizontal-band check.

Together these meant a shadow directly in front was answered with lasers, a jump attack or the guard, never a kick, and one at your back with the kick. The trade was deliberate: holding either guard was choosing a side.

## The spin kick turns all the way round

That rear-only trade did not survive play: a kick that reaches nothing in front
asks the player to read which side a fight is on before pressing the button
that is meant to answer it, and the answer is usually to turn around first.
The kick is now what its name says.

- The damage arc is a circle of radius 165 centred on Hopper rather than 175
  set 55 units behind it, and `hit` no longer filters `kick` by facing. The
  takeoff strike (`launch`) keeps its rear filter: that one is a shove out of a
  standing start, not a turn.
- Reach is now symmetric at 165 either way, against 230 behind and nothing in
  front before.
- The parry follows the sweep. A blow from any direction is parried while the
  kick is out, and a shot inside 185 units is deflected wherever it came from,
  where both used to require the attacker at Hopper's back.
- B is still the front guard and still the only way to hold a side open
  indefinitely; the kick is a moment, not a stance.

The other fix in that pass: a shadow killed within 15 seconds no longer returns when Hopper dies and restarts from a checkpoint. `resetToCheckpoint` keeps it down with a `reviveAt` stamp, and it comes back only once the delay is up **and** Hopper is more than 1,100 units away, so it is never seen appearing.

## Nothing appears out of thin air

A later pass again, after play showed shadows seeming to spawn behind Hopper:

- **The forward guard is gone.** B and L are a second kick button, and a new kick can start once the current one has counted down to `kickRepress` (0.17 s left of its 0.5 s), so a volley from any side is turned kick after kick (the kick itself now sweeps all round, per the section above). The energy meter, its breaking and recharging, and the "suspends kicking and shooting" rule went with it. The 3D edition keeps its own guard.
- **Lurkers are there to be seen.** A ground shadow with a `behind` ambush, or in a later wave, is visible from the start: crouched (scaleY 0.62), dim, still, harmless on contact, and hittable, so a stomp or a laser on it wakes it staggered and open. It rises when Hopper is past it (or when its wave is called) instead of appearing. Later waves wait at the far end of their shelf and leap in toward the landing fight. A buried burrower is the one shadow still unseen until it surfaces, and it tells first.
- **Flyers arrive, never appear.** A flyer in a later wave sweeps in from 950 units above the shelf; a flyer with a `behind` ambush starts 1,350 units behind Hopper, off the screen, and crosses the picture at 620 units per second to reach him.
- **A fallen shadow comes back only far offscreen.** It revives once its delay is up and Hopper is more than 3,000 units away (the screen's half-width plus a full screen width at the widest look zoom, `REVIVE_DISTANCE`), whether or not Hopper has died in between; backtrack that far and it is simply there again. A checkpoint restart keeps everything behind the checkpoint down.
- **Every shadow on the first board can be stomped, and shells turn the beam.** A closed shell takes nothing from a laser (a kick or a turned shot opens it for 1.5 s); instead the engine draws where the beam went. The crag tortoise throws it 57° off the reversed line, upward, as a 320-unit `fizzle` beam that fades along its length. The second episode's slag caster, ballast crab and turbine wasp (`MIRROR`) send it back whole for up to 1,000 units, 11° to 32° off the reversed line, alternating sides shot by shot, and if that line crosses Hopper's body it hurts him (not parryable). The crab, caster and wasp can all be stomped now. Only `hardened` spawns refuse a stomp while closed, and they mirror too: the generator marks one per finish shelf in the third episode (twelve in all), drawn with a pale stone rim.

## What still needs a human

The numbers say a five-foe wave with two agile spawns is clearable because each dies to one stomp; they cannot say whether the vault-and-shoot from behind reads clearly enough at tier 3 tell speeds, or whether the crossing guard's double dive over a low-gravity 882-unit gap feels fair. Those are controller-in-hand checks. The arena also wants a playtest for whether the swinging shelf and the pillars actually get used against each boss's patterns or are ignored for the floor.
