import Foundation

/// Hálózat nélküli, determinisztikus implementáció SwiftUI previewekhez és
/// helyi UI-fejlesztéshez — nem helyettesíti a valódi szerverkapcsolatot.
@MainActor
final class MockGameConnection: GameConnection {
    var onEvent: ((GameEvent) -> Void)?

    private let myPlayerId = "me"
    private let roomCode = "AB12CD"
    private var players: [RoomPlayer] = [
        RoomPlayer(id: "me", name: "Te", ready: false, connected: true),
        RoomPlayer(id: "p2", name: "Anna", ready: false, connected: true),
    ]

    func connect() async throws {}

    func createRoom(playerName: String) async throws -> (roomCode: String, playerId: String) {
        emitRoomUpdated(phase: .lobby)
        return (roomCode, myPlayerId)
    }

    func joinRoom(code: String, playerName: String) async throws -> String {
        emitRoomUpdated(phase: .lobby)
        return myPlayerId
    }

    func setReady(_ ready: Bool) async throws {
        if let index = players.firstIndex(where: { $0.id == myPlayerId }) {
            players[index].ready = ready
        }
        emitRoomUpdated(phase: .lobby)

        if players.allSatisfy(\.ready) {
            emitRoomUpdated(phase: .round1)
            onEvent?(.activePlayerChanged(playerId: myPlayerId, phase: .round1))
        }
    }

    func submitGuess(_ guess: String) async throws {
        onEvent?(.guessResolved(playerId: myPlayerId, card: Card(suit: .hearts, rank: 9), correct: true, penaltyUnits: 0))
    }

    func beginPyramidMatch() async throws {}

    func cancelPyramidMatch() async throws {}

    func playPyramidMatch(card: Card, recipientPlayerIds: [String]) async throws {
        onEvent?(.pyramidMatchPlayed(playerId: myPlayerId, card: card, distribution: ["p2": 1]))
    }

    func answerBus(_ guess: String) async throws {
        onEvent?(.busQuestionResolved(
            riderId: myPlayerId, question: .redBlack, card: Card(suit: .spades, rank: 4),
            correct: true, exitedBus: false, deckRemaining: 47
        ))
    }

    func requestNewRound() async throws {
        emitRoomUpdated(phase: .lobby)
    }

    func leaveRoom() async throws {}

    private func emitRoomUpdated(phase: GamePhase) {
        let state = RoomState(code: roomCode, phase: phase, players: players, activePlayerId: myPlayerId)
        onEvent?(.roomUpdated(state))
    }
}
