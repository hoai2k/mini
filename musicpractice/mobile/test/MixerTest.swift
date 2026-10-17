// Tests for the iOS app's native mixer (PracticeMixer.swift): the same as
// MixerTest.java, with the clicks, loops and web references from
// fixtures.mjs. run.sh swift compiles and runs it (a Swift toolchain on any
// computer will do: the mixer uses Foundation only).
import Foundation

let SR = 48000.0
var failures = 0
let dir = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "local/musicpractice-mixer")
var clickSets: [String: [[Float]]] = [:]
var voices: [String: PracticeMixer.Voice] = [:]
var refs: [[String]] = []

func check(_ ok: Bool, _ what: String) {
    print((ok ? "  ok   " : "  FAIL ") + what)
    if !ok { failures += 1 }
}

func f32(_ name: String) -> [Float] {
    let data = try! Data(contentsOf: dir.appendingPathComponent(name))
    return data.withUnsafeBytes { Array($0.bindMemory(to: Float.self)) }
}

func load() {
    var voiceId: String?
    var spec: [Double] = []
    var loops: [PracticeMixer.Loop] = []
    func finish() {
        if let id = voiceId { voices[id] = PracticeMixer.Voice(level: spec[0], wet: spec[1], lowpass: spec[2], maxShift: spec[3], loops: loops) }
    }
    let text = try! String(contentsOf: dir.appendingPathComponent("index.txt"), encoding: .utf8)
    for line in text.split(separator: "\n") {
        let p = line.split(separator: " ").map(String.init)
        switch p[0] {
        case "click": clickSets[p[1]] = [f32(p[2]), f32(p[3]), f32(p[4])]
        case "voice":
            finish()
            voiceId = p[1]
            spec = p[2...5].map { Double($0)! }
            loops = []
        case "loop": loops.append(PracticeMixer.Loop(hz: Double(p[1])!, sampleRate: Double(p[2])!, channels: Int(p[3])!, data: f32(p[4])))
        case "ref": refs.append(p)
        default: break
        }
    }
    finish()
}

func mixer() -> PracticeMixer {
    let m = PracticeMixer(sampleRate: SR)
    let c = clickSets["wood"]!
    m.setClicks(weak: c[0], mid: c[1], strong: c[2], sampleRate: SR)
    for (id, v) in voices { m.loadVoice(id, v) }
    return m
}

/// Render `sec` seconds in buffers of 480 frames.
func render(_ m: PracticeMixer, _ sec: Double) -> ([Float], [Float]) {
    let n = Int(sec * SR), block = 480
    var l = [Float](repeating: 0, count: n), r = [Float](repeating: 0, count: n)
    var bl = [Float](repeating: 0, count: block), br = [Float](repeating: 0, count: block)
    var i = 0
    while i < n {
        let k = min(block, n - i)
        bl.withUnsafeMutableBufferPointer { a in
            br.withUnsafeMutableBufferPointer { b in m.render(left: a.baseAddress!, right: b.baseAddress!, frames: k) }
        }
        for j in 0..<k {
            l[i + j] = bl[j]
            r[i + j] = br[j]
        }
        i += k
    }
    return (l, r)
}

/// Frames where a click starts (after 20 ms of silence).
func onsets(_ x: [Float]) -> [Int] {
    var out: [Int] = []
    var quiet = 0
    for i in 0..<x.count {
        if abs(x[i]) > 1e-4 {
            if Double(quiet) > 0.02 * SR || (out.isEmpty && quiet == i) { out.append(i) }
            quiet = 0
        } else {
            quiet += 1
        }
    }
    return out
}

func firstSound(_ c: [Float]) -> Int { c.firstIndex { abs($0) > 1e-4 } ?? 0 }

func rms(_ x: [Float], _ from: Int, _ to: Int) -> Double {
    var s = 0.0
    for i in from..<to { s += Double(x[i]) * Double(x[i]) }
    return sqrt(s / Double(to - from))
}

func ref(_ voice: String, _ midi: Int, _ fifth: Bool, _ mix: String) -> ([Float], [Float]) {
    let r = refs.first { $0[1] == voice && Int($0[2]) == midi && $0[3] == (fifth ? "1" : "0") && $0[4] == mix }!
    return (f32(r[5]), f32(r[6]))
}

func metronomeTiming() {
    print("metronome: beats land on the sample, strong on 1")
    let m = mixer()
    m.metronomeStart(bpm: 120, strengths: [2, 0, 0, 0], volume: 0.8)
    let c = m.metronomeClock()
    check(abs(c.nextBeat - 0.05 * SR) < 1e-6 && c.count == 0 && c.period == 0.5, "the first beat is 50 ms in, 0.5 s per beat")
    let l = render(m, 4.2).0
    let on = onsets(l)
    let lead = firstSound(clickSets["wood"]![2])
    let exact = on.count == 9 && on.enumerated().allSatisfy { abs($0.element - (2400 + $0.offset * 24000 + lead)) <= 1 }
    check(exact, "9 beats in 4.2 s, each within a sample of its time (\(on.count) found)")
    let strong = clickSets["wood"]![2], weak = clickSets["wood"]![0]
    var e1 = 0.0, e2 = 0.0
    for i in 0..<2000 {
        e1 = max(e1, abs(Double(l[2400 + i]) - 0.8 * Double(strong[i])))
        e2 = max(e2, abs(Double(l[2400 + 24000 + i]) - 0.8 * Double(weak[i])))
    }
    check(e1 < 1e-3 && e2 < 1e-3, "beat 1 is the strong click, beat 2 the weak one, at volume 0.8")
    m.metronomeStop()
    let after = render(m, 1).0
    check(after[480...].allSatisfy { $0 == 0 } && m.idle, "Stop silences it within a buffer and the mixer goes idle")
}

func metronomeTempoChange() {
    print("metronome: a new tempo counts from the next beat; the bar changes")
    let m = mixer()
    m.metronomeStart(bpm: 120, strengths: [2, 0, 0], volume: 1)
    _ = render(m, 1.0)
    m.metronomeUpdate(bpm: 60, strengths: [2, 0], volume: 1)
    let c = m.metronomeClock()
    check(abs(c.nextBeat - 1.05 * SR) < 1e-6 && c.count == 2 && c.beat == 0, "the next beat keeps its time; its place wraps into the new bar")
    let on = onsets(render(m, 3.0).0)
    let first = Int(0.05 * SR) + firstSound(clickSets["wood"]![2])
    check(on.count == 3 && abs(on[0] - first) <= 1 && abs(on[1] - on[0] - 48000) <= 1, "then one beat a second (\(on))")
}

func droneLevels() {
    print("drone: as loud as the web drone, with as much hall")
    let from = Int(5 * SR), to = Int(12 * SR)
    var worst = 0.0
    for r in refs where r[4] == "full" {
        let voice = r[1], midi = Int(r[2])!, fifth = r[3] == "1"
        let m = mixer()
        m.testNoWet = true
        m.droneVolume(0.8)
        m.dronePlay(voice: voice, midi: midi, a4: 440, fifth: fifth)
        let n = render(m, 12)
        let w = ref(voice, midi, fifth, "dry")
        let db = 20 * log10((rms(n.0, from, to) + rms(n.1, from, to)) / (rms(w.0, from, to) + rms(w.1, from, to)))
        worst = max(worst, abs(db))
    }
    check(worst < 1, String(format: "the dry sound of every voice within 1 dB of the web drone (worst %.1f dB)", worst))
    var web: [String: (Double, Double)] = [:]
    let text = try! String(contentsOf: dir.appendingPathComponent("webhall.txt"), encoding: .utf8)
    for line in text.split(separator: "\n") {
        let p = line.split(separator: " ").map(String.init)
        web["\(p[0]) \(p[1])"] = (Double(p[2])!, Double(p[3])!)
    }
    let start = Int(5 * SR)
    for voice in ["cello", "organ", "organ-synth"] {
        var sum = 0.0
        for midi in 36...59 {
            var r = [0.0, 0.0]
            for k in 0..<2 {
                let m = mixer()
                m.testNoWet = k == 0
                m.testNoDry = k == 1
                m.droneVolume(0.8)
                m.dronePlay(voice: voice, midi: midi, a4: 440, fifth: false)
                let n = render(m, 9)
                r[k] = rms(n.0, start, n.0.count) + rms(n.1, start, n.1.count)
            }
            let w = web["\(voice) \(midi)"]!
            sum += 20 * log10(r[1] / r[0]) - 20 * log10(w.1 / w.0)
        }
        check(abs(sum / 24) < 1.5, String(format: "%@: the hall against the dry sound, over all 24 notes, within 1.5 dB of the web's (%+.1f dB)", voice, sum / 24))
    }
}

func droneSeamless() {
    print("drone: no clicks where the loops wrap")
    for voice in ["cello", "organ", "organ-synth"] {
        let m = mixer()
        m.testNoWet = true
        m.dronePlay(voice: voice, midi: 43, a4: 440, fifth: false)
        let l = render(m, 40).0
        let from = Int(6 * SR)
        var mx = 0.0, sum = 0.0
        for i in (from + 2)..<l.count {
            let d = abs(Double(l[i]) - 2 * Double(l[i - 1]) + Double(l[i - 2]))
            mx = max(mx, d)
            sum += d
        }
        let mean = sum / Double(l.count - from - 2)
        check(mx < 12 * mean, String(format: "%@: the sharpest moment is %.1fx the typical (under 12x)", voice, mx / mean))
    }
}

func droneSchedule() {
    print("drone: a timed sequence moves on, then stops, by itself")
    let m = mixer()
    m.dronePlay(voice: "cello", midi: 48, a4: 440, fifth: false)
    m.droneSchedule(first: 1, interval: 2, notes: [50, 52], stopAtEnd: true)
    _ = render(m, 1.2)
    var s = m.droneState()
    check(s.midi == 50 && s.changes == 1 && abs(s.remaining - 1.8) < 0.02, "after 1 s: D3, one change, 1.8 s to the next")
    _ = render(m, 2)
    s = m.droneState()
    check(s.midi == 52 && s.changes == 2 && s.playing, "after 3 s: E3")
    _ = render(m, 2)
    s = m.droneState()
    check(!s.playing && s.stoppedByTimer, "after 5 s: stopped by its timer")
    _ = render(m, 9)
    check(m.idle, "faded out and the hall has rung out within 9 s")
    m.dronePlay(voice: "cello", midi: 48, a4: 440, fifth: false)
    m.droneSchedule(first: 1, interval: 1, notes: [], stopAtEnd: true)
    _ = render(m, 0.4)
    m.droneStop()
    _ = render(m, 2)
    check(abs(m.droneState().remaining - 0.6) < 0.02, "a stopped drone doesn't count down, and says how long was left")
    m.dronePlay(voice: "cello", midi: 48, a4: 440, fifth: false)
    _ = render(m, 2)
    check(m.droneState().playing, "stopping cleared the schedule: playing again runs untimed")
}

func droneStopQuick() {
    print("drone: pausing stops at once (the long fades are for starting and changing note)")
    let m = mixer()
    m.dronePlay(voice: "cello", midi: 48, a4: 440, fifth: true)
    let on = render(m, 3)
    let playing = rms(on.0, Int(2 * SR), Int(3 * SR))
    m.droneStop()
    let off = render(m, 0.5)
    let after = rms(off.0, Int(0.1 * SR), Int(0.5 * SR))
    check(after < playing * 0.01, "100 ms after Stop, sound and hall are down \(Int(20 * log10(after / playing))) dB (more than 40)")
    _ = render(m, 0.5)
    check(m.idle, "and the mixer is idle within a second")
}

func droneSameNote() {
    print("drone: the same note again doesn't restart it; a new one crossfades")
    let m = mixer()
    m.dronePlay(voice: "organ", midi: 50, a4: 440, fifth: false)
    _ = render(m, 1)
    m.dronePlay(voice: "organ", midi: 50, a4: 440, fifth: false)
    check(m.layerCount == 1, "same note: one sound")
    m.dronePlay(voice: "organ", midi: 52, a4: 440, fifth: false)
    check(m.layerCount == 2, "new note: the old fades out while the new fades in")
    _ = render(m, 6)
    check(m.layerCount == 1, "and the old one is gone after its fade")
}

func speed() {
    print("speed")
    let m = mixer()
    m.metronomeStart(bpm: 200, strengths: [2, 0, 0, 0], volume: 1)
    m.dronePlay(voice: "cello", midi: 40, a4: 440, fifth: true)
    let t = Date()
    _ = render(m, 60)
    let sec = Date().timeIntervalSince(t)
    check(sec < 6, String(format: "a minute of drone (with fifth) and metronome renders in %.2f s", sec))
}

/// The Java and Swift mixers make the same sound.
func sameAsJava() {
    let java = dir.appendingPathComponent("java-render.f32")
    guard FileManager.default.fileExists(atPath: java.path) else { return }
    print("the same as the Android mixer")
    let m = mixer()
    m.metronomeStart(bpm: 132, strengths: [2, 0, 1, 0], volume: 0.7)
    m.dronePlay(voice: "cello-soft", midi: 41, a4: 442, fifth: true)
    let l = render(m, 6).0
    let j = f32("java-render.f32")
    var diff = 0.0
    for i in 0..<min(l.count, j.count) { diff = max(diff, abs(Double(l[i] - j[i]))) }
    check(j.count == l.count && diff < 1e-4, String(format: "6 s of drone and metronome match sample for sample (largest difference %.1e)", diff))
}

load()
metronomeTiming()
metronomeTempoChange()
droneLevels()
droneSeamless()
droneSchedule()
droneStopQuick()
droneSameNote()
speed()
sameAsJava()
print(failures == 0 ? "ALL PASSED" : "\(failures) FAILED")
exit(failures == 0 ? 0 : 1)
