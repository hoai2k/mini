import Foundation
import SwiftUI
import UIKit
import GamesChatCore

/// The app's state: who I am, the call I'm in, calls ringing in and out.
/// The rules live in GamesChatCore's CallLogic (tested on any machine); this
/// carries them out with CallKit (CallManager), the live inbox, the calls
/// server and the web call screen.
@MainActor
final class AppModel: ObservableObject {
    static let shared = AppModel()

    enum Screen: Equatable {
        case home
        case call(room: String)
    }

    /// A call I'm ringing out on, shown over the call screen.
    struct Outgoing: Equatable {
        var call: Call?
        var target: String
        var status: String
        var failed: Bool = false
    }

    struct Recent: Codable, Identifiable, Equatable {
        var id: String { target }
        var target: String
        var name: String
        var at: Date
    }

    @Published var account: Account?
    @Published var screen: Screen = .home
    @Published var outgoing: Outgoing?
    @Published var joinRequests: [Call] = []
    @Published var peers = 0
    @Published var recents: [Recent] = []
    @Published var notice: String?
    /// Someone wasn't found: offer to text them a link to the room instead.
    struct Invite: Identifiable, Equatable {
        var id: String { room }
        var target: String
        var room: String
    }
    @Published var invite: Invite?

    let api: CallsAPI
    let calls = CallManager()
    private let inbox = Inbox()
    private var logic = CallLogic()
    private var active = true

    private init() {
        api = CallsAPI(base: Config.callsServer, token: Keychain.get("token"))
        if let data = UserDefaults.standard.data(forKey: "recents"),
           let saved = try? JSONDecoder().decode([Recent].self, from: data) { recents = saved }
        if let data = UserDefaults.standard.data(forKey: "account"),
           let saved = try? JSONDecoder().decode(Account.self, from: data), api.token != nil { account = saved }
        inbox.onEvent = { [weak self] event in self?.handle(event) }
        calls.delegate = self
    }

    var countryCode: String { PhoneNumber.countryCode(forRegion: Locale.current.region?.identifier) }
    var myName: String { account?.name ?? "Me" }

    // MARK: - Launch and lifecycle

    func startPushAndCalls() {
        calls.startPushKit()
        Task { await refreshAccount() }
    }

    func scenePhaseChanged(active: Bool) {
        self.active = active
        updateInbox()
        if active { Task { await refreshAccount() } }
    }

    /// The live inbox is open while the app is on screen, or in a call (the
    /// call keeps the app running, so a second caller can ask to join).
    private func updateInbox() {
        if account != nil, active || logic.room != nil, let url = api.inboxURL() { inbox.connect(url) }
        else { inbox.disconnect() }
    }

    func refreshAccount() async {
        guard api.token != nil else { return }
        do {
            setAccount(try await api.me())
            if let token = calls.voipToken { try? await api.setVoipToken(token, sandbox: Config.pushSandbox) }
        } catch let e as APIError where e.status == 401 {
            signOutLocally()
        } catch {}
    }

    private func setAccount(_ a: Account?) {
        account = a
        if let a, let data = try? JSONEncoder().encode(a) { UserDefaults.standard.set(data, forKey: "account") }
        else { UserDefaults.standard.removeObject(forKey: "account") }
        updateInbox()
    }

    // MARK: - Account

    func createAccount(name: String, handle: String) async throws {
        let (acct, token) = try await api.createAccount(handle: handle, name: name)
        Keychain.set("token", token)
        setAccount(acct)
        if let t = calls.voipToken { try? await api.setVoipToken(t, sandbox: Config.pushSandbox) }
    }

    func rename(_ name: String) async throws { setAccount(try await api.update(name: name)) }

    func startPhone(_ raw: String) async throws -> String {
        guard let phone = PhoneNumber.normalize(raw, defaultCountryCode: countryCode) else { throw APIError(code: "bad_phone", status: 400) }
        try await api.startPhoneVerification(phone)
        return phone
    }

    func confirmPhone(_ phone: String, code: String) async throws { setAccount(try await api.checkPhone(phone, code: code)) }

    func removePhone() async throws {
        try await api.removePhone()
        await refreshAccount()
    }

    func deleteAccount() async throws {
        try await api.deleteAccount()
        signOutLocally()
    }

    private func signOutLocally() {
        Keychain.set("token", nil)
        api.token = nil
        setAccount(nil)
    }

    func voipTokenChanged(_ hex: String?) {
        guard api.token != nil else { return }
        Task { try? await api.setVoipToken(hex, sandbox: Config.pushSandbox) }
    }

    // MARK: - Calling out

    /// Calls a username or phone number. I go into a fresh room straight
    /// away and wait there; they're brought in when they answer.
    func call(_ raw: String) async {
        guard let target = CallTarget.parse(raw, defaultCountryCode: countryCode) else {
            notice = "Type a username (like @ana) or a phone number."
            return
        }
        let room = logic.room ?? Rooms.newCallRoom()
        let shown = raw.trimmingCharacters(in: .whitespaces)
        outgoing = Outgoing(call: nil, target: shown, status: "Calling \(shown)…")
        do {
            let call = try await api.call(target, room: room)
            logic.calling(call)
            outgoing = Outgoing(call: call, target: shown, status: "Ringing \(call.to.name)…")
            remember(target: target.serverValue, name: call.to.name)
            if logic.room == nil { enter(room) }
            calls.startOutgoing(call)
        } catch let e as APIError where e.code == "not_found" {
            outgoing = nil
            invite = Invite(target: shown, room: room)
        } catch {
            outgoing = Outgoing(call: nil, target: shown, status: error.localizedDescription, failed: true)
        }
    }

    func cancelOutgoing() {
        guard let call = outgoing?.call else { outgoing = nil; return }
        outgoing = nil
        calls.end(call.id)
        Task { try? await api.cancel(call.id) }
        if peers == 0 { hangup() }
    }

    /// Opens the room someone who isn't on the app will join from a link.
    func startInviteRoom(_ room: String) {
        if logic.room == nil { enter(room) }
    }

    func joinOpenChat() { enter("everyone") }

    private func remember(target: String, name: String) {
        recents.removeAll { $0.target == target }
        recents.insert(Recent(target: target, name: name, at: Date()), at: 0)
        recents = Array(recents.prefix(20))
        if let data = try? JSONEncoder().encode(recents) { UserDefaults.standard.set(data, forKey: "recents") }
    }

    // MARK: - Rooms

    private func enter(_ room: String) {
        logic.entered(room)
        peers = 0
        screen = .call(room: room)
        UIApplication.shared.isIdleTimerDisabled = true
        updateInbox()
    }

    /// Hang up: leave the room, end every CallKit call, stop anything ringing.
    func hangup() {
        if let call = outgoing?.call { Task { try? await api.cancel(call.id) } }
        outgoing = nil
        for call in joinRequests { decline(call) }
        logic.left()
        calls.endAll()
        screen = .home
        peers = 0
        UIApplication.shared.isIdleTimerDisabled = false
        updateInbox()
    }

    func peersChanged(_ count: Int) {
        if count > 0, peers == 0, let call = outgoing?.call, outgoing?.failed == false {
            // They're here: the call is connected.
            calls.outgoingConnected(call.id)
            outgoing = nil
        }
        peers = count
    }

    // MARK: - Calls coming in

    private func handle(_ event: InboxEvent) {
        switch event {
        case .hello(let a): setAccount(a)
        case .ring(let call): ring(call, fromPush: false)
        case .call(let call): apply(logic.update(call), call)
        }
    }

    /// A call rang, by push (already reported to CallKit) or the inbox.
    func ring(_ call: Call, fromPush: Bool) {
        switch logic.ring(call) {
        case .ringSystem(let c):
            if !fromPush { calls.reportIncoming(c) }
        case .askToJoin(let c):
            if fromPush {
                // CallKit is already showing it as a waiting call; the answer
                // button there lets them in too.
            }
            if !joinRequests.contains(where: { $0.id == c.id }) { joinRequests.append(c) }
        default: break
        }
    }

    private func apply(_ action: CallLogic.Action, _ call: Call) {
        switch action {
        case .enterRoom(let room):
            if let o = outgoing, o.call?.id == call.id { outgoing?.status = "\(call.to.name) answered" }
            if case .call(let current) = screen, current != room { enter(room) }
            else if case .home = screen { enter(room) }
        case .outgoingEnded(let c):
            calls.end(c.id)
            let why: String
            switch c.status {
            case .declined: why = "\(c.to.name) can't talk right now"
            case .missed: why = "\(c.to.name) didn't answer"
            default: why = "The call ended"
            }
            outgoing = Outgoing(call: c, target: c.to.handle, status: why, failed: true)
        case .stopRinging(let c):
            joinRequests.removeAll { $0.id == c.id }
            calls.remoteEnded(c.id)
        default: break
        }
    }

    /// Answer (from CallKit or the join banner). In a call already, the
    /// caller joins this one; otherwise I go into theirs.
    func answer(_ call: Call) async -> Bool {
        let joinRoom = logic.answering(call.id)
        joinRequests.removeAll { $0.id == call.id }
        do {
            let answered = try await api.answer(call.id, joinRoom: joinRoom)
            if joinRoom == nil { enter(answered.room) }
            return true
        } catch {
            notice = "That call has ended."
            return false
        }
    }

    func decline(_ call: Call) {
        logic.declined(call.id)
        joinRequests.removeAll { $0.id == call.id }
        calls.end(call.id)
        Task { try? await api.decline(call.id) }
    }

    /// The join banner's "Let in".
    func letIn(_ call: Call) {
        Task {
            if await answer(call) { calls.end(call.id) }
        }
    }
}

extension AppModel: CallManagerDelegate {
    func callManagerAnswer(_ call: Call) async -> Bool { await answer(call) }
    func callManagerDecline(_ call: Call) { decline(call) }
    func callManagerHangUp() { hangup() }
    func callManagerRang(_ call: Call) { ring(call, fromPush: true) }
    func callManagerPushCancelled(_ call: Call) { apply(logic.update(call), call) }
    func callManagerToken(_ hex: String?) { voipTokenChanged(hex) }
}
