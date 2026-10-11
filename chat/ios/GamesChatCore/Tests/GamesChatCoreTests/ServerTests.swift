import XCTest
@testable import GamesChatCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Runs the Swift client against a real calls server when CALLS_URL is set
/// (for example `npx wrangler dev --var DEV_CODE:424242` in chat/ios/server).
final class ServerTests: XCTestCase {
    func testAccountsPhoneAndCalls() async throws {
        guard let raw = ProcessInfo.processInfo.environment["CALLS_URL"], let base = URL(string: raw) else {
            throw XCTSkip("set CALLS_URL to run against a calls server")
        }
        let tag = String(Int.random(in: 100000...999999))
        let ana = CallsAPI(base: base), bo = CallsAPI(base: base)
        _ = try await ana.createAccount(handle: "ana\(tag)", name: "Ana")
        let (boAcct, _) = try await bo.createAccount(handle: "bo\(tag)", name: "Bo")
        XCTAssertEqual(boAcct.handle, "bo\(tag)")
        do { _ = try await CallsAPI(base: base).createAccount(handle: "ana\(tag)", name: "X"); XCTFail("taken") }
        catch let e as APIError { XCTAssertEqual(e.code, "handle_taken") }
        let phone = "+1555\(tag)9"
        try await bo.startPhoneVerification(phone)
        let linked = try await bo.checkPhone(phone, code: "424242")
        XCTAssertEqual(linked.phoneLast4, String(phone.suffix(4)))
        let found = try await ana.lookup(phones: [phone])
        XCTAssertEqual(found.first?.handle, "bo\(tag)")
        let call = try await ana.call(.phone(phone), room: Rooms.newCallRoom())
        XCTAssertEqual(call.status, .ringing)
        XCTAssertEqual(call.to.name, "Bo")
        let answered = try await bo.answer(call.id, joinRoom: "call-borooms1")
        XCTAssertEqual(answered.room, "call-borooms1")
        let seen = try await ana.status(of: call.id)
        XCTAssertEqual(seen.status, .answered)
        try await bo.deleteAccount()
        do { _ = try await bo.me(); XCTFail("deleted") } catch let e as APIError { XCTAssertEqual(e.status, 401) }
    }
}
