package io.github.hoai2k.musicpractice;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

/**
 * Keeps the metronome and the drone playing with the screen off: Android
 * freezes apps in the background unless a foreground service with a
 * notification is running. The notification says what's playing and has a
 * Stop button.
 */
public class PracticeAudioService extends Service {
    private static final String CHANNEL = "playback";
    private static final int ID = 1;
    private static final String ACTION_STOP = "io.github.hoai2k.musicpractice.STOP";
    private static final String ACTION_UPDATE = "io.github.hoai2k.musicpractice.UPDATE";

    static void start(Context context) {
        ContextCompat.startForegroundService(context, new Intent(context, PracticeAudioService.class));
    }

    static void update(Context context) {
        try {
            context.startService(new Intent(context, PracticeAudioService.class).setAction(ACTION_UPDATE));
        } catch (RuntimeException ignored) {
            // not allowed from the background; the label updates next time
        }
    }

    static void stop(Context context) {
        context.stopService(new Intent(context, PracticeAudioService.class));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        PracticeAudioEngine engine = PracticeAudioEngine.existing();
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            if (engine != null) engine.stopAll("notification");
            return START_NOT_STICKY;
        }
        Notification n = notification(engine);
        if (intent != null && ACTION_UPDATE.equals(intent.getAction())) {
            getSystemService(NotificationManager.class).notify(ID, n);
        } else {
            ServiceCompat.startForeground(this, ID, n,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0);
        }
        return START_NOT_STICKY;
    }

    private Notification notification(PracticeAudioEngine engine) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Playing", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("While the metronome or the drone plays");
            ch.setShowBadge(false);
            getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, PracticeAudioService.class).setAction(ACTION_STOP), flags);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_practice)
            .setContentTitle(engine != null ? engine.label() : "Music Practice")
            .setContentText("Music Practice")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(0, "Stop", stop);
        Intent open = engine != null ? engine.launchIntent() : null;
        if (open != null) b.setContentIntent(PendingIntent.getActivity(this, 2, open, flags));
        return b.build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
