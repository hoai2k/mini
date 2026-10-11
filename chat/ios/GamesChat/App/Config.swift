import Foundation

/// Where the app finds the web app and the calls server. Both can be changed
/// in Info.plist (GCWebApp, GCCallsServer) without touching code.
enum Config {
    static let webApp: URL = url("GCWebApp", fallback: "https://games.hoai.net/mini/chat/")
    /// The web app is published under both addresses (GitHub Pages redirects
    /// one to the other); the call screen stays inside the app on either.
    static let webHosts: Set<String> = Set([webApp.host, "games.hoai.net", "hoai2k.github.io"].compactMap { $0 })
    static let callsServer: URL = url("GCCallsServer", fallback: "https://games-chat-calls.hoai2k.workers.dev/")

    /// Builds run from Xcode get pushes from Apple's development (sandbox)
    /// service; TestFlight and App Store builds from production.
    static var pushSandbox: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    private static func url(_ key: String, fallback: String) -> URL {
        if let s = Bundle.main.object(forInfoDictionaryKey: key) as? String, let u = URL(string: s), !s.isEmpty { return u }
        return URL(string: fallback)!
    }
}
