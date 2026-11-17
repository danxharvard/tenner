import SwiftUI
import UIKit

/// Runs the Waves transition: a picture of the screen is laid over the app, the change happens underneath, and the
/// picture ripples away from where you tapped (Waves.metal). Without Animations, or with Reduce Motion, it simply changes.
@Observable @MainActor
final class Waves {
    var snapshot: UIImage?
    var origin: CGPoint = .zero
    var started = Date()
    var size: CGSize = .zero
    var reach: CGFloat = 0
    let span: Double = 0.95
    private var run = 0

    func change(from point: CGPoint, animated: Bool, _ apply: @escaping () -> Void) {
        guard animated, !UIAccessibility.isReduceMotionEnabled, let window = UIApplication.shared.tnKeyWindow else { apply(); return }
        let bounds = window.bounds
        let picture = UIGraphicsImageRenderer(bounds: bounds).image { _ in
            _ = window.drawHierarchy(in: bounds, afterScreenUpdates: false)
        }
        let corners = [CGPoint.zero, CGPoint(x: bounds.width, y: 0), CGPoint(x: 0, y: bounds.height), CGPoint(x: bounds.width, y: bounds.height)]
        reach = corners.map { hypot($0.x - point.x, $0.y - point.y) }.max() ?? bounds.height
        snapshot = picture
        origin = point
        size = bounds.size
        started = Date()
        run += 1
        let mine = run
        // change the look on the next frame, under the picture of the old one
        DispatchQueue.main.async { apply() }
        DispatchQueue.main.asyncAfter(deadline: .now() + span + 0.1) { [weak self] in
            if self?.run == mine { self?.snapshot = nil }
        }
    }
}

struct WavesOverlay: View {
    @Environment(Waves.self) private var waves

    var body: some View {
        if let picture = waves.snapshot {
            TimelineView(.animation) { ctx in
                let t = ctx.date.timeIntervalSince(waves.started)
                Image(uiImage: picture)
                    .resizable()
                    .frame(width: waves.size.width, height: waves.size.height)
                    .layerEffect(ShaderLibrary.tennerWaves(.float2(waves.origin), .float(t), .float(waves.reach), .float(waves.span)),
                                 maxSampleOffset: CGSize(width: 30, height: 30))
            }
            .frame(width: waves.size.width, height: waves.size.height)
            .ignoresSafeArea()
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
    }
}
