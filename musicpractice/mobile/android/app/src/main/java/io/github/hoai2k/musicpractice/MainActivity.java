package io.github.hoai2k.musicpractice;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugin: the metronome and drone played natively (PracticeAudioPlugin).
        registerPlugin(PracticeAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
