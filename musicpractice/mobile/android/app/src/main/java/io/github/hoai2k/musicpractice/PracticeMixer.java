package io.github.hoai2k.musicpractice;

import java.util.ArrayList;
import java.util.HashMap;

/**
 * The metronome and the drone in the app, mixed in native code so they keep
 * playing with the screen locked (the web view's JavaScript pauses then).
 *
 * A port of app/src/metronome.js and the recorded-voice path of
 * app/src/drone.js: the same clicks (rendered by the web code and handed
 * over), the same seamless loops retuned by playback rate, fades, fifth,
 * lowpass and levels, and timed drones that move through a sequence by
 * themselves. A Freeverb hall stands in for the web's convolution reverb,
 * set to match its decay and level.
 *
 * Plain Java with no Android classes, so it is tested on a computer
 * (mobile/test/). The iOS app has the same mixer in Swift
 * (ios/App/App/PracticeMixer.swift); change both together.
 */
public final class PracticeMixer {
    public static final double FADE_IN = 0.65; // time constants, as drone.js: about 2 s in
    public static final double FADE_OUT = 0.45; // and 1.5 s out when moving to a new note
    public static final double PAUSE_FADE = 0.012; // pausing: gone in about 50 ms, sound and hall
    // Measured against the web drone over all 24 notes (mobile/test/): the hall's level
    // and the web compressor's makeup gain.
    static final double VERB_GAIN = 0.51;
    static final double MAKEUP = 1.044;
    static final double TAIL_SEC = 3.5; // the hall rings this long after the last note

    private double sr;
    private long frame; // frames rendered so far

    // ------------------------------------------------------------ metronome

    private final float[][] clicks = new float[4][]; // weak, mid, strong, between the beats
    private double clickSr = 48000;
    private boolean metRunning;
    private double bpm = 120;
    private int[] strengths = {2, 0, 0, 0};
    private double metVolume = 0.8, metGain = 0.8;
    private double nextBeat; // the frame of the next beat (fractional)
    private int beat; // its place in the bar
    private long count; // beats since the start
    private int subdivision = 1; // clicks per beat (quarters, eighths, triplets, sixteenths)
    private double lastBeat; // the frame of the last beat, which the subdivisions count from
    private int subIndex = 1; // the next subdivision of that beat
    private int lastBeatIndex; // that beat's place in the bar
    private int[] slots = new int[0]; // custom strong beats: the click for every position in the bar (empty: the plain rules)
    private final int[] clickKind = new int[16];
    private final double[] clickPos = new double[16]; // in click samples
    private int clicksActive;
    private int stopFade; // frames left of a quick fade after Stop
    private int stopFadeLen;

    // ------------------------------------------------------------ drone

    /** A seamless loop of one note: `frames` frames of `channels` interleaved samples, pitch `hz`. */
    public static final class Loop {
        final double hz, sampleRate;
        final int channels, frames;
        final float[] data;

        public Loop(double hz, double sampleRate, int channels, float[] data) {
            this.hz = hz;
            this.sampleRate = sampleRate;
            this.channels = Math.max(1, channels);
            this.data = data;
            this.frames = data.length / this.channels;
        }
    }

    /** A voice: its loops and how drone.js plays them (SAMPLED). */
    public static final class Voice {
        final double level, wet, lowpass, maxShift;
        final Loop[] loops;

        public Voice(double level, double wet, double lowpass, double maxShift, Loop[] loops) {
            this.level = level;
            this.wet = wet;
            this.lowpass = lowpass;
            this.maxShift = maxShift;
            this.loops = loops;
        }
    }

    private static final class Source {
        Loop loop;
        double pos, step, gain;
        Biquad lpL, lpR;
    }

    private static final class Layer {
        Source[] sources;
        double env, target, coef;
    }

    private final HashMap<String, Voice> voices = new HashMap<>();
    private final ArrayList<Layer> layers = new ArrayList<>();
    private double droneVolume = 0.8, droneGain = 0.8;
    private double wet = 0.14, wetTarget = 0.14, dry = 0.93, dryTarget = 0.93;
    private Freeverb verb;
    private final Compressor comp = new Compressor();
    private final Limiter limiter = new Limiter(); // last, on everything: as web output.js
    private long tail; // frames of reverb tail still to render

    private boolean dronePlaying;
    private double hall = 1, hallTarget = 1; // the hall's ring, cut short by a stop
    private String droneVoice = "";
    private int droneMidi;
    private double droneA4 = 440;
    private boolean droneFifth;

    // A timed drone: the next change comes after `untilNext` frames of playing.
    private boolean timed;
    private boolean scheduled; // a schedule was set (its time left is still reported after a stop)
    private double untilNext, interval;
    private int[] notes = new int[0];
    private int noteIndex;
    private boolean stopAtEnd;
    private int changes; // changes made since the schedule was set
    private boolean stoppedByTimer;

    // For the tests (mobile/test/): hear the dry sound or the hall alone; count sounding notes.
    boolean testNoDry, testNoWet;

    synchronized int layerCount() {
        return layers.size();
    }

    public PracticeMixer(double sampleRate) {
        setSampleRate(sampleRate);
    }

    public synchronized double sampleRate() {
        return sr;
    }

    public synchronized long frame() {
        return frame;
    }

    /** A new output rate (a new audio route): loops and clicks are retuned, the hall rebuilt. */
    public synchronized void setSampleRate(double sampleRate) {
        double old = sr;
        sr = sampleRate;
        verb = new Freeverb(sr);
        comp.setSampleRate(sr);
        limiter.setSampleRate(sr);
        stopFadeLen = Math.max(1, (int) (0.005 * sr));
        if (old > 0) {
            nextBeat = frame + (nextBeat - frame) * sr / old;
            untilNext = untilNext * sr / old;
            interval = interval * sr / old;
            for (Layer l : layers) {
                l.coef = coef(l.target > 0 ? FADE_IN : FADE_OUT);
                for (Source s : l.sources) {
                    s.step = s.step * old / sr;
                    if (s.lpL != null) {
                        s.lpL.lowpass(s.lpL.freq, sr);
                        s.lpR.lowpass(s.lpR.freq, sr);
                    }
                }
            }
        }
    }

    private double coef(double tau) {
        return 1 - Math.exp(-1 / (tau * sr));
    }

    // ------------------------------------------------------------ metronome API

    /** The clicks (weak, mid, strong, between the beats), rendered by metronome.js at `sampleRate`. */
    public synchronized void setClicks(float[] weak, float[] mid, float[] strong, float[] sub, double sampleRate) {
        clicks[0] = weak;
        clicks[1] = mid;
        clicks[2] = strong;
        clicks[3] = sub != null ? sub : weak; // an older page sends none: the weak click stands in
        clickSr = sampleRate;
    }

    public synchronized void setClicks(float[] weak, float[] mid, float[] strong, double sampleRate) {
        setClicks(weak, mid, strong, null, sampleRate);
    }

    public synchronized void metronomeStart(double bpm, int[] strengths, double volume) {
        metronomeStart(bpm, strengths, 1, volume);
    }

    public synchronized void metronomeStart(double bpm, int[] strengths, int subdivision, double volume) {
        metronomeStart(bpm, strengths, subdivision, new int[0], volume);
    }

    public synchronized void metronomeStart(double bpm, int[] strengths, int subdivision, int[] slots, double volume) {
        metronomeUpdate(bpm, strengths, subdivision, slots, volume);
        metGain = volume;
        metRunning = true;
        beat = 0;
        count = 0;
        nextBeat = frame + 0.05 * sr;
        subIndex = Integer.MAX_VALUE; // no subdivisions before the first beat
        stopFade = 0;
    }

    public synchronized void metronomeUpdate(double bpm, int[] strengths, double volume) {
        metronomeUpdate(bpm, strengths, subdivision, volume);
    }

    public synchronized void metronomeUpdate(double bpm, int[] strengths, int subdivision, double volume) {
        metronomeUpdate(bpm, strengths, subdivision, new int[0], volume);
    }

    /** Tempo, bar, subdivision, custom strong beats and volume while running: a new tempo counts from the next beat. */
    public synchronized void metronomeUpdate(double bpm, int[] strengths, int subdivision, int[] slots, double volume) {
        this.bpm = Math.max(1, bpm);
        this.subdivision = Math.max(1, Math.min(4, subdivision));
        this.slots = new int[slots.length];
        for (int i = 0; i < slots.length; i++) this.slots[i] = Math.max(0, Math.min(3, slots[i]));
        this.strengths = strengths.length > 0 ? strengths : new int[] {0};
        metVolume = volume;
        if (beat >= this.strengths.length) beat %= this.strengths.length;
    }

    public synchronized void metronomeStop() {
        if (!metRunning) return;
        metRunning = false;
        stopFade = stopFadeLen;
    }

    public synchronized boolean metronomeRunning() {
        return metRunning;
    }

    /** { next beat's frame, its count, its place in the bar, seconds per beat }. */
    public synchronized double[] metronomeClock() {
        return new double[] {nextBeat, count, beat, 60 / bpm};
    }

    // ------------------------------------------------------------ drone API

    public synchronized void loadVoice(String id, Voice voice) {
        voices.put(id, voice);
    }

    public synchronized boolean hasVoice(String id) {
        return voices.containsKey(id);
    }

    /**
     * Start, or move to a new note or voice (the new one fades in while the old
     * fades out). The same note again changes nothing. False if the voice isn't loaded.
     */
    public synchronized boolean dronePlay(String voiceId, int midi, double a4, boolean fifth) {
        Voice v = voices.get(voiceId);
        if (v == null) return false;
        boolean same = dronePlaying && voiceId.equals(droneVoice) && midi == droneMidi && a4 == droneA4 && fifth == droneFifth;
        dronePlaying = true;
        stoppedByTimer = false;
        hallTarget = 1;
        droneVoice = voiceId;
        droneA4 = a4;
        droneFifth = fifth;
        droneMidi = midi;
        if (!same) sound(v);
        return true;
    }

    /**
     * A timed drone: after `firstSec` of playing, move to notes[0], then to
     * each next note every `intervalSec`; at the end, stop if `stopAtEnd`.
     * Seconds count only while playing. firstSec < 0 clears it.
     */
    public synchronized void droneSchedule(double firstSec, double intervalSec, int[] notes, boolean stopAtEnd) {
        timed = firstSec >= 0;
        scheduled = timed;
        untilNext = firstSec * sr;
        interval = Math.max(1, intervalSec * sr);
        this.notes = notes != null ? notes : new int[0];
        noteIndex = 0;
        this.stopAtEnd = stopAtEnd;
        changes = 0;
    }

    public synchronized void droneStop() {
        dronePlaying = false;
        timed = false;
        for (Layer l : layers) {
            l.target = 0;
            l.coef = coef(PAUSE_FADE);
        }
        hallTarget = 0;
    }

    public synchronized void droneVolume(double v) {
        droneVolume = v;
    }

    /** { playing (0/1), note, changes since the schedule was set, seconds to the next change (-1 untimed), stopped by its timer (0/1) }. */
    public synchronized double[] droneState() {
        return new double[] {dronePlaying ? 1 : 0, droneMidi, changes, scheduled ? Math.max(0, untilNext) / sr : -1, stoppedByTimer ? 1 : 0};
    }

    public synchronized boolean dronePlaying() {
        return dronePlaying;
    }

    /** Nothing playing or ringing: the output can stop. */
    public synchronized boolean idle() {
        return !metRunning && clicksActive == 0 && stopFade == 0 && layers.isEmpty() && tail <= 0;
    }

    /** Stop everything at once (a call, the notification's Stop). */
    public synchronized void stopAll() {
        metronomeStop();
        droneStop();
    }

    private void fadeOutAll() {
        for (Layer l : layers) {
            l.target = 0;
            l.coef = coef(FADE_OUT);
        }
    }

    /** drone.js nearestLoop: the nearest loop and the pitch to retune it to. */
    static Object[] nearest(Loop[] loops, double hz, double maxShift) {
        Loop best = pick(loops, hz);
        double target = hz;
        if (shift(hz, best) > maxShift) {
            for (double h : new double[] {hz * 2, hz / 2}) {
                Loop l = pick(loops, h);
                if (shift(h, l) < shift(target, best)) {
                    best = l;
                    target = h;
                }
            }
        }
        return new Object[] {best, target};
    }

    private static double shift(double h, Loop l) {
        return Math.abs(12 * Math.log(h / l.hz) / Math.log(2));
    }

    private static Loop pick(Loop[] loops, double h) {
        Loop best = loops[0];
        for (Loop l : loops) if (shift(h, l) < shift(h, best)) best = l;
        return best;
    }

    private void sound(Voice v) {
        fadeOutAll();
        double f0 = droneA4 * Math.pow(2, (droneMidi - 69) / 12.0);
        double[] want = droneFifth ? new double[] {f0, f0 * 1.5} : new double[] {f0};
        Layer layer = new Layer();
        layer.env = 0;
        layer.target = 1;
        layer.coef = coef(FADE_IN);
        layer.sources = new Source[want.length];
        for (int i = 0; i < want.length; i++) {
            Object[] n = nearest(v.loops, want[i], v.maxShift);
            Loop loop = (Loop) n[0];
            double target = (Double) n[1];
            Source s = new Source();
            s.loop = loop;
            s.step = (target / loop.hz) * loop.sampleRate / sr;
            s.gain = v.level * (i > 0 ? 0.5 : 1) * (want.length > 1 ? 0.85 : 1);
            // Start somewhere along the loop, as drone.js does.
            double along = ((droneMidi * 0.37 + i * 1.7) % 1.0) * (loop.frames / loop.sampleRate) * 0.5;
            s.pos = along * loop.sampleRate;
            if (v.lowpass > 0) {
                s.lpL = new Biquad();
                s.lpR = new Biquad();
                s.lpL.lowpass(v.lowpass, sr);
                s.lpR.lowpass(v.lowpass, sr);
            }
            layer.sources[i] = s;
        }
        layers.add(layer);
        wetTarget = v.wet;
        dryTarget = 1 - v.wet * 0.5;
    }

    /** The timed drone's clock, once per buffer of `n` frames. */
    private void advanceSchedule(int n) {
        if (!dronePlaying || !timed) return;
        untilNext -= n;
        if (untilNext > 0) return;
        if (noteIndex < notes.length) {
            changes++;
            droneMidi = notes[noteIndex++];
            untilNext += interval;
            Voice v = voices.get(droneVoice);
            if (v != null) sound(v);
        } else if (stopAtEnd) {
            stoppedByTimer = true;
            droneStop();
        } else {
            timed = false;
        }
    }

    // ------------------------------------------------------------ rendering

    /** Mix `frames` frames into `out`, interleaved stereo (overwritten). */
    public synchronized void render(float[] out, int frames) {
        advanceSchedule(frames);
        double metCoef = coef(0.02);
        double volCoef = coef(0.05);
        double mixCoef = coef(0.5), hallCoef = coef(PAUSE_FADE);
        double clickStep = clickSr / sr;
        boolean droneOn = !layers.isEmpty() || tail > 0;
        for (int f = 0; f < frames; f++) {
            double l = 0, r = 0;

            // Metronome: start a click on each beat, then play the clicks sounding.
            double now = frame + f;
            if (metRunning && now >= nextBeat) {
                int strength = strengths[beat % strengths.length];
                startClick(Math.max(0, Math.min(2, strength)), (now - nextBeat) * clickStep);
                lastBeat = nextBeat;
                lastBeatIndex = beat;
                subIndex = 1;
                nextBeat += 60 / bpm * sr;
                beat = (beat + 1) % strengths.length;
                count++;
            }
            // The clicks between the beats, evenly spaced from the last one.
            if (metRunning && subIndex < subdivision) {
                double at = lastBeat + subIndex * (60 / bpm * sr) / subdivision;
                if (now >= at) {
                    int k = lastBeatIndex * subdivision + subIndex;
                    startClick(slots.length == 0 ? 3 : slots[k % slots.length], (now - at) * clickStep);
                    subIndex++;
                }
            }
            metGain += (metVolume - metGain) * metCoef;
            if (clicksActive > 0) {
                double c = 0;
                for (int i = 0; i < clicksActive; i++) {
                    float[] buf = clicks[clickKind[i]];
                    c += buf == null ? 0 : linear(buf, clickPos[i]);
                    clickPos[i] += clickStep;
                }
                for (int i = clicksActive - 1; i >= 0; i--) {
                    float[] buf = clicks[clickKind[i]];
                    if (buf == null || clickPos[i] >= buf.length) {
                        clicksActive--;
                        clickKind[i] = clickKind[clicksActive];
                        clickPos[i] = clickPos[clicksActive];
                    }
                }
                double fade = 1;
                if (stopFade > 0) {
                    fade = stopFade / (double) stopFadeLen;
                    if (--stopFade == 0) clicksActive = 0;
                }
                c *= metGain * fade;
                l += c;
                r += c;
            } else if (stopFade > 0) {
                stopFade = 0;
            }

            // Drone: the sounding notes into the bus, then dry + hall.
            if (droneOn) {
                double bl = 0, br = 0;
                for (int k = 0; k < layers.size(); k++) {
                    Layer layer = layers.get(k);
                    layer.env += (layer.target - layer.env) * layer.coef;
                    double e = layer.env;
                    for (Source s : layer.sources) {
                        Loop loop = s.loop;
                        double sl = hermite(loop, 0, s.pos);
                        double sR = loop.channels > 1 ? hermite(loop, 1, s.pos) : sl;
                        if (s.lpL != null) {
                            sl = s.lpL.process(sl);
                            sR = s.lpR.process(sR);
                        }
                        bl += sl * s.gain * e;
                        br += sR * s.gain * e;
                        s.pos += s.step;
                        if (s.pos >= loop.frames) s.pos -= loop.frames;
                    }
                }
                wet += (wetTarget - wet) * mixCoef;
                dry += (dryTarget - dry) * mixCoef;
                hall += (hallTarget - hall) * hallCoef;
                double[] v = verb.process(bl, br);
                double dg = testNoDry ? 0 : dry, wg = testNoWet ? 0 : wet * VERB_GAIN * hall;
                double dl = bl * dg + v[0] * wg;
                double dr = br * dg + v[1] * wg;
                droneGain += (droneVolume - droneGain) * volCoef;
                double[] c = comp.process(dl * droneGain, dr * droneGain);
                l += c[0];
                r += c[1];
            }

            // The drone and the metronome can each come near full scale now: whatever
            // they sum to, it stays under it (the clamp is only a backstop).
            double[] lim = limiter.process(l, r);
            out[2 * f] = (float) clamp(lim[0]);
            out[2 * f + 1] = (float) clamp(lim[1]);
        }
        frame += frames;
        // Notes that have faded out go; the hall rings on a little longer.
        for (int k = layers.size() - 1; k >= 0; k--) {
            Layer layer = layers.get(k);
            if (layer.target == 0 && layer.env < 1e-4) layers.remove(k);
        }
        if (!layers.isEmpty()) tail = (long) ((hallTarget > 0 ? TAIL_SEC : 0.1) * sr);
        else if (tail > 0) tail -= frames;
    }

    private void startClick(int kind, double pos) {
        if (clicksActive == clickKind.length) return;
        clickKind[clicksActive] = kind;
        clickPos[clicksActive] = pos;
        clicksActive++;
    }

    private static double clamp(double x) {
        return x > 1 ? 1 : x < -1 ? -1 : x;
    }

    private static double linear(float[] d, double pos) {
        int i = (int) pos;
        if (i < 0 || i >= d.length) return 0;
        double t = pos - i;
        double a = d[i];
        double b = i + 1 < d.length ? d[i + 1] : 0;
        return a + (b - a) * t;
    }

    /** 4-point Hermite interpolation, wrapping round the loop. */
    static double hermite(Loop loop, int c, double pos) {
        int n = loop.frames, ch = loop.channels;
        float[] d = loop.data;
        int i = (int) pos;
        double t = pos - i;
        double xm1 = d[((i - 1 + n) % n) * ch + c];
        double x0 = d[(i % n) * ch + c];
        double x1 = d[((i + 1) % n) * ch + c];
        double x2 = d[((i + 2) % n) * ch + c];
        double c1 = 0.5 * (x1 - xm1);
        double c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
        double c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
        return ((c3 * t + c2) * t + c1) * t + x0;
    }

    // ------------------------------------------------------------ building blocks

    /** A lowpass biquad (RBJ), Q as Web Audio's 0.5 dB. */
    static final class Biquad {
        double freq, b0, b1, b2, a1, a2, x1, x2, y1, y2;

        void lowpass(double f, double sampleRate) {
            freq = f;
            double q = Math.pow(10, 0.5 / 20);
            double w = 2 * Math.PI * Math.min(f, sampleRate * 0.45) / sampleRate;
            double cos = Math.cos(w), alpha = Math.sin(w) / (2 * q), a0 = 1 + alpha;
            b0 = (1 - cos) / 2 / a0;
            b1 = (1 - cos) / a0;
            b2 = b0;
            a1 = -2 * cos / a0;
            a2 = (1 - alpha) / a0;
        }

        double process(double x) {
            double y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
            x2 = x1;
            x1 = x;
            y2 = y1;
            y1 = y;
            return y;
        }
    }

    /** Freeverb (Jezar's), set for a warm hall of about 2.8 s like drone.js's. */
    static final class Freeverb {
        private static final int[] COMBS = {1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617};
        private static final int[] ALLPASSES = {556, 441, 341, 225};
        private static final int SPREAD = 23;
        private static final double ROOM = 0.82, DAMP = 0.5;
        private final float[][] comb = new float[16][];
        private final int[] combIdx = new int[16];
        private final double[] combStore = new double[16];
        private final float[][] ap = new float[8][];
        private final int[] apIdx = new int[8];
        private final double feedback = ROOM * 0.28 + 0.7, damp1 = DAMP * 0.4, damp2 = 1 - DAMP * 0.4;
        private final double[] out = new double[2];

        Freeverb(double sampleRate) {
            double k = sampleRate / 44100;
            for (int i = 0; i < 8; i++) {
                comb[i] = new float[Math.max(1, (int) (COMBS[i] * k))];
                comb[i + 8] = new float[Math.max(1, (int) ((COMBS[i] + SPREAD) * k))];
            }
            for (int i = 0; i < 4; i++) {
                ap[i] = new float[Math.max(1, (int) (ALLPASSES[i] * k))];
                ap[i + 4] = new float[Math.max(1, (int) ((ALLPASSES[i] + SPREAD) * k))];
            }
        }

        double[] process(double l, double r) {
            double in = (l + r) * 0.015;
            double ol = 0, or = 0;
            for (int i = 0; i < 8; i++) {
                ol += combStep(i, in);
                or += combStep(i + 8, in);
            }
            for (int i = 0; i < 4; i++) {
                ol = apStep(i, ol);
                or = apStep(i + 4, or);
            }
            out[0] = ol;
            out[1] = or;
            return out;
        }

        private double combStep(int i, double in) {
            float[] b = comb[i];
            int j = combIdx[i];
            double y = b[j];
            combStore[i] = y * damp2 + combStore[i] * damp1;
            b[j] = (float) (in + combStore[i] * feedback);
            combIdx[i] = j + 1 == b.length ? 0 : j + 1;
            return y;
        }

        private double apStep(int i, double in) {
            float[] b = ap[i];
            int j = apIdx[i];
            double bo = b[j];
            b[j] = (float) (in + bo * 0.5);
            apIdx[i] = j + 1 == b.length ? 0 : j + 1;
            return bo - in;
        }
    }

    /**
     * A peak limiter just under full scale, like the web's output.js (threshold
     * -1 dB): it catches a peak at once and lets go over 150 ms. Below the
     * threshold it does nothing.
     */
    static final class Limiter {
        private static final double CEILING = Math.pow(10, -1 / 20.0);
        private double env, release;
        private final double[] out = new double[2];

        void setSampleRate(double sampleRate) {
            release = 1 - Math.exp(-1 / (0.15 * sampleRate));
        }

        double[] process(double l, double r) {
            double x = Math.max(Math.abs(l), Math.abs(r));
            env = x > env ? x : env + (x - env) * release;
            double g = env > CEILING ? CEILING / env : 1;
            out[0] = l * g;
            out[1] = r * g;
            return out;
        }
    }

    /** A gentle compressor like drone.js's (threshold -12 dB, ratio 3, attack 20 ms, release 400 ms), with makeup gain. */
    static final class Compressor {
        private static final double THRESHOLD = Math.pow(10, -12 / 20.0), RATIO = 3;
        private double env, attack, release;
        private final double[] out = new double[2];

        void setSampleRate(double sampleRate) {
            attack = 1 - Math.exp(-1 / (0.02 * sampleRate));
            release = 1 - Math.exp(-1 / (0.4 * sampleRate));
        }

        double[] process(double l, double r) {
            double x = Math.max(Math.abs(l), Math.abs(r));
            env += (x - env) * (x > env ? attack : release);
            double g = MAKEUP;
            if (env > THRESHOLD) g *= Math.pow(env / THRESHOLD, 1 / RATIO - 1);
            out[0] = l * g;
            out[1] = r * g;
            return out;
        }
    }
}
