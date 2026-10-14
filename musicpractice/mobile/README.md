# Music Practice for iPhone, iPad and Android

The App Store and Google Play versions of Music Practice. They are the web app
in `../app` bundled into a native shell with [Capacitor](https://capacitorjs.com)
8, so the website and the apps stay one codebase. The thinking behind it
(why apps, what to sell, store rules) is in `../design/mobile-apps.md`.

| | |
| --- | --- |
| App ID (bundle ID / package name) | `io.github.hoai2k.musicpractice`. Permanent once the first build is uploaded; users never see it. |
| Name under the icon | Music Practice (`capacitor.config.json` `appName`, iOS `CFBundleDisplayName`, Android `res/values/strings.xml`). Change freely. |
| Free | Metronome, Tuner, Playback Recorder (the newest 3 takes show; older ones are kept for Pro), the Classic theme |
| Pro | Drone, every take shown, renamed and saved as an MP3, all eight themes |
| Purchases | Pro Yearly (with a 7-day free trial) and Pro Lifetime, through RevenueCat, both granting the entitlement `pro` |

## What's here

- `package.json`: Capacitor and the plugins, pinned. `npm install` here first.
- `capacitor.config.json`: app ID, name, colours.
- `copy-web.sh`: copies the web app (through `../publish.sh`) into `www/`,
  which Capacitor bundles. `www/` is build output and isn't committed.
- `ios/`: the Xcode project (Swift Package Manager, no CocoaPods).
  `Info.plist` has the microphone reason.
- `android/`: the Android Studio / Gradle project. The manifest asks for the
  microphone; `app/build.gradle` signs release builds from
  `android/keystore.properties` when it exists (never committed).
- `assets/`: the icon and splash sources; `npx capacitor-assets generate`
  (options below) makes every size for both platforms.

The plugins: `@revenuecat/purchases-capacitor` (purchases),
`@capacitor/app` (Android back button), `@capacitor/filesystem` and
`@capacitor/share` (saving takes through the share sheet),
`@capacitor-community/keep-awake` (screen on while the metronome, drone or
recorder runs). No custom native code.

### In the web app

- `../app/src/native.js`: the bridge. Inside the apps Capacitor provides
  `window.Capacitor` before any script runs; plugins are called through it
  directly, so the web app still has no build step. On the website
  `isApp()` is false and nothing changes.
- `../app/src/pro.js`: Pro: RevenueCat set-up, `isPro()`, `requirePro()`,
  the paywall. On the website Pro is always on.
- `../app/src/pro-config.js`: **the RevenueCat keys**, the entitlement name,
  the free take count, links.
- `../app/privacy.html`: the privacy policy and terms, published at
  https://hoai2k.github.io/mini/musicpractice/privacy.html (the paywall and
  both store listings link to it).
- Also in the app: the microphone is the app's, granted once, so the recorder
  always closes it for playback (full volume, Bluetooth speakers) and the
  iPhone microphone tip never shows.

## Building

Once, on the computer that builds:

```sh
cd musicpractice/mobile
npm install
```

Every time the web app has changed:

```sh
npm run sync        # copies ../app into both apps (copy-web.sh + cap sync)
```

**iOS** needs a Mac with Xcode 16 or later: `npm run ios` opens the project.
Set the signing team (Signing & Capabilities → Team), add the **In-App
Purchase** capability, pick a device and run. Archive and upload from
Product → Archive.

**Android** needs a JDK 21 and the Android SDK (Android Studio has both):
`npm run android` opens Android Studio, or from the command line

```sh
cd android
./gradlew assembleDebug       # app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease       # app/build/outputs/bundle/release/app-release.aab, for Google Play
```

For the release bundle, make an upload key once and keep it safe (Google Play
App Signing holds the real signing key; a lost upload key can be reset):

```sh
keytool -genkeypair -v -keystore android/upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

and `android/keystore.properties`:

```
storeFile=upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

Before each store upload, raise the version: Android `versionCode` (+1 every
upload) and `versionName` in `android/app/build.gradle`; iOS Version and Build
in Xcode (target → General).

Icons and splash screens come from `assets/` (the icon is
`../app/icons/icon-1024.png`):

```sh
npx capacitor-assets generate --iconBackgroundColor '#fff8e8' --iconBackgroundColorDark '#fff8e8' --splashBackgroundColor '#1d1510' --splashBackgroundColorDark '#1d1510'
```

**Checked here:** the Android debug build compiles, with the right package,
permissions (microphone, billing) and icons. The web side was tested in
Chromium with a stand-in for Capacitor: the Drone, a second theme, renaming or
saving a take, and the older takes each open the paywall; plans and the trial
show from the store data on both platforms; a cancelled purchase says
nothing; buying unlocks everything at once; Android's back button closes a
sheet, then goes home. **Not yet checked:** the iOS build (needs a Mac) and
the apps on real phones (no emulator here), including real purchases.

## Setting up purchases

### 1. App Store Connect (iOS)

1. Agreements, Tax and Banking: the **Paid Apps** agreement, bank and tax.
   Apply for the **App Store Small Business Program** (15% instead of 30%).
2. Apps → + → New App: iOS, name, bundle ID `io.github.hoai2k.musicpractice`,
   SKU `musicpractice`. Category Music.
3. Monetization → Subscriptions → subscription group **Music Practice Pro** →
   subscription **Pro Yearly**, product ID `pro_yearly`, 1 year, $9.99.
   Add an **Introductory Offer**: Free, 1 week, all territories.
4. Monetization → In-App Purchases → **Non-Consumable**, product ID
   `pro_lifetime`, $24.99.
5. Each product: a display name, a description, and a review screenshot of
   the paywall.
6. Users and Access → Integrations → **In-App Purchase** key: generate one for
   RevenueCat (download the .p8 once).

### 2. Google Play Console (Android)

1. A developer account ($25 once). A new *personal* account must run a
   **closed test with at least 12 testers for 14 days in a row** before
   production; start that early.
2. Create app: Music Practice, free, category Music & Audio.
3. Upload a first signed `app-release.aab` to the internal testing track
   (products can't be created before a build with the billing permission).
4. Monetize → Subscriptions → **Pro Yearly**, product ID `pro_yearly`, base
   plan `yearly` (auto-renewing, 1 year, $9.99), and on the base plan an
   **offer** `free-trial`: free trial phase, 7 days, new customer
   acquisition.
5. Monetize → One-time products → **Pro Lifetime**, product ID
   `pro_lifetime`, $24.99.
6. A Google Cloud service account with Play Console access for RevenueCat
   (RevenueCat's guide walks through it), and real-time developer
   notifications.

### 3. RevenueCat

1. A project **Music Practice**, with an App Store app and a Play Store app
   connected (the In-App Purchase key; the service account).
2. Products: import `pro_yearly` and `pro_lifetime` from both stores.
3. Entitlements: **`pro`**, with all four products attached.
4. Offerings: the default (current) offering with two packages: **Annual**
   (`pro_yearly` on each store) and **Lifetime** (`pro_lifetime` on each).
   The paywall shows exactly these two.
5. Project settings → API keys: copy the public **Apple** key (`appl_…`) and
   **Google** key (`goog_…`) into `../app/src/pro-config.js`. They are public
   keys made to ship in apps. Without them the paywall says purchases aren't
   set up, and Pro stays off.

### 4. Testing purchases

- **iOS:** sandbox testers (Users and Access → Sandbox) or TestFlight, where
  purchases are free and a year renews in about an hour. Optionally an Xcode
  StoreKit configuration file with the two products for testing in the
  simulator.
- **Android:** add testers as **license testers** (Settings → License
  testing); they buy without being charged and subscriptions renew fast. The
  app must come from a Play testing track.
- Check: the trial starts, both purchases unlock everything, Restore on a
  second device, Pro stays on offline, cancelling a trial.

## Giving friends Pro for free

Both stores have their own way, which is the allowed one: Apple's rules don't
let an app unlock features with codes of its own (Guideline 3.1.1), so the
app has no code box of its own; **Redeem a code** in the paywall opens the
store's.

- **iPhone and iPad: offer codes.** App Store Connect → the app → Pro Lifetime
  (or Pro Yearly) → **Offer Codes** → create one-time-use codes at a price of
  Free, and download them. A friend taps Redeem a code on the paywall (or
  redeems in the App Store app); Pro turns on by itself. Offer codes on
  subscriptions can give up to a year free; codes for one-time purchases like
  Lifetime are newer, so if Pro Lifetime doesn't offer them, use a year of Pro
  Yearly or RevenueCat below.
- **Android: promo codes.** Play Console → Monetize → **Promo codes** → a
  promotion for the one-time product Pro Lifetime (up to 500 codes a quarter).
  A friend taps Redeem a code (it opens Google Play's redeem page) and then
  Restore purchases.
- **Either, without codes: RevenueCat.** The friend opens Settings in the app
  and reads you their **app ID** (tap it to copy). In RevenueCat → Customers,
  look it up and **Grant promotional entitlement** `pro` for Lifetime. It
  turns on the next time the app checks (reopening it does). It belongs to
  that app ID, so a reinstall needs a new grant.

## Releasing

1. `npm run sync`, raise the versions, build (Archive on the Mac; `bundleRelease`).
2. Store listings: description, keywords, screenshots (iPhone 6.9" and 6.5";
   iPad if offered; Android phone), the privacy policy link above, support
   contact.
3. iOS App Privacy: *Purchases* data, used for app functionality, not linked
   to identity, no tracking. Google Play Data safety: purchase history,
   collected for app functionality, not shared.
4. Review notes for Apple: the app is a bundled, offline practice app
   (metronome, tuner, drone, recorder) with native microphone handling and
   sharing; where Pro is and how to test it with a sandbox account.
5. Before release, check that the ElevenLabs plan used for the drone
   recordings allows commercial use (`../design/mobile-apps.md`).

## Known gaps

- Fonts: themes load theirs from Google Fonts; offline, the system fonts show
  instead. Bundling the font files would fix it.
- The drone and metronome stop when the phone locks (the web view's
  JavaScript pauses). Locked-screen playing needs native audio
  (`../design/mobile-apps.md`, "The caveat").
- No paywall on first launch or after a few days; it shows only when a Pro
  feature is tapped, or from Settings.
