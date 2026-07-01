import SwiftUI

struct GameOverView: View {
    @ObservedObject var viewModel: GameViewModel

    private var winnerName: String {
        guard let id = viewModel.winnerOfBusId else { return "" }
        return viewModel.roomState?.players.first(where: { $0.id == id })?.name ?? ""
    }

    var body: some View {
        VStack(spacing: AppTheme.spacing) {
            Spacer()

            Image(systemName: "flag.checkered")
                .font(.system(size: 48))
                .foregroundStyle(AppTheme.accent)

            Text("Vége a játéknak")
                .font(.title.bold())

            Text("\(winnerName) sikeresen kiszállt a buszból.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)

            Spacer()

            Button("Új kör") {
                Task { await viewModel.requestNewRound() }
            }
            .buttonStyle(PrimaryButtonStyle())

            Button("Kilépés") {
                Task { await viewModel.leaveRoom() }
            }
            .buttonStyle(PrimaryButtonStyle(isProminent: false))
        }
        .padding(24)
        .appBackground()
    }
}

#Preview {
    GameOverView(viewModel: GameViewModel(connection: MockGameConnection()))
}
