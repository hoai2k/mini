# Waterglass Goose: Glass Harp (8 tunes)

A row of drinking glasses stands on the table, each filled to its own level
and tinted its own colour, so each rings its own note (the fuller the glass,
the lower the note). The Goose plays a little tune, tapping the glasses with
its beak; then it's your turn to play the same tune back. A row of dots
under "Listen…" / "Your turn!" shows how long the tune is and how far you
have got. It is a memory game, played by eye, by ear, or both: the notes
are five of a pentatonic scale (C D E G A), so any order sounds pleasant.

- **Scoring.** Each right glass scores 1, or 2 if it follows the last
  note within 0.8 s ("Quick! +1"), and a whole tune played back 3 more. A
  wrong glass cracks it and ends that tune; so does waiting more than 5 s
  for the next note. Three cracks end the concert early (three little
  glasses under the tune's dots count them). Most: 84. Pass: 30.
- **Ramp.** Tunes of 2, 3, 3, 4, 4, 5, 6 and 7 notes, on 3 glasses (C, E and
  A, far apart in pitch, colour and water level), then 4, then 5; the Goose
  plays faster (0.85 s down to 0.45 s between notes). From the fifth tune a
  note can repeat (never three alike). The tints are blue, green, yellow,
  pink and orange.
- **Controls.** Stick, D-pad, arrows or WASD step the Goose one glass at a
  time (holding repeats after a moment); A, Space or Enter taps. With a mouse
  or touch, the Goose goes to the glass under the pointer and a click or tap
  taps it. In your turn the glass the Goose is at lifts and is ringed in
  yellow. On a phone the whole row, the dots and the crack count stay in
  view.
- **Bots (tests).** A beginner whose memory slips more on longer tunes, and
  who is slow to tap, scores 32–63 over six seeds; a good ear 84; tapping at
  random 0–2; idling 0.

## Images (IC-M02)

- **a: the table by the window** (`scene.waterglassgoose`): a warm room, a
  window, and a bare table across the bottom where the glasses stand.
- **b: the tumbler** (`sprites.harpGlass`, 2 x 1): one empty clear glass,
  whole and cracked, with a transparent inside so the game paints the
  coloured water.
- **c: the Goose tapping and honking** (`sprites.gooseTap`, 2 x 1).
- **d: the Goose walking and recoiling** (`sprites.gooseMoves`, 2 x 1):
  stepping between glasses, and jerking back from a crack.

## Changes after the audit

1. **Ceiling.** A right note played within 0.8 s of the last scores one
   extra ("Quick! +1"), so a sure, quick player keeps finding a higher score
   (most is now 84; the quick bonus is hard for a child to get every time).
   The game still has eight tunes, so it stays about a minute long; I did
   not add endless tunes for that reason. Pass rose from 22 to 30.
2. **Tints.** The fifth glass is orange (`#e09a48`) instead of mauve, so the
   five read blue, green, yellow, pink, orange; the tip names them.
3. **Selected glass.** In your turn the glass the Goose is at lifts 14 px,
   with a shadow under it and a thick, pulsing yellow outline, as well as
   the triangle.
4. **Crack counter.** The three little glasses now sit under the tune's
   dots (x 754–846, y 200), inside the phone view.

## Matched to the painting

The painted Goose is bigger than the stand-in (about 400 units tall) and is
a tumbler lying tilted, its neck out of the open end, its beak tip at about
(−165, −362) from the feet. It now stands 170 px to the right of the glass
it plays and 20 px back, drawn behind the row of glasses, so leaning in by
0.3 rad brings its beak tip down onto that glass's rim instead of past it,
and its body no longer covers the next glass. Its variants are drawn as
whole square cells framed like the portrait (feet on the 0.98 line). The
IC-M02c and IC-M02d prompts now describe the painting (the empty tilted
tumbler, the cream neck, the grey-green rooster tail, webbed feet) and the
tapping pose is described to fit how the glasses stand in front of it.


## Matched to the delivered art

- **Scene.** The painted table's lace runner lies from y 680 to 742, so the
  glasses (standing at y 690) sit on the lace; the tune's dots, "Listen…"
  and the crack count sit on the plain wallpaper, clear of the lamp and the
  window. No change needed.
- **Glasses.** The painted tumbler has a thick glass foot, so the water now
  starts 30 px above the table (was 12) and rests on the inside of the foot
  instead of filling it. Its painted outline is the same width as the
  stand-in's, so the yellow outline of the selected glass still fits.
- **Goose.** The tapping, honking, walking and recoiling poses are drawn
  as whole portrait-framed cells, behind the row of glasses, as set up when
  the portrait arrived; they line up with the portrait without a jump.
- **Still drawn in code:** only the coloured water, the glow and outline
  when a glass rings or is chosen, the ripples and notes, and the counters.
  No new requests.

## Second audit (2026-10-09)

Checked against the delivered art; see the second audit in [`AUDIT.md`](AUDIT.md) for what was changed.
