# Micro Zoom: one boss per world

Each world keeps its ordinary predators (with the shared fight rules in
`micro/prototypes/shared/predation.js`: a visible wind-up, block with B, bite
back with X, interest that runs out). On top of that, each world reserves one
**boss**: a bigger, real enemy of that habitat that guards the way to the
forward landmark. A boss fight is about movement first: reading its tells,
timing dashes, blocks and counter-bites, and getting past it. Bosses use the
same `createFight` states (stalk, windup, strike, recover, repelled, retreat)
with more interest, several distinct attacks and phases, and a health or
"resolve" bar shown as a quiet brass gauge, not a big game UI.

Modelling reference sheets are requested as MP-R14 to MP-R20
(`micro/image-requests.md`).

| World | Boss | Where | Its attacks and tells | How you beat it or get past |
| --- | --- | --- | --- | --- |
| Springtail (bog surface) | **Pond wolf spider** (*Pirata*), ~5 mm, a real bog-pool hunter that runs on the water | On the moss bank by the forward landmark | Stalks, then **crouches and raises its front legs** before a lunge; feels ripples, so it turns towards your landings; a pounce that dimples the film | Feint and jump clear as it lunges (the furcula is your dodge); a nip at an overreaching tarsus makes it flinch; three good dodges and nips and it retreats under the moss, leaving the bank open |
| Mite (moss) | **Pseudoscorpion** (e.g. *Neobisium*), ~2.5 mm, a real hunter of mites in moss and litter | In the leaf axil before the water film | Holds its **venom-tipped pincers open and still** (the tell), then a fast pincer snap; a grab pulls you in | Stay outside pincer reach, close up (B) to survive a grab (its venom can't get through the closed armour), bite its pincer joints (X) while it recovers; when its pincers falter it backs into the moss |
| Tardigrade (water film) | **Predatory nematode** (*Prionchulus muscorum*), ~2 mm, hunts tardigrades and rotifers in moss films | Across the film near the leaf tip | **Coils into an S** (the tell) then whips its head forward with its tooth bared; thrashes in thick film, slowed in thin film | Brace (B) when it whips, jab its head (X) in its recovery; lure it into thin film where it struggles; worn down, it slides away into a deep cell groove |
| Amoeba (pool floor) | **Giant amoeba** (*Chaos*), ~5 mm, many nuclei, swallows smaller amoebae | Between you and the green *P. bursaria* (the landmark) | **Raises and spreads pseudopods** (the tell), then sends two or three round you to close a food cup; it tries to swallow you whole | Push into it and **pinch off its pseudopods with two of your own, like a pincer** (the cut-off pieces round up and die); cut each encircling arm before the cup closes, then slip round its edge to the landmark. If it closes the cup, you are engulfed (the follow-and-respawn sequence) |
| Paramecium (pool) | **Bladderwort trap** (*Utricularia*), ~2 mm, fires in about half a millisecond | On the bladderwort stem guarding the biofilm patch | Its **door quivers and the walls draw in** (the tell, after each reset), then a suction pulse that pulls in everything near the door; it also fires on its own every so often | Read the trigger hairs, wait for a pulse to pass, then dash through while it resets; trichocysts (B) push you out of the inflow if you are caught at the edge; reach the biofilm beyond |
| Bacterium (sediment) | ***Stentor*** (*S. coeruleus*), a giant trumpet ciliate 1–2 mm long | Anchored by the host cell with the phages (the landmark) | Its **membranelles speed up and the vortex brightens** (the tell), then a strong pull into the mouth; contracts in a flash when touched | Ride the edge of the vortex, tumble (B) to break free of the pull, sprint across between pulses; bumping its foot makes it contract and pause |
| Phage (inside the host) | **CRISPR-Cas complex** (Cascade with Cas3) | Inside the host cell, after you inject | **Slides along the host DNA scanning** (the tell: its guide RNA glows as it nears a match), then binds and Cas3 chops | Keep your DNA's leading end away from it while you copy yourself; restriction enzymes are lesser hazards; outrun the scan long enough to burst |

## Notes

- **Biology.** All seven are real enemies of their world's protagonist (or, for
  the bladderwort, a real trap of that habitat). Two labelled departures: the
  wolf spider is scaled to a juvenile so the arena fits; and *Chaos* eating
  *Amoeba proteus* is plausible but not well documented.
- **Multiplayer.** Bosses pick the nearest or the most recently aggressive
  player; teammates can flank (a bite from behind counts double).
- **Pacing.** A boss stays dormant until a player approaches its post, after the
  calm opening, so it is a choice to engage.
