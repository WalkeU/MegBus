import SwiftUI

/// Szándékosan nem árulja el, hogy technikailag mi a baj (szerver nem elérhető,
/// időtúllépés stb.) — a felhasználó szemszögéből ez egy átmeneti, normális állapot.
struct MaintenanceView: View {
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: AppTheme.spacing) {
            Spacer()

            Text("🛠️")
                .font(.system(size: 48))

            Text("Karbantartás")
                .font(.title.bold())

            Text("Éppen egy rövid karbantartást végzünk. Próbáld újra néhány perc múlva.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)

            Spacer()

            Button("Újrapróbálom", action: onRetry)
                .buttonStyle(PrimaryButtonStyle())
        }
        .padding(24)
        .appBackground()
    }
}

#Preview {
    MaintenanceView(onRetry: {})
}
