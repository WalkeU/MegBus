import SwiftUI

struct LobbyView: View {
    @ObservedObject var viewModel: GameViewModel
    @State private var isReady = false
    @State private var penaltyLabelDraft = ""
    @State private var settingsOpen = false

    private var canSavePenaltyLabel: Bool {
        let trimmed = penaltyLabelDraft.trimmingCharacters(in: .whitespaces)
        return viewModel.isHost && !trimmed.isEmpty && trimmed != viewModel.penaltyLabel && !viewModel.isBusy
    }

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

            VStack(alignment: .leading, spacing: 10) {
                Text("Büntetés neve")
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textSecondary)

                if viewModel.isHost {
                    TextField(viewModel.penaltyLabel, text: $penaltyLabelDraft)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(AppTheme.surfaceElevated)
                        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadius, style: .continuous))
                        .autocorrectionDisabled()

                    Button("Mentés") {
                        Task { await viewModel.setPenaltyLabel(penaltyLabelDraft.trimmingCharacters(in: .whitespaces)) }
                    }
                    .buttonStyle(PrimaryButtonStyle(isProminent: false))
                    .disabled(!canSavePenaltyLabel)
                } else {
                    Text(viewModel.penaltyLabel)
                        .font(.headline)
                }
            }
            .cardSurface()
            .onAppear { penaltyLabelDraft = viewModel.penaltyLabel }

            if viewModel.isHost {
                Button("Játékbeállítások") { settingsOpen = true }
                    .buttonStyle(PrimaryButtonStyle(isProminent: false))
            }

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
        .sheet(isPresented: $settingsOpen) {
            GameSettingsView(viewModel: viewModel)
        }
    }
}

#Preview {
    LobbyView(viewModel: GameViewModel(connection: MockGameConnection()))
}
