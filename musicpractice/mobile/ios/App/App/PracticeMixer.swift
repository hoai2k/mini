import Foundation

/// The metronome and the drone in the app, mixed in native code so they keep
/// playing with the screen locked (the web view's JavaScript pauses then).
///
/// A port of app/src/metronome.js and the recorded-voice path of
/// app/src/drone.js: the same clicks (rendered by the web code and handed
/// over), the same seamless loops retuned by playback rate, fades, fifth,
/// lowpass and levels, and timed drones that move through a sequence by
/// themselves. A Freeverb hall stands in for the web's convolution reverb,
/// set to match its level.
///
/// Foundation only, so it is tested on any computer (mobile/test/). The
/// Android app has the same mixer in Java (PracticeMixer.java); change both
/// together.
final class PracticeMixer {
    static let fadeIn = 0.65 // time constants, as drone.js: about 2 s in
    static let fadeOut = 0.45 // and 1.5 s out when moving to a new note
    static let pauseFade = 0.012 // pausing: gone in about 50 ms, sound and hall
    // Measured against the web drone over all 24 notes (mobile/test/): the hall's level
    // and the web compressor's makeup gain.
    static let verbGain = 0.51
    static let makeup = 1.044
    static let tailSec = 3.5 // the hall rings this long after the last note

    private let lock = NSLock()
    private var sr: Double
    private(set) var frameCount: Int64 = 0 // frames rendered so far

    // For the tests: hear the dry sound or the hall alone.
    var testNoDry = false
    var testNoWet = false

    // MARK: metronome

    private var clicks: [[Float]] = [[], [], [], [], [], [], []] // weak, mid, strong, between the beats, soft (the weak one, quieter), silent (none), the second rhythm's
    /// A soft beat (volume per beat): the weak click this much as loud (metronome.js SOFT_GAIN).
    static let softGain: Float = 0.35
    static let soft = 4, silent = 5 // click kinds past the strengths and between-the-beats (settings.js SOFT, SILENT)
    /// The second rhythm's click: the mid one this much faster and this loud (metronome.js POLY, POLY_RATE, POLY_GAIN).
    static let poly = 6
    static let polyRate = 1.5, polyGain: Float = 0.8
    private var clickSr = 48000.0
    private var metRunning = false
    private var bpm = 120.0
    private var strengths = [2, 0, 0, 0]
    private var metVolume = 0.8, metGain = 0.8
    private var nextBeat = 0.0 // the frame of the next beat (fractional)
    private var beat = 0 // its place in the bar
    private var count: Int64 = 0 // beats since the start
    private var subdivision = 1 // clicks per beat (quarters, eighths, triplets, sixteenths)
    private var lastBeat = 0.0 // the frame of the last beat, which the subdivisions count from
    private var subIndex = 1 // the next subdivision of that beat
    private var lastBeatIndex = 0 // that beat's place in the bar
    private var slots: [Int] = [] // custom strong beats and volume per beat: the click for every position in the bar (empty: the plain rules)
    private var gapPlay = 0, gapSilent = 0 // silent bars: play this many, then this many silent (0: off)
    private var trainerStep = 0.0, trainerEvery = 0, trainerTo = 0.0 // the tempo trainer (every 0: off)
    private var lastMuted = false // the last beat was in a silent bar (its subdivisions too)
    private var polyN = 0 // the second rhythm: clicks across each bar (0: off)
    private var polyStart = 0.0, polyLen = 0.0, polyIndex = Int.max, polyMuted = false // its bar: start and length in frames, the next click
    private var clickKind = [Int](repeating: 0, count: 16)
    private var clickPos = [Double](repeating: 0, count: 16) // in click samples
    private var clicksActive = 0
    private var stopFade = 0 // frames left of a quick fade after Stop
    private var stopFadeLen = 240

    // MARK: drone

    /// A seamless loop of one note: `frames` frames of `channels` interleaved samples, pitch `hz`.
    final class Loop {
        let hz: Double, sampleRate: Double, channels: Int, frames: Int
        let data: [Float]

        init(hz: Double, sampleRate: Double, channels: Int, data: [Float]) {
            self.hz = hz
            self.sampleRate = sampleRate
            self.channels = max(1, channels)
            self.data = data
            frames = data.count / self.channels
        }
    }

    /// A voice: its loops and how drone.js plays them (SAMPLED).
    final class Voice {
        let level: Double, wet: Double, lowpass: Double, maxShift: Double
        let loops: [Loop]

        init(level: Double, wet: Double, lowpass: Double, maxShift: Double, loops: [Loop]) {
            self.level = level
            self.wet = wet
            self.lowpass = lowpass
            self.maxShift = maxShift
            self.loops = loops
        }
    }

    private final class Source {
        let loop: Loop
        var pos: Double, step: Double
        let gain: Double
        var lpL: Biquad?, lpR: Biquad?

        init(loop: Loop, pos: Double, step: Double, gain: Double) {
            self.loop = loop
            self.pos = pos
            self.step = step
            self.gain = gain
        }
    }

    private final class Layer {
        var sources: [Source] = []
        var env = 0.0, target = 1.0, coef = 0.0
    }

    private var voices: [String: Voice] = [:]
    private var layers: [Layer] = []
    private var droneVolumeTarget = 0.8, droneGain = 0.8
    private var wet = 0.14, wetTarget = 0.14, dry = 0.93, dryTarget = 0.93
    private var verb: Freeverb
    private var comp = Compressor()
    private var limiter = Limiter() // last, on everything: as web output.js
    private var tail: Int64 = 0 // frames of reverb tail still to render
    private var hall = 1.0, hallTarget = 1.0 // the hall's ring, cut short by a stop

    private var dronePlayingFlag = false
    private var droneVoice = ""
    private var droneMidi = 48
    private var droneA4 = 440.0
    private var droneFifth = false

    // A timed drone: the next change comes after `untilNext` frames of playing.
    private var timed = false
    private var scheduled = false // a schedule was set (its time left is still reported after a stop)
    private var untilNext = 0.0, interval = 0.0
    private var notes: [Int] = []
    private var noteIndex = 0
    private var stopAtEnd = false
    private var changes = 0 // changes made since the schedule was set
    private var stoppedByTimer = false

    init(sampleRate: Double) {
        sr = sampleRate
        verb = Freeverb(sampleRate: sampleRate)
        comp.setSampleRate(sampleRate)
        limiter.setSampleRate(sampleRate)
        stopFadeLen = max(1, Int(0.005 * sampleRate))
    }

    private func locked<T>(_ f: () -> T) -> T {
        lock.lock()
        defer { lock.unlock() }
        return f()
    }

    var sampleRate: Double { locked { sr } }
    var frame: Int64 { locked { frameCount } }

    /// A new output rate (a new audio route): loops and clicks are retuned, the hall rebuilt.
    func setSampleRate(_ rate: Double) {
        locked {
            let old = sr
            guard rate != old else { return }
            sr = rate
            verb = Freeverb(sampleRate: rate)
            comp.setSampleRate(rate)
            limiter.setSampleRate(rate)
            stopFadeLen = max(1, Int(0.005 * rate))
            nextBeat = Double(frameCount) + (nextBeat - Double(frameCount)) * rate / old
            untilNext = untilNext * rate / old
            interval = interval * rate / old
            for l in layers {
                l.coef = coef(l.target > 0 ? PracticeMixer.fadeIn : PracticeMixer.fadeOut)
                for s in l.sources {
                    s.step = s.step * old / rate
                    s.lpL?.lowpass(s.lpL!.freq, rate)
                    s.lpR?.lowpass(s.lpR!.freq, rate)
                }
            }
        }
    }

    private func coef(_ tau: Double) -> Double {
        1 - exp(-1 / (tau * sr))
    }

    // MARK: metronome API

    /// The clicks (weak, mid, strong, between the beats), rendered by metronome.js at `sampleRate`.
    /// An older page sends no `sub`: the weak click stands in.
    func setClicks(weak: [Float], mid: [Float], strong: [Float], sub: [Float]? = nil, sampleRate: Double) {
        locked {
            let polyCount = Int(Double(mid.count) / PracticeMixer.polyRate)
            let poly = (0..<polyCount).map { Float(PracticeMixer.linear(mid, Double($0) * PracticeMixer.polyRate)) * PracticeMixer.polyGain }
            clicks = [weak, mid, strong, sub ?? weak, weak.map { $0 * PracticeMixer.softGain }, [], poly]
            clickSr = sampleRate
        }
    }

    func metronomeStart(bpm: Double, strengths: [Int], subdivision: Int = 1, slots: [Int] = [], volume: Double) {
        locked {
            update(bpm: bpm, strengths: strengths, subdivision: subdivision, slots: slots, volume: volume)
            metGain = volume
            metRunning = true
            beat = 0
            count = 0
            nextBeat = Double(frameCount) + 0.05 * sr
            subIndex = Int.max // no subdivisions before the first beat
            stopFade = 0
            gapPlay = 0; gapSilent = 0; trainerEvery = 0; polyN = 0 // until metronomeExercise says otherwise
            polyIndex = Int.max
        }
    }

    /// Silent bars (play `gapPlay` bars, then `gapSilent` silent; 0 off) and the tempo
    /// trainer (`trainerStep` beats per minute every `trainerEvery` bars until `trainerTo`; 0 off).
    /// And the second rhythm: `polyN` clicks across each bar, from its first beat (0 off).
    func metronomeExercise(gapPlay: Int, gapSilent: Int, trainerStep: Double, trainerEvery: Int, trainerTo: Double, polyN: Int = 0) {
        locked {
            self.polyN = max(0, min(9, polyN))
            self.gapPlay = max(0, gapPlay)
            self.gapSilent = max(0, gapSilent)
            self.trainerStep = max(0, trainerStep)
            self.trainerEvery = max(0, trainerEvery)
            self.trainerTo = trainerTo
        }
    }

    /// Tempo, bar and volume while running: a new tempo counts from the next beat.
    func metronomeUpdate(bpm: Double, strengths: [Int], subdivision: Int = 1, slots: [Int] = [], volume: Double) {
        locked { update(bpm: bpm, strengths: strengths, subdivision: subdivision, slots: slots, volume: volume) }
    }

    private func update(bpm: Double, strengths: [Int], subdivision: Int, slots: [Int], volume: Double) {
        self.bpm = max(1, bpm)
        self.subdivision = max(1, min(4, subdivision))
        self.slots = slots.map { max(0, min(PracticeMixer.silent, $0)) }
        self.strengths = strengths.isEmpty ? [0] : strengths
        metVolume = volume
        if beat >= self.strengths.count { beat %= self.strengths.count }
    }

    func metronomeStop() {
        locked { stopMetronome() }
    }

    private func stopMetronome() {
        guard metRunning else { return }
        metRunning = false
        stopFade = stopFadeLen
    }

    var metronomeRunning: Bool { locked { metRunning } }

    /// (next beat's frame, its count, its place in the bar, seconds per beat).
    func metronomeClock() -> (nextBeat: Double, count: Int64, beat: Int, period: Double) {
        locked { (nextBeat, count, beat, 60 / bpm) }
    }

    // MARK: drone API

    func loadVoice(_ id: String, _ voice: Voice) {
        locked { voices[id] = voice }
    }

    func hasVoice(_ id: String) -> Bool {
        locked { voices[id] != nil }
    }

    /// Start, or move to a new note or voice (the new one fades in while the old
    /// fades out). The same note again changes nothing. False if the voice isn't loaded.
    @discardableResult
    func dronePlay(voice voiceId: String, midi: Int, a4: Double, fifth: Bool) -> Bool {
        locked {
            guard let v = voices[voiceId] else { return false }
            let same = dronePlayingFlag && voiceId == droneVoice && midi == droneMidi && a4 == droneA4 && fifth == droneFifth
            dronePlayingFlag = true
            stoppedByTimer = false
            hallTarget = 1
            droneVoice = voiceId
            droneA4 = a4
            droneFifth = fifth
            droneMidi = midi
            if !same { sound(v) }
            return true
        }
    }

    /// A timed drone: after `first` seconds of playing, move to notes[0], then to
    /// each next note every `interval` seconds; at the end, stop if `stopAtEnd`.
    /// Seconds count only while playing. first < 0 clears it.
    func droneSchedule(first: Double, interval intervalSec: Double, notes: [Int], stopAtEnd: Bool) {
        locked {
            timed = first >= 0
            scheduled = timed
            untilNext = first * sr
            interval = max(1, intervalSec * sr)
            self.notes = notes
            noteIndex = 0
            self.stopAtEnd = stopAtEnd
            changes = 0
        }
    }

    func droneStop() {
        locked { stopDrone() }
    }

    private func stopDrone() {
        dronePlayingFlag = false
        timed = false
        for l in layers {
            l.target = 0
            l.coef = coef(PracticeMixer.pauseFade)
        }
        hallTarget = 0
    }

    func droneVolume(_ v: Double) {
        locked { droneVolumeTarget = v }
    }

    /// (playing, note, changes since the schedule was set, seconds to the next change or -1, stopped by its timer).
    func droneState() -> (playing: Bool, midi: Int, changes: Int, remaining: Double, stoppedByTimer: Bool) {
        locked { (dronePlayingFlag, droneMidi, changes, scheduled ? max(0, untilNext) / sr : -1, stoppedByTimer) }
    }

    var dronePlaying: Bool { locked { dronePlayingFlag } }

    var layerCount: Int { locked { layers.count } }

    /// Nothing playing or ringing: the output can stop.
    var idle: Bool { locked { !metRunning && clicksActive == 0 && stopFade == 0 && layers.isEmpty && tail <= 0 } }

    /// Stop everything at once (a call, the lock screen's pause).
    func stopAll() {
        locked {
            stopMetronome()
            stopDrone()
        }
    }

    private func fadeOutAll() {
        for l in layers {
            l.target = 0
            l.coef = coef(PracticeMixer.fadeOut)
        }
    }

    /// drone.js nearestLoop: the nearest loop and the pitch to retune it to.
    static func nearest(_ loops: [Loop], _ hz: Double, _ maxShift: Double) -> (Loop, Double) {
        func shift(_ h: Double, _ l: Loop) -> Double { abs(12 * log2(h / l.hz)) }
        func pick(_ h: Double) -> Loop { loops.min { shift(h, $0) < shift(h, $1) }! }
        var best = pick(hz)
        var target = hz
        if shift(hz, best) > maxShift {
            for h in [hz * 2, hz / 2] {
                let l = pick(h)
                if shift(h, l) < shift(target, best) {
                    best = l
                    target = h
                }
            }
        }
        return (best, target)
    }

    private func sound(_ v: Voice) {
        fadeOutAll()
        let f0 = droneA4 * pow(2, Double(droneMidi - 69) / 12)
        let want = droneFifth ? [f0, f0 * 1.5] : [f0]
        let layer = Layer()
        layer.coef = coef(PracticeMixer.fadeIn)
        for (i, hz) in want.enumerated() {
            let (loop, target) = PracticeMixer.nearest(v.loops, hz, v.maxShift)
            // Start somewhere along the loop, as drone.js does.
            let along = (Double(droneMidi) * 0.37 + Double(i) * 1.7).truncatingRemainder(dividingBy: 1) * (Double(loop.frames) / loop.sampleRate) * 0.5
            let s = Source(loop: loop, pos: along * loop.sampleRate, step: (target / loop.hz) * loop.sampleRate / sr,
                           gain: v.level * (i > 0 ? 0.5 : 1) * (want.count > 1 ? 0.85 : 1))
            if v.lowpass > 0 {
                s.lpL = Biquad()
                s.lpR = Biquad()
                s.lpL!.lowpass(v.lowpass, sr)
                s.lpR!.lowpass(v.lowpass, sr)
            }
            layer.sources.append(s)
        }
        layers.append(layer)
        wetTarget = v.wet
        dryTarget = 1 - v.wet * 0.5
    }

    /// The timed drone's clock, once per buffer of `n` frames.
    private func advanceSchedule(_ n: Int) {
        guard dronePlayingFlag, timed else { return }
        untilNext -= Double(n)
        if untilNext > 0 { return }
        if noteIndex < notes.count {
            changes += 1
            droneMidi = notes[noteIndex]
            noteIndex += 1
            untilNext += interval
            if let v = voices[droneVoice] { sound(v) }
        } else if stopAtEnd {
            stoppedByTimer = true
            stopDrone()
        } else {
            timed = false
        }
    }

    // MARK: rendering

    /// Mix `frames` frames into `left` and `right` (overwritten).
    func render(left: UnsafeMutablePointer<Float>, right: UnsafeMutablePointer<Float>, frames: Int) {
        lock.lock()
        defer { lock.unlock() }
        advanceSchedule(frames)
        let metCoef = coef(0.02), volCoef = coef(0.05), mixCoef = coef(0.5), hallCoef = coef(PracticeMixer.pauseFade)
        let clickStep = clickSr / sr
        let droneOn = !layers.isEmpty || tail > 0
        let dg = testNoDry ? 0.0 : 1.0, wg = testNoWet ? 0.0 : PracticeMixer.verbGain
        for f in 0..<frames {
            var l = 0.0, r = 0.0

            // Metronome: start a click on each beat, then play the clicks sounding.
            let now = Double(frameCount) + Double(f)
            if metRunning && now >= nextBeat {
                let bar = Int64(strengths.count)
                // The trainer moves the tempo at the start of every `trainerEvery` bars.
                if trainerEvery > 0 && trainerStep > 0 && count > 0 && count % (bar * Int64(trainerEvery)) == 0 {
                    bpm = bpm < trainerTo ? min(trainerTo, bpm + trainerStep) : bpm > trainerTo ? max(trainerTo, bpm - trainerStep) : bpm
                }
                lastMuted = gapSilent > 0 && (count / bar) % Int64(gapPlay + gapSilent) >= Int64(gapPlay)
                let strength = max(0, min(2, strengths[beat % strengths.count]))
                if !lastMuted {
                    startClick(slots.isEmpty ? strength : slots[(beat * subdivision) % slots.count], (now - nextBeat) * clickStep)
                }
                // The second rhythm divides the bar from its first beat.
                if beat == 0 {
                    polyStart = nextBeat
                    polyLen = Double(strengths.count) * 60 / bpm * sr
                    polyIndex = 0
                    polyMuted = lastMuted
                }
                lastBeat = nextBeat
                lastBeatIndex = beat
                subIndex = 1
                nextBeat += 60 / bpm * sr
                beat = (beat + 1) % strengths.count
                count += 1
            }
            // The clicks between the beats, evenly spaced from the last one.
            if metRunning && subIndex < subdivision {
                let at = lastBeat + Double(subIndex) * (60 / bpm * sr) / Double(subdivision)
                if now >= at {
                    let k = lastBeatIndex * subdivision + subIndex
                    if !lastMuted { startClick(slots.isEmpty ? 3 : slots[k % slots.count], (now - at) * clickStep) }
                    subIndex += 1
                }
            }
            if metRunning && polyN > 0 && polyIndex < polyN {
                let at = polyStart + Double(polyIndex) * polyLen / Double(polyN)
                if now >= at {
                    if !polyMuted { startClick(PracticeMixer.poly, (now - at) * clickStep) }
                    polyIndex += 1
                }
            }
            metGain += (metVolume - metGain) * metCoef
            if clicksActive > 0 {
                var c = 0.0
                for i in 0..<clicksActive {
                    c += PracticeMixer.linear(clicks[clickKind[i]], clickPos[i])
                    clickPos[i] += clickStep
                }
                var i = clicksActive - 1
                while i >= 0 {
                    if clickPos[i] >= Double(clicks[clickKind[i]].count) {
                        clicksActive -= 1
                        clickKind[i] = clickKind[clicksActive]
                        clickPos[i] = clickPos[clicksActive]
                    }
                    i -= 1
                }
                var fade = 1.0
                if stopFade > 0 {
                    fade = Double(stopFade) / Double(stopFadeLen)
                    stopFade -= 1
                    if stopFade == 0 { clicksActive = 0 }
                }
                c *= metGain * fade
                l += c
                r += c
            } else if stopFade > 0 {
                stopFade = 0
            }

            // Drone: the sounding notes into the bus, then dry + hall.
            if droneOn {
                var bl = 0.0, br = 0.0
                for layer in layers {
                    layer.env += (layer.target - layer.env) * layer.coef
                    let e = layer.env
                    for s in layer.sources {
                        let loop = s.loop
                        var sl = PracticeMixer.hermite(loop, 0, s.pos)
                        var sR = loop.channels > 1 ? PracticeMixer.hermite(loop, 1, s.pos) : sl
                        if let lpL = s.lpL, let lpR = s.lpR {
                            sl = lpL.process(sl)
                            sR = lpR.process(sR)
                        }
                        bl += sl * s.gain * e
                        br += sR * s.gain * e
                        s.pos += s.step
                        if s.pos >= Double(loop.frames) { s.pos -= Double(loop.frames) }
                    }
                }
                wet += (wetTarget - wet) * mixCoef
                dry += (dryTarget - dry) * mixCoef
                hall += (hallTarget - hall) * hallCoef
                let (vl, vr) = verb.process(bl, br)
                let dl = bl * dry * dg + vl * wet * wg * hall
                let dr = br * dry * dg + vr * wet * wg * hall
                droneGain += (droneVolumeTarget - droneGain) * volCoef
                let (cl, cr) = comp.process(dl * droneGain, dr * droneGain)
                l += cl
                r += cr
            }

            // The drone and the metronome can each come near full scale now: whatever
            // they sum to, it stays under it (the clamp is only a backstop).
            let (ol, or) = limiter.process(l, r)
            left[f] = Float(max(-1, min(1, ol)))
            right[f] = Float(max(-1, min(1, or)))
        }
        frameCount += Int64(frames)
        // Notes that have faded out go; the hall rings on a little longer.
        layers.removeAll { $0.target == 0 && $0.env < 1e-4 }
        if !layers.isEmpty { tail = Int64((hallTarget > 0 ? PracticeMixer.tailSec : 0.1) * sr) } else if tail > 0 { tail -= Int64(frames) }
    }

    private func startClick(_ kind: Int, _ pos: Double) {
        guard kind != PracticeMixer.silent, kind < clicks.count, clicksActive < clickKind.count else { return }
        clickKind[clicksActive] = kind
        clickPos[clicksActive] = pos
        clicksActive += 1
    }

    private static func linear(_ d: [Float], _ pos: Double) -> Double {
        let i = Int(pos)
        guard i >= 0, i < d.count else { return 0 }
        let t = pos - Double(i)
        let a = Double(d[i])
        let b = i + 1 < d.count ? Double(d[i + 1]) : 0
        return a + (b - a) * t
    }

    /// 4-point Hermite interpolation, wrapping round the loop.
    static func hermite(_ loop: Loop, _ c: Int, _ pos: Double) -> Double {
        let n = loop.frames, ch = loop.channels
        let i = Int(pos)
        let t = pos - Double(i)
        let xm1 = Double(loop.data[((i - 1 + n) % n) * ch + c])
        let x0 = Double(loop.data[(i % n) * ch + c])
        let x1 = Double(loop.data[((i + 1) % n) * ch + c])
        let x2 = Double(loop.data[((i + 2) % n) * ch + c])
        let c1 = 0.5 * (x1 - xm1)
        let c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2
        let c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1)
        return ((c3 * t + c2) * t + c1) * t + x0
    }
}

// MARK: building blocks

/// A lowpass biquad (RBJ), Q as Web Audio's 0.5 dB.
final class Biquad {
    private(set) var freq = 0.0
    private var b0 = 0.0, b1 = 0.0, b2 = 0.0, a1 = 0.0, a2 = 0.0
    private var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0

    func lowpass(_ f: Double, _ sampleRate: Double) {
        freq = f
        let q = pow(10, 0.5 / 20)
        let w = 2 * Double.pi * min(f, sampleRate * 0.45) / sampleRate
        let cosw = cos(w), alpha = sin(w) / (2 * q), a0 = 1 + alpha
        b0 = (1 - cosw) / 2 / a0
        b1 = (1 - cosw) / a0
        b2 = b0
        a1 = -2 * cosw / a0
        a2 = (1 - alpha) / a0
    }

    func process(_ x: Double) -> Double {
        let y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = x
        y2 = y1
        y1 = y
        return y
    }
}

/// Freeverb (Jezar's), set for a warm hall of about 2.8 s like drone.js's.
struct Freeverb {
    private static let combTunings = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]
    private static let allpassTunings = [556, 441, 341, 225]
    private static let spread = 23
    private static let room = 0.82, damp = 0.5
    private var comb: [[Float]] = []
    private var combIdx = [Int](repeating: 0, count: 16)
    private var combStore = [Double](repeating: 0, count: 16)
    private var ap: [[Float]] = []
    private var apIdx = [Int](repeating: 0, count: 8)
    private let feedback = Freeverb.room * 0.28 + 0.7
    private let damp1 = Freeverb.damp * 0.4, damp2 = 1 - Freeverb.damp * 0.4

    init(sampleRate: Double) {
        let k = sampleRate / 44100
        comb = Array(repeating: [], count: 16)
        for i in 0..<8 {
            comb[i] = [Float](repeating: 0, count: max(1, Int(Double(Freeverb.combTunings[i]) * k)))
            comb[i + 8] = [Float](repeating: 0, count: max(1, Int(Double(Freeverb.combTunings[i] + Freeverb.spread) * k)))
        }
        ap = Array(repeating: [], count: 8)
        for i in 0..<4 {
            ap[i] = [Float](repeating: 0, count: max(1, Int(Double(Freeverb.allpassTunings[i]) * k)))
            ap[i + 4] = [Float](repeating: 0, count: max(1, Int(Double(Freeverb.allpassTunings[i] + Freeverb.spread) * k)))
        }
    }

    mutating func process(_ l: Double, _ r: Double) -> (Double, Double) {
        let input = (l + r) * 0.015
        var ol = 0.0, or = 0.0
        for i in 0..<8 {
            ol += combStep(i, input)
            or += combStep(i + 8, input)
        }
        for i in 0..<4 {
            ol = apStep(i, ol)
            or = apStep(i + 4, or)
        }
        return (ol, or)
    }

    private mutating func combStep(_ i: Int, _ input: Double) -> Double {
        let j = combIdx[i]
        let y = Double(comb[i][j])
        combStore[i] = y * damp2 + combStore[i] * damp1
        comb[i][j] = Float(input + combStore[i] * feedback)
        combIdx[i] = j + 1 == comb[i].count ? 0 : j + 1
        return y
    }

    private mutating func apStep(_ i: Int, _ input: Double) -> Double {
        let j = apIdx[i]
        let bo = Double(ap[i][j])
        ap[i][j] = Float(input + bo * 0.5)
        apIdx[i] = j + 1 == ap[i].count ? 0 : j + 1
        return bo - input
    }
}

/// A peak limiter just under full scale, like the web's output.js (threshold
/// -1 dB): it catches a peak at once and lets go over 150 ms. Below the
/// threshold it does nothing.
struct Limiter {
    private static let ceiling = pow(10, -1.0 / 20)
    private var env = 0.0, release = 0.0

    mutating func setSampleRate(_ rate: Double) {
        release = 1 - exp(-1 / (0.15 * rate))
    }

    mutating func process(_ l: Double, _ r: Double) -> (Double, Double) {
        let x = max(abs(l), abs(r))
        env = x > env ? x : env + (x - env) * release
        let g = env > Limiter.ceiling ? Limiter.ceiling / env : 1
        return (l * g, r * g)
    }
}

/// A gentle compressor like drone.js's (threshold -12 dB, ratio 3, attack 20 ms, release 400 ms), with makeup gain.
struct Compressor {
    private static let threshold = pow(10, -12.0 / 20), ratio = 3.0
    private var env = 0.0, attack = 0.0, release = 0.0

    mutating func setSampleRate(_ rate: Double) {
        attack = 1 - exp(-1 / (0.02 * rate))
        release = 1 - exp(-1 / (0.4 * rate))
    }

    mutating func process(_ l: Double, _ r: Double) -> (Double, Double) {
        let x = max(abs(l), abs(r))
        env += (x - env) * (x > env ? attack : release)
        var g = PracticeMixer.makeup
        if env > Compressor.threshold { g *= pow(env / Compressor.threshold, 1 / Compressor.ratio - 1) }
        return (l * g, r * g)
    }
}
