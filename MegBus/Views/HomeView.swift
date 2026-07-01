import SwiftUI

struct HomeView: View {
    @ObservedObject var viewModel: GameViewModel

    @State private var playerName = ""
    @State private var roomCode = ""
    @State private var mode: Mode = .create

    enum Mode { case create, join }

    var body: some View {
        VStack(spacing: AppTheme.spacing) {
            Spacer()

            VStack(spacing: 4) {
                Text("MegBus")
                    .font(.system(size: 40, weight: .heavy, design: .rounded))
                Text("Buszozás — valós időben, közös eszköz nélkül")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.bottom, AppTheme.spacing)

            Picker("Mód", selection: $mode) {
                Text("Szoba létrehozása").tag(Mode.create)
                Text("Csatlakozás").tag(Mode.join)
            }
            .pickerStyle(.segmented)

            VStack(spacing: 12) {
                TextField("A neved", text: $playerName)
                    .textFieldStyle(.plain)
                    .padding()
                    .background(AppTheme.surface)
                    .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadius, style: .continuous))
                    .autocorrectionDisabled()

                if mode == .join {
                    TextField("Szobakód (pl. AB12CD)", text: $roomCode)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(AppTheme.surface)
                        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadius, style: .continuous))
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.characters)
                }
            }

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(AppTheme.danger)
            }

            Button {
                Task {
                    if mode == .create {
                        await viewModel.createRoom(playerName: playerName)
                    } else {
                        await viewModel.joinRoom(code: roomCode.uppercased(), playerName: playerName)
                    }
                }
            } label: {
                Text(mode == .create ? "Szoba létrehozása" : "Csatlakozás")
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(playerName.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isBusy)

            Spacer()
            Spacer()
        }
        .padding(24)
        .appBackground()
    }
}

#Preview {
    HomeView(viewModel: GameViewModel(connection: MockGameConnection()))
}
