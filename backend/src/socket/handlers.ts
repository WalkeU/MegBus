import { Server, Socket } from 'socket.io';
import { RoomManager, RoomManagerError } from '../rooms/roomManager';
import { GameEngineError } from '../game/gameEngine';
import { isRank, isSuit } from '../game/types';
import { PyramidPauseTracker } from './pyramidPauseState';
import {
  AckResponse,
  ClientToServerEvents,
  RoomBroadcastState,
  ServerToClientEvents,
} from './events';

export const PYRAMID_FLIP_INTERVAL_MS = 5000;

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function errorAck(error: unknown): AckResponse {
  if (error instanceof RoomManagerError || error instanceof GameEngineError) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: 'Váratlan szerverhiba történt.' };
}

function toBroadcastState(room: ReturnType<RoomManager['getRoom']>): RoomBroadcastState {
  return {
    code: room.code,
    phase: room.engine ? room.engine.phase : room.phase,
    players: room.players.map((p) => ({ id: p.id, name: p.name, ready: p.ready, connected: p.connected })),
    ...(room.engine ? { activePlayerId: room.engine.activePlayer.id } : {}),
  };
}

/** A socket pontosan egy szoba-kódhoz csatlakozik a saját socket.id-ja mellett. */
function currentRoomCode(socket: AppSocket): string | null {
  const code = [...socket.rooms].find((room) => room !== socket.id);
  return code ?? null;
}

/**
 * A kliens megbízhatatlan bemenet: ha egy (rosszul viselkedő vagy hibás) kliens
 * ack-callback nélkül emittál egy eseményt, a szerver nem omolhat össze emiatt.
 * Minden handler ezzel biztosítja be az ack paramétert, mielőtt meghívná.
 */
function safeAck<T extends (...args: never[]) => void>(ack: T): T {
  return typeof ack === 'function' ? ack : ((() => {}) as T);
}

export function registerSocketHandlers(io: AppServer, roomManager: RoomManager): void {
  const pyramidIntervals = new Map<string, ReturnType<typeof setInterval>>();
  const pyramidPause = new PyramidPauseTracker();

  function stopPyramidInterval(roomCode: string): void {
    const interval = pyramidIntervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      pyramidIntervals.delete(roomCode);
    }
  }

  function broadcastRoom(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    io.to(roomCode).emit('roomUpdated', toBroadcastState(room));
  }

  function startPyramidTicker(roomCode: string): void {
    stopPyramidInterval(roomCode);
    const interval = setInterval(() => {
      const room = roomManager.getRoom(roomCode);
      if (!room.engine || room.engine.phase !== 'pyramid') {
        stopPyramidInterval(roomCode);
        return;
      }
      const { slot, pyramidFinished } = room.engine.flipNextPyramidCard();
      io.to(roomCode).emit('pyramidCardFlipped', {
        revealIndex: slot.revealIndex,
        rowValue: slot.rowValue,
        card: slot.card,
        pyramidFinished,
      });
      if (pyramidFinished) {
        stopPyramidInterval(roomCode);
        const { riderId } = room.engine.determineBusRider();
        room.engine.startBusRound();
        io.to(roomCode).emit('busRiderSelected', { riderId, deckRemaining: room.engine.busDeckRemaining });
        broadcastRoom(roomCode);
      }
    }, PYRAMID_FLIP_INTERVAL_MS);
    pyramidIntervals.set(roomCode, interval);
  }

  /** Csak akkor folytatja a piramis fordítását, ha senki sem dönt lerakásról, és senki sem tartozik ivással. */
  function tryResumePyramid(roomCode: string): void {
    if (pyramidPause.isPaused(roomCode)) return;
    try {
      const room = roomManager.getRoom(roomCode);
      if (room.engine && room.engine.phase === 'pyramid') {
        startPyramidTicker(roomCode);
      }
    } catch {
      // a szoba már törölve lett — nincs mit folytatni
    }
  }

  /** Az 1-4. kör tovább lépését jelzi a klienseknek: vagy a piramis indul, vagy a következő aktív játékost közli. */
  function broadcastRoundAdvance(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room.engine) return;
    if (room.engine.phase === 'pyramid') {
      broadcastRoom(roomCode);
      startPyramidTicker(roomCode);
    } else {
      io.to(roomCode).emit('activePlayerChanged', {
        playerId: room.engine.activePlayer.id,
        phase: room.engine.phase,
      });
    }
  }

  io.on('connection', (socket: AppSocket) => {
    socket.on('createRoom', ({ playerName }, ack) => {
      ack = safeAck(ack);
      try {
        const room = roomManager.createRoom({ id: socket.id, name: playerName });
        socket.join(room.code);
        ack({ ok: true, roomCode: room.code, playerId: socket.id });
        broadcastRoom(room.code);
      } catch (error) {
        ack(errorAck(error));
      }
    });

    socket.on('joinRoom', ({ roomCode, playerName }, ack) => {
      ack = safeAck(ack);
      try {
        const room = roomManager.joinRoom(roomCode, { id: socket.id, name: playerName });
        socket.join(room.code);
        ack({ ok: true, playerId: socket.id });
        broadcastRoom(room.code);
      } catch (error) {
        ack(errorAck(error));
      }
    });

    socket.on('setReady', ({ ready }, ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: false, error: 'A socket nincs egy szobához sem csatlakoztatva.' });
        return;
      }
      try {
        roomManager.setReady(roomCode, socket.id, ready);
        const engine = roomManager.tryStartGame(roomCode);
        ack({ ok: true });
        broadcastRoom(roomCode);
        if (engine) {
          io.to(roomCode).emit('activePlayerChanged', {
            playerId: engine.activePlayer.id,
            phase: engine.phase,
          });
        }
      } catch (error) {
        ack(errorAck(error));
      }
    });

    socket.on('submitGuess', ({ guess }, ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: false, error: 'A socket nincs egy szobához sem csatlakoztatva.' });
        return;
      }
      try {
        const room = roomManager.getRoom(roomCode);
        if (!room.engine) throw new GameEngineError('A játék még nem indult el.');
        const result = room.engine.submitGuess(socket.id, guess);
        ack({ ok: true });
        io.to(roomCode).emit('guessResolved', {
          playerId: result.playerId,
          card: result.card,
          correct: result.correct,
          penaltyUnits: result.penaltyUnits,
        });
        // Hibás tipp esetén a kör nem lép tovább, amíg a játékos nem nyugtázza a büntetést
        // (lásd 'acknowledgePenalty') — helyes tippnél viszont az engine már lépett, közöljük.
        if (result.correct) {
          broadcastRoundAdvance(roomCode);
        }
      } catch (error) {
        ack(errorAck(error));
      }
    });

    socket.on('acknowledgePenalty', (ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: false, error: 'A socket nincs egy szobához sem csatlakoztatva.' });
        return;
      }
      try {
        const room = roomManager.getRoom(roomCode);
        if (!room.engine) throw new GameEngineError('A játék még nem indult el.');
        room.engine.acknowledgeRoundPenalty(socket.id);
        ack({ ok: true });
        broadcastRoundAdvance(roomCode);
      } catch (error) {
        ack(errorAck(error));
      }
    });

    socket.on('beginPyramidMatch', (ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: false, error: 'A socket nincs egy szobához sem csatlakoztatva.' });
        return;
      }
      try {
        const room = roomManager.getRoom(roomCode);
        if (!room.engine || room.engine.phase !== 'pyramid') {
          throw new GameEngineError('A piramis csak piramis fázisban szüneteltethető.');
        }
        pyramidPause.markDeciding(roomCode, socket.id);
        stopPyramidInterval(roomCode);
        ack({ ok: true });
      } catch (error) {
        ack(errorAck(error));
      }
    });

    socket.on('cancelPyramidMatch', (ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: false, error: 'A socket nincs egy szobához sem csatlakoztatva.' });
        return;
      }
      pyramidPause.releaseDeciding(roomCode, socket.id);
      tryResumePyramid(roomCode);
      ack({ ok: true });
    });

    socket.on('playPyramidMatch', ({ suit, rank, distribution }, ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: false, error: 'A socket nincs egy szobához sem csatlakoztatva.' });
        return;
      }
      try {
        if (!isSuit(suit) || !isRank(rank)) {
          throw new GameEngineError('Érvénytelen lap (suit/rank) érkezett a kliensből.');
        }
        if (typeof distribution !== 'object' || distribution === null || Array.isArray(distribution)) {
          throw new GameEngineError('Érvénytelen kiosztás érkezett a kliensből.');
        }
        const room = roomManager.getRoom(roomCode);
        if (!room.engine) throw new GameEngineError('A játék még nem indult el.');
        const result = room.engine.playPyramidMatch(socket.id, { suit, rank }, distribution);
        // A piramis addig szünetel, amíg a most kijelölt címzettek nem nyugtázzák az ivást.
        pyramidPause.markDrinkersPending(roomCode, Object.keys(result.distribution));
        ack({ ok: true });
        io.to(roomCode).emit('pyramidMatchPlayed', {
          playerId: result.playerId,
          card: result.card,
          distribution: result.distribution,
        });
      } catch (error) {
        ack(errorAck(error));
      } finally {
        pyramidPause.releaseDeciding(roomCode, socket.id);
        tryResumePyramid(roomCode);
      }
    });

    socket.on('acknowledgePyramidDrink', (ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: false, error: 'A socket nincs egy szobához sem csatlakoztatva.' });
        return;
      }
      pyramidPause.releaseDrinker(roomCode, socket.id);
      tryResumePyramid(roomCode);
      ack({ ok: true });
    });

    socket.on('answerBus', ({ guess }, ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: false, error: 'A socket nincs egy szobához sem csatlakoztatva.' });
        return;
      }
      try {
        const room = roomManager.getRoom(roomCode);
        if (!room.engine) throw new GameEngineError('A játék még nem indult el.');
        const result = room.engine.answerBus(socket.id, guess);
        ack({ ok: true });
        io.to(roomCode).emit('busQuestionResolved', {
          riderId: socket.id,
          question: result.question,
          card: result.card,
          correct: result.correct,
          exitedBus: result.exitedBus,
          deckRemaining: room.engine.busDeckRemaining,
        });
        if (result.exitedBus) {
          io.to(roomCode).emit('gameFinished', { riderId: socket.id });
          broadcastRoom(roomCode);
        }
      } catch (error) {
        ack(errorAck(error));
      }
    });

    socket.on('requestNewRound', (ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: false, error: 'A socket nincs egy szobához sem csatlakoztatva.' });
        return;
      }
      try {
        roomManager.resetForNewRound(roomCode);
        ack({ ok: true });
        broadcastRoom(roomCode);
      } catch (error) {
        ack(errorAck(error));
      }
    });

    socket.on('leaveRoom', (ack) => {
      ack = safeAck(ack);
      const roomCode = currentRoomCode(socket);
      if (!roomCode) {
        ack({ ok: true });
        return;
      }
      try {
        roomManager.leaveRoom(roomCode, socket.id);
        socket.leave(roomCode);
        ack({ ok: true });
        broadcastRoom(roomCode);
      } catch (error) {
        ack(errorAck(error));
      }
    });

    socket.on('disconnect', () => {
      const roomCode = currentRoomCode(socket);
      if (!roomCode) return;
      try {
        const room = roomManager.setConnected(roomCode, socket.id, false);
        if (room.players.every((p) => !p.connected)) {
          // Senki sincs a szobában — nincs kinek folytatni a piramist, elkerüljük az örökké futó időzítőt.
          stopPyramidInterval(roomCode);
          pyramidPause.clearRoom(roomCode);
        } else {
          pyramidPause.releasePlayer(roomCode, socket.id);
          tryResumePyramid(roomCode);
        }
        broadcastRoom(roomCode);
      } catch {
        // a szoba vagy a játékos már törölve lett — nincs teendő
      }
    });
  });
}
