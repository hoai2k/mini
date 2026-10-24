# Music Practice

A metronome, a tuner, a drone and a practice recorder. Open it at
https://hoai2k.github.io/mini/musicpractice/.

Made for phones (portrait or landscape) and desktops. The home screen has
five buttons, **Metronome**, **Tuner**, **Drone**, **Playback** and
**Routine** (the Practice Routine; `home.tools.timer`), and a settings gear. Wherever the window is wider than
tall (a desktop, a tablet or a phone on its side) they are one row of five.
Upright, the four tools are two rows of two, and the Practice Routine is a
fifth button under them when it fits, or else a second page (below,
Practice Routine). The buttons are always in this order; they could once be
held and dragged into another, which was removed to keep the layout simple,
and an order saved then is dropped.

**Nothing on the Metronome, Tuner or Drone screens, or the home screen,
scrolls, down to a small phone either way up** (measured at 568×320 and
320×568 in every theme, and up to desktops). Each fits its picture to the
room the controls leave, and where that is not enough it steps down to a
compact form: the home screen makes its buttons' art as large as fits,
largest first (`layoutHome`, `HOME_ART`, `--art-max`), so a phone on its
side fills its height (the row of five has narrower gaps and side padding
for this), and tightens its spacing and labels (`#home.compact`) only when
even a small size doesn't fit; a label needs a little room either side
of it. Home is measured whatever screen shows (laid out out of sight,
`#home.measuring`), so turning the phone on the Routine page switches the
swipe back on or off just as it does on the home screen; the metronome and the
drone take smaller controls (`#metronome.tight`, `#drone.tight`, also the
Bluetooth sync bar); the tuner's existing steps (the scale-test card, then
the gauge, down to 72 pixels) end in tighter text and buttons
(`.tuner-body.tight`). On a phone on its side the metronome's dots, Pulse
and Visualizer are as wide as the picture is tall rather than the window,
so the picture and the controls fit side by side, and many small dots (12/8)
are scaled down to that width. The Practice Routine and Playback lists can
be any length, and scroll. **A sheet or dialog never scrolls the page
behind it**: while one is open the page is held (`html:has(dialog[open])`),
and on a phone a drag on a sheet passes to the page only where nothing under
the finger can scroll that way (a touch handler in `main.js`), so a long
sheet scrolls itself and a short one stays put.

**The top of the screen in the iPhone home-screen app.** Since iOS 26, a web
app opened from the home screen gets a soft blurred fade drawn over the top
of the screen, reaching about 40 points past the status bar, above the page:
no meta tag or CSS turns it off, and an opaque status bar style was reported
not to move it. So there (`display-mode: standalone` on a touch WebKit, or
`navigator.standalone`, which sets `html.ios-app`) every screen starts
`--edge-fade` (36 px) further down: `--safe-top` is the status bar's inset
plus that band, used by the screens' padding, the home gear and the Sixties
stripes (whose first stripe fills the band). The backgrounds still run up
under it. Safari itself and Android draw no fade and are unchanged.

## Themes

The gear on the home screen opens the app's own settings, the one place the
**Theme** is chosen: a tile per theme, each drawn in its own colours and fonts
(all themes' fonts load only when this opens). The tools' own settings sheets
don't offer it. It switches the whole app's look:

- **Classic** (the default): warm walnut and brass with Fraunces and Manrope.
- **Art Deco**: black lacquer, gold and ivory, Poiret One and
  Josefin Sans capitals, double gold frames, a sunburst background and fan,
  diamond beat markers and sliders, stepped hexagon buttons.
- **Vintage 60s**: cream, mustard, orange and teal in Righteous and Nunito,
  three bold stripes across the top with the back button, title and gear
  sitting on them as outlined cream badges, polka dots, rounded cards with
  offset print shadows.
- **18th Century**: parchment, sepia and burgundy with gilt, IM Fell English
  and EB Garamond in small capitals, double gilt frames and a fleuron rule.
- **Robot Future**: deep navy with cyan and magenta light, Orbitron and
  Exo 2, a HUD grid, chamfered panels and neon glow.
- **French Nouveau**: sage, cream, gold and rose, Italiana and Cormorant
  Garamond, asymmetric organic curves and a whiplash ornament. Its art is
  the palest and least saturated of the themes (mean saturation 0.38-0.43
  against 0.55-0.83 for most, almost no darks) and mostly the sage the
  page is tinted with, so it sank into its cards: the theme draws every
  picture a little richer (saturation and contrast) with a fine dark
  contour, after the outlined forms of a Mucha poster (`--art-pop`).
- **Candy**: candy pink and sky blue on white in M PLUS Rounded, bold
  outlines, hard manga-panel shadows, halftone dots and sparkles.
- **Steam Punk**: dark leather with brass and copper, Cinzel and Special
  Elite, riveted plates and a gear.

**Dark Mode**, a dropdown under the theme tiles, is **Default**, the default (each theme
as designed: Classic, Art Deco, Robot Future and Steam Punk dark, the other
four light), **Light**, **Dark** or **System** (follows the device, and
switches while the app is open when the device does, at dusk for one). A
save that never chose one shows Default; a choice made at the setting is
kept. Every
theme has its other mode: Classic by day (cream and walnut), Art Deco in
ivory, 18th Century by candlelight, Robot Future in a white lab, French
Nouveau in the evening, Candy at night, Steam Punk in the drawing office,
Vintage 60s after dark (the same print on a dark page: near-black offset
shadows rather than teal ones, which read as glowing edges on dark, soft tan
outlines, and the badges on the stripes cream with dark ink, as by day). Classic by day has its own touches: near-white cards
with a short, crisp shadow rather than a wide brown blur, and a brighter
gold on the big button. Only the colours change; the type, shapes, ornament
and art are the theme's own (the art is cut out on transparency, so it sits
on either ground). The theme tiles preview in the chosen mode. It is free in
the apps too. `resolveMode` in `app/src/settings.js` decides the mode and sets
`data-mode` on the page; the early script in `index.html` does the same
before the first paint.

Theme ids stay fixed when a theme is renamed (Robot Future is `scifi`,
Candy is `anime`), so saved choices and image paths keep working.
Each theme loads only its own fonts. All eight themes have delivered images.
A ninth, Bebop, is archived as a possible expansion in
`design/archive/bebop/` (its art, styles and how to bring it back).
The drawings in `app/src/standins.js` remain as loading and error fallbacks;
the newer themes share one drawing (`themed`), varied by case shape, palette
and pendulum weight.

A theme is three things: a `THEMES` entry in `app/src/settings.js` with its
fonts and the mode it was designed in (the early script in `index.html` lists
the ids and the dark ones too; a test checks they match), its colours, type and
shapes in `app/styles.css` (one section per theme holding all of it: its
`[data-theme="…"]` block, its controls and Visualizer bars, and its
`[data-theme="…"][data-mode="…"]` block for its other mode), and its images.
A theme restyles the shared controls (`.pill`, `.chip`, `.select`,
`.big-btn`, `.step`) through `:where([data-theme="…"])`, so its rule weighs
no more than the control's own and a component's variant of a control still
wins (the strong beats' Done button was once lost to every theme's pill
style); where a theme wants a component's control its own way, it names that
component (the note at the top of the themes in `styles.css`).
A theme's own rules take their colours from its tokens (`--teal`, `--lacquer`,
`--arrow` for the dropdown arrow and so on) rather than writing them in, so
the other mode's block only has to change the tokens. Every image
belongs to a theme in `design/source/build_requests.py`. The app shows the
theme's delivered image or, until it arrives, that theme's drawn stand-in
(`app/src/standins.js`).

**Readability:** every theme in both modes was checked for contrast in all
the settings sheets (Settings, the four tools', Audio check, Send feedback):
text at least 4.5:1 against what is behind it (3:1 for large or bold large
text), nothing under 12.5px. That check moved the light themes' highlighted
values ("440 Hz", "3 s") to a darker accent (`--value`), darkened the
selected chips in Vintage 60s, French Nouveau and Candy and the help text in
those three, and raised Send feedback's details to 13px. A second check went
everywhere: every screen (each tool, the routine set up, being edited and
running, the metronome going) and every sheet and dialog, opened the way a
person opens them. It found the strong beats' Done button emptied by most
themes' pill styles (white on white in Robot Future by day; it is now each
theme's own primary button, as Send feedback is), cream on gold on Classic's
big buttons by day (now dark ink), Candy's Stop by night, the paywall's links
and the running item's number in pale gold on light pages (now `--value`),
red text on light pages (now the deeper `--red`, deeper still in Vintage 60s
and Candy), the pressed strong-beat cells, Classic's and 18th Century's
faintest text (`--ink-3`), and a few Art Deco sizes under 12.5px; all pass in
every theme in both modes. On the theme tiles, Art Deco's and French
Nouveau's names (hairline faces with one weight) are drawn larger with a
fine outline.

**Anchors:** the metronome is two layers. The body records its canvas size
and `pivot`; the pendulum records its canvas, `hub` and `swing` (degrees
each way); a pendulum can also give a `scale`. `pendulumLayout` in
`app/src/art.js` puts the hub on the pivot using whichever layers are
showing, delivered or stand-in, so each theme's art can put them anywhere.
The Classic art's measured anchors are pivot (400, 985) and hub (102, 927);
when the Art Deco art arrives, measure and record its own.

## Metronome

- **Tap tempo:** the **Tap** button beside the tempo's name (or **T** on a
  keyboard). From the second tap the tempo follows the taps: the average of
  the last six (so one slip fades), counted on the finger coming down; a
  pause of over two seconds starts again (`tapTempo` in `metronome.js`).
  **The first tap grows the button into a big tap pad** over the screen
  (animated from the button's own place and size): the tempo large across
  its top (– until the second tap), a line of what to do (*Keep tapping in
  time…*, then *Stop tapping to keep this tempo*) and a big circle that
  pulses with each tap; a tap anywhere on the pad counts. Two seconds after
  the last tap (when a new one would start counting afresh) it shrinks back
  into the button, the new tempo set. Escape closes it at once; Space and
  Enter tap on it too. With reduced motion it appears and goes without
  growing or shrinking.
- **The pendulum's weight shows the tempo and sets it**, as on a real
  metronome: it slides up the rod for slower and down for faster
  (`weightAt` in `app/src/metronome.js`), and dragging it with a finger or
  the mouse sets the tempo (`bpmAtWeight`). Its range is the chosen
  genre's (the tempo picker's), from the slowest tempo it names to the
  fastest (`genreRange` in `app/src/tempos.js`): Classical 40 to 240, Jazz
  50 to 320, Ballroom 84 to 208, Electronic 70 to 180, Marching 50 to 180.
  Changing the genre moves the weight to the tempo's place in the new range.
  The scale is logarithmic, squeezed further at the fast end, so the slower,
  everyday tempos get more of the rod; tempos past either end leave it at
  that end (they can still be typed).
  While it is dragged the pendulum eases upright and the clicks go on at the
  new tempo; a tap on it without a drag is a tap on the metronome. It
  slides to its place when the tempo changes any other way. The pendulum is
  drawn in two parts for this, its rod (`metronome-rod`, with the weight's
  `travel` along it) and its weight (`metronome-weight`, with its `center`
  on the rod; `placeWeight` in `app/src/art.js`). Round 10 delivers both
  parts for every theme, with measured hubs, weight attachment points and
  safe travel ranges. The earlier interim cuts (`*.cut.webp`, made by
  `design/source/cut_pendulum.py`) remain as source history; the app uses
  the new delivered layers. In Art Deco and Baroque the rod's tip reaches up
  into the case's crown, where the weight at the slow end sat on the crown's
  ornament and read as part of the case, so the slowest place is held lower
  there (`FACE_TRAVEL_TOP` in `build_requests.py`) and the weight stays
  inside the face.
- A metronome with a swinging pendulum: it reaches one end of its swing on
  each click and the other end on the next, synced to what you hear
  (`pendulumAngle` in `app/src/metronome.js`, corrected for output latency).
  It moves as a real pendulum does (simple harmonic motion, a cosine):
  easing to a stop at each end, where the click falls, and fastest through
  the middle. Dots under it show the beat of the bar.
  **Tapping the metronome** starts or stops the swing (`swing`, on by
  default; the same as Settings → **Pendulum swing**), which eases in and
  out over about half a second rather than jumping. **Tapping the dots**
  shows the next of three (`footView`): **small dots**, **big dots** and the
  **Visualizer**, then small dots again. The big dots are as wide as the row
  allows (the metronome shrinking above to make room), to be seen from
  across a room: the beat's dot swells into its beat with a short rise,
  brightest exactly on it, and fades after, red on a strong beat, while the
  next starts to swell into its own. Art Deco's diamonds (squares turned 45°)
  are drawn smaller and spaced by what they cover at the swell's peak, so no
  dots overlap in any theme. They are drawn straight from that
  curve every frame: the small dots' quick colour fade, left on them, had
  put the brightest moment 66 ms after the beat. A save from before carries
  over: Swing, Pulse (now the big dots) or Off, and the Visualizer.
- The Visualizer's bars are a faint neutral outline until played (the
  strong beat's a touch of its colour, so the bar still reads); the beat
  being played flashes in its colour and the beats played so far in that
  pass stay faintly lit.
- Each theme draws the Visualizer's bars in its own shapes (the bar's shape
  is a child, `.met-shape`, set through `--bar-*`, and its glow a drop
  shadow of the bar, so it follows a cut shape): Classic soft pills; Art
  Deco square bars with angled ends like its Stop button and a fine gold
  line; Robot Future chamfered segments, glowing; French Nouveau the leaf
  shape of its chips; 18th Century near-square with a double gilt line;
  Steam Punk small plates in a copper rim with a rivet at each end, lit like
  a lamp; Vintage 60s its thick print outline, the bar being played printed
  with the offset shadow; Candy a bolder ink outline, the bar being played
  inked with a hard shadow and a sparkle on the strong beat.
- The picture (the metronome over the dots) is always the same height, so
  the controls under it never move: its foot is the row of dots, Pulse's big
  dots or the Visualizer, which is exactly as tall as its rows (`sizeFoot`).
  The metronome scales down toward its top by just enough to make room (a
  transform, so it is never squashed or laid out again) while the
  dots and the Visualizer swap by a **cross-zoom** (`crossZoom`): the
  outgoing one fades out while it is drawn growing or shrinking into the
  incoming one's box, and the incoming one fades in (overlapping, so the
  place never goes blank) while it grows or shrinks from the outgoing one's
  box to its own, both about their bottom centres. Both boxes are measured
  before and after the change with the dots put at their new size at once,
  so the first frame is exactly what was drawn and the last exactly what
  will be (big dots keep their own size while they zoom away and are made
  small once unseen, the small row spacing its dots differently); dots
  growing to big dots and back animate their size, spacing and margins
  together. Each change takes 0.6 s,
  eased (none with reduced motion, and none when the window is resized).
  What was drawn is measured on screen from the box of the element the zoom
  moves (the dots' row, the Visualizer), never from the dots inside it, so a
  theme can turn, scale or glow its dots (Art Deco's diamonds) without
  moving a measurement; and a tap part way through a change starts the next
  one from exactly where things are, at the opacity they have (big dots
  still growing are held as drawn; turned back before they are gone, they
  zoom back big and then shrink in place).
- Nothing an animation does moves the page. Each screen clips what is drawn
  outside it (`overflow: clip`), so a zoom's stretched, invisible box never
  makes the page wider or taller: the page used to gain a scrollbar for a
  moment on a desktop, or room to pan on a phone, and shake. The picture is
  `contain: layout`, so nothing changing inside it lays out anything outside
  it.
  The dots are centred under the metronome at every size, and stay on one
  line (never wrapping part way while they grow or shrink for Pulse).
- **Volume**, tucked away as a faint speaker at the picture's top right:
  grab it and drag up or down and the volume follows at once, the slider
  showing while it does and folding away a moment after; tap it and the
  slider opens until a tap elsewhere (which does nothing else) or Escape.
  Arrow keys work on the slider. It starts at 0.75 (`volume`,
  `volumeChosen`), which is as loud as full volume used to be: the clicks
  are now driven harder into the soft clipper (`DRIVE` 6, was 2.4), so their
  body is about 2.5 dB louder at the same peak, and full volume reaches
  that. (Driving harder still is hardly louder, only harsher: a click is
  short and already peaks at −0.9 dBFS.) The apps' mixer takes it too, and
  the same louder clicks. Volumes saved before are carried over at the same
  loudness (`louder` in the settings).
- The clicks are loud: each is driven into a soft clipper (tanh) after
  the voice and before the volume, so the whole click sits near full scale
  rather than only its first instant, and ordinary beats sit just under the
  downbeat. Measured over a click's first 50 ms: woodblock about -9 to
  -10 dB (was -15 to -20), Click -11 to -13 (was -23 to -27), Beep -5 to
  -7 (was -8 to -13), every peak at -0.9 dBFS. Each sound's clicks are
  rendered once through that chain (`prepare` in `metronome.js`) and every
  beat plays the very same rendering, started on a whole sample. Built
  live, the woodblock's tone and knock fell into a different phase on each
  beat (start times land between samples), which the clipper turned into
  a different attack: two weak beats correlated at -0.01; now 1.000 for
  every sound, and Click's level no longer wanders by 10%. The apps play
  the same renderings.
- Everything you see follows one clock, `heardNow()` in `app/src/audio.js`:
  the time of the sound reaching your ears. It takes the smoother of the
  context's output timestamp (`getOutputTimestamp`, which includes the
  device's delay where the browser knows it, Bluetooth too on iPhone and
  Android) and its current time less the reported output latency, without
  counting a delay twice, then the manual adjustment, and looks one frame
  ahead because a frame drawn now appears about a frame later. Checked in
  Chromium: at 120 BPM the lamp peaks every 500 ms on the same frame as the
  pendulum reaching the end of its swing and the beat dot moving on.
- **Sound and visuals sync** is in Audio check's **Metronome** section
  (open when Audio check is opened from the metronome, closed otherwise): a
  slider for how much later the visuals show each beat, beyond the delay the
  browser reports. It and the manual sync button are greyed out while
  nothing visual is on (no pendulum, pulse or Visualizer).
- **Manually sync sound and visuals…** (in that section; from another page
  it goes to the metronome first) is for Bluetooth
  speakers and headphones, which play late and don't always say by how much:
  the controls give way to a sync bar while the metronome plays, with − / +
  (10 ms steps) to move the visuals until the flash meets the click, or
  **Tap on each click**: eight taps along with the clicks measure the delay
  (from when each finger came down), skip the first two, take the median,
  and set the adjustment beyond what the browser already reports (a tap
  pattern spread over more than 150 ms is rejected). Checked with simulated
  taps 180 ms after each beat: it set +160 ms (the 20 ms difference is the
  frame of look-ahead already allowed for). The setting is the Sound and visuals sync slider's.
- Tempo from 40 to 500 BPM: a slider, a number box (type any tempo; values
  outside the range are pulled in), and − / + buttons (hold to run). The
  Italian marking (Largo … Prestissimo) shows under the number. Default 120.
- Settings (gear): time signature (4/4, 3/4, 2/4, 5/4, 6/4, 7/4, 3/8, 5/8,
  6/8, 7/8, 9/8, 12/8, or no bars), a strong beat on 1 (on by default;
  compound meters also lean lightly on each group of three), **Add eighth
  notes** (off by default; its pencil changes it to Add triplets or Add
  sixteenth notes, a choice kept while it is off, `subOn` and `subKind`:
  the extra clicks fall evenly between the beats, about 7.5 dB quieter than
  an ordinary beat, 10 dB for Beep, and are not beats themselves: the
  pendulum, lamp, dots and Visualizer keep to the beat; the apps' native
  mixers play them the same way, `subdivision` and a fourth rendered
  click), and **Sound** (Woodblock, Click, Beep, a dropdown). There is no
  volume control: the metronome plays at full level and the device's own
  volume sets it.
- **Strong beats:** the pencil beside **Strong beat on 1** opens every place a
  click falls in the bar, counted as played (1 & 2 &, 1 trip let, 1 e & a),
  and any of them can be made strong, between the beats included (those
  play the strong click). **Each tap is heard at once**, on a running
  metronome too, so a pattern is tried as it is set; Done and the close
  button both keep it. With none chosen the switch goes off;
  beat 1 alone is the ordinary setting; anything else reads **Strong beat
  (custom)**, and the lamp, flash, dots and Visualizer mark the beats chosen.
  Positions are kept in twelfths of a beat (`TICKS`, `barPlan` and
  `cleanPattern` in `app/src/settings.js`), so a pattern set in eighths
  means the same in sixteenths (one the clicks don't fall on is kept, not
  played). A pattern belongs to its time signature: changing it starts from
  Strong beat on 1, and going back during the same visit brings the pattern
  back; only the one in use is saved (`accentPattern`). The apps' native
  mixers take the click for every position (`slots`).
- **Volume per beat:** a switch under the strong beats' grid. Off (the
  ordinary case), a tap makes a place strong or not, as above. On, a tap
  goes **strong → soft → silent → normal**: soft is the weak click at 35%
  (`SOFT_GAIN`), silent is no click. The dots show a soft beat faint and a
  silent one hollow; turning the switch off clears them. They are kept for
  the time signature (`beatLevels`, `cleanLevels`), apart from the strong
  beats, and `barPlan` lays them over the bar as two more click kinds,
  `SOFT` (4) and `SILENT` (5), which the native mixers take in `slots` too
  (their soft click is the weak one scaled the same). They play in a
  routine as strong beats do.
- **Tempo trainer:** a switch in Metronome settings, with a pencil for its
  numbers: a target tempo, a step (BPM) and how often (every N bars). From
  the tempo set, the metronome moves a step toward the target at the start
  of every N bars, then stays there; the number, slider and pendulum follow,
  and **Stop puts the tempo back** where it started, for another go (turned
  off part way, it stays where it got to). A line under the tempo (*Tempo
  trainer: 100 → 140 BPM*) says it is on; a tap opens the settings.
- **Silent bars:** the same, for some bars with clicks then some without
  (1 to 16 each), over and over: the beat goes on silently and the clicks
  come back to show whether it was held. The dots and pendulum keep going.
- **Second rhythm** (a polyrhythm): a switch in Metronome settings and a
  pencil with 2 to 9 (choosing one turns it on). A second, higher click
  divides each bar evenly from beat 1: 3 against 4 in 4/4, 2 against 3 in
  3/4, 5 against 4 and so on. Its click is the mid click played 1.5 times
  faster at 80% (`POLY`, `POLY_RATE`, `POLY_GAIN`), so it stands apart from
  the beat in every sound. A row of small diamonds over the beat dots marks
  its clicks where they fall in the bar (click k of n at k/n of the line from
  beat 1's dot, measured off the dots so it holds in either dot view; not
  with the Visualizer), lighting as each sounds. With no bars it is off. It
  keeps silent bars silent too.
- These run in the scheduler itself (`setExercise` in `metronome.js`; in the
  apps `metronomeExercise`, so the mixers keep exact time and the trainer
  goes on with the screen locked, the page reading the tempo back off the
  clock's period; the second rhythm is `polyN`). They apply when the metronome is started from its own
  screen; a routine's metronome plays plainly. An app built before them
  plays on plainly (it has no `metronomeExercise`, and plays soft and
  silent places as the quiet between-the-beats click) until it is rebuilt.
- The metronome settings hold **Pendulum swing** and **Visualizer rows**
  (1, 2, 4 or 8), each set whether or not it is showing. **Pressing and
  holding** the dots or the Visualizer opens the strong beats (as the
  pencil does). With no bars the dots and the Visualizer show four even
  beats, none strong. The Visualizer shows a few bars of music at a time: a
  row per bar and a horizontal shape per beat, read left to right and down.
  Each beat's shape lights on its beat and fades, to a faint glow while
  that pass is being played. The colours are the
  theme's own, a pair per theme and mode (`--viz-strong`, `--viz-beat`):
  ember and brass for Classic, orange and teal for the 60s, magenta and
  cyan for Robot Future and so on, each faintly tinted when unlit.
- On a phone the picture takes all the height the controls leave (measured
  in `fitPicture`, `--pic-h`, from what is above and below it, so not
  thrown by a change of view in progress), so the page fills the screen
  without a gap below or scrolling; side by side, 62% of the height.
- **The name under the number** speaks the tempo picker's chosen style
  (`nameFor` in `app/src/tempos.js`): the Italian markings in Classical; in
  the others, the name whose common tempos include the number (the one last
  picked first, as two names can share a tempo: Downtempo and Hip hop both
  have 90), else the name whose range is nearest. Choosing Medium swing shows
  Medium swing, and changing the style renames the tempo at once.
- **Saved tempos:** the tempo sheet (a tap on the marking) starts with the
  player's own: **Save 72 BPM · 3/4** keeps the tempo and time signature now
  and puts its name ready to type (a piece, an exercise; left empty it reads
  "72 · 3/4"); a tap on one brings both back and closes the sheet; its name
  is renamed where it stands and ✕ deletes it. Save is offered only for a
  tempo not saved yet; up to 40 (`savedTempos`, `cleanSavedTempos` in
  `settings.js`).
- **Common tempos:** below them, the same sheet has common tempos by **Style**: Classical (the Italian markings over
  the metronome's traditional marks), Jazz (ballad to burner), Ballroom
  dance (the competition tempos), Electronic & hip hop, and Marching. Each
  named tempo has one button, its usual tempo, and a chevron beside it
  with that name's other common tempos; choosing one there plays it and
  makes it the name's button from then on. The style and those choices are
  remembered (`tempoGenre`, `tempoDefaults`; the tables are
  `app/src/tempos.js`).
- No double-tap zoom: `touch-action: manipulation` on the page (iPhone
  zoomed in on quick taps such as the drone's − and +); scrolling and
  pinch-zoom still work.
- Sounds are synthesized with Web Audio and scheduled 120 ms ahead from a
  worker, so the beat stays steady when the page is busy, and keeps going if
  you switch to another tab (it's a practice tool; a hidden-tab mute would
  stop your metronome). The screen is kept awake while it runs.

## Playback Recorder

Opening it leaves it **off**: the record button starts the cycle. Where
the microphone hasn't been allowed yet, it is asked for (and let go again)
as the screen opens, so the permission question, or the news that it is
blocked, comes then rather than when you start to play.

1. **Listening:** waits for you to play. A take starts on a held, clearly
   pitched note (about 130 ms of one steady pitch, louder than the room).
   Noises like moving a chair, knocking the desk or hiss have no steady
   pitch, so they don't start one. Two seconds of pre-roll are kept, so the
   first note is never cut off. (Settings → *Start recording on: Any sound*
   is for drums.)
2. **Recording:** keeps going until you've stopped playing for 3 seconds
   (Settings: 1–10 s). Soft, decaying notes still count as playing.
3. The take is **trimmed** (from just before the first note's attack to
   when the last note has rung down) and **played back**, with its waveform
   and a playhead. Then it listens again. **Scrub** while it plays: press
   the waveform and the playhead jumps there and holds while you drag; let
   go and it plays on from that point, to hear a passage again and again.
   **Speed and loop**: while a take plays, its row in the list grows a
   second line. *50%*, *75%* and *100%* set how fast takes play, with the
   pitch kept (the audio element's `preservesPitch`), and are kept between
   visits. *Loop A–B* marks a loop's start where the take has got to; the
   button then reads *Set end*, and a tap marks the end (until then, the
   take's end goes back to the start). *Stop loop* stops looping. The loop
   is shaded on the waveform, and a looping take plays until it's stopped.
   **Playback volume** is the faint speaker at the right of the record
   button's row (the metronome's tucked-away control, `tuckedvolume.js`):
   drag it, or tap it for the slider. iPhone and iPad ignore an audio
   element's volume, so there the level goes into the samples and a take
   playing is re-made at the new level from where it was (`player.js`).
   The phone's own volume buttons set how loud playback is, not how loud
   takes are recorded: the microphone is opened with automatic gain off,
   so a take's level is what the mic hears.
   **Takes are brought up for playback** (`loudness.js`), since an
   instrument across the room records 10-15 dB under music on YouTube: each
   take's loudness is measured as streaming services measure it (ITU BS.1770:
   K-weighted, gated 400 ms blocks; it reads the same as ffmpeg's `ebur128`),
   and the take is played raised to -15 LUFS, never turned down and by 20 dB
   at most (so a near-silent take isn't made into hiss), through a look-ahead
   limiter that keeps peaks under -1 dBFS and takes off 6 dB at most (a take
   with a sharp attack is raised less instead). Worked out once per take, on
   its first play (about a second for five minutes of take). The recording,
   its waveform and its download are as the mic heard them. The scale test's
   **As played** and **Corrected** notes are raised the same way.

Recording and playback are separate: the recorder never listens while a
take plays (from the list too). How the mic is handled meanwhile is under
**Microphone and Bluetooth** below.

*Record during playback* (keep listening while a take plays, so playing
over it starts the next take) is parked: its setting is hidden and ignored
(`RECORD_DURING_PLAYBACK` in `app/src/main.js`), its code kept to fix and
re-enable later.

Every take goes in the list under the waveform, saved in the browser
(IndexedDB) so it's still there next time. Each has a play/stop button and a
trash button (with a few seconds to Undo). While you use the list, listening
is paused; it resumes when playback ends or the Undo goes away. The big
record button turns listening on and off at any time; turning it off during
a take keeps the take.

Tap a take's title to rename it (Enter or tapping away keeps it, Escape
cancels, an empty name goes back to "Take N · time"; listening pauses while
typing). The save button beside it exports the take as an MP3 (128 kbps
mono, about 1 MB a minute) named after it: on iPhone and Android it opens
the share sheet (Save to Files, AirDrop, Messages, Voice Memos…), which is
how iPhone saves files from the web; elsewhere, or if sharing isn't offered,
it downloads. The MP3 is made in a worker (`src/mp3-worker.js`, with the
unmodified LGPL [lamejs](https://github.com/zhuker/lamejs) build in
`app/vendor/lamejs/`) and kept with the take. iPhone opens the share sheet
only straight from a tap; if making a long take's MP3 used that tap up, the
button turns gold ("MP3 ready: tap save again") and the next tap shares it.

Settings (gear): silence to finish, start on musical notes or any sound,
sensitivity (lower it in a noisy room, raise it for quiet instruments), and
whether to play each take back automatically, and record during playback
(off by default). All settings are kept in
`localStorage`.

How the detector works (`app/src/detect.js`): each 2048-sample frame is
measured for loudness and pitch clarity (the peak of McLeod's normalized
square difference function, near 1 for a musical tone, low for noise). The
room's noise floor is tracked while waiting (falls quickly, rises slowly).
Talking and singing are pitched, so they can start a take.

## Tuner

Play a note and the tuner shows the nearest note (letter, accidental and
octave), a needle on a ±50-cent gauge, the cents and hertz, and a hint: *Too
low: tune up*, *Too high: tune down*, or *In tune* (within ±5 cents, when the
needle, note and band turn green). The last note stays up, dimmed, for 1.5 s
after the sound stops. While the microphone is being opened nothing is said about
it (no "microphone is off", no Try again), so opening the Tuner doesn't flash
a message that then disappears; a refusal is shown once it is known.

- **Instrument** (the dropdown on the screen): Chromatic (any note), or a
  set of strings: guitar (standard, drop D, DADGAD), bass (4 and 5 string),
  ukulele, violin, viola, cello, mandolin, banjo. With strings, the nearest
  string is ringed (green once in tune) and the needle measures against it;
  tap a string to hear its note.
- **Pitch trace**: a strip under the cents shows the last 6 seconds of
  pitch, newest at the right: the middle line is in tune, above it sharp,
  below it flat (±50 cents), with the ±5-cent band shaded. The line is green
  in tune and red outside, and breaks where the note changes or stops, so a
  held note shows whether it wavers or drifts. On a window too short for
  everything, it is the last thing to go, after the gauge has shrunk.
- **Reference tone**: in Chromatic, *Play A4* (it becomes the last note
  heard) plays a 2.5 s tone with a few harmonics, so low notes still carry
  on a phone speaker. `Space` plays it, or the nearest string's note.
- **Settings**: reference pitch A4 = 415 to 466 Hz (440 default), note names
  with sharps or flats, and a transposing instrument (B♭, E♭ or F), which
  shows notes as written for it. All are kept between visits.

The tuner uses the same microphone as the Playback Recorder (one `Recorder`
in its `tuning` state), so the permission granted for one serves the other
and the mic policy below applies unchanged. It records nothing.

How it hears pitch (`app/src/tuning.js`): every 2048 samples it analyses the
last 4096 (85 ms at 48 kHz, enough for a 5-string bass's low B). McLeod's
normalized square difference function is computed at half rate to find the
period (the first peak within 90% of the highest, which avoids octave
errors), then refined at full rate around it with parabolic interpolation.
A median of the last five readings steadies the needle and restarts when the
note changes. Tests check sine tones from 31 Hz to 1.3 kHz to within a cent,
and instrument-like tones (strong overtones, a weak fundamental, odd
harmonics only) to within 1.5 cents and in the right octave.

### Intonation Exercises

A quiet **Intonation Exercises** button under the tuner (no fill or
shadow, an outlined icon in the theme's accent, so it doesn't compete with
the tuner), set apart from Play a note by a rule and space (an icon, a line
saying what it does, an arrow). It opens a small sheet with the
exercises, each a button of the same kind: **Test My Scale Intonation**,
**Tone Matching** and **Pure Intervals**.

### Tone Matching

A cello plays a note (an exact note, picked at random from G2 to D4, never
the same note name twice running; the Drone's sampled cello at the Drone's
volume), then the player plays or sings the same note in any octave and
holds it. Once a note has held steady for 0.7 s (its readings within 40
cents), it is judged twice (`app/src/tonematch.js`, in
`test/tonematch.test.mjs`): **the right note or not** (*Right note: A*, or
*You played B. The note was A* and *2 semitones too high*), and for the
right note **how close** (*12 cents sharp · close*: in tune within 5 cents,
close within 15). A running score (*3 of 4 right*), **Hear it again** and
**Next note**. If no steady note comes within 12 s it says so.

The note never sounds while the microphone listens: it is closed while the
cello plays (where it can be taken back without a prompt) and the phone
given time to leave call mode, so it is heard at full volume on any
speaker; then listening starts again, ignoring the first 0.4 s (the room's
echo). Where closing the mic would bring the prompt back, it stays open and
what it hears while the note sounds is ignored.

### Pure Intervals

Against a held note, an interval is in tune when its frequencies make a
simple ratio (a fifth 3:2, a major third 5:4): it then sounds still, where
the piano's equal steps beat slowly. Those pure intervals differ from the
piano's by a few cents, and by 14 to 16 for the thirds and sixths (a pure
major third is 14 cents under the piano's, a minor third 16 over). String
and wind players and singers tune to them over a drone.

Chosen from Intonation Exercises, the tuner turns into the exercise: a bar
over the gauge says what to do and holds the drone's note (− and + step it,
which is the Drone's own note, `droneMidi`), **Play drone** (it plays with
the Drone's instrument and volume) and **Done**. Every note is then judged
against the pure interval it is nearest above (or below) the drone's note
(`pureTarget` and the 5-limit `PURE_RATIOS` in `app/src/tuning.js`, in
`test/tuning.test.mjs`): the needle, cents, hint and pitch trace are all
about pure, and a line under the reading names the interval and how far
pure is from the piano (*Perfect fifth · pure is 2 cents above the piano*).
The instrument, strings, reference tone and the exercises button step aside
while it is on. Done, or leaving the tuner, ends it and stops a drone it
started. The bar suggests headphones: over a speaker the tuner also hears
the drone.

**On iPhone and iPad** an open microphone holds the phone in call mode, so a
drone under listening would play quietly on the phone's own speaker. There
the button is **Hear the drone**: the drone sounds for 4 s with the
microphone closed (as Tone Matching's note does), then stops and the tuner
listens, judging the note the player goes on playing against it (*Drone
playing…* meanwhile, and the bar says so). The drone and the microphone
never overlap.

### Test My Scale Intonation

The first of the Intonation Exercises (it was behind `?scale` while in
testing, a parameter now gone). It opens a sheet that explains it in three steps (press record, play a scale, stop
for 3 seconds) under a record button (the Playback Recorder's, so each
theme draws it its own way). Pressed, it listens for the scale to begin
(the Recorder's own start detection, a steady note): it pulses while
waiting and glows red once the scale has begun, with the count of notes as
they come, and pressing it again stops. Three seconds of quiet is the end,
and the same sheet then lists every note played, each with a tick for in
tune or how many cents flat or sharp, and how many were in tune, with
**Test again** and **Done**. Pressing the record button again (Stop) once the
scale has begun shows the results at once, rather than waiting out the
three seconds of quiet (`finish` in `scaletest.js`); before it has begun it
only stops. Closing the sheet stops it. While the sheet
is up the tuner rests behind it (no note, the needle at rest, a reference
tone stopped), and it picks up again when the sheet closes. It is more lenient
than the tuner: from 10 to 35 cents counts as in tune, by the difficulty
(below), where the needle wants 5. A note is a run of clear frames on one semitone, at
least 0.12 s long, with a stray frame or two let through. Each note is
measured three ways: its **start**, where it first settled after the attack
(the median of the first 0.1 s that kept within 15 cents, the attack's first
tenth left out: where the finger landed); its **average**, the median of its
settled middle; and its **end**, where it last settled before the release
(after any correction). **Difficulty**, at the foot of the test's own sheet
(before, while listening and on the results, where a change judges the
results again at once), says how
many cents count as in tune and which of the three may show it (`LEVELS`,
`judgeNote` in `scaletest.js`):

| Difficulty | Within | Judged by |
| --- | --- | --- |
| Beginner | 35¢ | start, average or end |
| Easy | 25¢ | start, average or end |
| Medium | 20¢ | average or end (a note corrected before it ends counts) |
| Hard (the default; how it always judged) | 15¢ | average |
| Advanced | 10¢ | start (it has to land in tune) |
| Custom | Threshold, 3 to 50¢ (15) | Attack: Average, Start or End |

The results say which part of a note was right: "In tune" when all three
were, "In tune by the end" (or at the start, on average) when only part
was, and "19¢ sharp · in tune at the start" for a note out of tune by the
rule whose start or end was in tune. The score's closeness and the in-tune
share use what each note was judged by; Corrected playback shifts by the
average. Names follow the tuner's note names and
transposition, and its reference pitch. `app/src/scaletest.js` (pure,
`test/scaletest.test.mjs` plays it synthesized scales); the screen is in
`tunerui.js`. Leaving the tuner ends a test still listening.
**Each note out of tune can be heard two ways**: **As played** plays that
note's own sound, cut from the recording (the listener keeps the audio from
about a second before the scale begins to its end; `clip`, `sliceAudio`,
faded in and out over 15 ms), and **Corrected** plays the same sound shifted
onto the note it was meant to be, by playing it at a sample rate that many
cents higher or lower (`correctedRate`), so it is also a few percent shorter
or longer. A second press stops either; closing the sheet or testing again
stops it too. The test checks that a clip measures as played and, at its
corrected rate, in tune.
Upright, the card takes whatever height is left under the tuner and the
button sits in the middle of it, so the space above and below it stays even
instead of all collecting at the bottom. **It takes only the room there is.** The tuner fills the window's height
and no more (`fit` in `tunerui.js`, measured on entering, resizing, a change
of theme or font, and whenever the tuner's own content changes height, such
as a microphone message coming and going). Where the page would scroll, the
card steps down:
1. without its subtitle, and with less space above its rule;
2. smaller;
3. with no space above the rule and no box, the whole strip under the rule
   being the button;
4. only then the gauge gives up the rest, down to 72 px;
5. and last, tighter text and buttons (`.tuner-body.tight`), for a long
   microphone message on a small phone.
With the microphone working, every phone size and window tried fits: a
375x667 phone drops only the subtitle, a 1280x600 window goes to step 3.
Microphone messages (the tuner's status and Try again) sit above the card.

At the top of the results is a **score out of 10**, counted up
(`scoreOutOf10`): at Beginner, Easy and Medium simply the share of notes in
tune (65% in tune is 6.5, shown to one decimal); at Hard, Advanced and Custom
the full score below scaled to 10 and rounded to the nearest tenth (988 is 9.9). Under the
notes, as a postscript, each part of it out of 10 of its own (*In tune
6.7/10 · Closeness 8.4/10 · Clear tone 10/10*). **A perfect result is celebrated** (`celebrates`): 10 at the
simple levels, 9.7 or more at the others, with confetti in the theme's
colours bursting up and out from the score itself (`app/src/confetti.js`;
none with reduced motion) and a brief small crowd cheering just after the
success chime (`app/assets/audio/scale/cheer.mp3`, made with ElevenLabs
sound effects, the second of four takes: two seconds with a clean fade, at
-20 LUFS, under the chime's -13). The full score (`scaleScore`) is summed
note by note, each note worth an equal share of 1000, so **a scale with no
flaws scores 10**:
- **In tune, up to 600:** the share of notes in tune.
- **Closeness, up to 250:** how near the centre each note was. A note within
  half the tolerance of the centre earns it in full (as much give as the
  in-tune judgement itself has), falling to nothing at 50 cents off.
- **Clear tone, up to 150:** how clear and steady each note's tone was, the
  pitch clarity the detector measures over its settled middle (nothing at
  0.7, where a frame stops counting as a note, in full from 0.9).

Each note is marked with what it lost (`noteMarks`): at Hard, Advanced and
Custom a note with a flaw says which ("In tune · 8¢ sharp" for one in tune
but off the centre, "weaker tone" for a less clear sound) and carries the
points it cost out of 10, in tenths like the score (a flaw that cost under
0.05 reads −<0.1, so it is never shown as free).
The results come up with a chime by how it went (`resultTier`):
- **Triumphant:** 80% or more in tune.
- **Positive:** half or more.
- **Neutral, "results are in":** below half, or nothing heard.
The chimes are `app/assets/audio/scale/{great,good,neutral}.mp3`, chosen
from the takes in `design/chime-sounds.md`. They play through the same
player as the reference tones.

## Drone

A sustained tone to play along with: tuning intervals against it, long
tones, scales over a tonic.

- The note, big (letter, accidental, octave) with its frequency; − / + move a
  semitone and the list picks any note from C1 to B4 (four octaves: the
  cello's own two from its open C, and one more each way), on every voice.
  Past either end, notes wrap round by an
  octave. **Play** fades in over about 2 s, and changing the note or
  instrument while it plays crossfades (about 1.5 s out); **Pause** stops at
  once, the sound and the hall's ring gone in about 50 ms (no click), the
  same on the web and in the apps' native mixers (`mobile/test` checks it).
- **How long it has played**, under Play: while the drone plays, the time
  since Play (MM:SS, H:MM:SS from an hour) counting up, through changes of
  note; once it stops, **Last drone: MM:SS**, kept across visits
  (`droneLastSecs`) so a session can be looked back on. Timed by the clock,
  so time with the screen locked counts; when the apps' native drone stopped
  itself while the page slept, the length is up to when the page saw it
  (or, for a drone timed to stop, when it was due to). Its line has a fixed
  height, so nothing moves as it appears.
- **Accidentals** (settings: Auto, Sharps, Flats; `droneAccidentals`,
  Auto by default): Auto spells a black-key note by the way it was reached,
  C♯ stepping up with + (or a sequence going up: up the chromatic or major
  scale, round the fifths) and D♭ stepping down with − (or going down, or
  round the fourths); a note picked from the list keeps the spelling the
  list shows, and the spelling on show is kept (`droneSpelling`). The list
  is spelled the same way. Sharps or Flats always spell one way (`spelling`
  in `drone.js`). The tuner keeps its own Note names choice.
- The picture takes the height the controls leave and as much width as
  there is (up to 820 px, so it is big on a tablet), with the controls
  centred under it, measured as the metronome's picture is; a phone on its
  side keeps it beside the controls. It sits in the middle of three grid
  columns with the bow (or the organ's slider) at the start of the right
  one, so it is centred whatever width a browser gives the bow (it used to
  be balanced by a margin matching the bow, which iPad Safari did not quite
  match). To its right, an upright **volume**
  slider: drag the knob or the track up or down, or use the arrow keys (it
  is the same volume as the one in the settings).
- **How loud it can go:** the volume is a curve to a gain
  (`droneGain` in `drone.js`, 2.8 v², so equal moves of the bow sound like
  equal steps). Full volume is about 10 dB louder than it used to be, as
  loud as the drone gets without clipping: measured at −9 dBFS RMS with
  peaks at −0.5 dBFS or under, where full used to be −19 dBFS RMS. A new drone starts
  at 0.7 (`DRONE_DEFAULT`), as loud as YouTube plays: -14 LUFS for the cello
  on C3 with its fifth, -12 for the organ (it was 0.53, about -19). The old
  default saved by someone who never moved the slider becomes the new one
  (`droneVolumeChosen` is set once the slider is moved); any other saved
  volume is carried over at the same loudness. The apps' mixers are
  sent the gain.
- **Nothing clips, whatever plays together**: everything the app plays on
  an audio context (drone, metronome, the routine's chimes and voice) goes
  out through one shared limiter (`output.js`): a compressor 2 dB under
  full scale, then a soft clipper that is exactly linear below 0.8 and
  rounds off smoothly to 0.95, because the browser's compressor lets the
  sharpest transients past it by half a decibel. Measured at full volume
  over every voice (cello, soft cello, organ, synth organ) at five notes
  across the range, each with and without the fifth, a note change
  mid-drone, all three click sounds in 4/4, 4/4 in sixteenths and 6/8, and
  the synth organ with its fifth under each click sound: the loudest peak
  is −0.1 dBFS (the loudest of all is the drone and the metronome
  together), and loudness is unchanged. The apps' mixers end in a
  brick-wall limiter at −1 dBFS (`Limiter` in `PracticeMixer`, instant
  attack, 150 ms release) after their drone compressor.
- **The volume is the cello's bow**: the Drone screen draws the cello
  without its bow (`drone-cello`) and the bow (`drone-bow`) stands beside
  it. A band of colour behind the bow, from the hair to the middle of the
  stick and from the frog up to the level, shows through the gap between
  them and as a soft glow round them (the theme's deeper accent on a light
  page, its bright one on a dark page), with a small gold marker on the
  hair at the level and a small **Volume** label under it (the bow and label
  together as tall as the picture); drag along it, or use the arrow keys.
  The hair is placed from the bow's own `frog` and `tip` anchors (`alignBow`
  in `app/src/art.js`). Each `drone-cello` lies exactly on its theme's
  `home-drone` (same extent, 99-100% overlap). With an organ voice (Organ,
  Synth organ) the picture is a pipe organ (`drone-organ`, image requests
  round 8, delivered for every theme) and the volume a plain upright
  slider beside it; both set the one volume.
- **Tapping the frequency** under the note adds or removes the fifth; "(+5th)"
  shows beside it while the fifth plays and is gone while it doesn't.
- Instruments: **Cello** (the default), **Cello, soft** (sul tasto: darker),
  **Organ** and **Synth organ** (a synthesized pipe organ: 8', 4' and 16'
  pipes with a touch of wind, exactly in tune and perfectly steady). A voice
  saved before others were archived falls back to the cello.
- Settings (the volume is on the screen, not here): **Timing** first, then
  **Add a fifth above** (a pure 3:2 fifth, off by default, saves that had it
  on by default included; also toggled by tapping the frequency). **Timing**, two tabs: **Continuous pitch** (the default) with **Loop
  forever** (on by default; off shows **Length**, 1 to 60 minutes, 10 by
  default, after which it stops), or **Change periodically** with **Time on
  each pitch** (0.5 to 20 minutes, 2 by default) and **When time's up**:
  the next note chromatically up (the default) or down, up or down the
  major scale of the starting note, or up a fifth or a fourth (round all
  twelve
  notes). Choosing a note by hand starts the sequence again from it. A
  timed drone saved before the tabs becomes the matching tab (one that
  stopped becomes Continuous pitch with Loop forever off). The
  reference pitch (A4 = 415 to 466 Hz) is shared with the tuner. Everything
  is kept between visits. Space plays and pauses; arrow keys move the note.

How it sounds (`app/src/drone.js`): apart from the Synth organ, every voice plays recordings, generated
with ElevenLabs sound effects and cut into seamless loops, so every note is a
few semitones at most from a loop and is retuned to it exactly by playback rate
(following the reference pitch). The cello has loops on D2, G2, D3, A3 and A4
(stretched up to 6 semitones between A3 and A4); the organ on G2, C3, D3, F3,
C4 and A4 (up to 7, and 8.5 down to C1). The bottom octave, below a cello's
range, plays the cello's D2 and G2 and the organ's G2 an octave down (the same
loops at half speed, `cello-D1`, `cello-G1`, `organ-G1`), for now. They are made
perfectly steady: no bow change is ever heard, the pitch is held exactly and
the level and brightness are evened out, as if the bow or breath never ended.
The shipped loops were then smoothed once more (`design/source/drone/smooth.mjs`,
which rewrites a loop in place: the slow swells of level divided out, so the
level's swing in 50 ms windows went from 3-11% to 0.5-2.2%, with the seams as
clean); run it on any newly cut loop.
**Cello, soft** is the steady cello, darker (a 900 Hz low-pass, as if bowed over
the fingerboard). The organ's lowest notes are stretched down from G2 (pipes
stay natural that far). Each loop file carries 0.3 s of its own continuation
either side, so the loop points stay inside seamless audio whatever the decoder
does; all of a voice's loops load the first time it plays, so changing notes
after that is instant, and if they can't load, a synthesized version of
the voice plays instead. A light hall reverb is added in the app. Takes,
prompts, how the loops are made and how they were checked:
`design/drone-sounds.md`.

Five more voices were recorded the same way (cello section, tanpura, sitar,
shruti box, bagpipe drones) but don't sound right yet, so they are archived:
their loops and settings are in `design/sounds/drone/archive/` (with a
`manifest.json` saying how to bring one back), outside the published app.

The home icons (a cello and bow per theme) are Round 6 of the image
requests; their prompts are in `design/image-deliveries-drone.json`.

## Practice Routine

Inside the code it is the timer: `app/src/timer.js` (the routine, its saved
state and its clock, `TimerRun`, pure and tested in `test/timer.test.mjs`),
`app/src/timerui.js` (the screen and the tool cards; the tools themselves
are main.js's, `routineTools`), `app/src/pager.js` (the second page).

- **Routines**: several, each a name and a list of items (`state.routines`
  in `timer.js`). The routine's name, small and in the accent above the
  total ("My routine ▾"), opens **Routines**: each with its items and
  minutes ("2 items · 8 min"); a tap practises it. **New routine** starts an
  empty one and names it where it stands; the pencil renames, the trash
  deletes (with Undo while the sheet is open; the last one can't be
  deleted). The one routine saved before there were several becomes "My
  routine". `items` is still saved beside them (the chosen routine's), for
  an earlier version reading it.
- **Practice log**: a quiet line under the list ("🔥 3-day streak · 1 h 59
  min in the last 7 days ›", hidden while a routine runs) opens it: days in
  a row, the last 7 days, today, a bar for each of the last 7 days (minutes
  over each), and the days practised. Time counts while the metronome or
  drone plays, the Playback Recorder listens or records, or a routine runs
  (not paused), once however many are on; a day counts toward a streak from
  a minute, and a streak runs to today, or to yesterday until today is
  practised. `practicelog.js` (pure, `test/practicelog.test.mjs`) keeps
  seconds per local calendar day in localStorage (400 days); `logui.js`
  ticks every 5 s and adds the time since the last tick, at most 65 s (a
  phone asleep in a pocket isn't practice).
- **Takes named after the routine**: a take the Playback card makes while a
  routine runs is named after the item being practised, numbered on from
  takes already named so ("Scales 1", "Scales 2"; `routineTakeName` in
  `takes.js`). It can be renamed like any take.
- **A routine is a list of practice items** ("2 items in all", "Add an
  Item", "Last item"; each was called a routine on screen until there could
  be several routines).
  Set up, each is a plain row: its number, its picture, its name with a
  small **pencil** after it, and its minutes on the right ("1. Intonation ✎
  · 3 min"). **A tap on an item starts the routine from there** (the items
  before it are skipped this time; the Start button starts from the first).
  **The pencil opens that item** for editing, the row lit: its name becomes
  the list of kinds (the eight suggestions and Custom…; a suggestion's name is
  its own, and only picking **Custom…** gives a field to type the name in,
  its name selected to type over, with the list still beside it to change
  back). An item of its own opens like any other: its name shown with the
  list (nothing picked in it) and no field until Custom… is picked, so no
  keyboard comes up. **A name typed exactly as a suggestion's** (any case)
  **is that suggestion**, with its picture and its spoken lines (`matchKind`
  in `timer.js`, also applied to saved routines). Its minutes become − / + with the
  number to type (1 to 120); the pencil turns into a check to close it, and a
  **trash** button sits at the far right. The kind's chevron sits right after
  its name. Where room is short (a phone held upright) the open row drops its
  number and picture. One item is open at a time.
  **On a phone, a long press on an item** (about half a second) turns the
  list to editing with that item in hand, ready to drag up or down (the page
  doesn't scroll under it; a quick swipe still scrolls, and letting go
  without moving starts nothing). **With a mouse**, the list is rearranged
  from its edit button (an item in the plain list isn't dragged), and a
  **right click** on an item opens its menu: **Rename** (the item opens as
  one of its own, Custom, its name selected to type over), **Turn off** /
  **Turn on**, and **Delete** (both with Undo). The **pencil** beside the
  total time (at the top of the screen), or a tap on the total itself, edits
  the list; while editing it is
  a pill, **✓ Drag to reorder items**, which says the list is being edited
  and how to move an item, and is tapped to finish. Each
  row then has:
  - a handle to **drag it up or down**, though the **whole row can be
    dragged**, by touch or mouse (a sideways move is a swipe instead; the
    others make room as it passes their middles; the arrow keys move it too,
    from the handle);
  - its name, its pencil (as above; an open item keeps its handle where it
    was, hides its switch, and keeps its trash at the far right) and its
    minutes;
  - a switch: **in the routine or not**. Turned off, an item keeps
    everything it has but is left out of the run and the total, and shows
    only while editing, dimmed and unnumbered, until it is turned on again;
  - a **trash** button. An item can also be **swiped off** either side
    (past a third of its width; short of that it springs back). A deleted
    item has **Undo** for a few seconds. **An item with more than three
    settings of its own** (`customCount`: each tool it has on, and each tool
    setting unlike the tools' own, which a new item starts from) asks first,
    saying they will be deleted with it (*Keep it* / *Delete*), whether it is
    deleted by its trash button, a swipe or its menu.
  The list's pencil is hidden while a routine runs.
- A first visit starts with **Intonation** (3 min) and **Scales** (5 min).
  **+ Add** opens **Add an Item**: Intonation, Scales, **Arpeggios**,
  **Metronome**, **Sight Reading**, **Improvisation**, **Clapping Rhythms**,
  **Ghosting** and **Custom…** (a blank item, opening the list for editing
  with its name ready to type), each by its name and its picture
  (`pictureFor`: its own, `practice-<kind>`; until that is delivered, or for
  a Custom item, the Drone's for one with its drone on, the Metronome's for
  one with its metronome on, then the default music stand, then the
  hourglass). A new item starts at the minutes last given to its kind
  (`lastMinutes`) or its default the first time (3 min for Intonation,
  Clapping rhythms and Ghosting, 5 for the rest). Items saved under a
  suggestion's earlier name ("Intonation practice") still know which it was.
  Kept in `musicpractice.routine.v1`.
- **Each item keeps its own settings for every tool**: the Metronome's
  tempo, time signature, click sound, extra notes, accent and volume
  (`met`), the Drone's note, instrument, fifth and volume (`drn`), the
  Playback Recorder's silence to stop after, whether it plays each take back
  and its playback volume (`pb`), and which of them are on (`tools`). A new item has the tools off and their settings taken from the
  app's own as a start. Items saved when they had their own metronome and
  drone keep them on.
- **A break between routines**, set in Practice Routine settings: **No
  break**, 15, 30 (the default) or 45 seconds, 1, 1.5, 2, 3, 5, 10 or 15
  minutes, or **Pause when done**. As a routine ends the chime and voice say
  what is next and the tools rest (a take on the go is let finish); the
  header says **Break**, with the hourglass, the break counting down and
  what comes next, outlined dashed in the list. At the end a chime and the
  next routine's tools start. *Pause when done* waits, paused, until play.
  Skip goes a step at a time (a routine to its break, a break to the next),
  a card's button during a break plays that tool without changing the next
  routine, and there is no break after the last. The total counts the timed
  breaks ("12:00 · 3 items in all · 30 s breaks"). `TimerRun` in
  `app/src/timer.js` (`rest`, `resting`, `waiting`; events `rest` and
  `begin`), `RESTS`.
- **What the tools do at each moment is decided in one place**:
  `toolPlan(moment, state)` in `app/src/timer.js`, pure and tested, says
  which tools start, which stop and whether a take on the go is let finish,
  for an item starting or going on, the voice finishing, a break, the end,
  the last take finishing, and Pause or Stop. `timerui.js` only carries the
  plan out (`act`), so a change to how the routine treats its tools is a
  change to that function and its test.
- **Running, the routine is a shell around the tools.** **Start** swaps the
  set-up panel for a **compact header** (the item's picture to the left of
  its name, its time left, what is next, a progress bar, and Pause, Skip and Stop as round buttons) over an
  **activity area**: a row of **cards, one per tool**, that swipes sideways a
  card at a time with the next peeking in (dots under it say which, and
  jump to one), or stands three across where the window is wide enough. Each
  card is a small version of its tool with, at its foot, **the tool's own
  way of starting and stopping** rather than a switch: the Metronome's
  **Start** / **Stop**, the Drone's **Play** / **Pause**, and the Playback
  Recorder's round **record button** (lit as on its own screen: listening,
  recording, playing back), all at one height across the cards. A **gear**
  in its header
  that opens that tool's settings for the item running (only the tool's: no
  Audio check or Theme), including whatever the card itself has no room for:
  the Metronome's tempo (typed or − / +), time signature, click sound, extra
  notes, *Accent the first beat* and volume; the Drone's note, instrument,
  fifth and volume; the Playback Recorder's *Stop recording after* (1 to
  10 s of quiet), *Play each take back* and playback volume. Each is set on
  the tool at once and kept with the item. On the card:
  - **Metronome**: off, the tempo (− / + and a slider) and the time
    signature. **On, the beat instead**, with the tempo and time signature
    in a line under it, in one of three views that a tap on it steps
    through, as the Metronome's own dots do (`metView`, remembered): **its
    picture with the pendulum swinging** (the weight placed for the tempo;
    no dots), **big dots** that swell into each beat and ease away, or the
    **Visualizer**'s bars, two bars of music lighting beat by beat (the
    theme's own bars); the last two without the picture;
  - **Drone**: the note (− / +), the instrument and the fifth;
  - **Playback** (the Playback Recorder): what it is doing (listening for
    you to play, recording with its clock, playing your take back) and how
    many takes there are.
  As each item starts, **its settings go on the tools**, and the tools it
  has on start while the rest stop (one already going carries on). **Those
  it starts wait for the voice**: when the voice is on, the ones the item
  turns on start once it has finished speaking (the ones it turns off stop at
  once), so the announcement isn't spoken over a fresh click or drone, and
  the recorder isn't listening yet (`afterVoice` in `timerui.js`; Pause, Stop
  or Skip in the meantime see to them instead, one turned off on its card
  stays off, and a voice that never reports its end holds them 15 s at
  most). With the voice off they start at once. Whatever
  is changed on a card or in its settings is **kept with that item** for next
  time. **Only the routine's own moves wait for a take**: when an item's time
  runs out and the next has the Playback Recorder off, a take being recorded
  is let finish and play back first; what the player does (Skip, Stop, a
  card's button) acts at once, cancelling it. The tools run as themselves (the Metronome's sound, accent
  and volume, the Drone's reference pitch), and **their own settings are put
  back** when the routine ends or is stopped, so a routine's tempos never
  become the Metronome's. The list stays under the cards, the running item
  lit with its progress along its foot. In the apps the Drone card asks for
  Pro, as the Drone does. **Pause** stops the clock and every tool,
  **Resume** puts the item's set-up back on, **Skip** moves to the next
  item (paused or not), and **Stop** ends the run. Timed by the clock, so a
  phone that slept catches up when it wakes.
- **At the end, every tool stops**, except that when the routine's time
  runs out by itself (not by Skip) a take on the go is let finish: if the Playback Recorder is recording, everything carries on until
  the take is in, then the metronome and the drone stop and the take plays
  back, and only then does the routine end (the header says *Finishing the
  last take*, and its card comes into view). A metronome or drone started
  from a card never replaces the audio engine while the mic is using it
  (`soundCtx` in `metronomeui.js`), which would cut the recorder off. The Playback
  Recorder suspends that engine while a take plays back (it always has, so
  the phone leaves call mode), so the metronome and the drone pause under a
  take and carry on after it.
- **A voice says what has finished and what is next**, after the chime,
  over whatever tools are on (a Playback Recorder listening for you to play
  pays the chime and the voice no attention: `ignoreFor` in `recorder.js`). For example: "Scales are complete. Next, ghosting.", "Let's begin
  with intonation practice." at Start, and "…That's the end of your
  practice routine. Well done." at the end. Settings: **Use Voice** on (the
  default) or off (turned on, it says nothing until it has something to
  say), **Voice Personality** (a dropdown: Lily, Matilda, George, Clara,
  Autumn or Theo, each saying hello as it is picked) and **Voice volume** (a
  curve to a gain, `voiceGain`, up to 1.6; it starts at the 0.9 the voice
  always had, and says hello at the new level when let go). Every kind of item has
  its own lines (done-, next- and first-<kind>), and a Custom item the
  generic ones ("That practice item is complete.", "On to your next
  practice item."), so lengths and typed names are never spoken. They are
  `app/assets/audio/voice/<voice>/<line>.mp3`, 29 per voice, made with
  ElevenLabs by `design/source/voice_lines.py`, which keeps each voice's id,
  model and settings and every line's text, per language, so the set can be
  made again or in another language in the same voices
  (`design/voice-samples.md`). **A new suggestion needs its lines in every
  voice** (add them there and run it); `test/timer.test.mjs`
  checks they are all there. Everything a routine may say is loaded when it
  starts; Pause, Skip and Stop cut a line short.
- **Between items, a chime** (settings: **Use Chimes** on or off, and
  **Chime Sound**, a dropdown: Kalimba, the default, Two-tone or Celesta; each
  plays as it is picked; a "None" chime saved before is now chimes off): it rings as an item ends,
  and at the end. The sounds are
  `app/assets/audio/timer/`, from the second batch in
  `design/chime-sounds.md`. The settings end, as every settings sheet does,
  with **Audio check…** and **Theme…**.
- **On the home screen** it is a fifth button: always on a window wider than
  tall (one row of five, compacted to fit), and upright when all five fit
  without scrolling (two across with the fifth centred below). When they
  don't (most phones held upright), it is a **second page**: swipe left on
  the home screen and the routine slides in from the right, the page
  following the finger (a short or slow swipe springs back); swipe right, or
  Back, to return, the home page sliding back in over the window as the
  routine slides out. While a page turns, both pages are fixed layers drawn
  exactly as at rest (the outgoing one held where it was scrolled to, the
  incoming one at its full natural height), and the page itself can't scroll
  (`freeze`/`thaw` in `pager.js`): a sliding page used to widen the page into
  a passing horizontal scrollbar, a slight vertical drift of the finger
  scrolled it, and the incoming home page was drawn squeezed to the window
  and moved when it settled, most visibly after expanding a card. A swipe
  that springs back returns the routine to where it was scrolled. The slide
after the finger lets go is timed from the finger's own speed over the last
tenth of a second (the curve leaves at that speed; 170 to 420 ms), with the
end transforms written before it starts, the finished animation held until
both pages settle in one step, and a timer behind it: the approach the
Cambrian carousel arrived at on an iPhone, where the earlier fixed, short
slide read as a snap. The way across is a **smaller Routine button**
  under the other four (its hourglass, its name and a chevron pointing the
  way it slides, the mirror of the back arrow on its page, drawn as that
  theme's buttons are), which plays the same slide; the routine's back arrow
  slides back. Its icon is as large as the room left allows (72 down to 32
  pixels, `ROUTINE_ART` in `main.js`); if even the smallest doesn't fit, the
  home screen's spacing tightens first (`#home.tight`). Whether things fit
  is measured at both ends, because the centred home screen spills off the
  top as well as the bottom. Once there is another tool the button version
  will be used everywhere.
- **Each kind of item has its picture** (`practice-<kind>`: intonation,
  scales, rhythms, ghosting, image requests round 11; arpeggios,
  sight-reading, improvisation, round 12; a Metronome item shows the
  Metronome's own home picture, `picture` on its preset), and there is a
  default (`practice-default`, a music stand), shown small in the list, in
  Add an Item and beside the running item's name. **The pictures of an
  activity are shared**: in the warm brass-and-gold themes (Art Deco, 18th
  Century, French Nouveau, Steam Punk) each came out a near-copy of
  Classic's, so those themes use Classic's (`SHARED_PICTURES` in
  `design/source/build_requests.py`, status `shared`); only Vintage 60s,
  Robot Future and Candy, whose rendering really differs, have their own.
  The music stand and the hourglass stay per theme, since they carry the
  theme in their shape. **A new suggestion needs a picture too:** add it to
  `PRACTICE_SUBJECT` in `design/source/build_requests.py` (it is asked for
  in those four themes); `test/timer.test.mjs` fails until every suggestion
  has one in every theme.
- Its home button is an hourglass per theme (image requests round 9,
  `home-routine`), delivered for all eight themes. In the apps the drone
  is Pro, as on its own screen. Not done yet: the routine doesn't go on
  with the screen locked in the apps (the native metronome and drone do, but
  the change of item waits for the page).

## Controls

Touch or mouse throughout. Keyboard: `Space` starts/stops the metronome or
turns listening on/off, or plays the tuner's reference tone, arrow keys change the tempo (`Shift` for 10),
`Esc` goes back or closes settings. As a tool on the mini apps shelf it skips
the game title screen and controller support from `GAME_GUIDELINES.md` in
favour of the two-button home screen.

## Words and translations

Every word the app shows is in one file, `app/src/text-config.js`, under keys
named for where the words appear (`metronome.settings.sound`,
`recorder.state.waiting`, `paywall.headlines.drone`). Edit the words there,
never in the code that draws them. A line with a number or a name in it is a
small function of that value, so a translation can put the value wherever its
sentence needs it, and a few lines mark **bold** or _emphasis_ (shown by
`rich()` in `app/src/text.js`; nothing else is read as markup).

`index.html` holds no words of its own: each element names its key
(`data-text`, `data-text-rich`, `data-text-aria-label`), and `app/src/text.js`
fills them in before the page shows. `app/test/text.test.mjs` keeps it so:
every key the page names exists, `index.html` has no words, every line is
non-empty, the label tables (themes, sounds, tunings, voices, sequences) come
from the file, and no module spells out a sentence.

For another language: copy the `EN` object, translate its values, and point
`TEXT` at it (a language setting can choose between tables later). Not in the
file, on purpose: the privacy page, the device details Send feedback attaches
(written for the developer), note names, and the native apps' own strings
(iOS's microphone reason in `Info.plist`, Android's notification).

## Files

- `mobile/`: the iOS and Android apps (Capacitor around `app/`), with how to
  build them, set up purchases in the stores and RevenueCat, and give friends
  Pro: see `mobile/README.md`. In the apps the Drone, every take and all the
  themes are Music Practice Pro (`app/src/pro.js`, `pro-config.js`,
  `native.js`); the website stays all free. In the apps the metronome and
  drone play natively and keep going with the screen locked
  (`app/src/nativeaudio.js`), and the themes' fonts are bundled.
- `app/src/text-config.js`: every word the app shows (see "Words and
  translations"); `app/src/text.js` puts them on the page.
- `app/src/feedback.js`: Send feedback (Settings, and Report a problem in
  Audio check). It posts to the same feedback inbox as the cambrian games: the
  shared Apps Script in the `hoai2k.github.io` repository
  (`tools/feedback/Code.gs`, set up as in cambrian's `docs/FEEDBACK.md`), a
  row per message in a private Google Sheet with `game` = `musicpractice`, and
  an email to say it arrived. Only the message is required, marked with a
  red * (and a "* Required" key under the intro); the email is optional, and
  must look like one only if given. The shared script still asks for an
  address, so a message without one carries `no-email@feedback.invalid`
  (`NO_EMAIL`, a reserved domain that is never an address). The
  topic and the device details (with the Audio check's readings, shown before
  sending and optional) travel at the end of the message. Same spam defences:
  a hidden honeypot field, Send held for 3 s, the script's hourly caps. A
  failed send says so and keeps what was written. Empty `ENDPOINT` and the
  buttons disappear.
  **Include debugging data** (off, and unticked again every time the form
  opens) adds the debug log's state and its most recent events, as many as
  fit in what the message and details leave of the script's 4000 characters.
- `app/src/debuglog.js`: the debug log, for problems only a real phone shows
  (sound too quiet over Bluetooth, say). Kept in `localStorage`
  (`musicpractice.debuglog.v1`, the newest 1500 events, across visits), it
  records each audio context made and its states, why one was marked stale
  and replaced, every Safari audio session change, every mic request, open,
  reuse and close with the reason it was freed or held (permission,
  allowed-in-advance timing, a suspected prompt), mic track events, the
  speakers and mics reported (ids shortened), each take played (the route,
  the mic, Safari's mode, how much it was brought up), the metronome and
  drone starting and stopping with their volumes, screens, page visibility
  and errors; and every 10 s while sound plays (otherwise on a change) a
  snapshot of all that with the app's own output level, peak and RMS in dBFS,
  read off the limiter by an analyser (`output.js`), so a healthy level from
  a quiet phone shows the loss is after the app. **Export debug data** at the
  foot of Audio check saves all of it as JSON (shared on phones, downloaded
  elsewhere, as takes are: `saveFile` in `ui.js`). Nothing is sent unless
  the person sends it; `privacy.html#debug-log` says so.
- `app/privacy.html`: the privacy policy and terms, for the apps' paywall and
  store listings. `app/support.html`: the support page (a contact form into
  the feedback inbox, and common questions), the listings' Support URL.
  Settings links to both.
- `design/mobile-apps.md`: why the apps, what to sell and the store rules.
- `mobile/LAUNCH.md`: launching the apps: accounts, hardware and installs,
  the owner's steps in order, and Claude's list before submission.
- `design/app-store-review.md`: the iOS app checked against Apple's App
  Review rules, what's done, what's left for submission, and review notes.

- `app/index.html`, `app/styles.css`, `app/src/`: the app (static ES
  modules, no build step). `main.js` the app around the screens (theme,
  moving between screens, app settings and dialogs, keys, the routine's hold
  on the tools, start-up); each screen its own module: `metronomeui.js` the
  Metronome, `recorderui.js` the microphone (shared with the Tuner) and the
  Playback Recorder, `tunerui.js`, `droneui.js`, `timerui.js` and `logui.js` (the practice log) the rest,
  and `ui.js` the small helpers they share. `metronome.js` the
  scheduler, sounds and pendulum, `recorder.js` the mic and take state
  machine, `capture-worklet.js` the mic tap, `detect.js` the music/noise
  detector and trimming, `waveform.js` the waveform views, `takes.js` saved
  takes, `practicelog.js` the practice log's days and streaks, `settings.js` settings and themes, `audio.js` the shared
  AudioContext, `art.js` theme art and pendulum anchors, `standins.js` each
  theme's drawn stand-ins. `player.js` take playback through an `<audio>` element,
  `wav.js` the WAV encoding it uses, `mp3.js` and `mp3-worker.js` MP3
  files for saving, `devices.js` mics, speakers and
  permission, `audiocheck.js` the Audio check dialog, `tuning.js` pitch
  detection and note names, `tunerui.js` the tuner screen, `drone.js` the
  drone's notes, sequences and sound, `droneui.js` its screen.
- `design/image-requests.md` and `app/data/asset-list.json`: generated by
  `design/source/build_requests.py`. Round 1 (the Classic theme, the app
  icon and the library cover) is delivered; prompts, files and export
  details are in `design/image-deliveries.json`. The four Round 2 Art Deco
  theme images are delivered; their prompts, files and measured anchors are
  in `design/image-deliveries-round-2.json`. Round 3 delivers 24 images across
  Vintage 60s, 18th Century, Robot Future, French Nouveau, Candy and Steam
  Punk; prompts, paths and layer geometry are in `design/image-deliveries-round-3.json`.
- `app/assets/audio/drone/`: the Drone's recorded loops; `design/drone-sounds.md`
  explains them, `design/sounds/drone/` holds the source takes (and, in
  `archive/`, the loops of the voices not in use) and
  `design/source/drone/` the tools that make the loops.
- `design/chime-sounds.md`, `design/sounds/chimes/`: candidate start and end
  chimes (singing bowls, bells, chimes) for a Practice timer, not used yet,
  with their prompts, measurements and a shortlist; cleaned by
  `design/source/chimes-clean.py`.
- `design/source/make_icons.py`: makes `app/icons/icon-180/192/512.png`
  from the delivered `icon-1024.png`, or a drawn stand-in until then.
- `publish.sh`: copies the app to `local/pages/musicpractice/`, then
  `stamp.mjs` gives the copy addresses that change with each file's
  contents: `src/main.js?v=<hash>` and `styles.css?v=<hash>`, and an import
  map sending every module import to its own `?v=<hash>`. GitHub Pages lets
  each file be cached for 10 minutes on its own, so without this a phone
  could load a new `index.html` with an old cached `text-config.js` and show
  a key (`common.themeButton`) in place of its text. The source is
  untouched; the apps' copy (`mobile/copy-web.sh`) is stamped too.

## Checks

```sh
node --test musicpractice/app/test/*.test.mjs
python3 musicpractice/design/source/build_requests.py --check
musicpractice/publish.sh local/pages/musicpractice
```

**Browser checks** (Chromium through Playwright, a few minutes, so on demand:
before a push that changes the app's screens, styles or the routine), from
`musicpractice/app`:

```sh
node test/browser/run.mjs           # all of them
node test/browser/readability.mjs   # or one; --themes deco,scifi --modes light
node test/browser/flows.mjs
```

- `readability.mjs` opens every screen and every sheet or dialog the way a
  person does (27 views, `VIEWS`) in every theme in both modes, and checks
  each piece of text: 4.5:1 against what is behind it (3:1 large), at least
  12.5px. It found 143 failures the first time it ran, which the settings-
  only check had never seen.
- `flows.mjs` drives what a person does, by touch and by mouse: the routine
  list (the edit pill, the total's tap, one row height, dragging from a
  name, swiping off, items of their own and names that match a suggestion),
  a routine running (tools waiting for the voice, carrying on or stopping,
  a real 15-second break, Skip, pause when done), the metronome (+ and −,
  a typed tempo, Start and Stop, common tempos, the dots' views, the swing,
  3/4 and eighths, the sync bar, dragging the weight), strong beats heard as
  they are set, the microphone with a player at it (a synthesized note
  makes a take, which plays back and is kept after a reload, and the tuner
  reads A3), and a saved theme that no longer exists.
- `visual.mjs` pictures every still screen and sheet (25) in every theme
  and mode, `--save <dir>` before a change to the styles and `--compare
  <dir>` after: a refactor of `styles.css` should change nothing (a few
  stray antialiased pixels are allowed), and pictures that differ are saved
  beside the originals to look at. Animation is off, fonts and pictures are
  waited for and canvases masked, so the same page draws the same picture.
  Not part of `run.mjs` (it needs a picture from before).

`lib.mjs` finds Playwright (node_modules, `/opt/node-tools`, or global),
serves `app/` as it is (no build step), answers Google Fonts with the apps'
bundled fonts (`mobile/fonts/`: the same fonts every run, no network) and
opens pages in a theme and mode with a fake microphone (or a WAV of a
player, `playerWav`).

The iOS and Android apps (`mobile/`) aren't rebuilt or tested for ordinary
changes to the web app; they pick the changes up at their next `npm run sync`.
Build and test them when working on the apps themselves (`mobile/README.md`).

The detector tests synthesize notes, chords, vibrato, hiss, chair scrapes and
thumps and check which start a take, when it ends and how it is trimmed. The
whole flow was also checked in Chromium with a synthesized session as the
microphone (a scrape, then a phrase, then silence): the scrape was ignored,
the take started on the first note, ended 3 s after the last, was trimmed to
the phrase, played back, and listening resumed. A second run, with a
second phrase starting during playback, checked both modes. By default the
mic was closed during playback (the second phrase was ignored) and reopened
afterwards. With Record during playback on (now parked), the mic stayed
open and the second phrase stopped the playback and started a new take.

The tuner was checked in Chromium with a 194 Hz guitar-like tone as the
microphone: it read G3 −18 cents (−26 cents as a written A3 on a B♭
instrument at A4 = 442), ringed the G string in guitar tuning, played string
tones, kept its settings after a reload, and picked up again after a visit to
the Playback Recorder, in every theme, portrait and landscape.

## Leaving the app and coming back

Phones suspend sound, pause media and cut the mic while the app is in the
background. On return (`visibilitychange` in `app/src/recorderui.js`):

- the AudioContext is resumed, so a metronome left running carries on (or
  on the next tap, if the browser wants one); the next Start gets a fresh
  context in case the output changed while away;
- a take that was playing back carries on from where it was paused, then
  listening resumes as usual;
- a mic that was cut off is reopened (`Recorder.reopen`). A take that was
  being recorded is kept as far as it got (without playback) and listening
  starts again. A watchdog also reopens the mic if it goes quiet for 2.5 s
  while the sound is running, and the same happens if a call takes the mic
  while the app is open (if it can't be reopened, the recorder turns off and
  says why).
- **iPhone after another app** (Messenger, a call, a video): iPhone can
  leave the audio engine "interrupted" for good, and the mic can stay
  silent while it still reports itself alive. So: a tap while listening is
  stuck like that starts listening again on a new engine (only a tap can
  start one); the record button, if it shows listening but hears nothing,
  starts again rather than turning off; and the watchdog reconnects the mic
  once, then, if it is still silent, asks for a new one (it is dead whatever
  the browser says), then asks for a tap ("Tap anywhere to start listening
  again"). The tuner recovers the same way.

Stopping the metronome or turning the recorder off before leaving, then
starting again after coming back, works as on a first visit. All of this was
checked in Chromium by simulating a phone leaving and returning (the page
hidden, the context suspended, the mic track ended, media paused): a running
metronome, a stopped one restarted, listening, recording mid-take, a take
playing back, the recorder turned off and on again, and a take playing from
the list. The iPhone case was reproduced by leaving with the engine suspended
and its `resume()` doing nothing: before the fix, pressing record turned
listening off and nothing more was recorded; after it, either a tap anywhere
or the record button started listening again on a new engine, and the next
phrase was recorded and played back.

## Microphone and Bluetooth

Two requirements pull against each other on phones. While a page holds the
mic, the phone stays in call mode, so sound plays on its own speaker, not a
Bluetooth speaker. But asking for the mic again can bring the permission
prompt back, which would stall the listen → record → play back loop. Safari,
and every iPhone browser (Apple requires them all to use Safari's engine),
asks again unless the site's microphone is set to Allow. So
(`app/src/recorder.js`, `app/src/devices.js`):

- **Permission saved**: the browser reports it as granted (Chrome and
  Android once allowed), or the first mic request was granted at once
  (under 0.6 s, so no prompt was shown: how a Safari site set to Allow
  shows, since Safari may not report that setting through the permissions
  API). Then the mic is open **only while listening or recording**: it is
  closed for each playback (automatic or from the list), when Record is off,
  and when the recorder screen is left (so the metronome plays outside call
  mode too), and taken back without a prompt when listening starts again.
  Before a take plays, the app waits for the phone to leave call mode (up to
  1 s on iPhone, 0.7 s elsewhere; `outputSettled`). It doesn't close the mic
  when the app loses focus: on a computer you may be reading music in
  another tab while recording, and phones cut the mic in the background
  anyway (see Leaving the app and coming back).
- **Permission not saved**: the mic is asked for once and held for the
  visit, its track switched off when not listening, so the loop never
  stops for a prompt; sound stays on the phone's speaker. Audio check says
  so and shows how to set the site's microphone to Allow (a web page can't
  open those settings itself).
- **iPhone tip**: on iPhone and iPad, when the Playback Recorder opens and
  the mic turns out not to be set to Allow, a card at the top of the screen
  says Bluetooth playback won't work and shows how to fix it. Each step
  has a picture of a phone screen with the place to tap circled in red: the
  button at the left end of Safari's address bar, Website Settings in the
  menu it opens (with More, where some versions put it), then Microphone and
  Allow. They show where things are rather than exactly what the buttons
  look like, since Safari restyles its buttons between iOS versions (aA
  became a page icon in iOS 26) while their places stay put. Also the
  all-sites alternative (Settings app → Apps → Safari → Microphone) and a
  Reload page button. Its title (with a chevron) folds it to one line,
  remembered between visits; it only goes away for good once the mic is
  allowed. It doesn't block recording. Audio check shows the same steps.
- **Safeguard**: if taking the mic back ever takes over 0.9 s (a prompt
  appeared after all), the mic is held for the rest of the visit.
- The mic is asked for again only when the browser reports the held one
  dead (the app was left, a call took it); a mic that only goes quiet is
  reconnected from the held stream.
- **Built-in mic preferred**: recording through a Bluetooth device's mic
  switches it to call-quality sound, so when a Bluetooth mic is listed the
  built-in one is used (once names are known; the first time, it switches
  right after permission, asking while the first mic is still open so
  there's no second prompt). Audio check can choose another mic.

Takes play through an `<audio>` element (primed by the first tap; Web Audio
if refused), which follows the current output more reliably. Safari's
session is set to `playback` only while no mic is held.

**In the apps**, the microphone is asked for once, the first time the Tuner
or Playback Recorder listens, and kept. If it is off (refused, or switched
off in the phone's Settings), the Tuner, the Playback Recorder and Audio
check, and nowhere else, say **Microphone is off for Music Practice** with
an **Open Settings** button to the app's own page there; the note goes once
it is back on. The page asks the phone without prompting (`micPermission`,
`openAppSettings` in `app/src/devices.js`).

**Theme…** sits at the right end of the line Audio check starts, at the foot
of each mini app's settings (two separate global features): it opens
the theme tiles and Dark Mode in a sheet of their own (the main settings'
own controls, moved in while it is open), so the theme can be changed from
anywhere. The main settings have the theme already, so their line holds
**Audio check…** and **Reload Page** instead.

Every sheet's title stays at its top as it scrolls and covers the sheet's
whole width, so nothing scrolls past beside it. A sheet takes the focus
itself as it opens (`showModal` wrapped in `main.js`), so its close X
doesn't wear a focus ring on a phone; Tab still moves into it.

**Audio check** (a button in every settings sheet, `app/src/audiocheck.js`)
says nothing about how takes will play while all is well, and only when
something is wrong explains it: the microphone not yet set to Allow (so it
is kept open and Bluetooth can't be used) gets the same short message the
Playback Recorder shows, and a blocked microphone a line saying so, each
with the pictured steps to allow it; a test sound played the way takes are,
with a **Reload page** button beside it (what the steps end with);
the microphone choice (Automatic, built-in preferred, or any listed mic,
Bluetooth marked); the speaker choice where the browser allows one
(desktop Chrome and Edge); and what the browser reports (engine, permission, mic state, devices, Bluetooth names, output
delay, Safari's audio mode). The settings sheets carry no explanatory
lines under their controls, apart from the Drone's and the Playback
Recorder's, where they help.

Audio check's "What the browser reports" shows both signs (the reported
permission and how long the first request took) and the **last take
played**: whether the mic was freed, how long playback waited, Safari's
audio mode at that moment and which player was used, so a take that still
misses a Bluetooth speaker can be traced.

**What others found** (researched October 2026): on iOS, once any page or
app has the mic open the audio session is "play and record", in which
Bluetooth A2DP output isn't available (Apple engineers on the developer
forums call this expected), so sound goes to the phone or a headset's
call-quality mode; web pages can't choose the output. iOS stays in that
mode for several hundred ms after the mic is closed. Developers shipping
voice apps in Safari settle on the same pattern used here: ask for the mic
once for permission, open it only while listening, close it before playing.
Safari asks again for the mic once per page (and after a timeout) unless the
site is set to Allow. `navigator.audioSession` (iOS 17+) sets the session
type; `playback` also stops the silent switch muting Web Audio. Sources:
[Sam Eddy, iOS Safari audio sessions](https://samueleddy.com/writing/ios-safari-audio-sessions/),
[Apple forums: Bluetooth with PlayAndRecord](https://developer.apple.com/forums/thread/4340),
[Apple forums: A2DP as output](https://developer.apple.com/forums/thread/5787),
[MDN: AudioSession](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession),
[W3C Audio Session](https://www.w3.org/TR/audio-session/),
[WebKit bug 215884](https://bugs.webkit.org/show_bug.cgi?id=215884),
[W3C WebRTC list: prompt once per document](https://lists.w3.org/Archives/Public/public-webrtc-logs/2019Oct/0176.html),
[Huddee: the Web Audio mute-switch fix](https://huddee.com/blog/apple-quietly-fixed-web-audio-bug).

**Known pitfalls checked** (October 2026) for playback reaching a Bluetooth
speaker on iPhone with the mic allowed. With these in place, takes were
confirmed playing on a Bluetooth speaker on an iPhone, with the
record-play loop carrying on:

- *Web Audio stuck quiet or on the earpiece after the mic was used*
  ([WebKit 218012](https://bugs.webkit.org/show_bug.cgi?id=218012),
  [198545](https://bugs.webkit.org/show_bug.cgi?id=198545),
  [230902](https://bugs.webkit.org/show_bug.cgi?id=230902); still reported on
  iOS 18.6, fixed for media elements but not Web Audio): takes play through
  an `<audio>` element, not Web Audio. The audio engine that ran the mic is
  suspended while a take plays (suspend/resume is the reported workaround,
  and a running engine shouldn't hold iOS in call mode) and resumed when
  listening starts. The metronome gets a fresh engine after the mic was used.
- *Output staying in call mode after the mic stops*: the mic tracks are
  stopped, Safari's session is set to `playback`, and the take waits up to
  1 s for iOS to leave call mode.
- *Autoplay*: WebKit only counts touchend, click and keydown as gestures
  that may start audio, not pointerdown or touchstart, so the player is
  primed (and the engine unlocked) on those; a take then starts on its own
  on the primed element. If it is still refused, it falls back to Web Audio
  (Audio check's last-take line says which was used).
- *Changing Safari's session type*: per the Audio Session spec a new type
  takes effect straight away; the app only switches it while no mic is
  held, so the switch can't cut the mic off.
- *Bluetooth mic*: recording through a Bluetooth device's mic switches it
  to call quality; the built-in mic is preferred.

**What can be detected on iPhone**: no speakers are listed at all, so a
Bluetooth speaker without its own mic can't be seen, and the page can't
choose the output. Bluetooth devices with a mic (AirPods, headsets) show up
by name as microphones once permission is granted. Output delay isn't
reported. Desktop Chrome and Edge list speakers by name and let the page
choose one.

**Pendulum and Bluetooth delay**: the pendulum is drawn late by the output
delay the browser reports (clamped to 0-0.6 s; Bluetooth is often
0.15-0.3 s) plus the Sound and visuals sync adjustment (-200 to +500 ms), so it lines
up with what is heard. Only the drawing moves; the sound is unchanged.

## Known limits

- The microphone needs https (GitHub Pages is) and permission.
- See **Microphone and Bluetooth** for what iPhone allows.

The browser favicon uses the conventional walnut metronome on a transparent
background (`icons/favicon-metronome-32.png` and `favicon-metronome-192.png`).
The Art Deco versions are kept as `favicon-art-deco-32.png` and
`favicon-art-deco-192.png` for a later switch; `make_icons.py` exports both.

Round 4’s Vintage 60s home metronome revision and Round 5’s eight tuner
icons are delivered. Prompts and final paths are recorded in
`design/image-deliveries-rounds-4-5.json`.

Public identity uses the normal metronome: transparent browser favicons and
library-card art (`favicon-metronome-*`), and opaque ivory iOS/Android icons
(`icon-metronome-*`). These explicit filenames avoid the previously cached
Art Deco icons. `design/image-deliveries-normal-icons.json` records the art
and references. The Art Deco master and derivatives remain under
`icon-art-deco-*` and `favicon-art-deco-*` for a future switch.

Round 14 delivers two app-icon candidates, `icons/icon-gramophone-1024.png`
and `icons/icon-horn-1024.png`, with opaque ivory backgrounds and generous
maskable margins. Their comparison sheet is
`design/generated/round-14/icon-candidates.webp`; the selected app identity
continues to use the normal metronome.

Round 15 delivers the narrowed Art Deco home icon and matching screen case,
the slim lily-crowned French Nouveau screen case, and matching 18th Century
and Steam Punk home/screen artwork. The 18th Century case, pendulum, rod and
sliding shell are separate full-size PNGs in `design/generated/round-15/`.
Its home icon is sampled down from those exact layers with a precisely
aligned lower pivot; Steam Punk likewise uses its existing screen layers.
`design/source/assemble_metronome_icons.py` reproduces both assemblies
(`--check` verifies them). Exact prompts, exports, measured anchors, scales
and assembly positions are in `design/image-deliveries-rounds-14-15.json`.

The **Drone** home icons (a cello and bow in each of the eight themes:
`assets/ui/home-drone.webp` for Classic and `assets/ui/<theme>/home-drone.webp`
for the others) are Round 6 of the image requests and in use;
`design/image-deliveries-drone.json` records their prompts and exports. They
were checked at full size: complete four-string cellos with bow, endpin and
scroll, nothing cropped (the scrolls come close to the top edge), each in its
theme's style.

Round 7 delivers a bow-free cello and a separate upright bow for each theme,
used on the Drone screen, where the bow is the volume. The original home
icons are unchanged;
the cello edits preserve their subtle mist with local repairs where the bow
crossed it. `design/image-deliveries-round-7.json` records the prompts, source
PNGs, exports and measured bow-hair anchors. PNG masters live in
`design/generated/round-7/`; the app assets are `drone-cello.webp` (512×512)
and `drone-bow.webp` (128×512), alongside each theme's home icon.

Round 8 delivers a pipe organ for every theme, shown for the Organ and Synth
organ voices. Each has a symmetrical pipe front, visible pipe mouths and the
theme's sound ribbons; the mist keeps its subtle transparency. PNG masters
and a preview live in `design/generated/round-8/`; `drone-organ.webp` beside
each theme's home icon is the 512×512 lossless WebP used by the app.
`design/image-deliveries-round-8.json` records the references, prompts and exports.

Rounds 9 and 10 deliver the eight Practice Routine hourglasses and sixteen
split pendulum layers. PNG masters and previews are in `design/generated/round-9/`
and `design/generated/round-10/`; `design/image-deliveries-rounds-9-10.json`
records every prompt, export and measured attachment point. Routine icons ship
as 384×384 lossless WebP. The rods use 200×1000 canvases; each weight keeps the
original theme's small layer canvas and scale. All eight pairs were checked
over their metronome bodies at the top, middle and bottom of the weight travel.

Round 11 delivers five Practice Routine activity pictures in all eight themes:
intonation, scales, clapping rhythms, ghosting and a default music stand.
Delivered PNG masters and previews live in `design/generated/round-11/`;
`design/image-deliveries-round-11.json` records the completed pictures,
prompts and 512×512 lossless WebP exports. Practice Routine pictures and
hourglasses have no wing-like sound ribbons or mist; those belong only to
Drone. Notes appear only within a scale, rhythm pattern or the book’s sheet
music, never as floating decoration. Each clapping icon has exactly two hands;
the scale pictures show eight ascending notes on a five-line staff. All image
requests through Round 11 are delivered.

Round 12 adds arpeggios, sight reading and improvisation in all eight themes.
Delivered PNG masters and previews live in `design/generated/round-12/`;
`design/image-deliveries-round-12.json` records the completed pictures,
their prompts and 512×512 lossless WebP exports. Arpeggios use five notes
in a rising and falling arch; sight reading uses a single music sheet and
magnifying glass; improvisation uses a bulb enclosing one eighth note.
These pictures have no wings, ribbons, mist or decorative floating notes.
All 24 Round 12 pictures are delivered, with their original PNG masters retained.
