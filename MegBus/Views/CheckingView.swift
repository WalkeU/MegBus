import SwiftUI

/// Rövid, semleges felület, amíg a `GameViewModel` eldönti (health-check),
/// hogy a Home vagy a karbantartás-képernyő jelenjen-e meg.
struct CheckingView: View {
    var body: some View {
        VStack {
            Text("MegBus")
                .font(.system(size: 40, weight: .heavy, design: .rounded))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .appBackground()
    }
}

#Preview {
    CheckingView()
}
