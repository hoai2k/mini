# Music Practice

A metronome, a tuner, a drone and a practice recorder. Open it at
https://hoai2k.github.io/mini/musicpractice/.

Made for phones (portrait or landscape) and desktops. The home screen has
four buttons, **Metronome**, **Tuner**, **Drone** and **Playback Recorder**
(two by two on phones, in a row on wider screens), and a settings gear. A
tool added later goes in after the one it follows by default, even in an
order someone saved before it existed.

The buttons can be put in any order, like apps on an iPhone home screen
(`app/src/homeorder.js`): hold one for about half a second and they all
jiggle; the held one lifts and follows the finger (or mouse) while the others
slide out of its way, and letting go drops it there. While they jiggle, any
button can be dragged at once and tapping one doesn't open it; tapping the
background, **Done** or Escape stops, and so do 5 seconds untouched. Arrow
keys move the focused button while jiggling.

Two iPhone details shape the code. Safari sends no click for a tap on plain
background, so the background is watched for the touch itself. And Safari
stops sending touch events to an element that is moved in the page while it
is being dragged (after which nothing could be moved), so during a drag the
buttons only slide by transforms and the page is reordered on drop. Moves
and releases are watched on the whole page, and a drag whose end never
arrived is dropped when the next touch starts. The order is saved with the settings and applied before the
page draws, so there's no flash of the default order.

## Themes

The gear on the home screen opens the app's own settings, which for now hold
only **Theme**: a tile per theme, each drawn in its own colours and fonts (all
themes' fonts load only when this opens). Theme is also a dropdown at the
bottom of the metronome's and the Playback Recorder's settings. It switches
the whole app's look:

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
  Garamond, asymmetric organic curves and a whiplash ornament.
- **Candy**: candy pink and sky blue on white in M PLUS Rounded, bold
  outlines, hard manga-panel shadows, halftone dots and sparkles.
- **Steam Punk**: dark leather with brass and copper, Cinzel and Special
  Elite, riveted plates and a gear.

Theme ids stay fixed when a theme is renamed (Robot Future is `scifi`,
Candy is `anime`), so saved choices and image paths keep working.
Each theme loads only its own fonts. All eight themes have delivered images.
The drawings in `app/src/standins.js` remain as loading and error fallbacks;
the newer themes share one drawing (`themed`), varied by case shape, palette
and pendulum weight.

A theme is three things: a `THEMES` entry in `app/src/settings.js` with its
fonts (the early script in `index.html` lists the ids too; a test checks they
match), its colours, type and
shapes in `app/styles.css` (`[data-theme="…"]`), and its images. Every image
belongs to a theme in `design/source/build_requests.py`. The app shows the
theme's delivered image or, until it arrives, that theme's drawn stand-in
(`app/src/standins.js`).

**Anchors:** the metronome is two layers. The body records its canvas size
and `pivot`; the pendulum records its canvas, `hub` and `swing` (degrees
each way); a pendulum can also give a `scale`. `pendulumLayout` in
`app/src/art.js` puts the hub on the pivot using whichever layers are
showing, delivered or stand-in, so each theme's art can put them anywhere.
The Classic art's measured anchors are pivot (400, 985) and hub (102, 927);
when the Art Deco art arrives, measure and record its own.

## Metronome

- A metronome with a swinging pendulum: it reaches one end of its swing on
  each click and the other end on the next, synced to what you hear
  (`pendulumAngle` in `app/src/metronome.js`, corrected for output latency).
  Dots under it show the beat of the bar, and a glow behind it pulses on
  each beat (red on the downbeat, gold otherwise), dying away quickly.
  **Swinging pendulum** and **Pulse on each beat** in the settings turn
  either off.
- Everything you see follows one clock, `heardNow()` in `app/src/audio.js`:
  the time of the sound reaching your ears. It takes the smoother of the
  context's output timestamp (`getOutputTimestamp`, which includes the
  device's delay where the browser knows it, Bluetooth too on iPhone and
  Android) and its current time less the reported output latency, without
  counting a delay twice, then the manual adjustment, and looks one frame
  ahead because a frame drawn now appears about a frame later. Checked in
  Chromium: at 120 BPM the pulse peaks every 500 ms on the same frame as the
  pendulum reaching the end of its swing and the beat dot moving on.
- **Line up visuals with the sound…** (metronome settings) is for Bluetooth
  speakers and headphones, which play late and don't always say by how much:
  the controls give way to a sync bar while the metronome plays, with − / +
  (10 ms steps) to move the visuals until the flash meets the click, or
  **Tap on each click**: eight taps along with the clicks measure the delay
  (from when each finger came down), skip the first two, take the median,
  and set the adjustment beyond what the browser already reports (a tap
  pattern spread over more than 150 ms is rejected). Checked with simulated
  taps 180 ms after each beat: it set +160 ms (the 20 ms difference is the
  frame of look-ahead already allowed for). The setting is shared with Audio
  check's pendulum sync.
- Tempo from 40 to 500 BPM: a slider, a number box (type any tempo; values
  outside the range are pulled in), and − / + buttons (hold to run). The
  Italian marking (Largo … Prestissimo) shows under the number. Default 120.
- Settings (gear): time signature (4/4, 3/4, 2/4, 5/4, 6/4, 7/4, 3/8, 5/8,
  6/8, 7/8, 9/8, 12/8, or no bars), a strong beat on 1 (on by default;
  compound meters also lean lightly on each group of three), sound
  (Woodblock, Click, Beep) and volume.
- Sounds are synthesized with Web Audio and scheduled 120 ms ahead from a
  worker, so the beat stays steady when the page is busy, and keeps going if
  you switch to another tab (it's a practice tool; a hidden-tab mute would
  stop your metronome). The screen is kept awake while it runs.

## Playback Recorder

Opening it turns on the microphone and starts listening.

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
   and a playhead. Then it listens again.

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
after the sound stops.

- **Instrument** (the dropdown on the screen): Chromatic (any note), or a
  set of strings: guitar (standard, drop D, DADGAD), bass (4 and 5 string),
  ukulele, violin, viola, cello, mandolin, banjo. With strings, the nearest
  string is ringed (green once in tune) and the needle measures against it;
  tap a string to hear its note.
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

## Drone

A sustained tone to play along with: tuning intervals against it, long
tones, scales over a tonic.

- The note, big (letter, accidental, octave) with its frequency; − / + move a
  semitone and the list picks any note from C2 to B3 (the drone's two
  octaves, from the cello's open C). Past either end, notes wrap round by an
  octave. **Play** fades in over about 2 s and **Pause** fades out over about
  1.5 s; changing the note or instrument while it plays crossfades.
- Instruments: **Cello** (the default), **Cello, soft** (sul tasto: darker),
  **Organ** and **Synth organ** (a synthesized pipe organ: 8', 4' and 16'
  pipes with a touch of wind, exactly in tune and perfectly steady). A voice
  saved before others were archived falls back to the cello.
- Settings: volume; **Add a fifth above** (a pure 3:2 fifth); **Timed drone** (off by
  default; 0.5 to 20 minutes, 3 by default), and **When time's up**: stop,
  or move on to the next note chromatically up or down, up or down the major
  scale of the starting note, or up a fifth or a fourth (round all twelve
  notes). Choosing a note by hand starts the sequence again from it. The
  reference pitch (A4 = 415 to 466 Hz) is shared with the tuner. Everything
  is kept between visits. Space plays and pauses; arrow keys move the note.

How it sounds (`app/src/drone.js`): apart from the Synth organ, every voice plays recordings, generated
with ElevenLabs sound effects and cut into seamless loops on four notes each,
so every note is a few semitones at most from a real take and is retuned to it
exactly by playback rate (following the reference pitch). They are made
perfectly steady: no bow change is ever heard, the pitch is held exactly and
the level and brightness are evened out, as if the bow or breath never ended.
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
  an email to say it arrived. Email and message are required, as there; the
  topic and the device details (with the Audio check's readings, shown before
  sending and optional) travel at the end of the message. Same spam defences:
  a hidden honeypot field, Send held for 3 s, the script's hourly caps. A
  failed send says so and keeps what was written. Empty `ENDPOINT` and the
  buttons disappear.
- `app/privacy.html`: the privacy policy and terms, for the apps' paywall and
  store listings.
- `design/mobile-apps.md`: why the apps, what to sell and the store rules.

- `app/index.html`, `app/styles.css`, `app/src/`: the app (static ES
  modules, no build step). `main.js` the screens, `homeorder.js` hold and
  drag to reorder the home screen, `metronome.js` the
  scheduler, sounds and pendulum, `recorder.js` the mic and take state
  machine, `capture-worklet.js` the mic tap, `detect.js` the music/noise
  detector and trimming, `waveform.js` the waveform views, `takes.js` saved
  takes, `settings.js` settings and themes, `audio.js` the shared
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
- `design/source/make_icons.py`: makes `app/icons/icon-180/192/512.png`
  from the delivered `icon-1024.png`, or a drawn stand-in until then.
- `publish.sh`: copies the app to `local/pages/musicpractice/`.

## Checks

```sh
node --test musicpractice/app/test/*.test.mjs
python3 musicpractice/design/source/build_requests.py --check
musicpractice/publish.sh local/pages/musicpractice
```

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
background. On return (`visibilitychange` in `app/src/main.js`):

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
  Reload button. Its title (with a chevron) folds it to one line,
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

**Audio check** (a button in every settings sheet, `app/src/audiocheck.js`)
says how takes will play and why, with the steps to allow the microphone
where needed and a Reload button; a test sound played the way takes are;
the microphone choice (Automatic, built-in preferred, or any listed mic,
Bluetooth marked); the speaker choice where the browser allows one
(desktop Chrome and Edge: System default is recommended, as it follows the
system's switching); a pendulum sync adjustment; and what the browser
reports (engine, permission, mic state, devices, Bluetooth names, output
delay, Safari's audio mode).

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
0.15-0.3 s) plus the Audio check adjustment (-200 to +500 ms), so it lines
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

The **Drone** home icons (a cello and bow in each of the eight themes:
`assets/ui/home-drone.webp` for Classic and `assets/ui/<theme>/home-drone.webp`
for the others) are Round 6 of the image requests and in use;
`design/image-deliveries-drone.json` records their prompts and exports. They
were checked at full size: complete four-string cellos with bow, endpin and
scroll, nothing cropped (the scrolls come close to the top edge), each in its
theme's style.
