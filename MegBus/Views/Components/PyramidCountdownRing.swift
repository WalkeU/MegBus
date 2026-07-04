import SwiftUI

/// Vizuális becslés a szerver 5mp-es automata piramis-fordítási ütemére — a szerver
/// az egyetlen tényleges időzítő (lásd backend `PYRAMID_FLIP_INTERVAL_MS`), ez csak
/// közelítő visszajelzés a felhasználónak. Minden új flip-re nulláról újraindul,
/// szünetel állapotban (nyugtázásra várva) megáll az aktuális állásban.
struct PyramidCountdownRing: View {
    let flipCount: Int
    let isPaused: Bool

    @State private var progress: CGFloat = 0
    @State private var tickTask: Task<Void, Never>?

    private let interval: TimeInterval = 5
    private let tickInterval: TimeInterval = 0.05

    var body: some View {
        ZStack {
            Circle()
                .stroke(AppTheme.surfaceElevated, lineWidth: 4)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(AppTheme.accent, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: 44, height: 44)
        .onAppear { restartTimer() }
        .onChange(of: flipCount) { _ in restartTimer() }
        .onChange(of: isPaused) { paused in
            if paused {
                tickTask?.cancel()
            } else {
                restartTimer()
            }
        }
        .onDisappear { tickTask?.cancel() }
    }

    private func restartTimer() {
        tickTask?.cancel()
        guard !isPaused else { return }
        progress = 0
        let steps = Int(interval / tickInterval)
        tickTask = Task {
            for step in 1...steps {
                if Task.isCancelled { return }
                try? await Task.sleep(nanoseconds: UInt64(tickInterval * 1_000_000_000))
                if Task.isCancelled { return }
                await MainActor.run {
                    progress = CGFloat(step) / CGFloat(steps)
                }
            }
        }
    }
}

#Preview {
    PyramidCountdownRing(flipCount: 0, isPaused: false)
        .appBackground()
}
