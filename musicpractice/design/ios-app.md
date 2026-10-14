# Music Practice as an iOS app

How to turn the web app into an App Store app with a free trial and paid
features, and what I'd recommend. Prices, fees and App Review rules change:
check the specifics in App Store Connect and Apple's App Review Guidelines
when you get there.

## The recommendation in short

1. **Make it the way Games Chat's iOS app is made** (`chat/ios/`): a small
   SwiftUI app with the web app inside a `WKWebView`, bundled into the app so
   it works offline, plus a little native code for what only iOS can do. The
   web version and the app stay one codebase.
2. **Free to download, with Music Practice Pro.** The metronome and the tuner
   are free and fully usable; Pro adds the Drone, the Playback Recorder's
   extras and the themes (split below).
3. **Pro as a yearly subscription with a 7-day free trial, plus a lifetime
   purchase.** Something like $9.99 a year or $24.99 once. Practice tools are
   things people use for years, and many musicians won't subscribe to a
   metronome: the lifetime option catches them, the subscription (with the
   trial) is what most people pick when it's offered first. No monthly plan
   at the start, and **no ads** (they would interrupt practice and could play
   sound over it).
4. **Use RevenueCat** for the purchases rather than writing StoreKit code by
   hand: it handles the paywall data, who is entitled to Pro, renewals,
   refunds, trials and restore, and works the same if there's ever an Android
   app. Free until the app makes real money.
5. **Keep the web version free**, as it is, and say on it that the app exists.
   The app is worth paying for because it does what the website can't (next
   section), not because the website is crippled.

## Why an app is better than the website (and worth paying for)

These are real limits of a web page on iPhone that go away in an app:

- **Microphone permission is asked once, for good.** The app asks once (with
  the reason you write in `NSMicrophoneUsageDescription`); iOS remembers it for
  the app (Settings → Music Practice). The web view inside the app is told to
  grant the microphone itself (`WKUIDelegate`,
  `requestMediaCapturePermissionFor` → `.grant`), so the per-site prompts and
  the "set the site to Allow" tip are no longer needed.
- **Bluetooth speakers while recording.** The app controls iPhone's audio
  session: `.playAndRecord` with `.allowBluetoothA2DP` and `.defaultToSpeaker`
  records from the phone's microphone while playing through a Bluetooth
  speaker in full quality. The website has to close the microphone for each
  playback to get Bluetooth; the app needn't.
- **Keeps going with the screen locked.** With the *Audio* background mode, the
  drone and takes being played keep sounding when the phone locks or you
  switch apps (see the caveat under *Building it*).
- **Plays with the ring/silent switch on**, without the page's tricks.
- **Saving takes** goes straight to the share sheet (Files, Voice Memos,
  AirDrop) with no "tap again" step, and can be encoded natively (M4A/AAC).
- **On the home screen and in the App Store**, which is how most people find
  practice tools.

## Building it

### Approach

Like Games Chat: `musicpractice/ios/` with an XcodeGen `project.yml`, a SwiftUI
app whose one screen is a `WKWebView` loading the bundled web app
(`publish.sh` output copied into the app at build time), and a small injected
`native.js` that the web code can talk to. The web code checks for the bridge
(`window.webkit?.messageHandlers?.musicPractice`) and keeps its web behaviour
when it isn't there.

(Capacitor, a popular framework for this, would also work and has ready-made
purchase and audio plugins; the Games Chat pattern is smaller and already
known in this repository.)

### Native pieces

| Piece | What it does |
| --- | --- |
| Microphone | `NSMicrophoneUsageDescription` in `Info.plist`; the web view's capture requests granted by the app (iOS 15+). |
| Audio session | `AVAudioSession` set by the app: `.playback` for the metronome and drone, `.playAndRecord` + `.allowBluetoothA2DP` + `.defaultToSpeaker` while the recorder or tuner listens. The web code's `navigator.audioSession` calls become messages to native code. |
| Background audio | `UIBackgroundModes: audio`. |
| Saving takes | The share sheet (`UIActivityViewController`) with the file passed from the web view. |
| Purchases | RevenueCat's iOS SDK; the web code asks native "is Pro on?", and opens the paywall. |
| Screen awake | `isIdleTimerDisabled` while the metronome, drone or recorder runs. |
| Haptics (optional) | A tap on the downbeat. |

### What changes in the web code

- A small `native.js` bridge, and checks in `audio.js`, `recorder.js` and
  `main.js` to use it when it's there (permission handling, the
  "free the mic for Bluetooth" logic and the iPhone mic tip all switch off in
  the app).
- Pro gates: the Drone, the recorder's extras and the themes ask the bridge
  whether Pro is on, and show the paywall if not. On the web everything stays
  open.

### The caveat: audio in the background

A web view's JavaScript is paused when the app goes to the background, even
with the background audio mode. Sound already playing from an `<audio>`
element (a take being played back) keeps going, but the metronome (scheduled
by JavaScript) and the drone (Web Audio) may stop or stutter. If playing with
the screen locked matters, as it does for a drone, move those two to native
code: the drone's loops into an `AVAudioPlayerNode` (they are seamless loops
already, `design/drone-sounds.md`) and the metronome's clicks into an
`AVAudioEngine` schedule. That is the one part of the app that is real native
audio work; the rest is plumbing. It can come after the first release.

## What to sell: free and Pro

A suggested split (adjust after seeing what people use):

| Free | Pro |
| --- | --- |
| Metronome: all tempos, time signatures, sounds, the pulse and pendulum, Bluetooth sync | Drone: all voices, the fifth, timed drones and sequences |
| Tuner: chromatic and every instrument, A4 setting, transposing | Playback Recorder: unlimited takes kept, renaming, saving as files (free keeps the last 3 takes) |
| One theme (Classic) | All eight themes |
| The Playback Recorder itself (record, play back, listen again) | What comes next (ideas: practice log and streaks, subdivisions and polyrhythms, tempo trainer, loops of a take) |

The free part has to be good enough that people keep the app and recommend it;
Pro should feel like the serious-practice upgrade. A subscription is easier
to justify when Pro keeps growing, so plan a few Pro additions for the first
year.

Pricing to start with (US; App Store Connect fills in other countries):

- **Yearly: $9.99, with a 7-day free trial.**
- **Lifetime: $24.99** (about 2.5 years of the yearly price).
- Apple keeps 15% if you're in the **App Store Small Business Program** (under
  $1M a year), otherwise 30% (15% on subscriptions after a year).

The trial applies to the subscription; Apple gives each person one trial per
subscription group and charges automatically when it ends unless they cancel.
(A trial for a lifetime purchase isn't built in; it can be done with a free
"7-day trial" purchase item, which is more work and less clear to people.)

Show the paywall when someone taps a Pro feature, and once after a few days of
use, not at first launch: people pay after the app has been useful.

## Setting it up in App Store Connect

1. **Apple Developer Program** membership ($99 a year; the same account as
   Games Chat's).
2. **Agreements, Tax and Banking**: accept the *Paid Apps* agreement and add
   bank and tax details. Purchases don't work, even in testing, until this is
   done. Apply for the **Small Business Program**.
3. **Create the app** (bundle ID, name, primary category *Music*).
4. **Subscriptions**: a subscription group *Music Practice Pro* with one
   auto-renewing subscription, *Pro Yearly* ($9.99), and on it an
   **Introductory Offer** of type *Free*, 1 week, for new subscribers.
5. **In-App Purchases**: a *non-consumable* *Pro Lifetime* ($24.99).
6. Each product needs a reference name, a display name and description, a
   review screenshot (of the paywall) and review notes.
7. **RevenueCat**: create the project, connect App Store Connect (an in-app
   purchase key), add the two products to an *entitlement* called `pro` and
   an *offering* that holds both.

## The paywall and the rules it must follow

App Review rejects subscription apps that don't show these clearly
(Guideline 3.1.2):

- The price and period of each option, and **what happens after the trial**
  ("7 days free, then $9.99 a year. Cancel anytime in Settings.").
- What Pro includes.
- **Restore Purchases**.
- Links to the **Terms of Use** (Apple's standard EULA is fine) and the
  **Privacy Policy** (both also in the App Store listing).
- Prices come from the store (RevenueCat gives them localised), never typed
  into the app.

## Testing

1. **In Xcode**, a StoreKit configuration file with the two products: buy,
   cancel, refund and renew on the simulator without App Store Connect.
2. **Sandbox testers** (App Store Connect → Users and Access): real purchases
   with test accounts.
3. **TestFlight**: purchases are free and subscriptions renew fast (a year
   passes in about an hour), so the trial ending and renewing can be watched.
4. Check: buying each option; the trial starting and converting; cancelling;
   Restore on a second device; Pro staying on offline; the web version
   unchanged.

## Before submitting

- **Privacy**: the App Privacy section ("Data not collected" if nothing leaves
  the phone: recordings stay on the device; RevenueCat processes purchase
  data, which counts as *Purchases*, linked to an anonymous ID), the
  microphone usage string, and a privacy policy page (one can go under
  `sites/`).
- **Rights to everything in the app**:
  - the drone recordings were generated with ElevenLabs: check that the plan
    used allows commercial use of its sound effects (paid plans do; the free
    plan doesn't);
  - the theme art and icons were generated for this app;
  - the fonts are Google Fonts (open licences: bundle the font files in the
    app rather than loading them online);
  - `lamejs` (MP3 saving) is LGPL: shipping it as its own unmodified file, as
    now, is the usual way to comply; or use native AAC/M4A in the app and drop
    it there.
- **Minimum functionality** (Guideline 4.2): an app that is a website in a
  wrapper can be rejected; this one is a bundled, offline app with native
  audio, microphone, Bluetooth, background and sharing, which is fine. Say so
  in the review notes.
- **Screenshots** (6.9" and 6.5" iPhone, plus iPad if it runs there), an app
  preview video (optional), keywords (metronome, tuner, drone, practice,
  recorder).

## Effort, roughly

| Step | Size |
| --- | --- |
| iOS shell (XcodeGen project, web view, bundle, mic grant, audio session, share, keep awake) | a few days |
| Pro gates and paywall in the web code, RevenueCat bridge | a few days |
| App Store Connect, RevenueCat, sandbox and TestFlight testing | a day or two, plus waiting on Apple |
| Native drone and metronome for locked-screen playing (optional, later) | about a week |
| Store listing, screenshots, privacy policy | a day |

The code can be written here, like Games Chat's; building, signing and
uploading need a Mac with Xcode (or a cloud Mac / CI service).

## Decisions to make

- The free/Pro split above, and the prices.
- Whether the web version stays fully free (recommended) or gets the same
  gates.
- Whether locked-screen playing is in the first release (native drone and
  metronome) or the second.
- iPhone only, or iPad too (the layout already works on iPad).
- Whether to check the ElevenLabs plan now, or regenerate the drone sounds on
  a plan that allows commercial use before release.
