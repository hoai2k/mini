package io.github.hoai2k.musicpractice;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.ShortBuffer;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * PracticeAudio: the metronome and the drone, played natively so they keep
 * going with the screen locked. Called from app/src/nativeaudio.js; the iOS
 * app has the same plugin (ios/App/App/PracticeAudioPlugin.swift).
 */
@CapacitorPlugin(name = "PracticeAudio")
public class PracticeAudioPlugin extends Plugin {
    private PracticeAudioEngine engine;

    @Override
    public void load() {
        engine = PracticeAudioEngine.get(getContext());
        engine.listener = (what) -> {
            JSObject data = new JSObject();
            data.put("what", what);
            notifyListeners("stopped", data);
        };
    }

    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        r.put("sampleRate", engine.sampleRate);
        call.resolve(r);
    }

    // ------------------------------------------------------------ metronome

    @PluginMethod
    public void metronomeStart(PluginCall call) {
        setClicks(call);
        engine.mixer.metronomeStart(call.getDouble("bpm", 120.0), ints(call.getArray("strengths")), call.getInt("subdivision", 1), call.getDouble("volume", 0.8));
        engine.setLabels(call.getString("label"), null);
        askForNotifications();
        engine.ensureRunning();
        call.resolve();
    }

    @PluginMethod
    public void metronomeUpdate(PluginCall call) {
        setClicks(call);
        engine.mixer.metronomeUpdate(call.getDouble("bpm", 120.0), ints(call.getArray("strengths")), call.getInt("subdivision", 1), call.getDouble("volume", 0.8));
        engine.setLabels(call.getString("label"), null);
        call.resolve();
    }

    @PluginMethod
    public void metronomeStop(PluginCall call) {
        engine.mixer.metronomeStop();
        engine.setLabels(null, null);
        call.resolve();
    }

    @PluginMethod
    public void metronomeClock(PluginCall call) {
        JSObject r = new JSObject();
        boolean running = engine.mixer.metronomeRunning();
        r.put("running", running);
        if (running) {
            double[] c = engine.mixer.metronomeClock();
            r.put("nextBeatAt", engine.heardAtMs(c[0]));
            r.put("nextCount", (long) c[1]);
            r.put("nextBeat", (int) c[2]);
            r.put("period", c[3]);
        }
        call.resolve(r);
    }

    private void setClicks(PluginCall call) {
        JSArray clicks = call.getArray("clicks");
        if (clicks == null || clicks.length() < 3) return;
        try {
            engine.mixer.setClicks(decode(clicks.getString(0)), decode(clicks.getString(1)), decode(clicks.getString(2)),
                clicks.length() > 3 ? decode(clicks.getString(3)) : null, call.getDouble("clickRate", (double) engine.sampleRate));
        } catch (JSONException ignored) {
            // keep the clicks it has
        }
    }

    // ------------------------------------------------------------ drone

    @PluginMethod
    public void hasVoice(PluginCall call) {
        JSObject r = new JSObject();
        r.put("loaded", engine.mixer.hasVoice(call.getString("id", "")));
        call.resolve(r);
    }

    @PluginMethod
    public void loadVoice(PluginCall call) {
        JSArray list = call.getArray("loops");
        if (list == null || list.length() == 0) {
            call.reject("no loops");
            return;
        }
        try {
            PracticeMixer.Loop[] loops = new PracticeMixer.Loop[list.length()];
            for (int i = 0; i < loops.length; i++) {
                JSONObject l = list.getJSONObject(i);
                loops[i] = new PracticeMixer.Loop(l.getDouble("hz"), l.getDouble("sampleRate"), l.getInt("channels"), decode(l.getString("data")));
            }
            engine.mixer.loadVoice(call.getString("id", ""), new PracticeMixer.Voice(
                call.getDouble("level", 1.0), call.getDouble("wet", 0.3), call.getDouble("lowpass", 0.0), call.getDouble("maxShift", 4.0), loops));
            call.resolve();
        } catch (JSONException e) {
            call.reject("bad loops", e);
        }
    }

    @PluginMethod
    public void dronePlay(PluginCall call) {
        PracticeMixer m = engine.mixer;
        m.droneVolume(call.getDouble("volume", 0.8));
        boolean ok = m.dronePlay(call.getString("voice", ""), call.getInt("midi", 48), call.getDouble("a4", 440.0), call.getBoolean("fifth", false));
        if (!ok) {
            call.reject("voice not loaded");
            return;
        }
        JSObject s = call.getObject("schedule");
        if (s != null) {
            m.droneSchedule(s.optDouble("first", -1), s.optDouble("interval", 60), ints(s.optJSONArray("notes")), s.optBoolean("stopAtEnd", false));
        } else {
            m.droneSchedule(-1, 0, null, false);
        }
        engine.setLabels(null, call.getString("label", "Drone"));
        askForNotifications();
        engine.ensureRunning();
        call.resolve();
    }

    @PluginMethod
    public void droneStop(PluginCall call) {
        engine.mixer.droneStop();
        engine.setLabels(null, null);
        call.resolve();
    }

    @PluginMethod
    public void droneVolume(PluginCall call) {
        engine.mixer.droneVolume(call.getDouble("volume", 0.8));
        call.resolve();
    }

    @PluginMethod
    public void droneState(PluginCall call) {
        double[] s = engine.mixer.droneState();
        JSObject r = new JSObject();
        r.put("playing", s[0] == 1);
        r.put("midi", (int) s[1]);
        r.put("changes", (int) s[2]);
        r.put("remaining", s[3]);
        r.put("stoppedByTimer", s[4] == 1);
        call.resolve(r);
    }

    // ------------------------------------------------------------ helpers

    /** Android 13+: the notification (with its Stop button) needs permission; asked once. */
    private void askForNotifications() {
        if (Build.VERSION.SDK_INT < 33 || getActivity() == null) return;
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        SharedPreferences prefs = getContext().getSharedPreferences("practiceaudio", 0);
        if (prefs.getBoolean("askedNotifications", false)) return;
        prefs.edit().putBoolean("askedNotifications", true).apply();
        ActivityCompat.requestPermissions(getActivity(), new String[] {Manifest.permission.POST_NOTIFICATIONS}, 4711);
    }

    private static int[] ints(org.json.JSONArray a) {
        if (a == null) return new int[0];
        int[] out = new int[a.length()];
        for (int i = 0; i < out.length; i++) out[i] = a.optInt(i);
        return out;
    }

    /** base64 16-bit little-endian samples to floats. */
    private static float[] decode(String b64) {
        byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
        ShortBuffer s = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer();
        float[] out = new float[s.remaining()];
        for (int i = 0; i < out.length; i++) {
            short v = s.get(i);
            out[i] = v / (v < 0 ? 32768f : 32767f);
        }
        return out;
    }
}
