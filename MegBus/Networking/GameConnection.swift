import Foundation

enum GameConnectionError: Error, LocalizedError {
    case server(String)
    case notConnected

    var errorDescription: String? {
        switch self {
        case .server(let message): return message
        case .notConnected: return "Nincs kapcsolat a szerverrel."
        }
    }
}

/// A szerver → kliens push-esemény, ugyanazokat hordozza, mint a backend
/// `ServerToClientEvents` szerződése (lásd backend/src/socket/events.ts).
enum GameEvent {
    case roomUpdated(RoomState)
    case activePlayerChanged(playerId: String, phase: GamePhase)
    /// `penaltyUnits`: hibás tipp esetén ennyi kortyot kell innia (a kör sorszáma); jó tippnél 0.
    case guessResolved(playerId: String, card: Card, correct: Bool, penaltyUnits: Int)
    case pyramidCardFlipped(revealIndex: Int, rowValue: Int, card: Card, pyramidFinished: Bool)
    case pyramidMatchPlayed(playerId: String, card: Card, distribution: [String: Int])
    case busRiderSelected(riderId: String, deckRemaining: Int)
    case busQuestionResolved(
        riderId: String, question: BusQuestion, card: Card, correct: Bool, exitedBus: Bool, deckRemaining: Int
    )
    case gameFinished(riderId: String)
    case errorOccurred(message: String)
}

/// Elvonatkoztatás a tényleges hálózati rétegtől (Socket.IO), hogy a ViewModel
/// és a nézetek a konkrét kliens-implementációtól függetlenül tesztelhetők legyenek.
@MainActor
protocol GameConnection: AnyObject {
    var onEvent: ((GameEvent) -> Void)? { get set }
    /// Igazra állítva a `GameViewModel` kihagyja az induláskori szerver-health-checket
    /// (és rögtön a Home képernyőt mutatja) — ezt a `MockGameConnection` állítja be,
    /// hogy SwiftUI previewben/local UI-fejlesztésnél ne kelljen valódi hálózat.
    var skipsHealthCheck: Bool { get }

    func connect() async throws
    func createRoom(playerName: String) async throws -> (roomCode: String, playerId: String)
    func joinRoom(code: String, playerName: String) async throws -> String
    func setReady(_ ready: Bool) async throws
    func submitGuess(_ guess: String) async throws
    /// Nyugtázza a hibás tippért járó büntetést — csak ez engedi tovább a kört.
    func acknowledgePenalty() async throws
    /// Jelzi a szervernek, hogy a lerakást fontolgatja — ettől a piramis fordítása szünetel.
    func beginPyramidMatch() async throws
    /// Visszavonja a beginPyramidMatch-et; ha más nem fontolgat lerakást, a fordítás folytatódik.
    func cancelPyramidMatch() async throws
    /// `distribution`: playerId → hány kortyot kap — a játékos szabadon dönti el, nem kötelező egyenlő elosztás.
    func playPyramidMatch(card: Card, distribution: [String: Int]) async throws
    /// Nyugtázza a piramis-lerakásból kapott ivást — amíg valamelyik címzett nem teszi meg, a piramis szünetel.
    func acknowledgePyramidDrink() async throws
    func answerBus(_ guess: String) async throws
    func requestNewRound() async throws
    func leaveRoom() async throws
}

extension GameConnection {
    var skipsHealthCheck: Bool { false }
}
