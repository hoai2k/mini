# The Radio Bird: Tune In (50 s)

Three little listeners sit on the sofa, and one calls for a station, shown
as a picture in its speech bubble: the fiddle, the trumpet, the drum, the
bells, the cuckoo clock or the weather. Six stations are hidden along the
Radio Bird's long tuning dial. A speaker card rides along under the needle:
it crackles with static, and as a station comes near, its picture fades in
through the crackle; the card also carries a small tag of the station they
want. The listeners lean forward as the needle nears the one they asked for.
Left alone near a station, the needle settles on it by itself.

Press the action on the right station (with a pointer, let go of the needle
on it) and its song plays for 1.8 s while the ring round the speaker fills.
Turn away and it's lost after half a second. Press on the wrong station and
the listeners grumble ("Not that one!") for a moment, which only costs time.
Each song scores 10, plus up to 10 for finding it quickly (10 minus 1.25 per
second since they asked). Stations you play, or rest on for a second, are
pencilled on the dial, but the stations drift from the start and more as the
game goes on, so a mark only says roughly where to look.

**Score:** points. The page opens at 75.

**Getting harder:** stations narrow from 4.5% to 2.7% of the dial and drift
from 1.2% to 3% either way, faster as time goes on. The first request is
the station nearest where the needle starts.

**Controls:** tilt the stick or hold the arrows to sweep the dial (more tilt,
faster); spin the stick for fine tuning; A, Space or Enter plays the station.
With a mouse or finger, drag the needle and let go on the station. On a
narrow screen the view follows the needle, and the speaker and the wanted
station travel with it.

**Bots** (`game/test/radiobird.test.mjs`): a beginner (slower sweep, slow to
press, runs past stations, often forgets the marks) scores 85 to 207 over
six seeds; a good tuner 251 to 317; sweeping, sweeping or creeping while
mashing A, random mashing and idling all stay below 75 (at most 10); pressing
at every station it meets 20.

## Images (IC-M18)

- **IC-M18a, the sitting room** (`scene.radiobird`): the background, with
  the empty sofa on the right; the upper wall stays plain for the dial and
  the speaker that slides under it. The game stops drawing its own sofa once
  this arrives.
- **IC-M18b, the stations** (`sprites.stations`, 3 x 2): the six station
  emblems, for the bubble, the speaker and the pencil marks.
- **IC-M18c, the listeners** (`sprites.listeners`, 3 x 2): the three birds
  waiting, and delighted while their song plays.
- **IC-M18d, the tuning dial** (`sprites.dialPanel`): the dial window; the
  needle, marks and knob are drawn on it.
- **IC-M18e, listening, singing and startled** (`sprites.radiobirdPoses`,
  3 x 1): the Radio Bird cocks its head to its own speaker while the dial
  turns through static, sings (swaying) while the song plays and while the
  listeners cheer, and starts back at a wrong station; at rest it is its
  portrait.

## Changes after the audit

1. **Shorter songs and a quick-find bonus.** Songs take 1.8 s instead of
   3.2 s, and each scores 10 plus up to 10 for finding it fast, so the score
   is in points now. Beginners score 85 to 207 and good tuners 251 to 317;
   before it was 7 to 9 against 8 to 11 songs.
2. **Less certain marks.** A station is pencilled only once you play it or
   rest on it for a second, not as you sweep past. Stations drift from the
   start (1.2%, growing to 3%).
3. **A literal signal instead of the eye.** The magic-eye meter is gone. The
   speaker crackles, and the nearest station's picture fades in through the
   static as the needle comes close. The listeners lean forward as you near
   the one they want.
4. **The action plays the station.** A (Space, or letting go of the needle)
   plays the station, and a wrong one costs a short grumble with no points
   taken. Turning slowly is gone; fine tuning is the stick spin, and the
   needle settles on a nearby station by itself when left alone.
5. **Phone view.** The speaker and the wanted station's tag ride under the
   needle, which `focus` follows, so everything to watch stays in the narrow
   view. The big speech bubble moved down beside the middle listener so it
   doesn't sit under the speaker.

## Matched to the painting

The painting (`assets/subjects/radiobird.png`) is a mustard-yellow radio body
with a green grille, on long pink legs with a long striped neck. The music
notes now rise from its painted grille, measured at (24, -166) in drawBird
units, instead of from above its head. IC-M18e's prompt now describes the
painting (the neck, the grille, the colours) instead of the stand-in. The
scene request (IC-M18a) now says the speaker slides under the dial.

## Matched to the delivered art

- **Scene (IC-M18a, delivered):** the painted sofa spans about x 750 to
  1550, with its seat at about y 600. The three listeners now sit on its
  three cushions (x 925, 1158, 1383; feet at y 608) instead of floating in
  front of it. The middle listener's bubble moved up to sit above the sofa
  back. The stand-in sofa, drawn only when the painting is missing, now has
  the same footprint. The dial's knob moved to the left end of the dial,
  because the painted standard lamp stands at the right end. The Radio Bird
  already stands on the painted rug.
- **Still stand-ins:** the station emblems (IC-M18b), the listeners
  (IC-M18c), the dial panel (IC-M18d) and the poses (IC-M18e). They are
  still requested, with no change.
- **Sprites (delivered):** the stations (IC-M18b), the listeners (IC-M18c),
  the dial panel (IC-M18d) and the listening, singing and startled poses
  (IC-M18e). No stand-in drawing is left for any of them.
  - *Dial.* The dial geometry is measured from the panel, drawn 1000 px
    wide: its bezel spans about y 125 to 250 and its cream face y 146 to
    227. The needle, the pencil marks (smaller now, at the top of the face)
    and the stand-in panel all keep to the face. The knob sits clear of the
    bezel at the left.
  - *Stations.* Each emblem is fitted inside a square box (the trumpet is
    wide, the cuckoo clock tall).
  - *Listeners.* They are drawn as whole cells at one scale (195 px per
    512 px cell) with their feet on the cushions, so the singing row (whose
    cells include a note) doesn't shrink the birds.
  - *Poses.* They are drawn at one measured scale (the startled bird stands
    810 px tall in its cell to the portrait's 868), with their feet on the
    rug.
- The opening hint has a paper-coloured outline and stays inside the view.
- **New request IC-M18f, speaker cabinet and tuning knob**
  (`sprites.radioParts`, 2 x 1): the speaker that rides under the needle is
  still a plain box drawn in code, and the knob a ticked disc. The cabinet
  is requested at the speaker's exact size (230 x 210) with a transparent
  round grille opening where the speaker's picture shows (centre 60% across
  and 53% down, 62% of its width across). The game already draws both once
  they arrive, the knob turning with the dial.
- **Still drawn in code (game information):** the needle, the pencil marks,
  the static flecks, the song ring, the want tag's bubble and the pops.
