import XCTest
@testable import GamesChatCore

final class IdentityTests: XCTestCase {
    func testHandles() {
        XCTAssertTrue(Handle.isValid("ana_b"))
        XCTAssertTrue(Handle.isValid("@Cy.iPad"))
        XCTAssertEqual(Handle.normalize(" @Cy.iPad "), "cy.ipad")
        XCTAssertFalse(Handle.isValid("bo"))
        XCTAssertFalse(Handle.isValid("_ana"))
        XCTAssertFalse(Handle.isValid("ana b"))
        XCTAssertFalse(Handle.isValid(String(repeating: "a", count: 21)))
    }

    func testPhoneNumbers() {
        XCTAssertEqual(PhoneNumber.normalize("(555) 123-4567"), "+15551234567")
        XCTAssertEqual(PhoneNumber.normalize("1 555 123 4567"), "+15551234567")
        XCTAssertEqual(PhoneNumber.normalize("+44 20 7946 0958"), "+442079460958")
        XCTAssertEqual(PhoneNumber.normalize("0044 20 7946 0958"), "+442079460958")
        XCTAssertEqual(PhoneNumber.normalize("020 7946 0958", defaultCountryCode: "44"), "+442079460958")
        XCTAssertEqual(PhoneNumber.normalize("0912 345 678", defaultCountryCode: "84"), "+84912345678")
        XCTAssertNil(PhoneNumber.normalize("555-1234"))
        XCTAssertNil(PhoneNumber.normalize("1-800-FLOWERS"))
        XCTAssertNil(PhoneNumber.normalize(""))
        XCTAssertEqual(PhoneNumber.countryCode(forRegion: "GB"), "44")
        XCTAssertEqual(PhoneNumber.countryCode(forRegion: nil), "1")
    }

    func testCallTargets() {
        XCTAssertEqual(CallTarget.parse("@bobo"), .handle("bobo"))
        XCTAssertEqual(CallTarget.parse("cy.ipad"), .handle("cy.ipad"))
        XCTAssertEqual(CallTarget.parse("555 123 4567"), .phone("+15551234567"))
        XCTAssertEqual(CallTarget.parse("+33 6 12 34 56 78"), .phone("+33612345678"))
        XCTAssertNil(CallTarget.parse("x"))
        XCTAssertEqual(CallTarget.phone("+15551234567").serverValue, "+15551234567")
    }

    func testRooms() {
        let r = Rooms.newCallRoom()
        XCTAssertTrue(r.hasPrefix("call-"))
        XCTAssertTrue(Rooms.isValid(r))
        XCTAssertFalse(Rooms.isValid("bad room"))
        XCTAssertNotEqual(Rooms.newCallRoom(), Rooms.newCallRoom())
        let base = URL(string: "https://hoai2k.github.io/mini/chat/")!
        XCTAssertEqual(Rooms.webLink(room: "call-abc", base: base).absoluteString, "https://hoai2k.github.io/mini/chat/?room=call-abc")
        let page = Rooms.appPage(room: "call-abc", name: "Ana B", base: base).absoluteString
        XCTAssertEqual(page, "https://hoai2k.github.io/mini/chat/?app=ios&name=Ana%20B&room=call-abc")
    }
}
