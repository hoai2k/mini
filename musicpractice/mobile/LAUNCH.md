# Launching Music Practice on the App Store (and Google Play)

Everything that has to happen between "the app is built" and "the app is on
sale", in order. Part 1 is what you need to have. Part 2 is what you do
yourself, as nobody else can: sign up, pay, sign agreements, press Submit.
Part 3 is what Claude does once you say it's time. Claude: read Part 3 before
starting on the release, and work through every item.

The detailed store steps are in [README.md](README.md) (*Setting up
purchases*, *Releasing*); Apple's rules and how the app meets them are in
[../design/app-store-review.md](../design/app-store-review.md). This page
puts them in order and adds what those leave out.

**Release plan:** iPhone and iPad first, in the **US and Canada** only.
Android, other countries and translations later.

## Part 1: what you need

### Accounts

| Account | Cost | For | Notes |
| --- | --- | --- | --- |
| **Apple Developer Program** | US$99 a year | Signing, TestFlight, the App Store | Possibly already done: Games Chat uses one (`chat/ios/TESTFLIGHT.md`, step 1). One membership covers every app. Enrolled as an Individual, your own name shows as the seller. |
| **App Store Connect** | Included | The app's listing, products, prices, review | Same Apple Account as the membership. |
| **RevenueCat** | Free until US$2,500 a month in revenue | Purchases, trials, restore, who has Pro | https://app.revenuecat.com. Sign up with any email. |
| A **sandbox tester** Apple Account | Free | Buying Pro in testing without being charged | Made in App Store Connect (Users and Access → Sandbox). It needs an email address that isn't already an Apple Account; a `+test` alias of your Gmail works. |
| Google Play Console (later) | US$25 once | Android | Identity check, then a closed test with 12 testers for 14 days before production. Not needed for the first release. |
| ElevenLabs | Done | The drone and voice recordings | Paid plan; commercial use allowed. |

### Money and paperwork

- **Paid Apps agreement** in App Store Connect (Business), with a **bank
  account** and **tax forms** (a US W-9, or the form for your country). Until
  it's active, purchases don't work, even in the sandbox.
- **App Store Small Business Program**: apply once the agreement is active;
  Apple then keeps 15% instead of 30%.

### Hardware

- **A Mac** that runs **Xcode 26** (macOS 15.6 or later). Building, signing
  and uploading the iOS app need it. A cloud Mac (MacinCloud and the like)
  works if you don't have one.
- **An iPhone** for testing. An **iPad** too, ideally: the app runs on iPad
  and needs iPad screenshots, which can come from the simulator.
- An Android phone, later.

### Installed on the Mac

| What | How |
| --- | --- |
| Xcode 26 | Mac App Store. Open it once to install the iOS platform. |
| Node.js (LTS) and npm | https://nodejs.org or `brew install node` |
| Git, and this repository | `git clone`; then `cd musicpractice/mobile && npm install` |
| TestFlight (on the iPhone) | App Store. For installing test builds. |
| Android Studio with JDK 21 (later) | https://developer.android.com/studio |

## Part 2: your steps, in order

1. **Join the Apple Developer Program**, or check the existing membership is
   active (https://developer.apple.com/account). Note the **Team ID**.
2. **Sign the Paid Apps agreement** and add bank and tax details (App Store
   Connect → Business). Apply for the Small Business Program.
3. **Create the app in App Store Connect** (Apps → + → New App): iOS, bundle
   ID `io.github.hoai2k.musicpractice` (register it first under Certificates,
   Identifiers & Profiles → Identifiers, with In-App Purchase on), SKU
   `musicpractice`, primary category Music. **Do this early: it reserves the
   name.** If "Music Practice" is taken, tell Claude, and pick a name together.
4. **Set availability** to the United States and Canada only (Pricing and
   Availability).
5. **Create the two products** (README, *Setting up purchases* §1): the
   subscription group *Music Practice Pro* with *Pro Yearly* (`pro_yearly`,
   US$9.99, a 1-week free introductory offer), and the non-consumable *Pro
   Lifetime* (`pro_lifetime`, US$24.99). Make the **In-App Purchase key** for
   RevenueCat.
6. **Set up RevenueCat** (README §3): the project, the App Store app with that
   key, the two products, the `pro` entitlement and the default offering.
   Send Claude the public **Apple API key** (`appl_…`). It's a public key,
   safe to paste in chat.
7. **Make a sandbox tester** (Users and Access → Sandbox).
8. **On the Mac:** pull the repository, `cd musicpractice/mobile && npm
   install && npm run ios`. In Xcode, choose your team under Signing &
   Capabilities, add the **In-App Purchase** capability, plug in the iPhone and
   run. Claude will have written the exact steps for that build.
9. **Test on the iPhone** with the checklist Claude gives you (Part 3,
   item 5), then upload a build (Product → Archive → Distribute → App Store
   Connect) and try it through **TestFlight**.
10. **Fill in the listing** with what Claude prepared: name, subtitle,
    description, keywords, screenshots, Support URL, Privacy Policy URL,
    copyright, App Privacy answers, age rating, review contact and notes.
    Attach the two products to the version.
11. **Submit for review.** Answers usually come in a day or two. If it's
    rejected, paste the message to Claude before replying.
12. **Release** (manually or automatically once approved).

## Part 3: Claude's list before submission

Not done yet on purpose: the screens may still change. When the owner says
the app is ready to release, do each of these, and tick them here.

1. [ ] **The name.** Check the owner's result from Part 2 step 3. "Music
   Practice" is generic and may be taken; a more distinctive name (with
   "Metronome, Tuner & Drone" in the subtitle) also helps with guideline
   4.3(b). The name is in `capacitor.config.json`, `Info.plist`
   (`CFBundleDisplayName`), Android's `strings.xml` and the README.
2. [ ] **The icon.** Decide with the owner whether to keep the wooden
   metronome (see `../design/app-store-review.md`, To plan, and the note on
   the icon below). Regenerate the sizes with `npx capacitor-assets generate`.
3. [ ] **The App Store listing**, written to lead with what's unusual
   (guideline 4.3(b)): the recorder that starts and stops itself, timed drones
   and sequences, the Practice Routine, four tools in one, eight themes;
   metronome and tuner last. Subtitle (30 characters), description (free vs
   Pro spelled out, guideline 2.3.2; ending with the Terms of Use link),
   keywords (100 characters), promotional text. No prices, no "free" in the
   name or screenshots, no Android or Google Play.
4. [ ] **Screenshots** at 6.9" iPhone (1320×2868) and 13" iPad (2064×2752),
   from the web app in Chromium with the final screens; the first two show
   the recorder and the drone, not a plain metronome. Captions written. No
   prices.
5. [ ] **The owner's test checklist** for the iPhone: the paywall and both
   purchases in the sandbox, the trial, Restore, Redeem a code, the drone and
   metronome with the screen locked, a call during playback, Bluetooth,
   refusing the microphone, the share sheet, every screen on iPad in both
   orientations.
6. [ ] **The RevenueCat key** in `../app/src/pro-config.js`; check that the
   paywall shows both plans from the store with the price as the main line.
7. [ ] **Re-check Apple's rules**: the guidelines' latest revision and
   https://developer.apple.com/news/upcoming-requirements/ (SDK version,
   age-rating questions); update `../design/app-store-review.md`.
8. [ ] **The privacy manifest** still matches the code: a new plugin, or new
   native code calling a required-reason API, needs an entry. Ask the owner
   for Xcode's *Generate Privacy Report* after the first Archive.
9. [ ] **Nothing hidden or web-like** in the app build (guideline 2.5.19 and
   4.2): no developer-only switches, no "website" or "reload" wording, no
   link to the free website.
10. [ ] **Versions**: `MARKETING_VERSION` 1.0 and `CURRENT_PROJECT_VERSION` 1
    in the Xcode project.
11. [ ] **Review notes** in `../design/app-store-review.md` brought up to date
    with the final screens (where Pro is, how to reach the paywall).
12. [ ] **A reply ready for a 4.3 rejection**, for the Resolution Center:
    what the app does that others don't, with the screens to point at.
13. [ ] **The App Privacy answers** in README *Releasing* step 3, checked
    against what the app actually sends then.

### The icon and guideline 4.3

The icon doesn't decide 4.3: the reviewer judges what the app does, from
using it, the listing and the first screenshots. A metronome icon won't get
the app rejected. It matters more in search results, where a wooden
metronome sits among dozens of others and says "metronome app", which is
what the listing should avoid leading with. An icon that says "practice"
(a metronome with a recording waveform, or a music stand) would help the
app stand out. Worth deciding when the screens are final; not urgent.
