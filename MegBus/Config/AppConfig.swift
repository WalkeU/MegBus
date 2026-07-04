import Foundation

/// A backend szerver címe egy helyen, könnyen szerkeszthetően.
///
/// Szimulátorból a Mac `localhost`-ja elérhető közvetlenül; fizikai eszközön a Mac
/// Tailscale-IP-jét (vagy LAN-IP-jét) használjuk, hogy ne kelljen ugyanazon a LAN-on
/// lenni — csak a Tailscale app fusson és legyen bejelentkezve mindkét eszközön.
/// Production build előtt cseréld a valós HTTPS domain-re (Caddy mögötti backend).
enum AppConfig {
    static let backendServerURL = URL(string: "http://192.168.0.150:3001")!
}
