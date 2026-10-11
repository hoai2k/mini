import Foundation

/// Usernames: 3 to 20 characters, lower-case letters, digits, "_" and ".",
/// starting with a letter or digit (the server checks the same rule).
public enum Handle {
    public static func normalize(_ raw: String) -> String {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if s.hasPrefix("@") { s.removeFirst() }
        return s
    }

    public static func isValid(_ raw: String) -> Bool {
        let s = normalize(raw)
        guard (3...20).contains(s.count), let first = s.unicodeScalars.first else { return false }
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789_.")
        let start = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789")
        return start.contains(first) && s.unicodeScalars.allSatisfy { allowed.contains($0) }
    }
}

/// Phone numbers in E.164 form ("+15551234567"), which is how the server
/// stores and matches them.
public enum PhoneNumber {
    /// Turns what someone typed or what Contacts holds into E.164, using the
    /// device's country calling code for numbers written without one.
    /// Returns nil when it can't be a phone number.
    public static func normalize(_ raw: String, defaultCountryCode: String = "1") -> String? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        // Letters mean it isn't a number (vanity numbers aren't supported).
        if trimmed.unicodeScalars.contains(where: { CharacterSet.letters.contains($0) }) { return nil }
        let digits = trimmed.filter(\.isNumber).map(String.init).joined()
        let cc = defaultCountryCode.filter(\.isNumber)
        var e164: String
        if trimmed.hasPrefix("+") {
            e164 = digits
        } else if digits.hasPrefix("00") {
            e164 = String(digits.dropFirst(2))
        } else if cc == "1" {
            // North America: 10 digits, or 11 starting with the 1.
            if digits.count == 10 { e164 = "1" + digits }
            else if digits.count == 11, digits.hasPrefix("1") { e164 = digits }
            else { return nil }
        } else if digits.hasPrefix("0") {
            // Most other countries dial a leading 0 at home.
            e164 = cc + digits.dropFirst()
        } else {
            e164 = cc + digits
        }
        guard (8...15).contains(e164.count), e164.first != "0" else { return nil }
        return "+" + e164
    }

    /// The calling code for a region ("US" -> "1"), for the common ones; the
    /// app passes Locale's region. Unknown regions fall back to "1".
    public static func countryCode(forRegion region: String?) -> String {
        let codes: [String: String] = [
            "US": "1", "CA": "1", "GB": "44", "IE": "353", "AU": "61", "NZ": "64", "FR": "33", "DE": "49",
            "NL": "31", "BE": "32", "ES": "34", "IT": "39", "PT": "351", "CH": "41", "AT": "43", "SE": "46",
            "NO": "47", "DK": "45", "FI": "358", "PL": "48", "JP": "81", "KR": "82", "CN": "86", "HK": "852",
            "TW": "886", "SG": "65", "IN": "91", "VN": "84", "TH": "66", "PH": "63", "MY": "60", "ID": "62",
            "MX": "52", "BR": "55", "AR": "54", "ZA": "27", "IL": "972", "AE": "971",
        ]
        return codes[(region ?? "US").uppercased()] ?? "1"
    }
}

/// What someone typed in the call box: a username or a phone number.
public enum CallTarget: Equatable, Sendable {
    case handle(String)
    case phone(String)

    public static func parse(_ raw: String, defaultCountryCode: String = "1") -> CallTarget? {
        let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.hasPrefix("@") || t.contains(where: \.isLetter) {
            return Handle.isValid(t) ? .handle(Handle.normalize(t)) : nil
        }
        if let p = PhoneNumber.normalize(t, defaultCountryCode: defaultCountryCode) { return .phone(p) }
        return Handle.isValid(t) ? .handle(Handle.normalize(t)) : nil
    }

    /// The `to` the server expects.
    public var serverValue: String {
        switch self {
        case .handle(let h): return h
        case .phone(let p): return p
        }
    }
}

/// Room names for calls, and the web links that open them.
public enum Rooms {
    public static func newCallRoom() -> String {
        let chars = Array("abcdefghijkmnpqrstuvwxyz23456789")
        return "call-" + String((0..<12).map { _ in chars.randomElement()! })
    }

    public static func isValid(_ room: String) -> Bool {
        let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-")
        return (6...64).contains(room.count) && room.unicodeScalars.allSatisfy { allowed.contains($0) }
    }

    /// The page anyone can open in a browser to join this room.
    public static func webLink(room: String, base: URL) -> URL {
        var c = URLComponents(url: base, resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "room", value: room)]
        return c.url!
    }

    /// The page the app loads for a call: the web app, told it runs inside
    /// the iOS app, joining `room` straight away as `name`.
    public static func appPage(room: String?, name: String, base: URL) -> URL {
        var c = URLComponents(url: base, resolvingAgainstBaseURL: false)!
        var items = [URLQueryItem(name: "app", value: "ios"), URLQueryItem(name: "name", value: name)]
        if let room { items.append(URLQueryItem(name: "room", value: room)) }
        c.queryItems = items
        return c.url!
    }
}
