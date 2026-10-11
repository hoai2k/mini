// swift-tools-version:5.9
// The Games Chat app's logic that needs no Apple frameworks: phone numbers,
// usernames, the calls server's API, push payloads and the call state machine.
// It builds on Linux too, so `swift test` checks it without a Mac.
import PackageDescription

let package = Package(
    name: "GamesChatCore",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [.library(name: "GamesChatCore", targets: ["GamesChatCore"])],
    targets: [
        .target(name: "GamesChatCore"),
        .testTarget(name: "GamesChatCoreTests", dependencies: ["GamesChatCore"]),
    ]
)
