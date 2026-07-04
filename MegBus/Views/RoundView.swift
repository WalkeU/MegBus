import SwiftUI

struct RoundView: View {
    @ObservedObject var viewModel: GameViewModel

    private var activePlayerName: String {
        guard let activeId = viewModel.roomState?.activePlayerId else { return "" }
        return viewModel.roomState?.players.first(where: { $0.id == activeId })?.name ?? ""
    }

    private var roundTitle: String {
        switch viewModel.roomState?.phase {
        case .round1: return "Piros vagy fekete?"
        case .round2: return "Nagyobb vagy kisebb?"
        case .round3: return "Közte vagy kívül?"
        case .round4: return "Milyen szín?"
        default: return ""
        }
    }

    var body: some View {
        VStack(spacing: AppTheme.spacing) {
            Text(roundTitle)
                .font(.title2.bold())
                .padding(.top, 24)

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
            } else if viewModel.isMyTurn {
                guessButtons
            }

            myHandView
        }
        .padding(24)
        .appBackground()
    }

    @ViewBuilder
    private var guessButtons: some View {
        switch viewModel.roomState?.phase {
        case .round1:
            guessRow(options: [("Piros", "red"), ("Fekete", "black")])
        case .round2:
            guessRow(options: [("Kisebb", "smaller"), ("Nagyobb", "bigger")])
        case .round3:
            guessRow(options: [("Kívül", "outside"), ("Közte", "between")])
        case .round4:
            VStack(spacing: 10) {
                ForEach(Suit.allCases) { suit in
                    Button {
                        Task { await viewModel.submitGuess(suit.rawValue) }
                    } label: {
                        Text("\(suit.symbol) \(suit.displayName)")
                    }
                    .buttonStyle(PrimaryButtonStyle(isProminent: false))
                }
            }
        default:
            EmptyView()
        }
    }

    private func guessRow(options: [(String, String)]) -> some View {
        HStack(spacing: 12) {
            ForEach(options, id: \.1) { label, value in
                Button {
                    Task { await viewModel.submitGuess(value) }
                } label: {
                    Text(label)
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
        .disabled(viewModel.isBusy)
    }

    private func penaltyPanel(units: Int) -> some View {
        VStack(spacing: 12) {
            Text("Igyál \(units) kortyot!")
                .font(.title3.bold())
                .foregroundStyle(AppTheme.danger)

            Button("Megittam") {
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
