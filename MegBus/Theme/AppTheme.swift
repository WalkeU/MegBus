import SwiftUI

enum AppTheme {
    static let background = Color(red: 0.04, green: 0.04, blue: 0.06)
    static let surface = Color(red: 0.10, green: 0.10, blue: 0.13)
    static let surfaceElevated = Color(red: 0.15, green: 0.15, blue: 0.19)
    static let accent = Color(red: 0.40, green: 0.75, blue: 1.0)
    static let success = Color(red: 0.36, green: 0.82, blue: 0.55)
    static let danger = Color(red: 0.95, green: 0.36, blue: 0.42)
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.6)
    static let cardRed = Color(red: 0.92, green: 0.30, blue: 0.34)
    static let cardBlack = Color.white

    static let cornerRadius: CGFloat = 18
    static let spacing: CGFloat = 16
}

struct AppBackground: ViewModifier {
    func body(content: Content) -> some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()
            content
        }
        .preferredColorScheme(.dark)
    }
}

extension View {
    func appBackground() -> some View {
        modifier(AppBackground())
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var isProminent: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(isProminent ? Color.black : AppTheme.textPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isProminent ? AppTheme.accent : AppTheme.surfaceElevated)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadius, style: .continuous))
            .opacity(configuration.isPressed ? 0.7 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct CardSurface: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(AppTheme.spacing)
            .background(AppTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadius, style: .continuous))
    }
}

extension View {
    func cardSurface() -> some View {
        modifier(CardSurface())
    }
}
