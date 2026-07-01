import Foundation

// Ehhez a fájlhoz a `socket.io-client-swift` Swift Package hozzáadása szükséges
// Xcode-ban: File > Add Package Dependencies > https://github.com/socketio/socket.io-client-swift
// A `#if canImport(SocketIO)` védi a buildet: a csomag hozzáadása nélkül ez a fájl
// üresen fordul (a projekt többi része zavartalanul épül), addig a MockGameConnection
// használható a UI fejlesztéséhez és előnézetéhez.
#if canImport(SocketIO)
import SocketIO

@MainActor
final class SocketIOGameConnection: GameConnection {
    var onEvent: ((GameEvent) -> Void)?

    private let manager: SocketManager
    private let socket: SocketIOClient

    init(serverURL: URL) {
        manager = SocketManager(socketURL: serverURL, config: [.log(false), .compress, .forceWebsockets(true)])
        socket = manager.defaultSocket
        registerListeners()
    }

    func connect() async throws {
        if socket.status == .connected { return }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            var resumed = false
            socket.once(clientEvent: .connect) { _, _ in
                guard !resumed else { return }
                resumed = true
                continuation.resume()
            }
            socket.once(clientEvent: .error) { data, _ in
                guard !resumed else { return }
                resumed = true
                let message = (data.first as? String) ?? "Kapcsolódási hiba."
                continuation.resume(throwing: GameConnectionError.server(message))
            }
            socket.connect()
        }
    }

    func createRoom(playerName: String) async throws -> (roomCode: String, playerId: String) {
        let response = try await emitWithAck("createRoom", ["playerName": playerName])
        guard let roomCode = response["roomCode"] as? String, let playerId = response["playerId"] as? String else {
            throw GameConnectionError.server("Hiányos válasz a szobalétrehozásra.")
        }
        return (roomCode, playerId)
    }

    func joinRoom(code: String, playerName: String) async throws -> String {
        let response = try await emitWithAck("joinRoom", ["roomCode": code, "playerName": playerName])
        guard let playerId = response["playerId"] as? String else {
            throw GameConnectionError.server("Hiányos válasz a csatlakozásra.")
        }
        return playerId
    }

    func setReady(_ ready: Bool) async throws {
        _ = try await emitWithAck("setReady", ["ready": ready])
    }

    func submitGuess(_ guess: String) async throws {
        _ = try await emitWithAck("submitGuess", ["guess": guess])
    }

    func beginPyramidMatch() async throws {
        _ = try await emitWithAck("beginPyramidMatch")
    }

    func cancelPyramidMatch() async throws {
        _ = try await emitWithAck("cancelPyramidMatch")
    }

    func playPyramidMatch(card: Card, recipientPlayerIds: [String]) async throws {
        _ = try await emitWithAck("playPyramidMatch", [
            "suit": card.suit.rawValue,
            "rank": card.rank,
            "recipientPlayerIds": recipientPlayerIds,
        ])
    }

    func answerBus(_ guess: String) async throws {
        _ = try await emitWithAck("answerBus", ["guess": guess])
    }

    func requestNewRound() async throws {
        _ = try await emitWithAck("requestNewRound")
    }

    func leaveRoom() async throws {
        _ = try await emitWithAck("leaveRoom")
    }

    // MARK: - Belső segédfüggvények

    /// A `beginPyramidMatch`/`cancelPyramidMatch`/`requestNewRound`/`leaveRoom` események a
    /// backend szerződésben payload nélküliek — a szerver oldali handler első paramétere
    /// maga az ack. Ha itt payloadot is küldenénk, a szerver a payloadot kapná ack gyanánt,
    /// és soha nem tudna válaszolni ("Üres szerverválasz" hiba). Ezért ezekhez ezt a
    /// payload nélküli túlterhelést kell használni, nem a payloados változatot.
    private func emitWithAck(_ event: String) async throws -> [String: Any] {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[String: Any], Error>) in
            socket.emitWithAck(event).timingOut(after: 8) { responseData in
                self.resumeFromAckResponse(event: event, responseData: responseData, continuation: continuation)
            }
        }
    }

    private func emitWithAck(_ event: String, _ payload: [String: Any]) async throws -> [String: Any] {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[String: Any], Error>) in
            socket.emitWithAck(event, payload).timingOut(after: 8) { responseData in
                self.resumeFromAckResponse(event: event, responseData: responseData, continuation: continuation)
            }
        }
    }

    private func resumeFromAckResponse(
        event: String,
        responseData: [Any],
        continuation: CheckedContinuation<[String: Any], Error>
    ) {
        guard let response = responseData.first as? [String: Any] else {
            continuation.resume(throwing: GameConnectionError.server("Üres szerverválasz: \(event)"))
            return
        }
        let ok = response["ok"] as? Bool ?? false
        if ok {
            continuation.resume(returning: response)
        } else {
            let message = response["error"] as? String ?? "Ismeretlen szerverhiba."
            continuation.resume(throwing: GameConnectionError.server(message))
        }
    }

    private func registerListeners() {
        socket.on("roomUpdated") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any], let state = Self.decodeRoomState(payload) else { return }
            self.onEvent?(.roomUpdated(state))
        }
        socket.on("activePlayerChanged") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any],
                  let playerId = payload["playerId"] as? String,
                  let phaseRaw = payload["phase"] as? String, let phase = GamePhase(rawValue: phaseRaw)
            else { return }
            self.onEvent?(.activePlayerChanged(playerId: playerId, phase: phase))
        }
        socket.on("guessResolved") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any],
                  let playerId = payload["playerId"] as? String,
                  let cardPayload = payload["card"] as? [String: Any], let card = Self.decodeCard(cardPayload),
                  let correct = payload["correct"] as? Bool,
                  let penaltyUnits = payload["penaltyUnits"] as? Int
            else { return }
            self.onEvent?(.guessResolved(playerId: playerId, card: card, correct: correct, penaltyUnits: penaltyUnits))
        }
        socket.on("pyramidCardFlipped") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any],
                  let revealIndex = payload["revealIndex"] as? Int,
                  let rowValue = payload["rowValue"] as? Int,
                  let cardPayload = payload["card"] as? [String: Any], let card = Self.decodeCard(cardPayload),
                  let pyramidFinished = payload["pyramidFinished"] as? Bool
            else { return }
            self.onEvent?(.pyramidCardFlipped(revealIndex: revealIndex, rowValue: rowValue, card: card, pyramidFinished: pyramidFinished))
        }
        socket.on("pyramidMatchPlayed") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any],
                  let playerId = payload["playerId"] as? String,
                  let cardPayload = payload["card"] as? [String: Any], let card = Self.decodeCard(cardPayload),
                  let distribution = payload["distribution"] as? [String: Int]
            else { return }
            self.onEvent?(.pyramidMatchPlayed(playerId: playerId, card: card, distribution: distribution))
        }
        socket.on("busRiderSelected") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any],
                  let riderId = payload["riderId"] as? String,
                  let deckRemaining = payload["deckRemaining"] as? Int
            else { return }
            self.onEvent?(.busRiderSelected(riderId: riderId, deckRemaining: deckRemaining))
        }
        socket.on("busQuestionResolved") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any],
                  let riderId = payload["riderId"] as? String,
                  let questionRaw = payload["question"] as? String, let question = BusQuestion(rawValue: questionRaw),
                  let cardPayload = payload["card"] as? [String: Any], let card = Self.decodeCard(cardPayload),
                  let correct = payload["correct"] as? Bool,
                  let exitedBus = payload["exitedBus"] as? Bool,
                  let deckRemaining = payload["deckRemaining"] as? Int
            else { return }
            self.onEvent?(.busQuestionResolved(
                riderId: riderId, question: question, card: card, correct: correct,
                exitedBus: exitedBus, deckRemaining: deckRemaining
            ))
        }
        socket.on("gameFinished") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any], let riderId = payload["riderId"] as? String else { return }
            self.onEvent?(.gameFinished(riderId: riderId))
        }
        socket.on("errorOccurred") { [weak self] data, _ in
            guard let self, let payload = data.first as? [String: Any], let message = payload["message"] as? String else { return }
            self.onEvent?(.errorOccurred(message: message))
        }
    }

    private static func decodeCard(_ payload: [String: Any]) -> Card? {
        guard let suitRaw = payload["suit"] as? String, let suit = Suit(rawValue: suitRaw), let rank = payload["rank"] as? Int else {
            return nil
        }
        return Card(suit: suit, rank: rank)
    }

    private static func decodeRoomState(_ payload: [String: Any]) -> RoomState? {
        guard let code = payload["code"] as? String,
              let phaseRaw = payload["phase"] as? String, let phase = GamePhase(rawValue: phaseRaw),
              let playerDicts = payload["players"] as? [[String: Any]]
        else { return nil }

        let players: [RoomPlayer] = playerDicts.compactMap { dict in
            guard let id = dict["id"] as? String, let name = dict["name"] as? String,
                  let ready = dict["ready"] as? Bool, let connected = dict["connected"] as? Bool
            else { return nil }
            return RoomPlayer(id: id, name: name, ready: ready, connected: connected)
        }
        let activePlayerId = payload["activePlayerId"] as? String
        return RoomState(code: code, phase: phase, players: players, activePlayerId: activePlayerId)
    }
}
#endif
