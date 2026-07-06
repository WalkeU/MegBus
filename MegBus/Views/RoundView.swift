import SwiftUI

struct RoundView: View {
    @ObservedObject var viewModel: GameViewModel

    private var activePlayerName: String {
        guard let activeId = viewModel.roomState?.activePlayerId else { return "" }
        return viewModel.roomState?.players.first(where: { $0.id == activeId })?.name ?? ""
    }

    var body: some View {
        VStack(spacing: AppTheme.spacing) {
            if let roundType = viewModel.currentRoundType {
                Text(roundType.title)
                    .font(.title2.bold())
                    .padding(.top, 24)
            }

            if viewModel.isMyTurn {
                Text("Te jössz")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.accent)
            } else {
                Text("\(activePlayerName) tippel…")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Spacer()

            if let card = viewModel.lastDrawnCard {
                VStack(spacing: 8) {
                    CardView(card: card)
                    if let correct = viewModel.lastGuessCorrect {
                        Text(correct ? "Helyes tipp" : "Hibás tipp")
                            .font(.headline)
                            .foregroundStyle(correct ? AppTheme.success : AppTheme.danger)
                    }
                }
            } else {
                CardView(card: Card(suit: .spades, rank: 2), faceDown: true)
            }

            Spacer()

            if let penaltyUnits = viewModel.pendingPenaltyUnits {
                penaltyPanel(units: penaltyUnits)
            } else if viewModel.isMyTurn, let roundType = viewModel.currentRoundType {
                GuessButtonsView(type: roundType, isBusy: viewModel.isBusy) { guess in
                    Task { await viewModel.submitGuess(guess) }
                }
            }

            myHandView
        }
        .padding(24)
        .appBackground()
    }

    private func penaltyPanel(units: Int) -> some View {
        VStack(spacing: 12) {
            Text("\(viewModel.penaltyLabel): \(units)")
                .font(.title3.bold())
                .foregroundStyle(AppTheme.danger)

            Button("Megvolt") {
                Task { await viewModel.acknowledgePenalty() }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(viewModel.isBusy)
        }
        .cardSurface()
    }

    private var myHandView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("A lapjaid")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)
            HStack {
                ForEach(viewModel.myHand) { card in
                    CardView(card: card)
                }
            }
        }
    }
}

#Preview {
    RoundView(viewModel: GameViewModel(connection: MockGameConnection()))
}
