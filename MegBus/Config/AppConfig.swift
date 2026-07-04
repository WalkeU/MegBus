import Foundation

/// A backend szerver címe egy helyen, könnyen szerkeszthetően.
///
/// Éles szerver, Nginx Proxy Manager mögött, HTTPS/WSS-en (a socket.io-client-swift
/// HTTPS URL esetén automatikusan WSS-re vált). Helyi fejlesztéshez ideiglenesen
/// átírhatod a Mac LAN-IP-jére (pl. "http://192.168.0.150:3001"), ha helyi
/// backendhez akarsz kötni.
enum AppConfig {
    static let backendServerURL = URL(string: "https://megbus.walkegabor.hu")!
}
