# Music Practice as an iOS and Android app

How to turn the web app into an App Store and a Google Play app with a free
trial and paid features, and what I'd recommend. iOS comes first in this
document and Android after it (*Android*); most of the plan is shared. Prices,
fees and store rules change: check the specifics in App Store Connect, Apple's
App Review Guidelines, the Play Console and Google Play's policies when you
get there.

**Status:** built along these lines in `../mobile/` with Capacitor for both
platforms; how to build, set up the stores and give friends Pro is in
`../mobile/README.md`.
The app checked against Apple's App Review rules (October 2026) is in
`app-store-review.md`.

## The recommendation in short

1. **Wrap the web app, bundled so it works offline, with a little native code
   for what only the phone can do.** The web version and the apps stay one
   codebase. For iOS alone, the way Games Chat's iOS app is made
   (`chat/ios/`: a small SwiftUI app with a `WKWebView`) is enough. **With
   Android planned too, use Capacitor** instead: one JavaScript bridge for
   both, an `ios/` and an `android/` project generated from the same web
   build, and ready-made plugins for purchases, sharing and keeping the screen
   awake. The audio-session code is a small custom plugin on each side.
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
   refunds, trials and restore, on both the App Store and Google Play, with
   one `pro` entitlement. Free until the app makes real money.
5. **iOS first, Android a few weeks after.** Most of the work (the Pro gates,
   the paywall, RevenueCat) is shared; Android adds its own shell, store setup
   and a required two-week closed test for new personal developer accounts
   (*Android*), and can be built and signed without a Mac.
6. **Keep the web version free**, as it is, and say on it that the app exists.
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

With Android too, Capacitor does the same job for both platforms: `npx cap
add ios` and `npx cap add android` create the two native projects around the
published web app, `@revenuecat/purchases-capacitor` handles purchases on
both, and the web code calls one plugin API whichever phone it is on. The
Games Chat pattern is smaller and already known in this repository, but it
would mean writing the bridge twice.

### Native pieces

| Piece | What it does |
| --- | --- |
| Microphone | `NSMicrophoneUsageDescription` in `Info.plist` ("Music Practice needs the microphone for the Tuner and Playback Recorder features. Recordings stay on this device."); the web view's capture requests granted by the app (iOS 15+). The page asks the phone for the permission without prompting (`micPermission` in the PracticeAudio plugin, `AVAudioApplication.recordPermission`), again on coming back to the app; while it is off, the Tuner, the Playback Recorder and Audio check say so with an **Open Settings** button (`openSettings`, the app's own page in Settings). |
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

**Done:** both apps now play the metronome and drone natively and keep going
with the screen locked; see `../mobile/README.md`, "Playing with the screen
locked".

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

### What about ads and a small one-time price ($1–2)?

Not recommended, for this kind of app:

- **Ads earn little here.** A practice tool is open for long stretches with
  the screen mostly untouched, which is where banners pay least; a banner
  earns roughly cents per thousand views. A few thousand daily users would
  make a few dollars a day, and then only if they don't buy the ad removal.
- **They work against the app.** Interstitials and video ads interrupt
  practice; a video ad with sound over a metronome or a recording is the
  worst moment the app could have; banners take room the tuner and metronome
  need on a phone.
- **They cost privacy and work.** An ad SDK (AdMob and the like) means
  Apple's tracking prompt, a consent banner in Europe, a privacy label and
  Data safety form that say data is collected, and the "made for kids"
  questions; the app currently collects nothing.
- **$1–2 is too cheap for the work** and still has to clear the same paywall,
  refunds and store setup as a higher price. Music tools sell well at a
  few dollars: people who practise every day value them.

If a subscription feels like too much, the simpler alternative I'd pick is
**no ads and one one-time Pro purchase of about $4.99–$7.99**, with the free
metronome and tuner as the trial. It earns less over the years than a
subscription but is the easiest to explain, has nothing to cancel and suits
musicians who dislike subscriptions. A free-trial subscription plus lifetime
(above) remains my first choice; the one-time-only plan is a sound second, and
ads are a distant third.

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

## Android

Most of the above carries over: the same web code, the same free/Pro split
and prices, the same RevenueCat project and `pro` entitlement, the same
paywall rules in spirit.

### Why an app is better than the website on Android too

The gap is smaller than on iPhone (Chrome on Android already keeps the
microphone permission per site and plays through Bluetooth while recording),
so on Android the app is mostly about being found in Google Play, working
offline, playing with the screen off and saving straight to the share sheet.

### The wrapper

Three ways, in order of preference:

1. **Capacitor** (recommended if iOS uses it too): `npx cap add android`
   makes an Android Studio project whose one screen is the system WebView
   loading the bundled web app from `https://localhost`, so ES modules,
   AudioWorklet, IndexedDB and the microphone all work as on the web.
2. **A small hand-made Kotlin app** like Games Chat's iOS one: an `Activity`
   with a `WebView`, the bundled files served through `WebViewAssetLoader`
   (`https://appassets.androidplatform.net/...`, a secure origin; loading
   `file://` breaks modules and the microphone), and a
   `@JavascriptInterface` bridge.
3. **A Trusted Web Activity** (Bubblewrap): the published site opened in
   Chrome without its address bar. Quickest, but it needs a Digital Asset
   Links file at `https://hoai2k.github.io/.well-known/assetlinks.json`
   (the root of the GitHub Pages domain, outside this repository), it
   isn't offline unless the site gets a service worker, purchases go through
   the Digital Goods API rather than RevenueCat's SDK, and there is no native
   code for audio. Fine for a free listing, not for this plan.

### Native pieces

| Piece | What it does |
| --- | --- |
| Microphone | `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` in the manifest; ask at runtime the first time the recorder or tuner opens; the WebView's `onPermissionRequest` (`WebChromeClient`) grants `RESOURCE_AUDIO_CAPTURE` once the app has the permission. Asked once, like iOS. The same `micPermission` and `openSettings` (the app's details page) as iOS; Android can't tell a permanent refusal from never having asked, so the page remembers a refusal it saw until the mic is granted. |
| Bluetooth | Normally plays through the speaker while the phone's microphone records. Check that the WebView's `getUserMedia` (with echo cancellation off, as the recorder asks) doesn't switch the phone into call mode, which would move Bluetooth to the low-quality headset profile. |
| Background audio | A foreground service of type `mediaPlayback` with a media notification (Play / Pause) while the drone or metronome plays. As on iOS, the WebView's JavaScript is throttled in the background, so locked-screen drone and metronome mean native audio (`AudioTrack` or Oboe for the clicks, `ExoPlayer`/`MediaPlayer` looping for the drone). Later, as on iOS. |
| Saving takes | The share sheet (`Intent.ACTION_SEND` through a `FileProvider`), or straight to the Music folder with `MediaStore`. |
| Purchases | RevenueCat (Google Play Billing underneath). |
| Screen awake | `FLAG_KEEP_SCREEN_ON` while the metronome, drone or recorder runs. |
| Back button | Closes a dialog or returns to the home screen before leaving the app (`OnBackPressedDispatcher` → the web code's Escape handling). |
| Audio latency | Higher and more varied than on iPhone; the metronome's Bluetooth-sync setting covers it. Test on a few phones, including a cheap one. |

### What to sell and for how much

The same split and prices. Google Play's service fee is 15% on the first $1M
a year (enrol through the Play Console's account groups) and 15% on
subscriptions from the start.

A purchase on one store doesn't unlock Pro on the other: the app has no
accounts, so someone with both phones buys twice. That is normal for apps
without sign-in; say so in the FAQ rather than adding accounts.

### Setting it up in the Play Console

1. **A Google Play developer account** ($25 once). A *personal* account
   created now must run a **closed test with at least 12 testers for 14 days
   in a row** before it can publish to everyone; an *organisation* account
   (needs a D-U-N-S number) skips that. Plan for those two weeks.
2. **Payments profile** (bank and tax details): needed to sell anything.
3. **Create the app** (package name, e.g. `io.github.hoai2k.musicpractice`;
   category *Music & Audio*; free).
4. **Subscriptions**: a subscription *Pro* with one auto-renewing **base
   plan**, *yearly* ($9.99), and on it an **offer** with a free-trial phase
   of 7 days for new customers.
5. **One-time products**: *Pro Lifetime* ($24.99).
6. Upload the first build (an **Android App Bundle**, `.aab`, signed with an
   upload key; Play App Signing keeps the real key) before the products can
   be bought.
7. **RevenueCat**: add a Play Store app to the same project (a Google Cloud
   service account with Play Console access, and real-time developer
   notifications), and attach both products to the `pro` entitlement and the
   same offering.

### Google Play's rules

- **Payments policy**: digital features must be sold through Google Play
  Billing (RevenueCat uses it).
- **Subscriptions policy**: like Apple's, the paywall shows the price, the
  period, the trial length and what happens after it, and how to cancel;
  prices come from the store.
- **Data safety** form (the counterpart of Apple's privacy label): no data
  collected; purchase history through Google Play.
- **Target API level**: new apps and updates must target a recent Android
  version (Google raises it every year); Capacitor's current version keeps up.
- **Content rating** questionnaire, **target audience**, the privacy policy
  link, and the store listing (icon 512×512, feature graphic 1024×500, phone
  screenshots, short and full description).

### Building and testing

- No Mac needed: Android Studio on any computer, or the Gradle command line
  here or in a GitHub Actions workflow, can build and sign the `.aab`.
- **License testers** (Play Console → Settings) buy without being charged;
  test subscriptions renew fast (a yearly plan in about 30 minutes), so the
  trial and renewals can be watched.
- Tracks: **internal testing** (up to 100 people, minutes to appear), then
  the **closed test** (the 12 testers for 14 days), then production.
- Check the same list as on iOS, plus the back button, the foreground-service
  notification, a phone with Bluetooth speakers, and a low-end phone.

## Effort, roughly

| Step | Size |
| --- | --- |
| iOS shell (project, web view, bundle, mic grant, audio session, share, keep awake) | a few days |
| Pro gates and paywall in the web code, RevenueCat bridge | a few days |
| App Store Connect, RevenueCat, sandbox and TestFlight testing | a day or two, plus waiting on Apple |
| Native drone and metronome for locked-screen playing (optional, later) | about a week |
| Store listing, screenshots, privacy policy | a day |
| Android shell (project, permission grant, share, keep awake, back button) | two or three days with Capacitor |
| Play Console, RevenueCat for Play, testing on a few phones | a couple of days, plus the 14-day closed test |
| Native background audio on Android (optional, later) | about a week |

The code can be written here, like Games Chat's. For iOS, building, signing and
uploading need a Mac with Xcode (or a cloud Mac / CI service); Android can be
built and signed here or in GitHub Actions.

## Decisions to make

- The free/Pro split above, and the prices: subscription plus lifetime
  (recommended), or one one-time Pro purchase only; no ads either way.
- Whether the web version stays fully free (recommended) or gets the same
  gates.
- Whether locked-screen playing is in the first release (native drone and
  metronome) or the second.
- iPhone only, or iPad too (the layout already works on iPad); Android phones
  only, or tablets and Chromebooks too.
- Capacitor for both (recommended once Android is planned) or the Games Chat
  pattern for iOS alone.
- Android with a personal developer account (the 14-day closed test) or an
  organisation one (a D-U-N-S number).
- Whether to check the ElevenLabs plan now, or regenerate the drone sounds on
  a plan that allows commercial use before release.
