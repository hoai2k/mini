import XCTest
@testable import GamesChatCore

final class CallLogicTests: XCTestCase {
    let ana = Person(handle: "ana_b", name: "Ana")
    let bo = Person(handle: "bobo", name: "Bo")
    let cy = Person(handle: "cy.ipad", name: "Cy")

    func call(_ id: String, _ from: Person, _ to: Person, room: String, _ status: CallStatus = .ringing) -> Call {
        Call(id: id, from: from, to: to, room: room, status: status)
    }

    func testIdleRingsTheSystemAndAnswersIntoTheirRoom() {
        var logic = CallLogic()
        let c = call("1", ana, bo, room: "call-ana")
        XCTAssertEqual(logic.ring(c), .ringSystem(c))
        XCTAssertEqual(logic.ring(c), .none, "a second delivery (push and inbox) rings once")
        XCTAssertNil(logic.answering("1"), "not in a call: answer into the caller's room")
    }

    func testInACallAThirdCallerAsksToJoinMyRoom() {
        var logic = CallLogic()
        logic.entered("call-ana")
        let c = call("2", cy, bo, room: "call-cy")
        XCTAssertEqual(logic.ring(c), .askToJoin(c))
        XCTAssertEqual(logic.answering("2"), "call-ana", "Cy is brought into the current call")
    }

    func testCallerStopsRingingWhenCancelled() {
        var logic = CallLogic()
        let c = call("3", ana, bo, room: "call-ana")
        _ = logic.ring(c)
        var gone = c; gone.status = .cancelled
        XCTAssertEqual(logic.update(gone), .stopRinging(gone))
        XCTAssertEqual(logic.update(gone), .none)
    }

    func testOutgoingAnsweredEntersTheRoomTheyChose() {
        var logic = CallLogic()
        let c = call("4", cy, bo, room: "call-cy")
        logic.calling(c)
        logic.entered("call-cy")
        var ans = c; ans.status = .answered; ans.room = "call-ana"
        XCTAssertEqual(logic.update(ans), .enterRoom("call-ana"), "Bo was busy, so Cy joins Bo's call")
        let d = call("5", cy, ana, room: "call-cy")
        logic.calling(d)
        var dec = d; dec.status = .declined
        XCTAssertEqual(logic.update(dec), .outgoingEnded(dec))
    }

    func testPushPayloads() {
        let payload: [AnyHashable: Any] = ["aps": [:], "kind": "ring", "call": [
            "id": "9", "from": ["handle": "ana_b", "name": "Ana"], "to": ["handle": "bobo", "name": "Bo"],
            "room": "call-ana", "status": "ringing", "created": 1700000000000.0,
        ]]
        let push = VoipPush.parse(payload)
        XCTAssertEqual(push?.kind, .ring)
        XCTAssertEqual(push?.call.from.name, "Ana")
        XCTAssertNil(VoipPush.parse(["kind": "ring"]))
        XCTAssertNil(VoipPush.parse(["kind": "bogus", "call": [:]]))
    }

    func testInboxEvents() {
        let ring = InboxEvent.decode(#"{"t":"ring","call":{"id":"1","from":{"handle":"a_a","name":"A"},"to":{"handle":"b_b","name":"B"},"room":"call-xyz","status":"ringing"}}"#)
        if case .ring(let c)? = ring { XCTAssertEqual(c.room, "call-xyz") } else { XCTFail("ring") }
        XCTAssertNil(InboxEvent.decode("pong"))
        XCTAssertNil(InboxEvent.decode(#"{"t":"other"}"#))
    }
}
