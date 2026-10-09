# The Radio Bird: Tune In (50 s)

Three little listeners sit on the sofa, and one calls for a station, shown
as a picture in its speech bubble: the fiddle, the trumpet, the drum, the
bells, the cuckoo clock or the weather. Six stations are hidden along the
Radio Bird's long tuning dial. Turn the dial and watch two things under it:
the signal eye, which starts to close as a station comes near and shuts
tight on it, and the speaker, which shows static until a station is tuned
in and then that station's picture. When it is the one they asked for, hold
the needle on it while its song plays (the ring round the bubble fills, in
about three seconds); off the station the song fades and slips back. The
wrong station gets a "Not that one!". Each finished song scores one and the
listeners ask for another.

Every station heard is pencilled onto the dial with its picture, so the
dial fills in as you play and later requests can go straight to the mark.
But the stations drift: barely at first, then more and faster, so a mark
only says roughly where to look, and holding a song means following the
station as it wanders. Stations also get narrower.

**Score:** songs. The page opens at 6.

**Getting harder:** stations narrow from 4.5% to 2.7% of the dial, and
drift from almost nothing to about 2.4% either way, faster as time goes on.
The first request is the station nearest where the needle starts.

**Controls:** tilt the stick or hold the arrows to sweep the dial (the more
tilt, the faster); spin the stick to turn the knob for fine tuning; hold A,
Space or Enter to turn slowly. With a mouse or finger, drag the needle along
the dial. On a narrow screen the view follows the needle.

**Bots** (`game/test/radiobird.test.mjs`): a beginner (slow sweep, shaky
hand, often forgets the pencil marks) scores 7 to 9; a good tuner 8 to 11;
sweeping end to end, creeping slowly along, idling and random mashing all 0.

## Images (IC-M18)

- **IC-M18a, the sitting room** (`scene.radiobird`): the background, with
  the empty sofa on the right; the upper wall stays plain for the dial and
  meter. The game stops drawing its own sofa once this arrives.
- **IC-M18b, the stations** (`sprites.stations`, 3 x 2): the six station
  emblems, for the bubble, the speaker and the pencil marks.
- **IC-M18c, the listeners** (`sprites.listeners`, 3 x 2): the three birds
  waiting, and delighted while their song plays.
- **IC-M18d, the tuning dial** (`sprites.dialPanel`): the dial window; the
  needle, marks and knob are drawn on it.
- **IC-M18e, listening, singing and startled** (`sprites.radiobirdPoses`,
  3 x 1): the Radio Bird cocks its head to its own speaker while the dial
  turns through static, sings (swaying) while the asked-for station plays
  and while the listeners cheer, and starts back at a wrong station; at
  rest it is its portrait.
