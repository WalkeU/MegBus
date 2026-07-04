// Dev alapértelmezés: iOS szimulátor és web eléri a Mac localhost-ját közvetlenül.
// Android emulátoron az elérés 10.0.2.2, fizikai eszközön a gép LAN-IP-je (vagy
// Tailscale-IP-je) kell ide, ahogy az iOS kliens is Tailscale-IP-t használ.
// Production build előtt cseréld a valós HTTPS domain-re (Caddy mögötti backend),
// vagy add meg build időben az EXPO_PUBLIC_SERVER_URL env változóval.
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://192.168.0.150:3001';
