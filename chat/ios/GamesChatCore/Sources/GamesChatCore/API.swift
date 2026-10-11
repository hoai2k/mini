import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct APIError: Error, Equatable, LocalizedError, Sendable {
    public var code: String
    public var status: Int
    public init(code: String, status: Int) { self.code = code; self.status = status }

    public var errorDescription: String? {
        switch code {
        case "handle_taken": return "That username is taken."
        case "bad_handle": return "Usernames are 3 to 20 letters, numbers, dots or underscores."
        case "bad_name": return "Please enter a name."
        case "bad_phone": return "That doesn't look like a phone number."
        case "wrong_code", "bad_code": return "That code isn't right."
        case "sms_not_configured": return "Phone numbers aren't set up on this server yet. Use usernames for now."
        case "not_found": return "Nobody with the app has that username or number."
        case "rate_limited": return "Too many tries. Please wait a bit."
        case "unauthorized": return "You're signed out. Please sign in again."
        case "cannot_call_self": return "That's you!"
        case "offline": return "Can't reach the server. Check your connection."
        default: return "Something went wrong (\(code))."
        }
    }
}

/// The calls server's HTTP API (see chat/ios/server/src/index.js).
public final class CallsAPI: @unchecked Sendable {
    public let base: URL
    public var token: String?
    private let session: URLSession

    public init(base: URL, token: String? = nil, session: URLSession = .shared) {
        self.base = base; self.token = token; self.session = session
    }

    struct AccountReply: Decodable { var account: Account; var token: String? }
    struct CallReply: Decodable { var call: Call; var delivered: String? }
    struct LookupReply: Decodable { var found: [LookupMatch] }
    struct ErrorReply: Decodable { var error: String }

    func request<T: Decodable>(_ method: String, _ path: String, _ body: [String: Any]? = nil) async throws -> T {
        var req = URLRequest(url: base.appendingPathComponent(path))
        req.httpMethod = method
        req.timeoutInterval = 20
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body { req.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let data: Data, response: URLResponse
        do { (data, response) = try await session.data(for: req) } catch { throw APIError(code: "offline", status: 0) }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let code = (try? JSONDecoder().decode(ErrorReply.self, from: data))?.error ?? "http_\(status)"
            throw APIError(code: code, status: status)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    public func createAccount(handle: String, name: String) async throws -> (Account, String) {
        let r: AccountReply = try await request("POST", "v1/accounts", ["handle": Handle.normalize(handle), "name": name])
        guard let t = r.token else { throw APIError(code: "no_token", status: 200) }
        token = t
        return (r.account, t)
    }

    public func me() async throws -> Account {
        let r: AccountReply = try await request("GET", "v1/me")
        return r.account
    }

    public func update(name: String? = nil, handle: String? = nil) async throws -> Account {
        var body: [String: Any] = [:]
        if let name { body["name"] = name }
        if let handle { body["handle"] = Handle.normalize(handle) }
        let r: AccountReply = try await request("PATCH", "v1/me", body)
        return r.account
    }

    /// Registers this device's PushKit token so calls ring it. `sandbox` is
    /// true for builds run from Xcode (development push environment).
    public func setVoipToken(_ hex: String?, sandbox: Bool) async throws {
        let _: AccountReply = try await request("PATCH", "v1/me", ["voipToken": hex as Any? ?? NSNull(), "sandbox": sandbox])
    }

    /// What Apple said when the server rang this device (a setup check).
    public struct RingTest: Decodable, Sendable {
        public var ok: Bool
        public var status: Int?
        public var reason: String?
        public var error: String?
        public var sandbox: Bool?

        public var summary: String {
            if ok { return "Apple accepted the push: your phone should be ringing." }
            if let error {
                switch error {
                case "apns_not_configured": return "The calls server has no Apple push key yet (APNS_* secrets)."
                case "no_device_token": return "This device hasn't registered for calls yet. Reopen the app and try again."
                default: return "The push didn't go out: \(error)."
                }
            }
            return "Apple refused the push (\(status ?? 0)\(reason.map { ", \($0)" } ?? ""))."
        }
    }

    public func testRing() async throws -> RingTest {
        try await request("POST", "v1/me/test-ring", [:])
    }

    public func deleteAccount() async throws {
        struct Ok: Decodable { var ok: Bool }
        let _: Ok = try await request("DELETE", "v1/me")
    }

    public func startPhoneVerification(_ phone: String) async throws {
        struct Ok: Decodable { var ok: Bool }
        let _: Ok = try await request("POST", "v1/me/phone/start", ["phone": phone])
    }

    public func checkPhone(_ phone: String, code: String) async throws -> Account {
        let r: AccountReply = try await request("POST", "v1/me/phone/check", ["phone": phone, "code": code])
        return r.account
    }

    public func removePhone() async throws {
        struct Ok: Decodable { var ok: Bool }
        let _: Ok = try await request("DELETE", "v1/me/phone")
    }

    public func lookup(handles: [String] = [], phones: [String] = []) async throws -> [LookupMatch] {
        let r: LookupReply = try await request("POST", "v1/lookup", ["handles": handles, "phones": phones])
        return r.found
    }

    public func call(_ target: CallTarget, room: String) async throws -> Call {
        let r: CallReply = try await request("POST", "v1/calls", ["to": target.serverValue, "room": room])
        return r.call
    }

    public func status(of callId: String) async throws -> Call {
        let r: CallReply = try await request("GET", "v1/calls/\(callId)")
        return r.call
    }

    /// Answers a call. Passing `joinRoom` (the room I'm already in) brings the
    /// caller into my current call instead of starting a new one.
    public func answer(_ callId: String, joinRoom: String? = nil) async throws -> Call {
        var body: [String: Any] = [:]
        if let joinRoom { body["room"] = joinRoom }
        let r: CallReply = try await request("POST", "v1/calls/\(callId)/answer", body)
        return r.call
    }

    public func decline(_ callId: String) async throws {
        let _: CallReply = try await request("POST", "v1/calls/\(callId)/decline", [:])
    }

    public func cancel(_ callId: String) async throws {
        let _: CallReply = try await request("POST", "v1/calls/\(callId)/cancel", [:])
    }

    public func inboxURL() -> URL? {
        guard let token, var c = URLComponents(url: base.appendingPathComponent("v1/inbox"), resolvingAgainstBaseURL: false) else { return nil }
        c.scheme = c.scheme == "http" ? "ws" : "wss"
        c.queryItems = [URLQueryItem(name: "token", value: token)]
        return c.url
    }
}
