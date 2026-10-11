# Games Chat for iPhone and iPad

The iOS app of Games Chat. It is the web app (`chat/`) with native calling
around it: everything people do in a call (effects, accessories, backgrounds,
games, messages) is the same web code in a `WKWebView`, so the two versions
stay in step with no porting. Native code does what only iOS can do well:

- **Ringing like a phone call.** CallKit shows incoming calls on the lock
  screen and in Recents, and PushKit (Apple VoIP pushes) wakes the app to
  ring even when it's closed.
- **Calling by phone number or username.** Accounts on the calls server: a
  username, plus a phone number verified by text. An iPad without a number
  calls by username, or by the friend's number, and it rings their app. A
  number that isn't on the app gets a text with a link to join from a browser.
- **Letting a third caller in.** Someone calling while you're talking shows a
  banner: *Let them join this call?* If you let them in, they're brought into
  the same call.
- **Contacts.** The system contact picker hands over only the number tapped.
- **An app-shaped call screen.** No fullscreen button (the app is full
  screen), and a red **Hang up** at the end of the bottom strip instead of
  Leave in Settings. The web version is unchanged.

Getting it onto devices: **[TESTFLIGHT.md](TESTFLIGHT.md)**.

## Layout

| Path | What it is |
| --- | --- |
| `project.yml` | XcodeGen spec; `GamesChat.xcodeproj` is generated from it (`xcodegen generate`) |
| `GamesChat.xcodeproj` | The generated Xcode project, committed so a Mac can just open it |
| `GamesChat/App/` | App entry, `AppModel` (state: account, calls, rooms), `Config` (server addresses) |
| `GamesChat/Calling/` | `CallManager` (CallKit + PushKit), `Inbox` (live connection to the calls server), `WebCallView` (the web app in a WKWebView) |
| `GamesChat/Views/` | Sign-up, home (call box, contacts, recents, the open chat), the call screen's banners, account |
| `GamesChat/Support/` | Keychain, presenting UIKit screens |
| `GamesChat/Assets.xcassets` | App icon (`make_icon.py` builds it: the delivered CH-U04 art, or a stand-in), colours |
| `GamesChatCore/` | Swift package with no Apple-only frameworks: phone numbers, usernames, the calls API client, push payloads, `CallLogic` (what to do as calls ring, answer and end). Builds and tests on Linux. |
| `web/native.js`, `web/native.css` | Injected into the web app by `WebCallView`: app tweaks and the bridge to native code |
| `server/` | `games-chat-calls`, the Cloudflare Worker for accounts and ringing |
| `test/web-shell.mjs` | Browser check of `web/` against the real web app |

## How a call works

1. Ana types `@bo` (or Bo's number) and taps *Video call*. The app makes a
   room name (`call-…`), opens the web app in it (Ana waits there, seeing
   herself), and asks the calls server to ring Bo.
2. The server finds Bo by username, or by the keyed hash of his number. If
   Bo's app is open, the ring goes down its live inbox connection; otherwise
   an Apple VoIP push wakes his phone and CallKit rings it.
3. Bo answers. His app tells the server and opens the same room; Ana's app
   hears "answered" and her CallKit call goes green when Bo's video arrives.
4. If Bo was already in a call when Cy rang, *Let them in* answers with Bo's
   current room, and Cy's app moves into it: a three-way call.
5. Video and sound go through WebRTC and the `mini-rooms` relay exactly as in
   the web version.

The web app joins `?room=<name>` when given one (the shared room
`everyone` otherwise), which is also what invite links open in a browser.

## Checks

```sh
# the platform-free Swift logic (on a Mac, or Linux with a Swift toolchain)
cd chat/ios/GamesChatCore && swift test
# the same against a running calls server: in chat/ios/server run
#   npx wrangler dev --var DEV_CODE:424242   then:
CALLS_URL=http://127.0.0.1:8787/ swift test

# the calls server: accounts, phone codes, lookups, ringing, answering,
# joining an ongoing call, declining, cancelling, deleting
cd chat/ios/server && npm ci && npm test

# the injected web layer against the published web app and a local relay
chat/publish.sh local/pages/chat && node chat/ios/test/web-shell.mjs

# the app itself, on a Mac
xcodebuild -project chat/ios/GamesChat.xcodeproj -scheme GamesChat \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

The workflow `.github/workflows/chat-ios.yml` runs the Swift tests and the
simulator build on a Mac runner whenever `chat/ios/` changes.

### Working on Linux

Swift and XcodeGen both run on Linux, installed under `chat/ios/.tools/`
(ignored by Git):

```sh
cd chat/ios/.tools
curl -LO https://download.swift.org/swift-6.0.3-release/ubuntu2404/swift-6.0.3-RELEASE/swift-6.0.3-RELEASE-ubuntu24.04.tar.gz
tar xzf swift-6.0.3-RELEASE-ubuntu24.04.tar.gz
export PATH=$PWD/swift-6.0.3-RELEASE-ubuntu24.04/usr/bin:$PATH
git clone --depth 1 --branch 2.42.0 https://github.com/yonaskolb/XcodeGen.git
cd XcodeGen && swift build -c release --product xcodegen
# XcodeProj's String+Utils.swift has a Linux-only arc4random_uniform that
# clashes with glibc's: replace its use with Int.random(in:) and rebuild.
cd ../.. && USER=$(whoami) .tools/XcodeGen/.build/release/xcodegen generate
```

The app target (UIKit, CallKit, PushKit, WebKit) only builds on a Mac; on
Linux, `swiftc -parse` checks its syntax.

## Keeping the two versions in step

Effects, games and the call screen are the web app's, so new ones appear in
the iOS app as soon as the web version is published (the app loads it from
GitHub Pages). Change `web/native.js` only for app-specific behaviour, and
re-run `test/web-shell.mjs` when the web app's call screen changes (it relies
on `#controls`, `#btn-leave`, `#name-input`, `#start-btn`, `#stage .tile` and
`[data-action="fullscreen"]`).

## Known limits

- The app needs the network to load the call screen (as calls do anyway).
- Answering on a locked phone connects the call, but the camera only starts
  once the phone is unlocked and the app is on screen (iOS rule).
- CallKit and WKWebView's WebRTC share the audio session. This is set to
  voice chat with the speaker; confirm on devices that the microphone works
  after answering from the lock screen.
- Whether Cloudflare Workers can deliver Apple pushes (APNs needs HTTP/2) is
  confirmed by *Test ringing* in Account; see TESTFLIGHT.md if it fails.
