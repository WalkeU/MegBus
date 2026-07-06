import SwiftUI

/// Kör-típustól függő tippgomb-készlet — a Round és a Bus képernyő is ezt használja,
/// hogy a testre szabott kör-lista bármelyik típusnál ugyanúgy nézzen ki.
struct GuessButtonsView: View {
    let type: RoundType
    let isBusy: Bool
    let onGuess: (RoundGuessValue) -> Void

    private static let exactRanks: [Rank] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    private static let rankColumns = [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        switch type {
        case .redBlack:
            guessRow([("Piros", "red"), ("Fekete", "black")])
        case .biggerSmaller:
            guessRow([("Kisebb", "smaller"), ("Nagyobb", "bigger")])
        case .betweenOutside:
            guessRow([("Kívül", "outside"), ("Közte", "between")])
        case .seenBefore:
            guessRow([("Nem", "no"), ("Igen", "yes")])
        case .suit:
            VStack(spacing: 10) {
                ForEach(Suit.allCases) { suit in
                    Button {
                        onGuess(.text(suit.rawValue))
                    } label: {
                        Text("\(suit.symbol) \(suit.displayName)")
                    }
                    .buttonStyle(PrimaryButtonStyle(isProminent: false))
                }
            }
            .disabled(isBusy)
        case .exactRank:
            LazyVGrid(columns: Self.rankColumns, spacing: 8) {
                ForEach(Self.exactRanks, id: \.self) { rank in
                    Button {
                        onGuess(.rank(rank))
                    } label: {
                        Text(RankFormat.label(rank))
                    }
                    .buttonStyle(PrimaryButtonStyle(isProminent: false))
                }
            }
            .disabled(isBusy)
        }
    }

    private func guessRow(_ options: [(String, String)]) -> some View {
        HStack(spacing: 12) {
            ForEach(options, id: \.1) { label, value in
                Button {
                    onGuess(.text(value))
                } label: {
                    Text(label)
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
        .disabled(isBusy)
    }
}

#Preview {
    GuessButtonsView(type: .exactRank, isBusy: false, onGuess: { _ in })
        .padding()
        .appBackground()
}
