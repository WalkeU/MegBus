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
                    CardView(card: result.card)
                    Text(result.correct ? "Helyes — következő kérdés" : "Hibás — elölről kezdi")
                        .font(.headline)
                        .foregroundStyle(result.correct ? AppTheme.success : AppTheme.danger)
                }
            }

            Spacer()

            if viewModel.isBusRider {
                VStack(spacing: 12) {
                    Text(viewModel.currentBusQuestion.title)
                        .font(.headline)
                    questionButtons(for: viewModel.currentBusQuestion)
                }
            } else {
                Text("Figyeld, ahogy \(riderName) végigmegy a négy kérdésen.")
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(24)
        .appBackground()
    }

    @ViewBuilder
    private func questionButtons(for question: BusQuestion) -> some View {
        switch question {
        case .redBlack:
            guessRow([("Piros", "red"), ("Fekete", "black")])
        case .biggerSmaller:
            guessRow([("Kisebb", "smaller"), ("Nagyobb", "bigger")])
        case .betweenOutside:
            guessRow([("Kívül", "outside"), ("Közte", "between")])
        case .suit:
            VStack(spacing: 10) {
                ForEach(Suit.allCases) { suit in
                    Button {
                        Task { await viewModel.answerBus(suit.rawValue) }
                    } label: {
                        Text("\(suit.symbol) \(suit.displayName)")
                    }
                    .buttonStyle(PrimaryButtonStyle(isProminent: false))
                }
            }
        }
    }

    private func guessRow(_ options: [(String, String)]) -> some View {
        HStack(spacing: 12) {
            ForEach(options, id: \.1) { label, value in
                Button {
                    Task { await viewModel.answerBus(value) }
                } label: {
                    Text(label)
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
        .disabled(viewModel.isBusy)
    }
}

#Preview {
    BusView(viewModel: GameViewModel(connection: MockGameConnection()))
}
