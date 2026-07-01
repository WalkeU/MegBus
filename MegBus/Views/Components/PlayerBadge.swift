import SwiftUI

struct PlayerBadge: View {
    let player: RoomPlayer
    var isActive: Bool = false

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(player.connected ? AppTheme.success : AppTheme.danger)
                .frame(width: 8, height: 8)

            Text(player.name)
                .font(.subheadline.weight(isActive ? .bold : .regular))
                .foregroundStyle(AppTheme.textPrimary)

            Spacer()

            if player.ready {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(AppTheme.success)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(isActive ? AppTheme.accent.opacity(0.18) : AppTheme.surfaceElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            if isActive {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(AppTheme.accent, lineWidth: 1.5)
            }
        }
    }
}
