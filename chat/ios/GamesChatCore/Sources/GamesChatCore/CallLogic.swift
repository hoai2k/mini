import Foundation

/// Decides what the app does as calls ring, start and end. It holds no
/// Apple frameworks, so the rules are tested on any machine; the app carries
/// out the actions with CallKit, the web view and the calls server.
public struct CallLogic: Equatable, Sendable {
    /// The room I'm in right now, if any (a call or the open chat).
    public private(set) var room: String?
    /// Calls I'm ringing out on, by id.
    public private(set) var outgoing: [String: Call] = [:]
    /// Calls ringing in, by id.
    public private(set) var incoming: [String: Call] = [:]

    public init() {}

    public enum Action: Equatable, Sendable {
        /// Ring with the system call screen (CallKit).
        case ringSystem(Call)
        /// I'm already talking: ask whether this caller may join.
        case askToJoin(Call)
        /// Stop ringing / remove the join request for this call.
        case stopRinging(Call)
        /// Open (or switch to) this room in the web view.
        case enterRoom(String)
        /// Tell the person ringing out that it didn't work, and why.
        case outgoingEnded(Call)
        case none
    }

    /// Something rang: a push, or the inbox.
    public mutating func ring(_ call: Call) -> Action {
        guard call.status == .ringing, incoming[call.id] == nil else { return .none }
        incoming[call.id] = call
        return room == nil ? .ringSystem(call) : .askToJoin(call)
    }

    /// I answered (from CallKit or the join prompt). Returns the room to
    /// answer with: my current one (they join me) or nil (theirs).
    public mutating func answering(_ callId: String) -> String? {
        incoming[callId] = nil
        return room
    }

    public mutating func declined(_ callId: String) { incoming[callId] = nil }

    public mutating func calling(_ call: Call) { outgoing[call.id] = call }

    /// A status change from the server for any call I'm part of.
    public mutating func update(_ call: Call) -> Action {
        if let _ = outgoing[call.id] {
            switch call.status {
            case .ringing: return .none
            case .answered:
                outgoing[call.id] = nil
                return call.room == room ? .none : .enterRoom(call.room)
            default:
                outgoing[call.id] = nil
                return .outgoingEnded(call)
            }
        }
        if incoming[call.id] != nil, call.status != .ringing {
            incoming[call.id] = nil
            return .stopRinging(call)
        }
        return .none
    }

    public mutating func entered(_ room: String) { self.room = room }
    public mutating func left() { room = nil }
}
