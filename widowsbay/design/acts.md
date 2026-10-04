# Widow's Bay — the five acts

The whole game is one evening at a toy theatre: five acts, each staged on
the same painted proscenium with a different piece of stage machinery
driving the play. The story follows the song and the video's Méliès footage
in order. A sailor comes home across a storm, is pulled under by the sea
witch, crosses her grotto and her court, rides out inside a whale, and
reaches Widow's Bay as the house on the cliff burns. Whether a lamp is lit in
the window at the end depends on what was carried home.

Sources: the lyric motifs and the shot-by-shot account of the video in
[`video-reference.md`](video-reference.md). The tea reading, the pearls with
the beloved, the flowers with the sea witch, the past as a thrown stone, and
the uncertainty over whether she waited all come from the lyrics. The
voyage, the storm, the grotto with the moon boat and red dragon, the undersea
court with the pastel attendants, the giant whale, the shoreline emergence,
the band among the cliffs, the red-orange collapse and the rescue all come
from the video. Art ids in `code` refer to
[`image-requests.md`](image-requests.md).

## Through-line

| Act | Title | Stage machine | What you carry out | Video moment |
| --- | --- | --- | --- | --- |
| I | The Crossing | wave cranks (three rows) | **tea leaves**: the reading | ship in rough water, ~0:20–1:00 |
| II | The Grotto | the fly rope: a diving bell lowered from the flies | **the sea rose**, if you take it | teal grotto, moon boat, red dragon, ~1:35–1:50 |
| III | The Undersea Court | processional floor tracks, and the whale as an eclipse | **her pearl** | court of pastel attendants, the whale passing, ~1:50–2:25 |
| IV | The Whale's Road | the rocking cradle: the whole set tilts | **the stone** | the whale reaches the rocky shore, ~2:30–2:45 |
| V | Widow's Bay | breakaway flats: a collapsing house | **her** (the rescue) | band among the cliffs, red-orange collapse, the carry, ~2:50–3:15 |

**Keepsakes are carried between acts** and decide the ending:

- **Tea leaves** (Act I; three leaves complete the reading). The reading is
  a prophecy. In later acts, a small tea-leaf omen glyph appears one beat
  earlier over every hazard. This is a gentle assist, not a requirement.
- **The sea rose** (Act II) is the witch's gift. Taking it calms the red
  dragon in Act III, but it binds you to her.
- **Her pearl** (Act III) belongs to the beloved and was taken by the witch.
  Without it the window stays dark.
- **The stone** (Act IV) is the pebble of the lyric, "the past as a thrown
  stone". In Act V, throwing it breaks the locked shutter: a shortcut into the
  burning house. In the dark ending it is what you throw into the bay.

**Endings** (Act V), checked in this order:

1. **The Sea Witch's.** You took the rose: as you carry the beloved out, the
   witch's moon boat rises in the bay and claims you. Bittersweet; the
   beloved is safe on the quay. Tableau `ending-witch`.
2. **A Lamp in the Window.** You have her pearl: reunion at the lit window.
   Tableau `ending-lamp`.
3. **The Window is Dark.** No pearl: the house is saved, but she isn't
   waiting. A silhouette (`rival-silhouette`) stands in the doorway, and you
   throw the stone into the bay. Tableau `ending-dark`.

After every ending comes the **curtain call** with the band (already built),
then a playbill (`playbill`) showing your keepsakes and score per act.

**The score** is the band's recording throughout. At about 76 BPM in 4/4
(see the README's Sound section), each act has one piece of machinery that
keeps time with it: Act II's clams open on the beat, Act III's attendants
step on the beat, and Act IV's whale breathes every four bars (about 12.6 s).
Acts last 90–130 s, about half the song each.

**Shared rules, all acts:**

- Three lanterns of hull or heart; a hit costs one, then 1.6 s of grace.
  Losing all three ends on the magenta "The Sea Keeps Her Own" card with a
  retry.
- Pearls score everywhere.
- Acts unlock in order. The playbill is the act select; progress and
  keepsakes are saved per act, in their own save slot.
- Controller mapping stays the same: the stick or D-pad moves, **A** is the
  act's one action, **Menu** pauses, **B** goes back. Each act's card names
  its action.

---

## Act I — The Crossing (built)

As built: three cranked wave rows, rocks rising through trapdoors, the
witch's lightning, the shifting wind, and arrival at the lighthouse.

**Changes for the full game:**

- **Keepsakes.** The three keepsakes become three **tea leaves**
  (`tea-leaf`), which complete the reading in the cup (`keepsake-tea`). The
  pearl and the rose move to Acts III and II.
- **New ending.** Instead of ending at the lighthouse, the witch rises at the
  harbour mouth. A waterspout (`waterspout`) lifts the ship and pulls it
  under, with an iris-out to the Act II card. The lit or dark window now
  belongs to the finale.

## Act II — The Grotto

**Stage.** A tall painted backcloth (`grotto-backcloth`) rolls upward as you
descend, from sunlit water under the waves, through the teal grotto, to the
dark cave floor. Rock wings (`grotto-wing-left`, `grotto-wing-right`) frame
it, and coral flats (`coral-flat-a`, `coral-flat-b`) slide across at
mid-depth. Kelp (`kelp-hanging`) and jellyfish hang on wires, and fish
schools (`fish-school`) cross on sticks.

**Machine: the fly rope.** You ride a brass diving bell (`diving-bell`) on a
rope, hung from a trolley (`fly-trolley`) that runs along a rail in the
flies, visible above the valance.

- **Up and down** winch the rope. It is continuous, with a little swing on
  the rope.
- **Left and right** run the trolley along its rail.
- **A** gives a burst of bubbles that pushes the bell away from the nearest
  hazard, on a short cooldown.

**Play.**

- **Air.** A gauge drains slowly. Air vents (`air-vent`) refill it while you
  hover in their bubble column.
- **Pearls** sit in giant clams (`clam-open`, `clam-closed`) that open on
  the beat for one beat. Inside means a pearl; a closed clam is solid.
- **Eels** (`eel`) dart from holes whose eyes glow first (`eel-hole`).
- **Jellyfish** (`jellyfish`) drift on wires; touching one stings.
- **The red dragon** (`sea-dragon`, already delivered) patrols a slow figure
  of eight across the lowest third.

**Close.** At the cave floor, the witch stands in her moon boat
(`witch-stand`, with `witch-moonboat` behind) and holds out **the sea rose**.

- **A** takes it.
- **B**, or walking away, refuses. She laughs, and the dragon follows you
  into Act III.

**Hand-off.** The bell's rope is cut and the bell sinks through a trapdoor
into the court.

## Act III — The Undersea Court

**Stage.** The witch's palace hall (`court-backcloth`): gold ornament,
coral-red columns, teal water light. Column wings (`court-wing-left`,
`court-wing-right`) frame it. The floor (`court-floor`) has three
processional grooves, the same three rows as Act I, now on the stage floor.
The witch watches from a shell throne (`witch-throne`) at the back.

**Machine: processional tracks.**

- Courtiers slide along the grooves in patterns, stepping on the beat: the
  pastel attendants of the video (`attendant-green`, `attendant-pink`,
  `attendant-blue`) and seahorse-helmed guards (`seahorse-guard`).
- The witch's **gaze lantern** (`gaze-lantern`) on its pole sweeps a beam
  across the hall.
- You are the sailor on foot (`sailor-stand`, `sailor-walk-a`,
  `sailor-walk-b`).
- **Up and down** change groove. **Left and right** walk. **Hold A** to
  freeze in a courtier's pose (`sailor-crouch`). Frozen behind a passing
  attendant, you are hidden from the beam.

**The whale.** Every 20–25 s the giant whale (`whale-side`) glides across in
front of the whole stage. It is a huge dark flat on a track, and it masks
the hall for about three seconds. While it passes, the gaze can't find you;
dash. The large fish (`fish-large`) swims the same track on smaller passes.

**Goal.** Reach the pedestal by the throne (`pearl-pedestal`) and take **her
pearl**. If you refused the rose, the red dragon also patrols the back
groove.

**Hand-off.** As you take the pearl, the whale turns to face the audience
with its mouth wide (`whale-mouth`) and swallows the whole stage in one
lunge. Iris out.

## Act IV — The Whale's Road

**Stage.** Inside the whale (`belly-backcloth`): the ribs as Gothic arches,
dim red-violet light and a swinging lantern (`lantern-hanging`). Rib flats
(`rib-arch`) stand in front. Swallowed wreckage floats in the stomach water
(`belly-water`, a tiling strip like the waves): barrels (`barrel`), crates
(`crate`), a ship's figurehead (`figurehead`) and, absurdly, an upright
piano (`piano`).

**Machine: the rocking cradle.** The whole set sits on a visible cradle
(`cradle`) under the stage and **tilts** with the whale's swimming. Floating
wreckage slides downhill. Every four bars the whale **breathes**, and the
water rises and then falls.

**Play.** A climb across floating platforms.

- **Left and right** walk. **A** leaps (`sailor-leap`).
- Stand on the wreckage, ride it as the water rises, and work up toward the
  throat (`whale-throat`), where daylight shows.
- **The stone** (`keepsake-stone`) lies on the highest rib ledge.
- Hazards: the water at its lowest exposes the stomach floor, which costs a
  lantern. The tilt can tip you off. Swallowed hooks swing on lines.

**Hand-off.** The whale beaches on a rocky shore (`shore-rocks`) and opens
its mouth. You step out, and its tail (`whale-tail`) lifts and slips away,
as in the video at about 2:40.

## Act V — Widow's Bay

**Stage.** The night harbour (`bay-backcloth`): the cliff, the stone house
on top, and the Act I lighthouse in the distance. The quay (`harbour-quay`)
runs along the front. The band appear in the scenery at impossible scales,
as in the video at about 2:50: one guitarist tiny in a watery gap
(`band-guitar`, drawn small), and another huge in the foreground
(`band-beard`, drawn large).

**The turn.** As you reach the house, the witch's storm strikes it. The
backcloth changes to its burning version (`bay-backcloth-fire`), the video's
red-orange wash, with painted flame flats on sticks (`flame-flat`) and smoke
flats (`smoke-flat`).

**Machine: breakaway flats.** The house (`stone-house`) is a dollhouse
cutaway, three floors joined by a staircase (`staircase`) and ladders
(`ladder`).

- Beams (`beam-fall`) and stones (`debris-stones`) drop through on cue,
  telegraphed by a shudder and dust.
- Floors break away behind you.
- If you carry **the stone**, **A** throws it to break the locked shutter: a
  shortcut that skips a floor.

**Play.**

- **Climb up** to the beloved (`beloved-stand`).
- **Carry her down** (`sailor-carry`): slower, with no leap, so the route
  down has to be different from the route up.
- Cross the quay as the house falls.

**Ending.** See the endings above, using the tableaux `ending-lamp`,
`ending-witch` and `ending-dark`, then the curtain call.

---

## Sound for the new acts

All effects come from ElevenLabs through `source/build_sfx.py`, as period
stage foley tuned to the song (see `../CLAUDE.md`). Planned additions:

- **Act II.** Winch ratchet, rope creak, bell clank, bubble burst, clam snap
  (tuned), eel lunge, jelly sting, air vent hiss, the witch's offer (a harp
  shimmer), taking the rose (a low bell), refusing (her laugh).
- **Act III.** Courtier footstep (one soft tap per beat), gaze-lantern hum,
  spotted gong, freeze (a cloth rustle), the whale's pass (a long low groan
  with water), taking the pearl (tuned chime), the swallow (a roaring gulp).
- **Act IV.** The whale breathing (a slow water rise and fall), timber
  creak on the tilt, barrel knock, a piano key plink (tuned, comic), dripping,
  the stone found (a dull click and chime).
- **Act V.** Fire crackle loop (a stage fire made of rattling silk), beam
  crash, stone tumble, shutter smash, the carry (heavy footsteps), the moon
  boat rising, the lamp lit (warm swell), the stone thrown into the bay
  (plop).

## Build order

1. Act I changes: tea leaves, and the waterspout ending.
2. Act II, the newest machine, to prove the vertical roll.
3. Acts III and IV.
4. Act V, the endings and the playbill save.

Each act ships to `main` when it is playable, with its card, its sound
effects and the art delivered so far; art not yet delivered draws
procedural stand-ins until it arrives.
