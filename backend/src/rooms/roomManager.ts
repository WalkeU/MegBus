import { GameEngine, MAX_PLAYERS, MIN_PLAYERS } from '../game/gameEngine';
import { RandomSource } from '../game/deck';
import { generateRoomCode } from './roomCode';

export interface RoomPlayer {
  readonly id: string;
  readonly name: string;
  ready: boolean;
  connected: boolean;
}

export type RoomPhase = 'lobby' | 'in-game';

export interface Room {
  readonly code: string;
  readonly hostId: string;
  readonly players: RoomPlayer[];
  phase: RoomPhase;
  engine: GameEngine | null;
}

export class RoomManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomManagerError';
  }
}

export interface PlayerIdentity {
  readonly id: string;
  readonly name: string;
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly random: RandomSource = Math.random) {}

  createRoom(host: PlayerIdentity): Room {
    const code = this.generateUniqueCode();
    const room: Room = {
      code,
      hostId: host.id,
      players: [{ id: host.id, name: host.name, ready: false, connected: true }],
      phase: 'lobby',
      engine: null,
    };
    this.rooms.set(code, room);
    return room;
  }

  private generateUniqueCode(): string {
    let code = generateRoomCode(this.random);
    while (this.rooms.has(code)) {
      code = generateRoomCode(this.random);
    }
    return code;
  }

  getRoom(code: string): Room {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new RoomManagerError(`Nincs ilyen szoba: ${code}`);
    }
    return room;
  }

  joinRoom(code: string, player: PlayerIdentity): Room {
    const room = this.getRoom(code);
    if (room.phase !== 'lobby') {
      throw new RoomManagerError('A játék már elindult, nem lehet csatlakozni.');
    }
    if (room.players.some((p) => p.id === player.id)) {
      throw new RoomManagerError('Ez a játékos már a szobában van.');
    }
    if (room.players.length >= MAX_PLAYERS) {
      throw new RoomManagerError(`A szoba megtelt (max ${MAX_PLAYERS} játékos).`);
    }
    room.players.push({ id: player.id, name: player.name, ready: false, connected: true });
    return room;
  }

  setReady(code: string, playerId: string, ready: boolean): Room {
    const room = this.getRoom(code);
    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      throw new RoomManagerError(`Ismeretlen játékos a szobában: ${playerId}`);
    }
    player.ready = ready;
    return room;
  }

  setConnected(code: string, playerId: string, connected: boolean): Room {
    const room = this.getRoom(code);
    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      throw new RoomManagerError(`Ismeretlen játékos a szobában: ${playerId}`);
    }
    player.connected = connected;
    return room;
  }

  isReadyToStart(room: Room): boolean {
    return room.players.length >= MIN_PLAYERS && room.players.every((p) => p.ready);
  }

  /** Ha mindenki ready, elindítja a játékmotort; egyébként null-t ad vissza. */
  tryStartGame(code: string): GameEngine | null {
    const room = this.getRoom(code);
    if (room.phase !== 'lobby' || !this.isReadyToStart(room)) {
      return null;
    }
    const engine = new GameEngine(
      room.players.map((p) => ({ id: p.id, name: p.name })),
      this.random,
    );
    engine.start();
    room.engine = engine;
    room.phase = 'in-game';
    return engine;
  }

  /** Új kör indítása: visszaállítja a szobát lobby állapotba, mindenkit "nem ready"-re téve. */
  resetForNewRound(code: string): Room {
    const room = this.getRoom(code);
    room.players.forEach((p) => {
      p.ready = false;
    });
    room.phase = 'lobby';
    room.engine = null;
    return room;
  }

  leaveRoom(code: string, playerId: string): Room {
    const room = this.getRoom(code);
    const index = room.players.findIndex((p) => p.id === playerId);
    if (index !== -1) {
      room.players.splice(index, 1);
    }
    if (room.players.length === 0) {
      this.rooms.delete(code);
    }
    return room;
  }
}
