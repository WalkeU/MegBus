import SwiftUI

struct GameSettingsView: View {
    @ObservedObject var viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var rounds: [RoundDefinition] = defaultGameSettings.rounds
    @State private var pyramidRowPenalties: [Int] = defaultGameSettings.pyramidRowPenalties
    @State private var pyramidFlipIntervalMs: Int = defaultGameSettings.pyramidFlipIntervalMs
    @State private var pickerOpen = false
    @State private var errorText: String?

    private static let pyramidSpeedStepMs = 500

    private static let rowLabels = ["Alsó sor (5 lap)", "2. sor (4 lap)", "3. sor (3 lap)", "4. sor (2 lap)", "Csúcs (1 lap)"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppTheme.spacing) {
                    Text(
                        "Állítsd össze, milyen körök legyenek, milyen sorrendben, és mennyi büntetéssel — " +
                        "a buszozás ugyanezt a sorrendet fogja követni."
                    )
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textSecondary)

                    VStack(spacing: 10) {
                        ForEach(Array(rounds.enumerated()), id: \.offset) { index, round in
                            roundRow(index: index, round: round)
                        }
                    }

                    if pickerOpen {
                        pickerPanel
                    } else {
                        Button("Kör hozzáadása") { pickerOpen = true }
                            .buttonStyle(PrimaryButtonStyle(isProminent: false))
                            .disabled(rounds.count >= maxRounds)
                    }

                    Text("Piramis büntetései soronként")
                        .font(.headline)
                        .padding(.top, 8)

                    VStack(spacing: 10) {
                        ForEach(Array(Self.rowLabels.enumerated()), id: \.offset) { index, label in
                            pyramidStepperRow(index: index, label: label)
                        }
                    }

                    Text("Piramis fordítási sebessége")
                        .font(.headline)
                        .padding(.top, 8)

                    pyramidSpeedRow

                    if let errorText {
                        Text(errorText)
                            .font(.footnote)
                            .foregroundStyle(AppTheme.danger)
                    }
                }
                .padding(24)
            }
            .appBackground()
            .navigationTitle("Játékbeállítások")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Mégsem") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Mentés", action: save)
                        .disabled(viewModel.isBusy)
                }
            }
        }
        .onAppear {
            rounds = viewModel.gameSettings.rounds
            pyramidRowPenalties = viewModel.gameSettings.pyramidRowPenalties
            pyramidFlipIntervalMs = viewModel.gameSettings.pyramidFlipIntervalMs
        }
    }

    private var pyramidSpeedRow: some View {
        HStack {
            Text("Másodpercenként").font(.footnote).foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Stepper(
                value: pyramidSpeedBinding,
                in: minPyramidFlipIntervalMs...maxPyramidFlipIntervalMs,
                step: Self.pyramidSpeedStepMs
            ) {
                Text(String(format: "%.1f mp", Double(pyramidFlipIntervalMs) / 1000))
                    .font(.headline.monospacedDigit())
            }
            .fixedSize()
        }
        .cardSurface()
    }

    private var pyramidSpeedBinding: Binding<Int> {
        Binding(
            get: { pyramidFlipIntervalMs },
            set: { pyramidFlipIntervalMs = min(maxPyramidFlipIntervalMs, max(minPyramidFlipIntervalMs, $0)) }
        )
    }

    private func roundRow(index: Int, round: RoundDefinition) -> some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                Text("\(index + 1).").foregroundStyle(AppTheme.textSecondary)
                Text(round.type.shortLabel).font(.headline)
                Spacer()
                Button { moveRound(index, by: -1) } label: { Image(systemName: "arrow.up") }
                    .disabled(index == 0)
                Button { moveRound(index, by: 1) } label: { Image(systemName: "arrow.down") }
                    .disabled(index == rounds.count - 1)
                Button { removeRound(index) } label: { Image(systemName: "xmark.circle.fill") }
                    .foregroundStyle(AppTheme.danger)
                    .disabled(rounds.count <= 1)
            }
            HStack {
                Text("Büntetés").font(.footnote).foregroundStyle(AppTheme.textSecondary)
                Spacer()
                Stepper(value: penaltyBinding(for: index), in: 1...20) {
                    Text("\(round.penaltyUnits)").font(.headline.monospacedDigit())
                }
                .fixedSize()
            }
        }
        .cardSurface()
    }

    private var pickerPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Milyen típusú kört adjak hozzá?")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 130))], spacing: 8) {
                ForEach(RoundType.allCases, id: \.self) { type in
                    Button(type.shortLabel) { addRound(type) }
                        .buttonStyle(PrimaryButtonStyle(isProminent: false))
                }
            }
        }
        .cardSurface()
    }

    private func pyramidStepperRow(index: Int, label: String) -> some View {
        HStack {
            Text(label).font(.footnote).foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Stepper(value: pyramidPenaltyBinding(for: index), in: 1...20) {
                Text("\(pyramidRowPenalties[index])").font(.headline.monospacedDigit())
            }
            .fixedSize()
        }
        .cardSurface()
    }

    private func penaltyBinding(for index: Int) -> Binding<Int> {
        Binding(
            get: { rounds[index].penaltyUnits },
            set: { rounds[index] = RoundDefinition(type: rounds[index].type, penaltyUnits: max(1, $0)) }
        )
    }

    private func pyramidPenaltyBinding(for index: Int) -> Binding<Int> {
        Binding(
            get: { pyramidRowPenalties[index] },
            set: { pyramidRowPenalties[index] = max(1, $0) }
        )
    }

    private func moveRound(_ index: Int, by offset: Int) {
        let target = index + offset
        guard rounds.indices.contains(target) else { return }
        rounds.swapAt(index, target)
    }

    private func removeRound(_ index: Int) {
        guard rounds.count > 1 else { return }
        rounds.remove(at: index)
    }

    private func addRound(_ type: RoundType) {
        guard rounds.count < maxRounds else { return }
        rounds.append(RoundDefinition(type: type, penaltyUnits: 1))
        pickerOpen = false
    }

    private func save() {
        guard pyramidRowPenalties.count == 5 else { return }
        let settings = GameSettings(
            rounds: rounds, pyramidRowPenalties: pyramidRowPenalties, pyramidFlipIntervalMs: pyramidFlipIntervalMs
        )
        do {
            try validateGameSettings(settings)
        } catch {
            errorText = error.localizedDescription
            return
        }
        errorText = nil
        Task { await viewModel.setGameSettings(settings) }
        dismiss()
    }
}

#Preview {
    GameSettingsView(viewModel: GameViewModel(connection: MockGameConnection()))
}
