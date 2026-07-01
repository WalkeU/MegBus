//
//  ContentView.swift
//  MegBus
//
//  A gyökér nézet: a GameViewModel aktuális képernyője alapján vált a
//  lobby, a körök, a piramis, a buszozás és a játék végi nézetek között.
//

import SwiftUI

/// A backend szerver címe. Szimulátorból a Mac `localhost`-ja elérhető közvetlenül;
/// fizikai eszközön a Mac Tailscale-IP-jét használjuk, hogy ne kelljen ugyanazon a
/// LAN-on lenni — csak a Tailscale app fusson és legyen bejelentkezve mindkét eszközön.
private let backendServerURL = URL(string: "http://100.89.199.9:3000")!

struct ContentView: View {
    @StateObject private var viewModel = GameViewModel(connection: ContentView.makeConnection())

    /// A `socket.io-client-swift` package hozzáadása után (Xcode: File > Add Package
    /// Dependencies) automatikusan a valódi szerverkapcsolatra vált; addig — hogy a
    /// projekt package nélkül is forduljon — a MockGameConnection-t használja.
    private static func makeConnection() -> GameConnection {
        #if canImport(SocketIO)
        return SocketIOGameConnection(serverURL: backendServerURL)
        #else
        return MockGameConnection()
        #endif
    }

    var body: some View {
        Group {
            switch viewModel.screen {
            case .home:
                HomeView(viewModel: viewModel)
            case .lobby:
                LobbyView(viewModel: viewModel)
            case .round:
                RoundView(viewModel: viewModel)
            case .pyramid:
                PyramidView(viewModel: viewModel)
            case .bus:
                BusView(viewModel: viewModel)
            case .gameOver:
                GameOverView(viewModel: viewModel)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: viewModel.screen)
        .alert(
            "Hiba",
            isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )
        ) {
            Button("OK", role: .cancel) { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }
}

#Preview {
    ContentView()
}
