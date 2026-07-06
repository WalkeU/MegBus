import Foundation

extension Array {
    /// Tartományon kívüli indexnél `nil`-t ad vissza index-out-of-range crash helyett.
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

enum Suit: String, Codable, CaseIterable, Identifiable {
    case hearts, diamonds, clubs, spades

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .hearts: return "♥"
        case .diamonds: return "♦"
        case .clubs: return "♣"
        case .spades: return "♠"
        }
    }

    var displayName: String {
        switch self {
        case .hearts: return "Kőr"
        case .diamonds: return "Káró"
        case .clubs: return "Treff"
        case .spades: return "Pikk"
        }
    }

    var isRed: Bool { self == .hearts || self == .diamonds }
}

/// 2-től (kettes) 14-ig (ász), a backenddel megegyező számábrázolás.
typealias Rank = Int

enum RankFormat {
    static func label(_ rank: Rank) -> String {
        switch rank {
        case 11: return "J"
        case 12: return "Q"
        case 13: return "K"
        case 14: return "A"
        default: return String(rank)
        }
    }
}

struct Card: Codable, Equatable, Identifiable {
    let suit: Suit
    let rank: Rank

    var id: String { "\(suit.rawValue)-\(rank)" }
    var label: String { RankFormat.label(rank) }
}

/// `.round(n)` — n a szoba `GameSettings.rounds` listájának 1-alapú indexe, tehát a
/// körök száma (és sorrendje) tetszőleges lehet, nem csak a régi fix 1-4.
enum GamePhase: Equatable {
    case lobby
    case round(Int)
    case pyramid
    case bus
    case finished
}

extension GamePhase: RawRepresentable {
    init?(rawValue: String) {
        switch rawValue {
        case "lobby": self = .lobby
        case "pyramid": self = .pyramid
        case "bus": self = .bus
        case "finished": self = .finished
        default:
            guard rawValue.hasPrefix("round"), let n = Int(rawValue.dropFirst("round".count)) else { return nil }
            self = .round(n)
        }
    }

    var rawValue: String {
        switch self {
        case .lobby: return "lobby"
        case .round(let n): return "round\(n)"
        case .pyramid: return "pyramid"
        case .bus: return "bus"
        case .finished: return "finished"
        }
    }
}

extension GamePhase: Codable {
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        guard let value = GamePhase(rawValue: raw) else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Érvénytelen GamePhase: \(raw)")
        }
        self = value
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

enum RedBlackGuess: String, Codable, CaseIterable {
    case red, black
}

enum BiggerSmallerGuess: String, Codable, CaseIterable {
    case bigger, smaller
}

enum BetweenOutsideGuess: String, Codable, CaseIterable {
    case between, outside
}

// ---- Konfigurálható kör-típusok (host testre szabhatja) ----

enum RoundType: String, Codable, CaseIterable {
    case redBlack, biggerSmaller, betweenOutside, suit, seenBefore, exactRank

    var title: String {
        switch self {
        case .redBlack: return "Piros vagy fekete?"
        case .biggerSmaller: return "Nagyobb vagy kisebb?"
        case .betweenOutside: return "Közte vagy kívül?"
        case .suit: return "Milyen szín?"
        case .seenBefore: return "Volt már ilyen érték?"
        case .exactRank: return "Pontosan melyik érték?"
        }
    }

    var shortLabel: String {
        switch self {
        case .redBlack: return "Piros / fekete"
        case .biggerSmaller: return "Nagyobb / kisebb"
        case .betweenOutside: return "Közte / kívül"
        case .suit: return "Szín"
        case .seenBefore: return "Volt már?"
        case .exactRank: return "Pontos érték"
        }
    }

    /// Hány korábban lehúzott lapra van szüksége a kör kiértékeléséhez — ez szabja meg,
    /// hányadik pozíciótól kezdve helyezhető el a kör-listában.
    var minPriorCards: Int {
        switch self {
        case .biggerSmaller: return 1
        case .betweenOutside: return 2
        case .seenBefore: return 1
        case .redBlack, .suit, .exactRank: return 0
        }
    }
}

/// A tippet vagy egy szöveges kulcsszó (pl. "red", "bigger", "hearts"), vagy egy
/// konkrét lapérték ("exactRank" körnél) — a backend `RoundGuess` uniójának felel meg.
enum RoundGuessValue {
    case text(String)
    case rank(Rank)

    var wireValue: Any {
        switch self {
        case .text(let value): return value
        case .rank(let value): return value
        }
    }
}

struct RoundDefinition: Codable, Equatable {
    let type: RoundType
    let penaltyUnits: Int
}

struct GameSettings: Codable, Equatable {
    let rounds: [RoundDefinition]
    /// A piramis 5 sorának büntetése, alulról (5 lapos sor) fölfelé (csúcs, 1 lap).
    let pyramidRowPenalties: [Int]
    /// Ennyi ezredmásodpercenként fordul automatikusan a következő piramis-lap.
    let pyramidFlipIntervalMs: Int
}

let defaultGameSettings = GameSettings(
    rounds: [
        RoundDefinition(type: .redBlack, penaltyUnits: 1),
        RoundDefinition(type: .biggerSmaller, penaltyUnits: 2),
        RoundDefinition(type: .betweenOutside, penaltyUnits: 3),
        RoundDefinition(type: .suit, penaltyUnits: 4),
    ],
    pyramidRowPenalties: [1, 2, 3, 4, 5],
    pyramidFlipIntervalMs: 5000
)

let maxRounds = 8
let minPyramidFlipIntervalMs = 1500
let maxPyramidFlipIntervalMs = 15000

struct GameSettingsError: Error, LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

/// Ugyanaz a validáció, mint a szerveren — a kliens ezzel ad azonnali visszajelzést,
/// a szerver validál hitelesen (lásd backend/src/game/roundTypes.ts).
func validateGameSettings(_ settings: GameSettings) throws {
    if settings.rounds.isEmpty {
        throw GameSettingsError(message: "Legalább egy kör szükséges.")
    }
    if settings.rounds.count > maxRounds {
        throw GameSettingsError(message: "Legfeljebb \(maxRounds) kör lehet.")
    }
    for (index, round) in settings.rounds.enumerated() {
        if round.penaltyUnits < 1 {
            throw GameSettingsError(message: "Minden kör büntetése legalább 1 kell legyen.")
        }
        if index < round.type.minPriorCards {
            throw GameSettingsError(
                message: "A(z) \"\(round.type.shortLabel)\" típusú kör csak legalább \(round.type.minPriorCards). pozíciótól kezdve helyezhető el."
            )
        }
    }
    if settings.pyramidRowPenalties.count != 5 {
        throw GameSettingsError(message: "A piramisnak pontosan 5 sor-büntetést kell megadni.")
    }
    if settings.pyramidRowPenalties.contains(where: { $0 < 1 }) {
        throw GameSettingsError(message: "A piramis minden sor-büntetése legalább 1 kell legyen.")
    }
    if settings.pyramidFlipIntervalMs < minPyramidFlipIntervalMs || settings.pyramidFlipIntervalMs > maxPyramidFlipIntervalMs {
        throw GameSettingsError(
            message: "A piramis fordítási sebessége \(minPyramidFlipIntervalMs) és \(maxPyramidFlipIntervalMs) ezredmásodperc között lehet."
        )
    }
}

struct RoomPlayer: Codable, Equatable, Identifiable {
    let id: String
    let name: String
    var ready: Bool
    var connected: Bool
}

let defaultPenaltyLabel = "Büntetés"

struct RoomState: Codable, Equatable {
    let code: String
    var phase: GamePhase
    var players: [RoomPlayer]
    var activePlayerId: String?
    var penaltyLabel: String
    var gameSettings: GameSettings
}
