// Dev módban (pl. `npx expo start`, Expo Go) automatikusan a Mac LAN-IP-jét
// használja — nincs szükség a domainre mutató éles szerverre helyi teszteléshez.
// A 3001-es port a docker-compose.dev.yml alapértelmezett portja (lásd backend/README.md) —
// szándékosan nem 3000, mert ezen a gépen már foglalt egy másik, független projekt miatt.
// Ha a géped IP-je változik, vagy más portot használsz, írd felül:
// EXPO_PUBLIC_SERVER_URL=http://<ip>:<port> npx expo start
const DEV_SERVER_URL = 'http://192.168.0.150:3001';
// Éles szerver (Nginx Proxy Manager mögött, HTTPS/WSS) — csak production buildben
// (`eas build`) használt alapértelmezés, amikor a `__DEV__` már hamis.
const PROD_SERVER_URL = 'https://megbus.walkegabor.hu';

export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? (__DEV__ ? DEV_SERVER_URL : PROD_SERVER_URL);
