import AVFoundation
import Capacitor
import Foundation
import MediaPlayer
import UIKit

/// PracticeAudio: the metronome and the drone, played natively so they keep
/// going with the screen locked. Called from app/src/nativeaudio.js; the
/// Android app has the same plugin (PracticeAudioPlugin.java). Registered in
/// MainViewController.
@objc(PracticeAudioPlugin)
public class PracticeAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PracticeAudioPlugin"
    public let jsName = "PracticeAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "info", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "micPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "metronomeStart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "metronomeUpdate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "metronomeExercise", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "metronomeStop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "metronomeClock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasVoice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadVoice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dronePlay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "droneStop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "droneVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "droneState", returnType: CAPPluginReturnPromise),
    ]

    private let engine = PracticeAudioEngine.shared

    override public func load() {
        engine.onStopped = { [weak self] what in
            self?.notifyListeners("stopped", data: ["what": what])
        }
    }

    @objc func info(_ call: CAPPluginCall) {
        call.resolve(["sampleRate": engine.outputSampleRate()])
    }

    // MARK: microphone

    /// The microphone permission without asking for it: granted, denied
    /// (refused, or switched off in Settings), or prompt (not asked yet).
    @objc func micPermission(_ call: CAPPluginCall) {
        let state: String
        if #available(iOS 17.0, *) {
            switch AVAudioApplication.shared.recordPermission {
            case .granted: state = "granted"
            case .denied: state = "denied"
            default: state = "prompt"
            }
        } else {
            switch AVAudioSession.sharedInstance().recordPermission {
            case .granted: state = "granted"
            case .denied: state = "denied"
            default: state = "prompt"
            }
        }
        call.resolve(["state": state])
    }

    /// The app's own page in Settings, where the microphone can be turned back on.
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            call.resolve()
        }
    }

    // MARK: metronome

    @objc func metronomeStart(_ call: CAPPluginCall) {
        setClicks(call)
        engine.mixer.metronomeStart(bpm: call.getDouble("bpm", 120), strengths: ints(call.getArray("strengths")), subdivision: call.getInt("subdivision", 1), slots: ints(call.getArray("slots")), volume: call.getDouble("volume", 0.8))
        engine.setLabels(metronome: call.getString("label"), drone: nil)
        engine.ensureRunning()
        call.resolve()
    }

    @objc func metronomeUpdate(_ call: CAPPluginCall) {
        setClicks(call)
        engine.mixer.metronomeUpdate(bpm: call.getDouble("bpm", 120), strengths: ints(call.getArray("strengths")), subdivision: call.getInt("subdivision", 1), slots: ints(call.getArray("slots")), volume: call.getDouble("volume", 0.8))
        engine.setLabels(metronome: call.getString("label"), drone: nil)
        call.resolve()
    }

    @objc func metronomeExercise(_ call: CAPPluginCall) {
        engine.mixer.metronomeExercise(gapPlay: call.getInt("gapPlay", 0), gapSilent: call.getInt("gapSilent", 0),
                                       trainerStep: call.getDouble("trainerStep", 0), trainerEvery: call.getInt("trainerEvery", 0), trainerTo: call.getDouble("trainerTo", 0),
                                       polyN: call.getInt("polyN", 0))
        call.resolve()
    }

    @objc func metronomeStop(_ call: CAPPluginCall) {
        engine.mixer.metronomeStop()
        engine.setLabels(metronome: nil, drone: nil)
        call.resolve()
    }

    @objc func metronomeClock(_ call: CAPPluginCall) {
        guard engine.mixer.metronomeRunning else {
            call.resolve(["running": false])
            return
        }
        let c = engine.mixer.metronomeClock()
        call.resolve([
            "running": true,
            "nextBeatAt": engine.heardAtMs(frame: c.nextBeat),
            "nextCount": Int(c.count),
            "nextBeat": c.beat,
            "period": c.period,
        ])
    }

    private func setClicks(_ call: CAPPluginCall) {
        guard let list = call.getArray("clicks"), list.count >= 3 else { return }
        let c = list.prefix(4).map { decode($0 as? String) }
        engine.mixer.setClicks(weak: c[0], mid: c[1], strong: c[2], sub: c.count > 3 ? c[3] : nil, sampleRate: call.getDouble("clickRate", engine.outputSampleRate()))
    }

    // MARK: drone

    @objc func hasVoice(_ call: CAPPluginCall) {
        call.resolve(["loaded": engine.mixer.hasVoice(call.getString("id", ""))])
    }

    @objc func loadVoice(_ call: CAPPluginCall) {
        guard let list = call.getArray("loops"), !list.isEmpty else {
            call.reject("no loops")
            return
        }
        var loops: [PracticeMixer.Loop] = []
        for item in list {
            guard let l = item as? JSObject else {
                call.reject("bad loops")
                return
            }
            loops.append(PracticeMixer.Loop(hz: num(l["hz"]) ?? 110, sampleRate: num(l["sampleRate"]) ?? 44100,
                                             channels: Int(num(l["channels"]) ?? 1), data: decode(l["data"] as? String)))
        }
        engine.mixer.loadVoice(call.getString("id", ""), PracticeMixer.Voice(
            level: call.getDouble("level", 1), wet: call.getDouble("wet", 0.3), lowpass: call.getDouble("lowpass", 0),
            maxShift: call.getDouble("maxShift", 4), loops: loops))
        call.resolve()
    }

    @objc func dronePlay(_ call: CAPPluginCall) {
        let m = engine.mixer
        m.droneVolume(call.getDouble("volume", 0.8))
        guard m.dronePlay(voice: call.getString("voice", ""), midi: call.getInt("midi", 48), a4: call.getDouble("a4", 440), fifth: call.getBool("fifth", false)) else {
            call.reject("voice not loaded")
            return
        }
        if let s = call.getObject("schedule") {
            m.droneSchedule(first: num(s["first"]) ?? -1, interval: num(s["interval"]) ?? 60,
                            notes: ints(s["notes"] as? JSArray), stopAtEnd: (s["stopAtEnd"] as? Bool) ?? false)
        } else {
            m.droneSchedule(first: -1, interval: 0, notes: [], stopAtEnd: false)
        }
        engine.setLabels(metronome: nil, drone: call.getString("label", "Drone"))
        engine.ensureRunning()
        call.resolve()
    }

    @objc func droneStop(_ call: CAPPluginCall) {
        engine.mixer.droneStop()
        engine.setLabels(metronome: nil, drone: nil)
        call.resolve()
    }

    @objc func droneVolume(_ call: CAPPluginCall) {
        engine.mixer.droneVolume(call.getDouble("volume", 0.8))
        call.resolve()
    }

    @objc func droneState(_ call: CAPPluginCall) {
        let s = engine.mixer.droneState()
        call.resolve([
            "playing": s.playing,
            "midi": s.midi,
            "changes": s.changes,
            "remaining": s.remaining,
            "stoppedByTimer": s.stoppedByTimer,
        ])
    }

    // MARK: helpers

    private func num(_ v: JSValue?) -> Double? {
        switch v {
        case let n as NSNumber: return n.doubleValue
        case let d as Double: return d
        case let i as Int: return Double(i)
        case let f as Float: return Double(f)
        default: return nil
        }
    }

    private func ints(_ a: JSArray?) -> [Int] {
        (a ?? []).compactMap { num($0).map { Int($0) } }
    }

    /// base64 16-bit little-endian samples to floats.
    private func decode(_ b64: String?) -> [Float] {
        guard let b64 = b64, let data = Data(base64Encoded: b64) else { return [] }
        return data.withUnsafeBytes { raw in
            raw.bindMemory(to: Int16.self).map { Float($0) / ($0 < 0 ? 32768 : 32767) }
        }
    }
}

/// The output for PracticeMixer: an AVAudioEngine with a source node, the
/// audio session (playing with the ring/silent switch on and the screen
/// locked: UIBackgroundModes audio), the lock screen's Now Playing with a
/// pause button, and recovery from calls and route changes. It runs while the
/// metronome or the drone plays and stops a couple of seconds after both
/// have gone quiet.
final class PracticeAudioEngine: NSObject {
    static let shared = PracticeAudioEngine()

    let mixer: PracticeMixer
    var onStopped: ((String) -> Void)?

    private var engine: AVAudioEngine?
    private var running = false
    private var watchdog: Timer?
    private var idleChecks = 0
    private var metronomeLabel = "", droneLabel = ""

    // The last buffer rendered: the host time of its first frame, and the mixer's frame then.
    private let timeLock = NSLock()
    private var lastHostTime: UInt64 = 0
    private var lastFrame: Int64 = 0
    private var timebase = mach_timebase_info_data_t()

    override private init() {
        let rate = AVAudioSession.sharedInstance().sampleRate
        mixer = PracticeMixer(sampleRate: rate > 0 ? rate : 48000)
        super.init()
        mach_timebase_info(&timebase)
        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(interrupted(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        nc.addObserver(self, selector: #selector(mediaReset), name: AVAudioSession.mediaServicesWereResetNotification, object: nil)
        setUpRemoteCommands()
    }

    func outputSampleRate() -> Double {
        mixer.sampleRate
    }

    func setLabels(metronome: String?, drone: String?) {
        // Capacitor calls plugins on a background queue; the engine, its timer and Now Playing live on the main thread.
        guard Thread.isMainThread else {
            DispatchQueue.main.async { self.setLabels(metronome: metronome, drone: drone) }
            return
        }
        if let m = metronome { metronomeLabel = m }
        if let d = drone { droneLabel = d }
        if running { updateNowPlaying() }
    }

    private func label() -> String {
        let met = mixer.metronomeRunning, drone = mixer.dronePlaying
        if met && drone { return "\(metronomeLabel) · \(droneLabel)" }
        if met { return metronomeLabel }
        if drone { return droneLabel }
        return "Music Practice"
    }

    // MARK: running

    /// Start the output (from a tap in the app).
    func ensureRunning() {
        guard Thread.isMainThread else {
            DispatchQueue.main.async { self.ensureRunning() }
            return
        }
        activateSession()
        if !running || engine?.isRunning != true { build() }
        running = true
        idleChecks = 0
        if watchdog == nil {
            watchdog = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.check() }
        }
        updateNowPlaying()
    }

    private func activateSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            // While the web view's microphone is open the session stays play-and-record (the recorder's);
            // otherwise plain playback, which plays with the silent switch on and in the background.
            if session.category != .playAndRecord { try session.setCategory(.playback, mode: .default, options: []) }
            try session.setActive(true)
        } catch {
            print("PracticeAudio: audio session: \(error)")
        }
    }

    private func build() {
        engine?.stop()
        if let old = engine { NotificationCenter.default.removeObserver(self, name: .AVAudioEngineConfigurationChange, object: old) }
        let e = AVAudioEngine()
        let hardware = e.outputNode.outputFormat(forBus: 0)
        let rate = hardware.sampleRate > 0 ? hardware.sampleRate : 48000
        mixer.setSampleRate(rate)
        guard let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 2) else { return }
        let mixer = self.mixer
        let node = AVAudioSourceNode(format: format) { [weak self] _, timestamp, frameCount, audioBufferList -> OSStatus in
            let buffers = UnsafeMutableAudioBufferListPointer(audioBufferList)
            guard buffers.count >= 2,
                  let l = buffers[0].mData?.assumingMemoryBound(to: Float.self),
                  let r = buffers[1].mData?.assumingMemoryBound(to: Float.self) else { return noErr }
            self?.noteRender(timestamp.pointee, frame: mixer.frame)
            mixer.render(left: l, right: r, frames: Int(frameCount))
            return noErr
        }
        e.attach(node)
        e.connect(node, to: e.mainMixerNode, format: format)
        NotificationCenter.default.addObserver(self, selector: #selector(configurationChanged), name: .AVAudioEngineConfigurationChange, object: e)
        do {
            try e.start()
        } catch {
            print("PracticeAudio: engine: \(error)")
        }
        engine = e
    }

    private func noteRender(_ ts: AudioTimeStamp, frame: Int64) {
        guard ts.mFlags.contains(.hostTimeValid) else { return }
        timeLock.lock()
        lastHostTime = ts.mHostTime
        lastFrame = frame
        timeLock.unlock()
    }

    /// Once a second while running: restart a stopped engine (the web view or a
    /// route change can stop it), and stop once nothing has played for 2 s.
    private func check() {
        guard running else { return }
        if mixer.idle {
            idleChecks += 1
            if idleChecks >= 2 { shutdown() }
            return
        }
        idleChecks = 0
        if engine?.isRunning != true {
            activateSession()
            build()
        }
    }

    private func shutdown() {
        running = false
        watchdog?.invalidate()
        watchdog = nil
        engine?.stop()
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    @objc private func configurationChanged() {
        DispatchQueue.main.async { if self.running { self.build() } }
    }

    @objc private func interrupted(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw), type == .ended else { return }
        DispatchQueue.main.async {
            guard self.running, !self.mixer.idle else { return }
            self.activateSession()
            self.build()
        }
    }

    @objc private func mediaReset() {
        DispatchQueue.main.async {
            guard self.running else { return }
            self.activateSession()
            self.build()
        }
    }

    // MARK: timing

    /// When frame `frame` of the mixer is heard, in milliseconds of the system clock (as Date.now()).
    func heardAtMs(frame: Double) -> Double {
        let nowMs = Date().timeIntervalSince1970 * 1000
        let rate = mixer.sampleRate
        timeLock.lock()
        let host = lastHostTime, f0 = lastFrame
        timeLock.unlock()
        let latency = AVAudioSession.sharedInstance().outputLatency
        guard host != 0 else { return nowMs + ((frame - Double(mixer.frame)) / rate + latency) * 1000 }
        let toSec = Double(timebase.numer) / Double(timebase.denom) / 1e9
        let frameHostSec = Double(host) * toSec + (frame - Double(f0)) / rate
        let nowHostSec = Double(mach_absolute_time()) * toSec
        return nowMs + (frameHostSec + latency - nowHostSec) * 1000
    }

    // MARK: lock screen

    private func setUpRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        let stop: (MPRemoteCommandEvent) -> MPRemoteCommandHandlerStatus = { [weak self] _ in
            self?.stopFromOutside()
            return .success
        }
        _ = center.pauseCommand.addTarget(handler: stop)
        _ = center.stopCommand.addTarget(handler: stop)
        _ = center.togglePlayPauseCommand.addTarget(handler: stop)
        center.playCommand.isEnabled = false
    }

    private func stopFromOutside() {
        mixer.stopAll()
        updateNowPlaying()
        onStopped?("all")
    }

    private func updateNowPlaying() {
        let playing = mixer.metronomeRunning || mixer.dronePlaying
        MPNowPlayingInfoCenter.default().nowPlayingInfo = [
            MPMediaItemPropertyTitle: label(),
            MPMediaItemPropertyArtist: "Music Practice",
            MPNowPlayingInfoPropertyIsLiveStream: true,
            MPNowPlayingInfoPropertyPlaybackRate: playing ? 1.0 : 0.0,
        ]
    }
}
