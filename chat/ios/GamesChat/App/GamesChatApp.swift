import SwiftUI
import UIKit

@main
struct GamesChatApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var model = AppModel.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
                .preferredColorScheme(.dark)
        }
        .onChange(of: scenePhase) { phase in
            model.scenePhaseChanged(active: phase == .active)
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // PushKit has to be set up at every launch: iOS may launch the app in
        // the background just to deliver a ringing call.
        AppModel.shared.startPushAndCalls()
        return true
    }
}
