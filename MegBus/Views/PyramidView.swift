import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

private let pyramidRowSizes = [5, 4, 3, 2, 1]

private func revealIndexRange(forRowValue rowValue: Int) -> Range<Int> {
    var start = 0
    for size in pyramidRowSizes[0..<(rowValue - 1)] { start += size }
    return start..<(start + pyramidRowSizes[rowValue - 1])
}

/// Vízszintes rázás-animáció rossz lapra koppintás visszajelzésére.
private struct ShakeEffect: GeometryEffect {
    var amount: CGFloat = 8
    var shakesPerUnit = 3
    var animatableData: CGFloat

    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(
            translationX: amount * sin(animatableData * .pi * CGFloat(shakesPerUnit)),
            y: 0
        ))
    }
}

struct PyramidView: View {
    @ObservedObject var viewModel: GameViewModel
    @State private var cardToPlay: Card?
    /// playerId → hány kortyot kap — a felhasználó szabadon dönti el, kinek mennyit ad.
    @State private var amounts: [String: Int] = [:]
    @State private var shakingCardID: String?
    @State private var shakeAttempts: CGFloat = 0

    var body: some View {
        VStack(spacing: AppTheme.spacing) {
            Text("Piramis")
                .font(.title2.bold())
                .padding(.top, 24)

            Text("Figyeld a lapjaidat — ha egyezik valamelyik a felfordult lappal, koppints rá alul.")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)

            if viewModel.pyramidFlips.count < 15 {
                PyramidCountdownRing(
                    flipCount: viewModel.pyramidFlips.count,
                    isPaused: viewModel.pendingPyramidDrinkUnits != nil || cardToPlay != nil
                )
            }

            if let units = viewModel.pendingPyramidDrinkUnits {
                pyramidDrinkPanel(units: units)
            }

            Spacer()

            VStack(spacing: 8) {
                ForEach((1...5).reversed(), id: \.self) { rowValue in
                    pyramidRow(rowValue: rowValue)
                }
            }

            Spacer()

            if let card = cardToPlay {
                playMatchPanel(card: card)
            }

            myHandView
        }
        .padding(24)
        .appBackground()
    }

    private func pyramidRow(rowValue: Int) -> some View {
        let indices = revealIndexRange(forRowValue: rowValue)
        return HStack(spacing: 6) {
            ForEach(Array(indices), id: \.self) { revealIndex in
                if let flip = viewModel.pyramidFlips.first(where: { $0.revealIndex == revealIndex }) {
                    CardView(card: flip.card)
                        .frame(width: 44, height: 64)
                        .scaleEffect(0.7)
                } else {
                    CardView(card: Card(suit: .spades, rank: 2), faceDown: true)
                        .frame(width: 44, height: 64)
                        .scaleEffect(0.7)
                }
            }
        }
    }

    /// A jelenleg felül lévő piramis-lap sorértéke — ennyi korty-egység osztható szét,
    /// és legfeljebb ennyi (különböző) címzettnek adható belőle, egy-egy egész korty fejenként.
    private var currentRowValue: Int {
        viewModel.pyramidFlips.last?.rowValue ?? 1
    }

    private var totalAssigned: Int {
        amounts.values.reduce(0, +)
    }

    private func playMatchPanel(card: Card) -> some View {
        let rowValue = currentRowValue
        let remaining = rowValue - totalAssigned

        return VStack(alignment: .leading, spacing: 10) {
            Text("Kinek hány kortyot osztasz?")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
            Text("Kiosztva: \(totalAssigned) / \(rowValue) korty")
                .font(.footnote)
                .foregroundStyle(remaining == 0 ? AppTheme.success : AppTheme.textSecondary)

            ForEach(otherPlayers) { player in
                let amount = amounts[player.id] ?? 0
                HStack {
                    Text(player.name)
                    Spacer()
                    Button {
                        setAmount(for: player.id, to: amount - 1)
                    } label: {
                        Image(systemName: "minus.circle.fill")
                    }
                    .disabled(amount <= 0)

                    Text("\(amount)")
                        .font(.headline.monospacedDigit())
                        .frame(minWidth: 24)

                    Button {
                        setAmount(for: player.id, to: amount + 1)
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                    .disabled(remaining <= 0)
                }
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.vertical, 6)
            }

            HStack(spacing: 12) {
                Button("Mégsem") {
                    Task {
                        await viewModel.cancelPyramidMatch()
                        cardToPlay = nil
                        amounts.removeAll()
                    }
                }
                .buttonStyle(PrimaryButtonStyle(isProminent: false))

                Button("Lerakás") {
                    Task {
                        await viewModel.playPyramidMatch(card, distribution: amounts.filter { $0.value > 0 })
                        cardToPlay = nil
                        amounts.removeAll()
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(remaining != 0)
            }
        }
        .cardSurface()
    }

    private func pyramidDrinkPanel(units: Int) -> some View {
        VStack(spacing: 12) {
            Text("Igyál \(units) kortyot!")
                .font(.title3.bold())
                .foregroundStyle(AppTheme.danger)
            Text("A piramis addig nem folytatódik, amíg meg nem itta.")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)

            Button("Megittam") {
                Task { await viewModel.acknowledgePyramidDrink() }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(viewModel.isBusy)
        }
        .cardSurface()
    }

    private var otherPlayers: [RoomPlayer] {
        (viewModel.roomState?.players ?? []).filter { $0.id != viewModel.myPlayerId }
    }

    private func setAmount(for playerId: String, to newValue: Int) {
        let rowValue = currentRowValue
        let othersTotal = totalAssigned - (amounts[playerId] ?? 0)
        let clamped = max(0, min(newValue, rowValue - othersTotal))
        if clamped == 0 {
            amounts.removeValue(forKey: playerId)
        } else {
            amounts[playerId] = clamped
        }
    }

    /// A legutóbb felfordult piramis-lap értékéhez képest egyezik-e a megkoppintott lap.
    private func matchesTopFlip(_ card: Card) -> Bool {
        guard let topFlip = viewModel.pyramidFlips.last else { return false }
        return topFlip.card.rank == card.rank
    }

    private func handleTap(on card: Card) {
        guard matchesTopFlip(card) else {
            shakingCardID = card.id
            withAnimation(.default) { shakeAttempts += 1 }
            triggerHapticFeedback()
            return
        }
        cardToPlay = card
        Task { await viewModel.beginPyramidMatch() }
    }

    private func triggerHapticFeedback() {
        #if canImport(UIKit)
        UINotificationFeedbackGenerator().notificationOccurred(.error)
        #endif
    }

    private var myHandView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("A lapjaid — koppints, ha lerakod")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)
            HStack {
                ForEach(viewModel.myHand) { card in
                    Button {
                        handleTap(on: card)
                    } label: {
                        CardView(card: card)
                    }
                    .disabled(cardToPlay != nil)
                    .modifier(ShakeEffect(animatableData: shakingCardID == card.id ? shakeAttempts : 0))
                }
            }
        }
    }
}

#Preview {
    PyramidView(viewModel: GameViewModel(connection: MockGameConnection()))
}
