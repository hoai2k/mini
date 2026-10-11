import UIKit

/// Presents UIKit screens (the contact picker, Messages, the share sheet)
/// from the top of the app. The contact picker in particular only works when
/// presented this way, not wrapped inside a SwiftUI sheet.
@MainActor
enum Presenter {
    /// Keeps a delegate alive while its screen is up.
    private static var retained: [ObjectIdentifier: AnyObject] = [:]

    static func present(_ vc: UIViewController, keeping delegate: AnyObject? = nil) {
        guard let top = topController() else { return }
        if let delegate { retained[ObjectIdentifier(vc)] = delegate }
        if let pop = vc.popoverPresentationController {   // iPad share sheets
            pop.sourceView = top.view
            pop.sourceRect = CGRect(x: top.view.bounds.midX, y: top.view.bounds.midY, width: 0, height: 0)
            pop.permittedArrowDirections = []
        }
        top.present(vc, animated: true)
    }

    static func release(_ vc: UIViewController) {
        retained[ObjectIdentifier(vc)] = nil
    }

    private static func topController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive } ?? UIApplication.shared.connectedScenes.first as? UIWindowScene
        var top = scene?.windows.first { $0.isKeyWindow }?.rootViewController ?? scene?.windows.first?.rootViewController
        while let next = top?.presentedViewController { top = next }
        return top
    }
}
