import Foundation

/// Hálózat nélküli, determinisztikus implementáció SwiftUI previewekhez és
/// helyi UI-fejlesztéshez — nem helyettesíti a valódi szerverkapcsolatot.
@MainActor
final class MockGameConnection: GameConnection {
    var onEvent: ((GameEvent) -> Void)?
    let skipsHealthCheck = true

    private let myPlayerId = "me"
    private let roomCode = "AB12CD"
    private var players: [RoomPlayer] = [
        RoomPlayer(id: "me", name: "Te", ready: false, connected: true),
        RoomPlayer(id: "p2", name: "Anna", ready: false, connected: true),
    ]
    private var penaltyLabel = defaultPenaltyLabel
    private var gameSettings = defaultGameSettings

    func connect() async throws {}

    func createRoom(playerName: String) async throws -> (roomCode: String, playerId: String) {
        emitRoomUpdated(phase: .lobby)
        return (roomCode, myPlayerId)
    }

    func joinRoom(code: String, playerName: String) async throws -> String {
        emitRoomUpdated(phase: .lobby)
        return myPlayerId
    }

    func setPenaltyLabel(_ label: String) async throws {
        penaltyLabel = label
        emitRoomUpdated(phase: .lobby)
    }

    func setGameSettings(_ settings: GameSettings) async throws {
        gameSettings = settings
        emitRoomUpdated(phase: .lobby)
    }

    func setReady(_ ready: Bool) async throws {
        if let index = players.firstIndex(where: { $0.id == myPlayerId }) {
            players[index].ready = ready
        }
        emitRoomUpdated(phase: .lobby)

        if players.allSatisfy(\.ready) {
            emitRoomUpdated(phase: .round(1))
            onEvent?(.activePlayerChanged(playerId: myPlayerId, phase: .round(1)))
        }
    }

    func submitGuess(_ guess: RoundGuessValue) async throws {
        onEvent?(.guessResolved(playerId: myPlayerId, card: Card(suit: .hearts, rank: 9), correct: true, penaltyUnits: 0))
    }

    func acknowledgePenalty() async throws {}

    func beginPyramidMatch() async throws {}

    func cancelPyramidMatch() async throws {}

    func playPyramidMatch(card: Card, distribution: [String: Int]) async throws {
        onEvent?(.pyramidMatchPlayed(playerId: myPlayerId, card: card, distribution: distribution))
    }

    func acknowledgePyramidDrink() async throws {}

    func answerBus(_ guess: RoundGuessValue) async throws {
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
        let state = RoomState(
            code: roomCode, phase: phase, players: players, activePlayerId: myPlayerId,
            penaltyLabel: penaltyLabel, gameSettings: gameSettings
        )
        onEvent?(.roomUpdated(state))
    }
}
