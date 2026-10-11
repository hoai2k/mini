# Getting Games Chat onto people's iPhones and iPads (TestFlight)

This is everything that has to happen outside this repository: what to sign
up for, what to put where, and what to press. Do it in order. Plan on an
afternoon, plus a day or two of waiting for Apple (enrolment, and the first
external TestFlight review).

What you end up with: testers install Apple's **TestFlight** app, tap your
invite link, and get Games Chat. They can call each other by username or
phone number, and calls ring like normal phone calls, lock screen included.

---

## 0. What you need

| What | Why | Cost |
| --- | --- | --- |
| A Mac with **Xcode 16** or later (free from the Mac App Store) | Building and uploading the app. Nothing else can sign iOS apps. | Free |
| An **Apple Developer Program** membership | TestFlight, push notifications (calls ringing), signing | US$99 / year |
| Your **Cloudflare** account (the one that runs `mini-rooms`) | Runs the calls server, `games-chat-calls` | Free tier is plenty |
| A **Twilio** account with **Verify** (optional) | Texting codes so people can add their phone number. Without it, calling by username still works. | About US$0.05 per verification (trial credit to start) |
| An iPhone (and ideally a second device) | Trying real calls before inviting anyone | — |

---

## 1. Join the Apple Developer Program

1. Go to <https://developer.apple.com/programs/enroll/> and sign in with your
   Apple Account (two-factor authentication must be on).
2. Enrol as an **Individual** (simplest; your name is shown as the seller) or
   as an **Organization** (needs a D-U-N-S number; takes longer).
3. Pay the US$99. Approval usually takes from a few hours to two days. You get
   an email when it's active.
4. Find your **Team ID**: <https://developer.apple.com/account> → Membership
   details → *Team ID* (10 characters, like `AB12CD34EF`). Keep it handy.

## 2. Choose the app's bundle ID and put in your team

The bundle ID is the app's permanent identity. The project uses
`net.hoai.gameschat`. Keep it if that's fine; otherwise pick your own
reverse-domain name (it can't be changed once the app is in App Store Connect).

On the Mac:

```sh
git clone https://github.com/hoai2k/mini.git
cd mini/chat/ios
```

Open `project.yml` and set:

- `DEVELOPMENT_TEAM: "AB12CD34EF"` (your Team ID)
- `PRODUCT_BUNDLE_IDENTIFIER: net.hoai.gameschat` (or yours)

Then regenerate the Xcode project:

```sh
brew install xcodegen      # once (needs Homebrew: https://brew.sh)
xcodegen generate
```

(You can also skip XcodeGen: open `GamesChat.xcodeproj`, select the
*GamesChat* target → *Signing & Capabilities*, pick your team and type the
bundle ID there. But the next `xcodegen generate` would undo it, so editing
`project.yml` is better.)

## 3. Make the push key (for ringing)

Calls ring through Apple's VoIP push service. The calls server needs a key to
send those pushes.

1. <https://developer.apple.com/account/resources/authkeys/list> → **+**.
2. Name it "Games Chat push", tick **Apple Push Notifications service
   (APNs)**, choose *Sandbox & Production* if asked, Continue → Register.
3. **Download** the `AuthKey_XXXXXXXXXX.p8` file. Apple lets you download it
   only once, so keep it somewhere safe (a password manager is good).
4. Note the **Key ID** (the `XXXXXXXXXX` part).

You don't need to make an App ID or certificates by hand: Xcode's automatic
signing creates the App ID with Push Notifications turned on the first time
you build to a device (step 6).

## 4. Deploy the calls server

The calls server is `chat/ios/server` (accounts, phone numbers, ringing). It's
a Cloudflare Worker like `mini-rooms`, and needs Node.js 20+ (`brew install node`).

```sh
cd mini/chat/ios/server
npm ci
npx wrangler login                 # opens a browser to your Cloudflare account
npx wrangler deploy
```

`wrangler deploy` prints the server's address, normally
`https://games-chat-calls.<your-subdomain>.workers.dev`. If that isn't
`https://games-chat-calls.hoai2k.workers.dev/`, put your address in
`project.yml` under `GCCallsServer` and run `xcodegen generate` again.

Now give it its secrets (each command asks for the value):

```sh
npx wrangler secret put APNS_KEY_ID        # the Key ID from step 3
npx wrangler secret put APNS_TEAM_ID       # your Team ID
npx wrangler secret put APNS_TOPIC         # the bundle ID, e.g. net.hoai.gameschat
npx wrangler secret put PHONE_PEPPER       # any long random text; never change it afterwards
cat ~/Downloads/AuthKey_XXXXXXXXXX.p8 | npx wrangler secret put APNS_KEY
```

Check it: open the server's address in a browser. It should say
`games-chat-calls is running`.

### Phone numbers (optional): Twilio Verify

Without this, people call each other by username, and calling a phone number
that isn't on the app offers to text them a link instead. To let people add
their own number, so friends can call it:

1. Sign up at <https://www.twilio.com/try-twilio>. The trial includes credit;
   add a card later to text people who aren't verified on your Twilio account.
2. Console → **Verify** → **Services** → *Create new*, name it "Games Chat",
   with the SMS channel on. Copy its **Service SID** (starts with `VA`).
3. Console home → copy the **Account SID** (starts with `AC`) and **Auth Token**.
4. ```sh
   npx wrangler secret put TWILIO_ACCOUNT_SID
   npx wrangler secret put TWILIO_AUTH_TOKEN
   npx wrangler secret put TWILIO_VERIFY_SID
   ```

### Make sure video connects over mobile data

Calls between phones on mobile networks often need a TURN relay. The
`mini-rooms` relay hands those out once its TURN secrets are set (see
`chat/README.md`, "How calls work", and `multiplayer/README.md`). If you
haven't done that yet, do it now: without it, calls between two phones on
mobile data may ring and answer but show no video.

## 5. The privacy policy

TestFlight's external testing (and later the App Store) needs a privacy
policy link. One is published with the web app:
<https://hoai2k.github.io/mini/chat/privacy.html> (from `chat/privacy.html`;
edit it there if anything changes).

## 6. Run it on your own iPhone first

1. Open `chat/ios/GamesChat.xcodeproj` in Xcode.
2. iPhone: Settings → Privacy & Security → **Developer Mode** → on (it
   appears after you first connect the phone to Xcode; the phone restarts).
3. Plug the iPhone in (or pair it over Wi-Fi), choose it at the top of the
   Xcode window, and press **Run** (▶). The first time, Xcode registers the
   phone and makes the App ID with Push Notifications.
4. In the app: make an account, then Account → **Test ringing**. It should say
   "Apple accepted the push", and the phone rings with "Games Chat test call".
   If it says something else, see *Troubleshooting* below.
5. Do the same on a second device (an iPad is fine), and call each other by
   username. Check the list in *What to try on real devices* below.

Builds run from Xcode use Apple's *development* push service, and TestFlight
builds use *production*. The app tells the server which one it is, so
nothing needs changing between them.

## 7. Create the app in App Store Connect

1. <https://appstoreconnect.apple.com> → **Apps** → **+** → *New App*.
2. Platform **iOS**. Name: "Games Chat" (App Store names are unique; if it's
   taken, try "Games Chat – Video Fun" or similar; the name on the home screen
   stays "Games Chat"). Language English, **Bundle ID**: pick the one from
   step 2 (it appears after step 6). SKU: anything, e.g. `gameschat`. Access:
   Full.
3. **App Privacy** (left column): fill in the questionnaire. Matching
   `privacy.html`, the answers are:
   - *Contact Info → Name*: collected, used for App Functionality, linked to
     the user, not used for tracking.
   - *Contact Info → Phone Number*: collected (only if they add it), App
     Functionality, linked, not tracking.
   - *User Content → Audio Data / Photos or Videos*: **not** collected (calls
     go person to person and are never stored).
   - *Identifiers → User ID*: collected (the username), App Functionality,
     linked, not tracking.
   - No tracking at all.
   - Privacy Policy URL: the link from step 5.

## 8. Upload a build

1. In Xcode, choose **Any iOS Device (arm64)** as the destination.
2. Each upload needs a new build number: raise `CURRENT_PROJECT_VERSION` in
   `project.yml` (1, 2, 3…) and run `xcodegen generate`. Raise
   `MARKETING_VERSION` (1.0 → 1.1) for releases people should notice.
3. **Product → Archive**. When it finishes, the Organizer opens.
4. **Distribute App** → **App Store Connect** → **Upload** → keep the defaults
   (automatic signing, include symbols) → Upload.
5. Wait about 10 to 30 minutes for "processing". You get an email, and the build
   appears under your app → **TestFlight**. The encryption question is
   already answered in the app (`ITSAppUsesNonExemptEncryption = NO`: it only
   uses standard encryption).

## 9. Invite testers

**Internal testers** (fastest, no review, up to 100 people): they must be
members of your App Store Connect team.

1. App Store Connect → **Users and Access** → **+**: add each person with the
   *Developer* or *Marketing* role (they get an email and must accept).
2. Your app → **TestFlight** → **Internal Testing** → **+** a group → add them
   → add the build.

**External testers** (anyone, up to 10,000, by email or a public link): the
first build of each version goes through a short Beta App Review, usually
under a day.

1. TestFlight → **Test Information**: a short description ("Video chat with
   face effects and games; call friends by username or phone number"), a
   feedback email, and the privacy policy URL. Under *Beta App Review
   Information*, give a contact and a **demo account note**: reviewers need
   two devices to try calling, so write something like "Make an account; to
   test calling, use 'Join the open chat' or call @<your username>, who will
   answer during review hours". Leave sign-in required **off** (accounts are
   made in the app).
2. **External Testing** → **+** a group → add the build → *Submit for Review*.
3. When approved: add testers by email, or turn on the **Public Link** and
   send that to people.

Testers: install **TestFlight** from the App Store, open the invite (email or
link), tap *Install*. Builds last 90 days; upload new ones as you go (internal
testers get them straight away; external ones after a quick review only when
the version number changes).

## 10. What to try on real devices

Things only real hardware can show, and they're worth checking before inviting
people:

- [ ] Camera, microphone and effects work in the call (first launch asks for
      camera and microphone once).
- [ ] Calling by username from an iPad with no phone number rings an iPhone.
- [ ] Calling a phone number that has the app rings it (after Twilio is set
      up and that person has added their number).
- [ ] With the callee's app closed and the phone locked, the call rings on
      the lock screen, Answer works, and after unlocking (or the video button)
      the call opens with video.
- [ ] Decline on the callee shows "can't talk right now" on the caller;
      letting it ring out shows "didn't answer".
- [ ] During a call, a third person calls one of you: a banner asks "Let them
      join this call?" (or iOS shows a waiting call). Letting them in brings
      them into the same call.
- [ ] Hang up (the red button at the end of the strip) ends the call on both
      sides, and the green call pill in the status bar goes away.
- [ ] Calling a number that isn't on the app offers to text a link; the
      friend opens it in Safari and appears in your call.
- [ ] Sound comes out of the speaker, and switches to AirPods or a Bluetooth
      headset when connected.
- [ ] On mobile data on both ends, video connects (needs TURN, see step 4).
- [ ] iPad: rotate during a call; split view.

## Troubleshooting

- **Test ringing says "no Apple push key"**: the `APNS_*` secrets aren't set
  on the calls server (step 4).
- **"Apple refused the push (403, InvalidProviderToken)"**: the Key ID or
  Team ID is wrong, or the `.p8` file was pasted incompletely.
- **"(400, DeviceTokenNotForTopic)"**: `APNS_TOPIC` isn't exactly the app's
  bundle ID.
- **"(400, BadDeviceToken)"**: a build from Xcode was tested against
  production or the reverse; reopen the app (it re-registers) and try again.
- **The push "didn't go out" with a network error**: the Worker couldn't reach
  Apple. APNs needs HTTP/2; Cloudflare's `fetch` negotiates it, but if a
  future change breaks that, `npx wrangler tail` in `chat/ios/server` shows the
  error. A small HTTP/2 push relay would be the fallback.
- **Ringing works but answering opens a black screen**: the phone was locked;
  unlock it and the camera starts (iOS doesn't allow the camera on the lock
  screen).
- **Server logs**: `cd chat/ios/server && npx wrangler tail`.

## Costs, roughly

- Apple Developer Program: US$99 a year.
- Cloudflare: free tier (Workers and Durable Objects) covers a friends-and-family app;
  TURN is billed per gigabyte relayed beyond the free allowance.
- Twilio Verify: about US$0.05 per phone verification, only when someone adds
  their number.
