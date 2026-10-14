package io.github.hoai2k.musicpractice;

import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTimestamp;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import java.util.Arrays;

/**
 * The output for PracticeMixer: an AudioTrack fed by its own thread, audio
 * focus (a call pauses it), and the foreground service that keeps it playing
 * with the screen off. It runs while the metronome or the drone plays, and
 * stops itself a couple of seconds after both have gone quiet.
 */
final class PracticeAudioEngine {
    interface Listener {
        /** Stopped from outside the app: "all" (the notification's Stop, another app taking the sound). */
        void onStopped(String what);
    }

    private static PracticeAudioEngine instance;

    static synchronized PracticeAudioEngine get(Context context) {
        if (instance == null) instance = new PracticeAudioEngine(context.getApplicationContext());
        return instance;
    }

    static synchronized PracticeAudioEngine existing() {
        return instance;
    }

    private static final int BLOCK = 480; // frames per write
    final PracticeMixer mixer;
    final int sampleRate;
    private final Context context;
    private final AudioManager audioManager;
    private final Handler main = new Handler(Looper.getMainLooper());
    Listener listener;

    private AudioTrack track;
    private Thread thread;
    private volatile boolean running;
    private volatile boolean muted; // a call or a notification sound has the output for a moment
    private long frameOffset; // the mixer's frame when the track started
    private AudioFocusRequest focusRequest;
    private String metronomeLabel = "", droneLabel = "";

    private PracticeAudioEngine(Context context) {
        this.context = context;
        audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        int rate = 48000;
        try {
            String p = audioManager.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE);
            if (p != null) rate = Integer.parseInt(p);
        } catch (RuntimeException ignored) {
            // keep 48 kHz
        }
        sampleRate = rate;
        mixer = new PracticeMixer(rate);
    }

    // ------------------------------------------------------------ labels for the notification

    void setLabels(String metronome, String drone) {
        if (metronome != null) metronomeLabel = metronome;
        if (drone != null) droneLabel = drone;
        if (running) PracticeAudioService.update(context);
    }

    String label() {
        boolean met = mixer.metronomeRunning(), drone = mixer.dronePlaying();
        if (met && drone) return metronomeLabel + " · " + droneLabel;
        if (met) return metronomeLabel;
        if (drone) return droneLabel;
        return "Music Practice";
    }

    // ------------------------------------------------------------ running

    /** Start the output (from a tap in the app). */
    synchronized void ensureRunning() {
        if (running) {
            PracticeAudioService.update(context);
            return;
        }
        requestFocus();
        int min = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_FLOAT);
        int bytes = Math.max(min * 4, (int) (sampleRate * 0.1) * 8);
        track = new AudioTrack.Builder()
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build())
            .setAudioFormat(new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                .setSampleRate(sampleRate)
                .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                .build())
            .setBufferSizeInBytes(bytes)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build();
        frameOffset = mixer.frame();
        track.play();
        running = true;
        thread = new Thread(this::loop, "PracticeAudio");
        thread.setPriority(Thread.MAX_PRIORITY);
        thread.start();
        PracticeAudioService.start(context);
    }

    private void loop() {
        android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO);
        float[] buf = new float[BLOCK * 2];
        long idleSince = 0;
        AudioTrack t = track;
        while (running) {
            mixer.render(buf, BLOCK);
            if (muted) Arrays.fill(buf, 0);
            t.write(buf, 0, buf.length, AudioTrack.WRITE_BLOCKING);
            if (mixer.idle()) {
                long now = System.currentTimeMillis();
                if (idleSince == 0) idleSince = now;
                else if (now - idleSince > 2000) {
                    main.post(this::stopIfIdle);
                    idleSince = now;
                }
            } else {
                idleSince = 0;
            }
        }
    }

    private synchronized void stopIfIdle() {
        if (running && mixer.idle()) shutdown();
    }

    private synchronized void shutdown() {
        running = false;
        try {
            if (thread != null) thread.join(500);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
        if (track != null) {
            try {
                track.stop();
            } catch (IllegalStateException ignored) {
                // already stopped
            }
            track.release();
            track = null;
        }
        abandonFocus();
        PracticeAudioService.stop(context);
    }

    /** Stop everything from outside the app (the notification, losing the sound to another app). */
    void stopAll(String why) {
        mixer.stopAll();
        if (listener != null) main.post(() -> listener.onStopped("all"));
    }

    // ------------------------------------------------------------ timing

    /** When frame `frame` of the mixer is heard, in milliseconds of the system clock (as Date.now()). */
    double heardAtMs(double frame) {
        AudioTrack t = track;
        long nowNano = System.nanoTime();
        double nowMs = System.currentTimeMillis();
        if (t == null) return nowMs + (frame - mixer.frame()) / sampleRate * 1000;
        double trackFrame = frame - frameOffset;
        AudioTimestamp ts = new AudioTimestamp();
        if (t.getTimestamp(ts) && ts.nanoTime > 0) {
            double heardNano = ts.nanoTime + (trackFrame - ts.framePosition) / sampleRate * 1e9;
            return nowMs + (heardNano - nowNano) / 1e6;
        }
        // No timestamp yet: from the playback head, plus a typical output delay.
        long head = t.getPlaybackHeadPosition() & 0xffffffffL;
        return nowMs + (trackFrame - head) / sampleRate * 1000 + 20;
    }

    // ------------------------------------------------------------ audio focus

    private final AudioManager.OnAudioFocusChangeListener focusListener = (change) -> {
        if (change == AudioManager.AUDIOFOCUS_LOSS) {
            stopAll("focus");
        } else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            muted = true;
        } else if (change == AudioManager.AUDIOFOCUS_GAIN) {
            muted = false;
        }
    };

    private void requestFocus() {
        muted = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build())
                .setOnAudioFocusChangeListener(focusListener, main)
                .build();
            audioManager.requestAudioFocus(focusRequest);
        } else {
            audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void abandonFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest != null) audioManager.abandonAudioFocusRequest(focusRequest);
        } else {
            audioManager.abandonAudioFocus(focusListener);
        }
    }

    /** Opens the app (the notification's tap). */
    Intent launchIntent() {
        Intent i = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (i != null) i.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return i;
    }
}
