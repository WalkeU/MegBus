import Foundation

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

enum GamePhase: String, Codable {
    case lobby
    case round1
    case round2
    case round3
    case round4
    case pyramid
    case bus
    case finished
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

enum BusQuestion: String, Codable, CaseIterable {
    case redBlack, biggerSmaller, betweenOutside, suit

    var title: String {
        switch self {
        case .redBlack: return "Piros vagy fekete?"
        case .biggerSmaller: return "Nagyobb vagy kisebb?"
        case .betweenOutside: return "Közte vagy kívül?"
        case .suit: return "Milyen szín?"
        }
    }

    /// A négykérdéses sor következő kérdése; a negyedik (suit) után nincs következő.
    static func next(after question: BusQuestion) -> BusQuestion? {
        guard let index = allCases.firstIndex(of: question), index + 1 < allCases.count else { return nil }
        return allCases[index + 1]
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
}
