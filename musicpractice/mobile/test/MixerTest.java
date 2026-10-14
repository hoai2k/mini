package io.github.hoai2k.musicpractice;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tests for the Android app's native mixer (PracticeMixer.java), with the
 * clicks, loops and web references from fixtures.mjs. run.sh compiles and runs
 * it; the Swift mixer has the same tests (MixerTest.swift).
 */
public final class MixerTest {
    static final double SR = 48000;
    static int failures = 0;
    static Path dir;
    static final Map<String, float[][]> clicks = new HashMap<>();
    static final Map<String, PracticeMixer.Voice> voices = new HashMap<>();
    static final List<String[]> refs = new ArrayList<>();

    public static void main(String[] args) throws IOException {
        dir = Path.of(args.length > 0 ? args[0] : "local/musicpractice-mixer");
        load();
        metronomeTiming();
        metronomeTempoChange();
        droneLevels();
        droneSeamless();
        droneSchedule();
        droneSameNote();
        speed();
        writeForSwift();
        System.out.println(failures == 0 ? "ALL PASSED" : failures + " FAILED");
        System.exit(failures == 0 ? 0 : 1);
    }

    static void check(boolean ok, String what) {
        System.out.println((ok ? "  ok   " : "  FAIL ") + what);
        if (!ok) failures++;
    }

    static float[] f32(String name) throws IOException {
        ByteBuffer b = ByteBuffer.wrap(Files.readAllBytes(dir.resolve(name))).order(ByteOrder.LITTLE_ENDIAN);
        float[] out = new float[b.remaining() / 4];
        b.asFloatBuffer().get(out);
        return out;
    }

    static void load() throws IOException {
        String voiceId = null;
        double[] spec = null;
        List<PracticeMixer.Loop> loops = new ArrayList<>();
        for (String line : Files.readAllLines(dir.resolve("index.txt"))) {
            String[] p = line.trim().split(" ");
            switch (p[0]) {
                case "click" -> clicks.put(p[1], new float[][] {f32(p[2]), f32(p[3]), f32(p[4])});
                case "voice" -> {
                    if (voiceId != null) voices.put(voiceId, new PracticeMixer.Voice(spec[0], spec[1], spec[2], spec[3], loops.toArray(new PracticeMixer.Loop[0])));
                    voiceId = p[1];
                    spec = new double[] {Double.parseDouble(p[2]), Double.parseDouble(p[3]), Double.parseDouble(p[4]), Double.parseDouble(p[5])};
                    loops = new ArrayList<>();
                }
                case "loop" -> loops.add(new PracticeMixer.Loop(Double.parseDouble(p[1]), Double.parseDouble(p[2]), Integer.parseInt(p[3]), f32(p[4])));
                case "ref" -> refs.add(p);
                default -> { }
            }
        }
        if (voiceId != null) voices.put(voiceId, new PracticeMixer.Voice(spec[0], spec[1], spec[2], spec[3], loops.toArray(new PracticeMixer.Loop[0])));
    }

    static PracticeMixer mixer() {
        PracticeMixer m = new PracticeMixer(SR);
        float[][] c = clicks.get("wood");
        m.setClicks(c[0], c[1], c[2], SR);
        for (Map.Entry<String, PracticeMixer.Voice> e : voices.entrySet()) m.loadVoice(e.getKey(), e.getValue());
        return m;
    }

    /** Render `sec` seconds in buffers of 480 frames: { left, right }. */
    static float[][] render(PracticeMixer m, double sec) {
        int n = (int) (sec * SR), block = 480;
        float[][] out = {new float[n], new float[n]};
        float[] buf = new float[block * 2];
        for (int i = 0; i < n; i += block) {
            int k = Math.min(block, n - i);
            m.render(buf, k);
            for (int j = 0; j < k; j++) {
                out[0][i + j] = buf[2 * j];
                out[1][i + j] = buf[2 * j + 1];
            }
        }
        return out;
    }

    /** Frames where a click starts (after 20 ms of silence). */
    static List<Integer> onsets(float[] x) {
        List<Integer> out = new ArrayList<>();
        int quiet = 0;
        for (int i = 0; i < x.length; i++) {
            if (Math.abs(x[i]) > 1e-4) {
                if (quiet > 0.02 * SR || out.isEmpty() && quiet == i) out.add(i);
                quiet = 0;
            } else {
                quiet++;
            }
        }
        return out;
    }

    static int firstSound(float[] click) {
        for (int i = 0; i < click.length; i++) if (Math.abs(click[i]) > 1e-4) return i;
        return 0;
    }

    static void metronomeTiming() {
        System.out.println("metronome: beats land on the sample, strong on 1");
        PracticeMixer m = mixer();
        m.metronomeStart(120, new int[] {2, 0, 0, 0}, 0.8);
        double[] clock = m.metronomeClock();
        check(Math.abs(clock[0] - 0.05 * SR) < 1e-6 && clock[1] == 0 && clock[3] == 0.5, "the first beat is 50 ms in, 0.5 s per beat");
        float[] l = render(m, 4.2)[0];
        List<Integer> on = onsets(l);
        int lead = firstSound(clicks.get("wood")[2]);
        boolean exact = on.size() == 9;
        for (int k = 0; k < on.size() && exact; k++) exact = Math.abs(on.get(k) - (2400 + k * 24000 + lead)) <= 1;
        check(exact, "9 beats in 4.2 s, each within a sample of its time (" + on.size() + " found)");
        // The downbeat is the strong click at the volume, the next a weak one.
        float[] strong = clicks.get("wood")[2], weak = clicks.get("wood")[0];
        double e1 = 0, e2 = 0;
        for (int i = 0; i < 2000; i++) {
            e1 = Math.max(e1, Math.abs(l[2400 + i] - 0.8 * strong[i]));
            e2 = Math.max(e2, Math.abs(l[2400 + 24000 + i] - 0.8 * weak[i]));
        }
        check(e1 < 1e-3 && e2 < 1e-3, "beat 1 is the strong click, beat 2 the weak one, at volume 0.8 (" + String.format("%.1e %.1e", e1, e2) + ")");
        m.metronomeStop();
        float[] after = render(m, 1)[0];
        double tail = 0;
        for (int i = 480; i < after.length; i++) tail = Math.max(tail, Math.abs(after[i]));
        check(tail == 0 && m.idle(), "Stop silences it within a buffer and the mixer goes idle");
    }

    static void metronomeTempoChange() {
        System.out.println("metronome: a new tempo counts from the next beat; the bar changes");
        PracticeMixer m = mixer();
        m.metronomeStart(120, new int[] {2, 0, 0}, 1);
        render(m, 1.0); // beats at 0.05, 0.55 (and the one at 1.05 is now next)
        m.metronomeUpdate(60, new int[] {2, 0}, 1);
        double[] c = m.metronomeClock();
        check(Math.abs(c[0] - (0.05 + 1.0) * SR) < 1e-6 && c[1] == 2 && c[2] == 2 % 2, "the next beat keeps its time; its place wraps into the new bar");
        float[] l = render(m, 3.0)[0];
        List<Integer> on = onsets(l);
        int lead = firstSound(clicks.get("wood")[2]);
        int first = (int) (0.05 * SR) + lead;
        check(on.size() == 3 && Math.abs(on.get(0) - first) <= 1 && Math.abs(on.get(1) - on.get(0) - 48000) <= 1,
            "then one beat a second (" + on + ")");
    }

    static double rms(float[] x, int from, int to) {
        double s = 0;
        for (int i = from; i < to; i++) s += x[i] * (double) x[i];
        return Math.sqrt(s / (to - from));
    }

    static float[][] refRender(String voice, int midi, boolean fifth, String mix) throws IOException {
        for (String[] r : refs) {
            if (r[1].equals(voice) && Integer.parseInt(r[2]) == midi && r[3].equals(fifth ? "1" : "0") && r[4].equals(mix)) return new float[][] {f32(r[5]), f32(r[6])};
        }
        throw new IOException("no reference " + voice + " " + midi);
    }

    static void droneLevels() throws IOException {
        System.out.println("drone: as loud as the web drone, with as much hall (steady part, 5-12 s)");
        int from = (int) (5 * SR), to = (int) (12 * SR);
        double worst = 0;
        for (String[] r : refs) {
            if (!r[4].equals("full")) continue;
            String voice = r[1];
            int midi = Integer.parseInt(r[2]);
            boolean fifth = r[3].equals("1");
            double[] ratios = new double[3];
            String[] mixes = {"full", "dry", "wet"};
            for (int k = 0; k < 3; k++) {
                PracticeMixer m = mixer();
                m.testNoWet = mixes[k].equals("dry");
                m.testNoDry = mixes[k].equals("wet");
                m.droneVolume(0.8);
                m.dronePlay(voice, midi, 440, fifth);
                float[][] n = render(m, 12);
                float[][] w = refRender(voice, midi, fifth, mixes[k]);
                ratios[k] = (rms(n[0], from, to) + rms(n[1], from, to)) / (rms(w[0], from, to) + rms(w[1], from, to));
            }
            double dry = 20 * Math.log10(ratios[1]);
            worst = Math.max(worst, Math.abs(dry));
            System.out.printf("    %-12s %d%s  full %+.1f dB  dry %+.1f dB  hall %+.1f dB%n", voice, midi, fifth ? "+5th" : "    ",
                20 * Math.log10(ratios[0]), dry, 20 * Math.log10(ratios[2]));
        }
        check(worst < 1.0, "the dry sound of every voice within 1 dB of the web drone (worst " + String.format("%.1f", worst) + " dB)");
        // The hall varies by note in both (a steady tone meets the reverb's peaks and dips), so compare it on average.
        Map<String, double[]> web = new HashMap<>();
        for (String l : Files.readAllLines(dir.resolve("webhall.txt"))) {
            String[] p = l.split(" ");
            web.put(p[0] + " " + p[1], new double[] {Double.parseDouble(p[2]), Double.parseDouble(p[3])});
        }
        int start = (int) (5 * SR);
        for (String voice : new String[] {"cello", "organ", "organ-synth"}) {
            double sum = 0;
            for (int midi = 36; midi <= 59; midi++) {
                double[] r = new double[2];
                for (int k = 0; k < 2; k++) {
                    PracticeMixer m = mixer();
                    m.testNoWet = k == 0;
                    m.testNoDry = k == 1;
                    m.droneVolume(0.8);
                    m.dronePlay(voice, midi, 440, false);
                    float[][] n = render(m, 9);
                    r[k] = rms(n[0], start, n[0].length) + rms(n[1], start, n[1].length);
                }
                double[] w = web.get(voice + " " + midi);
                sum += 20 * Math.log10(r[1] / r[0]) - 20 * Math.log10(w[1] / w[0]);
            }
            double mean = sum / 24;
            check(Math.abs(mean) < 1.5, voice + ": the hall against the dry sound, over all 24 notes, within 1.5 dB of the web's (" + String.format("%+.1f", mean) + " dB)");
        }
    }

    static void droneSeamless() {
        System.out.println("drone: no clicks where the loops wrap");
        for (String voice : new String[] {"cello", "organ", "organ-synth"}) {
            PracticeMixer m = mixer();
            m.testNoWet = true;
            m.dronePlay(voice, 43, 440, false);
            float[] l = render(m, 40)[0];
            // The sharpest change (second difference) after the fade-in, against the typical one.
            int from = (int) (6 * SR);
            double max = 0, sum = 0;
            for (int i = from + 2; i < l.length; i++) {
                double d = Math.abs(l[i] - 2 * l[i - 1] + l[i - 2]);
                max = Math.max(max, d);
                sum += d;
            }
            double mean = sum / (l.length - from - 2);
            check(max < 12 * mean, voice + ": the sharpest moment is " + String.format("%.1f", max / mean) + "x the typical (under 12x)");
        }
    }

    static void droneSchedule() {
        System.out.println("drone: a timed sequence moves on, then stops, by itself");
        PracticeMixer m = mixer();
        m.dronePlay("cello", 48, 440, false);
        m.droneSchedule(1.0, 2.0, new int[] {50, 52}, true);
        render(m, 1.2);
        double[] s = m.droneState();
        check(s[1] == 50 && s[2] == 1 && Math.abs(s[3] - 1.8) < 0.02, "after 1 s: D3, one change, 1.8 s to the next");
        render(m, 2.0);
        s = m.droneState();
        check(s[1] == 52 && s[2] == 2 && s[0] == 1, "after 3 s: E3");
        render(m, 2.0);
        s = m.droneState();
        check(s[0] == 0 && s[4] == 1, "after 5 s: stopped by its timer");
        render(m, 9);
        check(m.idle(), "faded out and the hall has rung out within 9 s");
        // A paused drone doesn't count down.
        m.dronePlay("cello", 48, 440, false);
        m.droneSchedule(1.0, 1.0, new int[0], true);
        render(m, 0.4);
        m.droneStop();
        render(m, 2);
        check(Math.abs(m.droneState()[3] - 0.6) < 0.02, "a stopped drone doesn't count down, and says how long was left");
        m.dronePlay("cello", 48, 440, false);
        render(m, 2);
        check(m.droneState()[0] == 1, "stopping cleared the schedule: playing again runs untimed");
    }

    static void droneSameNote() {
        System.out.println("drone: the same note again doesn't restart it; a new one crossfades");
        PracticeMixer m = mixer();
        m.dronePlay("organ", 50, 440, false);
        render(m, 1);
        m.dronePlay("organ", 50, 440, false);
        check(m.layerCount() == 1, "same note: one sound");
        m.dronePlay("organ", 52, 440, false);
        check(m.layerCount() == 2, "new note: the old fades out while the new fades in");
        render(m, 6);
        check(m.layerCount() == 1, "and the old one is gone after its fade");
    }

    /** The same scene the Swift test renders, so the two mixers can be compared sample for sample. */
    static void writeForSwift() throws IOException {
        PracticeMixer m = mixer();
        m.metronomeStart(132, new int[] {2, 0, 1, 0}, 0.7);
        m.dronePlay("cello-soft", 41, 442, true);
        float[] l = render(m, 6)[0];
        ByteBuffer b = ByteBuffer.allocate(l.length * 4).order(ByteOrder.LITTLE_ENDIAN);
        b.asFloatBuffer().put(l);
        Files.write(dir.resolve("java-render.f32"), b.array());
    }

    static void speed() {
        System.out.println("speed");
        PracticeMixer m = mixer();
        m.metronomeStart(200, new int[] {2, 0, 0, 0}, 1);
        m.dronePlay("cello", 40, 440, true);
        long t = System.nanoTime();
        render(m, 60);
        double sec = (System.nanoTime() - t) / 1e9;
        check(sec < 6, String.format("a minute of drone (with fifth) and metronome renders in %.2f s", sec));
    }
}
