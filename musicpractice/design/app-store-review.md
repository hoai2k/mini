# Music Practice and Apple's App Review rules

The iOS app (`../mobile/`) checked against Apple's rules as they stood on 20
October 2026: the App Review Guidelines (last revised 16 October 2026),
Apple's subscription guidance and Developer News. Guideline numbers are
Apple's. Rules change, so check again before each submission:
https://developer.apple.com/app-store/review/guidelines/ and
https://developer.apple.com/news/upcoming-requirements/.

Each item is marked **Done** (already met, or met by this review),
**At submission** (a field or step in App Store Connect, nothing to build) or
**To plan** (needs a decision or real work).

## Privacy

| Rule | Status |
| --- | --- |
| 5.1.1(i): a privacy policy URL in App Store Connect, and a link to it that is easy to find in the app | **Done.** `app/privacy.html` (https://hoai2k.github.io/mini/musicpractice/privacy.html). It is linked from the paywall and Send feedback, and now from Settings (Privacy Policy · Terms of Use · Help and support) so it can be found without opening the paywall. |
| The policy covers what is collected, who receives it, how long it is kept, and how to have it deleted | **Done.** Added a last-updated date, what feedback is kept for (answering and improving the app; no fixed deletion date, which Apple doesn't require: it asks that the policy says what is kept and how to have it deleted), and a contact for deletion requests (the support page). |
| 5.1.1(ii): consent before collecting, purpose strings | **Done.** `NSMicrophoneUsageDescription` says why. Send feedback shows what it will include before Send, and debugging data starts unticked. |
| 5.1.1(iv): the app keeps working when the microphone is refused | **Done.** The metronome and drone don't need it; the tuner and recorder say so, with Open Settings. |
| 5.1.1(v): account deletion | Doesn't apply: the app has no accounts. |
| 5.1.2(i): permission before sharing personal data with third parties, AI included (amended November 2025) | **Done**, as long as feedback stays in the private Google Sheet. If feedback is ever passed to an AI service, the feedback form and the policy must say so first. |
| Privacy manifest (`PrivacyInfo.xcprivacy`), required since May 2024 | **Done (new).** `mobile/ios/App/App/PrivacyInfo.xcprivacy`, in the App target's resources. It declares the APIs Apple asks reasons for: system boot time `35F9.1` (the mixer's clock, `mach_absolute_time` in `PracticeAudioPlugin.swift`), file timestamp `C617.1` (`@capacitor/filesystem`, which ships no manifest of its own) and UserDefaults `CA92.1` (Capacitor's default recommendation). It also declares the data feedback sends (email, the support message, diagnostics: app functionality, not tracking). Capacitor's own manifests declare nothing; RevenueCat's SDK brings its own. **Check on the Mac:** after an Archive, Xcode's *Generate Privacy Report* should list these with no warnings. |
| App Privacy label in App Store Connect | **At submission.** As in `mobile/README.md` (Releasing, step 3). RevenueCat recommends declaring *Purchases* for both *App Functionality* and *Analytics*, not linked to identity; the README now says so. |
| No tracking, no ATT prompt | **Done.** No ads, no analytics, no tracking. |

## Purchases and subscriptions

| Rule | Status |
| --- | --- |
| 3.1.1: Pro only through In-App Purchase, no codes of the app's own | **Done.** RevenueCat over StoreKit. Redeem a code opens Apple's own sheet. |
| 3.1.1: restoring purchases | **Done.** Restore purchases on the paywall. |
| 3.1.2: the paywall shows the name and length of each plan, what Pro includes, and the full price | **Done.** |
| 3.1.2 and Schedule 2: **the billed amount is the most prominent price**, and the free trial is less prominent than it | **Done (fixed).** The yearly plan's big line was "Try 1 week free" with the price beneath it, the layout Apple rejects most often. It now reads **$9.99 a year** with "Starts with 1 week free. Renews each year. Cancel anytime." beneath it. Prices still come from the store. |
| 3.1.2: auto-renewal terms, how to cancel, and working links to the Terms of Use and Privacy Policy **in the app** | **Done.** On the paywall (the fine print, Terms of Use and Privacy Policy) and now in Settings. |
| 3.1.2: the same two links **in the App Store metadata** | **At submission.** Fill in the Privacy Policy URL field, and put Apple's standard EULA link in the description (for example a last line "Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"). Leave the custom EULA field empty. |
| 2.1: the reviewer can find and buy every product | **At submission.** Fill in the RevenueCat keys in `app/src/pro-config.js` before building. Without them the paywall says "Purchases aren't set up in this build yet", which is an automatic rejection. Submit the two products with the first version, each with its review screenshot (the paywall). |
| 3.1.1(a) and 3.1.3: no pointing people to cheaper ways to pay (outside the US) | **Done.** The app doesn't mention or link the free website. The privacy page's "The website stays free" line is a fact, not a call to action; leave it at that and keep the website out of the paywall, the app's text and the screenshots. |

## Metadata and listing

| Rule | Status |
| --- | --- |
| Support URL with a real way to get in touch | **Done (new).** `app/support.html`, https://hoai2k.github.io/mini/musicpractice/support.html: a contact form into the same feedback inbox as Send feedback, and answers to the usual questions (restore, cancel, refunds, Pro on two stores, the microphone, deleting data). It names Android, which is fine on a web page, but keep Android and Google Play out of the App Store listing and screenshots (2.3.10). |
| 2.3.2: the description and screenshots say which features need Pro | **At submission.** E.g. "Free: metronome, tuner, recorder. Pro: drone, every take, all eight themes." |
| 2.3.7 and 2.3.14 (new October 2026): no prices or "free" claims in the name, subtitle or screenshots | **At submission.** Don't show the paywall's prices in the screenshots. |
| 2.3.8 and the age rating | **At submission.** The new questionnaire (ratings 4+, 9+, 13+, 16+, 18+, with questions about social features added in 2026): no user content shared with others, no social features, no web browsing. Expect 4+. |
| 2.4.1: iPad | **At submission.** The app is universal (`TARGETED_DEVICE_FAMILY = 1,2`) and the layout already works on iPad, so 13" iPad screenshots are needed. |
| 2.5.19 (new October 2026): no hidden or undocumented features | **Done**, as far as found: Audio check's Export debug data and the app ID in Settings are visible and explained. Add any new developer-only switch to the review notes, or leave it out of the app. |
| Copyright, review contact, category Music | **At submission.** |

## The build

| Rule | Status |
| --- | --- |
| Uploads built with **Xcode 26 and the iOS 26 SDK** (since 28 April 2026; iOS 27 SDK from April 2027) | **At submission.** The README said Xcode 16; now Xcode 26. The deployment target (iOS 15) can stay. |
| 2.5.4: the background audio mode is used for what it's for | **Done.** The metronome and drone play natively with the screen locked. Say so in the review notes, and check it on a real phone before submitting (not yet done). |
| 2.5.2: no downloaded code that changes the app | **Done.** The web app is bundled (`copy-web.sh`); nothing is fetched and run. |
| Export compliance | **Done.** `ITSAppUsesNonExemptEncryption` is `false` in `Info.plist` (only the system's HTTPS). |
| 4.2: more than a website in a wrapper | Mostly **done**: bundled and offline, native audio playing with the screen locked, the microphone asked once, the share sheet, keep awake, In-App Purchase. The Settings sheet's **Reload Page** button, a browser's word, is now hidden in the apps. List these features in the review notes. |

## To plan

The accounts and steps for the release, and the list of things to do before
submitting (listing, screenshots, name, icon), are in `../mobile/LAUNCH.md`.

1. **Guideline 4.3(b), crowded app types.** Since June 2026 Apple names "sound
   effects" and "simple timers" among app types it won't accept without a
   "meaningfully different or improved experience". Metronomes and tuners
   aren't named, but the App Store has thousands of each, and a reviewer may
   lump them in. The answer is the combination, and the review notes and
   first screenshots should lead with it: four tools in one, the Playback
   Recorder that starts and stops itself when you play, timed drones and
   sequences, the Practice Routine, eight themes. If it is rejected under
   4.3, reply in Resolution Center with exactly that rather than resubmitting
   unchanged. Something unusual to show first (the recorder) is the best
   protection.
2. **Real-device testing before submission.** Purchases in the sandbox or
   TestFlight (trial, both products, restore, cancel), the screen-locked
   metronome and drone, the microphone refusal path, and the iPad layout.
   Reviewers try exactly these, and a crash or a dead button is a 2.1
   rejection.
3. **The RevenueCat keys and the store products** (`mobile/README.md`,
   "Setting up purchases"). Nothing to design, but it blocks submission.
4. **Where it is sold: the US and Canada first** (App Store Connect →
   Pricing and Availability). That leaves out the EU and its Digital Services
   Act trader declaration (a trader's address and phone number are shown on
   EU listings); it comes back with translations, if the app takes off.
   The drone recordings were made on a paid ElevenLabs plan, which allows
   commercial use.

## Review notes to paste

> Music Practice is a bundled, offline practice app: a metronome, a
> chromatic tuner, a drone, a Playback Recorder that starts and stops
> recording by itself when you play, and a Practice Routine. Native features:
> the metronome and drone play through native audio code (AVAudioEngine) and
> keep sounding with the screen locked (the reason for the audio background
> mode), the microphone is asked for once and used only on the device, takes
> are shared through the share sheet, and the screen stays awake while
> practising. No account is needed.
>
> Pro (In-App Purchase through StoreKit): the Drone, every take kept,
> renamed and saved as MP3, and all eight themes. To see the paywall, open
> the Drone, or a locked theme in Settings (the gear on the home screen), or
> Settings › Get Pro… . Both products (Pro Yearly with a 1-week free trial,
> and Pro Lifetime) can be bought with a sandbox account. Restore purchases
> is on the paywall.
