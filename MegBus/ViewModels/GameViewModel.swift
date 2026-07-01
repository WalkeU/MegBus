import Combine
import Foundation

struct PyramidFlipDisplay: Identifiable {
    let revealIndex: Int
    let rowValue: Int
    let card: Card

    var id: Int { revealIndex }
}

struct BusResultDisplay {
    let question: BusQuestion
    let card: Card
    let correct: Bool
}

@MainActor
final class GameViewModel: ObservableObject {
    enum Screen: Equatable {
        case home, lobby, round, pyramid, bus, gameOver
    }

    @Published private(set) var screen: Screen = .home
    @Published private(set) var roomState: RoomState?
    @Published private(set) var myPlayerId: String?
    @Published private(set) var myHand: [Card] = []
    @Published private(set) var lastDrawnCard: Card?
    @Published private(set) var lastGuessCorrect: Bool?
    /// Ha nem nil, a játékosnak ennyi kortyot kell innia, és ezt még nem nyugtázta.
    @Published private(set) var pendingPenaltyUnits: Int?
    @Published private(set) var pyramidFlips: [PyramidFlipDisplay] = []
    @Published private(set) var isDecidingPyramidMatch = false
    @Published private(set) var busRiderId: String?
    @Published private(set) var busAttemptCards: [Card] = []
    @Published private(set) var busLastResult: BusResultDisplay?
    @Published private(set) var busDeckRemaining: Int?
    @Published private(set) var winnerOfBusId: String?
    @Published var errorMessage: String?
    @Published private(set) var isBusy = false

    private let connection: GameConnection

    var isHost: Bool { roomState?.players.first?.id == myPlayerId }
    var isMyTurn: Bool { roomState?.activePlayerId == myPlayerId }
    var isBusRider: Bool { busRiderId == myPlayerId }

    /// A buszozó következő megválaszolandó kérdése: hibás tipp után mindig az elejéről indul.
    var currentBusQuestion: BusQuestion {
        guard let last = busLastResult else { return .redBlack }
        guard last.correct else { return .redBlack }
        return BusQuestion.next(after: last.question) ?? .redBlack
    }

    init(connection: GameConnection) {
        self.connection = connection
        connection.onEvent = { [weak self] event in
            guard let self else { return }
            Task { @MainActor in self.handle(event) }
        }
    }

    // MARK: - Lobby

    func createRoom(playerName: String) async {
        await run {
            try await connection.connect()
            let (_, playerId) = try await connection.createRoom(playerName: playerName)
            self.myPlayerId = playerId
            self.screen = .lobby
        }
    }

    func joinRoom(code: String, playerName: String) async {
        await run {
            try await connection.connect()
            let playerId = try await connection.joinRoom(code: code, playerName: playerName)
            self.myPlayerId = playerId
            self.screen = .lobby
        }
    }

    func setReady(_ ready: Bool) async {
        await run { try await connection.setReady(ready) }
    }

    // MARK: - 1-4. kör

    func submitGuess(_ guess: String) async {
        await run { try await connection.submitGuess(guess) }
    }

    /// A hibás tipp után járó korty-büntetés nyugtázása — tisztán lokális állapot, a
    /// szerver már a tipp beküldésekor eldöntötte a büntetést, ehhez nincs szükség hívásra.
    func acknowledgePenalty() {
        pendingPenaltyUnits = nil
    }

    // MARK: - Piramis

    /// A játékos rákoppintott egy saját lapjára, hogy lerakja — ettől a piramis fordítása szünetel.
    func beginPyramidMatch() async {
        await run {
            try await connection.beginPyramidMatch()
            self.isDecidingPyramidMatch = true
        }
    }

    /// A játékos meggondolta magát — ha nincs más várakozó, a fordítás folytatódik.
    func cancelPyramidMatch() async {
        await run {
            try await connection.cancelPyramidMatch()
            self.isDecidingPyramidMatch = false
        }
    }

    func playPyramidMatch(_ card: Card, recipientPlayerIds: [String]) async {
        await run {
            try await connection.playPyramidMatch(card: card, recipientPlayerIds: recipientPlayerIds)
            self.isDecidingPyramidMatch = false
        }
    }

    // MARK: - Buszozás

    func answerBus(_ guess: String) async {
        await run { try await connection.answerBus(guess) }
    }

    // MARK: - Új kör / kilépés

    func requestNewRound() async {
        await run {
            try await connection.requestNewRound()
            resetGameState()
        }
    }

    func leaveRoom() async {
        await run {
            try await connection.leaveRoom()
            self.screen = .home
            self.roomState = nil
            self.myPlayerId = nil
            resetGameState()
        }
    }

    // MARK: - Esemény-feldolgozás

    private func handle(_ event: GameEvent) {
        switch event {
        case .roomUpdated(let state):
            roomState = state
            updateScreen(for: state.phase)

        case .activePlayerChanged(let playerId, let phase):
            roomState?.activePlayerId = playerId
            roomState?.phase = phase
            updateScreen(for: phase)
            lastDrawnCard = nil
            lastGuessCorrect = nil

        case .guessResolved(let playerId, let card, let correct, let penaltyUnits):
            if playerId == myPlayerId {
                myHand.append(card)
                lastDrawnCard = card
                lastGuessCorrect = correct
                pendingPenaltyUnits = correct ? nil : penaltyUnits
            }

        case .pyramidCardFlipped(let revealIndex, let rowValue, let card, let pyramidFinished):
            pyramidFlips.append(PyramidFlipDisplay(revealIndex: revealIndex, rowValue: rowValue, card: card))
            if pyramidFinished {
                screen = .pyramid
            }

        case .pyramidMatchPlayed(let playerId, let card, _):
            if playerId == myPlayerId {
                myHand.removeAll { $0 == card }
            }

        case .busRiderSelected(let riderId, let deckRemaining):
            busRiderId = riderId
            busAttemptCards = []
            busLastResult = nil
            busDeckRemaining = deckRemaining
            screen = .bus

        case .busQuestionResolved(_, let question, let card, let correct, _, let deckRemaining):
            busLastResult = BusResultDisplay(question: question, card: card, correct: correct)
            busDeckRemaining = deckRemaining
            if correct {
                busAttemptCards.append(card)
            } else {
                busAttemptCards = []
            }

        case .gameFinished(let riderId):
            winnerOfBusId = riderId
            screen = .gameOver

        case .errorOccurred(let message):
            errorMessage = message
        }
    }

    private func updateScreen(for phase: GamePhase) {
        switch phase {
        case .lobby: screen = .lobby
        case .round1, .round2, .round3, .round4: screen = .round
        case .pyramid: screen = .pyramid
        case .bus: screen = .bus
        case .finished: screen = .gameOver
        }
    }

    private func resetGameState() {
        myHand = []
        lastDrawnCard = nil
        lastGuessCorrect = nil
        pendingPenaltyUnits = nil
        pyramidFlips = []
        isDecidingPyramidMatch = false
        busRiderId = nil
        busAttemptCards = []
        busLastResult = nil
        busDeckRemaining = nil
        winnerOfBusId = nil
    }

    private func run(_ operation: () async throws -> Void) async {
        isBusy = true
        defer { isBusy = false }
        do {
            try await operation()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
