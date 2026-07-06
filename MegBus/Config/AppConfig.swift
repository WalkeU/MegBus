import Foundation

/// A backend szerver címe egy helyen, könnyen szerkeszthetően.
///
/// Debug buildben (Xcode-ból futtatva szimulátoron/fizikai eszközön) automatikusan
/// a Mac LAN-IP-jét használja — nincs szükség a domainre mutató éles szerverre helyi
/// teszteléshez. A 3001-es port a docker-compose.dev.yml alapértelmezett portja (lásd
/// backend/README.md) — szándékosan nem 3000, mert ezen a gépen már foglalt egy másik,
/// független projekt miatt. Ha a géped IP-je változik, vagy más portot használsz, írd
/// át a lenti URL-t. Release buildben (App Store/TestFlight) mindig az éles domain a cél.
enum AppConfig {
    #if DEBUG
    static let backendServerURL = URL(string: "http://192.168.0.150:3001")!
    #else
    static let backendServerURL = URL(string: "https://megbus.walkegabor.hu")!
    #endif
}
