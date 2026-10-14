import Capacitor
import UIKit

/// The app's one screen: Capacitor's web view, plus the app's own plugin
/// (the metronome and drone played natively, PracticeAudioPlugin).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PracticeAudioPlugin())
    }
}
