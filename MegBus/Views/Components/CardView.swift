import SwiftUI

struct CardView: View {
    let card: Card
    var faceDown: Bool = false

    var body: some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(faceDown ? AppTheme.surfaceElevated : Color.white)
            .frame(width: 64, height: 92)
            .overlay {
                if faceDown {
                    Image(systemName: "questionmark")
                        .foregroundStyle(AppTheme.textSecondary)
                        .font(.title3)
                } else {
                    VStack(spacing: 2) {
                        Text(card.label)
                            .font(.headline)
                        Text(card.suit.symbol)
                            .font(.title3)
                    }
                    .foregroundStyle(card.suit.isRed ? AppTheme.cardRed : Color.black)
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Color.black.opacity(0.15), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.4), radius: 6, y: 3)
    }
}

#Preview {
    HStack {
        CardView(card: Card(suit: .hearts, rank: 12))
        CardView(card: Card(suit: .spades, rank: 14))
        CardView(card: Card(suit: .clubs, rank: 9), faceDown: true)
    }
    .padding()
    .appBackground()
}
