import Foundation
import GamesChatCore

/// The app's live line to the calls server while it's open (or in a call):
/// calls ring here without a push, and the caller hears at once when they're
/// answered or declined. Reconnects on its own with a growing delay.
@MainActor
final class Inbox {
    var onEvent: (@MainActor (InboxEvent) -> Void)?
    private var task: URLSessionWebSocketTask?
    private var url: URL?
    private var retry = 1.0
    private var pingTimer: Timer?

    func connect(_ url: URL) {
        if self.url == url, task != nil { return }
        disconnect()
        self.url = url
        open()
    }

    func disconnect() {
        url = nil
        pingTimer?.invalidate()
        pingTimer = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    private func open() {
        guard let url else { return }
        let t = URLSession.shared.webSocketTask(with: url)
        task = t
        t.resume()
        receive(t)
        pingTimer?.invalidate()
        pingTimer = Timer.scheduledTimer(withTimeInterval: 25, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.task?.send(.string("ping")) { _ in } }
        }
    }

    private func receive(_ t: URLSessionWebSocketTask) {
        t.receive { [weak self] result in
            Task { @MainActor in
                guard let self, self.task === t else { return }
                switch result {
                case .success(let message):
                    self.retry = 1
                    if case .string(let text) = message, let event = InboxEvent.decode(text) { self.onEvent?(event) }
                    self.receive(t)
                case .failure:
                    self.task = nil
                    let delay = self.retry
                    self.retry = min(30, self.retry * 2)
                    Task { @MainActor [weak self] in
                        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                        guard let self, self.task == nil, self.url != nil else { return }
                        self.open()
                    }
                }
            }
        }
    }
}
