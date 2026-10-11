import SwiftUI
import UIKit
import WebKit
import GamesChatCore

/// The call itself: the Games Chat web app (effects, games, chat, all of it)
/// in a WKWebView, joining `room` as me. web/native.js, injected before the
/// page runs, swaps the web-only bits for app ones (no fullscreen button, a
/// hang-up button at the end of the strip) and reports back here.
struct WebCallView: UIViewRepresentable {
    let room: String
    let name: String
    let onHangup: () -> Void
    let onPeers: (Int) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsAirPlayForMediaPlayback = false
        let content = WKUserContentController()
        content.addUserScript(WKUserScript(source: Self.injectedScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        // A weak hop so the web view doesn't keep the coordinator alive forever.
        content.add(WeakMessageHandler(context.coordinator), name: "native")
        config.userContentController = content

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.scrollView.isScrollEnabled = false
        web.allowsLinkPreview = false
        web.uiDelegate = context.coordinator
        web.navigationDelegate = context.coordinator
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }   // Safari > Develop
        #endif
        context.coordinator.load(web, room: room)
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        context.coordinator.parent = self
        // A waiting caller who was let into someone else's call moves rooms.
        if context.coordinator.room != room { context.coordinator.load(web, room: room) }
    }

    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) {
        // Closing the page ends its WebRTC connections and leaves the room.
        web.configuration.userContentController.removeScriptMessageHandler(forName: "native")
        web.loadHTMLString("", baseURL: nil)
    }

    /// native.css handed over as a string, then native.js.
    static let injectedScript: String = {
        func resource(_ name: String, _ ext: String) -> String {
            // web/ is copied into the app as a folder.
            guard let url = Bundle.main.url(forResource: name, withExtension: ext, subdirectory: "web")
                    ?? Bundle.main.url(forResource: name, withExtension: ext),
                  let text = try? String(contentsOf: url, encoding: .utf8) else { return "" }
            return text
        }
        let css = resource("native", "css")
        let cssLiteral = (try? String(data: JSONSerialization.data(withJSONObject: [css], options: []), encoding: .utf8))
            .map { String($0.dropFirst().dropLast()) } ?? "\"\""
        return "window.__gamesChatCSS = \(cssLiteral);\n" + resource("native", "js")
    }()

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {
        var parent: WebCallView
        var room = ""

        init(_ parent: WebCallView) { self.parent = parent }

        func load(_ web: WKWebView, room: String) {
            self.room = room
            web.load(URLRequest(url: Rooms.appPage(room: room, name: parent.name, base: Config.webApp)))
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
            switch type {
            case "hangup": parent.onHangup()
            case "peers": parent.onPeers((body["count"] as? NSNumber)?.intValue ?? 0)
            default: break
            }
        }

        // The page asks for the camera and microphone; the app has already
        // been allowed them by the person (Info.plist explains why), so the
        // web view doesn't ask a second time.
        func webView(_ webView: WKWebView, decideMediaCapturePermissionsFor origin: WKSecurityOrigin,
                     initiatedBy frame: WKFrameInfo, type: WKMediaCaptureType) async -> WKPermissionDecision {
            Config.webHosts.contains(origin.host) ? .grant : .prompt
        }

        // Only the web app and the relay stay inside; other links open in Safari.
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let url = action.request.url else { return .cancel }
            if url.scheme == "about" { return .allow }
            if let host = url.host, Config.webHosts.contains(host) {
                // The camera needs a secure page: never follow a redirect to http.
                if url.scheme == "http", var c = URLComponents(url: url, resolvingAgainstBaseURL: false) {
                    c.scheme = "https"
                    if let secure = c.url { webView.load(URLRequest(url: secure)) }
                    return .cancel
                }
                return .allow
            }
            if action.targetFrame?.isMainFrame != false { await UIApplication.shared.open(url) }
            return .cancel
        }

        // The page crashed or iOS reclaimed it while in the background: reload.
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            load(webView, room: room)
        }
    }
}

/// Holds the real handler weakly (WKUserContentController retains its handlers).
@MainActor
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(c, didReceive: message)
    }
}
