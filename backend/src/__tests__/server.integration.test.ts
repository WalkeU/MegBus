import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { RoomManager } from '../rooms/roomManager';
import { registerSocketHandlers } from '../socket/handlers';
import {
  AckResponse,
  ClientToServerEvents,
  CreateRoomResponse,
  JoinRoomResponse,
  ServerToClientEvents,
} from '../socket/events';

type AppClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

function waitForConnect(socket: AppClientSocket): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve) => socket.once('connect', () => resolve()));
}

function waitForEvent<E extends keyof ServerToClientEvents>(
  socket: AppClientSocket,
  event: E,
): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve) => {
    socket.once(event, ((payload: Parameters<ServerToClientEvents[E]>[0]) => resolve(payload)) as never);
  });
}

describe('Socket.IO szerver — füstpróba (vital path)', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server<ClientToServerEvents, ServerToClientEvents>;
  let baseUrl: string;
  const clients: AppClientSocket[] = [];

  beforeEach((done) => {
    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: '*' } });
    registerSocketHandlers(io, new RoomManager());
    httpServer.listen(0, () => {
      const { port } = httpServer.address() as AddressInfo;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterEach((done) => {
    clients.forEach((c) => c.disconnect());
    clients.length = 0;
    io.close();
    httpServer.close(() => done());
  });

  async function connect(): Promise<AppClientSocket> {
    const socket: AppClientSocket = ioClient(baseUrl, { transports: ['websocket'], forceNew: true });
    clients.push(socket);
    await waitForConnect(socket);
    return socket;
  }

  it(
    'szoba létrehozása, csatlakozás, ready után elindul a játék és aktív játékost közöl',
    async () => {
      const host = await connect();
      const guest = await connect();

      const createRes = await new Promise<CreateRoomResponse>((resolve) =>
        host.emit('createRoom', { playerName: 'Host' }, resolve),
      );
      expect(createRes.ok).toBe(true);
      const roomCode = createRes.roomCode as string;

      const joinRes = await new Promise<JoinRoomResponse>((resolve) =>
        guest.emit('joinRoom', { roomCode, playerName: 'Guest' }, resolve),
      );
      expect(joinRes.ok).toBe(true);

      const activePlayerPromise = waitForEvent(host, 'activePlayerChanged');

      const hostReadyAck = await new Promise<AckResponse>((resolve) =>
        host.emit('setReady', { ready: true }, resolve),
      );
      expect(hostReadyAck.ok).toBe(true);

      const guestReadyAck = await new Promise<AckResponse>((resolve) =>
        guest.emit('setReady', { ready: true }, resolve),
      );
      expect(guestReadyAck.ok).toBe(true);

      const activePlayerPayload = await activePlayerPromise;
      expect(activePlayerPayload.phase).toBe('round1');
      expect(typeof activePlayerPayload.playerId).toBe('string');
    },
    10000,
  );

  it(
    'érvénytelen szobakóddal a csatlakozás hibát ad vissza',
    async () => {
      const guest = await connect();
      const res = await new Promise<JoinRoomResponse>((resolve) =>
        guest.emit('joinRoom', { roomCode: 'ZZZZZZ', playerName: 'Guest' }, resolve),
      );
      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    },
    10000,
  );

  it(
    'egy ack-callback nélkül küldött esemény nem omlasztja össze a szervert',
    async () => {
      const rogue = await connect();
      // Direkt nem adunk ack-callbacket — egy megbízhatatlan/hibás kliens ezt megteheti.
      // A típusrendszert szándékosan megkerüljük, mert egy valódi rossz kliens sem
      // tartaná be a TS szerződést, csak nyers socket.io eseményeket küld.
      const untyped = rogue as unknown as { emit: (event: string, ...args: unknown[]) => void };
      untyped.emit('createRoom', { playerName: 'Rogue' });
      untyped.emit('submitGuess', { guess: 'red' });
      untyped.emit('answerBus', { guess: 'red' });

      // A szervernek életben kell maradnia, és normálisan kell kiszolgálnia egy másik klienst.
      const survivor = await connect();
      const res = await new Promise<CreateRoomResponse>((resolve) =>
        survivor.emit('createRoom', { playerName: 'Survivor' }, resolve),
      );
      expect(res.ok).toBe(true);
      expect(typeof res.roomCode).toBe('string');
    },
    10000,
  );

  /** Végigviszi mindkét játékost a négy tippelős körön (a helyesség nem számít), a
   * piramis fázis kezdetéig — a lépés-sorrend a csatlakozási sorrendet követi. */
  async function playThroughRoundsToPyramid(host: AppClientSocket, guest: AppClientSocket): Promise<void> {
    const pyramidPhasePromise = new Promise<void>((resolve) => {
      host.on('roomUpdated', (state) => {
        if (state.phase === 'pyramid') resolve();
      });
    });

    const guessesPerRound: Record<number, string> = { 0: 'red', 1: 'bigger', 2: 'between', 3: 'hearts' };
    for (let round = 0; round < 4; round++) {
      for (const socket of [host, guest]) {
        await new Promise<AckResponse>((resolve) =>
          socket.emit('submitGuess', { guess: guessesPerRound[round] as never }, resolve),
        );
      }
    }

    await pyramidPhasePromise;
  }

  it(
    'a piramis fordítása megáll, amíg valaki lerakást fontolgat, és folytatódik utána',
    async () => {
      const host = await connect();
      const guest = await connect();

      const createRes = await new Promise<CreateRoomResponse>((resolve) =>
        host.emit('createRoom', { playerName: 'Host' }, resolve),
      );
      const roomCode = createRes.roomCode as string;
      await new Promise<JoinRoomResponse>((resolve) => guest.emit('joinRoom', { roomCode, playerName: 'Guest' }, resolve));
      await new Promise<AckResponse>((resolve) => host.emit('setReady', { ready: true }, resolve));
      await new Promise<AckResponse>((resolve) => guest.emit('setReady', { ready: true }, resolve));

      await playThroughRoundsToPyramid(host, guest);

      let flipCount = 0;
      host.on('pyramidCardFlipped', () => {
        flipCount++;
      });

      const beginAck = await new Promise<AckResponse>((resolve) => host.emit('beginPyramidMatch', resolve));
      expect(beginAck.ok).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 800));
      expect(flipCount).toBe(0);

      const nextFlipPromise = waitForEvent(host, 'pyramidCardFlipped');
      const cancelAck = await new Promise<AckResponse>((resolve) => host.emit('cancelPyramidMatch', resolve));
      expect(cancelAck.ok).toBe(true);

      await nextFlipPromise;
      expect(flipCount).toBeGreaterThanOrEqual(1);
    },
    15000,
  );
});
