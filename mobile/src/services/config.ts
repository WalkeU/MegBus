// Éles szerver (Nginx Proxy Manager mögött, HTTPS/WSS). Helyi fejlesztéshez
// írd felül az EXPO_PUBLIC_SERVER_URL env változóval, pl.:
// EXPO_PUBLIC_SERVER_URL=http://192.168.0.150:3001 npx expo start
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'https://megbus.walkegabor.hu';
