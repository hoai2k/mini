import Foundation
import AVFoundation
import CallKit
import PushKit
import UIKit
import GamesChatCore

@MainActor
protocol CallManagerDelegate: AnyObject {
    func callManagerAnswer(_ call: Call) async -> Bool
    func callManagerDecline(_ call: Call)
    func callManagerHangUp()
    func callManagerRang(_ call: Call)
    func callManagerPushCancelled(_ call: Call)
    func callManagerToken(_ hex: String?)
}

/// The system side of calling: CallKit shows ringing calls the way the
/// Phone app does (lock screen included), and PushKit wakes the app for
/// them. The server's call ids are UUIDs, so CallKit uses them as-is.
///
/// Everything here runs on the main thread: PushKit and CallKit are set up
/// to call back on the main queue, and the app calls in from the main actor.
/// That lets a VoIP push be reported to CallKit synchronously, as iOS demands.
final class CallManager: NSObject {
    weak var delegate: CallManagerDelegate?
    private(set) var voipToken: String?

    private let provider: CXProvider
    private let controller = CXCallController()
    private var registry: PKPushRegistry?
    /// The server's calls CallKit knows about, by UUID.
    private var known: [UUID: Call] = [:]
    private var outgoingIds = Set<UUID>()
    private var answered = Set<UUID>()

    override init() {
        let config = CXProviderConfiguration()
        config.supportsVideo = true
        config.maximumCallGroups = 2          // a second caller can wait (and join)
        config.maximumCallsPerCallGroup = 1
        config.supportedHandleTypes = [.generic, .phoneNumber]
        config.includesCallsInRecents = true
        if let icon = UIImage(named: "CallKitIcon")?.pngData() { config.iconTemplateImageData = icon }
        provider = CXProvider(configuration: config)
        super.init()
        provider.setDelegate(self, queue: nil)
    }

    func startPushKit() {
        guard registry == nil else { return }
        let r = PKPushRegistry(queue: .main)
        r.delegate = self
        r.desiredPushTypes = [.voIP]
        registry = r
    }

    private func uuid(_ id: String) -> UUID { UUID(uuidString: id) ?? UUID() }

    private func handle(for person: Person) -> CXHandle {
        CXHandle(type: .generic, value: "@\(person.handle)")
    }

    // MARK: - Reporting to CallKit

    func reportIncoming(_ call: Call, completion: (() -> Void)? = nil) {
        let id = uuid(call.id)
        known[id] = call
        let update = CXCallUpdate()
        update.remoteHandle = handle(for: call.from)
        update.localizedCallerName = call.from.name
        update.hasVideo = true
        update.supportsGrouping = false
        update.supportsHolding = false
        update.supportsDTMF = false
        provider.reportNewIncomingCall(with: id, update: update) { [weak self] error in
            DispatchQueue.main.async {
                if error != nil { self?.known[id] = nil }
                completion?()
            }
        }
        configureAudio()
    }

    func startOutgoing(_ call: Call) {
        let id = uuid(call.id)
        known[id] = call
        outgoingIds.insert(id)
        let start = CXStartCallAction(call: id, handle: handle(for: call.to))
        start.isVideo = true
        controller.request(CXTransaction(action: start)) { _ in }
        provider.reportOutgoingCall(with: id, startedConnectingAt: Date())
        configureAudio()
    }

    func outgoingConnected(_ id: String) {
        provider.reportOutgoingCall(with: uuid(id), connectedAt: Date())
    }

    /// The other side ended it (cancelled, missed, answered elsewhere).
    func remoteEnded(_ id: String) {
        let u = uuid(id)
        guard known[u] != nil else { return }
        provider.reportCall(with: u, endedAt: Date(), reason: .remoteEnded)
        forget(u)
    }

    /// I end one call (it stays ended in CallKit without asking me again).
    func end(_ id: String) {
        let u = uuid(id)
        guard known[u] != nil else { return }
        controller.request(CXTransaction(action: CXEndCallAction(call: u))) { _ in }
        forget(u)
    }

    func endAll() {
        for u in Array(known.keys) {
            controller.request(CXTransaction(action: CXEndCallAction(call: u))) { _ in }
            forget(u)
        }
    }

    private func forget(_ u: UUID) {
        known[u] = nil
        outgoingIds.remove(u)
        answered.remove(u)
    }

    /// The web view's WebRTC shares the app's audio session with CallKit:
    /// voice chat mode, speaker by default, Bluetooth headsets allowed.
    private func configureAudio() {
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playAndRecord, mode: .videoChat, options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker])
    }
}

extension CallManager: CXProviderDelegate {
    func providerDidReset(_ provider: CXProvider) {
        known.removeAll()
        outgoingIds.removeAll()
    }

    func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        guard let call = known[action.callUUID], let delegate else { action.fail(); return }
        Task { @MainActor in
            let ok = await delegate.callManagerAnswer(call)
            if ok { self.answered.insert(action.callUUID); action.fulfill() } else { action.fail() }
        }
    }

    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        let id = action.callUUID
        if let call = known[id] {
            let ringingIn = !outgoingIds.contains(id) && !answered.contains(id)
            forget(id)
            let delegate = self.delegate
            let last = known.isEmpty
            Task { @MainActor in
                if ringingIn { delegate?.callManagerDecline(call) }
                else if last { delegate?.callManagerHangUp() }
            }
        }
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction) {
        // Nothing is ever on hold: a waiting caller joins the call instead.
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
        action.fulfill()
    }

    func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {}
    func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {}
}

extension CallManager: PKPushRegistryDelegate {
    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        let hex = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
        voipToken = hex
        let delegate = self.delegate
        Task { @MainActor in delegate?.callManagerToken(hex) }
    }

    func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        voipToken = nil
        let delegate = self.delegate
        Task { @MainActor in delegate?.callManagerToken(nil) }
    }

    /// iOS requires every VoIP push to be reported to CallKit right away, or
    /// it stops delivering them; "stop ringing" pushes report a call and end
    /// it at once, which is the accepted way to handle them.
    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload,
                                  for type: PKPushType, completion: @escaping () -> Void) {
        // Called on the main queue (the registry was made with .main), so the
        // call is reported to CallKit before this returns.
        guard let push = VoipPush.parse(payload.dictionaryPayload) else {
            let id = UUID()
            let update = CXCallUpdate()
            update.localizedCallerName = "Games Chat"
            provider.reportNewIncomingCall(with: id, update: update) { [provider] _ in
                provider.reportCall(with: id, endedAt: Date(), reason: .failed)
                completion()
            }
            return
        }
        let id = uuid(push.call.id)
        let delegate = self.delegate
        switch push.kind {
        case .ring:
            if known[id] != nil { completion(); return }
            reportIncoming(push.call) { completion() }
            Task { @MainActor in delegate?.callManagerRang(push.call) }
        case .cancel:
            if known[id] != nil {
                remoteEnded(push.call.id)
                Task { @MainActor in delegate?.callManagerPushCancelled(push.call) }
                completion()
            } else {
                let update = CXCallUpdate()
                update.localizedCallerName = push.call.from.name
                update.remoteHandle = handle(for: push.call.from)
                provider.reportNewIncomingCall(with: id, update: update) { [provider] _ in
                    provider.reportCall(with: id, endedAt: Date(), reason: .remoteEnded)
                    completion()
                }
            }
        }
    }
}
