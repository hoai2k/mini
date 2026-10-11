import Foundation

public struct Account: Codable, Equatable, Sendable {
    public var id: String
    public var handle: String
    public var name: String
    public var phoneLast4: String?
    public var hasVoip: Bool?
}

public struct Person: Codable, Equatable, Sendable {
    public var handle: String
    public var name: String
}

public enum CallStatus: String, Codable, Sendable {
    case ringing, answered, declined, cancelled, missed, ended
    public var isOver: Bool { self != .ringing && self != .answered }
}

public struct Call: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var from: Person
    public var to: Person
    public var room: String
    public var status: CallStatus
    public var created: Double?

    public init(id: String, from: Person, to: Person, room: String, status: CallStatus, created: Double? = nil) {
        self.id = id; self.from = from; self.to = to; self.room = room; self.status = status; self.created = created
    }
}

public struct LookupMatch: Codable, Equatable, Sendable {
    public var handle: String
    public var name: String
    public var query: String
}

/// Events on the app's live connection to the calls server.
public enum InboxEvent: Equatable, Sendable {
    case hello(Account)
    case ring(Call)
    case call(Call)

    public static func decode(_ text: String) -> InboxEvent? {
        struct Raw: Decodable { var t: String; var call: Call?; var account: Account? }
        guard let data = text.data(using: .utf8), let raw = try? JSONDecoder().decode(Raw.self, from: data) else { return nil }
        switch raw.t {
        case "hello": return raw.account.map(InboxEvent.hello)
        case "ring": return raw.call.map(InboxEvent.ring)
        case "call": return raw.call.map(InboxEvent.call)
        default: return nil
        }
    }
}

/// A VoIP push from the server: a call ringing, or one that stopped ringing.
public struct VoipPush: Equatable, Sendable {
    public enum Kind: String, Sendable { case ring, cancel }
    public var kind: Kind
    public var call: Call

    /// Reads PushKit's dictionary payload.
    public static func parse(_ payload: [AnyHashable: Any]) -> VoipPush? {
        var dict: [String: Any] = [:]
        for (k, v) in payload { if let k = k as? String { dict[k] = v } }
        guard let kind = (dict["kind"] as? String).flatMap(Kind.init(rawValue:)),
              let callDict = dict["call"],
              JSONSerialization.isValidJSONObject(callDict),
              let data = try? JSONSerialization.data(withJSONObject: callDict),
              let call = try? JSONDecoder().decode(Call.self, from: data) else { return nil }
        return VoipPush(kind: kind, call: call)
    }
}
