import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/roomManager';
import { registerSocketHandlers } from './socket/handlers';
import { ClientToServerEvents, ServerToClientEvents } from './socket/events';

const PORT = Number(process.env.PORT ?? 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

const app = express();
app.get('/health', (_req, res) => {
  // A Socket.IO CORS-beállítása csak a Socket.IO handshake-re vonatkozik, erre a
  // sima Express route-ra nem — böngészős (web) kliens nélküle nem tudná lekérdezni
  // más originről (pl. Expo web dev szerver), CORS-hibával elutasítaná a fetch-et.
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.json({ status: 'ok' });
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CORS_ORIGIN },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`MegBus szerver fut: http://localhost:${PORT}`);
});
