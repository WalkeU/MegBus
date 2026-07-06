import { io, type Socket } from 'socket.io-client';
import { SERVER_URL } from './config';
import type {
  AckResponse,
  BusGuess,
  Card,
  CreateRoomResponse,
  GameSettings,
  JoinRoomResponse,
  RoomBroadcastState,
  RoundGuess,
  ServerToClientEvents,
} from '../types/game';

export class GameConnectionError extends Error {}

const ACK_TIMEOUT_MS = 8000;
const CONNECT_TIMEOUT_MS = 8000;

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket'],
      timeout: CONNECT_TIMEOUT_MS,
    });
  }
  return socket;
}

export function connectSocket(): Promise<void> {
  const s = getSocket();
  if (s.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      s.off('connect', onConnect);
      s.off('connect_error', onError);
      clearTimeout(timer);
    };
    const onConnect = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new GameConnectionError(err.message));
    };
    // Ha a szerver elérhetetlen (rossz URL, hálózat nem éri el stb.), előfordulhat,
    // hogy sem 'connect', sem 'connect_error' nem fut le időben — enélkül a
    // felhasználó örökre "lóg" hibaüzenet nélkül (a gomb csak le van tiltva).
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new GameConnectionError(
          'Nem sikerült kapcsolódni a szerverhez (időtúllépés). Ellenőrizd, hogy fut-e a backend, és elérhető-e a hálózaton.',
        ),
      );
    }, CONNECT_TIMEOUT_MS);
    s.on('connect', onConnect);
    s.on('connect_error', onError);
    s.connect();
  });
}

export function disconnectSocket(): void {
  socket?.disconnect();
}

// A backend némely eseménye (acknowledgePenalty, beginPyramidMatch, ...) nem fogad
// payload-ot — az első argumentum ilyenkor a szerveroldali ack callback. Payload
// nélküli hívásnál ezért nem küldünk üres objektumot, csak simán ack-kal hívjuk.
async function emitWithAck<T extends AckResponse>(event: string, payload?: unknown): Promise<T> {
  const s = getSocket();
  if (!s.connected) {
    throw new GameConnectionError('Nincs kapcsolat a szerverrel.');
  }
  let response: T | undefined;
  try {
    response =
      payload === undefined
        ? await s.timeout(ACK_TIMEOUT_MS).emitWithAck(event)
        : await s.timeout(ACK_TIMEOUT_MS).emitWithAck(event, payload);
  } catch {
    throw new GameConnectionError(`Időtúllépés: ${event}`);
  }
  if (!response || typeof response !== 'object') {
    throw new GameConnectionError(`Üres szerverválasz: ${event}`);
  }
  if (!response.ok) {
    throw new GameConnectionError(response.error ?? 'Ismeretlen szerverhiba.');
  }
  return response;
}

export const rpc = {
  async createRoom(playerName: string): Promise<{ roomCode: string; playerId: string }> {
    const res = await emitWithAck<CreateRoomResponse>('createRoom', { playerName });
    if (!res.roomCode || !res.playerId) {
      throw new GameConnectionError('Hiányos szerverválasz a szoba létrehozásakor.');
    }
    return { roomCode: res.roomCode, playerId: res.playerId };
  },
  async joinRoom(roomCode: string, playerName: string): Promise<string> {
    const res = await emitWithAck<JoinRoomResponse>('joinRoom', { roomCode, playerName });
    if (!res.playerId) {
      throw new GameConnectionError('Hiányos szerverválasz a csatlakozáskor.');
    }
    return res.playerId;
  },
  async setReady(ready: boolean): Promise<void> {
    await emitWithAck('setReady', { ready });
  },
  async setPenaltyLabel(label: string): Promise<void> {
    await emitWithAck('setPenaltyLabel', { label });
  },
  async setGameSettings(settings: GameSettings): Promise<void> {
    await emitWithAck('setGameSettings', { settings });
  },
  async submitGuess(guess: RoundGuess): Promise<void> {
    await emitWithAck('submitGuess', { guess });
  },
  async acknowledgePenalty(): Promise<void> {
    await emitWithAck('acknowledgePenalty');
  },
  async beginPyramidMatch(): Promise<void> {
    await emitWithAck('beginPyramidMatch');
  },
  async cancelPyramidMatch(): Promise<void> {
    await emitWithAck('cancelPyramidMatch');
  },
  async playPyramidMatch(card: Card, distribution: Record<string, number>): Promise<void> {
    await emitWithAck('playPyramidMatch', { suit: card.suit, rank: card.rank, distribution });
  },
  async acknowledgePyramidDrink(): Promise<void> {
    await emitWithAck('acknowledgePyramidDrink');
  },
  async answerBus(guess: BusGuess): Promise<void> {
    await emitWithAck('answerBus', { guess });
  },
  async requestNewRound(): Promise<void> {
    await emitWithAck('requestNewRound');
  },
  async leaveRoom(): Promise<void> {
    await emitWithAck('leaveRoom');
  },
};

export interface ServerListeners {
  onRoomUpdated: (state: RoomBroadcastState) => void;
  onActivePlayerChanged: ServerToClientEvents['activePlayerChanged'];
  onGuessResolved: ServerToClientEvents['guessResolved'];
  onPyramidCardFlipped: ServerToClientEvents['pyramidCardFlipped'];
  onPyramidMatchPlayed: ServerToClientEvents['pyramidMatchPlayed'];
  onBusRiderSelected: ServerToClientEvents['busRiderSelected'];
  onBusQuestionResolved: ServerToClientEvents['busQuestionResolved'];
  onGameFinished: ServerToClientEvents['gameFinished'];
  onErrorOccurred: ServerToClientEvents['errorOccurred'];
}

export function registerListeners(listeners: ServerListeners): () => void {
  const s = getSocket();
  s.on('roomUpdated', listeners.onRoomUpdated);
  s.on('activePlayerChanged', listeners.onActivePlayerChanged);
  s.on('guessResolved', listeners.onGuessResolved);
  s.on('pyramidCardFlipped', listeners.onPyramidCardFlipped);
  s.on('pyramidMatchPlayed', listeners.onPyramidMatchPlayed);
  s.on('busRiderSelected', listeners.onBusRiderSelected);
  s.on('busQuestionResolved', listeners.onBusQuestionResolved);
  s.on('gameFinished', listeners.onGameFinished);
  s.on('errorOccurred', listeners.onErrorOccurred);

  return () => {
    s.off('roomUpdated', listeners.onRoomUpdated);
    s.off('activePlayerChanged', listeners.onActivePlayerChanged);
    s.off('guessResolved', listeners.onGuessResolved);
    s.off('pyramidCardFlipped', listeners.onPyramidCardFlipped);
    s.off('pyramidMatchPlayed', listeners.onPyramidMatchPlayed);
    s.off('busRiderSelected', listeners.onBusRiderSelected);
    s.off('busQuestionResolved', listeners.onBusQuestionResolved);
    s.off('gameFinished', listeners.onGameFinished);
    s.off('errorOccurred', listeners.onErrorOccurred);
  };
}
