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
    @State private var selectedRecipients: Set<String> = []
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
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(AppTheme.surfaceElevated)
                        .frame(width: 44, height: 64)
                }
            }
        }
    }

    private func playMatchPanel(card: Card) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Kinek osztod a büntetést?")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)

            ForEach(otherPlayers) { player in
                Button {
                    toggleRecipient(player.id)
                } label: {
                    HStack {
                        Text(player.name)
                        Spacer()
                        if selectedRecipients.contains(player.id) {
                            Image(systemName: "checkmark.circle.fill")
                        }
                    }
                }
                .buttonStyle(PrimaryButtonStyle(isProminent: selectedRecipients.contains(player.id)))
            }

            HStack(spacing: 12) {
                Button("Mégsem") {
                    Task {
                        await viewModel.cancelPyramidMatch()
                        cardToPlay = nil
                        selectedRecipients.removeAll()
                    }
                }
                .buttonStyle(PrimaryButtonStyle(isProminent: false))

                Button("Lerakás") {
                    Task {
                        await viewModel.playPyramidMatch(card, recipientPlayerIds: Array(selectedRecipients))
                        cardToPlay = nil
                        selectedRecipients.removeAll()
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(selectedRecipients.isEmpty)
            }
        }
        .cardSurface()
    }

    private var otherPlayers: [RoomPlayer] {
        (viewModel.roomState?.players ?? []).filter { $0.id != viewModel.myPlayerId }
    }

    private func toggleRecipient(_ id: String) {
        if selectedRecipients.contains(id) {
            selectedRecipients.remove(id)
        } else {
            selectedRecipients.insert(id)
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
