# Ear Trainer

Hear a short melody, then play it back on the piano. Play at
https://hoai2k.github.io/mini/eartrainer/.

Made for phones in landscape (it asks you to turn the phone sideways), and
works on tablets and desktops too. Inspired by the Chet ear-training app.

## How it plays

- The keyboard is the whole piano, A0 to C8 (88 keys); eleven white keys (an
  octave and a half) show by default. A navigator bar above the keys shows
  the piano in miniature: drag its bright window, or tap anywhere on it, to
  slide along; ‹ › move an octave; − + show fewer or more keys (8 to all 52
  white keys, remembered). Keys being played, the first-note marker and the
  melody's range show on the miniature. A sideways trackpad scroll slides the
  keys too. `app/src/keyboard.js`, `app/src/navigator.js`.
- **Free play** (on the songbook screen) is the whole piano with no melody to
  find; the staff shows the last 16 notes played, with a Clear button.
- A melody plays and the keyboard slides to wherever it sits (centred if it
  fits the keys on screen, else from its lowest note). A glowing dot marks the first note until you
  play it.
- As in Chet, a staff above the keys has a slot for every note: notes you've
  found appear at their pitch; tap any slot, found or not, to hear its note
  on its own; the next one to find is a
  brass "?" tile and the rest are grey tiles. Each slot glows as its note
  plays. Notes keep their written spelling; transposed melodies are spelled
  in the key the app detects (`keyOf`/`spell` in `music.js`). The staff can
  be turned off in Settings.
- Play the notes in order. Timing is never judged. A wrong note sounds, shakes
  the progress dot and counts as a mistake, but the melody waits until you
  find the right one.
- The melody is played, not just sounded: `app/src/perform.js` joins notes
  legato (each held just into the next, like a half-changed pedal), holds
  long notes and lets the last one ring, lifts for rests, leans on strong
  beats, swells toward the high point, and adds a few milliseconds of
  unevenness. Long holds are shortened: no note waits more than 1.1 s before
  the next (stretched when the tempo is slowed), since a lead sheet's
  bar-long notes are only waiting in ear training. It plays on its own channel about 7 dB under the player's keys
  (Settings → Melody volume), and keeps playing when you press keys, so you
  can play along.
- **Repeat** plays the melody again; **Redo** starts your answer over from a
  clean slate (wrong notes before it no longer count);
  **Practice** lets you try notes without answering; **Tempo** − / + runs
  from 0.5× to 1.5×; **Skip** moves on (and tells you what it was) and
  becomes **Next** once the melody is solved.
- A melody is finished by a run with no wrong notes. A run with wrong notes
  isn't scored and gets no chime: "Almost!", then the staff hides its notes,
  the melody plays and the next try begins. The finish scores by try: three
  stars and ten points a note (plus a streak bonus for clean first tries in a
  row) on the first try, two stars and six a note on the second, one star and
  three a note after that; a skip before a clean run gets no stars and ends the
  streak. Redo mid-run wipes that run's mistakes without using a try. While
  the first note is marked on the keys, wrong keys before it is found aren't
  mistakes. After a run with wrong notes, pressing a key starts the next try at
  once (that key counts as its first note) instead of waiting for the replay. Finishing
  reveals every note on the staff and the title in the top bar, with a chime
  and confetti; right after the chime (about 1.5 s; the Next button fills up
  meanwhile) the next melody starts by itself. Playing on restarts
  the wait, and Repeat (which replays it with its keys lit), Redo, Practice,
  a tap on the staff or the menu stays with it. Settings can turn this off.
- Songbooks: Children's Songs, Folk & Traditional, Carols & Hymns, Classical
  Themes, Jazz Standards, Bebop Heads, Jazz & Blues Licks, Film & Pop Hooks,
  or everything.
  Levels 1 Beginner, 2 Easy, 3 Medium, 4 Hard and 5 Expert, or Adaptive
  (melodies get harder as you do well); each songbook card shows how many
  melodies it has at the chosen level. A melody's level comes from
  `difficultyScore` in `music.js`: how many notes and different pitches it
  has, the size of each leap (a repeated interval counts half), notes outside
  its key, and its range. The tests pin familiar anchors (Hot Cross Buns and
  Jaws are level 1, Ode to Joy 3, Für Elise 5) and check every level holds a
  fair share of the library (about 20%, 31%, 30%, 12% and 6%).
- Full songs, a choice beside the levels, plays whole songs phrase by phrase.
  - Each phrase is answered like any melody. Once it's played cleanly, the
    song's next phrase follows; the top bar counts the phrases (3/7).
  - Skip moves on to the next song, not the next phrase. Next, after a clean
    run, goes to the next phrase.
  - A finished song gets the average of its phrases' stars.
  - There are 211 songs (`app/data/songs/`):
    - nine written by hand (`children.js`: Twinkle Twinkle, Frère Jacques,
      Happy Birthday, Ode to Joy and others);
    - 202 from the datasets (`dataset.js`, generated by
      `design/source/extract_melodies.py`): whole lead sheets from OpenEWLD
      that are traditional or published by 1930, and the Nottingham dance tunes.
  - Each source song is read once straight through, leaving out first-time
    endings. The phrase finder runs again from the end of each phrase. A song
    is kept only if every phrase ends cleanly and fits the keyboard.
  - The Real Book and Omnibook tunes stay opening phrases only, as their
    compositions are under copyright.
- The one-phrase modes (the levels and Adaptive) also take phrases from the
  middle of these songs, each different phrase once (`songPhrases` in
  `library.js`).
  - A phrase is left out if it repeats one earlier in its song, in any key.
    That covers a chorus or repeated line, and a line that contains an earlier
    one or sits inside it.
  - It's also left out if the library already has it under the same title, or
    if it has under four notes or three pitches.
  - The solved bar says "phrase 5 of the song" for one from the middle.
  - That adds 1,347 melodies, for 2,136 in all. The Real Book and Omnibook
    tunes still give only their openings.
- Settings: four sounds (Concert Grand, Felt Piano, Bright Piano, Electric
  Piano), volume, room reverb, note names on keys, melodies as written or in
  any key, a Sound on/off switch (also the speaker button on the title; sound is
  also silent while the tab is hidden or the window unfocused), the first-note dot, lit keys on replay, vibration, and a progress
  reset. Settings and progress are kept in `localStorage`.

Controls: touch; computer keys (home row `A S D F G H J K L ; '` for the white
keys on screen, the row above for the black keys, `Space` repeat, `Backspace`
redo, `3` practice, `-`/`=` speed, `Enter` next, `Esc` menu); Xbox controller
(D-pad or left stick moves a key cursor, A plays it, X repeat, B redo, Y
practice, LB/RB speed, D-pad up/down an octave, View or RT next, Menu
pauses). `,` `.` slide an octave and `9` `0` show fewer or more keys. Fullscreen works as in
Kingdom of the Fairies (`app/src/chrome.js`): a tap in landscape asks for
fullscreen while it is off, unless the player left it themselves (Chrome's
"swipe down to exit" notice, the back gesture, the button): then taps stop
asking, a message says how to turn it back on, and only the button or the
pause menu does; exits caused by switching apps or a rotation still come back
on the next tap (one request per tap, since a second in the same
tap is always refused; the click retries if the pointerup was refused; landscape
is locked once fullscreen starts; the pause menu offers Full screen again, and
a browser that keeps refusing gets one message suggesting Chrome or the home
screen), and iPhone Safari gets the swipe-up hint instead (tap it to
dismiss it). If a swipe leaves Safari's bar showing (newer Safari keeps a small
one in some layouts), the hint gives up for the session and suggests Add to
Home Screen, which is the only true full screen on iPhone. While playing, the
page refuses to pan but stays scrollable, since making it unscrollable can bring
the bars back; dialogs close on a tap of the backdrop, not on a swipe across it. The page
can't be zoomed: iPhone Safari ignores `user-scalable=no`, so `preventZoom` in
`chrome.js` blocks pinches (two fingers drifting apart on a chord look like
one) and double-tap zoom (the keys, navigator and staff cancel their
touchstarts outright, so fast taps on them can never zoom), and snaps the
page back if it ever ends up zoomed.

## Files

- `app/index.html`, `app/styles.css`, `app/src/`: the app (static ES modules,
  no build step). `music.js` notation and keyboard windows, `round.js` the
  answer rules and scoring, `library.js` songbooks and picking, `audio.js`
  the sampler, `keyboard.js` the on-screen keys, `main.js` the shell.
- `app/data/melodies/`: the hand-written and opening-phrase melodies (789; the songs' middle phrases add 1,347 more), one file per
  source or category, listed in `index.js`. Seven files were written by hand.
  Three are generated by `design/source/extract_melodies.py` from the
  datasets themselves:
  - `jazzheads.js`: 155 jazz standards and bebop heads. The standards are
    opening phrases from Mark Veltzer's OpenBook (LilyPond lead sheets
    transcribed from the Real Book; MIT), read by a small LilyPond parser in
    the script. The bebop heads are the opening lines of the heads in
    Charlie Parker's Omnibook (MusicXML by Déguernel, Vincent and Assayag;
    CC BY-NC-SA 2.0, so those entries are shared under the same terms). Tunes
    by bebop and hard-bop composers go in the Bebop Heads songbook. These run
    first, so their Real Book versions win over the same titles below.
  - `leadsheets.js`: 302 songbook, jazz, folk and carol lead sheets from
    OpenEWLD (MIT), which sometimes open with a verse.
  - `nottingham.js`: 87 British and American dance tunes from the Nottingham
    Music Database (GPL v3).
  The script can also extract the Essen Folksong Collection (`--essen`), but
  that licence does not allow distributed teaching material, so the app does
  not ship it.

  Each generated melody is the tune's first whole phrase, never a line cut
  off partway. The script reads the source's bar lines and lyrics and scores
  every possible last note the way a musician hears a phrase end. A note
  scores higher when it:
  - lands on a downbeat, in the second, fourth or eighth bar;
  - is clearly longer than the tune's usual note, or is followed by a rest;
  - is the home note, or the key's third or fifth.

  A note never ends a phrase while a sung word is still running on. The
  first clear ending within 12 notes is taken (14 for the dance tunes, 16
  for the long lines of bebop heads). A tune with no complete phrase that
  short is left out rather than cut.

  Each melody is
  `{ id, title, by, cat, bpm, notes: 'E4:0.5 D4:0.5 C4 r:1 ...' }`
  (middle C is C4; durations in beats, default 1). 3–16 notes within 16
  semitones, so it always fits the keyboard.
- `app/assets/samples/`: one sample every minor third from A0 to C8 for each
  kit, transposed by up to a semitone and a half to fill in the rest. Made by
  `design/source/fetch_samples.py` from the Salamander Grand Piano V3
  (Alexander Holm, CC BY 3.0) and FluidR3 GM (Frank Wen, MIT) via
  midi-js-soundfonts.
- `app/src/staff.js` draws the staff; `app/src/glyphs.js` holds the Bravura
  clef, note and accidental outlines, generated by
  `design/source/make_glyphs.py`.
- `design/image-requests.md` and `app/data/asset-list.json`: generated by
  `design/source/build_requests.py`. Round 1 art is delivered (shipped as
  WebP at display size; the master icon stays out of the published build);
  round 2's full-bleed icon and library cover are delivered. Prompts and asset
  paths are recorded in `design/image-deliveries-round-2.json`.
  `design/image-deliveries.json` records how each delivered image was made.
  Round 3’s Bebop Heads emblem is delivered; its prompt and paths are in
  `design/image-deliveries-round-3.json`.
- `publish.sh`: copies the app to `local/pages/eartrainer/`.

## Checks

```sh
node --test eartrainer/app/test/*.test.mjs
node eartrainer/app/test/validate-melodies.mjs
python3 eartrainer/design/source/build_requests.py --check
eartrainer/publish.sh local/pages/eartrainer
```

The tests cover the notation, the answer rules and scoring, picking, sample
mapping, and that every melody fits the keyboard in any key. Hand-written
melodies were worked out note by note; extracted ones match their source files; the
validator checks their format and range, not that every note is right, so
report any melody that sounds wrong.
