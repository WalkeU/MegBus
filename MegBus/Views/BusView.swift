import SwiftUI

struct BusView: View {
    @ObservedObject var viewModel: GameViewModel

    private var riderName: String {
        guard let riderId = viewModel.busRiderId else { return "" }
        return viewModel.roomState?.players.first(where: { $0.id == riderId })?.name ?? ""
    }

    var body: some View {
        VStack(spacing: AppTheme.spacing) {
            Text("Buszozás")
                .font(.title2.bold())
                .padding(.top, 24)

            VStack(spacing: 4) {
                Text("A buszon ül:")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                Text(riderName)
                    .font(.system(size: 32, weight: .heavy, design: .rounded))
                    .foregroundStyle(AppTheme.accent)
            }
            .padding(.top, 12)

            Spacer()

            if viewModel.isBusRider {
                if let deckRemaining = viewModel.busDeckRemaining {
                    Text("Hátralévő lapok a pakliban: \(deckRemaining)")
                        .font(.footnote)
                        .foregroundStyle(AppTheme.textSecondary)
                }

                if !viewModel.busAttemptCards.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Eddig ebben a próbálkozásban")
                            .font(.footnote)
                            .foregroundStyle(AppTheme.textSecondary)
                        HStack {
                            ForEach(viewModel.busAttemptCards) { card in
                                CardView(card: card)
                            }
                        }
                    }
                }
            }

            if let result = viewModel.busLastResult {
                VStack(spacing: 8) {
                    // Helyes válasznál a lap már látszik az "eddig ebben a
                    // próbálkozásban" sorban feljebb — itt újra kirajzolni
                    // duplikáció lenne.
                    if !result.correct {
                        CardView(card: result.card)
                    }
                    Text(result.correct ? "Helyes — következő kérdés" : "Hibás — elölről kezdi")
                        .font(.headline)
                        .foregroundStyle(result.correct ? AppTheme.success : AppTheme.danger)
                }
            } else {
                CardView(card: Card(suit: .spades, rank: 2), faceDown: true)
            }

            Spacer()

            if viewModel.isBusRider {
                VStack(spacing: 12) {
                    Text(viewModel.currentBusQuestion.title)
                        .font(.headline)
                    GuessButtonsView(type: viewModel.currentBusQuestion, isBusy: viewModel.isBusy) { guess in
                        Task { await viewModel.answerBus(guess) }
                    }
                }
            } else {
                Text("Figyeld, ahogy \(riderName) végigmegy a kérdéseken.")
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(24)
        .appBackground()
    }
}

#Preview {
    BusView(viewModel: GameViewModel(connection: MockGameConnection()))
}
