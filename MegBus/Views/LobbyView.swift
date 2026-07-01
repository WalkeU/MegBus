import SwiftUI

struct LobbyView: View {
    @ObservedObject var viewModel: GameViewModel
    @State private var isReady = false

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.spacing) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Szoba")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                Text(viewModel.roomState?.code ?? "------")
                    .font(.system(size: 34, weight: .heavy, design: .rounded))
                    .foregroundStyle(AppTheme.accent)
            }

            Text("Oszd meg a kódot a többiekkel. A játék akkor indul, ha mindenki ready.")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)

            VStack(spacing: 10) {
                ForEach(viewModel.roomState?.players ?? []) { player in
                    PlayerBadge(player: player)
                }
            }
            .padding(.top, 8)

            Spacer()

            Button {
                isReady.toggle()
                Task { await viewModel.setReady(isReady) }
            } label: {
                Text(isReady ? "Mégsem vagyok kész" : "Ready")
            }
            .buttonStyle(PrimaryButtonStyle(isProminent: !isReady))
            .disabled(viewModel.isBusy)

            Button(role: .destructive) {
                Task { await viewModel.leaveRoom() }
            } label: {
                Text("Kilépés")
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(24)
        .appBackground()
    }
}

#Preview {
    LobbyView(viewModel: GameViewModel(connection: MockGameConnection()))
}
